# SellerKhangBaby LIVE KPI — Production v2.0.0

Dashboard quản lý GMV, đối soát phiên LIVE và KPI nhân sự cho
`shopkhangbaby` và `mekhangsua`.

## Trạng thái production

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

Tạo repository riêng tư và đẩy nhánh `main`:

```powershell
git add .
git commit -m "Release production v2.0.0"
git branch -M main
& "C:\Program Files\GitHub CLI\gh.exe" repo create sellerkhangbaby --private --source . --remote origin --push
```

Không chuyển repository sang public nếu chưa rà soát dữ liệu kinh doanh.

### 2. Cloudflare

Đăng nhập:

```powershell
cf auth login
cf auth whoami
```

Tạo bundle rồi triển khai thư mục tĩnh:

```powershell
npm run build
cf pages deploy dist
```

Khi CLI hỏi tên project, dùng `sellerkhangbaby`. Sau khi có URL Cloudflare,
thêm đúng hostname (không có `https://` và không có dấu `/`) vào Firebase
Console → Authentication → Settings → Authorized domains.

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

Sau đó bật Google provider tại Firebase Console → Authentication → Sign-in
method → Google nếu chưa bật. Đăng nhập website bằng
`sellerhunghienhoa@gmail.com`; hồ sơ ADMIN và tài liệu
`production/dashboard` sẽ được khởi tạo khi đăng nhập lần đầu.

## Rollback

- Cloudflare: chọn deployment ổn định gần nhất trong Pages/Workers Deployments.
- Firebase Rules: mở Firestore → Rules → Rules history và khôi phục phiên bản cũ.
- GitHub: tạo commit hoàn tác; không dùng `git reset --hard` trên máy vận hành.

