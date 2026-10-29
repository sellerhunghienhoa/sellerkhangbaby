import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { Miniflare, Response } from 'miniflare';
import { encryptTokenRecord } from '../src/worker.js';

test('workerd executes LIVE sync and rejects redirects without forwarding tokens', async () => {
  const source = await readFile(new URL('../src/worker.js', import.meta.url), 'utf8');
  const usageSource = await readFile(new URL('../src/storage-usage.js', import.meta.url), 'utf8');
  const secret = randomBytes(32).toString('base64');
  let mode = 'success';
  let shopCalls = 0;
  const runtime = new Miniflare({
    workers: [{
      config: {
        name: 'runtime-test', compatibilityDate: '2026-10-28',
        manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: source }, 'storage-usage.js': { type: 'esm', contents: usageSource } } },
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
        if (url.hostname === 'api.github.com') return Response.json(url.pathname.endsWith('/releases') ? [] : { size: 16 });
        assert.equal(url.hostname, 'open-api.tiktokglobalshop.com');
        if (url.pathname.startsWith('/affiliate_creator/')) {
          assert.equal(request.headers.get('x-tts-access-token'), 'test-creator');
          if (url.pathname.endsWith('/profiles')) return Response.json({code:0,data:{username:'mekhangsua'}});
          assert.equal(request.method,'POST');
          const filter=await request.json();
          assert.equal(filter.create_time_lt-filter.create_time_ge,86400);
          return Response.json({code:0,data:{orders:[]}});
        }
        assert.equal(request.headers.get('x-tts-access-token'), 'test-access');
        shopCalls++;
        if (mode === 'redirect') return new Response(null, { status: 302, headers: { Location: 'https://untrusted.example/' } });
        if (url.pathname.includes('/authorization/')) return Response.json({ code: 0, data: { shops: [{ id: '99', cipher: 'test-cipher' }] } });
        if(url.pathname==='/order/202309/orders/search')return Response.json({code:0,data:{orders:[]}});
        if(url.pathname==='/return_refund/202602/returns/search')return Response.json({code:0,data:{}});
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
    const usage = await runtime.dispatchFetch('https://runtime.example/api/storage/usage', { headers: { Authorization: 'Bearer test-google' } });
    assert.equal(usage.status, 200);
    const providers = (await usage.json()).providers;
    assert.equal(providers[0].metrics[0].used, 16384);
    assert.equal(providers[1].metrics[0].used, null);
    assert.equal(providers[2].metrics[0].used, null);
    await kv.put('tiktok:token:mekhangsua', await encryptTokenRecord({accessToken:'test-creator',refreshToken:'refresh-creator',accessExpiresAt:new Date(Date.now()+3600000).toISOString(),expiryFormat:'unix-v2',grantedScopes:['creator.affiliate_collaboration.read','creator.affiliate.info']},secret));
    const affiliate=await runtime.dispatchFetch('https://runtime.example/api/tiktok/affiliate/sync',{method:'POST',headers:{Origin:'https://runtime.example',Authorization:'Bearer test-google','Content-Type':'application/json'},body:JSON.stringify({from:'2026-10-28',to:'2026-10-28'})});
    assert.equal(affiliate.status,200,await affiliate.clone().text());
    assert.equal((await affiliate.json()).days[0].gmv,0);
    mode='success';
    await kv.put('tiktok:token:shopkhangbaby',await encryptTokenRecord({accessToken:'test-access',refreshToken:'test-refresh',accessExpiresAt:new Date(Date.now()+3600000).toISOString(),expiryFormat:'unix-v2',grantedScopes:['seller.order.info','seller.return_refund.basic']},secret));
    const orders=await runtime.dispatchFetch('https://runtime.example/api/tiktok/orders/sync',{method:'POST',headers:{Origin:'https://runtime.example',Authorization:'Bearer test-google'},body:JSON.stringify({from:'2026-10-28',to:'2026-10-28'})});
    assert.equal(orders.status,200,await orders.clone().text());const snapshot=await orders.json();assert.deepEqual(snapshot.orders,[]);assert.deepEqual(snapshot.returns,[]);
  } finally {
    await runtime.dispose();
  }
});
