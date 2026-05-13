/**
 * sponsorSystem.js
 * Sponsors agence débloqués selon réputation. Revenus passifs hebdomadaires.
 */
export const SPONSORS = [
  { id: 'local_lawyer', name: 'Cabinet juridique local', minRep: 0, weekly: 800, color: '#94a3b8', tagline: 'Petit partenaire de quartier' },
  { id: 'kit_brand', name: 'Equipementier régional', minRep: 80, weekly: 2200, color: '#22d3ee', tagline: 'Crampons & training' },
  { id: 'energy_drink', name: 'BoostEnergy', minRep: 180, weekly: 5500, color: '#fbbf24', tagline: 'Boisson énergétique nationale' },
  { id: 'bank_partner', name: 'NorthBank Premium', minRep: 320, weekly: 12000, color: '#10b981', tagline: 'Patrimoine et placement' },
  { id: 'luxury_watch', name: 'Helvetica Timepieces', minRep: 500, weekly: 28000, color: '#f59e0b', tagline: 'Horlogerie de luxe' },
  { id: 'global_airline', name: 'SkyOne Airlines', minRep: 750, weekly: 60000, color: '#e879f9', tagline: 'Vols privés et business' },
  { id: 'royal_oil', name: 'Royal Reserve', minRep: 1000, weekly: 140000, color: '#fb7185', tagline: 'Sponsor souverain mondial' },
];

export const getActiveSponsors = (reputation = 0) =>
  SPONSORS.filter((s) => reputation >= s.minRep);

export const getNextSponsor = (reputation = 0) =>
  SPONSORS.find((s) => reputation < s.minRep) ?? null;

export const computeWeeklySponsorIncome = (state) => {
  const rep = state?.reputation ?? 0;
  return getActiveSponsors(rep).reduce((sum, s) => sum + s.weekly, 0);
};

export const applyWeeklySponsorIncome = (state) => {
  const income = computeWeeklySponsorIncome(state);
  if (income <= 0) return { state, income: 0 };
  return {
    state: { ...state, money: (state.money ?? 0) + income, sponsorIncomeLastWeek: income },
    income,
  };
};
