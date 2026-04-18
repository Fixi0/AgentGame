export const PASSIVE_EVENTS = [
  // ─── COMMUN BON ─────────────────────────────────────────────────
  { id: 'hat_trick', rarity: 'common', type: 'performance', label: 'Triplé en finale', good: true, money: 18000, rep: 8, val: 1.15, moral: 10, trust: 2, chance: 0.04 },
  { id: 'mvp', rarity: 'common', type: 'performance', label: 'MVP du match', good: true, money: 8000, rep: 5, val: 1.08, moral: 8, trust: 1, chance: 0.08 },
  { id: 'brace', rarity: 'common', type: 'performance', label: 'Doublé décisif', good: true, money: 6000, rep: 3, val: 1.06, moral: 6, trust: 1, chance: 0.1 },
  { id: 'assist', rarity: 'common', type: 'performance', label: 'Passe décisive cruciale', good: true, money: 3000, rep: 2, val: 1.03, moral: 4, trust: 1, chance: 0.12 },
  { id: 'sponsor', rarity: 'common', type: 'transfer', label: 'Deal sponsoring signé', good: true, money: 20000, rep: 3, val: 1.05, moral: 5, trust: 1, chance: 0.04 },
  { id: 'interview_good', rarity: 'common', type: 'media', label: 'Interview virale positive', good: true, money: 3000, rep: 4, val: 1.02, moral: 5, trust: 1, chance: 0.07 },
  { id: 'fan_fav', rarity: 'common', type: 'fans', label: 'Joueur du mois', good: true, money: 5000, rep: 6, val: 1.07, moral: 10, trust: 2, chance: 0.05 },
  { id: 'charity_ev', rarity: 'common', type: 'fans', label: 'Action caritative médiatisée', good: true, money: 2000, rep: 7, val: 1.02, moral: 3, trust: 1, chance: 0.06 },
  { id: 'leader', rarity: 'common', type: 'performance', label: 'Leader du vestiaire', good: true, money: 1500, rep: 3, val: 1.03, moral: 8, trust: 1, chance: 0.08 },
  { id: 'training', rarity: 'common', type: 'performance', label: "Top à l'entraînement", good: true, money: 1000, rep: 1, val: 1.02, moral: 5, trust: 1, chance: 0.1 },
  { id: 'viral_skill', rarity: 'common', type: 'fans', label: 'Geste technique viral', good: true, money: 4000, rep: 5, val: 1.05, moral: 7, trust: 1, chance: 0.06 },
  { id: 'transfer_rumor_hype', rarity: 'common', type: 'media', label: 'Rumeurs flatteuses sur son avenir', good: true, money: 2000, rep: 2, val: 1.08, moral: 6, trust: 0, chance: 0.06 },
  { id: 'comeback_hero', rarity: 'common', type: 'performance', label: 'But décisif à la 90e minute', good: true, money: 5500, rep: 4, val: 1.05, moral: 9, trust: 1, chance: 0.04 },
  { id: 'assist_king', rarity: 'common', type: 'performance', label: 'Meilleur passeur de la semaine', good: true, money: 3000, rep: 3, val: 1.04, moral: 6, trust: 1, chance: 0.04 },
  { id: 'award_monthly', rarity: 'common', type: 'media', label: 'Trophée joueur du mois officiel', good: true, money: 7000, rep: 5, val: 1.07, moral: 9, trust: 2, chance: 0.03 },
  { id: 'youth_breakthrough', rarity: 'common', type: 'performance', label: 'Percée confirmée — jeune talent', good: true, money: 3500, rep: 3, val: 1.06, moral: 8, trust: 1, chance: 0.035 },

  // ─── RARE BON ───────────────────────────────────────────────────
  { id: 'callup', rarity: 'rare', type: 'media', label: 'Convoqué en sélection nationale', good: true, money: 12000, rep: 10, val: 1.2, moral: 15, trust: 2, chance: 0.03 },
  { id: 'golden_boot', rarity: 'rare', type: 'performance', label: "Candidat Soulier d'Or", good: true, money: 15000, rep: 12, val: 1.25, moral: 12, trust: 2, chance: 0.02 },
  { id: 'comeback_perf', rarity: 'rare', type: 'performance', label: 'Retour de blessure brillant', good: true, money: 8000, rep: 5, val: 1.1, moral: 12, trust: 2, chance: 0.02 },
  { id: 'international_debut', rarity: 'rare', type: 'media', label: 'Premier match en sélection nationale', good: true, money: 10000, rep: 8, val: 1.15, moral: 18, trust: 2, chance: 0.015 },
  { id: 'captain_named', rarity: 'rare', type: 'performance', label: 'Nommé capitaine de son club', good: true, money: 5000, rep: 6, val: 1.08, moral: 15, trust: 3, chance: 0.018 },
  { id: 'top_scorer_race', rarity: 'rare', type: 'performance', label: 'En lice pour le titre meilleur buteur', good: true, money: 8000, rep: 7, val: 1.12, moral: 10, trust: 1, chance: 0.02 },
  { id: 'international_tournament', rarity: 'rare', type: 'media', label: 'Héroïque en tournoi international', good: true, money: 14000, rep: 9, val: 1.18, moral: 14, trust: 2, chance: 0.025 },
  { id: 'club_legend_day', rarity: 'rare', type: 'fans', label: 'Hommage du club — match historique', good: true, money: 6000, rep: 6, val: 1.05, moral: 20, trust: 3, chance: 0.015 },
  { id: 'record_assist', rarity: 'rare', type: 'performance', label: 'Record de passes décisives sur la saison', good: true, money: 9000, rep: 7, val: 1.1, moral: 11, trust: 2, chance: 0.018 },
  { id: 'media_coup', rarity: 'rare', type: 'media', label: 'Couverture médiatique mondiale', good: true, money: 11000, rep: 8, val: 1.12, moral: 10, trust: 2, chance: 0.02 },

  // ─── ÉPIQUE BON ─────────────────────────────────────────────────
  { id: 'hat_trick_cl', rarity: 'epic', type: 'performance', label: 'Triplé en Ligue des Champions', good: true, money: 25000, rep: 12, val: 1.22, moral: 18, trust: 3, chance: 0.006 },
  { id: 'record_goal', rarity: 'epic', type: 'performance', label: '100e but en carrière professionnelle', good: true, money: 20000, rep: 10, val: 1.15, moral: 15, trust: 2, chance: 0.004 },
  { id: 'ballon_dor_shortlist', rarity: 'epic', type: 'media', label: "Nominé Ballon d'Or / Trophées FIFA", good: true, money: 30000, rep: 15, val: 1.4, moral: 20, trust: 3, chance: 0.003 },

  // ─── LÉGENDAIRE BON ─────────────────────────────────────────────
  { id: 'world_cup_hero', rarity: 'legendary', type: 'media', label: 'Héros de la Coupe du Monde', good: true, money: 60000, rep: 30, val: 1.8, moral: 25, trust: 5, chance: 0.0005 },
  { id: 'ballon_dor_winner', rarity: 'legendary', type: 'media', label: "Remporte le Ballon d'Or", good: true, money: 80000, rep: 50, val: 2.5, moral: 30, trust: 5, chance: 0.0003 },

  // ─── COMMUN MAUVAIS ─────────────────────────────────────────────
  { id: 'inj_mild', rarity: 'common', type: 'media', label: 'Blessure légère (2 semaines)', good: false, money: -3000, rep: -1, val: 0.92, moral: -5, trust: -1, chance: 0.07, injury: 2 },
  { id: 'red_card', rarity: 'common', type: 'scandal', label: 'Carton rouge — suspension', good: false, money: -3000, rep: -5, val: 0.92, moral: -8, trust: -1, chance: 0.05 },
  { id: 'benched', rarity: 'common', type: 'performance', label: 'Sur le banc — écarté', good: false, money: -2000, rep: -3, val: 0.93, moral: -10, trust: -2, chance: 0.08 },
  { id: 'bad_form', rarity: 'common', type: 'performance', label: 'Passage à vide', good: false, money: -1500, rep: -1, val: 0.96, moral: -5, trust: -1, chance: 0.1 },
  { id: 'bad_interview', rarity: 'common', type: 'media', label: 'Interview maladroite', good: false, money: -2000, rep: -4, val: 0.98, moral: -3, trust: -1, chance: 0.06 },
  { id: 'late', rarity: 'common', type: 'scandal', label: 'En retard à l\'entraînement', good: false, money: -1000, rep: -2, val: 0.98, moral: -4, trust: -1, chance: 0.08 },
  { id: 'tweet', rarity: 'common', type: 'scandal', label: 'Tweet controversé', good: false, money: -2500, rep: -5, val: 0.97, moral: -3, trust: -1, chance: 0.05 },
  { id: 'fatigue', rarity: 'common', type: 'performance', label: 'Fatigue accumulée', good: false, money: -1000, rep: 0, val: 0.98, moral: -4, trust: -1, chance: 0.08 },
  { id: 'yellow_spree', rarity: 'common', type: 'scandal', label: '3e carton jaune — suspension imminente', good: false, money: -2000, rep: -3, val: 0.95, moral: -8, trust: -1, chance: 0.06 },
  { id: 'training_clash', rarity: 'common', type: 'scandal', label: "Clash à l'entraînement", good: false, money: -2000, rep: -3, val: 0.97, moral: -8, trust: -2, chance: 0.05 },
  { id: 'press_leak', rarity: 'common', type: 'media', label: 'Fuite presse sur son contrat', good: false, money: -1500, rep: -3, val: 0.97, moral: -5, trust: -2, chance: 0.05 },
  { id: 'transfer_rumor_bad', rarity: 'common', type: 'media', label: 'Rumeurs de départ qui perturbent l\'équipe', good: false, money: -1000, rep: -2, val: 0.97, moral: -6, trust: -1, chance: 0.05 },
  { id: 'fine_club', rarity: 'common', type: 'scandal', label: 'Amende disciplinaire du club', good: false, money: -4000, rep: -2, val: 0.98, moral: -6, trust: -1, chance: 0.05 },

  // ─── PEU COMMUN MAUVAIS ─────────────────────────────────────────
  { id: 'fight', rarity: 'uncommon', type: 'scandal', label: 'Altercation avec un coéquipier', good: false, money: -4000, rep: -5, val: 0.95, moral: -10, trust: -2, chance: 0.04 },
  { id: 'penalty_miss', rarity: 'uncommon', type: 'performance', label: 'Penalty raté décisif', good: false, money: -5000, rep: -6, val: 0.9, moral: -15, trust: -2, chance: 0.03 },
  { id: 'fan_dispute', rarity: 'uncommon', type: 'scandal', label: 'Dispute avec un supporter', good: false, money: -3000, rep: -6, val: 0.96, moral: -5, trust: -2, chance: 0.04 },
  { id: 'coach_clash', rarity: 'uncommon', type: 'media', label: 'Conflit ouvert avec l\'entraîneur', good: false, money: -2000, rep: -2, val: 0.97, moral: -8, trust: -2, chance: 0.06 },
  { id: 'national_snubbed', rarity: 'uncommon', type: 'media', label: 'Non-sélectionné malgré ses performances', good: false, money: -1000, rep: -1, val: 0.96, moral: -12, trust: -1, chance: 0.04 },
  { id: 'own_goal', rarity: 'uncommon', type: 'performance', label: 'But contre son camp décisif', good: false, money: -3000, rep: -4, val: 0.93, moral: -12, trust: -2, chance: 0.04 },
  { id: 'rival_clash', rarity: 'uncommon', type: 'scandal', label: 'Clash public avec un rival', good: false, money: -2500, rep: -4, val: 0.95, moral: -8, trust: -1, chance: 0.04 },
  { id: 'brand_deal_lost', rarity: 'uncommon', type: 'transfer', label: 'Sponsor qui ne renouvelle pas', good: false, money: -5000, rep: -2, val: 0.97, moral: -5, trust: -1, chance: 0.04 },
  { id: 'warmup_injury', rarity: 'uncommon', type: 'media', label: "Blessure à l'entraînement (3 sem.)", good: false, money: -3500, rep: -1, val: 0.94, moral: -8, trust: -1, chance: 0.035, injury: 3 },

  // ─── RARE MAUVAIS ───────────────────────────────────────────────
  { id: 'inj_severe', rarity: 'rare', type: 'media', label: 'Blessure grave (6 semaines)', good: false, money: -12000, rep: -3, val: 0.75, moral: -15, trust: -2, chance: 0.02, injury: 6 },
  { id: 'double_injury', rarity: 'rare', type: 'media', label: 'Rechute après retour de blessure (5 sem.)', good: false, money: -9000, rep: -4, val: 0.78, moral: -18, trust: -3, chance: 0.015, injury: 5 },
  { id: 'public_meltdown', rarity: 'rare', type: 'scandal', label: 'Crise publique devant les caméras', good: false, money: -5000, rep: -8, val: 0.9, moral: -15, trust: -3, chance: 0.012 },

  // ─── ÉPIQUE MAUVAIS ─────────────────────────────────────────────
  { id: 'doping_accusation', rarity: 'epic', type: 'scandal', label: 'Accusation de dopage (infondée)', good: false, money: -15000, rep: -10, val: 0.7, moral: -20, trust: -4, chance: 0.003 },

  // ─── LÉGENDAIRE MAUVAIS ──────────────────────────────────────────
  { id: 'career_end_injury', rarity: 'legendary', type: 'media', label: 'Blessure de fin de carrière potentielle', good: false, money: -20000, rep: -5, val: 0.55, moral: -25, trust: -5, chance: 0.001, injury: 12 },
];

export const INTERACTIVE_EVENTS = [
  // ─── EXISTANTS ───────────────────────────────────────────────────
  {
    id: 'nightclub',
    rarity: 'common',
    types: ['scandal'],
    personalities: ['fetard', 'instable'],
    title: 'Sortie en boîte la veille du match',
    description: 'Ton joueur a été photographié en boîte à 3h du matin. Les tabloïds préparent un dossier explosif.',
    choices: [
      { label: 'Payer les paparazzis', cost: 8000, effects: { rep: -2, moral: 3, trust: 2 }, desc: 'Discret mais coûteux' },
      { label: 'Le sermonner fermement', cost: 0, effects: { rep: 1, moral: -8, trust: -8, val: 0.97 }, desc: 'Il va mal le prendre' },
      { label: 'Laisser sortir le scandale', cost: 0, effects: { rep: -6, moral: -3, trust: -3, val: 0.93 }, desc: 'Risqué' },
      { label: 'Communiquer positivement', cost: 2000, effects: { rep: 2, moral: 5, trust: 4 }, desc: 'Carte humaine' },
    ],
  },
  {
    id: 'big_club',
    rarity: 'rare',
    types: ['transfer'],
    personalities: ['ambitieux', 'mercenaire'],
    title: "Un grand club s'intéresse à lui",
    description: 'Un top 5 européen contacte discrètement ton agence. Le joueur est au courant et attend ta réponse.',
    choices: [
      { label: 'Table ronde officielle', cost: 0, effects: { rep: 4, moral: 8, trust: 4 }, desc: 'Voie classique', flag: 'transfer_offer' },
      { label: 'Faire monter les enchères', cost: 5000, effects: { rep: 2, moral: 5, trust: 1 }, desc: 'Plus lucratif', flag: 'transfer_offer' },
      { label: 'Refuser — il reste', cost: 0, effects: { rep: -3, moral: -10, trust: -10 }, desc: 'Loyauté au club actuel' },
    ],
  },
  {
    id: 'new_agent',
    rarity: 'common',
    types: ['media'],
    personalities: ['instable', 'mercenaire'],
    title: "Le joueur veut changer d'agent",
    description: 'Un concurrent lui a fait une proposition flatteuse. Il hésite à rester avec toi.',
    choices: [
      { label: 'Baisser ta commission', cost: 0, effects: { moral: 15, trust: 12, commission: -0.02 }, desc: 'Tu gagnes moins' },
      { label: 'Grand discours sur le projet', cost: 0, effects: { moral: 5, trust: 5, repCheck: 40 }, desc: 'Dépend de ta réputation' },
      { label: 'Cadeau de luxe', cost: 15000, effects: { moral: 20, trust: 15 }, desc: 'Engagement fort' },
      { label: 'Le laisser partir avec dignité', cost: 0, effects: { rep: -4 }, desc: 'Perte sèche', releasePlayer: true },
    ],
  },
  {
    id: 'contract_exp',
    rarity: 'common',
    types: ['transfer'],
    title: 'Fin de contrat en approche',
    description: 'Le contrat expire dans 6 mois. Les clubs tournent autour. Il faut décider maintenant.',
    choices: [
      { label: 'Prolonger au club actuel', cost: 0, effects: { moral: 5, trust: 5 }, desc: 'Stabilité', flag: 'extend' },
      { label: 'Chercher un transfert', cost: 0, effects: { moral: 8, trust: 1 }, desc: 'Grosse commission possible', flag: 'transfer_offer' },
      { label: 'Attendre et partir libre', cost: 0, effects: { moral: 10, trust: -5, rep: -2 }, desc: 'Prime à la signature' },
    ],
  },
  {
    id: 'salary',
    rarity: 'common',
    types: ['transfer'],
    personalities: ['ambitieux', 'mercenaire'],
    title: "Demande d'augmentation salariale",
    description: 'Ton joueur exige une renégociation immédiate. Il menace de ne pas jouer.',
    choices: [
      { label: 'Négocier agressivement', cost: 0, effects: { moral: 10, trust: -2, repCheck: 45 }, desc: 'Risqué mais potentiellement fort' },
      { label: 'Compromis équilibré', cost: 0, effects: { moral: 3, trust: 6 }, desc: 'Sûr et raisonnable' },
      { label: 'Refuser catégoriquement', cost: 0, effects: { moral: -12, trust: -12 }, desc: 'Il sera vexé longtemps' },
    ],
  },
  {
    id: 'family',
    rarity: 'uncommon',
    types: ['media'],
    personalities: ['loyal', 'leader'],
    title: 'Crise familiale',
    description: 'Ton joueur traverse une période difficile en famille. Ses performances en pâtissent.',
    choices: [
      { label: 'Aide financière directe', cost: 10000, effects: { moral: 20, trust: 18, val: 1.03 }, desc: 'Geste fort et humain' },
      { label: 'Psychologue du sport', cost: 5000, effects: { moral: 12, trust: 10, val: 1.02 }, desc: 'Accompagnement pro' },
      { label: 'Se concentrer sur le foot', cost: 0, effects: { moral: -15, trust: -12, val: 0.93 }, desc: 'Froid — il s\'en souviendra' },
    ],
  },
  {
    id: 'polemic',
    rarity: 'common',
    types: ['scandal'],
    personalities: ['instable', 'leader'],
    title: 'Déclaration polémique',
    description: "Ton joueur a lâché une phrase explosive en conférence de presse. Les réseaux s'embrasent.",
    choices: [
      { label: 'Excuses officielles rapides', cost: 0, effects: { rep: 1, moral: -8, trust: -3 }, desc: 'Calmer le jeu' },
      { label: 'Le soutenir publiquement', cost: 0, effects: { rep: -3, moral: 12, trust: 10 }, desc: 'Reconnaissant mais risqué' },
      { label: 'Silence radio', cost: 0, effects: { rep: -5, trust: -4 }, desc: 'Passivité dangereuse' },
      { label: 'Engager un communicant', cost: 10000, effects: { rep: 3, moral: 5, trust: 3 }, desc: 'Gestion pro de la crise' },
    ],
  },
  {
    id: 'prospect',
    rarity: 'common',
    types: ['transfer'],
    title: 'Pépite repérée',
    description: 'Un scout de confiance a trouvé un jeune prodige. Potentiel énorme, mais il faut agir vite.',
    choices: [
      { label: 'Signer immédiatement', cost: 0, effects: {}, desc: 'Foncer avant les concurrents', flag: 'add_young_prospect' },
      { label: 'Observer encore', cost: 0, effects: { rep: -2 }, desc: 'Prudent mais risqué' },
    ],
  },
  {
    id: 'charity',
    rarity: 'common',
    types: ['fans'],
    personalities: ['loyal', 'leader', 'professionnel'],
    title: "Demande d'association caritative",
    description: 'Une ONG reconnue sollicite une donation de 20 000 €. Les médias sont déjà au courant.',
    choices: [
      { label: 'Accepter et médiatiser', cost: 20000, effects: { rep: 10, moral: 8, trust: 6 }, desc: 'Boost image maximale' },
      { label: 'Don anonyme discret', cost: 20000, effects: { rep: 2, moral: 10, trust: 8 }, desc: 'Valeurs avant tout' },
      { label: 'Refuser poliment', cost: 0, effects: { rep: -2, trust: -3 }, desc: 'Pragmatique mais froid' },
    ],
  },

  // ─── NOUVEAUX ─────────────────────────────────────────────────────
  {
    id: 'media_trial',
    rarity: 'rare',
    types: ['scandal'],
    title: 'Procès médiatique',
    description: "Un journaliste d'investigation publie un article dévastateur. La presse assiège ton joueur.",
    choices: [
      { label: 'Avocat et silence total', cost: 18000, effects: { rep: -2, moral: -5, trust: 2 }, desc: 'Discret — se protéger légalement' },
      { label: 'Conférence de presse offensive', cost: 3000, effects: { rep: 3, moral: -5, trust: -2, repCheck: 55 }, desc: 'Percutant si réputation solide' },
      { label: 'Réseaux — version perso', cost: 0, effects: { rep: -4, moral: 5, trust: 5 }, desc: 'Court-circuite les médias classiques' },
      { label: 'Partenariat avec journal rival', cost: 8000, effects: { rep: 5, moral: 3, trust: 1 }, desc: 'Contre-attaque stratégique' },
    ],
  },
  {
    id: 'locker_room_split',
    rarity: 'uncommon',
    types: ['scandal'],
    title: 'Vestiaire divisé',
    description: 'Ton joueur est au cœur d\'un conflit interne. Deux camps se forment. Le coach est sous pression.',
    choices: [
      { label: 'Médiateur professionnel', cost: 5000, effects: { rep: 2, moral: 5, trust: 4 }, desc: 'Gérer avec tact' },
      { label: 'Soutenir ton joueur', cost: 0, effects: { rep: -2, moral: 12, trust: 10 }, desc: 'Loyal mais clivant' },
      { label: 'Demander transfert express', cost: 0, effects: { rep: -1, moral: 5, trust: 3 }, desc: 'Fuite en avant', flag: 'transfer_offer' },
      { label: 'Ignorer — se concentrer sur le jeu', cost: 0, effects: { rep: -3, moral: -6, trust: -5 }, desc: 'Très mauvais signal' },
    ],
  },
  {
    id: 'brand_offer',
    rarity: 'rare',
    types: ['transfer'],
    title: 'Offre sponsoring de prestige',
    description: 'Une marque internationale propose un contrat exclusif 3 ans. Décision attendue sous 48h.',
    choices: [
      { label: 'Accepter — top conditions', cost: 0, effects: { money: 35000, rep: 6, moral: 8, trust: 2, val: 1.08 }, desc: '35k immédiats' },
      { label: 'Renégocier à la hausse', cost: 0, effects: { money: 20000, rep: 2, moral: 5, repCheck: 50 }, desc: 'Dépend de ta réputation' },
      { label: 'Refuser — protéger l\'image', cost: 0, effects: { rep: 3, moral: 2, trust: 3 }, desc: 'Selective branding' },
    ],
  },
  {
    id: 'comeback_rush',
    rarity: 'uncommon',
    types: ['media'],
    title: 'Retour précipité de blessure',
    description: 'Ton joueur insiste pour revenir trop tôt. Le staff médical est formel : risque de rechute.',
    choices: [
      { label: 'Lui dire d\'attendre encore', cost: 0, effects: { moral: -10, trust: -4, val: 1.05 }, desc: 'Sage mais frustrant' },
      { label: 'Retour progressif encadré', cost: 3000, effects: { moral: 8, trust: 5 }, desc: 'Risque géré' },
      { label: 'Le laisser décider seul', cost: 0, effects: { moral: 10, trust: 6 }, desc: 'Autonomie — risque rechute élevé' },
    ],
  },
  {
    id: 'sponsor_crisis',
    rarity: 'uncommon',
    types: ['transfer'],
    title: 'Sponsor menace de partir',
    description: 'Suite à l\'incident récent, le sponsor principal menace de résilier le contrat en cours.',
    choices: [
      { label: 'Réunion d\'urgence + excuses', cost: 5000, effects: { rep: 2, moral: -3, trust: 1, val: 1.02 }, desc: 'Sauver le deal' },
      { label: 'Accepter la résiliation', cost: 0, effects: { money: -8000, rep: -3, val: 0.95 }, desc: 'Dégâts limités' },
      { label: 'Trouver sponsor de remplacement', cost: 8000, effects: { money: 15000, rep: 1, moral: 4, val: 1.03 }, desc: 'Rebondir plus fort' },
    ],
  },
  {
    id: 'dual_offer',
    rarity: 'epic',
    types: ['transfer'],
    personalities: ['ambitieux', 'mercenaire', 'professionnel'],
    title: 'Guerre d\'enchères entre deux clubs',
    description: 'Deux clubs européens de haut niveau s\'affrontent pour ton joueur. Pression maximale.',
    choices: [
      { label: 'Laisser monter les offres 1 semaine', cost: 0, effects: { rep: 3, moral: 10, trust: 2, val: 1.15 }, desc: 'Risqué mais juteux', flag: 'transfer_offer' },
      { label: 'Choisir le meilleur projet sportif', cost: 0, effects: { rep: 5, moral: 15, trust: 8, val: 1.08 }, desc: 'Image de marque', flag: 'transfer_offer' },
      { label: 'Choisir le plus offrant', cost: 0, effects: { rep: -1, moral: 8, trust: 3, val: 1.12 }, desc: 'Pur pragmatisme', flag: 'transfer_offer' },
      { label: 'Refuser les deux — bluffer', cost: 0, effects: { rep: 6, moral: -8, trust: -6 }, desc: 'Tactique risquée' },
    ],
  },
  {
    id: 'retirement_decision',
    rarity: 'rare',
    types: ['media'],
    title: 'Il envisage la retraite',
    description: 'Ton joueur, en fin de carrière, réfléchit sérieusement à raccrocher. Il te demande ton avis.',
    choices: [
      { label: 'L\'encourager à continuer', cost: 0, effects: { moral: 5, trust: 8, rep: 2 }, desc: 'En lui trouvant un bon club' },
      { label: 'Préparer une sortie en beauté', cost: 10000, effects: { rep: 10, moral: 18, trust: 12 }, desc: 'Gestion digne de fin de carrière' },
      { label: 'Respecter sa décision', cost: 0, effects: { rep: 5, moral: 20, trust: 15 }, desc: 'Classe absolue', releasePlayer: true },
    ],
  },
  {
    id: 'youth_mentor',
    rarity: 'uncommon',
    types: ['fans'],
    personalities: ['loyal', 'leader', 'professionnel'],
    title: 'Rôle de mentor pour un jeune',
    description: 'Ton joueur vétéran propose de prendre un jeune sous son aile. Club et médias adorent l\'idée.',
    choices: [
      { label: 'Accepter — fort impact image', cost: 0, effects: { rep: 7, moral: 8, trust: 5 }, desc: 'Beau geste visible' },
      { label: 'Accepter avec prime', cost: 0, effects: { rep: 4, money: 5000, moral: 5, trust: 3 }, desc: 'Pragmatique' },
      { label: 'Refuser — se concentrer sur lui', cost: 0, effects: { rep: -2, moral: 2 }, desc: 'Focalisé sur sa carrière' },
    ],
  },
  {
    id: 'national_controversy',
    rarity: 'rare',
    types: ['media'],
    title: 'Controverse autour de sa sélection nationale',
    description: 'Des débats sportifs et politiques entourent son appartenance en sélection. La presse s\'embrase.',
    choices: [
      { label: 'Communiqué de soutien officiel', cost: 3000, effects: { rep: 4, moral: 6, trust: 3 }, desc: 'Clair et positionné' },
      { label: 'Silence stratégique', cost: 0, effects: { rep: -2, moral: 2, trust: 1 }, desc: 'Attendre que ça passe' },
      { label: 'Répondre directement', cost: 0, effects: { rep: -3, moral: 10, trust: 8, repCheck: 60 }, desc: 'Courageux mais risqué' },
    ],
  },
  {
    id: 'agent_pressure',
    rarity: 'uncommon',
    types: ['media'],
    personalities: ['instable', 'mercenaire', 'ambitieux'],
    title: 'Offensive d\'un super-agent',
    description: 'Un agent de stars — gros nom, gros réseau — lui a fait une offre très agressive et publique.',
    choices: [
      { label: 'Contre-offre — tu t\'alignes', cost: 0, effects: { moral: 12, trust: 8, commission: -0.03 }, desc: 'Tu perds de la marge financière' },
      { label: 'Jouer ta réputation', cost: 0, effects: { moral: 6, trust: 4, repCheck: 65 }, desc: 'Dépend de ton prestige' },
      { label: 'Proposer une co-représentation', cost: 5000, effects: { moral: 10, trust: 6, rep: 2 }, desc: 'Partenariat stratégique' },
      { label: 'Le laisser partir avec classe', cost: 0, effects: { rep: 3, moral: 5, trust: 5 }, desc: 'Dignité préservée', releasePlayer: true },
    ],
  },
];

export const CHAINED_EVENTS = {
  inj_severe: [
    { delayWeeks: 3, type: 'interactive', eventId: 'comeback_rush', chance: 0.5 },
    { delayWeeks: 7, type: 'passive', eventId: 'double_injury', chance: 0.22 },
  ],
  double_injury: [
    { delayWeeks: 2, type: 'interactive', eventId: 'retirement_decision', chance: 0.28 },
  ],
  career_end_injury: [
    { delayWeeks: 1, type: 'interactive', eventId: 'retirement_decision', chance: 0.85 },
  ],
  tweet: [
    { delayWeeks: 1, type: 'interactive', eventId: 'sponsor_crisis', chance: 0.4 },
    { delayWeeks: 2, type: 'passive', eventId: 'brand_deal_lost', chance: 0.3 },
  ],
  doping_accusation: [
    { delayWeeks: 1, type: 'interactive', eventId: 'media_trial', chance: 0.9 },
    { delayWeeks: 3, type: 'passive', eventId: 'brand_deal_lost', chance: 0.65 },
  ],
  public_meltdown: [
    { delayWeeks: 1, type: 'interactive', eventId: 'media_trial', chance: 0.6 },
    { delayWeeks: 2, type: 'passive', eventId: 'brand_deal_lost', chance: 0.35 },
  ],
  fight: [
    { delayWeeks: 1, type: 'interactive', eventId: 'locker_room_split', chance: 0.55 },
  ],
  coach_clash: [
    { delayWeeks: 2, type: 'interactive', eventId: 'locker_room_split', chance: 0.4 },
  ],
  ballon_dor_shortlist: [
    { delayWeeks: 1, type: 'interactive', eventId: 'dual_offer', chance: 0.7 },
    { delayWeeks: 2, type: 'passive', eventId: 'sponsor', chance: 0.85 },
  ],
  callup: [
    { delayWeeks: 2, type: 'passive', eventId: 'international_tournament', chance: 0.35 },
  ],
  international_debut: [
    { delayWeeks: 1, type: 'passive', eventId: 'media_coup', chance: 0.5 },
  ],
  fan_dispute: [
    { delayWeeks: 1, type: 'interactive', eventId: 'media_trial', chance: 0.35 },
  ],
  sponsor: [
    { delayWeeks: 4, type: 'interactive', eventId: 'brand_offer', chance: 0.22 },
  ],
  hat_trick_cl: [
    { delayWeeks: 1, type: 'interactive', eventId: 'dual_offer', chance: 0.5 },
  ],
  world_cup_hero: [
    { delayWeeks: 1, type: 'interactive', eventId: 'dual_offer', chance: 1.0 },
    { delayWeeks: 2, type: 'interactive', eventId: 'brand_offer', chance: 0.9 },
  ],
  red_card: [
    { delayWeeks: 1, type: 'interactive', eventId: 'polemic', chance: 0.3 },
  ],
  captain_named: [
    { delayWeeks: 3, type: 'interactive', eventId: 'youth_mentor', chance: 0.4 },
  ],
};

// ── VESTIAIRE & RIVALITÉS ──────────────────────────────────────────────────
export const LOCKER_ROOM_EVENTS = [
  {
    id: 'locker_rivalry',
    rarity: 'uncommon',
    types: ['vestiaire'],
    title: 'Tension dans le vestiaire',
    description: 'Deux de tes joueurs sont en froid depuis le dernier match. La rumeur parle d\'altercation à l\'entraînement. Le coach a contacté l\'agence.',
    choices: [
      { label: 'Médiateur neutre', cost: 0, effects: { moral: 3, trust: 4 }, desc: 'Dialogue direct avec les deux joueurs' },
      { label: 'Soutenir le plus important', cost: 0, effects: { moral: -4, trust: 6 }, desc: 'Tu choisis un camp — l\'autre sera blessé' },
      { label: 'Laisser le coach gérer', cost: 0, effects: { moral: -2, trust: -3 }, desc: 'Tu recules — ils noteront ton absence' },
    ],
  },
  {
    id: 'salary_jealousy',
    rarity: 'uncommon',
    types: ['vestiaire', 'transfer'],
    title: 'Jalousie salariale',
    description: 'Un joueur a appris que son coéquipier gagne bien plus. Il veut une explication — et une revalorisation immédiate.',
    choices: [
      { label: 'Promettre une renégociation', cost: 0, effects: { moral: 4, trust: 5 }, desc: 'Tu crées une promesse — à honorer' },
      { label: 'Expliquer les hiérarchies', cost: 0, effects: { moral: -1, trust: 2 }, desc: 'Réponse froide mais honnête' },
      { label: 'Ignorer la demande', cost: 0, effects: { moral: -8, trust: -7 }, desc: 'Il va ruminer — et potentiellement fuir' },
    ],
  },
  {
    id: 'captain_conflict',
    rarity: 'rare',
    types: ['vestiaire'],
    title: 'Conflit de leadership',
    description: 'Ton joueur et le capitaine de l\'équipe s\'affrontent pour le leadership. L\'ambiance est explosive. Le DS t\'appelle.',
    choices: [
      { label: 'Valoriser ton joueur publiquement', cost: 0, effects: { moral: 8, trust: 4, rep: 2 }, desc: 'Bonne opération médiatique — mais risquée' },
      { label: 'Calmer le jeu discrètement', cost: 0, effects: { moral: 2, trust: 6 }, desc: 'Diplomatie — moins spectaculaire, plus sûr' },
      { label: 'Demander un transfert immédiat', cost: 0, effects: { moral: 5, trust: 2, rep: -2 }, flag: 'transfer_offer', desc: 'Sortir par le haut' },
    ],
  },
];
