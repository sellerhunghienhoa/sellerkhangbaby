# Sửa luồng ủy quyền TikTok — 28/10/2026

## Chẩn đoán từ production lúc 19:52:59

Log ghi `tiktok_seller_authorization_failed` với mã
`TOKEN_ENCRYPTION_KEY_INVALID`. App Key, App Secret, Service ID và KV đều có;
KV chưa có bản ghi token. Khóa Secret tồn tại nhưng không phải Base64 của đúng
32 byte. Worker đã đổi mã cấp quyền, sau đó không thể mã hóa để lưu token.
Phải sửa Secret này trên Cloudflare và bắt đầu một lần ủy quyền mới vì mã cũ
chỉ dùng một lần. Kết nối Cloudflare plugin hiện không có quyền ghi Secrets;
giá trị Secret chưa được tự thay trong đợt kiểm tra này.

Log lúc 19:41:47 → 19:41:54 còn cho thấy Creator Authorization quay về đường
dẫn Seller. Worker hiện nhận cả hai luồng tại một callback dùng chung:

```text
https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev/oauth/tiktok/callback
```

Hai đường dẫn callback cũ vẫn được hỗ trợ; Worker xác định loại kết nối bằng
state rồi kiểm tra cookie trước khi đổi mã. Trạng thái backend giờ kiểm tra
định dạng khóa và chặn bắt đầu ủy quyền khi khóa không hợp lệ. Bài thử bổ sung
bao phủ khóa sai định dạng và Creator trả về đường dẫn Seller (9/9 đạt).

## Nguyên nhân và thay đổi

Luồng cũ dùng `window.location.assign()` để rời tab dashboard. Callback chuyển
về trang chính và khởi tạo lại Firebase. Khi TikTok mở callback trong trình
duyệt hoặc WebView khác, nơi đó không có phiên Google của tab ban đầu. Firebase
chỉ giữ phiên theo origin và bộ lưu trữ của từng trình duyệt.

Luồng mới mở cửa sổ ủy quyền riêng ngay khi người dùng bấm nút. Tab chính giữ
nguyên Firebase và dữ liệu đang mở. Callback trả trang kết quả độc lập, không
khởi tạo Firebase. Kết quả gửi về qua `postMessage` hoặc `BroadcastChannel`,
đối chiếu state của lần ủy quyền trước khi làm mới trạng thái bằng API có xác thực.
Kênh thông báo không chứa access token, refresh token hoặc phiên Google.

Một số trang trung gian có thể ngắt `window.opener` bằng COOP. Kênh nhận kết
quả được giữ tối đa 10 phút kể cả khi popup báo đã đóng. Callback thiếu cookie
được từ chối và hướng dẫn kết nối lại cùng trình duyệt; không bỏ qua xác minh state.

## Kiểm tra đã thực hiện

- Node: Seller và Creator từ authorize đến callback, lưu token mã hóa và đọc
  trạng thái bằng phiên Google mô phỏng; callback thiếu cookie; API thiếu đăng
  nhập; Origin sai; token khác loại tài khoản; dữ liệu trả về không lộ token.
- Playwright: tab chính giữ nguyên, bỏ qua thông báo từ sai cửa sổ, callback
  gửi kết quả về khi mất opener, đóng popup, popup bị chặn, API trả 503.
- Kiểm tra cú pháp, build và Wrangler deploy dry-run.

Chạy lại:

```powershell
npm run check
npm test
npm run build
npx wrangler dev --port 8787 --local
# Terminal thứ hai:
playwright-cli -s=oauth-test open http://127.0.0.1:8787
playwright-cli -s=oauth-test run-code --filename=tests/oauth-browser.cjs
```

Các bài thử dùng tài khoản, token và trang cấp quyền mô phỏng. Chưa xác nhận
TikTok cấp scopes thực tế hoặc hoàn tất ủy quyền bằng tài khoản thật của chủ
website. App Key/Secret và Service ID có mặt chưa đủ chứng minh quyền ứng dụng
được TikTok phê duyệt. Không có dữ liệu Firebase hoặc token production bị xóa
trong quá trình sửa và thử nghiệm.

## Cách sử dụng

1. Đăng nhập Gmail trên website, mở **TikTok / API**.
2. Chọn **Kết nối Seller** ở Shop Khang Baby hoặc **Kết nối Creator** ở Mẹ Khang Sữa.
3. Cho phép popup nếu trình duyệt chặn. Giữ tab dashboard mở.
4. Hoàn tất cấp quyền trong cửa sổ mới. Nếu màn hình yêu cầu quay lại tab ban
   đầu, quay về tab website và bấm **Kiểm tra kết nối**.
5. Nếu callback báo khác trình duyệt/hết phiên, bắt đầu lại cùng trình duyệt.

Kỹ năng/công cụ: Ponytail, Firebase Authentication, Workers best practices,
SellerKhangBaby design (tái sử dụng mẫu giao diện có sẵn), Playwright CLI,
Node test, Wrangler và Cloudflare CLI. Không chạy Strix trong đợt sửa chức năng này.
