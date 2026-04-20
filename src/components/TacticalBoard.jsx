import React from 'react';
import { S } from './styles';

const POS_COLORS = { ATT: '#e83a3a', DEF: '#2563eb', MIL: '#16a34a', GK: '#d97706' };

const getInitials = (player) => {
  const first = typeof player?.firstName === 'string' && player.firstName.trim()
    ? player.firstName.trim()[0]
    : 'J';
  const last = typeof player?.lastName === 'string' && player.lastName.trim()
    ? player.lastName.trim()[0]
    : '';
  return `${first}${last}`.toUpperCase();
};

function getPositionLayout(roster) {
  // Group by roleId/roleShort/position
  const placed = [];
  const gks = roster.filter((p) => p.position === 'GK');
  const defs = roster.filter((p) => p.position === 'DEF');
  const mids = roster.filter((p) => p.position === 'MIL');
  const atts = roster.filter((p) => p.position === 'ATT');

  // GKs
  gks.forEach((p, i) => {
    placed.push({ player: p, x: 160 + (i - Math.floor(gks.length / 2)) * 30, y: 420 });
  });

  // Defenders
  const defCount = defs.length;
  if (defCount > 0) {
    const defPositions = getSpreadPositions(defCount, 60, 260, 350);
    defs.forEach((p, i) => placed.push({ player: p, x: defPositions[i], y: 350 }));
  }

  // Midfielders
  const midCount = mids.length;
  if (midCount > 0) {
    const midPositions = getSpreadPositions(midCount, 60, 260, 240);
    mids.forEach((p, i) => {
      // Vary y slightly for different mid roles
      const yOff = i % 2 === 0 && midCount > 2 ? -15 : 0;
      placed.push({ player: p, x: midPositions[i], y: 240 + yOff });
    });
  }

  // Attackers
  const attCount = atts.length;
  if (attCount > 0) {
    const attPositions = getSpreadPositions(attCount, 70, 250, 110);
    atts.forEach((p, i) => placed.push({ player: p, x: attPositions[i], y: 110 }));
  }

  return placed;
}

function getSpreadPositions(count, minX, maxX, y) {
  if (count === 1) return [160];
  const step = (maxX - minX) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(minX + i * step));
}

function formDotColor(result) {
  if (result === 'W') return '#16a34a';
  if (result === 'L') return '#e83a3a';
  if (result === 'D') return '#9aa7b2';
  return null;
}

export default function TacticalBoard({ roster, state, onSelectPlayer }) {
  if (!roster || roster.length === 0) {
    return (
      <div style={{ ...S.tacBoard, textAlign: 'center', color: '#64727d', padding: 20, fontSize: 13, fontFamily: 'system-ui,sans-serif' }}>
        Aucun joueur dans le roster
      </div>
    );
  }

  const positions = getPositionLayout(roster);

  return (
    <div style={S.tacBoard}>
      <svg viewBox="0 0 320 460" width="100%" style={{ display: 'block', borderRadius: 10, boxShadow: '0 8px 28px rgba(15,23,32,.14)' }}>
        <defs>
          <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d7a3e" />
            <stop offset="100%" stopColor="#3a9a50" />
          </linearGradient>
        </defs>
        {/* Pitch background */}
        <rect width="320" height="460" fill="url(#pitchGrad)" />
        {/* Pitch stripes */}
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={0} y={i * 92} width={320} height={46} fill="rgba(255,255,255,0.03)" />
        ))}
        {/* Outer border */}
        <rect x={14} y={14} width={292} height={432} rx={4} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
        {/* Center line */}
        <line x1={14} y1={230} x2={306} y2={230} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
        {/* Center circle */}
        <circle cx={160} cy={230} r={44} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
        <circle cx={160} cy={230} r={3} fill="rgba(255,255,255,0.7)" />
        {/* Top penalty area */}
        <rect x={80} y={14} width={160} height={74} rx={2} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
        {/* Top 6-yard box */}
        <rect x={116} y={14} width={88} height={30} rx={2} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        {/* Bottom penalty area */}
        <rect x={80} y={372} width={160} height={74} rx={2} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
        {/* Bottom 6-yard box */}
        <rect x={116} y={416} width={88} height={30} rx={2} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        {/* Top corner arcs */}
        <path d="M14,28 A14,14 0 0,1 28,14" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        <path d="M292,28 A14,14 0 0,0 278,14" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        {/* Bottom corner arcs */}
        <path d="M14,432 A14,14 0 0,0 28,446" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        <path d="M292,432 A14,14 0 0,1 278,446" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        {/* Top penalty spot */}
        <circle cx={160} cy={62} r={2.5} fill="rgba(255,255,255,0.7)" />
        {/* Bottom penalty spot */}
        <circle cx={160} cy={398} r={2.5} fill="rgba(255,255,255,0.7)" />

        {/* Players */}
        {positions.map(({ player, x, y }) => {
          const color = POS_COLORS[player.position] ?? '#64727d';
          const initials = getInitials(player);
          const lastResult = player.recentResults?.[player.recentResults.length - 1] ?? null;
          const dotColor = formDotColor(lastResult);
          const isInjured = player.injured > 0;

          return (
            <g key={player.id} onClick={() => onSelectPlayer?.(player)} style={{ cursor: 'pointer' }}>
              {/* Shadow */}
              <circle cx={x} cy={y + 2} r={18} fill="rgba(0,0,0,0.22)" />
              {/* Player circle */}
              <circle cx={x} cy={y} r={18} fill={color} stroke="rgba(255,255,255,0.85)" strokeWidth={2} />
              {/* Initials */}
              {!isInjured && (
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={9} fontWeight="900" fontFamily="system-ui,sans-serif">
                  {initials}
                </text>
              )}
              {/* Injured overlay */}
              {isInjured && (
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={14}>
                  🤕
                </text>
              )}
              {/* Form dot (bottom-right) */}
              {dotColor && (
                <circle cx={x + 12} cy={y + 12} r={4} fill={dotColor} stroke="#ffffff" strokeWidth={1.2} />
              )}
              {/* Player name below */}
              <text x={x} y={y + 26} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={7} fontWeight="700" fontFamily="system-ui,sans-serif">
                {(typeof player?.lastName === 'string' && player.lastName.trim() ? player.lastName : 'Joueur').slice(0, 8)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
