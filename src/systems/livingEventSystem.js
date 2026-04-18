import { CLUBS } from '../data/clubs';
import { createManualNewsPost } from './newsSystem';
import { addDecisionHistory, applyCredibilityChange, applyMediaRelation, applyPlayerSegmentReputation, getPlayerSegment, pickRivalAgent } from './agencyReputationSystem';
import { applyClubRelation } from './clubSystem';
import { applyLeagueReputation } from './leagueReputationSystem';
import { createNarrativeArc, mergeNarrativeArc } from './consequenceSystem';
import { clamp, makeId, pick } from '../utils/helpers';

const mediaAccounts = [
  { id: 'mercato_insider', name: 'Mercato Insider', kind: 'journal', icon: 'MI', color: '#172026' },
  { id: 'le_vestiaire', name: 'Le Vestiaire', kind: 'media', icon: 'LV', color: '#00a676' },
  { id: 'tabloid_sport', name: 'Tabloid Sport', kind: 'journal', icon: 'TS', color: '#b42318' },
  { id: 'statszone_fc', name: 'StatsZone FC', kind: 'data', icon: 'SZ', color: '#2f80ed' },
  { id: 'foot_social_club', name: 'Foot Social Club', kind: 'media', icon: 'FS', color: '#00a676' },
];

const worldTemplates = [
  {
    id: 'media_phone',
    type: 'media',
    title: 'Un journaliste veut une réaction',
    text: '{media} veut te faire réagir sur la situation de {player}. Une réponse calme peut installer ta crédibilité.',
    credibility: 1,
    media: 2,
  },
  {
    id: 'supporters_pressure',
    type: 'fans',
    title: 'Supporters sous tension',
    text: 'Les supporters de {club} réclament plus de temps de jeu pour {player}.',
    player: { moral: 2, pressure: 5 },
    club: -1,
  },
  {
    id: 'coach_warning',
    type: 'media',
    title: 'Le coach hausse le ton',
    text: "Le staff de {club} trouve que {player} doit gagner en régularité à l'entraînement.",
    player: { moral: -3, trust: -1 },
    club: -1,
  },
  {
    id: 'family_country',
    type: 'media',
    title: "Discussion avec l'entourage",
    text: "L'entourage de {player} évoque une préférence pour {city}. Le prochain projet devra en tenir compte.",
    player: { trust: -1 },
  },
  {
    id: 'hidden_ambition',
    type: 'transfert',
    title: 'Ambition cachée',
    text: '{player} reste discret publiquement, mais son entourage regarde déjà le niveau supérieur.',
    player: { moral: -1 },
    credibility: -1,
  },
  {
    id: 'professional_week',
    type: 'performance',
    title: 'Semaine propre',
    text: '{player} arrive tôt, travaille plus et rassure son club. Une semaine sans bruit, mais utile.',
    player: { moral: 3, trust: 2, fatigue: -4 },
    credibility: 1,
  },
  {
    id: 'salary_leak',
    type: 'scandale',
    title: 'Fuite salariale',
    text: 'Une fuite sur le salaire de {player} agace le vestiaire de {club}.',
    player: { moral: -4, trust: -2 },
    media: -3,
    credibility: -2,
  },
  {
    id: 'club_need',
    type: 'transfert',
    title: 'Besoin identifié',
    text: "{club} cherche exactement un profil comme {player}. Ce n'est pas encore une offre, mais le dossier existe.",
    club: 2,
    country: 1,
  },
  {
    id: 'rival_agent',
    type: 'media',
    title: 'Agent concurrent actif',
    text: '{rival} tente de se rapprocher de {player}. Il promet un réseau plus adapté.',
    player: { trust: -4 },
    credibility: -1,
    rival: true,
  },
  {
    id: 'media_ally',
    type: 'media',
    title: 'Relais positif',
    text: '{media} défend le travail de ton agence après une semaine bien gérée.',
    media: 4,
    credibility: 2,
  },
  {
    id: 'fake_news',
    type: 'scandale',
    title: 'Fake news mercato',
    text: "{media} annonce un accord inexistant autour de {player}. Le club de {club} attend une clarification.",
    media: -4,
    club: -2,
    credibility: -2,
  },
  {
    id: 'president_call',
    type: 'transfert',
    title: 'Président au téléphone',
    text: "Le président de {club} veut comprendre tes intentions sur {player}. La relation club-agent peut basculer.",
    club: 3,
    country: 1,
  },
  {
    id: 'teammate_quote',
    type: 'media',
    title: 'Citation de vestiaire',
    text: "Un coéquipier glisse que {player} doit parler davantage dans le vestiaire de {club}.",
    player: { moral: -1, pressure: 4 },
  },
  {
    id: 'good_press',
    type: 'media',
    title: 'Conférence maîtrisée',
    text: "{player} calme le jeu devant les caméras. {media} souligne une communication propre.",
    player: { moral: 3, trust: 1 },
    media: 2,
    credibility: 2,
  },
  {
    id: 'bad_press',
    type: 'scandale',
    title: 'Phrase maladroite',
    text: "{player} laisse entendre qu'il mérite mieux que {club}. Les supporters réagissent mal.",
    player: { moral: -3, trust: -2, pressure: 8 },
    club: -3,
    media: -2,
    credibility: -2,
  },
  {
    id: 'nostalgia',
    type: 'media',
    title: 'Ancien club dans la tête',
    text: "{player} parle avec émotion de son ancien environnement. Son entourage surveille les options à {city}.",
    player: { moral: -1, trust: -1 },
  },
  {
    id: 'patient_player',
    type: 'performance',
    title: 'Patience intelligente',
    text: "{player} accepte d'attendre le bon projet plutôt que de forcer un transfert.",
    player: { moral: 2, trust: 3 },
    credibility: 1,
  },
  {
    id: 'broken_promise_echo',
    type: 'scandale',
    title: 'Promesse qui revient',
    text: "Le clan de {player} reparle d'une promesse non tenue. Le dossier devient sensible.",
    player: { moral: -4, trust: -5, pressure: 6 },
    credibility: -3,
  },
  {
    id: 'thankful_player',
    type: 'fans',
    title: 'Remerciement public',
    text: "{player} remercie publiquement ton agence. Les supporters de {club} apprécient le ton.",
    player: { moral: 4, trust: 4 },
    media: 2,
    credibility: 2,
  },
  {
    id: 'club_instability',
    type: 'media',
    title: 'Club instable',
    text: "{club} traverse une période de tension interne. Le rôle de {player} peut changer rapidement.",
    player: { pressure: 7 },
    club: -2,
  },
  {
    id: 'shirt_sales',
    type: 'fans',
    title: 'Maillots en hausse',
    text: "Les maillots de {player} se vendent mieux cette semaine. Sa valeur de marque progresse.",
    player: { moral: 2, trust: 1 },
    credibility: 1,
  },
  {
    id: 'hostile_fans',
    type: 'scandale',
    title: 'Supporters hostiles',
    text: "Une partie du public de {club} vise {player} après les dernières rumeurs.",
    player: { moral: -5, pressure: 9 },
    club: -1,
  },
  {
    id: 'training_extra',
    type: 'performance',
    title: 'Séance supplémentaire',
    text: "{player} reste après l'entraînement. Le staff de {club} note l'effort.",
    player: { moral: 3, trust: 1, fatigue: 3 },
    club: 1,
  },
  {
    id: 'medical_warning',
    type: 'media',
    title: 'Alerte médicale',
    text: "Le staff médical de {club} recommande de surveiller la charge de {player}.",
    player: { fatigue: -2, pressure: 3 },
    credibility: 1,
  },
];

const getTemplatePool = ({ phase, player }) => worldTemplates.filter((template) => {
  if (template.id === 'hidden_ambition') return (player.hiddenAmbition ?? 40) > 62;
  if (template.id === 'professional_week') return player.personality === 'professionnel' || player.pressureTolerance > 65;
  if (template.id === 'club_need') return phase.mercato;
  if (template.id === 'supporters_pressure') return player.club !== 'Libre';
  return true;
});

export const generateLivingWeek = ({ state, roster, phase }) => {
  if (!roster.length) {
    return { roster, news: [], messages: [], events: [], statePatch: {} };
  }

  const pressure = state.difficulty === 'hardcore' ? 1.2 : state.difficulty === 'facile' ? 0.75 : 1;
  const eventCount = Math.max(1, Math.min(3, Math.round((Math.random() * 2 + 1) * pressure)));
  let nextRoster = roster;
  let mediaRelations = { ...(state.mediaRelations ?? {}) };
  let clubRelations = { ...(state.clubRelations ?? {}) };
  let countryReputation = { ...(state.countryReputation ?? {}) };
  let playerSegmentReputation = { ...(state.playerSegmentReputation ?? {}) };
  let credibility = state.credibility ?? 50;
  let rivalAgents = [...(state.rivalAgents ?? [])];
  let decisionHistory = [...(state.decisionHistory ?? [])];
  let activeNarratives = [...(state.activeNarratives ?? [])];
  const news = [];
  const messages = [];
  const events = [];

  for (let index = 0; index < eventCount; index += 1) {
    const player = pick(nextRoster);
    const club = CLUBS.find((item) => item.name === player.club) ?? pick(CLUBS);
    const media = pick(mediaAccounts);
    const rival = pickRivalAgent(rivalAgents);
    const template = pick(getTemplatePool({ phase, player }));
    const text = template.text
      .replaceAll('{player}', `${player.firstName} ${player.lastName}`)
      .replaceAll('{club}', club.name)
      .replaceAll('{city}', pick(player.preferredCities ?? [club.city]))
      .replaceAll('{media}', media.name)
      .replaceAll('{rival}', rival.name);

    nextRoster = nextRoster.map((item) => {
      if (item.id !== player.id) return item;
      const effects = template.player ?? {};
      return {
        ...item,
        moral: clamp(item.moral + (effects.moral ?? 0), 0, 100),
        trust: clamp((item.trust ?? 50) + (effects.trust ?? 0), 0, 100),
        fatigue: clamp((item.fatigue ?? 20) + (effects.fatigue ?? 0), 0, 100),
        pressure: clamp((item.pressure ?? 50) + (effects.pressure ?? 0), 0, 100),
        timeline: template.type !== 'media'
          ? [{ week: state.week + 1, type: 'vie', label: template.title }, ...(item.timeline ?? [])].slice(0, 18)
          : item.timeline,
      };
    });

    if (template.media) mediaRelations = applyMediaRelation(mediaRelations, media.id, template.media);
    if (template.club) clubRelations = applyClubRelation(clubRelations, club.name, template.club);
    if (template.country) countryReputation = applyLeagueReputation(countryReputation, club.countryCode, template.country);
    if (template.credibility) credibility = applyCredibilityChange(credibility, template.credibility);
    playerSegmentReputation = applyPlayerSegmentReputation(playerSegmentReputation, getPlayerSegment(player), template.type === 'scandale' ? -1 : 1);

    if (template.rival) {
      rivalAgents = rivalAgents.map((agent) => agent.id === rival.id ? { ...agent, heat: clamp(agent.heat + 8, 0, 100), lastMoveWeek: state.week + 1 } : agent);
      messages.push({
        id: makeId('msg'),
        week: state.week + 1,
        type: 'competitor_agent',
        context: 'living_world',
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        subject: `${rival.name} tourne autour du dossier`,
        body: `${rival.name}, agent ${rival.style}, promet à ton joueur une approche différente. Une réunion rapide peut éviter que la confiance baisse.`,
        read: false,
        resolved: false,
      });
    }

    if (template.id === 'medical_warning' || (player.injured > 0 && template.id === 'supporters_pressure')) {
      activeNarratives = mergeNarrativeArc(activeNarratives, createNarrativeArc({
        type: 'injury_comeback',
        player,
        club: player.club,
        week: state.week + 1,
        origin: template.title,
        intensity: 2,
      }));
    }

    if (template.id === 'coach_warning' || template.id === 'bad_press') {
      activeNarratives = mergeNarrativeArc(activeNarratives, createNarrativeArc({
        type: 'coach_conflict',
        player,
        club: player.club,
        week: state.week + 1,
        origin: template.title,
        intensity: 2,
      }));
    }

    if (template.id === 'professional_week' || template.id === 'training_extra') {
      activeNarratives = mergeNarrativeArc(activeNarratives, createNarrativeArc({
        type: 'breakout_run',
        player,
        club: player.club,
        week: state.week + 1,
        origin: template.title,
        intensity: 2,
      }));
    }

    if (template.id === 'hidden_ambition' || template.id === 'club_need' || template.id === 'president_call') {
      activeNarratives = mergeNarrativeArc(activeNarratives, createNarrativeArc({
        type: 'transfer_rumor',
        player,
        club: player.club,
        week: state.week + 1,
        origin: template.title,
        intensity: 2,
      }));
    }

    decisionHistory = addDecisionHistory(decisionHistory, {
      week: state.week + 1,
      type: template.type,
      label: template.title,
      detail: text,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
    });

    events.push({
      id: template.id,
      label: template.title,
      player: `${player.firstName} ${player.lastName}`,
      playerId: player.id,
      good: template.type !== 'scandale',
      money: 0,
      rep: template.credibility ?? 0,
      living: true,
    });

    news.push(createManualNewsPost({
      type: template.type,
      player,
      week: state.week + 1,
      text,
      reputationImpact: template.credibility ?? 0,
      account: media,
    }));
  }

  return {
    roster: nextRoster,
    news,
    messages,
    events,
    statePatch: {
      mediaRelations,
      clubRelations,
      countryReputation,
      playerSegmentReputation,
      credibility,
      rivalAgents,
      decisionHistory: decisionHistory.slice(0, 40),
      activeNarratives,
    },
  };
};
