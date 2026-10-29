async page => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.context().route('https://www.gstatic.com/firebasejs/**',async route=>{
    const url=route.request().url();let body='';
    if(url.endsWith('firebase-app.js'))body='export const getApps=()=>[];export const initializeApp=()=>({});';
    if(url.endsWith('firebase-auth.js'))body=`export const getAuth=()=>({});export const browserLocalPersistence={};export const setPersistence=async()=>{};export const onAuthStateChanged=(auth,callback)=>{setTimeout(()=>callback({uid:'ui-admin',displayName:'Quản trị viên',email:'sellerhunghienhoa@gmail.com',emailVerified:true,getIdToken:async()=>'test-only'}),100)};`;
    if(url.endsWith('firebase-firestore.js'))body=`
      window.mockDashboard={sessions:[],affiliateDaily:[{date:'2026-09-01',channel:'mekhangsua',gmv:500000,currency:'VND'}]};window.mockWrites=0;window.mockFailSave=false;window.savedFields=[];
      export const getFirestore=()=>({});export const doc=(db,...path)=>path.join('/');export const collection=(db,...path)=>path.join('/');
      export const getDoc=async ref=>({exists:()=>true,data:()=>ref==='production/dashboard'?window.mockDashboard:{}});
      export const getDocs=async()=>({docs:[]});export const setDoc=async()=>{};export const writeBatch=()=>({set:()=>{},commit:async()=>{}});
      export const runTransaction=async(db,callback)=>{if(window.mockFailSave)throw Error('SAVE_FAILED');let update;const result=await callback({get:getDoc,update:(ref,data)=>{update=data}});window.savedFields=Object.keys(update);Object.assign(window.mockDashboard,update);window.mockWrites++;return result;};`;
    await route.fulfill({contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body});
  });
  await page.route('**/api/tiktok/status',route=>route.fulfill({json:{backendReady:true,missingSecrets:[],connections:[{id:'shopkhangbaby',kind:'seller',label:'Seller Shop Khang Baby',status:'connected',authorizationReady:true,grantedScopes:[]},{id:'shopkhangbaby-creator',kind:'creator',label:'Creator TikTok shopkhangbaby',status:'not_configured',authorizationReady:true,grantedScopes:[]},{id:'mekhangsua',kind:'creator',label:'Creator TikTok mekhangsua',status:'connected',authorizationReady:true,grantedScopes:[]}]}}));
  let mode='success',calls=0;
  await page.route('**/api/tiktok/affiliate/sync',async route=>{
    calls++;await new Promise(resolve=>setTimeout(resolve,200));
    if(mode==='missing')return route.fulfill({status:403,json:{error:'TIKTOK_AFFILIATE_SCOPE_MISSING'}});
    const request=route.request().postDataJSON();
    const day={date:'2026-10-28',channel:'mekhangsua',gmv:1200000,liveGmv:1000000,videoGmv:200000,otherGmv:0,refundedGmv:100000,settledCommission:12345,orderCount:4,skuCount:5,currency:'VND',syncedAt:'2026-10-28T14:00:00Z'};
    const rows=request.creator==='shopkhangbaby'?[{key:'2:2',orderId:'2',date:'2026-10-28',status:'SETTLED',type:'LIVE',gmv:40000000,commission:0,commissionAvailable:true}]:[{key:'1:1',orderId:'1',date:'2026-10-28',status:'SETTLED',type:'LIVE',gmv:90000000,commission:1234500,commissionAvailable:true},{key:'1:2',orderId:'1',date:'2026-10-28',status:'SETTLED',type:'VIDEO',gmv:20000000,commission:0,commissionAvailable:true},{key:'1:3',orderId:'1',date:'2026-10-28',status:'REFUNDED',type:'LIVE',gmv:10000000,commission:0,commissionAvailable:true}];
    return route.fulfill({json:{rows,nextCursor:null,complete:true,from:request.from,to:request.to,creator:request.creator,syncedAt:day.syncedAt}});
  });
  const check=(condition,message)=>{if(!condition)throw Error(message);};
  await page.goto('http://127.0.0.1:8787');await page.locator('#appShell').waitFor({state:'visible'});
  await page.evaluate(()=>{state.from=state.to='2026-10-28';renderAll();});
  check((await page.locator('#ovAffiliateGmv').textContent())==='Chưa đồng bộ','Unknown Affiliate falsely shows zero');
  await page.locator('#TAB_OVERVIEW [data-affiliate-sync]').click();
  check(await page.locator('#TAB_OVERVIEW [data-affiliate-sync]').isDisabled(),'Duplicate sync not blocked');
  await page.evaluate(()=>syncTikTokAffiliateOrders());
  await page.waitForFunction(()=>!affiliateSyncInProgress);
  check(calls===2,'Concurrent duplicate request');
  let saved=await page.evaluate(()=>({days:mockDashboard.affiliateDaily,writes:mockWrites,fields:savedFields,value:affiliateOverviewSummary()}));
  check(saved.days.length===3&&saved.value.gmv===1600000,'Affiliate not saved or filtered');
  check(saved.value.commission===12345,'Actual commission was not used');
  await page.evaluate(()=>{document.getElementById('fChannel').value='shopkhangbaby';renderAll();});
  check(await page.evaluate(()=>affiliateOverviewSummary().gmv)===400000,'shopkhangbaby Creator GMV missing');
  await page.evaluate(()=>{document.getElementById('fChannel').value='ALL';renderAll();});
  check(saved.fields.join(',')==='affiliateDaily,lastAffiliateSync','Affiliate changed session finance');
  await page.locator('#TAB_OVERVIEW [data-affiliate-sync]').click();await page.waitForFunction(()=>!affiliateSyncInProgress);
  check(await page.evaluate(()=>affiliateOverviewSummary().gmv)===1600000,'Repeat sync doubles GMV');
  await page.evaluate(()=>{mockFailSave=true;});
  await page.locator('#TAB_OVERVIEW [data-affiliate-sync]').click();await page.waitForFunction(()=>!affiliateSyncInProgress);
  check(await page.evaluate(()=>affiliateOverviewSummary().gmv)===1600000,'Failed save changes displayed GMV');
  await page.evaluate(()=>{mockFailSave=false;switchTab('TAB_TIKTOK_API');});
  mode='missing';await page.locator('#TAB_TIKTOK_API [data-affiliate-sync]').click();await page.waitForFunction(()=>!affiliateSyncInProgress);
  check((await page.locator('#apiStatusGrid').textContent()).includes('2/3 kết nối'),'Creator connections count incorrect');
  check(await page.locator('#tokenGrid > .card').count()===3,'Three independent token cards missing');
  check((await page.locator('#affiliateSyncResult').textContent()).includes('creator.affiliate_collaboration.read'),'Missing scope not explained');
  await page.locator('#liveSyncFrom').fill('2026-01-01');const before=calls;
  await page.locator('#TAB_TIKTOK_API [data-affiliate-sync]').click();await page.waitForFunction(()=>!affiliateSyncInProgress);
  check(calls===before,'Invalid date calls API');
  const widths=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    check(await page.locator('#TAB_TIKTOK_API').evaluate(el=>el.scrollWidth<=el.clientWidth),'API overflows '+width);
    await page.evaluate(()=>{switchTab('TAB_OVERVIEW');document.querySelector('.toast').classList.remove('show');});
    check(await page.locator('#kpiGrid').evaluate(el=>el.scrollWidth<=el.clientWidth),'Overview overflows '+width);
    await page.screenshot({path:'.playwright-cli/affiliate-'+width+'.png',animations:'disabled'});
    widths.push(width);await page.evaluate(()=>switchTab('TAB_TIKTOK_API'));
  }
  check(errors.length===0,errors.join(', '));
  return {saved:true,realGmv:true,actualCommission:true,repeatIdempotent:true,saveFailurePreserved:true,scopeExplained:true,dateValidated:true,widths,errors};
}
