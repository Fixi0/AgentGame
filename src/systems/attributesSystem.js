/**
 * attributesSystem.js
 * ─────────────────────────────────────────────────────────────────
 * 17-stat player attributes system
 *
 * Attributes grouped by category:
 * - TECHNICAL (5): Pace, Shooting, Passing, Dribbling, Defense
 * - MENTAL (6): Positioning, Awareness, DecisionMaking, Consistency, Leadership, Determination
 * - PHYSICAL (4): Strength, Stamina, Agility, Balance
 * - GOALKEEPER (2): Handling, Distribution (only for GK position)
 */

// ── Attribute Definitions ────────────────────────────────────────────────────────

export const ATTRIBUTE_CATEGORIES = {
  TECHNICAL: 'technical',
  MENTAL: 'mental',
  PHYSICAL: 'physical',
  GOALKEEPER: 'goalkeeper',
};

export const ALL_ATTRIBUTES = {
  // Technical (5)
  pace: { category: 'technical', label: 'Vitesse', short: 'VIT' },
  shooting: { category: 'technical', label: 'Tir', short: 'TIR' },
  passing: { category: 'technical', label: 'Passe', short: 'PAS' },
  dribbling: { category: 'technical', label: 'Dribble', short: 'DRI' },
  defense: { category: 'technical', label: 'Défense', short: 'DEF' },

  // Mental (6)
  positioning: { category: 'mental', label: 'Positionnement', short: 'POS' },
  awareness: { category: 'mental', label: 'Conscience', short: 'CON' },
  decisionMaking: { category: 'mental', label: 'Décision', short: 'DEC' },
  consistency: { category: 'mental', label: 'Constance', short: 'CONST' },
  leadership: { category: 'mental', label: 'Leadership', short: 'LEAD' },
  determination: { category: 'mental', label: 'Détermination', short: 'DET' },

  // Physical (4)
  strength: { category: 'physical', label: 'Force', short: 'FOR' },
  stamina: { category: 'physical', label: 'Endurance', short: 'END' },
  agility: { category: 'physical', label: 'Agilité', short: 'AGI' },
  balance: { category: 'physical', label: 'Équilibre', short: 'EQU' },

  // Goalkeeper (2)
  handling: { category: 'goalkeeper', label: 'Gestion', short: 'GES' },
  distribution: { category: 'goalkeeper', label: 'Distribution', short: 'DIST' },
};

export const ATTRIBUTE_KEYS_BY_CATEGORY = {
  technical: ['pace', 'shooting', 'passing', 'dribbling', 'defense'],
  mental: ['positioning', 'awareness', 'decisionMaking', 'consistency', 'leadership', 'determination'],
  physical: ['strength', 'stamina', 'agility', 'balance'],
  goalkeeper: ['handling', 'distribution'],
};

// ── Attribute Generation ────────────────────────────────────────────────────────

/**
 * Generate base attributes for a player based on:
 * - Position (GK, DEF, MIL, ATT)
 * - Role (specific tactical role)
 * - Base rating and potential
 * - Role-specific attribute weights
 */
export const generatePlayerAttributes = (player, roleObj) => {
  if (!player || !roleObj) return getDefaultAttributes(player?.position);

  const baseRating = player.rating ?? 130;
  const potential = player.potential ?? 150;
  const position = player.position ?? 'MIL';
  const roleId = roleObj?.id ?? 'generic';

  // Base attribute scaling (0-20) from internal rating (0-200).
  const ratingScale = Math.max(0, Math.min(1, baseRating / 200));
  const potentialScale = Math.max(0, Math.min(1, potential / 200));

  // Position and role-specific attribute profiles
  const attributeProfile = getAttributeProfileForRole(position, roleId);

  // Generate attributes with variance
  const attributes = {};

  // Generate each attribute with role-specific weighting
  Object.entries(ALL_ATTRIBUTES).forEach(([key, def]) => {
    if (def.category === 'goalkeeper' && position !== 'GK') return;

    const weight = attributeProfile[key] ?? 0.5;
    const baseValue = Math.round(ratingScale * weight * 20);
    const variance = Math.random() * 4 - 2; // ±2 variance
    const value = Math.max(1, Math.min(20, baseValue + variance));

    attributes[key] = {
      current: value,
      potential: Math.round(potentialScale * weight * 20),
      born: value,
    };
  });

  return attributes;
};

/**
 * Get default empty attributes for a player
 */
export const getDefaultAttributes = (position = 'MIL') => {
  const defaults = {};

  Object.entries(ALL_ATTRIBUTES).forEach(([key, def]) => {
    if (def.category === 'goalkeeper' && position !== 'GK') return;

    defaults[key] = { current: 10, potential: 15, born: 10 };
  });

  return defaults;
};

/**
 * Get attribute profile weights (0-1) for a specific position and role
 */
const getAttributeProfileForRole = (position, roleId) => {
  const profiles = {
    GK: {
      pace: 0.4,
      shooting: 0,
      passing: 0.7,
      dribbling: 0.3,
      defense: 0.8,
      positioning: 0.9,
      awareness: 0.8,
      decisionMaking: 0.85,
      consistency: 0.9,
      leadership: 0.6,
      determination: 0.75,
      strength: 0.75,
      stamina: 0.7,
      agility: 0.5,
      balance: 0.6,
      handling: 0.95,
      distribution: 0.8,
    },
    DEF: {
      pace: 0.7,
      shooting: 0.3,
      passing: 0.6,
      dribbling: 0.5,
      defense: 0.95,
      positioning: 0.95,
      awareness: 0.85,
      decisionMaking: 0.8,
      consistency: 0.85,
      leadership: 0.5,
      determination: 0.8,
      strength: 0.85,
      stamina: 0.8,
      agility: 0.7,
      balance: 0.75,
    },
    MIL: {
      pace: 0.75,
      shooting: 0.6,
      passing: 0.85,
      dribbling: 0.8,
      defense: 0.6,
      positioning: 0.8,
      awareness: 0.85,
      decisionMaking: 0.85,
      consistency: 0.75,
      leadership: 0.6,
      determination: 0.75,
      strength: 0.65,
      stamina: 0.85,
      agility: 0.8,
      balance: 0.7,
    },
    ATT: {
      pace: 0.85,
      shooting: 0.95,
      passing: 0.7,
      dribbling: 0.9,
      defense: 0.3,
      positioning: 0.75,
      awareness: 0.75,
      decisionMaking: 0.75,
      consistency: 0.7,
      leadership: 0.4,
      determination: 0.8,
      strength: 0.65,
      stamina: 0.75,
      agility: 0.85,
      balance: 0.75,
    },
  };

  return profiles[position] ?? profiles.MIL;
};

// ── Rating Calculation from Attributes ───────────────────────────────────────────

/**
 * Calculate overall rating (0-200) from 17 attributes
 * Uses weighted average of categories:
 * - Technical: 35%
 * - Mental: 40%
 * - Physical: 25%
 */
export const calculateRatingFromAttributes = (attributes = {}) => {
  if (!attributes || Object.keys(attributes).length === 0) return 50;

  const weights = {
    technical: 0.35,
    mental: 0.40,
    physical: 0.25,
    goalkeeper: 0.15, // Lower weight if position is GK
  };

  const categoryAverages = {};

  Object.entries(ATTRIBUTE_KEYS_BY_CATEGORY).forEach(([category, keys]) => {
    const values = keys
      .filter(key => attributes[key])
      .map(key => attributes[key].current ?? 10);

    if (values.length > 0) {
      categoryAverages[category] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  });

  // Calculate weighted average
  let total = 0;
  let weightSum = 0;

  Object.entries(weights).forEach(([category, weight]) => {
    if (categoryAverages[category] != null) {
      total += (categoryAverages[category] / 20) * 200 * weight;
      weightSum += weight;
    }
  });

  return Math.round(total / weightSum) || 100;
};

// ── Attribute Development ────────────────────────────────────────────────────────

/**
 * Apply weekly development to player attributes
 * Based on:
 * - Current level vs potential
 * - Age (young players develop faster)
 * - Playing time and form
 * - Training/coaching effect
 */
export const developAttributes = (attributes, player, developmentBoost = 0) => {
  if (!attributes || !player) return attributes;

  const age = player.age ?? 20;
  const playingTime = player.seasonStats?.appearances ?? 0;
  const form = player.form ?? 50;

  // Development rate multipliers
  const ageMultiplier = age < 23 ? 1.2 : age < 28 ? 1.0 : age < 32 ? 0.6 : 0.2;
  const playtimeMultiplier = Math.min(1.5, 1 + (playingTime / 20));
  const formMultiplier = form / 50; // Form 50 = 1x, Form 100 = 2x
  const boostMultiplier = 1 + (developmentBoost ?? 0);

  const developedAttributes = {};

  Object.entries(attributes).forEach(([key, attr]) => {
    const gap = (attr.potential ?? attr.current) - attr.current;

    if (gap > 0) {
      const baseGrowth = gap > 5 ? 0.5 : gap > 2 ? 0.25 : 0.1;
      const growth = baseGrowth * ageMultiplier * playtimeMultiplier * formMultiplier * boostMultiplier;

      const newCurrent = Math.min(attr.potential, attr.current + growth);

      developedAttributes[key] = {
        ...attr,
        current: Number(newCurrent.toFixed(2)),
      };
    } else {
      developedAttributes[key] = attr;
    }
  });

  return developedAttributes;
};

// ── Export Summary ───────────────────────────────────────────────────────────────

export const getAttributeSummary = (attributes = {}) => {
  const summary = {};

  Object.entries(ATTRIBUTE_KEYS_BY_CATEGORY).forEach(([category, keys]) => {
    const values = keys
      .filter(key => attributes[key])
      .map(key => attributes[key].current ?? 10);

    summary[category] = values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
      : null;
  });

  return summary;
};
