let affiliateSyncInProgress = false;
let affiliateSyncMessage = '';

function mergeAffiliateDays(existing, incoming) {
  const days = new Map((existing || []).map(day=>[day.channel+':'+day.date,{...day}]));
  incoming.forEach(day=>days.set(day.channel+':'+day.date,{...day}));
  return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

function affiliateOverviewSummary() {
  const channel = document.getElementById('fChannel')?.value || 'ALL';
  const staff = document.getElementById('fStaff')?.value || 'ALL';
  if (!isAdmin() || staff !== 'ALL') return {available:false,reason:'Chưa phân bổ dữ liệu Creator theo nhân sự.'};
  if (!['ALL','mekhangsua'].includes(channel)) return {available:false,reason:'Chọn tất cả kênh hoặc mekhangsua để xem Creator.'};
  const days = (state.affiliateDaily || []).filter(day=>day.channel === 'mekhangsua' && day.date>=state.from && day.date<=state.to);
  const sum = field=>days.reduce((total,day)=>total+(Number(day[field])||0),0);
  return {available:days.length>0,reason:'Chưa đồng bộ đơn Affiliate từ Creator.',gmv:sum('gmv'),commission:sum('settledCommission'),liveGmv:sum('liveGmv'),videoGmv:sum('videoGmv'),refundedGmv:sum('refundedGmv'),orderCount:sum('orderCount'),days:days.length,totalDays:Math.round((Date.parse(state.to)-Date.parse(state.from))/86400000)+1};
}

async function syncTikTokAffiliateOrders(from, to) {
  if (!isAdmin() || affiliateSyncInProgress) return;
  from ||= document.getElementById('liveSyncFrom').value;
  to ||= document.getElementById('liveSyncTo').value;
  affiliateSyncInProgress = true;
  affiliateSyncMessage = 'Đang lấy đơn Affiliate của TikTok Mẹ Khang Sữa…';
  const show = () => {
    document.querySelectorAll('[data-affiliate-sync]').forEach(button=>{button.disabled=affiliateSyncInProgress;button.setAttribute('aria-busy',String(affiliateSyncInProgress));});
    document.getElementById('affiliateSyncResult').textContent=affiliateSyncMessage;
  };
  show();
  try {
    if (!from || !to || from>to || Date.parse(to)-Date.parse(from)>30*86400000) throw new Error('LIVE_DATE_RANGE_INVALID');
    const response = await productionApiFetch('/api/tiktok/affiliate/sync',{method:'POST',body:JSON.stringify({from,to}),signal:AbortSignal.timeout(90000)});
    const data = await parseTikTokApiResponse(response);
    if (!Array.isArray(data.days) || data.creator!=='mekhangsua' || !data.syncedAt) throw new Error('TIKTOK_AFFILIATE_RESPONSE_INVALID');
    await saveProductionAffiliateDays(data.days,data.syncedAt);
    affiliateSyncMessage = `Đã lưu Affiliate mekhangsua từ ${fmtDs(from)} đến ${fmtDs(to)}. Doanh số theo ngày tạo đơn; xem Tổng quan với cùng bộ lọc ngày.`;
    toast('Đã cập nhật GMV Affiliate từ Creator.');
  } catch(error) {
    const messages = {
      LIVE_DATE_RANGE_INVALID:'Chọn khoảng ngày hợp lệ, tối đa 31 ngày mỗi lần.',
      TIKTOK_CREATOR_NOT_CONNECTED:'Cần kết nối Creator của TikTok Mẹ Khang Sữa trước khi đồng bộ Affiliate.',
      TIKTOK_AFFILIATE_SCOPE_MISSING:'Creator thiếu quyền creator.affiliate_collaboration.read. Bật Read Creator Affiliate Collaborations và ủy quyền lại Creator.',
      TIKTOK_CREATOR_PROFILE_SCOPE_MISSING:'Cần quyền creator.affiliate.info để xác minh đúng tài khoản. Bật Affiliate Information và ủy quyền lại Creator.',
      TIKTOK_CREATOR_ACCOUNT_MISMATCH:'Creator được cấp quyền không phải @mekhangsua. Hãy ủy quyền lại đúng tài khoản TikTok Mẹ Khang Sữa.',
      TIKTOK_AFFILIATE_CURRENCY_UNSUPPORTED:'Đơn Affiliate không dùng VND; chưa nhập để tránh sai số tiền.',
      TIKTOK_AFFILIATE_RESPONSE_INVALID:'Phản hồi đơn Affiliate thiếu hoặc sai định dạng tiền/đơn hàng; chưa thay đổi dữ liệu đã lưu.',
      TIKTOK_AFFILIATE_TIMEOUT:'API Affiliate phản hồi chậm. Hãy chọn khoảng ngày ngắn hơn và thử lại.',
      TIKTOK_AFFILIATE_NETWORK_ERROR:'Chưa kết nối được API Affiliate TikTok. Hãy thử lại sau; số liệu cũ được giữ nguyên.',
      TIKTOK_AFFILIATE_REDIRECT_REJECTED:'TikTok trả chuyển hướng bất thường; đã chặn gửi token sang địa chỉ khác.',
      TIKTOK_AFFILIATE_CHANGED_DURING_SYNC:'Đơn Affiliate thay đổi trong lúc phân trang. Hãy đồng bộ lại.',
      TIKTOK_AFFILIATE_RANGE_TOO_LARGE:'Quá 2.000 dòng SKU trong một lần đồng bộ. Hãy chọn khoảng ngày ngắn hơn.',
      TIKTOK_AFFILIATE_STORAGE_LIMIT:'Dữ liệu tổng hợp đạt giới hạn document. Chưa ghi đè dữ liệu hiện có.',
      TIKTOK_RATE_LIMITED:'TikTok đang giới hạn yêu cầu. Hãy thử lại sau.'
    };
    affiliateSyncMessage = messages[error.message] || `Chưa đồng bộ được Affiliate (${error.message || 'SYNC_FAILED'}). Dữ liệu cũ được giữ nguyên.`;
    toast(affiliateSyncMessage);
  } finally {
    affiliateSyncInProgress = false;
    renderAll();
    show();
  }
}
