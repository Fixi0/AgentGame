import { makeId, pick } from '../utils/helpers';
import { getDossierHeat } from './coherenceSystem';

const COMPETITOR_AGENTS = ['Riva Sports', 'Crown Agents', 'Nova Eleven', 'Prime Talent', 'Atlas Football'];

export const rollCompetitorThreat = ({ roster, week, dossierMemory = null }) => {
  const candidates = roster
    .map((player) => {
      const heat = dossierMemory ? getDossierHeat(dossierMemory, player.id) : 50;
      const fragility = (100 - (player.trust ?? 50)) + (100 - (player.moral ?? 50)) + heat + ((player.agentContract?.weeksLeft ?? 99) <= 16 ? 12 : 0);
      return { player, fragility };
    })
    .filter(({ player, fragility }) => fragility >= 105 || (player.trust ?? 50) < 45 || player.agentContract?.weeksLeft <= 16)
    .sort((a, b) => b.fragility - a.fragility);
  if (!candidates.length || Math.random() > 0.18) return null;
  const player = candidates[0].player;

  return {
    id: makeId('threat'),
    week,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    agentName: pick(COMPETITOR_AGENTS),
    severity: (player.trust ?? 50) < 30 ? 'élevée' : 'moyenne',
  };
};
