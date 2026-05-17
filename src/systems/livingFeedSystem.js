/**
 * livingFeedSystem.js
 * Génère des publications "vivantes" pour le feed social :
 *  - Posts officiels des sélections nationales (liste des 23 visible)
 *  - Posts officiels des championnats (top buteurs / équipe-type)
 *  - Posts officiels UEFA / Global Football Board (équipe de la semaine, tirages)
 *  - Posts de clubs majeurs sans lien avec le roster du joueur
 *
 * Le tout est déterministe (basé sur la semaine) pour rester stable
 * d'un rendu à l'autre.
 */

import { CLUBS, COUNTRIES } from '../data/clubs';
import { getClubSquad } from '../data/squadDatabase';
import { getLeagueTopStats, getEuropeanTopStats } from './topScorersSystem';
import { EURO_CUP_LABELS } from './europeanCupSystem';
import { getCalendarSnapshot } from './seasonSystem';
import { getNationalSquad } from './nationalSelectionSystem';
import { MATCH_STATUS, calendarMatchToFixture } from './matchCalendarSystem';

const hash = (s) => {
  let h = 2166136261 >>> 0;
  const str = String(s);
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};
const pick = (arr, seed) => arr[hash(seed) % arr.length];
const num = (seed, max) => hash(seed) % max;

const NATIONAL_TEAMS = [
  { code: 'FR', name: 'Équipe de France', handle: '@equipedefrance', color: '#1d4ed8' },
  { code: 'BR', name: 'Seleção Brasileira', handle: '@cbf_futebol', color: '#facc15' },
  { code: 'AR', name: 'Selección Argentina', handle: '@afaseleccion', color: '#0ea5e9' },
  { code: 'ES', name: 'Selección Española', handle: '@sefutbol', color: '#dc2626' },
  { code: 'GB', name: 'England Football', handle: '@england', color: '#fff' },
  { code: 'DE', name: 'Die Mannschaft', handle: '@dfb_team', color: '#000' },
  { code: 'IT', name: 'Nazionale Italia', handle: '@azzurri', color: '#1e3a8a' },
  { code: 'PT', name: 'Seleção Portugal', handle: '@selecaoportugal', color: '#16a34a' },
];

const FRIENDLY_OPPONENTS = ['Brésil', 'Argentine', 'Espagne', 'Allemagne', 'Pays-Bas', 'Belgique', 'Croatie', 'Maroc', 'Angleterre', 'Italie'];

const LEAGUE_HANDLES = {
  FR: { name: 'Ligue 1 McDonald\'s', handle: '@ligue1', color: '#0c1f5b' },
  ES: { name: 'LALIGA EA Sports', handle: '@laliga', color: '#dc2626' },
  GB: { name: 'Premier League', handle: '@premierleague', color: '#3d195b' },
  DE: { name: 'Bundesliga', handle: '@bundesliga_de', color: '#d20515' },
  IT: { name: 'Serie A TIM', handle: '@seriea', color: '#0066b3' },
  PT: { name: 'Liga Portugal', handle: '@ligaportugal', color: '#16a34a' },
  NL: { name: 'Eredivisie', handle: '@eredivisie', color: '#fb923c' },
  BR: { name: 'Brasileirão', handle: '@brasileirao', color: '#16a34a' },
};

const UEFA_AUTHOR = { name: 'UEFA', handle: '@UEFA', color: '#003366' };
const GFB_AUTHOR = { name: 'Global Football Board', handle: '@GlobalFootball', color: '#1e40af' };

const ROLE_SHORT = { GK: 'GB', DEF: 'DEF', MIL: 'MIL', ATT: 'ATT' };

/** Sélectionne 23 joueurs représentatifs pour une sélection nationale (déterministe). */
const buildNationalSquad = (countryCode, season, weekSeed, agentPlayerIds = new Set(), state = null) =>
  getNationalSquad(countryCode, season, weekSeed, agentPlayerIds, {
    liveRoster: state?.roster ?? [],
    leagueReputation: state?.leagueReputation ?? {},
    countryReputation: state?.countryReputation ?? {},
    agencyReputation: state?.reputation ?? 0,
    playerSegmentReputation: state?.playerSegmentReputation ?? {},
  });

/** Construit un post de convocation pour la sélection nationale. */
const buildSelectionPost = ({ team, season, week, agentPlayerIds, state }) => {
  const opponent = pick(FRIENDLY_OPPONENTS, `${team.code}-${week}`);
  // Date réelle calculée depuis le calendrier (1er aout 2025 = saison 1, semaine 1)
  const matchSnap = getCalendarSnapshot(week + 1);
  const date = matchSnap.dateLabel;
  const squad = buildNationalSquad(team.code, season, week, agentPlayerIds, state);
  const myInside = squad.filter((p) => agentPlayerIds.has(p.id));
  const id = `nt-${team.code}-${week}`;

  // Liste rendue : groupée par poste
  const byPos = { GK: [], DEF: [], MIL: [], ATT: [] };
  for (const p of squad) {
    if (byPos[p.position]) {
      byPos[p.position].push({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        club: p.club,
        rating: p.rating,
        isMine: agentPlayerIds.has(p.id),
        position: p.position,
      });
    }
  }

  const text = `📋 LISTE OFFICIELLE — ${team.name}\n${team.name} vs ${opponent} · ${date}\n${myInside.length > 0
    ? `${myInside.length} joueur(s) de ton agence retenu(s) ✅`
    : 'Aucun joueur de ton agence retenu cette fois.'}`;

  return {
    id,
    kind: 'selection',
    player: null,
    authorName: team.name,
    handle: team.handle,
    tag: 'SÉLECTION',
    text,
    image: null,
    likes: 5000 + num(id + 'l', 50000),
    comments: 200 + num(id + 'c', 1500),
    timeLabel: 'à l\'instant',
    commentsList: [
      { handle: '@callmemo', text: myInside.length ? `On y est. Force aux ${myInside.map((p) => p.firstName).join(' & ')} 💪` : 'Bizarre la liste sah…' },
      { handle: '@tac_tic', text: `Pas mal ce groupe contre ${opponent}.` },
    ],
    list: {
      title: `Groupe des 23 — ${team.name}`,
      groups: [
        { label: 'Gardiens', items: byPos.GK },
        { label: 'Défenseurs', items: byPos.DEF },
        { label: 'Milieux', items: byPos.MIL },
        { label: 'Attaquants', items: byPos.ATT },
      ],
    },
  };
};

/** Construit un post de classement buteurs d'un championnat. */
const buildLeagueScorerPost = ({ countryCode, state, week }) => {
  const meta = LEAGUE_HANDLES[countryCode];
  if (!meta) return null;
  const { scorers } = getLeagueTopStats(countryCode, state) ?? { scorers: [] };
  if (!scorers?.length) return null;
  const top = scorers.slice(0, 10);
  const id = `league-top-${countryCode}-${week}`;
  const flag = COUNTRIES.find((c) => c.code === countryCode)?.flag ?? '';
  return {
    id,
    kind: 'league',
    player: null,
    authorName: meta.name,
    handle: meta.handle,
    tag: 'CLASSEMENT',
    text: `${flag} 🥇 TOP 10 BUTEURS — Journée ${((week - 1) % 38) + 1}\nLe classement officiel des canonniers du championnat.`,
    image: null,
    likes: 3000 + num(id + 'l', 30000),
    comments: 80 + num(id + 'c', 800),
    timeLabel: 'à l\'instant',
    commentsList: [
      { handle: '@statszone', text: 'La densité offensive est dingue cette saison 🔥' },
      { handle: '@boxtobox', text: 'Le top 3 va se jouer à un but près.' },
    ],
    list: {
      title: `Top 10 buteurs — ${meta.name}`,
      ranked: top.map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        club: p.club,
        goals: p.goals,
        assists: p.assists,
        isMine: p.isMine,
        position: p.position,
      })),
    },
  };
};

/** Construit un post UEFA "équipe de la semaine" pour la coupe d'Europe principale. */
const buildUefaTeamOfWeekPost = ({ state, week, season, agentPlayerIds }) => {
  const competition = 'CL';
  const { scorers, assisters } = getEuropeanTopStats(competition, state) ?? { scorers: [], assisters: [] };
  const pool = [...(scorers ?? []), ...(assisters ?? [])];
  if (!pool.length) return null;
  const seen = new Set();
  const unique = [];
  for (const p of pool) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    unique.push(p);
  }
  const xi = unique.slice(0, 11);
  const id = `uefa-totw-${week}`;
  const myCount = xi.filter((p) => agentPlayerIds.has(p.id)).length;
  return {
    id,
    kind: 'uefa',
    player: null,
    authorName: UEFA_AUTHOR.name,
    handle: UEFA_AUTHOR.handle,
    tag: 'TEAM OF THE WEEK',
    text: `⭐ #UCL Team of the Week\nLe XI de la semaine en ${EURO_CUP_LABELS[competition]?.name ?? 'Champions League'}.${myCount ? `\n${myCount} de ton agence dedans ✨` : ''}`,
    image: null,
    likes: 8000 + num(id + 'l', 40000),
    comments: 150 + num(id + 'c', 1200),
    timeLabel: 'à l\'instant',
    commentsList: [
      { handle: '@ucl_fan', text: 'Sélection difficile à contester 🌟' },
    ],
    list: {
      title: 'XI de la semaine — UCL',
      ranked: xi.map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        club: p.club,
        goals: p.goals,
        assists: p.assists,
        isMine: agentPlayerIds.has(p.id),
        position: p.position,
      })),
    },
  };
};

const getClubName = (club) => club?.name ?? club ?? '';

// ============= POSTS DE VIE DES CLUBS (blessures, prolongations, mercato IA) =============

const handleFor = (club) => '@' + String(club).toLowerCase().replace(/[^a-z0-9]/g, '') + '_off';

const pickPlayerFromClub = (club, season, seed) => {
  try {
    const squad = getClubSquad({ name: club }, season) ?? [];
    if (!squad.length) return null;
    return squad[hash(seed) % squad.length];
  } catch (e) {
    return null;
  }
};

const buildInjuryPost = ({ club, season, week, agentClubs }) => {
  if (agentClubs?.has(club)) return null;
  const seed = `injury-${club}-${week}`;
  const p = pickPlayerFromClub(club, season, seed);
  if (!p) return null;
  const durations = ['10 jours', '3 semaines', '6 semaines', '2 mois'];
  const types = ['ischio', 'cheville', 'mollet', 'adducteurs', 'genou'];
  const dur = pick(durations, seed + 'd');
  const type = pick(types, seed + 't');
  return {
    id: seed,
    kind: 'club',
    player: null,
    authorName: club,
    handle: handleFor(club),
    tag: 'INFIRMERIE',
    text: `🚑 Communiqué médical — ${p.firstName} ${p.lastName} souffre d'une blessure aux ${type}. Indisponibilité estimée : ${dur}. Prompt rétablissement champion.`,
    image: null,
    likes: 800 + num(seed + 'l', 12000),
    comments: 30 + num(seed + 'c', 400),
    timeLabel: 'à l\'instant',
    commentsList: [
      { handle: '@medicfoot', text: 'Coup dur pour le groupe 😔' },
      { handle: '@ultras', text: `On t'attend ${p.firstName} ❤️` },
    ],
  };
};

const buildExtensionPost = ({ club, season, week, agentClubs }) => {
  if (agentClubs?.has(club)) return null;
  const seed = `ext-${club}-${week}`;
  const p = pickPlayerFromClub(club, season, seed);
  if (!p) return null;
  const years = 2 + (hash(seed + 'y') % 4);
  return {
    id: seed,
    kind: 'club',
    player: null,
    authorName: club,
    handle: handleFor(club),
    tag: 'PROLONGATION',
    text: `✍️ OFFICIEL — ${p.firstName} ${p.lastName} prolonge avec ${club} jusqu'en ${2026 + years}. L'aventure continue ! 💚`,
    image: null,
    likes: 4500 + num(seed + 'l', 35000),
    comments: 100 + num(seed + 'c', 1200),
    timeLabel: 'à l\'instant',
    commentsList: [
      { handle: '@fanszone', text: 'Énorme nouvelle 🔥' },
      { handle: '@mercatolive', text: 'Beau coup du club.' },
    ],
  };
};

const buildAiTransferPost = ({ fromClub, toClub, season, week }) => {
  const seed = `aitrans-${fromClub}-${toClub}-${week}`;
  const p = pickPlayerFromClub(fromClub, season, seed);
  if (!p) return null;
  const fee = 8 + (hash(seed + 'f') % 75);
  return {
    id: seed,
    kind: 'press',
    player: null,
    authorName: 'FootMercato',
    handle: '@footmercato',
    tag: 'OFFICIEL',
    text: `🚨 OFFICIEL — ${p.firstName} ${p.lastName} (${fromClub}) s'engage avec ${toClub}. Transfert estimé à ${fee}M€. Contrat signé pour ${3 + (hash(seed + 'y') % 3)} saisons.`,
    image: null,
    likes: 6000 + num(seed + 'l', 40000),
    comments: 150 + num(seed + 'c', 1500),
    timeLabel: 'à l\'instant',
    commentsList: [
      { handle: '@transferroom', text: 'Beau coup pour ' + toClub + ' 👀' },
      { handle: '@ultras', text: 'Mercato qui s\'enflamme 🔥' },
    ],
  };
};

const TOP_CLUBS_AI = ['Real Madrid', 'Man City', 'Bayern', 'PSG', 'Liverpool', 'Barcelona', 'Inter', 'Arsenal', 'Chelsea', 'Juventus', 'Milan', 'Atletico', 'Tottenham', 'Dortmund', 'Napoli'];

const buildClubLifePosts = ({ state, week, season, agentClubs }) => {
  const out = [];
  const seasonWeek = ((week - 1) % 38) + 1;

  // 1 prolongation/semaine (rotation)
  const extClub = TOP_CLUBS_AI[(week * 3) % TOP_CLUBS_AI.length];
  const ext = buildExtensionPost({ club: extClub, season, week, agentClubs });
  if (ext) out.push(ext);

  // 1-2 blessures/semaine
  for (let i = 0; i < 2; i += 1) {
    const club = TOP_CLUBS_AI[(week * 5 + i * 7) % TOP_CLUBS_AI.length];
    const post = buildInjuryPost({ club, season, week: week + i, agentClubs });
    if (post) out.push(post);
  }

  // Mercato IA — on s'appuie sur les VRAIS transferts persistés cette semaine
  // (provenant d'aiTransferPersistenceSystem) pour garantir la cohérence avec le marché.
  const realTransfers = (state?.aiTransferLog ?? []).filter((t) => t?.week === week);
  realTransfers.forEach((t) => {
    if (agentClubs?.has(t.fromClub) || agentClubs?.has(t.toClub)) return;
    const seed = `aitrans-real-${t.id}`;
    const years = 3 + (hash(seed + 'y') % 3);
    out.push({
      id: seed,
      kind: 'press',
      player: null,
      authorName: 'FootMercato',
      handle: '@footmercato',
      tag: 'OFFICIEL',
      text: `🚨 OFFICIEL — ${t.playerName} (${t.fromClub}) s'engage avec ${t.toClub}. Transfert estimé à ${t.fee}M€. Contrat signé pour ${years} saisons.`,
      image: null,
      likes: 6000 + num(seed + 'l', 40000),
      comments: 150 + num(seed + 'c', 1500),
      timeLabel: 'à l\'instant',
      commentsList: [
        { handle: '@transferroom', text: 'Beau coup pour ' + t.toClub + ' 👀' },
        { handle: '@ultras', text: 'Mercato qui s\'enflamme 🔥' },
      ],
    });
  });

  return out;
};

const buildFixtureResultPost = (fixture, week) => {
  const homeClub = getClubName(fixture?.homeClub);
  const awayClub = getClubName(fixture?.awayClub);
  if (!homeClub || !awayClub) return null;
  const homeGoals = fixture?.homeGoals;
  const awayGoals = fixture?.awayGoals;
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return null;
  const club = homeGoals >= awayGoals ? homeClub : awayClub;
  const scored = homeGoals >= awayGoals ? homeGoals : awayGoals;
  const conceded = homeGoals >= awayGoals ? awayGoals : homeGoals;
  const opponent = club === homeClub ? awayClub : homeClub;
  const resultTag = scored > conceded ? 'WIN' : 'DRAW';
  const headline = scored > conceded
    ? `✅ Terminé : ${club} s'impose ${scored}-${conceded} face à ${opponent}.`
    : `🤝 Terminé : ${club} et ${opponent} se quittent sur un score de ${scored}-${conceded}.`;

  return {
    id: `club-result-${fixture.fixtureId ?? `${club}-${week}`}`,
    kind: 'club',
    player: null,
    authorName: club,
    handle: '@' + club.toLowerCase().replace(/[^a-z0-9]/g, '') + '_off',
    tag: resultTag,
    text: `${headline}\n${fixture.competitionLabel ?? 'Championnat'} · semaine ${fixture.seasonWeek ?? ((week - 1) % 38) + 1}`,
    image: null,
    likes: 1800 + num(`club-result-${club}-${week}l`, 22000),
    comments: 60 + num(`club-result-${club}-${week}c`, 700),
    timeLabel: 'à l\'instant',
    commentsList: [
      { handle: '@matchpulse', text: scored > conceded ? 'Résultat logique sur le contenu.' : 'Un point qui peut compter.' },
      { handle: '@ultras', text: scored > conceded ? 'On prend les 3 points 🔥' : 'Il fallait mieux finir les actions.' },
    ],
  };
};

const buildFixturePreviewPost = (fixture, week) => {
  const homeClub = getClubName(fixture?.homeClub);
  const awayClub = getClubName(fixture?.awayClub);
  if (!homeClub || !awayClub) return null;
  const club = pick([homeClub, awayClub], `fixture-preview-author-${fixture.fixtureId ?? `${homeClub}-${awayClub}-${week}`}`);
  const opponent = club === homeClub ? awayClub : homeClub;

  return {
    id: `club-preview-${fixture.fixtureId ?? `${club}-${week}`}`,
    kind: 'club',
    player: null,
    authorName: club,
    handle: '@' + club.toLowerCase().replace(/[^a-z0-9]/g, '') + '_off',
    tag: 'MATCHDAY',
    text: `📣 Matchday : ${club} vs ${opponent}.\n${fixture.competitionLabel ?? 'Championnat'} · coup d'envoi cette semaine.`,
    image: null,
    likes: 1200 + num(`club-preview-${club}-${week}l`, 18000),
    comments: 35 + num(`club-preview-${club}-${week}c`, 500),
    timeLabel: 'à venir',
    commentsList: [
      { handle: '@tactic_corner', text: `Curieux de voir le plan de jeu contre ${opponent}.` },
      { handle: '@fanszone', text: 'Gros rendez-vous, il faut répondre présent.' },
    ],
  };
};

const getFixturesFromCalendar = (state, week, status) =>
  (Array.isArray(state?.matchCalendar) ? state.matchCalendar : [])
    .filter((match) => match.week === week)
    .filter((match) => match.status === status)
    .filter((match) => !match.competition || match.competition === 'LEAGUE')
    .map(calendarMatchToFixture)
    .filter((fixture) => fixture?.homeClub?.name && fixture?.awayClub?.name);

/** Posts officiels de clubs majeurs branchés sur les vrais fixtures. */
const buildClubOfficialPosts = ({ state, week, agentClubs }) => {
  const topClubs = ['Real Madrid', 'Man City', 'Bayern', 'PSG', 'Liverpool', 'Barcelona', 'Inter', 'Arsenal'];
  const out = [];
  const centralRecentFixtures = getFixturesFromCalendar(state, week, MATCH_STATUS.PLAYED);
  const centralUpcomingFixtures = getFixturesFromCalendar(state, week, MATCH_STATUS.SCHEDULED);
  const recentFixtures = (centralRecentFixtures.length ? centralRecentFixtures : state?.lastFixtures ?? []).filter((fixture) => {
    const home = getClubName(fixture?.homeClub);
    const away = getClubName(fixture?.awayClub);
    return topClubs.includes(home) || topClubs.includes(away);
  });
  const upcomingFixtures = (centralUpcomingFixtures.length ? centralUpcomingFixtures : state?.nextFixtures ?? []).filter((fixture) => {
    const home = getClubName(fixture?.homeClub);
    const away = getClubName(fixture?.awayClub);
    return topClubs.includes(home) || topClubs.includes(away);
  });

  recentFixtures.slice(0, 4).forEach((fixture) => {
    const club = [getClubName(fixture?.homeClub), getClubName(fixture?.awayClub)].find((name) => topClubs.includes(name) && !agentClubs.has(name));
    if (!club) return;
    const post = buildFixtureResultPost(fixture, week);
    if (post) out.push(post);
  });

  upcomingFixtures.slice(0, 4).forEach((fixture) => {
    const club = [getClubName(fixture?.homeClub), getClubName(fixture?.awayClub)].find((name) => topClubs.includes(name) && !agentClubs.has(name));
    if (!club) return;
    const alreadyCovered = out.some((post) => post.authorName === club);
    if (alreadyCovered) return;
    const post = buildFixturePreviewPost(fixture, week);
    if (post) out.push(post);
  });

  topClubs.forEach((club, idx) => {
    if (agentClubs.has(club)) return; // évite doublon avec posts club déjà gérés ailleurs
    if (out.some((post) => post.authorName === club)) return;
    if ((idx + week) % 2 !== 0) return;
    const seed = `cluboff-${club}-${week}`;
    out.push({
      id: seed,
      kind: 'club',
      player: null,
      authorName: club,
      handle: '@' + club.toLowerCase().replace(/[^a-z0-9]/g, '') + '_off',
      tag: 'TRAINING',
      text: `🟢 Séance terminée à ${club}. Le groupe prépare le prochain rendez-vous officiel.`,
      image: null,
      likes: 1500 + num(seed + 'l', 25000),
      comments: 40 + num(seed + 'c', 500),
      timeLabel: `il y a ${1 + (idx % 4)}j`,
      commentsList: [
        { handle: '@ultras', text: 'On est avec vous ❤️' },
        { handle: '@tactic_corner', text: 'Le projet prend forme.' },
      ],
    });
  });
  return out;
};

/**
 * Génère l'ensemble des posts "vivants" à injecter dans le feed.
 */
export const generateLivingFeedPosts = ({ state, week, season, agentPlayerIds, agentClubs }) => {
  const out = [];
  const seasonWeek = ((week - 1) % 38) + 1;

  // 1. Sélection nationale — uniquement pendant les vraies fenêtres Global Football Board
  // Sept (sw 6), Oct (sw 11), Nov (sw 15), Mar (sw 27), Juin (sw 36)
  const SELECTION_WEEKS = [6, 11, 15, 27, 36];
  if (SELECTION_WEEKS.includes(seasonWeek)) {
    const teamIdx = SELECTION_WEEKS.indexOf(seasonWeek) % NATIONAL_TEAMS.length;
    const team = NATIONAL_TEAMS[teamIdx];
    out.push(buildSelectionPost({ team, season, week, agentPlayerIds, state }));
    const agencyCountry = state?.agencyProfile?.countryCode ?? 'FR';
    const agencyTeam = NATIONAL_TEAMS.find((t) => t.code === agencyCountry);
    if (agencyTeam && agencyTeam.code !== team.code) {
      out.push(buildSelectionPost({ team: agencyTeam, season, week, agentPlayerIds, state }));
    }
  }

  // 2. Classements buteurs — uniquement après ~8 journées (sinon c'est ridicule)
  if (seasonWeek >= 9 && seasonWeek % 4 === 0) {
    const leagueCodes = Object.keys(LEAGUE_HANDLES);
    const idx = Math.floor((week - 1) / 4) % leagueCodes.length;
    const code = leagueCodes[idx];
    const post = buildLeagueScorerPost({ countryCode: code, state, week });
    if (post) out.push(post);
    const agencyCountry = state?.agencyProfile?.countryCode ?? 'FR';
    if (agencyCountry !== code && LEAGUE_HANDLES[agencyCountry]) {
      const post2 = buildLeagueScorerPost({ countryCode: agencyCountry, state, week });
      if (post2) out.push(post2);
    }
  }

  // 3. UEFA Team of the Week — uniquement quand la phase de groupes a démarré
  if (seasonWeek >= 8 && seasonWeek % 3 === 0) {
    const post = buildUefaTeamOfWeekPost({ state, week, season, agentPlayerIds });
    if (post) out.push(post);
  }

  // 4. Posts clubs officiels (toujours quelques-uns mais raisonnable)
  out.push(...buildClubOfficialPosts({ state, week, agentClubs }));

  // 5. Vie des clubs : blessures, prolongations, mercato IA
  out.push(...buildClubLifePosts({ state, week, season, agentClubs }));

  return out;
};
