import { CLUBS_BY_ID, getClubId } from './identitySystem';

const asArray = (value) => (Array.isArray(value) ? value : []);

const toInt = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getAllPlayers = (state = {}) => ([
  ...asArray(state.roster),
  ...asArray(state.market),
  ...asArray(state.freeAgents),
]).filter(Boolean);

export const allocateNextPlayerIdentity = (state = {}) => {
  const current = toInt(state?.idRegistry?.nextPlayerId, 1) ?? 1;
  return {
    id: `player_${current}`,
    permanentId: current,
    idRegistry: {
      ...(state.idRegistry ?? {}),
      nextPlayerId: current + 1,
    },
  };
};

export const ensurePermanentPlayerIds = (state = {}) => {
  const players = getAllPlayers(state);
  const existing = players
    .map((player) => toInt(player?.permanentId))
    .filter((value) => value != null);
  let nextPlayerId = Math.max(
    toInt(state?.idRegistry?.nextPlayerId, 1) ?? 1,
    (existing.length ? Math.max(...existing) + 1 : 1),
  );

  const assign = (player) => {
    if (!player || typeof player !== 'object') return player;
    if (toInt(player.permanentId) != null) return player;
    const withId = { ...player, permanentId: nextPlayerId };
    nextPlayerId += 1;
    return withId;
  };

  return {
    ...state,
    roster: asArray(state.roster).map(assign),
    market: asArray(state.market).map(assign),
    freeAgents: asArray(state.freeAgents).map(assign),
    idRegistry: {
      ...(state.idRegistry ?? {}),
      nextPlayerId,
    },
  };
};

const normalizeContact = (contact = {}) => {
  const clubId = contact.clubId ?? getClubId(contact.club);
  return { ...contact, clubId: clubId ?? null };
};

const normalizeDossierMemory = (dossierMemory = {}) => {
  const clubs = Object.entries(dossierMemory.clubs ?? {}).reduce((acc, [clubRef, entry]) => {
    const clubId = getClubId(clubRef);
    if (!clubId) return acc;
    acc[clubId] = entry;
    return acc;
  }, {});
  return {
    ...dossierMemory,
    clubs,
  };
};

export const enforceIdOnlyRelations = (state = {}) => ({
  ...state,
  contacts: asArray(state.contacts).map(normalizeContact),
  dossierMemory: normalizeDossierMemory(state.dossierMemory ?? {}),
});

export const validateAndRepairForeignKeys = (state = {}) => {
  const playersById = new Set(getAllPlayers(state).map((player) => player.id).filter(Boolean));
  const clubsById = new Set([
    ...CLUBS_BY_ID.keys(),
    ...getAllPlayers(state).map((player) => player.clubId ?? getClubId(player.club)).filter(Boolean),
  ]);

  const validOffer = (offer) => offer?.playerId && offer?.clubId && playersById.has(offer.playerId) && clubsById.has(offer.clubId);
  const validTransfer = (transfer) => transfer?.playerId
    && playersById.has(transfer.playerId)
    && (transfer.toClubId || transfer.offer?.clubId);
  const validContractCarrier = (player) => player?.id && playersById.has(player.id) && (!player.clubId || clubsById.has(player.clubId));
  const validMatch = (match) =>
    (match?.playerId ? playersById.has(match.playerId) : true)
    && (!match?.clubId || clubsById.has(match.clubId))
    && (!match?.opponentClubId || clubsById.has(match.opponentClubId));
  const validFixture = (fixture) =>
    (!fixture?.homeClubId || clubsById.has(fixture.homeClubId))
    && (!fixture?.awayClubId || clubsById.has(fixture.awayClubId));

  const roster = asArray(state.roster).filter(validContractCarrier);
  const market = asArray(state.market).filter(validContractCarrier);
  const freeAgents = asArray(state.freeAgents).filter(validContractCarrier);

  return {
    ...state,
    roster,
    market,
    freeAgents,
    clubOffers: asArray(state.clubOffers).filter(validOffer),
    pendingTransfers: asArray(state.pendingTransfers).filter(validTransfer),
    transferHistory: asArray(state.transferHistory).filter((transfer) => transfer?.playerId && playersById.has(transfer.playerId)),
    matchResultStore: asArray(state.matchResultStore).filter(validMatch),
    matchCalendar: asArray(state.matchCalendar).filter(validFixture),
    nextFixtures: asArray(state.nextFixtures).filter(validFixture),
    lastFixtures: asArray(state.lastFixtures).filter(validFixture),
  };
};

export const applyRuntimeIntegrity = (state = {}) =>
  validateAndRepairForeignKeys(enforceIdOnlyRelations(ensurePermanentPlayerIds(state)));
