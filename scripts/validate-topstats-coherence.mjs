import { createServer } from 'vite';

const assert = (condition, message, details = null) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const createSeededRandom = (seed = 246813579) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

if (!globalThis.localStorage) {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(String(key)) ?? null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: (key) => storage.delete(String(key)),
    clear: () => storage.clear(),
  };
}

const isGoalkeeper = (player = {}) =>
  String(player.position ?? '').toUpperCase() === 'GK'
  || String(player.roleShort ?? '').toUpperCase() === 'GB';

const run = async () => {
  Math.random = createSeededRandom(91);
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const game = await server.ssrLoadModule('/src/game/gameLogic.js');
    const squads = await server.ssrLoadModule('/src/data/squadDatabase.js');
    const topStats = await server.ssrLoadModule('/src/systems/topScorersSystem.js');

    const catalog = squads.createPlayerCatalog(1);
    const core = catalog.filter((player) => !player.freeAgent).slice(0, 3);
    let state = game.migrateState({
      ...game.createFreshState(),
      gameSeed: 'topstats-coherence',
      money: 100_000_000,
      reputation: 95,
      agencyLevel: 4,
      market: core,
      freeAgents: [],
    });

    for (const player of core) {
      const signed = game.signPlayer(state, { ...player, signingCost: 0 });
      assert(!signed.error, `Signature impossible: ${player.firstName} ${player.lastName}`);
      state = game.migrateState(signed.state);
    }

    const anomalies = [];
    for (let i = 0; i < 38 * 3; i += 1) {
      state = game.migrateState(game.playWeek(state).state);
      const leagueStats = state.competitionTopStats?.league ?? {};
      Object.entries(leagueStats).forEach(([countryCode, stats]) => {
        [...(stats?.scorers ?? []), ...(stats?.assisters ?? [])].forEach((entry) => {
          if (isGoalkeeper(entry)) {
            anomalies.push({ type: 'gk_in_league_topstats', countryCode, entry });
          }
          if ((entry.goals ?? 0) < 0 || (entry.assists ?? 0) < 0 || (entry.appearances ?? 0) < 0) {
            anomalies.push({ type: 'negative_stats_league', countryCode, entry });
          }
        });
      });

      const europeStats = state.competitionTopStats?.europe ?? {};
      Object.entries(europeStats).forEach(([competition, stats]) => {
        [...(stats?.scorers ?? []), ...(stats?.assisters ?? [])].forEach((entry) => {
          if (isGoalkeeper(entry)) {
            anomalies.push({ type: 'gk_in_europe_topstats', competition, entry });
          }
          if ((entry.goals ?? 0) < 0 || (entry.assists ?? 0) < 0 || (entry.appearances ?? 0) < 0) {
            anomalies.push({ type: 'negative_stats_europe', competition, entry });
          }
        });
      });
    }

    assert(anomalies.length === 0, 'Incohérences détectées dans les classements buteurs/passeurs.', anomalies.slice(0, 20));

    const agencyCountry = state.agencyProfile?.countryCode ?? 'FR';
    const sampleLeague = topStats.getLeagueTopStats(agencyCountry, state);
    console.log(JSON.stringify({
      status: 'OK',
      finalWeek: state.week,
      agencyCountry,
      sampleScorers: (sampleLeague?.scorers ?? []).slice(0, 5).map((p) => ({
        name: `${p.firstName} ${p.lastName}`.trim(),
        position: p.position,
        goals: p.goals,
        assists: p.assists,
      })),
    }, null, 2));
  } finally {
    await server.close();
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});

