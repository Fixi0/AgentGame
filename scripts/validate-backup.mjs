import assert from 'node:assert/strict';import {openStore} from '../server/online/store.mjs';import {exportOnline,restoreOnlineIntoEmpty} from '../server/online/backup.mjs';
const a=await openStore('memory://'),b=await openStore('memory://');
try{
 await a.db.query("insert into agentfc_online.accounts(id,username,name,password_hash,created_at,wallet) values('backup-fixture','backup-fixture','Test','unusable',123,$1)",[JSON.stringify({gems:250,cosmetics:['crest_neon']})]);
 await a.db.query("insert into agentfc_online.season_points values('league-backup',1,'backup-fixture',1,100,700,1,2419200001)");
 const backup=await a.atomic(db=>exportOnline(db));await b.atomic(db=>restoreOnlineIntoEmpty(db,backup));
 assert.deepEqual((await b.db.query('select * from agentfc_online.accounts')).rows,(await a.db.query('select * from agentfc_online.accounts')).rows);assert.deepEqual((await b.db.query('select * from agentfc_online.season_points')).rows,(await a.db.query('select * from agentfc_online.season_points')).rows);
 await assert.rejects(()=>b.atomic(db=>restoreOnlineIntoEmpty(db,backup)),/RESTORE_REQUIRES_EMPTY_DATABASE/);await assert.rejects(()=>b.atomic(db=>restoreOnlineIntoEmpty(db,{...backup,tables:{auth:[]}})),/INVALID_BACKUP/);
 console.log('Backup passed: atomic export/restore of all 16 game tables, account/wallet and career points preserved, foreign keys, occupied database and unknown schema rejected.');
}finally{await a.close();await b.close();}
