import React, { useMemo } from 'react';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { formatMoneyCompact } from '../utils/format';
import { S } from './styles';

import leagueEngland from '../assets/badges/league_england.png';
import leagueFrance from '../assets/badges/league_france.png';
import leagueSpain from '../assets/badges/league_spain.png';
import leagueItaly from '../assets/badges/league_italy.png';
import leagueGermany from '../assets/badges/league_germany.png';
import worldCup from '../assets/badges/world_cup.png';
import championsLeague from '../assets/badges/champions_league.png';
import europaLeague from '../assets/badges/europa_league.png';
import conferenceLeague from '../assets/badges/conference_league.png';
import ballonDor from '../assets/badges/ballon_dor.png';
import agencyMillion from '../assets/badges/agency_million.png';
import limitedEvent from '../assets/badges/limited_event.png';

const badge = (id, data) => ({ id, gameCenterRewardId: `agentfc_badge_${id}`, ...data });

export const BADGE_CATALOG = [
  badge('league_england', { title: 'Championnat anglais', group: 'Championnats', asset: leagueEngland, desc: "Un joueur de l'agence remporte le championnat anglais." }),
  badge('league_france', { title: 'Championnat français', group: 'Championnats', asset: leagueFrance, desc: "Un joueur de l'agence remporte le championnat français." }),
  badge('league_spain', { title: 'Championnat espagnol', group: 'Championnats', asset: leagueSpain, desc: "Un joueur de l'agence remporte le championnat espagnol." }),
  badge('league_italy', { title: 'Championnat italien', group: 'Championnats', asset: leagueItaly, desc: "Un joueur de l'agence remporte le championnat italien." }),
  badge('league_germany', { title: 'Championnat allemand', group: 'Championnats', asset: leagueGermany, desc: "Un joueur de l'agence remporte le championnat allemand." }),
  badge('world_cup', { title: 'Coupe du Monde', group: 'International', asset: worldCup, desc: "Un joueur de l'agence devient champion du monde." }),
  badge('champions_league', { title: 'Ligue des Champions', group: 'Europe', asset: championsLeague, desc: "Un joueur de l'agence remporte la Ligue des Champions." }),
  badge('europa_league', { title: 'Europa League', group: 'Europe', asset: europaLeague, desc: "Un joueur de l'agence remporte l'Europa League." }),
  badge('conference_league', { title: 'Conference League', group: 'Europe', asset: conferenceLeague, desc: "Un joueur de l'agence remporte la Conference League." }),
  badge('ballon_dor', { title: "Ballon d'or", group: 'Individuel', asset: ballonDor, desc: "Un joueur de l'agence remporte le Ballon d'or." }),
  badge('agency_million', { title: 'Agence millionnaire', group: 'Agence', asset: agencyMillion, desc: "L'agence atteint 1 million d'euros." }),
  badge('limited_event', { title: 'Badge limité', group: 'Durée limitée', asset: limitedEvent, desc: 'Événement spécial à venir pendant la saison.', limited: true }),
];

const fullName = (player = {}) => `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();

const getSavedBadgeMap = (state = {}) =>
  new Map((Array.isArray(state.badges) ? state.badges : []).filter(Boolean).map((badge) => [badge.id, badge]));

const deriveLegacyUnlocks = (state = {}) => {
  const map = new Map();
  const roster = state.roster ?? [];
  const rosterIds = new Set(roster.map((player) => player.id));

  if ((state.money ?? 0) >= 1_000_000 || (state.stats?.totalEarned ?? 0) >= 1_000_000) {
    map.set('agency_million', {
      id: 'agency_million',
      detail: "L'agence a déjà atteint le million d'euros.",
    });
  }

  (state.seasonTrophies ?? []).forEach((season) => {
    if (season.ballonDor?.playerId && rosterIds.has(season.ballonDor.playerId)) {
      map.set('ballon_dor', {
        id: 'ballon_dor',
        playerName: season.ballonDor.name,
        club: season.ballonDor.club,
        season: season.season,
        detail: `${season.ballonDor.name} a remporté le Ballon d'or.`,
      });
    }
  });

  roster.forEach((player) => {
    const name = fullName(player);
    (player.matchHistory ?? []).forEach((match) => {
      if (match.competition === 'CL' && match.result === 'win' && (match.stage === 'final' || match.isFinal)) {
        map.set('champions_league', { id: 'champions_league', playerName: name, club: player.club, detail: `${name} a gagné une finale de Ligue des Champions.` });
      }
      if (match.competition === 'EL' && match.result === 'win' && (match.stage === 'final' || match.isFinal)) {
        map.set('europa_league', { id: 'europa_league', playerName: name, club: player.club, detail: `${name} a gagné une finale d'Europa League.` });
      }
      if (match.competition === 'ECL' && match.result === 'win' && (match.stage === 'final' || match.isFinal)) {
        map.set('conference_league', { id: 'conference_league', playerName: name, club: player.club, detail: `${name} a gagné une finale de Conference League.` });
      }
      if (match.isChampion || /champion/i.test(String(match.label ?? match.phase ?? ''))) {
        map.set('world_cup', { id: 'world_cup', playerName: name, detail: `${name} est devenu champion du monde.` });
      }
    });
  });

  (state.worldCupState?.selectedPlayers ?? []).forEach((entry) => {
    if (entry?.champion && rosterIds.has(entry.playerId)) {
      const player = roster.find((item) => item.id === entry.playerId);
      map.set('world_cup', {
        id: 'world_cup',
        playerName: player ? fullName(player) : entry.playerName,
        detail: `${player ? fullName(player) : entry.playerName ?? 'Un joueur'} est devenu champion du monde.`,
      });
    }
  });

  return map;
};

function BadgeCard({ badge, unlocked }) {
  const detail = unlocked?.detail || badge.desc;
  return (
    <article
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 22,
        padding: 14,
        minHeight: 188,
        border: unlocked
          ? '1px solid oklch(78% 0.18 295 / .48)'
          : '1px solid oklch(45% 0.03 265 / .22)',
        background: unlocked
          ? 'linear-gradient(145deg, oklch(20% 0.08 260 / .78), oklch(13% 0.04 265 / .86))'
          : 'linear-gradient(145deg, oklch(15% 0.035 260 / .70), oklch(9% 0.02 265 / .82))',
        boxShadow: unlocked
          ? '0 22px 50px oklch(58% 0.22 295 / .20), inset 0 1px 0 rgba(255,255,255,.10)'
          : 'inset 0 1px 0 rgba(255,255,255,.05)',
        opacity: unlocked || badge.limited ? 1 : 0.58,
      }}
    >
      <div style={{
        position: 'absolute',
        inset: '-35% -20% auto auto',
        width: 140,
        height: 140,
        borderRadius: 999,
        background: unlocked ? 'oklch(72% 0.20 295 / .22)' : 'rgba(255,255,255,.04)',
        filter: 'blur(34px)',
      }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: unlocked ? 'oklch(78% 0.18 295)' : 'var(--af-muted)', fontWeight: 900 }}>
          {badge.group}
        </span>
        <span style={{
          width: 27,
          height: 27,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          background: unlocked ? 'oklch(72% 0.20 295 / .20)' : 'rgba(255,255,255,.05)',
          color: unlocked ? 'oklch(78% 0.18 295)' : 'var(--af-muted)',
          border: '1px solid rgba(255,255,255,.10)',
        }}>
          {unlocked ? <CheckCircle2 size={15} /> : <Lock size={14} />}
        </span>
      </div>

      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', margin: '8px 0 7px' }}>
        <img
          src={badge.asset}
          alt={badge.title}
          style={{
            width: 94,
            height: 94,
            objectFit: 'contain',
            filter: unlocked ? 'drop-shadow(0 0 18px rgba(180,120,255,.38))' : 'grayscale(1) saturate(.35) brightness(.62)',
            transform: unlocked ? 'scale(1)' : 'scale(.94)',
            transition: 'filter .25s ease, transform .25s ease',
          }}
        />
      </div>

      <div style={{ position: 'relative', fontSize: 14, fontWeight: 950, color: 'var(--af-text)', lineHeight: 1.05 }}>
        {badge.title}
      </div>
      <div style={{ position: 'relative', marginTop: 7, color: unlocked ? 'var(--af-muted)' : 'var(--af-dim)', fontSize: 11.5, lineHeight: 1.35 }}>
        {detail}
      </div>
      {unlocked?.playerName && (
        <div style={{ position: 'relative', marginTop: 9, color: 'oklch(78% 0.18 295)', fontSize: 10, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {unlocked.playerName}
        </div>
      )}
    </article>
  );
}

export default function Achievements({ state }) {
  const savedBadges = useMemo(() => getSavedBadgeMap(state), [state]);
  const legacyBadges = useMemo(() => deriveLegacyUnlocks(state), [state]);
  const unlockedMap = useMemo(() => new Map([...legacyBadges, ...savedBadges]), [legacyBadges, savedBadges]);
  const unlockedCount = BADGE_CATALOG.filter((badge) => unlockedMap.has(badge.id)).length;

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>COLLECTION</div>
        <h1 style={S.eh}>Badges</h1>
        <p style={S.ep}>
          Une collection visuelle liée uniquement aux vrais accomplissements de tes joueurs et de ton agence.
        </p>
      </div>

      <section
        className="af-panel"
        style={{
          padding: 16,
          marginBottom: 14,
          borderRadius: 24,
          background: 'linear-gradient(135deg, oklch(22% 0.10 260 / .78), oklch(12% 0.04 265 / .88))',
          boxShadow: '0 24px 70px oklch(60% 0.22 295 / .16), inset 0 1px 0 rgba(255,255,255,.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'oklch(78% 0.18 295)', fontWeight: 950 }}>
              <Sparkles size={14} />
              Coffre agence
            </div>
            <div style={{ marginTop: 7, fontSize: 28, fontWeight: 950, color: 'var(--af-text)', lineHeight: 1 }}>
              {unlockedCount}/{BADGE_CATALOG.length}
            </div>
            <div style={{ marginTop: 5, color: 'var(--af-muted)', fontSize: 12 }}>
              Capital actuel : {formatMoneyCompact(state?.money ?? 0)}
            </div>
          </div>
          <img src={agencyMillion} alt="" style={{ width: 74, height: 74, objectFit: 'contain', filter: 'drop-shadow(0 0 22px rgba(255,190,40,.34))' }} />
        </div>
        <div style={{ ...S.progBar, height: 7, marginTop: 14, background: 'rgba(255,255,255,.10)' }}>
          <div style={{ ...S.progFill, height: 7, width: `${Math.round((unlockedCount / BADGE_CATALOG.length) * 100)}%`, background: 'linear-gradient(90deg, oklch(72% 0.20 295), oklch(78% 0.17 210))' }} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, paddingBottom: 96 }}>
        {BADGE_CATALOG.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} unlocked={unlockedMap.get(badge.id)} />
        ))}
      </div>
    </div>
  );
}
