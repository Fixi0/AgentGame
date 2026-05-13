/**
 * topScorersSystem.js
 * Génère un classement déterministe des meilleurs buteurs / passeurs
 * pour chaque championnat (par pays) et fusionne les stats réelles
 * des joueurs du roster.
 */

import { CLUBS } from '../data/clubs';
import { getClubSquad } from '../data/squadDatabase';
import { getEuropeanParticipantsMap, getEuropeanStage, EURO_CUP_LABELS } from './europeanCupSystem';

const seeded = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const idHash = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** Estime un nombre de buts/passes pour un NPC déterministe. */
const estimateNpcStats = (player, seasonWeek = 1, season = 1) => {
  const rating = player.rating ?? 60;
  const base = Math.max(0, (rating - 60) / 6); // 0..~7
  const positionMult = player.position === 'ATT' ? 1.6
    : player.position === 'MIL' ? 0.7
      : player.position === 'DEF' ? 0.18
        : 0.04;
  const assistMult = player.position === 'MIL' ? 1.4
    : player.position === 'ATT' ? 0.85
      : player.position === 'DEF' ? 0.3
        : 0.08;
  const variance = seeded(idHash(player.id || `${player.firstName}${player.lastName}`) + season * 7);
  const seasonProgress = Math.max(0.05, Math.min(1, seasonWeek / 38));
  const goals = Math.round(base * positionMult * seasonProgress * (0.6 + variance * 0.9));
  const assistVar = seeded(idHash((player.id || '') + 'a') + season * 11);
  const assists = Math.round(base * assistMult * seasonProgress * (0.5 + assistVar * 1.0));
  const appearances = Math.max(1, Math.round(seasonWeek * (0.55 + variance * 0.4)));
  return { goals: Math.max(0, goals), assists: Math.max(0, assists), appearances };
};

/**
 * Construit le classement des buteurs et passeurs du championnat d'un pays.
 * @param {string} countryCode
 * @param {object} state — pour récupérer roster réel + week
 * @returns {{ scorers: Array, assisters: Array }}
 */
export const getLeagueTopStats = (countryCode, state = {}) => {
  const centralStats = state.competitionTopStats?.league?.[countryCode];
  if (centralStats?.scorers?.length || centralStats?.assisters?.length) return centralStats;

  const week = state.week ?? 1;
  const season = Math.floor((week - 1) / 38) + 1;
  const seasonWeek = ((week - 1) % 38) + 1;
  const clubs = CLUBS.filter((c) => c.countryCode === countryCode);
  if (!clubs.length) return { scorers: [], assisters: [] };

  const rosterById = new Map((state.roster ?? []).map((p) => [p.id, p]));

  const leagueTable = state.leagueTables?.[countryCode] ?? {};
  const playedByClub = new Map();
  Object.values(leagueTable).forEach?.((row) => {
    if (row?.club) playedByClub.set(row.club, row.played ?? 0);
  });

  const entries = [];
  for (const club of clubs) {
    const clubPlayed = playedByClub.get(club.name) ?? 0;
    if (clubPlayed <= 0) continue; // pas encore de match → pas de stats fictives
    const squad = getClubSquad(club, season).slice(0, 12); // top 12 du club
    for (const npc of squad) {
      const real = rosterById.get(npc.id);
      const isReal = !!real;
      const playerData = real ?? npc;
      const stats = isReal && playerData.seasonStats
        ? {
          goals: playerData.seasonStats.goals ?? 0,
          assists: playerData.seasonStats.assists ?? 0,
          appearances: playerData.seasonStats.appearances ?? 0,
        }
        : estimateNpcStats(npc, Math.min(seasonWeek, clubPlayed), season);
      if (stats.goals === 0 && stats.assists === 0) continue;
      entries.push({
        id: playerData.id,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        position: playerData.position,
        roleShort: playerData.roleShort,
        roleLabel: playerData.roleLabel,
        club: club.name,
        clubDisplay: club.displayName ?? club.name,
        countryFlag: playerData.countryFlag,
        countryCode: playerData.countryCode,
        rating: playerData.rating,
        appearances: Math.min(stats.appearances, clubPlayed),
        goals: stats.goals,
        assists: stats.assists,
        isMine: isReal,
      });
    }
  }

  const scorers = [...entries]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.rating - a.rating)
    .slice(0, 10);
  const assisters = [...entries]
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || b.rating - a.rating)
    .slice(0, 10);
  return { scorers, assisters };
};

/**
 * Estime stats européennes pour un NPC selon avancement de la saison
 * et stage atteint (la phase de ligue représente la majorité des minutes).
 * Format: CL/EL = 8 journées · ECL = 6 journées.
 */
const estimateEuroStats = (player, competition, seasonWeek, season) => {
  const totalLeagueMatches = competition === 'ECL' ? 6 : 8;
  const stage = getEuropeanStage(seasonWeek, competition);
  // Progression approximative dans la compétition selon la phase courante
  const stageProgress = {
    league: Math.min(1, Math.max(0.05, (seasonWeek - 2) / 18)),
    playoff: 1.0,
    roundOf16: 1.05,
    quarters: 1.12,
    semis: 1.18,
    final: 1.25,
  }[stage] ?? 0.5;

  const rating = player.rating ?? 60;
  const base = Math.max(0, (rating - 62) / 7);
  const positionMult = player.position === 'ATT' ? 1.7
    : player.position === 'MIL' ? 0.7
      : player.position === 'DEF' ? 0.16
        : 0.03;
  const assistMult = player.position === 'MIL' ? 1.4
    : player.position === 'ATT' ? 0.85
      : player.position === 'DEF' ? 0.28
        : 0.06;

  const seedKey = idHash((player.id || `${player.firstName}${player.lastName}`) + competition) + season * 13;
  const variance = seeded(seedKey);
  const assistVar = seeded(seedKey + 5);

  // Scale par matches européens (max 8 ou 6) au lieu de 38
  const matchScale = totalLeagueMatches / 38 * 1.4;
  const goals = Math.round(base * positionMult * stageProgress * matchScale * (0.5 + variance * 1.3));
  const assists = Math.round(base * assistMult * stageProgress * matchScale * (0.4 + assistVar * 1.2));
  const appearances = Math.max(1, Math.round(totalLeagueMatches * stageProgress * (0.55 + variance * 0.4)));
  return { goals: Math.max(0, goals), assists: Math.max(0, assists), appearances };
};

/**
 * Classement déterministe des buteurs/passeurs d'une coupe européenne.
 * Tous les clubs engagés sont pris en compte (top 10 du squad chacun).
 */
export const getEuropeanTopStats = (competition, state = {}) => {
  const centralStats = state.competitionTopStats?.europe?.[competition];

  const week = state.week ?? 1;
  const season = Math.floor((week - 1) / 38) + 1;
  const seasonWeek = ((week - 1) % 38) + 1;
  const map = getEuropeanParticipantsMap(season);
  const clubs = CLUBS.filter((c) => map.get(c.name) === competition);
  if (!clubs.length) return { scorers: [], assisters: [], competitionLabel: EURO_CUP_LABELS[competition]?.name ?? competition };

  const rosterById = new Map((state.roster ?? []).map((p) => [p.id, p]));

  const entries = [];
  for (const club of clubs) {
    const squad = getClubSquad(club, season).slice(0, 10);
    for (const npc of squad) {
      const real = rosterById.get(npc.id);
      const isReal = !!real;
      const playerData = real ?? npc;

      // Stats réelles européennes du joueur agent (matchHistory filtré)
      let stats;
      if (isReal && Array.isArray(playerData.matchHistory)) {
        const euroMatches = playerData.matchHistory.filter((m) => m.competition === competition);
        if (euroMatches.length > 0) {
          stats = euroMatches.reduce((acc, m) => ({
            goals: acc.goals + (m.goals ?? 0),
            assists: acc.assists + (m.assists ?? 0),
            appearances: acc.appearances + 1,
          }), { goals: 0, assists: 0, appearances: 0 });
        } else {
          stats = estimateEuroStats(npc, competition, seasonWeek, season);
        }
      } else {
        stats = estimateEuroStats(npc, competition, seasonWeek, season);
      }

      if (stats.goals === 0 && stats.assists === 0) continue;
      entries.push({
        id: playerData.id,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        position: playerData.position,
        roleShort: playerData.roleShort,
        roleLabel: playerData.roleLabel,
        club: club.name,
        clubDisplay: club.displayName ?? club.name,
        clubCountryCode: club.countryCode,
        countryFlag: playerData.countryFlag,
        countryCode: playerData.countryCode,
        rating: playerData.rating,
        appearances: stats.appearances,
        goals: stats.goals,
        assists: stats.assists,
        isMine: isReal,
      });
    }
  }

  [...(centralStats?.scorers ?? []), ...(centralStats?.assisters ?? [])].forEach((player) => {
    if (!player?.id) return;
    const existingIndex = entries.findIndex((entry) => entry.id === player.id);
    const merged = {
      ...(existingIndex >= 0 ? entries[existingIndex] : {}),
      ...player,
      goals: player.goals ?? entries[existingIndex]?.goals ?? 0,
      assists: player.assists ?? entries[existingIndex]?.assists ?? 0,
      appearances: player.appearances ?? entries[existingIndex]?.appearances ?? 0,
      isMine: true,
    };
    if (existingIndex >= 0) entries[existingIndex] = merged;
    else entries.push(merged);
  });

  const scorers = [...entries]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.rating - a.rating)
    .slice(0, 10);
  const assisters = [...entries]
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || b.rating - a.rating)
    .slice(0, 10);
  return {
    scorers,
    assisters,
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
