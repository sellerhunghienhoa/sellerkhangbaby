# Đồng bộ đơn hàng, đơn ngoài LIVE và yêu cầu hoàn

## Vì sao có phiên LIVE mà đơn hàng vẫn trống?

API thống kê phiên LIVE chỉ cung cấp phiên và GMV tổng, không tự tạo danh sách đơn hàng. Firestore đã được kiểm tra: ba danh sách `orders`, `shopOrders`, `returns15d` hiện rỗng, chưa có `lastOrderSync`. Bản cập nhật này bổ sung API lấy đơn, chi tiết giao nhận và yêu cầu hoàn từ Seller, sau đó lưu vào Firestore theo ngày.

## Làm một lần để lấy dữ liệu

1. Đăng nhập website bằng Google Admin `sellerhunghienhoa@gmail.com`.
2. Mở **TikTok / API**. Shop Khang Baby dùng **Kết nối Seller**; TikTok Mẹ Khang Sữa dùng **Kết nối Creator** để lấy báo cáo Affiliate riêng.
3. Chọn **Từ ngày / Đến ngày**, tối đa 31 ngày mỗi lần. Đồng bộ phiên LIVE trước để có LIVE ID cho bước gán đơn vào phiên.
4. Bấm **Đồng bộ đơn & hoàn**. Chờ thông báo đã lưu số đơn và số yêu cầu hoàn. Không đóng trang khi đang lưu.
5. Mở **Đối soát cấp đơn**, **Đơn Shop tự ra** hoặc **Đơn hoàn 15 ngày**. Đặt bộ lọc ngày trùng khoảng vừa nhập; chọn tất cả kênh và nhân sự trước khi kiểm tra.
6. Với lịch sử dài, nhập từng tuần hoặc ngày. Các ngày khác vẫn được lưu; đồng bộ lại cùng ngày sẽ cập nhật, không cộng trùng. Trạng thái giao/hoàn thay đổi cần đồng bộ lại khoảng ngày liên quan.

Các trang đơn có cùng nút đồng bộ, sử dụng bộ lọc ngày ở đầu trang. Phần API có bộ chọn ngày riêng.

## Cần thêm gì ở TikTok Partner Center?

Ứng dụng Seller cần các quyền sau được TikTok phê duyệt và tài khoản shop cấp khi ủy quyền:

| Quyền | Công dụng |
|---|---|
| `seller.order.info` | Đọc danh sách và chi tiết đơn; ứng dụng có quyền `seller.fs.order&fufillment.management` cũng được backend chấp nhận theo tài liệu API. |
| `seller.return_refund.basic` | Đọc yêu cầu trả hàng / hoàn tiền. |
| `data.shop_analytics.public.read` | Đọc thống kê phiên LIVE, dùng bởi nút đồng bộ phiên. |

Vào ứng dụng Seller hiện có → phần quyền API → kiểm tra Order Information, Return and Refund, Shop Analytics. Sau khi quyền được duyệt, quay về website → **Ủy quyền lại Seller** bằng tài khoản Shop Khang Baby. Thêm quyền trong Partner Center chưa làm token cũ tự có quyền mới.

Nếu có nhiều shop trong một lần ủy quyền, backend dừng và báo chọn đúng shop thay vì tự lấy nhầm gian hàng. Không thay App Secret thành đường link. Access token và refresh token được nhận qua OAuth; không nhập vào trình duyệt, GitHub hoặc chat.

## Cloudflare và Firebase cần thêm gì?

Luồng đơn sử dụng các cấu hình Seller hiện có: `TIKTOK_APP_KEY`, Secret `TIKTOK_APP_SECRET`, `TIKTOK_TOKEN_ENCRYPTION_KEY`, binding `TIKTOK_OAUTH_KV` và cấu hình Firebase đang dùng. **Không cần một mã API hoặc refresh token nhập tay mới chỉ để đồng bộ đơn.** Nếu Seller chưa kết nối hoặc thiếu quyền, giao diện nêu rõ quyền cần bổ sung.

Firestore Standard `(default)` tại `asia-east2` đã xác minh có Free Tier. Rules production hiện cho phép đúng Admin đã xác minh email đọc/ghi các đường dẫn bên dưới; không cần mở quyền công khai hoặc tạo composite index:

- `production/dashboard`: phiên LIVE và thời điểm đồng bộ.
- `production/sellerOrderDays/days/YYYY-MM-DD`: danh sách khối dữ liệu của ngày.
- `production/sellerOrderSnapshots/chunks/YYYY-MM-DD-N`: đơn và yêu cầu hoàn, tối đa 100 bản ghi mỗi khối, kiểm tra kích thước trước khi ghi.

Toàn bộ đợt lưu dùng transaction; lỗi API, thiếu chi tiết hoặc lỗi Firestore không ghi một phần dữ liệu. Tải lại trang sẽ đọc các ngày trong bộ lọc. Đồng bộ lặp dùng lại mã khối để không phát sinh một bản sao toàn bộ mỗi lần. Không tự xóa dữ liệu nghiệp vụ; việc đọc/ghi vẫn tính vào hạn mức Firestore Free.

## Cách phân loại và đọc số tiền

- `room_id` trong **Get Order Detail** là bằng chứng gán nguồn. Chỉ gán phiên khi đúng một LIVE ID và đúng shop, khớp duy nhất một phiên đã lưu.
- Tất cả sản phẩm có `room_id` rỗng rõ ràng → đơn ngoài LIVE. API chưa phân biệt Showcase, Search, Video, Ads thì ghi **Ngoài LIVE · Chưa phân nguồn**.
- Thiếu trường `room_id`, giỏ trộn nhiều phiên hoặc LIVE và ngoài LIVE → để **Chưa xác minh phiên** trong bảng cấp đơn. Không đoán nguồn bằng giờ đặt.
- Giá trị hàng dùng `payment.sub_total` sau giảm giá; tổng khách trả gồm ship/thuế được lưu riêng. Đây **không phải số tiền quyết toán ví sau phí nền tảng**.
- Ngày đơn là ngày đặt, ngày hoàn là ngày tạo yêu cầu, theo giờ Việt Nam. Yêu cầu hoàn có thể thuộc đơn được đặt ngoài khoảng lọc; backend vẫn lấy chi tiết đơn gốc.
- **Đề nghị hoàn** khác **đã xác nhận hoàn**. Chỉ trạng thái `RETURN_OR_REFUND_REQUEST_COMPLETE` mới được ghi nhận là đã hoàn tiền. Chưa có thời điểm giao hàng thì không tự nhận định trong hạn 15 ngày, không tự gán trách nhiệm cho Host/kho/vận chuyển.
- Backend đọc thêm toàn bộ sổ yêu cầu hoàn theo các mã đơn vừa lấy, không giới hạn bằng ngày tạo yêu cầu. Số hoàn trên đơn vì vậy bao gồm cả yêu cầu phát sinh ngoài kỳ đặt đơn. Bảng Đơn hoàn lọc riêng theo ngày tạo yêu cầu.
- KPI chỉ tự cập nhật khi LIVE ID gán duy nhất, tổng giá trị hàng của toàn bộ đơn khớp GMV phiên, sổ hoàn đã đọc đủ, trạng thái rõ ràng và phiên chưa chốt thủ công / chưa có GMV Affiliate cộng riêng. Nếu không đủ các điều kiện này, giữ nguyên số chốt cũ và cho xem chi tiết để kiểm tra. Không khấu trừ cùng khoản hoàn lần thứ hai.

## Khi không thấy đủ dữ liệu

| Thông báo / tình huống | Cách xử lý |
|---|---|
| Thiếu `seller.order.info` hoặc `seller.return_refund.basic` | Bật / xin duyệt đúng quyền, rồi ủy quyền lại Seller. |
| Có phiên nhưng chưa thấy đơn | Đồng bộ đơn riêng; kiểm tra ngày đặt đơn, kênh, nhân sự và mã shop. |
| Chưa rõ nguồn | API không cung cấp LIVE ID đủ để kết luận. Dữ liệu vẫn nằm ở Đối soát cấp đơn, không bị mất. |
| Vượt 1.000 đơn hoặc 250 yêu cầu hoàn | Chọn khoảng ngắn hơn, nhập từng ngày hoặc tuần. Backend không lưu phần thiếu. |
| Chưa trả đủ chi tiết / lỗi mạng / giới hạn API | Thử lại khoảng ngắn hơn. Bản đã lưu được giữ nguyên. |
| Không có mốc nhận hàng | API chưa trả `delivery_time`; đồng bộ lại khi đơn đã giao. Không điền ngày giả để tính hạn. |
| Chưa đọc được Firebase | Kiểm tra mạng, phiên Google Admin và Rules production. Không đổi Rules thành cho phép tất cả. |

Hiện đây là đồng bộ khi bấm nút; lịch tự refresh token không đồng nghĩa tự tải đơn mỗi giờ. Khi cần cập nhật trạng thái, đồng bộ lại ngày đặt đơn cũ và ngày phát sinh yêu cầu hoàn. Releases là bản sao mã nguồn/build, **không phải bản sao dữ liệu Firestore**.

## Tài liệu API chính thức

- [Get Order List 202309](https://partner.tiktokshop.com/docv2/page/get-order-list-202309)
- [Get Order Detail 202507](https://partner.tiktokshop.com/docv2/page/get-order-detail-202507)
- [Search Returns 202602](https://partner.tiktokshop.com/docv2/page/search-returns-202602)
