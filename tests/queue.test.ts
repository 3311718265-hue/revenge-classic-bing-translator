import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OrderedQueue,RateGate} from '../src/core/queue';
test('queue follows input order and deduplicates an active translation',async()=>{
 const queue=new OrderedQueue<string>(10),order:string[]=[];
 const run=(value:string)=>async()=>{order.push(value);await new Promise(r=>setTimeout(r,2));return value;};
 const a=queue.enqueue('a',run('a'));const duplicate=queue.enqueue('a',run('duplicate'));
 const b=queue.enqueue('b',run('b')),c=queue.enqueue('c',run('c'));
 assert.equal(a,duplicate);assert.deepEqual(await Promise.all([a,b,c]),['a','b','c']);assert.deepEqual(order,['a','b','c']);
});
test('cancel settles active and queued tasks even when transport ignores abort',async()=>{
 const queue=new OrderedQueue<string>(2);
 const a=queue.enqueue('a',()=>new Promise(()=>{}));const b=queue.enqueue('b',async()=> 'b');
 const settled=Promise.allSettled([a,b]);await new Promise(r=>setTimeout(r,1));queue.cancel();
 assert((await settled).every(result=>result.status==='rejected'));
 assert.equal(await queue.enqueue('next',async()=> 'next'),'next');
});
test('queue is bounded and rejected overflow does not disrupt earlier work',async()=>{
 const queue=new OrderedQueue<string>(1);let finish!:(value:string)=>void;
 const first=queue.enqueue('a',()=>new Promise(resolve=>{finish=resolve;}));
 await new Promise(r=>setTimeout(r,1));const second=queue.enqueue('b',async()=> 'b');
 await assert.rejects(queue.enqueue('c',async()=> 'c'),/queue/i);finish('a');await Promise.all([first,second]);
});
test('rate gate spaces network starts and aborts a waiting slot',async()=>{
 const gate=new RateGate(25),controller=new AbortController();
 await gate.wait(controller.signal);const start=Date.now();await gate.wait(controller.signal);assert(Date.now()-start>=20);
 const waiting=gate.wait(controller.signal);controller.abort();await assert.rejects(waiting,/abort|cancel/i);
});
test('cancelling one queue key releases an uncooperative active transport and preserves other work',async()=>{
 const queue=new OrderedQueue<string>();let signal!:AbortSignal;
 const obsolete=queue.enqueue('obsolete',s=>{signal=s;return new Promise(()=>{});});
 const settled=Promise.allSettled([obsolete]);
 await new Promise(r=>setImmediate(r));
 const next=queue.enqueue('next',async()=> 'next');
 queue.cancelKey('obsolete');
 assert.equal(signal.aborted,true);assert.equal((await settled)[0].status,'rejected');assert.equal(await next,'next');
});
test('cancelling a queued key never starts its transport',async()=>{
 const queue=new OrderedQueue<string>();let finish!:(value:string)=>void,called=false;
 const first=queue.enqueue('first',()=>new Promise(resolve=>{finish=resolve;}));
 await new Promise(r=>setImmediate(r));
 const abandoned=queue.enqueue('abandoned',async()=>{called=true;return 'abandoned';});
 const settled=Promise.allSettled([abandoned]);queue.cancelKey('abandoned');finish('first');
 await first;await settled;assert.equal(called,false);
});
test('rate gate respects an extended service-wide deadline and aborts a cooldown wait',async t=>{
 t.mock.timers.enable({apis:['Date','setTimeout'],now:1000});
 const gate=new RateGate(0),controller=new AbortController();
 gate.pauseUntil(2000);let started=false;
 const waiting=gate.wait(controller.signal).then(()=>{started=true;});
 t.mock.timers.tick(999);await Promise.resolve();assert.equal(started,false);
 gate.pauseUntil(3000);t.mock.timers.tick(1);await Promise.resolve();assert.equal(started,false);
 t.mock.timers.tick(1000);await waiting;assert.equal(started,true);
 gate.pauseUntil(4000);const cancelled=gate.wait(controller.signal);controller.abort();await assert.rejects(cancelled,/cancel/i);
});
