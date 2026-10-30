import {randomUUID,randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRemoteJWKSet,jwtVerify,SignJWT,importPKCS8} from 'jose';
import {createSession} from './auth.mjs';
import {requireGame} from './errors.mjs';
import {DAY} from './calendar.mjs';

export const appleClientId='com.agentfc.Football-Agent-Simulator';
const appleIssuer='https://appleid.apple.com';
const publicKeys=createRemoteJWKSet(new URL(appleIssuer+'/auth/keys'),{timeoutDuration:8000,cooldownDuration:30000});
export const nonceHash=nonce=>createHash('sha256').update(nonce).digest('hex');
export async function verifyAppleIdentityToken(token,nonce,now,keys=publicKeys){
 requireGame(typeof token==='string'&&token.length<15000,'APPLE_INVALID_CREDENTIAL',401);
 let payload;try{({payload}=await jwtVerify(token,keys,{issuer:appleIssuer,audience:appleClientId,algorithms:['RS256'],maxTokenAge:'10m',clockTolerance:30,currentDate:new Date(now)}));}catch{requireGame(false,'APPLE_INVALID_CREDENTIAL',401);}
 requireGame(typeof payload.sub==='string'&&payload.sub.length>0&&payload.sub.length<=255&&payload.nonce===nonce,'APPLE_INVALID_CREDENTIAL',401);
 return payload;
}
export function encryptAppleToken(value,key){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');
}
export function decryptAppleToken(value,key){
 const bytes=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));
 return Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8');
}
export function createAppleAuth({env=process.env,keys=publicKeys,fetcher=fetch}={}){
 const keyId=env.AGENTFC_APPLE_SIGNIN_KEY_ID,teamId=env.AGENTFC_APPLE_SIGNIN_TEAM_ID;
 const pem=env.AGENTFC_APPLE_SIGNIN_KEY_PEM||(env.AGENTFC_APPLE_SIGNIN_KEY_PATH?readFileSync(env.AGENTFC_APPLE_SIGNIN_KEY_PATH,'utf8'):null);
 const encryptionKey=Buffer.from(env.AGENTFC_TOKEN_ENCRYPTION_KEY??'','base64');
 const configured=Boolean(keyId&&teamId&&pem&&encryptionKey.length===32);let clientSecret,secretAt=0;
 const secret=async now=>{
  if(!clientSecret||now-secretAt>DAY){const privateKey=await importPKCS8(pem,'ES256');clientSecret=await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:keyId}).setIssuer(teamId).setAudience(appleIssuer).setSubject(appleClientId).setIssuedAt(Math.floor(now/1000)).setExpirationTime(Math.floor((now+7*DAY)/1000)).sign(privateKey);secretAt=now;}
  return clientSecret;
 };
 const post=async(route,parameters,now)=>{
  const response=await fetcher(appleIssuer+route,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:appleClientId,client_secret:await secret(now),...parameters}),signal:AbortSignal.timeout(10000)});
  requireGame(response.ok,'APPLE_UNAVAILABLE',503);return response;
 };
 const credential=async(store,data,now)=>{
  requireGame(configured,'APPLE_NOT_CONFIGURED',503);
  requireGame(typeof data.challengeId==='string'&&typeof data.authorizationCode==='string'&&data.authorizationCode.length>0&&data.authorizationCode.length<4096,'APPLE_INVALID_CREDENTIAL',401);
  const challenge=(await store.db.query('select nonce_hash,expires_at from agentfc_online.apple_challenges where id=$1',[data.challengeId])).rows[0];
  requireGame(challenge&&Number(challenge.expires_at)>now,'APPLE_CHALLENGE_EXPIRED',401);
  const identity=await verifyAppleIdentityToken(data.identityToken,challenge.nonce_hash,now,keys);
  const response=await post('/auth/token',{grant_type:'authorization_code',code:data.authorizationCode},now),tokens=await response.json();
  requireGame(typeof tokens.refresh_token==='string'&&tokens.refresh_token.length<8192,'APPLE_INVALID_CREDENTIAL',401);
  const exchanged=await verifyAppleIdentityToken(tokens.id_token,challenge.nonce_hash,now,keys);
  requireGame(exchanged.sub===identity.sub,'APPLE_INVALID_CREDENTIAL',401);
  return {identity,refreshToken:encryptAppleToken(tokens.refresh_token,encryptionKey)};
 };
 return {configured,
  challenge:async(store,now)=>{
   requireGame(configured,'APPLE_NOT_CONFIGURED',503);const id=randomUUID(),nonce=randomBytes(32).toString('hex');
   await store.db.query('insert into agentfc_online.apple_challenges(id,nonce_hash,expires_at) values($1,$2,$3)',[id,nonceHash(nonce),now+5*60000]);
   return {id,nonce};
  },
  signIn:async(store,data,now)=>{
   const {identity,refreshToken}=await credential(store,data,now);
   return store.atomic(async tx=>{
    const used=await tx.query('delete from agentfc_online.apple_challenges where id=$1 and expires_at>$2 returning id',[data.challengeId,now]);requireGame(used.rows.length===1,'APPLE_CHALLENGE_EXPIRED',401);
    let account=(await tx.query('select a.id,a.username,a.name,a.locale from agentfc_online.apple_identities i join agentfc_online.accounts a on a.id=i.account_id where i.subject=$1',[identity.sub])).rows[0];
    if(!account){const id=randomUUID();account={id,username:'a_'+id.replaceAll('-','').slice(0,16),name:'Agent '+id.slice(0,5).toUpperCase(),locale:['fr','en','es','it','ru'].includes(data.locale)?data.locale:'fr'};await tx.query('insert into agentfc_online.accounts(id,username,name,locale,password_hash,created_at) values($1,$2,$3,$4,$5,$6)',[id,account.username,account.name,account.locale,'',now]);await tx.query('insert into agentfc_online.apple_identities(subject,account_id,refresh_token,created_at,last_auth_at) values($1,$2,$3,$4,$4)',[identity.sub,id,refreshToken,now]);}
    else await tx.query('update agentfc_online.apple_identities set refresh_token=$2,last_auth_at=$3 where subject=$1',[identity.sub,refreshToken,now]);
    {const flag=(await tx.query('select wallet from agentfc_online.accounts where id=$1',[account.id])).rows[0];if(flag.wallet.profileReady===undefined&&account.name===`Agent ${account.id.slice(0,5).toUpperCase()}`)await tx.query("update agentfc_online.accounts set wallet=jsonb_set(wallet,'{profileReady}','false') where id=$1",[account.id]);}
    account.authProvider='apple';return createSession(tx,account,now);
   });
  },
  reauthenticate:async(store,account,data,now)=>{
   const {identity,refreshToken}=await credential(store,data,now);
   await store.atomic(async tx=>{
    const row=(await tx.query('select subject from agentfc_online.apple_identities where account_id=$1',[account.id])).rows[0];requireGame(row?.subject===identity.sub,'APPLE_INVALID_CREDENTIAL',401);
    const used=await tx.query('delete from agentfc_online.apple_challenges where id=$1 and expires_at>$2 returning id',[data.challengeId,now]);requireGame(used.rows.length===1,'APPLE_CHALLENGE_EXPIRED',401);
    await tx.query('update agentfc_online.apple_identities set refresh_token=$2,last_auth_at=$3 where account_id=$1',[account.id,refreshToken,now]);
   });return identity.sub;
  },
  acceptNotification:async(store,data,now)=>{
   requireGame(typeof data.payload==='string'&&data.payload.length<15000,'APPLE_INVALID_CREDENTIAL',401);
   let claims;try{({payload:claims}=await jwtVerify(data.payload,keys,{issuer:appleIssuer,audience:appleClientId,algorithms:['RS256'],clockTolerance:30,currentDate:new Date(now)}));}catch{requireGame(false,'APPLE_INVALID_CREDENTIAL',401);}
   let event=claims.events;try{if(typeof event==='string')event=JSON.parse(event);}catch{requireGame(false,'APPLE_INVALID_CREDENTIAL',401);}
   requireGame(typeof claims.jti==='string'&&claims.jti.length<=256&&typeof event?.sub==='string'&&typeof event.type==='string'&&Number.isSafeInteger(event.event_time)&&event.event_time<=Math.floor(now/1000)+30,'APPLE_INVALID_CREDENTIAL',401);
   return store.atomic(async tx=>{
    const accepted=await tx.query('insert into agentfc_online.apple_events(id,received_at) values($1,$2) on conflict(id) do nothing returning id',[claims.jti,now]);if(!accepted.rows.length)return {ok:true,duplicate:true};
    if(['consent-revoked','account-deleted'].includes(event.type)){
     const identity=(await tx.query('select account_id,last_auth_at from agentfc_online.apple_identities where subject=$1',[event.sub])).rows[0];
     if(identity&&Math.floor(Number(identity.last_auth_at)/1000)<=event.event_time){await tx.query('delete from agentfc_online.sessions where account_id=$1',[identity.account_id]);await tx.query("update agentfc_online.apple_identities set refresh_token='' where account_id=$1",[identity.account_id]);}
    }return {ok:true};
   });
  },
  flushRevocations:async(store,now)=>{
   if(!configured)return;
   const rows=(await store.db.query('select id,refresh_token from agentfc_online.apple_revocations where attempts<20 order by created_at limit 10')).rows;
   for(const row of rows){try{await post('/auth/revoke',{token:decryptAppleToken(row.refresh_token,encryptionKey),token_type_hint:'refresh_token'},now);await store.db.query('delete from agentfc_online.apple_revocations where id=$1',[row.id]);}catch{await store.db.query('update agentfc_online.apple_revocations set attempts=attempts+1 where id=$1',[row.id]);}}
  }
 };
}
