import React, { useState, useMemo } from 'react';
import { S } from './styles';
import { EURO_CUP_LABELS, getEuropeanCompetition } from '../systems/europeanCupSystem';
import { getEuropeanTopStats } from '../systems/topScorersSystem';

// ── Helpers ────────────────────────────────────────────────────────────────

const STAGE_LABELS = {
  playoff: 'Barrages',
  roundOf16: '1/8 de finale',
  quarters: 'Quart de finale',
  semis: 'Demi-finale',
  final: '⭐ FINALE',
};

const STAGE_ORDER = ['playoff', 'roundOf16', 'quarters', 'semis', 'final'];

const resultColor = (r) => r === 'win' ? '#00a676' : r === 'loss' ? '#ef4444' : '#f59e0b';
const resultLabel = (r) => r === 'win' ? 'V' : r === 'loss' ? 'D' : 'N';

const fmt = (v) => v ?? '?';

const getSeasonFromWeek = (week = 1) => Math.floor(((week - 1) / 38)) + 1;

const buildEuropeanDataFromDb = (databaseView = null) => {
  const rows = databaseView?.europeanCompetitions ?? [];
  return rows.reduce((acc, row) => ({
    ...acc,
    [row.competition_key]: {
      competition: row.competition,
      season: Number(String(row.season_id ?? '').replace('season_', '')) || null,
      opponentHistory: row.opponent_history ?? {},
      koPath: row.ko_path ?? {},
      bracketClubs: row.bracket_clubs ?? null,
      bracketState: row.bracket_state ?? row.raw?.bracketState ?? null,
      winner: row.winner ?? row.raw?.winner ?? row.raw?.champion ?? null,
    },
  }), {});
};

// ── Sub-components ─────────────────────────────────────────────────────────

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: '.18em', color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', fontWeight: 850, marginBottom: 10, textTransform: 'uppercase' }}>
    {children}
  </div>
);

function GlobalRoundLog({ compData, cupLabel }) {
  const rounds = compData?.bracketState?.rounds ?? {};
  const latestRounds = Object.values(rounds)
    .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
    .slice(0, 3);
  if (!latestRounds.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <SectionTitle>Parcours complet</SectionTitle>
      {compData.winner && (
        <div style={{ background: 'oklch(28% 0.08 70 / .22)', border: '1px solid var(--af-border)', borderRadius: 8, padding: 10, marginBottom: 8, color: '#92400e', fontSize: 12, fontWeight: 850, fontFamily: 'system-ui,sans-serif' }}>
          🏆 Vainqueur: {compData.winner}
        </div>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {latestRounds.map((round) => (
          <div key={`${round.stage}:${round.week}`} style={{ background: 'oklch(18% 0.035 258 / .92)', border: `1px solid ${cupLabel.color}24`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: '.14em', color: cupLabel.color, fontWeight: 900, fontFamily: 'system-ui,sans-serif', marginBottom: 8 }}>
              {STAGE_LABELS[round.stage] ?? round.stage} · S{round.week}
            </div>
            {(round.matches ?? []).slice(0, 8).map((match) => (
              <div key={`${match.home}-${match.away}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', borderBottom: '1px solid #f0f4f7', fontSize: 12, color: 'var(--af-text)', fontFamily: 'system-ui,sans-serif' }}>
                <span>{match.home} - {match.away}</span>
                <strong>{match.score}{match.aggregate ? ` agg. ${match.aggregate}` : ''}</strong>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ligne de journée de phase de ligue */
const LeagueDayRow = ({ matchday, opponent, opponentCountry, score, result, last }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: last ? 'none' : '1px solid #f0f4f7' }}>
    <span style={{ fontSize: 9, fontWeight: 800, color: '#8fa0b0', fontFamily: 'system-ui,sans-serif', minWidth: 14, textAlign: 'center' }}>J{matchday}</span>
    <span style={{ fontSize: 13 }}>{opponentCountry ?? '🌍'}</span>
    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--af-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opponent ?? '—'}</span>
    {score && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--af-text)', fontFamily: 'system-ui,sans-serif' }}>{score}</span>}
    {result && (
      <span style={{ fontSize: 10, fontWeight: 900, color: resultColor(result), background: resultColor(result) + '18', borderRadius: 4, padding: '2px 6px', fontFamily: 'system-ui,sans-serif' }}>
        {resultLabel(result)}
      </span>
    )}
  </div>
);

/** Carte KO d'un tour éliminatoire */
const KORoundCard = ({ stage, koData }) => {
  if (!koData) return null;
  const { opponent, opponentCountry, score, result } = koData;
  return (
    <div style={{ background: 'oklch(18% 0.035 258 / .92)', border: '1px solid var(--af-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, boxShadow: '0 4px 12px rgba(15,23,32,.06)' }}>
      <div style={{ fontSize: 9, letterSpacing: '.15em', color: '#8fa0b0', fontFamily: 'system-ui,sans-serif', fontWeight: 800, marginBottom: 4 }}>
        {STAGE_LABELS[stage] ?? stage}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{opponentCountry ?? '🌍'}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--af-text)' }}>{opponent ?? '—'}</span>
        {score && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--af-text)', fontFamily: 'system-ui,sans-serif' }}>{score}</span>}
        {result && (
          <span style={{ fontSize: 11, fontWeight: 900, color: resultColor(result), background: resultColor(result) + '18', borderRadius: 6, padding: '3px 8px', fontFamily: 'system-ui,sans-serif' }}>
            {resultLabel(result)}
          </span>
        )}
      </div>
    </div>
  );
};

/** Affiche le bracket visuel pour une compétition */
const BracketView = ({ compData, cupLabel }) => {
  const bracketClubs = compData?.bracketClubs;
  if (!bracketClubs || bracketClubs.length < 2) return null;

  // On affiche 8 affiches (16 clubs → 8 duels)
  const matches = [];
  for (let i = 0; i < Math.min(bracketClubs.length, 16); i += 2) {
    const a = bracketClubs[i];
    const b = bracketClubs[i + 1];
    if (a && b) matches.push({ a, b });
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(matches.length, 4)}, minmax(130px, 1fr))`, gap: 8, minWidth: matches.length > 4 ? 560 : 'auto' }}>
        {matches.map(({ a, b }, i) => (
          <div key={i} style={{ background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 8, overflow: 'hidden' }}>
            <ClubMatchCell club={a} cupColor={cupLabel.color} />
            <div style={{ height: 1, background: 'var(--af-border)' }} />
            <ClubMatchCell club={b} cupColor={cupLabel.color} />
          </div>
        ))}
      </div>
    </div>
  );
};

const ClubMatchCell = ({ club, cupColor }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: club.isAgent ? cupColor + '12' : 'transparent' }}>
    <span style={{ fontSize: 12 }}>{club.country}</span>
    <span style={{ fontSize: 12, fontWeight: club.isAgent ? 800 : 600, color: club.isAgent ? cupColor : '#3a4a56', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {club.name}
    </span>
    {club.isAgent && <span style={{ fontSize: 8, fontWeight: 900, color: cupColor, background: cupColor + '20', borderRadius: 4, padding: '1px 4px', fontFamily: 'system-ui,sans-serif' }}>MON CLUB</span>}
  </div>
);

/** Buteurs & passeurs européens — synthétiques pour tous les clubs engagés. */
const TopScorers = ({ state, competition, cupColor }) => {
  const [tab, setTab] = useState('scorers');
  const stats = useMemo(() => getEuropeanTopStats(competition, state), [competition, state]);
  const list = tab === 'scorers' ? stats.scorers : stats.assisters;
  const accent = tab === 'scorers' ? '#f59e0b' : '#2f80ed';

  if (!list.length) return null;

  return (
    <div>
      <SectionTitle>Classement européen — {stats.competitionLabel}</SectionTitle>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
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
              fontFamily: 'system-ui,sans-serif',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ background: 'oklch(18% 0.035 258 / .92)', border: '1px solid var(--af-border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,32,.06)' }}>
        {list.map((player, idx) => {
          const value = tab === 'scorers' ? player.goals : player.assists;
          const sub = tab === 'scorers'
            ? `${player.assists} pd · ${player.appearances} m`
            : `${player.goals} buts · ${player.appearances} m`;
          return (
            <div key={`${player.id}_${idx}`} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderBottom: idx < list.length - 1 ? '1px solid oklch(28% 0.04 258 / .35)' : 'none',
              background: player.isMine ? 'oklch(28% 0.10 155 / .35)' : 'transparent',
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: idx === 0 ? '#f59e0b' : 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', minWidth: 16, textAlign: 'center' }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--af-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.firstName} {player.lastName}
                  {player.isMine && <span style={{ marginLeft: 6, fontSize: 8, fontWeight: 900, background: '#00a676', color: '#fff', borderRadius: 3, padding: '1px 4px', letterSpacing: '.06em' }}>MOI</span>}
                </div>
                <div style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>{player.club} · {player.position} · {sub}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 950, color: accent, lineHeight: 1, fontFamily: 'system-ui,sans-serif' }}>{value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Vue principale par club ────────────────────────────────────────────────

const ClubEuroView = ({ clubName, compData, competition, cupLabel }) => {
  const opponentList = compData?.opponentHistory?.[clubName] ?? [];
  const koPath = compData?.koPath?.[clubName] ?? {};
  const stagesPlayed = STAGE_ORDER.filter((s) => koPath[s]);

  return (
    <div>
      {/* Phase de ligue */}
      {opponentList.length > 0 && (
        <div style={{ background: 'oklch(18% 0.035 258 / .92)', border: '1px solid var(--af-border)', borderRadius: 8, padding: '14px 16px', marginBottom: 12, boxShadow: '0 4px 12px rgba(15,23,32,.06)' }}>
          <SectionTitle>Phase de ligue — {opponentList.length}/8 journées</SectionTitle>
          {opponentList.map((opp, i) => {
            // Retrouver le score via le matchHistory en koPath s'il existe
            return (
              <LeagueDayRow
                key={i}
                matchday={i + 1}
                opponent={opp}
                opponentCountry={null}
                score={null}
                result={null}
                last={i === opponentList.length - 1}
              />
            );
          })}
        </div>
      )}

      {/* KO path */}
      {stagesPlayed.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionTitle>Parcours KO</SectionTitle>
          {stagesPlayed.map((stage) => (
            <KORoundCard key={stage} stage={stage} koData={koPath[stage]} />
          ))}
        </div>
      )}

      {opponentList.length === 0 && stagesPlayed.length === 0 && (
        <div style={{ background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 8, padding: 16, textAlign: 'center', color: '#8fa0b0', fontSize: 13 }}>
          Les matchs européens n'ont pas encore commencé pour ce club.
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

export default function EuropeanBracket({ state, databaseView = null }) {
  const roster = state?.roster ?? [];
  const europeanCupData = useMemo(() => {
    const dbData = buildEuropeanDataFromDb(databaseView);
    return Object.keys(dbData).length ? dbData : state?.europeanCupData ?? {};
  }, [databaseView, state?.europeanCupData]);
  const dbMatchResults = databaseView?.matchResults ?? [];

  // TOUJOURS afficher les 3 coupes — l'utilisateur peut consulter les 3 brackets
  // même sans joueur engagé. Les clubs de l'agent sont surlignés.
  const ALL_COMPS = ['CL', 'EL', 'ECL'];
  const activeComps = useMemo(() => {
    const season = getSeasonFromWeek(state?.week ?? 1);
    const agentClubsByComp = {};
    for (const p of roster) {
      const comp = p.europeanCompetition;
      if (!comp) continue;
      if (!agentClubsByComp[comp]) agentClubsByComp[comp] = new Set();
      agentClubsByComp[comp].add(p.club);
    }
    return ALL_COMPS.map((comp) => ({
      comp,
      clubs: [...(agentClubsByComp[comp] ?? [])],
      cupLabel: EURO_CUP_LABELS[comp] ?? { name: comp, short: comp, color: '#00a676', icon: '🏆' },
      compKey: `${comp}:${season}`,
      compData: europeanCupData[`${comp}:${season}`] ?? null,
    }));
  }, [roster, europeanCupData, state?.week]);

  const [activeComp, setActiveComp] = useState(() => activeComps[0]?.comp ?? 'CL');

  const currentCompEntry = activeComps.find((e) => e.comp === activeComp) ?? activeComps[0];
  const season = getSeasonFromWeek(state?.week ?? 1);

  return (
    <div style={S.vp}>
      {/* Header */}
      <div style={S.et}>
        <div style={S.el}>SAISON {season} · COUPES EUROPÉENNES</div>
        <h1 style={S.eh}>Bracket</h1>
      </div>

      {/* Tabs par compétition */}
      {activeComps.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
          {activeComps.map(({ comp, cupLabel }) => (
            <button
              key={comp}
              onClick={() => setActiveComp(comp)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                border: activeComp === comp ? `2px solid ${cupLabel.color}` : '1px solid var(--af-border)',
                background: activeComp === comp ? cupLabel.color + '18' : 'var(--af-surface)',
                color: activeComp === comp ? cupLabel.color : 'var(--af-muted)',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'system-ui,sans-serif',
              }}
            >
              {cupLabel.icon} {cupLabel.short}
            </button>
          ))}
        </div>
      )}

      {currentCompEntry && (
        <div key={currentCompEntry.comp}>
          {/* Entête compétition */}
          <div style={{ background: currentCompEntry.cupLabel.color + '14', border: `1px solid ${currentCompEntry.cupLabel.color}30`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{currentCompEntry.cupLabel.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: currentCompEntry.cupLabel.color }}>{currentCompEntry.cupLabel.name}</div>
              <div style={{ fontSize: 11, color: 'var(--af-muted)' }}>
                {currentCompEntry.clubs.length
                  ? `${currentCompEntry.clubs.length} club${currentCompEntry.clubs.length > 1 ? 's' : ''} suivi${currentCompEntry.clubs.length > 1 ? 's' : ''}`
                  : 'Aucun de tes joueurs n\u2019y est engagé — tu suis la compétition en spectateur'}
              </div>
            </div>
          </div>

          {/* Bracket global (R16) si disponible */}
          {currentCompEntry.compData?.bracketClubs && (
            <div style={{ marginBottom: 16 }}>
              <SectionTitle>Bracket — 1/8 de finale</SectionTitle>
              <BracketView compData={currentCompEntry.compData} cupLabel={currentCompEntry.cupLabel} />
            </div>
          )}

          <GlobalRoundLog compData={currentCompEntry.compData} cupLabel={currentCompEntry.cupLabel} />

          {/* Vue par club */}
          {currentCompEntry.clubs.map((clubName) => (
            <div key={clubName} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--af-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: currentCompEntry.cupLabel.color, display: 'inline-block' }} />
                {clubName}
              </div>
              <ClubEuroView
                clubName={clubName}
                compData={currentCompEntry.compData}
                competition={currentCompEntry.comp}
                cupLabel={currentCompEntry.cupLabel}
              />
            </div>
          ))}

          {/* Top Scorers */}
          <TopScorers state={state} competition={currentCompEntry.comp} cupColor={currentCompEntry.cupLabel.color} />
        </div>
      )}
    </div>
  );
}
