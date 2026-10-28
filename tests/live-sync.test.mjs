import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import worker, { encryptTokenRecord, normalizeLiveSession, signTikTokRequest, normalizeTokenResponse, repairLegacyTokenExpiry } from '../src/worker.js';

const origin = 'https://app.example.test';
const rawLive = { id: '1234567890123456789', username: '@shopkhangbaby', title: 'LIVE', start_time: '1793152800', end_time: '1793156400', sales_performance: { gmv: { amount: '1000000', currency: 'VND' } } };
const frontend = await readFile(new URL('../js/live-sync.js', import.meta.url), 'utf8');

test('signing matches the TikTok HMAC example and ignores token/sign query values', async () => {
  assert.equal(await signTikTokRequest('/authorization/202309/shops', { timestamp: '1623812664', app_key: '29a39d', sign: 'ignored', access_token: 'ignored' }, 'e59af819cc'), 'b596b73e0cc6de07ac26f036364178ab16b0a907af13d43f0a0cd2345f582dc8');
});

test('normalization filters other creators and rejects incompatible money or imprecise IDs', () => {
  assert.equal(normalizeLiveSession({ ...rawLive, username: 'other_creator' }, '99'), null);
  assert.equal(normalizeLiveSession(rawLive, '99').channel, 'shopkhangbaby');
  assert.throws(() => normalizeLiveSession({ ...rawLive, id: 1234567890123456789 }, '99'), /RESPONSE_INVALID/);
  assert.throws(() => normalizeLiveSession({ ...rawLive, sales_performance: { gmv: { amount: '1', currency: 'USD' } } }, '99'), /CURRENCY_UNSUPPORTED/);
});

test('repeated sync preserves financial reconciliation, shifts and manual decisions', () => {
  const ctx = createContext({});
  runInContext(frontend, ctx);
  const incoming = normalizeLiveSession(rawLive, '99');
  const first = ctx.mergeTikTokLiveSessions([], [incoming]);
  assert.equal(first.sessions[0].pendingRecGmv, 1000000);
  first.sessions[0].hostId = 'host-kept';
  first.sessions[0].pendingRecGmv = 100;
  first.sessions[0].cancelReturnGmv = 200;
  first.sessions[0].isManualKpi = true;
  const second = ctx.mergeTikTokLiveSessions(first.sessions, [{ ...incoming, tiktokReportedGmv: 2000000 }]);
  assert.equal(second.sessions.length, 1);
  assert.equal(second.added, 0);
  assert.equal(second.sessions[0].hostId, 'host-kept');
  assert.equal(second.sessions[0].pendingRecGmv, 100);
  assert.equal(second.sessions[0].cancelReturnGmv, 200);
  assert.equal(second.sessions[0].isManualKpi, true);
  assert.equal(second.sessions[0].tiktokReportedGmv, 2000000);
});

test('LIVE sync uses seller token, signs requests, paginates and deduplicates', async t => {
  const encryptionKey = randomBytes(32).toString('base64');
  const record = { accessToken: 'private-access', refreshToken: 'private-refresh', expiryFormat: 'unix-v2', grantedScopes: ['data.shop_analytics.public.read'], accessExpiresAt: new Date(Date.now() + 3600000).toISOString() };
  const encrypted = await encryptTokenRecord(record, encryptionKey);
  const env = { TIKTOK_TOKEN_ENCRYPTION_KEY: encryptionKey, TIKTOK_APP_KEY: 'app', TIKTOK_APP_SECRET: 'private-secret', TIKTOK_OAUTH_KV: { get: async () => encrypted } };
  let pages = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).includes('identitytoolkit')) return Response.json({ users: [{ emailVerified: true, email: 'sellerhunghienhoa@gmail.com' }] });
    const parsed = new URL(url);
    assert.equal(options.redirect, 'manual');
    assert.equal(parsed.hostname, 'open-api.tiktokglobalshop.com');
    assert.equal(options.headers['x-tts-access-token'], 'private-access');
    assert.equal(String(url).includes('private-'), false);
    assert.match(parsed.searchParams.get('sign'), /^[a-f0-9]{64}$/);
    if (parsed.pathname.includes('authorization')) return Response.json({ code: 0, data: { shops: [{ id: '99', cipher: 'cipher' }] } });
    pages++;
    assert.equal(parsed.searchParams.get('end_date_lt'), '2026-10-29');
    return Response.json({ code: 0, data: { live_stream_sessions: [rawLive, { ...rawLive, id: '22', username: 'other' }], ...(pages === 1 ? { next_page_token: 'next' } : {}) } });
  });
  const result = await worker.fetch(new Request(origin + '/api/tiktok/live/sync', { method: 'POST', headers: { Authorization: 'Bearer google-test', Origin: origin }, body: JSON.stringify({ from: '2026-10-22', to: '2026-10-28' }) }), env);
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(pages, 2);
  assert.equal(data.sessions.length, 1);
  assert.equal(data.ignored, 2);
  assert.equal(JSON.stringify(data).includes('private-'), false);
});

test('LIVE sync blocks missing seller connection, invalid dates and unauthenticated access', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ users: [{ emailVerified: true, email: 'sellerhunghienhoa@gmail.com' }] }));
  const request = body => new Request(origin + '/api/tiktok/live/sync', { method: 'POST', headers: { Authorization: 'Bearer google-test', Origin: origin }, body: JSON.stringify(body) });
  assert.equal((await worker.fetch(request({ from: '2026-01-01', to: '2026-10-28' }), {})).status, 400);
  const missing = await worker.fetch(request({ from: '2026-10-22', to: '2026-10-28' }), {});
  assert.equal((await missing.json()).error, 'TIKTOK_SELLER_NOT_CONNECTED');
  assert.equal((await worker.fetch(new Request(origin + '/api/tiktok/live/sync', { method: 'POST' }), {})).status, 401);
});

test('TikTok absolute expiry timestamps are not added to the current time', () => {
  const token = normalizeTokenResponse({ data: { access_token:'a',refresh_token:'r',user_type:0,access_token_expire_in:1793200000 } }, { id:'shopkhangbaby',kind:'seller',expectedUserType:0 });
  assert.equal(token.accessExpiresAt, new Date(1793200000 * 1000).toISOString());
});

test('legacy token records repair absolute expiry without modifying credentials or valid durations', () => {
  const issued = Date.parse('2026-10-28T13:38:01Z');
  const actualAccess = Date.parse('2026-11-04T13:38:01Z');
  const actualRefresh = Date.parse('2126-11-04T13:38:01Z');
  const repaired = repairLegacyTokenExpiry({accessToken:'kept',refreshToken:'kept-too',refreshedAt:new Date(issued).toISOString(),accessExpiresAt:new Date(issued+actualAccess).toISOString(),refreshExpiresAt:new Date(issued+actualRefresh).toISOString()});
  assert.equal(repaired.accessExpiresAt,new Date(actualAccess).toISOString());
  assert.equal(repaired.refreshExpiresAt,new Date(actualRefresh).toISOString());
  assert.equal(repaired.accessToken,'kept');
  const valid={refreshedAt:new Date(issued).toISOString(),accessExpiresAt:new Date(actualAccess).toISOString(),refreshExpiresAt:new Date(issued+86400000).toISOString()};
  assert.deepEqual(repairLegacyTokenExpiry(valid),valid);
  const modern={...valid,expiryFormat:'unix-v2'};
  assert.deepEqual(repairLegacyTokenExpiry(modern),modern);
});
