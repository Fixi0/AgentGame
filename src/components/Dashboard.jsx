import React from 'react';
import { ArrowRight, Bell, BriefcaseBusiness, CalendarDays, ChevronRight, CircleDollarSign, Clock3, FolderKanban, Handshake, MessageCircle, Play, Shield, Trophy, Users } from 'lucide-react';
import { getAgencyCapacity } from '../systems/agencySystem';
import { getMarketOfferQueue, getPendingMessageCounts, messageNeedsResponse } from '../systems/dossierSystem';
import { getMarketReachLabel } from '../systems/reputationSystem';
import { formatMoney } from '../utils/format';

function ActionCard({ icon: Icon, label, detail, tone = 'grass', onClick }) {
  const color = tone === 'gold' ? 'var(--af-gold)' : tone === 'blue' ? 'var(--af-blue)' : 'var(--af-grass)';
  return (
    <button type="button" onClick={onClick} className="af-glass" style={{ borderRadius: 8, padding: 14, cursor: 'pointer', display: 'grid', gridTemplateColumns: '34px 1fr 18px', gap: 11, alignItems: 'center', textAlign: 'left' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: `color-mix(in oklch, ${color} 22%, transparent)`, border: `1px solid color-mix(in oklch, ${color} 42%, transparent)` }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--af-text)', fontSize: 14, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ color: 'var(--af-muted)', fontSize: 12, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>
      </div>
      <ChevronRight size={18} color="var(--af-dim)" />
    </button>
  );
}

function WeekFocus({ urgentMessages, marketQueue, expiringContracts, onNav, onOpenContracts }) {
  const items = [];
  if (urgentMessages.length) {
    items.push({ icon: MessageCircle, tone: 'gold', label: `${urgentMessages.length} réponse à donner`, detail: urgentMessages[0]?.playerName || 'Conversation active', onClick: () => onNav('messages') });
  }
  if (marketQueue.length) {
    items.push({ icon: Handshake, tone: 'blue', label: `${marketQueue.length} offre à suivre`, detail: marketQueue[0]?.playerName || 'Dossier mercato', onClick: () => onNav('dossiers') });
  }
  if (expiringContracts.length) {
    items.push({ icon: BriefcaseBusiness, tone: 'gold', label: 'Contrat à sécuriser', detail: `${expiringContracts[0].firstName} ${expiringContracts[0].lastName}`, onClick: () => onOpenContracts?.() || onNav('contracts') });
  }
  if (!items.length) {
    items.push({ icon: Shield, tone: 'grass', label: 'Bureau sous contrôle', detail: 'Lance la semaine quand tu es prêt', onClick: () => onNav('calendar') });
  }

  return (
    <section className="af-panel" style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div className="af-kicker">Priorité</div>
          <h2 style={{ margin: '5px 0 0', color: 'var(--af-text)', fontSize: 24, letterSpacing: '-.04em' }}>À traiter maintenant</h2>
        </div>
        <Bell size={20} color="var(--af-gold)" />
      </div>
      {items.slice(0, 3).map((item) => <ActionCard key={item.label} {...item} />)}
    </section>
  );
}

function SeasonPanel({ phase, state, onNav }) {
  const worldCupActive = state.worldCupState && state.worldCupState.phase !== 'done';
  const euroPlayers = state.roster.filter((player) => player.europeanCompetition).length;
  return (
    <section className="af-panel" style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div>
        <div className="af-kicker">Saison {phase.season}</div>
        <h2 style={{ margin: '5px 0 0', color: 'var(--af-text)', fontSize: 24, letterSpacing: '-.04em' }}>Semaine {phase.seasonWeek}/38</h2>
      </div>
      <div style={{ display: 'grid', gap: 9 }}>
        <ActionCard icon={CalendarDays} label="Championnat" detail={`${phase.phase} · ${phase.month ?? ''}`} onClick={() => onNav('standings')} />
        <ActionCard icon={Trophy} tone="blue" label="Coupes européennes" detail={euroPlayers ? `${euroPlayers} joueur${euroPlayers > 1 ? 's' : ''} concernés` : 'Aucun joueur engagé'} onClick={() => onNav('europe')} />
        <ActionCard icon={Trophy} tone="gold" label="Tournoi mondial" detail={worldCupActive ? `${state.worldCupState.selectedPlayers?.length ?? 0} sélectionnés` : 'Hors tournoi'} onClick={() => onNav('calendar')} />
      </div>
    </section>
  );
}

function MiniTrend() {
  return (
    <svg viewBox="0 0 120 36" aria-hidden="true" style={{ width: '100%', height: 28, marginTop: 8, opacity: .9 }}>
      <path d="M0 30 C20 22 24 27 38 16 S62 21 78 10 S102 8 120 3" fill="none" stroke="var(--af-grass)" strokeWidth="4" strokeLinecap="round" />
      <path d="M0 36 C20 26 24 31 38 20 S62 25 78 14 S102 12 120 7 V36 Z" fill="oklch(70% 0.19 155 / .13)" />
    </svg>
  );
}

export default function Dashboard({ state, phase, onPlay, onNav, onOpenContracts }) {
  const pendingCounts = getPendingMessageCounts(state);
  const urgentMessages = (state.messages ?? []).filter(messageNeedsResponse).slice(0, 3);
  const marketQueue = getMarketOfferQueue(state).filter((offer) => offer.status === 'open').slice(0, 4);
  const expiringContracts = state.roster.filter((player) => (player.contractWeeksLeft ?? 99) <= 12).slice(0, 3);
  const portfolioValue = state.roster.reduce((sum, player) => sum + (player.value ?? 0), 0);
  const capacity = getAgencyCapacity(state.agencyLevel);
  const nextMatchPlayer = state.roster.find((player) => player.nextFixture || player.europeanCompetition) ?? state.roster[0];
  const nextMatchLabel = nextMatchPlayer
    ? `${nextMatchPlayer.firstName} ${nextMatchPlayer.lastName} · ${nextMatchPlayer.club || 'Club'}`
    : 'Recrute ton premier joueur';

  const stats = [
    { label: 'Capital', value: formatMoney(state.money ?? 0), icon: CircleDollarSign },
    { label: 'Réputation', value: state.reputation ?? 0, icon: Trophy },
    { label: 'Joueurs', value: `${state.roster.length}/${capacity}`, icon: Users },
    { label: 'Messages', value: pendingCounts.total ?? 0, icon: MessageCircle },
  ];

  return (
    <div className="af-page">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 14, marginBottom: 14 }}>
        <section className="af-panel" style={{ padding: 18, minHeight: 304, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .55, background: 'radial-gradient(circle at 84% 20%, oklch(70% 0.19 155 / .24), transparent 32%), linear-gradient(130deg, transparent 52%, oklch(82% 0.16 83 / .12))' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="af-kicker">Bureau de l'agent</div>
            <h1 className="af-title">Décide. Négocie. Fais grandir.</h1>
            <p style={{ maxWidth: 520, color: 'var(--af-muted)', lineHeight: 1.55, marginTop: 14 }}>
              Une seule question cette semaine: quel dossier mérite ton attention avant de lancer les matchs ?
            </p>
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'end' }}>
            <div className="af-glass" style={{ borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--af-gold)', fontWeight: 950, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 10 }}>
                <Clock3 size={15} />
                Prochain rendez-vous
              </div>
              <div style={{ color: 'var(--af-text)', fontWeight: 950, fontSize: 20, marginTop: 7 }}>{nextMatchLabel}</div>
              <div style={{ color: 'var(--af-muted)', fontSize: 12, marginTop: 3 }}>Semaine {phase.seasonWeek}/38 · {phase.phase}</div>
            </div>
            <button type="button" onClick={onPlay} className="af-btn-primary" style={{ width: 82, height: 82, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
              <Play size={32} fill="currentColor" />
            </button>
          </div>
        </section>

        <WeekFocus urgentMessages={urgentMessages} marketQueue={marketQueue} expiringContracts={expiringContracts} onNav={onNav} onOpenContracts={onOpenContracts} />
      </div>

      <div className="af-stat-grid" style={{ marginBottom: 14 }}>
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="af-stat">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div className="af-stat-label">{label}</div>
              <Icon size={16} color="var(--af-grass)" />
            </div>
            <div className="af-stat-value">{value}</div>
            <MiniTrend />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
        <SeasonPanel phase={phase} state={state} onNav={onNav} />
        <section className="af-panel" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div className="af-kicker">Vision agence</div>
              <h2 style={{ margin: '5px 0 0', color: 'var(--af-text)', fontSize: 24, letterSpacing: '-.04em' }}>Ce que tu construis</h2>
            </div>
            <FolderKanban size={20} color="var(--af-grass)" />
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <ActionCard icon={Shield} label="Portée marché" detail={getMarketReachLabel(state.reputation)} onClick={() => onNav('scouting')} />
            <ActionCard icon={BriefcaseBusiness} tone="gold" label="Valeur portefeuille" detail={formatMoney(portfolioValue)} onClick={() => onNav('roster')} />
            <button type="button" onClick={() => onNav('more')} className="af-btn-secondary" style={{ marginTop: 2, padding: '13px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Ouvrir les dossiers secondaires
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
