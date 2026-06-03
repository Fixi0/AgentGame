/**
 * topScorersSystem.js
 * Génère un classement déterministe des meilleurs buteurs / passeurs
 * pour chaque championnat (par pays) et fusionne les stats réelles
 * des joueurs du roster.
 */

import { CLUBS, getClubDisplayName } from '../data/clubs';
import { getClubSquad } from '../data/squadDatabase';
import { EURO_CUP_LABELS, getClubEuropeanCompetition } from './europeanCupSystem';

const sanitizeCount = (value) => Math.max(0, Math.floor(Number(value) || 0));
const isEligibleOutfield = (player = {}) => (player?.position ?? '').toUpperCase() !== 'GK';
const hasContributions = (player = {}) => sanitizeCount(player.goals) > 0 || sanitizeCount(player.assists) > 0;

/**
 * Construit le classement des buteurs et passeurs du championnat d'un pays.
 * @param {string} countryCode
 * @param {object} state — pour récupérer roster réel + week
 * @returns {{ scorers: Array, assisters: Array }}
 */
export const getLeagueTopStats = (countryCode, state = {}) => {
  const centralStats = state.competitionTopStats?.league?.[countryCode];
  if (centralStats?.scorers?.length || centralStats?.assisters?.length) return centralStats;

  const entries = (state.roster ?? [])
    .filter((player) => player.clubCountryCode === countryCode && player.club && player.club !== 'Libre')
    .filter(isEligibleOutfield)
    .map((player) => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      roleShort: player.roleShort,
      roleLabel: player.roleLabel,
      club: player.club,
      clubDisplay: player.club,
      countryFlag: player.countryFlag,
      countryCode: player.countryCode,
      rating: player.rating,
      appearances: sanitizeCount(player.seasonStats?.appearances),
      goals: sanitizeCount(player.seasonStats?.goals),
      assists: sanitizeCount(player.seasonStats?.assists),
      isMine: true,
    }))
    .filter(hasContributions);

  const scorers = [...entries]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.rating - a.rating)
    .slice(0, 10);
  const assisters = [...entries]
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || b.rating - a.rating)
    .slice(0, 10);
  return { scorers, assisters };
};

export const getEuropeanTopStats = (competition, state = {}) => {
  const centralStats = state.competitionTopStats?.europe?.[competition];
  const fallback = buildEuropeanVirtualTopStats(competition, state);
  const merged = mergeTopStats(centralStats, fallback);

  return {
    ...merged,
    competitionLabel: centralStats?.competitionLabel ?? EURO_CUP_LABELS[competition]?.name ?? competition,
  };
};

const hashStat = (str = '') => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

const getCurrentSeason = (state = {}) => Math.floor(((state.week ?? 1) - 1) / 38) + 1;

const buildEuropeanVirtualTopStats = (competition, state = {}) => {
  const season = getCurrentSeason(state);
  const seasonWeek = ((state.week ?? 1) - 1) % 38 + 1;
  const played = Math.max(1, Math.min(competition === 'ECL' ? 6 : 8, Math.floor((seasonWeek + 1) / 2)));
  const agencyIds = new Set((state.roster ?? []).map((player) => player.id));
  const players = CLUBS
    .filter((club) => getClubEuropeanCompetition(club, season) === competition)
    .flatMap((club) => {
      const squad = (getClubSquad(club, season) ?? [])
        .filter((player) => ['ATT', 'MIL'].includes(player.position))
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 3);
      return squad.map((player, index) => {
        const seed = hashStat(`${competition}:${season}:${seasonWeek}:${club.name}:${player.id}`);
        const ratingBoost = Math.max(0, ((player.rating ?? 70) - 72) / 14);
        const goals = Math.max(0, Math.round(((seed % 5) + index + ratingBoost) * Math.min(played, 6) / 5));
        const assists = Math.max(0, Math.round((((seed >> 5) % 4) + ratingBoost) * Math.min(played, 6) / 5));
        return {
          id: `virtual_euro_${competition}_${player.id}`,
          firstName: player.firstName,
          lastName: player.lastName,
          position: player.position,
          roleShort: player.roleShort,
          roleLabel: player.roleLabel,
          club: club.name,
          clubDisplay: getClubDisplayName(club.name),
          clubCountryCode: club.countryCode,
          countryCode: player.countryCode,
          countryFlag: player.countryFlag,
          rating: player.rating ?? 70,
          appearances: played,
          goals,
          assists,
          isMine: agencyIds.has(player.id),
        };
      });
    })
    .filter((player) => isEligibleOutfield(player) && hasContributions(player));

  return {
    scorers: [...players]
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.rating - a.rating)
      .slice(0, 20),
    assisters: [...players]
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || b.rating - a.rating)
      .slice(0, 20),
  };
};

const mergeTopStats = (centralStats = {}, fallbackStats = {}) => {
  const byId = new Map();
  [...(fallbackStats.scorers ?? []), ...(fallbackStats.assisters ?? [])].forEach((player) => {
    byId.set(player.id, { ...player });
  });
  [...(centralStats?.scorers ?? []), ...(centralStats?.assisters ?? [])].forEach((player) => {
    byId.set(player.id, { ...(byId.get(player.id) ?? {}), ...player });
  });
  const players = [...byId.values()].filter((player) => isEligibleOutfield(player) && hasContributions(player));
  return {
    scorers: [...players]
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.appearances - a.appearances || b.rating - a.rating)
      .slice(0, 20),
    assisters: [...players]
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || b.appearances - a.appearances || b.rating - a.rating)
      .slice(0, 20),
  };
};

const playerNameParts = (match = {}) => {
  const raw = String(match.playerName ?? '').trim();
  const [firstName = 'Joueur', ...rest] = raw.split(/\s+/);
  return { firstName, lastName: rest.join(' ') || '' };
};

const addMatchToBucket = (bucket, match, isMine = false, rosterMeta = null) => {
  if (!match?.playerId) return bucket;
  const goals = sanitizeCount(match.goals);
  const assists = sanitizeCount(match.assists);
  const minutes = sanitizeCount(match.minutes);
  const playerRating = Number(match.rating ?? 0);
  const matchRating = Number(match.matchRating ?? 0);
  if (!minutes && !goals && !assists) return bucket;

  const previous = bucket.players.get(match.playerId);
  const resolvedPosition = (previous?.position ?? match.position ?? rosterMeta?.position ?? '').toUpperCase();
  if (resolvedPosition === 'GK') return bucket;
  const names = playerNameParts(match);
  bucket.players.set(match.playerId, {
    id: match.playerId,
    firstName: previous?.firstName ?? names.firstName,
    lastName: previous?.lastName ?? names.lastName,
    position: previous?.position ?? match.position ?? rosterMeta?.position,
    roleShort: previous?.roleShort ?? match.roleShort ?? rosterMeta?.roleShort,
    roleLabel: previous?.roleLabel ?? match.roleLabel ?? rosterMeta?.roleLabel,
    club: match.club ?? previous?.club ?? 'Club',
    clubDisplay: match.clubDisplay ?? previous?.clubDisplay ?? match.club ?? previous?.club ?? 'Club',
    clubCountryCode: match.clubCountryCode ?? previous?.clubCountryCode,
    competitionCountryCode: match.competitionCountryCode ?? previous?.competitionCountryCode,
    countryCode: previous?.countryCode ?? match.countryCode,
    countryFlag: previous?.countryFlag ?? match.countryFlag,
    rating: Math.max(previous?.rating ?? 0, playerRating),
    matchRatingTotal: (previous?.matchRatingTotal ?? 0) + (matchRating || 0),
    appearances: sanitizeCount(previous?.appearances) + (minutes > 0 ? 1 : 0),
    goals: (previous?.goals ?? 0) + goals,
    assists: (previous?.assists ?? 0) + assists,
    isMine: Boolean(previous?.isMine || isMine),
  });

  return bucket;
};

const finalizeBucket = (bucket, competitionLabel = null) => {
  const entries = [...(bucket?.players?.values?.() ?? [])].filter((player) => isEligibleOutfield(player) && hasContributions(player));
  return {
    scorers: [...entries]
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.appearances - a.appearances || String(a.lastName).localeCompare(String(b.lastName)))
      .slice(0, 20),
    assisters: [...entries]
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || b.appearances - a.appearances || String(a.lastName).localeCompare(String(b.lastName)))
      .slice(0, 20),
    ...(competitionLabel ? { competitionLabel } : {}),
  };
};

export const createCompetitionTopStats = () => ({
  league: {},
  europe: {},
});

export const updateCompetitionTopStats = (current = createCompetitionTopStats(), {
  leagueMatches = [],
  europeanMatches = [],
  roster = [],
} = {}) => {
  const mineIds = new Set((roster ?? []).map((player) => player.id));
  const rosterById = new Map((roster ?? []).filter((player) => player?.id).map((player) => [player.id, player]));
  const leagueBuckets = {};
  Object.entries(current.league ?? {}).forEach(([countryCode, stats]) => {
    const bucket = { players: new Map() };
    [...(stats.scorers ?? []), ...(stats.assisters ?? [])].forEach((player) => {
      bucket.players.set(player.id, { ...player });
    });
    leagueBuckets[countryCode] = bucket;
  });

  leagueMatches.forEach((match) => {
    const countryCode = match.competitionCountryCode ?? match.clubCountryCode;
    if (!countryCode || countryCode.startsWith('__')) return;
    if (!leagueBuckets[countryCode]) leagueBuckets[countryCode] = { players: new Map() };
    addMatchToBucket(leagueBuckets[countryCode], match, mineIds.has(match.playerId), rosterById.get(match.playerId));
  });

  const europeBuckets = {};
  Object.entries(current.europe ?? {}).forEach(([competition, stats]) => {
    const bucket = { players: new Map(), competitionLabel: stats.competitionLabel };
    [...(stats.scorers ?? []), ...(stats.assisters ?? [])].forEach((player) => {
      bucket.players.set(player.id, { ...player });
    });
    europeBuckets[competition] = bucket;
  });

  europeanMatches.forEach((match) => {
    const competition = match.competition;
    if (!competition) return;
    if (!europeBuckets[competition]) {
      europeBuckets[competition] = {
        players: new Map(),
        competitionLabel: match.competitionLabel ?? EURO_CUP_LABELS[competition]?.name ?? competition,
      };
    }
    addMatchToBucket(europeBuckets[competition], match, mineIds.has(match.playerId), rosterById.get(match.playerId));
  });

  return {
    league: Object.fromEntries(Object.entries(leagueBuckets).map(([countryCode, bucket]) => [
      countryCode,
      finalizeBucket(bucket),
    ])),
    europe: Object.fromEntries(Object.entries(europeBuckets).map(([competition, bucket]) => [
      competition,
      finalizeBucket(bucket, bucket.competitionLabel ?? EURO_CUP_LABELS[competition]?.name ?? competition),
    ])),
  };
};
