import { PERSONALITY_PROFILES } from '../data/players';
import { clamp } from '../utils/helpers';

export const getInitialTrust = (personality) => clamp(62 + (PERSONALITY_PROFILES[personality]?.trustStart ?? 0), 0, 100);

export const applyRelationshipEffects = (player, effects = {}) => ({
  ...player,
  moral: effects.moral ? clamp(player.moral + effects.moral) : player.moral,
  trust: effects.trust ? clamp((player.trust ?? 50) + effects.trust) : player.trust ?? 50,
});

export const getDepartureRisk = (player) => {
  const moralRisk = player.moral < 25 ? 0.22 : player.moral < 40 ? 0.08 : 0;
  const trustRisk = player.trust < 25 ? 0.25 : player.trust < 45 ? 0.08 : 0;
  const personalityRisk = ['instable', 'mercenaire'].includes(player.personality) ? 0.08 : 0;
  const activeTransferRisk = (player.careerStatus === 'en discussion' || player.careerStatus === 'transféré') ? 0.06 : 0;
  const roleRisk = ['Indésirable', 'rotation forcée'].includes(player.clubRole) ? 0.06 : 0;
  const risk = Math.min(0.65, moralRisk + trustRisk + personalityRisk + activeTransferRisk + roleRisk);

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
