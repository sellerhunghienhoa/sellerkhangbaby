/**
 * TikTok Shop Live GMV & KPI Center - Modals, Dialogs, Drawer & Shift Workflows
 */

    /* ---------- 5. Điều hướng, drawer, dropdown, modal ---------- */
    const TITLES = {
      TAB_OVERVIEW: ['Tổng quan GMV & KPI', 'GMV, KPI và tiến độ'],
      TAB_SESSIONS: ['Đối soát phiên LIVE', 'GMV, đơn hàng và phân công'],
      TAB_SHOP_ORDERS: ['Đơn Shop tự ra (Ngoài Live)', 'Doanh số ngoài LIVE'],
      TAB_RETURNS_15D: ['Đơn hoàn 15 ngày', 'Hoàn trả và khấu trừ'],
      TAB_ORDERS: ['Đối soát cấp đơn', 'Vận chuyển · hủy · hoàn từng đơn'],
      TAB_STAFF_KPI: ['KPI nhân sự (Hoa hồng)', 'GMV, giờ LIVE và thu nhập theo tháng'],
      TAB_MANUAL_KPI: ['KPI thủ công', 'Ngày Campaign / Mega Live'],
      TAB_EXPORT: ['Xuất file', 'Excel / CSV theo khoảng lọc'],
      TAB_GUIDE: ['Hướng dẫn sử dụng', 'Công dụng · cách tính · quy trình vận hành'],
      TAB_TIKTOK_API: ['TikTok / API', 'Creator Authorization · đồng bộ 24/24'],
      TAB_STORAGE: ['Lưu trữ & dung lượng', 'GitHub · Firebase · Cloudflare (bản Free)'],
      TAB_ACCOUNTS: ['Quản lý tài khoản', 'Duyệt user & chọn vai trò']
    };
    let toolbarAutoCollapsed = false;
    let toolbarScrollAnchor = 0;

    function resetToolbarAutoCollapse() {
      toolbarAutoCollapsed = false;
      toolbarScrollAnchor = 0;
      syncPresetUI();
    }

    function syncToolbarOnScroll() {
      const view = document.getElementById('view');
      if (!view || !isMobile() || state.tbCollapsed) return;
      const top = Math.max(0, view.scrollTop);
      let next = toolbarAutoCollapsed;

      if (top <= 8) {
        next = false;
        toolbarScrollAnchor = top;
      } else if (top - toolbarScrollAnchor >= 24) {
        next = true;
        toolbarScrollAnchor = top;
      } else if (toolbarScrollAnchor - top >= 24) {
        next = false;
        toolbarScrollAnchor = top;
      }

      if (next !== toolbarAutoCollapsed) {
        toolbarAutoCollapsed = next;
        syncPresetUI();
      }
    }

    function switchTab(id) {
      if (!canAccessTab(id)) {
        toast('🔒 Tài khoản này không có quyền mở mục quản trị.');
        id = 'TAB_OVERVIEW';
      }
      currentTab = id;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === id));
      document.querySelectorAll('.nav-btn, .dock-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === id);
        if (b.dataset.tab === id) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });
      document.getElementById('hdrTitle').textContent = TITLES[id][0];
      document.getElementById('hdrSub').textContent = TITLES[id][1];
      const hideFilter = ['TAB_TIKTOK_API', 'TAB_STORAGE', 'TAB_ACCOUNTS', 'TAB_MANUAL_KPI', 'TAB_GUIDE'].includes(id);
      document.getElementById('toolbar').classList.toggle('hidden', hideFilter || !me() || me().status !== 'APPROVED');
      closeDrawer(); closeDropdowns();
      document.getElementById('view').scrollTop = 0;
      resetToolbarAutoCollapse();
      triggerDataCounters(document.getElementById(id));
      if (id === 'TAB_STORAGE' && !storageUsageStatus) void checkQuotaNow(false);
    }
    function openGuide(sectionId) {
      switchTab('TAB_GUIDE');
      requestAnimationFrame(() => {
        const section = document.getElementById(sectionId);
        if (!section) return;
        section.open = true;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        section.focus({ preventScroll: true });
      });
    }
    function isMobile() { return window.matchMedia('(max-width: 860px)').matches; }
    function toggleSidebar() { if (isMobile()) openDrawer(); else document.body.classList.toggle('sb-collapsed'); }
    function openDrawer() {
      if (!isMobile()) return;
      closeDropdowns();
      const sidebar = document.getElementById('sidebar');
      sidebar.inert = false;
      sidebar.classList.add('open');
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      document.getElementById('scrim').classList.add('show');
      document.querySelector('.main').inert = true;
      document.querySelector('.dock').inert = true;
      document.getElementById('btnMenu').setAttribute('aria-expanded', 'true');
      sidebar.querySelector('.sidebar-close').focus();
    }
    function closeDrawer() {
      const sidebar = document.getElementById('sidebar');
      const wasOpen = sidebar.classList.contains('open');
      sidebar.classList.remove('open');
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      document.getElementById('scrim').classList.remove('show');
      document.querySelector('.main').inert = false;
      document.querySelector('.dock').inert = false;
      document.getElementById('btnMenu').setAttribute('aria-expanded', 'false');
      if (wasOpen) document.getElementById('btnMenu').focus();
      sidebar.inert = isMobile();
    }
    window.matchMedia('(max-width: 860px)').addEventListener('change', closeDrawer);
    closeDrawer();
    document.getElementById('view')?.addEventListener('scroll', syncToolbarOnScroll, { passive: true });
    function toggleDropdown(id) { const el = document.getElementById(id); const willShow = !el.classList.contains('show'); closeDropdowns(); if (willShow) el.classList.add('show'); }
    function closeDropdowns() { document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show')); }
    function openModal(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('closing');
      el.classList.add('show');
      triggerDataCounters(el);
    }
    function closeModal(id) {
      const el = document.getElementById(id);
      if (!el || !el.classList.contains('show') || el.classList.contains('closing')) return;
      el.classList.add('closing');
      setTimeout(() => {
        if (el.classList.contains('closing')) {
          el.classList.remove('show');
          el.classList.remove('closing');
        }
      }, 200);
    }
    document.addEventListener('click', e => { if (!e.target.closest('.hdr')) closeDropdowns(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (typeof closeUserRoleModal === 'function') closeUserRoleModal();
        document.querySelectorAll('.modal.show').forEach(m => closeModal(m.id));
        closeDropdowns();
        closeDrawer();
      }
    });

    function onGlobalSearch(q) {
      const map = { TAB_SHOP_ORDERS: 'shopOrdSearch', TAB_RETURNS_15D: 'retSearch', TAB_ORDERS: 'ordSearch', TAB_ACCOUNTS: 'accSearch', TAB_STAFF_KPI: 'stfSearch' };
      if (!map[currentTab] && currentTab !== 'TAB_SESSIONS') switchTab('TAB_SESSIONS');
      const inputId = map[currentTab] || 'sesSearch';
      const el = document.getElementById(inputId);
      if (el) el.value = q;
      pages.ses = pages.ord = pages.shopOrd = pages.ret = pages.acc = pages.stf = pages.dis = 1;
      renderSessions(); renderShopOrders(); renderOrders(); renderReturns15d(); renderStaffKpi(); if (isAdmin()) renderAccounts();
    }
    function focusTabSearch() {
      const map = { TAB_SHOP_ORDERS: 'shopOrdSearch', TAB_RETURNS_15D: 'retSearch', TAB_ORDERS: 'ordSearch', TAB_ACCOUNTS: 'accSearch', TAB_STAFF_KPI: 'stfSearch' };
      if (!map[currentTab] && currentTab !== 'TAB_SESSIONS') switchTab('TAB_SESSIONS');
      const el = document.getElementById(map[currentTab] || 'sesSearch');
      if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }

    /* ---------- 6. Bộ lọc: Hôm nay / 7 ngày / 30 Ngày / Chọn ngày ---------- */
    function setPreset(p) {
      state.preset = p;
      if (p === 'TODAY') { state.from = TODAY; state.to = TODAY; }
      if (p === '7D') { state.from = addDays(TODAY, -6); state.to = TODAY; }
      if (p === '30D') { state.from = addDays(TODAY, -29); state.to = TODAY; }
      saveState(); resetPagesAndRender();
    }
    function toggleMobFilter() {
      const tb = document.getElementById('toolbar');
      tb.classList.toggle('mob-open');
      syncPresetUI();
    }
    function setToolbarCollapsed(collapsed) {
      toolbarAutoCollapsed = false;
      state.tbCollapsed = !!collapsed;
      saveState();
      syncPresetUI();
      toast(collapsed ? 'Đã ẩn bộ lọc xuống · Nhấn "Sửa" để mở lại' : 'Đã mở thanh thao tác bộ lọc');
    }
    function syncPresetUI() {
      const isMonthTab = currentTab === 'TAB_STAFF_KPI';
      const tbDateSeg = document.getElementById('tbDateSeg');
      const rangeChip = document.getElementById('rangeChip');
      const tbMonthBadge = document.getElementById('tbMonthBadge');

      if (tbDateSeg) tbDateSeg.style.display = isMonthTab ? 'none' : '';
      if (rangeChip) rangeChip.style.display = isMonthTab ? 'none' : '';
      if (tbMonthBadge) tbMonthBadge.style.display = isMonthTab ? 'inline-flex' : 'none';

      document.querySelectorAll('.seg [data-preset]').forEach(b => {
        const selected = b.dataset.preset === state.preset;
        b.classList.toggle('active', selected);
        b.setAttribute('aria-pressed', String(selected));
      });
      const days = diffDays(state.from, state.to) + 1;
      const chipEl = document.getElementById('rangeChipText');
      if (chipEl) chipEl.textContent = `${fmtDs(state.from)} → ${fmtDs(state.to)} · ${days} ngày`;
      const ch = document.getElementById('fChannel')?.value || 'ALL';
      const st = document.getElementById('fStaff')?.value || 'ALL';
      const cnt = (ch !== 'ALL' ? 1 : 0) + (st !== 'ALL' ? 1 : 0);
      const btn = document.getElementById('mobFilterBtn');
      const txt = document.getElementById('mobFilterText');
      if (btn && txt) {
        const open = document.getElementById('toolbar')?.classList.contains('mob-open');
        btn.classList.toggle('active', cnt > 0 || open);
        txt.textContent = `${cnt ? `Lọc (${cnt})` : 'Lọc'} ${open ? '▴' : '▾'}`;
      }

      const tb = document.getElementById('toolbar');
      if (tb) {
        tb.classList.toggle('is-collapsed', !!state.tbCollapsed || toolbarAutoCollapsed);
        tb.classList.toggle('custom-range', !isMonthTab && state.preset === 'CUSTOM');
      }

      const tbSumDate = document.getElementById('tbSumDate');
      if (tbSumDate) {
        if (isMonthTab) {
          tbSumDate.textContent = 'Cả tháng 10/2026 (01/10 → 31/10)';
        } else {
          const pLabels = { TODAY: 'Hôm nay', '7D': '7 Ngày', '30D': '30 Ngày', CUSTOM: 'Tùy chọn' };
          const pTxt = pLabels[state.preset] || 'Bộ lọc';
          tbSumDate.textContent = `${pTxt} (${fmtDs(state.from)} → ${fmtDs(state.to)})`;
        }
      }
      const tbSumChannel = document.getElementById('tbSumChannel');
      if (tbSumChannel) {
        const chEl = document.getElementById('fChannel');
        tbSumChannel.textContent = chEl && chEl.selectedIndex >= 0 ? chEl.options[chEl.selectedIndex].text : 'Tất cả kênh';
      }
      const tbSumStaff = document.getElementById('tbSumStaff');
      if (tbSumStaff) {
        const stEl = document.getElementById('fStaff');
        tbSumStaff.textContent = stEl && stEl.selectedIndex >= 0 ? stEl.options[stEl.selectedIndex].text : 'Tất cả nhân sự';
      }
    }
    function resetPagesAndRender() { pages.ses = pages.ord = pages.shopOrd = pages.ret = pages.stf = pages.dis = 1; renderAll(); refreshSellerOrderView(); }
    function populateStaffFilter() {
      const sel = document.getElementById('fStaff');
      if (!sel) return;
      const prev = sel.value || 'ALL';
      const admin = isAdmin();
      const currentU = me();

      if (!admin && currentU) {
        // Tài khoản thường: Khóa cứng bộ lọc theo chính bản thân, không xem được người khác
        sel.innerHTML = `<option value="${currentU.id}">${esc(currentU.name)} · ${currentU.role === 'HOST' ? 'Host' : 'Operator'}</option>`;
        sel.value = currentU.id;
        sel.disabled = true;
        sel.style.opacity = '0.9';
        sel.style.cursor = 'not-allowed';
        sel.title = 'Chế độ người dùng: Đang xem số liệu cá nhân của chính bạn (Chỉ Admin mới có quyền xem toàn bộ nhân sự)';
      } else {
        // Admin: Hiển thị đầy đủ tất cả nhân sự và có quyền lọc tùy ý
        sel.disabled = false;
        sel.style.opacity = '1';
        sel.style.cursor = '';
        sel.title = 'Lọc nhân sự livestream';
        const staff = state.users.filter(u => u.status === 'APPROVED' && (u.role === 'HOST' || u.role === 'OPERATOR'));
        sel.innerHTML = '<option value="ALL">Tất cả nhân sự</option>' + staff.map(u => `<option value="${u.id}">${esc(u.name)} · ${u.role === 'HOST' ? 'Host' : 'Operator'}</option>`).join('');
        sel.value = staff.some(u => u.id === prev) ? prev : 'ALL';
      }
    }


    /* ---------- 10.1 Quản lý Ca LIVE (Đổi ca trong phiên) & Admin Phê duyệt phiếu ca ---------- */
    function openShiftModal(sessionId) {
      const s = computeAll().find(x => x.id === sessionId);
      if (!s) return;
      const admin = isAdmin();
      const meUser = me();

      if (!admin) {
        const myId = meUser?.id;
        const myRole = meUser?.role;
        const shiftsList = s.shifts || [];
        const isMySession = s.hostId === myId || s.operatorId === myId ||
          (shiftsList.some(sh => sh.userId === myId || sh.hostId === myId || sh.operatorId === myId)) ||
          (s.manualStaff && s.manualStaff.some(ms => ms.userId === myId || ms.hostId === myId || ms.operatorId === myId));
        const canAssignSelf = (myRole === 'HOST' && !s.hostId) || (myRole === 'OPERATOR' && !s.operatorId);
        if (!isMySession && !canAssignSelf) {
          toast('🔒 Quyền riêng tư: Bạn chỉ có thể xem hoặc thao tác trên ca live của chính mình!');
          return;
        }
      }

      const maxCap = getSessionMaxGmvCap(s);
      const shifts = s.shifts || [];
      const sumShiftGmv = shifts.reduce((a, b) => a + (Number(b.shiftGmv) || 0), 0);
      const totSesGross = s.grossLiveGmv + s.affiliateGmv;
      const pctFilled = maxCap.cap ? Math.min(100, Math.round((sumShiftGmv / maxCap.cap) * 100)) : (totSesGross ? Math.min(100, Math.round((sumShiftGmv / totSesGross) * 100)) : 0);
      const totApprovedComm = shifts.filter(sh => sh.isApproved).reduce((a, b) => a + ((b.hostComm || 0) + (b.opComm || 0) || (b.comm || 0)), 0);
      const totPendingComm = shifts.filter(sh => !sh.isApproved).reduce((a, b) => a + ((b.hostComm || 0) + (b.opComm || 0) || (b.comm || 0)), 0);
      const isApproved = s.shiftReportStatus === 'APPROVED';
      const isPending = s.shiftReportStatus === 'PENDING';
      const detectedCa = detectSessionCaLive(s);
      const schedStart = parseSlotStartTime(detectedCa.slot);
      const actualLiveStart = s.actualLiveStart || (schedStart === '06:30' ? '06:45' : schedStart);

      // Tự động nhận diện doanh số ca: Mặc định lấy theo hạn mức còn lại của phiên LIVE (GMV + Aff hoặc GMV đã đối soát)
      const remainingGmv = Math.max(0, maxCap.cap - sumShiftGmv);
      const defaultShiftGmv = remainingGmv > 0 ? remainingGmv : maxCap.cap;

      const eligibleStaff = state.users.filter(u => u.status === 'APPROVED' && (u.role === 'HOST' || u.role === 'OPERATOR'));
      const hostsList = state.users.filter(u => u.status === 'APPROVED' && u.role === 'HOST');
      const opsList = state.users.filter(u => u.status === 'APPROVED' && u.role === 'OPERATOR');
      const dowName = getDayOfWeekName(s.date);
      const dayScheduleShifts = MASTER_SCHEDULE_SHIFTS.filter(x => x.day === dowName);
      const channelShifts = dayScheduleShifts.filter(x => x.channelKey === s.channel);
      const otherDayShifts = dayScheduleShifts.filter(x => x.channelKey !== s.channel);

      // Status Badge
      const activeTimer = window._shiftApprovalTimers?.[s.id];
      let statusBadge = '';
      if (isApproved) {
        statusBadge = `<span class="pill p-green" style="height:26px;font-size:11.5px;padding:0 10px;font-weight:700;"><i data-ic="check" data-s="12"></i>Đã duyệt phiếu ca</span>`;
      } else if (isPending) {
        statusBadge = `<span class="pill p-amber" id="shiftAutoApproveBadge_${s.id}" style="height:26px;font-size:11.5px;padding:0 10px;font-weight:700;animation:pulseTimer 1.2s infinite;"><i data-ic="clock" data-s="12"></i> ⏱️ Chờ duyệt</span>`;
      } else {
        statusBadge = `<span class="pill p-gray" style="height:26px;font-size:11.5px;padding:0 10px;font-weight:700;">Chưa gửi duyệt</span>`;
      }

      document.getElementById('shiftReportCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line2);margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="card-ic" style="background:var(--pink-soft);color:var(--pink2);">${ic('users', 22)}</div>
            <div>
              <div style="font-size:16px;font-weight:800;">Phiếu phân ca &amp; Duyệt KPI đổi ca LIVE</div>
              <div class="muted">${s.channel} · ${fmtD(s.date)} (${s.slot}) · ${formatLiveMinutes(sessionDurationMinutes(s))}</div>
            </div>
          </div>
          ${statusBadge}
        </div>

        <!-- Bento Stats -->
        <div class="shift-stat-grid">
          <div class="shift-stat">
            <div class="lbl">Tổng GMV phiên (LIVE+Aff)</div>
            <div class="val num">${vnd(totSesGross)}</div>
          </div>
          <div class="shift-stat">
            <div class="lbl">Doanh số ca đã điền</div>
            <div class="val num" style="color:var(--pink-ink);">${vnd(sumShiftGmv)} <span style="font-size:11px;color:var(--muted);font-weight:600;">(${pctFilled}%)</span></div>
          </div>
          <div class="shift-stat">
            <div class="lbl">GMV đã đối soát phiên</div>
            <div class="val num" style="color:var(--pink2);">${vnd(s.kpiGmv)}</div>
          </div>
          <div class="shift-stat">
            <div class="lbl">Hoa hồng ca (Host 0,3% · Op 0,1%)</div>
            <div class="val num" style="color:var(--green);">${vnd(totApprovedComm)}${totPendingComm > 0 ? ` <span style="font-size:10.5px;color:var(--amber);font-weight:700;">(+${vnd(totPendingComm)} chờ)</span>` : ''}</div>
          </div>
        </div>

        <!-- Banner Tự Động Phê Duyệt 5s (Nếu đang chờ duyệt) hoặc Thông báo đã duyệt -->
        ${isPending ? `
          <div id="shiftAutoApproveBanner_${s.id}" style="background:linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);border:1.5px solid #F59E0B;border-radius:12px;padding:12px 14px;margin-bottom:14px;box-shadow:0 3px 10px rgba(245,158,11,0.15);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:24px;line-height:1;display:inline-block;animation:spinTimer 3s linear infinite;">⏳</span>
                <div>
                  <div style="font-weight:900;font-size:13px;color:#78350F;letter-spacing:-0.2px;">ĐANG KÍCH HOẠT TỰ ĐỘNG PHÊ DUYỆT</div>
                  <div style="font-size:11.5px;color:#92400E;margin-top:2px;">
                    Phiếu ca đang trong tiến trình hệ thống tự động phê duyệt chốt KPI...
                  </div>
                </div>
              </div>
            </div>
            <!-- Thanh tiến trình 5s -->
            <div style="width:100%;height:6px;background:rgba(217,119,6,0.18);border-radius:99px;overflow:hidden;">
              <div id="shiftAutoProgress_${s.id}" style="height:100%;background:linear-gradient(90deg, #F59E0B, #D97706);width:${activeTimer ? Math.max(0, Math.min(100, ((5 - activeTimer.remaining) / 5) * 100)) : 0}%;transition:width 1s linear;border-radius:99px;"></div>
            </div>
          </div>
        ` : (isApproved ? `
          <div style="background:linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);border:1px solid #10B981;border-radius:12px;padding:9px 13px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:#065F46;font-weight:700;">
              <i data-ic="check" data-s="15" style="color:#059669;"></i>
              <span>Phiếu ca đã được phê duyệt thành công! KPI hoa hồng của Host (0,3%) &amp; Vận hành (0,1%) đã được chốt chính thức.</span>
            </div>
            <span class="pill p-green num" style="height:22px;font-size:10px;font-weight:800;">ĐÃ CHỐT KPI</span>
          </div>
        ` : '')}

        <!-- Policy Note -->
        <div style="background:#FFF9FC;border:1px solid #FAD3E5;border-radius:12px;padding:8px 12px;margin-bottom:14px;font-size:11.5px;color:var(--text);display:flex;align-items:center;gap:8px;">
          <i data-ic="zap" data-s="15" style="color:var(--pink2);"></i>
          <span><strong>Cơ chế tự động:</strong> Doanh số mỗi ca sau khi điền sẽ được tự động đối soát theo tỉ lệ nhận hàng của phiên. Nhân sự live điền doanh số ca → Admin kiểm tra và duyệt lại phiếu để chốt KPI chính thức.</span>
        </div>

        <!-- Danh sách các ca -->
        <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:13px;">Danh sách nhân sự các ca trong phiên (${shifts.length} ca)</strong>
          <span class="muted" style="font-size:11px;">Mỗi ca gồm Host (0,3%) + Vận hành (0,1%)</span>
        </div>

        <div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
          ${shifts.length ? shifts.map((sh, idx) => {
            const hostUser = userById(sh.hostId || (sh.role === 'HOST' ? sh.userId : ''));
            const opUser = userById(sh.operatorId || (sh.role === 'OPERATOR' ? sh.userId : ''));
            const isAppr = sh.isApproved;
            const punc = checkShiftPunctuality(sh.timeSlot, sh.actualStart);
            const hostComm = sh.hostComm !== undefined ? sh.hostComm : (sh.role === 'HOST' ? sh.comm : 0);
            const opComm = sh.opComm !== undefined ? sh.opComm : (sh.role === 'OPERATOR' ? sh.comm : 0);

            return `
              <div class="shift-row-card" style="background:#fff;border:1.5px solid var(--line2);border-radius:14px;padding:12px;box-shadow:0 1px 4px rgba(0,0,0,0.03);">
                <!-- Hàng 1: Tiêu đề Ca, Khung giờ, Giờ vào & Nút duyệt/sửa/xóa -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span class="pill p-pink" style="font-weight:800;font-size:11px;height:24px;padding:0 9px;">Ca ${idx + 1}</span>
                    <span class="pill p-gray num" style="height:24px;font-size:11px;font-weight:700;">${esc(sh.timeSlot)}</span>
                    <span class="pill ${punc.pillClass} num" style="height:24px;font-size:10.5px;padding:0 8px;font-weight:700;" title="Lịch ca: ${punc.scheduledTime} · Vào lúc: ${punc.actualTime}">
                      <i data-ic="${punc.icon}" data-s="11"></i> ${punc.label} (vào ${punc.actualTime})
                    </span>
                    ${!sh.operatorId ? '<span class="pill p-amber" style="height:24px;font-size:10px;font-weight:700;">Host tự vận hành (0đ Op)</span>' : ''}
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    ${isAppr ? '<span class="pill p-green" style="height:24px;font-size:11px;font-weight:700;"><i data-ic="check" data-s="11"></i>Đã duyệt</span>' : `<span class="pill p-amber" style="height:24px;font-size:11px;font-weight:700;"><i data-ic="clock" data-s="11"></i> Chờ duyệt</span>`}
                    ${admin ? `
                      <button type="button" class="btn btn-ghost sm" style="height:24px;padding:0 8px;font-size:10.5px;font-weight:700;color:var(--pink-ink);" onclick="fillShiftToForm('${s.id}', '${sh.id}')" title="Admin sửa ca & đối soát trừ hoàn 15 ngày">✏️ Sửa ca / Đối soát 15 ngày</button>
                      <button type="button" class="icon-btn" style="width:26px;height:26px;color:var(--red);" onclick="deleteShiftFromSession('${s.id}', '${sh.id}')" title="Xóa ca này">${ic('x', 14)}</button>
                    ` : (meUser && (meUser.id === sh.hostId || meUser.id === sh.operatorId || !sh.hostId || !sh.operatorId) ? `
                      <button type="button" class="btn btn-ghost sm" style="height:24px;padding:0 8px;font-size:10.5px;font-weight:700;color:var(--pink-ink);" onclick="fillShiftToForm('${s.id}', '${sh.id}')" title="Chọn lại Host hoặc Vận hành phụ trách ca">🔄 Đổi ca / Phân công lại</button>
                    ` : '')}
                  </div>
                </div>

                <!-- Hàng 2: Doanh số ca live & ĐS đối soát thực -->
                <div style="background:#FFF9FC;border:1px solid #FBCFE8;border-radius:10px;padding:8px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="muted" style="font-size:11px;">Doanh số ca live:</span>
                    <strong class="num" style="font-size:14.5px;color:var(--text);">${vnd(sh.shiftGmv)}</strong>
                    ${sh.hasPostReturn15d ? `
                      <span class="pill p-red num" style="height:22px;font-size:10px;padding:0 7px;font-weight:800;" title="Đã đối soát trừ đơn hoàn 15 ngày của TikTok">
                        📦 GMV sau hoàn 15 ngày: ${vnd(sh.postReturn15dGmv)}
                      </span>
                      <span class="muted" style="font-size:10.5px;color:var(--red);font-weight:700;">
                        (Tự trừ: -${vnd(Math.max(0, sh.shiftGmv - sh.postReturn15dGmv))})
                      </span>
                    ` : `
                      <span class="pill p-green" style="height:20px;font-size:9.5px;padding:0 6px;font-weight:800;"><i data-ic="check" data-s="10"></i>Đồng bộ theo Live</span>
                    `}
                  </div>
                  <div style="font-size:12px;">
                    ĐS đối soát tính KPI: <strong class="num" style="color:var(--violet-ink);font-weight:800;">${vnd(sh.recGmv)}</strong>
                  </div>
                </div>

                <!-- Hàng 3: Cặp nhân sự phụ trách ca (Làm theo cặp: Host 0,3% + Vận hành 0,1%) -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px;">
                  <!-- Ô Host -->
                  <div style="background:#fff;border:1.5px solid #FBCFE8;border-radius:10px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span style="font-size:17px;">🎙️</span>
                      <div>
                        <div style="font-weight:800;font-size:12.5px;color:var(--pink-ink);">${hostUser ? esc(hostUser.name) : 'Chưa gán Host'}</div>
                        <div class="muted" style="font-size:10px;">Host live (0,3%)</div>
                      </div>
                    </div>
                    <div class="r">
                      <strong class="num" style="font-size:13.5px;color:var(--pink2);">${admin || meUser?.role === 'HOST' ? vnd(hostComm) : '***'}</strong>
                    </div>
                  </div>

                  <!-- Ô Vận hành -->
                  <div style="background:#fff;border:1.5px solid #DDD6FE;border-radius:10px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span style="font-size:17px;">⚙️</span>
                      <div>
                        <div style="font-weight:800;font-size:12.5px;color:var(--violet-ink);">${opUser ? esc(opUser.name) : '<span class=\"muted\" style=\"font-weight:600;\">Host tự vận hành</span>'}</div>
                        <div class="muted" style="font-size:10px;">Vận hành (0,1%)</div>
                      </div>
                    </div>
                    <div class="r">
                      <strong class="num" style="font-size:13.5px;color:var(--violet);">${admin || meUser?.role === 'OPERATOR' ? (sh.operatorId ? vnd(opComm) : '0\u00A0đ') : '***'}</strong>
                    </div>
                  </div>
                </div>

                ${sh.note ? `<div class="muted" style="font-size:11px;font-style:italic;margin-top:6px;">"${esc(sh.note)}"</div>` : ''}
              </div>`;
          }).join('') : `
            <div style="text-align:center;padding:24px 12px;background:#FCF8FA;border:1px dashed var(--line);border-radius:14px;color:var(--muted);font-size:12px;">
              Phiên này chưa có ca live riêng lẻ. Hãy điền ca của Host &amp; Vận hành ở khung bên dưới.
            </div>`}
        </div>

        <!-- Form Thêm Ca Mới (Chỉ áp dụng cho phiên KPI thủ công) -->
        ${s.isManualKpi ? `
        <div class="shift-add-box">
          <div style="font-size:12.5px;font-weight:800;color:var(--pink-ink);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <i data-ic="edit" data-s="14"></i><span>Thêm nhân sự ca live &amp; doanh số (KPI thủ công)</span>
          </div>

          <!-- Section: Khung giờ ca live - TỰ ĐỘNG NHẬN DIỆN 100% TỪ PHIÊN LIVESTREAM (Không cần chọn tay) -->
          <div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:14px;padding:12px 14px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:18px;">⚡</span>
                <span style="font-size:12.5px;color:#166534;font-weight:800;">Khung giờ ca live:</span>
                <span class="pill p-green" style="height:22px;font-size:10px;font-weight:800;">
                  <i data-ic="check" data-s="11"></i>Tự động nhận diện (Không cần chọn tay)
                </span>
              </div>
              ${admin ? `
                <button type="button" class="btn btn-ghost sm" style="height:24px;padding:0 8px;font-size:10.5px;font-weight:700;color:var(--pink-ink);border:1px dashed var(--pink);" onclick="toggleAdminShiftOverride()">
                  ✏️ Lùi lịch / Đổi ca (Chỉ Admin)
                </button>
              ` : ''}
            </div>

            <!-- Khung hiển thị Ca live tự động nhận diện -->
            <div style="background:#fff;border:1.5px solid #86EFAC;border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:36px;height:36px;border-radius:50%;background:#DCFCE7;display:flex;align-items:center;justify-content:center;font-size:17px;color:#15803D;font-weight:900;">
                  ${detectedCa.index}
                </div>
                <div>
                  <div id="lblDetectedCaName" style="font-size:13.5px;font-weight:900;color:#15803D;letter-spacing:-0.2px;">
                    ${detectedCa.name}
                  </div>
                  <div class="muted" style="font-size:11px;margin-top:2px;">
                    Quy chuẩn: <strong>${detectedCa.hours} giờ làm việc</strong> · Tự động đọc từ luồng Live &amp; phiên của Shop
                  </div>
                </div>
              </div>
              <span id="badgeDetectedSlot" class="pill p-green num" style="height:26px;font-size:11.5px;font-weight:800;padding:0 10px;">
                <i data-ic="check-circle" data-s="13"></i> Khung giờ chuẩn: ${detectedCa.slot}
              </span>
            </div>

            <!-- Input ẩn lưu khung giờ tự nhận diện -->
            <input type="hidden" id="inpShiftSlot" value="${detectedCa.slot}" />
            <select id="selShiftPreset" style="display:none;">
              ${STANDARD_SLOTS.map(st => `<option value="SLOT:${st.slot}" ${detectedCa.slot === st.slot ? 'selected' : ''}>${st.slot}</option>`).join('')}
            </select>

            ${admin ? `
              <!-- Khung can thiệp dành riêng cho Admin nếu muốn chỉnh thủ công hoặc lùi lịch -->
              <div id="boxAdminShiftOverride" style="display:none;margin-top:10px;background:#FFFBEB;border:1px dashed #F59E0B;border-radius:10px;padding:10px 12px;">
                <div style="font-size:11px;font-weight:800;color:#92400E;margin-bottom:6px;">🛠️ Can thiệp khung giờ ca live (Chỉ Admin):</div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <select class="sel sm" style="font-weight:800;height:32px;font-size:11.5px;flex:1 1 200px;" onchange="applyQuickSlot(this.value)">
                    <option value="">-- Chọn ca khác nếu cần --</option>
                    ${STANDARD_SLOTS.map((st, idx) => `
                      <option value="${st.slot}" ${detectedCa.slot === st.slot ? 'selected' : ''}>Ca ${idx + 1}: ${st.slot} (${st.label})</option>
                    `).join('')}
                  </select>
                  <input type="text" class="inp sm" id="inpAdminCustomSlot" placeholder="Hoặc tự gõ lùi lịch: 14:30 - 22:30" value="${detectedCa.slot}" style="flex:1 1 180px;height:32px;font-weight:800;font-size:11.5px;" oninput="document.getElementById('inpShiftSlot').value = this.value; updateShiftPuncPreview();" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Giờ vào live thực tế: TỰ ĐỘNG NHẬN DIỆN 100% TỪ GIỜ PHÁT LIVESTREAM - KHÔNG CẦN ẤN TAY -->
          <div style="background:#FFF9FC;border:1.5px solid #FBCFE8;border-radius:12px;padding:12px 14px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:18px;">🕒</span>
                <span style="font-size:12px;color:var(--pink-ink);font-weight:800;">Giờ vào live thực tế:</span>
                <span class="pill p-green" style="height:20px;font-size:10px;font-weight:800;"><i data-ic="check" data-s="11"></i>Tự động nhận diện từ Live (Không cần ấn tay)</span>
              </div>
              <div id="shiftPuncPreview" class="pill p-green num" style="height:26px;font-size:11.5px;font-weight:800;padding:0 10px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <i data-ic="check" data-s="12"></i> Đang so khớp tự động...
              </div>
            </div>

            <!-- Khung đối chiếu so khớp tự động giữa Giờ lịch ca đăng ký & Giờ phát livestream thực tế -->
            <div style="background:#fff;border:1.5px solid #FDE2EE;border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
              <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:6px 12px;">
                  <span class="muted" style="font-size:10.5px;font-weight:700;display:block;">📅 LỊCH CA ĐĂNG KÝ</span>
                  <strong class="num" id="lblSchedStartTime" style="color:var(--text);font-size:16px;">${schedStart}</strong>
                </div>
                <div style="color:var(--pink2);font-size:18px;font-weight:900;">➔</div>
                <div style="background:#FFF1F2;border:1.5px solid #FECDD3;border-radius:8px;padding:6px 12px;">
                  <span class="muted" style="font-size:10.5px;font-weight:800;color:#BE123C;display:block;">🔴 GIỜ PHÁT LIVE THỰC TẾ (TỰ NHẬN DIỆN)</span>
                  <strong class="num" id="lblActualLiveTime" style="color:#9F1239;font-size:18px;font-weight:900;">${actualLiveStart}</strong>
                </div>
              </div>

              <!-- Input ẩn lưu giá trị giờ phát live tự nhận diện, không cần bấm tay -->
              <input type="hidden" id="inpShiftActualStart" value="${actualLiveStart}" />

              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span id="shiftDiffBadge" class="pill p-sky num" style="height:26px;font-size:11px;font-weight:800;">
                  Đang so khớp...
                </span>
                ${admin ? `
                  <button type="button" class="btn btn-ghost sm" style="height:26px;padding:0 8px;font-size:10.5px;color:var(--pink-ink);border:1px dashed var(--pink);font-weight:700;" onclick="toggleManualActualTime(this)" title="Chỉ Admin có quyền can thiệp sửa giờ ngoại lệ">
                    ✏️ Sửa giờ (Admin)
                  </button>
                ` : ''}
              </div>
            </div>

            ${admin ? `
              <!-- Box sửa giờ thủ công (chỉ dành riêng cho Admin) -->
              <div id="boxManualActualTime" style="display:none;background:#FFF;border:1px dashed var(--pink);border-radius:8px;padding:8px 12px;margin-top:8px;">
                <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;">
                  <span class="muted" style="font-weight:700;">🛡️ Can thiệp sửa giờ vào ca:</span>
                  <input type="time" class="inp sm num" id="inpManualActualStart" value="${actualLiveStart}" style="width:110px;height:30px;font-weight:800;font-size:13px;" oninput="syncManualActualStart(this)" />
                  <span class="muted" style="font-size:10.5px;">(Chỉ Admin có quyền can thiệp ghi đè giờ)</span>
                </div>
              </div>
            ` : ''}

            <div style="margin-top:8px;font-size:11px;color:var(--muted);line-height:1.45;">
              ⚡ <strong>Cơ chế tự nhận diện 100%:</strong> Giờ phát live được đọc trực tiếp từ phiên livestream (<strong>${actualLiveStart}</strong>) và đối chiếu với giờ bắt đầu ca đăng ký (<strong>${schedStart}</strong>). Du di ≤5 phút tự động tính <strong>Đúng giờ</strong> (vào sớm ≥5p cộng +2đ). Quá 5 phút tự động tính <strong>Muộn giờ</strong> và trừ điểm kỷ luật. Hoàn toàn không cần thao tác ấn tay.
            </div>
          </div>

          <!-- Phân công cặp nhân sự: Cột 1 là Host (0,3%) & Cột 2 là Vận hành (0,1%) thay thế cột vai trò cũ -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:8px;margin-bottom:6px;">
            <!-- Cột 1: Host live (0,3%) -->
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                <label style="font-size:11px;color:var(--text);font-weight:800;">🎙️ Host live (0,3%) *</label>
                <span class="pill p-pink" style="font-size:9px;height:16px;padding:0 5px;font-weight:700;">0,3% KPI</span>
              </div>
              <select class="sel sm" id="inpShiftHost" style="width:100%;font-weight:800;height:34px;border-color:var(--pink);border-radius:8px;">
                <option value="">-- Chọn Host livestream (0,3%) --</option>
                ${hostsList.map(u => `<option value="${u.id}" ${s.hostId === u.id ? 'selected' : ''}>${esc(u.name)} (Host · 0,3%)</option>`).join('')}
              </select>
            </div>

            <!-- Cột 2: Vận hành (0,1%) - Thay thế hoàn toàn cột vai trò cũ -->
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                <label style="font-size:11px;color:var(--text);font-weight:800;">⚙️ Vận hành (0,1%)</label>
                <span class="pill p-violet" style="font-size:9px;height:16px;padding:0 5px;font-weight:700;">0,1% KPI</span>
              </div>
              <select class="sel sm" id="inpShiftOp" style="width:100%;font-weight:700;height:34px;border-radius:8px;">
                <option value="">-- Để trống: Host tự vận hành (0đ KPI Op) --</option>
                ${opsList.map(u => `<option value="${u.id}" ${s.operatorId === u.id ? 'selected' : ''}>${esc(u.name)} (Vận hành · 0,1%)</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Ghi chú quy chế Vận hành để trống -->
          <div style="font-size:10.5px;color:var(--muted);margin-bottom:8px;line-height:1.4;">
            💡 <em>Host mặc định 0,3% · Vận hành mặc định 0,1%. Nếu Vận hành nghỉ thì chọn <strong>"-- Để trống: Host tự vận hành --"</strong> (KPI Vận hành không tính 0đ, Host không cộng dồn vẫn giữ đúng 0,3%).</em>
          </div>

          <!-- Doanh số ca live (Khống chế không vượt quá GMV + Affiliate đã ghi nhận hoặc GMV đã đối soát) -->
          <div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;flex:1 1 240px;min-width:0;">
              <div style="width:34px;height:34px;border-radius:50%;background:#DCFCE7;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">💰</div>
              <div style="flex:1 1 auto;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span style="font-size:12px;font-weight:800;color:#166534;">Doanh số ca live (VNĐ) *</span>
                  <span class="pill p-green" style="height:19px;font-size:10px;padding:0 6px;font-weight:800;"><i data-ic="check" data-s="11"></i>Tối đa: ${vnd(maxCap.cap)}</span>
                </div>
                <div class="muted" style="font-size:10.5px;margin-top:2px;">
                  Khống chế tối đa không vượt quá ${maxCap.desc} · Tự tính KPI Host (0,3%) &amp; Vận hành (0,1%)
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <div style="position:relative;">
                <input type="text" inputmode="text" class="inp sm num" id="inpShiftGmv"
                  value="${(defaultShiftGmv).toLocaleString('vi-VN')}\u00A0₫"
                  style="width:160px;height:36px;font-weight:900;font-size:15px;color:#15803D;border:1.5px solid #86EFAC;border-radius:8px;background:#fff;"
                  oninput="handleVndInputEvent(this); validateShiftGmvInput(this, '${s.id}');"
                  onblur="handleVndBlurEvent(this); validateShiftGmvInput(this, '${s.id}');"
                  onfocus="handleVndFocusEvent(this)"
                  placeholder="Điền doanh số ca"
                />
              </div>
              ${admin ? `
                <button type="button" id="btnToggleCustomGmv" class="btn btn-ghost sm" style="height:28px;padding:0 9px;font-size:11px;font-weight:700;color:#991B1B;border:1px solid #FCA5A5;background:#FFF5F5;" onclick="toggleCustomShiftGmv(this, ${defaultShiftGmv}, '${s.id}')" title="Chỉ Admin mới có quyền sửa tiền & điền ô GMV sau hoàn 15 ngày">
                  ✏️ Sửa tiền &amp; Điền GMV hoàn 15 ngày
                </button>
              ` : ''}
            </div>
          </div>

          ${admin ? `
            <!-- Box Admin điền GMV sau khi hoàn 15 ngày (để tự động trừ KPI theo chính sách 15 ngày TikTok) -->
            <div id="boxCustomShiftGmv" style="display:none;background:#FFF9FC;border:1.5px solid #FBCFE8;border-radius:12px;padding:12px 14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(236,72,153,0.06);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:16px;">📦</span>
                  <label style="font-size:12.5px;font-weight:900;color:#991B1B;margin:0;">
                    GMV sau khi hoàn 15 ngày (VNĐ) *
                  </label>
                  <span class="pill p-pink" style="font-size:9.5px;height:18px;font-weight:800;">Chỉ Admin sửa</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <button type="button" class="btn btn-soft sm" style="height:24px;padding:0 8px;font-size:10.5px;font-weight:700;" onclick="autoFill15dReturnGmv('${s.id}')" title="Tự động lấy số liệu đối soát trừ đơn hoàn 15 ngày từ mục Hoàn hủy">
                    ⚡ Điền nhanh từ mục Hoàn hủy 15 ngày
                  </button>
                </div>
              </div>

              <!-- Input điền GMV sau khi hoàn 15 ngày -->
              <div style="position:relative;margin-bottom:8px;">
                <input type="text" inputmode="text" class="inp sm num" id="inpCustomShiftGmv"
                  value="${(defaultShiftGmv).toLocaleString('vi-VN')}\u00A0₫"
                  style="width:100%;height:36px;font-weight:900;font-size:15px;border:1.5px solid var(--pink);border-radius:9px;color:var(--pink2);"
                  oninput="handleVndInputEvent(this, 'previewShiftGmv'); syncCustomShiftGmv(this, '${s.id}');"
                  onblur="handleVndBlurEvent(this, 'previewShiftGmv'); syncCustomShiftGmv(this, '${s.id}');"
                  onfocus="handleVndFocusEvent(this)"
                  placeholder="Ví dụ: 90tr hoặc 90.000.000\u00A0₫"
                />
              </div>

              <!-- Thẻ đối soát & Live Preview khấu trừ KPI -->
              <div id="box15dReturnPreview" style="background:#fff;border:1px dashed #F8B4D9;border-radius:10px;padding:9px 12px;font-size:11.5px;color:var(--text);line-height:1.45;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:4px;">
                  <span>Doanh số ca ban đầu: <strong class="num">${vnd(defaultShiftGmv)}</strong></span>
                  <span>GMV sau hoàn 15 ngày: <strong class="num" style="color:#991B1B;font-size:13px;">${vnd(defaultShiftGmv)}</strong></span>
                </div>
                <div class="muted" style="font-size:10.5px;margin:3px 0;">(Nhập số tiền sau hoàn 15 ngày để hệ thống tự động trừ KPI)</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;padding-top:4px;border-top:1px dashed #F8B4D9;">
                  <div>Host 0,3% nhận: <strong class="num" style="color:var(--pink2);">${vnd(Math.round(defaultShiftGmv * 0.003))}</strong></div>
                  <div>Op 0,1% nhận: <strong class="num" style="color:var(--violet-ink);">${vnd(Math.round(defaultShiftGmv * 0.001))}</strong></div>
                </div>
              </div>

              <div style="margin-top:8px;font-size:11px;color:#78350F;background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:7px 10px;line-height:1.45;">
                💡 <strong>Quy tắc tự trừ KPI:</strong> Sau khi kiểm tra mục <strong>"Hoàn hủy 15 ngày"</strong>, Admin điền số GMV thực thu sau 15 ngày vào ô trên. Hệ thống sẽ <strong>tự động trừ KPI</strong> của Host (0,3%) và Vận hành (0,1%) tương ứng theo đúng số GMV này.
              </div>
            </div>
          ` : ''}
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input type="text" class="inp sm" id="inpShiftNote" placeholder="Ghi chú ca: Sản phẩm đẩy, minigame, ghi chú đổi ca..." style="flex:1 1 180px;min-width:0;height:34px;border-radius:8px;" />
            <button type="button" class="btn btn-grad sm" style="height:34px;padding:0 14px;flex-shrink:0;font-weight:800;" onclick="addShiftToSession('${s.id}')">
              ${ic('check', 13)}<span>+ Thêm ca live</span>
            </button>
          </div>
        </div>
        ` : `
        <div style="background:#F8FAFC;border:1.5px dashed #CBD5E1;border-radius:14px;padding:14px 16px;margin-top:14px;text-align:center;">
          <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:4px;">
            ℹ️ Phiên LIVE Tiêu Chuẩn (Không chia ca)
          </div>
          <div class="muted" style="font-size:11.5px;line-height:1.5;">
            Phiên live tiêu chuẩn được tính KPI trực tiếp 100% theo Host (0,3%) &amp; Vận hành (0,1%) phụ trách phiên.<br>
            <strong style="color:var(--pink-ink);">Phần thêm ca chỉ áp dụng cho các phiên KPI thủ công</strong> (Mega Live hoặc Ngày Campaign).
          </div>
          ${admin ? `
            <div style="margin-top:10px;">
              <button type="button" class="btn btn-grad sm" style="height:30px;padding:0 12px;font-size:11px;font-weight:800;" onclick="toggleManualKpi('${s.id}', true); closeModal('mdShiftReport'); openManualStaffModal('${s.id}');">
                ⚡ Chuyển sang phiên KPI thủ công để thêm ca
              </button>
            </div>
          ` : ''}
        </div>
        `}

        <!-- Footer Actions -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:12px;border-top:1px solid var(--line2);flex-wrap:wrap;gap:8px;">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            ${isPending ? `
              <span class="pill p-amber num" style="height:34px;font-size:11px;padding:0 12px;font-weight:700;">
                ⏳ Đang tự động phê duyệt chốt KPI...
              </span>
            ` : `
              <button type="button" class="btn btn-grad sm" style="height:34px;padding:0 14px;font-weight:800;" onclick="submitShiftReport('${s.id}')">
                ${ic('send', 14)}<span>📤 Gửi duyệt phiếu ca</span>
              </button>
            `}
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${isApproved && shifts.length ? `
              <button type="button" class="btn btn-ghost sm" style="height:34px;" onclick="submitShiftReport('${s.id}')" title="Gửi duyệt lại để chạy quy trình tự động duyệt">🔄 Gửi duyệt lại</button>
            ` : ''}
            <button type="button" class="btn btn-ghost sm" style="height:34px;" onclick="closeModal('mdShiftReport')">Đóng</button>
          </div>
        </div>`;

      hydrateIcons(document.getElementById('shiftReportCard'));
      updateShiftPuncPreview();
      openModal('mdShiftReport');
    }

    function onSelectShiftPreset(val, sessionId) {
      if (!val) return;
      const inpSlot = document.getElementById('inpShiftSlot');
      const inpActual = document.getElementById('inpShiftActualStart');

      if (val === 'CUSTOM') {
        if (inpSlot) { inpSlot.focus(); inpSlot.select(); }
        toast('Bạn có thể tự gõ điều chỉnh thời gian ca live (linh động khi lùi lịch)');
        return;
      }

      if (val.startsWith('SLOT:')) {
        const slot = val.slice(5);
        applyQuickSlot(slot);
        return;
      }
    }

    function applyQuickSlot(slot) {
      const inpSlot = document.getElementById('inpShiftSlot');
      if (inpSlot) inpSlot.value = slot;
      const selPreset = document.getElementById('selShiftPreset');
      if (selPreset) selPreset.value = `SLOT:${slot}`;

      const lblSched = document.getElementById('lblSchedStartTime');
      if (lblSched) lblSched.textContent = parseSlotStartTime(slot);

      // Cập nhật thẻ hiển thị ca tự động nhận diện nếu có
      const lblDetected = document.getElementById('lblDetectedCaName');
      const badgeDetected = document.getElementById('badgeDetectedSlot');
      const matchIdx = STANDARD_SLOTS.findIndex(st => st.slot === slot);
      if (lblDetected && matchIdx !== -1) {
        lblDetected.textContent = `Ca ${matchIdx + 1}: ${slot}`;
      } else if (lblDetected) {
        lblDetected.textContent = slot;
      }
      if (badgeDetected) {
        badgeDetected.innerHTML = `<i data-ic="check-circle" data-s="13"></i> Khung giờ chuẩn: ${slot}`;
        hydrateIcons(badgeDetected);
      }

      // Tự động đối chiếu: Giữ nguyên giờ phát live thực tế, tự tính lại độ lệch & xếp loại chuyên cần
      updateShiftPuncPreview();
      document.querySelectorAll('.btn-shift-chip').forEach(b => {
        b.classList.toggle('active', b.textContent.trim().startsWith(slot));
      });
      const punc = checkShiftPunctuality(slot, document.getElementById('inpShiftActualStart')?.value);
      toast(`Đã chọn ca: ${slot} · Tự động nhận diện: ${punc.label}`);
    }

    function toggleAdminShiftOverride() {
      if (!isAdmin()) { toast('Chỉ Admin mới có quyền can thiệp đổi ca!'); return; }
      const box = document.getElementById('boxAdminShiftOverride');
      if (!box) return;
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }

    function toggleManualActualTime(btn) {
      if (!isAdmin()) { toast('Chỉ Admin mới có quyền can thiệp sửa giờ!'); return; }
      const box = document.getElementById('boxManualActualTime');
      if (!box) return;
      const isHidden = box.style.display === 'none';
      box.style.display = isHidden ? 'block' : 'none';
      if (btn) btn.innerHTML = isHidden ? '✕ Đóng' : '✏️ Sửa giờ (Admin)';
      if (isHidden) {
        const inp = document.getElementById('inpManualActualStart');
        if (inp) inp.focus();
      }
    }

    function syncManualActualStart(el) {
      if (!isAdmin()) return;
      const val = (el.value || '').trim();
      const inpAct = document.getElementById('inpShiftActualStart');
      if (inpAct) inpAct.value = val;
      const lblAct = document.getElementById('lblActualLiveTime');
      if (lblAct) lblAct.textContent = val;
      updateShiftPuncPreview();
    }

    function updateShiftPuncPreview() {
      const slot = (document.getElementById('inpShiftSlot')?.value || '').trim();
      const actualStart = (document.getElementById('inpShiftActualStart')?.value || '').trim();
      const elPreview = document.getElementById('shiftPuncPreview');
      if (!elPreview) return;
      const punc = checkShiftPunctuality(slot, actualStart);
      elPreview.className = `pill ${punc.pillClass} num`;
      elPreview.innerHTML = `<i data-ic="${punc.icon}" data-s="10"></i> ${punc.label}`;
      hydrateIcons(elPreview);

      const diffBadge = document.getElementById('shiftDiffBadge');
      if (diffBadge) {
        diffBadge.className = `pill ${punc.isLate ? 'p-red' : (punc.status === 'EARLY' ? 'p-green' : 'p-sky')} num`;
        diffBadge.textContent = punc.diffMin === 0 ? '✓ Khớp đúng giờ đăng ký' : (punc.diffMin > 0 ? `Lệch: Trễ ${punc.diffMin} phút` : `Lệch: Sớm ${Math.abs(punc.diffMin)} phút`);
      }
    }

    function toggleShiftDrawer(sessionId) {
      const drawer = document.getElementById('shiftDrawer_' + sessionId);
      const btnTxt = document.getElementById('btnShiftDrawerText_' + sessionId);
      if (!drawer) return;
      const isHidden = drawer.style.display === 'none';
      drawer.style.display = isHidden ? 'block' : 'none';
      if (btnTxt) {
        btnTxt.textContent = isHidden ? 'Ẩn bảng lịch ca' : '📋 Mở bảng lịch phân ca tuần (35 ca)';
      }
    }

    function filterShiftDrawerDay(day, sessionId) {
      const tbody = document.getElementById('shiftDrawerTbody_' + sessionId);
      if (!tbody) return;
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(tr => {
        if (day === 'ALL' || tr.getAttribute('data-day') === day) {
          tr.style.display = '';
        } else {
          tr.style.display = 'none';
        }
      });
      const drawer = document.getElementById('shiftDrawer_' + sessionId);
      if (drawer) {
        drawer.querySelectorAll('.btn-shift-day-pill').forEach(btn => {
          btn.classList.toggle('active', btn.id === `btnDayPill_${sessionId}_${day.replace(' ', '')}`);
        });
      }
    }

    /* ---------- Quản lý Tự động phê duyệt ca sau 5 giây (Auto-Approve 5s) ---------- */
    window._shiftApprovalTimers = window._shiftApprovalTimers || {};

    function clearShiftAutoApproveTimer(sessionId) {
      if (window._shiftApprovalTimers && window._shiftApprovalTimers[sessionId]) {
        const item = window._shiftApprovalTimers[sessionId];
        if (item.timer) clearTimeout(item.timer);
        if (item.interval) clearInterval(item.interval);
        delete window._shiftApprovalTimers[sessionId];
      }
    }

    function playAutoApproveChime() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;
        
        // Nốt 1 (D5 - 587.33Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.28);

        // Nốt 2 (A5 - 880.00Hz) - âm sắc chuông cao sáng
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.12);
        gain2.gain.setValueAtTime(0.18, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.55);
      } catch (e) {
        // Fallback im lặng nếu audio context bị hạn chế
      }
    }

    function scheduleAutoApproveShift(sessionId) {
      clearShiftAutoApproveTimer(sessionId);
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s || !Array.isArray(s.shifts) || s.shifts.length === 0) return;

      s.shiftReportStatus = 'PENDING';
      s.shifts.forEach(sh => {
        if (sh.status !== 'APPROVED') {
          sh.status = 'PENDING';
          sh.approvedBy = null;
          sh.approvedAt = null;
        }
      });

      let remaining = 5;
      window._shiftApprovalTimers[sessionId] = {
        remaining: remaining,
        startedAt: Date.now()
      };

      toast('⏳ Ca LIVE đã được gửi. Hệ thống đang tự động phê duyệt chốt KPI!');

      // Cập nhật đếm ngược mỗi giây trên DOM mà không làm gián đoạn form
      window._shiftApprovalTimers[sessionId].interval = setInterval(() => {
        remaining -= 1;
        if (window._shiftApprovalTimers[sessionId]) {
          window._shiftApprovalTimers[sessionId].remaining = remaining;
        }
        const badgeSec = document.getElementById(`shiftCountdownSec_${sessionId}`);
        if (badgeSec) badgeSec.textContent = remaining > 0 ? remaining : 0;
        const bannerSec = document.getElementById(`shiftBannerCountdown_${sessionId}`);
        if (bannerSec) bannerSec.textContent = remaining > 0 ? remaining : 0;
        const progressEl = document.getElementById(`shiftAutoProgress_${sessionId}`);
        if (progressEl) {
          const pct = Math.max(0, Math.min(100, ((5 - remaining) / 5) * 100));
          progressEl.style.width = pct + '%';
        }
        document.querySelectorAll(`.auto-sec-${sessionId}`).forEach(el => {
          el.textContent = remaining > 0 ? remaining : 0;
        });
      }, 1000);

      // Kích hoạt tự động duyệt đúng sau 5000ms
      window._shiftApprovalTimers[sessionId].timer = setTimeout(() => {
        executeShiftApproval(sessionId, 'Hệ thống tự động (Tự duyệt 5s)');
      }, 5000);

      saveState();
      renderAll();
      if (document.getElementById('mdShiftReport')?.classList.contains('show')) {
        openShiftModal(sessionId);
      }
    }

    function executeShiftApproval(sessionId, approvedByTitle = null) {
      if (!approvedByTitle) {
        if (!isAdmin()) {
          toast('🔒 Chỉ Admin mới có quyền bấm duyệt ca live ngay lập tức!');
          return;
        }
        const adminName = me()?.name || 'Admin';
        approvedByTitle = `Admin (${adminName})`;
      }
      clearShiftAutoApproveTimer(sessionId);
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s || !Array.isArray(s.shifts) || s.shifts.length === 0) return;

      const now = nowStamp();
      s.shifts.forEach(sh => {
        sh.status = 'APPROVED';
        sh.approvedAt = `${TODAY} ${now}`;
        sh.approvedBy = approvedByTitle;
        if (sh.hostId) {
          logUserActivity(sh.hostId, 'Ca LIVE được phê duyệt KPI', `Ca ${sh.timeSlot} đã được ${approvedByTitle} phê duyệt chốt hoa hồng 0,3%`, 'kpi', 'check');
        }
        if (sh.operatorId) {
          logUserActivity(sh.operatorId, 'Ca LIVE được phê duyệt KPI', `Ca ${sh.timeSlot} đã được ${approvedByTitle} phê duyệt chốt hoa hồng 0,1%`, 'kpi', 'check');
        }
      });
      s.shiftReportStatus = 'APPROVED';

      if (state.currentUserId) {
        logUserActivity(state.currentUserId, 'Phê duyệt phiếu ca live', `${approvedByTitle}: Đã phê duyệt ${s.shifts.length} ca live`, 'audit', 'check');
      }

      saveState();
      renderAll();
      if (document.getElementById('mdShiftReport')?.classList.contains('show')) {
        openShiftModal(sessionId);
      }

      // Phát âm thanh chuông báo và hiển thị thông báo phê duyệt thành công
      playAutoApproveChime();
      toast(`🎉 Ca LIVE đã được ${approvedByTitle} phê duyệt thành công! KPI chính thức có hiệu lực.`);
    }

    function validateShiftGmvInput(el, sessionId) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s) return;
      const admin = isAdmin();
      if (admin) return;
      const maxCap = getSessionMaxGmvCap(s);
      const val = parseVndInput(el.value);
      if (val > maxCap.cap) {
        el.style.borderColor = '#EF4444';
        el.style.color = '#B91C1C';
        toast(`⚠️ Không hợp lệ: Doanh số ca (${vnd(val)}) vượt quá ${maxCap.desc}! Hệ thống đã khống chế về ${vnd(maxCap.cap)}.`);
        el.value = (maxCap.cap).toLocaleString('vi-VN') + '\u00A0₫';
        handleVndBlurEvent(el);
      } else {
        el.style.borderColor = '#86EFAC';
        el.style.color = '#15803D';
      }
    }

    function toggleCustomShiftGmv(btn, defaultVal, sessionId) {
      if (!isAdmin()) {
        toast('🔒 Quyền bị khóa: Chỉ Admin mới có quyền tùy chỉnh số tiền và điền GMV sau hoàn 15 ngày!');
        return;
      }
      const box = document.getElementById('boxCustomShiftGmv');
      if (!box) return;
      const isHidden = box.style.display === 'none';
      box.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        const inp = document.getElementById('inpCustomShiftGmv');
        if (inp) {
          inp.focus();
          try { inp.select(); } catch(e) {}
        }
        if (btn) btn.innerHTML = '✕ Hủy điền GMV hoàn 15 ngày';
        update15dReturnPreview(sessionId);
      } else {
        const inpShift = document.getElementById('inpShiftGmv');
        if (inpShift) {
          inpShift.value = (defaultVal).toLocaleString('vi-VN') + '\u00A0₫';
          handleVndBlurEvent(inpShift);
        }
        const autoTxt = document.getElementById('shiftGmvAutoText');
        if (autoTxt) autoTxt.textContent = vnd(defaultVal);
        if (btn) btn.innerHTML = '✏️ Sửa tiền &amp; Điền GMV hoàn 15 ngày';
      }
    }

    function syncCustomShiftGmv(el, sessionId) {
      if (!isAdmin()) return;
      const val = parseVndInput(el.value);
      const inpShift = document.getElementById('inpShiftGmv');
      if (inpShift && val > 0) {
        inpShift.value = (val).toLocaleString('vi-VN') + '\u00A0₫';
        handleVndBlurEvent(inpShift);
      }
      const autoTxt = document.getElementById('shiftGmvAutoText');
      if (autoTxt && val > 0) {
        autoTxt.innerHTML = `${vnd(val)} <span class="pill p-pink" style="font-size:10px;height:18px;margin-left:4px;">Sau hoàn 15 ngày</span>`;
      }
      update15dReturnPreview(sessionId, val);
    }

    function update15dReturnPreview(sessionId, customVal) {
      const previewBox = document.getElementById('box15dReturnPreview');
      if (!previewBox) return;
      const s = state.sessions.find(x => x.id === sessionId);
      const defaultGmv = s ? (s.grossLiveGmv || s.kpiGmv || 10000000) : 10000000;
      
      let val = customVal;
      if (val === undefined || val === null) {
        const inp = document.getElementById('inpCustomShiftGmv');
        val = inp ? parseVndInput(inp.value) : defaultGmv;
      }
      if (val <= 0) val = defaultGmv;

      const diff = Math.max(0, defaultGmv - val);
      const hostComm = Math.round(val * 0.003);
      const opComm = Math.round(val * 0.001);
      const origHostComm = Math.round(defaultGmv * 0.003);
      const origOpComm = Math.round(defaultGmv * 0.001);
      const hostCut = origHostComm - hostComm;
      const opCut = origOpComm - opComm;

      previewBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:4px;">
          <span>Doanh số ca ban đầu: <strong class="num">${vnd(defaultGmv)}</strong></span>
          <span>GMV sau hoàn 15 ngày: <strong class="num" style="color:#991B1B;font-size:13.5px;">${vnd(val)}</strong></span>
        </div>
        ${diff > 0 ? `
          <div style="background:#FFF1F2;border:1px dashed #FECDD3;border-radius:6px;padding:4px 8px;margin:4px 0;color:#9F1239;font-weight:700;font-size:11px;">
            ⚠️ Tự trừ doanh số hoàn 15 ngày: <span class="num">-${vnd(diff)}</span> (Tỷ lệ giữ lại: ${((val / defaultGmv) * 100).toFixed(1)}%)
          </div>
        ` : `
          <div class="muted" style="font-size:10.5px;margin:3px 0;">(Nhập số tiền sau hoàn 15 ngày để hệ thống tự động trừ KPI)</div>
        `}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;padding-top:4px;border-top:1px dashed #F8B4D9;">
          <div>
            Host 0,3% nhận: <strong class="num" style="color:var(--pink2);">${vnd(hostComm)}</strong>
            ${hostCut > 0 ? `<span class="num muted" style="font-size:10px;color:#BE123C;margin-left:3px;">(-${vnd(hostCut)})</span>` : ''}
          </div>
          <div>
            Op 0,1% nhận: <strong class="num" style="color:var(--violet-ink);">${vnd(opComm)}</strong>
            ${opCut > 0 ? `<span class="num muted" style="font-size:10px;color:#BE123C;margin-left:3px;">(-${vnd(opCut)})</span>` : ''}
          </div>
        </div>
      `;
    }

    function autoFill15dReturnGmv(sessionId) {
      if (!isAdmin()) {
        toast('🔒 Quyền bị khóa: Chỉ Admin mới có quyền thao tác!');
        return;
      }
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s) return;
      const defaultGmv = (s.grossLiveGmv || s.kpiGmv || 10000000);
      
      // Tìm tất cả đơn hoàn 15 ngày thuộc phiên này
      const retList = (state.returns15d || []).filter(r => r.sessionId === sessionId);
      const totalReturnAmt = retList.reduce((acc, r) => acc + (r.returnAmount || 0), 0);
      
      let postGmv = defaultGmv;
      if (totalReturnAmt > 0) {
        postGmv = Math.max(0, defaultGmv - totalReturnAmt);
        toast(`⚡ Đã đối soát ${retList.length} đơn hoàn 15 ngày (-${vnd(totalReturnAmt)}). GMV thực thu: ${vnd(postGmv)}`);
      } else if (s.cancelReturnGmv && s.cancelReturnGmv > 0) {
        postGmv = Math.max(0, defaultGmv - s.cancelReturnGmv);
        toast(`⚡ Tự trừ hoàn hủy phiên (-${vnd(s.cancelReturnGmv)}). GMV sau hoàn: ${vnd(postGmv)}`);
      } else {
        toast('ℹ️ Phiên LIVE này chưa ghi nhận đơn hoàn 15 ngày riêng lẻ. Giữ nguyên 100% GMV.');
      }

      const inp = document.getElementById('inpCustomShiftGmv');
      if (inp) {
        inp.value = postGmv.toLocaleString('vi-VN') + '\u00A0₫';
        handleVndBlurEvent(inp, 'previewShiftGmv');
      }
      const hiddenInp = document.getElementById('inpShiftGmv');
      if (hiddenInp) hiddenInp.value = postGmv;
      const autoTxt = document.getElementById('shiftGmvAutoText');
      if (autoTxt) {
        autoTxt.innerHTML = `${vnd(postGmv)} <span class="pill p-pink" style="font-size:10px;height:18px;margin-left:4px;">Sau hoàn 15 ngày</span>`;
      }
      update15dReturnPreview(sessionId, postGmv);
    }

    function addShiftToSession(sessionId) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s) return;
      // Phần thêm ca chỉ áp dụng cho các phiên KPI thủ công
      if (!s.isManualKpi) {
        s.isManualKpi = true;
        s.manualKpiType = s.manualKpiType || 'CAMPAIGN';
      }
      const admin = isAdmin();
      const hostId = (document.getElementById('inpShiftHost')?.value || '').trim();
      const opId = (document.getElementById('inpShiftOp')?.value || '').trim();
      
      // Khung giờ: Host/Op dùng danh sách tiêu chuẩn, Admin có thể tự gõ giờ
      const slot = (document.getElementById('inpShiftSlot')?.value || '').trim();
      
      // Giờ vào live: Host và Vận hành KHÔNG ĐƯỢC SỬA GIỜ.
      // Tự nhận diện 100% từ phiên LIVE. Chỉ Admin mới sửa được qua inpManualActualStart.
      let actualStart = s.actualLiveStart || parseSlotStartTime(slot) || '00:00';
      if (admin) {
        const manualStart = (document.getElementById('inpManualActualStart')?.value || '').trim();
        if (manualStart) actualStart = manualStart;
      }
      
      // Doanh số ca live & Khống chế hạn mức:
      // Không được vượt quá số tiền GMV + Affiliate đã ghi nhận hoặc GMV đã được đối soát rồi
      const maxCap = getSessionMaxGmvCap(s);
      const rawInpGmv = parseVndInput(document.getElementById('inpShiftGmv')?.value);
      const existingGmvSum = (s.shifts || []).reduce((acc, sh) => acc + (Number(sh.shiftGmv) || 0), 0);
      const rem = Math.max(0, maxCap.cap - existingGmvSum);
      const autoGmv = rem > 0 ? rem : maxCap.cap;
      
      let gmv = (rawInpGmv !== undefined && rawInpGmv !== null && rawInpGmv > 0) ? rawInpGmv : autoGmv;

      if (!admin) {
        if (gmv > maxCap.cap) {
          toast(`⚠️ Doanh số ca live (${vnd(gmv)}) không được vượt quá ${maxCap.desc}!`);
          return;
        }
      }
      let postReturn15dGmv = null;
      let hasPostReturn15d = false;

      // Chỉ Admin mới có quyền sửa tiền & điền ô GMV sau khi hoàn 15 ngày
      if (admin) {
        const boxCustom = document.getElementById('boxCustomShiftGmv');
        const customInp = document.getElementById('inpCustomShiftGmv');
        if (boxCustom && boxCustom.style.display !== 'none' && customInp) {
          const customVal = parseVndInput(customInp.value);
          if (customVal > 0) {
            postReturn15dGmv = customVal;
            hasPostReturn15d = true;
          }
        }
      }

      const note = (document.getElementById('inpShiftNote')?.value || '').trim();

      if (!hostId) { toast('Vui lòng chọn Host phụ trách ca live!'); return; }
      if (!slot) { toast('Vui lòng chọn hoặc nhập khung giờ ca live!'); return; }

      if (!Array.isArray(s.shifts)) s.shifts = [];

      const submittedAt = TODAY + ' ' + (actualStart || '00:00');

      // Lưu 1 ca live duy nhất chứa CẢ CẶP NHÂN SỰ (Host 0,3% + Vận hành 0,1%), không có target ca
      const newShift = {
        id: 'SH-' + Date.now(),
        hostId: hostId,
        operatorId: opId || null,
        timeSlot: slot,
        actualStart: actualStart,
        shiftGmv: gmv,
        note: note,
        status: admin ? 'APPROVED' : 'PENDING',
        submittedAt: submittedAt,
        approvedBy: admin ? (state.currentUser?.id || 'U-ADMIN') : null
      };

      if (hasPostReturn15d && postReturn15dGmv !== null) {
        newShift.postReturn15dGmv = postReturn15dGmv;
        newShift.hasPostReturn15d = true;
      }

      s.shifts.push(newShift);

      if (admin) {
        s.shiftReportStatus = s.shifts.every(x => x.status === 'APPROVED') ? 'APPROVED' : 'PENDING';
      } else {
        s.shiftReportStatus = 'PENDING';
      }
      
      saveState();
      renderAll();
      openShiftModal(sessionId);

      if (!admin) {
        // Kích hoạt ngay quy trình tự động duyệt sau 5 giây cho Host/Op!
        scheduleAutoApproveShift(sessionId);
      } else {
        toast(`✅ Admin đã cập nhật ca LIVE thành công! ${hasPostReturn15d ? 'Đã áp dụng GMV sau hoàn 15 ngày (' + vnd(postReturn15dGmv) + ') tự trừ theo KPI.' : ''}`);
      }
    }

    function fillShiftToForm(sessionId, shiftId) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s || !Array.isArray(s.shifts)) return;
      const sh = s.shifts.find(x => x.id === shiftId);
      if (!sh) return;
      const admin = isAdmin();

      if (sh.timeSlot) {
        const inpSlot = document.getElementById('inpShiftSlot');
        if (inpSlot) inpSlot.value = sh.timeSlot;
        const selPreset = document.getElementById('selShiftPreset');
        if (selPreset) selPreset.value = `SLOT:${sh.timeSlot}`;
        const lblDetected = document.getElementById('lblDetectedCaName');
        const badgeDetected = document.getElementById('badgeDetectedSlot');
        const matchIdx = STANDARD_SLOTS.findIndex(st => st.slot === sh.timeSlot);
        if (lblDetected && matchIdx !== -1) {
          lblDetected.textContent = `Ca ${matchIdx + 1}: ${sh.timeSlot}`;
        } else if (lblDetected) {
          lblDetected.textContent = sh.timeSlot;
        }
        if (badgeDetected) {
          badgeDetected.innerHTML = `<i data-ic="check-circle" data-s="13"></i> Khung giờ chuẩn: ${sh.timeSlot}`;
          hydrateIcons(badgeDetected);
        }
      }

      // Giờ vào ca: Chỉ Admin mới nạp vào ô can thiệp sửa giờ
      if (sh.actualStart) {
        const inpAct = document.getElementById('inpShiftActualStart');
        if (inpAct) { inpAct.value = sh.actualStart; }
        const lblAct = document.getElementById('lblActualLiveTime');
        if (lblAct) { lblAct.textContent = sh.actualStart; }
        if (admin) {
          const manualInp = document.getElementById('inpManualActualStart');
          if (manualInp) { manualInp.value = sh.actualStart; }
        }
      }

      const hostId = sh.hostId || (sh.role === 'HOST' ? sh.userId : '');
      const opId = sh.operatorId || (sh.role === 'OPERATOR' ? sh.userId : '');
      if (hostId) {
        const hostSel = document.getElementById('inpShiftHost');
        if (hostSel) hostSel.value = hostId;
      }
      if (opId) {
        const opSel = document.getElementById('inpShiftOp');
        if (opSel) opSel.value = opId;
      }

      // Tiền ca live & GMV sau hoàn 15 ngày
      const baseGmv = sh.shiftGmv || (s.grossLiveGmv || s.kpiGmv || 10000000);
      const autoTxt = document.getElementById('shiftGmvAutoText');
      const gmvEl = document.getElementById('inpShiftGmv');
      if (gmvEl) {
        gmvEl.value = (baseGmv).toLocaleString('vi-VN') + '\u00A0₫';
        handleVndBlurEvent(gmvEl);
      }

      if (admin) {
        const postVal = (sh.postReturn15dGmv !== undefined && sh.postReturn15dGmv !== null && Number(sh.postReturn15dGmv) >= 0) ? Number(sh.postReturn15dGmv) : baseGmv;
        const customGmvEl = document.getElementById('inpCustomShiftGmv');
        if (customGmvEl) {
          customGmvEl.value = postVal.toLocaleString('vi-VN') + '\u00A0₫';
          handleVndBlurEvent(customGmvEl, 'previewShiftGmv');
        }
        if (sh.hasPostReturn15d || (sh.postReturn15dGmv !== undefined && sh.postReturn15dGmv !== null)) {
          const boxCustom = document.getElementById('boxCustomShiftGmv');
          if (boxCustom) boxCustom.style.display = 'block';
          const btnCustom = document.getElementById('btnToggleCustomGmv');
          if (btnCustom) btnCustom.innerHTML = '✕ Hủy điền GMV hoàn 15 ngày';
          if (autoTxt) autoTxt.innerHTML = `${vnd(postVal)} <span class="pill p-pink" style="font-size:10px;height:18px;margin-left:4px;">Sau hoàn 15 ngày</span>`;
        } else {
          if (autoTxt) autoTxt.textContent = vnd(baseGmv);
        }
        update15dReturnPreview(sessionId, postVal);
      } else {
        if (autoTxt) autoTxt.textContent = vnd(baseGmv);
      }

      if (sh.note) {
        const noteEl = document.getElementById('inpShiftNote');
        if (noteEl) noteEl.value = sh.note;
      }

      updateShiftPuncPreview();
      s.shifts = s.shifts.filter(x => x.id !== shiftId && x.pairId !== shiftId);
      saveState();
      renderAll();
      toast(admin ? 'Đã nạp ca live lên form (Quyền Admin: Bạn có thể sửa giờ, phân công & điền GMV sau hoàn 15 ngày)!' : 'Đã nạp ca live lên form: Bạn có thể chọn lại Host & Vận hành!');
    }

    function deleteShiftFromSession(sessionId, shiftId) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s || !Array.isArray(s.shifts)) return;
      s.shifts = s.shifts.filter(sh => sh.id !== shiftId && sh.pairId !== shiftId);
      if (s.shifts.length === 0) {
        s.shiftReportStatus = 'NONE';
        clearShiftAutoApproveTimer(sessionId);
      } else {
        s.shiftReportStatus = s.shifts.every(x => x.status === 'APPROVED') ? 'APPROVED' : 'PENDING';
        if (s.shiftReportStatus === 'APPROVED') {
          clearShiftAutoApproveTimer(sessionId);
        }
      }
      saveState();
      renderAll();
      openShiftModal(sessionId);
      toast('Đã xóa ca live khỏi phiếu');
    }

    function approveShiftReport(sessionId) {
      if (!isAdmin()) {
        toast('🔒 Chỉ Admin mới có quyền phê duyệt ca live!');
        return;
      }
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s) return;
      if (!Array.isArray(s.shifts) || s.shifts.length === 0) {
        toast('Phiên này chưa có ca live nào để duyệt!');
        return;
      }
      const adminName = me()?.name || 'Admin';
      executeShiftApproval(sessionId, `Admin (${adminName})`);
    }

    function submitShiftReport(sessionId) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s) return;
      if (!Array.isArray(s.shifts) || s.shifts.length === 0) {
        toast('Vui lòng thêm ít nhất một ca live trước khi gửi duyệt phiếu!');
        return;
      }
      scheduleAutoApproveShift(sessionId);
    }


    /* ---------- 13b. Hiệu ứng Pháo giấy (Confetti Cannon) & Popup chúc mừng đạt Target ---------- */
    let confettiAnimationId = null;
    let confettiParticles = [];

    function launchConfetti(durationMs = 4000) {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      const canvas = document.getElementById('celebrationConfettiCanvas');
      if (!canvas) return;
      canvas.style.display = 'block';
      canvas.width = window.innerWidth || 1200;
      canvas.height = window.innerHeight || 800;
      const ctx = canvas.getContext ? canvas.getContext('2d') : null;
      if (!ctx) return;

      const colors = [
        '#EC4899', '#F43F5E', '#F472B6', '#FB7185', // Hồng neon / Pink
        '#F59E0B', '#FBBF24', '#FCD34D', '#FDE047', // Vàng hoàng kim / Gold
        '#10B981', '#34D399',                       // Xanh ngọc lục bảo / Emerald
        '#8B5CF6', '#A78BFA', '#6366F1',             // Tím pastel / Purple
        '#0EA5E9', '#38BDF8',                       // Xanh thiên thanh / Sky
        '#FFFFFF'                                   // Trắng ánh bạc
      ];

      confettiParticles = [];
      const particleCount = 200;

      // Tạo chùm pháo giấy bắn vút lên từ dưới đáy màn hình (3 bệ phóng: Trái, Phải, Giữa)
      for (let i = 0; i < particleCount; i++) {
        const cannon = i % 3; // 0: Left, 1: Right, 2: Center
        const startX = cannon === 0 ? canvas.width * 0.15 : (cannon === 1 ? canvas.width * 0.85 : canvas.width * 0.5);
        const startY = canvas.height + 15;

        let angleDeg;
        if (cannon === 0) angleDeg = 55 + Math.random() * 25;       // Góc phóng trái: 55° - 80°
        else if (cannon === 1) angleDeg = 100 + Math.random() * 25;  // Góc phóng phải: 100° - 125°
        else angleDeg = 75 + Math.random() * 30;                     // Góc phóng giữa: 75° - 105°

        const angleRad = (angleDeg * Math.PI) / 180;
        const speed = 16 + Math.random() * 18; // Vận tốc cực đại bắn vút lên trên

        confettiParticles.push({
          x: startX,
          y: startY,
          vx: Math.cos(angleRad) * speed * (cannon === 1 ? -1 : 1),
          vy: -Math.sin(angleRad) * speed,
          size: 7 + Math.random() * 7,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 14,
          wobble: Math.random() * 10,
          wobbleSpeed: 0.12 + Math.random() * 0.1,
          gravity: 0.42 + Math.random() * 0.08,
          friction: 0.982,
          shape: Math.random() > 0.4 ? 'rect' : (Math.random() > 0.5 ? 'circle' : 'star'),
          opacity: 1
        });
      }

      const startTime = Date.now();

      if (confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId);
        confettiAnimationId = null;
      }

      function frame() {
        const elapsed = Date.now() - startTime;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let activeParticles = 0;
        for (let i = 0; i < confettiParticles.length; i++) {
          const p = confettiParticles[i];
          p.vx *= p.friction;
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;
          p.wobble += p.wobbleSpeed;

          // Làm mờ dần ở 1.2 giây cuối
          if (elapsed > durationMs - 1200) {
            p.opacity = Math.max(0, (durationMs - elapsed) / 1200);
          }

          if (p.y < canvas.height + 60 && p.opacity > 0) {
            activeParticles++;
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;

            const scaleX = Math.cos(p.wobble);

            if (p.shape === 'rect') {
              ctx.fillRect(-p.size / 2, (-p.size * scaleX) / 2, p.size, p.size * scaleX);
            } else if (p.shape === 'circle') {
              ctx.beginPath();
              ctx.arc(0, 0, (p.size / 2) * Math.abs(scaleX), 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Ngôi sao nhỏ
              ctx.fillRect(-p.size / 3, -p.size / 3, (p.size * 2) / 3, (p.size * 2) / 3);
            }
            ctx.restore();
          }
        }

        if (elapsed < durationMs && activeParticles > 0) {
          confettiAnimationId = requestAnimationFrame(frame);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.style.display = 'none';
          confettiAnimationId = null;
        }
      }

      confettiAnimationId = requestAnimationFrame(frame);
    }

    function stopConfetti() {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      if (confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId);
        confettiAnimationId = null;
      }
      const canvas = document.getElementById('celebrationConfettiCanvas');
      if (canvas) {
        const ctx = canvas.getContext ? canvas.getContext('2d') : null;
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
      }
    }

    function playTargetCelebrationFanfare() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;
        // Điệp khúc kèn chiến thắng / chuông vinh danh: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
        const notes = [
          { f: 523.25, t: 0, d: 0.18, vol: 0.14 },
          { f: 659.25, t: 0.12, d: 0.18, vol: 0.16 },
          { f: 783.99, t: 0.24, d: 0.22, vol: 0.18 },
          { f: 1046.50, t: 0.38, d: 0.75, vol: 0.25 }
        ];

        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          gain.gain.setValueAtTime(n.vol, now + n.t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d);
        });
      } catch (e) {}
    }

    // Tự động kiểm tra điều kiện và kích hoạt popup mừng đạt Target (chỉ hiện 1 lần duy nhất)
    function checkAndTriggerTargetCelebration(list = null) {
      // 1. Chỉ kích hoạt khi đang ở Tab Tổng quan GMV & KPI
      if (typeof currentTab !== 'undefined' && currentTab !== 'TAB_OVERVIEW') {
        return;
      }

      // 2. Tuyệt đối không bật đè khi người dùng đang mở bất kỳ modal nào (duyệt ca live, xem đơn, phân ca...)
      if (typeof document !== 'undefined' && document.querySelector && document.querySelector('.modal.show:not(#mdTargetCelebration)')) {
        return;
      }

      const curUser = me();
      if (!curUser || curUser.role !== 'HOST' || !curUser.targetGmv || curUser.targetGmv <= 0) {
        return;
      }

      const sesList = list || filteredSessions();
      const hostRecGmv = getHostActualGmv(curUser, sesList);
      const targetGmv = curUser.targetGmv;
      const pct = Math.round((hostRecGmv / targetGmv) * 100);

      // Yêu cầu: "còn không đạt không hiện"
      if (pct < 100) {
        return;
      }

      // Yêu cầu: "chỉ hiện 1 lần sau khi đã đạt nhé tắt đi rồi sẽ không hiện nữa"
      const storageKey = `kpi_target_celebrated_${curUser.id}_${targetGmv}`;
      if (state.targetCelebrated && state.targetCelebrated[storageKey]) {
        return;
      }
      try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey) === 'true') {
          return;
        }
      } catch (e) {}

      // Kích hoạt hiển thị popup và bắn pháo giấy!
      openTargetCelebrationModal(curUser, hostRecGmv, targetGmv, pct, false);
    }

    function openTargetCelebrationModal(user, hostRecGmv, targetGmv, pct, isManualPreview = false) {
      if (!user) return;
      const card = document.getElementById('targetCelebrationCard');
      if (!card) return;

      // Đánh dấu ngay khi kích hoạt tự động để không bị lặp lại trong phiên làm việc
      if (!isManualPreview && user.targetGmv) {
        const storageKey = `kpi_target_celebrated_${user.id}_${user.targetGmv}`;
        if (!state.targetCelebrated) state.targetCelebrated = {};
        state.targetCelebrated[storageKey] = true;
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, 'true');
          }
        } catch (e) {}
      }

      const mot = getHostDailyMotivation(user, hostRecGmv, targetGmv, hostMotivationOffset[user.id] || 0);
      const commVal = Math.round(targetGmv * 0.003);

      card.innerHTML = `
        <!-- Header banner chúc mừng lộng lẫy -->
        <div style="background:linear-gradient(135deg, #FF2E93 0%, #EC4899 50%, #8B5CF6 100%);padding:18px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:12px;z-index:1;">
            <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.25);backdrop-filter:blur(4px);display:grid;place-items:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.15);flex-shrink:0;">
              🏆
            </div>
            <div>
              <div style="font-size:16px;font-weight:900;letter-spacing:-0.2px;text-shadow:0 2px 4px rgba(0,0,0,0.15);">
                🎉 CHÚC MỪNG HOÀN THÀNH TARGET!
              </div>
              <div style="font-size:12px;opacity:0.92;font-weight:600;">
                Khen thưởng thành tích Livestream xuất sắc nhà Khang Baby
              </div>
            </div>
          </div>
          <button type="button" class="icon-btn" onclick="closeTargetCelebrationModal()" style="color:#fff;background:rgba(255,255,255,0.2);border:none;border-radius:50%;width:32px;height:32px;z-index:1;display:grid;place-items:center;cursor:pointer;" aria-label="Đóng">
            <i data-ic="x" data-s="18"></i>
          </button>
          <div style="position:absolute;right:-15px;top:-20px;font-size:80px;opacity:0.12;pointer-events:none;">✨</div>
        </div>

        <!-- Khung Lời động viên hôm nay (Giống 100% hình ảnh yêu cầu) -->
        <div style="padding:16px 20px;">
          <div style="background:linear-gradient(135deg, #FFF5F9 0%, #FFFFFF 100%);border:1.5px solid #FBCFE8;border-radius:16px;padding:14px 16px;box-shadow:0 4px 18px rgba(236,72,153,0.07);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:10px;background:var(--pink-soft);color:var(--pink2);display:grid;place-items:center;flex-shrink:0;">
                  ${ic('sparkle', 20)}
                </div>
                <div>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:14.5px;font-weight:800;color:var(--pink-ink);">💌 Lời động viên hôm nay · Host ${esc(user.name)}</span>
                    <span class="pill p-pink" style="font-size:10px;height:18px;">🎯 Chỉ áp dụng Host LIVE</span>
                    <span class="pill p-green" style="font-size:10px;height:18px;font-weight:800;">
                      🎉 Đạt ${mot.pct}%
                    </span>
                  </div>
                  <div class="muted" style="font-size:11.5px;margin-top:2px;">
                    Mục tiêu Target: <strong class="num" style="color:var(--text);">${short(targetGmv)}</strong> (Hoa hồng 0,3%: <strong class="num" style="color:var(--pink2);">${vnd(commVal)}</strong>) · Đã đối soát: <strong class="num" style="color:var(--green);">${short(hostRecGmv)}</strong> · <strong style="color:var(--green);">Đã vượt mốc!</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Thanh tiến độ Target 100% -->
            <div class="prog" style="height:8px;background:#F8E2EC;border-radius:99px;margin-bottom:10px;">
              <span style="width:100%;background:var(--grad);border-radius:99px;"></span>
            </div>

            <!-- Lời động viên tự nghĩ nổi bật -->
            <div style="background:#FFFFFF;border:1px dashed #F8B4D9;border-radius:12px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;">
              <span style="font-size:22px;line-height:1;color:var(--pink2);flex-shrink:0;">💬</span>
              <div style="font-size:13px;line-height:1.55;color:#4A154B;font-weight:600;font-style:italic;" id="celebrationMotivationQuote">
                "${mot.quote}"
              </div>
            </div>
          </div>

          <!-- Footer điều khiển & Ghi chú chỉ hiện 1 lần -->
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:16px;padding-top:12px;border-top:1px solid #FCE7F3;">
            <div style="font-size:11px;color:var(--muted);">
              ℹ️ Thông báo này chỉ xuất hiện 1 lần sau khi đã đạt Target.
            </div>
            <button type="button" class="btn btn-grad sm" style="height:34px;padding:0 18px;font-weight:800;border-radius:10px;" onclick="closeTargetCelebrationModal()">
              Tuyệt vời! Tiếp tục bứt phá 🚀
            </button>
          </div>
        </div>
      `;

      hydrateIcons(card);
      openModal('mdTargetCelebration');
      launchConfetti(4000);
      playTargetCelebrationFanfare();
    }

    function updateCelebrationModalQuote(userId) {
      const u = userById(userId);
      if (!u) return;
      const list = filteredSessions();
      const hostRecGmv = getHostActualGmv(u, list);
      const mot = getHostDailyMotivation(u, hostRecGmv, u.targetGmv, hostMotivationOffset[u.id] || 0);
      const qEl = document.getElementById('celebrationMotivationQuote');
      if (qEl && mot) {
        qEl.textContent = `"${mot.quote}"`;
      }
    }

    function closeTargetCelebrationModal() {
      const curUser = me();
      if (curUser && curUser.targetGmv) {
        const storageKey = `kpi_target_celebrated_${curUser.id}_${curUser.targetGmv}`;
        if (!state.targetCelebrated) state.targetCelebrated = {};
        state.targetCelebrated[storageKey] = true;
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, 'true');
          }
        } catch (e) {}
        saveState();
      }
      closeModal('mdTargetCelebration');
      stopConfetti();
    }

    function openHostTargetModal(userId) {
      const u = userById(userId || state.currentUserId);
      if (!u) return;
      if (u.role !== 'HOST') {
        toast('Mục tiêu Target cá nhân chỉ áp dụng cho Host Livestream (Admin và Vận hành không cần đặt Target).');
        return;
      }
      const isAd = isAdmin();
      const currentActor = me();
      const isSelf = currentActor && currentActor.id === u.id;
      if (!isAd && !isSelf) {
        toast('🔒 Quyền riêng tư: Bạn chỉ có thể xem hoặc đặt Target cho chính mình!');
        return;
      }
      const hasTarget = (u.targetGmv || 0) > 0;
      const canEdit = isAd || isSelf;

      const list = filteredSessions();
      const currentTarget = u.targetGmv || 0;
      const displayTarget = currentTarget || 1000000000;
      const recGmv = getHostActualGmv(u, list);
      const mot = getHostDailyMotivation(u, recGmv, displayTarget, hostMotivationOffset[u.id] || 0);

      const pct = currentTarget > 0 ? Math.min(100, Math.round((recGmv / currentTarget) * 100)) : 0;
      const remain = Math.max(0, currentTarget - recGmv);

      const modalTitle = isAd
        ? (hasTarget ? `Sửa Target Host LIVE · ${esc(u.name)}` : `Sét Target Host LIVE · ${esc(u.name)}`)
        : (isSelf
          ? (hasTarget ? `Sửa mục tiêu Target cá nhân · Host ${esc(u.name)}` : `Đặt mục tiêu Target cá nhân · Host LIVE`)
          : `Mục tiêu Target · Host ${esc(u.name)}`);

      const roleBadge = isAd
        ? `<span class="pill p-amber" style="font-size:9.5px;height:17px;margin-left:4px;">🛡️ Toàn quyền Admin Sét &amp; Sửa</span>`
        : (isSelf
          ? `<span class="pill p-pink" style="font-size:9.5px;height:17px;margin-left:4px;">🎯 Host tự đặt &amp; sửa Target</span>`
          : `<span class="pill p-gray" style="font-size:9.5px;height:17px;margin-left:4px;">🔒 Chế độ xem</span>`);

      document.getElementById('hostTargetCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line2);margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="card-ic" style="background:var(--pink-soft);color:var(--pink2);"><i data-ic="${canEdit ? 'target' : 'lock'}" data-s="22"></i></div>
            <div>
              <div style="font-size:16px;font-weight:800;">${modalTitle}</div>
              <div class="mono muted" style="font-size:11.5px;">Host: <strong>${esc(u.name)}</strong> · ${esc(u.email)} ${roleBadge}</div>
            </div>
          </div>
          <button type="button" class="icon-btn" onclick="closeModal('mdHostTarget')" aria-label="Đóng"><i data-ic="x" data-s="16"></i></button>
        </div>

        <!-- Lời động viên hôm nay tự nghĩ dành cho Host -->
        <div style="background:linear-gradient(135deg, #FFF5F9 0%, #FFFFFF 100%);border:1.5px solid #FBCFE8;border-radius:14px;padding:12px 14px;margin-bottom:14px;box-shadow:0 2px 10px rgba(236,72,153,0.05);">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="color:var(--pink2);display:grid;place-items:center;"><i data-ic="sparkle" data-s="16"></i></span>
            <span style="font-size:12px;font-weight:800;color:var(--pink-ink);">💌 Lời động viên hôm nay (Chỉ dành riêng cho Host):</span>
          </div>
          <div style="font-size:12.5px;line-height:1.5;color:#4A154B;font-weight:600;font-style:italic;" id="modalHostMotivationText">
            "${mot.quote}"
          </div>
        </div>

        ${hasTarget ? `
        <!-- Tiến độ hiện tại Bento -->
        <div style="background:#FCF8FA;border:1px solid var(--line2);border-radius:14px;padding:12px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
            <span style="font-size:12px;font-weight:700;color:var(--muted);">Tiến độ kỳ lọc (${fmtDs(state.from)} → ${fmtDs(state.to)}):</span>
            <span class="pill ${pct >= 100 ? 'p-green' : 'p-pink'}" style="font-weight:800;font-size:11px;">
              ${pct >= 100 ? '🎉 Đạt 100% Target' : `Đạt ${pct}%`}
            </span>
          </div>
          <div class="prog" style="height:10px;background:#F1E2EC;border-radius:99px;margin-bottom:8px;">
            <span style="width:${pct}%;background:var(--grad);border-radius:99px;"></span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:11.5px;">
            <div><span class="muted">Target hiện tại:</span> <strong class="num" style="display:block;font-size:13px;color:var(--text);">${short(currentTarget)}</strong></div>
            <div><span class="muted">GMV đã đối soát:</span> <strong class="num" style="display:block;font-size:13px;color:var(--pink2);">${short(recGmv)}</strong></div>
            <div><span class="muted">${remain > 0 ? 'Còn thiếu:' : 'Vượt đích:'}</span> <strong class="num" style="display:block;font-size:13px;color:${remain > 0 ? 'var(--red)' : 'var(--green)'};">${short(remain > 0 ? remain : recGmv - currentTarget)}</strong></div>
          </div>
          ${pct >= 100 ? `
            <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #BBF7D0;font-size:11.5px;color:#166534;font-weight:800;">
              🎉 Đã hoàn thành xuất sắc mục tiêu Target!
            </div>
          ` : ''}
        </div>` : ''}

        ${!canEdit ? `
        <!-- Chế độ chỉ xem: Chỉ Admin và chính Host này mới có quyền sửa Target -->
        <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:14px;padding:12px 14px;margin-bottom:14px;">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <span style="font-size:22px;line-height:1;color:#DC2626;flex-shrink:0;">🔒</span>
            <div>
              <div style="font-size:12.5px;font-weight:800;color:#991B1B;">Chế độ chỉ xem Target</div>
              <div style="font-size:11.5px;color:#7F1D1D;margin-top:2px;line-height:1.45;">
                Mức Target hiện tại của Host <strong>${esc(u.name)}</strong> là <strong>${vnd(currentTarget)}</strong>. Theo phân quyền hệ thống, <strong>chỉ Admin hoặc chính Host ${esc(u.name)}</strong> mới có quyền thiết lập và chỉnh sửa Target này.
              </div>
            </div>
          </div>
        </div>

        <div style="background:#F8FAFC;border:1px solid var(--line2);border-radius:14px;padding:14px;margin-bottom:14px;">
          <label style="font-size:12px;font-weight:800;color:var(--muted);display:block;margin-bottom:6px;">
            🎯 Mức Target doanh số (Chế độ chỉ xem)
          </label>
          <input type="text" id="inpNewTargetGmv" value="${(currentTarget || 0).toLocaleString('vi-VN') + '\u00A0₫'}" disabled readonly style="width:100%;height:38px;font-size:15px;font-weight:800;border:1px solid var(--line);border-radius:10px;padding:0 12px;background:#F1F5F9;color:#475569;cursor:not-allowed;" />
          <div id="targetLivePreview" style="margin-top:10px;background:#fff;border:1px dashed var(--line);border-radius:10px;padding:9px 12px;font-size:11.5px;color:var(--text);line-height:1.4;">
            <div>Hoa hồng Host 0,3% tương ứng khi đạt 100%: <strong class="num" style="color:var(--pink2);">${vnd(Math.round(currentTarget * 0.003))}</strong></div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="muted" style="font-size:11px;font-style:italic;">🔒 Bạn không có quyền chỉnh sửa Target của nhân sự này</span>
          <button type="button" class="btn btn-ghost" onclick="closeModal('mdHostTarget')">Đóng</button>
        </div>
        ` : `
        <!-- Form nhập / sửa Target (Admin toàn quyền hoặc Host tự đặt & sửa mục tiêu của mình) -->
        <div style="background:#FFF9FC;border:1px solid #FDE2EE;border-radius:14px;padding:14px;margin-bottom:14px;">
          ${isAd ? `
            <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:10px;padding:8px 12px;margin-bottom:10px;font-size:11.5px;color:#92400E;display:flex;align-items:center;gap:6px;">
              <span>🛡️</span>
              <span><strong>Quyền Admin:</strong> Bạn có quyền sét hoặc sửa Target doanh số cho Host <strong>${esc(u.name)}</strong> bất kỳ lúc nào.</span>
            </div>` : `
            <div style="background:#FDF2F8;border:1px solid #FBCFE8;border-radius:10px;padding:8px 12px;margin-bottom:10px;font-size:11.5px;color:#831843;display:flex;align-items:center;gap:6px;">
              <span>🎯</span>
              <span><strong>Quyền Host Livestream:</strong> Bạn có quyền tự đặt và sửa Target doanh số của mình bất kỳ lúc nào để tạo động lực bứt phá doanh số!</span>
            </div>`}

          <label style="font-size:12px;font-weight:800;color:var(--pink-ink);display:block;margin-bottom:4px;">
            🎯 ${isAd ? (hasTarget ? 'Sửa mức Target doanh số cho Host' : 'Sét mức Target doanh số mới cho Host') : (hasTarget ? 'Sửa mức Target doanh số của bạn' : 'Nhập mức Target doanh số của bạn')} (VNĐ) *
          </label>
          <div style="position:relative;margin-bottom:10px;">
            <input type="text" inputmode="text" id="inpNewTargetGmv" value="${currentTarget > 0 ? (currentTarget).toLocaleString('vi-VN') + '\u00A0₫' : ''}" style="width:100%;height:38px;font-size:15px;font-weight:800;border:1.5px solid var(--pink);border-radius:10px;padding:0 12px;color:var(--pink2);" oninput="handleVndInputEvent(this);previewHostTargetLive(${recGmv})" onblur="handleVndBlurEvent(this);previewHostTargetLive(${recGmv})" onfocus="handleVndFocusEvent(this)" placeholder="Ví dụ: 1ty hoặc 1.000.000.000\u00A0₫" />
          </div>

          <!-- Nút chọn nhanh mức Target -->
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;">Gợi ý mức Target nhanh:</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
            ${[500000000, 800000000, 1000000000, 1200000000, 1500000000, 2000000000, 3000000000].map(val => `
              <button type="button" class="btn btn-soft sm" style="height:26px;padding:0 8px;font-size:11px;font-weight:700;" onclick="selectQuickTarget(${val}, ${recGmv})">
                ${short(val)}
              </button>`).join('')}
          </div>

          <!-- Live preview -->
          <div id="targetLivePreview" style="background:#fff;border:1px dashed #F8B4D9;border-radius:10px;padding:9px 12px;font-size:11.5px;color:var(--text);line-height:1.4;">
            <div>Hoa hồng Host 0,3% dự kiến khi đạt 100%: <strong class="num" style="color:var(--pink2);">${vnd(Math.round((currentTarget || 1000000000) * 0.003))}</strong></div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" class="btn btn-ghost" onclick="closeModal('mdHostTarget')">Đóng</button>
          <button type="button" class="btn btn-grad" onclick="saveHostTarget('${u.id}')">
            <i data-ic="check" data-s="14"></i><span>${isAd ? (hasTarget ? 'Admin Lưu Sửa Target' : 'Admin Sét Target') : (hasTarget ? 'Lưu Sửa Target cá nhân' : 'Lưu Target cá nhân')}</span>
          </button>
        </div>
        `}
      `;
      hydrateIcons(document.getElementById('hostTargetCard'));
      openModal('mdHostTarget');
    }

    function selectQuickTarget(val, recGmv) {
      const inp = document.getElementById('inpNewTargetGmv');
      if (inp) {
        inp.value = Number(val).toLocaleString('vi-VN') + '\u00A0₫';
        previewHostTargetLive(recGmv);
      }
    }

    function previewHostTargetLive(recGmv) {
      const val = parseVndInput(document.getElementById('inpNewTargetGmv')?.value);
      const pct = val > 0 ? Math.min(100, Math.round((recGmv / val) * 100)) : 0;
      const remain = Math.max(0, val - recGmv);
      const comm = Math.round(val * 0.003);
      const el = document.getElementById('targetLivePreview');
      if (el) {
        el.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
            <span>Tiến độ hiện tại so với target mới: <strong class="num" style="color:var(--pink2);">${pct}%</strong></span>
            <span class="muted">${remain > 0 ? `Còn thiếu: ${short(remain)}` : '<span style="color:var(--green);font-weight:700;">Đã vượt mức này!</span>'}</span>
          </div>
          <div>Hoa hồng Host 0,3% dự kiến khi đạt 100%: <strong class="num" style="color:var(--pink2);">${vnd(comm)}</strong></div>
          <div style="margin-top:4px;padding-top:4px;border-top:1px dashed #F8B4D9;font-size:11px;color:var(--pink-ink);font-style:italic;">
            ${pct >= 100 ? '🎉 Mức target siêu thực tế, bạn đã chạm ngưỡng này! Thử thách bản thân ở mốc cao hơn nhé!' : `💪 Mỗi ngày nỗ lực thêm một chút trong từng ca live để về đích thành công rực rỡ!`}
          </div>`;
      }
    }

    async function saveHostTarget(userId) {
      const u = userById(userId);
      if (!u) return;
      if (u.role !== 'HOST') {
        toast('Mục tiêu Target cá nhân chỉ áp dụng cho Host Livestream');
        return;
      }
      const ad = isAdmin();
      const cur = me();
      const isSelf = cur && cur.id === u.id;
      if (!ad && !isSelf) {
        toast('Bạn không có quyền chỉnh sửa Target của nhân sự này!');
        return;
      }

      const val = Math.max(0, parseVndInput(document.getElementById('inpNewTargetGmv')?.value));
      if (val <= 0) { toast('Vui lòng nhập mức Target lớn hơn 0 (Ví dụ: 1ty hoặc 1.000.000.000\u00A0₫)'); return; }

      if (!Number.isSafeInteger(val) || val > 1000000000000) { toast('Target tối đa là 1.000 tỷ đồng'); return; }

      const oldVal = u.targetGmv || 0;
      const oldUpdatedAt = u.targetUpdatedAt || '';
      const hasTarget = oldVal > 0;
      u.targetGmv = val;
      u.targetUpdatedAt = TODAY;

      const recGmv = getHostActualGmv(u);
      const mot = getHostDailyMotivation(u, recGmv, val, hostMotivationOffset[u.id] || 0);

      const actor = me();
      const actorName = actor ? actor.name : 'Người dùng';
      const logMsg = ad
        ? `Admin ${actorName} đã ${hasTarget ? 'sửa' : 'sét'} Target cho Host ${u.name}: ${oldVal > 0 ? vnd(oldVal) + ' ➔ ' : ''}${vnd(val)}`
        : `Host ${u.name} đã ${hasTarget ? 'sửa' : 'đặt'} Target cá nhân: ${oldVal > 0 ? vnd(oldVal) + ' ➔ ' : ''}${vnd(val)}`;

      try {
        await saveProductionHostTarget(u);
      } catch (error) {
        u.targetGmv = oldVal;
        u.targetUpdatedAt = oldUpdatedAt;
        console.error('Could not save Host target', error);
        toast('Không thể lưu Target lên Firebase. Vui lòng kiểm tra kết nối và thử lại.');
        return;
      }
      if (state.currentUserId) logUserActivity(state.currentUserId, 'Cập nhật Target Host', logMsg, 'kpi', 'target');
      if (ad) saveState();
      closeModal('mdHostTarget');
      renderAll();
      toast(`🎯 ${ad ? 'Admin đã lưu thành công' : 'Đã lưu'} Target ${vnd(val)} cho Host ${u.name}! "${mot.quote}"`);
    }


    /* ---------- 16.0. Xác nhận phê duyệt & Phân quyền an toàn (Chống tự duyệt) ---------- */
    let pendingRoleAction = null; // { userId, targetRole, originalRole, selectEl, isPending }

    function onUserRoleSelectChanged(userId, selEl) {
      const u = userById(userId);
      if (!u) return;
      const newRole = selEl.value;
      if (!newRole) {
        selEl.value = u.role || '';
        toast('Vui lòng chọn vai trò hợp lệ cho nhân sự');
        return;
      }
      if (newRole === u.role && u.status === 'APPROVED') {
        return;
      }
      openUserRoleConfirmModal(userId, newRole, selEl);
    }

    function openApproveModal(userId) {
      const u = userById(userId);
      if (!u) return;
      const targetRole = u.role || 'HOST';
      openUserRoleConfirmModal(userId, targetRole, null);
    }

    function closeUserRoleModal() {
      if (pendingRoleAction && pendingRoleAction.selectEl) {
        pendingRoleAction.selectEl.value = pendingRoleAction.originalRole || '';
      }
      pendingRoleAction = null;
      closeModal('mdUserRoleConfirm');
    }

    function selectModalRole(role) {
      if (!pendingRoleAction) return;
      pendingRoleAction.targetRole = role;
      renderUserRoleModalContent();
    }

    function openUserRoleConfirmModal(userId, targetRole, selectEl) {
      const u = userById(userId);
      if (!u) return;
      const isPending = u.status === 'PENDING';
      pendingRoleAction = {
        userId,
        targetRole: targetRole || u.role || 'HOST',
        originalRole: u.role || '',
        selectEl,
        isPending
      };
      renderUserRoleModalContent();
      openModal('mdUserRoleConfirm');
    }

    function renderUserRoleModalContent() {
      if (!pendingRoleAction) return;
      const { userId, targetRole, isPending } = pendingRoleAction;
      const u = userById(userId);
      if (!u) return;
      const isCur = u.id === state.currentUserId;
      const isOnline = isCur || !!u.isOnline;
      const providerText = u.authProvider
        ? (u.authProvider === 'facebook' ? 'Facebook OAuth' : (u.authProvider === 'apple' ? 'Apple ID' : 'Google Mail'))
        : (u.email.includes('fb_') ? 'Facebook OAuth' : (u.email.includes('apple') ? 'Apple ID' : 'Google Mail'));

      const card = document.getElementById('userRoleConfirmCard');
      if (!card) return;

      const isAdminRole = targetRole === 'ADMIN';
      const roleBadgeClass = isPending ? 'alert-badge-success' : 'shield-badge';
      const modalTitle = isPending ? 'Xác nhận duyệt tài khoản &amp; Cấp vai trò' : 'Xác nhận thay đổi vai trò tài khoản';
      const modalSub = isPending
        ? 'Phê duyệt tài khoản và kích hoạt quyền truy cập hệ thống theo vai trò đã chọn bên dưới.'
        : 'Cập nhật lại quyền hạn, phạm vi truy cập và chính sách hoa hồng cho nhân sự.';

      card.innerHTML = `
        <div style="text-align:center;">
          <div class="${roleBadgeClass}" style="margin:0 auto 16px;">
            ${isPending ? ic('check', 36) : ic('shield', 36)}
          </div>
          <h3 style="font-size:18px;font-weight:800;color:var(--text);margin:0 0 6px 0;">${modalTitle}</h3>
          <div style="color:var(--muted);font-size:12.5px;line-height:1.5;margin-bottom:16px;">
            ${modalSub}
          </div>
        </div>

        <!-- User Information Bento Preview -->
        <div style="background:#FBF7FA;border:1.5px solid var(--line2);border-radius:18px;padding:12px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(0,0,0,.03);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="position:relative;display:inline-block;flex-shrink:0;">
              ${avatarHtml(u, false)}
              <span class="online-indicator ${isOnline ? 'online' : 'offline'}" style="position:absolute;bottom:0;right:0;border:2px solid #fff;width:10px;height:10px;"></span>
            </div>
            <div style="flex:1;min-width:0;text-align:left;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <strong style="font-size:14.5px;color:var(--text);">${esc(u.name)}</strong>
                ${isCur ? '<span class="pill p-sky" style="font-size:9.5px;height:18px;padding:0 6px;">Bạn</span>' : ''}
              </div>
              <div class="who-e" style="font-size:11.5px;color:var(--muted);word-break:break-all;">${esc(u.email)}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              ${statusPill(u)}
              <span class="muted" style="font-size:10.5px;">${providerText}</span>
            </div>
          </div>
        </div>

        <!-- Interactive Role Select Cards -->
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="font-size:12.5px;color:var(--text);display:flex;align-items:center;gap:6px;">
              ${ic('users', 14)}<span>Chọn vai trò cần cấp:</span>
            </strong>
            <span class="muted" style="font-size:11px;">Bấm để thay đổi</span>
          </div>

          <!-- Card 1: HOST -->
          <div class="role-opt-card ${targetRole === 'HOST' ? 'selected' : ''}" onclick="selectModalRole('HOST')">
            <div class="role-opt-radio"></div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong style="font-size:13.5px;color:var(--text);">Host Livestream</strong>
                <span class="pill p-pink" style="height:20px;font-size:10.5px;font-weight:700;">Hoa hồng 0,3%</span>
              </div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                Phụ trách ca live, đối soát doanh số ca &amp; hưởng KPI 0,3% GMV sau đối soát. Ẩn TikTok API.
              </div>
            </div>
          </div>

          <!-- Card 2: OPERATOR -->
          <div class="role-opt-card ${targetRole === 'OPERATOR' ? 'selected' : ''}" onclick="selectModalRole('OPERATOR')">
            <div class="role-opt-radio"></div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong style="font-size:13.5px;color:var(--text);">Livestream Operator</strong>
                <span class="pill p-violet" style="height:20px;font-size:10.5px;font-weight:700;">Hoa hồng 0,1%</span>
              </div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                Kỹ thuật vận hành phiên live, ghim giỏ hàng &amp; hưởng KPI 0,1% GMV sau đối soát. Ẩn TikTok API.
              </div>
            </div>
          </div>

          <!-- Card 3: ADMIN -->
          <div class="role-opt-card ${targetRole === 'ADMIN' ? 'selected' : ''}" onclick="selectModalRole('ADMIN')">
            <div class="role-opt-radio"></div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong style="font-size:13.5px;color:var(--text);">Quản trị viên (Admin)</strong>
                <span class="pill p-amber" style="height:20px;font-size:10.5px;font-weight:700;">Toàn quyền hệ thống</span>
              </div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                Xem toàn bộ báo cáo doanh thu Shop, duyệt nhân sự và xem kết nối TikTok API.
              </div>
            </div>
          </div>
        </div>

        <!-- Dynamic Security & Permission Callout -->
        <div style="background:${isAdminRole ? '#FFFBEB' : '#F0FDF4'};border:1px solid ${isAdminRole ? '#FDE68A' : '#BBF7D0'};border-radius:14px;padding:10px 14px;margin-bottom:18px;display:flex;gap:10px;align-items:flex-start;text-align:left;">
          <div style="color:${isAdminRole ? '#D97706' : '#16A34A'};flex-shrink:0;margin-top:2px;">
            ${ic(isAdminRole ? 'alert' : 'shield', 18)}
          </div>
          <div style="font-size:11.5px;line-height:1.5;color:${isAdminRole ? '#92400E' : '#166534'};">
            ${isAdminRole
              ? '<strong>Cảnh báo phân quyền Admin:</strong> Tài khoản này sẽ có toàn quyền xem doanh số tài chính của cả 2 Shop (shopkhangbaby &amp; mekhangsua) và quản lý kết nối TikTok API.'
              : '<strong>Bảo mật RBAC chặt chẽ:</strong> Nhân sự này sẽ <strong>KHÔNG</strong> xem được tab TikTok API và nhóm Quản trị. Đảm bảo an toàn tuyệt đối cho tài khoản Shop.'}
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:10px;align-items:center;">
          <button type="button" class="btn btn-ghost" style="flex:1;height:42px;font-size:13px;border-radius:13px;font-weight:600;" onclick="closeUserRoleModal()">
            Hủy bỏ
          </button>
          <button type="button" class="btn btn-grad" style="flex:1;height:42px;font-size:13px;border-radius:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;" onclick="executeApproveOrChangeRole()">
            ${ic('check', 16)} <span>${isPending ? 'Xác nhận duyệt &amp; Cấp quyền' : 'Xác nhận đổi vai trò'}</span>
          </button>
        </div>
      `;
    }

    function executeApproveOrChangeRole() {
      if (!pendingRoleAction) return;
      const { userId, targetRole, isPending } = pendingRoleAction;
      const u = userById(userId);
      if (!u) {
        toast('Không tìm thấy tài khoản người dùng');
        closeUserRoleModal();
        return;
      }
      if (!targetRole) {
        toast('Vui lòng chọn vai trò cho tài khoản');
        return;
      }

      const prevRole = u.role;
      const prevStatus = u.status;
      u.role = targetRole;
      u.status = 'APPROVED';
      if (targetRole !== 'HOST') {
        delete u.targetGmv;
      }

      if (isPending || prevStatus === 'PENDING') {
        logUserActivity(u.id, 'Tài khoản được duyệt', `Admin đã duyệt tài khoản với vai trò ${ROLE[targetRole].label}`, 'account', 'check');
        if (state.currentUserId && state.currentUserId !== u.id) {
          logUserActivity(state.currentUserId, 'Phê duyệt tài khoản', `Duyệt người dùng ${u.name} (${ROLE[targetRole].label})`, 'account', 'users');
        }
      } else {
        logUserActivity(u.id, 'Cập nhật vai trò', `Admin đã thay đổi vai trò thành ${ROLE[targetRole].label}`, 'account', 'shield');
        if (state.currentUserId && state.currentUserId !== u.id) {
          logUserActivity(state.currentUserId, 'Cấp vai trò tài khoản', `Cập nhật vai trò ${ROLE[targetRole].label} cho ${u.name}`, 'account', 'shield');
        }
      }

      pendingRoleAction = null;
      closeModal('mdUserRoleConfirm');
      saveState();
      populateStaffFilter();
      renderAll();

      toast(isPending ? `Đã phê duyệt ${u.name} (${ROLE[targetRole].label}) thành công!` : `Đã cập nhật vai trò ${ROLE[targetRole].label} cho ${u.name}!`);
    }

    function confirmSetPending(userId) {
      if (userId === 'U-ADMIN') {
        toast('Không thể khóa tài khoản Admin gốc hệ thống');
        return;
      }
      const u = userById(userId);
      if (!u) return;

      const isCur = u.id === state.currentUserId;
      const isOnline = isCur || !!u.isOnline;
      const card = document.getElementById('userRoleConfirmCard');
      if (!card) return;

      card.innerHTML = `
        <div style="text-align:center;">
          <div class="alert-badge-amber" style="margin:0 auto 16px;">
            ${ic('lock', 34)}
          </div>
          <h3 style="font-size:18px;font-weight:800;color:var(--text);margin:0 0 6px 0;">Xác nhận tạm khóa tài khoản?</h3>
          <div style="color:var(--muted);font-size:12.5px;line-height:1.5;margin-bottom:16px;">
            Tài khoản này sẽ chuyển về trạng thái <strong>Chờ duyệt</strong> và bị tạm ngừng quyền truy cập hệ thống ngay lập tức.
          </div>
        </div>

        <div style="background:#FFFBF2;border:1.5px solid #FDE68A;border-radius:18px;padding:12px 16px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="position:relative;display:inline-block;flex-shrink:0;">
              ${avatarHtml(u, false)}
              <span class="online-indicator ${isOnline ? 'online' : 'offline'}" style="position:absolute;bottom:0;right:0;border:2px solid #fff;width:10px;height:10px;"></span>
            </div>
            <div style="flex:1;min-width:0;text-align:left;">
              <strong style="font-size:14.5px;color:var(--text);">${esc(u.name)}</strong>
              <div class="who-e" style="font-size:11.5px;color:var(--muted);word-break:break-all;">${esc(u.email)}</div>
            </div>
            <span class="pill ${u.role === 'HOST' ? 'p-pink' : (u.role === 'OPERATOR' ? 'p-violet' : 'p-amber')}" style="font-size:10.5px;height:22px;">
              ${u.role ? ROLE[u.role].label : 'Chưa gán vai trò'}
            </span>
          </div>
        </div>

        <div style="background:#FFF7ED;border:1px solid #FFEDD5;border-radius:14px;padding:10px 14px;margin-bottom:18px;display:flex;gap:10px;align-items:flex-start;text-align:left;">
          <div style="color:#EA580C;flex-shrink:0;margin-top:2px;">${ic('alert', 18)}</div>
          <div style="font-size:11.5px;line-height:1.5;color:#9A3412;">
            Khi tạm khóa, nhân sự sẽ không thể xem phiên live hay xem KPI cá nhân cho đến khi được Admin mở duyệt lại. Các dữ liệu lịch sử ca trước đây vẫn an toàn 100%.
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center;">
          <button type="button" class="btn btn-ghost" style="flex:1;height:42px;font-size:13px;border-radius:13px;font-weight:600;" onclick="closeModal('mdUserRoleConfirm')">
            Hủy bỏ
          </button>
          <button type="button" class="btn btn-ghost" style="flex:1;height:42px;font-size:13px;border-radius:13px;font-weight:700;color:#D97706;border-color:#FCD34D;background:#FFFBEB;display:flex;align-items:center;justify-content:center;gap:6px;" onclick="executeSetPending('${u.id}')">
            ${ic('lock', 16)} <span>Xác nhận tạm khóa</span>
          </button>
        </div>
      `;

      openModal('mdUserRoleConfirm');
    }

    function executeSetPending(id) {
      if (id === 'U-ADMIN') { toast('Không thể khóa Admin gốc'); closeModal('mdUserRoleConfirm'); return; }
      const u = userById(id); if (!u) { closeModal('mdUserRoleConfirm'); return; }
      u.status = 'PENDING';
      logUserActivity(u.id, 'Tài khoản bị tạm khóa', 'Tài khoản được chuyển về trạng thái Chờ duyệt', 'account', 'x');
      if (state.currentUserId && state.currentUserId !== u.id) {
        logUserActivity(state.currentUserId, 'Tạm khóa tài khoản', `Đã chuyển tài khoản ${u.name} về Chờ duyệt`, 'account', 'x');
      }
      closeModal('mdUserRoleConfirm');
      saveState(); populateStaffFilter(); renderAll();
      toast(`Đã chuyển tài khoản ${u.name} về trạng thái Chờ duyệt`);
    }

    // Backward-compatible wrappers
    function changeUserRole(id, role) { openUserRoleConfirmModal(id, role, null); }
    function approveUser(id) { openApproveModal(id); }
    function setPending(id) { confirmSetPending(id); }
    /* ---------- 16.1. Xóa tài khoản người dùng & Hộp thoại xác nhận an toàn ---------- */
    function confirmDeleteUser(userId) {
      if (userId === 'U-ADMIN') {
        toast('Tài khoản Admin gốc hệ thống được bảo vệ và không thể xóa!');
        return;
      }
      const u = userById(userId);
      if (!u) {
        toast('Không tìm thấy tài khoản người dùng!');
        return;
      }

      const isCur = u.id === state.currentUserId;
      const isOnline = isCur || !!u.isOnline;
      const sessionCount = state.sessions.filter(s => s.hostId === u.id || s.operatorId === u.id || (s.shifts && s.shifts.some(sh => sh.hostId === u.id || sh.operatorId === u.id || sh.userId === u.id))).length;
      const actCount = (u.activities || []).length;
      const roleLabel = u.role ? ROLE[u.role]?.label : 'Chưa gán vai trò';
      const providerText = u.authProvider
        ? (u.authProvider === 'facebook' ? 'Facebook OAuth' : (u.authProvider === 'apple' ? 'Apple ID' : 'Google Mail'))
        : (u.email.includes('fb_') ? 'Facebook OAuth' : (u.email.includes('apple') ? 'Apple ID' : 'Google Mail'));

      const card = document.getElementById('deleteUserConfirmCard');
      if (!card) return;

      card.innerHTML = `
        <div style="text-align:center;">
          <div class="alert-badge-danger">
            ${ic('alert', 34)}
          </div>
          <h3 style="font-size:18px;font-weight:800;color:var(--text);margin:0 0 6px 0;">Xác nhận xóa tài khoản?</h3>
          <div style="color:var(--muted);font-size:12.5px;line-height:1.5;margin-bottom:16px;">
            Hành động này sẽ xóa vĩnh viễn tài khoản người dùng khỏi hệ thống và hủy quyền truy cập ngay lập tức.
          </div>
        </div>

        <!-- User Details Preview Card -->
        <div style="background:#FFF8F9;border:1.5px solid #FEE2E2;border-radius:18px;padding:14px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(225,29,72,.05);">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            <div style="position:relative;display:inline-block;flex-shrink:0;">
              ${avatarHtml(u, false)}
              <span class="online-indicator ${isOnline ? 'online' : 'offline'}" style="position:absolute;bottom:0;right:0;border:2px solid #fff;width:10px;height:10px;"></span>
            </div>
            <div style="flex:1;min-width:0;text-align:left;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <strong style="font-size:14.5px;color:var(--text);">${esc(u.name)}</strong>
                ${isCur ? '<span class="pill p-sky" style="font-size:9.5px;height:18px;padding:0 6px;">Tài khoản của bạn</span>' : ''}
              </div>
              <div class="who-e" style="font-size:11.5px;color:var(--muted);word-break:break-all;">${esc(u.email)}</div>
            </div>
            <span class="pill ${u.role === 'HOST' ? 'p-pink' : (u.role === 'OPERATOR' ? 'p-violet' : (u.role === 'ADMIN' ? 'p-amber' : 'p-gray'))}" style="font-size:10.5px;height:22px;flex-shrink:0;">
              ${roleLabel}
            </span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-top:10px;border-top:1px dashed #FECDD3;font-size:11.5px;text-align:left;">
            <div><span class="muted">Phiên live liên quan:</span> <strong class="num" style="color:var(--pink-ink);">${sessionCount} phiên</strong></div>
            <div><span class="muted">Nhật ký hoạt động:</span> <strong class="num" style="color:var(--text);">${actCount} bản ghi</strong></div>
            <div><span class="muted">Ngày đăng ký:</span> <strong class="num" style="color:var(--text);">${fmtD(u.joined)}</strong></div>
            <div><span class="muted">Cổng đăng nhập:</span> <strong style="color:var(--text);">${providerText}</strong></div>
          </div>
        </div>

        <!-- Safety Notice (Pastel Amber/Red callout) -->
        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:14px;padding:10px 14px;margin-bottom:18px;display:flex;gap:10px;align-items:flex-start;text-align:left;">
          <div style="color:#D97706;flex-shrink:0;margin-top:2px;">${ic('shield', 18)}</div>
          <div style="font-size:11.5px;line-height:1.5;color:#92400E;">
            <strong>Bảo toàn dữ liệu đối soát tài chính:</strong> Mọi doanh số, KPI và phiên live đã kết thúc trước đây của nhân sự này sẽ được hệ thống bảo toàn nguyên vẹn, không làm sai lệch số liệu doanh thu.
            ${isCur ? '<br><span style="color:#DC2626;font-weight:700;">⚠️ Chú ý: Bạn đang xóa tài khoản của chính mình. Sau khi xóa, bạn sẽ được tự động chuyển về tài khoản Admin gốc.</span>' : ''}
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:10px;align-items:center;">
          <button type="button" class="btn btn-ghost" style="flex:1;height:42px;font-size:13px;border-radius:13px;font-weight:600;" onclick="closeModal('mdDeleteUserConfirm')">
            Hủy bỏ
          </button>
          <button type="button" class="btn btn-danger" style="flex:1;height:42px;font-size:13px;border-radius:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;" onclick="executeDeleteUser('${u.id}')">
            ${ic('trash', 16)} <span>Xác nhận xóa tài khoản</span>
          </button>
        </div>
      `;

      openModal('mdDeleteUserConfirm');
    }

    async function executeDeleteUser(userId) {
      if (userId === 'U-ADMIN') {
        toast('Không thể xóa tài khoản Admin gốc hệ thống');
        closeModal('mdDeleteUserConfirm');
        return;
      }
      const u = userById(userId);
      if (!u) {
        toast('Không tìm thấy tài khoản cần xóa');
        closeModal('mdDeleteUserConfirm');
        return;
      }

      const userName = u.name;
      const userEmail = u.email;
      const isCur = userId === state.currentUserId;

      const confirmButton = document.querySelector('#mdDeleteUserConfirm .btn-danger');
      if (confirmButton) confirmButton.disabled = true;
      try {
        await removeProductionUserProfile(u);
      } catch (error) {
        console.error('Could not persist removed user profile', error);
        if (confirmButton) confirmButton.disabled = false;
        toast('Chưa xóa được yêu cầu trên Firebase. Vui lòng kiểm tra mạng và thử lại.');
        return;
      }

      // 1. Remove user from state.users
      state.users = state.users.filter(x => x.id !== userId);

      // 2. Unassign from active/scheduled sessions; preserve historical shift records with name marked as deleted
      state.sessions.forEach(s => {
        if (s.hostId === userId) s.hostId = '';
        if (s.operatorId === userId) s.operatorId = '';
        if (s.shifts && Array.isArray(s.shifts)) {
          s.shifts.forEach(sh => {
            if (sh.staffId === userId) {
              sh.staffName = `${userName} (Đã xóa)`;
            }
          });
        }
      });

      // 3. Log activity for the remaining admin
      if (!isCur && state.currentUserId) {
        logUserActivity(
          state.currentUserId,
          'Xóa tài khoản người dùng',
          `Admin đã xóa vĩnh viễn tài khoản ${userName} (${userEmail})`,
          'account',
          'trash'
        );
      }

      // 4. If current user deleted themselves, fallback to U-ADMIN
      if (isCur) {
        state.currentUserId = 'U-ADMIN';
      }

      // 5. Close confirmation modal
      closeModal('mdDeleteUserConfirm');

      // 6. Save & re-render
      saveState();
      populateStaffFilter();
      renderAll();

      // 7. Success toast with smooth animation
      toast(`Đã xóa tài khoản ${userName} (${userEmail}); yêu cầu sẽ không tự xuất hiện lại.`);
    }
