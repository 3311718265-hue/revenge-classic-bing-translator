import {build} from 'esbuild';
import {readdir,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const files=(await readdir('tests')).filter(f=>f.endsWith('.test.ts')&&(!process.env.TEST_FILTER||new RegExp(process.env.TEST_FILTER).test(f))).map(f=>'tests/'+f);
await mkdir('.test-build',{recursive:true});
await build({absWorkingDir:process.cwd(),entryPoints:files.map(f=>resolve(f)),outdir:'.test-build',tsconfigRaw:{compilerOptions:{target:'ES2020'}},bundle:true,platform:'node',target:'node18',format:'esm',packages:'external',logLevel:'warning'});
const result=spawnSync(process.execPath,['--test',...files.map(f=>'.test-build/'+f.split('/').pop().replace(/\.ts$/,'.js'))],{stdio:'inherit'});
process.exitCode=result.status??1;
