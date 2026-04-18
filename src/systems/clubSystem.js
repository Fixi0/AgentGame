import { CLUBS } from '../data/clubs';
import { clamp } from '../utils/helpers';

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

export const createDefaultClubRelations = () =>
  CLUBS.reduce((relations, club) => ({ ...relations, [club.name]: 50 }), {});

export const createDefaultClubMemory = () =>
  CLUBS.reduce((memory, club) => ({
    ...memory,
    [club.name]: {
      trust: 50,
      blocks: 0,
      lies: 0,
      promisesBroken: 0,
      lastWeek: 0,
    },
  }), {});

const getClubMemoryBase = (memory, clubName) => (
  memory?.[clubName] ?? {
    trust: 50,
    blocks: 0,
    lies: 0,
    promisesBroken: 0,
    lastWeek: 0,
  }
);

export const getClubMemoryScore = (memory = createDefaultClubMemory(), clubName) => getClubMemoryBase(memory, clubName).trust ?? 50;

export const getClubMemorySummary = (memory = createDefaultClubMemory(), clubName) => {
  const clubMemory = getClubMemoryBase(memory, clubName);
  if (clubMemory.promisesBroken >= 3 || clubMemory.blocks >= 4) return 'Méfiance forte';
  if (clubMemory.promisesBroken > 0 || clubMemory.blocks > 0 || clubMemory.trust < 45) return 'Mémoire tendue';
  if (clubMemory.trust > 60) return 'Mémoire positive';
  return 'Mémoire neutre';
};

export const recordClubMemory = (memory = createDefaultClubMemory(), clubName, patch = {}) => {
  if (!clubName) return memory;
  const current = getClubMemoryBase(memory, clubName);
  const trust = clamp((current.trust ?? 50) + (patch.trust ?? 0), 0, 100);

  return {
    ...memory,
    [clubName]: {
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
  rivalries: CLUBS
    .filter((item) => item.countryCode === club.countryCode && item.name !== club.name)
    .sort((a, b) => a.tier - b.tier)
    .slice(0, 3)
    .map((item) => item.name),
});

export const applyClubRelation = (relations = createDefaultClubRelations(), clubName, delta) => {
  if (!clubName) return relations;
  return {
    ...relations,
    [clubName]: clamp((relations[clubName] ?? 50) + delta),
  };
};
