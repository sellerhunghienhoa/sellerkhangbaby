/**
 * TikTok Shop Live GMV & KPI Center - Authentication, Social Login & Permissions
 */

    /* ---------- 4. Đăng nhập Google / Firebase + phân quyền ---------- */
    const ROLE = {
      ADMIN: { label: 'Quản trị viên', pill: 'p-amber', ava: 'ad', rateText: 'Toàn quyền' },
      HOST: { label: 'Người dẫn LIVE', pill: 'p-pink', ava: '', rateText: '0,3% GMV đã đối soát' },
      OPERATOR: { label: 'Nhân viên vận hành LIVE', pill: 'p-violet', ava: 'op', rateText: '0,1% GMV đã đối soát' }
    };
    // Phân quyền Tab: Host và Vận hành CHỈ ĐƯỢC XEM 5 mục:
    // 1. Tổng quan GMV & KPI | 2. Đối soát phiên LIVE | 3. KPI nhân sự (Hoa hồng) | 4. KPI thủ công | 5. Xuất file
    const STAFF_ALLOWED_TABS = ['TAB_OVERVIEW', 'TAB_SESSIONS', 'TAB_STAFF_KPI', 'TAB_MANUAL_KPI', 'TAB_EXPORT'];
    const ADMIN_TABS = ['TAB_SHOP_ORDERS', 'TAB_ORDERS', 'TAB_RETURNS_15D', 'TAB_DISCIPLINE', 'TAB_TIKTOK_API', 'TAB_STORAGE', 'TAB_ACCOUNTS'];
    function canAccessTab(tabId) {
      if (isAdmin()) return true;
      return STAFF_ALLOWED_TABS.includes(tabId);
    }
    function me() { return state.users.find(u => u.id === state.currentUserId) || null; }
    function userById(id) { return state.users.find(u => u.id === id) || null; }
    function getStaffShiftsInSession(session, userId) {
      if (!session || !session.hasShifts || !Array.isArray(session.shifts)) return [];
      const list = [];
      session.shifts.forEach(sh => {
        const isHost = (sh.hostId === userId || (sh.role === 'HOST' && sh.userId === userId));
        const isOp = (sh.operatorId === userId || (sh.role === 'OPERATOR' && sh.userId === userId));
        if (isHost) {
          list.push({
            ...sh,
            userId: userId,
            userRole: 'HOST',
            comm: sh.hostComm !== undefined ? sh.hostComm : (sh.role === 'HOST' ? sh.comm : 0),
            partnerId: sh.operatorId || sh.partnerId || null
          });
        } else if (isOp) {
          list.push({
            ...sh,
            userId: userId,
            userRole: 'OPERATOR',
            comm: sh.opComm !== undefined ? sh.opComm : (sh.role === 'OPERATOR' ? sh.comm : 0),
            partnerId: sh.hostId || sh.partnerId || null
          });
        }
      });
      return list;
    }
    function isAdmin() { const u = me(); return !!u && u.status === 'APPROVED' && u.role === 'ADMIN'; }

    function getFirebaseAuthContext() {
      return getProductionFirebaseContext();
    }

    let authActionInProgress = false;

    function getAuthErrorMessage(error, action = 'Thao tác') {
      const messages = {
        'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
        'auth/cancelled-popup-request': 'Một yêu cầu đăng nhập khác đang được xử lý.',
        'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên rồi thử lại.',
        'auth/network-request-failed': 'Không thể kết nối dịch vụ đăng nhập. Vui lòng kiểm tra mạng.',
        'auth/unauthorized-domain': 'Tên miền website chưa được cấp quyền đăng nhập Google.',
        'auth/user-disabled': 'Tài khoản này đã bị vô hiệu hóa.',
        'auth/too-many-requests': 'Bạn thao tác quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.',
        'auth/operation-not-allowed': 'Đăng nhập Google chưa được bật trên Firebase.'
      };
      return messages[error?.code] || `${action} chưa thành công. Vui lòng thử lại.`;
    }

    function setGoogleLoginBusy(busy) {
      const button = document.getElementById('googleLoginBtn');
      const text = document.getElementById('googleLoginText');
      if (button) {
        button.disabled = busy;
        button.setAttribute('aria-busy', String(busy));
      }
      if (text) text.textContent = busy ? 'Đang mở Google…' : 'Tiếp tục với Google';
    }

    function setLogoutBusy(busy) {
      document.querySelectorAll('[data-auth-action="logout"]').forEach(control => {
        control.setAttribute('aria-disabled', String(busy));
        if ('disabled' in control) control.disabled = busy;
      });
    }

    /* ---------- 4. Đăng nhập Social (Google / Gmail, Apple, Facebook) & Phân quyền ---------- */
    async function startGoogleLogin() {
      if (authActionInProgress) return;
      authActionInProgress = true;
      setGoogleLoginBusy(true);
      try {
        const { auth, GoogleAuthProvider, signInWithPopup } = await getFirebaseAuthContext();
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const res = await signInWithPopup(auth, provider);
        handleOAuthSuccess(res.user, 'Google');
      } catch (error) {
        toast(getAuthErrorMessage(error, 'Đăng nhập'));
      } finally {
        authActionInProgress = false;
        setGoogleLoginBusy(false);
      }
    }

    async function startAppleLogin() {
      toast('Bản production hiện chỉ bật đăng nhập Google.');
    }

    async function startFacebookLogin() {
      toast('Bản production hiện chỉ bật đăng nhập Google.');
    }

    function handleOAuthSuccess(fu, providerName) {
      toast(`Đăng nhập ${providerName} thành công. Đang đồng bộ dữ liệu…`);
    }

    /* ---------- 4.1 Lịch sử hoạt động & Trạng thái hiện diện tài khoản (Presence & Activity) ---------- */
    function formatTimeAgo(timeStr) {
      if (!timeStr) return 'Chưa ghi nhận';
      try {
        const parts = String(timeStr).trim().split(' ');
        const datePart = parts[0];
        const timePart = parts[1] || '00:00';
        const dDiff = diffDays(datePart, TODAY);

        if (dDiff === 0) {
          const [h, m] = timePart.split(':').map(Number);
          const refNow = new Date();
          const refH = refNow.getHours();
          const refM = refNow.getMinutes();
          let diffMin = (refH * 60 + refM) - (h * 60 + m);
          if (diffMin < 0) diffMin = Math.abs(diffMin);
          if (diffMin <= 1) return 'Vừa mới online';
          if (diffMin < 60) return `${diffMin} phút trước`;
          const hours = Math.floor(diffMin / 60);
          return `${hours} giờ trước (${timePart})`;
        }
        if (dDiff === 1) {
          return `Hôm qua lúc ${timePart}`;
        }
        if (dDiff < 7) {
          return `${dDiff} ngày trước (${fmtDs(datePart)})`;
        }
        return fmtD(datePart) + ` (${timePart})`;
      } catch (e) {
        return timeStr;
      }
    }

    function logUserActivity(userId, title, desc, type = 'kpi', icon = 'check') {
      const u = userById(userId);
      if (!u) return;
      if (!Array.isArray(u.activities)) u.activities = [];
      const now = `${TODAY} ${nowStamp()}`;
      u.lastActive = now;
      u.isOnline = true;
      u.activities.unshift({
        id: 'ACT-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000),
        title,
        desc,
        time: now,
        type,
        icon,
        device: u.device || 'Chrome · Windows',
        ip: '113.190.234.12'
      });
      if (u.activities.length > 40) u.activities.length = 40;
      saveState();
    }

    function openUserActivityModal(userId) {
      const u = userById(userId);
      if (!u) return;
      const isCur = u.id === state.currentUserId;
      const isOnline = isCur || !!u.isOnline;
      const activities = u.activities || [];
      const rateText = u.role ? ROLE[u.role]?.rateText : 'Chưa gán vai trò';

      const statusBadge = isOnline
        ? `<span class="pill p-green" style="height:26px;font-size:11.5px;padding:0 10px;font-weight:700;"><span class="online-indicator online" style="margin-right:2px;"></span>Đang online</span>`
        : `<span class="pill p-gray" style="height:26px;font-size:11.5px;padding:0 10px;font-weight:700;"><span class="online-indicator offline" style="margin-right:2px;"></span>Offline · ${formatTimeAgo(u.lastActive)}</span>`;

      document.getElementById('userActivityCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line2);margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="position:relative;display:inline-block;">
              ${avatarHtml(u, false)}
              <span class="online-indicator ${isOnline ? 'online' : 'offline'}" style="position:absolute;bottom:0;right:0;border:2px solid #fff;width:10px;height:10px;"></span>
            </div>
            <div>
              <div style="font-size:16px;font-weight:800;display:flex;align-items:center;gap:6px;">
                <span>${esc(u.name)}</span>
                <span class="pill ${u.role === 'HOST' ? 'p-pink' : (u.role === 'OPERATOR' ? 'p-violet' : 'p-amber')}" style="height:20px;font-size:10px;">${u.role ? ROLE[u.role].label : 'Chưa phân quyền'}</span>
              </div>
              <div class="mono muted" style="font-size:11.5px;">${esc(u.email)} · Tham gia: ${fmtD(u.joined)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            ${statusBadge}
            ${u.id !== 'U-ADMIN' ? `
              <button type="button" class="btn btn-ghost sm" style="height:26px;padding:0 9px;font-size:11px;color:#E11D48;border-color:#FECDD3;background:#FFF1F2;" onclick="closeModal('mdUserActivity');confirmDeleteUser('${u.id}')" title="Xóa tài khoản này">
                ${ic('trash', 12)}<span>Xóa tài khoản</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Bento Stats for Account Presence -->
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-bottom:14px;">
          <div class="shift-stat">
            <div class="lbl">Trạng thái &amp; Lần online cuối</div>
            <div class="val num" style="font-size:13px;color:${isOnline ? 'var(--green)' : 'var(--text)'};">
              ${isOnline ? 'Đang online (Vừa xong)' : formatTimeAgo(u.lastActive)}
            </div>
            <div class="muted num" style="font-size:10.5px;margin-top:2px;">${u.lastActive || 'Chưa ghi nhận'}</div>
          </div>
          <div class="shift-stat">
            <div class="lbl">Thiết bị &amp; Nền tảng</div>
            <div class="val" style="font-size:12.5px;font-weight:700;">${esc(u.device || 'Chrome · Windows 11')}</div>
            <div class="muted" style="font-size:10.5px;margin-top:2px;">Vị trí: ${esc(u.location || 'Hà Nội, VN')}</div>
          </div>
          <div class="shift-stat">
            <div class="lbl">Tổng số sự kiện ghi nhận</div>
            <div class="val num" style="color:var(--pink2);">${activities.length} hoạt động</div>
            <div class="muted" style="font-size:10.5px;margin-top:2px;">Chính sách: ${rateText}</div>
          </div>
        </div>

        <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:13px;display:flex;align-items:center;gap:6px;">
            <i data-ic="clock" data-s="15"></i>Nhật ký hoạt động chi tiết (${activities.length})
          </strong>
          <span class="muted" style="font-size:11px;">Tự động ghi nhận theo thời gian thực</span>
        </div>

        <!-- Activity Timeline -->
        <div style="max-height:280px;overflow-y:auto;padding:8px 12px;border:1px solid var(--line2);border-radius:14px;background:#FCF8FA;margin-bottom:14px;">
          ${activities.length ? `
            <div class="tl">
              ${activities.map((act, idx) => `
                <div class="tl-i ${idx === 0 ? 'live' : 'done'}" style="padding-bottom:14px;">
                  <div class="tl-dot" style="${idx === 0 ? 'background:var(--grad);border-color:transparent;' : 'background:#fff;border-color:#F5C6DA;color:var(--pink-ink);'}">
                    ${ic(act.icon || 'check', 13)}
                  </div>
                  <div>
                    <div class="tl-t" style="font-size:12.5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <span>${esc(act.title)}</span>
                      <span class="pill p-gray num" style="height:18px;font-size:9.5px;font-weight:600;">${formatTimeAgo(act.time)}</span>
                    </div>
                    <div class="tl-s" style="margin-top:2px;color:var(--text);font-size:11.5px;line-height:1.35;">
                      ${esc(act.desc)}
                    </div>
                    <div class="muted num" style="font-size:10px;margin-top:2px;">
                      ${act.time} · ${esc(act.device || u.device || 'Web')} ${act.ip ? `· IP: ${act.ip}` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>` : `
            <div style="text-align:center;padding:24px 12px;color:var(--muted);font-size:12px;">
              Chưa có lịch sử hoạt động nào được ghi nhận cho tài khoản này.
            </div>`}
        </div>

        <!-- Footer -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--line2);">
          <span class="muted" style="font-size:11.5px;">Bảo mật: Lưu vết phiên làm việc &amp; đối soát thao tác</span>
          <button type="button" class="btn btn-ghost sm" onclick="closeModal('mdUserActivity')">Đóng</button>
        </div>`;

      openModal('mdUserActivity');
    }

    function loginAs(id) {
      if (id === productionFirebaseUser?.uid) return;
      toast('Bản production không cho phép giả lập hoặc đổi sang tài khoản khác.');
    }

    async function logout() {
      if (authActionInProgress) return;
      authActionInProgress = true;
      closeDropdowns();
      setLogoutBusy(true);
      try {
        await signOutProduction();
        toast('Đã đăng xuất an toàn.');
      } catch (error) {
        toast(getAuthErrorMessage(error, 'Đăng xuất'));
      } finally {
        authActionInProgress = false;
        setLogoutBusy(false);
      }
    }

    function openAccountChooser() {
      closeDropdowns();
      startGoogleLogin();
    }

    function registerFromModal() {
      startGoogleLogin();
    }

    function avatarHtml(u, ring = true) {
      const cls = u.status === 'PENDING' ? 'pd' : (ROLE[u.role]?.ava || '');
      const a = `<div class="ava ${cls}">${esc(initials(u.name))}</div>`;
      if (!ring) return a;
      const isOnline = u.id === state.currentUserId || !!u.isOnline;
      return `<div class="ava-ring ${u.role === 'OPERATOR' ? 'op' : ''}">${a}${isOnline ? '<span class="online"></span>' : ''}</div>`;
    }
    function statusPill(u) {
      return u.status === 'PENDING' ? '<span class="pill p-amber"><span class="dot"></span>Chờ duyệt</span>' : '<span class="pill p-green"><span class="dot"></span>Đã duyệt</span>';
    }
