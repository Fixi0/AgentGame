const asArray = (value) => (Array.isArray(value) ? value : []);

const byId = (map = {}, id = null) => (id ? map[String(id)] ?? null : null);

export const createEntityRepositories = (entityDb = {}) => {
  const tables = entityDb.tables ?? {};
  const indexes = entityDb.indexes ?? {};
  const idMaps = entityDb.byId ?? {};

  return {
    players: {
      get: (playerId) => byId(idMaps.players, playerId),
      byClub: (clubId) => asArray(indexes.playersByClubId?.[clubId]),
      roster: () => asArray(indexes.playersByMarketStatus?.roster),
      market: () => asArray(indexes.playersByMarketStatus?.market),
      freeAgents: () => asArray(indexes.playersByMarketStatus?.free_agent),
      all: () => asArray(tables.players),
    },
    clubs: {
      get: (clubId) => byId(idMaps.clubs, clubId),
      all: () => asArray(tables.clubs),
    },
    fixtures: {
      get: (fixtureId) => byId(idMaps.fixtures, fixtureId),
      byClub: (clubId) => asArray(indexes.fixturesByClubId?.[clubId]),
      byWeek: (week) => asArray(indexes.fixturesByWeek?.[week]),
      played: () => asArray(indexes.fixturesByStatus?.played),
      scheduled: () => asArray(indexes.fixturesByStatus?.scheduled),
      all: () => asArray(tables.fixtures),
    },
    results: {
      get: (resultId) => byId(idMaps.matchResults, resultId),
      byFixture: (fixtureId) => asArray(indexes.resultsByFixtureId?.[fixtureId]),
      byPlayer: (playerId) => asArray(indexes.resultsByPlayerId?.[playerId]),
      all: () => asArray(tables.matchResults),
    },
    offers: {
      get: (offerId) => byId(idMaps.offers, offerId),
      byPlayer: (playerId) => asArray(indexes.offersByPlayerId?.[playerId]),
      all: () => asArray(tables.offers),
    },
    contracts: {
      get: (contractId) => byId(idMaps.contracts, contractId),
      byPlayer: (playerId) => asArray(indexes.contractsByPlayerId?.[playerId]),
      all: () => asArray(tables.contracts),
    },
    transfers: {
      get: (transferId) => byId(idMaps.transfers, transferId),
      byPlayer: (playerId) => asArray(indexes.transfersByPlayerId?.[playerId]),
      all: () => asArray(tables.transfers),
    },
    messages: {
      get: (messageId) => byId(idMaps.messages, messageId),
      byPlayer: (playerId) => asArray(indexes.messagesByPlayerId?.[playerId]),
      all: () => asArray(tables.messages),
    },
    news: {
      get: (postId) => byId(idMaps.newsPosts, postId),
      all: () => asArray(tables.newsPosts),
    },
  };
};
