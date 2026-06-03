import { makeId, clamp, pick } from '../utils/helpers';
import { createMessage } from './messageSystem';
import { createManualNewsPost } from './newsSystem';
import { computeWeeklySponsorIncome } from './sponsorSystem';

const personaLevel = (state = {}) => {
  const credibility = state.credibility ?? 50;
  const mediaAvg = Object.values(state.mediaRelations ?? {}).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(state.mediaRelations ?? {}).length);
  return clamp(Math.round((credibility * 0.6) + (mediaAvg * 0.4)), 0, 100);
};

export const applyEgoAndPsychologyWeek = (roster = [], week = 1) => {
  const events = [];
  const updatedRoster = roster.map((player) => {
    const currentEgo = Number(player.ego ?? 45);
    const minutes = Number(player.lastMatchMinutes ?? player.lastMinutes ?? 0);
    const form = Number(player.form ?? 60);
    const role = String(player.clubRole ?? '');

    const rolePressure = role === 'Indésirable' ? 4 : role === 'Rotation' ? 2 : 0;
    const minutesPressure = minutes < 25 ? 3 : minutes >= 70 ? -2 : 0;
    const formBoost = form >= 78 ? 2 : form <= 48 ? -2 : 0;
    const egoDelta = rolePressure + minutesPressure + formBoost;
    const nextEgo = clamp(currentEgo + egoDelta, 0, 100);

    const moraleDelta = nextEgo >= 78 && minutes < 35 ? -4 : nextEgo <= 30 && minutes >= 60 ? 2 : 0;
    if (Math.abs(moraleDelta) > 0) {
      events.push({
        id: makeId('ego'),
        week,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        label: moraleDelta < 0 ? 'Ego frustré' : 'Ego canalisé',
        good: moraleDelta > 0,
        rep: 0,
      });
    }
    return {
      ...player,
      ego: nextEgo,
      moral: clamp((player.moral ?? 50) + moraleDelta, 0, 100),
    };
  });

  return { roster: updatedRoster, events };
};

export const applyRivalAgentsPressureWeek = ({
  state = {},
  roster = [],
  week = 1,
} = {}) => {
  const rivalAgents = Array.isArray(state.rivalAgents) ? [...state.rivalAgents] : [];
  const messages = [];
  const events = [];
  let nextRoster = [...roster];

  rivalAgents.forEach((agent, idx) => {
    const heat = agent.heat ?? 20;
    const risk = agent.risk ?? 0.12;
    const triggerChance = Math.min(0.55, risk + heat / 180);
    if (Math.random() > triggerChance) return;
    const target = pick(nextRoster.filter((p) => (p.trust ?? 50) <= 62 || (p.moral ?? 50) <= 58));
    if (!target) return;

    nextRoster = nextRoster.map((p) => p.id === target.id
      ? {
        ...p,
        trust: clamp((p.trust ?? 50) - 4, 0, 100),
        moral: clamp((p.moral ?? 50) - 2, 0, 100),
      }
      : p);

    messages.push(createMessage({ player: target, type: 'complaint', week, context: 'rival_agent_push' }));
    events.push({
      id: makeId('rival'),
      week,
      playerId: target.id,
      playerName: `${target.firstName} ${target.lastName}`,
      label: `${agent.name} pousse son dossier`,
      good: false,
      rep: -1,
    });
    rivalAgents[idx] = { ...agent, heat: clamp(heat + 6, 0, 100), lastMoveWeek: week };
  });

  return { roster: nextRoster, rivalAgents, messages, events };
};

export const computePersonaSponsorIncome = (state = {}, roster = []) => {
  const base = computeWeeklySponsorIncome(state);
  if (base <= 0) return { income: 0, bonus: 0, persona: personaLevel(state) };
  const persona = personaLevel(state);
  const avgBrand = roster.length
    ? roster.reduce((sum, p) => sum + (p.brandValue ?? 15), 0) / roster.length
    : 12;
  const avgPublicRep = roster.length
    ? roster.reduce((sum, p) => sum + (p.publicRep?.score ?? 50), 0) / roster.length
    : 50;
  const bonusMult = 1 + clamp(((persona - 50) / 140) + ((avgBrand - 20) / 220) + ((avgPublicRep - 50) / 220), -0.1, 0.45);
  const income = Math.round(base * bonusMult);
  return { income, bonus: income - base, persona };
};

export const generateViralSocialBursts = ({
  roster = [],
  topMatch = null,
  flopMatch = null,
  week = 1,
} = {}) => {
  const posts = [];
  if (topMatch?.matchRating >= 8.5) {
    const player = roster.find((p) => p.id === topMatch.playerId);
    if (player) {
      posts.push({
        ...createManualNewsPost({
          type: 'fans',
          player,
          week,
          text: `${player.firstName} ${player.lastName} devient viral après une perf énorme (${topMatch.matchRating.toFixed(1)}).`,
          reputationImpact: 7,
          account: { name: 'Foot Social Club', kind: 'media', icon: 'FS', color: '#00a676' },
        }),
        trend: 'viral',
      });
    }
  }
  if (flopMatch?.matchRating <= 5.2) {
    const player = roster.find((p) => p.id === flopMatch.playerId);
    if (player) {
      posts.push({
        ...createManualNewsPost({
          type: 'scandale',
          player,
          week,
          text: `Bad buzz autour de ${player.firstName} ${player.lastName} après une note de ${flopMatch.matchRating.toFixed(1)}.`,
          reputationImpact: -6,
          account: { name: 'Tabloid Sport', kind: 'journal', icon: 'TS', color: '#b42318' },
        }),
        trend: 'viral',
      });
    }
  }
  return posts;
};

