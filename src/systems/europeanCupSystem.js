/**
 * europeanCupSystem.js
 * Gère les Coupes Européennes (Champions League, Europa League, Conference League)
 * avec une structure proche du format UEFA moderne.
 *
 * Format pris en compte :
 *   - phase de ligue à 36 équipes
 *   - Ligue des Champions / Europa League : 8 matches de ligue
 *   - Conference League : 6 matches de ligue
 *   - barrages / play-offs pour les équipes du milieu de tableau
 *   - puis élimination directe
 */

import { CLUBS } from '../data/clubs';
import { rand, makeId } from '../utils/helpers';

// Pays dont les clubs accèdent à la CL (top leagues européennes + variantes de code UK)
const TOP_LEAGUE_COUNTRIES = new Set(['FR', 'ES', 'EN', 'GB', 'DE', 'IT', 'PT', 'NL']);

const EURO_SCHEDULE = {
  CL: {
    league: new Set([3, 5, 7, 9, 11, 13, 15, 17]),
    playoff: new Set([20, 21]),
    roundOf16: new Set([23, 24]),
    quarters: new Set([26, 27]),
    semis: new Set([29, 30]),
    final: new Set([33]),
  },
  EL: {
    league: new Set([4, 6, 8, 10, 12, 14, 16, 18]),
    playoff: new Set([20, 21]),
    roundOf16: new Set([23, 24]),
    quarters: new Set([26, 27]),
    semis: new Set([29, 30]),
    final: new Set([33]),
  },
  ECL: {
    league: new Set([5, 7, 9, 11, 13, 15]),
    playoff: new Set([20, 21]),
    roundOf16: new Set([23, 24]),
    quarters: new Set([26, 27]),
    semis: new Set([29, 30]),
    final: new Set([33]),
  },
};

export const EURO_CUP_LABELS = {
  CL: { name: 'Ligue des Champions', short: 'UCL', color: '#1a1a6e', icon: '⭐' },
  EL: { name: 'Europa League', short: 'UEL', color: '#f97316', icon: '🟠' },
  ECL: { name: 'Conference League', short: 'ECL', color: '#16a34a', icon: '🟢' },
};

/**
 * Hash déterministe basé sur le nom du club — identique pour le même club
 * à chaque partie, mais varie entre clubs du même tier.
 */
const clubQualHash = (clubName = '') => {
  let h = 2166136261;
  for (let i = 0; i < clubName.length; i++) {
    h ^= clubName.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 100) / 100; // 0.00 → 0.99
};

const seasonHash = (clubName = '', season = 1) => clubQualHash(`${clubName}:${season}`);

/**
 * Détermine la compétition européenne d'un club pour une saison donnée.
 * Toute l'équipe du club partage la même coupe sur la saison.
 *
 * @returns 'CL' | 'EL' | 'ECL' | null
 */
export const getClubEuropeanCompetition = (club = {}, season = 1) => {
  const tier = club.tier ?? 4;
  const country = club.countryCode ?? '';
  const isTopLeague = TOP_LEAGUE_COUNTRIES.has(country);
  const h = seasonHash(club.name ?? '', season);

  if (tier === 1 && isTopLeague) return 'CL';
  if (tier === 2 && isTopLeague) return h < 0.62 ? 'EL' : 'ECL';
  if (tier === 3 && isTopLeague) return h < 0.18 ? 'EL' : h < 0.86 ? 'ECL' : null;
  if (tier === 4 && isTopLeague) return h < 0.12 ? 'ECL' : null;
  if (tier === 1 && !isTopLeague) return h < 0.52 ? 'EL' : 'ECL';
  if (tier === 2 && !isTopLeague) return h < 0.76 ? 'ECL' : null;
  if (tier === 3 && !isTopLeague) return h < 0.28 ? 'ECL' : null;
  return null;
};

/**
 * Détermine la compétition européenne d'un joueur à partir de son club.
 * La décision est stable pour tous les joueurs du même club sur la saison.
 */
export const getEuropeanCompetition = (player, season = 1) => {
  if (!player) return null;
  const club = {
    name: player.club ?? '',
    tier: player.clubTier ?? 4,
    countryCode: player.clubCountryCode ?? player.countryCode ?? '',
  };
  return getClubEuropeanCompetition(club, season);
};

/**
 * Détermine si cette semaine de saison est une semaine de match européen pour un joueur.
 */
export const isEuropeanMatchWeek = (seasonWeek, competition) => {
  if (!competition) return false;
  const schedule = EURO_SCHEDULE[competition];
  if (!schedule) return false;
  return ['league', 'playoff', 'roundOf16', 'quarters', 'semis', 'final']
    .some((stage) => schedule[stage]?.has(seasonWeek));
};

export const getEuropeanStage = (seasonWeek, competition) => {
  const schedule = EURO_SCHEDULE[competition];
  if (!schedule) return 'league';
  if (schedule.final.has(seasonWeek)) return 'final';
  if (schedule.semis.has(seasonWeek)) return 'semis';
  if (schedule.quarters.has(seasonWeek)) return 'quarters';
  if (schedule.roundOf16.has(seasonWeek)) return 'roundOf16';
  if (schedule.playoff.has(seasonWeek)) return 'playoff';
  return 'league';
};

/**
 * Retourne le nom de la phase selon la semaine de saison.
 */
export const getEuropeanPhaseLabel = (seasonWeek, competition) => {
  const stage = getEuropeanStage(seasonWeek, competition);
  if (stage === 'league') return 'Phase de ligue';
  if (stage === 'playoff') return 'Barrages / play-off';
  if (stage === 'roundOf16') return '1/8 de finale';
  if (stage === 'quarters') return 'Quarts de finale';
  if (stage === 'semis') return 'Demi-finales';
  return 'FINALE';
};

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const getEuropeanSelectionProfile = (player) => {
  if (!player || (player.injured ?? 0) > 0) {
    return { score: -Infinity, starterChance: 0, note: 'Blessé' };
  }

  const stats = player.seasonStats ?? {};
  const appearances = stats.appearances ?? 0;
  const avgRating = stats.averageRating && stats.averageRating > 0 ? stats.averageRating : ((player.form ?? player.rating ?? 60) / 10);
  const recentForm = player.form ?? 60;
  const moral = player.moral ?? 50;
  const clubRole = player.clubRole ?? 'Rotation';
  const roleBonus = clubRole === 'Star' ? 8 : clubRole === 'Titulaire' ? 5 : clubRole === 'Rotation' ? 1 : -8;
  const workloadBonus = appearances >= 24 ? 4 : appearances >= 16 ? 2 : appearances >= 8 ? 1 : -1;
  const fatiguePenalty = (player.fatigue ?? 20) > 80 ? 5 : (player.fatigue ?? 20) > 70 ? 2 : 0;
  const score =
    (player.rating - 60) * 1.15 +
    (recentForm - 50) * 0.42 +
    (avgRating - 6.4) * 13 +
    (moral - 50) * 0.16 +
    roleBonus +
    workloadBonus -
    fatiguePenalty;

  const starterChance = clampNumber(0.28 + (score / 125) + (clubRole === 'Star' ? 0.15 : clubRole === 'Titulaire' ? 0.05 : 0), 0.18, 0.94);

  return {
    score,
    starterChance,
    note:
      clubRole === 'Star' ? 'Cadre européen'
      : clubRole === 'Titulaire' ? 'Titulaire européen'
        : clubRole === 'Rotation' ? 'Rotation européenne'
          : 'Temps de jeu fragile',
  };
};

export const getEuropeanInterestClubs = (player, euroMatch) => {
  if (!player || !euroMatch) return [];
  const momentum = (euroMatch.matchRating ?? 0) + (euroMatch.goals ?? 0) * 1.4 + (euroMatch.assists ?? 0) * 1 + (euroMatch.isFinal ? 2.2 : 0);
  const score = momentum + (player.rating ?? 0) / 22;
  if (score < 12.5) return [];

  const tierMin = score >= 18 ? 1 : score >= 15 ? 2 : 3;
  const tierMax = euroMatch.competition === 'CL' ? 2 : euroMatch.competition === 'EL' ? 3 : 4;
  const clubs = CLUBS
    .filter((club) => club.name !== player.club)
    .filter((club) => club.tier >= tierMin && club.tier <= tierMax)
    .filter((club) => club.countryCode !== player.clubCountryCode || Math.random() < 0.4)
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

  const limit = euroMatch.competition === 'CL' || euroMatch.goals >= 2 || euroMatch.matchRating >= 8.5 ? 3 : 2;
  return clubs.slice(0, limit).map((club) => club.name);
};

/** Génère un adversaire fictif (club européen) pour le match */
const EURO_OPPONENTS = [
  { name: 'Bayern München', country: '🇩🇪' },
  { name: 'Real Madrid', country: '🇪🇸' },
  { name: 'Manchester City', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Paris SG', country: '🇫🇷' },
  { name: 'Inter Milan', country: '🇮🇹' },
  { name: 'Porto', country: '🇵🇹' },
  { name: 'Ajax Amsterdam', country: '🇳🇱' },
  { name: 'Atletico Madrid', country: '🇪🇸' },
  { name: 'Chelsea FC', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Juventus', country: '🇮🇹' },
  { name: 'Benfica', country: '🇵🇹' },
  { name: 'Dortmund', country: '🇩🇪' },
  { name: 'Marseille', country: '🇫🇷' },
  { name: 'Séville FC', country: '🇪🇸' },
  { name: 'AS Rome', country: '🇮🇹' },
  { name: 'Feyenoord', country: '🇳🇱' },
  { name: 'Galatasaray', country: '🇹🇷' },
  { name: 'Celtic FC', country: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { name: 'Shakhtar Donetsk', country: '🇺🇦' },
  { name: 'RB Leipzig', country: '🇩🇪' },
];

/**
 * Simule un match européen pour un joueur.
 * Retourne un objet match result compatible avec matchSystem.
 * Si un clubMatchContext est fourni, on réutilise l'affiche du club
 * pour que tous les joueurs du même club partagent le même match.
 */
export const simulateEuropeanMatch = (player, competition, seasonWeek, clubMatchContext = null) => {
  const stage = getEuropeanStage(seasonWeek, competition);
  const phase = getEuropeanPhaseLabel(seasonWeek, competition);
  const isFinal = stage === 'final';
  const isSF = stage === 'semis';
  const isQuarter = stage === 'quarters';
  const isPlayoff = stage === 'playoff';

  const sharedContext = clubMatchContext ?? {};
  const opponent = sharedContext.opponent ?? EURO_OPPONENTS[Math.floor(Math.random() * EURO_OPPONENTS.length)];
  const ownGoals = Number.isFinite(sharedContext.goalsFor)
    ? sharedContext.goalsFor
    : Math.max(0, Math.min(4, rand(0, 2)));
  const oppGoals = Number.isFinite(sharedContext.goalsAgainst)
    ? sharedContext.goalsAgainst
    : Math.max(0, Math.min(4, rand(0, 2)));
  const result = sharedContext.result ?? (ownGoals > oppGoals ? 'win' : ownGoals < oppGoals ? 'loss' : 'draw');
  const homeAway = sharedContext.homeAway ?? (Math.random() < 0.5 ? 'Domicile' : 'Extérieur');

  // Performance individuelle (logique simplifiée vs matchSystem)
  const injured = player.injured > 0;
  if (injured) return null; // ne joue pas

  const selection = getEuropeanSelectionProfile(player);
  const starts = Math.random() < selection.starterChance;
  const minutes = starts
    ? rand(selection.starterChance >= 0.8 ? 72 : selection.starterChance >= 0.66 ? 64 : 58, 90)
    : rand(0, selection.starterChance >= 0.45 ? 35 : 28);
  if (minutes === 0) return null;

  // Stats de jeu basées sur le rôle
  const profile = {
    ATT: { goalChance: 0.32, assistChance: 0.12 },
    MIL: { goalChance: 0.10, assistChance: 0.24 },
    DEF: { goalChance: 0.04, assistChance: 0.09 },
    GK: { goalChance: 0.001, assistChance: 0.005 },
  }[player.position] ?? { goalChance: 0.1, assistChance: 0.1 };

  const goals = ownGoals > 0 && Math.random() < profile.goalChance + player.rating / 700
    ? Math.min(ownGoals, rand(1, player.position === 'ATT' ? 3 : 1))
    : 0;
  const assists = ownGoals - goals > 0 && Math.random() < profile.assistChance ? 1 : 0;
  const keyPasses = sharedContext.keyPasses ?? (
    player.position === 'ATT' || player.position === 'MIL'
      ? rand(0, Math.max(0, minutes > 70 ? 5 : 3))
      : rand(0, 2)
  );

  // Note individuelle
  const baseRating = 6
    + goals * 0.9
    + assists * 0.55
    + (result === 'win' ? 0.4 : result === 'loss' ? -0.35 : 0)
    + (minutes < 35 ? -0.4 : 0)
    + rand(-6, 7) / 10;
  const matchRating = Number(Math.min(10, Math.max(4.5, baseRating)).toFixed(1));

  return {
    fixtureId: sharedContext.fixtureId ?? makeId('eu'),
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    club: player.club ?? 'Club',
    clubCountryCode: player.clubCountryCode ?? null,
    clubCity: player.clubCity ?? null,
    competition,
    competitionLabel: EURO_CUP_LABELS[competition]?.name ?? competition,
    phase,
    stage,
    isFinal,
    opponent: opponent.name,
    opponentName: opponent.name,
    opponentCountry: opponent.country,
    homeAway,
    score: `${ownGoals}-${oppGoals}`,
    goalsFor: ownGoals,
    goalsAgainst: oppGoals,
    result,
    minutes,
    goals,
    assists,
    keyPasses,
    matchRating,
    isKnockout: stage !== 'league',
    selectionStatus: starts ? 'titulaire' : 'remplaçant',
    selectionScore: Number(selection.score.toFixed(1)),
    starterChance: Number(selection.starterChance.toFixed(2)),
    selectionNote: selection.note,
    starter: starts,
    matchReport: `Note ${matchRating}/10 · ${goals} but${goals > 1 ? 's' : ''}${assists ? ` · ${assists} passe${assists > 1 ? 's' : ''}` : ''}${keyPasses ? ` · ${keyPasses} passes clés` : ''}`,
  };
};

/**
 * Génère les news / événements suite à un match européen.
 */
export const getEuropeanMatchNews = (player, euroMatch) => {
  if (!euroMatch || !euroMatch.matchRating) return null;
  const cup = EURO_CUP_LABELS[euroMatch.competition];
  const emoji = cup?.icon ?? '🏆';
  const shortCup = cup?.short ?? 'EUR';

  let text;
  if (euroMatch.goals >= 3) {
    text = `TRIPLÉ DE LÉGENDE ! ${player.firstName} ${player.lastName} marque 3 buts en ${shortCup} contre ${euroMatch.opponent} (${euroMatch.score}). Note ${euroMatch.matchRating}/10.`;
  } else if (euroMatch.goals >= 2) {
    text = `Doublé européen — ${player.firstName} ${player.lastName} marque 2 fois en ${shortCup} contre ${euroMatch.opponent} (${euroMatch.score}).`;
  } else if (euroMatch.goals >= 1) {
    text = `${player.firstName} ${player.lastName} marque en ${shortCup} contre ${euroMatch.opponent} (${euroMatch.score}). Note ${euroMatch.matchRating}/10.`;
  } else if (euroMatch.assists >= 1) {
    text = `Passe décisive de ${player.firstName} ${player.lastName} en ${shortCup} — ${euroMatch.opponent} (${euroMatch.score}).`;
  } else if (euroMatch.matchRating >= 8) {
    text = `Grande prestation de ${player.firstName} ${player.lastName} en ${shortCup} contre ${euroMatch.opponent} (${euroMatch.score}). Note ${euroMatch.matchRating}/10.`;
  } else if (euroMatch.isFinal) {
    text = `${player.firstName} ${player.lastName} joue la FINALE de ${shortCup} ! Son club affronte ${euroMatch.opponent} (${euroMatch.score}).`;
  } else {
    return null;
  }

  return {
    type: euroMatch.competition === 'CL' ? 'performance' : 'media',
    text: `${emoji} ${text}`,
    reputationImpact: euroMatch.goals >= 2 ? 3 : euroMatch.goals >= 1 ? 2 : euroMatch.matchRating >= 8 ? 2 : 1,
    valueImpact: euroMatch.goals >= 1 ? (euroMatch.competition === 'CL' ? 1.04 : 1.02) : 1.0,
  };
};

export const normalizeEuropeanMatch = (match = {}) => {
  const competition = match.competition ?? 'EL';
  const cup = EURO_CUP_LABELS[competition];
  return {
    ...match,
    playerName: match.playerName ?? 'Joueur',
    club: match.club ?? 'Club',
    competition,
    competitionLabel: match.competitionLabel ?? cup?.name ?? competition,
    phase: match.phase ?? match.stage ?? 'Phase européenne',
    stage: match.stage ?? 'league',
    opponent: match.opponent ?? match.opponentName ?? null,
    opponentName: match.opponentName ?? match.opponent ?? null,
    score: match.score ?? '0-0',
    matchRating: Number.isFinite(match.matchRating) ? match.matchRating : null,
    matchReport: match.matchReport ?? `Note ${match.matchRating ?? '—'}/10 · ${match.goals ?? 0} but${(match.goals ?? 0) > 1 ? 's' : ''}${(match.assists ?? 0) ? ` · ${match.assists} passe${(match.assists ?? 0) > 1 ? 's' : ''}` : ''}${(match.keyPasses ?? 0) ? ` · ${match.keyPasses} passes clés` : ''}`,
  };
};
