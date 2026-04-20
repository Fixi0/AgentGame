import { createGameCatalog, createGameDatabaseSnapshot } from './gameDatabase';
import { STORAGE_KEY } from '../game/gameLogic';

const DB_NAME = 'agent_foot_local_db';
const DB_VERSION = 1;
const SAVE_ID = 'active_save';
const CATALOG_ID = 'catalog_v1';

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

const openDb = () => {
  if (!supportsIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('saves')) {
        const store = db.createObjectStore('saves', { keyPath: 'id' });
        store.createIndex('updated_at', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('catalog')) {
        db.createObjectStore('catalog', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const idbRead = async (storeName, key) => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
};

const idbWrite = async (storeName, value) => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const idbDelete = async (storeName, key) => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const idbGetAll = async (storeName) => {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
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
    // ignored on purpose
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
    catalog: createGameCatalog(),
    preview,
    season,
    week,
  };
};

export const ensureLocalGameDatabase = async () => {
  const db = await openDb();
  if (!db) return null;
  const existing = await idbRead('catalog', CATALOG_ID);
  if (!existing) {
    await idbWrite('catalog', {
      id: CATALOG_ID,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: createGameCatalog(),
    });
  }
  return true;
};

export const loadLocalGameProgress = async () => {
  await ensureLocalGameDatabase();
  const saved = await idbRead('saves', SAVE_ID);
  if (saved?.state) return saved;
  const saves = await idbGetAll('saves');
  const latest = saves.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
  if (latest?.state) return latest;

  const legacy = readLegacySave();
  if (!legacy) return null;
  return buildSaveRecord(legacy, 1);
};

export const saveLocalGameProgress = async (state, slot = 1) => {
  const record = buildSaveRecord(state, slot);
  await ensureLocalGameDatabase();
  await idbWrite('saves', record);
  await idbWrite('meta', {
    id: 'active_save',
    saveId: SAVE_ID,
    updatedAt: record.updatedAt,
  });
  writeLegacySave(record);
  return record;
};

export const clearLocalGameProgress = async () => {
  await ensureLocalGameDatabase();
  await idbDelete('saves', SAVE_ID);
  await idbDelete('meta', 'active_save');
  removeLegacySave();
};

export const hasLocalGameProgress = async () => {
  const saved = await loadLocalGameProgress();
  return Boolean(saved?.state);
};
