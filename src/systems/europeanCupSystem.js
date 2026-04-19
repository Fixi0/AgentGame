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

import { rand, makeId } from '../utils/helpers';

// Pays dont les clubs accèdent à la CL (top 5 + Portugal)
const TOP_LEAGUE_COUNTRIES = new Set(['FR', 'ES', 'EN', 'DE', 'IT', 'PT', 'NL']);

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

/**
 * Détermine la compétition européenne du club d'un joueur.
 * Probabiliste mais déterministe par club (hash du nom).
 *
 * Logique réaliste :
 *  - Tier 1 top-ligue  → ~55 % CL, ~30 % EL, ~15 % pas Europe
 *  - Tier 2 top-ligue  → ~30 % EL, ~25 % ECL, ~45 % pas Europe
 *  - Tier 1 autre ligue→ ~35 % EL, ~30 % ECL, ~35 % pas Europe
 *  - Tier 3 top-ligue  → ~20 % ECL, ~80 % pas Europe
 *  - Tier 2 autre ligue→ ~18 % ECL, ~82 % pas Europe
 *  - Autres            → pas Europe
 *
 * @returns 'CL' | 'EL' | 'ECL' | null
 */
export const getEuropeanCompetition = (player) => {
  const tier = player.clubTier ?? 4;
  const country = player.clubCountryCode ?? player.countryCode ?? '';
  const isTopLeague = TOP_LEAGUE_COUNTRIES.has(country);
  const h = clubQualHash(player.club ?? '');

  if (tier === 1 && isTopLeague) {
    if (h < 0.55) return 'CL';
    if (h < 0.85) return 'EL';
    return null;
  }
  if (tier === 2 && isTopLeague) {
    if (h < 0.30) return 'EL';
    if (h < 0.55) return 'ECL';
    return null;
  }
  if (tier === 1 && !isTopLeague) {
    if (h < 0.35) return 'EL';
    if (h < 0.65) return 'ECL';
    return null;
  }
  if (tier === 3 && isTopLeague) {
    if (h < 0.20) return 'ECL';
    return null;
  }
  if (tier === 2 && !isTopLeague) {
    if (h < 0.18) return 'ECL';
    return null;
  }
  return null;
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
 */
export const simulateEuropeanMatch = (player, competition, seasonWeek) => {
  const stage = getEuropeanStage(seasonWeek, competition);
  const phase = getEuropeanPhaseLabel(seasonWeek, competition);
  const isFinal = stage === 'final';
  const isSF = stage === 'semis';
  const isQuarter = stage === 'quarters';
  const isPlayoff = stage === 'playoff';

  // Qualité de l'adversaire — plus fort en phase finale
  const opponentStrength = isFinal
    ? rand(78, 92)
    : isSF
      ? rand(74, 88)
      : isQuarter
        ? rand(70, 84)
        : isPlayoff
          ? rand(64, 80)
          : rand(55, 75);
  const playerStrength = player.rating + (player.form - 60) / 5;
  const homeBonus = Math.random() < 0.5 ? 0.3 : 0;

  // Score brut
  const homeGoals = Math.max(0, Math.min(4, rand(0, 2) + (playerStrength > opponentStrength ? 1 : 0)));
  const awayGoals = Math.max(0, Math.min(4, rand(0, 2) + (opponentStrength > playerStrength ? 1 : 0)));
  const ownGoals = homeBonus > 0 ? homeGoals : awayGoals;
  const oppGoals = homeBonus > 0 ? awayGoals : homeGoals;

  // Performance individuelle (logique simplifiée vs matchSystem)
  const injured = player.injured > 0;
  if (injured) return null; // ne joue pas

  const starts = Math.random() < (player.clubRole === 'Star' ? 0.9 : player.clubRole === 'Titulaire' ? 0.75 : 0.45);
  const minutes = starts ? rand(65, 90) : rand(0, 35);
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

  const result = ownGoals > oppGoals ? 'win' : ownGoals < oppGoals ? 'loss' : 'draw';

  // Note individuelle
  const baseRating = 6
    + goals * 0.9
    + assists * 0.55
    + (result === 'win' ? 0.4 : result === 'loss' ? -0.35 : 0)
    + (minutes < 35 ? -0.4 : 0)
    + rand(-6, 7) / 10;
  const matchRating = Number(Math.min(10, Math.max(4.5, baseRating)).toFixed(1));

  const opponent = EURO_OPPONENTS[Math.floor(Math.random() * EURO_OPPONENTS.length)];

  return {
    fixtureId: makeId('eu'),
    playerId: player.id,
    competition,
    competitionLabel: EURO_CUP_LABELS[competition]?.name ?? competition,
    phase,
    stage,
    isFinal,
    opponent: opponent.name,
    opponentCountry: opponent.country,
    homeAway: homeBonus > 0 ? 'Domicile' : 'Extérieur',
    score: `${ownGoals}-${oppGoals}`,
    goalsFor: ownGoals,
    goalsAgainst: oppGoals,
    result,
    minutes,
    goals,
    assists,
    matchRating,
    isKnockout: stage !== 'league',
    selectionStatus: starts ? 'titulaire' : 'remplaçant',
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
