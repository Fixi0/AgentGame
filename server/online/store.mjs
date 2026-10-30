import { PGlite } from '@electric-sql/pglite';
import { readFile, mkdir,open,unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
export const defaultDataDir = path.join(os.homedir(), '.local', 'share', 'agentfc-online');
export async function openStore(directory = defaultDataDir) {
  if(directory!=='memory://'&&process.env.AGENTFC_DATABASE_URL){const {openPostgresStore}=await import('./postgres-store.mjs');return openPostgresStore(process.env.AGENTFC_DATABASE_URL);}
  if (directory !== 'memory://') await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockFile=directory==='memory://'?null:directory+'.lock';let lock;
  if(lockFile){
    try{lock=await open(lockFile,'wx',0o600);}catch(error){
      if(error.code!=='EEXIST')throw error;
      const pid=Number(await readFile(lockFile,'utf8'));let alive=true;try{process.kill(pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}
      if(alive||!Number.isSafeInteger(pid)||pid<=0)throw new Error('DATABASE_IN_USE: stop the Agent FC server before opening its local database.');
      await unlink(lockFile);lock=await open(lockFile,'wx',0o600);
    }await lock.writeFile(String(process.pid));
  }
  const release=async()=>{if(lock){await lock.close();lock=null;await unlink(lockFile);}};
  const db = new PGlite(directory);
  try{await db.waitReady;await db.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));}catch(error){await release();throw error;}
  let tail = Promise.resolve();
  const atomic = work => {
    const result = tail.then(() => db.transaction(work));
    tail = result.catch(() => {}); return result;
  };
  return { kind:'pglite',db, atomic, close: async () => { await tail; await db.close();await release(); } };
}
