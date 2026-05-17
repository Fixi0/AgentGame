import perfGood from '../assets/events/performance-good.jpg';
import perfBad from '../assets/events/performance-bad.jpg';
import mediaGood from '../assets/events/media-good.jpg';
import mediaBad from '../assets/events/media-bad.jpg';
import scandal from '../assets/events/scandal.jpg';
import fansGood from '../assets/events/fans-good.jpg';
import fansBad from '../assets/events/fans-bad.jpg';
import transfer from '../assets/events/transfer.jpg';
import injury from '../assets/events/injury.jpg';
import redCard from '../assets/events/red-card.jpg';
import matchCelebrate from '../assets/events/match-celebrate.jpg';
import goalCelebration from '../assets/events/goal-celebration.jpg';
import matchAction from '../assets/events/match-action.jpg';
import matchSave from '../assets/events/match-save.jpg';
import matchWide from '../assets/events/match-wide.jpg';
import matchHeader from '../assets/events/match-header.jpg';
import teamHuddle from '../assets/events/team-huddle.jpg';
import stadiumTunnel from '../assets/events/stadium-tunnel.jpg';
import teamBus from '../assets/events/team-bus.jpg';
import lockerFight from '../assets/events/locker-fight.jpg';
import benched from '../assets/events/benched.jpg';
import recovery from '../assets/events/recovery.jpg';
import training from '../assets/events/training.jpg';
import pressRoom from '../assets/events/press-room.jpg';
import pressConference from '../assets/events/press-conference.jpg';
import contractSigning from '../assets/events/contract-signing.jpg';
import bootDeal from '../assets/events/boot-deal.jpg';
import deadlineDay from '../assets/events/deadline-day.jpg';
import crowdUltras from '../assets/events/crowd-ultras.jpg';
import fans from '../assets/events/fans.jpg';
import euroFinal from '../assets/events/euro-final.jpg';
import penaltyMiss from '../assets/events/penalty-miss.jpg';
import tacticsBoard from '../assets/events/tactics-board.jpg';
import lockerRoomDoubt from '../assets/events/locker-room-doubt.jpg';
import stadiumArrival from '../assets/events/stadium-arrival.jpg';
import stadiumNight from '../assets/events/stadium-night.jpg';
import agentOfficeCall from '../assets/events/agent-office-call.jpg';
import physioRoom from '../assets/events/physio-room.jpg';

// Multi-image pools keyed by semantic context
export const POOLS = {
  matchWin: [goalCelebration, matchCelebrate, stadiumNight, matchHeader, teamHuddle],
  matchLoss: [lockerRoomDoubt, benched, lockerFight, matchAction, penaltyMiss, stadiumArrival],
  matchDraw: [stadiumNight, matchWide, matchHeader, teamBus, tacticsBoard],
  matchKeeper: [matchSave, stadiumNight, matchWide],
  performanceGood: [goalCelebration, perfGood, matchCelebrate, matchHeader, teamHuddle],
  performanceBad: [lockerRoomDoubt, perfBad, benched, penaltyMiss, lockerFight, matchAction],
  mediaGood: [agentOfficeCall, mediaGood, pressConference, pressRoom, teamHuddle],
  mediaBad: [agentOfficeCall, mediaBad, scandal, pressRoom],
  fansGood: [stadiumNight, fansGood, fans, crowdUltras, teamHuddle],
  fansBad: [fansBad, crowdUltras, scandal, lockerRoomDoubt],
  scandal: [scandal, mediaBad, lockerFight, agentOfficeCall],
  injury: [physioRoom, injury, recovery, lockerRoomDoubt],
  redCard: [redCard, lockerFight, penaltyMiss, lockerRoomDoubt],
  transfer: [agentOfficeCall, transfer, contractSigning, deadlineDay, bootDeal],
  europe: [euroFinal, stadiumNight, matchCelebrate, stadiumArrival],
  worldCup: [euroFinal, stadiumNight, matchCelebrate, matchWide],
  training: [teamHuddle, training, tacticsBoard, stadiumArrival],
  personal: [stadiumArrival, lockerRoomDoubt, agentOfficeCall],
  matchday: [stadiumNight, matchWide, stadiumArrival, matchHeader],
};

const ID_OVERRIDES = {
  red_card: { pool: 'redCard', accent: '#b42318' },
  yellow_spree: { pool: 'redCard', accent: '#d97706' },
  inj_mild: { pool: 'injury', accent: '#0ea5e9' },
  inj_severe: { pool: 'injury', accent: '#0ea5e9' },
  warmup_injury: { pool: 'injury', accent: '#0ea5e9' },
  double_injury: { pool: 'injury', accent: '#0ea5e9' },
  career_end_injury: { pool: 'injury', accent: '#7c3aed' },
  doping_accusation: { pool: 'scandal', accent: '#b42318' },
  fan_dispute: { pool: 'fansBad', accent: '#b42318' },
  public_meltdown: { pool: 'scandal', accent: '#b42318' },
  tweet: { pool: 'mediaBad', accent: '#d97706' },
  press_leak: { pool: 'mediaBad', accent: '#d97706' },
  bad_interview: { pool: 'mediaBad', accent: '#d97706' },
  charity_ev: { pool: 'fansGood', accent: '#00a676' },
  fan_fav: { pool: 'fansGood', accent: '#f59e0b' },
  sponsor: { pool: 'transfer', accent: '#f59e0b' },
  brand_deal_lost: { pool: 'transfer', accent: '#b42318' },
  callup: { pool: 'mediaGood', accent: '#2f80ed' },
  international_debut: { pool: 'mediaGood', accent: '#2f80ed' },
  national_snubbed: { pool: 'mediaBad', accent: '#d97706' },
  interview_good: { pool: 'mediaGood', accent: '#00a676' },
  media_coup: { pool: 'mediaGood', accent: '#00a676' },
  hostile_supporters: { pool: 'fansBad', accent: '#b42318' },
  awkward_phrase: { pool: 'mediaBad', accent: '#d97706' },
  viral_interview: { pool: 'mediaGood', accent: '#00a676' },
  press_conference_week: { pool: 'mediaGood', accent: '#00a676' },
  european_goal: { pool: 'europe', accent: '#7dd3fc' },
  family_issue: { pool: 'personal', accent: '#f59e0b' },
  family_visit: { pool: 'personal', accent: '#f59e0b' },
  training_ground: { pool: 'training', accent: '#00a676' },
  open_training: { pool: 'training', accent: '#00a676' },
  matchday: { pool: 'matchday', accent: '#00a676' },
};

const TYPE_TO_POOL = {
  performance: { good: 'performanceGood', bad: 'performanceBad' },
  media: { good: 'mediaGood', bad: 'mediaBad' },
  scandal: { good: 'mediaGood', bad: 'scandal' },
  fans: { good: 'fansGood', bad: 'fansBad' },
  transfer: { good: 'transfer', bad: 'transfer' },
};

// FNV-style hash for deterministic seed → integer
const hashSeed = (s) => {
  let h = 2166136261;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
};

/**
 * Pick deterministically from a pool, preferring images NOT already in `used`.
 * `used` is an optional Set/Map of image URLs already shown this frame.
 */
export const pickFromPool = (pool, seed = 0, used = null) => {
  if (!pool || !pool.length) return null;
  const start = hashSeed(seed) % pool.length;
  if (used) {
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[(start + i) % pool.length];
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
  }
  return pool[start];
};

const resolvePool = (event) => {
  if (!event) return POOLS.performanceGood;
  const id = event.id || event.eventId;
  if (id && ID_OVERRIDES[id]) return POOLS[ID_OVERRIDES[id].pool] ?? POOLS.performanceGood;

  const label = String(event.label || '').toLowerCase();
  if (label.includes('blessure') || label.includes('rechute') || label.includes('douleur') || label.includes('genou') || label.includes('physio') || label.includes('soins')) return POOLS.injury;
  if (label.includes('rouge')) return POOLS.redCard;
  if (label.includes('entrainement') || label.includes('entraînement') || label.includes('training') || label.includes('séance') || label.includes('seance') || label.includes('préparation') || label.includes('preparation')) return POOLS.training;
  if (label.includes('famille') || label.includes('maman') || label.includes('family') || label.includes('entourage') || label.includes('discussion')) return POOLS.personal;
  if (label.includes('stade') || label.includes('affluence') || label.includes('matchday') || label.includes('jour de match')) return POOLS.matchday;
  if (label.includes('bureau') || label.includes('appel') || label.includes('call') || label.includes('agent')) return event.good ? POOLS.mediaGood : POOLS.mediaBad;
  if (label.includes('supporter') || label.includes('fan')) return event.good ? POOLS.fansGood : POOLS.fansBad;
  if (label.includes('contrat') || label.includes('sponsor') || label.includes('transfert') || label.includes('mercato')) return POOLS.transfer;
  if (label.includes('interview') || label.includes('presse') || label.includes('média') || label.includes('media')) return event.good ? POOLS.mediaGood : POOLS.mediaBad;
  if (label.includes('ballon')) return POOLS.performanceGood;
  if (label.includes('european') || label.includes('ldc') || label.includes('champions')) return POOLS.europe;

  const type = event.type || event.types?.[0] || 'performance';
  const map = TYPE_TO_POOL[type];
  if (map) return POOLS[event.good ? map.good : map.bad];
  return event.good === false ? POOLS.performanceBad : POOLS.performanceGood;
};

export const getEventVisual = (event, opts = {}) => {
  if (!event) return null;
  const id = event.id || event.eventId;
  const override = id ? ID_OVERRIDES[id] : null;
  const pool = resolvePool(event);
  const seed = opts.seed ?? `${id ?? ''}|${event.player ?? ''}|${event.label ?? ''}`;
  const image = pickFromPool(pool, seed, opts.used);
  if (!image) return null;
  const accent = override?.accent || (event.good ? '#00a676' : '#b42318');
  return { image, accent };
};

// Backward compatible: returns image URL only
export const getEventImage = (opts = {}) => {
  const { eventId, type, kind, good, seed, used } = opts;

  // Match cards: rotate by result for variety
  if (kind === 'match' || kind === 'flop' || kind === 'euroResult' || kind === 'worldCupMatch') {
    const matchPool = (() => {
      const t = type || '';
      if (t === 'keeper') return POOLS.matchKeeper;
      // result derived from seed text — fallback to mixed
      const s = String(seed ?? '');
      if (/win|victoire|good/i.test(s)) return POOLS.matchWin;
      if (/loss|défaite|defaite|bad/i.test(s)) return POOLS.matchLoss;
      if (/draw|nul/i.test(s)) return POOLS.matchDraw;
      return [...POOLS.matchWin, ...POOLS.matchDraw];
    })();
    return pickFromPool(matchPool, seed, used);
  }

  if (kind === 'worldCupResult') return pickFromPool(POOLS.worldCup, seed, used);

  const visual = getEventVisual(
    { id: eventId, type, label: kind, good: good ?? true },
    { seed: seed ?? `${eventId ?? ''}-${type ?? ''}-${kind ?? ''}`, used },
  );
  return visual?.image || POOLS.performanceGood[0];
};

const POST_KIND_POOLS = {
  player: [...POOLS.performanceGood, ...POOLS.training, ...POOLS.matchday],
  club: [...POOLS.matchday, ...POOLS.transfer, ...POOLS.matchWin],
  press: [...POOLS.mediaGood, ...POOLS.mediaBad, ...POOLS.scandal],
  fan: [...POOLS.fansGood, ...POOLS.fansBad],
};
export const getPostImage = ({ kind = 'player', tag, seed = 0, used = null } = {}) => {
  if (tag === 'injury') return pickFromPool(POOLS.injury, seed, used);
  if (tag === 'training' || tag === 'session') return pickFromPool(POOLS.training, seed, used);
  if (tag === 'matchday' || tag === 'match') return pickFromPool(POOLS.matchday, seed, used);
  if (tag === 'goal' || tag === 'win') return pickFromPool(POOLS.matchWin, seed, used);
  if (tag === 'family' || tag === 'personal' || tag === 'recovery') return pickFromPool(POOLS.personal, seed, used);
  if (tag === 'office' || tag === 'agent' || tag === 'meeting') return pickFromPool(POOLS.mediaGood, seed, used);
  if (tag === 'transfer' || tag === 'signing' || tag === 'mercato') return pickFromPool(POOLS.transfer, seed, used);
  if (tag === 'scandal' || tag === 'controversy') return pickFromPool(POOLS.scandal, seed, used);
  if (tag === 'red_card') return pickFromPool(POOLS.redCard, seed, used);
  if (tag === 'duo' || tag === 'rivalry') return pickFromPool(POOLS.performanceGood, seed, used);
  if (tag === 'press') return pickFromPool(POOLS.mediaGood, seed, used);
  const pool = POST_KIND_POOLS[kind] || POST_KIND_POOLS.player;
  return pickFromPool(pool, seed, used);
};
