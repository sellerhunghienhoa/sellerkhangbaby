import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../js/tiktok-oauth.js', import.meta.url), 'utf8');
function context(config) {
  const elements = new Map(['telegramStatusPill', 'telegramStatusText', 'tgBotToken', 'tgChatId', 'tgAutoReportToggle', 'tgKpiStatus', 'tgPillOnline', 'tgKpiToken', 'tgKpiChatId', 'tgCardSub', 'tgInfoRecipient', 'tgInfoTokenMasked'].map(id => [id, { value: '', textContent: '', style: {} }]));
  const ctx = createContext({ window: {}, document: { getElementById: id => elements.get(id) }, isAdmin: () => true, console, productionApiFetch: async () => ({ ok: true, json: async () => config }) });
  runInContext(source, ctx);
  return { ctx, elements };
}

test('Telegram frontend contains no embedded bot credential or recipient', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/.test(source + html), 'Bot credentials must be server-side only');
  assert.ok(!/DEFAULT_TG_CHAT_ID\s*=\s*'\d+'/.test(source), 'Recipient must come from authenticated settings');
  assert.ok(/id="tgKpiStatus">Đang kiểm tra/.test(html));
  assert.ok(!/id="tgAutoReportToggle"[^>]*checked/.test(html));
  assert.ok(/id="tgChatId"[^>]*placeholder="Nhập Chat ID mới"/.test(html));
});

test('Telegram settings use a masked placeholder without filling a token', async () => {
  const { ctx, elements } = context({ enabled: true, configured: true, maskedToken: '123456...abcd', chatId: '123***89' });
  await ctx.loadTelegramSettings();
  assert.equal(elements.get('tgBotToken').value, '');
  assert.equal(elements.get('tgBotToken').placeholder, '123456...abcd');
  assert.equal(elements.get('tgChatId').value, '123***89');
});

test('Telegram without configured credentials is never displayed as online', async () => {
  const { ctx, elements } = context({ enabled: true, configured: false, maskedToken: '', chatId: '' });
  await ctx.loadTelegramSettings();
  assert.equal(elements.get('tgPillOnline').textContent, 'Chưa cấu hình');
  assert.equal(elements.get('tgAutoReportToggle').checked, false);
});

test('failed Telegram settings stop the loading status and disable saving via toggle', async () => {
  const { ctx, elements } = context({});
  ctx.productionApiFetch = async () => ({ ok: false });
  await ctx.loadTelegramSettings();
  assert.equal(elements.get('tgKpiStatus').textContent, 'Chưa đọc được cấu hình');
  assert.equal(elements.get('tgAutoReportToggle').disabled, true);
});
