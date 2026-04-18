import { ArrowUpRight, Handshake, X } from 'lucide-react';
import React from 'react';
import { PERSONALITY_LABELS } from '../data/players';
import { getPlayerDossierStatus } from '../systems/dossierSystem';
import { formatMoney } from '../utils/format';
import { S } from './styles';

const POS_COLORS = { ATT: '#e83a3a', DEF: '#2563eb', MIL: '#16a34a', GK: '#d97706' };

function hashClubColor(clubName) {
  if (!clubName || clubName === 'Libre') return '#64727d';
  let h = 0;
  for (let i = 0; i < clubName.length; i++) h = (h * 31 + clubName.charCodeAt(i)) & 0xffffff;
  const hue = h % 360;
  return `hsl(${hue},60%,45%)`;
}

function getNotoriety(rating) {
  if (rating >= 90) return { label: 'Icône', bg: '#7c3aed', color: '#ffffff' };
  if (rating >= 85) return { label: 'Star', bg: '#d97706', color: '#ffffff' };
  if (rating >= 80) return { label: 'Reconnu', bg: '#2563eb', color: '#ffffff' };
  if (rating >= 73) return { label: 'Confirmé', bg: '#16a34a', color: '#ffffff' };
  if (rating >= 65) return { label: 'Promesse', bg: '#64727d', color: '#ffffff' };
  return { label: 'Inconnu', bg: '#e5eaf0', color: '#64727d' };
}

function FormDots({ results }) {
  const dots = Array.from({ length: 5 }, (_, i) => results?.[i] ?? null);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginTop: 4 }}>
      {dots.map((r, i) => (
        <div
          key={i}
          style={{
            ...S.formDot,
            background: r === 'W' ? '#16a34a' : r === 'L' ? '#e83a3a' : r === 'D' ? '#9aa7b2' : '#e5eaf0',
          }}
        />
      ))}
    </div>
  );
}

function MoraleBar({ label, value }) {
  const barColor = value >= 60 ? '#16a34a' : value >= 40 ? '#d97706' : '#e83a3a';
  return (
    <div style={S.moraleBar}>
      <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', width: 56, flexShrink: 0 }}>{label}</span>
      <div style={S.moraleBarTrack}>
        <div style={{ ...S.moraleBarFill, width: `${value}%`, background: barColor }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: barColor, fontFamily: 'system-ui,sans-serif', width: 22, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function PlayerCard({ player, state, mode, money, onSign, onRelease, onNego, onDetails }) {
  const ratingColor = player.rating >= 85 ? '#00a676' : player.rating >= 75 ? '#2f80ed' : '#9aa7b2';
  const canSign = mode === 'sign' ? money >= player.signingCost : true;
  const isFreeInRoster = mode === 'roster' && (player.freeAgent || player.club === 'Libre');
  const dossierStatus = getPlayerDossierStatus(player, state);
  const statusColor = dossierStatus.tone === 'good' ? '#00a676' : dossierStatus.tone === 'warn' ? '#b45309' : dossierStatus.tone === 'danger' ? '#b42318' : '#64727d';
  const tensionBg = dossierStatus.tone === 'danger'
    ? '#fff7f7'
    : dossierStatus.tone === 'warn'
      ? '#fffbeb'
      : dossierStatus.tone === 'good'
        ? '#f0fdf8'
        : '#ffffff';

  const posColor = POS_COLORS[player.position] ?? '#64727d';
  const notoriety = getNotoriety(player.rating);
  const clubDot = hashClubColor(player.club);

  // Rating trend
  let trendArrow = null;
  if (player.previousRating != null && player.previousRating !== player.rating) {
    trendArrow = player.rating > player.previousRating
      ? <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 900 }}>↑</span>
      : <span style={{ color: '#e83a3a', fontSize: 11, fontWeight: 900 }}>↓</span>;
  }

  // Status icon
  let statusIcon = null;
  if (player.injured > 0) statusIcon = '🤕';
  else if (player.form >= 78 && player.moral >= 65) statusIcon = '🔥';
  else if (player.form <= 45 || player.moral <= 35) statusIcon = '❄️';

  // Mercato badge
  const hasMercatoOffer = state?.clubOffers?.some((o) => o.playerId === player.id && o.status === 'open');

  return (
    <div style={{ ...S.pCard, background: tensionBg, borderColor: dossierStatus.tone === 'danger' ? '#fca5a5' : dossierStatus.tone === 'warn' ? '#fcd34d' : dossierStatus.tone === 'good' ? '#cfeee3' : '#e5eaf0' }}>
      <div style={S.pTop} onClick={onDetails} role={onDetails ? 'button' : undefined}>
        {/* Colored position avatar */}
        <div style={{ ...S.playerAvatar, background: posColor, color: '#ffffff', border: `2px solid ${posColor}` }}>
          {player.firstName[0]}{player.lastName[0]}
        </div>
        <div style={{ ...S.badge, background: ratingColor }}>
          <div style={S.badgeNum}>{player.rating}{trendArrow}</div>
          <div style={S.badgePos}>{player.position}</div>
        </div>
        <div style={S.pInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={S.pName}>
              {player.firstName} <strong>{player.lastName}</strong>
            </div>
            {statusIcon && <span style={{ fontSize: 13 }}>{statusIcon}</span>}
            <span style={{ ...S.notorietyBadge, background: notoriety.bg, color: notoriety.color }}>{notoriety.label}</span>
            {hasMercatoOffer && <span style={S.mercatoBadge}>Offre 🔴</span>}
          </div>

          <FormDots results={player.recentResults} />

          <div style={S.pMeta}>
            {player.age}a · {player.roleShort ?? player.position} {player.roleLabel ?? player.position} · {player.countryFlag} {player.countryLabel}
          </div>
          <div style={{ ...S.pMeta, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: clubDot, display: 'inline-block', flexShrink: 0 }} />
            {player.clubCountry} {player.club}
            {player.clubCity && <span> · {player.clubCity}</span>}
          </div>
          <div style={S.pStats}>
            <span>Val. {formatMoney(player.value)}</span>
            <span>·</span>
            <span>Sal. {formatMoney(player.weeklySalary)}/s</span>
          </div>
          <div style={S.pMeta2}>
            <span>{PERSONALITY_LABELS[player.personality] ?? player.personality}</span>
          </div>

          <MoraleBar label="Moral" value={player.moral} />
          <MoraleBar label="Confiance" value={player.trust ?? 50} />

          <div style={{ ...S.statusPill, color: statusColor, background: `${statusColor}12`, borderColor: `${statusColor}26` }}>
            {dossierStatus.label}
            {dossierStatus.weeksUntilReopen > 0 ? ` · ${dossierStatus.weeksUntilReopen} sem.` : ''}
          </div>
          <div style={S.meterRow}>
            <span>Forme</span>
            <div style={S.progBar}><div style={{ ...S.progFill, width: `${player.form}%`, background: '#7aa7b8' }} /></div>
            <strong>{player.form}</strong>
          </div>
          <div style={S.meterRow}>
            <span>Potentiel</span>
            <div style={S.progBar}><div style={{ ...S.progFill, width: `${player.potential}%`, background: '#00a676' }} /></div>
            <strong>{player.potential}</strong>
          </div>
          {mode === 'roster' && (
            <div style={S.pMeta2}>
              <span>Contrat {player.contractWeeksLeft}s</span>
              <span>·</span>
              <span>Com. {Math.round(player.commission * 100)}%</span>
              {player.clubRole && <span>· Rôle {player.clubRole}</span>}
            </div>
          )}
          {player.injured > 0 && <div style={S.injTag}>Blessé ({player.injured}s)</div>}
        </div>
      </div>
      {mode === 'sign' ? (
        <button
          onClick={onSign}
          disabled={!canSign}
          style={{ ...S.signBtn, opacity: canSign ? 1 : 0.4, cursor: canSign ? 'pointer' : 'not-allowed' }}
        >
          <span>RECRUTER</span>
          <span>{formatMoney(player.signingCost)}</span>
        </button>
      ) : (
        <div style={S.rActions}>
          <button onClick={() => onNego('extend')} style={S.actBtn}>
            <Handshake size={11} /> PROLONG.
          </button>
          <button onClick={() => onNego('transfer')} style={S.actBtn}>
            <ArrowUpRight size={11} /> {isFreeInRoster ? 'TROUVER CLUB' : 'TRANSFERT'}
          </button>
          <button onClick={onRelease} style={S.relBtn}>
            <X size={11} /> LIBERER
          </button>
        </div>
      )}
    </div>
  );
}
