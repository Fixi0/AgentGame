const CARD_PRIORITY = {
  bronze: 1,
  silver: 2,
  gold: 3,
  elite: 4,
  future_star: 5,
  icon: 6,
  toty: 7,
  ballondor: 8,
};

export const CARD_EVOLUTION_ORDER = ['bronze', 'silver', 'gold', 'elite', 'future_star', 'icon', 'toty', 'ballondor'];

export const CARD_THEME = {
  bronze: { label: 'Bronze', rarity: 'bronze', glow: 'rgba(251, 146, 60, 0.3)', accent: '#fdba74' },
  silver: { label: 'Argent', rarity: 'silver', glow: 'rgba(226, 232, 240, 0.3)', accent: '#e2e8f0' },
  gold: { label: 'Or', rarity: 'gold', glow: 'rgba(250, 204, 21, 0.33)', accent: '#fde047' },
  elite: { label: 'Elite', rarity: 'elite', glow: 'rgba(245, 158, 11, 0.34)', accent: '#fbbf24' },
  future_star: { label: 'Future Star', rarity: 'future_star', glow: 'rgba(34, 211, 238, 0.42)', accent: '#22d3ee' },
  icon: { label: 'Icon', rarity: 'icon', glow: 'rgba(245, 208, 84, 0.36)', accent: '#f5d054' },
  toty: { label: 'TOTY', rarity: 'toty', glow: 'rgba(56, 189, 248, 0.52)', accent: '#38bdf8' },
  ballondor: { label: "Ballon d'Or", rarity: 'ballondor', glow: 'rgba(251, 191, 36, 0.54)', accent: '#facc15' },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function getCardStars(rating = 0) {
  const value = Number(rating) || 0;
  if (value >= 188) return 5;
  if (value >= 168) return 4;
  if (value >= 146) return 3;
  if (value >= 124) return 2;
  return 1;
}

export function getCardStarsText(rating = 0) {
  const stars = getCardStars(rating);
  return `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
}

function inferWonderkid(player = {}) {
  if (player.isWonderkid != null) return Boolean(player.isWonderkid);
  const age = Number(player.age ?? 99);
  const rating = Number(player.rating ?? 0);
  const potential = Number(player.potential ?? rating);
  return age <= 22 && rating >= 152 && potential >= rating + 12;
}

export function resolveCardType(player = {}) {
  const rating = Number(player.rating ?? 0);
  const hasBallonDor = Boolean(player.hasBallonDor || (player.ballonDorWins ?? 0) > 0);
  if (hasBallonDor) return 'ballondor';
  if (rating >= 195 || player.superstarGenerational) return 'toty';
  if (rating >= 190) return 'icon';
  if (rating >= 160) return inferWonderkid(player) ? 'future_star' : 'elite';
  if (rating >= 120) return 'elite';
  if (rating >= 80) return 'gold';
  if (rating >= 60) return 'silver';
  return 'bronze';
}

export function compareCardTypes(leftType = 'bronze', rightType = 'bronze') {
  return (CARD_PRIORITY[leftType] ?? 0) - (CARD_PRIORITY[rightType] ?? 0);
}

export function getCardEvolutionLabel(player = {}) {
  const rating = Number(player.rating ?? 0);
  if (rating >= 190) return 'Ascension Iconique';
  if (rating >= 160) return 'Ascension Premium';
  if (rating >= 120) return 'Ascension Elite';
  if (rating >= 80) return 'Ascension Confirmée';
  if (rating >= 60) return 'Ascension Montante';
  return 'Ascension Initiale';
}

export function withPlayerCardMeta(player = {}) {
  const resolvedType = resolveCardType(player);
  const theme = CARD_THEME[resolvedType] ?? CARD_THEME.bronze;
  const stars = clamp(Number(player.stars ?? getCardStars(player.rating)), 1, 5);
  const hasBallonDor = Boolean(player.hasBallonDor || (player.ballonDorWins ?? 0) > 0);

  return {
    ...player,
    hasBallonDor,
    isWonderkid: inferWonderkid(player),
    stars,
    cardType: resolvedType,
    cardRarity: theme.rarity,
    cardEvolution: getCardEvolutionLabel(player),
  };
}
