import { clamp } from '../utils/helpers';

export const createDefaultWorldMemory = () => ({
  weeklyArchive: [],
  rivalries: {},
  clubMomentum: {},
});

const rivalryKey = (a = '', b = '') => [a, b].sort().join('::');

const updateRivalry = (rivalries = {}, home = '', away = '', delta = 0, week = 1) => {
  if (!home || !away || home === away) return rivalries;
  const key = rivalryKey(home, away);
  const current = rivalries[key] ?? { clubs: [home, away].sort(), heat: 20, meetings: 0, lastWeek: 0 };
  return {
    ...rivalries,
    [key]: {
      ...current,
      heat: clamp((current.heat ?? 20) + delta, 0, 100),
      meetings: (current.meetings ?? 0) + 1,
      lastWeek: week,
    },
  };
};

export const updateWorldMemoryWeek = ({
  memory = createDefaultWorldMemory(),
  week = 1,
  fixtures = [],
  worldSummary = [],
  transferOffers = [],
} = {}) => {
  let rivalries = { ...(memory.rivalries ?? {}) };
  const momentum = { ...(memory.clubMomentum ?? {}) };
  const rivalryHighlights = [];

  (fixtures ?? []).forEach((fx) => {
    const home = fx?.homeClub?.name;
    const away = fx?.awayClub?.name;
    if (!home || !away) return;
    const gd = Math.abs((fx.homeGoals ?? 0) - (fx.awayGoals ?? 0));
    const upset = gd >= 2 ? 6 : gd === 1 ? 4 : 2;
    rivalries = updateRivalry(rivalries, home, away, upset, week);
    momentum[home] = clamp((momentum[home] ?? 50) + ((fx.homeGoals ?? 0) > (fx.awayGoals ?? 0) ? 4 : (fx.homeGoals ?? 0) < (fx.awayGoals ?? 0) ? -3 : 0), 0, 100);
    momentum[away] = clamp((momentum[away] ?? 50) + ((fx.awayGoals ?? 0) > (fx.homeGoals ?? 0) ? 4 : (fx.awayGoals ?? 0) < (fx.homeGoals ?? 0) ? -3 : 0), 0, 100);
  });

  const hotRivalries = Object.values(rivalries)
    .filter((r) => (r.heat ?? 0) >= 55)
    .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))
    .slice(0, 2);
  hotRivalries.forEach((r) => {
    rivalryHighlights.push({
      title: `${r.clubs[0]} vs ${r.clubs[1]}`,
      text: `Rivalité en hausse (${r.heat}/100) après ${r.meetings} confrontations tendues.`,
      heat: r.heat,
    });
  });

  const archiveEntry = {
    week,
    summary: (worldSummary ?? []).map((item) => item?.title).filter(Boolean).slice(0, 3),
    offers: (transferOffers ?? []).length,
    hotRivalries: rivalryHighlights.map((r) => r.title),
  };

  return {
    memory: {
      weeklyArchive: [archiveEntry, ...((memory.weeklyArchive ?? []))].slice(0, 760),
      rivalries,
      clubMomentum: momentum,
    },
    rivalryHighlights,
  };
};
