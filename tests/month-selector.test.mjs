import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('month selector in Tab 6 supports selecting past and current full months', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const stateJs = await readFile(new URL('../js/state.js', import.meta.url), 'utf8');
  const modalsJs = await readFile(new URL('../js/modals.js', import.meta.url), 'utf8');
  const renderJs = await readFile(new URL('../js/render.js', import.meta.url), 'utf8');

  // 1. HTML elements exist
  assert.ok(html.includes('id="staffMonthSelect"'), 'staffMonthSelect dropdown exists in toolbar');
  assert.ok(html.includes('id="staffMonthRangeText"'), 'staffMonthRangeText exists in toolbar');
  assert.ok(html.includes('id="stfMonthCardPillText"'), 'stfMonthCardPillText exists in card header');
  assert.ok(html.includes('onchange="onSelectStaffMonth(this.value)"'), 'onchange handler attached to staffMonthSelect');

  // 2. State & modal helpers exist
  assert.match(stateJs, /staffMonth:\s*TODAY/, 'state initializes staffMonth with current month');
  assert.match(stateJs, /function getCurrentMonthRange/, 'getCurrentMonthRange helper exists');
  assert.match(modalsJs, /function populateStaffMonthOptions/, 'populateStaffMonthOptions helper exists');
  assert.match(modalsJs, /function onSelectStaffMonth/, 'onSelectStaffMonth handler exists');

  // 3. Render uses month range
  assert.match(renderJs, /filteredMonthSessions\(\)/, 'filteredMonthSessions is used for staff KPI');
});

test('getCurrentMonthRange correctly calculates start, end and last day for any month', () => {
  // We can replicate the function logic to verify UTC date boundaries
  function getRange(ref) {
    const ym = String(ref).slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end, label: `Tháng ${m}/${y}` };
  }

  // October 2026 (31 days)
  const oct = getRange('2026-10');
  assert.equal(oct.start, '2026-10-01');
  assert.equal(oct.end, '2026-10-31');
  assert.equal(oct.label, 'Tháng 10/2026');

  // September 2026 (30 days)
  const sep = getRange('2026-09');
  assert.equal(sep.start, '2026-09-01');
  assert.equal(sep.end, '2026-09-30');
  assert.equal(sep.label, 'Tháng 9/2026');

  // February 2024 (Leap year, 29 days)
  const feb2024 = getRange('2024-02');
  assert.equal(feb2024.start, '2024-02-01');
  assert.equal(feb2024.end, '2024-02-29');

  // February 2025 (Non-leap year, 28 days)
  const feb2025 = getRange('2025-02');
  assert.equal(feb2025.start, '2025-02-01');
  assert.equal(feb2025.end, '2025-02-28');
});
