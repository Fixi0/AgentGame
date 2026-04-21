const valueOf = (player, key, fallback = 10) => {
  const value = player?.attributes?.[key]?.current;
  return Number.isFinite(value) ? value : fallback;
};

const avg = (values = []) => {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 10;
};

const score = (value) => Math.round(Math.max(0, Math.min(100, (value / 20) * 100)));

const topKeys = (player, keys = [], count = 3, direction = 'desc') =>
  [...keys]
    .map((key) => ({ key, value: valueOf(player, key) }))
    .sort((a, b) => direction === 'desc' ? b.value - a.value : a.value - b.value)
    .slice(0, count);

const ATTRIBUTE_LABELS = {
  pace: 'vitesse',
  shooting: 'finition',
  passing: 'passe',
  dribbling: 'dribble',
  defense: 'defense',
  positioning: 'placement',
  awareness: 'lecture',
  decisionMaking: 'decision',
  consistency: 'constance',
  leadership: 'leadership',
  determination: 'mental',
  strength: 'puissance',
  stamina: 'endurance',
  agility: 'agilite',
  balance: 'equilibre',
  handling: 'main sure',
  distribution: 'relance',
};

const ROLE_DEFINITIONS = [
  {
    id: 'complete_forward',
    positions: ['ATT'],
    label: 'Buteur complet',
    style: 'Finisseur fiable',
    weights: { shooting: 0.35, positioning: 0.22, decisionMaking: 0.16, pace: 0.12, strength: 0.08, consistency: 0.07 },
    advice: 'Le mettre dans un club qui cree beaucoup d occasions et lui promettre un role offensif clair.',
  },
  {
    id: 'explosive_forward',
    positions: ['ATT'],
    label: 'Attaquant explosif',
    style: 'Profondeur et percussion',
    weights: { pace: 0.26, dribbling: 0.24, shooting: 0.20, agility: 0.16, decisionMaking: 0.08, consistency: 0.06 },
    advice: 'Chercher un club de transition rapide. Attention si la decision et la constance sont faibles.',
  },
  {
    id: 'creative_ten',
    positions: ['MIL', 'ATT'],
    label: 'Createur technique',
    style: 'Passe, dribble, derniere decision',
    weights: { passing: 0.28, dribbling: 0.22, decisionMaking: 0.20, awareness: 0.14, agility: 0.08, consistency: 0.08 },
    advice: 'L entourer avec un coach joueur et du temps de jeu. Eviter un club trop direct.',
  },
  {
    id: 'engine_midfielder',
    positions: ['MIL'],
    label: 'Milieu moteur',
    style: 'Volume, pressing, equilibre',
    weights: { stamina: 0.24, passing: 0.18, defense: 0.16, positioning: 0.16, determination: 0.14, consistency: 0.12 },
    advice: 'Profil ideal pour progresser dans un club stable avec beaucoup de minutes.',
  },
  {
    id: 'defensive_leader',
    positions: ['DEF', 'MIL'],
    label: 'Leader defensif',
    style: 'Placement, duels, securite',
    weights: { defense: 0.30, positioning: 0.22, strength: 0.16, awareness: 0.14, leadership: 0.10, consistency: 0.08 },
    advice: 'Valoriser la fiabilite et le role dans le vestiaire pendant les negociations.',
  },
  {
    id: 'modern_fullback',
    positions: ['DEF'],
    label: 'Lateral moderne',
    style: 'Couloir, endurance, centres',
    weights: { pace: 0.20, stamina: 0.20, passing: 0.18, defense: 0.16, dribbling: 0.14, decisionMaking: 0.12 },
    advice: 'Chercher un club qui utilise les couloirs. Le role est aussi important que le salaire.',
  },
  {
    id: 'modern_keeper',
    positions: ['GK'],
    label: 'Gardien moderne',
    style: 'Arrets et relance',
    weights: { handling: 0.34, positioning: 0.20, decisionMaking: 0.16, distribution: 0.14, consistency: 0.10, leadership: 0.06 },
    advice: 'Negocier un cadre de confiance. Les erreurs de gardien coutent cher mentalement.',
  },
  {
    id: 'raw_prospect',
    positions: ['GK', 'DEF', 'MIL', 'ATT'],
    label: 'Talent brut',
    style: 'Potentiel fort, lecture incomplete',
    weights: { pace: 0.18, dribbling: 0.16, determination: 0.16, agility: 0.14, stamina: 0.12, decisionMaking: 0.08, consistency: 0.08, awareness: 0.08 },
    advice: 'Ne pas le griller trop vite. Priorite au temps de jeu, au mental et a un club patient.',
  },
];

const weightedScore = (player, weights = {}) => {
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  const raw = entries.reduce((sum, [key, weight]) => sum + valueOf(player, key) * weight, 0) / totalWeight;
  return score(raw);
};

const getBestArchetype = (player) => {
  const candidates = ROLE_DEFINITIONS
    .filter((role) => role.positions.includes(player?.position ?? 'MIL'))
    .map((role) => ({
      ...role,
      score: weightedScore(player, role.weights),
    }))
    .sort((a, b) => b.score - a.score);
  return candidates[0] ?? ROLE_DEFINITIONS[ROLE_DEFINITIONS.length - 1];
};

export const getPlayerProfileSummary = (player = {}) => {
  const position = player.position ?? 'MIL';
  const archetype = getBestArchetype(player);
  const technical = score(avg([valueOf(player, 'shooting'), valueOf(player, 'passing'), valueOf(player, 'dribbling'), valueOf(player, 'defense')]));
  const mental = score(avg([valueOf(player, 'positioning'), valueOf(player, 'awareness'), valueOf(player, 'decisionMaking'), valueOf(player, 'consistency'), valueOf(player, 'determination')]));
  const physical = score(avg([valueOf(player, 'pace'), valueOf(player, 'strength'), valueOf(player, 'stamina'), valueOf(player, 'agility'), valueOf(player, 'balance')]));
  const goalkeeper = position === 'GK' ? score(avg([valueOf(player, 'handling'), valueOf(player, 'distribution')])) : null;
  const pressure = Math.round(avg([
    valueOf(player, 'consistency'),
    valueOf(player, 'decisionMaking'),
    valueOf(player, 'determination'),
    (player.pressureTolerance ?? 55) / 5,
  ]) * 5);
  const reliability = Math.round(avg([
    valueOf(player, 'consistency'),
    valueOf(player, 'stamina'),
    valueOf(player, 'decisionMaking'),
    Math.max(1, 20 - ((player.fatigue ?? 20) / 5)),
  ]) * 5);
  const injuryRisk = Math.max(0, Math.min(100, Math.round(
    52
    - valueOf(player, 'stamina') * 1.15
    - valueOf(player, 'strength') * 0.55
    + (player.fatigue ?? 20) * 0.35
    + (player.recurringInjuryRisk ?? 8) * 1.4,
  )));
  const developmentNeed = player.age <= 22 && (player.potential ?? player.rating ?? 60) > (player.rating ?? 60) + 8
    ? 'temps de jeu et cadre patient'
    : reliability < 52
      ? 'regularite et hygiene de saison'
      : mental < 55
        ? 'accompagnement mental'
        : 'plan de progression normal';
  const profileTags = [
    archetype.label,
    pressure >= 70 ? 'pression ok' : pressure <= 45 ? 'pression fragile' : 'pression moyenne',
    injuryRisk >= 62 ? 'risque physique' : reliability >= 70 ? 'fiable' : 'a encadrer',
  ];
  const allKeys = position === 'GK'
    ? ['handling', 'distribution', 'positioning', 'decisionMaking', 'consistency', 'leadership', 'stamina', 'strength']
    : ['pace', 'shooting', 'passing', 'dribbling', 'defense', 'positioning', 'awareness', 'decisionMaking', 'consistency', 'leadership', 'determination', 'strength', 'stamina', 'agility', 'balance'];
  const strengths = topKeys(player, allKeys, 3).map(({ key }) => ATTRIBUTE_LABELS[key] ?? key);
  const weaknesses = topKeys(player, allKeys, 2, 'asc').map(({ key }) => ATTRIBUTE_LABELS[key] ?? key);

  return {
    id: archetype.id,
    label: archetype.label,
    style: archetype.style,
    score: archetype.score,
    technical,
    mental,
    physical,
    goalkeeper,
    pressure,
    reliability,
    injuryRisk,
    developmentNeed,
    strengths,
    weaknesses,
    tags: profileTags,
    advice: archetype.advice,
    negotiationHook: reliability >= 70
      ? 'Vendre sa fiabilite et son role stable.'
      : pressure <= 45
        ? 'Eviter les promesses trop lourdes et proteger le temps de jeu.'
        : 'Construire le discours autour de sa progression.',
  };
};

export const getProfilePitchModifier = (profile, pitchId) => {
  if (!profile) return 0;
  if (pitchId === 'sportif') return profile.developmentNeed.includes('temps de jeu') ? 8 : profile.reliability >= 68 ? 4 : 0;
  if (pitchId === 'stability') return profile.pressure <= 50 || profile.injuryRisk >= 60 ? 7 : profile.reliability >= 72 ? 3 : 0;
  if (pitchId === 'ambition') return profile.score >= 68 && profile.pressure >= 58 ? 7 : profile.pressure <= 45 ? -5 : 2;
  if (pitchId === 'financial') return profile.reliability >= 65 ? 2 : profile.pressure <= 42 ? -2 : 0;
  return 0;
};

