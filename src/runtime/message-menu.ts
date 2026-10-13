import type {MessageRef} from './classic';
export type MenuSource={translateMessage(message:MessageRef):Promise<{text:string}|undefined>;getSettings():{targetLanguage:string};getStatus():{lastError:string|null}};
export function installClassicMessageMenu(api:any,host:{React:any;getCurrentChannel():string|null;getLoadedMessages(channel:string):MessageRef[];observe(cb:()=>void):()=>void},source:MenuSource,stats:Record<string,any>):()=>void{
 let active=true,unpatch:(()=>void)|undefined;const busy=new Set<string>(),React=host.React;
 const safe=(fn:()=>any)=>{try{return fn();}catch{return undefined;}};
 const find=(...keys:string[])=>{
  const modules=api?.metro?.modules;
  if(modules&&typeof modules==='object')for(const entry of Object.values(modules) as any[]){
   if(!entry?.isInitialized||entry.hasError)continue;
   for(const value of [safe(()=>entry.publicModule?.exports),safe(()=>entry.publicModule?.exports?.default)])if(value&&safe(()=>keys.every(key=>value[key]!==undefined)))return value;
  }return safe(()=>api?.metro?.findByProps?.(...keys));
 };
 const current=(message:MessageRef)=>host.getCurrentChannel()===message.channelId?host.getLoadedMessages(message.channelId).find(m=>m.id===message.id&&m.content===message.content):undefined;
 const messageFor=(props:any)=>{
  const record=props?.message,channel=record?.channel_id??record?.channelId??props?.channel?.id;
  return typeof channel==='string'?host.getLoadedMessages(channel).find(m=>m.id===record?.id&&m.channelId===channel&&m.content===record?.content):undefined;
 };
 const notify=(text:string)=>safe(()=>api.ui?.toasts?.showToast?.(text));
 const addRow=(tree:any,message:MessageRef)=>{
  const components=find('ActionSheetRow'),Row=components?.ActionSheetRow,Sheet=components?.ActionSheet??find('ActionSheet')?.ActionSheet,Group=Row?.Group;
  if(!Row||!Sheet||!Group){stats.messageMenuMissingComponents++;return tree;}
  const target=source.getSettings().targetLanguage;
  const onPress=async()=>{
   if(!active||!current(message)||busy.has(message.id))return;
   if(source.getSettings().targetLanguage!==target){notify('目标语言已改变，请重新打开消息菜单。');return;}
   busy.add(message.id);safe(()=>find('openLazy','hideActionSheet')?.hideActionSheet());
   try{
    const result=await source.translateMessage(message);
    if(!active||!current(message)||source.getSettings().targetLanguage!==target)return;
    if(!result?.text){notify(source.getStatus().lastError??'没有取得译文，请在插件设置查看状态。');return;}
    // Only an explicit menu press opens this preview; automatic translation never does.
    const show=api.ui?.alerts?.showConfirmationAlert;
    if(typeof show==='function')show({title:'译文 · '+target,content:result.text===message.content?'服务返回内容与原文相同。\n\n'+result.text:result.text,confirmText:'关闭',onConfirm:()=>{}});
    else notify('已取得译文；此客户端缺少译文查看窗口，请检查插件诊断。');
   }catch{if(active)notify('翻译请求失败，请在插件设置查看状态。');}finally{busy.delete(message.id);}
  };
  const Boundary=api.ui?.components?.ErrorBoundary;
  const group=React.createElement(Group,{key:'classic-bing-translate'},React.createElement(Row,{label:'翻译这条消息',subLabel:'目标语言：'+target,onPress}));
  const entry=Boundary?React.createElement(Boundary,{key:'classic-bing-translate'},group):group;
  let inserted=false,visited=0;
  const walk=(node:any,inside=false,depth=0):any=>{
   if(++visited>400||depth>40||!node)return node;
   if(Array.isArray(node)){let changed=false;const next=node.map(child=>{const value=walk(child,inside,depth+1);changed ||=value!==child;return value;});return changed?next:node;}
   if(!React.isValidElement(node))return node;
   const within=inside||node.type===Sheet,children=node.props.children,list=Array.isArray(children)?children:[children];
   if(!inserted&&within&&list.some(child=>child?.type===Group)){inserted=true;return React.cloneElement(node,{},[entry,...list]);}
   const next=walk(children,within,depth+1);return next===children?node:React.cloneElement(node,{},next);
  };
  const result=walk(tree);if(inserted)stats.messageMenuInjections++;else stats.messageMenuNoContainer++;return result;
 };
 const discover=()=>{
  if(!active||unpatch||typeof React?.cloneElement!=='function')return;
  const sheets=find('openLazy','hideActionSheet'),before=api?.patcher?.before;
  if(typeof sheets?.openLazy!=='function'||typeof before!=='function')return;
  try{
   unpatch=before('openLazy',sheets,(args:any[])=>{
    if(!active)return;stats.messageMenuCalls++;const [lazy,key,props]=args;
    if(typeof key!=='string'||!/message/i.test(key)||/channel|forum|guild|thread/i.test(key))return;
    stats.messageMenuObserved++;const message=messageFor(props);
    if(!message||!current(message)||!lazy||typeof lazy.then!=='function'){stats.messageMenuRejected++;return;}
    const next=[...args];next[0]=lazy.then((mod:any)=>{
     if(!active||typeof mod?.default!=='function')return mod;const Original=mod.default;
     return {...mod,default:function ClassicBingMessageSheet(componentProps:any){
      const tree=Original(componentProps);if(!active)return tree;
      try{const actual=messageFor(componentProps);if(!actual||!current(actual)){stats.messageMenuRejected++;return tree;}return addRow(tree,actual);}
      catch{stats.messageMenuInjectionErrors++;return tree;}
     }};
    });return next;
   });stats.messageMenuHookAvailable=true;
  }catch{stats.messageMenuInjectionErrors++;}
 };
 discover();const stopObserve=host.observe(discover);
 return()=>{if(!active)return;active=false;stopObserve();unpatch?.();busy.clear();stats.messageMenuHookAvailable=false;};
}
