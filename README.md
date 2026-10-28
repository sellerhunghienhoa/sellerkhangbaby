<div align="center">
  <img src="assets/favicon.svg" width="88" height="88" alt="SellerKhangBaby logo">

  # SellerKhangBaby LIVE KPI

  **Trung tâm quản lý GMV, đối soát phiên LIVE và KPI nhân sự cho TikTok Shop**

  [![Production](https://img.shields.io/badge/Production-Online-16a34a?style=for-the-badge&logo=cloudflare&logoColor=white)](https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev)
  [![Version](https://img.shields.io/badge/version-2.0.0-7c3aed?style=for-the-badge)](https://github.com/sellerhunghienhoa/sellerkhangbaby/releases)
  [![Backup Release](https://img.shields.io/github/actions/workflow/status/sellerhunghienhoa/sellerkhangbaby/release-backup.yml?branch=main&label=backup&style=for-the-badge&logo=github)](https://github.com/sellerhunghienhoa/sellerkhangbaby/actions/workflows/release-backup.yml)

  [Mở website](https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev) ·
  [Xem Releases](https://github.com/sellerhunghienhoa/sellerkhangbaby/releases) ·
  [Báo lỗi](https://github.com/sellerhunghienhoa/sellerkhangbaby/issues)
</div>

---

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng chính](#tính-năng-chính)
- [Cách sử dụng](#cách-sử-dụng)
- [Quy tắc tính GMV và KPI](#quy-tắc-tính-gmv-và-kpi)
- [Tài khoản và phân quyền](#tài-khoản-và-phân-quyền)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Cài đặt trên máy](#cài-đặt-trên-máy)
- [Triển khai production](#triển-khai-production)
- [Releases và khôi phục](#releases-và-khôi-phục)
- [Bảo mật](#bảo-mật)
- [Giới hạn hiện tại](#giới-hạn-hiện-tại)
- [Xử lý sự cố](#xử-lý-sự-cố)

## Giới thiệu

SellerKhangBaby LIVE KPI là dashboard nội bộ dành cho hai kênh
`shopkhangbaby` và `mekhangsua`. Hệ thống gom các công việc thường bị tách rời
trong file Excel hoặc tin nhắn thành một quy trình thống nhất:

1. Theo dõi GMV và trạng thái đối soát.
2. Phân công Host/Operator cho phiên LIVE.
3. Tính KPI và hoa hồng theo GMV thực nhận.
4. Theo dõi hoàn, hủy và đơn trả trong 15 ngày.
5. Xuất báo cáo phục vụ chốt lương và kiểm tra nội bộ.

### Trạng thái production

| Thành phần | Trạng thái | Thông tin |
|---|---:|---|
| Website | ✅ Online | Cloudflare Workers Static Assets |
| Đăng nhập | ✅ Hoạt động | Google qua Firebase Authentication |
| Cơ sở dữ liệu | ✅ Hoạt động | Cloud Firestore `(default)`, `asia-east2` |
| Security Rules | ✅ Đã triển khai | Mặc định từ chối, bootstrap Admin theo email xác minh |
| Preview URL | ✅ Đã tắt | Chỉ giữ URL production |
| TikTok Shop API | ⚠️ Chưa kết nối | Chưa có backend và credentials production |

> Website hiện bắt đầu bằng dữ liệu nghiệp vụ rỗng. Dữ liệu mẫu, tài khoản giả
> và token TikTok giả không được đưa vào production.

## Tính năng chính

### Tổng quan GMV và KPI

- Theo dõi tiến độ GMV theo khoảng thời gian.
- Tổng hợp nguồn GMV LIVE, Affiliate và doanh số ngoài LIVE.
- Hiển thị GMV đang chờ đối soát, hoàn/hủy và GMV đã chốt.
- Tổng hợp KPI theo từng nhân sự.

### Đối soát phiên LIVE

- Quản lý từng phiên theo kênh, thời gian và trạng thái.
- Phân công Host và Operator.
- Chống cộng trùng GMV khi hai kênh LIVE chồng giờ.
- Chốt số sau khi đơn chuyển sang trạng thái đã giao.
- Hỗ trợ phiên thường, Campaign và Mega LIVE.

### Đơn hàng và hoàn trả

- Tách đơn LIVE và đơn shop tự phát sinh ngoài LIVE.
- Theo dõi đơn Showcase, Video ngắn, Search/Mall và Shopping Ads.
- Theo dõi hoàn/hủy ở cấp đơn.
- Theo dõi chính sách trả hàng 15 ngày và điều chỉnh GMV thực nhận.

### KPI nhân sự

- Tổng hợp phiên tham gia, GMV đối soát và hoa hồng.
- Công thức mặc định: Host `0,3%`, Operator `0,1%`.
- Hỗ trợ KPI thủ công cho Campaign/Mega LIVE.
- Xuất bảng lương KPI, phiên LIVE, đơn hàng và báo cáo liên quan.

### Quản trị

- Google Sign-In và hồ sơ người dùng Firebase.
- Tài khoản mới vào trạng thái `PENDING`.
- Khu vực TikTok/API, lưu trữ và tài khoản chỉ dành cho Admin.
- Dữ liệu nghiệp vụ lưu trong Firestore, không lưu bằng `localStorage`.

## Cách sử dụng

### 1. Đăng nhập

1. Mở [website production](https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev).
2. Chọn **Continue with Google**.
3. Đăng nhập bằng tài khoản Google đã được cấp quyền.

Tài khoản `sellerhunghienhoa@gmail.com` là tài khoản quản trị khởi tạo. Tài
khoản Google khác được tạo ở trạng thái chờ duyệt và chưa được đọc dữ liệu
production cho đến khi Security Rules được mở rộng phù hợp.

### 2. Kiểm tra tổng quan

1. Chọn khoảng thời gian cần xem.
2. Kiểm tra tổng GMV, phần chờ nhận hàng và hoàn/hủy.
3. So sánh GMV đã đối soát với target.
4. Mở bảng KPI nhân sự để kiểm tra phân bổ.

### 3. Xử lý một phiên LIVE

1. Vào **Đối soát phiên LIVE**.
2. Kiểm tra kênh, khung giờ và số GMV được ghi nhận.
3. Phân công Host/Operator đúng người tham gia.
4. Kiểm tra đơn hoàn/hủy và phần GMV chồng giờ.
5. Chỉ chốt KPI khi số liệu đã được xác nhận.

### 4. Campaign hoặc Mega LIVE

1. Đánh dấu phiên là KPI thủ công.
2. Mở **KPI thủ công**.
3. Nhập người nhận, doanh số được duyệt và quỹ thưởng.
4. Kiểm tra tổng trước khi chốt.

### 5. Xuất báo cáo

Mở mục **Xuất file**, chọn loại báo cáo và khoảng dữ liệu. Các nhóm báo cáo
hiện gồm KPI, nhân sự, kỷ luật, phiên LIVE, đơn hàng, đơn ngoài LIVE, hoàn trả
15 ngày và KPI thủ công.

## Quy tắc tính GMV và KPI

```text
GMV dùng tính KPI
= GMV LIVE
+ GMV Affiliate
- GMV đang chờ đối soát
- GMV hoàn/hủy
- phần GMV bị trùng khi hai kênh chồng giờ
```

```text
KPI Host     = GMV đã đối soát × 0,3%
KPI Operator = GMV đã đối soát × 0,1%
```

- Doanh số ngoài LIVE được theo dõi riêng và mặc định không tính KPI LIVE.
- Phiên Campaign/Mega LIVE dùng KPI thủ công, không cộng tiếp KPI tự động.
- Operator để trống nghĩa là Host tự vận hành; Host vẫn giữ đúng mức `0,3%`.
- Số liệu sau hoàn 15 ngày phải được cập nhật trước khi chốt lương cuối cùng.

## Tài khoản và phân quyền

| Vai trò | Quyền giao diện | Quyền dữ liệu hiện tại |
|---|---|---|
| Admin bootstrap | Toàn bộ khu vực | Đọc/ghi production |
| Host | 5 mục nghiệp vụ chính | Chưa mở trong Firestore Rules production |
| Operator | 5 mục nghiệp vụ chính | Chưa mở trong Firestore Rules production |
| Pending | Màn hình chờ duyệt | Chỉ đọc hồ sơ của chính mình |

Security Rules production hiện cố ý khóa dữ liệu cho Admin bootstrap. Trước
khi cho nhân sự sử dụng thật, cần thiết kế claims/role phía server và mở Rules
theo nguyên tắc quyền tối thiểu; không chỉ dựa vào việc ẩn nút trên giao diện.

## Kiến trúc hệ thống

```text
Người dùng
   │
   ▼
Cloudflare Workers ─────► Static HTML / CSS / JavaScript
   │
   ├────────────────────► Firebase Authentication (Google)
   │
   └────────────────────► Cloud Firestore
                            ├── users/{uid}
                            └── production/dashboard
```

| Thư mục/tệp | Công dụng |
|---|---|
| `index.html` | Khung giao diện và các màn hình chính |
| `css/` | Giao diện responsive desktop/mobile |
| `js/config.js` | Firebase Web config và cấu hình nghiệp vụ công khai |
| `js/firebase.js` | Firebase Auth và Firestore production adapter |
| `js/state.js` | State rỗng và công thức nghiệp vụ |
| `js/auth.js` | Đăng nhập, đăng xuất và RBAC giao diện |
| `js/modals.js` | Modal và quy trình thao tác |
| `js/render.js` | Render dashboard |
| `js/app.js` | Bootstrap ứng dụng |
| `firestore.rules` | Quyền truy cập Firestore |
| `cloudflare.config.ts` | Cấu hình Worker production |
| `wrangler.config.ts` | Cấu hình thư mục static assets |
| `.github/workflows/release-backup.yml` | Tạo và giữ 5 backup release gần nhất |

## Cài đặt trên máy

### Yêu cầu

- Node.js 22 hoặc mới hơn.
- npm.
- Git.
- Firebase CLI khi triển khai Rules.
- Cloudflare `cf` CLI khi triển khai website.

### Cài dependencies và kiểm tra

```powershell
git clone https://github.com/sellerhunghienhoa/sellerkhangbaby.git
cd sellerkhangbaby
npm ci
npm run check
npm run build
```

### Chạy local

```powershell
npm run serve
```

Mở `http://localhost:4173`. Domain `localhost` đã có trong Firebase Authorized
Domains, nhưng dữ liệu vẫn chịu sự kiểm soát của Firestore Rules.

## Triển khai production

Quy trình phát hành chuẩn là **GitHub → Cloudflare → Firebase**.

### 1. GitHub

```powershell
git pull --rebase origin main
npm ci
npm run check
npm run build
git add .
git commit -m "Mô tả thay đổi"
git push origin main
```

Push lên `main` sẽ tự tạo một backup trong
[GitHub Releases](https://github.com/sellerhunghienhoa/sellerkhangbaby/releases).

### 2. Cloudflare

```powershell
cf auth whoami
cf deploy --dry-run
cf deploy --message "Mô tả bản phát hành" --tag v2.0.0
```

- Worker: `sellerkhangbaby-live-kpi`.
- Build output: `dist/`.
- Preview URL bị tắt bằng `previewUrls: false`.

### 3. Firebase

```powershell
npx -y firebase-tools@latest login:list
npx -y firebase-tools@latest use
npx -y firebase-tools@latest deploy --only firestore:rules --project sellerkhangbaby
```

Trước khi deploy Rules, nên chạy:

```powershell
npx -y firebase-tools@latest deploy --only firestore:rules --project sellerkhangbaby --dry-run
```

## Releases và khôi phục

Workflow `Backup Release` chạy sau mỗi lần push lên `main`:

1. Cài dependencies bằng `npm ci`.
2. Chạy kiểm tra cú pháp.
3. Build production vào `dist/`.
4. Tạo tag dạng `backup-YYYYMMDD-HHMMSS-abcdef0`.
5. Tạo GitHub Release kèm gói production `.zip`.
6. Xóa backup tự động cũ hơn, chỉ giữ **5 bản gần nhất**.

Các release/tag tạo thủ công không bị workflow tự động xóa.

### Khôi phục một phiên bản

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" release list --repo sellerhunghienhoa/sellerkhangbaby
git fetch --tags
git switch -c restore/backup-ten-tag backup-ten-tag
npm ci
npm run check
npm run build
cf deploy --dry-run
cf deploy --message "Restore backup-ten-tag"
```

Chỉ deploy lại Firebase Rules nếu phiên bản khôi phục có thay đổi
`firestore.rules`.

> **Quan trọng:** GitHub Release là backup mã nguồn và gói website, không phải
> backup dữ liệu Firestore. Không đưa Firestore export, thông tin khách hàng,
> token hoặc secrets vào repository/release public. Backup Firestore cần một
> bucket riêng có quyền truy cập hạn chế và chính sách lưu giữ độc lập.

## Bảo mật

- Không commit `.env`, access token, refresh token hoặc TikTok app secret.
- Firebase Web API key là định danh phía client; quyền dữ liệu nằm ở Security Rules.
- Firestore mặc định từ chối mọi đường dẫn không được khai báo.
- Admin bootstrap yêu cầu email đã xác minh đúng
  `sellerhunghienhoa@gmail.com`.
- Tài khoản mới chỉ được tạo hồ sơ `PENDING` của chính mình.
- Repository hiện là **public**; luôn kiểm tra diff trước khi push.
- TikTok credentials sau này phải lưu bằng Cloudflare Secrets và chỉ dùng ở backend.

## Giới hạn hiện tại

- TikTok Shop API thật chưa được kết nối; chưa có backend đồng bộ 24/24.
- Firestore production đang khóa cho Admin bootstrap, chưa mở luồng nhân sự đầy đủ.
- Dữ liệu nghiệp vụ đang nằm trong một tài liệu `production/dashboard`; khi dữ
  liệu lớn cần tách collection để tránh giới hạn kích thước tài liệu Firestore.
- GitHub Releases không sao lưu dữ liệu Firestore.
- Firebase project hiện chưa bật billing, vì vậy chưa cấu hình lịch export dữ liệu tự động.

## Xử lý sự cố

### `auth/unauthorized-domain`

Thêm hostname mới tại Firebase Console → Authentication → Settings →
Authorized domains. Không nhập `https://` hoặc dấu `/` cuối.

### Đăng nhập được nhưng không đọc được dữ liệu

Kiểm tra email đăng nhập, trạng thái hồ sơ và Firestore Rules. Hiện chỉ Admin
bootstrap có quyền đọc/ghi `production/**`.

### Cloudflare vẫn hiển thị bản cũ

```powershell
npm run build
cf deploy --dry-run
cf deploy --message "Redeploy production"
```

Sau đó tải lại trang bằng `Ctrl + Shift + R`.

### Workflow không tạo Release

1. Mở tab **Actions** và chọn `Backup Release`.
2. Kiểm tra repository cho phép GitHub Actions ghi `contents`.
3. Chạy lại workflow bằng **Run workflow** nếu lần chạy trước bị hủy.

---

<div align="center">
  <strong>SellerKhangBaby LIVE KPI · Production v2.0.0</strong><br>
  Quản lý GMV rõ ràng · Đối soát có kiểm soát · KPI minh bạch
</div>
