import {randomUUID} from 'node:crypto';
import {random,HOUR} from './calendar.mjs';
import {requireGame} from './errors.mjs';
import {parisDate} from './season-pass.mjs';
import {matchPlayerProfile} from './player-profile.mjs';
import {DUEL_TACTICS,MATCH_FOCUS,MATCH_SPEECH,DUEL_DAILY_SCORED,PREPARATION_LOCK_MINUTES} from '../../src/online/dailyPlayCatalog.js';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const own=(w,id,playerId)=>{const p=w.players.find(p=>p.id===playerId&&p.ownerId===id);requireGame(p,'INVALID_CLIENT');return p;};
export function syncDailyPlay(world,now){
 let changed=false;if(!Array.isArray(world.duels)){world.duels=[];changed=true;}
 for(const d of world.duels.filter(d=>d.status==='pending')){
  if(d.closesAt<=now||world.phase!=='active'){d.status='expired';changed=true;}
  else if(!world.members.some(m=>m.id===d.to)||!world.players.some(p=>p.id===d.playerA&&p.ownerId===d.from)||world.blocks.some(b=>b.by===d.from&&b.target===d.to||b.by===d.to&&b.target===d.from)){d.status='cancelled';changed=true;}
 }
 if(world.duels.length>60){world.duels=world.duels.filter(d=>d.status==='pending').concat(world.duels.filter(d=>d.status!=='pending').slice(-40));changed=true;}
 return changed;
}
export function preparationEffects(player,focus,speech){
 const trust=clamp(player.trust??60,0,100);
 let ratingPercent=focus==='balanced'?2:1.5,form=focus==='balanced'?2:0;
 const profile=matchPlayerProfile(player),shooting=focus==='sharpness'&&player.position!=='GK'?Math.min(1,20-profile.attributes.shooting.current):0,passing=focus==='teamplay'?Math.min(1,20-profile.attributes.passing.current):0;
 if(focus==='sharpness'&&player.position==='GK')ratingPercent=3;
 if(speech==='reassure'){ratingPercent+=trust<60?2:1;form+=trust<60?10:4;}
 if(speech==='motivate'){ratingPercent+=trust>=60?2:1;form+=trust>=60?8:4;}
 if(speech==='challenge'){ratingPercent+=trust>=80?3:trust>=60?1:-1;form+=trust>=80?10:trust>=60?4:-6;}
 // A temporary routine must not cross the engine's permanent superstar tier.
 const base=profile.rating,ceiling=base>=198?198:197.8;
 ratingPercent=Math.floor(Math.max(0,Math.min(ratingPercent,6,(ceiling/base-1)*100))*10)/10;
 return {ratingPercent,form:clamp(trust+form,0,100)-trust,shooting,passing};
}
export function publicPreparation(world,player,now,hasFixture=true){
 const matchAt=world.phase==='active'&&hasFixture?world.nextMatchAt:null,deadline=matchAt?matchAt-PREPARATION_LOCK_MINUTES*60000:null;
 const current=player.preparation?.matchAt===matchAt?player.preparation:null;
 return {matchAt,deadline,editable:Boolean(matchAt&&now<deadline&&player.injuredUntil<=matchAt),saved:Boolean(current),focus:current?.focus??'balanced',speech:current?.speech??'motivate',
  options:MATCH_FOCUS.flatMap(focus=>MATCH_SPEECH.map(speech=>({focus,speech,...preparationEffects(player,focus,speech)}))),noFixture:world.phase==='active'&&!hasFixture,last:player.lastPreparation??null};
}
export function preparePlayer(world,member,data,now,fixtures){
 requireGame(world.phase==='active'&&world.nextMatchAt,'SEASON_CLOSED');
 const player=own(world,member.id,data.playerId),deadline=world.nextMatchAt-PREPARATION_LOCK_MINUTES*60000;
 requireGame(fixtures?.some(f=>f.home===player.clubId||f.away===player.clubId),'NO_CLIENT_MATCH');
 requireGame(now<deadline,'PREPARATION_LOCKED');requireGame(player.injuredUntil<=world.nextMatchAt,'PLAYER_UNAVAILABLE');
 requireGame(MATCH_FOCUS.includes(data.focus)&&MATCH_SPEECH.includes(data.speech),'INVALID_PREPARATION');
 player.preparation={matchAt:world.nextMatchAt,focus:data.focus,speech:data.speech,updatedAt:now};
 return {playerId:player.id,matchAt:world.nextMatchAt};
}
export function applyPreparation(player,profile,at){
 const prep=player.preparation;if(prep?.matchAt!==at)return {...profile,form:player.trust};
 const effect=preparationEffects(player,prep.focus,prep.speech);
 return {...profile,rating:clamp(profile.rating*(1+effect.ratingPercent/100),2,198),form:clamp(player.trust+effect.form,0,100),attributes:{...profile.attributes,
  shooting:{current:clamp(profile.attributes.shooting.current+effect.shooting,0,20)},passing:{current:clamp(profile.attributes.passing.current+effect.passing,0,20)}}};
}
export function consumePreparations(world,at,played,effects){
 for(const p of world.players)if(p.preparation?.matchAt===at){p.lastPreparation={...p.preparation,applied:played.has(p.id),effects:effects.get(p.id)};delete p.preparation;}
}
function scoredDay(member,at){
 const day=parisDate(at);if(member.duelDay?.day!==day)member.duelDay={day,count:0,opponents:[]};return member.duelDay;
}
function awardDuel(member,opponent,won,at){
 const day=scoredDay(member,at);if(day.count>=DUEL_DAILY_SCORED||day.opponents.includes(opponent))return 0;
 const points=won?3:1;day.count++;day.opponents.push(opponent);member.duelPoints=(member.duelPoints??0)+points;return points;
}
export function respondDuel(world,member,data,now,notify){
 const duel=world.duels?.find(d=>d.id===data.duelId);requireGame(duel?.status==='pending'&&duel.to===member.id&&duel.closesAt>now,'DUEL_CLOSED');
 requireGame(typeof data.accept==='boolean','INVALID_COMMAND');
 if(!data.accept){duel.status='declined';notify?.(world,duel.from,'duel_result',{duelId:duel.id},now);return {duelId:duel.id};}
 requireGame(DUEL_TACTICS.includes(data.tactic),'INVALID_DUEL_TACTIC');
 const a=world.members.find(m=>m.id===duel.from),pa=own(world,a.id,duel.playerA),pb=own(world,member.id,data.playerId);
 requireGame(pa.injuredUntil<=now&&pb.injuredUntil<=now,'PLAYER_UNAVAILABLE');
 duel.playerB=pb.id;duel.tacticB=data.tactic;
 const edge={control:'counter',press:'control',counter:'press'};
 const advantage=edge[duel.tacticA]===duel.tacticB?1:edge[duel.tacticB]===duel.tacticA?-1:0;
 const chance=clamp(.5+(matchPlayerProfile(pa).rating-matchPlayerProfile(pb).rating)*.004+advantage*.08,.15,.85),rng=random(`${world.seed}:duel:${duel.id}`);
 duel.rounds=Array.from({length:5},(_,i)=>({round:i+1,winnerId:rng()<chance?a.id:member.id}));duel.scoreA=duel.rounds.filter(r=>r.winnerId===a.id).length;duel.scoreB=5-duel.scoreA;
 duel.winnerId=duel.scoreA>duel.scoreB?a.id:member.id;duel.status='completed';duel.completedAt=now;
 duel.pointsA=awardDuel(a,member.id,duel.winnerId===a.id,now);duel.pointsB=awardDuel(member,a.id,duel.winnerId===member.id,now);
 for(const m of [a,member])notify?.(world,m.id,'duel_result',{duelId:duel.id},now);
 return {duelId:duel.id};
}
export function challengeDuel(world,member,data,now,notify){
 requireGame(world.phase==='active','SEASON_CLOSED');syncDailyPlay(world,now);
 requireGame(DUEL_TACTICS.includes(data.tactic),'INVALID_DUEL_TACTIC');
 const player=own(world,member.id,data.playerId),opponent=world.members.find(m=>m.id===data.memberId&&m.id!==member.id);
 requireGame(opponent&&!world.blocks.some(b=>b.by===member.id&&b.target===opponent.id||b.by===opponent.id&&b.target===member.id)&&world.players.some(p=>p.ownerId===opponent.id&&p.injuredUntil<=now),'DUEL_NO_OPPONENT');requireGame(player.injuredUntil<=now,'PLAYER_UNAVAILABLE');
 requireGame(!world.duels.some(d=>d.from===member.id&&d.status==='pending'),'DUEL_PENDING');requireGame(!member.lastDuelAt||now-member.lastDuelAt>=60000,'DUEL_COOLDOWN');
 const duel={id:randomUUID(),from:member.id,to:opponent.id,playerA:player.id,tacticA:data.tactic,status:'pending',at:now,closesAt:Math.min(now+2*HOUR,world.endsAt)};
 world.duels.push(duel);member.lastDuelAt=now;
 if(opponent.bot){const roster=world.players.filter(p=>p.ownerId===opponent.id&&p.injuredUntil<=now).sort((a,b)=>b.level-a.level||a.id.localeCompare(b.id)),rng=random(`${world.seed}:${duel.id}:bot`);respondDuel(world,opponent,{duelId:duel.id,accept:true,playerId:roster[0].id,tactic:DUEL_TACTICS[Math.floor(rng()*DUEL_TACTICS.length)]},now,notify);}
 else notify?.(world,opponent.id,'duel_invited',{duelId:duel.id},now);
 return {duelId:duel.id};
}
export function publicDuels(world,memberId){
 return (world.duels??[]).filter(d=>d.from===memberId||d.to===memberId).slice(-30).map(d=>({...d,tacticA:d.status==='pending'&&d.from!==memberId?null:d.tacticA}));
}
export function duelRemaining(member,now){return member.duelDay?.day===parisDate(now)?Math.max(0,DUEL_DAILY_SCORED-member.duelDay.count):DUEL_DAILY_SCORED;}
