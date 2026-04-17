export const AGENCY_CAPACITY_BY_LEVEL = {
  1: 3,
  2: 5,
  3: 8,
  4: 12,
  5: 16,
};

export const AGENCY_UPGRADE_COSTS = {
  1: 45000,
  2: 90000,
  3: 180000,
  4: 320000,
};

export const getAgencyCapacity = (agencyLevel = 1) => AGENCY_CAPACITY_BY_LEVEL[agencyLevel] ?? 3;

export const getAgencyUpgradeCost = (agencyLevel = 1) => AGENCY_UPGRADE_COSTS[agencyLevel] ?? null;

export const canUpgradeAgency = (state) => {
  const cost = getAgencyUpgradeCost(state.agencyLevel);
  return Boolean(cost && state.money >= cost);
};
