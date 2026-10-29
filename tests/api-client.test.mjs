import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import test from 'node:test';
const ordersSource=await readFile(new URL('../js/order-sync.js',import.meta.url),'utf8');
const affiliateSource=await readFile(new URL('../js/affiliate-sync.js',import.meta.url),'utf8');
const date='2026-10-28';

test('order client collects more than1000 orders then completes each refund ledger before saving',async()=>{
  let calls=0,cutoff;const ctx=createContext({AbortSignal,productionApiFetch:async(url,{body})=>{
    calls++;const input=JSON.parse(body),page=Number(input.cursor||0);
    cutoff??=input.asOf;assert.equal(input.asOf,cutoff);assert.ok(Number.isSafeInteger(cutoff));
    const orders=input.stage==='orders'?Array.from({length:100},(_,i)=>({orderId:String(page*100+i+1),amount:100,refund:0})):[];
    const next=input.stage==='orders'&&page<10?String(page+1):null;
    return {from:date,to:date,stage:input.stage,orders,returns:[],ledger:[],shopId:'99',syncedAt:'now',nextCursor:next,complete:!next,totalCount:input.stage==='orders'?1100:0};
  },parseTikTokApiResponse:async value=>value});runInContext(ordersSource,ctx);
  const result=await ctx.collectSellerSnapshot(date,date);
  assert.equal(result.orders.length,1100);assert.equal(result.orders.every(o=>o.refundsComplete&&o.refund===0),true);assert.equal(calls,34);
});
test('pagination loop or missing final page never returns a publishable snapshot',async()=>{
  let mode='loop';const ctx=createContext({AbortSignal,productionApiFetch:async()=>({from:date,to:date,stage:'orders',orders:[],returns:[],ledger:[],shopId:'99',syncedAt:'now',nextCursor:mode==='loop'?'repeat':null,complete:mode!=='loop',totalCount:mode==='loop'?10:1}),parseTikTokApiResponse:async value=>value});runInContext(ordersSource,ctx);
  await assert.rejects(()=>ctx.collectSellerSnapshot(date,date),/PAGINATION_INVALID/);mode='missing';await assert.rejects(()=>ctx.collectSellerSnapshot(date,date),/DETAIL_INCOMPLETE/);
});
test('Affiliate client deduplicates pages, separates channels, keeps missing commission unknown',async()=>{
  const row={key:'1:1',orderId:'1',date,status:'SETTLED',type:'LIVE',gmv:10000000,commission:0,commissionAvailable:false};
  const ctx=createContext({AbortSignal,renderAffiliateSyncStatus:()=>{},productionApiFetch:async(url,{body})=>{const request=JSON.parse(body);return {rows:[row],from:date,to:date,creator:request.creator,syncedAt:'now',nextCursor:request.cursor?null:'next',complete:!!request.cursor};},parseTikTokApiResponse:async value=>value});runInContext(ordersSource,ctx);runInContext(affiliateSource,ctx);
  ctx.renderAffiliateSyncStatus=()=>{};
  for(const creator of ['shopkhangbaby','mekhangsua']){const result=await ctx.collectAffiliateDays(date,date,creator);assert.equal(result.days[0].channel,creator);assert.equal(result.days[0].gmv,100000);assert.equal(result.days[0].skuCount,1);assert.equal(result.days[0].settledCommission,null);}
});
test('real TikTok terminal cursors stop at total_count even when next_page_token is still returned',async()=>{
  let requests=0;const ctx=createContext({AbortSignal,productionApiFetch:async(url,{body})=>{requests++;const input=JSON.parse(body);return {from:date,to:date,stage:input.stage,shopId:'99',syncedAt:'now',orders:[],returns:[],ledger:[],rows:[],creator:input.creator,totalCount:0,nextCursor:'provider-still-emits-token',complete:false};},parseTikTokApiResponse:async value=>value});
  runInContext(ordersSource,ctx);runInContext(affiliateSource,ctx);ctx.renderAffiliateSyncStatus=()=>{};
  await ctx.collectSellerSnapshot(date,date);await ctx.collectAffiliateDays(date,date,'mekhangsua');assert.equal(requests,3);
});
