import { normalizeAgencyReputation } from './reputationSystem';

export const AGENCY_CAPACITY_BY_LEVEL = {
  1: 3,
  2: 5,
  3: 8,
  4: 12,
  5: 16,
};

export const AGENCY_UPGRADE_COSTS = {
  1: 45000,
  2: 90000,
  3: 180000,
  4: 320000,
};

export const getAgencyCapacity = (agencyLevel = 1) => AGENCY_CAPACITY_BY_LEVEL[agencyLevel] ?? 3;

export const getAgencyUpgradeCost = (agencyLevel = 1) => AGENCY_UPGRADE_COSTS[agencyLevel] ?? null;

const AGENCY_STAGES = [
  { label: 'Atelier', min: 0, max: 24, hint: 'Tu poses les bases de l’agence.' },
  { label: 'Agence locale', min: 25, max: 44, hint: 'Tu commences à peser dans ton marché.' },
  { label: 'Agence reconnue', min: 45, max: 64, hint: 'Les clubs te prennent au sérieux.' },
  { label: 'Référence européenne', min: 65, max: 84, hint: 'Tes dossiers peuvent faire basculer le marché.' },
  { label: 'Puissance mondiale', min: 85, max: 100, hint: 'L’agence dicte désormais le tempo.' },
];

const average = (values = []) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

export const getAgencyProgressSnapshot = (state = {}) => {
  const roster = state.roster ?? [];
  const staff = state.staff ?? {};
  const office = state.office ?? {};
  const clubRelations = Object.values(state.clubRelations ?? {});
  const rep = normalizeAgencyReputation(state.reputation ?? 0);
  const credibility = state.credibility ?? 50;
  const avgTrust = roster.length ? average(roster.map((player) => player.trust ?? 50)) : 50;
  const avgRating = roster.length ? average(roster.map((player) => player.rating ?? 0)) : 0;
  const portfolioValue = roster.reduce((sum, player) => sum + (player.value ?? 0), 0);
  const officeLevel = ['scoutLevel', 'lawyerLevel', 'mediaLevel'].reduce((sum, key) => sum + (office[key] ?? 0), 0);
  const staffLevel = Object.values(staff).reduce((sum, level) => sum + (Number(level) || 0), 0);
  const capacity = getAgencyCapacity(state.agencyLevel ?? 1);
  const utilization = capacity > 0 ? roster.length / capacity : 0;
  const relationScore = clubRelations.length ? average(clubRelations) : 50;
  const portfolioScore = clampNumber(Math.round(portfolioValue / 180000), 0, 18);
  const marketScore = clampNumber(Math.round((avgRating * 0.6) + (avgTrust * 0.35) + (utilization * 18)), 0, 28);
  const structureScore = clampNumber(Math.round(officeLevel * 3.4 + staffLevel * 2.2 + (state.agencyLevel ?? 1) * 4), 0, 28);
  const reputationScore = clampNumber(Math.round(rep * 0.22 + credibility * 0.15 + relationScore * 0.12), 0, 26);
  const score = clampNumber(Math.round(reputationScore + structureScore + marketScore + portfolioScore), 0, 100);

  const stageIndex = AGENCY_STAGES.findIndex((stage) => score >= stage.min && score <= stage.max) >= 0
    ? AGENCY_STAGES.findIndex((stage) => score >= stage.min && score <= stage.max)
    : AGENCY_STAGES.length - 1;
  const currentStage = AGENCY_STAGES[Math.max(0, stageIndex)];
  const nextStage = AGENCY_STAGES[Math.min(AGENCY_STAGES.length - 1, stageIndex + 1)];
  const nextThreshold = nextStage === currentStage ? 100 : nextStage.min;
  const currentSpan = nextStage === currentStage ? 100 : Math.max(1, nextThreshold - currentStage.min);
  const progress = clampNumber(Math.round(((score - currentStage.min) / currentSpan) * 100), 0, 100);

  return {
    score,
    stage: currentStage.label,
    stageHint: currentStage.hint,
    nextStage: nextStage === currentStage ? null : nextStage.label,
    progress,
    capacity,
    metrics: {
      reputation: rep,
      credibility,
      avgTrust: Math.round(avgTrust),
      avgRating: Math.round(avgRating),
      officeLevel,
      staffLevel,
      portfolioValue,
      relationScore: Math.round(relationScore),
      utilization: Math.round(utilization * 100),
    },
  };
};

export const canUpgradeAgency = (state) => {
  const cost = getAgencyUpgradeCost(state.agencyLevel);
  return Boolean(cost && state.money >= cost);
};
