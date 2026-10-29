import assert from 'node:assert/strict';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import test from 'node:test';
import worker, { decryptTokenRecord } from '../src/worker.js';

const origin = 'https://app.example.test';
if (!crypto.subtle.timingSafeEqual) {
  crypto.subtle.timingSafeEqual = (a, b) => timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

for (const [kind, id, userType,creator] of [['seller', 'shopkhangbaby', 0], ['creator', 'mekhangsua', 1,'mekhangsua'],['creator','shopkhangbaby-creator',1,'shopkhangbaby']]) {
  test(`${kind}: authorize, callback and encrypted storage preserve the app session`, async t => {
    const records = new Map();
    const env = {
      FIREBASE_WEB_API_KEY: 'firebase-test', TIKTOK_APP_KEY: 'app-test', TIKTOK_APP_SECRET: 'secret-test',
      TIKTOK_SERVICE_ID: 'service-test', TIKTOK_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      TIKTOK_OAUTH_KV: { get: async key => records.get(key), put: async (key, value) => records.set(key, value) }
    };
    t.mock.method(globalThis, 'fetch', async url => {
      if (String(url).startsWith('https://identitytoolkit.googleapis.com/')) {
        return Response.json({ users: [{ emailVerified: true, email: 'sellerhunghienhoa@gmail.com', localId: 'admin-test' }] });
      }
      if(new URL(url).pathname.endsWith('/profiles'))return Response.json({code:0,data:{username:creator}});
      assert.equal(new URL(url).hostname, 'auth.tiktok-shops.com');
      return Response.json({ code: 0, data: { access_token: 'access-test', refresh_token: 'refresh-test', user_type: userType, open_id: id } });
    });
    const path = kind === 'seller' ? `/api/tiktok/seller/${id}/authorize` : `/api/tiktok/creator/${creator}/authorize`;
    const start = await worker.fetch(new Request(origin + path, { method: 'POST', headers: { Origin: origin, Authorization: 'Bearer google-session-test' } }), env);
    assert.equal(start.status, 200);
    const authUrl = new URL((await start.json()).url);
    const state = authUrl.searchParams.get('state');
    const cookie = start.headers.get('Set-Cookie').split(';')[0];
    // A shared app may return Creator authorization to its existing Seller URL.
    const callbackPath = kind === 'creator' ? '/oauth/tiktok/seller/callback' : '/oauth/tiktok/callback';
    const result = await worker.fetch(new Request(`${origin}${callbackPath}?state=${state}&code=code-test`, { headers: { Cookie: cookie } }), env);
    assert.equal(result.status, 200);
    const html = await result.text();
    assert.match(html, /postMessage/);
    assert.doesNotMatch(html, /access-test|refresh-test|google-session-test|firebase-auth/);
    assert.match(result.headers.get('Set-Cookie'), /^TikTokOAuthState=; Max-Age=0;/);
    const stored = await decryptTokenRecord(records.get(`tiktok:token:${id}`), env.TIKTOK_TOKEN_ENCRYPTION_KEY);
    assert.equal(stored.id, id);
    const status = await worker.fetch(new Request(origin + '/api/tiktok/status', { headers: { Authorization: 'Bearer google-session-test' } }), env);
    assert.equal(status.status, 200);
    const body = await status.json();
    assert.equal(body.connections.length, 3);
    assert.equal(body.connections.find(item => item.id === id).status, 'connected');
  });
}

test('callback without the original browser cookie fails without token exchange', async t => {
  const network = t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not exchange an untrusted code'); });
  const result = await worker.fetch(new Request(origin + '/oauth/tiktok/seller/callback?state=wrong&code=untrusted-code'), {});
  assert.match(await result.text(), /invalid_state/);
  assert.equal(network.mock.callCount(), 0);
});
test('authorizing the wrong Creator cannot overwrite either Creator or Seller connection',async t=>{
  const records=new Map([['tiktok:token:shopkhangbaby','existing-seller'],['tiktok:token:mekhangsua','existing-creator']]);
  const env={TIKTOK_APP_KEY:'app',TIKTOK_APP_SECRET:'secret',TIKTOK_TOKEN_ENCRYPTION_KEY:randomBytes(32).toString('base64'),TIKTOK_OAUTH_KV:{get:async key=>records.get(key),put:async(key,value)=>records.set(key,value)}};
  t.mock.method(globalThis,'fetch',async input=>{
    const url=new URL(input);if(url.hostname==='identitytoolkit.googleapis.com')return Response.json({users:[{emailVerified:true,email:'sellerhunghienhoa@gmail.com'}]});
    if(url.pathname.endsWith('/profiles'))return Response.json({code:0,data:{username:'mekhangsua'}});
    return Response.json({code:0,data:{access_token:'wrong-access',refresh_token:'wrong-refresh',user_type:1,open_id:'creator'}});
  });
  const start=await worker.fetch(new Request(origin+'/api/tiktok/creator/shopkhangbaby/authorize',{method:'POST',headers:{Origin:origin,Authorization:'Bearer test'}}),env);
  const state=new URL((await start.json()).url).searchParams.get('state');const cookie=start.headers.get('Set-Cookie').split(';')[0];
  const result=await worker.fetch(new Request(origin+'/oauth/tiktok/creator/callback?state='+state+'&code=test-code',{headers:{Cookie:cookie}}),env);
  assert.match(await result.text(),/TIKTOK_CREATOR_ACCOUNT_MISMATCH/);assert.equal(records.size,2);assert.equal(records.get('tiktok:token:shopkhangbaby'),'existing-seller');assert.equal(records.get('tiktok:token:mekhangsua'),'existing-creator');
});

test('API requires Google authentication and rejects cross-origin authorization', async t => {
  assert.equal((await worker.fetch(new Request(origin + '/api/tiktok/status'), {})).status, 401);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ users: [{ emailVerified: true, email: 'sellerhunghienhoa@gmail.com' }] }));
  const result = await worker.fetch(new Request(origin + '/api/tiktok/creator/authorize', { method: 'POST', headers: { Authorization: 'Bearer google-test', Origin: 'https://other.example.test' } }), {});
  assert.equal(result.status, 403);
});

test('invalid encryption configuration is reported and blocks authorization before leaving the app', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ users: [{ emailVerified: true, email: 'sellerhunghienhoa@gmail.com' }] }));
  const env = { TIKTOK_TOKEN_ENCRYPTION_KEY: 'invalid-key', TIKTOK_OAUTH_KV: { get: async () => null }, TIKTOK_APP_KEY: 'app', TIKTOK_APP_SECRET: 'secret', TIKTOK_SERVICE_ID: 'service' };
  const headers = { Authorization: 'Bearer google-test', Origin: origin };
  const result = await worker.fetch(new Request(origin + '/api/tiktok/status', { headers }), env);
  const status = await result.json();
  assert.equal(status.backendReady, false);
  assert.ok(status.missingSecrets.includes('TOKEN_ENCRYPTION_KEY_INVALID'));
  assert.ok(status.connections.every(connection => !connection.authorizationReady));
  const start = await worker.fetch(new Request(origin + '/api/tiktok/seller/shopkhangbaby/authorize', { method: 'POST', headers }), env);
  assert.equal(start.status, 503);
  assert.deepEqual(await start.json(), { error: 'TOKEN_ENCRYPTION_KEY_INVALID' });
});
