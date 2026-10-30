// Run only against the dedicated staging API. QA sessions stay in a mode-0600
// temporary file between phases, allowing a real Render redeploy to be tested.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {openPostgresStore} from '../server/online/postgres-store.mjs';

const base=process.env.AGENTFC_BETA_API,sessionFile=process.env.AGENTFC_BETA_QA_FILE;
assert.equal(process.env.AGENTFC_MANAGED_BETA_TEST,'yes');
assert.equal(base,'https://agentfc-online-beta.onrender.com/api/online');
assert.ok(sessionFile?.startsWith('/tmp/agentfc-render-qa-'));
const phase=process.argv[2];
async function api(route,body,token,status=200,headers={}){
 const r=await fetch(base+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`} :{}),...headers},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90_000)});
 const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d;
}
const cmd=(token,action,data={},id=randomUUID(),status=200)=>api('/command',{action,data,requestId:id},token,status);
if(phase==='prepare'){
 const suffix=randomBytes(5).toString('hex'),password=randomBytes(24).toString('hex'),handles=['qa_a_'+suffix,'qa_b_'+suffix];
 const qa={suffix,password,handles};await fs.writeFile(sessionFile,JSON.stringify(qa),{mode:0o600,flag:'wx'});
 const health=await api('/health');assert.equal(health.mode,'managed-postgres');assert.equal(health.deploymentStage,'staging');assert.equal(health.commerceConfigured,false);assert.equal(health.pushConfigured,false);
 await api('/state',null,null,401);await api('/health',null,null,403,{Origin:'https://untrusted.invalid'});
 const native=await api('/health',null,null,200,{Origin:'capacitor://localhost'});assert.equal(native.ok,true);
 qa.a=await api('/register',{username:handles[0],password,name:'QA Alpha'});await fs.writeFile(sessionFile,JSON.stringify(qa),{mode:0o600});
 qa.b=await api('/register',{username:handles[1],password,name:'QA Bravo'});await fs.writeFile(sessionFile,JSON.stringify(qa),{mode:0o600});
 await api('/login',{username:handles[0],password:'invalid-password'},null,401);await api('/login',{username:handles[0],password});
 const id=randomUUID(),created=await cmd(qa.a.token,'create_league',{name:'QA Render '+suffix},id);assert.deepEqual(await cmd(qa.a.token,'create_league',{name:'QA Render '+suffix},id),created);
 await cmd(qa.b.token,'join_league',{code:created.result.code});await cmd(qa.a.token,'start_league');
 const state=await api('/state',null,qa.a.token);qa.leagueId=state.world.id;qa.lotId=state.world.auctions[0].id;await fs.writeFile(sessionFile,JSON.stringify(qa),{mode:0o600});
 const results=await Promise.all([29,30].map((amount,i)=>fetch(base+'/command',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${i?qa.b.token:qa.a.token}`},body:JSON.stringify({action:'bid',data:{auctionId:qa.lotId,amount},requestId:randomUUID()}),signal:AbortSignal.timeout(30_000)})));
 assert.ok([200,400].includes(results[0].status));assert.equal(results[1].status,200);
 assert.equal((await api('/state',null,qa.b.token)).world.auctions.find(x=>x.id===qa.lotId).price,30);
 await cmd(qa.a.token,'chat_send',{text:'Bonjour depuis la beta Render'});assert.equal((await api('/state',null,qa.b.token)).world.chats.at(-1).text,'Bonjour depuis la beta Render');
 await api('/purchase',{signedTransaction:'invalid'},qa.a.token,503);
 console.log('Public Render API passed: health, managed storage, staging isolation, native CORS, forbidden origin, authentication, private league/code, replay, concurrent bids, chat and disabled purchases. QA state retained only for restart verification.');
}else if(phase==='resume'){
 const qa=JSON.parse(await fs.readFile(sessionFile,'utf8')),state=await api('/state',null,qa.b.token);assert.equal(state.world.id,qa.leagueId);assert.equal(state.world.auctions.find(x=>x.id===qa.lotId).price,30);
 await api('/logout',{},qa.b.token);await api('/state',null,qa.b.token,401);
 console.log('Public Render restart passed: league, highest bid and session persisted; logout invalidates the session.');
}else if(phase==='cleanup'){
 const qa=JSON.parse(await fs.readFile(sessionFile,'utf8')),store=await openPostgresStore(process.env.AGENTFC_DATABASE_URL);
 try{await store.atomic(async db=>{
  const rows=(await db.query('select id from agentfc_online.accounts where username=any($1::text[])',[qa.handles])).rows,ids=rows.map(r=>r.id);
  const leagues=(await db.query('select league_id from agentfc_online.memberships where account_id=any($1::text[])',[ids])).rows.map(r=>r.league_id);
  await db.query('delete from agentfc_online.accounts where id=any($1::text[])',[ids]);
  for(const id of new Set([...leagues,...(qa.leagueId?[qa.leagueId]:[])]))await db.query("delete from agentfc_online.leagues where id=$1 and state->>'name'=$2",[id,'QA Render '+qa.suffix]);
 });await fs.unlink(sessionFile);console.log('Temporary Render QA accounts, private league and local session file removed.');}finally{await store.close();}
}else throw Error('Use prepare, resume or cleanup');
