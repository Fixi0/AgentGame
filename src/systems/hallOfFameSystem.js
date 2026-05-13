/**
 * hallOfFameSystem.js
 * Carrière long terme : retraite des joueurs gérés et hall of fame.
 */

const RETIREMENT_AGE = 36;

export const computeRetirementCandidates = (roster = []) =>
  roster.filter((p) => (p.age ?? 24) >= RETIREMENT_AGE);

const buildHallOfFameEntry = (player, week) => ({
  id: `hof_${player.id}_${week}`,
  playerId: player.id,
  name: `${player.firstName} ${player.lastName}`,
  countryCode: player.countryCode,
  countryFlag: player.countryFlag,
  position: player.position,
  retiredAtWeek: week,
  retiredAtAge: player.age ?? 36,
  finalRating: player.rating ?? 0,
  finalClub: player.club,
  totalGoals: player.careerGoals ?? player.stats?.goals ?? 0,
  totalAssists: player.careerAssists ?? player.stats?.assists ?? 0,
  totalEarned: player.careerEarnings ?? Math.round((player.weeklySalary ?? 0) * (player.contractWeeksLeft ?? 0)),
  trophies: player.trophies ?? [],
  selectionsCount: player.selectionsCount ?? 0,
  ballonDorWins: player.ballonDorWins ?? 0,
});

export const processRetirements = (state) => {
  const week = state.week ?? 1;
  const candidates = computeRetirementCandidates(state.roster ?? []);
  if (!candidates.length) return { state, retired: [] };

  const retiredIds = new Set(candidates.map((p) => p.id));
  const newRoster = (state.roster ?? []).filter((p) => !retiredIds.has(p.id));
  const newEntries = candidates.map((p) => buildHallOfFameEntry(p, week));
  const hallOfFame = [...newEntries, ...((state.hallOfFame) ?? [])].slice(0, 200);
  return {
    state: { ...state, roster: newRoster, hallOfFame },
    retired: newEntries,
  };
};

export const getHallOfFame = (state) => state.hallOfFame ?? [];
