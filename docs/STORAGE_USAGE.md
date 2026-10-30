# Dung lượng GitHub · Firebase · Cloudflare

Trang **Lưu trữ & dung lượng** hiển thị số liệu đọc được thật từ ba nền tảng. Các hạn mức không có bộ đo và thao tác dọn giả lập được loại bỏ. Chế độ tự giải phóng chỉ xóa GitHub Actions artifacts/cache kỹ thuật đã quá thời hạn bảo vệ; không xóa dữ liệu nghiệp vụ, Firebase, website đang chạy hoặc token TikTok.

| Nền tảng | Số liệu hiển thị | Cách đọc |
|---|---|---|
| GitHub | Kích thước repository; tổng tệp đính kèm của 5 Releases gần nhất; Actions artifacts/cache khi có token | GitHub REST API |
| Firebase | Số đo Cloud Monitoring; nếu nguồn này lỗi thì dùng kích thước JSON của toàn bộ tài liệu ứng dụng mà Admin hiện tại đọc được | Cloud Monitoring hoặc Firestore REST API với Firebase ID token |
| Cloudflare | Dung lượng namespace KV OAuth; kích thước bundle website đang chạy | Binding `TIKTOK_OAUTH_KV` và manifest được tạo khi build |

Ba nền tảng không dùng chung một quỹ dung lượng. GitHub không có một hạn mức chung phù hợp để tính phần trăm repo + Releases. Bundle website và Firestore ước tính không được gắn phần trăm giả.

## Không cần thêm khóa cho chế độ chuẩn

- **GitHub:** repository công khai không cần token để xem kích thước cơ bản. Muốn đo và tự dọn Actions artifacts/cache, Secret `GITHUB_USAGE_TOKEN` phải có quyền đọc/xóa Actions của riêng repository này.
- **Cloudflare:** Worker đọc binding KV có sẵn và manifest của chính bản deploy. Không cần `CLOUDFLARE_USAGE_API_TOKEN`.
- **Firebase:** Admin đăng nhập Google/Firebase hiện tại được dùng để gọi Firestore REST. Security Rules vẫn được áp dụng. Không gửi ID token cho GitHub hoặc Cloudflare.

## Giới hạn của số liệu Firebase

Phương án dự phòng Firestore REST đọc đủ `dashboard`, `staffDashboard`, `users`, các ngày đơn Seller và các chunk snapshot, có phân trang. Đây vẫn chỉ là ước tính từ JSON tài liệu; cách mã hóa JSON khác cách Firestore tính storage và không bao gồm toàn bộ index. Giao diện ghi rõ **ước tính**, không trình bày nó như số liệu billing chính xác.

Nếu cần số chính xác gồm dữ liệu và chỉ mục, có thể tạo Service Account chỉ có vai trò **Monitoring Viewer** rồi lưu toàn bộ JSON vào Secret `GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON`. Đây là tùy chọn, không bắt buộc để trang hoạt động. Không cấp Owner/Editor và không đưa khóa vào GitHub hoặc mã trình duyệt.

## Cập nhật và bảo mật

- Mở trang dung lượng sẽ kiểm tra một lần; nút **Kiểm tra lại** bỏ qua cache và cập nhật thủ công.
- Worker giữ kết quả tự động tối đa 5 phút để tránh gọi API liên tục.
- Chỉ Admin đã xác thực mới gọi được `/api/storage/usage`.
- Phản hồi không chứa access token, refresh token, Service Account hoặc lỗi nguyên gốc từ nhà cung cấp.
- Cấu hình thời hạn bảo vệ (tối thiểu 60 ngày), ngưỡng và công tắc tự dọn được lưu trong KV.
- Cron 6 giờ chỉ tự dọn GitHub Actions khi tổng artifacts/cache vượt ngưỡng. Firebase và Cloudflare hiện chỉ đo, không tự xóa.
- Nút **Giải phóng mục hợp lệ** gửi đúng danh sách đã chọn; API từ chối yêu cầu thiếu danh sách, sai nguồn hoặc chưa đủ quyền.
- Mỗi lần xóa thành công được ghi vào lịch sử KV. Đơn, đối soát, tài khoản và token TikTok không thuộc danh sách dọn.

## Tài liệu chính thức

- [GitHub repository REST API](https://docs.github.com/en/rest/repos/repos#get-a-repository) và [Releases API](https://docs.github.com/en/rest/releases/releases)
- [Firestore REST API và xác thực Firebase ID token](https://firebase.google.com/docs/firestore/use-rest-api)
- [Firestore Usage](https://firebase.google.com/docs/firestore/monitor-usage) và [hạn mức miễn phí](https://firebase.google.com/docs/firestore/quotas)
- [Cloudflare KV binding](https://developers.cloudflare.com/kv/api/read-key-value-pairs/) và [KV limits](https://developers.cloudflare.com/kv/platform/limits/)
