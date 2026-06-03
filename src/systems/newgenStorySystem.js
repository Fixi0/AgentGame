import { pick } from '../utils/helpers';

const STORY_TEMPLATES = [
  ({ name, country, club }) => `${name}, jeune talent de ${country}, attire déjà les regards après ses premières semaines à ${club}.`,
  ({ name, country, trait }) => `${name} (${country}) se démarque par son profil ${trait}. Les scouts parlent d'un dossier à suivre.`,
  ({ name, club }) => `${name} impressionne dans l'environnement de ${club}. Sa progression fait monter les attentes.`,
];

const getTraitLabel = (player = {}) => {
  if ((player.potential ?? 0) >= 186) return 'élite';
  if ((player.personality ?? '') === 'professionnel') return 'ultra professionnel';
  if ((player.form ?? 50) >= 72) return 'en feu';
  return 'prometteur';
};

export const generateNewgenStories = ({
  roster = [],
  market = [],
  freeAgents = [],
  week = 1,
  season = 1,
} = {}) => {
  const pool = [...(roster ?? []), ...(market ?? []), ...(freeAgents ?? [])]
    .filter((p) => (p.age ?? 30) <= 21)
    .filter((p) => (p.potential ?? 0) >= 168)
    .sort((a, b) => (b.potential ?? 0) - (a.potential ?? 0))
    .slice(0, 10);
  if (!pool.length) return [];

  return pool.slice(0, 3).map((player, index) => {
    const name = `${player.firstName} ${player.lastName}`;
    const country = player.countryLabel ?? player.countryCode ?? 'inconnu';
    const club = player.club ?? 'club formateur';
    const trait = getTraitLabel(player);
    const text = pick(STORY_TEMPLATES)({ name, country, club, trait });
    return {
      id: `newgen_${season}_${week}_${player.id}_${index}`,
      week,
      season,
      playerId: player.id,
      playerName: name,
      club,
      country,
      potential: player.potential ?? null,
      text,
    };
  });
};

