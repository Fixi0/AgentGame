/**
 * individualTrophiesSystem.js
 * Trophées individuels en fin de saison : Ballon Global, Soulier d'Or, équipe-type.
 */
import { createPlayerCatalog } from '../data/squadDatabase';

const safeGoals = (p = {}) => Number(p.seasonStats?.goals ?? p.seasonGoals ?? p.stats?.goals ?? 0);
const safeAssists = (p = {}) => Number(p.seasonStats?.assists ?? p.seasonAssists ?? p.stats?.assists ?? 0);

export const computeSeasonTrophies = (state) => {
  const season = Math.floor(((state.week ?? 1) - 1) / 38) + 1;
  const catalog = createPlayerCatalog(season);
  // include managed roster too
  const all = [...catalog, ...(state.roster ?? [])];

  // Ballon Global: combine rating, goals, assists; pick top
  const scored = all
    .filter((p) => p?.id && p?.firstName)
    .map((p) => {
      const r = p.rating ?? 120;
      const g = safeGoals(p);
      const a = safeAssists(p);
      const score = r + g * 1.5 + a * 0.8 + (p.id?.startsWith('sig_') ? 30 : 0);
      return { p, score, g, a };
    })
    .sort((a, b) => b.score - a.score);

  const ballonDor = scored[0];
  const goldenBoot = [...all].sort((a, b) => safeGoals(b) - safeGoals(a))[0];
  const playmaker = [...all].sort((a, b) => safeAssists(b) - safeAssists(a))[0];

  // Team of the season — best per role
  const POSITIONS = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MIL', 'MIL', 'MIL', 'ATT', 'ATT', 'ATT'];
  const usedIds = new Set();
  const teamOfSeason = POSITIONS.map((pos) => {
    const candidate = scored.find(({ p }) => p.position === pos && !usedIds.has(p.id));
    if (candidate) usedIds.add(candidate.p.id);
    return candidate ? { position: pos, player: candidate.p, score: candidate.score } : null;
  }).filter(Boolean);

  return {
    season,
    week: state.week ?? 1,
    ballonDor: ballonDor ? {
      playerId: ballonDor.p.id,
      name: `${ballonDor.p.firstName} ${ballonDor.p.lastName}`,
      club: ballonDor.p.club,
      countryFlag: ballonDor.p.countryFlag,
      score: Math.round(ballonDor.score),
    } : null,
    goldenBoot: goldenBoot ? {
      playerId: goldenBoot.id,
      name: `${goldenBoot.firstName} ${goldenBoot.lastName}`,
      club: goldenBoot.club,
      goals: safeGoals(goldenBoot),
    } : null,
    playmaker: playmaker ? {
      playerId: playmaker.id,
      name: `${playmaker.firstName} ${playmaker.lastName}`,
      club: playmaker.club,
      assists: safeAssists(playmaker),
    } : null,
    teamOfSeason: teamOfSeason.map(({ position, player }) => ({
      position,
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      club: player.club,
      rating: player.rating,
    })),
  };
};

export const recordSeasonTrophies = (state) => {
  const trophies = computeSeasonTrophies(state);
  const list = [trophies, ...((state.seasonTrophies) ?? [])].slice(0, 30);
  // Mark managed players who won Ballon Global
  const updatedRoster = (state.roster ?? []).map((p) => {
    if (trophies.ballonDor?.playerId === p.id) {
      return { ...p, ballonDorWins: (p.ballonDorWins ?? 0) + 1 };
    }
    return p;
  });
  return { state: { ...state, seasonTrophies: list, roster: updatedRoster }, trophies };
};
