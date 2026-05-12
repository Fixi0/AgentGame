// Procedural SVG crests with per-club colors derived from a club palette
// (or country fallback). Single shield shape so crests look like a coherent
// kit, but each club has its own dominant color.
import { CLUBS } from '../data/clubs';

// Couleurs dominantes connues pour les grands clubs.
const CLUB_COLORS = {
  // France
  'Marseille': ['#0094D8', '#ffffff', '#0a3d91'],
  'Paris SG': ['#004170', '#da291c', '#ffffff'],
  'PSG': ['#004170', '#da291c', '#ffffff'],
  'Paris FC': ['#0a3d91', '#ffffff', '#1a73e8'],
  'Monaco': ['#e3231f', '#ffffff', '#a4192c'],
  'Lyon': ['#003c7d', '#ed1c24', '#ffffff'],
  'Lille': ['#dc1f26', '#ffffff', '#0a3d91'],
  'Nice': ['#e30613', '#000000', '#ffffff'],
  'Rennes': ['#000000', '#dc1f26', '#ffffff'],
  'Lens': ['#ffe000', '#dc1f26', '#000000'],
  'Strasbourg': ['#005bbb', '#ffffff', '#dc1f26'],
  'Toulouse': ['#52217f', '#ffffff', '#000000'],
  'Brest': ['#dc1f26', '#ffffff', '#000000'],
  'Angers': ['#1a1a1a', '#ffffff', '#a8a8a8'],
  // Espagne
  'Real Madrid': ['#ffffff', '#febe10', '#00529f'],
  'Barcelona': ['#a50044', '#004d98', '#fcb900'],
  'Atletico': ['#cb3524', '#ffffff', '#1f2c5c'],
  'Atletico Madrid': ['#cb3524', '#ffffff', '#1f2c5c'],
  'Sevilla': ['#d1011d', '#ffffff', '#000000'],
  'Valencia': ['#ee7e2c', '#ffffff', '#000000'],
  // Angleterre
  'Manchester City': ['#6cabdd', '#ffffff', '#1c2c5b'],
  'Man City': ['#6cabdd', '#ffffff', '#1c2c5b'],
  'Manchester United': ['#da291c', '#fbe122', '#000000'],
  'Man United': ['#da291c', '#fbe122', '#000000'],
  'Liverpool': ['#c8102e', '#f6eb61', '#ffffff'],
  'Arsenal': ['#ef0107', '#ffffff', '#063672'],
  'Chelsea': ['#034694', '#dba111', '#ffffff'],
  'Tottenham': ['#132257', '#ffffff', '#a4a4a4'],
  // Italie
  'Juventus': ['#000000', '#ffffff', '#a4a4a4'],
  'Inter': ['#0068a8', '#000000', '#ffffff'],
  'Inter Milan': ['#0068a8', '#000000', '#ffffff'],
  'Milan': ['#fb090b', '#000000', '#ffffff'],
  'AC Milan': ['#fb090b', '#000000', '#ffffff'],
  'Napoli': ['#12a0d7', '#ffffff', '#003366'],
  'Roma': ['#8e1f2f', '#f7b32b', '#ffffff'],
  'Lazio': ['#87cefa', '#ffffff', '#0a3d91'],
  // Allemagne
  'Bayern': ['#dc052d', '#ffffff', '#0066b2'],
  'Bayern Munich': ['#dc052d', '#ffffff', '#0066b2'],
  'Dortmund': ['#fde100', '#000000', '#ffffff'],
  'Borussia Dortmund': ['#fde100', '#000000', '#ffffff'],
  'Leipzig': ['#dd0741', '#ffffff', '#001f5b'],
  'Leverkusen': ['#e32219', '#000000', '#ffffff'],
  // Portugal / Pays-Bas
  'Benfica': ['#e30613', '#ffffff', '#000000'],
  'Porto': ['#003da5', '#ffffff', '#000000'],
  'Sporting': ['#008558', '#ffffff', '#000000'],
  'Ajax': ['#d2122e', '#ffffff', '#000000'],
  'PSV': ['#ed1c24', '#ffffff', '#000000'],
};

const COUNTRY_FALLBACK = {
  FR: ['#0a3d91', '#ed1c24', '#ffffff'],
  ES: ['#aa151b', '#f1bf00', '#ffffff'],
  GB: ['#012169', '#c8102e', '#ffffff'],
  EN: ['#012169', '#c8102e', '#ffffff'],
  DE: ['#000000', '#dd0000', '#ffce00'],
  IT: ['#0d6e3a', '#ce2b37', '#ffffff'],
  NL: ['#ae1c28', '#21468b', '#ffffff'],
  PT: ['#046a38', '#da291c', '#ffd700'],
  BR: ['#009c3b', '#ffdf00', '#002776'],
  AR: ['#74acdf', '#ffffff', '#f6b40e'],
  TR: ['#e30a17', '#ffffff', '#000000'],
  UA: ['#005bbb', '#ffd500', '#ffffff'],
};

const hash = (s = '') => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
};

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? '') + (parts[2]?.[0] ?? '')).toUpperCase();
};

const cache = new Map();

const getPalette = (clubName, ref) => {
  if (CLUB_COLORS[clubName]) return CLUB_COLORS[clubName];
  // Variation déterministe à partir de la palette pays pour différencier les clubs
  const base = COUNTRY_FALLBACK[ref?.countryCode] ?? ['#1f2937', '#9ca3af', '#fbbf24'];
  const h = hash(clubName);
  const order = h % 3;
  return [base[order], base[(order + 1) % 3], base[(order + 2) % 3]];
};

export const getClubCrest = (clubName = '') => {
  if (cache.has(clubName)) return cache.get(clubName);
  const ref = CLUBS.find((c) => c.name === clubName);
  const [primary, secondary, accent] = getPalette(clubName, ref);
  const initials = getInitials(clubName);
  const fontSize = initials.length >= 3 ? 18 : 22;

  // Toujours en bouclier — uniformité visuelle, couleurs propres au club
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<path d="M32 3 L60 9 L60 30 Q60 52 32 61 Q4 52 4 30 L4 9 Z" fill="${primary}" stroke="${secondary}" stroke-width="2.5"/>
<rect x="4" y="26" width="56" height="9" fill="${accent}" opacity=".55"/>
<text x="32" y="${initials.length >= 3 ? 38 : 40}" font-family="system-ui,Arial,sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" fill="${secondary}" stroke="${primary}" stroke-width="0.6" paint-order="stroke">${initials}</text>
</svg>`;

  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  cache.set(clubName, url);
  return url;
};

export const ClubCrest = ({ club, size = 22, style }) => (
  <img
    src={getClubCrest(club)}
    alt=""
    width={size}
    height={size}
    style={{ width: size, height: size, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...(style ?? {}) }}
  />
);
