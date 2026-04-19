const URGENT_MESSAGE_TYPES = new Set([
  'transfer_request',
  'raise_request',
  'complaint',
  'injury_worry',
  'role_frustration',
  'media_pressure',
  'promise_broken_warning',
  'staff_dialogue',
  'coach_dialogue',
  'ds_dialogue',
  'secret_offer',
]);

const PRIORITY_RANK = {
  urgent: 3,
  normal: 2,
  to_process: 1,
};

const RESPONSE_REQUIRED_TYPES = new Set([
  'transfer_request',
  'raise_request',
  'complaint',
  'injury_worry',
  'role_frustration',
  'media_pressure',
  'promise_broken_warning',
  'staff_dialogue',
  'coach_dialogue',
  'ds_dialogue',
  'secret_offer',
  'shortlist_reply',
]);

export const getMessagePriority = (message) => {
  if (!message) return 'normal';
  if (message.priority) return message.priority;
  if (URGENT_MESSAGE_TYPES.has(message.type)) return 'urgent';
  if (message.resolved) return 'normal';
  return 'to_process';
};

export const getMessagePriorityRank = (message) => PRIORITY_RANK[getMessagePriority(message)] ?? 2;

export const getMessageQueueLabel = (message) => {
  const priority = getMessagePriority(message);
  if (priority === 'urgent') return 'Urgent';
  if (priority === 'to_process') return 'À traiter';
  return 'Normal';
};

export const getPendingMessageCounts = (state) => {
  const inbox = state?.messages ?? [];
  const queue = state?.messageQueue ?? [];
  // Count only inbox messages for the badge — queue items haven't been delivered
  // yet so they don't need immediate user action (they'll arrive next week).
  const unresolved = inbox.filter((message) => !message.resolved);
  const urgent = unresolved.filter((message) => URGENT_MESSAGE_TYPES.has(message.type)).length;
  const awaitingResponse = unresolved.filter((message) => RESPONSE_REQUIRED_TYPES.has(message.type)).length;
  const queued = queue.length; // future items — not shown in main badge
  return {
    urgent,
    awaitingResponse,
    queued,
    total: unresolved.length, // badge only reflects inbox messages
  };
};

export const messageNeedsResponse = (message) => RESPONSE_REQUIRED_TYPES.has(message?.type) && !message?.resolved;

export const getActiveDossierPlayerIds = (state = {}) => {
  const ids = new Set();
  (state?.pendingTransfers ?? []).forEach((transfer) => ids.add(transfer.playerId));
  (state?.clubOffers ?? []).forEach((offer) => {
    if (['open', 'accepted_pending'].includes(offer.status)) ids.add(offer.playerId);
  });
  return ids;
};

export const getMarketLockedPlayerIds = (state = {}) => {
  const ids = new Set(getActiveDossierPlayerIds(state));
  (state?.messages ?? []).forEach((message) => {
    if (messageNeedsResponse(message) && ['transfer_request', 'raise_request', 'complaint', 'injury_worry', 'role_frustration', 'media_pressure'].includes(message.type)) {
      ids.add(message.playerId);
    }
  });
  return ids;
};

export const hasActiveDossierForPlayer = (state = {}, playerId) => getActiveDossierPlayerIds(state).has(playerId);

export const hasOpenMediaPressure = (state = {}, playerId) =>
  (state?.messages ?? []).some((message) =>
    message.playerId === playerId
    && message.type === 'media_pressure'
    && !message.resolved,
  );

export const getWeeksUntilMessageReopen = (state, playerId) => {
  const cooldownUntil = state?.negotiationCooldowns?.[playerId];
  if (!cooldownUntil) return 0;
  return Math.max(0, cooldownUntil - (state?.week ?? 0));
};

export const getMediaCrisisCooldownWeeks = (state, playerId) => {
  const cooldownUntil = state?.socialCrisisCooldowns?.[playerId];
  if (!cooldownUntil) return 0;
  return Math.max(0, cooldownUntil - (state?.week ?? 0));
};

export const getPlayerDossierStatus = (player, state) => {
  if (!player) return { label: 'Inconnu', tone: 'neutral', detail: '' };
  const weeksToReopen = getWeeksUntilMessageReopen(state, player.id);
  const pendingTransfer = (state?.pendingTransfers ?? []).find((transfer) => transfer.playerId === player.id);
  const openOffer = (state?.clubOffers ?? []).find((offer) => offer.playerId === player.id && offer.status === 'open');
  const unresolvedMessage = (state?.messages ?? []).find((message) => message.playerId === player.id && !message.resolved);
  const queuedMessage = (state?.messageQueue ?? []).find((message) => message.playerId === player.id);

  if (pendingTransfer) {
    return {
      label: 'Transféré',
      tone: 'good',
      detail: `Départ prévu semaine S${pendingTransfer.effectiveWeek}`,
      weeksUntilReopen: weeksToReopen,
    };
  }
  if (player.careerStatus === 'prolongé') {
    return {
      label: 'Prolongé',
      tone: 'good',
      detail: player.contractWeeksLeft ? `Contrat ${player.contractWeeksLeft}s` : 'Contrat renouvelé',
      weeksUntilReopen: weeksToReopen,
    };
  }
  if ((player.loanStatus ?? '').toLowerCase() === 'loan' || player.careerStatus === 'en prêt') {
    return {
      label: 'En prêt',
      tone: 'warn',
      detail: player.loanUntil ? `Retour semaine S${player.loanUntil}` : 'Prêt en cours',
      weeksUntilReopen: weeksToReopen,
    };
  }
  if (weeksToReopen > 0) {
    return {
      label: 'Verrouillé',
      tone: 'danger',
      detail: `Réouverture dans ${weeksToReopen} sem.`,
      weeksUntilReopen: weeksToReopen,
    };
  }
  if (openOffer || unresolvedMessage || queuedMessage || (player.activeActions ?? []).length) {
    return {
      label: 'En discussion',
      tone: 'warn',
      detail: openOffer?.club ? `Dossier ouvert avec ${openOffer.club}` : 'Dossier en cours',
      weeksUntilReopen: weeksToReopen,
    };
  }
  if (player.careerStatus === 'transféré') {
    return {
      label: 'Transféré',
      tone: 'good',
      detail: player.contractStartWeek ? `Arrivé en S${player.contractStartWeek}` : 'Dossier clos',
      weeksUntilReopen: weeksToReopen,
    };
  }
  if (player.careerStatus === 'en discussion') {
    return {
      label: 'En discussion',
      tone: 'warn',
      detail: 'Négociation active',
      weeksUntilReopen: weeksToReopen,
    };
  }
  return {
    label: 'Stable',
    tone: 'neutral',
    detail: 'Pas de dossier sensible',
    weeksUntilReopen: weeksToReopen,
  };
};

export const getRelevantDecisionHistory = (history = [], { playerId = null, clubName = null } = {}) => {
  return history.filter((item) => {
    if (playerId && item.playerId === playerId) return true;
    if (clubName && (String(item.detail ?? '').includes(clubName) || String(item.label ?? '').includes(clubName))) return true;
    return false;
  });
};

const OFFER_QUEUE_STATUS_ORDER = {
  nouvelle: 0,
  en_cours: 1,
  bloquee: 2,
  conclue: 3,
};

export const getMarketOfferStatus = (offer, state = {}) => {
  if (!offer) return { key: 'nouvelle', label: 'Nouvelle', tone: 'neutral' };

  const concluded = ['accepted_pending', 'accepted', 'completed', 'closed'].includes(offer.status)
    || (state?.pendingTransfers ?? []).some((transfer) => transfer.offerId === offer.id || transfer.playerId === offer.playerId);
  if (concluded) return { key: 'conclue', label: 'Conclue', tone: 'good' };

  const cooldownUntil = state?.negotiationCooldowns?.[offer.playerId] ?? 0;
  if (cooldownUntil > (state?.week ?? 0)) {
    return {
      key: 'bloquee',
      label: 'Bloquée',
      tone: 'danger',
      detail: `Verrou jusqu'en S${cooldownUntil}`,
    };
  }

  if (offer.isCompetingOffer || offer.isHotWeek || offer.actionSource?.startsWith('event') || offer.preWindow) {
    return { key: 'en_cours', label: 'En cours', tone: 'warn' };
  }

  return { key: 'nouvelle', label: 'Nouvelle', tone: 'neutral' };
};

export const getMarketOfferQueue = (state = {}) => {
  const offers = state?.clubOffers ?? [];
  return offers
    .filter((offer) => ['open', 'accepted_pending', 'accepted', 'closed'].includes(offer.status))
    .map((offer) => ({
      ...offer,
      queueStatus: getMarketOfferStatus(offer, state),
    }))
    .sort((a, b) => {
      const aOrder = OFFER_QUEUE_STATUS_ORDER[a.queueStatus?.key] ?? 0;
      const bOrder = OFFER_QUEUE_STATUS_ORDER[b.queueStatus?.key] ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.week ?? 0) - (a.week ?? 0);
    });
};

export const getOfferAcceptanceReadiness = (state = {}, offer = null) => {
  if (!offer) {
    return { ok: false, reason: 'Offre introuvable', tone: 'danger' };
  }

  const player = (state?.roster ?? []).find((item) => item.id === offer.playerId)
    ?? (state?.freeAgents ?? []).find((item) => item.id === offer.playerId)
    ?? null;

  if (!player) {
    return { ok: false, reason: 'Le joueur n\'est plus disponible dans la base', tone: 'danger' };
  }

  if (offer.status !== 'open') {
    const label = offer.status === 'accepted_pending' ? 'pré-accord déjà posé'
      : offer.status === 'accepted' ? 'déjà acceptée'
      : offer.status === 'completed' ? 'déjà appliquée'
      : offer.status === 'expired' ? 'expirée'
      : offer.status === 'rejected' ? 'refusée'
      : offer.status;
    return { ok: false, reason: `Offre ${label}`, tone: 'warn' };
  }

  const cooldownUntil = state?.negotiationCooldowns?.[offer.playerId] ?? 0;
  if (cooldownUntil > (state?.week ?? 0)) {
    return {
      ok: true,
      reason: `Dossier sous suivi jusqu'en S${cooldownUntil}, mais la signature de cette offre reste possible.`,
      tone: 'warn',
    };
  }

  if ((state?.pendingTransfers ?? []).some((transfer) => transfer.playerId === offer.playerId && transfer.offerId !== offer.id)) {
    return { ok: false, reason: 'Un autre transfert est déjà en attente', tone: 'warn' };
  }

  return {
    ok: true,
    reason: offer.preWindow
      ? `Pré-accord valide, activation prévue en S${offer.effectiveWeek}`
      : 'Offre valide et signable maintenant',
    tone: 'good',
  };
};
