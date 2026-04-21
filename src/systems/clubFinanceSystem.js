/**
 * clubFinanceSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Club financial system with realistic budgets and transfer valuations
 *
 * Determines:
 * - Club revenue and budget capacity
 * - Transfer budget allocation
 * - Salary cap constraints
 * - Realistic offer generation based on club finances
 * - Financial fair play constraints
 */

import { CLUBS } from '../data/clubs';

// ── Financial Categories by Club Tier ────────────────────────────────────────

/**
 * Revenue multiplier by club tier
 * Tier 1: Elite clubs (Real Madrid, Liverpool, Man City) - highest revenue
 * Tier 2: Strong clubs - good revenue
 * Tier 3: Mid-table clubs - moderate revenue
 * Tier 4: Lower clubs - minimal revenue
 */
const TIER_REVENUE_MULTIPLIER = {
  1: 850, // €850M average annual revenue
  2: 380, // €380M
  3: 180, // €180M
  4: 65,  // €65M
};

/**
 * Club budget allocation ratios
 * - Transfer: % of revenue for transfers
 * - Wages: % of revenue for player wages
 * - FFP Buffer: Reserve for financial fair play
 */
const BUDGET_ALLOCATION = {
  transfer: {
    1: 0.18, // 18% of revenue
    2: 0.15,
    3: 0.12,
    4: 0.08,
  },
  wages: {
    1: 0.65, // 65% of revenue (strict FFP)
    2: 0.62,
    3: 0.60,
    4: 0.58,
  },
  ffpBuffer: {
    1: 0.05, // 5% reserve
    2: 0.08,
    3: 0.10,
    4: 0.15,
  },
};

// ── Club Financial Calculation ─────────────────────────────────────────────

/**
 * Get annual revenue for a club
 * Based on tier and market position
 */
export const getClubAnnualRevenue = (club) => {
  if (!club) return 65000000; // Default to Tier 4

  const baseRevenue = (TIER_REVENUE_MULTIPLIER[club.tier] ?? TIER_REVENUE_MULTIPLIER[4]) * 1000000;

  // Stability multiplier: established clubs have more stable revenue
  const stabilityBonus = club.tier <= 2 ? 1.15 : 1.0;

  return Math.round(baseRevenue * stabilityBonus);
};

/**
 * Get transfer budget for a club based on tier and finances
 */
export const getClubTransferBudget = (club) => {
  if (!club) return 6500000;

  const annualRevenue = getClubAnnualRevenue(club);
  const allocationRatio = BUDGET_ALLOCATION.transfer[club.tier] ?? BUDGET_ALLOCATION.transfer[4];

  // 2-year amortization (spread transfer spending over 2 years)
  const totalBudget = annualRevenue * allocationRatio * 2;

  // Subtract already spent on ongoing contracts (estimated at 40% of budget)
  const availableBudget = totalBudget * 0.6;

  return Math.round(availableBudget);
};

/**
 * Get remaining transfer budget (after squad purchases)
 */
export const getClubRemainingTransferBudget = (club, squad = []) => {
  const totalBudget = getClubTransferBudget(club);

  // Estimate spent on current squad
  const estimatedSpent = (squad ?? [])
    .filter((p) => p?.value)
    .reduce((sum, p) => sum + (p.signingCost ?? Math.floor(p.value * 0.01)), 0);

  return Math.max(0, totalBudget - estimatedSpent);
};

/**
 * Get annual wage budget for a club
 */
export const getClubWageBudget = (club) => {
  if (!club) return 38000000;

  const annualRevenue = getClubAnnualRevenue(club);
  const allocationRatio = BUDGET_ALLOCATION.wages[club.tier] ?? BUDGET_ALLOCATION.wages[4];

  return Math.round(annualRevenue * allocationRatio);
};

/**
 * Get remaining wage budget (after current squad wages)
 */
export const getClubRemainingWageBudget = (club, squad = [], weeksLeft = 38) => {
  const annualBudget = getClubWageBudget(club);
  const weeklyBudget = annualBudget / 38;

  // Estimate weekly wage commitment
  const weeklySpent = (squad ?? [])
    .filter((p) => p?.weeklySalary)
    .reduce((sum, p) => sum + p.weeklySalary, 0);

  const remainingWeeklyBudget = Math.max(0, weeklyBudget - weeklySpent);
  return Math.round(remainingWeeklyBudget * weeksLeft);
};

// ── Realistic Offer Generation ─────────────────────────────────────────────

/**
 * Determine if a club can realistically afford a player
 */
export const canClubAffordPlayer = (club, player, squad = []) => {
  if (!club || !player) return false;

  const remainingTransferBudget = getClubRemainingTransferBudget(club, squad);
  const remainingWageBudget = getClubRemainingWageBudget(club, squad);

  // Can afford if both budgets sufficient
  const signingCost = player.signingCost ?? Math.floor(player.value * 0.01);
  const weeklySalary = Math.min(player.weeklySalary * 1.2, player.weeklySalary * (1 + (player.rating / 100))); // Up to 20% increase

  return remainingTransferBudget >= signingCost && remainingWageBudget >= weeklySalary * 38;
};

/**
 * Generate realistic salary offer based on club finances and player value
 */
export const generateRealisticSalaryOffer = (club, player, squad = []) => {
  if (!club || !player) return null;

  const clubTier = club.tier ?? 4;
  const playerRating = player.rating ?? 70;
  const playerValue = player.value ?? 10000000;

  // Base salary: 5-7% of transfer value annually
  const baseSalary = (playerValue * (0.05 + (playerRating - 70) / 1000)) / 38; // Weekly

  // Club multiplier: Elite clubs pay more
  const clubMultiplier = clubTier === 1 ? 1.3 : clubTier === 2 ? 1.15 : clubTier === 3 ? 0.95 : 0.75;

  // Budget constraint: Can't offer more than remaining budget allows
  const remainingWageBudget = getClubRemainingWageBudget(club, squad);
  const maxAffordableWeekly = remainingWageBudget / 38;

  const offeredWeeklySalary = Math.min(baseSalary * clubMultiplier, maxAffordableWeekly);

  return {
    baseWeeklySalary: Math.round(offeredWeeklySalary),
    annualSalary: Math.round(offeredWeeklySalary * 38),
    bonusPerGoal: Math.max(0, Math.round((player.rating >= 160 ? 5000 : 2000) * (clubTier / 2))),
    bonusPerAppearance: Math.max(0, Math.round((player.rating >= 160 ? 2000 : 1000) * (clubTier / 2))),
    signingBonus: Math.round((offeredWeeklySalary * 38 * (clubTier <= 2 ? 0.5 : 0.25))),
  };
};

/**
 * Generate realistic transfer fee offer
 */
export const generateRealisticTransferOffer = (club, player, squad = []) => {
  if (!club || !player) return null;

  const playerValue = player.value ?? 10000000;
  const clubTier = club.tier ?? 4;
  const playerRating = player.rating ?? 70;

  // Negotiate down from asking price based on club tier
  // Tier 1 clubs pay more, Tier 4 clubs get discount
  const negotiationMultiplier = clubTier === 1 ? 1.15 : clubTier === 2 ? 1.0 : clubTier === 3 ? 0.85 : 0.65;

  const baseOffer = Math.round(playerValue * negotiationMultiplier);

  // Check if club can actually afford it
  const remainingBudget = getClubRemainingTransferBudget(club, squad);
  const maxAffordable = Math.round(remainingBudget * 0.7); // Save 30% for other targets

  const finalOffer = Math.min(baseOffer, maxAffordable);

  // Don't offer less than 50% of original value (otherwise not realistic)
  if (finalOffer < playerValue * 0.5) return null;

  return {
    transferFee: finalOffer,
    installments: clubTier <= 2 ? 1 : clubTier === 3 ? 2 : 3, // Smaller clubs use installments
    upfrontPercentage: clubTier <= 2 ? 1.0 : clubTier === 3 ? 0.6 : 0.4,
  };
};

/**
 * Generate complete realistic club offer for a player
 */
export const generateClubOffer = (club, player, squad = []) => {
  if (!club || !player) return null;

  // Check if club can afford
  if (!canClubAffordPlayer(club, player, squad)) {
    return null;
  }

  const salaryOffer = generateRealisticSalaryOffer(club, player, squad);
  const transferOffer = generateRealisticTransferOffer(club, player, squad);

  if (!salaryOffer || !transferOffer) return null;

  return {
    clubId: club.id,
    clubName: club.name,
    clubCountryCode: club.countryCode,
    clubTier: club.tier,
    offeredAt: Date.now(),
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    status: 'pending',
    // Financial package
    transferFee: transferOffer.transferFee,
    installments: transferOffer.installments,
    upfrontPercentage: transferOffer.upfrontPercentage,
    weeklySalary: salaryOffer.baseWeeklySalary,
    annualSalary: salaryOffer.annualSalary,
    signingBonus: salaryOffer.signingBonus,
    bonusPerGoal: salaryOffer.bonusPerGoal,
    bonusPerAppearance: salaryOffer.bonusPerAppearance,
    // Contract details
    contractLength: 4 + Math.random() * 2, // 4-6 years
    // Realism score (for matching with player preferences)
    realismScore: 85 + Math.random() * 15,
  };
};

// ── Financial Fair Play ────────────────────────────────────────────────────

/**
 * Check if club is compliant with FFP rules
 */
export const isClubFFPCompliant = (club, squad = [], transfers = []) => {
  if (!club) return true;

  const annualRevenue = getClubAnnualRevenue(club);
  const wageBudget = getClubWageBudget(club);

  // Calculate actual spending
  const estimatedWageSpending = (squad ?? [])
    .filter((p) => p?.weeklySalary)
    .reduce((sum, p) => sum + p.weeklySalary * 38, 0);

  const transferSpending = (transfers ?? [])
    .filter((t) => t?.status === 'completed')
    .reduce((sum, t) => sum + t.fee, 0);

  // FFP rule: Wages must not exceed 70% of revenue, Transfer spending should be moderate
  const wageRatio = estimatedWageSpending / annualRevenue;
  const transferRatio = transferSpending / annualRevenue;

  return wageRatio <= 0.70 && transferRatio <= 0.40;
};

/**
 * Get FFP compliance status for a club
 */
export const getFFPStatus = (club, squad = [], transfers = []) => {
  if (!club) return { compliant: true, status: 'none' };

  const isCompliant = isClubFFPCompliant(club, squad, transfers);
  const annualRevenue = getClubAnnualRevenue(club);

  const estimatedWageSpending = (squad ?? [])
    .filter((p) => p?.weeklySalary)
    .reduce((sum, p) => sum + p.weeklySalary * 38, 0);

  const wageRatio = estimatedWageSpending / annualRevenue;

  return {
    compliant: isCompliant,
    wageRatio: Number(wageRatio.toFixed(3)),
    status: wageRatio > 0.70 ? 'breach' : wageRatio > 0.65 ? 'warning' : 'compliant',
  };
};
