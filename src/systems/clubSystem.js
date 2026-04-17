import { CLUBS } from '../data/clubs';
import { clamp } from '../utils/helpers';

const STYLE_BY_TIER = {
  1: 'possession dominante',
  2: 'pressing ambitieux',
  3: 'transition rapide',
  4: 'bloc compact',
};

const MEDIA_BY_TIER = {
  1: 'énorme',
  2: 'forte',
  3: 'moyenne',
  4: 'locale',
};

export const createDefaultClubRelations = () =>
  CLUBS.reduce((relations, club) => ({ ...relations, [club.name]: 50 }), {});

export const getClubProfile = (club, relation = 50) => ({
  budget: Math.max(8, Math.round((5 - club.tier) * 22 + relation / 8)),
  prestige: Math.max(20, Math.round((5 - club.tier) * 20 + relation / 10)),
  style: STYLE_BY_TIER[club.tier] ?? 'équilibré',
  mediaPressure: MEDIA_BY_TIER[club.tier] ?? 'moyenne',
  rivalries: CLUBS
    .filter((item) => item.countryCode === club.countryCode && item.name !== club.name)
    .sort((a, b) => a.tier - b.tier)
    .slice(0, 3)
    .map((item) => item.name),
});

export const applyClubRelation = (relations = createDefaultClubRelations(), clubName, delta) => {
  if (!clubName) return relations;
  return {
    ...relations,
    [clubName]: clamp((relations[clubName] ?? 50) + delta),
  };
};
