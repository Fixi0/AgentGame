import { COUNTRIES } from '../data/clubs';
import { getClubMemoryScore } from './clubSystem';
import { clamp, makeId, pick, rand } from '../utils/helpers';
import { normalizeAgencyReputation } from './reputationSystem';

export const DIFFICULTIES = {
  facile: {
    label: 'Facile',
    money: 65000,
    reputation: 4,
    credibility: 62,
    eventPressure: 0.85,
    offerMultiplier: 1.15,
  },
  realiste: {
    label: 'Réaliste',
    money: 35000,
    reputation: 2,
    credibility: 52,
    eventPressure: 1,
    offerMultiplier: 1,
  },
  hardcore: {
    label: 'Hardcore',
    money: 18000,
    reputation: 1,
    credibility: 42,
    eventPressure: 1.25,
    offerMultiplier: 0.85,
  },
};

export const STARTING_PROFILES = {
  ancien_joueur: {
    label: 'Ancien joueur',
    description: 'Les joueurs te respectent vite, les clubs attendent de voir.',
    credibility: 6,
    segment: { sportif: 8, media: 2 },
    playerSegments: { stars: 4, crise: 3 },
  },
  avocat_sportif: {
    label: 'Avocat sportif',
    description: 'Contrats solides, clubs plus prudents.',
    credibility: 8,
    segment: { business: 8, ethique: 4 },
    playerSegments: { libres: 4 },
  },
  recruteur: {
    label: 'Recruteur',
    description: 'Meilleur sur les jeunes et le scouting.',
    credibility: 4,
    segment: { sportif: 5 },
    playerSegments: { jeunes: 8 },
  },
  influenceur_mercato: {
    label: 'Influenceur mercato',
    description: 'Très visible, mais les médias peuvent vite tourner.',
    credibility: -2,
    segment: { media: 10, business: 3, ethique: -3 },
    playerSegments: { stars: 5 },
  },
};

export const MEDIA_RELATION_TEMPLATES = [
  { id: 'mercato_insider', name: 'Mercato Insider', stance: 54 },
  { id: 'le_vestiaire', name: 'Le Vestiaire', stance: 58 },
  { id: 'canal_football_desk', name: 'Canal Football Desk', stance: 50 },
  { id: 'tabloid_sport', name: 'Tabloid Sport', stance: 42 },
  { id: 'foot_social_club', name: 'Foot Social Club', stance: 55 },
  { id: 'statszone_fc', name: 'StatsZone FC', stance: 52 },
];

export const RIVAL_AGENT_PROFILES = [
  { id: 'rival_aggressive', name: 'Marco Velez', style: 'agressif', strength: 'vole les joueurs mécontents', risk: 0.16 },
  { id: 'rival_discreet', name: 'Sofia Keller', style: 'discrète', strength: 'travaille les familles', risk: 0.12 },
  { id: 'rival_clubs', name: 'Hugo Santini', style: 'proche des clubs', strength: 'obtient vite des appels présidents', risk: 0.14 },
  { id: 'rival_players', name: 'Nadia Brooks', style: 'proche des joueurs', strength: 'promet un suivi personnel', risk: 0.15 },
];

export const createDefaultMediaRelations = () =>
  MEDIA_RELATION_TEMPLATES.reduce((relations, media) => ({
    ...relations,
    [media.id]: media.stance,
  }), {});

export const createDefaultPlayerSegmentReputation = () => ({
  jeunes: 12,
  stars: 8,
  libres: 14,
  crise: 10,
});

export const createDefaultCountryReputation = (homeCountryCode = 'FR', base = 10) =>
  COUNTRIES.reduce((relations, country) => ({
    ...relations,
    [country.code]: clamp(country.code === homeCountryCode ? base + 8 : Math.floor(base / 2), 0, 100),
  }), {});

export const createDefaultRivalAgents = () =>
  RIVAL_AGENT_PROFILES.map((agent) => ({
    ...agent,
    heat: rand(10, 35),
    lastMoveWeek: 0,
  }));

export const applyCredibilityChange = (credibility, delta) => clamp((credibility ?? 50) + delta, 0, 100);

export const applyMediaRelation = (relations, mediaId, delta) => ({
  ...createDefaultMediaRelations(),
  ...(relations ?? {}),
  [mediaId]: clamp(((relations ?? {})[mediaId] ?? 50) + delta, 0, 100),
});

export const applyPlayerSegmentReputation = (segments, segment, delta) => ({
  ...createDefaultPlayerSegmentReputation(),
  ...(segments ?? {}),
  [segment]: clamp(((segments ?? {})[segment] ?? 10) + delta, 0, 100),
});

export const addDecisionHistory = (history, decision) => [
  {
    id: makeId('decision'),
    ...decision,
  },
  ...(history ?? []),
].slice(0, 40);

export const getPlayerSegment = (player) => {
  if (player.freeAgent || player.club === 'Libre') return 'libres';
  if (player.age <= 21 || player.potential >= 168) return 'jeunes';
  if (player.rating >= 164 || (player.brandValue ?? 0) >= 60) return 'stars';
  if (player.moral < 45 || (player.trust ?? 50) < 45 || player.injured > 0) return 'crise';
  return 'jeunes';
};

export const getNegotiationContextModifier = (state, player, clubName) => {
  const countryRep = state.countryReputation?.[player.clubCountryCode] ?? state.leagueReputation?.[player.clubCountryCode] ?? 0;
  const clubRep = state.clubRelations?.[clubName || player.club] ?? 0;
  const clubMemory = getClubMemoryScore(state.clubMemory, clubName || player.club);
  const clubMemoryEntry = state.clubMemory?.[clubName || player.club] ?? {};
  const segmentRep = state.playerSegmentReputation?.[getPlayerSegment(player)] ?? 0;
  const credibility = state.credibility ?? 50;

  return Math.floor((countryRep - 10) / 12)
    + Math.floor(clubRep / 15)
    + Math.floor((clubMemory - 50) / 8)
    + Math.floor(-(clubMemoryEntry.blocks ?? 0) * 2)
    + Math.floor(-(clubMemoryEntry.lies ?? 0) * 2)
    + Math.floor(-(clubMemoryEntry.promisesBroken ?? 0) * 3)
    + Math.floor(segmentRep / 14)
    + Math.floor((credibility - 50) / 10);
};

export const applyStartingProfileToState = (state, profilePatch) => {
  const difficulty = DIFFICULTIES[profilePatch.difficulty ?? 'realiste'] ?? DIFFICULTIES.realiste;
  const startProfile = STARTING_PROFILES[profilePatch.startProfile ?? 'ancien_joueur'] ?? STARTING_PROFILES.ancien_joueur;
  const segmentReputation = { ...(state.segmentReputation ?? {}) };
  const reputationBase = normalizeAgencyReputation(state.reputation ?? difficulty.reputation * 10);
  Object.entries(startProfile.segment ?? {}).forEach(([key, delta]) => {
    segmentReputation[key] = clamp((segmentReputation[key] ?? reputationBase) + delta, 0, 100);
  });

  let playerSegmentReputation = createDefaultPlayerSegmentReputation();
  Object.entries(startProfile.playerSegments ?? {}).forEach(([key, delta]) => {
    playerSegmentReputation = applyPlayerSegmentReputation(playerSegmentReputation, key, delta);
  });

  return {
    ...state,
    money: difficulty.money,
    reputation: difficulty.reputation * 10,
    credibility: applyCredibilityChange(difficulty.credibility, startProfile.credibility ?? 0),
    segmentReputation,
    playerSegmentReputation,
    countryReputation: createDefaultCountryReputation(profilePatch.countryCode, difficulty.reputation),
    difficulty: profilePatch.difficulty ?? 'realiste',
    startProfile: profilePatch.startProfile ?? 'ancien_joueur',
  };
};

export const pickRivalAgent = (rivalAgents = createDefaultRivalAgents()) => pick(rivalAgents);
