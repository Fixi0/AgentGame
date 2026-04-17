import { CLUBS, getCountry } from '../data/clubs';
import { makeId, pick, rand } from '../utils/helpers';
import { getWorldStateOfferModifier } from './worldStateSystem';

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

export const generateClubOffers = ({ roster, week, reputation, existingOffers = [], worldState = null }) => {
  const phase = getSeasonContext(week);
  if (!phase.mercato || !roster.length) return [];

  const openOfferPlayerIds = new Set(
    existingOffers.filter((offer) => offer.expiresWeek >= week).map((offer) => offer.playerId),
  );

  const isHotWeek = Math.random() < 0.12;
  const baseChance = phase.window === 'été' ? 0.24 : 0.14;
  const deadlineDayBonus = phase.deadlineDay ? 0.18 : 0;
  const hotWeekBonus = isHotWeek ? 0.08 : 0;

  // Nombre max d'offres (plus généreux, hot week = frénésie)
  const maxOffers = isHotWeek
    ? 6
    : phase.deadlineDay
      ? (phase.window === 'été' ? 5 : 3)
      : phase.window === 'été'
        ? 3
        : 2;

  const candidates = roster
    .filter((player) => !openOfferPlayerIds.has(player.id))
    .filter(isTransferCandidate)
    .sort((a, b) => b.value - a.value);

  const offers = [];
  for (const player of candidates) {
    if (offers.length >= maxOffers) break;

    const ambitionBoost = ['ambitieux', 'mercenaire'].includes(player.personality) ? 0.1 : 0;
    const worldStateBoost = getWorldStateOfferModifier(worldState, player);
    const repBoost = reputation / 400;
    const totalChance = baseChance + deadlineDayBonus + hotWeekBonus + ambitionBoost + worldStateBoost + repBoost;

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
    const windowMult = phase.window === 'été' ? rand(92, 140) / 100 : rand(82, 120) / 100;
    const priceMult = windowMult * worldEconMult;
    const price = Math.max(1000, Math.floor(player.value * priceMult));

    // Deadline day = offres plus agressives sur le salaire
    const salMin = phase.deadlineDay ? 125 : 115;
    const salMax = phase.deadlineDay ? 195 : 175;

    offers.push({
      id: makeId('offer'),
      week,
      expiresWeek: week + (phase.window === 'été' ? 3 : 2),
      window: phase.window,
      isHotWeek,
      isCompetingOffer,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      club: club.name,
      clubTier: club.tier,
      clubCountry: country.flag,
      clubCountryCode: club.countryCode,
      clubCity: club.city,
      price,
      salMult: rand(salMin, salMax) / 100,
      status: 'open',
    });
  }

  return offers;
};

// Offre d'urgence uniquement pendant une fenêtre officielle.
export const generateSurpriseOffer = ({ roster, week, reputation, worldState = null }) => {
  const phase = getSeasonContext(week);
  if (!phase.mercato) return null;

  const baseChance = (phase.deadlineDay ? 0.12 : 0.04) + (worldState?.economie === 'boom' ? 0.03 : 0);
  if (Math.random() > baseChance) return null;

  // Candidats : très haute forme ou contrat expirant
  const candidates = roster.filter(
    (p) => (p.form >= 82 && p.rating >= 74) || (p.contractWeeksLeft <= 6 && p.contractWeeksLeft > 0 && p.rating >= 66),
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
