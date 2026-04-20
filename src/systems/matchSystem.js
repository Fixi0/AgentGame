import { CLUBS } from '../data/clubs';
import { rand } from '../utils/helpers';

const clubKey = (club) => `${club.countryCode}:${club.name}`;

const hashString = (value = '') => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seededShuffle = (items, seed) => {
  const array = [...items];
  const random = createSeededRandom(seed);
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
};

const buildRoundRobinPairings = (clubs, seed) => {
  let teams = seededShuffle(clubs, seed);
  if (teams.length < 2) return [];
  if (teams.length % 2 === 1) teams = [...teams, null];

  const totalRounds = teams.length - 1;
  const pairRounds = [];
  let rotating = teams.slice(1);

  for (let round = 0; round < totalRounds; round += 1) {
    const current = [teams[0], ...rotating];
    const pairings = [];
    for (let index = 0; index < teams.length / 2; index += 1) {
      const first = current[index];
      const second = current[teams.length - 1 - index];
      if (!first || !second) continue;
      const homeFirst = (round + index) % 2 === 0;
      pairings.push({
        homeClub: homeFirst ? first : second,
        awayClub: homeFirst ? second : first,
      });
    }
    pairRounds.push(pairings);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  const mirrored = pairRounds.map((round) => round.map((pairing) => ({
    homeClub: pairing.awayClub,
    awayClub: pairing.homeClub,
  })));

  return [...pairRounds, ...mirrored];
};

const getPlayerClub = (player) => ({
  name: player.club,
  tier: player.clubTier,
  countryCode: player.clubCountryCode,
  city: player.clubCity,
});

// Tier base scores — wider gap so tier-1 clubs dominate tier-3/4 clubs realistically.
const TIER_STRENGTH = { 1: 7.5, 2: 5.0, 3: 3.0, 4: 1.5 };

const getClubStrength = (club, players = [], random = Math.random) => {
  // Squad boost uses known agents' players; divided by 22 to keep scale manageable.
  const squadBoost = players.length
    ? players.reduce((sum, p) => sum + p.rating + p.form / 5, 0) / players.length / 22
    : 0;
  const base = TIER_STRENGTH[club.tier] ?? 1.5;
  return Math.max(1, base + squadBoost + (Math.floor(random() * 13) - 6) / 10);
};

const getTeamGoals = (ownStrength, rivalStrength, homeBonus, random = Math.random) => {
  const base = Math.floor(random() * 3);
  const strengthEdge = ownStrength - rivalStrength + homeBonus;
  const extra = (random() < 0.18 + Math.max(0, strengthEdge) * 0.08 ? 1 : 0)
    + (random() < 0.05 + Math.max(0, strengthEdge) * 0.03 ? 1 : 0);
  return Math.max(0, Math.min(5, base + extra));
};

const createFixture = ({ homeClub, awayClub, playersByClub, isFriendly = false, week = 1, season = 1, seasonWeek = 1 }) => {
  const seed = hashString(`${season}:${seasonWeek}:${homeClub.countryCode}:${homeClub.name}:${awayClub.name}`);
  const random = createSeededRandom(seed);
  const homePlayers = playersByClub.get(clubKey(homeClub)) ?? [];
  const awayPlayers = playersByClub.get(clubKey(awayClub)) ?? [];
  const homeStrength = getClubStrength(homeClub, homePlayers, random);
  const awayStrength = getClubStrength(awayClub, awayPlayers, random);
  // Friendlies: smaller gap, teams rotate squads → more "random" scorelines
  const friendlyNoise = isFriendly ? (Math.floor(random() * 31) - 15) / 10 : 0;
  const homeGoals = getTeamGoals(homeStrength + friendlyNoise, awayStrength, 0.25, random);
  const awayGoals = getTeamGoals(awayStrength + friendlyNoise, homeStrength, 0, random);

  return {
    fixtureId: `fx_${season}_${seasonWeek}_${homeClub.countryCode}_${hashString(`${homeClub.name}:${awayClub.name}`)}`,
    week,
    season,
    seasonWeek,
    homeClub,
    awayClub,
    countryCode: homeClub.countryCode,
    homeGoals,
    awayGoals,
    isFriendly,
  };
};

// Scoring profiles — goalChance/assistChance applied per-match
// All new realistic roles + legacy aliases (number_9, full_back, holding_mid, winger)
const SCORING_PROFILES = {
  // ── GK ────────────────────────────────────────────────────
  goalkeeper:     { goalChance: 0.003, assistChance: 0.01,  maxGoals: 1, xgBase: 0.01 },
  sweeper_keeper: { goalChance: 0.004, assistChance: 0.02,  maxGoals: 1, xgBase: 0.01 },
  // ── DEF ───────────────────────────────────────────────────
  center_back:    { goalChance: 0.045, assistChance: 0.04,  maxGoals: 1, xgBase: 0.08 },
  libero:         { goalChance: 0.05,  assistChance: 0.07,  maxGoals: 1, xgBase: 0.09 },
  right_back:     { goalChance: 0.04,  assistChance: 0.15,  maxGoals: 1, xgBase: 0.07 },
  left_back:      { goalChance: 0.04,  assistChance: 0.15,  maxGoals: 1, xgBase: 0.07 },
  right_wing_back:{ goalChance: 0.07,  assistChance: 0.2,   maxGoals: 1, xgBase: 0.11 },
  left_wing_back: { goalChance: 0.07,  assistChance: 0.2,   maxGoals: 1, xgBase: 0.11 },
  // ── MIL ───────────────────────────────────────────────────
  defensive_mid:  { goalChance: 0.055, assistChance: 0.13,  maxGoals: 1, xgBase: 0.09 },
  box_to_box:     { goalChance: 0.12,  assistChance: 0.18,  maxGoals: 2, xgBase: 0.19 },
  central_mid:    { goalChance: 0.09,  assistChance: 0.22,  maxGoals: 1, xgBase: 0.15 },
  playmaker:      { goalChance: 0.10,  assistChance: 0.32,  maxGoals: 1, xgBase: 0.18 },
  attacking_mid:  { goalChance: 0.17,  assistChance: 0.28,  maxGoals: 2, xgBase: 0.30 },
  right_winger:   { goalChance: 0.16,  assistChance: 0.27,  maxGoals: 2, xgBase: 0.29 },
  left_winger:    { goalChance: 0.16,  assistChance: 0.27,  maxGoals: 2, xgBase: 0.29 },
  // ── ATT ───────────────────────────────────────────────────
  striker:        { goalChance: 0.33,  assistChance: 0.11,  maxGoals: 3, xgBase: 0.56 },
  target_man:     { goalChance: 0.28,  assistChance: 0.09,  maxGoals: 2, xgBase: 0.50 },
  second_striker: { goalChance: 0.24,  assistChance: 0.22,  maxGoals: 2, xgBase: 0.44 },
  false_9:        { goalChance: 0.22,  assistChance: 0.22,  maxGoals: 2, xgBase: 0.42 },
  winger_forward: { goalChance: 0.20,  assistChance: 0.20,  maxGoals: 2, xgBase: 0.38 },
  // ── Legacy aliases (old saves) ────────────────────────────
  number_9:       { goalChance: 0.33,  assistChance: 0.11,  maxGoals: 3, xgBase: 0.56 },
  full_back:      { goalChance: 0.035, assistChance: 0.14,  maxGoals: 1, xgBase: 0.07 },
  holding_mid:    { goalChance: 0.055, assistChance: 0.13,  maxGoals: 1, xgBase: 0.09 },
  winger:         { goalChance: 0.14,  assistChance: 0.26,  maxGoals: 2, xgBase: 0.28 },
};

const KEY_PASS_ROLES = new Set([
  'playmaker', 'attacking_mid', 'right_winger', 'left_winger',
  'right_wing_back', 'left_wing_back', 'false_9', 'winger_forward',
  'right_back', 'left_back', 'full_back', 'second_striker', 'box_to_box',
  'winger', // legacy
]);

const HIGH_TACKLE_ROLES = new Set([
  'defensive_mid', 'box_to_box', 'center_back', 'libero',
  'holding_mid', // legacy
]);

const getPositionScoringProfile = (player) =>
  SCORING_PROFILES[player.roleId] ?? { goalChance: 0, assistChance: 0, maxGoals: 0, xgBase: 0 };

const getPlayerOutput = (player, teamGoals, opponentGoals, remainingGoals = teamGoals, remainingAssists = teamGoals) => {
  if (player.injured > 0) {
    return { minutes: 0, goals: 0, assists: 0, matchRating: null, selectionStatus: 'blessé', absenceReason: 'blessé' };
  }

  const tierExpectation = player.clubTier <= 1 ? 80 : player.clubTier === 2 ? 74 : player.clubTier === 3 ? 66 : 58;
  const levelGap = player.rating - tierExpectation;
  const promisedRole = player.contractClauses?.rolePromise ?? player.clubRole;
  const rolePriority = promisedRole === 'Star' ? 18 : promisedRole === 'Titulaire' ? 12 : promisedRole === 'Rotation' ? 4 : promisedRole === 'Indésirable' ? -18 : 0;
  const roleBonus = player.clubRole === 'Star' ? 18 : player.clubRole === 'Titulaire' ? 12 : player.clubRole === 'Rotation' ? 4 : player.clubRole === 'Indésirable' ? -18 : 0;
  const contractRoleBonus = (player.contractClauses?.coachRoleProtection ?? false) ? Math.max(0, rolePriority) * 0.35 : 0;
  const formBonus = Math.floor((player.form - 70) / 3);
  const startChance = Math.max(0.04, Math.min(0.96, 0.42 + levelGap * 0.035 + roleBonus / 100 + formBonus / 100 + contractRoleBonus / 100));
  const squadChance = Math.max(0.12, Math.min(0.98, 0.72 + levelGap * 0.025 + roleBonus / 120 + contractRoleBonus / 140));
  if (Math.random() > squadChance) {
    return { minutes: 0, goals: 0, assists: 0, matchRating: null, selectionStatus: 'hors groupe', absenceReason: 'hors groupe' };
  }

  const starts = Math.random() < startChance;
  const minutes = starts
    ? Math.min(90, Math.max(player.contractClauses?.coachRoleProtection && promisedRole === 'Star' ? 72 : player.contractClauses?.coachRoleProtection && promisedRole === 'Titulaire' ? 60 : 55, rand(62, 90) + formBonus + Math.max(-12, levelGap)))
    : Math.min(45, Math.max(8, rand(8, 32) + formBonus + Math.floor(levelGap / 3)));
  const scoringProfile = getPositionScoringProfile(player);
  const availableGoals = Math.max(0, Math.min(teamGoals, remainingGoals));
  const goals = availableGoals > 0 && scoringProfile.maxGoals > 0 && Math.random() < scoringProfile.goalChance + player.rating / 650
    ? rand(1, Math.min(scoringProfile.maxGoals, availableGoals))
    : 0;
  const availableAssists = Math.max(0, Math.min(teamGoals - goals, remainingAssists));
  const assists = availableAssists > 0 && scoringProfile.assistChance > 0 && Math.random() < scoringProfile.assistChance + player.form / 820 ? 1 : 0;
  const teamResult = teamGoals > opponentGoals ? 'win' : teamGoals < opponentGoals ? 'loss' : 'draw';
  const cleanSheetBonus = opponentGoals === 0 && ['DEF', 'GK'].includes(player.position) ? 0.5 : 0;
  const goalkeeperSaveBonus = player.position === 'GK' ? 0.15 + Math.max(0, opponentGoals === 0 ? 0.35 : 0) : 0;
  const saves = player.position === 'GK' ? Math.max(0, rand(1, 7) + opponentGoals - (teamResult === 'loss' ? 1 : 0)) : 0;
  const tackles = player.position === 'DEF' ? rand(2, 8) : HIGH_TACKLE_ROLES.has(player.roleId) ? rand(2, 6) : rand(0, 3);
  const keyPasses = KEY_PASS_ROLES.has(player.roleId) ? rand(1, 5) : rand(0, 2);
  const xg = Number(Math.max(0, scoringProfile.xgBase + goals * 0.22 + rand(-8, 16) / 100).toFixed(2));
  const passBonus = ['playmaker', 'libero'].includes(player.roleId) ? 5 : ['attacking_mid', 'central_mid', 'box_to_box'].includes(player.roleId) ? 2 : 0;
  const passAccuracy = Math.max(58, Math.min(96, rand(70, 90) + Math.floor((player.rating - 70) / 3) + passBonus));
  const incidents = [];
  if (player.position === 'GK' && opponentGoals === 0) incidents.push('clean_sheet');
  if (player.position === 'GK' && Math.random() < 0.04 + opponentGoals * 0.03) incidents.push('distribution_error');
  if (player.position === 'GK' && Math.random() < 0.035) incidents.push('penalty_saved');
  if (player.position === 'GK' && opponentGoals >= 2 && Math.random() < 0.08) incidents.push('goalkeeper_blunder');
  if (player.position === 'DEF' && Math.random() < 0.05) incidents.push('line_clearance');
  if (player.position === 'DEF' && tackles <= 2 && opponentGoals >= 2 && Math.random() < 0.08) incidents.push('lost_duel');
  if (player.position === 'DEF' && tackles >= 6 && opponentGoals === 0) incidents.push('defensive_masterclass');
  if (player.position === 'MIL' && keyPasses >= 4) incidents.push('tempo_control');
  if (player.position === 'MIL' && Math.random() < 0.06 && teamResult === 'loss') incidents.push('dangerous_turnover');
  if (player.position === 'ATT' && xg >= 0.75 && goals === 0) incidents.push('wasteful_finishing');
  if (player.position === 'ATT' && Math.random() < 0.035) incidents.push('disallowed_goal');
  const fatiguePenalty = (player.fatigue ?? 20) > 70 ? 0.45 : (player.fatigue ?? 20) > 55 ? 0.2 : 0;
  const incidentRating =
    (incidents.includes('penalty_saved') ? 0.65 : 0)
    + (incidents.includes('line_clearance') ? 0.35 : 0)
    + (incidents.includes('defensive_masterclass') ? 0.45 : 0)
    + (incidents.includes('tempo_control') ? 0.35 : 0)
    - (incidents.includes('distribution_error') ? 0.45 : 0)
    - (incidents.includes('goalkeeper_blunder') ? 0.75 : 0)
    - (incidents.includes('lost_duel') ? 0.35 : 0)
    - (incidents.includes('dangerous_turnover') ? 0.45 : 0)
    - (incidents.includes('wasteful_finishing') ? 0.35 : 0);
  const rating = 6
    + goals * 0.9
    + assists * 0.55
    + cleanSheetBonus
    + goalkeeperSaveBonus
    + saves * (player.position === 'GK' ? 0.08 : 0)
    + tackles * (player.position === 'DEF' ? 0.045 : 0.02)
    + keyPasses * (['MIL', 'ATT'].includes(player.position) ? 0.06 : 0.025)
    + incidentRating
    + (teamResult === 'win' ? 0.35 : teamResult === 'loss' ? -0.4 : 0)
    + (minutes < 35 ? -0.45 : 0)
    + rand(-6, 7) / 10
    - fatiguePenalty;

  const matchRating = Number(Math.min(10, Math.max(4.5, rating)).toFixed(1));
  const report = getMatchReport({ player, minutes, goals, assists, matchRating, saves, tackles, keyPasses, xg, passAccuracy, incidents, teamResult, opponentGoals });

  return {
    minutes,
    goals,
    assists,
    saves,
    tackles,
    keyPasses,
    xg,
    passAccuracy,
    incidents,
    matchReport: report,
    matchRating,
    selectionStatus: starts ? 'titulaire' : 'remplaçant',
    absenceReason: starts ? '' : 'sur le banc',
  };
};

const incidentLabels = {
  clean_sheet: 'clean sheet',
  distribution_error: 'erreur de relance',
  penalty_saved: 'penalty arrêté',
  goalkeeper_blunder: 'boulette',
  line_clearance: 'sauvetage sur la ligne',
  lost_duel: 'duel clé perdu',
  defensive_masterclass: 'match patron',
  tempo_control: 'contrôle du tempo',
  dangerous_turnover: 'perte de balle dangereuse',
  wasteful_finishing: 'manque de réalisme',
  disallowed_goal: 'but refusé',
};

export const MATCH_INCIDENT_EVENTS = {
  clean_sheet: { label: 'Cage inviolée', good: true, money: 1800, rep: 2, val: 1.02 },
  distribution_error: { label: 'Erreur de relance', good: false, money: -1200, rep: -2, val: 0.97 },
  penalty_saved: { label: 'Penalty arrêté', good: true, money: 2400, rep: 4, val: 1.04 },
  goalkeeper_blunder: { label: 'Boulette', good: false, money: -2600, rep: -5, val: 0.94 },
  line_clearance: { label: 'Sauvetage sur la ligne', good: true, money: 1400, rep: 2, val: 1.02 },
  lost_duel: { label: 'Duel clé perdu', good: false, money: -1000, rep: -2, val: 0.97 },
  defensive_masterclass: { label: 'Match patron', good: true, money: 2200, rep: 4, val: 1.05 },
  tempo_control: { label: 'Contrôle du tempo', good: true, money: 1700, rep: 3, val: 1.03 },
  dangerous_turnover: { label: 'Perte de balle dangereuse', good: false, money: -1500, rep: -3, val: 0.96 },
  wasteful_finishing: { label: 'Manque de réalisme', good: false, money: -1300, rep: -2, val: 0.96 },
  disallowed_goal: { label: 'But refusé', good: false, money: 0, rep: 1, val: 1.01 },
};

const getMatchReport = ({ player, minutes, goals, assists, matchRating, saves, tackles, keyPasses, xg, passAccuracy, incidents, teamResult, opponentGoals, absenceReason = '' }) => {
  if (!minutes) return `Absent${absenceReason ? ` · ${absenceReason}` : ''}.`;
  const reasons = [];
  if (goals) reasons.push(`${goals} but${goals > 1 ? 's' : ''}`);
  if (assists) reasons.push(`${assists} passe décisive${assists > 1 ? 's' : ''}`);
  if (player.position === 'GK') reasons.push(`${saves} arrêt${saves > 1 ? 's' : ''}${opponentGoals === 0 ? ', cage inviolée' : ''}`);
  if (player.position === 'DEF') reasons.push(`${tackles} tacles`, opponentGoals === 0 ? 'bloc solide' : 'match sous pression');
  if (player.position === 'MIL') reasons.push(`${keyPasses} passes clés`, `${passAccuracy}% passes réussies`);
  if (player.position === 'ATT') reasons.push(`${xg} xG`, goals ? 'présent dans la surface' : 'efficacité à travailler');
  incidents.forEach((incident) => reasons.push(incidentLabels[incident]));
  if (!reasons.length) reasons.push(teamResult === 'win' ? 'match sérieux dans une victoire' : teamResult === 'loss' ? 'impact limité dans une défaite' : 'prestation neutre');
  return `Note ${matchRating}/10 : ${reasons.filter(Boolean).join(', ')}.`;
};

const toPlayerResult = ({ player, fixture, budget }) => {
  if (!fixture) {
    return {
      fixtureId: `no_fixture_${player.id}`,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      club: player.club,
      opponent: 'Aucun match',
      opponentCity: '-',
      homeAway: 'Repos',
      score: '0-0',
      goalsFor: 0,
      goalsAgainst: 0,
      result: 'draw',
      minutes: 0,
      goals: 0,
      assists: 0,
      matchRating: null,
      noFixture: true,
    };
  }

  const isHome = fixture.homeClub.name === player.club && fixture.homeClub.countryCode === player.clubCountryCode;
  const ownGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
  const opponentGoals = isHome ? fixture.awayGoals : fixture.homeGoals;
  const opponent = isHome ? fixture.awayClub : fixture.homeClub;
  const teamKey = isHome ? clubKey(fixture.homeClub) : clubKey(fixture.awayClub);
  const currentBudget = budget?.get(teamKey) ?? { goals: ownGoals, assists: ownGoals };
  const playerOutput = getPlayerOutput(player, ownGoals, opponentGoals, currentBudget.goals, currentBudget.assists);
  if (budget) {
    budget.set(teamKey, {
      goals: Math.max(0, currentBudget.goals - playerOutput.goals),
      assists: Math.max(0, currentBudget.assists - playerOutput.assists),
    });
  }
  const result = ownGoals > opponentGoals ? 'win' : ownGoals < opponentGoals ? 'loss' : 'draw';

  return {
    fixtureId: fixture.fixtureId,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    club: player.club,
    opponent: opponent.name,
    opponentCity: opponent.city,
    homeAway: isHome ? 'Domicile' : 'Extérieur',
    score: `${ownGoals}-${opponentGoals}`,
    goalsFor: ownGoals,
    goalsAgainst: opponentGoals,
    result,
    ...playerOutput,
  };
};

export const buildWeeklyFixtures = (roster = [], week = 1) => {
  const playersByClub = roster.reduce((map, player) => {
    const key = clubKey(getPlayerClub(player));
    map.set(key, [...(map.get(key) ?? []), player]);
    return map;
  }, new Map());

  const clubsByCountry = CLUBS.reduce((map, club) => {
    map.set(club.countryCode, [...(map.get(club.countryCode) ?? []), club]);
    return map;
  }, new Map());
  const fixtures = [];
  const season = Math.floor((week - 1) / 38) + 1;
  const seasonWeek = ((week - 1) % 38) + 1;

  // Weeks 1-3 = pré-saison (matchs amicaux) — pas de classement, faible impact
  const isFriendlyWeek = seasonWeek <= 3;

  clubsByCountry.forEach((countryClubs, countryCode) => {
    const rounds = buildRoundRobinPairings(countryClubs, hashString(`${season}:${countryCode}`));
    const round = rounds[seasonWeek - 1];
    if (!round?.length) return;
    round.forEach(({ homeClub, awayClub }) => {
      fixtures.push(createFixture({ homeClub, awayClub, playersByClub, isFriendly: isFriendlyWeek, week, season, seasonWeek }));
    });
  });

  return fixtures;
};

export const simulateWeeklyClubResults = (roster, week = 1, fixtures = buildWeeklyFixtures(roster, week)) => {
  if (!roster.length) return { fixtures, matchResults: [] };
  const budget = fixtures.reduce((map, fixture) => {
    map.set(clubKey(fixture.homeClub), { goals: fixture.homeGoals, assists: fixture.homeGoals });
    map.set(clubKey(fixture.awayClub), { goals: fixture.awayGoals, assists: fixture.awayGoals });
    return map;
  }, new Map());

  const matchResults = roster.map((player) => {
    const fixture = fixtures.find((item) =>
      (item.homeClub.name === player.club && item.homeClub.countryCode === player.clubCountryCode)
      || (item.awayClub.name === player.club && item.awayClub.countryCode === player.clubCountryCode),
    );
    return toPlayerResult({ player, fixture, budget });
  });

  return { fixtures, matchResults };
};
