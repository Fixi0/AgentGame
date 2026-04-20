import React, { useEffect, useState } from 'react';
import { Briefcase, CalendarDays, DollarSign, FileText, Home, Layers, LogOut, MessageCircle, Network, Newspaper, Play, Search, Shield, ShoppingBag, Star, Telescope, Timer, Trophy, UserCircle, Users } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AgencyProfile from './components/AgencyProfile';
import Calendar from './components/Calendar';
import Dossiers from './components/Dossiers';
import Contacts from './components/Contacts';
import ContractDashboard from './components/ContractDashboard';
import DeadlineDay from './components/DeadlineDay';
import Market from './components/Market';
import RecruitmentModal from './components/modals/RecruitmentModal';
import MediaRoom from './components/MediaRoom';
import Messages from './components/Messages';
import More from './components/More';
import NewsFeed from './components/NewsFeed';
import Onboarding from './components/Onboarding';
import Office from './components/Office';
import Vestiaire from './components/Vestiaire';
import Roster from './components/Roster';
import Shop from './components/Shop';
import SaveMenu from './components/SaveMenu';
import Scouting from './components/Scouting';
import Standings from './components/Standings';
import EuropeanBracket from './components/EuropeanBracket';
import InteractiveModal from './components/modals/InteractiveModal';
import ClubModal from './components/modals/ClubModal';
import MediaCrisisModal from './components/modals/MediaCrisisModal';
import OfferCompareModal from './components/modals/OfferCompareModal';
import OfferContractModal from './components/modals/OfferContractModal';
import ShortlistModal from './components/modals/ShortlistModal';
import RetirementModal from './components/modals/RetirementModal';
import ConfirmModal from './components/modals/ConfirmModal';
import TransferOfferModal from './components/modals/TransferOfferModal';
import PlayerDetailModal from './components/modals/PlayerDetailModal';
import ResultsModal from './components/modals/ResultsModal';
import WeekTickerModal from './components/modals/WeekTickerModal';
import { CSS, S } from './components/styles';
import {
  applyChoice,
  acceptClubOffer,
  callContact,
  createPlayerMarketAction,
  createFreshState,
  finishNegotiation,
  getPhase,
  migrateState,
  playWeek,
  proposePlayerToClubs,
  refreshMarket,
  rejectClubOffer,
  startScoutingMission,
  upgradeAgency,
  upgradeOffice,
  upgradeStaff,
  updateAgencyProfile,
} from './game/gameLogic';
import {
  clearLocalGameProgress,
  loadLocalGameProgress,
  saveLocalGameProgress,
} from './data/localDatabase';
import { getAgencyCapacity } from './systems/agencySystem';
import { addDecisionHistory, applyCredibilityChange, applyMediaRelation, getNegotiationContextModifier } from './systems/agencyReputationSystem';
import { applyClubRelation, recordClubMemory } from './systems/clubSystem';
import { applyReputationChange } from './systems/reputationSystem';
import { getCalendarSnapshot } from './systems/seasonSystem';
import { isEuropeanMatchWeek, EURO_CUP_LABELS } from './systems/europeanCupSystem';
import { createMessage, createStaffConversationMessage, getConversationParticipant, getMessageContextOutcome, getMessageResponseAction, getResponseCopy, responseEffects } from './systems/messageSystem';
import { createPromiseFromMessage, normalizePromises } from './systems/promiseSystem';
import { getActiveDossierPlayerIds, getOfferAcceptanceReadiness, getPendingMessageCounts, getPlayerLifecycleState } from './systems/dossierSystem';
import { recordDossierEvent } from './systems/coherenceSystem';
import { recruitPlayer } from './systems/recruitmentSystem';
import { purchaseShopItem } from './systems/shopSystem';
import { createManualNewsPost } from './systems/newsSystem';
import { CLUBS } from './data/clubs';
import { clamp, makeId, pick } from './utils/helpers';
import { formatMoney } from './utils/format';

const getTransferReadiness = (state, player, phase) => {
  if (player.freeAgent || player.club === 'Libre') {
    return { ok: true, type: 'transfer' };
  }
  // Minimum 1 saison (38 sem.) au club avant de pouvoir re-transférer
  // Exception : contrat < 8 semaines (joueur en fin de contrat, libre de partir)
  const weeksAtClub = state.week - (player.contractStartWeek ?? 0);
  const contractAlmostOver = (player.contractWeeksLeft ?? 99) < 8;
  if (weeksAtClub < 38 && !contractAlmostOver) {
    const remaining = 38 - weeksAtClub;
    return { ok: false, message: `${player.firstName} vient d'arriver — encore ${remaining} semaine${remaining > 1 ? 's' : ''} de stabilité requises avant un transfert.` };
  }

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
  const lifecycle = getPlayerLifecycleState(player, state);
  if (['predeal', 'transferred'].includes(lifecycle.key) || getActiveDossierPlayerIds(state).has(player.id)) {
    return { ok: false, message: 'Ce joueur a déjà un dossier actif. Termine le pré-accord ou le transfert en cours avant de prolonger.' };
  }
  const clubOpen = player.contractWeeksLeft <= 26 || player.rating >= 74 || (player.trust ?? 50) >= 62;
  const playerOpen = (player.trust ?? 50) >= 45 && player.moral >= 42;
  if (!clubOpen && !playerOpen) return { ok: false, message: "Ni le club ni le joueur ne veulent prolonger maintenant." };
  if (!clubOpen) return { ok: false, message: "Le club ne veut pas ouvrir de prolongation pour l'instant." };
  if (!playerOpen) return { ok: false, message: "Le joueur n'a pas assez confiance pour prolonger." };
  const contextBonus = getNegotiationContextModifier(state, player, player.club);
  if (Math.random() > 0.65 + contextBonus / 100) return { ok: false, message: "Le club préfère attendre quelques semaines avant de discuter." };
  return { ok: true, type: 'extend' };
};

const getTransferSuitor = (player) => {
  const allowedTiers = player.rating >= 84 || player.potential >= 90
    ? [1, 2]
    : player.rating >= 77 || player.potential >= 85
      ? [2, 3]
      : player.rating >= 68 || player.potential >= 79
        ? [3, 4]
        : [4];
  const pool = CLUBS.filter((club) => {
    if (club.name === player.club) return false;
    if (player.club === 'Libre' || player.freeAgent) return club.tier >= 3;
    return allowedTiers.includes(club.tier);
  });
  return pick(pool.length ? pool : CLUBS.filter((club) => club.name !== player.club));
};

const buildContractOffer = (player, type, state) => {
  if (type === 'transfer') {
    const suitor = getTransferSuitor(player);
    return {
      id: `contract_${player.id}_${state?.week ?? 0}_${type}`,
      club: suitor?.name ?? 'Club',
      price: Math.floor((player.value ?? 1000000) * 0.7),
      salMult: 1.3,
      preWindow: false,
      expiresWeek: (state?.week ?? 0) + 3,
      suitorTier: suitor?.tier,
      suitorCountry: suitor?.countryCode,
    };
  }
  return {
    id: `contract_${player.id}_${state?.week ?? 0}_${type}`,
    club: player.club ?? 'Club',
    price: null,
    salMult: 1,
    preWindow: false,
    expiresWeek: (state?.week ?? 0) + 4,
  };
};

const buildResponseContextTail = ({ message, player, responseAction }) => {
  const participant = getConversationParticipant(message);
  const weeksAtClub = player?.contractStartWeek != null
    ? Math.max(0, (message?.week ?? 0) - player.contractStartWeek)
    : null;
  const dossierLabel = player?.clubRole
    ? `statut ${player.clubRole}`
    : player?.careerStatus
      ? `statut ${player.careerStatus}`
      : 'statut en cours';
  const lastAction = responseAction?.label || player?.activeActions?.[0]?.label || player?.timeline?.[0]?.label || null;
  const targetLabel = participant.role === 'staff'
    ? participant.audience === 'coach'
      ? 'coach'
      : participant.audience === 'ds'
        ? 'direction'
        : 'staff'
    : 'joueur';
  const threadContext = message?.context ? `contexte ${String(message.context).replace(/_/g, ' ')}` : 'contexte direct';
  const arrivalLabel = weeksAtClub != null && weeksAtClub < 10
    ? `arrivée récente (${weeksAtClub} sem.)`
    : null;
  const pieces = [`Réponse alignée avec ${targetLabel}`, threadContext, dossierLabel, arrivalLabel].filter(Boolean);
  if (lastAction) pieces.push(`dernière action: ${lastAction}`);
  return '';
};

const views = {
  dashboard: { label: 'Accueil', icon: Home },
  market: { label: 'Marché', icon: Search },
  roster: { label: 'Joueurs', icon: Shield },
  shop: { label: 'Boutique', icon: ShoppingBag },
  contracts: { label: 'Contrats', icon: Briefcase },
  contacts: { label: 'Réseau', icon: Network },
  calendar: { label: 'Calend.', icon: CalendarDays },
  standings: { label: 'Ligues', icon: Trophy },
  news: { label: 'News', icon: Newspaper },
  media: { label: 'Médias', icon: Newspaper },
  deadline: { label: 'Deadline', icon: Timer },
  scouting: { label: 'Scout', icon: Telescope },
  vestiaire: { label: 'Vestiaire', icon: Users },
  office: { label: 'Agence', icon: Briefcase },
  profile: { label: 'Profil', icon: UserCircle },
  messages: { label: 'Messages', icon: MessageCircle },
};

const mainNav = [
  ['dashboard', views.dashboard],
  ['roster', views.roster],
  ['market', views.market],
  ['messages', views.messages],
  ['more', { label: 'Plus', icon: Layers }],
];

const moreItems = [
  { key: 'shop', label: 'Boutique', desc: 'Gemmes et bonus', icon: ShoppingBag },
  { key: 'contracts', label: 'Contrats', desc: 'Vue d\'ensemble des contrats', icon: Briefcase },
  { key: 'contacts', label: 'Réseau', desc: 'Contacts et infos exclusives', icon: Network },
  { key: 'dossiers', label: 'Dossiers', desc: 'Messages, tensions, mémoire', icon: FileText },
  { key: 'standings', label: 'Ligues', desc: 'Classements nationaux + Europe', icon: Trophy },
  { key: 'europe', label: 'Coupes Euro', desc: 'Bracket · Parcours KO · Stats', icon: Trophy },
  { key: 'calendar', label: 'Calendrier', desc: 'Affiches et résultats', icon: CalendarDays },
  { key: 'deadline', label: 'Deadline Day', desc: 'Appels mercato', icon: Timer },
  { key: 'scouting', label: 'Scouting', desc: 'Missions et rapports', icon: Telescope },
  { key: 'vestiaire', label: 'Vestiaire', desc: 'Chimie et tensions', icon: Users },
  { key: 'office', label: 'Agence', desc: 'Staff et identité', icon: Briefcase },
  { key: 'profile', label: 'Profil', desc: "Bilan de l'agence", icon: UserCircle },
];


export default function FootballAgentGame() {
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState(null);
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [saveMenuOpen, setSaveMenuOpen] = useState(true);
  const [hasSave, setHasSave] = useState(false);
  const [savePreview, setSavePreview] = useState(null);
  const [activeMessageThreadKey, setActiveMessageThreadKey] = useState(null);
  const [weekTickerData, setWeekTickerData] = useState(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [lastWeekError, setLastWeekError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    try {
      loadLocalGameProgress()
        .then((saved) => {
          if (cancelled) return;
          setHasSave(Boolean(saved?.state));
          if (saved?.state) {
            const parsed = migrateState(saved.state);
            setState(parsed);
            setSavePreview({
              agencyName: parsed.agencyProfile?.name ?? saved.preview?.agencyName ?? 'Agent FC',
              ownerName: parsed.agencyProfile?.ownerName ?? saved.preview?.ownerName ?? '',
              season: getPhase(parsed.week).season,
              seasonWeek: getPhase(parsed.week).seasonWeek,
              rosterCount: parsed.roster?.length ?? saved.preview?.rosterCount ?? 0,
              reputation: parsed.reputation ?? saved.preview?.reputation ?? 0,
              money: parsed.money ?? saved.preview?.money ?? 0,
            });
          } else {
            setState(null);
            setSavePreview(null);
          }
          setSaveMenuOpen(true);
        })
        .catch(() => {
          if (cancelled) return;
          setState(null);
          setSavePreview(null);
          setSaveMenuOpen(true);
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
    } catch {
      if (!cancelled) {
        setState(null);
        setSavePreview(null);
        setSaveMenuOpen(true);
        setLoaded(true);
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded && !state && !saveMenuOpen) {
      setSaveMenuOpen(true);
    }
  }, [loaded, state, saveMenuOpen]);

  useEffect(() => {
    if (!loaded || !state) return;
    let cancelled = false;
    saveLocalGameProgress(state).then((record) => {
      if (cancelled) return;
      setSavePreview(record?.preview ?? {
        agencyName: state.agencyProfile?.name ?? 'Agent FC',
        ownerName: state.agencyProfile?.ownerName ?? '',
        season: getPhase(state.week).season,
        seasonWeek: getPhase(state.week).seasonWeek,
        rosterCount: state.roster?.length ?? 0,
        reputation: state.reputation ?? 0,
        money: state.money ?? 0,
      });
      setHasSave(true);
      setSaveFlash(true);
      const t = setTimeout(() => setSaveFlash(false), 1200);
      return () => clearTimeout(t);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
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

  const buildFallbackWeekReport = (safeState) => {
    const nextWeek = (safeState.week ?? 1) + 1;
    const nextPhase = getPhase(nextWeek);
    const nextDate = getCalendarSnapshot(nextWeek);
    return {
      income: 0,
      salaries: 0,
      staffCost: 0,
      net: 0,
      repChange: 0,
      events: [],
      leavingPlayers: [],
      bonusMoney: 0,
      seasonRecap: null,
      interactiveEvent: null,
      newSeason: nextPhase.seasonWeek === 1 && (safeState.week ?? 1) > 1,
      newMessagesCount: 0,
      messageQueueCount: (safeState.messageQueue ?? []).length,
      matchResults: [],
      euroMatchResults: [],
      fixtures: [],
      clubOffers: [],
      phase: nextPhase,
      worldSummary: [],
      worldCupActive: false,
      worldCupPhase: null,
      activePeriod: null,
      periodEffect: null,
      weekTimeline: [
        {
          id: 'fallback-lundi',
          day: 'Lundi',
          icon: '📅',
          tone: 'warn',
          title: 'Semaine de secours',
          text: `${nextDate.dateLabel} · la simulation principale a rencontré un blocage, mais la semaine avance quand même.`,
          chips: ['Fallback actif', 'Aucun dossier perdu'],
        },
        {
          id: 'fallback-mardi',
          day: 'Mardi',
          icon: '💬',
          tone: 'calm',
          title: 'Messagerie compacte',
          text: 'On garde les messages en file et on continue sur une base propre.',
          chips: [`File ${safeState.messageQueue?.length ?? 0}`],
        },
        {
          id: 'fallback-dimanche',
          day: 'Dimanche',
          icon: '📈',
          tone: 'good',
          title: 'Bilan provisoire',
          text: 'Le moteur sera repris au prochain passage, sans bloquer ta partie.',
          chips: ['Semaine avancée'],
        },
      ],
      week: safeState.week ?? 1,
    };
  };

  const handleSignPlayer = (player) => {
    setModal({ type: 'recruit_player', data: { player } });
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

  const handleBuyShopItem = (itemId) => {
    const result = purchaseShopItem(state, itemId);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    let nextState = result.state;
    if (nextState._pendingMarketRefresh) {
      const refreshed = refreshMarket(nextState);
      if (!refreshed.error) nextState = refreshed.state;
      delete nextState._pendingMarketRefresh;
    }

    setState(nextState);
    showToast(`Boutique: ${result.item.label}`, 'success');
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

  const handleCallContact = (contactId) => {
    const result = callContact(state, contactId);
    setState(result.state);
    showToast(result.result.message, result.result.error ? 'error' : result.result.onCooldown ? 'info' : 'success');
  };

  const handleCompareOffers = () => {
    const openOffers = (state.clubOffers ?? []).filter((o) => o.status === 'open' && o.expiresWeek >= state.week);
    if (openOffers.length >= 2) setModal({ type: 'offer_compare', data: { offers: openOffers } });
  };

  const handleAcceptOffer = (offerId) => {
    const offer = state.clubOffers.find((item) => item.id === offerId);
    const player = state.roster.find((item) => item.id === offer?.playerId);
    if (!offer || !player) {
      showToast('Offre indisponible', 'error');
      return;
    }
    setModal({ type: 'offer_contract', data: { offer, player, readiness: getOfferAcceptanceReadiness(state, offer) } });
  };

  const handleRecruitPlayer = (player, pitchId) => {
    const result = recruitPlayer(state, player.id, pitchId);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    setState(result.state);
    setModal(null);
    const pitchLabel = result.preview?.pitch?.label ?? 'Projet';
    showToast(`${player.firstName} ${player.lastName} recruté via ${pitchLabel}`, 'success');
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
    const playableState = migrateState(state);
    if (!playableState.roster.length) {
      showToast('Recrute au moins 1 joueur', 'error');
      return;
    }

    try {
      setModal(null);
      setWeekTickerData(null);
      setLastWeekError(null);
      if (playableState !== state) setState(playableState);
      const result = playWeek(playableState);
      if (!result?.state || !result?.report) {
        throw new Error('playWeek() a renvoyé un résultat incomplet');
      }
      setState(result.state);
      // Reputation milestone detection
      const REP_MILESTONES = [50, 100, 200, 350, 500, 750, 1000];
      const REP_MILESTONE_LABELS = { 50: 'Agent connu', 100: 'Agent solide', 200: 'Agent respecté', 350: 'Agent réputé', 500: 'Agent élite', 750: 'Agent légendaire', 1000: '🏆 Sommet atteint !' };
      const prevRep = playableState.reputation;
      const nextRep = result.state.reputation;
      const crossedMilestone = REP_MILESTONES.find((m) => prevRep < m && nextRep >= m);
      if (crossedMilestone) {
        setTimeout(() => showToast(`⭐ Palier réputation ${crossedMilestone} — ${REP_MILESTONE_LABELS[crossedMilestone]}`, 'success'), 800);
      }
      // Show the week ticker first, then the full results modal
      setWeekTickerData(result.report);
      if (result.report.newMessagesCount > 0) {
        showToast(`${result.report.newMessagesCount} nouveau message`, 'info');
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error?.message ?? 'blocage interne';
      setLastWeekError({
        message: errorMessage,
        stack: error?.stack ?? null,
        week: playableState.week,
      });
      const fallbackState = {
        ...playableState,
        week: (playableState.week ?? 1) + 1,
        roster: (playableState.roster ?? []).map((player) => ({
          ...player,
          seasonStatus: (() => {
            const nextPhase = getPhase((playableState.week ?? 1) + 1);
            const worldCupActive = Boolean(playableState.worldCupState && playableState.worldCupState.phase !== 'done');
            const worldCupSelection = playableState.worldCupState?.selectedPlayers?.find((entry) => entry.playerId === player.id);
            if ((player.injured ?? 0) > 0) return player.seasonStatus ?? 'club';
            if (worldCupActive && worldCupSelection && !worldCupSelection.eliminated) return 'international';
            if (worldCupActive) return 'vacation';
            if (nextPhase.mercato && nextPhase.window === 'été') return 'vacation';
            return player.seasonStatus ?? 'club';
          })(),
          fatigue: Math.max(0, (player.fatigue ?? 20) - 4),
          contractWeeksLeft: Math.max(0, (player.contractWeeksLeft ?? 0) - 1),
          injured: Math.max(0, (player.injured ?? 0) - 1),
        })),
        nextFixtures: playableState.nextFixtures ?? [],
        lastFixtures: playableState.lastFixtures ?? [],
        history: [...(playableState.history ?? []).slice(-20), {
          week: playableState.week,
          net: 0,
          rep: playableState.reputation ?? 0,
          fallback: true,
        }],
        stats: {
          ...(playableState.stats ?? {}),
        },
      };
      setState(fallbackState);
      setWeekTickerData(buildFallbackWeekReport(playableState));
      showToast(`Semaine avancée en mode secours: ${errorMessage}`, 'info');
    }
  };

  const handleTickerDone = () => {
    const report = weekTickerData;
    setWeekTickerData(null);
    setModal({ type: 'results', data: report });
  };

  const handleChoice = (event, player, choice) => {
    const result = applyChoice(state, event, player, choice);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    setState(result.state);
    if (result.followUp === 'transfer_offer') {
      const offer = result.followUpData?.offer
        ?? result.state.clubOffers.find((item) => item.playerId === player.id && item.status === 'open' && item.week === result.state.week)
        ?? result.state.clubOffers.find((item) => item.playerId === player.id && item.status === 'open');
      if (offer) {
        setModal({ type: 'offer_contract', data: { offer, player, readiness: getOfferAcceptanceReadiness(result.state, offer) } });
      } else {
        setModal(null);
        showToast('L\'offre liée à l\'événement n\'a pas pu être retrouvée.', 'error');
      }
    } else if (result.followUp === 'extend') {
      // Player explicitly chose to extend from the contract event — always open the negotiation modal.
      // Only block for hard conditions (no club, player hostile).
      const blockedHard = (player.freeAgent || player.club === 'Libre');
      const playerHostile = (player.trust ?? 50) < 25 && player.moral < 30;
      if (blockedHard) {
        setModal(null);
        showToast("Impossible de prolonger sans club. Trouve-lui d'abord une équipe.", 'error');
      } else if (playerHostile) {
        setModal(null);
        showToast("Le joueur refuse toute discussion pour l'instant — la relation est trop dégradée.", 'error');
      } else {
        setModal({
          type: 'contract_flow',
          data: {
            player,
            contractType: 'extend',
            offer: buildContractOffer(player, 'extend', state),
            readiness: getExtensionReadiness(state, player),
          },
        });
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

    const result = acceptClubOffer(state, offer.id, outcome);
    if (result.error) {
      const fallbackOffer = state.clubOffers.find((item) => item.playerId === offer.playerId && item.status === 'open');
      if (fallbackOffer && fallbackOffer.id !== offer.id) {
        const fallbackReadiness = getOfferAcceptanceReadiness(state, fallbackOffer);
        if (!fallbackReadiness.ok) {
          showToast(fallbackReadiness.reason, fallbackReadiness.tone === 'danger' ? 'error' : 'info');
          return;
        }
        const retry = acceptClubOffer(state, fallbackOffer.id, outcome);
        if (!retry.error) {
          setState(retry.state);
          setModal(null);
          showToast('Transfert validé', 'success');
          return;
        }
      }
      showToast(result.error, 'error');
      return;
    }
    setState(result.state);
    // Pre-window offers create a pending transfer that activates at mercato opening
    const newPending = (result.state.pendingTransfers ?? []).find((pt) => pt.offerId === offer.id);
    if (newPending) {
      showToast(`✅ Pré-accord signé — transfert officiel semaine ${newPending.effectiveWeek}`, 'success');
    } else {
      showToast('Transfert négocié et activé', 'success');
    }
    setModal(null);
  };

  const handleAcceptOfferDirect = (offer) => {
    const result = acceptClubOffer(state, offer.id, null);
    if (result.error) {
      const fallbackOffer = state.clubOffers.find((item) => item.playerId === offer.playerId && item.status === 'open');
      if (fallbackOffer && fallbackOffer.id !== offer.id) {
        const retry = acceptClubOffer(state, fallbackOffer.id, null);
        if (!retry.error) {
          setState(retry.state);
          const retryPending = (retry.state.pendingTransfers ?? []).find((pt) => pt.offerId === fallbackOffer.id);
          if (retryPending) {
            showToast(`✅ Pré-accord signé — transfert officiel semaine ${retryPending.effectiveWeek}`, 'success');
          } else {
            showToast('Transfert validé', 'success');
          }
          setModal(null);
          return;
        }
      }
      showToast(result.error, 'error');
      return;
    }
    setState(result.state);
    const newPending = (result.state.pendingTransfers ?? []).find((pt) => pt.offerId === offer.id);
    if (newPending) {
      showToast(`✅ Pré-accord signé — transfert officiel semaine ${newPending.effectiveWeek}`, 'success');
    } else {
      showToast('Transfert validé', 'success');
    }
    setModal(null);
  };

  const handleMessageResponse = (messageId, responseType) => {
    const effects = responseEffects[responseType];
    const currentMessage = state.messages.find((item) => item.id === messageId);
    const currentMessageContext = String(currentMessage?.context ?? '');
    const isDealContext = ['deal_signed', 'deal_signed_player', 'predeal_signed', 'predeal_signed_player', 'predeal_activation'].includes(currentMessageContext);
    let responseAction = currentMessage ? getMessageResponseAction(currentMessage, responseType) : null;
    const targetPlayer = currentMessage ? state.roster.find((player) => player.id === currentMessage.playerId) : null;
    const weeksAtClub = targetPlayer?.contractStartWeek != null
      ? Math.max(0, state.week - targetPlayer.contractStartWeek)
      : null;
    const freshArrivalTransfer = Boolean(
      currentMessage?.type === 'transfer_request'
      && targetPlayer
      && !isDealContext
      && weeksAtClub != null
      && weeksAtClub < 10,
    );
    if (freshArrivalTransfer) {
      responseAction = { type: 'deal_followup', label: 'Intégration du nouveau contrat' };
    }
    if (currentMessage && responseAction?.type === 'market_watch' && targetPlayer && !freshArrivalTransfer) {
      setModal({
        type: 'shortlist',
        data: {
          message: currentMessage,
          player: targetPlayer,
          responseType,
        },
      });
      showToast('Choisis 1 ou 2 clubs pour la shortlist', 'info');
      return;
    }
    const isStaffThread = currentMessage && ['staff_dialogue', 'coach_dialogue', 'ds_dialogue'].includes(currentMessage.type);
    const staffReply = isStaffThread && currentMessage ? (() => {
      const player = state.roster.find((item) => item.id === currentMessage.playerId);
      if (!player) return null; // joueur absent du roster — pas de réponse narrative
      const staffName = currentMessage.threadLabel ?? (String(currentMessage.context ?? '').includes('coach')
        ? `Coach de ${player?.club ?? 'son club'}`
        : `DS de ${player?.club ?? 'son club'}`);
      const coachReplyText = (() => {
        if (currentMessage.type === 'coach_dialogue' || String(currentMessage.context ?? '').includes('coach')) {
          if (responseType === 'professionnel') return "Je prends le message. Tu auras une fenêtre claire pour te battre pour tes minutes, mais je veux voir la même intensité à l'entraînement.";
          if (responseType === 'empathique') return "Je t'entends. On va calmer le dossier, mais je veux te voir répondre sur le terrain et garder la tête froide.";
          return "Compris. Le cadre est posé: performe et le temps de jeu suivra, sinon on reparlera de ton statut.";
        }
        if (responseType === 'professionnel') return "Le dossier est ouvert. Je regarde le rôle, le contrat et la prochaine fenêtre possible avec le club.";
        if (responseType === 'empathique') return "Je comprends ton besoin de clarté. Je te reviens vite avec une position propre et sans bruit.";
        return "C'est noté. Si la situation ne bouge pas, on remettra les choses au clair.";
      })();
      // resolved: true — narrative closure, not a new actionable thread
      return {
        ...createStaffConversationMessage({
          player,
          staffName,
          type: currentMessage.type === 'coach_dialogue' ? 'coach_dialogue' : currentMessage.type === 'ds_dialogue' ? 'ds_dialogue' : 'staff_dialogue',
          week: state.week,
          context: currentMessage.context,
          subject: `${staffName} répond`,
          body: coachReplyText,
        }),
        resolved: true,
      };
    })() : null;
    setState((current) => {
      const message = current.messages.find((item) => item.id === messageId);
      if (!message) return current;
      const targetPlayer = current.roster.find((player) => player.id === message.playerId);
      const contextOutcome = getMessageContextOutcome({ message, responseType, player: targetPlayer });
      const promise = createPromiseFromMessage({ message, week: current.week, responseType, existingPromises: current.promises, player: targetPlayer });
      const responseAction = contextOutcome.actionOverride ?? getMessageResponseAction(message, responseType);
      const responseTextBase = contextOutcome.responseTextOverride ?? getResponseCopy(message, responseType, targetPlayer);
      const responseText = `${responseTextBase}${buildResponseContextTail({ message, player: targetPlayer, responseAction })}`;
      const baseEffects = responseEffects[responseType] ?? { moral: 0, trust: 0, reputation: 0 };
      const mergedEffects = {
        moral: baseEffects.moral + (contextOutcome.effects?.moral ?? 0),
        trust: baseEffects.trust + (contextOutcome.effects?.trust ?? 0),
        reputation: baseEffects.reputation + (contextOutcome.effects?.reputation ?? 0),
      };
      const actionType = responseAction?.type;
      const withMarketAction = actionType === 'market_watch' && targetPlayer
        ? createPlayerMarketAction(current, message.playerId, 'propose').state
        : current;
      const extraPlayerEffect = {
        moral: (actionType === 'voice_call' ? 3 : actionType === 'press_release' ? 1 : 0),
        trust: (actionType === 'voice_call' ? 3 : actionType === 'coach_talk' ? 2 : actionType === 'market_watch' ? 1 : 0),
        pressure: (actionType === 'press_release' ? -8 : actionType === 'coach_talk' ? -4 : responseType === 'ferme' ? 3 : -1)
          + (contextOutcome.effects?.pressure ?? 0),
      };
      const nextClubRelations = actionType === 'coach_talk' && targetPlayer?.club
        ? applyClubRelation(withMarketAction.clubRelations, targetPlayer.club, responseType === 'ferme' ? -1 : 2)
        : actionType === 'salary_case' && targetPlayer?.club
          ? applyClubRelation(withMarketAction.clubRelations, targetPlayer.club, -1)
          : withMarketAction.clubRelations;
      const nextClubRelationsWithContext = targetPlayer?.club
        ? applyClubRelation(nextClubRelations, targetPlayer.club, contextOutcome.effects?.clubRelation ?? 0)
        : nextClubRelations;
      const nextMediaRelations = actionType === 'press_release'
        ? applyMediaRelation(withMarketAction.mediaRelations, 'canal_football_desk', responseType === 'professionnel' ? 3 : 1)
        : withMarketAction.mediaRelations;
      const nextMediaRelationsWithContext = (contextOutcome.effects?.mediaRelation ?? 0) !== 0
        ? applyMediaRelation(nextMediaRelations, 'canal_football_desk', contextOutcome.effects.mediaRelation)
        : nextMediaRelations;
      const nextClubMemory = targetPlayer?.club && targetPlayer.club !== 'Libre'
        ? recordClubMemory(
            withMarketAction.clubMemory,
            targetPlayer.club,
            {
              trust: actionType === 'coach_talk' || actionType === 'club_check' ? (responseType === 'ferme' ? -1 : 2) : responseType === 'ferme' ? -1 : 1,
              blocks: actionType === 'coach_talk' && responseType === 'ferme' ? 1 : 0,
              week: current.week,
            },
          )
        : withMarketAction.clubMemory;
      const nextClubMemoryWithContext = targetPlayer?.club && targetPlayer.club !== 'Libre'
        ? recordClubMemory(
            nextClubMemory,
            targetPlayer.club,
            {
              trust: contextOutcome.effects?.clubMemoryTrust ?? 0,
              week: current.week,
            },
          )
        : nextClubMemory;
      const nextCredibility = actionType === 'press_release' || actionType === 'club_check'
        ? applyCredibilityChange(withMarketAction.credibility, responseType === 'ferme' ? 1 : 2)
        : responseType === 'ferme'
          ? applyCredibilityChange(withMarketAction.credibility, 1)
          : withMarketAction.credibility;
      const nextCredibilityWithContext = applyCredibilityChange(nextCredibility, contextOutcome.effects?.credibility ?? 0);
      const nextDecisionHistory = addDecisionHistory(withMarketAction.decisionHistory, {
        week: current.week,
        type: `message_${message.type}`,
        label: `${message.playerName}: ${responseAction?.label ?? responseText.split('\n')[0]}`,
        impact: mergedEffects.trust + mergedEffects.moral,
      });
      const nextSocialCrisisCooldowns = message.type === 'media_pressure' && message.playerId
        ? { ...(withMarketAction.socialCrisisCooldowns ?? {}), [message.playerId]: current.week + 6 }
        : withMarketAction.socialCrisisCooldowns;
      const nextDossierMemory = recordDossierEvent(withMarketAction.dossierMemory, {
        playerId: message.playerId,
        clubName: targetPlayer?.club,
        mediaId: message.type === 'media_pressure' ? 'media_pressure' : null,
        week: current.week,
        type: message.type === 'coach_dialogue'
          ? 'coach'
          : message.type === 'ds_dialogue'
            ? 'ds'
            : message.type === 'media_pressure'
              ? 'media'
              : message.type === 'transfer_request'
                ? 'transfer'
                : message.type === 'promise_broken_warning'
                  ? 'promise'
                  : 'note',
        label: responseAction?.label ?? responseText.split('\n')[0],
        impact: mergedEffects.trust + mergedEffects.moral,
      });
      const contextualFollowup = contextOutcome.followup
        ? {
            id: makeId('msg'),
            week: current.week,
            sortWeek: current.week + 0.05,
            type: contextOutcome.followup.type ?? message.type,
            context: `followup:${message.context ?? message.type}`,
            threadKey: message.threadKey ?? message.playerId,
            threadLabel: message.threadLabel ?? message.playerName,
            threadContextLabel: message.threadContextLabel,
            playerId: message.playerId,
            playerName: message.playerName,
            senderRole: contextOutcome.followup.senderRole ?? 'staff',
            senderName: contextOutcome.followup.senderName ?? 'Staff agence',
            subject: contextOutcome.followup.subject,
            body: contextOutcome.followup.body,
            read: false,
            resolved: true,
          }
        : null;
      const contextualNews = contextOutcome.news
        ? createManualNewsPost({
            type: contextOutcome.news.type ?? 'media',
            player: targetPlayer,
            week: current.week,
            text: contextOutcome.news.text,
            reputationImpact: contextOutcome.news.impact ?? 0,
            account: contextOutcome.news.account,
          })
        : null;

      return {
        ...withMarketAction,
        reputation: applyReputationChange(withMarketAction.reputation, mergedEffects.reputation),
        credibility: nextCredibilityWithContext,
        mediaRelations: nextMediaRelationsWithContext,
        clubRelations: nextClubRelationsWithContext,
        clubMemory: nextClubMemoryWithContext,
        decisionHistory: nextDecisionHistory,
        dossierMemory: nextDossierMemory,
        socialCrisisCooldowns: nextSocialCrisisCooldowns,
        roster: withMarketAction.roster.map((player) =>
          player.id === message.playerId
            ? {
                ...player,
                moral: clamp(player.moral + mergedEffects.moral + extraPlayerEffect.moral),
                trust: clamp((player.trust ?? 50) + mergedEffects.trust + extraPlayerEffect.trust),
                pressure: clamp((player.pressure ?? 30) + extraPlayerEffect.pressure),
                lastInteractionWeek: current.week,
                activeActions: responseAction ? [responseAction, ...(player.activeActions ?? [])].slice(0, 5) : player.activeActions ?? [],
                timeline: responseAction ? [{ week: current.week, type: 'appel', label: responseAction.label }, ...(player.timeline ?? [])].slice(0, 18) : player.timeline,
              }
            : player,
        ),
        messages: [
          ...withMarketAction.messages.map((item) => (item.id === messageId ? { ...item, resolved: true, responseType, responseAction, responseText } : item)),
          ...(staffReply ? [staffReply] : []),
          ...(contextualFollowup ? [contextualFollowup] : []),
        ].slice(0, 40),
        news: [
          ...(contextualNews ? [contextualNews] : []),
          ...(withMarketAction.news ?? []),
        ].slice(0, 60),
        promises: normalizePromises([...(promise ? [promise] : []), ...(withMarketAction.promises ?? [])]).slice(0, 30),
      };
    });
    if (currentMessage) setActiveMessageThreadKey(currentMessage.threadKey ?? currentMessage.playerId);
    showToast('Réponse envoyée', 'success');
  };

  const handleMessageAction = (messageId, actionType, message) => {
    const player = message?.playerId ? state.roster.find((p) => p.id === message.playerId) : null;
    if (actionType === 'media_crisis') {
      const crisis = {
        type: message?.context?.includes('scandal') ? 'scandal' : message?.context?.includes('leak') ? 'leak' : 'controversy',
        title: message?.subject ?? 'Incident médiatique',
        description: message?.body ?? 'Une situation sensible nécessite ta gestion immédiate.',
        severity: message?.severity ?? 2,
      };
      setModal({ type: 'media_crisis', data: { crisis, player, messageId } });
    } else if (actionType === 'player_support') {
      if (player) {
        setModal({ type: 'player_detail', data: { player } });
      } else {
        showToast('Joueur introuvable dans le roster', 'error');
      }
    } else if (actionType === 'retirement') {
      if (player) {
        setModal({ type: 'retirement', data: { player, messageId } });
      } else {
        showToast('Joueur introuvable dans le roster', 'error');
      }
    }
  };

  const handleShortlistConfirm = (message, player, responseType, selectedClubs) => {
    if (!message || !player || !selectedClubs?.length) return;
    const clubNames = selectedClubs.map((club) => club.name);
    const proposal = proposePlayerToClubs(state, player.id, clubNames);
    if (proposal.error) {
      showToast(proposal.error, 'error');
      return;
    }
    const expectedTier = player.rating >= 84 ? 1 : player.rating >= 77 ? 2 : player.rating >= 68 ? 3 : 4;
    const bestTier = Math.min(...selectedClubs.map((club) => club.tier));
    const cityMatch = selectedClubs.some((club) =>
      (player.preferredCountries ?? []).includes(club.countryCode)
      || (player.preferredCities ?? []).includes(club.city),
    );
    const ambitionBias = ['ambitieux', 'mercenaire'].includes(player.personality) ? 1 : 0;
    const satisfied = bestTier <= expectedTier + ambitionBias || cityMatch;
    const shortlistLabel = `Shortlist: ${clubNames.join(' / ')}`;
    const responseAction = { type: 'market_watch', label: shortlistLabel };
    const responseText = satisfied
      ? `Shortlist validée: ${clubNames.join(', ')}. On peut avancer.`
      : `J'ai vu la shortlist, mais j'espérais des pistes un peu plus fortes.`;
    const replyBody = satisfied
      ? `Oui, ${clubNames.join(', ')} me parlent. C'est cohérent avec ce que je veux.`
      : `Je suis partagé. Les pistes sont propres, mais je ne sens pas encore le coup parfait.`;
    const replySubject = satisfied ? 'La shortlist me plaît' : 'Shortlist à revoir';
    const effects = responseEffects[responseType] ?? { moral: 0, trust: 0, reputation: 0 };
    const playerMoodDelta = satisfied ? 4 : -3;
    const playerTrustDelta = satisfied ? 5 : -2;

    setState((current) => {
      const currentMessage = current.messages.find((item) => item.id === message.id);
      const currentPlayer = current.roster.find((item) => item.id === player.id) ?? player;
      if (!currentMessage || !currentPlayer) return current;
      const promise = createPromiseFromMessage({ message: currentMessage, week: current.week, responseType, existingPromises: current.promises, player: currentPlayer });
      const nextClubRelations = selectedClubs.reduce(
        (relations, club) => applyClubRelation(relations, club.name, satisfied ? 1 : -1),
        proposal.state.clubRelations,
      );
      const nextClubMemory = selectedClubs.reduce(
        (memory, club) => recordClubMemory(memory, club.name, { trust: satisfied ? 1 : -1, week: current.week }),
        proposal.state.clubMemory,
      );

      const resolvedMessage = {
        ...currentMessage,
        resolved: true,
        responseType,
        responseAction,
        responseText,
      };

      const playerReply = {
        id: makeId('msg'),
        week: current.week,
        sortWeek: current.week + 0.1,
        type: 'shortlist_reply',
        threadKey: currentMessage.threadKey ?? currentPlayer.id,
        threadLabel: currentMessage.threadLabel ?? `${currentPlayer.firstName} ${currentPlayer.lastName}`,
        playerId: currentPlayer.id,
        playerName: `${currentPlayer.firstName} ${currentPlayer.lastName}`,
        senderRole: 'player',
        senderName: `${currentPlayer.firstName} ${currentPlayer.lastName}`,
        subject: replySubject,
        body: replyBody,
        read: false,
        resolved: true,
      };

      return {
        ...proposal.state,
        roster: proposal.state.roster.map((item) =>
          item.id === currentPlayer.id
            ? {
                ...item,
                moral: clamp(item.moral + effects.moral + playerMoodDelta),
                trust: clamp((item.trust ?? 50) + effects.trust + playerTrustDelta),
                pressure: clamp((item.pressure ?? 30) + (satisfied ? -2 : 2)),
                shortlist: clubNames,
                activeActions: [responseAction, ...(item.activeActions ?? [])].slice(0, 5),
                timeline: [{ week: current.week, type: 'shortlist', label: shortlistLabel }, ...(item.timeline ?? [])].slice(0, 18),
              }
            : item,
        ),
        messages: [playerReply, ...proposal.state.messages.map((item) => (item.id === message.id ? resolvedMessage : item))].slice(0, 40),
        promises: normalizePromises([...(promise ? [promise] : []), ...(proposal.state.promises ?? [])]).slice(0, 30),
        clubRelations: nextClubRelations,
        clubMemory: nextClubMemory,
        decisionHistory: addDecisionHistory(proposal.state.decisionHistory, {
          week: current.week,
          type: 'shortlist',
          label: shortlistLabel,
          detail: `${currentPlayer.firstName} ${currentPlayer.lastName} shortlist sur ${clubNames.join(', ')}.`,
          playerId: currentPlayer.id,
          playerName: `${currentPlayer.firstName} ${currentPlayer.lastName}`,
        }),
      };
    });

    setActiveMessageThreadKey(message.threadKey ?? message.playerId);
    setModal(null);
    showToast(satisfied ? 'Shortlist validée' : 'Shortlist discutée', satisfied ? 'success' : 'info');
  };

  const handleResetGame = () => {
    setConfirmDialog({
      title: 'Réinitialiser la partie ?',
      body: 'Cette action remet l’agence à zéro et efface la sauvegarde locale. Tu repars au départ de carrière.',
      confirmLabel: 'Réinitialiser',
      tone: 'danger',
      onConfirm: async () => {
        setState(createFreshState());
        setSavePreview(null);
        setView('dashboard');
        setSaveMenuOpen(false);
        setHasSave(false);
        setConfirmDialog(null);
        showToast('Nouvelle partie', 'success');
        try {
          await clearLocalGameProgress();
        } catch {
          // If local storage cleanup fails, the visible reset still completed.
        }
      },
    });
  };

  const handleHardResetGame = async () => {
    await clearLocalGameProgress();
    setState(createFreshState());
    setSavePreview(null);
    setHasSave(false);
    setConfirmDialog(null);
    setSaveMenuOpen(true);
    setView('dashboard');
    showToast('Sauvegarde effacée', 'success');
  };

  const handleNewGame = () => {
    setConfirmDialog({
      title: 'Commencer une nouvelle partie ?',
      body: hasSave
        ? 'La sauvegarde actuelle sera remplacée. Tu peux relancer une nouvelle agence juste après.'
        : 'Tu démarres une nouvelle partie et tu repars de zéro.',
      confirmLabel: 'Nouvelle partie',
      tone: 'danger',
      onConfirm: async () => {
        setState(createFreshState());
        setSavePreview(null);
        setView('dashboard');
        setSaveMenuOpen(false);
        setHasSave(false);
        setConfirmDialog(null);
        showToast('Nouvelle partie', 'success');
        try {
          await clearLocalGameProgress();
        } catch {
          // Visible reset already happened; storage cleanup can fail silently.
        }
        window.location.reload();
      },
    });
  };

  const startNegotiation = (player, type) => {
    const latestPlayer = state.roster.find((item) => item.id === player.id) ?? player;
    const cooldownUntil = state.negotiationCooldowns?.[latestPlayer.id];
    if (cooldownUntil && cooldownUntil > state.week) {
      showToast(`Négociation en pause jusqu'en S${cooldownUntil}`, 'error');
      return;
    }
    if (getActiveDossierPlayerIds(state).has(latestPlayer.id)) {
      const lifecycle = getPlayerLifecycleState(latestPlayer, state);
      const message = lifecycle.key === 'predeal'
        ? 'Ce joueur a déjà un pré-accord en cours.'
        : lifecycle.key === 'transferred'
          ? 'Ce joueur est déjà transféré.'
          : 'Ce joueur a déjà un dossier actif.';
      showToast(message, 'error');
      return;
    }
    const readiness = type === 'transfer' ? getTransferReadiness(state, latestPlayer, phase) : getExtensionReadiness(state, latestPlayer);
    if (!readiness.ok) {
      showToast(readiness.message, 'error');
      return;
    }
    setModal({
      type: 'contract_flow',
      data: {
        player: latestPlayer,
        contractType: type === 'transfer' ? 'transfer' : 'extend',
        offer: buildContractOffer(latestPlayer, type, state),
        readiness,
      },
    });
  };

  const showPlayerDetails = (player) => {
    setModal({ type: 'player_detail', data: { player } });
  };

  const showClubDetails = (clubName) => {
    setModal({ type: 'club_detail', data: { clubName } });
  };

  const handleContactClubStaff = (playerId, target) => {
    setState((current) => {
      const player = current.roster.find((item) => item.id === playerId);
      if (!player || player.club === 'Libre') return current;
      const isCoach = target === 'coach';
      const staffName = isCoach ? `Coach de ${player.club}` : `DS de ${player.club}`;
      const threadKey = `${player.id}:staff:${target}`;
      return {
        ...current,
        clubRelations: applyClubRelation(current.clubRelations, player.club, isCoach ? 2 : 1),
        clubMemory: recordClubMemory(current.clubMemory, player.club, { trust: isCoach ? 1 : 1, week: current.week }),
        decisionHistory: addDecisionHistory(current.decisionHistory, {
          week: current.week,
          type: isCoach ? 'coach_call' : 'ds_call',
          label: `${staffName} contacté`,
          detail: `Discussion ouverte pour ${player.firstName} ${player.lastName}.`,
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
        }),
        roster: current.roster.map((item) =>
          item.id === player.id
            ? {
                ...item,
                trust: clamp((item.trust ?? 50) + (isCoach ? 3 : 2)),
                pressure: clamp((item.pressure ?? 30) - 3),
                timeline: [{ week: current.week, type: 'staff_call', label: `${staffName} contacté` }, ...(item.timeline ?? [])].slice(0, 18),
              }
            : item,
        ),
        messages: [
          createStaffConversationMessage({
            player,
            staffName,
            type: isCoach ? 'coach_dialogue' : 'ds_dialogue',
            week: current.week,
            context: isCoach ? 'coach_talk' : 'ds_talk',
            subject: `${staffName} répond`,
            body: isCoach
              ? `Le coach veut clarifier le temps de jeu de ${player.firstName} et comprendre le niveau d'attente sur les prochaines semaines.`
              : `Le DS accepte de parler du rôle, de la situation contractuelle et du plan sportif de ${player.firstName}.`,
          }),
          ...current.messages,
        ].slice(0, 40),
      };
    });
    setActiveMessageThreadKey(`${playerId}:staff:${target}`);
    setView('messages');
    showToast(target === 'coach' ? 'Coach contacté' : 'DS contacté', 'success');
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
    setActiveMessageThreadKey(player.id);
    setView('messages');
    showToast('Appel joueur ajouté aux messages', 'success');
  };

  if (!loaded && !saveMenuOpen) {
    return (
      <div style={S.loadScreen}>
        <div style={S.loadText}>CHARGEMENT</div>
      </div>
    );
  }

  if (saveMenuOpen) {
    return (
      <>
        <style>{CSS}</style>
        <SaveMenu
          hasSave={hasSave}
          savePreview={savePreview}
          onContinue={() => {
            setSaveMenuOpen(false);
            setView('dashboard');
          }}
          onNewGame={handleNewGame}
          onReset={handleHardResetGame}
        />
        {confirmDialog && (
          <ConfirmModal
            title={confirmDialog.title}
            body={confirmDialog.body}
            confirmLabel={confirmDialog.confirmLabel}
            cancelLabel="Annuler"
            tone={confirmDialog.tone}
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
      </>
    );
  }

  const phase = getPhase(state.week);
  const calendarSnapshot = getCalendarSnapshot(state.week);
  const pendingCounts = getPendingMessageCounts(state);
  // Badge "match européen ce soir" — vrai si au moins un joueur a un match euro cette semaine
  const hasEuroMatchThisWeek = (state.roster ?? []).some((p) => {
    const comp = p.europeanCompetition;
    return comp && isEuropeanMatchWeek(phase.seasonWeek, comp);
  });
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
      <div style={S.scrollArea}>
      <header style={S.header}>
        <div style={S.brandRow}>
          <div style={S.logo}>
            <div style={{ ...S.logoMark, background: agencyProfile.color }}>{agencyProfile.emblem ?? '⚡'}</div>
            <div>
              <div style={S.brandName}>{agencyProfile.name}</div>
              <div style={S.brandSub}>{agencyProfile.city} · {agencyProfile.ownerName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {hasEuroMatchThisWeek && (
              <button
                onClick={() => setView('europe')}
                style={{ fontSize: 10, fontWeight: 800, color: '#1a1a6e', background: '#eef0ff', border: '1px solid #c5caff', borderRadius: 6, padding: '2px 7px', fontFamily: 'system-ui,sans-serif', letterSpacing: '.04em', cursor: 'pointer', animation: 'pulse 2s infinite' }}
              >
                ⭐ Match euro ce soir
              </button>
            )}
            {saveFlash && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#00a676', background: '#f0fdf8', border: '1px solid #cfeee3', borderRadius: 6, padding: '2px 7px', fontFamily: 'system-ui,sans-serif', letterSpacing: '.04em', transition: 'opacity .3s' }}>
                💾 Sauvegardé
              </span>
            )}
            <button onClick={handleResetGame} style={S.iconBtn}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <div style={S.seasonBar}>
          <div>
            <div style={S.seasonLabel}>SAISON {phase.season} · S{phase.seasonWeek}/38</div>
            <div style={S.seasonDate}>{calendarSnapshot.dateLabel} · {calendarSnapshot.weekRangeLabel}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {state.activePeriod && (
              <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 7px', fontFamily: 'system-ui,sans-serif' }}>
                {state.activePeriod.emoji} {state.activePeriod.label}
              </span>
            )}
            <div style={S.seasonPhase}>{phase.phase.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[
            { icon: <DollarSign size={12} />, label: 'Capital', value: formatMoney(state.money), accent: '#00a676' },
            { icon: <Star size={12} />, label: 'Rép.', value: `${state.reputation}`, accent: '#2f80ed' },
            { icon: <Users size={12} />, label: 'Joueurs', value: `${state.roster.length}/${getAgencyCapacity(state.agencyLevel)}`, accent: '#3f5663' },
            { icon: <Trophy size={12} />, label: 'Msg', value: `${pendingCounts.total}`, accent: pendingCounts.total > 0 ? '#b42318' : '#64727d' },
          ].map((chip) => (
            <div key={chip.label} style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: '6px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: chip.accent }}>{chip.icon}</span>
              <div>
                <div style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 800, letterSpacing: '.1em', lineHeight: 1 }}>{chip.label}</div>
                <div style={{ fontSize: 14, fontWeight: 850, color: '#172026', lineHeight: 1.2 }}>{chip.value}</div>
              </div>
            </div>
          ))}
        </div>
      </header>
      <main style={S.main}>
        {view === 'dashboard' && <Dashboard state={state} phase={phase} onPlay={handlePlayWeek} onNav={setView} onAcceptOffer={handleAcceptOffer} onRejectOffer={handleRejectOffer} onClubDetails={showClubDetails} onOpenContracts={() => setView('contracts')} onCompareOffers={handleCompareOffers} />}
        {view === 'market' && <Market state={state} market={state.market} freeAgents={state.freeAgents} money={state.money} onSign={handleSignPlayer} onRefresh={handleRefreshMarket} onDetails={showPlayerDetails} />}
        {view === 'roster' && <Roster state={state} roster={state.roster} onRelease={handleReleasePlayer} onNego={startNegotiation} onDetails={showPlayerDetails} />}
        {view === 'messages' && <Messages messages={state.messages} messageQueue={state.messageQueue ?? []} onRespond={handleMessageResponse} onAction={handleMessageAction} focusThreadKey={activeMessageThreadKey} />}
        {view === 'more' && <More items={moreItems} onNav={setView} />}
        {view === 'shop' && <Shop state={state} phase={phase} onBuy={handleBuyShopItem} />}
        {view === 'calendar' && <Calendar state={state} onClubDetails={showClubDetails} />}
        {view === 'standings' && <Standings state={state} onClubDetails={showClubDetails} />}
        {view === 'europe' && <EuropeanBracket state={state} />}
        {view === 'deadline' && <DeadlineDay state={state} phase={phase} onNegotiateOffer={handleAcceptOffer} onRejectOffer={handleRejectOffer} />}
        {view === 'scouting' && <Scouting state={state} onStartMission={handleStartScoutingMission} />}
        {view === 'vestiaire' && <Vestiaire state={state} onOpenPlayer={showPlayerDetails} onClubDetails={showClubDetails} />}
        {view === 'dossiers' && <Dossiers state={state} onOpenPlayer={showPlayerDetails} onClubDetails={showClubDetails} onNav={setView} />}
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
        {/* news/media views removed — content accessible via Dossiers */}
        {view === 'contracts' && <ContractDashboard state={state} onNego={(player, type) => startNegotiation(player, type ?? 'extend')} onOpenPlayer={showPlayerDetails} />}
        {view === 'contacts' && <Contacts state={state} onCall={handleCallContact} />}
      </main>
      </div>{/* end scrollArea */}
      <nav style={S.nav}>
        {mainNav.map(([key, item]) => {
          const Icon = item.icon;
          const active = key === 'more'
            ? !['dashboard', 'roster', 'market', 'messages'].includes(view)
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
            {key === 'messages' && pendingCounts.total > 0 && <span style={S.navBadge}>{pendingCounts.total}</span>}
          </button>
          );
        })}
      </nav>
      {weekTickerData && (
        <WeekTickerModal
          report={weekTickerData}
          activePeriod={weekTickerData.activePeriod}
          onDone={handleTickerDone}
        />
      )}
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
      {modal?.type === 'shortlist' && (
        <ShortlistModal
          player={modal.data.player}
          state={state}
          currentWeek={state.week}
          onClose={() => setModal(null)}
          onConfirm={(selectedClubs) => handleShortlistConfirm(modal.data.message, modal.data.player, modal.data.responseType, selectedClubs)}
        />
      )}
      {modal?.type === 'recruit_player' && (
        <RecruitmentModal
          state={state}
          player={state.market.find((player) => player.id === modal.data.player.id) ?? state.freeAgents.find((player) => player.id === modal.data.player.id) ?? modal.data.player}
          onClose={() => setModal(null)}
          onConfirm={(pitchId) => handleRecruitPlayer(modal.data.player, pitchId)}
        />
      )}
      {modal?.type === 'contract_flow' && (
        <OfferContractModal
          key={`contract-flow-${modal.data.player.id}-${modal.data.contractType}`}
          offer={modal.data.offer}
          player={state.roster.find((player) => player.id === modal.data.player.id) ?? modal.data.player}
          readiness={modal.data.readiness}
          mode={modal.data.contractType}
          onClose={() => setModal(null)}
          onSign={(outcome) => handleFinishNegotiation(modal.data.contractType, modal.data.player, outcome)}
          onReject={() => setModal(null)}
        />
      )}
      {modal?.type === 'nego_offer' && (
        <OfferContractModal
          offer={modal.data.offer}
          player={state.roster.find((player) => player.id === modal.data.player.id) ?? modal.data.player}
          readiness={getOfferAcceptanceReadiness(state, modal.data.offer)}
          onClose={() => setModal(null)}
          onSign={(outcome) => handleFinishOfferNegotiation(modal.data.offer, outcome)}
          onReject={() => { commitResult(rejectClubOffer(state, modal.data.offer.id), 'Offre refusée'); setModal(null); }}
        />
      )}
      {modal?.type === 'offer_detail' && (
        <TransferOfferModal
          offer={modal.data.offer}
          player={modal.data.player}
          readiness={modal.data.readiness}
          onClose={() => setModal(null)}
          onAccept={() => setModal({ type: 'offer_contract', data: { offer: modal.data.offer, player: modal.data.player, readiness: modal.data.readiness } })}
          onNegotiate={() => setModal({ type: 'offer_contract', data: { offer: modal.data.offer, player: modal.data.player, readiness: modal.data.readiness } })}
          onReject={() => { commitResult(rejectClubOffer(state, modal.data.offer.id), 'Offre refusée'); setModal(null); }}
        />
      )}
      {modal?.type === 'offer_contract' && (
        <OfferContractModal
          offer={modal.data.offer}
          player={state.roster.find((player) => player.id === modal.data.player.id) ?? modal.data.player}
          readiness={modal.data.readiness ?? getOfferAcceptanceReadiness(state, modal.data.offer)}
          mode="offer"
          onClose={() => setModal(null)}
          onSign={(outcome) => handleFinishOfferNegotiation(modal.data.offer, outcome)}
          onReject={() => { commitResult(rejectClubOffer(state, modal.data.offer.id), 'Offre refusée'); setModal(null); }}
        />
      )}
        {modal?.type === 'player_detail' && (
          <PlayerDetailModal
            player={state.roster.find((player) => player.id === modal.data.player.id) ?? modal.data.player}
            messages={state.messages}
            messageQueue={state.messageQueue ?? []}
            promises={state.promises}
            clubRelations={state.clubRelations}
            clubMemory={state.clubMemory}
            clubSeasonHistory={state.clubSeasonHistory}
            dossierMemory={state.dossierMemory}
            decisionHistory={state.decisionHistory}
            pendingTransfers={state.pendingTransfers}
            clubOffers={state.clubOffers}
            negotiationCooldowns={state.negotiationCooldowns}
            currentWeek={state.week}
            worldCupState={state.worldCupState}
            onClose={() => setModal(null)}
            onNego={(type) => startNegotiation(modal.data.player, type)}
            onMeeting={handlePlayerMeeting}
            onMarketAction={handlePlayerMarketAction}
            onCallPlayer={handleCallPlayer}
            onContactClubStaff={handleContactClubStaff}
          />
        )}
      {modal?.type === 'club_detail' && (
        <ClubModal clubName={modal.data.clubName} relations={state.clubRelations} clubMemory={state.clubMemory} decisionHistory={state.decisionHistory} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'offer_compare' && (
        <OfferCompareModal
          offers={modal.data.offers}
          players={state.roster}
          onAccept={(offer) => { setModal(null); handleAcceptOffer(offer.id); }}
          onReject={(offer) => { commitResult(rejectClubOffer(state, offer.id), 'Offre refusée'); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'media_crisis' && (
        <MediaCrisisModal
          crisis={modal.data.crisis}
          player={modal.data.player}
          money={state.money}
          onResolve={({ choice, effects, cost }) => {
            const resolvedMessageId = modal.data.messageId;
            setState((cur) => ({
              ...cur,
              money: cur.money - (cost ?? 0),
              reputation: Math.max(0, Math.min(100, cur.reputation + (effects?.rep ?? 0))),
              roster: cur.roster.map((p) =>
                p.id === modal.data.player?.id
                  ? {
                      ...p,
                      moral: Math.max(0, Math.min(100, p.moral + (effects?.moral ?? 0))),
                      trust: Math.max(0, Math.min(100, (p.trust ?? 50) + (effects?.trust ?? 0))),
                    }
                  : p,
              ),
              messages: resolvedMessageId
                ? cur.messages.map((m) =>
                    m.id === resolvedMessageId
                      ? { ...m, resolved: true, responseType: choice.id, responseText: `Crise gérée : ${choice.label}` }
                      : m,
                  )
                : cur.messages,
              socialCrisisCooldowns: modal.data.player?.id
                ? { ...(cur.socialCrisisCooldowns ?? {}), [modal.data.player.id]: cur.week + 6 }
                : (cur.socialCrisisCooldowns ?? {}),
            }));
            setModal(null);
            showToast('Crise gérée', 'success');
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'retirement' && (
        <RetirementModal
          player={modal.data.player}
          week={state.week}
          onDecide={(pathId) => {
            const RETIREMENT_BONUS = {
              retire_graceful: { money: 5000, rep: 4 },
              one_more_year: { money: 0, rep: 0 },
              coaching: { money: 0, rep: 2 },
              ambassador: { money: 0, rep: 3 },
            };
            const RETIREMENT_LABELS = { retire_graceful: 'Retraite', one_more_year: 'Une saison de plus', coaching: 'Reconversion entraîneur', ambassador: 'Ambassadeur' };
            const bonus = RETIREMENT_BONUS[pathId] ?? { money: 0, rep: 0 };
            const retirementMessageId = modal.data.messageId;
            setState((cur) => ({
              ...cur,
              money: cur.money + bonus.money,
              reputation: Math.min(100, cur.reputation + bonus.rep),
              roster: pathId === 'one_more_year' ? cur.roster : cur.roster.filter((p) => p.id !== modal.data.player.id),
              messages: retirementMessageId
                ? cur.messages.map((m) =>
                    m.id === retirementMessageId
                      ? { ...m, resolved: true, responseType: pathId, responseText: RETIREMENT_LABELS[pathId] ?? pathId }
                      : m,
                  )
                : cur.messages,
            }));
            setModal(null);
            showToast(`${modal.data.player.firstName} ${modal.data.player.lastName} — ${RETIREMENT_LABELS[pathId] ?? pathId}`, 'success');
          }}
          onClose={() => setModal(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          body={confirmDialog.body}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel="Annuler"
          tone={confirmDialog.tone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {/* Floating Action Button — play week from any view */}
      {!weekTickerData && !modal && view !== 'dashboard' && loaded && state?.roster?.length > 0 && (
        <button
          onClick={handlePlayWeek}
          title="Jouer la semaine"
          style={{
            position: 'fixed',
            bottom: 72,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: 'linear-gradient(135deg,#00a676,#0dba8a)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(0,166,118,.45)',
            cursor: 'pointer',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulseGlow 2.2s ease-in-out infinite',
          }}
        >
          <Play size={22} fill="#ffffff" />
        </button>
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

      {lastWeekError && (
        <div style={{
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: 72,
          zIndex: 65,
          background: '#fff7f7',
          border: '1px solid #f5c2c7',
          color: '#7a1f2b',
          borderRadius: 10,
          padding: '10px 12px',
          boxShadow: '0 12px 30px rgba(15,23,32,.14)',
          fontSize: 12,
          lineHeight: 1.35,
        }}>
          <strong>Semaine de secours</strong> · {lastWeekError.message}
        </div>
      )}
    </div>
  );
}
