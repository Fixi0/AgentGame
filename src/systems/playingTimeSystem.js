/**
 * playingTimeSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Playing time guarantee system for contracts
 *
 * Tracks:
 * - Minimum appearances guarantee
 * - Minimum minutes guarantee
 * - Position/role playing time requirements
 * - Compliance and bonus calculations
 */

// ── Playing Time Guarantee Types ─────────────────────────────────────────

export const PLAYING_TIME_GUARANTEE_TYPES = {
  APPEARANCES: 'appearances', // Minimum games played
  MINUTES: 'minutes', // Minimum total minutes
  STARTS: 'starts', // Minimum starting appearances
};

export const PLAYING_TIME_TIERS = {
  STAR: { appearances: 30, minutes: 2400, starts: 28, label: '★ Star (30+ appearances)' },
  STARTER: { appearances: 25, minutes: 2000, starts: 22, label: '⚫ Starter (25+ appearances)' },
  REGULAR: { appearances: 20, minutes: 1600, starts: 15, label: '◐ Regular (20+ appearances)' },
  ROTATION: { appearances: 15, minutes: 1000, starts: 8, label: '◯ Rotation (15+ appearances)' },
};

// ── Playing Time Tracking ────────────────────────────────────────────────

/**
 * Initialize playing time guarantee for a contract
 */
export const createPlayingTimeGuarantee = (guaranteeType = 'STARTER') => {
  const tier = PLAYING_TIME_TIERS[guaranteeType] || PLAYING_TIME_TIERS.STARTER;

  return {
    type: guaranteeType,
    minimumAppearances: tier.appearances,
    minimumMinutes: tier.minutes,
    minimumStarts: tier.starts,
    currentAppearances: 0,
    currentMinutes: 0,
    currentStarts: 0,
    bonusPerAppearance: 0,
    penaltyPerMissedAppearance: 0,
    createdAt: Date.now(),
  };
};

/**
 * Update playing time guarantee tracking
 */
export const updatePlayingTimeTracking = (guarantee, matchResult) => {
  if (!guarantee || !matchResult) return guarantee;

  const updated = { ...guarantee };

  // Only count appearances where player had minutes
  if (matchResult.minutes > 0) {
    updated.currentAppearances += 1;
    updated.currentMinutes += matchResult.minutes;

    // Count as start if 60+ minutes
    if (matchResult.minutes >= 60) {
      updated.currentStarts += 1;
    }
  }

  return updated;
};

/**
 * Check if playing time guarantee is met
 */
export const isPlayingTimeGuaranteeMet = (guarantee) => {
  if (!guarantee) return true;

  return (
    guarantee.currentAppearances >= guarantee.minimumAppearances ||
    guarantee.currentMinutes >= guarantee.minimumMinutes ||
    guarantee.currentStarts >= guarantee.minimumStarts
  );
};

/**
 * Get playing time guarantee progress
 */
export const getPlayingTimeProgress = (guarantee, season = 1) => {
  if (!guarantee) {
    return {
      appearanceProgress: { current: 0, target: 0, percent: 0 },
      minuteProgress: { current: 0, target: 0, percent: 0 },
      startProgress: { current: 0, target: 0, percent: 0 },
      met: true,
    };
  }

  const appearancePercent = Math.min(100, Math.round((guarantee.currentAppearances / guarantee.minimumAppearances) * 100));
  const minutePercent = Math.min(100, Math.round((guarantee.currentMinutes / guarantee.minimumMinutes) * 100));
  const startPercent = Math.min(100, Math.round((guarantee.currentStarts / guarantee.minimumStarts) * 100));

  return {
    appearanceProgress: {
      current: guarantee.currentAppearances,
      target: guarantee.minimumAppearances,
      percent: appearancePercent,
    },
    minuteProgress: {
      current: guarantee.currentMinutes,
      target: guarantee.minimumMinutes,
      percent: minutePercent,
    },
    startProgress: {
      current: guarantee.currentStarts,
      target: guarantee.minimumStarts,
      percent: startPercent,
    },
    met: isPlayingTimeGuaranteeMet(guarantee),
  };
};

// ── Playing Time Bonuses & Penalties ─────────────────────────────────────

/**
 * Calculate playing time bonus for exceeding minimum
 */
export const calculatePlayingTimeBonus = (guarantee, player) => {
  if (!guarantee || !player) return 0;

  if (!isPlayingTimeGuaranteeMet(guarantee)) {
    return 0; // No bonus if minimum not met
  }

  // Bonus for exceeding minimums
  const appearanceBonus = Math.max(0, (guarantee.currentAppearances - guarantee.minimumAppearances) * (guarantee.bonusPerAppearance ?? 500));
  const minuteBonus = Math.max(0, (guarantee.currentMinutes - guarantee.minimumMinutes) * ((guarantee.bonusPerAppearance ?? 500) / 100)); // 5% of appearance bonus per minute

  return Math.round(appearanceBonus + minuteBonus);
};

/**
 * Calculate penalty for not meeting playing time guarantee
 */
export const calculatePlayingTimePenalty = (guarantee, player) => {
  if (!guarantee || !player) return 0;

  if (isPlayingTimeGuaranteeMet(guarantee)) {
    return 0; // No penalty if met
  }

  // Calculate deficit
  const appearanceDeficit = Math.max(0, guarantee.minimumAppearances - guarantee.currentAppearances);
  const minuteDeficit = Math.max(0, guarantee.minimumMinutes - guarantee.currentMinutes);
  const startDeficit = Math.max(0, guarantee.minimumStarts - guarantee.currentStarts);

  // Penalty calculation
  const appearancePenalty = appearanceDeficit * (guarantee.penaltyPerMissedAppearance ?? 2000);
  const minutePenalty = Math.max(0, (minuteDeficit / 100) * 500); // Per 100 minutes short
  const startPenalty = startDeficit * 1000;

  return Math.round(appearancePenalty + minutePenalty + startPenalty);
};

// ── Contract Clause Generation ─────────────────────────────────────────────

/**
 * Generate playing time guarantee clause based on player profile
 */
export const generatePlayingTimeClause = (player, club) => {
  if (!player || !club) return null;

  // Determine what level the player should get based on their rating
  const rating = player.rating ?? 70;
  let guaranteeType = 'ROTATION';

  if (rating >= 170) {
    guaranteeType = 'STAR';
  } else if (rating >= 156) {
    guaranteeType = 'STARTER';
  } else if (rating >= 144) {
    guaranteeType = 'REGULAR';
  }

  // Club financial impact
  const clubTier = club.tier ?? 4;
  const multiplier = clubTier === 1 ? 1.2 : clubTier === 2 ? 1.0 : clubTier === 3 ? 0.85 : 0.7;

  const guarantee = createPlayingTimeGuarantee(guaranteeType);

  // Adjust bonus/penalty by club tier
  guarantee.bonusPerAppearance = Math.round(2000 * multiplier);
  guarantee.penaltyPerMissedAppearance = Math.round(2000 * multiplier);

  return guarantee;
};

// ── Playing Time Scenarios ───────────────────────────────────────────────

/**
 * Evaluate risk of not meeting playing time guarantee
 * Returns risk level: 'low', 'medium', 'high', 'critical'
 */
export const evaluatePlayingTimeRisk = (guarantee, seasonProgress = 0.5) => {
  if (!guarantee) return { risk: 'low', score: 0 };

  // Calculate expected performance at season end
  const appearancesPerWeek = guarantee.currentAppearances / (seasonProgress * 38 || 1);
  const expectedAppearances = appearancesPerWeek * 38;

  const minutesPerWeek = guarantee.currentMinutes / (seasonProgress * 38 || 1);
  const expectedMinutes = minutesPerWeek * 38;

  const startsPerWeek = guarantee.currentStarts / (seasonProgress * 38 || 1);
  const expectedStarts = startsPerWeek * 38;

  // Risk calculation
  const appearanceRisk = Math.max(0, 1 - expectedAppearances / guarantee.minimumAppearances);
  const minuteRisk = Math.max(0, 1 - expectedMinutes / guarantee.minimumMinutes);
  const startRisk = Math.max(0, 1 - expectedStarts / guarantee.minimumStarts);

  const averageRisk = (appearanceRisk + minuteRisk + startRisk) / 3;

  let risk = 'low';
  if (averageRisk > 0.7) {
    risk = 'critical';
  } else if (averageRisk > 0.5) {
    risk = 'high';
  } else if (averageRisk > 0.25) {
    risk = 'medium';
  }

  return {
    risk,
    score: Number(averageRisk.toFixed(2)),
    expectedAppearances: Math.round(expectedAppearances),
    expectedMinutes: Math.round(expectedMinutes),
    expectedStarts: Math.round(expectedStarts),
  };
};

/**
 * Get playing time guarantee compliance status
 */
export const getPlayingTimeComplianceStatus = (guarantee) => {
  if (!guarantee) return { status: 'compliant', message: 'Pas de garanties' };

  const met = isPlayingTimeGuaranteeMet(guarantee);
  const progress = getPlayingTimeProgress(guarantee);

  if (met) {
    return {
      status: 'compliant',
      message: 'Garanties respectées',
      percent: Math.round(Math.min(100, Math.max(...[
        progress.appearanceProgress.percent,
        progress.minuteProgress.percent,
        progress.startProgress.percent,
      ]))),
    };
  }

  // Find which minimum is worst
  const worst = Math.min(
    progress.appearanceProgress.percent,
    progress.minuteProgress.percent,
    progress.startProgress.percent
  );

  if (worst < 50) {
    return {
      status: 'breach',
      message: 'Garanties non respectées (risque de pénalité)',
      percent: worst,
    };
  }

  return {
    status: 'warning',
    message: 'Approche limite des garanties',
    percent: worst,
  };
};
