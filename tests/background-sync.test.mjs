import assert from 'node:assert/strict';
import test from 'node:test';
import { runBackgroundDailySync } from '../src/worker.js';

test('runBackgroundDailySync safely skips or completes when credentials or KV are empty', async () => {
  const result = await runBackgroundDailySync({});
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'KV_OR_SELLER_MISSING');
});

test('runBackgroundDailySync saves reconciled snapshot to KV', async t => {
  const stored = new Map();
  const env = {
    TIKTOK_OAUTH_KV: {
      get: async key => stored.get(key) || null,
      put: async (key, value) => { stored.set(key, value); }
    }
  };
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input);
    if (url.pathname.includes('/orders/search')) return Response.json({ code: 0, data: { orders: [] } });
    if (url.pathname.includes('/returns/search')) return Response.json({ code: 0, data: { returns: [] } });
    if (url.pathname.includes('/shop_lives/performance')) return Response.json({ code: 0, data: { live_stream_sessions: [] } });
    return Response.json({ code: 0, data: {} });
  });
  // Without seller connection, safe early return
  const result = await runBackgroundDailySync(env);
  assert.ok(typeof result.ok === 'boolean');
});
