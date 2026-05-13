/**
 * aiTransferPersistenceSystem.js
 * Vraies bouger les joueurs entre clubs IA dans le catalogue.
 * Pendant les fenêtres mercato, on swap des joueurs entre clubs de tier proche
 * et on persiste la mutation dans le databasePlayerCatalog.
 */
import { CLUBS, getClubDisplayName } from '../data/clubs';
import {
  createPlayerCatalog,
  setDatabasePlayerCatalog,
} from '../data/squadDatabase';

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Build a transfer between two AI clubs of similar tier
const planTransfer = (catalog, agentPlayerIds, agentClubs) => {
  const clubsByTier = new Map();
  CLUBS.forEach((c) => {
    const list = clubsByTier.get(c.tier) ?? [];
    list.push(c);
    clubsByTier.set(c.tier, list);
  });

  // pick a tier
  const tier = pickRandom([1, 2, 2, 3, 3, 4]);
  const candidates = clubsByTier.get(tier) ?? [];
  if (candidates.length < 2) return null;

  const fromClub = pickRandom(candidates);
  let toClub = pickRandom(candidates);
  let attempts = 0;
  while (toClub.name === fromClub.name && attempts++ < 5) toClub = pickRandom(candidates);
  if (toClub.name === fromClub.name) return null;

  // find a player from fromClub (not agent's, not protected signature)
  const protectedIds = new Set(['sig_gabriel_fixio', 'sig_ugo_moxwmo', 'sig_yohan_zenoxx']);
  const pool = catalog.filter((p) =>
    p.club === fromClub.name &&
    !agentPlayerIds.has(p.id) &&
    !protectedIds.has(p.id) &&
    (p.age ?? 24) >= 19 && (p.age ?? 24) <= 32
  );
  if (!pool.length) return null;

  const player = pickRandom(pool);
  const fee = Math.max(1, Math.round((player.value ?? 5_000_000) / 1_000_000));
  return { player, fromClub, toClub, fee };
};

export const simulateAITransfersForWeek = (state, week, phase) => {
  if (!phase?.mercato) return { state, transfers: [] };
  const agentPlayerIds = new Set((state.roster ?? []).map((p) => p.id));
  const agentClubs = new Set((state.roster ?? []).map((p) => p.club).filter(Boolean));

  const catalog = createPlayerCatalog(phase.season ?? 1);
  const count = Math.floor(Math.random() * 3) + 1; // 1 à 3 transferts par semaine
  const transfers = [];
  const mutated = catalog.slice();
  const idxMap = new Map(mutated.map((p, i) => [p.id, i]));

  for (let i = 0; i < count; i++) {
    const plan = planTransfer(mutated, agentPlayerIds, agentClubs);
    if (!plan) continue;
    const { player, fromClub, toClub, fee } = plan;
    const idx = idxMap.get(player.id);
    if (idx == null) continue;
    const updated = {
      ...mutated[idx],
      club: toClub.name,
      clubDisplay: getClubDisplayName(toClub.name),
      clubTier: toClub.tier,
      clubCountry: toClub.country,
      clubCountryCode: toClub.countryCode,
      clubCity: toClub.city,
    };
    mutated[idx] = updated;
    transfers.push({
      id: `ait_${week}_${i}_${player.id}`,
      week,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      fromClub: fromClub.name,
      toClub: toClub.name,
      fee,
    });
  }

  if (transfers.length) {
    setDatabasePlayerCatalog(mutated);
  }

  const aiTransferLog = [...transfers, ...((state.aiTransferLog) ?? [])].slice(0, 80);
  return { state: { ...state, aiTransferLog }, transfers };
};
