import { CLUBS, getCountry, getUnlockedCountries } from '../data/clubs';
import { PASSIVE_EVENTS } from '../data/events';
import { COUNTRY_NAME_POOLS, FIRST_NAMES, HIDDEN_TRAITS, LAST_NAMES, LEGENDARY_PLAYERS, PERSONALITIES, POSITIONS, POSITION_ROLES } from '../data/players';
import { drawMarketPlayers, drawFreeAgents as drawFreeAgentsFromSquads, drawProspects, getClubSquad, MARKET_POSITION_QUOTA, FREE_AGENT_POSITION_QUOTA, createPlayerCatalog, getMarketRatingCeiling, getMarketCountryCodes, reconcilePlayerWithCatalog } from '../data/squadDatabase';
import { createDefaultAgencyRecord } from '../data/gameDatabase';
import { calculateWeeklyPlayerEconomy, EVENT_INCOME_MULT, MARKET_REFRESH_COST, OFFICE_UPGRADE_COSTS, WEEKLY_OVERHEAD } from './economy';
import { applyPassiveEventToPlayer, chooseInteractiveEvent, generateChainedEvents, getContractEventForRoster, pickChainedInteractiveEvent, processChainedPassiveEvents, rollPassiveEvent } from './eventSystem';
import { getAgencyCapacity, getAgencyUpgradeCost } from '../systems/agencySystem';
import { applyReputationChange, applySegmentReputationChange, createDefaultSegmentReputation, getSegmentDeltaForEvent, normalizeAgencyReputation } from '../systems/reputationSystem';
import { getDepartureRisk, getInitialTrust } from '../systems/relationshipSystem';
import { createManualNewsPost, createNewsPost } from '../systems/newsSystem';
import { createMessage, maybeCreateContextualMessage, MIN_PLAYER_MSG_COOLDOWN, MAX_WEEKLY_MESSAGES, normalizeMessageRecord } from '../systems/messageSystem';
import { createDefaultStaff, getStaffEffect, getStaffWeeklyCost, upgradeStaff as upgradeStaffMember } from '../systems/staffSystem';
import { createInitialLeagueTables, mergeWithInitialLeagueTables, updateLeagueTables } from '../systems/leagueSystem';
import { applyClubRelation, createDefaultClubMemory, createDefaultClubRelations, recordClubMemory } from '../systems/clubSystem';
import { applyLeagueReputation, createDefaultLeagueReputation } from '../systems/leagueReputationSystem';
import { createAgentContract, tickAgentContract } from '../systems/agentContractSystem';
import { rollCompetitorThreat } from '../systems/competitorSystem';
import { createLongTermAgencyGoals } from '../systems/agencyGoalsSystem';
import { createCareerGoal, createScoutReport, updateSeasonStats } from '../systems/playerDevelopmentSystem';
import { evaluatePromises, resolvePromisesForPlayer, getRoleExpectationState } from '../systems/promiseSystem';
import { MATCH_INCIDENT_EVENTS, buildWeeklyFixtures, simulateFixturePlayerResults } from '../systems/matchSystem';
import { generateClubOffers, generateSurpriseOffer, getCalendarSnapshot, getSeasonContext, getWeekDailySnapshots } from '../systems/seasonSystem';
import { getClubEuropeanCompetition, getEuropeanCompetition, isEuropeanMatchWeek, getEuropeanStage, getEuropeanMatchdayIndex, pickSeededOpponent, generateKOBracketClubs, initEuroCupCompData, simulateEuropeanMatch, getEuropeanMatchNews, getEuropeanInterestClubs, EURO_CUP_LABELS, normalizeEuropeanMatch, ensureEuropeanCompetitionProgress, getEuropeanClubRoundMatch, isEuropeanClubAlive, registerEuropeanParticipantsFromLeagueTables } from '../systems/europeanCupSystem';
import { shouldTriggerWorldCup, createWorldCupState, simulateWorldCupMatch, advanceWorldCupPhase, getWorldCupMatchNews, getWorldCupValueMultiplier, getWorldCupFixturePreview, getWorldCupInterestClubs } from '../systems/worldCupSystem';
import { getActivePeriod, getPeriodMoodEffect, maybeCreateSeasonalMessage, getSeasonalNewsItem } from '../systems/calendarEventsSystem';
import { generateWorldState } from '../systems/worldStateSystem';
import { applyNewsConsequences, generateNarrativeFollowups } from '../systems/consequenceSystem';
import { awardGems } from '../systems/shopSystem';
import { generateSeasonObjectives, updateObjectiveProgress, checkObjectiveCompletion, syncProgressionSystems } from '../systems/objectivesSystem';
import { createDefaultContacts } from '../systems/contactsSystem';
import { getActiveDossierPlayerIds, getMarketLockedPlayerIds, getMessagePriority, messageNeedsResponse } from '../systems/dossierSystem';
import { applyLockerRoomDynamics, buildLockerRoomSnapshot } from '../systems/lockerRoomSystem';
import { createPublicRep, tickPublicRep, getPublicRepOfferBonus } from '../systems/publicReputationSystem';
import { createDefaultDossierMemory, recordDossierEvent } from '../systems/coherenceSystem';
import { buildInitialBonds, tickBonds, applyBondEffectsToMatchResults } from '../systems/playerBondsSystem';
import { isInternationalBreakWeek, simulateInternationalBreak } from '../systems/internationalBreakSystem';
import { getCalledUpAgentPlayers } from '../systems/nationalSelectionSystem';
import { updateCompetitionTopStats } from '../systems/topScorersSystem';
import {
  MATCH_STATUS,
  europeanMatchToCalendarMatch,
  fixtureToCalendarMatch,
  getCalendarFixturesForWeek,
  markCalendarMatchesPlayed,
  playerMatchToResultRecord,
  upsertCalendarMatches,
  upsertMatchResults,
} from '../systems/matchCalendarSystem';
import {
  addDecisionHistory,
  applyCredibilityChange,
  applyPlayerSegmentReputation,
  applyStartingProfileToState,
  createDefaultCountryReputation,
  createDefaultMediaRelations,
  createDefaultPlayerSegmentReputation,
  createDefaultRivalAgents,
  getNegotiationContextModifier,
  getPlayerSegment,
} from '../systems/agencyReputationSystem';
import { generateLivingWeek } from '../systems/livingEventSystem';
import { calculateRatingFromAttributes, developAttributes } from '../systems/attributesSystem';
import { getPlayerProfileSummary } from '../systems/playerProfileSystem';
import {
  applyCompletedTransferToPlayer as applyCompletedTransferToPlayerFromEngine,
  buildTransferAgreement as buildTransferAgreementFromEngine,
  normalizeOfferBook as normalizeOfferBookFromEngine,
} from './transferEngine';
import {
  buildWeeklyTimeline as buildWeeklyTimelineFromNarrative,
  generateWorldSummary as generateWorldSummaryFromNarrative,
  resolveAnnualCalendarEvents as resolveAnnualCalendarEventsFromNarrative,
} from './weekNarrative';
import { clamp, makeId, pick, rand } from '../utils/helpers';
import { formatMoney } from '../utils/format';
import { normalizePromises } from '../systems/promiseSystem';

export const STORAGE_KEY = 'agent_fc_v4';
export const MARKET_DATA_VERSION = '2026-05-12-open-market-clean-v5';
const MAX_OPEN_RESPONSE_MESSAGES_PER_PLAYER = 4;
const OPENING_NEWS_TEXT = "L'agence Agent FC ouvre ses portes. Les premiers recrutements sont attendus.";

const scheduleLeagueMatches = (state = {}, roster = state.roster ?? [], week = state.week ?? 1) => {
  const fixtures = buildWeeklyFixtures(roster, week);
  const calendar = upsertCalendarMatches(
    state.matchCalendar ?? [],
    fixtures.map((fixture) => fixtureToCalendarMatch(fixture, { week, day: 6, status: MATCH_STATUS.SCHEDULED })),
  );
  return { fixtures, calendar };
};

export const getEuropeanSimDayIndex = (week = 1, playerId = '') => {
  const seed = `${week}:${playerId}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2 === 0 ? 2 : 3; // Tuesday/Wednesday
};

const simulateMidweekEuropeanMatches = (state = {}, dayIndex = 2) => {
  if (![2, 3].includes(dayIndex)) return state;
  const existingMidweek = state?.midweekEuropean?.week === state.week
    ? state.midweekEuropean
    : { week: state.week, results: [], simulatedDays: [] };
  const simulatedDays = Array.isArray(existingMidweek.simulatedDays) ? existingMidweek.simulatedDays : [];
  if (simulatedDays.includes(dayIndex)) return state;
  const phase = getPhase(state.week);
  const currentSeason = phase.season;
  const roster = Array.isArray(state.roster) ? [...state.roster] : [];
  const results = [];
  const generatedNews = [];

  roster.forEach((player) => {
    if (!player || (player.injured ?? 0) > 0 || !player.clubCountryCode || !player.club || player.club === 'Libre') return;
    const comp = player.europeanCompetition ?? getEuropeanCompetition(player, currentSeason);
    if (!comp || !isEuropeanMatchWeek(phase.seasonWeek, comp)) return;
    const simDay = getEuropeanSimDayIndex(state.week, player.id);
    if (simDay !== dayIndex) return;

    const matchdayIdx = getEuropeanMatchdayIndex(phase.seasonWeek, comp);
    const opponent = pickSeededOpponent(player.club, comp, matchdayIdx, currentSeason);
    const fixtureId = `euro_${state.week}_${dayIndex}_${comp}_${String(player.club).replace(/\s+/g, '_')}_${String(opponent.name).replace(/\s+/g, '_')}`;
    const raw = simulateEuropeanMatch(player, comp, phase.seasonWeek, { opponent, fixtureId });
    const match = normalizeEuropeanMatch({
      ...raw,
      playerName: raw.playerName ?? `${player.firstName} ${player.lastName}`,
      simulatedDay: simDay,
      simulatedWeek: state.week,
    });

    results.push(match);

    const newsData = getEuropeanMatchNews(player, match);
    if (newsData) generatedNews.push(newsData);

    const idx = roster.findIndex((p) => p.id === player.id);
    if (idx >= 0) {
      const current = roster[idx];
      roster[idx] = {
        ...current,
        moral: clamp((current.moral ?? 50) + (match.result === 'win' ? 3 : match.result === 'loss' ? -2 : 0), 0, 100),
        matchHistory: [{ week: state.week, competition: comp, ...match }, ...(current.matchHistory ?? [])].slice(0, 12),
      };
    }
  });

  return {
    ...state,
    roster,
    news: [...generatedNews, ...(state.news ?? [])].slice(0, 60),
    matchCalendar: upsertCalendarMatches(
      state.matchCalendar ?? [],
      results.map((match) => europeanMatchToCalendarMatch(match, { week: state.week, day: match.simulatedDay ?? dayIndex })),
    ),
    matchResultStore: upsertMatchResults(
      state.matchResultStore ?? [],
      results.map((match) => playerMatchToResultRecord(match, { week: state.week, day: match.simulatedDay ?? dayIndex, source: 'europe' })),
    ),
    midweekEuropean: {
      week: state.week,
      results: [...(existingMidweek.results ?? []), ...results],
      simulatedDays: [...new Set([...simulatedDays, dayIndex])],
    },
  };
};

const createClubSeasonHistory = (season = 1) =>
  CLUBS.reduce((history, club) => ({
    ...history,
    [club.name]: {
      season,
      club: club.name,
      countryCode: club.countryCode,
      competition: getClubEuropeanCompetition(club, season),
      league: [],
      europe: [],
      summary: [],
    },
  }), {});

const normalizeClubSeasonHistory = (history = {}, season = 1) => {
  const base = createClubSeasonHistory(season);
  return Object.entries(base).reduce((acc, [clubName, baseRecord]) => {
    const current = history?.[clubName];
    const sameSeason = current?.season === season;
    acc[clubName] = {
      ...baseRecord,
      ...(sameSeason ? current : {}),
      season,
      competition: sameSeason ? current.competition ?? baseRecord.competition : baseRecord.competition,
      league: [...(sameSeason && Array.isArray(current.league) ? current.league : [])].slice(0, 12),
      europe: [...(sameSeason && Array.isArray(current.europe) ? current.europe : [])].slice(0, 12),
      summary: [...(sameSeason && Array.isArray(current.summary) ? current.summary : [])].slice(0, 8),
    };
    return acc;
  }, {});
};

const compactOpenResponseMessages = (messages = []) => {
  const openByPlayer = new Map();
  return messages.filter((message) => {
    if (!messageNeedsResponse(message)) return true;
    const playerKey = message.playerId ?? message.threadKey ?? 'global';
    const count = openByPlayer.get(playerKey) ?? 0;
    if (count >= MAX_OPEN_RESPONSE_MESSAGES_PER_PLAYER) return false;
    openByPlayer.set(playerKey, count + 1);
    return true;
  });
};

const limitQueuedResponseMessages = (messages = [], existingMessages = []) => {
  const openByPlayer = new Map();
  existingMessages.forEach((message) => {
    if (!messageNeedsResponse(message)) return;
    const playerKey = message.playerId ?? message.threadKey ?? 'global';
    openByPlayer.set(playerKey, (openByPlayer.get(playerKey) ?? 0) + 1);
  });

  const seenOpenContexts = new Set(
    existingMessages
      .filter((message) => messageNeedsResponse(message))
      .map((message) => `${message.playerId ?? message.threadKey ?? 'global'}:${message.type ?? 'message'}:${message.context ?? message.subject ?? ''}`),
  );

  return messages.filter((message) => {
    if (!messageNeedsResponse(message)) return true;
    const playerKey = message.playerId ?? message.threadKey ?? 'global';
    const contextKey = `${playerKey}:${message.type ?? 'message'}:${message.context ?? message.subject ?? ''}`;
    if (seenOpenContexts.has(contextKey)) return false;
    const count = openByPlayer.get(playerKey) ?? 0;
    if (count >= MAX_OPEN_RESPONSE_MESSAGES_PER_PLAYER) return false;
    openByPlayer.set(playerKey, count + 1);
    seenOpenContexts.add(contextKey);
    return true;
  });
};

const getWeeksSinceAgencySignature = (player = {}, week = 1) => {
  const signedWeek = player.agencySignedWeek ?? player.relationshipStartedWeek ?? player.agentContract?.signedWeek ?? week;
  return Math.max(0, week - signedWeek);
};

const isMessageCoherentForPlayer = (message, player, state = {}) => {
  if (!message || !player) return true;
  const week = message.week ?? state.week ?? 1;
  const context = String(message.context ?? '');
  const weeksInAgency = getWeeksSinceAgencySignature(player, week);
  const weeksSinceContact = player.lastInteractionWeek != null ? Math.max(0, week - player.lastInteractionWeek) : 0;
  const stats = player.seasonStats ?? {};
  const recentRatings = (player.matchHistory ?? [])
    .map((match) => match.matchRating)
    .filter(Number.isFinite)
    .slice(0, 4);
  const recentAverage = recentRatings.length
    ? recentRatings.reduce((sum, rating) => sum + rating, 0) / recentRatings.length
    : null;
  const roleState = getRoleExpectationState(player);

  if (message.type === 'welcome') return context === 'signing' || weeksInAgency <= 2;
  if (message.type === 'complaint' && context === 'neglect') {
    return weeksInAgency >= 8 && weeksSinceContact >= 6 && (player.trust ?? 50) < 70 && (player.moral ?? 50) < 70;
  }
  if (message.type === 'role_frustration') {
    return roleState.roleMismatch || context.includes('coach') || context.includes('club_role') || context.includes('promise');
  }
  if (message.type === 'injury_worry') return (player.injured ?? 0) > 0 || context.includes('injury');
  if (message.type === 'form_slump') return (player.form ?? 60) < 55 || (recentAverage != null && recentAverage < 6);
  if (message.type === 'raise_request') return (player.rating ?? 0) >= 150 && ((stats.goals ?? 0) + (stats.assists ?? 0) >= 6 || (stats.averageRating ?? 0) >= 7.1);
  if (message.type === 'transfer_request') {
    if (['deal_signed', 'deal_signed_player', 'predeal_signed', 'predeal_signed_player', 'predeal_activation', 'staff_promise_failed'].includes(context)) return true;
    if (weeksInAgency < 8) return false;
    return (player.moral ?? 50) < 62
      || (player.hiddenAmbition ?? 0) > 62
      || ['ambitieux', 'mercenaire'].includes(player.personality)
      || context.includes('transfer')
      || context.includes('mercato')
      || context.includes('rumor');
  }
  if (message.type === 'ambition_clash') return weeksInAgency >= 8 && ((player.moral ?? 50) < 60 || ['ambitieux', 'mercenaire'].includes(player.personality));
  if (message.type === 'national_pride') return context.includes('world_cup') || context.includes('selection') || context.includes('callup') || player.seasonStatus === 'international';
  if (message.type === 'thanks') {
    if (context.includes('injury_comeback')) return false;
    return (player.moral ?? 50) >= 45 || (stats.averageRating ?? 0) >= 7 || context.includes('signing') || context.includes('selection');
  }
  if (message.type === 'competitor_agent') return weeksInAgency >= 4 && (player.trust ?? 50) < 75;
  return true;
};

const filterCoherentMessages = (messages = [], roster = [], state = {}) => {
  const playerById = new Map(roster.map((player) => [player.id, player]));
  return messages.filter((message) => {
    if (!message?.playerId) return true;
    return isMessageCoherentForPlayer(message, playerById.get(message.playerId), state);
  });
};

const sortLeagueTableRows = (table = {}) =>
  Object.values(table ?? {}).sort((a, b) =>
    (b.points ?? 0) - (a.points ?? 0)
    || ((b.goalsFor ?? 0) - (b.goalsAgainst ?? 0)) - ((a.goalsFor ?? 0) - (a.goalsAgainst ?? 0))
    || (b.goalsFor ?? 0) - (a.goalsFor ?? 0)
    || String(a.club ?? '').localeCompare(String(b.club ?? '')),
  );

const getClubSeasonObjective = (player = {}, position = null, totalClubs = 20) => {
  if (!position) return 'Saison a construire';
  const tier = player.clubTier ?? 3;
  if (tier <= 1) {
    if (position <= 2) return 'jouer le titre';
    if (position <= 4) return 'rester en Ligue des Champions';
    return 'saison sous pression';
  }
  if (tier === 2) {
    if (position <= 4) return 'accrocher l Europe';
    if (position <= 8) return 'rester dans le bon wagon';
    return 'relancer la saison';
  }
  if (tier === 3) {
    if (position <= 8) return 'creer la surprise';
    if (position <= 14) return 'saison stable';
    return 'eviter la zone rouge';
  }
  return position <= Math.ceil(totalClubs * 0.7) ? 'assurer le maintien' : 'lutter pour survivre';
};

const buildClubSeasonContext = (player = {}, leagueTables = {}, leagueSeasonData = {}) => {
  const countryCode = player.clubCountryCode ?? player.countryCode;
  const clubName = player.club;
  if (!countryCode || !clubName || clubName === 'Libre') return null;
  const seasonData = leagueSeasonData?.[countryCode] ?? {};
  const table = leagueTables?.[countryCode] ?? seasonData.table ?? {};
  const sortedTable = sortLeagueTableRows(table);
  const positionIndex = sortedTable.findIndex((row) => row.club === clubName);
  const row = positionIndex >= 0 ? sortedTable[positionIndex] : table?.[clubName] ?? null;
  if (!row) return null;
  const totalClubs = sortedTable.length || Object.keys(table ?? {}).length || 20;
  const form = Array.isArray(row.form) ? row.form.slice(-5) : [];
  const position = positionIndex >= 0 ? positionIndex + 1 : null;
  const goalDifference = (row.goalsFor ?? 0) - (row.goalsAgainst ?? 0);
  const migratedState = {
    season: seasonData.season ?? null,
    countryCode,
    club: clubName,
    position,
    totalClubs,
    points: row.points ?? 0,
    played: row.played ?? 0,
    goalDifference,
    form,
    objective: getClubSeasonObjective(player, position, totalClubs),
    leader: seasonData.leader ?? sortedTable[0]?.club ?? null,
    latestFixtures: (seasonData.latestFixtures ?? []).filter((fixture) =>
      fixture.homeClub?.name === clubName
      || fixture.awayClub?.name === clubName
      || fixture.homeClubName === clubName
      || fixture.awayClubName === clubName
      || fixture.home === clubName
      || fixture.away === clubName,
    ).slice(0, 3),
  };
  return syncProgressionSystems(migratedState).state;
};

const attachClubSeasonContext = (player = {}, leagueTables = {}, leagueSeasonData = {}) => {
  const clubSeasonContext = buildClubSeasonContext(player, leagueTables, leagueSeasonData);
  const profiledPlayer = {
    ...player,
    playerProfile: getPlayerProfileSummary(player),
  };
  return {
    ...profiledPlayer,
    clubSeasonContext,
    clubLeaguePosition: clubSeasonContext?.position ?? null,
    clubLeagueForm: clubSeasonContext?.form ?? [],
    clubSeasonObjective: clubSeasonContext?.objective ?? null,
  };
};

const DEFAULT_AGENCY_PROFILE = createDefaultAgencyRecord({
  name: 'Agent FC',
  ownerName: 'Directeur sportif',
  country_code: 'FR',
  country: 'France',
  city: 'Paris',
  color: '#d4a574',
  positioning: 'equilibre',
  difficulty: 'realiste',
  start_profile: 'ancien_joueur',
  onboarded: false,
  emblem: '⚡',
});

const getAgencyCountryCode = (state = {}) =>
  state.agencyProfile?.countryCode
  ?? state.agencyProfile?.country_code
  ?? DEFAULT_AGENCY_PROFILE.countryCode
  ?? 'FR';

const SPECIALIZATION_EFFECTS = {
  equilibre: { marketBonus: 0, negotiationRep: 0, mediaBoost: 0 },
  business: { marketBonus: 2, negotiationRep: 2, mediaBoost: -1 },
  formation: { marketBonus: 1, youthProgress: 0.05, mediaBoost: 0 },
  prestige: { marketBonus: 1, negotiationRep: 1, mediaBoost: 2 },
};

const scaleReputationDelta = (delta) => {
  if (delta <= 0) return delta;
  return Math.max(1, Math.floor(delta * 0.45));
};

const getWeightedCountry = (reputation) => {
  const unlocked = getUnlockedCountries(normalizeAgencyReputation(reputation));
  const weightedPool = unlocked.flatMap((country) => Array.from({ length: country.marketWeight }, () => country));
  return pick(weightedPool);
};

const getClubForCountry = (countryCode) => {
  const matchingClubs = CLUBS.filter((club) => club.countryCode === countryCode);
  return pick(matchingClubs.length ? matchingClubs : CLUBS);
};

const getClubTierForRating = (rating, potential) => {
  if (rating >= 168 || potential >= 180) return [1, 2];
  if (rating >= 152 || potential >= 168) return [2, 3];
  if (rating >= 132 || potential >= 156) return [3, 4];
  return [4];
};

const getClubForPlayerLevel = (countryCode, rating, potential) => {
  const allowedTiers = getClubTierForRating(rating, potential);
  const matchingClubs = CLUBS.filter((club) => club.countryCode === countryCode && allowedTiers.includes(club.tier));
  return pick(matchingClubs.length ? matchingClubs : CLUBS.filter((club) => allowedTiers.includes(club.tier)));
};

const estimateTransferValue = ({
  rating = 130,
  potential = rating,
  age = 24,
  form = 70,
  clubTier = 3,
  brandValue = 20,
}) => {
  const safeRating = clamp(Number.isFinite(rating) ? rating : 130, 100, 198);
  const safePotential = clamp(Number.isFinite(potential) ? potential : safeRating, safeRating, 200);
  const safeAge = clamp(Number.isFinite(age) ? age : 24, 16, 38);
  const safeForm = clamp(Number.isFinite(form) ? form : 70, 30, 95);
  const safeBrandValue = clamp(Number.isFinite(brandValue) ? brandValue : 20, 0, 100);

  const ratingFactor = Math.exp((safeRating - 130) / 18.4);
  const ageFactor = safeAge <= 18
    ? 1.18 + (18 - safeAge) * 0.04
    : safeAge <= 21
      ? 1.16 - (safeAge - 18) * 0.03
      : safeAge <= 24
        ? 1.05 - (safeAge - 22) * 0.02
        : safeAge <= 27
          ? 0.96 - (safeAge - 25) * 0.025
          : safeAge <= 30
            ? 0.84 - (safeAge - 28) * 0.03
            : Math.max(0.45, 0.72 - (safeAge - 31) * 0.025);
  const potentialFactor = 1 + clamp((safePotential - safeRating) / 18, 0, 0.2);
  const formFactor = 1 + clamp((safeForm - 70) / 120, -0.12, 0.18);
  const brandFactor = 1 + clamp((safeBrandValue - 20) / 300, -0.05, 0.1);
  const clubFactor = clubTier === 1
    ? 1.08
    : clubTier === 2
      ? 1.03
      : clubTier === 3
        ? 0.98
        : 0.9;
  const noise = rand(96, 104) / 100;

  return Math.round(clamp(3_850_000 * ratingFactor * ageFactor * potentialFactor * formFactor * brandFactor * clubFactor * noise, 250000, 280000000));
};

const generateRealisticRating = (reputation, scoutLevel, young) => {
  const repTier = normalizeAgencyReputation(reputation);
  // Base range tightened — young players are raw prospects, not stars
  const base = young ? rand(104, 126) : rand(110, 136);
  const repBoost = Math.floor(Math.min(40, repTier) / 9) * 2;
  const scoutBoost = Math.floor(scoutLevel * 2.0);
  let rating = base + repBoost + scoutBoost + rand(-4, 6);

  // Elite rolls are strictly gated behind reputation thresholds.
  // At game start, no 160+ players appear.
  // 152-158: unlocks at rep 32  (~early season 2)
  // 160-170: unlocks at rep 50  (~mid game, 1-2 seasons in)
  // 172-182: unlocks at rep 75  (~late game, 3+ seasons)
  const eliteRoll = Math.random();
  if (repTier >= 75 && eliteRoll < 0.018 + (repTier - 75) / 1500 + scoutLevel / 900) {
    rating = rand(172, 182);
  } else if (repTier >= 50 && eliteRoll < 0.026 + (repTier - 50) / 2000 + scoutLevel / 700) {
    rating = rand(160, 170);
  } else if (repTier >= 32 && eliteRoll < 0.038 + (repTier - 32) / 2500) {
    rating = rand(152, 158);
  }

  return clamp(rating, 100, 186);
};

const LEGACY_CLUB_ALIASES = {
  'FC Barcelona': 'Barcelona',
  'Man United': 'Man United',
  'Bayern Munich': 'Bayern',
  'Inter Milan': 'Inter',
};

const getClubByName = (name) => CLUBS.find((club) => club.name === (LEGACY_CLUB_ALIASES[name] ?? name));

const normalizeClubForPlayer = (player, fallbackCountryCode = 'FR') => {
  const legacyName = LEGACY_CLUB_ALIASES[player.club] ?? player.club;
  const currentClub = getClubByName(legacyName);
  if (currentClub) return currentClub;
  if (legacyName === 'Libre') {
    return {
      name: 'Libre',
      tier: 4,
      countryCode: player.countryCode ?? fallbackCountryCode,
      city: '-',
    };
  }
  return getClubForCountry(player.clubCountryCode ?? player.countryCode ?? fallbackCountryCode);
};

const getGeneratedName = (countryCode) => {
  const pool = COUNTRY_NAME_POOLS[countryCode];
  return {
    firstName: pick(pool?.first ?? FIRST_NAMES),
    lastName: pick(pool?.last ?? LAST_NAMES),
  };
};

const resolveDatabasePlayerTemplate = (player, club, season = 1) => {
  const clubName = club?.name ?? player.club;
  const clubList = clubName ? [CLUBS.find((item) => item.name === clubName), ...CLUBS.filter((item) => item.name !== clubName)] : CLUBS;
  for (const item of clubList.filter(Boolean)) {
    const squad = getClubSquad(item, season);
    const exact = squad.find((candidate) => candidate.id === player.id);
    if (exact) return exact;
    const sameName = squad.find((candidate) =>
      candidate.firstName === player.firstName
      && candidate.lastName === player.lastName
      && candidate.position === player.position,
    );
    if (sameName) return sameName;
  }
  return null;
};

const normalizePlayerCoreProfile = (player, countryCode, club, season = 1) => {
  const dbPlayer = resolveDatabasePlayerTemplate(player, club, season);
  if (dbPlayer) {
    return {
      firstName: dbPlayer.firstName,
      lastName: dbPlayer.lastName,
      rating: clamp(Math.round(dbPlayer.rating), 100, 198),
      potential: clamp(Math.round(dbPlayer.potential ?? dbPlayer.rating), Math.round(dbPlayer.rating), 198),
    };
  }

  const baseCountryCode = countryCode ?? player.countryCode ?? club?.countryCode ?? 'FR';
  const firstName = typeof player.firstName === 'string' && player.firstName.trim()
    ? player.firstName.trim()
    : 'Joueur';
  const lastName = typeof player.lastName === 'string' && player.lastName.trim()
    ? player.lastName.trim()
    : club?.name ?? 'Libre';

  const ratingCandidates = [player.rating, player.note, player.overall, player.rank];
  const rawRating = ratingCandidates.find((value) => Number.isFinite(Number(value)));
  const rating = Number.isFinite(Number(rawRating))
    ? Number(rawRating)
    : clamp(120 + (club?.tier ? (4 - Math.min(4, club.tier)) * 8 : 0), 100, 160);

  const potentialCandidates = [player.potential, player.maxRating, player.ceiling];
  const rawPotential = potentialCandidates.find((value) => Number.isFinite(Number(value)));
  const potential = Number.isFinite(Number(rawPotential))
    ? Number(rawPotential)
    : Math.min(198, Math.max(rating, rating + 12));

  return {
    firstName,
    lastName,
    rating: clamp(Math.round(rating), 100, 198),
    potential: clamp(Math.round(potential), Math.round(rating), 198),
  };
};

const normalizeRoleProfile = (player) => {
  const role = (POSITION_ROLES[player.position] ?? POSITION_ROLES.ATT).find((item) => item.id === player.roleId)
    ?? pick(POSITION_ROLES[player.position] ?? POSITION_ROLES.ATT);
  return {
    roleId: player.roleId ?? role.id,
    roleLabel: player.roleLabel ?? role.label,
    roleShort: player.roleShort ?? role.short,
  };
};

const getPlayerEuropeanCompetition = (player, season) => getEuropeanCompetition({
  ...player,
  club: player.club,
  clubTier: player.clubTier,
  clubCountryCode: player.clubCountryCode,
}, season);

const createDeepPlayerProfile = (player, countryCode, club) => {
  const ambitionBase = player.personality === 'ambitieux' ? 70 : player.personality === 'mercenaire' ? 62 : rand(28, 68);
  const loyaltyBase = player.personality === 'loyal' ? 78 : player.personality === 'mercenaire' ? 25 : rand(30, 72);
  const pressureBase = player.personality === 'leader' || player.personality === 'professionnel' ? rand(62, 88) : rand(30, 74);
  const benchFear = player.age <= 22 ? rand(58, 88) : player.rating >= 164 ? rand(45, 72) : rand(22, 65);
  const familyInfluence = rand(15, 85);
  const possibleCities = [...new Set(CLUBS.filter((item) => item.countryCode === countryCode).map((item) => item.city))];

  return {
    hiddenAmbition: clamp(ambitionBase + rand(-8, 8), 0, 100),
    loyalty: clamp(loyaltyBase + rand(-10, 10), 0, 100),
    benchFear: clamp(benchFear, 0, 100),
    pressureTolerance: clamp(pressureBase, 0, 100),
    familyInfluence,
    recurringInjuryRisk: rand(4, 28),
    entourage: pick(['famille très présente', 'conseiller discret', 'ami influenceur', 'avocat familial', 'entourage calme']),
    preferredCountries: [countryCode, ...(Math.random() < 0.35 ? [pick(['FR', 'GB', 'ES', 'IT', 'DE'])] : [])],
    preferredCities: [...new Set([club.city, pick(possibleCities.length ? possibleCities : [club.city])])],
    dreamClub: pick(CLUBS.filter((item) => item.tier <= 2)).name,
    recruitmentPriorities: [
      ...(benchFear > 65 ? ['Temps de jeu'] : []),
      ...(ambitionBase > 60 ? ['Ambition sportive'] : []),
      ...(player.personality === 'mercenaire' ? ['Salaire'] : []),
      ...(familyInfluence > 60 ? ['Stabilité familiale'] : []),
      ...(player.brandValue > 24 ? ['Visibilité'] : []),
      ...(loyaltyBase > 70 ? ['Projet durable'] : []),
    ].slice(0, 3),
    recruitmentDealBreakers: [
      ...(benchFear > 72 ? ['promesse de banc'] : []),
      ...(familyInfluence > 70 ? ['ville distante'] : []),
      ...(player.personality === 'mercenaire' ? ['offre trop basse'] : []),
      ...(player.personality === 'professionnel' ? ['projet flou'] : []),
    ].slice(0, 3),
    pressure: rand(25, 65),
  };
};

const ensureDeepPlayerProfile = (player, countryCode, club) => ({
  ...Object.fromEntries(
    Object.entries(createDeepPlayerProfile(player, countryCode, club)).map(([key, value]) => [key, player[key] ?? value]),
  ),
});

export const generatePlayer = () => null;

export const generateMarket = (reputation, scoutLevel = 0, size = 6, existingIds = [], season = 1, agencyCountryCode = DEFAULT_AGENCY_PROFILE.countryCode) => {
  // Quota de postes pour un marché équilibré (ajusté si size != 6)
  let quota = [...MARKET_POSITION_QUOTA];
  if (size !== 6) {
    // Remplit jusqu'à `size` en bouclant sur le quota de base
    quota = Array.from({ length: size }, (_, i) => MARKET_POSITION_QUOTA[i % MARKET_POSITION_QUOTA.length]);
  }
  const players = drawMarketPlayers({ reputation, scoutLevel, season, existingIds, positionQuota: quota, agencyCountryCode });
  return players.map((player) => ({
    ...player,
    careerGoal: createCareerGoal(player),
    scoutReport: scoutLevel > 0 ? createScoutReport(player, scoutLevel) : null,
  }));
};

export const generateFreeAgents = (reputation, size = 4, existingIds = [], season = 1, agencyCountryCode = DEFAULT_AGENCY_PROFILE.countryCode, scoutLevel = 0) => {
  let quota = [...FREE_AGENT_POSITION_QUOTA];
  if (size !== 4) {
    quota = Array.from({ length: size }, (_, i) => FREE_AGENT_POSITION_QUOTA[i % FREE_AGENT_POSITION_QUOTA.length]);
  }
  return drawFreeAgentsFromSquads({ reputation, scoutLevel, season, existingIds, positionQuota: quota, agencyCountryCode });
};

export const getPhase = (week) => {
  return getSeasonContext(week);
};

// Legacy shim — new objectives come from objectivesSystem.js
export const generateObjectives = (season) =>
  generateSeasonObjectives({ week: (season - 1) * 38 + 1, reputation: 12 + season * 5 });

export const createFreshState = () => syncProgressionSystems({
  money: 25000,
  gems: 0,
  legendarySeenIds: [],
  reputation: 20,
  credibility: 52,
  difficulty: 'realiste',
  startProfile: 'ancien_joueur',
  week: 1,
  day: 1,
  seasonDay: 1,
  agencyLevel: 1,
  agencyProfile: DEFAULT_AGENCY_PROFILE,
  segmentReputation: createDefaultSegmentReputation(),
  countryReputation: createDefaultCountryReputation(DEFAULT_AGENCY_PROFILE.countryCode, 20),
  mediaRelations: createDefaultMediaRelations(),
  playerSegmentReputation: createDefaultPlayerSegmentReputation(),
  rivalAgents: createDefaultRivalAgents(),
  decisionHistory: [],
  activeNarratives: [],
  staff: createDefaultStaff(),
  promises: [],
  clubOffers: [],
  pendingTransfers: [],
  transferHistory: [],
  negotiationCooldowns: {},
  messageQueue: [],
  socialCrisisCooldowns: {},
  dossierMemory: createDefaultDossierMemory(),
  pendingChainedEvents: [],
  seasonAwards: {},
  worldState: generateWorldState(1),
  worldCupState: null,
  europeanCupData: {},
  contacts: createDefaultContacts(),
  seasonObjectives: generateSeasonObjectives({ week: 1, reputation: 20 }),
  roster: [],
  market: generateMarket(20, 0, 8, [], 1, DEFAULT_AGENCY_PROFILE.countryCode).map((player) => ({ ...player, marketCatalogVersion: MARKET_DATA_VERSION })),
  freeAgents: generateFreeAgents(20, 6, [], 1, DEFAULT_AGENCY_PROFILE.countryCode, 0).map((player) => ({ ...player, marketCatalogVersion: MARKET_DATA_VERSION })),
  marketCatalogVersion: MARKET_DATA_VERSION,
  leagueTables: createInitialLeagueTables(),
  competitionTopStats: { league: {}, europe: {} },
  leagueSeasonData: {},
  leagueReputation: createDefaultLeagueReputation(DEFAULT_AGENCY_PROFILE.countryCode),
  clubRelations: createDefaultClubRelations(),
  clubMemory: createDefaultClubMemory(),
  clubSeasonHistory: createClubSeasonHistory(1),
  scoutingMissions: [],
  competitorThreats: [],
  lastFixtures: [],
  nextFixtures: [],
  matchCalendar: [],
  matchResultStore: [],
  office: { scoutLevel: 0, lawyerLevel: 0, mediaLevel: 0 },
  objectives: generateObjectives(1),
  agencyGoals: createLongTermAgencyGoals(),
  history: [],
  news: [
    createManualNewsPost({
      week: 1,
      type: 'media',
      text: OPENING_NEWS_TEXT,
      reputationImpact: 0,
      account: { name: 'Le Vestiaire', kind: 'media' },
    }),
  ],
  messages: [],
  stats: { totalEarned: 0, playersSigned: 0, transfersDone: 0, seasonsPlayed: 0 },
  playerBonds: buildInitialBonds(),
}).state;

export const migrateState = (state) => {
  if (!state) return createFreshState();

  const asArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);
  const currentSeason = Math.floor(((state.week ?? 1) - 1) / 38) + 1;
  const normalizePendingTransfer = (transfer) => {
    if (!transfer || typeof transfer !== 'object') return null;
    const player = asArray(state.roster).find((item) => item?.id === transfer.playerId)
      ?? asArray(state.freeAgents).find((item) => item?.id === transfer.playerId)
      ?? asArray(state.market).find((item) => item?.id === transfer.playerId)
      ?? null;
    const offer = transfer.offer
      ?? asArray(state.clubOffers).find((item) => item?.id === transfer.offerId)
      ?? asArray(state.clubOffers).find((item) => item?.playerId === transfer.playerId && (item?.status === 'accepted_pending' || item?.status === 'open'))
      ?? null;
    if (!player || !offer) return null;
    return {
      ...transfer,
      playerName: transfer.playerName ?? `${player.firstName} ${player.lastName}`,
      offer,
      agreement: transfer.agreement ?? buildTransferAgreementFromEngine(player, offer, transfer.negotiatedOutcome ?? null),
      effectiveWeek: Number.isFinite(transfer.effectiveWeek) ? transfer.effectiveWeek : offer.effectiveWeek ?? (state.week ?? 1) + 1,
    };
  };
  const rawReputation = state.reputation ?? 20;
  const reputation = rawReputation;
  const agencyCountryCode = getAgencyCountryCode(state);
  const marketScoutLevel = (state.office?.scoutLevel ?? 0) + getStaffEffect(state.staff ?? {}, 'scoutAfrica');
  const allowedMarketCountryCodes = getMarketCountryCodes({ agencyCountryCode, reputation, scoutLevel: marketScoutLevel });
  const allowedMarketCountrySet = new Set(allowedMarketCountryCodes);
  const isOpenThroughScouting = (player) =>
    Boolean(player?.scoutReport) || (player?.timeline ?? []).some((entry) => entry?.type === 'scout');
  const isMarketCountryAllowed = (player) => {
    if (isOpenThroughScouting(player)) return true;
    const playerCountry = player?.countryCode ?? player?.clubCountryCode;
    return !allowedMarketCountrySet.size || allowedMarketCountrySet.has(playerCountry);
  };
  const clubSeasonHistory = normalizeClubSeasonHistory(state.clubSeasonHistory ?? {}, currentSeason);
  const convertLegacyObjective = (objective) => {
    if (!objective) return objective;
    if (objective.type === 'rep' || objective.type === 'reputation_gain') {
      return {
        ...objective,
        target: typeof objective.target === 'number' ? objective.target * 10 : objective.target,
        current: typeof objective.current === 'number' ? objective.current * 10 : objective.current,
      };
    }
    return objective;
  };
  const normalizeTransferValue = (player, club) => {
    const estimated = estimateTransferValue({
      rating: player?.rating,
      potential: player?.potential,
      age: player?.age,
      form: player?.form,
      clubTier: player?.clubTier ?? club?.tier ?? 3,
      brandValue: player?.brandValue,
    });
    const current = Number.isFinite(player?.value) ? player.value : null;

    if (!current || current <= 0) return estimated;
    if (current < 500000) return current * 1000;
    if (current < estimated * 0.5 || current > estimated * 2.5) return estimated;
    return current;
  };
  const playerCatalog = createPlayerCatalog(currentSeason);
  const reconcileCatalogPlayer = (player) => reconcilePlayerWithCatalog(player, currentSeason);
  const savedMarketVersion = state.marketCatalogVersion ?? null;
  const marketNeedsCatalogRefresh =
    savedMarketVersion !== MARKET_DATA_VERSION
    || asArray(state.market).length < 8
    || asArray(state.market).some((player) => player?.marketCatalogVersion !== MARKET_DATA_VERSION || !player?.databaseBacked);
  const freeAgentsNeedCatalogRefresh =
    savedMarketVersion !== MARKET_DATA_VERSION
    || asArray(state.freeAgents).length < 6
    || asArray(state.freeAgents).some((player) => player?.marketCatalogVersion !== MARKET_DATA_VERSION || !player?.databaseBacked);
  const marketShelfSource = marketNeedsCatalogRefresh ? [] : state.market;
  const freeAgentShelfSource = freeAgentsNeedCatalogRefresh ? [] : state.freeAgents;
  const normalizeMarketShelf = (list, count = 8) => {
    const current = asArray(list);
    const marketCap = getMarketRatingCeiling(reputation, marketScoutLevel);
    const sanitized = current
      .map(reconcileCatalogPlayer)
      .filter((player) => (player?.rating ?? 0) <= marketCap)
      .filter(isMarketCountryAllowed);
    const rosterIds = new Set(asArray(state.roster).map((player) => player?.id).filter(Boolean));
    const freeAgentIds = new Set(asArray(state.freeAgents).map((player) => player?.id).filter(Boolean));
    let finalList = Array.from(new Map(sanitized.map((player) => [player?.id, player])).values());
    const targetCount = Math.max(count, finalList.length);
    const existingIds = new Set([
      ...rosterIds,
      ...freeAgentIds,
      ...finalList.map((player) => player?.id).filter(Boolean),
    ]);
    if (finalList.length >= count) return finalList.slice(0, count);
    const filler = generateMarket(reputation, marketScoutLevel, targetCount - finalList.length, [...existingIds], currentSeason, agencyCountryCode);
    return [...finalList, ...filler].slice(0, count);
  };
  const normalizeFreeAgentShelf = (list, count = 6) => {
    const current = asArray(list);
    const marketCap = Math.max(58, getMarketRatingCeiling(reputation, marketScoutLevel) - 4);
    const sanitized = current
      .map(reconcileCatalogPlayer)
      .filter((player) => (player?.rating ?? 0) <= marketCap)
      .filter(isMarketCountryAllowed);
    const existingIds = new Set([
      ...asArray(state.roster).map((player) => player?.id).filter(Boolean),
      ...normalizeMarketShelf(marketShelfSource, 8).map((player) => player?.id).filter(Boolean),
      ...sanitized.map((player) => player?.id).filter(Boolean),
    ]);
    if (sanitized.length >= count) return sanitized.slice(0, count);
    const filler = generateFreeAgents(reputation, count - sanitized.length, [...existingIds], currentSeason, agencyCountryCode, marketScoutLevel);
    return [...sanitized, ...filler].slice(0, count);
  };

  return {
    ...state,
    day: Number.isFinite(state.day) ? Math.max(1, Math.min(7, state.day)) : 1,
    seasonDay: Number.isFinite(state.seasonDay) ? Math.max(1, state.seasonDay) : (((state.week ?? 1) - 1) * 7 + 1),
    agencyProfile: { ...DEFAULT_AGENCY_PROFILE, ...(state.agencyProfile ?? {}) },
    segmentReputation: { ...createDefaultSegmentReputation(), ...(state.segmentReputation ?? {}) },
    credibility: state.credibility ?? 52,
    difficulty: state.difficulty ?? state.agencyProfile?.difficulty ?? 'realiste',
    startProfile: state.startProfile ?? state.agencyProfile?.startProfile ?? 'ancien_joueur',
    countryReputation: state.countryReputation ?? createDefaultCountryReputation(agencyCountryCode, normalizeAgencyReputation(state.reputation ?? 20)),
    mediaRelations: { ...createDefaultMediaRelations(), ...(state.mediaRelations ?? {}) },
    playerSegmentReputation: { ...createDefaultPlayerSegmentReputation(), ...(state.playerSegmentReputation ?? {}) },
    rivalAgents: state.rivalAgents ?? createDefaultRivalAgents(),
    decisionHistory: state.decisionHistory ?? [],
    activeNarratives: state.activeNarratives ?? [],
    staff: { ...createDefaultStaff(), ...(state.staff ?? {}) },
    promises: normalizePromises(state.promises ?? []),
    clubOffers: state.clubOffers ?? [],
    pendingTransfers: state.pendingTransfers ?? [],
    transferHistory: state.transferHistory ?? [],
    negotiationCooldowns: state.negotiationCooldowns ?? {},
    messageQueue: state.messageQueue ?? [],
    socialCrisisCooldowns: state.socialCrisisCooldowns ?? {},
    dossierMemory: state.dossierMemory ?? createDefaultDossierMemory(),
    pendingChainedEvents: state.pendingChainedEvents ?? [],
    seasonAwards: state.seasonAwards ?? {},
    worldState: state.worldState ?? generateWorldState(1),
    leagueTables: mergeWithInitialLeagueTables(state.leagueTables),
    competitionTopStats: state.competitionTopStats ?? { league: {}, europe: {} },
    leagueSeasonData: state.leagueSeasonData ?? {},
    leagueReputation: state.leagueReputation ?? createDefaultLeagueReputation(agencyCountryCode),
    clubRelations: state.clubRelations ?? createDefaultClubRelations(),
    clubMemory: state.clubMemory ?? createDefaultClubMemory(),
    clubSeasonHistory,
    scoutingMissions: asArray(state.scoutingMissions),
    competitorThreats: asArray(state.competitorThreats),
    lastFixtures: asArray(state.lastFixtures),
    nextFixtures: asArray(state.nextFixtures),
    matchCalendar: asArray(state.matchCalendar),
    matchResultStore: asArray(state.matchResultStore),
    agencyLevel: state.agencyLevel ?? 4,
    history: asArray(state.history).map((entry) => (entry && typeof entry === 'object' && typeof entry.rep === 'number'
      ? { ...entry, rep: entry.rep <= 100 ? entry.rep * 10 : entry.rep }
      : entry)),
    news: asArray(state.news),
    messages: asArray(state.messages).map(normalizeMessageRecord),
    agencyGoals: asArray(state.agencyGoals, createLongTermAgencyGoals()).map((goal) => (goal.metric === 'GLOBAL' && goal.target <= 100 ? { ...goal, target: goal.target * 10 } : goal)),
    contacts: state.contacts ?? createDefaultContacts(),
    seasonObjectives: (asArray(state.seasonObjectives).length ? asArray(state.seasonObjectives) : generateSeasonObjectives({ week: state.week ?? 1, reputation })).map(convertLegacyObjective),
    gems: state.gems ?? 0,
    lastInteractiveEventWeek: state.lastInteractiveEventWeek ?? 0,
    legendarySeenIds: state.legendarySeenIds ?? [],
    worldCupState: state.worldCupState ?? null,
    europeanCupData: state.europeanCupData ?? {},
    sentSeasonalMessages: state.sentSeasonalMessages ?? [],
    activePeriod: state.activePeriod ?? null,
    office: {
      scoutLevel: state.office?.scoutLevel ?? 0,
      lawyerLevel: state.office?.lawyerLevel ?? 0,
      mediaLevel: state.office?.mediaLevel ?? 0,
    },
    stats: {
      totalEarned: state.stats?.totalEarned ?? 0,
      playersSigned: state.stats?.playersSigned ?? 0,
      transfersDone: state.stats?.transfersDone ?? 0,
      seasonsPlayed: state.stats?.seasonsPlayed ?? 0,
    },
    clubOffers: asArray(state.clubOffers),
    pendingTransfers: asArray(state.pendingTransfers).map(normalizePendingTransfer).filter(Boolean),
    transferHistory: asArray(state.transferHistory),
    negotiationCooldowns: state.negotiationCooldowns ?? {},
    messageQueue: asArray(state.messageQueue).map(normalizeMessageRecord),
    socialCrisisCooldowns: state.socialCrisisCooldowns ?? {},
    dossierMemory: state.dossierMemory ?? createDefaultDossierMemory(),
    pendingChainedEvents: asArray(state.pendingChainedEvents),
    marketCatalogVersion: MARKET_DATA_VERSION,
    market: normalizeMarketShelf(marketShelfSource, 8).map((rawPlayer) => {
      const player = reconcileCatalogPlayer(rawPlayer);
      const country = player.countryCode ? getCountry(player.countryCode) : getWeightedCountry(reputation);
      const personality = player.personality ?? pick(PERSONALITIES);
      const club = normalizeClubForPlayer(player, country.code);
      const coreProfile = normalizePlayerCoreProfile(player, country.code, club, currentSeason);

      return attachClubSeasonContext({
        ...player,
        marketCatalogVersion: MARKET_DATA_VERSION,
        ...coreProfile,
        ...ensureDeepPlayerProfile(player, country.code, club),
        ...normalizeRoleProfile(player),
        club: club.name,
        clubTier: player.clubTier ?? club.tier,
        clubCountryCode: club.countryCode,
        clubCity: club.city,
        countryCode: player.countryCode ?? country.code,
        countryLabel: player.countryLabel ?? country.label,
        countryFlag: player.countryFlag ?? country.flag,
        value: normalizeTransferValue(player, club),
        weeklySalary: player.weeklySalary < 1000 ? player.weeklySalary * 20 : player.weeklySalary,
        signingCost: player.signingCost < 1000 ? player.signingCost * 10 : player.signingCost,
        fatigue: player.fatigue ?? rand(12, 36),
        brandValue: player.brandValue ?? rand(8, 35),
        seasonStats: player.seasonStats ?? { appearances: 0, goals: 0, assists: 0, saves: 0, tackles: 0, keyPasses: 0, xg: 0, injuries: 0, ratings: [], averageRating: null },
        careerGoal: player.careerGoal ?? createCareerGoal(player),
        scoutReport: (state.staff?.scoutAfrica ?? 0) > 0 ? player.scoutReport ?? createScoutReport(player, state.office?.scoutLevel ?? 0) : null,
        agentContract: player.agentContract ?? createAgentContract(player),
        timeline: player.timeline ?? [],
        personality,
        trust: player.trust ?? getInitialTrust(personality),
        matchHistory: (Array.isArray(player.matchHistory) ? player.matchHistory : []).map(normalizeEuropeanMatch),
        europeanCompetition: getPlayerEuropeanCompetition({ ...player, club: club.name, clubTier: club.tier, clubCountryCode: club.countryCode }, currentSeason),
      }, state.leagueTables, state.leagueSeasonData);
    }),
    freeAgents: normalizeFreeAgentShelf(freeAgentShelfSource, 6).map((rawPlayer) => {
      const player = reconcileCatalogPlayer(rawPlayer);
      const country = player.countryCode ? getCountry(player.countryCode) : getWeightedCountry(reputation);
      const personality = player.personality ?? pick(PERSONALITIES);
      const club = normalizeClubForPlayer(player, country.code);
      const coreProfile = normalizePlayerCoreProfile(player, country.code, club, currentSeason);

      return attachClubSeasonContext({
        ...player,
        marketCatalogVersion: MARKET_DATA_VERSION,
        ...coreProfile,
        ...ensureDeepPlayerProfile(player, country.code, club),
        ...normalizeRoleProfile(player),
        club: club.name,
        clubTier: player.clubTier ?? club.tier,
        clubCountryCode: club.countryCode,
        clubCity: club.city,
        countryCode: player.countryCode ?? country.code,
        countryLabel: player.countryLabel ?? country.label,
        countryFlag: player.countryFlag ?? country.flag,
        value: normalizeTransferValue(player, club),
        weeklySalary: player.weeklySalary < 1000 ? player.weeklySalary * 20 : player.weeklySalary,
        signingCost: player.signingCost < 1000 ? player.signingCost * 10 : player.signingCost,
        fatigue: player.fatigue ?? rand(12, 36),
        brandValue: player.brandValue ?? rand(8, 35),
        seasonStats: player.seasonStats ?? { appearances: 0, goals: 0, assists: 0, saves: 0, tackles: 0, keyPasses: 0, xg: 0, injuries: 0, ratings: [], averageRating: null },
        careerGoal: player.careerGoal ?? createCareerGoal(player),
        agentContract: player.agentContract ?? createAgentContract(player),
        timeline: player.timeline ?? [],
        personality,
        trust: player.trust ?? getInitialTrust(personality),
        clubSeasonHistory: clubSeasonHistory[club.name] ?? null,
        matchHistory: (Array.isArray(player.matchHistory) ? player.matchHistory : []).map(normalizeEuropeanMatch),
      }, state.leagueTables, state.leagueSeasonData);
    }),
    promises: normalizePromises(asArray(state.promises)),
    roster: asArray(state.roster).map((rawPlayer) => {
      const player = reconcileCatalogPlayer(rawPlayer);
      const country = player.countryCode ? getCountry(player.countryCode) : getWeightedCountry(reputation);
      const personality = player.personality ?? pick(PERSONALITIES);
      const club = normalizeClubForPlayer(player, country.code);
      const coreProfile = normalizePlayerCoreProfile(player, country.code, club, currentSeason);

      return attachClubSeasonContext({
        ...player,
        ...coreProfile,
        ...ensureDeepPlayerProfile(player, country.code, club),
        ...normalizeRoleProfile(player),
        club: club.name,
        clubTier: player.clubTier ?? club.tier,
        clubCountryCode: club.countryCode,
        clubCity: club.city,
        countryCode: player.countryCode ?? country.code,
        countryLabel: player.countryLabel ?? country.label,
        countryFlag: player.countryFlag ?? country.flag,
        value: normalizeTransferValue(player, club),
        weeklySalary: player.weeklySalary < 1000 ? player.weeklySalary * 20 : player.weeklySalary,
        signingCost: player.signingCost < 1000 ? player.signingCost * 10 : player.signingCost,
        fatigue: player.fatigue ?? rand(12, 36),
        brandValue: player.brandValue ?? rand(8, 35),
        seasonStats: player.seasonStats ?? { appearances: 0, goals: 0, assists: 0, saves: 0, tackles: 0, keyPasses: 0, xg: 0, injuries: 0, ratings: [], averageRating: null },
        careerGoal: player.careerGoal ?? createCareerGoal(player),
        agentContract: player.agentContract ?? createAgentContract(player),
        timeline: player.timeline ?? [],
        personality,
        trust: player.trust ?? getInitialTrust(personality),
        recentResults: player.recentResults ?? [],
        previousRating: player.previousRating ?? null,
        hiddenTrait: player.hiddenTrait ?? null,
        traitRevealed: player.traitRevealed ?? false,
        lastInteractionWeek: player.lastInteractionWeek ?? 0,
        clubSeasonHistory: clubSeasonHistory[club.name] ?? null,
        europeanCompetition: getPlayerEuropeanCompetition({ ...player, club: club.name, clubTier: club.tier, clubCountryCode: club.countryCode }, currentSeason),
        matchHistory: (Array.isArray(player.matchHistory) ? player.matchHistory : []).map(normalizeEuropeanMatch),
      }, state.leagueTables, state.leagueSeasonData);
    }),
  };
};

export const signPlayer = (state, player) => {
  const capacity = getAgencyCapacity(state.agencyLevel);
  const signingCost = Math.max(0, Math.floor(player.signingCost ?? 0));
  if (state.money < signingCost) return { state, error: 'Fonds insuffisants' };
  if (state.roster.length >= capacity) return { state, error: `Agence pleine (${capacity} joueurs)` };
  const currentSeason = Math.floor(((state.week ?? 1) - 1) / 38) + 1;
  const signedPlayer = attachClubSeasonContext({
    ...player,
    agencySignedWeek: state.week,
    agencySignedRating: player.rating,
    lastInteractionWeek: state.week,
    lastMessageWeek: state.week,
    relationshipStartedWeek: state.week,
    careerGoal: player.careerGoal ?? createCareerGoal(player),
    agentContract: player.agentContract ?? createAgentContract(player),
    europeanCompetition: getPlayerEuropeanCompetition(player, currentSeason),
    clubSeasonHistory: state.clubSeasonHistory?.[player.club] ?? null,
    timeline: [
      { week: state.week, type: 'signature', label: `Signature avec ${state.agencyProfile?.name ?? 'ton agence'}` },
      ...(player.timeline ?? []),
    ],
  }, state.leagueTables, state.leagueSeasonData);
  const nextRoster = [...state.roster, signedPlayer];
  const scheduled = scheduleLeagueMatches(state, nextRoster, state.week);

  return {
    state: {
      ...state,
      money: state.money - signingCost,
      credibility: applyCredibilityChange(state.credibility, 1),
      playerSegmentReputation: applyPlayerSegmentReputation(state.playerSegmentReputation, getPlayerSegment(signedPlayer), 2),
      countryReputation: applyLeagueReputation(state.countryReputation, signedPlayer.countryCode, 1),
      decisionHistory: addDecisionHistory(state.decisionHistory, {
        week: state.week,
        type: 'signature',
        label: 'Signature joueur',
        detail: `${signedPlayer.firstName} ${signedPlayer.lastName} rejoint le portefeuille.`,
        playerId: signedPlayer.id,
        playerName: `${signedPlayer.firstName} ${signedPlayer.lastName}`,
      }),
      roster: nextRoster,
      nextFixtures: scheduled.fixtures,
      matchCalendar: scheduled.calendar,
      market: state.market.filter((candidate) => candidate.id !== player.id),
      freeAgents: (state.freeAgents ?? []).filter((candidate) => candidate.id !== player.id),
      stats: { ...state.stats, playersSigned: (state.stats?.playersSigned ?? 0) + 1 },
      messages: [
        createMessage({ player: signedPlayer, type: 'welcome', week: state.week, context: 'signing' }),
        ...state.messages,
      ].slice(0, 40),
    },
    newMessagesCount: 1,
  };
};

export const refreshMarket = (state) => {
  if (state.money < MARKET_REFRESH_COST) return { state, error: 'Fonds insuffisants' };

  const specializationBonus = SPECIALIZATION_EFFECTS[state.agencyProfile?.style ?? 'equilibre']?.marketBonus ?? 0;
  const staffBonus = getStaffEffect(state.staff, 'scoutAfrica');
  const scoutLevel = state.office.scoutLevel + staffBonus;
  // Exclure les IDs déjà dans le roster pour éviter les doublons
  const rosterIds = (state.roster ?? []).map((p) => p.id);
  const currentSeason = Math.floor(((state.week ?? 1) - 1) / 38) + 1;
  const eliteActive = state.eliteMarketUntilWeek && state.week <= state.eliteMarketUntilWeek;
  const eliteRepBoost = eliteActive ? 200 : 0;
  let newMarket = generateMarket(
    Math.min(1000, state.reputation + staffBonus * 3 + specializationBonus + eliteRepBoost),
    scoutLevel + (eliteActive ? 2 : 0),
    8,
    rosterIds,
    currentSeason,
    getAgencyCountryCode(state),
  ).map((player) => ({
    ...player,
    marketCatalogVersion: MARKET_DATA_VERSION,
    scoutReport: scoutLevel > 0 ? createScoutReport(player, scoutLevel) : null,
  }));

  const seenIds = state.legendarySeenIds ?? [];
  const availableLegends = LEGENDARY_PLAYERS.filter(
    (l) => !seenIds.includes(l.id) && !state.roster.some((p) => p.id === l.id),
  );
  let nextSeenIds = seenIds;
  if (availableLegends.length > 0 && normalizeAgencyReputation(state.reputation) >= 80 && Math.random() < 0.015) {
    const legend = availableLegends[Math.floor(Math.random() * availableLegends.length)];
    newMarket = [legend, ...newMarket];
    nextSeenIds = [...seenIds, legend.id];
  }

  return {
    state: {
      ...state,
      money: state.money - MARKET_REFRESH_COST,
      market: newMarket,
      marketCatalogVersion: MARKET_DATA_VERSION,
      legendarySeenIds: nextSeenIds,
    },
  };
};

export const upgradeOffice = (state, type) => {
  const currentLevel = state.office[type];
  const cost = OFFICE_UPGRADE_COSTS[type]?.[currentLevel];
  if (!cost) return { state, error: 'Niveau maximum' };
  if (state.money < cost) return { state, error: 'Fonds insuffisants' };

  return {
    state: {
      ...state,
      money: state.money - cost,
      office: { ...state.office, [type]: currentLevel + 1 },
    },
  };
};

export const upgradeAgency = (state) => {
  const cost = getAgencyUpgradeCost(state.agencyLevel);
  if (!cost) return { state, error: 'Niveau maximum' };
  if (state.money < cost) return { state, error: 'Fonds insuffisants' };

  return {
    state: {
      ...state,
      money: state.money - cost,
      agencyLevel: state.agencyLevel + 1,
    },
  };
};

export const upgradeStaff = (state, key) => upgradeStaffMember(state, key);

export const startScoutingMission = (state, countryCode) => {
  const scoutLevel = getStaffEffect(state.staff, 'scoutAfrica');
  if (scoutLevel <= 0) return { state, error: "Recrute d'abord un scout international" };
  if ((state.scoutingMissions ?? []).some((mission) => mission.status === 'active')) return { state, error: 'Mission déjà en cours' };

  return {
    state: {
      ...state,
      scoutingMissions: [
        {
          id: makeId('mission'),
          countryCode,
          weeksLeft: Math.max(1, 4 - scoutLevel),
          scoutLevel,
          status: 'active',
        },
        ...(state.scoutingMissions ?? []),
      ].slice(0, 8),
    },
  };
};

export const updateAgencyProfile = (state, profilePatch) => {
  const isFirstLaunch = !state.agencyProfile?.onboarded && profilePatch.onboarded;
  const profiledState = isFirstLaunch ? applyStartingProfileToState(state, profilePatch) : state;
  const nextAgencyProfile = {
    ...profiledState.agencyProfile,
    ...profilePatch,
  };
  const nextState = {
    ...profiledState,
    difficulty: profilePatch.difficulty ?? profiledState.difficulty,
    startProfile: profilePatch.startProfile ?? profiledState.startProfile,
    agencyProfile: nextAgencyProfile,
  };

  if (!isFirstLaunch) return { state: nextState };

  const scoutLevel = (nextState.office?.scoutLevel ?? 0) + getStaffEffect(nextState.staff, 'scoutAfrica');
  const currentSeason = Math.floor(((nextState.week ?? 1) - 1) / 38) + 1;
  const rosterIds = (nextState.roster ?? []).map((player) => player.id);
  const countryCode = getAgencyCountryCode(nextState);

  return {
    state: {
      ...nextState,
      countryReputation: createDefaultCountryReputation(countryCode, normalizeAgencyReputation(nextState.reputation ?? 20)),
      leagueReputation: createDefaultLeagueReputation(countryCode),
      market: generateMarket(nextState.reputation, scoutLevel, 8, rosterIds, currentSeason, countryCode).map((player) => ({ ...player, marketCatalogVersion: MARKET_DATA_VERSION })),
      freeAgents: generateFreeAgents(nextState.reputation, 6, rosterIds, currentSeason, countryCode, scoutLevel).map((player) => ({ ...player, marketCatalogVersion: MARKET_DATA_VERSION })),
      marketCatalogVersion: MARKET_DATA_VERSION,
    },
  };
};

export const acceptClubOffer = (state, offerId, negotiatedOutcome = null) => {
  const offer = state.clubOffers.find((item) => item.id === offerId);
  if (!offer || offer.status !== 'open') return { state, error: 'Offre indisponible' };
  const player = state.roster.find((item) => item.id === offer.playerId)
    ?? state.freeAgents?.find((item) => item.id === offer.playerId);
  if (!player) return { state, error: 'Joueur introuvable' };
  const agreement = buildTransferAgreementFromEngine(player, offer, negotiatedOutcome);
  const targetClub = CLUBS.find((club) => club.name === offer.club);
  const phase = getPhase(state.week);
  const closeCompetingOffers = (item) => {
    if (item.id === offerId) return item;
    if (item.playerId !== offer.playerId) return item;
    if (!['open'].includes(item.status)) return item;
    return { ...item, status: 'superseded' };
  };
  const settlePlayerMessages = (messages, settledContext) => messages.map((message) => {
    if (message.playerId !== player.id) return message;
    if (message.type !== 'transfer_request') return message;
    if (String(message.context ?? '').includes('deal_signed') || String(message.context ?? '').includes('predeal_signed')) return message;
    return {
      ...message,
      resolved: true,
      context: settledContext,
      responseText: settledContext === 'deal_signed_player'
        ? 'Le deal est signé, le dossier est maintenant clos.'
        : 'Le pré-accord est signé, le dossier reste sous contrôle.',
    };
  });

  if (offer.preWindow && !phase.mercato) {
    const effectiveWeek = offer.effectiveWeek ?? state.week + 1;
    return {
      state: {
        ...state,
        credibility: applyCredibilityChange(state.credibility, 1),
        clubRelations: applyClubRelation(state.clubRelations, offer.club, 2),
        clubMemory: recordClubMemory(state.clubMemory, offer.club, { trust: 2, week: state.week }),
        negotiationCooldowns: {
          ...(state.negotiationCooldowns ?? {}),
          [player.id]: state.week + 4,
        },
        decisionHistory: addDecisionHistory(state.decisionHistory, {
          week: state.week,
          type: 'transfer_predeal',
          label: 'Pré-accord signé',
          detail: `${offer.playerName} rejoindra ${offer.club} à l'ouverture du mercato.`,
          playerId: player.id,
          playerName: offer.playerName,
        }),
        clubOffers: state.clubOffers.map((item) => (
          item.id === offerId
            ? { ...item, status: 'accepted_pending' }
            : closeCompetingOffers(item)
        )),
        pendingTransfers: [
          {
            id: makeId('pending_transfer'),
            offerId,
            playerId: player.id,
            playerName: offer.playerName,
            effectiveWeek,
            offer,
            agreement,
          },
          ...(state.pendingTransfers ?? []),
        ].slice(0, 20),
        news: [
          createManualNewsPost({
            type: 'transfert',
            player,
            week: state.week,
            text: `Pré-accord: ${offer.playerName} rejoindra ${offer.club} à l'ouverture du mercato ${offer.window}.`,
            reputationImpact: 2,
            account: { name: 'Mercato Insider', kind: 'journal', icon: 'MI', color: '#172026' },
          }),
          ...state.news,
        ].slice(0, 60),
        messages: [
          {
            id: makeId('msg'),
            week: state.week,
            type: 'ds_dialogue',
            context: 'predeal_signed',
            playerId: player.id,
            playerName: offer.playerName,
            threadKey: `${player.id}:staff:ds`,
            threadLabel: `DS de ${offer.club}`,
            senderRole: 'staff',
            senderName: `DS de ${offer.club}`,
            subject: 'Pré-accord validé',
            body: `On confirme le pré-accord pour ${offer.playerName}. Activation officielle prévue à l'ouverture du mercato ${offer.window}.`,
            read: false,
            resolved: false,
          },
          {
            id: makeId('msg'),
            week: state.week,
            type: 'transfer_request',
            context: 'predeal_signed_player',
            playerId: player.id,
            playerName: offer.playerName,
            threadKey: player.id,
            threadLabel: offer.playerName,
            senderRole: 'player',
            senderName: offer.playerName,
            subject: 'Pré-accord signé',
            body: `Parfait, le deal avec ${offer.club} est posé. Je reste focus jusque-là.`,
            read: false,
            resolved: false,
          },
          ...settlePlayerMessages(state.messages, 'predeal_signed_player'),
        ].slice(0, 40),
      },
    };
  }

  const nextRoster = state.roster.map((item) =>
    item.id === offer.playerId
      ? applyCompletedTransferToPlayerFromEngine(item, offer, agreement, state.week)
      : item,
  );
  const scheduled = scheduleLeagueMatches(state, nextRoster, state.week);

  return {
    state: {
      ...state,
      money: state.money + agreement.commission,
      reputation: applyReputationChange(state.reputation, scaleReputationDelta(5)),
      credibility: applyCredibilityChange(state.credibility, 2),
      countryReputation: applyLeagueReputation(state.countryReputation, offer.clubCountryCode ?? targetClub?.countryCode, 3),
      playerSegmentReputation: applyPlayerSegmentReputation(state.playerSegmentReputation, getPlayerSegment(player), 3),
      decisionHistory: addDecisionHistory(state.decisionHistory, {
        week: state.week,
        type: 'transfer',
        label: 'Transfert négocié',
        detail: `${offer.playerName} rejoint ${offer.club} avec un rôle ${agreement.clubRole}.`,
        playerId: player.id,
        playerName: offer.playerName,
      }),
      leagueReputation: applyLeagueReputation(state.leagueReputation, offer.clubCountryCode ?? targetClub?.countryCode, 4),
      clubRelations: applyClubRelation(state.clubRelations, offer.club, 5),
      clubMemory: recordClubMemory(state.clubMemory, offer.club, { trust: 3, week: state.week }),
      negotiationCooldowns: {
        ...(state.negotiationCooldowns ?? {}),
        [player.id]: state.week + 4,
      },
      segmentReputation: applySegmentReputationChange(state.segmentReputation, { business: 6, sportif: 2 }),
      clubOffers: state.clubOffers.map((item) => (
        item.id === offerId
          ? { ...item, status: 'accepted' }
          : closeCompetingOffers(item)
      )),
      roster: nextRoster,
      nextFixtures: scheduled.fixtures,
      matchCalendar: scheduled.calendar,
      promises: resolvePromisesForPlayer(state.promises, offer.playerId, ['transfer_request']),
      stats: {
        ...state.stats,
        transfersDone: state.stats.transfersDone + 1,
        totalEarned: state.stats.totalEarned + agreement.commission,
      },
      news: [
        createManualNewsPost({
          type: 'transfert',
          player,
          week: state.week,
          text: `${offer.playerName} rejoint ${offer.club} après négociation : rôle ${agreement.clubRole}, contrat ${Math.round(agreement.contractWeeks / 52)} ans, prime ${formatMoney(agreement.signingBonus)}, clause ${formatMoney(agreement.releaseClause)}.`,
          reputationImpact: 5,
          account: { name: 'Mercato Insider', kind: 'journal', icon: 'MI', color: '#172026' },
        }),
        ...state.news,
      ].slice(0, 60),
      messages: [
        {
          id: makeId('msg'),
          week: state.week,
          type: 'ds_dialogue',
          context: 'deal_signed',
          playerId: player.id,
          playerName: offer.playerName,
          threadKey: `${player.id}:staff:ds`,
          threadLabel: `DS de ${offer.club}`,
          senderRole: 'staff',
          senderName: `DS de ${offer.club}`,
          subject: 'Deal bouclé',
          body: `On confirme la signature de ${offer.playerName}. Contrat ${Math.round(agreement.contractWeeks / 52)} ans, rôle ${agreement.clubRole}.`,
          read: false,
          resolved: false,
        },
        {
          id: makeId('msg'),
          week: state.week,
          type: 'transfer_request',
          context: 'deal_signed_player',
          playerId: player.id,
          playerName: offer.playerName,
          threadKey: player.id,
          threadLabel: offer.playerName,
          senderRole: 'player',
          senderName: offer.playerName,
          subject: 'Transfert signé',
          body: `C'est signé avec ${offer.club}. Merci pour la négo, maintenant on avance.`,
          read: false,
          resolved: false,
        },
        ...settlePlayerMessages(state.messages, 'deal_signed_player'),
      ].slice(0, 40),
    },
  };
};

export const rejectClubOffer = (state, offerId) => ({
  state: {
    ...state,
    credibility: applyCredibilityChange(state.credibility, -1),
    clubOffers: state.clubOffers.map((offer) => (offer.id === offerId ? { ...offer, status: 'rejected' } : offer)),
    clubMemory: recordClubMemory(
      state.clubMemory,
      state.clubOffers.find((offer) => offer.id === offerId)?.club,
      { blocks: 1, lies: 1, trust: -2, week: state.week },
    ),
    decisionHistory: addDecisionHistory(state.decisionHistory, {
      week: state.week,
      type: 'transfer',
      label: 'Offre refusée',
      detail: `Offre de ${state.clubOffers.find((offer) => offer.id === offerId)?.club ?? 'club'} refusée.`,
    }),
    clubRelations: applyClubRelation(
      state.clubRelations,
      state.clubOffers.find((offer) => offer.id === offerId)?.club,
      -2,
    ),
  },
});

export const createPlayerMarketAction = (state, playerId, action) => {
  const player = state.roster.find((item) => item.id === playerId);
  if (!player) return { state, error: 'Joueur introuvable' };
  if (getActiveDossierPlayerIds(state).has(playerId) && action !== 'loan') {
    return { state, error: `${player.firstName} ${player.lastName} a déjà un dossier ouvert.` };
  }
  const phase = getPhase(state.week);
  const allowedTiers = getClubTierForRating(player.rating, player.potential);
  const targetClubs = CLUBS
    .filter((club) => club.name !== player.club)
    .filter((club) => action === 'loan' ? club.tier >= Math.min(4, player.clubTier) : allowedTiers.includes(club.tier));
  const club = pick(targetClubs.length ? targetClubs : CLUBS);
  const country = getCountry(club.countryCode);
  const trustCost = action === 'transfer_list' ? -3 : action === 'loan' ? -1 : 1;
  const credibilityDelta = action === 'propose' ? 1 : action === 'transfer_list' ? -1 : 0;
  const levelPenalty = player.rating < 128 ? -0.16 : player.rating < 140 ? -0.08 : 0;
  const nextWindow = !phase.mercato
    ? (phase.seasonWeek <= 18
      ? { window: 'hiver', effectiveWeek: state.week + (19 - phase.seasonWeek) }
      : phase.seasonWeek <= 37
        ? { window: 'été', effectiveWeek: state.week + (38 - phase.seasonWeek) }
        : null)
    : null;
  const isPreWindowOffer = Boolean(nextWindow && phase.seasonWeek >= 16 && phase.seasonWeek !== 38);
  const chance = action === 'propose' ? 0.34 : action === 'free_trial' ? 0.42 : action === 'loan' ? 0.28 : 0.22;
  const officialChance = phase.mercato ? chance : isPreWindowOffer ? chance * 0.42 : 0;
  const isOfficialOffer = Math.random() < Math.max(0.04, officialChance + levelPenalty);
  const price = Math.floor(player.value * (action === 'loan' ? 0.08 : Math.random() * 0.28 + 0.82));
  const nextRoster = state.roster.map((item) =>
    item.id === playerId
      ? {
        ...item,
        moral: clamp(item.moral + (action === 'transfer_list' ? -4 : 2), 0, 100),
        trust: clamp((item.trust ?? 50) + trustCost, 0, 100),
        careerStatus: action === 'loan' ? 'en prêt' : 'en discussion',
        timeline: [{ week: state.week, type: 'mercato', label: action === 'loan' ? 'Recherche de prêt lancée' : action === 'transfer_list' ? 'Mis sur le marché' : 'Proposé à plusieurs clubs' }, ...(item.timeline ?? [])].slice(0, 18),
      }
      : item,
  );
  const baseState = {
    ...state,
    roster: nextRoster,
    credibility: applyCredibilityChange(state.credibility, credibilityDelta),
    decisionHistory: addDecisionHistory(state.decisionHistory, {
      week: state.week,
      type: 'mercato',
      label: action === 'loan' ? 'Recherche de prêt' : action === 'transfer_list' ? 'Mise sur le marché' : 'Proposition aux clubs',
      detail: `${player.firstName} ${player.lastName} ciblé par une démarche proactive vers ${club.name}.`,
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
    }),
    news: [
      createManualNewsPost({
        type: 'transfert',
        player,
        week: state.week,
        text: isOfficialOffer
          ? isPreWindowOffer
            ? `${club.name} propose un pré-accord pour ${player.firstName} ${player.lastName}, à activer au prochain mercato.`
            : `${club.name} transforme l'intérêt en offre concrète pour ${player.firstName} ${player.lastName}.`
          : `${club.name} prend des renseignements sur ${player.firstName} ${player.lastName}, sans offre officielle pour l'instant.`,
        reputationImpact: credibilityDelta,
        account: { name: 'TransferRadar', kind: 'data', icon: 'TR', color: '#2f80ed' },
      }),
      ...state.news,
    ].slice(0, 60),
  };

  if (!isOfficialOffer) {
    return {
      state: baseState,
      message: 'Intérêt créé, mais aucune offre officielle pour le moment.',
    };
  }

  return {
    state: {
      ...baseState,
      clubOffers: [
        {
          id: makeId('offer'),
          week: state.week,
          expiresWeek: state.week + (phase.deadlineDay ? 1 : 2),
          window: phase.window ?? nextWindow?.window ?? 'approche',
          preWindow: isPreWindowOffer,
          effectiveWeek: isPreWindowOffer ? nextWindow?.effectiveWeek : state.week,
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          club: club.name,
          clubTier: club.tier,
          clubCountry: country.flag,
          clubCountryCode: club.countryCode,
          clubCity: club.city,
          price,
          salMult: rand(112, 172) / 100,
          status: 'open',
          actionSource: action,
        },
        ...(state.clubOffers ?? []),
      ].slice(0, 30),
    },
    message: isPreWindowOffer
      ? `${club.name} fait un pré-accord pour le prochain mercato.`
      : `${club.name} fait une offre officielle.`,
  };
};

export const createSecretOfferFollowup = (state, playerId) => {
  const player = state.roster.find((item) => item.id === playerId);
  if (!player) return { state, error: 'Joueur introuvable' };
  if ((state.pendingTransfers ?? []).some((transfer) => transfer.playerId === player.id)) {
    return { state, error: `${player.firstName} ${player.lastName} est déjà engagé dans un transfert` };
  }
  if ((state.clubOffers ?? []).some((offer) => offer.playerId === player.id && offer.status === 'open')) {
    return { state, error: `${player.firstName} ${player.lastName} a déjà une offre ouverte` };
  }

  const phase = getPhase(state.week);
  const allowedTiers = getClubTierForRating(player.rating, player.potential);
  const targetClubs = CLUBS
    .filter((club) => club.name !== player.club && allowedTiers.includes(club.tier))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  const club = pick(targetClubs.length ? targetClubs : CLUBS.filter((c) => c.name !== player.club));
  if (!club) return { state, error: 'Aucun club compatible' };
  const country = getCountry(club.countryCode);

  const nextWindow = !phase.mercato
    ? (phase.seasonWeek <= 18
      ? { window: 'hiver', effectiveWeek: state.week + (19 - phase.seasonWeek) }
      : phase.seasonWeek <= 37
        ? { window: 'été', effectiveWeek: state.week + (38 - phase.seasonWeek) }
        : null)
    : null;
  const preWindow = Boolean(nextWindow && phase.seasonWeek >= 16 && phase.seasonWeek !== 38);
  const priceMult = rand(102, 136) / 100;
  const offer = {
    id: makeId('offer'),
    week: state.week,
    expiresWeek: state.week + (preWindow ? 3 : (phase.deadlineDay ? 1 : 2)),
    window: phase.window ?? nextWindow?.window ?? 'approche',
    isHotWeek: true,
    isCompetingOffer: true,
    preWindow,
    effectiveWeek: preWindow ? nextWindow?.effectiveWeek : state.week,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    club: club.name,
    clubTier: club.tier,
    clubCountry: country.flag,
    clubCountryCode: club.countryCode,
    clubCity: club.city,
    price: Math.max(1000, Math.floor((player.value ?? 1000) * priceMult)),
    salMult: Math.round((rand(118, 182) / 100) * 100) / 100,
    status: 'open',
    actionSource: 'secret_offer_followup',
  };

  return {
    state: {
      ...state,
      clubOffers: [offer, ...(state.clubOffers ?? [])].slice(0, 30),
      news: [
        createManualNewsPost({
          type: 'transfert',
          player,
          week: state.week,
          text: `Contact confirmé: ${club.name} passe à l'offensive pour ${player.firstName} ${player.lastName}.`,
          reputationImpact: 2,
          account: { name: 'TransferRadar', kind: 'data', icon: 'TR', color: '#2f80ed' },
        }),
        ...(state.news ?? []),
      ].slice(0, 60),
      decisionHistory: addDecisionHistory(state.decisionHistory, {
        week: state.week,
        type: 'mercato',
        label: 'Secret offer confirmé',
        detail: `${club.name} a transformé le contact discret en offre officielle.`,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
      }),
    },
    offer,
  };
};

export const createPromiseCrisisOffer = (state, playerId) => {
  const player = state.roster.find((item) => item.id === playerId);
  if (!player) return { state, error: 'Joueur introuvable' };
  if ((state.pendingTransfers ?? []).some((transfer) => transfer.playerId === player.id)) {
    return { state, error: `${player.firstName} ${player.lastName} est déjà engagé dans un transfert` };
  }
  if ((state.clubOffers ?? []).some((offer) => offer.playerId === player.id && offer.status === 'open')) {
    return { state, error: `${player.firstName} ${player.lastName} a déjà une offre ouverte` };
  }

  const phase = getPhase(state.week);
  const allowedTiers = getClubTierForRating(player.rating, player.potential);
  const candidateClubs = CLUBS
    .filter((club) => club.name !== player.club && allowedTiers.includes(club.tier))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  const club = pick(candidateClubs.length ? candidateClubs : CLUBS.filter((c) => c.name !== player.club));
  if (!club) return { state, error: 'Aucun club compatible' };
  const country = getCountry(club.countryCode);
  const offer = {
    id: makeId('offer'),
    week: state.week,
    expiresWeek: state.week + 1,
    window: phase.window ?? 'approche',
    isHotWeek: true,
    isCompetingOffer: true,
    preWindow: false,
    effectiveWeek: state.week,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    club: club.name,
    clubTier: club.tier,
    clubCountry: country.flag,
    clubCountryCode: club.countryCode,
    clubCity: club.city,
    price: Math.max(1000, Math.floor((player.value ?? 1000) * (rand(98, 128) / 100))),
    salMult: Math.round((rand(122, 188) / 100) * 100) / 100,
    status: 'open',
    actionSource: 'promise_crisis',
  };

  return {
    state: {
      ...state,
      clubOffers: [offer, ...(state.clubOffers ?? [])].slice(0, 30),
      news: [
        createManualNewsPost({
          type: 'transfert',
          player,
          week: state.week,
          text: `Rupture de confiance: ${club.name} profite du flou autour de ${player.firstName} ${player.lastName} et envoie une approche immédiate.`,
          reputationImpact: -1,
          account: { name: 'Mercato Insider', kind: 'journal', icon: 'MI', color: '#172026' },
        }),
        ...(state.news ?? []),
      ].slice(0, 60),
      decisionHistory: addDecisionHistory(state.decisionHistory, {
        week: state.week,
        type: 'mercato',
        label: 'Crise promesse',
        detail: `${club.name} s'est engouffré après une promesse non tenue.`,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
      }),
    },
    offer,
  };
};

export const createTensionMarketOffer = (state, playerId, source = 'tension_followup') => {
  const player = state.roster.find((item) => item.id === playerId);
  if (!player) return { state, error: 'Joueur introuvable' };
  if ((state.pendingTransfers ?? []).some((transfer) => transfer.playerId === player.id)) {
    return { state, error: `${player.firstName} ${player.lastName} est déjà engagé dans un transfert` };
  }
  if ((state.clubOffers ?? []).some((offer) => offer.playerId === player.id && offer.status === 'open')) {
    return { state, error: `${player.firstName} ${player.lastName} a déjà une offre ouverte` };
  }

  const phase = getPhase(state.week);
  const allowedTiers = getClubTierForRating(player.rating, player.potential);
  const candidates = CLUBS
    .filter((club) => club.name !== player.club && allowedTiers.includes(club.tier))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  const club = pick(candidates.length ? candidates : CLUBS.filter((c) => c.name !== player.club));
  if (!club) return { state, error: 'Aucun club compatible' };
  const country = getCountry(club.countryCode);
  const offer = {
    id: makeId('offer'),
    week: state.week,
    expiresWeek: state.week + 2,
    window: phase.window ?? 'approche',
    isHotWeek: true,
    isCompetingOffer: true,
    preWindow: false,
    effectiveWeek: state.week,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    club: club.name,
    clubTier: club.tier,
    clubCountry: country.flag,
    clubCountryCode: club.countryCode,
    clubCity: club.city,
    price: Math.max(1000, Math.floor((player.value ?? 1000) * (rand(100, 134) / 100))),
    salMult: Math.round((rand(116, 184) / 100) * 100) / 100,
    status: 'open',
    actionSource: source,
  };

  return {
    state: {
      ...state,
      clubOffers: [offer, ...(state.clubOffers ?? [])].slice(0, 30),
      news: [
        createManualNewsPost({
          type: 'transfert',
          player,
          week: state.week,
          text: `${club.name} prend position sur le dossier ${player.firstName} ${player.lastName} après les tensions récentes.`,
          reputationImpact: 1,
          account: { name: 'TransferRadar', kind: 'data', icon: 'TR', color: '#2f80ed' },
        }),
        ...(state.news ?? []),
      ].slice(0, 60),
      decisionHistory: addDecisionHistory(state.decisionHistory, {
        week: state.week,
        type: 'mercato',
        label: 'Pression dossier',
        detail: `${club.name} s'invite dans le dossier après un épisode ${source}.`,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
      }),
    },
    offer,
  };
};

export const proposePlayerToClubs = (state, playerId, clubNames = []) => {
  const player = state.roster.find((item) => item.id === playerId);
  if (!player) return { state, error: 'Joueur introuvable' };
  if (!clubNames.length) return { state, error: 'Choisis au moins un club' };
  if (getActiveDossierPlayerIds(state).has(playerId)) {
    return { state, error: `${player.firstName} ${player.lastName} a déjà un dossier en cours.` };
  }

  const phase = getPhase(state.week);
  const allowedTiers = getClubTierForRating(player.rating, player.potential);
  const selectedClubs = clubNames
    .map((name) => CLUBS.find((club) => club.name === name))
    .filter(Boolean);

  if (!selectedClubs.length) return { state, error: 'Aucun club valide' };

  const invalidClub = selectedClubs.find((club) => !allowedTiers.includes(club.tier));
  if (invalidClub) {
    return { state, error: `${player.firstName} ${player.lastName} est trop faible pour ${invalidClub.name}.` };
  }

  const nextWindow = !phase.mercato
    ? (phase.seasonWeek <= 18
      ? { window: 'hiver', effectiveWeek: state.week + (19 - phase.seasonWeek) }
      : phase.seasonWeek <= 37
        ? { window: 'été', effectiveWeek: state.week + (38 - phase.seasonWeek) }
        : null)
    : null;
  const preWindow = Boolean(nextWindow && phase.seasonWeek >= 16 && phase.seasonWeek !== 38);
  const seasonWindow = phase.window ?? nextWindow?.window ?? 'approche';

  const offers = selectedClubs.map((club) => {
    const country = getCountry(club.countryCode);
    const tierBoost = club.tier === 1 ? rand(118, 148) / 100
      : club.tier === 2 ? rand(108, 138) / 100
      : club.tier === 3 ? rand(96, 122) / 100
      : rand(88, 114) / 100;
    const salaryMult = club.tier === 1 ? rand(138, 188) / 100
      : club.tier === 2 ? rand(124, 170) / 100
      : club.tier === 3 ? rand(112, 156) / 100
      : rand(102, 138) / 100;

    return {
      id: makeId('offer'),
      week: state.week,
      expiresWeek: state.week + (preWindow ? 3 : (phase.deadlineDay ? 1 : 2)),
      window: seasonWindow,
      isHotWeek: false,
      isCompetingOffer: false,
      preWindow,
      effectiveWeek: preWindow ? nextWindow?.effectiveWeek : state.week,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      club: club.name,
      clubTier: club.tier,
      clubCountry: country.flag,
      clubCountryCode: club.countryCode,
      clubCity: club.city,
      price: Math.max(1000, Math.floor(player.value * tierBoost)),
      salMult: Math.round(salaryMult * 100) / 100,
      status: 'open',
      actionSource: 'shortlist',
    };
  });

  return {
    state: {
      ...state,
      clubOffers: [...offers, ...(state.clubOffers ?? [])].slice(0, 30),
      decisionHistory: addDecisionHistory(state.decisionHistory, {
        week: state.week,
        type: 'mercato',
        label: 'Shortlist proposée',
        detail: `${player.firstName} ${player.lastName} a été proposé à ${selectedClubs.map((club) => club.name).join(', ')}.`,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
      }),
      news: [
        createManualNewsPost({
          type: 'transfert',
          player,
          week: state.week,
          text: `Shortlist envoyée pour ${player.firstName} ${player.lastName} vers ${selectedClubs.map((club) => club.name).join(', ')}.`,
          reputationImpact: 1,
          account: { name: 'TransferRadar', kind: 'data', icon: 'TR', color: '#2f80ed' },
        }),
        ...state.news,
      ].slice(0, 60),
    },
    offers,
  };
};

const createChoiceTransferOffer = (state, player, event, choice) => {
  const cooldownUntil = state.negotiationCooldowns?.[player.id];
  if (cooldownUntil && cooldownUntil > state.week) {
    return { state, error: `${player.firstName} ${player.lastName} est déjà sous verrou de transfert` };
  }
  if ((state.pendingTransfers ?? []).some((transfer) => transfer.playerId === player.id) || (state.clubOffers ?? []).some((offer) => offer.playerId === player.id && offer.status === 'open')) {
    return { state, error: `${player.firstName} ${player.lastName} est déjà engagé dans un autre dossier` };
  }
  const phase = getPhase(state.week);
  const allowedTiers = getClubTierForRating(player.rating, player.potential);
  const label = `${choice.label} ${choice.desc ?? ''}`.toLowerCase();
  const preference = label.includes('plus offrant') || label.includes('enchères') ? 'money' : label.includes('projet') ? 'project' : 'balanced';
  const targetClubs = CLUBS
    .filter((club) => club.name !== player.club && allowedTiers.includes(club.tier))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  const moneyPool = targetClubs.slice(Math.max(0, targetClubs.length - 3));
  const projectPool = targetClubs.slice(0, Math.max(1, Math.min(3, targetClubs.length)));
  const clubPool = preference === 'money' ? moneyPool : preference === 'project' ? projectPool : targetClubs;
  const club = pick(clubPool.length ? clubPool : targetClubs);

  if (!club) return { state, error: 'Aucun club compatible' };

  const country = getCountry(club.countryCode);
  const nextWindow = !phase.mercato
    ? (phase.seasonWeek <= 18
      ? { window: 'hiver', effectiveWeek: state.week + (19 - phase.seasonWeek) }
      : phase.seasonWeek <= 37
        ? { window: 'été', effectiveWeek: state.week + (38 - phase.seasonWeek) }
        : null)
    : null;
  const preWindow = Boolean(nextWindow && phase.seasonWeek >= 16 && phase.seasonWeek !== 38);
  const priceMult = preference === 'money'
    ? rand(102, 138) / 100
    : preference === 'project'
      ? rand(96, 116) / 100
      : rand(98, 126) / 100;
  const salaryMult = preference === 'money'
    ? rand(128, 190) / 100
    : preference === 'project'
      ? rand(108, 160) / 100
      : rand(112, 174) / 100;
  const offer = {
    id: makeId('offer'),
    week: state.week,
    expiresWeek: state.week + (preWindow ? 3 : (phase.deadlineDay ? 1 : 2)),
    window: phase.window ?? nextWindow?.window ?? 'approche',
    isHotWeek: false,
    isCompetingOffer: false,
    preWindow,
    effectiveWeek: preWindow ? nextWindow?.effectiveWeek : state.week,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    club: club.name,
    clubTier: club.tier,
    clubCountry: country.flag,
    clubCountryCode: club.countryCode,
    clubCity: club.city,
    price: Math.max(1000, Math.floor(player.value * priceMult)),
    salMult: Math.round(salaryMult * 100) / 100,
    status: 'open',
    actionSource: `event:${event.id}:${choice.label}`,
  };

  return {
    state: {
      ...state,
      clubOffers: [offer, ...(state.clubOffers ?? [])].slice(0, 30),
      news: [
        createManualNewsPost({
          type: 'transfert',
          player,
          week: state.week,
          text: preWindow
            ? `Après la décision "${choice.label}", ${club.name} place un pré-accord pour ${player.firstName} ${player.lastName}.`
            : `Après la décision "${choice.label}", ${club.name} dépose une offre concrète pour ${player.firstName} ${player.lastName}.`,
          reputationImpact: 2,
          account: { name: 'TransferRadar', kind: 'data', icon: 'TR', color: '#2f80ed' },
        }),
        ...state.news,
      ].slice(0, 60),
      messages: [
        {
          id: makeId('msg'),
          week: state.week,
          type: 'transfer_request',
          context: event.id,
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          threadKey: player.id,
          threadLabel: `${player.firstName} ${player.lastName}`,
          senderRole: 'player',
          senderName: `${player.firstName} ${player.lastName}`,
          subject: preWindow ? 'Pré-accord confirmé' : 'Offre concrète arrivée',
          body: preWindow
            ? `${club.name} a validé un pré-accord pour moi. L'arrivée est prévue à l'ouverture du mercato ${offer.window}.`
            : `${club.name} vient d'envoyer une vraie offre. Je veux ton avis avant qu'on réponde.`,
          read: false,
          resolved: false,
        },
        ...state.messages,
      ].slice(0, 40),
      decisionHistory: addDecisionHistory(state.decisionHistory, {
        week: state.week,
        type: 'mercato',
        label: 'Offre générée par événement',
        detail: `${club.name} se positionne après la décision "${choice.label}".`,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
      }),
    },
    message: preWindow
      ? `${club.name} transforme la décision en pré-accord.`
      : `${club.name} transforme la décision en offre concrète.`,
    offer,
  };
};

export const playWeek = (state) => {
  const office = state.office ?? { scoutLevel: 0, lawyerLevel: 0, mediaLevel: 0 };
  const phase = getPhase(state.week);
  const isNewSeasonStart = getSeasonContext(state.week + 1).seasonWeek === 1 && state.week > 1;
  const currentSeason = phase.season;
  let clubSeasonHistory = normalizeClubSeasonHistory(state.clubSeasonHistory ?? {}, currentSeason);
  const pendingWorldCupTrigger = phase.seasonWeek === 38 && shouldTriggerWorldCup(phase.season, state.worldCupState);
  const isWorldCupActive = Boolean((state.worldCupState && state.worldCupState.phase !== 'done') || pendingWorldCupTrigger);
  const isIntlBreak = isInternationalBreakWeek(phase.seasonWeek) && !isWorldCupActive && !(phase.mercato && phase.window === 'été');
  const events = [];
  const generatedNews = [];
  const generatedMessages = [];
  const matchResults = [];
  const newChainedEvents = [];
  let totalIncome = 0;
  let totalCost = 0;
  let reputationChange = 0;
  let segmentReputation = state.segmentReputation ?? createDefaultSegmentReputation();
  const communityManagerLevel = getStaffEffect(state.staff, 'communityManager');
  const playerCareLevel = getStaffEffect(state.staff, 'playerCare');
  const dataAnalystLevel = getStaffEffect(state.staff, 'dataAnalyst');
  const specialization = SPECIALIZATION_EFFECTS[state.agencyProfile?.style ?? 'equilibre'] ?? SPECIALIZATION_EFFECTS.equilibre;
  const staffWeeklyCost = getStaffWeeklyCost(state.staff);
  const mediaReduction = Math.max(0.35, 1 - office.mediaLevel * 0.06 - communityManagerLevel * 0.07);
  totalCost += staffWeeklyCost;
  totalCost += WEEKLY_OVERHEAD[state.agencyLevel ?? 1] ?? 300;

  // Le championnat démarre dès la semaine 1 pour garder le classement synchronisé avec le fil.
  // Semaine 38 = mercato été, pas de match. Trêve internationale = pas de match de club non plus.
  const isFriendlyWeek = false;
  const clubFootballActive = !(phase.mercato && phase.window === 'été') && !isWorldCupActive && !isIntlBreak;
  const calendarFixtures = getCalendarFixturesForWeek(state.matchCalendar ?? [], state.week, { status: MATCH_STATUS.SCHEDULED });
  const scheduledFixtures = calendarFixtures.length
    ? calendarFixtures
    : Array.isArray(state.nextFixtures) && state.nextFixtures.length
    ? state.nextFixtures
    : buildWeeklyFixtures(state.roster, state.week);
  const weeklyFixtures = clubFootballActive ? scheduledFixtures : [];
  const weeklySimulation = {
    fixtures: weeklyFixtures,
    cursor: {
      week: state.week + 1,
      day: 1,
      seasonDay: (state.seasonDay ?? ((state.week - 1) * 7 + 1)) + Math.max(1, 8 - Number(state.day ?? 6)),
    },
  };
  // Fixtures compétitives uniquement (hors matchs amicaux) pour le classement
  const competitiveFixtures = weeklyFixtures.filter((f) => !f.isFriendly);
  const leaguePlayerResults = clubFootballActive
    ? simulateFixturePlayerResults(
        competitiveFixtures.filter((fixture) => !fixture.competition || fixture.competition === 'LEAGUE'),
        state.roster,
      )
    : [];
  const weeklyMatchResults = applyBondEffectsToMatchResults(
    simulateFixturePlayerResults(weeklyFixtures, state.roster),
    state.roster,
    state.playerBonds ?? {},
  );
  const playedLeagueCalendarMatches = weeklyFixtures.map((fixture) =>
    fixtureToCalendarMatch(fixture, { week: state.week, day: 6, status: MATCH_STATUS.PLAYED }));
  let nextMatchCalendar = upsertCalendarMatches(
    markCalendarMatchesPlayed(state.matchCalendar ?? [], playedLeagueCalendarMatches),
    playedLeagueCalendarMatches,
  );
  const agencyPlayerIds = new Set((state.roster ?? []).map((player) => player.id));
  let nextMatchResultStore = upsertMatchResults(
    state.matchResultStore ?? [],
    weeklyMatchResults
      .filter((match) => agencyPlayerIds.has(match?.playerId))
      .map((match) => playerMatchToResultRecord(match, { week: state.week, day: 6, source: 'league' })),
  );
  const matchByPlayerId = new Map(weeklyMatchResults.map((match) => [match.playerId, match]));
  const playedMatches = weeklyMatchResults.filter((match) => (match.minutes ?? 0) > 0 && Number.isFinite(match.matchRating));
  const topMatch = playedMatches.length
    ? [...playedMatches].sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0))[0]
    : null;
  const flopMatch = playedMatches.length
    ? [...playedMatches].sort((a, b) => (a.matchRating ?? 0) - (b.matchRating ?? 0))[0]
    : null;
  const activeDossierPlayerIds = [...getMarketLockedPlayerIds(state)];

  const updatedRoster = state.roster.map((player) => {
    const currentInjuryWeeks = player.injured ?? 0;
    const nextInjuryWeeks = Math.max(0, currentInjuryWeeks - 1);
    let updatedPlayer = {
      ...player,
      previousRating: player.rating,
      injured: nextInjuryWeeks,
      injuryStatus: nextInjuryWeeks > 0 ? 'active' : currentInjuryWeeks > 0 ? 'recovered' : player.injuryStatus ?? null,
      injuryEndedWeek: currentInjuryWeeks > 0 && nextInjuryWeeks === 0 ? state.week : player.injuryEndedWeek ?? null,
      contractWeeksLeft: Math.max(0, player.contractWeeksLeft - 1),
      agentContract: tickAgentContract(player.agentContract ?? createAgentContract(player)),
      fatigue: currentInjuryWeeks > 0 ? clamp((player.fatigue ?? 20) - 8, 0, 100) : player.fatigue ?? 20,
      europeanCompetition: getPlayerEuropeanCompetition(player, currentSeason),
    };
    const { salaryCost, commissionIncome } = calculateWeeklyPlayerEconomy(updatedPlayer);
    totalCost += salaryCost;
    const incomeMult = (state.incomeBoost && state.week <= (state.incomeBoost.untilWeek ?? 0))
      ? (state.incomeBoost.mult ?? 1)
      : 1;
    totalIncome += commissionIncome * incomeMult;
    const matchResult = matchByPlayerId.get(updatedPlayer.id);
    matchResults.push(matchResult);
    if (matchResult?.matchRating) {
      const resultMoral = matchResult.result === 'win' ? 2 : matchResult.result === 'loss' ? -2 : 0;
      const contributionMoral = matchResult.goals || matchResult.assists ? 2 : 0;
      const roleState = getRoleExpectationState(updatedPlayer);
      const promisedRole = roleState.promisedRole;
      const promisedRolePenalty = roleState.roleMismatch
        ? (
            promisedRole === 'Star'
              ? { moral: -5, trust: -4, label: roleState.actualRole === 'banc' ? 'Rôle de star non respecté' : 'Rôle de star trop léger' }
              : promisedRole === 'Titulaire'
                ? { moral: -3, trust: -3, label: roleState.actualRole === 'banc' ? 'Temps de jeu promis non respecté' : 'Statut de titulaire contesté' }
                : promisedRole === 'Rotation'
                  ? { moral: -2, trust: -2, label: 'Rotation non assurée' }
                  : { moral: -2, trust: -2, label: 'Temps de jeu insuffisant' }
          )
        : null;
      const matchOutcome = matchResult.result === 'win' ? 'W' : matchResult.result === 'loss' ? 'L' : 'D';
      const updatedRecentResults = [...(updatedPlayer.recentResults ?? []), matchOutcome].slice(-5);
      updatedPlayer = {
        ...updatedPlayer,
        moral: clamp(updatedPlayer.moral + resultMoral + contributionMoral + (promisedRolePenalty?.moral ?? 0)),
        trust: clamp((updatedPlayer.trust ?? 50) + (promisedRolePenalty?.trust ?? 0)),
        form: clamp(updatedPlayer.form + (matchResult.matchRating >= 7 ? 2 : matchResult.matchRating < 6 ? -2 : 0), 40, 99),
        brandValue: clamp((updatedPlayer.brandValue ?? 10) + (matchResult.matchRating >= 7.5 ? 2 : matchResult.matchRating < 5.8 ? -1 : 0) + (matchResult.goals ? 1 : 0), 0, 100),
        fatigue: clamp((updatedPlayer.fatigue ?? 20) + Math.floor(matchResult.minutes / 12) + (matchResult.result === 'loss' ? 2 : 0), 0, 100),
        seasonStats: updateSeasonStats(updatedPlayer.seasonStats, matchResult),
        matchHistory: matchResult ? [{ week: state.week, roleExpectation: promisedRolePenalty?.label ?? promisedRole, ...matchResult }, ...(updatedPlayer.matchHistory ?? [])].slice(0, 12) : updatedPlayer.matchHistory ?? [],
        recentResults: updatedRecentResults,
      };
      if (promisedRolePenalty && roleState.appearances >= 2) {
        generatedMessages.push(createMessage({ player: updatedPlayer, type: 'role_frustration', week: state.week + 1, context: 'club_role' }));
      }
    } else {
      updatedPlayer = {
        ...updatedPlayer,
        fatigue: clamp((updatedPlayer.fatigue ?? 20) - 6, 0, 100),
        seasonStats: updateSeasonStats(updatedPlayer.seasonStats, matchResult),
        matchHistory: matchResult ? [{ week: state.week, ...matchResult }, ...(updatedPlayer.matchHistory ?? [])].slice(0, 12) : updatedPlayer.matchHistory ?? [],
      };
    }

    // Pendant la pré-saison, les événements ont un impact réduit (match amical)
    const friendlyMult = isFriendlyWeek ? 0.3 : 1.0;
    const event = isFriendlyWeek ? null : rollPassiveEvent(updatedPlayer, {
      scandalReduction: communityManagerLevel * 0.06,
      performanceBoost: dataAnalystLevel * 0.03,
      matchResult,
      worldState: state.worldState,
    });
    (matchResult?.incidents ?? []).forEach((incident) => {
      const incidentEvent = MATCH_INCIDENT_EVENTS[incident];
      if (!incidentEvent) return;
      const reputationImpact = Math.round(scaleReputationDelta(incidentEvent.rep) * friendlyMult);
      const moneyImpact = incidentEvent.good ? Math.floor(incidentEvent.money * EVENT_INCOME_MULT * friendlyMult) : Math.round(incidentEvent.money * friendlyMult);
      totalIncome += moneyImpact > 0 ? moneyImpact : 0;
      totalCost += moneyImpact < 0 ? Math.abs(moneyImpact) : 0;
      reputationChange += reputationImpact;
      events.push({
        id: incident,
        player: `${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
        playerId: updatedPlayer.id,
        match: matchResult,
        ...incidentEvent,
        money: moneyImpact,
        rep: reputationImpact,
      });
      if (Math.abs(reputationImpact) >= 3) {
        generatedNews.push(createManualNewsPost({
          type: incidentEvent.good ? 'performance' : 'media',
          player: updatedPlayer,
          week: state.week,
          text: `${updatedPlayer.firstName} ${updatedPlayer.lastName} : ${incidentEvent.label.toLowerCase()} pendant ${matchResult.club} ${matchResult.score} ${matchResult.opponent}.`,
          reputationImpact,
        }));
      }
    });
    if (event) {
      const moneyImpact = event.good ? Math.floor(event.money * EVENT_INCOME_MULT) : Math.floor(event.money * mediaReduction);
      const reputationImpact = scaleReputationDelta(event.good ? event.rep : Math.floor(event.rep * mediaReduction));
      updatedPlayer = applyPassiveEventToPlayer(updatedPlayer, event);
      if (event.injury) {
        updatedPlayer = {
          ...updatedPlayer,
          injuryStatus: 'active',
          injuryStartedWeek: state.week,
          injuryReason: event.label ?? event.id ?? 'Blessure',
          injurySource: event.id ?? event.type ?? 'event',
          seasonStats: { ...(updatedPlayer.seasonStats ?? {}), injuries: (updatedPlayer.seasonStats?.injuries ?? 0) + 1 },
        };
      }
      totalIncome += moneyImpact > 0 ? moneyImpact : 0;
      totalCost += moneyImpact < 0 ? Math.abs(moneyImpact) : 0;
      reputationChange += reputationImpact;
      segmentReputation = applySegmentReputationChange(segmentReputation, getSegmentDeltaForEvent(event, reputationImpact + (specialization.mediaBoost ?? 0)));
      events.push({
        player: `${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
        playerId: updatedPlayer.id,
        match: matchResult,
        ...event,
        money: moneyImpact,
        rep: reputationImpact,
      });
      generatedNews.push(createNewsPost({ player: updatedPlayer, event, week: state.week, reputationImpact }));

      // Anti-flood: cooldown par joueur + cap global hebdo
      const playerLastMsg = updatedPlayer.lastMessageWeek ?? 0;
      const msgCooldownOk = (state.week - playerLastMsg) >= MIN_PLAYER_MSG_COOLDOWN;
      const weeklyCapOk = generatedMessages.filter((m) => m.playerId === updatedPlayer.id).length < MAX_WEEKLY_MESSAGES;
      if (msgCooldownOk && weeklyCapOk) {
        const message = maybeCreateContextualMessage({
          player: updatedPlayer,
          event,
          week: state.week,
          mercato: getPhase(state.week).mercato,
          state,
        });
        if (message) {
          generatedMessages.push(message);
          // Marquer la semaine du dernier message sur le joueur
          updatedPlayer = { ...updatedPlayer, lastMessageWeek: state.week };
          if (message.type === 'media_pressure') {
            socialCrisisCooldowns[updatedPlayer.id] = state.week + 6;
            generatedNews.push(createManualNewsPost({
              type: 'media',
              player: updatedPlayer,
              week: state.week + 1,
              text: `Alerte médias: ${updatedPlayer.firstName} ${updatedPlayer.lastName} est ciblé par une séquence hostile. Le clan prépare sa réponse.`,
              reputationImpact: -2,
              account: { name: 'Canal Football Desk', kind: 'journal', icon: 'CF', color: '#172026' },
            }));
          }
        }
      }

      // ── Trait caché — révélation après 12+ semaines (4% par semaine) ────────
      const weeksInAgency = state.week - (updatedPlayer.contractStartWeek ?? state.week);
      if (updatedPlayer.hiddenTrait && !updatedPlayer.traitRevealed && weeksInAgency >= 12 && Math.random() < 0.04) {
        const traitKey = updatedPlayer.hiddenTrait;
        const traitLabels = {
          clutch_player: 'Joueur Clutch ⚡ — irremplaçable dans les grands matchs',
          locker_room_leader: 'Leader Vestiaire 🦁 — sa présence booste le groupe',
          silent_perfectionist: 'Perfectionniste Silencieux 🧊 — confiance extrêmement stable',
          social_media_magnet: 'Star des Réseaux 📱 — valeur de marque en hausse constante',
          late_bloomer: 'Révélation Tardive 🌱 — le meilleur reste à venir',
          glass_cannon: 'Verre et Feu 💥 — immense talent, fragilité physique',
          mentality_monster: 'Mentale de Champion 🔥 — ne lâche jamais',
          tactical_genius: 'Génie Tactique 🧠 — s\'adapte à tous les systèmes',
        };
        generatedMessages.push({
          id: makeId('msg'),
          week: state.week,
          sortWeek: state.week + 0.01,
          type: 'trait_reveal',
          threadKey: updatedPlayer.id,
          threadLabel: `${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
          playerId: updatedPlayer.id,
          playerName: `${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
          senderRole: 'staff',
          senderName: 'Assistant agence',
          subject: `Trait révélé — ${updatedPlayer.firstName}`,
          body: `Après des semaines à travailler avec ${updatedPlayer.firstName}, une qualité rare s'est révélée : ${traitLabels[traitKey] ?? traitKey}. Cette caractéristique va marquer son parcours dans l'agence.`,
          read: false,
          resolved: true,
        });
        updatedPlayer = { ...updatedPlayer, traitRevealed: true };
      }

      // ── Système de négligence — plainte si pas d'interaction depuis 6+ semaines ─
      const signedAgencyWeek = updatedPlayer.agencySignedWeek ?? updatedPlayer.relationshipStartedWeek ?? updatedPlayer.contractStartWeek ?? state.week;
      const lastInteraction = updatedPlayer.lastInteractionWeek ?? signedAgencyWeek;
      const weeksSinceContact = state.week - lastInteraction;
      const notNewRecruit = (state.week - signedAgencyWeek) >= 8;
      const alreadyHasMsg = generatedMessages.some((m) => m.playerId === updatedPlayer.id);
      if (notNewRecruit && weeksSinceContact >= 6 && (updatedPlayer.trust ?? 50) < 70 && updatedPlayer.moral < 70 && !alreadyHasMsg && Math.random() < 0.15) {
        generatedMessages.push(createMessage({ player: updatedPlayer, type: 'complaint', week: state.week, context: 'neglect' }));
        updatedPlayer = { ...updatedPlayer, lastMessageWeek: state.week };
      }

      // Générer les événements enchaînés
      const newChains = generateChainedEvents(updatedPlayer, event, state.week);
      newChainedEvents.push(...newChains);
    }

    const developmentCurveBoost = updatedPlayer.developmentBoost ?? 0;
    const developmentChance = 0.035
      + (matchResult?.minutes >= 55 ? 0.025 : 0)
      + ((updatedPlayer.form - 60) / 1000)
      + ((updatedPlayer.moral - 50) / 1200)
      + dataAnalystLevel * 0.012
      + (specialization.youthProgress ?? 0) / 2
      + developmentCurveBoost;
    // late_bloomer : continue de progresser jusqu'à 33 ans (au lieu de s'arrêter à 24/28)
    const isLateBloomer = updatedPlayer.hiddenTrait === 'late_bloomer';
    const developmentAgeCap = isLateBloomer ? 33 : updatedPlayer.developmentCurve === 'superstar_gem' ? 28 : 24;
    const developmentGain = updatedPlayer.developmentCurve === 'superstar_gem' ? 3 : 1;
    if (updatedPlayer.age < developmentAgeCap && Math.random() < developmentChance && updatedPlayer.rating < updatedPlayer.potential) {
      const nextAttributes = updatedPlayer.attributes
        ? developAttributes(updatedPlayer.attributes, updatedPlayer, developmentCurveBoost + dataAnalystLevel * 0.02 + (specialization.youthProgress ?? 0))
        : updatedPlayer.attributes;
      const attributeRating = nextAttributes ? calculateRatingFromAttributes(nextAttributes) : updatedPlayer.rating + developmentGain;
      const nextRating = Math.min(updatedPlayer.potential, Math.max(updatedPlayer.rating + developmentGain, attributeRating));
      updatedPlayer = {
        ...updatedPlayer,
        attributes: nextAttributes,
        rating: nextRating,
        value: Math.floor(updatedPlayer.value * 1.035),
        timeline: [{ week: state.week, type: 'progression', label: 'Progression validée par le temps de jeu' }, ...(updatedPlayer.timeline ?? [])].slice(0, 18),
      };
    } else if (updatedPlayer.age > 30 && !isLateBloomer && Math.random() < 0.06) {
      updatedPlayer = { ...updatedPlayer, rating: Math.max(60, updatedPlayer.rating - 1), value: Math.floor(updatedPlayer.value * 0.95) };
    }

    const recurrentRisk = ((updatedPlayer.recurringInjuryRisk ?? 8) + Math.max(0, (updatedPlayer.fatigue ?? 20) - 68)) / 1000;
    if (!updatedPlayer.injured && Math.random() < recurrentRisk) {
      const injuryWeeks = rand(2, 5);
      updatedPlayer = {
        ...updatedPlayer,
        injured: injuryWeeks,
        injuryStatus: 'active',
        injuryStartedWeek: state.week,
        injuryReason: 'Alerte musculaire liée à la fatigue',
        injurySource: 'recurring_risk',
        fatigue: clamp((updatedPlayer.fatigue ?? 20) - 10, 0, 100),
        seasonStats: { ...(updatedPlayer.seasonStats ?? {}), injuries: (updatedPlayer.seasonStats?.injuries ?? 0) + 1 },
        timeline: [{ week: state.week, type: 'blessure', label: 'Alerte musculaire liée à la fatigue' }, ...(updatedPlayer.timeline ?? [])].slice(0, 18),
      };
    }

    // Tick publicRep each week (regression to mean + trending decay)
    const currentPublicRep = updatedPlayer.publicRep ?? createPublicRep(updatedPlayer);
    updatedPlayer = { ...updatedPlayer, publicRep: tickPublicRep(currentPublicRep, state.week + 1) };

    return updatedPlayer;
  });

  const caredRoster = playerCareLevel
    ? updatedRoster.map((player) =>
        player.moral < 45 || (player.trust ?? 50) < 45
          ? { ...player, moral: clamp(player.moral + playerCareLevel * 2), trust: clamp((player.trust ?? 50) + playerCareLevel * 2) }
          : player,
      )
    : updatedRoster;

  // Pré-saison : matchs amicaux, faible impact médiatique et pas de message
  if (topMatch && !isFriendlyWeek) {
    const topPlayer = caredRoster.find((player) => player.id === topMatch.playerId);
    if (topPlayer) {
      generatedNews.push(createManualNewsPost({
        type: 'performance',
        player: topPlayer,
        week: state.week + 1,
        text: `${topPlayer.firstName} ${topPlayer.lastName} brille: note ${topMatch.matchRating.toFixed(1)} dans ${topMatch.club} ${topMatch.score} ${topMatch.opponent}.`,
        reputationImpact: 2,
        account: { name: 'StatsZone FC', kind: 'data', icon: 'SZ', color: '#2f80ed' },
      }));
    }
  } else if (topMatch && isFriendlyWeek) {
    // Matchs amicaux : petite news sans impact de réputation
    const topPlayer = caredRoster.find((player) => player.id === topMatch.playerId);
    if (topPlayer && topMatch.matchRating >= 7.5) {
      generatedNews.push(createManualNewsPost({
        type: 'performance',
        player: topPlayer,
        week: state.week + 1,
        text: `🏖️ Pré-saison — ${topPlayer.firstName} ${topPlayer.lastName} en forme lors du match amical : ${topMatch.matchRating.toFixed(1)}/10.`,
        reputationImpact: 0,
        account: { name: 'Pré-saison FC', kind: 'media', icon: '☀️', color: '#f59e0b' },
      }));
    }
  }

  if (flopMatch && (flopMatch.matchRating ?? 10) <= 5.8 && !isFriendlyWeek) {
    const flopPlayer = caredRoster.find((player) => player.id === flopMatch.playerId);
    if (flopPlayer) {
      generatedNews.push(createManualNewsPost({
        type: 'media',
        player: flopPlayer,
        week: state.week + 1,
        text: `Semaine difficile pour ${flopPlayer.firstName} ${flopPlayer.lastName}: note ${flopMatch.matchRating.toFixed(1)} après ${flopMatch.club} ${flopMatch.score} ${flopMatch.opponent}.`,
        reputationImpact: -1,
        account: { name: 'Onze Hebdo', kind: 'media', icon: 'OH', color: '#2f80ed' },
      }));
      if (!generatedMessages.some((message) => message.playerId === flopPlayer.id && message.type === 'form_slump')) {
        generatedMessages.push(createMessage({ player: flopPlayer, type: 'form_slump', week: state.week + 1, context: 'match_flop' }));
      }
    }
  }

  // ── Coupes Européennes ─────────────────────────────────────────────────────
  const persistedMidweekEuro = state?.midweekEuropean?.week === state.week
    ? (state.midweekEuropean.results ?? [])
    : [];
  const euroMatchResults = [...persistedMidweekEuro];
  let euRoster = caredRoster;
  // Clone pour mutation dans la boucle
  let nextEuroData = JSON.parse(JSON.stringify(state.europeanCupData ?? {}));
  // Reset au début d'une nouvelle saison
  if (phase.seasonWeek === 1 && state.week > 1) nextEuroData = {};

  if (!isWorldCupActive && !isIntlBreak && !persistedMidweekEuro.length) {
    const euroGroups = new Map();
    for (const player of caredRoster) {
      const comp = getPlayerEuropeanCompetition(player, currentSeason);
      if (!comp) continue;
      if (!isEuropeanMatchWeek(phase.seasonWeek, comp)) continue;
      const key = `${player.clubCountryCode ?? ''}:${player.club ?? ''}:${comp}`;
      if (!euroGroups.has(key)) {
        euroGroups.set(key, {
          comp,
          clubName: player.club ?? 'Club',
          clubCountryCode: player.clubCountryCode ?? null,
          clubCity: player.clubCity ?? null,
          players: [],
        });
      }
      euroGroups.get(key).players.push(player);
    }

    // Snapshot des blessures AVANT le tick hebdomadaire (sinon un joueur "blessé" en championnat
    // pourrait être considéré comme valide en Europe parce que injured a été décrémenté).
    const injuryAtWeekStart = new Map(state.roster.map((p) => [p.id, p.injured ?? 0]));
    const euroWeekOpponents = new Map();

    for (const group of euroGroups.values()) {
      const { comp, clubName, clubCountryCode, clubCity, players } = group;
      const healthyPlayers = players.filter((player) => (injuryAtWeekStart.get(player.id) ?? 0) <= 0 && (player.injured ?? 0) <= 0);
      if (!healthyPlayers.length) continue;

      // ── Initialiser les données euro pour ce club/comp/saison ──────────
      const compKey = `${comp}:${currentSeason}`;
      if (!nextEuroData[compKey]) nextEuroData[compKey] = initEuroCupCompData(comp, currentSeason);
      let compData = nextEuroData[compKey];
      if (!compData.opponentHistory[clubName]) compData.opponentHistory[clubName] = [];
      if (!compData.koPath[clubName]) compData.koPath[clubName] = {};

      // ── Sélection de l'adversaire (déterministe + historique) ──────────
      const stage = getEuropeanStage(phase.seasonWeek, comp);
      const matchdayIdx = getEuropeanMatchdayIndex(phase.seasonWeek, comp);
      const usedOpponents = compData.opponentHistory[clubName];
      const usedThisWeekKey = `${comp}:${currentSeason}:${phase.seasonWeek}`;
      const usedThisWeek = euroWeekOpponents.get(usedThisWeekKey) ?? new Set();
      // En KO, on utilise aussi un index déterministe (pas de répétition interne à la saison)
      const effectiveIdx = stage === 'league' ? matchdayIdx : 20 + Object.keys(compData.koPath[clubName]).length;
      const seededOpponent = pickSeededOpponent(
        clubName,
        comp,
        effectiveIdx,
        currentSeason,
        stage === 'league' ? [...usedOpponents, ...usedThisWeek] : [],
      );

      // Mettre à jour l'historique des adversaires (phase de ligue uniquement)
      if (stage === 'league') {
        compData.opponentHistory[clubName] = [...usedOpponents, seededOpponent.name];
        usedThisWeek.add(seededOpponent.name);
        euroWeekOpponents.set(usedThisWeekKey, usedThisWeek);
      }

      // ── Générer le bracket KO si on entre en phase KO ─────────────────
      if (stage !== 'league' && !compData.bracketClubs) {
        const agentClubs = [...new Set(
          caredRoster
            .filter((p) => getPlayerEuropeanCompetition(p, currentSeason) === comp)
            .map((p) => p.club)
            .filter(Boolean),
        )];
        compData.bracketClubs = generateKOBracketClubs(comp, currentSeason, agentClubs);
      }
      if (stage !== 'league') {
        const agentClubs = [...new Set(
          caredRoster
            .filter((p) => getPlayerEuropeanCompetition(p, currentSeason) === comp)
            .map((p) => p.club)
            .filter(Boolean),
        )];
        compData = ensureEuropeanCompetitionProgress(compData, comp, currentSeason, phase.seasonWeek, agentClubs);
        nextEuroData[compKey] = compData;
        if (!isEuropeanClubAlive(compData, clubName, comp, phase.seasonWeek)) continue;
      }

      const averageRating = Math.round(healthyPlayers.reduce((sum, player) => sum + (player.rating ?? 60), 0) / healthyPlayers.length);
      const averageForm = Math.round(healthyPlayers.reduce((sum, player) => sum + (player.form ?? 60), 0) / healthyPlayers.length);
      const seedPlayer = {
        ...healthyPlayers[0],
        rating: averageRating,
        form: averageForm,
        club: clubName,
        clubCountryCode,
        clubCity,
        injured: 0,
      };
      // Passer l'adversaire sélectionné comme contexte partagé
      const koRoundMatch = stage !== 'league' ? getEuropeanClubRoundMatch(compData, clubName, comp, phase.seasonWeek) : null;
      if (stage !== 'league' && !koRoundMatch) continue;
      const clubMatchBase = simulateEuropeanMatch(seedPlayer, comp, phase.seasonWeek, koRoundMatch ?? { opponent: seededOpponent });
      if (!clubMatchBase || !clubMatchBase.matchRating) continue;

      // ── Mémoriser le parcours KO ───────────────────────────────────────
      if (stage !== 'league') {
        compData.koPath[clubName][stage] = {
          ...(compData.koPath[clubName][stage] ?? {}),
          opponent: koRoundMatch?.opponent?.name ?? seededOpponent.name,
          opponentCountry: koRoundMatch?.opponent?.country ?? seededOpponent.country,
          score: koRoundMatch?.score ?? clubMatchBase.score,
          result: koRoundMatch?.result ?? clubMatchBase.result,
          week: state.week,
        };
      }

      // Budget partagé : la somme des buts/passes des joueurs ne peut pas dépasser le score de l'équipe.
      let goalsBudget = clubMatchBase.goalsFor ?? 0;
      let assistsBudget = clubMatchBase.goalsFor ?? 0;
      for (const player of healthyPlayers) {
        const rawEuroMatch = simulateEuropeanMatch(player, comp, phase.seasonWeek, clubMatchBase);
        if (!rawEuroMatch || !rawEuroMatch.matchRating) continue;
        // Clip aux budgets restants
        const clippedGoals = Math.max(0, Math.min(rawEuroMatch.goals ?? 0, goalsBudget));
        const clippedAssists = Math.max(0, Math.min(rawEuroMatch.assists ?? 0, assistsBudget - clippedGoals < 0 ? 0 : assistsBudget));
        goalsBudget = Math.max(0, goalsBudget - clippedGoals);
        assistsBudget = Math.max(0, assistsBudget - clippedAssists);
        // Ré-ajuste la note si on lui a retiré des buts/passes
        const lostGoals = (rawEuroMatch.goals ?? 0) - clippedGoals;
        const lostAssists = (rawEuroMatch.assists ?? 0) - clippedAssists;
        const adjustedRating = Math.max(4.5, Math.min(10, Number((rawEuroMatch.matchRating - lostGoals * 0.9 - lostAssists * 0.55).toFixed(1))));
        const euroMatch = { ...rawEuroMatch, goals: clippedGoals, assists: clippedAssists, matchRating: adjustedRating };
        euroMatchResults.push({
          ...euroMatch,
          playerName: euroMatch.playerName ?? `${player.firstName} ${player.lastName}`,
          club: euroMatch.club ?? player.club ?? 'Club',
          clubCountryCode: euroMatch.clubCountryCode ?? player.clubCountryCode ?? null,
        });

        // Appliquer les effets sur le joueur
        const euroGoals = euroMatch.goals;
        const euRating = euroMatch.matchRating;
        const cup = EURO_CUP_LABELS[comp];
        const isCL = comp === 'CL';
        euRoster = euRoster.map((p) => p.id === player.id ? {
          ...p,
          moral: clamp(p.moral + (euroMatch.result === 'win' ? (isCL ? 5 : 3) : euroMatch.result === 'loss' ? -2 : 0) + (euroGoals ? (isCL ? 6 : 4) : 0)),
          form: clamp(p.form + (euRating >= 8 ? (isCL ? 4 : 3) : euRating >= 7 ? 1 : euRating < 6 ? -2 : 0), 40, 99),
          value: Math.floor(p.value * (euroGoals >= 2 ? (isCL ? 1.07 : 1.04) : euroGoals >= 1 ? (isCL ? 1.04 : 1.02) : euRating >= 8 ? (isCL ? 1.03 : 1.015) : 1.0)),
          seasonStats: {
            ...(p.seasonStats ?? {}),
            goals: (p.seasonStats?.goals ?? 0) + euroGoals,
            assists: (p.seasonStats?.assists ?? 0) + euroMatch.assists,
            appearances: (p.seasonStats?.appearances ?? 0) + 1,
          },
          matchHistory: [{ week: state.week, competition: comp, ...euroMatch }, ...(p.matchHistory ?? [])].slice(0, 12),
        } : p);

        // News si performance notable
        const newsData = getEuropeanMatchNews(player, euroMatch);
        if (newsData) {
          generatedNews.push(createManualNewsPost({
            type: newsData.type,
            player,
            week: state.week + 1,
            text: newsData.text,
            reputationImpact: newsData.reputationImpact,
            account: { name: cup?.short ?? 'UEFA', kind: 'media', icon: cup?.icon ?? '🏆', color: cup?.color ?? '#1a1a6e' },
          }));
          reputationChange += scaleReputationDelta(newsData.reputationImpact + (isCL ? 2 : 0));
          if (isCL && (euroGoals > 0 || euRating >= 8)) {
            totalIncome += Math.floor((1800 + euroGoals * 1200) * EVENT_INCOME_MULT);
          }
        }

        const euroInterestClubs = getEuropeanInterestClubs(player, euroMatch);
        if (euroInterestClubs.length > 0) {
          euroMatch.interestClubs = euroInterestClubs;
          generatedNews.push(createManualNewsPost({
            type: 'transfert',
            player,
            week: state.week + 1,
            text: `${euroInterestClubs.slice(0, 3).join(', ')} gardent un oeil sur ${player.firstName} ${player.lastName} après son match européen.`,
            reputationImpact: 1,
            account: { name: 'TransferRadar', kind: 'data', icon: 'TR', color: '#2f80ed' },
          }));
          if (euroMatch.competition === 'CL' || euroMatch.goals >= 1 || euroMatch.matchRating >= 8.2) {
            generatedMessages.push({
              id: makeId('msg'),
              week: state.week + 1,
              sortWeek: state.week + 1 + 0.012,
              type: 'secret_offer',
              context: `europe_interest:${euroMatch.competition}`,
              threadKey: player.id,
              threadLabel: `${player.firstName} ${player.lastName}`,
              playerId: player.id,
              playerName: `${player.firstName} ${player.lastName}`,
              senderRole: 'player',
              senderName: `${player.firstName} ${player.lastName}`,
              subject: 'Des clubs européens se renseignent',
              body: `${euroInterestClubs.slice(0, 2).join(' et ')} suivent mon dossier depuis le match. Je voulais te prévenir avant que ça s'accélère.`,
              read: false,
              resolved: false,
            });
          }
        }

        // Event hat_trick_cl — uniquement si match CL et 3+ buts
        if (comp === 'CL' && euroGoals >= 3) {
          events.push({ player: `${player.firstName} ${player.lastName}`, playerId: player.id, id: 'hat_trick_cl', label: 'Triplé en Ligue des Champions', good: true, money: 20000, rep: 12, rarity: 'epic' });
          totalIncome += Math.floor(20000 * EVENT_INCOME_MULT);
          reputationChange += scaleReputationDelta(12);
        }
      }
    }
  }

  // ── Trêve internationale ────────────────────────────────────────────────────
  let internationalBreakSummary = null;
  if (isIntlBreak) {
    const calledUpMap = getCalledUpAgentPlayers(phase.season, state.week, new Set(caredRoster.map((p) => p.id)), {
      liveRoster: caredRoster,
      leagueReputation: state.leagueReputation ?? {},
      countryReputation: state.countryReputation ?? {},
      agencyReputation: state.reputation ?? 0,
      playerSegmentReputation: state.playerSegmentReputation ?? {},
    });
    const intl = simulateInternationalBreak(caredRoster, { seasonWeek: phase.seasonWeek, week: state.week, calledUpMap });
    internationalBreakSummary = { kind: intl.kind, label: intl.meta.label, count: intl.selectedMatches.length, matches: intl.selectedMatches };
    intl.events.forEach((evt) => {
      events.push(evt);
      totalIncome += Math.max(0, evt.money ?? 0);
      reputationChange += evt.rep ?? 0;
    });
    if (intl.selectedMatches.length) {
      const playerForNews = caredRoster.find((p) => p.id === intl.selectedMatches[0].playerId);
      if (playerForNews) {
        generatedNews.push(createManualNewsPost({
          type: 'performance',
          player: playerForNews,
          week: state.week + 1,
          text: `🌍 Trêve internationale (${intl.meta.label}) — ${intl.selectedMatches.length} de tes joueurs en sélection cette semaine.`,
        }));
      }
    }
  }

  // ── Tournoi Mondial ─────────────────────────────────────────────────────────
  let wcState = state.worldCupState;
  const worldCupMatchResults = [];

  // Déclencher la CdM après la fin de la saison 1 (et toutes les 4 saisons ensuite)
  if (phase.seasonWeek === 38 && shouldTriggerWorldCup(phase.season, wcState)) {
    wcState = createWorldCupState(phase.season, euRoster);
    const drawGroups = wcState.selectedPlayers.reduce((acc, player, index) => {
      const group = player.group ?? String.fromCharCode(65 + (index % 8));
      if (!acc[group]) acc[group] = [];
      acc[group].push(player);
      return acc;
    }, {});
    wcState = { ...wcState, drawGroups };
    const selectedForMessages = [...wcState.selectedPlayers].sort((a, b) => b.rating - a.rating).slice(0, 5);
    const mySelectedCount = wcState.selectedPlayers.filter((entry) => euRoster.some((player) => player.id === entry.playerId)).length;
    generatedMessages.push({
      id: makeId('msg'),
      week: state.week + 1,
      sortWeek: state.week + 1,
      type: 'world_cup_start',
      threadKey: 'world_cup',
      threadLabel: `Tournoi Mondial ${wcState.year}`,
      playerId: null,
      playerName: null,
      senderRole: 'staff',
      senderName: 'Assistant agence',
      subject: `🌍 Le Tournoi Mondial ${wcState.year} commence !`,
      body: `C'est parti ! Le Tournoi Mondial ${wcState.year} ouvre ses portes. ${mySelectedCount} de tes joueurs ont été sélectionnés dans leurs équipes nationales. Suis leurs performances pendant les prochaines semaines.`,
      read: false,
      resolved: true,
    });
    selectedForMessages.forEach((selected) => {
      const selectedPlayer = euRoster.find((player) => player.id === selected.playerId);
      if (!selectedPlayer) return;
      generatedMessages.push({
        id: makeId('msg'),
        week: state.week + 1,
        sortWeek: state.week + 1 + 0.005,
        type: 'national_pride',
        context: 'world_cup_selection',
        threadKey: selectedPlayer.id,
        threadLabel: `${selectedPlayer.firstName} ${selectedPlayer.lastName}`,
        playerId: selectedPlayer.id,
        playerName: `${selectedPlayer.firstName} ${selectedPlayer.lastName}`,
        senderRole: 'player',
        senderName: `${selectedPlayer.firstName} ${selectedPlayer.lastName}`,
        subject: `Sélection ${selected.countryName}`,
        body: `${selectedPlayer.firstName} ${selectedPlayer.lastName} vient d'être convoqué avec ${selected.countryName}. Le tournoi change le dossier. On doit gérer la pression et la fatigue.`,
        read: false,
        resolved: false,
      });
    });
    generatedNews.push(createManualNewsPost({
      type: 'media',
      week: state.week + 1,
      text: `🌍 Tirage de le Tournoi Mondial ${wcState.year} : groupes en place, la pression monte déjà pour les sélectionnés.`,
      reputationImpact: 2,
      account: { name: 'Global Football Board Draw Room', kind: 'journal', icon: 'FD', color: '#1a1a6e' },
    }));
  }

  const updateWorldCupFeaturedMatch = (currentState, roster) => {
    if (!currentState || currentState.phase === 'done') return currentState;
    const featuredEntry = [...(currentState.selectedPlayers ?? [])]
      .filter((player) => !player.eliminated && !player.champion)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null;
    const featuredPlayer = featuredEntry ? roster.find((player) => player.id === featuredEntry.playerId) : null;
    const nextFeaturedMatch = featuredPlayer ? getWorldCupFixturePreview(featuredPlayer, currentState.phase, currentState) : null;
    return { ...currentState, nextFeaturedMatch };
  };

  // Simuler la phase CdM en cours (1 semaine = 1 phase de plus)
  if (wcState && wcState.phase !== 'done') {
    const agencyPlayerById = new Map(euRoster.map((player) => [player.id, player]));
    const simulatedPool = (wcState.selectedPlayers ?? []).map((entry) => {
      const agencyPlayer = agencyPlayerById.get(entry.playerId);
      if (agencyPlayer) return agencyPlayer;
      return {
        id: entry.playerId,
        firstName: String(entry.playerName ?? 'Joueur').split(' ')[0] ?? 'Joueur',
        lastName: String(entry.playerName ?? '').split(' ').slice(1).join(' '),
        countryCode: entry.countryCode,
        countryFlag: entry.countryFlag,
        club: entry.club ?? 'Club mondial',
        rating: entry.rating ?? 130,
        form: entry.form ?? 60,
        moral: entry.moral ?? 50,
        position: entry.position ?? 'MIL',
      };
    });
    for (const player of simulatedPool) {
      const wcMatch = simulateWorldCupMatch(player, wcState.phase, wcState);
      if (!wcMatch) continue;
      worldCupMatchResults.push(wcMatch);

      // Mettre à jour le joueur dans wcState
      wcState = {
        ...wcState,
        selectedPlayers: wcState.selectedPlayers.map((s) => s.playerId === player.id ? {
          ...s,
          goals: s.goals + wcMatch.goals,
          assists: s.assists + wcMatch.assists,
          avgRating: s.appearances > 0 ? ((s.avgRating * s.appearances) + wcMatch.matchRating) / (s.appearances + 1) : wcMatch.matchRating,
          appearances: s.appearances + 1,
          eliminated: s.eliminated || wcMatch.isEliminated,
          champion: s.champion || wcMatch.isChampion,
        } : s),
        results: [...wcState.results, wcMatch].slice(0, 60),
      };

      // Appliquer impact joueur
      const isAgencyPlayer = agencyPlayerById.has(player.id);
      if (isAgencyPlayer) {
        const valMult = wcMatch.isChampion ? 1.35 : wcMatch.goals >= 2 ? 1.12 : wcMatch.goals >= 1 ? 1.06 : 1.0;
        euRoster = euRoster.map((p) => p.id === player.id ? {
          ...p,
          moral: clamp(p.moral + (wcMatch.result === 'win' ? 5 : wcMatch.isEliminated ? -10 : -2) + (wcMatch.goals ? 6 : 0) + (wcMatch.isChampion ? 25 : 0)),
          value: Math.floor(p.value * valMult),
          form: clamp(p.form + (wcMatch.matchRating >= 8 ? 4 : wcMatch.matchRating >= 7 ? 2 : -1), 40, 99),
          fatigue: clamp((p.fatigue ?? 20) + (wcMatch.isChampion ? 4 : wcMatch.matchRating >= 8 ? 6 : wcMatch.matchRating >= 7 ? 5 : 3), 0, 100),
        } : p);
      }

      // News
      const wcNews = isAgencyPlayer ? getWorldCupMatchNews(player, wcMatch) : null;
      if (wcNews) {
        generatedNews.push(createManualNewsPost({
          type: wcNews.type,
          player,
          week: state.week + 1,
          text: wcNews.text,
          reputationImpact: wcNews.reputationImpact,
          account: { name: 'Tournoi Mondial', kind: 'media', icon: '🌍', color: '#1a1a6e' },
        }));
        reputationChange += scaleReputationDelta(wcNews.reputationImpact);
        wcState = {
          ...wcState,
          countryPressure: {
            ...(wcState.countryPressure ?? {}),
            [player.countryCode]: clamp((wcState.countryPressure?.[player.countryCode] ?? 50) + (wcMatch.matchRating >= 8 ? 8 : wcMatch.goals > 0 ? 5 : wcMatch.result === 'loss' ? -4 : 2), 0, 100),
          },
        };
        const interestClubs = getWorldCupInterestClubs(player, wcMatch);
        if (interestClubs.length > 0) {
          wcMatch.interestClubs = interestClubs;
          generatedNews.push(createManualNewsPost({
            type: 'transfert',
            player,
            week: state.week + 1,
            text: `${interestClubs.slice(0, 3).join(', ')} surveillent ${player.firstName} ${player.lastName} après le Tournoi Mondial.`,
            reputationImpact: 2,
            account: { name: 'Mercato Insider', kind: 'journal', icon: 'MI', color: '#172026' },
          }));
          if (wcMatch.isChampion || wcMatch.matchRating >= 8.2 || wcMatch.goals >= 1) {
            generatedMessages.push({
              id: makeId('msg'),
              week: state.week + 1,
              sortWeek: state.week + 1 + 0.015,
              type: 'secret_offer',
              context: 'world_cup_interest',
              threadKey: player.id,
              threadLabel: `${player.firstName} ${player.lastName}`,
              playerId: player.id,
              playerName: `${player.firstName} ${player.lastName}`,
              senderRole: 'player',
              senderName: `${player.firstName} ${player.lastName}`,
              subject: 'Des clubs se renseignent',
              body: `${interestClubs.slice(0, 2).join(' et ')} me suivent depuis le match. Je voulais que tu le saches avant que ça prenne trop d'ampleur.`,
              read: false,
              resolved: false,
            });
          }
        }
        if (wcMatch.isChampion || wcMatch.matchRating >= 8 || wcMatch.goals >= 2) {
          generatedMessages.push({
            id: makeId('msg'),
            week: state.week + 1,
            sortWeek: state.week + 1 + 0.01,
            type: wcMatch.isChampion ? 'thanks' : 'national_pride',
            context: `world_cup:${wcMatch.phase}`,
            threadKey: player.id,
            threadLabel: `${player.firstName} ${player.lastName}`,
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            senderRole: 'player',
            senderName: `${player.firstName} ${player.lastName}`,
            subject: wcMatch.isChampion ? 'On l\'a fait !' : 'La sélection me booste',
            body: wcMatch.isChampion
              ? `On est champions du monde... je n'oublierai jamais ça. Merci d'avoir cru en moi.`
              : player.personality === 'ambitieux'
                ? `Cette sélection me montre que je peux aller encore plus haut. Il faut qu'on transforme ça en vraie opportunité.`
                : player.personality === 'loyal'
                  ? `Je suis fier de représenter mon pays. Merci de m'avoir accompagné jusqu'ici.`
                  : player.personality === 'mercenaire'
                    ? `La vitrine est énorme. Il faudra bien capitaliser sur ce tournoi.`
                    : `Cette sélection me donne faim pour la suite. On sent que le niveau monte. Merci pour le suivi.`,
            read: false,
            resolved: wcMatch.isChampion,
          });
          generatedNews.push(createManualNewsPost({
            type: 'transfert',
            week: state.week + 1,
            text: `${player.firstName} ${player.lastName} attire des regards étrangers après son match de Tournoi Mondial. Les clubs surveillent de près son dossier.`,
            reputationImpact: 3,
            account: { name: 'Mercato Insider', kind: 'journal', icon: 'MI', color: '#172026' },
          }));
        }
      }
    }

    // Avancer la phase CdM
    wcState = advanceWorldCupPhase(wcState);
    if (wcState.phase === 'done') {
      const heritageCards = [...(wcState.selectedPlayers ?? [])]
        .filter(Boolean)
        .sort((a, b) => (
          (Number(b?.goals ?? 0) + Number(b?.assists ?? 0) * 0.5 + Number(b?.avgRating ?? 0))
          - (Number(a?.goals ?? 0) + Number(a?.assists ?? 0) * 0.5 + Number(a?.avgRating ?? 0))
        ))
        .slice(0, 5)
        .map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          countryName: player.countryName,
          countryFlag: player.countryFlag,
          goals: player.goals,
          assists: player.assists,
          avgRating: Number((player.avgRating || 0).toFixed(1)),
          label: player.champion ? 'Champion du monde' : player.goals >= 2 ? 'Tournoi XXL' : 'Parcours marquant',
        }));
      wcState = { ...wcState, heritageCards };
      generatedNews.push(createManualNewsPost({
        type: 'media',
        week: state.week + 1,
        text: `🏆 Fin de le Tournoi Mondial ${wcState.year}. Des cartes héritage sont créées pour les plus gros parcours du tournoi.`,
        reputationImpact: 4,
        account: { name: 'Global Tournament Chronicle', kind: 'journal', icon: 'WC', color: '#1a1a6e' },
      }));
    } else {
      wcState = updateWorldCupFeaturedMatch(wcState, euRoster);
    }
  }

  if (wcState && wcState.phase !== 'done' && !wcState.nextFeaturedMatch) {
    wcState = updateWorldCupFeaturedMatch(wcState, euRoster);
  }

  // ── Événements Calendrier Saisonnier ──────────────────────────────────────
  const activePeriod = getActivePeriod(phase.seasonWeek);
  const periodEffect = getPeriodMoodEffect(activePeriod);
  let periodRoster = euRoster;

  if (activePeriod) {
    // Appliquer effets d'ambiance à tous les joueurs
    if (periodEffect.moral !== 0 || periodEffect.trust !== 0) {
      periodRoster = euRoster.map((p) => ({
        ...p,
        moral: clamp(p.moral + periodEffect.moral),
        trust: clamp((p.trust ?? 50) + periodEffect.trust),
      }));
    }

    // Générer un message saisonnier pour un joueur au hasard (35% chance, 1 par joueur par période)
    const weekKey = `calendar_${activePeriod.key}_${phase.season}`;
    const alreadyHadSeasonalMsg = (state.sentSeasonalMessages ?? []).includes(weekKey);
    if (!alreadyHadSeasonalMsg && periodRoster.length > 0) {
      const targetPlayer = periodRoster[Math.floor(Math.random() * periodRoster.length)];
      const seasonalMsg = maybeCreateSeasonalMessage(targetPlayer, activePeriod.key, state.week + 1, false, state);
      if (seasonalMsg) generatedMessages.push(seasonalMsg);
    }

    // Générer une news saisonnière (40% chance)
    const seasonalNewsItem = getSeasonalNewsItem(activePeriod, state.week + 1);
    if (seasonalNewsItem) {
      generatedNews.push({
        ...seasonalNewsItem,
        sortWeek: state.week + 1,
        week: state.week + 1,
      });
    }
  }

  // Appliquer les événements passifs enchaînés arrivés à maturité
  const pendingChains = state.pendingChainedEvents ?? [];
  const chainedPassives = processChainedPassiveEvents(pendingChains, periodRoster, state.week + 1);
  let chainedRoster = periodRoster;
  for (const { player, event } of chainedPassives) {
    const moneyImpact = event.good ? Math.floor(event.money * EVENT_INCOME_MULT) : Math.floor(event.money * mediaReduction);
    const reputationImpact = scaleReputationDelta(event.good ? event.rep : Math.floor(event.rep * mediaReduction));
    chainedRoster = chainedRoster.map((p) => p.id === player.id ? applyPassiveEventToPlayer(p, event) : p);
    totalIncome += moneyImpact > 0 ? moneyImpact : 0;
    totalCost += moneyImpact < 0 ? Math.abs(moneyImpact) : 0;
    reputationChange += reputationImpact;
    events.push({ player: `${player.firstName} ${player.lastName}`, playerId: player.id, ...event, money: moneyImpact, rep: reputationImpact, chained: true });
    generatedNews.push(createNewsPost({ player, event, week: state.week + 1, reputationImpact }));
  }

  // Events interactifs : fréquence réduite pour ne pas saturer
  // Cooldown global: min 2 semaines entre deux events interactifs
  let interactiveEvent = null;
  const lastInteractiveWeek = state.lastInteractiveEventWeek ?? 0;
  const interactiveCooldownOk = (state.week - lastInteractiveWeek) >= 2;
  const nextPhase = getPhase(state.week + 1);
  const lockerRoomSnapshot = buildLockerRoomSnapshot(chainedRoster);
  const lockerRoomTension = lockerRoomSnapshot.reduce((max, group) => Math.max(max, group.tension ?? 0), 0);
  const averageForm = chainedRoster.length
    ? chainedRoster.reduce((sum, player) => sum + (player.form ?? 50), 0) / chainedRoster.length
    : 50;
  const pressConferenceDue = Boolean(
    (topMatch && topMatch.matchRating >= 7.3)
    || (flopMatch && flopMatch.matchRating <= 5.9)
    || lockerRoomTension >= 60
    || averageForm <= 48
  );

  if (interactiveCooldownOk && chainedRoster.length > 0 && (pressConferenceDue ? Math.random() < 0.65 : Math.random() < 0.16)) {
    interactiveEvent = chooseInteractiveEvent(chainedRoster, {
      scoutLevel: getStaffEffect(state.staff, 'scoutAfrica'),
      phase: nextPhase,
      topMatch,
      vestiaireTension: lockerRoomTension,
      pressConference: pressConferenceDue || nextPhase.mercato,
      worldCupActive: isWorldCupActive,
    });
  }

  const contractEvent = getContractEventForRoster(chainedRoster, state.week + 1);
  if (contractEvent && !interactiveEvent && interactiveCooldownOk && Math.random() < 0.45) {
    interactiveEvent = contractEvent;
  }

  // Si pas d'événement interactif organique, piocher dans les chaînes interactives
  if (!interactiveEvent) {
    const chainedInteractive = pickChainedInteractiveEvent(pendingChains, chainedRoster, state.week + 1);
    if (chainedInteractive) interactiveEvent = chainedInteractive;
  }

  let clubMemory = state.clubMemory;
  const promiseEvaluation = evaluatePromises({ promises: state.promises ?? [], roster: chainedRoster, week: state.week + 1 });
  promiseEvaluation.failedPromises.forEach((promise) => {
    reputationChange -= 3;
    segmentReputation = applySegmentReputationChange(segmentReputation, { media: -2, business: -1 });
    generatedMessages.push({
      id: makeId('msg'),
      week: state.week + 1,
      type: 'promise_broken_warning',
      context: 'promise_failed',
      playerId: promise.playerId,
      playerName: promise.playerName,
      subject: 'Tu avais promis',
      body: `La promesse "${promise.label}" n'a pas été tenue. Je dois réfléchir à la suite.`,
      read: false,
      resolved: false,
    });
    if (['staff_dialogue', 'coach_dialogue', 'ds_dialogue'].includes(promise.type)) {
      const player = chainedRoster.find((item) => item.id === promise.playerId);
      if (player) {
        if (player.club && player.club !== 'Libre') {
          clubMemory = recordClubMemory(clubMemory, player.club, { promisesBroken: 1, trust: -4, week: state.week + 1 });
        }
        generatedMessages.push(createMessage({
          player,
          type: 'transfer_request',
          week: state.week + 1,
          context: 'staff_promise_failed',
        }));
      }
    }
  });

  const departureCandidates = chainedRoster
    .map((player) => {
      const departureRisk = getDepartureRisk({ ...player, currentWeek: state.week + 1 });
      return {
        ...player,
        departureRisk: departureRisk.risk,
        departureReason: departureRisk.reason,
      };
    })
    .filter((player) => player.departureRisk > 0 && Math.random() < player.departureRisk)
    .sort((a, b) => (b.departureRisk ?? 0) - (a.departureRisk ?? 0));
  const maxWeeklyDepartures = chainedRoster.length >= 10 ? 2 : 1;
  const minimumRosterToKeep = 2;
  const allowedDepartures = Math.max(0, Math.min(maxWeeklyDepartures, chainedRoster.length - minimumRosterToKeep));
  const leavingPlayers = departureCandidates.slice(0, allowedDepartures);
  const departedPlayerIds = new Set(leavingPlayers.map((player) => player.id));
  const keepsDepartedClean = (item) => !item?.playerId || !departedPlayerIds.has(item.playerId);
  const net = totalIncome - totalCost;
  const worldSummary = generateWorldSummaryFromNarrative({ week: state.week + 1, phase: nextPhase, worldState: state.worldState });
  let objectives = state.objectives;
  let bonusMoney = 0;
  let bonusReputation = 0;
  const socialCrisisCooldowns = { ...(state.socialCrisisCooldowns ?? {}) };

  // Rotation worldState à chaque nouvelle saison
  const nextWorldState = nextPhase.seasonWeek === 1 && state.week > 1
    ? generateWorldState(nextPhase.season)
    : (state.worldState ?? generateWorldState(1));

  weeklyFixtures.forEach((fixture) => {
    const homeName = fixture.homeClub?.name;
    const awayName = fixture.awayClub?.name;
    if (homeName) {
      const current = clubSeasonHistory[homeName] ?? createClubSeasonHistory(currentSeason)[homeName];
      clubSeasonHistory = {
        ...clubSeasonHistory,
        [homeName]: {
          ...current,
          league: [
            { week: state.week + 1, score: `${fixture.homeGoals}-${fixture.awayGoals}`, opponent: awayName, home: true },
            ...(current.league ?? []),
          ].slice(0, 12),
          summary: [`${homeName} ${fixture.homeGoals}-${fixture.awayGoals} ${awayName}`, ...(current.summary ?? [])].slice(0, 8),
        },
      };
    }
    if (awayName) {
      const current = clubSeasonHistory[awayName] ?? createClubSeasonHistory(currentSeason)[awayName];
      clubSeasonHistory = {
        ...clubSeasonHistory,
        [awayName]: {
          ...current,
          league: [
            { week: state.week + 1, score: `${fixture.awayGoals}-${fixture.homeGoals}`, opponent: homeName, home: false },
            ...(current.league ?? []),
          ].slice(0, 12),
          summary: [`${awayName} ${fixture.awayGoals}-${fixture.homeGoals} ${homeName}`, ...(current.summary ?? [])].slice(0, 8),
        },
      };
    }
  });

  euroMatchResults.forEach((match) => {
    if (!match?.club) return;
    nextMatchCalendar = upsertCalendarMatches(
      nextMatchCalendar,
      [europeanMatchToCalendarMatch(match, { week: state.week, day: match.simulatedDay ?? getEuropeanSimDayIndex(state.week, match.playerId) })],
    );
    nextMatchResultStore = upsertMatchResults(
      nextMatchResultStore,
      [playerMatchToResultRecord(match, { week: state.week, day: match.simulatedDay ?? getEuropeanSimDayIndex(state.week, match.playerId), source: 'europe' })],
    );
    const current = clubSeasonHistory[match.club] ?? createClubSeasonHistory(currentSeason)[match.club];
    clubSeasonHistory = {
      ...clubSeasonHistory,
      [match.club]: {
        ...current,
        competition: match.competition ?? current.competition,
        europe: [
          {
            week: state.week + 1,
            competition: match.competition,
            competitionLabel: match.competitionLabel,
            score: match.score,
            opponent: match.opponent,
            result: match.result,
            phase: match.phase ?? match.stage ?? current.phase ?? null,
            stage: match.stage ?? null,
            homeAway: match.homeAway ?? null,
          },
          ...(current.europe ?? []),
        ].slice(0, 12),
        summary: [`${match.competitionLabel ?? 'Europe'} · ${match.score} vs ${match.opponent}`, ...(current.summary ?? [])].slice(0, 8),
      },
    };
  });

  // Track season objectives progress from this week's events
  let currentObjectives = state.seasonObjectives ?? generateSeasonObjectives(state);
  if (totalIncome > 0) {
    currentObjectives = updateObjectiveProgress(currentObjectives, { type: 'earn_money', amount: totalIncome });
  }
  if (reputationChange > 0) {
    currentObjectives = updateObjectiveProgress(currentObjectives, { type: 'reputation_gain', amount: reputationChange });
  }
  const objectiveCheck = checkObjectiveCompletion(currentObjectives);
  currentObjectives = objectiveCheck.objectives;
  if (objectiveCheck.rewards.money > 0) {
    bonusMoney += objectiveCheck.rewards.money;
    bonusReputation += objectiveCheck.rewards.rep;
  }
  const bonusGems = objectiveCheck.rewards.gems ?? 0;
  const seasonObjectiveGemBonus = nextPhase.seasonWeek === 1 && state.week > 1
    ? currentObjectives.filter((objective) => objective.completed).length * 2
    : 0;
  const gemRewardState = awardGems({ gems: state.gems ?? 0 }, bonusGems + seasonObjectiveGemBonus, 'objectifs');

  if (nextPhase.seasonWeek === 1 && state.week > 1) {
    // Old-style objectives fallback evaluation
    (state.objectives ?? []).forEach((objective) => {
      const done =
        (objective.type === 'money' && state.stats.totalEarned >= (objective.target ?? 0)) ||
        (objective.type === 'rep' && state.reputation >= (objective.target ?? 0)) ||
        (objective.type === 'transfers' && state.stats.transfersDone >= (objective.target ?? 0));
      if (done) bonusMoney += objective.reward ?? 0;
    });

    bonusReputation += bonusMoney > 0 ? 3 : 0;
    objectives = generateObjectives(nextPhase.season);
    currentObjectives = generateSeasonObjectives({ week: state.week + 1, reputation: state.reputation });
  }

  const seasonRecap = nextPhase.seasonWeek === 1 && state.week > 1
    ? {
        season: nextPhase.season - 1,
        transfers: state.stats.transfersDone,
        earned: state.stats.totalEarned,
        reputation: state.reputation,
        objectivesCompleted: currentObjectives.filter((o) => o.completed).length,
      }
    : null;

  let finalRoster = chainedRoster
    .filter((player) => !leavingPlayers.some((leavingPlayer) => leavingPlayer.id === player.id))
    .map((player) =>
      nextPhase.seasonWeek === 1 && state.week > 1
        ? {
            ...player,
            age: player.age + 1,
            fatigue: clamp((player.fatigue ?? 20) - 18, 0, 100),
            seasonStats: { appearances: 0, goals: 0, assists: 0, saves: 0, tackles: 0, keyPasses: 0, xg: 0, injuries: 0, ratings: [], averageRating: null },
            careerGoal: createCareerGoal(player),
          }
        : player,
    );

  const worldCupSelectionIds = new Set(
    (wcState?.selectedPlayers ?? [])
      .filter((entry) => !entry.eliminated && !entry.champion)
      .map((entry) => entry.playerId),
  );
  finalRoster = finalRoster.map((player) => {
    if (wcState && wcState.phase !== 'done' && worldCupSelectionIds.has(player.id)) {
      return { ...player, seasonStatus: 'international' };
    }
    if (wcState && wcState.phase !== 'done') {
      return { ...player, seasonStatus: 'vacation' };
    }
    if (nextPhase.mercato && nextPhase.window === 'été') {
      return { ...player, seasonStatus: 'vacation' };
    }
    if (player.seasonStatus === 'vacation') {
      return { ...player, seasonStatus: 'club' };
    }
    return player;
  });

  const annualCalendar = resolveAnnualCalendarEventsFromNarrative({
    roster: finalRoster,
    leagueTables: isNewSeasonStart ? createInitialLeagueTables() : (state.leagueTables ?? createInitialLeagueTables()),
    phase: nextPhase,
    seasonAwards: state.seasonAwards,
    week: state.week + 1,
  });
  finalRoster = annualCalendar.roster;
  totalIncome += annualCalendar.income;
  reputationChange += annualCalendar.reputation;
  events.push(...annualCalendar.events);
  generatedNews.push(...annualCalendar.news);

  const livingWeek = generateLivingWeek({
    state,
    roster: finalRoster,
    phase: nextPhase,
  });
  finalRoster = livingWeek.roster;
  events.push(...livingWeek.events);
  generatedNews.push(...livingWeek.news);
  generatedMessages.push(...livingWeek.messages);

  const narrativeFollowups = generateNarrativeFollowups({
    state,
    roster: finalRoster,
    week: state.week + 1,
  });
  events.push(...narrativeFollowups.events);
  generatedMessages.push(...narrativeFollowups.messages);
  const narrativeOffers = narrativeFollowups.offers ?? [];

  const lockerRoomImpact = applyLockerRoomDynamics(finalRoster, state.week + 1);
  finalRoster = lockerRoomImpact.roster;
  events.push(...lockerRoomImpact.events);

  const normalizedOfferBook = normalizeOfferBookFromEngine(state.clubOffers ?? []);
  const activeOffers = normalizedOfferBook.filter((offer) => offer.expiresWeek >= state.week && offer.status === 'open');
  const expiredOffers = normalizedOfferBook.map((offer) =>
    offer.status === 'open' && offer.expiresWeek < state.week + 1 ? { ...offer, status: 'expired' } : offer,
  );
  const newClubOffers = generateClubOffers({
    roster: finalRoster,
    week: state.week + 1,
    reputation: state.reputation,
    existingOffers: activeOffers,
    worldState: state.worldState,
    cooldowns: state.negotiationCooldowns ?? {},
    lockedPlayerIds: activeDossierPlayerIds,
  });
  if (narrativeOffers.length) newClubOffers.push(...narrativeOffers);

  // Offre surprise hors mercato
  const surpriseOffer = generateSurpriseOffer({
    roster: finalRoster,
    week: state.week + 1,
    reputation: state.reputation,
    worldState: state.worldState,
    cooldowns: state.negotiationCooldowns ?? {},
    lockedPlayerIds: activeDossierPlayerIds,
  });
  if (surpriseOffer) newClubOffers.push(surpriseOffer);
  const scheduledNextWeek = scheduleLeagueMatches(
    { ...state, matchCalendar: nextMatchCalendar },
    finalRoster,
    state.week + 1,
  );
  const nextFixtures = scheduledNextWeek.fixtures;
  nextMatchCalendar = scheduledNextWeek.calendar;
  const competitorThreat = rollCompetitorThreat({ roster: finalRoster, week: state.week + 1, dossierMemory: state.dossierMemory ?? {} });
  const completedScouting = [];
  const scoutingMissions = (state.scoutingMissions ?? []).map((mission) => {
    if (mission.status !== 'active') return mission;
    const weeksLeft = mission.weeksLeft - 1;
    if (weeksLeft > 0) return { ...mission, weeksLeft };
    const prospectBase = drawProspects({
      reputation: state.reputation + mission.scoutLevel * 5,
      scoutLevel: mission.scoutLevel,
      season: Math.floor(((state.week ?? 1) - 1) / 38) + 1,
      existingIds: [
        ...(state.roster ?? []).map((p) => p.id),
        ...(state.market ?? []).map((p) => p.id),
        ...(state.freeAgents ?? []).map((p) => p.id),
      ],
      count: 1,
      agencyCountryCode: getAgencyCountryCode(state),
      allowedCountryCodes: [mission.countryCode ?? getAgencyCountryCode(state)],
    })[0] ?? null;
    if (!prospectBase) return { ...mission, weeksLeft: 0, status: 'completed' };
    const prospect = {
      ...prospectBase,
      careerGoal: createCareerGoal(prospectBase),
      scoutReport: createScoutReport(prospectBase, mission.scoutLevel),
      timeline: [{ week: state.week + 1, type: 'scout', label: 'Repéré en mission scouting' }],
    };
    completedScouting.push(prospect);
    return { ...mission, weeksLeft: 0, status: 'completed', playerId: prospect.id, playerName: `${prospect.firstName} ${prospect.lastName}` };
  });
  if (competitorThreat) {
    generatedMessages.push({
      id: makeId('msg'),
      week: state.week + 1,
      type: 'complaint',
      context: 'competitor_agent',
      playerId: competitorThreat.playerId,
      playerName: competitorThreat.playerName,
      subject: `${competitorThreat.agentName} me contacte`,
      body: `Un agent concurrent insiste pour me rencontrer. J'ai besoin de savoir si ton projet est toujours solide.`,
      read: false,
      resolved: false,
    });
  }

  const offerNews = newClubOffers.map((offer) =>
    createManualNewsPost({
      type: 'transfert',
      player: finalRoster.find((player) => player.id === offer.playerId),
      week: state.week + 1,
      text: offer.isSurprise
        ? `FLASH — ${offer.club} formule une offre d'urgence pour ${offer.playerName} hors mercato.`
        : offer.isHotWeek
          ? `FRÉNÉSIE — ${offer.club} s'emballe pour ${offer.playerName}. Plusieurs clubs en lice.`
          : `${offer.club} prépare une offre pour ${offer.playerName}. Le mercato ${offer.window} s'anime.`,
      reputationImpact: offer.isSurprise ? 2 : 1,
      account: { name: 'TransferRadar', kind: 'data', icon: 'TR', color: '#2f80ed' },
    }),
  );
  const worldNews = worldSummary.map((item) => createManualNewsPost({
    type: item.type === 'rumor' ? 'transfert' : 'media',
    week: state.week + 1,
    text: item.text,
    reputationImpact: 0,
    account: { name: 'World Football Wire', kind: 'journal', icon: 'WF', color: '#172026' },
  }));
  const consequenceState = {
    ...state,
    credibility: livingWeek.statePatch.credibility ?? state.credibility,
    mediaRelations: livingWeek.statePatch.mediaRelations ?? state.mediaRelations,
    countryReputation: livingWeek.statePatch.countryReputation ?? state.countryReputation,
    playerSegmentReputation: livingWeek.statePatch.playerSegmentReputation ?? state.playerSegmentReputation,
    rivalAgents: livingWeek.statePatch.rivalAgents ?? state.rivalAgents,
    decisionHistory: livingWeek.statePatch.decisionHistory ?? state.decisionHistory,
    clubRelations: livingWeek.statePatch.clubRelations ?? state.clubRelations,
    leagueReputation: state.leagueReputation,
    activeNarratives: livingWeek.statePatch.activeNarratives ?? state.activeNarratives ?? [],
  };
  const socialConsequences = applyNewsConsequences({
    state: consequenceState,
    roster: finalRoster,
    posts: [...offerNews, ...worldNews, ...generatedNews],
    week: state.week + 1,
  });
  finalRoster = socialConsequences.roster;
  events.push(...socialConsequences.events);
  generatedMessages.push(...socialConsequences.messages);

  const normalizedPendingTransfers = (state.pendingTransfers ?? []).map((transfer) => {
    if (!transfer || typeof transfer !== 'object') return null;
    const player = finalRoster.find((item) => item.id === transfer.playerId)
      ?? state.freeAgents?.find((item) => item.id === transfer.playerId)
      ?? state.market?.find((item) => item.id === transfer.playerId)
      ?? null;
    const offer = transfer.offer
      ?? state.clubOffers?.find((item) => item.id === transfer.offerId)
      ?? state.clubOffers?.find((item) => item.playerId === transfer.playerId && (item.status === 'accepted_pending' || item.status === 'open'))
      ?? null;
    if (!player || !offer) return null;
    return {
      ...transfer,
      playerName: transfer.playerName ?? `${player.firstName} ${player.lastName}`,
      offer,
      agreement: transfer.agreement ?? buildTransferAgreementFromEngine(player, offer, transfer.negotiatedOutcome ?? null),
      effectiveWeek: Number.isFinite(transfer.effectiveWeek) ? transfer.effectiveWeek : offer.effectiveWeek ?? state.week + 1,
    };
  }).filter(Boolean);
  const duePendingTransfers = normalizedPendingTransfers.filter((transfer) => transfer.effectiveWeek <= state.week + 1);
  const remainingPendingTransfers = normalizedPendingTransfers.filter((transfer) => transfer.effectiveWeek > state.week + 1);
  let pendingTransferIncome = 0;
  let pendingTransferReputation = 0;
  const completedOfferIds = [];
  const completedTransferHistory = [];
  const updatedNegotiationCooldowns = { ...(state.negotiationCooldowns ?? {}) };
  duePendingTransfers.forEach((transfer) => {
    const playerBeforeMove = finalRoster.find((item) => item.id === transfer.playerId);
    if (!playerBeforeMove) return;
    const nextPlayer = applyCompletedTransferToPlayerFromEngine(playerBeforeMove, transfer.offer, transfer.agreement, state.week + 1);
    finalRoster = finalRoster.map((item) => (item.id === transfer.playerId ? nextPlayer : item));
    pendingTransferIncome += transfer.agreement.commission;
    pendingTransferReputation += 3;
    updatedNegotiationCooldowns[transfer.playerId] = state.week + 4;
    completedOfferIds.push(transfer.offerId);
    completedTransferHistory.push({
      id: `transfer_${transfer.playerId}_${state.week + 1}_${transfer.offer?.club ?? 'club'}`,
      playerId: transfer.playerId,
      playerName: transfer.playerName,
      fromClub: playerBeforeMove.club,
      fromClubId: playerBeforeMove.club ? `club_${String(playerBeforeMove.club).toLowerCase().replace(/\W+/g, '_')}` : null,
      toClub: transfer.offer.club,
      toClubId: transfer.offer.club ? `club_${String(transfer.offer.club).toLowerCase().replace(/\W+/g, '_')}` : null,
      type: transfer.offer.type ?? 'transfer',
      fee: transfer.offer.amount ?? 0,
      commission: transfer.agreement.commission ?? 0,
      week: state.week + 1,
      season: Math.floor((state.week) / 38) + 1,
      result: 'completed',
      context: transfer.offer.context ?? 'pré-accord activé',
      offerId: transfer.offerId,
    });
    generatedNews.unshift(
      createManualNewsPost({
        type: 'transfert',
        player: nextPlayer,
        week: state.week + 1,
        text: `Officiel: ${transfer.playerName} rejoint ${transfer.offer.club} au début du mercato ${transfer.offer.window}.`,
        reputationImpact: 4,
        account: { name: 'World Football Wire', kind: 'journal', icon: 'WF', color: '#172026' },
      }),
    );
    events.push({
      player: transfer.playerName,
      playerId: transfer.playerId,
      label: `Transfert activé: ${transfer.offer.club}`,
      good: true,
      type: 'transfer',
      money: transfer.agreement.commission,
      rep: 3,
    });
    generatedMessages.push({
      id: makeId('msg'),
      week: state.week + 1,
      type: 'transfer_request',
      context: 'predeal_activation',
      playerId: transfer.playerId,
      playerName: transfer.playerName,
      subject: 'Transfert activé',
      body: `${transfer.playerName} rejoint officiellement ${transfer.offer.club} au début du mercato. Le dossier est désormais clos.`,
      read: false,
      resolved: false,
    });
  });

  const coherentGeneratedMessages = filterCoherentMessages(generatedMessages, finalRoster, { ...state, week: state.week + 1 });
  const existingInboxMessages = compactOpenResponseMessages((state.messages ?? []).filter(keepsDepartedClean));
  const queuedMessages = limitQueuedResponseMessages([...(state.messageQueue ?? []), ...coherentGeneratedMessages], existingInboxMessages).map((message) => normalizeMessageRecord({
    ...message,
    priority: message.priority ?? getMessagePriority(message),
    queuedWeek: message.queuedWeek ?? state.week + 1,
  })).filter(keepsDepartedClean);
  queuedMessages.sort((a, b) => {
    const rank = { urgent: 3, normal: 2, to_process: 1 };
    const priorityDelta = (rank[b.priority] ?? 2) - (rank[a.priority] ?? 2);
    if (priorityDelta) return priorityDelta;
    const weekDelta = (a.week ?? 0) - (b.week ?? 0);
    if (weekDelta) return weekDelta;
    return String(a.id).localeCompare(String(b.id));
  });
  const deliveredMessages = queuedMessages.slice(0, 1);
  const remainingMessageQueue = queuedMessages.slice(1);
  // Supprimer les chaînes déjà traitées ou expirées et ajouter les nouvelles
  const processedChainIds = new Set([
    ...chainedPassives.map((_, i) => pendingChains.filter((c) => c.type === 'passive' && c.triggerWeek <= state.week + 1)[i]?.id),
    ...(interactiveEvent?.chainId ? [interactiveEvent.chainId] : []),
  ]);
  const updatedPendingChains = [
    ...pendingChains.filter((c) => !processedChainIds.has(c.id) && c.triggerWeek > state.week),
    ...newChainedEvents,
  ].slice(0, 50);
  if (isNewSeasonStart) {
    registerEuropeanParticipantsFromLeagueTables(nextPhase.season, state.leagueTables ?? {});
  }
  const nextLeagueTables = isNewSeasonStart
    ? createInitialLeagueTables()
    : updateLeagueTables(state.leagueTables ?? createInitialLeagueTables(), competitiveFixtures);
  const nextLeagueSeasonData = Object.entries(nextLeagueTables).reduce((data, [countryCode, table]) => ({
    ...data,
    [countryCode]: {
      season: nextPhase.season,
      countryCode,
      currentWeek: state.week + 1,
      table,
      latestFixtures: competitiveFixtures.filter((fixture) => fixture.countryCode === countryCode),
      leader: Object.values(table ?? {}).sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0]?.club ?? null,
    },
  }), {});
  const nextCompetitionTopStats = updateCompetitionTopStats(
    isNewSeasonStart ? { league: {}, europe: {} } : state.competitionTopStats,
    {
      leagueMatches: leaguePlayerResults,
      europeanMatches: euroMatchResults,
      roster: finalRoster,
    },
  );
  const finalRosterWithClubContext = finalRoster.map((player) =>
    attachClubSeasonContext(player, nextLeagueTables, nextLeagueSeasonData),
  );
  const nextMarketWithClubContext = [...completedScouting, ...(Array.isArray(state.market) ? state.market : [])]
    .slice(0, 12)
    .map((player) => attachClubSeasonContext({ ...player, marketCatalogVersion: player.marketCatalogVersion ?? MARKET_DATA_VERSION }, nextLeagueTables, nextLeagueSeasonData));

  const nextState = {
    ...state,
    money: state.money + net + bonusMoney + pendingTransferIncome,
    reputation: applyReputationChange(state.reputation, reputationChange + bonusReputation + (socialConsequences.patch.reputationDelta ?? 0) + pendingTransferReputation),
    credibility: socialConsequences.patch.credibility ?? livingWeek.statePatch.credibility ?? state.credibility ?? 50,
    segmentReputation,
    mediaRelations: socialConsequences.patch.mediaRelations ?? livingWeek.statePatch.mediaRelations ?? state.mediaRelations,
    countryReputation: socialConsequences.patch.countryReputation ?? livingWeek.statePatch.countryReputation ?? state.countryReputation,
    playerSegmentReputation: socialConsequences.patch.playerSegmentReputation ?? livingWeek.statePatch.playerSegmentReputation ?? state.playerSegmentReputation,
    rivalAgents: livingWeek.statePatch.rivalAgents ?? state.rivalAgents,
    decisionHistory: socialConsequences.patch.decisionHistory ?? livingWeek.statePatch.decisionHistory ?? state.decisionHistory ?? [],
    clubRelations: socialConsequences.patch.clubRelations ?? livingWeek.statePatch.clubRelations ?? state.clubRelations,
    leagueReputation: socialConsequences.patch.leagueReputation ?? state.leagueReputation,
    activeNarratives: socialConsequences.patch.activeNarratives ?? livingWeek.statePatch.activeNarratives ?? state.activeNarratives ?? [],
    clubMemory,
    week: state.week + 1,
    day: weeklySimulation.cursor?.day ?? (state.day ?? 1),
    seasonDay: weeklySimulation.cursor?.seasonDay ?? ((state.seasonDay ?? ((state.week - 1) * 7 + 1)) + 7),
    gems: gemRewardState.gems,
    lastInteractiveEventWeek: interactiveEvent ? state.week + 1 : (state.lastInteractiveEventWeek ?? 0),
    worldState: nextWorldState,
    worldCupState: wcState,
    midweekEuropean: null,
    europeanCupData: nextEuroData,
    sentSeasonalMessages: activePeriod
      ? [...new Set([...(state.sentSeasonalMessages ?? []), `calendar_${activePeriod.key}_${phase.season}`])]
      : (state.sentSeasonalMessages ?? []),
    activePeriod: activePeriod ? { key: activePeriod.key, label: activePeriod.label, emoji: activePeriod.emoji } : null,
    pendingChainedEvents: updatedPendingChains,
    seasonAwards: annualCalendar.seasonAwards,
    clubSeasonHistory: nextPhase.seasonWeek === 1 && state.week > 1 ? createClubSeasonHistory(nextPhase.season) : clubSeasonHistory,
    roster: finalRosterWithClubContext,
    market: nextMarketWithClubContext,
    marketCatalogVersion: state.marketCatalogVersion ?? MARKET_DATA_VERSION,
    lastFixtures: weeklyFixtures,
    nextFixtures,
    matchCalendar: nextMatchCalendar,
    matchResultStore: nextMatchResultStore,
    leagueTables: nextLeagueTables,
    competitionTopStats: nextCompetitionTopStats,
    leagueSeasonData: nextLeagueSeasonData,
    competitorThreats: competitorThreat ? [competitorThreat, ...(state.competitorThreats ?? [])].slice(0, 12) : state.competitorThreats ?? [],
    scoutingMissions,
    objectives,
    seasonObjectives: currentObjectives,
    contacts: state.contacts ?? createDefaultContacts(),
    history: [...(Array.isArray(state.history) ? state.history.slice(-20) : []), { week: state.week, net, rep: applyReputationChange(state.reputation, reputationChange) }],
    news: [
      ...offerNews,
      ...worldNews,
      ...generatedNews,
      ...state.news,
    ].slice(0, 60),
    messages: compactOpenResponseMessages([...deliveredMessages, ...existingInboxMessages]).filter(keepsDepartedClean).slice(0, 40),
    promises: normalizePromises(promiseEvaluation.promises.filter(keepsDepartedClean)).slice(0, 30),
    messageQueue: remainingMessageQueue,
    clubOffers: [...newClubOffers, ...expiredOffers].filter(keepsDepartedClean).slice(0, 30),
    pendingTransfers: remainingPendingTransfers.filter(keepsDepartedClean),
    transferHistory: [...completedTransferHistory, ...(state.transferHistory ?? [])].slice(0, 120),
    negotiationCooldowns: updatedNegotiationCooldowns,
    socialCrisisCooldowns: { ...(state.socialCrisisCooldowns ?? {}), ...socialCrisisCooldowns },
    stats: {
      ...state.stats,
      totalEarned: state.stats.totalEarned + Math.max(0, net),
      seasonsPlayed: nextPhase.seasonWeek === 1 && state.week > 1 ? state.stats.seasonsPlayed + 1 : state.stats.seasonsPlayed,
    },
    playerBonds: tickBonds(
      { ...buildInitialBonds(), ...(state.playerBonds ?? {}) },
      finalRosterWithClubContext,
      { week: state.week + 1 },
    ),
  };

  if (completedOfferIds.length) {
    nextState.clubOffers = nextState.clubOffers.map((offer) =>
      completedOfferIds.includes(offer.id) ? { ...offer, status: 'completed' } : offer,
    );
  }

  const weekTimeline = buildWeeklyTimelineFromNarrative({
    week: state.week + 1,
    phase: nextPhase,
    activePeriod,
    deliveredMessagesCount: deliveredMessages.length,
    queueSize: queuedMessages.length,
    offerCount: newClubOffers.length + duePendingTransfers.length,
    fixtureCount: weeklyFixtures.length,
    messageCount: queuedMessages.length,
    newsCount: [...offerNews, ...worldNews, ...generatedNews].length,
    interactiveEvent,
    contractEvent,
    topMatch,
    flopMatch,
    promiseFailuresCount: promiseEvaluation.failedPromises.length,
    leavingPlayersCount: leavingPlayers.length,
    net,
    bonusMoney,
    reputationChange,
    euroMatchResults,
    worldCupMatchResults,
  });

  return {
    state: nextState,
    report: {
      income: totalIncome,
      salaries: totalCost,
      staffCost: staffWeeklyCost,
      net,
      repChange: reputationChange,
      events,
      leavingPlayers,
      bonusMoney,
      seasonRecap,
      interactiveEvent,
      newSeason: nextPhase.seasonWeek === 1 && state.week > 1,
      newMessagesCount: deliveredMessages.length,
      matchResults,
      euroMatchResults,
      worldCupMatchResults,
      matchCalendar: nextMatchCalendar.filter((match) => match.week === state.week || match.week === state.week + 1),
      matchResultStore: nextMatchResultStore.filter((match) => match.week === state.week),
      fixtures: weeklyFixtures,
      clubOffers: newClubOffers,
      phase: nextPhase,
      worldSummary,
      worldCupActive: wcState && wcState.phase !== 'done',
      worldCupPhase: wcState?.phase,
      worldCupNextMatch: wcState?.nextFeaturedMatch ?? null,
      internationalBreakSummary,
      isFriendlyWeek,
      activePeriod: activePeriod ? { key: activePeriod.key, label: activePeriod.label, emoji: activePeriod.emoji } : null,
      periodEffect: periodEffect.label ? periodEffect : null,
      messageQueueCount: queuedMessages.length,
      weekTimeline,
      lockerRoom: lockerRoomImpact.snapshot,
      week: state.week,
    },
  };
};

export const playDay = (state) => {
  const dailyCalendarLockedIds = new Set(['ballon_dor_shortlist', 'ballon_dor_winner']);
  const DAILY_PULSE_HISTORY_LIMIT = 3;
  const DAILY_OFFDAY_PULSE = [
    { id: 'agency_watch', type: 'media', rarity: 'common', good: true, label: "Point agence: suivi des dossiers chauds et relances clubs." },
    { id: 'market_monitor', type: 'transfer', rarity: 'common', good: true, label: 'Marché surveillé: plusieurs clubs préparent leurs mouvements.' },
    { id: 'player_recovery', type: 'performance', rarity: 'common', good: true, label: 'Séance récupération: le staff médical ajuste les charges.' },
    { id: 'media_roundup', type: 'media', rarity: 'common', good: true, label: 'Revue presse: le nom de l’agence circule dans les colonnes mercato.' },
    { id: 'club_contacts', type: 'transfer', rarity: 'common', good: true, label: 'Réseau activé: prises de contact avec deux directions sportives.' },
    { id: 'scouting_sync', type: 'performance', rarity: 'common', good: true, label: 'Cellule scouting: validation de nouvelles pistes joueurs.' },
  ];
  const buildDailyTimeline = ({
    baseState,
    prevState = null,
    dayIndex,
    deliveredMessages = 0,
    queueSize = 0,
    kind = 'daily',
    weeklyReport = null,
    weekOverride = null,
  }) => {
    const hashText = (value = '') => {
      let h = 2166136261;
      for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    const pickFrom = (pool = [], key = '', fallback = null) => {
      if (!Array.isArray(pool) || pool.length === 0) return fallback;
      const idx = hashText(key) % pool.length;
      return pool[idx] ?? fallback;
    };
    const formatFixtureName = (fixture = {}) => `${fixture.homeTeam ?? fixture.homeClub?.name ?? 'Club'} vs ${fixture.awayTeam ?? fixture.awayClub?.name ?? 'Adversaire'}`;
    const getFixtureProfileScore = (fixture = {}) => {
      const competition = String(fixture.competition ?? fixture.competitionLabel ?? '').toUpperCase();
      const homeTier = Number(fixture.homeClub?.tier ?? 4);
      const awayTier = Number(fixture.awayClub?.tier ?? 4);
      const tierScore = (5 - homeTier) + (5 - awayTier);
      const competitionScore = competition.includes('CL') ? 30
        : competition.includes('EL') || competition.includes('CONF') ? 24
        : competition.includes('SC') || competition.includes('CWC') ? 26
        : 14;
      return competitionScore + tierScore;
    };

    const refWeek = Number.isFinite(weekOverride) ? weekOverride : (baseState.week ?? 1);
    const dailyDates = getWeekDailySnapshots(refWeek);
    const daySnap = dailyDates[Math.max(0, Math.min(6, dayIndex - 1))];
    const day = daySnap?.weekdayLabel ? `${daySnap.weekdayLabel.charAt(0).toUpperCase()}${daySnap.weekdayLabel.slice(1)}` : `Jour ${dayIndex}`;
    const phase = getPhase(refWeek);
    const daySeed = `${baseState.seasonDay ?? 0}-${refWeek}-${dayIndex}-${phase.phase}`;
    const timestampBase = `${refWeek}:${dayIndex}`;
    const add = (items, payload) => {
      items.push({
        day,
        dateLabel: daySnap?.dateLabel ?? '',
        seasonWeek: phase.seasonWeek,
        date: daySnap?.dateLabel ?? '',
        timestamp: `${timestampBase}:${String(items.length).padStart(2, '0')}`,
        ...payload,
      });
    };

    const items = [];

    if (weeklyReport && String(kind).includes('matchday')) {
      const matches = Array.isArray(weeklyReport.matchResults) ? weeklyReport.matchResults : [];
      const fixtures = Array.isArray(weeklyReport.fixtures) ? weeklyReport.fixtures : [];
      const euroMatches = Array.isArray(weeklyReport.euroMatchResults) ? weeklyReport.euroMatchResults : [];
      const worldCupMatches = Array.isArray(weeklyReport.worldCupMatchResults) ? weeklyReport.worldCupMatchResults : [];
      const intlSummary = weeklyReport.internationalBreakSummary ?? null;
      const topMatch = matches
        .filter((m) => Number.isFinite(m?.matchRating))
        .sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0))[0];
      const topEuroMatch = String(kind).includes('matchday')
        ? null
        : euroMatches
          .filter((m) => Number.isFinite(m?.matchRating))
          .sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0))[0];
      const topWorldCupMatch = worldCupMatches
        .filter((m) => Number.isFinite(m?.matchRating))
        .sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0))[0];
      const scored = matches.reduce((sum, m) => sum + Number(m?.goals ?? 0), 0);
      const assists = matches.reduce((sum, m) => sum + Number(m?.assists ?? 0), 0);
      const euroScored = euroMatches.reduce((sum, m) => sum + Number(m?.goals ?? 0), 0);
      const worldScored = worldCupMatches.reduce((sum, m) => sum + Number(m?.goals ?? 0), 0);

      if (topWorldCupMatch) {
        add(items, {
          id: `daily_wc_match_${timestampBase}`,
          kind: 'worldCupMatch',
          tone: topWorldCupMatch.isChampion ? 'good' : topWorldCupMatch.isEliminated ? 'danger' : 'warn',
          icon: '🌍',
          eventType: 'performance',
          type: 'world_cup',
          title: `Coupe du Monde · ${topWorldCupMatch.countryName ?? topWorldCupMatch.playerName}`,
          description: `${topWorldCupMatch.playerName ?? 'Joueur'} · ${topWorldCupMatch.score} vs ${topWorldCupMatch.opponent} · note ${topWorldCupMatch.matchRating}.`,
          text: `${topWorldCupMatch.playerName ?? 'Joueur'} · ${topWorldCupMatch.score} vs ${topWorldCupMatch.opponent} · note ${topWorldCupMatch.matchRating}.`,
          match: topWorldCupMatch,
          chips: [topWorldCupMatch.phase ?? 'CdM', worldScored > 0 ? `${worldScored} buts` : 'Sans but'],
        });
      }

      if (topEuroMatch) {
        const euroDayIndex = (hashText(`${topEuroMatch.competition ?? ''}:${topEuroMatch.opponent ?? ''}:${topEuroMatch.playerId ?? ''}`) % 2 === 0) ? 2 : 3;
        const euroSnap = dailyDates[euroDayIndex - 1];
        const euroDayLabel = euroSnap?.weekdayLabel
          ? `${euroSnap.weekdayLabel.charAt(0).toUpperCase()}${euroSnap.weekdayLabel.slice(1)}`
          : (euroDayIndex === 2 ? 'Mardi' : 'Mercredi');
        add(items, {
          id: `daily_euro_match_${refWeek}_${euroDayIndex}`,
          kind: 'euroResult',
          day: euroDayLabel,
          dateLabel: euroSnap?.dateLabel ?? '',
          date: euroSnap?.dateLabel ?? '',
          timestamp: `${refWeek}:${euroDayIndex}:${String(items.length).padStart(2, '0')}`,
          tone: topEuroMatch.result === 'win' ? 'good' : topEuroMatch.result === 'loss' ? 'danger' : 'warn',
          icon: '🏆',
          eventType: 'performance',
          type: 'europe',
          title: `Soirée européenne · ${topEuroMatch.competitionLabel ?? topEuroMatch.competition ?? 'Europe'}`,
          description: `${topEuroMatch.playerName ?? 'Joueur'} a disputé une soirée européenne très exposée face à ${topEuroMatch.opponent}. Score final ${topEuroMatch.score}, note ${topEuroMatch.matchRating}. Le staff estime que ce match pèsera sur la dynamique des prochains rendez-vous continentaux.`,
          text: `${topEuroMatch.playerName ?? 'Joueur'} a disputé une soirée européenne très exposée face à ${topEuroMatch.opponent}. Score final ${topEuroMatch.score}, note ${topEuroMatch.matchRating}. Le staff estime que ce match pèsera sur la dynamique des prochains rendez-vous continentaux.`,
          match: topEuroMatch,
          chips: [topEuroMatch.competitionLabel ?? 'Europe', euroScored > 0 ? `${euroScored} buts` : 'Sans but'],
        });
      }

      if (intlSummary?.count > 0) {
        add(items, {
          id: `daily_intl_${timestampBase}`,
          kind: 'international',
          tone: 'warn',
          icon: '🇫🇷',
          eventType: 'performance',
          type: 'international',
          title: `Sélections nationales · ${intlSummary.label ?? 'Trêve internationale'}`,
          description: `${intlSummary.count} joueur(s) de ton agence engagés cette semaine en sélection.`,
          text: `${intlSummary.count} joueur(s) de ton agence engagés cette semaine en sélection.`,
          chips: ['Convocations', 'Matchs internationaux'],
        });
      }

      add(items, {
        id: `daily_match_header_${timestampBase}`,
        kind: 'matchdayHeader',
        tone: 'warn',
        icon: '🏟️',
        eventType: 'performance',
        type: 'matchday_header',
        title: 'Week-end championnat',
        description: `${fixtures.length} rencontres de championnat dans ce bloc de week-end. Les soirées européennes sont suivies séparément en milieu de semaine (mardi/mercredi).`,
        text: `${fixtures.length} rencontres de championnat dans ce bloc de week-end. Les soirées européennes sont suivies séparément en milieu de semaine (mardi/mercredi).`,
        chips: [`${fixtures.length} matchs ligue`, `S${phase.season} · S${phase.seasonWeek}/38`],
      });
      if (topMatch) {
        add(items, {
          id: `daily_top_match_${topMatch.playerId ?? timestampBase}`,
          kind: 'match',
          tone: topMatch.result === 'win' ? 'good' : topMatch.result === 'loss' ? 'danger' : 'info',
          icon: '⚽',
          eventType: 'performance',
          type: 'match_result',
          title: `${topMatch.club} ${topMatch.score} ${topMatch.opponent}`,
          description: `${topMatch.playerName} note ${topMatch.matchRating}. ${topMatch.minutes} min, ${topMatch.goals} but, ${topMatch.assists} passe.`,
          text: `${topMatch.playerName} note ${topMatch.matchRating}. ${topMatch.minutes} min, ${topMatch.goals} but, ${topMatch.assists} passe.`,
          match: topMatch,
          chips: [topMatch.result === 'win' ? 'Victoire' : topMatch.result === 'loss' ? 'Défaite' : 'Nul', `${scored} buts agence`, `${assists} passes`],
        });
      }
      if ((weeklyReport.leavingPlayers?.length ?? 0) > 0) {
        add(items, {
          id: `daily_departures_${timestampBase}`,
          kind: 'club',
          tone: 'danger',
          icon: '🚪',
          eventType: 'transfer',
          type: 'departures',
          title: 'Mouvements de vestiaire',
          description: `${weeklyReport.leavingPlayers.length} départ(s) confirmé(s) aujourd'hui.`,
          text: `${weeklyReport.leavingPlayers.length} départ(s) confirmé(s) aujourd'hui.`,
          chips: ['Stabilité à surveiller'],
        });
      }
      return items;
    }

    const currentRoster = Array.isArray(baseState.roster) ? baseState.roster : [];
    const previousRoster = Array.isArray(prevState?.roster) ? prevState.roster : [];
    const injuredNow = currentRoster.filter((p) => (p.injured ?? 0) > 0);
    const recovered = currentRoster.filter((p) => (p.injured ?? 0) === 0 && previousRoster.some((old) => old.id === p.id && (old.injured ?? 0) > 0));
    const openOffers = (baseState.clubOffers ?? []).filter((offer) => offer.status === 'open').slice(0, 2);
    const pendingTransfers = (baseState.pendingTransfers ?? []).slice(0, 2);
    const calendarNextFixtures = getCalendarFixturesForWeek(baseState.matchCalendar ?? [], refWeek, {
      status: MATCH_STATUS.SCHEDULED,
      competition: 'LEAGUE',
    });
    const nextFixtures = calendarNextFixtures.length ? calendarNextFixtures : (baseState.nextFixtures ?? []);
    const latestNews = (baseState.news ?? [])
      .filter((news) => (news?.week ?? 0) >= Math.max(1, refWeek - 1))
      .filter((news) => String(news?.text ?? '').trim() !== OPENING_NEWS_TEXT || (refWeek === 1 && dayIndex === 1))
      .slice(0, 6);
    const midweekEuro = baseState?.midweekEuropean?.week === refWeek
      ? (baseState.midweekEuropean.results ?? [])
      : [];

    // Daily flavor event sourced from the passive events database.
    // This keeps day-to-day cards varied instead of repeating generic placeholders.
    const playableRoster = currentRoster.filter((player) => !player.freeAgent && player.club && player.club !== 'Libre');
    const focusPlayer = playableRoster.length
      ? pickFrom(playableRoster, `${daySeed}-player`, playableRoster[0])
      : pickFrom(currentRoster, `${daySeed}-fallback-player`, currentRoster[0] ?? null);
    if (focusPlayer && dayIndex >= 2 && dayIndex <= 5) {
      const buildProfilePulseEvents = (player) => {
        const name = `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || 'Le joueur';
        const rating = Number(player.rating ?? 0);
        const age = Number(player.age ?? 24);
        const crisis = (player.moral ?? 60) < 42 || (player.trust ?? 60) < 42 || (player.form ?? 60) < 45 || (player.injured ?? 0) > 0;
        const profileEvents = [];
        if (crisis) {
          profileEvents.push({
            id: `profile_crisis_${player.id}`,
            type: 'media',
            rarity: 'uncommon',
            good: false,
            label: `${name} traverse une zone fragile: moral, confiance et forme sont surveillés de près. Le staff demande un plan clair pour éviter que la situation ne se transforme en vrai dossier de crise.`,
          });
        }
        if (rating >= 165 || player.clubRole === 'Star') {
          profileEvents.push({
            id: `profile_star_${player.id}`,
            type: 'fans',
            rarity: 'rare',
            good: true,
            label: `${name} attire une attention de joueur majeur: médias, supporters et analystes attendent un signal fort. Chaque prise de parole et chaque performance peuvent maintenant peser sur la réputation de l'agence.`,
          });
        }
        if (age <= 21) {
          profileEvents.push({
            id: `profile_young_${player.id}`,
            type: 'performance',
            rarity: 'common',
            good: true,
            label: `${name} reste dans une phase de développement sensible: temps de jeu, entourage et pression médiatique doivent être dosés. Le club veut accélérer sa progression sans brûler les étapes.`,
          });
        }
        if (player.position === 'GK') {
          profileEvents.push({
            id: `profile_gk_${player.id}`,
            type: 'performance',
            rarity: 'common',
            good: true,
            label: `${name} a travaillé une séance spécifique gardien: relance courte, jeu aérien et lecture des frappes. Le staff juge que ces détails peuvent changer le prochain match serré.`,
          });
        } else if (player.position === 'ATT') {
          profileEvents.push({
            id: `profile_att_${player.id}`,
            type: 'performance',
            rarity: 'common',
            good: true,
            label: `${name} a terminé une séance axée finition: appels dans le dos, premier contrôle et présence dans la surface. Le staff veut convertir davantage de xG en vrais buts.`,
          });
        } else if (player.position === 'MIL') {
          profileEvents.push({
            id: `profile_mid_${player.id}`,
            type: 'performance',
            rarity: 'common',
            good: true,
            label: `${name} est au centre du plan de jeu: orientation sous pression, passes verticales et gestion du tempo. Le staff attend plus de passes clés dans les zones décisives.`,
          });
        } else if (player.position === 'DEF') {
          profileEvents.push({
            id: `profile_def_${player.id}`,
            type: 'performance',
            rarity: 'common',
            good: true,
            label: `${name} a eu un briefing défensif ciblé: duels, couverture et sorties de balle. L'objectif est de réduire les occasions concédées avant le prochain rendez-vous.`,
          });
        }
        return profileEvents;
      };
      const phaseLabelNoise = /finale|champions|money time|mvp|triplé|hat[-_ ]?trick|buteur/i;
      const profilePulseEvents = buildProfilePulseEvents(focusPlayer);
      const candidateEvents = (phase.seasonWeek <= 2
        ? [...profilePulseEvents, ...DAILY_OFFDAY_PULSE]
        : [...profilePulseEvents, ...PASSIVE_EVENTS]
          .filter((event) => !dailyCalendarLockedIds.has(event.id))
          .filter((event) => ['media', 'fans', 'transfer', 'performance'].includes(event.type))
          .filter((event) => !phaseLabelNoise.test(`${event.id} ${event.label}`)));
      if (candidateEvents.length > 0) {
        const recentIds = Array.isArray(prevState?.lastDailyPulseEventIds) ? prevState.lastDailyPulseEventIds : [];
        const preferred = pickFrom(candidateEvents, `${daySeed}-${focusPlayer.id}-event`, candidateEvents[0]);
        let dailyEvent = preferred;
        if (!dailyEvent || recentIds.includes(dailyEvent.id)) {
          const offset = Math.abs(hashText(`${daySeed}-${focusPlayer.id}-offset`)) % candidateEvents.length;
          dailyEvent = null;
          for (let i = 0; i < candidateEvents.length; i += 1) {
            const candidate = candidateEvents[(offset + i) % candidateEvents.length];
            if (!recentIds.includes(candidate.id)) {
              dailyEvent = candidate;
              break;
            }
          }
          if (!dailyEvent) dailyEvent = preferred ?? candidateEvents[0];
        }
        if (dailyEvent) {
          const descriptivePulseText = dailyEvent.label;
          add(items, {
            id: `daily_pulse_${focusPlayer.id}_${timestampBase}`,
            kind: 'dailyPulse',
            tone: dailyEvent.good ? 'good' : 'warn',
            icon: dailyEvent.good ? '✨' : '⚠️',
            eventType: dailyEvent.type ?? 'media',
            eventId: dailyEvent.id,
            type: 'daily_pulse',
            title: `${focusPlayer.firstName} ${focusPlayer.lastName}`,
            description: descriptivePulseText,
            text: descriptivePulseText,
            chips: [dailyEvent.rarity ?? 'common'],
            pulseEventId: dailyEvent.id,
          });
        }
      }
    }

    if (midweekEuro.length > 0 && (dayIndex === 2 || dayIndex === 3)) {
      const todayEuro = midweekEuro.filter((item) => (item.simulatedDay ?? getEuropeanSimDayIndex(refWeek, item.playerId)) === dayIndex);
      const topEuro = todayEuro
        .filter((m) => Number.isFinite(m?.matchRating))
        .sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0))[0] ?? todayEuro[0];
      if (topEuro) {
        add(items, {
          id: `daily_midweek_euro_${refWeek}_${dayIndex}_${topEuro.playerId ?? 'euro'}`,
          kind: 'euroResult',
          tone: topEuro.result === 'win' ? 'good' : topEuro.result === 'loss' ? 'danger' : 'warn',
          icon: '🏆',
          eventType: 'performance',
          type: 'europe',
          title: `Soirée européenne · ${topEuro.competitionLabel ?? topEuro.competition ?? 'Europe'}`,
          description: `${topEuro.playerName ?? 'Joueur'} · ${topEuro.score} contre ${topEuro.opponent} · note ${topEuro.matchRating}.`,
          text: `${topEuro.playerName ?? 'Joueur'} · ${topEuro.score} contre ${topEuro.opponent} · note ${topEuro.matchRating}.`,
          match: topEuro,
          chips: [topEuro.competitionLabel ?? 'Europe', topEuro.goals > 0 ? `${topEuro.goals} but${topEuro.goals > 1 ? 's' : ''}` : 'Sans but'],
        });
      }
    }

    if (nextFixtures.length > 0 && dayIndex >= 4 && dayIndex <= 6) {
      const sorted = [...nextFixtures]
        .sort((a, b) => getFixtureProfileScore(b) - getFixtureProfileScore(a));
      const shortlist = sorted.slice(0, Math.min(4, sorted.length));
      const fixture = pickFrom(shortlist, `${daySeed}-prematch-fixture`, shortlist[0]);
      const preMatchDescriptions = [
        'Le staff affine le plan de match avec une séance vidéo complète, un travail spécifique sur les transitions et un cadrage clair des rôles pour les trente premières minutes.',
        "Séance tactique à huis clos: intensité maximale, répétitions sur coups de pied arrêtés et scénarios de gestion de score si l'équipe mène ou court après le résultat.",
        "Brief collectif étendu: plan de pressing, circuits de relance et ajustements de bloc selon l'adversaire. Le vestiaire a reçu une feuille de route précise.",
        "Derniers arbitrages sur le onze probable: le coach insiste sur la discipline sans ballon, la qualité de la première relance et la maîtrise émotionnelle dans les temps faibles.",
      ];
      const preMatchText = pickFrom(preMatchDescriptions, `${daySeed}-prematch`, preMatchDescriptions[0]);
      const fixtureLabel = formatFixtureName(fixture);
      add(items, {
        id: `daily_prematch_${timestampBase}`,
        kind: 'matchday',
        tone: 'warn',
        icon: '🧩',
        eventType: 'fans',
        type: 'pre_match',
        title: `Avant-match phare · ${fixtureLabel}`,
        description: `${fixture.competitionLabel ?? fixture.competition ?? 'Championnat'} · ${preMatchText}`,
        text: `${fixture.competitionLabel ?? fixture.competition ?? 'Championnat'} · ${preMatchText} Les analystes classent cette affiche parmi les plus surveillées du week-end.`,
        chips: ['Top rencontre', 'Compo probable', 'Tension matchday'],
      });
    }

    if (injuredNow.length > 0) {
      const p = injuredNow[0];
      add(items, {
        id: `daily_injury_${p.id}_${timestampBase}`,
        kind: 'injury',
        tone: 'danger',
        icon: '🩺',
        eventType: 'performance',
        type: 'injury',
        title: `${p.firstName} ${p.lastName} sous suivi médical`,
        description: `Blessure en cours (${p.injured} jour(s) restants estimés). Rotation ajustée.`,
        text: `Blessure en cours (${p.injured} jour(s) restants estimés). Rotation ajustée.`,
        chips: ['Gestion fatigue'],
      });
    } else if (recovered.length > 0) {
      const p = recovered[0];
      add(items, {
        id: `daily_recovery_${p.id}_${timestampBase}`,
        kind: 'recovery',
        tone: 'good',
        icon: '✅',
        eventType: 'performance',
        type: 'recovery',
        title: `${p.firstName} ${p.lastName} de retour`,
        description: 'Feu vert médical obtenu. Réintégration progressive en séance.',
        text: 'Feu vert médical obtenu. Réintégration progressive en séance.',
        chips: ['Retour groupe'],
      });
    }

    if (openOffers.length > 0) {
      const offer = openOffers[0];
      add(items, {
        id: `daily_offer_${offer.id}_${timestampBase}`,
        kind: 'transfer',
        tone: 'info',
        icon: '📄',
        eventType: 'transfer',
        type: 'offer',
        title: `Offre active · ${offer.club ?? 'Club'}`,
        description: `${offer.playerName ?? 'Un joueur'} reste au centre des négociations.`,
        text: `${offer.playerName ?? 'Un joueur'} reste au centre des négociations.`,
        chips: ['Négociation en cours'],
      });
    } else if (pendingTransfers.length > 0) {
      const transfer = pendingTransfers[0];
      add(items, {
        id: `daily_pending_transfer_${transfer.offerId ?? transfer.playerId}_${timestampBase}`,
        kind: 'transfer',
        tone: 'warn',
        icon: '⏳',
        eventType: 'transfer',
        type: 'pending_transfer',
        title: `Dossier transfert en attente`,
        description: `${transfer.playerName ?? 'Un joueur'} attend la validation finale du club.`,
        text: `${transfer.playerName ?? 'Un joueur'} attend la validation finale du club.`,
        chips: ['Validation en attente'],
      });
    }

    if (deliveredMessages > 0 || queueSize > 0) {
      add(items, {
        id: `daily_msg_${timestampBase}`,
        kind: 'messages',
        tone: deliveredMessages > 0 ? 'good' : 'info',
        icon: '💬',
        eventType: 'media',
        type: 'messages',
        title: 'Échanges joueurs',
        description: deliveredMessages > 0
          ? `${deliveredMessages} nouveau message traité aujourd'hui.`
          : 'Pas de nouveau message, mais la file de discussion reste active.',
        text: deliveredMessages > 0
          ? `${deliveredMessages} nouveau message traité aujourd'hui.`
          : 'Pas de nouveau message, mais la file de discussion reste active.',
        chips: [`File ${queueSize}`],
      });
    }

    if (latestNews.length > 0) {
      const news = pickFrom(latestNews, `${daySeed}-news`, latestNews[0]);
      add(items, {
        id: `daily_news_${timestampBase}`,
        kind: 'news',
        tone: 'info',
        icon: '📰',
        eventType: news.type ?? 'media',
        type: 'news',
        title: news.title ?? 'Actualité du jour',
        description: news.text ?? 'Le contexte global évolue autour de tes dossiers.',
        text: news.text ?? 'Le contexte global évolue autour de tes dossiers.',
        chips: [news.account?.name ?? 'Presse'],
      });
    }

    if (!items.length) {
      const trainingDescriptions = [
        'Séance orientée récupération active et mobilité après les charges récentes.',
        'Travail spécifique finition + déplacements offensifs pour booster la production.',
        'Atelier défensif et coordination bloc-équipe avec beaucoup de répétitions.',
        'Session mixte technique/physique, le staff insiste sur l’intensité des duels.',
      ];
      const trainingText = pickFrom(trainingDescriptions, `${daySeed}-training`, trainingDescriptions[0]);
      add(items, {
        id: `daily_training_${timestampBase}`,
        kind: 'training',
        tone: 'info',
        icon: '🏋️',
        eventType: 'performance',
        type: 'training',
        title: "Journée d'entraînement",
        description: trainingText,
        text: trainingText,
        chips: [`S${phase.season} · S${phase.seasonWeek}/38`],
      });
    }

    return items;
  };

  const currentDay = Number(state?.day ?? 1);
  const safeDay = Math.max(1, Math.min(7, currentDay));
  if (safeDay < 6) {
    const nextDay = safeDay + 1;
    const sourceState = simulateMidweekEuropeanMatches(state, nextDay);
    const queue = Array.isArray(sourceState.messageQueue) ? sourceState.messageQueue : [];
    const existingMessages = Array.isArray(sourceState.messages) ? sourceState.messages : [];
    const deliveredToday = queue.length > 0 ? [normalizeMessageRecord(queue[0])] : [];
    const remainingQueue = queue.length > 0 ? queue.slice(1) : queue;
    const refreshedRoster = (sourceState.roster ?? []).map((player) => {
      const injured = Number(player.injured ?? 0);
      const nextInjury = injured > 0 ? Math.max(0, injured - (safeDay % 2 === 0 ? 1 : 0)) : 0;
      return {
        ...player,
        injured: nextInjury,
        injuryStatus: nextInjury > 0 ? 'active' : (injured > 0 ? 'recovered' : player.injuryStatus ?? null),
        fatigue: clamp((player.fatigue ?? 20) - 3, 0, 100),
        form: clamp((player.form ?? 60) + ((player.fatigue ?? 20) < 35 ? 1 : 0), 40, 99),
      };
    });
    const nextState = {
      ...sourceState,
      day: nextDay,
      seasonDay: (sourceState?.seasonDay ?? (((sourceState?.week ?? 1) - 1) * 7 + safeDay)) + 1,
      roster: refreshedRoster,
      messages: compactOpenResponseMessages([...deliveredToday, ...existingMessages]).slice(0, 40),
      messageQueue: remainingQueue,
    };
    const timeline = buildDailyTimeline({
      baseState: nextState,
      prevState: state,
      dayIndex: nextDay,
      deliveredMessages: deliveredToday.length,
      queueSize: remainingQueue.length,
      kind: 'daily',
    });
    const lastPulse = timeline.find((item) => item.kind === 'dailyPulse')?.pulseEventId ?? null;
    if (lastPulse) {
      nextState.lastDailyPulseEventId = lastPulse;
      const previous = Array.isArray(state.lastDailyPulseEventIds) ? state.lastDailyPulseEventIds : [];
      nextState.lastDailyPulseEventIds = [lastPulse, ...previous.filter((id) => id !== lastPulse)].slice(0, DAILY_PULSE_HISTORY_LIMIT);
    }
    return {
      state: nextState,
      report: {
        kind: 'daily',
        week: state.week,
        day: nextDay,
        phase: getPhase(state.week),
        income: 0,
        salaries: 0,
        staffCost: 0,
        net: 0,
        repChange: 0,
        events: [],
        leavingPlayers: [],
        bonusMoney: 0,
        newMessagesCount: deliveredToday.length,
        messageQueueCount: remainingQueue.length,
        matchResults: [],
        euroMatchResults: [],
        worldCupMatchResults: [],
        matchCalendar: nextState.matchCalendar ?? [],
        matchResultStore: nextState.matchResultStore ?? [],
        fixtures: [],
        clubOffers: [],
        worldSummary: [],
        weekTimeline: [],
        dailyTimeline: timeline,
        currentDayEvents: timeline,
        isDailyStep: true,
      },
    };
  }

  if (safeDay === 6) {
    const weekly = playWeek(state);
    if (weekly?.state) {
      weekly.state = {
        ...weekly.state,
        day: 7,
        seasonDay: (state?.seasonDay ?? (((state?.week ?? 1) - 1) * 7 + safeDay)) + 1,
      };
    }
    if (weekly?.report) {
      weekly.report = {
        ...weekly.report,
        kind: 'weekly_matchday',
        day: 6,
        dailyTimeline: buildDailyTimeline({
          baseState: weekly.state ?? state,
          prevState: state,
          dayIndex: 6,
          deliveredMessages: weekly.report.newMessagesCount ?? 0,
          queueSize: weekly.report.messageQueueCount ?? 0,
          kind: 'matchday',
          weeklyReport: weekly.report,
          weekOverride: state.week,
        }),
        currentDayEvents: buildDailyTimeline({
          baseState: weekly.state ?? state,
          prevState: state,
          dayIndex: 6,
          deliveredMessages: weekly.report.newMessagesCount ?? 0,
          queueSize: weekly.report.messageQueueCount ?? 0,
          kind: 'matchday',
          weeklyReport: weekly.report,
          weekOverride: state.week,
        }),
      };
    }
    return weekly;
  }

  const nextState = {
    ...state,
    day: 1,
    seasonDay: (state?.seasonDay ?? (((state?.week ?? 1) - 1) * 7 + safeDay)) + 1,
  };
  return {
    state: nextState,
    report: {
      kind: 'daily_reset',
      week: state.week,
      day: 1,
      phase: getPhase(state.week),
      income: 0,
      salaries: 0,
      staffCost: 0,
      net: 0,
      repChange: 0,
      events: [],
      leavingPlayers: [],
      bonusMoney: 0,
      newMessagesCount: 0,
      messageQueueCount: state.messageQueue?.length ?? 0,
      matchResults: [],
      euroMatchResults: [],
      worldCupMatchResults: [],
      matchCalendar: nextState.matchCalendar ?? [],
      matchResultStore: nextState.matchResultStore ?? [],
      fixtures: [],
      clubOffers: [],
      worldSummary: [],
      weekTimeline: [],
      dailyTimeline: buildDailyTimeline({
        baseState: nextState,
        prevState: state,
        dayIndex: 1,
        deliveredMessages: 0,
        queueSize: state.messageQueue?.length ?? 0,
        kind: 'reset',
      }),
      currentDayEvents: buildDailyTimeline({
        baseState: nextState,
        prevState: state,
        dayIndex: 1,
        deliveredMessages: 0,
        queueSize: state.messageQueue?.length ?? 0,
        kind: 'reset',
      }),
      isDailyStep: true,
    },
  };
};

export const applyChoice = (state, event, player, choice) => {
  if (choice.cost && state.money < choice.cost) return { state, error: 'Fonds insuffisants' };

  const effects = choice.effects ?? {};
  let nextState = {
    ...state,
    money: state.money - (choice.cost ?? 0) + (effects.money ?? 0),
    reputation: applyReputationChange(state.reputation, scaleReputationDelta(effects.rep ?? 0)),
    segmentReputation: applySegmentReputationChange(state.segmentReputation, { media: scaleReputationDelta(effects.rep ?? 0) }),
  };

  nextState.roster = nextState.roster.map((rosterPlayer) => {
    if (rosterPlayer.id !== player.id) return rosterPlayer;

    return {
      ...rosterPlayer,
      moral: effects.moral ? clamp(rosterPlayer.moral + effects.moral) : rosterPlayer.moral,
      trust: effects.trust ? clamp((rosterPlayer.trust ?? 50) + effects.trust) : rosterPlayer.trust ?? 50,
      pressure: effects.pressure ? clamp((rosterPlayer.pressure ?? 30) + effects.pressure) : rosterPlayer.pressure ?? 30,
      value: effects.val ? Math.floor(rosterPlayer.value * effects.val) : rosterPlayer.value,
      commission: effects.commission ? Math.max(0.05, rosterPlayer.commission + effects.commission) : rosterPlayer.commission,
      injured: effects.injury ? effects.injury : rosterPlayer.injured,
      // Track that the contract event was triggered so it doesn't re-fire immediately
      lastContractEventWeek: (choice.flag === 'extend' || choice.flag === 'transfer_offer') && event.id === 'contract_exp'
        ? state.week
        : rosterPlayer.lastContractEventWeek,
    };
  });

  if (choice.releasePlayer) {
    nextState = { ...nextState, roster: nextState.roster.filter((rosterPlayer) => rosterPlayer.id !== player.id) };
  }

  if (effects.repCheck) {
    if (normalizeAgencyReputation(nextState.reputation) >= effects.repCheck) {
      nextState = {
        ...nextState,
        money: nextState.money + 5000,
        reputation: applyReputationChange(nextState.reputation, scaleReputationDelta(3)),
      };
    } else {
      nextState = { ...nextState, reputation: applyReputationChange(nextState.reputation, -3) };
    }
  }

  const updatedPlayer = nextState.roster.find((rosterPlayer) => rosterPlayer.id === player.id) ?? player;
  const news = createManualNewsPost({
    type: event.types?.[0] === 'scandal' ? 'scandale' : event.types?.[0] ?? 'media',
    player: updatedPlayer,
    week: state.week,
    text: `${updatedPlayer.firstName} ${updatedPlayer.lastName} réagit après la décision: ${choice.label}.`,
    reputationImpact: scaleReputationDelta(effects.rep ?? 0),
  });

  nextState = { ...nextState, news: [news, ...nextState.news].slice(0, 60) };

  if (choice.flag === 'add_young_prospect') {
    const scoutLevel = getStaffEffect(nextState.staff, 'scoutAfrica') + nextState.office.scoutLevel;
    const prospectBase = drawProspects({
      reputation: nextState.reputation,
      scoutLevel,
      season: Math.floor(((nextState.week ?? 1) - 1) / 38) + 1,
      existingIds: [
        ...(nextState.roster ?? []).map((p) => p.id),
        ...(nextState.market ?? []).map((p) => p.id),
        ...(nextState.freeAgents ?? []).map((p) => p.id),
      ],
      count: 1,
      agencyCountryCode: getAgencyCountryCode(nextState),
    })[0] ?? null;
    if (!prospectBase) {
      return { state: nextState, followUp: choice.flag, followUpData: null };
    }
    const prospect = {
      ...prospectBase,
      careerGoal: createCareerGoal(prospectBase),
      scoutReport: scoutLevel > 0 ? createScoutReport(prospectBase, scoutLevel) : null,
      agentContract: createAgentContract(prospectBase),
      timeline: [{ week: state.week, type: 'scout', label: 'Repéré par le réseau scouting' }],
    };
    if (nextState.roster.length < getAgencyCapacity(nextState.agencyLevel)) {
      const roster = [...nextState.roster, prospect];
      const scheduled = scheduleLeagueMatches(nextState, roster, state.week);
      nextState = { ...nextState, roster, nextFixtures: scheduled.fixtures, matchCalendar: scheduled.calendar };
    }
  }

  if (choice.flag === 'transfer_offer') {
    const transferResult = createChoiceTransferOffer(nextState, updatedPlayer, event, choice);
    if (!transferResult.error) {
      nextState = transferResult.state;
    }
    return { state: nextState, followUp: choice.flag, followUpData: transferResult.offer ? { offer: transferResult.offer } : null };
  }

  return { state: nextState, followUp: choice.flag };
};

export const finishNegotiation = (state, type, player, outcome) => {
  let nextState = { ...state };
  const cooldownWeeks = type === 'transfer' ? 4 : 3;

  if (type === 'transfer' && outcome.success) {
    const maxSigningBonus = Math.max(3000, Math.floor((player.weeklySalary ?? 10000) * 30));
    const maxReleaseClause = Math.max(50000, Math.floor((player.value ?? 1000000) * 4.5));
    const minReleaseClause = Math.max(50000, Math.floor((player.value ?? 1000000) * 0.8));
    const maxClubBonus = Math.max(5000, Math.floor((player.weeklySalary ?? 10000) * 24));
    const signingBonus = clamp(outcome.signingBonus ?? Math.floor(player.weeklySalary * 8), 3000, maxSigningBonus);
    const contractWeeks = clamp(outcome.contractWeeks ?? 150, 52, 260);
    const clubRole = outcome.role ?? (player.rating >= 164 ? 'Titulaire' : 'Rotation');
    const clubBonusesTotal = clamp(outcome.clubBonuses?.total ?? Math.floor(player.weeklySalary * 8), 5000, maxClubBonus);
    const clubBonuses = {
      total: clubBonusesTotal,
      goals: Math.floor(clubBonusesTotal * 0.35),
      appearances: Math.floor(clubBonusesTotal * 0.35),
      europe: Math.floor(clubBonusesTotal * 0.3),
    };
    const contractClausesBase = outcome.contractClauses ?? {
      ballonDorBonus: Math.floor(player.weeklySalary * 16),
      noCutClause: player.age <= 25,
      coachRoleProtection: true,
      rolePromise: clubRole,
    };
    const contractClauses = {
      ...contractClausesBase,
      ballonDorBonus: clamp(contractClausesBase.ballonDorBonus ?? 0, 0, maxClubBonus),
      noCutClause: Boolean(contractClausesBase.noCutClause),
      coachRoleProtection: Boolean(contractClausesBase.coachRoleProtection),
      rolePromise: contractClausesBase.rolePromise ?? clubRole,
    };
    const commission = Math.floor(clamp(outcome.price ?? Math.floor(player.value * 0.7), 1000, Math.max(1000, Math.floor(Math.max(player.value ?? 0, outcome.price ?? 0) * 4))) * 0.08 + signingBonus * 0.05 + (clubBonuses.total ?? 0) * 0.02);
    const nextRoster = nextState.roster.map((rosterPlayer) =>
      rosterPlayer.id !== player.id
        ? rosterPlayer
        : {
            ...rosterPlayer,
            club: outcome.club,
            clubTier: outcome.clubTier,
            clubCountry: outcome.clubCountry,
            clubCountryCode: outcome.clubCountryCode ?? rosterPlayer.clubCountryCode,
            clubCity: outcome.clubCity ?? rosterPlayer.clubCity,
            value: Math.floor(rosterPlayer.value * 1.1),
            weeklySalary: Math.floor(rosterPlayer.weeklySalary * outcome.salMult),
            moral: clamp(rosterPlayer.moral + 15),
            trust: clamp((rosterPlayer.trust ?? 50) + 8),
            careerStatus: 'transféré',
            contractWeeksLeft: contractWeeks,
            clubRole,
            releaseClause: clamp(outcome.releaseClause ?? Math.floor(rosterPlayer.value * 1.8), minReleaseClause, maxReleaseClause),
            sellOnPercent: clamp(outcome.sellOnPercent ?? 5, 0, 20),
            clubBonuses,
            contractClauses,
            freeAgent: false,
            timeline: [
              { week: state.week, type: 'transfer', label: `${outcome.club} · ${clubRole} · contrat ${Math.round(contractWeeks / 52)} ans` },
              ...(rosterPlayer.timeline ?? []),
            ],
          },
    );
    const scheduled = scheduleLeagueMatches(nextState, nextRoster, state.week);
    nextState = {
      ...nextState,
      money: nextState.money + commission,
      reputation: applyReputationChange(nextState.reputation, scaleReputationDelta(8)),
      credibility: applyCredibilityChange(nextState.credibility, 2),
      leagueReputation: applyLeagueReputation(nextState.leagueReputation, outcome.clubCountryCode, 5),
      countryReputation: applyLeagueReputation(nextState.countryReputation, outcome.clubCountryCode, 3),
      playerSegmentReputation: applyPlayerSegmentReputation(nextState.playerSegmentReputation, getPlayerSegment(player), 4),
      clubRelations: applyClubRelation(nextState.clubRelations, outcome.club, 6),
      clubMemory: recordClubMemory(nextState.clubMemory, outcome.club ?? player.club, { trust: 2, week: state.week }),
      decisionHistory: addDecisionHistory(nextState.decisionHistory, {
        week: state.week,
        type: 'transfer',
        label: 'Transfert conclu',
        detail: `${player.firstName} ${player.lastName} signe à ${outcome.club} comme ${clubRole}.`,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
      }),
      segmentReputation: applySegmentReputationChange(nextState.segmentReputation, { business: 8, sportif: 4 }),
      promises: resolvePromisesForPlayer(nextState.promises, player.id, ['transfer_request']),
      stats: {
        ...nextState.stats,
        transfersDone: nextState.stats.transfersDone + 1,
        totalEarned: nextState.stats.totalEarned + commission,
      },
      roster: nextRoster,
      nextFixtures: scheduled.fixtures,
      matchCalendar: scheduled.calendar,
      negotiationCooldowns: {
        ...(nextState.negotiationCooldowns ?? {}),
        [player.id]: state.week + cooldownWeeks,
      },
      clubMemory: recordClubMemory(nextState.clubMemory, player.club, { trust: 2, week: state.week }),
    };
  } else if (type === 'extend' && outcome.success) {
    const maxSigningBonus = Math.max(3000, Math.floor((player.weeklySalary ?? 10000) * 30));
    const maxReleaseClause = Math.max(50000, Math.floor((player.value ?? 1000000) * 4.5));
    const minReleaseClause = Math.max(50000, Math.floor((player.value ?? 1000000) * 0.8));
    const maxClubBonus = Math.max(5000, Math.floor((player.weeklySalary ?? 10000) * 24));
    const clubRole = outcome.role ?? player.clubRole ?? (player.rating >= 164 ? 'Titulaire' : 'Rotation');
    const signingBonus = clamp(outcome.signingBonus ?? Math.floor(player.weeklySalary * 10), 3000, maxSigningBonus);
    const clubBonusesTotal = clamp(outcome.clubBonuses?.total ?? Math.floor(player.weeklySalary * 8), 5000, maxClubBonus);
    const clubBonuses = {
      total: clubBonusesTotal,
      goals: Math.floor(clubBonusesTotal * 0.35),
      appearances: Math.floor(clubBonusesTotal * 0.35),
      europe: Math.floor(clubBonusesTotal * 0.3),
    };
    const contractClausesBase = outcome.contractClauses ?? {
      ballonDorBonus: Math.floor(player.weeklySalary * 16),
      noCutClause: player.age <= 25,
      coachRoleProtection: true,
      rolePromise: clubRole,
    };
    const contractClauses = {
      ...contractClausesBase,
      ballonDorBonus: clamp(contractClausesBase.ballonDorBonus ?? 0, 0, maxClubBonus),
      noCutClause: Boolean(contractClausesBase.noCutClause),
      coachRoleProtection: Boolean(contractClausesBase.coachRoleProtection),
      rolePromise: contractClausesBase.rolePromise ?? clubRole,
    };
    const bonus = Math.floor(signingBonus * 0.035 + (clubBonuses.total ?? 0) * 0.01 + player.value * 0.001);
    const contractWeeks = clamp(outcome.contractWeeks ?? 104, 52, 260);
    nextState = {
      ...nextState,
      money: nextState.money + bonus,
      reputation: applyReputationChange(nextState.reputation, scaleReputationDelta(3)),
      credibility: applyCredibilityChange(nextState.credibility, 1),
      playerSegmentReputation: applyPlayerSegmentReputation(nextState.playerSegmentReputation, getPlayerSegment(player), 2),
      segmentReputation: applySegmentReputationChange(nextState.segmentReputation, { business: 3 }),
      decisionHistory: addDecisionHistory(nextState.decisionHistory, {
        week: state.week,
        type: 'contrat',
        label: 'Prolongation négociée',
        detail: `${player.firstName} ${player.lastName} prolonge avec un rôle ${clubRole}.`,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
      }),
      promises: resolvePromisesForPlayer(nextState.promises, player.id, ['raise_request']),
      roster: nextState.roster.map((rosterPlayer) =>
        rosterPlayer.id !== player.id
          ? rosterPlayer
          : {
              ...rosterPlayer,
              weeklySalary: Math.floor(rosterPlayer.weeklySalary * outcome.salMult),
              moral: clamp(rosterPlayer.moral + 10),
              trust: clamp((rosterPlayer.trust ?? 50) + 6),
              careerStatus: 'prolongé',
              contractWeeksLeft: contractWeeks,
              contractStartWeek: state.week,
              signingBonus,
              clubRole,
              releaseClause: clamp(outcome.releaseClause ?? rosterPlayer.releaseClause ?? Math.floor(rosterPlayer.value * 1.7), minReleaseClause, maxReleaseClause),
              sellOnPercent: clamp(outcome.sellOnPercent ?? rosterPlayer.sellOnPercent ?? 5, 0, 20),
              clubBonuses,
              contractClauses,
              lastContractEventWeek: state.week,
              agentContract: {
                ...(rosterPlayer.agentContract ?? createAgentContract(rosterPlayer)),
                weeksLeft: contractWeeks,
                commission: rosterPlayer.commission,
              },
              timeline: [
                { week: state.week, type: 'contrat', label: `Prolongation ${Math.round(contractWeeks / 52)} ans · rôle ${clubRole}` },
                ...(rosterPlayer.timeline ?? []),
              ],
            },
          ),
      negotiationCooldowns: {
        ...(nextState.negotiationCooldowns ?? {}),
        [player.id]: state.week + cooldownWeeks,
      },
      clubMemory: recordClubMemory(nextState.clubMemory, player.club, { trust: 2, week: state.week }),
    };
  } else {
    nextState = {
      ...nextState,
      reputation: applyReputationChange(nextState.reputation, -4),
      credibility: applyCredibilityChange(nextState.credibility, -2),
      segmentReputation: applySegmentReputationChange(nextState.segmentReputation, { business: -3, media: -1 }),
      decisionHistory: addDecisionHistory(nextState.decisionHistory, {
        week: state.week,
        type: 'negociation',
        label: 'Négociation échouée',
        detail: `${player.firstName} ${player.lastName} sort frustré du dossier.`,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
      }),
      roster: nextState.roster.map((rosterPlayer) =>
        rosterPlayer.id === player.id
          ? { ...rosterPlayer, trust: clamp((rosterPlayer.trust ?? 50) - 8), moral: clamp(rosterPlayer.moral - 4) }
          : rosterPlayer,
      ),
      negotiationCooldowns: {
        ...(nextState.negotiationCooldowns ?? {}),
        [player.id]: state.week + cooldownWeeks,
      },
      clubMemory: recordClubMemory(nextState.clubMemory, player.club, { blocks: 1, trust: -3, week: state.week }),
    };
  }

  return nextState;
};

// ── Contacts ───────────────────────────────────────────────────────────────
export { callContact } from '../systems/contactsSystem';
