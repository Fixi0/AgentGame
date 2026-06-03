import { CLUBS } from '../data/clubs';
import { getClubSquad } from '../data/squadDatabase';
import { getClubWorldCupFixtures, EURO_CUP_LABELS } from './europeanCupSystem';
import { simulateMatch } from '../engine/matchEngine';

const findClub = (name) => CLUBS.find((c) => c.name === name) ?? null;

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

const seededInt = (random, min, max) => Math.floor(random() * (max - min + 1)) + min;

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

const getLeagueRoundIndexForSeasonWeek = (seasonWeek = 1) => {
  if (seasonWeek < 1 || seasonWeek > 38) return null;
  return seasonWeek;
};

const getPlayerClub = (player) => ({
  name: player.club,
  tier: player.clubTier,
  countryCode: player.clubCountryCode,
  city: player.clubCity,
});

const CLUB_RATING_OVERRIDES = {
  PSG: 198,
  'Real Madrid': 200,
  Barcelona: 195,
  Atletico: 190,
  'Man City': 200,
  Liverpool: 196,
  Arsenal: 193,
  'Man United': 188,
  Bayern: 199,
  Dortmund: 190,
  Leverkusen: 191,
  Inter: 193,
  Milan: 188,
  Juventus: 188,
  Napoli: 187,
  Monaco: 184,
  Marseille: 184,
  Lyon: 174,
  Lille: 172,
  Chelsea: 182,
  Newcastle: 180,
  Tottenham: 180,
  Leipzig: 180,
  Stuttgart: 170,
  Roma: 176,
  Lazio: 174,
  Atalanta: 176,
};

const getClubSeasonCycle = (club, season = 1) => {
  const random = createSeededRandom(hashString(`${club.countryCode}:${club.name}:cycle:${season}`));
  const raw = random();
  const ceiling = club.tier <= 1 ? 8 : club.tier === 2 ? 12 : 15;
  const floor = club.tier <= 1 ? -14 : club.tier === 2 ? -10 : -8;
  return Math.round(floor + raw * (ceiling - floor));
};

const getClubBaseRating = (club, season = 1) => {
  const structuralRating = CLUB_RATING_OVERRIDES[club.name]
    ?? (club.tier <= 1 ? 186 : club.tier === 2 ? 158 : club.tier === 3 ? 136 : 112);
  return Math.max(86, Math.min(200, structuralRating + getClubSeasonCycle(club, season)));
};

const buildFallbackSimulationSquad = (club, season = 1) => {
  const baseRating = getClubBaseRating(club, season);
  return Array.from({ length: 11 }, (_, index) => ({
    id: `${club.countryCode}_${club.name}_sim_${index + 1}`,
    rating: baseRating + (index <= 2 ? 2 : index <= 6 ? 0 : -2) + ((index % 3) - 1),
    form: 64 + (club.tier <= 1 ? 4 : club.tier === 2 ? 2 : 0),
    attributes: {
      shooting: { current: club.tier <= 1 ? 16 : club.tier === 2 ? 14 : club.tier === 3 ? 12 : 10 },
      passing: { current: club.tier <= 1 ? 16 : club.tier === 2 ? 14 : club.tier === 3 ? 12 : 10 },
    },
    roleId: index <= 1 ? 'center_back' : index <= 4 ? 'central_mid' : 'striker',
    position: index === 0 ? 'GK' : index <= 4 ? 'DEF' : index <= 7 ? 'MIL' : 'ATT',
  }));
};

const buildSimulationSquad = (club, knownPlayers = [], season = 1) =>
  knownPlayers.length
    ? [
      ...knownPlayers,
      ...buildFallbackSimulationSquad(club, season).slice(0, Math.max(0, 11 - knownPlayers.length)),
    ].slice(0, 11)
    : buildFallbackSimulationSquad(club, season);

const createFixture = ({ homeClub, awayClub, playersByClub, isFriendly = false, week = 1, season = 1, seasonWeek = 1, seedSalt = '' }) => {
  const seed = hashString(`${seedSalt}:${season}:${seasonWeek}:${homeClub.countryCode}:${homeClub.name}:${awayClub.name}`);
  const homePlayers = playersByClub.get(clubKey(homeClub)) ?? [];
  const awayPlayers = playersByClub.get(clubKey(awayClub)) ?? [];
  const homeSimulationSquad = buildSimulationSquad(homeClub, homePlayers, season);
  const awaySimulationSquad = buildSimulationSquad(awayClub, awayPlayers, season);
  const simulation = simulateMatch({
    homePlayers: homeSimulationSquad,
    awayPlayers: awaySimulationSquad,
    homeTeamName: homeClub.name,
    awayTeamName: awayClub.name,
    seed,
  });
  let homeGoals = simulation.homeGoals;
  let awayGoals = simulation.awayGoals;
  if (isFriendly) {
    const random = createSeededRandom(seed + 991);
    homeGoals = Math.max(0, Math.min(6, homeGoals + (random() < 0.18 ? 1 : 0) - (random() < 0.12 ? 1 : 0)));
    awayGoals = Math.max(0, Math.min(6, awayGoals + (random() < 0.18 ? 1 : 0) - (random() < 0.12 ? 1 : 0)));
  }

  const homeById = new Map(homeSimulationSquad.map((player) => [player.id, player]));
  const awayById = new Map(awaySimulationSquad.map((player) => [player.id, player]));
  const timeline = [];
  timeline.push({
    id: `ev_kickoff_${week}_${homeClub.name}_${awayClub.name}`,
    minute: 1,
    type: 'kickoff',
    team: 'neutral',
    scoreHome: 0,
    scoreAway: 0,
  });
  let runningHome = 0;
  let runningAway = 0;
  (simulation.events ?? []).forEach((event, index) => {
    if (event?.type !== 'goal') return;
    if (event.team === 'home') runningHome += 1;
    if (event.team === 'away') runningAway += 1;
    const scorer = event.team === 'home' ? homeById.get(event.scorerId) : awayById.get(event.scorerId);
    const assist = event.team === 'home' ? homeById.get(event.assistId) : awayById.get(event.assistId);
    timeline.push({
      id: `ev_goal_${week}_${index}_${homeClub.name}_${awayClub.name}`,
      minute: Number(event.minute ?? (10 + index * 7)),
      type: 'goal',
      team: event.team,
      scorerId: event.scorerId ?? null,
      scorerName: scorer ? `${scorer.firstName ?? ''} ${scorer.lastName ?? ''}`.trim() : null,
      assistId: event.assistId ?? null,
      assistName: assist ? `${assist.firstName ?? ''} ${assist.lastName ?? ''}`.trim() : null,
      scoreHome: runningHome,
      scoreAway: runningAway,
    });
  });
  timeline.push({
    id: `ev_fulltime_${week}_${homeClub.name}_${awayClub.name}`,
    minute: 90,
    type: 'fulltime',
    team: 'neutral',
    scoreHome: homeGoals,
    scoreAway: awayGoals,
  });

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
    homeXg: simulation.stats?.home?.xg ?? simulation.summary?.homeXg ?? null,
    awayXg: simulation.stats?.away?.xg ?? simulation.summary?.awayXg ?? null,
    homeShots: simulation.stats?.home?.shots ?? null,
    awayShots: simulation.stats?.away?.shots ?? null,
    homeShotsOnTarget: simulation.stats?.home?.shotsOnTarget ?? null,
    awayShotsOnTarget: simulation.stats?.away?.shotsOnTarget ?? null,
    homeChances: simulation.stats?.home?.chances ?? null,
    awayChances: simulation.stats?.away?.chances ?? null,
    isFriendly,
    simulation,
    timeline,
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

const attrValue = (player, key, fallback = 10) =>
  Number.isFinite(player.attributes?.[key]?.current) ? player.attributes[key].current : fallback;

const attrDelta = (player, key, fallback = 10) =>
  (attrValue(player, key, fallback) - 10) / 10;

/**
 * Calculate attribute-based bonuses for match performance
 * Uses 17-stat player attributes to enhance match scoring
 */
const getAttributeQualityBonus = (player) => {
  if (!player.attributes || Object.keys(player.attributes).length === 0) {
    // Fallback to rating-based calculation
    return Math.max(-0.05, Math.min(0.18, (player.rating - 70) / 160));
  }

  const position = player.position;
  const mentalCore =
    attrDelta(player, 'awareness') * 0.03
    + attrDelta(player, 'decisionMaking') * 0.035
    + attrDelta(player, 'consistency') * 0.03;
  let roleCore = 0;

  if (position === 'GK') {
    roleCore = attrDelta(player, 'handling') * 0.05 + attrDelta(player, 'positioning') * 0.035 + attrDelta(player, 'distribution') * 0.02;
  } else if (position === 'DEF') {
    roleCore = attrDelta(player, 'defense') * 0.05 + attrDelta(player, 'positioning') * 0.04 + attrDelta(player, 'strength') * 0.025;
  } else if (position === 'MIL') {
    roleCore = attrDelta(player, 'passing') * 0.045 + attrDelta(player, 'dribbling') * 0.03 + attrDelta(player, 'stamina') * 0.025;
  } else if (position === 'ATT') {
    roleCore = attrDelta(player, 'shooting') * 0.055 + attrDelta(player, 'dribbling') * 0.03 + attrDelta(player, 'positioning') * 0.025;
  }

  return Math.max(-0.10, Math.min(0.22, mentalCore + roleCore));
};

/**
 * Get attribute-based goal scoring chance
 */
const getAttributeGoalChance = (player, baseChance) => {
  if (!player.attributes || !player.attributes.shooting) {
    return baseChance;
  }

  const shootingAttr = attrValue(player, 'shooting');
  const shootingBonus = (shootingAttr / 20 - 0.5) * baseChance * 0.4; // ±40% boost
  return Math.max(0, baseChance + shootingBonus);
};

/**
 * Get attribute-based assist chance
 */
const getAttributeAssistChance = (player, baseChance) => {
  if (!player.attributes || !player.attributes.passing) {
    return baseChance;
  }

  const passingAttr = attrValue(player, 'passing');
  const passingBonus = (passingAttr / 20 - 0.5) * baseChance * 0.35; // ±35% boost
  return Math.max(0, baseChance + passingBonus);
};

/**
 * Get attribute-based save chance for GK
 */
const getAttributeSaveBonus = (player) => {
  if (!player.attributes || player.position !== 'GK') {
    return 0;
  }

  const handling = attrValue(player, 'handling');
  const positioning = attrValue(player, 'positioning');
  return ((handling + positioning) / 40 - 0.5) * 2; // -1 to +1 range
};

const getPlayerOutput = (player, teamGoals, opponentGoals, remainingGoals = teamGoals, remainingAssists = teamGoals, random = Math.random) => {
  if (player.injured > 0) {
    return { minutes: 0, goals: 0, assists: 0, matchRating: null, selectionStatus: 'blessé', absenceReason: 'blessé' };
  }

  const generationalBonus = player.superstarGenerational || (player.rating ?? 0) >= 198;
  const tierExpectation = player.clubTier <= 1 ? 80 : player.clubTier === 2 ? 74 : player.clubTier === 3 ? 66 : 58;
  const levelGap = player.rating - tierExpectation;
  const promisedRole = player.contractClauses?.rolePromise ?? player.clubRole;
  const rolePriority = promisedRole === 'Star' ? 18 : promisedRole === 'Titulaire' ? 12 : promisedRole === 'Rotation' ? 4 : promisedRole === 'Indésirable' ? -18 : 0;
  const roleBonus = player.clubRole === 'Star' ? 18 : player.clubRole === 'Titulaire' ? 12 : player.clubRole === 'Rotation' ? 4 : player.clubRole === 'Indésirable' ? -18 : 0;
  const contractRoleBonus = (player.contractClauses?.coachRoleProtection ?? false) ? Math.max(0, rolePriority) * 0.35 : 0;
  const formBonus = Math.floor((player.form - 70) / 3);
  const selectionBonus =
    attrDelta(player, 'positioning') * 0.05
    + attrDelta(player, 'decisionMaking') * 0.04
    + attrDelta(player, 'stamina') * 0.03
    + attrDelta(player, 'consistency') * 0.035;
  const startChance = Math.max(0.04, Math.min(generationalBonus ? 0.995 : 0.96, 0.42 + levelGap * 0.035 + roleBonus / 100 + formBonus / 100 + contractRoleBonus / 100 + selectionBonus + (generationalBonus ? 0.12 : 0)));
  const squadChance = Math.max(0.12, Math.min(generationalBonus ? 0.999 : 0.98, 0.72 + levelGap * 0.025 + roleBonus / 120 + contractRoleBonus / 140 + selectionBonus / 1.5 + (generationalBonus ? 0.08 : 0)));
  // Use attribute-based quality bonus if attributes exist, otherwise fall back to rating-based
  const qualityBonus = getAttributeQualityBonus(player);
  if (random() > squadChance) {
    return { minutes: 0, goals: 0, assists: 0, matchRating: null, selectionStatus: 'hors groupe', absenceReason: 'hors groupe' };
  }

  const starts = random() < startChance;
  const staminaMinuteBonus = Math.round(attrDelta(player, 'stamina') * 8);
  const minutes = starts
    ? Math.min(90, Math.max(player.contractClauses?.coachRoleProtection && promisedRole === 'Star' ? 72 : player.contractClauses?.coachRoleProtection && promisedRole === 'Titulaire' ? 60 : 55, seededInt(random, 62, 90) + formBonus + Math.max(-12, levelGap) + staminaMinuteBonus))
    : Math.min(45, Math.max(8, seededInt(random, 8, 32) + formBonus + Math.floor(levelGap / 3) + Math.floor(staminaMinuteBonus / 2)));
  const scoringProfile = getPositionScoringProfile(player);
  const availableGoals = Math.max(0, Math.min(teamGoals, remainingGoals));
  const attributeGoalChance = getAttributeGoalChance(player, scoringProfile.goalChance);
  const goals = availableGoals > 0 && scoringProfile.maxGoals > 0 && random() < attributeGoalChance + qualityBonus + player.form / 1500 + (generationalBonus ? 0.18 : 0)
    ? seededInt(random, 1, Math.min(scoringProfile.maxGoals + (generationalBonus ? 1 : 0), availableGoals))
    : 0;
  const availableAssists = Math.max(0, Math.min(teamGoals - goals, remainingAssists));
  const attributeAssistChance = getAttributeAssistChance(player, scoringProfile.assistChance);
  const assists = availableAssists > 0 && scoringProfile.assistChance > 0 && random() < attributeAssistChance + qualityBonus / 2 + player.form / 1100 + (generationalBonus ? 0.16 : 0) ? 1 : 0;
  const teamResult = teamGoals > opponentGoals ? 'win' : teamGoals < opponentGoals ? 'loss' : 'draw';
  const cleanSheetBonus = opponentGoals === 0 && ['DEF', 'GK'].includes(player.position) ? 0.5 : 0;
  const attributeSaveBonus = getAttributeSaveBonus(player);
  const goalkeeperSaveBonus = player.position === 'GK' ? 0.15 + Math.max(0, opponentGoals === 0 ? 0.35 : 0) + attributeSaveBonus * 0.1 : 0;
  const saves = player.position === 'GK' ? Math.max(0, seededInt(random, 1, 7) + opponentGoals - (teamResult === 'loss' ? 1 : 0) + Math.floor(Math.max(0, player.rating - 150) / 24)) + Math.max(0, Math.floor(attributeSaveBonus)) : 0;
  // Enhance tackles with defense attribute if available
  const defenseAttrBonus = player.attributes?.defense ? Math.floor(attrValue(player, 'defense') / 10 - 1) : 0;
  const tackles = player.position === 'DEF' ? seededInt(random, 2, 8) + defenseAttrBonus : HIGH_TACKLE_ROLES.has(player.roleId) ? seededInt(random, 2, 6) + Math.floor(defenseAttrBonus / 2) : seededInt(random, 0, 3);
  // Enhance key passes with passing attribute if available
  const passingAttrBonus = player.attributes?.passing ? Math.floor(attrValue(player, 'passing') / 10 - 1) : 0;
  const keyPasses = KEY_PASS_ROLES.has(player.roleId) ? seededInt(random, 1, 5) + (player.rating >= 168 ? 1 : 0) + passingAttrBonus + (generationalBonus ? 2 : 0) : seededInt(random, 0, 2) + Math.floor(passingAttrBonus / 2) + (generationalBonus ? 1 : 0);
  const xg = Number(Math.max(0, scoringProfile.xgBase + goals * 0.22 + seededInt(random, -8, 16) / 100).toFixed(2));
  const passBonus = ['playmaker', 'libero'].includes(player.roleId) ? 5 : ['attacking_mid', 'central_mid', 'box_to_box'].includes(player.roleId) ? 2 : 0;
  const passAccuracy = Math.max(58, Math.min(96, seededInt(random, 70, 90) + Math.floor((player.rating - 140) / 6) + passBonus + Math.round(attrDelta(player, 'passing') * 7)));
  const incidents = [];
  if (player.position === 'GK' && opponentGoals === 0) incidents.push('clean_sheet');
  if (player.position === 'GK' && random() < 0.04 + opponentGoals * 0.03 - qualityBonus / 3) incidents.push('distribution_error');
  if (player.position === 'GK' && random() < 0.035 + qualityBonus / 5) incidents.push('penalty_saved');
  if (player.position === 'GK' && opponentGoals >= 2 && random() < 0.08 - qualityBonus / 3) incidents.push('goalkeeper_blunder');
  if (player.position === 'DEF' && random() < 0.05 + qualityBonus / 4) incidents.push('line_clearance');
  if (player.position === 'DEF' && tackles <= 2 && opponentGoals >= 2 && random() < 0.08 - qualityBonus / 3) incidents.push('lost_duel');
  if (player.position === 'DEF' && tackles >= 6 && opponentGoals === 0) incidents.push('defensive_masterclass');
  if (player.position === 'MIL' && keyPasses >= 4) incidents.push('tempo_control');
  if (player.position === 'MIL' && random() < 0.06 - qualityBonus / 4 && teamResult === 'loss') incidents.push('dangerous_turnover');
  if (player.position === 'ATT' && xg >= 0.75 && goals === 0) incidents.push('wasteful_finishing');
  if (player.position === 'ATT' && random() < 0.035) incidents.push('disallowed_goal');
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
    + Math.max(-0.35, Math.min(0.55, levelGap * 0.025))
    + (generationalBonus ? 0.45 : 0)
    + seededInt(random, -6, 7) / 10 * Math.max(0.45, 1 - Math.max(0, attrDelta(player, 'consistency')) * 0.25)
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
  const ownStats = isHome ? fixture.simulation?.stats?.home : fixture.simulation?.stats?.away;
  const opponentStats = isHome ? fixture.simulation?.stats?.away : fixture.simulation?.stats?.home;
  const teamKey = isHome ? clubKey(fixture.homeClub) : clubKey(fixture.awayClub);
  const currentBudget = budget?.get(teamKey) ?? { goals: ownGoals, assists: ownGoals };
  const random = createSeededRandom(hashString(`${fixture.fixtureId}:${player.id}:${fixture.week}`));
  const playerOutput = getPlayerOutput(player, ownGoals, opponentGoals, currentBudget.goals, currentBudget.assists, random);
  if (budget) {
    budget.set(teamKey, {
      goals: Math.max(0, currentBudget.goals - playerOutput.goals),
      assists: Math.max(0, currentBudget.assists - playerOutput.assists),
    });
  }
  const result = ownGoals > opponentGoals ? 'win' : ownGoals < opponentGoals ? 'loss' : 'draw';

  return {
    fixtureId: fixture.fixtureId,
    week: fixture.week,
    season: fixture.season,
    seasonWeek: fixture.seasonWeek,
    competition: fixture.competition ?? 'LEAGUE',
    competitionLabel: fixture.competitionLabel ?? 'Championnat',
    competitionCountryCode: fixture.countryCode ?? player.clubCountryCode,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    roleId: player.roleId,
    countryCode: player.countryCode,
    countryFlag: player.countryFlag,
    rating: player.rating,
    club: player.club,
    clubCountryCode: player.clubCountryCode,
    opponent: opponent.name,
    opponentCity: opponent.city,
    homeAway: isHome ? 'Domicile' : 'Extérieur',
    score: `${ownGoals}-${opponentGoals}`,
    goalsFor: ownGoals,
    goalsAgainst: opponentGoals,
    fixtureStats: {
      ownXg: ownStats?.xg ?? (isHome ? fixture.homeXg : fixture.awayXg) ?? null,
      opponentXg: opponentStats?.xg ?? (isHome ? fixture.awayXg : fixture.homeXg) ?? null,
      ownShots: ownStats?.shots ?? (isHome ? fixture.homeShots : fixture.awayShots) ?? null,
      opponentShots: opponentStats?.shots ?? (isHome ? fixture.awayShots : fixture.homeShots) ?? null,
      ownShotsOnTarget: ownStats?.shotsOnTarget ?? (isHome ? fixture.homeShotsOnTarget : fixture.awayShotsOnTarget) ?? null,
      opponentShotsOnTarget: opponentStats?.shotsOnTarget ?? (isHome ? fixture.awayShotsOnTarget : fixture.homeShotsOnTarget) ?? null,
      ownChances: ownStats?.chances ?? (isHome ? fixture.homeChances : fixture.awayChances) ?? null,
      opponentChances: opponentStats?.chances ?? (isHome ? fixture.awayChances : fixture.homeChances) ?? null,
    },
    result,
    ...playerOutput,
  };
};

const mergeKnownPlayersIntoSquad = (club, season, roster = []) => {
  const squad = getClubSquad(club, season);
  const rosterPlayers = roster.filter((player) =>
    player.club === club.name && player.clubCountryCode === club.countryCode,
  );
  const byId = new Map(squad.map((player) => [player.id, player]));

  rosterPlayers.forEach((player) => {
    byId.set(player.id, {
      ...player,
      club: club.name,
      clubTier: club.tier ?? player.clubTier,
      clubCountryCode: club.countryCode,
      clubCity: club.city ?? player.clubCity,
    });
  });

  return [...byId.values()];
};

export const simulateFixtureSquadResults = (fixture, roster = []) => {
  if (!fixture?.homeClub || !fixture?.awayClub) return [];
  const season = fixture.season ?? Math.floor(((fixture.week ?? 1) - 1) / 38) + 1;
  const homeSquad = mergeKnownPlayersIntoSquad(fixture.homeClub, season, roster);
  const awaySquad = mergeKnownPlayersIntoSquad(fixture.awayClub, season, roster);
  const budget = new Map([
    [clubKey(fixture.homeClub), { goals: fixture.homeGoals, assists: fixture.homeGoals }],
    [clubKey(fixture.awayClub), { goals: fixture.awayGoals, assists: fixture.awayGoals }],
  ]);

  const results = [...homeSquad, ...awaySquad].map((player) => toPlayerResult({ player, fixture, budget }));
  const averageByClub = new Map();
  [fixture.homeClub, fixture.awayClub].forEach((club) => {
    const ratings = results
      .filter((match) => match.club === club.name && Number.isFinite(match.matchRating))
      .map((match) => match.matchRating);
    const average = ratings.length
      ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
      : null;
    averageByClub.set(clubKey(club), average);
  });
  return results.map((match) => ({
    ...match,
    teamAverageRating: averageByClub.get(`${match.clubCountryCode}:${match.club}`) ?? null,
  }));
};

export const simulateFixturePlayerResults = (fixtures = [], roster = []) =>
  fixtures.flatMap((fixture) => simulateFixtureSquadResults(fixture, roster));

export const buildWeeklyFixtures = (roster = [], week = 1, options = {}) => {
  const seedSalt = options.seedSalt ?? '';
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
  const leagueRoundIndex = getLeagueRoundIndexForSeasonWeek(seasonWeek);

  // Le championnat commence dès la semaine 1 pour que le classement visible avance tout de suite.
  const isFriendlyWeek = false;

  clubsByCountry.forEach((countryClubs, countryCode) => {
    if (!leagueRoundIndex) return;
    const rounds = buildRoundRobinPairings(countryClubs, hashString(`${season}:${countryCode}`));
    const round = rounds[leagueRoundIndex - 1];
    if (!round?.length) return;
    round.forEach(({ homeClub, awayClub }) => {
      fixtures.push(createFixture({ homeClub, awayClub, playersByClub, isFriendly: isFriendlyWeek, week, season, seasonWeek, seedSalt }));
    });
  });

  // ── Mondial des Clubs (semaines 35-37) ─────────────────────────────────────
  if (seasonWeek >= 35 && seasonWeek <= 37) {
    const cwcAll = getClubWorldCupFixtures(season);
    cwcAll.filter((m) => m.week === seasonWeek).forEach((m) => {
      const home = findClub(m.homeClub);
      const away = findClub(m.awayClub);
      if (!home || !away) return;
      const fx = createFixture({ homeClub: home, awayClub: away, playersByClub, isFriendly: false, week, season, seasonWeek, seedSalt });
      fixtures.push({
        ...fx,
        fixtureId: `cwc_${season}_${seasonWeek}_${home.name}_${away.name}`,
        competition: 'CWC',
        competitionLabel: EURO_CUP_LABELS.CWC.name,
        countryCode: '__CWC__',
        phase: m.phase,
      });
    });
  }

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
