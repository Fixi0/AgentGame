/**
 * leaderboardSystem.js
 * Génère le classement des agences rivales fictives.
 * Les agences évoluent semaine après semaine en fonction de la saison.
 */

const RIVAL_AGENCIES = [
  {
    id: 'elite_sports',
    name: 'Elite Sports Group',
    city: 'Madrid',
    emblem: '🦁',
    color: '#d4a017',
    baseRep: 95,
    style: 'agressif',
    adjective: 'dominante',
  },
  {
    id: 'summit_mgmt',
    name: 'Summit Management',
    city: 'Londres',
    emblem: '🏆',
    color: '#1a73e8',
    baseRep: 88,
    style: 'prestige',
    adjective: 'établie',
  },
  {
    id: 'next_level',
    name: 'Next Level Agency',
    city: 'Paris',
    emblem: '⚔️',
    color: '#e83a3a',
    baseRep: 78,
    style: 'formation',
    adjective: 'montante',
  },
  {
    id: 'global_star',
    name: 'Global Star Partners',
    city: 'Milan',
    emblem: '🌟',
    color: '#16a34a',
    baseRep: 70,
    style: 'media',
    adjective: 'médiatique',
  },
];

/** Variation hebdomadaire pseudo-aléatoire mais déterministe par seed semaine+id */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getRivalRep(agency, week) {
  // Légère dérive chaque semaine — jamais trop loin de la base
  let rep = agency.baseRep;
  for (let i = 1; i <= week; i++) {
    const hash = i * 13 + agency.id.charCodeAt(0) * 7;
    const delta = (seededRandom(hash) - 0.48) * 2.5; // -1.2 à +1.3 par semaine
    rep = Math.min(100, Math.max(30, rep + delta));
  }
  return Math.round(rep);
}

/**
 * @param {number} playerRep — réputation de l'agence joueur
 * @param {number} week — semaine actuelle
 * @returns {Array} classement complet (joueur inclus)
 */
export function getRivalLeaderboard(playerRep, week, agencyProfile = {}) {
  const rivals = RIVAL_AGENCIES.map((agency) => ({
    id: agency.id,
    name: agency.name,
    city: agency.city,
    emblem: agency.emblem,
    color: agency.color,
    adjective: agency.adjective,
    rep: getRivalRep(agency, week),
    isPlayer: false,
  }));

  const playerEntry = {
    id: 'player',
    name: agencyProfile.name ?? 'Ton Agence',
    city: agencyProfile.city ?? '',
    emblem: agencyProfile.emblem ?? '⚡',
    color: agencyProfile.color ?? '#00a676',
    adjective: 'toi',
    rep: playerRep,
    isPlayer: true,
  };

  const all = [...rivals, playerEntry].sort((a, b) => b.rep - a.rep);
  return all.map((entry, i) => ({ ...entry, rank: i + 1 }));
}
