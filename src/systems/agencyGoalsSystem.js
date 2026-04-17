export const createLongTermAgencyGoals = () => [
  { id: 'fr_top', label: 'Top agent France', target: 65, metric: 'FR', reward: 120000 },
  { id: 'eu_top', label: 'Top agent Europe', target: 55, metric: 'EU', reward: 250000 },
  { id: 'world_top', label: 'Agence mondiale', target: 75, metric: 'GLOBAL', reward: 500000 },
];

export const getAgencyGoalProgress = (goal, state) => {
  if (goal.metric === 'FR') return state.leagueReputation?.FR ?? 0;
  if (goal.metric === 'EU') {
    const reps = ['FR', 'ES', 'GB', 'DE', 'IT'].map((code) => state.leagueReputation?.[code] ?? 0);
    return Math.round(reps.reduce((sum, value) => sum + value, 0) / reps.length);
  }
  return state.reputation ?? 0;
};
