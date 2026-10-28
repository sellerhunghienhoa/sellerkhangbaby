import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { Miniflare, Response } from 'miniflare';
import { encryptTokenRecord } from '../src/worker.js';

test('workerd executes LIVE sync and rejects redirects without forwarding tokens', async () => {
  const source = await readFile(new URL('../src/worker.js', import.meta.url), 'utf8');
  const secret = randomBytes(32).toString('base64');
  let mode = 'success';
  let shopCalls = 0;
  const runtime = new Miniflare({
    workers: [{
      config: {
        name: 'runtime-test', compatibilityDate: '2026-10-28',
        manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: source } } },
        env: {
          TIKTOK_OAUTH_KV: { type: 'kv', id: 'test-kv' },
          TIKTOK_TOKEN_ENCRYPTION_KEY: { type: 'text', value: secret },
          TIKTOK_APP_KEY: { type: 'text', value: 'app-test' },
          TIKTOK_APP_SECRET: { type: 'text', value: 'secret-test' },
          FIREBASE_WEB_API_KEY: { type: 'text', value: 'firebase-test' }
        }
      },
      dev: { outboundService: { type: 'fetcher', handler: async request => {
        const url = new URL(request.url);
        if (url.hostname === 'identitytoolkit.googleapis.com') return Response.json({ users: [{ emailVerified: true, email: 'sellerhunghienhoa@gmail.com' }] });
        assert.equal(url.hostname, 'open-api.tiktokglobalshop.com');
        assert.equal(request.headers.get('x-tts-access-token'), 'test-access');
        shopCalls++;
        if (mode === 'redirect') return new Response(null, { status: 302, headers: { Location: 'https://untrusted.example/' } });
        if (url.pathname.includes('/authorization/')) return Response.json({ code: 0, data: { shops: [{ id: '99', cipher: 'test-cipher' }] } });
        return Response.json({ code: 0, data: { live_stream_sessions: [] } });
      } } }
    }]
  });
  try {
    const kv = await runtime.getKVNamespace('TIKTOK_OAUTH_KV');
    await kv.put('tiktok:token:shopkhangbaby', await encryptTokenRecord({ accessToken: 'test-access', refreshToken: 'test-refresh', accessExpiresAt: new Date(Date.now()+3600000).toISOString(), expiryFormat: 'unix-v2', grantedScopes: ['data.shop_analytics.public.read'] }, secret));
    const send = () => runtime.dispatchFetch('https://runtime.example/api/tiktok/live/sync', { method: 'POST', headers: { Origin: 'https://runtime.example', Authorization: 'Bearer test-google', 'Content-Type': 'application/json' }, body: JSON.stringify({ from: '2026-10-22', to: '2026-10-28' }) });
    const result = await send();
    assert.equal(result.status, 200, await result.clone().text());
    assert.deepEqual((await result.json()).sessions, []);
    assert.equal(shopCalls, 2);
    mode = 'redirect';
    const rejected = await send();
    assert.equal(rejected.status, 502);
    assert.equal((await rejected.json()).error, 'TIKTOK_LIVE_REDIRECT_REJECTED');
    assert.equal(shopCalls, 3);
  } finally {
    await runtime.dispose();
  }
});
