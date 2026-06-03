import React from 'react';
import { Activity, AlertTriangle, CalendarDays, Shield, Shuffle, Users } from 'lucide-react';
import { MATCH_STATUS, calendarMatchToFixture } from '../systems/matchCalendarSystem';
import { getWeekDailySnapshots } from '../systems/seasonSystem';
import { getClubDisplayName } from '../data/clubs';
import { S } from './styles';

const countBy = (items = [], picker) => items.reduce((map, item) => {
  const key = picker(item) ?? 'inconnu';
  map[key] = (map[key] ?? 0) + 1;
  return map;
}, {});

const dayName = (week, day) => {
  const snap = getWeekDailySnapshots(week)?.[Math.max(0, Math.min(6, Number(day ?? 1) - 1))];
  return snap ? `${snap.weekdayLabel} ${snap.dateLabel}` : `jour ${day}`;
};

function DebugBlock({ icon: Icon, title, children }) {
  return (
    <section style={S.histCard}>
      <div style={S.secTitle}><Icon size={14} /><span>{title}</span></div>
      {children}
    </section>
  );
}

function Kpi({ label, value, tone = 'var(--af-text)' }) {
  return (
    <div style={{ background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 8, padding: 10 }}>
      <div style={{ color: 'var(--af-muted)', fontSize: 9, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: tone, fontSize: 18, fontWeight: 950, marginTop: 3 }}>{value}</div>
    </div>
  );
}

export default function SeasonDebug({ state }) {
  const calendar = Array.isArray(state.matchCalendar) ? state.matchCalendar : [];
  const played = calendar.filter((match) => match.status === MATCH_STATUS.PLAYED);
  const scheduled = calendar.filter((match) => match.status === MATCH_STATUS.SCHEDULED);
  const selfMatches = calendar.filter((match) => match.homeClub?.name && match.homeClub.name === match.awayClub?.name);
  const injured = (state.roster ?? []).filter((player) => (player.injured ?? 0) > 0);
  const transfers = [
    ...(state.pendingTransfers ?? []).map((item) => ({ ...item, debugType: 'pending' })),
    ...(state.decisionHistory ?? []).filter((item) => String(item.type ?? '').includes('transfer')).slice(0, 12).map((item) => ({ ...item, debugType: 'history' })),
  ];
  const byCompetition = countBy(calendar, (match) => match.competitionLabel ?? match.competition ?? 'Championnat');
  const byWeek = countBy(calendar, (match) => `S${match.week}`);
  const latestPlayed = played.slice().sort((a, b) => (b.week - a.week) || (b.day - a.day)).slice(0, 10);

  return (
    <div className="af-page" style={{ display: 'grid', gap: 14 }}>
      <div>
        <div className="af-kicker">DEBUG CACHÉ</div>
        <h1 className="af-title">Debug saison</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--af-muted)', fontSize: 12, lineHeight: 1.45 }}>
          Page de contrôle interne: calendrier, résultats, blessures, transferts et anomalies moteur.
        </p>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <Kpi label="Semaine" value={`S${state.week} J${state.day ?? 1}/7`} />
        <Kpi label="Calendrier" value={calendar.length} />
        <Kpi label="Simulés" value={played.length} tone="var(--af-grass)" />
        <Kpi label="À venir" value={scheduled.length} tone="var(--af-gold)" />
        <Kpi label="Blessés" value={injured.length} tone={injured.length ? '#f87171' : 'var(--af-muted)'} />
        <Kpi label="Anomalies" value={selfMatches.length} tone={selfMatches.length ? '#f87171' : 'var(--af-grass)'} />
      </section>

      <DebugBlock icon={AlertTriangle} title="Anomalies calendrier">
        {selfMatches.length ? selfMatches.map((match) => (
          <div key={match.id} style={{ ...S.fixtureRow, borderLeft: '3px solid #f87171' }}>
            Auto-match détecté: {getClubDisplayName(match.homeClub?.name)} · S{match.week} · {dayName(match.week, match.day)}
          </div>
        )) : <div style={S.emptySmall}>Aucune anomalie auto-match détectée.</div>}
      </DebugBlock>

      <DebugBlock icon={CalendarDays} title="Répartition compétitions">
        {Object.entries(byCompetition).map(([label, count]) => (
          <div key={label} style={S.histRow}><span>{label}</span><strong>{count}</strong></div>
        ))}
      </DebugBlock>

      <DebugBlock icon={Activity} title="Derniers résultats persistés">
        {latestPlayed.length ? latestPlayed.map((match) => {
          const fixture = calendarMatchToFixture(match);
          return (
            <div key={match.id} style={S.fixtureRow}>
              <strong>{getClubDisplayName(fixture.homeClub?.name)} {fixture.homeGoals}-{fixture.awayGoals} {getClubDisplayName(fixture.awayClub?.name)}</strong>
              <div style={S.fixtureMeta}>{dayName(match.week, match.day)} · {match.competitionLabel ?? match.competition}</div>
            </div>
          );
        }) : <div style={S.emptySmall}>Aucun résultat simulé.</div>}
      </DebugBlock>

      <DebugBlock icon={Shield} title="Blessures effectif">
        {injured.length ? injured.map((player) => (
          <div key={player.id} style={S.fixtureRow}>
            <strong>{player.firstName} {player.lastName}</strong>
            <div style={S.fixtureMeta}>{getClubDisplayName(player.club)} · {player.injured} semaine(s) · {player.injuryReason ?? 'raison non précisée'}</div>
          </div>
        )) : <div style={S.emptySmall}>Aucun blessé dans l’effectif agence.</div>}
      </DebugBlock>

      <DebugBlock icon={Shuffle} title="Transferts et décisions">
        {transfers.length ? transfers.map((item, index) => (
          <div key={`${item.debugType}_${item.id ?? item.offerId ?? index}`} style={S.fixtureRow}>
            <strong>{item.playerName ?? item.label ?? 'Dossier transfert'}</strong>
            <div style={S.fixtureMeta}>{item.debugType} · S{item.week ?? item.createdWeek ?? state.week} · {item.detail ?? getClubDisplayName(item.club ?? item.toClub ?? 'suivi')}</div>
          </div>
        )) : <div style={S.emptySmall}>Aucun transfert récent ou en attente.</div>}
      </DebugBlock>

      <DebugBlock icon={Users} title="Répartition par semaine">
        {Object.entries(byWeek).slice(-12).map(([label, count]) => (
          <div key={label} style={S.histRow}><span>{label}</span><strong>{count} matchs</strong></div>
        ))}
      </DebugBlock>
    </div>
  );
}
