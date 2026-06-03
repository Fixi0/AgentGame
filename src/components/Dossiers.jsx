import { AlertTriangle, Briefcase, Clock3, FileText, Shield, Timer, Users } from 'lucide-react';
import React, { useMemo } from 'react';
import { CLUBS, getClubDisplayName } from '../data/clubs';
import { getClubMemorySummary, getClubProfile } from '../systems/clubSystem';
import { getMarketOfferQueue, getPendingMessageCounts, getPlayerDossierStatus, getRelevantDecisionHistory, getMessageQueueLabel, messageNeedsResponse } from '../systems/dossierSystem';
import { S } from './styles';

const STATUS_COLORS = {
  good: '#00a676',
  warn: '#b45309',
  danger: '#b42318',
  neutral: 'var(--af-muted)',
};

export default function Dossiers({ state, databaseView = null, onOpenPlayer, onClubDetails, onNav, onOpenOffer }) {
  const counts = getPendingMessageCounts(state);
  const playerById = useMemo(() => new Map((state.roster ?? []).map((player) => [player.id, player])), [state.roster]);
  const clubMemoryEntries = useMemo(() => (
    CLUBS.map((club) => ({
      club,
      memory: state.clubMemory?.[club.name] ?? { trust: 50, blocks: 0, lies: 0, promisesBroken: 0, lastWeek: 0 },
    }))
      .sort((a, b) => a.memory.trust - b.memory.trust)
      .slice(0, 4)
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
      .slice(0, 6)
  ), [state]);

  const queueMessages = (state.messageQueue ?? []).slice(0, 8);
  const inboxAlerts = (state.messages ?? []).filter(messageNeedsResponse).slice(0, 6);
  const dossierHistory = (state.decisionHistory ?? []).slice(0, 8);
  const marketQueue = getMarketOfferQueue(state).filter((offer) => offer.status === 'open').slice(0, 6);
  const activeInjuries = (databaseView?.injuries ?? [])
    .filter((injury) => injury.status === 'active')
    .sort((a, b) => (b.remaining_weeks ?? 0) - (a.remaining_weeks ?? 0))
    .slice(0, 5);
  const recentTransfers = (databaseView?.transfers ?? [])
    .sort((a, b) => (b.transfer_date ?? 0) - (a.transfer_date ?? 0))
    .slice(0, 5);
  const recentCompetitionRows = (databaseView?.competitionHistory ?? [])
    .filter((row) => row.source === 'fixtures' && row.club_id === row.home_club_id)
    .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
    .slice(0, 6);

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
        <MiniKpi icon={<Users size={16} />} label="Total" value={counts.total} accent="var(--af-text)" />
      </div>

      <div style={{ ...S.quickActs, gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
        <button type="button" onClick={() => onNav?.('contracts')} style={S.quickCard}>
          <Briefcase size={18} color="oklch(72% 0.20 295)" />
          <div style={S.qLabel}>Contrats</div>
          <div style={S.qSub}>Prolongations, salaires, dossiers actifs</div>
        </button>
        <button type="button" onClick={() => onNav?.('deadline')} style={S.quickCard}>
          <Timer size={18} color="oklch(72% 0.20 295)" />
          <div style={S.qLabel}>Deadline Day</div>
          <div style={S.qSub}>Offres ouvertes et appels mercato</div>
        </button>
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
        <div style={S.secTitle}>FILE MERCATO</div>
        {marketQueue.length ? marketQueue.map((offer) => {
          const offerPlayer = playerById.get(offer.playerId);
          return (
          <button
            key={offer.id}
            type="button"
            onClick={() => onOpenOffer?.(offer.id) || (offerPlayer ? onOpenPlayer?.(offerPlayer) : onNav?.('deadline'))}
            style={{
            ...S.offerRow,
            background: offer.queueStatus?.key === 'bloquee' ? 'oklch(28% 0.12 25 / .35)' : offer.queueStatus?.key === 'conclue' ? 'oklch(28% 0.10 155 / .35)' : offer.queueStatus?.key === 'en_cours' ? 'oklch(22% 0.05 245 / .55)' : 'var(--af-surface-soft)',
            borderColor: offer.queueStatus?.key === 'bloquee' ? '#fca5a5' : offer.queueStatus?.key === 'conclue' ? 'var(--af-border)' : offer.queueStatus?.key === 'en_cours' ? 'var(--af-border)' : 'var(--af-border)',
            alignItems: 'flex-start',
            cursor: 'pointer',
            textAlign: 'left',
            font: 'inherit',
            width: '100%',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--af-text)' }}>{offer.playerName}</strong>
                <span style={{
                  ...S.preAccordBadge,
                  background: offer.queueStatus?.key === 'bloquee' ? 'oklch(30% 0.14 25 / .55)' : offer.queueStatus?.key === 'conclue' ? 'oklch(30% 0.14 155 / .55)' : offer.queueStatus?.key === 'en_cours' ? 'oklch(30% 0.14 245 / .55)' : 'oklch(30% 0.10 80 / .45)',
                  color: offer.queueStatus?.tone === 'danger' ? '#b42318' : offer.queueStatus?.tone === 'good' ? 'var(--af-grass)' : offer.queueStatus?.tone === 'warn' ? 'var(--af-cyan)' : '#8a6f1f',
                }}>
                  {offer.queueStatus?.label ?? 'Nouvelle'}
                </span>
              </div>
              <div style={S.fixtureMeta}>
                {getClubDisplayName(offer.club) || offer.club} · {offer.price.toLocaleString('fr-FR')} € · {offer.preWindow ? `pré-accord S${offer.effectiveWeek}` : `expire S${offer.expiresWeek}`}
              </div>
              <div style={S.qSub}>{offer.queueStatus?.detail ?? 'Dossier suivi dans la file mercato.'}</div>
            </div>
            <strong>{offer.queueStatus?.label ?? offer.status}</strong>
          </button>
          );
        }) : <div style={S.emptySmall}>Aucune offre à suivre.</div>}
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
            <strong>{message.subject} · Réponse attendue</strong>
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
            <strong style={{ color: STATUS_COLORS[status.tone] ?? 'var(--af-text)' }}>
              {status.label}
              {status.weeksUntilReopen > 0 ? ` · ${status.weeksUntilReopen} sem.` : ''}
              {relevantDecisions.length > 0 ? ` · ${relevantDecisions.length}` : ''}
            </strong>
          </button>
        )) : <div style={S.emptySmall}>Aucun joueur sensible pour l'instant.</div>}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>SAISONS DE CLUB</div>
        {sensitivePlayers.length ? sensitivePlayers.slice(0, 5).map(({ player, status }) => {
          const context = player.clubSeasonContext;
          return (
            <button key={`season-${player.id}`} onClick={() => onOpenPlayer?.(player)} style={S.decisionRow}>
              <span>
                {player.firstName} {player.lastName}
                <div style={S.fixtureMeta}>
                  {player.club} · {context ? `${context.position ?? '-'}e/${context.totalClubs ?? '-'} · ${context.points ?? 0} pts` : 'classement à venir'}
                </div>
              </span>
              <strong style={{ color: STATUS_COLORS[status.tone] ?? 'var(--af-text)' }}>
                {context ? `${context.points ?? 0} pts` : 'suivi en cours'}
              </strong>
            </button>
          );
        }) : <div style={S.emptySmall}>Les contextes de club apparaîtront avec les premiers matchs.</div>}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>BLESSURES EN BASE</div>
        {activeInjuries.length ? activeInjuries.map((injury) => {
          const player = playerById.get(injury.player_id);
          return (
            <button key={injury.id} onClick={() => player && onOpenPlayer?.(player)} style={S.decisionRow}>
              <span>
                {injury.player_name}
                <div style={S.fixtureMeta}>{getClubDisplayName(injury.club_name) || injury.club_name} · {injury.reason}</div>
              </span>
              <strong>{injury.remaining_weeks} sem.</strong>
            </button>
          );
        }) : <div style={S.emptySmall}>Aucune blessure active.</div>}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>HISTORIQUE COMPETITIONS</div>
        {recentCompetitionRows.length ? recentCompetitionRows.map((match) => (
          <button key={match.id} onClick={() => onClubDetails?.(match.club_name)} style={S.decisionRow}>
            <span>
              {getClubDisplayName(match.club_name) || match.club_name} {match.score ?? '-'} {getClubDisplayName(match.opponent_name) || match.opponent_name}
              <div style={S.fixtureMeta}>S{match.week} · {match.competition_label ?? match.competition}</div>
            </span>
            <strong>{match.result}</strong>
          </button>
        )) : <div style={S.emptySmall}>Aucun résultat persisté.</div>}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>TRANSFERTS HISTORISES</div>
        {recentTransfers.length ? recentTransfers.map((transfer) => (
          <div key={transfer.id} style={S.promiseRow}>
            <span>{transfer.player_name ?? transfer.player_id} · {transfer.from_club_name ? `${getClubDisplayName(transfer.from_club_name) || transfer.from_club_name} → ` : ''}{getClubDisplayName(transfer.to_club_name) || transfer.to_club_name || 'club'}</span>
            <strong>{transfer.result ?? 'en cours'}</strong>
          </div>
        )) : <div style={S.emptySmall}>Aucun transfert enregistré en base.</div>}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>MEMOIRE CLUBS</div>
        {clubMemoryEntries.map(({ club, memory }) => {
          const profile = getClubProfile(club, state.clubRelations?.[club.name] ?? 50);
          return (
            <button key={club.name} onClick={() => onClubDetails?.(club.name)} style={S.decisionRow}>
              <span>
                {getClubDisplayName(club.name) || club.name}
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
