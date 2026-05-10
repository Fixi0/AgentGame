import { ArrowUpRight, Handshake, X } from 'lucide-react';
import React from 'react';
import { PERSONALITY_LABELS } from '../data/players';
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
  const canSign = mode === 'sign' ? money >= player.signingCost : true;
  const signHelp = canSign ? formatMoney(player.signingCost) : `Manque ${formatMoney(Math.max(0, (player.signingCost ?? 0) - (money ?? 0)))}`;
  const isFreeInRoster = mode === 'roster' && (player.freeAgent || player.club === 'Libre');
  const dossierStatus = getPlayerDossierStatus(player, state);
  const dossierSummary = getDossierHistorySummary(state?.dossierMemory ?? {}, player.id);
  const dossierRecent = getRecentDossierEvents(state?.dossierMemory ?? {}, player.id, 1)[0];
  const statusColor = dossierStatus.tone === 'good' ? '#00a676' : dossierStatus.tone === 'warn' ? '#b45309' : dossierStatus.tone === 'danger' ? '#b42318' : '#64727d';
  const tensionBg = dossierStatus.tone === 'danger'
    ? 'oklch(24% 0.07 25 / .88)'
    : dossierStatus.tone === 'warn'
      ? 'oklch(25% 0.06 83 / .88)'
      : dossierStatus.tone === 'good'
        ? 'oklch(23% 0.07 155 / .88)'
        : 'oklch(20% 0.035 252 / .9)';

  const posColor = POS_COLORS[player.position] ?? '#64727d';
  const clubDot = hashClubColor(player.club);
  const playerProfile = player.playerProfile ?? getPlayerProfileSummary(player);

  // Status icon
  let statusIcon = null;
  if (player.injured > 0) statusIcon = 'SOINS';
  else if (player.form <= 45 || player.moral <= 35) statusIcon = 'FRAGILE';

  // Mercato badge
  const hasMercatoOffer = state?.clubOffers?.some((o) => o.playerId === player.id && o.status === 'open');

  const isLegendary = player.isLegendary === true || player.rarity === 'legendary';
  const legendaryCardStyle = isLegendary ? {
    background: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 40%, #1a1200 100%)',
    borderColor: '#d4a017',
    boxShadow: '0 0 18px 3px rgba(212,160,23,0.45)',
  } : {};
  const cardBg = isLegendary ? legendaryCardStyle : {
    background: `linear-gradient(145deg, ${tensionBg}, oklch(13% 0.035 258 / .94))`,
    borderColor: dossierStatus.tone === 'danger' ? 'oklch(64% 0.18 25 / .55)' : dossierStatus.tone === 'warn' ? 'oklch(82% 0.16 83 / .45)' : dossierStatus.tone === 'good' ? 'oklch(70% 0.19 155 / .45)' : 'var(--af-border)',
  };

  return (
    <div style={{ ...S.pCard, ...cardBg }}>
      <div style={S.pTop} onClick={onDetails} role={onDetails ? 'button' : undefined}>
        {/* Colored position avatar */}
        <div style={{ ...S.playerAvatar, background: isLegendary ? 'linear-gradient(135deg,#d4a017,#f5c842)' : posColor, color: isLegendary ? '#1a1200' : '#ffffff', border: `2px solid ${isLegendary ? '#d4a017' : posColor}` }}>
          {getInitials(player)}
        </div>
        <div style={S.pInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ ...S.pName, color: isLegendary ? '#f5c842' : undefined }}>
              {player.firstName} <strong>{player.lastName}</strong>
            </div>
            {statusIcon && <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.08em', color: 'var(--af-gold)' }}>{statusIcon}</span>}
            {hasMercatoOffer && <span style={S.mercatoBadge}>Offre</span>}
          </div>

          <FormDots results={player.recentResults} />

          <div style={S.pMeta}>
            {player.age}a · {player.roleShort ?? player.position} {player.roleLabel ?? player.position} · {player.countryLabel}
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
          {/* Last match form */}
          {player.matchHistory?.[0]?.matchRating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>DERNIER MATCH</span>
              <span style={{
                fontSize: 11,
                fontWeight: 900,
                color: player.matchHistory[0].matchRating >= 7.5 ? '#00a676' : player.matchHistory[0].matchRating >= 6 ? '#2563eb' : '#b42318',
                fontFamily: 'system-ui,sans-serif',
              }}>
                {player.matchHistory[0].matchRating}/10
              </span>
              {player.matchHistory[0].goals > 0 && (
                <span style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>B {player.matchHistory[0].goals}</span>
              )}
              {player.matchHistory[0].assists > 0 && (
                <span style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>P {player.matchHistory[0].assists}</span>
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
