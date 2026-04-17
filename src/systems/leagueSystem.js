import { CLUBS } from '../data/clubs';

const createRow = (club, countryCode) => ({
  club,
  countryCode,
  played: 0,
  win: 0,
  draw: 0,
  loss: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
  form: [],
});

export const createInitialLeagueTables = () =>
  CLUBS.reduce((tables, club) => {
    const table = tables[club.countryCode] ?? {};
    return {
      ...tables,
      [club.countryCode]: {
        ...table,
        [club.name]: createRow(club.name, club.countryCode),
      },
    };
  }, {});

export const mergeWithInitialLeagueTables = (tables = {}) => {
  const initial = createInitialLeagueTables();
  return Object.entries(initial).reduce((merged, [countryCode, table]) => ({
    ...merged,
    [countryCode]: {
      ...table,
      ...(tables[countryCode] ?? {}),
    },
  }), {});
};

const addResult = (row, goalsFor, goalsAgainst) => ({
  ...row,
  played: row.played + 1,
  win: row.win + (goalsFor > goalsAgainst ? 1 : 0),
  draw: row.draw + (goalsFor === goalsAgainst ? 1 : 0),
  loss: row.loss + (goalsFor < goalsAgainst ? 1 : 0),
  goalsFor: row.goalsFor + goalsFor,
  goalsAgainst: row.goalsAgainst + goalsAgainst,
  points: row.points + (goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0),
  form: [...(row.form ?? []), goalsFor > goalsAgainst ? 'V' : goalsFor === goalsAgainst ? 'N' : 'D'].slice(-5),
});

export const updateLeagueTables = (tables = {}, fixtures = []) => {
  const nextTables = { ...tables };

  fixtures.forEach((fixture) => {
    const countryCode = fixture.countryCode ?? fixture.homeClub.countryCode;
    const table = { ...(nextTables[countryCode] ?? {}) };
    const homeName = fixture.homeClub.name;
    const awayName = fixture.awayClub.name;

    table[homeName] = addResult(table[homeName] ?? createRow(homeName, countryCode), fixture.homeGoals, fixture.awayGoals);
    table[awayName] = addResult(table[awayName] ?? createRow(awayName, countryCode), fixture.awayGoals, fixture.homeGoals);
    nextTables[countryCode] = table;
  });

  return nextTables;
};

export const getSortedTable = (tables = {}, countryCode) =>
  Object.values(tables[countryCode] ?? {}).sort((a, b) =>
    b.points - a.points
    || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
    || b.goalsFor - a.goalsFor
    || a.club.localeCompare(b.club),
  );
