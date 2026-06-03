/**
 * internationalBreakSystem.js
 * Trêves internationales : ~3 fois par saison, pas de match de club.
 * À la place, certains joueurs partent en sélection (amicaux ou qualifs mondiales).
 */
import { simulateMatch } from '../engine/matchEngine';
import { INTERNATIONAL_BREAK_WEEKS } from './competitionCalendarSystem';

// Semaines de saison (1..38) où il y a une trêve internationale.
// Réparties à peu près comme dans la vraie vie (sept, oct, nov, mars).
export const INTERNATIONAL_BREAK_SEASON_WEEKS = new Set(INTERNATIONAL_BREAK_WEEKS);

export const isInternationalBreakWeek = (seasonWeek) => INTERNATIONAL_BREAK_SEASON_WEEKS.has(seasonWeek);

// Type de trêve (alterne amical / qualif déterministe par semaine)
export const getBreakKind = (seasonWeek) => {
  if (seasonWeek === 6 || seasonWeek === 18) return 'qualif';
  return 'friendly';
};

const BREAK_LABELS = {
  qualif: { label: 'Éliminatoires Tournoi Mondial', short: 'Qualifs', emoji: '🌍' },
  friendly: { label: 'Match amical international', short: 'Amical', emoji: '🤝' },
};

const hashFloat = (str) => {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967295;
};

const buildVirtualSquad = (ratingBase = 72, code = 'INTL') =>
  Array.from({ length: 11 }, (_x, idx) => ({
    id: `${code}_${idx + 1}`,
    rating: ratingBase + ((idx % 5) - 2),
    form: 63,
    attributes: { shooting: { current: 10 }, passing: { current: 10 } },
    roleId: idx <= 1 ? 'center_back' : idx <= 4 ? 'central_mid' : 'striker',
    position: idx === 0 ? 'GK' : idx <= 4 ? 'DEF' : idx <= 7 ? 'MIL' : 'ATT',
  }));

// Déterministe : un joueur est sélectionné si son rating dépasse un seuil dépendant du pays.
const isSelected = (player, seasonWeek, calledUpMap = null) => {
  if (calledUpMap instanceof Map && calledUpMap.size) {
    return calledUpMap.has(player.id);
  }
  if (!player || (player.injured ?? 0) > 0) return false;
  const rating = player.rating ?? 70;
  const threshold = 74;
  if (rating < threshold) return false;
  // 65% des joueurs au-dessus du seuil sont convoqués
  return hashFloat(`call:${player.id}:${seasonWeek}`) < 0.65;
};

const NATIONAL_OPPONENTS = [
  { name: 'Argentine', code: 'AR' },
  { name: 'Brésil', code: 'BR' },
  { name: 'Espagne', code: 'ES' },
  { name: 'Allemagne', code: 'DE' },
  { name: 'Portugal', code: 'PT' },
  { name: 'Belgique', code: 'BE' },
  { name: 'Pays-Bas', code: 'NL' },
  { name: 'Croatie', code: 'HR' },
  { name: 'Ukraine', code: 'UA' },
  { name: 'Suisse', code: 'CH' },
  { name: 'Maroc', code: 'MA' },
  { name: 'Sénégal', code: 'SN' },
  { name: 'Japon', code: 'JP' },
  { name: 'Mexique', code: 'MX' },
];

const getCountryLabel = (countryCode = '') =>
  NATIONAL_OPPONENTS.find((country) => country.code === countryCode)?.name ?? countryCode;

const buildInternationalPairings = (countryCodes = [], seasonWeek = 1, kind = 'friendly') => {
  const selectedCodes = [...new Set(countryCodes.filter(Boolean))].sort((a, b) =>
    hashFloat(`intl-order:${b}:${seasonWeek}:${kind}`) - hashFloat(`intl-order:${a}:${seasonWeek}:${kind}`));
  const selectedSet = new Set(selectedCodes);
  const used = new Set();
  const pairings = new Map();
  const externalPool = NATIONAL_OPPONENTS
    .filter((country) => !selectedSet.has(country.code))
    .sort((a, b) => hashFloat(`intl-ext:${a.code}:${seasonWeek}:${kind}`) - hashFloat(`intl-ext:${b.code}:${seasonWeek}:${kind}`));

  selectedCodes.forEach((countryCode) => {
    if (used.has(countryCode)) return;
    const selectedOpponent = selectedCodes.find((candidate) => candidate !== countryCode && !used.has(candidate));
    const opponent = selectedOpponent
      ? { code: selectedOpponent, name: getCountryLabel(selectedOpponent) }
      : externalPool.find((candidate) => !used.has(candidate.code)) ?? NATIONAL_OPPONENTS.find((candidate) => candidate.code !== countryCode);
    if (!opponent) return;
    used.add(countryCode);
    used.add(opponent.code);
    const pair = {
      homeCode: countryCode,
      homeName: getCountryLabel(countryCode),
      awayCode: opponent.code,
      awayName: opponent.name,
    };
    pairings.set(countryCode, { ...pair, side: 'home' });
    pairings.set(opponent.code, { ...pair, side: 'away' });
  });

  return pairings;
};

/**
 * Simule la semaine internationale pour le roster.
 * Retourne { selectedMatches: [...], events: [...], summary }
 */
export const simulateInternationalBreak = (roster = [], { seasonWeek = 1, week = 1, calledUpMap = null } = {}) => {
  const kind = getBreakKind(seasonWeek);
  const meta = BREAK_LABELS[kind];
  const selectedMatches = [];
  const events = [];
  const selectedPlayers = roster.filter((player) => isSelected(player, seasonWeek, calledUpMap));
  const pairings = buildInternationalPairings(selectedPlayers.map((player) => player.countryCode), seasonWeek, kind);
  const groupedBySelection = selectedPlayers.reduce((groups, player) => {
    const countryCode = player.countryCode ?? 'INTL';
    const pairing = pairings.get(countryCode);
    if (!pairing) return groups;
    const key = `${pairing.homeCode}:${pairing.awayCode}:${seasonWeek}:${kind}`;
    if (!groups.has(key)) {
      groups.set(key, {
        homeCode: pairing.homeCode,
        homeName: pairing.homeName,
        awayCode: pairing.awayCode,
        awayName: pairing.awayName,
        playersByCountry: new Map(),
      });
    }
    const group = groups.get(key);
    const bucket = group.playersByCountry.get(countryCode) ?? [];
    bucket.push(player);
    group.playersByCountry.set(countryCode, bucket);
    return groups;
  }, new Map());

  for (const group of groupedBySelection.values()) {
    const { homeCode, homeName, awayCode, awayName, playersByCountry } = group;
    const homePlayers = playersByCountry.get(homeCode) ?? [];
    const awayPlayers = playersByCountry.get(awayCode) ?? [];
    const averageBase = (players, code) => Math.max(66, Math.min(92,
      players.length
        ? players.reduce((sum, player) => sum + ((player.rating ?? 70) + ((player.form ?? 60) - 60) * 0.1), 0) / players.length
        : 72 + Math.floor(hashFloat(`intl-base:${code}:${seasonWeek}`) * 15),
    ));
    const homeBase = averageBase(homePlayers, homeCode);
    const awayBase = averageBase(awayPlayers, awayCode);
    const simulation = simulateMatch({
      homePlayers: buildVirtualSquad(Math.round(homeBase), `${homeCode}_${seasonWeek}_home`),
      awayPlayers: buildVirtualSquad(Math.round(awayBase), `${awayCode}_${seasonWeek}_away`),
      homeTeamName: homeName,
      awayTeamName: awayName,
      seed: Math.floor(hashFloat(`intl-match:${homeCode}:${seasonWeek}:${awayCode}:${kind}`) * 1_000_000_000),
    });
    for (const [countryCode, players] of playersByCountry.entries()) {
      const isHome = countryCode === homeCode;
      const ownGoals = isHome ? simulation.homeGoals : simulation.awayGoals;
      const oppGoals = isHome ? simulation.awayGoals : simulation.homeGoals;
      const opponent = isHome
        ? { code: awayCode, name: awayName }
        : { code: homeCode, name: homeName };
      const result = ownGoals > oppGoals ? 'win' : ownGoals < oppGoals ? 'loss' : 'draw';
      let remainingGoals = ownGoals;
      let remainingAssists = ownGoals;
      const goalOrder = [...players].sort((a, b) => {
      const aScore = (a.position === 'ATT' ? 0.25 : a.position === 'MIL' ? 0.12 : 0.04) + hashFloat(`g:${a.id}:${seasonWeek}`);
      const bScore = (b.position === 'ATT' ? 0.25 : b.position === 'MIL' ? 0.12 : 0.04) + hashFloat(`g:${b.id}:${seasonWeek}`);
      return bScore - aScore;
    });
    const assistOrder = [...players].sort((a, b) => hashFloat(`a:${b.id}:${seasonWeek}`) - hashFloat(`a:${a.id}:${seasonWeek}`));
    const goalsByPlayer = new Map();
    const assistsByPlayer = new Map();
    goalOrder.forEach((player) => {
      if (remainingGoals <= 0) return;
      const chance = player.position === 'ATT' ? 0.62 : player.position === 'MIL' ? 0.34 : 0.16;
      if (hashFloat(`goal-share:${player.id}:${seasonWeek}`) < chance) {
        goalsByPlayer.set(player.id, 1);
        remainingGoals -= 1;
      }
    });
    assistOrder.forEach((player) => {
      if (remainingAssists <= 0) return;
      if ((goalsByPlayer.get(player.id) ?? 0) > 0 && players.length > 1) return;
      const chance = player.position === 'MIL' ? 0.48 : player.position === 'ATT' ? 0.32 : 0.18;
      if (hashFloat(`assist-share:${player.id}:${seasonWeek}`) < chance) {
        assistsByPlayer.set(player.id, 1);
        remainingAssists -= 1;
      }
    });

    for (const player of players) {
      const seed = hashFloat(`intl:${player.id}:${seasonWeek}`);
      const minutes = seed > 0.7 ? 45 + Math.floor(seed * 45) : 60 + Math.floor(seed * 30);
      const playerGoal = goalsByPlayer.get(player.id) ?? 0;
      const playerAssist = assistsByPlayer.get(player.id) ?? 0;
      const matchRating = Number(Math.min(10, Math.max(5,
        6.2
        + playerGoal * 0.9
        + playerAssist * 0.55
        + (result === 'win' ? 0.3 : result === 'loss' ? -0.25 : 0)
        + (hashFloat(`r:${player.id}:${seasonWeek}`) - 0.5)
      )).toFixed(1));

      selectedMatches.push({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        club: player.countryLabel ?? player.countryCode ?? countryCode,
        countryName: player.countryLabel ?? player.countryCode ?? countryCode,
        countryCode,
        kind,
        competitionLabel: meta.label,
        kindLabel: meta.label,
        opponent: opponent.name,
        opponentName: opponent.name,
        opponentCode: opponent.code,
        score: `${ownGoals}-${oppGoals}`,
        result,
        minutes,
        goals: playerGoal,
        assists: playerAssist,
        matchRating,
        sharedMatchId: `intl_${seasonWeek}_${kind}_${homeCode}_${awayCode}`,
      });

      events.push({
        id: `intl_${kind}`,
        label: `${meta.emoji} ${meta.short} avec sa sélection`,
        good: true,
        money: playerGoal ? 800 : 200,
        rep: playerGoal ? 2 : 1,
        player: `${player.firstName} ${player.lastName}`,
        playerId: player.id,
        detail: `${player.firstName} ${player.lastName} · ${player.countryLabel ?? countryCode} vs ${opponent.name} · ${ownGoals}-${oppGoals} · note ${matchRating}/10${playerGoal ? ' · 1 but' : ''}`,
      });
    }
    }
  }

  return {
    kind,
    meta,
    selectedMatches,
    events,
    summary: selectedMatches.length
      ? `${selectedMatches.length} joueur${selectedMatches.length > 1 ? 's' : ''} en sélection (${meta.label}).`
      : `Trêve internationale (${meta.label}). Aucun joueur convoqué cette fois.`,
  };
};
