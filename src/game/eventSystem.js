import { CHAINED_EVENTS, INTERACTIVE_EVENTS, LOCKER_ROOM_EVENTS, PASSIVE_EVENTS } from '../data/events';
import { PERSONALITY_PROFILES } from '../data/players';
import { clamp, makeId, pick } from '../utils/helpers';
import { getWorldStateEventModifier } from '../systems/worldStateSystem';

const MATCH_LINKED_EVENTS = new Set([
  'hat_trick', 'mvp', 'brace', 'assist', 'benched', 'bad_form', 'penalty_miss', 'fatigue',
  'hat_trick_cl', 'own_goal', 'comeback_hero', 'top_scorer_race',
]);

const CALENDAR_LOCKED_EVENTS = new Set([
  'ballon_dor_shortlist',
  'ballon_dor_winner',
]);

const isEventCompatibleWithMatch = (event, matchResult) => {
  if (!MATCH_LINKED_EVENTS.has(event.id)) return true;
  if (!matchResult) return false;
  if (!matchResult.minutes) return event.id === 'benched';

  if (event.id === 'hat_trick') return matchResult.goals >= 3 && matchResult.matchRating >= 8.6;
  if (event.id === 'hat_trick_cl') return matchResult.goals >= 3 && matchResult.matchRating >= 8.6;
  if (event.id === 'mvp') return matchResult.matchRating >= 8 && matchResult.result !== 'loss';
  if (event.id === 'brace') return matchResult.goals >= 2 && matchResult.matchRating >= 7.4;
  if (event.id === 'assist') return matchResult.assists >= 1 && matchResult.matchRating >= 7;
  if (event.id === 'benched') return matchResult.minutes < 35;
  if (event.id === 'bad_form') return matchResult.matchRating <= 5.8;
  if (event.id === 'penalty_miss') return matchResult.matchRating <= 6 && matchResult.goals === 0;
  if (event.id === 'fatigue') return matchResult.minutes >= 84;
  if (event.id === 'own_goal') return matchResult.matchRating <= 5.5 && matchResult.result === 'loss';
  if (event.id === 'comeback_hero') return (matchResult.goals >= 1 || matchResult.assists >= 1) && matchResult.matchRating >= 7.5 && matchResult.result === 'win';
  if (event.id === 'top_scorer_race') return matchResult.goals >= 1 && matchResult.matchRating >= 7;

  return true;
};

const getRarityMultiplier = (rarity) => {
  if (rarity === 'legendary') return 0.02;
  if (rarity === 'epic') return 0.12;
  if (rarity === 'rare') return 0.5;
  if (rarity === 'uncommon') return 0.75;
  return 1;
};

const getEventChance = (event, player, worldState) => {
  const profile = PERSONALITY_PROFILES[player.personality];
  const personalityMultiplier = profile?.eventBias?.[event.type] ?? 1;
  const moralMultiplier = player.moral < 35 && !event.good ? 1.35 : player.moral > 75 && event.good ? 1.15 : 1;
  const ageMultiplier = player.age < 22 && event.type === 'scandal' ? 1.15 : 1;
  const injuryMultiplier = player.injured > 0 && event.good ? 0.35 : 1;
  const fatigueMultiplier = (player.fatigue ?? 20) > 75 && !event.good ? 1.25 : 1;
  const rarityMult = getRarityMultiplier(event.rarity);
  const worldStateMult = getWorldStateEventModifier(worldState, event);

  return event.chance * personalityMultiplier * moralMultiplier * ageMultiplier * injuryMultiplier * fatigueMultiplier * rarityMult * worldStateMult;
};

// Events that only make sense when the player has a club
const CLUB_REQUIRED_EVENT_TYPES = new Set(['performance', 'playing_time']);
const CLUB_REQUIRED_EVENT_IDS = new Set([
  'benched', 'hat_trick', 'mvp', 'brace', 'assist', 'penalty_miss', 'bad_form',
  'fatigue', 'own_goal', 'comeback_hero', 'top_scorer_race', 'hat_trick_cl',
  'callup', 'international_debut', 'red_card', 'yellow_spree', 'training_clash',
  'fine_club', 'fight', 'fan_dispute', 'rival_clash', 'public_meltdown',
  'president_call', 'manager_clash', 'benched_starter', 'top_scorer_race',
]);

const isFreeAgent = (player) => player.freeAgent || player.club === 'Libre' || !player.club;

export const rollPassiveEvent = (player, modifiers = {}) => {
  const freeAgent = isFreeAgent(player);
  for (const event of PASSIVE_EVENTS) {
    if (CALENDAR_LOCKED_EVENTS.has(event.id) && !modifiers.allowCalendarAwards) continue;
    if (!isEventCompatibleWithMatch(event, modifiers.matchResult)) continue;
    // Skip club-specific events for free agents — a player without a club can't be benched
    if (freeAgent && (CLUB_REQUIRED_EVENT_TYPES.has(event.type) || CLUB_REQUIRED_EVENT_IDS.has(event.id))) continue;

    const mediaProtection = event.type === 'scandal' ? 1 - (modifiers.scandalReduction ?? 0) : 1;
    const performanceBoost = event.good && event.type === 'performance' ? 1 + (modifiers.performanceBoost ?? 0) : 1;
    if (Math.random() < getEventChance(event, player, modifiers.worldState) * mediaProtection * performanceBoost) {
      return event;
    }
  }

  return null;
};

export const applyPassiveEventToPlayer = (player, event) => ({
  ...player,
  value: Math.max(100, Math.floor(player.value * event.val)),
  moral: clamp(player.moral + event.moral),
  trust: clamp((player.trust ?? 50) + (event.trust ?? 0)),
  injured: event.injury ? event.injury : player.injured,
  form: event.good ? clamp(player.form + 5, 40, 99) : clamp(player.form - 5, 40, 99),
});

export const chooseInteractiveEvent = (roster, context = {}) => {
  if (!roster.length) return null;

  const player = pick(roster);
  const availableEvents = [...INTERACTIVE_EVENTS, ...LOCKER_ROOM_EVENTS];
  const contextualEvents = availableEvents.filter((event) => {
    if (event.id === 'press_conference_week' && !context.pressConference) return false;
    if (event.id === 'prospect' && (context.scoutLevel ?? 0) <= 0) return false;
    if (event.id === 'retirement_decision' && player.age < 31) return false;
    if (event.id === 'youth_mentor' && player.age < 28) return false;
    if (event.types?.includes('vestiaire') && !(context.vestiaireTension ?? 0)) return false;
    if (!event.personalities?.length) return true;
    return event.personalities.includes(player.personality);
  });

  const pressConferenceEvent = contextualEvents.find((event) => event.id === 'press_conference_week');
  if (context.pressConference && pressConferenceEvent) {
    const target = context.topMatch?.playerId
      ? roster.find((item) => item.id === context.topMatch.playerId) ?? player
      : player;
    return { event: pressConferenceEvent, player: target };
  }

  const lockerRoomEvent = contextualEvents.find((event) => event.types?.includes('vestiaire'));
  if (lockerRoomEvent && (context.vestiaireTension ?? 0) >= 55 && Math.random() < 0.7) {
    return { event: lockerRoomEvent, player };
  }

  return { event: pick(contextualEvents), player };
};

export const getContractEventForRoster = (roster, currentWeek = 0) => {
  // Fire at ≤26 weeks (6 months). Cooldown: don't re-fire within 6 weeks of last trigger.
  const expiringPlayer = roster.find(
    (player) =>
      player.contractWeeksLeft > 0 &&
      player.contractWeeksLeft <= 26 &&
      (!player.lastContractEventWeek || currentWeek - player.lastContractEventWeek >= 6),
  );
  if (!expiringPlayer) return null;

  return {
    event: INTERACTIVE_EVENTS.find((event) => event.id === 'contract_exp'),
    player: expiringPlayer,
  };
};

export const generateChainedEvents = (player, triggerEvent, currentWeek) => {
  const chains = CHAINED_EVENTS[triggerEvent.id] ?? [];
  return chains
    .filter((chain) => Math.random() < chain.chance)
    .map((chain) => ({
      id: makeId('chain'),
      triggerWeek: currentWeek + chain.delayWeeks,
      type: chain.type,
      eventId: chain.eventId,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
    }));
};

export const processChainedPassiveEvents = (pendingChains, roster, currentWeek) => {
  const due = pendingChains.filter((c) => c.type === 'passive' && c.triggerWeek <= currentWeek);
  const results = [];

  for (const chain of due) {
    const player = roster.find((p) => p.id === chain.playerId);
    const event = PASSIVE_EVENTS.find((e) => e.id === chain.eventId);
    if (player && event) results.push({ player, event });
  }

  return results;
};

export const pickChainedInteractiveEvent = (pendingChains, roster, currentWeek) => {
  const due = pendingChains.filter((c) => c.type === 'interactive' && c.triggerWeek <= currentWeek);
  if (!due.length) return null;

  const chain = due[0];
  const player = roster.find((p) => p.id === chain.playerId);
  const event = INTERACTIVE_EVENTS.find((e) => e.id === chain.eventId);
  if (!player || !event) return null;

  return { event, player, chainId: chain.id };
};
