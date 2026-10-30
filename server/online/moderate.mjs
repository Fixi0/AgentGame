import { openStore,defaultDataDir } from './store.mjs';
const [action='list',id,...body]=process.argv.slice(2);
const store=await openStore(process.env.AGENTFC_DATA_DIR||defaultDataDir);
try{
  if(action==='list'){
    const worlds=(await store.db.query('select id,state from agentfc_online.leagues')).rows;
    for(const {state} of worlds)for(const report of state.reports.filter(r=>r.status==='pending')){const message=state.chats.find(c=>c.id===report.messageId);console.log(JSON.stringify({leagueId:state.id,reportId:report.id,messageId:report.messageId,text:message?.text,reason:report.reason}));}
    console.log(JSON.stringify({support:(await store.db.query("select id,message,created_at from agentfc_online.support_tickets where status='pending'")).rows}));
  }else if(['hide','restore'].includes(action)&&id){
    await store.atomic(async db=>{for(const {id:worldId,state} of (await db.query('select id,state from agentfc_online.leagues for update')).rows){const message=state.chats.find(c=>c.id===id);if(!message)continue;message.hidden=action==='hide';for(const r of state.reports.filter(r=>r.messageId===id))r.status='resolved';await db.query('update agentfc_online.leagues set state=$2,version=version+1 where id=$1',[worldId,JSON.stringify(state)]);console.log(action+' '+id);}});
  }else if(action==='answer'&&id&&body.join(' ').length>=1&&body.join(' ').length<=1000){await store.db.query("update agentfc_online.support_tickets set response=$2,status='answered' where id=$1",[id,body.join(' ')]);console.log('Support answer saved.');}
  else throw new Error('Usage: moderate.mjs list | hide MESSAGE_ID | restore MESSAGE_ID | answer TICKET_ID TEXT');
}finally{await store.close();}
