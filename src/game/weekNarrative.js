import { CLUBS } from '../data/clubs';
import { EURO_CUP_LABELS } from '../systems/europeanCupSystem';
import { createManualNewsPost } from '../systems/newsSystem';
import { getCalendarSnapshot, getWeekDailySnapshots } from '../systems/seasonSystem';
import { generateSeasonAwards, calculateCoherenceScore } from '../systems/weeklyEventsSystem';
import { pick, rand } from '../utils/helpers';
import { translateText } from '../utils/i18n';

const renderNarrativeText = (template = '', vars = {}) =>
  String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key) => String(vars[key] ?? ''));

const getNarrativeList = (narrativeTemplates = {}, domain, periodKey) =>
  narrativeTemplates?.[`${domain}:${periodKey}`] ?? [];

const getSeasonAwardMemory = (seasonAwards, season) => ({
  ...(seasonAwards?.[season] ?? {}),
});

const getBallonDorWinner = (roster) => {
  if (!roster?.length) return null;
  const eligible = roster.filter((p) => (p.rating ?? 0) >= 160);
  if (!eligible.length) return null;
  return [...eligible].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
};

const getChampionsLeagueWinner = (leagueTables) => {
  const rows = Object.values(leagueTables ?? {}).flat();
  const topClubs = rows
    .filter((row) => row.played >= 8)
    .sort((a, b) => (b.points + b.goalDiff * 0.35 + b.goalsFor * 0.08) - (a.points + a.goalDiff * 0.35 + a.goalsFor * 0.08))
    .slice(0, 12);

  return pick(topClubs.length ? topClubs : rows)?.club ?? pick(CLUBS).name;
};

export const generateWorldSummary = ({ week, phase, worldState, narrativeTemplates = {} }) => {
  const europeanClubs = CLUBS.filter((club) => ['FR', 'ES', 'EN', 'IT', 'DE', 'PT', 'NL'].includes(club.countryCode));
  const pickClubName = () => pick(europeanClubs)?.name ?? pick(CLUBS)?.name ?? 'Un grand club européen';
  const losingClub = pickClubName();
  let winningClub = pickClubName();
  if (winningClub === losingClub) winningClub = pickClubName();
  const score = `${1 + rand(0, 1)}-${2 + rand(0, 1)}`;

  const calmWeek = Math.random() < 0.25 && !phase.mercato && !phase.deadlineDay;
  if (calmWeek) {
    const calmTemplate = pick(getNarrativeList(narrativeTemplates, 'world_summary', 'calm'))?.text
      ?? 'Peu de mouvements majeurs dans le monde du foot. Les clubs observent, les agents préparent leurs dossiers.';
    return [{
      type: 'calm',
      title: 'Semaine calme',
      text: calmTemplate,
    }];
  }

  const dbPool = getNarrativeList(narrativeTemplates, 'world_summary', 'pool');
  const pool = dbPool.length
    ? dbPool.map((item) => ({
      type: item.category ?? 'media',
      title: item.subject ?? 'Info monde',
      text: renderNarrativeText(item.text ?? '', { losingClub, winningClub, score }),
    }))
    : [
      { type: 'match', title: 'Choc européen', text: `${losingClub} s'incline ${score} contre ${winningClub} dans un match très suivi. Plusieurs cadres sont pointés du doigt par la presse et les émissions du soir ouvrent le débat sur l'état du vestiaire.` },
      { type: 'injury', title: 'Blessure star', text: 'Une star du continent se blesse. Son club pourrait chercher une solution rapide au mercato.' },
      { type: 'rumor', title: 'Rumeur marché', text: 'Un insider annonce que plusieurs clubs préparent déjà leur prochain numéro 9.' },
      { type: 'media', title: 'Débat agents', text: 'Les médias débattent du rôle des agents dans les carrières des jeunes talents.' },
      { type: 'club', title: 'Président sous pression', text: 'Un président promet de recruter après une série de mauvais résultats.' },
    ];

  const summary = [pick(pool)];
  if (phase.mercato) {
    const mercatoTemplate = pick(getNarrativeList(narrativeTemplates, 'world_summary', 'mercato'))?.text
      ?? 'Le mercato {window} accélère. Les clubs testent plusieurs dossiers avant de formuler des offres.';
    summary.push({ type: 'mercato', title: 'Marché actif', text: renderNarrativeText(mercatoTemplate, { window: phase.window }) });
  }
  if (worldState?.scandal_media) {
    const mediaTemplate = pick(getNarrativeList(narrativeTemplates, 'world_summary', 'media_pressure'))?.text
      ?? 'Les journalistes cherchent les histoires sensibles. Les petites phrases peuvent devenir des crises.';
    summary.push({ type: 'media', title: 'Presse agressive', text: mediaTemplate });
  }
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
        ? `${shortlist.firstName} ${shortlist.lastName} apparaît dans la liste officielle du Ballon Global. La campagne médiatique commence.`
        : "La liste du Ballon Global tombe, mais aucun joueur de l'agence n'est encore assez haut dans la hiérarchie.",
      reputationImpact: shortlist ? 6 : 0,
      account: { name: 'France Football Desk', kind: 'journal', icon: 'FF', color: '#172026' },
    }));
    if (shortlist) {
      reputation += 6;
      income += 12000;
      events.push({ player: `${shortlist.firstName} ${shortlist.lastName}`, playerId: shortlist.id, label: "Nominé Ballon Global", good: true, money: 12000, rep: 6, calendar: true });
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
                { week, type: 'trophee', label: "Ballon Global", coherenceScore: ballonDorAward.coherenceScore },
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
        label: "Remporte le Ballon Global",
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
        text: `${winner.firstName} ${winner.lastName} remporte le Ballon Global avec un score de cohérence de ${ballonDorAward.coherenceScore} (note: ${winner.rating}, moyenne: ${winner.seasonStats?.averageRating?.toFixed(1)}). L'agence change de dimension.`,
        reputationImpact: 35,
        account: { name: 'France Football Desk', kind: 'journal', icon: 'FF', color: '#172026' },
      }));
    } else {
      nextSeasonMemory.ballonDorWinner = 'world_winner';
      news.push(createManualNewsPost({
        type: 'media',
        player: null,
        week,
        text: "Le Ballon Global est attribué hors de l'agence. Les standards mondiaux restent très élevés: niveau élite, grosse moyenne et impact décisif toute la saison.",
        reputationImpact: 0,
        account: { name: 'France Football Desk', kind: 'journal', icon: 'FF', color: '#172026' },
      }));
    }
  }

  if (phase.seasonWeek === 37 && !seasonMemory.championsLeagueWinner) {
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

const toDisplayWeekday = (label = '', fallback = 'Jour') => {
  if (!label) return fallback;
  return label.charAt(0).toUpperCase() + label.slice(1);
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
  const dailyDates = getWeekDailySnapshots(week);
  const seasonWeekLabel = phase?.season && phase?.seasonWeek
    ? `S${phase.season} · Semaine ${phase.seasonWeek}/38`
    : `Semaine ${week}`;
  const topEuroMatch = [...euroMatchResults].sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0))[0];
  const topWorldCupMatch = [...worldCupMatchResults].sort((a, b) => (b.matchRating ?? 0) - (a.matchRating ?? 0))[0];
  const worldCupBlock = topWorldCupMatch ? {
    id: `wc_${topWorldCupMatch.playerId ?? week}`,
    day: 'Tournoi Mondial',
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

  const mondayCard = {
      day: toDisplayWeekday(dailyDates[0]?.weekdayLabel, 'Lundi'),
      dateLabel: dailyDates[0]?.dateLabel,
      icon: '📅',
      tone: 'info',
      major: false,
      kind: 'calendar',
      title: currentDate.dateLabel,
      text: `${seasonWeekLabel} · ${phase.phase}. ${activePeriod ? `${activePeriod.emoji} ${activePeriod.label}` : 'Rythme normal'} de l'agence.`,
      chips: [currentDate.weekRangeLabel, `Messages ${deliveredMessagesCount}/${queueSize}`],
  };

  const tuesdayCard = topWorldCupMatch ? {
      day: toDisplayWeekday(dailyDates[1]?.weekdayLabel, 'Mardi'),
      dateLabel: dailyDates[1]?.dateLabel,
      icon: '🌍',
      tone: topWorldCupMatch.isChampion ? 'good' : topWorldCupMatch.isEliminated ? 'danger' : 'warn',
      major: true,
      kind: 'worldCupResult',
      title: `CdM · ${topWorldCupMatch.playerName}`,
      text: `Résultat mondial: ${topWorldCupMatch.countryName} ${topWorldCupMatch.score} ${topWorldCupMatch.opponent} · note ${topWorldCupMatch.matchRating}.`,
      chips: [`${topWorldCupMatch.minutes} min`, `Phase ${topWorldCupMatch.phase}`, topWorldCupMatch.isChampion ? 'Titre' : topWorldCupMatch.isEliminated ? 'Sortie' : topWorldCupMatch.result],
    } : {
      day: toDisplayWeekday(dailyDates[1]?.weekdayLabel, 'Mardi'),
      dateLabel: dailyDates[1]?.dateLabel,
      icon: '🏋️',
      tone: 'good',
      major: false,
      kind: 'training',
      eventType: 'performance',
      title: "Séance d'entraînement collective",
      text: "Travail physique, tactique et récupération active pour préparer les prochains matchs.",
      chips: ['Intensité contrôlée', 'Prévention blessures'],
    };

  const wednesdayCard = topEuroMatch ? {
      day: toDisplayWeekday(dailyDates[2]?.weekdayLabel, 'Mercredi'),
      dateLabel: dailyDates[2]?.dateLabel,
      icon: '🏆',
      tone: topEuroMatch.result === 'win' ? 'good' : topEuroMatch.result === 'loss' ? 'danger' : 'warn',
      major: true,
      kind: 'euroResult',
      match: topEuroMatch,
      title: `${topEuroMatch.competitionLabel ?? EURO_CUP_LABELS[topEuroMatch.competition]?.name ?? topEuroMatch.competition ?? 'Europe'} · ${topEuroMatch.playerName ?? 'Joueur'}`,
      text: `Match européen: ${topEuroMatch.club ?? 'Club'} ${topEuroMatch.score ?? '0-0'} ${topEuroMatch.opponentName ?? topEuroMatch.opponent ?? '—'} · note ${topEuroMatch.matchRating ?? '—'}.`,
      chips: [topEuroMatch.phase ?? 'Europe', `${topEuroMatch.minutes ?? 0} min`, topEuroMatch.result === 'win' ? 'Victoire' : topEuroMatch.result === 'loss' ? 'Défaite' : 'Nul'],
    } : {
      day: toDisplayWeekday(dailyDates[2]?.weekdayLabel, 'Mercredi'),
      dateLabel: dailyDates[2]?.dateLabel,
      icon: '📹',
      tone: 'info',
      major: false,
      kind: 'analysis',
      eventType: 'media',
      title: 'Analyse vidéo et préparation',
      text: "Débrief des performances et ajustements individuels avant la fin de semaine.",
      chips: ['Débrief staff', 'Plan de progression'],
    };

  const thursdayCard = {
      day: toDisplayWeekday(dailyDates[3]?.weekdayLabel, 'Jeudi'),
      dateLabel: dailyDates[3]?.dateLabel,
      icon: '💬',
      tone: promiseFailuresCount > 0 ? 'danger' : 'info',
      major: false,
      kind: 'messages',
      title: `Messages du jour`,
      text: `${messageCount} messages, ${offerCount} offres et ${fixtureCount} rendez-vous sportifs ont animé la semaine.`,
      chips: [
        `${deliveredMessagesCount} délivrés`,
        `${promiseFailuresCount} promesses`,
        `${leavingPlayersCount} départs`,
      ],
    };

  const fridayPrimaryCard = interactiveEvent ? {
      day: toDisplayWeekday(dailyDates[4]?.weekdayLabel, 'Vendredi'),
      dateLabel: dailyDates[4]?.dateLabel,
      icon: '⚡',
      tone: 'warn',
      major: true,
      kind: 'interactive',
      eventId: interactiveEvent.event?.id ?? interactiveEvent.id ?? null,
      eventType: interactiveEvent.event?.types?.[0] ?? interactiveEvent.event?.type ?? interactiveEvent.type ?? null,
      title: interactiveEvent.event?.title ?? interactiveEvent.title ?? 'Événement',
      text: interactiveEvent.event?.description ?? interactiveEvent.text ?? 'Un dossier réclame une réponse nette.',
      chips: interactiveEvent.chips ?? (interactiveEvent.player ? [`${interactiveEvent.player.firstName ?? ''} ${interactiveEvent.player.lastName ?? ''}`.trim()] : []),
    } : contractEvent ? {
      day: toDisplayWeekday(dailyDates[4]?.weekdayLabel, 'Vendredi'),
      dateLabel: dailyDates[4]?.dateLabel,
      icon: '📄',
      tone: 'info',
      major: false,
      kind: 'contract',
      eventId: contractEvent.event?.id ?? 'contract_exp',
      eventType: 'transfer',
      title: contractEvent.event?.title ?? contractEvent.title ?? 'Contrat à renouveler',
      text: contractEvent.event?.description ?? contractEvent.text ?? 'Un contrat avance cette semaine.',
      chips: contractEvent.chips ?? (contractEvent.player ? [`${contractEvent.player.firstName ?? ''} ${contractEvent.player.lastName ?? ''}`.trim()] : []),
    } : {
      day: toDisplayWeekday(dailyDates[4]?.weekdayLabel, 'Vendredi'),
      dateLabel: dailyDates[4]?.dateLabel,
      icon: '📣',
      tone: 'info',
      major: false,
      kind: 'prep',
      eventType: 'fans',
      title: 'Mise en place avant match',
      text: 'Conférence tactique, annonces de groupe et derniers réglages avant le week-end.',
      chips: ['Pré-match', 'Brief staff'],
    };

  const saturdayCard = topMatch ? {
      day: toDisplayWeekday(dailyDates[5]?.weekdayLabel, 'Samedi'),
      dateLabel: dailyDates[5]?.dateLabel,
      icon: '⚽',
      tone: topMatch.matchRating >= 8 ? 'good' : topMatch.matchRating <= 5.8 ? 'danger' : 'info',
      major: true,
      kind: 'match',
      title: `${topMatch.club} ${topMatch.score} ${topMatch.opponent}`,
      text: `${topMatch.playerName} a signé une note ${topMatch.matchRating}. ${topMatch.minutes} min, ${topMatch.goals} but, ${topMatch.assists} passe. ${topMatch.matchReport}`,
      chips: [topMatch.homeAway, topMatch.result === 'win' ? 'Victoire' : topMatch.result === 'loss' ? 'Défaite' : 'Nul'],
      match: topMatch,
    } : {
      day: toDisplayWeekday(dailyDates[5]?.weekdayLabel, 'Samedi'),
      dateLabel: dailyDates[5]?.dateLabel,
      icon: '🏟️',
      tone: 'warn',
      major: false,
      kind: 'matchday',
      eventType: 'performance',
      title: 'Week-end de championnat',
      text: 'Les matchs nationaux structurent la dynamique sportive et médiatique de la semaine.',
      chips: ['Jour de match', 'Suivi performance'],
    };

  const sundayCard = flopMatch ? {
      day: toDisplayWeekday(dailyDates[6]?.weekdayLabel, 'Dimanche'),
      dateLabel: dailyDates[6]?.dateLabel,
      icon: '📰',
      tone: flopMatch.matchRating <= 5.8 ? 'danger' : 'info',
      major: false,
      kind: 'flop',
      title: flopMatch.matchRating <= 5.8 ? `Semaine compliquée pour ${flopMatch.playerName}` : `Bilan de la semaine`,
      text: flopMatch.matchRating <= 5.8
        ? `${flopMatch.club} ${flopMatch.score} ${flopMatch.opponent}. Note ${flopMatch.matchRating}, ${flopMatch.matchReport}`
        : `Bilan financier net ${net >= 0 ? '+' : ''}${net}, bonus ${bonusMoney}, variation réputation ${reputationChange}.`,
      chips: [flopMatch.matchRating <= 5.8 ? 'Flop' : 'Bilan', `${net >= 0 ? '+' : ''}${net}`],
    } : {
      day: toDisplayWeekday(dailyDates[6]?.weekdayLabel, 'Dimanche'),
      dateLabel: dailyDates[6]?.dateLabel,
      icon: '📊',
      tone: net >= 0 ? 'good' : 'danger',
      major: false,
      kind: 'weeklySummary',
      eventType: 'performance',
      title: 'Bilan de fin de semaine',
      text: `Net ${net >= 0 ? '+' : ''}${net}, bonus ${bonusMoney}, réputation ${reputationChange >= 0 ? '+' : ''}${reputationChange}.`,
      chips: ['Synthèse', 'Projection semaine suivante'],
    };

  const timeline = [
    mondayCard,
    worldCupBlock,
    tuesdayCard,
    wednesdayCard,
    thursdayCard,
    fridayPrimaryCard,
    saturdayCard,
    sundayCard,
  ].filter(Boolean);

  return timeline.map((item) => ({
    ...item,
    title: typeof item.title === 'string' ? translateText(item.title) : item.title,
    text: typeof item.text === 'string' ? translateText(item.text) : item.text,
    chips: Array.isArray(item.chips) ? item.chips.map((chip) => (typeof chip === 'string' ? translateText(chip) : chip)) : item.chips,
    day: typeof item.day === 'string' ? translateText(item.day) : item.day,
  }));
};
