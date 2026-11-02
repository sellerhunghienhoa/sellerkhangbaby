import assert from 'node:assert/strict';
import test from 'node:test';
import { handleWebhook, mapTikTokOrderStatus, applyOrderStatusUpdateToSnapshot, getWebhookLogs } from '../src/worker.js';

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
  const req = new Request('https://sellerkhangbaby.online/api/webhooks/tiktok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 0, challenge: 'challenge_12345' })
  });
  const res = await handleWebhook(req, {});
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
    TIKTOK_OAUTH_KV: {
      get: async k => stored.get(k) || null,
      put: async (k, v) => { stored.set(k, v); }
    }
  };

  const req = new Request('https://sellerkhangbaby.online/api/webhooks/tiktok', {
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
  assert.equal(updatedSnapshot.sessions[0].pendingRecGmv, 0);
  assert.equal(updatedSnapshot.sessions[0].status, 'RECONCILED');
});

test('handleWebhook GitHub ping and push events', async () => {
  const stored = new Map();
  const env = {
    TIKTOK_OAUTH_KV: {
      get: async k => stored.get(k) || null,
      put: async (k, v) => { stored.set(k, v); }
    }
  };

  // Ping
  const pingReq = new Request('https://sellerkhangbaby.online/api/webhooks/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-github-event': 'ping' },
    body: JSON.stringify({ zen: 'Keep it logically awesome.' })
  });
  const pingRes = await handleWebhook(pingReq, env);
  const pingData = await pingRes.json();
  assert.equal(pingData.message, 'pong');

  // Push
  const pushReq = new Request('https://sellerkhangbaby.online/api/webhooks/github', {
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
