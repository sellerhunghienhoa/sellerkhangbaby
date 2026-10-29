/**
 * TikTok Shop Live GMV & KPI Center - Application Bootstrap & Global Handlers
 */

    /* ---------- 17. Premium Date Range Picker ---------- */
    let drViewYear = 2026, drViewMonth = 9; // 0-indexed month (9 = October)
    let drTempFrom = state.from, drTempTo = state.to;
    function openDatePicker() {
      if (currentTab === 'TAB_STAFF_KPI' || currentTab === 'TAB_DISCIPLINE') {
        toast('Mục này cố định chu kỳ cả tháng 10/2026, không áp dụng lọc theo ngày');
        return;
      }
      drTempFrom = state.from; drTempTo = state.to;
      const d = toDate(drTempTo || TODAY);
      drViewYear = d.getUTCFullYear(); drViewMonth = d.getUTCMonth();
      renderDatePicker(); openModal('mdDate');
    }
    function drMove(delta) {
      drViewMonth += delta;
      if (drViewMonth < 0) { drViewMonth = 11; drViewYear--; }
      if (drViewMonth > 11) { drViewMonth = 0; drViewYear++; }
      renderDatePicker();
    }
    function drQuick(kind) {
      if (kind === 'TODAY') { drTempFrom = TODAY; drTempTo = TODAY; }
      if (kind === '7D') { drTempFrom = addDays(TODAY, -6); drTempTo = TODAY; }
      if (kind === 'MONTH') { drTempFrom = TODAY.slice(0, 8) + '01'; drTempTo = TODAY; }
      renderDatePicker();
    }
    function drClear() { drTempFrom = addDays(TODAY, -29); drTempTo = TODAY; renderDatePicker(); }
    function drClickDay(iso) {
      if (!drTempFrom || (drTempFrom && drTempTo && drTempFrom !== drTempTo)) { drTempFrom = iso; drTempTo = iso; }
      else if (iso < drTempFrom) { drTempTo = drTempFrom; drTempFrom = iso; }
      else { drTempTo = iso; }
      renderDatePicker();
    }
    function drApply() {
      state.preset = 'CUSTOM'; state.from = drTempFrom; state.to = drTempTo || drTempFrom;
      saveState(); closeModal('mdDate'); resetPagesAndRender();
    }
    function renderDatePicker() {
      document.getElementById('drFrom').textContent = fmtD(drTempFrom);
      document.getElementById('drTo').textContent = fmtD(drTempTo);
      document.getElementById('drDays').textContent = (diffDays(drTempFrom, drTempTo) + 1) + ' ngày';
      document.getElementById('drRet').textContent = state.storage.retentionDays;
      const months = ['Tháng 01', 'Tháng 02', 'Tháng 03', 'Tháng 04', 'Tháng 05', 'Tháng 06', 'Tháng 07', 'Tháng 08', 'Tháng 09', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
      document.getElementById('drMonth').textContent = `${months[drViewMonth]} · ${drViewYear}`;

      const first = new Date(Date.UTC(drViewYear, drViewMonth, 1));
      const startDow = first.getUTCDay();
      const startDate = new Date(Date.UTC(drViewYear, drViewMonth, 1 - startDow));
      const wds = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(w => `<div class="dr-wd">${w}</div>`).join('');
      const cells = [];
      for (let i = 0; i < 42; i++) {
        const cur = new Date(startDate); cur.setUTCDate(startDate.getUTCDate() + i);
        const iso = toIso(cur);
        const out = cur.getUTCMonth() !== drViewMonth;
        const isStart = iso === drTempFrom, isEnd = iso === drTempTo;
        const inRange = iso > drTempFrom && iso < drTempTo;
        const cls = ['dr-d', 'num', out ? 'out' : '', inRange ? 'in' : '', isStart ? 'start' : '', isEnd ? 'end' : '', iso === TODAY ? 'today' : ''].filter(Boolean).join(' ');
        cells.push(`<button type="button" class="${cls}" ${iso > TODAY ? 'disabled' : ''} onclick="drClickDay('${iso}')">${cur.getUTCDate()}</button>`);
      }
      document.getElementById('drGrid').innerHTML = wds + cells.join('');
    }


    /* ---------- 18. Thông báo + Render tổng ---------- */
    function renderHeaderAndAlerts() {
      if (!productionBackendReady) return false;
      document.getElementById('bootScreen')?.classList.add('hidden');
      let u = me();
      const loginEl = document.getElementById('loginScreen');
      if (loginEl) loginEl.classList.toggle('hidden', !!u);
      document.getElementById('appShell')?.classList.toggle('hidden', !u);
      if (!u) {
        document.body.classList.remove('pending-account');
        return false;
      }

      document.getElementById('hdrAvatar').innerHTML = avatarContentHtml(u);
      document.getElementById('ddUserAva').innerHTML = avatarContentHtml(u);
      document.getElementById('ddUserName').textContent = u.name;
      document.getElementById('ddUserEmail').textContent = u.email;
      const removed = u.status === 'REMOVED';
      const accessBlocked = u.status !== 'APPROVED' || !ROLE[u.role];
      document.getElementById('ddUserRole').textContent = removed
        ? 'Yêu cầu đã bị xóa'
        : (accessBlocked ? 'Chờ quản trị viên duyệt' : ROLE[u.role].label);
      const hostTargetDd = document.getElementById('ddHostTargetItem');
      if (hostTargetDd) {
        // Admin và Vận hành không cần đặt target, chỉ có host livestream mới có!
        hostTargetDd.style.display = (u.role === 'HOST') ? 'flex' : 'none';
        if (u.role === 'HOST') {
          const isSet = (u.targetGmv || 0) > 0;
          const strongEl = hostTargetDd.querySelector('strong');
          const mutedEl = hostTargetDd.querySelector('.muted');
          if (strongEl) strongEl.textContent = isSet ? '🎯 Sửa / Xem Target cá nhân' : '🎯 Đặt Target của tôi';
          if (mutedEl) mutedEl.textContent = isSet ? `Mục tiêu: ${short(u.targetGmv)} (Có thể chỉnh sửa)` : 'Tự điền mục tiêu doanh số cá nhân';
        }
      }

      // Pending Gate vs Approved Content
      document.body.classList.toggle('pending-account', accessBlocked);
      document.getElementById('pendingGate').classList.toggle('hidden', !accessBlocked);
      document.getElementById('appContent').classList.toggle('hidden', accessBlocked);
      document.getElementById('toolbar').classList.toggle('hidden', accessBlocked || ['TAB_TIKTOK_API', 'TAB_STORAGE', 'TAB_ACCOUNTS', 'TAB_MANUAL_KPI'].includes(currentTab));
      if (accessBlocked) {
        document.getElementById('pendingGateStatus').innerHTML = removed
          ? '<span class="dot"></span>Yêu cầu đã bị xóa'
          : '<span class="dot"></span>Chờ quản trị viên duyệt';
        document.getElementById('pendingGateTitle').textContent = removed
          ? 'Tài khoản chưa được cấp quyền'
          : 'Tài khoản đang chờ phê duyệt';
        document.getElementById('pendingGateMessage').innerHTML = removed
          ? 'Yêu cầu truy cập của tài khoản này đã được quản trị viên xóa. Vui lòng <strong>đăng xuất</strong> hoặc liên hệ quản trị viên nếu bạn cần gửi lại yêu cầu.'
          : 'Quản trị viên cần duyệt và chọn vai trò <strong>Người dẫn LIVE</strong>, <strong>Nhân viên vận hành LIVE</strong> hoặc <strong>Quản trị viên</strong> trước khi bạn xem được dữ liệu.';
        document.getElementById('gateEmail').textContent = u.email;
        document.getElementById('gateUid').textContent = u.uid;
      }

      // Enforce RBAC: Host & Operator NEVER see TikTok API or Admin group
      const admin = isAdmin();
      document.getElementById('navAdminGroup').classList.toggle('hidden', !admin);
      document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !admin));
      if (!accessBlocked && !canAccessTab(currentTab)) switchTab('TAB_OVERVIEW');

      // Notifications (pending shift reports, pending users, unassigned sessions, storage quota alert)
      const notifs = [];

      // 💌 Thông báo hàng ngày động viên cố gắng khi đặt Target (CHỈ ÁP DỤNG CHO HOST LIVESTREAM)
      if (u.role === 'HOST' && (u.targetGmv || 0) > 0) {
        const hostRecGmv = getHostActualGmv(u);
        const mot = getHostDailyMotivation(u, hostRecGmv, u.targetGmv, hostMotivationOffset[u.id] || 0);
        if (mot) {
          notifs.push({
            ic: 'sparkle',
            cls: 'p-pink',
            title: `💌 Động viên Host hôm nay: Target ${short(u.targetGmv)} (${mot.pct}%)`,
            sub: mot.quote,
            act: `openHostTargetModal('${u.id}')`
          });
        }
      }
      const worst = worstQuotaMetric();
      if (admin && worst && worst.pct >= state.storage.threshold && !isStorageAlertDismissed()) {
        notifs.push({ ic: 'db', cls: 'p-red', title: `${worst.prov.name} đạt ${worst.pct}% dung lượng Free`, sub: `Bấm để giải phóng (${mb(reclaimableMB())})`, act: "switchTab('TAB_STORAGE')" });
      }
      const pendingShiftSessions = state.sessions.filter(s => s.isManualKpi && s.shiftReportStatus === 'PENDING').length;
      if (admin && pendingShiftSessions) {
        notifs.push({
          ic: 'video',
          cls: 'p-amber',
          title: `${pendingShiftSessions} phiếu ca LIVE đang chờ Admin duyệt`,
          sub: 'Nhân sự đã điền doanh số ca KPI thủ công · Bấm để xem và duyệt',
          act: "switchTab('TAB_MANUAL_KPI');"
        });
      }
      const pendingUsers = state.users.filter(x => x.status === 'PENDING').length;
      if (admin && pendingUsers) {
        notifs.push({ ic: 'users', cls: 'p-amber', title: `${pendingUsers} tài khoản Google chờ duyệt`, sub: 'Chọn vai trò Host / Operator / Admin', act: "switchTab('TAB_ACCOUNTS')" });
      }
      const unassigned = state.sessions.filter(s => !s.isManualKpi && (!s.shifts || s.shifts.length === 0) && (!s.hostId || !s.operatorId)).length;
      if (unassigned) {
        notifs.push({ ic: 'video', cls: 'p-pink', title: `${unassigned} phiên LIVE mới chưa gán Host/Op`, sub: 'Phiên mới cần Admin chọn thủ công', act: "switchTab('TAB_SESSIONS')" });
      }
      const badge = document.getElementById('notifBadge');
      badge.textContent = notifs.length;
      badge.classList.toggle('hidden', notifs.length === 0);
      const menuBadge = document.getElementById('menuBadge');
      if (menuBadge) { menuBadge.textContent = notifs.length; menuBadge.classList.toggle('hidden', notifs.length === 0); }
      const dockBadge = document.getElementById('dockBadge');
      if (dockBadge) { dockBadge.textContent = notifs.length; dockBadge.classList.toggle('hidden', notifs.length === 0); }

      document.getElementById('notifCountText').textContent = `${notifs.length} mục cần chú ý`;
      document.getElementById('notifList').innerHTML = notifs.length ? notifs.map(n => `
        <div class="dd-item" onclick="${n.act};closeDropdowns();">
          <span class="dd-ic ${n.cls}">${ic(n.ic, 16)}</span>
          <div><div style="font-weight:700;">${n.title}</div><div class="muted" style="font-size:11.5px;">${n.sub}</div></div>
        </div>`).join('') : '<div class="muted" style="padding:12px;text-align:center;">Không có cảnh báo mới</div>';
      return !pending;
    }

    function renderAll() {
      populateStaffFilter();
      syncPresetUI();
      if (!renderHeaderAndAlerts()) return;
      renderOverview();
      renderSessions();
      renderShopOrders();
      renderOrders();
      renderReturns15d();
      renderStaffKpi();
      renderDisciplineTab();
      renderManualKpi();
      renderExport();
      if (isAdmin()) {
        renderTikTokApi();
        renderOrderSyncStatus();
        renderAffiliateSyncStatus();
        renderStorage();
        renderAccounts();
      }
      document.querySelectorAll('.nav-count.num').forEach(badge => {
        if (badge.id === 'nbStorage') return;
        badge.hidden = badge.textContent.trim() === '0';
      });
      triggerDataCounters(document.getElementById(currentTab) || document);
    }

    window.addEventListener('DOMContentLoaded', async () => {
      hydrateIcons();
      loadState();
      const mq = window.matchMedia('(max-width: 860px)');
      const syncMobBtn = () => { document.getElementById('btnMobileSearch').style.display = mq.matches ? 'grid' : 'none'; };
      syncMobBtn(); mq.addEventListener('change', syncMobBtn);
      renderAll();
      const slowLoadTimer = setTimeout(() => {
        if (!productionBackendReady) {
          setAppLoading('Kết nối đang chậm. Bạn có thể chờ thêm hoặc tải lại trang.');
          document.getElementById('bootRetry')?.classList.remove('hidden');
        }
      }, 12000);
      try {
        await initializeProductionBackend();
        startLiveAutoRefresh();
        startDailyAutoSync();
        checkMonthlyDisciplineCycle();
        populateStaffFilter();
        const oauthResult = new URLSearchParams(window.location.search).get('tiktok_oauth');
        if (oauthResult && isAdmin()) {
          tiktokApiStatus = null;
          switchTab('TAB_TIKTOK_API');
          showTikTokAuthorizationResult(oauthResult);
          history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
        }
      } catch (error) {
        console.error('Firebase production initialization failed', error);
        setAppLoading('Vui lòng kiểm tra kết nối mạng và thử tải lại trang.', true);
      } finally {
        clearTimeout(slowLoadTimer);
      }
      renderAll();
    });
  
