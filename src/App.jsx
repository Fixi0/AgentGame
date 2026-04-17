import React, { useEffect, useState } from 'react';
import { Briefcase, CalendarDays, DollarSign, Home, Layers, LogOut, MessageCircle, Newspaper, PhoneCall, Search, Shield, Star, Telescope, Timer, Trophy, UserCircle, Users } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AgencyProfile from './components/AgencyProfile';
import Calendar from './components/Calendar';
import DeadlineDay from './components/DeadlineDay';
import Market from './components/Market';
import MediaRoom from './components/MediaRoom';
import Messages from './components/Messages';
import More from './components/More';
import NewsFeed from './components/NewsFeed';
import Onboarding from './components/Onboarding';
import Office from './components/Office';
import Roster from './components/Roster';
import SaveMenu from './components/SaveMenu';
import Phone from './components/Phone';
import Scouting from './components/Scouting';
import SwipeDesk from './components/SwipeDesk';
import Standings from './components/Standings';
import InteractiveModal from './components/modals/InteractiveModal';
import ClubModal from './components/modals/ClubModal';
import { NegotiationExtend, NegotiationTransfer } from './components/modals/NegotiationModals';
import PlayerDetailModal from './components/modals/PlayerDetailModal';
import ResultsModal from './components/modals/ResultsModal';
import { CSS, S } from './components/styles';
import {
  applyChoice,
  acceptClubOffer,
  createPlayerMarketAction,
  createFreshState,
  finishNegotiation,
  getPhase,
  migrateState,
  playWeek,
  refreshMarket,
  rejectClubOffer,
  signPlayer,
  startScoutingMission,
  STORAGE_KEY,
  upgradeAgency,
  upgradeOffice,
  upgradeStaff,
  updateAgencyProfile,
} from './game/gameLogic';
import { getAgencyCapacity } from './systems/agencySystem';
import { getNegotiationContextModifier } from './systems/agencyReputationSystem';
import { applyReputationChange } from './systems/reputationSystem';
import { createMessage, getMessageResponseAction, getResponseCopy, responseEffects } from './systems/messageSystem';
import { createPromiseFromMessage } from './systems/promiseSystem';
import { clamp } from './utils/helpers';
import { formatMoney } from './utils/format';

const getTransferReadiness = (state, player, phase) => {
  if (player.freeAgent || player.club === 'Libre') {
    return phase.mercato
      ? { ok: true, type: 'transfer' }
      : { ok: false, message: 'Les clubs bougent surtout pendant le mercato. Attends la fenêtre pour placer un joueur libre.' };
  }

  if (!phase.mercato) return { ok: false, message: 'Pas de transfert hors mercato. Surveille les fenêtres hiver/été ou attends une vraie offre club.' };

  const chance = 0.18
    + (player.rating >= 76 ? 0.12 : player.rating < 64 ? -0.12 : 0)
    + (player.potential >= 84 ? 0.08 : 0)
    + (player.contractWeeksLeft <= 20 ? 0.1 : 0)
    + (['ambitieux', 'mercenaire'].includes(player.personality) ? 0.08 : 0)
    + ((player.hiddenAmbition ?? 50) > 70 ? 0.08 : 0)
    - ((player.loyalty ?? 50) > 75 ? 0.07 : 0)
    + ((state.leagueReputation?.[player.clubCountryCode] ?? 0) / 500)
    + (getNegotiationContextModifier(state, player, player.club) / 100);

  if (Math.random() > chance) return { ok: false, message: "Aucun club sérieux ne veut ouvrir de dossier maintenant. Continue à faire monter sa valeur." };
  return { ok: true, type: 'transfer' };
};

const getExtensionReadiness = (state, player) => {
  if (player.freeAgent || player.club === 'Libre') return { ok: false, message: "Impossible de prolonger sans club. Trouve-lui d'abord une équipe." };
  const clubOpen = player.contractWeeksLeft <= 26 || player.rating >= 74 || (player.trust ?? 50) >= 62;
  const playerOpen = (player.trust ?? 50) >= 45 && player.moral >= 42;
  if (!clubOpen && !playerOpen) return { ok: false, message: "Ni le club ni le joueur ne veulent prolonger maintenant." };
  if (!clubOpen) return { ok: false, message: "Le club ne veut pas ouvrir de prolongation pour l'instant." };
  if (!playerOpen) return { ok: false, message: "Le joueur n'a pas assez confiance pour prolonger." };
  const contextBonus = getNegotiationContextModifier(state, player, player.club);
  if (Math.random() > 0.65 + contextBonus / 100) return { ok: false, message: "Le club préfère attendre quelques semaines avant de discuter." };
  return { ok: true, type: 'extend' };
};

const views = {
  dashboard: { label: 'Accueil', icon: Home },
  market: { label: 'Marché', icon: Search },
  roster: { label: 'Joueurs', icon: Shield },
  calendar: { label: 'Calend.', icon: CalendarDays },
  standings: { label: 'Ligues', icon: Trophy },
  news: { label: 'News', icon: Newspaper },
  media: { label: 'Médias', icon: Newspaper },
  phone: { label: 'Tel.', icon: PhoneCall },
  deadline: { label: 'Deadline', icon: Timer },
  scouting: { label: 'Scout', icon: Telescope },
  cards: { label: 'Cards', icon: Layers },
  office: { label: 'Agence', icon: Briefcase },
  profile: { label: 'Profil', icon: UserCircle },
  messages: { label: 'Messages', icon: MessageCircle },
};

const mainNav = [
  ['dashboard', views.dashboard],
  ['roster', views.roster],
  ['market', views.market],
  ['phone', views.phone],
  ['more', { label: 'Plus', icon: Layers }],
];

const moreItems = [
  { key: 'messages', label: 'Messages', desc: 'Répondre aux joueurs', icon: MessageCircle },
  { key: 'news', label: 'News', desc: 'Médias et réseaux', icon: Newspaper },
  { key: 'media', label: 'Médias', desc: 'Journalistes alliés ou hostiles', icon: Newspaper },
  { key: 'standings', label: 'Ligues', desc: 'Classements et clubs', icon: Trophy },
  { key: 'calendar', label: 'Calendrier', desc: 'Affiches et résultats', icon: CalendarDays },
  { key: 'deadline', label: 'Deadline Day', desc: 'Appels mercato', icon: Timer },
  { key: 'scouting', label: 'Scouting', desc: 'Missions et rapports', icon: Telescope },
  { key: 'cards', label: 'Cards', desc: 'Dossiers rapides', icon: Layers },
  { key: 'office', label: 'Agence', desc: 'Staff et identité', icon: Briefcase },
  { key: 'profile', label: 'Profil', desc: "Bilan de l'agence", icon: UserCircle },
];

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={S.statCard}>
      <div style={{ ...S.statLabel, color: accent }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={S.statValue}>{value}</div>
    </div>
  );
}

export default function FootballAgentGame() {
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState(null);
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setHasSave(Boolean(saved));
      setState(saved ? migrateState(JSON.parse(saved)) : createFreshState());
      setSaveMenuOpen(Boolean(saved));
    } catch {
      setState(createFreshState());
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || !state) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const commitResult = (result, successMessage) => {
    if (result.error) {
      showToast(result.error, 'error');
      return false;
    }

    setState(result.state);
    if (successMessage) showToast(successMessage, 'success');
    return true;
  };

  const handleSignPlayer = (player) => {
    commitResult(signPlayer(state, player), `${player.firstName} ${player.lastName} signé`);
  };

  const handleReleasePlayer = (playerId) => {
    setState((current) => {
      const roster = current.roster.filter((player) => player.id !== playerId);
      return { ...current, roster, nextFixtures: [] };
    });
    showToast('Joueur libéré', 'info');
  };

  const handleRefreshMarket = () => {
    commitResult(refreshMarket(state), 'Marché rafraîchi');
  };

  const handleUpgradeOffice = (type) => {
    commitResult(upgradeOffice(state, type), 'Amélioration validée');
  };

  const handleUpgradeAgency = () => {
    commitResult(upgradeAgency(state), 'Agence agrandie');
  };

  const handleUpgradeStaff = (key) => {
    commitResult(upgradeStaff(state, key), 'Employé recruté');
  };

  const handleStartScoutingMission = (countryCode) => {
    commitResult(startScoutingMission(state, countryCode), 'Mission scouting lancée');
  };

  const handleAcceptOffer = (offerId) => {
    const offer = state.clubOffers.find((item) => item.id === offerId);
    const player = state.roster.find((item) => item.id === offer?.playerId);
    if (!offer || !player) {
      showToast('Offre indisponible', 'error');
      return;
    }
    setModal({ type: 'nego_offer', data: { offer, player } });
  };

  const handleRejectOffer = (offerId) => {
    commitResult(rejectClubOffer(state, offerId), 'Offre refusée');
  };

  const handleUpdateAgencyProfile = (profile) => {
    commitResult(updateAgencyProfile(state, profile), 'Identité agence enregistrée');
  };

  const handleCompleteOnboarding = (profile) => {
    commitResult(updateAgencyProfile(state, profile), 'Agence créée');
  };

  const handlePlayWeek = () => {
    if (!state.roster.length) {
      showToast('Recrute au moins 1 joueur', 'error');
      return;
    }

    const result = playWeek(state);
    setState(result.state);
    setModal({ type: 'results', data: result.report });
    if (result.report.newMessagesCount > 0) {
      showToast(`${result.report.newMessagesCount} nouveau message`, 'info');
    }
  };

  const handleChoice = (event, player, choice) => {
    const result = applyChoice(state, event, player, choice);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    setState(result.state);
    if (result.followUp === 'transfer_offer') {
      const readiness = getTransferReadiness(result.state, player, getPhase(result.state.week));
      if (readiness.ok) {
        setModal({ type: 'nego_transfer', data: { player } });
      } else {
        setModal(null);
        showToast(readiness.message, 'error');
      }
    } else if (result.followUp === 'extend') {
      const readiness = getExtensionReadiness(result.state, player);
      if (readiness.ok) {
        setModal({ type: 'nego_extend', data: { player } });
      } else {
        setModal(null);
        showToast(readiness.message, 'error');
      }
    } else {
      setModal(null);
      showToast('Décision appliquée', 'success');
    }
  };

  const handleFinishNegotiation = (type, player, outcome) => {
    const nextState = finishNegotiation(state, type, player, outcome);
    setState(nextState);
    setModal(null);
    showToast(outcome.success ? 'Négociation conclue' : 'Négociation échouée', outcome.success ? 'success' : 'error');
  };

  const handleFinishOfferNegotiation = (offer, outcome) => {
    if (!outcome.success) {
      commitResult(rejectClubOffer(state, offer.id), 'Offre abandonnée');
      setModal(null);
      return;
    }

    commitResult(acceptClubOffer(state, offer.id, outcome), 'Transfert négocié');
    setModal(null);
  };

  const handleMessageResponse = (messageId, responseType) => {
    const effects = responseEffects[responseType];
    setState((current) => {
      const message = current.messages.find((item) => item.id === messageId);
      if (!message) return current;
      const promise = createPromiseFromMessage({ message, week: current.week, responseType });
      const responseAction = getMessageResponseAction(message, responseType);

      return {
        ...current,
        reputation: applyReputationChange(current.reputation, effects.reputation),
        roster: current.roster.map((player) =>
          player.id === message.playerId
            ? {
                ...player,
                moral: clamp(player.moral + effects.moral),
                trust: clamp((player.trust ?? 50) + effects.trust),
                activeActions: responseAction ? [responseAction, ...(player.activeActions ?? [])].slice(0, 5) : player.activeActions ?? [],
                timeline: responseAction ? [{ week: current.week, type: 'appel', label: responseAction.label }, ...(player.timeline ?? [])].slice(0, 18) : player.timeline,
              }
            : player,
        ),
        messages: current.messages.map((item) => (item.id === messageId ? { ...item, resolved: true, responseType, responseAction, responseText: getResponseCopy(message, responseType) } : item)),
        promises: [...(promise ? [promise] : []), ...(current.promises ?? [])].slice(0, 30),
      };
    });
    showToast('Réponse envoyée', 'success');
  };

  const handleResetGame = () => {
    if (!confirm('Réinitialiser ?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(createFreshState());
    setView('dashboard');
    setSaveMenuOpen(false);
    showToast('Nouvelle partie', 'success');
  };

  const handleNewGame = () => {
    if (hasSave && !confirm('Commencer une nouvelle partie et remplacer la sauvegarde ?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(createFreshState());
    setView('dashboard');
    setSaveMenuOpen(false);
    setHasSave(false);
  };

  const startNegotiation = (player, type) => {
    const latestPlayer = state.roster.find((item) => item.id === player.id) ?? player;
    const readiness = type === 'transfer' ? getTransferReadiness(state, latestPlayer, phase) : getExtensionReadiness(state, latestPlayer);
    if (!readiness.ok) {
      showToast(readiness.message, 'error');
      return;
    }
    setModal({ type: type === 'transfer' ? 'nego_transfer' : 'nego_extend', data: { player: latestPlayer } });
  };

  const showPlayerDetails = (player) => {
    setModal({ type: 'player_detail', data: { player } });
  };

  const showClubDetails = (clubName) => {
    setModal({ type: 'club_detail', data: { clubName } });
  };

  const handlePlayerMeeting = (playerId, type) => {
    const effects = {
      career: { moral: 3, trust: 6, label: 'Plan carrière validé' },
      support: { moral: 8, trust: 4, label: 'Soutien envoyé' },
      discipline: { moral: -3, trust: -2, label: 'Cadre posé' },
    }[type];
    setState((current) => ({
      ...current,
      roster: current.roster.map((player) =>
        player.id === playerId
          ? {
              ...player,
              moral: clamp(player.moral + effects.moral),
              trust: clamp((player.trust ?? 50) + effects.trust),
              timeline: [{ week: current.week, type: 'meeting', label: effects.label }, ...(player.timeline ?? [])],
            }
          : player,
      ),
    }));
    showToast(effects.label, 'success');
  };

  const handlePlayerMarketAction = (playerId, action) => {
    const result = createPlayerMarketAction(state, playerId, action);
    if (!commitResult(result, result.message)) return;
    setModal(null);
  };

  const handleCallPlayer = (player) => {
    setState((current) => ({
      ...current,
      messages: [
        createMessage({ player, type: 'voice_call', week: current.week, context: 'manual_call' }),
        ...current.messages,
      ].slice(0, 40),
      roster: current.roster.map((item) =>
        item.id === player.id
          ? {
              ...item,
              trust: clamp((item.trust ?? 50) + 2),
              timeline: [{ week: current.week, type: 'appel', label: 'Appel joueur lancé' }, ...(item.timeline ?? [])].slice(0, 18),
            }
          : item,
      ),
    }));
    setModal(null);
    setView('messages');
    showToast('Appel joueur ajouté aux messages', 'success');
  };

  if (!loaded || !state) {
    return (
      <div style={S.loadScreen}>
        <div style={S.loadText}>CHARGEMENT</div>
      </div>
    );
  }

  if (saveMenuOpen) {
    return (
      <SaveMenu
        hasSave={hasSave}
        onContinue={() => setSaveMenuOpen(false)}
        onNewGame={handleNewGame}
        onReset={handleResetGame}
      />
    );
  }

  const phase = getPhase(state.week);
  const unreadMessages = state.messages.filter((message) => !message.resolved).length;
  const agencyProfile = state.agencyProfile;

  if (!agencyProfile.onboarded) {
    return (
      <div style={S.app}>
        <style>{CSS}</style>
        <Onboarding profile={agencyProfile} onComplete={handleCompleteOnboarding} />
      </div>
    );
  }

  return (
    <div style={S.app}>
      <style>{CSS}</style>
      <header style={S.header}>
        <div style={S.brandRow}>
          <div style={S.logo}>
            <div style={{ ...S.logoMark, background: agencyProfile.color }}>★</div>
            <div>
              <div style={S.brandName}>{agencyProfile.name}</div>
              <div style={S.brandSub}>{agencyProfile.city} · {agencyProfile.ownerName}</div>
            </div>
          </div>
          <button onClick={handleResetGame} style={S.iconBtn}>
            <LogOut size={16} />
          </button>
        </div>
        <div style={S.seasonBar}>
          <div style={S.seasonLabel}>SAISON {phase.season} · S{phase.seasonWeek}/38</div>
          <div style={S.seasonPhase}>{phase.phase.toUpperCase()}</div>
        </div>
        <div style={S.statsGrid}>
          <StatCard icon={<DollarSign size={14} />} label="CAPITAL" value={formatMoney(state.money)} accent="#00a676" />
          <StatCard icon={<Star size={14} />} label="REPUTATION" value={`${state.reputation}/100`} accent="#2f80ed" />
          <StatCard icon={<Users size={14} />} label="ROSTER" value={`${state.roster.length}/${getAgencyCapacity(state.agencyLevel)}`} accent="#3f5663" />
          <StatCard icon={<Trophy size={14} />} label="MESSAGES" value={unreadMessages} accent="#64727d" />
        </div>
      </header>
      <nav style={S.nav}>
        {mainNav.map(([key, item]) => {
          const Icon = item.icon;
          const active = key === 'more'
            ? !['dashboard', 'roster', 'market', 'phone'].includes(view)
            : view === key;
          return (
          <button
            key={key}
            onClick={() => setView(key === 'more' ? 'more' : key)}
            style={{
              ...S.navBtn,
              color: active ? '#172026' : '#64727d',
              borderBottom: active ? '2px solid #00a676' : '2px solid transparent',
            }}
          >
            <Icon size={16} />
            <span>{item.label}</span>
            {key === 'phone' && unreadMessages > 0 && <span style={S.navBadge}>{unreadMessages}</span>}
          </button>
          );
        })}
      </nav>
      <main style={S.main}>
        {view === 'dashboard' && <Dashboard state={state} phase={phase} onPlay={handlePlayWeek} onNav={setView} onAcceptOffer={handleAcceptOffer} onRejectOffer={handleRejectOffer} onClubDetails={showClubDetails} />}
        {view === 'market' && <Market market={state.market} freeAgents={state.freeAgents} money={state.money} onSign={handleSignPlayer} onRefresh={handleRefreshMarket} onDetails={showPlayerDetails} />}
        {view === 'roster' && <Roster roster={state.roster} onRelease={handleReleasePlayer} onNego={startNegotiation} onDetails={showPlayerDetails} />}
        {view === 'more' && <More items={moreItems} onNav={setView} />}
        {view === 'calendar' && <Calendar state={state} onClubDetails={showClubDetails} />}
        {view === 'standings' && <Standings state={state} onClubDetails={showClubDetails} />}
        {view === 'phone' && <Phone state={state} onNav={setView} onNegotiateOffer={handleAcceptOffer} />}
        {view === 'deadline' && <DeadlineDay state={state} phase={phase} onNegotiateOffer={handleAcceptOffer} onRejectOffer={handleRejectOffer} />}
        {view === 'scouting' && <Scouting state={state} onStartMission={handleStartScoutingMission} />}
        {view === 'cards' && <SwipeDesk state={state} onNav={setView} onNegotiateOffer={handleAcceptOffer} />}
        {view === 'office' && (
          <Office
            state={state}
            onUpgrade={handleUpgradeOffice}
            onUpgradeAgency={handleUpgradeAgency}
            onUpgradeStaff={handleUpgradeStaff}
            onUpdateAgencyProfile={handleUpdateAgencyProfile}
            onStartScoutingMission={handleStartScoutingMission}
          />
        )}
        {view === 'profile' && <AgencyProfile state={state} />}
        {view === 'news' && <NewsFeed news={state.news} />}
        {view === 'media' && <MediaRoom state={state} />}
        {view === 'messages' && <Messages messages={state.messages} onRespond={handleMessageResponse} />}
      </main>
      {modal?.type === 'results' && (
        <ResultsModal
          data={modal.data}
          onClose={() => setModal(null)}
          onInteractive={(event, player) => setModal({ type: 'interactive', data: { event, player } })}
        />
      )}
      {modal?.type === 'interactive' && (
        <InteractiveModal event={modal.data.event} player={modal.data.player} money={state.money} onChoose={handleChoice} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'nego_transfer' && (
        <NegotiationTransfer
          player={state.roster.find((player) => player.id === modal.data.player.id) ?? modal.data.player}
          rep={state.reputation}
          lawyer={state.office.lawyerLevel}
          onFinish={(outcome) => handleFinishNegotiation('transfer', modal.data.player, outcome)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'nego_offer' && (
        <NegotiationTransfer
          player={state.roster.find((player) => player.id === modal.data.player.id) ?? modal.data.player}
          rep={state.reputation}
          lawyer={state.office.lawyerLevel}
          fixedSuitor={{
            name: modal.data.offer.club,
            tier: modal.data.offer.clubTier,
            countryCode: modal.data.offer.clubCountryCode,
            city: modal.data.offer.clubCity,
          }}
          initialOffer={modal.data.offer.price}
          initialSalaryMultiplier={modal.data.offer.salMult}
          onFinish={(outcome) => handleFinishOfferNegotiation(modal.data.offer, outcome)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'nego_extend' && (
        <NegotiationExtend
          player={state.roster.find((player) => player.id === modal.data.player.id) ?? modal.data.player}
          rep={state.reputation}
          lawyer={state.office.lawyerLevel}
          onFinish={(outcome) => handleFinishNegotiation('extend', modal.data.player, outcome)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'player_detail' && (
        <PlayerDetailModal
          player={state.roster.find((player) => player.id === modal.data.player.id) ?? modal.data.player}
          promises={state.promises}
          onClose={() => setModal(null)}
          onNego={(type) => startNegotiation(modal.data.player, type)}
          onMeeting={handlePlayerMeeting}
          onMarketAction={handlePlayerMarketAction}
          onCallPlayer={handleCallPlayer}
        />
      )}
      {modal?.type === 'club_detail' && (
        <ClubModal clubName={modal.data.clubName} relations={state.clubRelations} onClose={() => setModal(null)} />
      )}
      {toast && (
        <div
          style={{
            ...S.toast,
            background: toast.type === 'error' ? '#2a1a1a' : toast.type === 'success' ? '#1a2a1a' : '#1a1a1a',
            borderColor: toast.type === 'error' ? '#8b3a3a' : toast.type === 'success' ? '#3a8b5a' : '#3a3a3a',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
