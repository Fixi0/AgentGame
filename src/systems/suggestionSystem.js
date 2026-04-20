import { normalizeAgencyReputation } from './reputationSystem';
import { getEuropeanCompetition } from './europeanCupSystem';

export const getStrategicSuggestions = (state) => {
  const suggestions = [];
  const currentSeason = Math.floor(((state.week ?? 1) - 1) / 38) + 1;
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
  if (normalizeAgencyReputation(state.reputation) >= 25 && state.office.scoutLevel < 1) suggestions.push('Améliorer les scouts pour profiter des nouveaux marchés débloqués.');
  if (state.segmentReputation?.media < 35) suggestions.push('Recruter un community manager pour limiter les crises publiques.');
  if (unresolvedPromises.length) suggestions.push(`${unresolvedPromises.length} promesse(s) active(s) : surveille les échéances avant qu'elles explosent.`);
  if (state.money > 120000 && state.agencyLevel < 3) suggestions.push("Agrandir l'agence avant de rafraîchir le marché en boucle.");
  if (state.worldCupState && state.worldCupState.phase !== 'done') {
    suggestions.push("Suivre la Coupe du Monde de près: une grosse perf peut faire décoller la valeur et les offres.");
  }
  if ((state.roster ?? []).some((player) => getEuropeanCompetition(player, currentSeason))) {
    suggestions.push('Exploiter les coupes européennes: un grand match en Europe change le poids d’un dossier.');
  }
  if ((state.roster ?? []).some((player) => player.countryCode && ['FR', 'ES', 'EN', 'DE', 'IT', 'PT'].includes(player.countryCode)) && (state.worldCupState?.phase === 'groupes')) {
    suggestions.push('Préparer les sélectionnés avant la CdM: la pression et la fatigue peuvent basculer un dossier.');
  }

  return suggestions.slice(0, 4);
};
