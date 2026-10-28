# Đồng bộ phiên LIVE

Trong **TikTok / API**, chọn **Từ ngày**, **Đến ngày** rồi bấm **Đồng bộ phiên LIVE**.
Mặc định lấy 7 ngày gần nhất; mỗi lần tối đa 31 ngày. Nút đồng bộ ở trang
**Đối soát phiên LIVE** dùng cùng khoảng ngày và cùng luồng này.

## Cấu hình cần có

- Kết nối Seller của Shop Khang Baby hoàn tất, token được lưu mã hóa trong KV.
- Ứng dụng được TikTok cấp quyền **TikTok Shop Analytics**:
  `data.shop_analytics.public.read`. Sau khi bổ sung quyền, ủy quyền Seller lại.
- Seller hiện cấp quyền đúng một gian hàng. Nếu có nhiều shop, web dừng và báo
  cần xác định shop thay vì tự chọn nhầm.

Không cần nhập access token hoặc refresh token vào trình duyệt. Worker lấy
shop cipher qua Get Authorized Shops và ký yêu cầu phía server. Creator token
không được dùng thay Seller token cho API Shop Analytics này.

## Dữ liệu nhập

Worker lấy danh sách phiên qua `/analytics/202509/shop_lives/performance`,
phân trang, rồi chỉ nhận username `shopkhangbaby` và `mekhangsua`. Phạm vi số liệu
là các phiên bán hàng thuộc gian hàng Seller đã cấp quyền; đây không phải toàn
bộ doanh số của Creator trên tất cả gian hàng.

Mỗi phiên có ID ổn định từ shop ID và LIVE ID để đồng bộ lại không trùng.
Ngày và giờ hiển thị theo Việt Nam. Chỉ nhận số tiền VND; dữ liệu khác tiền tệ
được báo lỗi thay vì tự đổi tiền. Một lần lấy dữ liệu phải hoàn tất hết các
trang mới được lưu; tối đa 20 trang, quá giới hạn cần thu hẹp khoảng ngày.

Phiên mới lưu GMV thống kê ở `tiktokReportedGmv`, đưa toàn bộ số tiền vào chờ
đối soát, chưa phát sinh KPI đã chốt. Không cộng thêm Affiliate lần nữa vào
GMV phiên. Đồng bộ lại chỉ cập nhật thông tin từ TikTok; các trường phân công,
ca làm, KPI thủ công và số liệu đối soát hiện có được giữ nguyên. Số GMV thống
kê mới không tự ghi đè số tiền đang dùng để tính KPI của phiên cũ.

Frontend đợi giao dịch Firestore hoàn tất mới báo đã lưu. Chỉ cập nhật
`sessions` và `lastLiveSync` trong document `production/dashboard`; không đổi
Firestore rules. Chưa thêm lịch tự đồng bộ nền; nút hoạt động theo yêu cầu Admin.

## Kiểm thử

- `npm run check`, `npm test`, `npm run build`, `npx cf deploy --dry-run`.
- `tests/live-sync.test.mjs`: chữ ký HMAC, token và ID, tiền tệ, phân trang,
  chống trùng, bảo toàn dữ liệu đối soát, giới hạn ngày và xác thực.
- `tests/live-sync-browser.cjs`: bấm nút, khóa thao tác lặp, lưu thành công/lỗi,
  thiếu Seller, ngày không hợp lệ và bố cục 1440/390/320px.
- Bài thử trình duyệt dùng Firebase và TikTok mô phỏng; không ghi dữ liệu thật.

Tài liệu tham khảo:

- [Get Shop LIVE Performance List](https://partner.tiktokshop.com/docv2/page/get-shop-live-performance-list-202509)
- [Mẫu ký API chính thức của TikTok](https://github.com/tiktok/ttspc-server-sample/blob/main/src/utils/sign.ts)
