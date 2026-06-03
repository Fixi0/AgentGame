import { createServer } from 'vite';

const assert = (condition, message, details = null) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const createSeededRandom = (seed = 20260520) => {
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

const runForSeasons = (game, seasons, seedOffset = 0) => {
  Math.random = createSeededRandom(20260520 + seedOffset);
  let state = game.migrateState({
    ...game.createFreshState(),
    gameSeed: `canon_${seasons}s`,
    money: 50_000_000,
    reputation: 220,
    agencyLevel: 4,
  });

  const maxWeeks = seasons * 38;
  let youthIntakeTotal = 0;
  for (let i = 0; i < maxWeeks; i += 1) {
    const result = game.playWeek(state);
    state = game.migrateState(result.state);
    assert(state && typeof state === 'object', 'Etat invalide après simulation hebdo.', { week: i + 1, seasons });
    assert(Array.isArray(state.roster), 'Roster absent.');
    assert(Array.isArray(state.market), 'Market absent.');
    assert(Array.isArray(state.freeAgents), 'FreeAgents absents.');
    assert(Array.isArray(state.generationLedger), 'Generation ledger absent.');
    assert(Array.isArray(state.hallOfFame), 'Hall of fame absent.');
    assert(state.socialCrisisCooldowns && typeof state.socialCrisisCooldowns === 'object', 'socialCrisisCooldowns absent.');

    const players = [...state.roster, ...state.market, ...state.freeAgents];
    for (const p of players) {
      assert(Number.isFinite(p.rating), 'Rating non numérique.', p);
      assert(Number.isFinite(p.potential), 'Potential non numérique.', p);
      assert(Number.isFinite(p.value), 'Value non numérique.', p);
      assert((p.rating ?? 0) >= 60 && (p.rating ?? 0) <= 200, 'Rating hors bornes.', { rating: p.rating, player: p.id });
      assert((p.potential ?? 0) >= (p.rating ?? 0), 'Potential < rating.', { rating: p.rating, potential: p.potential, player: p.id });
      assert((p.value ?? 0) >= 100_000 && (p.value ?? 0) <= 450_000_000, 'Valeur hors bornes réalistes.', { value: p.value, player: p.id });
      assert((p.age ?? 0) >= 15 && (p.age ?? 0) <= 42, 'Age hors bornes.', { age: p.age, player: p.id });
    }
    if (((state.week - 1) % 38) + 1 === 1) {
      const last = state.generationLedger[0];
      if (last) youthIntakeTotal += Number(last.intake ?? 0);
    }
  }

  const ledger = state.generationLedger ?? [];
  assert(ledger.length >= Math.max(1, seasons - 1), 'Ledger générationnel trop court.', { seasons, ledger: ledger.length });
  if (seasons >= 10) {
    assert(youthIntakeTotal > seasons * 3, 'Pipeline générationnel insuffisant.', { seasons, youthIntakeTotal });
  }
  return {
    seasons,
    finalWeek: state.week,
    rosterSize: state.roster.length,
    marketSize: state.market.length,
    freeAgentsSize: state.freeAgents.length,
    hallOfFameSize: state.hallOfFame.length,
    generationEntries: state.generationLedger.length,
    youthIntakeTotal,
    legacyScore: state.longTermDynamics?.legacyScore ?? null,
  };
};

const run = async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const game = await server.ssrLoadModule('/src/game/gameLogic.js');
    const checkpoints = [1, 5, 10, 20, 50];
    const results = checkpoints.map((seasons, idx) => runForSeasons(game, seasons, idx * 17));
    console.log(JSON.stringify({ status: 'OK', results }, null, 2));
  } finally {
    await server.close();
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});

