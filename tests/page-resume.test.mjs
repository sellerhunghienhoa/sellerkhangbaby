import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';

const source=await readFile(new URL('../js/page-resume.js',import.meta.url),'utf8');
function setup() {
  const calls={reload:0,loading:0,save:0,refresh:0,toast:0};
  let now=1_000_000;
  const events={};
  const context=createContext({
    Date:{now:()=>now},navigator:{onLine:true},state:{editingSessions:{}},
    document:{visibilityState:'visible',querySelector:()=>null,addEventListener:(name,fn)=>events[name]=fn},
    window:{location:{reload:()=>calls.reload++},addEventListener:(name,fn)=>events[name]=fn},
    productionSaveTimer:null,productionWriteChain:Promise.resolve(),
    setTimeout:()=>99,clearTimeout:()=>{},setAppLoading:()=>calls.loading++,toast:()=>calls.toast++,
    writeProductionState:async()=>calls.save++,refreshProductionSession:async()=>{calls.refresh++;return true;}
  });
  runInContext(source,context);
  const leave=milliseconds=>{context.document.visibilityState='hidden';events.visibilitychange();now+=milliseconds;context.document.visibilityState='visible';};
  return {context,calls,events,leave,resume:()=>runInContext('resumeStalePage()',context)};
}
test('returning after fifteen minutes refreshes data in place exactly once',async()=>{
  const app=setup();app.leave(14*60000);await app.resume();assert.equal(app.calls.refresh,0);
  app.leave(15*60000);await app.resume();await app.resume();assert.equal(app.calls.refresh,1);assert.equal(app.calls.reload,0);assert.equal(app.calls.loading,0);
});
test('offline return and active OAuth or edits defer the refresh until safe',async()=>{
  for(const kind of ['offline','modal','oauth','inline','sync','affiliate','orders']){
    const app=setup();
    if(kind==='offline')app.context.navigator.onLine=false;
    if(kind==='modal')app.context.document.querySelector=()=>({});
    if(kind==='oauth')app.context.tiktokAuthorizationWindow={closed:false};
    if(kind==='inline')app.context.state.editingSessions={session1:true};
    if(kind==='sync')app.context.liveSyncInProgress=true;
    if(kind==='affiliate')app.context.affiliateSyncInProgress=true;
    if(kind==='orders')app.context.orderSyncInProgress=true;
    app.leave(16*60000);await app.resume();assert.equal(app.calls.refresh,0,kind);
    app.context.navigator.onLine=true;app.context.document.querySelector=()=>null;app.context.tiktokAuthorizationWindow=null;app.context.state.editingSessions={};app.context.liveSyncInProgress=false;app.context.affiliateSyncInProgress=false;app.context.orderSyncInProgress=false;
    await app.resume();assert.equal(app.calls.refresh,1,kind);assert.equal(app.calls.reload,0,kind);
  }
});
test('queued saves finish before refresh and failed saves keep the page intact',async()=>{
  const app=setup();let finish;
  app.context.productionSaveTimer=55;
  app.context.writeProductionState=()=>{app.calls.save++;return new Promise(resolve=>finish=resolve);};
  app.leave(16*60000);const pending=app.resume();assert.equal(app.calls.refresh,0);finish();await pending;
  assert.equal(app.calls.save,1);assert.equal(app.calls.refresh,1);assert.equal(app.calls.reload,0);
  const failed=setup();failed.context.productionWriteChain=Promise.reject(new Error('offline'));
  failed.leave(16*60000);await failed.resume();assert.equal(failed.calls.reload,0);assert.equal(failed.calls.toast,1);
});
