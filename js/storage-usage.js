let storageUsageStatus = null;
let storageUsageLoading = false;
let storageUsageError = '';

const STORAGE_PLATFORMS = [
  {id:'github',name:'GitHub',icon:'box',role:'Mã nguồn và bản phát hành',url:'https://github.com/sellerhunghienhoa/sellerkhangbaby/releases',metrics:[{id:'repository',label:'Kho mã nguồn',used:null,limit:null},{id:'releases',label:'Tệp đính kèm 5 bản phát hành mới nhất',used:null,limit:null}],note:'Kho mã nguồn và Releases được đo riêng; không phải tổng GitHub Actions.'},
  {id:'firebase',name:'Firebase',icon:'db',role:'Dữ liệu nghiệp vụ Firestore',url:'https://console.firebase.google.com/project/sellerkhangbaby/firestore/usage',metrics:[{id:'firestore',label:'Firestore: dữ liệu và chỉ mục',used:null,limit:2**30}],note:'Hạn mức Spark: 1 GiB Firestore. Chưa bao gồm Cloud Storage.'},
  {id:'cloudflare',name:'Cloudflare',icon:'cloud',role:'KV lưu kết nối TikTok',url:'https://dash.cloudflare.com/1bda853cb67674a5c4e8d5a6c2152b5c/workers/kv/namespaces/3a78cf302fa64cc4b8b8a3f62c2cb96e',metrics:[{id:'kv',label:'KV OAuth của dự án',used:null,limit:10**9}],note:'KV Free: 1 GB dùng chung tài khoản. Không gồm Workers requests và static assets.'}
];

function storagePlatforms() {
  const reference = {
    github:[{id:'artifacts',label:'Actions artifacts',limit:500*1024**2,note:'Hạn mức tham chiếu GitHub Free; chưa đọc Actions API.'},{id:'cache',label:'Actions cache',limit:10*1024**3,note:'Cache tách riêng artifacts; cần quyền Actions: Read.'},{id:'minutes',label:'Actions phút / tháng',unit:'phút',limit:2000,note:'Repo công khai dùng runner tiêu chuẩn không trừ hạn mức này.'}],
    firebase:[{id:'hosting',label:'Hosting lưu trữ',limit:10*1024**3,inactive:true,note:'Website đang chạy Cloudflare, chưa dùng Firebase Hosting.'},{id:'reads',label:'Lượt đọc / ngày',unit:'lượt',limit:50000,note:'Cần số đo Firestore Usage theo ngày Pacific.'},{id:'writes',label:'Lượt ghi / ngày',unit:'lượt',limit:20000,note:'Cần số đo Firestore Usage theo ngày Pacific.'}],
    cloudflare:[{id:'d1',label:'D1 database',limit:5*10**9,inactive:true,note:'Dự án chưa có binding D1.'},{id:'r2',label:'R2 lưu trữ',limit:10*10**9,inactive:true,note:'Dự án chưa có binding R2.'},{id:'requests',label:'Workers request / ngày',unit:'request',limit:100000,note:'Hạn mức Free; chưa đọc Workers Analytics.'}]
  };
  return STORAGE_PLATFORMS.map(platform=>{
    const live=storageUsageStatus?.providers?.find(item=>item.id===platform.id);
    const metrics=new Map([...platform.metrics,...reference[platform.id]].map(metric=>[metric.id,{used:null,...metric}]));
    (live?.metrics||[]).forEach(metric=>metrics.set(metric.id,{...metrics.get(metric.id),...metric}));
    return {plan:'Free',...platform,...live,metrics:[...metrics.values()]};
  });
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
    <span class="pill ${provider.status==='ready'?'p-green':'p-amber'} storage-provider-status">${provider.status==='ready'?'Có số liệu API':storageUsageLoading?'Đang kiểm tra…':'Chưa có số liệu'}</span>
    ${provider.metrics.map(metric=>{
      const known=Number.isFinite(metric.used)&&metric.used>=0;
      const limited=Number.isFinite(metric.limit)&&metric.limit>0;
      const pct=known&&limited?metric.used/metric.limit*100:null;
      const format=value=>metric.unit && metric.unit!=='bytes'?value.toLocaleString('vi-VN')+' '+metric.unit:formatStorageBytes(value);
      return `<div class="storage-metric"><div class="storage-metric-row"><strong>${esc(metric.label)}</strong><span class="num">${metric.inactive?'Chưa sử dụng':known?format(metric.used):'—'}${limited?' / '+format(metric.limit):''}${pct===null?'':' ('+Math.round(pct)+'%)'}</span></div><div class="prog ${pct!==null&&pct>=90?'crit':pct!==null&&pct>=75?'warn':''}"><span style="width:${pct===null?0:Math.min(100,pct)}%"></span></div><div class="muted storage-metric-note">${esc(metric.note || (known?'Số liệu API của dự án.':'Chưa có số liệu; cần quyền đọc thống kê.'))}</div></div>`;
    }).join('')}
    <div class="storage-provider-foot"><span class="muted">${provider.id==='github'?'GitHub REST API · repo & Releases':provider.id==='firebase'?'Firebase / Cloud Monitoring':'Cloudflare GraphQL Analytics'}</span><button type="button" class="btn btn-soft sm" disabled title="Chưa kích hoạt quyền xóa; không xóa dữ liệu đối soát">${ic('trash',13)}Dọn nhanh ${provider.name}</button></div>
    <details class="storage-config"><summary>Cấu hình và nguồn số liệu</summary><p class="muted">${esc(provider.note)}</p>${provider.missing?.length?`<p>Cần Secret: ${provider.missing.map(name=>`<code>${esc(name)}</code>`).join(', ')}.</p>`:''}${provider.error?`<p>${esc(errors[provider.error]||errors.PROVIDER_UNAVAILABLE)}</p>`:''}<a href="${provider.url}" target="_blank" rel="noopener noreferrer">Mở ${provider.name}</a> · <a href="https://github.com/sellerhunghienhoa/sellerkhangbaby/blob/main/docs/STORAGE_USAGE.md" target="_blank" rel="noopener noreferrer">Hướng dẫn cấu hình</a></details>
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
