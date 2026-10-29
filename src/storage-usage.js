const PROJECT = 'sellerkhangbaby';
const ACCOUNT = '1bda853cb67674a5c4e8d5a6c2152b5c';
const NAMESPACE = '3a78cf302fa64cc4b8b8a3f62c2cb96e';
const REPO = 'sellerhunghienhoa/sellerkhangbaby';
let usageCache = null;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function readJson(url, options = {}) {
  const response = await fetch(url, {...options,redirect:'manual',signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error(response.status===401||response.status===403?'PERMISSION_DENIED':response.status===429?'RATE_LIMITED':'PROVIDER_UNAVAILABLE');
  return response.json();
}

const metric = (id,label,used,limit=null,note='') => ({id,label,used,limit,unit:'bytes',note});
function emptyProviders() {
  return [
    {id:'github',name:'GitHub',status:'unavailable',metrics:[metric('repository','Kho mã nguồn',null),metric('releases','Tệp đính kèm 5 bản phát hành mới nhất',null)],note:'Dung lượng mã nguồn và Releases riêng của dự án; không phải tổng GitHub Actions.'},
    {id:'firebase',name:'Firebase',status:'unavailable',metrics:[metric('documents','Dữ liệu tài liệu đọc được (ước tính)',null)],note:'Ưu tiên số đo Cloud Monitoring; nếu chưa có Service Account, ứng dụng hiển thị kích thước JSON tài liệu đọc được bằng quyền Admin hiện tại.'},
    {id:'cloudflare',name:'Cloudflare',status:'unavailable',metrics:[metric('kv','KV OAuth của dự án',null,10**9),metric('assets','Website đã triển khai',null)],note:'Đọc trực tiếp binding KV và manifest bản deploy; không cần tạo API token chỉ để xem dung lượng của dự án.'}
  ];
}

async function githubUsage(provider,env) {
  const headers = {'Accept':'application/vnd.github+json','User-Agent':'SellerKhangBaby-Usage'};
  if (env.GITHUB_USAGE_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_USAGE_TOKEN}`;
  const [repo,releases] = await Promise.all([
    readJson(`https://api.github.com/repos/${REPO}`,{headers}),
    readJson(`https://api.github.com/repos/${REPO}/releases?per_page=5`,{headers})
  ]);
  if (!Number.isFinite(repo.size)||!Array.isArray(releases)) throw new Error('INVALID_RESPONSE');
  provider.metrics[0].used = repo.size * 1024;
  provider.metrics[1].used = releases.reduce((total,release)=>total+(release.assets||[]).reduce((size,asset)=>size+(Number(asset.size)||0),0),0);
  provider.status='ready';
}

async function cloudflareAnalyticsUsage(provider,env) {
  if (!env.CLOUDFLARE_USAGE_API_TOKEN) return false;
  const today=new Date().toISOString().slice(0,10);
  const start=new Date(Date.now()-3*86400000).toISOString().slice(0,10);
  const data=await readJson('https://api.cloudflare.com/client/v4/graphql',{
    method:'POST',headers:{Authorization:`Bearer ${env.CLOUDFLARE_USAGE_API_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify({query:`query($account: string!, $namespace: string!, $start: Date!, $end: Date!) { viewer { accounts(filter: {accountTag: $account}) { kvStorageAdaptiveGroups(filter: {namespaceId: $namespace, date_geq: $start, date_leq: $end}, limit: 1, orderBy: [date_DESC]) { max { byteCount } dimensions { date } } } } }`,variables:{account:ACCOUNT,namespace:NAMESPACE,start,end:today}})
  });
  if (data.errors?.length) throw new Error('PERMISSION_OR_QUERY_ERROR');
  const row=data.data?.viewer?.accounts?.[0]?.kvStorageAdaptiveGroups?.[0];
  if (!row || !Number.isFinite(row.max?.byteCount)) throw new Error('NO_METRICS');
  provider.metrics[0].used=row.max.byteCount;
  provider.measuredAt=row.dimensions.date;
  provider.status='ready';
  provider.missing=[];
  return true;
}

async function cloudflareBindingUsage(provider,env) {
  if (!env.TIKTOK_OAUTH_KV?.list || !env.TIKTOK_OAUTH_KV?.get) return false;
  let cursor;
  let used=0;
  let count=0;
  do {
    const page=await env.TIKTOK_OAUTH_KV.list({limit:1000,...(cursor?{cursor}:{})});
    if (!Array.isArray(page?.keys)) throw new Error('PROVIDER_UNAVAILABLE');
    for (let offset=0;offset<page.keys.length;offset+=20) {
      const values=await Promise.all(page.keys.slice(offset,offset+20).map(key=>env.TIKTOK_OAUTH_KV.get(key.name,{type:'arrayBuffer'})));
      values.forEach(value=>{ if (Number.isSafeInteger(value?.byteLength)) used+=value.byteLength; });
    }
    count+=page.keys.length;
    if (count>5000) throw new Error('PROVIDER_UNAVAILABLE');
    cursor=page.list_complete?undefined:page.cursor;
  } while (cursor);
  const kv=provider.metrics.find(item=>item.id==='kv');
  kv.used=used;
  kv.note=`${count.toLocaleString('vi-VN')} bản ghi mã hóa trong namespace OAuth của dự án.`;
  if (env.ASSETS?.fetch) {
    try {
      const response=await env.ASSETS.fetch(new Request('https://assets.local/storage-manifest.json'));
      if (response.ok) {
        const manifest=await response.json();
        const assets=provider.metrics.find(item=>item.id==='assets');
        if (Number.isSafeInteger(manifest.bytes)&&manifest.bytes>=0) {
          assets.used=manifest.bytes;
          assets.note=`${Number(manifest.files||0).toLocaleString('vi-VN')} tệp tĩnh trong bản đang chạy.`;
        }
      }
    } catch { /* KV remains a valid platform measurement. */ }
  }
  provider.status='ready';
  provider.missing=[];
  provider.source='Cloudflare bindings';
  return true;
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
async function firebaseMonitoringUsage(provider,env) {
  if (!env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON) return;
  let account;
  try { account=JSON.parse(env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON); } catch { throw new Error('INVALID_SERVICE_ACCOUNT'); }
  if (account.project_id!==PROJECT || !account.client_email || !account.private_key) throw new Error('INVALID_SERVICE_ACCOUNT');
  const encode=value=>base64url(new TextEncoder().encode(JSON.stringify(value)));
  const now=Math.floor(Date.now()/1000);
  const unsigned=`${encode({alg:'RS256',typ:'JWT'})}.${encode({iss:account.client_email,scope:'https://www.googleapis.com/auth/monitoring.read',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})}`;
  const pem=account.private_key.replace(/-----[^-]+-----|\s/g,'');
  const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),char=>char.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned));
  const token=await readJson('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${unsigned}.${base64url(new Uint8Array(signature))}`})});
  if (!token.access_token) throw new Error('PERMISSION_DENIED');
  const url=new URL(`https://monitoring.googleapis.com/v3/projects/${PROJECT}/timeSeries`);
  url.searchParams.set('filter','metric.type="firestore.googleapis.com/storage/data_and_index_storage_bytes" AND resource.type="firestore.googleapis.com/Database" AND resource.labels.database_id="(default)"');
  url.searchParams.set('interval.startTime',new Date(Date.now()-86400000).toISOString());
  url.searchParams.set('interval.endTime',new Date().toISOString());
  url.searchParams.set('pageSize','10');
  const data=await readJson(url.toString(),{headers:{Authorization:`Bearer ${token.access_token}`}});
  const points=(data.timeSeries||[]).flatMap(series=>series.points||[]).sort((a,b)=>b.interval.endTime.localeCompare(a.interval.endTime));
  const point=points[0];
  const used=point?.value?.int64Value ?? point?.value?.doubleValue;
  if (used===undefined || !Number.isFinite(Number(used))) throw new Error('NO_METRICS');
  provider.metrics=[metric('firestore','Firestore: dữ liệu và chỉ mục',Number(used),2**30,'Số đo chính xác từ Cloud Monitoring; gồm dữ liệu và chỉ mục.')];
  provider.measuredAt=point.interval.endTime;
  provider.status='ready';
  provider.missing=[];
  provider.source='Cloud Monitoring';
}

async function firestoreDocumentEstimate(provider,idToken) {
  if (!idToken) return false;
  const headers={Authorization:`Bearer ${idToken}`};
  const urls=[`${FIRESTORE_BASE}/production/dashboard`,`${FIRESTORE_BASE}/users?pageSize=300`,`${FIRESTORE_BASE}/production/sellerOrderDays/days?pageSize=1000`];
  let used=0;
  let documents=0;
  for (const url of urls) {
    const response=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(10000)});
    if (response.status===404) continue;
    if (!response.ok) throw new Error(response.status===401||response.status===403?'PERMISSION_DENIED':'PROVIDER_UNAVAILABLE');
    const text=await response.text();
    used+=new TextEncoder().encode(text).byteLength;
    const payload=JSON.parse(text);
    documents+=Array.isArray(payload.documents)?payload.documents.length:payload.name?1:0;
  }
  provider.metrics=[metric('documents','Dữ liệu tài liệu đọc được (ước tính)',used,null,`${documents.toLocaleString('vi-VN')} tài liệu; đây là kích thước JSON phản hồi, không phải số billing gồm chỉ mục.`)];
  provider.status='ready';
  provider.missing=[];
  provider.source='Firestore REST · quyền Admin';
  provider.note='Ước tính từ JSON tài liệu ứng dụng đọc được. Mở Firebase Console để xem số lưu trữ chính xác gồm dữ liệu và chỉ mục.';
  return true;
}

export async function getStorageUsage(env,options={}) {
  // Runtime-only cache: measurements never overwrite Firebase business data.
  if (usageCache && usageCache.expires>Date.now() && usageCache.cfKey===env.CLOUDFLARE_USAGE_API_TOKEN && usageCache.googleKey===env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON && usageCache.githubKey===env.GITHUB_USAGE_TOKEN && usageCache.kvBound===Boolean(env.TIKTOK_OAUTH_KV) && usageCache.firebaseDirect===Boolean(options.firebaseIdToken)) return usageCache.value;
  const providers=emptyProviders();
  await Promise.all(providers.map(async provider=>{
    try {
      if (provider.id==='github') await githubUsage(provider,env);
      if (provider.id==='firebase') {
        if (env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON) await firebaseMonitoringUsage(provider,env);
        else await firestoreDocumentEstimate(provider,options.firebaseIdToken);
      }
      if (provider.id==='cloudflare') {
        if (!await cloudflareBindingUsage(provider,env)) await cloudflareAnalyticsUsage(provider,env);
      }
      if (provider.status==='unavailable') {
        provider.status='needs_setup';
        provider.missing=provider.id==='firebase'?['Đăng nhập lại bằng tài khoản Admin']:provider.id==='cloudflare'?['TIKTOK_OAUTH_KV binding']:[];
      }
    }
    catch(error) {
      provider.status='unavailable';
      provider.error=['PERMISSION_DENIED','RATE_LIMITED','INVALID_SERVICE_ACCOUNT','NO_METRICS','PERMISSION_OR_QUERY_ERROR'].includes(error.message)?error.message:'PROVIDER_UNAVAILABLE';
      if (provider.id==='github' && !env.GITHUB_USAGE_TOKEN) provider.missing=['GITHUB_USAGE_TOKEN (chỉ cần khi API công khai bị giới hạn)'];
    }
  }));
  const value={checkedAt:new Date().toISOString(),providers};
  usageCache={expires:Date.now()+5*60000,cfKey:env.CLOUDFLARE_USAGE_API_TOKEN,googleKey:env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON,githubKey:env.GITHUB_USAGE_TOKEN,kvBound:Boolean(env.TIKTOK_OAUTH_KV),firebaseDirect:Boolean(options.firebaseIdToken),value};
  return value;
}
