import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import test from 'node:test';

const source=await readFile(new URL('../js/state.js',import.meta.url),'utf8');
function context(){
  const ctx=createContext({TODAY:'2026-10-30',HOST_RATE:0.3,OP_RATE:0.1,vnd:String,addDays:value=>value,diffDays:()=>0,round100k:value=>value});
  runInContext(source,ctx);return ctx;
}

test('KPI GMV stays zero until the LIVE has ended and Seller orders are verified',()=>{
  const ctx=context();
  const session={id:'live',date:'2026-10-30',slot:'10:00 - Đang LIVE',endedAt:'',grossLiveGmv:100000,affiliateGmv:50000,pendingRecGmv:0,cancelReturnGmv:0,orderSync:{verified:true},hostId:'host',operatorId:'op',shifts:[]};
  runInContext(`state.sessions=[${JSON.stringify(session)}]`,ctx);
  assert.equal(ctx.computeAll()[0].kpiGmv,0);
  assert.equal(ctx.isSessionReconciled(ctx.computeAll()[0]),false);
  runInContext("state.sessions[0].endedAt='2026-10-30T05:00:00.000Z'",ctx);
  assert.equal(ctx.computeAll()[0].kpiGmv,150000);
  assert.equal(ctx.isSessionReconciled(ctx.computeAll()[0]),true);
});

test('an ended LIVE still waits until every order has been received',()=>{
  const ctx=context();
  const session={id:'live',date:'2026-10-30',slot:'10:00 - 12:00',endedAt:'2026-10-30T05:00:00.000Z',grossLiveGmv:100000,affiliateGmv:50000,pendingRecGmv:25000,cancelReturnGmv:0,orderSync:{verified:true},shifts:[]};
  runInContext(`state.sessions=[${JSON.stringify(session)}]`,ctx);
  assert.equal(ctx.computeAll()[0].kpiGmv,0);
  assert.equal(ctx.isSessionReconciled(ctx.computeAll()[0]),false);
  runInContext('state.sessions[0].pendingRecGmv=0',ctx);
  assert.equal(ctx.computeAll()[0].kpiGmv,150000);
});
