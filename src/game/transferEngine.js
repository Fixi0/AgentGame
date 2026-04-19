import { CLUBS } from '../data/clubs';
import { clamp } from '../utils/helpers';

export const buildTransferAgreement = (player, offer, negotiatedOutcome = null) => {
  const maxPrice = Math.max(1000, Math.floor(Math.max(player?.value ?? 0, offer?.price ?? 0) * 4));
  const maxSigningBonus = Math.max(3000, Math.floor((player?.weeklySalary ?? 10000) * 30));
  const maxReleaseClause = Math.max(50000, Math.floor((player?.value ?? 1000000) * 4.5));
  const minReleaseClause = Math.max(50000, Math.floor((player?.value ?? 1000000) * 0.8));
  const maxClubBonus = Math.max(5000, Math.floor((player?.weeklySalary ?? 10000) * 24));
  const finalPrice = clamp(negotiatedOutcome?.price ?? offer.price, 1000, maxPrice);
  const finalSalaryMultiplier = clamp(negotiatedOutcome?.salMult ?? offer.salMult, 0.9, 3);
  const signingBonus = clamp(negotiatedOutcome?.signingBonus ?? Math.floor(player.weeklySalary * 8), 3000, maxSigningBonus);
  const contractWeeks = clamp(negotiatedOutcome?.contractWeeks ?? 150, 52, 260);
  const clubRole = negotiatedOutcome?.role ?? (player.rating >= 82 ? 'Titulaire' : 'Rotation');
  const releaseClause = clamp(negotiatedOutcome?.releaseClause ?? Math.floor(player.value * 1.8), minReleaseClause, maxReleaseClause);
  const sellOnPercent = clamp(negotiatedOutcome?.sellOnPercent ?? 5, 0, 20);
  const clubBonusesTotal = clamp(negotiatedOutcome?.clubBonuses?.total ?? Math.floor(player.weeklySalary * 8), 5000, maxClubBonus);
  const clubBonuses = {
    total: clubBonusesTotal,
    goals: Math.floor(clubBonusesTotal * 0.35),
    appearances: Math.floor(clubBonusesTotal * 0.35),
    europe: Math.floor(clubBonusesTotal * 0.3),
  };
  const contractClausesBase = negotiatedOutcome?.contractClauses ?? {
    ballonDorBonus: clamp(Math.floor(player.weeklySalary * 16), 0, maxClubBonus),
    noCutClause: player.age <= 25,
    coachRoleProtection: true,
    rolePromise: clubRole,
  };
  const contractClauses = {
    ...contractClausesBase,
    ballonDorBonus: clamp(contractClausesBase.ballonDorBonus ?? 0, 0, maxClubBonus),
    noCutClause: Boolean(contractClausesBase.noCutClause),
    coachRoleProtection: Boolean(contractClausesBase.coachRoleProtection),
    rolePromise: contractClausesBase.rolePromise ?? clubRole,
  };
  const commission = Math.floor(finalPrice * 0.08 + signingBonus * 0.05 + (clubBonuses.total ?? 0) * 0.02);
  return {
    finalPrice,
    finalSalaryMultiplier,
    signingBonus,
    contractWeeks,
    clubRole,
    releaseClause,
    sellOnPercent,
    clubBonuses,
    contractClauses,
    commission,
  };
};

export const applyCompletedTransferToPlayer = (player, offer, agreement, week) => {
  const targetClub = CLUBS.find((club) => club.name === offer.club);
  return {
    ...player,
    club: offer.club,
    clubTier: offer.clubTier,
    clubCountry: offer.clubCountry,
    clubCountryCode: offer.clubCountryCode ?? targetClub?.countryCode ?? player.clubCountryCode,
    clubCity: offer.clubCity ?? targetClub?.city ?? player.clubCity,
    value: Math.floor(player.value * 1.06),
    weeklySalary: Math.floor(player.weeklySalary * agreement.finalSalaryMultiplier),
    moral: clamp(player.moral + 10),
    trust: clamp((player.trust ?? 50) + 5),
    careerStatus: 'transféré',
    contractWeeksLeft: agreement.contractWeeks,
    contractStartWeek: week,
    signingBonus: agreement.signingBonus ?? 0,
    clubRole: agreement.clubRole,
    releaseClause: agreement.releaseClause,
    sellOnPercent: agreement.sellOnPercent,
    clubBonuses: agreement.clubBonuses,
    contractClauses: agreement.contractClauses,
    lastContractEventWeek: week,
    freeAgent: false,
    timeline: [
      { week, type: 'transfer', label: `${offer.club} · ${agreement.clubRole} · contrat ${Math.round(agreement.contractWeeks / 52)} ans` },
      ...(player.timeline ?? []),
    ].slice(0, 18),
  };
};

export const normalizeOfferBook = (offers = []) => {
  const latestOpenByPlayer = new Map();
  const sorted = [...offers].sort((a, b) => (b.week ?? 0) - (a.week ?? 0));
  return sorted.map((offer) => {
    if (offer.status !== 'open') return offer;
    if (!latestOpenByPlayer.has(offer.playerId)) {
      latestOpenByPlayer.set(offer.playerId, offer.id);
      return offer;
    }
    return { ...offer, status: 'superseded' };
  });
};
