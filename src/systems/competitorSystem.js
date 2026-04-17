import { makeId, pick } from '../utils/helpers';

const COMPETITOR_AGENTS = ['Riva Sports', 'Crown Agents', 'Nova Eleven', 'Prime Talent', 'Atlas Football'];

export const rollCompetitorThreat = ({ roster, week }) => {
  const candidates = roster.filter((player) => (player.trust ?? 50) < 45 || player.agentContract?.weeksLeft <= 16);
  if (!candidates.length || Math.random() > 0.18) return null;
  const player = pick(candidates);

  return {
    id: makeId('threat'),
    week,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    agentName: pick(COMPETITOR_AGENTS),
    severity: (player.trust ?? 50) < 30 ? 'élevée' : 'moyenne',
  };
};
