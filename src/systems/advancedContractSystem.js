/**
 * advancedContractSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Advanced contract clauses system
 *
 * Includes:
 * - Release clauses (buyout options)
 * - Performance bonuses (goals, assists, awards)
 * - Playing time guarantees
 * - Injury protection
 * - Image rights and commercial clauses
 * - Auto-renewal conditions
 */

// ── Clause Types ────────────────────────────────────────────────────────

export const CLAUSE_TYPES = {
  RELEASE_CLAUSE: 'releaseClause', // Buyout price to force transfer
  PERFORMANCE_BONUS: 'performanceBonus', // Bonuses for goals, assists, awards
  PLAYING_TIME: 'playingTimeGuarantee', // Minimum playing time
  INJURY_PROTECTION: 'injuryProtection', // Salary protection if injured
  IMAGE_RIGHTS: 'imageRights', // Commercial/sponsorship share
  AUTO_RENEWAL: 'autoRenewal', // Automatic extension conditions
  LOYALTY_BONUS: 'loyaltyBonus', // Bonus for contract completion
  DEVELOPMENT_CLAUSE: 'developmentClause', // Bonus if player rating improves
};

// ── Release Clauses ────────────────────────────────────────────────────

/**
 * Create a release clause
 */
export const createReleaseClause = (playerValue, clauseStrength = 'standard') => {
  // Clause strength affects percentage of player value
  const percentages = {
    low: 0.8, // 80% of value
    standard: 1.0, // 100% of value
    high: 1.2, // 120% of value
    very_high: 1.5, // 150% of value
  };

  const percentage = percentages[clauseStrength] || percentages.standard;
  const releasePrice = Math.round(playerValue * percentage);

  return {
    type: CLAUSE_TYPES.RELEASE_CLAUSE,
    releasePrice,
    strength: clauseStrength,
    active: true,
    triggers: {
      championshipWin: false, // Can be triggered if team wins championship
      coachChange: false, // Can be triggered if specific coach leaves
      specificClubs: [], // Release clause with specific clubs only
    },
  };
};

/**
 * Check if release clause can be triggered
 */
export const canTriggerReleaseClause = (clause, player, club, conditions = {}) => {
  if (!clause || !clause.active) return false;

  // Check specific triggers
  if (clause.triggers.championshipWin && !conditions.wonChampionship) return false;
  if (clause.triggers.coachChange && !conditions.coachChanged) return false;
  if (clause.triggers.specificClubs?.length > 0) {
    return clause.triggers.specificClubs.includes(club?.name);
  }

  return true;
};

// ── Performance Bonuses ────────────────────────────────────────────────

/**
 * Create performance bonus clause
 */
export const createPerformanceBonuses = (player, contractValue) => {
  return {
    type: CLAUSE_TYPES.PERFORMANCE_BONUS,
    bonuses: {
      perGoal: Math.max(2000, Math.round(contractValue * 0.001)), // 0.1% of contract value
      perAssist: Math.max(1000, Math.round(contractValue * 0.0005)),
      perCleanSheet: player.position === 'GK' || player.position === 'DEF' ? Math.max(1500, Math.round(contractValue * 0.0008)) : 0,
      perAppearance: Math.max(500, Math.round(contractValue * 0.0002)),
      playerOfMonth: Math.round(contractValue * 0.005), // 0.5% of contract
      playerOfSeason: Math.round(contractValue * 0.03), // 3% of contract
      championshipWin: Math.round(contractValue * 0.1), // 10% of contract
      europeanCupWin: Math.round(contractValue * 0.15), // 15% of contract
      hatTrick: Math.round(contractValue * 0.008), // 0.8% of contract
    },
    tracking: {
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      appearances: 0,
      awards: [],
    },
  };
};

/**
 * Calculate earned performance bonuses
 */
export const calculatePerformanceBonusesEarned = (bonus) => {
  if (!bonus) return 0;

  const { bonuses, tracking } = bonus;

  let total = 0;
  total += tracking.goals * (bonuses.perGoal ?? 0);
  total += tracking.assists * (bonuses.perAssist ?? 0);
  total += tracking.cleanSheets * (bonuses.perCleanSheet ?? 0);
  total += tracking.appearances * (bonuses.perAppearance ?? 0);

  // Awards
  if (tracking.awards?.includes('playerOfMonth')) total += bonuses.playerOfMonth ?? 0;
  if (tracking.awards?.includes('playerOfSeason')) total += bonuses.playerOfSeason ?? 0;
  if (tracking.awards?.includes('championshipWin')) total += bonuses.championshipWin ?? 0;
  if (tracking.awards?.includes('europeanCupWin')) total += bonuses.europeanCupWin ?? 0;
  if (tracking.awards?.includes('hatTrick')) total += bonuses.hatTrick ?? 0;

  return Math.round(total);
};

// ── Injury Protection ────────────────────────────────────────────────────

/**
 * Create injury protection clause
 */
export const createInjuryProtection = (weeklySalary, protectionLevel = 'standard') => {
  const protectionPercentages = {
    none: 0,
    basic: 0.5, // 50% salary if injured
    standard: 0.75, // 75% salary if injured
    premium: 1.0, // 100% salary if injured
  };

  const percentage = protectionPercentages[protectionLevel] || protectionPercentages.standard;

  return {
    type: CLAUSE_TYPES.INJURY_PROTECTION,
    level: protectionLevel,
    protectionPercentage: percentage,
    weeklySalaryProtected: Math.round(weeklySalary * percentage),
    maxDaysProtected: protectionLevel === 'premium' ? 365 : protectionLevel === 'standard' ? 180 : 90,
    daysProtected: 0,
    totalPaid: 0,
  };
};

// ── Image Rights & Commercial ─────────────────────────────────────────

/**
 * Create image rights and commercial clause
 */
export const createImageRightsClause = (playerReputation = 50) => {
  // Higher reputation players get more favorable terms
  const playerShare = Math.min(0.8, 0.4 + playerReputation / 250); // 40%-80% based on reputation

  return {
    type: CLAUSE_TYPES.IMAGE_RIGHTS,
    playerShare, // Player's percentage of commercial income
    clubShare: 1 - playerShare,
    commercialBonus: 0, // Accumulated bonus
    sponsorships: [], // Associated sponsorships
    restrictedBrands: [], // Brands player can't endorse
  };
};

// ── Auto-Renewal Conditions ────────────────────────────────────────────

/**
 * Create auto-renewal clause
 */
export const createAutoRenewal = (contractYears = 1) => {
  return {
    type: CLAUSE_TYPES.AUTO_RENEWAL,
    enabled: true,
    autoRenewYears: contractYears,
    conditions: {
      appearanceThreshold: 20, // Min appearances in season
      performanceThreshold: 70, // Min average rating
      bothMustBeMet: true, // Both conditions required
    },
    renewalTerms: {
      salaryIncrease: 0.05, // 5% salary bump on renewal
      contractExtension: 1, // 1 year extension
    },
  };
};

// ── Development Clause ──────────────────────────────────────────────────

/**
 * Create development/progression bonus clause
 */
export const createDevelopmentClause = (baseRating = 70, contractValue = 0) => {
  return {
    type: CLAUSE_TYPES.DEVELOPMENT_CLAUSE,
    baselineRating: baseRating,
    bonuses: {
      +2Rating: Math.round(contractValue * 0.02),
      +4Rating: Math.round(contractValue * 0.05),
      +6Rating: Math.round(contractValue * 0.12),
      +8Rating: Math.round(contractValue * 0.20),
    },
    ratingGain: 0,
    bonusEarned: 0,
  };
};

// ── Loyalty Bonus ────────────────────────────────────────────────────────

/**
 * Create loyalty bonus clause
 */
export const createLoyaltyBonus = (contractLength = 4, contractValue = 0) => {
  return {
    type: CLAUSE_TYPES.LOYALTY_BONUS,
    contractLength,
    bonusPerYear: Math.round(contractValue * 0.05), // 5% per year
    totalBonus: Math.round(contractValue * 0.05 * contractLength),
    yearsCompleted: 0,
    transferRequestLeadsPenalty: true, // Lose bonus if request transfer
  };
};

// ── Full Contract with Clauses ──────────────────────────────────────────

/**
 * Create comprehensive contract with selected clauses
 */
export const createComprehensiveContract = (player, club, baseContract, selectedClauses = []) => {
  const contract = {
    ...baseContract,
    clauses: {},
  };

  // Add requested clauses
  if (selectedClauses.includes('RELEASE_CLAUSE')) {
    contract.clauses.releaseClause = createReleaseClause(player.value, 'standard');
  }

  if (selectedClauses.includes('PERFORMANCE_BONUS')) {
    contract.clauses.performanceBonus = createPerformanceBonuses(player, baseContract.annualSalary);
  }

  if (selectedClauses.includes('PLAYING_TIME')) {
    contract.clauses.playingTimeGuarantee = {
      type: CLAUSE_TYPES.PLAYING_TIME,
      minimumAppearances: player.rating >= 80 ? 28 : 20,
    };
  }

  if (selectedClauses.includes('INJURY_PROTECTION')) {
    contract.clauses.injuryProtection = createInjuryProtection(baseContract.weeklySalary, player.rating >= 80 ? 'premium' : 'standard');
  }

  if (selectedClauses.includes('IMAGE_RIGHTS')) {
    contract.clauses.imageRights = createImageRightsClause(player.brandValue ?? 50);
  }

  if (selectedClauses.includes('AUTO_RENEWAL')) {
    contract.clauses.autoRenewal = createAutoRenewal(1);
  }

  if (selectedClauses.includes('DEVELOPMENT_CLAUSE')) {
    contract.clauses.developmentClause = createDevelopmentClause(player.rating, baseContract.annualSalary);
  }

  if (selectedClauses.includes('LOYALTY_BONUS')) {
    contract.clauses.loyaltyBonus = createLoyaltyBonus(baseContract.years, baseContract.annualSalary);
  }

  return contract;
};

// ── Clause Negotiation ──────────────────────────────────────────────────

/**
 * Calculate contract value impact of each clause
 */
export const getClauseValueImpact = (clause, baseValue) => {
  const impacts = {
    releaseClause: baseValue * 0.02, // +2% value
    performanceBonus: baseValue * 0.05, // +5% value
    playingTimeGuarantee: baseValue * 0.03, // +3% value
    injuryProtection: baseValue * 0.04, // +4% value
    imageRights: baseValue * 0.03, // +3% value
    autoRenewal: baseValue * 0.02, // +2% value
    developmentClause: baseValue * 0.06, // +6% value
    loyaltyBonus: baseValue * 0.04, // +4% value
  };

  return impacts[clause.type] ?? 0;
};

/**
 * Calculate total contract value with all clauses
 */
export const getTotalContractValue = (baseValue, clauses = {}) => {
  let totalValue = baseValue;

  Object.values(clauses).forEach((clause) => {
    if (clause) {
      totalValue += getClauseValueImpact(clause, baseValue);
    }
  });

  return Math.round(totalValue);
};
