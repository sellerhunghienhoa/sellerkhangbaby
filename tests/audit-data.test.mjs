import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import test from 'node:test';

const stateSource=await readFile(new URL('../js/state.js',import.meta.url),'utf8');
const liveSource=await readFile(new URL('../js/live-sync.js',import.meta.url),'utf8');
const affiliateSource=await readFile(new URL('../js/affiliate-sync.js',import.meta.url),'utf8');
const orderSource=await readFile(new URL('../js/order-sync.js',import.meta.url),'utf8');

test('standalone manual Operator receives only Operator commission before and after reconciliation',()=>{
  const ctx=createContext({TODAY:'2026-11-06',HOST_RATE:0.3,OP_RATE:0.1,vnd:String,round100k:value=>value,diffDays:()=>0});
  runInContext(stateSource,ctx);
  const session={isManualKpi:true,manualKpiType:'CAMPAIGN',date:'2026-11-06',slot:'10:00 - 11:00',grossLiveGmv:1000000,affiliateGmv:0,pendingRecGmv:0,cancelReturnGmv:0,manualStaff:[{userId:'operator',role:'OPERATOR',personalGmv:1000000,bonus:1000,status:'APPROVED'}]};
  const staff=ctx.getEffectiveManualStaff(session)[0];
  assert.equal(staff.effectiveHostBonus,0);
  assert.equal(staff.effectiveOpBonus,1000);
  assert.equal(ctx.getStaffManualContribution(session,'operator').bonus,1000);
  session.cancelReturnGmv=500000;
  const reconciled=ctx.getEffectiveManualStaff(session)[0];
  assert.equal(reconciled.effectiveHostBonus,0);
  assert.equal(reconciled.effectiveOpBonus,500);
  assert.equal(ctx.getStaffManualContribution(session,'operator').bonus,500);
  Object.assign(session.manualStaff[0],{personalGmv:500000,baseShiftGmv:1000000,bonus:500});
  assert.equal(ctx.getEffectiveManualStaff(session)[0].effectiveHostBonus,0);
  assert.equal(ctx.getStaffManualContribution(session,'operator').bonus,500);
});

test('failed LIVE sync cannot report full success or advance daily sync watermark',async()=>{
  const messages=[];
  let calls=0;
  const ctx=createContext({isAdmin:()=>true,orderSyncInProgress:false,affiliateSyncInProgress:false,
    document:{querySelectorAll:()=>[],getElementById:()=>({textContent:''}),addEventListener:()=>{}},
    state:{sessions:[],affiliateDaily:[],automation:{}},
    addDays:(date,days)=>new Date(Date.parse(date)+days*86400000).toISOString().slice(0,10),
    productionApiFetch:async()=>{calls++;throw Error('TIKTOK_LIVE_NETWORK_ERROR');},
    syncTikTokOrders:async()=>true,syncTikTokAffiliateOrders:async()=>true,
    renderAll:()=>{},renderAffiliateSyncStatus:()=>{},toast:message=>messages.push(message),saveState:()=>{throw Error('Must not mark failed pipeline as completed');}
  });
  runInContext(liveSource,ctx);
  assert.equal(await ctx.syncTikTokLiveSessions(),false);
  assert.equal(calls,1);
  assert.equal(ctx.state.automation.lastDailySyncAt,undefined);
  assert.equal(messages.some(message=>message==='Đồng bộ LIVE, đơn hàng và GMV Affiliate đã hoàn tất.'),false);
});

test('empty Affiliate responses finish with channel results instead of leaving the loading message',async()=>{
  const ctx=createContext({isAdmin:()=>true,liveSyncInProgress:false,orderSyncInProgress:false,renderAll:()=>{}});
  runInContext(affiliateSource,ctx);
  ctx.collectAffiliateDays=async()=>({rowCount:0,eligibleRowCount:0});
  ctx.renderAffiliateSyncStatus=()=>{};
  assert.equal(await ctx.syncTikTokAffiliateOrders('2026-11-06','2026-11-06'),true);
  const message=runInContext('affiliateSyncMessage',ctx);
  assert.match(message,/shopkhangbaby: 0 SKU/);
  assert.match(message,/mekhangsua: 0 SKU/);
  assert.doesNotMatch(message,/Đang lấy/);
});

test('a delayed order snapshot fallback cannot overwrite a newer completed range load',async()=>{
  const date='2026-11-06';
  let releaseFallback,notifyStarted,published=false;
  const started=new Promise(resolve=>{notifyStarted=resolve;});
  const pending=new Promise(resolve=>{releaseFallback=resolve;});
  const fresh={provider:'TIKTOK_API',orderId:'fresh',date,time:'10:00',attribution:'NON_LIVE',status:'SHIPPING',amount:100,refund:0};
  const ctx=createContext({state:{from:date,to:date,sessions:[],orders:[],shopOrders:[],returns15d:[]},isProductionAdmin:()=>true,
    getProductionFirebaseContext:async()=>({db:{},doc:(_db,...path)=>path.join('/'),getDoc:async ref=>ref.includes('/chunks/')?{exists:()=>true,data:()=>({syncedAt:'now',orders:[fresh],returns:[]})}:{exists:()=>published,data:()=>({syncedAt:'now',chunks:['new']})}}),
    productionApiFetch:async()=>{notifyStarted();return pending;}
  });
  runInContext(orderSource,ctx);ctx.renderOrderSyncStatus=()=>{};
  const stale=ctx.loadSellerOrderRange(date,date);
  await started;published=true;
  await ctx.loadSellerOrderRange(date,date);
  assert.equal(ctx.state.orders[0].orderId,'fresh');
  releaseFallback({ok:true,json:async()=>({orders:[]})});
  await stale;
  assert.equal(ctx.state.orders.length,1);
  assert.equal(ctx.state.orders[0].orderId,'fresh');
});

test('signing out while order fallback is pending cannot repopulate the cleared view',async()=>{
  const date='2026-11-06';
  let releaseFallback,notifyStarted,admin=true;
  const started=new Promise(resolve=>{notifyStarted=resolve;});
  const pending=new Promise(resolve=>{releaseFallback=resolve;});
  const ctx=createContext({state:{from:date,to:date,sessions:[],orders:[],shopOrders:[],returns15d:[]},isProductionAdmin:()=>admin,
    getProductionFirebaseContext:async()=>({db:{},doc:()=>'',getDoc:async()=>({exists:()=>false})}),
    productionApiFetch:async()=>{notifyStarted();return pending;}
  });
  runInContext(orderSource,ctx);ctx.renderOrderSyncStatus=()=>{};
  const stale=ctx.loadSellerOrderRange(date,date);
  await started;admin=false;
  releaseFallback({ok:true,json:async()=>({orders:[{provider:'TIKTOK_API',orderId:'private-old',date,time:'10:00',status:'SHIPPING',attribution:'NON_LIVE',amount:100,refund:0}]})});
  await stale;
  assert.equal(ctx.state.orders.length,0);
  assert.equal(ctx.state.shopOrders.length,0);
});
