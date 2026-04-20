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
  { label: 'Atelier', min: 0, max: 16, hint: 'Tu poses les bases de l’agence.', reward: 'Départ modeste, peu de marge' },
  { label: 'Petit réseau', min: 17, max: 31, hint: 'Tu commences à ouvrir quelques portes.', reward: '+1 relation club par mois' },
  { label: 'Agence locale', min: 32, max: 46, hint: 'Tu pèses dans ton marché.', reward: '+1 dossier chaud possible' },
  { label: 'Agence reconnue', min: 47, max: 61, hint: 'Les clubs te prennent au sérieux.', reward: '+1 scout temporaire sur une mission' },
  { label: 'Référence régionale', min: 62, max: 75, hint: 'Tes dossiers ont de l’impact.', reward: '+1 offre crédible de plus' },
  { label: 'Référence européenne', min: 76, max: 87, hint: 'Tes dossiers peuvent faire basculer le marché.', reward: 'Meilleures entrées en Europe' },
  { label: 'Puissance mondiale', min: 88, max: 100, hint: 'L’agence dicte désormais le tempo.', reward: 'Accès aux meilleurs dossiers' },
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
  const portfolioScore = clampNumber(Math.round(portfolioValue / 260000), 0, 14);
  const marketScore = clampNumber(Math.round((avgRating * 0.42) + (avgTrust * 0.28) + (utilization * 10)), 0, 20);
  const structureScore = clampNumber(Math.round(officeLevel * 2.4 + staffLevel * 1.5 + (state.agencyLevel ?? 1) * 3), 0, 22);
  const reputationScore = clampNumber(Math.round(rep * 0.16 + credibility * 0.1 + relationScore * 0.08), 0, 16);
  const longevityScore = clampNumber(Math.round((state.week ?? 1) / 26), 0, 10);
  const historyScore = clampNumber(Math.round((state.decisionHistory?.length ?? 0) / 4), 0, 8);
  const score = clampNumber(Math.round(reputationScore + structureScore + marketScore + portfolioScore + longevityScore + historyScore), 0, 100);

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
    stageReward: currentStage.reward,
    nextStage: nextStage === currentStage ? null : nextStage.label,
    progress,
    capacity,
    metrics: {
      reputation: state.reputation ?? 0,
      reputationNormalized: rep,
      credibility,
      avgTrust: Math.round(avgTrust),
      avgRating: Math.round(avgRating),
      officeLevel,
      staffLevel,
      portfolioValue,
      relationScore: Math.round(relationScore),
      utilization: Math.round(utilization * 100),
    },
    rewards: AGENCY_STAGES.map((stage) => ({
      label: stage.label,
      min: stage.min,
      max: stage.max,
      reward: stage.reward,
      reached: score >= stage.min,
    })),
  };
};

export const canUpgradeAgency = (state) => {
  const cost = getAgencyUpgradeCost(state.agencyLevel);
  return Boolean(cost && state.money >= cost);
};
