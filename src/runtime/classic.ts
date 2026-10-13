export type MessageRef={id:string;channelId:string;content:string};
export interface ClassicHost {
  React:any;RN:any;storage:Record<string,any>;
  logger:{log(...args:any[]):void;warn(...args:any[]):void;error(...args:any[]):void};
  getCurrentChannel():string|null;
  getLoadedMessages(channelId:string):MessageRef[];
  observe(callback:(event:{type:'messages'|'channel'|'delete';channelId?:string;messageId?:string})=>void):()=>void;
  installMessageRenderer(render:(original:any,message:MessageRef)=>any):()=>void;
  installNativeTranslations?(source:{getTranslation(message:MessageRef):{text:string}|undefined;consider(message:MessageRef):void;subscribe(cb:()=>void):()=>void;getSettings():{targetLanguage:string}}):()=>void;
  diagnostics():{[key:string]:unknown};
}
export function createClassicHost(api:any,storage:any,logger:any):ClassicHost {
  const globals=globalThis as any;
  const metro=api?.metro??{};
  const common=metro.common??{};
  const log=logger??console;
  const safely=(fn:()=>any)=>{try{return fn();}catch{return undefined;}};
  const findProps=(...props:string[])=>safely(()=>metro.findByProps?.(...props));
  const findStore=(name:string)=>safely(()=>metro.findByStoreName?.(name));
  const messageStore=findStore('MessageStore')??findProps('getMessages','getMessage');
  const channelStore=findStore('SelectedChannelStore')??findProps('getChannelId');
  const dispatcher=common.FluxDispatcher??findProps('dispatch','subscribe','unsubscribe');
  // Vendetta compatibility does not re-export this API. Classic exposes it under bunny.
  const jsx=api?.api?.react?.jsx??globals.bunny?.api?.react?.jsx;
  const React=common.React??globals.bunny?.metro?.common?.React;
  const RN=common.ReactNative??globals.bunny?.metro?.common?.ReactNative;
  const stats={observedMessageRenders:0,rejectedMessageProps:0,rendererErrors:0,registeredNames:[] as string[],observedComponent:null as string|null,activeRenderer:false};
  const nativeStats={nativeHookAvailable:false,nativeRowsObserved:0,nativeRowsTranslated:0,nativeUnsupportedRows:0,nativeReplayCount:0,nativeOriginalsLimitReached:false,nativeActive:false,nativeContentNodeRows:0,nativeLocalRepaints:0,nativeRepaintUnavailable:false,nativeRepaintLimitReached:false,nativeRowManagerActive:false,nativeRowManagerHooks:0,nativeDiscoveryAttempts:0,nativeDiscoveryStatus:'waiting'};
  let restoreNative:(()=>void)|undefined;
  const snowflake=(value:any):value is string=>typeof value==='string'&&/^\d{15,22}$/.test(value);
  const ref=(record:any):MessageRef|null=>{
    if(!record||typeof record!=='object')return null;
    const channelId=record.channel_id??record.channelId;
    return snowflake(record.id)&&snowflake(channelId)&&typeof record.content==='string'
      ?{id:record.id,channelId,content:record.content}:null;
  };
  const getCurrentChannel=():string|null=>{
    const id=safely(()=>channelStore?.getChannelId?.());
    return snowflake(id)?id:null;
  };
  const getLoadedMessages=(channelId:string):MessageRef[]=>{
    if(!snowflake(channelId))return [];
    const result=safely(()=>{
      const collection=messageStore?.getMessages?.(channelId);
      const rows=Array.isArray(collection)?collection:Array.isArray(collection?._array)?collection._array:
        typeof collection?.toArray==='function'?collection.toArray():collection instanceof Map?Array.from(collection.values()):[];
      if(!Array.isArray(rows))return [];
      const found=new Map<string,MessageRef>();
      for(const row of rows){const message=ref(row);if(message?.channelId===channelId)found.set(message.id,message);}
      return Array.from(found.values());
    });
    return result??[];
  };
  const observe:ClassicHost['observe']=(callback)=>{
    let active=true;
    const disposers:Array<()=>void>=[];
    const emit=(event:Parameters<typeof callback>[0])=>{
      // Store reducers finish the current dispatch before the consumer scans history.
      Promise.resolve().then(()=>{if(active)callback(event);}).catch(e=>log.warn('Classic observation callback failed',e));
    };
    const eventChannel=(payload:any)=>{
      const id=payload?.channelId??payload?.channel_id??payload?.message?.channel_id??payload?.message?.channelId;
      return snowflake(id)?id:undefined;
    };
    const subscribe=(name:string,fn:(payload:any)=>void)=>{
      if(typeof dispatcher?.subscribe!=='function'||typeof dispatcher?.unsubscribe!=='function')return;
      try{dispatcher.subscribe(name,fn);disposers.push(()=>dispatcher.unsubscribe(name,fn));}
      catch(e){log.warn('Classic event unavailable',name,e);}
    };
    for(const type of ['MESSAGE_CREATE','MESSAGE_UPDATE','LOAD_MESSAGES_SUCCESS','LOAD_MESSAGES_AROUND_SUCCESS','LOAD_RECENT_MESSAGES_SUCCESS','LOAD_MESSAGES_FOR_CHANNEL_SUCCESS'])
      subscribe(type,p=>emit({type:'messages',channelId:eventChannel(p)??getCurrentChannel()??undefined}));
    subscribe('CHANNEL_SELECT',p=>emit({type:'channel',channelId:eventChannel(p)??getCurrentChannel()??undefined}));
    subscribe('MESSAGE_DELETE',p=>{
      const id=p?.id??p?.messageId;
      if(snowflake(id))emit({type:'delete',channelId:eventChannel(p),messageId:id});
    });
    subscribe('MESSAGE_DELETE_BULK',p=>{
      for(const id of Array.isArray(p?.ids)?p.ids:[])if(snowflake(id))emit({type:'delete',channelId:eventChannel(p),messageId:id});
    });
    const listen=(store:any,fn:()=>void)=>{
      if(typeof store?.addChangeListener!=='function'||typeof store?.removeChangeListener!=='function')return;
      try{store.addChangeListener(fn);disposers.push(()=>store.removeChangeListener(fn));}
      catch(e){log.warn('Classic store listener unavailable',e);}
    };
    listen(messageStore,()=>emit({type:'messages',channelId:getCurrentChannel()??undefined}));
    listen(channelStore,()=>emit({type:'channel',channelId:getCurrentChannel()??undefined}));
    return ()=>{if(!active)return;active=false;for(const dispose of disposers.splice(0))try{dispose();}catch(e){log.warn('Classic observer cleanup failed',e);}};
  };
  const installMessageRenderer:ClassicHost['installMessageRenderer']=(render)=>{
    if(typeof jsx?.onJsxCreate!=='function'||typeof jsx?.deleteJsxCreate!=='function'){
      log.warn('Classic JSX hook API unavailable; checking the native message bridge separately');
      return ()=>{};
    }
    let active=true;
    const registrations:Array<[string,(component:any,element:any)=>any]>=[];
    // These are guarded runtime probes, not a claim that Discord 348 uses these names.
    // Selecting the first validated component avoids adding two sections in nested wrappers.
    const candidates=['MessageContent','MessageBody','ChatMessage','MessageRow'];
    for(const name of candidates){
      const cb=(_component:any,original:any)=>{
        if(!active||!original?.props||(stats.observedComponent&&stats.observedComponent!==name))return original;
        const props=original.props;
        const candidate=ref(props.message)??ref(props.item?.message)??ref(props.messageRecord);
        if(!candidate)return original;
        const stored=ref(safely(()=>messageStore?.getMessage?.(candidate.channelId,candidate.id)));
        if(!stored||stored.content!==candidate.content){stats.rejectedMessageProps++;return original;}
        try{
          const result=render(original,stored);
          if(result===undefined||result===null)return original;
          const wasUnobserved=stats.observedMessageRenders===0;
          stats.observedComponent=name;stats.observedMessageRenders++;
          if(wasUnobserved)restoreNative?.();
          return result;
        }catch(e){stats.rendererErrors++;log.warn('Classic translation renderer failed safely',e);return original;}
      };
      try{jsx.onJsxCreate(name,cb);registrations.push([name,cb]);}
      catch(e){log.warn('Classic JSX candidate unavailable',name,e);}
    }
    stats.registeredNames=registrations.map(([name])=>name);stats.activeRenderer=registrations.length>0;
    return ()=>{
      if(!active)return;active=false;stats.activeRenderer=false;
      for(const [name,cb]of registrations.splice(0))try{jsx.deleteJsxCreate(name,cb);}catch(e){log.warn('Classic JSX cleanup failed',name,e);}
      stats.registeredNames=[];stats.observedComponent=null;
    };
  };
  const installBridgeTranslations=(source:Parameters<NonNullable<ClassicHost['installNativeTranslations']>>[0],bridge:any)=>{
    const before=api?.patcher?.before??globals.bunny?.api?.patcher?.before;
    nativeStats.nativeHookAvailable=typeof bridge?.updateRows==='function'&&typeof before==='function';
    if(!nativeStats.nativeHookAvailable)return ()=>{};
    let active=true,replaying=false,timer:ReturnType<typeof setTimeout>|undefined;
    let channel:string|null=null,lastArgs:any[]|undefined;
    const originals=new Map<number,any>();
    const sourceRevisions=new Map<number,string>();
    const repaintKeys=new Set<string>();
    const originalMethod=bridge.updateRows;
    const reset=(next:string|null)=>{originals.clear();sourceRevisions.clear();repaintKeys.clear();lastArgs=undefined;channel=next;};
    const storedForRow=(row:any):MessageRef|null=>{
      if(row?.type!==1||!Number.isSafeInteger(row.index)||row.index<0||!row.message||typeof row.message!=='object')return null;
      const id=row.message.id,channelId=row.message.channelId??row.message.channel_id;
      if(!snowflake(id)||!snowflake(channelId)||channelId!==getCurrentChannel())return null;
      const stored=ref(safely(()=>messageStore?.getMessage?.(channelId,id)));
      if(!stored||stored.id!==id||stored.channelId!==channelId)return null;
      const content=row.message.content;
      // Plain strings must match the source; serialized AST strings are not safe text.
      if(typeof content==='string')return content===stored.content?stored:null;
      // Modern native content trees contain primitive text or typed nodes. Preserve every
      // original node unchanged; add only native shapes evidenced by existing plugins.
      return Array.isArray(content)&&content.every(node=>typeof node==='string'||(node&&typeof node==='object'&&!Array.isArray(node)&&typeof node.type==='string'))?stored:null;
    };
    const decorate=(row:any,message:MessageRef)=>{
      if(stats.observedMessageRenders>0)return row;
      const translation=safely(()=>source.getTranslation(message));
      if(!translation||typeof translation.text!=='string'||!translation.text.trim())return row;
      const target=safely(()=>source.getSettings().targetLanguage);
      if(typeof target!=='string'||target.length>40||/[\r\n]/.test(target))return row;
      nativeStats.nativeRowsTranslated++;
      const content=Array.isArray(row.message.content)
        ?[...row.message.content,'\n',{type:'subtext',content:['译文 · '+target]},'\n',translation.text]
        :row.message.content+'\n\n[译文 · '+target+']\n'+translation.text;
      return {...row,message:{...row.message,content}};
    };
    const replay=(restoreOnly=false)=>{
      if(!active||!lastArgs||!channel||getCurrentChannel()!==channel)return;
      const rows:any[]=[];
      for(const [index,row]of originals){
        const stored=storedForRow(row);
        if(!stored||stored.content!==sourceRevisions.get(index)){originals.delete(index);sourceRevisions.delete(index);continue;}
        const repaint=restoreOnly?row:decorate(row,stored);
        // A native INSERT reissued as-is inserts another row. Repaint is always UPDATE.
        rows.push(Number.isInteger(row.changeType)?{...repaint,index,changeType:2}:repaint);
      }
      if(!rows.length)return;
      const args=[...lastArgs];args[1]=JSON.stringify(rows);if(typeof args[2]==='boolean')args[2]=false;
      try{replaying=true;originalMethod.apply(bridge,args);nativeStats.nativeReplayCount++;}
      catch(e){log.warn('Classic native translation replay failed',e);}
      finally{replaying=false;}
    };
    const scheduleReplay=()=>{
      if(!active)return;
      if(timer!==undefined)clearTimeout(timer);
      timer=setTimeout(()=>{timer=undefined;replay();},75);
      // Native rows may have been drawn before this plugin started. Ask the local
      // Discord pipeline to regenerate ready translations using its own untouched record.
      Promise.resolve().then(()=>{
        if(!active||stats.observedMessageRenders>0)return;
        const current=getCurrentChannel();if(!current)return;
        if(channel!==current)reset(current);
        for(const message of getLoadedMessages(current)){
          if(!active||getCurrentChannel()!==current)return;
          const captured=Array.from(originals.entries()).some(([index,row])=>row.message?.id===message.id&&sourceRevisions.get(index)===message.content);
          if(captured)continue;
          const translation=safely(()=>source.getTranslation(message));
          const target=safely(()=>source.getSettings().targetLanguage);
          if(typeof translation?.text!=='string'||!translation.text.trim()||typeof target!=='string')continue;
          const key=JSON.stringify([current,message.id,message.content,target,translation.text]);
          if(repaintKeys.has(key))continue;
          if(repaintKeys.size>=500){nativeStats.nativeRepaintLimitReached=true;continue;}
          if(typeof dispatcher?.dispatch!=='function'){nativeStats.nativeRepaintUnavailable=true;continue;}
          const record=safely(()=>messageStore?.getMessage?.(current,message.id));
          const latest=ref(record);
          if(!latest||latest.id!==message.id||latest.channelId!==current||latest.content!==message.content||!active||getCurrentChannel()!==current)continue;
          // Mark before dispatch because the event can synchronously notify this service.
          repaintKeys.add(key);nativeStats.nativeLocalRepaints++;
          try{Promise.resolve(dispatcher.dispatch({type:'MESSAGE_UPDATE',message:record})).catch(e=>log.warn('Classic local native repaint failed',e));}
          catch(e){log.warn('Classic local native repaint failed',e);}
        }
      }).catch(e=>log.warn('Classic loaded-message repaint scan failed',e));
    };
    restoreNative=()=>{
      if(!active)return;
      if(timer!==undefined){clearTimeout(timer);timer=undefined;}
      // Preserve the native chat call stack while finishing the current JSX creation.
      Promise.resolve().then(()=>{if(active)replay(true);});
    };
    let unpatch:()=>void,unpatchClear:()=>void=()=>{};
    try{
      unpatch=before('updateRows',bridge,(args:any[])=>{
        if(!active||replaying||typeof args?.[1]!=='string')return;
        const rows=safely(()=>JSON.parse(args[1]));
        if(!Array.isArray(rows)||rows.length>2000){nativeStats.nativeUnsupportedRows++;return;}
        const current=getCurrentChannel();
        if(!current)return;
        if(channel!==current||(lastArgs&&lastArgs[0]!==args[0]))reset(current);
        lastArgs=[...args];
        const consider=new Map<string,MessageRef>();
        const admitted=new Set<any>();
        const shift=(at:number,delta:1|-1)=>{
          const entries=Array.from(originals.entries());
          const revisions=new Map(sourceRevisions);
          originals.clear();sourceRevisions.clear();
          for(const [index,row]of entries){const next=index>=at?index+delta:index;originals.set(next,next===index?row:{...row,index:next});sourceRevisions.set(next,revisions.get(index)!);}
        };
        const remember=(row:any)=>{
          const message=storedForRow(row);if(!message)return;
          if(!originals.has(row.index)&&originals.size>=1000){nativeStats.nativeOriginalsLimitReached=true;return;}
          originals.set(row.index,row);sourceRevisions.set(row.index,message.content);admitted.add(row);
        };
        // Native inserts run forwards, then updates/deletes backwards. Tracked positions
        // follow that protocol; row.index is bridge position, never message identity.
        for(const row of rows)if(row?.changeType===1&&Number.isSafeInteger(row.index)&&row.index>=0){shift(row.index,1);remember(row);}
        for(const row of [...rows].reverse())if((row?.changeType===2||row?.changeType===3)&&Number.isSafeInteger(row.index)&&row.index>=0){
          originals.delete(row.index);sourceRevisions.delete(row.index);
          if(row.changeType===3)shift(row.index+1,-1);else remember(row);
        }
        for(const row of rows)if(row?.changeType===undefined)remember(row);
        let changed=false;
        const replacement=rows.map(row=>{
          const message=storedForRow(row);
          if(!message||!admitted.has(row)){
            nativeStats.nativeUnsupportedRows++;
            return row;
          }
          nativeStats.nativeRowsObserved++;
          if(Array.isArray(row.message.content))nativeStats.nativeContentNodeRows++;
          consider.set(message.channelId+':'+message.id,message);
          const result=decorate(row,message);if(result!==row)changed=true;
          return result;
        });
        if(consider.size)Promise.resolve().then(()=>{if(active&&getCurrentChannel()===current)for(const message of consider.values())source.consider(message);}).catch(e=>log.warn('Classic native queue consideration failed',e));
        // Returning a fresh array is spitroast's before-patch argument replacement contract.
        if(changed){const replacementArgs=[...args];replacementArgs[1]=JSON.stringify(replacement);return replacementArgs;}
      });
      if(typeof bridge.clearRows==='function')unpatchClear=before('clearRows',bridge,(args:any[])=>{if(active&&!replaying&&(!lastArgs||args?.[0]===lastArgs[0]))reset(getCurrentChannel());});
    }catch(e){try{unpatchClear();unpatch!?.();}catch{}log.warn('Classic native hook unavailable',e);restoreNative=undefined;return ()=>{};}
    let unsubscribe:()=>void;
    try{unsubscribe=source.subscribe(scheduleReplay);}
    catch(e){unpatchClear();unpatch();restoreNative=undefined;log.warn('Classic native source subscription unavailable',e);return ()=>{};}
    nativeStats.nativeActive=true;
    return ()=>{
      if(!active)return;
      if(timer!==undefined){clearTimeout(timer);timer=undefined;}
      // Restore accumulated originals only in the channel that produced them.
      replay(true);active=false;nativeStats.nativeActive=false;restoreNative=undefined;
      try{unsubscribe();}catch(e){log.warn('Classic native service cleanup failed',e);}
      try{unpatch();}catch(e){log.warn('Classic native hook cleanup failed',e);}
      try{unpatchClear();}catch(e){log.warn('Classic native clear-hook cleanup failed',e);}
      originals.clear();sourceRevisions.clear();repaintKeys.clear();lastArgs=undefined;
    };
  };
  const installNativeTranslations:NonNullable<ClassicHost['installNativeTranslations']>=(source)=>{
    let active=true,installed=false,refreshPending=false,attempts=0;
    let stopBridge:(()=>void)|undefined;
    const patches:Array<()=>void>=[],seen=new Set<any>();
    const tracked=new Map<string,MessageRef>(),painted=new Map<string,string>();
    const generatedContent=new Map<any,{message:MessageRef;original:any;replacement:any;signature:string}>();
    const after=api?.patcher?.after??globals.bunny?.api?.patcher?.after;
    const before=api?.patcher?.before??globals.bunny?.api?.patcher?.before;
    const stored=(message:MessageRef)=>ref(safely(()=>messageStore?.getMessage?.(message.channelId,message.id)));
    const restoreGenerated=(all=false)=>{
      for(const [nativeMessage,entry]of generatedContent){
        const current=stored(entry.message);
        const translation=!all&&current&&current.content===entry.message.content&&current.channelId===getCurrentChannel()&&stats.observedMessageRenders===0?safely(()=>source.getTranslation(current)):undefined;
        const signature=translation?.text?JSON.stringify([current!.content,source.getSettings().targetLanguage,translation.text]):'';
        if(!all&&signature===entry.signature&&nativeMessage.content===entry.replacement)continue;
        // Restore only the property we wrote, and leave subsequent plugin edits alone.
        if(nativeMessage.content===entry.replacement)nativeMessage.content=entry.original;
        generatedContent.delete(nativeMessage);
      }
    };
    const refreshRows=(restoreOnly=false)=>{
      if(!active||!nativeStats.nativeRowManagerActive)return;
      restoreGenerated(restoreOnly);
      const channel=getCurrentChannel();if(!channel)return;
      const messages=new Map<string,MessageRef>();
      for(const message of [...tracked.values(),...getLoadedMessages(channel)])if(message.channelId===channel)messages.set(message.id,message);
      for(const message of messages.values()){
        const current=stored(message);if(!current||current.channelId!==channel)continue;
        const translation=restoreOnly||stats.observedMessageRenders>0?undefined:safely(()=>source.getTranslation(current));
        const signature=translation?.text?JSON.stringify([current.content,source.getSettings().targetLanguage,translation.text]):'';
        if(!painted.has(current.id)&&!signature)continue;
        if(!restoreOnly&&painted.get(current.id)===signature)continue;
        if(typeof dispatcher?.dispatch!=='function'){nativeStats.nativeRepaintUnavailable=true;continue;}
        painted.set(current.id,signature);nativeStats.nativeLocalRepaints++;
        try{Promise.resolve(dispatcher.dispatch({type:'MESSAGE_UPDATE',message:safely(()=>messageStore.getMessage(channel,current.id))})).catch(()=>log.warn('Classic RowManager repaint failed'));}
        catch{log.warn('Classic RowManager repaint failed');}
      }
      while(painted.size>500)painted.delete(painted.keys().next().value!);
    };
    const scheduleRefresh=()=>{
      if(!active||refreshPending)return;refreshPending=true;
      Promise.resolve().then(()=>{refreshPending=false;if(active)refreshRows();}).catch(()=>log.warn('Classic RowManager refresh failed'));
    };
    const patchRowManager=(manager:any)=>{
      const parent=manager?.prototype;
      if(typeof parent?.generate!=='function'||typeof after!=='function'||seen.has(parent)||seen.size>=10)return;
      try{
        const unpatch=after('generate',parent,(args:any[],row:any)=>{
          if(!active||args?.[0]?.rowType!==1||!row?.message)return row;
          const message=ref(args[0].message),current=message&&stored(message);
          if(!message||!current||message.channelId!==getCurrentChannel()||current.content!==message.content||row.message.id!==current.id)return row;
          const rowChannel=row.message.channelId??row.message.channel_id;
          if(rowChannel!==undefined&&rowChannel!==current.channelId)return row;
          const nativeMessage=row.message;
          // Native list consumers can retain the row/message before generate returns.
          // Preserve those identities, but never modify a MessageStore record or its AST.
          if(nativeMessage===args[0].message||nativeMessage===safely(()=>messageStore.getMessage(current.channelId,current.id))){nativeStats.nativeUnsupportedRows++;return row;}
          const previous=generatedContent.get(nativeMessage);
          const content=previous&&nativeMessage.content===previous.replacement?previous.original:nativeMessage.content;
          if(!(typeof content==='string'&&content===current.content)&&!(Array.isArray(content)&&content.every(node=>typeof node==='string'||(node&&typeof node==='object'&&!Array.isArray(node)&&typeof node.type==='string')))){
            nativeStats.nativeUnsupportedRows++;return row;
          }
          nativeStats.nativeRowsObserved++;if(Array.isArray(content))nativeStats.nativeContentNodeRows++;
          tracked.set(current.id,current);while(tracked.size>500)tracked.delete(tracked.keys().next().value!);
          Promise.resolve().then(()=>{if(active&&getCurrentChannel()===current.channelId)source.consider(current);}).catch(()=>log.warn('Classic RowManager translation consideration failed'));
          if(stats.observedMessageRenders>0){restoreGenerated(true);return row;}
          const translation=safely(()=>source.getTranslation(current)),target=safely(()=>source.getSettings().targetLanguage);
          if(typeof translation?.text!=='string'||!translation.text.trim()||typeof target!=='string'||target.length>40||/[\r\n]/.test(target)){
            if(previous&&nativeMessage.content===previous.replacement)nativeMessage.content=previous.original;
            generatedContent.delete(nativeMessage);return row;
          }
          if(!generatedContent.has(nativeMessage)&&generatedContent.size>=500){nativeStats.nativeOriginalsLimitReached=true;return row;}
          const signature=JSON.stringify([current.content,target,translation.text]);
          const next=Array.isArray(content)?[...content,'\n',{type:'subtext',content:['译文 · '+target]},'\n',translation.text]:content+'\n\n[译文 · '+target+']\n'+translation.text;
          try{nativeMessage.content=next;}catch{nativeStats.nativeUnsupportedRows++;return row;}
          if(nativeMessage.content!==next){nativeStats.nativeUnsupportedRows++;return row;}
          generatedContent.set(nativeMessage,{message:current,original:content,replacement:next,signature});
          nativeStats.nativeRowsTranslated++;painted.set(current.id,signature);
          return row;
        });
        seen.add(parent);patches.push(unpatch);nativeStats.nativeRowManagerHooks=seen.size;
        nativeStats.nativeRowManagerActive=true;nativeStats.nativeActive=true;nativeStats.nativeDiscoveryStatus='row-manager';installed=true;
        restoreNative=()=>refreshRows(true);scheduleRefresh();
      }catch{log.warn('Classic RowManager hook unavailable');}
    };
    const discover=()=>{
      if(!active||stopBridge)return;
      nativeStats.nativeDiscoveryAttempts++;
      const initializedManagers:any[]=[],initializedBridges:any[]=[];
      const modules=metro.modules??globals.modules;
      // Classic caches NOT_FOUND results. Only inspect already initialized
      // exports here; never force-load arbitrary factories or invalidate caches.
      if(modules&&typeof modules==='object')for(const key of Object.keys(modules)){
        const entry=safely(()=>modules[key]);if(!entry?.isInitialized||entry.hasError)continue;
        const exports=safely(()=>entry.publicModule?.exports);
        for(const value of [exports,safely(()=>exports?.default),safely(()=>exports?.RowManager)])
          if(typeof value==='function'&&value.name==='RowManager'&&typeof value.prototype?.generate==='function')initializedManagers.push(value);
        const bridge=safely(()=>exports?.DCDChatManager);if(typeof bridge?.updateRows==='function')initializedBridges.push(bridge);
      }
      // Android need not expose the iOS-style DCDChatManager bridge. RowManager
      // is upstream of native serialization and uses the Classic after contract.
      const found=safely(()=>metro.findByNameAll?.('RowManager'));
      const managers=[...initializedManagers,...(Array.isArray(found)?found:[]),safely(()=>metro.findByName?.('RowManager')),findProps('RowManager')?.RowManager];
      for(const manager of managers)patchRowManager(manager?.default??manager);
      if(nativeStats.nativeRowManagerActive)return;
      const candidates=[...initializedBridges,safely(()=>RN?.NativeModules?.DCDChatManager),safely(()=>findProps('DCDChatManager')?.DCDChatManager),safely(()=>globals.nativeModuleProxy?.DCDChatManager),safely(()=>globals.__turboModuleProxy?.('DCDChatManager'))];
      const bridge=candidates.find(manager=>typeof manager?.updateRows==='function');
      if(!bridge||typeof before!=='function')return;
      const stop=installBridgeTranslations(source,bridge);
      if(nativeStats.nativeActive){stopBridge=stop;installed=true;nativeStats.nativeDiscoveryStatus='native-bridge';}
      else stop();
    };
    discover();
    const retry=()=>{discover();scheduleRefresh();};
    const stopObserve=observe(event=>{if(!installed||event.type==='channel')retry();});
    const stopSource=source.subscribe(()=>{if(!installed)discover();scheduleRefresh();});
    // Retry briefly across lazy startup; future channel/message events keep
    // discovery possible without continuously scanning Metro after startup.
    let retryTimer:ReturnType<typeof setTimeout>|undefined;
    const waitForChat=()=>{retryTimer=setTimeout(()=>{retryTimer=undefined;if(!active||installed||++attempts>=15)return;retry();if(!installed)waitForChat();},1000);};
    if(!installed)waitForChat();
    return ()=>{
      if(!active)return;
      restoreGenerated(true);refreshRows(true);active=false;
      if(retryTimer!==undefined)clearTimeout(retryTimer);
      stopObserve();stopSource();stopBridge?.();
      for(const stop of patches.reverse())try{stop();}catch{log.warn('Classic RowManager cleanup failed');}
      tracked.clear();painted.clear();generatedContent.clear();nativeStats.nativeRowManagerActive=false;nativeStats.nativeRowManagerHooks=0;nativeStats.nativeActive=false;nativeStats.nativeDiscoveryStatus='stopped';restoreNative=undefined;
    };
  };
  return {React,RN,storage:storage??{},logger:log,getCurrentChannel,getLoadedMessages,observe,installMessageRenderer,installNativeTranslations,
    diagnostics:()=>({
      pluginVersion:'0.1.2',classicApi:'vendetta + bunny.api.react.jsx',
      currentChannelAvailable:!!getCurrentChannel(),loadedMessageCount:getCurrentChannel()?getLoadedMessages(getCurrentChannel()!).length:0,
      messageStore:typeof messageStore?.getMessages==='function'&&typeof messageStore?.getMessage==='function',
      selectedChannelStore:typeof channelStore?.getChannelId==='function',
      fluxDispatcher:typeof dispatcher?.subscribe==='function'&&typeof dispatcher?.unsubscribe==='function',
      jsxHookApi:typeof jsx?.onJsxCreate==='function'&&typeof jsx?.deleteJsxCreate==='function',
      rendererStatus:stats.observedMessageRenders>0?'observed':nativeStats.nativeRowsObserved>0?'native-observed':stats.activeRenderer?'unobserved':'unsupported',
      rendererExplanation:stats.observedMessageRenders>0?'Validated message JSX observed; phone display still requires verification.':nativeStats.nativeRowsObserved>0?'Native message rows observed; generated content was processed, but actual phone display is not verified.':'No validated message rows observed yet. Open a text channel, load messages, then return to diagnostics.',
      nativeContentDelivery:'generated-message-property',nativeDisplayVerified:false,
      ...stats,...nativeStats,registeredNames:[...stats.registeredNames],
      nativeChatBridge:nativeStats.nativeHookAvailable||typeof RN?.NativeModules?.DCDChatManager?.updateRows==='function',
      nativeSchema:'Classic RowManager.generate(data) or DCDChatManager.updateRows(tag, JSON rows, flag); verified record identity and copied native content; phone verification pending.',
    })};
}
