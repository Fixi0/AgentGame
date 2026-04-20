export const buildProgressiveCosts = (base, multiplier, levels = 10) =>
  Array.from({ length: levels }, (_, index) => Math.round(base * (multiplier ** index)));

export const buildLevelCostMap = (base, multiplier, maxLevel = 10) =>
  Array.from({ length: Math.max(0, maxLevel - 1) }, (_, index) => Math.round(base * (multiplier ** index)))
    .reduce((map, cost, index) => ({ ...map, [index + 1]: cost }), {});

export const buildLevelValueMap = (base, multiplier, maxLevel = 10) =>
  Array.from({ length: maxLevel }, (_, index) => Math.round(base * (multiplier ** index)))
    .reduce((map, value, index) => ({ ...map, [index + 1]: value }), {});

export const OFFICE_UPGRADE_COSTS = {
  scoutLevel: buildProgressiveCosts(25000, 1.58, 10),
  lawyerLevel: buildProgressiveCosts(18000, 1.6, 10),
  mediaLevel: buildProgressiveCosts(22000, 1.57, 10),
};

export const OFFICE_UPGRADE_EFFECTS = {
  scoutLevel: [
    'Rapports plus lisibles',
    'Marché voisin plus solide',
    'Prospects plus jeunes',
    'Détection plus large',
    'Moins d’incertitude sur les rapports',
    'Entrées sur de nouveaux pays',
    'Cibles premium plus fréquentes',
    'Scouting d’élite en Europe',
    'Dossiers rares plus accessibles',
    'Réseau mondial de repérage',
  ],
  lawyerLevel: [
    'Négociations plus souples',
    'Prime mieux défendue',
    'Moins de refus au premier tour',
    'Clauses mieux verrouillées',
    'Rôle plus crédible',
    'Durées plus faciles à obtenir',
    'Pré-accords plus stables',
    'Transferts plus propres',
    'Pression contractuelle élevée',
    'Niveau négociation elite',
  ],
  mediaLevel: [
    'Petites crises mieux amorties',
    'Réponses médias plus calmes',
    'Rumeurs moins agressives',
    'Presse plus facile à contrôler',
    'Impact réputation réduit',
    'Retour au calme plus rapide',
    'Scandales plus rares',
    'Crises bien contenues',
    'Couverture médiatique favorable',
    'Machine de communication totale',
  ],
};

export const AGENCY_CAPACITY_BY_LEVEL = {
  1: 3,
  2: 5,
  3: 8,
  4: 12,
  5: 16,
  6: 21,
  7: 27,
  8: 34,
  9: 42,
  10: 50,
};

export const AGENCY_UPGRADE_COSTS = {
  1: 45000,
  2: 75000,
  3: 120000,
  4: 190000,
  5: 290000,
  6: 430000,
  7: 620000,
  8: 860000,
  9: 1150000,
};

// Fixed weekly agency running costs per level — creates meaningful spend pressure
// without being punishing. Scales so bigger agencies cost more to maintain.
export const WEEKLY_OVERHEAD = { 1: 300, 2: 650, 3: 1100, 4: 1700, 5: 2600 };

// Multiplier applied to ALL positive passive event money values (slower progression)
export const EVENT_INCOME_MULT = 0.6;

export const MARKET_REFRESH_COST = 2500;

export const calculateWeeklyPlayerEconomy = (player) => {
  // Salary cost: agency pays 5% of player salary in admin/management costs
  const salaryCost = Math.floor(player.weeklySalary * 0.05);

  // Commission: softened form/moral penalty so injured weeks do not wipe out
  // income entirely, while keeping the overall pace slower.
  const formFactor = player.injured > 0
    ? 0.3
    : Math.max(0.45, (player.form / 85) * (Math.max(40, player.moral ?? 50) / 85));
  const commissionIncome = Math.floor(player.weeklySalary * player.commission * formFactor);

  return { salaryCost, commissionIncome };
};
