import { makeId, pick } from '../utils/helpers';

const MESSAGE_TYPES = {
  transfer_request: [
    { subject: 'Je veux parler de mon avenir', body: "J'ai besoin de savoir si tu as un plan clair pour moi. Je ne veux pas stagner ici." },
    { subject: 'Des clubs me regardent', body: "Je sens que c'est peut-être le bon moment pour écouter le marché. Tu en penses quoi ?" },
    { subject: 'On vise plus haut ?', body: "Je veux jouer un cran au-dessus. Dis-moi si tu peux ouvrir des portes sérieuses." },
    { subject: 'Je veux un plan mercato', body: "Si une offre sérieuse arrive, je veux qu'on l'étudie ensemble. Pas découvrir ça dans la presse." },
    { subject: 'Le moment est venu', body: "Cette saison c'est la bonne. Je me sens prêt pour le niveau supérieur. Travaille dessus." },
    { subject: 'Je stagne ici', body: "Honnêtement, je sens que je plafonne dans ce club. Explore le marché pour moi s'il te plaît." },
    { subject: 'Une opportunité se présente', body: "On m'a parlé d'un club qui s'intéresse. Je préfère que ça passe par toi avant que ça devienne compliqué." },
    { subject: 'Ambitions revues à la hausse', body: "Après cette saison, je me sens capable de beaucoup plus. J'ai besoin que tu me portes vers quelque chose de grand." },
  ],
  raise_request: [
    { subject: 'Mon contrat doit évoluer', body: "Mes performances montent. Je veux que mon salaire suive. C'est la moindre des choses." },
    { subject: 'On peut reparler argent ?', body: "Je fais les efforts. J'aimerais sentir que le club et l'agence le voient aussi." },
    { subject: 'Mon entourage me pousse', body: "On me répète que je suis sous-payé. J'ai besoin que tu reprennes la main là-dessus." },
    { subject: 'Mes chiffres parlent d\'eux-mêmes', body: "Regarde les stats. Aucun joueur à ce niveau dans ce championnat n'est payé aussi peu. Agis." },
    { subject: 'Question de respect', body: "C'est pas juste l'argent — c'est ce que ça représente. Le club me respecte ou pas ?" },
    { subject: 'Nouvelle offre externe reçue', body: "J'ai reçu des signaux de l'extérieur sur le salaire. Avant d'aller plus loin, j'ai besoin de savoir ce que tu peux faire ici." },
  ],
  complaint: [
    { subject: 'On doit régler ça', body: "Je n'ai pas aimé la manière dont la situation a été gérée cette semaine. Appelle-moi." },
    { subject: 'Je perds confiance', body: "J'ai besoin d'être mieux accompagné. Là, je me sens un peu seul dans tout ça." },
    { subject: "Il faut qu'on parle", body: "La pression monte autour de moi. Je veux une réponse claire de ta part, pas des généralités." },
    { subject: 'Je ne comprends pas', body: "J'ai l'impression que les décisions se prennent sans moi. Ça commence à peser vraiment." },
    { subject: 'Situation critique', body: "J'ai besoin de savoir que mon agent est dans mon camp à 100%. En ce moment, j'en doute." },
    { subject: 'Déçu par la gestion', body: "La dernière situation n'a pas été bien gérée. Je méritais mieux comme soutien de ta part." },
    { subject: 'Le moral n\'y est plus', body: "Je joue, mais la tête est ailleurs. Tu dois faire quelque chose — vite." },
    { subject: 'Trop de silence de ta part', body: "Des semaines sans nouvelles de toi, c'est pas normal. Je ne suis pas qu'un dossier dans ton agenda." },
  ],
  thanks: [
    { subject: 'Merci pour ton soutien', body: "Ta décision m'a vraiment aidé cette semaine. Je voulais que tu le saches." },
    { subject: 'Ça compte pour moi', body: "Je sais que tu as pris un risque pour me protéger. Je m'en souviendrai." },
    { subject: 'Bonne semaine', body: "Le vestiaire a apprécié ton intervention. Je voulais te le dire directement." },
    { subject: 'Tu avais raison', body: "J'avais des doutes au moment de la décision, mais tu avais raison. Merci de m'avoir guidé." },
    { subject: 'Je me sens bien', body: "Cette semaine était incroyable. Merci d'avoir créé les conditions pour que ça arrive." },
    { subject: 'Confiance retrouvée', body: "Depuis qu'on a réglé la situation ensemble, je retrouve confiance sur le terrain. Merci." },
  ],
  welcome: [
    { subject: 'Heureux de rejoindre ton agence', body: "Merci pour ta confiance. J'ai hâte de voir jusqu'où on peut aller ensemble." },
    { subject: 'Nouveau départ', body: "Content de signer avec toi. J'attends un vrai plan de carrière, pas juste des promesses." },
    { subject: 'On commence fort', body: "Je viens pour progresser, pas juste pour remplir ton portefeuille. Fixons une trajectoire claire." },
    { subject: 'Merci pour la confiance', body: "Mon entourage est rassuré. Maintenant, j'ai besoin d'un suivi régulier et d'ambition." },
    { subject: 'Motivé', body: "J'avais besoin d'un agent qui croit vraiment en moi. J'espère que tu es celui-là. Prouve-le." },
    { subject: 'Prêt pour la suite', body: "Cette signature, c'est un nouveau chapitre. Montre-moi ce que tu vaux sur le marché." },
  ],

  // ─── NOUVEAUX TYPES ───────────────────────────────────────────────
  injury_worry: [
    { subject: 'Cette blessure me ronge', body: "Je n'arrive pas à dormir en pensant à la durée. Est-ce que tu as parlé au staff médical ?" },
    { subject: 'Peur de ne plus être le même', body: "J'ai vu des joueurs perdre leur niveau après ce type de blessure. J'ai besoin que tu sois là." },
    { subject: 'Club qui ne donne pas de nouvelles', body: "Depuis ma blessure, le club ne me contacte plus vraiment. Tu sais quelque chose que je ne sais pas ?" },
  ],
  ambition_clash: [
    { subject: 'Mercato — et moi ?', body: "Ce mercato tourne sans moi. J'entends des noms, je vois des offres dans la presse pour d'autres. C'est quoi mon plan ?" },
    { subject: 'Je veux plus que ça', body: "On dirait que tu n'es pas actif pour moi en ce moment. C'est pas ce qu'on s'était dit." },
    { subject: 'Frustration croissante', body: "Le mercato se ferme dans quelques semaines et je n'ai aucune offre concrète. C'est normal ?" },
  ],
  secret_offer: [
    { subject: 'J\'ai été contacté directement', body: "Un club m'a approché sans passer par toi. J'ai dit que je devais te parler d'abord. Qu'est-ce qu'on fait ?" },
    { subject: 'Quelqu\'un m\'a appelé', body: "Je t'appelle parce qu'un intermédiaire m'a transmis un message d'un grand club. Tu étais au courant ?" },
    { subject: 'Contact direct — ton avis ?', body: "Je sais qu'on est censé tout faire passer par toi. Mais là c'est un club sérieux. Rappelle-moi." },
  ],
  retirement_thoughts: [
    { subject: 'Je pense à la suite', body: "À mon âge, on commence à se poser des questions. Est-ce que tu m'aides à préparer l'après-foot ?" },
    { subject: 'Encore combien d\'années ?', body: "Mon corps m'envoie des signaux. Je veux qu'on parle franchement de la fin de carrière." },
    { subject: 'Un dernier grand défi ?', body: "Avant de raccrocher, j'aimerais un dernier grand club, une dernière aventure. Tu peux faire ça pour moi ?" },
  ],
  media_pressure: [
    { subject: 'La presse me massacre', body: "Tu as vu ce qu'ils écrivent sur moi ? Je ne peux pas rester sans réagir. Qu'est-ce qu'on fait ?" },
    { subject: 'Journaliste qui m\'acharne', body: "Il y a un journaliste qui publie n'importe quoi sur moi depuis une semaine. C'est du harcèlement." },
    { subject: 'Réseaux hors de contrôle', body: "Les réseaux s'emballent sur une fausse info. Mon téléphone n'arrête pas. J'ai besoin que tu gères ça." },
  ],
  form_slump: [
    { subject: 'Je ne suis plus moi-même', body: "Depuis quelques semaines, rien ne va sur le terrain. Je ne sais pas ce qui se passe." },
    { subject: 'Le coach perd confiance', body: "Le coach ne me parle plus de la même façon. Je sens que ma place est menacée." },
    { subject: 'Besoin de sortir la tête de l\'eau', body: "C'est une période difficile. J'ai besoin d'un signe de ta part — un contact, une perspective." },
  ],
  captain_demand: [
    { subject: 'Je veux le brassard', body: "Je suis le joueur le plus expérimenté, le plus respecté du vestiaire. Pourquoi pas moi pour le capitanat ?" },
    { subject: 'Leadership reconnu', body: "Tout le monde me voit comme un leader dans ce groupe. Parle au club pour officialiser ça." },
  ],
  national_pride: [
    { subject: 'Convocation — tu savais ?', body: "J'ai reçu la convoc. Je suis sur un nuage. Merci d'avoir travaillé ça en coulisses si t'y es pour quelque chose." },
    { subject: 'Fier de représenter mon pays', body: "Cette sélection, c'est plus qu'une récompense. Ça donne envie d'aller encore plus loin." },
  ],
  life_event: [
    { subject: 'Grande nouvelle personnelle', body: "Je vais être papa. Je t'en parle parce que ça va forcément influencer mes choix sur le prochain contrat." },
    { subject: 'Période difficile en famille', body: "On traverse un moment douloureux à la maison. J'ai besoin d'un peu de stabilité en ce moment." },
    { subject: 'Je veux rester proche de ma famille', body: "Pour le prochain transfert, la localisation est prioritaire. Famille avant tout, maintenant." },
  ],
  promise_broken_warning: [
    { subject: 'Tu avais promis', body: "La promesse que tu m'avais faite n'a pas été tenue. Je dois réfléchir à la suite de notre collaboration." },
    { subject: 'Plus deux fois', body: "J'ai fait confiance, c'était une erreur. Une promesse, ça se respecte. J'attends une explication." },
  ],
  role_frustration: [
    { subject: 'Le rôle promis ?', body: "On m'a vendu un rôle important, mais je ne joue pas assez. Tu peux parler au coach ou au club ?" },
    { subject: 'Je ne suis pas venu pour le banc', body: "Je comprends la concurrence, mais là le temps de jeu ne correspond pas à ce qu'on m'a promis." },
  ],
  voice_call: [
    { subject: 'Appel demandé', body: "J'ai besoin de t'avoir au téléphone. Pas un long message — un vrai échange." },
    { subject: "Tu peux m'appeler ?", body: "Je préfère parler directement. Il y a trop de choses à clarifier par écrit." },
  ],
};

export const createMessage = ({ player, type, week, context, threadKey = null, threadLabel = null, senderRole = 'player', senderName = null }) => {
  const blueprint = pick(MESSAGE_TYPES[type] ?? MESSAGE_TYPES.complaint);

  return {
    id: makeId('msg'),
    week,
    type,
    context,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    threadKey: threadKey ?? player.id,
    threadLabel: threadLabel ?? `${player.firstName} ${player.lastName}`,
    senderRole,
    senderName: senderName ?? `${player.firstName} ${player.lastName}`,
    direction: senderRole === 'staff' ? 'incoming' : 'incoming',
    subject: blueprint.subject,
    body: blueprint.body,
    read: false,
    resolved: false,
  };
};

export const createStaffConversationMessage = ({ player, staffName, type, week, context, subject, body }) => ({
  id: makeId('msg'),
  week,
  type,
  context,
  playerId: player.id,
  playerName: `${player.firstName} ${player.lastName}`,
  threadKey: `${player.id}:staff:${context}`,
  threadLabel: staffName,
  threadContextLabel: `${player.firstName} ${player.lastName}`,
  senderRole: 'staff',
  senderName: staffName,
  direction: 'incoming',
  subject,
  body,
  read: false,
  resolved: false,
});

export const maybeCreateContextualMessage = ({ player, event, week, mercato = false, worldState = null }) => {
  if (!player) return null;

  // Priorité 1 — État critique moral/confiance
  if ((player.moral < 35 || player.trust < 35) && Math.random() < 0.65) {
    return createMessage({ player, type: 'complaint', week, context: event?.id });
  }

  // Priorité 2 — Blessure grave
  if (player.injured > 3 && Math.random() < 0.55) {
    return createMessage({ player, type: 'injury_worry', week, context: event?.id });
  }

  // Priorité 3 — Mercato sans offres + joueur ambitieux
  if (mercato && player.moral < 60 && ['ambitieux', 'mercenaire'].includes(player.personality) && Math.random() < 0.45) {
    return createMessage({ player, type: 'ambition_clash', week, context: 'mercato' });
  }

  // Priorité 4 — Transfert event → demande directe
  if (event?.type === 'transfer' && ['ambitieux', 'mercenaire'].includes(player.personality) && Math.random() < 0.45) {
    return createMessage({ player, type: 'transfer_request', week, context: event.id });
  }

  // Priorité 5 — Scandale médias → pression presse
  if (event && !event.good && event.type === 'scandal' && Math.random() < 0.35) {
    return createMessage({ player, type: 'media_pressure', week, context: event.id });
  }

  // Priorité 6 — Convocation sélection → fierté nationale
  if (event?.id === 'callup' && Math.random() < 0.6) {
    return createMessage({ player, type: 'national_pride', week, context: 'callup' });
  }
  if (event?.id === 'international_debut' && Math.random() < 0.75) {
    return createMessage({ player, type: 'national_pride', week, context: 'international_debut' });
  }

  // Priorité 7 — Bon événement → remerciements
  if (event?.good && Math.random() < 0.18) {
    return createMessage({ player, type: 'thanks', week, context: event.id });
  }

  // Priorité 8 — Mauvaise forme
  if (player.form < 52 && Math.random() < 0.25) {
    return createMessage({ player, type: 'form_slump', week, context: 'form' });
  }

  // Priorité 9 — Demande augmentation
  if (player.rating > 78 && Math.random() < 0.05) {
    return createMessage({ player, type: 'raise_request', week, context: 'form' });
  }

  // Priorité 10 — Demande capitanat (joueur leader, haute confiance)
  if (player.rating > 80 && (player.trust ?? 50) > 70 && ['leader', 'professionnel'].includes(player.personality) && Math.random() < 0.04) {
    return createMessage({ player, type: 'captain_demand', week, context: 'leadership' });
  }

  // Priorité 11 — Retraite (joueurs 32+)
  if (player.age >= 32 && Math.random() < 0.03) {
    return createMessage({ player, type: 'retirement_thoughts', week, context: 'age' });
  }

  // Priorité 12 — Contact secret (mercato, rare)
  if (mercato && Math.random() < 0.03) {
    return createMessage({ player, type: 'secret_offer', week, context: 'mercato' });
  }

  // Priorité 13 — Événement de vie (joueur loyal/leader, rare)
  if (['loyal', 'leader'].includes(player.personality) && Math.random() < 0.02) {
    return createMessage({ player, type: 'life_event', week, context: 'personal' });
  }

  return null;
};

export const responseEffects = {
  professionnel: { moral: 2, trust: 4, reputation: 1 },
  empathique: { moral: 7, trust: 8, reputation: 0 },
  ferme: { moral: -4, trust: -5, reputation: 2 },
};

const RESPONSE_OPTIONS_BY_TYPE = {
  welcome: {
    professionnel: 'Plan carrière',
    empathique: 'Écouter ses attentes',
    ferme: 'Fixer le cadre',
  },
  transfer_request: {
    professionnel: 'Préparer shortlist',
    empathique: 'Appeler ce soir',
    ferme: 'Calmer le dossier',
  },
  raise_request: {
    professionnel: 'Monter dossier salaire',
    empathique: 'Parler au club',
    ferme: 'Attendre performances',
  },
  complaint: {
    professionnel: 'Point complet',
    empathique: 'Appeler ce soir',
    ferme: 'Recadrer',
  },
  role_frustration: {
    professionnel: 'Parler au coach',
    empathique: 'Appeler ce soir',
    ferme: 'Gagner sa place',
  },
  staff_dialogue: {
    professionnel: 'Clarifier le plan',
    empathique: 'Écouter et rassurer',
    ferme: 'Poser le cadre',
  },
  media_pressure: {
    professionnel: 'Communiqué préparé',
    empathique: 'Protéger le joueur',
    ferme: 'Silence total',
  },
  secret_offer: {
    professionnel: 'Vérifier le club',
    empathique: 'Décider ensemble',
    ferme: 'Tout passe par moi',
  },
};

export const getMessageResponseOptions = (message) => RESPONSE_OPTIONS_BY_TYPE[message.type] ?? {
  professionnel: 'Réponse claire',
  empathique: 'Soutien direct',
  ferme: 'Cadre strict',
};

export const getMessageResponseAction = (message, responseType) => {
  if (message.type === 'transfer_request' && responseType === 'professionnel') return { type: 'market_watch', label: 'Shortlist mercato ouverte' };
  if (message.type === 'transfer_request' && responseType === 'empathique') return { type: 'voice_call', label: 'Appel joueur programmé ce soir' };
  if (message.type === 'raise_request' && ['professionnel', 'empathique'].includes(responseType)) return { type: 'salary_case', label: 'Dossier salaire à préparer' };
  if (message.type === 'role_frustration' && responseType === 'professionnel') return { type: 'coach_talk', label: 'Appel coach demandé' };
  if (message.type === 'role_frustration' && responseType === 'empathique') return { type: 'voice_call', label: 'Appel joueur programmé ce soir' };
  if (message.type === 'staff_dialogue' && responseType === 'professionnel') return { type: 'coach_talk', label: 'Discussion staff lancée' };
  if (message.type === 'staff_dialogue' && responseType === 'empathique') return { type: 'voice_call', label: 'Appel de cadrage programmé' };
  if (message.type === 'complaint' && responseType === 'empathique') return { type: 'voice_call', label: 'Appel de crise programmé' };
  if (message.type === 'media_pressure' && responseType === 'professionnel') return { type: 'press_release', label: 'Communiqué média préparé' };
  if (message.type === 'secret_offer' && responseType === 'professionnel') return { type: 'club_check', label: 'Vérification club lancée' };
  return null;
};

export const responseCopy = {
  professionnel: "Je te réponds clairement : on va avancer avec un plan précis, des points réguliers, et aucune décision prise sans toi.\n\nJe veux que tu saches où tu vas, ce que j'attends de toi, et ce que je fais de mon côté. On se parle cette semaine pour fixer la prochaine étape.",
  empathique: "Merci de m'avoir écrit directement.\n\nJe veux que tu te sentes accompagné, pas juste représenté. On va prendre le temps de parler de ta situation, de ce que tu ressens, et de la meilleure manière d'avancer sans te mettre sous pression.",
  ferme: "Je prends ton message au sérieux, mais on va garder un cadre professionnel.\n\nTu restes concentré sur ton travail, je m'occupe des discussions autour de toi. On avance proprement, sans bruit inutile, et chacun tient son rôle.",
};

export const getResponseCopy = (message, responseType) => {
  if (message.type === 'welcome') {
    if (responseType === 'professionnel') return "Bienvenue dans l'agence.\n\nJe vais commencer par établir ton plan de carrière : situation actuelle, objectif sportif, salaire cible, clubs compatibles et calendrier réaliste. Tu sauras toujours ce qu'on fait et pourquoi on le fait.\n\nDe ton côté, je veux de la régularité, du sérieux et une communication directe avec moi.";
    if (responseType === 'empathique') return "Bienvenue, vraiment.\n\nJe suis content que tu nous fasses confiance. Avant de parler argent ou mercato, je veux comprendre ce que tu veux vivre comme carrière : le type de club, la ville, le rôle, le rythme, et ce qui compte pour toi en dehors du terrain.\n\nOn construit ça ensemble, pas au-dessus de ta tête.";
    return "Bienvenue.\n\nJe vais être direct : si tu veux que je t'emmène plus haut, il faudra être irréprochable. Entraînement, communication, entourage, réseaux sociaux — tout compte.\n\nMoi je gère les opportunités. Toi, tu me donnes des arguments sur le terrain.";
  }
  if (message.type === 'role_frustration') {
    if (responseType === 'professionnel') return "Tu as raison de soulever le sujet.\n\nJe vais parler au coach et au directeur sportif pour comprendre où tu te situes réellement dans la hiérarchie. Si le rôle promis n'est pas respecté, on mettra le club face à ses engagements.\n\nEn attendant, reste prêt. Je veux des arguments quand j'appelle.";
    if (responseType === 'empathique') return "Je comprends ta frustration.\n\nQuand on signe pour un rôle, on a besoin de sentir que le club tient parole. Je t'appelle ce soir, on regarde les minutes, le calendrier et la meilleure manière de mettre la pression sans te griller.\n\nTu n'es pas seul là-dessus.";
    return "Je vais regarder la situation, mais tu dois aussi répondre sur le terrain.\n\nLe rôle promis donne un cadre, pas un passe-droit. Tu restes irréprochable à l'entraînement, et moi je mets le club devant ses responsabilités si ça continue.";
  }
  if (message.type === 'staff_dialogue') {
    if (responseType === 'professionnel') return "Je prends le sujet au sérieux et je vais être concret.\n\nJe veux savoir exactement ce que le club a promis, ce qui bloque aujourd'hui, et à quoi ressemble la prochaine étape. S'il faut parler de temps de jeu ou de rôle, je le ferai sans détour.\n\nOn garde ce dossier propre et on se revoit après mon appel au club.";
    if (responseType === 'empathique') return "Je t'écoute et je comprends que tu veuilles du clair.\n\nSi la situation te pèse, on va la traiter sans te mettre en face-à-face inutile avec le club. On parle du fond: minutes, confiance, plan de match, et ce qui peut te remettre dans un bon cycle.\n\nJe t'appelle vite et on avance ensemble.";
    return "Je vais être direct : je ne laisse pas la situation s'enliser.\n\nSi le club ne respecte pas ce qui a été dit, je le mets face à ses responsabilités. En revanche, j'attends aussi que tu restes irréprochable et concentré.\n\nOn agit vite, mais proprement.";
  }
  if (message.type === 'voice_call') {
    if (responseType === 'professionnel') return "Je te rappelle aujourd'hui.\n\nPrépare-moi les trois points importants : ce qui bloque, ce que tu veux, et ce que tu refuses. On sort de l'appel avec une décision claire.";
    if (responseType === 'empathique') return "Oui, je t'appelle ce soir.\n\nOn prendra le temps, sans pression. Si tu demandes un appel, c'est qu'il y a quelque chose d'important derrière, donc je veux vraiment t'écouter.";
    return "Je t'appelle, mais on va être efficaces.\n\nOn clarifie les faits, on décide d'une ligne, et ensuite on s'y tient. Pas de flou, pas de messages contradictoires.";
  }
  if (message.type === 'thanks') {
    if (responseType === 'professionnel') return "Merci pour ton message.\n\nContinue à garder cette ligne : sérieux, performances, attitude propre. Quand un joueur montre ça, je peux défendre beaucoup plus fort ses intérêts auprès des clubs.\n\nOn capitalise sur cette bonne période.";
    if (responseType === 'empathique') return "Ça me fait plaisir de lire ça.\n\nJe sais que ces moments comptent dans une carrière. Profite de la semaine, garde confiance, et n'oublie pas que tu n'es pas seul dans ce projet.\n\nOn continue à avancer ensemble.";
    return "C'est bien, mais on ne s'arrête pas là.\n\nUne bonne semaine doit devenir une habitude. Reste concentré, évite de trop écouter les compliments, et enchaîne. C'est comme ça qu'on construit une vraie valeur.";
  }
  if (message.type === 'form_slump') {
    if (responseType === 'professionnel') return "On va traiter ça calmement.\n\nJe vais regarder tes minutes, tes notes, ta fatigue et ton rôle exact dans l'équipe. Ensuite je te proposerai deux ou trois ajustements concrets : récupération, discussion coach, ou plan mental.\n\nCe n'est pas une crise tant qu'on réagit vite.";
    if (responseType === 'empathique') return "Je comprends que ce soit lourd à vivre.\n\nUne mauvaise période ne définit pas ton niveau. On va trouver ce qui bloque, sans te juger. Je veux que tu respires un peu et qu'on avance étape par étape.\n\nJe t'appelle aujourd'hui.";
    return "Tu traverses une mauvaise période, mais la réponse doit venir du terrain.\n\nMoins de bruit, plus de travail simple : récupération, concentration, gestes justes. Je peux te protéger dehors, pas jouer à ta place.\n\nOn serre les dents et on repart.";
  }
  if (message.type === 'captain_demand') {
    if (responseType === 'professionnel') return "Ta demande se défend, mais elle doit être amenée intelligemment.\n\nJe vais sonder le club sans te mettre en porte-à-faux avec le coach. Si le vestiaire confirme ton influence, on pourra pousser le sujet au bon moment.\n\nContinue à agir comme un capitaine avant de demander le brassard.";
    if (responseType === 'empathique') return "Je comprends pourquoi ça te tient à cœur.\n\nÊtre reconnu comme leader, ce n'est pas juste symbolique. Je vais écouter le club et voir comment transformer ton influence actuelle en vrai statut.\n\nJe veux que tu te sentes respecté.";
    return "Le brassard ne se réclame pas, il s'impose.\n\nMontre encore plus d'exemplarité cette semaine. Si le coach voit que tu tires le groupe vers le haut, ma discussion avec le club aura beaucoup plus de poids.";
  }
  if (message.type === 'national_pride') {
    if (responseType === 'professionnel') return "Félicitations, c'est une étape importante.\n\nOn va gérer cette exposition proprement : pas de déclaration excessive, pas de pression inutile, et une communication qui valorise ton travail. Une sélection peut changer ton statut si on la maîtrise bien.\n\nProfite, mais reste concentré.";
    if (responseType === 'empathique') return "Je suis vraiment heureux pour toi.\n\nJe sais ce que ça représente de porter le maillot de ton pays. Savoure ce moment avec ta famille, et quand tu reviens, on transforme cette fierté en élan pour la suite.\n\nTu l'as mérité.";
    return "Bravo. Maintenant, il faut confirmer.\n\nUne convocation attire les regards, mais elle augmente aussi les attentes. Reste simple, travaille, et montre que ce n'était pas un hasard.";
  }
  if (message.type === 'life_event') {
    if (responseType === 'professionnel') return "Merci de me prévenir.\n\nJe vais intégrer cette situation dans nos décisions : durée de contrat, ville, stabilité, rythme des déplacements. Le projet sportif compte, mais ta vie personnelle compte aussi dans une carrière durable.\n\nOn en parle calmement avant toute décision.";
    if (responseType === 'empathique') return "Merci de me faire confiance avec ça.\n\nLe foot est important, mais ta famille et ton équilibre le sont aussi. On va adapter le plan, sans te forcer dans un projet qui ne correspond plus à ta vie.\n\nJe suis là, vraiment.";
    return "Je comprends, mais il faut transformer ça en critères clairs.\n\nDis-moi ce qui est non négociable : pays, ville, durée, stabilité. Ensuite je filtre les options. Pas d'émotion dans les négociations, mais des priorités nettes.";
  }
  if (message.type === 'promise_broken_warning') {
    if (responseType === 'professionnel') return "Tu as raison de me demander des comptes.\n\nJe vais reprendre la promesse exacte, ce qui a bloqué, et ce que je peux encore corriger. Je ne vais pas te vendre une excuse : je te dois un plan de réparation concret.\n\nOn se parle aujourd'hui.";
    if (responseType === 'empathique') return "Je comprends ta déception.\n\nSi tu as l'impression que je t'ai laissé tomber, je dois l'entendre. Je veux réparer ça correctement, pas juste te demander de passer à autre chose.\n\nDonne-moi une chance de remettre de la clarté entre nous.";
    return "Je reconnais que la promesse n'a pas été tenue, mais on doit regarder la suite froidement.\n\nJe vais voir ce qui peut encore être sauvé. De ton côté, ne transforme pas ça en crise publique. On règle ça en interne.";
  }
  if (message.type === 'transfer_request') {
    if (responseType === 'professionnel') return "Je comprends que tu veuilles savoir où tu vas.\n\nVoilà ce qu'on fait : je prépare une liste courte de clubs compatibles avec ton niveau, ton temps de jeu et ton salaire. On fixe ensemble un prix minimum, et je parle d'abord au club pour éviter de te mettre en difficulté.\n\nTu ne discutes avec personne directement. Si une offre arrive, je te la présente avec le projet sportif, pas seulement le montant.";
    if (responseType === 'empathique') return "Je t'entends. Si tu sens que tu stagnes, on doit le prendre au sérieux.\n\nJe vais ouvrir des portes sans te griller auprès du club. L'objectif n'est pas de partir pour partir, mais de trouver un endroit où tu joues, où tu progresses, et où tu te sens respecté.\n\nOn se refait un point après les prochains matchs et je te dirai clairement ce qui est réaliste.";
    return "Je note ton envie de bouger, mais on ne va pas subir le mercato.\n\nTu restes concentré sur le terrain. Moi je gère les appels, les clubs et le timing. Pas de déclaration, pas de message à d'autres agents, pas de pression publique.\n\nSi une vraie opportunité arrive, on l'étudie. Sinon, on protège ta saison.";
  }
  if (message.type === 'raise_request') {
    if (responseType === 'professionnel') return "Tu as le droit de demander mieux, mais on va le faire proprement.\n\nJe vais préparer le dossier : minutes jouées, notes, buts, passes, valeur marché et salaires comparables. Ensuite je demande un rendez-vous au club avec une fourchette réaliste.\n\nSi les chiffres soutiennent ta demande, je la défendrai fermement.";
    if (responseType === 'empathique') return "Je sais que tu fais les efforts et je ne veux pas que tu aies l'impression d'être oublié.\n\nJe vais parler au club, mais je veux le faire sans te mettre en opposition avec le coach ou la direction. Ton statut se construit aussi avec de la stabilité.\n\nDonne-moi quelques jours, je reviens vers toi avec une vraie position.";
    return "On peut ouvrir le sujet, mais il faut être lucide.\n\nUne augmentation se gagne avec des performances régulières et un rapport de force propre. Continue à répondre sur le terrain, évite les sorties publiques, et je m'occupe de poser le cadre avec le club.\n\nSi on force trop tôt, on perd du crédit.";
  }
  if (message.type === 'complaint') {
    if (responseType === 'professionnel') return "J'ai bien reçu ton message.\n\nOn va reprendre les faits un par un, sans émotion inutile. Je te propose un appel aujourd'hui : ce qui dépend du club, ce qui dépend de toi, et ce que je dois corriger de mon côté.\n\nAprès ça, je veux un plan clair et plus de flou entre nous.";
    if (responseType === 'empathique') return "Je suis désolé que tu l'aies vécu comme ça.\n\nJe vais t'appeler directement, parce que ce genre de sujet ne se règle pas par messages. Tu dois sentir que tu es accompagné, pas simplement géré comme un dossier.\n\nOn remet les choses à plat et je serai plus présent sur les prochaines semaines.";
    return "Je comprends que tu sois frustré, mais on doit rester professionnels.\n\nJe vais regarder ce qui n'a pas fonctionné, mais de ton côté j'attends une attitude irréprochable. Les états d'âme ne doivent pas sortir du vestiaire.\n\nOn règle ça en interne et on avance.";
  }
  if (message.type === 'injury_worry') {
    if (responseType === 'empathique') return "Je suis avec toi à 100% dans cette épreuve.\n\nJ'ai déjà parlé au staff médical — tu es entre de bonnes mains. Ce genre de blessure se gère bien quand on ne précipite pas. Ton seul boulot en ce moment : récupérer.\n\nJe gère tout le reste. Le club, la presse, l'agenda. Tu me rappelles quand tu veux.";
    if (responseType === 'professionnel') return "Voilà où on en est médicalement et contractuellement.\n\nLe club maintient son soutien — j'ai eu une confirmation ce matin. Le staff est optimiste sur les délais. On a un protocole clair pour le retour.\n\nReste focalisé sur la rééducation. Les décisions importantes attendront ta guérison.";
    return "Les blessures font partie du foot. Ce qui compte, c'est comment tu reviens.\n\nJ'ai des infos positives du côté médical. Continue comme tu fais, ne précipite rien. On parlera de l'avenir quand tu seras sur pied.\n\nLe club t'attend.";
  }
  if (message.type === 'ambition_clash') {
    if (responseType === 'professionnel') return "Je comprends la frustration et je te dois une explication claire.\n\nJ'ai eu des contacts — certains n'ont pas abouti, d'autres sont encore en cours. Le mercato n'est pas fermé. Je te parle de tout dès qu'il y a quelque chose de concret à discuter.\n\nContinue à performer. C'est le meilleur argument que j'ai pour toi.";
    if (responseType === 'empathique') return "Je t'entends, et je suis désolé que tu te sentes mis de côté.\n\nJe travaille dans l'ombre sur des pistes sérieuses. Je ne t'en ai pas parlé pour ne pas créer de faux espoirs. Mais tu mérites d'être tenu informé.\n\nAppelle-moi ce soir, on fait le point ensemble.";
    return "Le mercato, c'est pas du tout-cuit. Et un agent qui agite des offres fantômes n'est pas un bon agent.\n\nJe travaille sur des bases solides. Quand il y aura quelque chose de réel, tu seras le premier informé. D'ici là, reste professionnel sur le terrain.\n\nC'est comme ça qu'on crée de la valeur.";
  }
  if (message.type === 'secret_offer') {
    if (responseType === 'professionnel') return "Merci de m'avoir prévenu immédiatement — c'est exactement comme ça que ça doit se passer.\n\nNe rappelle personne de leur côté. Je prends contact aujourd'hui pour cadrer la démarche correctement. Soit c'est sérieux et on le traite sérieusement, soit c'est de la pêche à l'info et on ferme la porte proprement.\n\nTu restes en dehors de ça pour l'instant.";
    if (responseType === 'empathique') return "Je suis content que tu aies réfléchi avant d'aller plus loin — c'est une marque de confiance envers moi.\n\nJe suis en train de vérifier d'où vient cet intérêt. On ne sait pas encore si c'est officieux ou officiel. Laisse-moi quelques heures.\n\nQuoi qu'il en soit, on prend toutes les décisions ensemble.";
    return "Règle numéro un : personne ne t'approche sans passer par moi. Tu as bien fait de me dire.\n\nJe contacte ce club aujourd'hui pour comprendre leurs intentions réelles. Et si quelqu'un te rappelle directement, tu leur donnes mon numéro — point.\n\nC'est comme ça qu'on protège ta valeur.";
  }
  if (message.type === 'retirement_thoughts') {
    if (responseType === 'empathique') return "Je suis vraiment touché que tu me partages ça.\n\nC'est une réflexion normale à ton stade, et ça mérite une vraie conversation, pas juste quelques lignes. On peut se voir cette semaine ?\n\nL'objectif : trouver ensemble comment tu veux que cette dernière partie de carrière ressemble. Sportif, financier, reconversion — je t'accompagne sur tout.";
    if (responseType === 'professionnel') return "Je prends ça très au sérieux.\n\nOn a encore quelques saisons devant nous si le corps suit, mais il faut commencer à planifier. J'ai des contacts pour la reconversion et pour placer ta notoriété dans du durable.\n\nProchaine étape : un bilan complet ensemble pour voir quelles options sont réalistes.";
    return "Avant de parler de retraite, on va regarder les options sérieuses qui restent.\n\nTu as encore beaucoup à apporter. L'essentiel c'est de trouver le bon contexte — le bon club, le bon rôle, la bonne durée. Ne ferme pas de portes trop vite.\n\nOn se voit pour en discuter.";
  }
  if (message.type === 'media_pressure') {
    if (responseType === 'professionnel') return "J'ai déjà pris contact avec un communicant. On prépare une réponse calibrée.\n\nPas de prise de parole de ton côté pour l'instant — ni sur les réseaux, ni en conférence. Chaque mot doit être pesé.\n\nJe te tiens informé dans les prochaines heures.";
    if (responseType === 'empathique') return "Je comprends que c'est épuisant à vivre de l'intérieur.\n\nJ'ai les yeux dessus. On ne va pas laisser ça s'installer. L'important : ne te laisse pas embarquer émotionnellement dans la polémique.\n\nOn gère ça ensemble, calmement. Et si tu as besoin de souffler, dis-le-moi.";
    return "Le bruit médiatique, ça se gère en restant solide.\n\nTu ne réponds à rien. Pas de tweet, pas d'interview impromptue, pas de 'off the record'. On laisse le terrain parler.\n\nSi la pression monte trop fort, je prends un avocat-médias. Mais d'abord, on attend.";
  }

  return responseCopy[responseType];
};

export const getRandomMessageType = (player) => {
  if (player.moral < 35 || player.trust < 35) return 'complaint';
  if (player.injured > 3) return 'injury_worry';
  if (['ambitieux', 'mercenaire'].includes(player.personality)) return pick(['transfer_request', 'raise_request', 'ambition_clash']);
  return pick(['thanks', 'raise_request', 'complaint', 'form_slump']);
};
