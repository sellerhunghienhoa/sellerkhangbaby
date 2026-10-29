import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
