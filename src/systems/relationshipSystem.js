import { PERSONALITY_PROFILES } from '../data/players';
import { clamp } from '../utils/helpers';

export const getInitialTrust = (personality) => clamp(62 + (PERSONALITY_PROFILES[personality]?.trustStart ?? 0), 0, 100);

export const applyRelationshipEffects = (player, effects = {}) => ({
  ...player,
  moral: effects.moral ? clamp(player.moral + effects.moral) : player.moral,
  trust: effects.trust ? clamp((player.trust ?? 50) + effects.trust) : player.trust ?? 50,
});

export const getDepartureRisk = (player) => {
  const signedWeek = player.agencySignedWeek ?? player.relationshipStartedWeek ?? player.contractStartWeek ?? 0;
  const currentWeek = player.currentWeek ?? signedWeek;
  const weeksInAgency = Math.max(0, currentWeek - signedWeek);
  const gracePeriod = weeksInAgency < 12;

  const moralRisk = player.moral < 18 ? 0.1 : player.moral < 30 ? 0.05 : player.moral < 40 ? 0.02 : 0;
  const trustRisk = player.trust < 18 ? 0.12 : player.trust < 30 ? 0.06 : player.trust < 45 ? 0.02 : 0;
  const personalityRisk = ['instable', 'mercenaire'].includes(player.personality) ? 0.02 : 0;
  const activeTransferRisk = (player.careerStatus === 'en discussion' || player.careerStatus === 'transféré') ? 0.03 : 0;
  const roleRisk = ['Indésirable', 'rotation forcée'].includes(player.clubRole) ? 0.025 : 0;
  const gracePenalty = gracePeriod ? 0.08 : 0;
  const risk = Math.min(0.3, Math.max(0, moralRisk + trustRisk + personalityRisk + activeTransferRisk + roleRisk - gracePenalty));

  return {
    risk,
    reason:
      moralRisk >= 0.22 ? 'moral au plus bas'
      : trustRisk >= 0.25 ? 'confiance cassée'
        : activeTransferRisk > 0 ? 'dossier de départ déjà ouvert'
          : roleRisk > 0 ? 'rôle trop fragile'
            : personalityRisk > 0 ? 'personnalité volatile'
              : 'aucune alerte majeure',
  };
};

export const getNegotiationModifier = (player) => {
  const trustModifier = Math.floor(((player.trust ?? 50) - 50) / 8);
  const personalityModifier = PERSONALITY_PROFILES[player.personality]?.negotiationBias ?? 0;

  return trustModifier + personalityModifier;
};
