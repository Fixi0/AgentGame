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
  { name: 'Maroc', code: 'MA' },
  { name: 'Sénégal', code: 'SN' },
  { name: 'Japon', code: 'JP' },
  { name: 'Mexique', code: 'MX' },
];

/**
 * Simule la semaine internationale pour le roster.
 * Retourne { selectedMatches: [...], events: [...], summary }
 */
export const simulateInternationalBreak = (roster = [], { seasonWeek = 1, week = 1, calledUpMap = null } = {}) => {
  const kind = getBreakKind(seasonWeek);
  const meta = BREAK_LABELS[kind];
  const selectedMatches = [];
  const events = [];

  for (const player of roster) {
    if (!isSelected(player, seasonWeek, calledUpMap)) continue;
    const seed = hashFloat(`intl:${player.id}:${seasonWeek}`);
    const opponent = NATIONAL_OPPONENTS[Math.floor(seed * NATIONAL_OPPONENTS.length)];
    const ownBase = Math.max(66, Math.min(90, (player.rating ?? 70) + ((player.form ?? 60) - 60) * 0.1));
    const oppBase = Math.max(66, Math.min(90, ownBase + Math.floor((hashFloat(`opp:${opponent.code}:${seasonWeek}`) - 0.5) * 10)));
    const simulation = simulateMatch({
      homePlayers: buildVirtualSquad(Math.round(ownBase), `${player.countryCode}_${seasonWeek}_home`),
      awayPlayers: buildVirtualSquad(Math.round(oppBase), `${opponent.code}_${seasonWeek}_away`),
      homeTeamName: player.countryCode ?? 'INTL',
      awayTeamName: opponent.name,
      seed: Math.floor(hashFloat(`intl-match:${player.id}:${seasonWeek}:${opponent.code}`) * 1_000_000_000),
    });
    const ownGoals = simulation.homeGoals;
    const oppGoals = simulation.awayGoals;
    const result = ownGoals > oppGoals ? 'win' : ownGoals < oppGoals ? 'loss' : 'draw';
    const minutes = seed > 0.7 ? 45 + Math.floor(seed * 45) : 60 + Math.floor(seed * 30);
    // Performance individuelle simple
    const playerGoal = (player.position === 'ATT' && hashFloat(`g:${player.id}:${seasonWeek}`) < 0.35 && ownGoals > 0) ? 1 : 0;
    const playerAssist = hashFloat(`a:${player.id}:${seasonWeek}`) < 0.18 && ownGoals - playerGoal > 0 ? 1 : 0;
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
      club: player.club,
      kind,
      kindLabel: meta.label,
      opponent: opponent.name,
      opponentCode: opponent.code,
      score: `${ownGoals}-${oppGoals}`,
      result,
      minutes,
      goals: playerGoal,
      assists: playerAssist,
      matchRating,
    });

    events.push({
      id: `intl_${kind}`,
      label: `${meta.emoji} ${meta.short} avec sa sélection`,
      good: true,
      money: playerGoal ? 800 : 200,
      rep: playerGoal ? 2 : 1,
      player: `${player.firstName} ${player.lastName}`,
      playerId: player.id,
      detail: `${player.firstName} ${player.lastName} · vs ${opponent.name} · ${ownGoals}-${oppGoals} · note ${matchRating}/10${playerGoal ? ' · 1 but' : ''}`,
    });
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
