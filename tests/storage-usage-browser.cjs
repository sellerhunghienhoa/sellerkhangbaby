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
  let mode='missing',savedPolicy=null,cleanupIds=null;
  await page.route('**/api/storage/settings',async route=>{savedPolicy=route.request().postDataJSON();await route.fulfill({json:{policy:savedPolicy}});});
  await page.route('**/api/storage/cleanup',async route=>{cleanupIds=route.request().postDataJSON().ids;await route.fulfill({json:{deleted:1,freedBytes:3145728,protectedDays:90,history:[]}});});
  await page.route('**/api/storage/usage*',async route=>{
    if(mode==='ready')check(new URL(route.request().url()).searchParams.get('refresh')==='1','Manual refresh did not bypass server cache');
    await new Promise(resolve=>setTimeout(resolve,500));
    if(mode==='error')return route.fulfill({status:503,json:{error:'offline'}});
    const ready=mode==='ready';
    await route.fulfill({json:{checkedAt:'2026-10-28T14:00:00Z',providers:[
      {id:'github',status:'ready',metrics:[{id:'repository',label:'Kho mã nguồn',used:1048576,limit:null},{id:'releases',label:'Tệp Releases',used:2097152,limit:null}]},
      {id:'firebase',status:ready?'ready':'needs_setup',missing:ready?[]:['Đăng nhập lại bằng tài khoản Admin'],source:ready?'Firestore REST · quyền Admin':'',metrics:[{id:'firestore',label:'Firestore: dữ liệu và chỉ mục',used:ready?524288:null,limit:1073741824}]},
      {id:'cloudflare',status:ready?'ready':'needs_setup',missing:ready?[]:['TIKTOK_OAUTH_KV binding'],source:ready?'Cloudflare bindings':'',metrics:[{id:'kv',label:'KV OAuth của dự án',used:ready?0:null,limit:1000000000},{id:'assets',label:'Website đã triển khai',used:ready?2097152:null,limit:null}]}
    ],management:{policy:{retentionDays:90,threshold:85,autoFree:true},protectedDays:60,providers:[
      {id:'github',supported:true,cleanupMode:'automatic',missing:[],items:[{id:'old-1',kind:'artifact',provider:'github',label:'workflow-old',sizeBytes:3145728,date:'2026-06-01T00:00:00Z',eligible:true}]},
      {id:'firebase',supported:false,cleanupMode:'monitor_only',missing:['Dữ liệu nghiệp vụ được bảo vệ'],items:[]},
      {id:'cloudflare',supported:false,cleanupMode:'monitor_only',missing:['KV chứa cấu hình và token TikTok được bảo vệ'],items:[]}
    ],history:[{label:'workflow-older',sizeBytes:1048576,at:'2026-10-20T00:00:00Z'}]}}});
  });
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  await page.goto('http://127.0.0.1:8787');await page.locator('#appShell').waitFor({state:'visible'});
  await page.evaluate(()=>switchTab('TAB_STORAGE'));
  await page.waitForFunction(()=>storageUsageStatus&&!storageUsageLoading);
  check(await page.locator('#stProviders .storage-provider').count()===3,'Missing platform cards');
  check((await page.locator('[data-provider="firebase"]').textContent()).includes('Đăng nhập lại bằng tài khoản Admin'),'Missing Firebase fallback instruction');
  check(!(await page.locator('[data-provider="firebase"]').textContent()).includes('0%'),'Unknown usage falsely shown as zero');
  check(await page.locator('#nbStorage').isHidden(),'Unknown quota badge is visible');
  check(await page.locator('#sbQuotaMini').isHidden(),'Empty sidebar quota card is visible');
  check(await page.getByText('Dọn nhanh').count()===0,'Fake cleanup action remains visible');
  check(await page.locator('#stCleanupCandidates,#stHistory,#stRetRange').count()===3,'Original storage management layout is incomplete');
  check(await page.locator('#stAutoFree').isChecked(),'Automatic cleanup setting was not restored');
  check((await page.locator('#stCleanupCandidates').textContent()).includes('workflow-old'),'Eligible technical cleanup item is missing');
  await page.evaluate(()=>{storageUsageStatus.management.providers[0].items=[];renderStorageManagement();});
  check((await page.locator('#stCleanupCandidates').textContent()).includes('Chỉ giám sát'),'Monitor-only providers are mislabeled as missing configuration');
  check(!(await page.locator('#stCleanupCandidates').textContent()).includes('Cần cấu hình'),'Configured monitor-only providers still look broken');
  await page.evaluate(()=>{storageUsageStatus.management.providers[0].items=[{id:'old-1',kind:'artifact',provider:'github',label:'workflow-old',sizeBytes:3145728,date:'2026-06-01T00:00:00Z',eligible:true}];renderStorageManagement();});
  check(!(await page.locator('#TAB_STORAGE').textContent()).includes('Actions artifacts'),'Unmeasured reference quota remains visible');
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:900});
    const overflow=await page.locator('#stProviders').evaluate(el=>el.scrollWidth>el.clientWidth);
    check(!overflow,'Storage cards overflow '+width);
    check(await page.locator('.storage-management-grid').count()===1,'Original management layout is missing');
    if(width===1440){
      const cards=await page.locator('#stProviders article').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));
      check(new Set(cards).size===1,'Provider cards are not in the original three-column row');
      check(!await page.locator('.sidebar-close').isVisible(),'Desktop shows mobile drawer close icon');
    }
    await page.screenshot({path:'.playwright-cli/storage-usage-'+width+'.png',animations:'disabled'});
  }
  mode='ready';await page.locator('[data-storage-refresh]').first().click();
  const refreshState=await page.evaluate(()=>({loading:storageUsageLoading,disabled:document.querySelector('[data-storage-refresh]')?.disabled,status:document.querySelector('#stUsageStatus')?.textContent}));
  check(refreshState.disabled,'Refresh can be submitted twice: '+JSON.stringify(refreshState));
  await page.waitForFunction(()=>!storageUsageLoading);
  check((await page.locator('[data-provider="cloudflare"]').textContent()).includes('0 B'),'A measured zero is not displayed');
  check((await page.locator('[data-provider="cloudflare"]').textContent()).includes('2 MiB'),'Deployed website size is missing');
  check((await page.locator('[data-provider="firebase"]').textContent()).includes('512 KiB'),'Real data missing');
  await page.locator('#stAutoFree').click();await page.waitForFunction(()=>!storagePolicySaving);
  check(savedPolicy?.autoFree===false&&savedPolicy.retentionDays===90&&savedPolicy.threshold===85,'Automatic cleanup policy was not persisted');
  await page.locator('#btnStorageCleanup').click();await page.waitForFunction(()=>!storageUsageLoading);
  check(cleanupIds?.includes('artifact:old-1'),'Selected cleanup item was not sent to the Worker');
  mode='error';await page.locator('[data-storage-refresh]').first().click();await page.waitForFunction(()=>!storageUsageLoading);
  check((await page.locator('#stUsageStatus').textContent()).includes('lần trước được giữ lại'),'Failure loses previous measurement');
  await page.evaluate(()=>{
    storageUsageStatus.providers.find(p=>p.id==='firebase').metrics[0].used=1000000000;
    renderStorage();
  });
  const warning=await page.locator('#stAlert').textContent();
  check(warning.includes('93%')&&warning.includes('GiB'),'Measured quota alert missing or uses wrong units');
  check(!warning.includes('undefined')&&!warning.includes('giải phóng ngay'),'Alert fabricates quota or cleanup ability');
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
