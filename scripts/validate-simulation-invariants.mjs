import { createServer } from 'vite';

const assert = (condition, message, details = null) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const stat = (players = [], key) => {
  const values = players.map((player) => Number(player?.[key] ?? 0)).filter(Number.isFinite);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length),
  };
};

const run = async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const squads = await server.ssrLoadModule('/src/data/squadDatabase.js');
    const dynamicPotential = await server.ssrLoadModule('/src/systems/dynamicPotentialSystem.js');
    const trophies = await server.ssrLoadModule('/src/systems/individualTrophiesSystem.js');
    const matchSystem = await server.ssrLoadModule('/src/systems/matchSystem.js');
    const clubsMod = await server.ssrLoadModule('/src/data/clubs.js');
    const seasonSystem = await server.ssrLoadModule('/src/systems/seasonSystem.js');

    const cappedPlayer = dynamicPotential.applyDynamicPotential({
      id: 'cap-test',
      firstName: 'Cap',
      lastName: 'Test',
      age: 25,
      rating: 205,
      potential: 205,
      form: 95,
      moral: 95,
      trust: 95,
      seasonStats: { appearances: 38, goals: 30, assists: 20, averageRating: 8.9, injuries: 0 },
    });
    assert(cappedPlayer.rating <= 200 && cappedPlayer.potential <= 200, 'Potentiel/rating au-dessus du plafond 200.', cappedPlayer);
    assert(cappedPlayer.potential >= cappedPlayer.rating, 'Potential inférieur au rating après clamp.', cappedPlayer);

    const trophyState = {
      week: 38,
      roster: [{
        id: 'goal-machine',
        firstName: 'Goal',
        lastName: 'Machine',
        position: 'ATT',
        club: 'PSG',
        countryFlag: '🇫🇷',
        rating: 170,
        potential: 185,
        seasonStats: { appearances: 34, goals: 31, assists: 14, averageRating: 8.4 },
      }],
    };
    const computedTrophies = trophies.computeSeasonTrophies(trophyState);
    assert(computedTrophies.goldenBoot?.playerId === 'goal-machine' && computedTrophies.goldenBoot?.goals === 31,
      'Soulier d’Or ne lit pas correctement seasonStats.goals.',
      computedTrophies.goldenBoot);
    assert(computedTrophies.playmaker?.playerId === 'goal-machine' && computedTrophies.playmaker?.assists === 14,
      'Meilleur passeur ne lit pas correctement seasonStats.assists.',
      computedTrophies.playmaker);

    const catalogSnapshots = [1, 5, 10, 20].map((season) => {
      const catalog = squads.createPlayerCatalog(season);
      return {
        season,
        count: catalog.length,
        under21: catalog.filter((player) => player.age <= 21).length,
        under18: catalog.filter((player) => player.age <= 18).length,
        over34: catalog.filter((player) => player.age >= 34).length,
        age: stat(catalog, 'age'),
        rating: stat(catalog, 'rating'),
        potential: stat(catalog, 'potential'),
      };
    });
    const season20 = catalogSnapshots.find((item) => item.season === 20);
    assert(season20.under21 > 1500, 'Pipeline newgen insuffisant en saison 20.', season20);
    assert(season20.under18 > 600, 'Trop peu de très jeunes profils en saison 20.', season20);
    assert(season20.age.avg < 30, 'Age moyen catalogue trop vieux en saison 20.', season20);
    assert(season20.age.max <= 41, 'Catalogue avec joueurs non-signature trop âgés.', season20);
    assert(catalogSnapshots.every((item) => item.rating.max <= 200 && item.potential.max <= 200),
      'Rating/potential catalogue hors plafond.',
      catalogSnapshots);

    const leagueCounts = new Map();
    for (let week = 1; week <= 38; week += 1) {
      const fixtures = matchSystem.buildWeeklyFixtures([], week).filter((fixture) => !fixture.competition || fixture.competition === 'LEAGUE');
      fixtures.forEach((fixture) => {
        [fixture.homeClub, fixture.awayClub].forEach((club) => {
          const key = `${club.countryCode}:${club.name}`;
          leagueCounts.set(key, (leagueCounts.get(key) ?? 0) + 1);
        });
      });
    }
    clubsMod.CLUBS.forEach((club) => {
      const countryClubCount = clubsMod.CLUBS.filter((item) => item.countryCode === club.countryCode).length;
      const expected = Math.max(0, (countryClubCount - 1) * 2);
      const played = leagueCounts.get(`${club.countryCode}:${club.name}`) ?? 0;
      assert(played === expected, 'Nombre de journées championnat incohérent.', {
        club: club.name,
        countryCode: club.countryCode,
        expected,
        played,
      });
    });

    const elitePlayer = {
      id: 'elite-agent-player',
      firstName: 'Elite',
      lastName: 'Player',
      rating: 190,
      potential: 196,
      value: 150_000_000,
    };
    const smallClub = clubsMod.CLUBS.find((club) => club.tier >= 3 && club.name !== elitePlayer.club);
    const impossibleOffer = seasonSystem.sanitizeOfferForContext({
      id: 'bad-offer',
      playerId: elitePlayer.id,
      clubId: smallClub.id,
      club: smallClub.name,
      price: 1_000_000,
      salMult: 3,
      status: 'open',
    }, { roster: [elitePlayer], week: 12 });
    assert(impossibleOffer === null, 'Offre elite vers club trop faible acceptée par le sanitizer.', impossibleOffer);

    console.log(JSON.stringify({
      status: 'OK',
      dynamicPotential: { rating: cappedPlayer.rating, potential: cappedPlayer.potential },
      trophies: {
        goldenBoot: computedTrophies.goldenBoot,
        playmaker: computedTrophies.playmaker,
      },
      catalogSnapshots,
      checkedLeagueClubs: clubsMod.CLUBS.length,
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
