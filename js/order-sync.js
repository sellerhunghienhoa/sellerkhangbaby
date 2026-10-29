let orderSyncInProgress = false;
let orderDataLoading = false;
let orderSyncMessage = '';
let orderViewRange = '';
let orderLoadSequence = 0;

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
    const matches=order.attribution==='LIVE'&&order.roomIds?.length===1?updatedSessions.filter(s=>s.tiktokLiveId===order.roomIds[0]&&s.tiktokShopId===order.tiktokShopId):[];
    const session=matches.length===1?matches[0]:null;
    return {...order,sessionId:session?.id||'',channel:session?.channel||'shopkhangbaby',kpiRule:session?'Khớp LIVE ID từ API':order.attribution==='NON_LIVE'?'Ngoài LIVE · 0% KPI':'Chưa xác minh phiên · chưa tính KPI'};
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
  updatedSessions.forEach(session=>{
    const group=linked.filter(order=>order.sessionId===session.id);
    if(!group.length||session.date<from||session.date>to)return;
    const eligible=group.filter(order=>order.status!=='UNPAID');
    const total=eligible.reduce((sum,order)=>sum+cents(order.amount),0);
    const expected=cents(session.tiktokReportedGmv??session.grossLiveGmv);
    const verified=eligible.length>0&&total===expected&&group.every(order=>order.status!=='UNKNOWN'&&!order.refundMismatch)&&!session.isManualKpi&&!session.affiliateGmv&&(session.pendingRecGmv>0||session.orderReconciliationManaged);
    const delivered=eligible.filter(o=>o.status==='DELIVERED').reduce((sum,o)=>sum+cents(o.amount-o.refund),0);
    const pending=eligible.filter(o=>['SHIPPING','PENDING'].includes(o.status)).reduce((sum,o)=>sum+cents(o.amount-o.refund),0);
    const cancelled=eligible.reduce((sum,o)=>sum+cents(['RETURNED','CANCELLED'].includes(o.status)?o.amount:o.refund),0);
    // Only a complete refund ledger and matching financial totals may change LIVE KPI.
    const complete=verified&&group.every(order=>order.refundsComplete===true)&&delivered+pending+cancelled===total;
    session.orderSync={syncedAt,matchedOrders:group.length,deliveredGmv:delivered/100,pendingGmv:pending/100,refundGmv:cancelled/100,verified:complete};
    if(complete){session.grossLiveGmv=total/100;session.pendingRecGmv=pending/100;session.cancelReturnGmv=cancelled/100;session.orderReconciliationManaged=true;}
  });
  linkedReturns.forEach(row=>{row.reflectedInSession=!!updatedSessions.find(s=>s.id===row.sessionId&&s.orderSync?.verified&&s.orderSync.syncedAt===syncedAt);});
  return {orders:linked,returns:linkedReturns,sessions:updatedSessions};
}

function applySellerOrderView(orders,returns) {
  const byId=new Map(state.orders.filter(row=>row.provider!=='TIKTOK_API').map(row=>[row.orderId,row]));
  orders.forEach(row=>byId.set(row.orderId,row));state.orders=[...byId.values()];
  const organic=new Map(state.shopOrders.filter(row=>row.provider!=='TIKTOK_API').map(row=>[row.orderId,row]));
  orders.filter(row=>row.attribution==='NON_LIVE').forEach(row=>organic.set(row.orderId,{...row,source:'UNKNOWN_NON_LIVE',kpiRule:'0% LIVE KPI'}));
  state.shopOrders=[...organic.values()];
  const returnMap=new Map(state.returns15d.filter(row=>row.provider!=='TIKTOK_API').map(row=>[row.returnId,row]));
  returns.forEach(row=>returnMap.set(row.returnId,row));state.returns15d=[...returnMap.values()];
}

async function loadSellerOrderRange(from,to) {
  if(!isProductionAdmin())return;
  const sequence=++orderLoadSequence;orderDataLoading=true;
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
        for(const chunkId of dayIndex.chunks){
          const chunk=await fb.getDoc(fb.doc(fb.db,'production','sellerOrderSnapshots','chunks',chunkId));
          if(!chunk.exists()||chunk.data().syncedAt!==dayIndex.syncedAt)throw new Error('ORDER_SNAPSHOT_INCOMPLETE');
          orders.push(...(chunk.data().orders||[]));returns.push(...(chunk.data().returns||[]));
        }
      }));
    }
    if(sequence!==orderLoadSequence||!isProductionAdmin()||state.from!==from||state.to!==to)return;
    orders.sort((a,b)=>(b.date+' '+b.time).localeCompare(a.date+' '+a.time));
    applySellerOrderView(orders,returns);orderViewRange=from+':'+to;return true;
  }catch{if(sequence===orderLoadSequence)orderSyncMessage='Chưa đọc được đơn từ Firebase. Kiểm tra kết nối và quyền đọc production/sellerOrderDays, production/sellerOrderSnapshots.';return false;}
  finally{if(sequence===orderLoadSequence)orderDataLoading=false;}
}

function refreshSellerOrderView() {
  if(!isAdmin()||orderDataLoading||orderViewRange===state.from+':'+state.to)return;
  const requested=state.from+':'+state.to;
  void loadSellerOrderRange(state.from,state.to).then(()=>{renderAll();if(requested!==state.from+':'+state.to)refreshSellerOrderView();});
}

async function syncTikTokOrders(from,to) {
  if(!isAdmin()||orderSyncInProgress)return;
  from ||= document.getElementById('liveSyncFrom').value;to ||= document.getElementById('liveSyncTo').value;
  orderSyncInProgress=true;orderSyncMessage='Đang lấy đơn, yêu cầu hoàn và chi tiết giao hàng từ TikTok…';renderOrderSyncStatus();
  try{
    if(!from||!to||from>to||Date.parse(to)-Date.parse(from)>30*86400000)throw new Error('LIVE_DATE_RANGE_INVALID');
    const response=await productionApiFetch('/api/tiktok/orders/sync',{method:'POST',body:JSON.stringify({from,to}),signal:AbortSignal.timeout(120000)});
    const data=await parseTikTokApiResponse(response);
    if(!Array.isArray(data.orders)||!Array.isArray(data.returns)||data.from!==from||data.to!==to||!data.syncedAt)throw new Error('TIKTOK_ORDERS_RESPONSE_INVALID');
    await saveProductionSellerSnapshot(data);
    const loaded=await loadSellerOrderRange(state.from,state.to);
    if(!loaded){orderSyncMessage='Đã lưu đơn vào Firebase nhưng chưa đọc lại được. Tải lại trang và kiểm tra kết nối; dữ liệu đã lưu được giữ nguyên.';toast(orderSyncMessage);return;}
    const unknown=data.orders.filter(order=>['UNKNOWN','MIXED'].includes(order.attribution)).length;
    orderSyncMessage=`Đã lưu ${data.orders.length} đơn và ${data.returns.length} yêu cầu hoàn (${fmtDs(from)} → ${fmtDs(to)}). ${unknown} đơn chưa rõ nguồn. KPI chỉ cập nhật khi đủ đơn, sổ hoàn tiền và tổng GMV khớp phiên.`;
    toast('Đã đồng bộ đơn và yêu cầu hoàn từ TikTok.');
  }catch(error){
    const messages={LIVE_DATE_RANGE_INVALID:'Chọn khoảng ngày hợp lệ, tối đa 31 ngày.',TIKTOK_ORDERS_SCOPE_MISSING:'Seller thiếu seller.order.info. Bật quyền Order Information và ủy quyền lại Seller.',TIKTOK_RETURNS_SCOPE_MISSING:'Seller thiếu seller.return_refund.basic. Bật Return and Refund và ủy quyền lại Seller.',TIKTOK_SELLER_NOT_CONNECTED:'Cần kết nối Seller của Shop Khang Baby.',TIKTOK_MULTIPLE_SHOPS:'Seller cấp quyền nhiều shop. Cần xác định đúng Shop Khang Baby.',TIKTOK_ORDERS_RANGE_TOO_LARGE:'Khoảng chọn vượt 1.000 đơn hoặc 250 yêu cầu hoàn. Chọn từng ngày/tuần để nhập đủ dữ liệu.',TIKTOK_ORDERS_CURRENCY_UNSUPPORTED:'Đơn/hoàn không dùng VND; chưa nhập để tránh sai tiền.',TIKTOK_ORDERS_DETAIL_INCOMPLETE:'TikTok chưa trả đủ chi tiết đơn. Chưa lưu; hãy đồng bộ lại.',TIKTOK_ORDERS_SNAPSHOT_LIMIT:'Dữ liệu một ngày vượt giới hạn lưu trữ. Chưa ghi đè dữ liệu cũ.',TIKTOK_ORDERS_TIMEOUT:'TikTok phản hồi chậm. Hãy chọn khoảng ngắn hơn.',TIKTOK_ORDERS_RESPONSE_INVALID:'Phản hồi đơn/hoàn thiếu hoặc sai định dạng; chưa ghi đè dữ liệu cũ.'};
    orderSyncMessage=(messages[error.message]||`Chưa đồng bộ được đơn (${error.message||'SYNC_FAILED'}). Dữ liệu cũ được giữ nguyên.`);toast(orderSyncMessage);
  }finally{orderSyncInProgress=false;renderAll();renderOrderSyncStatus();}
}

function renderOrderSyncStatus() {
  document.querySelectorAll('[data-order-sync]').forEach(button=>{button.disabled=orderSyncInProgress;button.setAttribute('aria-busy',String(orderSyncInProgress));});
  document.querySelectorAll('[data-order-sync-status]').forEach(node=>node.textContent=orderDataLoading?'Đang đọc dữ liệu đơn từ Firebase…':orderSyncMessage|| (state.lastOrderSync?`Đã đồng bộ: ${new Date(state.lastOrderSync).toLocaleString('vi-VN')}.`:'Chưa đồng bộ đơn/hoàn. Chọn ngày rồi bấm Đồng bộ đơn & hoàn.'));
}
