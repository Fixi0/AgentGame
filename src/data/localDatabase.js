import { createGameCatalog, createGameDatabaseSnapshot } from './gameDatabase';
import { stripRuntimeEntityDb } from '../systems/entityStoreSystem';
import { ensureGabrielFixioPower, setDatabasePlayerCatalog } from './squadDatabase';
import { STORAGE_KEY } from '../game/gameLogic';
import { applyRuntimeIntegrity } from '../systems/integritySystem';
import { normalizeAgencyName } from '../systems/agencySystem';

const DB_NAME = 'agent_foot_local_db';
const DB_VERSION = 8;
const SAVE_ID = 'active_save';
const CATALOG_ID = 'catalog_v2';
const SAVE_SLOT_MIN = 1;
const SAVE_SLOT_MAX = 3;
const ACTIVE_SAVE_META_KEY = 'active_save';
// Bumper cette valeur à chaque modification de la base de données de joueurs
// pour forcer un re-seed automatique sans perdre la sauvegarde en cours.
const CATALOG_DATA_VERSION = '2026-05-12-signature-marseille-trio-v1';

const STATIC_TABLES = [
  'countries',
  'cities',
  'leagues',
  'clubs',
  'personalities',
  'event_templates',
  'narrative_templates',
  'staff_roles',
  'agency_defaults',
  'catalog_players',
];

const GAME_TABLES = [
  'agency',
  'agency_upgrades',
  'staff',
  'players',
  'player_agent_relationships',
  'careers',
  'contracts',
  'transfers',
  'injuries',
  'loans',
  'negotiations',
  'negotiation_turns',
  'seasons',
  'objectives',
  'event_instances',
  'messages',
  'message_choices',
  'chosen_message_responses',
  'news_posts',
  'sponsors',
  'rival_agents',
  'rival_agent_relations',
  'scouting_reports',
  'promises',
  'club_offers',
  'market_snapshots',
  'fixtures',
  'match_results',
  'competition_history',
  'league_seasons',
  'league_table_rows',
  'club_season_history',
  'club_memory',
  'club_relations',
  'dossier_memory',
  'decision_history',
  'contacts',
  'agency_goals',
  'world_states',
  'world_cups',
  'european_competitions',
  'narrative_arcs',
  'season_awards',
  'weekly_events',
  'save_slots',
];

let saveProgressQueue = Promise.resolve();

const SNAPSHOT_TABLE_MAP = {
  saves: 'save_slots',
};

const STORE_DEFINITIONS = [
  { name: 'saves', keyPath: 'id', indexes: [{ name: 'updated_at', keyPath: 'updatedAt' }] },
  { name: 'meta', keyPath: 'id' },
  { name: 'catalog', keyPath: 'id' },
  { name: 'countries', keyPath: 'id', indexes: [{ name: 'code', keyPath: 'code', unique: true }] },
  { name: 'cities', keyPath: 'id', indexes: [{ name: 'country_id', keyPath: 'country_id' }] },
  { name: 'leagues', keyPath: 'id', indexes: [{ name: 'country_id', keyPath: 'country_id' }] },
  { name: 'clubs', keyPath: 'id', indexes: [{ name: 'country_id', keyPath: 'country_id' }, { name: 'league_id', keyPath: 'league_id' }] },
  { name: 'personalities', keyPath: 'id', indexes: [{ name: 'code', keyPath: 'code', unique: true }] },
  { name: 'event_templates', keyPath: 'id', indexes: [{ name: 'type', keyPath: 'type' }] },
  { name: 'narrative_templates', keyPath: 'id', indexes: [{ name: 'domain_period', keyPath: ['domain', 'period_key'] }] },
  { name: 'staff_roles', keyPath: 'id' },
  { name: 'agency_defaults', keyPath: 'id' },
  { name: 'catalog_players', keyPath: 'id', indexes: [
    { name: 'club', keyPath: 'club' },
    { name: 'countryCode', keyPath: 'countryCode' },
    { name: 'position', keyPath: 'position' },
    { name: 'rating', keyPath: 'rating' },
  ] },
  { name: 'agency', keyPath: 'id' },
  { name: 'agency_upgrades', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }] },
  { name: 'staff', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }, { name: 'role', keyPath: 'role' }] },
  { name: 'players', keyPath: 'id', indexes: [
    { name: 'club_id', keyPath: 'club_current_id' },
    { name: 'status', keyPath: 'career_status' },
    { name: 'market_status', keyPath: 'market_status' },
    { name: 'agency_id', keyPath: 'agency_id' },
  ] },
  { name: 'player_agent_relationships', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }, { name: 'player_id', keyPath: 'player_id' }] },
  { name: 'careers', keyPath: 'id', indexes: [{ name: 'player_id', keyPath: 'player_id' }, { name: 'season_id', keyPath: 'season_id' }] },
  { name: 'contracts', keyPath: 'id', indexes: [{ name: 'player_id', keyPath: 'player_id' }, { name: 'end_date', keyPath: 'end_date' }] },
  { name: 'transfers', keyPath: 'id', indexes: [{ name: 'player_id', keyPath: 'player_id' }, { name: 'season_id', keyPath: 'season_id' }] },
  { name: 'injuries', keyPath: 'id', indexes: [
    { name: 'player_id', keyPath: 'player_id' },
    { name: 'season_id', keyPath: 'season_id' },
    { name: 'status', keyPath: 'status' },
    { name: 'week', keyPath: 'week' },
  ] },
  { name: 'loans', keyPath: 'id', indexes: [{ name: 'player_id', keyPath: 'player_id' }, { name: 'status', keyPath: 'status' }] },
  { name: 'negotiations', keyPath: 'id', indexes: [
    { name: 'agency_id', keyPath: 'agency_id' },
    { name: 'status', keyPath: 'status' },
    { name: 'agency_id_status', keyPath: ['agency_id', 'status'] },
  ] },
  { name: 'negotiation_turns', keyPath: 'id', indexes: [{ name: 'negotiation_id', keyPath: 'negotiation_id' }] },
  { name: 'seasons', keyPath: 'id', indexes: [{ name: 'active', keyPath: 'active' }] },
  { name: 'objectives', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }, { name: 'season_id', keyPath: 'season_id' }] },
  { name: 'event_instances', keyPath: 'id', indexes: [
    { name: 'agency_id', keyPath: 'agency_id' },
    { name: 'status', keyPath: 'status' },
    { name: 'agency_id_status', keyPath: ['agency_id', 'status'] },
  ] },
  { name: 'messages', keyPath: 'id', indexes: [
    { name: 'agency_id', keyPath: 'agency_id' },
    { name: 'status', keyPath: 'status' },
    { name: 'player_id', keyPath: 'player_id' },
    { name: 'agency_id_status', keyPath: ['agency_id', 'status'] },
  ] },
  { name: 'message_choices', keyPath: 'id', indexes: [{ name: 'message_id', keyPath: 'message_id' }] },
  { name: 'chosen_message_responses', keyPath: 'id', indexes: [{ name: 'message_id', keyPath: 'message_id' }] },
  { name: 'news_posts', keyPath: 'id', indexes: [
    { name: 'agency_id', keyPath: 'agency_id' },
    { name: 'created_at', keyPath: 'created_at' },
    { name: 'agency_id_created_at', keyPath: ['agency_id', 'created_at'] },
  ] },
  { name: 'sponsors', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }, { name: 'player_id', keyPath: 'player_id' }] },
  { name: 'rival_agents', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }] },
  { name: 'rival_agent_relations', keyPath: 'id', indexes: [{ name: 'player_id', keyPath: 'player_id' }, { name: 'agency_id', keyPath: 'agency_id' }] },
  { name: 'scouting_reports', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }, { name: 'player_id', keyPath: 'player_id' }] },
  { name: 'promises', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }, { name: 'player_id', keyPath: 'player_id' }] },
  { name: 'club_offers', keyPath: 'id', indexes: [{ name: 'player_id', keyPath: 'player_id' }, { name: 'status', keyPath: 'status' }, { name: 'club_id', keyPath: 'club_id' }] },
  { name: 'market_snapshots', keyPath: 'id', indexes: [
    { name: 'agency_id', keyPath: 'agency_id' },
    { name: 'player_id', keyPath: 'player_id' },
    { name: 'week', keyPath: 'week' },
    { name: 'market_type', keyPath: 'market_type' },
    { name: 'expires_week', keyPath: 'expires_week' },
  ] },
  { name: 'fixtures', keyPath: 'id', indexes: [
    { name: 'week', keyPath: 'week' },
    { name: 'club_id', keyPath: 'club_id' },
    { name: 'home_club_id', keyPath: 'home_club_id' },
    { name: 'away_club_id', keyPath: 'away_club_id' },
    { name: 'competition', keyPath: 'competition' },
    { name: 'status', keyPath: 'status' },
  ] },
  { name: 'match_results', keyPath: 'id', indexes: [
    { name: 'fixture_id', keyPath: 'fixture_id' },
    { name: 'match_id', keyPath: 'match_id' },
    { name: 'player_id', keyPath: 'player_id' },
    { name: 'club_id', keyPath: 'club_id' },
    { name: 'opponent_id', keyPath: 'opponent_id' },
    { name: 'week', keyPath: 'week' },
    { name: 'competition', keyPath: 'competition' },
  ] },
  { name: 'competition_history', keyPath: 'id', indexes: [
    { name: 'season_id', keyPath: 'season_id' },
    { name: 'week', keyPath: 'week' },
    { name: 'competition', keyPath: 'competition' },
    { name: 'club_id', keyPath: 'club_id' },
  ] },
  { name: 'league_seasons', keyPath: 'id', indexes: [{ name: 'season_id', keyPath: 'season_id' }, { name: 'country_code', keyPath: 'country_code' }] },
  { name: 'league_table_rows', keyPath: 'id', indexes: [{ name: 'country_code', keyPath: 'country_code' }, { name: 'season_id', keyPath: 'season_id' }] },
  { name: 'club_season_history', keyPath: 'id', indexes: [{ name: 'club_id', keyPath: 'club_id' }, { name: 'season_id', keyPath: 'season_id' }] },
  { name: 'club_memory', keyPath: 'id', indexes: [{ name: 'club_id', keyPath: 'club_id' }] },
  { name: 'club_relations', keyPath: 'id', indexes: [{ name: 'club_id', keyPath: 'club_id' }] },
  { name: 'dossier_memory', keyPath: 'id', indexes: [{ name: 'player_id', keyPath: 'player_id' }, { name: 'week', keyPath: 'week' }] },
  { name: 'decision_history', keyPath: 'id', indexes: [{ name: 'week', keyPath: 'week' }, { name: 'player_id', keyPath: 'player_id' }, { name: 'club_id', keyPath: 'club_id' }] },
  { name: 'contacts', keyPath: 'id', indexes: [{ name: 'type', keyPath: 'type' }, { name: 'club_id', keyPath: 'club_id' }] },
  { name: 'agency_goals', keyPath: 'id', indexes: [{ name: 'metric', keyPath: 'metric' }, { name: 'completed', keyPath: 'completed' }] },
  { name: 'world_states', keyPath: 'id', indexes: [{ name: 'season_id', keyPath: 'season_id' }] },
  { name: 'world_cups', keyPath: 'id', indexes: [{ name: 'season_id', keyPath: 'season_id' }, { name: 'phase', keyPath: 'phase' }] },
  { name: 'european_competitions', keyPath: 'id', indexes: [{ name: 'season_id', keyPath: 'season_id' }, { name: 'competition', keyPath: 'competition' }] },
  { name: 'narrative_arcs', keyPath: 'id', indexes: [{ name: 'player_id', keyPath: 'player_id' }, { name: 'type', keyPath: 'type' }] },
  { name: 'season_awards', keyPath: 'id', indexes: [{ name: 'season_id', keyPath: 'season_id' }] },
  { name: 'weekly_events', keyPath: 'id', indexes: [{ name: 'week', keyPath: 'week' }, { name: 'created_at', keyPath: 'created_at' }] },
  { name: 'save_slots', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }, { name: 'updated_at', keyPath: 'updated_at' }] },
];

const STORE_NAMES = STORE_DEFINITIONS.map((definition) => definition.name);

const normalizeSaveSlot = (slot = 1) => {
  const parsed = Number.parseInt(slot, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(SAVE_SLOT_MIN, Math.min(SAVE_SLOT_MAX, parsed));
};

const getSaveRecordId = (slot = 1) => `save_slot_${normalizeSaveSlot(slot)}`;

const getRecordSlot = (record = null) => {
  if (!record) return 1;
  if (Number.isFinite(record.slot)) return normalizeSaveSlot(record.slot);
  if (typeof record.id === 'string') {
    const match = record.id.match(/save_slot_(\d+)/);
    if (match) return normalizeSaveSlot(Number.parseInt(match[1], 10));
  }
  return normalizeSaveSlot(record.slot_save ?? 1);
};

const supportsIndexedDb = () => typeof indexedDB !== 'undefined';
const SQLITE_DB_NAME = 'agent_foot_mobile_db';
const SQLITE_TABLE = 'af_store';
const SQLITE_MIGRATION_KEY = 'sqlite_migrated_from_idb_v1';
const SQLITE_REL_PREFIX = 'af_rel_';
let sqliteReadyPromise = null;

const isNativeCapacitorRuntime = () => {
  if (typeof window === 'undefined') return false;
  const platform = window.Capacitor?.getPlatform?.();
  if (platform === 'ios' || platform === 'android') return true;
  return Boolean(window.Capacitor?.isNativePlatform?.());
};

const getSQLitePlugin = () => {
  if (!isNativeCapacitorRuntime()) return null;
  return window.Capacitor?.Plugins?.CapacitorSQLite ?? null;
};

const getIndexKeyPath = (storeName, indexName) => {
  const def = STORE_DEFINITIONS.find((entry) => entry.name === storeName);
  return def?.indexes?.find((index) => index.name === indexName)?.keyPath ?? null;
};

const extractByKeyPath = (row, keyPath) => {
  if (Array.isArray(keyPath)) return keyPath.map((key) => row?.[key]);
  return row?.[keyPath];
};

const isIndexMatch = (row, keyPath, value) => {
  const rowValue = extractByKeyPath(row, keyPath);
  if (Array.isArray(rowValue) && Array.isArray(value)) {
    if (rowValue.length !== value.length) return false;
    return rowValue.every((item, idx) => item === value[idx]);
  }
  return rowValue === value;
};

const runSql = async (connection, statement, values = []) => {
  if (typeof connection?.run === 'function') return connection.run(statement, values);
  return connection.execute(statement, values);
};

const querySql = async (connection, statement, values = []) => {
  if (typeof connection?.query === 'function') {
    const result = await connection.query(statement, values);
    return result?.values ?? [];
  }
  const result = await connection.execute(statement, values);
  return result?.values ?? [];
};

const initSQLite = async () => {
  const plugin = getSQLitePlugin();
  if (!plugin) return null;
  if (sqliteReadyPromise) return sqliteReadyPromise;
  sqliteReadyPromise = (async () => {
    try {
      await plugin.checkConnectionsConsistency?.();
      const hasConnection = await plugin.isConnection?.({ database: SQLITE_DB_NAME, readonly: false });
      if (!hasConnection?.result) {
        await plugin.createConnection?.({
          database: SQLITE_DB_NAME,
          version: 1,
          encrypted: false,
          mode: 'no-encryption',
          readonly: false,
        });
      }
      const connection = await plugin.retrieveConnection?.({ database: SQLITE_DB_NAME, readonly: false });
      await connection.open?.();
      await runSql(connection, 'PRAGMA foreign_keys = ON;');
      await runSql(
        connection,
        `CREATE TABLE IF NOT EXISTS ${SQLITE_TABLE} (
          store_name TEXT NOT NULL,
          row_id TEXT NOT NULL,
          row_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
          PRIMARY KEY (store_name, row_id)
        );`,
      );
      await runSql(
        connection,
        `CREATE TABLE IF NOT EXISTS ${SQLITE_REL_PREFIX}clubs (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT
        );`,
      );
      await runSql(
        connection,
        `CREATE TABLE IF NOT EXISTS ${SQLITE_REL_PREFIX}players (
          id TEXT PRIMARY KEY NOT NULL,
          club_id TEXT,
          FOREIGN KEY (club_id) REFERENCES ${SQLITE_REL_PREFIX}clubs(id) ON DELETE SET NULL
        );`,
      );
      await runSql(
        connection,
        `CREATE TABLE IF NOT EXISTS ${SQLITE_REL_PREFIX}offers (
          id TEXT PRIMARY KEY NOT NULL,
          player_id TEXT NOT NULL,
          club_id TEXT NOT NULL,
          FOREIGN KEY (player_id) REFERENCES ${SQLITE_REL_PREFIX}players(id) ON DELETE CASCADE,
          FOREIGN KEY (club_id) REFERENCES ${SQLITE_REL_PREFIX}clubs(id) ON DELETE CASCADE
        );`,
      );
      await runSql(
        connection,
        `CREATE TABLE IF NOT EXISTS ${SQLITE_REL_PREFIX}transfers (
          id TEXT PRIMARY KEY NOT NULL,
          player_id TEXT NOT NULL,
          from_club_id TEXT,
          to_club_id TEXT,
          FOREIGN KEY (player_id) REFERENCES ${SQLITE_REL_PREFIX}players(id) ON DELETE CASCADE,
          FOREIGN KEY (from_club_id) REFERENCES ${SQLITE_REL_PREFIX}clubs(id) ON DELETE SET NULL,
          FOREIGN KEY (to_club_id) REFERENCES ${SQLITE_REL_PREFIX}clubs(id) ON DELETE SET NULL
        );`,
      );
      await runSql(
        connection,
        `CREATE TABLE IF NOT EXISTS ${SQLITE_REL_PREFIX}contracts (
          id TEXT PRIMARY KEY NOT NULL,
          player_id TEXT NOT NULL,
          club_id TEXT,
          FOREIGN KEY (player_id) REFERENCES ${SQLITE_REL_PREFIX}players(id) ON DELETE CASCADE,
          FOREIGN KEY (club_id) REFERENCES ${SQLITE_REL_PREFIX}clubs(id) ON DELETE SET NULL
        );`,
      );
      await runSql(
        connection,
        `CREATE TABLE IF NOT EXISTS ${SQLITE_REL_PREFIX}fixtures (
          id TEXT PRIMARY KEY NOT NULL,
          home_club_id TEXT,
          away_club_id TEXT,
          FOREIGN KEY (home_club_id) REFERENCES ${SQLITE_REL_PREFIX}clubs(id) ON DELETE SET NULL,
          FOREIGN KEY (away_club_id) REFERENCES ${SQLITE_REL_PREFIX}clubs(id) ON DELETE SET NULL
        );`,
      );
      await runSql(
        connection,
        `CREATE TABLE IF NOT EXISTS ${SQLITE_REL_PREFIX}match_results (
          id TEXT PRIMARY KEY NOT NULL,
          player_id TEXT,
          fixture_id TEXT,
          club_id TEXT,
          opponent_id TEXT,
          FOREIGN KEY (player_id) REFERENCES ${SQLITE_REL_PREFIX}players(id) ON DELETE SET NULL,
          FOREIGN KEY (fixture_id) REFERENCES ${SQLITE_REL_PREFIX}fixtures(id) ON DELETE SET NULL,
          FOREIGN KEY (club_id) REFERENCES ${SQLITE_REL_PREFIX}clubs(id) ON DELETE SET NULL,
          FOREIGN KEY (opponent_id) REFERENCES ${SQLITE_REL_PREFIX}clubs(id) ON DELETE SET NULL
        );`,
      );
      return connection;
    } catch (error) {
      console.warn('[AgentFoot] SQLite unavailable, fallback to IndexedDB', error);
      sqliteReadyPromise = null;
      return null;
    }
  })();
  return sqliteReadyPromise;
};

const syncSqlRelationalMirror = async (state = {}) => {
  const sqlite = await initSQLite();
  if (!sqlite) return;
  const snapshot = createGameDatabaseSnapshot(state);
  const clubs = (snapshot.clubs ?? []).filter((row) => row?.id);
  const players = (snapshot.players ?? []).filter((row) => row?.id);
  const offers = (snapshot.club_offers ?? []).filter((row) => row?.id && row?.player_id && row?.club_id);
  const transfers = (snapshot.transfers ?? []).filter((row) => row?.id && row?.player_id);
  const contracts = (snapshot.contracts ?? []).filter((row) => row?.id && row?.player_id);
  const fixtures = (snapshot.fixtures ?? []).filter((row) => row?.id);
  const matchResults = (snapshot.match_results ?? []).filter((row) => row?.id);

  await runSql(sqlite, 'BEGIN IMMEDIATE TRANSACTION;');
  try {
    await runSql(sqlite, `DELETE FROM ${SQLITE_REL_PREFIX}match_results;`);
    await runSql(sqlite, `DELETE FROM ${SQLITE_REL_PREFIX}fixtures;`);
    await runSql(sqlite, `DELETE FROM ${SQLITE_REL_PREFIX}contracts;`);
    await runSql(sqlite, `DELETE FROM ${SQLITE_REL_PREFIX}transfers;`);
    await runSql(sqlite, `DELETE FROM ${SQLITE_REL_PREFIX}offers;`);
    await runSql(sqlite, `DELETE FROM ${SQLITE_REL_PREFIX}players;`);
    await runSql(sqlite, `DELETE FROM ${SQLITE_REL_PREFIX}clubs;`);

    for (const club of clubs) {
      await runSql(sqlite, `INSERT INTO ${SQLITE_REL_PREFIX}clubs (id, name) VALUES (?, ?)`, [club.id, club.name ?? null]);
    }
    for (const player of players) {
      await runSql(sqlite, `INSERT INTO ${SQLITE_REL_PREFIX}players (id, club_id) VALUES (?, ?)`, [player.id, player.club_current_id ?? null]);
    }
    for (const offer of offers) {
      await runSql(sqlite, `INSERT INTO ${SQLITE_REL_PREFIX}offers (id, player_id, club_id) VALUES (?, ?, ?)`, [offer.id, offer.player_id, offer.club_id]);
    }
    for (const transfer of transfers) {
      await runSql(sqlite, `INSERT INTO ${SQLITE_REL_PREFIX}transfers (id, player_id, from_club_id, to_club_id) VALUES (?, ?, ?, ?)`, [transfer.id, transfer.player_id, transfer.from_club_id ?? null, transfer.to_club_id ?? null]);
    }
    for (const contract of contracts) {
      await runSql(sqlite, `INSERT INTO ${SQLITE_REL_PREFIX}contracts (id, player_id, club_id) VALUES (?, ?, ?)`, [contract.id, contract.player_id, contract.club_id ?? null]);
    }
    for (const fixture of fixtures) {
      await runSql(sqlite, `INSERT INTO ${SQLITE_REL_PREFIX}fixtures (id, home_club_id, away_club_id) VALUES (?, ?, ?)`, [fixture.id, fixture.home_club_id ?? null, fixture.away_club_id ?? null]);
    }
    for (const result of matchResults) {
      await runSql(
        sqlite,
        `INSERT INTO ${SQLITE_REL_PREFIX}match_results (id, player_id, fixture_id, club_id, opponent_id) VALUES (?, ?, ?, ?, ?)`,
        [result.id, result.player_id ?? null, result.fixture_id ?? null, result.club_id ?? null, result.opponent_id ?? null],
      );
    }
    await runSql(sqlite, 'COMMIT;');
  } catch (error) {
    await runSql(sqlite, 'ROLLBACK;');
    throw error;
  }
};

const legacyPreviewFromState = (state) => ({
  agencyName: state?.agencyProfile?.name ?? 'Agent FC',
  ownerName: state?.agencyProfile?.ownerName ?? '',
  season: Math.floor(((state?.week ?? 1) - 1) / 38) + 1,
  seasonWeek: ((state?.week ?? 1) - 1) % 38 + 1,
  rosterCount: state?.roster?.length ?? 0,
  reputation: state?.reputation ?? 0,
  money: state?.money ?? 0,
  emblem: state?.agencyProfile?.emblem ?? null,
  emblemSrc: state?.agencyProfile?.emblemSrc ?? null,
  signatureColor: state?.agencyProfile?.color ?? null,
});

const ensureIndex = (store, index) => {
  if (!index?.name || store.indexNames.contains(index.name)) return;
  store.createIndex(index.name, index.keyPath, { unique: Boolean(index.unique) });
};

const ensureObjectStore = (db, transaction, definition) => {
  const store = db.objectStoreNames.contains(definition.name)
    ? transaction.objectStore(definition.name)
    : db.createObjectStore(definition.name, { keyPath: definition.keyPath ?? 'id' });
  (definition.indexes ?? []).forEach((index) => ensureIndex(store, index));
};

const openDb = () => {
  if (!supportsIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      STORE_DEFINITIONS.forEach((definition) => ensureObjectStore(db, tx, definition));
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getRawIdbStoreNames = (db) => Array.from(db.objectStoreNames ?? []);

const migrateIndexedDbToSQLiteIfNeeded = async (connection) => {
  if (!connection || !supportsIndexedDb()) return;
  const migratedRows = await querySql(
    connection,
    `SELECT row_json FROM ${SQLITE_TABLE} WHERE store_name = ? AND row_id = ? LIMIT 1`,
    ['meta', SQLITE_MIGRATION_KEY],
  );
  if (migratedRows.length) return;

  const db = await openDb();
  if (!db) return;
  const storeNames = getRawIdbStoreNames(db).filter((name) => STORE_NAMES.includes(name));
  for (const storeName of storeNames) {
    const rows = await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
    for (const row of rows) {
      if (!row?.id) continue;
      await runSql(
        connection,
        `INSERT OR REPLACE INTO ${SQLITE_TABLE} (store_name, row_id, row_json, updated_at) VALUES (?, ?, ?, ?)`,
        [storeName, String(row.id), JSON.stringify(row), Date.now()],
      );
    }
  }
  await runSql(
    connection,
    `INSERT OR REPLACE INTO ${SQLITE_TABLE} (store_name, row_id, row_json, updated_at) VALUES (?, ?, ?, ?)`,
    ['meta', SQLITE_MIGRATION_KEY, JSON.stringify({ id: SQLITE_MIGRATION_KEY, doneAt: Date.now() }), Date.now()],
  );
};

const idbRead = async (storeName, key) => {
  const sqlite = await initSQLite();
  if (sqlite) {
    await migrateIndexedDbToSQLiteIfNeeded(sqlite);
    const rows = await querySql(
      sqlite,
      `SELECT row_json FROM ${SQLITE_TABLE} WHERE store_name = ? AND row_id = ? LIMIT 1`,
      [storeName, String(key)],
    );
    if (!rows.length) return null;
    try {
      return JSON.parse(rows[0].row_json);
    } catch {
      return null;
    }
  }
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(storeName)) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
};

const stableRowId = (storeName, row) => {
  if (!row || typeof row !== 'object') return null;
  if (row.id != null) return String(row.id);
  switch (storeName) {
    case 'agency_upgrades':
      return row.agency_id ? `agency_upgrades_${row.agency_id}` : null;
    case 'staff':
      return row.agency_id && row.role ? `staff_${row.agency_id}_${row.role}` : null;
    case 'player_agent_relationships':
      return row.agency_id && row.player_id ? `rel_${row.agency_id}_${row.player_id}` : null;
    case 'careers':
      return row.player_id && row.season_id ? `career_${row.player_id}_${row.season_id}` : null;
    case 'contracts':
      return row.player_id && row.club_id ? `contract_${row.player_id}_${row.club_id}_${row.start_date ?? 'start'}` : null;
    case 'transfers':
      return row.player_id && row.season_id
        ? `transfer_${row.player_id}_${row.season_id}_${row.transfer_date ?? row.effective_week ?? 'date'}_${row.to_club_id ?? 'club'}`
        : null;
    case 'injuries':
      return row.player_id && row.started_week
        ? `injury_${row.player_id}_${row.started_week}_${row.status ?? 'active'}`
        : null;
    case 'negotiation_turns':
      return row.negotiation_id && row.round_number ? `turn_${row.negotiation_id}_${row.round_number}` : null;
    case 'objectives':
      return row.agency_id && row.season_id && row.type_objectif ? `objective_${row.agency_id}_${row.season_id}_${row.type_objectif}` : null;
    case 'event_instances':
      return row.agency_id && row.template_id && row.triggered_at_week ? `event_${row.agency_id}_${row.template_id}_${row.triggered_at_week}_${row.player_id ?? 'global'}` : null;
    case 'message_choices':
      return row.message_id && row.label ? `choice_${row.message_id}_${String(row.label).toLowerCase().replace(/\W+/g, '_')}` : null;
    case 'chosen_message_responses':
      return row.message_id && row.choice_id ? `chosen_${row.message_id}_${row.choice_id}` : null;
    case 'market_snapshots':
      return row.agency_id && row.week && row.market_type && row.player_id
        ? `market_${row.agency_id}_${row.week}_${row.market_type}_${row.player_id}`
        : null;
    case 'fixtures':
      return row.week && row.home_club_id && row.away_club_id
        ? `fixture_${row.season_id ?? 'season'}_${row.week}_${row.competition ?? 'league'}_${row.home_club_id}_${row.away_club_id}`
        : null;
    case 'match_results':
      return row.player_id && row.week
        ? `match_${row.player_id}_${row.week}_${row.competition ?? 'league'}_${row.fixture_id ?? row.opponent ?? 'opponent'}`
        : null;
    case 'competition_history':
      return row.season_id && row.week && row.competition && (row.club_id || row.home_club_id)
        ? `competition_${row.season_id}_${row.week}_${row.competition}_${row.club_id ?? row.home_club_id}_${row.opponent_id ?? row.away_club_id ?? 'opponent'}`
        : null;
    case 'league_table_rows':
      return row.club_id && row.season_id ? `table_${row.season_id}_${row.club_id}` : null;
    case 'league_seasons':
      return row.season_id && row.country_code ? `league_season_${row.season_id}_${row.country_code}` : null;
    case 'club_season_history':
      return row.club_id && row.season_id ? `club_history_${row.season_id}_${row.club_id}` : null;
    case 'club_memory':
      return row.club_id ? `club_memory_${row.club_id}` : null;
    case 'club_relations':
      return row.club_id ? `club_relations_${row.club_id}` : null;
    case 'dossier_memory':
      return row.player_id ? `dossier_${row.player_id}_${row.week ?? 'latest'}` : null;
    case 'decision_history':
      return row.week && (row.player_id || row.club_id || row.type)
        ? `decision_${row.week}_${row.type ?? 'note'}_${row.player_id ?? row.club_id ?? 'global'}`
        : null;
    case 'contacts':
      return row.type && (row.club_id || row.name) ? `contact_${row.type}_${row.club_id ?? String(row.name).toLowerCase().replace(/\W+/g, '_')}` : null;
    case 'agency_goals':
      return row.metric ? `goal_${row.metric}` : null;
    case 'world_states':
      return row.season_id ? `world_state_${row.season_id}` : null;
    case 'world_cups':
      return row.season_id && row.phase ? `world_cup_${row.season_id}_${row.phase}` : null;
    case 'european_competitions':
      return row.season_id && row.competition ? `europe_${row.season_id}_${row.competition}` : null;
    case 'narrative_arcs':
      return row.player_id && row.type ? `arc_${row.player_id}_${row.type}` : null;
    case 'season_awards':
      return row.season_id ? `awards_${row.season_id}` : null;
    case 'weekly_events':
      return row.week ? `weekly_events_${row.week}` : null;
    default:
      return null;
  }
};

const validateRow = (storeName, row) => {
  if (!row?.id) return false;
  if ((storeName === 'players' || storeName === 'catalog_players') && (!row.id || (!row.firstName && !row.first_name))) return false;
  return true;
};

const normalizeRow = (storeName, row) => {
  if (!row || typeof row !== 'object') return null;
  if (row.id != null && row.id !== '') return row;
  let id = stableRowId(storeName, row);
  // Fallback to UUID if stableRowId can't generate a deterministic ID
  if (!id) {
    id = `${storeName}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`;
  }
  const normalized = id ? { ...row, id } : null;
  return validateRow(storeName, normalized) ? normalized : null;
};

const idbWrite = async (storeName, value) => {
  const sqlite = await initSQLite();
  if (sqlite) {
    await migrateIndexedDbToSQLiteIfNeeded(sqlite);
    const row = normalizeRow(storeName, value, 0);
    if (!row) return null;
    await runSql(
      sqlite,
      `INSERT OR REPLACE INTO ${SQLITE_TABLE} (store_name, row_id, row_json, updated_at) VALUES (?, ?, ?, ?)`,
      [storeName, String(row.id), JSON.stringify(row), Date.now()],
    );
    return true;
  }
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(storeName)) return null;
  const row = normalizeRow(storeName, value, 0);
  if (!row) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(row);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const idbDelete = async (storeName, key) => {
  const sqlite = await initSQLite();
  if (sqlite) {
    await migrateIndexedDbToSQLiteIfNeeded(sqlite);
    await runSql(sqlite, `DELETE FROM ${SQLITE_TABLE} WHERE store_name = ? AND row_id = ?`, [storeName, String(key)]);
    return true;
  }
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(storeName)) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const idbGetAll = async (storeName) => {
  const sqlite = await initSQLite();
  if (sqlite) {
    await migrateIndexedDbToSQLiteIfNeeded(sqlite);
    const rows = await querySql(sqlite, `SELECT row_json FROM ${SQLITE_TABLE} WHERE store_name = ?`, [storeName]);
    return rows
      .map((row) => {
        try {
          return JSON.parse(row.row_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(storeName)) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
};

const sortRows = (rows = [], sortBy = null, direction = 'asc') => {
  if (!sortBy) return rows;
  const multiplier = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a?.[sortBy];
    const right = b?.[sortBy];
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * multiplier;
    return String(left).localeCompare(String(right)) * multiplier;
  });
};

const idbGetAllByIndex = async (storeName, indexName, value) => {
  const sqlite = await initSQLite();
  if (sqlite) {
    const rows = await idbGetAll(storeName);
    const keyPath = getIndexKeyPath(storeName, indexName);
    if (!keyPath) return [];
    return rows.filter((row) => isIndexMatch(row, keyPath, value));
  }
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(storeName)) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    if (!store.indexNames.contains(indexName)) {
      resolve([]);
      return;
    }
    const req = store.index(indexName).getAll(IDBKeyRange.only(value));
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
};

const idbWriteTables = async (tables = {}, { clear = true } = {}) => {
  const sqlite = await initSQLite();
  if (sqlite) {
    await migrateIndexedDbToSQLiteIfNeeded(sqlite);
    const entries = Object.entries(tables)
      .map(([name, rows]) => [SNAPSHOT_TABLE_MAP[name] ?? name, Array.isArray(rows) ? rows : []]);
    for (const [storeName, rows] of entries) {
      if (!STORE_NAMES.includes(storeName)) continue;
      if (clear) await runSql(sqlite, `DELETE FROM ${SQLITE_TABLE} WHERE store_name = ?`, [storeName]);
      for (const row of rows) {
        const normalized = normalizeRow(storeName, row);
        if (!normalized) continue;
        await runSql(
          sqlite,
          `INSERT OR REPLACE INTO ${SQLITE_TABLE} (store_name, row_id, row_json, updated_at) VALUES (?, ?, ?, ?)`,
          [storeName, String(normalized.id), JSON.stringify(normalized), Date.now()],
        );
      }
    }
    return true;
  }
  const db = await openDb();
  if (!db) return null;
  const entries = Object.entries(tables)
    .map(([name, rows]) => [SNAPSHOT_TABLE_MAP[name] ?? name, Array.isArray(rows) ? rows : []])
    .filter(([storeName, rows]) => db.objectStoreNames.contains(storeName) && rows.length >= 0);
  if (!entries.length) return true;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([...new Set(entries.map(([storeName]) => storeName))], 'readwrite');
    entries.forEach(([storeName, rows]) => {
      const store = tx.objectStore(storeName);
      if (clear) store.clear();
      rows.forEach((row, index) => {
        const normalized = normalizeRow(storeName, row);
        if (normalized) store.put(normalized);
      });
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const idbClearStores = async (storeNames = []) => {
  const sqlite = await initSQLite();
  if (sqlite) {
    await migrateIndexedDbToSQLiteIfNeeded(sqlite);
    for (const storeName of storeNames) {
      if (!STORE_NAMES.includes(storeName)) continue;
      await runSql(sqlite, `DELETE FROM ${SQLITE_TABLE} WHERE store_name = ?`, [storeName]);
    }
    return true;
  }
  const db = await openDb();
  if (!db) return null;
  const names = storeNames.filter((storeName) => db.objectStoreNames.contains(storeName));
  if (!names.length) return true;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    names.forEach((storeName) => tx.objectStore(storeName).clear());
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const readLegacySave = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeLegacySave = (record) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record.state));
    localStorage.setItem(`${STORAGE_KEY}_bak_0`, JSON.stringify(record.state));
  } catch {
    // Local storage is only a compatibility fallback.
  }
};

const removeLegacySave = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_bak_0`);
    localStorage.removeItem(`${STORAGE_KEY}_bak_1`);
    localStorage.removeItem(`${STORAGE_KEY}_bak_2`);
  } catch {
    // ignored on purpose
  }
};

const buildSaveRecord = (state, slot = 1) => {
  const normalizedSlot = normalizeSaveSlot(slot);
  const serializableState = stripRuntimeEntityDb(applyRuntimeIntegrity(state));
  const preview = legacyPreviewFromState(serializableState);
  const season = preview.season;
  const week = serializableState?.week ?? 1;
  const snapshot = createGameDatabaseSnapshot(serializableState ?? {});
  return {
    id: getSaveRecordId(normalizedSlot),
    slot: normalizedSlot,
    updatedAt: Date.now(),
    state: serializableState,
    snapshot,
    entityDatabase: snapshot,
    entityDatabaseSchemaVersion: DB_VERSION,
    catalogId: CATALOG_ID,
    catalogVersion: DB_VERSION,
    preview,
    season,
    week,
  };
};

const buildCatalogTables = (catalog = createGameCatalog()) =>
  STATIC_TABLES.reduce((tables, storeName) => {
    tables[storeName] = storeName === 'catalog_players'
      ? catalog.catalog_players ?? catalog.players ?? []
      : catalog[storeName] ?? [];
    return tables;
  }, {});

const buildSnapshotTables = (snapshot = {}) =>
  GAME_TABLES.reduce((tables, storeName) => {
    const snapshotName = Object.entries(SNAPSHOT_TABLE_MAP).find(([, mapped]) => mapped === storeName)?.[0] ?? storeName;
    tables[snapshotName] = Array.isArray(snapshot[snapshotName]) ? snapshot[snapshotName] : [];
    return tables;
  }, {});

/**
 * Realistic club role assignment based on peer comparison within club
 * Compares player rating to club average and tier expectations
 */
export const assignIntelligentClubRole = (player, clubPlayers = null) => {
  const rating = player.note_current ?? player.rating ?? 130;
  const potential = player.potential ?? rating;
  const clubTier = player.club_tier ?? player.clubTier ?? 4;
  const position = player.main_position ?? 'MIL';
  const age = player.age ?? 25;
  const clubName = player.club_name ?? player.club;

  // Calculate adjusted rating with bonuses
  let adjustedRating = rating;

  // Young prospects (age < 24) with high potential get development boost
  if (age < 24 && potential > rating + 10) {
    const promiseBoost = Math.min(10, (potential - rating) / 2.5);
    adjustedRating += promiseBoost;
  }

  // Defenders and goalkeepers: slightly different standards
  if (position === 'GK' || position === 'DEF') {
    adjustedRating += 2;
  }

  // If we have club players data, use peer comparison
  if (clubPlayers && Array.isArray(clubPlayers) && clubPlayers.length > 0) {
    const clubPlayerRatings = clubPlayers
      .filter(p => (p.club_name ?? p.club) === clubName)
      .map(p => {
        let r = p.note_current ?? p.rating ?? 130;
        if ((p.age ?? 25) < 24 && (p.potential ?? r) > r + 10) {
          r += Math.min(10, ((p.potential ?? r) - r) / 2.5);
        }
        if ((p.main_position ?? 'MIL') === 'GK' || (p.main_position ?? 'MIL') === 'DEF') {
          r += 2;
        }
        return r;
      });

    if (clubPlayerRatings.length > 0) {
      clubPlayerRatings.sort((a, b) => b - a);
      const percentile = clubPlayerRatings.length > 1
        ? clubPlayerRatings.indexOf(adjustedRating) / (clubPlayerRatings.length - 1)
        : 0;

      // Realistic distribution within club
      if (percentile < 0.15) return 'Star';
      if (percentile < 0.35) return 'Titulaire';
      if (percentile < 0.85) return 'Rotation';
      return 'Indésirable';
    }
  }

  // Fallback to tier-based thresholds if no club data
  const TIER_THRESHOLDS = {
    1: { star: 168, titulaire: 158, rotation: 142 },
    2: { star: 154, titulaire: 144, rotation: 130 },
    3: { star: 138, titulaire: 128, rotation: 116 },
    4: { star: 120, titulaire: 110, rotation: 100 },
  };

  const tier = clubTier ?? 1;
  const thresholds = TIER_THRESHOLDS[tier] ?? TIER_THRESHOLDS[4];

  if (adjustedRating >= thresholds.star) return 'Star';
  if (adjustedRating >= thresholds.titulaire) return 'Titulaire';
  if (adjustedRating >= thresholds.rotation) return 'Rotation';
  return 'Indésirable';
};

const migratePlayersWithClubRole = async () => {
  try {
    const players = await idbGetAll('players');
    const needsMigration = players.some(p => !p.club_role);

    if (!needsMigration || !players.length) return { migrated: 0, total: players.length };

    const migratedPlayers = players.map(player => {
      if (player.club_role) return player;

      const clubRole = assignIntelligentClubRole(player);
      return { ...player, club_role: clubRole };
    });

    // Write updated players back to database
    const db = await openDb();
    if (!db) return { migrated: 0, total: players.length };

    return new Promise((resolve) => {
      const tx = db.transaction('players', 'readwrite');
      const store = tx.objectStore('players');

      let count = 0;
      migratedPlayers.forEach(player => {
        const original = players.find(p => p.id === player.id);
        if (original && !original.club_role) {
          store.put(player);
          count++;
        }
      });

      tx.oncomplete = () => {
        resolve({ migrated: count, total: players.length });
      };
      tx.onerror = () => resolve({ migrated: 0, total: players.length, error: tx.error });
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return { migrated: 0, error: String(error) };
  }
};

const hydrateRuntimeCatalogFromDb = async () => {
  const players = await idbGetAll('catalog_players');
  if (players.length) setDatabasePlayerCatalog(players);
  return players.length;
};

const readRuntimeTables = async () => {
  const tableNames = [...new Set([...GAME_TABLES, ...STATIC_TABLES])];
  const entries = await Promise.all(tableNames.map(async (storeName) => [storeName, await idbGetAll(storeName)]));
  return Object.fromEntries(entries);
};

const rowsToRawList = (rows = [], rawKey) =>
  rows
    .map((row) => row?.[rawKey] ?? null)
    .filter((item) => item && typeof item === 'object');

const rebuildLeagueTables = (rows = [], fallback = {}) => {
  if (!rows.length) return fallback;
  return rows.reduce((tables, row) => {
    const countryCode = row.country_code;
    const clubName = row.club_name;
    if (!countryCode || !clubName) return tables;
    return {
      ...tables,
      [countryCode]: {
        ...(tables[countryCode] ?? {}),
        [clubName]: row.raw_row ?? {
          club: clubName,
          played: row.played ?? 0,
          win: row.wins ?? 0,
          draw: row.draws ?? 0,
          loss: row.losses ?? 0,
          goalsFor: row.goals_for ?? 0,
          goalsAgainst: row.goals_against ?? 0,
          points: row.points ?? 0,
          form: row.form ?? [],
        },
      },
    };
  }, fallback);
};

const rebuildClubMap = (rows = [], rawKey, fallback = {}) => {
  if (!rows.length) return fallback;
  return rows.reduce((map, row) => {
    const key = row.club_id ?? row.club_name;
    if (!key) return map;
    return { ...map, [key]: row[rawKey] ?? row.raw ?? row.relation_score ?? row };
  }, fallback);
};

const rebuildDossierMemory = (rows = [], fallback = {}) => {
  if (!rows.length) return fallback;
  const next = {
    players: { ...(fallback.players ?? {}) },
    clubs: { ...(fallback.clubs ?? {}) },
    media: { ...(fallback.media ?? {}) },
  };
  rows.forEach((row) => {
    if (row.scope === 'player' && row.player_id && row.raw_entry) next.players[row.player_id] = row.raw_entry;
    if (row.scope === 'club' && row.raw_entry) {
      const key = row.club_id ?? row.club_name;
      if (key) next.clubs[key] = row.raw_entry;
    }
    if (row.scope === 'media' && row.media_id && row.raw_entry) next.media[row.media_id] = row.raw_entry;
  });
  return next;
};

const rebuildNarrativeTemplates = (rows = [], fallback = {}) => {
  if (!rows.length) return fallback;
  return rows.reduce((index, row) => {
    const domain = row.domain;
    const periodKey = row.period_key ?? 'global';
    if (!domain) return index;
    const key = `${domain}:${periodKey}`;
    const template = row.payload ?? {
      category: row.category ?? null,
      subject: row.subject ?? null,
      body: row.body ?? null,
      text: row.text ?? null,
    };
    return {
      ...index,
      [key]: [...(index[key] ?? []), template],
    };
  }, fallback);
};

const hydrateStateFromTables = (fallbackState = {}, tables = {}) => {
  const players = tables.players ?? [];
  const rawPlayers = players.filter((row) => row?.raw_player);
  const roster = rawPlayers.filter((row) => row.market_status === 'roster' || row.source === 'roster').map((row) => ensureGabrielFixioPower(row.raw_player));
  const market = rawPlayers.filter((row) => row.market_status === 'market' || row.source === 'market').map((row) => ensureGabrielFixioPower(row.raw_player));
  const freeAgents = rawPlayers.filter((row) => row.market_status === 'free_agent' || row.source === 'freeAgent').map((row) => ensureGabrielFixioPower({ ...row.raw_player, freeAgent: true }));
  const rawMessages = (tables.messages ?? []).filter((row) => row?.raw_message);
  const inboxMessages = rawMessages.filter((row) => row.source !== 'queue').map((row) => row.raw_message);
  const queuedMessages = rawMessages.filter((row) => row.source === 'queue').map((row) => row.raw_message);
  const agency = (tables.agency ?? [])[0] ?? null;
  const agencyUpgrades = (tables.agency_upgrades ?? [])[0] ?? null;
  const worldState = (tables.world_states ?? []).sort((a, b) => (b.week ?? 0) - (a.week ?? 0))[0]?.raw;
  const worldCupState = (tables.world_cups ?? []).sort((a, b) => (b.week ?? 0) - (a.week ?? 0))[0]?.raw;
  const europeanCupData = (tables.european_competitions ?? []).reduce((data, row) => {
    if (!row.competition_key) return data;
    return { ...data, [row.competition_key]: row.raw ?? {} };
  }, fallbackState.europeanCupData ?? {});

  return {
    ...fallbackState,
    agencyProfile: agency ? {
      ...(fallbackState.agencyProfile ?? {}),
      id: agency.id,
      name: normalizeAgencyName(agency.name, fallbackState.agencyProfile?.name ?? 'Agent FC'),
      country: agency.country,
      countryCode: agency.country_code ?? agency.countryCode,
      city: agency.city,
      ownerName: agency.director_name ?? agency.ownerName,
      emblem: agency.emblem,
      color: agency.color,
      style: agency.positioning ?? agency.style,
      difficulty: agency.difficulty,
      startProfile: agency.start_profile ?? agency.startProfile,
      onboarded: fallbackState.agencyProfile?.onboarded ?? true,
    } : fallbackState.agencyProfile,
    money: agency?.money ?? fallbackState.money,
    reputation: agency?.reputation ?? fallbackState.reputation,
    credibility: agency?.credibility ?? fallbackState.credibility,
    agencyLevel: agency?.agency_level ?? fallbackState.agencyLevel,
    week: agency?.current_week ?? fallbackState.week,
    difficulty: agency?.difficulty ?? fallbackState.difficulty,
    startProfile: agency?.start_profile ?? fallbackState.startProfile,
    office: agencyUpgrades ? {
      ...(fallbackState.office ?? {}),
      scoutLevel: agencyUpgrades.scouting_level ?? fallbackState.office?.scoutLevel ?? 0,
      lawyerLevel: agencyUpgrades.lawyer_level ?? fallbackState.office?.lawyerLevel ?? 0,
      mediaLevel: agencyUpgrades.communication_level ?? fallbackState.office?.mediaLevel ?? 0,
    } : fallbackState.office,
    roster: roster.length ? roster : fallbackState.roster ?? [],
    market: market.length ? market : fallbackState.market ?? [],
    freeAgents: freeAgents.length ? freeAgents : fallbackState.freeAgents ?? [],
    messages: rawMessages.length ? inboxMessages : fallbackState.messages ?? [],
    messageQueue: rawMessages.length ? queuedMessages : fallbackState.messageQueue ?? [],
    clubOffers: rowsToRawList(tables.club_offers, 'raw').length ? rowsToRawList(tables.club_offers, 'raw') : fallbackState.clubOffers ?? [],
    promises: rowsToRawList(tables.promises, 'raw_promise').length ? rowsToRawList(tables.promises, 'raw_promise') : fallbackState.promises ?? [],
    contacts: rowsToRawList(tables.contacts, 'raw').length ? rowsToRawList(tables.contacts, 'raw') : fallbackState.contacts ?? [],
    decisionHistory: rowsToRawList(tables.decision_history, 'raw').length ? rowsToRawList(tables.decision_history, 'raw') : fallbackState.decisionHistory ?? [],
    news: rowsToRawList(tables.news_posts, 'raw_news').length ? rowsToRawList(tables.news_posts, 'raw_news') : fallbackState.news ?? [],
    nextFixtures: rowsToRawList((tables.fixtures ?? []).filter((row) => ['nextFixtures', 'scheduled'].includes(row.source)), 'raw').length
      ? rowsToRawList((tables.fixtures ?? []).filter((row) => ['nextFixtures', 'scheduled'].includes(row.source)), 'raw')
      : fallbackState.nextFixtures ?? [],
    lastFixtures: rowsToRawList((tables.fixtures ?? []).filter((row) => ['lastFixtures', 'played'].includes(row.source)), 'raw').length
      ? rowsToRawList((tables.fixtures ?? []).filter((row) => ['lastFixtures', 'played'].includes(row.source)), 'raw')
      : fallbackState.lastFixtures ?? [],
    leagueTables: rebuildLeagueTables(tables.league_table_rows ?? [], fallbackState.leagueTables ?? {}),
    leagueSeasonData: (tables.league_seasons ?? []).reduce((data, row) => ({
      ...data,
      [row.country_code]: row.raw_league ?? row,
    }), fallbackState.leagueSeasonData ?? {}),
    clubSeasonHistory: rebuildClubMap(tables.club_season_history ?? [], 'raw_history', fallbackState.clubSeasonHistory ?? {}),
    clubMemory: rebuildClubMap(tables.club_memory ?? [], 'raw', fallbackState.clubMemory ?? {}),
    clubRelations: rebuildClubMap(tables.club_relations ?? [], 'raw_score', fallbackState.clubRelations ?? {}),
    dossierMemory: rebuildDossierMemory(tables.dossier_memory ?? [], fallbackState.dossierMemory ?? {}),
    agencyGoals: [],
    worldState: worldState ?? fallbackState.worldState,
    worldCupState: worldCupState ?? fallbackState.worldCupState,
    europeanCupData,
    activeNarratives: rowsToRawList(tables.narrative_arcs, 'raw_arc').length ? rowsToRawList(tables.narrative_arcs, 'raw_arc') : fallbackState.activeNarratives ?? [],
    seasonAwards: (tables.season_awards ?? []).reduce((awards, row) => {
      const seasonKey = String(row.season_id ?? '').replace('season_', '');
      return seasonKey ? { ...awards, [seasonKey]: row.raw_awards ?? row.awards ?? {} } : awards;
    }, fallbackState.seasonAwards ?? {}),
    narrativeTemplates: rebuildNarrativeTemplates(tables.narrative_templates ?? [], fallbackState.narrativeTemplates ?? {}),
    databaseHydrated: true,
  };
};

const hydrateSavedRecordFromDatabase = async (record) => {
  if (!record?.state) return record;
  const tables = await readRuntimeTables();
  const hasGameRows = (tables.players ?? []).length || (tables.agency ?? []).length;
  if (!hasGameRows) return record;
  return {
    ...record,
    state: hydrateStateFromTables(record.state, tables),
    entityDatabase: record.entityDatabase ?? record.snapshot ?? null,
    databaseTables: tables,
  };
};

const restoreSnapshotForRecord = async (record) => {
  if (!record?.snapshot) return;
  await idbWriteTables(buildSnapshotTables(record.snapshot), { clear: true });
};

const persistActiveSaveMeta = async (record) => {
  if (!record) return;
  await idbWrite('meta', {
    id: ACTIVE_SAVE_META_KEY,
    saveId: record.id,
    slot: getRecordSlot(record),
    updatedAt: record.updatedAt ?? Date.now(),
    season: record.season,
    week: record.week,
  });
};

const getSavedSlotRecords = async () => {
  const saves = await idbGetAll('saves');
  return saves
    .filter((save) => save?.state)
    .map((save) => ({
      ...save,
      slot: getRecordSlot(save),
    }))
    .sort((a, b) => a.slot - b.slot || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
};

const seedCatalogIfNeeded = async () => {
  const existingCatalog = await idbRead('catalog', CATALOG_ID);
  const existingPlayers = await idbGetAll('catalog_players');
  // Catalogue valide uniquement si la version des données correspond
  const catalogIsUpToDate = existingCatalog
    && existingPlayers.length
    && existingCatalog.dataVersion === CATALOG_DATA_VERSION;

  if (catalogIsUpToDate) {
    await hydrateRuntimeCatalogFromDb();
    const upgradedCatalog = {
      ...existingCatalog,
      schemaVersion: DB_VERSION,
      updatedAt: Date.now(),
      tableCounts: {
        ...(existingCatalog.tableCounts ?? {}),
        players: existingPlayers.length,
      },
    };
    await idbWrite('catalog', upgradedCatalog);
    await idbWrite('meta', {
      id: 'schema',
      dbName: DB_NAME,
      version: DB_VERSION,
      stores: STORE_NAMES,
      updatedAt: Date.now(),
    });
    return upgradedCatalog;
  }

  // Catalogue absent ou version obsolète → re-seed depuis le code
  const catalog = createGameCatalog();
  await idbWriteTables(buildCatalogTables(catalog), { clear: true });
  const record = {
    id: CATALOG_ID,
    schemaVersion: DB_VERSION,
    dataVersion: CATALOG_DATA_VERSION,
    createdAt: existingCatalog?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    tableCounts: {
      countries: catalog.countries.length,
      clubs: catalog.clubs.length,
      players: (catalog.catalog_players ?? catalog.players ?? []).length,
      event_templates: catalog.event_templates.length,
    },
    data: catalog,
  };
  await idbWrite('catalog', record);
  await idbWrite('meta', {
    id: 'schema',
    dbName: DB_NAME,
    version: DB_VERSION,
    stores: STORE_NAMES,
    updatedAt: Date.now(),
  });
  await hydrateRuntimeCatalogFromDb();
  return record;
};

export const ensureLocalGameDatabase = async () => {
  const db = await openDb();
  if (!db) return null;
  await seedCatalogIfNeeded();
  return true;
};

export const loadLocalGameProgress = async (slot = null) => {
  await ensureLocalGameDatabase();

  if (slot != null) {
    const normalizedSlot = normalizeSaveSlot(slot);
    const saved = await idbRead('saves', getSaveRecordId(normalizedSlot));
    if (!saved?.state) return null;
    const record = { ...saved, slot: normalizedSlot };
    await restoreSnapshotForRecord(record);
    await persistActiveSaveMeta(record);
    if (normalizedSlot === 1) writeLegacySave(record);
    return hydrateSavedRecordFromDatabase(record);
  }

  const activeMeta = await idbRead('meta', ACTIVE_SAVE_META_KEY);
  if (activeMeta?.slot) {
    const activeRecord = await idbRead('saves', getSaveRecordId(activeMeta.slot));
    if (activeRecord?.state) {
      const record = { ...activeRecord, slot: getRecordSlot(activeRecord) };
      await restoreSnapshotForRecord(record);
      await persistActiveSaveMeta(record);
      if (record.slot === 1) writeLegacySave(record);
      return hydrateSavedRecordFromDatabase(record);
    }
  }

  const legacyIdRecord = await idbRead('saves', SAVE_ID);
  if (legacyIdRecord?.state) {
    const migrated = { ...legacyIdRecord, id: getSaveRecordId(1), slot: 1, updatedAt: Date.now() };
    await idbWrite('saves', migrated);
    await idbDelete('saves', SAVE_ID);
    await restoreSnapshotForRecord(migrated);
    await persistActiveSaveMeta(migrated);
    writeLegacySave(migrated);
    return hydrateSavedRecordFromDatabase(migrated);
  }

  const slotRecords = await getSavedSlotRecords();
  const latest = [...slotRecords].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
  if (latest?.state) {
    await restoreSnapshotForRecord(latest);
    await persistActiveSaveMeta(latest);
    if (latest.slot === 1) writeLegacySave(latest);
    return hydrateSavedRecordFromDatabase(latest);
  }

  const legacy = readLegacySave();
  if (!legacy) return null;
  const record = buildSaveRecord(legacy, 1);
  await idbWrite('saves', record);
  await idbWriteTables(buildSnapshotTables(record.snapshot), { clear: true });
  await persistActiveSaveMeta(record);
  return hydrateSavedRecordFromDatabase(record);
};

export const saveLocalGameProgress = async (state, slot = 1) => {
  const queuedSave = async () => {
    await ensureLocalGameDatabase();
    const normalizedSlot = normalizeSaveSlot(slot);
    const record = buildSaveRecord(state, normalizedSlot);
    await syncSqlRelationalMirror(record.state);
    await idbWrite('saves', record);
    await idbWriteTables(buildSnapshotTables(record.snapshot), { clear: true });
    await persistActiveSaveMeta(record);
    if (normalizedSlot === 1) writeLegacySave(record);
    return record;
  };

  const next = saveProgressQueue.then(queuedSave, queuedSave);
  saveProgressQueue = next.catch(() => null);
  return next;
};

export const clearLocalGameProgress = async () => {
  await ensureLocalGameDatabase();
  await idbDelete('saves', SAVE_ID);
  for (let slot = SAVE_SLOT_MIN; slot <= SAVE_SLOT_MAX; slot += 1) {
    await idbDelete('saves', getSaveRecordId(slot));
  }
  await idbDelete('meta', ACTIVE_SAVE_META_KEY);
  await idbClearStores(GAME_TABLES);
  removeLegacySave();
};

export const clearLocalGameSlot = async (slot = 1, { clearRuntime = false } = {}) => {
  await ensureLocalGameDatabase();
  const normalizedSlot = normalizeSaveSlot(slot);
  await idbDelete('saves', getSaveRecordId(normalizedSlot));
  const activeMeta = await idbRead('meta', ACTIVE_SAVE_META_KEY);
  if (activeMeta?.slot === normalizedSlot) {
    await idbDelete('meta', ACTIVE_SAVE_META_KEY);
    if (clearRuntime) await idbClearStores(GAME_TABLES);
  }
  if (normalizedSlot === 1) removeLegacySave();
};

export const getLocalSaveSlots = async () => {
  await ensureLocalGameDatabase();
  const records = await getSavedSlotRecords();
  const bySlot = new Map(records.map((record) => [record.slot, record]));
  const activeMeta = await idbRead('meta', ACTIVE_SAVE_META_KEY);

  return Array.from({ length: SAVE_SLOT_MAX }, (_, idx) => {
    const slot = idx + 1;
    const record = bySlot.get(slot);
    const preview = record?.preview ?? (record?.state ? legacyPreviewFromState(record.state) : null);
    return {
      slot,
      hasSave: Boolean(record?.state),
      isActive: activeMeta?.slot === slot,
      updatedAt: record?.updatedAt ?? null,
      preview: preview ?? null,
    };
  });
};

export const exportLocalGameSlot = async (slot = 1) => {
  await ensureLocalGameDatabase();
  const normalizedSlot = normalizeSaveSlot(slot);
  const record = await idbRead('saves', getSaveRecordId(normalizedSlot));
  if (!record?.state) return null;
  return {
    format: 'agent-foot-save',
    version: 1,
    exportedAt: Date.now(),
    slot: normalizedSlot,
    record: {
      ...record,
      id: getSaveRecordId(normalizedSlot),
      slot: normalizedSlot,
    },
  };
};

export const importLocalGameSlot = async (slot = 1, payload = null, { activate = true } = {}) => {
  await ensureLocalGameDatabase();
  const normalizedSlot = normalizeSaveSlot(slot);
  const importedRecord = payload?.record ?? payload;
  if (!importedRecord?.state) throw new Error('Sauvegarde invalide');
  const record = {
    ...importedRecord,
    id: getSaveRecordId(normalizedSlot),
    slot: normalizedSlot,
    updatedAt: Date.now(),
    preview: importedRecord.preview ?? legacyPreviewFromState(importedRecord.state),
    snapshot: importedRecord.snapshot ?? createGameDatabaseSnapshot(importedRecord.state),
  };
  await syncSqlRelationalMirror(record.state);
  await idbWrite('saves', record);
  if (activate) {
    await restoreSnapshotForRecord(record);
    await persistActiveSaveMeta(record);
  }
  if (normalizedSlot === 1) writeLegacySave(record);
  return record;
};

export const getLocalTableRows = async (storeName, options = {}) => {
  await ensureLocalGameDatabase();
  if (!STORE_NAMES.includes(storeName)) return [];
  const rows = await idbGetAll(storeName);
  const sorted = sortRows(rows, options.sortBy, options.direction);
  return Number.isFinite(options.limit) ? sorted.slice(0, options.limit) : sorted;
};

export const getLocalRowsByIndex = async (storeName, indexName, value, options = {}) => {
  await ensureLocalGameDatabase();
  if (!STORE_NAMES.includes(storeName)) return [];
  const rows = await idbGetAllByIndex(storeName, indexName, value);
  const sorted = sortRows(rows, options.sortBy, options.direction);
  return Number.isFinite(options.limit) ? sorted.slice(0, options.limit) : sorted;
};

export const getLocalGameDatabaseView = async () => {
  await ensureLocalGameDatabase();
  const tables = await readRuntimeTables();
  return {
    loadedAt: Date.now(),
    tables,
    agency: tables.agency ?? [],
    agencyUpgrades: tables.agency_upgrades ?? [],
    staff: tables.staff ?? [],
    players: tables.players ?? [],
    catalogPlayers: tables.catalog_players ?? [],
    clubs: tables.clubs ?? [],
    countries: tables.countries ?? [],
    leagues: tables.leagues ?? [],
    playerAgentRelationships: tables.player_agent_relationships ?? [],
    careers: tables.careers ?? [],
    contracts: tables.contracts ?? [],
    transfers: tables.transfers ?? [],
    injuries: tables.injuries ?? [],
    loans: tables.loans ?? [],
    negotiations: tables.negotiations ?? [],
    negotiationTurns: tables.negotiation_turns ?? [],
    seasons: tables.seasons ?? [],
    objectives: [],
    eventInstances: tables.event_instances ?? [],
    fixtures: tables.fixtures ?? [],
    matchResults: tables.match_results ?? [],
    competitionHistory: tables.competition_history ?? [],
    leagueSeasons: tables.league_seasons ?? [],
    leagueTableRows: tables.league_table_rows ?? [],
    clubSeasonHistory: tables.club_season_history ?? [],
    europeanCompetitions: tables.european_competitions ?? [],
    worldCups: tables.world_cups ?? [],
    worldStates: tables.world_states ?? [],
    clubOffers: tables.club_offers ?? [],
    marketSnapshots: tables.market_snapshots ?? [],
    messages: tables.messages ?? [],
    messageChoices: tables.message_choices ?? [],
    chosenMessageResponses: tables.chosen_message_responses ?? [],
    newsPosts: tables.news_posts ?? [],
    sponsors: tables.sponsors ?? [],
    rivalAgents: tables.rival_agents ?? [],
    rivalAgentRelations: tables.rival_agent_relations ?? [],
    scoutingReports: tables.scouting_reports ?? [],
    promises: tables.promises ?? [],
    clubMemory: tables.club_memory ?? [],
    clubRelations: tables.club_relations ?? [],
    dossierMemory: tables.dossier_memory ?? [],
    decisionHistory: tables.decision_history ?? [],
    contacts: tables.contacts ?? [],
    agencyGoals: [],
    narrativeArcs: tables.narrative_arcs ?? [],
    seasonAwards: tables.season_awards ?? [],
    saveSlots: tables.save_slots ?? [],
  };
};

export const hasLocalGameProgress = async () => {
  const saved = await loadLocalGameProgress();
  return Boolean(saved?.state);
};

export const getLocalDatabaseStats = async () => {
  await ensureLocalGameDatabase();
  const counts = {};
  for (const storeName of STORE_NAMES) {
    counts[storeName] = (await idbGetAll(storeName)).length;
  }
  return {
    name: DB_NAME,
    version: DB_VERSION,
    stores: STORE_NAMES,
    counts,
  };
};

export const ensurePlayersHaveClubRole = migratePlayersWithClubRole;
