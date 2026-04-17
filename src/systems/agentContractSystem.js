export const createAgentContract = (player) => ({
  weeksLeft: 104,
  commission: player.commission ?? 0.1,
  releaseClause: Math.max(15000, Math.floor(player.value * 0.18)),
  loyaltyBonus: Math.max(2000, Math.floor(player.value * 0.025)),
});

export const tickAgentContract = (contract) => ({
  ...contract,
  weeksLeft: Math.max(0, (contract?.weeksLeft ?? 104) - 1),
});
