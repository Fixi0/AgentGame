import { AlertTriangle, Clock3, FileText, Shield, Users } from 'lucide-react';
import React, { useMemo } from 'react';
import { CLUBS } from '../data/clubs';
import { getClubMemorySummary, getClubProfile } from '../systems/clubSystem';
import { getPendingMessageCounts, getPlayerDossierStatus, getRelevantDecisionHistory, getMessageQueueLabel } from '../systems/dossierSystem';
import { S } from './styles';

const STATUS_COLORS = {
  good: '#00a676',
  warn: '#b45309',
  danger: '#b42318',
  neutral: '#64727d',
};

export default function Dossiers({ state, onOpenPlayer, onClubDetails, onNav }) {
  const counts = getPendingMessageCounts(state);
  const clubMemoryEntries = useMemo(() => (
    CLUBS.map((club) => ({
      club,
      memory: state.clubMemory?.[club.name] ?? { trust: 50, blocks: 0, lies: 0, promisesBroken: 0, lastWeek: 0 },
    }))
      .sort((a, b) => a.memory.trust - b.memory.trust)
      .slice(0, 6)
  ), [state.clubMemory]);

  const sensitivePlayers = useMemo(() => (
    [...state.roster]
      .map((player) => {
        const status = getPlayerDossierStatus(player, state);
        const openOffers = (state.clubOffers ?? []).filter((offer) => offer.playerId === player.id && offer.status === 'open').length;
        const relevantDecisions = getRelevantDecisionHistory(state.decisionHistory ?? [], { playerId: player.id }).slice(0, 3);
        return { player, status, openOffers, relevantDecisions };
      })
      .filter(({ status, openOffers, relevantDecisions, player }) => (
        status.label !== 'Stable'
        || openOffers > 0
        || relevantDecisions.length > 0
        || (state.promises ?? []).some((promise) => promise.playerId === player.id && !promise.resolved && !promise.failed)
      ))
      .sort((a, b) => {
        const order = { danger: 0, warn: 1, neutral: 2, good: 3 };
        return (order[a.status.tone] ?? 2) - (order[b.status.tone] ?? 2);
      })
      .slice(0, 8)
  ), [state]);

  const queueMessages = (state.messageQueue ?? []).slice(0, 12);
  const inboxAlerts = (state.messages ?? []).filter((message) => !message.resolved).slice(0, 8);
  const dossierHistory = (state.decisionHistory ?? []).slice(0, 12);

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>DOSSIERS</div>
        <h1 style={S.eh}>Sensibles</h1>
      </div>

      <div style={S.kpiGrid}>
        <MiniKpi icon={<AlertTriangle size={16} />} label="Urgent" value={counts.urgent} accent="#b42318" />
        <MiniKpi icon={<FileText size={16} />} label="Normal" value={counts.normal} accent="#2f80ed" />
        <MiniKpi icon={<Clock3 size={16} />} label="À traiter" value={counts.toProcess} accent="#b45309" />
        <MiniKpi icon={<Users size={16} />} label="Total" value={counts.total} accent="#172026" />
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>FILE D'ATTENTE</div>
        {queueMessages.length ? queueMessages.map((message) => (
          <button
            key={message.id}
            onClick={() => onNav('messages')}
            style={S.decisionRow}
          >
            <span>
              {getMessageQueueLabel(message)} · {message.playerName}
            </span>
            <strong>{message.subject}</strong>
          </button>
        )) : <div style={S.emptySmall}>Aucun message en attente.</div>}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>MESSAGES A TRAITER</div>
        {inboxAlerts.length ? inboxAlerts.map((message) => (
          <button
            key={message.id}
            onClick={() => onNav('messages')}
            style={S.decisionRow}
          >
            <span>{message.playerName}</span>
            <strong>{message.subject}</strong>
          </button>
        )) : <div style={S.emptySmall}>Rien d'urgent dans la boîte.</div>}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}><Shield size={14} /> STATUT JOUEURS</div>
        {sensitivePlayers.length ? sensitivePlayers.map(({ player, status, relevantDecisions }) => (
          <button key={player.id} onClick={() => onOpenPlayer?.(player)} style={S.decisionRow}>
            <span>
              {player.firstName} {player.lastName}
              <div style={S.fixtureMeta}>{player.club} · {status.detail}</div>
            </span>
            <strong style={{ color: STATUS_COLORS[status.tone] ?? '#172026' }}>
              {status.label}
              {status.weeksUntilReopen > 0 ? ` · ${status.weeksUntilReopen} sem.` : ''}
              {relevantDecisions.length > 0 ? ` · ${relevantDecisions.length}` : ''}
            </strong>
          </button>
        )) : <div style={S.emptySmall}>Aucun joueur sensible pour l'instant.</div>}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>MEMOIRE CLUBS</div>
        {clubMemoryEntries.map(({ club, memory }) => {
          const profile = getClubProfile(club, state.clubRelations?.[club.name] ?? 50);
          return (
            <button key={club.name} onClick={() => onClubDetails?.(club.name)} style={S.decisionRow}>
              <span>
                {club.name}
                <div style={S.fixtureMeta}>
                  {getClubMemorySummary(state.clubMemory, club.name)} · {profile.style}
                </div>
              </span>
              <strong>{memory.trust}/100</strong>
            </button>
          );
        })}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>FIL DE DECISION</div>
        {dossierHistory.length ? dossierHistory.map((decision) => (
          <div key={decision.id} style={S.promiseRow}>
            <span>{decision.label}</span>
            <strong>S{decision.week}</strong>
          </div>
        )) : <div style={S.emptySmall}>Aucune décision importante.</div>}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>RAPPEL RAPIDE</div>
        <div style={S.sumRow}><span style={S.sumK}>Messages non lus</span><strong>{(state.messages ?? []).filter((message) => !message.resolved).length}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Promesses actives</span><strong>{(state.promises ?? []).filter((promise) => !promise.resolved && !promise.failed).length}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Offres ouvertes</span><strong>{(state.clubOffers ?? []).filter((offer) => offer.status === 'open').length}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Queue</span><strong>{state.messageQueue?.length ?? 0}</strong></div>
      </div>
    </div>
  );
}

function MiniKpi({ icon, label, value, accent }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ ...S.kpiLabel, color: accent }}>
        {icon}
        {label}
      </div>
      <div style={{ ...S.kpiValue, color: accent }}>{value}</div>
    </div>
  );
}
