let affiliateSyncInProgress = false;
let affiliateSyncMessage = '';
const CREATOR_CHANNELS=['shopkhangbaby','mekhangsua'];

function mergeAffiliateDays(existing,incoming){
  const days=new Map((existing||[]).map(day=>[day.channel+':'+day.date,{...day}]));
  incoming.forEach(day=>days.set(day.channel+':'+day.date,{...day}));
  return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

function affiliateOverviewSummary(){
  const channel=document.getElementById('fChannel')?.value||'ALL';
  const staff=document.getElementById('fStaff')?.value||'ALL';
  if(!isAdmin()||staff!=='ALL')return {available:false,reason:'Chưa phân bổ dữ liệu Creator theo nhân sự.'};
  const channels=channel==='ALL'?CREATOR_CHANNELS:[channel];
  const days=(state.affiliateDaily||[]).filter(day=>channels.includes(day.channel)&&day.date>=state.from&&day.date<=state.to);
  const sum=field=>days.reduce((total,day)=>total+(Number(day[field])||0),0);
  const commissionAvailable=days.every(day=>day.commissionAvailable!==false&&day.settledCommission!==null);
  const measured=channels.filter(value=>days.some(day=>day.channel===value));
  return {available:days.length>0,reason:'Chưa đồng bộ Affiliate của Creator trong khoảng ngày chọn.',channels:measured.join(' · ')+(measured.length<channels.length?' · Còn thiếu '+channels.filter(value=>!measured.includes(value)).join(', '):''),gmv:sum('gmv'),commissionAvailable,commission:commissionAvailable?sum('settledCommission'):null,liveGmv:sum('liveGmv'),videoGmv:sum('videoGmv'),refundedGmv:sum('refundedGmv'),orderCount:sum('orderCount'),days:days.length,totalDays:(Math.round((Date.parse(state.to)-Date.parse(state.from))/86400000)+1)*channels.length};
}

function renderAffiliateSyncStatus(){
  document.querySelectorAll('[data-affiliate-sync]').forEach(button=>{button.disabled=affiliateSyncInProgress||liveSyncInProgress||orderSyncInProgress;button.setAttribute('aria-busy',String(affiliateSyncInProgress));});
  document.getElementById('affiliateSyncResult').textContent=affiliateSyncMessage;
}

async function collectAffiliateDays(from,to,creator){
  const rows=new Map();let cursor='',syncedAt='',expected;const seen=new Set();
  const asOf=Math.floor(Date.now()/1000);
  do{
    const response=await productionApiFetch('/api/tiktok/affiliate/sync',{method:'POST',body:JSON.stringify({from,to,creator,paged:true,asOf,...(cursor?{cursor}:{})}),signal:AbortSignal.timeout(60000)});
    const page=await parseTikTokApiResponse(response);
    if(!Array.isArray(page.rows)||page.from!==from||page.to!==to||page.creator!==creator||!page.syncedAt||typeof page.complete!=='boolean'||(page.nextCursor!==null&&typeof page.nextCursor!=='string')||page.complete!==!page.nextCursor)throw Error('TIKTOK_AFFILIATE_RESPONSE_INVALID');
    if(Number.isSafeInteger(page.totalCount)){
      if(expected!==undefined&&expected!==page.totalCount)throw Error('TIKTOK_AFFILIATE_CHANGED_DURING_SYNC');
      expected=page.totalCount;
    }
    for(const row of page.rows){
      if(typeof row.key!=='string'||!Number.isSafeInteger(row.gmv)||row.gmv<0||!Number.isSafeInteger(row.commission)||row.commission<0||row.date<from||row.date>to)throw Error('TIKTOK_AFFILIATE_RESPONSE_INVALID');
      if(rows.has(row.key)&&JSON.stringify(rows.get(row.key))!==JSON.stringify(row))throw Error('TIKTOK_AFFILIATE_CHANGED_DURING_SYNC');
      rows.set(row.key,row);
    }
    syncedAt=page.syncedAt;cursor=page.nextCursor||'';
    affiliateSyncMessage='Đang lấy Affiliate '+creator+': '+rows.size+' SKU. Chưa ghi đè dữ liệu cũ…';renderAffiliateSyncStatus();
    if(expected!==undefined&&rows.size>=expected){if(rows.size!==expected)throw Error('TIKTOK_AFFILIATE_CHANGED_DURING_SYNC');break;}
    if(cursor&&seen.has(cursor))throw Error('TIKTOK_AFFILIATE_PAGINATION_INVALID');
    seen.add(cursor);
  }while(cursor);
  if(expected!==undefined&&rows.size!==expected)throw Error('TIKTOK_AFFILIATE_RESPONSE_INVALID');
  const days=new Map(sellerRangeDates(from,to).map(date=>[date,{date,channel:creator,gmv:0,liveGmv:0,videoGmv:0,otherGmv:0,refundedGmv:0,settledCommission:0,commissionAvailable:true,orderCount:0,skuCount:0,currency:'VND',syncedAt}]));
  const orderIds=new Map([...days.keys()].map(date=>[date,new Set()]));
  rows.forEach(row=>{
    if(!['SETTLED','TO_SETTLE','REFUNDED'].includes(row.status))return;
    const day=days.get(row.date);
    if(!day)throw Error('TIKTOK_AFFILIATE_RESPONSE_INVALID');
    day.gmv+=row.gmv;day[row.type==='LIVE'?'liveGmv':row.type==='VIDEO'?'videoGmv':'otherGmv']+=row.gmv;
    if(row.status==='REFUNDED')day.refundedGmv+=row.gmv;
    day.settledCommission+=row.commission;day.commissionAvailable&&=row.commissionAvailable;day.skuCount++;
    orderIds.get(row.date).add(row.orderId);
  });
  days.forEach(day=>{for(const key of ['gmv','liveGmv','videoGmv','otherGmv','refundedGmv','settledCommission']){if(!Number.isSafeInteger(day[key]))throw Error('TIKTOK_AFFILIATE_RESPONSE_INVALID');day[key]/=100;}if(!day.commissionAvailable)day.settledCommission=null;day.orderCount=orderIds.get(day.date).size;});
  return {days:[...days.values()],syncedAt};
}

async function syncTikTokAffiliateOrders(from,to,creator='ALL',inPipeline=false){
  if(!isAdmin()||affiliateSyncInProgress||(!inPipeline&&(liveSyncInProgress||orderSyncInProgress)))return false;
  from ||= document.getElementById('liveSyncFrom').value;to ||= document.getElementById('liveSyncTo').value;
  affiliateSyncInProgress=true;affiliateSyncMessage='Đang lấy GMV từ các tài khoản TikTok Creator…';renderAffiliateSyncStatus();
  const messages={
    LIVE_DATE_RANGE_INVALID:'Chọn khoảng ngày hợp lệ, tối đa 31 ngày.',
    TIKTOK_CREATOR_NOT_CONNECTED:'Chưa kết nối Creator. Bấm Kết nối Creator của đúng kênh; token Seller không thay thế Creator.',
    TIKTOK_AFFILIATE_SCOPE_MISSING:'Thiếu creator.affiliate_collaboration.read; bật quyền và ủy quyền lại Creator.',
    TIKTOK_CREATOR_PROFILE_SCOPE_MISSING:'Thiếu creator.affiliate.info để xác minh tài khoản; bật quyền và ủy quyền lại.',
    TIKTOK_CREATOR_ACCOUNT_MISMATCH:'Sai tài khoản Creator; ủy quyền lại đúng kênh ghi trên thẻ.',
    TIKTOK_AFFILIATE_PRICE_INVALID:'Giá SKU TikTok trả về thiếu/sai định dạng; dữ liệu cũ giữ nguyên.',
    TIKTOK_AFFILIATE_COMMISSION_INVALID:'Hoa hồng TikTok trả về sai định dạng; dữ liệu cũ giữ nguyên.',
    TIKTOK_AFFILIATE_ORDER_INVALID:'TikTok trả mã hoặc ngày đơn không hợp lệ; dữ liệu cũ giữ nguyên.',
    TIKTOK_AFFILIATE_SKU_INVALID:'SKU hoặc số lượng TikTok trả về không hợp lệ; dữ liệu cũ giữ nguyên.',
    TIKTOK_AFFILIATE_STATUS_INVALID:'TikTok trả trạng thái đơn chưa hỗ trợ; chưa tính sai GMV.',
    TIKTOK_AFFILIATE_CURRENCY_UNSUPPORTED:'Đơn Affiliate không dùng VND; chưa nhập để tránh sai tiền.',
    TIKTOK_AFFILIATE_RESPONSE_INVALID:'Phản hồi Affiliate thiếu trường bắt buộc; dữ liệu cũ giữ nguyên.',
    TIKTOK_AFFILIATE_TIMEOUT:'TikTok phản hồi chậm; thử lại khoảng ngắn hơn.',
    TIKTOK_AFFILIATE_NETWORK_ERROR:'Chưa kết nối được TikTok; dữ liệu cũ giữ nguyên.',
    TIKTOK_AFFILIATE_CHANGED_DURING_SYNC:'Dữ liệu thay đổi khi phân trang; thử đồng bộ lại.',
    TIKTOK_AFFILIATE_RANGE_TOO_LARGE:'Quá nhiều SKU mỗi lần; chọn khoảng ngắn hơn.',
    TIKTOK_AFFILIATE_STORAGE_LIMIT:'Tổng hợp chạm giới hạn tài liệu; chưa ghi đè dữ liệu cũ.',
    TIKTOK_RATE_LIMITED:'TikTok giới hạn yêu cầu; thử lại sau.'
  };
  const results=[];
  try{
    if(!from||!to||from>to||!Number.isFinite(Date.parse(from))||Date.parse(to)-Date.parse(from)>30*86400000)throw Error('LIVE_DATE_RANGE_INVALID');
    for(const channel of creator==='ALL'?CREATOR_CHANNELS:[creator]){
      if(!CREATOR_CHANNELS.includes(channel))throw Error('TIKTOK_CREATOR_ACCOUNT_MISMATCH');
      try{
        const data=await collectAffiliateDays(from,to,channel);
        await saveProductionAffiliateDays(data.days,data.syncedAt);
        results.push({channel,ok:true,message:'Đã lưu Affiliate '+channel+' ('+fmtDs(from)+' → '+fmtDs(to)+').'});
      }catch(error){results.push({channel,ok:false,message:channel+': '+(messages[error.message]||'Chưa đồng bộ được ('+error.message+'). Dữ liệu cũ giữ nguyên.')});}
      affiliateSyncMessage=results.map(item=>item.message).join(' ');renderAffiliateSyncStatus();
    }
    return results.every(item=>item.ok);
  }catch(error){affiliateSyncMessage=messages[error.message]||error.message;return false;}
  finally{affiliateSyncInProgress=false;renderAll();renderAffiliateSyncStatus();}
}
