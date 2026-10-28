async page => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.context().route('https://www.gstatic.com/firebasejs/**',async route=>{
    const url=route.request().url();let body='';
    if(url.endsWith('firebase-app.js'))body='export const getApps=()=>[];export const initializeApp=()=>({});';
    if(url.endsWith('firebase-auth.js'))body=`export const getAuth=()=>({});export const browserLocalPersistence={};export const setPersistence=async()=>{};export const onAuthStateChanged=(auth,callback)=>{setTimeout(()=>callback({uid:'ui-admin',displayName:'Quản trị viên',email:'sellerhunghienhoa@gmail.com',emailVerified:true,getIdToken:async()=>'test-only'}),100)};`;
    if(url.endsWith('firebase-firestore.js'))body=`window.mockBusinessWrites=0;export const getFirestore=()=>({});export const doc=(db,...path)=>path.join('/');export const collection=(db,...path)=>path.join('/');export const getDoc=async()=>({exists:()=>true,data:()=>({})});export const getDocs=async()=>({docs:[]});export const setDoc=async()=>{};export const writeBatch=()=>({set:()=>{},commit:async()=>{window.mockBusinessWrites++}});`;
    await route.fulfill({contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body});
  });
  await page.route('**/api/tiktok/status',route=>route.fulfill({json:{backendReady:false,missingSecrets:[],connections:[]}}));
  let mode='missing';
  await page.route('**/api/storage/usage',async route=>{
    await new Promise(resolve=>setTimeout(resolve,150));
    if(mode==='error')return route.fulfill({status:503,json:{error:'offline'}});
    const ready=mode==='ready';
    await route.fulfill({json:{checkedAt:'2026-10-28T14:00:00Z',providers:[
      {id:'github',status:'ready',metrics:[{label:'Kho mã nguồn',used:1048576,limit:null},{label:'Tệp Releases',used:2097152,limit:null}]},
      {id:'firebase',status:ready?'ready':'needs_setup',missing:ready?[]:['GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON'],metrics:[{label:'Firestore: dữ liệu và chỉ mục',used:ready?524288:null,limit:1073741824}]},
      {id:'cloudflare',status:ready?'ready':'needs_setup',missing:ready?[]:['CLOUDFLARE_USAGE_API_TOKEN'],metrics:[{label:'KV OAuth của dự án',used:ready?0:null,limit:1000000000}]}
    ]}});
  });
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  await page.goto('http://127.0.0.1:8787');await page.locator('#appShell').waitFor({state:'visible'});
  await page.evaluate(()=>switchTab('TAB_STORAGE'));
  await page.waitForFunction(()=>storageUsageStatus&&!storageUsageLoading);
  check(await page.locator('#stProviders .storage-provider').count()===3,'Missing platform cards');
  check((await page.locator('[data-provider="firebase"]').textContent()).includes('GOOGLE_MONITORING_SERVICE_ACCOUNT_JSON'),'Missing Google setup instruction');
  check(!(await page.locator('[data-provider="firebase"]').textContent()).includes('0%'),'Unknown usage falsely shown as zero');
  check(await page.locator('#nbStorage').textContent()==='—','Unknown quota falsely shown as zero');
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:900});
    const overflow=await page.locator('#stProviders').evaluate(el=>el.scrollWidth>el.clientWidth);
    check(!overflow,'Storage cards overflow '+width);
    check((await page.locator('.storage-summary').boundingBox()).height<220,'Storage header wastes vertical space');
    await page.screenshot({path:'.playwright-cli/storage-usage-'+width+'.png',animations:'disabled'});
  }
  mode='ready';await page.locator('[data-storage-refresh]').first().click();
  check(await page.locator('[data-storage-refresh]').first().isDisabled(),'Refresh can be submitted twice');
  await page.waitForFunction(()=>!storageUsageLoading);
  check((await page.locator('[data-provider="cloudflare"]').textContent()).includes('0 B'),'A measured zero is not displayed');
  check(!(await page.locator('[data-provider="firebase"]').textContent()).includes('Chưa có số liệu'),'Real data missing');
  mode='error';await page.locator('[data-storage-refresh]').first().click();await page.waitForFunction(()=>!storageUsageLoading);
  check((await page.locator('#stUsageStatus').textContent()).includes('lần trước được giữ lại'),'Failure loses previous measurement');
  check(await page.evaluate(()=>mockBusinessWrites)===0,'Usage read writes business state');
  await page.evaluate(()=>{pageHiddenAt=Date.now()-5*60000;void resumeStalePage();});
  check(await page.locator('#TAB_STORAGE').isVisible(),'Short absence reloads');
  const navigation=page.waitForEvent('framenavigated',frame=>frame===page.mainFrame());
  await page.evaluate(()=>{pageHiddenAt=Date.now()-16*60000;void resumeStalePage();});
  await navigation;await page.waitForLoadState('domcontentloaded');await page.locator('#appShell').waitFor({state:'visible'});
  await page.locator('#TAB_OVERVIEW').waitFor({state:'visible'});
  check(await page.locator('#TAB_OVERVIEW').isVisible(),'Long absence did not reload app');
  check(errors.length===0,errors.join(', '));
  return {threeProviders:true,unknownNotZero:true,realZero:true,widths:[320,390,1440],failedRefreshPreservesData:true,noBusinessWrites:true,shortResume:true,longResumeReload:true,errors};
}
