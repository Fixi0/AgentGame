import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openStore} from '../server/online/store.mjs';
import {credentials} from '../server/online/auth.mjs';
import {command,snapshot} from '../server/online/commands.mjs';
import {recordSeasonPoints,careerStats} from '../server/online/ranking-points.mjs';
import {leaderboard,settleGlobalAwards} from '../server/online/leaderboard.mjs';
import {DAY} from '../server/online/calendar.mjs';
import {validCountry,regionForCountry} from '../src/online/geography.js';
const store=await openStore('memory://'),start=Date.UTC(2026,9,27),end=start+27*DAY,now=end+1;
const cmd=(a,action,data,at=start)=>command(store,a,action,data,randomUUID(),at);
try{
 const accounts=[];for(const [i,country] of ['FR','US','JP','FR'].entries()){
  const {account}=await credentials(store,'register',{username:'ranking_'+i,password:'RankFixture!200',name:'Agency '+i},start);accounts.push(account);
  await cmd(account,'preferences',{publicRanking:i!==3,countryCode:country});
 }
 const [a,b,c,hidden]=accounts;
 assert.equal(regionForCountry('FR'),'EU');assert.equal(regionForCountry('US'),'AM');assert.equal(validCountry('ZZ'),false);
 await assert.rejects(()=>cmd(a,'preferences',{countryCode:'ZZ'}),/INVALID_COUNTRY/);
 await assert.rejects(()=>cmd(a,'preferences',{countryCode:'US'}),/COUNTRY_COOLDOWN/);
 await cmd(a,'preferences',{countryCode:'FR'}); // unchanged choice does not reset the cooldown
 const history={season:1,startedAt:start,at:end,ranks:[{id:a.id,rank:1,score:1000},{id:b.id,rank:2,score:900},{id:c.id,rank:3,score:800},{id:hidden.id,rank:4,score:700},{id:'bot-test',rank:5,score:600,bot:true}]};
 const world={id:randomUUID(),season:1,startsAt:start,history:[history]};
 await store.atomic(db=>recordSeasonPoints(db,world));delete history.pointsSettled;await store.atomic(db=>recordSeasonPoints(db,world));
 assert.equal(Number((await store.db.query('select count(*) n from agentfc_online.season_points')).rows[0].n),4);
 assert.deepEqual(await careerStats(store.db,a.id),{points:100,seasons:1,wins:1,bestRank:1});
 const overlap={...world,id:randomUUID(),history:[{...history,pointsSettled:false}]};await store.atomic(db=>recordSeasonPoints(db,overlap));assert.equal((await careerStats(store.db,a.id)).points,100);
 const short={...world,id:randomUUID(),history:[{...history,pointsSettled:false,at:start+DAY}]};await store.atomic(db=>recordSeasonPoints(db,short));assert.equal((await careerStats(store.db,a.id)).seasons,1);
 let board=await leaderboard(store,now,{accountId:a.id});assert.equal(board.rows.length,3);assert.equal(board.rows[0].points,100);assert.equal(board.me.rank,1);assert.equal(board.history.length,1);assert.ok(!JSON.stringify(board).includes('password_hash'));assert.ok(!JSON.stringify(board).includes('wallet'));
 const france=await leaderboard(store,now,{scope:'country',country:'FR',accountId:a.id});assert.equal(france.rows.length,1);assert.equal(france.rows[0].id,a.id);
 const america=await leaderboard(store,now,{scope:'region',region:'AM'});assert.equal(america.rows.length,1);assert.equal(america.rows[0].id,b.id);
 const asia=await leaderboard(store,now,{scope:'region',region:'AS'});assert.equal(asia.rows[0].id,c.id);
 await assert.rejects(()=>leaderboard(store,now,{scope:'region',region:'XX'}),/INVALID_REGION/);await assert.rejects(()=>leaderboard(store,now,{scope:'country',country:"FR' or true --"}),/INVALID_COUNTRY/);await assert.rejects(()=>leaderboard(store,now,{page:-1}),/INVALID_RANKING_PAGE/);
 const second={id:world.id,season:2,startsAt:end+DAY,history:[{season:2,startedAt:end+DAY,at:end+28*DAY,ranks:[{id:a.id,rank:2,score:10}]}]};await store.atomic(db=>recordSeasonPoints(db,second));assert.equal((await careerStats(store.db,a.id)).points,175);
 await cmd(hidden,'preferences',{publicRanking:true},now);assert.equal((await leaderboard(store,now)).rows.length,4);
 await cmd(hidden,'preferences',{publicRanking:false},now);assert.equal((await leaderboard(store,now)).rows.length,3);assert.equal((await careerStats(store.db,hidden.id)).points,40);
 await cmd(a,'preferences',{countryCode:'CA'},start+28*DAY);assert.equal((await leaderboard(store,now,{scope:'country',country:'FR'})).rows.length,0);assert.equal((await leaderboard(store,now,{scope:'country',country:'CA'})).rows[0].points,175);
 await settleGlobalAwards(store,end+60*DAY);await settleGlobalAwards(store,end+60*DAY);const awards=Number((await store.db.query('select count(*) n from agentfc_online.global_awards')).rows[0].n);assert.equal(awards,4); // three first-cycle agents, one second-cycle agent
 assert.equal((await snapshot(store,a,now)).career.points,175);
 for(let i=0;i<55;i++){const id=randomUUID();await store.db.query('insert into agentfc_online.accounts(id,username,name,password_hash,created_at,wallet) values($1,$2,$3,$4,$5,$6)',[id,'paging_'+i,'Paging '+i,'unusable',start,JSON.stringify({publicRanking:true,countryCode:'FR'})]);await store.db.query('insert into agentfc_online.season_points values($1,1,$2,1,100,500,$3,$4)',[randomUUID(),id,start,end]);}
 const paged=await leaderboard(store,now,{accountId:b.id});assert.equal(paged.total,58);assert.equal(paged.rows.length,50);assert.ok(paged.me.rank>50);assert.equal((await leaderboard(store,now,{page:1})).rows.length,8);assert.equal((await leaderboard(store,now,{page:999})).total,58);
 console.log('Ranking passed: durable cumulative season points, rank scale, exactly-once attribution, bots/short/overlapping seasons excluded, global/country/region filters, private profile, safe query inputs, country cooldown, history, career summary and cycle reward deduplication.');
}finally{await store.close();}
