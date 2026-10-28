import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac,randomBytes} from 'node:crypto';
import {createContext,runInContext} from 'node:vm';
import test from 'node:test';
import worker,{encryptTokenRecord,normalizeAffiliateOrders,signTikTokRequest} from '../src/worker.js';

const origin='https://app.example.test';
const from='2026-10-28',to=from;
const sku={id:'101',quantity:2,content_type:'LIVE',price:{amount:'100000',currency:'VND'},actual_commission:{amount:'12345.67',currency:'VND'}};
const order={id:'777',create_time:Math.floor(Date.parse('2026-10-28T00:01:00+07:00')/1000),status:'SETTLED',skus:[sku]};

test('affiliate money is sourced from SKU sales, counts SKUs across pages once, and separates true commission',()=>{
  const days=normalizeAffiliateOrders([order,{...order,skus:[{...sku,id:'102',content_type:'VIDEO'}]},order],from,to,'now');
  assert.equal(days.length,1);assert.equal(days[0].gmv,400000);assert.equal(days[0].liveGmv,200000);assert.equal(days[0].videoGmv,200000);
  assert.equal(days[0].settledCommission,24691.34);assert.equal(days[0].orderCount,1);assert.equal(days[0].skuCount,2);
  const filtered=normalizeAffiliateOrders([order,{...order,id:'778',status:'AWAITING PAYMENT'},{...order,id:'779',status:'FROZEN'},{...order,id:'780',status:'REFUNDED'}],from,to,'now');
  assert.equal(filtered[0].gmv,400000);assert.equal(filtered[0].refundedGmv,200000);assert.equal(filtered[0].settledCommission,12345.67);
});
test('affiliate imports validate identity, money and dates, and never turn invalid data into zero',()=>{
  assert.throws(()=>normalizeAffiliateOrders([{...order,skus:[{...sku,price:{amount:'1',currency:'USD'}}]}],from,to,'now'),/CURRENCY_UNSUPPORTED/);
  assert.throws(()=>normalizeAffiliateOrders([{...order,id:1234567890123456789}],from,to,'now'),/RESPONSE_INVALID/);
  assert.throws(()=>normalizeAffiliateOrders([{...order,skus:[{...sku,price:{amount:'₫100.000',currency:'VND'}}]}],from,to,'now'),/RESPONSE_INVALID/);
  assert.throws(()=>normalizeAffiliateOrders([order,{...order,skus:[{...sku,quantity:3}]}],from,to,'now'),/CHANGED_DURING_SYNC/);
  assert.equal(normalizeAffiliateOrders([],from,to,'now')[0].gmv,0,'successful empty response explicitly clears the covered day');
});
test('POST signatures cover the exact JSON body sent to TikTok',async()=>{
  const path='/affiliate_creator/202410/orders/search';const params={app_key:'key',timestamp:'123',page_size:'100'};
  const body=JSON.stringify({create_time_ge:1,create_time_lt:2});
  const expected=createHmac('sha256','secret').update('secret'+path+'app_keykeypage_size100timestamp123'+body+'secret').digest('hex');
  assert.equal(await signTikTokRequest(path,params,'secret',body),expected);
});
test('Creator token drives paginated affiliate sync with exact account and Vietnam date checks',async t=>{
  const secret=randomBytes(32).toString('base64');
  const encrypted=await encryptTokenRecord({accessToken:'private-creator',refreshToken:'private-refresh',expiryFormat:'unix-v2',accessExpiresAt:new Date(Date.now()+3600000).toISOString(),grantedScopes:['creator.affiliate_collaboration.read','creator.affiliate.info']},secret);
  const env={FIREBASE_WEB_API_KEY:'test',TIKTOK_TOKEN_ENCRYPTION_KEY:secret,TIKTOK_APP_KEY:'key',TIKTOK_APP_SECRET:'secret',TIKTOK_OAUTH_KV:{get:async key=>key==='tiktok:token:mekhangsua'?encrypted:null}};
  let pages=0,username='mekhangsua',loop=false;
  t.mock.method(globalThis,'fetch',async(input,options)=>{
    const url=new URL(input);
    if(url.hostname==='identitytoolkit.googleapis.com')return Response.json({users:[{emailVerified:true,email:'sellerhunghienhoa@gmail.com'}]});
    assert.equal(options.headers['x-tts-access-token'],'private-creator');assert.equal(options.redirect,'manual');assert.equal(String(input).includes('private-'),false);
    if(url.pathname.endsWith('/profiles'))return Response.json({code:0,data:{username}});
    assert.equal(options.method,'POST');assert.equal(url.pathname,'/affiliate_creator/202410/orders/search');
    const body=JSON.parse(options.body);
    assert.equal(body.create_time_ge,Math.floor(Date.parse('2026-10-28T00:00:00+07:00')/1000));
    assert.equal(body.create_time_lt-body.create_time_ge,86400);
    const params=Object.fromEntries(url.searchParams);assert.equal(params.sign,await signTikTokRequest(url.pathname,params,'secret',options.body));
    pages++;
    return Response.json({code:0,data:{orders:[order],...(pages===1||loop?{next_page_token:'next'}:{})}});
  });
  const send=()=>worker.fetch(new Request(origin+'/api/tiktok/affiliate/sync',{method:'POST',headers:{Authorization:'Bearer test',Origin:origin},body:JSON.stringify({from,to})}),env);
  const response=await send();assert.equal(response.status,200);const data=await response.json();assert.equal(data.days[0].gmv,200000);assert.equal(pages,2);assert.equal(JSON.stringify(data).includes('private-'),false);
  username='other';const mismatch=await send();assert.equal((await mismatch.json()).error,'TIKTOK_CREATOR_ACCOUNT_MISMATCH');
  username='mekhangsua';loop=true;const repeated=await send();assert.equal((await repeated.json()).error,'TIKTOK_AFFILIATE_PAGINATION_INVALID');
});
test('affiliate endpoint rejects missing Creator, missing permission, bad dates and missing Google auth',async t=>{
  t.mock.method(globalThis,'fetch',async()=>Response.json({users:[{emailVerified:true,email:'sellerhunghienhoa@gmail.com'}]}));
  const send=(env,body={from,to})=>worker.fetch(new Request(origin+'/api/tiktok/affiliate/sync',{method:'POST',headers:{Authorization:'Bearer test',Origin:origin},body:JSON.stringify(body)}),env);
  assert.equal((await (await send({})).json()).error,'TIKTOK_CREATOR_NOT_CONNECTED');
  assert.equal((await send({},{from:'2026-01-01',to})).status,400);
  const secret=randomBytes(32).toString('base64');const encrypted=await encryptTokenRecord({expiryFormat:'unix-v2',accessExpiresAt:new Date(Date.now()+3600000).toISOString(),grantedScopes:['creator.affiliate.info']},secret);
  assert.equal((await (await send({TIKTOK_TOKEN_ENCRYPTION_KEY:secret,TIKTOK_OAUTH_KV:{get:async()=>encrypted}})).json()).error,'TIKTOK_AFFILIATE_SCOPE_MISSING');
  assert.equal((await worker.fetch(new Request(origin+'/api/tiktok/affiliate/sync',{method:'POST'}),{})).status,401);
});
test('daily aggregates replace rather than add, clear zero days, preserve other dates and never touch session KPI',async()=>{
  const source=await readFile(new URL('../js/affiliate-sync.js',import.meta.url),'utf8');const ctx=createContext({});runInContext(source,ctx);
  const existing=[{date:from,channel:'mekhangsua',gmv:100},{date:'2026-10-27',channel:'mekhangsua',gmv:50}];
  const first=ctx.mergeAffiliateDays(existing,[{date:from,channel:'mekhangsua',gmv:200}]);
  const second=ctx.mergeAffiliateDays(first,[{date:from,channel:'mekhangsua',gmv:200}]);
  assert.equal(second.length,2);assert.equal(second.find(d=>d.date===from).gmv,200);assert.equal(second[0].gmv,50);
  assert.equal(ctx.mergeAffiliateDays(second,[{date:from,channel:'mekhangsua',gmv:0}])[1].gmv,0);
});
