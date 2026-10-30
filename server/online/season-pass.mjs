import {DAY,HOUR,hash,shuffled} from './calendar.mjs';
import {requireGame} from './errors.mjs';
import {PASS_TIERS,PASS_PRODUCTS,PASS_COSMETICS,cosmeticKind,STICKER_PACKS} from './pass-catalog.mjs';
import {creditGems} from './economy.mjs';
import {safeBadge,validBadge,defaultBadge} from '../../src/online/badgeCatalog.js';

export const parisDate=at=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris'}).format(at);
export const passScope=world=>`${world.id}:${world.season}`;
export function passDay(world,at){
  if(!world.calendar?.length)return 0;
  return Math.max(0,Math.min(28,Math.round((Date.parse(parisDate(at))-Date.parse(parisDate(world.calendar[0].at)))/DAY)+1));
}
function nextMidnight(at){
  // Paris midnight is always an integral UTC hour, including both DST transitions.
  const today=parisDate(at);
  for(let t=Math.floor(at/HOUR)*HOUR+HOUR;t<at+27*HOUR;t+=HOUR)if(parisDate(t)!==today)return t;
  return at+DAY;
}
export const passEndsAt=world=>nextMidnight(world.calendar?.at(-1)?.at??world.endsAt);
function weekAt(world,at){return Math.max(0,Math.min(3,Math.floor((Math.max(1,passDay(world,at))-1)/7)));}
function dailyIds(world,member,date){
  const options=world.day===0||!world.players.some(p=>p.ownerId===member.id)?['market','chat']:['market','chat','results','train'];
  return ['login',...shuffled(options,`${world.id}:${world.season}:${member.id}:${date}`).slice(0,2)];
}
function weeklyIds(world,member,week){return shuffled(['auction_win','client_goal','rank_gain','trade'],`${world.id}:${world.season}:${member.id}:week:${week}`).slice(0,3);}
export function recordPassActivity(world,memberId,kind,at){
  const member=world.members.find(m=>m.id===memberId);
  if(!member||member.bot||!['active','finished'].includes(world.phase)||at>=passEndsAt(world))return false;
  member.passActivity??={days:{},weeks:{}};
  const weekly=['auction_win','client_goal','rank_gain','trade'].includes(kind),key=weekly?String(weekAt(world,at)):parisDate(at);
  const rows=weekly?member.passActivity.weeks:member.passActivity.days;
  const bucket=rows[key]??={missions:weekly?weeklyIds(world,member,Number(key)):dailyIds(world,member,key),done:[]};
  if(!bucket.done.includes(kind)){bucket.done.push(kind);return true;}
  return false;
}
export function ensurePass(wallet,world){
  if(!world||world.phase==='lobby')return null;
  wallet.passStates??={};
  const key=passScope(world);
  const state=wallet.passStates[key]??={scope:key,worldId:world.id,season:world.season,createdAt:world.createdAt,endsAt:passEndsAt(world),earnedXP:0,gemSkips:0,awarded:[],claims:{},lastRank:null};
  state.endsAt=passEndsAt(world);
  return state;
}
function receipts(wallet,scope){return Object.values(wallet.passReceipts??{}).filter(r=>r.scope===scope&&!r.revoked);}
export function premiumFor(wallet,state,now){return Boolean(state&&now<state.endsAt&&(receipts(wallet,state.scope).length||Object.values(wallet.passes??{}).some(end=>end>now)));}
export function passXP(wallet,state){
  const plus=receipts(wallet,state.scope).some(r=>r.plus);
  return Math.min(2800,state.earnedXP+state.gemSkips*100+(plus?1000:0));
}
export function syncSeasonPass(wallet,world,memberId,now,currentRank){
  const state=ensurePass(wallet,world);if(!state)return false;
  state.accountId=memberId;
  let changed=recordPassActivity(world,memberId,'login',now);
  if(state.lastRank!==null&&currentRank<state.lastRank)changed=recordPassActivity(world,memberId,'rank_gain',now)||changed;
  state.lastRank=currentRank;
  const member=world.members.find(m=>m.id===memberId);
  for(const [type,rows,xp] of [['day',member.passActivity?.days??{},35],['week',member.passActivity?.weeks??{},150]]){
    for(const [date,row] of Object.entries(rows))for(const id of row.missions){
      const key=`${type}:${date}:${id}`;
      if(row.done.includes(id)&&!state.awarded.includes(key)){state.earnedXP+=xp;state.awarded.push(key);}
    }
  }
  return changed;
}
export function publicSeasonPass(wallet,world,memberId,now){
  const state=ensurePass(wallet,world);if(!state)return null;
  const member=world.members.find(m=>m.id===memberId),xp=passXP(wallet,state),week=weekAt(world,now),date=parisDate(now);
  const day=member.passActivity?.days[date]??{missions:dailyIds(world,member,date),done:[]};
  const weekly=member.passActivity?.weeks[week]??{missions:weeklyIds(world,member,week),done:[]};
  const mission=(id,type,row)=>({id,type,xp:type==='day'?35:150,completed:row.done.includes(id)});
  return {scope:state.scope,season:world.season,endsAt:state.endsAt,day:passDay(world,now),xp,level:Math.min(28,Math.floor(xp/100)),maxLevel:28,xpPerLevel:100,premium:premiumFor(wallet,state,now),plus:receipts(wallet,state.scope).some(r=>r.plus),closed:!['active','finished'].includes(world.phase)||now>=state.endsAt,canPurchase:world.phase==='active',
    tiers:PASS_TIERS,claims:Object.entries(state.claims).filter(([,c])=>c.active).map(([key])=>key),
    missions:{daily:day.missions.map(id=>mission(id,'day',day)),weekly:weekly.missions.map(id=>mission(id,'week',weekly)),dailyResetsAt:Math.min(nextMidnight(now),state.endsAt),weeklyResetsAt:Math.min(nextMidnight(world.calendar[Math.min(27,(week+1)*7-1)]?.at??state.endsAt),state.endsAt)},
    skipCost:5,skipUnlockDay:20,canSkip:world.phase==='active'&&passDay(world,now)>=20&&xp<2800,
    products:Object.entries(PASS_PRODUCTS).map(([id,product])=>({id,...product})),
    pendingCredits:Object.entries(wallet.passReceipts??{}).filter(([,r])=>!r.scope&&!r.revoked).map(([id,r])=>({id,plus:r.plus})),
    collection:(wallet.cosmetics??[]).filter(id=>PASS_COSMETICS.includes(id)||/^title_(agent|elite)_s\d+$/.test(id)).map(id=>({id,kind:cosmeticKind(id)})),equipment:wallet.passEquipment??{},stickerPacks:Object.fromEntries(Object.entries(STICKER_PACKS).filter(([id])=>wallet.cosmetics?.includes(id))),
  };
}
function changeCosmetic(wallet,id,source,sign){
  wallet.cosmetics??=[];wallet.passSources??={};wallet.passEquipment??={};
  if(sign>0){
    wallet.passSources[id]??={baseline:wallet.cosmetics.includes(id),sources:[]};
    if(!wallet.passSources[id].sources.includes(source))wallet.passSources[id].sources.push(source);
    if(!wallet.cosmetics.includes(id))wallet.cosmetics.push(id);
    const kind=cosmeticKind(id);if(kind)wallet.passEquipment[kind]=id;
  }else if(wallet.passSources[id]){
    const entry=wallet.passSources[id];entry.sources=entry.sources.filter(key=>key!==source);
    if(!entry.baseline&&!entry.sources.length){wallet.cosmetics=wallet.cosmetics.filter(value=>value!==id);for(const [kind,value] of Object.entries(wallet.passEquipment))if(value===id)delete wallet.passEquipment[kind];}
  }
}
function applyRewards(wallet,state,claim,key,sign,now,adjustCoins){
  for(const reward of claim.rewards){
    if(reward.type==='coins')adjustCoins(reward.amount*sign,`pass:${state.scope}:${key}`,now);
    else if(reward.type==='gems'){
      if(sign>0)creditGems(wallet,reward.amount);
      else{const taken=Math.min(wallet.gems??0,reward.amount);wallet.gems=(wallet.gems??0)-taken;wallet.debt=(wallet.debt??0)+reward.amount-taken;}
    }else changeCosmetic(wallet,reward.id,`${state.scope}:${key}`,sign);
  }
  claim.active=sign>0;
}
export function claimPass(wallet,world,memberId,data,now,adjustCoins){
  const state=ensurePass(wallet,world);
  requireGame(state&&['active','finished'].includes(world.phase)&&now<state.endsAt,'SEASON_CLOSED');
  requireGame(Number.isSafeInteger(data.tier)&&data.tier>=1&&data.tier<=28&&typeof data.premium==='boolean','INVALID_COMMAND');
  const key=`${data.premium?'premium':'free'}:${data.tier}`,tier=PASS_TIERS[data.tier-1];
  requireGame(passXP(wallet,state)>=tier.xp&&!state.claims[key]?.active,'REWARD_NOT_AVAILABLE');
  requireGame(!data.premium||premiumFor(wallet,state,now),'PASS_REQUIRED');
  const rewards=tier[data.premium?'premium':'free'].map(r=>r.type==='cosmetic'&&r.id.startsWith('title_')?{...r,id:`${r.id}_s${world.season}`}:{...r});
  requireGame(rewards.length,'REWARD_NOT_AVAILABLE');
  const claim=state.claims[key]??={tier:data.tier,premium:data.premium,rewards,active:false};
  applyRewards(wallet,state,claim,key,1,now,adjustCoins);return {tier:data.tier,premium:data.premium,rewards};
}
export function reconcilePassRewards(wallet,scope,now,adjustCoins,restore=false){
  const state=wallet.passStates?.[scope];if(!state)return;
  const premium=receipts(wallet,scope).length>0||Object.values(wallet.passes??{}).some(end=>end>now),xp=passXP(wallet,state);
  for(const [key,claim] of Object.entries(state.claims)){
    const eligible=xp>=claim.tier*100&&(!claim.premium||premium);
    if(claim.active&&!eligible)applyRewards(wallet,state,claim,key,-1,now,adjustCoins);
    else if(restore&&!claim.active&&eligible)applyRewards(wallet,state,claim,key,1,now,adjustCoins);
  }
}
export function preparePassPurchase(wallet,world,productId,now){
  requireGame(Object.hasOwn(PASS_PRODUCTS,productId),'INVALID_PRODUCT');
  const state=ensurePass(wallet,world);requireGame(state&&world.phase==='active'&&now<state.endsAt,'SEASON_CLOSED');
  requireGame(!premiumFor(wallet,state,now)||PASS_PRODUCTS[productId].plus&&!receipts(wallet,state.scope).some(r=>r.plus),'ALREADY_OWNED');
  wallet.passPurchaseIntents??=[];
  if(!wallet.passPurchaseIntents.some(i=>i.scope===state.scope&&i.productId===productId))wallet.passPurchaseIntents.push({scope:state.scope,productId,at:now,endsAt:state.endsAt});
  return {scope:state.scope};
}
export function grantVerifiedPass(wallet,transaction,now){
  const product=PASS_PRODUCTS[transaction.productId];requireGame(product,'INVALID_PRODUCT');
  const intent=wallet.passPurchaseIntents?.filter(i=>i.productId===transaction.productId&&transaction.purchaseDate>=i.at-300000&&transaction.purchaseDate<=i.endsAt).sort((a,b)=>b.at-a.at)[0];
  requireGame(intent,'PASS_PURCHASE_CONTEXT_REQUIRED');
  wallet.passReceipts??={};
  const existing=receipts(wallet,intent.scope),canApply=now<intent.endsAt&&(!existing.length||product.plus&&!existing.some(r=>r.plus));
  wallet.passReceipts[String(transaction.transactionId)]={scope:canApply?intent.scope:null,plus:product.plus,revoked:false,purchasedAt:transaction.purchaseDate};
  return {pendingCredit:!canApply};
}
export function applyPassCredit(wallet,world,transactionId,now){
  const receipt=wallet.passReceipts?.[transactionId],state=ensurePass(wallet,world);
  requireGame(receipt&&!receipt.scope&&!receipt.revoked,'REWARD_NOT_AVAILABLE');
  requireGame(state&&world.phase==='active'&&now<state.endsAt,'SEASON_CLOSED');
  requireGame(!premiumFor(wallet,state,now)||receipt.plus&&!receipts(wallet,state.scope).some(r=>r.plus),'ALREADY_OWNED');
  receipt.scope=state.scope;
}
export function skipPassTier(wallet,world,now){
  const state=ensurePass(wallet,world);requireGame(state&&world.phase==='active'&&now<state.endsAt,'SEASON_CLOSED');
  requireGame(passDay(world,now)>=20&&passXP(wallet,state)<2800,'PASS_SKIP_LOCKED');
  requireGame(!(wallet.debt>0),'PURCHASE_REVIEW_REQUIRED');requireGame(wallet.gems>=5,'INSUFFICIENT_GEMS');
  wallet.gems-=5;state.gemSkips++;return {cost:5};
}
export function agencyAppearance(wallet,id,world,now){
  const state=world?wallet.passStates?.[passScope(world)]:Object.values(wallet.passStates??{}).find(s=>now<s.endsAt&&receipts(wallet,s.scope).length),owned=wallet.cosmetics??[],equipment=wallet.passEquipment??{},selected=owned.includes(wallet.selectedCosmetic)?wallet.selectedCosmetic:null;
  return {badge:safeBadge(wallet.agencyBadge,id,owned),premium:premiumFor(wallet,state,now),frame:equipment.frame??null,profile:equipment.profile??(selected==='office_gold'?'profile_trophies':selected==='office_ice'?'profile_night':null),chat:equipment.chat??null,effect:equipment.effect??null,ranking:equipment.ranking??null,badgeEffect:equipment.badgeEffect??(selected==='crest_neon'?'crest_neon':null),title:equipment.title??null};
}
export function setAgencyBadge(wallet,id,badge){requireGame(validBadge(badge,wallet.cosmetics??[]),'INVALID_BADGE');wallet.agencyBadge=safeBadge(badge,id,wallet.cosmetics??[]);}
export function equipPassCosmetic(wallet,id){const kind=cosmeticKind(id);requireGame(kind&&wallet.cosmetics?.includes(id),'NOT_OWNED');wallet.passEquipment??={};wallet.passEquipment[kind]=id;}
export function botAppearance(id){return {badge:defaultBadge(id),premium:false};}
