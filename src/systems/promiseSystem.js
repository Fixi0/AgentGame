import { makeId } from '../utils/helpers';

const PROMISE_DURATIONS = {
  transfer_request: 8,
  raise_request: 6,
  complaint: 4,
  staff_dialogue: 4,
  coach_dialogue: 4,
  ds_dialogue: 4,
};

const PROMISE_LABELS = {
  transfer_request: 'Trouver une porte de sortie',
  raise_request: 'Renégocier sa situation',
  complaint: 'Stabiliser la relation',
  staff_dialogue: 'Temps de jeu promis',
  coach_dialogue: 'Temps de jeu promis',
  ds_dialogue: 'Projet club clarifié',
};

export const createPromiseFromMessage = ({ message, week, responseType }) => {
  if (!['professionnel', 'empathique'].includes(responseType)) return null;
  if (!PROMISE_DURATIONS[message.type]) return null;

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
    if (['staff_dialogue', 'coach_dialogue', 'ds_dialogue'].includes(promise.type) && player) {
      const recentMinutes = (player.matchHistory ?? []).slice(0, 3).reduce((sum, match) => sum + (match.minutes ?? 0), 0);
      const recentAppearances = (player.matchHistory ?? []).slice(0, 3).length || 1;
      const averageMinutes = recentMinutes / recentAppearances;
      const roleIsHonored = averageMinutes >= 55 || (player.clubRole ?? '').toLowerCase().includes('star');
      if (roleIsHonored && isHealthyRelationship) {
        return { ...promise, resolved: true };
      }
    }

    failedPromises.push(promise);
    return { ...promise, failed: true };
  });

  return { promises: nextPromises, failedPromises };
};
