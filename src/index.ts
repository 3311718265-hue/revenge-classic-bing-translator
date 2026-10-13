import {createClassicHost} from './runtime/classic';
import {TranslationService} from './core/service';
import {createComponents} from './ui/components';
declare const vendetta:any;
let runtime:{host:ReturnType<typeof createClassicHost>;service:TranslationService;components:ReturnType<typeof createComponents>;cleanup:Array<()=>void>}|undefined;
function unload():void{
 if(!runtime)return;
 const active=runtime;runtime=undefined;
 // Unsubscribe adapter events first; abort state before restoring native originals.
 active.service.dispose();
 for(const dispose of active.cleanup.reverse()){try{dispose();}catch{active.host.logger.warn('[Bing Translator] Cleanup failed');}}
}
export default {
 onLoad(){
  unload();
  if(typeof vendetta==='undefined'||!vendetta.plugin?.storage)throw new Error('This plugin requires Revenge Classic with the Vendetta compatibility API.');
  const logger=vendetta.plugin.logger??console;
  const host=createClassicHost(vendetta,vendetta.plugin.storage,logger);
  const settings=vendetta.plugin.storage.settings??(vendetta.plugin.storage.settings={});
  const service=new TranslationService({persistedSettings:settings,getCurrentChannel:()=>host.getCurrentChannel(),getLoadedMessages:id=>host.getLoadedMessages(id),diagnostics:()=>host.diagnostics()});
  const components=createComponents(host,service);
  const cleanup:Array<()=>void>=[];runtime={host,service,components,cleanup};
  try{
   cleanup.push(host.installMessageRenderer(components.wrapMessage));
   if(host.installNativeTranslations)cleanup.push(host.installNativeTranslations(service));
   cleanup.push(host.observe(event=>{if(event.type==='delete'&&event.messageId)service.deleted(event.channelId??host.getCurrentChannel()??'',event.messageId);service.scan();}));
   service.scan();
   logger.log('[Bing Translator] Classic adapter loaded; see settings for observed renderer diagnostics.');
  }catch(error){unload();throw error;}
 },
 onUnload:unload,
 settings(){return runtime?runtime.host.React.createElement(runtime.components.Settings):null;}
};
