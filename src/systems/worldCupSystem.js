/**
 * worldCupSystem.js
 * Tournoi Mondial 2026 — se joue entre la saison 1 et la saison 2 (été 2026).
 * Toutes les 4 saisons ensuite (2030, 2034…).
 *
 * Phases :
 *   groupes    — 2 semaines d'inter-saison (weekOffset 1-2)
 *   huitièmes  — weekOffset 3
 *   quarts     — weekOffset 4
 *   demies     — weekOffset 5
 *   finale     — weekOffset 6
 *
 * Impact joueur :
 *   - Sélectionné ou non selon rating + moral
 *   - Performances individuelles avec events spéciaux
 *   - La valeur marchande peut monter de 10-40% pour les héros du tournoi
 */

import { CLUBS } from '../data/clubs';
import { createPlayerCatalog } from '../data/squadDatabase';
import { rand, makeId } from '../utils/helpers';
import { simulateMatch } from '../engine/matchEngine';

// Pays représentés avec drapeaux et noms
export const NATIONAL_TEAMS = [
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'ES', flag: '🇪🇸', name: 'Espagne' },
  { code: 'EN', flag: '🇬🇧', name: 'Angleterre' },
  { code: 'DE', flag: '🇩🇪', name: 'Allemagne' },
  { code: 'IT', flag: '🇮🇹', name: 'Italie' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal' },
  { code: 'BR', flag: '🇧🇷', name: 'Brésil' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentine' },
  { code: 'SN', flag: '🇸🇳', name: 'Sénégal' },
  { code: 'MA', flag: '🇲🇦', name: 'Maroc' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexique' },
  { code: 'US', flag: '🇺🇸', name: 'États-Unis' },
  { code: 'JP', flag: '🇯🇵', name: 'Japon' },
  { code: 'KR', flag: '🇰🇷', name: 'Corée du Sud' },
  { code: 'NL', flag: '🇳🇱', name: 'Pays-Bas' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgique' },
  { code: 'HR', flag: '🇭🇷', name: 'Croatie' },
  { code: 'DK', flag: '🇩🇰', name: 'Danemark' },
  { code: 'CI', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: 'CM', flag: '🇨🇲', name: 'Cameroun' },
  { code: 'EG', flag: '🇪🇬', name: 'Égypte' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombie' },
  { code: 'UY', flag: '🇺🇾', name: 'Uruguay' },
  { code: 'AU', flag: '🇦🇺', name: 'Australie' },
  { code: 'TR', flag: '🇹🇷', name: 'Turquie' },
  { code: 'PL', flag: '🇵🇱', name: 'Pologne' },
  { code: 'SE', flag: '🇸🇪', name: 'Suède' },
  { code: 'CH', flag: '🇨🇭', name: 'Suisse' },
  { code: 'UA', flag: '🇺🇦', name: 'Ukraine' },
  { code: 'RO', flag: '🇷🇴', name: 'Roumanie' },
];

export const WC_PHASES = ['groupes', 'huitièmes', 'quarts', 'demies', 'finale'];

const WC_COUNTRY_ALIASES = {
  GB: 'EN',
  ENG: 'EN',
  UK: 'EN',
  CR: 'HR',
  KO: 'KR',
  USA: 'US',
};

const normalizeWcCountryCode = (countryCode = '') => WC_COUNTRY_ALIASES[countryCode] ?? countryCode;

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const buildVirtualSquad = (ratingBase = 72, code = 'NT') =>
  Array.from({ length: 11 }, (_x, idx) => ({
    id: `${code}_${idx + 1}`,
    rating: ratingBase + ((idx % 5) - 2),
    form: 64,
    attributes: { shooting: { current: 10 }, passing: { current: 10 } },
    roleId: idx <= 1 ? 'center_back' : idx <= 4 ? 'central_mid' : 'striker',
    position: idx === 0 ? 'GK' : idx <= 4 ? 'DEF' : idx <= 7 ? 'MIL' : 'ATT',
  }));

export const getWorldCupFixturePreview = (player, phase, wcState = {}) => {
  const country = NATIONAL_TEAMS.find((t) => t.code === player.countryCode);
  if (!country) return null;
  const opponents = NATIONAL_TEAMS.filter((t) => t.code !== player.countryCode);
  if (!opponents.length) return null;
  const seed = hashString(`${player.countryCode}:${phase}:${wcState.year ?? ''}:${wcState.weekOffset ?? 0}`);
  const opponent = opponents[seed % opponents.length];

  return {
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    countryCode: country.code,
    countryName: country.name,
    countryFlag: country.flag,
    opponentCode: opponent.code,
    opponent: opponent.name,
    opponentFlag: opponent.flag,
    phase,
    label: phase === 'groupes' ? `Match de groupes` : `Match de ${phase}`,
  };
};

/**
 * Déclenche le Tournoi Mondial si on est à la bonne saison.
 * La CdM 2026 se joue entre la saison 1 et la saison 2 (week 38→39).
 * Ensuite toutes les 4 saisons (saison 5, 9…).
 */
export const shouldTriggerWorldCup = (season, worldCupState) => {
  if (worldCupState && worldCupState.phase !== 'done') return false; // déjà en cours
  // CdM 2026: après saison 1. CdM 2030: après saison 5. CdM 2034: saison 9...
  return ((season - 1) % 4) === 0;
};

/**
 * Crée un état CdM initial avec une liste de sélectionnés potentiels.
 */
export const createWorldCupState = (season, roster, context = {}) => {
  const year = 2026 + (season - 1);
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const wcNationCodes = new Set(NATIONAL_TEAMS.map((team) => team.code));
  const liveRoster = Array.isArray(roster) ? roster : [];
  const liveById = new Map(liveRoster.map((player) => [player.id, player]));
  const catalog = createPlayerCatalog(season);
  const mergedPool = catalog
    .map((candidate) => {
      const live = liveById.get(candidate.id);
      const merged = live ? { ...candidate, ...live } : candidate;
      const normalizedCode = normalizeWcCountryCode(merged.countryCode);
      return { ...merged, countryCode: normalizedCode };
    })
    .filter((player) => wcNationCodes.has(player.countryCode))
    .filter((player) => !player.freeAgent && (player.injured ?? 0) <= 0 && (player.rating ?? 0) >= 120);

  const byCountry = mergedPool.reduce((acc, player) => {
    const key = player.countryCode;
    if (!acc[key]) acc[key] = [];
    acc[key].push(player);
    return acc;
  }, {});

  const quotaByPosition = { GK: 2, DEF: 4, MIL: 4, ATT: 3 };
  const selectedPlayers = [];
  Object.entries(byCountry).forEach(([countryCode, players]) => {
    const profiled = players
      .map((player) => ({ player, ...getWorldCupSelectionProfile(player) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    const selectedIds = new Set();
    Object.entries(quotaByPosition).forEach(([position, quota]) => {
      const positionPool = profiled.filter((entry) => entry.player.position === position).slice(0, quota);
      positionPool.forEach((entry) => {
        selectedIds.add(entry.player.id);
        selectedPlayers.push(entry);
      });
    });
    profiled.slice(0, 18).forEach((entry) => {
      if (!selectedIds.has(entry.player.id) && selectedIds.size < 18) {
        selectedIds.add(entry.player.id);
        selectedPlayers.push(entry);
      }
    });
  });

  const normalizedSelectedPlayers = selectedPlayers
    .sort((a, b) => b.score - a.score)
    .map(({ player, score, starterChance, note }) => {
      const country = NATIONAL_TEAMS.find((team) => team.code === player.countryCode);
      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        countryCode: player.countryCode,
        countryName: country?.name ?? player.countryCode,
        countryFlag: country?.flag ?? player.countryFlag,
        club: player.club,
        position: player.position,
        rating: player.rating,
        form: player.form ?? 60,
        moral: player.moral ?? 50,
        group: null,
        goals: 0,
        assists: 0,
        avgRating: 0,
        appearances: 0,
        eliminated: false,
        champion: false,
        selectionScore: Number(score.toFixed(1)),
        starterChance: Number(starterChance.toFixed(2)),
        selectionNote: note,
      };
    });

  const countryCodes = [...new Set(normalizedSelectedPlayers.map((player) => player.countryCode))];
  const countryGroupMap = countryCodes.reduce((map, code, index) => ({
    ...map,
    [code]: groupLetters[index % groupLetters.length],
  }), {});
  const groupedSelectedPlayers = normalizedSelectedPlayers.map((player) => ({
    ...player,
    group: countryGroupMap[player.countryCode] ?? groupLetters[0],
  }));

  return {
    year,
    season,
    phase: 'groupes',
    weekOffset: 0,
    selectedPlayers: groupedSelectedPlayers,
    drawGroups: groupLetters.reduce((acc, group) => ({ ...acc, [group]: [] }), {}),
    countryPressure: groupedSelectedPlayers.reduce((acc, player) => {
      if (!player.countryCode) return acc;
      const base = player.rating >= 160 ? 72 : player.rating >= 144 ? 60 : 48;
      return { ...acc, [player.countryCode]: Math.max(acc[player.countryCode] ?? 0, base) };
    }, {}),
    results: [], // matchs joués
    champion: null, // pays vainqueur
    heritageCards: [],
  };
};

/** Pays "favoris" — probabilité de progression plus élevée */
const FAVORITES = new Set(['FR', 'ES', 'EN', 'DE', 'BR', 'AR', 'PT', 'IT']);

const getNationalTeamStrength = (countryCode) => {
  if (FAVORITES.has(countryCode)) return rand(72, 85);
  return rand(55, 73);
};

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const getWorldCupSelectionProfile = (player) => {
  if (!player || player.freeAgent || !player.countryCode) {
    return { score: -Infinity, starterChance: 0, note: 'Non éligible' };
  }
  if ((player.injured ?? 0) > 0) {
    return { score: -Infinity, starterChance: 0, note: 'Blessé' };
  }

  const stats = player.seasonStats ?? {};
  const appearances = stats.appearances ?? 0;
  const avgRating = stats.averageRating && stats.averageRating > 0
    ? stats.averageRating
    : ((player.form ?? player.rating ?? 60) / 10);
  const recentForm = player.form ?? 60;
  const moral = player.moral ?? 50;
  const clubRole = player.clubRole ?? 'Rotation';
  const roleBonus = clubRole === 'Star' ? 8 : clubRole === 'Titulaire' ? 5 : clubRole === 'Rotation' ? 1 : -8;
  const workloadBonus = appearances >= 24 ? 4 : appearances >= 16 ? 2 : appearances >= 8 ? 1 : -2;
  const injuryPenalty = (stats.injuries ?? 0) * 5;
  const fatiguePenalty = (player.fatigue ?? 20) > 82 ? 4 : 0;

  const score =
    (player.rating - 60) * 1.2 +
    (recentForm - 50) * 0.48 +
    (avgRating - 6.4) * 14 +
    (moral - 50) * 0.18 +
    roleBonus +
    workloadBonus -
    injuryPenalty -
    fatiguePenalty;

  const starterChance = clampNumber(0.24 + (score / 120) + (clubRole === 'Star' ? 0.14 : clubRole === 'Titulaire' ? 0.06 : 0), 0.18, 0.95);

  return {
    score,
    starterChance,
    note:
      clubRole === 'Star' ? 'Indiscutable en club'
      : clubRole === 'Titulaire' ? 'Solide titulaire'
        : clubRole === 'Rotation' ? 'Dans la rotation'
          : 'Situation fragile',
  };
};

export const getWorldCupInterestClubs = (player, wcMatch) => {
  if (!player || !wcMatch) return [];

  const momentum = (wcMatch.matchRating ?? 0) + (wcMatch.goals ?? 0) * 1.7 + (wcMatch.assists ?? 0) * 1.1 + (wcMatch.isChampion ? 2.5 : 0);
  const totalScore = momentum + (player.rating ?? 0) / 20;
  if (totalScore < 13.5) return [];

  const tierMax = wcMatch.isChampion || totalScore >= 18 ? 2 : totalScore >= 15.5 ? 3 : 4;
  const tierMin = totalScore >= 19 ? 1 : wcMatch.goals >= 2 ? 2 : 3;
  const clubs = CLUBS
    .filter((club) => club.name !== player.club)
    .filter((club) => club.tier >= tierMin && club.tier <= tierMax)
    .filter((club) => club.countryCode !== player.countryCode || Math.random() < 0.35)
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

  const limit = wcMatch.isChampion || wcMatch.goals >= 2 || wcMatch.matchRating >= 8.5 ? 3 : 2;
  return clubs.slice(0, limit).map((club) => club.name);
};

/**
 * Simule un match de CdM pour un joueur individuel pendant une phase donnée.
 */
export const simulateWorldCupMatch = (player, phase, wcState) => {
  const playerEntry = wcState.selectedPlayers.find((s) => s.playerId === player.id);
  if (!playerEntry || playerEntry.eliminated) return null;

  const country = NATIONAL_TEAMS.find((t) => t.code === player.countryCode);
  if (!country) return null;

  const ownStrength = getNationalTeamStrength(player.countryCode) + (player.rating - 70) * 0.3;
  const fixturePreview = getWorldCupFixturePreview(player, phase, wcState);
  const opponent = fixturePreview
    ? NATIONAL_TEAMS.find((t) => t.code === fixturePreview.opponentCode) ?? NATIONAL_TEAMS.find((t) => t.code !== player.countryCode)
    : NATIONAL_TEAMS.find((t) => t.code !== player.countryCode);
  const oppStrength = getNationalTeamStrength(opponent.code);

  const sharedCountryMatch = (wcState.results ?? []).find((match) => (
    match.phase === phase
    && match.countryCode === player.countryCode
    && match.opponentCode === opponent.code
  ));

  let ownGoals = sharedCountryMatch?.goalsFor;
  let oppGoals = sharedCountryMatch?.goalsAgainst;
  let result = sharedCountryMatch?.result;
  let score = sharedCountryMatch?.score;
  let decidedBy = sharedCountryMatch?.decidedBy ?? null;

  if (!Number.isFinite(ownGoals) || !Number.isFinite(oppGoals) || !result) {
    const simulation = simulateMatch({
      homePlayers: buildVirtualSquad(Math.round(ownStrength), `${player.countryCode}_${phase}_${wcState.year}_h`),
      awayPlayers: buildVirtualSquad(Math.round(oppStrength), `${opponent.code}_${phase}_${wcState.year}_a`),
      homeTeamName: country.name,
      awayTeamName: opponent.name,
      seed: hashString(`${player.countryCode}:${opponent.code}:${wcState.year}:${phase}:worldcup`),
    });
    ownGoals = simulation.homeGoals;
    oppGoals = simulation.awayGoals;
    result = ownGoals > oppGoals ? 'win' : ownGoals < oppGoals ? 'loss' : 'draw';
    score = `${ownGoals}-${oppGoals}`;

    if (phase !== 'groupes' && ownGoals === oppGoals) {
      const tieSeed = hashString(`${player.countryCode}:${opponent.code}:${wcState.year}:${phase}:shootout`);
      const ownTieScore = ownStrength + (tieSeed % 16);
      const oppTieScore = oppStrength + ((tieSeed >> 4) % 16);
      result = ownTieScore >= oppTieScore ? 'win' : 'loss';
      decidedBy = tieSeed % 3 === 0 ? 'extra_time' : 'penalties';
      score = decidedBy === 'extra_time'
        ? `${ownGoals + (result === 'win' ? 1 : 0)}-${oppGoals + (result === 'loss' ? 1 : 0)} a.p.`
        : `${ownGoals}-${oppGoals} (${result === 'win' ? 'victoire' : 'défaite'} tab)`;
    }
  }

  // Performances individuelles
  const isStarter = Math.random() < (playerEntry.starterChance ?? (player.rating >= 150 ? 0.85 : 0.6));
  const minutes = isStarter
    ? rand(playerEntry.starterChance >= 0.8 ? 72 : playerEntry.starterChance >= 0.66 ? 64 : 58, 90)
    : rand(0, playerEntry.starterChance >= 0.45 ? 35 : 28);
  if (minutes === 0) return null;

  const profile = {
    ATT: { g: 0.28, a: 0.12 },
    MIL: { g: 0.10, a: 0.22 },
    DEF: { g: 0.04, a: 0.07 },
    GK: { g: 0.001, a: 0.003 },
  }[player.position] ?? { g: 0.1, a: 0.1 };

  const goals = ownGoals > 0 && Math.random() < profile.g + player.rating / 750
    ? Math.min(ownGoals, rand(1, player.position === 'ATT' ? 2 : 1))
    : 0;
  const assists = ownGoals - goals > 0 && Math.random() < profile.a ? 1 : 0;
  const keyPasses = player.position === 'ATT' || player.position === 'MIL'
    ? rand(0, Math.max(0, minutes > 70 ? 5 : 3))
    : rand(0, 2);
  const baseRating = 6 + goals * 0.9 + assists * 0.5 + (result === 'win' ? 0.4 : result === 'loss' ? -0.3 : 0) + rand(-6, 7) / 10;
  const matchRating = Number(Math.min(10, Math.max(4.5, baseRating)).toFixed(1));

  // Élimination en phase finale (knockout)
  const isEliminated = phase !== 'groupes' && result === 'loss';
  const isChampion = phase === 'finale' && result === 'win';

  return {
    id: makeId('wc'),
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    countryCode: country.code,
    countryFlag: country.flag,
    countryName: country.name,
    opponentCode: opponent.code,
    opponentFlag: opponent.flag,
    phase,
    opponent: opponent.name,
    score,
    goalsFor: ownGoals,
    goalsAgainst: oppGoals,
    result,
    decidedBy,
    minutes,
    goals,
    assists,
    keyPasses,
    matchRating,
    isEliminated,
    isChampion,
    fixturePreview,
    selectionScore: playerEntry.selectionScore ?? null,
    starterChance: playerEntry.starterChance ?? null,
    starter: isStarter,
    matchReport: `Note ${matchRating}/10 · ${goals} but${goals > 1 ? 's' : ''}${assists ? ` · ${assists} passe${assists > 1 ? 's' : ''}` : ''}${keyPasses ? ` · ${keyPasses} passes clés` : ''}`,
  };
};

/**
 * Avance la phase de la CdM.
 */
export const advanceWorldCupPhase = (wcState) => {
  const idx = WC_PHASES.indexOf(wcState.phase);
  if (idx < 0 || idx >= WC_PHASES.length - 1) return { ...wcState, phase: 'done' };
  return { ...wcState, phase: WC_PHASES[idx + 1], weekOffset: wcState.weekOffset + 1 };
};

/**
 * Impact sur la valeur d'un joueur après la CdM.
 */
export const getWorldCupValueMultiplier = (playerResult) => {
  if (!playerResult) return 1;
  if (playerResult.isChampion) return 1.45;
  if (playerResult.goals >= 3) return 1.32;
  if (playerResult.goals >= 1 || playerResult.assists >= 2) return 1.18;
  if (playerResult.avgRating >= 8) return 1.15;
  if (playerResult.avgRating >= 7) return 1.08;
  return 1.0;
};

/**
 * Génère le texte de news pour un résultat CdM.
 */
export const getWorldCupMatchNews = (player, wcMatch) => {
  if (!wcMatch) return null;
  const country = NATIONAL_TEAMS.find((t) => t.code === player.countryCode);
  const flag = country?.flag ?? '🌍';

  let text = '';
  if (wcMatch.isChampion) {
    text = `🏆 CHAMPION DU MONDE ! ${flag} ${player.firstName} ${player.lastName} soulève le Tournoi Mondial avec ${country?.name}. Moment historique.`;
  } else if (wcMatch.isEliminated) {
    text = `💔 Élimination — ${flag} ${country?.name} quitte le Tournoi Mondial en ${wcMatch.phase}. ${player.firstName} ${player.lastName} rentre à son club.`;
  } else if (wcMatch.goals >= 2) {
    text = `🌍 ${flag} Doublé en Tournoi Mondial ! ${player.firstName} ${player.lastName} marque 2 fois contre ${wcMatch.opponent} (${wcMatch.score}) en ${wcMatch.phase}.`;
  } else if (wcMatch.goals >= 1) {
    text = `🌍 ${flag} But en Tournoi Mondial — ${player.firstName} ${player.lastName} contre ${wcMatch.opponent} (${wcMatch.score}). Note ${wcMatch.matchRating}/10.`;
  } else if (wcMatch.matchRating >= 8) {
    text = `🌍 ${flag} Prestation XXL de ${player.firstName} ${player.lastName} en Tournoi Mondial. Note ${wcMatch.matchRating}/10 contre ${wcMatch.opponent}.`;
  } else {
    return null;
  }

  return {
    type: 'media',
    text,
    reputationImpact: wcMatch.isChampion ? 15 : wcMatch.goals >= 2 ? 5 : 3,
    valueImpact: getWorldCupValueMultiplier(wcMatch),
  };
};
