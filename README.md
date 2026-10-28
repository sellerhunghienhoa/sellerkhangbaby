# SellerKhangBaby LIVE KPI — Production v2.0.0

Dashboard quản lý GMV, đối soát phiên LIVE và KPI nhân sự cho
`shopkhangbaby` và `mekhangsua`.

## Trạng thái production

- Website: `https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev`
- GitHub: `https://github.com/sellerhunghienhoa/sellerkhangbaby` (hiện là public).
- Firebase project: `sellerkhangbaby`, Firestore `(default)` tại `asia-east2`.
- Đăng nhập thật bằng Google qua Firebase Authentication.
- Dữ liệu nghiệp vụ được lưu trong Cloud Firestore, không dùng `localStorage`.
- Dữ liệu seed, tài khoản giả và token TikTok giả đã bị loại khỏi bản build.
- Tài khoản quản trị khởi tạo: `sellerhunghienhoa@gmail.com`.
- Tài khoản Google khác tự động vào trạng thái `PENDING`.
- TikTok Shop API chưa hoạt động cho đến khi cấu hình credentials dưới dạng
  Cloudflare Worker Secrets. Không ghi token vào mã nguồn hoặc Firestore.

## Cấu trúc

```text
assets/                 favicon
css/                    giao diện responsive
js/config.js            cấu hình Firebase công khai và quy tắc nghiệp vụ
js/firebase.js          Firebase Auth + Firestore production adapter
js/state.js             state rỗng và công thức nghiệp vụ
js/auth.js              đăng nhập Google, đăng xuất và RBAC
js/modals.js            modal và thao tác
js/render.js            render dashboard
js/app.js               bootstrap ứng dụng
firestore.rules         Security Rules mặc định từ chối
firebase.json           cấu hình triển khai Firebase
scripts/build.mjs       tạo bundle tĩnh trong dist/
```

## Kiểm tra trước khi phát hành

```powershell
npm run check
npm run build
npx -y firebase-tools@latest deploy --only firestore:rules --project sellerkhangbaby --dry-run
```

Chạy local:

```powershell
npm run serve
```

Mở `http://localhost:4173`.

## Quy trình triển khai: GitHub → Cloudflare → Firebase

### 1. GitHub

Đăng nhập:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth login --web --git-protocol https
```

Nếu chưa có repository, tạo repository riêng tư và đẩy nhánh `main`:

```powershell
git add .
git commit -m "Release production v2.0.0"
git branch -M main
& "C:\Program Files\GitHub CLI\gh.exe" repo create sellerkhangbaby --private --source . --remote origin --push
```

Không chuyển repository sang public nếu chưa rà soát dữ liệu kinh doanh.
Repository đang dùng hiện là public; chuyển sang private trong GitHub Settings
nếu không muốn công khai mã nguồn.

### 2. Cloudflare

Đăng nhập:

```powershell
cf auth login
cf auth whoami
```

Kiểm tra và triển khai Worker chứa static assets:

```powershell
npm run build
cf deploy --dry-run
cf deploy --message "Production v2.0.0" --tag v2.0.0
```

Tên Worker nằm trong `cloudflare.config.ts`; thư mục build `dist` nằm trong
`wrangler.config.ts`. URL production hiện tại là
`https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev`.
Preview URL đã được tắt bằng `previewUrls: false`; tài khoản Cloudflare không
có preview deployment nào cần giữ lại.

Hostname `sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev` đã được thêm
vào Firebase Authentication → Settings → Authorized domains. Nếu đổi domain,
phải thêm hostname mới (không có `https://` và không có dấu `/`) trước khi thử
đăng nhập Google.

TikTok Shop credentials phải được cấu hình sau bằng Worker Secrets, ví dụ
`TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET` và refresh token cho từng shop. Không
dùng `.env` trong Git và không dán secret vào issue/commit.

### 3. Firebase

Xác nhận đúng tài khoản và project:

```powershell
npx -y firebase-tools@latest login:list
npx -y firebase-tools@latest use
```

Kết quả phải là `sellerhunghienhoa@gmail.com` và `sellerkhangbaby`.

Triển khai Security Rules:

```powershell
npx -y firebase-tools@latest deploy --only firestore:rules --project sellerkhangbaby
```

Google provider đã được bật với email hỗ trợ
`sellerhunghienhoa@gmail.com`. Đăng nhập website bằng
`sellerhunghienhoa@gmail.com`; hồ sơ ADMIN và tài liệu
`production/dashboard` sẽ được khởi tạo khi đăng nhập lần đầu.

## Rollback

- Cloudflare: chọn deployment ổn định gần nhất trong Workers → Deployments.
- Firebase Rules: mở Firestore → Rules → Rules history và khôi phục phiên bản cũ.
- GitHub: tạo commit hoàn tác; không dùng `git reset --hard` trên máy vận hành.

