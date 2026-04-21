/**
 * injurySystem.js
 * ─────────────────────────────────────────────────────────────────
 * Player injury tracking and recovery system
 *
 * Handles:
 * - Injury creation and severity levels
 * - Recovery time estimation
 * - Playing time impact
 * - Reinjury risk
 */

// ── Injury Types & Severity ──────────────────────────────────────────────

export const INJURY_TYPES = {
  MINOR_MUSCLE: { label: 'Petite élongation', daysMin: 3, daysMax: 7, severity: 1 },
  MUSCLE_STRAIN: { label: 'Claquage musculaire', daysMin: 7, daysMax: 14, severity: 2 },
  MUSCLE_TEAR: { label: 'Déchirure musculaire', daysMin: 14, daysMax: 35, severity: 3 },
  LIGAMENT_STRAIN: { label: 'Entorse ligamentaire', daysMin: 10, daysMax: 21, severity: 2 },
  LIGAMENT_TEAR: { label: 'Rupture ligamentaire', daysMin: 28, daysMax: 90, severity: 4 },
  FRACTURE: { label: 'Fracture', daysMin: 35, daysMax: 84, severity: 4 },
  CONCUSSION: { label: 'Commotion cérébrale', daysMin: 3, daysMax: 14, severity: 2 },
  BACK_INJURY: { label: 'Blessure au dos', daysMin: 14, daysMax: 56, severity: 3 },
  CHRONIC: { label: 'Blessure chronique', daysMin: 21, daysMax: 120, severity: 3 },
};

export const INJURY_STATUS = {
  ACTIVE: 'active',
  RECOVERING: 'recovering',
  RESOLVED: 'resolved',
  CHRONIC: 'chronic',
};

// ── Injury Creation ──────────────────────────────────────────────────────

/**
 * Create an injury record for a player
 */
export const createInjury = (player, injuryType = 'MUSCLE_STRAIN', matchInfo = null) => {
  if (!player) return null;

  const injuryDef = INJURY_TYPES[injuryType] || INJURY_TYPES.MUSCLE_STRAIN;
  const recoveryDays = Math.floor(Math.random() * (injuryDef.daysMax - injuryDef.daysMin + 1)) + injuryDef.daysMin;

  return {
    id: `injury_${player.id}_${Date.now()}`,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    type: injuryType,
    label: injuryDef.label,
    severity: injuryDef.severity,
    status: INJURY_STATUS.ACTIVE,
    createdAt: Date.now(),
    expectedRecoveryDays: recoveryDays,
    actualRecoveryDays: 0,
    recoveryPercent: 0,
    // Context
    matchId: matchInfo?.matchId,
    matchWeek: matchInfo?.week,
    matchOpponent: matchInfo?.opponent,
    matchMinute: matchInfo?.minute,
    // Reinjury tracking
    reinjuryRisk: 0.15 * injuryDef.severity, // 15%-60% risk by severity
    previousInjuries: 0,
  };
};

/**
 * Random injury generation based on match circumstances
 */
export const generateMatchInjury = (player, random = Math.random) => {
  if (!player) return null;

  // Injury risk factors
  const fatigueRisk = (player.fatigue ?? 20) > 70 ? 0.015 : 0.008;
  const ageRisk = player.age > 32 ? 0.01 : player.age < 21 ? 0.006 : 0.005;
  const baseRisk = 0.003; // 0.3% per match

  const injuryChance = baseRisk + fatigueRisk + ageRisk;

  if (random() > injuryChance) return null;

  // Determine injury type
  const roll = random();
  let injuryType = 'MINOR_MUSCLE';

  if (roll > 0.7) injuryType = 'MUSCLE_TEAR';
  else if (roll > 0.5) injuryType = 'MUSCLE_STRAIN';
  else if (roll > 0.3) injuryType = 'LIGAMENT_STRAIN';
  else if (roll > 0.15) injuryType = 'CONCUSSION';

  return createInjury(player, injuryType);
};

// ── Injury Recovery ──────────────────────────────────────────────────────

/**
 * Update injury recovery progress (call weekly)
 */
export const tickInjuryRecovery = (injury, daysElapsed = 7) => {
  if (!injury || injury.status === INJURY_STATUS.RESOLVED) return injury;

  const updated = {
    ...injury,
    actualRecoveryDays: injury.actualRecoveryDays + daysElapsed,
  };

  // Calculate recovery percentage
  updated.recoveryPercent = Math.min(100, Math.round((updated.actualRecoveryDays / injury.expectedRecoveryDays) * 100));

  // Check if recovered
  if (updated.actualRecoveryDays >= injury.expectedRecoveryDays) {
    updated.status = INJURY_STATUS.RESOLVED;
    updated.recoveryPercent = 100;
  } else if (updated.recoveryPercent > 75) {
    updated.status = INJURY_STATUS.RECOVERING;
  }

  return updated;
};

/**
 * Get weeks remaining until recovery
 */
export const getWeeksUntilRecovery = (injury) => {
  if (!injury || injury.status === INJURY_STATUS.RESOLVED) return 0;

  const daysRemaining = Math.max(0, injury.expectedRecoveryDays - injury.actualRecoveryDays);
  return Math.ceil(daysRemaining / 7);
};

/**
 * Check if player can play with injury
 */
export const canPlayerPlayWithInjury = (injury) => {
  if (!injury || injury.status === INJURY_STATUS.RESOLVED) return true;

  // Can't play if acute injury <75% recovered
  if (injury.severity >= 3 && injury.recoveryPercent < 75) {
    return false;
  }

  // Can play with caution if >50% recovered
  return injury.recoveryPercent >= 50;
};

/**
 * Get playing time impact due to injury
 */
export const getInjuryPlayingTimeImpact = (injury) => {
  if (!injury || injury.status === INJURY_STATUS.RESOLVED) {
    return { available: true, minutesMultiplier: 1.0, riskLevel: 'none' };
  }

  if (!canPlayerPlayWithInjury(injury)) {
    return { available: false, minutesMultiplier: 0, riskLevel: 'severe' };
  }

  // Partially recovered: reduced minutes
  const multiplier = injury.recoveryPercent / 100; // 50%-100% of normal minutes
  const riskLevel = injury.recoveryPercent < 75 ? 'high' : 'moderate';

  return {
    available: true,
    minutesMultiplier: multiplier,
    riskLevel,
  };
};

// ── Reinjury System ──────────────────────────────────────────────────────

/**
 * Calculate reinjury risk after return
 */
export const calculateReinjuryRisk = (injury, minutesPlayed = 90) => {
  if (!injury || injury.status === INJURY_STATUS.RESOLVED) return 0;

  const baseSeverityRisk = injury.severity * 0.1; // 10%-60% by severity
  const overplayPenalty = minutesPlayed > 60 ? (minutesPlayed - 60) * 0.005 : 0; // +0.5% per minute over 60
  const chronicallyPreviousRisk = injury.previousInjuries > 0 ? 0.05 * injury.previousInjuries : 0;

  return Math.min(0.8, baseSeverityRisk + overplayPenalty + chronicallyPreviousRisk);
};

/**
 * Check if reinjury occurred during match
 */
export const checkReinjury = (injury, minutesPlayed = 90, random = Math.random) => {
  if (!injury || injury.status === INJURY_STATUS.RESOLVED) return false;

  const reinjuryRisk = calculateReinjuryRisk(injury, minutesPlayed);
  return random() < reinjuryRisk;
};

// ── Player Impact ────────────────────────────────────────────────────────

/**
 * Get list of active injuries for a player
 */
export const getActiveInjuries = (injuries = [], playerId) => {
  return injuries.filter(
    (inj) => inj && inj.playerId === playerId && inj.status !== INJURY_STATUS.RESOLVED
  );
};

/**
 * Get injury status summary for a player
 */
export const getInjuryStatusSummary = (injuries = [], playerId) => {
  const active = getActiveInjuries(injuries, playerId);

  if (active.length === 0) {
    return { status: 'healthy', label: 'Aucune blessure', count: 0 };
  }

  const worst = active.reduce((prev, curr) => (curr.severity > prev.severity ? curr : prev));

  return {
    status: worst.status,
    label: worst.label,
    count: active.length,
    weeksRemaining: getWeeksUntilRecovery(worst),
    canPlay: canPlayerPlayWithInjury(worst),
  };
};

/**
 * Estimate return date
 */
export const estimateReturnDate = (injury, currentDate = Date.now()) => {
  if (!injury) return null;

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(0, injury.expectedRecoveryDays - injury.actualRecoveryDays);
  const returnDate = new Date(currentDate + daysRemaining * msPerDay);

  return {
    returnDate,
    weeksRemaining: Math.ceil(daysRemaining / 7),
    confidence: Math.min(95, 70 + injury.recoveryPercent),
  };
};

// ── Chronic Injuries ────────────────────────────────────────────────────

/**
 * Mark injury as chronic (recurring)
 */
export const makeInjuryChronic = (injury) => {
  if (!injury) return null;

  return {
    ...injury,
    status: INJURY_STATUS.CHRONIC,
    expectedRecoveryDays: Math.round(injury.expectedRecoveryDays * 1.5), // 50% longer to recover
    reinjuryRisk: Math.min(0.8, injury.reinjuryRisk + 0.3), // +30% reinjury risk
  };
};

/**
 * Check if player should be marked as chronic
 */
export const shouldMakeChronicInjury = (playerInjuries = []) => {
  // If player has 2+ injuries of same type in last 60 days
  const recentInjuries = playerInjuries.filter(
    (inj) => Date.now() - inj.createdAt < 60 * 24 * 60 * 60 * 1000
  );

  if (recentInjuries.length < 2) return false;

  // Check if same type
  const typeCounts = {};
  recentInjuries.forEach((inj) => {
    typeCounts[inj.type] = (typeCounts[inj.type] ?? 0) + 1;
  });

  return Object.values(typeCounts).some((count) => count >= 2);
};
