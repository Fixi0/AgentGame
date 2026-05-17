import { buildWeeklyFixtures, simulateFixturePlayerResults } from '../systems/matchSystem';

const DAYS_PER_WEEK = 7;

const nextDayState = (state = {}) => {
  const day = Number(state.day ?? 1);
  const week = Number(state.week ?? 1);
  const seasonDay = Number(state.seasonDay ?? 1);
  const advancedDay = day >= DAYS_PER_WEEK ? 1 : day + 1;
  const advancedWeek = day >= DAYS_PER_WEEK ? week + 1 : week;
  return {
    ...state,
    day: advancedDay,
    week: advancedWeek,
    seasonDay: seasonDay + 1,
  };
};

export const advanceDay = (state = {}) => {
  const updated = nextDayState(state);
  const isMatchday = updated.day === 6;
  if (!isMatchday) return { state: updated, fixtures: [], matchResults: [] };

  const roster = Array.isArray(state.roster) ? state.roster : [];
  const fixtures = buildWeeklyFixtures(roster, updated.week);
  const matchResults = simulateFixturePlayerResults(fixtures, roster);
  return { state: updated, fixtures, matchResults };
};
