/**
 * TikTok Shop Live GMV & KPI Center - UI Tab Render Engine (Tabs 1 to 8)
 */

    /* ---------- 9. Render Tab 1: Tổng quan GMV & KPI (Progress Ring + Weekly Bars + Staff List + Storage Alert) ---------- */
    function renderOverview() {
      const allFiltered = filteredSessions();
      const myId = me()?.id;
      const myRole = me()?.role;
      const admin = isAdmin();
      // Người dùng thông thường: Chỉ tính toán số liệu trên các phiên của chính mình (loại trừ phiên chưa phân công)
      const list = admin ? allFiltered : allFiltered.filter(s =>
        s.hostId === myId || s.operatorId === myId ||
        (s.shifts && s.shifts.some(sh => sh.userId === myId || sh.hostId === myId || sh.operatorId === myId)) ||
        (s.manualStaff && s.manualStaff.some(ms => ms.userId === myId || ms.hostId === myId || ms.operatorId === myId))
      );
      const totalGross = list.reduce((a, b) => a + b.grossLiveGmv, 0);
      const skbGross = list.filter(s => s.channel === 'shopkhangbaby').reduce((a, b) => a + b.grossLiveGmv, 0);
      const mksGross = list.filter(s => s.channel === 'mekhangsua').reduce((a, b) => a + b.grossLiveGmv, 0);
      const affGross = list.reduce((a, b) => a + b.affiliateGmv, 0);
      const affiliate = affiliateOverviewSummary();
      const affiliateValue = affiliate.available ? affiliate.gmv : affGross;
      const affiliateKnown = affiliate.available || affGross > 0;
      const totalCombined = totalGross + affiliateValue;
      const pending = list.reduce((a, b) => a + b.pendingRecGmv, 0);
      const cancel = list.reduce((a, b) => a + b.cancelReturnGmv, 0);
      const autoList = list.filter(s => !s.manual);
      const kpiGmv = autoList.reduce((a, b) => a + b.kpiGmv, 0);
      const hostComm = autoList.reduce((a, b) => a + b.hostComm, 0);
      const opComm = autoList.reduce((a, b) => a + b.opComm, 0);
      const targetSum = admin ? list.reduce((a, b) => a + (b.targetGmv || 0), 0) : (me()?.targetGmv || (myRole === 'HOST' ? 1000000000 : 0));

      // 5 KPI cards
      document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi">
          <div class="kpi-top"><div class="kpi-ic p-pink">${ic('video', 18)}</div><div class="kpi-l">Tổng GMV (LIVE + Aff)</div></div>
          <div class="kpi-v num" data-count-to="${totalCombined}" data-format="short" data-anim-key="ov-gross">${short(totalCombined)}</div>
          <div class="kpi-s num"><span>LIVE: <strong>${short(totalGross)}</strong></span><span>Affiliate: <strong>${affiliateKnown ? short(affiliateValue) : 'Chưa đồng bộ'}</strong></span></div>
        </div>
        <div class="kpi">
          <div class="kpi-top"><div class="kpi-ic p-violet">${ic('box', 18)}</div><div class="kpi-l">GMV LIVE Seller</div></div>
          <div class="kpi-v num" data-count-to="${totalGross}" data-format="short" data-anim-key="ov-seller">${short(totalGross)}</div>
          <div class="kpi-s num"><span>Shop: <strong>${short(skbGross)}</strong></span><span>Mẹ Khang Sữa: <strong>${short(mksGross)}</strong></span></div>
        </div>
        <div class="kpi">
          <div class="kpi-top"><div class="kpi-ic p-sky">${ic('zap', 18)}</div><div class="kpi-l">GMV Affiliate riêng</div></div>
          <div class="kpi-v num" id="ovAffiliateGmv" style="color:var(--sky);" ${affiliateKnown ? `data-count-to="${affiliateValue}" data-format="short" data-anim-key="ov-aff"` : ''}>${affiliateKnown ? short(affiliateValue) : 'Chưa đồng bộ'}</div>
          <div class="kpi-s num">${affiliate.available ? `<span>Sau hoàn: <strong>${short(affiliate.netGmv)}</strong></span><span>Hoàn: <strong>-${short(affiliate.refundedGmv)}</strong></span>` : '<span>Theo dữ liệu Affiliate gán phiên</span>'}</div>
        </div>
        <div class="kpi">
          <div class="kpi-top"><div class="kpi-ic p-amber">${ic('truck', 18)}</div><div class="kpi-l">GMV chưa chốt</div></div>
          <div class="kpi-v num" style="color:var(--amber);" data-count-to="${pending}" data-format="short" data-anim-key="ov-pending">${short(pending)}</div>
          <div class="kpi-s num"><span>LIVE chưa kết thúc / đơn chưa nhận</span><span style="color:var(--red);">Hoàn/hủy: <strong>-${short(cancel)}</strong></span></div>
        </div>
        <div class="kpi hl">
          <div class="kpi-top"><div class="kpi-ic p-green">${ic('check', 18)}</div><div class="kpi-l">GMV đã giao &amp; đối soát</div></div>
          <div class="kpi-v num" style="color:var(--pink2);" data-count-to="${kpiGmv}" data-format="short" data-anim-key="ov-kpiGmv">${short(kpiGmv)}</div>
          <div class="kpi-s num">
            ${admin ? `
              <span>Phiên đã kết thúc · khách đã nhận hàng</span>
              <span>Host: <strong>${vnd(hostComm)}</strong> · Op: <strong>${vnd(opComm)}</strong></span>
            ` : (myRole === 'HOST' ? `
              <span>Hoa hồng Host (0,3%): <strong data-count-to="${hostComm}" data-format="vnd" data-anim-key="ov-host">${vnd(hostComm)}</strong></span>
              <span>Tỷ lệ: <strong>0,3%</strong></span>
            ` : `
              <span>Hoa hồng Op (0,1%): <strong data-count-to="${opComm}" data-format="vnd" data-anim-key="ov-op">${vnd(opComm)}</strong></span>
              <span>Tỷ lệ: <strong>0,1%</strong></span>
            `)}
          </div>
        </div>`;

      // Goal Ring Widget (inspired by Premium Goal Tracker & Progress Widget)
      const pct = targetSum > 0 ? Math.min(100, Math.round((kpiGmv / targetSum) * 100)) : 0;
      const r = 68, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
      const remain = Math.max(0, targetSum - kpiGmv);
      document.getElementById('ovGoal').innerHTML = `
        <div class="ring">
          <svg width="170" height="170" viewBox="0 0 170 170">
            <defs><linearGradient id="pkGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F472B6"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient></defs>
            <circle cx="85" cy="85" r="${r}" stroke="#F5E6EE" stroke-width="14" fill="none"/>
            <circle id="ovGoalCircle" class="ring-fill" cx="85" cy="85" r="${r}" stroke="url(#pkGrad)" stroke-width="14" fill="none" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" data-target-off="${off.toFixed(1)}"/>
          </svg>
          <div class="ring-c"><div><div class="ring-v num" data-count-to="${pct}" data-format="pct" data-anim-key="ov-goal-pct">${pct}%</div><div class="ring-l">Đạt Target</div></div></div>
        </div>
        <div class="goal-stats">
          <div class="gs"><div class="gs-ic p-violet">${ic('target', 18)}</div><div><div class="gs-l">Target GMV kỳ lọc</div><div class="gs-v num" data-count-to="${targetSum}" data-format="vnd" data-anim-key="ov-target-sum">${vnd(targetSum)}</div></div></div>
          <div class="gs"><div class="gs-ic p-green">${ic('check', 18)}</div><div><div class="gs-l">GMV đã đối soát (sau hoàn hủy · số thực)</div><div class="gs-v num" style="color:var(--green);" data-count-to="${kpiGmv}" data-format="vnd" data-anim-key="ov-target-rec">${vnd(kpiGmv)}</div></div></div>
          <div class="gs"><div class="gs-ic p-pink">${ic('clock', 18)}</div><div><div class="gs-l">Còn thiếu / Chờ đối soát</div><div class="gs-v num" data-count-to="${remain}" data-format="vnd" data-anim-key="ov-target-remain">${vnd(remain)}</div></div></div>
        </div>`;

      // Weekly Activity Bars (7 recent days in range)
      const days = [];
      const channels = (document.getElementById('fChannel')?.value || 'ALL') === 'ALL' ? ['shopkhangbaby', 'mekhangsua'] : [document.getElementById('fChannel')?.value];
      for (let i = 6; i >= 0; i--) {
        const d = addDays(state.to, -i);
        const daySessions = list.filter(s => s.date === d);
        const liveGmv = daySessions.reduce((a, b) => a + (Number(b.grossLiveGmv) || 0), 0);
        let dayAff = 0;
        if (affiliate.available) {
          dayAff = (state.affiliateDaily || [])
            .filter(day => channels.includes(day.channel) && day.date === d)
            .reduce((total, day) => total + (Number(day.gmv) || 0), 0);
        }
        if (!dayAff) {
          dayAff = daySessions.reduce((a, b) => a + (Number(b.affiliateGmv) || 0), 0);
        }
        const sum = liveGmv + dayAff;
        days.push({ d, sum });
      }
      const maxD = Math.max(...days.map(x => x.sum), 1);
      const peakIdx = days.some(x => x.sum > 0) ? days.reduce((best, x, idx) => x.sum > days[best].sum ? idx : best, 0) : -1;
      const peakPill = document.getElementById('ovPeakPill');
      if (peakPill) {
        peakPill.innerHTML = peakIdx >= 0 && days[peakIdx].sum > 0
          ? `${ic('zap', 12)}Cao nhất: ${fmtDs(days[peakIdx].d)} (${short(days[peakIdx].sum)})`
          : `${ic('zap', 12)}Cao nhất`;
      }
      document.getElementById('ovBars').innerHTML = days.map((x, idx) => {
        const h = Math.max(10, Math.round((x.sum / maxD) * 100));
        return `<div class="bar-col ${idx === peakIdx ? 'peak' : ''}" title="${fmtD(x.d)}: ${vnd(x.sum)}">
          <div class="bar-v num" data-count-to="${x.sum}" data-format="short" data-anim-key="ov-bar-${idx}">${short(x.sum)}</div>
          <div class="bar-track"><div class="bar-fill" data-target-h="${h}%" style="height:0%;"></div></div>
          <div class="bar-d num">${fmtDs(x.d)}</div>
        </div>`;
      }).join('');

      // Premium List UI for Staff KPI Leaderboard
      const allStaff = state.users.filter(u => u.status === 'APPROVED' && (u.role === 'HOST' || u.role === 'OPERATOR'));
      const staff = admin ? allStaff : allStaff.filter(u => u.id === myId);
      const stats = staff.map(u => {
        let sesCnt = 0, gmv = 0, comm = 0;
        autoList.forEach(s => {
          if (u.role === 'HOST' && s.hostId === u.id) { sesCnt++; gmv += s.kpiGmv; comm += s.hostComm; }
          if (u.role === 'OPERATOR' && s.operatorId === u.id) { sesCnt++; gmv += s.kpiGmv; comm += s.opComm; }
        });
        return { u, sesCnt, gmv, comm, rate: u.role === 'HOST' ? '0,3%' : '0,1%' };
      }).sort((a, b) => b.comm - a.comm);

      document.getElementById('ovStaffList').innerHTML = stats.map(st => `
        <div class="pli ${ovStaffActive === st.u.id ? 'active' : ''}" onclick="ovStaffActive='${st.u.id}';document.getElementById('fStaff').value='${st.u.id}';resetPagesAndRender();">
          ${avatarHtml(st.u)}
          <div class="pli-main">
            <div class="pli-name">${esc(st.u.name)} <span class="pli-role ${st.u.role === 'OPERATOR' ? 'op' : ''}">• ${ROLE[st.u.role].label} (${st.rate})</span></div>
            <div class="pli-sub num" style="flex-wrap:wrap;gap:2px 6px;">
              <span style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;" title="${esc(st.u.email)}">${ic('mail', 12)}${esc(st.u.email)}</span>
              <span>· <strong>${st.sesCnt} phiên</strong></span>
              <span>· GMV: <strong>${short(st.gmv)}</strong></span>
            </div>
          </div>
          <div class="pli-right">
            <span class="pill p-green num" style="font-size:12px;">${vnd(st.comm)}</span>
            ${ic('chevR', 18)}
          </div>
        </div>`).join('');

      // Channel breakdown bars & Organic Shop Orders
      const totalAll = Math.max(1, totalGross + affGross);
      const shopOrdersInRange = (state.shopOrders || []).filter(o => o.date >= state.from && o.date <= state.to);
      const shopDeliveredNet = shopOrdersInRange.filter(o => o.status === 'DELIVERED').reduce((a, b) => a + (b.amount - b.refund), 0);
      const shopGross = shopOrdersInRange.reduce((a, b) => a + b.amount, 0);
      const totalStoreRevenue = totalGross + affGross + shopGross;
      const organicPct = totalStoreRevenue > 0 ? Math.round((shopGross / totalStoreRevenue) * 100) : 0;

      const rows = [
        { name: 'GMV LIVE từ shopkhangbaby (Kênh nội bộ 1)', val: skbGross, pct: Math.round(skbGross / totalAll * 100), cls: '' },
        { name: 'GMV LIVE từ mekhangsua (Kênh nội bộ 2)', val: mksGross, pct: Math.round(mksGross / totalAll * 100), cls: 'ok' },
        { name: 'GMV Affiliate gán theo phiên (tính KPI)', val: affGross, pct: Math.round(affGross / totalAll * 100), cls: 'warn' },
        { name: 'GMV đã đối soát LIVE (Sau hoàn hủy · tính KPI)', val: kpiGmv, pct: Math.min(100, Math.round(kpiGmv / totalAll * 100)), cls: '' },
        { name: '🏪 Đơn Shop tự ra ngoài Live (shopkhangbaby · 0% KPI)', val: shopGross, pct: organicPct, cls: 'ok', note: `Thực nhận: ${short(shopDeliveredNet)} (${shopOrdersInRange.length} đơn)` }
      ];
      document.getElementById('ovChannels').innerHTML = rows.map((r, idx) => `
        <div style="background:#FCF8FA;border:1px solid var(--line2);border-radius:13px;padding:10px 12px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;font-weight:700;margin-bottom:6px;font-size:12px;flex-wrap:wrap;">
            <span style="flex:1 1 160px;min-width:0;word-break:break-word;">${r.name} ${r.note ? `<span class="pill p-green" style="font-size:10px;height:18px;margin-left:4px;">${r.note}</span>` : ''}</span>
            <span class="num" style="flex-shrink:0;"><span data-count-to="${r.val}" data-format="vnd" data-anim-key="ov-ch-val-${idx}">${vnd(r.val)}</span> (<span data-count-to="${r.pct}" data-format="pct" data-anim-key="ov-ch-pct-${idx}">${r.pct}%</span>)</span>
          </div>
          <div class="prog ${r.cls}"><span data-target-w="${r.pct}%" style="width:0%;"></span></div>
        </div>`).join('');

      // Show storage alert banner on Overview for Admin if any provider >= threshold and not dismissed
      const ovAlert = document.getElementById('ovStorageAlert');
      if (isAdmin()) {
        const nbRet = document.getElementById('nbReturns15d');
      if (nbRet) {
        const inRangeReturns = (state.returns15d || []).filter(r => r.returnDate >= state.from && r.returnDate <= state.to);
        nbRet.textContent = inRangeReturns.length;
      }
      const worst = worstQuotaMetric();
        if (worst && worst.pct >= state.storage.threshold && !isStorageAlertDismissed()) {
          ovAlert.innerHTML = `
            <div class="desk-only-alert">${buildSystemAlertWidget(worst, true)}</div>
            <div class="mob-alert-bar">
              <span style="color:var(--red);display:grid;place-items:center;">${ic('db', 16)}</span>
              <div style="flex:1;min-width:0;line-height:1.3;">
                <strong style="color:var(--red);">${worst.prov.name} ${worst.pctLabel}</strong> · Sắp chạm hạn mức miễn phí
              </div>
              <button type="button" class="btn btn-ghost sm" style="height:28px;padding:0 8px;font-size:11px;" onclick="switchTab('TAB_STORAGE')">Chi tiết</button>
              <button type="button" class="icon-btn" style="width:26px;height:26px;border-radius:8px;" onclick="dismissStorageAlert(event)" aria-label="Ẩn">${ic('x', 13)}</button>
            </div>`;
          hydrateIcons(ovAlert);
        } else {
          ovAlert.innerHTML = '';
        }
      } else {
        ovAlert.innerHTML = '';
      }

      // Daily Motivational Frame: Chuyển sang hiển thị kiểu popup khi đã đạt Target (kèm pháo giấy bắn lên)
      // Không đạt -> Tuyệt đối không hiện. Đã tắt đi -> Chỉ hiện 1 lần, không hiện lại nữa.
      const ovMotEl = document.getElementById('ovHostMotivation');
      if (ovMotEl) {
        ovMotEl.innerHTML = '';
      }
      checkAndTriggerTargetCelebration(list);
    }

    /* ---------- 10. Render Tab 2: Đối soát phiên LIVE & Phân công thủ công + Chế độ Campaign/Mega Live ---------- */
    function renderSessions() {
      const q = (document.getElementById('sesSearch')?.value || '').trim().toLowerCase();
      const f = document.getElementById('sesFilter')?.value || 'ALL';
      const base = filteredSessions().filter(s => {
        if (f === 'RECONCILED' && !isSessionReconciled(s)) return false;
        if (f === 'PENDING_REC' && isSessionReconciled(s)) return false;
        if (f === 'UNASSIGNED' && (s.manual || (s.hostId && s.operatorId))) return false;
        if (f === 'MANUAL' && !s.isManualKpi) return false;
        if (f === 'OVERLAP' && !s.overlap) return false;
        if (q) {
          const hName = userById(s.hostId)?.name || '';
          const oName = userById(s.operatorId)?.name || '';
          const shiftNames = (s.shifts || []).map(sh => userById(sh.userId)?.name || '').join(' ');
          const hay = `${s.id} ${s.channel} ${s.date} ${s.slot} ${hName} ${oName} ${shiftNames}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      // 4 Summary KPIs for Session Reconciliation
      const sesKpisEl = document.getElementById('sesKpis');
      const admin = isAdmin();
      const myUser = me();
      const myId = myUser?.id;
      const myRole = myUser?.role;
      if (sesKpisEl) {
        const myBase = admin ? base : base.filter(s =>
          s.hostId === myId || s.operatorId === myId ||
          (s.shifts && s.shifts.some(sh => sh.userId === myId || sh.hostId === myId || sh.operatorId === myId)) ||
          (s.manualStaff && s.manualStaff.some(ms => ms.userId === myId || ms.hostId === myId || ms.operatorId === myId))
        );
        const totGrossAff = myBase.reduce((a, b) => a + b.grossLiveGmv + b.affiliateGmv, 0);
        const totPending = myBase.reduce((a, b) => a + b.pendingRecGmv, 0);
        const totLoss = myBase.reduce((a, b) => a + b.cancelReturnGmv + (b.dedup || 0), 0);
        const totRec = myBase.reduce((a, b) => a + b.kpiGmv, 0);
        const recCount = myBase.filter(isSessionReconciled).length;
        const pendCount = myBase.filter(s => !isSessionReconciled(s)).length;

        sesKpisEl.innerHTML = `
          <div class="kpi"><div class="kpi-top"><div class="kpi-ic p-violet">${ic('video', 18)}</div><div class="kpi-l">${admin ? 'Tổng GMV LIVE + Aff' : 'GMV LIVE + Aff của bạn'}</div></div><div class="kpi-v num" data-count-to="${totGrossAff}" data-format="vnd" data-anim-key="ses-gross">${vnd(totGrossAff)}</div><div class="kpi-s num"><span>${myBase.length} phiên LIVE</span><span>shopkhangbaby · mekhangsua</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-ic p-amber">${ic('truck', 18)}</div><div class="kpi-l">GMV chờ đối soát phiên</div></div><div class="kpi-v num" style="color:var(--amber);" data-count-to="${totPending}" data-format="vnd" data-anim-key="ses-pending">${vnd(totPending)}</div><div class="kpi-s num"><span>${pendCount} phiên chưa chốt</span><span>Kết thúc LIVE + khách nhận hàng</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-ic p-red">${ic('refresh', 18)}</div><div class="kpi-l">Hoàn hủy &amp; chống trùng</div></div><div class="kpi-v num" style="color:var(--red);" data-count-to="${totLoss}" data-format="signed_vnd" data-anim-key="ses-loss">-${vnd(totLoss)}</div><div class="kpi-s num"><span>Khớp giờ 1 kênh</span><span>Chống trùng 2 kênh</span></div></div>
          <div class="kpi hl" style="border:1.5px solid #10B981;box-shadow:0 3px 12px rgba(16,185,129,0.15);"><div class="kpi-top"><div class="kpi-ic p-green">${ic('check', 18)}</div><div class="kpi-l" style="color:#047857;font-weight:800;">${admin ? 'GMV ĐÃ ĐỐI SOÁT XONG' : 'GMV ĐÃ ĐỐI SOÁT CỦA BẠN'}</div></div><div class="kpi-v num" style="color:#047857;" data-count-to="${totRec}" data-format="vnd" data-anim-key="ses-rec">${vnd(totRec)}</div><div class="kpi-s num"><span style="color:#059669;font-weight:700;">✓ ${recCount}/${myBase.length} phiên xong 100%</span><span>Đã khóa chốt KPI</span></div></div>`;
      }

      document.getElementById('nbSessions').textContent = base.length;
      const pg = paginate('ses', base);
      const hosts = state.users.filter(u => u.status === 'APPROVED' && u.role === 'HOST');
      const ops = state.users.filter(u => u.status === 'APPROVED' && u.role === 'OPERATOR');

      document.getElementById('sesBody').innerHTML = pg.rows.map(s => {
        const isReconciled = isSessionReconciled(s);
        const stPill = isReconciled
          ? `<span class="badge-reconciled" title="Phiên này đã giao hàng và đối soát hoàn tất 100% · Số thực chốt KPI"><i data-ic="check-circle" data-s="14"></i>ĐÃ ĐỐI SOÁT 100%</span>`
          : `<span class="pill p-amber" style="font-size:10.5px;height:24px;padding:0 8px;gap:5px;font-weight:700;border:1px dashed #F59E0B;background:#FFFBEB;color:#B45309;" title="Tự động đối soát khi đơn chuyển sang Đã giao (DELIVERED)"><i data-ic="clock" data-s="12"></i>Chờ nhận hàng (${short(s.pendingRecGmv)})</span>`;
        const dedupBadge = `
          <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start;">
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
              ${stPill}
              ${s.overlap
                ? `<span class="pill p-sky" style="font-size:10px;height:20px;">2 kênh · Chống trùng</span>`
                : `<span class="pill p-gray" style="font-size:10px;height:20px;">1 kênh · Khớp giờ</span>`}
            </div>
            <button type="button" class="btn btn-ghost sm" style="height:24px;padding:0 8px;font-size:11px;" onclick="openSessionReconcile('${s.id}')"><i data-ic="search" data-s="12"></i>Chi tiết ĐS</button>
          </div>`;

        const manualCell = `
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:${admin ? 'pointer' : 'not-allowed'};font-weight:700;font-size:12px;">
              <input type="checkbox" class="chk" ${s.isManualKpi ? 'checked' : ''} ${admin ? '' : 'disabled'} onchange="toggleManualKpi('${s.id}', this.checked)" />
              <span>KPI thủ công</span>
            </label>
            ${s.isManualKpi ? `
              <select class="sel sm" style="border-color:var(--pink);font-weight:700;" ${admin ? '' : 'disabled'} onchange="setManualType('${s.id}', this.value)">
                <option value="CAMPAIGN" ${s.manualKpiType === 'CAMPAIGN' ? 'selected' : ''}>Ngày Campaign</option>
                <option value="MEGA_LIVE" ${s.manualKpiType === 'MEGA_LIVE' ? 'selected' : ''}>Mega Live</option>
              </select>` : ''}
          </div>`;

        // Phiên chỉ hoàn tất khi có CẢ Host VÀ Operator (hoặc người dùng bấm Ẩn xuống)
        const isAssigned = !!(s.hostId && s.operatorId);
        const isEditing = !!(state.editingSessions && state.editingSessions[s.id]);
        const hostUser = state.users.find(u => u.id === s.hostId);
        const opUser = state.users.find(u => u.id === s.operatorId);

        let assignCell = '';
        if (s.isManualKpi) {
          const staffCount = (s.manualStaff || []).length;
          const staffTags = renderManualStaffBadges(s);

          assignCell = `
            <div class="assign-done-box" style="flex-direction:column;align-items:stretch;gap:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <span class="pill p-amber" style="font-size:10px;height:20px;">
                  <span class="dot"></span>${s.manualKpiType === 'MEGA_LIVE' ? 'Mega Live' : 'Campaign'} (${staffCount} ca)
                </span>
                <button type="button" class="btn-edit-assign" style="height:24px;padding:0 8px;font-size:10.5px;" onclick="openManualStaffModal('${s.id}')">
                  <i data-ic="users" data-s="11"></i><span>Phân bổ</span>
                </button>
              </div>
              ${staffTags}
            </div>`;
        } else if (isAssigned && !isEditing) {
          assignCell = `
            <div class="assign-done-box">
              <div class="assign-done-info">
                <div class="assign-done-row host">
                  <span class="tag">Host:</span>
                  ${hostUser ? `<strong>${esc(hostUser.name)}</strong> <span class="muted num" style="font-size:10px;">${admin || myRole === 'HOST' ? `(0,3% · ${vnd(s.hostComm)})` : '(0,3%)'}</span>` : `<span class="muted" style="font-size:11px;">Chưa chọn</span>`}
                </div>
                <div class="assign-done-row op">
                  <span class="tag">Op:</span>
                  ${opUser ? `<strong>${esc(opUser.name)}</strong> <span class="muted num" style="font-size:10px;">${admin || myRole === 'OPERATOR' ? `(0,1% · ${vnd(s.opComm)})` : '(0,1%)'}</span>` : `<span class="muted" style="font-size:11px;">Chưa chọn</span>`}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;">
                ${admin ? `
                  <button type="button" class="btn-edit-assign" onclick="toggleEditSessionAssign('${s.id}', true)" title="Sửa phân công Host / Op cho phiên này">
                    ${ic('edit', 12)}<span>Sửa</span>
                  </button>` : ''}
              </div>
            </div>`;
        } else {
          const hostDisabled = !admin && !!s.hostId;
          const opDisabled = !admin && !!s.operatorId;
          assignCell = `
            <div class="assign-edit-form">
              <select class="sel sm" style="${!s.hostId ? 'border-color:#F59E0B;background:#FFFBEB;' : (hostDisabled ? 'opacity:0.85;cursor:not-allowed;' : '')}" ${hostDisabled ? 'disabled' : ''} onchange="onAssignStaff('${s.id}','HOST',this.value)" title="${hostDisabled ? 'Host đã chọn · Không chọn lại được (Chỉ Admin mới sửa được)' : 'Chọn Host Livestream (0,3%)'}">
                <option value="">-- Chọn Host (0,3%) --</option>
                ${hosts.map(h => `<option value="${h.id}" ${s.hostId === h.id ? 'selected' : ''}>Host: ${esc(h.name)}</option>`).join('')}
              </select>
              <select class="sel sm" style="${!s.operatorId ? 'border-color:#F59E0B;background:#FFFBEB;' : (opDisabled ? 'opacity:0.85;cursor:not-allowed;' : '')}" ${opDisabled ? 'disabled' : ''} onchange="onAssignStaff('${s.id}','OP',this.value)" title="${opDisabled ? 'Operator đã chọn · Không chọn lại được (Chỉ Admin mới sửa được)' : 'Chọn Operator (0,1%)'}">
                <option value="">-- Chọn Operator (0,1%) --</option>
                ${ops.map(o => `<option value="${o.id}" ${s.operatorId === o.id ? 'selected' : ''}>Op: ${esc(o.name)}</option>`).join('')}
              </select>
              <div class="assign-edit-foot" style="justify-content:flex-end;">
                <button type="button" class="btn-done-assign" onclick="toggleEditSessionAssign('${s.id}', false)" title="Hoàn tất và ẩn thao tác xuống">
                  ${ic('check', 11)}<span>Ẩn xuống</span>
                </button>
              </div>
            </div>`;
        }

        let kpiCell = '';
        if (s.isManualKpi) {
          const myContrib = getStaffManualContribution(s, myId, true);
          const bonusVal = admin ? (s.manualKpiBonus || 0) : myContrib.bonus;
          const staffCount = (s.manualStaff || []).length;
          kpiCell = `
            <div class="num" style="font-weight:800;color:var(--pink2);">${admin ? `Thưởng: ${vnd(bonusVal)}` : `Thưởng của bạn: ${vnd(bonusVal)}`}</div>
            <span class="pill p-amber" style="font-size:9.5px;height:18px;margin-top:2px;">KPI thủ công ${admin ? `(${staffCount} người)` : ''}</span>
            ${isReconciled ? `<div style="font-size:9.5px;color:#059669;font-weight:800;margin-top:2px;">✓ Đã chốt số thực</div>` : ''}`;
        } else {
          if (admin) {
            kpiCell = `
              <div class="num" style="font-weight:800;color:var(--pink2);">H: ${vnd(s.hostComm)}</div>
              <div class="num" style="font-size:11.5px;color:var(--violet-ink);font-weight:700;">Op: ${vnd(s.opComm)}</div>
              ${isReconciled
                ? `<span class="pill p-green" style="font-size:9.5px;height:18px;margin-top:2px;font-weight:800;"><i data-ic="check" data-s="10"></i>Đã chốt thực</span>`
                : `<span class="pill p-amber" style="font-size:9.5px;height:18px;margin-top:2px;font-weight:700;"><span class="dot"></span>Tạm tính</span>`}`;
          } else if (myRole === 'HOST') {
            kpiCell = `
              <div class="num" style="font-weight:800;color:var(--pink2);">Hoa hồng: ${vnd(s.hostComm)}</div>
              <span class="pill p-pink" style="font-size:9.5px;height:18px;margin-top:2px;">Host (0,3%)</span>
              ${isReconciled
                ? `<div style="font-size:9.5px;color:#059669;font-weight:800;margin-top:2px;">✓ Đã chốt thực</div>`
                : `<div style="font-size:9.5px;color:var(--amber);font-weight:700;margin-top:2px;">⏳ Đang tạm tính</div>`}`;
          } else {
            kpiCell = `
              <div class="num" style="font-weight:800;color:var(--violet-ink);">Hoa hồng: ${vnd(s.opComm)}</div>
              <span class="pill p-violet" style="font-size:9.5px;height:18px;margin-top:2px;">Operator (0,1%)</span>
              ${isReconciled
                ? `<div style="font-size:9.5px;color:#059669;font-weight:800;margin-top:2px;">✓ Đã chốt thực</div>`
                : `<div style="font-size:9.5px;color:var(--amber);font-weight:700;margin-top:2px;">⏳ Đang tạm tính</div>`}`;
          }
        }

        const kpiGmvCell = isReconciled
          ? `<div style="display:inline-flex;flex-direction:column;align-items:flex-end;">
              <span class="badge-reconciled-val" title="GMV đã đối soát xong 100% · Đã chốt số thực">
                <i data-ic="check-circle" data-s="12"></i>${vnd(s.kpiGmv)}
              </span>
              <span style="font-size:9.5px;color:#059669;font-weight:800;margin-top:2px;">✓ Đã chốt thực 100%</span>
            </div>`
          : `<div style="display:inline-flex;flex-direction:column;align-items:flex-end;">
              <span style="font-weight:700;color:var(--text);font-size:12.5px;">${vnd(s.kpiGmv)}</span>
              <span style="font-size:9.5px;color:var(--amber);font-weight:700;margin-top:2px;"><i data-ic="clock" data-s="9"></i> Chờ ${short(s.pendingRecGmv)}</span>
            </div>`;

        const rowClass = isReconciled ? 'row-reconciled' : 'row-pending';

        return `<tr class="${rowClass}">
          <td>
            <div style="font-weight:800;display:flex;align-items:center;gap:6px;" class="num">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isReconciled ? '#10B981' : '#F59E0B'};box-shadow:0 0 0 2px ${isReconciled ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'};" title="${isReconciled ? 'Đã đối soát 100%' : 'Chờ đối soát'}"></span>
              <span>${fmtD(s.date)} · ${s.slot}</span>
            </div>
            <div style="margin-top:3px;"><span class="pill ${s.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}">${s.channel}</span></div>
          </td>
          <td class="r num" style="font-weight:700;white-space:nowrap;">${formatLiveMinutes(sessionDurationMinutes(s))}</td>
          <td>${dedupBadge}</td>
          <td class="r num" style="font-weight:700;">${vnd(s.grossLiveGmv)}</td>
          <td class="r num" style="color:var(--sky);font-weight:700;">${vnd(s.affiliateGmv)}</td>
          <td class="r num"><div style="color:var(--amber);font-weight:700;">Chờ: ${short(s.pendingRecGmv)}</div><div style="color:var(--red);font-size:11px;">Hoàn/hủy: -${short(s.cancelReturnGmv)}</div></td>
          <td class="r num">${kpiGmvCell}</td>
          <td>${manualCell}</td>
          <td>${assignCell}</td>
          <td class="r">${kpiCell}</td>
        </tr>`;
      }).join('');

      document.getElementById('sesMobile').innerHTML = pg.rows.map(s => {
        const isReconciled = isSessionReconciled(s);
        const stPill = isReconciled
          ? `<span class="pill p-green"><i data-ic="check-circle" data-s="12"></i>Đã đối soát</span>`
          : `<span class="pill p-amber" title="Tự động đối soát khi đơn chuyển Đã giao"><i data-ic="clock" data-s="11"></i>Chờ đối soát ${short(s.pendingRecGmv)}</span>`;
        const dedupPill = s.overlap
          ? `<span class="pill p-sky">2 kênh trùng giờ</span>`
          : '';

        const isAssigned = !!(s.hostId && s.operatorId);
        const isEditing = !!(state.editingSessions && state.editingSessions[s.id]);
        const hostUser = state.users.find(u => u.id === s.hostId);
        const opUser = state.users.find(u => u.id === s.operatorId);

        let mAssignCell = '';
        if (s.isManualKpi) {
          const staffCount = (s.manualStaff || []).length;
          const staffTags = renderManualStaffBadges(s);

          mAssignCell = `
            <div class="assign-done-box" style="flex-direction:column;align-items:stretch;gap:6px;margin-top:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <span class="pill p-amber" style="font-size:10px;height:20px;">
                  <span class="dot"></span>${s.manualKpiType === 'MEGA_LIVE' ? 'Mega Live' : 'Campaign'} (${staffCount} ca)
                </span>
                <div style="display:flex;gap:4px;">
                  <button type="button" class="btn-edit-assign" style="height:24px;padding:0 8px;font-size:10.5px;" onclick="openManualStaffModal('${s.id}')">
                    <i data-ic="users" data-s="11"></i><span>Phân bổ</span>
                  </button>
                  <button type="button" class="btn btn-soft sm" style="height:24px;padding:0 6px;font-size:10px;" onclick="switchTab('TAB_MANUAL_KPI')">KPI T.Công</button>
                </div>
              </div>
              ${staffTags}
            </div>`;
        } else if (isAssigned && !isEditing) {
          mAssignCell = `
            <div class="assign-done-box" style="margin-top:6px;">
              <div class="assign-done-info">
                <div class="assign-done-row host">
                  <span class="tag">Host (0,3%):</span>
                  ${hostUser ? `<strong>${esc(hostUser.name)}</strong> ${admin || myRole === 'HOST' ? `<span class="num muted" style="font-size:10.5px;">(${vnd(s.hostComm)})</span>` : ''}` : `<span class="muted">Chưa chọn</span>`}
                </div>
                <div class="assign-done-row op">
                  <span class="tag">Op (0,1%):</span>
                  ${opUser ? `<strong>${esc(opUser.name)}</strong> ${admin || myRole === 'OPERATOR' ? `<span class="num muted" style="font-size:10.5px;">(${vnd(s.opComm)})</span>` : ''}` : `<span class="muted">Chưa chọn</span>`}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;flex-shrink:0;">
                ${admin ? `
                  <button type="button" class="btn-edit-assign" onclick="toggleEditSessionAssign('${s.id}', true)">
                    ${ic('edit', 12)}<span>Sửa</span>
                  </button>` : ''}
              </div>
            </div>`;
        } else {
          const mHostDisabled = !admin && !!s.hostId;
          const mOpDisabled = !admin && !!s.operatorId;
          mAssignCell = `
            <div class="assign-edit-form" style="margin-top:6px;">
              <div>
                <select class="sel sm" style="width:100%;height:32px;font-size:11.5px;${!s.hostId ? 'border-color:#F59E0B;background:#FFFBEB;' : (mHostDisabled ? 'opacity:0.85;cursor:not-allowed;' : '')}" ${mHostDisabled ? 'disabled' : ''} onchange="onAssignStaff('${s.id}','HOST',this.value)" title="${mHostDisabled ? 'Host đã chọn · Không chọn lại được (Chỉ Admin mới sửa được)' : 'Chọn Host Livestream (0,3%)'}">
                  <option value="">-- Chọn Host (0,3%) --</option>
                  ${hosts.map(h => `<option value="${h.id}" ${s.hostId === h.id ? 'selected' : ''}>Host: ${esc(h.name)}</option>`).join('')}
                </select>
              </div>
              <div>
                <select class="sel sm" style="width:100%;height:32px;font-size:11.5px;${!s.operatorId ? 'border-color:#F59E0B;background:#FFFBEB;' : (mOpDisabled ? 'opacity:0.85;cursor:not-allowed;' : '')}" ${mOpDisabled ? 'disabled' : ''} onchange="onAssignStaff('${s.id}','OP',this.value)" title="${mOpDisabled ? 'Operator đã chọn · Không chọn lại được (Chỉ Admin mới sửa được)' : 'Chọn Operator (0,1%)'}">
                  <option value="">-- Chọn Operator (0,1%) --</option>
                  ${ops.map(o => `<option value="${o.id}" ${s.operatorId === o.id ? 'selected' : ''}>Op: ${esc(o.name)}</option>`).join('')}
                </select>
              </div>
              <div class="assign-edit-foot" style="justify-content:flex-end;">
                <button type="button" class="btn-done-assign" onclick="toggleEditSessionAssign('${s.id}', false)" title="Hoàn tất và ẩn thao tác xuống">
                  ${ic('check', 11)}<span>Ẩn xuống</span>
                </button>
              </div>
            </div>`;
        }

        const assignmentStatus=s.isManualKpi?'KPI thủ công':isAssigned?'Đã phân công':'Chưa phân công';
        return `<div class="m-card session-mobile-card ${isReconciled ? 'card-reconciled' : 'card-pending'}">
          <header class="session-card-head">
            <div class="session-card-title">
              <span class="pill ${s.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}">${s.channel}</span>
              <strong class="num" style="font-size:12px;">${fmtDs(s.date)} · ${s.slot}</strong>
            </div>
            ${stPill}
          </header>
          <div class="session-card-meta"><span>${formatLiveMinutes(sessionDurationMinutes(s))}</span>${dedupPill}</div>
          <div class="m-grid4 num">
            <div><span class="k">GMV LIVE</span><span class="v">${short(s.grossLiveGmv)}</span></div>
            <div><span class="k">Affiliate</span><span class="v" style="color:var(--sky);">${short(s.affiliateGmv)}</span></div>
            <div><span class="k">GMV KPI</span><span class="v" style="color:${isReconciled?'var(--green)':'var(--amber)'};">${short(s.kpiGmv)}</span></div>
            <div><span class="k">Hoàn/hủy</span><span class="v" style="color:var(--red);">-${short(s.cancelReturnGmv)}</span></div>
          </div>
          <div class="session-card-actions"><button type="button" class="btn btn-ghost sm" onclick="openSessionReconcile('${s.id}')"><i data-ic="search" data-s="12"></i>Chi tiết</button></div>
          <details class="session-card-controls"${isEditing?' open':''}>
            <summary><span>Phân công &amp; KPI</span><span class="pill ${isAssigned?'p-green':'p-amber'}">${assignmentStatus}</span></summary>
            <div class="session-card-controls-body">
              <label class="session-manual-kpi" style="cursor:${admin ? 'pointer' : 'not-allowed'};">
                <input type="checkbox" class="chk" ${s.isManualKpi ? 'checked' : ''} ${admin ? '' : 'disabled'} onchange="toggleManualKpi('${s.id}', this.checked)" />
                <span>KPI thủ công (Campaign / Mega)</span>
              </label>
              ${s.isManualKpi ? `
                <select class="sel sm" ${admin ? '' : 'disabled'} onchange="setManualType('${s.id}', this.value)">
                  <option value="CAMPAIGN" ${s.manualKpiType === 'CAMPAIGN' ? 'selected' : ''}>Ngày Campaign</option>
                  <option value="MEGA_LIVE" ${s.manualKpiType === 'MEGA_LIVE' ? 'selected' : ''}>Mega Live</option>
                </select>` : ''}
              ${mAssignCell}
            </div>
          </details>
        </div>`;
      }).join('');

      document.getElementById('sesInfo').textContent = `Hiển thị ${pg.from}–${pg.to} trên ${pg.total} phiên LIVE`;
      document.getElementById('sesPager').innerHTML = pagerHtml('ses', pg);
    }

    function toggleEditSessionAssign(id, isEditing) {
      if (isEditing && !isAdmin()) {
        const s = state.sessions.find(x => x.id === id);
        if (s && s.hostId && s.operatorId) {
          toast('🔒 Phiên đã phân công xong. Chỉ Admin mới có quyền mở lại để sửa!');
          return;
        }
      }
      if (!state.editingSessions) state.editingSessions = {};
      state.editingSessions[id] = isEditing;
      saveState();
      renderSessions();
      if (!isEditing) {
        const s = state.sessions.find(x => x.id === id);
        const hUser = state.users.find(u => u.id === s?.hostId);
        const opUser = state.users.find(u => u.id === s?.operatorId);
        toast(`Đã lưu phân công (Host: ${hUser ? hUser.name : 'Chưa chọn'} · Op: ${opUser ? opUser.name : 'Chưa chọn'}) · Đã ẩn xuống`);
      }
    }
    function onAssignStaff(id, kind, uid) {
      const s = state.sessions.find(x => x.id === id);
      if (!s) return;
      if (!isAdmin()) {
        if (kind === 'HOST' && s.hostId && s.hostId !== uid) {
          toast('🔒 Host đã được chọn trước đó. Không thể chọn lại (Chỉ Admin mới có quyền sửa)!');
          return;
        }
        if (kind === 'OP' && s.operatorId && s.operatorId !== uid) {
          toast('🔒 Operator đã được chọn trước đó. Không thể chọn lại (Chỉ Admin mới có quyền sửa)!');
          return;
        }
      }
      if (kind === 'HOST') s.hostId = uid;
      else s.operatorId = uid;

      // Giữ phiên ở chế độ đang sửa (editing = true) để KHÔNG bị tự động ẩn xuống trước khi chọn xong cả Host & Operator
      if (!state.editingSessions) state.editingSessions = {};
      state.editingSessions[id] = true;

      saveState();
      renderAll();

      const hUser = state.users.find(u => u.id === s.hostId);
      const opUser = state.users.find(u => u.id === s.operatorId);

      if (kind === 'HOST') {
        if (!s.operatorId) {
          toast(`Đã chọn Host: ${hUser ? hUser.name : '—'} · Vui lòng chọn tiếp Trợ lý Vận hành (Operator)`);
        } else {
          toast(`Đã chọn Host: ${hUser ? hUser.name : '—'} · Đã khóa chọn lại (Chỉ Admin sửa) · Bấm "Ẩn xuống" khi hoàn tất`);
        }
      } else {
        if (!s.hostId) {
          toast(`Đã chọn Operator: ${opUser ? opUser.name : '—'} · Vui lòng chọn tiếp Host Livestream`);
        } else {
          toast(`Đã chọn Operator: ${opUser ? opUser.name : '—'} · Đã khóa chọn lại (Chỉ Admin sửa) · Bấm "Ẩn xuống" khi hoàn tất`);
        }
      }
    }
    function assignStaff(id, kind, uid) {
      const s = state.sessions.find(x => x.id === id); if (!s) return;
      if (!isAdmin()) {
        if (kind === 'HOST' && s.hostId && s.hostId !== uid) {
          toast('🔒 Host đã được chọn trước đó. Không thể chọn lại (Chỉ Admin mới có quyền sửa)!');
          return;
        }
        if (kind === 'OP' && s.operatorId && s.operatorId !== uid) {
          toast('🔒 Operator đã được chọn trước đó. Không thể chọn lại (Chỉ Admin mới có quyền sửa)!');
          return;
        }
      }
      if (kind === 'HOST') s.hostId = uid; else s.operatorId = uid;
      if (!state.editingSessions) state.editingSessions = {};
      state.editingSessions[id] = true;
      saveState(); renderAll(); toast(`Đã phân công ${kind === 'HOST' ? 'Host' : 'Operator'} cho phiên LIVE`);
    }
    function toggleManualKpi(id, checked) {
      if (!isAdmin()) { toast('Chỉ Admin mới có quyền chuyển đổi phiên sang KPI thủ công!'); return; }
      const s = state.sessions.find(x => x.id === id); if (!s) return;
      s.isManualKpi = checked;
      if (checked && !s.manualKpiType) s.manualKpiType = 'CAMPAIGN';
      saveState(); renderAll();
      toast(checked ? 'Đã ẩn 2 ô Host/Op tự động và chuyển sang KPI thủ công' : 'Đã bật lại tính KPI tự động cho phiên LIVE');
    }
    function setManualType(id, type) {
      if (!isAdmin()) { toast('Chỉ Admin mới có quyền thay đổi loại phân bổ phiên!'); return; }
      const s = state.sessions.find(x => x.id === id); if (!s) return;
      s.manualKpiType = type || 'CAMPAIGN'; saveState(); renderAll();
      toast(`Đã đổi phiên LIVE sang ${type === 'MEGA_LIVE' ? 'Mega Live' : 'Ngày Campaign'}`);
    }
    function scanReconcileSessions() {
      toast('Hệ thống tự động đối soát 100% khi người mua nhận hàng (DELIVERED). Không cho thao tác thủ công để tránh sai lệch số liệu!');
    }
    function reconcileOneSession(id) {
      toast('Toàn bộ đơn hàng của phiên được tự động đối soát khi người mua nhận hàng thành công, không cho can thiệp thủ công.');
    }
    function openSessionReconcile(id) {
      const s = computeAll().find(x => x.id === id);
      if (!s) return;
      const admin = isAdmin();
      const myUser = me();
      const myId = myUser?.id;
      const myRole = myUser?.role;

      if (!admin) {
        const isMySession = s.hostId === myId || s.operatorId === myId ||
          (s.shifts && s.shifts.some(sh => sh.userId === myId || sh.hostId === myId || sh.operatorId === myId)) ||
          (s.manualStaff && s.manualStaff.some(ms => ms.userId === myId || ms.hostId === myId || ms.operatorId === myId));
        if (!isMySession) {
          toast('🔒 Quyền riêng tư: Bạn chỉ có thể xem chi tiết đối soát phiên của chính mình!');
          return;
        }
      }

      const matchedOrders = state.orders.filter(o => o.sessionId === s.id);
      const isPending = s.pendingRecGmv > 0;
      const h = userById(s.hostId)?.name || 'Chưa chọn Host';
      const o = userById(s.operatorId)?.name || 'Chưa chọn Op';

      document.getElementById('sessionRecCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line2);margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="card-ic" style="background:var(--pink-soft);color:var(--pink2);">${ic('video', 22)}</div>
            <div>
              <div style="font-size:16px;font-weight:800;">Đối soát phiên LIVE</div>
              <div class="muted">${s.channel} · ${fmtD(s.date)} (${s.slot}) · ${formatLiveMinutes(sessionDurationMinutes(s))}</div>
            </div>
          </div>
          ${isPending
            ? `<span class="pill p-amber" style="font-size:11.5px;font-weight:700;height:28px;padding:0 10px;gap:6px;border:1px dashed #F59E0B;"><i data-ic="clock" data-s="13"></i>Chờ nhận hàng (${short(s.pendingRecGmv)})</span>`
            : `<span class="pill p-green" style="font-size:12px;font-weight:800;height:30px;padding:0 12px;gap:6px;background:#ECFDF5;border:2px solid #10B981;color:#047857;box-shadow:0 2px 6px rgba(16,185,129,0.2);"><i data-ic="check-circle" data-s="15"></i>ĐÃ ĐỐI SOÁT XONG 100%</span>`}
        </div>

        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:8px 12px;margin-bottom:12px;display:flex;align-items:center;gap:8px;font-size:11.5px;color:#166534;">
          <i data-ic="lock" data-s="15"></i>
          <span><strong>Chính sách hệ thống:</strong> Đối soát tự động 100% khi người mua nhận hàng (DELIVERED). Đã khóa toàn bộ thao tác thủ công để chống sai lệch số liệu.</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;background:#FCF8FA;border:1px solid var(--line2);border-radius:14px;padding:12px;margin-bottom:14px;">
          <div style="font-weight:800;font-size:12px;color:var(--muted);letter-spacing:.05em;">CÔNG THỨC ĐỐI SOÁT GMV PHIÊN LIVE</div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;"><span>+ GMV LIVE gốc (${s.channel})</span><strong class="num">${vnd(s.grossLiveGmv)}</strong></div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;"><span>+ GMV Affiliate trong phiên</span><strong class="num" style="color:var(--sky);">+${vnd(s.affiliateGmv)}</strong></div>
          ${s.overlap ? `<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--sky-ink);"><span>- Chống cộng trùng (2 kênh chồng giờ)</span><strong class="num">-${vnd(s.dedup)}</strong></div>` : `<div style="display:flex;justify-content:space-between;font-size:12.5px;" class="muted"><span>Cơ chế đối soát</span><span>1 kênh LIVE · Khớp giờ ước tính</span></div>`}
          <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--red);"><span>- Hoàn hủy / Đơn trả lại</span><strong class="num">-${vnd(s.cancelReturnGmv)}</strong></div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--amber);"><span>- Đang vận chuyển (chờ nhận hàng)</span><strong class="num">-${vnd(s.pendingRecGmv)}</strong></div>
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:800;padding:10px 12px;border-top:2px dashed ${isPending ? 'var(--line)' : '#10B981'};margin-top:6px;${!isPending ? 'background:#ECFDF5;border-radius:8px;color:#047857;' : ''}">
            <span>${!isPending ? '✓ ' : ''}= GMV đã đối soát (${!isPending ? 'ĐÃ CHỐT SỐ THỰC 100%' : 'tạm tính'})</span>
            <span class="num" style="color:${!isPending ? '#047857' : 'var(--pink2)'};font-size:15px;font-weight:800;">${vnd(s.kpiGmv)}</span>
          </div>
        </div>

        <div style="background:#FFF9FC;border:1px solid #FDE8F1;border-radius:12px;padding:10px 12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:11px;color:var(--muted);">Phân công nhân sự &amp; KPI phiên</div>
            ${s.isManualKpi
              ? `<span class="pill p-amber" style="margin-top:3px;">KPI thủ công (${s.manualKpiType === 'MEGA_LIVE' ? 'Mega Live' : 'Ngày Campaign'}) · Ẩn Host/Op</span>`
              : (admin ? `<div style="font-size:12px;font-weight:700;margin-top:2px;">Host: <span style="color:var(--pink-ink);">${esc(h)}</span> (${vnd(s.hostComm)}) · Op: <span style="color:var(--violet-ink);">${esc(o)}</span> (${vnd(s.opComm)})</div>`
                : (myRole === 'HOST' ? `<div style="font-size:12px;font-weight:700;margin-top:2px;">Host: <span style="color:var(--pink-ink);">${esc(h)}</span> (${vnd(s.hostComm)}) · Op: <span style="color:var(--violet-ink);">${esc(o)}</span></div>`
                  : `<div style="font-size:12px;font-weight:700;margin-top:2px;">Host: <span style="color:var(--pink-ink);">${esc(h)}</span> · Op: <span style="color:var(--violet-ink);">${esc(o)}</span> (${vnd(s.opComm)})</div>`))}
          </div>
          ${isPending ? `<span class="pill p-amber" style="height:30px;font-size:11.5px;padding:0 10px;gap:6px;"><span class="dot"></span>Tự động chốt khi đơn chuyển Đã giao (Khóa ấn thủ công)</span>` : `<span class="pill p-green" style="height:30px;font-size:11.5px;padding:0 10px;gap:6px;font-weight:800;border:1.5px solid #10B981;"><i data-ic="check-circle" data-s="13"></i>Đã tự động chốt số thực khi nhận hàng (100%)</span>`}
        </div>

        <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:13px;">Đơn hàng khớp khung giờ phiên (${matchedOrders.length} đơn)</strong>
          ${isAdmin() ? `<button type="button" class="btn-link" style="font-size:11.5px;color:var(--pink2);" onclick="closeModal('mdSessionRec');switchTab('TAB_ORDERS');">Xem bảng đối soát cấp đơn →</button>` : ''}
        </div>

        <div style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;border:1px solid var(--line2);border-radius:12px;padding:8px;">
          ${matchedOrders.length ? matchedOrders.map(o => `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 6px;border-bottom:1px dashed var(--line2);">
              <div><span class="mono" style="font-weight:700;">#${o.orderId}</span> <span class="muted">(${o.time})</span></div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span class="pill ${ORD_META[o.status].pill}" style="height:19px;font-size:9.5px;">${ORD_META[o.status].label}</span>
                <strong class="num">${vnd(o.amount)}</strong>
              </div>
            </div>`).join('') : `<div class="muted" style="text-align:center;padding:12px;font-size:12px;">${esc(typeof orderEmptyStateText === 'function' ? orderEmptyStateText('Chưa có đơn mẫu trong phiên này') : 'Chưa có đơn mẫu trong phiên này')}</div>`}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line2);">
          <button type="button" class="btn btn-ghost sm" onclick="closeModal('mdSessionRec')">Đóng</button>
        </div>`;

      openModal('mdSessionRec');
    }


    /* ---------- 11. Render Tab 3: Đối soát cấp đơn (v1.33.0) + Premium Order Tracking Modal ---------- */
    const ORD_META = {
      DELIVERED: { label: 'Đã giao', pill: 'p-green' },
      PENDING: { label: 'Chờ giao vận', pill: 'p-amber' },
      UNPAID: { label: 'Chưa thanh toán', pill: 'p-gray' },
      UNKNOWN: { label: 'Chưa rõ trạng thái', pill: 'p-gray' },
      SHIPPING: { label: 'Đang vận chuyển (Chờ nhận hàng)', pill: 'p-amber' },
      CANCELLED: { label: 'Đã hủy (Trừ khỏi KPI)', pill: 'p-red' },
      RETURNED: { label: 'Hoàn trả (Trừ khỏi KPI)', pill: 'p-red' }
    };
    function renderOrders() {
      const q = (document.getElementById('ordSearch')?.value || '').trim().toLowerCase();
      const st = document.getElementById('ordStatus')?.value || 'ALL';
      const ch = document.getElementById('fChannel').value;
      const isOverlap = overlapIds();
      const all = state.orders.filter(o => o.date >= state.from && o.date <= state.to && (ch === 'ALL' || o.channel === ch));

      // 4 Summary KPIs for Orders
      const deliv = all.filter(o => o.status === 'DELIVERED').reduce((a, b) => a + Math.max(0,b.amount-b.refund), 0);
      const ship = all.filter(o => ['SHIPPING','PENDING'].includes(o.status)).reduce((a, b) => a + Math.max(0,b.amount-b.refund), 0);
      const canc = all.filter(o => o.status === 'CANCELLED').reduce((a, b) => a + b.amount, 0);
      const ret = all.filter(o => o.status === 'RETURNED').reduce((a, b) => a + b.amount, 0);
      document.getElementById('ordKpis').innerHTML = `
        <div class="kpi"><div class="kpi-top"><div class="kpi-ic p-green">${ic('check', 18)}</div><div class="kpi-l">Đã giao thành công</div></div><div class="kpi-v num" style="color:var(--green);" data-count-to="${deliv}" data-format="vnd" data-anim-key="ord-deliv">${vnd(deliv)}</div></div>
        <div class="kpi"><div class="kpi-top"><div class="kpi-ic p-amber">${ic('truck', 18)}</div><div class="kpi-l">Đang vận chuyển (chờ đối soát)</div></div><div class="kpi-v num" style="color:var(--amber);" data-count-to="${ship}" data-format="vnd" data-anim-key="ord-ship">${vnd(ship)}</div></div>
        <div class="kpi"><div class="kpi-top"><div class="kpi-ic p-red">${ic('x', 18)}</div><div class="kpi-l">Đơn đã hủy</div></div><div class="kpi-v num" style="color:var(--red);" data-count-to="${canc}" data-format="vnd" data-anim-key="ord-canc">${vnd(canc)}</div></div>
        <div class="kpi"><div class="kpi-top"><div class="kpi-ic p-pink">${ic('refresh', 18)}</div><div class="kpi-l">Đơn hoàn trả</div></div><div class="kpi-v num" style="color:var(--red);" data-count-to="${ret}" data-format="vnd" data-anim-key="ord-ret">${vnd(ret)}</div></div>`;

      const attribution=document.getElementById('ordAttribution')?.value||'ALL';
      const list = all.filter(o => (st === 'ALL' || o.status === st) && (attribution==='ALL'||(attribution==='UNKNOWN'?['UNKNOWN','MIXED'].includes(o.attribution):o.attribution===attribution)) && (!q || `${o.orderId} ${o.sessionId} ${o.channel}`.toLowerCase().includes(q)));
      const pg = paginate('ord', list);

      document.getElementById('ordBody').innerHTML = pg.rows.map(o => {
        const ses = state.sessions.find(s => s.id === o.sessionId);
        const ov = ses ? isOverlap(ses.date + '|' + ses.slot) : false;
        const rule = o.kpiRule || (ov ? '2 kênh chồng giờ · Chống cộng trùng' : 'Chưa xác minh liên kết phiên');
        const net = Math.max(0, o.amount - o.refund);
        const age = diffDays(o.date, TODAY);
        const isDelivered = o.status === 'DELIVERED';
        const isShipping = ['SHIPPING','PENDING'].includes(o.status);
        const rowClass = isDelivered ? 'clickable row-reconciled' : (isShipping ? 'clickable row-pending' : 'clickable');

        return `<tr class="${rowClass}" onclick="openOrderTracking('${o.orderId}')">
          <td><div class="mono" style="font-weight:800;color:var(--pink-ink);">#${o.orderId}</div><div class="num muted" style="font-size:11px;">${fmtD(o.date)} · ${o.time}</div></td>
          <td><span class="pill ${o.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}">${o.channel}</span> ${o.source === 'AFFILIATE' ? '<span class="pill p-sky">Affiliate</span>' : ''}</td>
          <td><div class="mono" style="font-weight:700;">${o.sessionId || '—'}</div><div class="muted" style="font-size:11px;">${esc(rule)}</div></td>
          <td><span class="pill ${ORD_META[o.status].pill}"><span class="dot"></span>${ORD_META[o.status].label}</span></td>
          <td class="r num">${vnd(o.amount)}</td>
          <td class="r num" style="color:var(--red);">-${vnd(o.refund)}</td>
          <td class="r num">
            ${isDelivered
              ? `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:6px;background:#ECFDF5;border:1px solid #10B981;color:#047857;font-weight:800;" title="Giá trị hàng đã giao sau hoàn được xác nhận; chưa trừ phí quyết toán ví"><i data-ic="check-circle" data-s="11"></i>${vnd(net)}</span>`
              : (isShipping
                ? `<span style="color:var(--amber);font-weight:700;" title="Đang vận chuyển · Chờ đối soát">${vnd(net)} <span style="font-size:10px;">(Chờ)</span></span>`
                : `<span style="color:var(--muted);text-decoration:line-through;" title="Đơn hủy/hoàn · 0\u00A0₫">${vnd(net)}</span>`)}
          </td>
          <td><span class="pill p-green num">${ic('lock', 11)}Bảo vệ ${age}d/${PROTECT_DAYS}d</span></td>
        </tr>`;
      }).join('') || `<tr><td colspan="8" class="muted" style="padding:24px;text-align:center;">${esc(typeof orderEmptyStateText === 'function' ? orderEmptyStateText('Chưa có đơn khớp bộ lọc. Hệ thống sẽ tự đồng bộ dữ liệu từ Seller.') : 'Chưa có đơn khớp bộ lọc. Hệ thống sẽ tự đồng bộ dữ liệu từ Seller.')}</td></tr>`;

      document.getElementById('ordMobile').innerHTML = pg.rows.map(o => {
        const ses = state.sessions.find(s => s.id === o.sessionId);
        const ov = ses ? isOverlap(ses.date + '|' + ses.slot) : false;
        const net = Math.max(0, o.amount - o.refund);
        const age = diffDays(o.date, TODAY);
        const isDelivered = o.status === 'DELIVERED';
        const isShipping = ['SHIPPING','PENDING'].includes(o.status);

        return `<div class="m-card ${isDelivered ? 'card-reconciled' : (isShipping ? 'card-pending' : '')}" onclick="openOrderTracking('${o.orderId}')" style="cursor:pointer;">
          <div class="m-row">
            <div style="min-width:0;flex:1 1 auto;">
              <span class="mono" style="font-weight:800;color:var(--pink-ink);">#${o.orderId}</span>
              <span class="num muted" style="font-size:11px;margin-left:4px;">${fmtDs(o.date)} · ${o.time}</span>
            </div>
            <span class="pill ${ORD_META[o.status].pill}" style="flex-shrink:0;"><span class="dot"></span>${ORD_META[o.status].label}</span>
          </div>
          <div class="m-row" style="font-size:11.5px;gap:6px;">
            <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;min-width:0;flex:1 1 auto;">
              <span class="pill ${o.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}">${o.channel}</span>
              ${o.source === 'AFFILIATE' ? '<span class="pill p-sky">Affiliate</span>' : ''}
              <span class="mono muted">${o.sessionId}</span>
              <span class="pill p-gray" style="font-size:10px;">${esc(o.kpiRule || 'Chưa xác minh phiên')}</span>
            </div>
            <span class="pill p-green num" style="height:20px;font-size:10px;flex-shrink:0;">${ic('lock', 10)}${age}d/${PROTECT_DAYS}d</span>
          </div>
          <div class="m-row num" style="padding-top:4px;border-top:1px dashed var(--line2);font-size:11.5px;gap:6px;">
            <span class="muted" style="min-width:0;flex:1 1 auto;word-break:break-word;">Gốc: <strong>${vnd(o.amount)}</strong> · Hoàn/hủy: <strong style="color:var(--red);">-${vnd(o.refund)}</strong></span>
            ${isDelivered
              ? `<strong style="color:#047857;font-size:13px;flex-shrink:0;background:#ECFDF5;padding:2px 7px;border-radius:6px;border:1px solid #10B981;" title="Đã đối soát">✓ ${vnd(net)}</strong>`
              : `<strong style="color:${isShipping ? 'var(--amber)' : 'var(--muted)'};font-size:13px;flex-shrink:0;">${vnd(net)}</strong>`}
          </div>
        </div>`;
      }).join('');

      if (!pg.rows.length) document.getElementById('ordMobile').innerHTML = `<div class="muted" style="text-align:center;padding:24px;">${esc(typeof orderEmptyStateText === 'function' ? orderEmptyStateText('Chưa có đơn khớp bộ lọc. Hệ thống sẽ tự đồng bộ dữ liệu từ Seller.') : 'Chưa có đơn khớp bộ lọc. Hệ thống sẽ tự đồng bộ dữ liệu từ Seller.')}</div>`;
      document.getElementById('ordInfo').textContent = `Hiển thị ${pg.from}–${pg.to} trên ${pg.total} đơn hàng (bấm vào đơn để xem hành trình)`;
      document.getElementById('ordPager').innerHTML = pagerHtml('ord', pg);
    }

    function openOrderTracking(orderId) {
      const o = state.orders.find(x => x.orderId === orderId); if (!o) return;
      if(o.provider==='TIKTOK_API'){
        const stamp=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'TikTok chưa cung cấp';
        const meta=ORD_META[o.status]||ORD_META.UNKNOWN;
        const context=o.sessionId?'Đã khớp phiên LIVE':'Ngoài LIVE · 0% KPI';
        document.getElementById('orderTrackCard').innerHTML=`
          <section class="order-detail" aria-labelledby="orderDetailTitle">
            <header class="order-detail-head">
              <div><span class="order-detail-eyebrow">Đơn TikTok Shop</span><h2 id="orderDetailTitle">#${esc(o.orderId)}</h2></div>
              <span class="pill ${meta.pill}">${meta.label}</span>
            </header>
            <div class="order-detail-product">
              <span class="card-ic sky">${ic('box',18)}</span>
              <div><strong>${esc(o.productName)}</strong><span>${Number(o.qty)||0} sản phẩm · ${context}</span></div>
            </div>
            <dl class="order-detail-grid">
              <div><dt>Giá trị hàng</dt><dd class="num">${vnd(o.amount)}</dd></div>
              <div><dt>Hoàn đã xác nhận</dt><dd class="num">${vnd(o.refund)}</dd></div>
              <div><dt>Đặt hàng</dt><dd>${stamp(o.createdAt)}</dd></div>
              <div><dt>Cập nhật TikTok</dt><dd>${stamp(o.updatedAt)}</dd></div>
              ${o.deliveredAt?`<div class="order-detail-wide"><dt>Giao thành công</dt><dd>${stamp(o.deliveredAt)}</dd></div>`:''}
            </dl>
            <details class="order-detail-note"><summary>Cách đối soát</summary><p>Trạng thái giao hàng chưa phải quyết toán ví và chưa gồm phí nền tảng. KPI phiên chỉ thay đổi khi đủ dữ liệu đơn, hoàn tiền và tổng GMV khớp phiên.</p></details>
            <footer class="order-detail-actions"><button type="button" class="btn btn-ghost sm" onclick="closeModal('mdOrder')">Đóng</button></footer>
          </section>`;
        openModal('mdOrder');return;
      }
      const isBad = o.status === 'CANCELLED' || o.status === 'RETURNED';
      const isDone = o.status === 'DELIVERED';
      const pct = isDone ? 100 : isBad ? 100 : 68;
      document.getElementById('orderTrackCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--line2);margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="card-ic violet">${ic('box', 22)}</div>
            <div><div style="font-size:16px;font-weight:800;">Theo dõi đối soát đơn</div><div class="mono muted">#${o.orderId} · ${o.channel}</div></div>
          </div>
          <span class="pill p-violet num">${fmtDs(o.date)}</span>
        </div>
        <div class="tl">
          <div class="tl-i done"><div class="tl-dot">${ic('check', 14)}</div><div><div class="tl-t">Đặt đơn trong phiên LIVE</div><div class="tl-s num">${fmtD(o.date)} • ${o.time} (${o.sessionId})</div></div><span class="pill p-green">Done</span></div>
          <div class="tl-i done"><div class="tl-dot">${ic('check', 14)}</div><div><div class="tl-t">Đóng gói &amp; bàn giao vận chuyển</div><div class="tl-s">Khớp thời gian phiên LIVE (${o.source === 'AFFILIATE' ? 'GMV Affiliate' : 'Kênh nội bộ'})</div></div><span class="pill p-green">Done</span></div>
          <div class="tl-i ${isDone ? 'done' : isBad ? 'bad' : 'live'}"><div class="tl-dot">${isDone ? ic('check', 14) : isBad ? ic('x', 14) : ''}</div><div><div class="tl-t">Vận chuyển &amp; giao nhận</div><div class="tl-s">${o.status === 'SHIPPING' ? 'Đang vận chuyển — thuộc GMV chờ đối soát' : isBad ? 'Đơn bị hủy / hoàn trả — tự động loại trừ khỏi GMV tính KPI' : 'Đã giao hàng thành công (Người mua đã nhận hàng)'}</div></div><span class="pill ${isDone ? 'p-green' : isBad ? 'p-red' : 'p-violet'}">${isDone ? 'Đã nhận' : isBad ? o.status : 'Đang giao'}</span></div>
          <div class="tl-i ${isDone ? 'done' : ''}"><div class="tl-dot">${isDone ? ic('check', 14) : ''}</div><div><div class="tl-t">Tự động chốt đối soát số thực (Khóa thủ công)</div><div class="tl-s num">GMV đã đối soát: <strong>${vnd(Math.max(0, o.amount - o.refund))}</strong> <span style="color:var(--green);font-size:11.5px;font-weight:700;">(Tự động chốt ngay khi nhận hàng)</span></div></div><span class="pill ${isDone ? 'p-green' : 'p-gray'}">${isDone ? 'Đã tự động chốt' : 'Chờ nhận hàng'}</span></div>
        </div>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line2);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:700;">
            <span>${ic('truck', 16)} ${ORD_META[o.status].label}</span><span class="pill p-pink num">${vnd(o.amount)}</span>
          </div>
          <div class="prog ${isBad ? 'crit' : isDone ? 'ok' : ''}"><span style="width:${pct}%;"></span></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
            <span class="muted" style="font-size:12px;">Bảo vệ hậu mãi 60 ngày gần nhất</span>
            <button type="button" class="btn btn-grad sm" onclick="closeModal('mdOrder')">Đóng</button>
          </div>
        </div>`;
      openModal('mdOrder');
    }

    /* ---------- 11b. Render Tab: Đơn Shop tự ra (Ngoài Live) · 0% Live KPI · Đối soát số thực ---------- */
    function filteredShopOrders() {
      const q = (document.getElementById('shopOrdSearch')?.value || '').trim().toLowerCase();
      const sf = document.getElementById('shopOrdSourceFilter')?.value || 'ALL';
      const st = document.getElementById('shopOrdStatus')?.value || 'ALL';
      const ch = document.getElementById('fChannel')?.value || 'ALL';

      return (state.shopOrders || []).filter(o => {
        if (o.date < state.from || o.date > state.to) return false;
        if (ch !== 'ALL' && o.channel !== ch) return false;
        if (sf !== 'ALL' && o.source !== sf) return false;
        if (st !== 'ALL' && o.status !== st) return false;
        if (q) {
          const matchStr = `${o.orderId} ${o.channel} ${o.source} ${o.productName} ${o.sku} ${o.customerName} ${o.customerPhone} ${o.city}`.toLowerCase();
          if (!matchStr.includes(q)) return false;
        }
        return true;
      });
    }

    function filterShopOrderBySource(sourceId) {
      const sel = document.getElementById('shopOrdSourceFilter');
      if (sel) {
        sel.value = sourceId;
        pages.shopOrd = 1;
        renderShopOrders();
        toast(`Đang lọc nguồn đơn: ${SHOP_SOURCE_META[sourceId]?.label || sourceId}`);
      }
    }

    function renderShopOrders() {
      const pendingSource=state.orders.filter(o=>o.date>=state.from&&o.date<=state.to&&['UNKNOWN','MIXED'].includes(o.attribution)&&(document.getElementById('fChannel')?.value==='ALL'||o.channel===document.getElementById('fChannel')?.value)).length;
      document.getElementById('shopOrdPending').innerHTML=pendingSource?`<div class="note" style="margin-bottom:12px;"><span>${pendingSource} đơn đã tải nhưng TikTok chưa cung cấp đủ nguồn bán để xác minh ngoài LIVE. Các đơn này vẫn được lưu và chưa tính KPI theo nguồn.</span><button type="button" class="btn btn-ghost sm" onclick="openUnattributedOrders()">Xem đơn chưa rõ nguồn</button></div>`:'';
      const allInDate = (state.shopOrders || []).filter(o => o.date >= state.from && o.date <= state.to && (document.getElementById('fChannel')?.value === 'ALL' || o.channel === document.getElementById('fChannel')?.value));
      const filtered = filteredShopOrders();

      // Top 4 KPIs
      const grossOrganic = allInDate.reduce((a, b) => a + b.amount, 0);
      const deliveredNet = allInDate.filter(o => o.status === 'DELIVERED').reduce((a, b) => a + (b.amount - b.refund), 0);
      const shippingGmv = allInDate.filter(o => o.status === 'SHIPPING').reduce((a, b) => a + b.amount, 0);
      const cancelReturnGmv = allInDate.filter(o => o.status === 'CANCELLED' || o.status === 'RETURNED').reduce((a, b) => a + b.amount, 0);
      const cancelReturnRate = grossOrganic > 0 ? ((cancelReturnGmv / grossOrganic) * 100).toFixed(1) : 0;

      // Comparative calculation: Live Delivered vs Organic Shop Delivered
      const liveSessions = filteredSessions().filter(s => !s.manual);
      const liveDeliveredNet = liveSessions.reduce((a, b) => a + b.kpiGmv, 0);
      const totalDeliveredShop = liveDeliveredNet + deliveredNet;
      const organicSharePct = totalDeliveredShop > 0 ? Math.round((deliveredNet / totalDeliveredShop) * 100) : 0;

      const shopOrdKpisEl = document.getElementById('shopOrdKpis');
      if (shopOrdKpisEl) {
        shopOrdKpisEl.innerHTML = `
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-ic p-pink">${ic('store', 18)}</div><div class="kpi-l">Tổng GMV ngoài Live</div></div>
            <div class="kpi-v num" style="color:var(--pink-ink);" data-count-to="${grossOrganic}" data-format="vnd" data-anim-key="shp-gross">${vnd(grossOrganic)}</div>
            <div class="kpi-s num"><span>${allInDate.length} đơn</span><span>Kỳ: <strong>${fmtDs(state.from)} → ${fmtDs(state.to)}</strong></span></div>
          </div>
          <div class="kpi hl">
            <div class="kpi-top"><div class="kpi-ic p-green">${ic('check', 18)}</div><div class="kpi-l">GMV thực nhận sau giao (DELIVERED)</div></div>
            <div class="kpi-v num" style="color:var(--green);" data-count-to="${deliveredNet}" data-format="vnd" data-anim-key="shp-net">${vnd(deliveredNet)}</div>
            <div class="kpi-s num"><span class="pill p-green num">${ic('lock', 11)}100% Thuộc Shop</span><span>0% Live KPI</span></div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-ic p-violet">${ic('pie', 18)}</div><div class="kpi-l">Tỷ trọng doanh số ngoài Live</div></div>
            <div class="kpi-v num" style="color:var(--violet);" data-count-to="${organicSharePct}" data-format="pct" data-anim-key="shp-share">${organicSharePct}%</div>
            <div class="kpi-s num"><span>Live: <strong>${100 - organicSharePct}%</strong></span><span>Tự ra: <strong>${organicSharePct}%</strong></span></div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-ic p-sky">${ic('shield', 18)}</div><div class="kpi-l">Tỷ lệ hủy / hoàn trả (Ổn định)</div></div>
            <div class="kpi-v num" style="color:${cancelReturnRate > 10 ? 'var(--red)' : 'var(--sky)'};" data-count-to="${cancelReturnRate}" data-format="pct" data-anim-key="shp-ret">${cancelReturnRate}%</div>
            <div class="kpi-s num"><span style="color:var(--red);">-${short(cancelReturnGmv)}</span><span>Đang giao: <strong>${short(shippingGmv)}</strong></span></div>
          </div>`;
      }

      // Source Breakdown Cards / Progress
      const sourceBarsEl = document.getElementById('shopOrdSourceBars');
      if (sourceBarsEl) {
        const curSource = document.getElementById('shopOrdSourceFilter')?.value || 'ALL';
        sourceBarsEl.innerHTML = Object.values(SHOP_SOURCE_META).map(sm => {
          const sOrders = allInDate.filter(o => o.source === sm.id);
          const sGmv = sOrders.reduce((a, b) => a + b.amount, 0);
          const sNet = sOrders.filter(o => o.status === 'DELIVERED').reduce((a, b) => a + (b.amount - b.refund), 0);
          const sPct = grossOrganic > 0 ? Math.round((sGmv / grossOrganic) * 100) : 0;
          const isSelected = curSource === sm.id;

          return `
            <div onclick="filterShopOrderBySource('${sm.id}')" style="cursor:pointer;background:${isSelected ? 'var(--pink-soft)' : '#FCF8FA'};border:1.5px solid ${isSelected ? 'var(--pink)' : 'var(--line2)'};border-radius:13px;padding:12px;transition:all 180ms ease;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span class="pill ${sm.pill}" style="font-weight:700;font-size:11.5px;">${ic(sm.icon, 13)}${sm.short}</span>
                <span class="num muted" style="font-size:11.5px;font-weight:700;">${sPct}%</span>
              </div>
              <div class="num" style="font-size:16px;font-weight:800;color:var(--pink-ink);">${vnd(sGmv)}</div>
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px;" class="muted num">
                <span>Thực nhận: <strong style="color:var(--green);">${short(sNet)}</strong></span>
                <span><strong>${sOrders.length}</strong> đơn</span>
              </div>
              <div class="prog" style="height:5px;margin-top:8px;"><span style="width:${sPct}%;"></span></div>
            </div>`;
        }).join('');
      }

      // Paginate table rows
      const pg = paginate('shopOrd', filtered);

      const bodyEl = document.getElementById('shopOrdBody');
      if (bodyEl) {
        if (!pg.rows.length) {
          bodyEl.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;" class="muted">${esc(typeof orderEmptyStateText === 'function' ? orderEmptyStateText('Không tìm thấy đơn hàng nào tự ra từ Shop trong khoảng lọc này') : 'Không tìm thấy đơn hàng nào tự ra từ Shop trong khoảng lọc này')}</td></tr>`;
        } else {
          bodyEl.innerHTML = pg.rows.map(o => {
            const sm = SHOP_SOURCE_META[o.source] || { short: o.source, pill: 'p-gray', icon: 'box' };
            const net = Math.max(0, o.amount - o.refund);
            return `<tr class="clickable" onclick="openShopOrderModal('${o.orderId}')">
              <td>
                <div class="mono" style="font-weight:800;color:var(--pink-ink);">#${o.orderId}</div>
                <div class="num muted" style="font-size:11px;">${fmtD(o.date)} · ${o.time}</div>
              </td>
              <td>
                <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
                  <span class="pill ${o.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}">${o.channel}</span>
                  <span class="pill ${sm.pill}" style="font-size:11px;height:20px;">${ic(sm.icon, 11)}${sm.short}</span>
                </div>
              </td>
              <td>
                <div style="font-weight:700;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(o.productName)}">${esc(o.productName)}</div>
                <div style="display:flex;gap:4px;align-items:center;margin-top:2px;">
                  <span class="mono muted" style="font-size:11px;">${esc(o.sku)}</span>
                  <span class="pill p-gray num" style="height:18px;font-size:10px;padding:0 5px;">x${o.qty}</span>
                </div>
              </td>
              <td>
                <div style="font-weight:700;">${esc(o.customerName)}</div>
                <div class="muted num" style="font-size:11px;">${esc(o.customerPhone)} · ${esc(o.city)}</div>
              </td>
              <td><span class="pill ${ORD_META[o.status].pill}"><span class="dot"></span>${ORD_META[o.status].label}</span></td>
              <td class="r num">${vnd(o.amount)}</td>
              <td class="r num" style="color:var(--red);">${o.refund > 0 ? '-' + vnd(o.refund) : '0\u00A0₫'}</td>
              <td class="r num" style="font-weight:800;color:var(--green);">${vnd(net)}</td>
              <td><span class="pill p-green" style="font-size:11px;" title="Đơn tự ra từ shop không bán trên live: Không trích KPI cho Host và Operator">${ic('lock', 11)}0% Live KPI</span></td>
            </tr>`;
          }).join('');
        }
      }

      // Mobile cards
      const mobileEl = document.getElementById('shopOrdMobile');
      if (mobileEl) {
        if (!pg.rows.length) {
          mobileEl.innerHTML = `<div class="muted" style="text-align:center;padding:24px;">${esc(typeof orderEmptyStateText === 'function' ? orderEmptyStateText('Không có đơn hàng nào') : 'Không có đơn hàng nào')}</div>`;
        } else {
          mobileEl.innerHTML = pg.rows.map(o => {
            const sm = SHOP_SOURCE_META[o.source] || { short: o.source, pill: 'p-gray', icon: 'box' };
            const net = Math.max(0, o.amount - o.refund);
            return `
              <div class="m-card" onclick="openShopOrderModal('${o.orderId}')" style="cursor:pointer;">
                <div class="m-row">
                  <div style="min-width:0;flex:1 1 auto;">
                    <span class="mono" style="font-weight:800;color:var(--pink-ink);">#${o.orderId}</span>
                    <span class="num muted" style="font-size:11px;margin-left:4px;">${fmtDs(o.date)} · ${o.time}</span>
                  </div>
                  <span class="pill ${ORD_META[o.status].pill}" style="flex-shrink:0;"><span class="dot"></span>${ORD_META[o.status].label}</span>
                </div>
                <div class="m-row" style="font-size:11.5px;gap:6px;">
                  <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;min-width:0;flex:1 1 auto;">
                    <span class="pill ${o.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}">${o.channel}</span>
                    <span class="pill ${sm.pill}" style="height:19px;font-size:10px;">${ic(sm.icon, 10)}${sm.short}</span>
                    <span class="pill p-green" style="height:19px;font-size:10px;">${ic('lock', 9)}0% Live KPI</span>
                  </div>
                </div>
                <div style="margin:4px 0 2px;font-weight:700;font-size:12.5px;line-height:1.3;color:#1F1420;">
                  ${esc(o.productName)} <span class="pill p-gray num" style="height:18px;font-size:10px;padding:0 5px;">x${o.qty}</span>
                </div>
                <div class="muted" style="font-size:11.5px;margin-bottom:4px;">
                  Khách: <strong>${esc(o.customerName)}</strong> · ${esc(o.customerPhone)} (${esc(o.city)})
                </div>
                <div class="m-row num" style="padding-top:4px;border-top:1px dashed var(--line2);font-size:11.5px;gap:6px;">
                  <span class="muted" style="min-width:0;flex:1 1 auto;">Gốc: <strong>${vnd(o.amount)}</strong> · Hoàn: <strong style="color:var(--red);">${o.refund > 0 ? '-' + vnd(o.refund) : '0\u00A0₫'}</strong></span>
                  <strong style="color:var(--green);font-size:13px;flex-shrink:0;">${vnd(net)}</strong>
                </div>
              </div>`;
          }).join('');
        }
      }

      // Foot & Pager
      const infoEl = document.getElementById('shopOrdInfo');
      if (infoEl) infoEl.textContent = `Hiển thị ${pg.from}–${pg.to} trên ${pg.total} đơn Shop tự ra ngoài Live`;
      const pagerEl = document.getElementById('shopOrdPager');
      if (pagerEl) pagerEl.innerHTML = pagerHtml('shopOrd', pg);

      // Badge in sidebar
      const nbEl = document.getElementById('nbShopOrders');
      if (nbEl) nbEl.textContent = allInDate.length;
    }

    function openShopOrderModal(orderId) {
      if(state.orders.some(o=>o.orderId===orderId&&o.provider==='TIKTOK_API')){openOrderTracking(orderId);return;}
      const o = (state.shopOrders || []).find(x => x.orderId === orderId);
      if (!o) return;
      const sm = SHOP_SOURCE_META[o.source] || { label: o.source, pill: 'p-gray', icon: 'box', desc: '' };
      const isDone = o.status === 'DELIVERED';
      const isBad = o.status === 'CANCELLED' || o.status === 'RETURNED';
      const net = Math.max(0, o.amount - o.refund);

      document.getElementById('shopOrderCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--line2);margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="card-ic"><i data-ic="${sm.icon || 'store'}" data-s="22"></i></div>
            <div>
              <div style="font-size:16px;font-weight:800;">Đơn Shop tự ra (Ngoài Live)</div>
              <div class="mono muted">#${o.orderId} · <span class="pill ${o.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}" style="font-size:10px;height:18px;">${o.channel}</span></div>
            </div>
          </div>
          <span class="pill ${sm.pill}">${ic(sm.icon, 12)}${sm.short || sm.label}</span>
        </div>

        <div style="background:#FFF9FB;border:1px solid var(--line2);border-radius:12px;padding:12px;margin-bottom:16px;">
          <div style="font-size:11px;font-weight:800;color:var(--pink-ink);text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px;">Thông tin khách hàng &amp; Giao nhận</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12.5px;">
            <div><span class="muted">Khách hàng:</span> <strong>${esc(o.customerName)}</strong></div>
            <div><span class="muted">Số điện thoại:</span> <strong class="mono">${esc(o.customerPhone)}</strong></div>
            <div><span class="muted">Khu vực:</span> <strong>${esc(o.city)}</strong></div>
            <div><span class="muted">Thời gian đặt:</span> <span class="num">${fmtD(o.date)} lúc ${o.time}</span></div>
          </div>
        </div>

        <div style="background:#FAFAFB;border:1px solid var(--line2);border-radius:12px;padding:12px;margin-bottom:16px;">
          <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px;">Sản phẩm đặt mua</div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div>
              <div style="font-weight:700;font-size:13.5px;">${esc(o.productName)}</div>
              <div class="mono muted" style="font-size:11px;margin-top:2px;">Mã SKU: ${esc(o.sku)} · Đơn giá: ${vnd(o.unitPrice)}</div>
            </div>
            <div style="text-align:right;">
              <span class="pill p-gray num">SL: ${o.qty}</span>
              <div class="num" style="font-weight:800;font-size:14px;color:var(--pink-ink);margin-top:4px;">${vnd(o.amount)}</div>
            </div>
          </div>
        </div>

        <!-- Tracking Timeline -->
        <div class="tl">
          <div class="tl-i done">
            <div class="tl-dot">${ic('check', 14)}</div>
            <div>
              <div class="tl-t">Phát sinh đơn tự nhiên từ Shop</div>
              <div class="tl-s num">${fmtD(o.date)} · ${o.time} — Nguồn: <strong>${sm.label}</strong> (${o.note || 'Tự mua ngoài Live'})</div>
            </div>
            <span class="pill p-green">Tự nhiên</span>
          </div>
          <div class="tl-i done">
            <div class="tl-dot">${ic('check', 14)}</div>
            <div>
              <div class="tl-t">Đóng gói &amp; Giao cho Đơn vị vận chuyển TikTok Shop</div>
              <div class="tl-s">Kho hàng Khang Baby xuất đơn tự động theo API TikTok Shop</div>
            </div>
            <span class="pill p-green">Đã giao ĐVVC</span>
          </div>
          <div class="tl-i ${isDone ? 'done' : isBad ? 'bad' : 'live'}">
            <div class="tl-dot">${isDone ? ic('check', 14) : isBad ? ic('x', 14) : ''}</div>
            <div>
              <div class="tl-t">Giao hàng đến người mua</div>
              <div class="tl-s">${isDone ? 'Người mua đã nhận hàng thành công (DELIVERED)' : isBad ? 'Đơn bị hủy hoặc hoàn trả' : 'Đang giao hàng (In-transit)'}</div>
            </div>
            <span class="pill ${ORD_META[o.status].pill}"><span class="dot"></span>${ORD_META[o.status].label}</span>
          </div>
          <div class="tl-i ${isDone ? 'done' : ''}">
            <div class="tl-dot">${isDone ? ic('check', 14) : ''}</div>
            <div>
              <div class="tl-t">Ghi nhận doanh thu thuần Shop (Khóa Live KPI)</div>
              <div class="tl-s num">GMV thực nhận: <strong style="color:var(--green);">${vnd(net)}</strong> · <span style="font-weight:700;color:var(--pink2);">Thuộc 100% doanh thu Shop</span></div>
            </div>
            <span class="pill ${isDone ? 'p-green' : 'p-gray'}">${isDone ? 'Đã ghi nhận' : 'Chờ hoàn tất'}</span>
          </div>
        </div>

        <!-- KPI Separation Notice -->
        <div class="note" style="margin-top:16px;">
          <span class="pill p-green">${ic('lock', 12)}Tách bạch KPI</span>
          <span><strong>Quy tắc hệ thống:</strong> Đơn này tự ra ngoài phiên LIVE nên <strong>không tính 0,3% Host và 0,1% Operator</strong>. Toàn bộ doanh số được đối soát chuyển về lợi nhuận Shop, tránh nhầm lẫn lương thưởng của nhân sự livestream.</span>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--line2);">
          <button type="button" class="btn btn-grad sm" onclick="closeModal('mdShopOrder')">Đóng</button>
        </div>`;
      hydrateIcons(document.getElementById('shopOrderCard'));
      openModal('mdShopOrder');
    }

    function exportShopOrdersCsv() {
      const list = filteredShopOrders();
      if (!list.length) { toast('Không có đơn hàng nào để xuất'); return; }

      const header = ['MaDon', 'Ngay', 'Gio', 'Kenh', 'NguonDon', 'SanPham', 'SKU', 'SoLuong', 'DonGia', 'TongGiaTri', 'HoanHuy', 'ThucNhan', 'TrangThai', 'KhachHang', 'SDT', 'KhuVuc', 'QuyTacKPI'];
      const rows = list.map(o => [
        `"${o.orderId}"`,
        `"${o.date}"`,
        `"${o.time}"`,
        `"${o.channel}"`,
        `"${SHOP_SOURCE_META[o.source]?.label || o.source}"`,
        `"${o.productName.replace(/"/g, '""')}"`,
        `"${o.sku}"`,
        o.qty,
        o.unitPrice,
        o.amount,
        o.refund,
        Math.max(0, o.amount - o.refund),
        `"${ORD_META[o.status]?.label || o.status}"`,
        `"${o.customerName.replace(/"/g, '""')}"`,
        `"${o.customerPhone}"`,
        `"${o.city}"`,
        `"${o.kpiRule}"`
      ].join(','));

      const csv = '\uFEFF' + [header.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Don_Shop_Tu_Ra_Ngoai_Live_${state.from}_${state.to}.csv`;
      a.click();
      toast(`Đã xuất ${list.length} đơn Shop ngoài Live sang CSV`);
    }

    /* ---------- 11b. Render Tab: Đơn hoàn 15 ngày (Chính sách TikTok Shop) + So sánh GMV đối soát ---------- */
    function filteredReturns15d() {
      const q = (document.getElementById('retSearch')?.value || '').trim().toLowerCase();
      const ch = document.getElementById('retChannelFilter')?.value || 'ALL';
      const globalCh = document.getElementById('fChannel')?.value || 'ALL';
      const st = document.getElementById('fStaff')?.value || 'ALL';
      const status = document.getElementById('retStatusFilter')?.value || 'ALL';
      const reason = document.getElementById('retReasonFilter')?.value || 'ALL';
      const daysTier = document.getElementById('retDaysFilter')?.value || 'ALL';

      return (state.returns15d || []).filter(r => {
        if (r.returnDate < state.from || r.returnDate > state.to) return false;
        const channelMatch = (ch !== 'ALL') ? (r.channel === ch) : (globalCh === 'ALL' || r.channel === globalCh);
        if (!channelMatch) return false;
        if (st !== 'ALL' && r.hostId !== st && r.operatorId !== st) return false;
        if (status !== 'ALL' && r.status !== status) return false;
        if (reason !== 'ALL' && r.reasonCode !== reason) return false;
        if (daysTier === 'EARLY' && (r.daysFromDelivery === null || r.daysFromDelivery < 0 || r.daysFromDelivery > 3)) return false;
        if (daysTier === 'MID' && (r.daysFromDelivery < 4 || r.daysFromDelivery > 7)) return false;
        if (daysTier === 'LATE' && (r.daysFromDelivery < 8 || r.daysFromDelivery > 15)) return false;

        if (q) {
          const hay = `${r.returnId} ${r.orderId} ${r.sessionId} ${r.channel} ${r.productName} ${r.sku} ${r.buyerName || r.customerName || ''} ${r.buyerPhone || r.customerPhone || ''} ${r.buyerCity || r.city || ''} ${r.hostName} ${r.reasonLabel} ${r.statusLabel}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }).sort((a, b) => b.returnDate.localeCompare(a.returnDate));
    }

    function renderReturns15d() {
      const gCh = document.getElementById('fChannel')?.value || 'ALL';
      const tabChEl = document.getElementById('retChannelFilter');
      if (tabChEl && tabChEl.value === 'ALL' && gCh !== 'ALL') {
        tabChEl.value = gCh;
      }

      // 1. GMV đối soát tạm tính từ phiên LIVE
      const sesList = filteredSessions();
      let totDeliveredRecGmv = sesList.reduce((acc, s) => acc + (s.kpiGmv || 0), 0);
      let preliminaryHostComm = sesList.reduce((acc, s) => acc + (s.hostComm || 0), 0);
      let preliminaryOpComm = sesList.reduce((acc, s) => acc + (s.opComm || 0), 0);

      // 2. Returns in range matching channel & staff
      const ch = document.getElementById('retChannelFilter')?.value || 'ALL';
      const st = document.getElementById('fStaff')?.value || 'ALL';
      const inRangeReturns = (state.returns15d || []).filter(r => {
        if (r.returnDate < state.from || r.returnDate > state.to) return false;
        const channelMatch = (ch !== 'ALL') ? (r.channel === ch) : (gCh === 'ALL' || r.channel === gCh);
        if (!channelMatch) return false;
        if (st !== 'ALL' && r.hostId !== st && r.operatorId !== st) return false;
        return true;
      });

      const deductibleReturns=inRangeReturns.filter(r=>r.provider!=='TIKTOK_API'||(r.refundConfirmed&&r.within15Days&&sesList.some(s=>s.id===r.sessionId)&&r.reflectedInSession));
      const reflected=deductibleReturns.filter(r=>r.provider==='TIKTOK_API'&&r.reflectedInSession);
      totDeliveredRecGmv+=reflected.reduce((sum,r)=>sum+r.returnAmount,0);
      preliminaryHostComm+=reflected.reduce((sum,r)=>sum+r.hostCommReduction,0);
      preliminaryOpComm+=reflected.reduce((sum,r)=>sum+r.opCommReduction,0);
      const totReturnGmv = deductibleReturns.reduce((acc, r) => acc + (r.returnAmount || 0), 0);
      const totHostReduction = deductibleReturns.reduce((acc, r) => acc + (r.hostCommReduction || 0), 0);
      const totOpReduction = deductibleReturns.reduce((acc, r) => acc + (r.opCommReduction || 0), 0);
      const totCommReduction = totHostReduction + totOpReduction;

      const netSettledGmv = Math.max(0, totDeliveredRecGmv - totReturnGmv);
      const netHostComm = Math.max(0, preliminaryHostComm - totHostReduction);
      const netOpComm = Math.max(0, preliminaryOpComm - totOpReduction);

      const returnRatePct = totDeliveredRecGmv > 0 ? (totReturnGmv / totDeliveredRecGmv * 100).toFixed(2) : '0.00';
      const retainRatePct = totDeliveredRecGmv > 0 ? (netSettledGmv / totDeliveredRecGmv * 100).toFixed(2) : '100.00';

      // 4 Summary KPIs
      const kpiEl = document.getElementById('retKpis');
      if (kpiEl) {
        kpiEl.innerHTML = `
          <div class="kpi">
            <div class="kpi-top">
              <div class="kpi-ic p-green">${ic('check', 18)}</div>
              <div class="kpi-l">GMV Đã đối soát tạm tính</div>
            </div>
            <div class="kpi-v num" style="color:var(--green);" data-count-to="${totDeliveredRecGmv}" data-format="vnd" data-anim-key="ret-deliv">${vnd(totDeliveredRecGmv)}</div>
            <div class="kpi-s num"><span>Ghi nhận khi khách nhận hàng (DELIVERED)</span><span>100%</span></div>
          </div>
          <div class="kpi">
            <div class="kpi-top">
              <div class="kpi-ic p-red">${ic('refresh', 18)}</div>
              <div class="kpi-l">GMV Đơn hoàn 15 ngày (TikTok)</div>
            </div>
            <div class="kpi-v num" style="color:var(--red);" data-count-to="${totReturnGmv}" data-format="vnd" data-anim-key="ret-loss">-${vnd(totReturnGmv)}</div>
            <div class="kpi-s num"><span>Tỷ lệ hoàn: <strong>${returnRatePct}%</strong></span><span>${inRangeReturns.length} đơn hoàn</span></div>
          </div>
          <div class="kpi hl">
            <div class="kpi-top">
              <div class="kpi-ic p-pink">${ic('shield', 18)}</div>
              <div class="kpi-l">GMV Thực thu sau hoàn (Net Settled)</div>
            </div>
            <div class="kpi-v num" style="color:var(--pink2);" data-count-to="${netSettledGmv}" data-format="vnd" data-anim-key="ret-net">${vnd(netSettledGmv)}</div>
            <div class="kpi-s num"><span>Tỷ lệ giữ lại thực tế: <strong>${retainRatePct}%</strong></span><span>Doanh thu sạch</span></div>
          </div>
          <div class="kpi">
            <div class="kpi-top">
              <div class="kpi-ic p-amber">${ic('users', 18)}</div>
              <div class="kpi-l">Hoa hồng giảm trừ (Host 0,3% &amp; Op 0,1%)</div>
            </div>
            <div class="kpi-v num" style="color:var(--amber);" data-count-to="${totCommReduction}" data-format="vnd" data-anim-key="ret-comm">-${vnd(totCommReduction)}</div>
            <div class="kpi-s num"><span>Host: -${vnd(totHostReduction)}</span><span>Op: -${vnd(totOpReduction)}</span></div>
          </div>
        `;
      }

      // Comparison Card
      const cmpEl = document.getElementById('retComparisonCard');
      if (cmpEl) {
        cmpEl.innerHTML = `
          <div class="card-h">
            <div class="card-h-l">
              <div class="card-ic" style="background:#EEF2FF;color:#4F46E5;"><i data-ic="target" data-s="20"></i></div>
              <div>
                <div class="h-title">Bảng so sánh đối soát GMV: Trước vs Sau khấu trừ 15 ngày đổi trả TikTok Shop</div>
                <div class="h-sub">Đối chiếu tự động giữa GMV tạm tính sau khi giao hàng thành công và GMV thực thu sau thời hạn đổi trả 15 ngày</div>
              </div>
            </div>
            <span class="pill p-sky">${ic('clock', 12)}Chính sách 15 ngày tiêu chuẩn TikTok Shop</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin-bottom:18px;">
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:14px;position:relative;">
              <div style="font-size:11px;font-weight:800;color:#15803D;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                <span>1. GMV ĐỐI SOÁT TẠM TÍNH</span>
                <span class="pill p-green" style="font-size:10px;height:18px;">DELIVERED</span>
              </div>
              <div class="num" style="font-size:22px;font-weight:900;color:#166534;margin-bottom:4px;">${vnd(totDeliveredRecGmv)}</div>
              <div class="muted" style="font-size:12px;">Đơn giao thành công · Đủ điều kiện tạm tính KPI</div>
              <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #86EFAC;display:flex;justify-content:space-between;font-size:11.5px;">
                <span class="muted">Hoa hồng Host (0,3%):</span>
                <strong class="num">${vnd(preliminaryHostComm)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-top:3px;">
                <span class="muted">Hoa hồng Op (0,1%):</span>
                <strong class="num">${vnd(preliminaryOpComm)}</strong>
              </div>
            </div>

            <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:12px;padding:14px;position:relative;">
              <div style="font-size:11px;font-weight:800;color:#BE123C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                <span>2. KHẤU TRỪ HOÀN 15 NGÀY</span>
                <span class="pill p-red" style="font-size:10px;height:18px;">-${returnRatePct}%</span>
              </div>
              <div class="num" style="font-size:22px;font-weight:900;color:#9F1239;margin-bottom:4px;">-${vnd(totReturnGmv)}</div>
              <div class="muted" style="font-size:12px;">Khách hoàn trả trong 15 ngày sau nhận hàng (${inRangeReturns.length} đơn)</div>
              <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #FDA4AF;display:flex;justify-content:space-between;font-size:11.5px;">
                <span class="muted">Thu hồi KPI Host (0,3%):</span>
                <strong class="num" style="color:var(--red);">-${vnd(totHostReduction)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-top:3px;">
                <span class="muted">Thu hồi KPI Op (0,1%):</span>
                <strong class="num" style="color:var(--red);">-${vnd(totOpReduction)}</strong>
              </div>
            </div>

            <div style="background:linear-gradient(135deg, #FFF5F7 0%, #F5F3FF 100%);border:1.5px solid var(--pink2);border-radius:12px;padding:14px;position:relative;box-shadow:0 4px 12px rgba(244,114,182,0.12);">
              <div style="font-size:11px;font-weight:800;color:var(--pink-ink);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                <span>3. GMV THỰC THU SAU HOÀN</span>
                <span class="pill p-pink" style="font-size:10px;height:18px;">NET SETTLED</span>
              </div>
              <div class="num" style="font-size:22px;font-weight:900;color:var(--pink-ink);margin-bottom:4px;">${vnd(netSettledGmv)}</div>
              <div class="muted" style="font-size:12px;">Doanh số thực thu giữ lại: <strong>${retainRatePct}%</strong></div>
              <div style="margin-top:10px;padding-top:8px;border-top:1px dashed rgba(244,114,182,0.4);display:flex;justify-content:space-between;font-size:11.5px;">
                <span class="muted">Hoa hồng Host chốt thực:</span>
                <strong class="num" style="color:var(--green);font-size:12.5px;">${vnd(netHostComm)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-top:3px;">
                <span class="muted">Hoa hồng Op chốt thực:</span>
                <strong class="num" style="color:var(--green);font-size:12.5px;">${vnd(netOpComm)}</strong>
              </div>
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
              <span><strong>Phân bổ doanh số:</strong> Thực thu giữ lại (<span style="color:var(--green);font-weight:700;">${retainRatePct}%</span>) vs Khấu trừ hoàn trả 15 ngày (<span style="color:var(--red);font-weight:700;">${returnRatePct}%</span>)</span>
              <span class="mono muted">Tổng: ${vnd(totDeliveredRecGmv)}</span>
            </div>
            <div style="height:14px;background:#FEE2E2;border-radius:99px;overflow:hidden;display:flex;box-shadow:inset 0 1px 3px rgba(0,0,0,0.08);">
              <div style="width:${retainRatePct}%;background:linear-gradient(90deg, #10B981, #059669);border-radius:99px 0 0 99px;transition:width 0.4s ease;" title="GMV thực giữ lại: ${vnd(netSettledGmv)} (${retainRatePct}%)"></div>
              <div style="width:${returnRatePct}%;background:linear-gradient(90deg, #EF4444, #DC2626);border-radius:0 99px 99px 0;transition:width 0.4s ease;" title="GMV đơn hoàn 15 ngày: ${vnd(totReturnGmv)} (${returnRatePct}%)"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px;" class="muted">
              <span>🟢 Thực thu giữ lại: <strong>${vnd(netSettledGmv)}</strong> (${retainRatePct}%)</span>
              <span>🔴 Hoàn trả trừ ví: <strong>${vnd(totReturnGmv)}</strong> (${returnRatePct}%)</span>
            </div>
          </div>

          <div class="page-guide-bar">
            <span>Cơ chế khấu trừ hoàn trả được giải thích trong Hướng dẫn.</span>
            <button type="button" class="page-guide-link" onclick="openGuide('guide-returns')">${ic('info', 14)}Xem chính sách 15 ngày</button>
          </div>
        `;
      }

      // Analytics Card
      const anEl = document.getElementById('retAnalyticsCard');
      if (anEl) {
        const earlyReturns = inRangeReturns.filter(r => r.daysFromDelivery !== null && r.daysFromDelivery >= 0 && r.daysFromDelivery <= 3);
        const midReturns = inRangeReturns.filter(r => r.daysFromDelivery >= 4 && r.daysFromDelivery <= 7);
        const lateReturns = inRangeReturns.filter(r => r.daysFromDelivery >= 8 && r.daysFromDelivery <= 15);

        const earlyGmv = earlyReturns.reduce((acc, r) => acc + (r.returnAmount || 0), 0);
        const midGmv = midReturns.reduce((acc, r) => acc + (r.returnAmount || 0), 0);
        const lateGmv = lateReturns.reduce((acc, r) => acc + (r.returnAmount || 0), 0);

        const reasonGroups = Object.create(null);
        inRangeReturns.forEach(r => {
          const k = r.reasonCode || 'OTHER';
          if (!reasonGroups[k]) {
            reasonGroups[k] = { label: r.reasonLabel || k, liability: r.liability || 'Chưa rõ', count: 0, amount: 0, hostComm: 0 };
          }
          reasonGroups[k].count++;
          reasonGroups[k].amount += r.returnAmount;
          reasonGroups[k].hostComm += r.hostCommReduction;
        });
        const reasonList = Object.values(reasonGroups).sort((a, b) => b.amount - a.amount);

        anEl.innerHTML = `
          <div class="card-h">
            <div class="card-h-l">
              <div class="card-ic" style="background:#FEF3C7;color:#D97706;"><i data-ic="clock" data-s="20"></i></div>
              <div>
                <div class="h-title">Phân tích hành vi hoàn trả &amp; Trách nhiệm bồi thường trong 15 ngày</div>
                <div class="h-sub">Thời điểm khách bấm báo hoàn sau khi nhận hàng · Cơ sở quy trách nhiệm ĐVVC, Kho hàng, Host hoặc Nhà sản xuất</div>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%,280px), 1fr));gap:16px;">
            <div style="background:#FAFAFB;border:1px solid var(--line2);border-radius:12px;padding:14px;">
              <div style="font-size:12px;font-weight:800;color:#334155;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                ${ic('clock', 14)}Phân bố thời điểm yêu cầu hoàn (1 - 15 ngày)
              </div>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
                    <span><strong>Ngày 1 – 3</strong> (Mở hộp phát hiện ngay):</span>
                    <span class="num"><strong>${earlyReturns.length} đơn</strong> · ${vnd(earlyGmv)} (${totReturnGmv ? Math.round(earlyGmv / totReturnGmv * 100) : 0}%)</span>
                  </div>
                  <div style="height:8px;background:#E2E8F0;border-radius:99px;overflow:hidden;">
                    <div style="width:${totReturnGmv ? (earlyGmv / totReturnGmv * 100) : 0}%;height:100%;background:#3B82F6;border-radius:99px;"></div>
                  </div>
                  <div class="muted" style="font-size:10.5px;margin-top:2px;">Chủ yếu: Sai size, móp méo vận chuyển, khách bóc xem không ưng</div>
                </div>

                <div>
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
                    <span><strong>Ngày 4 – 7</strong> (Dùng thử tuần đầu):</span>
                    <span class="num"><strong>${midReturns.length} đơn</strong> · ${vnd(midGmv)} (${totReturnGmv ? Math.round(midGmv / totReturnGmv * 100) : 0}%)</span>
                  </div>
                  <div style="height:8px;background:#E2E8F0;border-radius:99px;overflow:hidden;">
                    <div style="width:${totReturnGmv ? (midGmv / totReturnGmv * 100) : 0}%;height:100%;background:#F59E0B;border-radius:99px;"></div>
                  </div>
                  <div class="muted" style="font-size:10.5px;margin-top:2px;">Chủ yếu: Máy móc lỗi kỹ thuật, bé không hợp tã / sữa, dị ứng da</div>
                </div>

                <div>
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
                    <span><strong>Ngày 8 – 15</strong> (Sát hạn chót chính sách):</span>
                    <span class="num"><strong>${lateReturns.length} đơn</strong> · ${vnd(lateGmv)} (${totReturnGmv ? Math.round(lateGmv / totReturnGmv * 100) : 0}%)</span>
                  </div>
                  <div style="height:8px;background:#E2E8F0;border-radius:99px;overflow:hidden;">
                    <div style="width:${totReturnGmv ? (lateGmv / totReturnGmv * 100) : 0}%;height:100%;background:#EF4444;border-radius:99px;"></div>
                  </div>
                  <div class="muted" style="font-size:10.5px;margin-top:2px;">Khách đổi ý, tận dụng tối đa quyền lợi 15 ngày đổi trả của TikTok Shop</div>
                </div>
              </div>
            </div>

            <div style="background:#FAFAFB;border:1px solid var(--line2);border-radius:12px;padding:14px;">
              <div style="font-size:12px;font-weight:800;color:#334155;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                ${ic('shield', 14)}Phân loại trách nhiệm &amp; Hướng giải quyết
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${reasonList.slice(0, 4).map(r => `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#FFFFFF;border:1px solid var(--line2);border-radius:8px;font-size:12px;">
                    <div style="min-width:0;flex:1 1 auto;">
                      <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(r.label)}</div>
                      <div class="muted" style="font-size:11px;">Trách nhiệm: <strong style="color:var(--pink-ink);">${esc(r.liability)}</strong></div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;margin-left:8px;">
                      <div class="num" style="font-weight:800;color:var(--red);">${vnd(r.amount)}</div>
                      <div class="muted num" style="font-size:10.5px;">${r.count} đơn (Trừ Host: -${vnd(r.hostComm)})</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }

      // 3. Table Rows & Mobile List
      const filteredList = filteredReturns15d();
      const pg = paginate('ret', filteredList);

      const bodyEl = document.getElementById('retBody');
      if (bodyEl) {
        if (!pg.rows.length) {
          bodyEl.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px;" class="muted">Không tìm thấy đơn hoàn 15 ngày nào khớp bộ lọc</td></tr>`;
        } else {
          bodyEl.innerHTML = pg.rows.map(r => {
            const sm = RETURN_15D_STATUSES[r.status] || { label: r.status, pill: 'p-gray' };
            const isHostFault = (r.reasonCode === 'MISMATCH_LIVE_DESC');
            return `<tr class="clickable" onclick="openReturnDetailModal('${r.returnId}')">
              <td>
                <div class="mono" style="font-weight:800;color:var(--pink-ink);">${r.returnId}</div>
                <div class="mono muted" style="font-size:11px;">Đơn gốc: #${r.orderId}</div>
              </td>
              <td>
                <span class="pill ${r.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}" style="font-size:11px;">${r.channel}</span>
                <div class="muted" style="font-size:11px;margin-top:2px;">Host: <strong>${esc(r.hostName)}</strong></div>
              </td>
              <td>
                <div style="font-weight:700;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.productName)}">${esc(r.productName)}</div>
                <div style="display:flex;gap:4px;align-items:center;margin-top:2px;">
                  <span class="mono muted" style="font-size:11px;">${esc(r.sku)}</span>
                  <span class="pill p-gray num" style="height:18px;font-size:10px;padding:0 5px;">x${r.qty}</span>
                </div>
              </td>
              <td>
                <div style="font-weight:700;">${esc(r.buyerName || r.customerName || 'Khách hàng')}</div>
                <div class="muted num" style="font-size:11px;">${esc(r.buyerPhone || r.customerPhone || '')} · ${esc(r.buyerCity || r.city || '')}</div>
              </td>
              <td>
                <div class="num" style="font-size:12px;">Nhận: ${r.deliveredDate?fmtD(r.deliveredDate):'Chưa có mốc giao hàng'}</div>
                <div class="num muted" style="font-size:11px;">Báo hoàn: ${fmtD(r.returnDate)}</div>
                <span class="pill ${r.daysFromDelivery <= 3 ? 'p-sky' : (r.daysFromDelivery <= 7 ? 'p-amber' : 'p-red')}" style="height:18px;font-size:10px;margin-top:2px;">
                  ${returnAgeLabel(r)}
                </span>
              </td>
              <td>
                <div style="font-weight:700;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.reasonLabel)}">${esc(r.reasonLabel)}</div>
                <span class="pill ${isHostFault ? 'p-pink' : 'p-gray'}" style="height:18px;font-size:10px;margin-top:2px;">
                  ${esc(r.liability)}
                </span>
              </td>
              <td>
                <span class="pill ${sm.pill}"><span class="dot"></span>${sm.label}</span>
              </td>
              <td class="r num" style="font-weight:800;color:var(--red);">
                -${vnd(r.returnAmount)}
              </td>
              <td class="r num" style="font-size:12px;">
                <div style="color:var(--red);">Host 0,3%: -${vnd(r.hostCommReduction)}</div>
                <div class="muted" style="font-size:10.5px;">Op 0,1%: -${vnd(r.opCommReduction)}</div>
              </td>
              <td class="r">
                <button type="button" class="btn btn-ghost sm" onclick="event.stopPropagation();openReturnDetailModal('${r.returnId}')" style="height:28px;padding:0 8px;font-size:11px;">Chi tiết</button>
              </td>
            </tr>`;
          }).join('');
        }
      }

      // Mobile list
      const mobEl = document.getElementById('retMobile');
      if (mobEl) {
        if (!pg.rows.length) {
          mobEl.innerHTML = `<div class="muted" style="text-align:center;padding:24px;">Không có đơn hoàn 15 ngày nào</div>`;
        } else {
          mobEl.innerHTML = pg.rows.map(r => {
            const sm = RETURN_15D_STATUSES[r.status] || { label: r.status, pill: 'p-gray' };
            return `
              <div class="m-card" onclick="openReturnDetailModal('${r.returnId}')" style="cursor:pointer;">
                <div class="m-row">
                  <div style="min-width:0;flex:1 1 auto;">
                    <span class="mono" style="font-weight:800;color:var(--pink-ink);">${r.returnId}</span>
                    <span class="num muted" style="font-size:11px;margin-left:4px;">(Đơn #${r.orderId})</span>
                  </div>
                  <span class="pill ${sm.pill}" style="flex-shrink:0;"><span class="dot"></span>${sm.label}</span>
                </div>
                <div class="m-row" style="font-size:11.5px;gap:6px;">
                  <span class="pill ${r.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}">${r.channel}</span>
                  <span class="pill p-gray" style="font-size:10px;">${returnAgeLabel(r)}</span>
                  <span class="pill p-gray" style="height:19px;font-size:10px;">${esc(r.liability)}</span>
                </div>
                <div style="margin:4px 0 2px;font-weight:700;font-size:12.5px;line-height:1.3;color:#1F1420;">
                  ${esc(r.productName)} <span class="pill p-gray num" style="height:18px;font-size:10px;padding:0 5px;">x${r.qty}</span>
                </div>
                <div class="muted" style="font-size:11.5px;margin-bottom:4px;">
                  Lý do: <strong>${esc(r.reasonLabel)}</strong> · Host: <strong>${esc(r.hostName)}</strong>
                </div>
                <div class="m-row num" style="padding-top:4px;border-top:1px dashed var(--line2);font-size:11.5px;gap:6px;">
                  <span class="muted" style="min-width:0;flex:1 1 auto;">Trừ GMV: <strong style="color:var(--red);">${vnd(r.returnAmount)}</strong></span>
                  <span style="color:var(--red);font-size:11.5px;flex-shrink:0;">Trừ KPI Host: <strong>-${vnd(r.hostCommReduction)}</strong></span>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      // Pager & Info
      const infoEl = document.getElementById('retInfo');
      if (infoEl) infoEl.textContent = `Hiển thị ${pg.from}–${pg.to} trên ${pg.total} đơn hoàn theo chính sách 15 ngày`;
      const pagerEl = document.getElementById('retPager');
      if (pagerEl) pagerEl.innerHTML = pagerHtml('ret', pg);

      const nbEl = document.getElementById('nbReturns15d');
      if (nbEl) nbEl.textContent = inRangeReturns.length;

      hydrateIcons(document.getElementById('TAB_RETURNS_15D'));
    }

    function openReturnDetailModal(retId) {
      const r = (state.returns15d || []).find(x => x.returnId === retId);
      if (!r) return;
      const sm = RETURN_15D_STATUSES[r.status] || { label: r.status, pill: 'p-gray', desc: '' };
      if(r.provider==='TIKTOK_API'){
        const context=r.sessionId?'Đã khớp phiên LIVE':'Chưa xác minh phiên LIVE';
        document.getElementById('returnDetailCard').innerHTML=`
          <section class="order-detail return-detail" aria-labelledby="returnDetailTitle">
            <header class="order-detail-head">
              <div><span class="order-detail-eyebrow">TikTok Shop</span><h2 id="returnDetailTitle">Chi tiết yêu cầu hoàn</h2></div>
              <span class="pill ${sm.pill}">${sm.label}</span>
            </header>
            <div class="order-detail-product">
              <span class="card-ic sky">${ic('refresh',18)}</span>
              <div><strong>${esc(r.productName)}</strong><span>${Number(r.qty)||0} sản phẩm · ${context}</span></div>
            </div>
            <dl class="order-detail-grid">
              <div><dt>Đề nghị hoàn</dt><dd class="num">${r.requestedAmount===null?'Chưa có số liệu':vnd(r.requestedAmount)}</dd></div>
              <div><dt>Đã xác nhận hoàn</dt><dd class="num">${vnd(r.returnAmount)}</dd></div>
              <div><dt>Ngày yêu cầu</dt><dd>${fmtD(r.returnDate)}</dd></div>
              <div><dt>Thời điểm yêu cầu</dt><dd>${returnAgeLabel(r)}</dd></div>
              <div class="order-detail-wide"><dt>Lý do</dt><dd>${esc(r.reasonLabel||'TikTok chưa cung cấp')}</dd></div>
            </dl>
            <details class="order-detail-note"><summary>Mã tham chiếu</summary><div class="order-detail-refs"><div><span>Yêu cầu hoàn</span><strong>#${esc(r.returnId)}</strong></div><div><span>Đơn gốc</span><strong>#${esc(r.orderId)}</strong></div></div></details>
            <details class="order-detail-note"><summary>Cách đối soát</summary><p>Chỉ ghi nhận đã hoàn khi TikTok xác nhận hoàn tiền hoàn tất. ${r.reflectedInSession?'Khoản hoàn đã phản ánh vào đối soát phiên.':'KPI phiên chưa bị khấu trừ khi chưa đủ bằng chứng đối soát.'}</p></details>
            <footer class="order-detail-actions"><button type="button" class="btn btn-ghost sm" onclick="closeModal('mdReturnDetail')">Đóng</button></footer>
          </section>`;
        openModal('mdReturnDetail');return;
      }

      document.getElementById('returnDetailCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line2);margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="card-ic" style="background:#FFF1F2;color:#E11D48;"><i data-ic="refresh" data-s="22"></i></div>
            <div>
              <div style="font-size:16px;font-weight:800;">Chi tiết đơn hoàn 15 ngày · TikTok Shop</div>
              <div class="mono muted">${r.returnId} · Đơn gốc #${r.orderId} · <span class="pill ${r.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}" style="font-size:10px;height:18px;">${r.channel}</span></div>
            </div>
          </div>
          <span class="pill ${sm.pill}">${sm.label}</span>
        </div>

        <div class="tl" style="margin-bottom:16px;">
          <div class="tl-i done">
            <div class="tl-dot">${ic('check', 14)}</div>
            <div>
              <div class="tl-t">Khách đặt hàng trên Livestream</div>
              <div class="tl-s num">${fmtD(r.orderDate)} — Phiên LIVE (${r.channel}) · Host: <strong>${esc(r.hostName)}</strong></div>
            </div>
            <span class="pill p-green">Đã đặt</span>
          </div>
          <div class="tl-i done">
            <div class="tl-dot">${ic('check', 14)}</div>
            <div>
              <div class="tl-t">Giao hàng thành công (DELIVERED)</div>
              <div class="tl-s num">${fmtD(r.deliveredDate)} — Đơn hàng chuyển sang Đã giao · Hệ thống tạm tính KPI Live</div>
            </div>
            <span class="pill p-green">Tạm tính KPI</span>
          </div>
          <div class="tl-i bad">
            <div class="tl-dot">${ic('alert', 14)}</div>
            <div>
              <div class="tl-t">Khách yêu cầu Trả hàng / Hoàn tiền (Chính sách 15 ngày TikTok)</div>
              <div class="tl-s num">${fmtD(r.returnDate)} — <strong>${r.daysFromDelivery} ngày</strong> sau khi nhận hàng (Hạn chót: ${fmtD(r.deadlineDate)})</div>
            </div>
            <span class="pill p-red">Ngày ${r.daysFromDelivery}/15</span>
          </div>
          <div class="tl-i ${r.status === 'REFUNDED' ? 'done' : 'live'}">
            <div class="tl-dot">${r.status === 'REFUNDED' ? ic('check', 14) : ''}</div>
            <div>
              <div class="tl-t">Xử lý hoàn tiền &amp; Đối soát khấu trừ quỹ KPI</div>
              <div class="tl-s">${esc(r.warehouseResolution)}</div>
            </div>
            <span class="pill ${sm.pill}">${sm.label}</span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="background:#FFF9FB;border:1px solid var(--line2);border-radius:12px;padding:12px;">
            <div style="font-size:11px;font-weight:800;color:var(--pink-ink);text-transform:uppercase;margin-bottom:6px;">Đối chiếu tài chính đơn hàng</div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:12.5px;">
              <div style="display:flex;justify-content:space-between;"><span class="muted">Giá trị đơn gốc:</span> <strong class="num">${vnd(r.orderAmount)}</strong></div>
              <div style="display:flex;justify-content:space-between;"><span class="muted">Số tiền hoàn trả ví:</span> <strong class="num" style="color:var(--red);">-${vnd(r.returnAmount)}</strong></div>
              <div style="display:flex;justify-content:space-between;padding-top:4px;border-top:1px dashed var(--line2);"><span class="muted">Thu hồi KPI Host (0,3%):</span> <strong class="num" style="color:var(--red);">-${vnd(r.hostCommReduction)}</strong></div>
              <div style="display:flex;justify-content:space-between;"><span class="muted">Thu hồi KPI Op (0,1%):</span> <strong class="num" style="color:var(--red);">-${vnd(r.opCommReduction)}</strong></div>
            </div>
          </div>

          <div style="background:#FAFAFB;border:1px solid var(--line2);border-radius:12px;padding:12px;">
            <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;">Lý do &amp; Trách nhiệm hoàn trả</div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:12.5px;">
              <div><span class="muted">Lý do khách chọn:</span> <strong style="color:#BE123C;">${esc(r.reasonLabel)}</strong></div>
              <div><span class="muted">Trách nhiệm bồi hoàn:</span> <span class="pill p-amber" style="height:18px;font-size:10px;">${esc(r.liability)}</span></div>
              <div><span class="muted">Thủ kho xử lý:</span> <span style="font-size:11.5px;">${esc(r.warehouseResolution)}</span></div>
            </div>
          </div>
        </div>

        <div style="background:#F8FAFC;border:1px solid var(--line2);border-radius:12px;padding:12px;margin-bottom:16px;">
          <div style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;margin-bottom:6px;">Sản phẩm &amp; Khách hàng</div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
            <div>
              <div style="font-weight:700;font-size:13px;">${esc(r.productName)}</div>
              <div class="mono muted" style="font-size:11px;">Mã SKU: ${esc(r.sku)} · Đơn giá: ${vnd(r.unitPrice)} · Số lượng: ${r.qty}</div>
            </div>
            <div class="num" style="font-weight:800;font-size:14px;color:var(--pink-ink);">${vnd(r.returnAmount)}</div>
          </div>
          <div style="font-size:12px;color:#475569;border-top:1px dashed var(--line2);padding-top:6px;">
            Người mua: <strong>${esc(r.buyerName || r.customerName || 'Khách hàng')}</strong> · ${esc(r.buyerPhone || r.customerPhone || '')} (${esc(r.buyerCity || r.city || '')})
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-top:12px;border-top:1px solid var(--line2);">
          <div>
            ${isAdmin() ? `
              <button type="button" class="btn btn-soft sm" onclick="closeModal('mdReturnDetail'); openShiftModal('${r.sessionId}');" title="Mở danh sách ca LIVE để điền GMV sau hoàn 15 ngày">
                🎯 Mở ca LIVE để điền GMV sau hoàn 15 ngày
              </button>
            ` : ''}
          </div>
          <button type="button" class="btn btn-grad sm" onclick="closeModal('mdReturnDetail')">Đóng</button>
        </div>
      `;
      hydrateIcons(document.getElementById('returnDetailCard'));
      openModal('mdReturnDetail');
    }

    function openPolicy15dModal() {
      document.getElementById('policy15dCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line2);margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="card-ic" style="background:#EEF2FF;color:#4F46E5;"><i data-ic="info" data-s="22"></i></div>
            <div>
              <div style="font-size:16px;font-weight:800;">Chính sách Đổi trả 15 ngày TikTok Shop</div>
              <div class="muted" style="font-size:11.5px;">Quy chuẩn đối soát GMV &amp; Bảo vệ quỹ lương Khang Baby</div>
            </div>
          </div>
          <button type="button" class="icon-btn" onclick="closeModal('mdPolicy15d')" aria-label="Đóng"><i data-ic="x" data-s="18"></i></button>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;font-size:12.5px;line-height:1.5;">
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:12px;">
            <div style="font-weight:800;color:#166534;margin-bottom:4px;">1. Thời hạn và điều kiện trả hàng</div>
            <div>Khách hàng mua qua TikTok Shop / TikTok Mall có quyền yêu cầu Trả hàng / Hoàn tiền trong vòng <strong>15 ngày dương lịch</strong> kể từ lúc kiện hàng chuyển trạng thái <strong>DELIVERED (Giao hàng thành công)</strong>. Hàng hóa phải còn nguyên vẹn tem mác niêm phong nếu lý do là Đổi ý không dùng.</div>
          </div>

          <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;padding:12px;">
            <div style="font-weight:800;color:#9F1239;margin-bottom:4px;">2. Cơ chế đối soát GMV &amp; Khấu trừ hoa hồng</div>
            <div>Khi đơn giao thành công, hệ thống ghi nhận GMV đối soát tạm tính để thưởng nóng cho phiên Live. Nếu trong 15 ngày phát sinh hoàn tiền qua ví TikTok, số tiền hoàn này sẽ <strong>tự động khấu trừ vào GMV đối soát thực thu</strong> và trích giảm tương ứng <strong>0,3% Host và 0,1% Operator</strong> để bảo đảm doanh nghiệp không trả trùng chi phí cho đơn hủy hoàn.</div>
          </div>

          <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:12px;">
            <div style="font-weight:800;color:#92400E;margin-bottom:4px;">3. Xử lý tranh chấp &amp; Bồi thường</div>
            <div>Đối với các trường hợp hư hỏng do vận chuyển hoặc khách trả hàng giả / tráo hàng, bộ phận Vận hành sẽ khiếu nại TikTok trong vòng 48h kèm video đóng hàng và biên bản đồng kiểm để đòi bồi thường 100% giá trị đơn hàng.</div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--line2);">
          <button type="button" class="btn btn-grad sm" onclick="closeModal('mdPolicy15d')">Đã hiểu</button>
        </div>
      `;
      hydrateIcons(document.getElementById('policy15dCard'));
      openModal('mdPolicy15d');
    }

    function exportReturns15dCsv() {
      const list = filteredReturns15d();
      if (!list.length) { toast('Không có đơn hoàn 15 ngày nào để xuất'); return; }
      const header = ['MaYeuCauHoan', 'MaDonGoc', 'Kenh', 'MaPhienLIVE', 'NgayKhachNhan', 'NgayBaoHoan', 'SoNgaySauNhan', 'SanPham', 'SKU', 'SoLuong', 'GMVHoan', 'LyDoHoan', 'TrachNhiem', 'TrangThai', 'GiamTruHost03', 'GiamTruOp01', 'HostPhuTrach', 'KhachHang', 'SDT', 'TinhThanh'];
      const rows = list.map(r => [
        `"${r.returnId}"`,
        `"${r.orderId}"`,
        `"${r.channel}"`,
        `"${r.sessionId}"`,
        `"${r.deliveredDate}"`,
        `"${r.returnDate}"`,
        r.daysFromDelivery,
        `"${(r.productName || '').replace(/"/g, '""')}"`,
        `"${r.sku}"`,
        r.qty,
        r.returnAmount,
        `"${(r.reasonLabel || '').replace(/"/g, '""')}"`,
        `"${(r.liability || '').replace(/"/g, '""')}"`,
        `"${(r.statusLabel || '').replace(/"/g, '""')}"`,
        Math.round(r.hostCommReduction),
        Math.round(r.opCommReduction),
        `"${(r.hostName || '').replace(/"/g, '""')}"`,
        `"${(r.buyerName || r.customerName || '').replace(/"/g, '""')}"`,
        `"${r.buyerPhone || r.customerPhone || ''}"`,
        `"${(r.buyerCity || r.city || '').replace(/"/g, '""')}"`
      ].join(','));
      const csv = '\uFEFF' + [header.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Don_Hoan_15_Ngay_TikTok_${state.from}_${state.to}.csv`;
      a.click();
      toast(`Đã xuất ${list.length} đơn hoàn 15 ngày sang CSV`);
    }

    /* ---------- 12. Render Tab: KPI nhân sự ---------- */
    /* ---------- 12a. Helper: Phụ cấp ngày Campaign (100k/ngày) & Mega Live (500k/ngày) ---------- */
    function computeStaffCampMega(u, sessionList) {
      const campDates = new Set();
      const megaDates = new Set();
      const campSessions = [];
      const megaSessions = [];

      (sessionList || []).forEach(s => {
        if (!s.isManualKpi) return;
        const type = s.manualKpiType;
        if (type !== 'CAMPAIGN' && type !== 'MEGA_LIVE') return;

        let participated = false;
        let myRole = u.role;
        let personalGmv = 0;
        let bonus = 0;

        if (s.manualStaff && s.manualStaff.length > 0) {
          const myManual = s.manualStaff.filter(ms => ms.userId === u.id || ms.hostId === u.id || ms.operatorId === u.id);
          if (myManual.length > 0) {
            participated = true;
            myRole = myManual[0].hostId === u.id ? 'HOST' : (myManual[0].operatorId === u.id ? 'OPERATOR' : (myManual[0].role || u.role));
            personalGmv = myManual.reduce((a, b) => a + (Number(b.shiftGmv !== undefined ? b.shiftGmv : b.personalGmv) || 0), 0);
            bonus = myManual.reduce((a, b) => a + (Number(b.hostId === u.id ? b.hostBonus : (b.operatorId === u.id ? b.opBonus : b.bonus)) || 0), 0);
          }
        } else if (s.hasShifts && (getStaffShiftsInSession(s, u.id).length > 0 || (s.shifts || []).some(sh => sh.userId === u.id))) {
          participated = true;
        } else if ((u.role === 'HOST' && s.hostId === u.id) || (u.role === 'OPERATOR' && s.operatorId === u.id)) {
          participated = true;
        } else if ((s.manualKpiNote || '').toLowerCase().includes((u.name || '').toLowerCase())) {
          participated = true;
          bonus = Number(s.manualKpiBonus) || 0;
        }

        if (participated) {
          if (type === 'MEGA_LIVE') {
            megaDates.add(s.date);
            megaSessions.push({ session: s, role: myRole, personalGmv, bonus });
          } else if (type === 'CAMPAIGN') {
            campDates.add(s.date);
            campSessions.push({ session: s, role: myRole, personalGmv, bonus });
          }
        }
      });

      const campDays = campDates.size;
      const megaDays = megaDates.size;
      const campRate = 100000; // 100k / ngày
      const megaRate = 500000; // 500k / ngày
      const campAllowance = campDays * campRate;
      const megaAllowance = megaDays * megaRate;
      const totalAllowance = campAllowance + megaAllowance;

      return {
        campDates,
        megaDates,
        campDays,
        megaDays,
        campRate,
        megaRate,
        campAllowance,
        megaAllowance,
        totalAllowance,
        campSessions,
        megaSessions
      };
    }

    function renderStaffKpi() {
      const q = (document.getElementById('stfSearch')?.value || '').trim().toLowerCase();
      const roleFilter = document.getElementById('stfRole')?.value || 'ALL';
      const sortMode = document.getElementById('stfSort')?.value || 'COMM_DESC';
      const admin = isAdmin();
      const myUser = me();
      const myId = myUser?.id;
      // Người dùng thường CHỈ hiển thị duy nhất bản thân người đó (Không hiển thị người khác)
      const staffList = state.users.filter(u => u.status === 'APPROVED' && (u.role === 'HOST' || u.role === 'OPERATOR') && (admin ? true : u.id === myId));
      // Cố định hiển thị và tính toán theo cả tháng hiện tại (Tháng 10/2026: 01/10/2026 - 31/10/2026)
      const list = filteredMonthSessions();

      // Tính toán hiệu suất KPI doanh số cho từng nhân sự
      const staffStats = staffList.map(u => {
        let sesCount = 0;
        let grossLive = 0;
        let affiliate = 0;
        let pending = 0;
        let cancel = 0;
        let recGmv = 0;
        let autoComm = 0;
        let pendingShiftComm = 0;

        list.forEach(s => {
          if (s.hasShifts) {
            const myShifts = getStaffShiftsInSession(s, u.id);
            if (myShifts.length > 0) {
              sesCount++;
              myShifts.forEach(sh => {
                if (sh.isApproved && !s.manual) {
                  recGmv += sh.recGmv;
                  autoComm += (sh.comm || 0);
                } else if (!sh.isApproved && !s.manual) {
                  pendingShiftComm += (sh.comm || 0);
                }
              });
            }
          } else {
            const isMySession = (u.role === 'HOST' && s.hostId === u.id) || (u.role === 'OPERATOR' && s.operatorId === u.id);
            if (isMySession) {
              sesCount++;
              grossLive += s.grossLiveGmv;
              affiliate += s.affiliateGmv;
              pending += s.pendingRecGmv;
              cancel += s.cancelReturnGmv;
              if (!s.manual) {
                recGmv += s.kpiGmv;
                autoComm += (u.role === 'HOST' ? s.hostComm : s.opComm);
              }
            }
          }
        });

        // Manual campaign bonus & personal GMV attributed to this staff member
        // Manual campaign bonus & personal GMV attributed to this staff member (Chỉ tính ca đã được Admin duyệt)
        let manualBonus = 0;
        let manualPendingBonus = 0;
        list.forEach(s => {
          if (s.isManualKpi) {
            if (s.manualStaff && s.manualStaff.length > 0) {
              const contrib = getStaffManualContribution(s, u.id, true);
              if (contrib.count > 0 || contrib.pendingBonus > 0) {
                if (contrib.count > 0) sesCount += contrib.count;
                grossLive += contrib.gmv;
                recGmv += contrib.gmv;
                manualBonus += contrib.bonus;
                manualPendingBonus += contrib.pendingBonus;
              }
            } else if ((s.manualKpiNote || '').toLowerCase().includes(u.name.toLowerCase())) {
              sesCount++;
              manualBonus += (Number(s.manualKpiBonus) || 0);
            }
          }
        });
        autoComm += manualBonus;
        pendingShiftComm += manualPendingBonus;

        // Phụ cấp theo ngày: Camp (100k/ngày), Mega (500k/ngày) (Đã loại bỏ thưởng thêm thủ công)
        const campMega = computeStaffCampMega(u, list);
        const totalIncome = autoComm + campMega.totalAllowance;
        const liveMinutes = staffRoleLiveMinutes(list, u);

        return {
          u, sesCount, liveMinutes, grossLive, affiliate, pending, cancel, recGmv, autoComm, pendingShiftComm,
          campMega,
          totalIncome,
          rate: u.role === 'HOST' ? '0,3%' : '0,1%',
        };
      });

      // Update badge counter
      const elNbStaff = document.getElementById('nbStaff');
      if (elNbStaff) elNbStaff.textContent = staffStats.length;

      // 4 Top Summary KPI Cards for Staff Revenue & Camp/Mega Allowance
      const elStfKpis = document.getElementById('stfKpis');
      if (elStfKpis) {
        const totAutoComm = staffStats.reduce((a, b) => a + b.autoComm, 0);
        const totCampMega = staffStats.reduce((a, b) => a + b.campMega.totalAllowance, 0);
        const totIncome = totAutoComm + totCampMega;
        const hostCommSum = staffStats.filter(s => s.u.role === 'HOST').reduce((a, b) => a + b.autoComm, 0);
        const opCommSum = staffStats.filter(s => s.u.role === 'OPERATOR').reduce((a, b) => a + b.autoComm, 0);
        const hostLiveMinutes = staffStats.filter(s => s.u.role === 'HOST').reduce((a, b) => a + b.liveMinutes, 0);

        elStfKpis.innerHTML = admin ? `
          <div class="kpi hl">
            <div class="kpi-top"><div class="kpi-ic p-green">${ic('check', 18)}</div><div class="kpi-l">Tổng thu nhập KPI nhân sự</div></div>
            <div class="kpi-v num" style="color:var(--pink2);" data-count-to="${totIncome}" data-format="vnd" data-anim-key="stf-totIncome">${vnd(totIncome)}</div>
            <div class="kpi-s num"><span>Hoa hồng: <strong data-count-to="${totAutoComm}" data-format="vnd">${vnd(totAutoComm)}</strong></span><span>Phụ cấp C/M: <strong data-count-to="${totCampMega}" data-format="vnd" style="color:var(--amber);">${vnd(totCampMega)}</strong></span></div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-ic p-pink">${ic('video', 18)}</div><div class="kpi-l">Hoa hồng Host (0,3%)</div></div>
            <div class="kpi-v num" style="color:var(--pink-ink);" data-count-to="${hostCommSum}" data-format="vnd" data-anim-key="stf-hostComm">${vnd(hostCommSum)}</div>
            <div class="kpi-s num"><span>${staffStats.filter(s => s.u.role === 'HOST').length} Host</span><span>GMV đã ĐS: <strong data-count-to="${staffStats.filter(s => s.u.role === 'HOST').reduce((a, b) => a + b.recGmv, 0)}" data-format="short" data-anim-key="stf-host-rec">${short(staffStats.filter(s => s.u.role === 'HOST').reduce((a, b) => a + b.recGmv, 0))}</strong></span></div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-ic p-violet">${ic('users', 18)}</div><div class="kpi-l">Hoa hồng Operator (0,1%)</div></div>
            <div class="kpi-v num" style="color:var(--violet-ink);" data-count-to="${opCommSum}" data-format="vnd" data-anim-key="stf-opComm">${vnd(opCommSum)}</div>
            <div class="kpi-s num"><span>${staffStats.filter(s => s.u.role === 'OPERATOR').length} Operator</span><span>GMV đã ĐS: <strong data-count-to="${staffStats.filter(s => s.u.role === 'OPERATOR').reduce((a, b) => a + b.recGmv, 0)}" data-format="short" data-anim-key="stf-op-rec">${short(staffStats.filter(s => s.u.role === 'OPERATOR').reduce((a, b) => a + b.recGmv, 0))}</strong></span></div>
          </div>
          <div class="kpi" style="border-color:#BAE6FD;background:linear-gradient(180deg,#FFFFFF 0%,#F0F9FF 100%);">
            <div class="kpi-top"><div class="kpi-ic p-sky"><i data-ic="clock" data-s="18"></i></div><div class="kpi-l" style="color:#075985;font-weight:800;">Tổng giờ LIVE của Host</div></div>
            <div class="kpi-v num" style="color:#0369A1;">${formatLiveMinutes(hostLiveMinutes)}</div>
            <div class="kpi-s num"><span>${staffStats.filter(s => s.u.role === 'HOST').length} Host</span><span>Không tính Vận hành</span></div>
          </div>` : `
          <div class="kpi hl">
            <div class="kpi-top"><div class="kpi-ic p-green">${ic('check', 18)}</div><div class="kpi-l">Tổng thu nhập của bạn</div></div>
            <div class="kpi-v num" style="color:var(--pink2);" data-count-to="${totIncome}" data-format="vnd" data-anim-key="stf-totIncome">${vnd(totIncome)}</div>
            <div class="kpi-s num"><span>Hoa hồng: <strong>${vnd(totAutoComm)}</strong></span><span>Phụ cấp: <strong style="color:var(--amber);">${vnd(totCampMega)}</strong></span></div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-ic p-pink">${ic('video', 18)}</div><div class="kpi-l">Hoa hồng ${myUser?.role === 'HOST' ? 'Host (0,3%)' : 'Operator (0,1%)'}</div></div>
            <div class="kpi-v num" style="color:var(--pink-ink);" data-count-to="${totAutoComm}" data-format="vnd" data-anim-key="stf-myComm">${vnd(totAutoComm)}</div>
            <div class="kpi-s num"><span>Tỷ lệ: <strong>${myUser?.role === 'HOST' ? '0,3%' : '0,1%'}</strong></span><span>${staffStats[0]?.sesCount || 0} ca live</span></div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-ic p-violet">${ic('users', 18)}</div><div class="kpi-l">GMV cá nhân đã đối soát</div></div>
            <div class="kpi-v num" style="color:var(--violet-ink);" data-count-to="${staffStats[0]?.recGmv || 0}" data-format="short" data-anim-key="stf-my-rec">${short(staffStats[0]?.recGmv || 0)}</div>
            <div class="kpi-s num"><span>Số thực sau hoàn hủy</span><span>Tích lũy tháng</span></div>
          </div>
          ${myUser?.role === 'HOST' ? `<div class="kpi" style="border-color:#BAE6FD;background:linear-gradient(180deg,#FFFFFF 0%,#F0F9FF 100%);">
            <div class="kpi-top"><div class="kpi-ic p-sky"><i data-ic="clock" data-s="18"></i></div><div class="kpi-l" style="color:#075985;font-weight:800;">Tổng giờ LIVE của bạn</div></div>
            <div class="kpi-v num" style="color:#0369A1;">${formatLiveMinutes(hostLiveMinutes)}</div>
            <div class="kpi-s num"><span>${staffStats[0]?.sesCount || 0} phiên được phân công</span><span>Trong tháng hiện tại</span></div>
          </div>` : ''}`;
      }

      // Filter & Sort
      let filtered = staffStats.filter(st => {
        if (roleFilter !== 'ALL' && st.u.role !== roleFilter) return false;
        if (q && !`${st.u.name} ${st.u.email} ${st.u.role}`.toLowerCase().includes(q)) return false;
        return true;
      });

      if (sortMode === 'COMM_DESC') filtered.sort((a, b) => b.totalIncome - a.totalIncome);
      else if (sortMode === 'GMV_DESC') filtered.sort((a, b) => b.recGmv - a.recGmv);
      else if (sortMode === 'SES_DESC') filtered.sort((a, b) => b.sesCount - a.sesCount);
      else if (sortMode === 'NAME_ASC') filtered.sort((a, b) => a.u.name.localeCompare(b.u.name));

      const pg = paginate('stf', filtered);

      // Desktop Table Rows
      const elStfBody = document.getElementById('stfBody');
      if (elStfBody) {
        elStfBody.innerHTML = pg.rows.map(st => {
          const rolePill = st.u.role === 'HOST'
            ? `<span class="pill p-pink"><span class="dot"></span>Host (0,3%)</span>`
            : `<span class="pill p-violet"><span class="dot"></span>Operator (0,1%)</span>`;
          const isHost = st.u.role === 'HOST';
          const isAd = isAdmin();
          const hasTarget = (st.u.targetGmv || 0) > 0;
          const target = st.u.targetGmv || (isHost ? 1000000000 : 0);
          const targetPct = target > 0 ? Math.min(100, Math.round((st.recGmv / target) * 100)) : 0;
          const targetRemain = Math.max(0, target - st.recGmv);

          const isSelf = me() && me().id === st.u.id;
          const targetBtnLabel = isAd
            ? (hasTarget ? '🎯 Sửa Target' : '🎯 Sét Target')
            : (isSelf ? (hasTarget ? '🎯 Sửa Target' : '🎯 Đặt Target') : '🔒 Xem Target');
          const targetBtnTitle = isAd
            ? 'Admin toàn quyền sét và sửa Target cho Host'
            : (isSelf ? 'Host tự đặt & điều chỉnh Target cá nhân' : 'Xem Target của Host');

          const targetCell = isHost ? `
            <div style="min-width:145px;">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:3px;">
                <span class="num font-bold" style="color:var(--text);font-weight:800;">${hasTarget ? short(st.u.targetGmv) : 'Chưa đặt'}</span>
                ${hasTarget ? `
                <span class="pill ${targetPct >= 100 ? 'p-green' : 'p-pink'}" style="font-size:9.5px;height:18px;padding:0 5px;font-weight:800;">
                  ${targetPct}%
                </span>` : `<span class="pill p-gray" style="font-size:9.5px;height:18px;padding:0 5px;">0%</span>`}
              </div>
              <div class="prog" style="height:6px;background:#F5E6EE;border-radius:99px;margin-bottom:3px;">
                <span style="width:${targetPct}%;background:var(--grad);border-radius:99px;"></span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="muted" style="font-size:10px;">${hasTarget ? (targetRemain > 0 ? `Thiếu: ${short(targetRemain)}` : '<strong style="color:var(--green);">Đạt 100%</strong>') : 'Chưa có target'}</span>
                <button type="button" class="btn-link" style="font-size:10.5px;color:${isAd ? 'var(--pink2)' : 'var(--pink-ink)'};font-weight:800;" onclick="openHostTargetModal('${st.u.id}')" title="${targetBtnTitle}">
                  ${targetBtnLabel}
                </button>
              </div>
            </div>` : `<span class="muted" style="font-size:11px;font-style:italic;">— Không áp dụng (Chỉ Host LIVE)</span>`;

          return `<tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                ${avatarHtml(st.u)}
                <div>
                  <div style="font-weight:800;">${esc(st.u.name)}</div>
                  <div class="mono muted" style="font-size:11px;">${esc(st.u.email)}</div>
                </div>
              </div>
            </td>
            <td>${rolePill}</td>
            <td class="r num" style="font-weight:700;">
              <div>${st.sesCount} <span class="muted" style="font-size:11px;">phiên</span></div>
            </td>
            <td class="r num" style="font-weight:800;color:#0369A1;white-space:nowrap;">${isHost ? formatLiveMinutes(st.liveMinutes) : '<span class="muted">—</span>'}</td>
            <td class="r num">
              <div style="font-weight:800;">${vnd(st.recGmv)}</div>
              ${st.pending ? `<div class="muted" style="font-size:11px;">Chờ: ${short(st.pending)}</div>` : ''}
            </td>
            <td>${targetCell}</td>
            <td class="r num">
              <div style="font-weight:800;color:var(--pink2);">${vnd(st.autoComm)}</div>
              ${st.pendingShiftComm > 0 ? `<div style="font-size:10.5px;color:var(--amber);font-weight:700;">(+${short(st.pendingShiftComm)} chờ)</div>` : ''}
            </td>
            <td class="r num">
              ${st.campMega.totalAllowance > 0 ? `
                <div style="font-weight:800;color:var(--amber);font-size:12.5px;">+${vnd(st.campMega.totalAllowance)}</div>
                <div style="margin-top:2px;display:flex;gap:3px;justify-content:flex-end;align-items:center;flex-wrap:wrap;">
                  ${st.campMega.campDays > 0 ? `<span class="pill p-sky" style="height:17px;font-size:9px;padding:0 4px;font-weight:800;" title="${st.campMega.campDays} ngày Campaign (+100k/ngày)">${st.campMega.campDays} Camp</span>` : ''}
                  ${st.campMega.megaDays > 0 ? `<span class="pill p-amber" style="height:17px;font-size:9px;padding:0 4px;font-weight:800;" title="${st.campMega.megaDays} ngày Mega Live (+500k/ngày)">${st.campMega.megaDays} Mega</span>` : ''}
                </div>` : '<span class="muted">—</span>'}
            </td>
            <td class="r num" style="font-weight:800;color:var(--green);font-size:13.5px;">${vnd(st.totalIncome)}</td>
            <td class="r">
              <div style="display:flex;gap:4px;justify-content:flex-end;">
                ${isHost ? `
                  <button type="button" class="btn btn-soft sm" style="height:26px;padding:0 7px;font-size:11px;" onclick="openHostTargetModal('${st.u.id}')" title="${targetBtnTitle}">
                    <i data-ic="${isAd ? 'target' : (hasTarget ? 'lock' : 'target')}" data-s="12"></i>
                  </button>` : ''}
                <button type="button" class="btn btn-ghost sm" style="height:26px;padding:0 8px;font-size:11px;" onclick="openStaffSessionsModal('${st.u.id}')">
                  <i data-ic="search" data-s="12"></i>Chi tiết
                </button>
              </div>
            </td>
          </tr>`;
        }).join('');
      }

      // Mobile Cards
      const elStfMobile = document.getElementById('stfMobile');
      if (elStfMobile) {
        elStfMobile.innerHTML = pg.rows.map(st => {
          const rolePill = st.u.role === 'HOST'
            ? `<span class="pill p-pink" style="font-size:10px;height:20px;">Host (0,3%)</span>`
            : `<span class="pill p-violet" style="font-size:10px;height:20px;">Operator (0,1%)</span>`;
          const isHost = st.u.role === 'HOST';
          const isAd = isAdmin();
          const hasTarget = (st.u.targetGmv || 0) > 0;
          const target = st.u.targetGmv || (isHost ? 1000000000 : 0);
          const targetPct = target > 0 ? Math.min(100, Math.round((st.recGmv / target) * 100)) : 0;
          const targetRemain = Math.max(0, target - st.recGmv);
          const isSelf = me() && me().id === st.u.id;
          const targetBtnLabel = isAd
            ? (hasTarget ? '🎯 Sửa Target' : '🎯 Sét Target')
            : (isSelf ? (hasTarget ? '🎯 Sửa Target' : '🎯 Đặt Target') : '🔒 Xem Target');

          return `<div class="m-card">
            <div class="m-row">
              <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 auto;">
                ${avatarHtml(st.u)}
                <div style="min-width:0;">
                  <div style="font-weight:800;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(st.u.name)}</div>
                  <div style="display:flex;gap:4px;align-items:center;margin-top:2px;flex-wrap:wrap;">
                    ${rolePill} <span class="muted mono" style="font-size:10.5px;">${st.sesCount} phiên${isHost ? ` · ${formatLiveMinutes(st.liveMinutes)}` : ''}</span>
                  </div>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div class="muted" style="font-size:10px;">Tổng thu nhập KPI</div>
                <strong class="num" style="color:var(--green);font-size:14px;">${vnd(st.totalIncome)}</strong>
              </div>
            </div>
            ${isHost ? `
              <div style="background:#FFF9FC;border:1px solid #FDE2EE;border-radius:10px;padding:7px 9px;margin-top:6px;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:3px;">
                  <span style="font-weight:700;color:var(--pink-ink);">🎯 Target Host: <strong class="num" style="color:var(--text);">${hasTarget ? short(st.u.targetGmv) : 'Chưa đặt'}</strong></span>
                  ${hasTarget ? `
                  <span class="pill ${targetPct >= 100 ? 'p-green' : 'p-pink'}" style="font-size:9.5px;height:18px;padding:0 5px;font-weight:800;">
                    ${targetPct}%
                  </span>` : `<span class="pill p-gray" style="font-size:9.5px;height:18px;padding:0 5px;">0%</span>`}
                </div>
                <div class="prog" style="height:5px;background:#F5E6EE;border-radius:99px;margin-bottom:3px;">
                  <span style="width:${targetPct}%;background:var(--grad);border-radius:99px;"></span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);">
                  <span>Đã đối soát: <strong class="num" style="color:var(--text);">${short(st.recGmv)}</strong></span>
                  <button type="button" class="btn-link" style="font-size:10.5px;color:${isAd ? 'var(--pink2)' : 'var(--pink-ink)'};font-weight:800;" onclick="openHostTargetModal('${st.u.id}')">${targetBtnLabel}</button>
                </div>
              </div>` : ''}
            <div class="m-grid4 num" style="grid-template-columns:repeat(3,1fr)!important;margin-top:6px;">
              <div><span class="k">GMV đã ĐS</span><span class="v" style="font-weight:800;">${short(st.recGmv)}</span></div>
              <div><span class="k">KPI tự động</span><span class="v" style="color:var(--pink2);">${short(st.autoComm)}</span></div>
              <div><span class="k">Phụ cấp C/M</span><span class="v" style="color:var(--amber);font-weight:800;">${st.campMega.totalAllowance ? short(st.campMega.totalAllowance) : '—'}</span></div>
            </div>
            ${st.campMega.totalAllowance > 0 ? `
              <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:6px 9px;margin-top:6px;font-size:11px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;box-sizing:border-box;">
                <span style="font-weight:700;color:#92400E;">🎖️ Phụ cấp Camp &amp; Mega:</span>
                <span class="num" style="color:#B45309;font-weight:800;">+${vnd(st.campMega.totalAllowance)} (${st.campMega.campDays} Camp · ${st.campMega.megaDays} Mega)</span>
              </div>` : ''}
            <div style="display:flex;justify-content:center;margin-top:8px;padding-top:6px;border-top:1px dashed var(--line2);">
              <button type="button" class="btn btn-ghost sm" style="height:28px;padding:0 10px;font-size:11.5px;width:100%;justify-content:center;" onclick="openStaffSessionsModal('${st.u.id}')">
                <i data-ic="search" data-s="13"></i>Xem chi tiết các phiên LIVE (${st.sesCount}) →
              </button>
            </div>
          </div>`;
        }).join('');
      }

      const elStfInfo = document.getElementById('stfInfo');
      if (elStfInfo) elStfInfo.textContent = `Hiển thị ${pg.from}–${pg.to} trên ${pg.total} nhân sự`;
      const elStfPager = document.getElementById('stfPager');
      if (elStfPager) elStfPager.innerHTML = pagerHtml('stf', pg);
      hydrateIcons(document.getElementById('TAB_STAFF_KPI'));
    }

    function openStaffSessionsModal(userId) {
      if (!isAdmin() && userId !== me()?.id) {
        toast('🔒 Quyền riêng tư: Bạn chỉ có thể xem số liệu ca live của chính mình!');
        return;
      }
      const u = state.users.find(x => x.id === userId);
      if (!u) return;
      const list = filteredMonthSessions();
      const mySessions = list.filter(s =>
        (s.hasShifts && (getStaffShiftsInSession(s, u.id).length > 0 || (s.shifts || []).some(sh => sh.userId === u.id))) ||
        (!s.hasShifts && !s.isManualKpi && ((u.role === 'HOST' && s.hostId === u.id) || (u.role === 'OPERATOR' && s.operatorId === u.id))) ||
        (s.isManualKpi && ((s.manualStaff && s.manualStaff.some(ms => ms.userId === u.id || ms.hostId === u.id || ms.operatorId === u.id)) || (!s.manualStaff?.length && (s.manualKpiNote || '').toLowerCase().includes(u.name.toLowerCase()))))
      );
      const rate = u.role === 'HOST' ? '0,3%' : '0,1%';

      let totRecGmv = 0, totComm = 0, totPendingComm = 0, manualBonus = 0;
      let shiftCount = 0, onTimeCount = 0, lateCount = 0;
      mySessions.forEach(s => {
        if (s.isManualKpi) {
          if (s.manualStaff && s.manualStaff.length > 0) {
            const contrib = getStaffManualContribution(s, u.id, true);
            totRecGmv += contrib.gmv;
            totComm += contrib.bonus;
            totPendingComm += contrib.pendingBonus;
            if (contrib.count > 0) shiftCount += contrib.count;
          } else if ((s.manualKpiNote || '').toLowerCase().includes(u.name.toLowerCase())) {
            totComm += (Number(s.manualKpiBonus) || 0);
          }
          return;
        }
        if (s.hasShifts) {
          const myShifts = getStaffShiftsInSession(s, u.id);
          myShifts.forEach(sh => {
            shiftCount++;
            const punc = checkShiftPunctuality(sh.timeSlot, sh.actualStart);
            if (punc.isLate) lateCount++;
            else onTimeCount++;

            if (sh.isApproved) {
              totRecGmv += sh.recGmv;
              totComm += (sh.comm || 0);
            } else {
              totPendingComm += (sh.comm || 0);
            }
          });
        } else {
          totRecGmv += s.kpiGmv;
          totComm += (u.role === 'HOST' ? s.hostComm : s.opComm);
        }
      });
      const campMega = computeStaffCampMega(u, list);
      const totalIncome = totComm + campMega.totalAllowance;

      document.getElementById('staffSessionsCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line2);margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${avatarHtml(u)}
            <div>
              <div style="font-size:16px;font-weight:800;">${esc(u.name)} <span class="pill ${u.role === 'HOST' ? 'p-pink' : 'p-violet'}" style="margin-left:4px;">${ROLE[u.role].label} (${rate})</span></div>
              <div class="mono muted" style="font-size:11.5px;">${esc(u.email)} · Khoảng lọc: ${fmtDs(state.from)} → ${fmtDs(state.to)}</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
            <span class="pill p-green num" style="font-weight:800;">${mySessions.length} phiên LIVE</span>
            ${shiftCount > 0 ? `
              <span class="pill ${lateCount > 0 ? 'p-amber' : 'p-green'} num" style="height:20px;font-size:10px;padding:0 6px;font-weight:700;">
                ⏱️ ${onTimeCount}/${shiftCount} ca đúng giờ ${lateCount > 0 ? `· (${lateCount} muộn)` : ''}
              </span>` : ''}
          </div>
        </div>

        ${u.role === 'HOST' ? `
          <div style="background:#FFF9FC;border:1.5px solid #FBCFE8;border-radius:14px;padding:12px;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:12.5px;font-weight:800;color:var(--pink-ink);">🎯 Mục tiêu Target cá nhân:</span>
                <strong class="num" style="font-size:14px;color:var(--text);">${vnd(u.targetGmv || 1000000000)}</strong>
                <span class="pill ${(totRecGmv / (u.targetGmv || 1000000000)) >= 1 ? 'p-green' : 'p-pink'}" style="font-weight:800;font-size:11px;">
                  ${Math.min(100, Math.round((totRecGmv / (u.targetGmv || 1000000000)) * 100))}%
                </span>
              </div>
              ${(() => {
                const isSelf = me() && me().id === u.id;
                const canEditTgt = isAdmin() || isSelf;
                const btnLabel = isAdmin()
                  ? ((u.targetGmv || 0) > 0 ? 'Admin Sửa Target' : 'Admin Sét Target')
                  : (isSelf ? ((u.targetGmv || 0) > 0 ? 'Sửa Target cá nhân' : 'Tự điền Target') : 'Xem Target');
                return `
                  <button type="button" class="btn ${canEditTgt ? 'btn-grad' : 'btn-soft'} sm" style="height:26px;padding:0 9px;font-size:11px;font-weight:800;" onclick="openHostTargetModal('${u.id}')">
                    <i data-ic="${canEditTgt ? 'edit' : 'lock'}" data-s="11"></i><span>${btnLabel}</span>
                  </button>`;
              })()}
            </div>
            <div class="prog" style="height:8px;background:#FDE8F1;border-radius:99px;margin-bottom:6px;">
              <span style="width:${Math.min(100, Math.round((totRecGmv / (u.targetGmv || 1000000000)) * 100))}%;background:var(--grad);border-radius:99px;"></span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);flex-wrap:wrap;gap:4px;">
              <span>Đã đối soát: <strong class="num" style="color:var(--text);">${vnd(totRecGmv)}</strong></span>
              <span>${(u.targetGmv || 1000000000) > totRecGmv ? `Còn thiếu: <strong class="num" style="color:var(--red);">-${vnd((u.targetGmv || 1000000000) - totRecGmv)}</strong>` : '<strong style="color:var(--green);">🎉 Đã vượt target!</strong>'}</span>
              <span>Hoa hồng 0,3% khi đạt: <strong class="num" style="color:var(--pink2);">${vnd(Math.round((u.targetGmv || 1000000000) * 0.003))}</strong></span>
            </div>
          </div>` : ''}

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#FCF8FA;border:1px solid var(--line2);border-radius:14px;padding:12px;margin-bottom:14px;">
          <div><div class="muted" style="font-size:11px;">GMV đã đối soát chốt</div><strong class="num" style="font-size:14px;color:var(--text);" data-count-to="${totRecGmv}" data-format="vnd">${vnd(totRecGmv)}</strong></div>
          <div><div class="muted" style="font-size:11px;">Hoa hồng tự động (${rate})</div><strong class="num" style="font-size:14px;color:var(--pink2);" data-count-to="${totComm}" data-format="vnd">${vnd(totComm)}</strong>${totPendingComm > 0 ? `<div style="font-size:10px;color:var(--amber);font-weight:700;">(+${vnd(totPendingComm)} chờ duyệt)</div>` : ''}</div>
          <div><div class="muted" style="font-size:11px;">Phụ cấp Camp &amp; Mega</div><strong class="num" style="font-size:14px;color:var(--amber);" data-count-to="${campMega.totalAllowance}" data-format="vnd">${vnd(campMega.totalAllowance)}</strong><div style="font-size:10px;color:#92400E;font-weight:700;">${campMega.campDays} Camp · ${campMega.megaDays} Mega</div></div>
          <div><div class="muted" style="font-size:11px;">Tổng thu nhập thực nhận</div><strong class="num" style="font-size:14px;color:var(--green);" data-count-to="${totalIncome}" data-format="vnd">${vnd(totalIncome)}</strong></div>
        </div>

        <div style="font-size:12.5px;font-weight:800;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <span>Bảng kê các phiên LIVE phụ trách (${mySessions.length})</span>
          <span class="muted" style="font-size:11px;">Tự động chốt khi nhận hàng &amp; Admin duyệt</span>
        </div>

        <div style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;border:1px solid var(--line2);border-radius:12px;padding:8px;">
          ${mySessions.length ? mySessions.map(s => {
            const isManual = s.manual;
            if (s.hasShifts) {
              const myShifts = getStaffShiftsInSession(s, u.id);
              return myShifts.map(sh => {
                const isPending = !sh.isApproved;
                const punc = checkShiftPunctuality(sh.timeSlot, sh.actualStart);
                return `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 9px;border-bottom:1px dashed var(--line2);font-size:12px;">
                    <div>
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <strong class="num">${fmtDs(s.date)} · ${esc(sh.timeSlot)}</strong>
                        <span class="pill ${s.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}" style="height:19px;font-size:9.5px;">${s.channel}</span>
                        <span class="pill p-sky" style="height:19px;font-size:9.5px;">Ca riêng</span>
                        <span class="pill ${punc.pillClass} num" style="height:19px;font-size:9.5px;padding:0 6px;font-weight:700;" title="Lịch: ${punc.scheduledTime} · Vào lúc: ${punc.actualTime}">
                          <i data-ic="${punc.icon}" data-s="9"></i> ${punc.label}
                        </span>
                      </div>
                      <div class="muted" style="font-size:11px;margin-top:2px;">
                        Giờ vào live: <strong class="num" style="color:${punc.isLate ? 'var(--red)' : 'var(--green)'};">${punc.actualTime}</strong> ·
                        Doanh số ca: <strong class="num" style="color:var(--text);">${vnd(sh.shiftGmv)}</strong> · ĐS thực: <strong class="num" style="color:var(--pink2);">${vnd(sh.recGmv)}</strong>
                        ${sh.note ? ` · <em>"${esc(sh.note)}"</em>` : ''}
                      </div>
                    </div>
                    <div style="text-align:right;">
                      ${isManual
                        ? `<span class="pill p-amber" style="height:20px;font-size:10px;">Phiên KPI thủ công</span>`
                        : `<strong class="num" style="color:var(--pink2);font-size:13px;">+${vnd(sh.comm)}</strong>`}
                      <div style="margin-top:2px;">
                        ${isPending ? `<span class="pill p-amber" style="height:18px;font-size:9.5px;"><span class="dot"></span>Chờ Admin duyệt</span>` : `<span class="pill p-green" style="height:18px;font-size:9.5px;"><i data-ic="check" data-s="10"></i>Đã duyệt</span>`}
                      </div>
                    </div>
                  </div>`;
              }).join('');
            } else {
              if (s.isManualKpi) {
                const myManual = (s.manualStaff || []).filter(ms => ms.userId === u.id || ms.hostId === u.id || ms.operatorId === u.id);
                if (myManual.length > 0) {
                  return myManual.map(ms => {
                    const isApproved = (ms.status || 'APPROVED') === 'APPROVED';
                    const isHost = (ms.hostId === u.id) || (!ms.hostId && ms.userId === u.id && ms.role === 'HOST');
                    const myGmv = Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0;
                    const myBonus = isHost
                      ? Number(ms.hostBonus !== undefined ? ms.hostBonus : (ms.role === 'HOST' ? ms.bonus : Math.round(myGmv * 0.003))) || 0
                      : Number(ms.opBonus !== undefined ? ms.opBonus : (ms.role === 'OPERATOR' ? ms.bonus : Math.round(myGmv * 0.001))) || 0;
                    const partnerUser = isHost
                      ? (ms.operatorId ? userById(ms.operatorId) : null)
                      : userById(ms.hostId || (ms.role === 'HOST' ? ms.userId : null));

                    return `
                      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 9px;border-bottom:1px dashed var(--line2);font-size:12px;background:#FFF9FC;border-radius:8px;margin-bottom:3px;">
                        <div>
                          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <strong class="num">${fmtDs(s.date)} · ${s.slot}</strong>
                            <span class="pill ${s.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}" style="height:19px;font-size:9.5px;">${s.channel}</span>
                            <span class="pill p-amber" style="height:19px;font-size:9.5px;">${s.manualKpiType === 'MEGA_LIVE' ? 'Mega Live' : 'Campaign'}</span>
                            <span class="pill ${isHost ? 'p-pink' : 'p-violet'}" style="height:19px;font-size:9.5px;">${isHost ? '🎤 Host' : '🎧 Op'}</span>
                          </div>
                          <div class="muted" style="font-size:11px;margin-top:2px;">
                            Doanh số ca: <strong class="num" style="color:var(--text);">${vnd(myGmv)}</strong>
                            ${isHost ? (partnerUser ? ` · Đi cùng Op: <strong>${esc(partnerUser.name)}</strong>` : ' · <em>Tự vận hành</em>') : (partnerUser ? ` · Đi cùng Host: <strong>${esc(partnerUser.name)}</strong>` : '')}
                            ${ms.note ? ` · <em>"${esc(ms.note)}"</em>` : ''}
                          </div>
                        </div>
                        <div style="text-align:right;">
                          <strong class="num" style="color:var(--pink2);font-size:13px;">+${vnd(myBonus)}</strong>
                          <div style="margin-top:2px;">
                            ${isApproved ? `<span class="pill p-green" style="height:18px;font-size:9.5px;"><i data-ic="check" data-s="10"></i>Đã duyệt</span>` : `<span class="pill p-amber" style="height:18px;font-size:9.5px;"><i data-ic="clock" data-s="10"></i>Chờ Admin duyệt</span>`}
                          </div>
                        </div>
                      </div>`;
                  }).join('');
                }
                return `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 9px;border-bottom:1px dashed var(--line2);font-size:12px;background:#FFF9FC;border-radius:8px;margin-bottom:3px;">
                    <div>
                      <div style="display:flex;align-items:center;gap:6px;">
                        <strong class="num">${fmtDs(s.date)} · ${s.slot}</strong>
                        <span class="pill ${s.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}" style="height:19px;font-size:9.5px;">${s.channel}</span>
                        <span class="pill p-amber" style="height:19px;font-size:9.5px;">KPI thủ công</span>
                      </div>
                      <div class="muted" style="font-size:11px;margin-top:2px;">${esc(s.manualKpiNote || '')}</div>
                    </div>
                    <div style="text-align:right;">
                      <strong class="num" style="color:var(--pink2);font-size:13px;">+${vnd(s.manualKpiBonus || 0)}</strong>
                      <div style="margin-top:2px;"><span class="pill p-green" style="height:18px;font-size:9.5px;">Thưởng KPI</span></div>
                    </div>
                  </div>`;
              }
              const comm = (u.role === 'HOST' ? s.hostComm : s.opComm);
              const isPending = s.pendingRecGmv > 0;
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 9px;border-bottom:1px dashed var(--line2);font-size:12px;">
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <strong class="num">${fmtDs(s.date)} · ${s.slot}</strong>
                      <span class="pill ${s.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}" style="height:19px;font-size:9.5px;">${s.channel}</span>
                    </div>
                    <div class="muted" style="font-size:11px;margin-top:2px;">
                      GMV đã ĐS: <strong class="num" style="color:var(--text);">${vnd(s.kpiGmv)}</strong>
                      ${s.pendingRecGmv > 0 ? ` · Chờ: <span class="num" style="color:var(--amber);">${short(s.pendingRecGmv)}</span>` : ''}
                      ${s.overlap ? ` · <span class="pill p-sky" style="height:18px;font-size:9px;">Chống trùng</span>` : ''}
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <strong class="num" style="color:var(--pink2);font-size:13px;">+${vnd(comm)}</strong>
                    <div style="margin-top:2px;">
                      ${isPending ? `<span class="pill p-amber" style="height:18px;font-size:9.5px;"><span class="dot"></span>Chờ nhận</span>` : `<span class="pill p-green" style="height:18px;font-size:9.5px;"><i data-ic="check" data-s="10"></i>Đã chốt</span>`}
                    </div>
                  </div>
                </div>`;
            }
          }).join('') : '<div class="muted" style="text-align:center;padding:20px;">Nhân sự chưa được phân công phiên LIVE nào trong khoảng thời gian này.</div>'}
        </div>

        <div style="display:flex;justify-content:flex-end;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--line2);">
          <button type="button" class="btn btn-ghost sm" onclick="closeModal('mdStaffSessions')">Đóng</button>
        </div>`;

      openModal('mdStaffSessions');
    }

    function exportStaffKpiReport() {
      const staffList = state.users.filter(u => u.status === 'APPROVED' && (u.role === 'HOST' || u.role === 'OPERATOR'));
      const list = filteredMonthSessions();
      const autoList = list.filter(s => !s.manual);
      const rowsXml = staffList.map(u => {
        let sesCount = 0;
        let recGmv = 0;
        let autoComm = 0;
        let manualBonus = 0;

        list.forEach(s => {
          if (s.isManualKpi) {
            if (s.manualStaff && s.manualStaff.length > 0) {
              const contrib = getStaffManualContribution(s, u.id, true);
              if (contrib.count > 0) {
                sesCount += contrib.count;
                recGmv += contrib.gmv;
                manualBonus += contrib.bonus;
              }
            } else if ((s.manualKpiNote || '').toLowerCase().includes(u.name.toLowerCase())) {
              sesCount++;
              manualBonus += (Number(s.manualKpiBonus) || 0);
            }
          } else if (s.hasShifts) {
            const myShifts = (s.shifts || []).filter(sh => sh.userId === u.id);
            if (myShifts.length > 0) {
              sesCount++;
              myShifts.forEach(sh => {
                if (sh.isApproved) {
                  recGmv += sh.recGmv;
                  autoComm += sh.comm;
                }
              });
            }
          } else {
            const isMy = (u.role === 'HOST' && s.hostId === u.id) || (u.role === 'OPERATOR' && s.operatorId === u.id);
            if (isMy) {
              sesCount++;
              recGmv += s.kpiGmv;
              autoComm += (u.role === 'HOST' ? s.hostComm : s.opComm);
            }
          }
        });

        const campMega = computeStaffCampMega(u, list);
        const total = autoComm + campMega.totalAllowance;
        return `<Row><Cell><Data ss:Type="String">${esc(u.name)}</Data></Cell><Cell><Data ss:Type="String">${esc(u.email)}</Data></Cell><Cell><Data ss:Type="String">${u.role === 'HOST' ? 'Host (0,3%)' : 'Operator (0,1%)'}</Data></Cell><Cell><Data ss:Type="Number">${sesCount}</Data></Cell><Cell><Data ss:Type="Number">${recGmv}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(autoComm)}</Data></Cell><Cell><Data ss:Type="Number">${campMega.totalAllowance}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(total)}</Data></Cell></Row>`;
      }).join('');
      const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Bang_Luong_KPI_Nhan_Su"><Table><Row><Cell><Data ss:Type="String">Họ và tên</Data></Cell><Cell><Data ss:Type="String">Email</Data></Cell><Cell><Data ss:Type="String">Vai trò</Data></Cell><Cell><Data ss:Type="String">Số phiên LIVE</Data></Cell><Cell><Data ss:Type="String">GMV đã đối soát</Data></Cell><Cell><Data ss:Type="String">Hoa hồng tự động</Data></Cell><Cell><Data ss:Type="String">Phụ cấp Camp (100k) &amp; Mega (500k)</Data></Cell><Cell><Data ss:Type="String">Tổng thu nhập KPI</Data></Cell></Row>${rowsXml}</Table></Worksheet></Workbook>`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
      a.download = `Bang_KPI_Nhan_Su_${state.from}_${state.to}.xls`;
      a.click();
      toast('Đã xuất bảng tổng hợp KPI nhân sự');
    }

    function exportOneStaffKpi(userId) {
      const u = state.users.find(x => x.id === userId); if (!u) return;
      const list = filteredSessions();
      const rateStr = u.role === 'HOST' ? '0.3%' : '0.1%';

      const lines = [];
      lines.push('BÁO CÁO PHIẾU LƯƠNG & KPI CÁ NHÂN');
      lines.push(`Nhân sự,"${u.name} (${u.role === 'HOST' ? 'Host Livestream' : 'Trợ lý Vận hành'})"`);
      lines.push(`Khoảng thời gian,"${fmtD(state.from)} đến ${fmtD(state.to)}"`);
      lines.push(`Kênh áp dụng,"${document.getElementById('fChannel')?.value || 'Tất cả kênh'}"`);
      lines.push(`Ngày xuất file,"${new Date().toLocaleString('vi-VN')}"`);
      lines.push('');
      lines.push('MaPhien,Ngay,KhungGio,Kenh,LoaiPhien,GMVDaDoiSoat,TyLeKPI,HoaHongKPI,TrangThai,GhiChu');

      let totalGmv = 0;
      let totalComm = 0;
      let sessionCount = 0;

      list.forEach(s => {
        if (s.hasShifts && Array.isArray(s.shifts)) {
          const myShifts = getStaffShiftsInSession(s, u.id);
          myShifts.forEach(sh => {
            sessionCount++;
            const gmv = Number(sh.recGmv) || 0;
            const comm = sh.isApproved && !s.manual ? (Number(sh.comm) || 0) : 0;
            totalGmv += gmv;
            totalComm += comm;
            const st = !sh.isApproved ? 'ChoDuyetCa' : (s.pendingRecGmv > 0 ? 'ChoNhanHang' : 'DaDoiSoat');
            const note = sh.note || (s.isCampaign ? 'NgayCamp' : (s.isMegaLive ? 'MegaLive' : ''));
            lines.push(`${s.id},${s.date},"${sh.timeSlot || s.slot}",${s.channel},CaLiveChiaGio,${gmv},${rateStr},${Math.round(comm)},${st},"${note}"`);
          });
        } else {
          const isMine = (u.role === 'HOST' && s.hostId === u.id) || (u.role === 'OPERATOR' && s.operatorId === u.id);
          if (isMine) {
            sessionCount++;
            const gmv = s.manual ? 0 : (Number(s.kpiGmv) || 0);
            const comm = s.manual ? 0 : (u.role === 'HOST' ? (Number(s.hostComm) || 0) : (Number(s.opComm) || 0));
            totalGmv += gmv;
            totalComm += comm;
            const st = s.pendingRecGmv > 0 ? 'ChoNhanHang' : 'DaDoiSoat';
            const note = s.isCampaign ? 'NgayCamp' : (s.isMegaLive ? 'MegaLive' : '');
            lines.push(`${s.id},${s.date},"${s.slot}",${s.channel},PhienChuan,${gmv},${rateStr},${Math.round(comm)},${st},"${note}"`);
          }
        }

        if (s.isManualKpi && Array.isArray(s.manualStaff)) {
          const contrib = getStaffManualContribution(s, u.id, true);
          if (contrib.count > 0) {
            sessionCount += contrib.count;
            totalGmv += contrib.gmv;
            totalComm += contrib.bonus;
            lines.push(`${s.id},${s.date},"${s.slot}",${s.channel},ThuCongCampMega,${contrib.gmv},${u.role === 'HOST' ? '0.3%' : '0.1%'},${Math.round(contrib.bonus)},DaDoiSoat,"CaLiveTheoCap"`);
          }
        }
      });
      const campMega = computeStaffCampMega(u, list);
      const netTotal = totalComm + campMega.totalAllowance;

      lines.push('');
      lines.push('TONG HOP THU NHAP');
      lines.push(`Tong so ca/phien tham gia,${sessionCount}`);
      lines.push(`Tong GMV da doi soat (VND),${totalGmv}`);
      lines.push(`Tong hoa hong KPI (VND),${Math.round(totalComm)}`);
      lines.push(`Phu cap ngay Campaign (100.000d x ${campMega.campDays} ngay),${campMega.campAllowance}`);
      lines.push(`Phu cap ngay Mega Live (500.000d x ${campMega.megaDays} ngay),${campMega.megaAllowance}`);
      lines.push(`Tong phu cap Camp va Mega,${campMega.totalAllowance}`);
      lines.push(`TONG THUC NHAN UOC TINH (VND),${Math.round(netTotal)}`);

      const csvContent = lines.join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' }));
      a.download = `Phieu_KPI_${u.name.replace(/\s+/g, '_')}_${state.from}_${state.to}.csv`;
      a.click();
      toast(`Đã xuất phiếu KPI cá nhân cho ${u.name}`);
    }

    /* ---------- 13. Render Tab 4 (Công cụ): KPI thủ công (Hỗ trợ nhiều nhân sự Live cùng nhau & Doanh số cá nhân) ---------- */
    function renderManualKpi() {
      const admin = isAdmin();
      const myId = me()?.id;
      const allManual = computeAll().filter(s => s.isManualKpi);
      const list = admin ? allManual : allManual.filter(s =>
        s.manualStaff && s.manualStaff.some(ms => ms.userId === myId || ms.hostId === myId || ms.operatorId === myId)
      );
      document.getElementById('nbManual').textContent = list.length;

      document.getElementById('manBody').innerHTML = list.map(s => {
        const isReconciled = isSessionReconciled(s);
        const staffCount = (s.manualStaff || []).length;
        const staffBadges = renderManualStaffBadges(s);

        return `
          <tr class="${isReconciled ? 'row-reconciled' : 'row-pending'}">
            <td>
              <div style="font-weight:800;display:flex;align-items:center;gap:6px;" class="num">
                <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${isReconciled ? '#10B981' : '#F59E0B'};" title="${isReconciled ? 'Đã đối soát' : 'Chờ đối soát'}"></span>
                <span>${fmtD(s.date)} · ${s.slot}</span>
              </div>
              <div style="margin-top:3px;"><span class="pill p-pink">${s.channel}</span></div>
            </td>
            <td>
              <select class="sel sm" style="font-weight:700;border-color:var(--pink);" ${admin ? '' : 'disabled'} onchange="setManualType('${s.id}', this.value)">
                <option value="CAMPAIGN" ${s.manualKpiType === 'CAMPAIGN' ? 'selected' : ''}>Ngày Campaign</option>
                <option value="MEGA_LIVE" ${s.manualKpiType === 'MEGA_LIVE' ? 'selected' : ''}>Mega Live</option>
              </select>
            </td>
            <td class="r num">${vnd(s.grossLiveGmv + s.affiliateGmv)}</td>
            <td class="r num">
              ${isReconciled
                ? `<span class="badge-reconciled-val" title="Đã đối soát xong 100%"><i data-ic="check-circle" data-s="11"></i>${vnd(s.kpiGmv)}</span>`
                : `<span style="font-weight:700;">${vnd(s.kpiGmv)}</span>`}
            </td>
            <td style="max-width:320px;">
              ${staffBadges}
              <div style="margin-top:6px;">
                <button type="button" class="btn btn-ghost sm" style="height:26px;padding:0 8px;font-size:11px;font-weight:700;" onclick="openManualStaffModal('${s.id}')">
                  <i data-ic="users" data-s="12"></i><span>Phân bổ nhân sự (${staffCount})</span>
                </button>
              </div>
            </td>
            <td class="r">
              <div class="num" style="font-size:13px;font-weight:800;color:var(--pink2);">${admin ? vnd(s.manualKpiBonus || 0) : vnd(getStaffManualContribution(s, myId, true).bonus)}</div>
              <div class="muted" style="font-size:10px;">${admin ? `${(s.manualStaff || []).filter(ms => (ms.status || 'APPROVED') === 'APPROVED').length} ca đã duyệt` : 'Thưởng cá nhân của bạn'}</div>
              ${isReconciled ? `<div style="font-size:9.5px;color:#059669;font-weight:800;margin-top:2px;">✓ Đã chốt số thực</div>` : ''}
            </td>
            <td class="r">
              <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                <button type="button" class="btn btn-grad sm" style="height:26px;padding:0 9px;font-size:11px;font-weight:700;" onclick="openManualStaffModal('${s.id}')">
                  <i data-ic="edit" data-s="11"></i><span>Sửa DS</span>
                </button>
                ${admin ? `<button type="button" class="btn btn-ghost sm" style="height:24px;padding:0 7px;font-size:10.5px;" onclick="toggleManualKpi('${s.id}', false)">Về tự động</button>` : '<span class="muted" style="font-size:11px;">Chỉ xem</span>'}
              </div>
            </td>
          </tr>`;
      }).join('');

      document.getElementById('manMobile').innerHTML = list.map(s => {
        const isReconciled = isSessionReconciled(s);
        const staffCount = (s.manualStaff || []).length;
        const staffBadges = renderManualStaffBadges(s);

        return `
          <div class="m-card ${isReconciled ? 'card-reconciled' : 'card-pending'}">
            <div class="m-row">
              <div style="min-width:0;flex:1 1 auto;">
                <span class="pill p-pink">${s.channel}</span>
                <strong class="num" style="font-size:12.5px;margin-left:4px;">${fmtD(s.date)} (${s.slot})</strong>
                ${isReconciled ? `<span class="pill p-green" style="font-size:10px;height:20px;font-weight:800;margin-left:4px;"><i data-ic="check-circle" data-s="10"></i>Đã ĐS 100%</span>` : `<span class="pill p-amber" style="font-size:10px;height:20px;margin-left:4px;">Chờ ĐS</span>`}
              </div>
              ${admin ? `<button type="button" class="btn btn-ghost sm" style="height:28px;padding:0 9px;font-size:11px;flex-shrink:0;" onclick="toggleManualKpi('${s.id}', false)">Về tự động</button>` : '<span class="muted" style="font-size:11px;flex-shrink:0;">Chỉ xem</span>'}
            </div>
            <div class="m-row num" style="font-size:11.5px;gap:6px;">
              <span class="muted" style="min-width:0;flex:1 1 auto;">LIVE+Aff: <strong>${short(s.grossLiveGmv + s.affiliateGmv)}</strong></span>
              <span style="flex-shrink:0;">GMV đã ĐS: <strong style="color:${isReconciled ? '#047857' : 'var(--pink2)'};">${isReconciled ? '✓ ' : ''}${short(s.kpiGmv)}</strong></span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding-top:4px;border-top:1px dashed var(--line2);">
              <div>
                <div class="muted" style="font-size:10px;font-weight:700;margin-bottom:2px;">Loại (bắt buộc)</div>
                <select class="sel sm" style="width:100%;height:32px;font-size:11.5px;font-weight:700;border-color:var(--pink);" ${admin ? '' : 'disabled'} onchange="setManualType('${s.id}', this.value)">
                  <option value="CAMPAIGN" ${s.manualKpiType === 'CAMPAIGN' ? 'selected' : ''}>Ngày Campaign</option>
                  <option value="MEGA_LIVE" ${s.manualKpiType === 'MEGA_LIVE' ? 'selected' : ''}>Mega Live</option>
                </select>
              </div>
              <div>
                <div class="muted" style="font-size:10px;font-weight:700;margin-bottom:2px;">${admin ? 'Tổng quỹ thưởng (VNĐ)' : 'Thưởng của bạn (VNĐ)'}</div>
                <div class="num" style="height:32px;display:flex;align-items:center;justify-content:flex-end;padding:0 8px;font-weight:800;font-size:13px;color:var(--pink2);background:var(--soft2);border:1px solid var(--line2);border-radius:9px;">
                  ${admin ? vnd(s.manualKpiBonus || 0) : vnd(getStaffManualContribution(s, myId, true).bonus)}
                </div>
              </div>
            </div>
            <div style="padding-top:6px;border-top:1px dashed var(--line2);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:11px;font-weight:700;color:var(--text);">Nhân sự live &amp; Doanh số cá nhân:</span>
                <button type="button" class="btn btn-soft sm" style="height:26px;padding:0 8px;font-size:11px;" onclick="openManualStaffModal('${s.id}')">
                  <i data-ic="users" data-s="12"></i><span>Phân bổ (${staffCount})</span>
                </button>
              </div>
              ${staffBadges}
            </div>
            <div style="margin-top:6px;">
              <input class="inp sm" style="width:100%;height:32px;font-size:11.5px;" value="${esc(s.manualKpiNote || '')}" ${admin ? '' : 'disabled'} placeholder="Ghi chú phiên live…" onchange="saveManualNote('${s.id}', this.value)" />
            </div>
          </div>`;
      }).join('');
      hydrateIcons(document.getElementById('manBody'));
      hydrateIcons(document.getElementById('manMobile'));
    }
    function saveManualNote(id, v) {
      if (!isAdmin()) { toast('Chỉ Admin mới có quyền sửa ghi chú tổng!'); return; }
      const s = state.sessions.find(x => x.id === id); if (s) { s.manualKpiNote = v; saveState(); toast('Đã lưu ghi chú KPI thủ công'); }
    }
    function saveManualBonus(id, v) {
      if (!isAdmin()) { toast('Chỉ Admin mới có quyền sửa quỹ thưởng tổng!'); return; }
      const s = state.sessions.find(x => x.id === id); if (s) { s.manualKpiBonus = Math.max(0, Number(v) || 0); saveState(); renderManualKpi(); toast('Đã lưu quỹ thưởng KPI thủ công'); }
    }

    /* ---------- Quản lý nhân sự & doanh số cá nhân phiên KPI thủ công ---------- */
    function openManualStaffModal(sessionId) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s) return;
      if (!Array.isArray(s.manualStaff)) s.manualStaff = [];
      state._currentManualSessionId = sessionId;

      const admin = isAdmin();
      const currentActor = me();
      const myId = currentActor?.id;
      const isHost = currentActor && currentActor.role === 'HOST';

      if (!admin) {
        const isMySession = s.manualStaff.some(ms => ms.submittedBy === myId || ms.hostId === myId || ms.userId === myId || ms.operatorId === myId);
        if (!isMySession && !isHost) {
          toast('🔒 Quyền riêng tư: Bạn chỉ có thể xem số liệu ca của chính mình!');
          return;
        }
      }

      const maxCap = getSessionMaxGmvCap(s);
      const sessionGross = (s.grossLiveGmv || 0) + (s.affiliateGmv || 0);

      const allApprovedList = s.manualStaff.filter(ms => (ms.status || 'APPROVED') === 'APPROVED');
      const allPendingList = s.manualStaff.filter(ms => ms.status === 'PENDING');

      const approvedList = admin ? allApprovedList : allApprovedList.filter(ms => ms.submittedBy === myId || ms.hostId === myId || ms.userId === myId || ms.operatorId === myId);
      const pendingList = admin ? allPendingList : allPendingList.filter(ms => ms.submittedBy === myId || ms.hostId === myId || ms.userId === myId || ms.operatorId === myId);

      const totalApprovedGmv = approvedList.reduce((acc, ms) => acc + Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv || 0), 0);
      const totalPendingGmv = pendingList.reduce((acc, ms) => acc + Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv || 0), 0);

      const totalApprovedBonus = approvedList.reduce((acc, ms) => {
        if (!admin) {
          return acc + (isHost ? (Number(ms.hostBonus) || Math.round((Number(ms.shiftGmv || ms.personalGmv) || 0) * 0.003)) : (Number(ms.opBonus) || Math.round((Number(ms.shiftGmv || ms.personalGmv) || 0) * 0.001)));
        }
        if (ms.hostBonus !== undefined || ms.opBonus !== undefined) {
          return acc + (Number(ms.hostBonus) || 0) + (Number(ms.opBonus) || 0);
        }
        return acc + (Number(ms.bonus) || 0);
      }, 0);
      const totalPendingBonus = pendingList.reduce((acc, ms) => {
        if (!admin) {
          return acc + (isHost ? (Number(ms.hostBonus) || Math.round((Number(ms.shiftGmv || ms.personalGmv) || 0) * 0.003)) : (Number(ms.opBonus) || Math.round((Number(ms.shiftGmv || ms.personalGmv) || 0) * 0.001)));
        }
        if (ms.hostBonus !== undefined || ms.opBonus !== undefined) {
          return acc + (Number(ms.hostBonus) || 0) + (Number(ms.opBonus) || 0);
        }
        return acc + (Number(ms.bonus) || 0);
      }, 0);

      const hosts = state.users.filter(u => u.status === 'APPROVED' && u.role === 'HOST');
      const operators = state.users.filter(u => u.status === 'APPROVED' && u.role === 'OPERATOR');
      const canAddShift = admin || isHost;
      const myPendingShifts = pendingList.filter(ms => ms.submittedBy === currentActor?.id || ms.hostId === currentActor?.id || ms.userId === currentActor?.id);

      document.getElementById('manualStaffCard').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line2);margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="card-ic" style="background:var(--pink-soft);color:var(--pink2);"><i data-ic="users" data-s="22"></i></div>
            <div>
              <div style="font-size:16px;font-weight:800;">Phân bổ nhân sự &amp; Doanh số phiên thủ công (Theo cặp)</div>
              <div class="muted" style="font-size:11.5px;"><span class="pill ${s.channel === 'shopkhangbaby' ? 'p-pink' : 'p-violet'}">${s.channel}</span> · ${fmtD(s.date)} (${s.slot}) · ${formatLiveMinutes(sessionDurationMinutes(s))} · <span class="pill p-amber">${s.manualKpiType === 'MEGA_LIVE' ? 'Mega Live' : 'Ngày Campaign'}</span></div>
            </div>
          </div>
          <button type="button" class="icon-btn" onclick="closeModal('mdManualStaff')" aria-label="Đóng"><i data-ic="x" data-s="16"></i></button>
        </div>

        <!-- 4-Stat Bento -->
        <div class="m-grid4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#FCF8FA;border:1px solid var(--line2);border-radius:14px;padding:12px;margin-bottom:14px;">
          <div>
            <div class="muted" style="font-size:11px;">GMV phiên LIVE tổng</div>
            <strong class="num" style="font-size:13.5px;color:var(--text);">${vnd(sessionGross)}</strong>
          </div>
          <div>
            <div class="muted" style="font-size:11px;">Doanh số đã duyệt</div>
            <strong class="num" style="font-size:13.5px;color:var(--violet-ink);">${vnd(totalApprovedGmv)}</strong>
            ${totalPendingGmv > 0 ? `<div style="font-size:10px;color:var(--amber);font-weight:700;">+ ${short(totalPendingGmv)} chờ duyệt</div>` : ''}
          </div>
          <div>
            <div class="muted" style="font-size:11px;">Quỹ thưởng KPI đã duyệt</div>
            <strong class="num" style="font-size:13.5px;color:var(--pink2);">${vnd(totalApprovedBonus)}</strong>
            ${totalPendingBonus > 0 ? `<div style="font-size:10px;color:var(--amber);font-weight:700;">+ ${short(totalPendingBonus)} chờ duyệt</div>` : ''}
          </div>
          <div>
            <div class="muted" style="font-size:11px;">Ca live trong phiên</div>
            <strong class="num" style="font-size:13.5px;color:var(--green);">${approvedList.length} ca đã duyệt</strong>
            ${pendingList.length > 0 ? `<div style="font-size:10px;color:#D97706;font-weight:700;">${pendingList.length} ca chờ Admin duyệt</div>` : ''}
          </div>
        </div>

        <!-- Banner thông báo phê duyệt -->
        ${admin && pendingList.length > 0 ? `
          <div style="background:#FFFBEB;border:1.5px solid #FCD34D;border-radius:12px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="color:#D97706;font-size:18px;"><i data-ic="clock" data-s="18"></i></div>
              <div style="font-size:12px;color:#92400E;">
                <strong>Cần phê duyệt:</strong> Có <strong style="color:#B45309;">${pendingList.length} ca live</strong> do Host gửi đang chờ Admin phê duyệt. Số tiền chỉ được tính vào KPI &amp; Target sau khi bạn duyệt!
              </div>
            </div>
            <button type="button" class="btn sm" style="background:linear-gradient(135deg,#059669,#10B981);color:#FFF;border:none;font-weight:800;height:30px;padding:0 12px;border-radius:8px;box-shadow:0 2px 6px rgba(16,185,129,0.3);" onclick="approveAllManualStaff('${s.id}')">
              <i data-ic="check-circle" data-s="14"></i><span>⚡ Phê duyệt tất cả (${pendingList.length} ca)</span>
            </button>
          </div>` : ''}

        ${!admin && isHost && myPendingShifts.length > 0 ? `
          <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:12px;padding:9px 12px;margin-bottom:12px;display:flex;align-items:center;gap:8px;font-size:11.5px;color:#92400E;">
            <i data-ic="clock" data-s="15"></i>
            <span>Bạn có <strong>${myPendingShifts.length} ca live</strong> đang ở trạng thái <strong>Chờ Admin duyệt</strong>. Sau khi Admin duyệt, doanh số và KPI (0,3% Host &amp; 0,1% Op) sẽ chính thức được tính vào bảng lương và Target!</span>
          </div>` : ''}

        <div style="font-size:12.5px;font-weight:800;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <span>Danh sách ca live theo cặp trong phiên (${s.manualStaff.length} ca)</span>
          <span class="muted" style="font-size:11px;">${admin ? 'Admin có toàn quyền duyệt, sửa doanh số hoặc xóa ca' : (isHost ? 'Host điền doanh số ca live, Admin duyệt mới chấp nhận' : 'Tự động tính lương & KPI sau khi Admin duyệt')}</span>
        </div>

        <div style="border:1px solid var(--line2);border-radius:12px;overflow:hidden;margin-bottom:16px;">
          ${s.manualStaff.length === 0 ? `
            <div style="padding:24px;text-align:center;color:var(--muted);font-size:12.5px;">
              Phiên này chưa có ca live nào. ${canAddShift ? 'Hãy điền doanh số ca live của Host ở form bên dưới.' : 'Chưa có dữ liệu ca live.'}
            </div>` : `
            <div class="tbl-wrap" style="max-height:280px;overflow-y:auto;">
              <table class="pt" style="margin:0;">
                <thead>
                  <tr>
                    <th>Cặp nhân sự (Host &amp; Op)</th>
                    <th class="r">Doanh số ca live (VNĐ)</th>
                    <th class="r">Thưởng KPI (Host &amp; Op)</th>
                    <th style="text-align:center;">Trạng thái</th>
                    <th>Ghi chú ca live</th>
                    <th class="r" style="width:85px;">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${(admin ? s.manualStaff : s.manualStaff.filter(ms => ms.submittedBy === myId || ms.hostId === myId || ms.userId === myId || ms.operatorId === myId)).map((ms, idx) => {
                    const hostUser = userById(ms.hostId || (ms.role === 'HOST' ? ms.userId : null));
                    const opUser = ms.operatorId ? userById(ms.operatorId) : (ms.role === 'OPERATOR' ? userById(ms.userId) : null);
                    const isSelfOp = !ms.operatorId && ms.role !== 'OPERATOR' && ms.hostId;

                    const shiftGmv = Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0;
                    const hostBonus = Number(ms.hostBonus !== undefined ? ms.hostBonus : (ms.role === 'HOST' ? ms.bonus : Math.round(shiftGmv * 0.003))) || 0;
                    const opBonus = Number(ms.opBonus !== undefined ? ms.opBonus : (ms.role === 'OPERATOR' ? ms.bonus : 0)) || 0;
                    const totalCaBonus = hostBonus + opBonus;

                    const isApproved = (ms.status || 'APPROVED') === 'APPROVED';
                    const isMyRow = currentActor && (ms.submittedBy === currentActor.id || ms.hostId === currentActor.id || ms.userId === currentActor.id || ms.operatorId === currentActor.id);
                    const canEditGmv = admin || (!isApproved && isHost && isMyRow);

                    return `<tr>
                      <td>
                        <div style="display:flex;flex-direction:column;gap:5px;">
                          <!-- Host -->
                          <div style="display:flex;align-items:center;gap:6px;">
                            ${hostUser ? avatarHtml(hostUser, 22) : '<div class="ava" style="width:22px;height:22px;font-size:10px;">H</div>'}
                            <div>
                              <span style="font-weight:800;font-size:12px;color:var(--pink-ink);">🎙️ ${hostUser ? esc(hostUser.name) : 'Chưa chọn Host'}</span>
                              <span class="pill p-pink" style="font-size:9px;height:16px;padding:0 4px;font-weight:800;">0,3%</span>
                            </div>
                          </div>
                          <!-- Operator -->
                          <div style="display:flex;align-items:center;gap:6px;">
                            ${opUser ? avatarHtml(opUser, 22) : '<div class="ava" style="width:22px;height:22px;font-size:10px;background:#EDE9FE;color:#6D28D9;">Op</div>'}
                            <div>
                              ${opUser ? `
                                <span style="font-weight:700;font-size:11.5px;color:var(--violet-ink);">🎧 ${esc(opUser.name)}</span>
                                <span class="pill p-violet" style="font-size:9px;height:16px;padding:0 4px;font-weight:800;">0,1%</span>
                              ` : `
                                <span class="pill p-gray" style="font-size:9.5px;height:17px;padding:0 5px;">🎧 Host tự vận hành (0đ Op)</span>
                              `}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="r num">
                        ${canEditGmv ? `
                          <div style="display:inline-flex;align-items:center;gap:4px;justify-content:flex-end;">
                            <input type="text" inputmode="text" class="inp sm num"
                              id="inpStaffGmv_${s.id}_${idx}"
                              style="width:130px;height:28px;text-align:right;font-weight:800;font-size:12px;border:1.5px solid var(--pink);border-radius:8px;padding:0 6px;color:var(--pink2);"
                              value="${shiftGmv.toLocaleString('vi-VN')}\u00A0₫"
                              onfocus="handleVndFocusEvent(this)"
                              oninput="handleVndInputEvent(this)"
                              onblur="handleVndBlurEvent(this); updateManualStaffGmv('${s.id}', ${idx}, this.value)"
                              onkeydown="if(event.key==='Enter'){this.blur();}"
                              title="Bấm để sửa doanh số ca live (Enter hoặc bấm ra ngoài để lưu)"
                            />
                          </div>` : `<span style="font-weight:800;color:var(--text);font-size:12.5px;">${vnd(shiftGmv)}</span>`}
                      </td>
                      <td class="r num">
                        ${admin ? `
                          <div style="font-weight:800;color:var(--pink2);font-size:12px;">
                            🎙️ ${vnd(hostBonus)}
                          </div>
                          <div style="font-weight:700;color:${opBonus > 0 ? 'var(--violet-ink)' : 'var(--muted)'};font-size:11px;">
                            🎧 ${opBonus > 0 ? vnd(opBonus) : '0\u00A0₫'}
                          </div>
                          <div style="font-size:9.5px;color:var(--muted);border-top:1px dashed var(--line2);margin-top:2px;padding-top:2px;">
                            Tổng: <strong>${vnd(totalCaBonus)}</strong>
                          </div>
                        ` : (isHost ? `
                          <div style="font-weight:800;color:var(--pink2);font-size:12.5px;">
                            🎙️ ${vnd(hostBonus)}
                          </div>
                          <div class="muted" style="font-size:10px;">Thưởng Host (0,3%)</div>
                        ` : `
                          <div style="font-weight:800;color:var(--violet-ink);font-size:12.5px;">
                            🎧 ${vnd(opBonus)}
                          </div>
                          <div class="muted" style="font-size:10px;">Thưởng Op (0,1%)</div>
                        `)}
                      </td>
                      <td style="text-align:center;">
                        ${isApproved ? `
                          <span class="pill p-green" style="font-weight:800;font-size:10px;height:22px;padding:0 7px;">
                            <i data-ic="check" data-s="11"></i> Đã duyệt
                          </span>` : `
                          <span class="pill p-amber" style="font-weight:800;font-size:10px;height:22px;padding:0 7px;animation:pulse 2s infinite;">
                            <i data-ic="clock" data-s="11"></i> Chờ Admin duyệt
                          </span>`}
                      </td>
                      <td style="font-size:11px;color:var(--text);">
                        ${(admin || (!isApproved && isHost && isMyRow)) ? `
                          <input type="text" class="inp sm" style="width:100%;height:26px;font-size:10.5px;"
                            value="${esc(ms.note || '')}"
                            placeholder="Ghi chú ca live…"
                            onchange="updateManualStaffNote('${s.id}', ${idx}, this.value)"
                          />` : esc(ms.note || '—')}
                      </td>
                      <td class="r">
                        <div style="display:inline-flex;align-items:center;gap:4px;justify-content:flex-end;">
                          ${admin && !isApproved ? `
                            <button type="button" class="btn sm" style="background:#10B981;color:#FFF;height:26px;padding:0 8px;font-size:10.5px;font-weight:800;border:none;border-radius:6px;" onclick="approveManualStaff('${s.id}', ${idx})" title="Phê duyệt ca live này">
                              <i data-ic="check" data-s="12"></i><span>Duyệt</span>
                            </button>` : ''}
                          ${admin ? `
                            <button type="button" class="btn btn-ghost sm" style="height:26px;padding:0 6px;color:var(--red);border-color:#FEE2E2;" onclick="removeManualStaff('${s.id}', ${idx})" title="Xóa ca live (Chỉ Admin)">
                              <i data-ic="trash" data-s="12"></i>
                            </button>` : (!isApproved && isHost && isMyRow ? `
                            <button type="button" class="btn btn-ghost sm" style="height:26px;padding:0 7px;color:var(--red);border-color:#FEE2E2;font-size:10.5px;" onclick="removeManualStaff('${s.id}', ${idx})" title="Hủy ca live đang chờ duyệt">
                              <i data-ic="x" data-s="12"></i><span>Hủy</span>
                            </button>` : '<span class="muted" style="font-size:11px;">🔒</span>')}
                        </div>
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>`}
        </div>

        <!-- Form Thêm ca live theo cặp (Host điền số, hệ thống tự ra KPI cả 2, Admin duyệt mới chấp nhận) -->
        ${canAddShift ? `
          <div style="background:#FFF9FC;border:1.5px solid #FDE2EE;border-radius:14px;padding:14px;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <strong style="font-size:13px;color:var(--pink-ink);">
                + Thêm ca live theo cặp (KPI thủ công: Host &amp; Vận hành)
              </strong>
              <span class="muted" style="font-size:11px;">
                ${admin ? 'Admin thêm &amp; phê duyệt ngay' : 'Phần thêm ca áp dụng cho KPI thủ công · Host gửi ca live · Admin duyệt'}
              </span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
              <div>
                <label class="muted" style="font-size:11px;font-weight:700;display:block;margin-bottom:4px;">
                  🎙️ Host phụ trách ca (0,3% hoa hồng) *
                </label>
                <select class="sel sm" id="msHostSelect" style="width:100%;height:36px;font-weight:700;" onchange="previewManualPairKpi()">
                  ${hosts.map(u => `
                    <option value="${u.id}" ${(isHost && u.id === currentActor?.id) ? 'selected' : ''}>
                      🎤 ${esc(u.name)} (${esc(u.email || u.id)})
                    </option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="muted" style="font-size:11px;font-weight:700;display:block;margin-bottom:4px;">
                  ⚙️ Vận hành ca live (0,1% hoa hồng)
                </label>
                <select class="sel sm" id="msOpSelect" style="width:100%;height:36px;font-weight:700;" onchange="previewManualPairKpi()">
                  <option value="">-- Để trống: Host tự vận hành (0đ Op) --</option>
                  ${operators.map(u => `
                    <option value="${u.id}">🎧 ${esc(u.name)} (Vận hành · 0,1%)</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div style="margin-bottom:10px;">
              <label class="muted" style="font-size:11px;font-weight:700;display:block;margin-bottom:4px;">
                💰 Doanh số ca live của Host (VNĐ) * <span class="muted" style="font-weight:normal;">(Khống chế tối đa: <strong class="num" style="color:var(--pink-ink);">${vnd(maxCap.cap)}</strong> · ${maxCap.desc})</span>
              </label>
              <input class="inp sm num" id="msShiftGmv" type="text" inputmode="text"
                placeholder="VD: ${short(maxCap.cap)} hoặc ${(maxCap.cap).toLocaleString('vi-VN')}\u00A0₫"
                style="width:100%;height:38px;font-weight:800;font-size:14px;color:var(--pink2);border:1.5px solid var(--pink);border-radius:10px;"
                oninput="handleVndInputEvent(this); previewManualPairKpi('${s.id}')"
                onblur="handleVndBlurEvent(this); previewManualPairKpi('${s.id}')"
                onfocus="handleVndFocusEvent(this)"
              />
            </div>

            <!-- Dynamic Live Preview Box -->
            <div id="msPairPreviewCard" style="background:#FFF5F9;border:1px dashed #FBCFE8;border-radius:12px;padding:10px 12px;margin-bottom:10px;">
              <div style="font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:6px;">
                <i data-ic="info" data-s="14"></i>
                <span>Điền số doanh số ca live của Host để hệ thống tự động tính thưởng KPI cho cả cặp (Host 0,3% &amp; Op 0,1%)</span>
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;">
              <button type="button" class="btn btn-grad" onclick="addManualStaff('${s.id}')">
                <i data-ic="${admin ? 'check-circle' : 'send'}" data-s="14"></i>
                <span>${admin ? 'Lưu &amp; Phê duyệt ca live' : 'Gửi doanh số ca live (Chờ Admin duyệt)'}</span>
              </button>
            </div>
          </div>` : `
          <div style="background:#F8FAFC;border:1px solid var(--line2);border-radius:12px;padding:12px;margin-bottom:14px;color:var(--muted);font-size:12px;text-align:center;">
            🔒 Chế độ xem: Ca live do Host điền và Admin phê duyệt. Bạn sẽ được nhận 0,1% KPI khi được phân bổ đi ca cùng Host.
          </div>`}

        <div style="display:flex;justify-content:flex-end;padding-top:8px;">
          <button type="button" class="btn btn-ghost" onclick="closeModal('mdManualStaff')">Đóng</button>
        </div>
      `;
      hydrateIcons(document.getElementById('manualStaffCard'));
      openModal('mdManualStaff');
    }

    function previewManualPairKpi(sessionId) {
      const hostId = document.getElementById('msHostSelect')?.value;
      const opId = document.getElementById('msOpSelect')?.value;
      const gmv = parseVndInput(document.getElementById('msShiftGmv')?.value) || 0;

      const hostUser = userById(hostId);
      const opUser = opId ? userById(opId) : null;

      const hostBonus = Math.round(gmv * 0.003);
      const opBonus = opId ? Math.round(gmv * 0.001) : 0;
      const totalBonus = hostBonus + opBonus;

      const previewEl = document.getElementById('msPairPreviewCard');
      if (!previewEl) return;

      const sid = sessionId || state._currentManualSessionId;
      const s = state.sessions.find(x => x.id === sid);
      const maxCap = s ? getSessionMaxGmvCap(s) : null;
      const isExceeded = !isAdmin() && maxCap && gmv > maxCap.cap;

      if (gmv <= 0) {
        previewEl.innerHTML = `
          <div style="font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:6px;">
            <i data-ic="info" data-s="14"></i>
            <span>Điền số doanh số ca live của Host để hệ thống tự động tính thưởng KPI cho cả cặp (Host 0,3% &amp; Op 0,1%)</span>
          </div>`;
        hydrateIcons(previewEl);
        return;
      }

      previewEl.innerHTML = `
        ${isExceeded ? `
          <div style="background:#FFF1F2;border:1.5px solid #FECDD3;border-radius:8px;padding:7px 10px;margin-bottom:8px;color:#9F1239;font-weight:700;font-size:11.5px;">
            ⚠️ Cảnh báo: Doanh số nhập (${vnd(gmv)}) vượt quá ${maxCap.desc}! Hệ thống sẽ từ chối lưu ca này.
          </div>
        ` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px dashed #FBCFE8;padding-bottom:8px;margin-bottom:8px;">
          <div style="font-size:12px;font-weight:800;color:var(--pink-ink);">
            ⚡ Tự động tính KPI cả cặp từ Doanh số ca live: <span class="num font-bold" style="color:var(--text);font-size:13px;">${vnd(gmv)}</span>
          </div>
          <div style="font-size:11.5px;font-weight:800;color:var(--pink2);">
            Tổng thưởng KPI ca: <span class="num">${vnd(totalBonus)}</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:#FFF;border:1px solid #FBCFE8;border-radius:10px;padding:8px 10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:11.5px;font-weight:800;color:var(--pink-ink);">🎙️ Host: ${hostUser ? esc(hostUser.name) : 'Chưa chọn'}</span>
              <span class="pill p-pink" style="font-size:9.5px;height:18px;padding:0 5px;font-weight:800;">Chuẩn 0,3%</span>
            </div>
            <div style="font-size:14px;font-weight:800;color:var(--pink2);" class="num">${vnd(hostBonus)}</div>
            <div class="muted" style="font-size:10px;margin-top:2px;">= ${vnd(gmv)} × 0,3%</div>
          </div>
          <div style="background:#FFF;border:1px solid ${opId ? '#DDD6FE' : '#E2E8F0'};border-radius:10px;padding:8px 10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:11.5px;font-weight:800;color:${opId ? 'var(--violet-ink)' : 'var(--muted)'};">
                ${opId ? `🎧 Vận hành: ${opUser ? esc(opUser.name) : 'NV'}` : '🎧 Host tự vận hành'}
              </span>
              <span class="pill ${opId ? 'p-violet' : 'p-gray'}" style="font-size:9.5px;height:18px;padding:0 5px;font-weight:800;">
                ${opId ? 'Chuẩn 0,1%' : '0đ Op'}
              </span>
            </div>
            <div style="font-size:14px;font-weight:800;color:${opId ? 'var(--violet-ink)' : 'var(--muted)'};" class="num">${vnd(opBonus)}</div>
            <div class="muted" style="font-size:10px;margin-top:2px;">${opId ? `= ${vnd(gmv)} × 0,1%` : 'Host tự vận hành ca, không trích thưởng Op'}</div>
          </div>
        </div>
      `;
      hydrateIcons(previewEl);
    }

    function addManualStaff(sessionId) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s) return;
      if (!Array.isArray(s.manualStaff)) s.manualStaff = [];

      const admin = isAdmin();
      const currentActor = me();
      const isHost = currentActor && currentActor.role === 'HOST';
      if (!admin && !isHost) {
        toast('Chỉ Admin và Host mới có quyền gửi / thêm ca live thủ công!');
        return;
      }

      const hostId = document.getElementById('msHostSelect')?.value || (isHost ? currentActor?.id : '');
      const operatorId = document.getElementById('msOpSelect')?.value || '';
      const gmv = parseVndInput(document.getElementById('msShiftGmv')?.value) || 0;
      const note = '';

      if (!hostId) {
        toast('Vui lòng chọn Host phụ trách ca!');
        return;
      }
      if (gmv <= 0) {
        toast('Vui lòng nhập doanh số ca live lớn hơn 0đ!');
        return;
      }

      const maxCap = getSessionMaxGmvCap(s);
      if (!admin && gmv > maxCap.cap) {
        toast(`⚠️ Không hợp lệ: Doanh số ca live (${vnd(gmv)}) không được vượt quá ${maxCap.desc}!`);
        return;
      }

      const hostUser = userById(hostId);
      const opUser = operatorId ? userById(operatorId) : null;

      const hostBonus = Math.round(gmv * 0.003); // 0.3%
      const opBonus = operatorId ? Math.round(gmv * 0.001) : 0; // 0.1% hoặc 0 nếu tự vận hành
      const totalShiftBonus = hostBonus + opBonus;

      const status = admin ? 'APPROVED' : 'PENDING';

      const newEntry = {
        id: 'MS-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000),
        hostId: hostId,
        operatorId: operatorId,
        shiftGmv: gmv,
        hostBonus: hostBonus,
        opBonus: opBonus,
        bonus: totalShiftBonus,
        status: status,
        submittedBy: currentActor?.id || '',
        submittedAt: new Date().toISOString(),
        approvedBy: admin ? (currentActor?.id || 'U-ADMIN') : null,
        approvedAt: admin ? new Date().toISOString() : null,
        note: note,
        // Tương thích ngược
        userId: hostId,
        role: 'HOST',
        personalGmv: gmv
      };

      s.manualStaff.push(newEntry);
      recalculateSessionManualBonus(s);

      saveState();
      renderAll();
      openManualStaffModal(sessionId);

      if (admin) {
        toast(`✅ Đã lưu & phê duyệt ca live cho cặp Host ${hostUser?.name || 'Host'} + ${opUser ? opUser.name : 'Tự vận hành'} (${vnd(gmv)})`);
      } else {
        toast(`⏳ Ca live (${vnd(gmv)}) đã được gửi thành công! Đang chờ Admin phê duyệt.`);
      }
    }

    function approveManualStaff(sessionId, index) {
      if (!isAdmin()) {
        toast('Chỉ Admin mới có quyền phê duyệt ca live!');
        return;
      }
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s || !Array.isArray(s.manualStaff) || !s.manualStaff[index]) return;

      const ms = s.manualStaff[index];
      ms.status = 'APPROVED';
      ms.approvedBy = me()?.id || 'U-ADMIN';
      ms.approvedAt = new Date().toISOString();

      recalculateSessionManualBonus(s);
      playAutoApproveChime();

      saveState();
      renderAll();
      openManualStaffModal(sessionId);

      const hostUser = userById(ms.hostId || ms.userId);
      toast(`🎉 Đã duyệt ca live của Host ${hostUser?.name || 'Host'}! Doanh số ${vnd(ms.shiftGmv || ms.personalGmv)} và KPI đã được ghi nhận.`);
    }

    function approveAllManualStaff(sessionId) {
      if (!isAdmin()) {
        toast('Chỉ Admin mới có quyền phê duyệt ca live!');
        return;
      }
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s || !Array.isArray(s.manualStaff)) return;

      let approvedCount = 0;
      s.manualStaff.forEach(ms => {
        if (ms.status === 'PENDING') {
          ms.status = 'APPROVED';
          ms.approvedBy = me()?.id || 'U-ADMIN';
          ms.approvedAt = new Date().toISOString();
          approvedCount++;
        }
      });

      if (approvedCount === 0) {
        toast('Không có ca live nào đang chờ duyệt');
        return;
      }

      recalculateSessionManualBonus(s);
      playAutoApproveChime();

      saveState();
      renderAll();
      openManualStaffModal(sessionId);
      toast(`⚡ Đã phê duyệt tất cả ${approvedCount} ca live chờ duyệt! Doanh số & KPI đã chính thức cập nhật.`);
    }

    function updateManualStaffGmv(sessionId, index, rawVal) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s || !Array.isArray(s.manualStaff) || !s.manualStaff[index]) return;

      const admin = isAdmin();
      const currentActor = me();
      const isHost = currentActor && currentActor.role === 'HOST';
      const ms = s.manualStaff[index];

      if (!admin && !isHost) {
        toast('Chỉ Admin và Host mới có quyền chỉnh sửa doanh số ở mục KPI thủ công!');
        openManualStaffModal(sessionId);
        return;
      }

      // Nếu Host cố tình sửa ca đã duyệt:
      if (!admin && ms.status === 'APPROVED') {
        toast('Ca live này đã được Admin duyệt! Chỉ Admin mới có quyền điều chỉnh số tiền.');
        openManualStaffModal(sessionId);
        return;
      }

      const val = Math.max(0, parseVndInput(rawVal));
      const oldVal = Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0;
      if (oldVal === val) return;

      const maxCap = getSessionMaxGmvCap(s);
      if (!admin && val > maxCap.cap) {
        toast(`⚠️ Không hợp lệ: Doanh số ca live (${vnd(val)}) không được vượt quá ${maxCap.desc}!`);
        openManualStaffModal(sessionId);
        return;
      }

      if (ms.hostId) {
        ms.shiftGmv = val;
        ms.personalGmv = val;
        ms.hostBonus = Math.round(val * 0.003);
        ms.opBonus = ms.operatorId ? Math.round(val * 0.001) : 0;
        ms.bonus = ms.hostBonus + ms.opBonus;
      } else {
        ms.personalGmv = val;
        ms.shiftGmv = val;
        const rate = ms.role === 'HOST' ? 0.003 : 0.001;
        ms.bonus = Math.round(val * rate);
        if (ms.role === 'HOST') ms.hostBonus = ms.bonus;
        else ms.opBonus = ms.bonus;
      }

      // Nếu Host sửa ca live của mình, reset về PENDING để Admin duyệt lại
      if (!admin) {
        ms.status = 'PENDING';
        ms.approvedBy = null;
        ms.approvedAt = null;
      }

      recalculateSessionManualBonus(s);

      saveState();
      renderAll();
      openManualStaffModal(sessionId);

      const hostUser = userById(ms.hostId || ms.userId);
      if (admin) {
        toast(`💰 Admin đã cập nhật doanh số ca live của ${hostUser?.name || 'Host'}: ${vnd(val)} (KPI Host: ${vnd(ms.hostBonus)})`);
      } else {
        toast(`💰 Đã cập nhật doanh số ca live: ${vnd(val)}. Trạng thái chuyển sang Chờ Admin duyệt.`);
      }
    }

    function updateManualStaffNote(sessionId, index, newNote) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s || !Array.isArray(s.manualStaff) || !s.manualStaff[index]) return;
      const admin = isAdmin();
      const isHost = me() && me().role === 'HOST';
      if (!admin && !isHost) return;
      s.manualStaff[index].note = (newNote || '').trim();
      saveState();
      toast('Đã lưu ghi chú ca live');
    }

    function removeManualStaff(sessionId, index) {
      const s = state.sessions.find(x => x.id === sessionId);
      if (!s || !Array.isArray(s.manualStaff)) return;
      const admin = isAdmin();
      const currentActor = me();
      const isHost = currentActor && currentActor.role === 'HOST';
      const ms = s.manualStaff[index];
      if (!ms) return;

      const isMySubmission = (ms.submittedBy === currentActor?.id) || (ms.hostId === currentActor?.id) || (ms.userId === currentActor?.id);

      if (!admin && !(isHost && isMySubmission && ms.status === 'PENDING')) {
        toast('Chỉ Admin mới có quyền xóa ca live đã duyệt, hoặc Host hủy ca live do mình gửi khi còn đang chờ duyệt!');
        return;
      }

      s.manualStaff.splice(index, 1);
      recalculateSessionManualBonus(s);

      saveState();
      renderAll();
      openManualStaffModal(sessionId);
      toast('Đã hủy / xóa ca live khỏi phiên');
    }

    /* ---------- 13.1 Quản lý Mục tiêu Target cá nhân & Bộ tạo câu động viên hàng ngày cho Host Livestream ---------- */
    // Helper tính GMV thực nhận đã đối soát của riêng Host (Chỉ tính ca đã được Admin duyệt)
    function getHostActualGmv(u, list = null) {
      if (!u || u.role !== 'HOST') return 0;
      const sessions = list || (typeof filteredSessions === 'function' ? filteredSessions() : (state.sessions || []));
      let recGmv = 0;
      sessions.forEach(s => {
        if (s.isManualKpi) {
          if (s.manualStaff && s.manualStaff.length > 0) {
            const contrib = getStaffManualContribution(s, u.id, true);
            recGmv += contrib.gmv;
          } else if ((s.manualKpiNote || '').toLowerCase().includes(u.name.toLowerCase())) {
            recGmv += (Number(s.kpiGmv) || 0);
          }
        } else if (s.hasShifts) {
          getStaffShiftsInSession(s, u.id).filter(sh => sh.isApproved).forEach(sh => {
            recGmv += sh.recGmv;
          });
        } else if (s.hostId === u.id) {
          recGmv += s.kpiGmv;
        }
      });
      return recGmv;
    }

    // Kho câu động viên truyền cảm hứng tự nghĩ dành riêng cho Host Livestream
    const HOST_MOTIVATIONAL_TEMPLATES = {
      // 1. Khởi động / Dưới 35% target
      START: [
        'Chào {name}, mỗi phiên LIVE là một sân khấu để bạn tỏa sáng! Hãy mang nụ cười và năng lượng rạng rỡ nhất lên sóng hôm nay nhé, giỏ hàng triệu đơn đang đợi bạn! 🌟💖',
        '{name} ơi, sự chân thành và giọng nói truyền cảm chính là "vũ khí" chốt đơn đỉnh nhất. Chúc bạn hôm nay live bùng nổ, tiến vững chắc tới mốc {target}! 🚀🔥',
        'Mục tiêu {target} nghe thật lớn, nhưng chia nhỏ ra từng ca live của {name} thì hoàn toàn trong tầm tay. Bật máy, mỉm cười và tỏa sáng thôi nào! 💪💎',
        'Mỗi mắt xem hôm nay là một khách hàng yêu quý bạn. Hãy tự tin làm chủ phiên LIVE, biến từng phút giây thành doanh số rực rỡ nhé {name}! 🎤✨',
        'Hôm nay sẽ là một ngày bùng nổ của {name}! Giữ chất giọng ấm áp, năng lượng đỉnh cao và chốt đơn mỏi tay nhé bạn thân mến! 🌈🔥',
        'Đừng ngần ngại thử cách tương tác mới hôm nay! Năng lượng tích cực từ {name} sẽ lan tỏa và kích hoạt hàng nghìn lượt mua sắm! Cố lên nhé! ⚡🛍️'
      ],
      // 2. Tăng tốc / 35% đến 69% target
      ACCEL: [
        'Tuyệt vời {name} ơi! Bạn đã đi được {pct}% chặng đường mục tiêu {target} rồi! Phong độ đang rất tuyệt, hãy bung hết nhiệt huyết ca hôm nay để bứt phá ngoạn mục! 💪🔥',
        'Đã vượt qua hơn một phần ba chặng đường! Từng nụ cười, từng lời tư vấn của {name} đang biến mục tiêu {target} thành hiện thực. Giữ vững ngọn lửa nghề nhé! 🎯✨',
        'Khán giả đang cực kỳ hào hứng đón chờ các ca LIVE của {name}! Hãy tự tin đẩy mạnh các deal hot hôm nay, mốc {target} đang tiến lại rất gần! 🌟🛍️',
        'Phong thái live của {name} ngày càng cuốn hút và chuyên nghiệp! Chỉ còn {remain} nữa thôi là chạm đích, tiếp tục giữ vững nhịp độ này nhé! 🚀💖',
        'Sự kiên trì của {name} mỗi ngày đang đơm hoa kết trái. Cố gắng thêm một chút nữa trong từng ca, kỳ tích doanh số sẽ xuất hiện rực rỡ! 🌈💪',
        'Tập trung vào từng nhịp chốt đơn hôm nay! Doanh số {shortRec} đã chứng minh thực lực của {name}. Tiếp tục tăng tốc cán mốc {target} nhé! 🔥📈'
      ],
      // 3. Nước rút / 70% đến 99% target
      SPRINT: [
        'Đích đến {target} đã ở ngay trước mắt rồi {name} ơi ({pct}%)! Chỉ còn thiếu đúng {remain} nữa thôi! Hôm nay hãy "cháy" hết mình để cán đích vinh quang nhé! 🏁🔥',
        'Phong độ chốt đơn đợt này của {name} quá đỉnh cao! Chỉ một cú hích ca live hôm nay là chạm mốc target lịch sử. Cả team luôn tin tưởng và ủng hộ bạn! 🏆✨',
        'Áp lực tạo nên kim cương! Từng phút giây trên live hôm nay của {name} đều là khoảnh khắc vàng để hoàn thành xuất sắc mục tiêu. Tự tin bứt phá nào! 💎🚀',
        'Đừng dừng lại khi chuẩn bị chạm đỉnh vinh quang! {name} đã làm quá xuất sắc suốt thời gian qua, hôm nay hãy làm một phiên live để đời nhé! 👑🔥',
        'Chỉ cách đích {target} một bước ngắn nữa thôi! Giữ vững giọng nói ngọt ngào, đẩy mạnh các combo chủ lực và giật giải Host xuất sắc nhất tháng nhé {name}! 🌟🎯'
      ],
      // 4. Vượt mốc 100% target
      OVER: [
        '🎉 CHÚC MỪNG {name}! Bạn đã xuất sắc cán mốc {target} với thành tích {pct}% ngoạn mục! Đẳng cấp Host hàng đầu nhà Khang Baby là đây! Hãy tự hào về nỗ lực phi thường của bạn! 👑🌟',
        'Siêu sao Livestream gọi tên {name}! Mục tiêu {target} đã bị chinh phục hoàn toàn! Hãy tiếp tục giữ ngọn lửa này để xác lập những kỷ lục doanh số mới nhé! 🏆🔥',
        'Vượt target rực rỡ! Từng giọt mồ hôi và năng lượng của {name} đã được đền đáp xứng đáng. Hoa hồng và phần thưởng lớn đang chờ bạn! 💖🎉',
        'Bạn không chỉ đạt target {target} mà còn truyền cảm hứng mạnh mẽ cho toàn bộ đội ngũ Host & Op! Tiếp tục thăng hoa trên các phiên LIVE nhé {name}! 🌟🚀'
      ]
    };

    const hostMotivationOffset = {};

    function getHostDailyMotivation(user, recGmv, targetGmv, seedOffset = 0) {
      if (!user || user.role !== 'HOST') return null;
      const target = Math.max(1, targetGmv || user.targetGmv || 1000000000);
      const actual = Math.max(0, recGmv || 0);
      const pct = Math.round((actual / target) * 100);
      const remain = Math.max(0, target - actual);

      let poolKey = 'START';
      if (pct >= 100) poolKey = 'OVER';
      else if (pct >= 70) poolKey = 'SPRINT';
      else if (pct >= 35) poolKey = 'ACCEL';

      const pool = HOST_MOTIVATIONAL_TEMPLATES[poolKey];

      // Băm ngày tháng + ID người dùng để mỗi ngày có 1 câu động viên đổi mới tự nhiên
      const dateStr = (typeof state !== 'undefined' && state.to) ? state.to : TODAY;
      let charSum = seedOffset || 0;
      const seedKey = `${dateStr}_${user.id}`;
      for (let i = 0; i < seedKey.length; i++) {
        charSum = (charSum * 31 + seedKey.charCodeAt(i)) % 1000000;
      }
      const idx = Math.abs(charSum) % pool.length;
      let raw = pool[idx];

      const quote = raw
        .replace(/{name}/g, user.name)
        .replace(/{target}/g, short(target))
        .replace(/{pct}/g, pct)
        .replace(/{remain}/g, short(remain))
        .replace(/{shortRec}/g, short(actual));

      return {
        user,
        recGmv: actual,
        targetGmv: target,
        pct,
        remain,
        quote,
        tier: poolKey,
        index: idx
      };
    }

    function rerollHostDailyMotivation(userId) {
      const u = userById(userId);
      if (!u || u.role !== 'HOST') return;
      hostMotivationOffset[u.id] = (hostMotivationOffset[u.id] || 0) + 1;
      const hostRecGmv = getHostActualGmv(u);
      const mot = getHostDailyMotivation(u, hostRecGmv, u.targetGmv, hostMotivationOffset[u.id]);

      const ovText = document.getElementById('ovHostMotivationText');
      if (ovText) ovText.textContent = `"${mot.quote}"`;

      const modalText = document.getElementById('modalHostMotivationText');
      if (modalText) modalText.textContent = `"${mot.quote}"`;

      // Cập nhật lại dropdown thông báo bell
      renderHeaderAndAlerts();
      toast(`💌 Đã đổi câu động viên mới cho Host ${u.name}!`);
    }


    /* ---------- 14. Render Tab 5 (Công cụ): Xuất file riêng (Premium Checkbox UI) ---------- */
    const SHEETS = [
      { id: 'KPI', name: 'Bảng chốt KPI tự động (Host 0,3% · Operator 0,1%)', desc: 'Tổng hợp GMV LIVE sau đối soát + GMV Affiliate, loại trừ phiên Campaign/Mega Live' },
      { id: 'STAFF', name: 'Bảng lương KPI nhân sự (Host 0,3% · Operator 0,1%)', desc: 'Tổng hợp GMV đã đối soát, số phiên LIVE, hoa hồng tự động & thưởng từng bạn' },
      { id: 'SESSIONS', name: 'Chi tiết phiên LIVE & trạng thái đối soát', desc: 'Tổng GMV (LIVE + Aff), GMV Seller, GMV chưa chốt và hoàn hủy' },
      { id: 'ORDERS', name: 'Đối soát cấp đơn v1.33.0 (Vận chuyển / Hủy / Hoàn)', desc: 'Chi tiết từng đơn khớp giờ, chống cộng trùng 2 kênh & bảo vệ 60 ngày' },
      { id: 'SHOP_ORDERS', name: 'Đơn Shop tự ra ngoài Live (Showcase, Video ngắn, Search Mall)', desc: 'Doanh số tự nhiên gian hàng · Tách riêng 0% KPI Live · Tránh tranh chấp hoa hồng' },
      { id: 'RETURNS_15D', name: 'Đơn hoàn 15 ngày (TikTok Shop) & Đối chiếu GMV đối soát', desc: 'Bảng theo dõi đơn trả hàng trong 15 ngày sau khi nhận · Giảm trừ hoa hồng Host 0,3% & Operator 0,1%' },
      { id: 'MANUAL', name: 'KPI thủ công (Ngày Campaign & Mega Live)', desc: 'Các phiên tách riêng không cộng KPI tự động' }
    ];
    function populateExportStaffSelect() {
      const sel = document.getElementById('expStaffSelect');
      if (!sel) return;
      const admin = isAdmin();
      const meUser = me();
      const staffList = state.users.filter(u => u.status === 'APPROVED' && (u.role === 'HOST' || u.role === 'OPERATOR') && (admin ? true : u.id === meUser?.id));
      let chosenId = !admin && meUser ? meUser.id : sel.value;
      if (!chosenId || !staffList.some(u => u.id === chosenId)) {
        if (meUser && (meUser.role === 'HOST' || meUser.role === 'OPERATOR') && staffList.some(u => u.id === meUser.id)) {
          chosenId = meUser.id;
        } else if (staffList.length > 0) {
          chosenId = staffList[0].id;
        }
      }
      sel.innerHTML = staffList.map(u => `<option value="${u.id}" ${u.id === chosenId ? 'selected' : ''}>${u.name} · ${u.role === 'HOST' ? '🎙️ Host Livestream' : '⚙️ Trợ lý Vận hành'}</option>`).join('');
      if (chosenId) sel.value = chosenId;
      if (!admin) {
        sel.disabled = true;
        sel.style.opacity = '0.9';
        sel.style.cursor = 'not-allowed';
      } else {
        sel.disabled = false;
        sel.style.opacity = '1';
        sel.style.cursor = '';
      }
    }

    function renderExportStaffPreview() {
      const sel = document.getElementById('expStaffSelect');
      const box = document.getElementById('expStaffPreviewBox');
      if (!sel || !box) return;
      const u = state.users.find(x => x.id === sel.value);
      if (!u) {
        box.innerHTML = `<div class="muted" style="text-align:center;padding:20px;">Vui lòng chọn nhân sự để hiển thị dữ liệu.</div>`;
        return;
      }

      const list = filteredSessions();
      let sesCount = 0;
      let recGmv = 0;
      let autoComm = 0;

      list.forEach(s => {
        if (s.hasShifts && Array.isArray(s.shifts)) {
          const myShifts = getStaffShiftsInSession(s, u.id);
          if (myShifts.length > 0) {
            sesCount++;
            myShifts.forEach(sh => {
              if (sh.isApproved && !s.manual) {
                recGmv += (Number(sh.recGmv) || 0);
                autoComm += (Number(sh.comm) || 0);
              }
            });
          }
          if (!state.targetCelebrated) state.targetCelebrated = {};
        } else {
          const isMine = (u.role === 'HOST' && s.hostId === u.id) || (u.role === 'OPERATOR' && s.operatorId === u.id);
          if (isMine) {
            sesCount++;
            if (!s.manual) {
              recGmv += (Number(s.kpiGmv) || 0);
              autoComm += (u.role === 'HOST' ? (Number(s.hostComm) || 0) : (Number(s.opComm) || 0));
            }
          }
        }

        if (s.isManualKpi && Array.isArray(s.manualStaff)) {
          const contrib = getStaffManualContribution(s, u.id, true);
          if (contrib.count > 0) {
            sesCount += contrib.count;
            recGmv += contrib.gmv;
            autoComm += contrib.bonus;
          }
        }
      });
      const campMega = computeStaffCampMega(u, list);
      const totalIncome = autoComm + campMega.totalAllowance;
      const rateLabel = u.role === 'HOST' ? '0.3%' : '0.1%';

      box.innerHTML = `
        <div class="export-preview" style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;">
          <div class="export-preview-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border);">
            <div class="export-person" style="display:flex;align-items:center;gap:12px;">
              <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--pink),var(--cyan));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;">
                ${u.name.split(' ').map(p => p[0]).slice(-2).join('').toUpperCase()}
              </div>
              <div class="export-person-info">
                <div style="font-weight:800;font-size:16px;color:var(--txt);">${u.name}</div>
                <div class="export-person-pills" style="display:flex;gap:6px;align-items:center;margin-top:2px;">
                  <span class="pill ${u.role === 'HOST' ? 'p-pink' : 'p-violet'}">${u.role === 'HOST' ? '🎙️ Host Livestream' : '⚙️ Trợ lý Vận hành'}</span>
                  <span class="pill p-sky">Tỷ lệ KPI: ${rateLabel}</span>
                </div>
              </div>
            </div>
            <div class="export-preview-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-grad sm" onclick="exportSelectedStaffKpi()"><i data-ic="download" data-s="14"></i>Xuất Phiếu Lương KPI (.csv)</button>
            </div>
          </div>
          <!-- 5 Stats Metrics Bento Cards -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px;">
            <div class="kpi" style="padding:10px 12px;">
              <div class="kpi-top"><div class="kpi-ic p-cyan">${ic('video', 15)}</div><div class="kpi-l">Ca / Phiên tham gia</div></div>
              <div class="kpi-v num" style="font-size:18px;">${sesCount} ca</div>
            </div>
            <div class="kpi" style="padding:10px 12px;">
              <div class="kpi-top"><div class="kpi-ic p-violet">${ic('chart', 15)}</div><div class="kpi-l">GMV đối soát</div></div>
              <div class="kpi-v num" style="font-size:18px;">${vnd(recGmv)}</div>
            </div>
            <div class="kpi" style="padding:10px 12px;">
              <div class="kpi-top"><div class="kpi-ic p-pink">${ic('dollar', 15)}</div><div class="kpi-l">Hoa hồng KPI (${rateLabel})</div></div>
              <div class="kpi-v num" style="font-size:18px;color:var(--pink-ink);">${vnd(autoComm)}</div>
            </div>
            <div class="kpi" style="padding:10px 12px;">
              <div class="kpi-top"><div class="kpi-ic p-amber">${ic('award', 15)}</div><div class="kpi-l">Phụ cấp Camp &amp; Mega</div></div>
              <div class="kpi-v num" style="font-size:18px;color:var(--amber);">${vnd(campMega.totalAllowance)}</div>
              <div class="muted" style="font-size:10.5px;margin-top:2px;">Camp: ${campMega.campDays}d · Mega: ${campMega.megaDays}d</div>
            </div>
            <div class="kpi" style="padding:10px 12px;background:linear-gradient(135deg,rgba(254,44,85,0.08),rgba(37,244,238,0.08));border:1px solid rgba(254,44,85,0.25);">
              <div class="kpi-top"><div class="kpi-ic p-green">${ic('check', 15)}</div><div class="kpi-l" style="font-weight:800;color:var(--txt);">TỔNG THỰC NHẬN</div></div>
              <div class="kpi-v num" style="font-size:20px;font-weight:900;color:var(--green);">${vnd(totalIncome)}</div>
            </div>
          </div>
        </div>`;
      hydrateIcons(box);
    }

    function exportSelectedStaffKpi() {
      const sel = document.getElementById('expStaffSelect');
      if (!sel || !sel.value) { toast('Vui lòng chọn nhân sự'); return; }
      exportOneStaffKpi(sel.value);
    }

    function renderExport() {
      const expRangeEl = document.getElementById('expRange');
      if (expRangeEl) expRangeEl.textContent = `${fmtD(state.from)} → ${fmtD(state.to)}`;
      populateExportStaffSelect();
      renderExportStaffPreview();

      const sel = new Set(state.exportSheets);
      const allChecked = sel.size === SHEETS.length;
      const chkBox = document.getElementById('expChecklist');
      if (chkBox) {
        chkBox.innerHTML = `
          <label class="chk-all" style="cursor:pointer;">
            <input type="checkbox" class="chk" id="expAllChk" ${allChecked ? 'checked' : ''} onchange="toggleAllExport(this.checked)" />
            <div><div style="font-size:15px;font-weight:800;">Chọn tất cả báo cáo</div><div class="num" style="color:var(--pink2);font-size:12px;font-weight:700;">Đã chọn ${sel.size} / ${SHEETS.length} sheet</div></div>
          </label>
          ${SHEETS.map(sh => `
            <label class="chk-row" style="cursor:pointer;">
              <input type="checkbox" class="chk" ${sel.has(sh.id) ? 'checked' : ''} onchange="toggleOneExport('${sh.id}', this.checked)" />
              <div><div style="font-weight:700;">${sh.name}</div><div class="muted" style="font-size:11.5px;">${sh.desc}</div></div>
            </label>`).join('')}`;
        const allEl = document.getElementById('expAllChk');
        if (allEl) allEl.indeterminate = sel.size > 0 && sel.size < SHEETS.length;
      }

      const sheetInfoEl = document.getElementById('expSheetInfo');
      if (sheetInfoEl) {
        sheetInfoEl.innerHTML = SHEETS.map(sh => `
          <div class="pli"><div class="card-ic"><i data-ic="download" data-s="18"></i></div><div class="pli-main"><div class="pli-name">${sh.name}</div><div class="pli-sub">${sh.desc}</div></div></div>`).join('');
        hydrateIcons(sheetInfoEl);
      }
    }
    function toggleAllExport(checked) { state.exportSheets = checked ? SHEETS.map(s => s.id) : []; saveState(); renderExport(); }
    function toggleOneExport(id, checked) {
      const s = new Set(state.exportSheets); if (checked) s.add(id); else s.delete(id);
      state.exportSheets = [...s]; saveState(); renderExport();
    }
    function exportWorkbook() {
      if (!state.exportSheets.length) { toast('Vui lòng chọn ít nhất 1 sheet để xuất'); return; }
      const list = filteredSessions();
      const xesc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const rowsXml = list.map(s => `<Row><Cell><Data ss:Type="String">${s.id}</Data></Cell><Cell><Data ss:Type="String">${s.date}</Data></Cell><Cell><Data ss:Type="String">${s.channel}</Data></Cell><Cell><Data ss:Type="Number">${s.grossLiveGmv}</Data></Cell><Cell><Data ss:Type="Number">${s.affiliateGmv}</Data></Cell><Cell><Data ss:Type="Number">${s.pendingRecGmv}</Data></Cell><Cell><Data ss:Type="Number">${s.cancelReturnGmv}</Data></Cell><Cell><Data ss:Type="Number">${s.kpiGmv}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(s.hostComm)}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(s.opComm)}</Data></Cell></Row>`).join('');

      let shopXml = '';
      if (state.exportSheets.includes('SHOP_ORDERS')) {
        const shopList = filteredShopOrders();
        const shopRows = shopList.map(o => `<Row><Cell><Data ss:Type="String">${o.orderId}</Data></Cell><Cell><Data ss:Type="String">${o.date}</Data></Cell><Cell><Data ss:Type="String">${o.time}</Data></Cell><Cell><Data ss:Type="String">${o.channel}</Data></Cell><Cell><Data ss:Type="String">${SHOP_SOURCE_META[o.source]?.short || o.source}</Data></Cell><Cell><Data ss:Type="String">${o.productName}</Data></Cell><Cell><Data ss:Type="String">${o.sku}</Data></Cell><Cell><Data ss:Type="Number">${o.qty}</Data></Cell><Cell><Data ss:Type="Number">${o.amount}</Data></Cell><Cell><Data ss:Type="Number">${o.refund}</Data></Cell><Cell><Data ss:Type="Number">${Math.max(0, o.amount - o.refund)}</Data></Cell><Cell><Data ss:Type="String">${o.status}</Data></Cell><Cell><Data ss:Type="String">${o.customerName}</Data></Cell><Cell><Data ss:Type="String">${o.customerPhone}</Data></Cell><Cell><Data ss:Type="String">${o.city}</Data></Cell><Cell><Data ss:Type="String">0% Live KPI</Data></Cell></Row>`).join('');
        shopXml = `<Worksheet ss:Name="Don_Shop_Ngoai_Live"><Table><Row><Cell><Data ss:Type="String">Mã đơn</Data></Cell><Cell><Data ss:Type="String">Ngày</Data></Cell><Cell><Data ss:Type="String">Giờ</Data></Cell><Cell><Data ss:Type="String">Kênh</Data></Cell><Cell><Data ss:Type="String">Nguồn đơn</Data></Cell><Cell><Data ss:Type="String">Sản phẩm</Data></Cell><Cell><Data ss:Type="String">Mã SKU</Data></Cell><Cell><Data ss:Type="String">Số lượng</Data></Cell><Cell><Data ss:Type="String">Tổng tiền</Data></Cell><Cell><Data ss:Type="String">Hoàn hủy</Data></Cell><Cell><Data ss:Type="String">Thực nhận</Data></Cell><Cell><Data ss:Type="String">Trạng thái</Data></Cell><Cell><Data ss:Type="String">Khách hàng</Data></Cell><Cell><Data ss:Type="String">Số ĐT</Data></Cell><Cell><Data ss:Type="String">Khu vực</Data></Cell><Cell><Data ss:Type="String">Quy tắc KPI</Data></Cell></Row>${shopRows}</Table></Worksheet>`;
      }

      let ret15dXml = '';
      if (state.exportSheets.includes('RETURNS_15D')) {
        const retList = filteredReturns15d();
        const retRows = retList.map(r => `<Row><Cell><Data ss:Type="String">${r.returnId}</Data></Cell><Cell><Data ss:Type="String">${r.orderId}</Data></Cell><Cell><Data ss:Type="String">${r.channel}</Data></Cell><Cell><Data ss:Type="String">${r.sessionId}</Data></Cell><Cell><Data ss:Type="String">${xesc(r.productName)}</Data></Cell><Cell><Data ss:Type="String">${r.sku}</Data></Cell><Cell><Data ss:Type="Number">${r.qty}</Data></Cell><Cell><Data ss:Type="String">${r.deliveredDate}</Data></Cell><Cell><Data ss:Type="String">${r.returnDate}</Data></Cell><Cell><Data ss:Type="Number">${r.daysFromDelivery}</Data></Cell><Cell><Data ss:Type="Number">${r.returnAmount}</Data></Cell><Cell><Data ss:Type="String">${xesc(r.reasonLabel)}</Data></Cell><Cell><Data ss:Type="String">${xesc(r.liability)}</Data></Cell><Cell><Data ss:Type="String">${xesc(r.statusLabel)}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(r.hostCommReduction)}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(r.opCommReduction)}</Data></Cell><Cell><Data ss:Type="String">${xesc(r.hostName || '')}</Data></Cell></Row>`).join('');
        ret15dXml = `<Worksheet ss:Name="Don_Hoan_15_Ngay_TikTok"><Table><Row><Cell><Data ss:Type="String">Mã hoàn</Data></Cell><Cell><Data ss:Type="String">Mã đơn gốc</Data></Cell><Cell><Data ss:Type="String">Kênh</Data></Cell><Cell><Data ss:Type="String">Phiên LIVE</Data></Cell><Cell><Data ss:Type="String">Sản phẩm</Data></Cell><Cell><Data ss:Type="String">Mã SKU</Data></Cell><Cell><Data ss:Type="String">Số lượng</Data></Cell><Cell><Data ss:Type="String">Ngày nhận hàng</Data></Cell><Cell><Data ss:Type="String">Ngày báo hoàn</Data></Cell><Cell><Data ss:Type="String">Số ngày sau nhận</Data></Cell><Cell><Data ss:Type="String">GMV hoàn</Data></Cell><Cell><Data ss:Type="String">Lý do hoàn</Data></Cell><Cell><Data ss:Type="String">Trách nhiệm</Data></Cell><Cell><Data ss:Type="String">Trạng thái xử lý</Data></Cell><Cell><Data ss:Type="String">Giảm trừ Host 0.3%</Data></Cell><Cell><Data ss:Type="String">Giảm trừ Op 0.1%</Data></Cell><Cell><Data ss:Type="String">Host phụ trách</Data></Cell></Row>${retRows}</Table></Worksheet>`;
      }

      let staffXml = '';
      if (state.exportSheets.includes('STAFF')) {
        const staffList = state.users.filter(u => u.status === 'APPROVED' && (u.role === 'HOST' || u.role === 'OPERATOR'));
        const staffRows = staffList.map(u => {
          let sesCount = 0, recGmv = 0, autoComm = 0, manualBonus = 0;
          list.forEach(s => {
            if (s.isManualKpi) {
              if (s.manualStaff && s.manualStaff.length > 0) {
                const contrib = getStaffManualContribution(s, u.id, true);
                if (contrib.count > 0) {
                  sesCount += contrib.count;
                  recGmv += contrib.gmv;
                  manualBonus += contrib.bonus;
                }
              } else if ((s.manualKpiNote || '').toLowerCase().includes(u.name.toLowerCase())) {
                sesCount++;
                manualBonus += (Number(s.manualKpiBonus) || 0);
              }
            } else if (s.hasShifts) {
              const myShifts = getStaffShiftsInSession(s, u.id);
              if (myShifts.length > 0) {
                sesCount++;
                myShifts.forEach(sh => {
                  if (sh.isApproved) {
                    recGmv += sh.recGmv;
                    autoComm += sh.comm;
                  }
                });
              }
            } else {
              const isMy = (u.role === 'HOST' && s.hostId === u.id) || (u.role === 'OPERATOR' && s.operatorId === u.id);
              if (isMy) {
                sesCount++;
                recGmv += s.kpiGmv;
                autoComm += (u.role === 'HOST' ? s.hostComm : s.opComm);
              }
            }
          });
          const campMega = computeStaffCampMega(u, list);
          const total = autoComm + campMega.totalAllowance;
          return `<Row><Cell><Data ss:Type="String">${xesc(u.name)}</Data></Cell><Cell><Data ss:Type="String">${xesc(u.email)}</Data></Cell><Cell><Data ss:Type="String">${u.role === 'HOST' ? 'Host (0,3%)' : 'Operator (0,1%)'}</Data></Cell><Cell><Data ss:Type="Number">${sesCount}</Data></Cell><Cell><Data ss:Type="Number">${recGmv}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(autoComm)}</Data></Cell><Cell><Data ss:Type="Number">${campMega.totalAllowance}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(total)}</Data></Cell></Row>`;
        }).join('');
        staffXml = `<Worksheet ss:Name="Bang_Luong_KPI_Nhan_Su"><Table><Row><Cell><Data ss:Type="String">Họ và tên</Data></Cell><Cell><Data ss:Type="String">Email</Data></Cell><Cell><Data ss:Type="String">Vai trò</Data></Cell><Cell><Data ss:Type="String">Số phiên LIVE</Data></Cell><Cell><Data ss:Type="String">GMV đã đối soát</Data></Cell><Cell><Data ss:Type="String">Hoa hồng tự động</Data></Cell><Cell><Data ss:Type="String">Phụ cấp Camp (100k) &amp; Mega (500k)</Data></Cell><Cell><Data ss:Type="String">Tổng thu nhập KPI</Data></Cell></Row>${staffRows}</Table></Worksheet>`;
      }

      const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="TikTok_KPI_v1340"><Table><Row><Cell><Data ss:Type="String">Mã phiên</Data></Cell><Cell><Data ss:Type="String">Ngày</Data></Cell><Cell><Data ss:Type="String">Kênh</Data></Cell><Cell><Data ss:Type="String">GMV LIVE</Data></Cell><Cell><Data ss:Type="String">GMV Affiliate</Data></Cell><Cell><Data ss:Type="String">Chờ đối soát</Data></Cell><Cell><Data ss:Type="String">Hoàn hủy</Data></Cell><Cell><Data ss:Type="String">GMV đã đối soát</Data></Cell><Cell><Data ss:Type="String">KPI Host 0,3%</Data></Cell><Cell><Data ss:Type="String">KPI Op 0,1%</Data></Cell></Row>${rowsXml}</Table></Worksheet>${staffXml}${shopXml}${ret15dXml}</Workbook>`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
      a.download = `TikTok_LIVE_KPI_${state.from}_${state.to}.xls`; a.click();
      toast(`Đã xuất Excel (${state.exportSheets.length} sheet)`);
    }
    function exportCsv() {
      const list = filteredSessions();
      const csv = ['MaPhien,Ngay,KhungGio,Kenh,GrossLIVE,Affiliate,ChoDoiSoat,HoanHuy,GMVDaDoiSoat,KPIHost,KPIOp']
        .concat(list.map(s => `${s.id},${s.date},"${s.slot}",${s.channel},${s.grossLiveGmv},${s.affiliateGmv},${s.pendingRecGmv},${s.cancelReturnGmv},${s.kpiGmv},${Math.round(s.hostComm)},${Math.round(s.opComm)}`)).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `Phien_LIVE_${state.from}_${state.to}.csv`; a.click();
      toast('Đã xuất file CSV phiên LIVE');
    }

    function exportOrdersCsv() {
      const ch = document.getElementById('fChannel')?.value || 'ALL';
      const all = state.orders.filter(o => o.date >= state.from && o.date <= state.to && (ch === 'ALL' || o.channel === ch));
      const csv = ['MaDonHang,Ngay,Gio,Kenh,Nguon,MaPhien,TrangThai,GiaTriDon,HoanTien,ThucThu']
        .concat(all.map(o => `${o.orderId},${o.date},${o.time},${o.channel},${o.source || 'LIVE'},${o.sessionId},${o.status},${o.amount},${o.refund || 0},${Math.max(0, o.amount - (o.refund || 0))}`)).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `Don_Hang_Doi_Soat_${state.from}_${state.to}.csv`;
      a.click();
      toast(`Đã xuất ${all.length} đơn hàng đối soát`);
    }

    /* ---------- 14. Render Tab 6 (Quản trị): TikTok / API & Creator Authorization ---------- */
    function renderTikTokApi() {
      const status = tiktokApiStatus;
      const connected = status?.connections?.filter(item => item.status === 'connected').length || 0;
      const backendReady = status?.backendReady === true;
      renderAutomationControls();
      renderAffiliateSyncStatus();
      document.getElementById('apiStatusGrid').innerHTML = `
        <div class="kpi"><div class="kpi-top"><div class="kpi-ic ${backendReady ? 'p-green' : 'p-amber'}">${ic('db', 18)}</div><div class="kpi-l">Backend bảo mật</div></div><div class="kpi-v">${tiktokApiStatusLoading ? 'Đang kiểm tra…' : (backendReady ? 'Sẵn sàng' : 'Chờ cấu hình')}</div><div class="kpi-s"><span>Cloudflare Worker + KV mã hóa</span><span class="pill ${backendReady ? 'p-green' : 'p-amber'}">${backendReady ? 'Online' : 'Thiếu secret'}</span></div></div>
        <div class="kpi"><div class="kpi-top"><div class="kpi-ic p-sky">${ic('key', 18)}</div><div class="kpi-l">Seller + Creator token</div></div><div class="kpi-v num">${connected}/${status?.connections?.length || 3} kết nối</div><div class="kpi-s"><span>Tự refresh mỗi 6 giờ</span><span class="pill p-sky">Không lộ token</span></div></div>
        <div class="kpi"><div class="kpi-top"><div class="kpi-ic p-pink">${ic('lock', 18)}</div><div class="kpi-l">Phân quyền</div></div><div class="kpi-v">Chỉ Admin</div><div class="kpi-s"><span>Firebase ID token được kiểm tra tại Worker</span></div></div>`;

      if (!status && !tiktokApiStatusLoading) void loadTikTokApiStatus();
      if (!status) {
        document.getElementById('tokenGrid').innerHTML = '<div class="note" style="grid-column:1/-1;"><span class="pill p-sky">Đang kiểm tra</span><span>Đang đọc trạng thái an toàn từ Cloudflare Worker…</span></div>';
        return;
      }

      document.getElementById('tokenGrid').innerHTML = status.connections.map(connection => {
        const isConnected = connection.status === 'connected';
        const isReady = connection.status === 'ready_to_refresh';
        const badgeClass = isConnected ? 'p-green' : (isReady ? 'p-sky' : 'p-amber');
        const badgeText = isConnected ? 'Đã kết nối' : (isReady ? 'Có refresh token' : 'Chưa cấu hình');
        const accessText = connection.accessExpiresAt ? new Date(connection.accessExpiresAt).toLocaleString('vi-VN') : '—';
        const refreshText = connection.refreshExpiresAt ? new Date(connection.refreshExpiresAt).toLocaleString('vi-VN') : '—';
        const updatedText = connection.refreshedAt ? new Date(connection.refreshedAt).toLocaleString('vi-VN') : 'Chưa làm mới';
        return `
          <details class="card api-connection" ${connection.error || !isConnected ? 'open' : ''}>
            <summary class="card-h">
              <div class="card-h-l"><div class="card-ic">${ic(connection.kind === 'creator' ? 'users' : 'store', 20)}</div><div><div class="h-title">${esc(connection.label)}</div><div class="h-sub">${connection.kind === 'creator' ? 'Creator Authorization · GMV Affiliate' : 'Seller Authorization · Shop API'}</div></div></div>
              <span class="pill ${badgeClass}"><span class="dot"></span>${badgeText}</span>
            </summary>
            <div class="api-connection-body">
              <div class="note"><span>${ic('lock', 14)}</span><span>Access token và refresh token được mã hóa, không bao giờ gửi về trình duyệt.</span></div>
              <div class="grid-2" style="gap:8px;">
                <div><div class="muted">Access hết hạn</div><strong class="num">${accessText}</strong></div>
                <div><div class="muted">Refresh hết hạn</div><strong class="num">${refreshText}</strong></div>
                <div><div class="muted">Làm mới gần nhất</div><strong class="num">${updatedText}</strong></div>
                <div><div class="muted">Open ID</div><strong class="mono">${connection.openIdSuffix ? `••••••${esc(connection.openIdSuffix)}` : 'Ẩn'}</strong></div>
              </div>
              <div><div class="muted" style="margin-bottom:4px;">Scopes đã cấp</div><div style="display:flex;gap:4px;flex-wrap:wrap;">${connection.grantedScopes.length ? connection.grantedScopes.map(scope => `<span class="pill p-gray">${esc(scope)}</span>`).join('') : '<span class="muted">Chưa nhận danh sách scope</span>'}</div></div>
              ${connection.error ? `<div class="note danger"><span class="pill p-red">Lỗi</span><span>${esc(connection.error)}</span></div>` : ''}
              <div style="padding-top:4px;display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="btn btn-ghost sm" onclick="refreshToken('${connection.id}')" ${connection.status === 'not_configured' ? 'disabled' : ''}>${ic('refresh', 14)}Làm mới an toàn</button>
                ${connection.kind === 'creator'
                  ? `<button type="button" class="btn btn-grad sm" onclick="startCreatorAuthorization('${connection.id === 'shopkhangbaby-creator' ? 'shopkhangbaby' : 'mekhangsua'}')" ${connection.authorizationReady ? '' : 'disabled'}>${isConnected ? 'Ủy quyền lại Creator' : 'Kết nối Creator'}</button>`
                  : `<button type="button" class="btn btn-grad sm" onclick="startSellerAuthorization('${connection.id}')" ${connection.authorizationReady ? '' : 'disabled'}>${isConnected ? 'Ủy quyền lại Seller' : 'Kết nối Seller'}</button>`}
              </div>
            </div>
          </details>`;
      }).join('') + (status.missingSecrets.length ? `
        <div class="note" style="grid-column:1/-1;"><span class="pill p-amber">Cần thiết lập</span><span>Cloudflare còn thiếu ${status.missingSecrets.length} cấu hình. App Secret chỉ lưu dạng Secret; access/refresh token được nhận qua link ủy quyền, không nhập tay.</span></div>` : '');
    }

    async function parseTikTokApiResponse(response) {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'TIKTOK_API_ERROR');
      return data;
    }
    async function loadTikTokApiStatus(force = false) {
      if (tiktokApiStatusLoading || (tiktokApiStatus && !force)) return;
      tiktokApiStatusLoading = true;
      renderTikTokApi();
      try {
        const response = await productionApiFetch('/api/tiktok/status');
        tiktokApiStatus = await parseTikTokApiResponse(response);
      } catch (error) {
        console.error('Could not load TikTok API status', error);
        tiktokApiStatus = { backendReady: false, connections: [], missingSecrets: [], error: 'STATUS_UNAVAILABLE' };
        toast('Không thể kiểm tra TikTok API. Vui lòng kiểm tra Worker và đăng nhập Admin.');
      } finally {
        tiktokApiStatusLoading = false;
        renderTikTokApi();
      }
    }
    async function startCreatorAuthorization(creator = 'mekhangsua') {
      return openTikTokAuthorization('/api/tiktok/creator/'+encodeURIComponent(creator)+'/authorize');
    }
    async function startSellerAuthorization(connectionId) {
      return openTikTokAuthorization(`/api/tiktok/seller/${encodeURIComponent(connectionId)}/authorize`);
    }
    async function refreshToken(connectionId) {
      try {
        const response = await productionApiFetch(`/api/tiktok/tokens/${encodeURIComponent(connectionId)}/refresh`, { method: 'POST' });
        await parseTikTokApiResponse(response);
        toast('Đã làm mới token và lưu bản mã hóa trên Cloudflare.');
        await loadTikTokApiStatus(true);
      } catch (error) {
        console.error('Could not refresh TikTok token', error);
        toast('Làm mới token thất bại. Kiểm tra App credentials, refresh token và quyền đã cấp.');
      }
    }
    async function refreshAllTikTokTokens() {
      try {
        const response = await productionApiFetch('/api/tiktok/tokens/refresh', { method: 'POST' });
        await parseTikTokApiResponse(response);
        toast('Đã chạy làm mới an toàn cho tất cả kết nối TikTok.');
        await loadTikTokApiStatus(true);
      } catch (error) {
        console.error('Could not refresh TikTok tokens', error);
        toast('Chưa thể làm mới tất cả token. Kiểm tra cấu hình Cloudflare Secrets.');
      }
    }


    /* ---------- 15. Render Tab 7 (Quản trị): Lưu trữ & Quản lý dung lượng Free Tier (GitHub / Firebase / Cloudflare) ---------- */
    function worstQuotaMetric() {
      let best = null;
      storagePlatforms().forEach(p => p.metrics.forEach(m => {
        if (!Number.isFinite(m.used) || !Number.isFinite(m.limit) || m.limit <= 0) return;
        const pct = (m.used / m.limit) * 100;
        if (!best || pct > best.pct) best = { prov: p, metric: m, pct };
      }));
      if (best) best.pctLabel = formatStoragePercent(best.pct);
      return best;
    }
    function buildSystemAlertWidget(w, compact = false) {
      const crit = w.pct >= 90;
      return `<div class="alert-w ${crit ? '' : 'warn'}">
        <div class="alert-top">
          <div class="alert-ic">${ic('db', 24)}</div>
          <div style="flex:1;min-width:0;">
            <div class="alert-k">TRẠNG THÁI DUNG LƯỢNG BẢN FREE · ${w.prov.name.toUpperCase()}</div>
            <div class="alert-h">${w.prov.name} (${w.metric.label}) sắp đầy — ${w.pctLabel}</div>
            <p class="muted" style="margin-top:4px;">Số đo API đã vượt ngưỡng cảnh báo. ${storageUsageStatus?.management?.policy?.autoFree?'Tự giải phóng đang bật và chỉ xử lý tài nguyên kỹ thuật đủ điều kiện.':'Tự giải phóng đang tắt; mở cấu hình bên dưới nếu muốn bật.'}</p>
          </div>
          <button type="button" class="icon-btn" onclick="dismissStorageAlert(event)" aria-label="Ẩn cảnh báo" title="Bỏ qua cảnh báo hôm nay">${ic('x', 16)}</button>
        </div>
        <div class="alert-box">
          <div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:8px;">
            <span>${w.prov.name} · ${w.metric.label}</span>
            <span class="num" style="color:${crit ? 'var(--red)' : 'var(--amber)'};">${w.pctLabel}</span>
          </div>
          <div class="prog ${crit ? 'crit' : 'warn'}"><span style="width:${Math.min(100, w.pct)}%;"></span></div>
          <div class="num muted" style="font-size:12px;margin-top:7px;">Đã dùng ${w.metric.unit&&w.metric.unit!=='bytes'?w.metric.used.toLocaleString('vi-VN')+' '+esc(w.metric.unit):formatStorageBytes(w.metric.used)} / ${w.metric.unit&&w.metric.unit!=='bytes'?w.metric.limit.toLocaleString('vi-VN')+' '+esc(w.metric.unit):formatStorageBytes(w.metric.limit)} (Gói ${w.prov.plan})</div>
        </div>
        <div class="alert-rec">
          <div class="card-ic" style="width:38px;height:38px;border-radius:50%;">${ic('bulb', 18)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;">Khuyến nghị: Kiểm tra số đo và dữ liệu có thể dọn</div>
            <div class="muted" style="font-size:12px;">Chưa xác định dung lượng có thể giải phóng. Sao lưu trước khi xóa dữ liệu tại nền tảng.</div>
          </div>
          ${ic('chevR', 18)}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a class="btn btn-danger" href="${w.prov.url}" target="_blank" rel="noopener noreferrer">${ic('db', 15)}Mở ${w.prov.name} ${ic('arrowR', 15)}</a>
            ${compact ? `<button type="button" class="btn btn-ghost" onclick="switchTab('TAB_STORAGE')">Mở trang quản lý dung lượng</button>` : ''}
          </div>
          <button type="button" class="btn-link" onclick="dismissStorageAlert(event)" style="cursor:pointer;" title="Bỏ qua cảnh báo hôm nay">Bỏ qua hôm nay</button>
        </div>
      </div>`;
    }
    function isStorageAlertDismissed() {
      if (!state.storage) return false;
      return state.storage.dismissed === true || state.storage.dismissedAt === TODAY;
    }
    function dismissStorageAlert(e) {
      if (e) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      }
      if (!state.storage) state.storage = defaultStorage();
      state.storage.dismissedAt = TODAY;
      state.storage.dismissed = true;
      saveState();

      // Hiệu ứng ẩn mượt mà ngay lập tức
      const alertEls = document.querySelectorAll('.alert-w, .mob-alert-bar');
      alertEls.forEach(el => {
        el.style.transition = 'opacity 160ms ease, transform 160ms ease';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.97)';
      });

      setTimeout(() => {
        const ovAlert = document.getElementById('ovStorageAlert');
        if (ovAlert) ovAlert.innerHTML = '';
        renderStorage();
        renderOverview();
        toast('Đã bỏ qua cảnh báo dung lượng hôm nay');
      }, 150);
    }
    function restoreStorageAlert() {
      if (!state.storage) state.storage = defaultStorage();
      state.storage.dismissedAt = '';
      state.storage.dismissed = false;
      state.storage.dismissed = false;
      saveState();
      renderStorage();
      renderOverview();
      toast('Đã mở lại cảnh báo dung lượng');
    }

    function renderStorage() {
      const worst = worstQuotaMetric();
      const nb = document.getElementById('nbStorage');
      if (nb && worst && worst.pct >= 1) {
        nb.hidden = false;
        nb.textContent = worst.pctLabel;
        nb.classList.toggle('alert', worst.pct >= state.storage.threshold);
      } else if (nb) {
        nb.hidden = true;
        nb.textContent = '';
        nb.classList.remove('alert');
      }
      // Sidebar mini quota summary
      const sbMini = document.getElementById('sbQuotaMini');
      if (sbMini && worst && worst.pct >= state.storage.threshold) {
        sbMini.hidden = false;
        sbMini.innerHTML = `<div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:5px;"><span>Cảnh báo dung lượng</span><span class="num" style="color:var(--red);">${worst.pctLabel}</span></div>
          <div class="prog ${worst.pct >= 90 ? 'crit' : worst.pct >= 75 ? 'warn' : ''}"><span data-target-w="${Math.min(100, worst.pct)}%" style="width:0%;"></span></div>
          <div class="muted" style="margin-top:5px;font-size:11px;">${esc(worst.prov.name)} · ${esc(worst.metric.label)}</div>`;
      } else if (sbMini) {
        sbMini.hidden = true;
        sbMini.innerHTML = '';
      }

      const stAlert = document.getElementById('stAlert');
      if (stAlert) {
        if (worst && worst.pct >= state.storage.threshold && !isStorageAlertDismissed()) {
          stAlert.innerHTML = buildSystemAlertWidget(worst, false);
          hydrateIcons(stAlert);
        } else {
          stAlert.innerHTML = '';
        }
      }

      // 3 Provider Cards (GitHub, Firebase, Cloudflare)
      renderStorageProviders();
    }

    /* ---------- 16. Render Tab 8 (Quản trị): Quản lý tài khoản (Premium Table UI) ---------- */
    function setAccFilter(f) {
      accFilter = f; pages.acc = 1;
      document.querySelectorAll('#accSeg button').forEach(b => b.classList.toggle('active', b.dataset.f === f));
      renderAccounts();
    }
    function renderAccounts() {
      const pendingCnt = state.users.filter(u => u.status === 'PENDING').length;
      const nb = document.getElementById('nbAccounts');
      if (nb) { nb.textContent = pendingCnt ? `${pendingCnt} chờ` : state.users.length; nb.classList.toggle('alert', pendingCnt > 0); }

      const q = (document.getElementById('accSearch')?.value || '').trim().toLowerCase();
      const list = state.users.filter(u => {
        const isCur = u.id === state.currentUserId;
        const isOnline = isCur || !!u.isOnline;
        if (accFilter === 'ONLINE' && !isOnline) return false;
        if (accFilter === 'PENDING' && u.status !== 'PENDING') return false;
        if ((accFilter === 'HOST' || accFilter === 'OPERATOR') && u.role !== accFilter) return false;
        if (q && !`${u.name} ${u.email} ${u.uid} ${u.device || ''} ${u.location || ''}`.toLowerCase().includes(q)) return false;
        return true;
      });
      const pg = paginate('acc', list);

      document.getElementById('accBody').innerHTML = pg.rows.map(u => {
        const isCur = u.id === state.currentUserId;
        const isOnline = isCur || !!u.isOnline;
        const rateTxt = u.role ? ROLE[u.role].rateText : 'Chưa gán vai trò';
        const apiCol = u.role === 'ADMIN' && u.status === 'APPROVED'
          ? '<span class="pill p-green">Được xem TikTok API</span>'
          : '<span class="pill p-gray">Ẩn TikTok API</span>';
        return `<tr>
          <td>
            <div class="who">
              <div style="position:relative;display:inline-block;">
                ${avatarHtml(u, false)}
                <span class="online-indicator ${isOnline ? 'online' : 'offline'}" style="position:absolute;bottom:0;right:0;border:2px solid #fff;"></span>
              </div>
              <div>
                <div class="who-n">${esc(u.name)} ${isCur ? '<span class="pill p-sky" style="font-size:9px;height:16px;padding:0 5px;">Bạn</span>' : ''}</div>
                <div class="who-e">${esc(u.email)}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="online-indicator ${isOnline ? 'online' : 'offline'}"></span>
              <strong style="font-size:12px;color:${isOnline ? 'var(--green)' : 'var(--muted)'};">
                ${isOnline ? 'Đang online' : formatTimeAgo(u.lastActive)}
              </strong>
            </div>
            <div class="muted num" style="font-size:10.5px;margin-top:2px;">
              ${esc(u.device || 'Trình duyệt Web')} · ${esc(u.location || 'VN')}
            </div>
          </td>
          <td>
            <select class="sel sm" style="font-weight:700;" onchange="onUserRoleSelectChanged('${u.id}', this)">
              <option value="" ${!u.role ? 'selected' : ''}>-- Chọn vai trò --</option>
              <option value="HOST" ${u.role === 'HOST' ? 'selected' : ''}>Host Livestream</option>
              <option value="OPERATOR" ${u.role === 'OPERATOR' ? 'selected' : ''}>Livestream operator</option>
              <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td>${statusPill(u)}</td>
          <td style="font-weight:700;color:var(--pink-ink);">${rateTxt}</td>
          <td>${apiCol}</td>
          <td class="r">
            <div style="display:flex;gap:4px;justify-content:flex-end;align-items:center;">
              <button type="button" class="btn btn-ghost sm" style="height:28px;padding:0 8px;font-size:11px;" onclick="openUserActivityModal('${u.id}')" title="Xem nhật ký lịch sử hoạt động &amp; lần online">
                ${ic('clock', 12)}<span>Lịch sử</span>
              </button>
              ${u.status === 'PENDING'
                ? `<button type="button" class="btn btn-grad sm" onclick="openApproveModal('${u.id}')">${ic('check', 14)}Duyệt</button>`
                : `<button type="button" class="btn btn-ghost sm" onclick="confirmSetPending('${u.id}')">Tạm khóa</button>`}
              ${u.id === 'U-ADMIN'
                ? `<button type="button" class="btn btn-ghost sm" style="height:28px;padding:0 8px;font-size:11px;opacity:0.35;cursor:not-allowed;" title="Admin gốc hệ thống không thể xóa" disabled>${ic('trash', 12)}<span>Xóa</span></button>`
                : `<button type="button" class="btn btn-ghost sm" style="height:28px;padding:0 8px;font-size:11px;color:#E11D48;border-color:#FECDD3;background:#FFF1F2;" onclick="confirmDeleteUser('${u.id}')" title="Xóa tài khoản người dùng">${ic('trash', 12)}<span>Xóa</span></button>`}
            </div>
          </td>
        </tr>`;
      }).join('');

      document.getElementById('accMobile').innerHTML = pg.rows.map(u => {
        const isCur = u.id === state.currentUserId;
        const isOnline = isCur || !!u.isOnline;
        return `
        <div class="m-card">
          <div class="m-row">
            <div class="who">
              <div style="position:relative;display:inline-block;flex-shrink:0;">
                ${avatarHtml(u, false)}
                <span class="online-indicator ${isOnline ? 'online' : 'offline'}" style="position:absolute;bottom:0;right:0;border:2px solid #fff;"></span>
              </div>
              <div style="min-width:0;flex:1 1 auto;">
                <div class="who-n">${esc(u.name)} ${isCur ? '<span class="pill p-sky" style="font-size:9px;height:16px;padding:0 5px;">Bạn</span>' : ''}</div>
                <div class="who-e" title="${esc(u.email)}">${esc(u.email)}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;">
              ${statusPill(u)}
              <span class="pill ${isOnline ? 'p-green' : 'p-gray'}" style="height:19px;font-size:9.5px;">
                <span class="dot" style="${isOnline ? '' : 'background:#94A3B8;'}"></span>
                ${isOnline ? 'Đang online' : formatTimeAgo(u.lastActive)}
              </span>
            </div>
          </div>
          <div class="m-row" style="padding-top:6px;border-top:1px dashed var(--line2);font-size:11.5px;">
            <span class="muted">${esc(u.device || 'Chrome')} · ${esc(u.location || 'VN')}</span>
            <button type="button" class="btn btn-ghost sm" style="height:26px;padding:0 8px;font-size:11px;" onclick="openUserActivityModal('${u.id}')">
              ${ic('clock', 12)}<span>Xem lịch sử</span>
            </button>
          </div>
          <div class="m-row" style="padding-top:6px;border-top:1px dashed var(--line2);gap:6px;flex-wrap:wrap;">
            <select class="sel sm" style="flex:1 1 130px;min-width:120px;" onchange="onUserRoleSelectChanged('${u.id}', this)">
              <option value="" ${!u.role ? 'selected' : ''}>-- Chọn vai trò --</option>
              <option value="HOST" ${u.role === 'HOST' ? 'selected' : ''}>Host (0,3%)</option>
              <option value="OPERATOR" ${u.role === 'OPERATOR' ? 'selected' : ''}>Operator (0,1%)</option>
              <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
            </select>
            <div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">
              ${u.status === 'PENDING'
                ? `<button type="button" class="btn btn-grad sm" onclick="openApproveModal('${u.id}')">Duyệt</button>`
                : `<button type="button" class="btn btn-ghost sm" onclick="confirmSetPending('${u.id}')">Tạm khóa</button>`}
              ${u.id === 'U-ADMIN'
                ? `<button type="button" class="btn btn-ghost sm" style="height:28px;padding:0 8px;font-size:11px;opacity:0.35;cursor:not-allowed;" title="Admin gốc không thể xóa" disabled>${ic('trash', 12)}</button>`
                : `<button type="button" class="btn btn-ghost sm" style="height:28px;padding:0 8px;font-size:11px;color:#E11D48;border-color:#FECDD3;background:#FFF1F2;" onclick="confirmDeleteUser('${u.id}')" title="Xóa tài khoản">${ic('trash', 12)}<span>Xóa</span></button>`}
            </div>
          </div>
        </div>`;
      }).join('');

      document.getElementById('accInfo').textContent = `Hiển thị ${pg.from}–${pg.to} trên ${pg.total} người dùng`;
      document.getElementById('accPager').innerHTML = pagerHtml('acc', pg);
    }
