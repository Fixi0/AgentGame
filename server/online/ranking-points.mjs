import {DAY} from './calendar.mjs';
export const SEASON_POINTS = Object.freeze([100,75,55,40,30,22,16,12,8,5]);
export async function recordSeasonPoints(db,world){
 for(const season of world.history??[]){
  if(season.pointsSettled)continue;
  const startedAt=season.startedAt??(season.season===world.season?world.startsAt:null);
  if(!Number.isFinite(startedAt)||!Number.isFinite(season.at)||season.at-startedAt<26*DAY)continue;
  for(const row of season.ranks??[]){
   if(row.bot||!Number.isInteger(row.rank)||row.rank<1||row.rank>10)continue;
   const account=(await db.query('select id from agentfc_online.accounts where id=$1',[row.id])).rows[0];if(!account)continue;
   const overlap=await db.query('select 1 from agentfc_online.season_points where account_id=$1 and started_at<$2 and ended_at>$3 and not(league_id=$4 and season=$5) limit 1',[row.id,season.at,startedAt,world.id,season.season]);
   if(overlap.rows.length)continue;
   await db.query('insert into agentfc_online.season_points(league_id,season,account_id,rank,points,league_score,started_at,ended_at) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing',[world.id,season.season,row.id,row.rank,SEASON_POINTS[row.rank-1],Math.max(0,Math.floor(Number(row.score)||0)),startedAt,season.at]);
  }
  season.pointsSettled=true;
 }
}
export async function careerStats(db,accountId){
 const r=(await db.query('select coalesce(sum(points),0) points,count(*) seasons,count(*) filter(where rank=1) wins,min(rank) best_rank from agentfc_online.season_points where account_id=$1',[accountId])).rows[0];
 return {points:Number(r.points),seasons:Number(r.seasons),wins:Number(r.wins),bestRank:r.best_rank==null?null:Number(r.best_rank)};
}
