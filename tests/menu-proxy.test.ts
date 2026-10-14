import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {installClassicMessageMenu} from '../src/runtime/message-menu';

test('Android IntlMessagesProxy must not be selected as an ActionSheet component',async()=>{
 const globals=globalThis as any,old=globals.bunny;
 const message={id:'200000000000000001',channelId:'100000000000000001',content:'Hello'};
 const props={message:{id:message.id,channel_id:message.channelId,content:message.content}};
 const fakeLocale=new Proxy({}, {get(_target,key){return key===Symbol.toStringTag?'IntlMessagesProxy':{};}});
 function Sheet(p:any){return React.createElement('Sheet',null,p.children);}
 function Row(p:any){return React.createElement('Row',p);}
 Row.Group=(p:any)=>React.createElement('Group',null,p.children);
 const tree=React.createElement(Sheet,null,React.createElement(Row.Group,null,React.createElement(Row,{label:'Copy'})));
 const calls:any[]=[];
 const sheets={openLazy(...args:any[]){calls.push(args);},hideActionSheet(){}};
 const stats:any={messageMenuCalls:0,messageMenuObserved:0,messageMenuInjections:0,messageMenuRejected:0,messageMenuMissingComponents:0,messageMenuNoContainer:0,messageMenuInjectionErrors:0};
 const api={metro:{modules:{31:{isInitialized:true,publicModule:{exports:{default:fakeLocale}}}},findByProps(...keys:string[]){return keys.includes('openLazy')?sheets:keys.includes('ActionSheetRow')?{ActionSheetRow:Row}:keys.includes('ActionSheet')?{ActionSheet:Sheet}:undefined;}},patcher:{before(key:string,parent:any,cb:any){const original=parent[key];parent[key]=function(...args:any[]){return original.apply(this,cb(args)??args);};return()=>{parent[key]=original;};}}};
 // Real Classic resolves the valid sheet through its lazy API despite the scanner's false match.
 globals.bunny={metro:{findByPropsLazy(){return{};},lazy:{getLazyContext(){return{getExports(cb:any){cb(sheets);return()=>{};}};}}}};
 const host={React,getCurrentChannel:()=>message.channelId,getLoadedMessages:()=>[message],observe:()=>()=>{}};
 const source={async translateMessage(){throw Error('unused');},getSettings:()=>({targetLanguage:'zh-CN'}),getStatus:()=>({lastError:null})};
 const stop=installClassicMessageMenu(api,host,source,stats);let renderer:any;
 try{
  assert.equal(stats.messageMenuHookAvailable,true);
  sheets.openLazy(Promise.resolve({default:()=>tree}),'MessageLongPressActionSheet',props);
  const mod=await calls[0][0];act(()=>{renderer=TestRenderer.create(mod.default(props));});
  assert.equal(stats.messageMenuMissingComponents,0,'language proxy must not stand in for native components');
  assert.ok(renderer.root.findAllByType('Row').some((node:any)=>node.props.label==='翻译这条消息'));
 }finally{if(renderer)act(()=>renderer.unmount());stop();globals.bunny=old;}
});