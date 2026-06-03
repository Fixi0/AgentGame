import { createServer } from 'vite';

const assert = (condition, message, details = null) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const createSeededRandom = (seed = 123456789) => {
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
  Math.random = createSeededRandom(17);
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const game = await server.ssrLoadModule('/src/game/gameLogic.js');
    const squads = await server.ssrLoadModule('/src/data/squadDatabase.js');
    const identity = await server.ssrLoadModule('/src/systems/identitySystem.js');
    const entityStore = await server.ssrLoadModule('/src/systems/entityStoreSystem.js');

    const catalog = squads.createPlayerCatalog(1);
    const gabriel = catalog.find((player) => player.id === squads.GABRIEL_FIXIO_ID);
    const second = catalog.find((player) => player.id !== gabriel?.id && player.club === gabriel?.club && !player.freeAgent);

    let state = game.migrateState({
      ...game.createFreshState(),
      gameSeed: 'identity-coherence-seed',
      money: 50_000_000,
      reputation: 95,
      agencyLevel: 4,
      market: [gabriel, second].filter(Boolean),
      freeAgents: [],
    });

    for (const player of state.market) {
      assert(player.clubId, 'Joueur marché sans clubId après migration.', player);
    }

    let signed = game.signPlayer(state, { ...gabriel, signingCost: 0 });
    assert(!signed.error, `Signature Gabriel impossible: ${signed.error ?? 'erreur inconnue'}`);
    state = game.migrateState(signed.state);

    if (second) {
      signed = game.signPlayer(state, { ...second, signingCost: 0 });
      assert(!signed.error, `Signature deuxième joueur impossible: ${signed.error ?? 'erreur inconnue'}`);
      state = game.migrateState(signed.state);
    }

    for (let i = 0; i < 60; i += 1) {
      const result = game.playDay(state);
      state = game.migrateState(result.state);
    }

    const allPlayers = [...(state.roster ?? []), ...(state.market ?? []), ...(state.freeAgents ?? [])];
    const missingPlayerClubIds = allPlayers.filter((player) => player.club && player.club !== 'Libre' && !player.clubId);
    assert(missingPlayerClubIds.length === 0, 'Des joueurs ont encore un club texte sans clubId.', missingPlayerClubIds.slice(0, 5));

    const missingOfferClubIds = (state.clubOffers ?? []).filter((offer) => offer.club && !offer.clubId);
    assert(missingOfferClubIds.length === 0, 'Des offres ont encore un club texte sans clubId.', missingOfferClubIds.slice(0, 5));

    const missingCalendarIds = (state.matchCalendar ?? []).filter((match) =>
      !match.fixtureId || !match.matchId || !match.homeClubId || !match.awayClubId
    );
    assert(missingCalendarIds.length === 0, 'Des matchs calendrier manquent d’identifiants relationnels.', missingCalendarIds.slice(0, 5));

    const byFixture = new Map();
    for (const match of state.matchCalendar ?? []) {
      if (!match.fixtureId) continue;
      const list = byFixture.get(match.fixtureId) ?? [];
      list.push(match);
      byFixture.set(match.fixtureId, list);
    }
    const duplicatedPlayedFixtures = [...byFixture.entries()]
      .filter(([, rows]) => rows.filter((row) => row.status === 'played').length > 1)
      .map(([fixtureId, rows]) => ({ fixtureId, count: rows.length }));
    assert(duplicatedPlayedFixtures.length === 0, 'Un même fixture est encore stocké plusieurs fois comme match joué.', duplicatedPlayedFixtures.slice(0, 5));

    const invalidClubRefs = allPlayers
      .filter((player) => player.clubId && !identity.getClubById(player.clubId) && player.club !== 'Libre');
    assert(invalidClubRefs.length === 0, 'Des joueurs pointent vers un clubId inconnu.', invalidClubRefs.slice(0, 5));

    const runtimeDb = entityStore.getRuntimeEntityDb(state);
    assert(runtimeDb.schemaVersion >= 1, 'Base runtime sans version de schéma.', runtimeDb);
    assert(runtimeDb.repositories?.players?.get, 'Repositories runtime absents.', runtimeDb);
    assert(Object.keys(runtimeDb.byId.players ?? {}).length >= allPlayers.length, 'Index joueurs runtime incomplet.', {
      indexed: Object.keys(runtimeDb.byId.players ?? {}).length,
      expected: allPlayers.length,
    });
    const rosterClubIds = [...new Set((state.roster ?? []).map((player) => player.clubId).filter(Boolean))];
    const missingClubIndexes = rosterClubIds.filter((clubId) => !(runtimeDb.indexes.playersByClubId?.[clubId]?.length > 0));
    assert(missingClubIndexes.length === 0, 'Index playersByClubId incomplet.', missingClubIndexes);
    const playedFixtureIds = new Set((state.matchCalendar ?? [])
      .filter((match) => match.status === 'played')
      .map((match) => match.fixtureId));
    const missingFixtureRows = [...playedFixtureIds]
      .filter((fixtureId) => !runtimeDb.byId.fixtures?.[fixtureId]);
    assert(missingFixtureRows.length === 0, 'Des fixtures jouées ne sont pas dans la base runtime.', missingFixtureRows.slice(0, 5));
    const firstRoster = state.roster?.[0];
    if (firstRoster) {
      assert(runtimeDb.repositories.players.get(firstRoster.id), 'Repository players.get ne retrouve pas le joueur roster.', firstRoster);
      assert(runtimeDb.repositories.players.byClub(firstRoster.clubId).some((row) => row.id === firstRoster.id), 'Repository players.byClub ne retrouve pas le joueur roster.', firstRoster);
    }

    console.log(JSON.stringify({
      status: 'OK',
      identityVersion: state.identityVersion,
      playersChecked: allPlayers.length,
      offersChecked: state.clubOffers?.length ?? 0,
      calendarMatchesChecked: state.matchCalendar?.length ?? 0,
      resultStoreChecked: state.matchResultStore?.length ?? 0,
      uniqueFixtures: byFixture.size,
      runtimePlayers: Object.keys(runtimeDb.byId.players ?? {}).length,
      runtimeFixtures: Object.keys(runtimeDb.byId.fixtures ?? {}).length,
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
