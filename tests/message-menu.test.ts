import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {createClassicHost} from '../src/runtime/classic';
import {TranslationService} from '../src/core/service';
import {createComponents} from '../src/ui/components';
const CHANNEL='100000000000000001',ID='200000000000000001';
function fixture(options:{late?:boolean;alertsFirst?:boolean;patchFailure?:boolean}={}){
 const records=[{id:ID,channel_id:CHANNEL,content:'Hello'},{id:'200000000000000002',channel_id:CHANNEL,content:'Goodbye'}];
 const calls:any[]=[],shown:any[]=[],received:any[]=[];let selected=CHANNEL;
 function ActionSheet(p:any){return React.createElement('Sheet',null,p.children);}
 function ActionSheetRow(p:any){return React.createElement('MenuRow',p);}
 ActionSheetRow.Group=(p:any)=>React.createElement('Group',null,p.children);
 const tree=React.createElement('Provider',null,React.createElement(ActionSheet,null,React.createElement('ScrollView',null,React.createElement(ActionSheetRow.Group,null,React.createElement(ActionSheetRow,{label:'Copy'})))));
 const mod=Object.freeze({default:()=>tree});
 const sheet={openLazy(...args:any[]){received.push(args);},hideActionSheet(){calls.push('hide');}};
 const store={getMessages:()=>({_array:records}),getMessage:(_c:string,id:string)=>records.find(x=>x.id===id)};
 let available=!options.late;
 const alerts={openLazy(){},close(){}};
 const api={
  metro:{common:{React,ReactNative:{}},findByProps(...keys:string[]){return keys.includes('openLazy')?(options.alertsFirst&&keys.length===1?alerts:available?sheet:undefined):keys.includes('ActionSheetRow')?{ActionSheet,ActionSheetRow}:keys.includes('ActionSheet')?{ActionSheet}:undefined;},findByStoreName(n:string){return n==='MessageStore'?store:n==='SelectedChannelStore'?{getChannelId:()=>selected}:undefined;}},
  patcher:{before(name:string,parent:any,cb:any){if(options.patchFailure)throw Error('Patch denied');const original=parent[name];parent[name]=function(...args:any[]){return original.apply(this,cb(args)??args);};return()=>{parent[name]=original;};}},
  ui:{alerts:{showConfirmationAlert(x:any){shown.push(x);}},toasts:{showToast(x:any){calls.push(x);}}}
 };
 const original=sheet.openLazy;const host=createClassicHost(api,{}, {log(){},warn(){},error(){}});
 const source={async translateMessage(message:any){calls.push(message);return{text:'中文 '+message.content};},getTranslation(){return undefined;},getSettings(){return{targetLanguage:'zh-CN'};},getStatus(){return{lastError:null};}};
 assert.equal(typeof (host as any).installMessageMenu,'function','Classic host must expose a message menu integration');
 const stop=(host as any).installMessageMenu(source);
 return{host,source,stop,api,sheet,records,calls,shown,received,original,tree,load(){available=true;},select(v:string){selected=v;},async open(index=0,key='MessageActionSheet'){
  sheet.openLazy(Promise.resolve(mod),key,{message:records[index]});const loaded=await received.at(-1)[0];return loaded.default({message:records[index]});
 }};
}
test('Classic message long press exposes a translate row inside the sheet without mutating frozen React elements',async()=>{
 const f=fixture();let renderer:any;try{
  const rendered=await f.open();act(()=>{renderer=TestRenderer.create(rendered);});
  const row=renderer.root.findAllByType('MenuRow').find((x:any)=>x.props.label.includes('翻译'));
  assert.ok(row,'the native menu must have a visible translate action');
  await act(async()=>{await row.props.onPress();});assert.equal(f.calls.find(x=>typeof x==='object').id,ID);assert.equal(f.shown.length,0,'manual translation must not open a result dialog');
  assert.equal((f.tree as any).props.children.props.children.props.children.props.children.props.label,'Copy');
 }finally{if(renderer)act(()=>renderer.unmount());f.stop();}assert.equal(f.sheet.openLazy,f.original);
});

test('Classic lazy module subscription attaches the menu when it loads without a message event',async()=>{
 const globals=globalThis as any,old=globals.bunny;let resolve:((exports:any)=>void)|undefined,cancelled=0;
 globals.bunny={metro:{findByPropsLazy(){return{};},lazy:{getLazyContext(){return{getExports(cb:any){resolve=cb;return()=>{cancelled++;resolve=undefined;};}};}}}};
 let f:ReturnType<typeof fixture>|undefined;
 try{
  f=fixture({late:true});assert.equal(f.host.diagnostics().messageMenuHookAvailable,false);
  assert.ok(resolve,'must subscribe to the Classic menu module rather than miss later initialization');
  f.load();resolve(f.sheet);
  assert.equal(f.host.diagnostics().messageMenuHookAvailable,true);
  let r:any;act(()=>{r=TestRenderer.create((f as any).tree);});act(()=>r.unmount());
  const rendered=await f.open();act(()=>{r=TestRenderer.create(rendered);});
  assert.ok(r.root.findAllByType('MenuRow').some((x:any)=>x.props.label==='翻译这条消息'));act(()=>r.unmount());
 }finally{f?.stop();globals.bunny=old;}assert.equal(cancelled,1,'unload must cancel the lazy subscription');
});

test('pending Classic menu resolution is cancelled on unload',()=>{
 const globals=globalThis as any,old=globals.bunny;let resolve:((exports:any)=>void)|undefined,cancelled=0;
 globals.bunny={metro:{findByPropsLazy(){return{};},lazy:{getLazyContext(){return{getExports(cb:any){resolve=cb;return()=>{cancelled++;};}};}}}};
 let f:ReturnType<typeof fixture>|undefined;
 try{f=fixture({late:true});assert.ok(resolve);f.stop();resolve(f.sheet);assert.equal(f.sheet.openLazy,f.original);assert.equal(cancelled,1);}
 finally{f?.stop();globals.bunny=old;}
});

test('Classic alerts openLazy must not be mistaken for the message sheet API',async()=>{
 const f=fixture({alertsFirst:true});try{assert.equal(f.host.diagnostics().messageMenuHookAvailable,true);assert.notEqual(await f.open(),f.tree,'message sheets must still be intercepted when alerts initialize first');}finally{f.stop();}
});

test('a discovered sheet that cannot be patched reports patch failure rather than missing module',()=>{
 const f=fixture({patchFailure:true});try{assert.equal(f.host.diagnostics().messageMenuHookAvailable,false);assert.equal(f.host.diagnostics().messageMenuDiscoveryStatus,'patch-failed');}finally{f.stop();}
});
test('a cached lazy sheet wrapper resolves the actual message props instead of its first opening',async()=>{
 const f=fixture();try{
  await f.open(0);const cached=await f.received[0][0];
  let renderer:any;act(()=>{renderer=TestRenderer.create(cached.default({message:f.records[1]}));});
  await act(async()=>{await renderer.root.findAllByType('MenuRow').find((x:any)=>x.props.label.includes('翻译')).props.onPress();});
  assert.equal(f.calls.find(x=>typeof x==='object').id,f.records[1].id,'cached component must not translate the first message');
  act(()=>renderer.unmount());assert.equal(cached.default({}),f.tree,'unknown cached props cannot inherit the first message');
 }finally{f.stop();}
});
test('each long press targets its own message and non-message sheets stay unchanged',async()=>{
 const f=fixture();try{
  const first=await f.open(0),second=await f.open(1);let r:any;
  act(()=>{r=TestRenderer.create(second);});await act(async()=>{await r.root.findAllByType('MenuRow').find((x:any)=>x.props.label.includes('翻译')).props.onPress();});act(()=>r.unmount());
  assert.equal(f.calls.find(x=>typeof x==='object').id,f.records[1].id);
  assert.equal(await f.open(0,'ChannelActionSheet'),f.tree);assert.notEqual(first,f.tree);
 }finally{f.stop();}
});
test('closing or unloading does not leave an actionable stale translation menu',async()=>{
 const f=fixture();try{
  const rendered=await f.open();let r:any;act(()=>{r=TestRenderer.create(rendered);});const row=r.root.findAllByType('MenuRow').find((x:any)=>x.props.label.includes('翻译'));
  f.select('100000000000000009');await row.props.onPress();assert.equal(f.shown.length,0);assert.equal(f.calls.filter(x=>typeof x==='object').length,0);
  f.stop();await row.props.onPress();assert.equal(f.shown.length,0);act(()=>r.unmount());
 }finally{f.stop();}
});

test('manual menu translation updates the inline block once, uses cache and clears without a result dialog',async()=>{
 const f=fixture();f.stop();
 const host=createClassicHost(f.api,{}, {log(){},warn(){},error(){}});
 let requests=0;
 const service=new TranslationService({settings:{autoTranslate:false},getCurrentChannel:()=>host.getCurrentChannel(),getLoadedMessages:c=>host.getLoadedMessages(c),createProvider:()=>({async translate(){requests++;return{text:'你好',detectedLanguage:'en'};}})});
 const RN=Object.fromEntries(['View','Text','ScrollView','TextInput','Switch','Pressable'].map(name=>[name,name]));
 const components=createComponents({...host,RN},service);
 const stop=host.installMessageMenu(service);let screen:any,menu:any;
 const message=host.getLoadedMessages(CHANNEL)[0];
 const texts=()=>screen.root.findAllByType('Text').map((node:any)=>node.children.filter((v:any)=>typeof v==='string').join(''));
 try{
  act(()=>{screen=TestRenderer.create(components.wrapMessage(React.createElement('Text',null,message.content),message));});
  const tree=await f.open();act(()=>{menu=TestRenderer.create(tree);});
  const action=menu.root.findAllByType('MenuRow').find((node:any)=>node.props.label==='翻译这条消息');
  await act(async()=>{await action.props.onPress();});
  assert.equal(f.shown.length,0,'a successful manual request must render inline instead of opening an alert');
  assert.deepEqual(texts(),['Hello','译文 · zh-CN · en → zh-CN','你好']);
  await act(async()=>{await action.props.onPress();});
  assert.equal(requests,1,'a repeat menu press must reuse the translated content');
  assert.equal(texts().filter((v:string)=>v==='你好').length,1);
  assert.equal(f.shown.length,0);
  act(()=>service.stop());assert.equal(service.getStatus().pending,0);
  act(()=>service.clear());assert.deepEqual(texts(),['Hello']);
  assert.equal(f.records[0].content,'Hello');
 }finally{if(menu)act(()=>menu.unmount());if(screen)act(()=>screen.unmount());service.dispose();stop();}
});
