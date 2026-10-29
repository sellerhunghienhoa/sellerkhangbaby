let liveSyncInProgress = false;
const LIVE_AUTO_REFRESH_MS = 60 * 1000;
const DAILY_AUTO_SYNC_CHECK_MS = 5 * 60 * 1000;
const DAILY_AUTO_SYNC_START_DELAY_MS = 10 * 1000;
const DAILY_AUTO_SYNC_RETRY_MS = 30 * 60 * 1000;
let liveAutoRefreshTimer = 0;
let liveAutoRefreshLastAttempt = 0;
let dailyAutoSyncTimer = 0;
let dailyAutoSyncStartTimer = 0;
let dailyAutoSyncLastAttempt = 0;
let dailyAutoSyncInProgress = false;

function automationSettings() {
  const defaults = { liveRefreshEnabled: true, dailySyncEnabled: true, lastDailySyncAt: '' };
  if (!state.automation || typeof state.automation !== 'object') state.automation = { ...defaults };
  else state.automation = { ...defaults, ...state.automation };
  return state.automation;
}

function vietnamDate(value = Date.now()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
}

function tiktokSyncWindow(value = Date.now()) {
  const to = vietnamDate(value);
  return { from: addDays(to, -30), to };
}

function dailySyncIsDue(value = Date.now()) {
  const settings = automationSettings();
  if (!settings.dailySyncEnabled) return false;
  const last = Date.parse(settings.lastDailySyncAt || '');
  return !Number.isFinite(last) || vietnamDate(last) !== vietnamDate(value);
}

function renderAutomationControls() {
  const settings = automationSettings();
  const liveToggle = document.getElementById('liveAutoRefreshToggle');
  const dailyToggle = document.getElementById('dailyAutoSyncToggle');
  if (liveToggle) liveToggle.checked = settings.liveRefreshEnabled;
  if (dailyToggle) dailyToggle.checked = settings.dailySyncEnabled;
  const dailyStatus = document.getElementById('dailyAutoSyncStatus');
  if (dailyStatus && !dailyAutoSyncInProgress) {
    dailyStatus.textContent = !settings.dailySyncEnabled
      ? 'Đang tắt'
      : settings.lastDailySyncAt
        ? `Lần gần nhất: ${new Date(settings.lastDailySyncAt).toLocaleString('vi-VN')}`
        : 'Chưa chạy · sẽ tự đồng bộ khi Admin đang mở trang';
  }
}

function autoRefreshLiveRows(incoming, existing) {
  const previous = new Map(existing.map(session => [session.id, session]));
  return incoming.filter(session => !session.endedAt || (previous.has(session.id) && !previous.get(session.id).endedAt));
}

function liveApiDataChanged(previous, incoming) {
  if (!previous) return true;
  return ['slot', 'endedAt', 'title', 'tiktokReportedGmv', 'creatorReportedGmv'].some(field => (previous[field] ?? '') !== (incoming[field] ?? ''));
}

function setLiveAutoRefreshStatus(message, failed = false) {
  const status = document.getElementById('liveAutoRefreshStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('p-green', !failed);
  status.classList.toggle('p-amber', failed);
}

function mergeTikTokLiveSessions(existing, incoming) {
  const sessions = existing.map(session => ({ ...session }));
  let added = 0, updated = 0;
  const byId = new Map(sessions.map(session => [session.id, session]));
  for (const item of incoming) {
    const previous = byId.get(item.id);
    const sellerGmv = Number(item.tiktokReportedGmv) || 0;
    const hasCreatorGmv = Number.isFinite(Number(item.creatorReportedGmv));
    const affiliateGmv = hasCreatorGmv ? Math.max(0, Number(item.creatorReportedGmv) - sellerGmv) : Number(previous?.affiliateGmv) || 0;
    const totalCreatorGmv = sellerGmv + affiliateGmv;
    if (previous) {
      // Keep reconciliation, staff assignments and manual KPI decisions intact.
      const reconciled = previous.orderReconciliationManaged === true && previous.orderSync?.verified === true;
      Object.assign(previous, item);
      previous.affiliateGmv = affiliateGmv;
      if (!reconciled) {
        previous.grossLiveGmv = sellerGmv;
        previous.pendingRecGmv = totalCreatorGmv;
        previous.cancelReturnGmv = 0;
        previous.orderReconciliationManaged = false;
      }
      updated++;
    } else {
      const session = { ...item, grossLiveGmv: sellerGmv, affiliateGmv,
        pendingRecGmv: totalCreatorGmv, cancelReturnGmv: 0, targetGmv: 0,
        hostId: '', operatorId: '', shifts: [], shiftReportStatus: 'NONE',
        isManualKpi: false, manualKpiType: '', manualKpiNote: '', manualKpiBonus: 0 };
      sessions.push(session);
      byId.set(session.id, session);
      added++;
    }
  }
  return { sessions, added, updated };
}

async function enrichCreatorLiveGmv(sessions) {
  const enriched = sessions.map(session => ({ ...session }));
  for (const creator of ['shopkhangbaby', 'mekhangsua']) {
    const creatorSessions = enriched.filter(session => session.channel === creator);
    for (let offset = 0; offset < creatorSessions.length; offset += 20) {
      const group = creatorSessions.slice(offset, offset + 20);
      const response = await productionApiFetch('/api/tiktok/live/core-stats', { method: 'POST', body: JSON.stringify({ creator, liveIds: group.map(session => session.tiktokLiveId) }) });
      const data = await parseTikTokApiResponse(response);
      if (!Array.isArray(data.rows) || data.rows.length !== group.length) throw new Error('TIKTOK_CREATOR_LIVE_RESPONSE_INVALID');
      const byId = new Map(data.rows.map(row => [row.liveId, row]));
      for (const session of group) {
        const row = byId.get(session.tiktokLiveId);
        if (!row || !Number.isSafeInteger(row.creatorReportedGmv) || row.creatorReportedGmv < 0) throw new Error('TIKTOK_CREATOR_LIVE_RESPONSE_INVALID');
        session.creatorReportedGmv = row.creatorReportedGmv;
        session.affiliateGmv = Math.max(0, row.creatorReportedGmv - session.tiktokReportedGmv);
      }
    }
  }
  return enriched;
}

async function refreshCurrentLiveData() {
  if (!automationSettings().liveRefreshEnabled || !isProductionAdmin() || document.visibilityState === 'hidden' || liveSyncInProgress || orderSyncInProgress || affiliateSyncInProgress) return false;
  liveSyncInProgress = true;
  liveAutoRefreshLastAttempt = Date.now();
  setLiveAutoRefreshStatus('Đang làm mới phiên LIVE…');
  try {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const response = await productionApiFetch('/api/tiktok/live/sync', {
      method: 'POST', body: JSON.stringify({ from: today, to: today }), signal: AbortSignal.timeout(30000)
    });
    const data = await parseTikTokApiResponse(response);
    if (!Array.isArray(data.sessions)) throw new Error('TIKTOK_LIVE_RESPONSE_INVALID');
    const active = autoRefreshLiveRows(data.sessions, state.sessions);
    const enriched = active.length ? await enrichCreatorLiveGmv(active) : [];
    const changed = enriched.filter(session => liveApiDataChanged(state.sessions.find(previous => previous.id === session.id), session));
    if (changed.length) await saveProductionLiveSessions(changed, data.syncedAt);
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setLiveAutoRefreshStatus(changed.length ? `LIVE vừa cập nhật · ${time}` : `LIVE đã mới nhất · ${time}`);
    if (changed.length) renderAll();
    return true;
  } catch (error) {
    console.error('Could not refresh current LIVE data', error);
    setLiveAutoRefreshStatus('Tự làm mới tạm gián đoạn · sẽ thử lại sau 1 phút', true);
    return false;
  } finally {
    liveSyncInProgress = false;
  }
}

function startLiveAutoRefresh() {
  clearInterval(liveAutoRefreshTimer);
  liveAutoRefreshTimer = 0;
  if (!isProductionAdmin() || !automationSettings().liveRefreshEnabled) {
    setLiveAutoRefreshStatus('Tự làm mới LIVE đang tắt');
    renderAutomationControls();
    return;
  }
  setLiveAutoRefreshStatus('Đang bật · mỗi 1 phút chỉ cập nhật phiên đang LIVE');
  liveAutoRefreshTimer = setInterval(() => void refreshCurrentLiveData(), LIVE_AUTO_REFRESH_MS);
  renderAutomationControls();
}

function toggleLiveAutoRefresh(enabled) {
  if (!isAdmin()) return;
  automationSettings().liveRefreshEnabled = Boolean(enabled);
  saveState();
  startLiveAutoRefresh();
  toast(enabled ? 'Đã bật tự làm mới phiên đang LIVE mỗi 1 phút.' : 'Đã tắt tự làm mới phiên đang LIVE.');
}

async function runDailyAutoSyncIfDue() {
  if (!isProductionAdmin() || document.visibilityState === 'hidden' || dailyAutoSyncInProgress || !dailySyncIsDue()) return false;
  if (liveSyncInProgress || orderSyncInProgress || affiliateSyncInProgress || Date.now() - dailyAutoSyncLastAttempt < DAILY_AUTO_SYNC_RETRY_MS) return false;
  dailyAutoSyncInProgress = true;
  dailyAutoSyncLastAttempt = Date.now();
  const status = document.getElementById('dailyAutoSyncStatus');
  if (status) status.textContent = 'Đang tự đồng bộ LIVE, đơn/hoàn và Affiliate 31 ngày gần nhất…';
  try {
    const completed = await syncTikTokLiveSessions({ automatic: true });
    if (!completed) {
      if (status) status.textContent = 'Chưa hoàn tất · sẽ tự thử lại sau 30 phút';
      return false;
    }
    automationSettings().lastDailySyncAt = new Date().toISOString();
    saveState();
    if (status) status.textContent = `Đã tự đồng bộ hôm nay · ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    return true;
  } finally {
    dailyAutoSyncInProgress = false;
    renderAutomationControls();
  }
}

function startDailyAutoSync() {
  clearInterval(dailyAutoSyncTimer);
  clearTimeout(dailyAutoSyncStartTimer);
  dailyAutoSyncTimer = 0;
  dailyAutoSyncStartTimer = 0;
  renderAutomationControls();
  if (!isProductionAdmin() || !automationSettings().dailySyncEnabled) return;
  dailyAutoSyncStartTimer = setTimeout(() => void runDailyAutoSyncIfDue(), DAILY_AUTO_SYNC_START_DELAY_MS);
  dailyAutoSyncTimer = setInterval(() => void runDailyAutoSyncIfDue(), DAILY_AUTO_SYNC_CHECK_MS);
}

function toggleDailyAutoSync(enabled) {
  if (!isAdmin()) return;
  automationSettings().dailySyncEnabled = Boolean(enabled);
  dailyAutoSyncLastAttempt = 0;
  saveState();
  startDailyAutoSync();
  toast(enabled ? 'Đã bật tự đồng bộ mỗi ngày.' : 'Đã tắt tự đồng bộ mỗi ngày.');
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (automationSettings().liveRefreshEnabled && Date.now() - liveAutoRefreshLastAttempt >= LIVE_AUTO_REFRESH_MS) void refreshCurrentLiveData();
  void runDailyAutoSyncIfDue();
});

async function syncTikTokLiveSessions(options = {}) {
  if (!isAdmin() || liveSyncInProgress || orderSyncInProgress || affiliateSyncInProgress) return false;
  liveSyncInProgress = true;
  const buttons = document.querySelectorAll('[data-live-sync]');
  const result = document.getElementById('liveSyncResult');
  buttons.forEach(button => { button.disabled = true; button.setAttribute('aria-busy', 'true'); });
  result.textContent = 'Đang lấy phiên LIVE từ TikTok…';
  let from,to,validRange=false,liveOk=false,pipelineOk=false;
  try {
    const range = tiktokSyncWindow();
    from = options.from || range.from;
    to = options.to || range.to;
    if (!from || !to || from > to || Date.parse(to) - Date.parse(from) > 30 * 86400000) throw new Error('LIVE_DATE_RANGE_INVALID');
    validRange=true;
    const response = await productionApiFetch('/api/tiktok/live/sync', { method: 'POST', body: JSON.stringify({ from, to }) });
    const data = await parseTikTokApiResponse(response);
    if (!Array.isArray(data.sessions)) throw new Error('TIKTOK_LIVE_RESPONSE_INVALID');
    const sessions = data.sessions.length ? await enrichCreatorLiveGmv(data.sessions) : [];
    const saved = sessions.length ? await saveProductionLiveSessions(sessions, data.syncedAt) : { added: 0, updated: 0 };
    result.textContent = data.sessions.length
      ? `Đã lưu ${saved.added} phiên mới, cập nhật ${saved.updated} phiên. Phiên mới chờ đối soát đơn hàng.`
      : 'TikTok chưa trả về phiên LIVE của shopkhangbaby hoặc mekhangsua trong khoảng ngày này.';
    if (data.ignored) result.textContent += ` Đã bỏ qua ${data.ignored} phiên của kênh khác.`;
    liveOk = true;
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
      TIKTOK_LIVE_TIMEOUT: 'TikTok phản hồi quá chậm. Hãy chọn khoảng ngày ngắn hơn rồi thử lại.',
      TIKTOK_LIVE_NETWORK_ERROR: 'Worker chưa kết nối được API TikTok. Vui lòng thử lại; nếu tiếp tục lỗi, cần kiểm tra log kết nối phía máy chủ.',
      TIKTOK_LIVE_REDIRECT_REJECTED: 'API TikTok trả về chuyển hướng bất thường. Chưa gửi token sang địa chỉ khác; cần kiểm tra endpoint phía máy chủ.',
      TIKTOK_LIVE_RANGE_TOO_LARGE: 'Có quá nhiều phiên. Hãy chọn khoảng ngày ngắn hơn.',
      TIKTOK_LIVE_CURRENCY_UNSUPPORTED: 'Dữ liệu TikTok không dùng VND nên chưa nhập để tránh sai số tiền.',
      TIKTOK_CREATOR_LIVE_SCOPE_MISSING: 'Creator chưa cấp quyền Live Data (creator.data.live.read.public). Bật quyền rồi ủy quyền lại cả hai tài khoản Creator.',
      TIKTOK_CREATOR_NOT_CONNECTED: 'Cần kết nối đủ Creator shopkhangbaby và mekhangsua để lấy tổng GMV và phần Affiliate theo từng phiên.'
    };
    result.textContent = messages[error.message] || `Chưa đồng bộ được phiên LIVE (${error.message || 'SYNC_FAILED'}). Dữ liệu hiện có được giữ nguyên.`;
    toast(result.textContent);
  } finally {
    if(validRange){
      const ordersOk=await syncTikTokOrders(from,to,true);
      result.textContent+=' Đơn hàng: '+orderSyncMessage;
      const affiliateOk=await syncTikTokAffiliateOrders(from,to,'ALL',true);
      result.textContent+=' Affiliate: '+affiliateSyncMessage;
      pipelineOk=liveOk&&ordersOk&&affiliateOk;
      toast(ordersOk&&affiliateOk?'Đồng bộ LIVE, đơn và Affiliate đã hoàn tất.':'Đồng bộ chưa hoàn tất; xem chi tiết từng bước trên màn hình API.');
    }
    liveSyncInProgress = false;
    renderAll();
    renderAffiliateSyncStatus();
    buttons.forEach(button => { button.disabled = false; button.setAttribute('aria-busy', 'false'); });
  }
  return pipelineOk;
}
