async page => {
  await page.context().route('https://www.gstatic.com/firebasejs/**', async route => {
    const url = route.request().url();
    let body = '';
    if (url.endsWith('firebase-app.js')) {
      body = 'export const getApps=()=>[];export const initializeApp=()=>({});';
    }
    if (url.endsWith('firebase-auth.js')) {
      body = `export const getAuth=()=>({});export const browserLocalPersistence={};export const setPersistence=async()=>{};export const onAuthStateChanged=(auth,callback)=>setTimeout(()=>callback({uid:'removed-user',displayName:'Tài khoản đã xóa',email:'removed@example.test',emailVerified:true,getIdToken:async()=>'test-only'}),20);`;
    }
    if (url.endsWith('firebase-firestore.js')) {
      body = `
        const removed={id:'removed-user',uid:'removed-user',name:'Tài khoản đã xóa',email:'removed@example.test',photoURL:'',authProvider:'google',status:'REMOVED',role:'',joined:'2026-10-29'};
        export const getFirestore=()=>({});
        export const doc=(db,...path)=>path.join('/');
        export const collection=(db,...path)=>path.join('/');
        export const getDoc=async ref=>ref==='users/removed-user'?{exists:()=>true,data:()=>removed}:{exists:()=>false,data:()=>({})};
        export const getDocs=async()=>({docs:[]});
        export const setDoc=async()=>{window.removedProfileWasRecreated=true;};
      `;
    }
    await route.fulfill({ contentType:'application/javascript', headers:{'Access-Control-Allow-Origin':'*'}, body });
  });
  await page.route('**/api/tiktok/status', route => route.fulfill({json:{backendReady:false,missingSecrets:[],connections:[]}}));
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:8787',{waitUntil:'domcontentloaded'});
  await page.locator('#pendingGate').waitFor({state:'visible'});
  const status = await page.locator('#pendingGateStatus').textContent();
  const title = await page.locator('#pendingGateTitle').textContent();
  if (!status.includes('Yêu cầu đã bị xóa')) throw Error('Removed status is not shown');
  if (!title.includes('chưa được cấp quyền')) throw Error('Removed account title is incorrect');
  if (await page.locator('#appContent').isVisible()) throw Error('Removed account can still see app data');
  if (await page.evaluate(() => window.removedProfileWasRecreated === true)) throw Error('Removed profile was recreated as pending');
  if (await page.evaluate(() => canAccessTab('TAB_OVERVIEW'))) throw Error('Removed account bypasses access control');
  return {removedStatus:true,appDataBlocked:true,pendingNotRecreated:true,mobile:true};
}
