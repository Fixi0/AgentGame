/**
 * Weekly Events System
 * Generates coherent weekly events based on actual player performance
 * Persists events to database for historical tracking
 */

import { clamp, makeId } from '../utils/helpers';

// ─── COHERENCE THRESHOLDS ────────────────────────────────────────

const COHERENCE_THRESHOLDS = {
  ballonDor: {
    minRating: 170, // MUST be 170+ (equiv. 85 on old scale) to win Ballon d'Or
    minSeasonAvg: 8.2, // Season average must be 8.2+
    minAppearances: 25, // At least 25 appearances
    scoreNeeded: 300, // Total coherence score
  },
  mvpWeek: {
    minRating: 144, // MVP is for good players (equiv. 72 on old scale)
    minMatchRating: 7.8, // Match rating 7.8+
  },
  topGoalscorer: {
    minGoals: 15, // At least 15 goals for season
    minRating: 150, // equiv. 75 on old scale
  },
  mostAssists: {
    minAssists: 10,
    minRating: 146, // equiv. 73 on old scale
  },
  bestDefender: {
    minDefense: 16, // Defense stat 16+
    minRating: 150, // equiv. 75 on old scale
    minAppearances: 20,
  },
  bestGoalkeeper: {
    minRating: 152, // equiv. 76 on old scale
    minHandling: 17,
    minDistribution: 15,
    minCleanSheets: 8,
  },
  risingStar: {
    maxAge: 23,
    minRating: 156, // equiv. 78 on old scale
    minPotential: 174, // equiv. 87 on old scale
  },
  comeback: {
    minPreviousInjury: 4, // Was out 4+ weeks
    minMinutesBack: 45, // Back and played
  },
  hatTrick: {
    minGoals: 3,
    minMatchRating: 7.0,
  },
};

// ─── COHERENCE SCORING ────────────────────────────────────────

/**
 * Calculate coherence score for player in context
 * Returns { score, reasons [] }
 */
export const calculateCoherenceScore = (player = {}) => {
  const reasons = [];
  let score = 0;

  // Base: current rating (0-100 normalized to 0-200)
  const ratingScore = (player.rating ?? 0) * 2;
  score += ratingScore;

  // Season performance (if available)
  if (player.seasonStats?.averageRating) {
    const seasonScore = Math.max(0, (player.seasonStats.averageRating - 5) * 30);
    score += seasonScore;
    if (seasonScore > 0) reasons.push(`Performance saisonnière (${player.seasonStats.averageRating.toFixed(1)})`);
  }

  // Appearances (commitment, availability)
  if (player.seasonStats?.appearances) {
    const appearanceBonus = Math.min(player.seasonStats.appearances * 2, 40);
    score += appearanceBonus;
    if (appearanceBonus > 0) reasons.push(`Disponibilité (${player.seasonStats.appearances} matches)`);
  }

  // Goal impact (but limited - not everything is about goals)
  const goals = player.seasonStats?.goals ?? 0;
  const assists = player.seasonStats?.assists ?? 0;
  const goalImpact = Math.min(goals * 2 + assists, 30);
  score += goalImpact;
  if (goalImpact > 0) reasons.push(`Impact offensif (${goals} buts, ${assists} passes)`);

  // Form bonus
  if (player.form && player.form > 50) {
    const formBonus = Math.min((player.form - 50) * 0.8, 20);
    score += formBonus;
    if (formBonus > 0) reasons.push(`Forme actuelle (+${formBonus.toFixed(0)})`);
  }

  // Brand value (media attention)
  if (player.brandValue && player.brandValue > 20) {
    const brandBonus = Math.min((player.brandValue - 20) * 0.5, 15);
    score += brandBonus;
    if (brandBonus > 0) reasons.push(`Visibilité médiatique (+${brandBonus.toFixed(0)})`);
  }

  // Injury penalty (can't win awards while injured)
  if (player.injured && player.injured > 0) {
    score = 0;
    reasons.push('Actuellement blessé - inéligible');
  }

  return {
    score: Math.round(score),
    reasons,
    eligible: player.injured <= 0,
  };
};

// ─── WEEKLY EVENTS GENERATION ────────────────────────────────────────

/**
 * Generate coherent weekly events for player
 * Returns array of { type, title, text, impact, eligible_reason }
 */
export const generateWeeklyEvents = (player = {}, weekStats = {}) => {
  const events = [];

  if (!player || !weekStats || weekStats.minutes <= 0) {
    return events; // No events if didn't play
  }

  const matchRating = weekStats.matchRating ?? 6.5;
  const minutes = weekStats.minutes ?? 0;
  const goals = weekStats.goals ?? 0;
  const assists = weekStats.assists ?? 0;
  const rating = player.rating ?? 60;

  // MVP of the Week (very good performance)
  if (
    rating >= COHERENCE_THRESHOLDS.mvpWeek.minRating &&
    matchRating >= COHERENCE_THRESHOLDS.mvpWeek.minMatchRating &&
    minutes >= 45
  ) {
    events.push({
      type: 'mvp_week',
      title: `MVP de la semaine`,
      text: `${player.firstName} ${player.lastName} a eu l'une de ses meilleures semaines (note ${matchRating.toFixed(1)}).`,
      icon: '⭐',
      impact: { money: 2500, reputation: 3, value: player.value * 0.02 },
    });
  }

  // Hat-trick (3+ goals in one match)
  if (goals >= COHERENCE_THRESHOLDS.hatTrick.minGoals && matchRating >= COHERENCE_THRESHOLDS.hatTrick.minMatchRating) {
    events.push({
      type: 'hatrick',
      title: `Triplé!`,
      text: `${player.firstName} ${player.lastName} a marqué 3 buts dans le match de cette semaine.`,
      icon: '🎩',
      impact: { money: 8000, reputation: 8, value: player.value * 0.05 },
    });
  }

  // Good assist week
  if (assists >= 2 && rating >= 146) {
    events.push({
      type: 'assist_week',
      title: `Passeur généreuse`,
      text: `${player.firstName} a distribué ${assists} passes décisives cette semaine.`,
      icon: '🎯',
      impact: { money: 1500, reputation: 2 },
    });
  }

  // Comeback from injury
  if (
    weekStats.justReturnedFromInjury &&
    minutes >= COHERENCE_THRESHOLDS.comeback.minMinutesBack &&
    matchRating >= 6.5
  ) {
    events.push({
      type: 'injury_comeback',
      title: `Retour gagnant`,
      text: `${player.firstName} est revenu sur le terrain après blessure avec une bonne performance.`,
      icon: '💪',
      impact: { money: 4000, reputation: 4 },
    });
  }

  // Poor form warning (bad performance)
  if (matchRating <= 5.5 && minutes >= 45) {
    events.push({
      type: 'poor_form',
      title: `Performance décevante`,
      text: `${player.firstName} a eu une mauvaise semaine sur le terrain (note ${matchRating.toFixed(1)}).`,
      icon: '📉',
      impact: { money: -1000, reputation: -2 },
    });
  }

  return events;
};

// ─── SEASON AWARDS (END OF SEASON) ────────────────────────────────────────

/**
 * Generate coherent season awards
 * Much stricter than weekly events
 */
export const generateSeasonAwards = (roster = [], week = 38) => {
  const awards = [];

  if (week < 38) return awards; // Only generate at season end

  // Filter eligible players
  const eligible = roster
    .filter((p) => p.injured <= 0)
    .filter((p) => (p.seasonStats?.appearances ?? 0) >= COHERENCE_THRESHOLDS.ballonDor.minAppearances);

  // BALLON D'OR - VERY STRICT
  const ballonDorCandidate = eligible
    .filter(
      (p) =>
        p.rating >= COHERENCE_THRESHOLDS.ballonDor.minRating &&
        (p.seasonStats?.averageRating ?? 0) >= COHERENCE_THRESHOLDS.ballonDor.minSeasonAvg,
    )
    .sort((a, b) => calculateCoherenceScore(b).score - calculateCoherenceScore(a).score)[0];

  if (ballonDorCandidate && calculateCoherenceScore(ballonDorCandidate).score >= COHERENCE_THRESHOLDS.ballonDor.scoreNeeded) {
    awards.push({
      id: makeId('award'),
      type: 'ballon_dor',
      title: `Ballon d'Or`,
      playerName: `${ballonDorCandidate.firstName} ${ballonDorCandidate.lastName}`,
      playerId: ballonDorCandidate.id,
      rating: ballonDorCandidate.rating,
      seasonAvg: ballonDorCandidate.seasonStats?.averageRating,
      coherenceScore: calculateCoherenceScore(ballonDorCandidate).score,
      impact: { money: 80000, reputation: 35, value: ballonDorCandidate.value * 0.55 },
    });
  }

  // TOP GOALSCORER
  const topScorer = roster
    .filter((p) => (p.seasonStats?.goals ?? 0) >= COHERENCE_THRESHOLDS.topGoalscorer.minGoals)
    .filter((p) => p.rating >= COHERENCE_THRESHOLDS.topGoalscorer.minRating)
    .sort((a, b) => (b.seasonStats?.goals ?? 0) - (a.seasonStats?.goals ?? 0))[0];

  if (topScorer) {
    awards.push({
      id: makeId('award'),
      type: 'top_goalscorer',
      title: `Meilleur buteur`,
      playerName: `${topScorer.firstName} ${topScorer.lastName}`,
      playerId: topScorer.id,
      goals: topScorer.seasonStats?.goals,
      coherenceScore: calculateCoherenceScore(topScorer).score,
      impact: { money: 25000, reputation: 12 },
    });
  }

  // BEST DEFENDER
  const bestDef = roster
    .filter((p) => {
      const def = p.attributes?.defense?.current ?? 10;
      return def >= COHERENCE_THRESHOLDS.bestDefender.minDefense && p.rating >= COHERENCE_THRESHOLDS.bestDefender.minRating;
    })
    .filter((p) => (p.seasonStats?.appearances ?? 0) >= COHERENCE_THRESHOLDS.bestDefender.minAppearances)
    .sort((a, b) => (b.attributes?.defense?.current ?? 0) - (a.attributes?.defense?.current ?? 0))[0];

  if (bestDef) {
    awards.push({
      id: makeId('award'),
      type: 'best_defender',
      title: `Meilleur défenseur`,
      playerName: `${bestDef.firstName} ${bestDef.lastName}`,
      playerId: bestDef.id,
      defenseRating: bestDef.attributes?.defense?.current,
      coherenceScore: calculateCoherenceScore(bestDef).score,
      impact: { money: 18000, reputation: 8 },
    });
  }

  // BEST GOALKEEPER
  const bestGK = roster
    .filter((p) => p.position === 'GK')
    .filter((p) => {
      const handling = p.attributes?.handling?.current ?? 10;
      const dist = p.attributes?.distribution?.current ?? 10;
      return handling >= COHERENCE_THRESHOLDS.bestGoalkeeper.minHandling &&
             dist >= COHERENCE_THRESHOLDS.bestGoalkeeper.minDistribution &&
             p.rating >= COHERENCE_THRESHOLDS.bestGoalkeeper.minRating;
    })
    .sort((a, b) => calculateCoherenceScore(b).score - calculateCoherenceScore(a).score)[0];

  if (bestGK) {
    awards.push({
      id: makeId('award'),
      type: 'best_goalkeeper',
      title: `Meilleur gardien`,
      playerName: `${bestGK.firstName} ${bestGK.lastName}`,
      playerId: bestGK.id,
      coherenceScore: calculateCoherenceScore(bestGK).score,
      impact: { money: 15000, reputation: 6 },
    });
  }

  // RISING STAR (Young player with high potential)
  const ringStar = roster
    .filter((p) => p.age <= COHERENCE_THRESHOLDS.risingStar.maxAge)
    .filter((p) => p.rating >= COHERENCE_THRESHOLDS.risingStar.minRating && p.potential >= COHERENCE_THRESHOLDS.risingStar.minPotential)
    .sort((a, b) => (b.potential ?? 0) - (a.potential ?? 0))[0];

  if (ringStar) {
    awards.push({
      id: makeId('award'),
      type: 'rising_star',
      title: `Espoir de l'année`,
      playerName: `${ringStar.firstName} ${ringStar.lastName}`,
      playerId: ringStar.id,
      age: ringStar.age,
      potential: ringStar.potential,
      impact: { money: 12000, reputation: 7 },
    });
  }

  return awards;
};

// ─── ARCHIVE WEEKLY EVENTS ────────────────────────────────────────

/**
 * Create archivable weekly events record
 * For persistence in database
 */
export const createWeeklyEventArchive = (week, events = [], roster = []) => ({
  id: makeId('weekly_events'),
  week,
  date: new Date().toISOString(),
  events: events.map((event) => ({
    ...event,
    createdAt: new Date().toISOString(),
  })),
  summary: {
    totalEvents: events.length,
    topPerformers: roster
      .filter((p) => events.some((e) => e.type === 'mvp_week' && e.playerId === p.id))
      .map((p) => `${p.firstName} ${p.lastName}`),
  },
});

// ─── VALIDATION HELPERS ────────────────────────────────────────

export const isEventCoherent = (event, player, context = {}) => {
  const rating = player?.rating ?? 0;
  const seasonAvg = player?.seasonStats?.averageRating ?? 0;

  switch (event.type) {
    case 'ballon_dor':
      return rating >= 170 && seasonAvg >= 8.2;
    case 'mvp_week':
      return rating >= 144 && (event.matchRating ?? 0) >= 7.8;
    case 'hatrick':
      return rating >= 140 && (event.goals ?? 0) >= 3;
    case 'top_goalscorer':
      return rating >= 150 && (event.goals ?? 0) >= 15;
    case 'best_defender':
      return rating >= 150 && (player?.attributes?.defense?.current ?? 0) >= 16;
    case 'best_goalkeeper':
      return player?.position === 'GK' && rating >= 152;
    case 'rising_star':
      return player?.age <= 23 && rating >= 156 && (player?.potential ?? 0) >= 174;
    default:
      return true;
  }
};

export default {
  calculateCoherenceScore,
  generateWeeklyEvents,
  generateSeasonAwards,
  createWeeklyEventArchive,
  isEventCoherent,
  COHERENCE_THRESHOLDS,
};
