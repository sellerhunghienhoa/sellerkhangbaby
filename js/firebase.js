/**
 * Firebase production adapter.
 * Authentication and Firestore are the source of truth in production.
 */

let productionFirebaseContextPromise = null;
let productionFirebaseUser = null;
let productionBackendReady = false;
let productionSaveTimer = null;
let productionWriteChain = Promise.resolve();

function enqueueProductionWrite(action) {
  const write = productionWriteChain.catch(() => {}).then(action);
  productionWriteChain = write;
  return write;
}

function writeProductionState() {
  return enqueueProductionWrite(async () => {
    if (!productionBackendReady || !isProductionAdmin()) throw new Error('AUTH_REQUIRED');
    const fb = await getProductionFirebaseContext();
    const batch = fb.writeBatch(fb.db);
    batch.set(fb.doc(fb.db, 'production', 'dashboard'), cleanProductionState(state));
    state.users.forEach(profile => {
      if (profile.id) batch.set(fb.doc(fb.db, 'users', profile.id), profileForFirestore(profile), { merge: true });
    });
    await batch.commit();
  });
}

async function saveProductionLiveSessions(incoming, syncedAt) {
  if (!productionBackendReady || !isProductionAdmin()) throw new Error('AUTH_REQUIRED');
  if (productionSaveTimer) {
    clearTimeout(productionSaveTimer);
    productionSaveTimer = null;
    await writeProductionState();
  }
  return enqueueProductionWrite(async () => {
    if (!productionBackendReady || !isProductionAdmin()) throw new Error('AUTH_REQUIRED');
    const fb = await getProductionFirebaseContext();
    const ref = fb.doc(fb.db, 'production', 'dashboard');
    const saved = await fb.runTransaction(fb.db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('DASHBOARD_NOT_FOUND');
      const merged = mergeTikTokLiveSessions(snapshot.data().sessions || [], incoming);
      transaction.update(ref, { sessions: merged.sessions, lastLiveSync: syncedAt });
      return merged;
    });
    state.sessions = saved.sessions;
    state.lastLiveSync = syncedAt;
    return saved;
  });
}

async function saveProductionAffiliateDays(incoming, syncedAt) {
  if (!productionBackendReady || !isProductionAdmin()) throw new Error('AUTH_REQUIRED');
  if (productionSaveTimer) {
    clearTimeout(productionSaveTimer);
    productionSaveTimer = null;
    await writeProductionState();
  }
  return enqueueProductionWrite(async () => {
    if (!productionBackendReady || !isProductionAdmin()) throw new Error('AUTH_REQUIRED');
    const fb = await getProductionFirebaseContext();
    const ref = fb.doc(fb.db,'production','dashboard');
    const saved = await fb.runTransaction(fb.db,async transaction=>{
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('DASHBOARD_NOT_FOUND');
      const data = snapshot.data();
      const affiliateDaily = mergeAffiliateDays(data.affiliateDaily || [],incoming);
      if (new TextEncoder().encode(JSON.stringify({...data,affiliateDaily})).byteLength>900000) throw new Error('TIKTOK_AFFILIATE_STORAGE_LIMIT');
      transaction.update(ref,{affiliateDaily,lastAffiliateSync:syncedAt});
      return affiliateDaily;
    });
    state.affiliateDaily=saved;
    state.lastAffiliateSync=syncedAt;
  });
}

async function saveProductionSellerSnapshot(data) {
  if(!productionBackendReady||!isProductionAdmin())throw new Error('AUTH_REQUIRED');
  if(productionSaveTimer){clearTimeout(productionSaveTimer);productionSaveTimer=null;await writeProductionState();}
  return enqueueProductionWrite(async()=>{
    if(!productionBackendReady||!isProductionAdmin())throw new Error('AUTH_REQUIRED');
    const fb=await getProductionFirebaseContext();
    const dashboard=fb.doc(fb.db,'production','dashboard');
    const current=await fb.getDoc(dashboard);if(!current.exists())throw new Error('DASHBOARD_NOT_FOUND');
    const originalSessions=JSON.stringify(current.data().sessions||[]);
    const prepared=prepareSellerSnapshot(current.data().sessions||[],data.orders,data.returns,data.from,data.to,data.syncedAt);
    const dates=sellerRangeDates(data.from,data.to),version=crypto.randomUUID();
    const snapshots=[],indexes=[];
    for(const date of dates){
      const records=[...prepared.orders.filter(row=>row.date===date).map(value=>({kind:'order',value})),...prepared.returns.filter(row=>row.returnDate===date).map(value=>({kind:'return',value}))];
      const chunks=[];
      for(let offset=0;offset<records.length;offset+=100){
        const id=date+'-'+version+'-'+offset/100,group=records.slice(offset,offset+100);
        const chunk={owner:'seller-order-sync',importId:version,date,syncedAt:data.syncedAt,orders:group.filter(item=>item.kind==='order').map(item=>item.value),returns:group.filter(item=>item.kind==='return').map(item=>item.value)};
        if(new TextEncoder().encode(JSON.stringify(chunk)).byteLength>800000)throw new Error('TIKTOK_ORDERS_SNAPSHOT_LIMIT');
        snapshots.push({id,chunk});chunks.push(id);
      }
      indexes.push({date,chunks,syncedAt:data.syncedAt,importId:version});
    }
    const chunkRef=id=>fb.doc(fb.db,'production','sellerOrderSnapshots','chunks',id);
    const indexRef=date=>fb.doc(fb.db,'production','sellerOrderDays','days',date);
    const cleanup=async ids=>{
      for(let offset=0;offset<ids.length;offset+=10){
        const batch=fb.writeBatch(fb.db);let count=0;
        for(const id of ids.slice(offset,offset+10)){
          if(!/^\d{4}-\d{2}-\d{2}-[0-9a-f-]{36}-\d+$/.test(id))continue;
          const chunk=await fb.getDoc(chunkRef(id));
          if(chunk.exists()&&chunk.data().owner==='seller-order-sync'){batch.delete(chunkRef(id));count++;}
        }
        if(count)await batch.commit();
      }
    };
    let saved;
    try{
      // Stage immutable chunks in bounded batches; readers only follow the published manifests.
      for(let offset=0;offset<snapshots.length;offset+=10){
        const batch=fb.writeBatch(fb.db);
        snapshots.slice(offset,offset+10).forEach(({id,chunk})=>batch.set(chunkRef(id),chunk));
        await batch.commit();
      }
      saved=await fb.runTransaction(fb.db,async transaction=>{
        const latest=await transaction.get(dashboard);
        if(!latest.exists())throw new Error('DASHBOARD_NOT_FOUND');
        if(JSON.stringify(latest.data().sessions||[])!==originalSessions)throw new Error('TIKTOK_ORDERS_STATE_CHANGED');
        if(new TextEncoder().encode(JSON.stringify({...latest.data(),sessions:prepared.sessions})).byteLength>900000)throw new Error('TIKTOK_ORDERS_SNAPSHOT_LIMIT');
        const old=[];
        for(const index of indexes)old.push(await transaction.get(indexRef(index.date)));
        const obsolete=[];
        indexes.forEach((index,i)=>{
          const previous=old[i].exists()?old[i].data():{};
          obsolete.push(...(previous.previousChunks||[]));
          transaction.set(indexRef(index.date),{...index,previousChunks:previous.chunks||[]});
        });
        transaction.update(dashboard,{sessions:prepared.sessions,lastOrderSync:data.syncedAt});
        return {...prepared,obsolete};
      });
    }catch(error){
      // A lost commit acknowledgement is ambiguous: never delete a version a manifest may reference.
      try{
        const published=await Promise.all(dates.map(date=>fb.getDoc(indexRef(date))));
        const stagedIds=new Set(snapshots.map(item=>item.id));
        const referenced=published.some(index=>index.exists()&&(index.data().importId===version||[...(index.data().chunks||[]),...(index.data().previousChunks||[])].some(id=>stagedIds.has(id))));
        if(!referenced)await cleanup([...stagedIds]);
      }catch{console.warn('Order staging cleanup deferred.');}
      throw error;
    }
    state.sessions=saved.sessions;state.lastOrderSync=data.syncedAt;
    try{await cleanup(saved.obsolete);}catch{console.warn('Old order snapshot cleanup deferred.');}
    return saved;
  });
}

function setAppLoading(message, failed = false) {
  document.getElementById('bootScreen')?.classList.remove('hidden');
  document.getElementById('appShell')?.classList.add('hidden');
  document.getElementById('loginScreen')?.classList.add('hidden');
  document.getElementById('bootScreen')?.setAttribute('aria-busy', String(!failed));
  document.getElementById('bootTitle').textContent = failed ? 'Chưa tải được dữ liệu' : 'Đang tải dữ liệu…';
  document.getElementById('bootMessage').textContent = message;
  document.getElementById('bootSpinner')?.classList.toggle('hidden', failed);
  document.getElementById('bootRetry')?.classList.toggle('hidden', !failed);
}

function getProductionFirebaseContext() {
  if (!productionFirebaseContextPromise) {
    productionFirebaseContextPromise = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
    ]).then(([appSdk, authSdk, firestoreSdk]) => {
      const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(FIREBASE_CONFIG);
      return {
        ...authSdk,
        ...firestoreSdk,
        app,
        auth: authSdk.getAuth(app),
        db: firestoreSdk.getFirestore(app)
      };
    }).catch(error => {
      productionFirebaseContextPromise = null;
      throw error;
    });
  }
  return productionFirebaseContextPromise;
}

function isProductionAdmin(user = productionFirebaseUser) {
  return Boolean(user?.emailVerified && user?.email?.toLowerCase() === PRODUCTION_ADMIN_EMAIL);
}

function profileFromFirebaseUser(user, data = {}) {
  const admin = isProductionAdmin(user);
  return {
    id: user.uid,
    uid: user.uid,
    name: data.name || user.displayName || user.email?.split('@')[0] || 'Người dùng',
    email: user.email || data.email || '',
    photoURL: user.photoURL || data.photoURL || '',
    authProvider: 'google',
    status: admin ? 'APPROVED' : (data.status || 'PENDING'),
    role: admin ? 'ADMIN' : (data.role || ''),
    joined: data.joined || TODAY,
    lastActive: `${TODAY} ${nowStamp()}`,
    isOnline: true,
    activities: Array.isArray(data.activities) ? data.activities : []
  };
}

function profileForFirestore(profile) {
  return {
    id: profile.id,
    uid: profile.uid || profile.id,
    name: profile.name || 'Người dùng',
    email: profile.email || '',
    photoURL: profile.photoURL || '',
    authProvider: profile.authProvider || 'google',
    status: profile.status || 'PENDING',
    role: profile.role || '',
    joined: profile.joined || TODAY,
    updatedAt: new Date().toISOString()
  };
}

function cleanProductionState(input) {
  const clone = JSON.parse(JSON.stringify(input));
  clone.tokens = [];
  for(const key of ['orders','shopOrders','returns15d'])clone[key]=(clone[key]||[]).filter(row=>row.provider!=='TIKTOK_API');
  return clone;
}

async function loadProductionSession(user) {
  const fb = await getProductionFirebaseContext();
  const profileRef = fb.doc(fb.db, 'users', user.uid);
  const profileSnap = await fb.getDoc(profileRef);
  let profile = profileFromFirebaseUser(user, profileSnap.exists() ? profileSnap.data() : {});

  if (isProductionAdmin(user)) {
    await fb.setDoc(profileRef, {
      ...profileForFirestore(profile),
      status: 'APPROVED',
      role: 'ADMIN',
      createdAt: profileSnap.exists() ? (profileSnap.data().createdAt || new Date().toISOString()) : new Date().toISOString()
    }, { merge: true });

    const dashboardRef = fb.doc(fb.db, 'production', 'dashboard');
    const [dashboardSnap, usersSnap] = await Promise.all([
      fb.getDoc(dashboardRef),
      fb.getDocs(fb.collection(fb.db, 'users'))
    ]);

    state = dashboardSnap.exists()
      ? { ...defaultState(), ...dashboardSnap.data(), tokens: [] }
      : defaultState();

    state.users = usersSnap.docs.map(item => {
      const data = item.data();
      return {
        id: item.id,
        uid: item.id,
        name: data.name || data.email || 'Người dùng',
        email: data.email || '',
        photoURL: data.photoURL || '',
        authProvider: data.authProvider || 'google',
        status: data.status || 'PENDING',
        role: data.role || '',
        joined: data.joined || TODAY,
        lastActive: data.updatedAt || '',
        isOnline: item.id === user.uid,
        activities: []
      };
    });

    const existing = state.users.find(item => item.id === user.uid);
    if (existing) Object.assign(existing, profile);
    else state.users.unshift(profile);
    state.currentUserId = user.uid;
    await loadSellerOrderRange(state.from,state.to);

    if (!dashboardSnap.exists()) {
      await fb.setDoc(dashboardRef, cleanProductionState(state));
    }
  } else {
    if (!profileSnap.exists()) {
      const pendingProfile = {
        ...profileForFirestore(profile),
        status: 'PENDING',
        role: '',
        createdAt: new Date().toISOString()
      };
      await fb.setDoc(profileRef, pendingProfile);
      profile = profileFromFirebaseUser(user, pendingProfile);
    }
    state = defaultState();
    state.users = [profile];
    state.currentUserId = user.uid;
  }
}

async function initializeProductionBackend() {
  const fb = await getProductionFirebaseContext();
  await fb.setPersistence(fb.auth, fb.browserLocalPersistence);

  await new Promise((resolve, reject) => {
    let settled = false;
    fb.onAuthStateChanged(fb.auth, async user => {
      try {
        productionFirebaseUser = user;
        productionBackendReady = false;
        setAppLoading(user ? 'Đang đồng bộ dữ liệu và quyền truy cập của bạn.' : 'Đang kiểm tra phiên đăng nhập.');
        if (user) await loadProductionSession(user);
        else state = defaultState();
        productionBackendReady = true;
        if (!settled) {
          settled = true;
          resolve();
        }
        if (document.readyState !== 'loading') renderAll();
      } catch (error) {
        setAppLoading('Vui lòng kiểm tra kết nối mạng và thử tải lại trang.', true);
        if (!settled) {
          settled = true;
          reject(error);
        } else {
          console.error('Firebase auth state refresh failed', error);
        }
      }
    });
  });
}

function queueProductionStateSave() {
  if (!productionBackendReady || !isProductionAdmin()) return;
  clearTimeout(productionSaveTimer);
  productionSaveTimer = setTimeout(async () => {
    productionSaveTimer = null;
    if (!productionBackendReady || !isProductionAdmin()) return;
    try {
      await writeProductionState();
    } catch (error) {
      console.error('Could not save production state', error);
      toast('Không thể lưu dữ liệu lên Firebase. Vui lòng thử lại.');
    }
  }, 500);
}

async function signOutProduction() {
  const fb = await getProductionFirebaseContext();
  const wasBackendReady = productionBackendReady;
  clearTimeout(productionSaveTimer);
  productionSaveTimer = null;
  productionBackendReady = false;
  try {
    await fb.signOut(fb.auth);
  } catch (error) {
    productionBackendReady = wasBackendReady;
    throw error;
  }
}

async function productionApiFetch(path, options = {}) {
  if (!productionFirebaseUser) throw new Error('AUTH_REQUIRED');
  const send = async forceRefresh => {
    const idToken = await productionFirebaseUser.getIdToken(forceRefresh);
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${idToken}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(path, { ...options, headers, credentials: 'same-origin' });
  };
  let response = await send(false);
  if (response.status === 401) response = await send(true);
  return response;
}

