/**
 * livingFeedSystem.js
 * Génère des publications "vivantes" pour le feed social :
 *  - Posts officiels des sélections nationales (liste des 23 visible)
 *  - Posts officiels des championnats (top buteurs / équipe-type)
 *  - Posts officiels UEFA / FIFA (équipe de la semaine, tirages)
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
const FIFA_AUTHOR = { name: 'FIFA', handle: '@FIFAcom', color: '#1e40af' };

const ROLE_SHORT = { GK: 'GB', DEF: 'DEF', MIL: 'MIL', ATT: 'ATT' };

/** Sélectionne 23 joueurs représentatifs pour une sélection nationale (déterministe). */
const buildNationalSquad = (countryCode, season, weekSeed, agentPlayerIds = new Set()) => {
  // Pool : top joueurs des clubs du pays + joueurs nés dans le pays jouant à l'étranger.
  const candidates = [];
  for (const club of CLUBS) {
    const squad = getClubSquad(club, season).slice(0, 16);
    for (const p of squad) {
      if (!p) continue;
      if (p.countryCode === countryCode) {
        candidates.push(p);
      }
    }
  }
  // Tri par rating + petite variance déterministe pour faire tourner l'effectif d'une convocation à l'autre
  const variance = (id) => (hash(`${id}-${weekSeed}`) % 100) / 100;
  candidates.sort((a, b) => (b.rating ?? 0) + variance(b.id) * 6 - ((a.rating ?? 0) + variance(a.id) * 6));

  // Quota : 3 GK, 8 DEF, 7 MIL, 5 ATT
  const quota = { GK: 3, DEF: 8, MIL: 7, ATT: 5 };
  const taken = { GK: 0, DEF: 0, MIL: 0, ATT: 0 };
  const used = new Set();
  const squad = [];
  for (const p of candidates) {
    if (used.has(p.id)) continue;
    if ((taken[p.position] ?? 0) >= (quota[p.position] ?? 0)) continue;
    squad.push(p);
    used.add(p.id);
    taken[p.position] += 1;
    if (squad.length >= 23) break;
  }
  // Garantit présence des joueurs du joueur (agence) éligibles
  const myEligible = candidates.filter((p) => agentPlayerIds.has(p.id) && !used.has(p.id));
  for (const p of myEligible) {
    if (squad.length < 23) {
      squad.push(p);
      used.add(p.id);
    } else {
      // Remplace le moins bien noté de la même position
      const idx = [...squad].reverse().findIndex((q) => q.position === p.position);
      if (idx >= 0) squad[squad.length - 1 - idx] = p;
    }
  }
  return squad;
};

/** Construit un post de convocation pour la sélection nationale. */
const buildSelectionPost = ({ team, season, week, agentPlayerIds }) => {
  const opponent = pick(FRIENDLY_OPPONENTS, `${team.code}-${week}`);
  // Date réelle calculée depuis le calendrier (1er aout 2025 = saison 1, semaine 1)
  const matchSnap = getCalendarSnapshot(week + 1);
  const date = matchSnap.dateLabel;
  const squad = buildNationalSquad(team.code, season, week, agentPlayerIds);
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

/** Posts officiels de clubs majeurs branchés sur les vrais fixtures. */
const buildClubOfficialPosts = ({ state, week, agentClubs }) => {
  const topClubs = ['Real Madrid', 'Manchester City', 'Bayern Munich', 'PSG', 'Liverpool', 'Barcelona', 'Inter', 'Arsenal'];
  const out = [];
  const recentFixtures = (state?.lastFixtures ?? []).filter((fixture) => {
    const home = getClubName(fixture?.homeClub);
    const away = getClubName(fixture?.awayClub);
    return topClubs.includes(home) || topClubs.includes(away);
  });
  const upcomingFixtures = (state?.nextFixtures ?? []).filter((fixture) => {
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

  // 1. Sélection nationale — uniquement pendant les vraies fenêtres FIFA
  // Sept (sw 6), Oct (sw 11), Nov (sw 15), Mar (sw 27), Juin (sw 36)
  const SELECTION_WEEKS = [6, 11, 15, 27, 36];
  if (SELECTION_WEEKS.includes(seasonWeek)) {
    const teamIdx = SELECTION_WEEKS.indexOf(seasonWeek) % NATIONAL_TEAMS.length;
    const team = NATIONAL_TEAMS[teamIdx];
    out.push(buildSelectionPost({ team, season, week, agentPlayerIds }));
    const agencyCountry = state?.agencyProfile?.countryCode ?? 'FR';
    const agencyTeam = NATIONAL_TEAMS.find((t) => t.code === agencyCountry);
    if (agencyTeam && agencyTeam.code !== team.code) {
      out.push(buildSelectionPost({ team: agencyTeam, season, week, agentPlayerIds }));
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

  return out;
};
