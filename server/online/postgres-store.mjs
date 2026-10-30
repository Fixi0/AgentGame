import pg from 'pg';
import {readFileSync} from 'node:fs';
// The same transaction contract as the local PGlite store. All game mutations
// share a database-level advisory lock across processes, not just a JS queue.
// This conservative first-release lock favors correctness for the pilot.
export function postgresStore(pool){
 const db={query:(text,values=[])=>pool.query(text,values)};
 return {kind:'postgres',db,atomic:async work=>{
  const client=await pool.connect();
  try{
   await client.query('begin');await client.query("set local statement_timeout='20s'");await client.query("set local lock_timeout='10s'");
   await client.query('select pg_advisory_xact_lock(174923,26030)');
   const result=await work({query:(text,values=[])=>client.query(text,values)});await client.query('commit');return result;
  }catch(error){try{await client.query('rollback');}catch{}throw error;}finally{client.release();}
 },close:()=>pool.end()};
}
export async function openPostgresStore(connectionString){
 if(typeof connectionString!=='string'||!/^postgres(?:ql)?:\/\//.test(connectionString))throw new Error('AGENTFC_DATABASE_URL must be a private PostgreSQL connection string.');
 const parsed=new URL(connectionString);
 if(!parsed.hostname.endsWith('.supabase.co')&&!parsed.hostname.endsWith('.supabase.com')&&!['localhost','127.0.0.1','::1'].includes(parsed.hostname))throw new Error('Unexpected managed database host.');
 const ssl=!['localhost','127.0.0.1','::1'].includes(parsed.hostname);
 // Do not let a URL override certificate verification with sslmode=no-verify.
 for(const key of ['ssl','sslmode','sslcert','sslkey','sslrootcert'])parsed.searchParams.delete(key);
 // Supabase signs its database/pooler certificates with its published CA.
 // Keep hostname and chain verification enabled instead of accepting any certificate.
 const ca=ssl?readFileSync(new URL('./certs/SupabaseRootCA-2021.crt',import.meta.url),'utf8'):undefined;
 const pool=new pg.Pool({connectionString:parsed.toString(),ssl:ssl?{rejectUnauthorized:true,ca}:false,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,application_name:'agentfc-online'});
 pool.on('error',()=>console.error('[AgentFC database] Connection interrupted.'));
 try{const found=await pool.query("select to_regclass('agentfc_online.apple_identities') as ready");if(!found.rows[0]?.ready)throw new Error('Apply the Agent FC schema migration before starting the server.');await pool.query('select state_version from agentfc_online.accounts limit 0');await pool.query('select next_tick_at from agentfc_online.leagues limit 0');}
 catch(error){await pool.end();throw error;}
 return postgresStore(pool);
}
