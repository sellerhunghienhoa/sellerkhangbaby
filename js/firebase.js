/**
 * Firebase production adapter.
 * Authentication and Firestore are the source of truth in production.
 */

let productionFirebaseAuthContextPromise = null;
let productionFirebaseContextPromise = null;
let productionFirebaseUser = null;
let productionBackendReady = false;
let productionSaveTimer = null;
let productionWriteChain = Promise.resolve();

function stableProductionJson(value) {
  return JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.keys(item).sort().reduce((sorted, name) => { sorted[name] = item[name]; return sorted; }, {})
    : item);
}

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
    batch.set(fb.doc(fb.db, 'production', 'staffDashboard'), cleanStaffState(state));
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
    const staffRef = fb.doc(fb.db, 'production', 'staffDashboard');
    const saved = await fb.runTransaction(fb.db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('DASHBOARD_NOT_FOUND');
      const merged = mergeTikTokLiveSessions(snapshot.data().sessions || [], incoming);
      transaction.update(ref, { sessions: merged.sessions, lastLiveSync: syncedAt });
      transaction.set(staffRef, { sessions: merged.sessions, lastLiveSync: syncedAt }, { merge: true });
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
    const staffRef = fb.doc(fb.db,'production','staffDashboard');
    const saved = await fb.runTransaction(fb.db,async transaction=>{
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('DASHBOARD_NOT_FOUND');
      const data = snapshot.data();
      const affiliateDaily = mergeAffiliateDays(data.affiliateDaily || [],incoming);
      if (new TextEncoder().encode(JSON.stringify({...data,affiliateDaily})).byteLength>900000) throw new Error('TIKTOK_AFFILIATE_STORAGE_LIMIT');
      transaction.update(ref,{affiliateDaily,lastAffiliateSync:syncedAt});
      transaction.set(staffRef,{affiliateDaily,lastAffiliateSync:syncedAt},{merge:true});
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
    const staffDashboard=fb.doc(fb.db,'production','staffDashboard');
    const current=await fb.getDoc(dashboard);if(!current.exists())throw new Error('DASHBOARD_NOT_FOUND');
    const originalSessions=stableProductionJson(current.data().sessions||[]);
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
        for(const [id,chunk] of await Promise.all(ids.slice(offset,offset+10).filter(id=>/^\d{4}-\d{2}-\d{2}-[0-9a-f-]{36}-\d+$/.test(id)).map(async id=>[id,await fb.getDoc(chunkRef(id))]))){
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
        if(stableProductionJson(latest.data().sessions||[])!==originalSessions)throw new Error('TIKTOK_ORDERS_STATE_CHANGED');
        if(new TextEncoder().encode(JSON.stringify({...latest.data(),sessions:prepared.sessions})).byteLength>900000)throw new Error('TIKTOK_ORDERS_SNAPSHOT_LIMIT');
        const old=await Promise.all(indexes.map(index=>transaction.get(indexRef(index.date))));
        const obsolete=[];
        indexes.forEach((index,i)=>{
          const previous=old[i].exists()?old[i].data():{};
          obsolete.push(...(previous.previousChunks||[]));
          transaction.set(indexRef(index.date),{...index,previousChunks:previous.chunks||[]});
        });
        transaction.update(dashboard,{sessions:prepared.sessions,lastOrderSync:data.syncedAt});
        transaction.set(staffDashboard,{sessions:prepared.sessions,lastOrderSync:data.syncedAt},{merge:true});
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

function getProductionFirebaseAuthContext() {
  if (!productionFirebaseAuthContextPromise) {
    productionFirebaseAuthContextPromise = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    ]).then(([appSdk, authSdk]) => {
      const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(FIREBASE_CONFIG);
      return {
        ...authSdk,
        app,
        auth: authSdk.getAuth(app)
      };
    }).catch(error => {
      productionFirebaseAuthContextPromise = null;
      throw error;
    });
  }
  return productionFirebaseAuthContextPromise;
}

function getProductionFirebaseContext() {
  if (!productionFirebaseContextPromise) {
    productionFirebaseContextPromise = Promise.all([
      getProductionFirebaseAuthContext(),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
    ]).then(([authContext, firestoreSdk]) => ({
      ...authContext,
      ...firestoreSdk,
      db: firestoreSdk.getFirestore(authContext.app)
    })).catch(error => {
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
    name: user.displayName || data.name || user.email?.split('@')[0] || 'Người dùng',
    email: user.email || data.email || '',
    photoURL: user.photoURL || data.photoURL || '',
    authProvider: 'google',
    status: admin ? 'APPROVED' : (data.status || 'PENDING'),
    role: admin ? 'ADMIN' : (data.role || ''),
    joined: data.joined || TODAY,
    lastActive: `${TODAY} ${nowStamp()}`,
    isOnline: true,
    activities: Array.isArray(data.activities) ? data.activities : [],
    targetGmv: Number(data.targetGmv) || 0,
    targetUpdatedAt: data.targetUpdatedAt || ''
  };
}

function profileForFirestore(profile) {
  const result = {
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
  const targetGmv = Number(profile.targetGmv);
  if (profile.status === 'APPROVED' && profile.role === 'HOST' && Number.isSafeInteger(targetGmv) && targetGmv > 0) {
    result.targetGmv = targetGmv;
    result.targetUpdatedAt = profile.targetUpdatedAt || TODAY;
  }
  return result;
}

async function saveProductionHostTarget(profile) {
  if (!productionBackendReady || !productionFirebaseUser) throw new Error('AUTH_REQUIRED');
  const targetGmv = Number(profile?.targetGmv);
  const ownsProfile = productionFirebaseUser.uid === profile?.id;
  if (profile?.status !== 'APPROVED' || profile?.role !== 'HOST') throw new Error('HOST_REQUIRED');
  if (!isProductionAdmin() && !ownsProfile) throw new Error('FORBIDDEN');
  if (!Number.isSafeInteger(targetGmv) || targetGmv <= 0 || targetGmv > 1_000_000_000_000) throw new Error('INVALID_TARGET');
  const fb = await getProductionFirebaseContext();
  await fb.setDoc(fb.doc(fb.db, 'users', profile.id), {
    targetGmv,
    targetUpdatedAt: profile.targetUpdatedAt || TODAY,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

async function removeProductionUserProfile(profile) {
  if (!productionBackendReady || !isProductionAdmin()) throw new Error('AUTH_REQUIRED');
  if (!profile?.id) throw new Error('USER_NOT_FOUND');
  const fb = await getProductionFirebaseContext();
  const removedAt = new Date().toISOString();
  await fb.setDoc(fb.doc(fb.db, 'users', profile.id), {
    ...profileForFirestore(profile),
    status: 'REMOVED',
    role: '',
    removedAt,
    updatedAt: removedAt
  }, { merge: true });
}

function cleanProductionState(input) {
  const clone = JSON.parse(JSON.stringify(input));
  clone.tokens = [];
  for(const key of ['orders','shopOrders','returns15d'])clone[key]=(clone[key]||[]).filter(row=>row.provider!=='TIKTOK_API');
  return clone;
}

function cleanStaffState(input) {
  return {
    preset: input.preset || '30D',
    from: input.from || addDays(TODAY, -29),
    to: input.to || TODAY,
    lastSync: input.lastSync || '',
    lastLiveSync: input.lastLiveSync || '',
    lastAffiliateSync: input.lastAffiliateSync || '',
    lastOrderSync: input.lastOrderSync || '',
    sessions: JSON.parse(JSON.stringify(input.sessions || [])),
    affiliateDaily: JSON.parse(JSON.stringify(input.affiliateDaily || [])),
    staffProfiles: (input.users || [])
      .filter(profile => profile.status === 'APPROVED' && (profile.role === 'HOST' || profile.role === 'OPERATOR'))
      .map(profile => ({
        id: profile.id,
        uid: profile.uid || profile.id,
        name: profile.name || 'Nhân sự',
        photoURL: profile.photoURL || '',
        status: 'APPROVED',
        role: profile.role,
        joined: profile.joined || TODAY,
        targetGmv: Number(profile.targetGmv) || 0
      }))
  };
}

function profilesFromFirestore(snapshot) {
  return snapshot.docs.filter(item => item.data().status !== 'REMOVED').map(item => {
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
      isOnline: item.id === productionFirebaseUser?.uid,
      activities: [],
      targetGmv: Number(data.targetGmv) || 0,
      targetUpdatedAt: data.targetUpdatedAt || ''
    };
  });
}

function refreshRelativePresetRange(target, today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())) {
  if (!target || typeof target !== 'object') return target;
  if (target.preset === 'TODAY') { target.from = today; target.to = today; }
  else if (target.preset === '7D') { target.from = addDays(today, -6); target.to = today; }
  else if (target.preset === '30D') { target.from = addDays(today, -29); target.to = today; }
  return target;
}

async function loadProductionSession(user) {
  const fb = await getProductionFirebaseContext();
  const profileRef = fb.doc(fb.db, 'users', user.uid);
  const profileSnap = await fb.getDoc(profileRef);
  let profile = profileFromFirebaseUser(user, profileSnap.exists() ? profileSnap.data() : {});

  if (isProductionAdmin(user)) {
    void fb.setDoc(profileRef, {
      ...profileForFirestore(profile),
      status: 'APPROVED',
      role: 'ADMIN',
      createdAt: profileSnap.exists() ? (profileSnap.data().createdAt || new Date().toISOString()) : new Date().toISOString()
    }, { merge: true }).catch(error => console.warn('Could not refresh admin profile', error));

    const dashboardRef = fb.doc(fb.db, 'production', 'dashboard');
    const staffDashboardRef = fb.doc(fb.db, 'production', 'staffDashboard');
    const [dashboardSnap, staffDashboardSnap, usersSnap] = await Promise.all([
      fb.getDoc(dashboardRef),
      fb.getDoc(staffDashboardRef),
      fb.getDocs(fb.collection(fb.db, 'users'))
    ]);

    state = dashboardSnap.exists()
      ? { ...defaultState(), ...dashboardSnap.data(), tokens: [] }
      : defaultState();
    refreshRelativePresetRange(state);

    state.users = profilesFromFirestore(usersSnap);

    const existing = state.users.find(item => item.id === user.uid);
    if (existing) Object.assign(existing, profile);
    else state.users.unshift(profile);
    state.currentUserId = user.uid;
    if (!dashboardSnap.exists()) {
      await fb.setDoc(dashboardRef, cleanProductionState(state));
    }
    if (!staffDashboardSnap.exists()) {
      await fb.setDoc(staffDashboardRef, cleanStaffState(state));
    }
    // Nạp các ca live PENDING do Host gửi vào state
    await loadPendingShiftsIntoState();
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
    } else {
      if (user.displayName || user.photoURL) {
        void fb.setDoc(profileRef, {
          name: user.displayName || profile.name,
          photoURL: user.photoURL || profile.photoURL,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Could not sync Google profile to firestore', err));
      }
    }
    const approvedStaff = profile.status === 'APPROVED' && (profile.role === 'HOST' || profile.role === 'OPERATOR');
    if (approvedStaff) {
      const staffDashboardSnap = await fb.getDoc(fb.doc(fb.db, 'production', 'staffDashboard'));
      const staffData = staffDashboardSnap.exists() ? staffDashboardSnap.data() : {};
      state = staffDashboardSnap.exists()
        ? { ...defaultState(), ...staffData, tokens: [], orders: [], shopOrders: [], returns15d: [] }
        : defaultState();
      refreshRelativePresetRange(state);
      state.users = Array.isArray(staffData.staffProfiles)
        ? JSON.parse(JSON.stringify(staffData.staffProfiles))
        : [];
      delete state.staffProfiles;
      const existing = state.users.find(item => item.id === user.uid);
      if (existing) Object.assign(existing, profile);
      else state.users.unshift(profile);
      state.currentUserId = user.uid;
    } else {
      state = defaultState();
      state.users = [profile];
      state.currentUserId = user.uid;
    }
  }
}

function refreshProductionSellerOrders() {
  if (!isProductionAdmin() || typeof loadSellerOrderRange !== 'function') return;
  orderViewRange = '';
  void loadSellerOrderRange(state.from, state.to).then(loaded => { if (loaded !== undefined) renderAll(); });
}

async function refreshProductionSession() {
  if (!productionBackendReady) return false;
  if (!productionFirebaseUser) return true;
  const cachedOrders = (state.orders || []).filter(row => row.provider === 'TIKTOK_API');
  const cachedShopOrders = (state.shopOrders || []).filter(row => row.provider === 'TIKTOK_API');
  const cachedReturns = (state.returns15d || []).filter(row => row.provider === 'TIKTOK_API');
  await loadProductionSession(productionFirebaseUser);
  state.orders = [...new Map([...state.orders, ...cachedOrders].map(row => [row.orderId, row])).values()];
  state.shopOrders = [...new Map([...state.shopOrders, ...cachedShopOrders].map(row => [row.orderId, row])).values()];
  state.returns15d = [...new Map([...state.returns15d, ...cachedReturns].map(row => [row.returnId, row])).values()];
  refreshProductionSellerOrders();
  renderAll();
  return true;
}

async function initializeProductionBackend() {
  const fb = await getProductionFirebaseAuthContext();
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
        refreshProductionSellerOrders();
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
      toast('Không thể lưu dữ liệu lên hệ thống. Vui lòng thử lại.');
    }
  }, 500);
}


/** Host gửi 1 ca live PENDING lên Firestore sub-collection pendingShifts */
async function saveHostPendingShift(sessionId, entry) {
  if (!productionBackendReady || !productionFirebaseUser) throw new Error('AUTH_REQUIRED');
  const fb = await getProductionFirebaseContext();
  const shiftId = entry.id || ('MS-' + Date.now().toString(36));
  await fb.setDoc(
    fb.doc(fb.db, 'production', 'staffDashboard', 'pendingShifts', shiftId),
    { ...entry, sessionId, id: shiftId }
  );
  return shiftId;
}

/** Admin load tất cả PENDING entries từ sub-collection vào state.sessions */
async function loadPendingShiftsIntoState() {
  if (!productionBackendReady || !isProductionAdmin()) return;
  const fb = await getProductionFirebaseContext();
  const snap = await fb.getDocs(fb.collection(fb.db, 'production', 'staffDashboard', 'pendingShifts'));
  snap.forEach(doc => {
    const entry = doc.data();
    const s = state.sessions.find(x => x.id === entry.sessionId);
    if (!s) return;
    if (!Array.isArray(s.manualStaff)) s.manualStaff = [];
    if (!s.manualStaff.find(ms => ms.id === entry.id)) {
      s.manualStaff.push(entry);
    }
  });
}

/** Admin xóa 1 pending entry khỏi sub-collection (sau khi approve/reject/xóa) */
async function deleteHostPendingShift(shiftId) {
  if (!productionBackendReady || !isProductionAdmin()) return;
  const fb = await getProductionFirebaseContext();
  await fb.deleteDoc(fb.doc(fb.db, 'production', 'staffDashboard', 'pendingShifts', shiftId));
}

async function signOutProduction() {
  const fb = await getProductionFirebaseAuthContext();
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

