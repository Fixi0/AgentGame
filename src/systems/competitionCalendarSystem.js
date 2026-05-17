export const INTERNATIONAL_BREAK_WEEKS = [6, 11, 18, 30];

export const EUROPEAN_SCHEDULE = {
  CL: {
    league: [3, 5, 7, 9, 11, 13, 15, 17],
    playoff: [20, 21],
    roundOf16: [23, 24],
    quarters: [26, 27],
    semis: [29, 30],
    final: [33],
  },
  EL: {
    league: [4, 6, 8, 10, 12, 14, 16, 18],
    playoff: [20, 21],
    roundOf16: [23, 24],
    quarters: [26, 27],
    semis: [29, 30],
    final: [33],
  },
  ECL: {
    league: [5, 7, 9, 11, 13, 15],
    playoff: [20, 21],
    roundOf16: [23, 24],
    quarters: [26, 27],
    semis: [29, 30],
    final: [33],
  },
};

const seasonWeekFromWeek = (week = 1) => ((week - 1) % 38) + 1;
const seasonFromWeek = (week = 1) => Math.floor((week - 1) / 38) + 1;

export const isInternationalBreakProgramWeek = (seasonWeek) => INTERNATIONAL_BREAK_WEEKS.includes(seasonWeek);

export const getWeekProgram = (week = 1) => {
  const seasonWeek = seasonWeekFromWeek(week);
  const season = seasonFromWeek(week);
  const inWorldCupCycle = ((season - 1) % 4) === 0;
  const winterWindow = seasonWeek >= 19 && seasonWeek <= 20;
  const summerWindow = seasonWeek === 38;
  const internationalBreak = isInternationalBreakProgramWeek(seasonWeek);
  const leagueMatchday = !summerWindow && !internationalBreak;
  const european = Object.entries(EUROPEAN_SCHEDULE).reduce((acc, [competition, schedule]) => {
    const played = Object.values(schedule).some((weeks) => weeks.includes(seasonWeek));
    if (played) acc.push(competition);
    return acc;
  }, []);

  return {
    week,
    season,
    seasonWeek,
    leagueMatchday,
    winterWindow,
    summerWindow,
    internationalBreak,
    european,
    worldCupCycle: inWorldCupCycle,
    worldCupKickoffWeek: inWorldCupCycle ? 38 : null,
  };
};

export const getUpcomingProgram = (week = 1, span = 10) =>
  Array.from({ length: span }, (_unused, index) => getWeekProgram(week + index));
