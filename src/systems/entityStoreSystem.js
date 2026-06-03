import { createGameDatabaseSnapshot } from '../data/gameDatabase';
import { createEntityRepositories } from './entityRepositorySystem';

export const ENTITY_DB_SCHEMA_VERSION = 1;
export const RUNTIME_DB_KEY = '__agentFcRuntimeDb';

const asArray = (value) => (Array.isArray(value) ? value : []);

const indexBy = (rows = [], key = 'id') => Object.fromEntries(
  asArray(rows)
    .filter((row) => row && row[key] !== undefined && row[key] !== null)
    .map((row) => [String(row[key]), row]),
);

const groupBy = (rows = [], key = 'id') => asArray(rows).reduce((groups, row) => {
  if (!row || row[key] === undefined || row[key] === null) return groups;
  const id = String(row[key]);
  if (!groups[id]) groups[id] = [];
  groups[id].push(row);
  return groups;
}, {});

const groupFixtureClubs = (fixtures = []) => asArray(fixtures).reduce((groups, fixture) => {
  const ids = [fixture.club_id, fixture.home_club_id, fixture.away_club_id].filter(Boolean);
  ids.forEach((clubId) => {
    const key = String(clubId);
    if (!groups[key]) groups[key] = [];
    groups[key].push(fixture);
  });
  return groups;
}, {});

export const createRuntimeEntityDb = (state = {}) => {
  const sqlTables = state?.databaseTables ?? null;
  const snapshot = createGameDatabaseSnapshot(state);
  const pickRows = (snapshotRows = [], sqlRows = []) =>
    (asArray(snapshotRows).length ? snapshotRows : sqlRows);
  const tables = {
    agency: pickRows(snapshot?.agency, sqlTables?.agency),
    players: pickRows(snapshot?.players, sqlTables?.players),
    clubs: pickRows(snapshot?.clubs, sqlTables?.clubs),
    countries: pickRows(snapshot?.countries, sqlTables?.countries),
    competitions: [
      ...pickRows(snapshot?.leagues, sqlTables?.leagues),
      ...pickRows(snapshot?.european_competitions, sqlTables?.european_competitions),
      ...pickRows(snapshot?.world_cups, sqlTables?.world_cups),
    ],
    fixtures: pickRows(snapshot?.fixtures, sqlTables?.fixtures),
    matchResults: pickRows(snapshot?.match_results, sqlTables?.match_results),
    contracts: pickRows(snapshot?.contracts, sqlTables?.contracts),
    transfers: pickRows(snapshot?.transfers, sqlTables?.transfers),
    offers: pickRows(snapshot?.club_offers, sqlTables?.club_offers),
    messages: pickRows(snapshot?.messages, sqlTables?.messages),
    newsPosts: pickRows(snapshot?.news_posts, sqlTables?.news_posts),
    leagueRows: pickRows(snapshot?.league_table_rows, sqlTables?.league_table_rows),
    competitionHistory: pickRows(snapshot?.competition_history, sqlTables?.competition_history),
    injuries: pickRows(snapshot?.injuries, sqlTables?.injuries),
    scoutingReports: pickRows(snapshot?.scouting_reports, sqlTables?.scouting_reports),
    promises: pickRows(snapshot?.promises, sqlTables?.promises),
    contacts: pickRows(snapshot?.contacts, sqlTables?.contacts),
  };

  const entityDb = {
    schemaVersion: ENTITY_DB_SCHEMA_VERSION,
    generatedAtWeek: state.week ?? 1,
    generatedAtDay: state.day ?? 1,
    source: sqlTables ? 'hybrid_runtime_snapshot' : 'runtime_snapshot',
    tables,
    byId: {
      players: indexBy(tables.players),
      clubs: indexBy(tables.clubs),
      fixtures: indexBy(tables.fixtures),
      matchResults: indexBy(tables.matchResults),
      contracts: indexBy(tables.contracts),
      transfers: indexBy(tables.transfers),
      offers: indexBy(tables.offers),
      messages: indexBy(tables.messages),
      newsPosts: indexBy(tables.newsPosts),
    },
    indexes: {
      playersByClubId: groupBy(tables.players, 'club_current_id'),
      playersByMarketStatus: groupBy(tables.players, 'market_status'),
      fixturesByClubId: groupFixtureClubs(tables.fixtures),
      fixturesByWeek: groupBy(tables.fixtures, 'week'),
      fixturesByStatus: groupBy(tables.fixtures, 'status'),
      resultsByFixtureId: groupBy(tables.matchResults, 'fixture_id'),
      resultsByPlayerId: groupBy(tables.matchResults, 'player_id'),
      offersByPlayerId: groupBy(tables.offers, 'player_id'),
      contractsByPlayerId: groupBy(tables.contracts, 'player_id'),
      transfersByPlayerId: groupBy(tables.transfers, 'player_id'),
      messagesByPlayerId: groupBy(tables.messages, 'player_id'),
      leagueRowsByClubId: groupBy(tables.leagueRows, 'club_id'),
    },
  };
  return {
    ...entityDb,
    repositories: createEntityRepositories(entityDb),
  };
};

export const attachRuntimeEntityDb = (state = {}) => {
  if (!state || typeof state !== 'object') return state;
  const next = { ...state, entityDbVersion: ENTITY_DB_SCHEMA_VERSION };
  const runtimeEntityDb = createRuntimeEntityDb(next);
  next.databaseTables = runtimeEntityDb.tables;
  Object.defineProperty(next, RUNTIME_DB_KEY, {
    value: runtimeEntityDb,
    enumerable: false,
    configurable: true,
    writable: false,
  });
  return next;
};

export const getRuntimeEntityDb = (state = {}) => {
  if (state?.[RUNTIME_DB_KEY]) return state[RUNTIME_DB_KEY];
  return createRuntimeEntityDb(state ?? {});
};

export const stripRuntimeEntityDb = (state = {}) => {
  if (!state || typeof state !== 'object') return state;
  const { runtimeDb, entityDb, database, db, [RUNTIME_DB_KEY]: hiddenRuntimeDb, ...serializable } = state;
  return serializable;
};
