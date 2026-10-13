import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicHost} from '../src/runtime/classic';
import {TranslationService} from '../src/core/service';
const CHANNEL='100000000000000001',ID='200000000000000001';
function fixture(late=false,cachedMiss=false){
 const record={id:ID,channel_id:CHANNEL,content:'Hello'};
 const nodes:any[]=['Hello',{type:'strong',content:['world']}];
 let ready=!late,translation:string|undefined='你好',selected=CHANNEL;
 const listeners=new Set<()=>void>(),events:any[]=[],considered:any[]=[];
 class RowManager{generate(data:any){return {type:data.rowType,message:{id:data.message.id,channelId:data.message.channel_id,content:nodes}};}}
 const original=RowManager.prototype.generate;
 const messageStore={getMessages:()=>({_array:[record]}),getMessage:(c:string,id:string)=>c===CHANNEL&&id===ID?record:undefined};
 const callbacks=new Map<string,Set<(e:any)=>void>>();
 const dispatcher={subscribe(n:string,cb:any){if(!callbacks.has(n))callbacks.set(n,new Set());callbacks.get(n)!.add(cb);},unsubscribe(n:string,cb:any){callbacks.get(n)?.delete(cb);},dispatch(e:any){events.push(e);callbacks.get(e.type)?.forEach(fn=>fn(e));}};
 const api={metro:{modules:{'71':{isInitialized:ready,publicModule:{exports:{default:RowManager,__esModule:true}}}},common:{React:{},ReactNative:{},FluxDispatcher:dispatcher},findByStoreName(n:string){return n==='MessageStore'?messageStore:n==='SelectedChannelStore'?{getChannelId:()=>selected}:undefined;},findByProps(){},findByName(n:string){return !cachedMiss&&n==='RowManager'&&ready?RowManager:undefined;},findByNameAll(n:string){return !cachedMiss&&n==='RowManager'&&ready?[RowManager]:[];}},patcher:{after(name:string,parent:any,cb:any){const fn=parent[name];parent[name]=function(...args:any[]){const result=fn.apply(this,args);return cb(args,result)??result;};return ()=>{parent[name]=fn;};}}};
 const source={getTranslation:()=>translation?{text:translation}:undefined,consider:(m:any)=>considered.push(m),subscribe:(cb:()=>void)=>{listeners.add(cb);return()=>listeners.delete(cb);},getSettings:()=>({targetLanguage:'zh-CN'})};
 const host=createClassicHost(api,{}, {log(){},warn(){},error(){}});
 const stop=host.installNativeTranslations!(source);
 return {host,stop,record,nodes,original,RowManager,listeners,events,considered,source,api,
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
