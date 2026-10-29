import assert from 'node:assert/strict';
import test from 'node:test';
import {randomBytes} from 'node:crypto';
import worker,{encryptTokenRecord} from '../src/worker.js';
test('TikTok zero-count terminal tokens do not fail empty Affiliate or refund imports',async t=>{
  const asOf=Date.parse('2026-10-28T12:00:00+07:00')/1000;
  const key=randomBytes(32).toString('base64');
  const token=await encryptTokenRecord({accessToken:'test',expiryFormat:'unix-v2',accessExpiresAt:new Date(Date.now()+3600000).toISOString(),grantedScopes:['creator.affiliate.info','creator.affiliate_collaboration.read','seller.order.info','seller.return_refund.basic']},key);
  const env={FIREBASE_WEB_API_KEY:'test',TIKTOK_APP_KEY:'test',TIKTOK_APP_SECRET:'test',TIKTOK_TOKEN_ENCRYPTION_KEY:key,TIKTOK_OAUTH_KV:{get:async()=>token}};
  t.mock.method(globalThis,'fetch',async(input,options)=>{
    const url=new URL(input);
    if(url.hostname==='identitytoolkit.googleapis.com')return Response.json({users:[{emailVerified:true,email:'sellerhunghienhoa@gmail.com'}]});
    if(url.pathname.includes('/authorization/'))return Response.json({code:0,data:{shops:[{id:'99',cipher:'cipher'}]}});
    if(url.pathname.endsWith('/profiles'))return Response.json({code:0,data:{username:'mekhangsua'}});
    const filter=JSON.parse(options.body);assert.equal(filter.create_time_lt,asOf);
    return Response.json({code:0,data:{total_count:0,next_page_token:'terminal-cursor'}});
  });
  for(const [path,extra] of [['affiliate',{creator:'mekhangsua',paged:true}],['orders',{stage:'refunds',orderIds:['777']}],['orders',{stage:'returns'}],['orders',{stage:'orders'}]]){
    const response=await worker.fetch(new Request('https://app.test/api/tiktok/'+path+'/sync',{method:'POST',headers:{Origin:'https://app.test',Authorization:'Bearer test'},body:JSON.stringify({from:'2026-10-28',to:'2026-10-28',asOf,...extra})}),env);
    assert.equal(response.status,200,await response.clone().text());const data=await response.json();assert.equal(data.nextCursor,null);assert.equal(data.complete,true);
  }
});
