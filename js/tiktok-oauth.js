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
  if (!pill || !tokenInput) return;

  try {
    const res = await productionApiFetch('/api/telegram/settings');
    if (!res.ok) return;
    const data = await res.json();
    if (toggle) toggle.checked = !!data.enabled;
    if (data.configured) {
      if (pill) pill.className = data.enabled ? 'pill p-green' : 'pill p-amber';
      if (pillText) pillText.textContent = data.enabled ? 'Đang hoạt động (23:00)' : 'Đã tạm dừng';
      if (chatInput && data.chatId && !chatInput.value) chatInput.value = data.chatId;
      if (tokenInput && data.maskedToken && !tokenInput.value) tokenInput.placeholder = data.maskedToken;
    } else {
      if (pill) pill.className = 'pill';
      if (pillText) pillText.textContent = 'Chưa cấu hình';
    }
  } catch (err) {
    console.warn('Could not load Telegram settings:', err);
  }
}

async function saveTelegramConfiguration() {
  if (typeof isAdmin === 'function' && !isAdmin()) return;
  const tokenInput = document.getElementById('tgBotToken');
  const chatInput = document.getElementById('tgChatId');
  const toggle = document.getElementById('tgAutoReportToggle');
  const btn = document.getElementById('btnSaveTelegram');
  const feedback = document.getElementById('tgStatusFeedback');

  const botToken = tokenInput ? tokenInput.value.trim() : '';
  const chatId = chatInput ? chatInput.value.trim() : '';
  const enabled = toggle ? toggle.checked : true;

  if (btn) btn.disabled = true;
  try {
    const res = await productionApiFetch('/api/telegram/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, chatId, enabled })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      toast('✅ Đã lưu cấu hình Telegram thành công!');
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#047857';
        feedback.innerHTML = '✅ Cấu hình hợp lệ. Hệ thống sẽ tự động gửi báo cáo chốt ca lúc <strong>23:00 mỗi tối</strong>.';
      }
      if (tokenInput && botToken) {
        tokenInput.value = '';
        tokenInput.placeholder = data.config.maskedToken;
      }
      await loadTelegramSettings();
    } else {
      throw new Error(data.error || 'SAVE_FAILED');
    }
  } catch (err) {
    toast('❌ Lỗi khi lưu cấu hình Telegram: ' + (err.message || err));
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#E11D48';
      feedback.textContent = 'Lỗi: ' + (err.message || 'Không thể lưu cấu hình.');
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function testTelegramNotification() {
  if (typeof isAdmin === 'function' && !isAdmin()) return;
  const btn = document.getElementById('btnTestTelegram');
  const feedback = document.getElementById('tgStatusFeedback');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-ic="refresh" data-s="14"></i>Đang gửi thử…';
  }
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
      feedback.innerHTML = '❌ Gửi thất bại: ' + (err.message || 'Kiểm tra lại Bot Token hoặc Chat ID.');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-ic="send" data-s="14"></i>Gửi thử tin nhắn';
      if (typeof hydrateIcons === 'function') hydrateIcons(btn);
    }
  }
}

window.loadTelegramSettings = loadTelegramSettings;
window.saveTelegramConfiguration = saveTelegramConfiguration;
window.testTelegramNotification = testTelegramNotification;
