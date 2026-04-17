import { makeId, pick } from '../utils/helpers';

const NEWS_ACCOUNTS = {
  performance: [
    { name: 'StatsZone FC', kind: 'data', icon: 'SZ', color: '#2f80ed' },
    { name: 'Le Vestiaire', kind: 'media', icon: 'LV', color: '#172026' },
    { name: 'UltraFootLive', kind: 'fan', icon: 'UF', color: '#00a676' },
  ],
  scandale: [
    { name: 'Tabloid Sport', kind: 'journal', icon: 'TS', color: '#b42318' },
    { name: 'HorsJeu Magazine', kind: 'media', icon: 'HJ', color: '#8a6f1f' },
    { name: 'FootLeaks FR', kind: 'journal', icon: 'FL', color: '#d9480f' },
  ],
  transfert: [
    { name: 'Mercato Insider', kind: 'journal', icon: 'MI', color: '#172026' },
    { name: 'TransferRadar', kind: 'data', icon: 'TR', color: '#2f80ed' },
    { name: 'Compte Club Officiel', kind: 'club', icon: 'FC', color: '#00a676' },
  ],
  fans: [
    { name: 'Tribune Nord', kind: 'fan', icon: 'TN', color: '#00a676' },
    { name: 'Supporters Talk', kind: 'fan', icon: 'ST', color: '#2f80ed' },
    { name: 'Virage Populaire', kind: 'fan', icon: 'VP', color: '#8a6f1f' },
  ],
  media: [
    { name: 'Canal Football Desk', kind: 'journal', icon: 'CF', color: '#172026' },
    { name: 'Onze Hebdo', kind: 'media', icon: 'OH', color: '#2f80ed' },
    { name: 'Foot Social Club', kind: 'media', icon: 'FS', color: '#00a676' },
  ],
};

const NEWS_TEMPLATES = {
  performance: [
    "{player} fait parler son talent. Les supporters s'enflamment.",
    'Les médias saluent la semaine de {player}. Son nom circule partout.',
  ],
  scandale: [
    '{player} sous pression après une polémique. Les réseaux demandent des réponses.',
    'La gestion de crise autour de {player} divise les supporters.',
  ],
  transfert: [
    '{player} anime déjà le mercato. Plusieurs clubs observent la situation.',
    'Des rumeurs de transfert entourent {player}. Son agent reste prudent.',
  ],
  fans: [
    'Les fans scandent le nom de {player}. La cote populaire explose.',
    '{player} gagne le public par son attitude et ses performances.',
  ],
  media: [
    '{player} occupe les plateaux. La communication de son clan est scrutée.',
    "Nouvelle séquence médiatique pour {player}, et la réputation de l'agence est en jeu.",
  ],
};

const CLUB_RIVAL_ACCOUNTS = {
  PSG: ['Canal Parisien', 'Virage Auteuil'],
  Marseille: ['Massilia Talk', 'Virage Sud'],
  Lyon: ['Gone Zone', 'Tribune Rhone'],
  Nantes: ['Canaris Live', 'Tribune Loire'],
  Toulouse: ['Violets Média', 'Occitanie Foot'],
  Arsenal: ['North London Desk', 'Gunners Talk'],
  Liverpool: ['Mersey Tribune', 'Kop Live'],
  'Real Madrid': ['Madrid Central', 'Blanco Report'],
  'FC Barcelona': ['Catalunya Ball', 'Cules Live'],
};

const getClubAccount = (player, type) => {
  const names = CLUB_RIVAL_ACCOUNTS[player.club];
  if (!names?.length || Math.random() > 0.45) return null;
  const name = pick(names);
  return {
    name,
    kind: type === 'fans' ? 'fan' : 'media',
    icon: name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase(),
    color: type === 'scandale' ? '#b42318' : '#172026',
  };
};

const mapEventTypeToPostType = (eventType) => {
  if (eventType === 'scandal') return 'scandale';
  if (eventType === 'transfer') return 'transfert';
  return eventType;
};

export const createNewsPost = ({ player, event, week, reputationImpact = 0 }) => {
  const type = mapEventTypeToPostType(event.type ?? 'media');
  const template = pick(NEWS_TEMPLATES[type] ?? NEWS_TEMPLATES.media);
  const account = getClubAccount(player, type) ?? pick(NEWS_ACCOUNTS[type] ?? NEWS_ACCOUNTS.media);
  const playerName = `${player.firstName} ${player.lastName}`;

  return {
    id: makeId('news'),
    week,
    type,
    playerId: player.id,
    playerName,
    accountName: account.name,
    accountKind: account.kind,
    accountIcon: account.icon,
    accountColor: account.color,
    text: template.replace('{player}', playerName),
    publicReaction: reputationImpact >= 0 ? 'positive' : 'négative',
    reputationImpact,
    likes: Math.max(12, Math.floor(Math.random() * 900 + Math.abs(reputationImpact) * 75)),
    comments: Math.max(1, Math.floor(Math.random() * 120 + Math.abs(reputationImpact) * 8)),
    trend: reputationImpact >= 6 || reputationImpact <= -5 ? 'viral' : reputationImpact < 0 ? 'débat' : 'normal',
  };
};

export const createManualNewsPost = ({ type = 'media', player, week, text, reputationImpact = 0, account }) => {
  const selectedAccount = account ?? pick(NEWS_ACCOUNTS[type] ?? NEWS_ACCOUNTS.media);

  return {
    id: makeId('news'),
    week,
    type,
    playerId: player?.id,
    playerName: player ? `${player.firstName} ${player.lastName}` : 'Agence',
    accountName: selectedAccount.name,
    accountKind: selectedAccount.kind,
    accountIcon: selectedAccount.icon ?? selectedAccount.name.slice(0, 2).toUpperCase(),
    accountColor: selectedAccount.color ?? '#172026',
    text,
    publicReaction: reputationImpact >= 0 ? 'positive' : 'négative',
    reputationImpact,
    likes: Math.max(8, Math.floor(Math.random() * 700 + Math.abs(reputationImpact) * 65)),
    comments: Math.max(1, Math.floor(Math.random() * 90 + Math.abs(reputationImpact) * 7)),
    trend: reputationImpact >= 6 || reputationImpact <= -5 ? 'viral' : reputationImpact < 0 ? 'débat' : 'normal',
  };
};
