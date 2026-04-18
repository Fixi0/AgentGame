import { CLUBS, getCountry } from '../data/clubs';
import { makeId, pick, rand } from '../utils/helpers';
import { getWorldStateOfferModifier } from './worldStateSystem';

const SEASON_START_MONTH = 7; // August (0-indexed month)
const SEASON_START_DAY = 1;

const getWeekDate = (week) => {
  const season = Math.floor((week - 1) / 38) + 1;
  const dayOffset = ((week - 1) % 38) * 7;
  return new Date(Date.UTC(2025 + season, SEASON_START_MONTH, SEASON_START_DAY + dayOffset));
};

export const getCalendarSnapshot = (week) => {
  const date = getWeekDate(week);
  const weekEnd = new Date(date);
  weekEnd.setUTCDate(date.getUTCDate() + 6);
  const fmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  return {
    dateLabel: fmt.format(date),
    weekRangeLabel: `${shortFmt.format(date)} - ${shortFmt.format(weekEnd)}`,
  };
};

const getEligibleBuyerTiers = (player) => {
  if (player.rating >= 84 || player.potential >= 90) return [1, 2];
  if (player.rating >= 77 || player.potential >= 85) return [2, 3];
  if (player.rating >= 68 || player.potential >= 79) return [3, 4];
  return [4];
};

const isTransferCandidate = (player) => {
  if (player.rating >= 68 || player.potential >= 80) return true;
  if (player.contractWeeksLeft <= 20 && player.rating >= 62) return true;
  if ((player.freeAgent || player.club === 'Libre') && player.rating >= 58) return true;
  return false;
};

export const getSeasonContext = (week) => {
  const seasonWeek = ((week - 1) % 38) + 1;
  const season = Math.floor((week - 1) / 38) + 1;
  const month = [
    'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai',
  ][Math.min(9, Math.floor((seasonWeek - 1) / 4))];

  if (seasonWeek <= 18) return { phase: '1ère partie', season, seasonWeek, month, mercato: false, window: null, deadlineDay: false };
  if (seasonWeek <= 20) return { phase: 'Mercato hiver', season, seasonWeek, month: 'Janvier', mercato: true, window: 'hiver', deadlineDay: seasonWeek === 20 };
  if (seasonWeek <= 37) return { phase: '2nde partie', season, seasonWeek, month, mercato: false, window: null, deadlineDay: false };
  return { phase: 'Mercato été', season, seasonWeek, month: 'Juin', mercato: true, window: 'été', deadlineDay: true };
};

const getApproachWindow = (week) => {
  const seasonWeek = ((week - 1) % 38) + 1;
  if (seasonWeek >= 16 && seasonWeek <= 18) {
    return { window: 'hiver', effectiveWeek: week + (19 - seasonWeek) };
  }
  if (seasonWeek >= 35 && seasonWeek <= 37) {
    return { window: 'été', effectiveWeek: week + (38 - seasonWeek) };
  }
  return null;
};

export const generateClubOffers = ({ roster, week, reputation, existingOffers = [], worldState = null, cooldowns = {} }) => {
  const phase = getSeasonContext(week);
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
    .filter(isTransferCandidate)
    .sort((a, b) => b.value - a.value);

  const offers = [];
  for (const player of candidates) {
    if (offers.length >= maxOffers) break;

    const ambitionBoost = ['ambitieux', 'mercenaire'].includes(player.personality) ? 0.1 : 0;
    const worldStateBoost = getWorldStateOfferModifier(worldState, player);
    const repBoost = reputation / 400;
    const totalChance = (isPreWindow ? preWindowChance : baseChance) + deadlineDayBonus + hotWeekBonus + ambitionBoost + worldStateBoost + repBoost;

    if (Math.random() > totalChance) continue;

    // Clubs concurrents : 25% de chance qu'une 2e offre arrive la semaine suivante (gérée via worldState)
    const isCompetingOffer = offers.length > 0 && Math.random() < 0.25;

    const allowedTiers = getEligibleBuyerTiers(player);
    const possibleClubs = CLUBS.filter(
      (club) => club.name !== player.club && allowedTiers.includes(club.tier),
    );
    const club = pick(possibleClubs.length ? possibleClubs : CLUBS);
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

  return offers;
};

// Offre d'urgence uniquement pendant une fenêtre officielle.
export const generateSurpriseOffer = ({ roster, week, reputation, worldState = null, cooldowns = {} }) => {
  const phase = getSeasonContext(week);
  if (!phase.mercato) return null;

  const baseChance = (phase.deadlineDay ? 0.12 : 0.04) + (worldState?.economie === 'boom' ? 0.03 : 0);
  if (Math.random() > baseChance) return null;

  // Candidats : très haute forme ou contrat expirant
  const candidates = roster.filter(
    (p) => (!cooldowns[p.id] || cooldowns[p.id] <= week)
      && ((p.form >= 82 && p.rating >= 74) || (p.contractWeeksLeft <= 6 && p.contractWeeksLeft > 0 && p.rating >= 66)),
  );
  if (!candidates.length) return null;

  const player = pick(candidates);
  const allowedTiers = getEligibleBuyerTiers(player);
  const possibleClubs = CLUBS.filter((c) => c.name !== player.club && allowedTiers.includes(c.tier));
  const club = pick(possibleClubs.length ? possibleClubs : CLUBS);
  const country = getCountry(club.countryCode);

  // Offre surprise = urgence = prix premium (+20 à +45%)
  const priceMult = rand(120, 145) / 100;
  const price = Math.max(1000, Math.floor(player.value * priceMult));

  return {
    id: makeId('offer'),
    week,
    expiresWeek: week + 1,
    window: phase.window,
    isSurprise: true,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    club: club.name,
    clubTier: club.tier,
    clubCountry: country.flag,
    clubCountryCode: club.countryCode,
    clubCity: club.city,
    price,
    salMult: rand(130, 180) / 100,
    status: 'open',
  };
};
