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
import { S } from './styles';

const EURO_COMPETITIONS = ['CL', 'EL', 'ECL'];
const EURO_STAGE_TRACKER = [
  { key: 'league', label: 'Phase de ligue', hint: 'Classement général' },
  { key: 'playoff', label: 'Barrages', hint: 'Entrée en élimination' },
  { key: 'roundOf16', label: 'Huitièmes', hint: 'Aller / retour' },
  { key: 'quarters', label: 'Quarts', hint: 'Aller / retour' },
  { key: 'semis', label: 'Demies', hint: 'Aller / retour' },
  { key: 'final', label: 'Finale', hint: 'Match unique' },
];

const getSeasonFromWeek = (week = 1) => Math.floor(((week - 1) / 38)) + 1;
const getSeasonWeekFromWeek = (week = 1) => ((week - 1) % 38) + 1;

const parseScore = (score = '0-0') => {
  const [homeRaw = '0', awayRaw = '0'] = String(score).split('-');
  const home = Number(homeRaw);
  const away = Number(awayRaw);
  return {
    home: Number.isFinite(home) ? home : 0,
    away: Number.isFinite(away) ? away : 0,
  };
};

const buildEuropeRows = (state, competition, season) => {
  const roster = state.roster ?? [];
  const rows = CLUBS
    .filter((club) => getClubEuropeanCompetition(club, season) === competition)
    .map((club) => {
      const history = state.clubSeasonHistory?.[club.name] ?? null;
      const matches = (history?.europe ?? [])
        .filter((entry) => entry.competition === competition)
        .map((entry) => ({ ...entry }));
      const stats = matches.reduce((acc, match) => {
        const { home, away } = parseScore(match.score);
        const goalsFor = home;
        const goalsAgainst = away;
        acc.played += 1;
        acc.win += goalsFor > goalsAgainst ? 1 : 0;
        acc.draw += goalsFor === goalsAgainst ? 1 : 0;
        acc.loss += goalsFor < goalsAgainst ? 1 : 0;
        acc.goalsFor += goalsFor;
        acc.goalsAgainst += goalsAgainst;
        acc.points += goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;
        return acc;
      }, { played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
      const rosterCount = roster.filter((player) => player.club === club.name).length;
      const latest = matches[matches.length - 1] ?? null;
      const flag = COUNTRIES.find((c) => c.code === club.countryCode)?.flag ?? '🌍';
      return {
        club,
        flag,
        history,
        matches,
        latest,
        rosterCount,
        ...stats,
      };
    })
    // Affiche TOUS les clubs de la compétition — pas seulement ceux avec des joueurs suivis
    .sort((a, b) =>
      b.points - a.points
      || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
      || b.goalsFor - a.goalsFor
      || a.club.name.localeCompare(b.club.name),
    );

  return rows;
};

function EuropeCompetitionCard({ state, competition, season, seasonWeek, onClubDetails }) {
  const cup = EURO_CUP_LABELS[competition];
  const currentStageKey = getEuropeanStage(seasonWeek, competition);
  const currentStageLabel = getEuropeanPhaseLabel(seasonWeek, competition);
  const stageIndex = EURO_STAGE_TRACKER.findIndex((stage) => stage.key === currentStageKey);
  const rows = buildEuropeRows(state, competition, season);

  const boardBg = competition === 'CL'
    ? 'linear-gradient(135deg, #eef4ff 0%, #f7fbff 100%)'
    : competition === 'EL'
      ? 'linear-gradient(135deg, #fff4e8 0%, #fffaf5 100%)'
      : 'linear-gradient(135deg, #eefaf1 0%, #f8fff9 100%)';
  const borderColor = competition === 'CL' ? '#cfe1ff' : competition === 'EL' ? '#f8d29a' : '#cfeee3';

  return (
    <div style={{ ...S.objCard, marginBottom: 16, background: boardBg, borderColor }}>
      <div style={S.secTitle}>
        <Trophy size={14} />
        <span>{cup.icon} {cup.name}</span>
      </div>
      <div style={{ fontSize: 12, color: '#3f5663', fontFamily: 'system-ui,sans-serif', lineHeight: 1.45, marginBottom: 10 }}>
        Tous les clubs engagés cette saison. Tes clubs sont mis en évidence en vert.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>
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
                border: `1px solid ${active ? cup.color : done ? '#d9e2ea' : '#e7edf1'}`,
                background: active ? cup.color : done ? 'rgba(255,255,255,.72)' : '#f7f9fb',
                color: active ? '#ffffff' : done ? '#172026' : '#64727d',
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

      <div style={{ ...S.promiseRow, background: '#ffffff', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
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
            return (
              <button
                key={row.club.name}
                onClick={() => onClubDetails?.(row.club.name)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: isMyClub ? '#f0fdf8' : '#ffffff',
                  border: `1px solid ${isMyClub ? '#a7f3d0' : '#e5eaf0'}`,
                  borderLeft: `4px solid ${isMyClub ? '#00a676' : cup.color}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  boxShadow: isMyClub ? '0 4px 14px rgba(0,166,118,.12)' : '0 6px 18px rgba(15,23,32,.05)',
                  color: '#172026',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, minWidth: 20, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>{index + 1}.</span>
                      <span>{row.flag} {row.club.name}</span>
                      {isMyClub && (
                        <span style={{ fontSize: 9, fontWeight: 900, background: '#00a676', color: '#fff', borderRadius: 4, padding: '1px 5px', letterSpacing: '.06em', fontFamily: 'system-ui,sans-serif' }}>
                          MON CLUB
                        </span>
                      )}
                    </div>
                    {row.played > 0 && (
                      <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: '#3f5663', fontFamily: 'system-ui,sans-serif', background: '#f0fdf8', border: '1px solid #d1fae5', borderRadius: 4, padding: '1px 5px' }}>V {row.win}</span>
                        <span style={{ fontSize: 10, color: '#3f5663', fontFamily: 'system-ui,sans-serif', background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 4, padding: '1px 5px' }}>N {row.draw}</span>
                        <span style={{ fontSize: 10, color: '#3f5663', fontFamily: 'system-ui,sans-serif', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 4, padding: '1px 5px' }}>D {row.loss}</span>
                        <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 4, padding: '1px 5px' }}>
                          {goalDiff >= 0 ? `+${goalDiff}` : goalDiff}
                        </span>
                        {row.latest && (
                          <span style={{ fontSize: 10, color: '#3f5663', fontFamily: 'system-ui,sans-serif' }}>
                            {latestStage} · {row.latest.score} vs {row.latest.opponent ?? '?'}
                          </span>
                        )}
                      </div>
                    )}
                    {row.played === 0 && (
                      <div style={{ fontSize: 10, color: '#9aa7b2', fontFamily: 'system-ui,sans-serif', marginTop: 3 }}>
                        Aucun match joué pour le moment
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 950, color: row.played > 0 ? cup.color : '#c4cdd6', lineHeight: 1 }}>{row.points}</div>
                    <div style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 1 }}>MJ {row.played}</div>
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

export default function Standings({ state, onClubDetails }) {
  const availableCountries = useMemo(() => COUNTRIES.filter((country) => CLUBS.some((club) => club.countryCode === country.code)), []);
  const [viewMode, setViewMode] = useState('domestic');
  const [countryCode, setCountryCode] = useState(availableCountries[0]?.code ?? 'FR');
  const [selectedClubName, setSelectedClubName] = useState(null);
  const currentSeason = getSeasonFromWeek(state.week ?? 1);
  const currentSeasonWeek = getSeasonWeekFromWeek(state.week ?? 1);
  const selectedCountry = availableCountries.find((country) => country.code === countryCode) ?? availableCountries[0];
  const table = selectedCountry ? getSortedTable(state.leagueTables, selectedCountry.code) : [];
  const selectedClub = CLUBS.find((club) => club.name === selectedClubName) ?? CLUBS.find((club) => club.name === table[0]?.club);
  const clubProfile = selectedClub ? getClubProfile(selectedClub, state.clubRelations?.[selectedClub.name] ?? 50) : null;
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
              border: `1px solid ${viewMode === 'domestic' ? '#00a676' : '#d6dde3'}`,
              background: viewMode === 'domestic' ? '#f0fdf8' : '#ffffff',
              color: viewMode === 'domestic' ? '#246555' : '#64727d',
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
              border: `1px solid ${viewMode === 'europe' ? '#2f80ed' : '#d6dde3'}`,
              background: viewMode === 'europe' ? '#eff6ff' : '#ffffff',
              color: viewMode === 'europe' ? '#1d4ed8' : '#64727d',
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
            {table.length ? table.map((row, index) => (
              <button key={row.club} onClick={() => { setSelectedClubName(row.club); onClubDetails?.(row.club); }} style={{ ...S.tableRow, width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <strong>{index + 1}. {row.club}</strong>
                <span>{row.points} pts</span>
                <span>{row.win}/{row.draw}/{row.loss}</span>
                <span>{row.goalsFor - row.goalsAgainst >= 0 ? `+${row.goalsFor - row.goalsAgainst}` : row.goalsFor - row.goalsAgainst}</span>
                <span>{index < 4 ? 'C1' : index < 6 ? 'C2' : (row.form ?? []).join('')}</span>
              </button>
            )) : <div style={S.emptySmall}>Les classements apparaîtront après les premiers matchs.</div>}
          </div>
          {selectedClub && clubProfile && (
            <div style={S.objCard}>
              <div style={S.secTitle}>FICHE CLUB</div>
              <div style={S.sumRow}><span style={S.sumK}>Club</span><strong>{selectedClub.name}</strong></div>
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
          {EURO_COMPETITIONS.map((competition) => (
            <EuropeCompetitionCard
              key={competition}
              state={state}
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
