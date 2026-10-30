const PROJECT = 'sellerkhangbaby';
const ACCOUNT = '1bda853cb67674a5c4e8d5a6c2152b5c';
const NAMESPACE = '3a78cf302fa64cc4b8b8a3f62c2cb96e';
const REPO = 'sellerhunghienhoa/sellerkhangbaby';
let usageCache = null;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const STORAGE_POLICY_KEY = 'storage:cleanup:policy';
const STORAGE_HISTORY_KEY = 'storage:cleanup:history';
const MIN_RETENTION_DAYS = 60;
const DEFAULT_POLICY = {retentionDays:90,threshold:85,autoFree:false};

async function readJson(url, options = {}) {
  const response = await fetch(url, {...options,redirect:'manual',signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error(response.status===401||response.status===403?'PERMISSION_DENIED':response.status===429?'RATE_LIMITED':'PROVIDER_UNAVAILABLE');
  return response.json();
}

const metric = (id,label,used,limit=null,note='') => ({id,label,used,limit,unit:'bytes',note});

function validPolicy(value={}) {
  const retentionDays=Math.round(Number(value.retentionDays));
  const threshold=Math.round(Number(value.threshold));
  return {
    retentionDays:Number.isFinite(retentionDays)?Math.max(MIN_RETENTION_DAYS,Math.min(180,retentionDays)):DEFAULT_POLICY.retentionDays,
    threshold:Number.isFinite(threshold)?Math.max(50,Math.min(100,threshold)):DEFAULT_POLICY.threshold,
    autoFree:value.autoFree===true
  };
}

async function readKvJson(env,key,fallback) {
  if (!env.TIKTOK_OAUTH_KV?.get) return fallback;
  try {
    const value=await env.TIKTOK_OAUTH_KV.get(key);
    return value?JSON.parse(value):fallback;
  } catch { return fallback; }
}

export async function getStoragePolicy(env) {
  return validPolicy(await readKvJson(env,STORAGE_POLICY_KEY,DEFAULT_POLICY));
}

export async function saveStoragePolicy(env,value) {
  if (!env.TIKTOK_OAUTH_KV?.put) throw new Error('STORAGE_SETTINGS_UNAVAILABLE');
  const policy=validPolicy(value);
  await env.TIKTOK_OAUTH_KV.put(STORAGE_POLICY_KEY,JSON.stringify(policy));
  usageCache=null;
  return policy;
}

function githubHeaders(env) {
  return {'Accept':'application/vnd.github+json','User-Agent':'SellerKhangBaby-Usage',...(env.GITHUB_USAGE_TOKEN?{Authorization:`Bearer ${env.GITHUB_USAGE_TOKEN}`}:{})};
}

async function githubCleanupCandidates(env,policy,now=Date.now()) {
  if (!env.GITHUB_USAGE_TOKEN) return {supported:false,missing:['GITHUB_USAGE_TOKEN'],items:[]};
  const headers=githubHeaders(env);
  const pages=async(path,key)=>{
    const rows=[];
    for (let page=1;page<=10;page++) {
      const data=await readJson(`https://api.github.com/repos/${REPO}${path}?per_page=100&page=${page}`,{headers});
      const batch=Array.isArray(data[key])?data[key]:[];
      rows.push(...batch);
      if (batch.length<100) break;
    }
    return rows;
  };
  const [artifacts,caches]=await Promise.all([pages('/actions/artifacts','artifacts'),pages('/actions/caches','actions_caches')]);
  const cutoff=now-policy.retentionDays*86400000;
  const items=[
    ...artifacts.map(item=>({id:String(item.id),kind:'artifact',provider:'github',label:item.name||'GitHub Actions artifact',sizeBytes:Number(item.size_in_bytes)||0,date:item.created_at||'',eligible:Date.parse(item.created_at)<cutoff})),
    ...caches.map(item=>({id:String(item.id),kind:'cache',provider:'github',label:item.key||'GitHub Actions cache',sizeBytes:Number(item.size_in_bytes)||0,date:item.last_accessed_at||'',eligible:Date.parse(item.last_accessed_at)<cutoff}))
  ];
  return {supported:true,missing:[],items};
}

export async function getStorageManagement(env,options={}) {
  const policy=await getStoragePolicy(env);
  let github={supported:false,missing:['GITHUB_USAGE_TOKEN'],items:[]};
  try { github=await githubCleanupCandidates(env,policy,options.now); }
  catch { github={supported:false,missing:['GITHUB_USAGE_TOKEN có quyền Actions'],items:[]}; }
  const history=await readKvJson(env,STORAGE_HISTORY_KEY,[]);
  return {policy,protectedDays:MIN_RETENTION_DAYS,providers:[
    {id:'github',cleanupMode:github.supported?'automatic':'requires_setup',...github},
    {id:'firebase',supported:false,cleanupMode:'monitor_only',missing:['Dữ liệu nghiệp vụ được bảo vệ'],items:[]},
    {id:'cloudflare',supported:false,cleanupMode:'monitor_only',missing:['KV chứa cấu hình và token TikTok được bảo vệ'],items:[]}
  ],history:Array.isArray(history)?history.slice(0,20):[]};
}

export async function cleanupStorage(env,options={}) {
  const management=await getStorageManagement(env,options);
  const provider=management.providers.find(item=>item.id==='github');
  if (!provider.supported) throw new Error('STORAGE_CLEANUP_UNAVAILABLE');
  const requested=Array.isArray(options.ids)?new Set(options.ids.map(String)):null;
  const eligible=provider.items.filter(item=>item.eligible&&(!requested||requested.has(`${item.kind}:${item.id}`)));
  const headers=githubHeaders(env);
  const deleted=[];
  for (const item of eligible) {
    const response=await fetch(`https://api.github.com/repos/${REPO}/actions/${item.kind==='artifact'?'artifacts':'caches'}/${encodeURIComponent(item.id)}`,{method:'DELETE',headers,redirect:'manual',signal:AbortSignal.timeout(10000)});
    if (!response.ok && response.status!==404) throw new Error('PROVIDER_UNAVAILABLE');
    deleted.push({...item,at:new Date(options.now||Date.now()).toISOString()});
  }
  const history=[...deleted,...management.history].slice(0,20);
  if (env.TIKTOK_OAUTH_KV?.put) await env.TIKTOK_OAUTH_KV.put(STORAGE_HISTORY_KEY,JSON.stringify(history));
  usageCache=null;
  return {deleted:deleted.length,freedBytes:deleted.reduce((sum,item)=>sum+item.sizeBytes,0),protectedDays:management.policy.retentionDays,history};
}
function emptyProviders() {
  return [
    {id:'github',name:'GitHub',status:'unavailable',metrics:[metric('repository','Kho mã nguồn',null),metric('releases','Tệp đính kèm 5 bản phát hành mới nhất',null)],note:'Dung lượng mã nguồn và Releases riêng của dự án; không phải tổng GitHub Actions.'},
    {id:'firebase',name:'Firebase',status:'unavailable',metrics:[metric('documents','Dữ liệu tài liệu đọc được (ước tính)',null)],note:'Ưu tiên số đo Cloud Monitoring; nếu chưa có Service Account, ứng dụng hiển thị kích thước JSON tài liệu đọc được bằng quyền Admin hiện tại.'},
    {id:'cloudflare',name:'Cloudflare',status:'unavailable',metrics:[metric('kv','Workers KV của dự án',null,10**9),metric('assets','Website đã triển khai',null)],note:'Đọc trực tiếp binding KV và manifest bản deploy; không cần tạo API token chỉ để xem dung lượng của dự án.'}
  ];
}

async function githubUsage(provider,env) {
  const headers = githubHeaders(env);
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
  kv.note=`${count.toLocaleString('vi-VN')} bản ghi trong namespace của dự án; token TikTok vẫn được mã hóa.`;
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
  const targets=[
    {url:`${FIRESTORE_BASE}/production/dashboard`},
    {url:`${FIRESTORE_BASE}/production/staffDashboard`},
    {url:`${FIRESTORE_BASE}/users?pageSize=1000`,collection:true},
    {url:`${FIRESTORE_BASE}/production/sellerOrderDays/days?pageSize=1000`,collection:true},
    {url:`${FIRESTORE_BASE}/production/sellerOrderSnapshots/chunks?pageSize=20`,collection:true}
  ];
  let used=0;
  let documents=0;
  for (const target of targets) {
    let pageToken='';
    const seen=new Set();
    do {
      const url=new URL(target.url);
      if (pageToken) url.searchParams.set('pageToken',pageToken);
      const response=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(10000)});
      if (response.status===404) break;
      if (!response.ok) throw new Error(response.status===401||response.status===403?'PERMISSION_DENIED':'PROVIDER_UNAVAILABLE');
      let payload;
      try { payload=await response.json(); } catch { throw new Error('PROVIDER_UNAVAILABLE'); }
      const page=Array.isArray(payload.documents)?payload.documents:payload.name?[payload]:[];
      documents+=page.length;
      used+=page.reduce((bytes,document)=>bytes+new TextEncoder().encode(JSON.stringify(document)).byteLength,0);
      pageToken=target.collection && typeof payload.nextPageToken==='string'?payload.nextPageToken:'';
      if (pageToken && (seen.has(pageToken)||seen.size>=50)) throw new Error('PROVIDER_UNAVAILABLE');
      if (pageToken) seen.add(pageToken);
    } while (pageToken);
  }
  provider.metrics=[{...metric('documents','Dữ liệu tài liệu đọc được (ước tính)',used,null,`${documents.toLocaleString('vi-VN')} tài liệu; đây là kích thước JSON tài liệu, không phải số billing gồm chỉ mục.`),documents}];
  provider.status='ready';
  provider.missing=[];
  provider.source='Firestore REST · quyền Admin';
  provider.note='Ước tính từ JSON tài liệu ứng dụng đọc được. Mở Firebase Console để xem số lưu trữ chính xác gồm dữ liệu và chỉ mục.';
  return true;
}

export async function getStorageUsage(env,options={}) {
  // Runtime-only cache: measurements never overwrite Firebase business data.
  if (!options.force && usageCache && usageCache.expires>Date.now() && usageCache.cfKey===env.CLOUDFLARE_USAGE_API_TOKEN && usageCache.googleKey===env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON && usageCache.githubKey===env.GITHUB_USAGE_TOKEN && usageCache.kvBound===Boolean(env.TIKTOK_OAUTH_KV) && usageCache.firebaseDirect===Boolean(options.firebaseIdToken)) return usageCache.value;
  const providers=emptyProviders();
  await Promise.all(providers.map(async provider=>{
    try {
      if (provider.id==='github') await githubUsage(provider,env);
      if (provider.id==='firebase') {
        if (env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON) {
          try { await firebaseMonitoringUsage(provider,env); }
          catch (monitoringError) {
            if (!await firestoreDocumentEstimate(provider,options.firebaseIdToken)) throw monitoringError;
            provider.warning='MONITORING_FALLBACK';
          }
        } else await firestoreDocumentEstimate(provider,options.firebaseIdToken);
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
  const management=await getStorageManagement(env);
  const githubManagement=management.providers.find(provider=>provider.id==='github');
  if (githubManagement?.supported) providers.find(provider=>provider.id==='github')?.metrics.push(metric('actions','Actions artifacts & cache',githubManagement.items.reduce((sum,item)=>sum+item.sizeBytes,0),500*1024**2,'Tệp kỹ thuật của workflow; các mục cũ hơn thời hạn bảo vệ có thể tự dọn.'));
  const value={checkedAt:new Date().toISOString(),providers,management};
  usageCache={expires:Date.now()+5*60000,cfKey:env.CLOUDFLARE_USAGE_API_TOKEN,googleKey:env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON,githubKey:env.GITHUB_USAGE_TOKEN,kvBound:Boolean(env.TIKTOK_OAUTH_KV),firebaseDirect:Boolean(options.firebaseIdToken),value};
  return value;
}

export async function runAutomaticStorageCleanup(env,options={}) {
  const management=await getStorageManagement(env,options);
  if (!management.policy.autoFree) return {ran:false,reason:'DISABLED'};
  const github=management.providers.find(provider=>provider.id==='github');
  if (!github?.supported) return {ran:false,reason:'GITHUB_NOT_CONFIGURED'};
  const used=github.items.reduce((sum,item)=>sum+item.sizeBytes,0);
  const percent=used/(500*1024**2)*100;
  if (percent<management.policy.threshold) return {ran:false,reason:'BELOW_THRESHOLD',percent};
  return {ran:true,percent,...await cleanupStorage(env,options)};
}
