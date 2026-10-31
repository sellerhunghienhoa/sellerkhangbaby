import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import worker, { encryptTokenRecord } from '../src/worker.js';

const origin = 'https://app.example.test';
const frontend = await readFile(new URL('../js/live-sync.js', import.meta.url), 'utf8');

test('callShopApi retries on 429 and succeeds on next attempt', async t => {
  const encryptionKey = randomBytes(32).toString('base64');
  const encrypted = await encryptTokenRecord({
    accessToken: 'creator-retry-token',
    refreshToken: 'refresh',
    expiryFormat: 'unix-v2',
    grantedScopes: ['creator.data.live.read.public'],
    accessExpiresAt: new Date(Date.now() + 3600000).toISOString()
  }, encryptionKey);
  const env = {
    TIKTOK_TOKEN_ENCRYPTION_KEY: encryptionKey,
    TIKTOK_APP_KEY: 'app',
    TIKTOK_APP_SECRET: 'secret',
    TIKTOK_OAUTH_KV: { get: async () => encrypted }
  };

  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    if (url.hostname === 'identitytoolkit.googleapis.com') {
      return Response.json({ users: [{ emailVerified: true, email: 'sellerhunghienhoa@gmail.com' }] });
    }
    if (url.pathname === '/analytics/202502/live_rooms/123/core_stats') {
      attempts++;
      if (attempts === 1) {
        return new Response('Too Many Requests', { status: 429, headers: { 'retry-after': '0' } });
      }
      return Response.json({ code: 0, data: { stats: { local_gmv: { amount: '15000000', currency: 'VND' } } } });
    }
    return Response.json({ code: 0, data: {} });
  });

  const response = await worker.fetch(new Request(origin + '/api/tiktok/live/core-stats', {
    method: 'POST',
    headers: { Authorization: 'Bearer google-test', Origin: origin },
    body: JSON.stringify({ creator: 'shopkhangbaby', liveIds: ['123'] })
  }), env);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.rows[0].creatorReportedGmv, 15000000);
  assert.equal(attempts, 2, 'Should have retried once and succeeded');
});

test('callShopApi retries on code 36009002 and throws TIKTOK_RATE_LIMITED when exhausted', async t => {
  const encryptionKey = randomBytes(32).toString('base64');
  const encrypted = await encryptTokenRecord({
    accessToken: 'seller-rate-limited-token',
    refreshToken: 'refresh',
    expiryFormat: 'unix-v2',
    grantedScopes: ['data.shop_analytics.public.read'],
    accessExpiresAt: new Date(Date.now() + 3600000).toISOString()
  }, encryptionKey);
  const env = {
    TIKTOK_TOKEN_ENCRYPTION_KEY: encryptionKey,
    TIKTOK_APP_KEY: 'app',
    TIKTOK_APP_SECRET: 'secret',
    TIKTOK_OAUTH_KV: { get: async () => encrypted }
  };

  let callCount = 0;
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    if (url.hostname === 'identitytoolkit.googleapis.com') {
      return Response.json({ users: [{ emailVerified: true, email: 'sellerhunghienhoa@gmail.com' }] });
    }
    if (url.pathname === '/authorization/202309/shops') {
      callCount++;
      return Response.json({ code: 36009002, message: 'Too many requests in a short period of time' });
    }
    return Response.json({ code: 0, data: {} });
  });

  const response = await worker.fetch(new Request(origin + '/api/tiktok/live/sync', {
    method: 'POST',
    headers: { Authorization: 'Bearer google-test', Origin: origin },
    body: JSON.stringify({ from: '2026-10-01', to: '2026-10-02' })
  }), env);

  assert.equal(response.status, 429);
  const body = await response.json();
  assert.equal(body.error, 'TIKTOK_RATE_LIMITED');
  assert.equal(callCount, 3, 'Initial call + 2 retries = 3 calls');
});

test('enrichCreatorLiveGmv reuses finalized creatorReportedGmv for sessions ended > 48h', async () => {
  const ctx = createContext({
    state: {
      sessions: [
        {
          id: 'TTLIVE-99-old-live',
          tiktokLiveId: 'old-live',
          channel: 'shopkhangbaby',
          endedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
          tiktokReportedGmv: 1000000,
          creatorReportedGmv: 1500000,
          affiliateGmv: 500000
        }
      ]
    },
    liveRefreshOnly: false,
    productionApiFetch: async () => {
      throw new Error('Should not call API for finalized sessions');
    },
    parseTikTokApiResponse: async res => res
  });
  runInContext(frontend, ctx);

  const incomingOld = [
    {
      id: 'TTLIVE-99-old-live',
      tiktokLiveId: 'old-live',
      channel: 'shopkhangbaby',
      endedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      tiktokReportedGmv: 1000000
    }
  ];

  const result = await ctx.enrichCreatorLiveGmv(incomingOld);
  assert.equal(result.length, 1);
  assert.equal(result[0].creatorReportedGmv, 1500000);
  assert.equal(result[0].affiliateGmv, 500000);
});
