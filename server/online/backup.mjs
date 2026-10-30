export const backupTables=Object.freeze(['accounts','leagues','sessions','memberships','commands','purchases','devices','push_deliveries','ad_intents','global_awards','support_tickets','apple_challenges','apple_identities','apple_events','apple_revocations','season_points']);
export async function exportOnline(db){
 const tables={};for(const table of backupTables)tables[table]=(await db.query(`select * from agentfc_online.${table}`)).rows;
 return {version:1,schema:'agentfc_online',createdAt:new Date().toISOString(),tables};
}
export async function restoreOnlineIntoEmpty(db,backup){
 if(backup?.version!==1||backup.schema!=='agentfc_online'||!backup.tables||Object.keys(backup.tables).some(t=>!backupTables.includes(t)))throw Error('INVALID_BACKUP');
 for(const table of backupTables){if(Number((await db.query(`select count(*) n from agentfc_online.${table}`)).rows[0].n)!==0)throw Error('RESTORE_REQUIRES_EMPTY_DATABASE');if(backup.tables[table]!==undefined&&!Array.isArray(backup.tables[table]))throw Error('INVALID_BACKUP_TABLE');}
 for(const table of backupTables){
  const columns=new Set((await db.query("select column_name from information_schema.columns where table_schema='agentfc_online' and table_name=$1",[table])).rows.map(r=>r.column_name));
  for(const row of backup.tables[table]??[]){const keys=Object.keys(row);if(!keys.length||keys.some(k=>!columns.has(k)||!/^[a-z_]+$/.test(k)))throw Error('INVALID_BACKUP_COLUMN');
   await db.query(`insert into agentfc_online.${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>row[k]!==null&&typeof row[k]==='object'?JSON.stringify(row[k]):row[k]));
  }
 }
}
