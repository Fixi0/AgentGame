import { AGENCY_CAPACITY_BY_LEVEL, AGENCY_UPGRADE_COSTS } from '../game/economy';
import { normalizeAgencyReputation } from './reputationSystem';

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

const AGENCY_LEVEL_REWARDS = [
  'Base de départ',
  'Premier palier de capacité',
  'Réseau plus large',
  'Agencement plus crédible',
  'Dossiers chauds plus fréquents',
  'Déblocage de marché élargi',
  'Crédibilité élevée',
  'Entrées plus fortes',
  'Réseau premium',
  'Puissance totale',
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
  const normalizedReputation = clampNumber(rep / 1000, 0, 1);
  const normalizedCredibility = clampNumber(credibility / 100, 0, 1);
  const normalizedTrust = clampNumber(avgTrust / 100, 0, 1);
  const normalizedRating = clampNumber(avgRating / 100, 0, 1);
  const normalizedStructure = clampNumber(officeLevel / 30, 0, 1);
  const normalizedStaff = clampNumber(staffLevel / 40, 0, 1);
  const normalizedAgency = clampNumber(((state.agencyLevel ?? 1) - 1) / 9, 0, 1);
  const normalizedRelations = clampNumber(relationScore / 100, 0, 1);
  const score = clampNumber(Math.round(100 * (
    normalizedReputation * 0.2
    + normalizedCredibility * 0.1
    + normalizedTrust * 0.1
    + normalizedRating * 0.1
    + normalizedStructure * 0.18
    + normalizedStaff * 0.17
    + normalizedAgency * 0.1
    + normalizedRelations * 0.05
  )), 0, 100);

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
      agencyLevel: state.agencyLevel ?? 1,
      portfolioValue,
      relationScore: Math.round(relationScore),
      utilization: Math.round(utilization * 100),
      agencyCompletion: Math.round(normalizedAgency * 100),
    },
    rewards: AGENCY_STAGES.map((stage) => ({
      label: stage.label,
      min: stage.min,
      max: stage.max,
      reward: stage.reward,
      reached: score >= stage.min,
    })),
    levelRewards: AGENCY_LEVEL_REWARDS.map((reward, index) => ({
      level: index + 1,
      reward,
      reached: (state.agencyLevel ?? 1) >= index + 1,
    })),
  };
};

export const canUpgradeAgency = (state) => {
  const cost = getAgencyUpgradeCost(state.agencyLevel);
  return Boolean(cost && state.money >= cost);
};
