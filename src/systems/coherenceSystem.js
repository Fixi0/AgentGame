import { clamp, makeId } from '../utils/helpers';

const createEmptyDossier = () => ({
  heat: 50,
  lastWeek: 0,
  lastCoachWeek: 0,
  lastDsWeek: 0,
  lastMediaWeek: 0,
  lastTransferWeek: 0,
  lastPromiseWeek: 0,
  recent: [],
});

export const createDefaultDossierMemory = () => ({ players: {}, clubs: {}, media: {} });

const getPlayerKey = (playerId) => String(playerId ?? '');

const getEntry = (collection = {}, key = '') => collection[key] ?? createEmptyDossier();

export const getDossierEntry = (memory = createDefaultDossierMemory(), playerId) => getEntry(memory.players, getPlayerKey(playerId));

export const recordDossierEvent = (memory = createDefaultDossierMemory(), { playerId = null, clubName = null, mediaId = null, week = 0, type = 'note', label = '', impact = 0 }) => {
  const next = {
    players: { ...(memory.players ?? {}) },
    clubs: { ...(memory.clubs ?? {}) },
    media: { ...(memory.media ?? {}) },
  };
  const event = { id: makeId('mem'), week, type, label, impact };

  if (playerId) {
    const key = getPlayerKey(playerId);
    const current = getEntry(next.players, key);
    next.players[key] = {
      ...current,
      heat: clamp((current.heat ?? 50) + impact, 0, 100),
      lastWeek: week,
      lastCoachWeek: type === 'coach' ? week : current.lastCoachWeek ?? 0,
      lastDsWeek: type === 'ds' ? week : current.lastDsWeek ?? 0,
      lastMediaWeek: type === 'media' ? week : current.lastMediaWeek ?? 0,
      lastTransferWeek: type === 'transfer' ? week : current.lastTransferWeek ?? 0,
      lastPromiseWeek: type === 'promise' ? week : current.lastPromiseWeek ?? 0,
      recent: [event, ...(current.recent ?? [])].slice(0, 10),
    };
  }

  if (clubName) {
    const current = getEntry(next.clubs, clubName);
    next.clubs[clubName] = {
      ...current,
      heat: clamp((current.heat ?? 50) + impact, 0, 100),
      lastWeek: week,
      recent: [event, ...(current.recent ?? [])].slice(0, 10),
    };
  }

  if (mediaId) {
    const current = getEntry(next.media, mediaId);
    next.media[mediaId] = {
      ...current,
      heat: clamp((current.heat ?? 50) + impact, 0, 100),
      lastWeek: week,
      recent: [event, ...(current.recent ?? [])].slice(0, 10),
    };
  }

  return next;
};

export const getDossierHeat = (memory = createDefaultDossierMemory(), playerId) => getDossierEntry(memory, playerId).heat ?? 50;

export const getRecentDossierEvents = (memory = createDefaultDossierMemory(), playerId, limit = 5) =>
  getDossierEntry(memory, playerId).recent?.slice(0, limit) ?? [];

export const hasDossierEventThisWeek = (memory = createDefaultDossierMemory(), playerId, week = 0) =>
  getDossierEntry(memory, playerId).lastWeek === week;

export const getDossierHistorySummary = (memory = createDefaultDossierMemory(), playerId) => {
  const entry = getDossierEntry(memory, playerId);
  if (!entry.recent?.length) return 'Aucun historique sensible';
  const last = entry.recent[0];
  if ((last.impact ?? 0) > 0) return 'Dossier calmé récemment';
  if ((last.impact ?? 0) < 0) return 'Dossier tendu récemment';
  return 'Dossier stable récemment';
};

export const getClubRecentDossierEvents = (memory = createDefaultDossierMemory(), clubName, limit = 5) =>
  memory?.clubs?.[clubName]?.recent?.slice(0, limit) ?? [];

export const getClubDossierHistorySummary = (memory = createDefaultDossierMemory(), clubName) => {
  const entry = memory?.clubs?.[clubName];
  if (!entry?.recent?.length) return 'Aucun historique sensible';
  const last = entry.recent[0];
  if ((last.impact ?? 0) > 0) return 'Club plus souple récemment';
  if ((last.impact ?? 0) < 0) return 'Club plus dur récemment';
  return 'Club stable récemment';
};

export const hasRecentDossierEvent = (memory = createDefaultDossierMemory(), playerId, type, cooldownWeeks = 4, week = 0) => {
  const entry = getDossierEntry(memory, playerId);
  const recentMatch = (entry.recent ?? []).find((item) => item.type === type);
  if (!recentMatch) return false;
  return (week - recentMatch.week) < cooldownWeeks;
};
