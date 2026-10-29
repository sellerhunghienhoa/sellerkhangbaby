# GMV Affiliate từ TikTok Creator

## Vì sao trước đây Affiliate luôn bằng 0?

Luồng nhập phiên chỉ gọi Shop Analytics bằng Seller token và tạo `affiliateGmv: 0`. Kết nối Creator đã cấp quyền nhưng chưa được dùng để đọc đơn Affiliate. Dòng “Sau đối soát” trên Tổng quan còn dùng phép nhân cố định 91%; phép tính này đã được bỏ.

## Cách đồng bộ

1. Mở **Tổng quan**, chọn khoảng ngày tối đa 31 ngày rồi bấm **Đồng bộ Affiliate** trong ô GMV Affiliate; nút này lấy đúng khoảng ngày đang xem.
2. Hoặc mở **TikTok / API**, chọn **Từ ngày / Đến ngày** và bấm **Đồng bộ Affiliate** trong khung của TikTok Mẹ Khang Sữa.
3. **Đồng bộ phiên LIVE** cũng chạy thêm bước Affiliate sau khi lưu phiên thành công nếu trạng thái kết nối Creator đã là “Đã kết nối”. Hai lần lưu báo kết quả riêng, lỗi Affiliate không hủy các phiên Seller đã lưu.
4. Quay về Tổng quan, chọn cùng khoảng ngày. Ô Affiliate ghi số ngày đã có dữ liệu để phân biệt dữ liệu một phần với cả khoảng ngày.

Không cần thêm Secret mới. Worker sử dụng Creator token mã hóa sẵn trong KV và thông tin ứng dụng hiện tại; làm mới token nếu gần hết hạn.

## Quyền và tài khoản

- Đơn Affiliate: `creator.affiliate_collaboration.read` (**Read Creator Affiliate Collaborations**).
- Xác minh đúng tài khoản qua Get Creator Profile: `creator.affiliate.info` (**Affiliate Information**).
- Nếu thiếu quyền: vào **TikTok Shop Partner Center → ứng dụng → Manage API**, thêm các quyền trên, hoàn tất quy trình duyệt nếu TikTok yêu cầu; sau đó **Ủy quyền lại Creator** bằng tài khoản `@mekhangsua` trên website. Đổi Secret Cloudflare không thay thế cho cấp quyền TikTok.
- Worker kiểm tra username đúng `mekhangsua`; Seller token của Shop Khang Baby không được dùng thay Creator token.

## Số liệu hiển thị

- **GMV Affiliate** ở ô Tổng quan: doanh số sản phẩm từ đơn Creator, tính bằng **giá SKU × số lượng**, theo **ngày tạo đơn tại Việt Nam**. Đây là tổng các shop được tài khoản Creator quảng bá, gồm LIVE, video và các nguồn khác mà API trả về.
- Tổng doanh số nhận các trạng thái `TO_SETTLE`, `SETTLED`, `REFUNDED`: gồm cả đơn hoàn/hủy đã phát sinh. Không gồm `AWAITING_PAYMENT`, `FROZEN`, `UNSPECIFIED`; không gồm phí vận chuyển và thuế. Chỉ nhận tiền VND dạng số rõ ràng, không đoán cách đọc chuỗi tiền bản địa hóa.
- **Hoa hồng đã chốt** lấy trực tiếp `actual_commission` của SKU thuộc đơn `SETTLED`, không lấy tỷ lệ cố định nhân GMV và không nhầm hoa hồng thành GMV.
- Các con số này có thể khác Analytics theo thời điểm đặt hàng, mô hình quy gán và thành phần tiền. Không tự suy ra GMV đã đối soát từ doanh số này.
- Số liệu Creator chưa được phân bổ cho nhân sự: khi lọc một nhân sự hoặc kênh `shopkhangbaby`, ô dùng dữ liệu Affiliate đã gán phiên hiện có và giải thích phạm vi. Chọn **Tất cả kênh / mekhangsua** và **Tất cả nhân sự** để xem tổng Creator.

## Chống trùng và bảo toàn KPI

TikTok phân trang theo SKU, một đơn có thể xuất hiện trên nhiều trang. Worker gộp bằng cặp order ID + SKU ID, không cộng hai lần một SKU và không dừng theo số order ít hơn page size. Nếu một SKU thay đổi số liệu trong lúc phân trang, báo lỗi để đồng bộ lại.

Mỗi ngày được lưu một bản tổng hợp trong `affiliateDaily` của `production/dashboard`. Đồng bộ lại **thay số đo của ngày được lấy**, không cộng dồn; một ngày API trả rỗng thành công sẽ cập nhật về 0. Ngày ngoài khoảng chọn được giữ nguyên. Chỉ lưu tổng hợp, không lưu thông tin khách hàng hoặc danh sách order/SKU ID.

Giao dịch Firestore chỉ cập nhật `affiliateDaily` và `lastAffiliateSync`. Không ghi đè `sessions`, phân công, số tiền đối soát hay KPI đã chốt. Không cộng thẳng Affiliate Creator vào doanh số Seller vì API Creator có thể bao gồm chính những đơn đã nằm trong GMV shop. Để đưa vào KPI từng phiên cần đối chiếu đơn và phân bổ trước; công thức KPI hiện có cho Affiliate đã gán phiên vẫn giữ nguyên.

## Giới hạn và thông báo

- Tối đa 31 ngày/lần và 20 trang × 100 SKU/trang. Nếu quá giới hạn, chọn khoảng ngắn hơn; không lưu một phần rồi báo thành công.
- Lỗi API, lỗi tiền tệ, thiếu quyền hoặc lỗi lưu giữ nguyên số liệu đã lưu trước đó. Chỉ báo đã lưu sau khi giao dịch Firestore hoàn tất.
- Có giới hạn dung lượng document trước khi ghi để tránh làm hỏng document dữ liệu chung. Nếu báo `TIKTOK_AFFILIATE_STORAGE_LIMIT`, cần tách lưu trữ tổng hợp trước khi nhập thêm; không xóa dữ liệu để vượt giới hạn.
- Tự tải lại sau 15 phút được hoãn khi đang đồng bộ Affiliate.

## Kiểm tra

`npm run check`, `npm test`, `npm run build`, `npx cf deploy --dry-run`.
Các bài thử bao phủ chữ ký POST có body, phân trang SKU, tiền tệ, múi giờ Việt Nam, đúng Creator, scope, chống trùng, lưu lỗi và hiển thị 1440/390/320px. Có bài chạy bằng workerd và Playwright Chromium/WebKit; dữ liệu TikTok/Firebase trong bài thử được mô phỏng.

Tài liệu chính thức đã đối chiếu từ bản **Download Markdown** trên Partner Center:

- [Search Creator Affiliate Orders 202410](https://partner.tiktokshop.com/docv2/page/search-creator-affiliate-orders-202410)
- [Get Creator Profile 202405](https://partner.tiktokshop.com/docv2/page/get-creator-profile-202405)
- [Affiliate integration và phân biệt Seller/Creator authorization](https://partner.tiktokshop.com/docv2/page/affiliate-integration)
