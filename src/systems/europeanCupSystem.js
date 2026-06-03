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
import { simulateMatch } from '../engine/matchEngine';
import { EUROPEAN_SCHEDULE } from './competitionCalendarSystem';

// Pays dont les clubs accèdent aux coupes UEFA (top leagues européennes + secondes nations)
const TOP_LEAGUE_COUNTRIES = new Set([
  'FR', 'ES', 'EN', 'GB', 'DE', 'IT', 'PT', 'NL',
  'BE', 'TR', 'SC', 'GR', 'AT', 'CH', 'CZ', 'DK', 'NO', 'SE',
]);

// ── Utilitaires de seed déterministe ──────────────────────────────────────────
/** FNV-1a hash 32-bit */
const hashStr = (str = '') => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
};
/** LCG suivant : retourne un nombre entier 32 bits non signé */
const lcgNext = (s) => (Math.imul(s, 1664525) + 1013904223) >>> 0;

// ── Format UEFA officiel : 36 équipes par compétition en phase de ligue ───────
// CL : 8 journées · EL : 8 journées · ECL : 6 journées
// Top 8 → 1/8 directs · 9-24 → barrages · 25-36 éliminés
const EURO_LEAGUE_PHASE_SIZE = 36;

// Construit la répartition des clubs entre CL/EL/ECL pour une saison donnée.
// Tri déterministe : tier croissant puis hash (club, saison). Les 36 meilleurs → CL,
// les 36 suivants → EL, les 36 suivants → ECL. Le reste : pas d'Europe.
const _participantsCache = new Map();
const _participantsOverrideBySeason = new Map();

export const registerEuropeanParticipantsFromLeagueTables = (season = 2, leagueTables = {}) => {
  if (!leagueTables || typeof leagueTables !== 'object') return;
  const slotOrder = [
    ['EN', 5], ['ES', 4], ['IT', 4], ['DE', 4], ['FR', 3],
    ['PT', 2], ['NL', 2], ['BE', 2], ['TR', 2], ['SC', 1], ['GR', 1], ['AT', 1], ['CH', 1], ['CZ', 1], ['DK', 1], ['NO', 1], ['SE', 1],
  ];
  const orderedQualifiers = [];
  slotOrder.forEach(([countryCode, slots]) => {
    const rows = Object.values(leagueTables[countryCode] ?? {})
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (((b.goalsFor ?? 0) - (b.goalsAgainst ?? 0)) - ((a.goalsFor ?? 0) - (a.goalsAgainst ?? 0))));
    rows.slice(0, slots).forEach((row) => {
      if (row?.club) orderedQualifiers.push(row.club);
    });
  });

  const fallback = CLUBS.filter((club) => TOP_LEAGUE_COUNTRIES.has(club.countryCode))
    .sort((a, b) => (a.tier ?? 4) - (b.tier ?? 4) || hashStr(`${a.name}:${season}:fallback`) - hashStr(`${b.name}:${season}:fallback`))
    .map((club) => club.name);
  const fullRanking = [...new Set([...orderedQualifiers, ...fallback])];
  const map = new Map();
  fullRanking.slice(0, EURO_LEAGUE_PHASE_SIZE).forEach((name) => map.set(name, 'CL'));
  fullRanking.slice(EURO_LEAGUE_PHASE_SIZE, EURO_LEAGUE_PHASE_SIZE * 2).forEach((name) => map.set(name, 'EL'));
  fullRanking.slice(EURO_LEAGUE_PHASE_SIZE * 2, EURO_LEAGUE_PHASE_SIZE * 3).forEach((name) => map.set(name, 'ECL'));
  _participantsOverrideBySeason.set(`s${season}`, map);
  _participantsCache.delete(`s${season}`);
};

export const getEuropeanParticipantsMap = (season = 1) => {
  const cacheKey = `s${season}`;
  if (_participantsCache.has(cacheKey)) return _participantsCache.get(cacheKey);
  if (_participantsOverrideBySeason.has(cacheKey)) {
    const override = _participantsOverrideBySeason.get(cacheKey);
    _participantsCache.set(cacheKey, override);
    return override;
  }

  const eligible = CLUBS.filter((c) => TOP_LEAGUE_COUNTRIES.has(c.countryCode));
  const ranked = [...eligible].sort((a, b) => {
    if ((a.tier ?? 4) !== (b.tier ?? 4)) return (a.tier ?? 4) - (b.tier ?? 4);
    const ha = hashStr(`${a.name}:${season}:euro-rank`);
    const hb = hashStr(`${b.name}:${season}:euro-rank`);
    return ha - hb;
  });

  const map = new Map();
  ranked.slice(0, EURO_LEAGUE_PHASE_SIZE).forEach((c) => map.set(c.name, 'CL'));
  ranked.slice(EURO_LEAGUE_PHASE_SIZE, EURO_LEAGUE_PHASE_SIZE * 2).forEach((c) => map.set(c.name, 'EL'));
  ranked.slice(EURO_LEAGUE_PHASE_SIZE * 2, EURO_LEAGUE_PHASE_SIZE * 3).forEach((c) => map.set(c.name, 'ECL'));

  _participantsCache.set(cacheKey, map);
  return map;
};

const getCompetitionPool = (competition, season = 1) => {
  const map = getEuropeanParticipantsMap(season);
  return CLUBS.filter((c) => map.get(c.name) === competition);
};

const EURO_SCHEDULE = Object.fromEntries(
  Object.entries(EUROPEAN_SCHEDULE).map(([competition, stages]) => [
    competition,
    Object.fromEntries(Object.entries(stages).map(([stage, weeks]) => [stage, new Set(weeks)])),
  ]),
);

export const EURO_CUP_LABELS = {
  CL: { name: 'Ligue des Champions', short: 'UCL', color: '#1a1a6e', icon: '⭐' },
  EL: { name: 'Europa League', short: 'UEL', color: '#f97316', icon: '🟠' },
  ECL: { name: 'Conference League', short: 'ECL', color: '#16a34a', icon: '🟢' },
  CWC: { name: 'Mondial des Clubs', short: 'CWC', color: '#f5c842', icon: '🌍' },
};

// Compétitions hors-championnat / hors-coupe européenne classique
export const EXTRA_TOURNAMENT_WEEKS = {
  CWC: new Set([35, 36, 37]),     // Mondial des Clubs — fin de saison (groupe → finale)
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
  if (!club?.name) return null;
  const map = getEuropeanParticipantsMap(season);
  return map.get(club.name) ?? null;
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

const getStageWeeks = (competition, stage) =>
  Array.from(EURO_SCHEDULE[competition]?.[stage] ?? []).sort((a, b) => a - b);

export const isEuropeanStageDecider = (seasonWeek, competition, stage = getEuropeanStage(seasonWeek, competition)) => {
  const weeks = getStageWeeks(competition, stage);
  if (!weeks.length) return false;
  return seasonWeek === weeks[weeks.length - 1];
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

const buildVirtualSquad = (ratingBase = 72, code = 'TEAM') =>
  Array.from({ length: 11 }, (_x, idx) => ({
    id: `${code}_${idx + 1}`,
    rating: ratingBase + ((idx % 5) - 2),
    form: 62,
    attributes: { shooting: { current: 10 }, passing: { current: 10 } },
    roleId: idx <= 1 ? 'center_back' : idx <= 4 ? 'central_mid' : 'striker',
    position: idx === 0 ? 'GK' : idx <= 4 ? 'DEF' : idx <= 7 ? 'MIL' : 'ATT',
  }));

const scoreFromUnifiedMatchEngine = (player, competition, seasonWeek, opponentName = 'Club Européen', seedSalt = '') => {
  const generationalBonus = player?.superstarGenerational || (player?.rating ?? 0) >= 198;
  const ownBase = Math.max(68, Math.min(generationalBonus ? 112 : 102, (player.rating ?? 140) * 0.44 + ((player.form ?? 60) - 60) * 0.12 + 11 + (generationalBonus ? 8 : 0)));
  const opponentPower = getClubPower(opponentName, competition, Math.floor((seasonWeek - 1) / 38) + 1);
  const oppBase = Math.max(68, Math.min(102, 60 + opponentPower * 0.23 + ((hashStr(`${opponentName}:${competition}:${seasonWeek}:${seedSalt}`) % 7) - 3)));
  const simulation = simulateMatch({
    homePlayers: buildVirtualSquad(ownBase, `${player.club ?? 'HOME'}_${competition}_${seasonWeek}_${seedSalt}`),
    awayPlayers: buildVirtualSquad(oppBase, `${opponentName}_${competition}_${seasonWeek}_${seedSalt}`),
    homeTeamName: player.club ?? 'Club',
    awayTeamName: opponentName,
    seed: hashStr(`${seedSalt}:${player.id}:${competition}:${seasonWeek}:${opponentName}:eu`),
  });
  return { ownGoals: simulation.homeGoals, oppGoals: simulation.awayGoals };
};

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
  const generationalBonus = player.superstarGenerational || (player.rating ?? 0) >= 198;
  const workloadBonus = appearances >= 24 ? 4 : appearances >= 16 ? 2 : appearances >= 8 ? 1 : -1;
  const fatiguePenalty = (player.fatigue ?? 20) > 80 ? 5 : (player.fatigue ?? 20) > 70 ? 2 : 0;
  const score =
    (player.rating - 60) * 1.15 +
    (recentForm - 50) * 0.42 +
    (avgRating - 6.4) * 13 +
    (moral - 50) * 0.16 +
    roleBonus +
    (generationalBonus ? 22 : 0) +
    workloadBonus -
    fatiguePenalty;

  const starterChance = clampNumber(0.28 + (score / 125) + (clubRole === 'Star' ? 0.15 : clubRole === 'Titulaire' ? 0.05 : 0) + (generationalBonus ? 0.08 : 0), 0.18, generationalBonus ? 0.995 : 0.94);

  return {
    score,
    starterChance,
    note:
      generationalBonus ? 'Leader européen'
      : clubRole === 'Star' ? 'Cadre européen'
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

/** Mapping code pays → drapeau */
const FLAG_MAP = {
  FR: '🇫🇷', ES: '🇪🇸', GB: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', EN: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  DE: '🇩🇪', IT: '🇮🇹', NL: '🇳🇱', PT: '🇵🇹',
  BR: '🇧🇷', AR: '🇦🇷', TR: '🇹🇷', UA: '🇺🇦',
};

/**
 * Retourne l'index de journée de ligue (0–7) pour une semaine de saison.
 * Retourne -1 si ce n'est pas une journée de ligue.
 */
export const getEuropeanMatchdayIndex = (seasonWeek, competition) => {
  const league = Array.from(EURO_SCHEDULE[competition]?.league ?? []).sort((a, b) => a - b);
  return league.indexOf(seasonWeek);
};

/**
 * Sélectionne un adversaire européen DÉTERMINISTE basé sur club + compétition + saison + journée.
 * Filtre les adversaires déjà affrontés (phase de ligue).
 */
export const pickSeededOpponent = (clubName, competition, matchdayIdx, season, usedOpponents = []) => {
  const pool = getCompetitionPool(competition, season);
  const candidates = pool.filter((c) => c.name !== clubName && !usedOpponents.includes(c.name));
  const source = candidates.length ? candidates : pool.filter((c) => c.name !== clubName);
  if (!source.length) return { name: 'Club Européen', country: '🌍' };
  const seed = hashStr(`${clubName}:${competition}:${season}:md${matchdayIdx}`);
  const club = source[seed % source.length];
  return { name: club.name, country: FLAG_MAP[club.countryCode] ?? '🌍' };
};

/**
 * Génère les 16 clubs participants au bracket KO d'une compétition/saison.
 * Les clubs agents sont toujours inclus.
 */
export const generateKOBracketClubs = (competition, season, agentClubNames = []) => {
  const pool = getCompetitionPool(competition, season);
  const agentSet = new Set(agentClubNames);
  let seed = hashStr(`${competition}:${season}:bracket`);

  const result = [];
  // D'abord les clubs agents
  for (const name of agentClubNames) {
    const ref = pool.find((c) => c.name === name);
    result.push({ name, country: FLAG_MAP[ref?.countryCode] ?? '🌍', isAgent: true });
  }
  // Remplir avec le reste du pool
  const candidates = pool.filter((c) => !agentSet.has(c.name));
  while (result.length < 16 && candidates.length) {
    seed = lcgNext(seed);
    const idx = seed % candidates.length;
    const club = candidates.splice(idx, 1)[0];
    result.push({ name: club.name, country: FLAG_MAP[club.countryCode] ?? '🌍', isAgent: false });
  }
  return result;
};

/**
 * Initialise la structure EuroCup data pour une compétition/saison.
 */
export const initEuroCupCompData = (competition, season) => ({
  competition,
  season,
  opponentHistory: {}, // clubName → string[] (noms des adversaires en phase de ligue)
  koPath: {},          // clubName → { playoff|roundOf16|quarters|semis|final: {opponent, score, result, opponentCountry} }
  leagueTable: null,   // 36 clubs classés : 1-8 qualifiés, 9-24 barrages, 25-36 éliminés
  leagueFixtures: null, // source unique des affiches/résultats de phase de ligue
  fixtures: {},         // fixtureId → match canonique, toutes phases confondues
  bracketClubs: null,  // généré à l'entrée en KO
  bracketState: null,  // { activeClubs, eliminatedClubs, rounds, stageEntrants }
});

const getClubRef = (clubName) => CLUBS.find((club) => club.name === clubName) ?? { name: clubName, tier: 3, countryCode: null };

const slugFixturePart = (value = '') =>
  String(value || 'club')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

export const makeEuropeanFixtureId = ({
  competition,
  season = 1,
  stage = 'league',
  matchdayIndex = -1,
  week = null,
  leg = 1,
  home = '',
  away = '',
} = {}) =>
  [
    'euro',
    competition,
    `s${season}`,
    stage,
    matchdayIndex >= 0 ? `md${matchdayIndex}` : `w${week ?? 'x'}`,
    `leg${leg}`,
    slugFixturePart(home),
    slugFixturePart(away),
  ].join('_');

const canonicalFixtureResultForClub = (fixture = {}, clubName = '') => {
  if (!fixture || !clubName || (fixture.home !== clubName && fixture.away !== clubName)) return null;
  const isHome = fixture.home === clubName;
  const goalsFor = isHome ? Number(fixture.homeGoals ?? 0) : Number(fixture.awayGoals ?? 0);
  const goalsAgainst = isHome ? Number(fixture.awayGoals ?? 0) : Number(fixture.homeGoals ?? 0);
  return {
    fixtureId: fixture.id ?? fixture.fixtureId,
    competition: fixture.competition,
    week: fixture.week,
    simulatedWeek: fixture.simulatedWeek ?? fixture.week,
    simulatedDay: fixture.simulatedDay ?? null,
    matchdayIndex: fixture.matchdayIndex,
    stage: fixture.stage,
    phase: fixture.phase,
    opponent: isHome ? fixture.away : fixture.home,
    opponentName: isHome ? fixture.away : fixture.home,
    opponentCountry: isHome ? fixture.awayCountry : fixture.homeCountry,
    homeAway: isHome ? 'Domicile' : 'Extérieur',
    score: `${goalsFor}-${goalsAgainst}`,
    fixtureScore: `${fixture.homeGoals ?? 0}-${fixture.awayGoals ?? 0}`,
    goalsFor,
    goalsAgainst,
    result: goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw',
    source: 'canonical',
    aggregate: fixture.aggregate ?? null,
    qualified: fixture.winner ? fixture.winner === clubName : null,
    decidedByPenalties: Boolean(fixture.decidedByPenalties),
  };
};

export const getEuropeanFixtureList = (compData = {}) => {
  const fromStore = Object.values(compData?.fixtures ?? {});
  const fromLeague = Array.isArray(compData?.leagueFixtures) ? compData.leagueFixtures : [];
  const fromRounds = Object.values(compData?.bracketState?.rounds ?? {})
    .flatMap((round) => (round?.matches ?? []).map((match) => ({
      ...match,
      id: match.id ?? match.fixtureId,
      competition: compData.competition ?? match.competition,
      season: compData.season ?? match.season,
      stage: match.stage ?? round.stage,
      week: match.week ?? round.week,
      leg: match.leg ?? round.leg,
      matchdayIndex: Number.isFinite(match.matchdayIndex) ? match.matchdayIndex : -1,
    })));
  const byId = new Map();
  [...fromLeague, ...fromRounds, ...fromStore].forEach((fixture) => {
    const id = fixture?.id ?? fixture?.fixtureId;
    if (id) byId.set(id, { ...fixture, id });
  });
  return [...byId.values()];
};

export const getEuropeanClubFixtureResult = (compData = {}, clubName = '', fixtureId = null) => {
  const fixtures = getEuropeanFixtureList(compData);
  const fixture = fixtureId
    ? fixtures.find((item) => (item.id ?? item.fixtureId) === fixtureId)
    : fixtures.find((item) => item.home === clubName || item.away === clubName);
  return canonicalFixtureResultForClub(fixture, clubName);
};

const putCanonicalFixture = (data, fixture) => {
  if (!fixture?.id && !fixture?.fixtureId) return data;
  const id = fixture.id ?? fixture.fixtureId;
  data.fixtures = { ...(data.fixtures ?? {}), [id]: { ...fixture, id, fixtureId: id } };
  return data;
};

const EURO_CLUB_POWER_OVERRIDES = {
  'Real Madrid': 178,
  'Man City': 178,
  Bayern: 176,
  PSG: 174,
  Liverpool: 172,
  Barcelona: 170,
  Arsenal: 168,
  Inter: 168,
  Atletico: 165,
  Leverkusen: 164,
  Dortmund: 162,
  Milan: 158,
  Juventus: 158,
  Napoli: 156,
  Marseille: 154,
  Monaco: 154,
  'Man United': 152,
};

const getClubPower = (clubName, competition, season) => {
  if (EURO_CLUB_POWER_OVERRIDES[clubName]) {
    const competitionBonus = competition === 'CL' ? 8 : competition === 'EL' ? 4 : 0;
    return EURO_CLUB_POWER_OVERRIDES[clubName] + competitionBonus;
  }
  const club = getClubRef(clubName);
  const base = 100 - (club.tier ?? 3) * 10;
  const competitionBonus = competition === 'CL' ? 8 : competition === 'EL' ? 4 : 0;
  return base + competitionBonus + (hashStr(`${clubName}:${competition}:${season}:power`) % 18);
};

const buildClubVirtualSquad = (ratingBase = 74, code = 'EUCLUB') =>
  Array.from({ length: 11 }, (_x, idx) => ({
    id: `${code}_${idx + 1}`,
    rating: ratingBase + ((idx % 5) - 2),
    form: 64,
    attributes: { shooting: { current: 10 }, passing: { current: 10 } },
    roleId: idx <= 1 ? 'center_back' : idx <= 4 ? 'central_mid' : 'striker',
    position: idx === 0 ? 'GK' : idx <= 4 ? 'DEF' : idx <= 7 ? 'MIL' : 'ATT',
  }));

const simulateClubFixtureWithUnifiedEngine = (homeClubName, awayClubName, competition, season, tag = 'league') => {
  const homePower = getClubPower(homeClubName, competition, season);
  const awayPower = getClubPower(awayClubName, competition, season);
  const homeBase = Math.max(66, Math.min(91, 62 + Math.round(homePower * 0.23)));
  const awayBase = Math.max(66, Math.min(91, 62 + Math.round(awayPower * 0.23)));
  const simulation = simulateMatch({
    homePlayers: buildClubVirtualSquad(homeBase, `${homeClubName}_${competition}_${season}_h_${tag}`),
    awayPlayers: buildClubVirtualSquad(awayBase, `${awayClubName}_${competition}_${season}_a_${tag}`),
    homeTeamName: homeClubName,
    awayTeamName: awayClubName,
    seed: hashStr(`${homeClubName}:${awayClubName}:${competition}:${season}:${tag}`),
  });
  return { homeGoals: simulation.homeGoals, awayGoals: simulation.awayGoals };
};

const makeClubEntry = (club) => {
  if (typeof club === 'string') {
    const ref = getClubRef(club);
    return { name: club, country: FLAG_MAP[ref.countryCode] ?? '🌍', isAgent: false };
  }
  return {
    name: club.name,
    country: club.country ?? FLAG_MAP[getClubRef(club.name).countryCode] ?? '🌍',
    isAgent: Boolean(club.isAgent),
    rank: club.rank,
    uefaSeed: club.uefaSeed,
  };
};

const getRoundPairs = (activeClubs = []) => {
  const clubs = activeClubs.map(makeClubEntry).filter((club) => club.name);
  const pairs = [];
  for (let index = 0; index < clubs.length; index += 2) {
    if (clubs[index + 1]) pairs.push([clubs[index], clubs[index + 1]]);
  }
  return pairs;
};

const EURO_KO_STAGE_ORDER = ['playoff', 'roundOf16', 'quarters', 'semis', 'final'];
const EURO_PREVIOUS_STAGE = {
  roundOf16: 'playoff',
  quarters: 'roundOf16',
  semis: 'quarters',
  final: 'semis',
};
const EURO_EXPECTED_STAGE_MATCHES = {
  playoff: 8,
  roundOf16: 8,
  quarters: 4,
  semis: 2,
  final: 1,
};

const getExpectedStageMatches = (stage) => EURO_EXPECTED_STAGE_MATCHES[stage] ?? 0;

const uniqueClubEntries = (clubs = []) => {
  const seen = new Set();
  return clubs
    .map(makeClubEntry)
    .filter((club) => {
      if (!club.name || seen.has(club.name)) return false;
      seen.add(club.name);
      return true;
    });
};

const rebuildKnockoutProgressFromRounds = (bracketState = {}) => {
  const rounds = bracketState.rounds ?? {};
  const nextStageWinners = {};
  const eliminated = new Set(bracketState.eliminatedClubs ?? []);

  EURO_KO_STAGE_ORDER.forEach((stage) => {
    const stageRounds = Object.values(rounds)
      .filter((round) => round?.stage === stage)
      .sort((a, b) => (a.week ?? 0) - (b.week ?? 0) || (a.leg ?? 0) - (b.leg ?? 0));
    const decider = [...stageRounds].reverse().find((round) => round?.isDecider);
    if (!decider) return;
    const expectedMatches = EURO_EXPECTED_STAGE_MATCHES[stage] ?? 0;
    if (expectedMatches && (decider.matches ?? []).length < expectedMatches) return;
    const winners = [];
    (decider.matches ?? []).forEach((match) => {
      if (match?.winner) winners.push(makeClubEntry(match.winner));
      if (match?.loser) eliminated.add(match.loser);
    });
    if (winners.length) nextStageWinners[stage] = uniqueClubEntries(winners);
  });

  return {
    stageWinners: nextStageWinners,
    eliminatedClubs: [...eliminated],
  };
};

const sameRoundPairs = (leftMatches = [], rightMatches = []) => {
  const makePairSet = (matches) => new Set((matches ?? []).map((match) =>
    [match.home, match.away].filter(Boolean).sort().join('|')));
  const left = makePairSet(leftMatches);
  const right = makePairSet(rightMatches);
  if (left.size !== right.size) return false;
  return [...left].every((pair) => right.has(pair));
};

const isRoundShapeValid = (round = {}) => {
  const matches = round?.matches ?? [];
  const expected = getExpectedStageMatches(round?.stage);
  if (expected && matches.length < expected) return false;
  const usedClubs = new Set();
  return matches.every((match) => {
    if (!match?.home || !match?.away || match.home === match.away) return false;
    const pair = [match.home, match.away].sort().join('|');
    if (usedClubs.has(match.home) || usedClubs.has(match.away) || usedClubs.has(pair)) return false;
    usedClubs.add(match.home);
    usedClubs.add(match.away);
    usedClubs.add(pair);
    return true;
  });
};

const sanitizeKnockoutRounds = (rounds = {}) => {
  const cleanRounds = {};
  const cleanStageWinners = {};
  const cleanEliminated = new Set();
  let previousStageComplete = true;

  EURO_KO_STAGE_ORDER.forEach((stage) => {
    if (!previousStageComplete) return;
    const stageRounds = Object.entries(rounds)
      .map(([key, round]) => ({ key, round: { ...round, stage: round?.stage ?? stage } }))
      .filter(({ round }) => round.stage === stage)
      .sort((a, b) => (a.round.week ?? 0) - (b.round.week ?? 0) || (a.round.leg ?? 0) - (b.round.leg ?? 0));

    if (!stageRounds.length) {
      previousStageComplete = false;
      return;
    }

    const validRounds = [];
    const firstLeg = stageRounds.find(({ round }) => (round.leg ?? 1) === 1)?.round ?? null;
    for (const { key, round } of stageRounds) {
      if (!isRoundShapeValid(round)) continue;
      if ((round.leg ?? 1) > 1 && firstLeg && !sameRoundPairs(firstLeg.matches, round.matches)) continue;
      validRounds.push({ key, round });
    }

    if (!validRounds.length) {
      previousStageComplete = false;
      return;
    }

    validRounds.forEach(({ key, round }) => {
      const normalizedKey = `${round.stage}:${round.week ?? key.split(':')[1] ?? key}`;
      cleanRounds[normalizedKey] = round;
    });

    const decider = [...validRounds].reverse().find(({ round }) => round.isDecider)?.round ?? null;
    if (!decider) {
      previousStageComplete = false;
      return;
    }

    const winners = [];
    (decider.matches ?? []).forEach((match) => {
      if (match.winner) winners.push(makeClubEntry(match.winner));
      if (match.loser) cleanEliminated.add(match.loser);
    });
    const expected = getExpectedStageMatches(stage);
    if (expected && winners.length < expected) {
      previousStageComplete = false;
      return;
    }
    cleanStageWinners[stage] = uniqueClubEntries(winners);
  });

  return {
    rounds: cleanRounds,
    stageWinners: cleanStageWinners,
    eliminatedClubs: [...cleanEliminated],
  };
};

const syncCanonicalFixtures = (data = {}) => {
  const fixtures = {};
  const put = (fixture) => {
    const id = fixture?.id ?? fixture?.fixtureId;
    if (!id) return;
    fixtures[id] = { ...fixture, id, fixtureId: id };
  };
  (data.leagueFixtures ?? []).forEach(put);
  Object.values(data.bracketState?.rounds ?? {}).forEach((round) => {
    (round?.matches ?? []).forEach((match) => put({
      ...match,
      competition: data.competition ?? match.competition,
      season: data.season ?? match.season,
      stage: match.stage ?? round.stage,
      week: match.week ?? round.week,
      leg: match.leg ?? round.leg,
      matchdayIndex: -1,
    }));
  });
  data.fixtures = fixtures;
  return data;
};

const getCountryForClub = (clubName) => FLAG_MAP[getClubRef(clubName).countryCode] ?? '🌍';

const buildEuropeanLeagueFixtures = (competition, season, agentClubNames = []) => {
  const pool = getCompetitionPool(competition, season);
  const agentSet = new Set(agentClubNames.filter(Boolean));
  const entriesByName = new Map();

  pool.forEach((club) => {
    entriesByName.set(club.name, {
      name: club.name,
      country: FLAG_MAP[club.countryCode] ?? '🌍',
      isAgent: agentSet.has(club.name),
      power: getClubPower(club.name, competition, season),
    });
  });

  agentSet.forEach((clubName) => {
    if (!entriesByName.has(clubName)) {
      entriesByName.set(clubName, {
        name: clubName,
        country: getCountryForClub(clubName),
        isAgent: true,
        power: getClubPower(clubName, competition, season),
      });
    }
  });

  const seededEntries = [...entriesByName.values()]
    .sort((a, b) =>
      b.power - a.power
      || hashStr(`${a.name}:${competition}:${season}:league-seed`) - hashStr(`${b.name}:${competition}:${season}:league-seed`),
    )
    .slice(0, EURO_LEAGUE_PHASE_SIZE)
    .map((club, index) => ({ ...club, uefaSeed: index + 1, opponents: new Set() }));

  const targetMatchdays = competition === 'ECL' ? 6 : 8;
  const rotation = [...seededEntries].sort((a, b) =>
    hashStr(`${a.name}:${competition}:${season}:rotation`)
    - hashStr(`${b.name}:${competition}:${season}:rotation`));

  const roundRobinFixtures = [];
  for (let matchdayIndex = 0; matchdayIndex < targetMatchdays; matchdayIndex += 1) {
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[rotation.length - 1 - index];
      if (!left || !right || left.name === right.name) continue;
      const homeSeed = hashStr(`${left.name}:${right.name}:${competition}:${season}:venue:md${matchdayIndex}`);
      const homeEntry = homeSeed % 2 === 0 ? left : right;
      const awayEntry = homeEntry === left ? right : left;
      const score = simulateClubFixtureWithUnifiedEngine(homeEntry.name, awayEntry.name, competition, season, `league_md_${matchdayIndex}_${index}`);
      const id = makeEuropeanFixtureId({
        competition,
        season,
        stage: 'league',
        matchdayIndex,
        leg: 1,
        home: homeEntry.name,
        away: awayEntry.name,
      });
      roundRobinFixtures.push({
        id,
        fixtureId: id,
        competition,
        season,
        stage: 'league',
        phase: 'Phase de ligue',
        matchdayIndex,
        week: null,
        leg: 1,
        home: homeEntry.name,
        away: awayEntry.name,
        homeCountry: homeEntry.country,
        awayCountry: awayEntry.country,
        homeGoals: score.homeGoals,
        awayGoals: score.awayGoals,
        score: `${score.homeGoals}-${score.awayGoals}`,
        simulated: true,
        source: 'canonical_league',
      });
    }
    const fixed = rotation[0];
    const tail = rotation.slice(1);
    tail.unshift(tail.pop());
    rotation.splice(0, rotation.length, fixed, ...tail);
  }

  return roundRobinFixtures.sort((a, b) => a.matchdayIndex - b.matchdayIndex || a.home.localeCompare(b.home));
};

const ensureLeagueFixtures = (data, competition, season, agentClubNames = []) => {
  if (Array.isArray(data.leagueFixtures) && data.leagueFixtures.length) {
    data.leagueFixtures.forEach((fixture) => putCanonicalFixture(data, fixture));
    return data.leagueFixtures;
  }
  data.leagueFixtures = buildEuropeanLeagueFixtures(competition, season, agentClubNames);
  data.leagueFixtures.forEach((fixture) => putCanonicalFixture(data, fixture));
  return data.leagueFixtures;
};

export const ensureEuropeanLeagueFixtures = (compData, competition, season, agentClubNames = []) => {
  const data = {
    ...initEuroCupCompData(competition, season),
    ...(compData ?? {}),
    opponentHistory: { ...(compData?.opponentHistory ?? {}) },
    koPath: { ...(compData?.koPath ?? {}) },
    fixtures: { ...(compData?.fixtures ?? {}) },
  };
  ensureLeagueFixtures(data, competition, season, agentClubNames);
  return data;
};

export const getEuropeanLeagueClubMatch = (compData, clubName, competition, season, seasonWeek, agentClubNames = []) => {
  const matchdayIndex = getEuropeanMatchdayIndex(seasonWeek, competition);
  if (matchdayIndex < 0) return null;
  const data = ensureEuropeanLeagueFixtures(compData, competition, season, agentClubNames);
  const fixture = (data.leagueFixtures ?? []).find((item) =>
    item.matchdayIndex === matchdayIndex && (item.home === clubName || item.away === clubName));
  return canonicalFixtureResultForClub(fixture, clubName);
};

const buildLeagueTable = (competition, season, agentClubNames = []) => {
  const pool = getCompetitionPool(competition, season);
  const agentSet = new Set(agentClubNames.filter(Boolean));
  const entriesByName = new Map();

  pool.forEach((club) => {
    entriesByName.set(club.name, {
      name: club.name,
      country: FLAG_MAP[club.countryCode] ?? '🌍',
      isAgent: agentSet.has(club.name),
      power: getClubPower(club.name, competition, season),
    });
  });

  // Compatibilité avec d'anciennes sauvegardes : si un club agent a déjà une coupe
  // mais n'est pas dans le pool courant, on l'ajoute sans casser la partie.
  agentSet.forEach((clubName) => {
    if (!entriesByName.has(clubName)) {
      entriesByName.set(clubName, {
        name: clubName,
        country: getCountryForClub(clubName),
        isAgent: true,
        power: getClubPower(clubName, competition, season),
      });
    }
  });

  const seededEntries = [...entriesByName.values()]
    .sort((a, b) => {
      if (b.power !== a.power) return b.power - a.power;
      return hashStr(`${a.name}:${competition}:${season}:league-seed`) - hashStr(`${b.name}:${competition}:${season}:league-seed`);
    })
    .slice(0, EURO_LEAGUE_PHASE_SIZE)
    .map((club, index) => ({
      ...club,
      uefaSeed: index + 1,
      points: 0,
      played: 0,
      win: 0,
      draw: 0,
      loss: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      awayGoalsFor: 0,
      awayWins: 0,
      opponents: new Set(),
    }));

  // Pots UEFA: 4 pots de 9 clubs
  const pots = [
    seededEntries.slice(0, 9),
    seededEntries.slice(9, 18),
    seededEntries.slice(18, 27),
    seededEntries.slice(27, 36),
  ];
  const byName = new Map(seededEntries.map((entry) => [entry.name, entry]));
  const schedulePairs = [];

  const pickOpponentsFromPot = (club, potEntries, needed, tagSeed) => {
    const candidates = potEntries
      .filter((entry) => entry.name !== club.name)
      .filter((entry) => !club.opponents.has(entry.name));
    const ranked = [...candidates].sort((a, b) =>
      hashStr(`${club.name}:${a.name}:${competition}:${season}:${tagSeed}`)
      - hashStr(`${club.name}:${b.name}:${competition}:${season}:${tagSeed}`),
    );
    return ranked.slice(0, Math.min(needed, ranked.length));
  };

  seededEntries.forEach((club) => {
    pots.forEach((potEntries, potIndex) => {
      const picked = pickOpponentsFromPot(club, potEntries, 2, `pot_${potIndex + 1}`);
      picked.forEach((opponent, idx) => {
        const pairKey = [club.name, opponent.name].sort().join('|');
        if (schedulePairs.some((pair) => pair.key === pairKey)) return;
        const homeSeed = hashStr(`${club.name}:${opponent.name}:${competition}:${season}:venue:${idx}`);
        const homeClub = homeSeed % 2 === 0 ? club.name : opponent.name;
        const awayClub = homeClub === club.name ? opponent.name : club.name;
        schedulePairs.push({ key: pairKey, homeClub, awayClub });
        club.opponents.add(opponent.name);
        opponent.opponents.add(club.name);
      });
    });
  });

  const targetMatchesPerClub = competition === 'ECL' ? 6 : 8;
  const countMatchesFor = (clubName) =>
    schedulePairs.reduce((count, pair) => count + (pair.homeClub === clubName || pair.awayClub === clubName ? 1 : 0), 0);
  const hasPair = (clubA, clubB) => schedulePairs.some((pair) => pair.key === [clubA, clubB].sort().join('|'));
  const ensurePair = (clubA, clubB, tag = 'fill') => {
    if (clubA === clubB || hasPair(clubA, clubB)) return false;
    if (countMatchesFor(clubA) >= targetMatchesPerClub || countMatchesFor(clubB) >= targetMatchesPerClub) return false;
    const homeSeed = hashStr(`${clubA}:${clubB}:${competition}:${season}:venue:${tag}`);
    const homeClub = homeSeed % 2 === 0 ? clubA : clubB;
    const awayClub = homeClub === clubA ? clubB : clubA;
    schedulePairs.push({ key: [clubA, clubB].sort().join('|'), homeClub, awayClub });
    return true;
  };

  const orderedForFill = [...seededEntries].sort((a, b) => a.uefaSeed - b.uefaSeed);
  for (const club of orderedForFill) {
    let guard = 0;
    while (countMatchesFor(club.name) < targetMatchesPerClub && guard < 400) {
      guard += 1;
      const candidate = orderedForFill.find((entry) =>
        entry.name !== club.name
        && countMatchesFor(entry.name) < targetMatchesPerClub
        && !hasPair(club.name, entry.name),
      );
      if (!candidate) break;
      ensurePair(club.name, candidate.name, `fill_${guard}`);
    }
  }

  schedulePairs.forEach((fixture, idx) => {
    const result = simulateClubFixtureWithUnifiedEngine(fixture.homeClub, fixture.awayClub, competition, season, `league_${idx}`);
    const home = byName.get(fixture.homeClub);
    const away = byName.get(fixture.awayClub);
    if (!home || !away) return;
    home.played += 1;
    away.played += 1;
    home.goalsFor += result.homeGoals;
    home.goalsAgainst += result.awayGoals;
    away.goalsFor += result.awayGoals;
    away.goalsAgainst += result.homeGoals;
    away.awayGoalsFor += result.awayGoals;

    if (result.homeGoals > result.awayGoals) {
      home.win += 1;
      away.loss += 1;
      home.points += 3;
    } else if (result.homeGoals < result.awayGoals) {
      away.win += 1;
      away.awayWins += 1;
      home.loss += 1;
      away.points += 3;
    } else {
      home.draw += 1;
      away.draw += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  const ranked = seededEntries.sort((a, b) =>
    b.points - a.points
    || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
    || b.goalsFor - a.goalsFor
    || b.awayGoalsFor - a.awayGoalsFor
    || b.win - a.win
    || b.awayWins - a.awayWins
    || a.name.localeCompare(b.name),
  );

  return ranked.map((club, index) => ({
    ...club,
    rank: index + 1,
    leagueStatus: index < 8 ? 'roundOf16' : index < 24 ? 'playoff' : 'eliminated',
  }));
};

const getCompletedLeagueMatchdays = (seasonWeek, competition, includeCurrentMatchday = true) => {
  const weeks = Array.from(EURO_SCHEDULE[competition]?.league ?? []).sort((a, b) => a - b);
  return weeks.filter((week) => week < seasonWeek || (includeCurrentMatchday && week === seasonWeek)).length;
};

const parseFixtureScore = (score = '0-0') => {
  const match = String(score).match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return { homeGoals: 0, awayGoals: 0 };
  return { homeGoals: Number(match[1] ?? 0), awayGoals: Number(match[2] ?? 0) };
};

const resolveClubScoreFromMatch = (match = {}) => {
  if (Number.isFinite(match.goalsFor) && Number.isFinite(match.goalsAgainst)) {
    return { goalsFor: Number(match.goalsFor), goalsAgainst: Number(match.goalsAgainst) };
  }
  const { homeGoals, awayGoals } = parseFixtureScore(match.score);
  const result = match.result;
  if (result === 'win' && homeGoals < awayGoals) return { goalsFor: awayGoals, goalsAgainst: homeGoals };
  if (result === 'loss' && homeGoals > awayGoals) return { goalsFor: awayGoals, goalsAgainst: homeGoals };
  return { goalsFor: homeGoals, goalsAgainst: awayGoals };
};

const emptySnapshotRow = (club, agentSet = new Set()) => ({
  club,
  name: club.name,
  country: FLAG_MAP[club.countryCode] ?? '🌍',
  isAgent: agentSet.has(club.name),
  power: getClubPower(club.name, '', 1),
  points: 0,
  played: 0,
  win: 0,
  draw: 0,
  loss: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  form: [],
  matches: [],
  latest: null,
});

const applySnapshotMatch = (row, match) => {
  const goalsFor = Number(match.goalsFor ?? 0);
  const goalsAgainst = Number(match.goalsAgainst ?? 0);
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;
  if (goalsFor > goalsAgainst) {
    row.win += 1;
    row.points += 3;
    row.form.push('W');
  } else if (goalsFor < goalsAgainst) {
    row.loss += 1;
    row.form.push('L');
  } else {
    row.draw += 1;
    row.points += 1;
    row.form.push('D');
  }
  row.matches.push(match);
  row.latest = match;
};

export const buildEuropeanLeagueSnapshot = ({
  competition,
  season = 1,
  seasonWeek = 1,
  agentMatches = [],
  agentClubNames = [],
  includeCurrentMatchday = true,
  compData = null,
} = {}) => {
  const totalMatchdays = competition === 'ECL' ? 6 : 8;
  const completedMatchdays = Math.min(totalMatchdays, getCompletedLeagueMatchdays(seasonWeek, competition, includeCurrentMatchday));
  const agentSet = new Set((agentClubNames ?? []).filter(Boolean));
  const pool = getCompetitionPool(competition, season).slice(0, EURO_LEAGUE_PHASE_SIZE);
  const rowsByName = new Map(pool.map((club) => [club.name, emptySnapshotRow(club, agentSet)]));

  agentSet.forEach((clubName) => {
    if (!rowsByName.has(clubName)) {
      rowsByName.set(clubName, emptySnapshotRow(getClubRef(clubName), agentSet));
    }
  });

  const canonicalData = ensureEuropeanLeagueFixtures(compData, competition, season, agentClubNames);
  const canonicalFixtures = (canonicalData.leagueFixtures ?? [])
    .filter((fixture) => Number(fixture.matchdayIndex ?? -1) >= 0 && Number(fixture.matchdayIndex ?? -1) < completedMatchdays)
    .sort((a, b) => Number(a.matchdayIndex ?? 0) - Number(b.matchdayIndex ?? 0));

  if (canonicalFixtures.length) {
    canonicalFixtures.forEach((fixture) => {
      [fixture.home, fixture.away].forEach((clubName) => {
        if (!rowsByName.has(clubName)) rowsByName.set(clubName, emptySnapshotRow(getClubRef(clubName), agentSet));
        const row = rowsByName.get(clubName);
        const perspective = canonicalFixtureResultForClub(fixture, clubName);
        if (!perspective) return;
        applySnapshotMatch(row, {
          ...perspective,
          competition,
          week: fixture.week ?? seasonWeek,
          matchdayIndex: fixture.matchdayIndex,
        });
      });
    });
    return [...rowsByName.values()]
      .sort((a, b) =>
        b.points - a.points
        || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
        || b.goalsFor - a.goalsFor
        || getClubPower(b.name, competition, season) - getClubPower(a.name, competition, season)
        || a.name.localeCompare(b.name),
      )
      .map((row, index) => ({
        ...row,
        rank: index + 1,
        leagueStatus: index < 8 ? 'roundOf16' : index < 24 ? 'playoff' : 'eliminated',
      }));
  }

  const agentByClubAndSlot = new Map();
  (agentMatches ?? [])
    .filter((match) => match?.competition === competition && match?.club)
    .forEach((match) => {
      const week = Number(match.simulatedWeek ?? match.week ?? seasonWeek);
      const md = Number.isFinite(match.matchdayIndex)
        ? Number(match.matchdayIndex)
        : Math.max(0, getEuropeanMatchdayIndex(week, competition));
      const slot = Math.max(0, Math.min(totalMatchdays - 1, md >= 0 ? md : completedMatchdays - 1));
      const key = `${match.club}|${slot}`;
      const existing = agentByClubAndSlot.get(key);
      if (!existing || Number(match.matchRating ?? 0) > Number(existing.matchRating ?? 0)) {
        agentByClubAndSlot.set(key, match);
      }
    });

  rowsByName.forEach((row, clubName) => {
    for (let md = 0; md < completedMatchdays; md += 1) {
      const agentMatch = agentByClubAndSlot.get(`${clubName}|${md}`);
      if (agentMatch) {
        const { goalsFor, goalsAgainst } = resolveClubScoreFromMatch(agentMatch);
        applySnapshotMatch(row, {
          competition,
          week: agentMatch.simulatedWeek ?? agentMatch.week ?? seasonWeek,
          matchdayIndex: md,
          opponent: agentMatch.opponent?.name ?? agentMatch.opponent ?? 'Club Européen',
          score: `${goalsFor}-${goalsAgainst}`,
          goalsFor,
          goalsAgainst,
          source: 'agent',
        });
        continue;
      }

      const opponent = pickSeededOpponent(clubName, competition, md, season);
      const result = simulateClubFixtureWithUnifiedEngine(clubName, opponent.name, competition, season, `snapshot_md_${md}_${clubName}`);
      applySnapshotMatch(row, {
        competition,
        week: seasonWeek,
        matchdayIndex: md,
        opponent: opponent.name,
        score: `${result.homeGoals}-${result.awayGoals}`,
        goalsFor: result.homeGoals,
        goalsAgainst: result.awayGoals,
        source: 'snapshot',
      });
    }
  });

  return [...rowsByName.values()]
    .sort((a, b) =>
      b.points - a.points
      || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
      || b.goalsFor - a.goalsFor
      || getClubPower(b.name, competition, season) - getClubPower(a.name, competition, season)
      || a.name.localeCompare(b.name),
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      leagueStatus: index < 8 ? 'roundOf16' : index < 24 ? 'playoff' : 'eliminated',
    }));
};

const ensureLeagueTable = (data, competition, season, agentClubNames = []) => {
  // La phase éliminatoire doit partir du même classement que l'UI:
  // uniquement les fixtures canoniques de phase de ligue, pas une seconde simulation.
  const snapshot = buildEuropeanLeagueSnapshot({
    competition,
    season,
    seasonWeek: 38,
    includeCurrentMatchday: true,
    compData: data,
    agentClubNames,
    agentMatches: [],
  });
  data.leagueTable = snapshot.map((row) => ({
    name: row.name,
    country: row.country,
    isAgent: row.isAgent,
    rank: row.rank,
    points: row.points,
    played: row.played,
    win: row.win,
    draw: row.draw,
    loss: row.loss,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    leagueStatus: row.leagueStatus,
  }));
  return data.leagueTable.map(makeClubEntry);
};

const getLeagueEntry = (data, clubName) => (data.leagueTable ?? []).find((club) => club.name === clubName) ?? null;

const getStageEntrants = (data, stage) => {
  const hasStoredRound = Object.values(data.bracketState?.rounds ?? {}).some((round) => round?.stage === stage);
  const storedEntrants = data.bracketState?.stageEntrants?.[stage];
  if (hasStoredRound && Array.isArray(storedEntrants) && storedEntrants.length) {
    return uniqueClubEntries(storedEntrants);
  }

  const eliminated = new Set(data.bracketState?.eliminatedClubs ?? []);
  const clean = (clubs = []) => uniqueClubEntries(clubs).filter((club) => !eliminated.has(club.name));

  if (stage === 'playoff') {
    return clean((data.leagueTable ?? [])
      .filter((club) => club.rank >= 9 && club.rank <= 24)
      .map((club) => ({ ...makeClubEntry(club), rank: club.rank })));
  }

  if (stage === 'roundOf16') {
    const direct = (data.leagueTable ?? [])
      .filter((club) => club.rank >= 1 && club.rank <= 8)
      .map(makeClubEntry);
    const playoffWinners = data.bracketState?.stageWinners?.playoff ?? [];
    return clean([...direct, ...playoffWinners.map(makeClubEntry)]);
  }

  const previousStage = EURO_PREVIOUS_STAGE[stage];
  return clean(data.bracketState?.stageWinners?.[previousStage] ?? []);
};

const sortEntrantsForStage = (entrants = [], competition, season, stage) => [...entrants]
  .map(makeClubEntry)
  .sort((a, b) => {
    const powerDiff = getClubPower(b.name, competition, season) - getClubPower(a.name, competition, season);
    if (powerDiff !== 0) return powerDiff;
    return hashStr(`${a.name}:${competition}:${season}:${stage}`) - hashStr(`${b.name}:${competition}:${season}:${stage}`);
  });

const pairSeededRound = (entrants = [], competition, season, stage) => {
  if (stage === 'playoff') {
    const sortedByLeagueRank = [...entrants]
      .map(makeClubEntry)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    const pairs = [];
    let left = 0;
    let right = sortedByLeagueRank.length - 1;
    while (left < right) {
      pairs.push([sortedByLeagueRank[left], sortedByLeagueRank[right]]);
      left += 1;
      right -= 1;
    }
    return pairs;
  }
  const sorted = sortEntrantsForStage(entrants, competition, season, stage);
  const pairs = [];
  let left = 0;
  let right = sorted.length - 1;
  while (left < right) {
    pairs.push([sorted[left], sorted[right]]);
    left += 1;
    right -= 1;
  }
  return pairs;
};

const decideTwoLegWinner = (home, away, homeAggregate, awayAggregate, competition, season, stage) => {
  if (homeAggregate > awayAggregate) return home;
  if (awayAggregate > homeAggregate) return away;
  const tieSeed = hashStr(`${home.name}:${away.name}:${competition}:${season}:${stage}:penalties`);
  return (getClubPower(home.name, competition, season) + (tieSeed % 9)) >= (getClubPower(away.name, competition, season) + ((tieSeed >> 4) % 9))
    ? home
    : away;
};

export const ensureEuropeanCompetitionProgress = (compData, competition, season, seasonWeek, agentClubNames = []) => {
  const stage = getEuropeanStage(seasonWeek, competition);
  if (stage === 'league') return compData;

  const data = {
    ...initEuroCupCompData(competition, season),
    ...(compData ?? {}),
    opponentHistory: { ...(compData?.opponentHistory ?? {}) },
    koPath: { ...(compData?.koPath ?? {}) },
    leagueTable: compData?.leagueTable ?? null,
    leagueFixtures: compData?.leagueFixtures ?? null,
    fixtures: { ...(compData?.fixtures ?? {}) },
  };

  const leagueEntries = ensureLeagueTable(data, competition, season, agentClubNames);

  if (!data.bracketClubs) data.bracketClubs = leagueEntries;

  const leagueEliminated = (data.leagueTable ?? [])
    .filter((club) => club.leagueStatus === 'eliminated')
    .map((club) => club.name);

  if (!data.bracketState) data.bracketState = {};
  const sanitizedProgress = sanitizeKnockoutRounds(data.bracketState.rounds ?? {});
  const rebuiltProgress = rebuildKnockoutProgressFromRounds({
    ...data.bracketState,
    rounds: sanitizedProgress.rounds,
    eliminatedClubs: sanitizedProgress.eliminatedClubs,
  });
  data.bracketState = {
    activeClubs: (data.bracketState.activeClubs ?? []).map(makeClubEntry),
    eliminatedClubs: [...new Set([...(rebuiltProgress.eliminatedClubs ?? []), ...leagueEliminated])],
    rounds: sanitizedProgress.rounds ?? {},
    stageWinners: rebuiltProgress.stageWinners ?? {},
    stageEntrants: data.bracketState.stageEntrants ?? {},
  };
  syncCanonicalFixtures(data);

  const stageIndex = EURO_KO_STAGE_ORDER.indexOf(stage);
  const previousStage = EURO_PREVIOUS_STAGE[stage];
  if (previousStage && stageIndex > 0) {
    const previousWeeks = getStageWeeks(competition, previousStage);
    const previousDeciderKey = `${previousStage}:${previousWeeks[previousWeeks.length - 1]}`;
    if (!data.bracketState.rounds?.[previousDeciderKey]) {
      return syncCanonicalFixtures(data);
    }
  }

  const entrants = getStageEntrants(data, stage);
  const entrantNames = new Set(entrants.map((club) => club.name));
  const roundKey = `${stage}:${seasonWeek}`;
  const existingRound = data.bracketState.rounds?.[roundKey];
  if (existingRound) {
    const expectedMatches = Math.max(1, Math.floor(entrants.length / 2));
    const isExistingRoundValid = (existingRound.matches ?? []).every((match) =>
      entrantNames.has(match.home) && entrantNames.has(match.away))
      && (existingRound.matches ?? []).length >= expectedMatches;
    if (isExistingRoundValid) return data;
    data.bracketState.rounds = Object.fromEntries(
      Object.entries(data.bracketState.rounds ?? {}).filter(([, round]) => round?.stage !== stage),
    );
    data.bracketState.stageWinners = Object.fromEntries(
      Object.entries(data.bracketState.stageWinners ?? {}).filter(([key]) => key !== stage),
    );
  }

  data.bracketState.stageEntrants[stage] = entrants;
  data.bracketState.activeClubs = entrants;
  data.bracketClubs = entrants;
  if (!entrants.length) return syncCanonicalFixtures(data);

  const leg = getStageWeeks(competition, stage).indexOf(seasonWeek) + 1;
  const isDecider = isEuropeanStageDecider(seasonWeek, competition, stage);
  const previousLegKey = `${stage}:${getStageWeeks(competition, stage)[0]}`;
  const previousMatches = data.bracketState.rounds?.[previousLegKey]?.matches ?? [];
  const pairs = leg > 1 && previousMatches.length
    ? previousMatches
      .map((match) => [
        makeClubEntry({ name: match.home, country: match.homeCountry }),
        makeClubEntry({ name: match.away, country: match.awayCountry }),
      ])
      .filter(([home, away]) => home?.name && away?.name)
    : stage === 'final'
      ? getRoundPairs(sortEntrantsForStage(entrants, competition, season, stage))
      : pairSeededRound(entrants, competition, season, stage);
  const previousByPair = previousMatches.reduce((index, match) => {
    index[`${match.home}|${match.away}`] = match;
    index[`${match.away}|${match.home}`] = match;
    return index;
  }, {});

  const matches = pairs.map(([home, away]) => {
    const score = simulateClubFixtureWithUnifiedEngine(home.name, away.name, competition, season, `${stage}_leg_${leg}`);
    const homeGoals = score.homeGoals;
    const awayGoals = score.awayGoals;
    const previous = previousByPair[`${home.name}|${away.name}`] ?? null;
    const homeAggregate = homeGoals + (previous?.homeGoals ?? 0);
    const awayAggregate = awayGoals + (previous?.awayGoals ?? 0);
    const winner = !isDecider ? null : decideTwoLegWinner(home, away, homeAggregate, awayAggregate, competition, season, stage);
    const loser = !winner ? null : winner.name === home.name ? away : home;
    const decidedByPenalties = isDecider && homeAggregate === awayAggregate;
    const fixtureId = makeEuropeanFixtureId({
      competition,
      season,
      stage,
      week: seasonWeek,
      leg,
      home: home.name,
      away: away.name,
    });
    return {
      id: fixtureId,
      fixtureId,
      competition,
      season,
      home: home.name,
      away: away.name,
      homeCountry: home.country,
      awayCountry: away.country,
      homeGoals,
      awayGoals,
      score: `${homeGoals}-${awayGoals}`,
      aggregate: isDecider ? `${homeAggregate}-${awayAggregate}` : null,
      winner: winner?.name ?? null,
      loser: loser?.name ?? null,
      decidedByPenalties,
      stage,
      leg,
      week: seasonWeek,
      isDecider,
    };
  });

  const rounds = {
    ...(data.bracketState.rounds ?? {}),
    [roundKey]: { stage, week: seasonWeek, leg, isDecider, matches },
  };
  matches.forEach((match) => putCanonicalFixture(data, match));
  let nextActiveClubs = entrants;
  let nextEliminatedClubs = data.bracketState.eliminatedClubs ?? [];

  if (isDecider) {
    const winners = new Set(matches.map((match) => match.winner).filter(Boolean));
    const losers = matches.map((match) => match.loser).filter(Boolean);
    nextActiveClubs = entrants.filter((club) => winners.has(club.name));
    nextEliminatedClubs = [...new Set([...nextEliminatedClubs, ...losers])];
    data.bracketState.stageWinners = {
      ...(data.bracketState.stageWinners ?? {}),
      [stage]: uniqueClubEntries(nextActiveClubs),
    };
    if (stage === 'final') {
      data.winner = nextActiveClubs[0]?.name ?? null;
      data.champion = data.winner;
    }
  }

  data.bracketState = {
    ...data.bracketState,
    activeClubs: nextActiveClubs,
    eliminatedClubs: nextEliminatedClubs,
    rounds,
  };

  matches.forEach((match) => {
    const entries = [
      { club: match.home, opponent: match.away, ownGoals: match.homeGoals, oppGoals: match.awayGoals, country: match.awayCountry },
      { club: match.away, opponent: match.home, ownGoals: match.awayGoals, oppGoals: match.homeGoals, country: match.homeCountry },
    ];
    entries.forEach((entry) => {
      if (!data.koPath[entry.club]) data.koPath[entry.club] = {};
      data.koPath[entry.club][stage] = {
        opponent: entry.opponent,
        opponentCountry: entry.country,
        score: `${entry.ownGoals}-${entry.oppGoals}`,
        aggregate: match.aggregate,
        result: entry.ownGoals > entry.oppGoals ? 'win' : entry.ownGoals < entry.oppGoals ? 'loss' : 'draw',
        qualified: isDecider ? match.winner === entry.club : null,
        eliminated: isDecider ? match.loser === entry.club : false,
        decidedByPenalties: match.decidedByPenalties,
        week: seasonWeek,
      };
    });
  });

  return syncCanonicalFixtures(data);
};

export const getEuropeanClubRoundMatch = (compData, clubName, competition, seasonWeek) => {
  const stage = getEuropeanStage(seasonWeek, competition);
  if (stage === 'league') return null;
  const round = compData?.bracketState?.rounds?.[`${stage}:${seasonWeek}`];
  const match = round?.matches?.find((item) => item.home === clubName || item.away === clubName);
  if (!match) return null;
  const isHome = match.home === clubName;
  const goalsFor = isHome ? match.homeGoals : match.awayGoals;
  const goalsAgainst = isHome ? match.awayGoals : match.homeGoals;
  const qualified = match.isDecider ? match.winner === clubName : null;
  const matchResult = goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw';
  const resolvedResult = stage === 'final' && match.decidedByPenalties
    ? qualified ? 'win' : 'loss'
    : matchResult;
  const score = stage === 'final' && match.decidedByPenalties
    ? `${goalsFor}-${goalsAgainst} (${qualified ? 'victoire' : 'défaite'} tab)`
    : `${goalsFor}-${goalsAgainst}`;
  return {
    opponent: { name: isHome ? match.away : match.home, country: isHome ? match.awayCountry : match.homeCountry },
    goalsFor,
    goalsAgainst,
    result: resolvedResult,
    score,
    fixtureId: match.fixtureId ?? match.id ?? makeEuropeanFixtureId({
      competition,
      season: compData?.season ?? 1,
      stage,
      week: seasonWeek,
      leg: match.leg ?? 1,
      home: match.home,
      away: match.away,
    }),
    stage,
    aggregate: match.aggregate,
    qualified,
    decidedByPenalties: match.decidedByPenalties,
  };
};

export const isEuropeanClubAlive = (compData, clubName, competition, seasonWeek) => {
  const stage = getEuropeanStage(seasonWeek, competition);
  if (stage === 'league') return true;
  const leagueEntry = getLeagueEntry(compData ?? {}, clubName);
  if (leagueEntry?.leagueStatus === 'eliminated') return false;
  if (compData?.bracketState?.eliminatedClubs?.includes(clubName)) return false;
  if (stage === 'playoff') return leagueEntry?.leagueStatus === 'playoff';
  if (stage === 'roundOf16') {
    if (leagueEntry?.leagueStatus === 'roundOf16') return true;
    return (compData?.bracketState?.stageWinners?.playoff ?? []).some((club) => makeClubEntry(club).name === clubName);
  }
  const previousStage = EURO_PREVIOUS_STAGE[stage];
  return (compData?.bracketState?.stageWinners?.[previousStage] ?? []).some((club) => makeClubEntry(club).name === clubName);
};

/**
 * Sélectionne un adversaire aléatoire (fallback non déterministe pour KO).
 * Conservé pour compatibilité interne.
 */
const pickEuropeanOpponent = (playerClubName, competition) => {
  const pool = getCompetitionPool(competition);
  const candidates = pool.filter((c) => c.name !== playerClubName);
  if (!candidates.length) return { name: 'Club Européen', country: '🌍' };
  const club = candidates[Math.floor(Math.random() * candidates.length)];
  return { name: club.name, country: FLAG_MAP[club.countryCode] ?? '🌍' };
};

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
  // Normalise l'adversaire : peut être une string (contexte partagé) ou un objet {name, country}
  const rawOpponent = sharedContext.opponent ?? pickEuropeanOpponent(player.club, competition);
  const opponent = typeof rawOpponent === 'string'
    ? { name: rawOpponent, country: sharedContext.opponentCountry ?? null }
    : rawOpponent;
  const engineScore = scoreFromUnifiedMatchEngine(player, competition, seasonWeek, opponent.name, sharedContext.seedSalt ?? '');
  const ownGoals = Number.isFinite(sharedContext.goalsFor)
    ? sharedContext.goalsFor
    : engineScore.ownGoals;
  const oppGoals = Number.isFinite(sharedContext.goalsAgainst)
    ? sharedContext.goalsAgainst
    : engineScore.oppGoals;
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
  const generationalBonus = player.superstarGenerational || (player.rating ?? 0) >= 198;

  const goals = ownGoals > 0 && Math.random() < profile.goalChance + player.rating / 700 + (generationalBonus ? 0.18 : 0)
    ? Math.min(ownGoals, rand(1, player.position === 'ATT' || generationalBonus ? 3 : 1))
    : 0;
  const assists = ownGoals - goals > 0 && Math.random() < profile.assistChance + (generationalBonus ? 0.16 : 0) ? 1 : 0;
  const keyPasses = sharedContext.keyPasses ?? (
    player.position === 'ATT' || player.position === 'MIL'
      ? rand(generationalBonus ? 2 : 0, Math.max(generationalBonus ? 5 : 0, minutes > 70 ? 5 : 3) + (generationalBonus ? 2 : 0))
      : rand(0, 2)
  );

  // Note individuelle
  const baseRating = 6
    + goals * 0.9
    + assists * 0.55
    + (result === 'win' ? 0.4 : result === 'loss' ? -0.35 : 0)
    + (minutes < 35 ? -0.4 : 0)
    + (generationalBonus ? 0.45 : 0)
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
    score: sharedContext.score ?? `${ownGoals}-${oppGoals}`,
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
    aggregate: sharedContext.aggregate ?? null,
    qualified: sharedContext.qualified ?? null,
    decidedByPenalties: sharedContext.decidedByPenalties ?? false,
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
  const stageLabel = {
    league: 'Phase de ligue',
    playoff: 'Barrages / play-off',
    roundOf16: '1/8 de finale',
    quarters: 'Quarts de finale',
    semis: 'Demi-finales',
    final: 'FINALE',
  }[match.stage];
  const rawPhase = match.phase ?? stageLabel ?? 'Phase européenne';
  const goalsFor = Number(match.goalsFor);
  const goalsAgainst = Number(match.goalsAgainst);
  const hasGoals = Number.isFinite(goalsFor) && Number.isFinite(goalsAgainst);
  const computedResult = hasGoals
    ? (goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw')
    : (match.result ?? null);
  const rawScore = String(match.score ?? '0-0');
  const normalizedScore = hasGoals
    ? rawScore.replace(/^\s*\d+\s*-\s*\d+/, `${goalsFor}-${goalsAgainst}`)
    : rawScore;
  return {
    ...match,
    playerName: match.playerName ?? 'Joueur',
    club: match.club ?? 'Club',
    competition,
    competitionLabel: match.competitionLabel ?? cup?.name ?? competition,
    stage: match.stage ?? 'league',
    phase: stageLabel && rawPhase === match.stage ? stageLabel : rawPhase,
    opponent: match.opponent ?? match.opponentName ?? null,
    opponentName: match.opponentName ?? match.opponent ?? null,
    score: normalizedScore,
    goalsFor: hasGoals ? goalsFor : match.goalsFor,
    goalsAgainst: hasGoals ? goalsAgainst : match.goalsAgainst,
    result: computedResult ?? match.result ?? 'draw',
    matchRating: Number.isFinite(match.matchRating) ? match.matchRating : null,
    matchReport: match.matchReport ?? `Note ${match.matchRating ?? '—'}/10 · ${match.goals ?? 0} but${(match.goals ?? 0) > 1 ? 's' : ''}${(match.assists ?? 0) ? ` · ${match.assists} passe${(match.assists ?? 0) > 1 ? 's' : ''}` : ''}${(match.keyPasses ?? 0) ? ` · ${match.keyPasses} passes clés` : ''}`,
  };
};

// ─── Compétitions hors-UEFA classiques ────────────────────────────────────────
// Mondial des Clubs : tournoi élargi en fin de saison (32 clubs simplifié à 16).

const seedRandom = (seed) => {
  let s = hashStr(String(seed));
  return () => {
    s = lcgNext(s);
    return (s & 0x7fffffff) / 0x7fffffff;
  };
};

/**
 * Retourne la liste des clubs participants au Mondial des Clubs pour la saison.
 * Sélection : top 16 clubs tier-1/2 du monde (incluant clubs hors-UEFA).
 */
export const getClubWorldCupParticipants = (season = 1) => {
  const eligibleEuro = CLUBS.filter((c) => c.tier <= 2 && TOP_LEAGUE_COUNTRIES.has(c.countryCode));
  const eligibleWorld = CLUBS.filter((c) => c.tier <= 3 && (c.countryCode === 'BR' || c.countryCode === 'AR'));
  const pool = [...eligibleEuro, ...eligibleWorld];
  const rnd = seedRandom(`fifa-cwc-${season}`);
  const shuffled = [...pool].sort(() => rnd() - 0.5).slice(0, 16);
  return shuffled.map((club) => ({ club: club.name, countryCode: club.countryCode, tier: club.tier }));
};

/**
 * Génère les fixtures du Mondial des Clubs pour une saison (groupes simples → finale).
 * Renvoie un tableau de { week, phase, homeClub, awayClub }.
 */
export const getClubWorldCupFixtures = (season = 1) => {
  const teams = getClubWorldCupParticipants(season);
  if (teams.length < 8) return [];
  const fixtures = [];
  // Phase 1 (semaine 35) — 8 confrontations directes
  for (let i = 0; i < 8 && i * 2 + 1 < teams.length; i++) {
    fixtures.push({
      competition: 'CWC', competitionLabel: EURO_CUP_LABELS.CWC.name,
      week: 35, season, phase: 'Huitièmes',
      homeClub: teams[i * 2].club, awayClub: teams[i * 2 + 1].club,
    });
  }
  // Quarts (semaine 36) — 4 matches
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      competition: 'CWC', competitionLabel: EURO_CUP_LABELS.CWC.name,
      week: 36, season, phase: 'Quarts',
      homeClub: teams[i].club, awayClub: teams[teams.length - 1 - i].club,
    });
  }
  // Demis + finale (semaine 37) — 3 matches
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      competition: 'CWC', competitionLabel: EURO_CUP_LABELS.CWC.name,
      week: 37, season, phase: 'Demi-finale',
      homeClub: teams[i].club, awayClub: teams[3 - i].club,
    });
  }
  fixtures.push({
    competition: 'CWC', competitionLabel: EURO_CUP_LABELS.CWC.name,
    week: 37, season, phase: 'Finale',
    homeClub: teams[0].club, awayClub: teams[1].club,
  });
  return fixtures;
};

/**
 * Détermine si un club est concerné par une compétition extra cette semaine de saison.
 */
export const getExtraTournamentForWeek = (club, seasonWeek, season) => {
  if (!club) return null;
  if (EXTRA_TOURNAMENT_WEEKS.CWC.has(seasonWeek)) {
    const fixtures = getClubWorldCupFixtures(season);
    const match = fixtures.find((f) => f.week === seasonWeek && (f.homeClub === club.name || f.awayClub === club.name));
    if (match) return match;
  }
  return null;
};
