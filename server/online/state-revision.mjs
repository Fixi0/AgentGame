import {createHash} from 'node:crypto';
import {parisDate} from './season-pass.mjs';
export function encodeRevision(accountId,accountVersion,leagueId,worldVersion,now){
 return '"'+createHash('sha256').update(JSON.stringify([accountId,String(accountVersion),leagueId??null,worldVersion??null,parisDate(now),Math.floor(now/3600000)])).digest('hex')+'"';
}
export async function stateRevision(db,accountId,now){
 const row=(await db.query('select a.state_version,m.league_id,l.version,l.next_tick_at from agentfc_online.accounts a left join agentfc_online.memberships m on m.account_id=a.id left join agentfc_online.leagues l on l.id=m.league_id where a.id=$1',[accountId])).rows[0];
 if(row?.next_tick_at!==null&&Number(row?.next_tick_at)<=now)return null;
 return row?encodeRevision(accountId,row.state_version,row.league_id,row.version,now):null;
}
