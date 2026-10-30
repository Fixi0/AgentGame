import { randomUUID, randomBytes } from 'node:crypto';
import { clubs, clubMap, makePlayer, rules, tactics, positions } from './catalog.mjs';
import { DAY, HOUR, hash, random, shuffled, roundRobin, nextParisKickoff, slotAt, EURO_DAYS, division } from './calendar.mjs';
import { simulateMatch } from '../../src/engine/matchEngine.js';
import { ensurePlayerProfiles, publicPlayerProfile, matchPlayerProfile, awardPlayerXP } from './player-profile.mjs';
import {recordPassActivity,passEndsAt} from './season-pass.mjs';
import {GameError,requireGame} from './errors.mjs';
import {clubBadge} from '../../src/online/clubBadgeCatalog.js';
import {syncReminders} from './reminders.mjs';
import {PORTRAIT_COUNT} from '../../src/online/portraitCatalog.js';
import {syncDailyPlay,publicPreparation,preparationEffects,applyPreparation,consumePreparations,publicDuels,duelRemaining} from './daily-play.mjs';
export {GameError,requireGame} from './errors.mjs';

export function integer(value, min = 0, max = 1_000_000) { requireGame(Number.isSafeInteger(value) && value >= min && value <= max, 'INVALID_AMOUNT'); return value; }
export const clients = (world, memberId) => world.players.filter(p => p.ownerId === memberId);
export const clientCapacity = member => member.thirdClientSlot ? 3 : 2;
export function clubUnavailable(world, clubId, exceptIds = []) {
  return world.players.some(p => p.clubId === clubId && p.ownerId && !exceptIds.includes(p.id))
    || world.auctions.some(a => a.status === 'open' && a.leaderId && !exceptIds.includes(a.playerId) && world.players.find(p => p.id === a.playerId)?.clubId === clubId);
}
export const memberFor = (world, id) => { const m = world.members.find(a => a.id === id); requireGame(m, 'NOT_IN_LEAGUE', 403); return m; };
export function notify(world, memberId, code, data, at) {
  const activity={auction_won:'auction_win',player_goal:'client_goal',transfer_completed:'trade',client_departed:'trade'}[code];
  if(activity)recordPassActivity(world,memberId,activity,at);
  world.events.push({ id: randomUUID(), memberId, code, data, at });
  // A season has finite results; keep the personal inbox and outbox bounded.
  if (world.events.length > 3000) world.events.splice(0, world.events.length - 3000);
}
export function record(world, member, delta, reason, reference, at) {
  integer(Math.abs(delta)); requireGame(member.coins + delta >= 0, 'INSUFFICIENT_COINS');
  const debtPaid=delta>0?Math.min(member.passCoinDebt??0,delta):0;
  if(debtPaid){member.passCoinDebt-=debtPaid;delta-=debtPaid;}
  member.coins += delta;
  world.ledger.push({ id: randomUUID(), memberId: member.id, delta, reason, reference, balance: member.coins, at,...(debtPaid?{debtPaid}:{}) });
}
export function adjustPassCoins(world,member,delta,reference,at){
  if(delta>=0){record(world,member,delta,'season_pass',reference,at);return;}
  const amount=-delta,taken=Math.min(Math.max(0,available(world,member)),amount);
  if(taken)record(world,member,-taken,'pass_refund',reference,at);
  member.passCoinDebt=(member.passCoinDebt??0)+amount-taken;
}
export function reserved(world, memberId, except = null) {
  return world.auctions.filter(a => a.id !== except && a.status === 'open' && a.leaderId === memberId).reduce((s, a) => s + a.price, 0)
    + world.deals.filter(d => d.id !== except && d.status === 'pending' && d.buyerId === memberId).reduce((s, d) => s + d.price, 0);
}
export const available = (w, m, except) => m.coins - reserved(w, m.id, except);
function reservationIds(w, id, except = null) {
  return [...w.auctions.filter(a => a.id !== except && a.status === 'open' && a.leaderId === id), ...w.deals.filter(d => d.id !== except && d.status === 'pending' && d.buyerId === id)].map(a => a.replaceId).filter(Boolean);
}
function pendingSlots(w, id, except = null) {
  return w.auctions.filter(a => a.id !== except && a.status === 'open' && a.leaderId === id && !a.replaceId).length + w.deals.filter(d => d.id !== except && d.status === 'pending' && d.buyerId === id && !d.replaceId).length;
}
function capacity(w, member, replaceId, except = null) {
  const roster = clients(w, member.id);
  requireGame(roster.length <= clientCapacity(member), 'AGENCY_FULL');
  if (replaceId) {
    requireGame(roster.some(p => p.id === replaceId), 'INVALID_REPLACEMENT');
    requireGame(!reservationIds(w, member.id, except).includes(replaceId), 'CLIENT_RESERVED');
    requireGame(!w.deals.some(d => d.id !== except && d.status === 'pending' && d.playerId === replaceId), 'CLIENT_RESERVED');
  } else requireGame(roster.length + pendingSlots(w, member.id, except) < clientCapacity(member), 'AGENCY_FULL');
}
function protectedPlayer(w, playerId) { return reservationIds(w, w.players.find(p => p.id === playerId)?.ownerId).includes(playerId); }
export function addMember(world, account, at) {
  requireGame(world.phase === 'lobby', 'LEAGUE_STARTED'); requireGame(world.members.length < rules.members, 'LEAGUE_FULL');
  requireGame(!world.members.some(a => a.id === account.id), 'ALREADY_IN_LEAGUE');
  world.members.push({ id: account.id, name: account.name, bot: false, coins: rules.startingCoins, commissions: 0, trophies: 0, goals: 0, wins: 0, joinedAt: at, lastActive: at, auto: true, lastBotAt: 0, xp: 0 });
  if (world.members.length === 2&&world.private!==false) world.autoStartAt = at + DAY;
}
export function createWorld(account, name, at,visibility='private') {
  requireGame(typeof name === 'string' && name.trim().length >= 3 && name.trim().length <= 28, 'INVALID_NAME');
  requireGame(['private','public'].includes(visibility),'INVALID_VISIBILITY');
  const world = { id: randomUUID(), code: randomBytes(5).toString('hex').slice(0, 8).toUpperCase(), name: name.trim(), ownerId: account.id, private: visibility==='private',locale:account.locale??'fr',autoStartAt:visibility==='public'?at+90000:null,
    rulesRevision:2, seed: randomBytes(32).toString('hex'), version: 1, season: 1, phase: 'lobby', createdAt: at, startsAt: null, endsAt: null, nextMatchAt: null, day: 0, nextSequence: 0,
    members: [], players: [], auctions: [], needs: [], proposals: [], deals: [], listings: [], matches: [], cups: [], tables: {}, ledger: [], events: [], chats: [], reports: [], blocks: [], scouts: [], history: [], delivered: [], nextWave: 0, nextBotAt: 0,
  }; addMember(world, account, at); return world;
}
function addLots(world, count, at) {
  world.portraitOffset??=hash(world.id)%PORTRAIT_COUNT;
  for (let i = 0; i < count; i++) {
    const player = makePlayer(world.seed, world.nextSequence++,{season:world.season,portraitOffset:world.portraitOffset});
    const unused = shuffled(clubs, `${world.seed}:${player.id}:club`).find(c => !world.players.some(p => p.clubId === c.id));
    if (unused) player.clubId = unused.id;
    world.players.push(player);
    world.auctions.push({ id: randomUUID(), playerId: player.id, startsAt: at, closesAt: Math.min(at + DAY,world.endsAt), price: player.value - 1, leaderId: null, replaceId: null, bids: [], status: 'open' });
  }
}
function makeNeeds(world, at) {
  const choices = shuffled(clubs.filter(c => !clubUnavailable(world, c.id)), `${world.seed}:${at}:needs`);
  world.needs = choices.slice(0, 8).map((club, i) => ({ id: randomUUID(), clubId: club.id, position: positions[i % 4], minLevel: 42 + (4 - club.tier) * 9, deadline: Math.min(at + 7 * DAY,world.endsAt), status: 'open' }));
}
export function startWorld(world, actorId, at) {
  requireGame(world.ownerId === actorId || actorId === 'scheduler', 'OWNER_ONLY', 403);
  requireGame(world.phase === 'lobby', 'LEAGUE_STARTED'); requireGame(world.members.filter(m => !m.bot).length >= (world.private===false?1:2), 'TWO_AGENTS_REQUIRED');
  while (world.members.length < rules.members) {
    const n = world.members.length + 1;
    world.members.push({ id: `bot-${n}`, name: ['Atlas Agency', 'Golden Touch', 'Blue Eleven', 'Nova Sports', 'Goal Partners', 'Mercato Club', 'Next Talent', 'Prime Agency', 'Corner Agency', 'Victory Sports'][n - 1], bot: true, coins: rules.startingCoins, commissions: 0, trophies: 0, goals: 0, wins: 0, joinedAt: at, lastActive: at, auto: true, lastBotAt: 0, xp: 0 });
  }
  world.phase = 'active'; world.startsAt = at + DAY; world.nextMatchAt = nextParisKickoff(world.startsAt); world.endsAt = world.startsAt + 28 * DAY;
  world.calendar = Array.from({length:28},(_,i)=>({day:i+1,at:slotAt(world.nextMatchAt,i+1),europe:EURO_DAYS.has(i+1)}));
  world.endsAt=world.calendar.at(-1).at;
  world.day = 0; world.nextWave = 1; world.nextBotAt = at + 2 * HOUR;
  const eligible = [...clubs].sort((a, b) => a.tier - b.tier || hash(`${world.seed}:${a.id}`) - hash(`${world.seed}:${b.id}`));
  world.cups = ['CL', 'EL', 'ECL'].map((id, i) => ({ id, teams: eligible.slice(i * 16, i * 16 + 16).map(c => c.id), rounds: [], champion: null }));
  world.tables = Object.fromEntries(clubs.map(c => [c.id, { id: c.id, points: 0, played: 0, gf: 0, ga: 0 }]));
  addLots(world, 30, at); makeNeeds(world, world.startsAt);
  for (const m of world.members) notify(world, m.id, 'league_started', { name: world.name }, at);
}
export function placeBid(world, member, data, at) {
  requireGame(world.phase === 'active', 'SEASON_CLOSED');
  const auction = world.auctions.find(a => a.id === data.auctionId); requireGame(auction && auction.status === 'open' && auction.startsAt <= at && auction.closesAt > at, 'AUCTION_CLOSED');
  const amount = integer(data.amount, 1, 100000); requireGame(amount > auction.price, 'BID_TOO_LOW');
  const replacement = data.replaceId || null; capacity(world, member, replacement, auction.id);
  const player = world.players.find(p => p.id === auction.playerId);
  requireGame(!clubUnavailable(world, player.clubId, [player.id, replacement]), 'CLUB_UNAVAILABLE');
  requireGame(available(world, member, auction.id) >= amount, 'INSUFFICIENT_COINS');
  if (auction.leaderId && auction.leaderId !== member.id) notify(world, auction.leaderId, 'outbid', { playerId: auction.playerId, amount }, at);
  auction.price = amount; auction.leaderId = member.id; auction.replaceId = replacement;
  auction.bids.push({ memberId: member.id, amount, at });
  member.lastActive = at;
}
function transferMandate(world, player, recipient, replaceId, at) {
  requireGame(!clubUnavailable(world, player.clubId, [player.id, replaceId]), 'CLUB_UNAVAILABLE');
  if (replaceId) {
    const former = world.players.find(p => p.id === replaceId && p.ownerId === recipient.id); requireGame(former, 'INVALID_REPLACEMENT');
    former.ownerId = null; former.mandateEndsAt = null; former.training=null;delete former.preparation;
    for(const listing of world.listings??[])if(listing.playerId===former.id&&listing.status==='open')listing.status='cancelled';
    for (const proposal of world.proposals.filter(p => p.playerId === former.id && p.status === 'pending')) proposal.status = 'cancelled';
    // Released clients return once, as a separate lot. No duplicate player instance.
    if (at+HOUR<world.endsAt&&!world.auctions.some(a => a.playerId === former.id && a.status === 'open')) world.auctions.push({ id: randomUUID(), playerId: former.id, startsAt: at + HOUR, closesAt: Math.min(at + DAY + HOUR,world.endsAt), price: Math.max(1, former.value - 1), leaderId: null, replaceId: null, bids: [], status: 'open' });
  }
  const previous = player.ownerId;delete player.preparation;
  for(const listing of world.listings??[])if(listing.playerId===player.id&&listing.status==='open')listing.status=previous?'sold':'cancelled';
  player.ownerId = recipient.id; player.signedAt = at; player.mandateEndsAt = at + 7 * DAY; player.protectedUntil = at + 2 * DAY; player.trust = 75;
  for (const proposal of world.proposals.filter(p => p.playerId === player.id && p.status === 'pending')) proposal.status = 'cancelled';
  if (previous) for (const deal of world.deals.filter(d => d.playerId === player.id && d.status === 'pending')) deal.status = 'superseded';
}
function closeAuctions(world, at) {
  const due = world.auctions.filter(a => a.status === 'open' && a.closesAt <= at).sort((a, b) => a.closesAt - b.closesAt || a.id.localeCompare(b.id));
  for (const auction of due) {
    const player = world.players.find(p => p.id === auction.playerId);
    if (auction.leaderId) {
      const member = memberFor(world, auction.leaderId);
      if(clubUnavailable(world,player.clubId,[player.id,auction.replaceId])){auction.status='cancelled';notify(world,member.id,'club_unavailable',{playerId:player.id,clubId:player.clubId},at);continue;}
      capacity(world, member, auction.replaceId, auction.id);
      requireGame(!player.ownerId && available(world, member, auction.id) >= auction.price, 'RESERVATION_INVARIANT', 500);
      record(world, member, -auction.price, 'auction', auction.id, auction.closesAt);
      transferMandate(world, player, member, auction.replaceId, auction.closesAt);
      member.xp += 50; auction.status = 'sold';
      notify(world, member.id, 'auction_won', { playerId: player.id, amount: auction.price }, auction.closesAt);
    } else auction.status = 'unsold';
  }
}
const proposalScore=(player,need,choice)=>player.level-need.minLevel+55+choice.modifier;
export function propose(world, member, data, at) {
  const player = world.players.find(p => p.id === data.playerId && p.ownerId === member.id);
  const need = world.needs.find(n => n.id === data.needId && n.status === 'open' && n.deadline > at);
  const choice = Object.hasOwn(tactics,data.strategy)?tactics[data.strategy]:null; requireGame(player && need && choice, 'INVALID_PROPOSAL');
  requireGame(player.clubId !== need.clubId, 'ALREADY_AT_CLUB');
  requireGame(!clubUnavailable(world, need.clubId, [player.id]), 'CLUB_UNAVAILABLE');
  requireGame(player.position === need.position, 'WRONG_POSITION');
  requireGame(!protectedPlayer(world, player.id) && !world.deals.some(d => d.playerId === player.id && d.status === 'pending'), 'CLIENT_RESERVED');
  requireGame(!world.proposals.some(p => p.playerId === player.id && p.week === Math.floor((at - world.startsAt) / (7 * DAY)) && p.status === 'accepted'), 'PLACEMENT_THIS_WEEK');
  const previous = world.proposals.find(p => p.playerId === player.id && p.status === 'pending');
  if (previous) previous.status = 'replaced';
  const proposal = { id: randomUUID(), memberId: member.id, playerId: player.id, needId: need.id, strategy: data.strategy, commission: choice.commission, score: proposalScore(player,need,choice), boost: 0, status: 'pending', at, week: Math.floor((at - world.startsAt) / (7 * DAY)) };
  world.proposals.push(proposal);
  for (const p of world.proposals.filter(p => p.needId === need.id && p.status === 'pending' && p.memberId !== member.id)) notify(world, p.memberId, 'rival_offer', { clubId: need.clubId }, at);
  return proposal;
}
function closeNeeds(world, at) {
  for (const need of world.needs.filter(n => n.status === 'open' && n.deadline <= at)) {
    const candidates = world.proposals.filter(p => p.needId === need.id && p.status === 'pending').sort((a, b) => (b.score + b.boost) - (a.score + a.boost) || a.at - b.at || a.id.localeCompare(b.id));
    let awarded = false;
    for (const p of candidates) {
      const player = world.players.find(v => v.id === p.playerId && v.ownerId === p.memberId), member = memberFor(world, p.memberId);
      if (!awarded && player && p.score + p.boost >= 40 && !clubUnavailable(world, need.clubId, [player.id])) {
        player.clubId = need.clubId; player.trust = Math.min(100, player.trust + 5); p.status = 'accepted'; awarded = true;
        record(world, member, p.commission, 'commission', p.id, need.deadline); member.commissions += p.commission; member.xp += 50;
        notify(world, member.id, 'placement_won', { playerId: player.id, clubId: need.clubId, amount: p.commission }, need.deadline);
      } else { p.status = 'rejected'; notify(world, member.id, 'placement_lost', { playerId: p.playerId, clubId: need.clubId }, need.deadline); }
    }
    need.status = awarded ? 'filled' : 'expired';
  }
}
export function offerDeal(world, member, data, at) {
  requireGame(data.kind === undefined || data.kind === 'trade','INVALID_COMMAND');
  const player = world.players.find(p => p.id === data.playerId);
  requireGame(player?.ownerId && player.ownerId !== member.id, 'INVALID_CLIENT');
  requireGame(!protectedPlayer(world, player.id) && !world.deals.some(d => d.playerId === player.id && d.status === 'pending'), 'CLIENT_RESERVED');
  requireGame(!world.deals.some(d => d.status === 'accepted' && d.at > at - 7 * DAY && [d.sellerId, d.buyerId].includes(member.id) && [d.sellerId, d.buyerId].includes(player.ownerId)), 'TRADE_COOLDOWN');
  const price = integer(data.amount, 1, 100000);
  capacity(world, member, data.replaceId || null); requireGame(available(world, member) >= price, 'INSUFFICIENT_COINS');
  const deal = { id: randomUUID(), playerId: player.id, sellerId: player.ownerId, buyerId: member.id, price, replaceId: data.replaceId || null, kind: 'trade', status: 'pending', at, closesAt: at + DAY };
  world.deals.push(deal); notify(world, deal.sellerId, 'transfer_offer', { dealId: deal.id, playerId: player.id, amount: price }, at);
  return deal;
}
export function listClient(world,member,data,at){
  requireGame(world.phase==='active','SEASON_CLOSED');
  const player=world.players.find(p=>p.id===data.playerId&&p.ownerId===member.id);
  requireGame(player,'INVALID_CLIENT');
  const price=integer(data.amount,1,100000);
  requireGame(!protectedPlayer(world,player.id)&&!world.deals.some(d=>d.playerId===player.id&&d.status==='pending'),'CLIENT_RESERVED');
  world.listings??=[];
  for(const previous of world.listings.filter(l=>l.playerId===player.id&&l.status==='open'))previous.status='replaced';
  const listing={id:randomUUID(),playerId:player.id,sellerId:member.id,price,at,closesAt:Math.min(at+DAY,world.endsAt),status:'open'};
  world.listings.push(listing);
  if(world.listings.length>160){
    const recentClosed=new Set(world.listings.filter(l=>l.status!=='open').slice(-120).map(l=>l.id));
    world.listings=world.listings.filter(l=>l.status==='open'||recentClosed.has(l.id));
  }
  notify(world,member.id,'client_listed',{playerId:player.id,amount:price},at);return listing;
}
export function withdrawListing(world,member,data){
  const listing=world.listings?.find(l=>l.id===data.listingId&&l.sellerId===member.id&&l.status==='open');
  requireGame(listing,'LISTING_CLOSED');listing.status='cancelled';
}
export function releaseClient(world,member,data,at){
  requireGame(world.phase==='active','SEASON_CLOSED');requireGame(data.confirm===true,'RELEASE_CONFIRMATION_REQUIRED');
  const player=world.players.find(p=>p.id===data.playerId&&p.ownerId===member.id);
  requireGame(player,'INVALID_CLIENT');
  requireGame(!protectedPlayer(world,player.id)&&!world.deals.some(d=>d.playerId===player.id&&d.status==='pending'),'CLIENT_RESERVED');
  requireGame(!world.auctions.some(a=>a.playerId===player.id&&a.status==='open'),'CLIENT_RESERVED');
  for(const listing of world.listings??[])if(listing.playerId===player.id&&listing.status==='open')listing.status='cancelled';
  for(const proposal of world.proposals.filter(p=>p.playerId===player.id&&p.status==='pending'))proposal.status='cancelled';
  Object.assign(player,{ownerId:null,mandateEndsAt:null,signedAt:null,protectedUntil:0,training:null,lastContactAt:0,trust:75});delete player.preparation;
  const auction={id:randomUUID(),playerId:player.id,startsAt:at,closesAt:Math.min(at+DAY,world.endsAt),price:Math.max(0,player.value-1),leaderId:null,replaceId:null,bids:[],status:'open'};
  world.auctions.push(auction);notify(world,member.id,'client_released',{playerId:player.id},at);return auction;
}
export function respondDeal(world, member, data, at) {
  requireGame(typeof data.accept==='boolean','INVALID_COMMAND');
  const deal = world.deals.find(d => d.id === data.dealId && d.status === 'pending' && d.closesAt > at && d.sellerId === member.id); requireGame(deal, 'DEAL_CLOSED');
  const player = world.players.find(p => p.id === deal.playerId && p.ownerId === member.id); requireGame(player, 'INVALID_CLIENT');
  if (!data.accept) {
    deal.status = 'rejected'; notify(world, deal.buyerId, 'transfer_declined', { playerId: player.id }, at); return;
  }
  settleDeal(world, deal, at);
}
function settleDeal(world, deal, at) {
  const buyer = memberFor(world, deal.buyerId), seller = memberFor(world, deal.sellerId), player = world.players.find(p => p.id === deal.playerId && p.ownerId === seller.id);
  if (!player) { deal.status = 'superseded'; return; }
  capacity(world, buyer, deal.replaceId, deal.id); requireGame(available(world, buyer, deal.id) >= deal.price, 'RESERVATION_INVARIANT', 500);
  record(world, buyer, -deal.price, 'buy_mandate', deal.id, at); record(world, seller, deal.price, 'sell_mandate', deal.id, at);
  deal.status = 'accepted'; transferMandate(world, player, buyer, deal.replaceId, at);
  notify(world, buyer.id, 'transfer_completed', { playerId: player.id }, at); notify(world, seller.id, 'client_departed', { playerId: player.id }, at);
}
function standings(world, ids, matches) {
  const table = new Map(ids.map(id => [id, { id, points: 0, gf: 0, ga: 0 }]));
  for (const m of matches) { const a = table.get(m.home), b = table.get(m.away); if (!a || !b) continue; a.gf += m.hg; a.ga += m.ag; b.gf += m.ag; b.ga += m.hg; a.points += m.hg > m.ag ? 3 : m.hg === m.ag ? 1 : 0; b.points += m.ag > m.hg ? 3 : m.hg === m.ag ? 1 : 0; }
  return [...table.values()].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.id.localeCompare(b.id)).map(r => r.id);
}
export function fixturesForDay(world, day) {
  if (!EURO_DAYS.has(day)) {
    const round = day - [...EURO_DAYS].filter(d => d < day).length - 1;
    return ['FR', 'GB', 'ES', 'IT', 'DE'].flatMap(country => (roundRobin(shuffled(clubs.filter(c => c.countryCode === country).map(c => c.id), `${world.seed}:${country}`))[round] ?? []).map(([home, away]) => ({ home, away, competition: 'LEAGUE' })));
  }
  const round = [...EURO_DAYS].sort((a, b) => a - b).indexOf(day);
  return world.cups.flatMap(cup => {
    let pairs;
    if (round < 6) pairs = Array.from({ length: 4 }, (_, i) => {
      const group = cup.teams.slice(i * 4, i * 4 + 4), rounds = roundRobin(group);
      return round < 3 ? rounds[round] : rounds[round - 3].map(([a, b]) => [b, a]);
    }).flat();
    else if (round === 6) {
      const qualifiers = Array.from({ length: 4 }, (_, i) => standings(world, cup.teams.slice(i * 4, i * 4 + 4), world.matches.filter(m => m.competition === cup.id))).map(rows => rows.slice(0, 2));
      pairs = [[qualifiers[0][0], qualifiers[1][1]], [qualifiers[1][0], qualifiers[0][1]], [qualifiers[2][0], qualifiers[3][1]], [qualifiers[3][0], qualifiers[2][1]]];
    } else {
      const previousDay = [...EURO_DAYS].sort((a, b) => a - b)[round - 1];
      const winners = world.matches.filter(m => m.day === previousDay && m.competition === cup.id).map(m => m.winner);
      pairs = Array.from({ length: winners.length / 2 }, (_, i) => [winners[i * 2], winners[i * 2 + 1]]);
    }
    return pairs.map(([home, away]) => ({ home, away, competition: cup.id, knockout: round >= 6, final: round === 8 }));
  });
}
function squad(world, clubId, at) {
  const club = clubMap.get(clubId), rng = random(`${world.seed}:${clubId}:squad`);
  const generic = Array.from({ length: 11 }, (_, i) => ({ id: `npc:${clubId}:${i}`, position: i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 8 ? 'MID' : 'FWD', rating: (65 + (4 - club.tier) * 5 + Math.floor(rng() * 8)) * 2, form: 60, attributes: { shooting: { current: 10 }, passing: { current: 10 } } }));
  const represented = world.players.filter(p => p.ownerId && p.clubId === clubId && p.injuredUntil <= at).sort((a,b)=>b.level-a.level||a.id.localeCompare(b.id));
  for (const p of represented) { const i = generic.findIndex(g => g.position === p.position && g.id.startsWith('npc:')); if (i >= 0) generic[i] = { ...p, ...applyPreparation(p,matchPlayerProfile(p),at) }; }
  return generic;
}
function playNight(world, at) {
  const day = world.day + 1,nightPlayed=new Set(),preparedEffects=new Map(world.players.filter(p=>p.preparation?.matchAt===at).map(p=>[p.id,preparationEffects(p,p.preparation.focus,p.preparation.speech)]));
  for (const f of fixturesForDay(world, day)) {
    const homePlayers=squad(world,f.home,at),awayPlayers=squad(world,f.away,at),played=new Set([...homePlayers,...awayPlayers].map(p=>p.id));
    for(const id of played)nightPlayed.add(id);
    const sim = simulateMatch({ homePlayers, awayPlayers, homeTeamName: clubMap.get(f.home).name, awayTeamName: clubMap.get(f.away).name, seed: hash(`${world.seed}:${day}:${f.home}:${f.away}`) });
    const winner = sim.homeGoals > sim.awayGoals ? f.home : sim.awayGoals > sim.homeGoals ? f.away : f.knockout ? (hash(`${world.seed}:${day}:${f.home}:${f.away}:penalties`) % 2 ? f.home : f.away) : null;
    const m = { id: `${world.season}:${day}:${f.home}:${f.away}`, day, at, ...f, hg: sim.homeGoals, ag: sim.awayGoals, winner, penalties: Boolean(f.knockout && sim.homeGoals === sim.awayGoals), events: sim.events, stats: sim.stats };
    world.matches.push(m);
    if (f.competition === 'LEAGUE') {
      const a = world.tables[f.home], b = world.tables[f.away]; a.played++; b.played++; a.gf += m.hg; a.ga += m.ag; b.gf += m.ag; b.ga += m.hg; a.points += m.hg > m.ag ? 3 : m.hg === m.ag ? 1 : 0; b.points += m.ag > m.hg ? 3 : m.hg === m.ag ? 1 : 0;
    }
    for (const player of world.players.filter(p => p.ownerId && [f.home, f.away].includes(p.clubId) && p.injuredUntil <= at)) {
      if(!played.has(player.id)){player.trust=Math.max(0,player.trust-2);continue;}
      const member = memberFor(world, player.ownerId), goals = sim.events.filter(e => e.scorerId === player.id).length, assists = sim.events.filter(e => e.assistId === player.id).length;
      player.appearances++; player.goals += goals; player.assists += assists; member.goals += goals; member.xp += 10;
      awardPlayerXP(player,30+goals*15+assists*10+(winner===player.clubId?20:0));
      if (winner === player.clubId) { player.wins++; member.wins++; }
      for (const event of sim.events.filter(e => e.scorerId === player.id)) notify(world, member.id, 'player_goal', { playerId: player.id, matchId: m.id, minute: event.minute }, at);
      notify(world, member.id, 'match_result', { playerId: player.id, matchId: m.id, home: f.home, away: f.away, hg: m.hg, ag: m.ag }, at);
      player.value = Math.max(8, Math.round((player.level - 30) / 2) + Math.min(12, player.goals + Math.floor(player.wins / 2)));
      if (f.final && winner === player.clubId) { member.trophies++; notify(world, member.id, 'trophy_won', { playerId: player.id, competition: f.competition }, at); }
    }
    if (f.final) world.cups.find(c => c.id === f.competition).champion = winner;
  }
  consumePreparations(world,at,nightPlayed,preparedEffects);
  world.day = day;
  if (day === 28) {
    for (const country of ['FR', 'GB', 'ES', 'IT', 'DE']) {
      const winner = Object.values(world.tables).filter(r => clubMap.get(r.id).countryCode === country).sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.id.localeCompare(b.id))[0]?.id;
      for (const p of world.players.filter(p => p.ownerId && p.clubId === winner)) { const member = memberFor(world, p.ownerId); member.trophies++;member.competitionWins??=[];if(!member.competitionWins.includes(country))member.competitionWins.push(country); notify(world, member.id, 'trophy_won', { playerId: p.id, competition: country }, at); }
    }
    world.phase = 'finished'; world.nextMatchAt = null;
    for (const a of world.auctions.filter(a => a.status === 'open')) a.status = 'cancelled';
    for (const d of world.deals.filter(d => d.status === 'pending')) d.status = 'expired';
    for (const listing of world.listings.filter(l => l.status === 'open')) listing.status = 'expired';
    for (const n of world.needs.filter(n => n.status === 'open')) n.status = 'expired';
    for (const p of world.proposals.filter(p => p.status === 'pending')) p.status = 'cancelled';
    world.history.push({ season: world.season, startedAt:world.startsAt,at, ranks: ranking(world) });
    for (const m of world.members) notify(world, m.id, 'season_finished', { season: world.season }, at);
  } else world.nextMatchAt = nextParisKickoff(at);
}
function botStep(world, at) {
  for (const m of world.members.filter(m => m.bot || (m.auto && at - m.lastActive > 2 * DAY))) {
    const rng = random(`${world.seed}:${m.id}:${Math.floor(at / (2 * HOUR))}`), roster = clients(world, m.id);
    const lot = shuffled(world.auctions.filter(a => a.status === 'open' && a.startsAt <= at && a.closesAt > at && a.leaderId !== m.id && a.price < 30 && !clubUnavailable(world, world.players.find(p=>p.id===a.playerId).clubId,[a.playerId])), `${m.id}:${at}`)[0];
    if (lot && rng() < 0.5 && roster.length + pendingSlots(world, m.id) < clientCapacity(m) && available(world, m) > lot.price + 1 && lot.price + 1 <= world.players.find(p => p.id === lot.playerId).value * 1.4) {
      const lastActive = m.lastActive;
      placeBid(world, m, { auctionId: lot.id, amount: lot.price + 1 }, at);
      // Automation never changes the human's actual last connection timestamp.
      if (!m.bot) m.lastActive = lastActive;
    }
    for (const p of roster) {
      if (!p.training && p.level < p.potential) p.training = { finishesAt: at + 12 * HOUR };
      if (!world.proposals.some(v => v.playerId === p.id && ['pending', 'accepted'].includes(v.status) && v.week === Math.floor((at - world.startsAt) / (7 * DAY)))) {
        const need = world.needs.find(n => n.status === 'open' && n.deadline > at && n.position === p.position && n.clubId !== p.clubId && !clubUnavailable(world,n.clubId,[p.id]));
        if (need && !protectedPlayer(world, p.id) && !world.deals.some(d => d.playerId === p.id && d.status === 'pending')) propose(world, m, { playerId: p.id, needId: need.id, strategy: 'safe' }, at);
      }
      if (p.mandateEndsAt <= at + DAY && available(world, m) >= 2) { record(world, m, -2, 'renew_mandate', p.id, at); p.mandateEndsAt = at + 7 * DAY; p.trust = Math.min(100, p.trust + 10); }
    }
    if(m.bot)for (const d of world.deals.filter(d => d.sellerId === m.id && d.status === 'pending' && d.closesAt > at && d.at < at-HOUR)) respondDeal(world,m,{dealId:d.id,accept:d.price>=world.players.find(p=>p.id===d.playerId).value},at);
  }
}
function alignSeasonDeadline(world){
  const end=world.calendar?.at(-1)?.at;
  if(!Number.isFinite(end)||world.phase==='lobby')return false;
  let changed=world.endsAt!==end;world.endsAt=end;
  for(const [rows,key,status] of [[world.auctions,'closesAt','open'],[world.needs,'deadline','open'],[world.deals,'closesAt','pending'],[world.listings,'closesAt','open']]){
    for(const row of rows)if(row.status===status&&row[key]>end){row[key]=end;changed=true;}
  }
  return changed;
}
export function tickWorld(world, now) {
  let changed=ensurePlayerProfiles(world)||Boolean(world.rightsChanged);delete world.rightsChanged;
  changed=syncDailyPlay(world,now)||changed;
  for(const listing of world.listings.filter(l=>l.status==='open'&&l.closesAt<=now)){listing.status='expired';changed=true;}
  if(world.rulesRevision!==2){
    for(const m of world.members.filter(m=>m.bot))for(const p of clients(world,m.id).sort((a,b)=>b.level-a.level||a.id.localeCompare(b.id)).slice(2)){
      p.ownerId=null;p.mandateEndsAt=null;
      for(const proposal of world.proposals.filter(v=>v.playerId===p.id&&v.status==='pending'))proposal.status='cancelled';
      if(world.phase==='active'&&!world.auctions.some(a=>a.playerId===p.id&&a.status==='open'))world.auctions.push({id:randomUUID(),playerId:p.id,startsAt:now,closesAt:now+DAY,price:p.value-1,leaderId:null,replaceId:null,bids:[],status:'open'});
    }
    const occupied=new Set();
    for(const p of world.players.filter(p=>p.ownerId)){
      if(occupied.has(p.clubId)){
        const former=clubMap.get(p.clubId),free=clubs.find(c=>c.countryCode===former?.countryCode&&!occupied.has(c.id)&&!world.players.some(v=>v.ownerId&&v.id!==p.id&&v.clubId===c.id))??clubs.find(c=>!occupied.has(c.id)&&!world.players.some(v=>v.ownerId&&v.id!==p.id&&v.clubId===c.id));
        p.clubId=free.id;notify(world,p.ownerId,'club_reassigned',{playerId:p.id,clubId:free.id},now);
      }occupied.add(p.clubId);
    }
    for(const d of world.deals.filter(d=>d.status==='pending'&&d.kind==='poach'))d.status='cancelled';
    world.rulesRevision=2;changed=true;
  }
  changed=alignSeasonDeadline(world)||changed;
  if (world.phase === 'lobby' && world.autoStartAt && now >= world.autoStartAt) {startWorld(world, 'scheduler', world.autoStartAt);changed=true;}
  if (world.phase !== 'active') return changed;
  changed=syncReminders(world,now,notify)||changed;
  // Process chronologically: restarting the worker yields the same deadline outcomes.
  for (let steps = 0; steps < 1500 && world.phase === 'active'; steps++) {
    const auctionAt = Math.min(...world.auctions.filter(a => a.status === 'open').map(a => a.closesAt));
    const needsAt = Math.min(...world.needs.filter(n => n.status === 'open').map(n => n.deadline));
    const dealAt = Math.min(...world.deals.filter(d => d.status === 'pending').map(d => d.closesAt));
    const trainingAt = Math.min(...world.players.filter(p => p.training).map(p => p.training.finishesAt));
    const scoutAt = Math.min(...world.scouts.filter(s => !s.done).map(s => s.finishesAt));
    const waveAt = world.nextWave <= 12 ? world.startsAt + (Math.floor((world.nextWave - 1) / 3) * 7 + [1, 3, 5][(world.nextWave - 1) % 3]) * DAY : Infinity;
    const at = Math.min(auctionAt, needsAt, dealAt, trainingAt, scoutAt, waveAt, world.nextBotAt, world.nextMatchAt ?? Infinity);
    if (!Number.isFinite(at) || at > now || at > world.endsAt) break;
    changed=true;
    if (auctionAt === at) closeAuctions(world, at);
    if (trainingAt === at) for (const p of world.players.filter(p => p.training?.finishesAt === at)) { p.level = Math.min(p.potential, p.level + 1); p.training = null;if(p.ownerId)notify(world,p.ownerId,'training_complete',{playerId:p.id,level:p.level},at); }
    if (scoutAt === at) for (const s of world.scouts.filter(s => s.finishesAt === at)) s.done = true;
    if (dealAt === at) for (const d of world.deals.filter(d => d.status === 'pending' && d.closesAt === at)) d.status = 'expired';
    if (needsAt === at) {
      closeNeeds(world, at);
      if (at < world.endsAt - DAY) { for (const m of world.members) record(world, m, 15, 'weekly_allowance', `week:${at}`, at); makeNeeds(world, at); }
    }
    if (waveAt === at) { addLots(world, 5, at); world.nextWave++;for(const m of world.members.filter(m=>!m.bot))notify(world,m.id,'mercato_opened',{count:5},at); }
    if (world.nextMatchAt === at) playNight(world, at);
    if (world.phase !== 'active') break;
    if (world.nextBotAt === at) { botStep(world, at); world.nextBotAt += 2 * HOUR; }
    for (const p of world.players.filter(p => p.ownerId && p.mandateEndsAt <= at)) {
      const elapsed=Math.max(0,Math.floor((at-Math.max(p.lastTrustDecayAt??p.mandateEndsAt,p.mandateEndsAt))/DAY));
      if(elapsed){p.trust=Math.max(0,p.trust-elapsed*5);p.lastTrustDecayAt=at;}
    }
  }
  return syncDailyPlay(world,now)||changed;
}
export function ranking(world) {
  return world.members.map(m => ({ id: m.id, name: m.name, bot: m.bot, coins: m.coins, commissions: m.commissions, trophies: m.trophies, goals: m.goals, wins: m.wins, clients: clients(world, m.id).length,
    score: clients(world, m.id).reduce((s, p) => s + p.value, 0) + m.commissions * 2 + m.trophies * 15 + m.goals,appearance:m.appearance,competitionWins:m.competitionWins??[],
  })).sort((a, b) => b.score - a.score || b.commissions - a.commissions || a.name.localeCompare(b.name)).map((m, i) => ({ ...m, rank: i + 1, division: division(m.score) }));
}
export function publicWorld(world, accountId, now) {
  ensurePlayerProfiles(world);
  const me = memberFor(world, accountId), myReports = world.scouts.filter(s => s.memberId === me.id);
  const nextFixtures=world.phase==='active'?fixturesForDay(world,world.day+1):[],fixtureClubs=new Set(nextFixtures.flatMap(f=>[f.home,f.away]));
  const hidden = new Set(world.blocks.filter(b => b.by === accountId).map(b => b.target));
  const players = world.players.map(player => {
    const {potential,trainingBoosts,profile,experience,preparation,lastPreparation,...p}=player;
    const known=p.ownerId===accountId||myReports.some(s=>s.playerId===p.id&&s.done);
    return {...p,...publicPlayerProfile(player,known),potential:known?potential:null,preMatch:p.ownerId===accountId?publicPreparation(world,player,now,fixtureClubs.has(p.clubId)):null,cardFrame:world.members.find(m=>m.id===p.ownerId)?.appearance?.frame??null};
  });
  return { id: world.id, code: world.code, name: world.name, private:world.private!==false,autoStartAt:world.autoStartAt??null,ownerId: world.ownerId, phase: world.phase, season: world.season, startsAt: world.startsAt, endsAt: world.endsAt,rewardsCloseAt:world.phase==='lobby'?null:passEndsAt(world), nextMatchAt: world.nextMatchAt, day: world.day, serverTime: now, rules,
    me: { ...me, duelRemaining:duelRemaining(me,now),capacity:clientCapacity(me), reserved: reserved(world, me.id), available: available(world, me), roster: clients(world, me.id).map(p => p.id) }, members: ranking(world).map(m=>({...m,capacity:clientCapacity(memberFor(world,m.id))})), players,
    duels:publicDuels(world,accountId),duelStandings:world.members.map(m=>({id:m.id,points:m.duelPoints??0})).sort((a,b)=>b.points-a.points||a.id.localeCompare(b.id)),
    auctions: world.auctions.filter(a => ['open', 'sold'].includes(a.status)).slice(-80).map(({ bids, replaceId, ...a }) => ({ ...a, replaceId: a.leaderId === accountId ? replaceId : null, bidCount: bids.length })),
    unavailableClubs:clubs.filter(c=>clubUnavailable(world,c.id)).map(c=>c.id),
    needs:world.needs.map(n=>({...n,unavailable:clubUnavailable(world,n.clubId),candidates:clients(world,accountId).filter(p=>p.position===n.position&&p.clubId!==n.clubId).map(p=>({playerId:p.id,strategies:Object.entries(tactics).map(([id,choice])=>({id,commission:choice.commission,score:proposalScore(p,n,choice)}))}))})),
    proposals: world.proposals.filter(p => p.memberId === accountId), deals: world.deals.filter(d => d.buyerId === accountId || d.sellerId === accountId), listings:world.listings.filter(l=>l.status==='open'&&l.closesAt>now),
    matches: world.matches.slice(-120), nextFixtures, cups: world.cups.map(({ id, teams, champion }) => ({ id, teams, champion })), tables: world.tables,
    events: world.events.filter(e => e.memberId === accountId).slice(-100), chats: world.chats.filter(c => !hidden.has(c.memberId) && !c.hidden).slice(-100), scouts: myReports,
    blocks: [...hidden], calendar:world.calendar??[], history: world.history, clubs: clubs.map(({ id, name, countryCode, tier }) => ({ id, name, countryCode, tier,badge:clubBadge({id,name}) })), ledger: world.ledger.filter(l => l.memberId === accountId).slice(-40),
  };
}
export function assertWorld(world) {
  requireGame(new Set(world.members.map(m => m.id)).size === world.members.length, 'DUPLICATE_MEMBER', 500);
  requireGame(new Set(world.players.map(p => p.id)).size === world.players.length, 'DUPLICATE_PLAYER', 500);
  const represented=world.players.filter(p=>p.ownerId);requireGame(new Set(represented.map(p=>p.clubId)).size===represented.length,'CLUB_EXCLUSIVITY_INVARIANT',500);
  const openAuctions=world.auctions.filter(a=>a.status==='open');
  requireGame(new Set(openAuctions.map(a=>a.playerId)).size===openAuctions.length&&openAuctions.every(a=>world.players.some(p=>p.id===a.playerId&&!p.ownerId)),'AUCTION_OWNERSHIP_INVARIANT',500);
  for (const m of world.members) { requireGame(Number.isSafeInteger(m.coins) && m.coins >= reserved(world, m.id) && clients(world, m.id).length <= 3, 'ECONOMY_INVARIANT', 500); }
  const openListings=(world.listings??[]).filter(l=>l.status==='open');
  requireGame(new Set(openListings.map(l=>l.playerId)).size===openListings.length,'LISTING_INVARIANT',500);
  for(const listing of openListings)requireGame(world.players.some(p=>p.id===listing.playerId&&p.ownerId===listing.sellerId)&&Number.isSafeInteger(listing.price)&&listing.price>=1&&listing.price<=100000,'LISTING_INVARIANT',500);
  for(const player of world.players)if(player.profile){
    requireGame(Number.isSafeInteger(player.experience)&&player.experience>=0&&Object.values(player.profile.attributes).every(n=>Number.isSafeInteger(n)&&n>=1&&n<=99),'PLAYER_PROFILE_INVARIANT',500);
  }
}
