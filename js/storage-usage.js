let storageUsageStatus = null;
let storageUsageLoading = false;
let storageUsageError = '';

const STORAGE_PLATFORMS = [
  {id:'github',name:'GitHub',icon:'box',role:'Mã nguồn và bản phát hành',url:'https://github.com/sellerhunghienhoa/sellerkhangbaby/releases',metrics:[{id:'repository',label:'Kho mã nguồn',used:null,limit:null},{id:'releases',label:'Tệp đính kèm 5 bản phát hành mới nhất',used:null,limit:null}],note:'Kho mã nguồn và Releases được đo riêng; không phải tổng GitHub Actions.'},
  {id:'firebase',name:'Firebase',icon:'db',role:'Dữ liệu nghiệp vụ Firestore',url:'https://console.firebase.google.com/project/sellerkhangbaby/firestore/usage',metrics:[{id:'firestore',label:'Firestore: dữ liệu và chỉ mục',used:null,limit:2**30}],note:'Hạn mức Spark: 1 GiB Firestore. Chưa bao gồm Cloud Storage.'},
  {id:'cloudflare',name:'Cloudflare',icon:'cloud',role:'KV lưu kết nối TikTok',url:'https://dash.cloudflare.com/1bda853cb67674a5c4e8d5a6c2152b5c/workers/kv/namespaces/3a78cf302fa64cc4b8b8a3f62c2cb96e',metrics:[{id:'kv',label:'KV OAuth của dự án',used:null,limit:10**9}],note:'KV Free: 1 GB dùng chung tài khoản. Không gồm Workers requests và static assets.'}
];

function storagePlatforms() {
  return STORAGE_PLATFORMS.map(platform=>({...platform,...storageUsageStatus?.providers?.find(item=>item.id===platform.id)}));
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
    <div class="card-h"><div class="card-h-l"><div class="card-ic">${ic(provider.icon,20)}</div><div><div class="h-title">${esc(provider.name)}</div><div class="h-sub">${esc(provider.role)}</div></div></div><span class="pill ${provider.status==='ready'?'p-green':'p-amber'}">${provider.status==='ready'?'Đã đọc số liệu':storageUsageLoading?'Đang kiểm tra…':'Chưa có số liệu'}</span></div>
    ${provider.metrics.map(metric=>{
      const known=Number.isFinite(metric.used)&&metric.used>=0;
      const limited=Number.isFinite(metric.limit)&&metric.limit>0;
      const pct=known&&limited?metric.used/metric.limit*100:null;
      return `<div class="storage-metric"><strong>${esc(metric.label)}</strong><div class="num">${known?formatStorageBytes(metric.used):'Chưa có số liệu'}${limited?' / '+formatStorageBytes(metric.limit):''}</div>${pct===null?'':`<div class="prog ${pct>=90?'crit':pct>=75?'warn':''}"><span style="width:${Math.min(100,pct)}%"></span></div><div class="muted">${pct.toLocaleString('vi-VN',{maximumFractionDigits:2})}% hạn mức tham chiếu</div>`}</div>`;
    }).join('')}
    <p class="muted">${esc(provider.note)}</p>
    ${provider.missing?.length?`<p class="storage-setup">Cần thêm Secret tại Cloudflare: ${provider.missing.map(name=>`<code>${esc(name)}</code>`).join(', ')}.</p>`:''}
    ${provider.error?`<p class="storage-setup">${esc(errors[provider.error]||errors.PROVIDER_UNAVAILABLE)}</p>`:''}
    ${provider.measuredAt?`<p class="muted">Thời điểm số đo: ${esc(provider.measuredAt)}</p>`:''}
    <div class="storage-links"><a class="btn btn-ghost sm" href="${provider.url}" target="_blank" rel="noopener noreferrer">Mở ${provider.name}</a><a class="btn-link" href="https://github.com/sellerhunghienhoa/sellerkhangbaby/blob/main/docs/STORAGE_USAGE.md" target="_blank" rel="noopener noreferrer">Hướng dẫn cấu hình</a></div>
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
