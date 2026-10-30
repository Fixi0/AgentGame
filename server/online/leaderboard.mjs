import { DAY, division } from './calendar.mjs';
import {agencyAppearance} from './season-pass.mjs';
const epoch=Date.UTC(2026,9,26,20),period=28*DAY;
export const globalCycle=now=>Math.floor((now-epoch)/period);
async function entries(db,cycle,now){
  const accounts=(await db.query('select id,name,wallet from agentfc_online.accounts')).rows;
  const visible=new Map(accounts.filter(a=>a.wallet.publicRanking===true).map(a=>[a.id,a]));
  const worlds=(await db.query('select state from agentfc_online.leagues')).rows.map(row=>row.state);
  const best=new Map();
  for(const {history} of worlds)for(const season of history??[]){
    if(globalCycle(season.at)!==cycle)continue;
    for(const row of season.ranks.filter(r=>!r.bot&&visible.has(r.id))){
      const account=visible.get(row.id),current=worlds.find(w=>w.members.some(m=>m.id===row.id&&!m.bot));
      const entry={id:row.id,name:account.name,appearance:agencyAppearance(account.wallet,row.id,current,now),score:row.score,commissions:row.commissions,trophies:row.trophies,division:division(row.score)};
      if(!best.has(row.id)||best.get(row.id).score<entry.score)best.set(row.id,entry);
    }
  }
  return [...best.values()].sort((a,b)=>b.score-a.score||b.commissions-a.commissions||a.id.localeCompare(b.id)).map((r,i)=>({...r,rank:i+1}));
}
export async function leaderboard(store,now){
  const cycle=globalCycle(now);return store.atomic(async db=>({cycle,endsAt:epoch+(cycle+1)*period,rows:(await entries(db,cycle,now)).slice(0,100)}));
}
export async function settleGlobalAwards(store,now){
  return store.atomic(async db=>{
    const histories=(await db.query("select state->'history' history from agentfc_online.leagues")).rows;
    const cycles=[...new Set(histories.flatMap(r=>(r.history??[]).map(h=>globalCycle(h.at))).filter(c=>c>=0&&c<globalCycle(now)))].sort((a,b)=>a-b);
    for(const cycle of cycles)for(const row of (await entries(db,cycle,now)).slice(0,3)){
      const inserted=await db.query('insert into agentfc_online.global_awards(cycle,account_id,rank,awarded_at) values($1,$2,$3,$4) on conflict do nothing returning account_id',[cycle,row.id,row.rank,now]);
      if(!inserted.rows.length)continue;
      const account=(await db.query('select wallet from agentfc_online.accounts where id=$1 for update',[row.id])).rows[0];
      const wallet=account.wallet;wallet.cosmetics??=[];if(!wallet.cosmetics.includes('crest_champion'))wallet.cosmetics.push('crest_champion');
      await db.query('update agentfc_online.accounts set wallet=$2 where id=$1',[row.id,JSON.stringify(wallet)]);
    }
  });
}
