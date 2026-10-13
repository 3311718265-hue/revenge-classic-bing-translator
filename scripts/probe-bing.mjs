import {transform} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const source=await readFile('src/core/providers.ts','utf8');
const compiled=await transform(source,{loader:'ts',target:'es2020',format:'esm'});
await mkdir('.probe-build',{recursive:true});await writeFile('.probe-build/providers.mjs',compiled.code);
const {createTranslator}=await import(pathToFileURL(resolve('.probe-build/providers.mjs')).href);
const translator=createTranslator({provider:'bing',targetLanguage:'zh-CN',officialFallback:false,microsoftKey:'',microsoftRegion:'',microsoftEndpoint:'https://api.cognitive.microsofttranslator.com',minIntervalMs:1200,requestTimeoutMs:10000});
const samples=[
 ['zh-Hans','en','你好，欢迎来到社区。'],['en','zh-CN','Hello, welcome to the community.'],
 ['ja','zh-CN','こんにちは。コミュニティへようこそ。'],['ko','zh-CN','안녕하세요. 커뮤니티에 오신 것을 환영합니다.'],
 ['de','zh-CN','Hallo, willkommen in der Gemeinschaft.'],['fr','zh-CN','Bonjour, bienvenue dans la communauté.'],
 ['ru','zh-CN','Здравствуйте, добро пожаловать в сообщество.'],['es','zh-CN','Hola, bienvenido a la comunidad.']
];
const results=[];
for(const [expectedSource,target,text]of samples){
 const controller=new AbortController(),start=Date.now();const deadline=setTimeout(()=>controller.abort(),35000);
 try{const result=await translator.translate(text,target,controller.signal);const pass=!!result.text&&result.text!==text&&result.detectedLanguage===expectedSource;
  results.push({expectedSource,target,pass,detectedLanguage:result.detectedLanguage,translation:result.text,milliseconds:Date.now()-start});console.log((pass?'PASS':'FAIL')+' '+expectedSource+' → '+target+' '+JSON.stringify(result.text));
 }catch(error){results.push({expectedSource,target,pass:false,code:error?.code||error?.name||'error',milliseconds:Date.now()-start});console.log('FAIL '+expectedSource+' → '+target+' '+(error?.code||error?.name||'error'));}
 finally{clearTimeout(deadline);}
}
const report={checkedAt:new Date().toISOString(),transport:'Windows Node fetch with consistent Android browser User-Agent; not an Android device',provider:'undocumented Bing webpage, no API key',results};
await writeFile('docs/live-bing-results.json',JSON.stringify(report,null,2)+'\n');
console.log('Live samples '+results.filter(result=>result.pass).length+'/'+results.length+' passed; this is not a stability guarantee.');
process.exitCode=results.every(result=>result.pass)?0:1;
