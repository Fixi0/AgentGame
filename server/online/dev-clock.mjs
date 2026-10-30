import { readFile,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { defaultDataDir } from './store.mjs';
const directory=process.env.AGENTFC_DATA_DIR||defaultDataDir;
const amount=process.argv[2];
if(!amount||(!/^\d+(\.\d+)?$/.test(amount)&&amount!=='reset'))throw new Error('Usage: node server/online/dev-clock.mjs HOURS|reset');
const file=path.join(directory,'clock.json');let previous=0;
try{previous=Number(JSON.parse(await readFile(file,'utf8')).offset)||0;}catch{}
const offset=amount==='reset'?0:previous+Number(amount)*3600000;
await mkdir(directory,{recursive:true,mode:0o700});await writeFile(file,JSON.stringify({offset}),{mode:0o600});
console.log(`Local developer clock ${amount==='reset'?'reset':'advanced by '+amount+' hours'}. No browser can call this operation. Existing results are never undone.`);
