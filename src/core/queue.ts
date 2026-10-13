export function abortError(): Error { return Object.assign(new Error('Translation cancelled'), {name:'AbortError'}); }
export function delay(ms:number,signal:AbortSignal):Promise<void>{
 return new Promise((resolve,reject)=>{
  if(signal.aborted)return reject(abortError());
  const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(abortError());};
  const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},Math.max(0,ms));
  signal.addEventListener('abort',abort,{once:true});
 });
}
export class RateGate{
 private nextAt=0;private pausedUntil=0;
 constructor(private readonly interval:number){}
 pauseUntil(timestamp:number):void{if(Number.isFinite(timestamp))this.pausedUntil=Math.max(this.pausedUntil,timestamp);}
 async wait(signal:AbortSignal):Promise<void>{
  if(signal.aborted)throw abortError();
  const now=Date.now(),start=Math.max(now,this.nextAt,this.pausedUntil);this.nextAt=start+Math.max(0,this.interval);
  if(start>now)await delay(start-now,signal);
  // A later response can extend the cooldown while this reservation is waiting.
  while(Date.now()<this.pausedUntil)await delay(this.pausedUntil-Date.now(),signal);
  if(signal.aborted)throw abortError();
 }
}
type Work<T>={key:string;run:(signal:AbortSignal)=>Promise<T>;promise:Promise<T>;resolve:(value:T)=>void;reject:(error:unknown)=>void;controller:AbortController};
export class OrderedQueue<T>{
 private waiting:Work<T>[]=[];private all=new Map<string,Work<T>>();private running=false;private active?:Work<T>;
 constructor(private readonly maximum=500){}
 get pending():number{return this.all.size;}
 get isActive():boolean{return !!this.active;}
 enqueue(key:string,run:(signal:AbortSignal)=>Promise<T>):Promise<T>{
  const existing=this.all.get(key);if(existing)return existing.promise;
  if(this.waiting.length>=this.maximum)return Promise.reject(new Error('Translation queue is full'));
  let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
  const job={key,run,promise,resolve,reject,controller:new AbortController()};this.all.set(key,job);this.waiting.push(job);
  void Promise.resolve().then(()=>this.pump());return promise;
 }
 cancelKey(key:string):void{
  const job=this.all.get(key);if(!job)return;
  this.all.delete(key);this.waiting=this.waiting.filter(waiting=>waiting!==job);
  job.controller.abort();job.reject(abortError());
 }
 cancel():void{
  for(const job of this.waiting){job.controller.abort();job.reject(abortError());if(this.all.get(job.key)===job)this.all.delete(job.key);}
  this.waiting=[];
  if(this.active){this.active.controller.abort();this.active.reject(abortError());if(this.all.get(this.active.key)===this.active)this.all.delete(this.active.key);}
 }
 private async pump():Promise<void>{
  if(this.running)return;this.running=true;
  try{while(this.waiting.length){
   const job=this.waiting.shift()!;this.active=job;const signal=job.controller.signal;
   let onAbort!:()=>void;
   const aborted=new Promise<never>((_,reject)=>{onAbort=()=>reject(abortError());signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)onAbort();});
   try{job.resolve(await Promise.race([Promise.resolve().then(()=>{if(signal.aborted)throw abortError();return job.run(signal);}),aborted]));}
   catch(error){job.reject(error);}
   finally{signal.removeEventListener('abort',onAbort);if(this.all.get(job.key)===job)this.all.delete(job.key);if(this.active===job)this.active=undefined;}
  }}finally{this.running=false;}
 }
}
