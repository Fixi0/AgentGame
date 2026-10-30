import { CLUBS } from '../data/clubs.js';
import { defaultBadge } from './badgeCatalog.js';

// Club identities use stable sporting colours, never the agency's random palette.
// The supplied generic shield artwork and the fictional display names stay shared.
export const CLUB_BADGE_COLORS = Object.freeze({
  // France
  PSG: ['#004170', '#DA291C'],
  Marseille: ['#009DDF', '#FFFFFF'],
  Monaco: ['#E3231F', '#FFFFFF'],
  Lyon: ['#003C7D', '#ED1C24'],
  Lille: ['#D71920', '#FFFFFF'],
  Nice: ['#D71920', '#15151C'],
  Lens: ['#F6D317', '#C8102E'],
  Rennes: ['#D71920', '#15151C'],
  Strasbourg: ['#0065B3', '#FFFFFF'],
  Brest: ['#D71920', '#FFFFFF'],
  Toulouse: ['#5B2B82', '#FFFFFF'],
  Auxerre: ['#FFFFFF', '#0055A4'],
  Nantes: ['#F7D417', '#008540'],
  Angers: ['#15151C', '#FFFFFF'],
  'Le Havre': ['#87CEEB', '#182B49'],
  Lorient: ['#EF7D00', '#15151C'],
  'Paris FC': ['#0A3055', '#75BCE8'],
  Metz: ['#7B1E3B', '#FFFFFF'],
  // Spain
  Barcelona: ['#A50044', '#004D98'],
  'Real Madrid': ['#FFFFFF', '#FEBE10'],
  Atletico: ['#CB3524', '#FFFFFF'],
  Athletic: ['#D71920', '#FFFFFF'],
  Villarreal: ['#FFE667', '#00529F'],
  'Real Betis': ['#008F57', '#FFFFFF'],
  'Real Sociedad': ['#0067B1', '#FFFFFF'],
  Sevilla: ['#FFFFFF', '#D71920'],
  Valencia: ['#FFFFFF', '#15151C'],
  Girona: ['#D71920', '#FFFFFF'],
  Osasuna: ['#C8102E', '#182B49'],
  Celta: ['#8AC3EE', '#FFFFFF'],
  Mallorca: ['#E30613', '#15151C'],
  Getafe: ['#00529F', '#FFFFFF'],
  Rayo: ['#FFFFFF', '#E30613'],
  Espanyol: ['#007FC8', '#FFFFFF'],
  Alaves: ['#005CA9', '#FFFFFF'],
  Levante: ['#B21F3D', '#005CA9'],
  Elche: ['#FFFFFF', '#00814A'],
  Oviedo: ['#005CA9', '#FFFFFF'],
  // England
  Arsenal: ['#EF0107', '#FFFFFF'],
  'Man City': ['#6CABDD', '#FFFFFF'],
  Liverpool: ['#C8102E', '#FFFFFF'],
  'Man United': ['#DA291C', '#FBE122'],
  Chelsea: ['#034694', '#FFFFFF'],
  Newcastle: ['#15151C', '#FFFFFF'],
  'Aston Villa': ['#670E36', '#95BFE5'],
  Tottenham: ['#FFFFFF', '#132257'],
  Brighton: ['#0057B8', '#FFFFFF'],
  Bournemouth: ['#DA291C', '#15151C'],
  'Crystal Palace': ['#1B458F', '#C41230'],
  Everton: ['#003399', '#FFFFFF'],
  Fulham: ['#FFFFFF', '#15151C'],
  'West Ham': ['#7A263A', '#1BB1E7'],
  Brentford: ['#E30613', '#FFFFFF'],
  Forest: ['#DD0000', '#FFFFFF'],
  Wolves: ['#FDB913', '#15151C'],
  Leeds: ['#FFFFFF', '#FFCD00'],
  Burnley: ['#6C1D45', '#99D6EA'],
  Sunderland: ['#EB172B', '#FFFFFF'],
  // Germany
  Bayern: ['#DC052D', '#FFFFFF'],
  Dortmund: ['#FDE100', '#15151C'],
  Leverkusen: ['#E32219', '#15151C'],
  Leipzig: ['#FFFFFF', '#DD0741'],
  Stuttgart: ['#FFFFFF', '#E32219'],
  Frankfurt: ['#E1000F', '#15151C'],
  Wolfsburg: ['#65B32E', '#FFFFFF'],
  Gladbach: ['#FFFFFF', '#15151C'],
  Hoffenheim: ['#1961B5', '#FFFFFF'],
  Mainz: ['#C8102E', '#FFFFFF'],
  Freiburg: ['#C8102E', '#15151C'],
  Bremen: ['#009A44', '#FFFFFF'],
  Augsburg: ['#FFFFFF', '#BA0C2F'],
  'Union Berlin': ['#EB1923', '#FFD100'],
  Hamburg: ['#005B9E', '#FFFFFF'],
  Koln: ['#FFFFFF', '#ED1C24'],
  Heidenheim: ['#E2001A', '#005CA9'],
  'St Pauli': ['#5B3527', '#FFFFFF'],
  // Italy
  Inter: ['#0068A8', '#15151C'],
  Milan: ['#FB090B', '#15151C'],
  Juventus: ['#15151C', '#FFFFFF'],
  Napoli: ['#12A0D7', '#FFFFFF'],
  Roma: ['#8E1F2F', '#F7B32B'],
  Lazio: ['#87CEFA', '#FFFFFF'],
  Atalanta: ['#1E71B8', '#15151C'],
  Fiorentina: ['#5B2B82', '#FFFFFF'],
  Bologna: ['#A21C26', '#1A2F48'],
  Torino: ['#8A1538', '#FFFFFF'],
  Genoa: ['#C8102E', '#002B5C'],
  Udinese: ['#FFFFFF', '#15151C'],
  Sassuolo: ['#009A44', '#15151C'],
  'Hellas Verona': ['#003B7A', '#FFCD00'],
  Cagliari: ['#A21C26', '#002B5C'],
  Lecce: ['#F7D417', '#D71920'],
  Empoli: ['#005CA9', '#FFFFFF'],
  Monza: ['#E30613', '#FFFFFF'],
  Como: ['#005CA9', '#FFFFFF'],
  Parma: ['#FFFFFF', '#15151C'],
});

const badges = new Map();
for (const club of CLUBS) {
  const colours = CLUB_BADGE_COLORS[club.name];
  if (!colours) continue;
  const badge = Object.freeze({ couleur1: colours[0], couleur2: colours[1], motif: 'bande', forme: 'ecusson' });
  for (const key of [club.id, club.name, club.displayName]) badges.set(key, badge);
}

// Resolve by stable id first, including older server snapshots with random badges.
export function clubBadge(club = {}) {
  return badges.get(club?.id) ?? badges.get(club?.name) ?? club?.badge ?? defaultBadge(club?.id ?? 'team', 'ecusson');
}
