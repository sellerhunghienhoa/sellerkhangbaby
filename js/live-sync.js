let liveSyncInProgress = false;

function mergeTikTokLiveSessions(existing, incoming) {
  const sessions = existing.map(session => ({ ...session }));
  let added = 0, updated = 0;
  const byId = new Map(sessions.map(session => [session.id, session]));
  for (const item of incoming) {
    const previous = byId.get(item.id);
    if (previous) {
      // Keep reconciliation, staff assignments and manual KPI decisions intact.
      Object.assign(previous, item);
      updated++;
    } else {
      const session = { ...item, grossLiveGmv: item.tiktokReportedGmv, affiliateGmv: 0,
        pendingRecGmv: item.tiktokReportedGmv, cancelReturnGmv: 0, targetGmv: 0,
        hostId: '', operatorId: '', shifts: [], shiftReportStatus: 'NONE',
        isManualKpi: false, manualKpiType: '', manualKpiNote: '', manualKpiBonus: 0 };
      sessions.push(session);
      byId.set(session.id, session);
      added++;
    }
  }
  return { sessions, added, updated };
}

async function syncTikTokLiveSessions() {
  if (!isAdmin() || liveSyncInProgress) return;
  liveSyncInProgress = true;
  const buttons = document.querySelectorAll('[data-live-sync]');
  const result = document.getElementById('liveSyncResult');
  buttons.forEach(button => { button.disabled = true; button.setAttribute('aria-busy', 'true'); });
  result.textContent = 'Đang lấy phiên LIVE từ TikTok…';
  try {
    const from = document.getElementById('liveSyncFrom').value;
    const to = document.getElementById('liveSyncTo').value;
    if (!from || !to || from > to || Date.parse(to) - Date.parse(from) > 30 * 86400000) throw new Error('LIVE_DATE_RANGE_INVALID');
    const response = await productionApiFetch('/api/tiktok/live/sync', { method: 'POST', body: JSON.stringify({ from, to }) });
    const data = await parseTikTokApiResponse(response);
    if (!Array.isArray(data.sessions)) throw new Error('TIKTOK_LIVE_RESPONSE_INVALID');
    const saved = data.sessions.length ? await saveProductionLiveSessions(data.sessions, data.syncedAt) : { added: 0, updated: 0 };
    result.textContent = data.sessions.length
      ? `Đã lưu ${saved.added} phiên mới, cập nhật ${saved.updated} phiên. Phiên mới chờ đối soát đơn hàng.`
      : 'TikTok chưa trả về phiên LIVE của shopkhangbaby hoặc mekhangsua trong khoảng ngày này.';
    if (data.ignored) result.textContent += ` Đã bỏ qua ${data.ignored} phiên của kênh khác.`;
    toast(result.textContent);
    renderAll();
  } catch (error) {
    const messages = {
      LIVE_DATE_RANGE_INVALID: 'Chọn khoảng ngày hợp lệ, tối đa 31 ngày mỗi lần.',
      TIKTOK_SELLER_NOT_CONNECTED: 'Cần hoàn tất Kết nối Seller của Shop Khang Baby trước khi đồng bộ.',
      TOKEN_ENCRYPTION_KEY_INVALID: 'Khóa mã hóa Cloudflare sai định dạng. Hãy sửa cấu hình rồi kết nối Seller.',
      TIKTOK_ANALYTICS_SCOPE_MISSING: 'Ứng dụng chưa được cấp quyền TikTok Shop Analytics (data.shop_analytics.public.read). Bật quyền và ủy quyền Seller lại.',
      TIKTOK_MULTIPLE_SHOPS: 'Seller đang cấp quyền nhiều shop. Cần xác định đúng Shop Khang Baby trước khi đồng bộ.',
      TIKTOK_NO_AUTHORIZED_SHOP: 'Seller chưa cấp quyền truy cập gian hàng cho ứng dụng.',
      TIKTOK_RATE_LIMITED: 'TikTok đang giới hạn số yêu cầu. Vui lòng thử lại sau.',
      TIKTOK_LIVE_RANGE_TOO_LARGE: 'Có quá nhiều phiên. Hãy chọn khoảng ngày ngắn hơn.',
      TIKTOK_LIVE_CURRENCY_UNSUPPORTED: 'Dữ liệu TikTok không dùng VND nên chưa nhập để tránh sai số tiền.'
    };
    result.textContent = messages[error.message] || `Chưa đồng bộ được phiên LIVE (${error.message || 'SYNC_FAILED'}). Dữ liệu hiện có được giữ nguyên.`;
    toast(result.textContent);
  } finally {
    liveSyncInProgress = false;
    buttons.forEach(button => { button.disabled = false; button.setAttribute('aria-busy', 'false'); });
  }
}
