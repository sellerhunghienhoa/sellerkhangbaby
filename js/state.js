/**
 * TikTok Shop Live GMV & KPI Center - Production State Management
 */

    const MASTER_SCHEDULE_SHIFTS = [];

    function defaultStorage() {
      return {
        retentionDays: 90,
        threshold: 85,
        autoFree: false,
        dismissedAt: '',
        lastCheck: '',
        providers: [],
        items: [],
        history: []
      };
    }

    function defaultState() {
      return {
        currentUserId: '',
        preset: '30D', from: addDays(TODAY, -29), to: TODAY,
        lastSync: '', lastDailyScan: '',
        users: [],
        sessions: [], orders: [],
        affiliateDaily: [], lastAffiliateSync: '',
        lastOrderSync: '',
        shopOrders: [],
        returns15d: [],
        tokens: [],
        storage: {
          retentionDays: 90,
          threshold: 85,
          autoFree: false,
          dismissedAt: '',
          lastCheck: '',
          providers: [],
          items: [],
          history: []
        },
        discipline: {
          currentCycleMonth: TODAY.slice(0, 7),
          lastResetAt: TODAY,
          monthlyHistory: {}
        },
        exportSheets: ['KPI', 'STAFF', 'DISCIPLINE', 'SESSIONS', 'ORDERS', 'SHOP_ORDERS', 'RETURNS_15D', 'MANUAL'],
        tbCollapsed: false,
        editingSessions: {},
        targetCelebrated: {}
      };
    }

    let state = defaultState();
    let currentTab = 'TAB_OVERVIEW';
    let accFilter = 'ALL';
    let selectedCleanup = new Set();
    let ovStaffActive = '';
    let tiktokApiStatus = null;
    let tiktokApiStatusLoading = false;
    const pages = { ses: 1, ord: 1, shopOrd: 1, ret: 1, acc: 1, stf: 1, dis: 1 };
    const pageSizes = { ses: 10, ord: 10, shopOrd: 10, ret: 10, acc: 10, stf: 10, dis: 10 };

    function loadState() {
      // Firestore is the production source of truth. Start empty until auth resolves.
      state = defaultState();
    }

    function saveState() {
      if (typeof queueProductionStateSave === 'function') queueProductionStateSave();
    }

    /* ---------- Helper tính hạn mức tối đa GMV khi Host điền doanh số ca live ---------- */
    // Khống chế không được vượt quá số tiền GMV + Affiliate đã ghi nhận hoặc GMV đã được đối soát rồi
    function getSessionMaxGmvCap(s) {
      if (!s) return { cap: 0, grossWithAff: 0, reconciledGmv: 0, isReconciled: false, label: '0\u00A0₫', desc: '0\u00A0₫' };
      const gross = Number(s.grossLiveGmv) || 0;
      const aff = Number(s.affiliateGmv) || 0;
      const grossWithAff = gross + aff;
      const reconciledGmv = Number(s.kpiGmv) || 0;

      // Nếu phiên đã đối soát xong (pendingRecGmv == 0 hoặc s.status === 'RECONCILED' và có kpiGmv > 0):
      // Trần khống chế là GMV đã được đối soát rồi
      const isReconciled = (s.pendingRecGmv === 0 && reconciledGmv > 0) || s.status === 'RECONCILED';
      if (isReconciled) {
        return {
          cap: reconciledGmv,
          grossWithAff,
          reconciledGmv,
          isReconciled: true,
          label: 'GMV đã được đối soát rồi',
          desc: `GMV đã đối soát (${vnd(reconciledGmv)})`
        };
      }

      // Nếu phiên chưa hoàn tất đối soát (hoặc phiên thủ công):
      // Trần khống chế là GMV + Affiliate đã ghi nhận
      const cap = Math.max(grossWithAff, reconciledGmv);
      return {
        cap,
        grossWithAff,
        reconciledGmv,
        isReconciled: false,
        label: 'GMV + Affiliate đã ghi nhận',
        desc: `GMV + Affiliate đã ghi nhận (${vnd(cap)})`
      };
    }

    /* ---------- Helper tính đóng góp KPI phiên thủ công (Campaign / Mega Live theo cặp) ---------- */
    function getStaffManualContribution(s, userId, onlyApproved = true) {
      if (!s || !s.isManualKpi || !Array.isArray(s.manualStaff)) {
        return { gmv: 0, bonus: 0, count: 0, pendingGmv: 0, pendingBonus: 0 };
      }
      let gmv = 0, bonus = 0, count = 0, pendingGmv = 0, pendingBonus = 0;
      s.manualStaff.forEach(ms => {
        const isApproved = (ms.status || 'APPROVED') === 'APPROVED';

        // Host trong cặp HOẶC legacy entry Host HOẶC standalone Host
        const isHost = (ms.hostId === userId) || (!ms.hostId && ms.userId === userId && ms.role === 'HOST') || (ms.userId === userId && !ms.operatorId && !ms.hostId);
        // Operator trong cặp HOẶC legacy entry Operator
        const isOp = (ms.operatorId === userId) || (!ms.operatorId && ms.userId === userId && ms.role === 'OPERATOR');

        if (isHost) {
          const curGmv = Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0;
          const curBonus = Number(ms.hostBonus !== undefined ? ms.hostBonus : (ms.role === 'HOST' ? ms.bonus : Math.round(curGmv * 0.003))) || 0;
          if (isApproved) {
            gmv += curGmv;
            bonus += curBonus;
            count++;
          } else {
            pendingGmv += curGmv;
            pendingBonus += curBonus;
          }
        } else if (isOp) {
          const curGmv = Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0;
          const curBonus = Number(ms.opBonus !== undefined ? ms.opBonus : (ms.role === 'OPERATOR' ? ms.bonus : Math.round(curGmv * 0.001))) || 0;
          if (isApproved) {
            gmv += curGmv;
            bonus += curBonus;
            count++;
          } else {
            pendingGmv += curGmv;
            pendingBonus += curBonus;
          }
        }
      });
      return { gmv, bonus, count, pendingGmv, pendingBonus };
    }

    function recalculateSessionManualBonus(s) {
      if (!s || !Array.isArray(s.manualStaff)) return 0;
      const approvedItems = s.manualStaff.filter(ms => (ms.status || 'APPROVED') === 'APPROVED');
      const total = approvedItems.reduce((acc, ms) => {
        if (ms.hostBonus !== undefined || ms.opBonus !== undefined) {
          return acc + (Number(ms.hostBonus) || 0) + (Number(ms.opBonus) || 0);
        }
        return acc + (Number(ms.bonus) || 0);
      }, 0);
      s.manualKpiBonus = total;
      return total;
    }

    function renderManualStaffBadges(s) {
      const allStaff = s.manualStaff || [];
      const admin = isAdmin();
      const myId = me()?.id;
      // Người dùng thường chỉ thấy thẻ phân công ca của chính mình
      const staff = admin ? allStaff : allStaff.filter(ms => ms.userId === myId || ms.hostId === myId || ms.operatorId === myId);
      if (!staff.length) return `<div class="muted" style="font-size:11px;margin-top:2px;">${admin ? 'Chưa phân bổ Host / Vận hành' : 'Bạn chưa có ca trong phiên này'}</div>`;
      const pendingCount = staff.filter(ms => ms.status === 'PENDING').length;
      return `
        <div style="display:flex;flex-direction:column;gap:5px;">
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${staff.map(ms => {
              const isApproved = (ms.status || 'APPROVED') === 'APPROVED';
              const hostUser = userById(ms.hostId || (ms.role === 'HOST' ? ms.userId : null));
              const opUser = ms.operatorId ? userById(ms.operatorId) : (ms.role === 'OPERATOR' ? userById(ms.userId) : null);
              const shiftGmv = Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0;
              const isSelfOp = !ms.operatorId && ms.role !== 'OPERATOR' && ms.hostId;

              if (ms.hostId || ms.operatorId !== undefined) {
                return `
                  <span class="pill ${isApproved ? 'p-pink' : 'p-amber'}" style="font-size:10px;height:24px;padding:0 7px;gap:4px;" title="${esc(ms.note || '')}">
                    <span>🎤 <strong>${hostUser ? esc(hostUser.name) : 'Host'}</strong>${opUser ? ` + 🎧 ${esc(opUser.name)}` : (isSelfOp ? ' <em>(Tự Op)</em>' : '')}</span>
                    <span class="num">: ${short(shiftGmv)}</span>
                    ${!isApproved ? '<span style="color:#D97706;font-weight:800;">[Chờ duyệt]</span>' : ''}
                  </span>
                `;
              }

              const u = userById(ms.userId);
              const isH = ms.role === 'HOST';
              return `
                <span class="pill ${isH ? 'p-pink' : 'p-violet'}" style="font-size:10px;height:24px;padding:0 7px;" title="${esc(ms.note || '')}">
                  ${isH ? '🎤' : '🎧'} <strong>${u ? esc(u.name) : 'NV'}</strong>: ${short(ms.personalGmv)} (${short(ms.bonus)})
                  ${!isApproved ? '<span style="color:#D97706;font-weight:800;">[Chờ duyệt]</span>' : ''}
                </span>
              `;
            }).join('')}
          </div>
          ${pendingCount > 0 ? `<div style="font-size:10.5px;color:#D97706;font-weight:700;"><i data-ic="clock" data-s="11"></i> Có ${pendingCount} ca đang chờ Admin duyệt</div>` : ''}
          ${s.manualKpiNote ? `<div style="font-size:10.5px;color:var(--muted);line-height:1.3;">${esc(s.manualKpiNote)}</div>` : ''}
        </div>
      `;
    }

    /* ---------- 7. Công thức KPI ---------- */
    // GMV dùng KPI = GMV LIVE + GMV Affiliate − GMV chờ đối soát − Hoàn/Hủy − phần trùng (khi 2 kênh chồng giờ)
    function overlapIds() {
      const g = {};
      state.sessions.forEach(s => { const k = s.date + '|' + s.slot; (g[k] = g[k] || new Set()).add(s.channel); });
      return k => g[k] && g[k].size > 1;
    }
    function computeAll() {
      const isOverlap = overlapIds();
      return state.sessions.map(s => {
        const overlap = isOverlap(s.date + '|' + s.slot);
        const gross = s.grossLiveGmv, aff = s.affiliateGmv, pending = s.pendingRecGmv, cancel = s.cancelReturnGmv;
        const dedup = overlap ? round100k(aff * 0.35) : 0; // đơn Affiliate xuất hiện ở cả 2 kênh chồng giờ chỉ tính 1 lần
        const kpiGmv = Math.max(0, gross + aff - pending - cancel - dedup);
        const manual = !!(s.isManualKpi && (s.manualKpiType === 'CAMPAIGN' || s.manualKpiType === 'MEGA_LIVE'));

        // Tính toán chi tiết từng ca live (multi-shift) nếu phiên có chia ca
        const totGrossAff = Math.max(1, gross + aff);
        const recRatio = Math.max(0, Math.min(1, kpiGmv / totGrossAff));
        const hasShifts = Array.isArray(s.shifts) && s.shifts.length > 0;
        const computedShifts = hasShifts ? s.shifts.map(sh => {
          const shiftGmv = Number(sh.shiftGmv) || 0;
          // Tự động trừ theo KPIs theo số GMV sau khi hoàn 15 ngày nếu Admin đã điền
          const hasPostReturn15d = (sh.postReturn15dGmv !== undefined && sh.postReturn15dGmv !== null && sh.postReturn15dGmv !== '' && Number(sh.postReturn15dGmv) >= 0);
          const postReturn15dGmv = hasPostReturn15d ? Number(sh.postReturn15dGmv) : null;
          const shiftRecGmv = hasPostReturn15d ? postReturn15dGmv : Math.round(shiftGmv * recRatio);
          const isApproved = sh.status === 'APPROVED';
          const hostId = sh.hostId || (sh.role === 'HOST' ? sh.userId : null);
          const operatorId = sh.operatorId || (sh.role === 'OPERATOR' ? sh.userId : null);
          const hostComm = hostId ? Math.round(shiftRecGmv * HOST_RATE / 100) : 0;
          const opComm = operatorId ? Math.round(shiftRecGmv * OP_RATE / 100) : 0;
          const comm = (sh.role === 'OPERATOR') ? opComm : ((sh.role === 'HOST') ? hostComm : (hostComm + opComm));
          return {
            ...sh,
            hostId,
            operatorId,
            shiftGmv,
            postReturn15dGmv,
            hasPostReturn15d,
            recGmv: shiftRecGmv,
            hostComm,
            opComm,
            comm,
            isApproved
          };
        }) : [];

        // Nếu có ca live, hoa hồng phiên = tổng hoa hồng các ca ĐÃ DUYỆT (approved)
        // Nếu không có ca live, hoa hồng = phân công trực tiếp Host & Op của phiên
        let hostComm = 0, opComm = 0;
        if (!manual) {
          if (hasShifts) {
            hostComm = computedShifts.filter(sh => sh.isApproved && sh.hostId).reduce((a, b) => a + b.hostComm, 0);
            opComm = computedShifts.filter(sh => sh.isApproved && sh.operatorId).reduce((a, b) => a + b.opComm, 0);
          } else {
            hostComm = s.hostId ? Math.round(kpiGmv * HOST_RATE / 100) : 0;
            opComm = s.operatorId ? Math.round(kpiGmv * OP_RATE / 100) : 0;
          }
        }

        const shiftReportStatus = s.shiftReportStatus || (hasShifts ? (computedShifts.every(x => x.isApproved) ? 'APPROVED' : 'PENDING') : 'NONE');

        return {
          ...s,
          overlap,
          dedup,
          kpiGmv,
          manual,
          shifts: computedShifts,
          hasShifts,
          shiftReportStatus,
          hostComm,
          opComm,
          age: diffDays(s.date, TODAY)
        };
      });
    }
    function getCurrentMonthRange(ref = TODAY) {
      const [y, m] = ref.split('-').map(Number);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        start,
        end,
        monthStr: `${y}-${String(m).padStart(2, '0')}`,
        monthNum: m,
        yearNum: y,
        label: `Tháng ${m}/${y}`,
        fullLabel: `01/${String(m).padStart(2, '0')}/${y} → ${String(lastDay).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
      };
    }

    function filteredMonthSessions() {
      const mRange = getCurrentMonthRange(TODAY);
      const ch = document.getElementById('fChannel')?.value || 'ALL';
      const rawSt = document.getElementById('fStaff')?.value || 'ALL';
      const admin = isAdmin();
      const myId = me()?.id;
      const st = !admin ? (myId || rawSt) : rawSt;

      return computeAll().filter(s => {
        if (s.date < mRange.start || s.date > mRange.end) return false;
        if (ch !== 'ALL' && s.channel !== ch) return false;

        if (!admin) {
          return s.hostId === myId || s.operatorId === myId ||
            (s.shifts && s.shifts.some(sh => sh.userId === myId || sh.hostId === myId || sh.operatorId === myId)) ||
            (s.manualStaff && s.manualStaff.some(ms => ms.userId === myId || ms.hostId === myId || ms.operatorId === myId));
        }

        return (st === 'ALL' || s.hostId === st || s.operatorId === st ||
          (s.shifts && s.shifts.some(sh => sh.userId === st || sh.hostId === st || sh.operatorId === st)) ||
          (s.manualStaff && s.manualStaff.some(ms => ms.userId === st || ms.hostId === st || ms.operatorId === st)));
      }).sort((a, b) => (b.date + b.slot).localeCompare(a.date + a.slot));
    }

    function filteredSessions() {
      const ch = document.getElementById('fChannel')?.value || 'ALL';
      const rawSt = document.getElementById('fStaff')?.value || 'ALL';
      const admin = isAdmin();
      const myId = me()?.id;
      const st = !admin ? (myId || rawSt) : rawSt;

      return computeAll().filter(s => {
        if (s.date < state.from || s.date > state.to) return false;
        if (ch !== 'ALL' && s.channel !== ch) return false;

        if (!admin) {
          const isMySession = s.hostId === myId || s.operatorId === myId ||
            (s.shifts && s.shifts.some(sh => sh.userId === myId || sh.hostId === myId || sh.operatorId === myId)) ||
            (s.manualStaff && s.manualStaff.some(ms => ms.userId === myId || ms.hostId === myId || ms.operatorId === myId));

          if (isMySession) return true;

          // Cho phép Host/Op nhìn thấy các phiên chưa phân công để có thể nhận ca live
          const myRole = me()?.role;
          if (myRole === 'HOST' && !s.hostId && !s.hasShifts && !s.isManualKpi) return true;
          if (myRole === 'OPERATOR' && !s.operatorId && !s.hasShifts && !s.isManualKpi) return true;

          return false;
        }

        return (st === 'ALL' || s.hostId === st || s.operatorId === st ||
          (s.shifts && s.shifts.some(sh => sh.userId === st || sh.hostId === st || sh.operatorId === st)) ||
          (s.manualStaff && s.manualStaff.some(ms => ms.userId === st || ms.hostId === st || ms.operatorId === st)));
      }).sort((a, b) => (b.date + b.slot).localeCompare(a.date + a.slot));
    }

    /* ---------- 8. Phân trang premium ---------- */
    const RENDERERS = { ses: () => renderSessions(), ord: () => renderOrders(), shopOrd: () => renderShopOrders(), ret: () => renderReturns15d(), acc: () => renderAccounts(), stf: () => renderStaffKpi(), dis: () => renderDisciplineTab() };
    function goPage(key, p) { pages[key] = Math.max(1, p); RENDERERS[key](); }
    function setPageSize(key, v) { pageSizes[key] = Number(v); pages[key] = 1; RENDERERS[key](); }
    function paginate(key, list) {
      const size = pageSizes[key], total = list.length, n = Math.max(1, Math.ceil(total / size));
      if (pages[key] > n) pages[key] = n;
      const p = pages[key], start = (p - 1) * size;
      return { rows: list.slice(start, start + size), total, n, p, from: total ? start + 1 : 0, to: Math.min(total, start + size) };
    }
    function pagerHtml(key, pg) {
      const nums = [];
      for (let i = 1; i <= pg.n; i++) { if (i === 1 || i === pg.n || Math.abs(i - pg.p) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…'); }
      return `<div class="pager">
        <button type="button" class="pg" ${pg.p <= 1 ? 'disabled' : ''} onclick="goPage('${key}', ${pg.p - 1})" aria-label="Trang trước">${ic('chevL', 15)}</button>
        ${nums.map(x => x === '…' ? '<span class="pg-gap">…</span>' : `<button type="button" class="pg num ${x === pg.p ? 'active' : ''}" onclick="goPage('${key}', ${x})">${x}</button>`).join('')}
        <button type="button" class="pg" ${pg.p >= pg.n ? 'disabled' : ''} onclick="goPage('${key}', ${pg.p + 1})" aria-label="Trang sau">${ic('chevR', 15)}</button>
        <select class="pg-size" onchange="setPageSize('${key}', this.value)" aria-label="Số dòng mỗi trang">${[5, 10, 20, 50, 100].map(v => `<option value="${v}" ${v === pageSizes[key] ? 'selected' : ''}>${v} / trang</option>`).join('')}</select>
        <span class="muted pg-go-lbl" style="font-size:12px;margin-left:4px;">Đến</span>
        <input class="pg-go num" type="number" min="1" max="${pg.n}" value="${pg.p}" onchange="goPage('${key}', Math.min(${pg.n}, Number(this.value) || 1))" aria-label="Đến trang" />
      </div>`;
    }



