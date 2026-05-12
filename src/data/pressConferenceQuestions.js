// Pool de questions de conférence de presse contextualisées.
// Chaque question est liée à un thème et ne se déclenche que si "applies(player, ctx)" est vrai.
// Chaque réponse a 3 dimensions d'impact :
//   - effects : appliqués au joueur via applyChoice (moral, trust, rep, pressure, val)
//   - social  : direction du buzz réseaux ('positive' | 'mixed' | 'negative')
//   - reaction: petite réaction texte simulée (presse / réseaux)
//   - tone    : libellé court ('Diplomate' | 'Honnête' | 'Provocateur' | 'Stratège' …)

const REPORTERS = [
  { name: 'Camille Roussel', outlet: "L'Équipe" },
  { name: 'Hakim Benali', outlet: 'RMC Sport' },
  { name: 'Sophie Marchand', outlet: 'Téléfoot' },
  { name: 'Marco Pellegrini', outlet: 'France Football' },
  { name: 'Léa Dubreuil', outlet: 'Canal+' },
  { name: 'Julien Marquet', outlet: 'Le Parisien' },
  { name: 'Noémie Vasseur', outlet: 'BeIN Sports' },
  { name: 'Yannick Tchouaméni', outlet: 'Foot Mercato' },
  { name: 'Inès Lemoine', outlet: 'So Foot' },
];

export const pickReporters = (seed, n = 3) => {
  const shuffled = [...REPORTERS].sort((a, b) => {
    const sa = ((seed * 9301 + a.name.length * 49297) % 233280) / 233280;
    const sb = ((seed * 9301 + b.name.length * 49297) % 233280) / 233280;
    return sa - sb;
  });
  return shuffled.slice(0, n);
};

const fullName = (p) => `${p.firstName} ${p.lastName}`;

export const PRESS_QUESTIONS = [
  // ----- FORME -----
  {
    id: 'form_high',
    topic: 'forme',
    applies: (p) => (p.form ?? 70) >= 78,
    question: (p) =>
      `${fullName(p)} enchaîne les bonnes performances ces dernières semaines. Comment expliquez-vous cette montée en puissance, et qu'est-ce qui change dans son quotidien ?`,
    answers: [
      {
        tone: 'Humble',
        label: 'Mettre le travail collectif en avant',
        effects: { rep: 2, moral: 2, trust: 4, pressure: -3 },
        social: 'positive',
        reaction: 'Le vestiaire apprécie. Les fans saluent la maturité du discours.',
      },
      {
        tone: 'Ambitieux',
        label: 'Assumer un objectif personnel fort',
        effects: { rep: 4, moral: 6, trust: 2, pressure: 4 },
        social: 'mixed',
        reaction: 'Les supporters s\'enflamment, mais la pression médiatique grimpe d\'un cran.',
      },
      {
        tone: 'Provocateur',
        label: 'Tacler ceux qui doutaient de lui',
        effects: { rep: 1, moral: 8, trust: -2, pressure: 6 },
        social: 'negative',
        reaction: 'Les rivaux s\'agacent. Quelques médias parlent d\'ego mal placé.',
      },
    ],
  },
  {
    id: 'form_low',
    topic: 'forme',
    applies: (p) => (p.form ?? 70) <= 60,
    question: (p) =>
      `${fullName(p)} traverse une période plus difficile. Faut-il s\'inquiéter de son niveau actuel ?`,
    answers: [
      {
        tone: 'Protecteur',
        label: 'Défendre publiquement son joueur',
        effects: { rep: 1, moral: 8, trust: 7, pressure: -3 },
        social: 'positive',
        reaction: 'Le joueur se sent soutenu. Les fans approuvent la loyauté de l\'agent.',
      },
      {
        tone: 'Lucide',
        label: 'Reconnaître le passage à vide',
        effects: { rep: 3, moral: -2, trust: 3, pressure: -1 },
        social: 'mixed',
        reaction: 'La presse salue l\'honnêteté, mais ça pique un peu côté joueur.',
      },
      {
        tone: 'Dur',
        label: 'Mettre la pression sur le coach',
        effects: { rep: -2, moral: 5, trust: -1, pressure: 5 },
        social: 'negative',
        reaction: 'Polémique en vue. Le club n\'apprécie pas du tout la sortie.',
      },
    ],
  },

  // ----- CONTRAT -----
  {
    id: 'contract',
    topic: 'contrat',
    applies: (p) => (p.contractEnd ?? 4) <= 2,
    question: (p) =>
      `Le contrat de ${fullName(p)} arrive à son terme dans moins de deux ans. Pouvez-vous nous éclairer sur l\'avenir : prolongation, départ, choix d\'un nouveau projet ?`,
    answers: [
      {
        tone: 'Diplomate',
        label: 'Botter en touche : "on parle au bon moment"',
        effects: { rep: 2, trust: 3, pressure: -2 },
        social: 'mixed',
        reaction: 'Les journalistes restent sur leur faim, le club apprécie la discrétion.',
      },
      {
        tone: 'Honnête',
        label: 'Confirmer des discussions ouvertes',
        effects: { rep: 3, moral: 3, trust: 1, pressure: 4 },
        social: 'positive',
        reaction: 'Les rumeurs explosent sur les réseaux : grosses cotes au mercato.',
      },
      {
        tone: 'Provocateur',
        label: 'Glisser que d\'autres clubs sont intéressés',
        effects: { rep: 4, moral: 6, trust: -3, pressure: 7 },
        social: 'negative',
        reaction: 'Tollé côté direction. Les supporters du club se sentent trahis.',
      },
    ],
  },

  // ----- BLESSURE -----
  {
    id: 'injury',
    topic: 'blessure',
    applies: (p) => (p.injured ?? 0) > 0,
    question: (p) =>
      `${fullName(p)} sort tout juste d\'une blessure. Sera-t-il à 100 % pour les prochaines échéances et le staff médical fait-il bien son travail ?`,
    answers: [
      {
        tone: 'Mesuré',
        label: 'Faire confiance au staff médical',
        effects: { rep: 2, trust: 2, pressure: -3 },
        social: 'positive',
        reaction: 'Le staff médical apprécie le respect public. Climat apaisé.',
      },
      {
        tone: 'Inquiet',
        label: 'Demander une seconde expertise',
        effects: { rep: -1, moral: 4, trust: 5, pressure: 2 },
        social: 'mixed',
        reaction: 'Le joueur se sent protégé, mais le club est piqué au vif.',
      },
      {
        tone: 'Accusateur',
        label: 'Pointer les erreurs du staff',
        effects: { rep: -3, moral: 6, trust: 6, pressure: 8 },
        social: 'negative',
        reaction: 'Polémique majeure. Le club menace en interne.',
      },
    ],
  },

  // ----- CRITIQUES / PRESSION -----
  {
    id: 'critics',
    topic: 'critiques',
    applies: (p) => (p.pressure ?? 30) >= 55,
    question: (p) =>
      `Les critiques se multiplient autour de ${fullName(p)}. Comment gère-t-il personnellement cette pression médiatique constante ?`,
    answers: [
      {
        tone: 'Calme',
        label: '"Il s\'en sert comme moteur"',
        effects: { rep: 3, moral: 4, trust: 4, pressure: -5 },
        social: 'positive',
        reaction: 'L\'image se repositionne en mode "guerrier serein". Les fans valident.',
      },
      {
        tone: 'Cassant',
        label: 'Renvoyer les critiques aux journalistes',
        effects: { rep: -2, moral: 7, trust: 3, pressure: 4 },
        social: 'negative',
        reaction: 'Les médias se braquent. Une partie du public adore, une autre fuit.',
      },
      {
        tone: 'Vulnérable',
        label: 'Reconnaître que c\'est dur humainement',
        effects: { rep: 2, moral: -3, trust: 6, pressure: -2 },
        social: 'mixed',
        reaction: 'Vague de soutien sur les réseaux, le joueur se sent exposé.',
      },
    ],
  },

  // ----- CLUB / VESTIAIRE -----
  {
    id: 'team_role',
    topic: 'vestiaire',
    applies: (p) => true, // toujours dispo en fallback
    question: (p) =>
      `Quel est aujourd\'hui le rôle exact de ${fullName(p)} dans le vestiaire ? Certains parlent d\'un leader contesté, d\'autres d\'un cadre incontournable.`,
    answers: [
      {
        tone: 'Loyal',
        label: 'Affirmer qu\'il est un cadre central',
        effects: { rep: 3, moral: 5, trust: 4, pressure: 1 },
        social: 'positive',
        reaction: 'Coéquipiers et fans apprécient le message clair.',
      },
      {
        tone: 'Mesuré',
        label: 'Évoquer un rôle évolutif selon le coach',
        effects: { rep: 2, moral: 0, trust: 2, pressure: 0 },
        social: 'mixed',
        reaction: 'Réponse politique. La presse n\'en tire pas de titre.',
      },
      {
        tone: 'Tranchant',
        label: 'Critiquer la hiérarchie actuelle',
        effects: { rep: -2, moral: 4, trust: -3, pressure: 6 },
        social: 'negative',
        reaction: 'Le coach est piqué. Tensions internes confirmées en off.',
      },
    ],
  },

  // ----- MERCATO / RUMEURS -----
  {
    id: 'mercato',
    topic: 'mercato',
    applies: (p) => (p.value ?? 0) >= 8000000,
    question: (p) =>
      `Plusieurs gros clubs européens sont annoncés sur ${fullName(p)}. Que pouvez-vous nous confirmer sur ces approches ?`,
    answers: [
      {
        tone: 'Diplomate',
        label: 'Refuser de commenter publiquement',
        effects: { rep: 2, trust: 3, pressure: -1 },
        social: 'mixed',
        reaction: 'Le club apprécie. Les médias creuseront ailleurs.',
      },
      {
        tone: 'Stratège',
        label: 'Dire qu\'il écoute tous les projets sérieux',
        effects: { rep: 4, moral: 5, trust: 1, pressure: 5, val: 1.04 },
        social: 'positive',
        reaction: 'Les enchères montent. La valeur marchande grimpe.',
      },
      {
        tone: 'Cash',
        label: 'Citer un club concret comme priorité',
        effects: { rep: 5, moral: 8, trust: -4, pressure: 9 },
        social: 'negative',
        reaction: 'Les supporters du club actuel sont furieux. Le club menace de sanctionner.',
      },
    ],
  },

  // ----- SÉLECTION -----
  {
    id: 'selection',
    topic: 'sélection',
    applies: (p) => (p.rating ?? 70) >= 78,
    question: (p) =>
      `${fullName(p)} n\'a pas été appelé en sélection lors du dernier rassemblement. Est-ce une injustice du sélectionneur ?`,
    answers: [
      {
        tone: 'Respectueux',
        label: 'Respecter le choix du sélectionneur',
        effects: { rep: 2, trust: 2, pressure: -2 },
        social: 'mixed',
        reaction: 'Réponse safe. Les fans patriotes auraient voulu plus.',
      },
      {
        tone: 'Convaincant',
        label: 'Argumenter chiffres à l\'appui',
        effects: { rep: 4, moral: 6, trust: 5, pressure: 3 },
        social: 'positive',
        reaction: 'Les supporters relayent en masse. La fédération devra répondre.',
      },
      {
        tone: 'Provocateur',
        label: 'Critiquer ouvertement le sélectionneur',
        effects: { rep: -2, moral: 5, trust: 0, pressure: 8 },
        social: 'negative',
        reaction: 'La fédération réagit froidement. Sélection compromise à court terme.',
      },
    ],
  },

  // ----- AGENCE -----
  {
    id: 'agency',
    topic: 'agence',
    applies: () => true, // fallback agence
    question: (p) =>
      `On parle beaucoup de votre agence ces derniers temps. Quelle est votre vision pour ${fullName(p)} et pour les jeunes talents que vous accompagnez ?`,
    answers: [
      {
        tone: 'Vision',
        label: 'Présenter un projet structuré long terme',
        effects: { rep: 5, trust: 3, pressure: -2 },
        social: 'positive',
        reaction: 'L\'agence gagne en crédibilité. D\'autres talents s\'y intéressent.',
      },
      {
        tone: 'Humain',
        label: 'Insister sur l\'accompagnement humain',
        effects: { rep: 3, moral: 4, trust: 6, pressure: -3 },
        social: 'positive',
        reaction: 'Image très positive. Le joueur se sent valorisé.',
      },
      {
        tone: 'Business',
        label: 'Parler chiffres, marché et expansion',
        effects: { rep: 4, moral: 1, trust: -2, pressure: 3 },
        social: 'mixed',
        reaction: 'Image de "bête business". Les fans tiquent un peu.',
      },
    ],
  },

  // ----- JEUNESSE -----
  {
    id: 'young',
    topic: 'jeunesse',
    applies: (p) => (p.age ?? 25) <= 22,
    question: (p) =>
      `${fullName(p)}, ${p.age} ans, est promis à un grand avenir. Comment gérez-vous la pression sur ses jeunes épaules ?`,
    answers: [
      {
        tone: 'Protecteur',
        label: 'Insister sur la patience et la formation',
        effects: { rep: 3, moral: 4, trust: 5, pressure: -4 },
        social: 'positive',
        reaction: 'Image d\'agence sérieuse. Les parents de jeunes talents adorent.',
      },
      {
        tone: 'Confiant',
        label: 'Affirmer qu\'il est déjà prêt pour le très haut niveau',
        effects: { rep: 4, moral: 8, trust: 1, pressure: 6 },
        social: 'mixed',
        reaction: 'Hype énorme sur les réseaux. La pression devient réelle.',
      },
      {
        tone: 'Tranchant',
        label: 'Demander plus de temps de jeu',
        effects: { rep: 1, moral: 6, trust: 3, pressure: 4 },
        social: 'negative',
        reaction: 'Le coach n\'apprécie pas l\'ingérence publique.',
      },
    ],
  },

  // ----- VÉTÉRAN -----
  {
    id: 'veteran',
    topic: 'vétéran',
    applies: (p) => (p.age ?? 25) >= 32,
    question: (p) =>
      `À ${p.age} ans, ${fullName(p)} pense-t-il sérieusement à la suite de sa carrière ? Reconversion, dernier gros contrat, retraite ?`,
    answers: [
      {
        tone: 'Sérieux',
        label: 'Confirmer un projet de reconversion en cours',
        effects: { rep: 3, moral: 2, trust: 5, pressure: -3 },
        social: 'positive',
        reaction: 'L\'image post-carrière se construit. Sponsors intéressés.',
      },
      {
        tone: 'Compétiteur',
        label: 'Affirmer qu\'il a encore plusieurs grosses années',
        effects: { rep: 3, moral: 7, trust: 2, pressure: 3 },
        social: 'mixed',
        reaction: 'Les fans aiment. Les statisticiens sont sceptiques.',
      },
      {
        tone: 'Cash',
        label: 'Évoquer un dernier gros contrat à l\'étranger',
        effects: { rep: 2, moral: 5, trust: -3, pressure: 5 },
        social: 'negative',
        reaction: 'Les supporters du club actuel se sentent abandonnés.',
      },
    ],
  },

  // ----- SPONSORS / IMAGE -----
  {
    id: 'sponsors',
    topic: 'sponsors',
    applies: () => true,
    question: (p) =>
      `${fullName(p)} multiplie les apparitions sponsoring. Cela ne nuit-il pas à sa concentration sportive ?`,
    answers: [
      {
        tone: 'Pro',
        label: 'Cadre ultra carré : sport d\'abord',
        effects: { rep: 4, trust: 4, pressure: -2 },
        social: 'positive',
        reaction: 'Sponsors rassurés. Les performances restent au centre.',
      },
      {
        tone: 'Assumé',
        label: 'Assumer une stratégie image globale',
        effects: { rep: 3, moral: 4, trust: 1, pressure: 2 },
        social: 'mixed',
        reaction: 'Image moderne. Quelques puristes du foot grognent.',
      },
      {
        tone: 'Provocateur',
        label: 'Renvoyer les critiques aux salaires des journalistes',
        effects: { rep: -1, moral: 6, trust: -1, pressure: 5 },
        social: 'negative',
        reaction: 'Polémique sur les réseaux. Engagement en hausse, sympathie en baisse.',
      },
    ],
  },
];

export const buildQuestionSet = (player, ctx = {}) => {
  const seed = (player.id ?? 1) + (ctx.week ?? 1) * 17;
  const eligible = PRESS_QUESTIONS.filter((q) => {
    try { return q.applies(player, ctx); } catch { return false; }
  });
  // Tri pseudo-aléatoire stable par seed
  const shuffled = [...eligible].sort((a, b) => {
    const sa = ((seed * 9301 + a.id.length * 49297) % 233280) / 233280;
    const sb = ((seed * 9301 + b.id.length * 49297) % 233280) / 233280;
    return sa - sb;
  });
  // Garantit des thèmes différents
  const picked = [];
  const usedTopics = new Set();
  for (const q of shuffled) {
    if (usedTopics.has(q.topic)) continue;
    picked.push(q);
    usedTopics.add(q.topic);
    if (picked.length === 3) break;
  }
  // Fallback : compléter avec n'importe quoi
  let i = 0;
  while (picked.length < 3 && i < shuffled.length) {
    if (!picked.includes(shuffled[i])) picked.push(shuffled[i]);
    i++;
  }
  return picked.slice(0, 3);
};
