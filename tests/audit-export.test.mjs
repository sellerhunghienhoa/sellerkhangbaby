import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

const render = await readFile(new URL('../js/render.js', import.meta.url), 'utf8');
const utils = await readFile(new URL('../js/utils.js', import.meta.url), 'utf8');
const escape = utils.match(/function esc\(s\) \{[^\n]+\}/)[0];

test('export selector and payslip preview treat Google profile names and ids as text', () => {
  const user = { id: 'host" autofocus onfocus="evil', name: '</option><img src=x onerror=evil>', status: 'APPROVED', role: 'HOST' };
  const select = { value: user.id, style: {} }, preview = {};
  const context = createContext({
    state: { users: [user] }, isAdmin: () => true, me: () => user,
    document: { getElementById: id => id === 'expStaffSelect' ? select : preview },
    filteredSessions: () => [], computeStaffCampMega: () => ({ totalAllowance: 0, campDays: 0, megaDays: 0 }),
    ic: () => '', vnd: String, hydrateIcons() {}
  });
  runInContext(escape + '\n' + render.slice(render.indexOf('function populateExportStaffSelect()'), render.indexOf('function exportSelectedStaffKpi()')), context);
  context.populateExportStaffSelect();
  context.renderExportStaffPreview();
  assert.ok(select.innerHTML.includes('&quot;'), 'id must stay inside its option value');
  assert.ok(select.innerHTML.includes('&lt;/option&gt;&lt;img'), 'name must remain literal text');
  assert.ok(preview.innerHTML.includes('&lt;/option&gt;&lt;img'), 'preview must preserve the literal profile name');
  assert.doesNotMatch(select.innerHTML + preview.innerHTML, /<img\b|value="host"/);
});

test('JSON export retains the loaded Affiliate, orders, returns and settings and declares its limited scope', async () => {
  const state = {
    from: '2026-11-01', to: '2026-11-06', sessions: [{ id: 'live' }], manualKpis: [], users: [],
    orders: [{ orderId: 'live-order' }], shopOrders: [{ orderId: 'organic-order' }], returns15d: [{ returnId: 'return' }],
    affiliateDaily: [{ date: '2026-11-06', gmv: 100000 }], storage: { retentionDays: 90 }, automation: { dailySyncEnabled: true }
  };
  let blob, filename, message;
  const link = { click() { filename = this.download; } };
  const context = createContext({
    state, isAdmin: () => true, Date, Blob, JSON,
    document: { createElement: () => link },
    URL: { createObjectURL: value => { blob = value; return 'blob:test'; }, revokeObjectURL() {} },
    toast: text => { message = text; }
  });
  runInContext(render.slice(render.indexOf('function exportFullSystemBackup()'), render.indexOf('window.filterAndOpenSession')), context);
  context.exportFullSystemBackup();
  const saved = JSON.parse(await blob.text());
  for (const key of ['orders', 'shopOrders', 'returns15d', 'affiliateDaily', 'storage', 'automation']) assert.deepEqual(saved[key], state[key], key);
  assert.equal(saved.scope, 'loaded-state');
  assert.equal(saved.complete, false);
  assert.match(filename, /Loaded/);
  assert.match(message, /đã tải/);
});
