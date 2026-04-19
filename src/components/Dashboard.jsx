import { Activity, Briefcase, CheckCircle, ChevronRight, Circle, Clock, Target, Trophy, UserPlus, Zap } from 'lucide-react';
import React from 'react';
import { getAgencyCapacity } from '../systems/agencySystem';
import { getMarketOfferQueue, getPendingMessageCounts, messageNeedsResponse } from '../systems/dossierSystem';
import { getMarketReachLabel } from '../systems/reputationSystem';
import { getStrategicSuggestions } from '../systems/suggestionSystem';
import { getAgencyGoalProgress } from '../systems/agencyGoalsSystem';
import { MEDIA_RELATION_TEMPLATES } from '../systems/agencyReputationSystem';
import { getRivalLeaderboard } from '../systems/leaderboardSystem';
import { EURO_CUP_LABELS } from '../systems/europeanCupSystem';
import { WC_PHASES, NATIONAL_TEAMS } from '../systems/worldCupSystem';
import { COUNTRIES } from '../data/clubs';
import { formatMoney } from '../utils/format';
import { S } from './styles';

function ObjectivesWidget({ objectives, onNav }) {
  if (!objectives?.length) return null;
  const active = objectives.filter((o) => !o.completed && !o.failed);
  const done = objectives.filter((o) => o.completed).length;

  return (
    <div style={S.objWidget}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={S.objWidgetTitle}>🎯 OBJECTIFS DE SAISON</div>
        <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>{done}/{objectives.length} complétés</span>
      </div>
      {active.map((obj) => {
        const pct = Math.min(100, Math.round((obj.current / obj.target) * 100));
        const color = pct >= 80 ? '#00a676' : pct >= 40 ? '#b45309' : '#64727d';
        return (
          <div key={obj.id} style={{ ...S.objItem, borderBottom: '1px solid #f0f4f7', paddingBottom: 8, marginBottom: 6 }}>
            <Circle size={10} color={color} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...S.objItemLabel, marginBottom: 3 }}>{obj.label}</div>
              <div style={{ ...S.progBar, height: 3, margin: 0 }}>
                <div style={{ ...S.progFill, width: `${pct}%`, background: color, height: 3 }} />
              </div>
            </div>
            <span style={{ ...S.objItemPct, color }}>{obj.current}/{obj.target}</span>
          </div>
        );
      })}
      {done > 0 && objectives.filter((o) => o.completed).map((obj) => (
        <div key={obj.id} style={{ ...S.objItem, opacity: 0.5, borderBottom: 'none', paddingBottom: 0 }}>
          <CheckCircle size={10} color="#00a676" />
          <div style={{ ...S.objItemLabel, textDecoration: 'line-through', color: '#64727d', fontSize: 11 }}>{obj.label}</div>
          <span style={{ fontSize: 10, color: '#00a676', fontFamily: 'system-ui,sans-serif' }}>✓</span>
        </div>
      ))}
    </div>
  );
}

const SummaryRow = ({ label, value, color }) => (
  <div style={S.sumRow}>
    <span style={S.sumK}>{label}</span>
    <span style={{ ...S.sumV, color: color || '#172026' }}>{value}</span>
  </div>
);

function SeasonArc({ currentWeek, totalWeeks }) {
  const pct = Math.min(100, Math.round(((currentWeek - 1) / (totalWeeks - 1)) * 100));
  const segments = [
    { label: 'Pré-saison', start: 1, end: 4, color: '#d97706' },
    { label: 'Saison', start: 5, end: 20, color: '#2563eb' },
    { label: 'Mercato Hiver', start: 21, end: 23, color: '#e83a3a' },
    { label: 'Saison', start: 24, end: 34, color: '#2563eb' },
    { label: 'Fin', start: 35, end: 38, color: '#16a34a' },
  ];
  const svgW = 280;
  const svgH = 36;
  const barY = 18;
  const barH = 6;
  const r = 7;

  return (
    <div style={S.seasonArc}>
      <div style={{ ...S.secTitle, marginBottom: 8 }}>
        <Clock size={13} />
        <span>ARC DE SAISON · S{currentWeek}/{totalWeeks}</span>
      </div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" style={{ display: 'block' }}>
        {/* Background bar */}
        <rect x={r} y={barY - barH / 2} width={svgW - r * 2} height={barH} rx={barH / 2} fill="#e7edf1" />
        {/* Colored segments */}
        {segments.map((seg) => {
          const x1 = r + ((seg.start - 1) / (totalWeeks - 1)) * (svgW - r * 2);
          const x2 = r + ((seg.end - 1) / (totalWeeks - 1)) * (svgW - r * 2);
          return <rect key={seg.label + seg.start} x={x1} y={barY - barH / 2} width={Math.max(0, x2 - x1)} height={barH} fill={seg.color} opacity={0.7} />;
        })}
        {/* Current week dot */}
        <circle cx={r + (pct / 100) * (svgW - r * 2)} cy={barY} r={r} fill="#172026" />
        <text x={r + (pct / 100) * (svgW - r * 2)} y={barY + 1} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={7} fontWeight="900" fontFamily="system-ui,sans-serif">{currentWeek}</text>
        {/* Labels */}
        <text x={r} y={svgH - 2} textAnchor="start" fill="#9aa7b2" fontSize={7} fontFamily="system-ui,sans-serif">Pré-saison</text>
        <text x={svgW / 2} y={svgH - 2} textAnchor="middle" fill="#9aa7b2" fontSize={7} fontFamily="system-ui,sans-serif">Mi-saison</text>
        <text x={svgW - r} y={svgH - 2} textAnchor="end" fill="#9aa7b2" fontSize={7} fontFamily="system-ui,sans-serif">Fin</text>
      </svg>
    </div>
  );
}

// ── Newspaper "Une" component ──────────────────────────────────────────────
const PRESS_ICONS = { transfer: '🔄', scandal: '🔴', performance: '⚽', injury: '🤕', media: '📰', financial: '💰', default: '📋' };

function getHeadlineFromNews(news, history, roster) {
  // Try to find the most impactful recent story
  const recent = (news ?? []).slice(0, 8);
  const transferNews = recent.find((p) => p.type === 'transfer' || p.text?.includes('transfert') || p.text?.includes('signe'));
  const scandaleNews = recent.find((p) => p.type === 'scandal' || p.text?.includes('polémique') || p.text?.includes('scandale'));
  const perfNews = recent.find((p) => p.type === 'performance' || p.text?.includes('but') || p.text?.includes('passes'));
  const headline = transferNews ?? scandaleNews ?? perfNews ?? recent[0];
  if (!headline) {
    // Fallback: best player this roster
    const bestPlayer = [...(roster ?? [])].sort((a, b) => b.rating - a.rating)[0];
    if (bestPlayer) return {
      icon: '⭐',
      title: `${bestPlayer.firstName} ${bestPlayer.lastName} — La priorité de l'agence`,
      sub: `Note ${bestPlayer.rating} · ${bestPlayer.roleLabel ?? bestPlayer.position} · ${bestPlayer.club ?? 'Libre'}`,
      week: null,
      source: 'Agence',
    };
    return null;
  }
  const typeIcon = PRESS_ICONS[headline.type] ?? PRESS_ICONS.default;
  const rawText = headline.text ?? '';
  // Try to extract a punchy headline (first sentence or first 80 chars)
  const title = rawText.split(/[.!?]/)[0].trim().slice(0, 90) || rawText.slice(0, 90);
  const sub = rawText.length > title.length ? rawText.slice(title.length + 1).trim().slice(0, 100) : null;
  return { icon: typeIcon, title: title || 'Semaine agitée', sub, week: headline.week, source: headline.accountName ?? headline.account?.name ?? 'Sources' };
}

function NewspaperFront({ news, history, roster, phase, worldCupState, onNav }) {
  const headline = getHeadlineFromNews(news, history, roster);
  // Secondary briefs — mix of news + financial history
  const briefs = [
    ...(news ?? []).slice(1, 4).map((p) => ({
      icon: PRESS_ICONS[p.type] ?? '📋',
      text: (p.text ?? '').slice(0, 70),
      week: p.week,
    })),
    ...(worldCupState && worldCupState.phase !== 'done' ? [{
      icon: '🌍',
      text: `Coupe du Monde ${worldCupState.year} · ${worldCupState.phase.toUpperCase()} · ${worldCupState.selectedPlayers.length} sélectionnés`,
      week: null,
    }] : []),
    ...((history ?? []).slice(-2).reverse().map((h) => ({
      icon: h.net >= 0 ? '💰' : '📉',
      text: `Bilan S${h.week} · ${h.net >= 0 ? '+' : ''}${Math.abs(h.net).toLocaleString('fr-FR')} €`,
      week: h.week,
    }))),
  ].slice(0, 4);

  if (!headline && !briefs.length) return null;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5eaf0',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 16,
        boxShadow: '0 14px 34px rgba(15,23,32,.07)',
      }}
    >
      {/* Masthead */}
      <div style={{
        background: '#172026',
        color: '#ffffff',
        padding: '8px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', fontFamily: 'system-ui,sans-serif' }}>
          L'AGENT FC
        </span>
        <span style={{ fontSize: 10, color: '#9aa7b2', fontFamily: 'system-ui,sans-serif' }}>
          SEMAINE {phase?.seasonWeek ?? '—'} · SAISON {phase?.season ?? '—'}
        </span>
      </div>

      {/* Main headline */}
      {headline && (
        <button
          onClick={() => onNav('dossiers')}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            padding: '14px 14px 10px',
            borderBottom: briefs.length ? '1px solid #e5eaf0' : 'none',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{headline.icon}</span>
            <div>
              <div style={{
                fontSize: 16,
                fontWeight: 900,
                color: '#172026',
                lineHeight: 1.25,
                marginBottom: 4,
                letterSpacing: '-.01em',
              }}>
                {headline.title}
              </div>
              {headline.sub && (
                <div style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', lineHeight: 1.4 }}>
                  {headline.sub}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '.12em',
                  color: '#9aa7b2',
                  fontFamily: 'system-ui,sans-serif',
                  textTransform: 'uppercase',
                }}>
                  {headline.source}
                </span>
                {headline.week && (
                  <span style={{ fontSize: 9, color: '#c0cbd3', fontFamily: 'system-ui,sans-serif' }}>
                    · S{headline.week}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Secondary briefs */}
      {briefs.map((brief, i) => (
        <button
          key={i}
          onClick={() => onNav('dossiers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            textAlign: 'left',
            background: i % 2 === 0 ? '#f7f9fb' : '#ffffff',
            border: 'none',
            borderTop: '1px solid #f0f4f7',
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 13, flexShrink: 0 }}>{brief.icon}</span>
          <span style={{
            flex: 1,
            fontSize: 11,
            color: '#3f5663',
            fontFamily: 'system-ui,sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {brief.text}
          </span>
          {brief.week && (
            <span style={{ fontSize: 10, color: '#c0cbd3', flexShrink: 0, fontFamily: 'system-ui,sans-serif' }}>
              S{brief.week}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function EuropeanCupWidget({ roster }) {
  const euPlayers = roster.filter((p) => p.europeanCompetition);
  if (!euPlayers.length) return null;

  const byComp = euPlayers.reduce((acc, p) => {
    const comp = p.europeanCompetition;
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(p);
    return acc;
  }, {});

  return (
    <div style={{ ...S.objCard, marginBottom: 16 }}>
      <div style={{ ...S.secTitle, marginBottom: 8 }}>
        <span>🏆</span>
        <span>COUPES EUROPÉENNES</span>
      </div>
      {Object.entries(byComp).map(([comp, players]) => {
        const cup = EURO_CUP_LABELS[comp] ?? { name: comp, short: comp, icon: '⚽', color: '#1a1a6e' };
        return (
          <div key={comp} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: cup.color, letterSpacing: '.1em', fontFamily: 'system-ui,sans-serif', marginBottom: 4 }}>
              {cup.icon} {cup.name}
            </div>
            {players.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f0f4f7' }}>
                <span style={{ fontSize: 11, color: '#172026', fontFamily: 'system-ui,sans-serif' }}>
                  {p.firstName} {p.lastName}
                </span>
                <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>
                  {p.club} · {p.position}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function WorldCupWidget({ worldCupState }) {
  if (!worldCupState || worldCupState.phase === 'done') return null;

  const { year, phase, selectedPlayers } = worldCupState;
  const phaseIdx = WC_PHASES.indexOf(phase);
  const champions = selectedPlayers.filter((p) => p.champion);
  const eliminated = selectedPlayers.filter((p) => p.eliminated);
  const still_in = selectedPlayers.filter((p) => !p.eliminated && !p.champion);
  const topScorer = [...selectedPlayers].sort((a, b) => b.goals - a.goals)[0];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
      borderRadius: 12,
      padding: '14px 14px 12px',
      marginBottom: 16,
      boxShadow: '0 8px 24px rgba(0,0,0,.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>🌍</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'system-ui,sans-serif', letterSpacing: '.05em' }}>
            COUPE DU MONDE {year}
          </div>
          <div style={{ fontSize: 10, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif' }}>
            Phase : <strong style={{ color: '#fff' }}>{phase.toUpperCase()}</strong>
          </div>
        </div>
      </div>

      {/* Progress bar de phases */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
        {WC_PHASES.map((p, i) => (
          <div key={p} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= phaseIdx ? '#f5c842' : 'rgba(255,255,255,.2)' }} />
        ))}
      </div>

      {selectedPlayers.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif', marginBottom: 4 }}>
            MES JOUEURS EN SÉLECTION
          </div>
          {selectedPlayers.slice(0, 5).map((p) => {
            const team = NATIONAL_TEAMS.find((t) => t.code === p.countryCode);
            return (
              <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                <span style={{ fontSize: 13 }}>{team?.flag ?? '🌍'}</span>
                <span style={{ flex: 1, fontSize: 11, color: p.champion ? '#f5c842' : p.eliminated ? '#9aa7b2' : '#fff', fontFamily: 'system-ui,sans-serif', textDecoration: p.eliminated ? 'line-through' : 'none' }}>
                  {p.playerName}
                </span>
                <span style={{ fontSize: 10, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif' }}>
                  {p.goals}⚽ {p.assists}🅰️
                </span>
                {p.champion && <span style={{ fontSize: 11 }}>🏆</span>}
                {p.eliminated && !p.champion && <span style={{ fontSize: 11 }}>❌</span>}
              </div>
            );
          })}
          {selectedPlayers.length > 5 && (
            <div style={{ fontSize: 10, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif', marginTop: 4 }}>
              +{selectedPlayers.length - 5} autres sélectionnés
            </div>
          )}
        </div>
      )}

      {champions.length > 0 && (
        <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(245,200,66,.15)', borderRadius: 6, fontSize: 11, color: '#f5c842', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>
          🏆 CHAMPIONS DU MONDE : {champions.map((p) => p.playerName).join(', ')}
        </div>
      )}
    </div>
  );
}

function RivalLeaderboard({ reputation, week, agencyProfile }) {
  const ranking = getRivalLeaderboard(reputation, week, agencyProfile);
  const playerEntry = ranking.find((r) => r.isPlayer);

  return (
    <div style={{ ...S.objCard, marginBottom: 16 }}>
      <div style={{ ...S.secTitle, marginBottom: 10 }}>
        <Trophy size={13} />
        <span>CLASSEMENT AGENCES</span>
      </div>
      {ranking.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 0',
            borderBottom: '1px solid #f0f4f7',
            background: entry.isPlayer ? '#f0fdf8' : 'transparent',
            borderRadius: entry.isPlayer ? 6 : 0,
            paddingLeft: entry.isPlayer ? 6 : 0,
            paddingRight: entry.isPlayer ? 6 : 0,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 900, color: entry.rank === 1 ? '#d4a017' : '#9aa7b2', width: 16, textAlign: 'center', fontFamily: 'system-ui,sans-serif' }}>
            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
          </span>
          <span style={{ fontSize: 17 }}>{entry.emblem}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: entry.isPlayer ? 900 : 600, color: entry.isPlayer ? '#00a676' : '#172026', fontFamily: 'system-ui,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name} {entry.isPlayer ? '← toi' : ''}
            </div>
            <div style={{ fontSize: 10, color: '#9aa7b2', fontFamily: 'system-ui,sans-serif' }}>{entry.city}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ ...S.progBar, width: 50, margin: 0 }}>
              <div style={{ ...S.progFill, width: `${entry.rep}%`, background: entry.isPlayer ? '#00a676' : entry.color }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: entry.isPlayer ? '#00a676' : '#172026', fontFamily: 'system-ui,sans-serif', width: 24, textAlign: 'right' }}>{entry.rep}</span>
          </div>
        </div>
      ))}
      {playerEntry && playerEntry.rank > 1 && (
        <div style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginTop: 6, textAlign: 'center' }}>
          Tu es à <strong>{playerEntry.rank - 1}</strong> place{playerEntry.rank - 1 > 1 ? 's' : ''} du sommet · Réputation {playerEntry.rep}/100
        </div>
      )}
      {playerEntry && playerEntry.rank === 1 && (
        <div style={{ fontSize: 10, color: '#00a676', fontFamily: 'system-ui,sans-serif', marginTop: 6, textAlign: 'center', fontWeight: 700 }}>
          🏆 Meilleure agence du monde cette semaine !
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ state, phase, onPlay, onNav, onAcceptOffer, onRejectOffer, onClubDetails, onOpenContracts }) {
  const portfolioValue = state.roster.reduce((sum, player) => sum + player.value, 0);
  const weeklyIncome = state.roster.reduce((sum, player) => sum + Math.floor(player.weeklySalary * player.commission), 0);
  const injuredCount = state.roster.filter((player) => player.injured > 0).length;
  const averageMoral = state.roster.length ? Math.round(state.roster.reduce((sum, player) => sum + player.moral, 0) / state.roster.length) : 0;
  const averageTrust = state.roster.length ? Math.round(state.roster.reduce((sum, player) => sum + (player.trust ?? 50), 0) / state.roster.length) : 0;
  const activePromises = (state.promises ?? []).filter((promise) => !promise.resolved && !promise.failed);
  const suggestions = getStrategicSuggestions(state);
  const segments = state.segmentReputation ?? {};
  const pendingCounts = getPendingMessageCounts(state);
  const urgentMessages = (state.messages ?? []).filter(messageNeedsResponse).slice(0, 3);
  const expiringContracts = state.roster.filter((player) => player.contractWeeksLeft <= 12).slice(0, 3);
  const lowTrustPlayers = state.roster.filter((player) => (player.trust ?? 50) < 45 || player.moral < 45).slice(0, 3);
  const marketQueue = getMarketOfferQueue(state).slice(0, 4);
  const competitorThreats = (state.competitorThreats ?? []).slice(0, 2);
  const spotlightNews = (state.news ?? []).slice(0, 3);
  const todayTimeline = [
    {
      label: 'Date',
      value: phase.phase,
      sub: `${phase.month ?? ''} · S${phase.seasonWeek}/38`,
    },
    { label: 'Messages', value: `${pendingCounts.total}`, sub: pendingCounts.total ? 'File active' : 'Rien à lire' },
    { label: 'Offres', value: `${marketQueue.length}`, sub: marketQueue.length ? 'Dossiers à suivre' : 'Aucune offre' },
    { label: 'Promesses', value: `${activePromises.length}`, sub: activePromises.length ? 'Points sensibles' : 'Aucune' },
    { label: 'Réponse attendue', value: `${pendingCounts.awaitingResponse ?? pendingCounts.urgent}`, sub: (pendingCounts.awaitingResponse ?? pendingCounts.urgent) ? 'Dossier chaud' : 'Calme' },
    ...(state.worldCupState && state.worldCupState.phase !== 'done' ? [{
      label: 'CdM',
      value: `${state.worldCupState.phase}`,
      sub: `${state.worldCupState.selectedPlayers.length} sélectionnés`,
    }] : []),
  ];
  const todayActions = [
    urgentMessages.length ? { label: 'Répondre', sub: `${urgentMessages.length} message`, action: () => onNav('messages') } : null,
    marketQueue.length ? { label: 'Gérer offres', sub: `${marketQueue.length} dossier mercato`, action: () => onNav('dossiers') } : null,
    { label: 'Jouer semaine', sub: phase.phase, action: onPlay },
  ].filter(Boolean).slice(0, 3);

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>TABLEAU DE BORD</div>
        <h1 style={S.eh}>Aujourd'hui</h1>
      </div>
      <div style={S.quickActs}>
        {todayActions.map((action) => (
          <button key={action.label} onClick={action.action} style={S.quickCard}>
            <Zap size={20} color="#00a676" />
            <div style={S.qLabel}>{action.label}</div>
            <div style={S.qSub}>{action.sub}</div>
          </button>
        ))}
      </div>
      <SeasonArc currentWeek={phase.seasonWeek ?? 1} totalWeeks={38} />
      <ObjectivesWidget objectives={state.seasonObjectives} onNav={onNav} />
      <div style={S.todayCard}>
        <div style={S.todayTitle}>AUJOURD'HUI</div>
        {todayTimeline.map((item, index) => (
          <div key={item.label} style={index === todayTimeline.length - 1 ? S.todayRowLast : S.todayRow}>
            <span>{item.label}</span>
            <div style={{ textAlign: 'right' }}>
              <strong>{item.value}</strong>
              <div style={S.qSub}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={S.kpiGrid}>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Portefeuille</div>
          <div style={S.kpiValue}>{formatMoney(portfolioValue)}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Cashflow semaine</div>
          <div style={{ ...S.kpiValue, color: weeklyIncome >= 0 ? '#00a676' : '#b42318' }}>{formatMoney(weeklyIncome)}</div>
        </div>
      </div>
      <div style={S.segmentGrid}>
        {Object.entries({ sportif: 'Sportif', business: 'Business', media: 'Média', ethique: 'Éthique' }).map(([key, label]) => (
          <div key={key} style={S.segmentCard}>
            <div style={S.segmentHead}>
              <span>{label}</span>
              <strong>{segments[key] ?? state.reputation}</strong>
            </div>
            <div style={S.progBar}>
              <div style={{ ...S.progFill, width: `${segments[key] ?? state.reputation}%`, background: key === 'media' ? '#2f80ed' : key === 'business' ? '#172026' : key === 'ethique' ? '#00a676' : '#3f5663' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={S.sumCard}>
        <SummaryRow label="Blessés" value={injuredCount} />
        <SummaryRow label="Moral moyen" value={`${averageMoral}/100`} color={averageMoral >= 60 ? '#00a676' : averageMoral >= 40 ? '#8a6f1f' : '#b42318'} />
        <SummaryRow label="Confiance moyenne" value={`${averageTrust}/100`} color={averageTrust >= 60 ? '#00a676' : averageTrust >= 40 ? '#8a6f1f' : '#b42318'} />
        <SummaryRow label="Gemmes" value={`${state.gems ?? 0}`} color={(state.gems ?? 0) > 0 ? '#00a676' : '#64727d'} />
        <SummaryRow label="Crédibilité" value={`${state.credibility ?? 50}/100`} color={(state.credibility ?? 50) >= 60 ? '#00a676' : (state.credibility ?? 50) >= 40 ? '#8a6f1f' : '#b42318'} />
        <SummaryRow label="Portée marché" value={getMarketReachLabel(state.reputation)} />
        <SummaryRow label="Capacité agence" value={`${state.roster.length}/${getAgencyCapacity(state.agencyLevel)}`} />
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>REPUTATION TERRITOIRES</div>
        {COUNTRIES.slice(0, 5).map((country) => (
          <div key={country.code} style={S.promiseRow}>
            <span>{country.flag} {country.label}</span>
            <strong>{state.countryReputation?.[country.code] ?? state.leagueReputation?.[country.code] ?? 0}/100</strong>
          </div>
        ))}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>MEDIAS & PROFILS</div>
        {MEDIA_RELATION_TEMPLATES.slice(0, 3).map((media) => (
          <div key={media.id} style={S.promiseRow}>
            <span>{media.name}</span>
            <strong>{state.mediaRelations?.[media.id] ?? media.stance}/100</strong>
          </div>
        ))}
        {Object.entries(state.playerSegmentReputation ?? {}).map(([key, value]) => (
          <div key={key} style={S.promiseRow}>
            <span>Joueurs {key}</span>
            <strong>{value}/100</strong>
          </div>
        ))}
      </div>
      <WorldCupWidget worldCupState={state.worldCupState} />
      <EuropeanCupWidget roster={state.roster} />
      <RivalLeaderboard reputation={state.reputation} week={state.week} agencyProfile={state.agencyProfile} />
      <NewspaperFront news={state.news} history={state.history} roster={state.roster} phase={phase} worldCupState={state.worldCupState} onNav={onNav} />
      <button onClick={onPlay} style={S.primaryBtn}>
        <Zap size={18} />
        <span>JOUER LA SEMAINE</span>
        <ChevronRight size={18} />
      </button>
      {(marketQueue.length > 0 || urgentMessages.length > 0 || expiringContracts.length > 0 || lowTrustPlayers.length > 0 || competitorThreats.length > 0) && (
        <div style={S.decisionCard}>
          <div style={S.secTitle}>CENTRE DE DECISION</div>
          {marketQueue.map((offer) => (
            <div key={offer.id} style={{
              ...S.offerRow,
              background: offer.queueStatus?.key === 'bloquee' ? '#fff7f7' : offer.queueStatus?.key === 'conclue' ? '#f0fdf8' : offer.queueStatus?.key === 'en_cours' ? '#f8fbff' : '#f7f9fb',
              borderColor: offer.queueStatus?.key === 'bloquee' ? '#fca5a5' : offer.queueStatus?.key === 'conclue' ? '#cfeee3' : offer.queueStatus?.key === 'en_cours' ? '#cfe1ff' : '#e5eaf0',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => onClubDetails?.(offer.club)} style={S.linkBtn}>{offer.club}</button>
                  <span style={{
                    ...S.preAccordBadge,
                    background: offer.queueStatus?.key === 'bloquee' ? '#fee2e2' : offer.queueStatus?.key === 'conclue' ? '#dcfce7' : offer.queueStatus?.key === 'en_cours' ? '#dbeafe' : '#fff4d6',
                    color: offer.queueStatus?.tone === 'danger' ? '#b42318' : offer.queueStatus?.tone === 'good' ? '#246555' : offer.queueStatus?.tone === 'warn' ? '#1d4ed8' : '#8a6f1f',
                  }}>
                    {offer.queueStatus?.label ?? 'Nouvelle'}
                  </span>
                </div>
                <div style={S.offerMeta}>
                  {offer.playerName} · {formatMoney(offer.price)} · {offer.preWindow ? `arrivée S${offer.effectiveWeek}` : `expire S${offer.expiresWeek}`}
                </div>
                <div style={S.qSub}>{offer.queueStatus?.detail ?? (offer.queueStatus?.key === 'bloquee' ? 'Bloqué par le dossier en cours' : 'Dossier actif')}</div>
              </div>
              <div style={S.offerActions}>
                {offer.queueStatus?.key !== 'conclue' ? (
                  <button onClick={() => onAcceptOffer(offer.id)} style={S.miniPrimary}>Négocier</button>
                ) : (
                  <button onClick={() => onClubDetails?.(offer.club)} style={S.miniGhost}>Voir</button>
                )}
                {offer.queueStatus?.key !== 'conclue' && <button onClick={() => onRejectOffer(offer.id)} style={S.miniGhost}>Refuser</button>}
              </div>
            </div>
          ))}
          {urgentMessages.map((message) => (
            <button key={message.id} onClick={() => onNav('messages')} style={{ ...S.decisionRow, background: '#fff7f7', borderColor: '#fecaca' }}>
              <span>Réponse attendue · {message.playerName}</span>
              <strong>Ouvrir</strong>
            </button>
          ))}
          {competitorThreats.map((threat) => (
            <button key={threat.id} onClick={() => onNav('messages')} style={S.decisionRow}>
              <span>Agent concurrent · {threat.playerName}</span>
              <strong>{threat.agentName}</strong>
            </button>
          ))}
          {expiringContracts.map((player) => (
            <button key={player.id} onClick={() => onNav('roster')} style={S.decisionRow}>
              <span>Contrat court · {player.firstName} {player.lastName}</span>
              <strong>{player.contractWeeksLeft}s</strong>
            </button>
          ))}
          {lowTrustPlayers.map((player) => (
            <button key={player.id} onClick={() => onNav('roster')} style={S.decisionRow}>
              <span>Relation fragile · {player.firstName} {player.lastName}</span>
              <strong>{player.trust ?? 50}</strong>
            </button>
          ))}
        </div>
      )}
      {/* NEWS RAPIDES section removed — replaced by NewspaperFront above */}
      <div style={S.objCard}>
        <div style={S.secTitle}>
          <Target size={14} />
          <span>OBJECTIFS SAISON {phase.season}</span>
        </div>
        {state.objectives.map((objective) => {
          let progress = 0;
          if (objective.type === 'money') progress = state.stats.totalEarned;
          else if (objective.type === 'rep') progress = state.reputation;
          else progress = state.stats.transfersDone;
          const percent = Math.min(100, Math.round((progress / objective.target) * 100));

          return (
            <div key={objective.id} style={S.objRow}>
              <div style={S.objLabel}>{objective.label}</div>
              <div style={S.progBar}>
                <div style={{ ...S.progFill, width: `${percent}%` }} />
              </div>
              <div style={S.objReward}>+{formatMoney(objective.reward)}</div>
            </div>
          );
        })}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>
          <Target size={14} />
          <span>OBJECTIFS LONG TERME</span>
        </div>
        {(state.agencyGoals ?? []).map((goal) => {
          const progress = getAgencyGoalProgress(goal, state);
          const percent = Math.min(100, Math.round((progress / goal.target) * 100));
          return (
            <div key={goal.id} style={S.objRow}>
              <div style={S.objLabel}>{goal.label}</div>
              <div style={S.progBar}><div style={{ ...S.progFill, width: `${percent}%` }} /></div>
              <div style={S.objReward}>{progress}/{goal.target}</div>
            </div>
          );
        })}
      </div>
      <div style={S.quickActs}>
        <button onClick={() => onNav('market')} style={S.quickCard}>
          <UserPlus size={20} color="#00a676" />
          <div style={S.qLabel}>Recruter</div>
          <div style={S.qSub}>Marché transferts</div>
        </button>
        <button onClick={() => onNav('office')} style={S.quickCard}>
          <Briefcase size={20} color="#172026" />
          <div style={S.qLabel}>Agence</div>
          <div style={S.qSub}>Scouts · avocat · média</div>
        </button>
      </div>
      {activePromises.length > 0 && (
        <div style={S.promiseCard}>
          <div style={S.secTitle}>
            <Target size={14} />
            <span>PROMESSES ACTIVES</span>
          </div>
          {activePromises.slice(0, 4).map((promise) => (
            <div key={promise.id} style={S.promiseRow}>
              <span>{promise.playerName} · {promise.label}</span>
              <strong>S{promise.dueWeek}</strong>
            </div>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div style={S.suggestionCard}>
          <div style={S.secTitle}>
            <Activity size={14} />
            <span>CONSEILS STRATEGIQUES</span>
          </div>
          {suggestions.map((suggestion) => (
            <div key={suggestion} style={S.suggestionRow}>{suggestion}</div>
          ))}
        </div>
      )}
      {state.history.length > 0 && (
        <div style={S.histCard}>
          <div style={S.secTitle}>
            <Activity size={14} />
            <span>BILANS</span>
          </div>
          {state.history.slice(-5).reverse().map((historyItem) => (
            <div key={`${historyItem.week}-${historyItem.net}`} style={S.histRow}>
              <span style={S.histWeek}>S{historyItem.week}</span>
              <span style={{ ...S.histNet, color: historyItem.net >= 0 ? '#00a676' : '#b42318' }}>
                {historyItem.net >= 0 ? '+' : ''}
                {formatMoney(historyItem.net)}
              </span>
              <span style={S.histRep}>Rép. {historyItem.rep}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
