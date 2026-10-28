const PROJECT = 'sellerkhangbaby';
const ACCOUNT = '1bda853cb67674a5c4e8d5a6c2152b5c';
const NAMESPACE = '3a78cf302fa64cc4b8b8a3f62c2cb96e';
const REPO = 'sellerhunghienhoa/sellerkhangbaby';
let usageCache = null;

async function readJson(url, options = {}) {
  const response = await fetch(url, {...options,redirect:'manual',signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error(response.status===401||response.status===403?'PERMISSION_DENIED':response.status===429?'RATE_LIMITED':'PROVIDER_UNAVAILABLE');
  return response.json();
}

const metric = (id,label,used,limit=null,note='') => ({id,label,used,limit,unit:'bytes',note});
function emptyProviders() {
  return [
    {id:'github',name:'GitHub',status:'unavailable',metrics:[metric('repository','Kho mã nguồn',null),metric('releases','Tệp đính kèm 5 bản phát hành mới nhất',null)],note:'Dung lượng mã nguồn và Releases riêng của dự án; không phải tổng GitHub Actions.'},
    {id:'firebase',name:'Firebase',status:'needs_setup',missing:['GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON'],metrics:[metric('firestore','Firestore: dữ liệu và chỉ mục',null,2**30)],note:'Hạn mức Spark: 1 GiB Firestore. Số liệu Monitoring có độ trễ; không gồm Cloud Storage.'},
    {id:'cloudflare',name:'Cloudflare',status:'needs_setup',missing:['CLOUDFLARE_USAGE_API_TOKEN'],metrics:[metric('kv','KV OAuth của dự án',null,10**9)],note:'KV Free: 1 GB dùng chung tài khoản. Số đo namespace này không gồm các namespace khác, Workers requests hay static assets.'}
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

async function cloudflareUsage(provider,env) {
  if (!env.CLOUDFLARE_USAGE_API_TOKEN) return;
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
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
async function firebaseUsage(provider,env) {
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
  provider.metrics[0].used=Number(used);
  provider.measuredAt=point.interval.endTime;
  provider.status='ready';
  provider.missing=[];
}

export async function getStorageUsage(env) {
  // Runtime-only cache: measurements never overwrite Firebase business data.
  if (usageCache && usageCache.expires>Date.now() && usageCache.cfKey===env.CLOUDFLARE_USAGE_API_TOKEN && usageCache.googleKey===env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON && usageCache.githubKey===env.GITHUB_USAGE_TOKEN) return usageCache.value;
  const providers=emptyProviders();
  await Promise.all(providers.map(async provider=>{
    try { await ({github:githubUsage,firebase:firebaseUsage,cloudflare:cloudflareUsage}[provider.id])(provider,env); }
    catch(error) {
      provider.status='unavailable';
      provider.error=['PERMISSION_DENIED','RATE_LIMITED','INVALID_SERVICE_ACCOUNT','NO_METRICS','PERMISSION_OR_QUERY_ERROR'].includes(error.message)?error.message:'PROVIDER_UNAVAILABLE';
      if (provider.id==='github' && !env.GITHUB_USAGE_TOKEN) provider.missing=['GITHUB_USAGE_TOKEN'];
    }
  }));
  const value={checkedAt:new Date().toISOString(),providers};
  usageCache={expires:Date.now()+5*60000,cfKey:env.CLOUDFLARE_USAGE_API_TOKEN,googleKey:env.GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON,githubKey:env.GITHUB_USAGE_TOKEN,value};
  return value;
}
