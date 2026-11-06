import assert from 'node:assert/strict';
import test from 'node:test';
import {createHmac,timingSafeEqual} from 'node:crypto';
import { handleWebhook, mapTikTokOrderStatus, applyOrderStatusUpdateToSnapshot, getWebhookLogs } from '../src/worker.js';

if (!crypto.subtle.timingSafeEqual) crypto.subtle.timingSafeEqual=(a,b)=>timingSafeEqual(Buffer.from(a),Buffer.from(b));
const webhookSecrets={TIKTOK_APP_KEY:'test-only-app',TIKTOK_APP_SECRET:'test-only-app-secret',GITHUB_WEBHOOK_SECRET:'test-only-github',CLOUDFLARE_WEBHOOK_SECRET:'test-only-cloudflare'};
function signedRequest(url,init){
  const headers=new Headers(init.headers);
  const provider=new URL(url).pathname.split('/').pop();
  if(provider==='tiktok')headers.set('Authorization',createHmac('sha256',webhookSecrets.TIKTOK_APP_SECRET).update(webhookSecrets.TIKTOK_APP_KEY+init.body).digest('hex'));
  if(provider==='github')headers.set('x-hub-signature-256','sha256='+createHmac('sha256',webhookSecrets.GITHUB_WEBHOOK_SECRET).update(init.body).digest('hex'));
  if(provider==='cloudflare')headers.set('cf-webhook-auth',webhookSecrets.CLOUDFLARE_WEBHOOK_SECRET);
  return new Request(url,{...init,headers});
}

test('mapTikTokOrderStatus correctly maps numeric and string statuses', () => {
  assert.equal(mapTikTokOrderStatus(121), 'DELIVERED');
  assert.equal(mapTikTokOrderStatus(122), 'DELIVERED');
  assert.equal(mapTikTokOrderStatus('DELIVERED'), 'DELIVERED');
  assert.equal(mapTikTokOrderStatus(120), 'SHIPPING');
  assert.equal(mapTikTokOrderStatus('IN_TRANSIT'), 'SHIPPING');
  assert.equal(mapTikTokOrderStatus(111), 'PENDING');
  assert.equal(mapTikTokOrderStatus(130), 'CANCELLED');
  assert.equal(mapTikTokOrderStatus(140), 'RETURNED');
});

test('handleWebhook TikTok verification ping returns success', async () => {
  const req = signedRequest('https://sellerkhangbaby.online/api/webhooks/tiktok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 0, challenge: 'challenge_12345' })
  });
  const res = await handleWebhook(req, webhookSecrets);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.code, 0);
  assert.equal(data.message, 'success');
  assert.equal(data.challenge, 'challenge_12345');
});

test('handleWebhook TikTok ORDER_STATUS_CHANGE updates snapshot in KV', async () => {
  const stored = new Map();
  const initialSnapshot = {
    syncedAt: '2026-11-02T10:00:00.000Z',
    orders: [
      { orderId: 'ord_1', status: 'SHIPPING', amount: 500000, sessionId: 'ses_1', roomIds: ['room_1'] }
    ],
    sessions: [
      { id: 'ses_1', tiktokLiveId: 'room_1', grossLiveGmv: 500000, affiliateGmv: 0, pendingRecGmv: 500000, cancelReturnGmv: 0 }
    ]
  };
  stored.set('tiktok:latest_snapshot', JSON.stringify(initialSnapshot));

  const env = {
    ...webhookSecrets,
    TIKTOK_OAUTH_KV: {
      get: async k => stored.get(k) || null,
      put: async (k, v) => { stored.set(k, v); }
    }
  };

  const req = signedRequest('https://sellerkhangbaby.online/api/webhooks/tiktok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 1,
      data: { order_id: 'ord_1', order_status: 121 }
    })
  });

  const res = await handleWebhook(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.code, 0);

  const updatedSnapshot = JSON.parse(stored.get('tiktok:latest_snapshot'));
  assert.equal(updatedSnapshot.orders[0].status, 'DELIVERED');
  assert.deepEqual(updatedSnapshot.sessions,initialSnapshot.sessions);
});

test('handleWebhook GitHub ping and push events', async () => {
  const stored = new Map();
  const env = {
    ...webhookSecrets,
    TIKTOK_OAUTH_KV: {
      get: async k => stored.get(k) || null,
      put: async (k, v) => { stored.set(k, v); }
    }
  };

  // Ping
  const pingReq = signedRequest('https://sellerkhangbaby.online/api/webhooks/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-github-event': 'ping' },
    body: JSON.stringify({ zen: 'Keep it logically awesome.' })
  });
  const pingRes = await handleWebhook(pingReq, env);
  const pingData = await pingRes.json();
  assert.equal(pingData.message, 'pong');

  // Push
  const pushReq = signedRequest('https://sellerkhangbaby.online/api/webhooks/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-github-event': 'push' },
    body: JSON.stringify({
      ref: 'refs/heads/main',
      repository: { full_name: 'sellerhunghienhoa/sellerkhangbaby' },
      head_commit: { id: 'a9c3b33123456', message: 'deploy webhook' }
    })
  });
  const pushRes = await handleWebhook(pushReq, env);
  assert.equal(pushRes.status, 200);

  const logs = await getWebhookLogs(env);
  assert.ok(logs.length >= 2);
  assert.equal(logs[0].source, 'github');
});

test('handleWebhook Cloudflare notifications and health alerts', async () => {
  const stored = new Map();
  const env = {
    ...webhookSecrets,
    TIKTOK_OAUTH_KV: {
      get: async k => stored.get(k) || null,
      put: async (k, v) => { stored.set(k, v); }
    }
  };

  const cfReq = signedRequest('https://sellerkhangbaby.online/api/webhooks/cloudflare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'workers_alert',
      text: 'Worker execution spike observed',
      alert_type: 'workers_metrics'
    })
  });
  const cfRes = await handleWebhook(cfReq, env);
  assert.equal(cfRes.status, 200);
  const data = await cfRes.json();
  assert.equal(data.ok, true);

  const logs = await getWebhookLogs(env);
  assert.equal(logs[0].source, 'cloudflare');
  assert.equal(logs[0].event, 'workers_alert');
  assert.equal(logs[0].text, 'Worker execution spike observed');
});
