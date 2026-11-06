import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import test from 'node:test';

const source=await readFile(new URL('../js/storage-usage.js',import.meta.url),'utf8');
function context(fetch=async()=>({ok:false})){
  const nodes=new Map();
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:id==='stProvFilter'?'ALL':'',checked:false,disabled:false,insertBefore:()=>{},appendChild:()=>{}});
    return nodes.get(id);
  };
  const messages=[];
  const ctx=createContext({document:{getElementById:id=>node(id),querySelectorAll:()=>[],createElement:()=>({})},productionApiFetch:fetch,toast:message=>messages.push(message),isAdmin:()=>true,state:{storage:{}},ic:()=>'',esc:value=>String(value??''),hydrateIcons:()=>{},AbortSignal});
  runInContext(source,ctx);return {ctx,node,messages};
}
const management={policy:{retentionDays:90,threshold:85,autoFree:false},protectedDays:60,providers:[{id:'github',supported:true,cleanupMode:'automatic',items:[{id:'old-1',kind:'artifact',provider:'github',label:'Actual artifact',sizeBytes:1048576,date:'2026-06-01',eligible:true}]},{id:'firebase',supported:false,cleanupMode:'monitor_only',items:[]},{id:'cloudflare',supported:false,cleanupMode:'monitor_only',items:[]}],history:[]};

test('unmeasured storage stays unknown and measured zero remains zero',()=>{
  const {ctx}=context();
  assert.equal(ctx.storagePlatforms().some(provider=>provider.metrics.some(metric=>metric.used!==null)),false);
  runInContext(`storageUsageStatus={providers:[{id:'cloudflare',metrics:[{id:'kv',label:'KV',used:0,limit:1000000000}]}]}`,ctx);
  const metric=ctx.storagePlatforms().find(provider=>provider.id==='cloudflare').metrics[0];
  assert.equal(metric.used,0);
});

test('storage candidates and history come only from the server management snapshot',()=>{
  const {ctx,node}=context();
  runInContext(`storageUsageStatus={management:${JSON.stringify(management)}}`,ctx);
  ctx.renderStorageManagement();
  assert.match(node('stCleanupCandidates').innerHTML,/Actual artifact/);
  assert.doesNotMatch(node('stCleanupCandidates').innerHTML,/318|296|2,59/);
  assert.doesNotMatch(node('stHistory').innerHTML,/2026-10-24|R2: file Excel/);
  assert.doesNotMatch(node('stHistorySummary').textContent,/7[,.]89/);
  assert.equal(ctx.simulateStorageIncrease,undefined);
});

test('failed cleanup preserves server history and selection without announcing success',async()=>{
  const {ctx,node,messages}=context(async()=>({ok:false,status:503}));
  runInContext(`storageUsageStatus={management:${JSON.stringify(management)}};storageCleanupSelection.add('artifact:old-1')`,ctx);
  await ctx.cleanupStorageNow();
  assert.equal(runInContext('storageUsageStatus.management.history.length',ctx),0);
  assert.equal(runInContext("storageCleanupSelection.has('artifact:old-1')",ctx),true);
  assert.equal(messages.some(message=>message.includes('thành công')||message.includes('Đã giải phóng')),false);
  assert.match(runInContext('storageUsageError',ctx),/Chưa thể giải phóng/);
  assert.doesNotMatch(node('stHistory').innerHTML,/Actual artifact/);
});

test('successful cleanup uses returned byte count and history rather than estimates',async()=>{
  let requested;
  const history=[{id:'old-1',kind:'artifact',provider:'github',label:'Actual artifact',sizeBytes:32,at:'2026-11-06T00:00:00Z'}];
  const {ctx,messages}=context(async(url,options)=>{
    if(url==='/api/storage/cleanup'){requested=JSON.parse(options.body);return {ok:true,json:async()=>({deleted:1,freedBytes:32,history})};}
    return {ok:false};
  });
  runInContext(`storageUsageStatus={management:${JSON.stringify(management)}};storageCleanupSelection.add('artifact:old-1')`,ctx);
  await ctx.cleanupStorageNow();
  assert.deepEqual(requested.ids,['artifact:old-1']);
  assert.equal(runInContext('storageUsageStatus.management.history[0].sizeBytes',ctx),32);
  assert.equal(runInContext('storageCleanupSelection.size',ctx),0);
  assert.equal(messages.some(message=>message.includes('32 B')),true);
});
