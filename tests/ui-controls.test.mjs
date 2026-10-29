import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

test('sync and export actions live only in their dedicated tabs', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const render = await readFile(new URL('../js/render.js', import.meta.url), 'utf8');
  const exportTab = html.indexOf('id="TAB_EXPORT"');
  const apiTab = html.indexOf('id="TAB_TIKTOK_API"');
  const renderExport = render.indexOf('Render Tab 5 (Công cụ): Xuất file riêng');

  assert.ok(exportTab > 0 && apiTab > exportTab && renderExport > 0);
  assert.doesNotMatch(html.slice(0, exportTab), /onclick="export/);
  assert.doesNotMatch(render.slice(0, renderExport), /onclick="export/);
  assert.equal((html.match(/data-live-sync/g) || []).length, 1);
  assert.equal((html.match(/data-order-sync onclick/g) || []).length, 1);
  assert.equal((html.match(/data-affiliate-sync/g) || []).length, 1);
  assert.match(html.slice(exportTab, apiTab), /onclick="export/);
  assert.match(html.slice(apiTab), /data-live-sync/);
});

test('long page explanations live in the dedicated guide tab', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const auth = await readFile(new URL('../js/auth.js', import.meta.url), 'utf8');
  const modals = await readFile(new URL('../js/modals.js', import.meta.url), 'utf8');
  const guideTab = html.indexOf('id="TAB_GUIDE"');
  const apiTab = html.indexOf('id="TAB_TIKTOK_API"');

  assert.ok(guideTab > 0 && apiTab > guideTab);
  for (const section of ['guide-kpi', 'guide-live', 'guide-orders', 'guide-returns', 'guide-staff', 'guide-attendance', 'guide-api']) {
    assert.match(html.slice(guideTab, apiTab), new RegExp(`id="${section}"`));
  }
  assert.match(auth, /STAFF_ALLOWED_TABS[^;]+TAB_GUIDE/);
  assert.match(modals, /TAB_GUIDE: \['Hướng dẫn sử dụng'/);
  assert.match(modals, /function openGuide\(sectionId\)/);
  assert.doesNotMatch(html.slice(0, guideTab), /MỐC TRỪ PHẠT KHI MUỘN|Cơ chế bảo vệ quỹ lương/);
});

test('organic Seller orders are read-only and order details stay compact', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const render = await readFile(new URL('../js/render.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../css/style.css', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /Thêm đơn ngoài live|mdAddShopOrder|addShopOrderCard/);
  assert.doesNotMatch(render, /openAddShopOrderModal|saveNewShopOrder/);
  assert.match(render, /class="order-detail"/);
  assert.match(render, /o\.sessionId\?'Đã khớp phiên LIVE':'Ngoài LIVE · 0% KPI'/);
  assert.doesNotMatch(render, /Phiên:.*Chưa gán/);
  assert.match(css, /\.order-detail-grid/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test('mobile login ships searchable metadata, readable text and an appropriately sized logo', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../css/style.css', import.meta.url), 'utf8');

  await access(new URL('../assets/brand/khangbaby-logo-384.webp', import.meta.url));
  assert.match(html, /<meta name="description" content="[^"]{40,}"/);
  assert.match(html, /<source srcset="\/assets\/brand\/khangbaby-logo-384\.webp" type="image\/webp"/);
  assert.match(css, /\.login-footnote \{[^}]*color: var\(--muted\)/);
});
