import { makeId, pick, rand } from '../utils/helpers';
import { normalizeAgencyReputation } from './reputationSystem';

const OBJECTIVE_POOL = [
  'earn_money',
  'transfer_done',
  'sign_player',
  'reputation_gain',
  'keep_trust',
  'contract_signed',
  'develop_player',
];

function buildObjective(type, season, expiresWeek, rep) {
  const repScore = normalizeAgencyReputation(rep);
  const difficulty = Math.max(1, Math.min(3, Math.ceil(repScore / 35)));
  const base = {
    id: makeId('obj'),
    type,
    current: 0,
    completed: false,
    failed: false,
    season,
    expiresWeek,
  };

  switch (type) {
    case 'earn_money': {
      const target = rand(50000, 200000) * difficulty / 2;
      return { ...base, label: 'Gagner de l\'argent', desc: `Encaisser ${(target / 1000).toFixed(0)}k€ cette saison.`, target, reward: { money: 15000, rep: 3, gems: 4 } };
    }
    case 'transfer_done': {
      const target = difficulty >= 2 ? 2 : 1;
      return { ...base, label: 'Boucler des transferts', desc: `Réaliser ${target} transfert(s) cette saison.`, target, reward: { money: 20000, rep: 5, gems: 6 } };
    }
    case 'sign_player': {
      const target = difficulty >= 2 ? 2 : 1;
      return { ...base, label: 'Signer un joueur libre', desc: `Recruter ${target} joueur(s) du marché des libres.`, target, reward: { money: 10000, rep: 3, gems: 4 } };
    }
    case 'reputation_gain': {
      const target = rand(4, 6) * difficulty * 10;
      return { ...base, label: 'Gagner en réputation', desc: `Gagner +${target} points de réputation cette saison.`, target, reward: { money: 8000, rep: 6, gems: 5 } };
    }
    case 'keep_trust': {
      return { ...base, label: 'Maintenir la confiance', desc: 'Terminer la saison avec tous les joueurs au-dessus de 50 de confiance.', target: 1, reward: { money: 12000, rep: 4, gems: 5 } };
    }
    case 'contract_signed': {
      const target = difficulty >= 2 ? 3 : 2;
      return { ...base, label: 'Extensions de contrats', desc: `Signer ${target} prolongations de contrat.`, target, reward: { money: 15000, rep: 4, gems: 6 } };
    }
    case 'develop_player': {
      return { ...base, label: 'Développer un joueur', desc: 'Faire progresser la note d\'un joueur de +2 au minimum.', target: 2, reward: { money: 10000, rep: 5, gems: 6 } };
    }
    default:
      return null;
  }
}

export function generateSeasonObjectives(state) {
  const season = Math.ceil(state.week / 38);
  const expiresWeek = season * 38;
  const rep = state.reputation ?? 300;

  const shuffled = [...OBJECTIVE_POOL].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, 3);

  return chosen.map((type) => buildObjective(type, season, expiresWeek, rep));
}

export function updateObjectiveProgress(objectives, event) {
  return objectives.map((obj) => {
    if (obj.completed || obj.failed) return obj;

    const eventTypeMap = {
      transfer_done: 'transfer_done',
      sign_player: 'sign_player',
      contract_signed: 'contract_signed',
      reputation_gain: 'reputation_gain',
      earn_money: 'earn_money',
    };

    if (eventTypeMap[event.type] !== obj.type) return obj;

    const delta = event.amount ?? event.delta ?? 1;
    const updated = { ...obj, current: obj.current + delta };
    return updated;
  });
}

export function checkObjectiveCompletion(objectives) {
  const rewards = { money: 0, rep: 0, gems: 0 };
  const completed = [];

  const updated = objectives.map((obj) => {
    if (obj.completed || obj.failed) return obj;
    if (obj.current >= obj.target) {
      rewards.money += obj.reward.money;
      rewards.rep += obj.reward.rep;
      rewards.gems += obj.reward.gems ?? 0;
      completed.push(obj.id);
      return { ...obj, completed: true };
    }
    return obj;
  });

  return { objectives: updated, completed, rewards };
}

export function getObjectivesReward(objectives) {
  return objectives
    .filter((o) => o.completed)
    .reduce((acc, o) => ({
      money: acc.money + o.reward.money,
      rep: acc.rep + o.reward.rep,
      gems: acc.gems + (o.reward.gems ?? 0),
    }), { money: 0, rep: 0, gems: 0 });
}
