export const DAY = 86_400_000;
export const HOUR = 3_600_000;
export const EURO_DAYS = new Set([3, 6, 9, 12, 15, 18, 22, 25, 28]);

export function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const random = seed => {
  let h = hash(seed);
  return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ h >>> 15, 1 | h); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};
export function shuffled(values, seed) {
  const rows = [...values], rng = random(seed);
  for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
  return rows;
}
export function roundRobin(teams) {
  const ring = [...teams]; if (ring.length % 2) ring.push(null);
  const rounds = [];
  for (let r = 0; r < ring.length - 1; r++) {
    const fixtures = [];
    for (let i = 0; i < ring.length / 2; i++) {
      const a = ring[i], b = ring[ring.length - 1 - i];
      if (a && b) fixtures.push((r + i) % 2 ? [b, a] : [a, b]);
    }
    rounds.push(fixtures); ring.splice(1, 0, ring.pop());
  }
  return rounds;
}
// Time-zone conversion is calculated from the date, including Paris DST changes.
export function nextParisKickoff(at) {
  let candidate = Math.floor(at / HOUR) * HOUR + HOUR;
  for (let i = 0; i < 49; i++, candidate += HOUR) {
    const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(candidate);
    if (hour === '21') return candidate;
  }
  throw new Error('KICKOFF_UNAVAILABLE');
}
export function slotAt(start, index) {
  let at = start;
  for (let i = 1; i < index; i++) at = nextParisKickoff(at);
  return at;
}
export function division(score) { return score >= 500 ? 'legend' : score >= 300 ? 'diamond' : score >= 180 ? 'gold' : score >= 80 ? 'silver' : 'bronze'; }
