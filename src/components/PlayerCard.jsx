import { ArrowUpRight, Handshake, X } from 'lucide-react';
import React from 'react';
import { PERSONALITY_LABELS } from '../data/players';
import { EURO_CUP_LABELS, getEuropeanCompetition } from '../systems/europeanCupSystem';
import { getPlayerDossierStatus } from '../systems/dossierSystem';
import { getDossierHistorySummary, getRecentDossierEvents } from '../systems/coherenceSystem';
import { getPlayerProfileSummary } from '../systems/playerProfileSystem';
import { formatMoney } from '../utils/format';
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
  const currentSeason = Math.floor(((state?.week ?? 1) - 1) / 38) + 1;
  const ratingColor = player.rating >= 85 ? '#00a676' : player.rating >= 75 ? '#2f80ed' : '#9aa7b2';
  const canSign = mode === 'sign' ? money >= player.signingCost : true;
  const signHelp = canSign ? formatMoney(player.signingCost) : `Manque ${formatMoney(Math.max(0, (player.signingCost ?? 0) - (money ?? 0)))}`;
  const isFreeInRoster = mode === 'roster' && (player.freeAgent || player.club === 'Libre');
  const dossierStatus = getPlayerDossierStatus(player, state);
  const dossierSummary = getDossierHistorySummary(state?.dossierMemory ?? {}, player.id);
  const dossierRecent = getRecentDossierEvents(state?.dossierMemory ?? {}, player.id, 1)[0];
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
  const currentCompetition = getEuropeanCompetition(player, currentSeason);
  const playerProfile = player.playerProfile ?? getPlayerProfileSummary(player);

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
  else if (player.form <= 45 || player.moral <= 35) statusIcon = '❄️';

  // Mercato badge
  const hasMercatoOffer = state?.clubOffers?.some((o) => o.playerId === player.id && o.status === 'open');

  const isLegendary = player.isLegendary === true || player.rarity === 'legendary';
  const legendaryCardStyle = isLegendary ? {
    background: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 40%, #1a1200 100%)',
    borderColor: '#d4a017',
    boxShadow: '0 0 18px 3px rgba(212,160,23,0.45)',
  } : {};
  const cardBg = isLegendary ? legendaryCardStyle : { background: tensionBg, borderColor: dossierStatus.tone === 'danger' ? '#fca5a5' : dossierStatus.tone === 'warn' ? '#fcd34d' : dossierStatus.tone === 'good' ? '#cfeee3' : '#e5eaf0' };

  return (
    <div style={{ ...S.pCard, ...cardBg }}>
      <div style={S.pTop} onClick={onDetails} role={onDetails ? 'button' : undefined}>
        {/* Colored position avatar */}
        <div style={{ ...S.playerAvatar, background: isLegendary ? 'linear-gradient(135deg,#d4a017,#f5c842)' : posColor, color: isLegendary ? '#1a1200' : '#ffffff', border: `2px solid ${isLegendary ? '#d4a017' : posColor}` }}>
          {isLegendary ? '👑' : getInitials(player)}
        </div>
        <div style={{ ...S.badge, background: isLegendary ? 'linear-gradient(135deg,#d4a017,#b8860b)' : ratingColor }}>
          <div style={{ ...S.badgeNum, color: isLegendary ? '#1a1200' : undefined }}>{player.rating}{trendArrow}</div>
          <div style={{ ...S.badgePos, color: isLegendary ? '#1a1200' : undefined }}>{player.position}</div>
        </div>
        <div style={S.pInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ ...S.pName, color: isLegendary ? '#f5c842' : undefined }}>
              {player.firstName} <strong>{player.lastName}</strong>
            </div>
            {statusIcon && <span style={{ fontSize: 13 }}>{statusIcon}</span>}
            {hasMercatoOffer && <span style={S.mercatoBadge}>Offre 🔴</span>}
            {currentCompetition && (() => {
              const cup = EURO_CUP_LABELS[currentCompetition];
              return cup ? <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: cup.color, borderRadius: 4, padding: '1px 5px', letterSpacing: '.05em' }}>{cup.icon} {cup.short}</span> : null;
            })()}
          </div>

          <FormDots results={player.recentResults} />

          <div style={S.pMeta}>
            {player.age}a · {player.roleShort ?? player.position} {player.roleLabel ?? player.position} · {player.countryFlag} {player.countryLabel}
          </div>
          <div style={{ ...S.pMeta2, color: '#172026', fontWeight: 800 }}>
            {playerProfile.label} · {playerProfile.style}
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
          {/* Last match rating */}
          {player.matchHistory?.[0]?.matchRating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>DERNIÈRE NOTE</span>
              <span style={{
                fontSize: 11,
                fontWeight: 900,
                color: player.matchHistory[0].matchRating >= 7.5 ? '#00a676' : player.matchHistory[0].matchRating >= 6 ? '#2563eb' : '#b42318',
                fontFamily: 'system-ui,sans-serif',
              }}>
                {player.matchHistory[0].matchRating}/10
              </span>
              {player.matchHistory[0].goals > 0 && (
                <span style={{ fontSize: 10, color: '#3f5663', fontFamily: 'system-ui,sans-serif' }}>⚽{player.matchHistory[0].goals}</span>
              )}
              {player.matchHistory[0].assists > 0 && (
                <span style={{ fontSize: 10, color: '#3f5663', fontFamily: 'system-ui,sans-serif' }}>🅰️{player.matchHistory[0].assists}</span>
              )}
            </div>
          )}
          <div style={S.pMeta2}>
            <span>{player.scoutReport ? `Lecture scout ${player.scoutReport.confidence}% · ${player.scoutReport.risk ?? 'normal'}` : `Besoin: ${playerProfile.developmentNeed}`}</span>
          </div>
          <div style={S.pMeta2}>
            <span>{dossierSummary}</span>
          </div>
          {dossierRecent && (
            <div style={S.pMeta2}>
              <span>{dossierRecent.label}</span>
              <span>·</span>
              <span style={{ color: dossierRecent.impact > 0 ? '#00a676' : dossierRecent.impact < 0 ? '#b42318' : '#64727d' }}>
                {dossierRecent.impact > 0 ? 'Calmé' : dossierRecent.impact < 0 ? 'Tendu' : 'Neutre'}
              </span>
            </div>
          )}
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
          <span>{signHelp}</span>
        </button>
      ) : (
        <div style={S.rActions}>
          <button onClick={onDetails} style={S.actBtn}>
            DOSSIER
          </button>
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
