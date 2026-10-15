
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {TranslationService} from '../src/core/service';
import {createComponents} from '../src/ui/components';
const RN=Object.fromEntries(['View','Text','ScrollView','TextInput','Switch','Pressable'].map(n=>[n,n]));
function fixture(provider?:any){
 let channel='one',messages=[{id:'103',channelId:'one',content:'c'},{id:'101',channelId:'one',content:'a'},{id:'102',channelId:'one',content:'b'}];
 const calls:string[]=[];
 const service=new TranslationService({settings:{autoTranslate:false},getCurrentChannel:()=>channel,getLoadedMessages:c=>messages.filter(m=>m.channelId===c),createProvider:()=>provider??{async translate(text:string){calls.push(text);return{text:'译 '+text};}}}) as any;
 return {service,calls,messages,setMessages(v:typeof messages){messages=v;},setChannel(v:string){channel=v;service.channelChanged();}};
}
test('selection snapshot lists loaded nonempty messages chronologically without sharing mutable refs',()=>{
 const f=fixture();try{assert.equal(typeof f.service.getSelectionSnapshot,'function');const view=f.service.getSelectionSnapshot();assert.equal(view.channelId,'one');assert.deepEqual(view.messages.map((m:any)=>m.content),['a','b','c']);view.messages[0].content='mutated';assert.equal(f.messages[1].content,'a');}finally{f.service.dispose();}
});
test('selected translation sends only checked messages in order and reuses cached work',async()=>{
 const f=fixture();try{assert.equal(typeof f.service.translateSelected,'function');await f.service.translateSelected('one',[f.messages[0],f.messages[1],f.messages[1]]);assert.deepEqual(f.calls,['a','c']);assert.equal(f.service.getTranslation(f.messages[2]),undefined);await f.service.translateSelected('one',[f.messages[0],f.messages[1]]);assert.deepEqual(f.calls,['a','c']);}finally{f.service.dispose();}
});
test('selection refuses stale edited content and foreign channels before making requests',async()=>{
 const f=fixture();try{assert.equal(typeof f.service.translateSelected,'function');await f.service.translateSelected('two',[f.messages[1]]);await f.service.translateSelected('one',[{...f.messages[1],content:'stale'}]);assert.deepEqual(f.calls,[]);assert.ok(f.service.getStatus().lastError);}finally{f.service.dispose();}
});
test('stop cancels a selected batch before the next selected message is sent',async()=>{
 const calls:string[]=[];let release!:(value:any)=>void;
 const f=fixture({translate(text:string){calls.push(text);return new Promise(resolve=>{release=resolve;});}});
 try{assert.equal(typeof f.service.translateSelected,'function');const work=f.service.translateSelected('one',[f.messages[1],f.messages[0]]);await new Promise(r=>setImmediate(r));assert.deepEqual(calls,['a']);f.service.stop();release({text:'late'});await work;assert.deepEqual(calls,['a']);assert.equal(f.service.getStatus().translated,0);}finally{f.service.dispose();}
});
test('a later selected message edited during the batch is skipped rather than sending new text',async()=>{
 const calls:string[]=[];let release!:(value:any)=>void;
 const f=fixture({translate(text:string){calls.push(text);return text==='a'?new Promise(resolve=>{release=resolve;}):Promise.resolve({text:'译 '+text});}});
 try{assert.equal(typeof f.service.translateSelected,'function');const work=f.service.translateSelected('one',[f.messages[0],f.messages[1]]);await new Promise(r=>setImmediate(r));f.setMessages([f.messages[1],{...f.messages[0],content:'edited c'}]);release({text:'译 a'});await work;assert.deepEqual(calls,['a']);assert.match(f.service.getStatus().lastError,/跳过/);}finally{f.service.dispose();}
});
test('Android settings checkboxes translate only chosen rows inline and clear choices on channel switch',async()=>{
 const f=fixture();const ui=createComponents({React,RN,storage:{}},f.service);let page:any,inline:any;
 try{
  act(()=>{page=TestRenderer.create(React.createElement(ui.Settings));inline=TestRenderer.create(ui.wrapMessage(React.createElement('Text',null,'a'),f.messages[1]));});
  const by=(id:string)=>page.root.findByProps({testID:id});
  assert.equal(page.root.findAllByProps({testID:'open-selection'}).length,1,'batch selection entry must be visible in Android plugin settings');
  act(()=>by('open-selection').props.onPress());assert.equal(f.service.getSettings().autoTranslate,false);
  act(()=>by('select-message-103').props.onPress());act(()=>by('select-message-101').props.onPress());
  assert.equal(by('select-message-101').props.accessibilityState.checked,true);
  await act(async()=>{await by('translate-selected').props.onPress();});
  assert.deepEqual(f.calls,['a','c']);
  assert.ok(inline.root.findAllByType('Text').some((n:any)=>n.children.join('')==='译 a'));
  act(()=>by('clear-selection').props.onPress());assert.equal(by('translate-selected').props.disabled,true);
  act(()=>by('select-message-101').props.onPress());act(()=>f.setChannel('two'));
  assert.equal(page.root.findAllByProps({testID:'selection-panel'}).length,0,'changing channels must close and clear the old selection');
 }finally{if(page)act(()=>page.unmount());if(inline)act(()=>inline.unmount());f.service.dispose();}
});

test('untranslated edited and newly loaded messages refresh the selector while auto translation is off',()=>{
 const f=fixture();const ui=createComponents({React,RN,storage:{}},f.service);let page:any;
 try{
  act(()=>{page=TestRenderer.create(React.createElement(ui.Settings));});
  const by=(id:string)=>page.root.findByProps({testID:id});
  act(()=>by('open-selection').props.onPress());act(()=>by('select-message-101').props.onPress());
  f.setMessages([{...f.messages[1],content:'edited'},f.messages[0],f.messages[2],{id:'104',channelId:'one',content:'new history'}]);
  act(()=>f.service.scan());
  assert.equal(by('select-message-101').props.accessibilityState.checked,false,'editing a never-translated selected message must remove its old check');
  assert.equal(by('translate-selected').props.disabled,true);
  assert.ok(by('select-message-104'));
  assert.match(by('select-message-101').props.accessibilityLabel,/edited/);
  assert.deepEqual(f.calls,[]);
 }finally{if(page)act(()=>page.unmount());f.service.dispose();}
});

test('unchanged native repaint scans do not repeatedly notify selector subscribers',()=>{
 const f=fixture();let selectionUpdates=0,statusUpdates=0;const a=f.service.subscribe(()=>statusUpdates++),b=f.service.subscribeSelection(()=>selectionUpdates++);
 try{
  for(let i=0;i<200;i++)f.service.scan();assert.equal(selectionUpdates,1);assert.equal(statusUpdates,0);
  f.setMessages([{...f.messages[1],content:'edited'}]);f.service.scan();assert.equal(selectionUpdates,2);
  for(let i=0;i<200;i++)f.service.scan();assert.equal(selectionUpdates,2);assert.equal(statusUpdates,0);
  b();f.setMessages([]);f.service.scan();assert.equal(selectionUpdates,2);
 }finally{a();b();f.service.dispose();}
});
