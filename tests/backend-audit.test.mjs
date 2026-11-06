import assert from 'node:assert/strict';
import test from 'node:test';
import {randomBytes,createHmac} from 'node:crypto';
import {mkdtemp,mkdir,cp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import worker, {saveTelegramConfig,encryptTokenRecord,runBackgroundDailySync,sendTelegramMessage} from '../src/worker.js';
import {cleanupStorage} from '../src/storage-usage.js';

test('Telegram settings never return a full token or invent a default connection', async t=>{
  t.mock.method(globalThis,'fetch',async()=>Response.json({users:[{localId:'admin',emailVerified:true,email:'sellerhunghienhoa@gmail.com'}]}));
  const request=()=>new Request('https://app.example/api/telegram/settings',{headers:{Authorization:'Bearer test-only'}});
  const env={FIREBASE_WEB_API_KEY:'test-only',TIKTOK_OAUTH_KV:{get:async()=>null}};
  const empty=await (await worker.fetch(request(),env)).json();
  assert.equal(empty.configured,false);
  assert.equal(empty.botToken,undefined);
  const token='test-only-private-bot-token';
  const stored={...env,TIKTOK_OAUTH_KV:{get:async()=>JSON.stringify({botToken:token,chatId:'123456789',enabled:true}),put:async()=>{}}};
  const settings=await (await worker.fetch(request(),stored)).json();
  assert.equal(settings.configured,true);
  assert.equal(settings.chatId,'123***89');
  assert.equal(settings.botToken,undefined);
  assert.equal(JSON.stringify(settings).includes(token),false);
  const saved=await saveTelegramConfig(stored,{enabled:true});
  assert.equal(saved.botToken,undefined);
  assert.equal(JSON.stringify(saved).includes(token),false);
});

test('Telegram settings require successful durable storage before reporting saved',async()=>{
  await assert.rejects(saveTelegramConfig({}, {enabled:true}),/TELEGRAM_SETTINGS_UNAVAILABLE/);
});

test('unsupported quick cleanup cannot fabricate deleted resources or freed bytes',async()=>{
  const writes=[];
  const env={TIKTOK_OAUTH_KV:{get:async()=>null,put:async(...args)=>writes.push(args)}};
  for(const provider of ['github','firebase','cloudflare']){
    await assert.rejects(cleanupStorage(env,{ids:['quick:'+provider]}),/STORAGE_CLEANUP_UNAVAILABLE/);
  }
  assert.equal(writes.length,0);
});

test('webhook administration requires Admin authentication before reading tokens or logs',async()=>{
  let reads=0;
  const env={TIKTOK_OAUTH_KV:{get:async()=>{reads++;return null;}}};
  for(const path of ['logs','tiktok/setup','tiktok/list']){
    const response=await worker.fetch(new Request('https://app.example/api/webhooks/'+path),env);
    assert.equal(response.status,401,path);
  }
  assert.equal(reads,0);
});

test('Creator LIVE provider failures never become a successful zero GMV response',async t=>{
  const key=randomBytes(32).toString('base64');
  const encrypted=await encryptTokenRecord({accessToken:'test-only-access',refreshToken:'test-only-refresh',expiryFormat:'unix-v2',accessExpiresAt:new Date(Date.now()+3600000).toISOString(),grantedScopes:['creator.data.live.read.public']},key);
  t.mock.method(globalThis,'fetch',async input=>new URL(input).hostname==='identitytoolkit.googleapis.com'?Response.json({users:[{localId:'admin',emailVerified:true,email:'sellerhunghienhoa@gmail.com'}]}):new Response(null,{status:503}));
  const env={FIREBASE_WEB_API_KEY:'test-only',TIKTOK_APP_KEY:'test',TIKTOK_APP_SECRET:'test-only-secret',TIKTOK_TOKEN_ENCRYPTION_KEY:key,TIKTOK_OAUTH_KV:{get:async()=>encrypted}};
  const response=await worker.fetch(new Request('https://app.example/api/tiktok/live/core-stats',{method:'POST',headers:{Authorization:'Bearer test-only',Origin:'https://app.example'},body:JSON.stringify({creator:'mekhangsua',liveIds:['123']})}),env);
  assert.equal(response.status,502);
  const data=await response.json();
  assert.ok(data.error);
  assert.equal(data.rows,undefined);
});

test('webhook payloads require provider verification before writing data',async()=>{
  let writes=0;
  const env={TIKTOK_APP_KEY:'audit-app',TIKTOK_APP_SECRET:'audit-app-secret',GITHUB_WEBHOOK_SECRET:'audit-github-secret',CLOUDFLARE_WEBHOOK_SECRET:'audit-cloudflare-secret',TIKTOK_OAUTH_KV:{get:async()=>null,put:async()=>{writes++;}}};
  for(const provider of ['tiktok','github','cloudflare','firebase']){
    const request=new Request('https://app.example/api/webhooks/'+provider,{method:'POST',body:JSON.stringify({type:1,data:{order_id:'123',order_status:121}})});
    const response=await worker.fetch(request,env);
    assert.equal(response.status,provider==='firebase'?401:403,provider);
  }
  assert.equal(writes,0);
  const payload=JSON.stringify({event:'ORDER_STATUS_CHANGE',data:{order_id:'123',order_status:121}});
  const signature=createHmac('sha256',env.TIKTOK_APP_SECRET).update(env.TIKTOK_APP_KEY+payload).digest('hex');
  const response=await worker.fetch(new Request('https://app.example/api/webhooks/tiktok',{method:'POST',headers:{Authorization:signature},body:payload}),env);
  assert.equal(response.status,200);
  assert.equal(writes,1);
  const altered=await worker.fetch(new Request('https://app.example/api/webhooks/tiktok',{method:'POST',headers:{Authorization:signature},body:payload+' '}),env);
  assert.equal(altered.status,403);
  for(const method of ['HEAD','OPTIONS']){
    const health=await worker.fetch(new Request('https://app.example/api/webhooks/tiktok',{method}),{});
    assert.equal(health.status,200);
  }
  assert.equal(writes,1);
});

test('production build fails when required application files are missing',async()=>{
  const root=await mkdtemp(join(tmpdir(),'sellerkhangbaby-build-audit-'));
  try {
    await mkdir(join(root,'scripts'));
    await cp(new URL('../scripts/build.mjs',import.meta.url),join(root,'scripts','build.mjs'));
    await assert.rejects(promisify(execFile)(process.execPath,[join(root,'scripts','build.mjs')]),/ENOENT/);
  } finally { await rm(root,{recursive:true,force:true}); }
});

async function backgroundEnv(){
  const key=randomBytes(32).toString('base64');
  const stored=new Map([['tiktok:latest_snapshot',JSON.stringify({orders:[{orderId:'keep'}]})]]);
  for(const id of ['shopkhangbaby','shopkhangbaby-creator','mekhangsua'])stored.set('tiktok:token:'+id,await encryptTokenRecord({accessToken:id,refreshToken:'test-only-refresh',expiryFormat:'unix-v2',accessExpiresAt:new Date(Date.now()+3600000).toISOString()},key));
  return {stored,env:{TIKTOK_APP_KEY:'background-test',TIKTOK_APP_SECRET:'test-only',TIKTOK_TOKEN_ENCRYPTION_KEY:key,TIKTOK_OAUTH_KV:{get:async key=>stored.get(key)||null,put:async(key,value)=>stored.set(key,value)}}};
}

test('background sync preserves the prior snapshot when a provider fails',async t=>{
  const {stored,env}=await backgroundEnv();
  const previous=stored.get('tiktok:latest_snapshot');
  t.mock.method(globalThis,'fetch',async input=>new URL(input).pathname.includes('/authorization/')?Response.json({code:0,data:{shops:[{id:'123',cipher:'test-shop'}]}}):new Response(null,{status:503}));
  await assert.rejects(runBackgroundDailySync(env),/HTTP_ERROR/);
  assert.equal(stored.get('tiktok:latest_snapshot'),previous);
});

test('background Affiliate totals retain each Vietnam date and exclude ineligible statuses',async t=>{
  const {stored,env}=await backgroundEnv();
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const yesterday=new Date(Date.parse(today)-86400000).toISOString().slice(0,10);
  t.mock.method(globalThis,'fetch',async(input,options)=>{
    const path=new URL(input).pathname;
    if(path.includes('/authorization/'))return Response.json({code:0,data:{shops:[{id:'124',cipher:'test-shop'}]}});
    if(path.includes('shop_lives/performance'))return Response.json({code:0,data:{live_stream_sessions:[]}});
    if(path.includes('/affiliate_creator/')&&path.endsWith('/profiles'))return Response.json({code:0,data:{username:options.headers['x-tts-access-token']==='mekhangsua'?'mekhangsua':'shopkhangbaby'}});
    if(path.includes('/affiliate_creator/')&&path.endsWith('/orders/search'))return Response.json({code:0,data:{orders:[
      {id:'1',create_time:Date.parse(yesterday+'T01:00:00Z')/1000,status:'TO_SETTLE',skus:[{id:'11',quantity:1,price:{amount:'100',currency:'VND'},content_type:'LIVE'}]},
      {id:'2',create_time:Date.parse(today+'T01:00:00Z')/1000,status:'FROZEN',skus:[{id:'12',quantity:1,price:{amount:'200',currency:'VND'},content_type:'LIVE'}]}
    ]}});
    if(path.endsWith('/orders/search'))return Response.json({code:0,data:{orders:[]}});
    if(path.endsWith('/returns/search'))return Response.json({code:0,data:{return_orders:[]}});
    throw Error('Unexpected path '+path);
  });
  await runBackgroundDailySync(env);
  const snapshot=JSON.parse(stored.get('tiktok:latest_snapshot'));
  assert.equal(snapshot.affiliateDaily.find(row=>row.channel==='mekhangsua'&&row.date===yesterday)?.gmv,100);
  assert.equal(snapshot.affiliateDaily.find(row=>row.channel==='mekhangsua'&&row.date===today)?.gmv,0);
});

test('background sync rejects repeated pagination instead of publishing a partial snapshot',async t=>{
  const {stored,env}=await backgroundEnv();
  const previous=stored.get('tiktok:latest_snapshot');
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  t.mock.method(globalThis,'fetch',async input=>{
    const path=new URL(input).pathname;
    if(path.includes('/authorization/'))return Response.json({code:0,data:{shops:[{id:'125',cipher:'test-shop'}]}});
    if(path.includes('shop_lives/performance'))return Response.json({code:0,data:{live_stream_sessions:[]}});
    if(path.endsWith('/orders/search'))return Response.json({code:0,data:{orders:[{id:'123'}],next_page_token:'repeat'}});
    if(path==='/order/202507/orders')return Response.json({code:0,data:{orders:[{id:'123',create_time:Date.parse(today+'T01:00:00Z')/1000,status:'IN_TRANSIT',line_items:[],payment:{sub_total:'100',total_amount:'100',currency:'VND'}}]}});
    throw Error('Unexpected path '+path);
  });
  await assert.rejects(runBackgroundDailySync(env),/PAGINATION_INVALID/);
  assert.equal(stored.get('tiktok:latest_snapshot'),previous);
});

test('Telegram network/provider errors cannot echo the private bot token',async t=>{
  const token='test-only-bot-private';
  const mock=t.mock.method(globalThis,'fetch',async()=>{throw Error('Failed https://api.telegram.org/bot'+token+'/sendMessage');});
  assert.deepEqual(await sendTelegramMessage(token,'123','test'),{ok:false,error:'NETWORK_ERROR'});
  mock.mock.mockImplementation(async()=>Response.json({ok:false,description:'Echo '+token},{status:400}));
  const response=await sendTelegramMessage(token,'123','test');
  assert.equal(response.error,'TELEGRAM_API_ERROR');
  assert.equal(JSON.stringify(response).includes(token),false);
});

test('both deployment configurations preserve token refresh and nightly reporting cron',async()=>{
  const wrangler=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  const cf=await readFile(new URL('../cloudflare.config.ts',import.meta.url),'utf8');
  const schedules=[...cf.matchAll(/schedule:\s*"([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(schedules.sort(),wrangler.triggers.crons.slice().sort());
});

test('OpenAPI Creator LIVE stats declares the actual creator and liveIds request contract',async()=>{
  const spec=await (await worker.fetch(new Request('https://app.example/openapi.json'),{})).json();
  const schema=spec.paths['/api/tiktok/live/core-stats'].post.requestBody.content['application/json'].schema;
  assert.deepEqual(schema.required,['creator','liveIds']);
  assert.equal(schema.properties.liveIds.maxItems,20);
  assert.equal(schema.properties.liveIds.items.type,'string');
});
