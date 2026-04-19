import { clamp } from '../utils/helpers';

export const AGENCY_REPUTATION_MAX = 1000;

export const createDefaultSegmentReputation = () => ({
  sportif: 15,
  business: 15,
  media: 15,
  ethique: 15,
});

export const normalizeAgencyReputation = (reputation = 0) => Math.floor((reputation ?? 0) / 10);

export const applyReputationChange = (reputation, delta) => clamp(reputation + delta, 0, AGENCY_REPUTATION_MAX);

export const applySegmentReputationChange = (segments = createDefaultSegmentReputation(), deltas = {}) =>
  Object.entries(createDefaultSegmentReputation()).reduce(
    (nextSegments, [key, defaultValue]) => ({
      ...nextSegments,
      [key]: clamp((segments[key] ?? defaultValue) + (deltas[key] ?? 0), 0, 100),
    }),
    {},
  );

export const getSegmentDeltaForEvent = (event, reputationImpact = 0) => {
  if (event.type === 'performance') return { sportif: reputationImpact };
  if (event.type === 'scandal') return { media: reputationImpact, ethique: Math.floor(reputationImpact / 2) };
  if (event.type === 'transfer') return { business: reputationImpact, sportif: Math.floor(reputationImpact / 2) };
  if (event.type === 'fans') return { media: reputationImpact, ethique: Math.max(0, Math.floor(reputationImpact / 2)) };
  return { media: reputationImpact };
};

export const getMarketReachLabel = (reputation) => {
  if (reputation >= 700) return 'Influence mondiale';
  if (reputation >= 450) return 'Réseau international';
  if (reputation >= 250) return 'Agence reconnue';
  return 'Agence locale';
};
