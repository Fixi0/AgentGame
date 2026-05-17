import React, { useMemo, useState } from 'react';
import { Activity, CalendarDays, Gauge, Target, Trophy } from 'lucide-react';
import { getWeekDailySnapshots } from '../systems/seasonSystem';
import { MATCH_STATUS, calendarMatchToFixture } from '../systems/matchCalendarSystem';
import { S } from './styles';

const dayLabel = (week, day = 6) => {
  const snap = getWeekDailySnapshots(week)?.[Math.max(0, Math.min(6, Number(day ?? 6) - 1))];
  return `${snap?.weekdayLabel ?? 'Jour'} ${snap?.dateLabel ?? ''}`.trim();
};

const scoreText = (fixture = {}) =>
  Number.isFinite(fixture.homeGoals) && Number.isFinite(fixture.awayGoals)
    ? `${fixture.homeGoals}-${fixture.awayGoals}`
    : 'à venir';

const stat = (value, suffix = '') => Number.isFinite(value) ? `${value}${suffix}` : '—';

const competitionLabel = (match = {}) => {
  if (match.competitionLabel) return match.competitionLabel;
  if (match.competition === 'CL') return 'Ligue des Champions';
  if (match.competition === 'EL') return 'Europa League';
  if (match.competition === 'ECL') return 'Conference League';
  return 'Championnat';
};

function MatchRow({ match }) {
  const fixture = calendarMatchToFixture(match);
  const played = match.status === MATCH_STATUS.PLAYED;
  return (
    <div style={{ ...S.fixtureRow, marginBottom: 8, borderLeft: played ? '3px solid var(--af-grass)' : '3px solid var(--af-muted)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--af-text)', fontWeight: 950, fontSize: 13 }}>
            {fixture.homeClub?.name ?? 'Club'} <span style={{ color: 'var(--af-cyan)' }}>{scoreText(fixture)}</span> {fixture.awayClub?.name ?? 'Adversaire'}
          </div>
          <div style={S.fixtureMeta}>
            {dayLabel(match.week, match.day)} · S{match.seasonWeek ?? ((match.week - 1) % 38) + 1}/38 · {competitionLabel(match)}
          </div>
        </div>
        <span style={{
          flexShrink: 0,
          padding: '4px 8px',
          borderRadius: 8,
          background: played ? 'oklch(70% 0.19 155 / .10)' : 'oklch(28% 0.08 70 / .22)',
          color: played ? 'var(--af-grass)' : 'var(--af-gold)',
          fontSize: 9,
          fontWeight: 950,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
        }}>
          {played ? 'simulé' : 'programmé'}
        </span>
      </div>
      {played && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 10 }}>
          {[
            ['xG', `${stat(fixture.homeXg)} / ${stat(fixture.awayXg)}`],
            ['Tirs', `${stat(fixture.homeShots)} / ${stat(fixture.awayShots)}`],
            ['Cadrés', `${stat(fixture.homeShotsOnTarget)} / ${stat(fixture.awayShotsOnTarget)}`],
            ['Occasions', `${stat(fixture.homeChances)} / ${stat(fixture.awayChances)}`],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'oklch(13% 0.03 258 / .72)', border: '1px solid var(--af-border)', borderRadius: 8, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ color: 'var(--af-muted)', fontSize: 9, fontWeight: 850, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ color: 'var(--af-text)', fontSize: 12, fontWeight: 950, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EngineHistory({ state }) {
  const [filter, setFilter] = useState('played');
  const matches = useMemo(() => {
    const all = Array.isArray(state.matchCalendar) ? state.matchCalendar : [];
    return all
      .filter((match) => filter === 'all' || match.status === filter)
      .slice()
      .sort((a, b) => (b.week - a.week) || (b.day - a.day) || String(a.id).localeCompare(String(b.id)))
      .slice(0, 160);
  }, [state.matchCalendar, filter]);
  const played = (state.matchCalendar ?? []).filter((match) => match.status === MATCH_STATUS.PLAYED);
  const scheduled = (state.matchCalendar ?? []).filter((match) => match.status === MATCH_STATUS.SCHEDULED);
  const averageXg = played.length
    ? (played.reduce((sum, match) => {
      const fixture = calendarMatchToFixture(match);
      return sum + Number(fixture.homeXg ?? 0) + Number(fixture.awayXg ?? 0);
    }, 0) / played.length).toFixed(2)
    : '—';

  return (
    <div className="af-page" style={{ display: 'grid', gap: 14 }}>
      <div>
        <div className="af-kicker">MOTEUR</div>
        <h1 className="af-title">Historique moteur</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--af-muted)', fontSize: 12, lineHeight: 1.45 }}>
          Tous les matchs lus depuis le calendrier central: ce sont les fixtures réellement simulés ou programmés par le moteur.
        </p>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          [Activity, 'Simulés', played.length],
          [CalendarDays, 'À venir', scheduled.length],
          [Target, 'xG/match', averageXg],
        ].map(([Icon, label, value]) => (
          <div key={label} style={S.statCard}>
            <div style={S.statLabel}><Icon size={12} />{label}</div>
            <div style={{ ...S.statValue, fontSize: 18 }}>{value}</div>
          </div>
        ))}
      </section>

      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          ['played', 'Simulés'],
          ['scheduled', 'Programmés'],
          ['all', 'Tout'],
        ].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} className={`af-chip ${filter === key ? 'is-active' : ''}`}>
            {label}
          </button>
        ))}
      </section>

      <section style={S.histCard}>
        <div style={S.secTitle}><Trophy size={14} /><span>Matchs moteur</span></div>
        {matches.length ? matches.map((match) => <MatchRow key={match.id} match={match} />) : (
          <div style={S.emptySmall}>Aucun match dans le calendrier moteur pour l’instant.</div>
        )}
      </section>
    </div>
  );
}
