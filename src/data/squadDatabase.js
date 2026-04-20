/**
 * squadDatabase.js
 * ─────────────────────────────────────────────────────────────────
 * Base de données d'effectifs réalistes et déterministes par club.
 *
 * Chaque club a exactement 16 joueurs :
 *   2 GK  ·  5 DEF  ·  5 MIL  ·  4 ATT
 *
 * La génération est SEEDED (club + index + saison) → mêmes joueurs
 * pour le même club sur la même saison, quelle que soit la session.
 *
 * Le marché tire des joueurs de ces effectifs avec un quota de postes
 * pour éviter les doublons (pas de 5 GK d'un même club dans le marché).
 */

import { CLUBS, COUNTRIES } from './clubs';
import { COUNTRY_NAME_POOLS, PERSONALITIES, POSITION_ROLES } from './players';

// ── Constantes ───────────────────────────────────────────────────────────────

const TRUST_BY_PERSONALITY = {
  fetard: 46, professionnel: 56, ambitieux: 50,
  loyal: 59, instable: 42, leader: 55, mercenaire: 48,
};

const HIDDEN_TRAIT_KEYS = [
  'clutch_player', 'locker_room_leader', 'silent_perfectionist',
  'social_media_magnet', 'late_bloomer', 'glass_cannon',
  'mentality_monster', 'tactical_genius',
];

// Plages de ratings selon le tier du club
const TIER_RATING = {
  1: { starterMin: 79, starterMax: 91, benchMin: 71, benchMax: 81 },
  2: { starterMin: 72, starterMax: 83, benchMin: 65, benchMax: 74 },
  3: { starterMin: 64, starterMax: 76, benchMin: 58, benchMax: 68 },
  4: { starterMin: 55, starterMax: 68, benchMin: 50, benchMax: 62 },
};

// Quota de postes pour le marché (par batch de 6)
export const MARKET_POSITION_QUOTA = [
  'GK', 'DEF', 'DEF', 'MIL', 'MIL', 'ATT',
];

// Quota de postes pour les agents libres (par batch de 4)
export const FREE_AGENT_POSITION_QUOTA = [
  'GK', 'DEF', 'MIL', 'ATT',
];

// Template d'effectif : 2 GK + 5 DEF + 5 MIL + 4 ATT = 16
const SQUAD_SLOTS = [
  // GK
  { position: 'GK',  roleId: 'goalkeeper',     starter: true  },
  { position: 'GK',  roleId: 'sweeper_keeper',  starter: false },
  // DEF
  { position: 'DEF', roleId: 'center_back',     starter: true  },
  { position: 'DEF', roleId: 'center_back',     starter: true  },
  { position: 'DEF', roleId: 'right_back',      starter: true  },
  { position: 'DEF', roleId: 'left_back',       starter: true  },
  { position: 'DEF', roleId: 'libero',          starter: false },
  // MIL
  { position: 'MIL', roleId: 'defensive_mid',   starter: true  },
  { position: 'MIL', roleId: 'box_to_box',      starter: true  },
  { position: 'MIL', roleId: 'right_winger',    starter: true  },
  { position: 'MIL', roleId: 'attacking_mid',   starter: true  },
  { position: 'MIL', roleId: 'central_mid',     starter: false },
  // ATT
  { position: 'ATT', roleId: 'striker',         starter: true  },
  { position: 'ATT', roleId: 'winger_forward',  starter: true  },
  { position: 'ATT', roleId: 'second_striker',  starter: false },
  { position: 'ATT', roleId: 'false_9',         starter: false },
];

// ── RNG déterministe ─────────────────────────────────────────────────────────

/** Hash FNV-1a sur une string → entier 32-bit non signé */
const hashStr = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};

/** Float [0, 1) déterministe depuis seed + incrément */
const seededFloat = (seed, n = 0) => {
  let s = ((seed >>> 0) + Math.imul(n + 1, 2654435761)) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  return (s ^ (s >>> 16)) >>> 0 / 0x100000000;
};

const sInt = (seed, n, min, max) =>
  Math.floor(seededFloat(seed, n) * (max - min + 1)) + min;

const sPick = (seed, n, arr) =>
  arr[Math.floor(seededFloat(seed, n) * arr.length)];

// ── Estimation de valeur marchande ──────────────────────────────────────────

const estimateValue = (rating, potential, age, tier) => {
  const r = Math.min(99, Math.max(50, rating));
  const ratingFactor = Math.exp((r - 65) / 9.2);
  const ageFactor = age <= 20 ? 1.15 : age <= 24 ? 1.05 : age <= 27 ? 0.94 : age <= 30 ? 0.80 : 0.58;
  const potFactor = 1 + Math.min(0.2, Math.max(0, (potential - rating) / 18));
  const tierFactor = tier === 1 ? 1.08 : tier === 2 ? 1.03 : tier === 3 ? 0.97 : 0.88;
  const raw = 3_850_000 * ratingFactor * ageFactor * potFactor * tierFactor;
  return Math.round(Math.min(280_000_000, Math.max(250_000, raw)) / 1000) * 1000;
};

// ── Génération d'un joueur d'effectif ────────────────────────────────────────

const buildSquadPlayer = (club, slotIdx, season) => {
  const seed = hashStr(`${club.name}:${slotIdx}:${season}`);
  const slot = SQUAD_SLOTS[slotIdx];
  const tier = club.tier ?? 4;
  const ranges = TIER_RATING[tier] ?? TIER_RATING[4];

  // Role
  const roleObj = POSITION_ROLES[slot.position]?.find((r) => r.id === slot.roleId)
    ?? POSITION_ROLES[slot.position]?.[0]
    ?? POSITION_ROLES.ATT[0];

  // Attributs déterministes
  const rating = sInt(seed, 0, slot.starter ? ranges.starterMin : ranges.benchMin,
                                slot.starter ? ranges.starterMax : ranges.benchMax);
  const age = slot.starter ? sInt(seed, 1, 21, 32) : sInt(seed, 1, 17, 27);
  const potentialCeil = slot.starter ? 96 : 88;
  const potential = Math.min(potentialCeil, rating + sInt(seed, 2, 0, age <= 22 ? 12 : 6));
  const personality = sPick(seed, 3, PERSONALITIES);
  const form = 55 + sInt(seed, 4, 0, 40);
  const brandValue = sInt(seed, 5, 8, 38);
  const moral = sInt(seed, 6, 58, 88);
  const fatigue = sInt(seed, 7, 10, 38);
  const contractWeeksLeft = sInt(seed, 8, 18, 104);
  const hiddenTrait = sPick(seed, 9, HIDDEN_TRAIT_KEYS);

  // Nationalité : préférence pour le pays du club, parfois étrangère
  const foreignChance = tier === 1 ? 0.55 : tier === 2 ? 0.40 : 0.22;
  let countryCode = club.countryCode;
  if (seededFloat(seed, 10) < foreignChance) {
    const allCodes = Object.keys(COUNTRY_NAME_POOLS);
    const foreign = allCodes.filter((c) => c !== club.countryCode);
    countryCode = sPick(seed, 11, foreign);
  }
  const countryData = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const namePool = COUNTRY_NAME_POOLS[countryCode] ?? COUNTRY_NAME_POOLS.FR;
  const firstName = sPick(seed, 12, namePool.first);
  const lastName = sPick(seed, 13, namePool.last);

  const value = estimateValue(rating, potential, age, tier);

  return {
    id: `sq_${hashStr(club.name).toString(36)}_${slotIdx}_s${season}`,
    firstName,
    lastName,
    position: slot.position,
    roleId: roleObj.id,
    roleLabel: roleObj.label,
    roleShort: roleObj.short,
    countryCode,
    countryLabel: countryData.label,
    countryFlag: countryData.flag,
    personality,
    age,
    rating,
    potential,
    value,
    weeklySalary: Math.max(500, Math.floor(value / (110 + sInt(seed, 14, 0, 30)))),
    signingCost: Math.floor(value * 0.012 + 1500),
    club: club.name,
    clubTier: tier,
    clubCountry: (COUNTRIES.find((c) => c.code === club.countryCode) ?? COUNTRIES[0]).flag,
    clubCountryCode: club.countryCode,
    clubCity: club.city ?? '',
    form,
    brandValue,
    fatigue,
    injured: 0,
    moral,
    trust: TRUST_BY_PERSONALITY[personality] ?? 50,
    contractWeeksLeft,
    contractStartWeek: 0,
    commission: 0.1,
    agentContract: null,
    timeline: [],
    careerGoal: null,
    scoutReport: null,
    hiddenTrait,
    traitRevealed: false,
    lastInteractionWeek: 0,
    europeanCompetition: null,
    seasonStats: {
      appearances: 0, goals: 0, assists: 0, saves: 0,
      tackles: 0, keyPasses: 0, xg: 0, injuries: 0,
      ratings: [], averageRating: null,
    },
    publicRep: null,
    pressure: 25 + sInt(seed, 15, 0, 40),
    recentResults: [],
    previousRating: null,
    matchHistory: [],
    activeActions: [],
  };
};

// ── API publique ─────────────────────────────────────────────────────────────

/**
 * Retourne l'effectif complet d'un club (16 joueurs).
 * Résultat déterministe pour le même club + saison.
 */
export const getClubSquad = (club, season = 1) =>
  SQUAD_SLOTS.map((_, idx) => buildSquadPlayer(club, idx, season));

/**
 * Retourne les joueurs d'un club pour un poste donné.
 * Ex: getClubSquadByPosition('Bayern', 'GK', 1) → [GK titulaire, GK remplaçant]
 */
export const getClubSquadByPosition = (club, position, season = 1) =>
  SQUAD_SLOTS
    .map((slot, idx) => ({ slot, idx }))
    .filter(({ slot }) => slot.position === position)
    .map(({ idx }) => buildSquadPlayer(club, idx, season));

/**
 * Construit le marché avec quota de postes stricts.
 *
 * @param {object} options
 * @param {number} options.reputation      — réputation de l'agence
 * @param {number} options.scoutLevel      — niveau de scouting (0–5)
 * @param {number} options.season          — saison en cours
 * @param {string[]} options.existingIds   — IDs déjà dans le roster ou marché actuel
 * @param {string[]} options.positionQuota — ex: ['GK','DEF','DEF','MIL','MIL','ATT']
 * @returns {object[]} joueurs générés
 */
export const drawMarketPlayers = ({
  reputation = 12,
  scoutLevel = 0,
  season = 1,
  existingIds = [],
  positionQuota = MARKET_POSITION_QUOTA,
}) => {
  const usedIds = new Set(existingIds);
  const usedClubsThisBatch = new Set();
  const result = [];

  // Clubs éligibles selon la réputation
  const eligibleClubs = getEligibleClubs(reputation);

  for (const position of positionQuota) {
    const player = drawOnePlayer({
      position,
      eligibleClubs,
      usedIds,
      usedClubsThisBatch,
      season,
      scoutLevel,
      reputation,
    });
    if (player) {
      result.push(player);
      usedIds.add(player.id);
      usedClubsThisBatch.add(player.club);
    }
  }

  return result;
};

/**
 * Génère les agents libres avec quota de postes.
 */
export const drawFreeAgents = ({
  reputation = 12,
  season = 1,
  existingIds = [],
  positionQuota = FREE_AGENT_POSITION_QUOTA,
}) => {
  const usedIds = new Set(existingIds);
  const result = [];
  // Les agents libres viennent de clubs de rang inférieur (–1 tier)
  const eligibleClubs = getEligibleClubs(Math.max(0, reputation - 12));

  for (const position of positionQuota) {
    const player = drawOnePlayer({
      position,
      eligibleClubs,
      usedIds,
      usedClubsThisBatch: new Set(), // les agents libres peuvent venir du même club
      season,
      scoutLevel: 0,
      reputation: Math.max(0, reputation - 4),
    });
    if (player) {
      const freePlayer = {
        ...player,
        club: 'Libre',
        clubTier: 4,
        clubCity: '-',
        freeAgent: true,
        contractWeeksLeft: 0,
        signingCost: Math.floor(player.weeklySalary * 1.8),
      };
      result.push(freePlayer);
      usedIds.add(player.id);
    }
  }

  return result;
};

// ── Helpers internes ─────────────────────────────────────────────────────────

/** Filtre les clubs accessibles selon la réputation */
const getEligibleClubs = (reputation) => {
  const rep = Math.max(0, reputation);
  let allowedTiers;
  if (rep >= 75) allowedTiers = [1, 2];
  else if (rep >= 50) allowedTiers = [1, 2, 3];
  else if (rep >= 30) allowedTiers = [2, 3];
  else if (rep >= 15) allowedTiers = [3, 4];
  else allowedTiers = [4];

  return CLUBS.filter((c) => allowedTiers.includes(c.tier));
};

/** Tire un joueur d'un poste précis depuis les clubs éligibles */
const drawOnePlayer = ({
  position,
  eligibleClubs,
  usedIds,
  usedClubsThisBatch,
  season,
  scoutLevel,
  reputation,
}) => {
  // Slots de l'effectif correspondant à ce poste
  const slotsForPosition = SQUAD_SLOTS
    .map((slot, idx) => ({ slot, idx }))
    .filter(({ slot }) => slot.position === position);

  // Mélange les clubs pour ne pas toujours prendre le premier
  const shuffled = [...eligibleClubs].sort(() => Math.random() - 0.5);

  for (const club of shuffled) {
    // Évite d'avoir 2 joueurs du même club dans le même batch de marché
    if (usedClubsThisBatch.has(club.name)) continue;

    // Essaie chaque slot du poste (titulaire en premier, puis remplaçants)
    const orderedSlots = [...slotsForPosition].sort((a, b) =>
      b.slot.starter - a.slot.starter,
    );

    for (const { idx } of orderedSlots) {
      const player = buildSquadPlayer(club, idx, season);
      if (usedIds.has(player.id)) continue;

      // Filtre de niveau : si rating trop élevé pour la réputation, skip
      const maxRatingForRep = 58 + Math.floor(reputation / 2) + scoutLevel * 2;
      if (reputation < 40 && player.rating > maxRatingForRep) continue;

      return player;
    }
  }

  // Fallback : aucun club disponible → génère un joueur aléatoire du bon poste
  return buildFallbackPlayer(position, reputation, season);
};

/** Fallback si tous les clubs sont épuisés */
const buildFallbackPlayer = (position, reputation, season) => {
  const allClubs = CLUBS;
  const club = allClubs[Math.floor(Math.random() * allClubs.length)];
  const slotsForPos = SQUAD_SLOTS
    .map((slot, idx) => ({ slot, idx }))
    .filter(({ slot }) => slot.position === position);
  const { idx } = slotsForPos[Math.floor(Math.random() * slotsForPos.length)];
  // Génère avec un seed différent pour éviter les doublons
  const uniqueOffset = Math.floor(Math.random() * 10000);
  const seed = hashStr(`fallback:${club.name}:${idx}:${season}:${uniqueOffset}`);
  const slot = SQUAD_SLOTS[idx];
  const tier = club.tier ?? 4;
  const ranges = TIER_RATING[tier] ?? TIER_RATING[4];
  const roleObj = POSITION_ROLES[slot.position]?.find((r) => r.id === slot.roleId)
    ?? POSITION_ROLES[slot.position]?.[0];
  const rating = sInt(seed, 0, ranges.benchMin, ranges.benchMax);
  const age = sInt(seed, 1, 18, 30);
  const potential = Math.min(88, rating + sInt(seed, 2, 0, 8));
  const personality = sPick(seed, 3, PERSONALITIES);
  const countryCode = club.countryCode;
  const countryData = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const namePool = COUNTRY_NAME_POOLS[countryCode] ?? COUNTRY_NAME_POOLS.FR;
  const value = estimateValue(rating, potential, age, tier);

  return {
    id: `sq_fb_${hashStr(club.name + idx + uniqueOffset).toString(36)}`,
    firstName: sPick(seed, 12, namePool.first),
    lastName: sPick(seed, 13, namePool.last),
    position: slot.position,
    roleId: roleObj.id,
    roleLabel: roleObj.label,
    roleShort: roleObj.short,
    countryCode,
    countryLabel: countryData.label,
    countryFlag: countryData.flag,
    personality,
    age,
    rating,
    potential,
    value,
    weeklySalary: Math.max(500, Math.floor(value / 120)),
    signingCost: Math.floor(value * 0.012 + 1500),
    club: club.name,
    clubTier: tier,
    clubCountry: (COUNTRIES.find((c) => c.code === club.countryCode) ?? COUNTRIES[0]).flag,
    clubCountryCode: club.countryCode,
    clubCity: club.city ?? '',
    form: 60 + sInt(seed, 4, 0, 30),
    brandValue: sInt(seed, 5, 8, 25),
    fatigue: sInt(seed, 7, 10, 38),
    injured: 0,
    moral: sInt(seed, 6, 58, 85),
    trust: TRUST_BY_PERSONALITY[personality] ?? 50,
    contractWeeksLeft: sInt(seed, 8, 18, 80),
    contractStartWeek: 0,
    commission: 0.1,
    agentContract: null,
    timeline: [],
    careerGoal: null,
    scoutReport: null,
    hiddenTrait: sPick(seed, 9, HIDDEN_TRAIT_KEYS),
    traitRevealed: false,
    lastInteractionWeek: 0,
    europeanCompetition: null,
    seasonStats: { appearances: 0, goals: 0, assists: 0, saves: 0, tackles: 0, keyPasses: 0, xg: 0, injuries: 0, ratings: [], averageRating: null },
    publicRep: null,
    pressure: 25 + sInt(seed, 15, 0, 35),
    recentResults: [],
    previousRating: null,
    matchHistory: [],
    activeActions: [],
  };
};
