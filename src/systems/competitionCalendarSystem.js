export const INTERNATIONAL_BREAK_WEEKS = [6, 11, 18];

export const EUROPEAN_SCHEDULE = {
  CL: {
    league: [4, 6, 8, 10, 12, 14, 16, 18],
    playoff: [22, 23],
    roundOf16: [26, 27],
    quarters: [30, 31],
    semis: [34, 35],
    final: [37],
  },
  EL: {
    league: [4, 6, 8, 10, 12, 14, 16, 18],
    playoff: [22, 23],
    roundOf16: [26, 27],
    quarters: [30, 31],
    semis: [34, 35],
    final: [37],
  },
  ECL: {
    league: [6, 8, 10, 12, 14, 16],
    playoff: [22, 23],
    roundOf16: [26, 27],
    quarters: [30, 31],
    semis: [34, 35],
    final: [37],
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
