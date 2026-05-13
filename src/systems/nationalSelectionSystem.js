/**
 * nationalSelectionSystem.js
 * Construit les listes de 23 joueurs des sélections nationales à partir
 * du catalogue complet des joueurs (4500+). Les listes sont déterministes
 * pour une (countryCode, season, window) donnée.
 */

import { COUNTRIES } from '../data/clubs';
import { createPlayerCatalog } from '../data/squadDatabase';

const hash = (s) => {
  let h = 2166136261 >>> 0;
  const str = String(s);
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

// Fenêtres FIFA officielles : ~1 toutes les 6 semaines
export const SELECTION_WINDOWS = [6, 11, 15, 27, 36];

/** Liste des nations qui publient une sélection. */
export const SELECTION_NATIONS = [
  { code: 'FR', name: 'Équipe de France', handle: '@equipedefrance', color: '#1d4ed8' },
  { code: 'BR', name: 'Seleção Brasileira', handle: '@cbf_futebol', color: '#facc15' },
  { code: 'AR', name: 'Selección Argentina', handle: '@afaseleccion', color: '#0ea5e9' },
  { code: 'ES', name: 'Selección Española', handle: '@sefutbol', color: '#dc2626' },
  { code: 'GB', name: 'England Football', handle: '@england', color: '#0b1d51' },
  { code: 'DE', name: 'Die Mannschaft', handle: '@dfb_team', color: '#111111' },
  { code: 'IT', name: 'Nazionale Italia', handle: '@azzurri', color: '#1e3a8a' },
  { code: 'PT', name: 'Seleção Portugal', handle: '@selecaoportugal', color: '#16a34a' },
  { code: 'NL', name: 'Oranje', handle: '@onsoranje', color: '#fb923c' },
  { code: 'BE', name: 'Belgian Red Devils', handle: '@belreddevils', color: '#b91c1c' },
  { code: 'CR', name: 'Hrvatska Reprezentacija', handle: '@hns_cff', color: '#dc2626' },
  { code: 'MA', name: 'Lions de l’Atlas', handle: '@equipedumaroc', color: '#16a34a' },
  { code: 'SN', name: 'Lions de la Téranga', handle: '@fsfofficielle', color: '#16a34a' },
  { code: 'CI', name: 'Éléphants', handle: '@fifofficiel', color: '#fb923c' },
  { code: 'CM', name: 'Lions Indomptables', handle: '@fecafootofficial', color: '#16a34a' },
  { code: 'NG', name: 'Super Eagles', handle: '@ngsuperEagles', color: '#16a34a' },
  { code: 'GH', name: 'Black Stars', handle: '@ghanafaofficial', color: '#dc2626' },
  { code: 'TR', name: 'Türkiye Millî Takımı', handle: '@millitakimlar', color: '#dc2626' },
];

const QUOTA = { GK: 3, DEF: 8, MIL: 7, ATT: 5 };

/**
 * Identifiant déterministe d'une fenêtre de convocation.
 * Le même (season, week) produit toujours la même liste.
 */
const windowKey = (season, week) => {
  const seasonWeek = ((week - 1) % 38) + 1;
  // Snap à la fenêtre FIFA la plus proche en arrière, sinon la dernière
  let win = SELECTION_WINDOWS[0];
  for (const w of SELECTION_WINDOWS) {
    if (seasonWeek >= w) win = w;
  }
  return `${season}-${win}`;
};

/**
 * Renvoie la liste des 23 d'une nation pour une fenêtre.
 * @param {string} countryCode
 * @param {number} season
 * @param {number} week
 * @param {Set<string>} agentPlayerIds — ids des joueurs sous contrat (priorisation)
 */
export const getNationalSquad = (countryCode, season = 1, week = 1, agentPlayerIds = new Set()) => {
  const catalog = createPlayerCatalog(season);
  const allCandidates = catalog.filter((p) => p && p.countryCode === countryCode);
  if (!allCandidates.length) return [];

  const key = windowKey(season, week);
  // Variance minime (±1.5) pour ne pas inverser l'ordre rating réel
  const variance = (id) => ((hash(`${id}-${key}`) % 100) / 100) * 1.5;

  // Score : rating + bonus tier club (top clubs très favorisés) + bonus âge senior
  // Pénalité forte pour <21 ans : on évite les très jeunes en sélection A
  const tierBonus = (tier) => (tier === 1 ? 14 : tier === 2 ? 7 : tier === 3 ? 1 : -8);
  const ageBonus = (age) => {
    if (age < 19) return -40;
    if (age < 21) return -18;
    if (age < 23) return -4;
    if (age <= 32) return 0;
    return -6;
  };
  const score = (p) =>
    (p.rating ?? 0) + tierBonus(p.clubTier ?? 4) + ageBonus(p.age ?? 24) + variance(p.id);

  // On filtre d'abord les U19 (jamais en sélection A) ; on les garde uniquement si manque cruel
  const seniors = allCandidates.filter((p) => (p.age ?? 24) >= 19);
  const candidates = (seniors.length >= 28 ? seniors : allCandidates).slice();
  candidates.sort((a, b) => score(b) - score(a));

  const taken = { GK: 0, DEF: 0, MIL: 0, ATT: 0 };
  const used = new Set();
  const squad = [];
  for (const p of candidates) {
    if (used.has(p.id)) continue;
    if ((taken[p.position] ?? 0) >= (QUOTA[p.position] ?? 0)) continue;
    squad.push(p);
    used.add(p.id);
    taken[p.position] += 1;
    if (squad.length >= 23) break;
  }

  // Garantir présence des joueurs de l'agence éligibles s'ils dépassent un seuil
  if (agentPlayerIds && agentPlayerIds.size) {
    const minRating = 138;
    const myEligible = candidates.filter((p) => agentPlayerIds.has(p.id) && (p.rating ?? 0) >= minRating);
    for (const p of myEligible) {
      if (used.has(p.id)) continue;
      const idx = [...squad].reverse().findIndex((q) => q.position === p.position);
      if (idx >= 0) {
        const realIdx = squad.length - 1 - idx;
        used.delete(squad[realIdx].id);
        squad[realIdx] = p;
        used.add(p.id);
      } else if (squad.length < 23) {
        squad.push(p);
        used.add(p.id);
      }
    }
  }

  return squad;
};

/** Toutes les sélections du moment. */
export const getAllNationalSquads = (season = 1, week = 1, agentPlayerIds = new Set()) =>
  SELECTION_NATIONS.map((nation) => ({
    nation: {
      ...nation,
      flag: COUNTRIES.find((c) => c.code === nation.code)?.flag ?? '',
    },
    squad: getNationalSquad(nation.code, season, week, agentPlayerIds),
  }));

/** Liste des joueurs de l'agence convoqués (id → nation). */
export const getCalledUpAgentPlayers = (season = 1, week = 1, agentPlayerIds = new Set()) => {
  const map = new Map();
  if (!agentPlayerIds || !agentPlayerIds.size) return map;
  for (const nation of SELECTION_NATIONS) {
    const squad = getNationalSquad(nation.code, season, week, agentPlayerIds);
    for (const p of squad) {
      if (agentPlayerIds.has(p.id)) map.set(p.id, nation);
    }
  }
  return map;
};

/** Helper : la semaine actuelle est-elle une fenêtre de convocation ? */
export const isSelectionWeek = (week = 1) => {
  const sw = ((week - 1) % 38) + 1;
  return SELECTION_WINDOWS.includes(sw);
};
