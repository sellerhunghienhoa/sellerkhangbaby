// Keep the Google session in the original tab while TikTok authorizes separately.
let tiktokAuthorizationWindow = null;

function showTikTokAuthorizationResult(result) {
  const messages = {
    success: 'Đã kết nối TikTok Mẹ Khang Sữa. Đang kiểm tra lại kết nối…',
    shop_creator_success: 'Đã kết nối Creator TikTok shopkhangbaby. Đang kiểm tra lại kết nối…',
    seller_success: 'Đã kết nối Shop Khang Baby. Đang kiểm tra lại kết nối…',
    failed: 'TikTok chưa cấp được token. Kiểm tra quyền ứng dụng và callback trong TikTok Partner Center.',
    seller_failed: 'Chưa kết nối được Seller. Kiểm tra App Key, App Secret, Service ID và callback.',
    invalid_state: 'Phiên ủy quyền hết hạn hoặc đã chuyển trình duyệt. Hãy kết nối lại trong cùng trình duyệt với website.',
    invalid_callback: 'TikTok chưa trả đủ mã cấp quyền. Hãy kết nối lại và hoàn tất bước xác nhận.'
  };
  toast(messages[result] || 'Ủy quyền TikTok chưa hoàn tất. Vui lòng thử lại.');
}

async function openTikTokAuthorization(path) {
  if (tiktokAuthorizationWindow && !tiktokAuthorizationWindow.closed) {
    tiktokAuthorizationWindow.focus();
    toast('Hãy hoàn tất hoặc đóng cửa sổ ủy quyền đang mở.');
    return;
  }
  // Open synchronously from the click so browsers do not block it after fetch.
  const popup = window.open('about:blank', '_blank', 'popup,width=560,height=760');
  if (!popup) {
    toast('Trình duyệt đã chặn cửa sổ ủy quyền. Hãy cho phép cửa sổ bật lên rồi kết nối lại.');
    return;
  }
  tiktokAuthorizationWindow = popup;
  let timer;
  let timeout;
  let expectedState = '';
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('tiktok-oauth-result') : null;
  const cleanup = () => {
    clearInterval(timer);
    clearTimeout(timeout);
    channel?.close();
    window.removeEventListener('message', onResult);
    window.removeEventListener('focus', onFocus);
    if (tiktokAuthorizationWindow === popup) tiktokAuthorizationWindow = null;
  };
  const refresh = () => { if (isAdmin()) void loadTikTokApiStatus(true); };
  const onFocus = () => refresh();
  const receiveResult = data => {
    if (!expectedState || data?.type !== 'tiktok-oauth-result' || data.state !== expectedState) return;
    cleanup();
    showTikTokAuthorizationResult(data.result);
    refresh();
    popup.close();
  };
  const onResult = event => {
    if (event.origin !== window.location.origin || event.source !== popup || event.data?.type !== 'tiktok-oauth-result') return;
    receiveResult(event.data);
  };
  if (channel) channel.onmessage = event => receiveResult(event.data);
  window.addEventListener('message', onResult);
  window.addEventListener('focus', onFocus);
  try {
    const response = await productionApiFetch(path, { method: 'POST' });
    const data = await parseTikTokApiResponse(response);
    const url = new URL(data.url);
    if (url.protocol !== 'https:' || !/(^|\.)(tiktok\.com|tiktokshop\.com)$/.test(url.hostname)) throw new Error('TIKTOK_AUTH_URL_INVALID');
    expectedState = url.searchParams.get('state');
    if (!expectedState) throw new Error('TIKTOK_AUTH_STATE_MISSING');
    if (popup.closed) { cleanup(); return; }
    popup.location.replace(url.toString());
    timer = setInterval(() => {
      if (!popup.closed) return;
      // COOP on a provider page can report closed before the callback returns.
      clearInterval(timer);
      if (tiktokAuthorizationWindow === popup) tiktokAuthorizationWindow = null;
      refresh();
    }, 1000);
    timeout = setTimeout(() => { cleanup(); refresh(); }, 10 * 60 * 1000);
  } catch (error) {
    cleanup();
    popup.close();
    console.error('Could not start TikTok authorization', error);
    toast(error.message === 'TOKEN_ENCRYPTION_KEY_INVALID'
      ? 'Khóa mã hóa Cloudflare sai định dạng. Cần sửa TIKTOK_TOKEN_ENCRYPTION_KEY thành Base64 của 32 byte ngẫu nhiên.'
      : 'Chưa mở được ủy quyền TikTok. Hãy kiểm tra kết nối API và cấu hình ứng dụng.');
  }
}
// --- Telegram Bot Settings & Testing ---

async function loadTelegramSettings() {
  if (typeof isAdmin === 'function' && !isAdmin()) return;
  const pill = document.getElementById('telegramStatusPill');
  const pillText = document.getElementById('telegramStatusText');
  const tokenInput = document.getElementById('tgBotToken');
  const chatInput = document.getElementById('tgChatId');
  const toggle = document.getElementById('tgAutoReportToggle');
  if (!pill && !tokenInput) return;

  try {
    const res = await productionApiFetch('/api/telegram/settings');
    if (!res.ok) throw new Error('TELEGRAM_SETTINGS_UNAVAILABLE');
    const data = await res.json();
    const isConfigured = data.configured === true;
    const isEnabled = isConfigured && data.enabled === true;
    if (toggle) { toggle.checked = isEnabled; toggle.disabled = false; }
    if (chatInput) chatInput.value = data.chatId || '';
    if (tokenInput) { tokenInput.value = ''; tokenInput.placeholder = data.maskedToken || 'Nhập Bot Token mới'; }

    const rawChatId = String(data.chatId || '');
    const maskedChatId = rawChatId.length > 4 ? `••••${rawChatId.slice(-4)}` : rawChatId;
    const maskedToken = data.maskedToken || 'Chưa cấu hình';
    const shortToken = maskedToken;
    const statusText = !isConfigured ? 'Chưa cấu hình' : isEnabled ? 'Đang hoạt động (23:00)' : 'Đã tạm dừng';

    // Update Top KPI Grid (giống Image 2)
    const kpiStatus = document.getElementById('tgKpiStatus');
    const pillOnline = document.getElementById('tgPillOnline');
    if (kpiStatus) kpiStatus.textContent = statusText;
    if (pillOnline) {
      pillOnline.className = isEnabled ? 'pill p-green' : 'pill p-amber';
      pillOnline.textContent = !isConfigured ? 'Chưa cấu hình' : isEnabled ? 'Online' : 'Tạm dừng';
    }
    const kpiToken = document.getElementById('tgKpiToken');
    if (kpiToken) kpiToken.textContent = shortToken;
    const kpiChatId = document.getElementById('tgKpiChatId');
    if (kpiChatId) kpiChatId.textContent = maskedChatId;
    const recipientStatus = document.getElementById('tgRecipientStatus');
    if (recipientStatus) { recipientStatus.textContent = isConfigured ? 'Đã cấu hình' : 'Chưa cấu hình'; recipientStatus.className = isConfigured ? 'pill p-green' : 'pill p-amber'; }

    // Update Status Pill
    if (pill) pill.className = isEnabled ? 'pill p-green' : 'pill p-amber';
    if (pillText) pillText.textContent = statusText;

    // Update Subtitles and Info
    const cardSub = document.getElementById('tgCardSub');
    if (cardSub) cardSub.textContent = `Telegram · Chat ID: ${maskedChatId || 'Chưa cấu hình'} · ${statusText}`;
    const infoRecipient = document.getElementById('tgInfoRecipient');
    if (infoRecipient) infoRecipient.textContent = maskedChatId || 'Chưa cấu hình';
    const infoTokenMasked = document.getElementById('tgInfoTokenMasked');
    if (infoTokenMasked) infoTokenMasked.textContent = maskedToken;
  } catch (err) {
    for (const id of ['tgKpiStatus', 'tgPillOnline', 'telegramStatusText', 'tgRecipientStatus']) {
      const status = document.getElementById(id);
      if (status) status.textContent = 'Chưa đọc được cấu hình';
    }
    if (toggle) toggle.disabled = true;
    console.warn('Could not load Telegram settings:', err);
  }
}

function toggleTelegramConfigEdit() {
  const details = document.getElementById('tgConnectionDetails');
  const container = document.getElementById('tgEditContainer');
  const btnSave = document.getElementById('btnSaveTelegram');
  const btnToggleText = document.getElementById('btnToggleEditText');
  if (!container) return;

  const isHidden = container.style.display === 'none' || !container.style.display;
  if (isHidden) {
    container.style.display = 'block';
    if (btnSave) btnSave.style.display = 'inline-flex';
    if (btnToggleText) btnToggleText.textContent = 'Thu gọn';
    if (details && !details.open) details.open = true;
  } else {
    container.style.display = 'none';
    if (btnSave) btnSave.style.display = 'none';
    if (btnToggleText) btnToggleText.textContent = 'Sửa cấu hình';
  }
  if (typeof hydrateIcons === 'function') hydrateIcons(document.getElementById('telegramReportCard'));
}

function togglePasswordVisibility(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    if (btn) { btn.textContent = '🔒'; btn.title = 'Ẩn token'; }
  } else {
    inp.type = 'password';
    if (btn) { btn.textContent = '👁️'; btn.title = 'Hiện token'; }
  }
}

async function saveTelegramConfiguration(isSilentToggle = false) {
  if (typeof isAdmin === 'function' && !isAdmin()) return;
  const tokenInput = document.getElementById('tgBotToken');
  const chatInput = document.getElementById('tgChatId');
  const toggle = document.getElementById('tgAutoReportToggle');
  const btn = document.getElementById('btnSaveTelegram');
  const feedback = document.getElementById('tgStatusFeedback');

  const botToken = tokenInput?.value.trim() || '';
  const chatId = chatInput?.value.trim() || '';
  const enabled = toggle ? !!toggle.checked : true;

  if (btn && !isSilentToggle) btn.disabled = true;
  try {
    const res = await productionApiFetch('/api/telegram/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, chatId, enabled })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      if (!isSilentToggle) toast('✅ Đã lưu cấu hình Telegram thành công!');
      else toast(enabled ? '✅ Đã bật tự động gửi báo cáo Telegram lúc 23:00' : '⏸️ Đã tạm dừng gửi báo cáo Telegram');
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#047857';
        feedback.style.background = '#F0FDF4';
        feedback.style.border = '1px solid #BBF7D0';
        feedback.style.borderRadius = '10px';
        feedback.style.padding = '8px 12px';
        const maskedChat = chatId.length > 4 ? `••••${chatId.slice(-4)}` : chatId;
        feedback.innerHTML = `✅ Bot <strong>Seller KBB</strong> (@sellerkbb_bot) đã kết nối thành công với Chat ID: <strong>${maskedChat}</strong>. ${enabled ? 'Báo cáo sẽ gửi tự động vào <strong>23:00 mỗi tối</strong>.' : 'Đang tạm dừng tự động gửi.'}`;
      }
      if (tokenInput) tokenInput.value = '';
      if (chatInput && data.config?.chatId) chatInput.value = data.config.chatId;
      await loadTelegramSettings();
      if (!isSilentToggle) {
        const container = document.getElementById('tgEditContainer');
        const btnToggleText = document.getElementById('btnToggleEditText');
        if (container) container.style.display = 'none';
        if (btn) btn.style.display = 'none';
        if (btnToggleText) btnToggleText.textContent = 'Sửa cấu hình';
      }
    } else {
      throw new Error(data.error || data.message || 'SAVE_FAILED');
    }
  } catch (err) {
    toast('❌ Lỗi khi lưu cấu hình Telegram: ' + (err.message || err));
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#E11D48';
      feedback.style.background = '#FFF1F2';
      feedback.style.border = '1px solid #FECDD3';
      feedback.style.borderRadius = '10px';
      feedback.style.padding = '8px 12px';
      feedback.textContent = 'Lỗi: ' + (err.message || 'Không thể lưu cấu hình.');
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function testTelegramNotification() {
  if (typeof isAdmin === 'function' && !isAdmin()) return;
  const btn = document.getElementById('btnTestTelegram');
  const btnTop = document.getElementById('btnTestTelegramTop');
  const feedback = document.getElementById('tgStatusFeedback');

  const setButtonsState = (disabled, text) => {
    if (btn) { btn.disabled = disabled; btn.innerHTML = text; }
    if (btnTop) { btnTop.disabled = disabled; btnTop.innerHTML = text; }
  };

  setButtonsState(true, '<i data-ic="refresh" data-s="14"></i>Đang gửi thử…');
  toast('Đang gửi tin nhắn thử nghiệm đến Telegram…');
  try {
    const res = await productionApiFetch('/api/telegram/test', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.ok) {
      toast('🎉 Gửi tin nhắn thành công! Hãy kiểm tra ứng dụng Telegram.');
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#047857';
        feedback.innerHTML = '🎉 Tin nhắn thử nghiệm đã gửi thành công! Bot đã kết nối hoàn tất với Telegram của bạn.';
      }
    } else {
      throw new Error(data.error || 'SEND_FAILED');
    }
  } catch (err) {
    toast('❌ Gửi tin nhắn thất bại: ' + (err.message || err));
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#E11D48';
      feedback.textContent = '❌ Gửi thất bại: ' + (err.message || 'Kiểm tra lại Bot Token hoặc Chat ID.');
    }
  } finally {
    setButtonsState(false, '<i data-ic="send" data-s="14"></i>Gửi thử tin nhắn');
    if (typeof hydrateIcons === 'function') hydrateIcons(document.getElementById('telegramReportCard'));
  }
}

window.loadTelegramSettings = loadTelegramSettings;
window.saveTelegramConfiguration = saveTelegramConfiguration;
window.testTelegramNotification = testTelegramNotification;
window.toggleTelegramConfigEdit = toggleTelegramConfigEdit;
window.togglePasswordVisibility = togglePasswordVisibility;
