import { pick, rand } from '../utils/helpers';
import { getPlayerProfileSummary } from './playerProfileSystem';

const CAREER_GOALS = [
  { id: 'starter', label: 'Devenir titulaire indiscutable', metric: 'appearances', target: 24, rewardTrust: 6 },
  { id: 'europe', label: 'Jouer une compétition européenne', metric: 'rating', target: 156, rewardTrust: 5 },
  { id: 'national', label: 'Gagner une place en sélection', metric: 'form', target: 82, rewardTrust: 7 },
  { id: 'salary', label: 'Obtenir un meilleur salaire', metric: 'salary', targetMultiplier: 1.25, rewardTrust: 4 },
  { id: 'numbers', label: 'Faire une grosse saison statistique', metric: 'contributions', target: 14, rewardTrust: 6 },
];

export const createCareerGoal = (player) => {
  const goal = pick(CAREER_GOALS);
  return {
    ...goal,
    initialSalary: player.weeklySalary,
    target: goal.metric === 'salary' ? Math.floor(player.weeklySalary * goal.targetMultiplier) : goal.target,
  };
};

export const createScoutReport = (player, scoutLevel = 0) => {
  const uncertainty = Math.max(2, 12 - scoutLevel * 2);
  const profile = getPlayerProfileSummary(player);
  return {
    potentialMin: Math.max(player.rating, player.potential - rand(2, uncertainty)),
    potentialMax: Math.min(200, player.potential + rand(1, uncertainty)),
    confidence: Math.min(95, 45 + scoutLevel * 14 + (player.age < 21 ? 8 : 0)),
    profile,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    risk: profile.injuryRisk >= 65 ? 'physique' : profile.pressure <= 45 ? 'pression' : 'normal',
    note: `${profile.label} · forces: ${profile.strengths.join(', ')}. A surveiller: ${profile.weaknesses.join(', ')}. ${profile.advice}`,
  };
};

export const updateSeasonStats = (stats = {}, matchResult) => {
  if (!matchResult) return stats;
  const ratings = matchResult.matchRating ? [...(stats.ratings ?? []), matchResult.matchRating].slice(-38) : stats.ratings ?? [];

  return {
    appearances: (stats.appearances ?? 0) + (matchResult.minutes ? 1 : 0),
    goals: (stats.goals ?? 0) + (matchResult.goals ?? 0),
    assists: (stats.assists ?? 0) + (matchResult.assists ?? 0),
    saves: (stats.saves ?? 0) + (matchResult.saves ?? 0),
    tackles: (stats.tackles ?? 0) + (matchResult.tackles ?? 0),
    keyPasses: (stats.keyPasses ?? 0) + (matchResult.keyPasses ?? 0),
    xg: Number(((stats.xg ?? 0) + (matchResult.xg ?? 0)).toFixed(2)),
    injuries: stats.injuries ?? 0,
    ratings,
    averageRating: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)) : null,
  };
};

export const getCareerGoalProgress = (player) => {
  const goal = player.careerGoal;
  if (!goal) return { value: 0, target: 1, percent: 0, done: false };
  const stats = player.seasonStats ?? {};
  let value = 0;

  if (goal.metric === 'appearances') value = stats.appearances ?? 0;
  if (goal.metric === 'rating') value = player.rating ?? 0;
  if (goal.metric === 'form') value = player.form ?? 0;
  if (goal.metric === 'salary') value = player.weeklySalary ?? 0;
  if (goal.metric === 'contributions') value = (stats.goals ?? 0) + (stats.assists ?? 0);

  const percent = Math.min(100, Math.round((value / goal.target) * 100));
  return { value, target: goal.target, percent, done: value >= goal.target };
};
