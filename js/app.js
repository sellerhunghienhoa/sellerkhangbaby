/**
 * TikTok Shop Live GMV & KPI Center - Application Bootstrap & Global Handlers
 */

    /* ---------- 17. Premium Date Range Picker ---------- */
    let drViewYear = 2026, drViewMonth = 9; // 0-indexed month (9 = October)
    let drTempFrom = state.from, drTempTo = state.to;
    function openDatePicker() {
      if (currentTab === 'TAB_STAFF_KPI') {
        const mRange = getCurrentMonthRange(state?.staffMonth || TODAY); toast(`Mục này đang chọn ${mRange.label}. Vui lòng đổi tháng tại thanh công cụ!`);
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
      const today = typeof vietnamDate === 'function' ? vietnamDate() : TODAY;
      if (kind === 'TODAY') { drTempFrom = today; drTempTo = today; }
      if (kind === '7D') { drTempFrom = addDays(today, -6); drTempTo = today; }
      if (kind === 'MONTH') { drTempFrom = today.slice(0, 8) + '01'; drTempTo = today; }
      renderDatePicker();
    }
    function drClear() {
      const today = typeof vietnamDate === 'function' ? vietnamDate() : TODAY;
      drTempFrom = addDays(today, -29); drTempTo = today; renderDatePicker();
    }
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
      const today = typeof vietnamDate === 'function' ? vietnamDate() : TODAY;
      const cells = [];
      for (let i = 0; i < 42; i++) {
        const cur = new Date(startDate); cur.setUTCDate(startDate.getUTCDate() + i);
        const iso = toIso(cur);
        const out = cur.getUTCMonth() !== drViewMonth;
        const isStart = iso === drTempFrom, isEnd = iso === drTempTo;
        const inRange = iso > drTempFrom && iso < drTempTo;
        const cls = ['dr-d', 'num', out ? 'out' : '', inRange ? 'in' : '', isStart ? 'start' : '', isEnd ? 'end' : '', iso === today ? 'today' : ''].filter(Boolean).join(' ');
        cells.push(`<button type="button" class="${cls}" ${iso > today ? 'disabled' : ''} onclick="drClickDay('${iso}')">${cur.getUTCDate()}</button>`);
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
          const m = state?.staffMonth || TODAY.slice(0, 7);
          const userTarget = getHostTargetGmv(u, m);
          const isSet = (userTarget || 0) > 0;
          const strongEl = hostTargetDd.querySelector('strong');
          const mutedEl = hostTargetDd.querySelector('.muted');
          if (strongEl) strongEl.textContent = isSet ? '🎯 Sửa / Xem Target cá nhân' : '🎯 Đặt Target của tôi';
          if (mutedEl) mutedEl.textContent = isSet ? `Mục tiêu ${getCurrentMonthRange(m).label}: ${short(userTarget)}` : `Tự điền target ${getCurrentMonthRange(m).label}`;
        }
      }

      // Pending Gate vs Approved Content
      document.body.classList.toggle('pending-account', accessBlocked);
      document.getElementById('pendingGate').classList.toggle('hidden', !accessBlocked);
      document.getElementById('appContent').classList.toggle('hidden', accessBlocked);
      document.getElementById('toolbar').classList.toggle('hidden', accessBlocked || ['TAB_TIKTOK_API', 'TAB_STORAGE', 'TAB_ACCOUNTS', 'TAB_MANUAL_KPI', 'TAB_GUIDE'].includes(currentTab));
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

      // Notifications (real-time alerts for admin & staff: new sessions, pending shifts, accounts, returns, quotas, targets)
      const notifs = [];

      // 1. Host Target Motivation / Reminder
      const curM = state?.staffMonth || TODAY.slice(0, 7);
      const hostMTarget = getHostTargetGmv(u, curM);
      if (u.role === 'HOST') {
        if (hostMTarget > 0) {
          const hostRecGmv = getHostActualGmv(u);
          const mot = getHostDailyMotivation(u, hostRecGmv, hostMTarget, hostMotivationOffset[u.id] || 0);
          if (mot) {
            notifs.push({
              ic: 'sparkle',
              cls: 'p-pink',
              title: `💌 Động viên Host hôm nay: Target ${short(hostMTarget)} (${mot.pct}%)`,
              sub: mot.quote,
              act: `openHostTargetModal('${u.id}', '${curM}')`
            });
          }
        } else {
          notifs.push({
            ic: 'target',
            cls: 'p-pink',
            title: `🎯 Bạn chưa đặt Mục tiêu Target tháng ${curM.slice(5)}/${curM.slice(0, 4)}`,
            sub: 'Bấm để cài đặt mục tiêu doanh số cá nhân và theo dõi thưởng hoa hồng',
            act: `openHostTargetModal('${u.id}', '${curM}')`
          });
        }
      }

      // 2. Ca LIVE & Báo cáo của nhân sự (Host / Operator)
      if (!admin) {
        const myTodaySessions = (state.sessions || []).filter(s =>
          (s.date === TODAY || s.startedAt?.startsWith(TODAY)) &&
          (s.hostId === u.id || s.operatorId === u.id || (s.shifts && s.shifts.some(sh => sh.userId === u.id || sh.hostId === u.id || sh.operatorId === u.id)))
        );
        if (myTodaySessions.length) {
          const myGmv = myTodaySessions.reduce((acc, s) => acc + (Number(s.gmv) || 0), 0);
          notifs.push({
            ic: 'video',
            cls: 'p-sky',
            title: `Hôm nay bạn có ${myTodaySessions.length} ca LIVE`,
            sub: `Tổng GMV ca: ${short(myGmv)} · Bấm để xem chi tiết ca của bạn`,
            act: "switchTab('TAB_SESSIONS')"
          });
        }
        const myPending = (state.sessions || []).filter(s =>
          (s.hostId === u.id || s.operatorId === u.id || (s.shifts && s.shifts.some(sh => sh.userId === u.id || sh.hostId === u.id || sh.operatorId === u.id))) &&
          (s.shiftReportStatus === 'PENDING' || (s.shifts && s.shifts.some(sh => (sh.userId === u.id || sh.hostId === u.id || sh.operatorId === u.id) && sh.status === 'PENDING')))
        );
        if (myPending.length) {
          notifs.push({
            ic: 'clock',
            cls: 'p-amber',
            title: `Bạn có ${myPending.length} ca LIVE đang chờ Admin duyệt`,
            sub: 'Báo cáo doanh số ca đã nộp · Đang chờ Admin phê duyệt KPI',
            act: "switchTab('TAB_SESSIONS')"
          });
        }
      }

      // 3. Thông báo dành riêng cho Quản trị viên (Admin)
      if (admin) {
        // Tài khoản Google mới chờ duyệt
        const pendingUsers = (state.users || []).filter(x => x.status === 'PENDING').length;
        if (pendingUsers) {
          notifs.push({
            ic: 'users',
            cls: 'p-amber',
            title: `${pendingUsers} tài khoản Google mới chờ duyệt`,
            sub: 'Nhân sự mới đăng nhập · Phân quyền Host / Operator / Admin',
            act: "switchTab('TAB_ACCOUNTS')"
          });
        }

        // Ca LIVE / Phiếu báo cáo KPI đang chờ duyệt
        const allPendingShifts = (state.sessions || []).filter(s =>
          s.shiftReportStatus === 'PENDING' || (s.shifts && s.shifts.some(sh => sh.status === 'PENDING'))
        );
        if (allPendingShifts.length) {
          const manualCount = allPendingShifts.filter(s => s.isManualKpi).length;
          const liveCount = allPendingShifts.length - manualCount;
          const subText = manualCount && liveCount
            ? `${liveCount} ca LIVE + ${manualCount} phiếu thủ công`
            : (manualCount ? `${manualCount} phiếu KPI thủ công` : `${liveCount} ca LIVE TikTok`);
          notifs.push({
            ic: 'clock',
            cls: 'p-amber',
            title: `${allPendingShifts.length} ca LIVE đang chờ Admin duyệt phiếu`,
            sub: `${subText} · Bấm để xem và duyệt ngay`,
            act: manualCount > liveCount ? "switchTab('TAB_MANUAL_KPI')" : "switchTab('TAB_SESSIONS')"
          });
        }

        // Phiên LIVE mới hôm nay
        const todaySessions = (state.sessions || []).filter(s => !s.isManualKpi && (s.date === TODAY || s.startedAt?.startsWith(TODAY)));
        if (todaySessions.length) {
          const todayGmv = todaySessions.reduce((acc, s) => acc + (Number(s.gmv) || 0), 0);
          notifs.push({
            ic: 'video',
            cls: 'p-sky',
            title: `Hôm nay có ${todaySessions.length} phiên LIVE mới`,
            sub: `Tổng GMV hôm nay: ${short(todayGmv)} · Bấm để đối soát`,
            act: "switchTab('TAB_SESSIONS')"
          });
        }

        // Phiên LIVE mới chưa gán nhân sự
        const unassigned = (state.sessions || []).filter(s => !s.isManualKpi && (!s.shifts || s.shifts.length === 0) && (!s.hostId || !s.operatorId)).length;
        if (unassigned) {
          notifs.push({
            ic: 'users',
            cls: 'p-pink',
            title: `${unassigned} phiên LIVE mới chưa gán Host/Op`,
            sub: 'Phiên LIVE cần Admin chọn nhân sự phụ trách',
            act: "switchTab('TAB_SESSIONS')"
          });
        }

        // Đơn Shop tự ra mới hôm nay (Ngoài LIVE)
        const todayShopOrders = (state.shopOrders || []).filter(o => o.date === TODAY || o.createTime?.startsWith(TODAY));
        if (todayShopOrders.length) {
          const shopGmv = todayShopOrders.reduce((acc, o) => acc + (Number(o.orderAmount || o.gmv) || 0), 0);
          notifs.push({
            ic: 'store',
            cls: 'p-violet',
            title: `Hôm nay có ${todayShopOrders.length} đơn Shop tự ra mới`,
            sub: `Tổng GMV ngoài live: ${short(shopGmv)} · Bấm để xem`,
            act: "switchTab('TAB_SHOP_ORDERS')"
          });
        }

        // Đơn hoàn 15 ngày TikTok cần xử lý
        const pendingReturns = (state.returns15d || []).filter(r =>
          r.status === 'PENDING' || r.status === 'DISPUTE_TIKTOK' || r.status === 'WAREHOUSE_INSPECT'
        );
        if (pendingReturns.length) {
          const retGmv = pendingReturns.reduce((acc, r) => acc + (Number(r.returnAmount) || 0), 0);
          notifs.push({
            ic: 'refresh',
            cls: 'p-red',
            title: `${pendingReturns.length} đơn hoàn TikTok 15 ngày cần xử lý`,
            sub: `Tổng tiền hoàn: ${short(retGmv)} · Kiểm định / Khiếu nại`,
            act: "switchTab('TAB_RETURNS_15D')"
          });
        }

        // Phiên LIVE đang giao hàng chờ đối soát
        const pendingRecSessions = (state.sessions || []).filter(s => s.endedAt && Number(s.pendingRecGmv) > 0);
        if (pendingRecSessions.length) {
          const totalPendingRec = pendingRecSessions.reduce((acc, s) => acc + (Number(s.pendingRecGmv) || 0), 0);
          notifs.push({
            ic: 'truck',
            cls: 'p-amber',
            title: `${pendingRecSessions.length} phiên LIVE đang giao hàng chờ đối soát`,
            sub: `GMV đang vận chuyển: ${short(totalPendingRec)} · Chờ giao thành công`,
            act: "switchTab('TAB_SESSIONS')"
          });
        }

        // Cảnh báo dung lượng lưu trữ kỹ thuật
        const worst = worstQuotaMetric();
        if (worst && worst.pct >= state.storage.threshold && !isStorageAlertDismissed()) {
          notifs.push({
            ic: 'db',
            cls: 'p-red',
            title: `${worst.prov.name} đạt ${worst.pct}% dung lượng Free`,
            sub: 'Mở trang dung lượng để kiểm tra và giải phóng tài nguyên kỹ thuật đủ điều kiện.',
            act: "switchTab('TAB_STORAGE')"
          });
        }
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
      if (!accessBlocked) {
        syncNativeNotifications(notifs);
      }
      return !accessBlocked;
    }

    let notifiedItemsKey = '';
    let lastNotifTimestamp = 0;
    let latestComputedNotifs = [];

    function syncNativeNotifications(notifs, force = false) {
      latestComputedNotifs = Array.isArray(notifs) ? notifs : [];
      if (!Array.isArray(notifs)) return;
      const count = notifs.length;
      if (typeof window.setNativeBadge === 'function') {
        try { window.setNativeBadge(count); } catch (_) {}
      } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.setNativeBadge) {
        try { window.webkit.messageHandlers.setNativeBadge.postMessage(count); } catch (_) {}
      }
      if (count === 0) { notifiedItemsKey = ''; return; }
      const currentKey = notifs.map(n => n.title).join(':::');
      const now = Date.now();
      if (!force && currentKey === notifiedItemsKey && (now - lastNotifTimestamp < 10 * 60 * 1000)) {
        return;
      }
      const prevKeys = new Set(notifiedItemsKey ? notifiedItemsKey.split(':::') : []);
      const itemsToSend = force ? notifs : notifs.filter(n => !prevKeys.has(n.title));
      notifiedItemsKey = currentKey;
      lastNotifTimestamp = now;
      itemsToSend.forEach((n, idx) => {
        setTimeout(() => {
          dispatchNotification(n.title, n.sub, count);
        }, idx * 600);
      });

      if (typeof window.scheduleBackgroundReminder === 'function' && notifs.length > 0) {
        try {
          window.scheduleBackgroundReminder('Khang Baby LIVE', `Hệ thống có ${notifs.length} mục cần chú ý: ${notifs[0].title}`, 1800, notifs.length);
        } catch (_) {}
      }
    }

    function dispatchNotification(title, body, badge) {
      const b = typeof badge === 'number' ? badge : 0;
      if (typeof window.sendNativeNotification === 'function') {
        window.sendNativeNotification(title, body, { badge: b, delay: 0 });
      } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeNotify) {
        window.webkit.messageHandlers.nativeNotify.postMessage({
          title: String(title || 'Khang Baby'),
          body: String(body || ''),
          badge: b,
          delay: 0
        });
      } else if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body,
              icon: '/assets/brand/khangbaby-icon-192.png',
              badge: '/assets/brand/khangbaby-icon-192.png'
            });
          } catch (_) {}
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => {
            if (p === 'granted') {
              try {
                new Notification(title, {
                  body,
                  icon: '/assets/brand/khangbaby-icon-192.png',
                  badge: '/assets/brand/khangbaby-icon-192.png'
                });
              } catch (_) {}
            }
          });
        }
      }
    }

    function testPushNotification() {
      if (latestComputedNotifs.length > 0) {
        syncNativeNotifications(latestComputedNotifs, true);
        toast(`Đã phát ${latestComputedNotifs.length} thông báo nhắc nhở đến thiết bị`);
      } else {
        dispatchNotification('🔔 Khang Baby LIVE', 'Hệ thống thông báo và chuông báo đang hoạt động tốt!', 1);
        toast('Đã phát thông báo thử nghiệm đến thiết bị');
      }
    }

    window.syncNativeNotifications = syncNativeNotifications;
    window.dispatchNotification = dispatchNotification;
    window.testPushNotification = testPushNotification;

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
        refreshSellerOrderView();

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
  
