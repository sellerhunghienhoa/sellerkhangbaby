async page => {
  await page.setViewportSize({width:1440,height:900});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.context().route('https://www.gstatic.com/firebasejs/**',async route=>{
    const url=route.request().url();let body='';
    if(url.endsWith('firebase-app.js'))body='export const getApps=()=>[];export const initializeApp=()=>({});';
    if(url.endsWith('firebase-auth.js'))body=`export const getAuth=()=>({});export const browserLocalPersistence={};export const setPersistence=async()=>{};export const onAuthStateChanged=(auth,callback)=>{setTimeout(()=>callback({uid:'ui-admin',displayName:'Quản trị viên',email:'sellerhunghienhoa@gmail.com',emailVerified:true,getIdToken:async()=>'test-only'}),100)};`;
    if(url.endsWith('firebase-firestore.js'))body=`
      window.mockDocs={'production/dashboard':{sessions:[{id:'TTLIVE-99-123',tiktokLiveId:'123',tiktokShopId:'99',date:'2026-10-28',slot:'10:00 - 11:00',channel:'shopkhangbaby',grossLiveGmv:100000,pendingRecGmv:100000,cancelReturnGmv:0,affiliateGmv:0,targetGmv:0,hostId:'',operatorId:'',shifts:[]}]}};window.mockFailSave=false;window.mockWrites=0;
      export const getFirestore=()=>({});export const doc=(db,...path)=>path.join('/');export const collection=(db,...path)=>path.join('/');
      export const getDoc=async ref=>({exists:()=>ref in window.mockDocs,data:()=>window.mockDocs[ref]});export const getDocs=async()=>({docs:[]});export const setDoc=async()=>{};export const writeBatch=()=>{const pending=[];return {set:(ref,data)=>pending.push([ref,data]),delete:ref=>pending.push([ref,null]),commit:async()=>{if(window.mockFailSave)throw Error('SAVE_FAILED');for(const [ref,data] of pending){if(data===null)delete window.mockDocs[ref];else window.mockDocs[ref]=structuredClone(data);}}};};
      export const runTransaction=async(db,callback)=>{const pending=[];const result=await callback({get:getDoc,set:(ref,data)=>pending.push([ref,data]),update:(ref,data)=>pending.push([ref,{...window.mockDocs[ref],...data}])});if(window.mockFailSave)throw Error('SAVE_FAILED');for(const [ref,data] of pending)window.mockDocs[ref]=structuredClone(data);window.mockWrites++;return result;};`;
    await route.fulfill({contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body});
  });
  await page.route('**/api/tiktok/status',route=>route.fulfill({json:{backendReady:true,missingSecrets:[],connections:[]}}));
  await page.route('**/api/tiktok/live/core-stats',async route=>{const input=route.request().postDataJSON();return route.fulfill({json:{creator:input.creator,rows:input.liveIds.map(liveId=>({liveId,creatorReportedGmv:100000}))}});});
  let mode='success',calls=0,sequence=[];
  await page.route('**/api/tiktok/orders/sync',async route=>{
    calls++;await new Promise(resolve=>setTimeout(resolve,200));
    if(mode==='scope')return route.fulfill({status:403,json:{error:'TIKTOK_RETURNS_SCOPE_MISSING'}});
    const request=route.request().postDataJSON();const date='2026-10-28';
    sequence.push(request.stage);
    const order={provider:'TIKTOK_API',orderId:'777',tiktokShopId:'99',date,time:'10:00',createdAt:date+'T03:00:00Z',updatedAt:date+'T04:00:00Z',deliveredAt:date+'T04:00:00Z',status:'DELIVERED',amount:100000,paidTotal:115000,attribution:'LIVE',roomIds:['123'],productName:'Sữa <img src=x onerror=alert(1)>',sku:'<b>SKU</b>',qty:1,customerName:'Ẩn theo quyền riêng tư',customerPhone:'',city:'',channel:'shopkhangbaby'};
    const returns=[{provider:'TIKTOK_API',returnId:'888',orderId:'777',tiktokShopId:'99',returnDate:date,deliveredDate:'',daysFromDelivery:null,within15Days:false,status:'PENDING',requestedAmount:100000,returnAmount:0,refundConfirmed:false,productName:'Sữa',sku:'<b>SKU</b>',qty:1,reasonLabel:'Không vừa',reasonCode:'__proto__',liability:'Chưa xác định',parentOrder:order}];
    const orders=[order,{...order,orderId:'778',attribution:'NON_LIVE',roomIds:[],status:'PENDING'},{...order,orderId:'779',attribution:'UNKNOWN',roomIds:[],status:'UNKNOWN'}];
    if(mode==='complete'){
      orders[0].refundsComplete=true;orders[0].refund=50000;
      Object.assign(returns[0],{status:'REFUNDED',returnAmount:50000,refundConfirmed:true,deliveredDate:date,daysFromDelivery:0,within15Days:true});
    }
    return route.fulfill({json:{stage:request.stage,orders:request.stage==='orders'?orders:[],returns:request.stage==='returns'?returns:[],ledger:request.stage==='refunds'&&mode==='complete'?[{returnId:'888',orderId:'777',refundConfirmed:true,returnAmount:50000}]:[],nextCursor:null,complete:true,from:request.from,to:request.to,shopId:'99',syncedAt:'2026-10-28T14:00:00Z'}});
  });
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  await page.goto('http://127.0.0.1:8787');await page.locator('#appShell').waitFor({state:'visible'});
  await page.evaluate(()=>{state.from=state.to='2026-10-28';switchTab('TAB_TIKTOK_API');document.querySelector('.api-secondary-sync').open=true;});
  const button=page.locator('#TAB_TIKTOK_API [data-order-sync]');await button.click();
  check(await button.isDisabled(),'Concurrent sync enabled');await page.evaluate(()=>syncTikTokOrders('2026-10-28','2026-10-28'));await page.waitForFunction(()=>!orderSyncInProgress);
  await page.evaluate(()=>switchTab('TAB_ORDERS'));
  let snapshot=await page.evaluate(()=>({orders:state.orders,organic:state.shopOrders,returns:state.returns15d,docs:Object.keys(mockDocs),clean:cleanProductionState(state),pending:state.sessions[0].pendingRecGmv}));
  check(calls===3,'Duplicate workflow');check(snapshot.orders.length===3&&snapshot.organic.length===1&&snapshot.returns.length===1,'Missing imported lists');
  check(snapshot.orders[0].sessionId==='TTLIVE-99-123','Exact LIVE ID was not linked');check(snapshot.orders[2].sessionId==='','Unknown source guessed');check(snapshot.pending===0,'Completed workflow did not reconcile delivered orders');
  check(snapshot.clean.orders.length===0&&snapshot.clean.shopOrders.length===0&&snapshot.clean.returns15d.length===0,'Orders leaked into dashboard document');
  check((await page.locator('#retMobile').textContent()).includes('Chưa xác định mốc nhận hàng'),'Unknown date shown as eligible');
  check(snapshot.docs.some(p=>p.startsWith('production/sellerOrderSnapshots/chunks/')),'Chunks not saved');
  check(await page.locator('#ordBody tr').count()===3,'Order table empty');
  await page.evaluate(()=>{switchTab('TAB_SHOP_ORDERS');});
  check((await page.locator('#shopOrdPending').textContent()).includes('1 đơn'),'Unknown-source records hidden from organic page');
  await page.locator('#shopOrdPending button').click();check(await page.locator('#ordBody tr').count()===1,'Pending source filter does not select unknown order');
  await page.evaluate(()=>{document.getElementById('ordAttribution').value='ALL';renderOrders();});
  check(await page.locator('#ordBody img').count()===0,'Unsafe API field inserted as HTML');
  check(await page.locator('#mdAddShopOrder').count()===0&&await page.getByText('Thêm đơn ngoài live',{exact:true}).count()===0,'Manual organic order UI still exists');
  await page.locator('#ordBody tr').first().click();check((await page.locator('#orderTrackCard').textContent()).includes('Giao thành công'),'Actual delivery time missing');
  check(await page.locator('#orderTrackCard .order-detail').count()===1,'Compact order detail missing');
  check(await page.locator('#orderTrackCard details[open]').count()===0,'Reconciliation explanation is expanded by default');
  await page.setViewportSize({width:320,height:700});
  const orderCardSize=await page.locator('#orderTrackCard').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));check(orderCardSize.scroll<=orderCardSize.width,'Order detail overflows mobile');
  await page.evaluate(()=>closeModal('mdOrder'));await page.setViewportSize({width:1440,height:900});
  await page.evaluate(()=>syncTikTokOrders('2026-10-28','2026-10-28'));await page.waitForFunction(()=>!orderSyncInProgress);check(await page.evaluate(()=>state.orders.length)===3,'Repeated sync duplicates orders');check((await page.evaluate(()=>Object.keys(mockDocs).length))<=snapshot.docs.length+1,'Repeated sync leaks chunk versions');
  mode='complete';await page.evaluate(()=>syncTikTokOrders('2026-10-28','2026-10-28'));await page.waitForFunction(()=>!orderSyncInProgress);
  check(await page.evaluate(()=>state.sessions[0].cancelReturnGmv)===50000,'Complete refund ledger did not reconcile');
  check(await page.evaluate(()=>state.returns15d[0].reflectedInSession)===true,'Return reconciliation not linked');
  check(await page.evaluate(()=>filteredSessions()[0].kpiGmv)===50000,'Refund was deducted twice');
  check(await page.locator('[data-anim-key="ret-net"]').getAttribute('data-count-to')==='50000','Return summary deducts completed refund twice');
  await page.evaluate(()=>{mockFailSave=true;});await page.evaluate(()=>syncTikTokOrders('2026-10-28','2026-10-28'));await page.waitForFunction(()=>!orderSyncInProgress);check(await page.evaluate(()=>state.orders.length)===3,'Failed transaction loses data');await page.evaluate(()=>{switchTab('TAB_TIKTOK_API');document.querySelector('.api-secondary-sync').open=true;});check((await page.locator('#TAB_TIKTOK_API [data-order-sync-status]').textContent()).includes('giữ nguyên'),'Save failure not reported');
  await page.evaluate(()=>{mockFailSave=false;state.from=state.to='2026-10-27';resetPagesAndRender();});await page.waitForFunction(()=>!orderDataLoading);check(await page.evaluate(()=>state.orders.length)===0,'Date range keeps stale API rows');
  await page.evaluate(()=>{state.from=state.to='2026-10-28';resetPagesAndRender();});await page.waitForFunction(()=>!orderDataLoading);check(await page.evaluate(()=>state.orders.length)===3,'Persisted day did not reload');
  mode='scope';await page.evaluate(()=>syncTikTokOrders('2026-10-28','2026-10-28'));await page.waitForFunction(()=>!orderSyncInProgress);await page.evaluate(()=>{switchTab('TAB_TIKTOK_API');document.querySelector('.api-secondary-sync').open=true;});check((await page.locator('#TAB_TIKTOK_API [data-order-sync-status]').textContent()).includes('seller.return_refund.basic'),'Missing permission not explained');
  const widths=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    for(const tab of ['TAB_ORDERS','TAB_SHOP_ORDERS','TAB_RETURNS_15D','TAB_TIKTOK_API']){
      await page.evaluate(tab=>{switchTab(tab);document.querySelector('.toast').classList.remove('show');},tab);
      const size=await page.locator('#'+tab).evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));check(size.scroll<=size.width,'Overflow '+tab+' '+width+' '+JSON.stringify(size));
    }
    await page.evaluate(()=>switchTab('TAB_RETURNS_15D'));check((await page.locator('#retMobile').textContent()).includes('0 ngày sau nhận'),'Actual return age missing');
    await page.screenshot({path:'.playwright-cli/orders-'+width+'.png',animations:'disabled'});widths.push(width);
  }
  await page.evaluate(()=>openReturnDetailModal('888'));
  check((await page.locator('#returnDetailCard').textContent()).includes('Đề nghị hoàn'),'Proposed money missing');
  check(await page.locator('#returnDetailCard .return-detail').count()===1,'Compact return detail missing');
  check(await page.locator('#returnDetailCard details[open]').count()===0,'Return reference or explanation expanded by default');
  check(!(await page.locator('#returnDetailCard').textContent()).includes('TTLIVE-'),'LIVE reference leaked into primary return detail');
  await page.setViewportSize({width:320,height:700});
  const returnCardSize=await page.locator('#returnDetailCard').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));check(returnCardSize.scroll<=returnCardSize.width,'Return detail overflows mobile');
  await page.evaluate(()=>closeModal('mdReturnDetail'));
  await page.route('**/api/tiktok/live/sync',route=>{sequence.push('live');return route.fulfill({json:{sessions:[{id:'TTLIVE-99-123',tiktokLiveId:'123',tiktokShopId:'99',date:'2026-10-28',slot:'10:00 - 11:00',channel:'shopkhangbaby',tiktokReportedGmv:100000}],syncedAt:'2026-10-28T14:00:00Z'}});});
  await page.route('**/api/tiktok/affiliate/sync',route=>{const input=route.request().postDataJSON();sequence.push('affiliate:'+input.creator);return route.fulfill({json:{rows:[],nextCursor:null,complete:true,from:input.from,to:input.to,creator:input.creator,syncedAt:'2026-10-28T14:00:00Z'}});});
  sequence=[];mode='complete';await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>switchTab('TAB_TIKTOK_API'));
  check(await page.locator('#liveSyncFrom, #liveSyncTo').count()===0,'API date picker still visible');await page.locator('#TAB_TIKTOK_API [data-live-sync]').click();
  await page.waitForFunction(()=>!liveSyncInProgress&&!orderSyncInProgress&&!affiliateSyncInProgress);
  check(sequence.join(',')==='live,orders,returns,refunds,affiliate:shopkhangbaby,affiliate:mekhangsua','Combined pipeline order incorrect: '+sequence);
  check(errors.length===0,errors.join(', '));return {orders:true,organic:true,returns:true,exactAttribution:true,atomicSaveFailure:true,idempotent:true,dateReload:true,safeHtml:true,preservedKpi:true,widths,errors};
}
