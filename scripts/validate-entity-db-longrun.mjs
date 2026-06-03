import { createServer } from 'vite';

const assert = (condition, message, details = null) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const createSeededRandom = (seed = 987654321) => {
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

const run = async () => {
  Math.random = createSeededRandom(44);
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const game = await server.ssrLoadModule('/src/game/gameLogic.js');
    const squads = await server.ssrLoadModule('/src/data/squadDatabase.js');
    const entityStore = await server.ssrLoadModule('/src/systems/entityStoreSystem.js');
    const identity = await server.ssrLoadModule('/src/systems/identitySystem.js');

    const catalog = squads.createPlayerCatalog(1);
    const gabriel = catalog.find((player) => player.id === squads.GABRIEL_FIXIO_ID);
    const second = catalog.find((player) => player.id !== gabriel?.id && player.club === gabriel?.club && !player.freeAgent);
    const third = catalog.find((player) => player.id !== gabriel?.id && player.id !== second?.id && !player.freeAgent);

    let state = game.migrateState({
      ...game.createFreshState(),
      gameSeed: 'entity-db-longrun',
      money: 100_000_000,
      reputation: 95,
      agencyLevel: 4,
      market: [gabriel, second, third].filter(Boolean),
      freeAgents: [],
    });

    for (const player of [gabriel, second, third].filter(Boolean)) {
      const signed = game.signPlayer(state, { ...player, signingCost: 0 });
      assert(!signed.error, `Signature impossible pour ${player.firstName} ${player.lastName}: ${signed.error ?? ''}`);
      state = game.migrateState(signed.state);
    }

    const seenFixtureIds = new Set();
    const scoreByFixture = new Map();
    const sampledWeeks = [];

    for (let i = 0; i < 38 * 2 * 7; i += 1) {
      const result = game.playDay(state);
      state = game.migrateState(result.state);
      const db = entityStore.getRuntimeEntityDb(state);
      assert(db.schemaVersion >= 1, 'Runtime DB absente pendant le long run.', { day: i, week: state.week });
      assert(db.repositories?.fixtures?.byClub, 'Repositories runtime absents pendant le long run.', { day: i, week: state.week });
      assert(Object.keys(db.byId.players ?? {}).length >= (state.roster?.length ?? 0), 'Index joueurs runtime inférieur au roster.', {
        day: i,
        week: state.week,
        indexed: Object.keys(db.byId.players ?? {}).length,
        roster: state.roster?.length ?? 0,
      });

      for (const player of state.roster ?? []) {
        if (player.club && player.club !== 'Libre') {
          assert(player.clubId && identity.getClubById(player.clubId), 'Joueur roster sans clubId valide.', { player });
        }
      }

      for (const fixture of db.tables.fixtures ?? []) {
        assert(fixture.id, 'Fixture sans ID.', fixture);
        assert(fixture.home_club_id || fixture.away_club_id || fixture.club_id, 'Fixture sans référence club.', fixture);
        if (fixture.status === 'played') {
          seenFixtureIds.add(fixture.id);
        }
      }

      for (const resultRow of db.tables.matchResults ?? []) {
        if (!resultRow.fixture_id) continue;
        const key = resultRow.fixture_id ?? resultRow.fixtureId;
        const score = resultRow.canonical_score ?? resultRow.score ?? `${resultRow.goals_for ?? ''}-${resultRow.goals_against ?? ''}`;
        if (scoreByFixture.has(key)) {
          assert(scoreByFixture.get(key) === score, 'Score divergent pour un même fixture.', {
            fixtureId: key,
            previous: scoreByFixture.get(key),
            current: score,
            row: resultRow,
          });
        } else {
          scoreByFixture.set(key, score);
        }
      }

      if (result.report?.kind === 'weekly_matchday') {
        sampledWeeks.push({ week: state.week, fixtures: db.tables.fixtures.length, results: db.tables.matchResults.length });
      }
    }

    const finalDb = entityStore.getRuntimeEntityDb(state);
    assert((state.week ?? 0) >= 76, 'Le long run ne couvre pas deux saisons.', { week: state.week });
    assert(seenFixtureIds.size > 1000, 'Trop peu de fixtures jouées indexées sur deux saisons.', { seenFixtureIds: seenFixtureIds.size });
    const firstRoster = state.roster?.[0];
    if (firstRoster) {
      const repoPlayer = finalDb.repositories.players.get(firstRoster.id);
      const clubPlayers = finalDb.repositories.players.byClub(firstRoster.clubId);
      const clubFixtures = finalDb.repositories.fixtures.byClub(firstRoster.clubId);
      assert(repoPlayer?.id === firstRoster.id, 'Repository final players.get incohérent.', { firstRoster, repoPlayer });
      assert(clubPlayers.some((row) => row.id === firstRoster.id), 'Repository final players.byClub incohérent.', { firstRoster, clubPlayers: clubPlayers.slice(0, 5) });
      assert(clubFixtures.length > 0, 'Repository final fixtures.byClub vide pour le club du joueur.', { firstRoster });
    }

    console.log(JSON.stringify({
      status: 'OK',
      finalWeek: state.week,
      roster: state.roster.map((player) => `${player.firstName} ${player.lastName} (${player.clubId})`),
      runtimePlayers: Object.keys(finalDb.byId.players ?? {}).length,
      runtimeFixtures: Object.keys(finalDb.byId.fixtures ?? {}).length,
      repositoryRoster: finalDb.repositories.players.roster().length,
      playedFixtureIds: seenFixtureIds.size,
      scoreFixtures: scoreByFixture.size,
      sampledWeeks: sampledWeeks.slice(-5),
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
