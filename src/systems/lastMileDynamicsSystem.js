import { clamp, makeId, pick } from '../utils/helpers';
import { createManualNewsPost } from './newsSystem';

export const createDefaultLongTermDynamics = () => ({
  pressureIndex: 45,
  narrativeArcs: [],
  rivalFocus: {},
  legacyScore: 0,
});

const derivePressureFromState = (state = {}, roster = []) => {
  const credibility = state.credibility ?? 50;
  const rep = state.reputation ?? 200;
  const avgTrust = roster.length ? roster.reduce((s, p) => s + (p.trust ?? 50), 0) / roster.length : 50;
  const openCrises = (state.messages ?? []).filter((m) => !m.resolved && ['complaint', 'media_pressure', 'transfer_request'].includes(m.type)).length;
  return clamp(Math.round(55 - credibility * 0.35 - rep * 0.02 - avgTrust * 0.25 + openCrises * 2.6), 5, 95);
};

const nextArc = ({ week, pressure, state }) => {
  const existing = state.longTermDynamics?.narrativeArcs ?? [];
  if (existing.some((arc) => (week - (arc.week ?? week)) < 4)) return null;
  if (Math.random() > 0.22) return null;
  const pool = pressure >= 60
    ? [
      { id: 'agency_crack', title: 'Fragilité interne', tone: 'danger', repDelta: -3, credDelta: -2 },
      { id: 'rival_poach_cycle', title: 'Rivaux offensifs', tone: 'danger', repDelta: -2, credDelta: -1 },
    ]
    : [
      { id: 'golden_generation', title: 'Génération dorée', tone: 'good', repDelta: 4, credDelta: 1 },
      { id: 'boardroom_trust', title: 'Confiance des clubs', tone: 'good', repDelta: 2, credDelta: 2 },
    ];
  const chosen = pick(pool);
  return { ...chosen, week, activeWeeks: 6 };
};

export const applyLastMileDynamics = ({ state = {}, roster = [], week = 1 } = {}) => {
  const base = state.longTermDynamics ?? createDefaultLongTermDynamics();
  const pressure = derivePressureFromState(state, roster);
  const arcs = (base.narrativeArcs ?? [])
    .filter((arc) => (week - (arc.week ?? week)) <= (arc.activeWeeks ?? 6))
    .map((arc) => ({ ...arc, remainingWeeks: Math.max(0, (arc.activeWeeks ?? 6) - (week - (arc.week ?? week))) }));
  const createdArc = nextArc({ week, pressure, state });
  const nextArcs = createdArc ? [createdArc, ...arcs].slice(0, 12) : arcs.slice(0, 12);

  const activeRepSwing = nextArcs.reduce((sum, arc) => sum + (arc.repDelta ?? 0), 0);
  const activeCredSwing = nextArcs.reduce((sum, arc) => sum + (arc.credDelta ?? 0), 0);
  const legacyScore = clamp((base.legacyScore ?? 0) + Math.round(activeRepSwing * 0.6) + (pressure < 40 ? 2 : pressure > 70 ? -2 : 0), -500, 1500);

  const news = createdArc
    ? [createManualNewsPost({
      type: createdArc.tone === 'danger' ? 'scandale' : 'media',
      week,
      text: createdArc.tone === 'danger'
        ? `Arc mondial: ${createdArc.title}. Les observateurs doutent de la stabilité de ton agence.`
        : `Arc mondial: ${createdArc.title}. Le marché perçoit ton agence comme un projet durable.`,
      reputationImpact: createdArc.repDelta ?? 0,
      account: { name: 'World Football Wire', kind: 'journal', icon: 'WF', color: '#172026' },
    })]
    : [];

  const events = createdArc
    ? [{
      id: makeId('arc'),
      week,
      label: createdArc.title,
      good: createdArc.tone !== 'danger',
      rep: createdArc.repDelta ?? 0,
    }]
    : [];

  return {
    patch: {
      longTermDynamics: {
        pressureIndex: pressure,
        narrativeArcs: nextArcs,
        rivalFocus: base.rivalFocus ?? {},
        legacyScore,
      },
      credibilityDelta: activeCredSwing,
      reputationDelta: activeRepSwing,
      offerAttractivenessMult: clamp(1 + activeRepSwing / 40 - pressure / 300, 0.7, 1.35),
      developmentMult: clamp(1 + activeCredSwing / 30 - pressure / 400, 0.75, 1.3),
    },
    news,
    events,
  };
};

