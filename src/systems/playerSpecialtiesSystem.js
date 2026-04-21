/**
 * Player Specialties System
 * Defines what makes each player unique - their special abilities and roles
 * Displayed in player detail modal
 */

export const SPECIALTY_CATEGORIES = {
  set_pieces: '⚽ Coups de pied arrêtés',
  finishing: '🎯 Finition',
  playmaking: '🤝 Jeu collectif',
  physicality: '💪 Physique',
  leadership: '🦁 Leadership',
  mentality: '🧠 Mentalité',
  technical: '✨ Technique',
  defensive: '🛡️ Défense',
};

// ─── SPECIALTY DEFINITIONS ────────────────────────────────────────

export const SPECIALTIES = {
  // Set Pieces
  free_kick_specialist: {
    category: 'set_pieces',
    label: 'Tireur de coups francs',
    icon: '⚽',
    requirement: (p) => p.attributes?.shooting?.current >= 17 && p.attributes?.passing?.current >= 16,
    bonus: { passing: 2, awareness: 1 },
  },
  penalty_taker: {
    category: 'set_pieces',
    label: 'Penaltiste',
    icon: '🎯',
    requirement: (p) => p.attributes?.shooting?.current >= 18 && p.attributes?.composure >= 16,
    bonus: { shooting: 3, mentality: 2 },
  },
  corner_specialist: {
    category: 'set_pieces',
    label: 'Spécialiste des corners',
    icon: '📍',
    requirement: (p) => p.attributes?.passing?.current >= 17 && p.position !== 'GK',
    bonus: { passing: 2 },
  },

  // Finishing
  clinical_finisher: {
    category: 'finishing',
    label: 'Finisseur clinique',
    icon: '🎯',
    requirement: (p) => p.attributes?.shooting?.current >= 19 && p.attributes?.composure >= 15,
    bonus: { shooting: 2 },
    description: 'Transforme peu de occasions en buts',
  },
  poacher: {
    category: 'finishing',
    label: 'Opportuniste',
    icon: '🔥',
    requirement: (p) => p.attributes?.positioning?.current >= 17 && p.position === 'ATT',
    bonus: { awareness: 2 },
  },
  volleys: {
    category: 'finishing',
    label: 'Maître de la volée',
    icon: '💥',
    requirement: (p) => p.attributes?.shooting?.current >= 18 && p.attributes?.balance?.current >= 16,
    bonus: { shooting: 1 },
  },

  // Playmaking
  playmaker: {
    category: 'playmaking',
    label: 'Créateur de jeu',
    icon: '🤝',
    requirement: (p) => p.attributes?.passing?.current >= 18 && p.attributes?.awareness?.current >= 17,
    bonus: { passing: 2, awareness: 1 },
  },
  assist_machine: {
    category: 'playmaking',
    label: 'Machine à passes',
    icon: '💫',
    requirement: (p) => p.attributes?.passing?.current >= 17 && p.attributes?.decisiveness >= 16,
    bonus: { passing: 2 },
  },
  chance_creator: {
    category: 'playmaking',
    label: 'Créateur d\'occasions',
    icon: '✨',
    requirement: (p) => p.attributes?.dribbling?.current >= 17 && p.attributes?.awareness?.current >= 16,
    bonus: { awareness: 1 },
  },
  through_ball_specialist: {
    category: 'playmaking',
    label: 'Spécialiste de la passe pénétrante',
    icon: '🎯',
    requirement: (p) => p.attributes?.passing?.current >= 18 && p.attributes?.vision >= 16,
    bonus: { passing: 2 },
  },

  // Physicality
  strong_physical: {
    category: 'physicality',
    label: 'Force physique',
    icon: '💪',
    requirement: (p) => p.attributes?.strength?.current >= 17 && p.attributes?.balance?.current >= 15,
    bonus: { strength: 1 },
  },
  quick: {
    category: 'physicality',
    label: 'Vitesse éclair',
    icon: '⚡',
    requirement: (p) => p.attributes?.pace?.current >= 18,
    bonus: { pace: 1 },
  },
  injury_prone: {
    category: 'physicality',
    label: 'Fragile physiquement',
    icon: '🤕',
    requirement: (p) => p.injuryHistory?.length >= 2 || p.injuryRisk >= 65,
    bonus: {},
    penalty: { stamina: 1 },
    negative: true,
  },
  aerially_dominant: {
    category: 'physicality',
    label: 'Dominant aérien',
    icon: '🏀',
    requirement: (p) => p.attributes?.jumping?.current >= 17 && p.attributes?.strength?.current >= 16,
    bonus: { strength: 1 },
  },

  // Leadership
  captain: {
    category: 'leadership',
    label: 'Capitaine',
    icon: '🦁',
    requirement: (p) => p.attributes?.leadership?.current >= 17 && (p.age >= 24 || p.rating >= 160),
    bonus: { leadership: 2 },
  },
  leader: {
    category: 'leadership',
    label: 'Leader naturel',
    icon: '👑',
    requirement: (p) => p.attributes?.leadership?.current >= 16,
    bonus: { leadership: 1 },
  },
  dressing_room_leader: {
    category: 'leadership',
    label: 'Leader vestiaire',
    icon: '🎙️',
    requirement: (p) => p.personality === 'leader' && p.attributes?.leadership?.current >= 15,
    bonus: { leadership: 1 },
  },

  // Mentality
  clutch_player: {
    category: 'mentality',
    label: 'Joueur Clutch',
    icon: '⚡',
    requirement: (p) => p.attributes?.mentality?.current >= 17 && (p.form ?? 50) >= 70,
    bonus: { mentality: 1 },
  },
  mental_strength: {
    category: 'mentality',
    label: 'Mentalité de champion',
    icon: '🔥',
    requirement: (p) => p.attributes?.mentality?.current >= 17 && p.moral >= 75,
    bonus: { mentality: 1 },
  },
  resilient: {
    category: 'mentality',
    label: 'Resilient',
    icon: '🌱',
    requirement: (p) => p.personality === 'professionnel' && p.potential > p.rating + 5,
    bonus: { mentality: 1 },
  },

  // Technical
  left_foot: {
    category: 'technical',
    label: 'Pied gauche',
    icon: '👣',
    requirement: (p) => p.dominantFoot === 'left',
    description: 'Peut jouer avec excellence du pied gauche',
  },
  ambidextrous: {
    category: 'technical',
    label: 'Ambiextrous',
    icon: '⚖️',
    requirement: (p) => p.attributes?.agility?.current >= 16 && p.dominantFoot === 'both',
    bonus: { agility: 1 },
  },
  ball_control: {
    category: 'technical',
    label: 'Contrôle du ballon',
    icon: '🎪',
    requirement: (p) => p.attributes?.dribbling?.current >= 17,
    bonus: { dribbling: 1 },
  },
  technical_ability: {
    category: 'technical',
    label: 'Technique supérieure',
    icon: '✨',
    requirement: (p) => p.attributes?.dribbling?.current >= 18 && p.attributes?.balance?.current >= 17,
    bonus: { dribbling: 1 },
  },

  // Defensive
  solid_defender: {
    category: 'defensive',
    label: 'Défenseur solide',
    icon: '🛡️',
    requirement: (p) => p.position === 'DEF' && p.attributes?.defense?.current >= 17,
    bonus: { defense: 1 },
  },
  clean_sheet_specialist: {
    category: 'defensive',
    label: 'Spécialiste des matchs sans encaisser',
    icon: '🟢',
    requirement: (p) => p.position === 'DEF' && p.attributes?.positioning?.current >= 17,
    bonus: { positioning: 1 },
  },
  distributing_goalkeeper: {
    category: 'defensive',
    label: 'Gardien avec relance',
    icon: '🤖',
    requirement: (p) => p.position === 'GK' && p.attributes?.distribution?.current >= 16,
    bonus: { distribution: 1 },
  },
  sweeper: {
    category: 'defensive',
    label: 'Libéro',
    icon: '🧹',
    requirement: (p) => p.position === 'DEF' && p.attributes?.positioning?.current >= 17 && p.attributes?.awareness?.current >= 16,
    bonus: { positioning: 1 },
  },
};

// ─── SPECIALTY DETECTION ────────────────────────────────────────

/**
 * Get all specialties player currently qualifies for
 */
export const getPlayerSpecialties = (player = {}) => {
  if (!player.attributes) return [];

  return Object.entries(SPECIALTIES)
    .filter(([_, spec]) => spec.requirement(player))
    .map(([key, spec]) => ({
      key,
      ...spec,
      bonus: spec.bonus || {},
      penalty: spec.penalty || {},
    }));
};

/**
 * Get primary specialty (most relevant for position)
 */
export const getPrimarySpecialty = (player = {}) => {
  const specialties = getPlayerSpecialties(player);
  if (!specialties.length) return null;

  // Position-based priority
  const positionPriority = {
    ATT: ['penalty_taker', 'clinical_finisher', 'poacher'],
    MIL: ['playmaker', 'assist_machine', 'through_ball_specialist'],
    DEF: ['solid_defender', 'sweeper', 'aerially_dominant'],
    GK: ['distributing_goalkeeper', 'clean_sheet_specialist'],
  };

  const priorityList = positionPriority[player.position] || [];
  const primary = specialties.find((s) => priorityList.includes(s.key));
  return primary || specialties[0];
};

/**
 * Format specialties for display
 */
export const formatSpecialties = (specialties = []) => {
  if (!specialties.length) return 'Aucune spécialité majeure';
  return specialties.map((s) => `${s.icon} ${s.label}`).join(' · ');
};

/**
 * Get specialty description/tooltip
 */
export const getSpecialtyDescription = (specialty) => {
  if (!specialty) return '';
  return specialty.description || `Bonus: ${Object.entries(specialty.bonus || {})
    .map(([key, val]) => `+${val} ${key}`)
    .join(', ')}`;
};

// ─── HIDDEN TRAITS ────────────────────────────────────────────

export const HIDDEN_TRAITS = {
  clutch_player: '⚡ Joueur Clutch — irremplaçable dans les grands matchs',
  locker_room_leader: '🦁 Leader Vestiaire — sa présence booste le groupe',
  silent_perfectionist: '🧊 Perfectionniste Silencieux — confiance extrêmement stable',
  social_media_magnet: '📱 Star des Réseaux — valeur de marque en hausse constante',
  late_bloomer: '🌱 Révélation Tardive — le meilleur reste à venir',
  glass_cannon: '💥 Verre et Feu — immense talent, fragilité physique',
  mentality_monster: '🔥 Mentale de Champion — ne lâche jamais',
  tactical_genius: '🧠 Génie Tactique — s\'adapte à tous les systèmes',
};

export default {
  SPECIALTY_CATEGORIES,
  SPECIALTIES,
  HIDDEN_TRAITS,
  getPlayerSpecialties,
  getPrimarySpecialty,
  formatSpecialties,
  getSpecialtyDescription,
};
