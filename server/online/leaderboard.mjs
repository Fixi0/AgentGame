import {DAY,division} from './calendar.mjs';
import {agencyAppearance} from './season-pass.mjs';
import {requireGame} from './errors.mjs';
import {COUNTRY_REGIONS,REGION_CODES,validCountry,regionForCountry} from '../../src/online/geography.js';
import {SEASON_POINTS} from './ranking-points.mjs';
const epoch=Date.UTC(2026,9,26,20),period=28*DAY;
export const globalCycle=now=>Math.floor((now-epoch)/period);
function queryFor({scope='world',country,region,cycle}={}){
 const values=[],conditions=["a.wallet->>'publicRanking'='true'"];
 const bind=v=>{values.push(v);return '$'+values.length;};
 if(scope==='country')conditions.push(`a.wallet->>'countryCode'=${bind(country)}`);
 if(scope==='region')conditions.push(`a.wallet->>'countryCode'=any(${bind(Object.keys(COUNTRY_REGIONS).filter(c=>COUNTRY_REGIONS[c]===region))}::text[])`);
 if(cycle!==undefined){conditions.push(`s.ended_at>=${bind(epoch+cycle*period)}`,`s.ended_at<${bind(epoch+(cycle+1)*period)}`);}
 const sql=`with totals as (select a.id,a.name,a.wallet,sum(s.points)::bigint as points,count(*)::integer as seasons,count(*) filter(where s.rank=1)::integer as wins,min(s.rank)::integer as best_rank from agentfc_online.season_points s join agentfc_online.accounts a on a.id=s.account_id where ${conditions.join(' and ')} group by a.id,a.name,a.wallet), ranked as (select *,row_number() over(order by points desc,wins desc,best_rank asc,id asc) as rank,count(*) over() as total from totals)`;
 return {sql,values};
}
const publicEntry=(r,now)=>({id:r.id,name:r.name,appearance:agencyAppearance(r.wallet,r.id,null,now),countryCode:r.wallet.countryCode??null,region:regionForCountry(r.wallet.countryCode),score:Number(r.points),points:Number(r.points),seasons:Number(r.seasons),wins:Number(r.wins),bestRank:Number(r.best_rank),rank:Number(r.rank),division:division(Number(r.points))});
export async function leaderboard(store,now,{accountId,scope='world',country,region,page=0}={}){
 requireGame(['world','country','region'].includes(scope),'INVALID_RANKING_SCOPE');
 requireGame(scope!=='country'||validCountry(country),'INVALID_COUNTRY');
 requireGame(scope!=='region'||REGION_CODES.includes(region),'INVALID_REGION');
 const index=Number(page);requireGame(Number.isInteger(index)&&index>=0&&index<=999,'INVALID_RANKING_PAGE');
 return store.atomic(async db=>{
  const {sql,values}=queryFor({scope,country,region});
  const raw=(await db.query(sql+' select * from ranked order by rank limit 50 offset $'+(values.length+1),[...values,index*50])).rows;
  const own=accountId?(await db.query(sql+' select * from ranked where id=$'+(values.length+1),[...values,accountId])).rows[0]:null;
  const total=raw[0]?.total??own?.total??(await db.query(sql+' select count(*) n from totals',values)).rows[0].n;
  const history=accountId?(await db.query('select league_id,season,rank,points,ended_at from agentfc_online.season_points where account_id=$1 order by ended_at desc,league_id limit 10',[accountId])).rows.map(r=>({leagueId:r.league_id,season:r.season,rank:r.rank,points:r.points,endedAt:Number(r.ended_at)})):[];
  return {scope,country:scope==='country'?country:null,region:scope==='region'?region:null,page:index,pageSize:50,total:Number(total),rows:raw.map(r=>publicEntry(r,now)),me:own?publicEntry(own,now):null,history,pointScale:SEASON_POINTS,cycle:globalCycle(now),endsAt:epoch+(globalCycle(now)+1)*period,permanent:true};
 });
}
export async function settleGlobalAwards(store,now){
 return store.atomic(async db=>{
  const cycles=(await db.query('select distinct floor((ended_at-$1)/$2)::integer as cycle from agentfc_online.season_points where ended_at<$3 order by cycle',[epoch,period,epoch+globalCycle(now)*period])).rows;
  for(const {cycle} of cycles){
   if(cycle<0||(await db.query('select 1 from agentfc_online.global_awards where cycle=$1 limit 1',[cycle])).rows.length)continue;
   const {sql,values}=queryFor({cycle}),rows=(await db.query(sql+' select * from ranked order by rank limit 3',values)).rows;
   for(const row of rows){
    const inserted=await db.query('insert into agentfc_online.global_awards(cycle,account_id,rank,awarded_at) values($1,$2,$3,$4) on conflict do nothing returning account_id',[cycle,row.id,Number(row.rank),now]);if(!inserted.rows.length)continue;
    const wallet=(await db.query('select wallet from agentfc_online.accounts where id=$1 for update',[row.id])).rows[0]?.wallet;if(!wallet)continue;
    wallet.cosmetics??=[];if(!wallet.cosmetics.includes('crest_champion'))wallet.cosmetics.push('crest_champion');
    await db.query('update agentfc_online.accounts set wallet=$2 where id=$1',[row.id,JSON.stringify(wallet)]);
   }
  }
 });
}
