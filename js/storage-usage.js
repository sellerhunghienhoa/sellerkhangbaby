let storageUsageStatus = null;
let storageUsageLoading = false;
let storageUsageError = '';
let storagePolicySaving = false;
const storageCleanupSelection = new Set();
let storageCleanupInitialized = false;

const STORAGE_PLATFORMS = [
  {id:'github',name:'GitHub',role:'Mã nguồn và bản phát hành',url:'https://github.com/sellerhunghienhoa/sellerkhangbaby/releases',metrics:[{id:'repository',label:'Kho mã nguồn',used:null,limit:null},{id:'releases',label:'Tệp đính kèm 5 bản phát hành mới nhất',used:null,limit:null}],note:'Kho mã nguồn và Releases được đo riêng; không phải tổng GitHub Actions.'},
  {id:'firebase',name:'Firebase',role:'Dữ liệu nghiệp vụ Firestore',url:'https://console.firebase.google.com/project/sellerkhangbaby/firestore/usage',metrics:[{id:'documents',label:'Dữ liệu tài liệu đọc được (ước tính)',used:null,limit:null}],note:'Ưu tiên Cloud Monitoring; số liệu dự phòng chỉ ước tính từ JSON tài liệu đọc được.'},
  {id:'cloudflare',name:'Cloudflare',role:'KV và website đang chạy',url:'https://dash.cloudflare.com/1bda853cb67674a5c4e8d5a6c2152b5c/workers/services/view/sellerkhangbaby-live-kpi/production',metrics:[{id:'kv',label:'Workers KV của dự án',used:null,limit:10**9},{id:'assets',label:'Website đã triển khai',used:null,limit:null}],note:'KV Free 1 GB dùng chung tài khoản; thẻ này đo namespace của dự án và website đang chạy.'}
];

function storagePlatforms() {
  return STORAGE_PLATFORMS.map(platform=>{
    const live=storageUsageStatus?.providers?.find(item=>item.id===platform.id);
    return {...platform,plan:platform.id==='firebase'?'Spark (Free)':'Free',...live,metrics:(live?.metrics?.length?live.metrics:platform.metrics).map(metric=>({used:null,...metric}))};
  });
}

function formatStoragePercent(value) {
  if (!Number.isFinite(value)) return '';
  if (value>0&&value<.1) return '<0,1%';
  return value<10?value.toLocaleString('vi-VN',{maximumFractionDigits:1})+'%':Math.round(value)+'%';
}

function formatStorageBytes(value) {
  if (!Number.isFinite(value)) return 'Chưa có số liệu';
  const units=['B','KiB','MiB','GiB'];
  const exponent=value>0?Math.min(3,Math.floor(Math.log(value)/Math.log(1024))):0;
  return (value/1024**exponent).toLocaleString('vi-VN',{maximumFractionDigits:2})+' '+units[Math.max(0,exponent)];
}

function renderStorageProviders() {
  const container=document.getElementById('stProviders');
  if (!container) return;
  const errors={PERMISSION_DENIED:'Chưa có quyền đọc thống kê.',RATE_LIMITED:'Đã chạm giới hạn API; hãy thử lại sau.',INVALID_SERVICE_ACCOUNT:'Thông tin Service Account chưa đúng.',NO_METRICS:'Nền tảng chưa trả số đo gần nhất.',PERMISSION_OR_QUERY_ERROR:'Chưa đọc được Analytics; kiểm tra quyền token.',PROVIDER_UNAVAILABLE:'Chưa truy cập được API thống kê.'};
  container.innerHTML=storagePlatforms().map(provider=>{
    const ratios=provider.metrics.filter(metric=>Number.isFinite(metric.used)&&metric.used>=0&&Number.isFinite(metric.limit)&&metric.limit>0).map(metric=>metric.used/metric.limit*100);
    const maxPct=ratios.length?Math.max(...ratios):null;
    const status=storageUsageLoading?'Đang kiểm tra…':maxPct!==null?(maxPct>=90?'Sắp tràn':maxPct>=75?'Cảnh báo':'An toàn')+' · '+formatStoragePercent(maxPct):provider.status==='ready'?'Đã đo':provider.status==='needs_setup'?'Cần kết nối':'Chưa có số liệu';
    const pillClass=maxPct!==null?(maxPct>=90?'p-pink':maxPct>=75?'p-amber':'p-green'):provider.status==='ready'?'p-green':'p-amber';
    return `<article class="card storage-provider" data-provider="${provider.id}">
      <div class="card-h"><div class="card-h-l"><div class="card-ic ${provider.id==='github'?'gray':provider.id==='firebase'?'amber':'pink'}">${ic(provider.id==='github'?'github':provider.id==='firebase'?'flame':'cloud',20)}</div><div><div class="h-title">${esc(provider.name)} <span class="pill p-gray">${provider.id==='firebase'?'Spark (Free)':'Free'}</span></div><div class="h-sub">${esc(provider.role)}</div></div></div><span class="pill ${pillClass}">${status}</span></div>
      ${provider.metrics.map(metric=>{
        const known=Number.isFinite(metric.used)&&metric.used>=0;
        const limited=Number.isFinite(metric.limit)&&metric.limit>0;
        const pct=known&&limited?metric.used/metric.limit*100:null;
        const format=value=>metric.unit&&metric.unit!=='bytes'?value.toLocaleString('vi-VN')+' '+metric.unit:formatStorageBytes(value);
        const bar=pct===null?0:pct>0?Math.max(2,Math.min(100,pct)):0;
        return `<div class="storage-metric"><div class="storage-metric-row"><strong>${esc(metric.label)}</strong><span class="num">${known?format(metric.used):'—'}${limited?' / '+format(metric.limit):''}${pct===null?'':' ('+formatStoragePercent(pct)+')'}</span></div><div class="prog ${pct!==null&&pct>=90?'crit':pct!==null&&pct>=75?'warn':''}"><span style="width:${bar}%"></span></div><div class="muted storage-metric-note">${esc(metric.note||(known?'Số liệu chỉ đọc của dự án.':'Chưa đọc được số liệu này.'))}</div></div>`;
      }).join('')}
      <div class="storage-provider-foot"><span class="muted">${esc(provider.source||(provider.id==='github'?'GitHub REST API':provider.id==='firebase'?'Firestore':'Cloudflare bindings'))}</span><a href="${provider.url}" target="_blank" rel="noopener noreferrer">Mở ${provider.name}</a></div>
      <details class="storage-config"><summary>Nguồn và giới hạn</summary><p class="muted">${esc(provider.note)}</p>${provider.warning?'<p>Đang dùng số liệu ước tính từ nguồn dự phòng.</p>':''}${provider.missing?.length?`<p>Cần: ${provider.missing.map(name=>`<code>${esc(name)}</code>`).join(', ')}.</p>`:''}${provider.error?`<p>${esc(errors[provider.error]||errors.PROVIDER_UNAVAILABLE)}</p>`:''}<a href="https://github.com/sellerhunghienhoa/sellerkhangbaby/blob/main/docs/STORAGE_USAGE.md" target="_blank" rel="noopener noreferrer">Xem cách tính</a></details>
    </article>`;
  }).join('');
  const status=document.getElementById('stUsageStatus');
  if (status) status.textContent=storageUsageError||(storageUsageLoading?'Đang đọc thống kê từ các nền tảng…':storageUsageStatus?`Kiểm tra lúc ${new Date(storageUsageStatus.checkedAt).toLocaleString('vi-VN')}. Chỉ hiển thị số liệu đã đọc được.`:'Chưa đọc thống kê. Bấm “Kiểm tra dung lượng” để cập nhật.');
  document.querySelectorAll('[data-storage-refresh]').forEach(button=>button.disabled=storageUsageLoading);
  renderStorageManagement();
}

function previewStorageSettings() {
  const retention=document.getElementById('stRetRange')?.value||90;
  const threshold=document.getElementById('stThresholdRange')?.value||85;
  const retentionValue=document.getElementById('stRetValue');
  const thresholdValue=document.getElementById('stThresholdValue');
  if (retentionValue) retentionValue.textContent=retention+' ngày';
  if (thresholdValue) thresholdValue.textContent=threshold+'%';
}

function getVisibleCandidates() {
  const filter=document.getElementById('stProvFilter')?.value||'ALL';
  return (storageUsageStatus?.management?.providers||[]).filter(provider=>provider.supported&&(filter==='ALL'||provider.id===filter)).flatMap(provider=>(provider.items||[]).map(item=>({...item,provider:provider.id,providerTag:STORAGE_PLATFORMS.find(value=>value.id===provider.id)?.name||provider.id})));
}

function renderStorageManagement() {
  const list=document.getElementById('stCleanupCandidates');
  if (!list) return;
  const management=storageUsageStatus?.management;
  const policy=management?.policy||{retentionDays:90,threshold:85,autoFree:false};
  const retention=document.getElementById('stRetRange');
  const threshold=document.getElementById('stThresholdRange');
  const auto=document.getElementById('stAutoFree');
  if (retention&&document.activeElement!==retention) retention.value=policy.retentionDays;
  if (threshold&&document.activeElement!==threshold) threshold.value=policy.threshold;
  if (auto&&document.activeElement!==auto) auto.checked=policy.autoFree===true;
  previewStorageSettings();
  const candidates=getVisibleCandidates();
  const eligible=candidates.filter(item=>item.eligible&&!item.locked);
  const validKeys=new Set(eligible.map(item=>`${item.kind}:${item.id}`));
  for (const key of storageCleanupSelection) if (!validKeys.has(key)) storageCleanupSelection.delete(key);
  if (management&&!storageCleanupInitialized) {
    eligible.forEach(item=>storageCleanupSelection.add(`${item.kind}:${item.id}`));
    storageCleanupInitialized=true;
  }
  const filter=document.getElementById('stProvFilter')?.value||'ALL';
  const providers=(management?.providers||[]).filter(provider=>filter==='ALL'||provider.id===filter);
  list.innerHTML=!management?'<div class="storage-cleanup-row"><span class="muted">Đang kiểm tra dữ liệu có thể giải phóng…</span></div>':candidates.length?candidates.map(item=>{
    const key=`${item.kind}:${item.id}`;
    return `<label class="storage-cleanup-row"><span class="storage-cleanup-copy"><strong><input class="chk" type="checkbox" value="${esc(key)}" ${!item.eligible||item.locked?'disabled':''} ${storageCleanupSelection.has(key)?'checked':''} onchange="toggleStorageCleanup(this.value,this.checked)"><span class="pill p-gray">${esc(item.providerTag)}</span>${esc(item.label)}${!item.eligible||item.locked?'<span class="storage-lock-pill">Đang được bảo vệ</span>':''}</strong><small>${item.kind==='artifact'?'Actions artifact':'Actions cache'} · ${new Date(item.date).toLocaleDateString('vi-VN')} · bảo vệ ${policy.retentionDays} ngày</small></span><strong class="num">${formatStorageBytes(item.sizeBytes)}</strong></label>`;
  }).join(''):providers.map(provider=>`<div class="storage-cleanup-row"><span class="storage-cleanup-copy"><strong><span class="pill p-gray">${esc(STORAGE_PLATFORMS.find(value=>value.id===provider.id)?.name||provider.id)}</span>${provider.supported?'Không có mục quá hạn':provider.cleanupMode==='monitor_only'?'Chỉ giám sát':'Chưa hỗ trợ dọn tự động'}</strong><small>${provider.supported?`Không có tài nguyên kỹ thuật cũ hơn ${policy.retentionDays} ngày.`:esc(provider.missing?.[0]||'Chưa có quyền dọn dữ liệu.')}</small></span><span class="pill ${provider.supported?'p-green':provider.cleanupMode==='monitor_only'?'p-gray':'p-amber'}">${provider.supported?'An toàn':provider.cleanupMode==='monitor_only'?'Không tự xóa':'Cần cấu hình'}</span></div>`).join('');
  const selected=eligible.filter(item=>storageCleanupSelection.has(`${item.kind}:${item.id}`));
  const bytes=selected.reduce((sum,item)=>sum+(Number(item.sizeBytes)||0),0);
  const selectAll=document.getElementById('stSelectAll');
  if (selectAll) {selectAll.checked=eligible.length>0&&selected.length===eligible.length;selectAll.disabled=!eligible.length||storageUsageLoading;}
  const summary=document.getElementById('stSelectAllSub');
  if (summary) summary.textContent=`Đã chọn ${selected.length} / ${eligible.length} mục (${formatStorageBytes(bytes)}) · dữ liệu ≤ 60 ngày luôn được khóa bảo vệ`;
  const selectedBytes=document.getElementById('stSelectedBytes');
  if (selectedBytes) selectedBytes.textContent=formatStorageBytes(bytes);
  const button=document.getElementById('btnStorageCleanup');
  if (button) button.disabled=storageUsageLoading||!selected.length;
  const history=management?.history||[];
  const historyEl=document.getElementById('stHistory');
  const historySummary=document.getElementById('stHistorySummary');
  if (historySummary) historySummary.textContent=history.length?`Đã giải phóng trong lịch sử: ${formatStorageBytes(history.reduce((sum,item)=>sum+(Number(item.sizeBytes)||0),0))}`:'Chưa có tác vụ xóa.';
  if (historyEl) historyEl.innerHTML=history.length?history.map(item=>`<div class="storage-history-row"><span><strong>${esc(item.label)}</strong><small>${esc(new Date(item.at).toLocaleString('vi-VN'))} · ${esc(item.provider||'GitHub')} · API</small></span><span class="pill p-green">−${formatStorageBytes(item.sizeBytes)}</span></div>`).join(''):'<div class="storage-history-row"><span class="muted">Lịch sử sẽ xuất hiện sau lần giải phóng đầu tiên.</span></div>';
}

function toggleStorageCleanup(key,checked) {
  if (checked) storageCleanupSelection.add(key); else storageCleanupSelection.delete(key);
  renderStorageManagement();
}

function toggleSelectAllStorage(checked) {
  getVisibleCandidates().filter(item=>item.eligible&&!item.locked).forEach(item=>{
    const key=`${item.kind}:${item.id}`;
    if (checked) storageCleanupSelection.add(key); else storageCleanupSelection.delete(key);
  });
  renderStorageManagement();
}

async function saveStorageSettings() {
  if (storagePolicySaving) return;
  storagePolicySaving=true;
  const status=document.getElementById('stPolicyStatus');
  if (status) status.textContent='Đang lưu…';
  try {
    const response=await productionApiFetch('/api/storage/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({retentionDays:Number(document.getElementById('stRetRange').value),threshold:Number(document.getElementById('stThresholdRange').value),autoFree:document.getElementById('stAutoFree').checked})});
    if (!response.ok) throw new Error('SETTINGS_FAILED');
    const result=await response.json();
    if (storageUsageStatus?.management) storageUsageStatus.management.policy=result.policy;
    if (status) status.textContent='Đã lưu cấu hình.';
    renderStorageManagement();
  } catch {
    if (status) status.textContent='Chưa lưu được. Kiểm tra quyền Admin và KV.';
  } finally {storagePolicySaving=false;}
}

async function cleanupStorageNow() {
  if (storageUsageLoading||!storageCleanupSelection.size) return;
  const ids=getVisibleCandidates().filter(item=>item.eligible&&!item.locked&&storageCleanupSelection.has(`${item.kind}:${item.id}`)).map(item=>`${item.kind}:${item.id}`);
  if (!ids.length) return;
  storageUsageLoading=true;
  storageUsageError='';
  renderStorageManagement();
  try {
    const response=await productionApiFetch('/api/storage/cleanup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
    if (!response.ok) throw new Error('CLEANUP_FAILED');
    const result=await response.json();
    if (!Number.isSafeInteger(result.deleted)||result.deleted<0||!Number.isFinite(result.freedBytes)||result.freedBytes<0||!Array.isArray(result.history)) throw new Error('CLEANUP_INVALID');
    storageUsageStatus.management.history=result.history;
    storageCleanupSelection.clear();
    toast(result.deleted?`Đã giải phóng ${formatStorageBytes(result.freedBytes)} từ ${result.deleted} mục kỹ thuật.`:'Không có mục quá hạn để giải phóng.');
    storageUsageLoading=false;
    await checkQuotaNow(true);
  } catch {
    storageUsageError='Chưa thể giải phóng. Kiểm tra GITHUB_USAGE_TOKEN và quyền Actions.';
  } finally {
    storageUsageLoading=false;
    renderStorageProviders();
  }
}

async function checkQuotaNow(force=true) {
  if (!isAdmin()||storageUsageLoading) return;
  storageUsageLoading=true;
  storageUsageError='';
  renderStorageProviders();
  try {
    const response=await productionApiFetch('/api/storage/usage'+(force?'?refresh=1':''),{signal:AbortSignal.timeout(25000)});
    if (!response.ok) throw new Error('USAGE_UNAVAILABLE');
    const result=await response.json();
    if (!Array.isArray(result.providers)||!result.checkedAt) throw new Error('USAGE_INVALID');
    storageUsageStatus=result;
    if (result.management?.policy) Object.assign(state.storage,result.management.policy);
    storageCleanupInitialized=false;
  } catch {
    storageUsageError='Chưa cập nhật được thống kê. Số liệu lần trước được giữ lại; hãy kiểm tra kết nối và thử lại.';
  } finally {
    storageUsageLoading=false;
    renderStorageProviders();
  }
}
