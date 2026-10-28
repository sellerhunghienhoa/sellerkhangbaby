import assert from 'node:assert/strict';
import test from 'node:test';
import {getStorageUsage} from '../src/storage-usage.js';
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
    await getStorageUsage({});assert.equal(calls,2,'refresh uses five-minute cache');
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
