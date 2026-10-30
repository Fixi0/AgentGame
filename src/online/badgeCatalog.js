export const BASE_BADGE_PATTERNS=['moitie','rayures','echarpe','chevron','bande','uni'];
export const PASS_BADGE_PATTERNS=['quartiers','damier','diagonales','etoiles'];
export const BADGE_COLORS=['#C8102E','#FFFFFF','#1F4FD1','#FFD23F','#15151C','#E8B23A','#1E8C45','#5B2BC4','#F07A12','#0B2470','#00A3E0','#8B1E3F'];
export const badgeHash=value=>{let n=2166136261;for(const c of String(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
export function defaultBadge(id,shape='hexagone'){
  const n=badgeHash(id),i=n%BADGE_COLORS.length,j=(i+1+(n>>>8)%(BADGE_COLORS.length-1))%BADGE_COLORS.length;
  return {couleur1:BADGE_COLORS[i],couleur2:BADGE_COLORS[j],motif:BASE_BADGE_PATTERNS[(n>>>16)%BASE_BADGE_PATTERNS.length],forme:shape};
}
export function validBadge(badge,owned=[]){
  return Boolean(badge&&['couleur1','couleur2'].every(k=>/^#[0-9a-f]{6}$/i.test(badge[k]))&&badge.couleur1.toUpperCase()!==badge.couleur2.toUpperCase()
    &&(BASE_BADGE_PATTERNS.includes(badge.motif)||PASS_BADGE_PATTERNS.includes(badge.motif)&&owned.includes('badge_pattern_'+badge.motif))
    &&(badge.forme==='hexagone'||badge.forme==='rond'&&owned.includes('badge_shape_rond')));
}
export function safeBadge(badge,id,owned=[]){
  if(validBadge(badge,owned))return {couleur1:badge.couleur1.toUpperCase(),couleur2:badge.couleur2.toUpperCase(),motif:badge.motif,forme:badge.forme};
  const fallback=defaultBadge(id);
  if(badge&&['couleur1','couleur2'].every(k=>/^#[0-9a-f]{6}$/i.test(badge[k]))&&badge.couleur1.toUpperCase()!==badge.couleur2.toUpperCase()){
    fallback.couleur1=badge.couleur1.toUpperCase();fallback.couleur2=badge.couleur2.toUpperCase();
    if(BASE_BADGE_PATTERNS.includes(badge.motif)||PASS_BADGE_PATTERNS.includes(badge.motif)&&owned.includes('badge_pattern_'+badge.motif))fallback.motif=badge.motif;
    if(badge.forme==='rond'&&owned.includes('badge_shape_rond'))fallback.forme='rond';
  }
  return fallback;
}
