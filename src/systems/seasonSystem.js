import { CLUBS, getCountry } from '../data/clubs';
import { makeId, pick, rand } from '../utils/helpers';
import { getClubId } from './identitySystem';
import { isEnglish } from '../utils/i18n';
import { getWorldStateOfferModifier } from './worldStateSystem';
import { normalizeAgencyReputation } from './reputationSystem';
import { getClubSquad } from '../data/squadDatabase';

const SEASON_START_MONTH = 8; // September (0-indexed month)
const SEASON_START_DAY = 8;

const getSeasonStartMonday = (year) => {
  const date = new Date(Date.UTC(year, SEASON_START_MONTH, SEASON_START_DAY));
  const weekday = date.getUTCDay(); // 0=Sunday, 1=Monday, ... 6=Saturday
  const mondayOffset = weekday === 0 ? 1 : (8 - weekday) % 7; // next Monday (or same day if Monday)
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date;
};

export const getWeekDate = (week) => {
  const season = Math.floor((week - 1) / 38) + 1;
  const dayOffset = ((week - 1) % 38) * 7;
  // Chaque saison démarre sur un lundi pour garder des semaines cohérentes Lundi→Dimanche.
  const seasonStart = getSeasonStartMonday(2024 + season);
  const date = new Date(seasonStart);
  date.setUTCDate(seasonStart.getUTCDate() + dayOffset);
  return date;
};

const getMonthNumber = (date) => (date?.getUTCMonth?.() ?? 0) + 1;
const getMonthLabelFr = (date) => ([
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
][(date?.getUTCMonth?.() ?? 0)] ?? 'Janvier');

const findNextWeekMatchingMonth = (week, targetMonth) => {
  for (let offset = 1; offset <= 10; offset += 1) {
    const date = getWeekDate(week + offset);
    if (getMonthNumber(date) === targetMonth) return week + offset;
  }
  return null;
};

export const getCalendarSnapshot = (week) => {
  const date = getWeekDate(week);
  const weekEnd = new Date(date);
  weekEnd.setUTCDate(date.getUTCDate() + 6);
  const locale = isEnglish() ? 'en-US' : 'fr-FR';
  const fmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortFmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: 'UTC' });
  return {
    dateLabel: fmt.format(date),
    weekRangeLabel: `${shortFmt.format(date)} - ${shortFmt.format(weekEnd)}`,
  };
};

export const getWeekDailySnapshots = (week) => {
  const startDate = getWeekDate(week);
  const locale = isEnglish() ? 'en-US' : 'fr-FR';
  const weekdayFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    timeZone: 'UTC',
  });
  const dayFmt = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return Array.from({ length: 7 }, (_unused, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    return {
      dayIndex: index + 1,
      weekdayLabel: weekdayFmt.format(date),
      dateLabel: dayFmt.format(date),
    };
  });
};

const getEligibleBuyerTiers = (player) => {
  const value = Number(player.value ?? 0);
  if (value >= 120_000_000 || player.rating >= 188 || player.potential >= 195) return [1];
  if (value >= 60_000_000 || player.rating >= 176 || player.potential >= 186) return [1, 2];
  if (player.rating >= 168 || player.potential >= 180) return [1, 2];
  if (player.rating >= 154 || player.potential >= 170) return [2, 3];
  if (player.rating >= 136 || player.potential >= 158) return [3, 4];
  return [4];
};

const isTransferCandidate = (player) => {
  if (player.rating >= 136 || player.potential >= 160) return true;
  if (player.contractWeeksLeft <= 20 && player.rating >= 124) return true;
  if ((player.freeAgent || player.club === 'Libre') && player.rating >= 116) return true;
  return false;
};

const buildClubNeedScore = (club, player, season = 1) => {
  if (!club || !player) return -Infinity;
  const squad = getClubSquad(club, season) ?? [];
  const samePosition = squad.filter((p) => p?.position === player.position);
  const sameRole = squad.filter((p) => p?.roleId === player.roleId);
  const avgPosRating = samePosition.length
    ? samePosition.reduce((sum, p) => sum + (p.rating ?? 120), 0) / samePosition.length
    : 118;
  const ageingCount = samePosition.filter((p) => (p.age ?? 24) >= 31).length;
  const weakCount = samePosition.filter((p) => (p.rating ?? 120) + 8 < (player.rating ?? 130)).length;
  const shortage = Math.max(0, 3 - samePosition.length);
  const tierFit = club.tier <= 2 && (player.rating ?? 130) < 152
    ? -10
    : club.tier >= 3 && (player.rating ?? 130) > 182
      ? -9
      : 0;
  const roleFit = sameRole.length === 0 ? 3 : 0;
  return (
    shortage * 7
    + weakCount * 4
    + ageingCount * 2.5
    + ((player.rating ?? 130) - avgPosRating) * 0.4
    + roleFit
    + tierFit
  );
};

const pickSmartDestinationClub = (player, possibleClubs = [], season = 1) => {
  if (!possibleClubs.length) return null;
  const scored = possibleClubs
    .map((club) => ({ club, score: buildClubNeedScore(club, player, season) + (Math.random() * 4 - 2) }))
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(4, scored.length));
  return pick(top)?.club ?? scored[0]?.club ?? null;
};

export const getSeasonContext = (week) => {
  const seasonWeek = ((week - 1) % 38) + 1;
  const season = Math.floor((week - 1) / 38) + 1;
  const date = getWeekDate(week);
  const monthNum = getMonthNumber(date);
  const month = getMonthLabelFr(date);
  const nextWeekMonth = getMonthNumber(getWeekDate(week + 1));

  if (monthNum === 1) {
    return { phase: 'Mercato hiver', season, seasonWeek, month, mercato: true, window: 'hiver', deadlineDay: nextWeekMonth !== 1 };
  }
  if (monthNum === 6) {
    return { phase: 'Mercato été', season, seasonWeek, month, mercato: true, window: 'été', deadlineDay: nextWeekMonth !== 6 };
  }
  if (seasonWeek <= 18) return { phase: '1ère partie', season, seasonWeek, month, mercato: false, window: null, deadlineDay: false };
  if (seasonWeek <= 37) return { phase: '2nde partie', season, seasonWeek, month, mercato: false, window: null, deadlineDay: false };
  return { phase: 'Intersaison', season, seasonWeek, month, mercato: false, window: null, deadlineDay: false };
};

export const getSeasonMilestones = (week) => {
  const phase = getSeasonContext(week);
  const seasonWeek = phase.seasonWeek;
  const season = phase.season;
  const worldCupSeason = ((season - 1) % 4) === 0;
  const milestones = [
    { key: 'start', week: (season - 1) * 38 + 1, label: `Début de saison ${season}`, detail: 'Le championnat repart et les dossiers s’installent.', tone: 'info' },
    { key: 'winter_approach', week: (season - 1) * 38 + 16, label: 'Approche du mercato d’hiver', detail: 'Les pré-accords et les discussions s’accélèrent.', tone: 'warn' },
    { key: 'winter_market', week: (season - 1) * 38 + 19, label: 'Mercato d’hiver', detail: 'Les offres peuvent se conclure et les dossiers bougent.', tone: 'danger' },
    { key: 'midseason', week: (season - 1) * 38 + 24, label: 'Mi-saison', detail: 'On voit les tendances, les tensions et les joueurs qui montent.', tone: 'info' },
    { key: 'europe_deep', week: (season - 1) * 38 + 26, label: 'Grandes soirées européennes', detail: 'Les coupes d’Europe prennent de la valeur.', tone: 'good' },
    ...(worldCupSeason ? [
      { key: 'world_cup', week: (season - 1) * 38 + 38, label: 'Coupe du monde', detail: 'La saison de clubs s’efface, la sélection prend le dessus.', tone: 'danger' },
      { key: 'summer_market', week: (season - 1) * 38 + 39, label: 'Mercato d’été', detail: 'Les clubs passent en mode reconstruction et gros mouvements.', tone: 'warn' },
    ] : []),
  ];

  return milestones
    .filter((item) => item.week >= week)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      weeksAway: Math.max(0, item.week - week),
      labelWithWeek: `S${((item.week - 1) % 38) + 1} · ${item.label}`,
    }));
};

const getApproachWindow = (week) => {
  const date = getWeekDate(week);
  const monthNum = getMonthNumber(date);
  if (monthNum === 12) {
    const effectiveWeek = findNextWeekMatchingMonth(week, 1);
    if (effectiveWeek) return { window: 'hiver', effectiveWeek };
  }
  if (monthNum === 5) {
    const effectiveWeek = findNextWeekMatchingMonth(week, 6);
    if (effectiveWeek) return { window: 'été', effectiveWeek };
  }
  return null;
};

export const sanitizeOfferForContext = (offer = null, { roster = [], week = 1 } = {}) => {
  if (!offer || typeof offer !== 'object') return null;
  const player = (Array.isArray(roster) ? roster : []).find((p) => p.id === offer.playerId);
  if (!player) return null;
  const club = CLUBS.find((c) => c.id === offer.clubId || c.name === offer.club);
  if (!club) return null;

  const playerValue = Math.max(150000, Number(player.value ?? 150000));
  const playerRating = Number(player.rating ?? 120);
  const playerPotential = Number(player.potential ?? playerRating);
  if (club.tier >= 3 && (playerRating >= 182 || playerPotential >= 190)) return null;

  const maxPremium = club.tier === 1 ? 1.7 : club.tier === 2 ? 1.38 : club.tier === 3 ? 1.18 : 1.08;
  const minDiscount = club.tier === 1 ? 0.72 : club.tier === 2 ? 0.64 : club.tier === 3 ? 0.54 : 0.45;
  const price = Math.round(Math.max(playerValue * minDiscount, Math.min(playerValue * maxPremium, Number(offer.price ?? playerValue))));
  const salMult = Math.max(0.95, Math.min(club.tier === 1 ? 2.0 : 1.7, Number(offer.salMult ?? 1.1)));

  return {
    ...offer,
    week: Number.isFinite(offer.week) ? offer.week : week,
    expiresWeek: Math.max(week + 1, Number(offer.expiresWeek ?? (week + 2))),
    price,
    salMult,
    clubId: getClubId(club),
    club: club.name,
    clubTier: club.tier,
    clubCountryCode: club.countryCode,
    clubCountry: getCountry(club.countryCode).flag,
    clubCity: club.city,
  };
};

export const getUpcomingMercatoWindow = (week) => getApproachWindow(week);

export const generateClubOffers = ({ roster, week, reputation, existingOffers = [], worldState = null, cooldowns = {}, lockedPlayerIds = [] }) => {
  const phase = getSeasonContext(week);
  const currentSeason = phase.season ?? Math.floor((week - 1) / 38) + 1;
  const approachWindow = !phase.mercato ? getApproachWindow(week) : null;
  if ((!phase.mercato && !approachWindow) || !roster.length) return [];

  const openOfferPlayerIds = new Set(
    existingOffers.filter((offer) => offer.expiresWeek >= week).map((offer) => offer.playerId),
  );

  const isPreWindow = Boolean(approachWindow && !phase.mercato);
  const isHotWeek = !isPreWindow && Math.random() < 0.12;
  const baseChance = phase.window === 'été' ? 0.24 : 0.14;
  const preWindowChance = approachWindow ? (approachWindow.window === 'été' ? 0.12 : 0.08) : 0;
  const deadlineDayBonus = phase.deadlineDay ? 0.18 : 0;
  const hotWeekBonus = isHotWeek ? 0.08 : 0;

  // Nombre max d'offres (plus généreux, hot week = frénésie)
  const maxOffers = isPreWindow
    ? 2
    : isHotWeek
    ? 6
    : phase.deadlineDay
      ? (phase.window === 'été' ? 5 : 3)
      : phase.window === 'été'
        ? 3
        : 2;

  const candidates = roster
    .filter((player) => !cooldowns[player.id] || cooldowns[player.id] <= week)
    .filter((player) => !openOfferPlayerIds.has(player.id))
    .filter((player) => !lockedPlayerIds.includes(player.id))
    .filter(isTransferCandidate)
    .sort((a, b) => b.value - a.value);

  const offers = [];
  for (const player of candidates) {
    if (offers.length >= maxOffers) break;

    const ambitionBoost = ['ambitieux', 'mercenaire'].includes(player.personality) ? 0.1 : 0;
    const worldStateBoost = getWorldStateOfferModifier(worldState, player);
    const repBoost = normalizeAgencyReputation(reputation) / 400;
    const totalChance = (isPreWindow ? preWindowChance : baseChance) + deadlineDayBonus + hotWeekBonus + ambitionBoost + worldStateBoost + repBoost;

    if (Math.random() > totalChance) continue;

    // Clubs concurrents : 25% de chance qu'une 2e offre arrive la semaine suivante (gérée via worldState)
    const isCompetingOffer = offers.length > 0 && Math.random() < 0.25;

    const allowedTiers = getEligibleBuyerTiers(player);
    const possibleClubs = CLUBS.filter(
      (club) => club.name !== player.club && allowedTiers.includes(club.tier),
    );
    const club = pickSmartDestinationClub(player, possibleClubs.length ? possibleClubs : CLUBS, currentSeason) ?? pick(CLUBS);
    const country = getCountry(club.countryCode);

    // Multiplicateur prix : worldState économie impacte les montants
    const worldEconMult = worldState?.economie === 'boom' ? 1.2 : worldState?.economie === 'crise' ? 0.82 : 1;
    const targetWindow = phase.window ?? approachWindow?.window ?? 'hiver';
    const windowMult = isPreWindow
      ? targetWindow === 'été' ? rand(88, 125) / 100 : rand(78, 112) / 100
      : phase.window === 'été' ? rand(92, 140) / 100 : rand(82, 120) / 100;
    const priceMult = windowMult * worldEconMult;
    const price = Math.max(1000, Math.floor(player.value * priceMult));

    // Deadline day = offres plus agressives sur le salaire
    const salMin = phase.deadlineDay ? 125 : 115;
    const salMax = phase.deadlineDay ? 195 : 175;

    offers.push({
      id: makeId('offer'),
      week,
      expiresWeek: week + (isPreWindow ? 3 : (targetWindow === 'été' ? 3 : 2)),
      window: targetWindow,
      isHotWeek,
      isCompetingOffer,
      preWindow: isPreWindow,
      effectiveWeek: isPreWindow ? approachWindow.effectiveWeek : week,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      clubId: getClubId(club),
      club: club.name,
      clubTier: club.tier,
      clubCountry: country.flag,
      clubCountryCode: club.countryCode,
      clubCity: club.city,
      price,
      salMult: rand(isPreWindow ? 108 : salMin, isPreWindow ? 165 : salMax) / 100,
      status: 'open',
    });
  }

  return offers
    .map((offer) => sanitizeOfferForContext(offer, { roster, week }))
    .filter(Boolean);
};

// Offre d'urgence uniquement pendant une fenêtre officielle.
export const generateSurpriseOffer = ({ roster, week, reputation, worldState = null, cooldowns = {}, lockedPlayerIds = [] }) => {
  const phase = getSeasonContext(week);
  const currentSeason = phase.season ?? Math.floor((week - 1) / 38) + 1;
  if (!phase.mercato) return null;

  const baseChance = (phase.deadlineDay ? 0.12 : 0.04) + (worldState?.economie === 'boom' ? 0.03 : 0);
  if (Math.random() > baseChance) return null;

  // Candidats : très haute forme ou contrat expirant
  const candidates = roster.filter(
    (p) => (!cooldowns[p.id] || cooldowns[p.id] <= week)
      && !lockedPlayerIds.includes(p.id)
      && ((p.form >= 82 && p.rating >= 148) || (p.contractWeeksLeft <= 6 && p.contractWeeksLeft > 0 && p.rating >= 132)),
  );
  if (!candidates.length) return null;

  const player = pick(candidates);
  const allowedTiers = getEligibleBuyerTiers(player);
  const possibleClubs = CLUBS.filter((c) => c.name !== player.club && allowedTiers.includes(c.tier));
  const club = pickSmartDestinationClub(player, possibleClubs.length ? possibleClubs : CLUBS, currentSeason) ?? pick(CLUBS);
  const country = getCountry(club.countryCode);

  // Offre surprise = urgence = prix premium (+20 à +45%)
  const priceMult = rand(120, 145) / 100;
  const price = Math.max(1000, Math.floor(player.value * priceMult));

  const rawOffer = {
    id: makeId('offer'),
    week,
    expiresWeek: week + 1,
    window: phase.window,
    isSurprise: true,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    clubId: getClubId(club),
    club: club.name,
    clubTier: club.tier,
    clubCountry: country.flag,
    clubCountryCode: club.countryCode,
    clubCity: club.city,
    price,
    salMult: rand(130, 180) / 100,
    status: 'open',
  };
  return sanitizeOfferForContext(rawOffer, { roster, week });
};
