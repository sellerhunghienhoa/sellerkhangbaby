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
    await page.evaluate(()=>{setToolbarCollapsed(false);switchTab('TAB_OVERVIEW');});
    const dateControls = await page.locator('#tbDateSeg').evaluate(seg=>{
      const buttons=[...seg.querySelectorAll('button')];
      const rows=new Set(buttons.map(button=>Math.round(button.getBoundingClientRect().top)));
      const widths=buttons.map(button=>button.getBoundingClientRect().width);
      const heights=buttons.map(button=>button.getBoundingClientRect().height);
      return {
        fits:seg.scrollWidth<=seg.clientWidth,
        oneRow:rows.size===1,
        touchTargets:heights.every(height=>height>=39.5),
        equalWidth:Math.max(...widths)-Math.min(...widths)<2,
        labelsFit:buttons.every(button=>button.scrollWidth<=button.clientWidth),
        heights
      };
    });
    check(dateControls.fits&&dateControls.oneRow&&dateControls.touchTargets&&dateControls.equalWidth&&dateControls.labelsFit,'Date presets are not a balanced single row at '+width+': '+JSON.stringify(dateControls));
    check(!await page.locator('#rangeChip').isVisible(),'Preset date summary should stay hidden on mobile');
    await page.evaluate(()=>{state.preset='CUSTOM';state.from='2026-10-01';state.to='2026-10-07';syncPresetUI();});
    check(await page.locator('#rangeChip').isVisible(),'Custom date summary is missing on mobile');
    check(await page.locator('#rangeChip').evaluate(el=>el.getBoundingClientRect().right<=innerWidth&&el.scrollWidth<=el.clientWidth),'Custom date summary is clipped at '+width);
    await page.evaluate(()=>setPreset('30D'));
    const before = await bounds();
    check(!before.overflow,'Page overflow at '+width);
    check(before.header.left===0 && before.header.right===width,'Header not full width');
    check(before.dock.left===0 && before.dock.right===width && before.dock.bottom===height,'Full-width dock placement failed');
    check(await page.locator('.dock-btn:visible').count()===5,'Must have exactly five items');
    const buttons = await page.locator('.dock-btn').evaluateAll(buttons=>buttons.map(b=>({height:b.clientHeight,fits:b.scrollWidth<=b.clientWidth,labelFits:b.querySelector('span').scrollWidth<=b.clientWidth})));
    check(buttons.every(b=>b.height>=44&&b.fits&&b.labelFits),'Nav touch targets/labels fail at '+width);
    const mobileControls = await page.locator('input:visible,select:visible,textarea:visible').evaluateAll(elements=>elements.map(el=>parseFloat(getComputedStyle(el).fontSize)));
    check(mobileControls.every(size=>size>=16),'A form field can still trigger iOS focus zoom at '+width);
    const zoomPolicy = await page.evaluate(()=>({touch:getComputedStyle(document.documentElement).touchAction,viewport:document.querySelector('meta[name="viewport"]').content}));
    check(zoomPolicy.touch==='manipulation','Double-tap zoom protection missing');
    check(!/maximum-scale|user-scalable/i.test(zoomPolicy.viewport),'Pinch zoom was disabled');
    await page.locator('#view').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=160;el.dispatchEvent(new Event('scroll'));});
    await page.waitForTimeout(50);
    check(await page.locator('#toolbar').evaluate(el=>el.classList.contains('is-collapsed')),'Date toolbar did not auto-collapse while scrolling down');
    await page.locator('#view').evaluate(el=>{el.scrollTop=80;el.dispatchEvent(new Event('scroll'));});
    await page.waitForTimeout(50);
    check(!await page.locator('#toolbar').evaluate(el=>el.classList.contains('is-collapsed')),'Date toolbar did not expand while scrolling up');
    await page.evaluate(()=>setToolbarCollapsed(true));
    await page.locator('#view').evaluate(el=>{el.scrollTop=el.scrollHeight;});
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
    results.push({width,height,scroll:true,fiveTabs:true,drawer:true,filters:true,noFocusZoom:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{
    for(const [side,value] of Object.entries({top:47,bottom:34,left:0,right:0}))document.documentElement.style.setProperty('--safe-'+side,value+'px');
    switchTab('TAB_OVERVIEW');
  });
  let safe = await bounds();
  check(safe.header.height>=107&&safe.dock.bottom===safe.height&&safe.dock.height>=96,'Safe areas not reserved');
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
