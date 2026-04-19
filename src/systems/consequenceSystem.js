import { MEDIA_RELATION_TEMPLATES, addDecisionHistory, applyCredibilityChange, applyMediaRelation, applyPlayerSegmentReputation, createDefaultCountryReputation, getPlayerSegment } from './agencyReputationSystem';
import { applyClubRelation } from './clubSystem';
import { applyLeagueReputation } from './leagueReputationSystem';
import { createMessage } from './messageSystem';
import { hasDossierEventThisWeek, hasRecentDossierEvent, recordDossierEvent } from './coherenceSystem';
import { getMediaCrisisCooldownWeeks, hasOpenMediaPressure } from './dossierSystem';
import { clamp, makeId, pick } from '../utils/helpers';

const MEDIA_NAME_TO_ID = MEDIA_RELATION_TEMPLATES.reduce((map, media) => ({
  ...map,
  [media.name.toLowerCase()]: media.id,
}), {});

const NARRATIVE_DURATIONS = {
  media_crisis: 5,
  hype_train: 6,
  transfer_saga: 6,
  club_tension: 5,
  injury_comeback: 6,
  coach_conflict: 5,
  breakout_run: 6,
  transfer_rumor: 5,
};

const normalizeMediaId = (accountName = '') => {
  const key = accountName.toLowerCase();
  if (MEDIA_NAME_TO_ID[key]) return MEDIA_NAME_TO_ID[key];
  if (key.includes('tabloid') || key.includes('leaks')) return 'tabloid_sport';
  if (key.includes('mercato') || key.includes('transfer')) return 'mercato_insider';
  if (key.includes('stat')) return 'statszone_fc';
  if (key.includes('social') || key.includes('supporter') || key.includes('tribune')) return 'foot_social_club';
  return 'canal_football_desk';
};

export const createNarrativeArc = ({ type, player, club, week, origin, intensity = 1 }) => ({
  id: makeId('arc'),
  type,
  playerId: player?.id,
  playerName: player ? `${player.firstName} ${player.lastName}` : undefined,
  club,
  origin,
  startedWeek: week,
  weeksLeft: NARRATIVE_DURATIONS[type] ?? 3,
  intensity: clamp(intensity, 1, 5),
});

export const mergeNarrativeArc = (arcs, arc) => {
  if (!arc) return arcs;
  const existingIndex = arcs.findIndex((item) =>
    item.type === arc.type
    && item.playerId === arc.playerId
    && item.club === arc.club,
  );

  if (existingIndex === -1) return [arc, ...arcs].slice(0, 12);

  return arcs.map((item, index) =>
    index === existingIndex
      ? {
          ...item,
          weeksLeft: Math.max(item.weeksLeft ?? 0, arc.weeksLeft ?? 0),
          intensity: clamp((item.intensity ?? 1) + 1, 1, 5),
          origin: arc.origin ?? item.origin,
        }
      : item,
  );
};

export const tickNarrativeArcs = (arcs = []) =>
  arcs
    .map((arc) => ({ ...arc, weeksLeft: (arc.weeksLeft ?? 1) - 1 }))
    .filter((arc) => arc.weeksLeft > 0)
    .slice(0, 12);

const updatePlayerFromPost = (player, post, impact, viralWeight) => {
  const pressureDelta = impact < 0
    ? Math.ceil(Math.abs(impact) * viralWeight * 1.8)
    : post.trend === 'viral'
      ? 2
      : 0;
  const brandDelta = post.type === 'transfert'
    ? Math.max(0, Math.ceil(impact * viralWeight * 0.8))
    : Math.ceil(impact * viralWeight * 1.2);
  const trustDelta = impact < 0 && ['scandale', 'media'].includes(post.type) ? -2 : impact > 2 ? 1 : 0;

  return {
    ...player,
    moral: clamp(player.moral + Math.round(impact * 0.7)),
    trust: clamp((player.trust ?? 50) + trustDelta),
    pressure: clamp((player.pressure ?? 30) + pressureDelta - Math.max(0, impact)),
    brandValue: clamp((player.brandValue ?? 20) + brandDelta),
    timeline: [
      {
        week: post.week,
        type: 'media',
        label: impact >= 0
          ? `Buzz positif: ${post.accountName}`
          : `Pression media: ${post.accountName}`,
      },
      ...(player.timeline ?? []),
    ].slice(0, 18),
  };
};

export const applyNewsConsequences = ({ state, roster, posts, week }) => {
  if (!posts?.length) {
    return {
      roster,
      messages: [],
      events: [],
      patch: {
        activeNarratives: tickNarrativeArcs(state.activeNarratives ?? []),
        reputationDelta: 0,
      },
    };
  }

  let nextRoster = roster;
  let mediaRelations = state.mediaRelations;
  let clubRelations = state.clubRelations;
  let countryReputation = state.countryReputation ?? createDefaultCountryReputation(state.agencyProfile?.countryCode ?? 'FR', state.reputation ?? 12);
  let leagueReputation = state.leagueReputation;
  let playerSegmentReputation = state.playerSegmentReputation;
  let credibility = state.credibility ?? 50;
  let decisionHistory = state.decisionHistory ?? [];
  let activeNarratives = tickNarrativeArcs(state.activeNarratives ?? []);
  let dossierMemory = state.dossierMemory ?? {};
  let reputationDelta = 0;
  const messages = [];
  const events = [];

  posts.forEach((post) => {
    const impact = post.reputationImpact ?? 0;
    const viralWeight = post.trend === 'viral' ? 2 : post.trend === 'débat' ? 1.4 : 1;
    const mediaId = normalizeMediaId(post.accountName);
    const player = nextRoster.find((item) => item.id === post.playerId);
    const playerIndex = nextRoster.findIndex((item) => item.id === post.playerId);
    const weightedImpact = Math.round(impact * viralWeight);

    reputationDelta += Math.sign(impact) * Math.min(2, Math.ceil(Math.abs(impact) / 4));

    if (post.accountKind !== 'club') {
      const mediaDelta = impact < 0
        ? -Math.ceil(Math.abs(impact) * viralWeight)
        : Math.max(1, Math.ceil(impact * 0.5));
      mediaRelations = applyMediaRelation(mediaRelations, mediaId, mediaDelta);
    }

    if (impact < 0) credibility = applyCredibilityChange(credibility, -Math.ceil(Math.abs(impact) * 0.45));
    if (impact > 3 && post.accountKind !== 'fan') credibility = applyCredibilityChange(credibility, 1);

    if (player && playerIndex >= 0) {
      const updatedPlayer = updatePlayerFromPost(player, post, impact, viralWeight);
      nextRoster = nextRoster.map((item, index) => (index === playerIndex ? updatedPlayer : item));

      const segment = getPlayerSegment(updatedPlayer);
      playerSegmentReputation = applyPlayerSegmentReputation(playerSegmentReputation, segment, impact >= 0 ? 1 : -1);

      if (updatedPlayer.club && updatedPlayer.club !== 'Libre') {
        const clubDelta = post.type === 'transfert'
          ? (impact >= 0 ? 1 : -2)
          : post.type === 'scandale'
            ? -3
            : post.type === 'performance'
              ? 1
              : 0;
        clubRelations = applyClubRelation(clubRelations, updatedPlayer.club, clubDelta);
      }

      countryReputation = applyLeagueReputation(countryReputation, updatedPlayer.clubCountryCode ?? updatedPlayer.countryCode, impact >= 0 ? 1 : -1);
      leagueReputation = applyLeagueReputation(leagueReputation, updatedPlayer.clubCountryCode ?? updatedPlayer.countryCode, impact >= 0 ? 1 : 0);

      if (post.trend === 'viral' || Math.abs(weightedImpact) >= 5) {
        const arcType = impact < 0
          ? 'media_crisis'
          : post.type === 'transfert'
            ? 'transfer_saga'
            : 'hype_train';
        activeNarratives = mergeNarrativeArc(activeNarratives, createNarrativeArc({
          type: arcType,
          player: updatedPlayer,
          club: updatedPlayer.club,
          week,
          origin: post.text,
          intensity: Math.min(5, Math.ceil(Math.abs(weightedImpact) / 3)),
        }));
      }

      if ((post.type === 'scandale' || (post.type === 'media' && impact < 0))
          && !hasOpenMediaPressure(state, updatedPlayer.id)
          && getMediaCrisisCooldownWeeks(state, updatedPlayer.id) <= 0
          && !hasRecentDossierEvent(dossierMemory, updatedPlayer.id, 'media', 4, week)
          && !hasDossierEventThisWeek(dossierMemory, updatedPlayer.id, week)) {
        messages.push(createMessage({ player: updatedPlayer, type: 'media_pressure', week, context: post.id }));
      } else if (post.trend === 'viral' && impact > 0 && Math.random() < 0.45) {
        messages.push(createMessage({ player: updatedPlayer, type: 'thanks', week, context: post.id }));
      }

      dossierMemory = recordDossierEvent(dossierMemory, {
        playerId: updatedPlayer.id,
        clubName: updatedPlayer.club && updatedPlayer.club !== 'Libre' ? updatedPlayer.club : null,
        mediaId,
        week,
        type: post.type === 'transfert'
          ? 'transfer'
          : post.type === 'scandale' || post.type === 'media'
            ? 'media'
            : 'note',
        label: post.accountName ?? post.text ?? 'News',
        impact: impact < 0 ? -1 : impact > 0 ? 1 : 0,
      });
    }

    if (post.trend === 'viral' || post.type === 'transfert' || Math.abs(weightedImpact) >= 4) {
      decisionHistory = addDecisionHistory(decisionHistory, {
        week,
        type: `news_${post.type}`,
        label: post.playerName
          ? `${post.accountName}: ${post.playerName}`
          : `${post.accountName}: sujet agence`,
        impact: weightedImpact,
      });
    }

    if (post.type === 'transfert' && player && impact < 0) {
      activeNarratives = mergeNarrativeArc(activeNarratives, createNarrativeArc({
        type: 'club_tension',
        player,
        club: player.club,
        week,
        origin: post.text,
        intensity: 2,
      }));
    }
  });

  return {
    roster: nextRoster,
    messages: messages.slice(0, 3),
    events,
    patch: {
      mediaRelations,
      clubRelations,
      countryReputation,
      leagueReputation,
      playerSegmentReputation,
      credibility,
      decisionHistory,
      activeNarratives,
      dossierMemory,
      reputationDelta,
    },
  };
};

export const generateNarrativeFollowups = ({ state, roster, week }) => {
  const arcs = (state.activeNarratives ?? []).filter((arc) => arc.weeksLeft > 1);
  if (!arcs.length || Math.random() > 0.55) return { events: [], messages: [] };

  const arc = pick(arcs);
  const player = roster.find((item) => item.id === arc.playerId);
  if (!player) return { events: [], messages: [] };

  if (arc.type === 'media_crisis') {
    if (hasOpenMediaPressure(state, player.id) || getMediaCrisisCooldownWeeks(state, player.id) > 0) {
      return {
        events: [{ title: 'Réseaux sous contrôle', text: `${player.firstName} ${player.lastName} reste dans une séquence médiatique sensible, mais la pression a été contenue pour le moment.` }],
        messages: [],
      };
    }
    return {
      events: [{ title: 'Crise media qui continue', text: `${player.firstName} ${player.lastName} reste au centre des débats. La prochaine réponse peut calmer ou amplifier l'histoire.` }],
      messages: [createMessage({ player, type: 'media_pressure', week, context: arc.id })],
    };
  }

  if (arc.type === 'transfer_saga') {
    return {
      events: [{ title: 'Saga mercato', text: `Le dossier ${player.firstName} ${player.lastName} continue d'agiter les clubs. Un appel sérieux pourrait arriver si les performances suivent.` }],
      messages: [createMessage({ player, type: 'transfer_request', week, context: arc.id })],
    };
  }

  if (arc.type === 'injury_comeback') {
    return {
      events: [{ title: 'Retour de blessure', text: `${player.firstName} ${player.lastName} s'approche d'un retour. La gestion des minutes sera décisive.` }],
      messages: [createMessage({ player, type: 'thanks', week, context: arc.id })],
    };
  }

  if (arc.type === 'coach_conflict') {
    return {
      events: [{ title: 'Conflit coach', text: `Le dossier ${player.firstName} ${player.lastName} reste tendu avec le staff. Un échange direct peut éviter la casse.` }],
      messages: [createMessage({ player, type: 'role_frustration', week, context: arc.id })],
    };
  }

  if (arc.type === 'breakout_run') {
    return {
      events: [{ title: 'Montée en puissance', text: `${player.firstName} ${player.lastName} enchaîne les semaines fortes. La valeur du dossier grimpe.` }],
      messages: [createMessage({ player, type: 'thanks', week, context: arc.id })],
    };
  }

  if (arc.type === 'transfer_rumor') {
    return {
      events: [{ title: 'Rumeur de départ', text: `Une rumeur de départ entoure ${player.firstName} ${player.lastName}. Le prochain message comptera.` }],
      messages: [createMessage({ player, type: 'transfer_request', week, context: arc.id })],
    };
  }

  return {
    events: [{ title: 'Buzz positif', text: `${player.firstName} ${player.lastName} profite d'une vague positive. Attention a ne pas laisser la pression grandir trop vite.` }],
    messages: Math.random() < 0.5 ? [createMessage({ player, type: 'thanks', week, context: arc.id })] : [],
  };
};
