let orderSyncInProgress = false;
let orderDataLoading = false;
let orderSyncMessage = '';
let orderViewRange = '';
let orderLoadSequence = 0;

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
      const response=await productionApiFetch('/api/tiktok/orders/sync',{method:'POST',body:JSON.stringify({from,to,stage,asOf,...(cursor?{cursor}:{}),...(orderIds?{orderIds}:{})}),signal:AbortSignal.timeout(60000)});
      const page=await parseTikTokApiResponse(response);
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
  return {from,to,syncedAt,shopId,orders:[...orders.values()],returns:[...returns.values()]};
}

async function syncTikTokOrders(from,to,inPipeline=false){
  if(!isAdmin()||orderSyncInProgress||(!inPipeline&&(liveSyncInProgress||affiliateSyncInProgress)))return false;
  if(!from||!to){const range=tiktokSyncWindow();from||=range.from;to||=range.to;}
  orderSyncInProgress=true;orderSyncMessage='Đang lấy đơn từ Seller, gồm đơn LIVE và ngoài LIVE…';renderOrderSyncStatus();
  try{
    if(!from||!to||from>to||!Number.isFinite(Date.parse(from))||Date.parse(to)-Date.parse(from)>30*86400000)throw Error('LIVE_DATE_RANGE_INVALID');
    const data=await collectSellerSnapshot(from,to,(stage,orders,returns)=>{
      const phase={orders:'Lấy đơn và chi tiết giao hàng',returns:'Lấy yêu cầu hoàn',refunds:'Kiểm tra sổ hoàn tiền từng nhóm đơn'}[stage];
      orderSyncMessage=phase+': '+orders+' đơn, '+returns+' yêu cầu hoàn. Đang phân trang, chưa ghi đè dữ liệu cũ…';renderOrderSyncStatus();
    });
    orderSyncMessage='Đã lấy đủ dữ liệu, đang lưu vào Firebase…';renderOrderSyncStatus();
    await saveProductionSellerSnapshot(data);
    const loaded=await loadSellerOrderRange(state.from,state.to);
    if(!loaded){orderSyncMessage='Đã lưu vào Firebase nhưng chưa đọc lại được. Tải lại trang để đọc bản đã lưu.';return false;}
    const organic=data.orders.filter(order=>order.attribution==='NON_LIVE').length;
    const unknown=data.orders.filter(order=>['UNKNOWN','MIXED'].includes(order.attribution)).length;
    orderSyncMessage='Đã lưu '+data.orders.length+' đơn ('+organic+' ngoài LIVE; '+unknown+' chưa rõ nguồn), '+data.returns.length+' yêu cầu hoàn. KPI chỉ cập nhật khi LIVE ID và tổng GMV khớp phiên.';
    return true;
  }catch(error){
    const messages={
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
      TIKTOK_RATE_LIMITED:'TikTok giới hạn yêu cầu. Thử lại sau.'
    };
    orderSyncMessage=(messages[error.message]||'Chưa đồng bộ được đơn ('+(error.message||'SYNC_FAILED')+').')+' Dữ liệu cũ được giữ nguyên.';
    toast(orderSyncMessage);return false;
  }finally{orderSyncInProgress=false;renderAll();renderOrderSyncStatus();}
}

function renderOrderSyncStatus() {
  document.querySelectorAll('[data-order-sync]').forEach(button=>{button.disabled=orderSyncInProgress||liveSyncInProgress||affiliateSyncInProgress;button.setAttribute('aria-busy',String(orderSyncInProgress));});
  document.querySelectorAll('[data-order-sync-status]').forEach(node=>node.textContent=orderDataLoading?'Đang đọc dữ liệu đơn từ Firebase…':orderSyncMessage|| (state.lastOrderSync?`Đã đồng bộ: ${new Date(state.lastOrderSync).toLocaleString('vi-VN')}.`:'Chưa đồng bộ đơn/hoàn. Chọn ngày rồi bấm Đồng bộ đơn & hoàn.'));
}
