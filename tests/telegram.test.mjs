import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTelegramConfig,
  saveTelegramConfig,
  sendTelegramMessage,
  sendTelegramTestMessage,
  sendTelegramDailyReport
} from '../src/worker.js';

test('Telegram config defaults to empty when unconfigured', async () => {
  const env = { TIKTOK_OAUTH_KV: { get: async () => null, put: async () => {} } };
  const config = await getTelegramConfig(env);
  assert.equal(config.enabled, false);
  assert.equal(config.botToken, '');
  assert.equal(config.chatId, '');
});

test('Telegram config saves and returns masked token', async () => {
  let stored = null;
  const env = {
    TIKTOK_OAUTH_KV: {
      get: async () => stored,
      put: async (key, val) => { stored = val; }
    }
  };

  const result = await saveTelegramConfig(env, {
    botToken: '1234567890:ABCdefGHIjklmnOPQRstuv',
    chatId: '987654321',
    enabled: true
  });

  assert.equal(result.enabled, true);
  assert.equal(result.configured, true);
  assert.equal(result.chatId, '987***21');
  assert.equal(result.maskedToken, '123456...stuv');

  const config = await getTelegramConfig(env);
  assert.equal(config.botToken, '1234567890:ABCdefGHIjklmnOPQRstuv');
  assert.equal(config.chatId, '987654321');
});

test('sendTelegramMessage sends correct POST payload to Telegram API', async t => {
  let requestedUrl = '';
  let requestedBody = null;

  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requestedUrl = url;
    requestedBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ ok: true, result: { message_id: 101 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  const res = await sendTelegramMessage('MY_TOKEN', '12345', '<b>Test</b>');
  assert.equal(res.ok, true);
  assert.equal(requestedUrl, 'https://api.telegram.org/botMY_TOKEN/sendMessage');
  assert.equal(requestedBody.chat_id, '12345');
  assert.equal(requestedBody.text, '<b>Test</b>');
  assert.equal(requestedBody.parse_mode, 'HTML');
});

test('sendTelegramDailyReport formats stats and sends report when enabled', async t => {
  let sentText = '';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    sentText = JSON.parse(options.body).text;
    return new Response(JSON.stringify({ ok: true, result: { message_id: 102 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

  const mockSnapshot = {
    sessions: [
      { id: 'S1', date: today, slot: '20:00 - 23:00', channel: 'mekhangsua', grossLiveGmv: 50000000 }
    ],
    orders: [
      { orderId: 'O1', date: today, status: 'DELIVERED', amount: 30000000, refund: 0 },
      { orderId: 'O2', date: today, status: 'SHIPPING', amount: 15000000, refund: 0 },
      { orderId: 'O3', date: today, status: 'CANCELLED', amount: 5000000, refund: 0 }
    ]
  };

  const env = {
    TIKTOK_OAUTH_KV: {
      get: async key => {
        if (key === 'telegram:config') {
          return JSON.stringify({ botToken: 'TEST_TOKEN', chatId: '12345', enabled: true });
        }
        if (key === 'tiktok:snapshot:' + today || key === 'tiktok:latest_snapshot') {
          return JSON.stringify(mockSnapshot);
        }
        return null;
      },
      put: async () => {}
    }
  };

  const res = await sendTelegramDailyReport(env);
  assert.equal(res.ok, true);
  assert.match(sentText, /BÁO CÁO DOANH SỐ/);
  assert.match(sentText, /Thực nhận \(Delivered\):/);
  assert.match(sentText, /30\.000\.000 đ/);
  assert.match(sentText, /Đang giao \(Chờ đối soát\):/);
  assert.match(sentText, /15\.000\.000 đ/);
  assert.match(sentText, /Hoàn \/ Hủy:/);
  assert.match(sentText, /5\.000\.000 đ/);
  assert.match(sentText, /Ca xuất sắc nhất:/);
  assert.match(sentText, /@mekhangsua/);
});
