import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import test from 'node:test';
import {webcrypto} from 'node:crypto';

const source=await readFile(new URL('../js/firebase.js',import.meta.url),'utf8');
function setup(){
  const documents=new Map([['production/dashboard',{sessions:[{id:'live',pendingRecGmv:100}]}]]);
  const calls={batches:[],transactions:[],failBatch:0,commits:0,changeSession:false,reorderSession:false,lostAck:false};
  const copy=value=>structuredClone(value);
  const getDoc=async ref=>({exists:()=>documents.has(ref),data:()=>copy(documents.get(ref))});
  const fb={db:{},doc:(db,...path)=>path.join('/'),getDoc,
    writeBatch:()=>{const writes=[];return {set:(ref,data)=>writes.push(['set',ref,copy(data)]),delete:ref=>writes.push(['delete',ref]),commit:async()=>{
      calls.commits++;calls.batches.push(writes.length);
      if(calls.commits===calls.failBatch)throw Error('SAVE_FAILED');
      for(const [kind,ref,data] of writes)if(kind==='set')documents.set(ref,data);else documents.delete(ref);
      if(calls.changeSession)documents.get('production/dashboard').sessions[0].pendingRecGmv=99;
    }};},
    runTransaction:async(db,fn)=>{
      const writes=[];let writing=false;
      const result=await fn({get:async ref=>{assert.equal(writing,false,'transaction read after write');if(calls.reorderSession&&ref==='production/dashboard'){const data=copy(documents.get(ref)),session=data.sessions[0];data.sessions[0]={pendingRecGmv:session.pendingRecGmv,id:session.id};return {exists:()=>true,data:()=>data};}return getDoc(ref);},set:(ref,data)=>{writing=true;writes.push([ref,copy(data)]);},update:(ref,data)=>{writing=true;writes.push([ref,{...documents.get(ref),...copy(data)}]);}});
      calls.transactions.push(writes.length);for(const [ref,data] of writes)documents.set(ref,data);if(calls.lostAck)throw Error('ACK_LOST');return result;
    }};
  const ctx=createContext({TextEncoder,crypto:webcrypto,console:{warn:()=>{}},state:{},setTimeout,clearTimeout,
    sellerRangeDates:()=>['2026-10-28'],prepareSellerSnapshot:(sessions,orders,returns)=>({sessions:copy(sessions),orders,returns})});
  runInContext(source,ctx);
  ctx.getProductionFirebaseContext=async()=>fb;ctx.isProductionAdmin=()=>true;
  runInContext('productionBackendReady=true;',ctx);
  const data=(count=2300,syncedAt='first')=>({from:'2026-10-28',to:'2026-10-28',orders:Array.from({length:count},(_,i)=>({orderId:String(i),date:'2026-10-28'})),returns:[],syncedAt});
  return {ctx,documents,calls,data};
}
test('large Seller imports stage bounded batches and publish only manifests with dashboard',async()=>{
  const app=setup();await app.ctx.saveProductionSellerSnapshot(app.data());
  assert.deepEqual(app.calls.batches,[10,10,3]);assert.deepEqual(app.calls.transactions,[3]);
  const index=app.documents.get('production/sellerOrderDays/days/2026-10-28');assert.equal(index.chunks.length,23);
  assert.equal(index.previousChunks.length,0);assert.equal(app.documents.get('production/dashboard').lastOrderSync,'first');
  assert.equal(app.documents.get('production/staffDashboard').lastOrderSync,'first');
  assert.ok(index.chunks.every(id=>app.documents.get('production/sellerOrderSnapshots/chunks/'+id).owner==='seller-order-sync'));
});
test('staging failure leaves published data intact and cleans only unreferenced owned chunks',async()=>{
  const app=setup();await app.ctx.saveProductionSellerSnapshot(app.data(100,'first'));
  const original=copyDocuments(app.documents);app.calls.failBatch=app.calls.commits+2;
  await assert.rejects(()=>app.ctx.saveProductionSellerSnapshot(app.data(2300,'failed')),/SAVE_FAILED/);
  assert.deepEqual(copyDocuments(app.documents),original);
});
test('session changes while staging abort publication and preserve newer manual decisions',async()=>{
  const app=setup();app.calls.changeSession=true;
  await assert.rejects(()=>app.ctx.saveProductionSellerSnapshot(app.data()),/TIKTOK_ORDERS_STATE_CHANGED/);
  assert.equal(app.documents.get('production/dashboard').sessions[0].pendingRecGmv,99);
  assert.equal(app.documents.has('production/sellerOrderDays/days/2026-10-28'),false);
  assert.equal(app.documents.size,1);
});
test('Firestore field order changes do not falsely abort an unchanged snapshot',async()=>{
  const app=setup();app.calls.reorderSession=true;
  await app.ctx.saveProductionSellerSnapshot(app.data(100,'ordered'));
  assert.equal(app.documents.get('production/dashboard').lastOrderSync,'ordered');
});
test('repeated sync keeps current and preceding generation and cleans only the older generation',async()=>{
  const app=setup();await app.ctx.saveProductionSellerSnapshot(app.data(100,'first'));
  const first=app.documents.get('production/sellerOrderDays/days/2026-10-28').chunks[0];
  await app.ctx.saveProductionSellerSnapshot(app.data(100,'second'));
  assert.ok(app.documents.has('production/sellerOrderSnapshots/chunks/'+first));
  await app.ctx.saveProductionSellerSnapshot(app.data(100,'third'));
  const index=app.documents.get('production/sellerOrderDays/days/2026-10-28');
  assert.equal(index.chunks.length,1);assert.equal(index.previousChunks.length,1);
  assert.equal(app.documents.has('production/sellerOrderSnapshots/chunks/'+first),false);
  assert.equal(app.documents.size,5);
});
test('a lost publication acknowledgement never deletes a published chunk',async()=>{
  const app=setup();app.calls.lostAck=true;
  await assert.rejects(()=>app.ctx.saveProductionSellerSnapshot(app.data(100,'published')),/ACK_LOST/);
  const index=app.documents.get('production/sellerOrderDays/days/2026-10-28');
  assert.equal(index.chunks.length,1);assert.ok(app.documents.has('production/sellerOrderSnapshots/chunks/'+index.chunks[0]));
  assert.equal(app.documents.get('production/dashboard').lastOrderSync,'published');
});
function copyDocuments(documents){return [...documents].map(([key,value])=>[key,structuredClone(value)]).sort(([a],[b])=>a.localeCompare(b));}
