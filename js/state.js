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
        preset: 'TODAY', from: TODAY, to: TODAY,
        staffMonth: TODAY ? TODAY.slice(0, 7) : '2026-10',
        lastSync: '', lastDailyScan: '',
        users: [],
        sessions: [], orders: [],
        affiliateDaily: [], lastAffiliateSync: '',
        lastOrderSync: '',
        automation: {
          liveRefreshEnabled: true,
          dailySyncEnabled: true,
          lastDailySyncAt: ''
        },
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
        exportSheets: ['KPI', 'STAFF', 'SESSIONS', 'ORDERS', 'SHOP_ORDERS', 'RETURNS_15D', 'MANUAL'],
        tbCollapsed: false,
        editingSessions: {},
        targetCelebrated: {}
      };
    }

    let state = defaultState();
    let currentTab = 'TAB_OVERVIEW';
    let accFilter = 'ALL';
    let ovStaffActive = '';
    let tiktokApiStatus = null;
    let tiktokApiStatusLoading = false;
    const pages = { ses: 1, ord: 1, shopOrd: 1, ret: 1, acc: 1, stf: 1 };
    const pageSizes = { ses: 10, ord: 10, shopOrd: 10, ret: 10, acc: 10, stf: 10 };

    function loadState() {
      // Firestore is the production source of truth. Start empty until auth resolves.
      state = defaultState();
    }

    function saveState() {
      if (typeof queueProductionStateSave === 'function') queueProductionStateSave();
    }

    /* ---------- Helper lấy thông tin GMV Affiliate của phiên (tự động từ phiên LIVE & Affiliate Daily) ---------- */
    function getSessionAffiliateInfo(s) {
      if (!s) {
        return {
          affiliateGross: 0,
          affiliateRefunded: 0,
          affiliateNet: 0,
          hasManualAffOverride: false,
          source: 'NONE'
        };
      }
      const directAff = Math.max(0, Math.round(Number(s.affiliateGmv) || 0));
      const dayEntry = (typeof state !== 'undefined' && Array.isArray(state?.affiliateDaily))
        ? state.affiliateDaily.find(d => d && d.date === s.date && d.channel === s.channel)
        : null;
      const dayAffGmv = dayEntry ? Math.max(0, Math.round(Number(dayEntry.gmv) || Number(dayEntry.liveGmv) || 0)) : 0;
      const dayAffRefund = dayEntry ? Math.max(0, Math.round(Number(dayEntry.refundedGmv) || 0)) : 0;

      let shareRatio = 1;
      let isLargestOnDay = true;
      let roundingDiffGmv = 0;
      let roundingDiffRefund = 0;
      if (dayEntry && typeof state !== 'undefined' && Array.isArray(state?.sessions)) {
        const sameDaySessions = state.sessions.filter(x => x && x.date === s.date && x.channel === s.channel);
        if (sameDaySessions.length > 1) {
          const totalDayLiveGross = sameDaySessions.reduce((acc, x) => acc + (Number(x.grossLiveGmv) || 0), 0);
          const weights = sameDaySessions.map(x => totalDayLiveGross > 0 ? ((Number(x.grossLiveGmv) || 0) / totalDayLiveGross) : (1 / sameDaySessions.length));
          const myIdx = sameDaySessions.findIndex(x => x.id === s.id);
          if (myIdx >= 0) {
            shareRatio = weights[myIdx];
            let maxIdx = 0;
            for (let i = 1; i < sameDaySessions.length; i++) {
              if ((Number(sameDaySessions[i].grossLiveGmv) || 0) > (Number(sameDaySessions[maxIdx].grossLiveGmv) || 0)) maxIdx = i;
            }
            isLargestOnDay = (myIdx === maxIdx);
            if (isLargestOnDay) {
              const sumGmvRounded = weights.reduce((acc, w) => acc + Math.round(dayAffGmv * w), 0);
              roundingDiffGmv = dayAffGmv - sumGmvRounded;
              const sumRefRounded = weights.reduce((acc, w) => acc + Math.round(dayAffRefund * w), 0);
              roundingDiffRefund = dayAffRefund - sumRefRounded;
            }
          }
        }
      }

      let affiliateGross = 0;
      let source = 'NONE';
      if (directAff > 0) {
        affiliateGross = directAff;
        source = 'LIVE_SESSION';
      } else if (dayAffGmv > 0) {
        affiliateGross = Math.max(0, Math.round(dayAffGmv * shareRatio) + (isLargestOnDay ? roundingDiffGmv : 0));
        source = 'AFFILIATE_DAILY';
      }

      let affiliateRefunded = 0;
      if (s.affiliateRefundGmv !== undefined && s.affiliateRefundGmv !== null && Number.isFinite(Number(s.affiliateRefundGmv))) {
        affiliateRefunded = Math.min(affiliateGross, Math.max(0, Math.round(Number(s.affiliateRefundGmv))));
      } else if (dayAffRefund > 0 && affiliateGross > 0) {
        if (source === 'AFFILIATE_DAILY') {
          affiliateRefunded = Math.min(affiliateGross, Math.max(0, Math.round(dayAffRefund * shareRatio) + (isLargestOnDay ? roundingDiffRefund : 0)));
        } else if (dayAffGmv > 0) {
          affiliateRefunded = Math.min(affiliateGross, Math.max(0, Math.round(affiliateGross * (dayAffRefund / dayAffGmv))));
        }
      }

      const affiliateNet = Math.max(0, affiliateGross - affiliateRefunded);
      return {
        affiliateGross,
        affiliateRefunded,
        affiliateNet,
        hasManualAffOverride: false,
        source
      };
    }

    /* ---------- Helper tính hạn mức tối đa GMV khi Host điền doanh số ca live ---------- */
    // Khống chế không được vượt quá số tiền GMV + Affiliate đã ghi nhận hoặc GMV đã được đối soát rồi
    function getSessionMaxGmvCap(s) {
      if (!s) return { cap: 0, grossWithAff: 0, liveGross: 0, affiliateGross: 0, reconciledGmv: 0, isReconciled: false, label: '0\u00A0₫', desc: '0\u00A0₫' };
      const gross = Number(s.grossLiveGmv) || 0;
      const affInfo = getSessionAffiliateInfo(s);
      const aff = affInfo.affiliateGross;
      const grossWithAff = gross + aff;
      const recInfo = getManualSessionReconcileInfo(s);
      const reconciledGmv = Number(s.kpiGmv) || recInfo.realGmv || 0;

      const isReconciled = isSessionReconciled(s);
      if (isReconciled && !s.isManualKpi) {
        return {
          cap: reconciledGmv,
          grossWithAff,
          liveGross: gross,
          affiliateGross: aff,
          reconciledGmv,
          isReconciled: true,
          label: 'GMV đã đối soát',
          desc: `GMV đã đối soát (${vnd(reconciledGmv)})`
        };
      }

      // Phiên thủ công hoặc chưa hoàn tất đối soát: cho phép nhập theo trần GMV gốc (LIVE + Affiliate) để sau đó đối soát và chia trừ vênh
      const cap = Math.max(grossWithAff, reconciledGmv);
      return {
        cap,
        grossWithAff,
        liveGross: gross,
        affiliateGross: aff,
        reconciledGmv,
        isReconciled,
        label: aff > 0 ? 'Tổng GMV (LIVE + Affiliate)' : (isReconciled ? 'Tổng GMV phiên (trước trừ vênh)' : 'Tổng GMV phiên LIVE'),
        desc: aff > 0 ? `Tổng GMV LIVE + Affiliate (${vnd(cap)})` : `Tổng GMV phiên LIVE (${vnd(cap)})`
      };
    }

    /* ---------- Helper đối soát GMV thực & chia trừ độ vênh cho phiên KPI thủ công ---------- */
    function getManualSessionReconcileInfo(s) {
      if (!s) {
        return {
          liveGross: 0, affiliateGross: 0, affiliateRefunded: 0, affiliateNet: 0,
          hasManualAffOverride: false, affiliateSource: 'NONE', liveCancelReturnGmv: 0,
          sessionGross: 0, cancelReturnGmv: 0, pendingRecGmv: 0, dedup: 0, totalEligible: 0,
          autoReconciledGmv: 0, realGmv: 0, hasManualRealOverride: false,
          isReconciled: false, reconciliationReady: false,
          allocatedGmv: 0, baseAllocatedGmv: 0, approvedAllocatedGmv: 0,
          diffFromGross: 0, diffFromAllocated: 0, diffFromBase: 0,
          isAdjusted: false, reconcileMode: '', hasDiscrepancy: false
        };
      }
      const liveGross = Math.max(0, Math.round(Number(s.grossLiveGmv) || 0));
      const affInfo = getSessionAffiliateInfo(s);
      const affiliateGross = affInfo.affiliateGross;
      const affiliateRefunded = affInfo.affiliateRefunded;
      const affiliateNet = affInfo.affiliateNet;
      const sessionGross = liveGross + affiliateGross;
      const liveCancelReturnGmv = Math.max(0, Number(s.cancelGmv ?? s.cancelReturnGmv) || 0);
      const cancelReturnGmv = liveCancelReturnGmv + affiliateRefunded;
      const pendingRecGmv = Math.max(0, Number(s.pendingRecGmv) || 0);
      const isOverlapFn = typeof overlapIds === 'function' && typeof state !== 'undefined' && Array.isArray(state?.sessions) ? overlapIds() : () => false;
      const overlap = s.overlap !== undefined ? Boolean(s.overlap) : Boolean(isOverlapFn(s.date + '|' + s.slot));
      const dedup = s.dedup !== undefined ? (Number(s.dedup) || 0) : (overlap ? round100k(affiliateGross * 0.35) : 0);
      const totalEligible = Math.max(0, sessionGross - cancelReturnGmv - dedup);
      const recReady = sessionReconciliationReady(s);
      const isReconciled = isSessionReconciled(s);

      const autoReconciledGmv = totalEligible;
      const hasManualRealOverride = false;
      const realGmv = autoReconciledGmv;

      const staffList = Array.isArray(s.manualStaff) ? s.manualStaff : [];
      const allocatedGmv = staffList.reduce((acc, ms) => acc + (Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0), 0);
      const baseAllocatedGmv = staffList.reduce((acc, ms) => {
        const cur = Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0;
        const base = ms.baseShiftGmv !== undefined && ms.baseShiftGmv !== null ? Number(ms.baseShiftGmv) : cur;
        return acc + (Number.isFinite(base) ? base : cur);
      }, 0);
      const approvedAllocatedGmv = staffList
        .filter(ms => (ms.status || 'APPROVED') === 'APPROVED')
        .reduce((acc, ms) => acc + (Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0), 0);

      const isAdjusted = staffList.some(ms => ms.baseShiftGmv !== undefined && ms.baseShiftGmv !== null && Number(ms.baseShiftGmv) !== Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv));
      const reconcileMode = s.manualReconcileMode || (staffList.find(ms => ms.reconcileMode)?.reconcileMode) || '';

      const diffFromGross = realGmv - sessionGross;
      const diffFromAllocated = staffList.length > 0 ? (realGmv - allocatedGmv) : diffFromGross;
      const diffFromBase = staffList.length > 0 ? (realGmv - baseAllocatedGmv) : diffFromGross;
      const hasDiscrepancy = diffFromAllocated !== 0 || diffFromGross !== 0 || diffFromBase !== 0;

      return {
        liveGross,
        affiliateGross,
        affiliateRefunded,
        affiliateNet,
        hasManualAffOverride: affInfo.hasManualAffOverride,
        affiliateSource: affInfo.source,
        liveCancelReturnGmv,
        sessionGross,
        cancelReturnGmv,
        pendingRecGmv,
        dedup,
        totalEligible,
        autoReconciledGmv,
        realGmv,
        hasManualRealOverride,
        isReconciled,
        reconciliationReady: recReady,
        allocatedGmv,
        baseAllocatedGmv,
        approvedAllocatedGmv,
        diffFromGross,
        diffFromAllocated,
        diffFromBase,
        isAdjusted,
        reconcileMode,
        hasDiscrepancy
      };
    }

    function calculateManualShiftAdjustments(s, mode = 'HOURS', customRealGmv = undefined) {
      const normalizedMode = mode === 'REVENUE' ? 'REVENUE' : 'HOURS';
      const info = getManualSessionReconcileInfo(s);
      const realGmv = (customRealGmv !== undefined && customRealGmv !== null && customRealGmv !== '' && Number.isFinite(Number(customRealGmv)))
        ? Math.max(0, Math.round(Number(customRealGmv)))
        : info.realGmv;
      const staffList = Array.isArray(s?.manualStaff) ? s.manualStaff : [];
      if (!staffList.length) {
        return {
          ok: false, error: 'NO_SHIFTS', mode: normalizedMode,
          sessionGross: info.sessionGross, realGmv, totalBaseGmv: 0, totalCurrentGmv: 0, totalDelta: 0, totalHours: 0, missingHoursCount: 0, items: []
        };
      }

      const rawItems = staffList.map((ms, index) => {
        const currentGmv = Math.max(0, Math.round(Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0));
        const baseGmv = (ms.baseShiftGmv !== undefined && ms.baseShiftGmv !== null && Number.isFinite(Number(ms.baseShiftGmv)))
          ? Math.max(0, Math.round(Number(ms.baseShiftGmv)))
          : currentGmv;
        const liveHours = Math.max(0, Number(ms.liveHours !== undefined ? ms.liveHours : (ms.liveMinutes ? ms.liveMinutes / 60 : 0)) || 0);
        return {
          index,
          id: ms.id || `MS-${index}`,
          hostId: ms.hostId || (ms.role !== 'OPERATOR' ? ms.userId : ''),
          operatorId: ms.operatorId || (ms.role === 'OPERATOR' ? ms.userId : ''),
          isShopOwner: ms.hostId === 'SHOP_OWNER',
          baseGmv,
          currentGmv,
          liveHours
        };
      });

      const totalBaseGmv = rawItems.reduce((sum, it) => sum + it.baseGmv, 0);
      const totalCurrentGmv = rawItems.reduce((sum, it) => sum + it.currentGmv, 0);
      const totalHours = rawItems.reduce((sum, it) => sum + it.liveHours, 0);
      const missingHoursCount = rawItems.filter(it => !it.isShopOwner && it.liveHours <= 0).length;
      const totalDelta = realGmv - totalBaseGmv;

      if (normalizedMode === 'HOURS' && totalHours <= 0) {
        return {
          ok: false, error: 'MISSING_HOURS', mode: normalizedMode,
          sessionGross: info.sessionGross, realGmv, totalBaseGmv, totalCurrentGmv, totalDelta, totalHours: 0, missingHoursCount, items: []
        };
      }

      const n = rawItems.length;
      const weights = rawItems.map(it => {
        if (normalizedMode === 'HOURS') {
          return totalHours > 0 ? (it.liveHours / totalHours) : 0;
        }
        return totalBaseGmv > 0 ? (it.baseGmv / totalBaseGmv) : (1 / n);
      });

      let exactNew = rawItems.map((it, idx) => it.baseGmv + totalDelta * weights[idx]);
      if (realGmv <= 0) {
        exactNew = rawItems.map(() => 0);
      } else if (exactNew.some(v => v < 0)) {
        let locked = exactNew.map(v => v < 0);
        exactNew = exactNew.map(v => Math.max(0, v));
        for (let iter = 0; iter < n; iter++) {
          const currentSum = exactNew.reduce((a, b) => a + b, 0);
          const remDiff = realGmv - currentSum;
          if (Math.abs(remDiff) < 0.001) break;
          const activeWeightSum = weights.reduce((acc, w, idx) => acc + (!locked[idx] && exactNew[idx] > 0 ? w : 0), 0);
          if (activeWeightSum <= 0) {
            const unlockedIdx = exactNew.findIndex((v, idx) => !locked[idx] && v > 0);
            if (unlockedIdx >= 0) exactNew[unlockedIdx] = Math.max(0, exactNew[unlockedIdx] + remDiff);
            break;
          }
          exactNew = exactNew.map((v, idx) => {
            if (locked[idx] || v <= 0) return 0;
            return v + remDiff * (weights[idx] / activeWeightSum);
          });
          if (!exactNew.some(v => v < 0)) break;
          locked = exactNew.map((v, idx) => locked[idx] || v <= 0);
          exactNew = exactNew.map(v => Math.max(0, v));
        }
      }

      const roundedNew = exactNew.map(v => Math.max(0, Math.round(v)));
      const sumRounded = roundedNew.reduce((a, b) => a + b, 0);
      const roundingDiff = realGmv - sumRounded;
      if (roundingDiff !== 0 && roundedNew.length > 0) {
        let targetIdx = 0;
        for (let i = 1; i < roundedNew.length; i++) {
          if (roundedNew[i] >= roundedNew[targetIdx]) targetIdx = i;
        }
        roundedNew[targetIdx] = Math.max(0, roundedNew[targetIdx] + roundingDiff);
      }

      const items = rawItems.map((it, idx) => {
        const newGmv = roundedNew[idx];
        const deltaGmv = newGmv - it.baseGmv;
        const newHostBonus = it.isShopOwner || !it.hostId ? 0 : Math.round(newGmv * (typeof HOST_RATE !== 'undefined' ? HOST_RATE / 100 : 0.003));
        const newOpBonus = it.operatorId ? Math.round(newGmv * (typeof OP_RATE !== 'undefined' ? OP_RATE / 100 : 0.001)) : 0;
        return {
          ...it,
          weight: weights[idx],
          weightPct: Math.round(weights[idx] * 1000) / 10,
          deltaGmv,
          newGmv,
          newHostBonus,
          newOpBonus,
          newTotalBonus: newHostBonus + newOpBonus
        };
      });

      return {
        ok: true,
        error: null,
        mode: normalizedMode,
        sessionGross: info.sessionGross,
        realGmv,
        totalBaseGmv,
        totalCurrentGmv,
        totalDelta,
        totalHours,
        missingHoursCount,
        items
      };
    }

    /* ---------- Helper tính đóng góp KPI phiên thủ công (Campaign / Mega Live theo cặp · Sau hoàn hủy) ---------- */
    function getEffectiveManualStaff(s) {
      if (!s || !Array.isArray(s.manualStaff) || !s.manualStaff.length) return [];
      const rec = getManualSessionReconcileInfo(s);
      const staffList = s.manualStaff;

      if (rec.isAdjusted && rec.diffFromAllocated === 0) {
        return staffList.map((ms, index) => {
          const curGmv = Math.max(0, Math.round(Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0));
          const baseGmv = (ms.baseShiftGmv !== undefined && ms.baseShiftGmv !== null && Number.isFinite(Number(ms.baseShiftGmv)))
            ? Math.max(0, Math.round(Number(ms.baseShiftGmv)))
            : curGmv;
          const deltaGmv = curGmv - baseGmv;
          const cancelGmv = Math.max(0, baseGmv - curGmv);
          const isShopOwner = ms.hostId === 'SHOP_OWNER';
          const hostBonus = isShopOwner || (!ms.hostId && ms.role === 'OPERATOR') ? 0 : (Number(ms.hostBonus !== undefined ? ms.hostBonus : (ms.role === 'HOST' ? ms.bonus : Math.round(curGmv * 0.003))) || 0);
          const opBonus = Number(ms.opBonus !== undefined ? ms.opBonus : (ms.role === 'OPERATOR' ? ms.bonus : (ms.operatorId ? Math.round(curGmv * 0.001) : 0))) || 0;
          return {
            ...ms,
            index,
            baseGmv,
            effectiveGmv: curGmv,
            deltaGmv,
            cancelGmv,
            effectiveHostBonus: hostBonus,
            effectiveOpBonus: opBonus,
            effectiveTotalBonus: hostBonus + opBonus
          };
        });
      }

      const needsAutoAdjust = rec.baseAllocatedGmv > 0 && (
        rec.realGmv < rec.baseAllocatedGmv ||
        rec.isAdjusted ||
        rec.hasManualRealOverride ||
        (rec.sessionGross > 0 && Math.abs(rec.baseAllocatedGmv - rec.sessionGross) <= 1000 && rec.realGmv !== rec.baseAllocatedGmv)
      );

      if (needsAutoAdjust) {
        let calc = calculateManualShiftAdjustments(s, 'HOURS', rec.realGmv);
        if (!calc.ok) {
          calc = calculateManualShiftAdjustments(s, 'REVENUE', rec.realGmv);
        }
        if (calc.ok && calc.items.length === staffList.length) {
          return staffList.map((ms, index) => {
            const it = calc.items[index];
            return {
              ...ms,
              index,
              baseGmv: it.baseGmv,
              effectiveGmv: it.newGmv,
              deltaGmv: it.deltaGmv,
              cancelGmv: Math.max(0, it.baseGmv - it.newGmv),
              effectiveHostBonus: it.newHostBonus,
              effectiveOpBonus: it.newOpBonus,
              effectiveTotalBonus: it.newTotalBonus
            };
          });
        }
      }

      const partialRatio = (rec.sessionGross > 0 && rec.realGmv < rec.sessionGross)
        ? Math.max(0, Math.min(1, rec.realGmv / rec.sessionGross))
        : 1;

      return staffList.map((ms, index) => {
        const curGmv = Math.max(0, Math.round(Number(ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv) || 0));
        const baseGmv = (ms.baseShiftGmv !== undefined && ms.baseShiftGmv !== null && Number.isFinite(Number(ms.baseShiftGmv)))
          ? Math.max(0, Math.round(Number(ms.baseShiftGmv)))
          : curGmv;
        const effectiveGmv = partialRatio < 1 ? Math.round(baseGmv * partialRatio) : curGmv;
        const deltaGmv = effectiveGmv - baseGmv;
        const cancelGmv = Math.max(0, baseGmv - effectiveGmv);
        const isShopOwner = ms.hostId === 'SHOP_OWNER';
        const hostBonus = isShopOwner || (!ms.hostId && ms.role === 'OPERATOR')
          ? 0
          : (partialRatio < 1
            ? Math.round(effectiveGmv * 0.003)
            : (Number(ms.hostBonus !== undefined ? ms.hostBonus : (ms.role === 'HOST' ? ms.bonus : Math.round(effectiveGmv * 0.003))) || 0));
        const opBonus = partialRatio < 1
          ? (ms.operatorId || ms.role === 'OPERATOR' ? Math.round(effectiveGmv * 0.001) : 0)
          : (Number(ms.opBonus !== undefined ? ms.opBonus : (ms.role === 'OPERATOR' ? ms.bonus : (ms.operatorId ? Math.round(effectiveGmv * 0.001) : 0))) || 0);
        return {
          ...ms,
          index,
          baseGmv,
          effectiveGmv,
          deltaGmv,
          cancelGmv,
          effectiveHostBonus: hostBonus,
          effectiveOpBonus: opBonus,
          effectiveTotalBonus: hostBonus + opBonus
        };
      });
    }

    function getStaffManualContribution(s, userId, onlyApproved = true) {
      if (!s || !s.isManualKpi || !Array.isArray(s.manualStaff)) {
        return { gmv: 0, baseGmv: 0, cancelGmv: 0, bonus: 0, count: 0, pendingGmv: 0, pendingBonus: 0 };
      }
      let gmv = 0, baseGmv = 0, cancelGmv = 0, bonus = 0, count = 0, pendingGmv = 0, pendingBonus = 0;
      const effectiveStaff = getEffectiveManualStaff(s);
      effectiveStaff.forEach(ms => {
        const isApproved = (ms.status || 'APPROVED') === 'APPROVED';

        // Host trong cặp HOẶC legacy entry Host HOẶC standalone Host
        const isHost = (ms.hostId === userId) || (!ms.hostId && ms.userId === userId && ms.role === 'HOST') || (ms.userId === userId && !ms.operatorId && !ms.hostId && ms.role !== 'OPERATOR');
        // Operator trong cặp HOẶC legacy entry Operator
        const isOp = (ms.operatorId === userId) || (!ms.operatorId && ms.userId === userId && ms.role === 'OPERATOR');

        if (isHost) {
          const curGmv = ms.effectiveGmv;
          const curBase = ms.baseGmv;
          const curCancel = ms.cancelGmv;
          const curBonus = ms.effectiveHostBonus;
          if (isApproved) {
            gmv += curGmv;
            baseGmv += curBase;
            cancelGmv += curCancel;
            bonus += curBonus;
            count++;
          } else {
            pendingGmv += curGmv;
            pendingBonus += curBonus;
          }
        } else if (isOp) {
          const curGmv = ms.effectiveGmv;
          const curBase = ms.baseGmv;
          const curCancel = ms.cancelGmv;
          const curBonus = ms.effectiveOpBonus;
          if (isApproved) {
            gmv += curGmv;
            baseGmv += curBase;
            cancelGmv += curCancel;
            bonus += curBonus;
            count++;
          } else {
            pendingGmv += curGmv;
            pendingBonus += curBonus;
          }
        }
      });
      return { gmv, baseGmv, cancelGmv, bonus, count, pendingGmv, pendingBonus };
    }

    function recalculateSessionManualBonus(s) {
      if (!s || !Array.isArray(s.manualStaff)) return 0;
      const effectiveStaff = getEffectiveManualStaff(s);
      const approvedItems = effectiveStaff.filter(ms => (ms.status || 'APPROVED') === 'APPROVED');
      const total = approvedItems.reduce((acc, ms) => acc + (Number(ms.effectiveTotalBonus) || 0), 0);
      s.manualKpiBonus = total;
      return total;
    }

    function renderManualStaffBadges(s) {
      const allStaff = getEffectiveManualStaff(s);
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
              const shiftGmv = Number(ms.effectiveGmv !== undefined ? ms.effectiveGmv : (ms.shiftGmv !== undefined ? ms.shiftGmv : ms.personalGmv)) || 0;
              const isSelfOp = !ms.operatorId && ms.role !== 'OPERATOR' && ms.hostId;
              const deltaHint = ms.deltaGmv ? ` (Gốc: ${short(ms.baseGmv)} · ĐS: ${ms.deltaGmv > 0 ? '+' : ''}${short(ms.deltaGmv)})` : '';

              if (ms.hostId || ms.operatorId !== undefined) {
                return `
                  <span class="pill ${isApproved ? 'p-pink' : 'p-amber'}" style="font-size:10px;height:24px;padding:0 7px;gap:4px;" title="${esc((ms.note || '') + deltaHint)}">
                    <span>🎤 <strong>${ms.hostId === 'SHOP_OWNER' ? '👑 Shop' : (hostUser ? esc(hostUser.name) : 'Host')}</strong>${opUser ? ` + 🎧 ${esc(opUser.name)}` : (isSelfOp ? ' <em>(Tự Op)</em>' : '')}</span>
                    <span class="num">: ${short(shiftGmv)}</span>
                    ${!isApproved ? '<span style="color:#D97706;font-weight:800;">[Chờ duyệt]</span>' : ''}
                  </span>
                `;
              }

              const u = userById(ms.userId);
              const isH = ms.role === 'HOST';
              return `
                <span class="pill ${isH ? 'p-pink' : 'p-violet'}" style="font-size:10px;height:24px;padding:0 7px;" title="${esc((ms.note || '') + deltaHint)}">
                  ${isH ? '🎤' : '🎧'} <strong>${u ? esc(u.name) : 'NV'}</strong>: ${short(shiftGmv)} (${short(ms.effectiveTotalBonus ?? ms.bonus)})
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
    function sessionReconciliationReady(s) {
      return Boolean(s?.endedAt && (s.orderSync?.verified === true || s.orderReconciliationManaged === true || (s.orderSync?.matchedOrders > 0 && Number(s.orderSync?.deliveredGmv) > 0) || s.status === 'RECONCILED'));
    }
    function isSessionReconciled(s) {
      return sessionReconciliationReady(s) && Number(s.pendingRecGmv) <= 0;
    }
    function overlapIds() {
      const g = {};
      state.sessions.forEach(s => { const k = s.date + '|' + s.slot; (g[k] = g[k] || new Set()).add(s.channel); });
      return k => g[k] && g[k].size > 1;
    }
    function computeAll() {
      const isOverlap = overlapIds();
      return state.sessions.map(s => {
        if (s.manualRealGmv !== undefined) delete s.manualRealGmv;
        if (s.manualAffiliateGmv !== undefined) delete s.manualAffiliateGmv;
        const overlap = isOverlap(s.date + '|' + s.slot);
        const gross = Number(s.grossLiveGmv) || 0;
        const affInfo = getSessionAffiliateInfo(s);
        const aff = affInfo.affiliateGross;
        // Đơn hủy (khách hủy / chưa nhận hàng) trừ đi; chỉ lấy số đơn đã nhận và giao thành công
        // Đối với đơn đã nhận và trong 15 ngày khách hủy mới không trừ KPI
        const liveCancel = Math.max(0, Number(s.cancelGmv ?? s.cancelReturnGmv) || 0);
        const cancel = liveCancel + affInfo.affiliateRefunded;
        const dedup = overlap ? round100k(aff * 0.35) : 0; // đơn Affiliate xuất hiện ở cả 2 kênh chồng giờ chỉ tính 1 lần
        const pending = Math.max(0, Number(s.pendingRecGmv) || 0);
        const totalEligible = Math.max(0, gross + aff - cancel - dedup);
        const deliveredGmv = (s.orderSync?.matchedOrders > 0 && Number(s.orderSync?.deliveredGmv) === 0)
          ? 0
          : Math.max(0, Math.min(totalEligible, totalEligible - pending));
        const kpiGmv = isSessionReconciled(s) ? totalEligible : (sessionReconciliationReady(s) ? deliveredGmv : 0);
        const manual = !!(s.isManualKpi && (s.manualKpiType === 'CAMPAIGN' || s.manualKpiType === 'MEGA_LIVE' || s.manualKpiType === 'NORMAL_MULTI'));

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
        let hostComm = 0, opComm = 0, manualHostComm = 0, manualOpComm = 0;
        let manualKpiBonus = Number(s.manualKpiBonus) || 0;
        if (!manual) {
          if (hasShifts) {
            hostComm = computedShifts.filter(sh => sh.isApproved && sh.hostId).reduce((a, b) => a + b.hostComm, 0);
            opComm = computedShifts.filter(sh => sh.isApproved && sh.operatorId).reduce((a, b) => a + b.opComm, 0);
          } else {
            hostComm = (s.hostId && s.hostId !== 'SHOP_OWNER' && s.manualKpiType !== 'SHOP_OWNER') ? Math.round(kpiGmv * HOST_RATE / 100) : 0;
            opComm = s.operatorId ? Math.round(kpiGmv * OP_RATE / 100) : 0;
          }
        } else if (Array.isArray(s.manualStaff) && s.manualStaff.length > 0) {
          const effApproved = getEffectiveManualStaff(s).filter(ms => (ms.status || 'APPROVED') === 'APPROVED');
          manualHostComm = effApproved.reduce((a, ms) => a + (Number(ms.effectiveHostBonus) || 0), 0);
          manualOpComm = effApproved.reduce((a, ms) => a + (Number(ms.effectiveOpBonus) || 0), 0);
          manualKpiBonus = manualHostComm + manualOpComm;
        }

        const shiftReportStatus = s.shiftReportStatus || (hasShifts ? (computedShifts.every(x => x.isApproved) ? 'APPROVED' : 'PENDING') : 'NONE');

        const sessionGrossGmv = (gross + aff) || Number(s.tiktokReportedGmv) || Number(s.creatorReportedGmv) || Number(kpiGmv) || 0;
        return {
          ...s,
          affiliateGmv: aff,
          affiliateRefundedGmv: affInfo.affiliateRefunded,
          affiliateNetGmv: affInfo.affiliateNet,
          liveCancelReturnGmv: liveCancel,
          gmv: sessionGrossGmv,
          cancelReturnGmv: cancel,
          overlap,
          dedup,
          kpiGmv,
          manual,
          manualHostComm,
          manualOpComm,
          manualKpiBonus,
          shifts: computedShifts,
          hasShifts,
          shiftReportStatus,
          hostComm,
          opComm,
          age: diffDays(s.date, TODAY)
        };
      });
    }
    function getCurrentMonthRange(ref = (typeof state !== 'undefined' && state?.staffMonth ? state.staffMonth : TODAY)) {
      const ym = String(ref || TODAY).slice(0, 7);
      const [y, m] = ym.split('-').map(Number);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        start,
        end,
        monthStr: ym,
        monthNum: m,
        yearNum: y,
        label: `Tháng ${m}/${y}`,
        fullLabel: `01/${String(m).padStart(2, '0')}/${y} → ${String(lastDay).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
      };
    }

    function filteredMonthSessions() {
      const mRange = getCurrentMonthRange(typeof state !== 'undefined' && state?.staffMonth ? state.staffMonth : TODAY);
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
    const RENDERERS = { ses: () => renderSessions(), ord: () => renderOrders(), shopOrd: () => renderShopOrders(), ret: () => renderReturns15d(), acc: () => renderAccounts(), stf: () => renderStaffKpi() };
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



