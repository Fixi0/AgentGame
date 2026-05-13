// ─── SHOP SYSTEM ────────────────────────────────────────────────────────────
// Gemmes = premium currency earned via gameplay (objectives, milestones) or
// purchased with real money.  All items with type 'gem' cost gems.
// Items with type 'money' cost in-game euros.

export const GEM_PACKS = [
  { id: 'gems_starter', gems: 80,   label: 'Pack Starter',  price: '0,99 €', bonus: '' },
  { id: 'gems_player',  gems: 250,  label: 'Pack Joueur',   price: '2,49 €', bonus: '+20 offerts' },
  { id: 'gems_pro',     gems: 650,  label: 'Pack Pro',      price: '5,99 €', bonus: '+150 offerts' },
  { id: 'gems_elite',   gems: 1700, label: 'Pack Élite',    price: '12,99 €', bonus: '+300 offerts' },
  { id: 'gems_legend',  gems: 4500, label: 'Pack Légende',  price: '29,99 €', bonus: '+500 offerts' },
];

export const getGemPackById = (packId) => GEM_PACKS.find((pack) => pack.id === packId) ?? null;

export const NO_ADS_PRODUCT_ID = 'remove_ads';
export const AD_INTERSTITIAL_MIN_WEEKS = 2;
export const AD_INTERSTITIAL_MAX_WEEKS = 3;

export const PREMIUM_PRODUCTS = [
  {
    id: NO_ADS_PRODUCT_ID,
    label: 'Pack Sans Pubs',
    price: '5,99 €',
    desc: 'Retire les pubs automatiques. Les pubs récompensées restent optionnelles.',
    type: 'non_consumable',
  },
];

export const AD_REWARD_OFFERS = [
  {
    id: 'reward_gems_small',
    label: 'Spot sponsor',
    desc: 'Regarde une pub courte et gagne des gemmes.',
    rewardLabel: '+8 gemmes',
    maxPerDay: 3,
    reward: { gems: 8 },
  },
  {
    id: 'reward_cash_small',
    label: 'Prime partenaire',
    desc: 'Regarde une pub et récupère une petite enveloppe cash.',
    rewardLabel: '+5 000 €',
    maxPerDay: 3,
    reward: { money: 5000 },
  },
  {
    id: 'reward_market_refresh',
    label: 'Coup de fil réseau',
    desc: 'Regarde une pub et rafraîchis le marché gratuitement.',
    rewardLabel: 'Nouveau marché',
    maxPerDay: 1,
    reward: { action: 'refresh_market' },
  },
];

export const getPremiumProductById = (productId) =>
  PREMIUM_PRODUCTS.find((product) => product.id === productId) ?? null;

export const getAdRewardOfferById = (offerId) =>
  AD_REWARD_OFFERS.find((offer) => offer.id === offerId) ?? null;

// Shop catalog — items purchasable with gems or in-game money
// Rebalanced for stronger value-per-gem so players actually want to spend.
export const SHOP_ITEMS = [
  // ── Boosts financiers ───────────────────────────────────────────
  {
    id: 'cash_s',
    category: 'finances',
    label: 'Mallette Cash S',
    desc: '+12 000 € versés instantanément sur ton compte agence.',
    icon: '💰',
    cost: 120,
    currency: 'gems',
    effect: { money: 12000 },
    highlight: false,
  },
  {
    id: 'cash_m',
    category: 'finances',
    label: 'Mallette Cash M',
    desc: '+35 000 € pour boucler une signature ou un staff clé.',
    icon: '💰',
    cost: 320,
    currency: 'gems',
    effect: { money: 35000 },
    highlight: false,
  },
  {
    id: 'cash_l',
    category: 'finances',
    label: 'Coffre Cash L',
    desc: '+100 000 € — de quoi assurer un mercato ambitieux.',
    icon: '💰',
    cost: 850,
    currency: 'gems',
    effect: { money: 100000 },
    highlight: true,
  },
  {
    id: 'cash_xl',
    category: 'finances',
    label: 'Bunker Cash XL',
    desc: '+275 000 € — réserve de guerre pour les gros coups.',
    icon: '💎',
    cost: 2000,
    currency: 'gems',
    effect: { money: 275000 },
    highlight: false,
  },
  {
    id: 'cash_jackpot',
    category: 'finances',
    label: 'Jackpot Tycoon',
    desc: '+750 000 € directement en trésorerie. Le grand braquage.',
    icon: '🏦',
    cost: 4800,
    currency: 'gems',
    effect: { money: 750000 },
    highlight: true,
  },

  // ── Boosts d'équipe ─────────────────────────────────────────────
  {
    id: 'boost_income_7',
    category: 'boost',
    label: 'Boost Revenus x2 (7 sem.)',
    desc: 'Double TOUTES tes commissions pendant 7 semaines.',
    icon: '📈',
    cost: 280,
    currency: 'gems',
    effect: { incomeBoostWeeks: 7, incomeBoostMult: 2.0 },
    highlight: false,
  },
  {
    id: 'boost_income_20',
    category: 'boost',
    label: 'Boost Revenus x2,5 (20 sem.)',
    desc: 'x2,5 sur tes commissions toute une demi-saison.',
    icon: '🚀',
    cost: 750,
    currency: 'gems',
    effect: { incomeBoostWeeks: 20, incomeBoostMult: 2.5 },
    highlight: true,
  },
  {
    id: 'boost_income_season',
    category: 'boost',
    label: 'Saison Dorée x3',
    desc: 'Triple tes commissions pendant 38 semaines complètes.',
    icon: '👑',
    cost: 2200,
    currency: 'gems',
    effect: { incomeBoostWeeks: 38, incomeBoostMult: 3.0 },
    highlight: true,
  },
  {
    id: 'boost_reputation',
    category: 'boost',
    label: 'Coup de pub Réputation',
    desc: '+12 points de réputation immédiatement.',
    icon: '⭐',
    cost: 200,
    currency: 'gems',
    effect: { reputation: 12 },
    highlight: false,
  },
  {
    id: 'boost_reputation_mega',
    category: 'boost',
    label: 'Campagne Médias Mondiale',
    desc: '+40 points de réputation d\'un coup. Les caméras te suivent partout.',
    icon: '🌍',
    cost: 850,
    currency: 'gems',
    effect: { reputation: 40 },
    highlight: false,
  },

  // ── Scouts & marché ────────────────────────────────────────────
  {
    id: 'market_refresh',
    category: 'scouting',
    label: 'Actualiser le marché',
    desc: 'Régénère immédiatement la liste de joueurs disponibles.',
    icon: '🔄',
    cost: 1500,
    currency: 'money',
    effect: { action: 'refresh_market' },
    highlight: false,
  },
  {
    id: 'market_refresh_gems',
    category: 'scouting',
    label: 'Marché Express',
    desc: 'Nouveau marché immédiat sans dépenser ton cash agence.',
    icon: '⚡',
    cost: 90,
    currency: 'gems',
    effect: { action: 'refresh_market' },
    highlight: false,
  },
  {
    id: 'scout_reveal',
    category: 'scouting',
    label: 'Œil du Recruteur',
    desc: 'Révèle le potentiel réel de TOUS les joueurs actuellement sur le marché.',
    icon: '🔍',
    cost: 80,
    currency: 'gems',
    effect: { action: 'reveal_market_potential' },
    highlight: false,
  },
  {
    id: 'scout_elite',
    category: 'scouting',
    label: 'Marché Élite (3 sem.)',
    desc: 'Fait apparaître des joueurs de haut niveau pendant 3 semaines.',
    icon: '🌟',
    cost: 500,
    currency: 'gems',
    effect: { eliteMarketWeeks: 3 },
    highlight: false,
  },
  {
    id: 'scout_elite_long',
    category: 'scouting',
    label: 'Marché Élite Saison',
    desc: 'Pépites & cracks dans le marché pendant 10 semaines.',
    icon: '💫',
    cost: 1400,
    currency: 'gems',
    effect: { eliteMarketWeeks: 10 },
    highlight: true,
  },

  // ── Réseau & contacts ─────────────────────────────────────────
  {
    id: 'contact_cooldown_skip',
    category: 'contacts',
    label: 'Tournée Téléphonique',
    desc: 'Supprime tous les cooldowns de tes contacts.',
    icon: '📞',
    cost: 60,
    currency: 'gems',
    effect: { action: 'skip_contact_cooldowns' },
    highlight: false,
  },
  {
    id: 'contact_trust_boost',
    category: 'contacts',
    label: 'Soirée VIP Contacts',
    desc: '+20 de confiance sur TOUS tes contacts.',
    icon: '🤝',
    cost: 180,
    currency: 'gems',
    effect: { contactTrustBoost: 20 },
    highlight: false,
  },
  {
    id: 'contact_full_reset',
    category: 'contacts',
    label: 'Charme Diplomatique',
    desc: '+35 confiance sur tous les contacts ET cooldowns réinitialisés.',
    icon: '🥂',
    cost: 450,
    currency: 'gems',
    effect: { contactTrustBoost: 35, action: 'skip_contact_cooldowns' },
    highlight: true,
  },

  // ── Transferts ────────────────────────────────────────────────
  {
    id: 'mercato_express',
    category: 'transfer',
    label: 'Mercato Express',
    desc: 'Rafraîchit le marché ET active 4 semaines de joueurs élite immédiatement.',
    icon: '⚡',
    cost: 900,
    currency: 'gems',
    effect: { eliteMarketWeeks: 4, action: 'refresh_market' },
    highlight: true,
  },
  {
    id: 'nego_boost',
    category: 'transfer',
    label: 'Costume du Négociateur',
    desc: 'Commissions x1,5 sur tous tes deals pendant 8 semaines.',
    icon: '💼',
    cost: 270,
    currency: 'gems',
    effect: { incomeBoostWeeks: 8, incomeBoostMult: 1.5 },
    highlight: false,
  },
  {
    id: 'nego_boost_long',
    category: 'transfer',
    label: 'Saison du Loup de Wall Street',
    desc: 'Commissions x1,8 pendant 25 semaines + 25 000 € immédiats.',
    icon: '🐺',
    cost: 700,
    currency: 'gems',
    effect: { incomeBoostWeeks: 25, incomeBoostMult: 1.8, money: 25000 },
    highlight: true,
  },
];

export const SHOP_CATEGORIES = [
  { id: 'all',      label: 'Tout' },
  { id: 'finances', label: 'Finances' },
  { id: 'boost',    label: 'Boosts' },
  { id: 'scouting', label: 'Scouting' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'transfer', label: 'Transferts' },
];

export const DEFAULT_SHOP_STATS = {
  purchasesTotal: 0,
  gemsSpentTotal: 0,
  firstPurchaseDone: false,
  loyaltyCycleProgress: 0,
  loyaltyCycleTarget: 3,
  loyaltyRewardsClaimed: 0,
  lastPurchaseWeek: 0,
};

const dailyDateKey = (date = new Date()) => date.toLocaleDateString('sv-SE');

const getNextInterstitialWeek = (week = 1, viewsTotal = 0) => {
  const interval = AD_INTERSTITIAL_MIN_WEEKS + (Math.max(0, viewsTotal) % 2);
  return Math.max(1, Math.floor(week)) + Math.min(interval, AD_INTERSTITIAL_MAX_WEEKS);
};

const normalizeAdState = (state = {}) => {
  const current = state.ads ?? {};
  const today = dailyDateKey();
  const daily = current.daily?.dateKey === today
    ? current.daily
    : { dateKey: today, rewardCountByOfferId: {}, totalRewardedViews: 0 };

  const interstitialViewsTotal = current.interstitialViewsTotal ?? 0;
  const lastInterstitialWeek = current.lastInterstitialWeek ?? 0;

  return {
    removed: Boolean(current.removed),
    rewardedViewsTotal: current.rewardedViewsTotal ?? 0,
    interstitialViewsTotal,
    lastInterstitialWeek,
    nextInterstitialWeek: Number.isFinite(current.nextInterstitialWeek)
      ? current.nextInterstitialWeek
      : getNextInterstitialWeek(lastInterstitialWeek || 1, interstitialViewsTotal),
    daily: {
      dateKey: today,
      rewardCountByOfferId: daily.rewardCountByOfferId ?? {},
      totalRewardedViews: daily.totalRewardedViews ?? 0,
    },
    history: Array.isArray(current.history) ? current.history : [],
    lastIapTransactionId: current.lastIapTransactionId ?? null,
  };
};

const hashString = (value = '') => {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededSort = (items, seed) =>
  [...items].sort((a, b) => hashString(`${seed}:${a.id}`) - hashString(`${seed}:${b.id}`));

export const getShopRuntimeView = (state = {}) => {
  const shopStats = { ...DEFAULT_SHOP_STATS, ...(state.shopStats ?? {}) };
  const ads = normalizeAdState(state);
  const dateKey = dailyDateKey();
  const seed = `${dateKey}:${state.week ?? 1}:${state.reputation ?? 0}:${state.agencyLevel ?? 1}`;
  const gemItems = SHOP_ITEMS.filter((item) => item.currency === 'gems');
  const featuredItems = seededSort(gemItems, seed).slice(0, 3);
  const discountCurve = [25, 20, 15];
  const firstPurchaseBoost = !shopStats.firstPurchaseDone ? 35 : null;

  const featuredOffers = featuredItems.map((item, index) => {
    const discountPercent = index === 0 && firstPurchaseBoost ? firstPurchaseBoost : discountCurve[index] ?? 15;
    const price = Math.max(1, Math.round(item.cost * (1 - discountPercent / 100)));
    return {
      id: item.id,
      label: item.label,
      icon: item.icon,
      category: item.category,
      discountPercent,
      baseCost: item.cost,
      price,
    };
  });

  const priceByItemId = featuredOffers.reduce((map, offer) => ({ ...map, [offer.id]: offer.price }), {});
  const discountByItemId = featuredOffers.reduce((map, offer) => ({ ...map, [offer.id]: offer.discountPercent }), {});
  const loyaltyCycleTarget = Math.max(3, shopStats.loyaltyCycleTarget ?? 3);
  const loyaltyReward = { gems: 30, money: 12000 };

  return {
    dateKey,
    featuredOffers,
    priceByItemId,
    discountByItemId,
    loyalty: {
      progress: Math.max(0, shopStats.loyaltyCycleProgress ?? 0),
      target: loyaltyCycleTarget,
      reward: loyaltyReward,
      rewardsClaimed: shopStats.loyaltyRewardsClaimed ?? 0,
    },
    firstPurchaseBonusPending: !shopStats.firstPurchaseDone,
    ads: {
      removed: ads.removed,
      dailyRewardViews: ads.daily.totalRewardedViews,
      rewardedViewsTotal: ads.rewardedViewsTotal,
      interstitialViewsTotal: ads.interstitialViewsTotal,
      lastInterstitialWeek: ads.lastInterstitialWeek,
      nextInterstitialWeek: ads.nextInterstitialWeek,
      interstitialCadenceLabel: '2-3 semaines',
      canShowInterstitial: !ads.removed,
      rewardOffers: AD_REWARD_OFFERS.map((offer) => {
        const claimed = ads.daily.rewardCountByOfferId[offer.id] ?? 0;
        return {
          ...offer,
          claimed,
          remaining: Math.max(0, (offer.maxPerDay ?? 1) - claimed),
          available: claimed < (offer.maxPerDay ?? 1),
        };
      }),
    },
  };
};

/** Apply a purchased shop item to game state */
export const purchaseShopItem = (state, itemId) => {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { state, error: 'Article introuvable.' };
  const runtime = getShopRuntimeView(state);
  const adjustedCost = runtime.priceByItemId[item.id] ?? item.cost;
  const discountPercent = runtime.discountByItemId[item.id] ?? 0;

  // Check affordability
  if (item.currency === 'gems') {
    if ((state.gems ?? 0) < adjustedCost) return { state, error: `Pas assez de gemmes (${adjustedCost} requis).` };
  } else if (item.currency === 'money') {
    if (state.money < adjustedCost) return { state, error: `Fonds insuffisants (${adjustedCost} € requis).` };
  }

  let next = { ...state, shopStats: { ...DEFAULT_SHOP_STATS, ...(state.shopStats ?? {}) } };

  // Deduct cost
  if (item.currency === 'gems') next = { ...next, gems: (next.gems ?? 0) - adjustedCost };
  else next = { ...next, money: next.money - adjustedCost };

  // Apply effect
  const fx = item.effect;
  if (fx.money) next = { ...next, money: next.money + fx.money };
  if (fx.reputation) next = { ...next, reputation: Math.min(1000, next.reputation + fx.reputation) };
  if (fx.incomeBoostWeeks) {
    next = {
      ...next,
      incomeBoost: {
        mult: fx.incomeBoostMult ?? 1.5,
        untilWeek: next.week + fx.incomeBoostWeeks,
      },
    };
  }
  if (fx.eliteMarketWeeks) {
    next = { ...next, eliteMarketUntilWeek: next.week + fx.eliteMarketWeeks };
  }
  if (fx.negoBoostWeeks) {
    next = { ...next, negoBoostUntilWeek: next.week + fx.negoBoostWeeks };
  }
  if (fx.contactTrustBoost) {
    next = {
      ...next,
      contacts: (next.contacts ?? []).map((c) => ({
        ...c,
        trust: Math.min(100, (c.trust ?? 50) + fx.contactTrustBoost),
      })),
    };
  }
  if (fx.action === 'skip_contact_cooldowns') {
    next = {
      ...next,
      contacts: (next.contacts ?? []).map((c) => ({ ...c, cooldownWeek: 0 })),
    };
  }
  if (fx.action === 'mercato_express') {
    next = { ...next, mercatoExpressAvailable: true };
  }
  if (fx.action === 'refresh_market') {
    // Handled by caller (needs generateMarket)
    next = { ...next, _pendingMarketRefresh: true };
  }

  const shopStats = {
    ...next.shopStats,
    purchasesTotal: (next.shopStats?.purchasesTotal ?? 0) + 1,
    gemsSpentTotal: (next.shopStats?.gemsSpentTotal ?? 0) + (item.currency === 'gems' ? adjustedCost : 0),
    loyaltyCycleProgress: (next.shopStats?.loyaltyCycleProgress ?? 0) + (item.currency === 'gems' ? 1 : 0),
    lastPurchaseWeek: next.week ?? next.shopStats?.lastPurchaseWeek ?? 0,
  };

  let firstPurchaseBonus = 0;
  if (!shopStats.firstPurchaseDone) {
    firstPurchaseBonus = 12;
    shopStats.firstPurchaseDone = true;
  }

  let loyaltyReward = null;
  const loyaltyTarget = Math.max(3, shopStats.loyaltyCycleTarget ?? 3);
  if ((item.currency === 'gems') && (shopStats.loyaltyCycleProgress ?? 0) >= loyaltyTarget) {
    loyaltyReward = { gems: 30, money: 12000 };
    shopStats.loyaltyCycleProgress = 0;
    shopStats.loyaltyRewardsClaimed = (shopStats.loyaltyRewardsClaimed ?? 0) + 1;
  }

  next = {
    ...next,
    shopStats,
    gems: (next.gems ?? 0) + firstPurchaseBonus + (loyaltyReward?.gems ?? 0),
    money: (next.money ?? 0) + (loyaltyReward?.money ?? 0),
  };

  return {
    state: next,
    item,
    meta: {
      finalCost: adjustedCost,
      baseCost: item.cost,
      discountPercent,
      firstPurchaseBonus,
      loyaltyReward,
    },
  };
};

export const grantGemPackPurchase = (state, packId, transactionId = null) => {
  const pack = getGemPackById(packId);
  if (!pack) return { state, error: 'Pack de gemmes introuvable.' };

  const purchaseHistory = state.iapHistory ?? [];
  if (transactionId && purchaseHistory.some((purchase) => String(purchase.id) === String(transactionId))) {
    return { state, pack, skipped: true };
  }

  const nextShopStats = {
    ...DEFAULT_SHOP_STATS,
    ...(state.shopStats ?? {}),
    purchasesTotal: ((state.shopStats ?? {}).purchasesTotal ?? 0) + 1,
    lastPurchaseWeek: state.week ?? ((state.shopStats ?? {}).lastPurchaseWeek ?? 0),
    lastIapTransactionId: transactionId ?? ((state.shopStats ?? {}).lastIapTransactionId ?? null),
  };

  return {
    state: {
      ...state,
      gems: (state.gems ?? 0) + pack.gems,
      shopStats: nextShopStats,
      iapHistory: [
        {
          id: transactionId ?? `iap_${pack.id}_${Date.now()}`,
          packId: pack.id,
          gems: pack.gems,
          createdAt: Date.now(),
        },
        ...purchaseHistory,
      ].slice(0, 60),
    },
    pack,
  };
};

export const grantNoAdsPurchase = (state, productId = NO_ADS_PRODUCT_ID, transactionId = null) => {
  const product = getPremiumProductById(productId);
  if (!product) return { state, error: 'Produit premium introuvable.' };

  const purchaseHistory = state.iapHistory ?? [];
  if (transactionId && purchaseHistory.some((purchase) => String(purchase.id) === String(transactionId))) {
    return { state, product, skipped: true };
  }

  const ads = normalizeAdState(state);
  return {
    state: {
      ...state,
      ads: {
        ...ads,
        removed: true,
        lastIapTransactionId: transactionId ?? ads.lastIapTransactionId,
      },
      shopStats: {
        ...DEFAULT_SHOP_STATS,
        ...(state.shopStats ?? {}),
        purchasesTotal: ((state.shopStats ?? {}).purchasesTotal ?? 0) + 1,
        lastPurchaseWeek: state.week ?? ((state.shopStats ?? {}).lastPurchaseWeek ?? 0),
      },
      iapHistory: [
        {
          id: transactionId ?? `iap_${product.id}_${Date.now()}`,
          productId: product.id,
          type: product.type,
          createdAt: Date.now(),
        },
        ...purchaseHistory,
      ].slice(0, 60),
    },
    product,
  };
};

export const grantIapPurchase = (state, productId, transactionId = null) => {
  if (productId === NO_ADS_PRODUCT_ID) {
    return grantNoAdsPurchase(state, productId, transactionId);
  }
  return grantGemPackPurchase(state, productId, transactionId);
};

export const shouldShowInterstitialAd = (state = {}) => {
  const ads = normalizeAdState(state);
  if (ads.removed) return false;
  const week = Math.max(1, Number(state.week ?? 1));
  if (week < 3) return false;
  return week >= (ads.nextInterstitialWeek ?? getNextInterstitialWeek(week, ads.interstitialViewsTotal));
};

export const recordInterstitialAdView = (state = {}, placement = 'week_transition') => {
  const ads = normalizeAdState(state);
  if (ads.removed) return state;
  const week = Math.max(1, Number(state.week ?? 1));
  const interstitialViewsTotal = (ads.interstitialViewsTotal ?? 0) + 1;

  return {
    ...state,
    ads: {
      ...ads,
      interstitialViewsTotal,
      lastInterstitialWeek: week,
      nextInterstitialWeek: getNextInterstitialWeek(week, interstitialViewsTotal),
      history: [
        {
          id: `ad_interstitial_${Date.now()}`,
          type: 'interstitial',
          placement,
          week,
          createdAt: Date.now(),
        },
        ...ads.history,
      ].slice(0, 80),
    },
  };
};

export const grantAdReward = (state, offerId, placement = 'shop') => {
  const offer = getAdRewardOfferById(offerId);
  if (!offer) return { state, error: 'Récompense pub introuvable.' };

  const ads = normalizeAdState(state);
  const claimed = ads.daily.rewardCountByOfferId[offer.id] ?? 0;
  const maxPerDay = offer.maxPerDay ?? 1;
  if (claimed >= maxPerDay) {
    return { state, offer, error: 'Récompense déjà récupérée pour aujourd’hui.' };
  }

  const reward = offer.reward ?? {};
  let next = {
    ...state,
    ads: {
      ...ads,
      rewardedViewsTotal: (ads.rewardedViewsTotal ?? 0) + 1,
      daily: {
        ...ads.daily,
        totalRewardedViews: (ads.daily.totalRewardedViews ?? 0) + 1,
        rewardCountByOfferId: {
          ...(ads.daily.rewardCountByOfferId ?? {}),
          [offer.id]: claimed + 1,
        },
      },
      history: [
        {
          id: `ad_${offer.id}_${Date.now()}`,
          offerId: offer.id,
          placement,
          week: state.week ?? 1,
          createdAt: Date.now(),
        },
        ...ads.history,
      ].slice(0, 80),
    },
  };

  if (reward.gems) next = { ...next, gems: (next.gems ?? 0) + reward.gems };
  if (reward.money) next = { ...next, money: (next.money ?? 0) + reward.money };
  if (reward.reputation) next = { ...next, reputation: Math.min(1000, (next.reputation ?? 0) + reward.reputation) };
  if (reward.action === 'refresh_market') next = { ...next, _pendingMarketRefresh: true };

  return { state: next, offer };
};

/** Grant free gems from gameplay milestones */
export const awardGems = (state, amount, reason = '') => ({
  ...state,
  gems: (state.gems ?? 0) + amount,
  _gemAward: { amount, reason },
});

/** How many gems player gets at end of season based on objectives completed */
export const getSeasonGemReward = (objectivesCompleted) => {
  if (objectivesCompleted >= 3) return 15;
  if (objectivesCompleted >= 2) return 8;
  if (objectivesCompleted >= 1) return 3;
  return 0;
};
