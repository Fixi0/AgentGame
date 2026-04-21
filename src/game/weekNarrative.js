import { CLUBS } from '../data/clubs';
import { EURO_CUP_LABELS } from '../systems/europeanCupSystem';
import { createManualNewsPost } from '../systems/newsSystem';
import { getCalendarSnapshot } from '../systems/seasonSystem';
import { generateSeasonAwards, calculateCoherenceScore } from '../systems/weeklyEventsSystem';
import { pick, rand } from '../utils/helpers';

const getSeasonAwardMemory = (seasonAwards, season) => ({
  ...(seasonAwards?.[season] ?? {}),
});

const getChampionsLeagueWinner = (leagueTables) => {
  const rows = Object.values(leagueTables ?? {}).flat();
  const topClubs = rows
    .filter((row) => row.played >= 8)
    .sort((a, b) => (b.points + b.goalDiff * 0.35 + b.goalsFor * 0.08) - (a.points + a.goalDiff * 0.35 + a.goalsFor * 0.08))
    .slice(0, 12);

  return pick(topClubs.length ? topClubs : rows)?.club ?? pick(CLUBS).name;
};

export const generateWorldSummary = ({ week, phase, worldState }) => {
  const calmWeek = Math.random() < 0.25 && !phase.mercato && !phase.deadlineDay;
  if (calmWeek) {
    return [{
      type: 'calm',
      title: 'Semaine calme',
      text: 'Peu de mouvements majeurs dans le monde du foot. Les clubs observent, les agents préparent leurs dossiers.',
    }];
  }

  const pool = [
    { type: 'match', title: 'Choc européen', text: 'Un grand club européen perd un match important. Plusieurs cadres sont critiqués dans la presse.' },
    { type: 'injury', title: 'Blessure star', text: 'Une star du continent se blesse. Son club pourrait chercher une solution rapide au mercato.' },
    { type: 'rumor', title: 'Rumeur marché', text: 'Un insider annonce que plusieurs clubs préparent déjà leur prochain numéro 9.' },
    { type: 'media', title: 'Débat agents', text: 'Les médias débattent du rôle des agents dans les carrières des jeunes talents.' },
    { type: 'club', title: 'Président sous pression', text: 'Un président promet de recruter après une série de mauvais résultats.' },
  ];

  const summary = [pick(pool)];
  if (phase.mercato) summary.push({ type: 'mercato', title: 'Marché actif', text: `Le mercato ${phase.window} accélère. Les clubs testent plusieurs dossiers avant de formuler des offres.` });
  if (worldState?.scandal_media) summary.push({ type: 'media', title: 'Presse agressive', text: 'Les journalistes cherchent les histoires sensibles. Les petites phrases peuvent devenir des crises.' });
  return summary.slice(0, 3).map((item) => ({ ...item, week }));
};

export const resolveAnnualCalendarEvents = ({ roster, leagueTables, phase, seasonAwards, week }) => {
  let nextRoster = roster;
  const events = [];
  const news = [];
  let income = 0;
  let reputation = 0;
  const seasonMemory = getSeasonAwardMemory(seasonAwards, phase.season);
  const nextSeasonMemory = { ...seasonMemory };

  if (phase.seasonWeek === 9 && !seasonMemory.ballonDorShortlist) {
    const shortlist = getBallonDorWinner(nextRoster);
    nextSeasonMemory.ballonDorShortlist = shortlist?.id ?? 'world_shortlist';
    news.push(createManualNewsPost({
      type: 'media',
      player: shortlist,
      week,
      text: shortlist
        ? `${shortlist.firstName} ${shortlist.lastName} apparaît dans la liste officielle du Ballon d'Or. La campagne médiatique commence.`
        : "La liste du Ballon d'Or tombe, mais aucun joueur de l'agence n'est encore assez haut dans la hiérarchie.",
      reputationImpact: shortlist ? 6 : 0,
      account: { name: 'France Football Desk', kind: 'journal', icon: 'FF', color: '#172026' },
    }));
    if (shortlist) {
      reputation += 6;
      income += 12000;
      events.push({ player: `${shortlist.firstName} ${shortlist.lastName}`, playerId: shortlist.id, label: "Nominé Ballon d'Or", good: true, money: 12000, rep: 6, calendar: true });
    }
  }

  if (phase.seasonWeek === 10 && !seasonMemory.ballonDorWinner) {
    // Use coherent award generation system
    const awards = generateSeasonAwards(nextRoster, phase.seasonWeek);
    const ballonDorAward = awards.find((a) => a.type === 'ballon_dor');

    if (ballonDorAward) {
      const winner = nextRoster.find((p) => p.id === ballonDorAward.playerId);
      nextSeasonMemory.ballonDorWinner = winner.id;

      nextRoster = nextRoster.map((player) =>
        player.id === winner.id
          ? {
              ...player,
              value: Math.floor(player.value * 1.55),
              moral: Math.max(0, Math.min(100, player.moral + 25)),
              trust: Math.max(0, Math.min(100, (player.trust ?? 50) + 5)),
              brandValue: Math.max(0, Math.min(100, (player.brandValue ?? 10) + 25)),
              timeline: [
                { week, type: 'trophee', label: "Ballon d'Or", coherenceScore: ballonDorAward.coherenceScore },
                ...(player.timeline ?? []),
              ],
            }
          : player,
      );
      income += 80000;
      reputation += 35;
      events.push({
        player: `${winner.firstName} ${winner.lastName}`,
        playerId: winner.id,
        label: "Remporte le Ballon d'Or",
        good: true,
        money: 80000,
        rep: 35,
        calendar: true,
        rating: winner.rating,
        seasonAvg: winner.seasonStats?.averageRating,
        coherenceScore: ballonDorAward.coherenceScore,
      });

      news.push(createManualNewsPost({
        type: 'media',
        player: winner,
        week,
        text: `${winner.firstName} ${winner.lastName} remporte le Ballon d'Or avec un score de cohérence de ${ballonDorAward.coherenceScore} (note: ${winner.rating}, moyenne: ${winner.seasonStats?.averageRating?.toFixed(1)}). L'agence change de dimension.`,
        reputationImpact: 35,
        account: { name: 'France Football Desk', kind: 'journal', icon: 'FF', color: '#172026' },
      }));
    } else {
      nextSeasonMemory.ballonDorWinner = 'world_winner';
      news.push(createManualNewsPost({
        type: 'media',
        player: null,
        week,
        text: "Le Ballon d'Or est attribué hors de l'agence. Les standards mondiaux restent très élevés: niveau élite, grosse moyenne et impact décisif toute la saison.",
        reputationImpact: 0,
        account: { name: 'France Football Desk', kind: 'journal', icon: 'FF', color: '#172026' },
      }));
    }
  }

  if (phase.seasonWeek === 36 && !seasonMemory.championsLeagueWinner) {
    const club = getChampionsLeagueWinner(leagueTables);
    nextSeasonMemory.championsLeagueWinner = club;
    const clubPlayer = nextRoster
      .filter((player) => player.club === club && player.injured <= 0)
      .sort((a, b) => scoreAwardCandidate(b) - scoreAwardCandidate(a))[0];

    if (clubPlayer) {
      nextRoster = nextRoster.map((player) =>
        player.id === clubPlayer.id
          ? {
              ...player,
              value: Math.floor(player.value * 1.25),
              moral: Math.max(0, Math.min(100, player.moral + 18)),
              brandValue: Math.max(0, Math.min(100, (player.brandValue ?? 10) + 12)),
              timeline: [
                { week, type: 'trophee', label: `Ligue des Champions avec ${club}` },
                ...(player.timeline ?? []),
              ],
            }
          : player,
      );
      income += 30000;
      reputation += 12;
      events.push({ player: `${clubPlayer.firstName} ${clubPlayer.lastName}`, playerId: clubPlayer.id, label: `Vainqueur de la LDC avec ${club}`, good: true, money: 30000, rep: 12, calendar: true });
    }

    news.push(createManualNewsPost({
      type: 'performance',
      player: clubPlayer,
      week,
      text: clubPlayer
        ? `${club} remporte la Ligue des Champions avec ${clubPlayer.firstName} ${clubPlayer.lastName} dans le groupe.`
        : `${club} remporte la Ligue des Champions. Une seule équipe soulève le trophée cette saison.`,
      reputationImpact: clubPlayer ? 12 : 0,
      account: { name: 'UEFA Match Centre', kind: 'club', icon: 'UC', color: '#2f80ed' },
    }));
  }

  return {
    roster: nextRoster,
    events,
    news,
    income,
    reputation,
    seasonAwards: {
      ...(seasonAwards ?? {}),
      [phase.season]: nextSeasonMemory,
    },
  };
};

const MATCHDAY_TEMPLATES = {
  Monday: { day: 'Lundi', icon: '📅', tone: 'info', label: 'Mise à jour' },
};

export const buildWeeklyTimeline = ({
  week,
  phase,
  activePeriod,
  deliveredMessagesCount,
  queueSize,
  offerCount,
  fixtureCount,
  euroMatchResults = [],
  worldCupMatchResults = [],
  messageCount,
  newsCount,
  interactiveEvent,
  contractEvent,
  topMatch,
  flopMatch,
  promiseFailuresCount,
  leavingPlayersCount,
  net,
  bonusMoney,
  reputationChange,
}) => {
  const currentDate = getCalendarSnapshot(week);
  const seasonWeekLabel = phase?.season && phase?.seasonWeek
    ? `S${phase.season} · Semaine ${phase.seasonWeek}/38`
    : `Semaine ${week}`;
  const topEuroMatch = [...euroMatchResults].sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0))[0];
  const topWorldCupMatch = [...worldCupMatchResults].sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0))[0];
  const worldCupBlock = topWorldCupMatch ? {
    id: `wc_${topWorldCupMatch.playerId ?? week}`,
    day: 'Coupe du Monde',
    icon: '🌍',
    tone: topWorldCupMatch.isChampion ? 'good' : topWorldCupMatch.isEliminated ? 'danger' : topWorldCupMatch.result === 'win' ? 'warn' : 'info',
    major: true,
    kind: 'worldCupMatch',
    title: `${topWorldCupMatch.countryName} · ${topWorldCupMatch.opponent}`,
    text: `${topWorldCupMatch.playerName ?? 'Un joueur'} a vécu un match mondial: ${topWorldCupMatch.score}, ${topWorldCupMatch.minutes} min, note ${topWorldCupMatch.matchRating}.`,
    chips: [
      topWorldCupMatch.phase ?? 'CdM',
      topWorldCupMatch.isChampion ? 'Champion du monde' : topWorldCupMatch.isEliminated ? 'Éliminé' : topWorldCupMatch.result === 'win' ? 'Victoire' : topWorldCupMatch.result === 'draw' ? 'Nul' : 'Défaite',
      topWorldCupMatch.goals > 0 ? `${topWorldCupMatch.goals} but${topWorldCupMatch.goals > 1 ? 's' : ''}` : 'Sans but',
      topWorldCupMatch.assists > 0 ? `${topWorldCupMatch.assists} passe${topWorldCupMatch.assists > 1 ? 's' : ''}` : 'Sans passe',
    ],
    match: topWorldCupMatch,
  } : null;

  return [
    {
      day: 'Lundi',
      icon: '📅',
      tone: 'info',
      major: false,
      kind: 'calendar',
      title: currentDate.dateLabel,
      text: `${seasonWeekLabel} · ${phase.phase}. ${activePeriod ? `${activePeriod.emoji} ${activePeriod.label}` : 'Rythme normal'} de l'agence.`,
      chips: [currentDate.weekRangeLabel, `Messages ${deliveredMessagesCount}/${queueSize}`],
    },
    worldCupBlock,
    topWorldCupMatch ? {
      day: 'Mardi',
      icon: '🌍',
      tone: topWorldCupMatch.isChampion ? 'good' : topWorldCupMatch.isEliminated ? 'danger' : 'warn',
      major: true,
      kind: 'worldCupResult',
      title: `CdM · ${topWorldCupMatch.playerName}`,
      text: `Résultat mondial: ${topWorldCupMatch.countryName} ${topWorldCupMatch.score} ${topWorldCupMatch.opponent} · note ${topWorldCupMatch.matchRating}.`,
      chips: [`${topWorldCupMatch.minutes} min`, `Phase ${topWorldCupMatch.phase}`, topWorldCupMatch.isChampion ? 'Titre' : topWorldCupMatch.isEliminated ? 'Sortie' : topWorldCupMatch.result],
    } : null,
    topEuroMatch ? {
      day: 'Mercredi',
      icon: '🏆',
      tone: topEuroMatch.result === 'win' ? 'good' : topEuroMatch.result === 'loss' ? 'danger' : 'warn',
      major: true,
      kind: 'euroResult',
      title: `${topEuroMatch.competitionLabel ?? EURO_CUP_LABELS[topEuroMatch.competition]?.name ?? topEuroMatch.competition ?? 'Europe'} · ${topEuroMatch.playerName ?? 'Joueur'}`,
      text: `Match européen: ${topEuroMatch.club ?? 'Club'} ${topEuroMatch.score ?? '0-0'} ${topEuroMatch.opponentName ?? topEuroMatch.opponent ?? '—'} · note ${topEuroMatch.matchRating ?? '—'}.`,
      chips: [topEuroMatch.phase ?? 'Europe', `${topEuroMatch.minutes ?? 0} min`, topEuroMatch.result === 'win' ? 'Victoire' : topEuroMatch.result === 'loss' ? 'Défaite' : 'Nul'],
    } : null,
    {
      day: 'Jeudi',
      icon: '💬',
      tone: promiseFailuresCount > 0 ? 'danger' : 'info',
      major: false,
      kind: 'messages',
      title: `Messages du jour`,
      text: `${messageCount} messages, ${queueSize} en file, ${offerCount} offres et ${fixtureCount} matches suivis cette semaine.`,
      chips: [
        `${deliveredMessagesCount} délivrés`,
        `${promiseFailuresCount} promesses`,
        `${leavingPlayersCount} départs`,
      ],
    },
    interactiveEvent ? {
      day: 'Vendredi',
      icon: '⚡',
      tone: 'warn',
      major: true,
      kind: 'interactive',
      title: interactiveEvent.title ?? 'Événement',
      text: interactiveEvent.text ?? 'Un dossier réclame une réponse nette.',
      chips: interactiveEvent.chips ?? [],
    } : null,
    contractEvent ? {
      day: 'Vendredi',
      icon: '📄',
      tone: 'info',
      major: false,
      kind: 'contract',
      title: contractEvent.title ?? 'Contrat',
      text: contractEvent.text ?? 'Un contrat avance cette semaine.',
      chips: contractEvent.chips ?? [],
    } : null,
    topMatch ? {
      day: 'Samedi',
      icon: '⚽',
      tone: topMatch.matchRating >= 8 ? 'good' : topMatch.matchRating <= 5.8 ? 'danger' : 'info',
      major: true,
      kind: 'match',
      title: `${topMatch.club} ${topMatch.score} ${topMatch.opponent}`,
      text: `${topMatch.playerName} a signé une note ${topMatch.matchRating}. ${topMatch.minutes} min, ${topMatch.goals} but, ${topMatch.assists} passe. ${topMatch.matchReport}`,
      chips: [topMatch.homeAway, topMatch.result === 'win' ? 'Victoire' : topMatch.result === 'loss' ? 'Défaite' : 'Nul'],
      match: topMatch,
    } : null,
    flopMatch ? {
      day: 'Dimanche',
      icon: '📰',
      tone: flopMatch.matchRating <= 5.8 ? 'danger' : 'info',
      major: false,
      kind: 'flop',
      title: flopMatch.matchRating <= 5.8 ? `Semaine compliquée pour ${flopMatch.playerName}` : `Bilan de la semaine`,
      text: flopMatch.matchRating <= 5.8
        ? `${flopMatch.club} ${flopMatch.score} ${flopMatch.opponent}. Note ${flopMatch.matchRating}, ${flopMatch.matchReport}`
        : `Bilan financier net ${net >= 0 ? '+' : ''}${net}, bonus ${bonusMoney}, variation réputation ${reputationChange}.`,
      chips: [flopMatch.matchRating <= 5.8 ? 'Flop' : 'Bilan', `${net >= 0 ? '+' : ''}${net}`],
    } : null,
  ].filter(Boolean);
};
