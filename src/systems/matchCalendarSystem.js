import {
  getClubId,
  getFixtureIdentity,
  withCalendarMatchIdentity,
  withPlayerMatchIdentity,
} from './identitySystem';

const normalizeText = (value = '') => String(value ?? '').trim().replace(/\s+/g, '_').toLowerCase();

export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  PLAYED: 'played',
  POSTPONED: 'postponed',
};

export const makeCalendarMatchId = ({ week, day = 6, competition = 'LEAGUE', homeClub, awayClub, fixtureId }) => {
  if (fixtureId) return String(fixtureId);
  return getFixtureIdentity({
    week: week ?? 1,
    day,
    competition,
    homeClub,
    awayClub,
    fixtureId,
    matchId: null,
    season: Math.floor(((week ?? 1) - 1) / 38) + 1,
  });
};

export const fixtureToCalendarMatch = (fixture = {}, { week = fixture.week, day = 6, status = MATCH_STATUS.SCHEDULED } = {}) => withCalendarMatchIdentity({
    id: makeCalendarMatchId({
      week,
      day,
      competition: fixture.competition ?? 'LEAGUE',
      homeClub: fixture.homeClub,
      awayClub: fixture.awayClub,
      fixtureId: fixture.fixtureId,
    }),
    fixtureId: fixture.fixtureId,
    week,
    day,
    season: fixture.season,
    seasonWeek: fixture.seasonWeek,
    competition: fixture.competition ?? 'LEAGUE',
    competitionLabel: fixture.competitionLabel ?? 'Championnat',
    status,
    homeClubId: fixture.homeClubId ?? getClubId(fixture.homeClub),
    awayClubId: fixture.awayClubId ?? getClubId(fixture.awayClub),
    homeClub: fixture.homeClub,
    awayClub: fixture.awayClub,
    countryCode: fixture.countryCode ?? fixture.homeClub?.countryCode,
    fixture,
    result: status === MATCH_STATUS.PLAYED ? {
      homeGoals: fixture.homeGoals,
      awayGoals: fixture.awayGoals,
      score: `${fixture.homeGoals ?? 0}-${fixture.awayGoals ?? 0}`,
      homeStats: fixture.simulation?.stats?.home ?? {
        xg: fixture.homeXg,
        shots: fixture.homeShots,
        shotsOnTarget: fixture.homeShotsOnTarget,
        chances: fixture.homeChances,
      },
      awayStats: fixture.simulation?.stats?.away ?? {
        xg: fixture.awayXg,
        shots: fixture.awayShots,
        shotsOnTarget: fixture.awayShotsOnTarget,
        chances: fixture.awayChances,
      },
    } : null,
  });

export const europeanMatchToCalendarMatch = (match = {}, { week, day = match.simulatedDay ?? 2, status = MATCH_STATUS.PLAYED } = {}) => withCalendarMatchIdentity({
    id: makeCalendarMatchId({
      week,
      day,
      competition: match.competition ?? 'EUROPE',
      homeClub: match.clubId ?? match.club,
      awayClub: match.opponentClubId ?? match.opponent,
      fixtureId: match.fixtureId,
    }),
    fixtureId: match.fixtureId,
    week,
    day,
    competition: match.competition ?? 'EUROPE',
    competitionLabel: match.competitionLabel ?? 'Europe',
    status,
    homeClubId: match.clubId ?? getClubId(match.club),
    awayClubId: match.opponentClubId ?? getClubId(match.opponent ?? match.opponentName),
    homeClub: { id: match.clubId ?? getClubId(match.club), name: match.club, countryCode: match.clubCountryCode, city: match.clubCity },
    awayClub: { id: match.opponentClubId ?? getClubId(match.opponent ?? match.opponentName), name: match.opponent ?? match.opponentName, country: match.opponentCountry },
    countryCode: '__EUROPE__',
    result: status === MATCH_STATUS.PLAYED ? {
      score: match.score,
      result: match.result,
      playerResults: [withPlayerMatchIdentity(match)],
    } : null,
  });

export const playerMatchToResultRecord = (match = {}, { week, day = 6, source = 'league' } = {}) => {
  const identified = withPlayerMatchIdentity({ ...match, week: week ?? match.week, day: day ?? match.simulatedDay });
  return {
    id: `${source}_${week ?? match.week ?? 1}_${day}_${match.playerId ?? normalizeText(match.playerName)}_${identified.fixtureId}`,
    fixtureId: identified.fixtureId,
    matchId: identified.matchId,
    playerId: match.playerId,
    playerName: match.playerName,
    week: week ?? match.week,
    day: day ?? match.simulatedDay,
    competition: match.competition ?? (source === 'europe' ? 'EUROPE' : 'LEAGUE'),
    competitionLabel: match.competitionLabel ?? (source === 'europe' ? 'Europe' : 'Championnat'),
    source,
    clubId: identified.clubId,
    opponentClubId: identified.opponentClubId,
    club: identified.club,
    opponent: identified.opponent ?? identified.opponentName,
    score: match.score,
    result: match.result,
    stats: {
      minutes: match.minutes,
      goals: match.goals ?? 0,
      assists: match.assists ?? 0,
      matchRating: match.matchRating,
      keyPasses: match.keyPasses ?? 0,
      saves: match.saves ?? 0,
      tackles: match.tackles ?? 0,
      xg: match.xg,
      teamAverageRating: match.teamAverageRating,
    },
    fixtureStats: match.fixtureStats,
    raw: identified,
  };
};

const upsertById = (items = [], incoming = []) => {
  const map = new Map((Array.isArray(items) ? items : []).filter(Boolean).map((item) => [item.id, item]));
  incoming.filter(Boolean).forEach((item) => map.set(item.id, { ...(map.get(item.id) ?? {}), ...item }));
  return [...map.values()];
};

export const upsertCalendarMatches = (calendar = [], matches = []) => upsertById(calendar, matches).slice(-1200);

export const upsertMatchResults = (store = [], results = []) => upsertById(store, results).slice(-5000);

export const calendarMatchToFixture = (match = {}) => ({
  ...(match.fixture ?? {}),
  fixtureId: match.fixtureId ?? match.id,
  week: match.week,
  season: match.season ?? match.fixture?.season,
  seasonWeek: match.seasonWeek ?? match.fixture?.seasonWeek,
  competition: match.competition ?? match.fixture?.competition ?? 'LEAGUE',
  competitionLabel: match.competitionLabel ?? match.fixture?.competitionLabel ?? 'Championnat',
  countryCode: match.countryCode ?? match.fixture?.countryCode ?? match.homeClub?.countryCode,
  homeClub: match.homeClub ?? match.fixture?.homeClub,
  awayClub: match.awayClub ?? match.fixture?.awayClub,
  homeGoals: match.result?.homeGoals ?? match.fixture?.homeGoals,
  awayGoals: match.result?.awayGoals ?? match.fixture?.awayGoals,
  homeXg: match.result?.homeStats?.xg ?? match.fixture?.homeXg,
  awayXg: match.result?.awayStats?.xg ?? match.fixture?.awayXg,
  homeShots: match.result?.homeStats?.shots ?? match.fixture?.homeShots,
  awayShots: match.result?.awayStats?.shots ?? match.fixture?.awayShots,
  homeShotsOnTarget: match.result?.homeStats?.shotsOnTarget ?? match.fixture?.homeShotsOnTarget,
  awayShotsOnTarget: match.result?.awayStats?.shotsOnTarget ?? match.fixture?.awayShotsOnTarget,
  homeChances: match.result?.homeStats?.chances ?? match.fixture?.homeChances,
  awayChances: match.result?.awayStats?.chances ?? match.fixture?.awayChances,
  status: match.status,
  day: match.day,
});

export const markCalendarMatchesPlayed = (calendar = [], playedMatches = []) => {
  const playedByFixture = new Map(playedMatches.filter(Boolean).map((match) => [match.fixtureId ?? match.id, match]));
  return (Array.isArray(calendar) ? calendar : []).map((item) => {
    const played = playedByFixture.get(item.fixtureId ?? item.id);
    if (!played) return item;
    return {
      ...item,
      status: MATCH_STATUS.PLAYED,
      result: played.result ?? item.result,
      playedAtWeek: played.week ?? item.week,
      playedAtDay: played.day ?? item.day,
    };
  });
};

export const getCalendarFixturesForWeek = (calendar = [], week, { status, competition } = {}) =>
  (Array.isArray(calendar) ? calendar : [])
    .filter((item) => item.week === week)
    .filter((item) => !status || item.status === status)
    .filter((item) => !competition || item.competition === competition)
    .map((item) => calendarMatchToFixture(item))
    .filter(Boolean);
