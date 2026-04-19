import React from 'react';
import { AlertTriangle, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { getActiveDossierPlayerIds, getPlayerLifecycleState } from '../systems/dossierSystem';
import { S } from './styles';

function contractColor(weeksLeft) {
  if (weeksLeft < 8) return '#dc2626';
  if (weeksLeft < 26) return '#b45309';
  return '#00a676';
}

function contractLabel(weeksLeft) {
  if (weeksLeft < 8) return 'URGENT';
  if (weeksLeft < 26) return 'BIENTÔT';
  return 'OK';
}

function ContractBar({ weeksLeft, maxWeeks = 156 }) {
  const pct = Math.min(100, Math.round((weeksLeft / maxWeeks) * 100));
  const color = contractColor(weeksLeft);
  return (
    <div style={S.progBar}>
      <div style={{ ...S.progFill, width: `${pct}%`, background: color }} />
    </div>
  );
}

function SummaryPill({ count, label, color, icon: Icon }) {
  return (
    <div style={{
      flex: 1,
      background: '#ffffff',
      border: `1px solid ${color}40`,
      borderRadius: 8,
      padding: '10px 8px',
      textAlign: 'center',
      boxShadow: '0 10px 24px rgba(15,23,32,.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        <Icon size={14} color={color} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 9, letterSpacing: '.12em', color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 800, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function PlayerContractCard({ player, state, onNego }) {
  const weeksLeft = player.contractWeeksLeft ?? 0;
  const color = contractColor(weeksLeft);
  const label = contractLabel(weeksLeft);
  const lifecycle = getPlayerLifecycleState(player, state);
  const locked = ['predeal', 'transferred'].includes(lifecycle.key) || getActiveDossierPlayerIds(state).has(player.id);

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${weeksLeft < 8 ? '#fca5a5' : weeksLeft < 26 ? '#fcd34d' : '#e5eaf0'}`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 8,
      padding: '12px 14px',
      marginBottom: 10,
      boxShadow: '0 10px 28px rgba(15,23,32,.07)',
    }}>
      {/* Top row: name + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#172026', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.firstName} {player.lastName}
          </div>
          <div style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>
            {player.club} · {player.position}
          </div>
        </div>
        <span style={{
          fontSize: 9,
          letterSpacing: '.12em',
          fontWeight: 900,
          fontFamily: 'system-ui,sans-serif',
          color,
          background: `${color}15`,
          border: `1px solid ${color}40`,
          borderRadius: 6,
          padding: '3px 7px',
          flexShrink: 0,
          marginLeft: 8,
        }}>
          {label}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 6 }}>
        <ContractBar weeksLeft={weeksLeft} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>
            {weeksLeft > 0 ? `${weeksLeft} sem. restantes` : 'Contrat expiré'}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, color, fontFamily: 'system-ui,sans-serif' }}>
            {formatMoney(player.weeklySalary ?? 0)}/sem.
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          onClick={() => onNego(player, 'extend')}
          disabled={locked}
          style={{
            background: color,
            color: '#ffffff',
            border: 'none',
            borderRadius: 7,
            padding: '7px 14px',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '.1em',
            fontFamily: 'system-ui,sans-serif',
            cursor: locked ? 'not-allowed' : 'pointer',
            boxShadow: `0 8px 20px ${color}40`,
            opacity: locked ? 0.45 : 1,
          }}
        >
          {locked ? 'DÉJÀ LIÉ' : 'PROLONGER →'}
        </button>
      </div>
    </div>
  );
}

export default function ContractDashboard({ state, currentWeek, onOpenPlayer, onNego }) {
  const roster = state?.roster ?? [];

  const urgent = roster.filter(p => (p.contractWeeksLeft ?? 0) < 8);
  const warning = roster.filter(p => (p.contractWeeksLeft ?? 0) >= 8 && (p.contractWeeksLeft ?? 0) < 26);
  const safe = roster.filter(p => (p.contractWeeksLeft ?? 0) >= 26);

  const sorted = [...roster].sort((a, b) => (a.contractWeeksLeft ?? 0) - (b.contractWeeksLeft ?? 0));

  return (
    <div style={S.vp}>
      {/* Header */}
      <div style={S.et}>
        <div style={S.el}>GESTION</div>
        <h1 style={S.eh}>CONTRATS</h1>
        <div style={{ fontSize: 13, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginTop: 6 }}>
          Vue d'ensemble de ton effectif
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <SummaryPill count={urgent.length} label="URGENTS" color="#dc2626" icon={AlertTriangle} />
        <SummaryPill count={warning.length} label="BIENTÔT" color="#b45309" icon={Clock} />
        <SummaryPill count={safe.length} label="SÉCURISÉS" color="#00a676" icon={CheckCircle} />
      </div>

      {/* Player list */}
      {sorted.length === 0 ? (
        <div style={S.empty}>
          Aucun joueur dans ton effectif.<br />
          Signe des joueurs pour gérer leurs contrats ici.
        </div>
      ) : (
        <div style={S.cardList}>
          {/* Urgent section */}
          {urgent.length > 0 && (
            <div>
              <div style={{ ...S.secTitle, color: '#dc2626', marginBottom: 8 }}>
                <AlertTriangle size={12} />
                EXPIRENT DANS MOINS DE 8 SEMAINES
              </div>
              {urgent
                .sort((a, b) => (a.contractWeeksLeft ?? 0) - (b.contractWeeksLeft ?? 0))
                .map(p => (
                <PlayerContractCard key={p.id} player={p} state={state} onNego={onNego} />
                ))}
            </div>
          )}

          {/* Warning section */}
          {warning.length > 0 && (
            <div>
              <div style={{ ...S.secTitle, color: '#b45309', marginBottom: 8 }}>
                <Clock size={12} />
                EXPIRENT DANS 8–26 SEMAINES
              </div>
              {warning
                .sort((a, b) => (a.contractWeeksLeft ?? 0) - (b.contractWeeksLeft ?? 0))
                .map(p => (
                <PlayerContractCard key={p.id} player={p} state={state} onNego={onNego} />
                ))}
            </div>
          )}

          {/* Safe section */}
          {safe.length > 0 && (
            <div>
              <div style={{ ...S.secTitle, color: '#00a676', marginBottom: 8 }}>
                <TrendingUp size={12} />
                CONTRATS SÉCURISÉS (&gt; 26 SEMAINES)
              </div>
              {safe
                .sort((a, b) => (a.contractWeeksLeft ?? 0) - (b.contractWeeksLeft ?? 0))
                .map(p => (
                <PlayerContractCard key={p.id} player={p} state={state} onNego={onNego} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
