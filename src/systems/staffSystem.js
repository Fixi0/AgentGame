export const STAFF_ROLES = {
  scoutAfrica: {
    label: 'Scout international',
    desc: 'Améliore la qualité du marché et accélère le déblocage Brésil/Argentine.',
    cost: 35000,
    weeklyCost: 900,
    maxLevel: 3,
  },
  dataAnalyst: {
    label: 'Analyste data',
    desc: 'Réduit les mauvais recrutements et augmente la progression des jeunes.',
    cost: 28000,
    weeklyCost: 700,
    maxLevel: 3,
  },
  communityManager: {
    label: 'Community manager',
    desc: 'Améliore les news positives et amortit les scandales.',
    cost: 24000,
    weeklyCost: 650,
    maxLevel: 3,
  },
  playerCare: {
    label: 'Player care',
    desc: 'Protège le moral et la confiance lors des semaines difficiles.',
    cost: 30000,
    weeklyCost: 800,
    maxLevel: 3,
  },
};

export const createDefaultStaff = () =>
  Object.keys(STAFF_ROLES).reduce((staff, key) => ({ ...staff, [key]: 0 }), {});

export const getStaffWeeklyCost = (staff = createDefaultStaff()) =>
  Object.entries(staff).reduce((sum, [key, level]) => sum + (STAFF_ROLES[key]?.weeklyCost ?? 0) * level, 0);

export const getStaffEffect = (staff = createDefaultStaff(), key) => staff[key] ?? 0;

export const upgradeStaff = (state, key) => {
  const role = STAFF_ROLES[key];
  if (!role) return { state, error: 'Rôle inconnu' };

  const currentLevel = state.staff?.[key] ?? 0;
  if (currentLevel >= role.maxLevel) return { state, error: 'Niveau maximum' };

  const cost = Math.floor(role.cost * (currentLevel + 1) * 1.25);
  if (state.money < cost) return { state, error: 'Fonds insuffisants' };

  return {
    state: {
      ...state,
      money: state.money - cost,
      staff: {
        ...state.staff,
        [key]: currentLevel + 1,
      },
    },
  };
};
