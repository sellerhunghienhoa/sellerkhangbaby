/**
 * TikTok Shop Live GMV & KPI Center - Utility Functions & Icons
 */

    /* ---------- 1. Icon set (stroke icons) ---------- */
    const ICONS = {
      home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
      video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
      box: '<path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
      link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
      db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
      users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
      menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
      search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.6" y2="16.6"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
      chevR: '<polyline points="9 18 15 12 9 6"/>', chevL: '<polyline points="15 18 9 12 15 6"/>',
      x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="1.6"/><line x1="12" y1="12.6" x2="12" y2="15"/>',
      arrowR: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
      dots: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
      bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
      trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
      refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
      check: '<polyline points="20 6 9 17 4 12"/>',
      truck: '<rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
      target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
      trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
      bars: '<line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="9"/>',
      pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
      plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
      info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
      alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
      lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.2.4 1.5 1.5 2.7 2.5 2.7z"/>',
      cloud: '<path d="M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
      github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.4 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.6 16 2.5a13.4 13.4 0 0 0-7 0C6.3.6 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-.9 2.6V22"/>',
      send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
      store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2"/>',
      sparkle: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
      heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'
    };
    function ic(name, s = 18) {
      return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    }
    function hydrateIcons(root = document) {
      root.querySelectorAll('i[data-ic]').forEach(el => { el.outerHTML = ic(el.dataset.ic, Number(el.dataset.s) || 18); });
    }


    function toDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
    function toIso(dt) { return dt.toISOString().slice(0, 10); }
    function addDays(iso, n) { const d = toDate(iso); d.setUTCDate(d.getUTCDate() + n); return toIso(d); }
    function diffDays(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000); }
    function fmtD(iso) { const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
    function fmtDs(iso) { const p = iso.split('-'); return `${p[2]}/${p[1]}`; }
    function vnd(n) { return Math.round(Number(n) || 0).toLocaleString('vi-VN') + '\u00A0₫'; }

    function slotDurationMinutes(slot) {
      const times = String(slot || '').match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g) || [];
      if (times.length < 2) return 0;
      const toMinutes = value => {
        const [hour, minute] = value.split(':').map(Number);
        return hour * 60 + minute;
      };
      const start = toMinutes(times[0]);
      let end = toMinutes(times[1]);
      if (end < start) end += 24 * 60;
      return Math.max(0, Math.min(24 * 60, end - start));
    }

    function sessionDurationMinutes(session, now = Date.now()) {
      if (!session) return 0;
      const startedAt = Date.parse(session.startedAt || '');
      if (Number.isFinite(startedAt)) {
        const endedAt = Date.parse(session.endedAt || '');
        const isActiveToday = !session.endedAt && session.date === TODAY;
        const finish = Number.isFinite(endedAt) ? endedAt : (isActiveToday ? now : NaN);
        if (Number.isFinite(finish) && finish >= startedAt) {
          return Math.max(0, Math.min(24 * 60, Math.round((finish - startedAt) / 60000)));
        }
      }
      return slotDurationMinutes(session.slot);
    }

    function formatLiveMinutes(minutes) {
      const total = Math.max(0, Math.round(Number(minutes) || 0));
      const hours = Math.floor(total / 60);
      const rest = total % 60;
      if (!hours) return `${rest} phút`;
      return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
    }

    function staffSessionMinutes(session, userId) {
      if (!session || !userId) return 0;
      if (session.hasShifts && Array.isArray(session.shifts)) {
        return getStaffShiftsInSession(session, userId).reduce((total, shift) => {
          return total + (slotDurationMinutes(shift.timeSlot || shift.slot) || sessionDurationMinutes(session));
        }, 0);
      }
      if (session.isManualKpi && Array.isArray(session.manualStaff) && session.manualStaff.length) {
        return session.manualStaff.reduce((total, shift) => {
          const isMine = shift.userId === userId || shift.hostId === userId || shift.operatorId === userId;
          if (!isMine) return total;
          return total + (slotDurationMinutes(shift.timeSlot || shift.slot) || sessionDurationMinutes(session));
        }, 0);
      }
      return session.hostId === userId || session.operatorId === userId ? sessionDurationMinutes(session) : 0;
    }

    function staffRoleLiveMinutes(sessions, user) {
      if (user?.role !== 'HOST') return 0;
      return sessions.reduce((total, session) => total + staffSessionMinutes(session, user.id), 0);
    }

    /* ---------- HÀM XỬ LÝ NHẬP TIỀN TỰ ĐỘNG (HỖ TRỢ 50tr, 184.400.000\u00A0₫, 50m, 500k, 1ty) ---------- */
    function parseVndInput(val) {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      let s = String(val).trim().toLowerCase();
      if (!s) return 0;
      s = s.replace(/₫|đ|vnd|vnđ/g, '').trim();

      const tyMatch = s.match(/^([\d.,]+)\s*(tỷ|ty|b)$/);
      if (tyMatch) {
        const numPart = parseFloat(tyMatch[1].replace(/,/g, '.'));
        return isNaN(numPart) ? 0 : Math.round(numPart * 1000000000);
      }

      const trMatch = s.match(/^([\d.,]+)\s*(triệu|trieu|tr|m)$/);
      if (trMatch) {
        const numPart = parseFloat(trMatch[1].replace(/,/g, '.'));
        return isNaN(numPart) ? 0 : Math.round(numPart * 1000000);
      }

      const kMatch = s.match(/^([\d.,]+)\s*(nghìn|nghin|k)$/);
      if (kMatch) {
        const numPart = parseFloat(kMatch[1].replace(/,/g, '.'));
        return isNaN(numPart) ? 0 : Math.round(numPart * 1000);
      }

      const cleanDigits = s.replace(/[^\d]/g, '');
      const n = parseInt(cleanDigits, 10);
      return isNaN(n) ? 0 : n;
    }

    function formatVndDisplay(num) {
      const n = Math.round(Number(num) || 0);
      if (n <= 0) return '';
      return n.toLocaleString('vi-VN') + '\u00A0₫';
    }

    function handleVndInputEvent(el, previewId) {
      if (!el) return;
      const raw = el.value;
      if (!raw.trim()) {
        const prev = previewId ? document.getElementById(previewId) : null;
        if (prev) { prev.style.display = 'none'; prev.textContent = ''; }
        return;
      }

      const n = parseVndInput(raw);
      const prev = previewId ? document.getElementById(previewId) : null;
      if (prev) {
        if (n > 0) {
          prev.style.display = 'inline-flex';
          prev.textContent = n.toLocaleString('vi-VN') + '\u00A0₫';
        } else {
          prev.style.display = 'none';
        }
      }

      // Tự động nhận diện chữ gõ tắt: 50tr, 50m, 500k, 1ty, 184.4tr...
      const lower = raw.trim().toLowerCase();
      if (/(tr|triệu|trieu|m|k|nghìn|nghin|ty|tỷ|b)$/.test(lower) && n > 0) {
        el.value = n.toLocaleString('vi-VN') + '\u00A0₫';
        toast(`✨ Đã nhận diện số tiền: ${n.toLocaleString('vi-VN')}\u00A0₫`);
        return;
      }

      // Nếu người dùng gõ số thuần túy (ví dụ: gõ 50000000 hoặc 184400000)
      if (/^\d{4,}$/.test(raw.replace(/[.,]/g, '')) && !/[a-zA-Z]/.test(raw) && n >= 1000) {
        el.value = n.toLocaleString('vi-VN');
      }
    }

    function handleVndBlurEvent(el, previewId) {
      if (!el) return;
      const n = parseVndInput(el.value);
      if (n > 0) {
        el.value = n.toLocaleString('vi-VN') + '\u00A0₫';
      } else {
        el.value = '';
      }
      const prev = previewId ? document.getElementById(previewId) : null;
      if (prev) {
        if (n > 0) {
          prev.style.display = 'inline-flex';
          prev.textContent = n.toLocaleString('vi-VN') + '\u00A0₫';
        } else {
          prev.style.display = 'none';
        }
      }
    }

    function handleVndFocusEvent(el) {
      if (!el) return;
      setTimeout(() => {
        try { el.select(); } catch (e) {}
      }, 30);
    }

    function setQuickCurrencyInput(inputId, val, previewId) {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.value = Number(val).toLocaleString('vi-VN') + '\u00A0₫';
      handleVndBlurEvent(el, previewId);
      el.focus();
    }

    function copyGmvToTarget() {
      const gmv = parseVndInput(document.getElementById('inpShiftGmv')?.value);
      if (gmv > 0) {
        setQuickCurrencyInput('inpShiftTarget', gmv, 'previewShiftTarget');
        toast(`Đã gán Target bằng doanh số ca: ${vnd(gmv)}`);
      } else {
        toast('Vui lòng nhập doanh số ca live trước!');
        document.getElementById('inpShiftGmv')?.focus();
      }
    }
    function short(n) {
      const a = Math.abs(n), s = n < 0 ? '-' : '';
      if (a >= 1e9) return s + (a / 1e9).toFixed(2).replace('.', ',') + ' tỷ';
      if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace('.', ',') + ' tr';
      if (a >= 1e3) return s + Math.round(a / 1e3) + 'k';
      return s + Math.round(a) + 'đ';
    }
    function mb(n) { return n >= 1024 ? (n / 1024).toFixed(2).replace('.', ',') + ' GB' : Math.round(n).toLocaleString('vi-VN') + ' MB'; }
    function fmtUnit(v, unit) { return unit === 'bytes' ? formatStorageBytes(v) : unit === 'MB' ? mb(v) : Math.round(v).toLocaleString('vi-VN') + ' ' + unit; }
    function initials(name) { return name.replace(/\(.*?\)/g, '').trim().split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase(); }
    function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    function nowStamp() { return new Date().toTimeString().slice(0, 5); }
    function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(window._tt); window._tt = setTimeout(() => t.classList.remove('show'), 2800); }
    function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

    /* ---------- ANIMATION ENGINE: NUMBER COUNTERS & DYNAMIC DATA SWEEP ---------- */
    const animValCache = new Map();

    function easeOutCubic(x) {
      return 1 - Math.pow(1 - x, 3);
    }

    function formatCountVal(val, format, isFinal = false) {
      if (format === 'pct') {
        return Math.round(val) + '%';
      }
      if (format === 'vnd') {
        return Math.round(val).toLocaleString('vi-VN') + '\u00A0₫';
      }
      if (format === 'short') {
        return short(val);
      }
      if (format === 'signed_short') {
        const v = Math.round(val);
        return (v > 0 ? '-' : '') + short(Math.abs(v));
      }
      if (format === 'signed_vnd') {
        const v = Math.round(val);
        return (v > 0 ? '-' : '') + Math.round(Math.abs(v)).toLocaleString('vi-VN') + '\u00A0₫';
      }
      if (format === 'int') {
        return Math.round(val).toLocaleString('vi-VN');
      }
      return Math.round(val).toLocaleString('vi-VN');
    }

    function animateNumber(el, targetVal, format = 'vnd', duration = 850) {
      if (!el) return;
      const key = el.dataset.animKey || (el.id ? el.id : null);
      const startVal = (key && animValCache.has(key)) ? animValCache.get(key) : 0;

      if (key) animValCache.set(key, targetVal);

      if (startVal === targetVal) {
        el.textContent = formatCountVal(targetVal, format, true);
        return;
      }

      if (el._animRaf) cancelAnimationFrame(el._animRaf);

      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = easeOutCubic(progress);
        const current = startVal + (targetVal - startVal) * ease;

        el.textContent = formatCountVal(current, format, progress === 1);

        if (progress < 1) {
          el._animRaf = requestAnimationFrame(step);
        } else {
          el._animRaf = null;
          el.textContent = formatCountVal(targetVal, format, true);
        }
      }

      el._animRaf = requestAnimationFrame(step);
    }

    function triggerDataCounters(scopeEl = document) {
      if (!scopeEl) scopeEl = document;
      // 1. Numeric text elements
      scopeEl.querySelectorAll('[data-count-to]').forEach(el => {
        const target = parseFloat(el.getAttribute('data-count-to')) || 0;
        const format = el.getAttribute('data-format') || 'vnd';
        const dur = parseInt(el.getAttribute('data-duration')) || 850;
        animateNumber(el, target, format, dur);
      });

      // 2. Goal Ring SVG Stroke Dashoffset Sweep
      const ringCircle = scopeEl.querySelector ? scopeEl.querySelector('#ovGoalCircle') : document.getElementById('ovGoalCircle');
      if (ringCircle) {
        const c = parseFloat(ringCircle.getAttribute('stroke-dasharray')) || 427.3;
        const off = parseFloat(ringCircle.getAttribute('data-target-off')) || 0;
        ringCircle.style.strokeDashoffset = c;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            ringCircle.style.strokeDashoffset = off;
          });
        });
      }

      // 3. Weekly Activity Chart Bars (.bar-fill)
      scopeEl.querySelectorAll('.bar-fill[data-target-h]').forEach(bf => {
        const targetH = bf.getAttribute('data-target-h');
        bf.style.height = '0%';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bf.style.height = targetH;
          });
        });
      });

      // 4. Quota and Target Progress Bars (.prog > span)
      scopeEl.querySelectorAll('.prog > span[data-target-w]').forEach(sp => {
        const targetW = sp.getAttribute('data-target-w');
        sp.style.width = '0%';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            sp.style.width = targetW;
          });
        });
      });
    }

    /* ---------- 3. Dữ liệu mẫu (thay bằng dữ liệu TikTok API thật khi kết nối) ---------- */

/* ---------- Helper tính toán thời gian ca, chấm công chuyên cần & du di 5 phút ---------- */
    function getDayOfWeekName(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return days[d.getDay()] || '';
    }

    // Chấm công chuyên cần ca live: Đúng giờ vs Live muộn
    function parseSlotStartTime(slot) {
      if (!slot) return '00:00';
      const m = slot.match(/(\d{1,2})(?:[:hH](\d{2}))?/);
      if (!m) return '00:00';
      const h = m[1].padStart(2, '0');
      const min = (m[2] || '00').padStart(2, '0');
      return `${h}:${min}`;
    }

    function timeToMinutes(tStr) {
      if (!tStr) return 0;
      const parts = tStr.split(':');
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }

    function addMinutesToTime(timeStr, mins) {
      let m = timeToMinutes(timeStr) + mins;
      if (m < 0) m += 24 * 60;
      m = m % (24 * 60);
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const min = (m % 60).toString().padStart(2, '0');
      return `${h}:${min}`;
    }

    // Tự động nhận diện ca live từ phiên livestream (Khung giờ, giờ bắt đầu và chuẩn 5 ca)
    function detectSessionCaLive(s) {
      if (!s) {
        const def = STANDARD_SLOTS[3];
        return { slot: def.slot, label: def.label, hours: def.hours, name: 'Ca 4: 14:00 - 22:00', shortName: 'Ca 4', index: 4 };
      }
      
      // 1. Nếu s.slot đã khớp chính xác với 1 trong 5 ca chuẩn
      if (s.slot) {
        const idx = STANDARD_SLOTS.findIndex(st => st.slot === s.slot);
        if (idx !== -1) {
          const st = STANDARD_SLOTS[idx];
          return { slot: st.slot, label: st.label, hours: st.hours, name: `Ca ${idx + 1}: ${st.slot}`, shortName: `Ca ${idx + 1}`, index: idx + 1 };
        }
      }

      // 2. Tự động nhận diện từ giờ phát live thực tế (actualLiveStart) hoặc parseSlotStartTime(s.slot)
      const actTime = s.actualLiveStart || parseSlotStartTime(s.slot);
      if (actTime) {
        const actMin = timeToMinutes(actTime);
        let bestSlot = STANDARD_SLOTS[0];
        let minDiff = 999999;
        let bestIdx = 0;
        
        STANDARD_SLOTS.forEach((st, idx) => {
          const stStartMin = timeToMinutes(parseSlotStartTime(st.slot));
          let diff = Math.abs(actMin - stStartMin);
          if (diff > 12 * 60) diff = 24 * 60 - diff;
          if (diff < minDiff) {
            minDiff = diff;
            bestSlot = st;
            bestIdx = idx;
          }
        });
        return { slot: bestSlot.slot, label: bestSlot.label, hours: bestSlot.hours, name: `Ca ${bestIdx + 1}: ${bestSlot.slot}`, shortName: `Ca ${bestIdx + 1}`, index: bestIdx + 1 };
      }

      const def = STANDARD_SLOTS[0];
      return { slot: def.slot, label: def.label, hours: def.hours, name: `Ca 1: ${def.slot}`, shortName: 'Ca 1', index: 1 };
    }

    // SHIFT_GRACE_MINUTES is declared in config.js (5 minutes)

    // Tự động phân biệt muộn, trễ, sớm, đúng giờ 100% dựa vào giờ lịch ca vs giờ vào thực tế
    function checkShiftPunctuality(scheduledSlot, actualStart) {
      const schedTime = parseSlotStartTime(scheduledSlot);
      if (!actualStart) actualStart = schedTime;
      const schedMin = timeToMinutes(schedTime);
      const actMin = timeToMinutes(actualStart);
      let diffMin = actMin - schedMin;

      // Xử lý ca đêm vắt qua nửa đêm (VD: ca 21:00 nhưng vào live lúc 00:05)
      if (schedMin >= 20 * 60 && actMin <= 4 * 60) {
        diffMin += 24 * 60;
      } else if (actMin >= 20 * 60 && schedMin <= 4 * 60) {
        diffMin -= 24 * 60;
      }

      if (diffMin <= -5) {
        // Vào sớm từ 5 phút trở lên: Tự động phân loại là VÀO SỚM (cộng +2đ chuyên cần)
        return {
          status: 'EARLY',
          label: `Vào sớm ${Math.abs(diffMin)}p (≥5p · Cộng +2đ)`,
          shortLabel: `Sớm ${Math.abs(diffMin)}p`,
          pillClass: 'p-green',
          icon: 'zap',
          diffMin: diffMin,
          scheduledTime: schedTime,
          actualTime: actualStart,
          isLate: false,
          isEarlyBonus: true
        };
      } else if (diffMin <= 0) {
        // Sớm 1-4 phút hoặc đúng 0 phút: Tự động phân loại là ĐÚNG GIỜ
        return {
          status: 'ON_TIME',
          label: diffMin === 0 ? 'Đúng giờ chuẩn' : `Vào sớm ${Math.abs(diffMin)}p (Đúng giờ)`,
          shortLabel: diffMin === 0 ? 'Đúng giờ' : `Sớm ${Math.abs(diffMin)}p`,
          pillClass: 'p-green',
          icon: 'check',
          diffMin: diffMin,
          scheduledTime: schedTime,
          actualTime: actualStart,
          isLate: false,
          isEarlyBonus: false
        };
      } else if (diffMin <= SHIFT_GRACE_MINUTES) {
        // Trễ từ 1 đến 5 phút: Theo đúng quy định du di (≤5p tính là ĐÚNG GIỜ, không bị phạt)
        return {
          status: 'ON_TIME',
          label: `Đúng giờ (Trễ ${diffMin}p ≤ 5p)`,
          shortLabel: `Trễ ${diffMin}p (≤5p)`,
          pillClass: 'p-green',
          icon: 'check',
          diffMin: diffMin,
          scheduledTime: schedTime,
          actualTime: actualStart,
          isLate: false,
          isEarlyBonus: false
        };
      } else {
        // Quá 5 phút: TỰ ĐỘNG TÍNH LÀ MUỘN GIỜ! (Bị trừ điểm kỷ luật)
        const pen = diffMin <= 15 ? 3 : diffMin <= 30 ? 7 : 15;
        return {
          status: 'LATE',
          label: `Muộn ${diffMin} phút (Quá 5p · Trừ -${pen}đ)`,
          shortLabel: `Muộn ${diffMin}p`,
          pillClass: 'p-red',
          icon: 'alert',
          diffMin: diffMin,
          scheduledTime: schedTime,
          actualTime: actualStart,
          isLate: true,
          penalty: pen
        };
      }
    }


    function round100k(n) { return Math.round(n / 1e5) * 1e5; }

    function translateReturnReason(reason) {
      if (!reason || typeof reason !== 'string') return 'Chưa có lý do';
      const clean = reason.trim().replace(/[\u2018\u2019]/g, "'");
      const lower = clean.toLowerCase();

      if (/product does(n'?t|\s+not) match|item does(n'?t|\s+not) match|not as described|mismatch_live_desc|description_mismatch|không đúng như mô tả/i.test(lower)) {
        return 'Sản phẩm không đúng như mô tả';
      }
      if (/wrong product sent|wrong_variant|incorrect item|wrong item sent|different from what was ordered|giao sai/i.test(lower)) {
        return 'Giao sai sản phẩm / sai phân loại';
      }
      if (/package or product is damaged|damaged_transit|item or outer packaging is damaged|damaged during shipment|damaged package|package damaged|damaged parcel|móp méo|hư hỏng do vận chuyển|bao bì bị hư hỏng/i.test(lower)) {
        return 'Hàng hoặc bao bì bị hư hỏng / móp méo';
      }
      if (/item is defective or doesn'?t work|defective_product|quality issue|functional failure|defective item|bị lỗi|hỏng hóc/i.test(lower)) {
        return 'Sản phẩm bị lỗi / không hoạt động';
      }
      if (/missing items or accessories|missing parts|missing item or accessory|incomplete|thiếu hàng/i.test(lower)) {
        return 'Thiếu hàng hoặc thiếu phụ kiện / quà tặng';
      }
      if (/changed mind|no longer needed|don'?t want|bought by mistake|order placed by mistake|đổi ý|đặt nhầm/i.test(lower)) {
        return 'Đổi ý không muốn mua nữa';
      }
      if (/arrived too late|late delivery|giao hàng quá trễ|giao quá trễ/i.test(lower)) {
        return 'Giao hàng quá trễ';
      }
      if (/suspected counterfeit|counterfeit|fake product|hàng giả|nhái/i.test(lower)) {
        return 'Nghi ngờ hàng giả / không chính hãng';
      }
      if (/found a better price|giá tốt hơn/i.test(lower)) {
        return 'Tìm thấy giá tốt hơn ở nơi khác';
      }
      if (/expired product|near_expiry|product expired|cận hạn|quá hạn/i.test(lower)) {
        return 'Sản phẩm cận hạn / hết hạn sử dụng';
      }
      if (/parcel not delivered|did not receive|package not delivered|chưa nhận được/i.test(lower)) {
        return 'Chưa nhận được kiện hàng';
      }
      if (/mutual agreement|thỏa thuận đồng thuận/i.test(lower)) {
        return 'Thỏa thuận đồng thuận với Người bán';
      }
      if (/logistics issue|shipping issue|sự cố vận chuyển/i.test(lower)) {
        return 'Sự cố từ đơn vị vận chuyển';
      }
      if (/buyer rejected|bom hàng|từ chối nhận/i.test(lower)) {
        return 'Khách từ chối nhận hàng';
      }
      if (/unable to deliver|không thể phát|delivery failed/i.test(lower)) {
        return 'ĐVVC không thể phát hàng';
      }
      if (/empty parcel|empty package|kiện hàng rỗng/i.test(lower)) {
        return 'Kiện hàng rỗng / bị tráo hàng';
      }
      if (/poor quality|kém chất lượng/i.test(lower)) {
        return 'Chất lượng sản phẩm kém / không đạt';
      }
      if (/size not fit|wrong size|không vừa/i.test(lower)) {
        return 'Kích cỡ không vừa vặn';
      }
      if (/color.*mismatch|style.*mismatch/i.test(lower)) {
        return 'Màu sắc / kiểu dáng không khớp';
      }
      if (/^(unknown|other|chưa có lý do|chưa rõ)$/i.test(lower)) {
        return 'Chưa có lý do';
      }
      return clean;
    }

    function inferReturnLiability(reason) {
      const norm = translateReturnReason(reason);
      if (/không đúng như mô tả|tư vấn|sai lệch/i.test(norm)) return 'Host Livestream / Shop';
      if (/giao sai|sai phân loại|thiếu hàng|kích cỡ/i.test(norm)) return 'Kho hàng & Đóng gói';
      if (/vận chuyển|hư hỏng|móp méo|quá trễ|không thể phát|kiện hàng rỗng/i.test(norm)) return 'Đơn vị vận chuyển';
      if (/bị lỗi|không hoạt động|chất lượng kém/i.test(norm)) return 'Nhà sản xuất';
      if (/đổi ý|đặt nhầm|giá tốt hơn/i.test(norm)) return 'Khách hàng (Nguyên seal)';
      if (/cận hạn|hết hạn/i.test(norm)) return 'Kho hàng (Kiểm tra Date)';
      return 'Chưa xác định';
    }
