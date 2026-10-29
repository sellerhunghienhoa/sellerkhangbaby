# Đồng bộ LIVE, đơn hàng, đơn ngoài LIVE và hoàn tiền

> Thiết lập tài khoản và quyền lần đầu: [hướng dẫn API đầy đủ](API_SETUP.md).

## Một nút cho phiên LIVE và đơn hàng

1. Đăng nhập Google Admin `sellerhunghienhoa@gmail.com`.
2. Mở **TikTok / API**, chọn **Từ ngày / Đến ngày**, tối đa 31 ngày mỗi lần.
3. Bấm **Đồng bộ LIVE + đơn**. Quy trình lấy LIVE trước, tiếp theo lấy đơn Seller, yêu cầu hoàn và sổ hoàn theo mã đơn; sau đó lấy Affiliate từ hai tài khoản Creator đã kết nối.
4. Chờ từng bước hoàn tất. Giao diện báo riêng bước thành công và bước lỗi; có token không đồng nghĩa mọi quyền đọc đã được cấp.
5. Mở **Đối soát cấp đơn**, **Đơn Shop tự ra**, **Đơn hoàn 15 ngày** hoặc **Tổng quan**, chọn cùng khoảng ngày để kiểm tra.

Đơn Seller gồm cả đơn LIVE và đơn ngoài LIVE. Nếu không có phiên LIVE, các đơn ngoài LIVE vẫn tồn tại và cần đọc từ Seller. Lỗi bước lấy LIVE không được dùng làm lý do bỏ qua đơn tự nhiên. Các trang đơn vẫn có nút **Đồng bộ đơn & hoàn** để cập nhật trạng thái độc lập.

## Đã sửa giới hạn phân trang cũ

Bản cũ dừng ở 1.000 đơn hoặc 250 yêu cầu hoàn. Luồng mới lấy từng trang TikTok qua nhiều yêu cầu ngắn, hiển thị tiến độ và tiếp tục bằng cursor đến trang cuối; không cắt dữ liệu theo hai mốc trên.

- Danh sách đơn: tối đa 100 đơn/trang; lấy chi tiết theo nhóm tối đa 50 mã.
- Yêu cầu hoàn: tối đa 50 yêu cầu/trang; có thể lấy đơn gốc ngoài kỳ đặt đơn.
- Sổ hoàn tiền: tra nhóm tối đa 50 mã đơn đến trang cuối, không giới hạn bằng ngày tạo yêu cầu hoàn.
- Cursor là mã phân trang, không phải access token hay refresh token.
- Một số phản hồi còn `next_page_token` dù đã đủ `total_count`; luồng dừng khi đã đủ đúng số bản ghi mà API công bố. Với Affiliate, tổng là dòng SKU, không phải số đơn đã nhóm.
- Cursor lặp, phản hồi thiếu chi tiết hoặc bản ghi thay đổi giữa các trang sẽ dừng và báo lỗi thay vì báo đã lấy đủ.

Lịch sử dài hơn 31 ngày cần nhập từng khoảng. Ngày ngoài khoảng đang nhập được giữ lại. Khi giao/hoàn của đơn cũ thay đổi, đồng bộ lại ngày đặt đơn cũ và ngày tạo yêu cầu hoàn liên quan.

## Dữ liệu được lưu thế nào?

Firestore Standard `(default)` tại `asia-east2` dùng Free Tier. Rules production đã cho Admin email xác minh đọc/ghi `production/**`; không cần mở quyền công khai hay composite index cho luồng đọc theo ngày.

| Đường dẫn | Nội dung |
|---|---|
| `production/dashboard` | Phiên, tổng hợp Affiliate theo kênh/ngày và thời điểm đồng bộ. |
| `production/sellerOrderDays/days/YYYY-MM-DD` | Danh sách khối đang công bố cho ngày. |
| `production/sellerOrderSnapshots/chunks/...` | Đơn và hoàn, tối đa 100 bản ghi/khối, kiểm tra kích thước trước khi ghi. |

Ghi các khối bất biến bằng batch nhỏ trước, rồi transaction chuyển chỉ mục ngày và dashboard cùng lúc. Người xem không thấy nửa đợt nhập. Nếu phiên bị chỉnh sửa trong khi chuẩn bị, việc công bố dừng để không ghi đè phân công/số chốt mới; hoàn tất chỉnh sửa rồi chạy lại.

Mỗi ngày giữ khối hiện tại và một thế hệ trước để không làm hỏng lượt đọc đang diễn ra. Chỉ dọn thế hệ cũ hơn do chính tính năng tạo; không xóa bản ghi thủ công hay khối không xác định được nguồn. Lỗi dọn không xóa dữ liệu còn được chỉ mục tham chiếu. Đọc/ghi vẫn tính vào hạn mức Firestore.

## Phân loại nguồn đơn và đối soát

- `room_id` trong Get Order Detail 202507 là bằng chứng LIVE. Chỉ gán khi đúng một LIVE ID, đúng shop và khớp duy nhất một phiên.
- Tất cả sản phẩm có `room_id` rỗng rõ ràng → ngoài LIVE. Chưa phân biệt Showcase, Search, Video, Ads thì ghi **Ngoài LIVE · Chưa phân nguồn**.
- Thiếu `room_id`, giỏ trộn nhiều phiên hoặc trộn LIVE/ngoài LIVE → giữ trong bảng cấp đơn với nhãn **Chưa xác minh phiên**; không đoán theo giờ đặt.
- Với phản hồi Việt Nam đang thiếu nguồn, trang đơn tự nhiên có nhóm **Chờ xác minh nguồn** để vẫn xem đủ đơn. Changelog TikTok nêu tính năng `room_id` theo thị trường US; không giả định trường thiếu ở VN là giá trị rỗng. Xem [kết quả API thật và giới hạn nguồn](API_SETUP.md#giới-hạn-xác-định-đơn-ngoài-live-tại-việt-nam).
- Giá trị hàng dùng `payment.sub_total` sau giảm giá. Tổng khách trả gồm ship/thuế được lưu riêng. Đây không phải quyết toán ví sau phí nền tảng.
- Ngày đơn là ngày đặt, ngày hoàn là ngày tạo yêu cầu; theo giờ Việt Nam.
- **Đề nghị hoàn** và **đã xác nhận hoàn** là hai số riêng. Chỉ trạng thái hoàn tiền hoàn tất được cộng vào số đã hoàn. Thiếu thời điểm giao thì không tự xác định trong hạn 15 ngày.
- KPI chỉ cập nhật khi gán đúng phiên, đọc đủ đơn/sổ hoàn, tổng tiền khớp GMV phiên và không ghi đè phiên chốt thủ công hoặc GMV Affiliate cộng riêng. Thiếu bằng chứng thì giữ số chốt. Một khoản hoàn không bị trừ hai lần.

## Xử lý lỗi

| Tình huống | Cách xử lý |
|---|---|
| Thiếu quyền đơn/hoàn | Xin duyệt `seller.order.info`, `seller.return_refund.basic` rồi **Ủy quyền lại Seller**. |
| Có LIVE nhưng bảng đơn trống | Chạy LIVE + đơn, kiểm tra ngày đặt, shop, kênh và bộ lọc nhân sự. |
| Đơn tự nhiên chưa thấy | Kiểm tra ở bảng cấp đơn: `room_id` rỗng hay thiếu? Thiếu nguồn không bị ép thành đơn tự nhiên. |
| Dữ liệu đổi khi phân trang / thiếu chi tiết | Chạy lại, không kết luận đã lấy đủ. |
| Phiên được sửa trong lúc nhập | Hoàn tất sửa rồi đồng bộ lại. |
| Thiếu ngày nhận hàng | Chờ API trả `delivery_time`, không điền ngày giả. |
| Chưa đọc Firebase | Kiểm tra mạng, phiên Admin và Rules, không mở Rules cho tất cả. |

Đây là đồng bộ khi bấm nút. Lịch 6 giờ chỉ làm mới token, không tự tải mọi đơn mỗi giờ. Releases là bản sao mã nguồn/build, không phải bản sao Firestore.

## Tài liệu chính thức

- [Get Order List 202309](https://partner.tiktokshop.com/docv2/page/get-order-list-202309)
- [Get Order Detail 202507](https://partner.tiktokshop.com/docv2/page/get-order-detail-202507)
- [Search Returns 202602](https://partner.tiktokshop.com/docv2/page/search-returns-202602)
