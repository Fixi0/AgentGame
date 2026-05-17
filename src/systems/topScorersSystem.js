/**
 * topScorersSystem.js
 * Génère un classement déterministe des meilleurs buteurs / passeurs
 * pour chaque championnat (par pays) et fusionne les stats réelles
 * des joueurs du roster.
 */

import { EURO_CUP_LABELS } from './europeanCupSystem';

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
      appearances: player.seasonStats?.appearances ?? 0,
      goals: player.seasonStats?.goals ?? 0,
      assists: player.seasonStats?.assists ?? 0,
      isMine: true,
    }))
    .filter((player) => player.goals > 0 || player.assists > 0);

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
  if (centralStats?.scorers?.length || centralStats?.assisters?.length) {
    return {
      ...centralStats,
      competitionLabel: centralStats.competitionLabel ?? EURO_CUP_LABELS[competition]?.name ?? competition,
    };
  }

  return {
    scorers: [],
    assisters: [],
    competitionLabel: EURO_CUP_LABELS[competition]?.name ?? competition,
  };
};

const playerNameParts = (match = {}) => {
  const raw = String(match.playerName ?? '').trim();
  const [firstName = 'Joueur', ...rest] = raw.split(/\s+/);
  return { firstName, lastName: rest.join(' ') || '' };
};

const addMatchToBucket = (bucket, match, isMine = false) => {
  if (!match?.playerId) return bucket;
  const goals = Number(match.goals ?? 0);
  const assists = Number(match.assists ?? 0);
  const minutes = Number(match.minutes ?? 0);
  const playerRating = Number(match.rating ?? 0);
  const matchRating = Number(match.matchRating ?? 0);
  if (!minutes && !goals && !assists) return bucket;

  const previous = bucket.players.get(match.playerId);
  const names = playerNameParts(match);
  bucket.players.set(match.playerId, {
    id: match.playerId,
    firstName: previous?.firstName ?? names.firstName,
    lastName: previous?.lastName ?? names.lastName,
    position: previous?.position ?? match.position,
    roleShort: previous?.roleShort ?? match.roleShort,
    roleLabel: previous?.roleLabel ?? match.roleLabel,
    club: match.club ?? previous?.club ?? 'Club',
    clubDisplay: match.clubDisplay ?? previous?.clubDisplay ?? match.club ?? previous?.club ?? 'Club',
    clubCountryCode: match.clubCountryCode ?? previous?.clubCountryCode,
    competitionCountryCode: match.competitionCountryCode ?? previous?.competitionCountryCode,
    countryCode: previous?.countryCode ?? match.countryCode,
    countryFlag: previous?.countryFlag ?? match.countryFlag,
    rating: Math.max(previous?.rating ?? 0, playerRating),
    matchRatingTotal: (previous?.matchRatingTotal ?? 0) + (matchRating || 0),
    appearances: (previous?.appearances ?? 0) + (minutes > 0 ? 1 : 0),
    goals: (previous?.goals ?? 0) + goals,
    assists: (previous?.assists ?? 0) + assists,
    isMine: Boolean(previous?.isMine || isMine),
  });

  return bucket;
};

const finalizeBucket = (bucket, competitionLabel = null) => {
  const entries = [...(bucket?.players?.values?.() ?? [])].filter((player) => player.goals > 0 || player.assists > 0);
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
    addMatchToBucket(leagueBuckets[countryCode], match, mineIds.has(match.playerId));
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
    addMatchToBucket(europeBuckets[competition], match, mineIds.has(match.playerId));
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
