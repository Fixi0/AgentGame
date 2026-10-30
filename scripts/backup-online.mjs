// Secrets are read from the environment. Exports must stay outside the source repo.
import fs from 'node:fs/promises';import path from 'node:path';
import {openStore} from '../server/online/store.mjs';
import {exportOnline,restoreOnlineIntoEmpty} from '../server/online/backup.mjs';
const [action,fileArg,directory]=process.argv.slice(2),file=path.resolve(fileArg??'');
if(!fileArg||!path.relative(process.cwd(),file).startsWith('..'+path.sep))throw Error('Use a private backup path outside this repository.');
if(!['export','restore'].includes(action))throw Error('Use export <private-file> or restore <private-file> <new-local-directory>.');
if(action==='restore'){
 if(!directory||process.env.AGENTFC_DATABASE_URL)throw Error('Restore rehearsal supports a new LOCAL directory only; unset AGENTFC_DATABASE_URL.');
 const target=path.resolve(directory);if(!path.basename(target).startsWith('agentfc-restore-'))throw Error('Use a new agentfc-restore-* directory.');
 try{await fs.access(target);throw Error('Restore target already exists.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const backup=JSON.parse(await fs.readFile(file,'utf8')),store=await openStore(target);try{await store.atomic(db=>restoreOnlineIntoEmpty(db,backup));console.log('Local restore rehearsal passed; existing data was not overwritten.');}finally{await store.close();}
}else{
 if(!process.env.AGENTFC_DATABASE_URL&&!process.env.AGENTFC_DATA_DIR)throw Error('Choose AGENTFC_DATABASE_URL or AGENTFC_DATA_DIR explicitly.');
 const store=await openStore(process.env.AGENTFC_DATA_DIR);try{const backup=await store.atomic(db=>exportOnline(db));await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});await fs.writeFile(file,JSON.stringify(backup),{mode:0o600,flag:'wx'});console.log('Private backup saved:',Object.keys(backup.tables).length,'tables. No credentials or records printed.');}finally{await store.close();}
}
