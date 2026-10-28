const ADMIN_EMAIL = 'sellerhunghienhoa@gmail.com';
const TIKTOK_TOKEN_API = 'https://auth.tiktok-shops.com/api/v2/token';
const TOKEN_AAD = new TextEncoder().encode('sellerkhangbaby:tiktok-token:v1');
const OAUTH_COOKIE = 'TikTokOAuthState';
const OAUTH_COOKIE_PATH = '/oauth/tiktok/creator/callback';

const CONNECTIONS = [
  {
    id: 'shopkhangbaby',
    label: 'Shop Khang Baby',
    kind: 'seller',
    expectedUserType: 0,
    refreshSecret: 'TIKTOK_SHOPKHANGBABY_REFRESH_TOKEN'
  },
  {
    id: 'mekhangsua',
    label: 'Mẹ Khang Sữa',
    kind: 'seller',
    expectedUserType: 0,
    refreshSecret: 'TIKTOK_MEKHANGSUA_REFRESH_TOKEN'
  },
  {
    id: 'creator-affiliate',
    label: 'Creator Affiliate',
    kind: 'creator',
    expectedUserType: 1,
    refreshSecret: 'TIKTOK_CREATOR_REFRESH_TOKEN'
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

function redirect(url, extraHeaders = {}) {
  return new Response(null, { status: 302, headers: securityHeaders({ Location: url, ...extraHeaders }) });
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

function appCredentials(definition, env) {
  return definition.kind === 'creator'
    ? { appKey: env.TIKTOK_CREATOR_APP_KEY, appSecret: env.TIKTOK_CREATOR_APP_SECRET }
    : { appKey: env.TIKTOK_SELLER_APP_KEY, appSecret: env.TIKTOK_SELLER_APP_SECRET };
}

function secondsFrom(data, names) {
  for (const name of names) {
    const value = Number(data[name]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function expiryIso(seconds) {
  return seconds ? new Date(Date.now() + seconds * 1000).toISOString() : '';
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
    userType,
    openId: data.open_id || previous.openId || '',
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    grantedScopes: scopesFrom(data.granted_scopes),
    accessExpiresAt: expiryIso(secondsFrom(data, ['access_token_expire_in', 'access_token_expires_in', 'expires_in'])),
    refreshExpiresAt: expiryIso(secondsFrom(data, ['refresh_token_expire_in', 'refresh_token_expires_in'])),
    refreshedAt: now,
    connectedAt: previous.connectedAt || now
  };
}

export function safeConnection(record, definition, bootstrapReady = false, error = '') {
  return {
    id: definition.id,
    label: definition.label,
    kind: definition.kind,
    status: record ? 'connected' : (bootstrapReady ? 'ready_to_refresh' : 'not_configured'),
    openIdSuffix: record?.openId ? record.openId.slice(-6) : '',
    grantedScopes: Array.isArray(record?.grantedScopes) ? record.grantedScopes : [],
    accessExpiresAt: record?.accessExpiresAt || '',
    refreshExpiresAt: record?.refreshExpiresAt || '',
    refreshedAt: record?.refreshedAt || '',
    error
  };
}

async function readTokenRecord(env, definition) {
  if (!env.TIKTOK_OAUTH_KV || !env.TIKTOK_TOKEN_ENCRYPTION_KEY) return null;
  const encrypted = await env.TIKTOK_OAUTH_KV.get(tokenKeyName(definition.id));
  if (!encrypted) return null;
  return decryptTokenRecord(encrypted, env.TIKTOK_TOKEN_ENCRYPTION_KEY);
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
  return safeConnection(record, definition);
}

async function refreshAll(env) {
  const results = [];
  for (const definition of CONNECTIONS) {
    try {
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
      connections.push(safeConnection(record, definition, Boolean(env[definition.refreshSecret])));
    } catch {
      connections.push(safeConnection(null, definition, Boolean(env[definition.refreshSecret]), 'TOKEN_STORE_UNREADABLE'));
    }
  }
  const missingSecrets = [
    'TIKTOK_TOKEN_ENCRYPTION_KEY',
    'TIKTOK_SELLER_APP_KEY',
    'TIKTOK_SELLER_APP_SECRET',
    'TIKTOK_CREATOR_APP_KEY',
    'TIKTOK_CREATOR_APP_SECRET'
  ].filter(name => !env[name]);
  return {
    backendReady: Boolean(env.TIKTOK_OAUTH_KV) && missingSecrets.length === 0,
    creatorAuthorizationReady: Boolean(env.TIKTOK_OAUTH_KV && env.TIKTOK_TOKEN_ENCRYPTION_KEY && env.TIKTOK_CREATOR_APP_KEY && env.TIKTOK_CREATOR_APP_SECRET),
    missingSecrets,
    connections
  };
}

async function startCreatorAuthorization(request, env) {
  requireSameOrigin(request);
  if (!env.TIKTOK_OAUTH_KV || !env.TIKTOK_CREATOR_APP_KEY || !env.TIKTOK_CREATOR_APP_SECRET || !env.TIKTOK_TOKEN_ENCRYPTION_KEY) {
    throw new ApiError(503, 'CREATOR_AUTH_NOT_CONFIGURED');
  }
  const state = randomState();
  const stateHash = await sha256Hex(state);
  const authorizeUrl = new URL('https://shop.tiktok.com/alliance/creator/auth');
  authorizeUrl.searchParams.set('app_key', env.TIKTOK_CREATOR_APP_KEY);
  authorizeUrl.searchParams.set('state', state);
  return json({ url: authorizeUrl.toString() }, 200, { 'Set-Cookie': oauthCookie(stateHash, 600) });
}

async function creatorCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const home = new URL('/', url.origin);
  const clearCookie = { 'Set-Cookie': oauthCookie('', 0) };
  if (!state || state.length > 512 || !code || code.length > 2048 || !env.TIKTOK_OAUTH_KV) {
    home.searchParams.set('tiktok_oauth', 'invalid_callback');
    return redirect(home.toString(), clearCookie);
  }
  const expectedStateHash = cookieValue(request, OAUTH_COOKIE);
  const receivedStateHash = await sha256Hex(state);
  if (!expectedStateHash || !await timingSafeEqual(expectedStateHash, receivedStateHash)) {
    home.searchParams.set('tiktok_oauth', 'invalid_state');
    return redirect(home.toString(), clearCookie);
  }
  try {
    const definition = CONNECTIONS.find(item => item.id === 'creator-affiliate');
    const previous = await readTokenRecord(env, definition);
    const payload = await callTokenEndpoint('get', {
      app_key: env.TIKTOK_CREATOR_APP_KEY,
      app_secret: env.TIKTOK_CREATOR_APP_SECRET,
      auth_code: code,
      grant_type: 'authorized_code'
    });
    const record = normalizeTokenResponse(payload, definition, previous || {});
    await writeTokenRecord(env, record);
    home.searchParams.set('tiktok_oauth', 'success');
  } catch (error) {
    const errorCode = error instanceof ApiError ? error.code : 'CREATOR_AUTH_FAILED';
    console.error(JSON.stringify({ event: 'tiktok_creator_authorization_failed', code: errorCode }));
    home.searchParams.set('tiktok_oauth', 'failed');
  }
  return redirect(home.toString(), clearCookie);
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  await verifyFirebaseAdmin(request, env);
  if (request.method === 'GET' && url.pathname === '/api/tiktok/status') {
    return json(await connectionStatus(env));
  }
  if (request.method === 'POST' && url.pathname === '/api/tiktok/creator/authorize') {
    return startCreatorAuthorization(request, env);
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/oauth/tiktok/creator/callback' && request.method === 'GET') {
        return await creatorCallback(request, env);
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

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refreshAll(env));
  }
};
