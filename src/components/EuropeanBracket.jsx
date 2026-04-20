import React, { useState, useMemo } from 'react';
import { S } from './styles';
import { EURO_CUP_LABELS, getEuropeanCompetition } from '../systems/europeanCupSystem';

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
  <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 850, marginBottom: 10, textTransform: 'uppercase' }}>
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
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, marginBottom: 8, color: '#92400e', fontSize: 12, fontWeight: 850, fontFamily: 'system-ui,sans-serif' }}>
          🏆 Vainqueur: {compData.winner}
        </div>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {latestRounds.map((round) => (
          <div key={`${round.stage}:${round.week}`} style={{ background: '#ffffff', border: `1px solid ${cupLabel.color}24`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: '.14em', color: cupLabel.color, fontWeight: 900, fontFamily: 'system-ui,sans-serif', marginBottom: 8 }}>
              {STAGE_LABELS[round.stage] ?? round.stage} · S{round.week}
            </div>
            {(round.matches ?? []).slice(0, 8).map((match) => (
              <div key={`${match.home}-${match.away}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', borderBottom: '1px solid #f0f4f7', fontSize: 12, color: '#172026', fontFamily: 'system-ui,sans-serif' }}>
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
    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#172026', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opponent ?? '—'}</span>
    {score && <span style={{ fontSize: 12, fontWeight: 700, color: '#172026', fontFamily: 'system-ui,sans-serif' }}>{score}</span>}
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
    <div style={{ background: '#ffffff', border: '1px solid #e5eaf0', borderRadius: 8, padding: '10px 14px', marginBottom: 8, boxShadow: '0 4px 12px rgba(15,23,32,.06)' }}>
      <div style={{ fontSize: 9, letterSpacing: '.15em', color: '#8fa0b0', fontFamily: 'system-ui,sans-serif', fontWeight: 800, marginBottom: 4 }}>
        {STAGE_LABELS[stage] ?? stage}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{opponentCountry ?? '🌍'}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#172026' }}>{opponent ?? '—'}</span>
        {score && <span style={{ fontSize: 13, fontWeight: 700, color: '#172026', fontFamily: 'system-ui,sans-serif' }}>{score}</span>}
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
          <div key={i} style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, overflow: 'hidden' }}>
            <ClubMatchCell club={a} cupColor={cupLabel.color} />
            <div style={{ height: 1, background: '#e5eaf0' }} />
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

/** Stats buteurs européens des joueurs de l'agent */
const TopScorers = ({ roster, competition, matchResults = [] }) => {
  const scorers = useMemo(() => {
    if (matchResults.length) {
      const playersById = Object.fromEntries((roster ?? []).map((player) => [player.id, player]));
      const totals = matchResults
        .filter((match) => match.competition === competition && (match.minutes ?? 0) > 0)
        .reduce((acc, match) => {
          const key = match.player_id;
          if (!key) return acc;
          const player = playersById[key];
          const nameParts = String(match.player_name ?? '').trim().split(/\s+/).filter(Boolean);
          const current = acc[key] ?? {
            id: key,
            firstName: player?.firstName ?? nameParts[0] ?? 'Joueur',
            lastName: player?.lastName ?? nameParts.slice(1).join(' '),
            club: match.club_name ?? player?.club ?? 'Club',
            goals: 0,
            apps: 0,
          };
          acc[key] = {
            ...current,
            goals: current.goals + (match.goals ?? 0),
            apps: current.apps + 1,
          };
          return acc;
        }, {});
      return Object.values(totals)
        .filter((item) => item.apps > 0)
        .sort((a, b) => b.goals - a.goals || b.apps - a.apps)
        .slice(0, 5)
        .map((item) => ({ player: item, goals: item.goals, apps: item.apps }));
    }
    const list = (roster ?? [])
      .filter((p) => p.europeanCompetition === competition)
      .map((p) => {
        const euroGoals = (p.matchHistory ?? [])
          .filter((m) => m.competition === competition)
          .reduce((sum, m) => sum + (m.goals ?? 0), 0);
        const euroApps = (p.matchHistory ?? []).filter((m) => m.competition === competition).length;
        return { player: p, goals: euroGoals, apps: euroApps };
      })
      .filter((s) => s.apps > 0)
      .sort((a, b) => b.goals - a.goals || b.apps - a.apps);
    return list.slice(0, 5);
  }, [roster, competition, matchResults]);

  if (!scorers.length) return null;

  return (
    <div>
      <SectionTitle>Buteurs européens</SectionTitle>
      <div style={{ background: '#ffffff', border: '1px solid #e5eaf0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,32,.06)' }}>
        {scorers.map(({ player, goals, apps }, idx) => (
          <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: idx < scorers.length - 1 ? '1px solid #f0f4f7' : 'none' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: idx === 0 ? '#f59e0b' : '#8fa0b0', fontFamily: 'system-ui,sans-serif', minWidth: 16, textAlign: 'center' }}>
              {idx + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#172026' }}>{player.firstName} {player.lastName}</div>
              <div style={{ fontSize: 11, color: '#64727d' }}>{player.club} · {apps} matchs</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#00a676', fontFamily: 'system-ui,sans-serif' }}>{goals}</span>
              <span style={{ fontSize: 10, color: '#64727d' }}>buts</span>
            </div>
          </div>
        ))}
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
        <div style={{ background: '#ffffff', border: '1px solid #e5eaf0', borderRadius: 8, padding: '14px 16px', marginBottom: 12, boxShadow: '0 4px 12px rgba(15,23,32,.06)' }}>
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
        <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: 16, textAlign: 'center', color: '#8fa0b0', fontSize: 13 }}>
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

  // Collecter les compétitions actives (clubs de l'agent)
  const activeComps = useMemo(() => {
    const season = getSeasonFromWeek(state?.week ?? 1);
    const compMap = {}; // comp → Set<clubName>
    for (const p of roster) {
      const comp = p.europeanCompetition;
      if (!comp) continue;
      if (!compMap[comp]) compMap[comp] = new Set();
      compMap[comp].add(p.club);
    }
    return Object.entries(compMap).map(([comp, clubs]) => ({
      comp,
      clubs: [...clubs],
      cupLabel: EURO_CUP_LABELS[comp] ?? { name: comp, short: comp, color: '#00a676', icon: '🏆' },
      compKey: `${comp}:${season}`,
      compData: europeanCupData[`${comp}:${season}`] ?? null,
    }));
  }, [roster, europeanCupData, state?.week]);

  const [activeComp, setActiveComp] = useState(() => activeComps[0]?.comp ?? null);

  const currentCompEntry = activeComps.find((e) => e.comp === activeComp) ?? activeComps[0];
  const season = getSeasonFromWeek(state?.week ?? 1);

  if (!activeComps.length) {
    return (
      <div style={S.vp}>
        <div style={S.et}>
          <div style={S.el}>COUPES EUROPÉENNES</div>
          <h1 style={S.eh}>Bracket</h1>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e5eaf0', borderRadius: 8, padding: 20, textAlign: 'center', color: '#8fa0b0' }}>
          Aucun joueur dans ton effectif ne participe à une compétition européenne cette saison.
        </div>
      </div>
    );
  }

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
                border: activeComp === comp ? `2px solid ${cupLabel.color}` : '1px solid #e5eaf0',
                background: activeComp === comp ? cupLabel.color + '18' : '#ffffff',
                color: activeComp === comp ? cupLabel.color : '#64727d',
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
              <div style={{ fontSize: 11, color: '#64727d' }}>{currentCompEntry.clubs.length} club{currentCompEntry.clubs.length > 1 ? 's' : ''} suivi{currentCompEntry.clubs.length > 1 ? 's' : ''}</div>
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
              <div style={{ fontSize: 13, fontWeight: 800, color: '#172026', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
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
          <TopScorers roster={roster} competition={currentCompEntry.comp} matchResults={dbMatchResults} />
        </div>
      )}
    </div>
  );
}
