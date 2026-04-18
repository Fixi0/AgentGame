import { CLUBS } from '../data/clubs';
import { makeId, rand } from '../utils/helpers';

const clubKey = (club) => `${club.countryCode}:${club.name}`;

const getPlayerClub = (player) => ({
  name: player.club,
  tier: player.clubTier,
  countryCode: player.clubCountryCode,
  city: player.clubCity,
});

const getClubStrength = (club, players = []) => {
  const squadBoost = players.length
    ? players.reduce((sum, player) => sum + player.rating + player.form / 5, 0) / players.length / 18
    : 0;
  return Math.max(1, 7 - club.tier + squadBoost + rand(-8, 8) / 10);
};

const getTeamGoals = (ownStrength, rivalStrength, homeBonus) => {
  const base = rand(0, 2);
  const strengthEdge = ownStrength - rivalStrength + homeBonus;
  const extra = (Math.random() < 0.18 + Math.max(0, strengthEdge) * 0.08 ? 1 : 0)
    + (Math.random() < 0.05 + Math.max(0, strengthEdge) * 0.03 ? 1 : 0);
  return Math.max(0, Math.min(5, base + extra));
};

const createFixture = ({ homeClub, awayClub, playersByClub }) => {
  const homePlayers = playersByClub.get(clubKey(homeClub)) ?? [];
  const awayPlayers = playersByClub.get(clubKey(awayClub)) ?? [];
  const homeStrength = getClubStrength(homeClub, homePlayers);
  const awayStrength = getClubStrength(awayClub, awayPlayers);
  const homeGoals = getTeamGoals(homeStrength, awayStrength, 0.35);
  const awayGoals = getTeamGoals(awayStrength, homeStrength, 0);

  return {
    fixtureId: makeId('fx'),
    homeClub,
    awayClub,
    countryCode: homeClub.countryCode,
    homeGoals,
    awayGoals,
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
    return { minutes: 0, goals: 0, assists: 0, matchRating: null };
  }

  const tierExpectation = player.clubTier <= 1 ? 80 : player.clubTier === 2 ? 74 : player.clubTier === 3 ? 66 : 58;
  const levelGap = player.rating - tierExpectation;
  const roleBonus = player.clubRole === 'Star' ? 18 : player.clubRole === 'Titulaire' ? 12 : player.clubRole === 'Rotation' ? 4 : player.clubRole === 'Indésirable' ? -18 : 0;
  const formBonus = Math.floor((player.form - 70) / 3);
  const startChance = Math.max(0.04, Math.min(0.96, 0.42 + levelGap * 0.035 + roleBonus / 100 + formBonus / 100));
  const squadChance = Math.max(0.12, Math.min(0.98, 0.72 + levelGap * 0.025 + roleBonus / 120));
  if (Math.random() > squadChance) {
    return { minutes: 0, goals: 0, assists: 0, matchRating: null, selectionStatus: 'hors groupe' };
  }

  const starts = Math.random() < startChance;
  const minutes = starts
    ? Math.min(90, Math.max(55, rand(62, 90) + formBonus + Math.max(-12, levelGap)))
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

const getMatchReport = ({ player, minutes, goals, assists, matchRating, saves, tackles, keyPasses, xg, passAccuracy, incidents, teamResult, opponentGoals }) => {
  if (!minutes) return 'Absent ou préservé cette semaine.';
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

  clubsByCountry.forEach((countryClubs, countryCode) => {
    const used = new Set();
    const orderedClubs = [...countryClubs].sort((a, b) => a.name.localeCompare(b.name));
    const rotation = orderedClubs.length ? (week - 1) % orderedClubs.length : 0;
    const rotatedClubs = [...orderedClubs.slice(rotation), ...orderedClubs.slice(0, rotation)];

    rotatedClubs.forEach((club, index) => {
      const key = clubKey(club);
      if (used.has(key)) return;

      const opponent = [...rotatedClubs.slice(index + 1), ...rotatedClubs.slice(0, index)]
        .find((candidate) => candidate.name !== club.name && !used.has(clubKey(candidate)));
      if (!opponent) return;

      used.add(key);
      used.add(clubKey(opponent));
      const homeClub = Math.random() > 0.5 ? club : opponent;
      const awayClub = homeClub.name === club.name && homeClub.countryCode === club.countryCode ? opponent : club;
      fixtures.push(createFixture({ homeClub, awayClub, playersByClub }));
    });
  });

  return fixtures;
};

export const simulateWeeklyClubResults = (roster, week = 1, fixtures = buildWeeklyFixtures(roster, week)) => {
  if (!roster.length) return { fixtures: [], matchResults: [] };
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
