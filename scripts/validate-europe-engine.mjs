import { createServer } from 'vite';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const pairKey = (match) => [match.home, match.away].sort().join('|');
const clubNames = (matches) => matches.flatMap((match) => [match.home, match.away]);

const validateUniqueMatchday = (fixtures, competition) => {
  const grouped = new Map();
  fixtures.forEach((fixture) => {
    if (fixture.stage !== 'league') return;
    const key = `${competition}:md${fixture.matchdayIndex}`;
    if (!grouped.has(key)) grouped.set(key, new Set());
    const used = grouped.get(key);
    assert(!used.has(fixture.home), `${competition} ${key}: ${fixture.home} joue deux fois la meme journee`);
    assert(!used.has(fixture.away), `${competition} ${key}: ${fixture.away} joue deux fois la meme journee`);
    used.add(fixture.home);
    used.add(fixture.away);
  });
};

const validateRound = (data, stage, week, expected) => {
  const round = data.bracketState?.rounds?.[`${stage}:${week}`];
  assert(round, `${stage}:${week} manquant`);
  assert((round.matches ?? []).length === expected, `${stage}:${week} attendu ${expected} matchs, recu ${(round.matches ?? []).length}`);
  const names = clubNames(round.matches ?? []);
  assert(new Set(names).size === names.length, `${stage}:${week} un club apparait deux fois dans le meme tour`);
  return round;
};

const validateTwoLegStage = (data, stage, weeks, expected) => {
  const first = validateRound(data, stage, weeks[0], expected);
  const second = validateRound(data, stage, weeks[1], expected);
  const firstPairs = new Set((first.matches ?? []).map(pairKey));
  const secondPairs = new Set((second.matches ?? []).map(pairKey));
  assert(firstPairs.size === secondPairs.size, `${stage}: nombre d'affiches different entre aller et retour`);
  firstPairs.forEach((pair) => assert(secondPairs.has(pair), `${stage}: affiche retour differente pour ${pair}`));
  const winners = data.bracketState?.stageWinners?.[stage] ?? [];
  assert(winners.length === expected, `${stage}: attendu ${expected} qualifies, recu ${winners.length}`);
  const winnerNames = new Set(winners.map((club) => club.name ?? club));
  const losers = new Set((second.matches ?? []).map((match) => match.loser).filter(Boolean));
  winnerNames.forEach((name) => assert(!losers.has(name), `${stage}: ${name} est gagnant et perdant`));
  return winnerNames;
};

const validateNoEliminatedInNextStage = (data, previousStage, nextStage, nextWeek) => {
  const previousLosers = new Set(
    Object.values(data.bracketState?.rounds ?? {})
      .filter((round) => round.stage === previousStage && round.isDecider)
      .flatMap((round) => (round.matches ?? []).map((match) => match.loser).filter(Boolean)),
  );
  const nextRound = data.bracketState?.rounds?.[`${nextStage}:${nextWeek}`];
  if (!nextRound) return;
  clubNames(nextRound.matches ?? []).forEach((club) => {
    assert(!previousLosers.has(club), `${club} elimine en ${previousStage} reapparait en ${nextStage}`);
  });
};

const vite = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, entries: [] },
});
try {
  const euro = await vite.ssrLoadModule('/src/systems/europeanCupSystem.js');
  for (const competition of ['CL', 'EL', 'ECL']) {
    const season = 1;
    let data = euro.initEuroCupCompData(competition, season);
    data = euro.ensureEuropeanLeagueFixtures(data, competition, season, []);
    const fixtures = euro.getEuropeanFixtureList(data);
    validateUniqueMatchday(fixtures, competition);

    const fullLeague = euro.buildEuropeanLeagueSnapshot({
      competition,
      season,
      seasonWeek: 38,
      includeCurrentMatchday: true,
      compData: data,
      agentClubNames: [],
    });
    assert(fullLeague.length >= 36, `${competition}: classement phase de ligue incomplet`);
    assert(fullLeague.filter((row) => row.leagueStatus === 'roundOf16').length === 8, `${competition}: top 8 incorrect`);
    assert(fullLeague.filter((row) => row.leagueStatus === 'playoff').length === 16, `${competition}: barragistes incorrects`);
    assert(fullLeague.filter((row) => row.leagueStatus === 'eliminated').length >= 12, `${competition}: elimines phase de ligue incorrects`);

    const agentClubs = fullLeague.slice(0, 3).map((row) => row.name);
    const schedule = (await vite.ssrLoadModule('/src/systems/competitionCalendarSystem.js')).EUROPEAN_SCHEDULE[competition];
    const stages = [
      ['playoff', schedule.playoff, 8],
      ['roundOf16', schedule.roundOf16, 8],
      ['quarters', schedule.quarters, 4],
      ['semis', schedule.semis, 2],
    ];
    for (const [stage, weeks, expected] of stages) {
      data = euro.ensureEuropeanCompetitionProgress(data, competition, season, weeks[0], agentClubs);
      data = euro.ensureEuropeanCompetitionProgress(data, competition, season, weeks[1], agentClubs);
      validateTwoLegStage(data, stage, weeks, expected);
      const nextStage = stages[stages.findIndex(([key]) => key === stage) + 1]?.[0] ?? 'final';
      const nextWeek = stages[stages.findIndex(([key]) => key === stage) + 1]?.[1]?.[0] ?? schedule.final[0];
      data = euro.ensureEuropeanCompetitionProgress(data, competition, season, nextWeek, agentClubs);
      validateNoEliminatedInNextStage(data, stage, nextStage, nextWeek);
    }
    data = euro.ensureEuropeanCompetitionProgress(data, competition, season, schedule.final[0], agentClubs);
    const final = validateRound(data, 'final', schedule.final[0], 1);
    assert(data.winner && data.champion, `${competition}: vainqueur final manquant`);
    assert(final.matches[0].winner === data.winner, `${competition}: vainqueur final incoherent`);
  }
  console.log('Europe engine validation OK');
} finally {
  await vite.close();
}
