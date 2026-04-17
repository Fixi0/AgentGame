import { pick } from '../utils/helpers';

const ECONOMIES = ['crise', 'boom', 'boom', 'normale', 'normale', 'normale'];
const TENDANCES = ['jeunes', 'experience', 'neutre', 'neutre', 'neutre'];
const LEAGUE_CODES = ['FR', 'EN', 'ES', 'DE', 'IT', 'PT', 'NL', 'TR', 'BR', 'AR'];

export const generateWorldState = (season) => {
  const economie = pick(ECONOMIES);
  const tendance = pick(TENDANCES);
  const scandal_media = Math.random() < 0.3;
  const coupe_du_monde = season % 4 === 0;
  const phase_europeenne = Math.random() < 0.55;
  const raw = [pick(LEAGUE_CODES), ...(Math.random() < 0.35 ? [pick(LEAGUE_CODES)] : [])];
  const leagues_en_feu = Math.random() < 0.45 ? [...new Set(raw)] : [];

  return { economie, tendance, scandal_media, coupe_du_monde, phase_europeenne, leagues_en_feu, season };
};

export const getWorldStateDescription = (worldState) => {
  if (!worldState) return [];
  const lines = [];
  if (worldState.economie === 'boom') lines.push('Boom économique — les clubs investissent massivement');
  if (worldState.economie === 'crise') lines.push('Crise financière — le marché est au ralenti');
  if (worldState.tendance === 'jeunes') lines.push('Saison des jeunes — les pépites valent de l\'or');
  if (worldState.tendance === 'experience') lines.push('Les clubs chassent l\'expérience et la maturité');
  if (worldState.scandal_media) lines.push('Presse en mode chasseur — les scandales font la une');
  if (worldState.coupe_du_monde) lines.push('Année Coupe du Monde — hystérie des transferts');
  if (worldState.phase_europeenne) lines.push('Phase KO européenne — les valeurs s\'envolent');
  if (worldState.leagues_en_feu?.length) lines.push(`Ligues qui recrutent fort : ${worldState.leagues_en_feu.join(', ')}`);
  return lines;
};

export const getWorldStateOfferModifier = (worldState, player) => {
  if (!worldState) return 0;
  let modifier = 0;
  if (worldState.economie === 'boom') modifier += 0.14;
  if (worldState.economie === 'crise') modifier -= 0.12;
  if (worldState.coupe_du_monde) modifier += 0.18;
  if (worldState.phase_europeenne) modifier += 0.08;
  if (worldState.tendance === 'jeunes' && player?.age <= 23) modifier += 0.2;
  if (worldState.tendance === 'experience' && player?.age >= 29) modifier += 0.16;
  if (worldState.leagues_en_feu?.includes(player?.clubCountryCode)) modifier += 0.12;
  return modifier;
};

export const getWorldStateValueMultiplier = (worldState, player) => {
  if (!worldState) return 1;
  let mult = 1;
  if (worldState.economie === 'boom') mult *= 1.18;
  if (worldState.economie === 'crise') mult *= 0.82;
  if (worldState.tendance === 'jeunes' && player?.age <= 23) mult *= 1.3;
  if (worldState.tendance === 'experience' && player?.age >= 29) mult *= 1.22;
  if (worldState.coupe_du_monde) mult *= 1.12;
  return mult;
};

export const getWorldStateEventModifier = (worldState, event) => {
  if (!worldState) return 1;
  if (worldState.scandal_media && event.type === 'scandal') return 1.6;
  if (worldState.coupe_du_monde && (event.id === 'callup' || event.id === 'international_debut')) return 2.5;
  if (worldState.coupe_du_monde && event.id === 'world_cup_hero') return 4;
  if (worldState.phase_europeenne && event.id === 'hat_trick_cl') return 2.2;
  if (worldState.economie === 'boom' && event.id === 'sponsor') return 1.5;
  if (worldState.economie === 'crise' && event.id === 'sponsor') return 0.4;
  if (worldState.economie === 'crise' && event.id === 'brand_deal_lost') return 1.8;
  if (worldState.tendance === 'jeunes' && event.id === 'youth_breakthrough' && event.good) return 1.5;
  return 1;
};
