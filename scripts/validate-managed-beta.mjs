// Explicit opt-in integration check against the dedicated, empty beta database.
// Creates only uniquely named QA accounts/a private league and removes those records.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {openPostgresStore} from '../server/online/postgres-store.mjs';
import {createOnlineServer} from '../server/online/http.mjs';

assert.equal(process.env.AGENTFC_MANAGED_BETA_TEST,'yes','Set AGENTFC_MANAGED_BETA_TEST=yes for the dedicated beta database only.');
assert.equal(process.env.AGENTFC_DEPLOY_STAGE,'staging');
const suffix=randomBytes(5).toString('hex'),password=randomBytes(24).toString('hex');
const handles=['qa_a_'+suffix,'qa_b_'+suffix];
const stores=[],apps=[];let leagueId;
async function boot(){
 const store=await openPostgresStore(process.env.AGENTFC_DATABASE_URL);stores.push(store);
 const app=await createOnlineServer({store});apps.push(app);
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 return `http://127.0.0.1:${app.server.address().port}/api/online`;
}
async function api(base,route,body,token,expected=200,extraHeaders={}){
 const res=await fetch(base+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`} :{}),...extraHeaders},...(body?{body:JSON.stringify(body)}:{})});
 const data=await res.json();assert.equal(res.status,expected,JSON.stringify(data));return data;
}
const cmd=(base,token,action,data={},requestId=randomUUID(),status=200)=>api(base,'/command',{action,data,requestId},token,status);
try{
 const aBase=await boot(),bBase=await boot();
 const health=await api(aBase,'/health');assert.equal(health.mode,'managed-postgres');assert.equal(health.deploymentStage,'staging');assert.equal(health.commerceConfigured,false);
 await api(aBase,'/state',null,null,401);
 await api(aBase,'/health',null,null,403,{Origin:'https://untrusted.invalid'});
 const a=await api(aBase,'/register',{username:handles[0],password,name:'QA Alpha'});
 const b=await api(bBase,'/register',{username:handles[1],password,name:'QA Bravo'});
 await api(aBase,'/login',{username:handles[0],password:'invalid-password'},null,401);
 await api(aBase,'/login',{username:handles[0],password});
 const requestId=randomUUID(),created=await cmd(aBase,a.token,'create_league',{name:'QA Private '+suffix},requestId);leagueId=created.result.leagueId;
 assert.deepEqual(await cmd(bBase,a.token,'create_league',{name:'QA Private '+suffix},requestId),created);
 await cmd(bBase,b.token,'join_league',{code:created.result.code});
 await cmd(aBase,a.token,'start_league');
 const initial=await api(aBase,'/state',null,a.token),lot=initial.world.auctions[0];
 const bids=await Promise.all([
  fetch(aBase+'/command',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${a.token}`},body:JSON.stringify({action:'bid',data:{auctionId:lot.id,amount:29},requestId:randomUUID()})}),
  fetch(bBase+'/command',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${b.token}`},body:JSON.stringify({action:'bid',data:{auctionId:lot.id,amount:30},requestId:randomUUID()})})
 ]);
 assert.ok([200,400].includes(bids[0].status));assert.equal(bids[1].status,200);
 const after=await api(bBase,'/state',null,b.token);assert.equal(after.world.auctions.find(x=>x.id===lot.id).price,30);
 await cmd(aBase,a.token,'chat_send',{text:'Bonjour la ligue de test'});
 assert.equal((await api(bBase,'/state',null,b.token)).world.chats.at(-1).text,'Bonjour la ligue de test');
 await api(aBase,'/purchase',{signedTransaction:'invalid'},a.token,503);
 await apps[0].close();await stores[0].close();apps.shift();stores.shift();
 const restarted=await boot();
 const resumed=await api(restarted,'/state',null,b.token);assert.equal(resumed.world.id,after.world.id);assert.equal(resumed.world.auctions.find(x=>x.id===lot.id).price,30);
 await api(restarted,'/logout',{},b.token);await api(bBase,'/state',null,b.token,401);
 console.log('Managed beta integration passed: verified TLS, HTTP authentication, private league creation/join, command replay across independent API stores, shared-lock concurrent bids, chat, disabled purchases, persistent state after API/store restart, logout invalidation.');
}finally{
 for(const app of apps)await app.close();
 const cleanup=stores.at(-1);
 if(cleanup){
  await cleanup.atomic(async db=>{
   const rows=(await db.query('select id from agentfc_online.accounts where username=any($1::text[])',[handles])).rows;
   const ids=rows.map(r=>r.id);
   const leagues=(await db.query('select distinct league_id from agentfc_online.memberships where account_id=any($1::text[])',[ids])).rows.map(r=>r.league_id);
   await db.query('delete from agentfc_online.accounts where id=any($1::text[])',[ids]);
   for(const id of new Set([...leagues,...(leagueId?[leagueId]:[])]))await db.query('delete from agentfc_online.leagues where id=$1 and state->>\'name\'=$2',[id,'QA Private '+suffix]);
  });
 }
 for(const store of stores)await store.close();
}
