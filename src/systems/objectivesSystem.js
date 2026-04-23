import { makeId, rand } from '../utils/helpers';
import { normalizeAgencyReputation } from './reputationSystem';

const OBJECTIVE_POOL = [
  'earn_money',
  'transfer_done',
  'sign_player',
  'reputation_gain',
  'keep_trust',
  'contract_signed',
  'develop_player',
];

const DAILY_OBJECTIVE_TYPES = {
  play_week: {
    label: 'Lancer la semaine',
    desc: 'Joue une semaine complète.',
    metric: 'week',
    target: () => 1,
    reward: { money: 4000, rep: 1, gems: 2 },
  },
  earn_money_day: {
    label: 'Cash du jour',
    desc: (target) => `Gagner ${Math.round(target / 1000)}k€ aujourd'hui.`,
    metric: 'totalEarned',
    target: (difficulty) => 14000 + difficulty * 9000,
    reward: { money: 7000, rep: 2, gems: 3 },
  },
  rep_push_day: {
    label: 'Image de marque',
    desc: (target) => `Prendre +${target} de réputation aujourd'hui.`,
    metric: 'reputation',
    target: (difficulty) => 10 + difficulty * 6,
    reward: { money: 5000, rep: 2, gems: 3 },
  },
  sign_player_day: {
    label: 'Nouveau mandat',
    desc: 'Signer 1 joueur aujourd\'hui.',
    metric: 'playersSigned',
    target: () => 1,
    reward: { money: 6000, rep: 2, gems: 4 },
  },
  transfer_day: {
    label: 'Dealmaker',
    desc: 'Finaliser 1 transfert aujourd\'hui.',
    metric: 'transfersDone',
    target: () => 1,
    reward: { money: 9000, rep: 3, gems: 5 },
  },
  shop_purchase_day: {
    label: 'Boost instantané',
    desc: 'Faire 1 achat en boutique aujourd\'hui.',
    metric: 'shopPurchases',
    target: () => 1,
    reward: { money: 8000, rep: 1, gems: 2 },
  },
  shop_spend_day: {
    label: 'Investissement agence',
    desc: (target) => `Dépenser ${target} gemmes en boutique aujourd\'hui.`,
    metric: 'shopGemsSpent',
    target: (difficulty) => 60 + difficulty * 30,
    reward: { money: 12000, rep: 2, gems: 4 },
  },
};

export const ACHIEVEMENT_CATEGORY_LABELS = {
  recruitment: 'Recrutement',
  transfers: 'Transferts',
  finance: 'Finances',
  reputation: 'Réputation',
  longevity: 'Longévité',
  premium: 'Boutique',
  prestige: 'Prestige',
};

export const ACHIEVEMENT_CATEGORY_ORDER = [
  'recruitment',
  'transfers',
  'finance',
  'reputation',
  'longevity',
  'premium',
  'prestige',
];

const moneyText = (value) => `${Math.round(value).toLocaleString('fr-FR')} €`;

const createAchievementSeries = ({
  category,
  prefix,
  metric,
  icon,
  title,
  thresholds,
  description,
  rewardBase,
}) => thresholds.map((target, index) => {
  const tier = index + 1;
  return {
    id: `${prefix}_${tier}`,
    category,
    icon,
    label: `${title} ${tier}`,
    desc: description(target, tier),
    metric,
    target,
    reward: {
      money: rewardBase.money + tier * rewardBase.moneyStep,
      rep: rewardBase.rep + Math.floor(tier / 2) * rewardBase.repStep,
      gems: rewardBase.gems + Math.floor(tier / 2) * rewardBase.gemsStep,
    },
  };
});

const ACHIEVEMENT_DEFS = [
  ...createAchievementSeries({
    category: 'recruitment',
    prefix: 'recruit',
    metric: 'playersSigned',
    icon: '🧩',
    title: 'Bâtisseur d’effectif',
    thresholds: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 35, 40],
    description: (target) => `Signer ${target} joueur${target > 1 ? 's' : ''} avec ton agence.`,
    rewardBase: { money: 4000, moneyStep: 1200, rep: 1, repStep: 1, gems: 4, gemsStep: 1 },
  }),
  ...createAchievementSeries({
    category: 'transfers',
    prefix: 'transfer',
    metric: 'transfersDone',
    icon: '🔁',
    title: 'Négociateur',
    thresholds: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 35, 40],
    description: (target) => `Finaliser ${target} transfert${target > 1 ? 's' : ''}.`,
    rewardBase: { money: 6000, moneyStep: 1500, rep: 1, repStep: 1, gems: 5, gemsStep: 1 },
  }),
  ...createAchievementSeries({
    category: 'finance',
    prefix: 'finance',
    metric: 'totalEarned',
    icon: '💸',
    title: 'Empire financier',
    thresholds: [25000, 50000, 90000, 130000, 180000, 250000, 330000, 430000, 550000, 700000, 900000, 1150000, 1450000, 1800000, 2200000, 2700000, 3300000, 4000000, 4800000, 6000000],
    description: (target) => `Cumuler ${moneyText(target)} de gains.`,
    rewardBase: { money: 7000, moneyStep: 2200, rep: 1, repStep: 1, gems: 5, gemsStep: 1 },
  }),
  ...createAchievementSeries({
    category: 'reputation',
    prefix: 'rep',
    metric: 'reputation',
    icon: '🛡️',
    title: 'Statut d’agent',
    thresholds: [25, 50, 75, 100, 130, 160, 200, 250, 320, 400, 500, 620, 750, 880, 1000],
    description: (target) => `Atteindre ${target} de réputation.`,
    rewardBase: { money: 9000, moneyStep: 2300, rep: 1, repStep: 1, gems: 6, gemsStep: 1 },
  }),
  ...createAchievementSeries({
    category: 'longevity',
    prefix: 'weeks',
    metric: 'weeksPlayed',
    icon: '📅',
    title: 'Régularité',
    thresholds: [4, 8, 12, 16, 20, 26, 32, 38, 50, 62, 76, 90, 110, 140, 180],
    description: (target) => `Jouer ${target} semaine${target > 1 ? 's' : ''}.`,
    rewardBase: { money: 5000, moneyStep: 1200, rep: 1, repStep: 1, gems: 4, gemsStep: 1 },
  }),
  ...createAchievementSeries({
    category: 'longevity',
    prefix: 'seasons',
    metric: 'seasonsPlayed',
    icon: '🏟️',
    title: 'Dynastie',
    thresholds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    description: (target) => `Terminer ${target} saison${target > 1 ? 's' : ''}.`,
    rewardBase: { money: 16000, moneyStep: 4500, rep: 2, repStep: 1, gems: 10, gemsStep: 2 },
  }),
  ...createAchievementSeries({
    category: 'premium',
    prefix: 'shop_buy',
    metric: 'shopPurchases',
    icon: '🛒',
    title: 'Client premium',
    thresholds: [1, 2, 3, 4, 5, 7, 9, 12, 16, 20],
    description: (target) => `Effectuer ${target} achat${target > 1 ? 's' : ''} boutique.`,
    rewardBase: { money: 4500, moneyStep: 1200, rep: 1, repStep: 1, gems: 4, gemsStep: 1 },
  }),
  ...createAchievementSeries({
    category: 'premium',
    prefix: 'shop_spend',
    metric: 'shopGemsSpent',
    icon: '💎',
    title: 'Investisseur premium',
    thresholds: [80, 150, 250, 350, 500, 700, 900, 1200, 1600, 2200],
    description: (target) => `Dépenser ${target.toLocaleString('fr-FR')} gemmes.`,
    rewardBase: { money: 6000, moneyStep: 1800, rep: 1, repStep: 1, gems: 5, gemsStep: 1 },
  }),
  ...createAchievementSeries({
    category: 'prestige',
    prefix: 'hybrid',
    metric: 'playersSigned',
    icon: '👑',
    title: 'Collection prestige',
    thresholds: [6, 8, 10, 12, 14, 16, 18, 20, 24, 28],
    description: (target) => `Gérer un portefeuille d’au moins ${target} signatures cumulées.`,
    rewardBase: { money: 12000, moneyStep: 2800, rep: 2, repStep: 1, gems: 8, gemsStep: 2 },
  }),
];

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENT_DEFS.length;

const DEFAULT_SHOP_STATS = {
  purchasesTotal: 0,
  gemsSpentTotal: 0,
  firstPurchaseDone: false,
  loyaltyCycleProgress: 0,
  loyaltyCycleTarget: 3,
  loyaltyRewardsClaimed: 0,
  lastPurchaseWeek: 0,
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const localDateKey = (date = new Date()) => date.toLocaleDateString('sv-SE');

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
  [...items].sort((a, b) => {
    const scoreA = hashString(`${seed}:${a}`);
    const scoreB = hashString(`${seed}:${b}`);
    return scoreA - scoreB;
  });

const shallowEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const clampRep = (value) => Math.max(0, Math.min(1000, value));

const getProgressCounters = (state = {}) => ({
  week: state.week ?? 1,
  weeksPlayed: Math.max(0, (state.week ?? 1) - 1),
  reputation: state.reputation ?? 0,
  totalEarned: state.stats?.totalEarned ?? 0,
  transfersDone: state.stats?.transfersDone ?? 0,
  playersSigned: state.stats?.playersSigned ?? 0,
  seasonsPlayed: state.stats?.seasonsPlayed ?? 0,
  shopPurchases: state.shopStats?.purchasesTotal ?? 0,
  shopGemsSpent: state.shopStats?.gemsSpentTotal ?? 0,
});

const getMetricDelta = (counters, baseline, metric) => {
  const currentValue = counters?.[metric] ?? 0;
  const baselineValue = baseline?.[metric] ?? 0;
  return Math.max(0, currentValue - baselineValue);
};

const buildDailyObjective = (type, state, index = 0, dateKey = localDateKey()) => {
  const definition = DAILY_OBJECTIVE_TYPES[type];
  if (!definition) return null;
  const rep = normalizeAgencyReputation(state.reputation ?? 20);
  const difficulty = Math.max(1, Math.min(3, Math.ceil(rep / 35)));
  const target = Math.max(1, Math.round(definition.target(difficulty, state)));
  const desc = typeof definition.desc === 'function' ? definition.desc(target, state) : definition.desc;
  return {
    id: `daily_${dateKey}_${type}_${index}`,
    type,
    label: definition.label,
    desc,
    metric: definition.metric,
    target,
    current: 0,
    completed: false,
    claimed: false,
    reward: definition.reward,
    dateKey,
    completedAtWeek: null,
  };
};

const generateDailyObjectives = (state = {}, dateKey = localDateKey()) => {
  const seed = `${dateKey}:${state.week ?? 1}:${state.reputation ?? 20}:${state.agencyLevel ?? 1}`;
  const corePool = ['earn_money_day', 'rep_push_day', 'sign_player_day', 'transfer_day'];
  const shopPool = ['shop_purchase_day', 'shop_spend_day'];
  const shuffledCore = seededSort(corePool, `${seed}:core`);
  const shuffledShop = seededSort(shopPool, `${seed}:shop`);
  const includeShop = (state.week ?? 1) >= 3 && (state.gems ?? 0) >= 20;

  const selected = ['play_week', shuffledCore[0], includeShop ? shuffledShop[0] : shuffledCore[1]];
  return selected
    .map((type, index) => buildDailyObjective(type, state, index, dateKey))
    .filter(Boolean);
};

const buildDefaultAchievementRows = () =>
  ACHIEVEMENT_DEFS.map((def) => ({
    id: def.id,
    category: def.category,
    icon: def.icon,
    label: def.label,
    desc: def.desc,
    metric: def.metric,
    target: def.target,
    current: 0,
    unlocked: false,
    unlockedAtWeek: null,
    reward: def.reward,
  }));

const mergeAchievements = (existing = []) => {
  const byId = safeArray(existing).reduce((acc, row) => ({ ...acc, [row.id]: row }), {});
  return ACHIEVEMENT_DEFS.map((def) => ({
    id: def.id,
    category: def.category,
    icon: def.icon,
    label: def.label,
    desc: def.desc,
    metric: def.metric,
    target: def.target,
    reward: def.reward,
    current: byId[def.id]?.current ?? 0,
    unlocked: Boolean(byId[def.id]?.unlocked),
    unlockedAtWeek: byId[def.id]?.unlockedAtWeek ?? null,
  }));
};

export function syncProgressionSystems(state = {}) {
  let nextState = state;
  let changed = false;
  const summary = {
    rewards: { money: 0, rep: 0, gems: 0 },
    dailyCompleted: [],
    achievementsUnlocked: [],
  };

  const safeShopStats = { ...DEFAULT_SHOP_STATS, ...(state.shopStats ?? {}) };
  if (!shallowEqual(safeShopStats, state.shopStats ?? {})) {
    nextState = { ...nextState, shopStats: safeShopStats };
    changed = true;
  }

  const dateKey = localDateKey();
  const counters = getProgressCounters({ ...nextState, shopStats: safeShopStats });
  const needsDailyReset =
    !safeArray(nextState.dailyObjectives).length
    || !nextState.dailyObjectiveBaseline
    || nextState.dailyObjectiveDateKey !== dateKey;

  let dailyObjectives = safeArray(nextState.dailyObjectives);
  let dailyBaseline = nextState.dailyObjectiveBaseline;

  if (needsDailyReset) {
    dailyObjectives = generateDailyObjectives(nextState, dateKey);
    dailyBaseline = counters;
    changed = true;
  }

  const progressedDaily = dailyObjectives.map((objective) => {
    const current = getMetricDelta(counters, dailyBaseline, objective.metric);
    const completed = current >= (objective.target ?? 1);
    const alreadyClaimed = Boolean(objective.claimed);
    let claimed = alreadyClaimed;
    let completedAtWeek = objective.completedAtWeek ?? null;

    if (completed && !alreadyClaimed) {
      claimed = true;
      completedAtWeek = nextState.week ?? 1;
      summary.rewards.money += objective.reward?.money ?? 0;
      summary.rewards.rep += objective.reward?.rep ?? 0;
      summary.rewards.gems += objective.reward?.gems ?? 0;
      summary.dailyCompleted.push(objective.label);
    }

    return {
      ...objective,
      current,
      completed,
      claimed,
      completedAtWeek,
    };
  });

  if (!shallowEqual(progressedDaily, dailyObjectives)) changed = true;

  const currentAchievements = mergeAchievements(nextState.achievements ?? buildDefaultAchievementRows());
  const progressedAchievements = currentAchievements.map((achievement) => {
    const value = counters?.[achievement.metric] ?? 0;
    const wasUnlocked = Boolean(achievement.unlocked);
    const unlocked = wasUnlocked || value >= achievement.target;
    const current = unlocked ? achievement.target : Math.min(value, achievement.target);
    let unlockedAtWeek = achievement.unlockedAtWeek ?? null;

    if (unlocked && !wasUnlocked) {
      unlockedAtWeek = nextState.week ?? 1;
      summary.rewards.money += achievement.reward?.money ?? 0;
      summary.rewards.rep += achievement.reward?.rep ?? 0;
      summary.rewards.gems += achievement.reward?.gems ?? 0;
      summary.achievementsUnlocked.push(achievement.label);
    }

    return {
      ...achievement,
      current,
      unlocked,
      unlockedAtWeek,
    };
  });

  if (!shallowEqual(progressedAchievements, currentAchievements)) changed = true;

  if (summary.rewards.money || summary.rewards.rep || summary.rewards.gems) {
    changed = true;
    nextState = {
      ...nextState,
      money: (nextState.money ?? 0) + summary.rewards.money,
      reputation: clampRep((nextState.reputation ?? 0) + summary.rewards.rep),
      gems: (nextState.gems ?? 0) + summary.rewards.gems,
    };
  }

  if (changed) {
    nextState = {
      ...nextState,
      shopStats: safeShopStats,
      dailyObjectives: progressedDaily,
      dailyObjectiveDateKey: dateKey,
      dailyObjectiveBaseline: dailyBaseline,
      achievements: progressedAchievements,
    };
  }

  return { state: nextState, changed, summary };
}

function buildObjective(type, season, expiresWeek, rep) {
  const repScore = normalizeAgencyReputation(rep);
  const difficulty = Math.max(1, Math.min(3, Math.ceil(repScore / 35)));
  const base = {
    id: makeId('obj'),
    type,
    current: 0,
    completed: false,
    failed: false,
    season,
    expiresWeek,
  };

  switch (type) {
    case 'earn_money': {
      const target = rand(50000, 200000) * difficulty / 2;
      return { ...base, label: 'Gagner de l\'argent', desc: `Encaisser ${(target / 1000).toFixed(0)}k€ cette saison.`, target, reward: { money: 15000, rep: 3, gems: 4 } };
    }
    case 'transfer_done': {
      const target = difficulty >= 2 ? 2 : 1;
      return { ...base, label: 'Boucler des transferts', desc: `Réaliser ${target} transfert(s) cette saison.`, target, reward: { money: 20000, rep: 5, gems: 6 } };
    }
    case 'sign_player': {
      const target = difficulty >= 2 ? 2 : 1;
      return { ...base, label: 'Signer un joueur libre', desc: `Recruter ${target} joueur(s) du marché des libres.`, target, reward: { money: 10000, rep: 3, gems: 4 } };
    }
    case 'reputation_gain': {
      const target = rand(4, 6) * difficulty * 10;
      return { ...base, label: 'Gagner en réputation', desc: `Gagner +${target} points de réputation cette saison.`, target, reward: { money: 8000, rep: 6, gems: 5 } };
    }
    case 'keep_trust': {
      return { ...base, label: 'Maintenir la confiance', desc: 'Terminer la saison avec tous les joueurs au-dessus de 50 de confiance.', target: 1, reward: { money: 12000, rep: 4, gems: 5 } };
    }
    case 'contract_signed': {
      const target = difficulty >= 2 ? 3 : 2;
      return { ...base, label: 'Extensions de contrats', desc: `Signer ${target} prolongations de contrat.`, target, reward: { money: 15000, rep: 4, gems: 6 } };
    }
    case 'develop_player': {
      return { ...base, label: 'Développer un joueur', desc: 'Faire progresser la note d\'un joueur de +2 au minimum.', target: 2, reward: { money: 10000, rep: 5, gems: 6 } };
    }
    default:
      return null;
  }
}

export function generateSeasonObjectives(state = {}) {
  const week = state.week ?? 1;
  const season = Math.ceil(week / 38);
  const expiresWeek = season * 38;
  const rep = state.reputation ?? 300;

  const shuffled = [...OBJECTIVE_POOL].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, 3);

  return chosen.map((type) => buildObjective(type, season, expiresWeek, rep));
}

export function updateObjectiveProgress(objectives, event) {
  return objectives.map((obj) => {
    if (obj.completed || obj.failed) return obj;

    const eventTypeMap = {
      transfer_done: 'transfer_done',
      sign_player: 'sign_player',
      contract_signed: 'contract_signed',
      reputation_gain: 'reputation_gain',
      earn_money: 'earn_money',
    };

    if (eventTypeMap[event.type] !== obj.type) return obj;

    const delta = event.amount ?? event.delta ?? 1;
    const updated = { ...obj, current: obj.current + delta };
    return updated;
  });
}

export function checkObjectiveCompletion(objectives) {
  const rewards = { money: 0, rep: 0, gems: 0 };
  const completed = [];

  const updated = objectives.map((obj) => {
    if (obj.completed || obj.failed) return obj;
    if (obj.current >= obj.target) {
      rewards.money += obj.reward.money;
      rewards.rep += obj.reward.rep;
      rewards.gems += obj.reward.gems ?? 0;
      completed.push(obj.id);
      return { ...obj, completed: true };
    }
    return obj;
  });

  return { objectives: updated, completed, rewards };
}

export function getObjectivesReward(objectives) {
  return objectives
    .filter((o) => o.completed)
    .reduce((acc, o) => ({
      money: acc.money + o.reward.money,
      rep: acc.rep + o.reward.rep,
      gems: acc.gems + (o.reward.gems ?? 0),
    }), { money: 0, rep: 0, gems: 0 });
}
