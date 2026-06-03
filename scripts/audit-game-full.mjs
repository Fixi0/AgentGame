import { createServer } from 'vite';

const assert = (condition, message, details = null) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const createSeededRandom = (seed = 123456789) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const textOf = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textOf).join(' ');
  if (typeof value === 'object') return Object.values(value).map(textOf).join(' ');
  return '';
};

const BANNED_VISIBLE_TEXT = [
  /\bundefined\b/i,
  /\bnull\b/i,
  /simul[ée]s? une seule fois/i,
  /partag[ée]s? entre tous les joueurs/i,
  /rencontres de championnat dans ce bloc/i,
  /sourceState is not defined/i,
  /Ligue 1 McDonald/i,
  /\bUEFA\b/i,
  /\bPSG\b/i,
  /Paris Saint-Germain/i,
  /\bAtalanta\b/i,
];

const visibleMessagePayload = (message = {}) => ({
  threadLabel: message.threadLabel,
  senderName: message.senderName,
  subject: message.subject,
  body: message.body,
  responseText: message.responseText,
});

const visibleNewsPayload = (post = {}) => ({
  accountName: post.accountName ?? post.account?.name,
  title: post.title,
  text: post.text,
  label: post.label,
});

const visibleSocialPayload = (post = {}) => ({
  authorName: post.authorName,
  handle: post.handle,
  tag: post.tag,
  text: post.text,
  commentsList: post.commentsList,
  list: post.list,
  account: post.account ? { name: post.account.name } : null,
});

const visibleTimelinePayload = (item = {}) => ({
  day: item.day,
  dateLabel: item.dateLabel,
  title: item.title,
  text: item.text,
  description: item.description,
  chips: item.chips,
});

const assertCleanVisibleText = (label, value, anomalies) => {
  const text = textOf(value);
  BANNED_VISIBLE_TEXT.forEach((pattern) => {
    if (pattern.test(text)) {
      anomalies.push({ type: 'visible_text_forbidden', label, pattern: String(pattern), sample: text.slice(0, 320) });
    }
  });
};

const flattenLeagueRows = (leagueTables = {}) =>
  Object.entries(leagueTables ?? {}).flatMap(([countryCode, table]) =>
    Object.values(table ?? {}).map((row) => ({ countryCode, ...row })),
  );

const sortLeague = (rows = []) =>
  [...rows].sort((a, b) =>
    (b.points ?? 0) - (a.points ?? 0)
    || ((b.goalsFor ?? 0) - (b.goalsAgainst ?? 0)) - ((a.goalsFor ?? 0) - (a.goalsAgainst ?? 0))
    || (b.goalsFor ?? 0) - (a.goalsFor ?? 0),
  );

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

const makeOffer = (state, player, club, overrides = {}) => ({
  id: `audit_offer_${player.id}_${club.name}_${state.week}_${Math.random().toString(16).slice(2)}`,
  week: state.week,
  expiresWeek: state.week + 4,
  window: 'audit',
  preWindow: false,
  effectiveWeek: state.week,
  playerId: player.id,
  playerName: `${player.firstName} ${player.lastName}`.trim(),
  club: club.name,
  clubTier: club.tier,
  clubCountry: club.flag ?? '',
  clubCountryCode: club.countryCode,
  clubCity: club.city,
  price: Math.max(1_000_000, Math.floor((player.value ?? 1_000_000) * 1.15)),
  salMult: 1.35,
  status: 'open',
  actionSource: 'audit',
  ...overrides,
});

const getClub = (clubs, name) => {
  const club = clubs.find((item) => item.name === name);
  assert(club, `Club introuvable pour audit: ${name}`);
  return club;
};

const sign = (game, state, player) => {
  const result = game.signPlayer(state, { ...player, signingCost: 0 });
  assert(!result.error, `Signature impossible: ${player?.firstName} ${player?.lastName} (${result.error})`);
  return result.state;
};

const acceptForcedTransfer = (game, state, playerId, club, negotiatedOutcome = {}) => {
  const player = state.roster.find((item) => item.id === playerId);
  assert(player, `Joueur introuvable pour transfert: ${playerId}`);
  const offer = makeOffer(state, player, club);
  const stateWithOffer = { ...state, clubOffers: [offer, ...(state.clubOffers ?? [])] };
  const result = game.acceptClubOffer(stateWithOffer, offer.id, {
    price: offer.price,
    salMult: offer.salMult,
    contractWeeks: 156,
    role: player.rating >= 160 ? 'Titulaire' : 'Rotation',
    signingBonus: Math.floor((player.weeklySalary ?? 10_000) * 8),
    releaseClause: Math.floor((player.value ?? 1_000_000) * 2),
    sellOnPercent: 8,
    clubBonuses: { total: Math.floor((player.weeklySalary ?? 10_000) * 10) },
    ...negotiatedOutcome,
  });
  assert(!result.error, `Acceptation transfert impossible: ${result.error}`);
  return result.state;
};

const validateWeeklyReport = ({ report, state, agencyPlayerIds, agencyClubs, anomalies }) => {
  assertCleanVisibleText(`week_${report.week}_timeline`, asArray(report.weekTimeline).map(visibleTimelinePayload), anomalies);
  assertCleanVisibleText(`week_${report.week}_messages`, asArray(state.messages).map(visibleMessagePayload), anomalies);
  assertCleanVisibleText(`week_${report.week}_news`, asArray(state.news).map(visibleNewsPayload), anomalies);

  const byFixture = new Map();
  asArray(report.euroMatchResults).forEach((match) => {
    if (!match?.fixtureId) return;
    const list = byFixture.get(match.fixtureId) ?? [];
    list.push(match);
    byFixture.set(match.fixtureId, list);
    if ((agencyPlayerIds.has(match.playerId) || agencyClubs.has(match.club)) && ![2, 3].includes(match.simulatedDay)) {
      anomalies.push({ type: 'europe_wrong_day', week: report.week, fixtureId: match.fixtureId, simulatedDay: match.simulatedDay });
    }
  });
  byFixture.forEach((matches, fixtureId) => {
    const normalized = new Set(matches.map(normalizeFixturePerspectiveScore));
    if (normalized.size > 1) anomalies.push({ type: 'conflicting_europe_score', week: report.week, fixtureId, matches });
  });

  const countryUse = new Map();
  asArray(report.internationalBreakSummary?.matches).forEach((match) => {
    const list = countryUse.get(match.countryCode) ?? new Set();
    list.add(match.sharedMatchId);
    countryUse.set(match.countryCode, list);
  });
  countryUse.forEach((fixtures, code) => {
    if (fixtures.size > 1) anomalies.push({ type: 'international_country_duplicate', week: report.week, code, fixtures: [...fixtures] });
  });
};

const runTwoSeasonInteractiveAudit = async ({ game, squads, clubsMod, socialMod }) => {
  Math.random = createSeededRandom(77);
  const catalog = squads.createPlayerCatalog(1);
  const gabriel = catalog.find((player) => player.id === squads.GABRIEL_FIXIO_ID);
  const second = catalog.find((player) => player.id !== gabriel?.id && player.club === gabriel?.club && !player.freeAgent)
    ?? catalog.find((player) => player.id !== gabriel?.id && !player.freeAgent);
  assert(gabriel, 'Gabriel Fixio introuvable.');
  assert(second, 'Deuxième joueur introuvable.');

  let state = game.createFreshState();
  state = {
    ...state,
    gameSeed: 'audit-two-seasons',
    money: 100_000_000,
    reputation: 120,
    agencyLevel: 5,
    market: [gabriel, second, ...state.market].filter(Boolean),
  };
  state = sign(game, state, gabriel);
  state = sign(game, state, second);

  const clubs = clubsMod.CLUBS;
  const bergame = getClub(clubs, 'Atalanta');
  const paris = getClub(clubs, 'PSG');

  const anomalies = [];
  const agencyPlayerIds = new Set(state.roster.map((player) => player.id));
  let agencyClubs = new Set(state.roster.map((player) => player.club));
  const transferLog = [];

  state = acceptForcedTransfer(game, state, gabriel.id, bergame);
  transferLog.push(`${gabriel.firstName} ${gabriel.lastName}: Marseille -> Atalanta`);
  state = {
    ...state,
    messages: [
      {
        id: 'audit_old_ds_message',
        week: state.week,
        type: 'ds_dialogue',
        context: 'audit_old_club',
        playerId: gabriel.id,
        playerName: `${gabriel.firstName} ${gabriel.lastName}`,
        threadKey: `${gabriel.id}:staff:ds`,
        threadLabel: 'DS de Bergame',
        senderRole: 'staff',
        senderName: 'DS de Bergame',
        subject: 'Ancien dossier',
        body: 'Ancien message qui ne doit pas rester actif après un nouveau transfert.',
        read: false,
        resolved: false,
      },
      ...(state.messages ?? []),
    ],
  };
  state = acceptForcedTransfer(game, state, gabriel.id, paris);
  transferLog.push(`${gabriel.firstName} ${gabriel.lastName}: Atalanta -> PSG`);

  const staleStaff = asArray(state.messages).filter((message) =>
    !message.resolved
    && message.playerId === gabriel.id
    && /Bergame|Atalanta/i.test(textOf(message)),
  );
  if (staleStaff.length) anomalies.push({ type: 'stale_old_club_message_after_transfer', staleStaff });

  for (let step = 0; step < 76; step += 1) {
    const result = game.playWeek(state);
    state = result.state;
    agencyClubs = new Set(state.roster.map((player) => player.club));
    validateWeeklyReport({ report: result.report, state, agencyPlayerIds, agencyClubs, anomalies });

    const posts = socialMod.buildInstaProPosts({ state }).slice(0, 8);
    posts.forEach((post, index) => {
      if (!post.image) anomalies.push({ type: 'social_post_without_image', week: state.week, id: post.id });
      assertCleanVisibleText(`social_post_${state.week}_${index}`, visibleSocialPayload(post), anomalies);
    });
  }

  const wcState = state.worldCupState;
  assert(wcState?.phase === 'done', 'Coupe du Monde non terminée après 2 saisons audit.', wcState);
  assert(wcState?.champion?.name, 'Coupe du Monde sans vainqueur lisible après audit.', wcState?.champion);

  assert(!anomalies.length, 'Audit 2 saisons: anomalies détectées.', anomalies.slice(0, 20));

  return {
    finalWeek: state.week,
    roster: state.roster.map((player) => `${player.firstName} ${player.lastName} (${player.club})`),
    transfers: transferLog,
    worldCupChampion: `${wcState.champion.flag ?? ''} ${wcState.champion.name}`.trim(),
    messagesChecked: asArray(state.messages).length,
    newsChecked: asArray(state.news).length,
  };
};

const runLongBalanceAudit = async ({ game, squads }) => {
  Math.random = createSeededRandom(910);
  const catalog = squads.createPlayerCatalog(1);
  const gabriel = catalog.find((player) => player.id === squads.GABRIEL_FIXIO_ID);
  let state = game.createFreshState();
  state = {
    ...state,
    gameSeed: 'audit-ten-season-balance',
    money: 100_000_000,
    reputation: 150,
    agencyLevel: 5,
    market: [gabriel, ...state.market].filter(Boolean),
  };
  state = sign(game, state, gabriel);

  const eliteClubs = new Set(['PSG', 'Real Madrid', 'Barcelona', 'Man City', 'Liverpool', 'Bayern', 'Arsenal', 'Inter']);
  const seasonSnapshots = [];
  const clWinners = {};
  const leagueWinners = {};
  const weakEliteFinishes = [];
  const emptyLeagueReads = [];

  for (let seasonIndex = 1; seasonIndex <= 10; seasonIndex += 1) {
    for (let i = 0; i < 38; i += 1) {
      state = game.playWeek(state).state;
    }
    const leagues = {};
    Object.entries(state.leagueTables ?? {}).forEach(([countryCode, table]) => {
      const sorted = sortLeague(Object.values(table ?? {}));
      const winner = sorted[0]?.club ?? sorted[0]?.name;
      if (!Number(sorted[0]?.played ?? 0) || !Number(sorted[0]?.points ?? 0)) {
        emptyLeagueReads.push({ season: seasonIndex, countryCode, winner, row: sorted[0] });
      }
      if (winner) {
        leagues[countryCode] = winner;
        leagueWinners[`${countryCode}:${winner}`] = (leagueWinners[`${countryCode}:${winner}`] ?? 0) + 1;
      }
      sorted.forEach((row, index) => {
        const club = row.club ?? row.name;
        if (eliteClubs.has(club) && index >= 10) {
          weakEliteFinishes.push({ season: seasonIndex, countryCode, club, position: index + 1, points: row.points, played: row.played });
        }
      });
    });
    const clData = state.europeanCupData?.[`CL:${seasonIndex}`];
    if (clData?.champion || clData?.winner) {
      const winner = clData.champion ?? clData.winner;
      clWinners[winner] = (clWinners[winner] ?? 0) + 1;
    }
    seasonSnapshots.push({ season: seasonIndex, leagues, championsLeague: clData?.champion ?? clData?.winner ?? null });
  }

  assert(Object.values(clWinners).reduce((sum, count) => sum + count, 0) >= 8, 'Audit 10 saisons: trop peu de vainqueurs LDC enregistrés.', clWinners);
  assert(weakEliteFinishes.length <= 8, 'Audit 10 saisons: trop de gros clubs finissent anormalement bas.', weakEliteFinishes.slice(0, 20));
  assert(!emptyLeagueReads.length, 'Audit 10 saisons: lecture de champions sur classement vide/reset.', emptyLeagueReads.slice(0, 20));
  assert(Object.keys(leagueWinners).length >= 40, 'Audit 10 saisons: champions nationaux trop répétitifs.', leagueWinners);

  return {
    seasons: 10,
    finalWeek: state.week,
    championsLeagueWinners: clWinners,
    leagueWinners,
    weakEliteFinishes,
    sample: seasonSnapshots.slice(0, 3),
  };
};

const run = async () => {
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
    const clubsMod = await server.ssrLoadModule('/src/data/clubs.js');
    const socialMod = await server.ssrLoadModule('/src/components/Social.jsx');

    const twoSeason = await runTwoSeasonInteractiveAudit({ game, squads, clubsMod, socialMod });
    const balance = await runLongBalanceAudit({ game, squads });

    console.log(JSON.stringify({
      status: 'OK',
      twoSeason,
      balance,
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
