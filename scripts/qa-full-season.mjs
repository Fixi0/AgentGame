import { createServer } from 'vite';

const assert = (condition, message, details = null) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeFixturePerspectiveScore = (match = {}) => {
  const club = String(match.club ?? '');
  const opponent = String(match.opponent ?? match.opponentName ?? '');
  const [left, right] = [club, opponent].sort();
  const goalsFor = Number(match.goalsFor ?? String(match.score ?? '0-0').split('-')[0] ?? 0);
  const goalsAgainst = Number(match.goalsAgainst ?? String(match.score ?? '0-0').split('-')[1] ?? 0);
  const leftGoals = club === left ? goalsFor : goalsAgainst;
  const rightGoals = club === left ? goalsAgainst : goalsFor;
  return `${left}|${leftGoals}-${rightGoals}|${right}`;
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

const run = async () => {
  Math.random = createSeededRandom(1);
  if (!globalThis.localStorage) {
    const storage = new Map();
    globalThis.localStorage = {
      getItem: (key) => storage.get(String(key)) ?? null,
      setItem: (key, value) => storage.set(String(key), String(value)),
      removeItem: (key) => storage.delete(String(key)),
      clear: () => storage.clear(),
    };
  }
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const game = await server.ssrLoadModule('/src/game/gameLogic.js');
    const squads = await server.ssrLoadModule('/src/data/squadDatabase.js');
    const euro = await server.ssrLoadModule('/src/systems/europeanCupSystem.js');
    const season = await server.ssrLoadModule('/src/systems/seasonSystem.js');
    const clubs = await server.ssrLoadModule('/src/data/clubs.js');

    const catalog = squads.createPlayerCatalog(1);
    const gabriel = catalog.find((player) => player.id === squads.GABRIEL_FIXIO_ID);
    const second = catalog.find((player) =>
      player.id !== gabriel?.id
      && player.club === gabriel?.club
      && !player.freeAgent
    ) ?? catalog.find((player) => player.id !== gabriel?.id && !player.freeAgent);

    assert(gabriel, 'Gabriel Fixio introuvable dans le catalogue.');
    assert(second, 'Deuxième joueur introuvable dans le catalogue.');

    let state = game.createFreshState();
    state = {
      ...state,
      gameSeed: 'qa-full-season-fixed-seed',
      money: 50_000_000,
      reputation: 95,
      agencyLevel: 4,
      market: [gabriel, second, ...state.market].filter(Boolean),
      freeAgents: state.freeAgents ?? [],
    };

    let signed = game.signPlayer(state, { ...gabriel, signingCost: 0 });
    assert(!signed.error, `Signature Gabriel impossible: ${signed.error ?? 'erreur inconnue'}`);
    state = signed.state;
    signed = game.signPlayer(state, { ...second, signingCost: 0 });
    assert(!signed.error, `Signature deuxième joueur impossible: ${signed.error ?? 'erreur inconnue'}`);
    state = signed.state;

    const agencyPlayerIds = new Set(state.roster.map((player) => player.id));
    const agencyClubs = new Set(state.roster.map((player) => player.club).filter(Boolean));
    const reports = [];
    const anomalies = [];
    let maxGabrielClubLeaguePlayed = 0;

    for (let i = 0; i < 38; i += 1) {
      const beforeWeek = state.week;
      const result = game.playWeek(state);
      state = result.state;
      const report = result.report;
      reports.push(report);
      const gabrielClubRowsThisWeek = Object.values(state.leagueTables ?? {})
        .flatMap((league) => Array.isArray(league) ? league : Object.values(league ?? {}))
        .filter((row) => row?.name === gabriel.club || row?.club === gabriel.club);
      maxGabrielClubLeaguePlayed = Math.max(
        maxGabrielClubLeaguePlayed,
        ...gabrielClubRowsThisWeek.map((row) => Number(row.played ?? row.matchesPlayed ?? 0)),
        0,
      );

      asArray(report.internationalBreakSummary?.matches).forEach((match) => {
        const duplicates = asArray(report.internationalBreakSummary?.matches)
          .filter((item) => item.countryCode === match.countryCode)
          .map((item) => item.sharedMatchId);
        if (new Set(duplicates).size > 1) {
          anomalies.push({
            type: 'international_duplicate_country',
            week: beforeWeek,
            country: match.countryCode,
            fixtures: [...new Set(duplicates)],
          });
        }
      });

      asArray(report.euroMatchResults).forEach((match) => {
        if (!agencyPlayerIds.has(match.playerId) && !agencyClubs.has(match.club)) return;
        const timelineItems = asArray(report.weekTimeline);
        const displayClub = clubs.getClubDisplayName?.(match.club) ?? match.club;
        const displayOpponent = clubs.getClubDisplayName?.(match.opponent?.name ?? match.opponentName ?? match.opponent) ?? (match.opponent?.name ?? match.opponentName ?? match.opponent);
        const timelineHit = timelineItems.some((item) =>
          item.kind === 'euroResult'
          && (item.match?.fixtureId === match.fixtureId
            || (item.match?.club === match.club && item.match?.opponent === match.opponent && item.match?.score === match.score)
            || String(item.text ?? item.description ?? '').includes(`${displayClub} ${match.score} ${displayOpponent}`)
            || String(item.text ?? item.description ?? '').includes(`${match.score}`)
              && String(item.text ?? item.description ?? '').includes(displayOpponent))
        );
        if (!timelineHit) {
          anomalies.push({
            type: 'missing_europe_feed_card',
            week: beforeWeek,
            match: `${match.club} ${match.score} ${match.opponent}`,
            competition: match.competition,
          });
        }
        if (![2, 3].includes(match.simulatedDay)) {
          anomalies.push({
            type: 'europe_wrong_day',
            week: beforeWeek,
            match: `${match.club} ${match.score} ${match.opponent}`,
            simulatedDay: match.simulatedDay,
          });
        }
      });

      const europeByFixture = asArray(report.euroMatchResults).reduce((map, match) => {
        if (!match?.fixtureId) return map;
        const list = map.get(match.fixtureId) ?? [];
        list.push(match);
        map.set(match.fixtureId, list);
        return map;
      }, new Map());
      europeByFixture.forEach((matches, fixtureId) => {
        const scoreSet = new Set(matches.map(normalizeFixturePerspectiveScore));
        if (scoreSet.size > 1) {
          anomalies.push({
            type: 'conflicting_europe_fixture_score',
            week: beforeWeek,
            fixtureId,
            scores: [...scoreSet],
          });
        }
      });
    }

    const marseillePlayed = maxGabrielClubLeaguePlayed;
    assert(marseillePlayed >= 33, `Championnat incomplet pour ${gabriel.club}: ${marseillePlayed} matchs joués.`);

    const wcState = state.worldCupState;
    assert(wcState?.phase === 'done', 'La Coupe du Monde ne finit pas proprement à la fin de la saison.', wcState);
    assert(wcState?.champion?.name, 'La Coupe du Monde ne donne pas de champion lisible.', wcState?.champion);

    const wcCountryResults = asArray(wcState.countryResults);
    for (const phase of new Set(wcCountryResults.map((match) => match.phase))) {
      const phaseMatches = wcCountryResults.filter((match) => match.phase === phase);
      const counts = new Map();
      phaseMatches.forEach((match) => {
        counts.set(match.homeCode, (counts.get(match.homeCode) ?? 0) + 1);
        counts.set(match.awayCode, (counts.get(match.awayCode) ?? 0) + 1);
      });
      counts.forEach((count, code) => {
        if (count > 1) {
          anomalies.push({ type: 'world_cup_duplicate_country', phase, code, count });
        }
      });
    }

    const selectedAgencyPlayers = asArray(wcState.selectedPlayers).filter((entry) => agencyPlayerIds.has(entry.playerId));
    const lastWcReport = [...reports].reverse().find((report) => asArray(report.worldCupMatchResults).length);
    if (selectedAgencyPlayers.length) {
      assert(lastWcReport, 'Aucun résultat Coupe du Monde ne remonte dans le fil hebdomadaire alors qu’un joueur agence est sélectionné.');
      const foreignWcPlayers = asArray(lastWcReport.worldCupMatchResults)
        .filter((match) => !agencyPlayerIds.has(match.playerId));
      assert(!foreignWcPlayers.length, 'Le fil Coupe du Monde affiche encore des joueurs hors agence.', foreignWcPlayers.slice(0, 5));
    }

    const euroKey = `CL:1`;
    const clData = state.europeanCupData?.[euroKey];
    assert(clData, 'Données Ligue des Champions absentes après une saison.');
    const fixtureList = euro.getEuropeanFixtureList(clData);
    const agencyEuropeFixtures = fixtureList.filter((fixture) =>
      agencyClubs.has(fixture.home) || agencyClubs.has(fixture.away)
    );
    const koFixtures = agencyEuropeFixtures.filter((fixture) => fixture.stage && fixture.stage !== 'league');
    const globalKoFixtures = fixtureList.filter((fixture) => fixture.stage && fixture.stage !== 'league');
    assert(agencyEuropeFixtures.length > 0, 'Aucun match européen canonique trouvé pour les joueurs de l’agence.');
    assert(koFixtures.length > 0, 'Aucun passage KO visible pour le club testé en Europe.');
    assert(koFixtures.some((fixture) => fixture.stage === 'playoff'), 'Les barrages européens ne sont pas visibles pour le club testé.');
    assert(globalKoFixtures.some((fixture) => fixture.stage === 'roundOf16'), 'Les 1/8 européens ne sont pas générés dans la compétition.');

    const duplicateFixtureIds = fixtureList
      .map((fixture) => fixture.id ?? fixture.fixtureId)
      .filter(Boolean)
      .filter((id, index, ids) => ids.indexOf(id) !== index);
    assert(!duplicateFixtureIds.length, 'Fixtures européennes dupliquées dans la compétition.', duplicateFixtureIds);

    const playedStageByWeek = reports
      .flatMap((report) => asArray(report.euroMatchResults).map((match) => ({
        week: report.week,
        competition: match.competition,
        stage: match.stage,
        phase: match.phase,
        fixtureId: match.fixtureId,
        label: `${match.club} ${match.score} ${match.opponent}`,
      })))
      .filter((match) => match.competition === 'CL');

    assert(!anomalies.length, 'Anomalies détectées pendant la saison QA.', anomalies);

    console.log(JSON.stringify({
      status: 'OK',
      signedPlayers: state.roster.map((player) => `${player.firstName} ${player.lastName} (${player.club})`),
      finalWeek: state.week,
      leaguePlayedForGabrielClub: marseillePlayed,
      worldCupChampion: `${wcState.champion.flag ?? ''} ${wcState.champion.name}`.trim(),
      europeAgencyFixtures: agencyEuropeFixtures.length,
      europeAgencyKnockoutFixtures: koFixtures.length,
      europeTimelineResults: playedStageByWeek,
      worldCupReportCount: asArray(lastWcReport?.worldCupMatchResults).length,
      finalDate: season.getCalendarSnapshot(state.week).dateLabel,
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
