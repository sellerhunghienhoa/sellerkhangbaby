# Thiết lập TikTok API: Seller và hai Creator

## Ba kết nối riêng

| Thẻ | Dữ liệu | Tài khoản khi ủy quyền |
|---|---|---|
| Seller Shop Khang Baby | Gian hàng, đơn, giao nhận, hoàn tiền và thống kê LIVE của shop. | Seller Center Shop Khang Baby. |
| Creator TikTok shopkhangbaby | GMV Affiliate và hoa hồng của kênh TikTok shopkhangbaby. | TikTok Creator `@shopkhangbaby`. |
| Creator TikTok mekhangsua | GMV Affiliate và hoa hồng của kênh TikTok mekhangsua. | TikTok Creator `@mekhangsua`. |

Seller và kênh TikTok có thể thuộc cùng người nhưng API cấp hai loại token khác nhau. Token Seller không thay token Creator. Bản cũ chỉ có Seller Shop Khang Baby và Creator Mẹ Khang Sữa, nên chưa thể lấy Affiliate của kênh TikTok shopkhangbaby.

## Làm một lần

1. Đăng nhập [website](https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev) bằng Google Admin `sellerhunghienhoa@gmail.com`, mở **TikTok / API**.
2. Giữ Seller và Creator Mẹ Khang Sữa hiện có nếu đúng tài khoản. Bấm **Kết nối Creator shopkhangbaby**, chọn TikTok `@shopkhangbaby`, hoàn tất ủy quyền.
3. Kiểm tra đủ ba thẻ. Nếu vừa được cấp quyền mới, ủy quyền lại đúng thẻ; token cũ không tự có thêm quyền.
4. Chọn ngày, bấm **Đồng bộ LIVE + đơn**. Affiliate đọc riêng từng Creator; một kênh thành công không làm kênh kia được đánh dấu thành công.
5. Trong Tổng quan, chọn tất cả kênh để xem tổng Affiliate hoặc chọn riêng từng kênh. Không tự cộng Affiliate vào Seller/KPI vì có thể cùng một đơn xuất hiện ở hai báo cáo.

Nếu bị chặn popup, cho phép cửa sổ bật lên cho website rồi mở lại. Hoàn tất trong cùng trình duyệt để giữ trạng thái và phiên Google. Không thay App Secret bằng đường link.

## TikTok Partner Center cần điền gì?

Mở ứng dụng đang dùng trong [TikTok Shop Partner Center](https://partner.tiktokshop.com/) và kiểm tra:

| Vai trò | Quyền cần |
|---|---|
| Seller đọc đơn | `seller.order.info` (hoặc fulfillment tương đương ứng dụng đã được cấp). |
| Seller đọc hoàn | `seller.return_refund.basic`. |
| Seller đọc LIVE | `data.shop_analytics.public.read`. |
| Mỗi Creator đọc Affiliate | `creator.affiliate_collaboration.read`. |
| Mỗi Creator xác minh đúng kênh | `creator.affiliate.info`; API Profile cũng chấp nhận `creator.video.write` nếu đã có. |

Chỉ xin đúng quyền cần, gửi duyệt nếu được yêu cầu. Sau khi được cấp, quay về website **ủy quyền lại**. Không cần xin quyền ghi video chỉ để đọc Affiliate nếu đã có `creator.affiliate.info`.

Callback production phải khớp chính xác:

```text
https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev/oauth/tiktok/callback
```

Giữ App Key, App Secret, Service ID thuộc đúng ứng dụng. Cùng một Creator app có thể nhận ủy quyền từ cả hai Creator; không cần tạo hai app chỉ vì có hai kênh.

## Cloudflare cần điền gì?

Mở **Worker sellerkhangbaby-live-kpi → Settings → Variables and Secrets**:

| Tên | Kiểu | Công dụng |
|---|---|---|
| `TIKTOK_APP_KEY` | Text | App Key từ Partner Center. |
| `TIKTOK_APP_SECRET` | Secret | App Secret của cùng ứng dụng. |
| `TIKTOK_SERVICE_ID` | Text | Service ID cho Seller Authorization. |
| `TIKTOK_TOKEN_ENCRYPTION_KEY` | Secret | Base64 của 32 byte ngẫu nhiên; mã hóa token đã lưu. Không tự đổi khóa còn đang hoạt động. |
| `TIKTOK_SELLER_AUTH_URL` | Text | `https://services.tiktokshop.com/open/authorize`. |
| `TIKTOK_OAUTH_KV` | KV binding | Namespace token mã hóa, giữ binding hiện có. |

Nếu Seller và Creator dùng **cùng bộ App Key/Secret đã có đủ quyền**, không cần thêm mã API chỉ vì thêm Creator shopkhangbaby. Nếu Creator dùng app riêng, thêm `TIKTOK_CREATOR_APP_KEY` (Text) và `TIKTOK_CREATOR_APP_SECRET` (Secret). Đây là khóa của Creator app, không phải token tài khoản.

`TIKTOK_SELLER_APP_KEY` / `TIKTOK_SELLER_APP_SECRET` chỉ cần khi dùng Seller app riêng; chúng ghi đè bộ dùng chung cho Seller. Không xóa khóa hoạt động chỉ vì tên khác tài liệu cũ.

Access/refresh token của cả ba kết nối nhận qua OAuth và lưu riêng, mã hóa tại Worker. **Không cần nhập refresh token thủ công.** Không gửi App Secret, khóa mã hóa hoặc token vào chat, issue hay GitHub.

Hai Secret thống kê `CLOUDFLARE_USAGE_API_TOKEN` và `GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON` không phải điều kiện lấy đơn TikTok. Xem [dung lượng](STORAGE_USAGE.md) nếu thiếu số đo.

## Khi còn lỗi

### Kết quả gọi TikTok thật ngày 29/10/2026

Đợt kiểm tra trực tiếp tại Worker, với bộ khóa/token đã có và khoảng 23–29/10/2026, đã nhận:

| API / tài khoản | Phản hồi đã kiểm tra |
|---|---|
| Seller: phiên LIVE | 15 phiên. |
| Seller: trang đơn đầu tiên | 100 đơn; TikTok báo tổng 1.369 đơn cho khoảng chọn. |
| Nguồn của 100 đơn trên | 45 đơn có bằng chứng LIVE; 55 đơn chưa đủ dữ liệu nguồn. Không tự coi 55 đơn này là ngoài LIVE. |
| Creator mekhangsua: trang Affiliate đầu tiên | 100 dòng SKU; TikTok báo tổng 1.550 dòng SKU. |
| Creator shopkhangbaby | Chưa có kết nối Creator riêng; cần bấm kết nối đúng thẻ và ủy quyền bằng `@shopkhangbaby`. |

Đây là kiểm tra đọc API thật, **không phải tuyên bố đã nhập đủ 1.369 đơn / 1.550 SKU vào Firestore**. Chẩn đoán chỉ ghi số lượng và mã lỗi, không lưu dữ liệu thử vào nghiệp vụ, không ghi token hoặc thông tin khách vào log.

TikTok có thể trả `next_page_token` không rỗng dù số bản ghi đã đủ `total_count`. Luồng đã sửa để không chạy tiếp vô hạn hoặc báo vượt giới hạn trong trường hợp này. Đơn vị đếm phải đúng: API Affiliate đếm dòng SKU, không phải số đối tượng đơn sau khi nhóm.

### Giới hạn xác định đơn ngoài LIVE tại Việt Nam

Changelog Orders của TikTok ghi tính năng `room_id` dưới mục **For US Markets: Introducing room_id in Order APIs** ([nguồn chính thức](https://partner.tiktokshop.com/docv2/page/nvx9wggt)). Tài liệu chi tiết mô tả chuỗi rỗng cho sản phẩm ngoài LIVE, nhưng trường bị thiếu trong phản hồi Việt Nam không đủ để kết luận đơn tự nhiên.

Ứng dụng giữ các đơn thiếu nguồn trong nhóm **Chờ xác minh nguồn** và cho xem từ trang đơn tự nhiên / bảng cấp đơn, thay vì để mất bản ghi hoặc cộng nhầm doanh thu tự nhiên. Phần tổng đã xác nhận ngoài LIVE không bao gồm nhóm chưa xác minh. Thêm Cloudflare Secret hoặc nhập thêm refresh token không làm TikTok tự bổ sung trường nguồn còn thiếu; không cần tạo mã API mới để xử lý vấn đề này.

| Lỗi | Kiểm tra |
|---|---|
| Creator chưa kết nối | Kết nối đúng kênh; Seller xanh không thay Creator. |
| Sai tài khoản Creator | Ủy quyền lại đúng username theo thẻ. |
| Thiếu quyền Affiliate/Profile | Cấp đúng quyền rồi ủy quyền lại Creator đó. |
| Thiếu quyền đơn/hoàn | Cấp quyền Seller rồi ủy quyền lại Seller. |
| Giá Affiliate sai định dạng | Bộ đọc hỗ trợ VND có ký hiệu và phân cách hàng nghìn. Phản hồi lạ báo rõ lỗi giá/hoa hồng, không đoán số hoặc biến thành 0. |
| Hoa hồng chưa được cung cấp | GMV vẫn có thể đã biết, nhưng hoa hồng thực nhận chưa biết không được hiển thị như 0. |
| Dữ liệu thay đổi khi phân trang | Chạy lại, không bỏ trang cuối hoặc cộng bản ghi trùng. |
| Lỗi mạng / giới hạn TikTok | Thử lại khi hết giới hạn; từng bước thành công/lỗi được báo riêng. |

Khi gửi lỗi, chỉ gửi mã lỗi, thời điểm, khoảng ngày và tên thẻ. Không chụp/copy Headers chứa Authorization, Cookie hoặc token. “Đã kết nối” xác nhận có token, không xác nhận mọi endpoint đã trả đủ dữ liệu.
