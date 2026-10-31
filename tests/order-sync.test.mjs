import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createContext,runInContext} from 'node:vm';
import test from 'node:test';
import worker,{encryptTokenRecord,normalizeSellerOrder,normalizeSellerReturn,signTikTokRequest} from '../src/worker.js';

const date='2026-10-28';
const timestamp=Math.floor(Date.parse(date+'T10:00:00+07:00')/1000);
const raw={id:'777',status:'DELIVERED',create_time:timestamp,update_time:timestamp,delivery_time:timestamp,payment:{currency:'VND',sub_total:'100000',total_amount:'115000'},line_items:[{id:'11',room_id:'123',product_name:'Sữa <b>tươi</b>',seller_sku:'<script>bad</script>'}],recipient_address:{name:'private buyer'}};
const ret={order_id:'777',return_id:'888',create_time:timestamp+86400,return_status:'RETURN_OR_REFUND_REQUEST_COMPLETE',refund_amount:{currency:'VND',refund_subtotal:'50000',refund_total:'65000'},return_line_items:[]};
const source=await readFile(new URL('../js/order-sync.js',import.meta.url),'utf8');
const context=()=>{const ctx=createContext({HOST_RATE:0.3,OP_RATE:0.1});runInContext(source,ctx);return ctx;};

test('Seller orders use exact IDs, product subtotal, actual delivery time and all-market room attribution',()=>{
  const order=normalizeSellerOrder(raw,'99');assert.equal(order.amount,100000);assert.equal(order.paidTotal,115000);assert.equal(order.attribution,'LIVE');assert.equal(order.date,date);assert.equal(order.time,'10:00');assert.equal(JSON.stringify(order).includes('private buyer'),false);
  assert.equal(normalizeSellerOrder({...raw,line_items:[{id:'11',room_id:''}]},'99').attribution,'NON_LIVE');
  assert.equal(normalizeSellerOrder({...raw,line_items:[{id:'11'}]},'99').attribution,'NON_LIVE');
  assert.equal(normalizeSellerOrder({...raw,create_time:1792594800,line_items:[{id:'11'}]},'99').attribution,'NON_LIVE');
  assert.equal(normalizeSellerOrder({...raw,line_items:[{id:'11',room_id:'123'},{id:'12',room_id:''}]},'99').attribution,'MIXED');
  assert.throws(()=>normalizeSellerOrder({...raw,line_items:[{id:'11',room_id:123}]},'99'),/RESPONSE_INVALID/);
  assert.throws(()=>normalizeSellerOrder({...raw,id:777},'99'),/RESPONSE_INVALID/);
  assert.throws(()=>normalizeSellerOrder({...raw,payment:{...raw.payment,currency:'USD'}},'99'),/CURRENCY_UNSUPPORTED/);
});
test('Returns distinguish proposed from completed money and do not invent delivery or liability',()=>{
  const parent=normalizeSellerOrder(raw,'99');const done=normalizeSellerReturn(ret,'99',parent);assert.equal(done.returnAmount,50000);assert.equal(done.daysFromDelivery,1);assert.equal(done.within15Days,true);assert.equal(done.liability,'Chưa xác định');
  const pending=normalizeSellerReturn({...ret,return_status:'RETURN_OR_REFUND_REQUEST_SUCCESS'},'99',parent);assert.equal(pending.returnAmount,0);assert.equal(pending.requestedAmount,50000);assert.equal(pending.refundConfirmed,false);
  const pendingUnknown=normalizeSellerReturn({...ret,return_status:'RETURN_OR_REFUND_REQUEST_PENDING',refund_amount:undefined},'99',parent);assert.equal(pendingUnknown.requestedAmount,null);assert.equal(pendingUnknown.requestedAmountKnown,false);assert.equal(pendingUnknown.returnAmount,0);assert.equal(pendingUnknown.refundConfirmed,false);
  assert.throws(()=>normalizeSellerReturn({...ret,refund_amount:undefined},'99',parent),/RESPONSE_INVALID/);
  const unknown=normalizeSellerReturn(ret,'99',{...parent,deliveredAt:''});assert.equal(unknown.daysFromDelivery,null);assert.equal(unknown.within15Days,false);
  assert.equal(normalizeSellerReturn({...ret,create_time:timestamp-1},'99',parent).within15Days,false);
});
test('Only an exact shop and LIVE ID match links orders; incomplete refund windows preserve session KPI',()=>{
  const ctx=context();const session={id:'live',tiktokLiveId:'123',tiktokShopId:'99',date,hostId:'host',operatorId:'op',grossLiveGmv:100000,pendingRecGmv:100000,cancelReturnGmv:0};
  const order=normalizeSellerOrder(raw,'99');const returned=normalizeSellerReturn(ret,'99',order);
  const result=ctx.prepareSellerSnapshot([session],[order],[returned],date,'2026-10-29','now');
  assert.equal(result.orders[0].sessionId,'live');assert.equal(result.orders[0].refund,50000);assert.equal(result.returns[0].parentOrder,undefined);assert.equal(result.sessions[0].pendingRecGmv,100000);assert.equal(result.sessions[0].orderSync.verified,false);assert.equal(result.returns[0].reflectedInSession,false);
  const wrong=ctx.prepareSellerSnapshot([{...session,tiktokShopId:'98'}],[order],[],date,date,'now');assert.equal(wrong.orders[0].sessionId,'');
  const duplicate=ctx.prepareSellerSnapshot([session,{...session,id:'duplicate'}],[order],[],date,date,'now');assert.equal(duplicate.orders[0].sessionId,'');
  const repeated=ctx.prepareSellerSnapshot(result.sessions,[order],[returned],date,'2026-10-29','now');assert.equal(repeated.orders[0].refund,50000);
});

test('a newer TikTok session GMV invalidates a stale verified order total',()=>{
  const ctx=context();
  const session={id:'live',tiktokLiveId:'123',tiktokShopId:'99',date,grossLiveGmv:100000,tiktokReportedGmv:200000,pendingRecGmv:0,cancelReturnGmv:0,orderReconciliationManaged:true,affiliateGmv:0};
  const order=normalizeSellerOrder(raw,'99');
  const result=ctx.prepareSellerSnapshot([session],[order],[],date,date,'now');
  assert.equal(result.sessions[0].orderSync.verified,false);
  assert.equal(result.sessions[0].grossLiveGmv,200000);
  assert.equal(result.sessions[0].pendingRecGmv,200000);
  assert.equal(result.sessions[0].cancelReturnGmv,0);
  assert.equal(result.sessions[0].orderReconciliationManaged,false);
});
test('Day views replace API rows without removing manual orders and include orders without a LIVE session ID',()=>{
  const ctx=context();runInContext("var state={orders:[{orderId:'manual'}],shopOrders:[],returns15d:[]};",ctx);
  const orders=[normalizeSellerOrder(raw,'99'),normalizeSellerOrder({...raw,id:'778',line_items:[{id:'12',room_id:''}]},'99'),normalizeSellerOrder({...raw,id:'779',line_items:[{id:'13'}]},'99')];
  ctx.applySellerOrderView(orders,[]);ctx.applySellerOrderView(orders,[]);
  assert.equal(runInContext('state.orders.length',ctx),4);assert.equal(runInContext('state.shopOrders.length',ctx),2);
  ctx.applySellerOrderView([],[]);assert.equal(runInContext('state.orders[0].orderId',ctx),'manual');
});
test('External KOC live orders with non-matching live room IDs are attributed to AFFILIATE_KOC with 0% KPI without creating phantom sessions',()=>{
  const ctx=context();runInContext("var state={orders:[],shopOrders:[],returns15d:[]};",ctx);
  const internalSession={id:'live_internal',tiktokLiveId:'123',tiktokShopId:'99',date,hostId:'hienhoa',grossLiveGmv:100000,pendingRecGmv:100000,cancelReturnGmv:0};
  const kocOrder=normalizeSellerOrder({...raw,id:'9001',line_items:[{id:'91',room_id:'888888'}]},'99');
  const internalOrder=normalizeSellerOrder({...raw,id:'9002',line_items:[{id:'92',room_id:'123'}]},'99');
  const kocReturn=normalizeSellerReturn({...ret,order_id:'9001',return_id:'999888'},'99',kocOrder);

  const snapshot=ctx.prepareSellerSnapshot([internalSession],[kocOrder,internalOrder],[kocReturn],date,date,'now');
  assert.equal(snapshot.sessions.length,1);
  assert.equal(snapshot.sessions[0].id,'live_internal');

  const linkedInternal=snapshot.orders.find(o=>o.orderId==='9002');
  assert.equal(linkedInternal.sessionId,'live_internal');
  assert.equal(linkedInternal.source,'LIVE');
  assert.equal(linkedInternal.kpiRule,'Khớp LIVE ID từ API');

  const linkedKoc=snapshot.orders.find(o=>o.orderId==='9001');
  assert.equal(linkedKoc.sessionId,'');
  assert.equal(linkedKoc.source,'AFFILIATE_KOC');
  assert.equal(linkedKoc.kpiRule,'KOC ngoài Live · 0% KPI');

  assert.equal(snapshot.returns[0].hostCommReduction,0);
  assert.equal(snapshot.returns[0].opCommReduction,0);
  assert.equal(snapshot.returns[0].reflectedInSession,false);

  ctx.applySellerOrderView(snapshot.orders,snapshot.returns);
  assert.equal(runInContext('state.orders.length',ctx),2);
  assert.equal(runInContext('state.shopOrders.length',ctx),1);
  assert.equal(runInContext('state.shopOrders[0].orderId',ctx),'9001');
  assert.equal(runInContext('state.shopOrders[0].source',ctx),'AFFILIATE_KOC');
  assert.equal(runInContext('state.shopOrders[0].kpiRule',ctx),'KOC ngoài Live · 0% KPI');
});
test('A complete refund ledger reconciles exact totals once and preserves manual or mismatched sessions',()=>{
  const ctx=context();const session={id:'live',tiktokLiveId:'123',tiktokShopId:'99',date,endedAt:'2026-10-28T04:00:00.000Z',hostId:'host',operatorId:'op',grossLiveGmv:100000,tiktokReportedGmv:100000,pendingRecGmv:100000,cancelReturnGmv:0};
  const order={...normalizeSellerOrder(raw,'99'),refundsComplete:true,refund:50000};const returned=normalizeSellerReturn(ret,'99',order);
  const result=ctx.prepareSellerSnapshot([session],[order],[returned],date,'2026-10-29','now');assert.equal(result.sessions[0].pendingRecGmv,0);assert.equal(result.sessions[0].cancelReturnGmv,50000);assert.equal(result.sessions[0].orderSync.verified,true);assert.equal(result.returns[0].reflectedInSession,true);
  const repeat=ctx.prepareSellerSnapshot(result.sessions,[order],[returned],date,'2026-10-29','later');assert.equal(repeat.sessions[0].cancelReturnGmv,50000);
  const manual=ctx.prepareSellerSnapshot([{...session,isManualKpi:true}],[order],[],date,date,'now');assert.equal(manual.sessions[0].pendingRecGmv,100000);
  const mismatch=ctx.prepareSellerSnapshot([{...session,tiktokReportedGmv:200000}],[order],[],date,date,'now');assert.equal(mismatch.sessions[0].pendingRecGmv,100000);
  const outside=ctx.prepareSellerSnapshot([session],[{...order,refund:0}],[],date,date,'now');assert.equal(outside.sessions[0].cancelReturnGmv,0);assert.equal(outside.sessions[0].orderSync.verified,true);
});
test('an active LIVE cannot close reconciliation even when every current order is delivered',()=>{
  const ctx=context();
  const active={id:'live',tiktokLiveId:'123',tiktokShopId:'99',date,endedAt:'',grossLiveGmv:100000,tiktokReportedGmv:100000,pendingRecGmv:100000,cancelReturnGmv:0,affiliateGmv:0};
  const order={...normalizeSellerOrder(raw,'99'),refundsComplete:true,refund:0};
  const result=ctx.prepareSellerSnapshot([active],[order],[],date,date,'now');
  assert.equal(result.sessions[0].pendingRecGmv,100000);
  assert.equal(result.sessions[0].orderSync.verified,false);
  assert.equal(result.sessions[0].orderReconciliationManaged,undefined);
});
test('partial date-range order sync skips overnight sessions whose end date exceeds the synced window',()=>{
  const ctx=context();
  const overnight={id:'live',tiktokLiveId:'123',tiktokShopId:'99',date:'2026-10-28',endedAt:'2026-10-28T17:30:00.000Z',grossLiveGmv:100000,tiktokReportedGmv:100000,pendingRecGmv:100000,cancelReturnGmv:0,affiliateGmv:0};
  const order={...normalizeSellerOrder(raw,'99'),refundsComplete:true,refund:0};
  const partial=ctx.prepareSellerSnapshot([overnight],[order],[],'2026-10-28','2026-10-28','now');
  assert.equal(partial.orders[0].sessionId,'live');
  assert.equal(partial.sessions[0].orderSync,undefined);
  assert.equal(partial.sessions[0].pendingRecGmv,100000);
  const full=ctx.prepareSellerSnapshot([overnight],[order],[],'2026-10-28','2026-10-29','now');
  assert.equal(full.sessions[0].orderSync.verified,true);
  assert.equal(full.sessions[0].pendingRecGmv,0);
});
test('quick recent Seller order sync targets yesterday through today in Vietnam time and explains ADMIN_REQUIRED',async()=>{
  const syncedRanges=[];
  const addDays=(iso,days)=>new Date(Date.parse(`${iso}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
  const now=Date.parse('2026-10-30T08:00:00.000Z');
  function FakeDate(...args){return args.length?new Date(...args):new Date(now);}
  FakeDate.now=()=>now;FakeDate.parse=Date.parse;FakeDate.UTC=Date.UTC;FakeDate.prototype=Date.prototype;
  let failAdmin=false;
  const ctx=createContext({
    HOST_RATE:0.3,OP_RATE:0.1,Intl,Date:FakeDate,AbortSignal,addDays,
    state:{from:'2026-10-01',to:'2026-10-30',orders:[],shopOrders:[],returns15d:[],lastOrderSync:''},
    liveSyncInProgress:false,affiliateSyncInProgress:false,
    document:{querySelectorAll:()=>[]},
    isAdmin:()=>true,renderAll:()=>{},toast:()=>{},
    saveProductionSellerSnapshot:async data=>{syncedRanges.push({from:data.from,to:data.to});},
    productionApiFetch:async(url,{body})=>{
      if(failAdmin)throw new Error('ADMIN_REQUIRED');
      const req=JSON.parse(body);
      return {from:req.from,to:req.to,stage:req.stage,shopId:'99',syncedAt:'2026-10-30T08:00:05Z',orders:[],returns:[],ledger:[],nextCursor:null,complete:true,totalCount:0};
    },
    parseTikTokApiResponse:async v=>v
  });
  runInContext(source,ctx);
  ctx.loadSellerOrderRange=async()=>true;
  assert.equal(await ctx.syncRecentTikTokOrders(),true);
  assert.deepEqual(syncedRanges,[{from:'2026-10-29',to:'2026-10-30'}]);
  failAdmin=true;
  assert.equal(await ctx.syncRecentTikTokOrders(),false);
  assert.match(runInContext('orderSyncMessage',ctx),/sellerhunghienhoa@gmail\.com/);
});
test('collectSellerSnapshot caps syncedAt at the query cutoff and loadSellerOrderRange follows mid-flight date changes',async()=>{
  const startMs=Date.parse('2026-10-30T07:30:00.000Z');
  function FakeDate(...args){return args.length?new Date(...args):new Date(startMs);}
  FakeDate.now=()=>startMs;FakeDate.parse=Date.parse;FakeDate.UTC=Date.UTC;FakeDate.prototype=Date.prototype;
  const ctx=createContext({
    HOST_RATE:0.3,OP_RATE:0.1,Intl,Date:FakeDate,AbortSignal,
    state:{from:'2026-10-01',to:'2026-10-29',orders:[],shopOrders:[],returns15d:[],lastOrderSync:''},
    liveSyncInProgress:false,affiliateSyncInProgress:false,
    document:{querySelectorAll:()=>[]},
    isAdmin:()=>true,isProductionAdmin:()=>true,renderAll:()=>{},
    getProductionFirebaseContext:async()=>({
      db:{},
      doc:(db,...p)=>p.join('/'),
      getDoc:async ref=>{
        if(ref==='production/sellerOrderDays/days/2026-10-01'){
          // Simulate user clicking "Hôm nay" (2026-10-30) while initial 29-day load is in flight.
          ctx.state.from='2026-10-30';ctx.state.to='2026-10-30';
          return {exists:()=>false};
        }
        if(ref==='production/sellerOrderDays/days/2026-10-30')return {exists:()=>true,data:()=>({chunks:['c1'],syncedAt:'s1'})};
        if(ref==='production/sellerOrderSnapshots/chunks/c1')return {exists:()=>true,data:()=>({syncedAt:'s1',orders:[normalizeSellerOrder({...raw,create_time:Math.floor(Date.parse('2026-10-30T06:00:00Z')/1000)},'99')],returns:[]})};
        return {exists:()=>false};
      }
    }),
    productionApiFetch:async(url,{body})=>{
      const req=JSON.parse(body);
      return {from:req.from,to:req.to,stage:req.stage,shopId:'99',syncedAt:'2026-10-30T07:36:00.000Z',orders:[],returns:[],ledger:[],nextCursor:null,complete:true,totalCount:0};
    },
    parseTikTokApiResponse:async v=>v
  });
  runInContext(source,ctx);
  const collected=await ctx.collectSellerSnapshot('2026-10-30','2026-10-30');
  assert.equal(collected.syncedAt,'2026-10-30T07:30:00.000Z');
  const loaded=await ctx.loadSellerOrderRange('2026-10-01','2026-10-29');
  assert.equal(loaded,true);
  assert.equal(ctx.state.orders.length,1);
  assert.equal(ctx.state.orders[0].date,'2026-10-30');
});
test('loadSellerOrderRange reads day chunks concurrently and exposes clear status text for loading and non-primary admin',async()=>{
  let inFlight=0,maxInFlight=0,prodAdmin=true;
  const pause=()=>new Promise(resolve=>setTimeout(resolve,5));
  const statusNode={textContent:''};
  const ctx=createContext({
    HOST_RATE:0.3,OP_RATE:0.1,Intl,Date,AbortSignal,setTimeout,clearTimeout,
    state:{from:'2026-10-30',to:'2026-10-30',orders:[],shopOrders:[],returns15d:[],lastOrderSync:''},
    liveSyncInProgress:false,affiliateSyncInProgress:false,
    document:{querySelectorAll:sel=>sel==='[data-order-sync-status]'?[statusNode]:[]},
    isAdmin:()=>true,isProductionAdmin:()=>prodAdmin,renderAll:()=>{},
    getProductionFirebaseContext:async()=>({
      db:{},
      doc:(db,...p)=>p.join('/'),
      getDoc:async ref=>{
        if(ref==='production/sellerOrderDays/days/2026-10-30')return {exists:()=>true,data:()=>({chunks:['c1','c2','c3','c4'],syncedAt:'s1'})};
        if(ref.startsWith('production/sellerOrderSnapshots/chunks/')){
          inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);
          await pause();
          inFlight--;
          const id=ref.slice(-1);
          return {exists:()=>true,data:()=>({syncedAt:'s1',orders:[normalizeSellerOrder({...raw,id:'80'+id,create_time:Math.floor(Date.parse('2026-10-30T06:00:00Z')/1000)},'99')],returns:[]})};
        }
        return {exists:()=>false};
      }
    })
  });
  runInContext(source,ctx);
  const pending=ctx.loadSellerOrderRange('2026-10-30','2026-10-30');
  assert.match(ctx.orderSyncStatusText(),/Đang tải dữ liệu đơn hàng/);
  assert.equal(await pending,true);
  assert.equal(maxInFlight,4);
  assert.equal(ctx.state.orders.length,4);
  prodAdmin=false;
  assert.match(ctx.orderSyncStatusText(),/sellerhunghienhoa@gmail\.com/);
});
test('Seller page stages sign POST bodies, read exact detail, and return only safe ledger fields',async t=>{
  const key=randomBytes(32).toString('base64');
  const encrypted=await encryptTokenRecord({accessToken:'private-access',refreshToken:'private-refresh',expiryFormat:'unix-v2',accessExpiresAt:new Date(Date.now()+3600000).toISOString(),grantedScopes:['seller.order.info','seller.return_refund.basic']},key);
  const env={FIREBASE_WEB_API_KEY:'test',TIKTOK_TOKEN_ENCRYPTION_KEY:key,TIKTOK_APP_KEY:'key',TIKTOK_APP_SECRET:'secret',TIKTOK_OAUTH_KV:{get:async name=>name==='tiktok:token:shopkhangbaby'?encrypted:null}};
  let mode='success';const paths=[];
  t.mock.method(globalThis,'fetch',async(input,options)=>{
    const url=new URL(input);if(url.hostname==='identitytoolkit.googleapis.com')return Response.json({users:[{emailVerified:true,email:'sellerhunghienhoa@gmail.com'}]});
    paths.push(url.pathname);assert.equal(options.headers['x-tts-access-token'],'private-access');assert.equal(options.redirect,'manual');
    const params=Object.fromEntries(url.searchParams);assert.equal(params.sign,await signTikTokRequest(url.pathname,params,'secret',options.body||''));
    if(url.pathname.includes('/authorization/'))return Response.json({code:0,data:{shops:[{id:'99',cipher:'cipher'}]}});
    if(url.pathname.endsWith('/orders/search')){const filter=JSON.parse(options.body);assert.equal(filter.create_time_ge,Date.parse(date+'T00:00:00+07:00')/1000);return Response.json({code:0,data:{orders:[{id:'777'}],...(mode==='loop'?{next_page_token:'same'}:{})}});}
    if(url.pathname.includes('/returns/search'))return Response.json({code:0,data:{return_orders:[{...ret,create_time:timestamp+3600}]}});
    assert.equal(url.searchParams.get('ids'),'777');return Response.json({code:0,data:{orders:mode==='missing'?[]:[raw]}});
  });
  const send=body=>worker.fetch(new Request('https://app.test/api/tiktok/orders/sync',{method:'POST',headers:{Origin:'https://app.test',Authorization:'Bearer test'},body:JSON.stringify(body||{from:date,to:date})}),env);
  const response=await send();assert.equal(response.status,200);const data=await response.json();assert.equal(data.orders.length,1);assert.equal(data.returns.length,0);assert.equal(data.orders[0].refundsComplete,false);assert.equal(data.complete,true);assert.equal(data.nextCursor,null);assert.equal(JSON.stringify(data).includes('private-'),false);assert.equal(JSON.stringify(data).includes('recipient_address'),false);assert.equal(paths.length,3);
  const returns=await (await send({from:date,to:date,stage:'returns'})).json();assert.equal(returns.returns.length,1);assert.equal(returns.returns[0].parentOrder.orderId,'777');assert.equal(returns.complete,true);
  const ledger=await (await send({from:date,to:date,stage:'refunds',orderIds:['777']})).json();assert.deepEqual(ledger.ledger,[{returnId:'888',orderId:'777',refundConfirmed:true,returnAmount:50000}]);assert.equal(ledger.orders.length,0);assert.equal(ledger.returns.length,0);
  mode='missing';assert.equal((await (await send()).json()).error,'TIKTOK_ORDERS_DETAIL_INCOMPLETE');
  mode='loop';const firstPage=await (await send()).json();assert.equal(firstPage.complete,false);assert.equal(firstPage.nextCursor,'same');assert.equal((await (await send({from:date,to:date,cursor:'same'})).json()).error,'TIKTOK_ORDERS_PAGINATION_INVALID');
  assert.equal((await send({from:date,to:date,stage:'refunds',orderIds:[777]})).status,400);
  assert.equal((await send({from:date,to:date,stage:'refunds',orderIds:['777','777']})).status,400);
  assert.equal((await send({from:date,to:date,stage:'bad'})).status,400);
  assert.equal((await send({from:'2026-01-01',to:date})).status,400);
  assert.equal((await worker.fetch(new Request('https://app.test/api/tiktok/orders/sync',{method:'POST'}),{})).status,401);
});
test('Seller pagination continues beyond ten order pages and five return pages without a range cap',async t=>{
  const key=randomBytes(32).toString('base64');
  const encrypted=await encryptTokenRecord({accessToken:'private-access',refreshToken:'private-refresh',expiryFormat:'unix-v2',accessExpiresAt:new Date(Date.now()+3600000).toISOString(),grantedScopes:['seller.order.info','seller.return_refund.basic']},key);
  const env={FIREBASE_WEB_API_KEY:'test',TIKTOK_TOKEN_ENCRYPTION_KEY:key,TIKTOK_APP_KEY:'key',TIKTOK_APP_SECRET:'secret',TIKTOK_OAUTH_KV:{get:async()=>encrypted}};
  let requests=0;
  t.mock.method(globalThis,'fetch',async(input,options)=>{
    requests++;const url=new URL(input);
    if(url.hostname==='identitytoolkit.googleapis.com')return Response.json({users:[{emailVerified:true,email:'sellerhunghienhoa@gmail.com'}]});
    if(url.pathname.includes('/authorization/'))return Response.json({code:0,data:{shops:[{id:'99',cipher:'cipher'}]}});
    const page=Number(url.searchParams.get('page_token')||0);
    if(url.pathname.endsWith('/orders/search'))return Response.json({code:0,data:{orders:[{id:raw.id}],total_count:1100,...(page<10?{next_page_token:String(page+1)}:{})}});
    if(url.pathname.includes('/returns/search'))return Response.json({code:0,data:{return_orders:[{...ret,return_id:String(888+page),create_time:timestamp+3600}],total_count:300,...(page<5?{next_page_token:String(page+1)}:{})}});
    return Response.json({code:0,data:{orders:[raw]}});
  });
  for(const [stage,pages] of [['orders',11],['returns',6],['refunds',6]]){
    let cursor='',count=0;
    do{
      const before=requests;
      const response=await worker.fetch(new Request('https://app.test/api/tiktok/orders/sync',{method:'POST',headers:{Origin:'https://app.test',Authorization:'Bearer test'},body:JSON.stringify({from:date,to:date,stage,cursor,...(stage==='refunds'?{orderIds:['777']}:{})})}),env);
      assert.equal(response.status,200,await response.clone().text());const data=await response.json();count++;
      assert.equal(data.totalCount,stage==='orders'?1100:300);assert.ok(requests-before<=4,'single page exceeded bounded external request budget');
      assert.equal(data.complete,data.nextCursor===null);cursor=data.nextCursor;
    }while(cursor);
    assert.equal(count,pages);
  }
});
