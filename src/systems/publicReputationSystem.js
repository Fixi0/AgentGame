import { rand } from '../utils/helpers';

const MAX_HIGHLIGHTS = 5;
const REGRESSION_RATE = 0.5;
const TRENDING_DECAY_WEEKS = 3;

export function createPublicRep(player) {
  return {
    score: Math.max(0, Math.min(100, 40 + rand(-10, 20))),
    trending: 'stable',
    lastEventWeek: 0,
    mediaPresence: player.brandValue ?? rand(20, 60),
    scandalCount: 0,
    highlights: [],
  };
}

function addHighlight(publicRep, week, label, delta) {
  const entry = { week, label, delta };
  const highlights = [entry, ...publicRep.highlights].slice(0, MAX_HIGHLIGHTS);
  return { ...publicRep, highlights };
}

export function applyPublicRepEvent(publicRep, event, week) {
  let delta = 0;
  let trending = publicRep.trending;
  let mediaPresence = publicRep.mediaPresence;
  let scandalCount = publicRep.scandalCount;
  let label = '';

  switch (event.type) {
    case 'good_performance':
      delta = rand(3, 8);
      trending = 'rising';
      label = 'Bonne performance';
      break;
    case 'scandal':
      delta = -rand(8, 15);
      trending = 'falling';
      scandalCount += 1;
      label = 'Scandale';
      break;
    case 'transfer_big_club':
      delta = rand(5, 12);
      trending = 'rising';
      label = 'Transfert club huppé';
      break;
    case 'sponsorship':
      delta = rand(3, 6);
      mediaPresence = Math.min(100, mediaPresence + 5);
      label = 'Deal sponsoring';
      break;
    case 'injury':
      delta = -rand(2, 5);
      trending = 'falling';
      label = 'Blessure';
      break;
    case 'national_team':
      delta = rand(8, 15);
      trending = 'viral';
      label = 'Sélection nationale / Coupe du monde';
      break;
    default:
      break;
  }

  const score = Math.max(0, Math.min(100, publicRep.score + delta));
  const updated = addHighlight(
    { ...publicRep, score, trending, mediaPresence, scandalCount, lastEventWeek: week },
    week,
    label,
    delta,
  );
  return updated;
}

export function getPublicRepLabel(score) {
  if (score >= 80) return 'Icône';
  if (score >= 65) return 'Star médiatique';
  if (score >= 50) return 'Connu';
  if (score >= 35) return 'Discret';
  return 'Controversé';
}

export function tickPublicRep(publicRep, week) {
  const direction = publicRep.score > 50 ? -1 : publicRep.score < 50 ? 1 : 0;
  const score = Math.max(0, Math.min(100, publicRep.score + direction * REGRESSION_RATE));

  let trending = publicRep.trending;
  if (trending !== 'stable' && week - publicRep.lastEventWeek >= TRENDING_DECAY_WEEKS) {
    trending = 'stable';
  }

  return { ...publicRep, score, trending };
}

export function getPublicRepOfferBonus(publicRep) {
  const score = publicRep?.score ?? 40;
  return Math.max(0, Math.min(0.15, (score - 40) / 400));
}
