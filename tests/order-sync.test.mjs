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

test('Seller orders use exact IDs, product subtotal, actual delivery time and explicit room attribution',()=>{
  const order=normalizeSellerOrder(raw,'99');assert.equal(order.amount,100000);assert.equal(order.paidTotal,115000);assert.equal(order.attribution,'LIVE');assert.equal(order.date,date);assert.equal(order.time,'10:00');assert.equal(JSON.stringify(order).includes('private buyer'),false);
  assert.equal(normalizeSellerOrder({...raw,line_items:[{id:'11',room_id:''}]},'99').attribution,'NON_LIVE');
  assert.equal(normalizeSellerOrder({...raw,line_items:[{id:'11'}]},'99').attribution,'UNKNOWN');
  assert.equal(normalizeSellerOrder({...raw,line_items:[{id:'11',room_id:'123'},{id:'12',room_id:''}]},'99').attribution,'MIXED');
  assert.throws(()=>normalizeSellerOrder({...raw,id:777},'99'),/RESPONSE_INVALID/);
  assert.throws(()=>normalizeSellerOrder({...raw,payment:{...raw.payment,currency:'USD'}},'99'),/CURRENCY_UNSUPPORTED/);
});
test('Returns distinguish proposed from completed money and do not invent delivery or liability',()=>{
  const parent=normalizeSellerOrder(raw,'99');const done=normalizeSellerReturn(ret,'99',parent);assert.equal(done.returnAmount,50000);assert.equal(done.daysFromDelivery,1);assert.equal(done.within15Days,true);assert.equal(done.liability,'Chưa xác định');
  const pending=normalizeSellerReturn({...ret,return_status:'RETURN_OR_REFUND_REQUEST_SUCCESS'},'99',parent);assert.equal(pending.returnAmount,0);assert.equal(pending.requestedAmount,50000);assert.equal(pending.refundConfirmed,false);
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
test('Day views replace API rows without removing manual orders or mixing unknown sources into organic orders',()=>{
  const ctx=context();runInContext("var state={orders:[{orderId:'manual'}],shopOrders:[],returns15d:[]};",ctx);
  const orders=[normalizeSellerOrder(raw,'99'),normalizeSellerOrder({...raw,id:'778',line_items:[{id:'12',room_id:''}]},'99'),normalizeSellerOrder({...raw,id:'779',line_items:[{id:'13'}]},'99')];
  ctx.applySellerOrderView(orders,[]);ctx.applySellerOrderView(orders,[]);
  assert.equal(runInContext('state.orders.length',ctx),4);assert.equal(runInContext('state.shopOrders.length',ctx),1);
  ctx.applySellerOrderView([],[]);assert.equal(runInContext('state.orders[0].orderId',ctx),'manual');
});
test('A complete refund ledger reconciles exact totals once and preserves manual or mismatched sessions',()=>{
  const ctx=context();const session={id:'live',tiktokLiveId:'123',tiktokShopId:'99',date,hostId:'host',operatorId:'op',grossLiveGmv:100000,tiktokReportedGmv:100000,pendingRecGmv:100000,cancelReturnGmv:0};
  const order={...normalizeSellerOrder(raw,'99'),refundsComplete:true,refund:50000};const returned=normalizeSellerReturn(ret,'99',order);
  const result=ctx.prepareSellerSnapshot([session],[order],[returned],date,'2026-10-29','now');assert.equal(result.sessions[0].pendingRecGmv,0);assert.equal(result.sessions[0].cancelReturnGmv,50000);assert.equal(result.sessions[0].orderSync.verified,true);assert.equal(result.returns[0].reflectedInSession,true);
  const repeat=ctx.prepareSellerSnapshot(result.sessions,[order],[returned],date,'2026-10-29','later');assert.equal(repeat.sessions[0].cancelReturnGmv,50000);
  const manual=ctx.prepareSellerSnapshot([{...session,isManualKpi:true}],[order],[],date,date,'now');assert.equal(manual.sessions[0].pendingRecGmv,100000);
  const mismatch=ctx.prepareSellerSnapshot([{...session,tiktokReportedGmv:200000}],[order],[],date,date,'now');assert.equal(mismatch.sessions[0].pendingRecGmv,100000);
  const outside=ctx.prepareSellerSnapshot([session],[{...order,refund:0}],[],date,date,'now');assert.equal(outside.sessions[0].cancelReturnGmv,0);assert.equal(outside.sessions[0].orderSync.verified,true);
});
test('Seller sync signs POST bodies, reads detail and return parents, hides credentials and rejects incomplete responses',async t=>{
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
  const response=await send();assert.equal(response.status,200);const data=await response.json();assert.equal(data.orders.length,1);assert.equal(data.returns.length,1);assert.equal(data.orders[0].refundsComplete,true);assert.equal(data.orders[0].refund,50000);assert.equal(JSON.stringify(data).includes('private-'),false);assert.equal(JSON.stringify(data).includes('recipient_address'),false);assert.equal(paths.length,5);
  mode='missing';assert.equal((await (await send()).json()).error,'TIKTOK_ORDERS_DETAIL_INCOMPLETE');
  mode='loop';assert.equal((await (await send()).json()).error,'TIKTOK_ORDERS_PAGINATION_INVALID');
  assert.equal((await send({from:'2026-01-01',to:date})).status,400);
  assert.equal((await worker.fetch(new Request('https://app.test/api/tiktok/orders/sync',{method:'POST'}),{})).status,401);
});
