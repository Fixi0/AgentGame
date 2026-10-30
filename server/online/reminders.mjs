const MINUTE=60000;
export function nextWorldTick(world){
 if(world.phase==='lobby')return world.autoStartAt??null;
 if(world.phase!=='active')return null;
 const times=[world.nextMatchAt??Infinity,world.nextBotAt??Infinity];
 for(const a of world.auctions)if(a.status==='open')times.push(a.closesAt);
 for(const n of world.needs)if(n.status==='open')times.push(n.deadline);
 for(const d of world.deals)if(d.status==='pending')times.push(d.closesAt);
 for(const d of world.duels??[])if(d.status==='pending')times.push(d.closesAt);
 for(const l of world.listings??[])if(l.status==='open')times.push(l.closesAt);
 for(const p of world.players)if(p.training)times.push(p.training.finishesAt);
 for(const s of world.scouts)if(!s.done)times.push(s.finishesAt);
 if(world.nextWave<=12)times.push(world.startsAt+(Math.floor((world.nextWave-1)/3)*7+[1,3,5][(world.nextWave-1)%3])*86400000);
 for(const m of world.members.filter(m=>!m.bot)){
  const missing=key=>!world.reminders?.[`${world.season}:${m.id}:${key}`];
  if(world.nextMatchAt&&world.players.some(p=>p.ownerId===m.id)&&missing(`warmup:${world.nextMatchAt}`))times.push(world.nextMatchAt-30*MINUTE);
  for(const a of world.auctions)if(a.status==='open'&&(a.leaderId===m.id||a.bids.some(b=>b.memberId===m.id))&&missing(`market:${a.closesAt}`))times.push(a.closesAt-30*MINUTE);
 }
 const next=Math.min(...times);return Number.isFinite(next)?next:null;
}
export function syncReminders(world,now,notify){
 if(world.phase!=='active')return false;
 let changed=false;world.reminders??={};
 const once=(key,member,code,data)=>{
  const id=`${world.season}:${member.id}:${key}`;if(world.reminders[id])return;
  world.reminders[id]=now;notify(world,member.id,code,data,now);changed=true;
 };
 for(const member of world.members.filter(m=>!m.bot)){
  const roster=world.players.filter(p=>p.ownerId===member.id);
  if(roster.length&&world.nextMatchAt>now&&world.nextMatchAt-now<=30*MINUTE)once(`warmup:${world.nextMatchAt}`,member,'warmup_reminder',{matchAt:world.nextMatchAt});
  const ending=world.auctions.filter(a=>a.status==='open'&&a.closesAt>now&&a.closesAt-now<=30*MINUTE&&(a.leaderId===member.id||a.bids.some(b=>b.memberId===member.id)));
  if(ending.length){const at=Math.min(...ending.map(a=>a.closesAt));once(`market:${at}`,member,'mercato_reminder',{closesAt:at,auctionId:ending[0].id,count:ending.length});}
 }
 for(const [key,at] of Object.entries(world.reminders))if(at<now-7*24*60*MINUTE){delete world.reminders[key];changed=true;}
 return changed;
}
