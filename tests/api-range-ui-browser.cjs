async page => {
  await page.context().route('https://www.gstatic.com/firebasejs/**', async route => {
    const url = route.request().url();
    let body = '';
    if (url.endsWith('firebase-app.js')) body = 'export const getApps=()=>[];export const initializeApp=()=>({});';
    if (url.endsWith('firebase-auth.js')) body = `export const getAuth=()=>({});export const browserLocalPersistence={};export const setPersistence=async()=>{};export const onAuthStateChanged=(auth,callback)=>setTimeout(()=>callback({uid:'admin',displayName:'Admin',email:'sellerhunghienhoa@gmail.com',emailVerified:true,getIdToken:async()=>'test-only'}),20);`;
    if (url.endsWith('firebase-firestore.js')) body = `
      const dashboard={sessions:[],affiliateDaily:[]};
      export const getFirestore=()=>({});export const doc=(db,...path)=>path.join('/');export const collection=(db,...path)=>path.join('/');
      export const getDoc=async ref=>({exists:()=>true,data:()=>ref==='production/dashboard'?dashboard:{}});
      export const getDocs=async()=>({docs:[]});export const setDoc=async()=>{};
    `;
    await route.fulfill({contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body});
  });
  await page.route('**/api/tiktok/status', route => route.fulfill({json:{backendReady:true,missingSecrets:[],connections:[]}}));
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:8787',{waitUntil:'domcontentloaded'});
  await page.locator('#appShell').waitFor({state:'visible'});
  await page.evaluate(()=>switchTab('TAB_TIKTOK_API'));
  if (await page.locator('#liveSyncFrom, #liveSyncTo').count()) throw Error('API date picker still exists');
  const note = await page.locator('#TAB_TIKTOK_API .note').textContent();
  if (!note.includes('31 ngày gần nhất')) throw Error('Fixed sync period is not explained');
  const range = await page.evaluate(()=>tiktokSyncWindow());
  if (Date.parse(range.to)-Date.parse(range.from)!==30*86400000) throw Error('Sync window is not 31 inclusive days');
  if (await page.locator('#TAB_TIKTOK_API').evaluate(el=>el.scrollWidth>el.clientWidth)) throw Error('API layout overflows mobile');
  return {datePickerRemoved:true,fixed31DayRange:range,mobileNoOverflow:true};
}
