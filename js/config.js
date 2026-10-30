/**
 * TikTok Shop Live GMV & KPI Center - System Configuration
 * @version 2.0.0
 */

// 0. Firebase Web App Configuration
// Firebase Web API keys are public identifiers. Access remains protected by
// Firebase Authentication and Security Rules.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyABazO0rjLnA8xtK_8p5MGpttNf5xHRYgU",
  authDomain: "sellerkhangbaby.firebaseapp.com",
  projectId: "sellerkhangbaby",
  storageBucket: "sellerkhangbaby.firebasestorage.app",
  messagingSenderId: "752377017264",
  appId: "1:752377017264:web:54e4ffa3a535a9cb0e9c75",
  measurementId: "G-R0ZPD7DDHQ"
};

const PRODUCTION_ADMIN_EMAIL = 'sellerhunghienhoa@gmail.com';

// System Constants & Business Rules
const TODAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const STORE_KEY = "TIKTOK_KPI_CENTER_V2000";
const HOST_RATE = 0.3;
const OP_RATE = 0.1;
const PROTECT_DAYS = 60;
const SHIFT_GRACE_MINUTES = 5; // Cho phép du di tối đa 5 phút. Quá 5 phút tính là Muộn giờ, dưới hoặc bằng 5 phút tính là Đúng/Sớm.

    const STANDARD_SLOTS = [
      { slot: '06:30 - 14:30', label: '06:30 - 14:30 (Ca sáng · 8.0H)', hours: 8.0 },
      { slot: '08:30 - 17:00', label: '08:30 - 17:00 (Ca hành chính · 8.5H)', hours: 8.5 },
      { slot: '10:00 - 18:00', label: '10:00 - 18:00 (Ca trưa chiều · 8.0H)', hours: 8.0 },
      { slot: '14:00 - 22:00', label: '14:00 - 22:00 (Ca chiều tối · 8.0H)', hours: 8.0 },
      { slot: '21:00 - 23:59', label: '21:00 - 23:59 (Ca đêm · 3.0H)', hours: 3.0 }
    ];


    const SLOTS = ['06:30 - 14:30', '08:30 - 17:00', '10:00 - 18:00', '14:00 - 22:00', '21:00 - 23:59'];
    const CHANNELS = ['shopkhangbaby', 'mekhangsua'];
    function round100k(n) { return Math.round(n / 1e5) * 1e5; }

    const SHOP_SOURCE_META = {
      UNKNOWN_NON_LIVE: { id: 'UNKNOWN_NON_LIVE', label: 'Ngoài LIVE · Chưa rõ nguồn', short: 'Chưa phân nguồn', pill: 'p-gray', icon: 'info', desc: 'API xác nhận ngoài LIVE nhưng chưa phân biệt Showcase, Video, Search, Ads.' },
      SHOWCASE: { id: 'SHOWCASE', label: 'Showcase (Trưng bày Shop)', short: 'Showcase', pill: 'p-pink', icon: 'store', desc: 'Khách vào trực tiếp gian hàng TikTok Shop và bấm mua' },
      SHORT_VIDEO: { id: 'SHORT_VIDEO', label: 'Video ngắn (Gắn giỏ hàng)', short: 'Video ngắn', pill: 'p-violet', icon: 'video', desc: 'Đơn chuyển đổi từ video review, mở hộp trên kênh' },
      SEARCH: { id: 'SEARCH', label: 'Tìm kiếm / TikTok Mall', short: 'Tìm kiếm Mall', pill: 'p-sky', icon: 'search', desc: 'Khách tìm kiếm từ khóa sản phẩm trên TikTok Shop Mall' },
      AFFILIATE_KOC: { id: 'AFFILIATE_KOC', label: 'KOC ngoài Live (Affiliate)', short: 'KOC ngoài Live', pill: 'p-green', icon: 'users', desc: 'Nhà sáng tạo KOC ngoài tự đăng video gắn link liên kết' },
      ADS: { id: 'ADS', label: 'Quảng cáo mua sắm (Shopping Ads)', short: 'Shopping Ads', pill: 'p-amber', icon: 'zap', desc: 'Chiến dịch quảng cáo GMV Max / Shop Tab' }
    };


    const RETURN_15D_REASONS = [
      { code: 'CHANGED_MIND', label: 'Đổi ý không dùng nữa (Nguyên seal)', pill: 'p-gray', icon: 'refresh', liability: 'Khách hàng', desc: 'Khách đổi ý, hàng còn nguyên tem seal, đủ điều kiện trả TikTok Mall 15 ngày' },
      { code: 'DAMAGED_TRANSIT', label: 'Móp méo / Rách bao bì do vận chuyển', pill: 'p-red', icon: 'alert', liability: 'Đơn vị vận chuyển', desc: 'Hộp carton móp, rách bao bì tã bỉm, lon sữa bị móp cạnh trong quá trình giao nhận' },
      { code: 'WRONG_VARIANT', label: 'Giao sai phân loại / Sai size tã bỉm', pill: 'p-amber', icon: 'box', liability: 'Kho & Vận hành', desc: 'Khách đặt size L đóng nhầm size M, hoặc nhầm vị Meiji 0 sang Meiji 9' },
      { code: 'MISMATCH_LIVE_DESC', label: 'Không đúng như Host tư vấn trên Live', pill: 'p-pink', icon: 'video', liability: 'Host Livestream', desc: 'Host cam kết tặng kèm bình sữa hoặc quà tặng nhưng kiện hàng thực tế không có' },
      { code: 'DEFECTIVE_PRODUCT', label: 'Lỗi sản xuất / Hỏng hóc kỹ thuật', pill: 'p-violet', icon: 'gear', liability: 'Nhà sản xuất', desc: 'Núm ti bị nứt rách van chống sặc, máy hút sữa cắm điện không lên nguồn' },
      { code: 'NEAR_EXPIRY', label: 'Date sản phẩm cận hạn (<6 tháng)', pill: 'p-sky', icon: 'clock', liability: 'Kho hàng', desc: 'Sữa bột nội địa date chỉ còn dưới 6 tháng, khách yêu cầu đổi date xa hơn' }
    ];

    const RETURN_15D_STATUSES = {
      PENDING: { label: 'Yêu cầu hoàn chờ xử lý', pill: 'p-amber', desc: 'Chưa xác nhận hoàn tiền; chưa khấu trừ KPI.' },
      REJECTED: { label: 'Đã từ chối / hủy yêu cầu', pill: 'p-gray', desc: 'Chưa ghi nhận hoàn tiền.' },
      REFUNDED: { label: 'Đã hoàn tiền (Trừ ví TikTok)', pill: 'p-green', desc: 'TikTok Shop đã xử lý hoàn tiền cho người mua, trừ tiền đối soát ví Shop' },
      RETURNING: { label: 'Đang chuyển hoàn về kho', pill: 'p-sky', desc: 'Đơn vị vận chuyển (J&T/NinjaVan) đang chuyển kiện hàng hoàn về kho Khang Baby' },
      WAREHOUSE_INSPECT: { label: 'Kho đang kiểm định', pill: 'p-amber', desc: 'Kiện hàng đã về tới kho, thủ kho đang khui kiểm tra ngoại quan & tem niêm phong' },
      DISPUTE_TIKTOK: { label: 'Tranh chấp khiếu nại TikTok', pill: 'p-red', desc: 'Shop gửi video đóng hàng & khui hàng khiếu nại TikTok do khách trả hàng rỗng/hàng hỏng' }
    };
