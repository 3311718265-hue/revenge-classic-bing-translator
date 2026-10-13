import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
const root=resolve('dist'),port=Number(process.env.PORT||8080);
createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://local').pathname);let file=resolve(root,'.'+path);if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);return res.end();}if(path.endsWith('/'))file=resolve(file,'index.html');const body=await readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.json')?'application/json':file.endsWith('.js')?'application/javascript':'text/html;charset=utf-8','Cache-Control':'no-cache'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:'+port+'/ ; Android must use a reachable HTTPS host, not phone localhost.'));
