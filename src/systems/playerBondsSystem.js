/**
 * playerBondsSystem.js
 * Affinités (et rivalités) entre joueurs : duos forts hardcodés + bonds dynamiques
 * en fonction du club partagé / du temps passé ensemble / des résultats.
 *
 * Une "bond" est un nombre entre -100 (rivalité) et +100 (frères d'armes).
 * Stockée par paire ordonnée (ids triés alphabétiquement).
 */

import { GABRIEL_FIXIO_ID, UGO_MOXWMO_ID } from '../data/squadDatabase';
import { getClubId } from './identitySystem';

export const BOND_LABELS = [
  { min: 80, label: 'Frères d\'armes', tone: '#ff3da7' },
  { min: 55, label: 'Duo très fort', tone: '#00a676' },
  { min: 25, label: 'Bonne entente', tone: '#22c55e' },
  { min: -10, label: 'Cordial', tone: '#94a3b8' },
  { min: -40, label: 'Tensions', tone: '#f97316' },
  { min: -101, label: 'Rivalité ouverte', tone: '#ef4444' },
];

export const getBondLabel = (value = 0) =>
  BOND_LABELS.find((entry) => value >= entry.min) ?? BOND_LABELS[BOND_LABELS.length - 1];

const pairKey = (a, b) => [String(a), String(b)].sort().join('::');

// Hash déterministe simple (string -> [0,1])
const hashFloat = (str) => {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967295;
};

/** Duos / rivalités scriptés, immuables, toujours présents au démarrage. */
export const SCRIPTED_BONDS = [
  {
    a: GABRIEL_FIXIO_ID,
    b: UGO_MOXWMO_ID,
    value: 92,
    type: 'duo',
    story: 'Gabriel Fixio et Ugo Moxwmo se connaissent depuis le centre de formation. Sur le terrain, ils se cherchent à l\'instinct.',
  },
];

/** Construit la map initiale des bonds (paires → { value, type, story }). */
export const buildInitialBonds = () => {
  const map = {};
  for (const bond of SCRIPTED_BONDS) {
    map[pairKey(bond.a, bond.b)] = {
      value: bond.value,
      type: bond.type,
      story: bond.story,
      scripted: true,
      since: 0,
    };
  }
  return map;
};

export const getBond = (bonds = {}, idA, idB) => bonds[pairKey(idA, idB)] ?? null;

/** Retourne tous les bonds impliquant un joueur donné, enrichis du joueur partenaire. */
export const getBondsForPlayer = (bonds = {}, playerId, roster = []) => {
  const out = [];
  for (const [key, bond] of Object.entries(bonds)) {
    const [idA, idB] = key.split('::');
    if (idA !== String(playerId) && idB !== String(playerId)) continue;
    const otherId = idA === String(playerId) ? idB : idA;
    const other = roster.find((p) => String(p.id) === otherId);
    if (!other) continue;
    const current = roster.find((p) => String(p.id) === String(playerId));
    const sameClub = getClubId(current?.clubId ?? current?.club) && getClubId(current?.clubId ?? current?.club) === getClubId(other?.clubId ?? other?.club);
    out.push({
      key,
      value: bond.value,
      type: bond.type,
      story: bond.story,
      scripted: !!bond.scripted,
      sameClub,
      partner: other,
    });
  }
  return out
    .filter((bond) => bond.sameClub)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
};

/** Seed déterministe d'un bond entre 2 joueurs (la première fois qu'on les voit ensemble). */
const seedInitialBondValue = (a, b) => {
  const r = hashFloat(`bond:${pairKey(a.id, b.id)}`);
  const sameNationality = a.countryCode && a.countryCode === b.countryCode;
  const sameClub = getClubId(a.clubId ?? a.club) && getClubId(a.clubId ?? a.club) === getClubId(b.clubId ?? b.club);
  if (!sameClub) return 0;
  // 70% bonds positifs (les coéquipiers s'entendent globalement bien)
  if (r < 0.10) return -25 - Math.floor(hashFloat(`riv:${pairKey(a.id, b.id)}`) * 25); // -25..-50 rivalité
  if (r < 0.30) return 12 + Math.floor(r * 30);  // 12..21 cordial
  if (r < 0.70) return 28 + Math.floor(r * 22) + (sameNationality ? 6 : 0); // bonne entente
  if (r < 0.92) return 55 + Math.floor(r * 15) + (sameNationality ? 5 : 0); // duo fort
  return 78 + Math.floor(r * 10); // 78..88 frères
};

/**
 * Évolution hebdomadaire des bonds :
 *  - Seed initial déterministe pour chaque nouvelle paire de coéquipiers
 *  - +0.6 si même club et tous deux disponibles
 *  - +1.5 si partagé une victoire
 *  - +0.4 si partagé une défaite (épreuve qui rapproche)
 *  - drift -0.2 par semaine si plus dans le même club
 *  - les bonds scriptés ont une amplitude réduite (ne descendent jamais sous 70)
 */
export const tickBonds = (bonds = {}, roster = [], { week = 1 } = {}) => {
  if (!Array.isArray(roster) || roster.length < 2) return bonds;
  const next = { ...bonds };
  const players = roster.filter((p) => p && p.id);

  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i];
      const b = players[j];
      const key = pairKey(a.id, b.id);
      const sameClub = getClubId(a.clubId ?? a.club) && getClubId(a.clubId ?? a.club) === getClubId(b.clubId ?? b.club);
      let existing = next[key];

      if (!existing) {
        const seeded = seedInitialBondValue(a, b);
        if (seeded === 0) continue;
        existing = {
          value: seeded,
          type: seeded > 0 ? 'duo' : 'rivalry',
          scripted: false,
          since: week,
        };
      }

      let delta = 0;
      if (sameClub) {
        delta += 0.4;
        const recentA = (a.recentResults ?? []).slice(-1)[0];
        const recentB = (b.recentResults ?? []).slice(-1)[0];
        if (recentA && recentB && recentA === recentB) {
          delta += recentA === 'W' ? 1.2 : recentA === 'L' ? 0.4 : 0.2;
        }
      } else {
        delta -= 0.2;
      }

      let newValue = existing.value + delta;
      if (existing.scripted && sameClub) {
        newValue = Math.max(70, Math.min(100, newValue));
      } else {
        newValue = Math.max(-100, Math.min(100, newValue));
      }

      if (!existing.scripted && Math.abs(newValue) < 8) {
        delete next[key];
        continue;
      }

      next[key] = {
        ...existing,
        value: Math.round(newValue * 10) / 10,
        type: existing.type ?? (newValue > 0 ? 'duo' : 'rivalry'),
      };
    }
  }
  return next;
};

/**
 * Applique les effets d'affinité aux résultats de match :
 *  - Pour chaque paire de coéquipiers (même club) du roster utilisateur :
 *    · Bond ≥ +55 et l'un a marqué : 35% de chance que l'autre récupère une passe décisive
 *    · Bond ≥ +25 et tous deux ont joué : +0.15 sur la note de match (max +0.4 cumul)
 *    · Bond ≤ -25 : -0.15 sur la note de match (les rivaux se nuisent)
 */
export const applyBondEffectsToMatchResults = (matchResults = [], roster = [], bonds = {}) => {
  if (!matchResults?.length || !roster?.length) return matchResults;
  const byId = new Map(matchResults.map((m) => [m.playerId, { ...m, _ratingDelta: 0 }]));
  const players = roster.filter((p) => p && p.id);

  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i];
      const b = players[j];
      if (!getClubId(a.clubId ?? a.club) || getClubId(a.clubId ?? a.club) !== getClubId(b.clubId ?? b.club)) continue;
      const bond = bonds[pairKey(a.id, b.id)];
      if (!bond) continue;
      const ma = byId.get(a.id);
      const mb = byId.get(b.id);
      if (!ma || !mb) continue;
      if ((ma.minutes ?? 0) === 0 || (mb.minutes ?? 0) === 0) continue;

      if (bond.value >= 55) {
        // Synergie : si l'un marque, l'autre récupère parfois une passe
        const seed = hashFloat(`assist:${pairKey(a.id, b.id)}:${ma.fixtureId ?? ''}`);
        if ((ma.goals ?? 0) > 0 && (mb.assists ?? 0) === 0 && seed < 0.35) {
          mb.assists = (mb.assists ?? 0) + 1;
          mb._ratingDelta += 0.4;
        }
        if ((mb.goals ?? 0) > 0 && (ma.assists ?? 0) === 0 && seed > 0.65) {
          ma.assists = (ma.assists ?? 0) + 1;
          ma._ratingDelta += 0.4;
        }
      }
      if (bond.value >= 25) {
        ma._ratingDelta = Math.min(0.4, (ma._ratingDelta ?? 0) + 0.15);
        mb._ratingDelta = Math.min(0.4, (mb._ratingDelta ?? 0) + 0.15);
      } else if (bond.value <= -25) {
        ma._ratingDelta = Math.max(-0.4, (ma._ratingDelta ?? 0) - 0.15);
        mb._ratingDelta = Math.max(-0.4, (mb._ratingDelta ?? 0) - 0.15);
      }
    }
  }

  return matchResults.map((m) => {
    const updated = byId.get(m.playerId);
    if (!updated) return m;
    const delta = updated._ratingDelta ?? 0;
    const rating = Number.isFinite(updated.matchRating)
      ? Math.max(0, Math.min(10, Number((updated.matchRating + delta).toFixed(2))))
      : updated.matchRating;
    const { _ratingDelta, ...clean } = updated;
    return { ...clean, matchRating: rating };
  });
};

/**
 * Génère du contenu social (posts fan/presse) à partir des bonds :
 *  - duos forts → posts d'admiration
 *  - rivalités → posts de tension
 * Retourne un tableau d'objets {kind, text, players: [a,b], tone}
 */
export const generateBondSocialPosts = (bonds = {}, roster = [], { week = 1, max = 3 } = {}) => {
  const out = [];
  const byId = new Map(roster.map((p) => [String(p.id), p]));
  const entries = Object.entries(bonds)
    .map(([key, bond]) => {
      const [idA, idB] = key.split('::');
      const a = byId.get(idA);
      const b = byId.get(idB);
      if (!a || !b) return null;
      if (!getClubId(a.clubId ?? a.club) || getClubId(a.clubId ?? a.club) !== getClubId(b.clubId ?? b.club)) return null;
      return { key, a, b, ...bond };
    })
    .filter(Boolean)
    .filter((e) => Math.abs(e.value) >= 40)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  for (const e of entries.slice(0, max)) {
    const seed = hashFloat(`post:${e.key}:${week}`);
    if (e.value >= 55) {
      const variants = [
        `${e.a.firstName} ${e.a.lastName} et ${e.b.firstName} ${e.b.lastName}, le duo qui fait rêver les supporters de ${e.a.club}. 🔥`,
        `Sur le terrain ils se trouvent les yeux fermés. ${e.a.lastName}-${e.b.lastName}, c'est de la pure complicité.`,
        `${e.a.firstName} et ${e.b.firstName} sont les meilleurs potes du vestiaire de ${e.a.club}. Ça se voit.`,
      ];
      out.push({
        kind: 'fan',
        tone: 'duo',
        text: variants[Math.floor(seed * variants.length)],
        players: [e.a, e.b],
        bondValue: e.value,
      });
    } else if (e.value <= -25) {
      const variants = [
        `Ambiance glaciale entre ${e.a.lastName} et ${e.b.lastName} à l'entraînement. Les caméras ont tout vu...`,
        `Tensions à ${e.a.club} : ${e.a.firstName} ${e.a.lastName} et ${e.b.firstName} ${e.b.lastName} ne se parleraient plus depuis des semaines.`,
        `Clash dans le vestiaire ? ${e.a.lastName} et ${e.b.lastName} se sont accrochés à la mi-temps selon nos sources.`,
      ];
      out.push({
        kind: 'press',
        tone: 'rivalry',
        text: variants[Math.floor(seed * variants.length)],
        players: [e.a, e.b],
        bondValue: e.value,
      });
    }
  }
  return out;
};
