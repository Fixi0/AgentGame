import potm from '../assets/trophies/player-of-month.jpg';
import ucl from '../assets/trophies/champions-league.jpg';
import league from '../assets/trophies/league-title.jpg';
import bd from '../assets/trophies/ballon-dor.jpg';
import mvp from '../assets/trophies/mvp-season.jpg';
import euroGoal from '../assets/trophies/european-goal.jpg';

// Map d'event/contexte → trophée
const TROPHY_BY_EVENT = {
  award_monthly: { image: potm, kind: 'Joueur du mois', accent: '#f5c842' },
  fan_fav:       { image: potm, kind: 'Joueur du mois', accent: '#f5c842' },
  ballon_dor_shortlist: { image: bd, kind: "Nominé Ballon d'Or", accent: '#f59e0b' },
  ballon_dor_winner:    { image: bd, kind: "Ballon d'Or", accent: '#f59e0b' },
  hat_trick_cl:  { image: euroGoal, kind: 'Soirée européenne', accent: '#7dd3fc' },
  champions_league_winner: { image: ucl, kind: 'Vainqueur Ligue des Champions', accent: '#7dd3fc' },
  league_winner: { image: league, kind: 'Champion national', accent: '#cfe88f' },
  mvp_season:    { image: mvp, kind: 'Joueur de la saison', accent: '#f5c842' },
  european_goal: { image: euroGoal, kind: 'But européen', accent: '#7dd3fc' },
};

export const getTrophyMeta = ({ eventId, label } = {}) => {
  if (eventId && TROPHY_BY_EVENT[eventId]) return TROPHY_BY_EVENT[eventId];
  const lower = String(label ?? '').toLowerCase();
  if (lower.includes('ballon')) return TROPHY_BY_EVENT.ballon_dor_shortlist;
  if (lower.includes('but européen') || lower.includes('but europeen') || lower.includes('soirée européenne')) return TROPHY_BY_EVENT.european_goal;
  if (lower.includes('champions league') || lower.includes('ligue des champions')) return TROPHY_BY_EVENT.champions_league_winner;
  if (lower.includes('joueur de la saison') || lower.includes('mvp saison')) return TROPHY_BY_EVENT.mvp_season;
  if (lower.includes('joueur du mois') || lower.includes('player of the month')) return TROPHY_BY_EVENT.award_monthly;
  if (lower.includes('champion') && lower.includes('national')) return TROPHY_BY_EVENT.league_winner;
  return null;
};

export const isTrophyEvent = (event) => Boolean(getTrophyMeta({ eventId: event?.id, label: event?.label }));

export { potm, ucl, league, bd, mvp, euroGoal };
