let storageUsageStatus = null;
let storageUsageLoading = false;
let storageUsageError = '';

const STORAGE_PLATFORMS = [
  {id:'github',name:'GitHub',icon:'box',role:'Mã nguồn và bản phát hành',url:'https://github.com/sellerhunghienhoa/sellerkhangbaby/releases',metrics:[{id:'repository',label:'Kho mã nguồn',used:null,limit:null},{id:'releases',label:'Tệp đính kèm 5 bản phát hành mới nhất',used:null,limit:null}],note:'Kho mã nguồn và Releases được đo riêng; không phải tổng GitHub Actions.'},
  {id:'firebase',name:'Firebase',icon:'db',role:'Dữ liệu nghiệp vụ Firestore',url:'https://console.firebase.google.com/project/sellerkhangbaby/firestore/usage',metrics:[{id:'documents',label:'Dữ liệu tài liệu đọc được (ước tính)',used:null,limit:null}],note:'Ước tính từ JSON tài liệu; mở Firebase Console để xem dung lượng chính xác gồm chỉ mục.'},
  {id:'cloudflare',name:'Cloudflare',icon:'cloud',role:'KV và website đang chạy',url:'https://dash.cloudflare.com/1bda853cb67674a5c4e8d5a6c2152b5c/workers/services/view/sellerkhangbaby-live-kpi/production',metrics:[{id:'kv',label:'KV OAuth của dự án',used:null,limit:10**9},{id:'assets',label:'Website đã triển khai',used:null,limit:null}],note:'KV Free 1 GB dùng chung tài khoản; thẻ này chỉ đo namespace OAuth và bundle website của dự án.'}
];

function storagePlatforms() {
  return STORAGE_PLATFORMS.map(platform=>{
    const live=storageUsageStatus?.providers?.find(item=>item.id===platform.id);
    const source=live?.metrics?.length?live.metrics:platform.metrics;
    const metrics=new Map(source.map(metric=>[metric.id,{used:null,...metric}]));
    return {plan:'Free',...platform,...live,metrics:[...metrics.values()]};
  });
}
function formatStoragePercent(value) {
  if (!Number.isFinite(value)) return '';
  if (value > 0 && value < .1) return '<0,1%';
  return value < 10 ? value.toLocaleString('vi-VN',{maximumFractionDigits:1})+'%' : Math.round(value)+'%';
}
function formatStorageBytes(value) {
  if (!Number.isFinite(value)) return 'Chưa có số liệu';
  const units=['B','KiB','MiB','GiB'];
  const exponent=value>0?Math.min(3,Math.floor(Math.log(value)/Math.log(1024))):0;
  return (value/1024**exponent).toLocaleString('vi-VN',{maximumFractionDigits:2})+' '+units[Math.max(0,exponent)];
}
function renderStorageProviders() {
  const errors={PERMISSION_DENIED:'Chưa có quyền đọc thống kê.',RATE_LIMITED:'Đã chạm giới hạn API; hãy thử lại sau.',INVALID_SERVICE_ACCOUNT:'Thông tin Service Account chưa đúng.',NO_METRICS:'Nền tảng chưa trả số đo trong khoảng gần nhất.',PERMISSION_OR_QUERY_ERROR:'Chưa đọc được Analytics; kiểm tra quyền token.',PROVIDER_UNAVAILABLE:'Chưa truy cập được API thống kê.'};
  document.getElementById('stProviders').innerHTML=storagePlatforms().map(provider=>`<article class="card storage-provider" data-provider="${provider.id}">
    <div class="card-h"><div class="card-h-l"><div class="card-ic ${provider.id==='github'?'gray':provider.id==='firebase'?'amber':'pink'}">${ic(provider.id==='github'?'github':provider.id==='firebase'?'flame':'cloud',20)}</div><div><div class="h-title">${esc(provider.name)} <span class="pill p-gray">${provider.id==='firebase'?'Spark (Free)':'Free'}</span></div><div class="h-sub">${esc(provider.role)}</div></div></div></div>
    <span class="pill ${provider.status==='ready'?'p-green':'p-amber'} storage-provider-status">${storageUsageLoading?'Đang kiểm tra…':provider.status==='ready'?'Đã đo':provider.status==='needs_setup'?'Cần kết nối':'Không đọc được'}</span>
    ${provider.metrics.map(metric=>{
      const known=Number.isFinite(metric.used)&&metric.used>=0;
      const limited=Number.isFinite(metric.limit)&&metric.limit>0;
      const pct=known&&limited?metric.used/metric.limit*100:null;
      const format=value=>metric.unit && metric.unit!=='bytes'?value.toLocaleString('vi-VN')+' '+metric.unit:formatStorageBytes(value);
      const bar=pct===null?0:pct>0?Math.max(2,Math.min(100,pct)):0;
      return `<div class="storage-metric"><div class="storage-metric-row"><strong>${esc(metric.label)}</strong><span class="num">${known?format(metric.used):'—'}${limited?' / '+format(metric.limit):''}${pct===null?'':' ('+formatStoragePercent(pct)+')'}</span></div><div class="prog ${pct!==null&&pct>=90?'crit':pct!==null&&pct>=75?'warn':''}"><span style="width:${bar}%"></span></div><div class="muted storage-metric-note">${esc(metric.note || (known?'Số liệu chỉ đọc của dự án.':'Chưa đọc được số liệu này.'))}</div></div>`;
    }).join('')}
    <div class="storage-provider-foot"><span class="muted">${esc(provider.source || (provider.id==='github'?'GitHub REST API':provider.id==='firebase'?'Firestore':'Cloudflare bindings'))}</span><a href="${provider.url}" target="_blank" rel="noopener noreferrer">Mở ${provider.name}</a></div>
    <details class="storage-config"><summary>Nguồn và giới hạn</summary><p class="muted">${esc(provider.note)}</p>${provider.missing?.length?`<p>Cần: ${provider.missing.map(name=>`<code>${esc(name)}</code>`).join(', ')}.</p>`:''}${provider.error?`<p>${esc(errors[provider.error]||errors.PROVIDER_UNAVAILABLE)}</p>`:''}<a href="https://github.com/sellerhunghienhoa/sellerkhangbaby/blob/main/docs/STORAGE_USAGE.md" target="_blank" rel="noopener noreferrer">Xem cách tính</a></details>
  </article>`).join('');
  const status=document.getElementById('stUsageStatus');
  status.textContent=storageUsageError || (storageUsageLoading?'Đang đọc thống kê từ các nền tảng…':storageUsageStatus?`Kiểm tra lúc ${new Date(storageUsageStatus.checkedAt).toLocaleString('vi-VN')}. Số liệu API có độ trễ; chỉ phần đã cấp quyền được cập nhật.`:'Chưa đọc thống kê. Bấm “Kiểm tra dung lượng” để cập nhật.');
  document.querySelectorAll('[data-storage-refresh]').forEach(button=>button.disabled=storageUsageLoading);
}

async function checkQuotaNow() {
  if (!isAdmin() || storageUsageLoading) return;
  storageUsageLoading=true;
  storageUsageError='';
  renderStorage();
  try {
    const response=await productionApiFetch('/api/storage/usage',{signal:AbortSignal.timeout(25000)});
    if (!response.ok) throw new Error('USAGE_UNAVAILABLE');
    const result=await response.json();
    if (!Array.isArray(result.providers)||!result.checkedAt) throw new Error('USAGE_INVALID');
    storageUsageStatus=result;
  } catch {
    storageUsageError='Chưa cập nhật được thống kê. Số liệu lần trước được giữ lại; hãy kiểm tra kết nối và thử lại.';
  } finally {
    storageUsageLoading=false;
    renderStorage();
  }
}
