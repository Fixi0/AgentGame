import { CLUBS } from '../data/clubs';
import { clamp } from '../utils/helpers';
import { getClubId, getClubName } from './identitySystem';

const STYLE_BY_TIER = {
  1: 'possession dominante',
  2: 'pressing ambitieux',
  3: 'transition rapide',
  4: 'bloc compact',
};

const MEDIA_BY_TIER = {
  1: 'énorme',
  2: 'forte',
  3: 'moyenne',
  4: 'locale',
};

const TENSION_BY_TIER = {
  1: 'très exigeant',
  2: 'ambitieux',
  3: 'opportuniste',
  4: 'patient',
};

const resolveClubKey = (clubRef) => getClubId(clubRef) ?? clubRef ?? null;
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export const createDefaultClubRelations = () =>
  CLUBS.reduce((relations, club) => ({ ...relations, [club.id]: 50 }), {});

export const createDefaultClubMemory = () =>
  CLUBS.reduce((memory, club) => ({
    ...memory,
    [club.id]: {
      trust: 50,
      blocks: 0,
      lies: 0,
      promisesBroken: 0,
      lastWeek: 0,
    },
  }), {});

const getClubMemoryBase = (memory, clubRef) => {
  const key = resolveClubKey(clubRef);
  const byId = key ? memory?.[key] : null;
  const byName = memory?.[getClubName(clubRef)];
  return byId ?? byName ?? {
    trust: 50,
    blocks: 0,
    lies: 0,
    promisesBroken: 0,
    lastWeek: 0,
  }
};

export const getClubMemoryScore = (memory = createDefaultClubMemory(), clubRef) => getClubMemoryBase(memory, clubRef).trust ?? 50;
export const getClubMemoryEntry = (memory = createDefaultClubMemory(), clubRef) => getClubMemoryBase(memory, clubRef);

export const getClubRelationScore = (relations = createDefaultClubRelations(), clubRef) => {
  const key = resolveClubKey(clubRef);
  if (key && Number.isFinite(relations?.[key])) return relations[key];
  const byName = relations?.[getClubName(clubRef)];
  return Number.isFinite(byName) ? byName : 50;
};

export const normalizeClubScopedMap = (map = {}, { defaultValue = 50, merge = null } = {}) =>
  Object.entries(isObject(map) ? map : {}).reduce((next, [rawKey, rawValue]) => {
    const key = resolveClubKey(rawKey);
    if (!key) return next;
    const current = next[key];
    const value = rawValue ?? defaultValue;
    if (merge && current !== undefined) {
      next[key] = merge(current, value);
      return next;
    }
    next[key] = current !== undefined ? current : value;
    return next;
  }, {});

export const getClubMemorySummary = (memory = createDefaultClubMemory(), clubRef) => {
  const clubMemory = getClubMemoryBase(memory, clubRef);
  if (clubMemory.promisesBroken >= 3 || clubMemory.blocks >= 4 || clubMemory.lies >= 3) return 'Méfiance forte';
  if (clubMemory.promisesBroken > 0 || clubMemory.blocks > 0 || clubMemory.lies > 0 || clubMemory.trust < 45) return 'Mémoire tendue';
  if (clubMemory.trust > 60) return 'Mémoire positive';
  return 'Mémoire neutre';
};

export const recordClubMemory = (memory = createDefaultClubMemory(), clubRef, patch = {}) => {
  const key = resolveClubKey(clubRef);
  if (!key) return memory;
  const current = getClubMemoryBase(memory, key);
  const trust = clamp((current.trust ?? 50) + (patch.trust ?? 0), 0, 100);

  return {
    ...memory,
    [key]: {
      ...current,
      trust,
      blocks: Math.max(0, (current.blocks ?? 0) + (patch.blocks ?? 0)),
      lies: Math.max(0, (current.lies ?? 0) + (patch.lies ?? 0)),
      promisesBroken: Math.max(0, (current.promisesBroken ?? 0) + (patch.promisesBroken ?? 0)),
      lastWeek: patch.week ?? current.lastWeek ?? 0,
    },
  };
};

export const getClubProfile = (club, relation = 50) => ({
  budget: Math.max(8, Math.round((5 - club.tier) * 22 + relation / 8)),
  prestige: Math.max(20, Math.round((5 - club.tier) * 20 + relation / 10)),
  style: STYLE_BY_TIER[club.tier] ?? 'équilibré',
  mediaPressure: MEDIA_BY_TIER[club.tier] ?? 'moyenne',
  temperament: TENSION_BY_TIER[club.tier] ?? 'équilibré',
  rivalries: CLUBS
    .filter((item) => item.countryCode === club.countryCode && item.name !== club.name)
    .sort((a, b) => a.tier - b.tier)
    .slice(0, 3)
    .map((item) => item.name),
});

export const applyClubRelation = (relations = createDefaultClubRelations(), clubRef, delta) => {
  const key = resolveClubKey(clubRef);
  if (!key) return relations;
  return {
    ...relations,
    [key]: clamp(getClubRelationScore(relations, key) + delta),
  };
};
