import { Trophy } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CLUBS, COUNTRIES } from '../data/clubs';
import { getClubProfile } from '../systems/clubSystem';
import { getLeagueReputationLabel } from '../systems/leagueReputationSystem';
import { getSortedTable } from '../systems/leagueSystem';
import {
  EURO_CUP_LABELS,
  getClubEuropeanCompetition,
  getEuropeanPhaseLabel,
  getEuropeanStage,
} from '../systems/europeanCupSystem';
import { ClubCrest } from '../utils/clubCrests';
import { getLeagueTopStats } from '../systems/topScorersSystem';
import { getPlayerPortrait } from '../utils/playerPortraits';
import { S } from './styles';

const FormDots = ({ form = [] }) => {
  const last = form.slice(-5);
  if (!last.length) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 6, verticalAlign: 'middle' }}>
      {last.map((r, i) => (
        <span key={i} title={r} style={{
          width: 8, height: 8, borderRadius: 4,
          background: r === 'W' ? '#00a676' : r === 'D' ? '#f59e0b' : '#ef4444',
          display: 'inline-block',
        }} />
      ))}
    </span>
  );
};

const QualifierBadge = ({ index }) => {
  if (index < 4) return <span style={{ fontSize: 8, fontWeight: 900, color: '#fff', background: '#1a1a6e', borderRadius: 3, padding: '1px 4px', letterSpacing: '.05em' }}>UCL</span>;
  if (index === 4) return <span style={{ fontSize: 8, fontWeight: 900, color: '#fff', background: '#f97316', borderRadius: 3, padding: '1px 4px', letterSpacing: '.05em' }}>UEL</span>;
  if (index === 5) return <span style={{ fontSize: 8, fontWeight: 900, color: '#fff', background: '#16a34a', borderRadius: 3, padding: '1px 4px', letterSpacing: '.05em' }}>UECL</span>;
  if (index >= 16) return <span style={{ fontSize: 8, fontWeight: 900, color: '#fff', background: '#7f1d1d', borderRadius: 3, padding: '1px 4px', letterSpacing: '.05em' }}>REL</span>;
  return null;
};

const EuropeTicker = ({ databaseView, season }) => {
  const items = (databaseView?.competitionHistory ?? [])
    .filter((row) => ['CL', 'EL', 'ECL'].includes(row.competition) && row.season_id === `season_${season}` && row.score)
    .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
    .slice(0, 12);
  if (!items.length) return null;
  return (
    <div style={{ overflow: 'hidden', borderRadius: 8, border: '1px solid var(--af-border)', background: 'oklch(16% 0.035 258 / .92)', marginBottom: 12, padding: '6px 0' }}>
      <div style={{ display: 'flex', gap: 18, animation: 'tickerScroll 40s linear infinite', whiteSpace: 'nowrap' }}>
        {[...items, ...items].map((m, i) => {
          const cup = EURO_CUP_LABELS[m.competition];
          return (
            <span key={i} style={{ fontSize: 11, color: 'var(--af-text)', fontFamily: 'system-ui,sans-serif' }}>
              <span style={{ color: cup?.color, fontWeight: 900 }}>{cup?.icon} {cup?.short}</span>
              {' · '}{m.home_club_name ?? '?'} <strong>{m.score}</strong> {m.away_club_name ?? '?'}
            </span>
          );
        })}
      </div>
      <style>{`@keyframes tickerScroll {from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
};

const EURO_COMPETITIONS = ['CL', 'EL', 'ECL'];
const EURO_STAGE_TRACKER = [
  { key: 'league', label: 'Phase de ligue', hint: '36 clubs · CL/EL 8J · ECL 6J' },
  { key: 'playoff', label: 'Barrages', hint: 'Clubs 9-24 · aller/retour' },
  { key: 'roundOf16', label: 'Huitièmes', hint: 'Top 8 + 8 vainqueurs barrages' },
  { key: 'quarters', label: 'Quarts', hint: 'Aller / retour' },
  { key: 'semis', label: 'Demies', hint: 'Aller / retour' },
  { key: 'final', label: 'Finale', hint: 'Match unique' },
];

const getSeasonFromWeek = (week = 1) => Math.floor(((week - 1) / 38)) + 1;
const getSeasonWeekFromWeek = (week = 1) => ((week - 1) % 38) + 1;
const getSeasonId = (season = 1) => `season_${season}`;

const mapDbLeagueRow = (row) => ({
  club: row.club_name,
  countryCode: row.country_code,
  played: row.played ?? 0,
  win: row.wins ?? 0,
  draw: row.draws ?? 0,
  loss: row.losses ?? 0,
  goalsFor: row.goals_for ?? 0,
  goalsAgainst: row.goals_against ?? 0,
  points: row.points ?? 0,
  form: row.form ?? [],
});

const parseScore = (score = '0-0') => {
  const [homeRaw = '0', awayRaw = '0'] = String(score).split('-');
  const home = Number(homeRaw);
  const away = Number(awayRaw);
  return {
    home: Number.isFinite(home) ? home : 0,
    away: Number.isFinite(away) ? away : 0,
  };
};

const getClubHistoryMap = (state, databaseView, season) => {
  const dbRows = databaseView?.clubSeasonHistory?.filter((row) => row.season_id === getSeasonId(season)) ?? [];
  if (dbRows.length) {
    return Object.fromEntries(dbRows.map((row) => [row.club_name, {
      season,
      club: row.club_name,
      countryCode: row.country_code,
      competition: row.european_competition,
      league: row.league_history ?? [],
      europe: row.europe_history ?? [],
      summary: row.summary ?? [],
    }]));
  }
  return state.clubSeasonHistory ?? {};
};

// Stats déterministes de secours pour les clubs européens dont aucun match
// n'a été simulé (parce qu'aucun joueur du roster n'y est rattaché).
const seededRand = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};
const hashStr = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const synthesizeEuropeStats = (club, competition, season, seasonWeek) => {
  // Format UEFA: CL/EL = 8 journées · ECL = 6 journées
  const totalMatchdays = competition === 'ECL' ? 6 : 8;
  const matchdaysPlayed = Math.min(totalMatchdays, Math.max(0, Math.floor(seasonWeek / 3)));
  if (matchdaysPlayed === 0) {
    return { played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [] };
  }
  const tier = club.tier ?? 3;
  const winBias = tier === 1 ? 0.55 : tier === 2 ? 0.42 : 0.32;
  const drawBias = 0.25;
  const seedBase = hashStr(`${club.name}_${competition}_${season}`);
  let win = 0, draw = 0, loss = 0, goalsFor = 0, goalsAgainst = 0;
  const form = [];
  for (let m = 0; m < matchdaysPlayed; m += 1) {
    const r = seededRand(seedBase + m * 17);
    let result;
    if (r < winBias) result = 'W';
    else if (r < winBias + drawBias) result = 'D';
    else result = 'L';
    form.push(result);
    if (result === 'W') {
      win += 1;
      goalsFor += 1 + Math.floor(seededRand(seedBase + m * 23) * 3);
      goalsAgainst += Math.floor(seededRand(seedBase + m * 29) * 2);
    } else if (result === 'D') {
      draw += 1;
      const g = Math.floor(seededRand(seedBase + m * 31) * 3);
      goalsFor += g; goalsAgainst += g;
    } else {
      loss += 1;
      goalsFor += Math.floor(seededRand(seedBase + m * 37) * 2);
      goalsAgainst += 1 + Math.floor(seededRand(seedBase + m * 41) * 3);
    }
  }
  return { played: matchdaysPlayed, win, draw, loss, goalsFor, goalsAgainst, points: win * 3 + draw, form };
};

const buildEuropeRows = (state, competition, season, databaseView = null) => {
  const roster = state.roster ?? [];
  const clubHistory = getClubHistoryMap(state, databaseView, season);
  const seasonWeek = ((state.week ?? 1) - 1) % 38 + 1;
  const rows = CLUBS
    .filter((club) => getClubEuropeanCompetition(club, season) === competition)
    .map((club) => {
      const history = clubHistory?.[club.name] ?? null;
      const matches = (history?.europe ?? [])
        .filter((entry) => entry.competition === competition)
        .map((entry) => ({ ...entry }));
      const realStats = matches.reduce((acc, match) => {
        const { home, away } = parseScore(match.score);
        acc.played += 1;
        acc.win += home > away ? 1 : 0;
        acc.draw += home === away ? 1 : 0;
        acc.loss += home < away ? 1 : 0;
        acc.goalsFor += home;
        acc.goalsAgainst += away;
        acc.points += home > away ? 3 : home === away ? 1 : 0;
        return acc;
      }, { played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
      const rosterCount = roster.filter((player) => player.club === club.name).length;
      // Si aucun match réel : on synthétise pour donner du contexte au classement.
      const stats = realStats.played > 0
        ? { ...realStats, form: matches.slice(-5).map((m) => {
          const { home, away } = parseScore(m.score);
          return home > away ? 'W' : home === away ? 'D' : 'L';
        }) }
        : synthesizeEuropeStats(club, competition, season, seasonWeek);
      const latest = matches[matches.length - 1] ?? null;
      const flag = COUNTRIES.find((c) => c.code === club.countryCode)?.flag ?? '🌍';
      return {
        club, flag, history, matches, latest, rosterCount, ...stats,
      };
    })
    .sort((a, b) =>
      b.points - a.points
      || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
      || b.goalsFor - a.goalsFor
      || a.club.name.localeCompare(b.club.name),
    );

  return rows;
};

function EuropeCompetitionCard({ state, databaseView, competition, season, seasonWeek, onClubDetails }) {
  const cup = EURO_CUP_LABELS[competition];
  const currentStageKey = getEuropeanStage(seasonWeek, competition);
  const currentStageLabel = getEuropeanPhaseLabel(seasonWeek, competition);
  const stageIndex = EURO_STAGE_TRACKER.findIndex((stage) => stage.key === currentStageKey);
  const rows = buildEuropeRows(state, competition, season, databaseView);

  const boardBg = competition === 'CL'
    ? 'linear-gradient(135deg, oklch(24% 0.09 245 / .7), oklch(18% 0.04 252 / .92))'
    : competition === 'EL'
      ? 'linear-gradient(135deg, oklch(26% 0.10 60 / .65), oklch(18% 0.04 252 / .92))'
      : 'linear-gradient(135deg, oklch(26% 0.10 155 / .6), oklch(18% 0.04 252 / .92))';
  const borderColor = 'var(--af-border-strong)';

  return (
    <div style={{ ...S.objCard, marginBottom: 16, background: boardBg, borderColor }}>
      <div style={S.secTitle}>
        <Trophy size={14} />
        <span>{cup.icon} {cup.name}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', lineHeight: 1.45, marginBottom: 10 }}>
        Tous les clubs engagés cette saison. Tes clubs sont mis en évidence en vert.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>
          Saison {season} · Semaine {seasonWeek}/38
        </div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: cup.color, fontFamily: 'system-ui,sans-serif' }}>
          Phase actuelle · {currentStageLabel}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {EURO_STAGE_TRACKER.map((stage, index) => {
          const active = index === stageIndex;
          const done = index < stageIndex;
          return (
            <span
              key={stage.key}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                gap: 2,
                borderRadius: 8,
                padding: '7px 9px',
                border: `1px solid ${active ? cup.color : done ? 'var(--af-border)' : 'var(--af-border)'}`,
                background: active ? cup.color : done ? 'rgba(255,255,255,.72)' : 'var(--af-surface-soft)',
                color: active ? 'var(--af-surface)' : done ? 'var(--af-text)' : 'var(--af-muted)',
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: '.05em',
                fontFamily: 'system-ui,sans-serif',
                textTransform: 'uppercase',
              }}
            >
              <span>{stage.label}</span>
              <span style={{ fontSize: 8, opacity: active ? .85 : .75, letterSpacing: '.04em', fontWeight: 700 }}>{stage.hint}</span>
            </span>
          );
        })}
      </div>

      <div style={{ ...S.promiseRow, background: 'oklch(18% 0.035 258 / .92)', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
        <span>{currentStageKey === 'league' ? 'Classement européen' : 'Phase éliminatoire'}</span>
        <strong>{rows.length} club{rows.length > 1 ? 's' : ''} engagés</strong>
      </div>

      {rows.length ? (
        <div style={{ display: 'grid', gap: 6 }}>
          {rows.map((row, index) => {
            const goalDiff = row.goalsFor - row.goalsAgainst;
            const isMyClub = row.rosterCount > 0;
            const latestStage = row.latest?.stage
              ? EURO_STAGE_TRACKER.find((stage) => stage.key === row.latest.stage)?.label
              : row.latest?.phase ?? currentStageLabel;
            // Zones UEFA réelles : 1-8 → 1/8 directs · 9-24 → barrages · 25-36 → éliminé
            const directKO = competition === 'ECL' ? 8 : 8;
            const playoffEnd = 24;
            const zone = index < directKO
              ? { label: '1/8 directs', color: '#16a34a' }
              : index < playoffEnd
                ? { label: 'Barrages', color: '#f59e0b' }
                : { label: 'Éliminé', color: '#7f1d1d' };
            return (
              <button
                key={row.club.name}
                onClick={() => onClubDetails?.(row.club.name)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: isMyClub ? 'oklch(28% 0.10 155 / .35)' : 'var(--af-surface)',
                  border: `1px solid ${isMyClub ? 'var(--af-grass)' : 'var(--af-border)'}`,
                  borderLeft: `4px solid ${isMyClub ? '#00a676' : zone.color}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  boxShadow: isMyClub ? '0 4px 14px rgba(0,166,118,.12)' : '0 6px 18px rgba(15,23,32,.05)',
                  color: 'var(--af-text)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, minWidth: 20, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>{index + 1}.</span>
                      <span><ClubCrest club={row.club.name} size={18} style={{ marginRight: 2 }} />{row.flag} {row.club.name}</span>
                      <span style={{ fontSize: 8, fontWeight: 900, background: zone.color, color: '#fff', borderRadius: 3, padding: '1px 5px', letterSpacing: '.06em', fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase' }}>
                        {zone.label}
                      </span>
                      {isMyClub && (
                        <span style={{ fontSize: 9, fontWeight: 900, background: '#00a676', color: '#ffffff', borderRadius: 4, padding: '1px 5px', letterSpacing: '.06em', fontFamily: 'system-ui,sans-serif' }}>
                          MON CLUB
                        </span>
                      )}
                    </div>
                    {row.played > 0 && (
                      <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', background: 'oklch(28% 0.08 158 / .22)', border: '1px solid var(--af-border)', borderRadius: 4, padding: '1px 5px' }}>V {row.win}</span>
                        <span style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 4, padding: '1px 5px' }}>N {row.draw}</span>
                        <span style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', background: 'oklch(28% 0.12 25 / .35)', border: '1px solid var(--af-border)', borderRadius: 4, padding: '1px 5px' }}>D {row.loss}</span>
                        <span style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 4, padding: '1px 5px' }}>
                          {goalDiff >= 0 ? `+${goalDiff}` : goalDiff}
                        </span>
                        {row.latest && (
                          <span style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>
                            {latestStage} · {row.latest.score} vs {row.latest.opponent ?? '?'}
                          </span>
                        )}
                      </div>
                    )}
                    {row.played === 0 && (
                      <div style={{ fontSize: 10, color: 'var(--af-dim)', fontFamily: 'system-ui,sans-serif', marginTop: 3 }}>
                        Aucun match joué pour le moment
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 950, color: row.played > 0 ? cup.color : 'var(--af-dim)', lineHeight: 1 }}>{row.points}</div>
                    <div style={{ fontSize: 9, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 1 }}>MJ {row.played}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={S.emptySmall}>Aucun club engagé dans cette compétition pour cette saison.</div>
      )}
    </div>
  );
}

function TopStatsBoard({ countryCode, state }) {
  const [tab, setTab] = useState('scorers');
  const stats = useMemo(() => getLeagueTopStats(countryCode, state), [countryCode, state]);
  const list = tab === 'scorers' ? stats.scorers : stats.assisters;
  const accent = tab === 'scorers' ? '#f59e0b' : '#2f80ed';
  return (
    <div style={S.objCard}>
      <div style={S.secTitle}>
        <Trophy size={14} />
        <span>Classement individuel</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[
          { id: 'scorers', label: 'Buteurs' },
          { id: 'assisters', label: 'Passeurs' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '7px 10px', borderRadius: 8,
              border: `1px solid ${tab === t.id ? accent : 'var(--af-border)'}`,
              background: tab === t.id ? `color-mix(in oklch, ${accent} 30%, transparent)` : 'var(--af-surface)',
              color: tab === t.id ? '#fff' : 'var(--af-muted)',
              fontSize: 10, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {list.length ? (
        <div style={{ display: 'grid', gap: 5 }}>
          {list.map((player, i) => {
            const portrait = getPlayerPortrait(player);
            const value = tab === 'scorers' ? player.goals : player.assists;
            const sub = tab === 'scorers' ? `${player.assists} pd` : `${player.goals} buts`;
            return (
              <div key={`${player.id}_${i}`} style={{
                display: 'grid', gridTemplateColumns: '24px 36px 1fr auto', gap: 9, alignItems: 'center',
                padding: '6px 9px', borderRadius: 8,
                background: player.isMine ? 'oklch(28% 0.10 155 / .35)' : 'var(--af-surface)',
                border: `1px solid ${player.isMine ? 'var(--af-grass)' : 'var(--af-border)'}`,
              }}>
                <span style={{ color: 'var(--af-muted)', fontSize: 11, fontFamily: 'system-ui,sans-serif', fontWeight: 800, textAlign: 'center' }}>{i + 1}</span>
                <div style={{ width: 36, height: 36, borderRadius: 999, overflow: 'hidden', backgroundImage: `url(${portrait})`, backgroundSize: 'cover', backgroundPosition: 'center top', border: '1px solid var(--af-border)' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--af-text)', fontSize: 12, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.firstName} {player.lastName}
                    {player.isMine && <span style={{ marginLeft: 6, fontSize: 8, fontWeight: 900, background: '#00a676', color: '#fff', borderRadius: 3, padding: '1px 4px', letterSpacing: '.06em' }}>MOI</span>}
                  </div>
                  <div style={{ color: 'var(--af-muted)', fontSize: 10, fontFamily: 'system-ui,sans-serif' }}>{player.club} · {player.position} · {sub}</div>
                </div>
                <div style={{ color: accent, fontSize: 20, fontWeight: 950, lineHeight: 1 }}>{value}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={S.emptySmall}>Pas encore assez de matchs pour publier le classement.</div>
      )}
    </div>
  );
}

export default function Standings({ state, databaseView = null, onClubDetails }) {
  const availableCountries = useMemo(() => COUNTRIES.filter((country) => CLUBS.some((club) => club.countryCode === country.code)), []);
  const [viewMode, setViewMode] = useState('domestic');
  const [countryCode, setCountryCode] = useState(availableCountries[0]?.code ?? 'FR');
  const [selectedClubName, setSelectedClubName] = useState(null);
  const currentSeason = getSeasonFromWeek(state.week ?? 1);
  const currentSeasonWeek = getSeasonWeekFromWeek(state.week ?? 1);
  const selectedCountry = availableCountries.find((country) => country.code === countryCode) ?? availableCountries[0];
  const dbTable = selectedCountry
    ? (databaseView?.leagueTableRows ?? [])
      .filter((row) => row.country_code === selectedCountry.code && row.season_id === getSeasonId(currentSeason))
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map(mapDbLeagueRow)
    : [];
  const stateTable = selectedCountry ? getSortedTable(state.leagueTables, selectedCountry.code) : [];
  // Merge DB rows over the full club list so EVERY club of the country appears,
  // not just those that already played a match.
  const table = (() => {
    if (!selectedCountry) return [];
    if (!dbTable.length) {
      // Even fallback: include all clubs from CLUBS even if state table missed some
      const known = new Set(stateTable.map((r) => r.club));
      const missing = CLUBS
        .filter((c) => c.countryCode === selectedCountry.code && !known.has(c.name))
        .map((c) => ({ club: c.name, countryCode: c.countryCode, played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [] }));
      return [...stateTable, ...missing].sort((a, b) =>
        b.points - a.points
        || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
        || b.goalsFor - a.goalsFor
        || a.club.localeCompare(b.club),
      );
    }
    const dbMap = new Map(dbTable.map((r) => [r.club, r]));
    const allRows = CLUBS
      .filter((c) => c.countryCode === selectedCountry.code)
      .map((c) => dbMap.get(c.name) ?? { club: c.name, countryCode: c.countryCode, played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [] });
    return allRows.sort((a, b) =>
      b.points - a.points
      || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
      || b.goalsFor - a.goalsFor
      || a.club.localeCompare(b.club),
    );
  })();
  const leagueResults = (databaseView?.competitionHistory ?? [])
    .filter((row) =>
      row.competition === 'league'
      && row.source === 'fixtures'
      && row.club_id === row.home_club_id
      && row.season_id === getSeasonId(currentSeason)
      && (!selectedCountry?.code || row.raw?.countryCode === selectedCountry.code || row.country_code === selectedCountry.code),
    )
    .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
    .slice(0, 8);
  const selectedClub = CLUBS.find((club) => club.name === selectedClubName) ?? CLUBS.find((club) => club.name === table[0]?.club);
  const clubProfile = selectedClub ? getClubProfile(selectedClub, state.clubRelations?.[selectedClub.name] ?? 50) : null;
  const selectedClubContext = state.roster?.find((player) => player.club === selectedClub?.name)?.clubSeasonContext ?? null;
  const leagueRep = state.leagueReputation?.[selectedCountry?.code] ?? 0;

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>{viewMode === 'europe' ? 'UEFA' : 'CHAMPIONNATS'}</div>
        <h1 style={S.eh}>{viewMode === 'europe' ? "Coupes d'Europe" : 'Classements'}</h1>
      </div>

      <div style={S.filterPanel}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setViewMode('domestic')}
            style={{
              borderRadius: 8,
              padding: '8px 10px',
              border: `1px solid ${viewMode === 'domestic' ? '#00a676' : 'var(--af-border)'}`,
              background: viewMode === 'domestic' ? 'oklch(28% 0.10 155 / .35)' : 'var(--af-surface)',
              color: viewMode === 'domestic' ? 'var(--af-grass)' : 'var(--af-muted)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui,sans-serif',
              cursor: 'pointer',
            }}
          >
            Championnats
          </button>
          <button
            type="button"
            onClick={() => setViewMode('europe')}
            style={{
              borderRadius: 8,
              padding: '8px 10px',
              border: `1px solid ${viewMode === 'europe' ? '#2f80ed' : 'var(--af-border)'}`,
              background: viewMode === 'europe' ? 'oklch(28% 0.12 245 / .35)' : 'var(--af-surface)',
              color: viewMode === 'europe' ? 'var(--af-cyan)' : 'var(--af-muted)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui,sans-serif',
              cursor: 'pointer',
            }}
          >
            Europe UEFA
          </button>
        </div>

        {viewMode === 'domestic' ? (
          <>
            <label style={S.fieldLabel}>Pays
              <select value={selectedCountry?.code ?? ''} onChange={(event) => setCountryCode(event.target.value)} style={S.textInput}>
                {availableCountries.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.label}</option>)}
              </select>
            </label>
            <div style={S.fixtureMeta}>Réputation locale : {leagueRep}/100 · {getLeagueReputationLabel(leagueRep)}</div>
          </>
        ) : (
          <div style={S.fixtureMeta}>
            Les trois coupes européennes sont triées par votre partie, avec leur phase actuelle et leur progression.
          </div>
        )}
      </div>

      {viewMode === 'domestic' ? (
        <>
          <div style={S.objCard}>
            <div style={S.secTitle}>
              <Trophy size={14} />
              <span>{selectedCountry ? `${selectedCountry.flag} ${selectedCountry.label}` : 'AUCUN CLASSEMENT'}</span>
            </div>
            {table.length ? table.map((row, index) => {
              const isMyClub = (state.roster ?? []).some((p) => p.club === row.club);
              const gd = row.goalsFor - row.goalsAgainst;
              return (
                <button
                  key={row.club}
                  onClick={() => { setSelectedClubName(row.club); onClubDetails?.(row.club); }}
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 8, alignItems: 'center',
                    background: isMyClub ? 'oklch(28% 0.10 155 / .35)' : 'oklch(16% 0.035 258 / .78)',
                    border: '1px solid var(--af-border)',
                    borderLeft: isMyClub ? '3px solid var(--af-grass)' : '1px solid var(--af-border)',
                    borderRadius: 8, padding: '9px 10px', marginBottom: 6, color: 'var(--af-text)',
                    fontFamily: 'system-ui,sans-serif',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--af-muted)', fontWeight: 800, textAlign: 'center' }}>{index + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 900, color: 'var(--af-text)' }}>
                      <ClubCrest club={row.club} size={20} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: '0 1 auto' }}>{row.club}</span>
                      {isMyClub && <span style={{ fontSize: 8, fontWeight: 900, background: '#00a676', color: '#fff', borderRadius: 3, padding: '1px 4px', letterSpacing: '.06em', flexShrink: 0 }}>MOI</span>}
                      <QualifierBadge index={index} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, color: 'var(--af-muted)', fontSize: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{row.win}V {row.draw}N {row.loss}D</span>
                      <span>{gd >= 0 ? '+' : ''}{gd}</span>
                      <FormDots form={row.form ?? []} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--af-text)', lineHeight: 1 }}>{row.points}</div>
                    <div style={{ fontSize: 9, color: 'var(--af-muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2 }}>pts</div>
                  </div>
                </button>
              );
            }) : <div style={S.emptySmall}>Les classements apparaîtront après les premiers matchs.</div>}
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>RESULTATS DU CHAMPIONNAT</div>
            {leagueResults.length ? leagueResults.map((match) => (
              <button
                key={match.id}
                onClick={() => onClubDetails?.(match.club_name)}
                style={S.decisionRow}
              >
                <span>
                  {match.home_club_name} {match.score ?? '-'} {match.away_club_name}
                  <div style={S.fixtureMeta}>S{match.week} · {match.competition_label ?? 'Championnat'}</div>
                </span>
                <strong>{match.result}</strong>
              </button>
            )) : <div style={S.emptySmall}>Aucun résultat de championnat persisté.</div>}
          </div>
          {selectedCountry && <TopStatsBoard countryCode={selectedCountry.code} state={state} />}
          {selectedClub && clubProfile && (
            <div style={S.objCard}>
              <div style={S.secTitle}>FICHE CLUB</div>
              <div style={S.sumRow}><span style={S.sumK}>Club</span><strong>{selectedClub.name}</strong></div>
              {selectedClubContext && (
                <>
                  <div style={S.sumRow}><span style={S.sumK}>Saison</span><strong>{selectedClubContext.position ?? '-'}e/{selectedClubContext.totalClubs ?? '-'} · {selectedClubContext.points ?? 0} pts</strong></div>
                  <div style={S.sumRow}><span style={S.sumK}>Objectif</span><strong>{selectedClubContext.objective ?? 'saison stable'}</strong></div>
                </>
              )}
              <div style={S.sumRow}><span style={S.sumK}>Budget</span><strong>{clubProfile.budget}/100</strong></div>
              <div style={S.sumRow}><span style={S.sumK}>Prestige</span><strong>{clubProfile.prestige}/100</strong></div>
              <div style={S.sumRow}><span style={S.sumK}>Style</span><strong>{clubProfile.style}</strong></div>
              <div style={S.sumRow}><span style={S.sumK}>Pression média</span><strong>{clubProfile.mediaPressure}</strong></div>
              <div style={S.sumRow}><span style={S.sumK}>Relation agence</span><strong>{state.clubRelations?.[selectedClub.name] ?? 50}/100</strong></div>
              <div style={S.emptySmall}>Rivalités : {clubProfile.rivalries.join(', ')}</div>
            </div>
          )}
        </>
      ) : (
        <>
          <EuropeTicker databaseView={databaseView} season={currentSeason} />
          {EURO_COMPETITIONS.map((competition) => (
            <EuropeCompetitionCard
              key={competition}
              state={state}
              databaseView={databaseView}
              competition={competition}
              season={currentSeason}
              seasonWeek={currentSeasonWeek}
              onClubDetails={onClubDetails}
            />
          ))}
        </>
      )}
    </div>
  );
}
