import {createTranslator,type TranslationResult,type TranslatorConfig} from './providers';
import {OrderedQueue,RateGate} from './queue';
import {LANGUAGES} from './languages';
export type MessageRef={id:string;channelId:string;content:string};
export type Settings=TranslatorConfig & {autoTranslate:boolean};
export const DEFAULT_SETTINGS:Settings={autoTranslate:true,provider:'bing',targetLanguage:'zh-CN',officialFallback:false,microsoftKey:'',microsoftRegion:'',microsoftEndpoint:'https://api.cognitive.microsofttranslator.com',minIntervalMs:1200,requestTimeoutMs:8000};
type Provider={translate(text:string,target:string,signal:AbortSignal):Promise<TranslationResult>};
type Options={settings?:Partial<Settings>;persistedSettings?:Record<string,unknown>;getCurrentChannel:()=>string|null;getLoadedMessages:(channel:string)=>MessageRef[];createProvider?:(config:TranslatorConfig)=>Provider;diagnostics?:()=>unknown};
type RecordEntry={source:string;target:string;result:TranslationResult};
type Pending={source:string;target:string;epoch:number;jobKey:string;promise:Promise<void>};
function byId(a:MessageRef,b:MessageRef):number{return a.id.length-b.id.length||a.id.localeCompare(b.id);}
export class TranslationService{
 private settings:Settings;private provider!:Provider;private queue=new OrderedQueue<TranslationResult>(500);
 private cooldown=new RateGate(0);
 private records=new Map<string,RecordEntry>();private cache=new Map<string,{time:number;result:TranslationResult}>();
 private pending=new Map<string,Pending>();private seen=new Map<string,MessageRef>();private suppressed=new Set<string>();private failed=new Map<string,number>();
 private selectionListeners=new Set<()=>void>();private selectionSignature:string|null=null;
 private listeners=new Set<()=>void>();private epoch=0;private current:string|null;private lastError:string|null=null;private disposed=false;private scanRunning=false;private scanAgain=false;
 constructor(private readonly options:Options){this.settings=this.validate({...DEFAULT_SETTINGS,...options.persistedSettings,...options.settings});this.current=options.getCurrentChannel();this.makeProvider();}
 private validate(value:Settings):Settings{
  const number=(v:number,fallback:number,min:number,max:number)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
  return {...DEFAULT_SETTINGS,autoTranslate:typeof value.autoTranslate==='boolean'?value.autoTranslate:true,provider:value.provider==='microsoft'?'microsoft':'bing',
   targetLanguage:LANGUAGES.some(lang=>lang.id===value.targetLanguage)?value.targetLanguage:'zh-CN',officialFallback:value.officialFallback===true,
   microsoftKey:typeof value.microsoftKey==='string'?value.microsoftKey.trim():'',microsoftRegion:typeof value.microsoftRegion==='string'?value.microsoftRegion.trim():'',
   microsoftEndpoint:typeof value.microsoftEndpoint==='string'?value.microsoftEndpoint.trim():DEFAULT_SETTINGS.microsoftEndpoint,
   minIntervalMs:number(value.minIntervalMs,1200,500,10000),requestTimeoutMs:number(value.requestTimeoutMs,8000,2000,20000)};
 }
 private makeProvider():void{const gate=new RateGate(this.settings.minIntervalMs);this.provider=this.options.createProvider?this.options.createProvider({...this.settings}):createTranslator({...this.settings},{gate:async signal=>{await gate.wait(signal);await this.cooldown.wait(signal);}});}
 private persist():void{if(this.options.persistedSettings)Object.assign(this.options.persistedSettings,this.settings);}
 private messageKey(message:Pick<MessageRef,'id'|'channelId'>):string{return JSON.stringify([message.channelId,message.id]);}
 private contentKey(content:string):string{return JSON.stringify([this.settings.provider,this.settings.targetLanguage,content]);}
 private emit():void{for(const listener of [...this.listeners])listener();}
 subscribe(listener:()=>void):()=>void{this.listeners.add(listener);return()=>this.listeners.delete(listener);}
 getSettings():Settings{return {...this.settings};}
 getStatus(){return {pending:this.pending.size,active:this.queue.isActive,lastError:this.lastError,translated:this.records.size,diagnostics:this.options.diagnostics?.()};}
 getTranslation(message:MessageRef):TranslationResult|undefined{if(this.disposed||message.channelId!==this.current)return;const item=this.records.get(this.messageKey(message));if(item?.source===message.content&&item.target===this.settings.targetLanguage)return item.result;}
 consider(message:MessageRef):void{if(this.settings.autoTranslate&&!this.disposed)void this.schedule(message,false);}
 scan():void{this.channelChanged();this.refreshSelection();if(this.disposed||!this.current)return;this.reconcile(this.options.getLoadedMessages(this.current));if(!this.settings.autoTranslate)return;if(this.scanRunning){this.scanAgain=true;return;}
  this.scanRunning=true;
  void (async()=>{try{do{this.scanAgain=false;const epoch=this.epoch,channel=this.current;if(!channel)break;const messages=this.options.getLoadedMessages(channel).slice().sort(byId);
   for(let offset=0;offset<messages.length;offset+=100){if(this.disposed||!this.settings.autoTranslate||this.current!==channel||this.epoch!==epoch)break;await Promise.all(messages.slice(offset,offset+100).map(message=>this.schedule(message,false,true)));}
  }while(this.scanAgain&&!this.disposed&&this.settings.autoTranslate);}finally{this.scanRunning=false;}})();
 }
 channelChanged():void{const channel=this.options.getCurrentChannel();if(channel===this.current)return;this.cancel();this.current=channel;this.seen.clear();this.suppressed.clear();this.lastError=null;this.emit();}
 private cancel():void{this.epoch++;this.queue.cancel();this.pending.clear();}
 private release(key:string):void{
  const pending=this.pending.get(key);if(!pending)return;
  this.pending.delete(key);
  // Identical text can belong to several messages; abort only its final consumer.
  if(![...this.pending.values()].some(other=>other.jobKey===pending.jobKey))this.queue.cancelKey(pending.jobKey);
 }
 private reconcile(messages:MessageRef[]):void{
  const loaded=new Map(messages.filter(message=>message.channelId===this.current).map(message=>[this.messageKey(message),message]));let changed=false;
  for(const [key,previous]of this.seen){if(previous.channelId!==this.current)continue;
   const latest=loaded.get(key);if(latest?.content===previous.content)continue;
   this.release(key);this.records.delete(key);if(latest)this.seen.set(key,{...latest});else this.seen.delete(key);changed=true;
  }
  if(changed)this.emit();
 }
 private trim():void{while(this.records.size>600)this.records.delete(this.records.keys().next().value!);while(this.cache.size>300)this.cache.delete(this.cache.keys().next().value!);while(this.seen.size>1000)this.seen.delete(this.seen.keys().next().value!);while(this.failed.size>500)this.failed.delete(this.failed.keys().next().value!);while(this.suppressed.size>1000)this.suppressed.delete(this.suppressed.values().next().value!);}
 private schedule(message:MessageRef,force:boolean,fromLoaded=false):Promise<void>{
  if(this.disposed||!message.id||!message.channelId)return Promise.resolve();
  this.channelChanged();if(message.channelId!==this.current)return Promise.resolve();
  // A history batch is a snapshot. Re-read before scheduling so edits/deletions that
  // happened while an earlier batch was running never send its stale original.
  const latest=this.options.getLoadedMessages(message.channelId).find(candidate=>candidate.id===message.id&&candidate.channelId===message.channelId);
  if(latest)message=latest;else if(fromLoaded)return Promise.resolve();
  const key=this.messageKey(message),source=message.content,target=this.settings.targetLanguage,epoch=this.epoch;
  const previous=this.seen.get(key);if(previous&&previous.content!==source){this.release(key);this.records.delete(key);}
  this.seen.set(key,{...message});this.trim();
  if(!source?.trim()){this.release(key);this.records.delete(key);this.emit();return Promise.resolve();}
  const contentKey=this.contentKey(source),signature=JSON.stringify([key,target,source]);
  if(!force&&(this.suppressed.has(signature)||(this.failed.get(contentKey)||0)>Date.now()))return Promise.resolve();
  if(force)this.suppressed.delete(signature);
  if(this.getTranslation(message))return Promise.resolve();
  const waiting=this.pending.get(key);if(waiting?.source===source&&waiting.target===target&&waiting.epoch===epoch)return waiting.promise;
  const cached=this.cache.get(contentKey);if(cached&&Date.now()-cached.time<86400000){this.records.set(key,{source,target,result:cached.result});this.emit();return Promise.resolve();}
  if(this.records.has(key))this.records.delete(key);
  const provider=this.provider;
  const request=this.queue.enqueue(contentKey,async signal=>{
   await this.cooldown.wait(signal);
   try{return await provider.translate(source,target,signal);}
   catch(error){const failure=error as {code?:string;retryAfterMs?:number};if(!signal.aborted&&['RATE_LIMIT','HTTP_429','BING_429'].includes(failure?.code||''))this.cooldown.pauseUntil(Date.now()+Math.max(60000,failure.retryAfterMs||0));throw error;}
  });
  const pending:Pending={source,target,epoch,jobKey:contentKey,promise:Promise.resolve()};
  this.pending.set(key,pending);
  pending.promise=request.then(result=>{
   if(this.disposed||epoch!==this.epoch||this.pending.get(key)!==pending||this.seen.get(key)?.content!==source||target!==this.settings.targetLanguage||message.channelId!==this.current)return;
   this.cache.delete(contentKey);this.cache.set(contentKey,{time:Date.now(),result});
   if(result.text&&result.text!==source)this.records.set(key,{source,target,result});
   this.lastError=null;this.failed.delete(contentKey);this.trim();
  },error=>{
   if(this.disposed||epoch!==this.epoch||this.pending.get(key)!==pending||error?.name==='AbortError')return;
   const code=error?.code,limited=['RATE_LIMIT','HTTP_429','BING_429'].includes(code),auth=['AUTH','HTTP_401','HTTP_403','SESSION_EXPIRED'].includes(code),config=['CONFIG','MISSING_KEY','INVALID_ENDPOINT','INVALID_LANGUAGE'].includes(code);
   this.lastError=limited?'翻译服务限制请求频率，请稍后再试。':auth?'翻译鉴权失败，请检查接口和可选官方 API 配置。':code==='TIMEOUT'?'翻译请求超时，原文已保留。':config?'请检查 Microsoft API 密钥、区域及 HTTPS 地址。':'翻译请求失败，原文已保留；可在设置中重试。';
   this.failed.set(contentKey,Date.now()+(limited?Math.max(60000,error?.retryAfterMs||0):30000));this.trim();
  }).finally(()=>{if(this.pending.get(key)===pending)this.pending.delete(key);if(!this.disposed)this.emit();});
  this.emit();return pending.promise;
 }
 async translateLoaded():Promise<void>{if(this.disposed)return;this.channelChanged();if(!this.current){this.lastError='尚未取得当前频道，请先进入文字频道并加载消息，再返回插件设置。';this.emit();return;}this.lastError=null;const channel=this.current,epoch=this.epoch;const messages=this.options.getLoadedMessages(channel).slice().sort(byId);
  if(!messages.length){this.lastError='当前频道没有可读取的已加载消息，请打开文字频道并滚动加载，再重试。';this.emit();return;}
  // Batches cap retained promises and prevent queue overflow on very long loaded histories.
  for(let offset=0;offset<messages.length;offset+=100){if(this.epoch!==epoch||this.current!==channel||this.disposed)return;await Promise.all(messages.slice(offset,offset+100).map(message=>this.schedule(message,true,true)));}
 }
 configure(patch:Record<string,unknown>):void{const previous=this.settings;this.settings=this.validate({...this.settings,...patch} as Settings);this.persist();
  const providerChange=['provider','targetLanguage','officialFallback','microsoftKey','microsoftRegion','microsoftEndpoint','minIntervalMs','requestTimeoutMs'].some(key=>(previous as unknown as Record<string,unknown>)[key]!==patch[key]&&Object.prototype.hasOwnProperty.call(patch,key));
  if(providerChange){this.cancel();this.records.clear();this.cache.clear();this.failed.clear();this.suppressed.clear();this.makeProvider();}
  if(!this.settings.autoTranslate&&previous.autoTranslate)this.cancel();this.emit();if(this.settings.autoTranslate)this.scan();
 }
 subscribeSelection(listener:()=>void):()=>void{
  if(this.disposed)return()=>{};
  this.selectionListeners.add(listener);
  if(this.selectionListeners.size===1)this.selectionSignature=this.selectionFingerprint();
  listener();
  return()=>{this.selectionListeners.delete(listener);if(!this.selectionListeners.size)this.selectionSignature=null;};
 }
 private selectionFingerprint():string{const snapshot=this.getSelectionSnapshot();return JSON.stringify([snapshot.channelId,snapshot.messages.map(m=>[m.id,m.content])]);}
 private refreshSelection():void{
  if(!this.selectionListeners.size)return;
  const next=this.selectionFingerprint();if(next===this.selectionSignature)return;this.selectionSignature=next;
  for(const listener of [...this.selectionListeners])listener();
 }
 getSelectionSnapshot():{channelId:string|null;messages:MessageRef[]}{
  const channelId=this.disposed?null:this.options.getCurrentChannel();
  return {channelId,messages:channelId?this.options.getLoadedMessages(channelId).filter(m=>m.channelId===channelId&&m.content.trim()).map(m=>({...m})).sort(byId):[]};
 }
 async translateSelected(channelId:string,messages:MessageRef[]):Promise<void>{
  if(this.disposed)return;this.channelChanged();
  if(!this.current||channelId!==this.current){this.lastError='所选消息不属于当前频道，请重新选择。';this.emit();return;}
  const loaded=new Map(this.options.getLoadedMessages(channelId).map(m=>[m.id,m]));
  const chosen=new Map<string,MessageRef>();
  for(const message of messages){
   const latest=message&&loaded.get(message.id);
   if(!latest||message.channelId!==channelId||latest.channelId!==channelId||latest.content!==message.content){this.lastError='所选消息已更改或移除，请重新选择。';this.emit();return;}
   if(latest.content.trim())chosen.set(latest.id,{...latest});
  }
  if(!chosen.size){this.lastError='请先勾选需要翻译的消息。';this.emit();return;}
  const epoch=this.epoch;let skipped=0;this.lastError=null;this.emit();
  for(const message of [...chosen.values()].sort(byId)){
   if(this.disposed||this.epoch!==epoch||this.current!==channelId||this.options.getCurrentChannel()!==channelId)return;
   const latest=this.options.getLoadedMessages(channelId).find(m=>m.id===message.id&&m.channelId===channelId);
   if(!latest||latest.content!==message.content){skipped++;continue;}
   await this.schedule(message,true,true);
  }
  if(skipped&&this.epoch===epoch&&!this.disposed){this.lastError='已跳过 '+skipped+' 条已更改或移除的消息，请重新勾选。';this.emit();}
 }
 async translateMessage(message:MessageRef):Promise<TranslationResult|undefined>{
  if(this.disposed)return;this.channelChanged();
  if(message.channelId!==this.current)return;
  const latest=this.options.getLoadedMessages(message.channelId).find(m=>m.id===message.id&&m.channelId===message.channelId);if(!latest)return;
  const epoch=this.epoch;await this.schedule(latest,true,true);
  if(this.disposed||this.epoch!==epoch||this.current!==latest.channelId||!this.options.getLoadedMessages(latest.channelId).some(m=>m.id===latest.id&&m.content===latest.content))return;
  const shown=this.getTranslation(latest);if(shown)return shown;
  const cached=this.cache.get(this.contentKey(latest.content));if(cached&&Date.now()-cached.time<86400000)return cached.result;
 }
 enableAuto():void{this.suppressed.clear();this.configure({autoTranslate:true});}
 stop():void{this.settings.autoTranslate=false;this.persist();this.cancel();this.emit();}
 clear():void{for(const [key,message]of this.seen)this.suppressed.add(JSON.stringify([key,this.settings.targetLanguage,message.content]));this.cancel();this.records.clear();this.cache.clear();this.failed.clear();this.lastError=null;this.emit();}
 deleted(channelId:string,messageId:string):void{const key=this.messageKey({id:messageId,channelId});this.records.delete(key);this.seen.delete(key);this.release(key);this.emit();}
 dispose():void{this.disposed=true;this.selectionListeners.clear();this.selectionSignature=null;this.cancel();this.records.clear();this.cache.clear();this.seen.clear();this.failed.clear();this.suppressed.clear();this.emit();this.listeners.clear();}
}
