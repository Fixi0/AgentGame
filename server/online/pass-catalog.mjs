const coins=amount=>({type:'coins',amount}),gems=amount=>({type:'gems',amount}),item=id=>({type:'cosmetic',id});
export const PASS_PRODUCTS=Object.freeze({agentfc_pass_season:{plus:false,bonusTiers:0,targetPrice:4.99},agentfc_pass_season_plus:{plus:true,bonusTiers:10,targetPrice:9.99}});
export const PASS_TIERS=Object.freeze([
  [[coins(5)],[coins(10)]],
  [[],[item('stickers_mercato')]],
  [[coins(5)],[item('frame_bronze')]],
  [[],[gems(2)]],
  [[gems(1)],[item('badge_pattern_damier')]],
  [[coins(5)],[coins(15)]],
  [[gems(2)],[item('profile_night')]],
  [[],[item('effect_signature')]],
  [[coins(5)],[gems(3)]],
  [[item('stickers_basic')],[item('frame_silver')]],
  [[],[coins(15)]],
  [[coins(5)],[item('badge_pattern_etoiles')]],
  [[],[item('chat_gold')]],
  [[item('badge_pattern_quartiers'),gems(2)],[gems(5)]],
  [[coins(5)],[item('effect_celebration')]],
  [[],[coins(20)]],
  [[coins(5)],[item('frame_gold')]],
  [[],[item('stickers_negotiation')]],
  [[gems(1)],[item('badge_pattern_diagonales')]],
  [[coins(5)],[item('profile_trophies')]],
  [[gems(2)],[gems(5)]],
  [[],[item('badge_shape_rond')]],
  [[coins(5)],[coins(25)]],
  [[],[item('frame_neon')]],
  [[coins(10)],[item('effect_ranking_shine')]],
  [[],[gems(8)]],
  [[gems(1)],[item('frame_holographic')]],
  [[item('title_agent')],[item('badge_legendary'),item('title_elite')]],
].map(([free,premium],i)=>Object.freeze({tier:i+1,xp:(i+1)*100,free,premium})));
export const STICKER_PACKS=Object.freeze({
  stickers_basic:['football','trophy','jersey','clients'],
  stickers_mercato:['transfers','auction','deal','calendar','ranking','football'],
  stickers_negotiation:['deal','trophy','clients','ranking','transfers','jersey'],
});
export function cosmeticKind(id){
  if(typeof id!=='string')return null;
  if(id.startsWith('frame_'))return 'frame';
  if(id.startsWith('profile_'))return 'profile';
  if(id==='chat_gold')return 'chat';
  if(id.startsWith('effect_'))return id==='effect_ranking_shine'?'ranking':'effect';
  if(id==='badge_legendary')return 'badgeEffect';
  if(/^title_(agent|elite)_s\d+$/.test(id))return 'title';
  return null;
}
export const PASS_COSMETICS=[...new Set(PASS_TIERS.flatMap(t=>[...t.free,...t.premium].filter(r=>r.type==='cosmetic').map(r=>r.id)))];
