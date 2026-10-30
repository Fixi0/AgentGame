import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { openStore, defaultDataDir } from './store.mjs';
import { authenticate, credentials, tokenHash, deleteAccount,recoverAccount } from './auth.mjs';
import { snapshot, command, runScheduler,discoverLeagues } from './commands.mjs';
import {createAppleAuth} from './apple-auth.mjs';
import {requireDeploymentConfig} from './production-config.mjs';
import {stateRevision} from './state-revision.mjs';
import {clientAddress} from './client-address.mjs';
import { GameError, requireGame } from './world.mjs';
import { HOUR } from './calendar.mjs';
import { leaderboard,settleGlobalAwards } from './leaderboard.mjs';

const prefix = '/api/online';
export async function createOnlineServer({ directory = defaultDataDir, now = () => Date.now(), store: providedStore, commerce, push,appleAuth } = {}) {
  const store = providedStore ?? await openStore(directory), limits = new Map();
  const apple=appleAuth??createAppleAuth();
  const rateLimit = (key, count, window) => {
    const at = Date.now(), state = limits.get(key);
    if (!state || state.expires <= at) limits.set(key, { count: 1, expires: at + window });
    else { requireGame(state.count < count, 'RATE_LIMIT', 429); state.count++; }
    if (limits.size > 5000) for (const [k, v] of limits) if (v.expires < at) limits.delete(k);
  };
  async function jsonBody(req) {
    requireGame(req.headers['content-type']?.split(';')[0] === 'application/json', 'JSON_REQUIRED', 415);
    let bytes = 0, text = '';
    for await (const chunk of req) { bytes += chunk.length; requireGame(bytes <= 32768, 'BODY_TOO_LARGE', 413); text += chunk; }
    try { return JSON.parse(text); } catch { throw new GameError('INVALID_JSON'); }
  }
  const server = createServer(async (req, res) => {
    const started=performance.now();
    if(process.env.AGENTFC_LOG_HTTP==='true')res.once('finish',()=>{const route=new URL(req.url,'http://localhost').pathname;console.log(JSON.stringify({event:'http_request',method:req.method,route:/^\/api\/online\/[a-z/-]{1,50}$/.test(route)?route:'other',status:res.statusCode,durationMs:Math.round(performance.now()-started)}));});
    const respond = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); res.end(JSON.stringify(value)); };
    try {
      const url = new URL(req.url, 'http://localhost'), route = url.pathname;
      requireGame(route.startsWith(prefix + '/'), 'NOT_FOUND', 404);
      // Authenticated browser requests are same-origin via Vite's proxy. Native origin is explicit.
      const origin = req.headers.origin;
      const allowed = new Set((process.env.AGENTFC_ALLOWED_ORIGINS || 'http://127.0.0.1:4174,http://localhost:4174,http://127.0.0.1:4175,http://localhost:4175,capacitor://localhost').split(','));
      if (origin) { requireGame(allowed.has(origin), 'ORIGIN_FORBIDDEN', 403); res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin');res.setHeader('Access-Control-Expose-Headers','ETag,X-AgentFC-Time'); }
      if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Headers': 'Authorization,Content-Type,If-None-Match', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); res.end(); return; }
      if (route === prefix + '/health' && req.method === 'GET') { await store.db.query('select 1');respond(200, { ok: true, mode: store.kind==='postgres'?'managed-postgres':'local-server', deploymentStage:process.env.NODE_ENV==='production'?(process.env.AGENTFC_DEPLOY_STAGE??'production'):'local', serverTime: now(), pushConfigured: Boolean(push?.configured), commerceConfigured: Boolean(commerce?.configured),appleConfigured:apple.configured }); return; }
      if (route === prefix + '/ads/ssv' && req.method === 'GET') { requireGame(commerce?.acceptAd, 'NOT_CONFIGURED', 503); await commerce.acceptAd(store, url, now()); respond(200, { ok: true }); return; }
      if (route === prefix + '/apple/notifications' && req.method === 'POST') { requireGame(commerce?.acceptNotification, 'NOT_CONFIGURED', 503); respond(200, await commerce.acceptNotification(store, await jsonBody(req), now())); return; }
      const ip = clientAddress(req); rateLimit(`ip:${ip}`, 400, 60_000);
      if(route===prefix+'/auth/capabilities'&&req.method==='GET'){respond(200,{apple:apple.configured,classic:true,recovery:true});return;}
      if(route===prefix+'/auth/apple/challenge'&&req.method==='POST'){rateLimit(`auth:${ip}`,20,5*60_000);await jsonBody(req);respond(200,await apple.challenge(store,now()));return;}
      if(route===prefix+'/auth/apple'&&req.method==='POST'){rateLimit(`auth:${ip}`,20,5*60_000);respond(200,await apple.signIn(store,await jsonBody(req),now()));return;}
      if(route===prefix+'/auth/apple/notifications'&&req.method==='POST'){respond(200,await apple.acceptNotification(store,await jsonBody(req),now()));return;}
      if(route===prefix+'/recover'&&req.method==='POST'){rateLimit(`recovery:${ip}`,5,15*60_000);respond(200,await recoverAccount(store,await jsonBody(req),now()));return;}
      if ((route === prefix + '/register' || route === prefix + '/login') && req.method === 'POST') {
        rateLimit(`auth:${ip}`, 20, 5 * 60_000);
        const data = await jsonBody(req); respond(200, await credentials(store, route.endsWith('/register') ? 'register' : 'login', data, now())); return;
      }
      const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
      const account = await authenticate(store, token, now()); rateLimit(`account:${account.id}`, 180, 60_000);
      if (route === prefix + '/state' && req.method === 'GET') {
        const at=now(),revision=req.headers['if-none-match'];
        if(revision&&revision===await stateRevision(store.db,account.id,at)){res.setHeader('ETag',revision);res.setHeader('X-AgentFC-Time',String(at));respond(304,null);}
        else{const data=await snapshot(store,account,at);res.setHeader('ETag',data.stateRevision);respond(200,{...data,capabilities:{push:Boolean(push?.configured),ads:process.env.AGENTFC_ADMOB_SSV_ENABLED==='true',commerce:Boolean(commerce?.configured),apple:apple.configured}});}
      }
      else if(route===prefix+'/leagues'&&req.method==='GET')respond(200,await discoverLeagues(store,now()));
      else if(route===prefix+'/leaderboard'&&req.method==='GET')respond(200,await leaderboard(store,now(),{accountId:account.id,scope:url.searchParams.get('scope')??'world',country:url.searchParams.get('country'),region:url.searchParams.get('region'),page:url.searchParams.get('page')??0}));
      else if(route===prefix+'/support'&&req.method==='GET')respond(200,{tickets:(await store.db.query('select id,message,created_at,status,response from agentfc_online.support_tickets where account_id=$1 order by created_at desc limit 20',[account.id])).rows});
      else if (route === prefix + '/command' && req.method === 'POST') {
        const data = await jsonBody(req); respond(200, { ok: true, result: await command(store, account, data.action, data.data ?? {}, data.requestId, now()) });
      } else if (route === prefix + '/logout' && req.method === 'POST') { const data=await jsonBody(req);await store.db.query('delete from agentfc_online.sessions where token_hash=$1', [tokenHash(token)]);if(typeof data.deviceToken==='string')await store.db.query('delete from agentfc_online.devices where account_id=$1 and token=$2',[account.id,data.deviceToken]);respond(200, { ok: true }); }
      else if (route === prefix + '/delete-account' && req.method === 'POST') { const data = await jsonBody(req),subject=account.authProvider==='apple'?await apple.reauthenticate(store,account,data.apple??{},now()):null;await deleteAccount(store, account, data.password, now(),subject);void apple.flushRevocations(store,now()).catch(()=>{});respond(200, { ok: true }); }
      else if (route === prefix + '/devices' && req.method === 'POST') {
        const data = await jsonBody(req); requireGame(typeof data.token === 'string' && /^[a-f0-9]{64,256}$/i.test(data.token), 'INVALID_DEVICE');
        requireGame(['sandbox', 'production'].includes(data.environment), 'INVALID_DEVICE');
        // One installation belongs to the last account that explicitly registered it.
        await store.atomic(async tx => {
          await tx.query('delete from agentfc_online.devices where token=$1', [data.token]);
          await tx.query('insert into agentfc_online.devices(account_id,token,environment,locale) values($1,$2,$3,$4)', [account.id, data.token, data.environment, account.locale]);
        }); respond(200, { ok: true, enabled: Boolean(push?.configured) });
      } else if (route === prefix + '/purchase' && req.method === 'POST') {
        requireGame(commerce?.acceptPurchase, 'COMMERCE_NOT_CONFIGURED', 503);
        const data = await jsonBody(req); respond(200, await commerce.acceptPurchase(store, account, data, now()));
      } else if (route === prefix + '/ad-intent' && req.method === 'POST') {
        requireGame(commerce?.createAdIntent, 'COMMERCE_NOT_CONFIGURED', 503); respond(200, await commerce.createAdIntent(store, account, now()));
      } else throw new GameError('NOT_FOUND', 404);
    } catch (error) { if (!(error instanceof GameError)) console.error('[AgentFC API]', error.message); respond(error.status ?? 500, { error: error.code ?? 'SERVER_ERROR' }); }
  });
  let ticking = false;
  const scheduler = async () => {
    if (ticking) return; ticking = true;
    try { await runScheduler(store, now()); await settleGlobalAwards(store,now()); await apple.flushRevocations(store,now());if (push?.configured) await push.flush(store, now()); } catch (error) { console.error('[AgentFC scheduler]', error.message); } finally { ticking = false; }
  };
  const timer = setInterval(scheduler, 30_000); timer.unref();
  return { server, store, scheduler, close: async () => { clearInterval(timer); await new Promise(resolve => server.close(resolve)); if (!providedStore) await store.close(); } };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if(process.env.NODE_ENV==='production')requireDeploymentConfig();
  const directory = process.env.AGENTFC_DATA_DIR || defaultDataDir;
  const clock = async () => { try { return Number(JSON.parse(await readFile(path.join(directory, 'clock.json'), 'utf8')).offset) || 0; } catch { return 0; } };
  let offset = process.env.AGENTFC_DATABASE_URL?0:await clock();
  // Clock adjustment is a local developer file, never a remotely callable API.
  const clockTimer = process.env.AGENTFC_DATABASE_URL?null:setInterval(async () => { offset = await clock(); }, 1000);clockTimer?.unref();
  const { createCommerce } = await import('./commerce.mjs'); const { createPush } = await import('./push.mjs');
  const app = await createOnlineServer({ directory, now: () => Date.now() + offset, commerce: process.env.AGENTFC_COMMERCE_ENABLED==='false'?undefined:await createCommerce(), push: createPush() });
  const port = Number(process.env.AGENTFC_API_PORT || process.env.PORT || 4180),host=process.env.AGENTFC_BIND_HOST||(process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1');
  app.server.listen(port,host,()=>console.log(`Agent FC API listening on ${host}:${port}; storage=${app.store.kind}`));
  const shutdown = async () => { clearInterval(clockTimer); await app.close(); process.exit(0); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}
