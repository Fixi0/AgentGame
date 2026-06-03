import { CLUBS } from '../data/clubs';

export const slugId = (value = '') => String(value ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

export const ENTITY_PREFIX = {
  CLUB: 'club',
  PLAYER: 'player',
  COMPETITION: 'competition',
  FIXTURE: 'fixture',
  CONTRACT: 'contract',
  TRANSFER: 'transfer',
};

export const CLUBS_BY_ID = new Map(CLUBS.map((club) => [club.id, club]));
export const CLUBS_BY_NAME = new Map(CLUBS.map((club) => [club.name, club]));
export const CLUBS_BY_DISPLAY_NAME = new Map(CLUBS.map((club) => [club.displayName, club]));

export const getClubById = (clubId) => CLUBS_BY_ID.get(clubId) ?? null;

export const getClubByName = (clubName) => {
  if (!clubName || clubName === 'Libre') return null;
  if (CLUBS_BY_ID.has(clubName)) return CLUBS_BY_ID.get(clubName);
  return CLUBS_BY_NAME.get(clubName) ?? CLUBS_BY_DISPLAY_NAME.get(clubName) ?? null;
};

export const getClubId = (clubOrName) => {
  if (!clubOrName || clubOrName === 'Libre') return null;
  if (typeof clubOrName === 'object') {
    const existingId = clubOrName.clubId ? getClubId(clubOrName.clubId) : null;
    if (existingId) return existingId;
    const objectId = clubOrName.id ? getClubId(clubOrName.id) : null;
    if (objectId) return objectId;
    return getClubId(clubOrName.name ?? clubOrName.club);
  }
  if (CLUBS_BY_ID.has(clubOrName)) return clubOrName;
  if (String(clubOrName).startsWith(`${ENTITY_PREFIX.CLUB}_`)) return null;
  const club = getClubByName(clubOrName);
  return club?.id ?? `${ENTITY_PREFIX.CLUB}_${slugId(clubOrName)}`;
};

export const getClubName = (clubIdOrName) => {
  if (!clubIdOrName || clubIdOrName === 'Libre') return 'Libre';
  const club = getClubById(clubIdOrName) ?? getClubByName(clubIdOrName);
  return club?.name ?? clubIdOrName;
};

export const getClubIdentity = (clubOrName) => {
  const clubId = getClubId(clubOrName);
  const club = getClubById(clubId) ?? getClubByName(typeof clubOrName === 'object' ? clubOrName?.name : clubOrName);
  return {
    clubId,
    clubName: club?.name ?? (typeof clubOrName === 'object' ? clubOrName?.name ?? clubOrName?.club : clubOrName),
    club,
  };
};

export const withClubIdentity = (player = {}) => {
  const currentId = player.clubId && getClubById(player.clubId) ? player.clubId : null;
  const identity = getClubIdentity(currentId ?? player.club);
  const club = identity.club ?? getClubByName(player.club);
  const fallbackIdentity = !club && player.club ? getClubIdentity(player.club) : identity;
  const resolvedClub = club ?? fallbackIdentity.club;
  return {
    ...player,
    clubId: resolvedClub?.id ?? fallbackIdentity.clubId,
    club: player.club ?? fallbackIdentity.clubName,
    clubTier: player.clubTier ?? resolvedClub?.tier,
    clubCountryCode: player.clubCountryCode ?? resolvedClub?.countryCode,
    clubCity: player.clubCity ?? resolvedClub?.city,
  };
};

export const withOfferIdentity = (offer = {}) => {
  const clubId = offer.clubId ?? getClubId(offer.club);
  return {
    ...offer,
    clubId,
    club: offer.club ?? getClubName(clubId),
  };
};

export const withTransferIdentity = (transfer = {}) => {
  const fromClubId = transfer.fromClubId ?? getClubId(transfer.fromClub);
  const toClubId = transfer.toClubId ?? getClubId(transfer.toClub ?? transfer.offer?.club);
  return {
    ...transfer,
    fromClubId,
    toClubId,
    fromClub: transfer.fromClub ?? getClubName(fromClubId),
    toClub: transfer.toClub ?? getClubName(toClubId),
    offer: transfer.offer ? withOfferIdentity(transfer.offer) : transfer.offer,
  };
};

export const getCompetitionId = (competition = 'LEAGUE', season = 1, scope = '') =>
  `${ENTITY_PREFIX.COMPETITION}_${slugId(`${competition}_${season}_${scope}`)}`;

export const getFixtureIdentity = ({
  fixtureId,
  matchId,
  week = 1,
  day = 6,
  competition = 'LEAGUE',
  homeClub,
  awayClub,
  season = 1,
  leg = null,
} = {}) => {
  if (fixtureId || matchId) return String(fixtureId ?? matchId);
  const homeClubId = getClubId(homeClub);
  const awayClubId = getClubId(awayClub);
  return [
    ENTITY_PREFIX.FIXTURE,
    season,
    week,
    day,
    slugId(competition),
    homeClubId,
    awayClubId,
    leg ? `leg_${leg}` : null,
  ].filter(Boolean).join('_');
};

export const withCalendarMatchIdentity = (match = {}) => {
  const homeClubId = match.homeClubId ?? getClubId(match.homeClub ?? match.home ?? match.club);
  const awayClubId = match.awayClubId ?? getClubId(match.awayClub ?? match.away ?? match.opponent ?? match.opponentName);
  const fixtureId = getFixtureIdentity({
    fixtureId: match.fixtureId ?? match.id,
    week: match.week,
    day: match.day,
    competition: match.competition,
    homeClub: homeClubId,
    awayClub: awayClubId,
    season: match.season,
    leg: match.leg,
  });
  return {
    ...match,
    id: match.id ?? fixtureId,
    fixtureId,
    matchId: match.matchId ?? fixtureId,
    homeClubId,
    awayClubId,
  };
};

export const withPlayerMatchIdentity = (match = {}) => {
  const clubId = match.clubId ?? getClubId(match.club);
  const opponentClubId = match.opponentClubId ?? getClubId(match.opponent ?? match.opponentName);
  const fixtureId = getFixtureIdentity({
    fixtureId: match.fixtureId,
    week: match.week,
    day: match.day ?? match.simulatedDay,
    competition: match.competition,
    homeClub: match.homeClubId ?? clubId,
    awayClub: match.awayClubId ?? opponentClubId,
    season: match.season,
    leg: match.leg,
  });
  return {
    ...match,
    fixtureId,
    matchId: match.matchId ?? fixtureId,
    clubId,
    opponentClubId,
    club: match.club ?? getClubName(clubId),
    opponent: match.opponent ?? match.opponentName ?? getClubName(opponentClubId),
  };
};

export const buildIdentityIndexes = (state = {}) => {
  const players = [
    ...(Array.isArray(state.roster) ? state.roster : []),
    ...(Array.isArray(state.market) ? state.market : []),
    ...(Array.isArray(state.freeAgents) ? state.freeAgents : []),
  ].filter(Boolean);
  return {
    version: 1,
    playersById: Object.fromEntries(players.map((player) => [player.id, {
      id: player.id,
      clubId: player.clubId ?? getClubId(player.club),
      name: `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim(),
    }])),
    clubsById: Object.fromEntries(CLUBS.map((club) => [club.id, {
      id: club.id,
      name: club.name,
      displayName: club.displayName,
      countryCode: club.countryCode,
      tier: club.tier,
    }])),
    contractsByPlayerId: Object.fromEntries(
      (Array.isArray(state.roster) ? state.roster : [])
        .filter((player) => player?.id)
        .map((player) => [player.id, {
          playerId: player.id,
          contractWeeksLeft: player.contractWeeksLeft ?? 0,
          weeklySalary: player.weeklySalary ?? 0,
          clubId: player.clubId ?? getClubId(player.club),
          releaseClause: player.releaseClause ?? null,
          clubRole: player.clubRole ?? null,
        }]),
    ),
    offersByPlayerId: Object.fromEntries(
      (Array.isArray(state.clubOffers) ? state.clubOffers : [])
        .filter((offer) => offer?.playerId)
        .map((offer) => [offer.playerId, offer]),
    ),
    transfersByPlayerId: Object.fromEntries(
      (Array.isArray(state.transferHistory) ? state.transferHistory : [])
        .filter((transfer) => transfer?.playerId)
        .map((transfer) => [transfer.playerId, transfer]),
    ),
  };
};

const mapArray = (value, mapper) => (Array.isArray(value) ? value.map(mapper).filter(Boolean) : []);

export const migrateIdentityState = (state = {}) => {
  const migrated = {
    ...state,
    roster: mapArray(state.roster, withClubIdentity),
    market: mapArray(state.market, withClubIdentity),
    freeAgents: mapArray(state.freeAgents, withClubIdentity),
    clubOffers: mapArray(state.clubOffers, withOfferIdentity),
    pendingTransfers: mapArray(state.pendingTransfers, withTransferIdentity),
    transferHistory: mapArray(state.transferHistory, withTransferIdentity),
    matchCalendar: mapArray(state.matchCalendar, withCalendarMatchIdentity),
    matchResultStore: mapArray(state.matchResultStore, withPlayerMatchIdentity),
    nextFixtures: mapArray(state.nextFixtures, withCalendarMatchIdentity),
    lastFixtures: mapArray(state.lastFixtures, withCalendarMatchIdentity),
  };
  return {
    ...migrated,
    identityVersion: 1,
    identityIndexes: buildIdentityIndexes(migrated),
  };
};
