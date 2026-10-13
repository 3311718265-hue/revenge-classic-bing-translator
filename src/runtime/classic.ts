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
  const nativeStats={nativeHookAvailable:false,nativeRowsObserved:0,nativeRowsTranslated:0,nativeUnsupportedRows:0,nativeReplayCount:0,nativeOriginalsLimitReached:false,nativeActive:false,nativeContentNodeRows:0,nativeLocalRepaints:0,nativeRepaintUnavailable:false,nativeRepaintLimitReached:false};
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
  const installNativeTranslations:NonNullable<ClassicHost['installNativeTranslations']>=(source)=>{
    const candidates=[safely(()=>RN?.NativeModules?.DCDChatManager),safely(()=>findProps('DCDChatManager')?.DCDChatManager),safely(()=>globals.nativeModuleProxy?.DCDChatManager),safely(()=>globals.__turboModuleProxy?.('DCDChatManager'))];
    const bridge=candidates.find(manager=>typeof manager?.updateRows==='function');
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
  return {React,RN,storage:storage??{},logger:log,getCurrentChannel,getLoadedMessages,observe,installMessageRenderer,installNativeTranslations,
    diagnostics:()=>({
      classicApi:'vendetta + bunny.api.react.jsx',
      messageStore:typeof messageStore?.getMessages==='function'&&typeof messageStore?.getMessage==='function',
      selectedChannelStore:typeof channelStore?.getChannelId==='function',
      fluxDispatcher:typeof dispatcher?.subscribe==='function'&&typeof dispatcher?.unsubscribe==='function',
      jsxHookApi:typeof jsx?.onJsxCreate==='function'&&typeof jsx?.deleteJsxCreate==='function',
      rendererStatus:stats.observedMessageRenders>0?'observed':stats.activeRenderer?'unobserved':'unsupported',
      rendererExplanation:stats.observedMessageRenders>0?'Validated message JSX observed; phone layout still requires verification.':'No validated message JSX has been observed. Native chat rows or changed Discord component names may require a different adapter.',
      ...stats,...nativeStats,registeredNames:[...stats.registeredNames],
      nativeChatBridge:nativeStats.nativeHookAvailable||typeof RN?.NativeModules?.DCDChatManager?.updateRows==='function',
      nativeSchema:'DCDChatManager.updateRows(logIndex, JSON rows, flag); verified row identity, native content nodes or exact source plaintext; Discord 348.10 phone verification pending.',
    })};
}
