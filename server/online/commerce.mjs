import { readFile, readdir } from 'node:fs/promises';
import { createHash, randomUUID, verify as verifySignature } from 'node:crypto';
import { SignedDataVerifier, Environment } from '@apple/app-store-server-library';
import { products } from './catalog.mjs';
import { DAY } from './calendar.mjs';
import { requireGame,adjustPassCoins,assertWorld } from './world.mjs';
import { creditGems } from './economy.mjs';
import {PASS_PRODUCTS} from './pass-catalog.mjs';
import {grantVerifiedPass,reconcilePassRewards,passScope} from './season-pass.mjs';
export { creditGems } from './economy.mjs';

const bundleId = 'com.agentfc.Football-Agent-Simulator';
const passId = 'agentfc_pass_8weeks';
const rewardUnit = 'ca-app-pub-6706373152254937/3611733097';
const digest = value => createHash('sha256').update(value).digest('hex');
async function reconcilePaidPass(db,wallet,scope,now,restore=false){
  const pass=wallet.passStates?.[scope];if(!pass)return;
  const row=(await db.query('select state from agentfc_online.leagues where id=$1 for update',[pass.worldId])).rows[0];
  const world=row?.state,member=world?.members.find(m=>m.id===pass.accountId);
  let changed=false;
  reconcilePassRewards(wallet,scope,now,(delta,reference,at)=>{
    if(world&&passScope(world)===scope&&member){adjustPassCoins(world,member,delta,reference,at);changed=true;}
  },restore);
  if(changed){assertWorld(world);world.version++;await db.query('update agentfc_online.leagues set state=$2,version=$3,updated_at=$4 where id=$1',[world.id,JSON.stringify(world),world.version,now]);}
}
export async function deliverVerifiedPurchase(store, accountId, tx, payload, now) {
  requireGame(tx.bundleId === bundleId && String(tx.appAccountToken).toLowerCase() === accountId.toLowerCase() && tx.revocationDate === undefined, 'PURCHASE_ACCOUNT_MISMATCH');
  const productId = tx.productId;
  requireGame(Object.hasOwn(products, productId) || Object.hasOwn(PASS_PRODUCTS,productId) || productId === passId || productId === 'no_ads_pack', 'INVALID_PRODUCT');
  requireGame(tx.transactionId && /^\d+$/.test(String(tx.transactionId)) && Number.isFinite(tx.purchaseDate) && tx.purchaseDate <= now + 300_000 && (tx.quantity ?? 1) === 1, 'INVALID_TRANSACTION');
  if (Object.hasOwn(products, productId)) requireGame(tx.type === 'Consumable', 'INVALID_PRODUCT_TYPE');
  if (productId === passId||Object.hasOwn(PASS_PRODUCTS,productId)) requireGame(tx.type === 'Non-Renewing Subscription', 'INVALID_PRODUCT_TYPE');
  if (productId === 'no_ads_pack') requireGame(tx.type === 'Non-Consumable', 'INVALID_PRODUCT_TYPE');
  return store.atomic(async db => {
    const old = (await db.query('select account_id,product_id,revoked_at from agentfc_online.purchases where transaction_id=$1', [String(tx.transactionId)])).rows[0];
    if (old) { requireGame(old.account_id === accountId && old.product_id === productId && !old.revoked_at, 'PURCHASE_ACCOUNT_MISMATCH'); return { delivered: true, duplicate: true, transactionId: String(tx.transactionId) }; }
    const found = (await db.query('select wallet from agentfc_online.accounts where id=$1 for update', [accountId])).rows[0]; requireGame(found, 'UNAUTHENTICATED', 401);
    const wallet = found.wallet;
    let passResult={};
    if (Object.hasOwn(products, productId)) creditGems(wallet, products[productId]);
    else if(Object.hasOwn(PASS_PRODUCTS,productId))passResult=grantVerifiedPass(wallet,tx,now);
    else if (productId === passId) { wallet.passes ??= {}; wallet.passes[tx.transactionId] = tx.purchaseDate + 56 * DAY; wallet.paidUntil = Math.max(0, ...Object.values(wallet.passes)); }
    else wallet.noAds = true;
    await db.query('insert into agentfc_online.purchases(transaction_id,account_id,product_id,purchased_at,payload_hash) values($1,$2,$3,$4,$5)', [String(tx.transactionId), accountId, productId, tx.purchaseDate, digest(payload)]);
    await db.query('update agentfc_online.accounts set wallet=$2 where id=$1', [accountId, JSON.stringify(wallet)]);
    return { delivered: true, transactionId: String(tx.transactionId),...passResult };
  });
}
export async function revokeVerifiedPurchase(store, tx, now) {
  return store.atomic(async db => {
    const old = (await db.query('select * from agentfc_online.purchases where transaction_id=$1 for update', [String(tx.transactionId)])).rows[0];
    if(!old){
      if(tx.bundleId!==bundleId||!tx.appAccountToken||(!Object.hasOwn(products,tx.productId)&&!Object.hasOwn(PASS_PRODUCTS,tx.productId)&&![passId,'no_ads_pack'].includes(tx.productId)))return;
      const owner=(await db.query('select id from agentfc_online.accounts where id=$1',[String(tx.appAccountToken).toLowerCase()])).rows[0];if(!owner)return;
      await db.query('insert into agentfc_online.purchases(transaction_id,account_id,product_id,purchased_at,revoked_at,payload_hash) values($1,$2,$3,$4,$5,$6)',[String(tx.transactionId),owner.id,tx.productId,tx.purchaseDate,now,'revocation-before-delivery']);return;
    }
    if(old.revoked_at)return;
    const account = (await db.query('select wallet from agentfc_online.accounts where id=$1 for update', [old.account_id])).rows[0];
    if (!account) return;
    const wallet = account.wallet, amount = products[old.product_id];
    if (amount) { const remaining = Math.min(wallet.gems ?? 0, amount); wallet.gems = (wallet.gems ?? 0) - remaining; wallet.debt = (wallet.debt ?? 0) + amount - remaining; }
    if (old.product_id === passId) { delete wallet.passes?.[tx.transactionId]; wallet.paidUntil = Math.max(0, ...Object.values(wallet.passes ?? {})); }
    if(Object.hasOwn(PASS_PRODUCTS,old.product_id)&&wallet.passReceipts?.[String(tx.transactionId)]){
      const receipt=wallet.passReceipts[String(tx.transactionId)];receipt.revoked=true;
      if(receipt.scope)await reconcilePaidPass(db,wallet,receipt.scope,now);
    }
    if(old.product_id===passId)for(const scope of Object.keys(wallet.passStates??{}))await reconcilePaidPass(db,wallet,scope,now);
    if (old.product_id === 'no_ads_pack') wallet.noAds = false;
    await db.query('update agentfc_online.purchases set revoked_at=$2 where transaction_id=$1', [String(tx.transactionId), now]);
    await db.query('update agentfc_online.accounts set wallet=$2 where id=$1', [old.account_id, JSON.stringify(wallet)]);
  });
}
export async function reverseVerifiedRefund(store,tx,now){
  return store.atomic(async db=>{
    const old=(await db.query('select * from agentfc_online.purchases where transaction_id=$1 for update',[String(tx.transactionId)])).rows[0];
    if(!old||!old.revoked_at)return;
    requireGame(tx.bundleId===bundleId&&String(tx.appAccountToken).toLowerCase()===old.account_id&&tx.productId===old.product_id,'PURCHASE_ACCOUNT_MISMATCH');
    const account=(await db.query('select wallet from agentfc_online.accounts where id=$1 for update',[old.account_id])).rows[0];if(!account)return;
    const wallet=account.wallet;
    if(Object.hasOwn(products,old.product_id))creditGems(wallet,products[old.product_id]);
    else if(Object.hasOwn(PASS_PRODUCTS,old.product_id)){
      if(!wallet.passReceipts?.[String(tx.transactionId)])grantVerifiedPass(wallet,{...tx,purchaseDate:Number(old.purchased_at)},now);
      const receipt=wallet.passReceipts[String(tx.transactionId)];receipt.revoked=false;
      if(receipt.scope)await reconcilePaidPass(db,wallet,receipt.scope,now, true);
    }
    else if(old.product_id===passId){wallet.passes??={};wallet.passes[tx.transactionId]=Number(old.purchased_at)+56*DAY;wallet.paidUntil=Math.max(0,...Object.values(wallet.passes));for(const scope of Object.keys(wallet.passStates??{}))await reconcilePaidPass(db,wallet,scope,now,true);}
    else if(old.product_id==='no_ads_pack')wallet.noAds=true;
    await db.query('update agentfc_online.purchases set revoked_at=null where transaction_id=$1',[String(tx.transactionId)]);
    await db.query('update agentfc_online.accounts set wallet=$2 where id=$1',[old.account_id,JSON.stringify(wallet)]);
  });
}
export function verifyAdCallback(url, pem, now) {
  const raw = url.search.slice(1), boundary = raw.indexOf('&signature='), params = url.searchParams;
  requireGame(boundary > 0 && /^[^&]+&key_id=\d+$/.test(raw.slice(boundary + 1)), 'INVALID_AD_SIGNATURE');
  requireGame([...new Set(params.keys())].length === [...params.keys()].length, 'INVALID_AD_SIGNATURE');
  requireGame(verifySignature('sha256', Buffer.from(raw.slice(0, boundary)), pem, Buffer.from(params.get('signature'), 'base64url')), 'INVALID_AD_SIGNATURE');
  requireGame([rewardUnit, rewardUnit.split('/')[1]].includes(params.get('ad_unit')) && Number(params.get('reward_amount')) > 0, 'INVALID_AD_UNIT');
  const timestamp = Number(params.get('timestamp')); requireGame(Number.isFinite(timestamp) && timestamp >= now - DAY && timestamp <= now + 300_000, 'INVALID_AD_TIMESTAMP');
  return { intentId: params.get('custom_data'), accountId: params.get('user_id'), transactionId: params.get('transaction_id'), timestamp };
}
export async function deliverVerifiedAd(store, value, now) {
  requireGame(typeof value.transactionId === 'string' && value.transactionId.length >= 8 && value.transactionId.length <= 256, 'INVALID_AD_TRANSACTION');
  return store.atomic(async db => {
    const intent = (await db.query('select * from agentfc_online.ad_intents where id=$1 for update', [value.intentId])).rows[0];
    requireGame(intent && intent.account_id === value.accountId && Number(intent.expires_at) >= value.timestamp && value.timestamp >= Number(intent.expires_at) - 15 * 60_000, 'INVALID_AD_INTENT');
    if (intent.transaction_id) { requireGame(intent.transaction_id === value.transactionId, 'INVALID_AD_TRANSACTION'); return; }
    const seen = (await db.query('select id from agentfc_online.ad_intents where transaction_id=$1', [value.transactionId])).rows[0]; requireGame(!seen, 'INVALID_AD_TRANSACTION');
    const account = (await db.query('select wallet from agentfc_online.accounts where id=$1 for update', [value.accountId])).rows[0]; requireGame(account, 'UNAUTHENTICATED', 401);
    const wallet = account.wallet; creditGems(wallet, 2);
    await db.query('update agentfc_online.accounts set wallet=$2 where id=$1', [value.accountId, JSON.stringify(wallet)]);
    await db.query('update agentfc_online.ad_intents set transaction_id=$2,rewarded_at=$3 where id=$1', [value.intentId, value.transactionId, now]);
  });
}
export async function createCommerce() {
  const folder = new URL('./certs/', import.meta.url), roots = await Promise.all((await readdir(folder)).filter(n => n.endsWith('.cer')).map(n => readFile(new URL(n, folder))));
  const environment = process.env.AGENTFC_APPLE_ENVIRONMENT === 'Sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;
  const verifier = new SignedDataVerifier(roots, true, environment, bundleId, 6767189801);
  let cachedKeys = null, cachedAt = 0;
  return {
    configured: true,
    acceptPurchase: async (store, account, data, now) => {
      requireGame(typeof data.signedTransaction === 'string' && data.signedTransaction.length < 30000, 'INVALID_TRANSACTION');
      let tx; try { tx = await verifier.verifyAndDecodeTransaction(data.signedTransaction); } catch { requireGame(false, 'UNVERIFIED_PURCHASE'); }
      return deliverVerifiedPurchase(store, account.id, tx, data.signedTransaction, now);
    },
    acceptNotification: async (store, data, now) => {
      requireGame(typeof data.signedPayload === 'string' && data.signedPayload.length < 30000, 'INVALID_TRANSACTION');
      let notification; try { notification = await verifier.verifyAndDecodeNotification(data.signedPayload); } catch { requireGame(false, 'UNVERIFIED_PURCHASE'); }
      const tx = notification.data?.signedTransactionInfo ? await verifier.verifyAndDecodeTransaction(notification.data.signedTransactionInfo) : null;
      if (tx && ['REFUND', 'REVOKE'].includes(notification.notificationType)) await revokeVerifiedPurchase(store, tx, now);
      else if(tx&&notification.notificationType==='REFUND_REVERSED')await reverseVerifiedRefund(store,tx,now);
      else if(tx&&notification.notificationType==='ONE_TIME_CHARGE'&&tx.appAccountToken)await deliverVerifiedPurchase(store,String(tx.appAccountToken).toLowerCase(),tx,notification.data.signedTransactionInfo,now);
      return { ok: true };
    },
    createAdIntent: async (store, account, now) => {
      // External AdMob callbacks require a deployed HTTPS URL; fail closed locally.
      requireGame(process.env.AGENTFC_ADMOB_SSV_ENABLED === 'true', 'ADS_NOT_CONFIGURED', 503);
      return store.atomic(async db => {
        const active = (await db.query('select id from agentfc_online.ad_intents where account_id=$1 and expires_at>$2 and transaction_id is null', [account.id, now])).rows[0];
        if (active) return { id: active.id, userId: account.id };
        const count = Number((await db.query('select count(*) n from agentfc_online.ad_intents where account_id=$1 and rewarded_at >= $2', [account.id, Math.floor(now / DAY) * DAY])).rows[0].n);
        requireGame(count < 3, 'AD_DAILY_LIMIT'); const id = randomUUID();
        await db.query('insert into agentfc_online.ad_intents(id,account_id,expires_at) values($1,$2,$3)', [id, account.id, now + 15 * 60_000]);
        return { id, userId: account.id };
      });
    },
    acceptAd: async (store, url, now) => {
      requireGame(process.env.AGENTFC_ADMOB_SSV_ENABLED === 'true', 'ADS_NOT_CONFIGURED', 503);
      if (!cachedKeys || Date.now() - cachedAt > 6 * 3_600_000) {
        const response = await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json', { signal: AbortSignal.timeout(8000) }); requireGame(response.ok, 'AD_KEYS_UNAVAILABLE', 503);
        cachedKeys = (await response.json()).keys; cachedAt = Date.now();
      }
      const key = cachedKeys.find(k => String(k.keyId) === url.searchParams.get('key_id')); requireGame(key, 'INVALID_AD_SIGNATURE');
      await deliverVerifiedAd(store, verifyAdCallback(url, key.pem, now), now);
    },
  };
}
