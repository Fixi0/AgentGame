export const getStrategicSuggestions = (state) => {
  const suggestions = [];
  const averageTrust = state.roster.length
    ? Math.round(state.roster.reduce((sum, player) => sum + (player.trust ?? 50), 0) / state.roster.length)
    : 0;
  const averageMoral = state.roster.length
    ? Math.round(state.roster.reduce((sum, player) => sum + player.moral, 0) / state.roster.length)
    : 0;
  const unresolvedPromises = (state.promises ?? []).filter((promise) => !promise.resolved && !promise.failed);

  if (state.roster.length < 2) suggestions.push('Signer au moins deux profils pour sécuriser les revenus hebdomadaires.');
  if (averageTrust && averageTrust < 50) suggestions.push('Investir dans le player care ou répondre avec empathie aux messages sensibles.');
  if (averageMoral && averageMoral < 50) suggestions.push('Éviter les décisions fermes tant que le moral moyen est bas.');
  if (state.reputation >= 25 && state.office.scoutLevel < 1) suggestions.push('Améliorer les scouts pour profiter des nouveaux marchés débloqués.');
  if (state.segmentReputation?.media < 35) suggestions.push('Recruter un community manager pour limiter les crises publiques.');
  if (unresolvedPromises.length) suggestions.push(`${unresolvedPromises.length} promesse(s) active(s) : surveille les échéances avant qu'elles explosent.`);
  if (state.money > 120000 && state.agencyLevel < 3) suggestions.push("Agrandir l'agence avant de rafraîchir le marché en boucle.");

  return suggestions.slice(0, 4);
};
