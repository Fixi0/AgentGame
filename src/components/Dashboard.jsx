import { Activity, ArrowRight, Briefcase, CalendarDays, CheckCircle, ChevronRight, Circle, Clock, Heart, MessageCircle, Play, Target, Trophy, UserPlus, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { getAgencyCapacity } from '../systems/agencySystem';
import { getActiveDossierPlayerIds, getMarketOfferQueue, getPendingMessageCounts, messageNeedsResponse } from '../systems/dossierSystem';
import { getMarketReachLabel, normalizeAgencyReputation } from '../systems/reputationSystem';
import { getStrategicSuggestions } from '../systems/suggestionSystem';
import { getAgencyGoalProgress } from '../systems/agencyGoalsSystem';
import { MEDIA_RELATION_TEMPLATES } from '../systems/agencyReputationSystem';
import { getRivalLeaderboard } from '../systems/leaderboardSystem';
import { EURO_CUP_LABELS, getEuropeanCompetition } from '../systems/europeanCupSystem';
import { WC_PHASES, NATIONAL_TEAMS } from '../systems/worldCupSystem';
import { COUNTRIES } from '../data/clubs';
import { formatMoney } from '../utils/format';
import { S } from './styles';

// ── Agency Health Score ────────────────────────────────────────────────────
function computeHealthScore({ roster, reputation, money, messages, promises }) {
  if (!roster.length) return { score: 0, label: 'Aucun joueur', color: '#64727d', emoji: '⚪' };
  const normalizedRep = Math.min(100, Math.round(reputation / 10));
  const avgMoral = Math.round(roster.reduce((s, p) => s + p.moral, 0) / roster.length);
  const avgTrust = Math.round(roster.reduce((s, p) => s + (p.trust ?? 50), 0) / roster.length);
  const moneyHealth = money > 50000 ? 100 : money > 10000 ? 70 : money > 0 ? 40 : 0;
  const pendingMessages = (messages ?? []).filter((m) => !m.resolved).length;
  const messagesPenalty = Math.min(25, pendingMessages * 4);
  const brokenPromises = (promises ?? []).filter((pr) => pr.failed).length;
  const promisePenalty = Math.min(20, brokenPromises * 5);
  const score = Math.round((normalizedRep * 0.25 + avgMoral * 0.25 + avgTrust * 0.25 + moneyHealth * 0.25) - messagesPenalty - promisePenalty);
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 75) return { score: clamped, label: 'Excellente forme', color: '#00a676', emoji: '💚' };
  if (clamped >= 55) return { score: clamped, label: 'Bonne gestion', color: '#16a34a', emoji: '🟢' };
  if (clamped >= 35) return { score: clamped, label: 'Quelques tensions', color: '#b45309', emoji: '🟡' };
  return { score: clamped, label: 'Situation critique', color: '#b42318', emoji: '🔴' };
}

function AgencyHealthScore({ state }) {
  const { score, label, color, emoji } = computeHealthScore(state);
  return (
    <div style={S.healthScore}>
      <div>
        <div style={{ ...S.healthScoreNum, color }}>{score}</div>
        <div style={{ fontSize: 9, color: '#c0cbd3', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>/100</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={S.healthScoreLabel}>SANTÉ DE L'AGENCE</div>
        <div style={S.healthScoreDesc}>{emoji} {label}</div>
        <div style={{ ...S.progBar, marginTop: 6, height: 5 }}>
          <div style={{ ...S.progFill, width: `${score}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ── Priority Widget (what to do right now) ─────────────────────────────────
function PriorityWidget({ urgentMessages, marketQueue, expiringContracts, onNav, onPlay, phase }) {
  const actions = [];
  if (urgentMessages.length) {
    actions.push({
      emoji: '💬',
      label: `${urgentMessages.length} message${urgentMessages.length > 1 ? 's' : ''} en attente`,
      sub: urgentMessages[0]?.playerName ? `${urgentMessages[0].playerName} attend ta réponse` : 'Un joueur attend ta réponse',
      urgent: true,
      action: () => onNav('messages'),
    });
  }
  if (marketQueue.length) {
    actions.push({
      emoji: '🔄',
      label: `${marketQueue.length} offre${marketQueue.length > 1 ? 's' : ''} de transfert`,
      sub: marketQueue[0]?.playerName ? `${marketQueue[0].playerName} — ${marketQueue[0].club}` : 'Dossier mercato ouvert',
      urgent: false,
      action: () => onNav('dossiers'),
    });
  }
  if (expiringContracts.length) {
    actions.push({
      emoji: '📋',
      label: `Contrat court — ${expiringContracts[0].firstName} ${expiringContracts[0].lastName}`,
      sub: `${expiringContracts[0].contractWeeksLeft} sem. restantes · à renouveler`,
      urgent: false,
      action: () => onNav('contracts'),
    });
  }

  const topActions = actions.slice(0, 2);

  return (
    <div style={S.priorityWidget}>
      <div style={S.priorityWidgetTitle}>⚡ PRIORITÉ DE LA SEMAINE</div>
      {topActions.length === 0 ? (
        <div style={S.priorityAllGood}>✅ Tout est à jour — prêt à jouer la semaine</div>
      ) : (
        topActions.map((action, i) => (
          <button
            key={i}
            onClick={action.action}
            style={action.urgent ? S.priorityActionUrgent : S.priorityAction}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{action.emoji}</span>
                <span>{action.label}</span>
              </div>
              <div style={S.priorityActionSub}>{action.sub}</div>
            </div>
            <ArrowRight size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
          </button>
        ))
      )}
    </div>
  );
}

// ── Beginner Tutorial Guide (first 5 weeks) ────────────────────────────────
function BeginnerGuide({ state, phase, onNav, onPlay }) {
  const weekNum = phase.seasonWeek ?? 1;
  const hasPlayers = state.roster.length > 0;
  const hasResponded = (state.messages ?? []).some((m) => m.resolved);
  const hasMoney = (state.history ?? []).some((h) => h.net > 0);
  if (weekNum > 5) return null; // Only show for first 5 weeks

  const steps = [
    {
      num: '1',
      title: 'Recrute un joueur',
      desc: 'Va dans "Joueurs" → Marché pour recruter ton premier client.',
      done: hasPlayers,
      action: () => onNav('market'),
      cta: 'Voir le marché',
    },
    {
      num: '2',
      title: 'Joue ta première semaine',
      desc: 'Appuie sur "JOUER LA SEMAINE" pour simuler les matchs et gagner de la réputation.',
      done: (state.history ?? []).length > 0,
      action: onPlay,
      cta: 'Jouer maintenant',
    },
    {
      num: '3',
      title: 'Réponds aux messages',
      desc: 'Tes joueurs t\'écrivent. Réponds pour améliorer leur confiance.',
      done: hasResponded,
      action: () => onNav('messages'),
      cta: 'Voir les messages',
    },
  ];

  const allDone = steps.every((s) => s.done);
  if (allDone) return null;

  return (
    <div style={{ ...S.objCard, border: '1px solid #cfeee3', background: '#f0fdf8', marginBottom: 16 }}>
      <div style={{ ...S.secTitle, color: '#00a676' }}>
        <span>🎓</span>
        <span>GUIDE DÉBUTANT</span>
      </div>
      <div style={S.tutorialWrap}>
        {steps.map((step) => (
          <div key={step.num} style={S.tutorialStepRow}>
            <div style={step.done ? S.tutorialStepNumDone : S.tutorialStepNum}>
              {step.done ? '✓' : step.num}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...S.tutorialStepTitle, color: step.done ? '#64727d' : '#172026', textDecoration: step.done ? 'line-through' : 'none' }}>
                {step.title}
              </div>
              {!step.done && (
                <>
                  <div style={S.tutorialStepDesc}>{step.desc}</div>
                  <button
                    onClick={step.action}
                    style={{ ...S.miniPrimary, marginTop: 8, padding: '8px 12px', fontSize: 10 }}
                  >
                    {step.cta} →
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function SeasonRoadmap({ phase, roster, worldCupState, onNav }) {
  const currentSeason = phase?.season ?? Math.floor(((phase?.seasonWeek ?? 1) - 1) / 38) + 1;
  const euroPlayers = roster
    .map((player) => ({ player, competition: getEuropeanCompetition(player, currentSeason) }))
    .filter((entry) => entry.competition);
  const competitions = ['CL', 'EL', 'ECL']
    .map((key) => {
      const cup = EURO_CUP_LABELS[key];
      const players = euroPlayers.filter((entry) => entry.competition === key).map((entry) => entry.player);
      return { key, cup, players };
    })
    .filter((item) => item.players.length > 0);
  const isWorldCupActive = Boolean(worldCupState && worldCupState.phase !== 'done');
  const remainingWeeks = Math.max(0, 38 - (phase.seasonWeek ?? 1));

  const rows = [
    {
      label: 'Championnat',
      value: phase.mercato && phase.window === 'été' ? 'Pause' : 'En cours',
      sub: phase.mercato && phase.window === 'été'
        ? 'Pas de matchs de club pendant le mercato été'
        : isWorldCupActive
          ? 'Suspendu pendant la CdM'
          : 'Tous les clubs jouent leur saison',
      tone: phase.mercato && phase.window === 'été' ? 'warn' : 'good',
    },
    {
      label: 'Europe',
      value: competitions.length ? `${competitions.reduce((sum, item) => sum + item.players.length, 0)} joueurs` : 'Aucun',
      sub: competitions.length
        ? competitions.map((item) => `${item.cup.short} ${item.players.length}`).join(' · ')
        : 'Aucun de tes joueurs en coupe européenne',
      tone: competitions.length ? 'info' : 'neutral',
    },
    {
      label: 'Coupe du monde',
      value: isWorldCupActive ? worldCupState.phase : 'Hors tournoi',
      sub: isWorldCupActive
        ? `${worldCupState.selectedPlayers?.length ?? 0} sélectionnés`
        : 'La sélection nationale ne prend pas toute la saison',
      tone: isWorldCupActive ? 'warn' : 'neutral',
    },
    {
      label: 'Mercato',
      value: phase.mercato ? (phase.deadlineDay ? 'Deadline' : 'Ouvert') : 'À venir',
      sub: phase.mercato
        ? `Fenêtre ${phase.window ?? 'à confirmer'}`
        : phase.seasonWeek <= 18
          ? 'Pré-accords possibles'
          : phase.seasonWeek <= 37
            ? 'Préparation du prochain marché'
            : 'Repos avant reprise',
      tone: phase.mercato ? 'warn' : 'info',
    },
  ];

  return (
    <div style={S.objCard}>
      <div style={S.secTitle}>
        <CalendarDays size={14} />
        <span>DÉROULÉ DE SAISON</span>
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        {rows.map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: 8,
              padding: '10px 12px',
              background:
                item.tone === 'warn' ? '#fffbeb'
                  : item.tone === 'good' ? '#f0fdf8'
                    : item.tone === 'info' ? '#eff6ff'
                      : '#f7f9fb',
              border: `1px solid ${
                item.tone === 'warn' ? '#fde68a'
                  : item.tone === 'good' ? '#cfeee3'
                    : item.tone === 'info' ? '#dbeafe'
                      : '#e5eaf0'
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <strong style={{ fontSize: 12, color: '#172026' }}>{item.label}</strong>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: item.tone === 'warn' ? '#8a6f1f' : item.tone === 'good' ? '#246555' : item.tone === 'info' ? '#1d4ed8' : '#64727d' }}>
                {item.value}
              </span>
            </div>
            <div style={{ marginTop: 3, fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', lineHeight: 1.4 }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ ...S.promiseRow, background: '#f7f9fb', borderRadius: 8, padding: '8px 10px' }}>
          <span>Championnat</span>
          <strong>{phase.mercato && phase.window === 'été' ? 'Pause été' : 'Tous les clubs engagés'}</strong>
        </div>
        <div style={{ ...S.promiseRow, background: '#f7f9fb', borderRadius: 8, padding: '8px 10px' }}>
          <span>Europe</span>
          <strong>{competitions.length ? competitions.map((item) => item.cup.short).join(' · ') : 'Aucun club qualifié'}</strong>
        </div>
        <div style={{ ...S.promiseRow, background: '#f7f9fb', borderRadius: 8, padding: '8px 10px' }}>
          <span>CdM</span>
          <strong>{isWorldCupActive ? 'Joueurs sélectionnés' : 'Pas en cours'}</strong>
        </div>
        <div style={{ ...S.promiseRow, background: '#f7f9fb', borderRadius: 8, padding: '8px 10px' }}>
          <span>Mercato / repos</span>
          <strong>{phase.mercato ? 'Fenêtre ouverte' : `${remainingWeeks} sem. avant la fin de saison`}</strong>
        </div>
        {onNav && (
          <button onClick={() => onNav('standings')} style={{ ...S.secBtn, marginBottom: 0, marginTop: 4 }}>
            Voir le classement UEFA
          </button>
        )}
      </div>
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
  ].slice(0, 2);

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

function EuropeanCupWidget({ roster, currentSeason = 1 }) {
  const euPlayers = roster
    .map((player) => ({ player, competition: getEuropeanCompetition(player, currentSeason) }))
    .filter((entry) => entry.competition)
    .map((entry) => ({ ...entry.player, europeanCompetition: entry.competition }));
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
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: cup.color, letterSpacing: '.1em', fontFamily: 'system-ui,sans-serif' }}>
                {cup.icon} {cup.name}
              </div>
              <div style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {players.length} joueur{players.length > 1 ? 's' : ''}
              </div>
            </div>
            {players.map((p) => (
              <div key={p.id} style={{ padding: '5px 0', borderBottom: '1px solid #f0f4f7' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#172026', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>
                    {p.firstName} {p.lastName}
                  </span>
                  <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>
                    {p.club} · {p.position}
                  </span>
                </div>
                {p.selectionNote && (
                  <div style={{ marginTop: 2, fontSize: 9, color: '#8b949e', fontFamily: 'system-ui,sans-serif' }}>
                    {p.selectionNote}{p.starterChance ? ` · titulaire ${Math.round(p.starterChance * 100)}%` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function WorldCupWidget({ worldCupState }) {
  if (!worldCupState) return null;

  const { year, phase, selectedPlayers, heritageCards = [], countryPressure = {}, drawGroups = {} } = worldCupState;
  if (phase === 'done' && !heritageCards.length) return null;
  const phaseIdx = WC_PHASES.indexOf(phase);
  const safePlayers = selectedPlayers.filter(Boolean);
  const champions = safePlayers.filter((p) => p.champion);
  const eliminated = safePlayers.filter((p) => p.eliminated);
  const still_in = safePlayers.filter((p) => !p.eliminated && !p.champion);
  const topScorer = [...safePlayers].sort((a, b) => (Number(b?.goals ?? 0) - Number(a?.goals ?? 0)))[0];

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

      {phase !== 'done' && (
        <>
          {/* Progress bar de phases */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
            {WC_PHASES.map((p, i) => (
              <div key={p} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= phaseIdx ? '#f5c842' : 'rgba(255,255,255,.2)' }} />
            ))}
          </div>

          {!!Object.keys(drawGroups).length && (
            <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)' }}>
              <div style={{ fontSize: 10, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif', marginBottom: 4, letterSpacing: '.08em' }}>
                TIRAGE ET GROUPES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(drawGroups).slice(0, 4).map(([group, players]) => (
                  <span key={group} style={{ fontSize: 10, color: '#fff', background: 'rgba(255,255,255,.12)', borderRadius: 999, padding: '4px 8px', fontFamily: 'system-ui,sans-serif' }}>
                    Groupe {group} · {players.length}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: p.champion ? '#f5c842' : p.eliminated ? '#9aa7b2' : '#fff', fontFamily: 'system-ui,sans-serif', textDecoration: p.eliminated ? 'line-through' : 'none' }}>
                    {p.playerName}
                  </div>
                  {p.selectionNote && (
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,.68)', fontFamily: 'system-ui,sans-serif' }}>
                      {p.selectionNote}{p.starterChance ? ` · titulaire ${Math.round(p.starterChance * 100)}%` : ''}
                    </div>
                  )}
                </div>
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

      {phase !== 'done' && Object.keys(countryPressure).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif', marginBottom: 4 }}>
            PRESSION MÉDIA PAR PAYS
          </div>
          {Object.entries(countryPressure).slice(0, 4).map(([code, value]) => {
            const team = NATIONAL_TEAMS.find((t) => t.code === code);
            return (
              <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 12 }}>{team?.flag ?? '🌍'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: '#fff', fontFamily: 'system-ui,sans-serif' }}>{team?.name ?? code}</span>
                    <span style={{ fontSize: 10, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif' }}>{value}/100</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.15)' }}>
                    <div style={{ width: `${value}%`, height: 4, borderRadius: 999, background: value >= 70 ? '#f5c842' : '#a0c4d8' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {champions.length > 0 && (
        <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(245,200,66,.15)', borderRadius: 6, fontSize: 11, color: '#f5c842', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>
          🏆 CHAMPIONS DU MONDE : {champions.map((p) => p.playerName).join(', ')}
        </div>
      )}

      {phase === 'done' && heritageCards.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.15)' }}>
          <div style={{ fontSize: 10, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif', marginBottom: 5 }}>CARTE HÉRITAGE</div>
          {heritageCards.slice(0, 3).map((card) => (
            <div key={card.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', color: '#fff', fontSize: 11, fontFamily: 'system-ui,sans-serif' }}>
              <span>{card.countryFlag} {card.playerName}</span>
              <span>{card.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorldCupSpotlight({ worldCupState }) {
  if (!worldCupState || worldCupState.phase === 'done') return null;

  const phaseLabels = {
    groupes: 'Phase de groupes',
    huitièmes: 'Huitièmes de finale',
    quarts: 'Quarts de finale',
    demies: 'Demi-finales',
    finale: 'Finale',
  };
  const isFinalStage = worldCupState.phase !== 'groupes';
  const selected = [...(worldCupState.selectedPlayers ?? [])].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const nextMatch = worldCupState.nextFeaturedMatch;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1d4f7a 55%, #203a43 100%)',
      borderRadius: 12,
      padding: '14px 14px 12px',
      marginBottom: 12,
      boxShadow: '0 14px 32px rgba(15,23,32,.22)',
      color: '#ffffff',
      border: '1px solid rgba(125,211,252,.18)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7dd3fc', fontFamily: 'system-ui,sans-serif', fontWeight: 900 }}>
            🌍 Coupe du monde
          </div>
          <div style={{ fontSize: 18, fontWeight: 950, marginTop: 3 }}>
            Match à venir
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.78)', fontFamily: 'system-ui,sans-serif', marginTop: 2 }}>
            {phaseLabels[worldCupState.phase] ?? `Phase ${worldCupState.phase}`}
          </div>
        </div>
        <div style={{
          padding: '8px 10px',
          borderRadius: 10,
          background: 'rgba(255,255,255,.10)',
          border: '1px solid rgba(255,255,255,.12)',
          textAlign: 'right',
          minWidth: 104,
        }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#a0c4d8', fontFamily: 'system-ui,sans-serif', fontWeight: 850 }}>
            Priorité
          </div>
          <div style={{ fontSize: 14, fontWeight: 950, color: '#ffffff' }}>
            Très élevée
          </div>
        </div>
      </div>

      <div style={{
        marginBottom: 10,
        padding: '10px 12px',
        borderRadius: 10,
        background: isFinalStage ? 'rgba(245,200,66,.12)' : 'rgba(255,255,255,.08)',
        border: '1px solid rgba(255,255,255,.12)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: isFinalStage ? '#f5c842' : '#7dd3fc', letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'system-ui,sans-serif', marginBottom: 4 }}>
          Prochain rendez-vous
        </div>
        {nextMatch ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 950, color: '#ffffff', lineHeight: 1.3 }}>
                {nextMatch.countryFlag} {nextMatch.countryName} vs {nextMatch.opponentFlag} {nextMatch.opponent}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.72)', fontFamily: 'system-ui,sans-serif', marginTop: 3 }}>
                {nextMatch.label} · {nextMatch.playerName}
              </div>
            </div>
            <div style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(255,255,255,.12)',
              border: '1px solid rgba(255,255,255,.12)',
              fontSize: 10,
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              fontFamily: 'system-ui,sans-serif',
            }}>
              Match à venir
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', lineHeight: 1.3 }}>
            La CdM bloque toute la semaine. Pas de championnat, pas d’Europe. Le dossier est entièrement sur la sélection.
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif', marginBottom: 6, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 850 }}>
            Joueurs en vitrine
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {selected.map((p) => (
              <div key={p.playerId} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.10)',
                borderRadius: 8,
                padding: '8px 10px',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#ffffff', fontFamily: 'system-ui,sans-serif' }}>
                    {p.countryFlag ?? '🌍'} {p.playerName}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.72)', fontFamily: 'system-ui,sans-serif' }}>
                    {p.rating}/100 · {p.goals ?? 0}⚽ {p.assists ?? 0}🅰️
                  </div>
                </div>
                <div style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: p.eliminated ? '#fca5a5' : p.champion ? '#f5c842' : '#7dd3fc',
                  fontFamily: 'system-ui,sans-serif',
                }}>
                  {p.champion ? 'Champion' : p.eliminated ? 'Sorti' : 'En jeu'}
                </div>
              </div>
            ))}
          </div>
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
              <div style={{ ...S.progFill, width: `${Math.min(100, Math.round(entry.rep / 10))}%`, background: entry.isPlayer ? '#00a676' : entry.color }} />
              </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: entry.isPlayer ? '#00a676' : '#172026', fontFamily: 'system-ui,sans-serif', width: 36, textAlign: 'right' }}>{entry.rep}</span>
          </div>
        </div>
      ))}
      {playerEntry && playerEntry.rank > 1 && (
        <div style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginTop: 6, textAlign: 'center' }}>
          Tu es à <strong>{playerEntry.rank - 1}</strong> place{playerEntry.rank - 1 > 1 ? 's' : ''} du sommet · Réputation {playerEntry.rep}/1000
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
  const [showSecondaryOverview, setShowSecondaryOverview] = useState(false);
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
  const activeDossierIds = getActiveDossierPlayerIds(state);
  const expiringContracts = state.roster.filter((player) => player.contractWeeksLeft <= 12 && !activeDossierIds.has(player.id)).slice(0, 3);
  const marketQueue = getMarketOfferQueue(state)
    .filter((offer) => offer.status === 'open')
    .slice(0, 4);
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
  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>TABLEAU DE BORD</div>
        <h1 style={S.eh}>Aujourd'hui</h1>
      </div>

      {/* Big Play Button */}
      <button onClick={onPlay} style={S.playBtn}>
        <Play size={22} fill="#ffffff" />
        <div style={{ textAlign: 'left' }}>
          <div>CONTINUER</div>
          <div style={S.playBtnSub}>
            S{phase.season} · {phase.phase} · Semaine {phase.seasonWeek}/38 · {state.roster.length} joueur{state.roster.length > 1 ? 's' : ''}
          </div>
        </div>
      </button>

      <div style={S.homeHint}>
        Lis vite ce qui est chaud, clique sur un dossier, puis lance la semaine. Le reste reste caché dans les sous-menus.
      </div>

      <WorldCupSpotlight worldCupState={state.worldCupState} />
      <SeasonRoadmap phase={phase} roster={state.roster} worldCupState={state.worldCupState} onNav={onNav} />

      {/* Beginner Guide — visible only for first 5 weeks */}
      <BeginnerGuide state={state} phase={phase} onNav={onNav} onPlay={onPlay} />

      {/* Priority Widget */}
      <PriorityWidget
        urgentMessages={urgentMessages}
        marketQueue={marketQueue}
        expiringContracts={expiringContracts}
        onNav={onNav}
        onPlay={onPlay}
        phase={phase}
      />

      <button
        type="button"
        onClick={() => setShowSecondaryOverview((value) => !value)}
        style={S.collapseToggle}
      >
        <span>{showSecondaryOverview ? 'Masquer les infos secondaires' : 'Afficher les infos secondaires'}</span>
        <span>{showSecondaryOverview ? '−' : '+'}</span>
      </button>

      {showSecondaryOverview && (
        <>
          <AgencyHealthScore state={state} />
          <SeasonArc currentWeek={phase.seasonWeek ?? 1} totalWeeks={38} />
          <ObjectivesWidget objectives={state.seasonObjectives} onNav={onNav} />
        </>
      )}

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
      {showSecondaryOverview && (
        <div style={S.objCard}>
          <div style={S.secTitle}>FOCUS DU JOUR</div>
          {[
            { label: 'Crédibilité', value: `${state.credibility ?? 50}/100` },
            { label: 'Portée marché', value: getMarketReachLabel(state.reputation) },
            { label: 'Capacité', value: `${state.roster.length}/${getAgencyCapacity(state.agencyLevel)}` },
            { label: 'Confiance moyenne', value: `${averageTrust}/100` },
          ].map((item) => (
            <div key={item.label} style={S.promiseRow}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}
      <NewspaperFront news={state.news} history={state.history} roster={state.roster} phase={phase} worldCupState={state.worldCupState} onNav={onNav} />
      {(marketQueue.length > 0 || urgentMessages.length > 0 || expiringContracts.length > 0) && (
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
        </div>
      )}
    </div>
  );
}
