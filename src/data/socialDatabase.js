// ============================================================================
// SOCIAL DATABASE — Centralisée (offline, locale)
// Étendue via socialDatabaseExtended.js (500+ posts additionnels)
// ============================================================================
import {
  PLAYER_POST_EXTRA, CLUB_POST_EXTRA, PRESS_POST_EXTRA,
  FAN_POST_EXTRA, PULSE_TEMPLATES_EXTRA, PULSE_NO_PLAYER_EXTRA,
  COMMENT_POOL_EXTRA, PULSE_HASHTAGS_EXTRA,
} from './socialDatabaseExtended';


const fullName = (p = {}) => `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Joueur';

// ============= POSTS JOUEURS (InstaPro) =============
export const PLAYER_POST_TEMPLATES = [
  { tag: 'matchday', text: ({ p }) => `Prêt pour le prochain match avec ${p.club}. On lâche rien.` },
  { tag: 'matchday', text: ({ p }) => `J-1. Tout donner pour ${p.club} et les supporters. ⚽️🔥` },
  { tag: 'matchday', text: () => `Concentré. Focus. Préparation finale. 💯` },
  { tag: 'training', text: () => `Séance bouclée. Focus à 100%. 💪` },
  { tag: 'training', text: () => `Double séance aujourd'hui. Le travail paie toujours. 🏋️‍♂️` },
  { tag: 'training', text: () => `Petit run matinal avant l'entraînement. Routine ✅` },
  { tag: 'goal', text: () => `Quelle soirée 🔥 Merci au groupe et aux supporters.` },
  { tag: 'goal', text: () => `Trois points pris, le boulot continue. 🙏` },
  { tag: 'goal', text: ({ p }) => `Ce maillot, ces couleurs, ce club. Fier de représenter ${p.club}. ❤️` },
  { tag: 'dream', text: () => `Un jour je porterai ce maillot... Inch'Allah.` },
  { tag: 'dream', text: () => `Les rêves d'enfant, on n'oublie jamais d'où on vient.` },
  { tag: 'family', text: () => `En famille, là où je recharge. ❤️` },
  { tag: 'family', text: () => `Petite escapade en famille. Repos bien mérité.` },
  { tag: 'sponsor', text: () => `Heureux d'annoncer une nouvelle collaboration. Plus d'infos très vite. 👀` },
  { tag: 'sponsor', text: () => `Nouvelle paire reçue. Test grandeur nature ce week-end. 👟` },
  { tag: 'fan', text: () => `Merci pour vos messages, ça touche énormément. 🙏` },
  { tag: 'recovery', text: () => `Récupération, soins, sommeil. Le corps est notre outil.` },
  { tag: 'travel', text: ({ p }) => `Direction le stade avec ${p.club}. Let's go.` },
  { tag: 'milestone', text: () => `Une page se tourne. Une autre s'écrit. ✍️` },
  { tag: 'gratitude', text: () => `Reconnaissant. Chaque jour est une chance.` },
];

// ============= POSTS CLUBS (InstaPro) — chaque entrée a un tag pour l'image =============
export const CLUB_POST_TEMPLATES = [
  { tag: 'training', text: ({ club, p }) => `🏟️ Séance ouverte ce matin. ${p.firstName} en feu à l'entraînement. #${club.replace(/\s+/g, '')}` },
  { tag: 'contract', text: ({ club }) => `📢 Nouveau partenariat officiel annoncé. La famille ${club} s'agrandit.` },
  { tag: 'matchday', text: () => `🎟️ Billetterie ouverte pour le prochain match. Faites du bruit !` },
  { tag: 'trophy', text: ({ p }) => `🌟 Joueur du mois : ${fullName(p)}. Bravo champion 👏` },
  { tag: 'sponsor', text: ({ club }) => `🛒 Nouveau maillot domicile dispo en boutique. #${club.replace(/\s+/g, '')}` },
  { tag: 'goal', text: () => `📺 Replay du dernier match en ligne. Revivez tous les temps forts !` },
  { tag: 'press', text: ({ p }) => `📸 Backstage : ${p.firstName} en interview avec la chaîne club.` },
  { tag: 'fan', text: ({ club }) => `💚 Action solidaire ce week-end avec les supporters de ${club}. Merci à tous.` },
  { tag: 'tactics', text: ({ club }) => `🏆 Effectif au complet pour préparer le prochain choc. Allez ${club} !` },
  // (Anniversaire retiré du pool générique : géré uniquement par events réels.)
  { tag: 'matchday', text: ({ club }) => `📅 Calendrier officiel mis à jour. Les supporters de ${club} attendus en nombre.` },
];

// ============= AUTEURS PRESSE =============
export const PRESS_AUTHORS = [
  { name: "L'Équipe Mercato", handle: '@equipe_mkt', verified: true },
  { name: 'FootMercato', handle: '@footmercato', verified: true },
  { name: 'RMC Sport', handle: '@rmc_sport', verified: true },
  { name: 'Téléfoot', handle: '@telefoot', verified: true },
  { name: 'BeIN Sports', handle: '@beinsports_fr', verified: true },
  { name: 'Canal Football', handle: '@canalfootball', verified: true },
  { name: 'France Football', handle: '@francefootball', verified: true },
  { name: 'L\'Équipe', handle: '@lequipe', verified: true },
  { name: 'Goal France', handle: '@goal_fr', verified: true },
];

export const PRESS_POST_TEMPLATES = [
  { tag: 'mercato', text: ({ p }) => `📰 INFO — ${fullName(p)} dans le viseur d'un cador européen. Premier contact confirmé.` },
  { tag: 'training', text: ({ p }) => `🎙️ Notre source : « ${fullName(p)} a impressionné les recruteurs cette semaine. »` },
  { tag: 'mercato', text: ({ p }) => `Mercato — Le clan ${p.lastName} ouvert à un départ si une offre concrète arrive.` },
  { tag: 'mercato', text: ({ p }) => `🔥 Exclu : un club de Premier League prêt à dégainer pour ${fullName(p)}.` },
  { tag: 'goal', text: ({ p }) => `📊 Stats — ${fullName(p)} dans le top 5 européen à son poste. Confirmation cette semaine.` },
  { tag: 'press', text: ({ p }) => `💬 Interview à venir : ${p.firstName} se livre sans filtre. À ne pas manquer.` },
  { tag: 'contract', text: ({ p }) => `🚨 Source club : ${fullName(p)} pourrait prolonger. Réunion prévue cette semaine.` },
  { tag: 'goal', text: ({ p }) => `📈 Sa cote grimpe : ${fullName(p)} dépasse les attentes du staff.` },
];

// ============= AUTEURS FANS =============
export const FAN_AUTHORS = [
  { name: 'Ultras_Sud', handle: '@ultras_sud' },
  { name: 'TifoNation', handle: '@tifo_nation' },
  { name: 'KopFanatic', handle: '@kop_fanatic' },
  { name: 'Tribune Nord', handle: '@tribune_nord' },
  { name: 'Foot4Ever', handle: '@foot4ever' },
  { name: 'Ultra_Boy_77', handle: '@ultra_boy_77' },
  { name: 'StadiumLover', handle: '@stadium_lover' },
  { name: 'PelouseLibre', handle: '@pelouse_libre' },
  { name: 'TacticienDuDimanche', handle: '@tacticien_dim' },
  { name: 'GroupeMaillot', handle: '@groupe_maillot' },
];

export const FAN_POST_TEMPLATES = [
  { tag: 'fan', text: ({ p }) => `On veut voir ${p.firstName} TITULAIRE 🔥🔥 Coach écoute-nous` },
  { tag: 'fan', text: ({ p }) => `${fullName(p)} c'est notre futur capitaine, j'le sens 👀` },
  { tag: 'mercato', text: ({ p }) => `Si on perd ${p.lastName} cet été je casse ma télé sah 😭` },
  { tag: 'goal', text: ({ p }) => `${p.firstName} = différence à chaque match. Faits, pas paroles.` },
  { tag: 'press', text: ({ p }) => `Stop avec les rumeurs sur ${p.lastName}, laissez le bosser tranquille.` },
  { tag: 'fan', text: ({ p }) => `Mon fils a la pancarte "${p.firstName} GOAT" préparée pour samedi 🤩` },
  { tag: 'mercato', text: ({ p }) => `Vendre ${fullName(p)} cet été = trahison. Point.` },
  { tag: 'matchday', text: ({ p }) => `${p.firstName} en feu en ce moment, faut juste lui faire confiance.` },
];

// ============= CHIRP — AUTEURS =============
export const PULSE_AUTHORS = [
  { name: 'ChirpScout', handle: '@chirpscout', verified: true },
  { name: 'MercatoLive', handle: '@mercatolive', verified: true },
  { name: 'AgentInsider', handle: '@agentinsider' },
  { name: 'TouchlineFR', handle: '@touchline_fr', verified: true },
  { name: 'BuzzerBeater', handle: '@buzzerbeater' },
  { name: 'TransferRoom', handle: '@transferroom', verified: true },
  { name: 'StatsZone', handle: '@statszone' },
  { name: 'XGFanatic', handle: '@xg_fanatic' },
  { name: 'ScoutEurope', handle: '@scout_europe', verified: true },
  { name: 'TeamTalkFR', handle: '@teamtalk_fr' },
];

export const PULSE_TEMPLATES = [
  ({ p }) => `BREAKING — ${fullName(p)} (${p.club}) approché par un cador européen. 🔥`,
  ({ p }) => `${fullName(p)} a quitté l'entraînement plus tôt. Source club : « rien d'inquiétant ».`,
  ({ p }) => `Note ${Math.round(p.rating)} pour ${fullName(p)} : la presse s'enflamme.`,
  ({ p }) => `Le clan ${p.lastName} a changé d'agent ? Notre source dit non.`,
  ({ p }) => `${p.firstName} a posté une story énigmatique cette nuit. Les fans s'emballent. 👀`,
  ({ p }) => `🚨 Réunion prévue entre ${p.club} et l'entourage de ${fullName(p)}. Prolongation au menu ?`,
  ({ p }) => `${fullName(p)} dans la liste élargie de la sélection nationale. Confirmation à venir.`,
  ({ p }) => `Stats ${p.firstName} sur 5 matchs : il pèse plus que jamais sur les phases offensives.`,
  ({ p }) => `${p.lastName} a refusé une offre de prolongation. ${p.club} sous tension.`,
  ({ p }) => `Coup dur potentiel pour ${p.club} : ${fullName(p)} sorti à la mi-temps.`,
  ({ p }) => `${p.firstName} dans le viseur d'un nouveau sponsor international 💼`,
  ({ p }) => `INFO — Une réunion clandestine à Londres, agent de ${p.lastName} repéré sur place. ✈️`,
];

export const PULSE_NO_PLAYER = [
  { name: 'ChirpDeals', handle: '@chirpdeals', text: 'TOP 5 transferts les plus chauds de la semaine 🔥 Thread à suivre 👇' },
  { name: 'TacticBoard', handle: '@tacticboard', text: 'Le 4-2-3-1 est-il vraiment mort ? Notre analyse vidéo arrive ce soir.' },
  { name: 'AgentInsider', handle: '@agentinsider', text: 'Une agence francilienne grimpe vite dans le classement européen. À suivre…' },
  { name: 'StatsZone', handle: '@statszone', text: '📊 Top 10 jeunes pépites U21 — surprise dans le top 3, restez branchés.' },
  { name: 'MercatoLive', handle: '@mercatolive', text: '🚨 Plusieurs clubs européens activent leurs scouts en France ce week-end.' },
  { name: 'ChirpScout', handle: '@chirpscout', text: 'Dossier — Comment les agents construisent une décennie de carrière en 6 mois.' },
  { name: 'TransferRoom', handle: '@transferroom', text: 'Marché tendu : les valorisations explosent à -30 jours du deadline day.' },
  { name: 'TouchlineFR', handle: '@touchline_fr', text: 'OFF — Un grand club allemand chercherait un milieu créateur. Plusieurs noms français évoqués.' },
  { name: 'XGFanatic', handle: '@xg_fanatic', text: 'xG vs but réel : top 5 attaquants sous-estimés cette saison.' },
  { name: 'ScoutEurope', handle: '@scout_europe', text: 'Nos scouts notent un boom des contre-pressings haut en Ligue 1.' },
];

// ============= COMMENTAIRES =============
export const COMMENT_POOL = [
  ({ p }) => `${p.firstName} c'est un crack 🔥`,
  () => `Vraiment ? Source ?`,
  () => `Mdr arrête le délire`,
  ({ p }) => `Trop fort ${p.lastName}, vraie pépite`,
  () => `Bon enfin une bonne news 👏`,
  () => `On en parle ou pas du salaire ?`,
  () => `Exagéré comme d'hab les médias 😴`,
  ({ p }) => `${p.firstName} >>>>> tous les autres à son poste`,
  () => `Wesh c'est devenu n'importe quoi le mercato 🥲`,
  ({ p }) => `Si ${p.lastName} part j'arrête de regarder le foot fr`,
  () => `C'est confirmé ou c'est encore du buzz ?`,
  ({ p }) => `Bcp de bruit pour rien autour de ${p.firstName}`,
  () => `Première bonne décision de la saison 👍`,
  ({ p }) => `Faut le verrouiller direct ${p.lastName}, top 5 mondial à son poste 💯`,
];

// ============= MESSAGES VESTIAIRE (WhatsCall — non-inbox) =============
export const DM_TONES = [
  { tone: 'doute', text: "Coach, je veux te parler. J'ai des doutes sur mon temps de jeu." },
  { tone: 'offre', text: "On m'a contacté. Tu peux m'expliquer ce qui se passe ?" },
  { tone: 'famille', text: "Ma famille a besoin de stabilité. Qu'est-ce qu'on fait ?" },
  { tone: 'rumeur', text: "Y'a une rumeur qui sort sur moi. C'est toi qui gères ?" },
  { tone: 'forme', text: "Je sens que je suis pas à 100% physiquement, faut qu'on en discute." },
  { tone: 'role', text: "Mon rôle dans le groupe est flou. Je veux clarifier avec toi." },
  { tone: 'media', text: "Les médias me lâchent pas, je sais plus comment gérer." },
  { tone: 'leadership', text: "Je veux prendre plus de responsabilités. On en parle quand ?" },
];

// ============= HASHTAGS CHIRP =============
export const PULSE_HASHTAGS = ['mercato', 'breaking', 'rumeur', 'fcnews', 'inside', 'transferts', 'analyse', 'football', 'stats', 'exclu'];

// ============= MERGE des extensions massives (500+ posts additionnels) =============
PLAYER_POST_TEMPLATES.push(...PLAYER_POST_EXTRA);
CLUB_POST_TEMPLATES.push(...CLUB_POST_EXTRA);
PRESS_POST_TEMPLATES.push(...PRESS_POST_EXTRA);
FAN_POST_TEMPLATES.push(...FAN_POST_EXTRA);
PULSE_TEMPLATES.push(...PULSE_TEMPLATES_EXTRA);
PULSE_NO_PLAYER.push(...PULSE_NO_PLAYER_EXTRA);
COMMENT_POOL.push(...COMMENT_POOL_EXTRA);
PULSE_HASHTAGS.push(...PULSE_HASHTAGS_EXTRA);

