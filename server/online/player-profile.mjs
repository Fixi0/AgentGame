import { hash } from './calendar.mjs';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const fieldSkills=['pace','shooting','passing','dribbling','defending','physical'];
export const keeperSkills=['diving','handling','kicking','reflexes','speed','positioning'];
const countries=['FR','GB','ES','IT','DE','PT','BR','AR','SN'];
const detailedPositions={GK:['GK'],DEF:['CB','LB','RB'],MID:['CM','CAM','CDM'],FWD:['ST','LW','RW']};
const roles={GK:[4,1,-1,5,-6,1],DEF:[0,-10,0,-5,8,6],MID:[2,-2,8,5,-7,-1],FWD:[6,8,-4,4,-11,0]};
const weights={GK:[.2,.15,.1,.25,.1,.2],DEF:[.1,.05,.15,.05,.4,.25],MID:[.15,.1,.3,.2,.1,.15],FWD:[.2,.35,.1,.2,.05,.1]};
export function createPlayerProfile(seed,player){
  const value=hash(`${seed}:${player.id}:profile:1`),range=player.position==='GK'?[184,201]:[169,195];
  const heightCm=range[0]+value%(range[1]-range[0]+1);
  const offsets=(roles[player.position]??roles.MID).map((v,i)=>v+(hash(`${seed}:${player.id}:skill:${i}`)%11)-5);
  const group=detailedPositions[player.position]??detailedPositions.MID,primaryPosition=group[(value>>>13)%group.length];
  return {version:1,baseLevel:player.level,nationality:countries[(value>>>5)%countries.length],heightCm,primaryPosition,positions:value%3===0?[...new Set([primaryPosition,group[(value>>>17)%group.length]])]:[primaryPosition],
    weightKg:Math.round((heightCm-100)*.85)+((value>>>11)%9)-4,foot:value%10<2?'left':value%10===2?'both':'right',
    attributes:Object.fromEntries((player.position==='GK'?keeperSkills:fieldSkills).map((key,i)=>[key,clamp(player.level+offsets[i],1,99)]))};
}
export function ensurePlayerProfiles(world){
  let changed=false;
  if(!Array.isArray(world.listings)){world.listings=[];changed=true;}
  for(const player of world.players){
    if(!player.profile?.version){player.profile=createPlayerProfile(world.seed,player);changed=true;}
    if(!Number.isSafeInteger(player.experience)||player.experience<0){player.experience=0;changed=true;}
  }
  return changed;
}
export function currentAttributes(player){
  const profile=player.profile,keys=player.position==='GK'?keeperSkills:fieldSkills;
  return Object.fromEntries(keys.map(key=>[key,clamp(Math.round((profile?.attributes[key]??player.level)+player.level-(profile?.baseLevel??player.level)),1,99)]));
}
export const requiredPlayerXP=level=>150+level*5;
export function awardPlayerXP(player,amount){
  if(!Number.isSafeInteger(amount)||amount<0)throw new Error('Invalid player XP');
  player.experience=(player.experience??0)+amount;
  while(player.level<player.potential&&player.experience>=requiredPlayerXP(player.level)){
    player.experience-=requiredPlayerXP(player.level);player.level++;
  }
  player.experience=Math.min(player.experience,requiredPlayerXP(player.level));
}
export function publicPlayerProfile(player,known){
  const {nationality,heightCm,weightKg,foot,primaryPosition,positions}=player.profile;
  return {nationality,heightCm,weightKg,foot,primaryPosition,positions,attributes:currentAttributes(player),ratingStars:clamp(Math.round(player.level/20),1,5),
    development:known?{xp:player.experience??0,required:requiredPlayerXP(player.level),atPotential:player.level>=player.potential}:null};
}
export function matchPlayerProfile(player){
  const skills=currentAttributes(player),keys=player.position==='GK'?keeperSkills:fieldSkills;
  const weighted=keys.reduce((n,key,i)=>n+skills[key]*(weights[player.position]??weights.MID)[i],0);
  return {rating:clamp(player.level*.75+weighted*.25,1,99)*2,attributes:{
    shooting:{current:(skills.shooting??skills.kicking*.4)/5},passing:{current:(skills.passing??skills.kicking)/5},
  }};
}
