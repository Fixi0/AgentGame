const FULL_LEVEL = 'full';
const SIMPLIFIED_LEVEL = 'simplified';
const ULTRA_LEVEL = 'ultra';

export const SIMULATION_LEVELS = {
  FULL: FULL_LEVEL,
  SIMPLIFIED: SIMPLIFIED_LEVEL,
  ULTRA: ULTRA_LEVEL,
};

export const getPlayerSimulationLevel = (player = {}, { lockedPlayerIds = new Set() } = {}) => {
  if (!player?.id) return FULL_LEVEL;
  if (lockedPlayerIds.has(player.id)) return FULL_LEVEL;
  if ((player.trust ?? 50) < 38 || (player.moral ?? 50) < 38) return FULL_LEVEL;
  if ((player.rating ?? 0) >= 170 || (player.potential ?? 0) >= 182) return FULL_LEVEL;
  if ((player.age ?? 24) >= 31 || (player.rating ?? 0) >= 150) return SIMPLIFIED_LEVEL;
  return ULTRA_LEVEL;
};

export const applySimulationLevelToMatchResult = (matchResult = null, level = FULL_LEVEL) => {
  if (!matchResult || level === FULL_LEVEL) return matchResult;
  if (level === ULTRA_LEVEL) {
    return {
      ...matchResult,
      goals: Math.min(matchResult.goals ?? 0, 1),
      assists: Math.min(matchResult.assists ?? 0, 1),
      keyPasses: Math.min(matchResult.keyPasses ?? 0, 2),
      tackles: Math.min(matchResult.tackles ?? 0, 2),
      matchRating: Number(((matchResult.matchRating ?? 6.6) * 0.8 + 1.25).toFixed(1)),
    };
  }
  return {
    ...matchResult,
    keyPasses: Math.min(matchResult.keyPasses ?? 0, 3),
    tackles: Math.min(matchResult.tackles ?? 0, 3),
    matchRating: Number(((matchResult.matchRating ?? 6.6) * 0.88 + 0.8).toFixed(1)),
  };
};

