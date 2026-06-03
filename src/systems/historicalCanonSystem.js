import { clamp } from '../utils/helpers';

const MAX_TIMELINE = 900;
const MAX_SEASONAL = 120;
const MAX_TOP = 80;

export const createDefaultHistoricalCanon = () => ({
  topRatings: [],
  topTransferFees: [],
  topCommissions: [],
  clubLegends: {},
  rivalryHistory: {},
  worldTimeline: [],
  seasonalSnapshots: [],
  mediaMemory: {
    recentFingerprints: [],
    arcByKey: {},
  },
});

const pushUniqueById = (list = [], entries = [], max = MAX_TOP) => {
  const map = new Map();
  [...entries, ...list].forEach((item) => {
    if (!item?.id) return;
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return [...map.values()].slice(0, max);
};

const takeTopRatingEntries = ({ roster = [], week = 1, season = 1 } = {}) =>
  [...roster]
    .sort((a, b) => (b?.rating ?? 0) - (a?.rating ?? 0))
    .slice(0, 5)
    .map((player) => ({
      id: `rating_${player.id}_${week}`,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      rating: player.rating ?? 0,
      age: player.age ?? null,
      club: player.club ?? null,
      season,
      week,
    }));

const mapTransferEntries = (transfers = []) =>
  transfers.map((transfer) => ({
    id: transfer.id ?? `tr_${transfer.playerId ?? 'x'}_${transfer.week ?? 0}_${transfer.toClubId ?? transfer.toClub ?? 'club'}`,
    playerId: transfer.playerId,
    playerName: transfer.playerName,
    fee: Math.max(0, Number(transfer.fee ?? 0)),
    commission: Math.max(0, Number(transfer.commission ?? 0)),
    fromClub: transfer.fromClub ?? null,
    toClub: transfer.toClub ?? null,
    season: transfer.season ?? null,
    week: transfer.week ?? null,
  }));

const updateClubLegends = (clubLegends = {}, hallOfFame = [], week = 1) => {
  const patch = { ...clubLegends };
  hallOfFame
    .filter((entry) => (entry?.retiredAtWeek ?? -1) === week)
    .forEach((entry) => {
      const club = entry.finalClub ?? 'Club inconnu';
      const legend = {
        id: entry.id,
        playerId: entry.playerId,
        name: entry.name,
        rating: entry.finalRating ?? 0,
        retiredAtWeek: entry.retiredAtWeek ?? week,
      };
      patch[club] = pushUniqueById(patch[club] ?? [], [legend], 40)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 40);
    });
  return patch;
};

const updateRivalryHistory = (rivalryHistory = {}, rivalries = {}, week = 1) => {
  const next = { ...rivalryHistory };
  Object.entries(rivalries ?? {}).forEach(([key, item]) => {
    if (!item || !Array.isArray(item.clubs) || item.clubs.length < 2) return;
    const current = next[key] ?? {
      clubs: item.clubs,
      peakHeat: 0,
      peaks: [],
      meetings: 0,
      lastWeek: 0,
    };
    const heat = Number(item.heat ?? 0);
    const meetings = Number(item.meetings ?? current.meetings ?? 0);
    const peaks = [...(current.peaks ?? [])];
    if (heat >= 72 && (current.lastWeek ?? 0) < week - 2) {
      peaks.unshift({ week, heat });
    }
    next[key] = {
      clubs: item.clubs,
      peakHeat: Math.max(Number(current.peakHeat ?? 0), heat),
      peaks: peaks.slice(0, 20),
      meetings,
      lastWeek: Math.max(Number(item.lastWeek ?? 0), Number(current.lastWeek ?? 0)),
    };
  });
  return next;
};

export const updateHistoricalCanonWeek = ({
  canon = createDefaultHistoricalCanon(),
  week = 1,
  season = 1,
  seasonWeek = 1,
  roster = [],
  transferHistory = [],
  hallOfFame = [],
  worldMemory = {},
  worldSummary = [],
  events = [],
} = {}) => {
  const ratingEntries = takeTopRatingEntries({ roster, week, season });
  const transferEntries = mapTransferEntries(
    (transferHistory ?? []).filter((entry) => (entry?.week ?? -1) === week),
  );
  const topTransferFees = pushUniqueById(
    [...(canon.topTransferFees ?? [])].sort((a, b) => (b.fee ?? 0) - (a.fee ?? 0)),
    [...transferEntries].sort((a, b) => (b.fee ?? 0) - (a.fee ?? 0)),
    MAX_TOP,
  ).sort((a, b) => (b.fee ?? 0) - (a.fee ?? 0));
  const topCommissions = pushUniqueById(
    [...(canon.topCommissions ?? [])].sort((a, b) => (b.commission ?? 0) - (a.commission ?? 0)),
    [...transferEntries].sort((a, b) => (b.commission ?? 0) - (a.commission ?? 0)),
    MAX_TOP,
  ).sort((a, b) => (b.commission ?? 0) - (a.commission ?? 0));

  const weeklyTimeline = [];
  (worldSummary ?? []).slice(0, 4).forEach((item, idx) => {
    if (!item?.text) return;
    weeklyTimeline.push({
      id: `ws_${week}_${idx}`,
      week,
      season,
      type: item.type ?? 'world',
      title: item.title ?? 'Fil monde',
      text: item.text,
    });
  });
  (events ?? []).slice(0, 6).forEach((event, idx) => {
    const impact = Math.abs(Number(event?.rep ?? 0));
    if (impact < 4 && !event?.injury) return;
    weeklyTimeline.push({
      id: `ev_${week}_${idx}`,
      week,
      season,
      type: event?.type ?? 'event',
      title: event?.label ?? 'Événement marquant',
      text: `${event?.player ?? 'Joueur'} — ${event?.label ?? event?.type ?? 'événement'}`,
      impact,
    });
  });

  const seasonalSnapshots = seasonWeek === 1 && week > 1
    ? [{
      id: `season_${season - 1}_wrap`,
      season: season - 1,
      week,
      summary: {
        retiredCount: (hallOfFame ?? []).filter((entry) => Math.floor(((entry?.retiredAtWeek ?? 1) - 1) / 38) + 1 === (season - 1)).length,
        peakTransferFee: topTransferFees[0]?.fee ?? 0,
        peakCommission: topCommissions[0]?.commission ?? 0,
        rivalryCount: Object.keys(worldMemory?.rivalries ?? {}).length,
      },
    }]
    : [];

  return {
    ...canon,
    topRatings: pushUniqueById(canon.topRatings ?? [], ratingEntries, MAX_TOP)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, MAX_TOP),
    topTransferFees,
    topCommissions,
    clubLegends: updateClubLegends(canon.clubLegends ?? {}, hallOfFame ?? [], week),
    rivalryHistory: updateRivalryHistory(canon.rivalryHistory ?? {}, worldMemory?.rivalries ?? {}, week),
    worldTimeline: [...weeklyTimeline, ...(canon.worldTimeline ?? [])].slice(0, MAX_TIMELINE),
    seasonalSnapshots: [...seasonalSnapshots, ...(canon.seasonalSnapshots ?? [])].slice(0, MAX_SEASONAL),
    mediaMemory: {
      recentFingerprints: [...(canon.mediaMemory?.recentFingerprints ?? [])].slice(0, 240),
      arcByKey: { ...(canon.mediaMemory?.arcByKey ?? {}) },
      lastWeek: clamp(week, 1, 10_000),
    },
  };
};
