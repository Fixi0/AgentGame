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

// Shop catalog — items purchasable with gems or in-game money
export const SHOP_ITEMS = [
  // ── Boosts financiers ───────────────────────────────────────────
  {
    id: 'cash_s',
    category: 'finances',
    label: 'Injection Argent S',
    desc: '+8 000 € dans ta trésorerie.',
    icon: '💰',
    cost: 60,
    currency: 'gems',
    effect: { money: 8000 },
    highlight: false,
  },
  {
    id: 'cash_m',
    category: 'finances',
    label: 'Injection Argent M',
    desc: '+25 000 € dans ta trésorerie.',
    icon: '💰',
    cost: 160,
    currency: 'gems',
    effect: { money: 25000 },
    highlight: false,
  },
  {
    id: 'cash_l',
    category: 'finances',
    label: 'Injection Argent L',
    desc: '+65 000 € dans ta trésorerie.',
    icon: '💰',
    cost: 380,
    currency: 'gems',
    effect: { money: 65000 },
    highlight: true,
  },
  {
    id: 'cash_xl',
    category: 'finances',
    label: 'Injection Argent XL',
    desc: '+150 000 € dans ta trésorerie.',
    icon: '💰',
    cost: 800,
    currency: 'gems',
    effect: { money: 150000 },
    highlight: false,
  },

  // ── Boosts d'équipe ─────────────────────────────────────────────
  {
    id: 'boost_income_7',
    category: 'boost',
    label: 'Boost Revenus x1,5',
    desc: 'Multiplie tes commissions par 1,5 pendant 7 semaines.',
    icon: '📈',
    cost: 120,
    currency: 'gems',
    effect: { incomeBoostWeeks: 7, incomeBoostMult: 1.5 },
    highlight: false,
  },
  {
    id: 'boost_income_20',
    category: 'boost',
    label: 'Boost Revenus x2',
    desc: 'Double tes commissions pendant 20 semaines.',
    icon: '🚀',
    cost: 280,
    currency: 'gems',
    effect: { incomeBoostWeeks: 20, incomeBoostMult: 2.0 },
    highlight: true,
  },
  {
    id: 'boost_reputation',
    category: 'boost',
    label: 'Boost Réputation +8',
    desc: '+8 points de réputation immédiatement.',
    icon: '⭐',
    cost: 90,
    currency: 'gems',
    effect: { reputation: 8 },
    highlight: false,
  },

  // ── Scouts & marché ────────────────────────────────────────────
  {
    id: 'market_refresh',
    category: 'scouting',
    label: 'Actualiser le marché',
    desc: 'Génère un nouveau marché de joueurs.',
    icon: '🔄',
    cost: 1500,
    currency: 'money',
    effect: { action: 'refresh_market' },
    highlight: false,
  },
  {
    id: 'scout_reveal',
    category: 'scouting',
    label: 'Révélation Potentiel',
    desc: 'Révèle le vrai potentiel d\'un joueur sur le marché.',
    icon: '🔍',
    cost: 40,
    currency: 'gems',
    effect: { action: 'reveal_potential' },
    highlight: false,
  },
  {
    id: 'scout_elite',
    category: 'scouting',
    label: 'Marché Élite (2 sem.)',
    desc: 'Fait apparaître des joueurs de haut niveau pendant 2 semaines.',
    icon: '🌟',
    cost: 200,
    currency: 'gems',
    effect: { eliteMarketWeeks: 2 },
    highlight: false,
  },

  // ── Réseau & contacts ─────────────────────────────────────────
  {
    id: 'contact_cooldown_skip',
    category: 'contacts',
    label: 'Réinitialiser Cooldown',
    desc: 'Supprime le cooldown de tous tes contacts.',
    icon: '📞',
    cost: 25,
    currency: 'gems',
    effect: { action: 'skip_contact_cooldowns' },
    highlight: false,
  },
  {
    id: 'contact_trust_boost',
    category: 'contacts',
    label: 'Boost Relation Contacts',
    desc: '+15 de confiance sur tous tes contacts.',
    icon: '🤝',
    cost: 70,
    currency: 'gems',
    effect: { contactTrustBoost: 15 },
    highlight: false,
  },

  // ── Transferts ────────────────────────────────────────────────
  {
    id: 'mercato_express',
    category: 'transfer',
    label: 'Mercato Express',
    desc: 'Autorise 1 transfert hors fenêtre mercato.',
    icon: '⚡',
    cost: 350,
    currency: 'gems',
    effect: { action: 'mercato_express' },
    highlight: true,
  },
  {
    id: 'nego_boost',
    category: 'transfer',
    label: 'Boost Négociation',
    desc: 'Améliore tes chances en négociation pendant 5 semaines.',
    icon: '💼',
    cost: 110,
    currency: 'gems',
    effect: { negoBoostWeeks: 5 },
    highlight: false,
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
