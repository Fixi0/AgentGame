export const STAFF_ROLES = {
  scoutAfrica: {
    label: 'Scout international',
    desc: 'Améliore la qualité du marché et accélère le déblocage Brésil/Argentine.',
    cost: 35000,
    weeklyCost: 900,
    maxLevel: 10,
    effects: [
      'Plus de rapports',
      'Marché plus propre',
      'Prospects plus jeunes',
      'Plus de pays débloqués',
      'Rapports plus fiables',
      'Découvertes plus fortes',
      'Cibles premium plus souvent',
      'Réseau international solide',
      'Accès aux gros marchés',
      'Scouting d’élite total',
    ],
  },
  dataAnalyst: {
    label: 'Analyste data',
    desc: 'Réduit les mauvais recrutements et augmente la progression des jeunes.',
    cost: 28000,
    weeklyCost: 700,
    maxLevel: 10,
    effects: [
      'Moins d’erreurs',
      'Jeunes mieux suivis',
      'Lecture plus claire',
      'Fit recrutement amélioré',
      'Moins de faux positifs',
      'Meilleure projection',
      'Progression plus crédible',
      'Analyse avancée',
      'Dossiers mieux ciblés',
      'Data d’élite',
    ],
  },
  communityManager: {
    label: 'Community manager',
    desc: 'Améliore les news positives et amortit les scandales.',
    cost: 24000,
    weeklyCost: 650,
    maxLevel: 10,
    effects: [
      'Presse un peu plus douce',
      'Crises moins bruyantes',
      'News positives fréquentes',
      'Gestion des rumeurs',
      'Réactions plus nettes',
      'Scandales amortis',
      'Image mieux protégée',
      'Réseau média solide',
      'Narration favorable',
      'Communication d’élite',
    ],
  },
  playerCare: {
    label: 'Player care',
    desc: 'Protège le moral et la confiance lors des semaines difficiles.',
    cost: 30000,
    weeklyCost: 800,
    maxLevel: 10,
    effects: [
      'Réactions plus calmes',
      'Moral mieux protégé',
      'Moins de frustration',
      'Moins de chute de confiance',
      'Retour au calme plus rapide',
      'Groupes plus stables',
      'Contenir les tensions',
      'Fin de crise plus facile',
      'Confiance durable',
      'Protection maximale',
    ],
  },
};

export const createDefaultStaff = () =>
  Object.keys(STAFF_ROLES).reduce((staff, key) => ({ ...staff, [key]: 0 }), {});

export const getStaffWeeklyCost = (staff = createDefaultStaff()) =>
  Object.entries(staff).reduce((sum, [key, level]) => sum + (STAFF_ROLES[key]?.weeklyCost ?? 0) * level, 0);

export const getStaffEffect = (staff = createDefaultStaff(), key) => staff[key] ?? 0;

export const getStaffLevelEffect = (key, level = 0) => STAFF_ROLES[key]?.effects?.[Math.max(0, level - 1)] ?? 'Niveau maximum';

export const upgradeStaff = (state, key) => {
  const role = STAFF_ROLES[key];
  if (!role) return { state, error: 'Rôle inconnu' };

  const currentLevel = state.staff?.[key] ?? 0;
  if (currentLevel >= role.maxLevel) return { state, error: 'Niveau maximum' };

  const cost = Math.floor(role.cost * Math.pow(currentLevel + 1, 1.28) * 1.15);
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
