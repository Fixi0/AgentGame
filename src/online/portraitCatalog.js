// Opening market: 30 players, then 4 weeks of 15 newcomers.
export const PLAYERS_PER_SEASON=90;
export const PORTRAIT_SEASONS=3;
export const PORTRAIT_COUNT=PLAYERS_PER_SEASON*PORTRAIT_SEASONS;
export const PORTRAIT_COLUMNS=3;
export const PORTRAIT_ROWS=3;
export const PORTRAITS_PER_ATLAS=PORTRAIT_COLUMNS*PORTRAIT_ROWS;
export const PORTRAIT_ATLASES=PORTRAIT_COUNT/PORTRAITS_PER_ATLAS;

export function portraitIndexForSeason(season,sequence,offset=0){
 if(!Number.isSafeInteger(season)||season<1||!Number.isSafeInteger(sequence)||sequence<0||!Number.isSafeInteger(offset)||offset<0||offset>=PORTRAIT_COUNT)throw new RangeError('Invalid portrait sequence');
 return ((season-1)*PLAYERS_PER_SEASON+sequence+offset)%PORTRAIT_COUNT;
}
export function portraitCell(index){
 if(!Number.isSafeInteger(index)||index<0||index>=PORTRAIT_COUNT)return null;
 const cell=index%PORTRAITS_PER_ATLAS;
 return {atlas:Math.floor(index/PORTRAITS_PER_ATLAS)+1,column:cell%PORTRAIT_COLUMNS,row:Math.floor(cell/PORTRAIT_COLUMNS)};
}
