// SellerKhangBaby TikTok Shop SELLER OAuth connector.
// Separate from the production dashboard Worker. Do not store secrets in GitHub.
const LABELS = new Set(['shopkhangbaby', 'mekhangsua']);
const AUTH_BASE = 'https://services.tiktokshop.com/open/authorize';
const TOKEN_BASE = 'https://auth.tiktok-shops.com/api/v2/token/';
const SHOPS_PATH = '/authorization/202309/shops';
const SHOPS_BASE = 'https://open-api.tiktokglobalshop.com';
const now = () => Math.floor(Date.now() / 1000);
const encoder = new TextEncoder();
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' }
});
const html = (text, status = 200) => new Response('<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><h2>' + text + '</h2><p>Ban co the dong tab nay.</p>', {
  status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" }
});
const ok = env => Boolean(env.DB && env.TIKTOK_APP_KEY && env.TIKTOK_APP_SECRET &&
  env.TIKTOK_SERVICE_ID && env.ADMIN_API_KEY && env.TOKEN_ENCRYPTION_KEY);
const hex = bytes => Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
function unhex(value) {
  if (!value || !/^[a-f0-9]+$/i.test(value) || value.length % 2) throw Error('cipher invalid');
  return Uint8Array.from(value.match(/../g), x => parseInt(x, 16));
}
async function authorized(request, env) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ') || !env.ADMIN_API_KEY) return false;
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(authorization.slice(7))));
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(env.ADMIN_API_KEY)));
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}
async function aesKey(env) {
  const bytes = Uint8Array.from(atob(env.TOKEN_ENCRYPTION_KEY), char => char.charCodeAt(0));
  if (bytes.byteLength !== 32) throw Error('Encryption key must be 32 bytes');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt','decrypt']);
}
async function seal(data, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM', iv}, await aesKey(env), encoder.encode(JSON.stringify(data)));
  return hex(iv) + ':' + hex(new Uint8Array(cipher));
}
async function unseal(value, env) {
  const [iv, data] = value.split(':');
  const buffer = await crypto.subtle.decrypt({name:'AES-GCM', iv:unhex(iv)}, await aesKey(env), unhex(data));
  return JSON.parse(new TextDecoder().decode(buffer));
}
async function tokenRequest(action, params, env) {
  const url = new URL(TOKEN_BASE + action);
  Object.entries({app_key:env.TIKTOK_APP_KEY,app_secret:env.TIKTOK_APP_SECRET,...params})
    .forEach(([key,value])=>url.searchParams.set(key,value));
  // Token endpoint requires secrets in URL query: never log or follow redirects.
  const response = await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('Token endpoint HTTP '+response.status);
  const body = await response.json();
  if (String(body.code)!=='0' || !body.data?.access_token || !body.data?.refresh_token)
    throw Error('Token request rejected: '+String(body.code));
  if (body.data.user_type != null && Number(body.data.user_type)!==0) throw Error('Not a seller token');
  return body.data;
}
async function sign(path, params, env) {
  const query = [...params.entries()].filter(([k])=>k!=='sign' && k!=='access_token')
    .sort(([a],[b])=>a.localeCompare(b));
  const content = env.TIKTOK_APP_SECRET + path +
    query.map(([k,v])=>k+v).join('') + env.TIKTOK_APP_SECRET;
  const key = await crypto.subtle.importKey('raw',encoder.encode(env.TIKTOK_APP_SECRET),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(content))));
}
async function shopsFor(token, env) {
  const url = new URL(SHOPS_BASE+SHOPS_PATH);
  url.searchParams.set('app_key',env.TIKTOK_APP_KEY);
  url.searchParams.set('timestamp',String(now()));
  url.searchParams.set('sign',await sign(SHOPS_PATH,url.searchParams,env));
  const response = await fetch(url,{headers:{'content-type':'application/json',
    'x-tts-access-token':token},redirect:'error',signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('Get Authorized Shops HTTP '+response.status);
  const body = await response.json();
  if (String(body.code)!=='0') throw Error('Get Authorized Shops error '+String(body.code));
  return (body.data?.shops||[]).map(s=>({id:String(s.id||''),name:String(s.name||s.shop_name||''),
    region:String(s.region||''),cipher:String(s.cipher||s.shop_cipher||'')}));
}
async function save(label, token, env) {
  await env.DB.prepare('INSERT INTO seller_tokens (label,open_id,encrypted_json,updated_at) VALUES (?,?,?,?) '+
    'ON CONFLICT(label) DO UPDATE SET open_id=excluded.open_id, encrypted_json=excluded.encrypted_json, updated_at=excluded.updated_at')
    .bind(label,String(token.open_id||''),await seal(token,env),now()).run();
}
async function load(label, env) {
  const row = await env.DB.prepare('SELECT encrypted_json FROM seller_tokens WHERE label=?').bind(label).first();
  if (!row) return null;
  let token = await unseal(row.encrypted_json,env);
  if (Number(token.access_token_expire_in||0)<now()+3600) {
    if (Number(token.refresh_token_expire_in||0)<now()+120) throw Error('Refresh token expired');
    token = await tokenRequest('refresh',{refresh_token:token.refresh_token,grant_type:'refresh_token'},env);
    await save(label,token,env);
  }
  return token;
}
async function start(request,env) {
  const body = await request.json().catch(()=>({}));
  if (!LABELS.has(body.label)) return json({error:'Label must be shopkhangbaby or mekhangsua'},400);
  const state = crypto.randomUUID()+crypto.randomUUID();
  await env.DB.prepare('INSERT INTO oauth_states (state,label,expires_at) VALUES (?,?,?)')
    .bind(state,body.label,now()+600).run();
  const url = new URL(AUTH_BASE);
  url.searchParams.set('service_id',env.TIKTOK_SERVICE_ID);
  url.searchParams.set('state',state);
  return json({label:body.label,authorization_url:url.toString(),expires_in_seconds:600});
}
async function callback(url,env) {
  const state = url.searchParams.get('state');
  if (!state || state.length>200) return html('OAuth state khong hop le',400);
  const row = await env.DB.prepare('DELETE FROM oauth_states WHERE state=? AND expires_at>? RETURNING label')
    .bind(state,now()).first();
  if (!row) return html('OAuth state het han hoac da dung',400);
  if (url.searchParams.has('error')) return html('TikTok da tu choi quyen',400);
  const code = url.searchParams.get('code');
  if (!code) return html('Thieu authorization code',400);
  try {
    const token = await tokenRequest('get',{auth_code:code,grant_type:'authorized_code'},env);
    if (!(await shopsFor(token.access_token,env)).length)
      return html('Chua co shop duoc cap quyen: kiem tra Manage API scopes',403);
    await save(row.label,token,env);
    return html('Da nhan seller OAuth. Hay dung admin API de doi chieu shop.');
  } catch {
    return html('OAuth that bai. Kiem tra TikTok app, scopes va redirect URL.',502);
  }
}
export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    if (request.method==='GET' && url.pathname==='/health')
      return json({service:'sellerkhangbaby-tiktok',online:true});
    if (!ok(env)) return json({error:'Worker has not been configured'},503);
    if (request.method==='GET' && url.pathname==='/oauth/callback')
      return callback(url,env);
    if (!url.pathname.startsWith('/admin/')) return json({error:'Not found'},404);
    if (!(await authorized(request,env))) return json({error:'Unauthorized'},401);
    try {
      if (request.method==='POST' && url.pathname==='/admin/oauth/start') return await start(request,env);
      if (request.method==='GET' && url.pathname==='/admin/status') {
        const rows = await env.DB.prepare('SELECT label,open_id,updated_at FROM seller_tokens').all();
        return json({configured:true,connected:rows.results||[]});
      }
      const match = /^\/admin\/shops\/([^/]+)\/verify$/.exec(url.pathname);
      if (request.method==='POST' && match) {
        if (!LABELS.has(match[1])) return json({error:'Unknown label'},404);
        const token = await load(match[1],env);
        if (!token) return json({error:'Shop not authorized'},409);
        const shops = await shopsFor(token.access_token,env);
        return json({label:match[1],shops:shops.map(({id,name,region})=>({id,name,region}))});
      }
      return json({error:'Not found'},404);
    } catch {
      return json({error:'Operation failed. Review API configuration and permission scopes.'},502);
    }
  }
};