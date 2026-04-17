import { makeId } from '../utils/helpers';

const PROMISE_DURATIONS = {
  transfer_request: 8,
  raise_request: 6,
  complaint: 4,
};

const PROMISE_LABELS = {
  transfer_request: 'Trouver une porte de sortie',
  raise_request: 'Renégocier sa situation',
  complaint: 'Stabiliser la relation',
};

export const createPromiseFromMessage = ({ message, week, responseType }) => {
  if (!['professionnel', 'empathique'].includes(responseType)) return null;
  if (!PROMISE_DURATIONS[message.type]) return null;

  return {
    id: makeId('promise'),
    playerId: message.playerId,
    playerName: message.playerName,
    type: message.type,
    label: PROMISE_LABELS[message.type],
    createdWeek: week,
    dueWeek: week + PROMISE_DURATIONS[message.type],
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
    const isHealthyRelationship = player && player.moral >= 55 && (player.trust ?? 50) >= 55;
    if (promise.type === 'complaint' && isHealthyRelationship) {
      return { ...promise, resolved: true };
    }

    failedPromises.push(promise);
    return { ...promise, failed: true };
  });

  return { promises: nextPromises, failedPromises };
};
