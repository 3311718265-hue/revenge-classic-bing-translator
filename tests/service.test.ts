import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TranslationService} from '../src/core/service';
const msg=(id:string,content:string,channelId='one')=>({id,content,channelId});
for(const channel of [null,'one'])test('manual translation explains missing '+(channel?'loaded messages':'selected channel'),async()=>{
 let requests=0,notifications=0;
 const service=new TranslationService({getCurrentChannel:()=>channel,getLoadedMessages:()=>[],createProvider:()=>({translate:async()=>{requests++;return {text:'translated'};}})});
 const stop=service.subscribe(()=>notifications++);
 try{await service.translateLoaded();assert.ok(service.getStatus().lastError,'empty manual translation must explain why no request started');assert.ok(notifications>0);assert.equal(requests,0);}finally{stop();service.dispose();}
});
function setup(){let channel='one';let messages=[msg('103','c'),msg('101','a'),msg('102','b')];const calls:string[]=[];
 const service=new TranslationService({getCurrentChannel:()=>channel,getLoadedMessages:()=>messages,settings:{autoTranslate:false,minIntervalMs:0},createProvider:()=>({translate:async(text:string)=>{calls.push(text);return {text:'译 '+text,detectedLanguage:'en'};}})});
 return {service,calls,setChannel(value:string){channel=value;},setMessages(value:typeof messages){messages=value;},messages};
}
test('loaded messages are chronological and all resolve without modifying originals',async()=>{
 const s=setup();await s.service.translateLoaded();assert.deepEqual(s.calls,['a','b','c']);assert.equal(s.messages[1].content,'a');assert.equal(s.service.getTranslation(s.messages[1])?.text,'译 a');
});
test('repeated content and repeated scans share cached work',async()=>{
 const s=setup();s.setMessages([msg('101','same'),msg('102','same')]);await s.service.translateLoaded();await s.service.translateLoaded();assert.deepEqual(s.calls,['same']);
});
test('explicit single-message translation works with auto mode off and does not translate other history',async()=>{
 const s=setup();try{
  assert.equal(typeof (s.service as any).translateMessage,'function');
  const result=await (s.service as any).translateMessage(s.messages[1]);
  assert.equal(result.text,'译 a');assert.deepEqual(s.calls,['a']);
  await (s.service as any).translateMessage(s.messages[1]);assert.deepEqual(s.calls,['a']);
  s.setMessages([msg('101','edited')]);const revised=await (s.service as any).translateMessage(msg('101','a'));
  assert.equal(revised.text,'译 edited');assert.deepEqual(s.calls,['a','edited']);
 }finally{s.service.dispose();}
});
test('a successful unchanged manual result is returned without duplicating inline source content',async()=>{
 const message=msg('101','Hello');const service=new TranslationService({settings:{autoTranslate:false},getCurrentChannel:()=> 'one',getLoadedMessages:()=>[message],createProvider:()=>({translate:async()=>({text:'Hello',detectedLanguage:'en'})})});
 try{assert.equal((await service.translateMessage(message))?.text,'Hello');assert.equal(service.getTranslation(message),undefined);assert.equal(service.getStatus().translated,0);}finally{service.dispose();}
});
test('edited content and language changes cannot reuse an unrelated translation',async()=>{
 const s=setup();await s.service.translateLoaded();assert.equal(s.service.getTranslation(msg('101','changed')),undefined);
 s.service.configure({targetLanguage:'ja'});assert.equal(s.service.getTranslation(msg('101','a')),undefined);await s.service.translateLoaded();assert.equal(s.calls.length,6);
});
test('clear prevents automatic repaint of cleared history until explicit translation',async()=>{
 const s=setup();s.service.enableAuto();await s.service.translateLoaded();s.service.clear();s.service.consider(msg('101','a'));await new Promise(r=>setTimeout(r,5));assert.equal(s.service.getTranslation(msg('101','a')),undefined);
 await s.service.translateLoaded();assert.equal(s.service.getTranslation(msg('101','a'))?.text,'译 a');
});
test('stop and channel switch discard late results',async()=>{
 let channel='one',finish!:(value:{text:string})=>void;
 const service=new TranslationService({getCurrentChannel:()=>channel,getLoadedMessages:()=>[msg('101','old',channel)],settings:{autoTranslate:true},createProvider:()=>({translate:()=>new Promise(resolve=>{finish=resolve;})})});
 service.consider(msg('101','old'));await new Promise(r=>setTimeout(r,1));service.stop();finish({text:'late'});await new Promise(r=>setTimeout(r,1));assert.equal(service.getTranslation(msg('101','old')),undefined);
 channel='two';service.channelChanged();assert.equal(service.getStatus().pending,0);
});
test('deletion invalidates view state without destroying another identical-content result',async()=>{
 const s=setup();s.setMessages([msg('101','same'),msg('102','same')]);await s.service.translateLoaded();s.service.deleted('one','101');assert.equal(s.service.getTranslation(msg('101','same')),undefined);assert.equal(s.service.getTranslation(msg('102','same'))?.text,'译 same');
});
test('actual provider HTTP_429 code suppresses repeated automatic requests',async()=>{
 let calls=0;
 const message=msg('101','limited');
 const service=new TranslationService({settings:{autoTranslate:true},getCurrentChannel:()=> 'one',getLoadedMessages:()=>[message],createProvider:()=>({translate:async()=>{calls++;throw Object.assign(new Error('limit'),{code:'HTTP_429',retryAfterMs:120000});}})});
 service.consider(message);await new Promise(r=>setTimeout(r,5));service.consider(message);await new Promise(r=>setTimeout(r,5));assert.equal(calls,1);assert.match(service.getStatus().lastError||'',/频率/);service.dispose();
});
test('historical rescans stay bounded while all loaded messages are processed',async()=>{
 const loaded=Array.from({length:550},(_,index)=>msg(String(1000+index),'message '+index));let calls=0;
 const service=new TranslationService({settings:{autoTranslate:true},getCurrentChannel:()=> 'one',getLoadedMessages:()=>loaded,createProvider:()=>({translate:async(text)=>{calls++;return {text:'译 '+text};}})});
 let largest=0;const unsubscribe=service.subscribe(()=>{largest=Math.max(largest,service.getStatus().pending);});service.scan();
 const deadline=Date.now()+3000;while(calls<loaded.length){assert(Date.now()<deadline);await new Promise(r=>setTimeout(r,5));}
 assert(largest<=100);assert.equal(calls,550);unsubscribe();service.dispose();
});
test('a provider rate limit pauses distinct queued texts until Retry-After expires',async t=>{
 t.mock.timers.enable({apis:['Date','setTimeout'],now:1000});
 const messages=[msg('101','a'),msg('102','b')],calls:string[]=[];
 const service=new TranslationService({settings:{autoTranslate:false},getCurrentChannel:()=> 'one',getLoadedMessages:()=>messages,createProvider:()=>({translate:async text=>{calls.push(text);if(text==='a')throw Object.assign(new Error('limited'),{code:'HTTP_429',retryAfterMs:120000});return {text:'译 '+text};}})});
 const work=service.translateLoaded();await new Promise(r=>setImmediate(r));
 assert.deepEqual(calls,['a']);t.mock.timers.tick(119999);await new Promise(r=>setImmediate(r));assert.deepEqual(calls,['a']);
 t.mock.timers.tick(1);await work;assert.deepEqual(calls,['a','b']);service.dispose();
});
test('target changes preserve the provider cooldown and stop cancels a cooldown wait',async t=>{
 t.mock.timers.enable({apis:['Date','setTimeout'],now:1000});
 const messages=[msg('101','a')],calls:string[]=[];
 const service=new TranslationService({settings:{autoTranslate:false},getCurrentChannel:()=> 'one',getLoadedMessages:()=>messages,createProvider:()=>({translate:async text=>{calls.push(text);throw Object.assign(new Error('limited'),{code:'HTTP_429',retryAfterMs:120000});}})});
 await service.translateLoaded();service.configure({targetLanguage:'ja'});
 const work=service.translateLoaded();await new Promise(r=>setImmediate(r));assert.equal(calls.length,1);
 service.stop();await work;assert.equal(service.getStatus().pending,0);service.dispose();
});
test('deleting the sole active consumer aborts its request and lets a later message translate',async()=>{
 let messages=[msg('101','old')],oldSignal!:AbortSignal;const calls:string[]=[];
 const service=new TranslationService({settings:{autoTranslate:true},getCurrentChannel:()=> 'one',getLoadedMessages:()=>messages,createProvider:()=>({translate:(text,_target,signal)=>{calls.push(text);if(text==='old'){oldSignal=signal;return new Promise(()=>{});}return Promise.resolve({text:'译 '+text});}})});
 service.consider(messages[0]);await new Promise(r=>setImmediate(r));
 messages=[msg('102','new')];service.deleted('one','101');service.consider(messages[0]);await new Promise(r=>setImmediate(r));
 assert.equal(oldSignal.aborted,true);assert.deepEqual(calls,['old','new']);assert.equal(service.getTranslation(messages[0])?.text,'译 new');service.dispose();
});
test('removing one identical-content consumer keeps the shared request for the other',async()=>{
 let finish!:(value:{text:string})=>void,signal!:AbortSignal;const messages=[msg('101','same'),msg('102','same')];
 const service=new TranslationService({settings:{autoTranslate:true},getCurrentChannel:()=> 'one',getLoadedMessages:()=>messages,createProvider:()=>({translate:(_text,_target,s)=>{signal=s;return new Promise(resolve=>{finish=resolve;});}})});
 messages.forEach(message=>service.consider(message));await new Promise(r=>setImmediate(r));service.deleted('one','101');assert.equal(signal.aborted,false);
 finish({text:'译 same'});await new Promise(r=>setImmediate(r));assert.equal(service.getTranslation(messages[1])?.text,'译 same');assert.equal(service.getTranslation(messages[0]),undefined);service.dispose();
});
test('store rescans invalidate an edited request even with automatic translation disabled',async()=>{
 let messages=[msg('101','old')],oldSignal!:AbortSignal;const calls:string[]=[];
 const service=new TranslationService({settings:{autoTranslate:false},getCurrentChannel:()=> 'one',getLoadedMessages:()=>messages,createProvider:()=>({translate:(text,_target,signal)=>{calls.push(text);if(text==='old'){oldSignal=signal;return new Promise(()=>{});}return Promise.resolve({text:'译 '+text});}})});
 const old=service.translateLoaded();await new Promise(r=>setImmediate(r));messages=[msg('101','edited')];service.scan();
 assert.equal(oldSignal.aborted,true);await old;await service.translateLoaded();assert.deepEqual(calls,['old','edited']);assert.equal(service.getTranslation(messages[0])?.text,'译 edited');service.dispose();
});
test('later manual batches read current store content rather than their frozen history snapshot',async()=>{
 let messages=[...Array.from({length:100},(_,index)=>msg(String(1000+index),'shared')),msg('1100','old')];let finish!:(value:{text:string})=>void;const calls:string[]=[];
 const service=new TranslationService({settings:{autoTranslate:false},getCurrentChannel:()=> 'one',getLoadedMessages:()=>messages,createProvider:()=>({translate:text=>{calls.push(text);return text==='shared'?new Promise(resolve=>{finish=resolve;}):Promise.resolve({text:'译 '+text});}})});
 const work=service.translateLoaded();await new Promise(r=>setImmediate(r));messages=messages.map(message=>message.id==='1100'?{...message,content:'edited'}:message);service.scan();finish({text:'译 shared'});await work;
 assert.deepEqual(calls,['shared','edited']);assert.equal(service.getTranslation(messages.at(-1)!)?.text,'译 edited');service.dispose();
});
