let orderSyncInProgress = false;
let orderDataLoading = false;
let orderLoadingRange = '';
let orderSyncMessage = '';
let orderViewRange = '';
let orderLoadSequence = 0;
const orderVietnamDate = value => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));

function openUnattributedOrders(){
  document.getElementById('ordAttribution').value='UNKNOWN';
  document.getElementById('ordStatus').value='ALL';
  document.getElementById('ordSearch').value='';pages.ord=1;
  switchTab('TAB_ORDERS');renderOrders();
}

function returnAgeLabel(row){
  return row.daysFromDelivery===null||row.daysFromDelivery===undefined?'Chưa xác định mốc nhận hàng':row.daysFromDelivery<0?'Yêu cầu trước khi nhận hàng':row.daysFromDelivery>15?`${row.daysFromDelivery} ngày · ngoài mốc 15 ngày`:`${row.daysFromDelivery} ngày sau nhận`;
}

function sellerRangeDates(from,to) {
  const dates=[];
  for(let value=Date.parse(from);value<=Date.parse(to);value+=86400000)dates.push(new Date(value).toISOString().slice(0,10));
  return dates;
}

function prepareSellerSnapshot(sessions,orders,returns,from,to,syncedAt) {
  const updatedSessions=sessions.map(session=>({...session}));
  const link=order=>{
    const roomId=(order.roomIds&&order.roomIds.length)?order.roomIds[0]:null;
    const canMatch=(order.attribution==='LIVE'||(order.attribution==='MIXED'&&roomId))&&Boolean(roomId);
    const matches=canMatch?updatedSessions.filter(s=>s.tiktokLiveId===roomId&&(!s.tiktokShopId||!order.tiktokShopId||s.tiktokShopId===order.tiktokShopId)):[];
    const session=matches.length===1?matches[0]:null;
    const isKocLive=Boolean(roomId)&&!session;
    return {...order,sessionId:session?.id||'',channel:session?.channel||order.channel||'shopkhangbaby',source:session?'LIVE':isKocLive?'AFFILIATE_KOC':order.source||(order.attribution==='NON_LIVE'?'UNKNOWN_NON_LIVE':order.attribution),kpiRule:session?'Khớp LIVE ID từ API':isKocLive?'KOC ngoài Live · 0% KPI':order.attribution==='NON_LIVE'?'Ngoài LIVE · 0% KPI':'Chưa xác minh phiên · chưa tính KPI'};
  };
  const linked=orders.map(link);
  const allParents=new Map(linked.map(order=>[order.orderId,order]));
  returns.forEach(row=>{if(row.parentOrder&&!allParents.has(row.orderId))allParents.set(row.orderId,link(row.parentOrder));});
  const linkedReturns=returns.map(row=>{
    const parent=allParents.get(row.orderId);const session=updatedSessions.find(s=>s.id===parent?.sessionId);
    const {parentOrder,...copy}=row;
    const deductible=copy.refundConfirmed&&copy.within15Days&&session;
    return {...copy,channel:parent?.channel||'shopkhangbaby',sessionId:session?.id||'',hostId:session?.hostId||'',operatorId:session?.operatorId||'',hostName:session?.hostId||'Chưa gán',
      hostCommReduction:deductible&&session.hostId?Math.round(copy.returnAmount*HOST_RATE/100):0,
      opCommReduction:deductible&&session.operatorId?Math.round(copy.returnAmount*OP_RATE/100):0,reflectedInSession:false};
  });
  const refunds=new Map();linkedReturns.forEach(row=>{if(row.refundConfirmed)refunds.set(row.orderId,(refunds.get(row.orderId)||0)+row.returnAmount);});
  linked.forEach(order=>{
    order.refund=order.refundsComplete?order.refund:(refunds.get(order.orderId)||0);
    order.refundMismatch=order.refund>order.amount;
    if(order.amount>0&&order.refund===order.amount)order.status='RETURNED';
  });
  const cents=value=>Math.round(Number(value)*100);
  const sessionEndDate=session=>session.endedAt&&Number.isFinite(Date.parse(session.endedAt))?orderVietnamDate(session.endedAt):'';
  updatedSessions.forEach(session=>{
    const group=linked.filter(order=>order.sessionId===session.id);
    const endDate=sessionEndDate(session);
    if(!group.length||session.date<from||session.date>to||(endDate&&endDate>to))return;
    const eligible=group.filter(order=>order.status!=='UNPAID');
    const total=eligible.reduce((sum,order)=>sum+cents(order.amount),0);
    const expected=cents(session.tiktokReportedGmv??session.grossLiveGmv);
    const diff=Math.abs(total-expected);
    const tolerance=Math.max(5000000,Math.round(expected*0.15));
    const isAffOrCreator=session.channel==='mekhangsua'||Number(session.affiliateGmv)>0;
    const verified=eligible.length>0&&(diff===0||diff<=tolerance||isAffOrCreator)&&group.every(order=>order.status!=='UNKNOWN'&&!order.refundMismatch)&&!session.isManualKpi&&(session.pendingRecGmv>0||session.orderReconciliationManaged);
    const delivered=eligible.filter(o=>o.status==='DELIVERED').reduce((sum,o)=>sum+cents(o.amount-o.refund),0);
    const pending=eligible.filter(o=>['SHIPPING','PENDING'].includes(o.status)).reduce((sum,o)=>sum+cents(o.amount-o.refund),0);
    const cancelled=eligible.reduce((sum,o)=>sum+cents(['RETURNED','CANCELLED'].includes(o.status)?o.amount:o.refund),0);
    // Only a complete refund ledger and matching financial totals may change LIVE KPI.
    const complete=Boolean(session.endedAt)&&verified&&group.every(order=>order.refundsComplete===true);
    session.orderSync={syncedAt,matchedOrders:group.length,deliveredGmv:delivered/100,pendingGmv:pending/100,refundGmv:cancelled/100,verified:complete};
    if(complete){
      if(diff===0||!isAffOrCreator){session.grossLiveGmv=total/100;}
      session.cancelReturnGmv=cancelled/100;
      session.orderReconciliationManaged=true;
      if(pending===0){
        session.pendingRecGmv=0;
        session.status='RECONCILED';
      }else{
        const sesGross=(diff===0||!isAffOrCreator)?(total/100):Number(session.grossLiveGmv)||0;
        const sesAff=Number(session.affiliateGmv)||0;
        const sesCancel=cancelled/100;
        const sesTotalEligible=Math.max(0,sesGross+sesAff-sesCancel);
        const deliveryRatio=(delivered+pending>0)?(delivered/(delivered+pending)):0;
        const deliveredPortion=Math.round(sesTotalEligible*deliveryRatio);
        session.pendingRecGmv=Math.max(0,sesTotalEligible-deliveredPortion);
      }
    }
    else if(session.orderReconciliationManaged&&cents(session.grossLiveGmv)!==expected){
      // TikTok has updated the session GMV, so an older verified order total is no longer current.
      session.grossLiveGmv=expected/100;session.pendingRecGmv=expected/100;session.cancelReturnGmv=0;session.orderReconciliationManaged=false;
    }
  });
  linkedReturns.forEach(row=>{row.reflectedInSession=!!updatedSessions.find(s=>s.id===row.sessionId&&s.orderSync?.verified&&s.orderSync.syncedAt===syncedAt);});
  return {orders:linked,returns:linkedReturns,sessions:updatedSessions};
}

function applySellerOrderView(orders,returns) {
  const byId=new Map(state.orders.filter(row=>row.provider!=='TIKTOK_API').map(row=>[row.orderId,row]));
  orders.forEach(raw=>{
    const isKocLive=raw.source==='AFFILIATE_KOC'||(raw.attribution==='LIVE'&&!raw.sessionId);
    const row=isKocLive?{...raw,source:'AFFILIATE_KOC',kpiRule:'KOC ngoài Live · 0% KPI'}:raw;
    byId.set(row.orderId,row);
  });
  state.orders=[...byId.values()];
  const organic=new Map(state.shopOrders.filter(row=>row.provider!=='TIKTOK_API').map(row=>[row.orderId,row]));
  orders.forEach(raw=>{
    const isKocLive=raw.source==='AFFILIATE_KOC';
    if(raw.attribution==='NON_LIVE'){
      organic.set(raw.orderId,{...raw,source:raw.source&&raw.source!=='LIVE'?raw.source:'UNKNOWN_NON_LIVE',kpiRule:'0% LIVE KPI'});
    }else if(isKocLive){
      organic.set(raw.orderId,{...raw,source:'AFFILIATE_KOC',kpiRule:'KOC ngoài Live · 0% KPI'});
    }
  });
  state.shopOrders=[...organic.values()];
  const returnMap=new Map(state.returns15d.filter(row=>row.provider!=='TIKTOK_API').map(row=>[row.returnId,row]));
  returns.forEach(row=>returnMap.set(row.returnId,row));state.returns15d=[...returnMap.values()];
}

async function loadSellerOrderRange(from,to) {
  if(!isProductionAdmin())return;
  const sequence=++orderLoadSequence;orderDataLoading=true;orderLoadingRange=from+':'+to;renderOrderSyncStatus();
  try{
    const fb=await getProductionFirebaseContext();
    const orders=[],returns=[];
    const days=sellerRangeDates(from,to);
    // Read in small groups so a mobile reconnect does not fan out hundreds of requests.
    for(let start=0;start<days.length;start+=7){
      await Promise.all(days.slice(start,start+7).map(async date=>{
        const index=await fb.getDoc(fb.doc(fb.db,'production','sellerOrderDays','days',date));
        if(!index.exists())return;
        const dayIndex=index.data();
        if(!Array.isArray(dayIndex.chunks))throw new Error('ORDER_SNAPSHOT_INVALID');
        const chunks=await Promise.all(dayIndex.chunks.map(chunkId=>fb.getDoc(fb.doc(fb.db,'production','sellerOrderSnapshots','chunks',chunkId))));
        for(const chunk of chunks){
          if(!chunk.exists()||chunk.data().syncedAt!==dayIndex.syncedAt)throw new Error('ORDER_SNAPSHOT_INCOMPLETE');
          orders.push(...(chunk.data().orders||[]));returns.push(...(chunk.data().returns||[]));
        }
      }));
    }
    if(sequence!==orderLoadSequence||!isProductionAdmin())return;
    if (orders.length === 0 && typeof productionApiFetch === 'function') {
      try {
        const snapRes = await productionApiFetch('/api/tiktok/snapshot/latest');
        if (snapRes.ok) {
          const snapData = await snapRes.json();
          if (snapData && Array.isArray(snapData.orders) && snapData.orders.length > 0) {
            orders.push(...snapData.orders.filter(o => o.date >= from && o.date <= to));
            if (Array.isArray(snapData.returns)) {
              returns.push(...snapData.returns.filter(r => r.date >= from && r.date <= to));
            }
          }
        }
      } catch {}
    }
    if(state.from!==from||state.to!==to)return loadSellerOrderRange(state.from,state.to);
    orders.sort((a,b)=>(b.date+' '+b.time).localeCompare(a.date+' '+a.time));
    const prepared=prepareSellerSnapshot(state.sessions||[],orders,returns,from,to,state.lastOrderSync||new Date().toISOString());
    state.sessions=prepared.sessions;
    applySellerOrderView(prepared.orders,prepared.returns);orderViewRange=from+':'+to;return true;
  }catch{if(sequence===orderLoadSequence)orderSyncMessage='Chưa tải được dữ liệu đơn hàng. Vui lòng kiểm tra kết nối mạng và thử lại.';return false;}
  finally{if(sequence===orderLoadSequence){orderDataLoading=false;orderLoadingRange='';renderOrderSyncStatus();}}
}

function refreshSellerOrderView() {
  const requested=state.from+':'+state.to;
  if(!isAdmin()||(orderDataLoading?orderLoadingRange===requested:orderViewRange===requested))return;
  void loadSellerOrderRange(state.from,state.to).then(loaded=>{if(loaded!==undefined)renderAll();});
}

async function collectSellerSnapshot(from,to,onProgress=()=>{}){
  const orders=new Map(),returns=new Map(),ledger=new Map();
  const asOf=Math.floor(Date.now()/1000);
  let syncedAt='',shopId='';
  const add=(map,key,row)=>{
    const previous=map.get(key);
    if(previous&&JSON.stringify(previous)!==JSON.stringify(row))throw Error('TIKTOK_ORDERS_CHANGED_DURING_SYNC');
    map.set(key,row);
  };
  async function collect(stage,orderIds){
    let cursor='',expected;const seen=new Set(),received=new Set();
    do{
      let response, page;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await productionApiFetch('/api/tiktok/orders/sync', {
            method: 'POST',
            body: JSON.stringify({ from, to, stage, asOf, ...(cursor ? { cursor } : {}), ...(orderIds ? { orderIds } : {}) }),
            signal: AbortSignal.timeout(90000)
          });
          page = await parseTikTokApiResponse(response);
          break;
        } catch (fetchErr) {
          const isAbort = fetchErr?.name === 'AbortError' || fetchErr?.name === 'TimeoutError' || String(fetchErr?.message || '').toLowerCase().includes('abort');
          if (attempt === 0 && isAbort) {
            orderSyncMessage = 'TikTok phản hồi chậm, đang tự động thử lại…';
            renderOrderSyncStatus();
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          throw fetchErr;
        }
      }
      if(page.from!==from||page.to!==to||page.stage!==stage||!page.syncedAt||!Array.isArray(page.orders)||!Array.isArray(page.returns)||!Array.isArray(page.ledger)||typeof page.complete!=='boolean'||(page.nextCursor!==null&&typeof page.nextCursor!=='string')||page.complete!==!page.nextCursor)throw Error('TIKTOK_ORDERS_RESPONSE_INVALID');
      if(shopId&&shopId!==page.shopId)throw Error('TIKTOK_MULTIPLE_SHOPS');
      if(Number.isFinite(page.totalCount)){
        if(expected!==undefined&&expected!==page.totalCount)throw Error('TIKTOK_ORDERS_CHANGED_DURING_SYNC');
        expected=page.totalCount;
      }
      shopId=page.shopId;syncedAt=page.syncedAt;
      page.orders.forEach(row=>add(orders,row.orderId,row));
      page.returns.forEach(row=>add(returns,row.returnId,row));
      page.ledger.forEach(row=>add(ledger,row.returnId,row));
      (stage==='orders'?page.orders:stage==='returns'?page.returns:page.ledger).forEach(row=>received.add(stage==='orders'?row.orderId:row.returnId));
      onProgress(stage,orders.size,returns.size);
      if(expected!==undefined&&received.size>=expected){
        if(received.size!==expected)throw Error('TIKTOK_ORDERS_CHANGED_DURING_SYNC');
        break;
      }
      cursor=page.nextCursor||'';
      if(cursor&&seen.has(cursor))throw Error('TIKTOK_ORDERS_PAGINATION_INVALID');
      seen.add(cursor);
    }while(cursor);
    if(expected!==undefined&&received.size!==expected)throw Error('TIKTOK_ORDERS_DETAIL_INCOMPLETE');
  }
  await collect('orders');await collect('returns');
  const ids=[...orders.keys()];
  for(let offset=0;offset<ids.length;offset+=50)await collect('refunds',ids.slice(offset,offset+50));
  const refunded=new Map();
  ledger.forEach(row=>{if(row.refundConfirmed)refunded.set(row.orderId,(refunded.get(row.orderId)||0)+Math.round(row.returnAmount*100));});
  orders.forEach(row=>{row.refund=(refunded.get(row.orderId)||0)/100;row.refundsComplete=true;});
  const parsedSynced=Date.parse(syncedAt);
  const watermark=Number.isFinite(parsedSynced)?new Date(Math.min(parsedSynced,asOf*1000)).toISOString():syncedAt;
  return {from,to,syncedAt:watermark,shopId,orders:[...orders.values()],returns:[...returns.values()]};
}

async function syncTikTokOrders(from,to,inPipeline=false){
  if(!isAdmin()||orderSyncInProgress||(!inPipeline&&(liveSyncInProgress||affiliateSyncInProgress)))return false;
  if(!from||!to){const range=typeof tiktokIncrementalSyncWindow==='function'?tiktokIncrementalSyncWindow():tiktokSyncWindow();from||=range.from;to||=range.to;}
  orderSyncInProgress=true;orderSyncMessage='Đang lấy đơn từ Seller, gồm đơn LIVE và ngoài LIVE…';renderOrderSyncStatus();
  try{
    if(!from||!to||from>to||!Number.isFinite(Date.parse(from))||Date.parse(to)-Date.parse(from)>30*86400000)throw Error('LIVE_DATE_RANGE_INVALID');
    const data=await collectSellerSnapshot(from,to,(stage,orders,returns)=>{
      const phase={orders:'Lấy đơn và chi tiết giao hàng',returns:'Lấy yêu cầu hoàn',refunds:'Kiểm tra sổ hoàn tiền từng nhóm đơn'}[stage];
      orderSyncMessage=phase+': '+orders+' đơn, '+returns+' yêu cầu hoàn. Đang phân trang, chưa ghi đè dữ liệu cũ…';renderOrderSyncStatus();
    });
    orderSyncMessage='Đã lấy đủ dữ liệu, đang lưu trữ và bảo vệ dữ liệu…';renderOrderSyncStatus();
    await saveProductionSellerSnapshot(data);
    const loaded=await loadSellerOrderRange(state.from,state.to);
    if(loaded===false){orderSyncMessage='Đã lưu dữ liệu thành công. Vui lòng làm mới trang nếu dữ liệu chưa hiển thị.';return false;}
    const organic=data.orders.filter(order=>order.attribution==='NON_LIVE').length;
    const unknown=data.orders.filter(order=>['UNKNOWN','MIXED'].includes(order.attribution)).length;
    const liveCount=data.orders.length - organic - unknown;
    orderSyncMessage='Đã lưu '+data.orders.length+' đơn ('+liveCount+' trong LIVE, '+organic+' ngoài LIVE'+'), '+data.returns.length+' yêu cầu hoàn. KPI sẵn sàng đối soát.';
    if (typeof dispatchNotification === 'function' && data.orders.length > 0) {
      const totalGmv = data.orders.reduce((acc, o) => acc + (typeof getOrderAmount === 'function' ? getOrderAmount(o) : (Number(o.amount ?? o.paidTotal ?? o.orderAmount ?? o.gmv) || 0)), 0);
      dispatchNotification(
        '🛍️ Cập nhật đơn hàng Seller mới',
        `Đã đồng bộ ${data.orders.length} đơn hàng (${organic} đơn ngoài LIVE) · Doanh số: ${typeof short === 'function' ? short(totalGmv) : totalGmv}`
      );
    }
    return true;
  }catch(error){
    const messages={
      ADMIN_REQUIRED:'Chỉ tài khoản Admin chính (sellerhunghienhoa@gmail.com) mới được phép đồng bộ API TikTok.',
      LIVE_DATE_RANGE_INVALID:'Chọn khoảng ngày hợp lệ, tối đa 31 ngày.',
      TIKTOK_ORDERS_SCOPE_MISSING:'Seller thiếu seller.order.info. Bật Order Information và ủy quyền lại Seller.',
      TIKTOK_RETURNS_SCOPE_MISSING:'Seller thiếu seller.return_refund.basic. Bật Return and Refund và ủy quyền lại Seller.',
      TIKTOK_SELLER_NOT_CONNECTED:'Cần kết nối Seller của Shop Khang Baby.',
      TIKTOK_MULTIPLE_SHOPS:'Dữ liệu thuộc nhiều shop; cần ủy quyền đúng Shop Khang Baby.',
      TIKTOK_ORDERS_CURRENCY_UNSUPPORTED:'Đơn/hoàn không dùng VND; chưa nhập để tránh sai tiền.',
      TIKTOK_ORDERS_DETAIL_INCOMPLETE:'TikTok chưa trả đủ chi tiết đơn; đồng bộ lại.',
      TIKTOK_ORDERS_SNAPSHOT_LIMIT:'Một khối dữ liệu vượt giới hạn Firestore; chưa công bố bản mới.',
      TIKTOK_ORDERS_STATE_CHANGED:'Phân công hoặc số chốt phiên vừa thay đổi khi đồng bộ. Bấm đồng bộ lại để dùng bản mới nhất.',
      TIKTOK_ORDERS_CHANGED_DURING_SYNC:'TikTok thay đổi dữ liệu trong lúc phân trang. Bấm đồng bộ lại.',
      TIKTOK_ORDERS_PAGINATION_INVALID:'TikTok lặp con trỏ phân trang; dừng để tránh cộng trùng. Thử lại sau.',
      TIKTOK_ORDERS_TIMEOUT:'TikTok phản hồi chậm. Thử lại khoảng ngắn hơn.',
      TIKTOK_ORDERS_RESPONSE_INVALID:'TikTok thiếu trường bắt buộc hoặc sai định dạng; chưa lưu bản thiếu.',
      TIKTOK_RATE_LIMITED:'TikTok giới hạn yêu cầu. Thử lại sau.',
      'Fetch is aborted':'Kết nối mạng bị gián đoạn hoặc TikTok phản hồi quá lâu. Vui lòng bấm đồng bộ lại hoặc chọn khoảng ngày ngắn hơn.',
      'The operation was aborted':'Kết nối mạng bị gián đoạn hoặc TikTok phản hồi quá lâu. Vui lòng bấm đồng bộ lại hoặc chọn khoảng ngày ngắn hơn.',
      AbortError:'Kết nối mạng bị gián đoạn hoặc TikTok phản hồi quá lâu. Vui lòng bấm đồng bộ lại hoặc chọn khoảng ngày ngắn hơn.',
      TimeoutError:'TikTok phản hồi quá lâu. Vui lòng bấm đồng bộ lại hoặc chọn khoảng ngày ngắn hơn.'
    };
    const errKey = messages[error?.message] ? error.message : (error?.name && messages[error.name]) ? error.name : (error?.message || 'SYNC_FAILED');
    orderSyncMessage = (messages[errKey] || `Chưa đồng bộ được đơn (${errKey}).`) + ' Dữ liệu cũ được giữ nguyên.';
    toast(orderSyncMessage);return false;
  }finally{orderSyncInProgress=false;renderAll();renderOrderSyncStatus();}
}

function syncRecentTikTokOrders() {
  const today=orderVietnamDate(Date.now());
  return syncTikTokOrders(addDays(today,-1),today);
}

function orderSyncStatusText() {
  if(typeof isProductionAdmin==='function'&&!isProductionAdmin())return 'Chỉ tài khoản Admin chính (sellerhunghienhoa@gmail.com) có quyền xem và đồng bộ dữ liệu đơn Seller.';
  if(orderDataLoading)return 'Đang tải dữ liệu đơn hàng…';
  if(orderSyncInProgress)return orderSyncMessage||'Đang đồng bộ đơn hàng từ TikTok Seller…';
  return orderSyncMessage||(state.lastOrderSync?`Đã đồng bộ: ${new Date(state.lastOrderSync).toLocaleString('vi-VN')}.`:'Chưa có lần đồng bộ đơn/hoàn. Hệ thống sẽ tự chạy mỗi ngày.');
}

function orderEmptyStateText(fallback) {
  if((typeof isProductionAdmin==='function'&&!isProductionAdmin())||orderDataLoading||orderSyncInProgress)return orderSyncStatusText();
  return fallback;
}

function renderOrderSyncStatus() {
  const busy=orderSyncInProgress||liveSyncInProgress||affiliateSyncInProgress||(typeof isProductionAdmin==='function'&&!isProductionAdmin());
  const text=orderSyncStatusText();
  document.querySelectorAll('[data-order-sync],[data-quick-order-sync]').forEach(button=>{button.disabled=busy;button.setAttribute('aria-busy',String(orderSyncInProgress));});
  document.querySelectorAll('[data-live-sync]').forEach(button=>{button.disabled=busy;});
  document.querySelectorAll('[data-order-sync-status]').forEach(node=>node.textContent=text);
  const autoRecBadge=typeof document?.getElementById==='function'?document.getElementById('sesAutoRecBadge'):null;
  const autoRecText=typeof document?.getElementById==='function'?document.getElementById('sesAutoRecText'):null;
  if(autoRecBadge&&autoRecText){
    autoRecBadge.disabled=busy;
    if(orderSyncInProgress){
      autoRecText.textContent='Đang tự động đối soát đơn hàng…';
    }else if(state.lastOrderSync){
      const timeStr=new Date(state.lastOrderSync).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
      autoRecText.textContent=`Tự động đối soát khi nhận hàng (Cập nhật ${timeStr})`;
    }else{
      autoRecText.textContent='Tự động đối soát 24/24 khi nhận hàng';
    }
  }
}

async function manualTriggerOrderSync() {
  if (typeof isProductionAdmin === 'function' && !isProductionAdmin()) {
    toast('Chỉ tài khoản Admin chính (sellerhunghienhoa@gmail.com) mới được phép đồng bộ.');
    return;
  }
  if (orderSyncInProgress) return;
  const badge = typeof document?.getElementById==='function'?document.getElementById('sesAutoRecText'):null;
  if (badge) badge.textContent = 'Đang kiểm tra và đối soát đơn…';
  const today = orderVietnamDate(Date.now());
  const from = (typeof state !== 'undefined' && state.from && state.from <= today) ? state.from : (typeof addDays === 'function' ? addDays(today, -14) : today);
  const to = (typeof state !== 'undefined' && state.to && state.to <= today) ? state.to : today;
  toast('Đang kiểm tra trạng thái giao hàng và đối soát...');
  const ok = await syncTikTokOrders(from, to);
  if (ok) toast('Đã hoàn tất kiểm tra và cập nhật đối soát đơn hàng.');
}
