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
  for (const section of ['guide-kpi', 'guide-live', 'guide-orders', 'guide-returns', 'guide-staff', 'guide-api']) {
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

test('TikTok return detail prioritizes money and hides long reference ids', async () => {
  const render = await readFile(new URL('../js/render.js', import.meta.url), 'utf8');
  const apiReturnStart = render.indexOf("if(r.provider==='TIKTOK_API')");
  const apiReturnEnd = render.indexOf("openModal('mdReturnDetail');return;", apiReturnStart);
  const detail = render.slice(apiReturnStart, apiReturnEnd);

  assert.ok(apiReturnStart > 0 && apiReturnEnd > apiReturnStart);
  assert.match(detail, /class="order-detail return-detail"/);
  assert.match(detail, /<summary>Mã tham chiếu<\/summary>/);
  assert.match(detail, /<summary>Cách đối soát<\/summary>/);
  assert.doesNotMatch(detail, /Phiên:\s*\$\{/);
});

test('mobile LIVE cards keep metrics visible and collapse assignment controls', async () => {
  const render = await readFile(new URL('../js/render.js', import.meta.url), 'utf8');
  const mobileStart = render.indexOf("document.getElementById('sesMobile').innerHTML");
  const mobileEnd = render.indexOf("document.getElementById('sesInfo')", mobileStart);
  const card = render.slice(mobileStart, mobileEnd);

  assert.ok(mobileStart > 0 && mobileEnd > mobileStart);
  assert.match(card, /session-card-head/);
  assert.match(card, /session-card-controls/);
  assert.match(card, />GMV KPI</);
  assert.doesNotMatch(card, /GMV tạm chốt|1 kênh · khớp giờ/);
});

test('overview distinguishes combined, Seller, Affiliate, pending and delivered GMV',async()=>{
  const render=await readFile(new URL('../js/render.js',import.meta.url),'utf8');
  const overview=render.slice(render.indexOf('function renderOverview()'),render.indexOf('// Goal Ring Widget'));
  for(const label of ['Tổng GMV (LIVE + Aff)','GMV LIVE Seller','GMV Affiliate riêng','GMV chưa chốt','GMV đã giao &amp; đối soát'])assert.ok(overview.includes(label),label);
  assert.match(overview,/Phiên đã kết thúc · khách đã nhận hàng/);
  assert.doesNotMatch(overview,/GMV LIVE tổng/);
});

test('overview weekly activity bars show daily GMV using live and affiliate data instead of zero pending kpiGmv', async () => {
  const render = await readFile(new URL('../js/render.js', import.meta.url), 'utf8');
  const barsSection = render.slice(render.indexOf('// Weekly Activity Bars (7 recent days in range)'), render.indexOf('// Premium List UI for Staff KPI Leaderboard'));
  assert.match(barsSection, /b\.grossLiveGmv/);
  assert.match(barsSection, /b\.affiliateGmv/);
  assert.doesNotMatch(barsSection, /b\.kpiGmv/);
});

test('storage restores the original management layout without demo cleanup controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html,/class="storage-management-grid"/);
  assert.match(html,/id="stCleanupCandidates"/);
  assert.match(html,/id="stRetRange"/);
  assert.match(html,/id="stThresholdRange"/);
  assert.match(html,/id="stAutoFree"/);
  assert.match(html,/id="stHistory"/);
  assert.doesNotMatch(html,/Mô phỏng tăng dữ liệu/);
  assert.doesNotMatch(html,/onclick="freeSelected\(/);
});

test('mobile login ships searchable metadata, readable text and an appropriately sized logo', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../css/style.css', import.meta.url), 'utf8');

  await access(new URL('../assets/brand/khangbaby-logo-384.webp', import.meta.url));
  assert.match(html, /<meta name="description" content="[^"]{40,}"/);
  assert.match(html, /<source srcset="\/assets\/brand\/khangbaby-logo-384\.webp" type="image\/webp"/);
  assert.match(css, /\.login-footnote \{[^}]*color: var\(--muted\)/);
});

test('discipline score page is removed from navigation, guides and exports', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const auth = await readFile(new URL('../js/auth.js', import.meta.url), 'utf8');
  const modals = await readFile(new URL('../js/modals.js', import.meta.url), 'utf8');
  const render = await readFile(new URL('../js/render.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const state = await readFile(new URL('../js/state.js', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /TAB_DISCIPLINE|Muộn giờ &amp; Điểm 200đ|Bảng kỷ luật|bảng kỷ luật|mdStaffDiscipline|guide-attendance/);
  assert.doesNotMatch(auth, /TAB_DISCIPLINE/);
  assert.doesNotMatch(modals, /TAB_DISCIPLINE|trừ điểm kỷ luật/);
  assert.doesNotMatch(render, /200đ|Điểm xếp hạng|exportSelectedStaffDiscipline|Phạt trễ live|computeStaffDiscipline|renderDisciplineTab/);
  assert.doesNotMatch(app, /checkMonthlyDisciplineCycle/);
  assert.doesNotMatch(state, /renderDisciplineTab/);
});


test('Shop orders, order reconciliation, and API header expose quick 2-day sync and live order status', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const render = await readFile(new URL('../js/render.js', import.meta.url), 'utf8');
  const shopTab = html.indexOf('id="TAB_SHOP_ORDERS"');
  const ordersTab = html.indexOf('id="TAB_ORDERS"');
  const returnsTab = html.indexOf('id="TAB_RETURNS_15D"');
  const apiTab = html.indexOf('id="TAB_TIKTOK_API"');
  const storageTab = html.indexOf('id="TAB_STORAGE"');

  const shopSection = html.slice(shopTab, ordersTab);
  const ordersSection = html.slice(ordersTab, returnsTab);
  const apiSection = html.slice(apiTab, storageTab);

  assert.match(shopSection, /data-order-sync-status/);
  assert.match(shopSection, /data-quick-order-sync/);
  assert.match(ordersSection, /data-order-sync-status/);
  assert.match(ordersSection, /data-quick-order-sync/);
  assert.match(apiSection, /class="api-header-actions"[\s\S]*?data-quick-order-sync/);
  assert.equal((apiSection.match(/data-order-sync-status/g) || []).length, 1);
  assert.match(render, /orderEmptyStateText\(/);
});
