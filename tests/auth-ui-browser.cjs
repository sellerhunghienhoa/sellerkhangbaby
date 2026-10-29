async page => {
  const base = 'http://127.0.0.1:8787';
  const context = page.context();
  const firebaseModules = [];
  await context.route('https://www.gstatic.com/firebasejs/**', async route => {
    const url = route.request().url();
    firebaseModules.push(url);
    let body = '';
    if (url.endsWith('firebase-app.js')) body = 'export const getApps=()=>[];export const initializeApp=()=>({});';
    if (url.endsWith('firebase-auth.js')) body = `export const getAuth=()=>({});export const browserLocalPersistence={};export const setPersistence=async()=>{if(window.testAuthFailure)throw Error('Simulated offline')};export const onAuthStateChanged=(auth,callback)=>{const user=window.testStaff?{uid:'staff-host',displayName:'Host thử nghiệm',email:'host@example.test',emailVerified:true,getIdToken:async()=>'test-only'}:window.testPending?{uid:'pending-user',displayName:'Tài khoản mới',email:'staff@example.test',emailVerified:true,getIdToken:async()=>'test-only'}:window.testSignedIn?{uid:'ui-admin',displayName:'Quản trị viên',email:'sellerhunghienhoa@gmail.com',emailVerified:true,getIdToken:async()=>'test-only'}:null;setTimeout(()=>callback(user),800)};`;
    if (url.endsWith('firebase-firestore.js')) body = `
      const profile=(id,name,email,role)=>({id,uid:id,name,email,photoURL:'',authProvider:'google',status:'APPROVED',role,joined:'2026-10-01',updatedAt:'2026-10-29T00:00:00Z'});
      const profiles=[profile('staff-host','Host thử nghiệm','host@example.test','HOST'),profile('staff-op','Vận hành thử nghiệm','op@example.test','OPERATOR')];
      const today=()=>{const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10)};
      const staffState=()=>({preset:'30D',from:today().slice(0,8)+'01',to:today(),staffProfiles:profiles,sessions:[{id:'TTLIVE-INTERNAL-ONLY',date:today(),slot:'08:00 - 10:30',channel:'shopkhangbaby',hostId:'staff-host',operatorId:'staff-op',grossLiveGmv:1000000,affiliateGmv:0,pendingRecGmv:1000000,cancelReturnGmv:0,targetGmv:0,shifts:[]}],affiliateDaily:[]});
      export const getFirestore=()=>({});export const doc=(db,...path)=>path.join('/');export const collection=(db,...path)=>path.join('/');
      export const getDoc=async ref=>{if(window.testStaff&&ref==='users/staff-host')return {exists:()=>true,data:()=>profiles[0]};if(window.testStaff&&ref==='production/staffDashboard')return {exists:()=>true,data:staffState};return {exists:()=>true,data:()=>({})}};
      export const getDocs=async ref=>({docs:window.testStaff&&ref==='users'?profiles.map(item=>({id:item.id,data:()=>item})):[]});
      export const setDoc=async()=>{};
    `;
    await route.fulfill({ contentType: 'application/javascript', headers: {'Access-Control-Allow-Origin':'*'}, body });
  });
  await page.route('**/api/tiktok/status', route => route.fulfill({ json: { backendReady:false,missingSecrets:[],connections:[] } }));
  const results = [];
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({width,height:900});
    await page.goto(base, {waitUntil:'domcontentloaded'});
    await page.locator('#bootScreen').waitFor({state:'visible'});
    if (await page.locator('#loginScreen').isVisible() || await page.locator('#appShell').isVisible()) throw Error('App/login flashed during loading');
    await page.locator('#loginScreen').waitFor({state:'visible'});
    if (await page.locator('#bootScreen').isVisible()) throw Error('Loading did not finish');
    const bounds = await page.locator('.login-layout').evaluate(el => ({width:el.scrollWidth,clientWidth:el.clientWidth}));
    if (bounds.width > bounds.clientWidth) throw Error('Login overflows at '+width);
    if (await page.locator('.login-channels').count()) throw Error('Login still exposes channel names');
    if (!await page.locator('#googleLoginBtn').isVisible()) throw Error('Google login missing');
    await page.locator('.brand-logo img').evaluate(img => img.decode());
    const brandImages = await page.locator('img[src*="/assets/brand/"]').evaluateAll(images => images.map(img => ({src:img.currentSrc,loaded:img.complete && img.naturalWidth>0})));
    if (brandImages.some(img => !img.loaded)) throw Error('Brand image did not load');
    await page.screenshot({path:'.playwright-cli/login-'+width+'.png'});
    results.push({width,loading:true,login:true,noOverflow:true,brandImages:true});
  }
  if (firebaseModules.some(url => url.endsWith('firebase-firestore.js'))) throw Error('Logged-out page loads Firestore before authentication');
  await page.addInitScript(() => {window.testSignedIn=true;});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#bootScreen').waitFor({state:'visible'});
  await page.locator('#appShell').waitFor({state:'visible'});
  if (!firebaseModules.some(url => url.endsWith('firebase-firestore.js'))) throw Error('Signed-in user did not load Firestore');
  if (await page.locator('#loginScreen').isVisible()) throw Error('Signed-in user sees login');
  if ((await page.locator('.brand-s').innerText()).includes('shopkhangbaby')) throw Error('Header still exposes channel names');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#bootScreen').waitFor({state:'visible'});
  await page.locator('#appShell').waitFor({state:'visible'});
  await page.addInitScript(() => {window.testSignedIn=false;window.testPending=true;});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#pendingGate').waitFor({state:'visible'});
  if (!await page.locator('body').evaluate(el=>el.classList.contains('pending-account'))) throw Error('Pending account lacks standalone mode');
  for (const selector of ['.hdr','.sidebar','.dock','#toolbar']) {
    if (await page.locator(selector).isVisible()) throw Error('Pending account still shows app chrome: '+selector);
  }
  if (await page.locator('#appContent').isVisible()) throw Error('Pending account can see app data');
  if (await page.evaluate(()=>canAccessTab('TAB_OVERVIEW'))) throw Error('Pending account bypasses tab access control');
  const pendingBounds = await page.locator('#pendingGate').evaluate(el=>({width:el.scrollWidth,clientWidth:el.clientWidth,bottom:el.getBoundingClientRect().bottom,height:innerHeight}));
  if (pendingBounds.width>pendingBounds.clientWidth || pendingBounds.bottom>pendingBounds.height) throw Error('Pending approval UI overflows mobile viewport');
  const pendingStatus = await page.locator('.pending-status').evaluate(el=>({width:el.getBoundingClientRect().width,parentWidth:el.parentElement.getBoundingClientRect().width}));
  if (pendingStatus.width >= pendingStatus.parentWidth * .8) throw Error('Pending status badge is still too wide');
  await page.screenshot({path:'.playwright-cli/pending-account-mobile.png',animations:'disabled'});

  await page.addInitScript(() => {window.testSignedIn=false;window.testPending=false;window.testStaff=true;window.testAuthFailure=false;});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#appShell').waitFor({state:'visible'});
  if (!await page.evaluate(()=>canAccessTab('TAB_OVERVIEW')&&!canAccessTab('TAB_TIKTOK_API'))) throw Error('Staff tab access changed');
  await page.evaluate(()=>switchTab('TAB_SESSIONS'));
  const sessionText=await page.locator('#TAB_SESSIONS').textContent();
  if (!sessionText.includes('2 giờ 30 phút')||sessionText.includes('TTLIVE-INTERNAL-ONLY')) throw Error('Session duration or hidden id is wrong');
  await page.evaluate(()=>switchTab('TAB_STAFF_KPI'));
  if (!(await page.locator('#TAB_STAFF_KPI').textContent()).includes('Tổng giờ LIVE của bạn')) throw Error('Staff total LIVE hours missing');
  if ((await page.locator('.dock .dock-btn:visible').count())!==5) throw Error('Facebook-style five-item dock missing for staff');

  await page.addInitScript(() => {window.testPending=false;window.testStaff=false;window.testAuthFailure=true;});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#bootRetry').waitFor({state:'visible'});
  if (await page.locator('#appShell').isVisible() || await page.locator('#loginScreen').isVisible()) throw Error('Failure reveals empty app');
  return {results,signedInReload:true,pendingStandalone:true,staffData:true,staffHours:true,fiveItemDock:true,errorRetry:true};
}
