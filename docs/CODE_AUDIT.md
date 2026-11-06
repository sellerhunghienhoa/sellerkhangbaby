# Kiểm tra mã nguồn — 06/11/2026

## Phạm vi

Rà soát frontend, Firebase adapter, luồng đồng bộ TikTok, Worker, dung lượng,
webhook, Telegram, service worker và mã sinh ứng dụng iOS. Các thay đổi có sẵn
trong thư mục được giữ lại. Kiểm thử trình duyệt dùng dữ liệu giả lập tại local;
không ghi dữ liệu Firebase/TikTok production.

Kết quả cuối: **166/166 kiểm thử tự động đạt**, kiểm tra cú pháp/build/Cloudflare
deploy dry-run đạt. Playwright kiểm tra đăng nhập (320/390/1440px), điều hướng
mobile (320/390/430/768px và ngang 844px), đơn hàng/hoàn/dung lượng
(320/390/1440px) đạt; không phát sinh lỗi JavaScript trong các bài kiểm tra này.
Các endpoint công khai HTML/Markdown/OpenAPI và phản hồi 401 cho API riêng tư
đã được kiểm tra trên bản local.

## Các lỗi đã sửa

- Đăng xuất chờ thao tác lưu hoàn tất; lỗi lưu giữ phiên để có thể thử lại.
- Operator trong dữ liệu ca cũ không còn nhận nhầm hoa hồng Host.
- Pipeline không báo thành công hoặc tăng mốc đồng bộ khi bước LIVE thất bại.
- Affiliate rỗng cập nhật trạng thái hoàn tất thay vì kẹt thông báo đang tải.
- TikTok Creator lỗi không còn biến thành một kết quả GMV bằng 0 thành công.
- Đồng bộ nền giữ snapshot cũ khi lỗi mạng, lỗi phân trang hoặc dữ liệu chưa đủ;
  không tự chốt GMV từ tỷ lệ trạng thái đơn. Affiliate được tổng hợp đúng ngày.
- Lượt tải đơn cũ trả về muộn không còn xóa kết quả đồng bộ mới hoặc đưa dữ liệu
  riêng trở lại sau khi đăng xuất.
- Dung lượng, lịch sử và dung lượng giải phóng lấy từ API, bỏ số mẫu và mô phỏng.
- Token Telegram không còn nằm trong HTML/JavaScript/config được theo dõi;
  API cấu hình chỉ trả giá trị che. Lỗi ghi KV không báo lưu thành công.
- Cấu hình Telegram được tải khi mở tab API, tránh gọi lại trong mọi lần render.
- Webhook quản trị yêu cầu Admin; dữ liệu gửi vào được xác minh trước khi ghi KV.
- Tên hồ sơ được escape trong bộ chọn và bản xem trước phiếu KPI.
- JSON xuất dữ liệu ghi rõ chỉ chứa dữ liệu đã tải, không phải toàn bộ Firestore.
- Modal hoàn trả không tràn ngang ở màn hình 320px; mã tham chiếu thu gọn sẵn.
- Giữ chống zoom ngoài ý muốn bằng thao tác chạm và cỡ chữ, cho phép người dùng
  chủ động phóng to khi cần.
- Service worker dùng đúng đường dẫn logo; build báo lỗi nếu thiếu file bắt buộc.
- Mã Swift được sinh giữ đúng interpolation và không hủy observer chưa đăng ký.
- Cấu hình `cf` và Wrangler cùng giữ lịch Telegram 23:00 giờ Việt Nam.
- OpenAPI mô tả đúng body `creator`/`liveIds` của API Creator LIVE core stats.

## Cần cấu hình trước khi phát hành

### Thay token Telegram đã lộ

1. Thu hồi/cấp lại token qua BotFather cho bot hiện tại. Không sử dụng lại token cũ.
2. Trong Cloudflare → Worker `sellerkhangbaby-live-kpi` → Settings → Variables
   and Secrets, lưu `TELEGRAM_BOT_TOKEN` bằng loại **Secret**. Giữ đúng Chat ID.
3. Nếu đã lưu cấu hình bot trong KV, mở tab API bằng Admin, nhập token mới và lưu
   lại để thay giá trị KV đang được ưu tiên. Ô token trống khi bật/tắt công tắc
   có nghĩa là giữ nguyên token đã lưu, không xóa token.
4. Dùng nút gửi thử để xác nhận bot và nơi nhận sau khi cấu hình.

Xóa token khỏi mã hiện tại không thu hồi các bản đã có trong lịch sử Git,
Releases hoặc cache trình duyệt. Phải thu hồi token cũ trước.

### Webhook

| Nguồn | Cấu hình xác minh |
|---|---|
| TikTok Shop | Seller App Key/Secret; xác minh HMAC trên body gốc |
| GitHub | `GITHUB_WEBHOOK_SECRET` loại Secret; cùng giá trị ở webhook của repository |
| Cloudflare | `CLOUDFLARE_WEBHOOK_SECRET` loại Secret; cùng giá trị ở Alerts → Destinations |
| Firebase tùy chỉnh | Firebase ID token của Admin trong `Authorization: Bearer …` |

Thiếu cấu hình xác minh sẽ bị từ chối bằng `WEBHOOK_VERIFICATION_NOT_CONFIGURED`.
Chữ ký sai bị từ chối bằng `WEBHOOK_SIGNATURE_INVALID`. Các webhook xác thực
trạng thái đơn không thay thế bước đối soát đầy đủ.

Tham chiếu giao thức: [GitHub webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries),
[Cloudflare webhook secret](https://developers.cloudflare.com/notifications/get-started/configure-webhooks/),
[TikTok Shop webhook](https://partner.tiktokshop.com/docv2/page/1meo67bh).

## Giới hạn cần xác minh riêng

- Quyền Admin phụ trong giao diện chưa đồng nhất với backend/Firestore vốn dùng
  tài khoản Admin khởi tạo. Cần quyết định chính sách trước khi mở rộng quyền;
  lần sửa này không tự cấp quyền dữ liệu cho tài khoản mới.
- Logic đối soát đang có thay đổi nghiệp vụ cho phép sai số 15% và nới khớp số
  cho kênh `mekhangsua`/Affiliate. Cần đối chiếu số TikTok thật trước khi dùng
  làm căn cứ chốt lương; lần kiểm tra này không tự thay chính sách đó.
- Chưa biên dịch bằng Xcode hoặc thử OAuth Google/TikTok trên iPhone thật.
- Webhook đến sai thứ tự chưa có cơ chế so sánh timestamp sự kiện; cron chỉ cập
  nhật snapshot KV, còn chốt số cần pipeline đối soát đầy đủ.
- Chưa triển khai hoặc thay secrets trên production trong lần kiểm tra này.
