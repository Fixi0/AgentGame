/**
 * Player Personality Traits System
 * FM26-style mental attributes that define how a player behaves and reacts
 * Values range from 1-20 (like FM26)
 */

// ─── PERSONALITY TRAITS DEFINITIONS ────────────────────────────────────────

export const PERSONALITY_TRAITS = {
  adaptability: {
    label: 'Adaptabilité',
    icon: '🔄',
    description: 'Rapidité d\'adaptation à un nouvel environnement',
    min: 1,
    max: 20,
  },
  ambition: {
    label: 'Ambition',
    icon: '🎯',
    description: 'Désir de succès et d\'accomplissement',
    min: 1,
    max: 20,
  },
  controversy: {
    label: 'Controverse',
    icon: '⚠️',
    description: 'Tendance à attirer l\'attention négative',
    min: 1,
    max: 20,
    inverted: true, // Higher = worse
  },
  loyalty: {
    label: 'Loyauté',
    icon: '💙',
    description: 'Engagement envers son club actuel',
    min: 1,
    max: 20,
  },
  pressure: {
    label: 'Pression',
    icon: '⚡',
    description: 'Performance sous stress en matchs décisifs',
    min: 1,
    max: 20,
  },
  professionalism: {
    label: 'Professionnalisme',
    icon: '💼',
    description: 'Éthique de travail et dévouement à l\'amélioration',
    min: 1,
    max: 20,
  },
  sportsmanship: {
    label: 'Sportivité',
    icon: '🤝',
    description: 'Fair-play et respect des règles',
    min: 1,
    max: 20,
  },
  temperament: {
    label: 'Tempérament',
    icon: '🧠',
    description: 'Contrôle émotionnel et réaction à la frustration',
    min: 1,
    max: 20,
  },
  consistency: {
    label: 'Constance',
    icon: '📊',
    description: 'Régularité de performance',
    min: 1,
    max: 20,
  },
  importantMatches: {
    label: 'Grands Matchs',
    icon: '🏆',
    description: 'Performance dans les matchs cruciaux et finales',
    min: 1,
    max: 20,
  },
  injuryProneness: {
    label: 'Fragilité',
    icon: '🤕',
    description: 'Fréquence des blessures',
    min: 1,
    max: 20,
    inverted: true, // Higher = more injuries
  },
  versatility: {
    label: 'Polyvalence',
    icon: '🔀',
    description: 'Capacité à jouer dans d\'autres rôles/postes',
    min: 1,
    max: 20,
  },
};

// ─── ABILITY RANGES ────────────────────────────────────────────────────────────

export const ABILITY_RANGES = {
  ca: {
    label: 'Capacité Actuelle',
    short: 'CA',
    icon: '⭐',
    description: 'Niveau de compétence actuel du joueur',
    min: 1,
    max: 200,
  },
  pa: {
    label: 'Potentiel',
    short: 'PA',
    icon: '✨',
    description: 'Niveau maximum de développement',
    min: 1,
    max: 200,
  },
};

// ─── TRAIT ASSESSMENT ────────────────────────────────────────────────────────────

/**
 * Assess or generate player personality traits based on attributes
 */
export const assessPlayerPersonality = (player = {}) => {
  const traits = {};

  // Adaptability: based on dribbling + balance + age (younger more adaptable)
  traits.adaptability = Math.min(20, Math.max(1,
    ((player.attributes?.dribbling?.current ?? 10) / 5) +
    ((player.attributes?.balance?.current ?? 10) / 5) +
    (player.age <= 24 ? 4 : player.age <= 28 ? 2 : 0)
  ));

  // Ambition: based on leadership + mentality + potential
  traits.ambition = Math.min(20, Math.max(1,
    ((player.attributes?.leadership?.current ?? 10) / 4) +
    ((player.attributes?.mentality?.current ?? 10) / 4) +
    ((player.potential ?? player.rating) >= 80 ? 4 : 0)
  ));

  // Controversy: inverse of composure + professionalism
  traits.controversy = Math.max(1, Math.min(20,
    20 - ((player.attributes?.composure ?? 15) / 2) - ((player.attributes?.concentration?.current ?? 10) / 3)
  ));

  // Loyalty: based on age + contract length + club history
  traits.loyalty = Math.min(20, Math.max(1,
    (player.contractWeeksLeft ?? 52) / 26 +
    (player.age >= 28 ? 4 : 0) +
    (player.club === player.previousClub ? 3 : 0)
  ));

  // Pressure: based on composure + concentration + experience (form helps)
  traits.pressure = Math.min(20, Math.max(1,
    ((player.attributes?.composure ?? 15) / 3) +
    ((player.attributes?.concentration?.current ?? 10) / 4) +
    (player.form ?? 50) / 20
  ));

  // Professionalism: based on consistency + discipline + leadership
  traits.professionalism = Math.min(20, Math.max(1,
    ((player.attributes?.concentration?.current ?? 10) / 3) +
    ((player.attributes?.teamwork?.current ?? 10) / 4) +
    ((player.attributes?.leadership?.current ?? 10) / 4)
  ));

  // Sportsmanship: inverse of controversy + based on agility (technical players)
  traits.sportsmanship = Math.min(20, Math.max(1,
    15 - (traits.controversy / 2) +
    ((player.attributes?.agility?.current ?? 10) / 20)
  ));

  // Temperament: based on composure + concentration (emotional control)
  traits.temperament = Math.min(20, Math.max(1,
    ((player.attributes?.composure ?? 15) / 2.5) +
    ((player.attributes?.concentration?.current ?? 10) / 4)
  ));

  // Consistency: based on form stability + professionalism
  traits.consistency = Math.min(20, Math.max(1,
    ((player.attributes?.concentration?.current ?? 10) / 3) +
    (Math.abs((player.form ?? 50) - 50) <= 20 ? 8 : 4) +
    ((player.attributes?.mentality?.current ?? 10) / 3)
  ));

  // Important Matches: based on pressure + mentality + leadership
  traits.importantMatches = Math.min(20, Math.max(1,
    traits.pressure * 0.6 +
    ((player.attributes?.leadership?.current ?? 10) / 4) +
    ((player.form ?? 50) >= 60 ? 4 : 0)
  ));

  // Injury Proneness: inverse of strength + stamina + age
  traits.injuryProneness = Math.max(1, Math.min(20,
    20 - ((player.attributes?.strength?.current ?? 10) / 3) -
    ((player.attributes?.stamina?.current ?? 10) / 3) -
    (player.age <= 23 ? 2 : 0) +
    (player.injuryHistory?.length ?? 0) * 2
  ));

  // Versatility: based on multiple attribute levels and position flexibility
  const attrVariance = Object.values(player.attributes ?? {})
    .filter(a => a?.current)
    .map(a => a.current);
  const avgAttr = attrVariance.length ? attrVariance.reduce((a, b) => a + b) / attrVariance.length : 10;
  traits.versatility = Math.min(20, Math.max(1,
    (Math.max(...attrVariance) - Math.min(...attrVariance)) / 5 +
    4
  ));

  return traits;
};

/**
 * Get CA/PA (Current Ability / Potential Ability)
 */
export const getPlayerAbility = (player = {}) => {
  return {
    ca: Math.round(player.rating * 2), // Convert rating to CA (0-100 → 1-200)
    pa: Math.round((player.potential ?? player.rating) * 2),
  };
};

/**
 * Get trait color based on value (1-20 scale)
 */
export const getTraitColor = (value, inverted = false) => {
  const normalized = value / 20;
  if (inverted) {
    // Inverted: higher value = worse color
    if (normalized >= 0.75) return '#b42318'; // Red: bad
    if (normalized >= 0.5) return '#8a6f1f'; // Orange: moderate
    return '#00a676'; // Green: good
  } else {
    // Normal: higher value = better color
    if (normalized >= 0.75) return '#00a676'; // Green: good
    if (normalized >= 0.5) return '#8a6f1f'; // Orange: moderate
    return '#b42318'; // Red: bad
  }
};

/**
 * Format trait value for display with assessment
 */
export const formatTraitValue = (value, max = 20) => {
  const percentage = (value / max) * 100;
  if (percentage >= 75) return 'Excellent';
  if (percentage >= 60) return 'Bon';
  if (percentage >= 40) return 'Moyen';
  return 'Faible';
};

export default {
  PERSONALITY_TRAITS,
  ABILITY_RANGES,
  assessPlayerPersonality,
  getPlayerAbility,
  getTraitColor,
  formatTraitValue,
};
