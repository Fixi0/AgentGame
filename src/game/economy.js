export const OFFICE_UPGRADE_COSTS = {
  scoutLevel:   [25000, 70000, 180000, 360000, 650000],
  lawyerLevel:  [18000, 55000, 140000, 290000, 520000],
  mediaLevel:   [22000, 65000, 160000, 320000, 580000],
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
