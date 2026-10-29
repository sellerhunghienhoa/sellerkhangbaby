import assert from 'node:assert/strict';
import test from 'node:test';
import {runApiDiagnostic} from '../src/worker.js';

test('trusted API diagnostics stay inactive unless the short-lived minute schedule is configured',async t=>{
  let requests=0;t.mock.method(globalThis,'fetch',async()=>{requests++;throw Error('Unexpected network call');});
  assert.equal(await runApiDiagnostic({cron:'* * * * *'},{}),false);
  assert.equal(await runApiDiagnostic({cron:'0 */6 * * *'},{API_DIAGNOSTIC_UNTIL:new Date(Date.now()+60000).toISOString()}),false);
  assert.equal(await runApiDiagnostic({cron:'* * * * *'},{API_DIAGNOSTIC_UNTIL:new Date(Date.now()-60000).toISOString()}),false);
  assert.equal(await runApiDiagnostic({cron:'* * * * *'},{API_DIAGNOSTIC_UNTIL:new Date(Date.now()+3600000).toISOString()}),false);
  assert.equal(requests,0);
});
test('active trusted diagnostic reports safe codes and never invents data when credentials are unavailable',async t=>{
  const lines=[];t.mock.method(console,'log',line=>lines.push(JSON.parse(line)));
  let writes=0;const env={API_DIAGNOSTIC_UNTIL:new Date(Date.now()+60000).toISOString(),TIKTOK_OAUTH_KV:{get:async()=>null,put:async()=>{writes++;}}};
  assert.equal(await runApiDiagnostic({cron:'* * * * *'},env),true);
  assert.equal(writes,0);assert.equal(lines.filter(line=>line.event==='tiktok_api_diagnostic').length,5);
  assert.ok(lines.every(line=>Object.keys(line).every(key=>['event','runId','operation','status','code'].includes(key))));
  assert.ok(lines.filter(line=>line.event==='tiktok_api_diagnostic').every(line=>line.status==='error'));
});
