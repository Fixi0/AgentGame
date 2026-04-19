/**
 * europeanCupSystem.js
 * Gère les Coupes Européennes (Champions League, Europa League, Conference League)
 * en parallèle du championnat.
 *
 * Règles de qualification :
 *   CL    — clubs tier 1 des 5 grands championnats (FR,ES,EN,DE,IT,PT)
 *   EL    — clubs tier 2 des 5 grands / tier 1 des championnats secondaires
 *   ECL   — clubs tier 3 des 5 grands / tier 2 des championnats secondaires
 *
 * Calendrier (semaine de saison) :
 *   Phase de groupes CL  : semaines 3,5,7,9,11,13
 *   Huitièmes CL         : semaines 22,23
 *   Quarts CL            : semaines 25,26
 *   Demi-finales CL      : semaines 28,29
 *   Finale CL            : semaine 33
 *
 *   EL : décalé d'une semaine (4,6,8,10,12,14 … 24,25 … 27,28 … 32)
 *   ECL : semaines 5,7,9,11,13 … 25 … 30 … 31
 */

import { rand, makeId } from '../utils/helpers';

// Pays dont les clubs accèdent à la CL (top 5 + Portugal)
const TOP_LEAGUE_COUNTRIES = new Set(['FR', 'ES', 'EN', 'DE', 'IT', 'PT', 'NL']);

// Semaines de saison où se jouent les matchs européens par compétition
const CL_WEEKS = new Set([3, 5, 7, 9, 11, 13, 22, 23, 25, 26, 28, 29, 33]);
const EL_WEEKS = new Set([4, 6, 8, 10, 12, 14, 24, 25, 27, 28, 32]);
const ECL_WEEKS = new Set([5, 7, 9, 11, 13, 25, 30, 31]);

export const EURO_CUP_LABELS = {
  CL: { name: 'Ligue des Champions', short: 'UCL', color: '#1a1a6e', icon: '⭐' },
  EL: { name: 'Europa League', short: 'UEL', color: '#f97316', icon: '🟠' },
  ECL: { name: 'Conference League', short: 'ECL', color: '#16a34a', icon: '🟢' },
};

/**
 * Détermine la compétition européenne du club d'un joueur.
 * @returns 'CL' | 'EL' | 'ECL' | null
 */
export const getEuropeanCompetition = (player) => {
  const tier = player.clubTier ?? 4;
  const country = player.clubCountryCode ?? player.countryCode ?? '';
  const isTopLeague = TOP_LEAGUE_COUNTRIES.has(country);

  if (tier === 1 && isTopLeague) return 'CL';
  if ((tier === 2 && isTopLeague) || (tier === 1 && !isTopLeague)) return 'EL';
  if ((tier === 3 && isTopLeague) || (tier === 2 && !isTopLeague)) return 'ECL';
  return null;
};

/**
 * Détermine si cette semaine de saison est une semaine de match européen pour un joueur.
 */
export const isEuropeanMatchWeek = (seasonWeek, competition) => {
  if (!competition) return false;
  if (competition === 'CL') return CL_WEEKS.has(seasonWeek);
  if (competition === 'EL') return EL_WEEKS.has(seasonWeek);
  if (competition === 'ECL') return ECL_WEEKS.has(seasonWeek);
  return false;
};

/**
 * Retourne le nom de la phase selon la semaine de saison.
 */
export const getEuropeanPhaseLabel = (seasonWeek, competition) => {
  if (competition === 'CL') {
    if (seasonWeek <= 13) return 'Phase de groupes';
    if (seasonWeek <= 23) return '1/8 de finale';
    if (seasonWeek <= 26) return 'Quarts de finale';
    if (seasonWeek <= 29) return 'Demi-finales';
    return 'FINALE';
  }
  if (competition === 'EL') {
    if (seasonWeek <= 14) return 'Phase de groupes';
    if (seasonWeek <= 25) return '1/8 de finale';
    if (seasonWeek <= 28) return 'Quarts / Demies';
    return 'FINALE';
  }
  if (seasonWeek <= 13) return 'Phase de groupes';
  return 'Élimination';
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
  const phase = getEuropeanPhaseLabel(seasonWeek, competition);
  const isFinal = seasonWeek >= 33 && competition === 'CL';
  const isSF = seasonWeek >= 28 && seasonWeek <= 29 && competition === 'CL';

  // Qualité de l'adversaire — plus fort en phase finale
  const opponentStrength = isFinal ? rand(75, 88) : isSF ? rand(68, 80) : rand(55, 75);
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
