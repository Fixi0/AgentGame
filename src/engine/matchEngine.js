const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createSeededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const attr = (player, key, fallback = 10) =>
  Number.isFinite(player?.attributes?.[key]?.current) ? player.attributes[key].current : fallback;

const ratingOf = (player) => Number(player?.rating ?? 65);

const squadStrength = (players = []) => {
  if (!players.length) return 1.6;
  const avgRating = players.reduce((sum, player) => sum + ratingOf(player), 0) / players.length;
  const avgForm = players.reduce((sum, player) => sum + Number(player?.form ?? 60), 0) / players.length;
  return clamp(avgRating / 30 + avgForm / 120, 1.2, 8.6);
};

const pickWeighted = (entries, random, fallback = null) => {
  if (!entries.length) return fallback;
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (total <= 0) return entries[Math.floor(random() * entries.length)].value;
  let cursor = random() * total;
  for (const entry of entries) {
    cursor -= Math.max(0, entry.weight);
    if (cursor <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
};

const classifyRoleWeight = (player) => {
  const role = String(player?.roleId ?? '');
  if (role.includes('striker') || role.includes('forward') || role === 'false_9' || role === 'number_9') return 2.1;
  if (role.includes('winger') || role.includes('attacking') || role === 'playmaker') return 1.5;
  if (role.includes('mid') || role === 'box_to_box') return 1.1;
  if (role.includes('back') || role.includes('def') || role === 'libero') return 0.55;
  if (String(player?.position ?? '') === 'GK') return 0.05;
  return 0.8;
};

const pickScorer = (players, random) =>
  pickWeighted(
    players.map((player) => ({
      value: player,
      weight: classifyRoleWeight(player) * (ratingOf(player) / 100) * (0.7 + attr(player, 'shooting', 10) / 20),
    })),
    random,
    players[0] ?? null,
  );

const pickAssist = (players, scorerId, random) => {
  const pool = players.filter((player) => player?.id !== scorerId);
  if (!pool.length) return null;
  return pickWeighted(
    pool.map((player) => ({
      value: player,
      weight: (0.8 + attr(player, 'passing', 10) / 20) * (classifyRoleWeight(player) >= 1.3 ? 1.2 : 1),
    })),
    random,
    pool[0] ?? null,
  );
};

export const simulateMatch = ({
  homePlayers = [],
  awayPlayers = [],
  homeTeamName = 'Home',
  awayTeamName = 'Away',
  seed = 1,
}) => {
  const random = createSeededRandom(seed);
  const homeStrength = squadStrength(homePlayers);
  const awayStrength = squadStrength(awayPlayers);
  const state = {
    minute: 0,
    score: { home: 0, away: 0 },
    momentum: { home: 0, away: 0 },
    stamina: { home: 100, away: 100 },
    morale: { home: 60, away: 60 },
    cards: { home: 0, away: 0 },
    injuries: { home: 0, away: 0 },
  };

  const stats = {
    home: { shots: 0, shotsOnTarget: 0, xg: 0, chances: 0 },
    away: { shots: 0, shotsOnTarget: 0, xg: 0, chances: 0 },
  };
  const events = [];

  for (let minute = 1; minute <= 90; minute += 3) {
    state.minute = minute;
    const homePossessionEdge = 0.5 + (homeStrength - awayStrength) * 0.05 + state.momentum.home * 0.012 + 0.04;
    const attackingSide = random() < clamp(homePossessionEdge, 0.28, 0.72) ? 'home' : 'away';
    const defendingSide = attackingSide === 'home' ? 'away' : 'home';
    const attackStrength = attackingSide === 'home' ? homeStrength : awayStrength;
    const defenseStrength = defendingSide === 'home' ? homeStrength : awayStrength;
    const staminaFactor = clamp(state.stamina[attackingSide] / 100, 0.72, 1);
    const moraleFactor = clamp(state.morale[attackingSide] / 70, 0.75, 1.25);
    const momentumFactor = 1 + state.momentum[attackingSide] * 0.04;

    const chanceProb = clamp(0.175 + (attackStrength - defenseStrength) * 0.036, 0.095, 0.36) * staminaFactor * moraleFactor;
    if (random() < chanceProb) {
      stats[attackingSide].chances += 1;
      const shotProb = clamp(0.67 + state.momentum[attackingSide] * 0.05, 0.48, 0.9);
      if (random() < shotProb) {
        stats[attackingSide].shots += 1;
        const pressure = clamp(1 - state.momentum[attackingSide] * 0.08 + state.momentum[defendingSide] * 0.05, 0.7, 1.2);
        const angle = clamp(0.68 + random() * 0.5, 0.45, 1.1);
        const shotQuality = clamp(0.22 + (attackStrength - defenseStrength) * 0.024 + random() * 0.36, 0.1, 0.78);
        const xg = clamp(shotQuality * angle / pressure, 0.06, 0.82);
        stats[attackingSide].xg = Number((stats[attackingSide].xg + xg).toFixed(2));

        const teamPlayers = attackingSide === 'home' ? homePlayers : awayPlayers;
        const scorer = pickScorer(teamPlayers, random);
        const finishing = scorer ? clamp((attr(scorer, 'shooting', 10) + ratingOf(scorer) / 10) / 20, 0.65, 1.32) : 0.95;
        const onTargetProb = clamp(0.45 + finishing * 0.25, 0.36, 0.83);
        if (random() < onTargetProb) stats[attackingSide].shotsOnTarget += 1;
        const goalProb = clamp(xg * finishing * momentumFactor * 1.12, 0.04, 0.88);

        if (random() < goalProb) {
          state.score[attackingSide] += 1;
          state.momentum[attackingSide] = clamp(state.momentum[attackingSide] + 1, -3, 3);
          state.momentum[defendingSide] = clamp(state.momentum[defendingSide] - 1, -3, 3);
          state.morale[attackingSide] = clamp(state.morale[attackingSide] + 4, 35, 95);
          state.morale[defendingSide] = clamp(state.morale[defendingSide] - 3, 30, 95);

          const assister = scorer ? pickAssist(teamPlayers, scorer.id, random) : null;
          events.push({
            minute,
            team: attackingSide,
            type: 'goal',
            scorerId: scorer?.id ?? null,
            assistId: assister?.id ?? null,
          });
        } else {
          state.momentum[defendingSide] = clamp(state.momentum[defendingSide] + 0.35, -3, 3);
        }
      }
    }

    state.stamina.home = clamp(state.stamina.home - (0.25 + random() * 0.45), 58, 100);
    state.stamina.away = clamp(state.stamina.away - (0.25 + random() * 0.45), 58, 100);
  }

  return {
    homeGoals: state.score.home,
    awayGoals: state.score.away,
    stats,
    events,
    matchState: {
      minute: state.minute,
      score: state.score,
      momentum: state.momentum,
      stamina: state.stamina,
      morale: state.morale,
      cards: state.cards,
      injuries: state.injuries,
    },
    summary: {
      homeTeam: homeTeamName,
      awayTeam: awayTeamName,
      homeXg: stats.home.xg,
      awayXg: stats.away.xg,
    },
  };
};
