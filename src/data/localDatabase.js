import { createGameCatalog, createGameDatabaseSnapshot } from './gameDatabase';
import { setDatabasePlayerCatalog } from './squadDatabase';
import { STORAGE_KEY } from '../game/gameLogic';

const DB_NAME = 'agent_foot_local_db';
const DB_VERSION = 4;
const SAVE_ID = 'active_save';
const CATALOG_ID = 'catalog_v2';
// Bumper cette valeur à chaque modification de la base de données de joueurs
// pour forcer un re-seed automatique sans perdre la sauvegarde en cours.
const CATALOG_DATA_VERSION = '2026-04-20-v6';

const STATIC_TABLES = [
  'countries',
  'cities',
  'leagues',
  'clubs',
  'personalities',
  'event_templates',
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
  'save_slots',
];

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
  { name: 'fixtures', keyPath: 'id', indexes: [{ name: 'week', keyPath: 'week' }, { name: 'club_id', keyPath: 'club_id' }, { name: 'status', keyPath: 'status' }] },
  { name: 'match_results', keyPath: 'id', indexes: [{ name: 'player_id', keyPath: 'player_id' }, { name: 'week', keyPath: 'week' }, { name: 'competition', keyPath: 'competition' }] },
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
  { name: 'save_slots', keyPath: 'id', indexes: [{ name: 'agency_id', keyPath: 'agency_id' }, { name: 'updated_at', keyPath: 'updated_at' }] },
];

const STORE_NAMES = STORE_DEFINITIONS.map((definition) => definition.name);

const supportsIndexedDb = () => typeof indexedDB !== 'undefined';

const legacyPreviewFromState = (state) => ({
  agencyName: state?.agencyProfile?.name ?? 'Agent FC',
  ownerName: state?.agencyProfile?.ownerName ?? '',
  season: Math.floor(((state?.week ?? 1) - 1) / 38) + 1,
  seasonWeek: ((state?.week ?? 1) - 1) % 38 + 1,
  rosterCount: state?.roster?.length ?? 0,
  reputation: state?.reputation ?? 0,
  money: state?.money ?? 0,
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

const idbRead = async (storeName, key) => {
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
    case 'league_table_rows':
      return row.club_id && row.season_id ? `table_${row.season_id}_${row.club_id}` : null;
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
  const id = stableRowId(storeName, row);
  const normalized = id ? { ...row, id } : null;
  return validateRow(storeName, normalized) ? normalized : null;
};

const idbWrite = async (storeName, value) => {
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
  const preview = legacyPreviewFromState(state);
  const season = preview.season;
  const week = state?.week ?? 1;
  const snapshot = createGameDatabaseSnapshot(state ?? {});
  return {
    id: SAVE_ID,
    slot,
    updatedAt: Date.now(),
    state,
    snapshot,
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

const hydrateRuntimeCatalogFromDb = async () => {
  const players = await idbGetAll('catalog_players');
  if (players.length) setDatabasePlayerCatalog(players);
  return players.length;
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

export const loadLocalGameProgress = async () => {
  await ensureLocalGameDatabase();
  const saved = await idbRead('saves', SAVE_ID);
  if (saved?.state) return saved;
  const saves = await idbGetAll('saves');
  const latest = saves
    .filter((save) => save?.state)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
  if (latest?.state) return latest;

  const legacy = readLegacySave();
  if (!legacy) return null;
  const record = buildSaveRecord(legacy, 1);
  await idbWrite('saves', record);
  await idbWriteTables(buildSnapshotTables(record.snapshot), { clear: true });
  return record;
};

export const saveLocalGameProgress = async (state, slot = 1) => {
  await ensureLocalGameDatabase();
  const record = buildSaveRecord(state, slot);
  await idbWrite('saves', record);
  await idbWriteTables(buildSnapshotTables(record.snapshot), { clear: true });
  await idbWrite('meta', {
    id: 'active_save',
    saveId: SAVE_ID,
    updatedAt: record.updatedAt,
    season: record.season,
    week: record.week,
  });
  writeLegacySave(record);
  return record;
};

export const clearLocalGameProgress = async () => {
  await ensureLocalGameDatabase();
  await idbDelete('saves', SAVE_ID);
  await idbDelete('meta', 'active_save');
  await idbClearStores(GAME_TABLES);
  removeLegacySave();
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
  const tableNames = [
    'players',
    'clubs',
    'fixtures',
    'match_results',
    'league_table_rows',
    'club_season_history',
    'european_competitions',
    'world_cups',
    'world_states',
    'club_offers',
    'market_snapshots',
    'transfers',
    'messages',
    'message_choices',
    'decision_history',
    'contacts',
    'agency_goals',
  ];
  const entries = await Promise.all(tableNames.map(async (storeName) => [storeName, await idbGetAll(storeName)]));
  const tables = Object.fromEntries(entries);
  return {
    loadedAt: Date.now(),
    tables,
    players: tables.players ?? [],
    clubs: tables.clubs ?? [],
    fixtures: tables.fixtures ?? [],
    matchResults: tables.match_results ?? [],
    leagueTableRows: tables.league_table_rows ?? [],
    clubSeasonHistory: tables.club_season_history ?? [],
    europeanCompetitions: tables.european_competitions ?? [],
    worldCups: tables.world_cups ?? [],
    worldStates: tables.world_states ?? [],
    clubOffers: tables.club_offers ?? [],
    marketSnapshots: tables.market_snapshots ?? [],
    transfers: tables.transfers ?? [],
    messages: tables.messages ?? [],
    messageChoices: tables.message_choices ?? [],
    decisionHistory: tables.decision_history ?? [],
    contacts: tables.contacts ?? [],
    agencyGoals: tables.agency_goals ?? [],
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
