import { ArrowUpRight, Handshake, X } from 'lucide-react';
import React from 'react';
import { PERSONALITY_LABELS } from '../data/players';
import { getPlayerDossierStatus } from '../systems/dossierSystem';
import { formatMoney } from '../utils/format';
import { S } from './styles';

export default function PlayerCard({ player, state, mode, money, onSign, onRelease, onNego, onDetails }) {
  const ratingColor = player.rating >= 85 ? '#00a676' : player.rating >= 75 ? '#2f80ed' : '#9aa7b2';
  const moralColor = player.moral >= 60 ? '#00a676' : player.moral >= 40 ? '#8a6f1f' : '#b42318';
  const trustColor = player.trust >= 60 ? '#00a676' : player.trust >= 40 ? '#8a6f1f' : '#b42318';
  const canSign = mode === 'sign' ? money >= player.signingCost : true;
  const isFreeInRoster = mode === 'roster' && (player.freeAgent || player.club === 'Libre');
  const dossierStatus = getPlayerDossierStatus(player, state);
  const statusColor = dossierStatus.tone === 'good' ? '#00a676' : dossierStatus.tone === 'warn' ? '#b45309' : dossierStatus.tone === 'danger' ? '#b42318' : '#64727d';

  return (
    <div style={S.pCard}>
      <div style={S.pTop} onClick={onDetails} role={onDetails ? 'button' : undefined}>
        <div style={S.playerAvatar}>{player.firstName[0]}{player.lastName[0]}</div>
        <div style={{ ...S.badge, background: ratingColor }}>
          <div style={S.badgeNum}>{player.rating}</div>
          <div style={S.badgePos}>{player.position}</div>
        </div>
        <div style={S.pInfo}>
          <div style={S.pName}>
            {player.firstName} <strong>{player.lastName}</strong>
          </div>
          <div style={S.pMeta}>
            {player.age}a · {player.roleShort ?? player.position} {player.roleLabel ?? player.position} · {player.countryFlag} {player.countryLabel} · {player.clubCountry} {player.club}
          </div>
          {player.clubCity && <div style={S.pMeta}>{player.clubCity}</div>}
          <div style={S.pStats}>
            <span>Val. {formatMoney(player.value)}</span>
            <span>·</span>
            <span>Sal. {formatMoney(player.weeklySalary)}/s</span>
          </div>
          <div style={S.pMeta2}>
            <span>{PERSONALITY_LABELS[player.personality] ?? player.personality}</span>
            <span>·</span>
            <span style={{ color: moralColor }}>Moral {player.moral}</span>
            <span>·</span>
            <span style={{ color: trustColor }}>Confiance {player.trust}</span>
          </div>
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
          <span>SIGNER</span>
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
