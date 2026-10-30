import assert from 'node:assert/strict';
import test from 'node:test';
import {getStorageUsage,saveStoragePolicy,cleanupStorage} from '../src/storage-usage.js';
import worker from '../src/worker.js';

test('public repository usage is measured; missing provider permissions stay unknown, not zero',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async url=>{calls++;return Response.json(String(url).includes('/releases?')?[{assets:[{size:2048}]}]:{size:12});};
  try {
    const data=await getStorageUsage({});
    assert.equal(data.providers.length,3);
    assert.equal(data.providers[0].metrics[0].used,12288);
    assert.equal(data.providers[0].metrics[1].used,2048);
    assert.equal(data.providers[0].metrics[0].limit,null);
    for(const provider of data.providers.slice(1)){assert.equal(provider.status,'needs_setup');assert.equal(provider.metrics[0].used,null);assert.equal(provider.missing.length,1);}
    await getStorageUsage({});assert.equal(calls,2,'ordinary reads use five-minute cache');
    await getStorageUsage({}, {force:true});assert.equal(calls,4,'manual refresh bypasses the cache');
  } finally {globalThis.fetch=original;}
});
test('signed-in Admin and existing bindings measure Firebase and Cloudflare without extra secrets',async()=>{
  const original=globalThis.fetch;
  const seenAuth=[];
  globalThis.fetch=async (input,options={})=>{
    const url=new URL(input);
    if(url.hostname==='api.github.com')return Response.json(url.pathname.endsWith('/releases')?[]:{size:1});
    assert.equal(url.hostname,'firestore.googleapis.com');
    seenAuth.push(options.headers.Authorization);
    if(url.pathname.endsWith('/dashboard'))return Response.json({name:'projects/sellerkhangbaby/databases/(default)/documents/production/dashboard',fields:{ok:{booleanValue:true}}});
    return Response.json({documents:[{name:url.pathname+'/one',fields:{value:{stringValue:'safe'}}}]});
  };
  const env={
    TIKTOK_OAUTH_KV:{
      list:async()=>({keys:[{name:'one'},{name:'two'}],list_complete:true}),
      get:async key=>new Uint8Array(key==='one'?5:7)
    },
    ASSETS:{fetch:async()=>Response.json({bytes:3456,files:12})}
  };
  try {
    const data=await getStorageUsage(env,{firebaseIdToken:'firebase-admin-only'});
    assert.deepEqual(data.providers.map(provider=>provider.status),['ready','ready','ready']);
    assert.equal(data.providers[1].source,'Firestore REST · quyền Admin');
    assert.ok(data.providers[1].metrics[0].used>0);
    assert.equal(seenAuth.length,5);
    assert.ok(seenAuth.every(value=>value==='Bearer firebase-admin-only'));
    assert.equal(data.providers[2].metrics.find(metric=>metric.id==='kv').used,12);
    assert.equal(data.providers[2].metrics.find(metric=>metric.id==='assets').used,3456);
    assert.equal(JSON.stringify(data).includes('firebase-admin-only'),false);
  } finally {globalThis.fetch=original;}
});
test('monitoring signs a read-only JWT, reads storage metrics and never returns credentials',async()=>{
  const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const pem=Buffer.from(await crypto.subtle.exportKey('pkcs8',keys.privateKey)).toString('base64');
  const account={project_id:'sellerkhangbaby',client_email:'usage-reader@example.iam.gserviceaccount.com',private_key:`-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`};
  const env={CLOUDFLARE_USAGE_API_TOKEN:'cf-test-only',GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON:JSON.stringify(account)};
  const original=globalThis.fetch;
  globalThis.fetch=async (input,options)=>{
    const url=new URL(input);
    assert.equal(options.redirect,'manual');
    if(url.hostname==='api.github.com')return Response.json(url.pathname.endsWith('/releases')?[]:{size:0});
    if(url.hostname==='api.cloudflare.com'){
      assert.equal(options.headers.Authorization,'Bearer cf-test-only');
      assert.equal(JSON.parse(options.body).variables.namespace,'3a78cf302fa64cc4b8b8a3f62c2cb96e');
      return Response.json({data:{viewer:{accounts:[{kvStorageAdaptiveGroups:[{max:{byteCount:4096},dimensions:{date:'2026-10-28'}}]}]}}});
    }
    if(url.hostname==='oauth2.googleapis.com'){
      const assertion=options.body.get('assertion');
      const [header,payload,signature]=assertion.split('.');
      const claims=JSON.parse(Buffer.from(payload,'base64url'));
      assert.equal(claims.scope,'https://www.googleapis.com/auth/monitoring.read');
      assert.equal(claims.aud,'https://oauth2.googleapis.com/token');
      assert.equal(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',keys.publicKey,Buffer.from(signature,'base64url'),new TextEncoder().encode(`${header}.${payload}`)),true);
      return Response.json({access_token:'google-test-only'});
    }
    assert.equal(url.hostname,'monitoring.googleapis.com');
    assert.match(url.searchParams.get('filter'),/database_id="\(default\)"/);
    return Response.json({timeSeries:[{points:[{value:{int64Value:'1048576'},interval:{endTime:'2026-10-28T14:00:00Z'}}]}]});
  };
  try {
    const data=await getStorageUsage(env);
    assert.deepEqual(data.providers.map(p=>p.status),['ready','ready','ready']);
    assert.equal(data.providers[1].metrics[0].used,1048576);
    assert.equal(data.providers[2].metrics[0].used,4096);
    const json=JSON.stringify(data);
    for(const secret of ['cf-test-only','google-test-only','PRIVATE KEY',account.client_email])assert.equal(json.includes(secret),false);
  } finally {globalThis.fetch=original;}
});
test('Firebase falls back to a complete paginated Admin estimate when Monitoring is unavailable',async()=>{
  const original=globalThis.fetch;
  const firestoreCalls=[];
  globalThis.fetch=async (input,options={})=>{
    const url=new URL(input);
    if(url.hostname==='api.github.com')return Response.json(url.pathname.endsWith('/releases')?[]:{size:1});
    if(url.hostname==='oauth2.googleapis.com')return new Response('denied',{status:403});
    assert.equal(url.hostname,'firestore.googleapis.com');
    assert.equal(options.headers.Authorization,'Bearer firebase-admin-only');
    firestoreCalls.push(url.pathname+url.search);
    if(url.pathname.endsWith('/dashboard')||url.pathname.endsWith('/staffDashboard'))return Response.json({name:url.pathname,fields:{ok:{booleanValue:true}}});
    const page=url.searchParams.get('pageToken');
    return Response.json({documents:[{name:url.pathname+'/'+(page||'one'),fields:{value:{stringValue:'safe'}}}],...(page?{}:{nextPageToken:'next'})});
  };
  try {
    const data=await getStorageUsage({GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON:'{"project_id":"sellerkhangbaby","client_email":"usage-reader@example.test","private_key":"invalid"}'},{firebaseIdToken:'firebase-admin-only',force:true});
    const firebase=data.providers.find(provider=>provider.id==='firebase');
    assert.equal(firebase.status,'ready');
    assert.equal(firebase.source,'Firestore REST · quyền Admin');
    assert.equal(firebase.warning,'MONITORING_FALLBACK');
    assert.equal(firebase.metrics[0].documents,8);
    assert.equal(firestoreCalls.filter(url=>url.includes('pageToken=next')).length,3);
    assert.ok(firestoreCalls.some(url=>url.includes('/production/staffDashboard')));
    assert.ok(firestoreCalls.some(url=>url.includes('/production/sellerOrderSnapshots/chunks')));
  } finally {globalThis.fetch=original;}
});
test('partial provider failures stay separate and do not expose upstream messages',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async url=>String(url).includes('cloudflare')?Response.json({errors:[{message:'do not expose sensitive upstream data'}]}):new Response('do not expose token',{status:403});
  try {
    const data=await getStorageUsage({GITHUB_USAGE_TOKEN:'bad-token',CLOUDFLARE_USAGE_API_TOKEN:'bad-cf-token',GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON:'invalid'});
    assert.ok(data.providers.every(p=>p.status==='unavailable'&&p.metrics.every(m=>m.used===null)));
    assert.equal(JSON.stringify(data).includes('do not expose'),false);
    assert.equal(JSON.stringify(data).includes('bad-token'),false);
  } finally {globalThis.fetch=original;}
});
test('storage endpoint requires verified Firebase administrator',async()=>{
  const original=globalThis.fetch;
  let email='staff@example.test';
  globalThis.fetch=async()=>Response.json({users:[{emailVerified:true,email}]});
  try {
    const env={FIREBASE_WEB_API_KEY:'test-only'};
    assert.equal((await worker.fetch(new Request('https://app.example/api/storage/usage'),env)).status,401);
    const response=await worker.fetch(new Request('https://app.example/api/storage/usage',{headers:{Authorization:'Bearer test-only'}}),env);
    assert.equal(response.status,403);
  } finally {globalThis.fetch=original;}
});

test('storage settings require same-origin Admin and persist in KV',async()=>{
  const original=globalThis.fetch;
  const values=new Map();
  globalThis.fetch=async()=>Response.json({users:[{localId:'admin',emailVerified:true,email:'sellerhunghienhoa@gmail.com'}]});
  const env={FIREBASE_WEB_API_KEY:'test-only',TIKTOK_OAUTH_KV:{get:async key=>values.get(key)||null,put:async(key,value)=>values.set(key,value)}};
  const request=origin=>new Request('https://app.example/api/storage/settings',{method:'POST',headers:{Authorization:'Bearer test-only',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({retentionDays:30,threshold:88,autoFree:true})});
  try {
    assert.equal((await worker.fetch(request('https://wrong.example'),env)).status,403);
    const response=await worker.fetch(request('https://app.example'),env);
    assert.equal(response.status,200);
    assert.deepEqual((await response.json()).policy,{retentionDays:60,threshold:88,autoFree:true});
    assert.ok(values.has('storage:cleanup:policy'));
  } finally { globalThis.fetch=original; }
});

test('storage cleanup protects recent data and deletes only eligible GitHub technical artifacts',async()=>{
  const values=new Map();
  const deleted=[];
  const env={
    GITHUB_USAGE_TOKEN:'github-test-only',
    TIKTOK_OAUTH_KV:{
      get:async key=>values.get(key)||null,
      put:async(key,value)=>values.set(key,value)
    }
  };
  const original=globalThis.fetch;
  globalThis.fetch=async(input,options={})=>{
    const url=new URL(input);
    if(options.method==='DELETE') { deleted.push(url.pathname); return new Response(null,{status:204}); }
    if(url.pathname.endsWith('/actions/artifacts')) return Response.json({artifacts:[
      {id:1,name:'recent-build',size_in_bytes:100,created_at:'2026-10-15T00:00:00Z',expired:false},
      {id:2,name:'old-build',size_in_bytes:200,created_at:'2026-07-01T00:00:00Z',expired:true}
    ]});
    if(url.pathname.endsWith('/actions/caches')) return Response.json({actions_caches:[
      {id:3,key:'recent-cache',size_in_bytes:300,last_accessed_at:'2026-10-20T00:00:00Z'},
      {id:4,key:'old-cache',size_in_bytes:400,last_accessed_at:'2026-06-01T00:00:00Z'}
    ]});
    throw new Error('Unexpected '+url.pathname);
  };
  try {
    const policy=await saveStoragePolicy(env,{retentionDays:90,threshold:85,autoFree:true});
    assert.deepEqual(policy,{retentionDays:90,threshold:85,autoFree:true});
    const result=await cleanupStorage(env,{now:Date.parse('2026-10-30T00:00:00Z')});
    assert.deepEqual(deleted,[
      '/repos/sellerhunghienhoa/sellerkhangbaby/actions/artifacts/2',
      '/repos/sellerhunghienhoa/sellerkhangbaby/actions/caches/4'
    ]);
    assert.equal(result.deleted,2);
    assert.equal(result.freedBytes,600);
    assert.equal(result.protectedDays,90);
    assert.equal(result.history.length,2);
    assert.equal(JSON.stringify(result).includes('github-test-only'),false);
  } finally { globalThis.fetch=original; }
});
