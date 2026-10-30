import { randomUUID, createHash } from 'node:crypto';
import { DAY, HOUR } from './calendar.mjs';
import { cosmetics, tactics, thirdClientCost } from './catalog.mjs';
import { creditGems } from './economy.mjs';
import { GameError, requireGame, integer, clients, clientCapacity, memberFor, createWorld, addMember, startWorld, tickWorld, publicWorld, assertWorld, placeBid, propose, offerDeal, respondDeal, listClient, withdrawListing, releaseClient, available, record, notify, ranking,adjustPassCoins } from './world.mjs';
import {syncSeasonPass,publicSeasonPass,recordPassActivity,claimPass,skipPassTier,preparePassPurchase,applyPassCredit,agencyAppearance,botAppearance,setAgencyBadge,equipPassCosmetic,parisDate,passEndsAt} from './season-pass.mjs';
import {STICKER_PACKS} from './pass-catalog.mjs';
import {encodeRevision} from './state-revision.mjs';
import {nextWorldTick} from './reminders.mjs';

const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export async function loadWorld(tx, id,now=Date.now()) {
  const row = (await tx.query('select state,version,next_tick_at from agentfc_online.leagues where id=$1 for update', [id])).rows[0];
  requireGame(row, 'LEAGUE_NOT_FOUND', 404);
  const world=row.state;
  world.version=Number(row.version);
  if(Number(row.next_tick_at)===0&&row.next_tick_at!==null)world.rightsChanged=true;
  const owners=(await tx.query('select id,wallet from agentfc_online.accounts where id=any($1::text[])',[world.members.filter(m=>!m.bot).map(m=>m.id)])).rows;
  for(const m of world.members){
    const appearance=m.bot?botAppearance(m.id):agencyAppearance(owners.find(a=>a.id===m.id)?.wallet??{},m.id,world,now);
    if(JSON.stringify(appearance)!==JSON.stringify(m.appearance)){m.appearance=appearance;world.rightsChanged=true;}
    const entitled=Boolean(owners.find(a=>a.id===m.id)?.wallet.thirdClientSlot);
    if(Boolean(m.thirdClientSlot)!==entitled){m.thirdClientSlot=entitled;world.rightsChanged=true;}
    const roster=clients(world,m.id),limit=clientCapacity(m);let slots=Math.max(0,limit-roster.length);
    const reservations=[...world.auctions.filter(a=>a.status==='open'&&a.leaderId===m.id),...world.deals.filter(d=>d.status==='pending'&&d.buyerId===m.id)].sort((a,b)=>(a.at??a.startsAt)-(b.at??b.startsAt));
    for(const r of reservations){if(roster.length<=limit&&(r.replaceId||slots-->0))continue;
      if('leaderId'in r){r.leaderId=null;r.replaceId=null;r.price=world.players.find(p=>p.id===r.playerId).value-1;}else r.status='cancelled';world.rightsChanged=true;
    }
  }
  return world;
}
export async function saveWorld(tx, world, now) {
  assertWorld(world); world.version++;
  await tx.query('update agentfc_online.leagues set state=$2,version=$3,updated_at=$4,next_tick_at=$5 where id=$1', [world.id, JSON.stringify(world), world.version, now,nextWorldTick(world)]);
}
async function myWorld(tx, accountId,now) {
  const row = (await tx.query('select league_id from agentfc_online.memberships where account_id=$1', [accountId])).rows[0];
  return row ? loadWorld(tx, row.league_id,now) : null;
}
export function synchronizeWallet(wallet, world, accountId, now) {
  if (!wallet.cycleEndsAt || wallet.cycleEndsAt <= now) { wallet.cycleEndsAt = now + 56 * DAY; wallet.xp = 0; wallet.claimed = []; }
  if (world) {
    const key = `${world.id}:${world.season}`, xp = memberFor(world, accountId).xp;
    wallet.seasonXp ??= {};
    wallet.xp += Math.max(0, xp - (wallet.seasonXp[key] ?? 0)); wallet.seasonXp[key] = xp;
  }
  wallet.gems ??= 0; wallet.cosmetics ??= []; wallet.claimed ??= [];
  return wallet;
}
export function publicWallet(wallet, now,world,accountId) { return { thirdClientSlotCost:thirdClientCost,thirdClientSlot:Boolean(wallet.thirdClientSlot),gems: wallet.gems, publicRanking:Boolean(wallet.publicRanking), noAds: Boolean(wallet.noAds), credits: wallet.credits ?? { training:0,scouting:0 }, cosmetics: wallet.cosmetics, selectedCosmetic: wallet.selectedCosmetic ?? null, xp: wallet.xp, claimed: wallet.claimed, cycleEndsAt: wallet.cycleEndsAt, paidUntil: wallet.paidUntil ?? 0, premium: world?agencyAppearance(wallet,accountId,world,now).premium:false,appearance:agencyAppearance(wallet,accountId,world,now),preferences: wallet.preferences }; }
const ownPlayer = (world, member, id) => { const p = world.players.find(p => p.id === id && p.ownerId === member.id); requireGame(p, 'INVALID_CLIENT'); return p; };
function payGems(wallet, amount) { integer(amount, 1, 1000); requireGame(!(wallet.debt>0),'PURCHASE_REVIEW_REQUIRED');requireGame(wallet.gems >= amount, 'INSUFFICIENT_GEMS'); wallet.gems -= amount; }
export function shopOffers(account, world, now) {
  const offers = [];
  const starterEnds = Number(account.created_at) + 7 * DAY;
  if (starterEnds > now) offers.push({ id:'starter',price:8,training:4,scouting:0,endsAt:starterEnds });
  const day = new Date(now).getUTCDay();
  if ([5,6,0].includes(day)) offers.push({ id:'weekend',price:4,training:0,scouting:3,endsAt:Math.floor(now/DAY)*DAY + (day===0?1:8-day)*DAY });
  const deadline = world?.needs.find(n=>n.status==='open')?.deadline;
  if (world?.phase==='active' && deadline>now && deadline-now<=DAY) offers.push({ id:'deadline',price:6,training:2,scouting:1,endsAt:deadline });
  return offers;
}
const badWords = /(?<![\p{L}\p{N}_])(?:putain|connard|salope|encul[ée]|fuck|shit|bitch|nigger|nigga|сука|блядь|пизд\p{L}*|cazzo|vaffanculo|mierda|puta)(?![\p{L}\p{N}_])/iu;
export function cleanMessage(value) {
  requireGame(typeof value === 'string', 'INVALID_MESSAGE');
  const text = value.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, ' ').trim();
  requireGame(text.length >= 1 && text.length <= 300 && !/(https?:\/\/|www\.|<[^>]+>)/i.test(text) && !badWords.test(text), 'CHAT_FILTERED'); return text;
}
export async function snapshot(store, account, now) {
  return store.atomic(async tx => {
    const current = (await tx.query('select wallet,created_at,state_version from agentfc_online.accounts where id=$1 for update', [account.id])).rows[0]; requireGame(current, 'UNAUTHENTICATED', 401);
    const oldWallet=JSON.stringify(current.wallet);
    const world = await myWorld(tx, account.id,now);let changed=false;
    if (world) { changed=tickWorld(world, now);const member=memberFor(world,account.id);if(now-member.lastActive>HOUR){member.lastActive=now;changed=true;} }
    const wallet = synchronizeWallet(current.wallet, world, account.id, now);
    if(world){changed=syncSeasonPass(wallet,world,account.id,now,ranking(world).find(m=>m.id===account.id).rank)||changed;memberFor(world,account.id).appearance=agencyAppearance(wallet,account.id,world,now);if(changed)await saveWorld(tx,world,now);}
    wallet.nextInterstitialAt??=Number(current.created_at)+7*DAY;
    const encodedWallet=JSON.stringify(wallet),walletChanged=oldWallet!==encodedWallet;
    if(walletChanged)await tx.query('update agentfc_online.accounts set wallet=$2 where id=$1', [account.id,encodedWallet]);
    const stateRevision=encodeRevision(account.id,Number(current.state_version)+(walletChanged?1:0),world?.id,world?.version,now);
    return { stateRevision,account: { id: account.id, name: account.name, username: account.username, locale: account.locale,authProvider:account.authProvider??'password',needsAgencyName:wallet.profileReady===false }, wallet: publicWallet(wallet, now,world,account.id),seasonPass:world?publicSeasonPass(wallet,world,account.id,now):null, interstitialDue:Boolean(world?.phase==='active'&&world.day>=7&&!wallet.noAds&&wallet.nextInterstitialAt<=now),shopOffers:shopOffers(current,world,now), world: world ? publicWorld(world, account.id, now) : null, serverTime: now };
  });
}
export async function command(store, account, action, data, requestId, now) {
  requireGame(validUuid(requestId) && typeof action === 'string' && data && typeof data === 'object' && !Array.isArray(data), 'INVALID_COMMAND');
  return store.atomic(async tx => {
    const signature = fingerprint({ action, data });
    const previous = (await tx.query('select fingerprint,result from agentfc_online.commands where account_id=$1 and request_id=$2', [account.id, requestId])).rows[0];
    if (previous) { requireGame(previous.fingerprint === signature, 'IDEMPOTENCY_CONFLICT', 409); return previous.result; }
    const current = (await tx.query('select wallet,created_at from agentfc_online.accounts where id=$1 for update', [account.id])).rows[0]; requireGame(current, 'UNAUTHENTICATED', 401);
    let world = await myWorld(tx, account.id,now); if (world) tickWorld(world, now);
    const wallet = synchronizeWallet(current.wallet, world, account.id, now);
    if(['create_league','quick_match','join_public_league','join_league'].includes(action))requireGame(wallet.profileReady!==false,'PROFILE_INCOMPLETE');
    if(world)syncSeasonPass(wallet,world,account.id,now,ranking(world).find(m=>m.id===account.id).rank);
    let result = {};
    if (action === 'create_league') {
      requireGame(!world, 'ALREADY_IN_LEAGUE');
      world = createWorld(account, cleanMessage(data.name), now,data.visibility??'private');
      await tx.query('insert into agentfc_online.leagues(id,code,state,updated_at) values($1,$2,$3,$4)', [world.id, world.code, JSON.stringify(world), now]);
      await tx.query('insert into agentfc_online.memberships(account_id,league_id) values($1,$2)', [account.id, world.id]); result = { code: world.code };
    } else if(action==='quick_match'||action==='join_public_league'){
      requireGame(!world,'ALREADY_IN_LEAGUE');
      if(action==='join_public_league')requireGame(validUuid(data.leagueId),'LEAGUE_NOT_FOUND',404);
      const rows=(await tx.query("select id from agentfc_online.leagues where state->>'phase'='lobby' and state->>'private'='false' and jsonb_array_length(state->'members')<10 and (state->>'autoStartAt')::bigint>$1 order by jsonb_array_length(state->'members') desc,updated_at asc limit 20",[now])).rows;
      const chosen=action==='join_public_league'?rows.find(r=>r.id===data.leagueId):rows[0];
      if(action==='join_public_league')requireGame(chosen,'LEAGUE_NOT_FOUND',404);
      if(chosen){world=await loadWorld(tx,chosen.id,now);addMember(world,account,now);}
      else {const suffix=randomUUID().slice(0,4).toUpperCase(),prefix={fr:'Ligue',en:'League',es:'Liga',it:'Lega',ru:'Лига'}[account.locale]??'League';world=createWorld(account,`${prefix} ${suffix}`,now,'public');await tx.query('insert into agentfc_online.leagues(id,code,state,updated_at) values($1,$2,$3,$4)',[world.id,world.code,JSON.stringify(world),now]);}
      await tx.query('insert into agentfc_online.memberships(account_id,league_id) values($1,$2)',[account.id,world.id]);result={leagueId:world.id};
    } else if (action === 'join_league') {
      requireGame(!world, 'ALREADY_IN_LEAGUE');
      requireGame(typeof data.code === 'string' && /^[a-f0-9]{8}$/i.test(data.code), 'INVALID_CODE');
      const row = (await tx.query('select id from agentfc_online.leagues where code=$1', [data.code.toUpperCase()])).rows[0]; requireGame(row, 'INVALID_CODE');
      world = await loadWorld(tx, row.id,now); tickWorld(world, now); addMember(world, account, now);
      await tx.query('insert into agentfc_online.memberships(account_id,league_id) values($1,$2)', [account.id, world.id]);
    } else if (action === 'leave_lobby') {
      requireGame(world?.phase === 'lobby', 'LEAGUE_STARTED'); world.members = world.members.filter(m => m.id !== account.id);
      if (world.ownerId === account.id) world.ownerId = world.members[0]?.id ?? null;
      if (world.members.length < 2&&world.private!==false) world.autoStartAt = null;
      if(world.members.length===0)world.autoStartAt=null;
      await tx.query('delete from agentfc_online.memberships where account_id=$1', [account.id]);
    } else if(action==='rename_agency'){
      const name=cleanMessage(data.name);requireGame(name.length>=2&&name.length<=24,'INVALID_NAME');
      wallet.profileReady=true;
      await tx.query('update agentfc_online.accounts set name=$2 where id=$1',[account.id,name]);
      if(world)memberFor(world,account.id).name=name;
    } else if (action === 'support_ticket') {
      requireGame(typeof data.message==='string','INVALID_MESSAGE');const message=data.message.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu,' ').trim();requireGame(message.length>=10&&message.length<=1000,'INVALID_MESSAGE');
      const count=Number((await tx.query('select count(*) n from agentfc_online.support_tickets where account_id=$1 and created_at>$2',[account.id,now-DAY])).rows[0].n);requireGame(count<5,'RATE_LIMIT',429);
      const id=randomUUID();await tx.query('insert into agentfc_online.support_tickets(id,account_id,message,created_at) values($1,$2,$3,$4)',[id,account.id,message,now]);result={id};
    } else if (action === 'reserve_interstitial') {
      const due=world?.phase==='active'&&world.day>=7&&!wallet.noAds&&(wallet.nextInterstitialAt??Number(current.created_at)+7*DAY)<=now;
      result={show:Boolean(due)};if(due)wallet.nextInterstitialAt=now+7*DAY;
    } else if (action === 'claim_pass') {
      result=claimPass(wallet,world,account.id,data,now,(amount,reference,at)=>adjustPassCoins(world,memberFor(world,account.id),amount,reference,at));
    } else if(action==='prepare_pass_purchase'){
      result=preparePassPurchase(wallet,world,data.productId,now);
    } else if(action==='apply_pass_credit'){
      applyPassCredit(wallet,world,data.transactionId,now);
    } else if(action==='skip_pass_tier'){
      result=skipPassTier(wallet,world,now);
    } else if(action==='set_agency_badge'){
      setAgencyBadge(wallet,account.id,data.badge);
    } else if(action==='equip_pass_cosmetic'){
      equipPassCosmetic(wallet,data.cosmeticId);
    } else if(action==='view_results'){
      requireGame(world&&world.matches.some(m=>m.id===data.matchId&&parisDate(m.at)===parisDate(now)),'RESULT_NOT_AVAILABLE');
    } else if (action === 'unlock_third_client') {
      requireGame(!wallet.thirdClientSlot,'ALREADY_OWNED');
      payGems(wallet,thirdClientCost);wallet.thirdClientSlot=true;
      if(world)memberFor(world,account.id).thirdClientSlot=true;
      result={capacity:3,cost:thirdClientCost};
    } else if (action === 'buy_offer') {
      const offer=shopOffers(current,world,now).find(o=>o.id===data.offerId);requireGame(offer,'OFFER_EXPIRED');payGems(wallet,offer.price);
      wallet.credits??={training:0,scouting:0};wallet.credits.training+=offer.training;wallet.credits.scouting+=offer.scouting;
    } else if (action === 'buy_cosmetic') {
      requireGame(Object.hasOwn(cosmetics, data.cosmeticId), 'INVALID_COSMETIC'); requireGame(!wallet.cosmetics.includes(data.cosmeticId), 'ALREADY_OWNED');
      payGems(wallet, cosmetics[data.cosmeticId]); wallet.cosmetics.push(data.cosmeticId); wallet.selectedCosmetic = data.cosmeticId;
    } else if (action === 'equip_cosmetic') {
      requireGame(data.cosmeticId === null || wallet.cosmetics.includes(data.cosmeticId), 'NOT_OWNED'); wallet.selectedCosmetic = data.cosmeticId;
    } else if (action === 'preferences') {
      const old = wallet.preferences ?? {};
      for (const key of ['offers', 'matches', 'goals', 'chat','warmup','mercato','training']) { if (typeof data[key] === 'boolean') old[key] = data[key]; }
      wallet.preferences = old;
      if(typeof data.publicRanking==='boolean')wallet.publicRanking=data.publicRanking;
      if(['fr','en','es','it','ru'].includes(data.locale)){
        await tx.query('update agentfc_online.accounts set locale=$2 where id=$1',[account.id,data.locale]);
        await tx.query('update agentfc_online.devices set locale=$2 where account_id=$1',[account.id,data.locale]);
      }
    } else {
      requireGame(world, 'NOT_IN_LEAGUE');
      const member = memberFor(world, account.id); member.lastActive = now;
      if (action === 'start_league') startWorld(world, member.id, now);
      else if (action === 'chat_send'||action==='chat_sticker') {
        const sticker=action==='chat_sticker'?{packId:data.packId,key:data.key}:null;
        if(sticker)requireGame(wallet.cosmetics.includes(sticker.packId)&&Object.hasOwn(STICKER_PACKS,sticker.packId)&&STICKER_PACKS[sticker.packId].includes(sticker.key),'STICKER_NOT_OWNED');
        const text = sticker?'':cleanMessage(data.text), recent = world.chats.filter(c => c.memberId === member.id && c.at > now - 60_000);
        requireGame(recent.length < 10 && (!recent.length || recent.at(-1).at <= now - 2000), 'CHAT_RATE_LIMIT', 429);
        const chat = { id: randomUUID(), memberId: member.id, name: member.name, text, at: now, hidden: false,...(sticker?{sticker}:{}) };
        recordPassActivity(world,member.id,'chat',now);
        world.chats.push(chat); if (world.chats.length > 500) world.chats.splice(0, world.chats.length - 500); result = { messageId: chat.id };
        for (const other of world.members.filter(m => !m.bot && m.id !== member.id && !world.blocks.some(b => b.by === m.id && b.target === member.id))) notify(world, other.id, 'chat_message', { messageId: chat.id, name: member.name,senderId:member.id }, now);
      } else if (action === 'block_member') {
        requireGame(data.memberId !== member.id && world.members.some(m => m.id === data.memberId), 'INVALID_MEMBER');
        world.blocks = world.blocks.filter(b => !(b.by === member.id && b.target === data.memberId));
        if (data.block !== false) world.blocks.push({ by: member.id, target: data.memberId });
      } else if (action === 'report_message') {
        const chat = world.chats.find(c => c.id === data.messageId); requireGame(chat && chat.memberId !== member.id, 'INVALID_MESSAGE');
        requireGame(!world.reports.some(r => r.messageId === chat.id && r.by === member.id), 'ALREADY_REPORTED');
        world.reports.push({ id: randomUUID(), messageId: chat.id, by: member.id, reason: cleanMessage(data.reason || 'inappropriate'), at: now, status: 'pending' });
        if (new Set(world.reports.filter(r => r.messageId === chat.id).map(r => r.by)).size >= 2) chat.hidden = true;
      } else if (action === 'auto_policy') { requireGame(typeof data.enabled === 'boolean', 'INVALID_COMMAND'); member.auto = data.enabled; }
      else if (action === 'next_season') {
        requireGame(world.phase === 'finished' && world.ownerId === member.id, 'SEASON_NOT_FINISHED');
        requireGame(now>=passEndsAt(world),'SEASON_REWARDS_OPEN');
        const fresh = createWorld(account, world.name, now);
        fresh.id = world.id; fresh.code = world.code; fresh.season = world.season + 1; fresh.history = world.history.slice(-12); fresh.chats = world.chats; fresh.blocks = world.blocks; fresh.reports = world.reports;
        fresh.members = world.members.filter(m => !m.bot).map(m => ({ ...m, coins: 60, commissions: 0, trophies: 0, goals: 0, wins: 0, xp: 0,passActivity:{days:{},weeks:{}},passCoinDebt:0 }));
        world = fresh; if (world.members.length >= 2) startWorld(world, member.id, now);
      } else {
        requireGame(world.phase === 'active', 'SEASON_CLOSED');
        if (action === 'bid') placeBid(world, member, data, now);
        else if (action === 'propose') result = { proposal: propose(world, member, data, now) };
        else if (action === 'offer_deal') result = { deal: offerDeal(world, member, data, now) };
        else if (action === 'respond_deal') respondDeal(world, member, data, now);
        else if (action === 'list_client') result={listing:listClient(world,member,data,now)};
        else if (action === 'withdraw_listing') withdrawListing(world,member,data);
        else if (action === 'release_client') result={auction:releaseClient(world,member,data,now)};
        else if (action === 'train') {
          const p = ownPlayer(world, member, data.playerId); requireGame(p.level < p.potential, 'POTENTIAL_REACHED');
          if (data.instant) { if(data.useCredit){requireGame(wallet.credits?.training>0,'NO_CREDIT');wallet.credits.training--;}else payGems(wallet, 3); p.level++; p.training = null; p.trainingBoosts++; }
          else { requireGame(!p.training, 'TRAINING_ACTIVE'); p.training = { finishesAt: now + 12 * HOUR }; }
        } else if (action === 'scout') {
          requireGame(world.players.some(p => p.id === data.playerId), 'INVALID_CLIENT');
          let report = world.scouts.find(s => s.memberId === member.id && s.playerId === data.playerId);
          requireGame(!report?.done, 'ALREADY_SCOUTED');
          if (data.instant) {if(data.useCredit){requireGame(wallet.credits?.scouting>0,'NO_CREDIT');wallet.credits.scouting--;}else payGems(wallet, 2);} else requireGame(!world.scouts.some(s => s.memberId === member.id && !s.done), 'SCOUTING_ACTIVE');
          if (!report) { report = { id: randomUUID(), memberId: member.id, playerId: data.playerId }; world.scouts.push(report); }
          report.finishesAt = now + (data.instant ? 0 : 6 * HOUR); report.done = Boolean(data.instant);
        } else if (action === 'boost_proposal') {
          const p = world.proposals.find(p => p.id === data.proposalId && p.memberId === member.id && p.status === 'pending');
          requireGame(p && world.needs.some(n => n.id === p.needId && n.deadline > now && n.status === 'open'), 'INVALID_PROPOSAL');
          payGems(wallet, 2); p.boost += 5;
        } else if (action === 'contact_client') {
          const p = ownPlayer(world, member, data.playerId); requireGame(!p.lastContactAt || p.lastContactAt <= now - DAY, 'CONTACT_COOLDOWN');
          p.trust = Math.min(100, p.trust + 10); p.lastContactAt = now; member.xp += 5;
        } else if (action === 'renew_mandate') {
          const p = ownPlayer(world, member, data.playerId); requireGame(p.mandateEndsAt <= now + 2 * DAY, 'MANDATE_NOT_DUE');
          requireGame(available(world, member) >= 2, 'INSUFFICIENT_COINS'); record(world, member, -2, 'renew_mandate', p.id, now);
          p.mandateEndsAt = now + 7 * DAY; p.protectedUntil = now + 2 * DAY; p.trust = Math.min(100, p.trust + 10);
        } else throw new GameError('UNKNOWN_COMMAND');
      }
    }
    if (world) {
      const kind=['bid','propose','offer_deal'].includes(action)?'market':action==='train'?'train':action==='view_results'?'results':null;
      if(kind)recordPassActivity(world,account.id,kind,now);
      if(world.members.some(m=>m.id===account.id)){syncSeasonPass(wallet,world,account.id,now,ranking(world).find(m=>m.id===account.id).rank);memberFor(world,account.id).appearance=agencyAppearance(wallet,account.id,world,now);}
      await saveWorld(tx, world, now);
    }
    synchronizeWallet(wallet, world && world.members.some(m => m.id === account.id) ? world : null, account.id, now);
    await tx.query('update agentfc_online.accounts set wallet=$2 where id=$1', [account.id, JSON.stringify(wallet)]);
    await tx.query('insert into agentfc_online.commands(account_id,request_id,fingerprint,result,created_at) values($1,$2,$3,$4,$5)', [account.id, requestId, signature, JSON.stringify(result), now]);
    return result;
  });
}
export async function runScheduler(store, now) {
  return store.atomic(async tx => {
    const rows = (await tx.query('select id from agentfc_online.leagues where next_tick_at<=$1',[now])).rows;
    for (const row of rows) { const w = await loadWorld(tx, row.id,now); if(tickWorld(w, now))await saveWorld(tx, w, now); }
    await tx.query('delete from agentfc_online.sessions where expires_at < $1', [now]);
    await tx.query('delete from agentfc_online.apple_challenges where expires_at < $1',[now]);
    await tx.query('delete from agentfc_online.commands where created_at < $1', [now - 90 * DAY]);
  });
}
export async function discoverLeagues(store,now){
 const rows=(await store.db.query("select id,state->>'name' as name,jsonb_array_length(state->'members') as members,(state->>'autoStartAt')::bigint as starts_at from agentfc_online.leagues where state->>'phase'='lobby' and state->>'private'='false' and jsonb_array_length(state->'members') between 1 and 9 and (state->>'autoStartAt')::bigint>$1 order by jsonb_array_length(state->'members') desc,updated_at asc limit 20",[now])).rows;
 return {leagues:rows.map(row=>({id:row.id,name:row.name,members:Number(row.members),capacity:10,startsAt:Number(row.starts_at)})),serverTime:now};
}
