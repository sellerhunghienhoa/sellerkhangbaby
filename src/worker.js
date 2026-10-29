import { getStorageUsage } from './storage-usage.js';

const ADMIN_EMAIL = 'sellerhunghienhoa@gmail.com';
const TIKTOK_TOKEN_API = 'https://auth.tiktok-shops.com/api/v2/token';
const TIKTOK_CREATOR_AUTHORIZE_URL = 'https://shop.tiktok.com/alliance/creator/auth';
const TIKTOK_SELLER_AUTHORIZE_URL = 'https://services.tiktokshop.com/open/authorize';
const TOKEN_AAD = new TextEncoder().encode('sellerkhangbaby:tiktok-token:v1');
const OAUTH_COOKIE = 'TikTokOAuthState';
const OAUTH_COOKIE_PATH = '/oauth/tiktok/';

const CONNECTIONS = [
  {
    id: 'shopkhangbaby',
    label: 'Shop Khang Baby · Seller',
    kind: 'seller',
    expectedUserType: 0,
    refreshSecret: 'TIKTOK_SHOPKHANGBABY_REFRESH_TOKEN'
  },
  {
    id: 'mekhangsua',
    label: 'TikTok Mẹ Khang Sữa',
    kind: 'creator',
    creatorUsername: 'mekhangsua',
    expectedUserType: 1,
    refreshSecret: 'TIKTOK_MEKHANGSUA_REFRESH_TOKEN'
  },
  {
    id: 'shopkhangbaby-creator',
    label: 'TikTok Shop Khang Baby · Creator',
    kind: 'creator',
    creatorUsername: 'shopkhangbaby',
    expectedUserType: 1,
    refreshSecret: 'TIKTOK_SHOPKHANGBABY_CREATOR_REFRESH_TOKEN'
  }
];

class ApiError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function securityHeaders(extra = {}) {
  return {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    ...extra
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, { status, headers: securityHeaders(extraHeaders) });
}

function finishAuthorization(home, headers, state = '') {
  const result = home.searchParams.get('tiktok_oauth');
  const success = result === 'success' || result === 'shop_creator_success' || result === 'seller_success';
  const message = home.searchParams.get('error') === 'TOKEN_ENCRYPTION_KEY_INVALID' ? 'Khóa mã hóa trên Cloudflare sai định dạng. Cần đặt TIKTOK_TOKEN_ENCRYPTION_KEY thành Base64 của 32 byte ngẫu nhiên rồi kết nối lại.' : success ? 'Đã kết nối TikTok thành công.' :
    (result === 'invalid_state' ? 'Phiên ủy quyền đã hết hạn hoặc được mở ở trình duyệt khác. Hãy quay lại tab ban đầu và kết nối lại.' :
      'Ủy quyền chưa hoàn tất. Hãy quay lại tab ban đầu, kiểm tra cấu hình và thử lại.');
  const nonce = randomState();
  const payload = JSON.stringify({ type: 'tiktok-oauth-result', result, state, error: home.searchParams.get('error') || '' }).replace(/</g, '\\u003c');
  return new Response(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kết nối TikTok</title><link rel="stylesheet" href="/css/style.css"></head><body><main class="login"><div class="login-wrap"><div class="login-card"><h2>Kết nối TikTok</h2><p class="login-sub">${message}</p><p>Tab website ban đầu vẫn giữ phiên đăng nhập Google. Bạn có thể đóng cửa sổ này để quay lại.</p><a class="btn btn-grad" href="/?tiktok_oauth=${encodeURIComponent(result)}">Quay lại website</a></div></div></main><script nonce="${nonce}">const result=${payload};try{if('BroadcastChannel' in window){const channel=new BroadcastChannel('tiktok-oauth-result');channel.postMessage(result);channel.close();}if(window.opener){window.opener.postMessage(result,location.origin);window.close();}}catch{}</script></body></html>`, {
    headers: securityHeaders({ ...headers, 'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `default-src 'none'; style-src 'self'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'` })
  });
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Hex(value) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...hash].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function timingSafeEqual(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right))
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}

function cookieValue(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  for (const part of cookies.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

function oauthCookie(value, maxAge) {
  return `${OAUTH_COOKIE}=${value}; Max-Age=${maxAge}; Path=${OAUTH_COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax`;
}

async function tokenKey(secret) {
  if (!secret) throw new ApiError(503, 'TOKEN_ENCRYPTION_KEY_MISSING');
  let raw;
  try {
    raw = base64ToBytes(secret);
  } catch {
    throw new ApiError(503, 'TOKEN_ENCRYPTION_KEY_INVALID');
  }
  if (raw.byteLength !== 32) throw new ApiError(503, 'TOKEN_ENCRYPTION_KEY_INVALID');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptTokenRecord(record, encryptionSecret) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await tokenKey(encryptionSecret);
  const plaintext = new TextEncoder().encode(JSON.stringify(record));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: TOKEN_AAD }, key, plaintext);
  return JSON.stringify({ v: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) });
}

export async function decryptTokenRecord(value, encryptionSecret) {
  const envelope = JSON.parse(value);
  if (envelope.v !== 1 || !envelope.iv || !envelope.ciphertext) throw new Error('Unsupported token envelope');
  const key = await tokenKey(encryptionSecret);
  const plaintext = await crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: base64ToBytes(envelope.iv),
    additionalData: TOKEN_AAD
  }, key, base64ToBytes(envelope.ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

function tokenKeyName(id) {
  return `tiktok:token:${id}`;
}

export function appCredentials(definition, env) {
  return definition.kind === 'creator'
    ? {
        appKey: env.TIKTOK_CREATOR_APP_KEY || env.TIKTOK_APP_KEY,
        appSecret: env.TIKTOK_CREATOR_APP_SECRET || env.TIKTOK_APP_SECRET
      }
    : {
        appKey: env.TIKTOK_SELLER_APP_KEY || env.TIKTOK_APP_KEY,
        appSecret: env.TIKTOK_SELLER_APP_SECRET || env.TIKTOK_APP_SECRET
      };
}

function authorizationReady(definition, env) {
  const credentials = appCredentials(definition, env);
  return Boolean(
    env.TIKTOK_OAUTH_KV &&
    env.TIKTOK_TOKEN_ENCRYPTION_KEY &&
    credentials.appKey &&
    credentials.appSecret &&
    (definition.kind === 'creator' || env.TIKTOK_SERVICE_ID)
  );
}

function trustedAuthorizeUrl(value, fallback) {
  const url = new URL(value || fallback);
  const hostname = url.hostname.toLowerCase();
  const trusted = hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com') ||
    hostname === 'tiktokshop.com' || hostname.endsWith('.tiktokshop.com');
  if (url.protocol !== 'https:' || !trusted) throw new ApiError(503, 'TIKTOK_AUTH_URL_INVALID');
  url.search = '';
  url.hash = '';
  return url;
}

function secondsFrom(data, names) {
  for (const name of names) {
    const value = Number(data[name]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function expiryIso(seconds) {
  return seconds ? new Date(seconds > 1000000000 ? seconds * 1000 : Date.now() + seconds * 1000).toISOString() : '';
}

function scopesFrom(value) {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string');
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  return [];
}

export function normalizeTokenResponse(payload, definition, previous = {}) {
  const data = payload?.data || payload;
  if (!data || Number(payload?.code ?? 0) !== 0) throw new ApiError(502, 'TIKTOK_TOKEN_REJECTED');
  if (!data.access_token || !data.refresh_token) throw new ApiError(502, 'TIKTOK_TOKEN_INCOMPLETE');
  const userType = Number(data.user_type);
  if (userType !== definition.expectedUserType) throw new ApiError(502, 'TIKTOK_TOKEN_IDENTITY_MISMATCH');
  if (previous.openId && data.open_id && previous.openId !== data.open_id) {
    throw new ApiError(502, 'TIKTOK_TOKEN_ACCOUNT_CHANGED');
  }
  const now = new Date().toISOString();
  return {
    id: definition.id,
    label: definition.label,
    kind: definition.kind,
    creatorUsername: definition.creatorUsername || '',
    userType,
    openId: data.open_id || previous.openId || '',
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    grantedScopes: scopesFrom(data.granted_scopes),
    accessExpiresAt: expiryIso(secondsFrom(data, ['access_token_expire_in', 'access_token_expires_in', 'expires_in'])),
    refreshExpiresAt: expiryIso(secondsFrom(data, ['refresh_token_expire_in', 'refresh_token_expires_in'])),
    expiryFormat: 'unix-v2',
    refreshedAt: now,
    connectedAt: previous.connectedAt || now
  };
}

export function safeConnection(record, definition, bootstrapReady = false, error = '', canAuthorize = false) {
  return {
    id: definition.id,
    label: definition.label,
    kind: definition.kind,
    creatorUsername: definition.creatorUsername || '',
    status: record ? 'connected' : (bootstrapReady ? 'ready_to_refresh' : 'not_configured'),
    openIdSuffix: record?.openId ? record.openId.slice(-6) : '',
    grantedScopes: Array.isArray(record?.grantedScopes) ? record.grantedScopes : [],
    accessExpiresAt: record?.accessExpiresAt || '',
    refreshExpiresAt: record?.refreshExpiresAt || '',
    refreshedAt: record?.refreshedAt || '',
    authorizationReady: canAuthorize,
    error
  };
}

async function readTokenRecord(env, definition) {
  if (!env.TIKTOK_OAUTH_KV || !env.TIKTOK_TOKEN_ENCRYPTION_KEY) return null;
  const encrypted = await env.TIKTOK_OAUTH_KV.get(tokenKeyName(definition.id));
  if (!encrypted) return null;
  return repairLegacyTokenExpiry(await decryptTokenRecord(encrypted, env.TIKTOK_TOKEN_ENCRYPTION_KEY));
}

export function repairLegacyTokenExpiry(record) {
  if (record.expiryFormat === 'unix-v2') return record;
  const issuedAt = Date.parse(record.refreshedAt);
  if (!Number.isFinite(issuedAt)) return { ...record, accessExpiresAt: '', refreshExpiresAt: '' };
  const repaired = { ...record };
  for (const field of ['accessExpiresAt', 'refreshExpiresAt']) {
    const stored = Date.parse(record[field]);
    // Legacy code added the issue time to TikTok's absolute Unix expiry.
    if (Number.isFinite(stored) && stored - issuedAt > 1000000000 * 1000) {
      repaired[field] = new Date(stored - issuedAt).toISOString();
    }
  }
  return repaired;
}

async function writeTokenRecord(env, record) {
  if (!env.TIKTOK_OAUTH_KV) throw new ApiError(503, 'TOKEN_STORE_MISSING');
  const encrypted = await encryptTokenRecord(record, env.TIKTOK_TOKEN_ENCRYPTION_KEY);
  await env.TIKTOK_OAUTH_KV.put(tokenKeyName(record.id), encrypted);
}

async function callTokenEndpoint(path, params) {
  const url = new URL(`${TIKTOK_TOKEN_API}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new ApiError(502, 'TIKTOK_TOKEN_HTTP_ERROR');
  const payload = await response.json();
  if (Number(payload?.code ?? 0) !== 0) throw new ApiError(502, 'TIKTOK_TOKEN_REJECTED');
  return payload;
}

export async function signTikTokRequest(path, params, secret, body = '') {
  const encoder = new TextEncoder();
  const query = Object.keys(params).filter(key => !['sign', 'access_token'].includes(key)).sort().map(key => key + params[key]).join('');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(secret + path + query + body + secret));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function syncCutoff(value){
  const now=Math.floor(Date.now()/1000);
  if(value===undefined)return now;
  if(!Number.isSafeInteger(value)||value<=0||value>now+60)throw new ApiError(400,'SYNC_AS_OF_INVALID');
  return value;
}

async function callShopApi(path, params, credentials, accessToken, body) {
  const serialized = body === undefined ? '' : JSON.stringify(body);
  const errorPrefix = path.startsWith('/affiliate_creator/') ? 'TIKTOK_AFFILIATE' : /^\/(order|return_refund)\//.test(path) ? 'TIKTOK_ORDERS' : 'TIKTOK_LIVE';
  const query = { ...params, app_key: credentials.appKey, timestamp: String(Math.floor(Date.now() / 1000)) };
  query.sign = await signTikTokRequest(path, query, credentials.appSecret, serialized);
  const url = new URL(path, 'https://open-api.tiktokglobalshop.com');
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  let response;
  try {
    response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', ...(body === undefined ? {} : { body: serialized }), headers: { 'Content-Type': 'application/json', 'x-tts-access-token': accessToken }, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    console.error(JSON.stringify({ event: 'tiktok_live_transport_failed', path, reason: timeout ? 'timeout' : 'fetch_failed' }));
    throw new ApiError(502, `${errorPrefix}_${timeout ? 'TIMEOUT' : 'NETWORK_ERROR'}`);
  }
  if (response.status >= 300 && response.status < 400) throw new ApiError(502, `${errorPrefix}_REDIRECT_REJECTED`);
  if (response.status === 429) throw new ApiError(429, 'TIKTOK_RATE_LIMITED');
  if (!response.ok) throw new ApiError(502, `${errorPrefix}_HTTP_ERROR`);
  const payload = await response.json();
  if (Number(payload.code) !== 0) {
    const providerCode = String(payload.code || 'UNKNOWN').replace(/[^0-9]/g, '').slice(0, 12);
    console.error(JSON.stringify({ event: 'tiktok_live_sync_failed', providerCode, requestId: String(payload.request_id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) }));
    throw new ApiError(502, `${errorPrefix}_REJECTED_${providerCode || 'UNKNOWN'}`);
  }
  if (!payload.data) throw new ApiError(502, `${errorPrefix}_RESPONSE_INVALID`);
  return payload.data;
}

export function normalizeLiveSession(live, shopId) {
  const channel = String(live.username || '').replace(/^@/, '').toLowerCase();
  if (!['shopkhangbaby', 'mekhangsua'].includes(channel)) return null;
  const start = Number(live.start_time);
  const end = Number(live.end_time);
  const gmv = live.sales_performance?.gmv;
  const amount = Number(gmv?.amount);
  if (typeof live.id !== 'string' || !/^\d{1,30}$/.test(live.id) || !Number.isFinite(start) || start <= 0 || !Number.isFinite(amount) || amount < 0) {
    throw new ApiError(502, 'TIKTOK_LIVE_RESPONSE_INVALID');
  }
  if (gmv.currency !== 'VND') throw new ApiError(502, 'TIKTOK_LIVE_CURRENCY_UNSUPPORTED');
  const timeOptions = { timeZone: 'Asia/Ho_Chi_Minh' };
  const time = timestamp => new Intl.DateTimeFormat('en-GB', { ...timeOptions, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(timestamp * 1000));
  return {
    id: `TTLIVE-${shopId}-${live.id}`, tiktokLiveId: live.id, tiktokShopId: shopId,
    channel, title: String(live.title || '').slice(0, 300),
    date: new Intl.DateTimeFormat('sv-SE', timeOptions).format(new Date(start * 1000)),
    slot: `${time(start)} - ${end > start ? time(end) : 'Đang LIVE'}`,
    startedAt: new Date(start * 1000).toISOString(), endedAt: end > start ? new Date(end * 1000).toISOString() : '',
    tiktokReportedGmv: amount, currency: 'VND', source: 'TIKTOK_API'
  };
}

async function syncLiveSessions(request, env) {
  requireSameOrigin(request);
  let body;
  try { body = await request.json(); } catch { throw new ApiError(400, 'LIVE_DATE_RANGE_INVALID'); }
  const from = body?.from, to = body?.to;
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(from) || !validDate(to) || from > to || Date.parse(to) - Date.parse(from) > 30 * 86400000) throw new ApiError(400, 'LIVE_DATE_RANGE_INVALID');
  const definition = CONNECTIONS.find(item => item.kind === 'seller');
  let record = await readTokenRecord(env, definition);
  if (!record) throw new ApiError(409, 'TIKTOK_SELLER_NOT_CONNECTED');
  if (!record.accessExpiresAt || Date.parse(record.accessExpiresAt) <= Date.now() + 60000) {
    await refreshConnection(env, definition);
    record = await readTokenRecord(env, definition);
  }
  if (record.grantedScopes?.length && !record.grantedScopes.includes('data.shop_analytics.public.read')) throw new ApiError(403, 'TIKTOK_ANALYTICS_SCOPE_MISSING');
  const credentials = appCredentials(definition, env);
  if (!credentials.appKey || !credentials.appSecret) throw new ApiError(503, 'TIKTOK_APP_CREDENTIALS_MISSING');
  const authorized = await callShopApi('/authorization/202309/shops', {}, credentials, record.accessToken);
  if (!Array.isArray(authorized.shops) || authorized.shops.length === 0) throw new ApiError(409, 'TIKTOK_NO_AUTHORIZED_SHOP');
  if (authorized.shops.length !== 1) throw new ApiError(409, 'TIKTOK_MULTIPLE_SHOPS');
  const shop = authorized.shops[0];
  if (typeof shop.id !== 'string' || !/^\d{1,30}$/.test(shop.id) || typeof shop.cipher !== 'string' || !shop.cipher) throw new ApiError(502, 'TIKTOK_LIVE_RESPONSE_INVALID');
  const sessions = new Map();
  const endExclusive = new Date(Date.parse(to) + 86400000).toISOString().slice(0, 10);
  let pageToken = '';
  const seen = new Set();
  let ignored = 0;
  for (let page = 0; page < 20; page++) {
    // 202509 response is verified against Partner Center; newer versions change GMV attribution.
    const data = await callShopApi('/analytics/202509/shop_lives/performance', {
      shop_cipher: shop.cipher, start_date_ge: from, end_date_lt: endExclusive,
      page_size: '100', account_type: 'ALL', currency: 'LOCAL', ...(pageToken ? { page_token: pageToken } : {})
    }, credentials, record.accessToken);
    if (!Array.isArray(data.live_stream_sessions)) throw new ApiError(502, 'TIKTOK_LIVE_RESPONSE_INVALID');
    for (const live of data.live_stream_sessions) {
      const session = normalizeLiveSession(live, shop.id);
      if (session) sessions.set(session.id, session); else ignored++;
    }
    const next = data.next_page_token || '';
    if (!next) return json({ sessions: [...sessions.values()], ignored, syncedAt: new Date().toISOString(), from, to });
    if (seen.has(next)) throw new ApiError(502, 'TIKTOK_LIVE_PAGINATION_INVALID');
    seen.add(next);
    pageToken = next;
  }
  throw new ApiError(409, 'TIKTOK_LIVE_RANGE_TOO_LARGE');
}

function affiliateMoney(money, field) {
  if (!money||typeof money.currency!=='string'||typeof money.amount !== 'string'||money.amount.length>80) throw new ApiError(502, `TIKTOK_AFFILIATE_${field}_INVALID`);
  if (money.currency !== 'VND') throw new ApiError(502, 'TIKTOK_AFFILIATE_CURRENCY_UNSUPPORTED');
  // TikTok documents localized amount strings; validate grouping before removing it.
  let amount=money.amount.trim().replace(/[\u00a0\u202f]/g,' ').replace(/^(?:VND|₫|đ)\s*|\s*(?:VND|₫|đ)$/gi,'').trim();
  if (/^\d+(?:\.\d{1,2})?$/.test(amount)) { /* Canonical API decimal. */ }
  else if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(amount)) amount=amount.replace(/\./g,'').replace(',','.');
  else if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(amount)) amount=amount.replace(/,/g,'');
  else if (/^\d{1,3}(?: \d{3})+(?:[,.]\d{1,2})?$/.test(amount)) amount=amount.replace(/ /g,'').replace(',','.');
  else if (/^\d+,\d{1,2}$/.test(amount)) amount=amount.replace(',','.');
  else throw new ApiError(502, `TIKTOK_AFFILIATE_${field}_INVALID`);
  const [whole,fraction=''] = amount.split('.');
  const cents = Number(whole)*100 + Number((fraction+'00').slice(0,2));
  if (!Number.isSafeInteger(cents)) throw new ApiError(502, `TIKTOK_AFFILIATE_${field}_INVALID`);
  return cents;
}

export function normalizeAffiliateRows(orders, from, to) {
  const rows = new Map();
  const dateFormat = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Ho_Chi_Minh'});
  for (const order of orders) {
    if (typeof order.id !== 'string' || !/^\d{1,30}$/.test(order.id) || !Array.isArray(order.skus) || !Number.isSafeInteger(order.create_time) || order.create_time <= 0) throw new ApiError(502, 'TIKTOK_AFFILIATE_ORDER_INVALID');
    const date = dateFormat.format(new Date(order.create_time * 1000));
    if (date<from||date>to) throw new ApiError(502, 'TIKTOK_AFFILIATE_RESPONSE_INVALID');
    const status = String(order.status).trim().toUpperCase().replace(/[\s\-‐‑–—]+/g, '_');
    if (!['SETTLED','TO_SETTLE','REFUNDED','FROZEN','UNSPECIFIED','AWAITING_PAYMENT'].includes(status)) throw new ApiError(502, 'TIKTOK_AFFILIATE_STATUS_INVALID');
    for (const sku of order.skus) {
      if (typeof sku.id !== 'string' || !/^\d{1,30}$/.test(sku.id) || !Number.isSafeInteger(sku.quantity) || sku.quantity <= 0) throw new ApiError(502, 'TIKTOK_AFFILIATE_SKU_INVALID');
      const gmv = affiliateMoney(sku.price,'PRICE') * sku.quantity;
      if (!Number.isSafeInteger(gmv)) throw new ApiError(502, 'TIKTOK_AFFILIATE_RESPONSE_INVALID');
      const commissionAvailable=status!=='SETTLED'||sku.actual_commission!=null;
      const key = order.id + ':' + sku.id;
      const row = {key,date,status,type:String(sku.content_type||'').slice(0,40),gmv,commission:status === 'SETTLED' && commissionAvailable ? affiliateMoney(sku.actual_commission,'COMMISSION') : 0,commissionAvailable,orderId:order.id};
      // TikTok paginates SKU rows; one order may span several pages.
      if (rows.has(key) && JSON.stringify(rows.get(key)) !== JSON.stringify(row)) throw new ApiError(409, 'TIKTOK_AFFILIATE_CHANGED_DURING_SYNC');
      rows.set(key, row);
    }
  }
  return [...rows.values()];
}

export function normalizeAffiliateOrders(orders, from, to, syncedAt, channel='mekhangsua') {
  if(!['shopkhangbaby','mekhangsua'].includes(channel)) throw new ApiError(400,'TIKTOK_CREATOR_INVALID');
  const days = new Map();
  const rows=normalizeAffiliateRows(orders,from,to);
  for (let time = Date.parse(from); time <= Date.parse(to); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    days.set(date, {date,channel,gmv:0,liveGmv:0,videoGmv:0,otherGmv:0,refundedGmv:0,settledCommission:0,commissionAvailable:true,orderCount:0,skuCount:0,currency:'VND',syncedAt});
  }
  const dayOrders = new Map([...days.keys()].map(date=>[date,new Set()]));
  for (const row of rows) {
    if (!['SETTLED','TO_SETTLE','REFUNDED'].includes(row.status)) continue;
    const day = days.get(row.date);
    day.gmv += row.gmv;
    day[row.type === 'LIVE' ? 'liveGmv' : row.type === 'VIDEO' ? 'videoGmv' : 'otherGmv'] += row.gmv;
    if (row.status === 'REFUNDED') day.refundedGmv += row.gmv;
    day.settledCommission += row.commission;
    day.commissionAvailable &&= row.commissionAvailable;
    day.skuCount++;
    dayOrders.get(row.date).add(row.orderId);
    if (![day.gmv,day.settledCommission].every(Number.isSafeInteger)) throw new ApiError(502, 'TIKTOK_AFFILIATE_RESPONSE_INVALID');
  }
  return [...days.values()].map(day=>({...day,orderCount:dayOrders.get(day.date).size,gmv:day.gmv/100,liveGmv:day.liveGmv/100,videoGmv:day.videoGmv/100,otherGmv:day.otherGmv/100,refundedGmv:day.refundedGmv/100,settledCommission:day.commissionAvailable?day.settledCommission/100:null}));
}

async function syncAffiliateOrders(request, env) {
  requireSameOrigin(request);
  let body;
  try { body = await request.json(); } catch { throw new ApiError(400, 'LIVE_DATE_RANGE_INVALID'); }
  const {from,to,creator='mekhangsua',paged=false,cursor='',asOf} = body || {};
  const valid = value=>typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!valid(from) || !valid(to) || from > to || Date.parse(to)-Date.parse(from)>30*86400000) throw new ApiError(400, 'LIVE_DATE_RANGE_INVALID');
  if(typeof paged!=='boolean'||typeof cursor!=='string'||cursor.length>4096||(!paged&&cursor))throw new ApiError(400,'TIKTOK_AFFILIATE_CURSOR_INVALID');
  const definition = CONNECTIONS.find(item=>item.kind === 'creator'&&item.creatorUsername===creator);
  if(!definition) throw new ApiError(400,'TIKTOK_CREATOR_INVALID');
  let record = await readTokenRecord(env, definition);
  if (!record) throw new ApiError(409, 'TIKTOK_CREATOR_NOT_CONNECTED');
  if (!record.accessExpiresAt || Date.parse(record.accessExpiresAt)<=Date.now()+60000) {
    await refreshConnection(env, definition);
    record = await readTokenRecord(env, definition);
  }
  if (record.grantedScopes?.length && !record.grantedScopes.includes('creator.affiliate_collaboration.read')) throw new ApiError(403, 'TIKTOK_AFFILIATE_SCOPE_MISSING');
  if (record.grantedScopes?.length && !record.grantedScopes.some(scope=>['creator.affiliate.info','creator.video.write'].includes(scope))) throw new ApiError(403, 'TIKTOK_CREATOR_PROFILE_SCOPE_MISSING');
  const credentials = appCredentials(definition, env);
  if (!credentials.appKey || !credentials.appSecret) throw new ApiError(503, 'TIKTOK_APP_CREDENTIALS_MISSING');
  const profile = await callShopApi('/affiliate_creator/202405/profiles', {}, credentials, record.accessToken);
  if (String(profile.username || '').replace(/^@/,'').toLowerCase() !== definition.creatorUsername) throw new ApiError(409, 'TIKTOK_CREATOR_ACCOUNT_MISMATCH');
  const filter = {create_time_ge:Date.parse(from+'T00:00:00+07:00')/1000,create_time_lt:Math.min(Date.parse(to+'T00:00:00+07:00')/1000+86400,syncCutoff(asOf))};
  if(paged){
    const data=await callShopApi('/affiliate_creator/202410/orders/search',{page_size:'100',...(cursor?{page_token:cursor}:{})},credentials,record.accessToken,filter);
    const orders=data.orders??(data.total_count===0?[]:null);
    if(!Array.isArray(orders))throw new ApiError(502,'TIKTOK_AFFILIATE_RESPONSE_INVALID');
    const rows=normalizeAffiliateRows(orders,from,to);const nextCursor=data.total_count===0&&rows.length===0?null:data.next_page_token||null;
    if(rows.length>100||nextCursor!==null&&(typeof nextCursor!=='string'||nextCursor.length>4096||nextCursor===cursor||rows.length===0))throw new ApiError(502,'TIKTOK_AFFILIATE_PAGINATION_INVALID');
    return json({rows,nextCursor,complete:nextCursor===null,from,to,creator,syncedAt:new Date().toISOString(),...(Number.isSafeInteger(data.total_count)&&data.total_count>=0?{totalCount:data.total_count}:{})});
  }
  const orders = [];
  const seen = new Set();
  let pageToken = '';
  for (let page=0;page<20;page++) {
    const data = await callShopApi('/affiliate_creator/202410/orders/search', {page_size:'100',...(pageToken?{page_token:pageToken}:{})}, credentials, record.accessToken, filter);
    if (!Array.isArray(data.orders)) throw new ApiError(502, 'TIKTOK_AFFILIATE_RESPONSE_INVALID');
    orders.push(...data.orders);
    const next = data.next_page_token || '';
    if (!next) {
      const syncedAt = new Date().toISOString();
      return json({days:normalizeAffiliateOrders(orders,from,to,syncedAt,creator),from,to,syncedAt,creator});
    }
    if (seen.has(next)) throw new ApiError(502, 'TIKTOK_AFFILIATE_PAGINATION_INVALID');
    seen.add(next);
    pageToken=next;
  }
  throw new ApiError(409, 'TIKTOK_AFFILIATE_RANGE_TOO_LARGE');
}

function orderDataId(value) {
  if (typeof value !== 'string' || !/^\d{1,30}$/.test(value)) throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  return value;
}
function orderDataMoney(amount,currency) {
  if(typeof currency!=='string'||!currency)throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  if (currency!=='VND') throw new ApiError(502,'TIKTOK_ORDERS_CURRENCY_UNSUPPORTED');
  if (typeof amount!=='string' || !/^\d+(?:\.\d{1,2})?$/.test(amount)) throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  const [whole,fraction='']=amount.split('.');const cents=Number(whole)*100+Number((fraction+'00').slice(0,2));
  if (!Number.isSafeInteger(cents)) throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  return cents/100;
}
const ORDER_DATE = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'});
const ORDER_TIME = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function orderTimestamp(value,optional=false) {
  if (optional && !value) return '';
  if (!Number.isSafeInteger(value) || value<=0 || !Number.isFinite(new Date(value*1000).getTime())) throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  return new Date(value*1000).toISOString();
}

export function normalizeSellerOrder(raw,shopId) {
  const orderId=orderDataId(raw.id);const createdAt=orderTimestamp(raw.create_time);
  if (!Array.isArray(raw.line_items)) throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  const roomIds=new Set();let missingRoom=false,nonLive=false;
  raw.line_items.forEach(item=>{
    orderDataId(item.id);
    if (typeof item.room_id!=='string') missingRoom=true;
    else if (item.room_id==='') nonLive=true;
    else roomIds.add(orderDataId(item.room_id));
  });
  const status={DELIVERED:'DELIVERED',COMPLETED:'DELIVERED',IN_TRANSIT:'SHIPPING',PARTIALLY_SHIPPING:'SHIPPING',AWAITING_SHIPMENT:'PENDING',AWAITING_COLLECTION:'PENDING',ON_HOLD:'PENDING',UNPAID:'UNPAID',CANCELLED:'CANCELLED'}[raw.status]||'UNKNOWN';
  const attribution=missingRoom||!raw.line_items.length?'UNKNOWN':roomIds.size===0?'NON_LIVE':roomIds.size===1&&!nonLive?'LIVE':'MIXED';
  return {
    orderId,tiktokShopId:shopId,provider:'TIKTOK_API',createdAt,updatedAt:orderTimestamp(raw.update_time,true),deliveredAt:orderTimestamp(raw.delivery_time,true),
    date:ORDER_DATE.format(new Date(createdAt)),time:ORDER_TIME.format(new Date(createdAt)),status,tiktokStatus:String(raw.status||'').slice(0,60),
    amount:orderDataMoney(raw.payment?.sub_total,raw.payment?.currency),paidTotal:orderDataMoney(raw.payment?.total_amount,raw.payment?.currency),currency:'VND',
    attribution,roomIds:[...roomIds],source:attribution==='NON_LIVE'?'UNKNOWN_NON_LIVE':attribution,channel:'shopkhangbaby',sessionId:'',refund:0,
    productName:raw.line_items.map(item=>String(item.product_name||'')).join(' · ').slice(0,300),sku:raw.line_items.map(item=>String(item.seller_sku||'')).join(' · ').slice(0,120),qty:raw.line_items.length,
    customerName:'Ẩn theo quyền riêng tư',customerPhone:'',city:'',kpiRule:'Chưa xác minh gán phiên',carrier:String(raw.shipping_provider||'').slice(0,80)
  };
}

export function normalizeSellerReturn(raw,shopId,parent) {
  const returnId=orderDataId(raw.return_id);const orderId=orderDataId(raw.order_id);
  const createdAt=orderTimestamp(raw.create_time);
  const completed=raw.return_status==='RETURN_OR_REFUND_REQUEST_COMPLETE';
  const amountPresent=raw.refund_amount?.refund_subtotal!==undefined&&raw.refund_amount?.refund_subtotal!==null;
  const refundRequested=completed||amountPresent?orderDataMoney(raw.refund_amount?.refund_subtotal,raw.refund_amount?.currency):null;
  if(raw.return_line_items!==undefined&&!Array.isArray(raw.return_line_items))throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  const rejected=/REJECT|CANCEL/.test(raw.return_status||'');
  const deliveredAt=parent?.deliveredAt||'';
  const days=deliveredAt?Math.floor((Date.parse(createdAt)-Date.parse(deliveredAt))/86400000):null;
  return {
    returnId,orderId,tiktokShopId:shopId,provider:'TIKTOK_API',createdAt,returnDate:ORDER_DATE.format(new Date(createdAt)),updatedAt:orderTimestamp(raw.update_time,true),
    deliveredAt,deliveredDate:deliveredAt?ORDER_DATE.format(new Date(deliveredAt)):'',daysFromDelivery:days,within15Days:days!==null&&days>=0&&days<=15,
    requestedAmount:refundRequested,requestedAmountKnown:refundRequested!==null,returnAmount:completed?refundRequested:0,refundConfirmed:completed,tiktokStatus:String(raw.return_status||'').slice(0,90),
    status:completed?'REFUNDED':rejected?'REJECTED':raw.return_status==='BUYER_SHIPPED_ITEM'?'RETURNING':'PENDING',
    reasonCode:String(raw.return_reason||'UNKNOWN').slice(0,160),reasonLabel:String(raw.return_reason_text||raw.return_reason||'Chưa có lý do').slice(0,240),
    channel:'shopkhangbaby',sessionId:'',hostId:'',operatorId:'',hostName:'Chưa gán',liability:'Chưa xác định',hostCommReduction:0,opCommReduction:0,
    productName:(raw.return_line_items||[]).map(item=>String(item.product_name||'')).join(' · ').slice(0,300),sku:(raw.return_line_items||[]).map(item=>String(item.seller_sku||'')).join(' · ').slice(0,120),qty:(raw.return_line_items||[]).length,
    buyerName:'Ẩn theo quyền riêng tư',buyerPhone:'',buyerCity:'',parentOrder:parent||null
  };
}

async function syncSellerOrders(request,env) {
  requireSameOrigin(request);
  let body;try {body=await request.json();}catch{throw new ApiError(400,'LIVE_DATE_RANGE_INVALID');}
  const {from,to,stage='orders',cursor='',orderIds,asOf}=body||{};
  const valid=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
  if (!valid(from)||!valid(to)||from>to||Date.parse(to)-Date.parse(from)>30*86400000) throw new ApiError(400,'LIVE_DATE_RANGE_INVALID');
  if(!['orders','returns','refunds'].includes(stage)||typeof cursor!=='string'||cursor.length>4096)throw new ApiError(400,'TIKTOK_ORDERS_CURSOR_INVALID');
  if(stage==='refunds'&&(!Array.isArray(orderIds)||!orderIds.length||orderIds.length>50||new Set(orderIds).size!==orderIds.length||orderIds.some(id=>typeof id!=='string'||!/^\d{1,30}$/.test(id))))throw new ApiError(400,'TIKTOK_ORDERS_IDS_INVALID');
  const definition=CONNECTIONS.find(item=>item.kind==='seller');let record=await readTokenRecord(env,definition);
  if (!record) throw new ApiError(409,'TIKTOK_SELLER_NOT_CONNECTED');
  if (!record.accessExpiresAt||Date.parse(record.accessExpiresAt)<=Date.now()+60000){await refreshConnection(env,definition);record=await readTokenRecord(env,definition);}
  if(record.grantedScopes?.length&&!record.grantedScopes.includes('seller.order.info')&&!record.grantedScopes.includes('seller.fs.order&fufillment.management')) throw new ApiError(403,'TIKTOK_ORDERS_SCOPE_MISSING');
  if(stage!=='orders'&&record.grantedScopes?.length&&!record.grantedScopes.includes('seller.return_refund.basic')) throw new ApiError(403,'TIKTOK_RETURNS_SCOPE_MISSING');
  const credentials=appCredentials(definition,env);
  if(!credentials.appKey||!credentials.appSecret)throw new ApiError(503,'TIKTOK_APP_CREDENTIALS_MISSING');
  const authorized=await callShopApi('/authorization/202309/shops',{},credentials,record.accessToken);
  if(!Array.isArray(authorized.shops)||authorized.shops.length===0)throw new ApiError(409,'TIKTOK_NO_AUTHORIZED_SHOP');
  if(authorized.shops.length!==1)throw new ApiError(409,'TIKTOK_MULTIPLE_SHOPS');
  const shop=authorized.shops[0];orderDataId(shop.id);if(typeof shop.cipher!=='string'||!shop.cipher)throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  const cutoff=syncCutoff(asOf);
  const filter={create_time_ge:Date.parse(from+'T00:00:00+07:00')/1000,create_time_lt:Math.min(Date.parse(to+'T00:00:00+07:00')/1000+86400,cutoff)};
  // One provider page per request keeps each import below the Workers subrequest limit.
  const isOrder=stage==='orders';const size=isOrder?100:50;
  const data=await callShopApi(isOrder?'/order/202309/orders/search':'/return_refund/202602/returns/search',{
    shop_cipher:shop.cipher,page_size:String(size),sort_field:'create_time',sort_order:'ASC',...(cursor?{page_token:cursor}:{})
  },credentials,record.accessToken,stage==='refunds'?{order_ids:orderIds,create_time_lt:cutoff}:filter);
  const rawRows=data[isOrder?'orders':'return_orders']??(!isOrder||data.total_count===0?[]:null);
  if(!Array.isArray(rawRows)||rawRows.length>size)throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  if(data.next_page_token!==undefined&&data.next_page_token!==null&&typeof data.next_page_token!=='string')throw new ApiError(502,'TIKTOK_ORDERS_PAGINATION_INVALID');
  const nextCursor=data.total_count===0&&rawRows.length===0?null:data.next_page_token||null;
  if(nextCursor!==null&&(typeof nextCursor!=='string'||nextCursor.length>4096||nextCursor===cursor||rawRows.length===0))throw new ApiError(502,'TIKTOK_ORDERS_PAGINATION_INVALID');
  const progress={from,to,stage,shopId:shop.id,nextCursor,complete:nextCursor===null,syncedAt:new Date().toISOString(),...(Number.isSafeInteger(data.total_count)&&data.total_count>=0?{totalCount:data.total_count}:{})};
  if(stage==='refunds'){
    const ledger=rawRows.map(raw=>{
      if(!orderIds.includes(raw.order_id))throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
      const item=normalizeSellerReturn(raw,shop.id,null);
      return {returnId:item.returnId,orderId:item.orderId,refundConfirmed:item.refundConfirmed,returnAmount:item.returnAmount};
    });
    return json({...progress,orders:[],returns:[],ledger});
  }
  const ids=[...new Set(rawRows.map(raw=>orderDataId(isOrder?raw.id:raw.order_id)))];
  const detailed=new Map();
  for(let offset=0;offset<ids.length;offset+=50){
    const batch=ids.slice(offset,offset+50);
    const detail=await callShopApi('/order/202507/orders',{shop_cipher:shop.cipher,ids:batch.join(',')},credentials,record.accessToken);
    if(!Array.isArray(detail.orders))throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
    detail.orders.forEach(raw=>{if(!batch.includes(raw.id))throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');detailed.set(raw.id,normalizeSellerOrder(raw,shop.id));});
    if(batch.some(id=>!detailed.has(id)))throw new ApiError(502,'TIKTOK_ORDERS_DETAIL_INCOMPLETE');
  }
  const orders=isOrder?[...detailed.values()].map(order=>({...order,refundsComplete:false})):[];
  const returns=isOrder?[]:rawRows.map(raw=>normalizeSellerReturn(raw,shop.id,detailed.get(raw.order_id)));
  if(orders.some(order=>order.date<from||order.date>to)||returns.some(item=>item.returnDate<from||item.returnDate>to))throw new ApiError(502,'TIKTOK_ORDERS_RESPONSE_INVALID');
  return json({...progress,orders,returns,ledger:[]});
}

async function refreshConnection(env, definition) {
  const credentials = appCredentials(definition, env);
  if (!credentials.appKey || !credentials.appSecret) throw new ApiError(503, 'TIKTOK_APP_CREDENTIALS_MISSING');
  const previous = await readTokenRecord(env, definition);
  const refreshToken = previous?.refreshToken || env[definition.refreshSecret];
  if (!refreshToken) throw new ApiError(409, 'TIKTOK_REFRESH_TOKEN_MISSING');
  const payload = await callTokenEndpoint('refresh', {
    app_key: credentials.appKey,
    app_secret: credentials.appSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  const record = normalizeTokenResponse(payload, definition, previous || {});
  await writeTokenRecord(env, record);
  return safeConnection(record, definition, false, '', authorizationReady(definition, env));
}

async function refreshAll(env) {
  const results = [];
  for (const definition of CONNECTIONS) {
    try {
      if(!await readTokenRecord(env,definition)&&!env[definition.refreshSecret]){
        results.push(safeConnection(null,definition,false,'',authorizationReady(definition,env)));continue;
      }
      results.push(await refreshConnection(env, definition));
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'TOKEN_REFRESH_FAILED';
      console.error(JSON.stringify({ event: 'tiktok_token_refresh_failed', connection: definition.id, code }));
      results.push(safeConnection(null, definition, Boolean(env[definition.refreshSecret]), code));
    }
  }
  return results;
}

async function verifyFirebaseAdmin(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) throw new ApiError(401, 'AUTH_REQUIRED');
  const idToken = authorization.slice(7);
  if (!idToken || idToken.length > 8192) throw new ApiError(401, 'AUTH_INVALID');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  if (!response.ok) throw new ApiError(401, 'AUTH_INVALID');
  const payload = await response.json();
  const user = payload?.users?.[0];
  if (!user || user.emailVerified !== true || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    throw new ApiError(403, 'ADMIN_REQUIRED');
  }
  return { uid: user.localId, email: user.email };
}

function requireSameOrigin(request) {
  const expected = new URL(request.url).origin;
  if (request.headers.get('Origin') !== expected) throw new ApiError(403, 'ORIGIN_INVALID');
}

async function connectionStatus(env) {
  const connections = [];
  for (const definition of CONNECTIONS) {
    try {
      const record = await readTokenRecord(env, definition);
      connections.push(safeConnection(
        record,
        definition,
        Boolean(env[definition.refreshSecret]),
        '',
        authorizationReady(definition, env)
      ));
    } catch {
      connections.push(safeConnection(
        null,
        definition,
        Boolean(env[definition.refreshSecret]),
        'TOKEN_STORE_UNREADABLE',
        authorizationReady(definition, env)
      ));
    }
  }
  const sellerConnection = CONNECTIONS.find(item => item.kind === 'seller');
  const creatorConnection = CONNECTIONS.find(item => item.kind === 'creator');
  const sellerCredentials = appCredentials(sellerConnection, env);
  const creatorCredentials = appCredentials(creatorConnection, env);
  const missingSecrets = [];
  let encryptionReady = false;
  try { await tokenKey(env.TIKTOK_TOKEN_ENCRYPTION_KEY); encryptionReady = true; }
  catch (error) { missingSecrets.push(error.code || 'TOKEN_ENCRYPTION_KEY_INVALID'); }
  if (!encryptionReady) connections.forEach(connection => { connection.authorizationReady = false; });
  if (!sellerCredentials.appKey) missingSecrets.push('TIKTOK_SELLER_APP_KEY hoặc TIKTOK_APP_KEY');
  if (!sellerCredentials.appSecret) missingSecrets.push('TIKTOK_SELLER_APP_SECRET hoặc TIKTOK_APP_SECRET');
  if (!creatorCredentials.appKey) missingSecrets.push('TIKTOK_CREATOR_APP_KEY hoặc TIKTOK_APP_KEY');
  if (!creatorCredentials.appSecret) missingSecrets.push('TIKTOK_CREATOR_APP_SECRET hoặc TIKTOK_APP_SECRET');
  if (!env.TIKTOK_SERVICE_ID) missingSecrets.push('TIKTOK_SERVICE_ID');
  return {
    backendReady: Boolean(env.TIKTOK_OAUTH_KV) && missingSecrets.length === 0,
    creatorAuthorizationReady: encryptionReady && authorizationReady(creatorConnection, env),
    sellerAuthorizationReady: encryptionReady && authorizationReady(sellerConnection, env),
    missingSecrets,
    connections
  };
}

async function startCreatorAuthorization(request, env, creator='mekhangsua') {
  requireSameOrigin(request);
  await tokenKey(env.TIKTOK_TOKEN_ENCRYPTION_KEY);
  const definition = CONNECTIONS.find(item => item.kind === 'creator'&&item.creatorUsername===creator);
  if(!definition) throw new ApiError(404,'CONNECTION_NOT_FOUND');
  const credentials = appCredentials(definition, env);
  if (!authorizationReady(definition, env)) {
    throw new ApiError(503, 'CREATOR_AUTH_NOT_CONFIGURED');
  }
  const state = `${definition.id}.${randomState()}`;
  const stateHash = await sha256Hex(state);
  const authorizeUrl = trustedAuthorizeUrl(env.TIKTOK_CREATOR_AUTH_URL, TIKTOK_CREATOR_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('app_key', credentials.appKey);
  authorizeUrl.searchParams.set('state', state);
  return json({ url: authorizeUrl.toString() }, 200, { 'Set-Cookie': oauthCookie(stateHash, 600) });
}

async function startSellerAuthorization(request, env, connectionId) {
  requireSameOrigin(request);
  await tokenKey(env.TIKTOK_TOKEN_ENCRYPTION_KEY);
  const definition = CONNECTIONS.find(item => item.id === connectionId && item.kind === 'seller');
  if (!definition) throw new ApiError(404, 'CONNECTION_NOT_FOUND');
  if (!authorizationReady(definition, env)) throw new ApiError(503, 'SELLER_AUTH_NOT_CONFIGURED');
  const state = `${definition.id}.${randomState()}`;
  const stateHash = await sha256Hex(state);
  const authorizeUrl = trustedAuthorizeUrl(env.TIKTOK_SELLER_AUTH_URL, TIKTOK_SELLER_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('service_id', env.TIKTOK_SERVICE_ID);
  authorizeUrl.searchParams.set('state', state);
  return json({ url: authorizeUrl.toString() }, 200, { 'Set-Cookie': oauthCookie(stateHash, 600) });
}

async function validateOAuthCallback(request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const home = new URL('/', url.origin);
  const clearCookie = { 'Set-Cookie': oauthCookie('', 0) };
  if (!state || state.length > 512 || !code || code.length > 2048) {
    home.searchParams.set('tiktok_oauth', 'invalid_callback');
    return { response: finishAuthorization(home, clearCookie, state) };
  }
  const expectedStateHash = cookieValue(request, OAUTH_COOKIE);
  const receivedStateHash = await sha256Hex(state);
  if (!expectedStateHash || !await timingSafeEqual(expectedStateHash, receivedStateHash)) {
    home.searchParams.set('tiktok_oauth', 'invalid_state');
    return { response: finishAuthorization(home, clearCookie, state) };
  }
  return { url, state, code, home, clearCookie };
}

async function creatorCallback(request, env) {
  const callback = await validateOAuthCallback(request);
  if (callback.response) return callback.response;
  const { state, code, home, clearCookie } = callback;
  try {
    const definition = CONNECTIONS.find(item => item.kind === 'creator'&&item.id===state.split('.',1)[0]);
    if(!definition) throw new ApiError(404,'CONNECTION_NOT_FOUND');
    const credentials = appCredentials(definition, env);
    if (!authorizationReady(definition, env)) throw new ApiError(503, 'CREATOR_AUTH_NOT_CONFIGURED');
    const previous = await readTokenRecord(env, definition);
    const payload = await callTokenEndpoint('get', {
      app_key: credentials.appKey,
      app_secret: credentials.appSecret,
      auth_code: code,
      grant_type: 'authorized_code'
    });
    const record = normalizeTokenResponse(payload, definition, previous || {});
    const profile=await callShopApi('/affiliate_creator/202405/profiles',{},credentials,record.accessToken);
    if(String(profile.username||'').replace(/^@/,'').toLowerCase()!==definition.creatorUsername)throw new ApiError(409,'TIKTOK_CREATOR_ACCOUNT_MISMATCH');
    await writeTokenRecord(env, record);
    home.searchParams.set('tiktok_oauth', definition.creatorUsername==='shopkhangbaby'?'shop_creator_success':'success');
    home.searchParams.set('connection',definition.id);
  } catch (error) {
    const errorCode = error instanceof ApiError ? error.code : 'CREATOR_AUTH_FAILED';
    console.error(JSON.stringify({ event: 'tiktok_creator_authorization_failed', code: errorCode }));
    home.searchParams.set('tiktok_oauth', 'failed');
    home.searchParams.set('error', errorCode);
  }
  return finishAuthorization(home, clearCookie, state);
}

async function sellerCallback(request, env) {
  const callback = await validateOAuthCallback(request);
  if (callback.response) return callback.response;
  const { state, code, home, clearCookie } = callback;
  const connectionId = state.split('.', 1)[0];
  const definition = CONNECTIONS.find(item => item.id === connectionId && item.kind === 'seller');
  try {
    if (!definition || !authorizationReady(definition, env)) {
      throw new ApiError(503, 'SELLER_AUTH_NOT_CONFIGURED');
    }
    const credentials = appCredentials(definition, env);
    const previous = await readTokenRecord(env, definition);
    const payload = await callTokenEndpoint('get', {
      app_key: credentials.appKey,
      app_secret: credentials.appSecret,
      auth_code: code,
      grant_type: 'authorized_code'
    });
    const record = normalizeTokenResponse(payload, definition, previous || {});
    await writeTokenRecord(env, record);
    home.searchParams.set('tiktok_oauth', 'seller_success');
    home.searchParams.set('connection', definition.id);
  } catch (error) {
    const errorCode = error instanceof ApiError ? error.code : 'SELLER_AUTH_FAILED';
    console.error(JSON.stringify({ event: 'tiktok_seller_authorization_failed', connection: connectionId, code: errorCode }));
    home.searchParams.set('tiktok_oauth', 'seller_failed');
    home.searchParams.set('error', errorCode);
  }
  return finishAuthorization(home, clearCookie, state);
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  await verifyFirebaseAdmin(request, env);
  if (request.method === 'GET' && url.pathname === '/api/storage/usage') {
    return json(await getStorageUsage(env));
  }
  if (request.method === 'GET' && url.pathname === '/api/tiktok/status') {
    return json(await connectionStatus(env));
  }
  if (request.method === 'POST' && url.pathname === '/api/tiktok/live/sync') {
    return syncLiveSessions(request, env);
  }
  if (request.method === 'POST' && url.pathname === '/api/tiktok/affiliate/sync') {
    return syncAffiliateOrders(request, env);
  }
  if (request.method === 'POST' && url.pathname === '/api/tiktok/orders/sync') {
    return syncSellerOrders(request, env);
  }
  if (request.method === 'POST' && url.pathname === '/api/tiktok/creator/authorize') {
    return startCreatorAuthorization(request, env);
  }
  const creatorAuthorizeMatch=url.pathname.match(/^\/api\/tiktok\/creator\/(shopkhangbaby|mekhangsua)\/authorize$/);
  if(request.method==='POST'&&creatorAuthorizeMatch) return startCreatorAuthorization(request,env,creatorAuthorizeMatch[1]);
  const sellerAuthorizeMatch = url.pathname.match(/^\/api\/tiktok\/seller\/([a-z0-9-]+)\/authorize$/);
  if (request.method === 'POST' && sellerAuthorizeMatch) {
    return startSellerAuthorization(request, env, sellerAuthorizeMatch[1]);
  }
  if (request.method === 'POST' && url.pathname === '/api/tiktok/tokens/refresh') {
    requireSameOrigin(request);
    return json({ connections: await refreshAll(env) });
  }
  const match = url.pathname.match(/^\/api\/tiktok\/tokens\/([a-z0-9-]+)\/refresh$/);
  if (request.method === 'POST' && match) {
    requireSameOrigin(request);
    const definition = CONNECTIONS.find(item => item.id === match[1]);
    if (!definition) throw new ApiError(404, 'CONNECTION_NOT_FOUND');
    return json({ connection: await refreshConnection(env, definition) });
  }
  throw new ApiError(404, 'API_NOT_FOUND');
}

export async function runApiDiagnostic(event,env){
  const expires=Date.parse(env.API_DIAGNOSTIC_UNTIL||'');
  const now=Date.now();
  if(event.cron!=='* * * * *'||!Number.isFinite(expires)||expires<=now||expires-now>10*60000)return false;
  const to=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(now));
  const from=new Date(Date.parse(to)-6*86400000).toISOString().slice(0,10);
  const origin='https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev';
  const request=(path,body)=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({from,to,...body})});
  const runId=crypto.randomUUID();
  const run=async(operation,call,summarize)=>{
    try{
      const response=await call();const data=await response.json();
      if(!response.ok)throw new ApiError(response.status,data.error||'DIAGNOSTIC_RESPONSE_FAILED');
      console.log(JSON.stringify({event:'tiktok_api_diagnostic',runId,operation,status:'ok',...summarize(data)}));
      return data;
    }catch(error){
      const code=error instanceof ApiError&&/^[A-Z0-9_]{1,100}$/.test(error.code)?error.code:'DIAGNOSTIC_REQUEST_FAILED';
      console.log(JSON.stringify({event:'tiktok_api_diagnostic',runId,operation,status:'error',code}));
      return null;
    }
  };
  const page=data=>({count:(data.stage==='returns'?data.returns:data.stage==='refunds'?data.ledger:data.rows||data.orders||[]).length,totalCount:Number.isSafeInteger(data.totalCount)?data.totalCount:null,hasMore:!!data.nextCursor});
  for(const creator of ['shopkhangbaby','mekhangsua'])await run('affiliate:'+creator,()=>syncAffiliateOrders(request('/api/tiktok/affiliate/sync',{creator,paged:true}),env),page);
  await run('seller:live',()=>syncLiveSessions(request('/api/tiktok/live/sync',{}),env),data=>({count:data.sessions?.length||0}));
  const orders=await run('seller:orders',()=>syncSellerOrders(request('/api/tiktok/orders/sync',{stage:'orders'}),env),data=>{
    const attribution={LIVE:0,NON_LIVE:0,MIXED:0,UNKNOWN:0};
    for(const order of data.orders||[])if(Object.hasOwn(attribution,order.attribution))attribution[order.attribution]++;
    return {...page(data),attribution};
  });
  await run('seller:returns',()=>syncSellerOrders(request('/api/tiktok/orders/sync',{stage:'returns'}),env),page);
  const orderIds=(orders?.orders||[]).slice(0,50).map(order=>order.orderId);
  if(orderIds.length)await run('seller:refunds',()=>syncSellerOrders(request('/api/tiktok/orders/sync',{stage:'refunds',orderIds}),env),page);
  console.log(JSON.stringify({event:'tiktok_api_diagnostic_complete',runId}));
  return true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (['/oauth/tiktok/callback', '/oauth/tiktok/creator/callback', '/oauth/tiktok/seller/callback'].includes(url.pathname) && request.method === 'GET') {
        const state = url.searchParams.get('state') || '';
        return state.startsWith('shopkhangbaby.')
          ? await sellerCallback(request, env)
          : await creatorCallback(request, env);
      }
      if (url.pathname.startsWith('/api/')) return await handleApi(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
      console.error(JSON.stringify({ event: 'worker_request_failed', path: url.pathname, code }));
      return json({ error: code }, status);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(event.cron==='* * * * *'?runApiDiagnostic(event,env):refreshAll(env));
  }
};
