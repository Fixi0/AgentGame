export function getPlayerStarCount(rating = 0) {
  const value = Number(rating) || 0;
  if (value >= 176) return 5;
  if (value >= 161) return 4;
  if (value >= 146) return 3;
  if (value >= 126) return 2;
  return 1;
}

export function getPlayerStarsText(rating = 0) {
  const stars = getPlayerStarCount(rating);
  return `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
}

export function getPlayerLevelLabel(rating = 0) {
  const value = Number(rating) || 0;
  if (value >= 188) return 'Phénomène';
  if (value >= 176) return 'Élite';
  if (value >= 161) return 'Très fort';
  if (value >= 146) return 'Confirmé';
  if (value >= 126) return 'Promesse';
  return 'À développer';
}

export function getPlayerLevelText(rating = 0) {
  return `${getPlayerStarsText(rating)} · ${getPlayerLevelLabel(rating)}`;
}
