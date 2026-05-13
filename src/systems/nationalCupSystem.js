/**
 * nationalCupSystem.js
 * Coupes nationales : Coupe de France, FA Cup, Copa del Rey, DFB Pokal, Coppa Italia.
 * Bracket simplifié à 16 équipes par pays.
 */
import { CLUBS } from '../data/clubs';

export const NATIONAL_CUPS = {
  FR: { id: 'cup_fr', name: 'Coupe de France',  countryCode: 'FR', flag: '🇫🇷', color: '#0055A4' },
  EN: { id: 'cup_en', name: 'FA Cup',           countryCode: 'EN', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#CE1126' },
  ES: { id: 'cup_es', name: 'Copa del Rey',     countryCode: 'ES', flag: '🇪🇸', color: '#FFC400' },
  DE: { id: 'cup_de', name: 'DFB Pokal',        countryCode: 'DE', flag: '🇩🇪', color: '#000000' },
  IT: { id: 'cup_it', name: 'Coppa Italia',     countryCode: 'IT', flag: '🇮🇹', color: '#008C45' },
};

const ROUND_LABELS = ['16es', '8es', 'Quarts', 'Demis', 'Finale'];
// Roughly map to season weeks
const ROUND_WEEKS = [6, 12, 20, 28, 35];

const seedClubs = (countryCode) => {
  const clubs = CLUBS.filter((c) => c.countryCode === countryCode);
  // sort by tier asc (best=1)
  const sorted = clubs.sort((a, b) => (a.tier ?? 4) - (b.tier ?? 4)).slice(0, 16);
  // pad if needed
  while (sorted.length < 16 && clubs.length) sorted.push(clubs[sorted.length % clubs.length]);
  return sorted;
};

export const buildNationalCupBracket = (countryCode, season = 1) => {
  const cup = NATIONAL_CUPS[countryCode];
  if (!cup) return null;
  const clubs = seedClubs(countryCode);
  const matches = [];
  for (let i = 0; i < clubs.length; i += 2) {
    matches.push({
      id: `${cup.id}_r0_${i / 2}`,
      home: clubs[i]?.name,
      away: clubs[i + 1]?.name,
      round: 0,
      played: false,
    });
  }
  return {
    id: cup.id,
    countryCode,
    season,
    rounds: [
      { label: ROUND_LABELS[0], week: ROUND_WEEKS[0], matches },
    ],
    currentRound: 0,
    winner: null,
  };
};

const simulateMatch = (homeName, awayName) => {
  const homeClub = CLUBS.find((c) => c.name === homeName);
  const awayClub = CLUBS.find((c) => c.name === awayName);
  const homeStrength = (5 - (homeClub?.tier ?? 4)) + 0.5; // home advantage
  const awayStrength = (5 - (awayClub?.tier ?? 4));
  const totalGoals = Math.floor(Math.random() * 4) + 1;
  const homeShare = homeStrength / (homeStrength + awayStrength);
  const homeGoals = Math.round(totalGoals * homeShare);
  let awayGoals = totalGoals - homeGoals;
  if (homeGoals === awayGoals) {
    if (Math.random() > 0.5) awayGoals += 1; else awayGoals = Math.max(0, awayGoals - 1);
    if (homeGoals === awayGoals) awayGoals -= 1;
  }
  const winner = homeGoals > awayGoals ? homeName : awayName;
  return { homeGoals: Math.max(0, homeGoals), awayGoals: Math.max(0, awayGoals), winner };
};

export const advanceNationalCupBracket = (bracket, week) => {
  if (!bracket || bracket.winner) return bracket;
  const round = bracket.rounds[bracket.currentRound];
  if (!round || round.week > ((week - 1) % 38) + 1) return bracket;
  // play unplayed matches
  const playedMatches = round.matches.map((m) => {
    if (m.played) return m;
    const result = simulateMatch(m.home, m.away);
    return { ...m, ...result, played: true };
  });
  const updatedRound = { ...round, matches: playedMatches };
  const winners = playedMatches.map((m) => m.winner);
  const nextRoundIdx = bracket.currentRound + 1;
  if (nextRoundIdx >= ROUND_LABELS.length) {
    // Tournament over
    return {
      ...bracket,
      rounds: bracket.rounds.map((r, i) => i === bracket.currentRound ? updatedRound : r),
      winner: winners[0] ?? null,
    };
  }
  if (winners.length === 1) {
    return {
      ...bracket,
      rounds: bracket.rounds.map((r, i) => i === bracket.currentRound ? updatedRound : r),
      winner: winners[0],
    };
  }
  const nextMatches = [];
  for (let i = 0; i < winners.length; i += 2) {
    nextMatches.push({
      id: `${bracket.id}_r${nextRoundIdx}_${i / 2}`,
      home: winners[i],
      away: winners[i + 1],
      round: nextRoundIdx,
      played: false,
    });
  }
  return {
    ...bracket,
    rounds: [
      ...bracket.rounds.map((r, i) => i === bracket.currentRound ? updatedRound : r),
      { label: ROUND_LABELS[nextRoundIdx], week: ROUND_WEEKS[nextRoundIdx], matches: nextMatches },
    ],
    currentRound: nextRoundIdx,
  };
};

export const ensureNationalCups = (state) => {
  const season = Math.floor(((state.week ?? 1) - 1) / 38) + 1;
  const existing = state.nationalCups ?? {};
  const updated = { ...existing };
  Object.keys(NATIONAL_CUPS).forEach((code) => {
    if (!updated[code] || updated[code].season !== season) {
      updated[code] = buildNationalCupBracket(code, season);
    }
  });
  return { ...state, nationalCups: updated };
};

export const tickNationalCups = (state) => {
  const cups = state.nationalCups ?? {};
  const updated = {};
  Object.entries(cups).forEach(([code, bracket]) => {
    updated[code] = advanceNationalCupBracket(bracket, state.week ?? 1);
  });
  return { ...state, nationalCups: updated };
};
