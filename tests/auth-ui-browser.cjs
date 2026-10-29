async page => {
  const base = 'http://127.0.0.1:8787';
  const context = page.context();
  await context.route('https://www.gstatic.com/firebasejs/**', async route => {
    const url = route.request().url();
    let body = '';
    if (url.endsWith('firebase-app.js')) body = 'export const getApps=()=>[];export const initializeApp=()=>({});';
    if (url.endsWith('firebase-auth.js')) body = `export const getAuth=()=>({});export const browserLocalPersistence={};export const setPersistence=async()=>{if(window.testAuthFailure)throw Error('Simulated offline')};export const onAuthStateChanged=(auth,callback)=>{const user=window.testPending?{uid:'pending-user',displayName:'Tài khoản mới',email:'staff@example.test',emailVerified:true,getIdToken:async()=>'test-only'}:window.testSignedIn?{uid:'ui-admin',displayName:'Quản trị viên',email:'sellerhunghienhoa@gmail.com',emailVerified:true,getIdToken:async()=>'test-only'}:null;setTimeout(()=>callback(user),800)};`;
    if (url.endsWith('firebase-firestore.js')) body = `export const getFirestore=()=>({});export const doc=(db,...path)=>path.join('/');export const collection=(db,...path)=>path.join('/');export const getDoc=async()=>({exists:()=>true,data:()=>({})});export const getDocs=async()=>({docs:[]});export const setDoc=async()=>{};`;
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
    if (!await page.locator('#googleLoginBtn').isVisible()) throw Error('Google login missing');
    await page.locator('.brand-logo img').evaluate(img => img.decode());
    const brandImages = await page.locator('img[src*="/assets/brand/"]').evaluateAll(images => images.map(img => ({src:img.currentSrc,loaded:img.complete && img.naturalWidth>0})));
    if (brandImages.some(img => !img.loaded)) throw Error('Brand image did not load');
    await page.screenshot({path:'.playwright-cli/login-'+width+'.png'});
    results.push({width,loading:true,login:true,noOverflow:true,brandImages:true});
  }
  await page.addInitScript(() => {window.testSignedIn=true;});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#bootScreen').waitFor({state:'visible'});
  await page.locator('#appShell').waitFor({state:'visible'});
  if (await page.locator('#loginScreen').isVisible()) throw Error('Signed-in user sees login');
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
  await page.screenshot({path:'.playwright-cli/pending-account-mobile.png',animations:'disabled'});
  await page.addInitScript(() => {window.testPending=false;window.testAuthFailure=true;});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#bootRetry').waitFor({state:'visible'});
  if (await page.locator('#appShell').isVisible() || await page.locator('#loginScreen').isVisible()) throw Error('Failure reveals empty app');
  return {results,signedInReload:true,pendingStandalone:true,errorRetry:true};
}
