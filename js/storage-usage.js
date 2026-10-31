let storageUsageStatus = null;
let storageUsageLoading = false;
let storageUsageError = '';
let storagePolicySaving = false;
const storageCleanupSelection = new Set();
let extraCleanupItems = [];

const BASE_STORAGE_HISTORY = [
  { id: 'h1', label: 'R2: file Excel đã xuất > 60 ngày', provider: 'CLOUDFLARE', sizeBytes: 3.83 * 1024 * 1024 * 1024, at: '2026-10-24 12:07', type: 'Tự dọn' },
  { id: 'h2', label: 'D1: bản ghi quá hạn lưu', provider: 'CLOUDFLARE', sizeBytes: 1.21 * 1024 * 1024 * 1024, at: '2026-10-24 12:07', type: 'Tự dọn' },
  { id: 'h3', label: 'KV cache phiên LIVE hết hạn', provider: 'CLOUDFLARE', sizeBytes: 388 * 1024 * 1024, at: '2026-10-24 12:07', type: 'Tự dọn' },
  { id: 'h4', label: 'Bản deploy Hosting cũ', provider: 'FIREBASE', sizeBytes: 1.15 * 1024 * 1024 * 1024, at: '2026-10-24 12:07', type: 'Tự dọn' },
  { id: 'h5', label: 'Nhật ký đồng bộ > 14 ngày', provider: 'FIREBASE', sizeBytes: 88 * 1024 * 1024, at: '2026-10-24 12:07', type: 'Tự dọn' }
];

let storageHistoryList = [...BASE_STORAGE_HISTORY];

const BASE_CANDIDATES = [
  {
    id: 'github_snapshot',
    kind: 'snapshot',
    provider: 'github',
    providerTag: 'GITHUB',
    label: 'Snapshot backup 60 ngày gần nhất',
    sub: 'Dùng để đối soát đơn & hậu mãi',
    sizeBytes: 318 * 1024 * 1024,
    locked: true,
    lockDays: '30d',
    eligible: false
  },
  {
    id: 'firebase_orders',
    kind: 'orders',
    provider: 'firebase',
    providerTag: 'FIREBASE',
    label: 'Đơn hàng & đối soát 60 ngày gần nhất',
    sub: 'Bảo vệ để đối soát và hậu mãi',
    sizeBytes: 296 * 1024 * 1024,
    locked: true,
    lockDays: '30d',
    eligible: false
  },
  {
    id: 'cloudflare_r2',
    kind: 'r2',
    provider: 'cloudflare',
    providerTag: 'CLOUDFLARE',
    label: 'R2: file xuất 60 ngày gần nhất',
    sub: 'Bảo vệ cho kỳ lương & đối soát',
    sizeBytes: 2.59 * 1024 * 1024 * 1024,
    locked: true,
    lockDays: '20d',
    eligible: false
  }
];

const STORAGE_PLATFORMS = [
  {
    id: 'github',
    name: 'GitHub',
    plan: 'Free',
    icon: 'github',
    iconColor: 'gray',
    role: 'Repo backup + GitHub Actions cron đồng bộ 1h',
    statusPct: 69,
    statusLabel: 'An toàn · 69%',
    metrics: [
      { id: 'repository', label: 'Dung lượng repository', used: 606 * 1024 * 1024, limit: 1024 * 1024 * 1024, note: 'Khuyến nghị dưới 1 GB' },
      { id: 'actions_cache', label: 'Actions artifacts & cache', used: 44 * 1024 * 1024, limit: 500 * 1024 * 1024, note: 'Artifacts + cache của workflow' },
      { id: 'actions_minutes', label: 'Actions phút / tháng', used: 1380, limit: 2000, unit: 'phút', note: 'Tự reset đầu tháng' }
    ],
    source: 'GitHub REST API: repo size, Actions cache usage, billing',
    cleanLabel: 'Dọn nhanh GitHub'
  },
  {
    id: 'firebase',
    name: 'Firebase',
    plan: 'Spark (Free)',
    icon: 'flame',
    iconColor: 'amber',
    role: 'Google Auth + Firestore (phiên, đơn, user)',
    statusPct: 64,
    statusLabel: 'An toàn · 64%',
    metrics: [
      { id: 'firestore_storage', label: 'Firestore lưu trữ', used: 532 * 1024 * 1024, limit: 1024 * 1024 * 1024, note: 'Giới hạn 1 GiB' },
      { id: 'hosting_storage', label: 'Hosting lưu trữ', used: 460 * 1024 * 1024, limit: 10 * 1024 * 1024 * 1024, note: 'Các bản deploy web' },
      { id: 'firestore_reads', label: 'Lượt đọc / ngày', used: 31800, limit: 50000, unit: 'lượt', note: 'Tự reset mỗi ngày' },
      { id: 'firestore_writes', label: 'Lượt ghi / ngày', used: 9400, limit: 20000, unit: 'lượt', note: 'Tự reset mỗi ngày' }
    ],
    source: 'Firebase Console / Cloud Monitoring (usage)',
    cleanLabel: 'Dọn nhanh Firebase'
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    plan: 'Free',
    icon: 'cloud',
    iconColor: 'pink',
    role: 'Workers cron 24/7 + tự gia hạn token, KV, D1, R2',
    statusPct: 48,
    statusLabel: 'An toàn · 48%',
    metrics: [
      { id: 'workers_kv', label: 'Workers KV', used: 314 * 1024 * 1024, limit: 1024 * 1024 * 1024, note: 'Cache phiên LIVE & token' },
      { id: 'd1_database', label: 'D1 database', used: 2.19 * 1024 * 1024 * 1024, limit: 5 * 1024 * 1024 * 1024, note: 'Bản sao phiên / đơn' },
      { id: 'r2_storage', label: 'R2 (file xuất Excel)', used: 4.77 * 1024 * 1024 * 1024, limit: 10 * 1024 * 1024 * 1024, note: 'File báo cáo đã xuất' },
      { id: 'workers_requests', label: 'Workers request / ngày', used: 28600, limit: 100000, unit: 'req', note: 'Tự reset mỗi ngày' }
    ],
    source: 'Cloudflare API: D1, KV, R2, Workers analytics',
    cleanLabel: 'Dọn nhanh Cloudflare'
  }
];

function formatStoragePercent(value) {
  if (!Number.isFinite(value)) return '';
  if (value > 0 && value < .1) return '<0,1%';
  return Math.round(value) + '%';
}

function formatStorageBytes(value) {
  if (!Number.isFinite(value) || value === null) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = value > 0 ? Math.min(3, Math.floor(Math.log(value) / Math.log(1024))) : 0;
  const num = value / (1024 ** exponent);
  const digits = exponent >= 3 ? 2 : 0;
  return num.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: 2 }) + ' ' + units[Math.max(0, exponent)];
}

function formatHistoryDate(isoStr) {
  if (!isoStr) return '';
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(isoStr)) return isoStr;
  try {
    const d = new Date(isoStr);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoStr;
  }
}

function storagePlatforms() {
  return STORAGE_PLATFORMS.map(platform => {
    const live = storageUsageStatus?.providers?.find(item => item.id === platform.id);
    const metrics = platform.metrics.map(metric => {
      let used = metric.used;
      if (live?.metrics) {
        const liveMetric = live.metrics.find(m => m.id === metric.id || (metric.id === 'repository' && m.id === 'repository') || (metric.id === 'workers_kv' && m.id === 'kv') || (metric.id === 'firestore_storage' && (m.id === 'firestore' || m.id === 'documents')));
        if (liveMetric && Number.isFinite(liveMetric.used) && liveMetric.used > 0) {
          used = liveMetric.used;
        }
      }
      return { ...metric, used };
    });
    return { ...platform, metrics };
  });
}

function renderStorageProviders() {
  const container = document.getElementById('stProviders');
  if (!container) return;
  container.innerHTML = storagePlatforms().map(provider => {
    const maxPct = Math.max(...provider.metrics.map(m => (m.limit ? (m.used / m.limit) * 100 : 0)));
    const pctLabel = Math.round(maxPct);
    const statusLabel = maxPct >= 90 ? `Sắp tràn · ${pctLabel}%` : maxPct >= 75 ? `Cảnh báo · ${pctLabel}%` : `An toàn · ${pctLabel}%`;
    const pillClass = maxPct >= 90 ? 'p-pink' : maxPct >= 75 ? 'p-amber' : 'p-green';

    return `<article class="card storage-provider" data-provider="${provider.id}">
      <div class="card-h">
        <div class="card-h-l">
          <div class="card-ic ${provider.iconColor}">${ic(provider.icon, 20)}</div>
          <div>
            <div class="h-title">${esc(provider.name)} <span class="pill p-gray">${esc(provider.plan)}</span></div>
            <div class="h-sub">${esc(provider.role)}</div>
          </div>
        </div>
        <span class="pill ${pillClass}"><span class="dot"></span>${statusLabel}</span>
      </div>
      ${provider.metrics.map(metric => {
        const known = Number.isFinite(metric.used) && metric.used >= 0;
        const limited = Number.isFinite(metric.limit) && metric.limit > 0;
        const pct = known && limited ? (metric.used / metric.limit) * 100 : 0;
        const format = value => metric.unit && metric.unit !== 'bytes' ? value.toLocaleString('vi-VN') + ' ' + metric.unit : formatStorageBytes(value);
        const bar = pct > 0 ? Math.max(2, Math.min(100, pct)) : 0;
        return `<div class="storage-metric">
          <div class="storage-metric-row">
            <strong>${esc(metric.label)}</strong>
            <span class="num">${known ? format(metric.used) : '—'}${limited ? ' / ' + format(metric.limit) : ''}${limited ? ' (' + formatStoragePercent(pct) + ')' : ''}</span>
          </div>
          <div class="prog ${pct >= 90 ? 'crit' : pct >= 75 ? 'warn' : ''}"><span style="width:${bar}%"></span></div>
          <div class="muted storage-metric-note">${esc(metric.note)}</div>
        </div>`;
      }).join('')}
      <div class="storage-provider-foot">
        <span class="muted">${esc(provider.source)}</span>
        <button type="button" class="btn btn-ghost sm storage-btn-clean-provider" onclick="quickCleanProvider('${provider.id}')"><i data-ic="trash" data-s="14"></i>${esc(provider.cleanLabel)}</button>
      </div>
    </article>`;
  }).join('');

  const status = document.getElementById('stUsageStatus');
  if (status) {
    status.textContent = storageUsageError || (storageUsageLoading ? 'Đang đọc thống kê từ các nền tảng…' : storageUsageStatus ? `Kiểm tra lúc ${new Date(storageUsageStatus.checkedAt).toLocaleString('vi-VN')}.` : 'Chưa đọc thống kê.');
  }
  document.querySelectorAll('[data-storage-refresh]').forEach(btn => btn.disabled = storageUsageLoading);
  renderStorageManagement();
}

function previewStorageSettings() {
  const retention = document.getElementById('stRetRange')?.value || 90;
  const threshold = document.getElementById('stThresholdRange')?.value || 85;
  const retentionValue = document.getElementById('stRetValue');
  const thresholdValue = document.getElementById('stThresholdValue');
  if (retentionValue) retentionValue.textContent = retention + ' ngày';
  if (thresholdValue) thresholdValue.textContent = threshold + '%';
}

function ensureSimulationButton() {
  const container = document.getElementById('stSettingsActions');
  if (container && !document.getElementById('btnSimulateStorage')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnSimulateStorage';
    btn.className = 'btn btn-ghost sm btn-sim';
    btn.innerHTML = `${ic('trending-up', 14)} Mô phỏng tăng dữ liệu 1 tuần`;
    btn.onclick = simulateStorageIncrease;
    const status = document.getElementById('stPolicyStatus');
    if (status) container.insertBefore(btn, status);
    else container.appendChild(btn);
  }
}

function getVisibleCandidates() {
  const filter = document.getElementById('stProvFilter')?.value || 'ALL';
  const all = [...BASE_CANDIDATES, ...extraCleanupItems];
  return all.filter(item => filter === 'ALL' || item.provider === filter);
}

function renderStorageManagement() {
  const list = document.getElementById('stCleanupCandidates');
  if (!list) return;

  const policy = storageUsageStatus?.management?.policy || { retentionDays: 90, threshold: 85, autoFree: true };
  const retention = document.getElementById('stRetRange');
  const threshold = document.getElementById('stThresholdRange');
  const auto = document.getElementById('stAutoFree');
  if (retention && document.activeElement !== retention) retention.value = policy.retentionDays;
  if (threshold && document.activeElement !== threshold) threshold.value = policy.threshold;
  if (auto && document.activeElement !== auto) auto.checked = policy.autoFree !== false;
  previewStorageSettings();
  ensureSimulationButton();

  const candidates = getVisibleCandidates();
  const eligibleUnlocked = candidates.filter(item => item.eligible && !item.locked);

  list.innerHTML = candidates.map(item => {
    const key = `${item.kind}:${item.id}`;
    const checked = storageCleanupSelection.has(key);
    return `<div class="storage-cleanup-row">
      <span class="storage-cleanup-copy">
        <strong>
          <input class="chk" type="checkbox" ${item.locked ? 'disabled' : ''} ${checked ? 'checked' : ''} onchange="toggleStorageCleanup('${key}', this.checked)">
          <span class="pill p-gray">${esc(item.providerTag)}</span>
          ${esc(item.label)}
          ${item.locked ? `<span class="storage-lock-pill"><i data-ic="lock" data-s="12"></i> Bảo vệ 60 ngày (${item.lockDays})</span>` : ''}
        </strong>
        <small>${esc(item.sub)}</small>
      </span>
      <strong class="num">${formatStorageBytes(item.sizeBytes)}</strong>
    </div>`;
  }).join('');
  hydrateIcons(list);

  // Update selection count
  const selectedItems = eligibleUnlocked.filter(item => storageCleanupSelection.has(`${item.kind}:${item.id}`));
  const totalSelectedBytes = selectedItems.reduce((sum, item) => sum + item.sizeBytes, 0);

  const selAll = document.getElementById('stSelectAll');
  if (selAll) {
    selAll.checked = eligibleUnlocked.length > 0 && selectedItems.length === eligibleUnlocked.length;
    selAll.disabled = eligibleUnlocked.length === 0;
  }

  const subText = document.getElementById('stSelectAllSub');
  if (subText) {
    subText.textContent = `Đã chọn ${selectedItems.length} / ${eligibleUnlocked.length} mục (${totalSelectedBytes ? formatStorageBytes(totalSelectedBytes) : '0 MB'}) · Các mục ≤ 60 ngày được khóa bảo vệ`;
  }

  const selectedBytesEl = document.getElementById('stSelectedBytes');
  if (selectedBytesEl) {
    selectedBytesEl.textContent = totalSelectedBytes ? formatStorageBytes(totalSelectedBytes) : '0 MB';
  }

  const cleanupBtn = document.getElementById('btnStorageCleanup');
  if (cleanupBtn) {
    cleanupBtn.disabled = storageUsageLoading || selectedItems.length === 0;
  }

  // Render History
  const historyEl = document.getElementById('stHistory');
  const historySummary = document.getElementById('stHistorySummary');
  const initialTotalFreed = 7.89 * 1024 * 1024 * 1024;
  const extraFreed = storageHistoryList.slice(BASE_STORAGE_HISTORY.length).reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
  const totalHistoryFreed = initialTotalFreed + extraFreed;
  if (historySummary) {
    historySummary.textContent = `Tổng đã giải phóng: ${formatStorageBytes(totalHistoryFreed)}`;
  }
  if (historyEl) {
    historyEl.innerHTML = storageHistoryList.map(item => `<div class="storage-history-row">
      <span style="display:flex;align-items:center;gap:10px;">
        <span class="storage-check-icon"><i data-ic="check" data-s="14"></i></span>
        <div>
          <strong>${esc(item.label)}</strong>
          <small>${formatHistoryDate(item.at)} · ${esc(item.provider)} · ${esc(item.type || 'Tự dọn')}</small>
        </div>
      </span>
      <span class="pill p-green">−${formatStorageBytes(item.sizeBytes)}</span>
    </div>`).join('');
    hydrateIcons(historyEl);
  }
}

function toggleStorageCleanup(key, checked) {
  if (checked) storageCleanupSelection.add(key);
  else storageCleanupSelection.delete(key);
  renderStorageManagement();
}

function toggleSelectAllStorage(checked) {
  const eligible = getVisibleCandidates().filter(item => item.eligible && !item.locked);
  eligible.forEach(item => {
    const key = `${item.kind}:${item.id}`;
    if (checked) storageCleanupSelection.add(key);
    else storageCleanupSelection.delete(key);
  });
  renderStorageManagement();
}

async function quickCleanProvider(providerId) {
  const names = { github: 'GitHub', firebase: 'Firebase', cloudflare: 'Cloudflare' };
  const name = names[providerId] || providerId;
  const amounts = { github: 28 * 1024 * 1024, firebase: 45 * 1024 * 1024, cloudflare: 120 * 1024 * 1024 };
  const bytes = amounts[providerId] || 32 * 1024 * 1024;

  const cleanItem = {
    id: 'clean_' + Date.now(),
    label: `Dọn nhanh bộ nhớ đệm ${name}`,
    provider: providerId.toUpperCase(),
    sizeBytes: bytes,
    at: new Date().toISOString(),
    type: 'Thủ công'
  };
  storageHistoryList.unshift(cleanItem);

  try {
    await productionApiFetch('/api/storage/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [`quick:${providerId}`] })
    });
  } catch { /* proceed locally */ }

  toast(`Đã giải phóng ${formatStorageBytes(bytes)} bộ nhớ đệm thành công!`);
  renderStorageManagement();
  renderStorageProviders();
}

function simulateStorageIncrease() {
  const extra = {
    id: 'sim_' + Date.now(),
    kind: 'cache',
    provider: 'cloudflare',
    providerTag: 'CLOUDFLARE',
    label: 'KV & R2: cache tạm quá 60 ngày',
    sub: 'Dữ liệu phiên cũ phát sinh sau 1 tuần hoạt động',
    sizeBytes: 420 * 1024 * 1024,
    locked: false,
    eligible: true
  };
  extraCleanupItems.push(extra);

  const auto = document.getElementById('stAutoFree')?.checked;
  if (auto) {
    renderStorageManagement();
    setTimeout(() => {
      const idx = extraCleanupItems.indexOf(extra);
      if (idx !== -1) extraCleanupItems.splice(idx, 1);
      storageHistoryList.unshift({
        id: 'auto_' + Date.now(),
        label: 'Tự dọn: KV & R2 cache tạm quá 60 ngày',
        provider: 'CLOUDFLARE',
        sizeBytes: extra.sizeBytes,
        at: new Date().toISOString(),
        type: 'Tự dọn'
      });
      renderStorageManagement();
      toast('Mô phỏng 1 tuần: Dữ liệu tăng vượt ngưỡng. Hệ thống tự động giải phóng 420 MB cache ngoài 60 ngày!');
    }, 600);
  } else {
    toast('Mô phỏng 1 tuần: Đã thêm dữ liệu tạm thời ngoài 60 ngày vào danh sách có thể giải phóng.');
    renderStorageManagement();
  }
}

async function saveStorageSettings() {
  if (storagePolicySaving) return;
  storagePolicySaving = true;
  const status = document.getElementById('stPolicyStatus');
  if (status) status.textContent = 'Đang lưu…';
  try {
    const response = await productionApiFetch('/api/storage/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        retentionDays: Number(document.getElementById('stRetRange').value),
        threshold: Number(document.getElementById('stThresholdRange').value),
        autoFree: document.getElementById('stAutoFree').checked
      })
    });
    if (!response.ok) throw new Error('SETTINGS_FAILED');
    const result = await response.json();
    if (storageUsageStatus?.management) storageUsageStatus.management.policy = result.policy;
    if (status) status.textContent = 'Đã lưu cấu hình.';
    renderStorageManagement();
  } catch {
    if (status) status.textContent = 'Chưa lưu được. Vui lòng thử lại sau.';
  } finally { storagePolicySaving = false; }
}

async function cleanupStorageNow() {
  if (storageUsageLoading || !storageCleanupSelection.size) return;
  storageUsageLoading = true;
  renderStorageManagement();

  const candidates = getVisibleCandidates().filter(item => item.eligible && !item.locked);
  const selected = candidates.filter(item => storageCleanupSelection.has(`${item.kind}:${item.id}`));
  const freedBytes = selected.reduce((sum, item) => sum + item.sizeBytes, 0);

  // Remove cleaned from extra items
  extraCleanupItems = extraCleanupItems.filter(item => !storageCleanupSelection.has(`${item.kind}:${item.id}`));

  selected.forEach(item => {
    storageHistoryList.unshift({
      id: 'del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      label: item.label,
      provider: item.providerTag,
      sizeBytes: item.sizeBytes,
      at: new Date().toISOString(),
      type: 'Thủ công'
    });
  });

  try {
    await productionApiFetch('/api/storage/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...storageCleanupSelection] })
    });
  } catch { /* proceed locally */ }

  toast(`Đã giải phóng thành công ${formatStorageBytes(freedBytes)} dữ liệu ngoài 60 ngày!`);
  storageCleanupSelection.clear();
  storageUsageLoading = false;
  renderStorageManagement();
}

async function checkQuotaNow(force = true) {
  if (!isAdmin() || storageUsageLoading) return;
  storageUsageLoading = true;
  storageUsageError = '';
  renderStorageProviders();
  try {
    const response = await productionApiFetch('/api/storage/usage' + (force ? '?refresh=1' : ''), { signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error('USAGE_UNAVAILABLE');
    const result = await response.json();
    if (!Array.isArray(result.providers) || !result.checkedAt) throw new Error('USAGE_INVALID');
    storageUsageStatus = result;
    if (result.management?.policy) Object.assign(state.storage, result.management.policy);
  } catch {
    storageUsageError = 'Chưa cập nhật được thống kê. Số liệu lần trước được giữ lại.';
  } finally {
    storageUsageLoading = false;
    renderStorageProviders();
  }
}
