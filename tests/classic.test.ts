import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicHost} from '../src/runtime/classic';

const CHANNEL='100000000000000001', OTHER='100000000000000002';
const MESSAGE='200000000000000001';
function fixture() {
  let channel=CHANNEL;
  const record={id:MESSAGE,channel_id:CHANNEL,content:'Hello'};
  let records:any[]=[record];
  const messages=new Set<()=>void>(), selection=new Set<()=>void>();
  const subscriptions=new Map<string,Set<(e:any)=>void>>();
  const hooks=new Map<string,Set<(component:any,element:any)=>any>>();
  const messageStore={getMessages:()=>({_array:records}),getMessage:(c:string,id:string)=>records.find(m=>m.channel_id===c&&m.id===id),addChangeListener:(f:()=>void)=>messages.add(f),removeChangeListener:(f:()=>void)=>messages.delete(f)};
  const channelStore={getChannelId:()=>channel,addChangeListener:(f:()=>void)=>selection.add(f),removeChangeListener:(f:()=>void)=>selection.delete(f)};
  const dispatcher={subscribe(type:string,fn:(e:any)=>void){if(!subscriptions.has(type))subscriptions.set(type,new Set());subscriptions.get(type)!.add(fn);},unsubscribe(type:string,fn:(e:any)=>void){subscriptions.get(type)?.delete(fn);},dispatch(e:any){subscriptions.get(e.type)?.forEach(f=>f(e));}};
  const jsx={onJsxCreate(name:string,fn:any){if(!hooks.has(name))hooks.set(name,new Set());hooks.get(name)!.add(fn);},deleteJsxCreate(name:string,fn:any){hooks.get(name)?.delete(fn);}};
  const api={metro:{common:{React:{createElement(){}},ReactNative:{View:'View'},FluxDispatcher:dispatcher},findByProps(...props:string[]){if(props.includes('getMessages'))return messageStore;if(props.includes('getChannelId'))return channelStore;return undefined;},findByStoreName(name:string){return name==='MessageStore'?messageStore:name==='SelectedChannelStore'?channelStore:undefined;},findByName(){return undefined;}},api:{react:{jsx}}};
  const host=createClassicHost(api,{},console);
  return {host,record,messages,selection,subscriptions,hooks,dispatcher,setRecords:(v:any[])=>{records=v;},select:(v:string)=>{channel=v;selection.forEach(f=>f());},render(name:string,props:any){const original={type:function MessageContent(){},props};let result:any=original;hooks.get(name)?.forEach(f=>{result=f(original.type,result)??result;});return {original,result};}};
}

test('loaded store records keep channel and content identity and exclude invalid rows without mutation',()=>{
  const f=fixture();
  f.setRecords([f.record,{id:'1',channel_id:CHANNEL,content:'fake list index'},{id:MESSAGE,channel_id:OTHER,content:'other channel'},{id:MESSAGE,channel_id:CHANNEL,content:42}]);
  assert.deepEqual(f.host.getLoadedMessages(CHANNEL),[{id:MESSAGE,channelId:CHANNEL,content:'Hello'}]);
  assert.deepEqual(f.record,{id:MESSAGE,channel_id:CHANNEL,content:'Hello'});
  assert.equal(f.host.getCurrentChannel(),CHANNEL);
});

test('history, create, edit, deletion and channel observation reaches consumers then cleans up',async()=>{
  const f=fixture(),events:any[]=[];
  const stop=f.host.observe(e=>events.push(e));
  f.dispatcher.dispatch({type:'LOAD_MESSAGES_SUCCESS',channelId:CHANNEL});
  f.dispatcher.dispatch({type:'MESSAGE_CREATE',message:f.record});
  f.dispatcher.dispatch({type:'MESSAGE_UPDATE',message:{...f.record,content:'changed'}});
  f.dispatcher.dispatch({type:'MESSAGE_DELETE',channelId:CHANNEL,id:MESSAGE});
  f.select(OTHER);
  f.messages.forEach(fn=>fn());
  await Promise.resolve();
  assert.ok(events.some(e=>e.type==='messages'&&e.channelId===CHANNEL));
  assert.ok(events.some(e=>e.type==='delete'&&e.messageId===MESSAGE&&e.channelId===CHANNEL));
  assert.ok(events.some(e=>e.type==='channel'&&e.channelId===OTHER));
  const count=events.length;
  f.dispatcher.dispatch({type:'MESSAGE_CREATE',message:f.record});
  stop();stop();
  await Promise.resolve();
  assert.equal(events.length,count,'already queued callback cannot fire after disposal');
  assert.equal(f.messages.size,0);assert.equal(f.selection.size,0);
  assert.equal([...f.subscriptions.values()].reduce((n,s)=>n+s.size,0),0);
});

test('renderer preserves exact original element, verifies records and unsubscribes same Classic callback',()=>{
  const f=fixture();
  const rendered:any[]=[];
  const stop=f.host.installMessageRenderer((original,message)=>{const result={type:'IndependentTranslation',props:{original,message}};rendered.push(result);return result;});
  const valid=f.render('MessageContent',{message:f.record});
  assert.equal(valid.result.props.original,valid.original);
  assert.deepEqual(valid.result.props.message,{id:MESSAGE,channelId:CHANNEL,content:'Hello'});
  const unrelated=f.render('MessageContent',{message:{...f.record,content:'unrelated'}});
  assert.equal(unrelated.result,unrelated.original,'cannot translate unrelated or stale props');
  const row=f.render('MessageContent',{item:{index:MESSAGE,content:'list row'},channelId:CHANNEL});
  assert.equal(row.result,row.original);
  assert.equal(f.host.diagnostics().observedMessageRenders,1);
  stop();stop();
  assert.equal([...f.hooks.values()].reduce((n,s)=>n+s.size,0),0);
  assert.equal(f.render('MessageContent',{message:f.record}).result.type.name,'MessageContent');
  assert.equal(rendered.length,1);
});

test('Classic global bunny JSX path is supported without Next API and no matches are diagnosed',()=>{
  const f=fixture(),globals=globalThis as any;
  const previous=globals.bunny;
  try {
    let hook:any;
    globals.bunny={api:{react:{jsx:{onJsxCreate(_n:string,fn:any){hook=fn;},deleteJsxCreate(){hook=undefined;}}}}};
    const api={metro:{common:{React:{},ReactNative:{}},findByProps(){},findByStoreName(){}}};
    const host=createClassicHost(api,{},console);
    const stop=host.installMessageRenderer((o)=>o);
    assert.equal(typeof hook,'function');
    assert.equal(host.diagnostics().rendererStatus,'unobserved');
    stop();
    assert.equal(hook,undefined);
  } finally {globals.bunny=previous;}
});

test('missing Classic stores and JSX produce safe empty results with explicit unsupported diagnostics',()=>{
  const f=createClassicHost({}, {},console);
  assert.deepEqual(f.getLoadedMessages(CHANNEL),[]);
  assert.equal(f.getCurrentChannel(),null);
  f.installMessageRenderer(o=>o)();
  assert.equal(f.diagnostics().rendererStatus,'unsupported');
});

function nativeFixture() {
  const f=fixture(), calls:any[][]=[];
  const bridge={updateRows(...args:any[]){calls.push(args);},clearRows(_tag:number){}};
  const oldGlobals=(globalThis as any).bunny;
  // Resolve the same stores through an independently constructed API.
  const store={getMessage:()=>f.record,getMessages:()=>[f.record]};
  const api={metro:{common:{React:{},ReactNative:{NativeModules:{DCDChatManager:bridge}},FluxDispatcher:f.dispatcher},findByProps(...props:string[]){return props.includes('getMessages')?store:props.includes('getChannelId')?{getChannelId:()=>f.host.getCurrentChannel()}:undefined;}},api:{react:{jsx:{onJsxCreate(name:string,fn:any){if(!f.hooks.has(name))f.hooks.set(name,new Set());f.hooks.get(name)!.add(fn);},deleteJsxCreate(name:string,fn:any){f.hooks.get(name)?.delete(fn);}}}},patcher:{before(name:string,obj:any,cb:any){const orig=obj[name];obj[name]=function(...args:any[]){return orig.apply(this,cb(args)??args);};return ()=>{obj[name]=orig;};}}};
  const host=createClassicHost(api,{}, {log(){},warn(){},error(){}});
  const listeners=new Set<()=>void>();let translated:string|undefined='你好';
  let considered=0;
  const source={getTranslation:()=>translated===undefined?undefined:{text:translated},consider:()=>{considered++;},subscribe:(cb:()=>void)=>{listeners.add(cb);return ()=>listeners.delete(cb);},getSettings:()=>({targetLanguage:'zh-Hans'})};
  const row={type:1,changeType:1,index:4,message:{id:MESSAGE,channelId:CHANNEL,content:'Hello'}};
  return {...f,host,bridge,calls,source,row,listeners,get considered(){return considered;},setTranslation:(text:string|undefined)=>{translated=text;listeners.forEach(fn=>fn());},oldGlobals};
}

test('native bridge transforms only cloned verified plain-string payloads and restores on clear/unload',async()=>{
  const f=nativeFixture();
  assert.equal(typeof f.host.installNativeTranslations,'function');
  const stop=f.host.installNativeTranslations!(f.source);
  const original=JSON.stringify([f.row]);
  f.bridge.updateRows(5,original,false);
  assert.equal(JSON.parse(f.calls[0][1])[0].message.content,'Hello\n\n[译文 · zh-Hans]\n你好');
  assert.equal(original,JSON.stringify([f.row]));assert.equal(f.record.content,'Hello');
  await Promise.resolve();assert.equal(f.considered,1);
  f.setTranslation(undefined);
  await new Promise(resolve=>setTimeout(resolve,110));
  assert.equal(JSON.parse(f.calls.at(-1)![1])[0].message.content,'Hello');
  f.setTranslation('你好');
  await new Promise(resolve=>setTimeout(resolve,110));
  assert.equal(JSON.parse(f.calls.at(-1)![1])[0].message.content,'Hello\n\n[译文 · zh-Hans]\n你好');
  stop();stop();
  assert.equal(JSON.parse(f.calls.at(-1)![1])[0].message.content,'Hello');
  assert.equal(f.listeners.size,0);
  const count=f.calls.length;f.setTranslation('again');
  await new Promise(resolve=>setTimeout(resolve,100));assert.equal(f.calls.length,count);
});

test('native bridge leaves serialized AST strings and invalid schema untouched, avoids stale channel replay',async()=>{
  const f=nativeFixture();const stop=f.host.installNativeTranslations!(f.source);
  const ast=JSON.stringify([{...f.row,message:{...f.row.message,content:'{"type":"text","content":"Hello"}'}}]);
  f.bridge.updateRows(1,ast,false);assert.equal(f.calls.at(-1)![1],ast);
  const invalid=JSON.stringify([{index:1,message:{id:'4',content:'Hello'}}]);
  f.bridge.updateRows(2,invalid,false);assert.equal(f.calls.at(-1)![1],invalid);
  f.bridge.updateRows(3,JSON.stringify([f.row]),false);
  const count=f.calls.length;
  f.select(OTHER);f.setTranslation('更新');
  await new Promise(resolve=>setTimeout(resolve,110));
  assert.equal(f.calls.length,count);
  stop();assert.equal(f.calls.length,count,'unload cannot replay rows from the old channel');
  assert.ok(Number(f.host.diagnostics().nativeUnsupportedRows)>0);
});

test('native incremental row originals are replayed together so previously translated history clears',async()=>{
  const f=nativeFixture();const stop=f.host.installNativeTranslations!(f.source);
  f.bridge.updateRows(1,JSON.stringify([f.row]),false);
  f.bridge.updateRows(1,JSON.stringify([{...f.row,index:8}]),false);
  f.setTranslation(undefined);await new Promise(resolve=>setTimeout(resolve,110));
  const rows=JSON.parse(f.calls.at(-1)![1]);
  assert.deepEqual(rows.map((r:any)=>r.index).sort(),[4,8]);
  assert.ok(rows.every((r:any)=>r.message.content==='Hello'));
  stop();
});

test('observed independent React Native renderer restores and suppresses native fallback duplicates',async()=>{
  const f=nativeFixture();const stopNative=f.host.installNativeTranslations!(f.source);
  f.bridge.updateRows(1,JSON.stringify([f.row]),false);
  const stopJSX=f.host.installMessageRenderer((original,message)=>({type:'IndependentTranslation',props:{original,message}}));
  f.render('MessageContent',{message:f.record});await Promise.resolve();
  assert.equal(JSON.parse(f.calls.at(-1)![1])[0].message.content,'Hello');
  f.bridge.updateRows(2,JSON.stringify([f.row]),false);
  assert.equal(JSON.parse(f.calls.at(-1)![1])[0].message.content,'Hello');
  stopNative();stopJSX();
});

test('native content-node arrays append a new text node while retaining original mention and markup nodes',async()=>{
  const f=nativeFixture();const stop=f.host.installNativeTranslations!(f.source);
  const nodes=[{type:'strong',content:['Hello']},{type:'userMention',userId:MESSAGE,content:['Alice']}];
  const input=JSON.stringify([{...f.row,message:{...f.row.message,content:nodes}}]);
  f.bridge.updateRows(1,input,false);
  const content=JSON.parse(f.calls.at(-1)![1])[0].message.content;
  assert.deepEqual(content,[...nodes,'\n',{type:'subtext',content:['译文 · zh-Hans']},'\n','你好']);
  assert.equal(f.record.content,'Hello');assert.deepEqual(nodes,[{type:'strong',content:['Hello']},{type:'userMention',userId:MESSAGE,content:['Alice']}]);
  await Promise.resolve();assert.equal(f.considered,1);
  stop();
  assert.deepEqual(JSON.parse(f.calls.at(-1)![1])[0].message.content,nodes);
});

test('native replay sends UPDATE deltas and adjusts retained indices across insert/delete without resurrecting cleared rows',async()=>{
  const f=nativeFixture();const stop=f.host.installNativeTranslations!(f.source);
  f.bridge.updateRows(1,JSON.stringify([f.row]),false);
  f.bridge.updateRows(1,JSON.stringify([{...f.row,index:2}]),false);
  f.setTranslation(undefined);await new Promise(resolve=>setTimeout(resolve,110));
  const rows=JSON.parse(f.calls.at(-1)![1]);
  assert.deepEqual(rows.map((r:any)=>r.index).sort(),[2,5]);
  assert.ok(rows.every((r:any)=>r.changeType===2),'replay must not duplicate original inserts');
  f.bridge.updateRows(1,JSON.stringify([{index:2,changeType:3}]),false);
  f.setTranslation('你好');await new Promise(resolve=>setTimeout(resolve,110));
  assert.deepEqual(JSON.parse(f.calls.at(-1)![1]).map((r:any)=>r.index),[4]);
  f.bridge.clearRows(1);const count=f.calls.length;
  f.setTranslation(undefined);await new Promise(resolve=>setTimeout(resolve,110));
  assert.equal(f.calls.length,count,'cleared native list cannot be replayed');
  stop();
});

test('native source revision guard prevents replay of stale original content after a message edit',async()=>{
  const f=nativeFixture();const stop=f.host.installNativeTranslations!(f.source);
  f.bridge.updateRows(1,JSON.stringify([{...f.row,message:{...f.row.message,content:['Hello']}}]),false);
  const count=f.calls.length;
  f.record.content='Changed';f.setTranslation('已修改');
  await new Promise(resolve=>setTimeout(resolve,110));
  assert.equal(f.calls.length,count,'old native original and translation cannot overwrite edited source');
  stop();assert.equal(f.calls.length,count);
});

test('already loaded native messages get one deferred local repaint with the exact untouched store record',async()=>{
  const f=nativeFixture();let nudges=0;
  f.setTranslation(undefined);
  f.dispatcher.subscribe('MESSAGE_UPDATE',event=>{
    nudges++;assert.equal(event.message,f.record);
    f.bridge.updateRows(1,JSON.stringify([{...f.row,index:0,changeType:2,message:{...f.row.message,content:['Hello']}}]),false);
  });
  const stop=f.host.installNativeTranslations!(f.source);
  f.setTranslation('你好');
  await Promise.resolve();await Promise.resolve();
  assert.equal(nudges,1);
  assert.deepEqual(JSON.parse(f.calls.at(-1)![1])[0].message.content,['Hello','\n',{type:'subtext',content:['译文 · zh-Hans']},'\n','你好']);
  assert.equal(f.record.content,'Hello');
  f.setTranslation('你好');await Promise.resolve();await Promise.resolve();
  assert.equal(nudges,1,'same ready revision must not form a local repaint loop');
  stop();f.setTranslation('again');await Promise.resolve();assert.equal(nudges,1);
});
