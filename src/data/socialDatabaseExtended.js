// ============================================================================
// SOCIAL DATABASE — EXTENSION MASSIVE
// 500+ posts/templates additionnels pour de la nouveauté permanente.
// Importé et mergé dans socialDatabase.js
// ============================================================================

const fullName = (p = {}) => `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Joueur';

// ============= 80+ POSTS JOUEURS additionnels =============
export const PLAYER_POST_EXTRA = [
  // matchday (15)
  { tag: 'matchday', text: ({ p }) => `Veille de match. La concentration monte. ${p.club} ⚽` },
  { tag: 'matchday', text: () => `On y est. 90 minutes pour tout donner. 🦁` },
  { tag: 'matchday', text: ({ p }) => `${p.club} dans le cœur. À demain au stade.` },
  { tag: 'matchday', text: () => `Briefing tactique terminé. Place au terrain demain.` },
  { tag: 'matchday', text: () => `On joue chez nous. La maison, les couleurs, les supporters. ❤️` },
  { tag: 'matchday', text: () => `Dur déplacement à venir. On part en guerre.` },
  { tag: 'matchday', text: () => `Le derby n'est pas un match comme les autres. 👊` },
  { tag: 'matchday', text: ({ p }) => `Soir de match européen avec ${p.club}. Histoire à écrire.` },
  { tag: 'matchday', text: () => `Préparation finale. Mental verrouillé.` },
  { tag: 'matchday', text: () => `Causerie d'avant-match. Le groupe est prêt.` },
  { tag: 'matchday', text: () => `Match à élimination directe. Pas le droit à l'erreur.` },
  { tag: 'matchday', text: () => `On joue pour les 3 points. Rien d'autre ne compte.` },
  { tag: 'matchday', text: () => `Stade plein attendu. Énergie max ce soir.` },
  { tag: 'matchday', text: ({ p }) => `Le maillot de ${p.club} pèse lourd. C'est un honneur.` },
  { tag: 'matchday', text: () => `Vamos. 🇪🇸🔥` },

  // training (15)
  { tag: 'training', text: () => `Récup active. Vélo + sauna. ✅` },
  { tag: 'training', text: () => `Atelier finition aujourd'hui. Beaucoup de boulot. 🎯` },
  { tag: 'training', text: () => `Coupe-jambes en fin de séance. Mais on adore ça (ou pas) 😅` },
  { tag: 'training', text: () => `Travail spécifique avec le coach des gardiens... non je rigole 😂` },
  { tag: 'training', text: () => `Premier jour de reprise. Dur mais nécessaire. 💪` },
  { tag: 'training', text: () => `Stage de cohésion lancé. Le groupe vit bien. 🤝` },
  { tag: 'training', text: () => `Vidéo séance avec l'analyste. On apprend toujours.` },
  { tag: 'training', text: () => `Travail individuel ce matin. Renforcer les détails.` },
  { tag: 'training', text: () => `Test physique aujourd'hui. Les chiffres parlent. 📈` },
  { tag: 'training', text: () => `Nouveau préparateur, nouvelles méthodes. Curieux. 🧠` },
  { tag: 'training', text: () => `Travail tactique pendant 2h. Le coach veut tout caler.` },
  { tag: 'training', text: () => `Un peu de toros pour finir 🐂 le truc qu'on préfère` },
  { tag: 'training', text: () => `Séance ouverte au public. Merci pour la chaleur ❤️` },
  { tag: 'training', text: () => `Reprise après international break. Retrouver les automatismes.` },
  { tag: 'training', text: () => `Toujours le premier arrivé, le dernier parti. C'est ça le métier.` },

  // goal / match (15)
  { tag: 'goal', text: () => `But, victoire, fierté. La trilogie parfaite. 🏆` },
  { tag: 'goal', text: () => `Doublé ce soir. Mais c'est avant tout l'équipe qui gagne. 🙌` },
  { tag: 'goal', text: () => `Passe décisive et 3 points. On valide. ✅` },
  { tag: 'goal', text: () => `Premier but au stade. Inoubliable. ❤️` },
  { tag: 'goal', text: () => `Un match XXL collectivement. Bravo à tous.` },
  { tag: 'goal', text: () => `Dur soir, on encaisse trop. On bosse, on revient plus fort.` },
  { tag: 'goal', text: () => `Match nul mais beaucoup de leçons. On retient le positif.` },
  { tag: 'goal', text: () => `Défaite difficile. Pas le temps de pleurer, déjà tournés vers la suite.` },
  { tag: 'goal', text: () => `Clean sheet ce soir. Le bloc défensif a tenu. 🛡️` },
  { tag: 'goal', text: () => `Première titularisation européenne. Émotion forte. 🇪🇺` },
  { tag: 'goal', text: () => `Capitaine ce soir. Un honneur que je n'oublierai jamais. 🫡` },
  { tag: 'goal', text: () => `Retour gagnant après blessure. Les sensations reviennent. 💪` },
  { tag: 'goal', text: () => `Match référence selon la presse. Je préfère penser au prochain. 🙏` },
  { tag: 'goal', text: () => `Quel public ce soir. Sans vous on n'y arriverait pas. ❤️` },
  { tag: 'goal', text: () => `On ramène les 3 points de l'extérieur. Précieux.` },

  // training/family/dream (15)
  { tag: 'family', text: () => `Anniversaire de mon petit frère 🎂 priorité famille avant tout.` },
  { tag: 'family', text: () => `Maman fait toujours les meilleurs plats. Recharge totale. 🍽️` },
  { tag: 'dream', text: () => `Quand on rêve grand, on bosse encore plus dur. ✨` },
  { tag: 'dream', text: () => `Petit garçon qui regardait les matchs à la TV... aujourd'hui c'est lui sur le terrain. 🥹` },
  { tag: 'recovery', text: () => `Cryothérapie ce matin. -110°C, ça réveille. 🧊` },
  { tag: 'recovery', text: () => `Massage + osthéo. Le corps doit suivre le rythme.` },
  { tag: 'travel', text: () => `Direction l'aéroport. Long voyage, bons écouteurs. 🎧` },
  { tag: 'travel', text: () => `Premier vol charter de la saison avec les gars. Cool ambiance.` },
  { tag: 'sponsor', text: () => `Shooting photo pour la nouvelle collection. Bientôt en boutique. 📸` },
  { tag: 'sponsor', text: () => `Heureux d'accueillir une nouvelle marque dans mon staff. 🤝` },
  { tag: 'milestone', text: () => `100e match en pro aujourd'hui. Le chemin a été long. 🛤️` },
  { tag: 'milestone', text: () => `5 ans dans ce club. Merci pour tout, l'aventure continue. 💚` },
  { tag: 'gratitude', text: () => `Reconnaissant pour ce groupe, ce staff, cette ville.` },
  { tag: 'gratitude', text: () => `Pas toujours facile. Mais entouré, tout devient possible. 🙏` },
  { tag: 'fan', text: () => `Vu le tifo aujourd'hui, frissons garantis. Merci les ultras. ❤️🔥` },

  // affinités / duo (10)
  { tag: 'duo', text: ({ p, partner }) => `Avec ${partner ?? 'mon frère'} sur le terrain, on parle pas, on se comprend. 🤝` },
  { tag: 'duo', text: ({ partner }) => `Mention spéciale à ${partner ?? 'mon partenaire'} pour la passe décisive. 🔥` },
  { tag: 'duo', text: ({ partner }) => `${partner ?? 'Toi'} et moi, c'est juste le début. 💪` },
  { tag: 'duo', text: ({ partner }) => `On gagne ensemble, on perd ensemble. Avec ${partner ?? 'lui'} c'est pareil.` },
  { tag: 'duo', text: ({ partner }) => `Un coéquipier comme ${partner ?? 'lui'}, tout joueur en rêve.` },
  { tag: 'rivalry', text: ({ rival }) => `${rival ?? 'Lui'} et moi on n'a pas besoin de se parler. Le terrain parlera.` },
  { tag: 'rivalry', text: () => `On choisit pas ses coéquipiers. On choisit son comportement.` },
  { tag: 'leader', text: () => `Brassard ce soir. Plus de devoir que d'honneur. 🫡` },
  { tag: 'leader', text: () => `Capitaine, ce n'est pas un titre, c'est un rôle quotidien.` },
  { tag: 'fan', text: () => `Lecture des messages des supporters. Ça remet les choses en place. ❤️` },
];

// ============= 60+ POSTS CLUBS additionnels =============
export const CLUB_POST_EXTRA = [
  // standings / classement
  { tag: 'standings', text: ({ club, rank }) => `📊 Classement L1 mis à jour. ${club} actuellement ${rank ?? '?'}e. Fier de notre parcours.` },
  { tag: 'standings', text: ({ club }) => `🏆 Une victoire de plus pour ${club}. Le travail paie.` },
  { tag: 'standings', text: ({ club }) => `🤝 Match nul à l'extérieur. Précieux pour ${club}.` },
  { tag: 'standings', text: ({ club }) => `😤 Défaite ce soir. ${club} se relèvera.` },
  { tag: 'topscorers', text: ({ p }) => `🥇 ${p.firstName} ${p.lastName} dans le top 5 des buteurs du championnat. 🔥` },
  { tag: 'topscorers', text: ({ p }) => `📈 ${p.lastName} : ${p.seasonStats?.goals ?? '?'} buts cette saison. Quelle régularité.` },
  // mercato
  { tag: 'mercato', text: ({ club }) => `🚨 Officiel — Nouvelle recrue arrive à ${club}. Bienvenue dans la famille.` },
  { tag: 'mercato', text: ({ club }) => `📝 Prolongation officielle annoncée. ${club} sécurise son avenir.` },
  { tag: 'mercato', text: ({ p }) => `Communiqué : ${fullName(p)} est libre de discuter avec d'autres clubs.` },
  { tag: 'mercato', text: ({ p, club }) => `Décision actée : ${fullName(p)} reste à ${club} pour le second semestre.` },
  // training
  { tag: 'training', text: ({ club }) => `⚽ Reprise de l'entraînement à ${club}. Saison 2 démarre fort.` },
  { tag: 'training', text: ({ p }) => `Top niveau de ${p.firstName} à l'entraînement ce matin. 📸` },
  { tag: 'training', text: ({ club }) => `Stage de pré-saison terminé. ${club} de retour en ville.` },
  // matchday
  { tag: 'matchday', text: ({ club }) => `🔥 J-1. Tout le club derrière les joueurs. Allez ${club} !` },
  { tag: 'matchday', text: ({ club }) => `📺 Diffusion du match en direct sur l'application ${club}. Abonnez-vous.` },
  { tag: 'matchday', text: ({ club }) => `🎟️ Affluence record annoncée pour le prochain match à ${club}.` },
  // press
  { tag: 'press', text: ({ club }) => `🎤 Conférence de presse du coach à 14h. À suivre sur les chaînes officielles ${club}.` },
  { tag: 'press', text: ({ p }) => `📺 ${p.firstName} interviewé en exclu cette semaine. Diffusion vendredi.` },
  // fan / social
  { tag: 'fan', text: ({ club }) => `💚 100% des recettes du prochain match reversées à une asso. Merci ${club}.` },
  { tag: 'fan', text: ({ club }) => `🌍 Tournée internationale ${club} cet été. Restez connectés.` },
  // tactics
  { tag: 'tactics', text: ({ club }) => `Le coach annonce un changement de système pour le prochain match. Suspense. ${club} ⚙️` },
  { tag: 'tactics', text: ({ club }) => `Académie ${club} : 3 jeunes intègrent le groupe pro. L'avenir s'écrit à la maison.` },
  // trophée / saison
  { tag: 'trophy', text: ({ club }) => `🏆 ${club} conserve son titre ! Histoire écrite ce soir.` },
  { tag: 'trophy', text: ({ club }) => `🥈 Belle saison pour ${club}. Rendez-vous l'an prochain.` },
  { tag: 'trophy', text: ({ club, p }) => `${fullName(p)} élu joueur de la saison ${club}. Méritée.` },
  // sponsor / boutique
  { tag: 'sponsor', text: ({ club }) => `🛍️ Drop maillot third dévoilé. Disponible vendredi. ${club}.` },
  { tag: 'sponsor', text: ({ club }) => `🤝 Nouveau sponsor maillot annoncé. ${club} change de dimension.` },
  // controverse / crise
  { tag: 'press', text: ({ club }) => `Communiqué : ${club} dément formellement les rumeurs concernant son entraîneur.` },
  { tag: 'press', text: ({ club }) => `${club} prend la défense de son joueur face aux propos déplacés. Tolérance zéro.` },
  // contrats jeunes
  { tag: 'contract', text: ({ club, p }) => `📜 ${fullName(p)} signe son premier contrat pro avec ${club}. Bravo gamin !` },
  { tag: 'contract', text: ({ club }) => `${club} prolonge son capitaine. Continuité.` },
];

// ============= 80+ POSTS PRESSE additionnels =============
export const PRESS_POST_EXTRA = [
  // mercato (20)
  { tag: 'mercato', text: ({ p }) => `🚨 EXCLU — Premier contact entre ${p.club} et un agent madrilène pour ${fullName(p)}.` },
  { tag: 'mercato', text: ({ p }) => `Mercato — Le PSG suit attentivement ${fullName(p)} pour le prochain mercato hivernal.` },
  { tag: 'mercato', text: ({ p }) => `🇮🇹 Selon nos infos, la Juventus active ses contacts pour ${p.lastName}.` },
  { tag: 'mercato', text: ({ p }) => `Aston Villa prêt à mettre 25M€ sur la table pour ${fullName(p)} (source : entourage).` },
  { tag: 'mercato', text: ({ p }) => `Une réunion à Paris mardi entre ${p.club} et le clan ${p.lastName}. Prolongation ?` },
  { tag: 'mercato', text: ({ p }) => `Bayer Leverkusen confirme un intérêt concret pour ${fullName(p)}.` },
  { tag: 'mercato', text: ({ p }) => `${p.club} bloque tout départ de ${p.lastName} avant la fin de saison.` },
  { tag: 'mercato', text: ({ p }) => `Brighton serait prêt à inclure une clause de revente pour récupérer ${p.lastName}.` },
  { tag: 'mercato', text: ({ p }) => `Premier League — 3 clubs sur ${fullName(p)}. La concurrence s'intensifie.` },
  { tag: 'mercato', text: ({ p }) => `MLS — Inter Miami discute en coulisses avec l'entourage de ${p.lastName}.` },
  // perfs / stats
  { tag: 'goal', text: ({ p }) => `📊 ${fullName(p)} : meilleure note de la journée selon SofaScore.` },
  { tag: 'goal', text: ({ p }) => `xG cumulé de ${p.firstName} sur 10 matchs : dans le top 3 européen à son poste.` },
  { tag: 'goal', text: ({ p }) => `${p.lastName} dépasse la barre des 50 buts en carrière. Régularité folle.` },
  { tag: 'goal', text: ({ p }) => `${fullName(p)} aligné sur tous les matchs de la saison. Inarrêtable.` },
  { tag: 'goal', text: ({ p }) => `Performance XXL de ${p.firstName} : 1 but, 2 passes, MOTM.` },
  { tag: 'goal', text: ({ p }) => `${p.club} sans ${p.lastName} ? -1.4 pts par match en moyenne. Indispensable.` },
  // perfs négatives
  { tag: 'press', text: ({ p }) => `${fullName(p)} dans le dur. 4 matchs sans but. Doute installé.` },
  { tag: 'press', text: ({ p }) => `Forme inquiétante pour ${p.firstName}. Le coach prêt à le sortir du onze ?` },
  { tag: 'press', text: ({ p }) => `Ambiance tendue à ${p.club}. ${p.lastName} pointé du doigt en interne.` },
  // contrat
  { tag: 'contract', text: ({ p }) => `Réunion contractuelle programmée. Salaire doublé sur la table pour ${p.lastName}.` },
  { tag: 'contract', text: ({ p }) => `${fullName(p)} refuse une première offre de prolongation. Direction sous pression.` },
  // sélection nationale
  { tag: 'press', text: ({ p }) => `🇫🇷 Sélection — ${fullName(p)} dans la pré-liste pour la prochaine fenêtre internationale.` },
  { tag: 'press', text: ({ p }) => `Le sélectionneur évoque ${p.lastName} : « Il a tout pour devenir un cadre. »` },
  { tag: 'press', text: ({ p }) => `${fullName(p)} non-retenu malgré ses statistiques. Polémique sur les choix du sélectionneur.` },
  { tag: 'press', text: ({ p }) => `Ses stats en équipe nationale : ${fullName(p)} décisif sur ses 5 dernières apparitions.` },
  // société / coulisses
  { tag: 'press', text: ({ p }) => `${p.firstName} engagé dans une nouvelle action solidaire. Image en hausse.` },
  { tag: 'press', text: ({ p }) => `Documentaire à venir : 90 minutes dans la vie de ${fullName(p)}.` },
  { tag: 'press', text: ({ p }) => `${p.lastName} change de coach mental. Travail spécifique pour passer un cap.` },
  // blessures
  { tag: 'press', text: ({ p }) => `🩺 ${fullName(p)} sorti sur blessure. Examens prévus ce lundi.` },
  { tag: 'press', text: ({ p }) => `Bonne nouvelle : ${p.lastName} reprend la course. Retour estimé à 2 semaines.` },
  // affinités
  { tag: 'press', text: ({ p, partner }) => `Le duo ${p.lastName}-${partner ?? 'X'} affole les statistiques européennes.` },
  { tag: 'press', text: ({ p, rival }) => `Tension dans le vestiaire : ${p.firstName} et ${rival ?? '?'} ne se parlent plus.` },
  // championnat
  { tag: 'standings', text: ({ club }) => `Course au titre : ${club} repasse devant à la différence de buts.` },
  { tag: 'standings', text: ({ club }) => `Course au maintien : ${club} sous pression à 5 journées de la fin.` },
  { tag: 'standings', text: ({ club }) => `Bilan mi-saison ${club} : objectifs en avance sur le calendrier.` },
];

// ============= 60+ POSTS FANS additionnels =============
export const FAN_POST_EXTRA = [
  { tag: 'fan', text: ({ p }) => `${p.firstName} c'est mon dieu vivant je rigole pas 🙏` },
  { tag: 'fan', text: ({ p }) => `Frérot ${p.lastName} continue tu vas tout casser 🔥` },
  { tag: 'fan', text: ({ p }) => `On est là quoi qu'il arrive ${p.firstName}, ne lâche pas 💚` },
  { tag: 'fan', text: () => `Nan mais ce match il était wow ce soir ✨` },
  { tag: 'fan', text: ({ p }) => `Pancarte ${p.lastName} déjà imprimée pour samedi 📜` },
  { tag: 'mercato', text: ({ p }) => `S'il vous plaît gardez ${p.lastName} bordel 😭🙏` },
  { tag: 'mercato', text: ({ p }) => `Si on vend ${p.firstName} 30M€ c'est le braquage du siècle (à l'envers)` },
  { tag: 'mercato', text: () => `Direction si tu nous écoutes — recrute un 9, pas un autre milieu` },
  { tag: 'goal', text: ({ p }) => `${p.firstName} ce qu'il fait avec le ballon c'est pas légal 😤❤️` },
  { tag: 'goal', text: ({ p }) => `${fullName(p)} = MVP de la saison sans débat possible` },
  { tag: 'press', text: () => `Les médias détestent les supporters c'est officiel maintenant 🙃` },
  { tag: 'press', text: ({ p }) => `Lâchez ${p.lastName} avec vos rumeurs pourries svp` },
  { tag: 'matchday', text: () => `Stade plein dimanche, on met le feu 🔥🔥` },
  { tag: 'matchday', text: () => `J'ai pris ma place pour le déplacement à 800km. C'est ça l'amour 💚` },
  { tag: 'training', text: ({ p }) => `Vu ${p.firstName} à l'entraînement ouvert. Forme olympique le bonhomme 💪` },
  { tag: 'fan', text: () => `Petit message au coach : LIBÈRE LES JEUNES 🙏🙏` },
  { tag: 'fan', text: () => `Tifo de samedi va défoncer Internet, je vous le dis 😏` },
  { tag: 'fan', text: () => `Quand les joueurs viennent saluer le parcage on oublie tout ❤️` },
  { tag: 'mercato', text: () => `Mercato hivernal : on attend bouger les lignes svp 📞` },
  { tag: 'fan', text: ({ p }) => `${p.lastName} tu es notre fierté, point. Personne touche.` },
  // duo / rivalité
  { tag: 'duo', text: ({ p, partner }) => `Le duo ${p.lastName}/${partner ?? 'X'} = futur ballon d'or à deux 😍` },
  { tag: 'rivalry', text: ({ p, rival }) => `Faut choisir : ${p.lastName} ou ${rival ?? "l'autre"} ? Vestiaire à recadrer 🚨` },
  // critique modérée
  { tag: 'press', text: ({ p }) => `${p.firstName} doit hausser le ton, on attend plus de lui en match couperet.` },
  { tag: 'press', text: () => `Coach faut bouger le système, on tourne en rond là.` },
  // sélection
  { tag: 'press', text: ({ p }) => `${fullName(p)} mérite la sélection, fin du débat 🇫🇷` },
  { tag: 'press', text: ({ p }) => `Le sélectionneur dort sur ${p.lastName}. Honteux.` },
  // banque humour
  { tag: 'fan', text: () => `Encore un derby perdu, je vais déménager 😩` },
  { tag: 'fan', text: () => `On a gagné ! Je peux enfin retourner travailler en paix lundi 😎` },
];

// ============= 80+ CHIRP TEMPLATES additionnels =============
export const PULSE_TEMPLATES_EXTRA = [
  // mercato
  ({ p }) => `🚨 BREAKING — ${fullName(p)} discute en secret avec un cador anglais. Réunion prévue à Londres ✈️`,
  ({ p }) => `Un agent Global Football Board travaille un transfert XXL pour ${fullName(p)}. Plus d'infos 24h.`,
  ({ p }) => `${p.club} fixe le prix de ${p.lastName} à 35M€. Trop cher selon les cadors européens.`,
  ({ p }) => `Pré-accord trouvé entre ${p.lastName} et un club de Bundesliga. Reste à convaincre ${p.club}.`,
  ({ p }) => `Le clan ${p.lastName} demande un salaire revu à la hausse. ${p.club} étudie.`,
  // perfs
  ({ p }) => `🏆 Note ${Math.round(p.rating ?? 70) + 5} pour ${fullName(p)} ce soir. Performance majuscule.`,
  ({ p }) => `${p.firstName} dans le 11 type européen de la semaine selon WhoScored.`,
  ({ p }) => `${fullName(p)} = +1.2 buts attendus de différentiel sur ses 5 derniers matchs. Décisif.`,
  ({ p }) => `Stat folle : ${p.lastName} touche 92 ballons par match en moyenne. Patron.`,
  // sélection
  ({ p }) => `🇫🇷 ${fullName(p)} convoqué pour la prochaine trêve internationale. Officiel.`,
  ({ p }) => `Sélection : ${fullName(p)} non-retenu. Polémique en vue.`,
  ({ p }) => `${p.firstName} décisif en sélection ce soir. Sa cote internationale grimpe en flèche.`,
  // contrat
  ({ p }) => `Signature en vue : ${fullName(p)} prolongerait jusqu'en 2030. Salaire : confidentiel.`,
  ({ p }) => `${p.club} active la clause libératoire de ${p.lastName}. Mouvement attendu sous 72h.`,
  // blessure
  ({ p }) => `🩺 Sorti à la 30e minute, ${fullName(p)} passe une IRM dans la nuit.`,
  ({ p }) => `Bonne nouvelle pour ${p.club} : ${p.lastName} de retour à l'entraînement collectif.`,
  // social
  ({ p }) => `Story Insta cryptée de ${p.firstName} en pleine nuit. Internet enquête. 🔍`,
  ({ p }) => `${fullName(p)} repéré dans un restaurant de luxe avec un agent connu. Coïncidence ?`,
  // duo / rival
  ({ p, partner }) => `Le duo ${p.lastName}/${partner ?? 'X'} affole les statistiques européennes. 🔥`,
  ({ p, rival }) => `🚨 Tension : ${p.firstName} et ${rival ?? 'X'} ne se sont pas adressés la parole tout le match.`,
  // championnat
  ({ p }) => `${p.club} reprend la 1ère place. ${p.lastName} décisif dans cette dynamique.`,
  ({ p }) => `${p.club} en zone rouge. La direction réfléchit à un changement de coach.`,
  // Europe
  ({ p }) => `🌍 ${fullName(p)} qualifie ${p.club} pour la phase suivante en Europe. ⭐`,
  ({ p }) => `${p.club} éliminé en C1. Soirée noire pour les supporters.`,
  // jeunes
  ({ p }) => `Pépite — ${fullName(p)} (${Math.max(17, (p.age ?? 22) - 3)} ans) explose tout en U21.`,
  // hommage
  ({ p }) => `${p.club} rendra hommage à ${fullName(p)} avant le coup d'envoi. Émotion attendue.`,
];

// ============= 100+ PULSE_NO_PLAYER additionnels =============
export const PULSE_NO_PLAYER_EXTRA = [
  { name: 'XGFanatic', handle: '@xg_fanatic', text: '📊 Bilan offensif Ligue 1 J18 : 5 attaquants surperforment leur xG, restez branchés 👀' },
  { name: 'TacticBoard', handle: '@tacticboard', text: 'Le retour du libéro à 3 défenseurs : la mode Italie débarque en France ?' },
  { name: 'TransferRoom', handle: '@transferroom', text: '🚨 Plusieurs gros transferts attendus dans les 48h. Restez connectés.' },
  { name: 'ScoutEurope', handle: '@scout_europe', text: 'Les 5 jeunes les plus convoités d\'Europe selon nos scouts. Thread 🧵' },
  { name: 'MercatoLive', handle: '@mercatolive', text: 'INFO : un grand club allemand cherche un milieu défensif gaucher. Plusieurs noms évoqués.' },
  { name: 'StatsZone', handle: '@statszone', text: 'Top 10 PPG (points per goal) en Europe : surprises dans le top 5 ⬇️' },
  { name: 'AgentInsider', handle: '@agentinsider', text: 'Un cabinet français vient de signer 3 talents internationaux en 2 mois.' },
  { name: 'TouchlineFR', handle: '@touchline_fr', text: 'Conférence UEFA demain : nouvelles règles sur le fair-play financier attendues.' },
  { name: 'BuzzerBeater', handle: '@buzzerbeater', text: '🤯 Action de la semaine : retournée à 25m, lucarne. Vidéo dispo.' },
  { name: 'TeamTalkFR', handle: '@teamtalk_fr', text: 'Quel club a la meilleure recrue de cette fenêtre ? Sondage en cours.' },
  { name: 'ChirpDeals', handle: '@chirpdeals', text: '🎁 Tirage au sort : 2 places pour le Classique. Like + RT pour participer.' },
  { name: 'StatsZone', handle: '@statszone', text: 'Le pressing collectif augmente de 12% sur la saison en Ligue 1. La tendance.' },
  { name: 'MercatoLive', handle: '@mercatolive', text: '📅 Ouverture officielle du mercato d\'hiver dans 3 semaines. Préparez le pop-corn.' },
  { name: 'TacticBoard', handle: '@tacticboard', text: 'Animation offensive du Real cette semaine : rotation à 5, on décortique.' },
  { name: 'XGFanatic', handle: '@xg_fanatic', text: 'Top 5 gardiens xG saved Europe : un Français dans le classement, surprise.' },
  { name: 'ChirpScout', handle: '@chirpscout', text: 'Dossier : comment les agents européens construisent un transfert XXL.' },
  { name: 'TransferRoom', handle: '@transferroom', text: 'OFF — Plusieurs clubs MLS prêts à payer cash pour des cadres européens en fin de contrat.' },
  { name: 'ScoutEurope', handle: '@scout_europe', text: 'On a vu Académie Wydad ce week-end : 2 talents à suivre absolument.' },
  { name: 'TouchlineFR', handle: '@touchline_fr', text: 'Rumeur : un sélectionneur européen pourrait quitter son poste avant l\'Euro. Surprise.' },
  { name: 'TeamTalkFR', handle: '@teamtalk_fr', text: 'Ligue des Champions : tirage au sort des 8e dans 48h. Affiches XXL en vue.' },
  { name: 'StatsZone', handle: '@statszone', text: 'Distance moyenne parcourue par match en L1 cette saison : 109,4 km. Record.' },
  { name: 'BuzzerBeater', handle: '@buzzerbeater', text: 'Compilation des plus belles passes décisives de la semaine. Liens dans le profil.' },
  { name: 'AgentInsider', handle: '@agentinsider', text: 'Salaires des coachs L1 : top 3 dévoilé. Le 1er ne joue pas en Coupe d\'Europe 😬' },
  { name: 'MercatoLive', handle: '@mercatolive', text: '🔥 Une équipe italienne intéressée par 2 jeunes français du même club. À suivre.' },
  { name: 'TacticBoard', handle: '@tacticboard', text: 'Pourquoi le 3-4-2-1 revient à la mode en Premier League ? Notre analyse.' },
  { name: 'ChirpDeals', handle: '@chirpdeals', text: 'Code promo de la semaine pour la boutique officielle. Profitez-en !' },
  { name: 'XGFanatic', handle: '@xg_fanatic', text: 'L\'attaquant le plus efficace par minute jouée en Europe ? Vous serez surpris.' },
  { name: 'ScoutEurope', handle: '@scout_europe', text: 'On suit ce milieu de 19 ans qui joue en D2. Profil rare.' },
  { name: 'TransferRoom', handle: '@transferroom', text: 'Marché des U23 : record de transactions cette saison. Inflation.' },
  { name: 'StatsZone', handle: '@statszone', text: 'Top 10 dribbles réussis par 90 minutes en Europe : l\'Espagne domine.' },
  // sélections
  { name: 'TeamTalkFR', handle: '@teamtalk_fr', text: '🇫🇷 Liste des Bleus officialisée à 12h. Les 5 surprises possibles 👀' },
  { name: 'ChirpScout', handle: '@chirpscout', text: 'Sélection brésilienne : un nouveau capitaine désigné. Personne ne s\'y attendait.' },
  { name: 'TouchlineFR', handle: '@touchline_fr', text: '🇦🇷 L\'Argentine prépare sa tournée internationale. Liste élargie demain.' },
  { name: 'MercatoLive', handle: '@mercatolive', text: '🇪🇸 La Roja change de sélectionneur à 6 mois de l\'Euro. Choc.' },
  // championnats
  { name: 'StatsZone', handle: '@statszone', text: 'Course au titre PL : à 12 points près, n\'importe quoi peut arriver d\'ici mai.' },
  { name: 'TacticBoard', handle: '@tacticboard', text: 'Bundesliga : le pressing du Bayer Leverkusen disséqué. Modèle européen.' },
  { name: 'XGFanatic', handle: '@xg_fanatic', text: 'Serie A : Naples redevient surprenant dans la verticalité. Stats à l\'appui.' },
  // Europe
  { name: 'TouchlineFR', handle: '@touchline_fr', text: '🌍 Mondial des Clubs cet été : 32 équipes. Nouveau format, gros enjeux.' },
  { name: 'TransferRoom', handle: '@transferroom', text: '🏆 Les clubs européens finalisent leur préparation avant le retour des soirées continentales.' },
];

// ============= COMMENTAIRES additionnels (50+) =============
export const COMMENT_POOL_EXTRA = [
  () => `+1 totalement d'accord`,
  () => `Faut arrêter de troller stp`,
  ({ p }) => `${p.firstName} > tout le monde, fin du débat`,
  () => `Sources fiables ? Sinon c'est juste du buzz`,
  () => `Bon là vraiment c'est exagéré`,
  ({ p }) => `Si ${p.lastName} part j'arrête de soutenir le club, dit en l'air`,
  () => `Vous dites ça à chaque mercato 😴`,
  ({ p }) => `Coach laisse-le sur le banc, ${p.firstName} bosse pas en ce moment`,
  () => `Le foot français a tellement régressé sur l'analyse...`,
  () => `Article complotiste de plus à ajouter à la collection 📚`,
  ({ p }) => `${p.firstName} va exploser à l'étranger, vous verrez`,
  () => `Toujours les mêmes médias qui balancent les mêmes intox`,
  () => `Je suis content qu'on prolonge enfin un cadre 👏`,
  () => `Bah voilà encore une rumeur sortie de nulle part 🙄`,
  ({ p }) => `${p.lastName} mérite mieux que ce club soyons honnêtes`,
  ({ p }) => `Faut le payer correctement ${p.firstName}, sinon il part c'est sûr`,
  () => `Très bonne nouvelle pour la suite 💪`,
  ({ p }) => `${p.firstName} est sur-évalué clairement`,
  ({ p }) => `${p.firstName} est sous-évalué clairement`,
  () => `J'ai zéro confiance dans la direction là-dessus 🤡`,
  // affinités
  ({ p, partner }) => `Le duo ${p.lastName}/${partner ?? 'X'} c'est le truc le plus excitant de la saison`,
  ({ p, rival }) => `${p.lastName} et ${rival ?? 'X'} se détestent c'est visible à l'œil nu`,
  () => `Le vestiaire va imploser cette saison, je vous le dis 🍿`,
  () => `Trop d'égo dans ce groupe, ça finit toujours mal`,
  () => `Beau geste, beau message, on aime 👍`,
];

// ============= NOUVEAUX HASHTAGS Chirp =============
export const PULSE_HASHTAGS_EXTRA = [
  'derbynight', 'matchnight', 'classique', 'jeunesse', 'staff', 'vestiaire',
  'topscorers', 'cleansheet', 'ligue1', 'liguedeschampions', 'europaleague',
  'mondialdesclubs', 'supercoupe', 'sélection', 'fairplay', 'agents',
  'buzz', 'prolongation', 'rumeur', 'transfert', 'ouf', 'classement',
];
