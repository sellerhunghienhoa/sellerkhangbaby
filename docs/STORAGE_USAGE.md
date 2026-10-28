# Dung lượng GitHub · Firebase · Cloudflare

Trang **Lưu trữ & dung lượng** hiển thị riêng từng nền tảng. Số liệu thiếu quyền sẽ ghi **Chưa có số liệu**, không giả thành 0%.

## Đang đo những gì?

| Nền tảng | Số liệu của dự án | Phạm vi |
|---|---|---|
| GitHub | Dung lượng kho mã nguồn; tổng kích thước tệp đính kèm 5 Releases gần nhất | Không phải tổng dung lượng tài khoản, Actions, Packages hay Git LFS. Kho công khai đọc được không cần token. |
| Firebase | Firestore `(default)`: dữ liệu và chỉ mục | Hạn mức Spark tham chiếu 1 GiB; không gồm Firebase Cloud Storage, lượt đọc/ghi hay Auth. |
| Cloudflare | Số byte trong KV OAuth `sellerkhangbaby-tiktok-oauth` | So với 1 GB KV Free dùng chung tài khoản; không gồm namespace khác, Workers requests, logs hoặc static assets. |

Các gói không có chung một quỹ dung lượng. GitHub không có một hạn mức dung lượng chung để tính % cho kho mã nguồn và Releases; ứng dụng hiển thị số byte riêng.

## Để hiện số liệu Firebase và Cloudflare

Mở [Cloudflare Worker Settings](https://dash.cloudflare.com/1bda853cb67674a5c4e8d5a6c2152b5c/workers/services/view/sellerkhangbaby-live-kpi/production/settings), chọn **Variables and Secrets → Add variable → Secret**. Tạo đúng tên sau. Không nhập token hoặc khóa vào chat, GitHub, JavaScript trình duyệt hay biến dạng Text.

### 1. Cloudflare: `CLOUDFLARE_USAGE_API_TOKEN`

1. Mở [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token → Create Custom Token**.
2. Tên gợi ý: `sellerkhangbaby-usage-read`.
3. Quyền: **Account → Account Analytics → Read**. Tài nguyên chỉ chọn tài khoản `Sellerhunghienhoa@gmail.com` (`1bda853cb67674a5c4e8d5a6c2152b5c`). Không cấp quyền ghi hoặc xóa.
4. Sao chép token vào Secret **`CLOUDFLARE_USAGE_API_TOKEN`** ở Worker trên rồi lưu/triển khai thay đổi.
5. Quay về website → **Lưu trữ & dung lượng → Kiểm tra dung lượng**.

Ứng dụng gọi GraphQL Analytics, không đọc nội dung access/refresh token trong KV. Nếu báo chưa có số đo, kiểm tra Metrics của namespace; Analytics có độ trễ và có thể chưa có dữ liệu trong 3 ngày gần nhất.

### 2. Firebase: `GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON`

1. Trong [Google Cloud của sellerkhangbaby](https://console.cloud.google.com/iam-admin/serviceaccounts?project=sellerkhangbaby), tạo Service Account `sellerkhangbaby-usage-reader`.
2. Chỉ cấp vai trò **Monitoring Viewer** (`roles/monitoring.viewer`) trên dự án này. Không cần Owner, Editor hoặc Firebase Admin.
3. Kiểm tra [Cloud Monitoring API](https://console.cloud.google.com/apis/library/monitoring.googleapis.com?project=sellerkhangbaby) đã được bật. Không nâng cấp sang gói trả phí chỉ để xử lý trang thống kê.
4. Trong Service Account → **Keys → Add key → Create new key → JSON**. Nếu chính sách tổ chức cấm tạo khóa, không tắt chính sách để vượt qua; trang vẫn sử dụng liên kết tới console.
5. Mở tệp vừa tải bằng trình soạn thảo trên máy. Dán **toàn bộ đối tượng JSON**, giữ nguyên `private_key`, vào Secret **`GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON`** của Worker rồi lưu/triển khai.
6. Bấm **Kiểm tra dung lượng** trên website. Khóa chỉ dùng tại Worker để lấy OAuth token đọc Monitoring. Không dùng Firebase API Key hoặc Firebase ID token thay cho Service Account.

Nếu báo `PERMISSION_DENIED`, kiểm tra dự án trong JSON là `sellerkhangbaby`, vai trò và API đã bật. Nếu `NO_METRICS`, mở Firestore Usage và chờ thống kê xuất hiện. Khi không cần tích hợp nữa, thu hồi khóa tại Google Cloud và xóa Secret tại Worker.

### 3. GitHub (tùy chọn): `GITHUB_USAGE_TOKEN`

Kho hiện công khai nên không bắt buộc. Chỉ cần khi API công khai bị giới hạn hoặc kho chuyển riêng tư:

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Chỉ chọn kho `sellerhunghienhoa/sellerkhangbaby`; quyền **Metadata: Read** và **Contents: Read** để đọc Releases. Chọn hạn sử dụng.
3. Lưu token vào Secret **`GITHUB_USAGE_TOKEN`** tại Cloudflare. Không cấp quyền ghi hoặc workflow.

## Cập nhật và giới hạn

- Mở trang dung lượng sẽ tự kiểm tra lần đầu; nút **Kiểm tra dung lượng** gọi API thật, có giới hạn chờ.
- Worker giữ số đo trong bộ nhớ tối đa 5 phút để giảm số lần gọi API. Đổi Secret sẽ làm cache cũ không còn được dùng. Console của nhà cung cấp có thể cập nhật muộn hơn.
- Chỉ Admin đã xác thực Google mới đọc được endpoint `/api/storage/usage`. Token, private key và phản hồi lỗi nguyên gốc không được gửi về trình duyệt.
- Tích hợp chỉ đọc. Các nút xóa/tự dọn cloud chưa được kích hoạt; không báo đã dọn khi chưa xóa thật. Quy trình GitHub Releases vẫn tự giữ 5 bản gần nhất.

## Tự tải lại khi quay về trang

Rời tab/ứng dụng từ **15 phút** trở lên rồi quay lại: website hiển thị đang tải và tải lại dữ liệu. Chuyển tab ngắn không tải lại. Khi mất mạng, đang mở hộp thoại, sửa phân công phiên LIVE, đang ủy quyền, đồng bộ hoặc lưu dữ liệu, trang chờ thao tác xong/kết nối lại; lỗi lưu sẽ giữ trang hiện tại.

## Tài liệu chính thức

- [GitHub repository REST API](https://docs.github.com/en/rest/repos/repos#get-a-repository) và [Releases API](https://docs.github.com/en/rest/releases/releases).
- [Firestore hạn mức miễn phí](https://firebase.google.com/docs/firestore/quotas), [Monitoring Firestore](https://firebase.google.com/docs/firestore/monitor-usage), [các chỉ số storage](https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h#firestore) và [Service Account OAuth](https://developers.google.com/identity/protocols/oauth2/service-account).
- [Cloudflare KV Analytics](https://developers.cloudflare.com/kv/observability/metrics-analytics/) và [KV Free limits](https://developers.cloudflare.com/kv/platform/pricing/).
