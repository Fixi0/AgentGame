export const OFFICE_UPGRADE_COSTS = {
  scoutLevel: [25000, 70000, 180000],
  lawyerLevel: [18000, 55000, 140000],
  mediaLevel: [22000, 65000, 160000],
};

export const MARKET_REFRESH_COST = 5000;

export const calculateWeeklyPlayerEconomy = (player) => {
  const salaryCost = Math.floor(player.weeklySalary * 0.05);
  const commissionIncome =
    player.injured === 0
      ? Math.floor(player.weeklySalary * player.commission * (player.form / 75) * (player.moral / 75))
      : 0;

  return { salaryCost, commissionIncome };
};
