async page => {
  const base = 'http://127.0.0.1:8787';
  await page.context().route('https://www.gstatic.com/firebasejs/**', async route => {
    const url = route.request().url();
    let body = '';
    if (url.endsWith('firebase-app.js')) body = 'export const getApps=()=>[];export const initializeApp=()=>({});';
    if (url.endsWith('firebase-auth.js')) body = `export const getAuth=()=>({});export const browserLocalPersistence={};export const setPersistence=async()=>{};export const onAuthStateChanged=(auth,callback)=>{setTimeout(()=>callback({uid:'ui-admin',displayName:'Quản trị viên',email:'sellerhunghienhoa@gmail.com',emailVerified:true,getIdToken:async()=>'test-only'}),100)};`;
    if (url.endsWith('firebase-firestore.js')) body = `
      window.mockDashboard={sessions:[]};window.mockWrites=0;window.mockFailSave=false;
      export const getFirestore=()=>({});export const doc=(db,...path)=>path.join('/');export const collection=(db,...path)=>path.join('/');
      export const getDoc=async ref=>({exists:()=>true,data:()=>ref==='production/dashboard'?window.mockDashboard:{}});
      export const getDocs=async()=>({docs:[]});export const setDoc=async()=>{};
      export const runTransaction=async(db,callback)=>{if(window.mockFailSave)throw Error('SAVE_FAILED');let update;const result=await callback({get:getDoc,update:(ref,data)=>{update=data}});Object.assign(window.mockDashboard,update);window.mockWrites++;return result;};`;
    await route.fulfill({contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body});
  });
  await page.route('**/api/tiktok/status', route => route.fulfill({json:{backendReady:true,connections:[],missingSecrets:[]}}));
  await page.route('**/api/tiktok/live/core-stats', async route => {
    const input=route.request().postDataJSON();
    return route.fulfill({json:{creator:input.creator,rows:input.liveIds.map(liveId=>({liveId,creatorReportedGmv:1400000}))}});
  });
  let mode='success', calls=0;
  await page.route('**/api/tiktok/live/sync', async route => {
    calls++;
    if(mode==='missing') return route.fulfill({status:409,json:{error:'TIKTOK_SELLER_NOT_CONNECTED'}});
    await new Promise(resolve=>setTimeout(resolve,200));
    return route.fulfill({json:{sessions:[{id:'TTLIVE-99-123',tiktokLiveId:'123',tiktokShopId:'99',channel:'shopkhangbaby',date:'2026-10-28',slot:'10:00 - 11:00',title:'Phiên thử',tiktokReportedGmv:1000000,source:'TIKTOK_API',currency:'VND'}],ignored:0,syncedAt:'2026-10-28T12:00:00Z'}});
  });
  await page.goto(base);
  await page.locator('#appShell').waitFor({state:'visible'});
  await page.evaluate(()=>switchTab('TAB_TIKTOK_API'));
  const button=page.locator('#TAB_TIKTOK_API [data-live-sync]');
  await button.click();
  await page.waitForFunction(()=>liveSyncInProgress);
  if(!await button.isDisabled())throw Error('Sync button not locked');
  await page.evaluate(()=>syncTikTokLiveSessions());
  await page.waitForFunction(()=>!liveSyncInProgress);
  let saved=await page.evaluate(()=>({data:mockDashboard.sessions,writes:mockWrites,message:document.getElementById('liveSyncResult').textContent}));
  if(calls!==1||saved.writes!==1||saved.data.length!==1||saved.data[0].grossLiveGmv!==1000000||saved.data[0].affiliateGmv!==400000||saved.data[0].pendingRecGmv!==1400000)throw Error('First sync failed');
  await page.evaluate(()=>{mockDashboard.sessions[0].hostId='keep-host';mockDashboard.sessions[0].pendingRecGmv=100;mockDashboard.sessions[0].orderReconciliationManaged=true;mockDashboard.sessions[0].orderSync={verified:true};});
  await button.click();
  await page.waitForFunction(()=>!liveSyncInProgress);
  saved=await page.evaluate(()=>({data:mockDashboard.sessions,writes:mockWrites}));
  if(saved.data.length!==1||saved.data[0].hostId!=='keep-host'||saved.data[0].pendingRecGmv!==100)throw Error('Repeated sync changed reconciliation');
  const before=JSON.stringify(saved.data);
  await page.evaluate(()=>{mockFailSave=true;});
  await button.click();
  await page.waitForFunction(()=>!liveSyncInProgress);
  if(JSON.stringify(await page.evaluate(()=>mockDashboard.sessions))!==before)throw Error('Failed save changed data');
  mode='missing';
  await button.click();
  await page.waitForFunction(()=>!liveSyncInProgress);
  if(!(await page.locator('#liveSyncResult').textContent()).includes('Kết nối Seller'))throw Error('Missing Seller error unclear');
  await page.locator('#liveSyncFrom').fill('2026-01-01');
  const callsBefore=calls;
  await button.click();
  await page.waitForFunction(()=>!liveSyncInProgress);
  if(calls!==callsBefore)throw Error('Invalid date called API');
  const widths=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    const overflow=await page.locator('#TAB_TIKTOK_API').evaluate(el=>el.scrollWidth>el.clientWidth);
    if(overflow)throw Error('API layout overflows at '+width);
    await page.screenshot({path:'.playwright-cli/live-sync-'+width+'.png'});
    widths.push(width);
  }
  return {success:true,doubleClickBlocked:true,deduplicated:true,reconciliationPreserved:true,saveFailurePreservedData:true,missingSellerExplained:true,dateRangeValidated:true,widths};
}
