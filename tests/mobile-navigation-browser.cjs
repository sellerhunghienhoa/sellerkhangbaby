async page => {
  const errors = [];
  const compatibilityWarnings = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type()!=='error') return;
    // Safari ignores this Chrome keyboard-resizing hint in the viewport meta tag.
    if (message.text()==='Viewport argument key "interactive-widget" not recognized and ignored.') compatibilityWarnings.add(message.text());
    else errors.push(message.text());
  });
  await page.context().route('https://www.gstatic.com/firebasejs/**', async route => {
    const url = route.request().url();
    let body = '';
    if (url.endsWith('firebase-app.js')) body = 'export const getApps=()=>[];export const initializeApp=()=>({});';
    if (url.endsWith('firebase-auth.js')) body = `export const getAuth=()=>({});export const browserLocalPersistence={};export const setPersistence=async()=>{};export const onAuthStateChanged=(auth,callback)=>{setTimeout(()=>callback({uid:'ui-admin',displayName:'Quản trị viên',email:'sellerhunghienhoa@gmail.com',emailVerified:true,getIdToken:async()=>'test-only'}),100)};`;
    if (url.endsWith('firebase-firestore.js')) body = `export const getFirestore=()=>({});export const doc=(db,...path)=>path.join('/');export const collection=(db,...path)=>path.join('/');export const getDoc=async()=>({exists:()=>true,data:()=>({})});export const getDocs=async()=>({docs:[]});export const setDoc=async()=>{};export const writeBatch=()=>({set:()=>{},commit:async()=>{}});`;
    await route.fulfill({contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body});
  });
  await page.route('**/api/tiktok/status', route => route.fulfill({json:{backendReady:false,missingSecrets:[],connections:[]}}));
  await page.goto('http://127.0.0.1:8787');
  await page.locator('#appShell').waitFor({state:'visible'});
  const check = (condition, message) => { if (!condition) throw Error(message); };
  const bounds = () => page.evaluate(() => {
    const rect = selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};
    };
    return {header:rect('.hdr'),dock:rect('.dock'),view:rect('.view'),width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  const results = [];
  for (const [width,height] of [[320,700],[390,844],[430,932],[768,1024],[844,390]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(()=>switchTab('TAB_OVERVIEW'));
    const before = await bounds();
    check(!before.overflow,'Page overflow at '+width);
    check(before.header.left===0 && before.header.right===width,'Header not full width');
    check(before.dock.left===0 && before.dock.right===width && before.dock.bottom===height,'Dock not at viewport bottom');
    check(Math.abs(before.view.bottom-before.dock.top)<1,'Content and dock overlap');
    check(await page.locator('.dock-btn:visible').count()===5,'Must have exactly five items');
    const buttons = await page.locator('.dock-btn').evaluateAll(buttons=>buttons.map(b=>({height:b.clientHeight,fits:b.scrollWidth<=b.clientWidth,labelFits:b.querySelector('span').scrollWidth<=b.clientWidth})));
    check(buttons.every(b=>b.height>=44&&b.fits&&b.labelFits),'Nav touch targets/labels fail at '+width);
    await page.locator('#view').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=el.scrollHeight;});
    const after = await bounds();
    check(JSON.stringify(before.header)===JSON.stringify(after.header)&&JSON.stringify(before.dock)===JSON.stringify(after.dock),'Bars move on scroll');
    const end = await page.locator('#TAB_OVERVIEW').evaluate(el=>el.getBoundingClientRect().bottom);
    check(end<=after.dock.top,'Last content hidden under dock');
    for (const tab of ['TAB_SESSIONS','TAB_STAFF_KPI','TAB_MANUAL_KPI','TAB_EXPORT','TAB_OVERVIEW']) {
      await page.locator('.dock-btn[data-tab="'+tab+'"]').click();
      check(await page.locator('#'+tab).isVisible(),'Tab not selected: '+tab);
      check(await page.locator('.dock-btn[aria-current="page"]').getAttribute('data-tab')===tab,'Selected state out of sync');
      check(await page.locator('#view').evaluate(el=>el.scrollTop)===0,'Tab retains previous scroll');
    }
    await page.evaluate(()=>setToolbarCollapsed(true));
    const chips = await page.locator('.tb-sum-chip:visible').evaluateAll(chips=>chips.map(chip=>({left:chip.getBoundingClientRect().left,right:chip.getBoundingClientRect().right,overflows:chip.scrollWidth>chip.clientWidth})));
    check(chips.every(c=>c.left>=0&&c.right<=width&&!c.overflows),'Filter summary clipped at '+width);
    await page.locator('.toast').evaluate(el=>el.classList.remove('show'));
    await page.mouse.move(0,0);
    await page.screenshot({path:'.playwright-cli/mobile-nav-'+width+'.png',animations:'disabled'});
    await page.locator('.dock-btn[data-tab="TAB_STAFF_KPI"]').click();
    check(await page.locator('#tbChipDate').evaluate(el=>el.scrollWidth<=el.clientWidth),'Monthly filter clipped at '+width);
    await page.locator('#btnMenu').click();
    check(await page.locator('.main').evaluate(el=>el.inert),'Background remains interactive with drawer open');
    check(await page.locator('.dock').evaluate(el=>el.inert),'Dock remains interactive with drawer open');
    check(await page.locator('#sidebar').getAttribute('aria-modal')==='true','Drawer lacks modal state');
    await page.keyboard.press('Escape');
    check(await page.locator('#btnMenu').evaluate(el=>document.activeElement===el),'Drawer does not restore focus');
    check(!await page.locator('.main').evaluate(el=>el.inert),'Closing drawer blocks app');
    await page.locator('#btnMenu').click();
    await page.locator('.sidebar-close').click();
    await page.locator('#btnMenu').click();
    await page.locator('#sidebar [data-tab="TAB_TIKTOK_API"]').click();
    check(await page.locator('#TAB_TIKTOK_API').isVisible(),'Drawer link did not navigate');
    check(await page.locator('.dock-btn[aria-current]').count()===0,'Non-dock page shows wrong active tab');
    await page.evaluate(()=>setToolbarCollapsed(false));
    results.push({width,height,scroll:true,fiveTabs:true,drawer:true,filters:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{
    for(const [side,value] of Object.entries({top:47,bottom:34,left:0,right:0}))document.documentElement.style.setProperty('--safe-'+side,value+'px');
    switchTab('TAB_OVERVIEW');
  });
  let safe = await bounds();
  check(safe.header.height>=107&&safe.dock.height===99,'Safe areas not reserved');
  check(safe.view.bottom===safe.dock.top,'Safe area content overlap');
  check(await page.locator('#tbDateSeg').evaluate(el=>el.scrollWidth<=el.clientWidth),'Date preset buttons clipped');
  await page.locator('.toast').evaluate(el=>el.classList.remove('show'));
  await page.screenshot({path:'.playwright-cli/mobile-nav-safe-area.png',animations:'disabled'});
  await page.locator('[aria-label="Thông báo"]').click();
  check(await page.locator('#ddNotif').isVisible(),'Notification dropdown failed');
  await page.locator('[aria-label="Tài khoản"]').click();
  check(await page.locator('#ddUser').isVisible(),'Account dropdown failed');
  await page.locator('#btnMenu').click();
  await page.screenshot({path:'.playwright-cli/mobile-nav-drawer.png',animations:'disabled'});
  await page.setViewportSize({width:1440,height:900});
  await page.waitForFunction(()=>!document.getElementById('sidebar').inert&&!document.querySelector('.main').inert);
  check(!await page.locator('.dock').isVisible(),'Desktop shows mobile dock');
  check(!await page.locator('#scrim').evaluate(el=>el.classList.contains('show')),'Resize leaves scrim');
  await page.screenshot({path:'.playwright-cli/mobile-nav-desktop.png',animations:'disabled'});
  check(errors.length===0,'Browser errors: '+errors.join(', '));
  return {results,safeAreas:true,dropdowns:true,desktop:true,errors,compatibilityWarnings:[...compatibilityWarnings]};
}
