import React, { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronRight, ChevronUp, CircleDollarSign, Clock3, FolderKanban, Handshake, MessageCircle, Play, Shield, Sparkles, Trophy, Users } from 'lucide-react';
import { getAgencyCapacity } from '../systems/agencySystem';
import { getMarketOfferQueue, getPendingMessageCounts, messageNeedsResponse } from '../systems/dossierSystem';
import { getMarketReachLabel } from '../systems/reputationSystem';
import { formatMoney } from '../utils/format';
import { getPlayerPortrait } from '../utils/playerPortraits';
import { ClubCrest } from '../utils/clubCrests';
import stadiumHero from '../assets/hero/broadcast-celebration.jpg';

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

function StarHero({ player, phase, onPlay, onOpenPlayer, net }) {
  if (!player) {
    return (
      <section className="af-hero-broadcast af-anim-fade-in" style={{ minHeight: 360, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', backgroundImage: `url(${stadiumHero})` }}>
        <h1 className="af-titan" style={{ color: '#fff', fontSize: 'clamp(40px, 11vw, 88px)' }}>Décide.<br/>Domine.</h1>
        <p style={{ color: 'rgba(255,255,255,.78)', maxWidth: 520, lineHeight: 1.55, marginTop: 14, fontSize: 14 }}>Recrute ton premier joueur pour ouvrir ta vitrine.</p>
        <button type="button" onClick={onPlay} className="af-btn-primary af-hover-lift" style={{ marginTop: 22, width: 76, height: 76, borderRadius: 18, display: 'grid', placeItems: 'center' }}>
          <Play size={30} fill="currentColor" />
        </button>
      </section>
    );
  }
  const portrait = getPlayerPortrait(player);
  return (
    <section
      className="af-hero-broadcast af-anim-fade-in"
      style={{
        position: 'relative',
        minHeight: 420,
        padding: 0,
        backgroundImage: `linear-gradient(180deg, oklch(8% 0.025 258 / .25) 0%, oklch(8% 0.025 258 / .55) 55%, oklch(6% 0.02 258 / .98) 100%), url(${portrait})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 18%',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <span className="af-cyan-line" />
              <span style={{ color: 'var(--af-cyan)', fontSize: 11, fontWeight: 900, letterSpacing: '.32em', textTransform: 'uppercase' }}>Star Du Bureau · S{phase.season} W{phase.seasonWeek}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'oklch(8% 0.025 258 / .65)', border: '1px solid oklch(78% 0.16 215 / .35)', borderRadius: 999, padding: '5px 12px', color: 'var(--af-gold)', fontWeight: 900, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase' }}>
              <Sparkles size={12} /> Star de l'agence
            </div>
          </div>
          <div style={{ textAlign: 'right', color: 'rgba(255,255,255,.72)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            <div style={{ opacity: .6 }}>Bénéfice net</div>
            <div style={{ color: net >= 0 ? '#7af0c8' : '#f59e7a', fontSize: 14, fontWeight: 950, marginTop: 2 }}>{formatMoney(net)}</div>
          </div>
        </div>

        <div>
          <h1 className="af-titan af-anim-fade-up" style={{ color: '#fff', fontSize: 'clamp(34px, 9vw, 72px)', lineHeight: 1, margin: 0 }}>
            {player.firstName}<br />{player.lastName}
          </h1>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.85)', fontSize: 13, fontWeight: 800 }}>
            <ClubCrest club={player.club} size={20} /> {player.club || 'Libre'}
          </div>
          <div className="af-anim-fade-up af-anim-d2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, marginTop: 18 }}>
            <button type="button" onClick={() => onOpenPlayer?.(player)} className="af-glass" style={{ borderRadius: 12, padding: 12, textAlign: 'left', cursor: 'pointer', backdropFilter: 'blur(18px)', background: 'oklch(8% 0.025 258 / .55)', border: '1px solid oklch(78% 0.16 215 / .3)' }}>
              <div style={{ color: 'var(--af-cyan)', fontSize: 9, fontWeight: 950, letterSpacing: '.18em', textTransform: 'uppercase' }}>Ouvre la fiche</div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 800, marginTop: 4 }}>{player.position} · {player.club || 'Libre'}</div>
            </button>
            <button type="button" onClick={onPlay} className="af-btn-primary af-hover-lift" style={{ width: 70, height: 70, borderRadius: 18, display: 'grid', placeItems: 'center' }}>
              <Play size={28} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MatchCarousel({ fixtures, roster, onNav }) {
  if (!fixtures.length) return null;
  const rosterClubs = new Set((roster ?? []).map((p) => p.club));
  return (
    <section className="af-panel" style={{ padding: 14, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="af-kicker">Cette semaine</div>
          <h2 style={{ margin: '4px 0 0', color: 'var(--af-text)', fontSize: 20, letterSpacing: '-.03em' }}>Prochains matchs</h2>
        </div>
        <button type="button" onClick={() => onNav('calendar')} className="af-chip" style={{ padding: '6px 10px', cursor: 'pointer' }}>Tout voir</button>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {fixtures.slice(0, 8).map((f, i) => {
          const home = f.homeClub?.name ?? f.home_club_name ?? 'Domicile';
          const away = f.awayClub?.name ?? f.away_club_name ?? 'Extérieur';
          const mine = rosterClubs.has(home) || rosterClubs.has(away);
          return (
            <div key={`${f.fixtureId ?? i}_${i}`} style={{
              minWidth: 200,
              scrollSnapAlign: 'start',
              padding: '12px 13px',
              borderRadius: 12,
              border: `1px solid ${mine ? 'var(--af-grass)' : 'var(--af-border)'}`,
              background: mine ? 'oklch(28% 0.10 155 / .25)' : 'var(--af-surface)',
              display: 'grid', gap: 6,
            }}>
              <div style={{ color: 'var(--af-cyan)', fontSize: 9, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' }}>
                {f.competitionLabel ?? f.competition_label ?? (f.isFriendly ? 'Amical' : 'Championnat')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--af-text)', fontWeight: 900, fontSize: 13 }}>
                <ClubCrest club={home} size={20} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{home}</span>
              </div>
              <div style={{ color: 'var(--af-dim)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em' }}>VS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--af-text)', fontWeight: 900, fontSize: 13 }}>
                <ClubCrest club={away} size={20} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{away}</span>
              </div>
              {mine && <div style={{ color: 'var(--af-grass)', fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>Mon joueur</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WeekFocus({ urgentMessages, marketQueue, expiringContracts, onNav, onOpenContracts, onOpenOffer }) {
  const items = [];
  if (urgentMessages.length) items.push({ icon: MessageCircle, tone: 'gold', label: `${urgentMessages.length} réponse à donner`, detail: urgentMessages[0]?.playerName || 'Conversation active', onClick: () => onNav('messages') });
  if (marketQueue.length) items.push({ icon: Handshake, tone: 'blue', label: `${marketQueue.length} offre à suivre`, detail: marketQueue[0]?.playerName || 'Dossier mercato', onClick: () => onOpenOffer?.(marketQueue[0]?.id) || onNav('dossiers') });
  if (expiringContracts.length) items.push({ icon: BriefcaseBusiness, tone: 'gold', label: 'Contrat à sécuriser', detail: `${expiringContracts[0].firstName} ${expiringContracts[0].lastName}`, onClick: () => onOpenContracts?.() || onNav('contracts') });
  if (!items.length) items.push({ icon: Shield, tone: 'grass', label: 'Bureau sous contrôle', detail: 'Lance la semaine quand tu es prêt', onClick: () => onNav('calendar') });

  return (
    <section className="af-panel" style={{ padding: 14, display: 'grid', gap: 8 }}>
      <div className="af-kicker">À traiter</div>
      {items.slice(0, 3).map((item) => <ActionCard key={item.label} {...item} />)}
    </section>
  );
}

export default function Dashboard({ state, phase, onPlay, onNav, onOpenContracts, onOpenPlayer, onOpenOffer }) {
  const [showDetails, setShowDetails] = useState(false);
  const pendingCounts = getPendingMessageCounts(state);
  const urgentMessages = (state.messages ?? []).filter(messageNeedsResponse).slice(0, 3);
  const marketQueue = getMarketOfferQueue(state).filter((offer) => offer.status === 'open').slice(0, 4);
  const expiringContracts = state.roster.filter((player) => (player.contractWeeksLeft ?? 99) <= 12).slice(0, 3);
  const portfolioValue = state.roster.reduce((sum, player) => sum + (player.value ?? 0), 0);
  const capacity = getAgencyCapacity(state.agencyLevel);
  const starPlayer = [...(state.roster ?? [])].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null;
  const fixtures = (state.matchCalendar ?? [])
    .filter((match) => match.status === 'scheduled' && match.week === state.week)
    .map((match) => match.fixture)
    .filter(Boolean);
  const visibleFixtures = fixtures.length ? fixtures : state.nextFixtures ?? [];
  const net = (state.history ?? []).slice(-1)[0]?.net ?? 0;

  return (
    <div className="af-page">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14, marginBottom: 14 }}>
        <StarHero player={starPlayer} phase={phase} onPlay={onPlay} onOpenPlayer={onOpenPlayer} net={net} />
        <WeekFocus urgentMessages={urgentMessages} marketQueue={marketQueue} expiringContracts={expiringContracts} onNav={onNav} onOpenContracts={onOpenContracts} onOpenOffer={onOpenOffer} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <MatchCarousel fixtures={visibleFixtures} roster={state.roster ?? []} onNav={onNav} />
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="af-glass"
        style={{ width: '100%', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: showDetails ? 14 : 0 }}
      >
        <span style={{ color: 'var(--af-text)', fontWeight: 900, letterSpacing: '.05em', fontSize: 13 }}>
          {showDetails ? 'Masquer le détail bureau' : 'Voir le détail bureau (chiffres, saison, agence)'}
        </span>
        {showDetails ? <ChevronUp size={18} color="var(--af-muted)" /> : <ChevronDown size={18} color="var(--af-muted)" />}
      </button>

      {showDetails && (
        <>
          <div className="af-glass" style={{ marginBottom: 14, padding: 14, borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Capital', value: formatMoney(state.money ?? 0), icon: CircleDollarSign, tone: 'var(--af-grass)' },
              { label: 'Réputation', value: state.reputation ?? 0, icon: Trophy, tone: 'var(--af-gold)' },
              { label: 'Joueurs', value: `${state.roster.length}/${capacity}`, icon: Users, tone: 'var(--af-cyan)' },
              { label: 'Messages', value: pendingCounts.total ?? 0, icon: MessageCircle, tone: 'var(--af-blue)' },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '6px 4px', textAlign: 'center', borderRight: label !== 'Messages' ? '1px solid var(--af-border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: `color-mix(in oklch, ${tone} 18%, transparent)`, border: `1px solid color-mix(in oklch, ${tone} 35%, transparent)` }}>
                  <Icon size={14} color={tone} />
                </div>
                <div style={{ color: 'var(--af-text)', fontSize: 13, fontWeight: 950, lineHeight: 1, letterSpacing: '-.01em' }}>{value}</div>
                <div style={{ color: 'var(--af-muted)', fontSize: 9, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
            <section className="af-panel" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div>
                <div className="af-kicker">Saison {phase.season}</div>
                <h2 style={{ margin: '5px 0 0', color: 'var(--af-text)', fontSize: 22, letterSpacing: '-.03em' }}>Semaine {phase.seasonWeek}/38</h2>
              </div>
              <ActionCard icon={CalendarDays} label="Championnat" detail={`${phase.phase} · ${phase.month ?? ''}`} onClick={() => onNav('standings')} />
              <ActionCard icon={Trophy} tone="blue" label="Coupes européennes" detail={state.roster.filter((p) => p.europeanCompetition).length ? `${state.roster.filter((p) => p.europeanCompetition).length} joueurs` : 'Aucun engagé'} onClick={() => onNav('europe')} />
              <ActionCard icon={Trophy} tone="gold" label="Tournoi mondial" detail={state.worldCupState && state.worldCupState.phase !== 'done' ? `${state.worldCupState.selectedPlayers?.length ?? 0} sélectionnés` : 'Hors tournoi'} onClick={() => onNav('calendar')} />
            </section>
            <section className="af-panel" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div className="af-kicker">Vision agence</div>
                  <h2 style={{ margin: '5px 0 0', color: 'var(--af-text)', fontSize: 22, letterSpacing: '-.03em' }}>Ce que tu construis</h2>
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
        </>
      )}
    </div>
  );
}
