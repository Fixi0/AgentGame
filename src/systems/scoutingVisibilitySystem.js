/**
 * Scouting Visibility System
 * Controls what players are visible and how much information is available
 * Implements "hidden potential" mechanic - discover player true value after signing
 */

import { clamp, rand } from '../utils/helpers';

// ─── VISIBILITY LEVELS ────────────────────────────────────────

export const VISIBILITY_LEVELS = {
  UNKNOWN: 0,      // Player not in network, invisible
  RUMOR: 1,        // Name only, no stats
  SCOUTED: 2,      // Basic info (age, position, club)
  ANALYZED: 3,     // Stats visible but blurry (+/- uncertainty)
  EVALUATED: 4,    // Full stats visible, no potential
  SIGNED: 5,       // Full transparency after signature
};

// ─── VISIBILITY COSTS ────────────────────────────────────────

export const VISIBILITY_COSTS = {
  [VISIBILITY_LEVELS.RUMOR]: 0,           // Free (just a name)
  [VISIBILITY_LEVELS.SCOUTED]: 3000,      // Scout basic info
  [VISIBILITY_LEVELS.ANALYZED]: 8000,     // Deep scout analysis
  [VISIBILITY_LEVELS.EVALUATED]: 15000,   // Full pre-signing evaluation
  [VISIBILITY_LEVELS.SIGNED]: 0,          // Automatic after signing
};

// ─── VISIBILITY FACTORS ────────────────────────────────────────

/**
 * Base visibility depends on:
 * - Agent reputation
 * - Number of scouts
 * - Player's current club tier
 * - Player's notoriety
 */
export const getBaseVisibility = (player, state = {}) => {
  let visibility = VISIBILITY_LEVELS.UNKNOWN;

  // Tier 1 clubs = more visible (big clubs)
  if (player.clubTier === 1) visibility = Math.max(visibility, VISIBILITY_LEVELS.RUMOR);
  if (player.clubTier === 2) visibility = Math.max(visibility, VISIBILITY_LEVELS.RUMOR);

  // High rating = more visible (famous players)
  if (player.rating >= 85) visibility = Math.max(visibility, VISIBILITY_LEVELS.SCOUTED);
  if (player.rating >= 80) visibility = Math.max(visibility, VISIBILITY_LEVELS.RUMOR);

  // Agent reputation gives visibility
  const reputation = state.reputation ?? 0;
  if (reputation >= 200) visibility = Math.max(visibility, VISIBILITY_LEVELS.SCOUTED);
  if (reputation >= 400) visibility = Math.max(visibility, VISIBILITY_LEVELS.ANALYZED);
  if (reputation >= 700) visibility = Math.max(visibility, VISIBILITY_LEVELS.EVALUATED);

  // Scouts give visibility
  const scoutCount = (state.staff ?? []).filter((s) => s.role === 'scout').length;
  if (scoutCount >= 1) visibility = Math.max(visibility, VISIBILITY_LEVELS.SCOUTED);
  if (scoutCount >= 2) visibility = Math.max(visibility, VISIBILITY_LEVELS.ANALYZED);
  if (scoutCount >= 3) visibility = Math.max(visibility, VISIBILITY_LEVELS.EVALUATED);

  // Contacts with club improve visibility
  const clubRelation = state.clubRelations?.[player.club] ?? 0;
  if (clubRelation >= 50) visibility = Math.max(visibility, VISIBILITY_LEVELS.SCOUTED);
  if (clubRelation >= 80) visibility = Math.max(visibility, VISIBILITY_LEVELS.ANALYZED);

  return visibility;
};

/**
 * Visibility can be increased by spending money on scouts
 */
export const improveVisibility = (currentLevel, scoutMoney = 0) => {
  let newLevel = currentLevel;
  let spent = 0;

  if (scoutMoney >= VISIBILITY_COSTS[VISIBILITY_LEVELS.SCOUTED] && currentLevel < VISIBILITY_LEVELS.SCOUTED) {
    newLevel = VISIBILITY_LEVELS.SCOUTED;
    spent = VISIBILITY_COSTS[VISIBILITY_LEVELS.SCOUTED];
  }
  if (scoutMoney >= spent + VISIBILITY_COSTS[VISIBILITY_LEVELS.ANALYZED] && currentLevel < VISIBILITY_LEVELS.ANALYZED) {
    newLevel = VISIBILITY_LEVELS.ANALYZED;
    spent += VISIBILITY_COSTS[VISIBILITY_LEVELS.ANALYZED];
  }
  if (
    scoutMoney >= spent + VISIBILITY_COSTS[VISIBILITY_LEVELS.EVALUATED] &&
    currentLevel < VISIBILITY_LEVELS.EVALUATED
  ) {
    newLevel = VISIBILITY_LEVELS.EVALUATED;
    spent += VISIBILITY_COSTS[VISIBILITY_LEVELS.EVALUATED];
  }

  return { newLevel, spent };
};

// ─── VISIBLE PLAYER INFO ────────────────────────────────────────

/**
 * Return only the information player visibility allows
 */
export const getVisiblePlayerInfo = (player, visibilityLevel) => {
  const base = {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
  };

  if (visibilityLevel < VISIBILITY_LEVELS.RUMOR) {
    return { ...base, visibility: 'UNKNOWN', visible: false };
  }

  if (visibilityLevel === VISIBILITY_LEVELS.RUMOR) {
    return {
      ...base,
      club: player.club,
      position: player.position,
      age: '?', // Age is hidden
      visibility: 'RUMOR',
      visible: true,
      hint: 'Joueur repéré - peu d\'infos',
    };
  }

  if (visibilityLevel === VISIBILITY_LEVELS.SCOUTED) {
    return {
      ...base,
      club: player.club,
      position: player.position,
      age: player.age,
      countryFlag: player.countryFlag,
      visibility: 'SCOUTED',
      visible: true,
      hint: 'Info basique collectée',
    };
  }

  if (visibilityLevel === VISIBILITY_LEVELS.ANALYZED) {
    // Stats visible but BLURRY - show +/- uncertainty
    const uncertainty = rand(2, 6);
    const blurryRating = addUncertainty(player.rating, uncertainty);

    return {
      ...base,
      club: player.club,
      position: player.position,
      age: player.age,
      countryFlag: player.countryFlag,
      rating: blurryRating,
      ratingUncertainty: uncertainty,
      form: addUncertainty(player.form ?? 50, 8),
      moral: addUncertainty(player.moral ?? 50, 8),
      attributes: getBlurryAttributes(player.attributes),
      potential: '?', // Hidden
      visibility: 'ANALYZED',
      visible: true,
      hint: `Analyse complète (±${uncertainty} de marge d'erreur)`,
    };
  }

  if (visibilityLevel === VISIBILITY_LEVELS.EVALUATED) {
    // Full stats except potential is still hidden
    return {
      ...base,
      club: player.club,
      position: player.position,
      age: player.age,
      countryFlag: player.countryFlag,
      rating: player.rating,
      form: player.form,
      moral: player.moral,
      attributes: player.attributes,
      seasonStats: player.seasonStats,
      potential: '?', // Still hidden - BIG risk
      visibility: 'EVALUATED',
      visible: true,
      hint: 'Stats visibles - potentiel inconnu',
    };
  }

  // VISIBILITY_LEVELS.SIGNED - Full transparency
  return {
    ...player,
    potential: player.potential, // Now visible
    visibility: 'SIGNED',
    visible: true,
    hint: 'Potentiel réel découvert',
  };
};

// ─── HIDDEN POTENTIAL DISCOVERY ────────────────────────────────────────

/**
 * When player is signed, reveal hidden potential
 * Potential can be HIGHER or LOWER than rating
 */
export const revealPlayerPotential = (player) => {
  if (player.potential != null) {
    return player; // Already revealed
  }

  // Potential is determined by attributes, not visible until signing
  const attributeAverage = Object.values(player.attributes ?? {})
    .filter((a) => a?.current)
    .reduce((sum, a) => sum + a.current, 0) / 17;

  const basePotential = Math.min(100, attributeAverage * 5 + player.rating * 0.3 + rand(-5, 12));

  // Potential can be SURPRISING:
  // - Young prospect (18-23) might have 85+ potential hidden
  // - Older player (30+) might peak at 72 even if rating 75
  const ageModifier = player.age <= 23 ? rand(2, 8) : player.age >= 30 ? rand(-8, -2) : rand(-3, 5);

  const revealedPotential = clamp(basePotential + ageModifier, player.rating, 100);

  return {
    ...player,
    potential: revealedPotential,
    potentialRevealed: true,
    potentialSurprise: revealedPotential - player.rating,
  };
};

// ─── VISIBILITY DECAY ────────────────────────────────────────

/**
 * Visibility decays over time if player not monitored
 * Keep scouts active to maintain visibility
 */
export const decayVisibility = (visibilityLevel, weeksSinceScout = 0) => {
  if (visibilityLevel === VISIBILITY_LEVELS.SIGNED) return visibilityLevel; // Never decay after signed

  const decayPerWeek = 0.1; // 10% per week
  const decayAmount = Math.floor(weeksSinceScout * decayPerWeek);

  return Math.max(VISIBILITY_LEVELS.RUMOR, visibilityLevel - decayAmount);
};

// ─── UTILITY FUNCTIONS ────────────────────────────────────────

const addUncertainty = (value, uncertainty) => {
  const delta = rand(-uncertainty, uncertainty);
  return clamp(value + delta, 0, 100);
};

const getBlurryAttributes = (attributes = {}) => {
  const blurry = {};
  Object.entries(attributes).forEach(([key, attr]) => {
    if (!attr?.current) {
      blurry[key] = attr;
      return;
    }
    const uncertainty = rand(1, 3);
    blurry[key] = {
      ...attr,
      current: addUncertainty(attr.current, uncertainty),
      uncertainty,
    };
  });
  return blurry;
};

// ─── SCOUNTING NETWORK ────────────────────────────────────────

/**
 * Scouting network expands available players
 * More scouts = more players visible
 */
export const getAvailablePlayers = (allPlayers = [], state = {}) => {
  const scoutCount = (state.staff ?? []).filter((s) => s.role === 'scout').length;
  const reputation = state.reputation ?? 0;

  // Base visibility threshold
  let minVisibility = VISIBILITY_LEVELS.UNKNOWN;
  if (scoutCount >= 1) minVisibility = VISIBILITY_LEVELS.RUMOR;
  if (scoutCount >= 2) minVisibility = VISIBILITY_LEVELS.RUMOR;
  if (scoutCount >= 3) minVisibility = VISIBILITY_LEVELS.SCOUTED;

  if (reputation >= 200) minVisibility = Math.max(minVisibility, VISIBILITY_LEVELS.SCOUTED);
  if (reputation >= 400) minVisibility = Math.max(minVisibility, VISIBILITY_LEVELS.ANALYZED);

  // Filter available players
  return allPlayers
    .filter((player) => {
      const visibility = getBaseVisibility(player, state);
      return visibility >= minVisibility;
    })
    .map((player) => ({
      ...player,
      visibility: getBaseVisibility(player, state),
    }));
};

// ─── MARKET VISIBILITY DISPLAY ────────────────────────────────────────

export const formatVisibilityLabel = (level) => {
  switch (level) {
    case VISIBILITY_LEVELS.UNKNOWN:
      return '❓ Invisible';
    case VISIBILITY_LEVELS.RUMOR:
      return '👁️ Rumeur';
    case VISIBILITY_LEVELS.SCOUTED:
      return '🔍 Scout';
    case VISIBILITY_LEVELS.ANALYZED:
      return '📊 Analysé';
    case VISIBILITY_LEVELS.EVALUATED:
      return '✓ Évalué';
    case VISIBILITY_LEVELS.SIGNED:
      return '✅ Signé';
    default:
      return '?';
  }
};

export const formatVisibilityHint = (level) => {
  const hints = {
    [VISIBILITY_LEVELS.UNKNOWN]: 'Vous ne connaissez pas ce joueur',
    [VISIBILITY_LEVELS.RUMOR]: 'Nom uniquement - dépensez pour en savoir plus',
    [VISIBILITY_LEVELS.SCOUTED]: 'Infos basiques collectées',
    [VISIBILITY_LEVELS.ANALYZED]: 'Stats visibles avec marge d\'erreur',
    [VISIBILITY_LEVELS.EVALUATED]: 'Stats complètes - potentiel caché',
    [VISIBILITY_LEVELS.SIGNED]: 'Potentiel réel découvert',
  };
  return hints[level] ?? 'Statut inconnu';
};

export default {
  VISIBILITY_LEVELS,
  VISIBILITY_COSTS,
  getBaseVisibility,
  improveVisibility,
  getVisiblePlayerInfo,
  revealPlayerPotential,
  decayVisibility,
  getAvailablePlayers,
  formatVisibilityLabel,
  formatVisibilityHint,
};
