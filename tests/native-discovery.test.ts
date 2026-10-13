import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicHost} from '../src/runtime/classic';
import {TranslationService} from '../src/core/service';
const CHANNEL='100000000000000001',ID='200000000000000001';
function fixture(late=false,cachedMiss=false,retain=false,reuse=false,alias=false){
 const record={id:ID,channel_id:CHANNEL,content:'Hello'};
 const nodes:any[]=['Hello',{type:'strong',content:['world']}];
 let ready=!late,translation:string|undefined='你好',selected=CHANNEL;
 const listeners=new Set<()=>void>(),events:any[]=[],considered:any[]=[];
 const retained:any[]=[];
 let cached:any;
 class RowManager{generate(data:any){const row=reuse&&cached?cached:{type:data.rowType,message:alias?data.message:{id:data.message.id,channelId:data.message.channel_id,content:nodes}};cached=row;if(retain)retained.push(row);return row;}}
 const original=RowManager.prototype.generate;
 const messageStore={getMessages:()=>({_array:[record]}),getMessage:(c:string,id:string)=>c===CHANNEL&&id===ID?record:undefined};
 const callbacks=new Map<string,Set<(e:any)=>void>>();
 const dispatcher={subscribe(n:string,cb:any){if(!callbacks.has(n))callbacks.set(n,new Set());callbacks.get(n)!.add(cb);},unsubscribe(n:string,cb:any){callbacks.get(n)?.delete(cb);},dispatch(e:any){events.push(e);callbacks.get(e.type)?.forEach(fn=>fn(e));}};
 const api={metro:{modules:{'71':{isInitialized:ready,publicModule:{exports:{default:RowManager,__esModule:true}}}},common:{React:{},ReactNative:{},FluxDispatcher:dispatcher},findByStoreName(n:string){return n==='MessageStore'?messageStore:n==='SelectedChannelStore'?{getChannelId:()=>selected}:undefined;},findByProps(){},findByName(n:string){return !cachedMiss&&n==='RowManager'&&ready?RowManager:undefined;},findByNameAll(n:string){return !cachedMiss&&n==='RowManager'&&ready?[RowManager]:[];}},patcher:{after(name:string,parent:any,cb:any){const fn=parent[name];parent[name]=function(...args:any[]){const result=fn.apply(this,args);return cb(args,result)??result;};return ()=>{parent[name]=fn;};}}};
 const source={getTranslation:()=>translation?{text:translation}:undefined,consider:(m:any)=>considered.push(m),subscribe:(cb:()=>void)=>{listeners.add(cb);return()=>listeners.delete(cb);},getSettings:()=>({targetLanguage:'zh-CN'})};
 const host=createClassicHost(api,{}, {log(){},warn(){},error(){}});
 const stop=host.installNativeTranslations!(source);
 return {host,stop,record,nodes,original,RowManager,listeners,events,considered,source,api,retained,
  render:()=>new RowManager().generate({rowType:1,message:record}),
  ready(){ready=true;api.metro.modules['71'].isInitialized=true;dispatcher.dispatch({type:'CHANNEL_SELECT',channelId:CHANNEL});listeners.forEach(cb=>cb());},
  translate(v:string|undefined){translation=v;listeners.forEach(cb=>cb());},select(v:string){selected=v;}};
}
test('Android row generation appends bilingual content when DCDChatManager is unavailable',async()=>{
 const f=fixture();try{
  const row=f.render();assert.deepEqual(row.message.content,['Hello',{type:'strong',content:['world']},'\n',{type:'subtext',content:['译文 · zh-CN']},'\n','你好']);
  assert.deepEqual(f.nodes,['Hello',{type:'strong',content:['world']}]);assert.equal(f.record.content,'Hello');
  await Promise.resolve();assert.deepEqual(f.considered,[{id:ID,channelId:CHANNEL,content:'Hello'}]);
  f.translate(undefined);await Promise.resolve();assert.equal(f.events.at(-1)?.message,f.record);assert.deepEqual(f.render().message.content,f.nodes);
  f.select('100000000000000002');f.translate('again');assert.deepEqual(f.render().message.content,f.nodes);
 }finally{f.stop();}
 assert.equal(f.RowManager.prototype.generate,f.original);assert.equal(f.listeners.size,0);
});
test('the native consumer sees translations when it retains generated rows before after hooks return',async()=>{
 const f=fixture(false,false,true);try{
  Object.freeze(f.nodes);Object.freeze(f.nodes[1]);
  const row=f.render(),nativeRow=f.retained.at(-1);
  assert.equal(nativeRow,row,'the same generated row must reach the native consumer');
  assert.equal(nativeRow.message.content.at(-1),'你好','translation counters must not hide an untranslated retained row');
  assert.equal(f.record.content,'Hello');assert.deepEqual(f.nodes,['Hello',{type:'strong',content:['world']}]);
  f.translate(undefined);await Promise.resolve();
  assert.deepEqual(nativeRow.message.content,f.nodes,'clear must restore any row retained by the native consumer');
 }finally{f.stop();}
});
test('unload restores retained native content without overwriting another plugin content',()=>{
 const f=fixture(false,false,true);try{
  f.render();f.render();const first=f.retained[0],second=f.retained[1];
  assert.equal(first.message.content.at(-1),'你好');
  const other=['another plugin'];second.message.content=other;
  f.stop();assert.deepEqual(first.message.content,f.nodes);assert.equal(second.message.content,other);
 }finally{f.stop();}
});
test('reused native rows do not accumulate translations and clear restores the original parse tree',async()=>{
 const f=fixture(false,false,true,true);try{
  const row=f.render();assert.equal(f.render(),row);assert.equal(row.message.content.filter((x:any)=>x==='你好').length,1);
  f.translate('您好');await Promise.resolve();f.render();assert.equal(row.message.content.at(-1),'您好');assert.equal(row.message.content.includes('你好'),false);
  f.translate(undefined);await Promise.resolve();assert.equal(row.message.content,f.nodes);
 }finally{f.stop();}
});
test('a generated message aliasing a MessageStore record is rejected without modifying source',()=>{
 const f=fixture(false,false,true,false,true);try{
  const row=f.render();assert.equal(row.message,f.record);assert.equal(row.message.content,'Hello');
  assert.equal(f.host.diagnostics().nativeRowsTranslated,0);
 }finally{f.stop();}
});
test('a late Android RowManager is discovered after chat opens and unload restores original rows',async()=>{
 const f=fixture(true);try{
  assert.deepEqual(f.render().message.content,f.nodes);f.ready();await Promise.resolve();
  assert.equal(f.render().message.content.at(-1),'你好','initial missing native module must not permanently disable translation');
  f.stop();await Promise.resolve();assert.equal(f.events.at(-1)?.message,f.record);assert.deepEqual(f.render().message.content,f.nodes);
 }finally{f.stop();}
 assert.equal(f.listeners.size,0);
});
test('real translation service repaints a native Android message after queued translation completes',async()=>{
 const f=fixture();f.stop();
 const host=createClassicHost(f.api,{}, {log(){},warn(){},error(){}});
 const service=new TranslationService({getCurrentChannel:()=>host.getCurrentChannel(),getLoadedMessages:c=>host.getLoadedMessages(c),createProvider:()=>({translate:async()=>({text:'你好'})})});
 const rendered:any[]=[];
 const dispatch=f.api.metro.common.FluxDispatcher.dispatch;
 f.api.metro.common.FluxDispatcher.dispatch=(e:any)=>{dispatch(e);if(e.type==='MESSAGE_UPDATE')rendered.push(f.render());};
 const stop=host.installNativeTranslations!(service);
 try{
  assert.deepEqual(f.render().message.content,f.nodes);
  await service.translateLoaded();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(rendered.at(-1)?.message.content.at(-1),'你好');assert.equal(service.getStatus().translated,1);
  const paints=rendered.length;await service.translateLoaded();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(rendered.length,paints,'cached translations must not form a local MESSAGE_UPDATE loop');
  service.clear();await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(rendered.at(-1)?.message.content,f.nodes);
  assert.equal(f.record.content,'Hello');
 }finally{service.dispose();stop();}
});
test('Classic cached finder misses do not hide an initialized late RowManager',async()=>{
 const f=fixture(true,true);try{
  assert.deepEqual(f.render().message.content,f.nodes);f.ready();await Promise.resolve();
  assert.equal(f.render().message.content.at(-1),'你好','read initialized Metro exports even when Classic has cached NOT_FOUND');
 }finally{f.stop();}
});
test('an unused early RowManager must not prevent finding the active message module loaded later',async()=>{
 const f=fixture();f.stop();
 const Dormant=class RowManager{generate(){return {type:0};}};
 f.api.metro.modules['71'].publicModule.exports.default=Dormant as any;
 f.api.metro.findByName=()=>Dormant as any;f.api.metro.findByNameAll=()=>[Dormant] as any;
 const host=createClassicHost(f.api,{}, {log(){},warn(){},error(){}});const stop=host.installNativeTranslations!(f.source);
 try{
  assert.equal(host.diagnostics().nativeRowManagerHooks,1);
  (f.api.metro.modules as any)['72']={isInitialized:true,publicModule:{exports:{default:f.RowManager}}};
  f.api.metro.common.FluxDispatcher.dispatch({type:'MESSAGE_CREATE',message:f.record});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.render().message.content.at(-1),'你好','continue discovering when installed hook has observed no valid message rows');
  assert.equal(host.diagnostics().nativeRowManagerHooks,2);
 }finally{stop();}
});
test('RowManager diagnostics distinguish generate calls from rejected message signatures without collecting content',()=>{
 const f=fixture();try{
  new f.RowManager().generate({rowType:2,message:f.record});
  assert.equal(f.host.diagnostics().nativeGenerateCalls,1);
  assert.deepEqual(f.host.diagnostics().nativeGenerateRejected,{rowKind:1});
  assert.equal(JSON.stringify(f.host.diagnostics()).includes('Hello'),false);
 }finally{f.stop();}
});
test('unobserved native discovery coalesces bursts of service and store notifications',async()=>{
 const f=fixture();try{
  const before=Number(f.host.diagnostics().nativeDiscoveryAttempts);
  for(let i=0;i<200;i++)f.listeners.forEach(cb=>cb());
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(Number(f.host.diagnostics().nativeDiscoveryAttempts)-before<=2,'a service emission burst must not scan Metro hundreds of times');
 }finally{f.stop();}
});
