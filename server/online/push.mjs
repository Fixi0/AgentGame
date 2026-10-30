import http2 from 'node:http2';
import {readFileSync} from 'node:fs';
import {sign,createHash} from 'node:crypto';
const topic='com.agentfc.Football-Agent-Simulator';
export const pushCategory=code=>({duel_invited:'offers',duel_result:'matches',chat_message:'chat',player_goal:'goals',match_result:'matches',trophy_won:'matches',season_finished:'matches',warmup_reminder:'warmup',mercato_reminder:'mercato',mercato_opened:'mercato',training_complete:'training',outbid:'offers',auction_won:'offers',transfer_offer:'offers',rival_offer:'offers',placement_won:'offers',placement_lost:'offers',transfer_completed:'offers',transfer_declined:'offers',client_departed:'offers'})[code]??null;
const labels={
 fr:{duels:'Un défi ou un résultat de duel t’attend dans Matchs.',offers:'Une offre ou une enchère attend ton attention.',matches:'Les résultats de tes clients sont disponibles.',goals:'Un de tes clients vient de marquer !',chat:'Nouveau message dans ta ligue.',warmup:'Échauffement : coup d’envoi dans moins de 30 minutes.',mercato:'Le mercato bouge : vérifie les enchères de ta ligue.',training:'L’entraînement de ton client est terminé.'},
 en:{duels:'A challenge or duel result is waiting in Matches.',offers:'An offer or auction needs your attention.',matches:'Your clients’ results are ready.',goals:'One of your clients just scored!',chat:'New message in your league.',warmup:'Warm-up: kick-off in less than 30 minutes.',mercato:'The market is moving. Check your league’s auctions.',training:'Your client’s training is complete.'},
 es:{duels:'Te espera un desafío o resultado de duelo en Partidos.',offers:'Una oferta o subasta necesita tu atención.',matches:'Ya están los resultados de tus clientes.',goals:'¡Uno de tus clientes acaba de marcar!',chat:'Nuevo mensaje en tu liga.',warmup:'Calentamiento: el partido empieza en menos de 30 minutos.',mercato:'El mercado se mueve. Revisa las subastas de tu liga.',training:'Tu cliente ha terminado el entrenamiento.'},
 it:{duels:'Una sfida o un risultato ti aspetta in Partite.',offers:'Una proposta o asta richiede la tua attenzione.',matches:'I risultati dei tuoi assistiti sono pronti.',goals:'Un tuo assistito ha appena segnato!',chat:'Nuovo messaggio nella tua lega.',warmup:'Riscaldamento: calcio d’inizio tra meno di 30 minuti.',mercato:'Il mercato si muove. Controlla le aste della tua lega.',training:'Il tuo assistito ha finito l’allenamento.'},
 ru:{duels:'В разделе «Матчи» тебя ждёт вызов или результат дуэли.',offers:'Предложение или аукцион ждёт твоего внимания.',matches:'Результаты твоих клиентов готовы.',goals:'Один из твоих клиентов забил гол!',chat:'Новое сообщение в лиге.',warmup:'Разминка: до начала матчей меньше 30 минут.',mercato:'Рынок оживился. Проверь аукционы своей лиги.',training:'Тренировка твоего клиента завершена.'}
};
export function createPush({env=process.env,transport,clock=Date.now}={}){
 const keyId=env.AGENTFC_APNS_KEY_ID,teamId=env.AGENTFC_APNS_TEAM_ID;
 const key=env.AGENTFC_APNS_KEY_PEM||(env.AGENTFC_APNS_KEY_PATH?readFileSync(env.AGENTFC_APNS_KEY_PATH,'utf8'):null);
 const configured=Boolean(key&&keyId&&teamId);let jwt,issued=0;
 const auth=()=>{
  if(!jwt||clock()-issued>40*60000){const head=Buffer.from(JSON.stringify({alg:'ES256',kid:keyId})).toString('base64url'),body=Buffer.from(JSON.stringify({iss:teamId,iat:Math.floor(clock()/1000)})).toString('base64url'),data=`${head}.${body}`;jwt=`${data}.${sign('sha256',Buffer.from(data),{key,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;issued=clock();}return jwt;
 };
 const send=transport??((device,payload,collapse,expiresAt)=>new Promise((resolve,reject)=>{
  const client=http2.connect(device.environment==='production'?'https://api.push.apple.com':'https://api.sandbox.push.apple.com');
  client.on('error',reject);client.setTimeout(8000,()=>{client.destroy();reject(new Error('APNS_TIMEOUT'));});
  const req=client.request({':method':'POST',':path':`/3/device/${device.token}`,authorization:`bearer ${auth()}`,'apns-topic':topic,'apns-push-type':'alert','apns-priority':'10','apns-collapse-id':collapse,'apns-expiration':String(Math.floor(expiresAt/1000))});
  let status,body='';req.on('response',h=>status=h[':status']);req.on('data',chunk=>body+=chunk);req.on('end',()=>{client.close();let reason;try{reason=JSON.parse(body).reason;}catch{}resolve({status,reason});});req.on('error',error=>{client.close();reject(error);});req.end(JSON.stringify(payload));
 }));
 const versions=new Map();let flushing=null;
 const flush=async(store,now)=>{
  if(!configured)return {sent:0,failed:0};let sent=0,failed=0;
  const summaries=(await store.db.query('select id,version from agentfc_online.leagues')).rows;
  const ids=new Set(summaries.map(row=>row.id));for(const id of versions.keys())if(!ids.has(id))versions.delete(id);
  for(const summary of summaries){
   const previous=versions.get(summary.id);if(previous?.version===summary.version&&(!previous.retryAt||previous.retryAt>now))continue;
   const found=(await store.db.query('select state from agentfc_online.leagues where id=$1',[summary.id])).rows[0];if(!found)continue;const world=found.state;let retry=false;
   const grouped=new Map();for(const e of world.events.filter(e=>e.at>now-15*60000&&e.at<=now)){const kind=pushCategory(e.code);if(kind)grouped.set(`${e.memberId}:${kind}`,e);}
   for(const event of grouped.values()){
    const kind=pushCategory(event.code),account=(await store.db.query('select wallet from agentfc_online.accounts where id=$1',[event.memberId])).rows[0];
    if(!account||account.wallet.preferences?.[kind]===false||(kind==='chat'&&account.wallet.preferences?.chat!==true))continue;
    if(kind==='chat'){const message=world.chats.find(c=>c.id===event.data.messageId);if(!message||message.hidden||world.blocks.some(b=>b.by===event.memberId&&b.target===message.memberId))continue;}
    const devices=(await store.db.query('select * from agentfc_online.devices where account_id=$1',[event.memberId])).rows;
    for(const device of devices){
     const hash=createHash('sha256').update(device.token).digest('hex');
     const claimed=await store.atomic(tx=>tx.query('insert into agentfc_online.push_deliveries(event_id,token_hash,attempts,last_attempt_at) values($1,$2,1,$3) on conflict(event_id,token_hash) do update set attempts=agentfc_online.push_deliveries.attempts+1,last_attempt_at=$3 where agentfc_online.push_deliveries.delivered_at is null and agentfc_online.push_deliveries.attempts<3 and (agentfc_online.push_deliveries.last_attempt_at is null or agentfc_online.push_deliveries.last_attempt_at<$4) returning event_id',[event.id,hash,now,now-30000]));
     if(!claimed.rows.length)continue;
     try{
      const result=await send(device,{aps:{alert:{title:'Agent FC',body:(labels[device.locale]??labels.en)[event.code.startsWith('duel_')?'duels':kind]},sound:'default','thread-id':`league:${world.id}`},eventId:event.id,code:event.code,category:kind,leagueId:world.id,playerId:event.data.playerId??null,duelId:event.data.duelId??null,matchId:event.data.matchId??null},`${world.id}:${kind}`,Math.min(now+15*60000,event.data.closesAt??event.data.matchAt??Infinity));
      if(result.status===200){sent++;await store.db.query('update agentfc_online.push_deliveries set delivered_at=$3 where event_id=$1 and token_hash=$2',[event.id,hash,now]);}
      else{failed++;retry=true;if(result.status===410||result.status===400&&['BadDeviceToken','DeviceTokenNotForTopic'].includes(result.reason))await store.db.query('delete from agentfc_online.devices where account_id=$1 and token=$2',[device.account_id,device.token]);}
     }catch{failed++;retry=true;}
    }
   }
   versions.set(summary.id,{version:summary.version,retryAt:retry?now+31000:null});
  }
  return {sent,failed};
 };
 return {configured,flush:(store,now)=>{if(!flushing){const work=flush(store,now).finally(()=>{if(flushing===work)flushing=null;});flushing=work;}return flushing;}};
}
