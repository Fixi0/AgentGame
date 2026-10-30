import { CLUBS } from '../../src/data/clubs.js';
import { hash } from './calendar.mjs';
import { createPlayerProfile } from './player-profile.mjs';
import {PLAYERS_PER_SEASON,portraitIndexForSeason} from '../../src/online/portraitCatalog.js';

export const clubs = CLUBS.filter(c => ['FR', 'GB', 'ES', 'IT', 'DE'].includes(c.countryCode));
export const clubMap = new Map(clubs.map(c => [c.id, c]));
export const positions = ['GK', 'DEF', 'MID', 'FWD'];
const given = ['Adrien', 'Luca', 'Mateo', 'Amadou', 'Felix', 'Diego', 'Hugo', 'Yanis', 'Tiago', 'Noah', 'Enzo', 'Ibrahim', 'Marco', 'Oscar', 'Ruben', 'Sacha', 'Leo', 'Samuel', 'Nicolas', 'Alex'];
const family = ['Dembele', 'Moretti', 'Silva', 'Diop', 'Weber', 'Garcia', 'Laurent', 'Benali', 'Costa', 'Martin', 'Ricci', 'Traore', 'Romano', 'Keller', 'Torres', 'Bernard', 'Mendes', 'Diallo', 'Lopez', 'Meyer'];
export function makePlayer(worldId, sequence,{season=1,portraitOffset=0}={}) {
  const h = hash(`${worldId}:${sequence}`), level = sequence === 0 ? 62 : sequence === 1 ? 71 : sequence === 2 ? 58 : 42 + h % 44;
  const ordinal=(season-1)*PLAYERS_PER_SEASON+sequence;
  const player={ id: `p${ordinal}`, name: `${given[ordinal % given.length]} ${family[(ordinal + Math.floor(ordinal / given.length)) % family.length]}`,
    portrait: sequence % 6,portraitSet:2,portraitId:portraitIndexForSeason(season,sequence,portraitOffset), age: 18 + h % 9, position: ['GK', 'FWD', 'MID', 'DEF'][sequence % 4], level,
    potential: Math.min(99, level + 5 + (h >>> 4) % 15), value: sequence < 3 ? [15,22,12][sequence] : Math.max(8, Math.round((level - 30) / 2)),
    clubId: clubs[(h >>> 8) % clubs.length].id, ownerId: null, trust: 75, signedAt: null, mandateEndsAt: null, protectedUntil: 0, injuredUntil: 0,
    goals: 0, assists: 0, appearances: 0, wins: 0, training: null, trainingBoosts: 0,
  };
  player.profile=createPlayerProfile(worldId,player);player.experience=0;return player;
}
export const products = Object.freeze({ gems_starter: 80, gems_player: 250, gems_pro: 650, gems_elite: 1700, gems_legend: 4500 });
export const cosmetics = Object.freeze({ crest_neon: 15, office_gold: 25, office_ice: 15 });
export const tactics = Object.freeze({ safe: { commission: 3, modifier: 12 }, balanced: { commission: 5, modifier: 5 }, ambitious: { commission: 8, modifier: -6 } });
export const thirdClientCost = 250;
export const rules = Object.freeze({ version: 2, members: 10, capacity: 2, premiumCapacity: 3, thirdClientCost, newPlayersPerWeek: 15, seasonDays: 28, passDays: 28, auctionHours: 24, startingCoins: 60 });
