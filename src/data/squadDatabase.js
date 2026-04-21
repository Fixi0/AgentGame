/**
 * squadDatabase.js
 * ─────────────────────────────────────────────────────────────────
 * Base de données d'effectifs réalistes et déterministes par club.
 *
 * Chaque club a :
 *   · 16 joueurs seniors   (2 GK · 5 DEF · 5 MIL · 4 ATT)
 *   · 4  prospects U21     (1 par ligne de jeu)
 *
 * Nouveautés vs v1 :
 *   1. Nationalités réalistes par club (profils maison)
 *   2. Pools de noms étendus par nationalité (~50 noms/pays)
 *   3. Attributs physiques (foot, physique, style de jeu)
 *   4. Jeunes prospects (U21) dédiés
 *   5. IDs stables entre saisons + évolution stats (âge/note)
 */

import { CLUBS, COUNTRIES } from './clubs';
import { COUNTRY_NAME_POOLS, PERSONALITIES, POSITION_ROLES } from './players';
import { clamp } from '../utils/helpers';
import { generatePlayerAttributes } from '../systems/attributesSystem';

// ── Constantes ───────────────────────────────────────────────────────────────

const TRUST_BY_PERSONALITY = {
  fetard: 46, professionnel: 56, ambitieux: 50,
  loyal: 59, instable: 42, leader: 55, mercenaire: 48,
};

const HIDDEN_TRAIT_KEYS = [
  'clutch_player','locker_room_leader','silent_perfectionist',
  'social_media_magnet','late_bloomer','glass_cannon',
  'mentality_monster','tactical_genius',
];

const GABRIEL_FIXIO_SEED = 0x9f3a7b1d;
export const GABRIEL_FIXIO_ID = 'sig_gabriel_fixio';
const GABRIEL_FIXIO_CLUB = 'Marseille';

const getMarseilleClub = () =>
  CLUBS.find((club) => club.name === GABRIEL_FIXIO_CLUB) ?? CLUBS[0];

const buildGabrielFixio = (club = getMarseilleClub(), season = 1) => {
  const fixioClub = club?.name === GABRIEL_FIXIO_CLUB ? club : getMarseilleClub();
  const roleObj = POSITION_ROLES.MIL?.find((role) => role.id === 'attacking_mid')
    ?? POSITION_ROLES.MIL?.[0]
    ?? POSITION_ROLES.ATT?.[0];
  const baseAge = 20;
  const baseRating = 65;
  const potential = 99;
  const rating = evolveRating(baseRating, baseAge, potential, season);
  const age = baseAge + (season - 1);
  const countryData = COUNTRIES.find((c) => c.code === 'FR') ?? COUNTRIES[0];
  const value = estimateValue(rating, potential, age, 1);
  const weeklySalary = Math.max(2500, Math.floor(value / 140));

  return {
    id: GABRIEL_FIXIO_ID,
    firstName: 'Gabriel',
    lastName: 'Fixio',
    birthDate: '2006-05-04',
    birthDateLabel: '4 mai 2006',
    birthPlace: 'Aix-en-Provence',
    position: 'MIL',
    roleId: roleObj.id,
    roleLabel: 'Milieu offensif central',
    roleShort: 'MOC',
    countryCode: countryData.code,
    countryLabel: countryData.label,
    countryFlag: countryData.flag,
    personality: 'professionnel',
    age,
    rating,
    potential,
    value,
    weeklySalary,
    signingCost: Math.max(12000, Math.floor(value * 0.009)),
    club: fixioClub.name,
    clubTier: fixioClub.tier ?? 1,
    clubCountry: (COUNTRIES.find((c) => c.code === fixioClub.countryCode) ?? COUNTRIES[0]).flag,
    clubCountryCode: fixioClub.countryCode,
    clubCity: fixioClub.city ?? 'Marseille',
    form: 95,
    brandValue: 92,
    fatigue: 5,
    injured: 0,
    moral: 98,
    trust: 85,
    pressureTolerance: 95,
    dreamClub: 'Real Madrid',
    contractWeeksLeft: 64,
    contractStartWeek: 0,
    commission: 0.08,
    agentContract: null,
    timeline: [
      { week: season * 38 - 37, type: 'origin', label: 'Pépite d\'Aix-en-Provence' },
    ],
    careerGoal: null,
    scoutReport: null,
    hiddenTrait: 'late_bloomer',
    traitRevealed: false,
    lastInteractionWeek: 0,
    europeanCompetition: null,
    seasonStats: {
      appearances: 0, goals: 0, assists: 0, saves: 0,
      tackles: 0, keyPasses: 0, xg: 0, injuries: 0,
      ratings: [], averageRating: null,
    },
    publicRep: null,
    pressure: 5,
    recentResults: [],
    previousRating: null,
    matchHistory: [],
    activeActions: [],
    physique: 'technique',
    playStyle: 'box_to_box',
    foot: 'G',
    developmentBoost: 0.055,
    developmentCurve: 'superstar_gem',
    signaturePlayer: false,
    hiddenPotential: true,
    attributes: generatePlayerAttributes({ rating, potential, position: 'MIL' }, roleObj),
    clubRole: getClubRole(rating, fixioClub.tier ?? 1, true),
  };
};

// Plages de ratings selon le tier du club
const TIER_RATING = {
  1: { starterMin: 79, starterMax: 91, benchMin: 71, benchMax: 81 },
  2: { starterMin: 72, starterMax: 83, benchMin: 65, benchMax: 74 },
  3: { starterMin: 64, starterMax: 76, benchMin: 58, benchMax: 68 },
  4: { starterMin: 55, starterMax: 68, benchMin: 50, benchMax: 62 },
};

// ── Physique & Style de jeu ─────────────────────────────────────────────────
// Par roleId → profil dominant (physique + style)
const ROLE_PROFILE = {
  goalkeeper:     { physique: 'puissant',  style: 'gardien'    },
  sweeper_keeper: { physique: 'rapide',    style: 'gardien'    },
  center_back:    { physique: 'puissant',  style: 'défenseur'  },
  libero:         { physique: 'technique', style: 'défenseur'  },
  right_back:     { physique: 'rapide',    style: 'défenseur'  },
  left_back:      { physique: 'rapide',    style: 'défenseur'  },
  right_wing_back:{ physique: 'rapide',    style: 'box_to_box' },
  left_wing_back: { physique: 'rapide',    style: 'box_to_box' },
  defensive_mid:  { physique: 'puissant',  style: 'défenseur'  },
  box_to_box:     { physique: 'endurance', style: 'box_to_box' },
  central_mid:    { physique: 'technique', style: 'créateur'   },
  playmaker:      { physique: 'technique', style: 'créateur'   },
  attacking_mid:  { physique: 'technique', style: 'créateur'   },
  right_winger:   { physique: 'rapide',    style: 'créateur'   },
  left_winger:    { physique: 'rapide',    style: 'créateur'   },
  striker:        { physique: 'puissant',  style: 'buteur'     },
  target_man:     { physique: 'puissant',  style: 'buteur'     },
  second_striker: { physique: 'technique', style: 'buteur'     },
  false_9:        { physique: 'technique', style: 'créateur'   },
  winger_forward: { physique: 'rapide',    style: 'buteur'     },
};

const PHYSIQUES = ['rapide','puissant','technique','endurance'];

// ── Probabilités pied par rôle ───────────────────────────────────────────────
// leftFootChance : probabilité d'être gaucher
const ROLE_LEFT_FOOT = {
  left_back: 0.60, left_winger: 0.55, left_wing_back: 0.58,
  right_back: 0.08, right_winger: 0.10, right_wing_back: 0.10,
};
const DEFAULT_LEFT_FOOT_CHANCE = 0.22; // ~22% de gauchers dans le foot mondial
const playerCatalogCache = new Map();
let databasePlayerCatalog = null;

export const getMarketRatingCeiling = (reputation = 12, scoutLevel = 0) => {
  const rep = getMarketReputationScore(reputation);
  const base = rep < 15 ? 62 : rep < 30 ? 68 : rep < 45 ? 74 : rep < 60 ? 80 : 86;
  return clamp(base + Math.floor(scoutLevel * 0.8), 58, 92);
};

// ── Quota de postes pour le marché ─────────────────────────────────────────
export const MARKET_POSITION_QUOTA = ['GK','DEF','DEF','MIL','MIL','ATT'];
export const FREE_AGENT_POSITION_QUOTA = ['GK','DEF','MIL','ATT'];

// ── Template effectif senior : 16 joueurs ────────────────────────────────────
const SQUAD_SLOTS = [
  { position: 'GK',  roleId: 'goalkeeper',     starter: true  },
  { position: 'GK',  roleId: 'sweeper_keeper',  starter: false },
  { position: 'DEF', roleId: 'center_back',     starter: true  },
  { position: 'DEF', roleId: 'center_back',     starter: true  },
  { position: 'DEF', roleId: 'right_back',      starter: true  },
  { position: 'DEF', roleId: 'left_back',       starter: true  },
  { position: 'DEF', roleId: 'libero',          starter: false },
  { position: 'MIL', roleId: 'defensive_mid',   starter: true  },
  { position: 'MIL', roleId: 'box_to_box',      starter: true  },
  { position: 'MIL', roleId: 'right_winger',    starter: true  },
  { position: 'MIL', roleId: 'attacking_mid',   starter: true  },
  { position: 'MIL', roleId: 'central_mid',     starter: false },
  { position: 'ATT', roleId: 'striker',         starter: true  },
  { position: 'ATT', roleId: 'winger_forward',  starter: true  },
  { position: 'ATT', roleId: 'second_striker',  starter: false },
  { position: 'ATT', roleId: 'false_9',         starter: false },
];

// ── Template prospects U21 : 4 joueurs ───────────────────────────────────────
const YOUTH_SLOTS = [
  { position: 'GK',  roleId: 'goalkeeper',    ageMin: 16, ageMax: 20 },
  { position: 'DEF', roleId: 'center_back',   ageMin: 17, ageMax: 21 },
  { position: 'MIL', roleId: 'attacking_mid', ageMin: 17, ageMax: 21 },
  { position: 'ATT', roleId: 'striker',       ageMin: 16, ageMax: 20 },
];

// ── RNG déterministe ──────────────────────────────────────────────────────────

const hashStr = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};

const seededFloat = (seed, n = 0) => {
  let s = ((seed >>> 0) + Math.imul(n + 1, 2654435761)) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  return ((s ^ (s >>> 16)) >>> 0) / 0x100000000;
};

const sInt   = (seed, n, min, max) => Math.floor(seededFloat(seed, n) * (max - min + 1)) + min;
const sPick  = (seed, n, arr) => arr[Math.floor(seededFloat(seed, n) * arr.length)];
const sBool  = (seed, n, prob) => seededFloat(seed, n) < prob;

// ── Valeur marchande ──────────────────────────────────────────────────────────

const estimateValue = (rating, potential, age, tier) => {
  const r = Math.min(99, Math.max(50, rating));
  const ratingFactor = Math.exp((r - 65) / 9.2);
  const ageFactor = age <= 20 ? 1.15 : age <= 24 ? 1.05 : age <= 27 ? 0.94 : age <= 30 ? 0.80 : 0.58;
  const potFactor  = 1 + Math.min(0.2, Math.max(0, (potential - rating) / 18));
  const tierFactor = tier === 1 ? 1.08 : tier === 2 ? 1.03 : tier === 3 ? 0.97 : 0.88;
  const raw = 3_850_000 * ratingFactor * ageFactor * potFactor * tierFactor;
  return Math.round(Math.min(280_000_000, Math.max(250_000, raw)) / 1000) * 1000;
};

const limitEliteRatings = (catalog = [], maxElite = 3) => {
  const eliteIds = new Set(
    [...catalog]
      .filter((player) => (player.rating ?? 0) > 90)
      .sort((a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0)
        || (b.potential ?? 0) - (a.potential ?? 0)
        || String(a.id).localeCompare(String(b.id)),
      )
      .slice(0, maxElite)
      .map((player) => player.id),
  );

  return catalog.map((player) => {
    if ((player.rating ?? 0) <= 90 || eliteIds.has(player.id)) return player;
    const rating = 90;
    const value = estimateValue(rating, Math.max(rating, player.potential ?? rating), player.age ?? 24, player.clubTier ?? 2);
    return {
      ...player,
      rating,
      value,
      weeklySalary: Math.max(player.weeklySalary ?? 0, Math.floor(value / 135)),
      signingCost: Math.max(player.signingCost ?? 0, Math.floor(value * 0.012)),
    };
  });
};

// ── Évolution inter-saisons ───────────────────────────────────────────────────
/**
 * Fait évoluer le rating d'un joueur de la saison 1 à la saison N.
 * Jeunes (<23) : +1–2/saison  |  Plateau (23–28) : ±0  |  Déclin (>28) : −1/saison
 */
const evolveRating = (baseRating, baseAge, potential, season) => {
  if (season <= 1) return baseRating;
  let r = baseRating;
  let a = baseAge;
  for (let s = 1; s < season; s++) {
    const gap = potential - r;
    if (a < 23) {
      // Jeune : croissance rapide proportionnelle au potentiel restant
      r = Math.min(potential, r + (gap > 25 ? 4 : gap > 15 ? 3 : gap > 8 ? 2 : 1));
    } else if (a < 29) {
      // Plateau/prime : croissance modérée si écart important
      r = Math.min(potential, r + (gap > 18 ? 2 : gap > 8 ? 1 : 0));
    } else if (a < 32) {
      // Début déclin, peut encore progresser si gros écart
      r = Math.min(potential, r + (gap > 22 ? 1 : 0));
      if (gap <= 22) r = Math.max(50, r - 1);
    } else {
      r = Math.max(50, r - 1);
    }
    a++;
  }
  return Math.min(99, Math.max(50, r));
};

// ── Rôle du contrat (Club Role) ────────────────────────────────────────────────
/**
 * Détermine le rôle contrat d'un joueur (Star/Titulaire/Rotation/Indésirable)
 * basé sur son rating vs les attentes du tier du club
 */
const getClubRole = (rating, tier, isStarter) => {
  const tierRating = TIER_RATING[tier] ?? TIER_RATING[4];
  const starThreshold = tierRating.starterMin + 10;
  const starterThreshold = tierRating.starterMin;
  const rotationThreshold = tierRating.benchMin;

  if (rating >= starThreshold) return 'Star';
  if (isStarter && rating >= starterThreshold) return 'Titulaire';
  if (rating >= rotationThreshold) return 'Rotation';
  return 'Indésirable';
};

// ── Nationalités réalistes par club ─────────────────────────────────────────
/**
 * Profils de nationalité par club (nom exact du club dans clubs.js).
 * Format : [[countryCode, weightPercentage], ...]
 * Les % restants vont à une sélection mondiale aléatoire.
 */
const CLUB_NAT_PROFILES = {
  // France
  'PSG':         [['FR',30],['BR',12],['PT',10],['ES',8],['SN',6]],
  'Marseille':   [['FR',42],['SN',8],['CM',6],['MA',5],['CI',4]],
  'Monaco':      [['FR',28],['BR',10],['PT',10],['SN',7]],
  'Lyon':        [['FR',44],['SN',7],['CI',6],['MA',5]],
  'Lille':       [['FR',46],['PT',6],['SN',6],['CM',5]],
  'Nice':        [['FR',46],['BR',7],['AR',5],['SN',5]],
  'Lens':        [['FR',50],['SN',7],['CM',5]],
  'Rennes':      [['FR',52],['SN',6],['MA',5]],
  // Espagne
  'Barcelona':   [['ES',40],['BR',8],['AR',7],['FR',5]],
  'Real Madrid': [['ES',35],['BR',10],['FR',8],['PT',6]],
  'Atletico':    [['ES',40],['AR',8],['BR',6],['PT',5]],
  'Athletic':    [['ES',88]],  // règle basque
  'Villarreal':  [['ES',45],['AR',8],['BR',6]],
  'Real Betis':  [['ES',48],['BR',6],['AR',5]],
  'Real Sociedad':[['ES',55],['FR',6],['AR',5]],
  // Angleterre
  'Arsenal':     [['GB',25],['BR',8],['FR',7],['GH',5],['NG',5]],
  'Man City':    [['GB',22],['BR',8],['ES',8],['AR',7]],
  'Liverpool':   [['GB',28],['BR',8],['SN',5],['NG',5]],
  'Man United':  [['GB',28],['BR',7],['AR',5],['FR',5]],
  'Chelsea':     [['GB',24],['BR',8],['FR',7],['NG',5]],
  'Newcastle':   [['GB',32],['BR',7],['FR',6]],
  'Aston Villa': [['GB',30],['BR',7],['NG',5]],
  'Tottenham':   [['GB',28],['BR',7],['FR',5],['SN',5]],
  // Allemagne
  'Bayern':      [['DE',48],['ES',7],['FR',6],['BR',5]],
  'Dortmund':    [['DE',44],['BR',8],['FR',6]],
  'Leverkusen':  [['DE',42],['BR',6],['NG',5],['ES',5]],
  'Leipzig':     [['DE',44],['BR',6],['FR',5]],
  // Italie
  'Inter':       [['IT',42],['AR',8],['BR',6],['FR',5]],
  'Milan':       [['IT',38],['FR',8],['CI',6],['BR',5]],
  'Juventus':    [['IT',42],['BR',8],['AR',6],['FR',5]],
  'Napoli':      [['IT',44],['AR',7],['BR',6]],
  // Portugal
  'Benfica':     [['PT',50],['BR',15],['AR',5]],
  'Porto':       [['PT',45],['BR',15],['AR',5]],
  'Sporting':    [['PT',48],['BR',12]],
  // Pays-Bas
  'Ajax':        [['NL',50],['GH',8],['SN',6]],
  'PSV':         [['NL',50],['BR',7],['CI',5]],
};

// Pays "monde" pour le fallback
const WORLD_COUNTRIES = ['BR','AR','SN','CM','CI','MA','NG','GH','TR','PT','ES','IT','FR','DE','NL'];

/**
 * Sélectionne une nationalité pour un joueur donné selon le profil du club.
 * Résultat déterministe via seed.
 */
const pickNationality = (club, seed, slotN) => {
  const profile = CLUB_NAT_PROFILES[club.name];
  const countryCode = club.countryCode;

  if (!profile) {
    // Clubs sans profil : chance étrangère selon tier
    const foreignChance = club.tier === 1 ? 0.55 : club.tier === 2 ? 0.40 : 0.22;
    if (!sBool(seed, slotN, foreignChance)) return countryCode;
    const foreign = WORLD_COUNTRIES.filter((c) => c !== countryCode);
    return sPick(seed, slotN + 1, foreign);
  }

  // Construire la roue de sélection
  const wheel = [];
  let total = 0;
  for (const [cc, w] of profile) { wheel.push([cc, w]); total += w; }
  // Reste = monde
  if (total < 100) {
    const worldWeight = 100 - total;
    const worldPool = WORLD_COUNTRIES.filter((c) => !profile.some(([cc]) => cc === c));
    if (worldPool.length) wheel.push(['__world__', worldWeight, worldPool]);
  }

  const r = seededFloat(seed, slotN + 50) * 100;
  let acc = 0;
  for (const entry of wheel) {
    acc += entry[1];
    if (r < acc) {
      if (entry[0] === '__world__') {
        return sPick(seed, slotN + 51, entry[2]);
      }
      return entry[0];
    }
  }
  return countryCode;
};

// ── Génération d'un joueur senior ────────────────────────────────────────────

const buildSquadPlayer = (club, slotIdx, season) => {
  if (club?.name === GABRIEL_FIXIO_CLUB && slotIdx === 10) {
    return buildGabrielFixio(club, season);
  }
  // Seed STABLE (sans saison) → même joueur d'une saison à l'autre
  const baseSeed = hashStr(`${club.name}:${slotIdx}`);
  const slot     = SQUAD_SLOTS[slotIdx];
  const tier     = club.tier ?? 4;
  const ranges   = TIER_RATING[tier] ?? TIER_RATING[4];

  // Rôle
  const roleObj = POSITION_ROLES[slot.position]?.find((r) => r.id === slot.roleId)
    ?? POSITION_ROLES[slot.position]?.[0]
    ?? POSITION_ROLES.ATT[0];

  // Attributs de base (saison 1)
  const baseRating = sInt(baseSeed, 0,
    slot.starter ? ranges.starterMin : ranges.benchMin,
    slot.starter ? ranges.starterMax : ranges.benchMax,
  );
  const baseAge = slot.starter ? sInt(baseSeed, 1, 21, 32) : sInt(baseSeed, 1, 17, 27);
  const potentialCeil = slot.starter ? 96 : 88;
  const potential = Math.min(potentialCeil, baseRating + sInt(baseSeed, 2, 0, baseAge <= 22 ? 12 : 6));

  // Évolution inter-saisons
  const rating = evolveRating(baseRating, baseAge, potential, season);
  const age    = baseAge + (season - 1);

  // Attributs stables
  const personality    = sPick(baseSeed, 3, PERSONALITIES);
  const form           = 55 + sInt(baseSeed, 4, 0, 40);
  const brandValue     = sInt(baseSeed, 5, 8, 38);
  const moral          = sInt(baseSeed, 6, 58, 88);
  const fatigue        = sInt(baseSeed, 7, 10, 38);
  const contractWeeksLeft = sInt(baseSeed, 8, 18, 104);
  const hiddenTrait    = sPick(baseSeed, 9, HIDDEN_TRAIT_KEYS);

  // Nationalité réaliste
  const countryCode  = pickNationality(club, baseSeed, 10);
  const countryData  = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const namePool     = COUNTRY_NAME_POOLS[countryCode] ?? COUNTRY_NAME_POOLS.FR;
  const firstName    = sPick(baseSeed, 20, namePool.first);
  const lastName     = sPick(baseSeed, 21, namePool.last);

  // Attributs physiques
  const rp = ROLE_PROFILE[slot.roleId] ?? { physique: 'technique', style: 'box_to_box' };
  const physique  = sBool(baseSeed, 22, 0.65) ? rp.physique : sPick(baseSeed, 23, PHYSIQUES);
  const playStyle = rp.style;
  const leftChance = ROLE_LEFT_FOOT[slot.roleId] ?? DEFAULT_LEFT_FOOT_CHANCE;
  const foot      = sBool(baseSeed, 24, leftChance) ? 'G' : sBool(baseSeed, 25, 0.08) ? 'D+G' : 'D';

  const value = estimateValue(rating, potential, age, tier);

  return {
    // ID stable (sans saison) pour continuité entre saisons
    id: `sq_${hashStr(club.name).toString(36)}_${slotIdx}`,
    firstName,
    lastName,
    position:    slot.position,
    roleId:      roleObj.id,
    roleLabel:   roleObj.label,
    roleShort:   roleObj.short,
    countryCode,
    countryLabel: countryData.label,
    countryFlag:  countryData.flag,
    personality,
    age,
    rating,
    potential,
    value,
    weeklySalary:    Math.max(500, Math.floor(value / (110 + sInt(baseSeed, 14, 0, 30)))),
    signingCost:     Math.floor(value * 0.012 + 1500),
    club:            club.name,
    clubTier:        tier,
    clubCountry:     (COUNTRIES.find((c) => c.code === club.countryCode) ?? COUNTRIES[0]).flag,
    clubCountryCode: club.countryCode,
    clubCity:        club.city ?? '',
    form,
    brandValue,
    fatigue,
    injured:   0,
    moral,
    trust:     TRUST_BY_PERSONALITY[personality] ?? 50,
    contractWeeksLeft,
    contractStartWeek: 0,
    commission: 0.1,
    agentContract: null,
    timeline:  [],
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
    publicRep:      null,
    pressure:       25 + sInt(baseSeed, 15, 0, 40),
    recentResults:  [],
    previousRating: null,
    matchHistory:   [],
    activeActions:  [],
    // Nouveaux attributs v2
    physique,
    playStyle,
    foot,
    // Système d'attributs détaillé (17 stats)
    attributes: generatePlayerAttributes({ rating, potential, position: slot.position }, roleObj),
    clubRole: getClubRole(rating, tier, slot.starter),
  };
};

// ── Génération d'un prospect U21 ─────────────────────────────────────────────

const buildYouthPlayer = (club, youthSlotIdx, season) => {
  const baseSeed = hashStr(`${club.name}:youth:${youthSlotIdx}`);
  const slot     = YOUTH_SLOTS[youthSlotIdx];
  const tier     = club.tier ?? 4;

  const roleObj = POSITION_ROLES[slot.position]?.find((r) => r.id === slot.roleId)
    ?? POSITION_ROLES[slot.position]?.[0];

  const baseAge = sInt(baseSeed, 1, slot.ageMin, slot.ageMax);
  const age     = baseAge + (season - 1);
  // Prospects : rating bas, potential élevé
  const baseRating = TIER_RATING[tier].benchMin - 5 + sInt(baseSeed, 0, 0, 10);
  const rating     = evolveRating(baseRating, baseAge, 88, season);
  const potential  = Math.min(92, baseRating + sInt(baseSeed, 2, 10, 22));

  const personality = sPick(baseSeed, 3, PERSONALITIES);
  const countryCode = pickNationality(club, baseSeed, 10);
  const countryData = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const namePool    = COUNTRY_NAME_POOLS[countryCode] ?? COUNTRY_NAME_POOLS.FR;

  const rp       = ROLE_PROFILE[slot.roleId] ?? { physique: 'rapide', style: 'box_to_box' };
  const physique  = sBool(baseSeed, 22, 0.7) ? rp.physique : sPick(baseSeed, 23, PHYSIQUES);
  const leftChance = ROLE_LEFT_FOOT[slot.roleId] ?? DEFAULT_LEFT_FOOT_CHANCE;
  const foot      = sBool(baseSeed, 24, leftChance) ? 'G' : sBool(baseSeed, 25, 0.08) ? 'D+G' : 'D';
  const value     = estimateValue(rating, potential, age, tier);

  return {
    id: `sq_youth_${hashStr(club.name).toString(36)}_${youthSlotIdx}`,
    firstName:  sPick(baseSeed, 20, namePool.first),
    lastName:   sPick(baseSeed, 21, namePool.last),
    position:   slot.position,
    roleId:     roleObj.id,
    roleLabel:  roleObj.label,
    roleShort:  roleObj.short,
    countryCode,
    countryLabel: countryData.label,
    countryFlag:  countryData.flag,
    personality,
    age,
    rating,
    potential,
    value,
    weeklySalary:    Math.max(200, Math.floor(value / 150)),
    signingCost:     Math.floor(value * 0.008 + 800),
    club:            club.name,
    clubTier:        tier,
    clubCountry:     (COUNTRIES.find((c) => c.code === club.countryCode) ?? COUNTRIES[0]).flag,
    clubCountryCode: club.countryCode,
    clubCity:        club.city ?? '',
    form:            50 + sInt(baseSeed, 4, 0, 30),
    brandValue:      sInt(baseSeed, 5, 3, 18),
    fatigue:         sInt(baseSeed, 7, 5, 25),
    injured:  0,
    moral:    sInt(baseSeed, 6, 60, 90),
    trust:    TRUST_BY_PERSONALITY[personality] ?? 50,
    contractWeeksLeft:  sInt(baseSeed, 8, 8, 52),
    contractStartWeek:  0,
    commission: 0.12,
    agentContract: null,
    timeline:  [],
    careerGoal: null,
    scoutReport: null,
    hiddenTrait: sPick(baseSeed, 9, HIDDEN_TRAIT_KEYS),
    traitRevealed:   false,
    lastInteractionWeek: 0,
    europeanCompetition: null,
    isProspect: true,
    seasonStats: {
      appearances: 0, goals: 0, assists: 0, saves: 0,
      tackles: 0, keyPasses: 0, xg: 0, injuries: 0,
      ratings: [], averageRating: null,
    },
    publicRep:      null,
    pressure:       15 + sInt(baseSeed, 15, 0, 25),
    recentResults:  [],
    previousRating: null,
    matchHistory:   [],
    activeActions:  [],
    physique,
    playStyle: rp.style,
    foot,
    // Système d'attributs détaillé (17 stats)
    attributes: generatePlayerAttributes({ rating, potential, position: slot.position }, roleObj),
    clubRole: getClubRole(rating, tier, false),
  };
};

// ── API publique ─────────────────────────────────────────────────────────────

/** Effectif senior complet d'un club (16 joueurs). */
export const getClubSquad = (club, season = 1) =>
  SQUAD_SLOTS.map((_, idx) => buildSquadPlayer(club, idx, season));

/** Joueurs senior d'un club pour un poste donné. */
export const getClubSquadByPosition = (club, position, season = 1) =>
  SQUAD_SLOTS
    .map((slot, idx) => ({ slot, idx }))
    .filter(({ slot }) => slot.position === position)
    .map(({ idx }) => buildSquadPlayer(club, idx, season));

/** Prospects U21 d'un club (4 joueurs). */
export const getClubYouthPlayers = (club, season = 1) =>
  YOUTH_SLOTS.map((_, idx) => buildYouthPlayer(club, idx, season));

const evolveDatabaseCatalogPlayer = (player, season = 1) => {
  const catalogSeason = player.catalogSeason ?? 1;
  const relativeSeason = Math.max(1, season - catalogSeason + 1);
  const baseAge = player.catalogBaseAge ?? player.age ?? 24;
  const baseRating = player.catalogBaseRating ?? player.rating ?? 60;
  const potential = player.catalogBasePotential ?? player.potential ?? baseRating;
  const age = baseAge + Math.max(0, relativeSeason - 1);
  const rating = evolveRating(baseRating, baseAge, potential, relativeSeason);
  return {
    ...player,
    age,
    rating,
    previousRating: player.previousRating ?? null,
  };
};

export const setDatabasePlayerCatalog = (players = []) => {
  const normalized = (Array.isArray(players) ? players : [])
    .filter((player) => player?.id && player?.firstName && player?.lastName)
    .map((player) => ({
      ...player,
      catalogSeason: player.catalogSeason ?? 1,
      catalogBaseAge: player.catalogBaseAge ?? player.age ?? 24,
      catalogBaseRating: player.catalogBaseRating ?? player.rating ?? 60,
      catalogBasePotential: player.catalogBasePotential ?? player.potential ?? player.rating ?? 60,
      databaseBacked: true,
    }));
  databasePlayerCatalog = normalized.length ? normalized : null;
  playerCatalogCache.clear();
};

export const clearDatabasePlayerCatalog = () => {
  databasePlayerCatalog = null;
  playerCatalogCache.clear();
};

export const getPlayerCatalogSource = () => (databasePlayerCatalog?.length ? 'indexeddb' : 'code');

export const createPlayerCatalog = (season = 1) => {
  const cacheKey = `${getPlayerCatalogSource()}:${season}`;
  const cached = playerCatalogCache.get(cacheKey);
  if (cached) return cached;

  const rawCatalog = databasePlayerCatalog?.length
    ? databasePlayerCatalog.map((player) => evolveDatabaseCatalogPlayer(player, season))
    : CLUBS.flatMap((club) => [
      ...getClubSquad(club, season),
      ...getClubYouthPlayers(club, season),
    ]);
  const catalog = limitEliteRatings(rawCatalog);

  playerCatalogCache.set(cacheKey, catalog);
  return catalog;
};

export const getCatalogPlayerById = (playerId, season = 1) => {
  if (!playerId) return null;
  return createPlayerCatalog(season).find((player) => player.id === playerId) ?? null;
};

export const reconcilePlayerWithCatalog = (player, season = 1) => {
  if (!player?.id) return player;
  const catalogPlayer = getCatalogPlayerById(player.id, season);
  if (!catalogPlayer) return player;
  const liveRating = Number.isFinite(player.rating) ? player.rating : null;
  const catalogRating = Number.isFinite(catalogPlayer.rating) ? catalogPlayer.rating : null;
  const merged = {
    ...catalogPlayer,
    ...player,
    catalogPlayerId: catalogPlayer.id,
    databaseBacked: true,
    age: player.age ?? catalogPlayer.age,
    rating: liveRating == null ? catalogRating : catalogRating == null ? liveRating : Math.max(liveRating, catalogRating),
    potential: Math.max(player.potential ?? 0, catalogPlayer.potential ?? 0) || (player.potential ?? catalogPlayer.potential),
    dreamClub: player.dreamClub ?? catalogPlayer.dreamClub,
    pressureTolerance: player.pressureTolerance ?? catalogPlayer.pressureTolerance,
    developmentCurve: player.developmentCurve ?? catalogPlayer.developmentCurve,
    developmentBoost: player.developmentBoost ?? catalogPlayer.developmentBoost,
    hiddenPotential: player.hiddenPotential ?? catalogPlayer.hiddenPotential,
    signaturePlayer: player.signaturePlayer ?? catalogPlayer.signaturePlayer,
    foot: player.foot ?? catalogPlayer.foot,
    physique: player.physique ?? catalogPlayer.physique,
    playStyle: player.playStyle ?? catalogPlayer.playStyle,
    form: player.form ?? catalogPlayer.form,
    moral: player.moral ?? catalogPlayer.moral,
    fatigue: player.fatigue ?? catalogPlayer.fatigue,
    trust: player.trust ?? catalogPlayer.trust,
    seasonStats: player.seasonStats ?? catalogPlayer.seasonStats,
    matchHistory: Array.isArray(player.matchHistory) ? player.matchHistory : catalogPlayer.matchHistory,
    timeline: Array.isArray(player.timeline) ? player.timeline : catalogPlayer.timeline,
    agentContract: player.agentContract ?? catalogPlayer.agentContract,
    careerGoal: player.careerGoal ?? catalogPlayer.careerGoal,
    scoutReport: player.scoutReport ?? catalogPlayer.scoutReport,
    traitRevealed: player.traitRevealed ?? catalogPlayer.traitRevealed,
    hiddenTrait: player.hiddenTrait ?? catalogPlayer.hiddenTrait,
    lastInteractionWeek: player.lastInteractionWeek ?? catalogPlayer.lastInteractionWeek,
    // Preserve evolved attributes from saved state, fall back to catalog
    attributes: player.attributes && Object.keys(player.attributes).length > 0
      ? player.attributes
      : catalogPlayer.attributes,
  };
  return merged;
};

const chooseCatalogPlayer = ({ catalog, position, targetRating, usedIds, usedClubsThisBatch, eligibleClubs, allowedCountryCodes = null, maxRating = 99, salt = 0 }) => {
  const allowedCountrySet = allowedCountryCodes?.length ? new Set(allowedCountryCodes) : null;
  const collectCandidates = (relaxClubUniqueness = false) => catalog.filter((player) => {
    if (usedIds.has(player.id)) return false;
    if (!relaxClubUniqueness && usedClubsThisBatch.has(player.club)) return false;
    if (eligibleClubs.length && !eligibleClubs.some((club) => club.name === player.club)) return false;
    if (allowedCountrySet?.size && !allowedCountrySet.has(player.countryCode ?? player.clubCountryCode)) return false;
    if (position && player.position !== position) return false;
    if ((player.rating ?? 0) > maxRating) return false;
    return true;
  });
  let candidates = collectCandidates(false);
  if (!candidates.length) candidates = collectCandidates(true);
  if (!candidates.length) return null;

  return [...candidates].sort((a, b) => {
    const aScore = Math.abs((a.rating ?? 0) - targetRating) + seededFloat(hashStr(a.id), salt) * 2;
    const bScore = Math.abs((b.rating ?? 0) - targetRating) + seededFloat(hashStr(b.id), salt) * 2;
    return aScore - bScore;
  })[0] ?? null;
};

/**
 * Construit le marché à partir du catalogue de joueurs du jeu.
 */
export const drawMarketPlayers = ({
  reputation = 12,
  scoutLevel = 0,
  season = 1,
  existingIds = [],
  positionQuota = MARKET_POSITION_QUOTA,
  agencyCountryCode = 'FR',
  allowedCountryCodes = null,
}) => {
  const usedIds = new Set(existingIds);
  const usedClubsThisBatch = new Set();
  const result = [];
  const marketCountryCodes = allowedCountryCodes?.length
    ? allowedCountryCodes
    : getMarketCountryCodes({ agencyCountryCode, reputation, scoutLevel });
  const marketCountrySet = new Set(marketCountryCodes);
  const eligibleClubs = getEligibleClubs(reputation, { agencyCountryCode, scoutLevel, allowedCountryCodes: marketCountryCodes });
  const catalog = createPlayerCatalog(season);
  const rep = getMarketReputationScore(reputation);
  const targetRating = clamp(54 + rep * 0.28 + scoutLevel * 1.6, 50, 91);
  const maxRating = getMarketRatingCeiling(reputation, scoutLevel);
  const specialGabriel = catalog.find((player) => player.id === GABRIEL_FIXIO_ID);

  for (const position of positionQuota) {
    if (
      position === specialGabriel?.position
      && !usedIds.has(specialGabriel.id)
      && !usedClubsThisBatch.has(specialGabriel.club)
      && marketCountrySet.has(specialGabriel.countryCode ?? specialGabriel.clubCountryCode)
    ) {
      result.push({ ...specialGabriel });
      usedIds.add(specialGabriel.id);
      usedClubsThisBatch.add(specialGabriel.club);
      continue;
    }

    const player = chooseCatalogPlayer({
      catalog,
      position,
      targetRating,
      usedIds,
      usedClubsThisBatch,
      eligibleClubs,
      allowedCountryCodes: marketCountryCodes,
      maxRating,
      salt: result.length,
    });
    if (player) {
      result.push({ ...player });
      usedIds.add(player.id);
      usedClubsThisBatch.add(player.club);
      continue;
    }

    const fallback = chooseCatalogPlayer({
      catalog,
      position: null,
      targetRating,
      usedIds,
      usedClubsThisBatch,
      eligibleClubs,
      allowedCountryCodes: marketCountryCodes,
      maxRating,
      salt: result.length + 11,
    });
    if (fallback) {
      result.push({ ...fallback });
      usedIds.add(fallback.id);
      usedClubsThisBatch.add(fallback.club);
    }
  }

  return result;
};

/**
 * Génère les agents libres avec quota de postes.
 */
export const drawFreeAgents = ({
  reputation = 12,
  scoutLevel = 0,
  season = 1,
  existingIds = [],
  positionQuota = FREE_AGENT_POSITION_QUOTA,
  agencyCountryCode = 'FR',
  allowedCountryCodes = null,
}) => {
  const usedIds = new Set(existingIds);
  const result = [];
  const marketCountryCodes = allowedCountryCodes?.length
    ? allowedCountryCodes
    : getMarketCountryCodes({ agencyCountryCode, reputation, scoutLevel });
  const eligibleClubs = getEligibleClubs(Math.max(0, reputation - 12), { agencyCountryCode, scoutLevel, allowedCountryCodes: marketCountryCodes });
  const catalog = createPlayerCatalog(season);
  const rep = getMarketReputationScore(reputation);
  const targetRating = clamp(50 + rep * 0.22, 50, 82);
  const maxRating = Math.max(58, getMarketRatingCeiling(reputation, scoutLevel) - 4);

  for (const position of positionQuota) {
    const player = chooseCatalogPlayer({
      catalog,
      position,
      targetRating,
      usedIds,
      usedClubsThisBatch: new Set(),
      eligibleClubs,
      allowedCountryCodes: marketCountryCodes,
      maxRating,
      salt: result.length + 31,
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

/**
 * Tire des prospects U21 pour le marché (scouting jeunes).
 * Retourne `count` prospects de clubs éligibles.
 */
export const drawProspects = ({
  reputation = 12,
  scoutLevel = 0,
  season = 1,
  existingIds = [],
  count = 4,
  agencyCountryCode = 'FR',
  allowedCountryCodes = null,
}) => {
  const usedIds = new Set(existingIds);
  const marketCountryCodes = allowedCountryCodes?.length
    ? allowedCountryCodes
    : getMarketCountryCodes({ agencyCountryCode, reputation, scoutLevel });
  const marketCountrySet = new Set(marketCountryCodes);
  const eligibleClubs = getEligibleClubs(Math.max(8, reputation - 8), { agencyCountryCode, scoutLevel, allowedCountryCodes: marketCountryCodes });
  const catalog = createPlayerCatalog(season);
  const result = [];
  const shuffled = [...eligibleClubs].sort((a, b) => seededFloat(hashStr(a.name), 91) - seededFloat(hashStr(b.name), 91));

  for (const club of shuffled) {
    if (result.length >= count) break;
    const candidate = catalog
      .filter((player) => player.club === club.name && player.isProspect)
      .filter((player) => marketCountrySet.has(player.countryCode ?? player.clubCountryCode))
      .find((player) => !usedIds.has(player.id));
    if (candidate) {
      result.push({ ...candidate });
      usedIds.add(candidate.id);
    }
  }
  return result;
};

// ── Helpers internes ──────────────────────────────────────────────────────────

const getMarketReputationScore = (reputation = 0) => {
  const rep = Number.isFinite(reputation) ? reputation : 0;
  return Math.max(0, rep > 100 ? Math.floor(rep / 10) : rep);
};

export const getMarketCountryCodes = ({
  agencyCountryCode = 'FR',
  reputation = 0,
  scoutLevel = 0,
} = {}) => {
  const homeCountry = COUNTRIES.some((country) => country.code === agencyCountryCode)
    ? agencyCountryCode
    : 'FR';
  const rep = getMarketReputationScore(reputation);
  const reach = rep + Math.max(0, scoutLevel) * 8;

  if (reach < 35) return [homeCountry];

  const countryLimit = reach < 50 ? 2 : reach < 65 ? 4 : reach < 80 ? 6 : COUNTRIES.length;
  const unlocked = COUNTRIES
    .filter((country) => country.code !== homeCountry && reach >= country.minReputation)
    .sort((a, b) => (a.minReputation - b.minReputation) || (b.marketWeight - a.marketWeight))
    .slice(0, Math.max(0, countryLimit - 1))
    .map((country) => country.code);

  return [homeCountry, ...unlocked];
};

const getEligibleClubs = (reputation, {
  agencyCountryCode = 'FR',
  scoutLevel = 0,
  allowedCountryCodes = null,
} = {}) => {
  const rep = getMarketReputationScore(reputation);
  let allowedTiers;
  if (rep >= 75)      allowedTiers = [1, 2];
  else if (rep >= 50) allowedTiers = [1, 2, 3];
  else if (rep >= 30) allowedTiers = [2, 3];
  else if (rep >= 15) allowedTiers = [3, 4];
  else                allowedTiers = [4];
  const countryCodes = allowedCountryCodes?.length
    ? allowedCountryCodes
    : getMarketCountryCodes({ agencyCountryCode, reputation, scoutLevel });
  const countrySet = new Set(countryCodes);
  const countryClubs = CLUBS.filter((club) => !countrySet.size || countrySet.has(club.countryCode));
  const tierClubs = countryClubs.filter((club) => allowedTiers.includes(club.tier));
  if (tierClubs.length) return tierClubs;
  return countryClubs.length ? countryClubs : CLUBS.filter((club) => allowedTiers.includes(club.tier));
};

const drawOnePlayer = ({ position, eligibleClubs, usedIds, usedClubsThisBatch, season, scoutLevel, reputation }) => {
  const slotsForPosition = SQUAD_SLOTS
    .map((slot, idx) => ({ slot, idx }))
    .filter(({ slot }) => slot.position === position);

  const shuffled = [...eligibleClubs].sort(() => Math.random() - 0.5);

  for (const club of shuffled) {
    if (usedClubsThisBatch.has(club.name)) continue;

    const orderedSlots = [...slotsForPosition].sort((a, b) => b.slot.starter - a.slot.starter);

    for (const { idx } of orderedSlots) {
      const player = buildSquadPlayer(club, idx, season);
      if (usedIds.has(player.id)) continue;

      const maxRatingForRep = 58 + Math.floor(reputation / 2) + scoutLevel * 2;
      if (reputation < 40 && player.rating > maxRatingForRep) continue;

      return player;
    }
  }
  return null;
};

const buildFallbackPlayer = () => null;
