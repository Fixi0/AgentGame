import { clamp } from '../utils/helpers';

const LEADER_PERSONALITIES = new Set(['leader']);
const PERTURBATOR_PERSONALITIES = new Set(['instable', 'fetard', 'mercenaire']);

const getClubGroups = (roster = []) => {
  const groups = new Map();
  roster.forEach((player) => {
    const club = player.club ?? 'Libre';
    if (!club || club === 'Libre') return;
    if (!groups.has(club)) groups.set(club, []);
    groups.get(club).push(player);
  });
  return [...groups.entries()].map(([club, members]) => ({ club, members }));
};

const getCompatibility = (a, b) => {
  let score = 52;
  if (!a || !b) return score;

  if (a.personality === b.personality) score += 12;
  if (a.countryCode === b.countryCode) score += 8;
  if ((a.clubRole ?? '') === (b.clubRole ?? '')) score += 5;
  if ((a.trust ?? 50) >= 60 && (b.trust ?? 50) >= 60) score += 4;
  if (Math.abs((a.age ?? 25) - (b.age ?? 25)) <= 3) score += 4;
  if (PERTURBATOR_PERSONALITIES.has(a.personality) || PERTURBATOR_PERSONALITIES.has(b.personality)) score -= 9;
  if ((a.moral ?? 50) < 40 || (b.moral ?? 50) < 40) score -= 5;

  return clamp(score, 0, 100);
};

export const buildLockerRoomSnapshot = (roster = []) => {
  const groups = getClubGroups(roster).map(({ club, members }) => {
    const leaders = members.filter((player) => LEADER_PERSONALITIES.has(player.personality) || player.hiddenTrait === 'locker_room_leader' || player.clubRole === 'Star');
    const perturbators = members.filter((player) => PERTURBATOR_PERSONALITIES.has(player.personality) || (player.trust ?? 50) < 40 || (player.moral ?? 50) < 40);
    const pairScores = [];
    members.forEach((player, index) => {
      members.slice(index + 1).forEach((teammate) => {
        pairScores.push(getCompatibility(player, teammate));
      });
    });

    const chemistry = pairScores.length
      ? Math.round(pairScores.reduce((sum, value) => sum + value, 0) / pairScores.length)
      : 50;

    const tension = clamp(
      100 - chemistry
      + perturbators.length * 8
      - leaders.length * 4
      + Math.max(0, 55 - Math.round(members.reduce((sum, player) => sum + (player.trust ?? 50), 0) / members.length)),
      0,
      100,
    );

    const topPair = pairScores.length
      ? members
          .flatMap((player, index) => members.slice(index + 1).map((teammate) => ({
            a: player,
            b: teammate,
            score: getCompatibility(player, teammate),
          })))
          .sort((left, right) => right.score - left.score)[0]
      : null;

    const lowPair = pairScores.length
      ? members
          .flatMap((player, index) => members.slice(index + 1).map((teammate) => ({
            a: player,
            b: teammate,
            score: getCompatibility(player, teammate),
          })))
          .sort((left, right) => left.score - right.score)[0]
      : null;

    return {
      club,
      members,
      leaders,
      perturbators,
      chemistry,
      tension,
      topPair,
      lowPair,
      mood: tension > 65 ? 'Sous tension' : chemistry > 68 ? 'Solide' : 'Équilibré',
    };
  });

  return groups.sort((a, b) => b.members.length - a.members.length || b.tension - a.tension);
};

const applyDelta = (player, delta) => ({
  ...player,
  moral: clamp((player.moral ?? 50) + (delta.moral ?? 0)),
  trust: clamp((player.trust ?? 50) + (delta.trust ?? 0)),
  pressure: clamp((player.pressure ?? 30) + (delta.pressure ?? 0)),
});

export const applyLockerRoomDynamics = (roster = [], week = 1) => {
  const groups = buildLockerRoomSnapshot(roster);
  const deltas = new Map();
  const events = [];

  const addDelta = (playerId, delta) => {
    const current = deltas.get(playerId) ?? { moral: 0, trust: 0, pressure: 0 };
    deltas.set(playerId, {
      moral: current.moral + (delta.moral ?? 0),
      trust: current.trust + (delta.trust ?? 0),
      pressure: current.pressure + (delta.pressure ?? 0),
    });
  };

  groups.forEach((group) => {
    const { members, leaders, perturbators, chemistry, tension, club } = group;
    if (members.length < 2) return;

    if (leaders.length) {
      const leader = leaders[0];
      const boosts = members
        .filter((player) => player.id !== leader.id)
        .sort((a, b) => (a.trust ?? 50) - (b.trust ?? 50))
        .slice(0, 2);
      boosts.forEach((player) => addDelta(player.id, { moral: 3, trust: 2 }));
      if (boosts.length) {
        events.push({
          week,
          playerId: leader.id,
          playerName: `${leader.firstName} ${leader.lastName}`,
          club,
          label: `${leader.firstName} ${leader.lastName} tire le vestiaire vers le haut`,
          good: true,
        });
      }
    }

    if (perturbators.length && tension > 40) {
      const troublemaker = perturbators[0];
      const target = members
        .filter((player) => player.id !== troublemaker.id)
        .sort((a, b) => (a.trust ?? 50) - (b.trust ?? 50) || (a.moral ?? 50) - (b.moral ?? 50))[0];
      if (target) {
        addDelta(target.id, { moral: -2, trust: -2, pressure: 3 });
        events.push({
          week,
          playerId: target.id,
          playerName: `${target.firstName} ${target.lastName}`,
          club,
          label: `${troublemaker.firstName} ${troublemaker.lastName} agace ${target.firstName} ${target.lastName}`,
          good: false,
        });
      }
    }

    if (chemistry >= 72) {
      members.forEach((player) => addDelta(player.id, { moral: 1, trust: 1 }));
    } else if (chemistry <= 42) {
      members.forEach((player) => addDelta(player.id, { moral: -1, pressure: 1 }));
    }
  });

  const nextRoster = roster.map((player) => (
    deltas.has(player.id)
      ? applyDelta(player, deltas.get(player.id))
      : player
  ));

  return {
    roster: nextRoster,
    events,
    snapshot: buildLockerRoomSnapshot(nextRoster),
  };
};
