import { clamp } from '../utils/helpers';

const getSeasonPerformanceScore = (player = {}) => {
  const stats = player.seasonStats ?? {};
  const appearances = stats.appearances ?? 0;
  const avg = stats.averageRating ?? 6.6;
  const contributions = (stats.goals ?? 0) + (stats.assists ?? 0);
  const form = player.form ?? 60;
  const injuries = stats.injuries ?? 0;

  const minutesSignal = Math.min(1.1, appearances / 20);
  const ratingSignal = clamp((avg - 6.5) / 1.7, -0.8, 1.2);
  const contributionSignal = clamp(contributions / 16, 0, 1.1);
  const formSignal = clamp((form - 60) / 40, -0.6, 1);
  const injuryPenalty = clamp(injuries / 8, 0, 0.9);

  return (minutesSignal * 0.28) + (ratingSignal * 0.34) + (contributionSignal * 0.2) + (formSignal * 0.2) - (injuryPenalty * 0.38);
};

export const applyDynamicPotential = (player = {}, {
  worldState = null,
  staffDataAnalystLevel = 0,
  specializationYouthProgress = 0,
} = {}) => {
  const currentRating = Number(player.rating ?? 100);
  const currentPotential = Number(player.potential ?? currentRating);
  const age = Number(player.age ?? 24);
  const trust = Number(player.trust ?? 50);
  const morale = Number(player.moral ?? 50);
  const recurringRisk = Number(player.recurringInjuryRisk ?? 8);
  const isLateBloomer = player.hiddenTrait === 'late_bloomer';

  const perf = getSeasonPerformanceScore(player);
  const coachingBoost = clamp(staffDataAnalystLevel * 0.16 + specializationYouthProgress * 1.6, 0, 1.1);
  const environmentBoost = clamp(((trust - 50) / 100) + ((morale - 50) / 120), -0.7, 0.8);
  const worldBoost = worldState?.tendance === 'jeunes' && age <= 23
    ? 0.55
    : worldState?.tendance === 'experience' && age >= 29
      ? 0.38
      : 0;
  const injuryPenalty = clamp(((player.seasonStats?.injuries ?? 0) * 0.22) + (recurringRisk / 80), 0, 1.2);

  let delta = (perf * 1.7) + coachingBoost + environmentBoost + worldBoost - injuryPenalty;

  if (age <= 22) delta += 0.55;
  if (age >= 30 && !isLateBloomer) delta -= 0.85;
  if (age >= 34) delta -= 1.2;
  if (isLateBloomer && age <= 31) delta += 0.35;

  const roundedDelta = Math.round(clamp(delta, -3, 3));
  const hardCap = 200;
  const safeRating = clamp(currentRating, 60, hardCap);
  const desiredFloor = age <= 26 ? safeRating + 3 : safeRating + 1;
  const floor = Math.min(hardCap, Math.max(safeRating, desiredFloor));
  const nextPotential = clamp(currentPotential + roundedDelta, floor, hardCap);
  return {
    ...player,
    rating: safeRating,
    potential: nextPotential,
    potentialTrend: roundedDelta,
  };
};
