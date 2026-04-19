import { makeId } from '../utils/helpers';

const PROMISE_DURATIONS = {
  transfer_request: 8,
  raise_request: 6,
  complaint: 5,
  staff_dialogue: 5,
  coach_dialogue: 5,
  ds_dialogue: 5,
};

const PROMISE_LABELS = {
  transfer_request: 'Trouver une porte de sortie',
  raise_request: 'Renégocier sa situation',
  complaint: 'Stabiliser la relation',
  staff_dialogue: 'Temps de jeu promis',
  coach_dialogue: 'Temps de jeu promis',
  ds_dialogue: 'Projet club clarifié',
};

const PROMISE_REPEAT_GAP = {
  transfer_request: 8,
  raise_request: 6,
  complaint: 5,
  staff_dialogue: 6,
  coach_dialogue: 6,
  ds_dialogue: 6,
};

const PROMISE_PRIORITY = {
  transfer_request: 4,
  raise_request: 3,
  staff_dialogue: 2,
  coach_dialogue: 2,
  ds_dialogue: 2,
  complaint: 1,
};

const ROLE_MINUTE_THRESHOLDS = {
  Star: 68,
  Titulaire: 50,
  Rotation: 24,
  'Projet jeune': 18,
  Indésirable: 8,
};

const getWeeksAtClub = (player, week) => {
  if (!player) return 0;
  return Math.max(0, week - (player.contractStartWeek ?? week));
};

const isDealContext = (context) =>
  ['deal_signed', 'deal_signed_player', 'predeal_signed', 'predeal_signed_player', 'predeal_activation'].includes(String(context ?? ''));

export const getRoleExpectationState = (player) => {
  if (!player) {
    return {
      promisedRole: 'Rotation',
      expectedMinutes: 24,
      averageMinutes: 0,
      appearances: 0,
      starts: 0,
      actualRole: 'banc',
      roleMismatch: false,
    };
  }

  const recentMatches = (player.matchHistory ?? []).slice(0, 3).filter((match) => Number.isFinite(match?.minutes));
  const appearances = recentMatches.filter((match) => (match.minutes ?? 0) > 0).length;
  const starts = recentMatches.filter((match) => (match.minutes ?? 0) >= 60).length;
  const totalMinutes = recentMatches.reduce((sum, match) => sum + (match.minutes ?? 0), 0);
  const averageMinutes = appearances ? totalMinutes / appearances : 0;
  const promisedRole = player.contractClauses?.rolePromise ?? player.clubRole ?? 'Rotation';
  const expectedMinutes = ROLE_MINUTE_THRESHOLDS[promisedRole] ?? 24;

  const actualRole = averageMinutes >= 68
    ? 'temps de jeu réel'
    : averageMinutes >= 40
      ? 'rotation active'
      : averageMinutes >= 15
        ? 'minutes limitées'
        : 'banc';

  const roleMismatch = appearances >= 2
    && (
      averageMinutes < expectedMinutes - 8
      || (promisedRole === 'Star' && starts === 0 && averageMinutes < 75)
      || (promisedRole === 'Titulaire' && starts === 0 && averageMinutes < 55)
      || (promisedRole === 'Rotation' && averageMinutes < 18)
    );

  return {
    promisedRole,
    expectedMinutes,
    averageMinutes,
    appearances,
    starts,
    actualRole,
    roleMismatch,
  };
};

export const normalizePromises = (promises = []) => {
  if (!Array.isArray(promises) || !promises.length) return promises ?? [];

  const sorted = [...promises].sort((a, b) => {
    const activeA = a.resolved || a.failed ? 0 : 1;
    const activeB = b.resolved || b.failed ? 0 : 1;
    if (activeA !== activeB) return activeB - activeA;
    const priorityDelta = (PROMISE_PRIORITY[b.type] ?? 0) - (PROMISE_PRIORITY[a.type] ?? 0);
    if (priorityDelta) return priorityDelta;
    const weekDelta = (b.createdWeek ?? 0) - (a.createdWeek ?? 0);
    if (weekDelta) return weekDelta;
    return String(b.id ?? '').localeCompare(String(a.id ?? ''));
  });

  const activeByPlayer = new Set();
  const normalized = [];

  for (const promise of sorted) {
    if (promise.resolved || promise.failed) {
      normalized.push(promise);
      continue;
    }

    if (activeByPlayer.has(promise.playerId)) continue;
    activeByPlayer.add(promise.playerId);
    normalized.push(promise);
  }

  return normalized.sort((a, b) => (a.createdWeek ?? 0) - (b.createdWeek ?? 0));
};

export const createPromiseFromMessage = ({ message, week, responseType, existingPromises = [], player = null }) => {
  if (!['professionnel', 'empathique'].includes(responseType)) return null;
  if (!PROMISE_DURATIONS[message.type]) return null;
  if (message.type === 'transfer_request') {
    const weeksAtClub = getWeeksAtClub(player, week);
    if (isDealContext(message.context) || weeksAtClub < 10) return null;
  }
  const normalizedPromises = normalizePromises(existingPromises ?? []);
  const repeatGap = PROMISE_REPEAT_GAP[message.type] ?? 6;
  if (normalizedPromises.some((promise) => {
    if (promise.playerId !== message.playerId) return false;
    if (!promise.resolved && !promise.failed) return true;
    const age = week - (promise.createdWeek ?? week);
    return age >= 0 && age < repeatGap;
  })) return null;

  if (['staff_dialogue', 'coach_dialogue', 'ds_dialogue'].includes(message.type) && message.context && !String(message.context).includes('coach') && !String(message.context).includes('playing') && !String(message.context).includes('ds')) {
    return null;
  }

  return {
    id: makeId('promise'),
    playerId: message.playerId,
    playerName: message.playerName,
    type: message.type,
    label: PROMISE_LABELS[message.type],
    createdWeek: week,
    dueWeek: week + PROMISE_DURATIONS[message.type],
    originThreadKey: message.threadKey ?? message.playerId,
    originContext: message.context,
    resolved: false,
    failed: false,
  };
};

export const resolvePromisesForPlayer = (promises = [], playerId, types = []) =>
  promises.map((promise) =>
    promise.playerId === playerId && !promise.resolved && !promise.failed && (!types.length || types.includes(promise.type))
      ? { ...promise, resolved: true }
      : promise,
  );

export const evaluatePromises = ({ promises = [], roster = [], week }) => {
  const failedPromises = [];
  const nextPromises = promises.map((promise) => {
    if (promise.resolved || promise.failed || promise.dueWeek > week) return promise;

    const player = roster.find((item) => item.id === promise.playerId);
    const weeksAtClub = getWeeksAtClub(player, week);
    const isHealthyRelationship = player && player.moral >= 55 && (player.trust ?? 50) >= 55;
    if (promise.type === 'transfer_request' && player && weeksAtClub < 10) {
      return { ...promise, resolved: true };
    }
    if (promise.type === 'complaint' && isHealthyRelationship) {
      return { ...promise, resolved: true };
    }
  if (['staff_dialogue', 'coach_dialogue', 'ds_dialogue'].includes(promise.type) && player) {
      const roleState = getRoleExpectationState(player);
      const roleIsHonored = !roleState.roleMismatch;
      if (roleIsHonored && isHealthyRelationship) {
        return { ...promise, resolved: true };
      }
      if (roleState.appearances < 2) {
        return promise;
      }
    }

    failedPromises.push(promise);
    return { ...promise, failed: true };
  });

  return { promises: nextPromises, failedPromises };
};
