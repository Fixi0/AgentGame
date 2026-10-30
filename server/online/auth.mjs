import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { GameError, requireGame } from './world.mjs';
import { cleanMessage } from './commands.mjs';
import { DAY } from './calendar.mjs';
import {nextWorldTick} from './reminders.mjs';
const derive = promisify(scrypt);
export const tokenHash = value => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password) { const salt = randomBytes(16).toString('hex'); const key = await derive(password, salt, 64); return `${salt}:${key.toString('hex')}`; }
export async function checkPassword(password, encoded) {
  const safe=typeof encoded==='string'&&/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(encoded)?encoded:`${'0'.repeat(32)}:${'0'.repeat(128)}`;
  const [salt, key] = safe.split(':'); const actual = await derive(password, salt, 64); const expected = Buffer.from(key, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function authenticate(store, token, now) {
  requireGame(typeof token === 'string' && /^[a-f0-9]{64}$/.test(token), 'UNAUTHENTICATED', 401);
  const row = (await store.db.query('select a.id,a.username,a.name,a.locale,exists(select 1 from agentfc_online.apple_identities i where i.account_id=a.id) as apple from agentfc_online.sessions s join agentfc_online.accounts a on a.id=s.account_id where s.token_hash=$1 and s.expires_at>$2', [tokenHash(token), now])).rows[0];
  requireGame(row, 'UNAUTHENTICATED', 401);row.authProvider=row.apple?'apple':'password';delete row.apple;return row;
}
export async function createSession(db,account,now){
  const token=randomBytes(32).toString('hex');
  await db.query('insert into agentfc_online.sessions(token_hash,account_id,expires_at,created_at) values($1,$2,$3,$4)',[tokenHash(token),account.id,now+30*DAY,now]);
  return {token,account};
}
const newRecoveryCode=()=>randomBytes(24).toString('hex').match(/.{8}/g).join('-');
const recoveryHash=code=>tokenHash(code.replaceAll('-','').toLowerCase());
export async function credentials(store, mode, data, now) {
  requireGame(typeof data.username === 'string' && /^[a-z0-9_-]{3,20}$/i.test(data.username), 'INVALID_USERNAME');
  requireGame(typeof data.password === 'string' && data.password.length >= 8 && data.password.length <= 128, 'INVALID_PASSWORD');
  const username = data.username.toLowerCase();
  let account,recoveryCode;
  if (mode === 'register') {
    const name = cleanMessage(data.name || data.username); requireGame(name.length >= 2 && name.length <= 24, 'INVALID_NAME');
    const encoded = await hashPassword(data.password);recoveryCode=newRecoveryCode();
    account = { id: randomUUID(), username, name, locale: ['fr', 'en', 'es', 'it', 'ru'].includes(data.locale) ? data.locale : 'fr' };
    try { await store.db.query('insert into agentfc_online.accounts(id,username,name,locale,password_hash,created_at,recovery_hash) values($1,$2,$3,$4,$5,$6,$7)', [account.id, username, name, account.locale, encoded, now,recoveryHash(recoveryCode)]); }
    catch (error) { if (error.code === '23505') throw new GameError('USERNAME_TAKEN', 409); throw error; }
  } else {
    account = (await store.db.query('select id,username,name,locale,password_hash from agentfc_online.accounts where username=$1', [username])).rows[0];
    // Unknown handles use the same expensive hash work as existing accounts.
    const encoded = account?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`;
    const ok = await checkPassword(data.password, encoded); requireGame(account && ok, 'INVALID_CREDENTIALS', 401);
    delete account.password_hash;
  }
  account.authProvider='password';
  return {...await createSession(store.db,account,now),...(recoveryCode?{recoveryCode}:{})};
}
export async function recoverAccount(store,data,now){
  requireGame(typeof data.username==='string'&&/^[a-z0-9_-]{3,20}$/i.test(data.username),'INVALID_RECOVERY',401);
  requireGame(typeof data.recoveryCode==='string'&&/^[a-f0-9-]{48,60}$/i.test(data.recoveryCode),'INVALID_RECOVERY',401);
  requireGame(typeof data.password==='string'&&data.password.length>=8&&data.password.length<=128,'INVALID_PASSWORD');
  const encoded=await hashPassword(data.password),nextCode=newRecoveryCode();
  return store.atomic(async tx=>{
    const account=(await tx.query('select id,username,name,locale,recovery_hash from agentfc_online.accounts where username=$1 for update',[data.username.toLowerCase()])).rows[0];
    const expected=Buffer.from(account?.recovery_hash??'0'.repeat(64),'hex'),actual=Buffer.from(recoveryHash(data.recoveryCode),'hex');
    requireGame(account&&timingSafeEqual(expected,actual),'INVALID_RECOVERY',401);
    await tx.query('update agentfc_online.accounts set password_hash=$2,recovery_hash=$3 where id=$1',[account.id,encoded,recoveryHash(nextCode)]);
    await tx.query('delete from agentfc_online.sessions where account_id=$1',[account.id]);delete account.recovery_hash;account.authProvider='password';
    return {...await createSession(tx,account,now),recoveryCode:nextCode};
  });
}
export async function deleteAccount(store, account, password, now,appleSubject=null) {
 if(account.authProvider==='apple'){
  const identity=(await store.db.query('select subject from agentfc_online.apple_identities where account_id=$1',[account.id])).rows[0];
  requireGame(identity&&identity.subject===appleSubject,'APPLE_REAUTH_REQUIRED',401);
 }else{
  requireGame(typeof password === 'string' && password.length <= 128, 'INVALID_PASSWORD');
  const found = (await store.db.query('select password_hash from agentfc_online.accounts where id=$1', [account.id])).rows[0];
  requireGame(found && await checkPassword(password, found.password_hash), 'INVALID_CREDENTIALS', 401);
 }
  await store.atomic(async tx => {
    const membership = (await tx.query('select league_id from agentfc_online.memberships where account_id=$1', [account.id])).rows[0];
    if (membership) {
      const row = (await tx.query('select state from agentfc_online.leagues where id=$1 for update', [membership.league_id])).rows[0];
      const world = row.state, member = world.members.find(m => m.id === account.id), botId = `retired-${randomUUID()}`;
      if (member) { member.id = botId; member.name = 'Agency Bot'; member.bot = true; member.auto = true; member.lastActive = now; }
      if(world.phase==='lobby'){
        world.members=world.members.filter(m=>m.id!==botId);
        if(world.ownerId===account.id)world.ownerId=world.members[0]?.id??null;
        if(!world.members.length||world.private!==false&&world.members.length<2)world.autoStartAt=null;
      }
      for (const p of world.players.filter(p => p.ownerId === account.id)) p.ownerId = botId;
      for (const a of world.auctions) { if (a.leaderId === account.id) a.leaderId = botId; for (const b of a.bids) if (b.memberId === account.id) b.memberId = botId; }
      for (const d of world.deals) { if (d.buyerId === account.id) d.buyerId = botId; if (d.sellerId === account.id) d.sellerId = botId; }
      for (const listing of world.listings??[]) if(listing.sellerId===account.id){listing.sellerId=botId;if(listing.status==='open')listing.status='cancelled';}
      for (const p of world.proposals) if (p.memberId === account.id) p.memberId = botId;
      world.chats = world.chats.filter(c => c.memberId !== account.id); world.scouts = world.scouts.filter(s => s.memberId !== account.id); world.events = world.events.filter(e => e.memberId !== account.id);
      world.blocks = world.blocks.filter(b => b.by !== account.id && b.target !== account.id); world.reports = world.reports.filter(r => r.by !== account.id);
      for (const l of world.ledger.filter(l => l.memberId === account.id)) l.memberId = botId;
      for (const h of world.history) for (const r of h.ranks.filter(r => r.id === account.id)) { r.id = botId; r.name = 'Agency Bot'; r.bot = true; }
      if (world.ownerId === account.id) world.ownerId = world.members.find(m => !m.bot)?.id ?? botId;
      await tx.query('update agentfc_online.leagues set state=$2,version=version+1,updated_at=$3,next_tick_at=$4 where id=$1', [world.id, JSON.stringify(world), now,nextWorldTick(world)]);
    }
    // Retain a pseudonymous receipt owner for financial deduplication; remove credentials.
    await tx.query('delete from agentfc_online.sessions where account_id=$1', [account.id]);
    await tx.query('delete from agentfc_online.devices where account_id=$1', [account.id]);
    await tx.query('delete from agentfc_online.memberships where account_id=$1', [account.id]);
    await tx.query('delete from agentfc_online.commands where account_id=$1', [account.id]);
    await tx.query('delete from agentfc_online.ad_intents where account_id=$1', [account.id]);
    await tx.query('delete from agentfc_online.support_tickets where account_id=$1',[account.id]);
    const apple=(await tx.query('select refresh_token from agentfc_online.apple_identities where account_id=$1',[account.id])).rows[0];
    if(apple)await tx.query('insert into agentfc_online.apple_revocations(id,refresh_token,created_at) values($1,$2,$3)',[randomUUID(),apple.refresh_token,now]);
    await tx.query('delete from agentfc_online.apple_identities where account_id=$1',[account.id]);
    await tx.query("update agentfc_online.accounts set username=$2,name='Deleted account',password_hash='',recovery_hash=null,wallet='{}',locale='fr' where id=$1", [account.id, `deleted-${randomUUID()}`]);
  });
}
