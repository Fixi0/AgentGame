import { COUNTRIES } from '../data/clubs';
import { clamp } from '../utils/helpers';

export const createDefaultLeagueReputation = (homeCountryCode = 'FR') =>
  COUNTRIES.reduce((rep, country) => ({
    ...rep,
    [country.code]: country.code === homeCountryCode ? 22 : Math.max(0, 8 - Math.floor(country.minReputation / 10)),
  }), {});

export const applyLeagueReputation = (leagueReputation = {}, countryCode, delta) => {
  if (!countryCode) return leagueReputation;
  return {
    ...leagueReputation,
    [countryCode]: clamp((leagueReputation[countryCode] ?? 0) + delta),
  };
};

export const getLeagueReputationLabel = (score = 0) => {
  if (score >= 70) return 'référence';
  if (score >= 45) return 'respecté';
  if (score >= 22) return 'connu';
  if (score >= 8) return 'observé';
  return 'inconnu';
};
