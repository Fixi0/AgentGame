import { CalendarDays } from 'lucide-react';
import React from 'react';
import { getCalendarSnapshot, getSeasonMilestones } from '../systems/seasonSystem';
import { S } from './styles';

const toFixtureFromDb = (row) => ({
  fixtureId: row.fixture_id ?? row.id,
  homeClub: {
    name: row.home_club_name ?? 'Club',
    city: row.raw?.homeClub?.city ?? row.raw?.homeClub?.name ?? '',
  },
  awayClub: {
    name: row.away_club_name ?? 'Adversaire',
    city: row.raw?.awayClub?.city ?? row.raw?.awayClub?.name ?? '',
  },
  homeGoals: row.home_goals,
  awayGoals: row.away_goals,
});

const FixtureRow = ({ fixture, played, onClubDetails }) => (
  <div style={S.fixtureRow}>
    <div>
      <button onClick={() => onClubDetails?.(fixture.homeClub.name)} style={S.linkBtn}>{fixture.homeClub.name}</button>
      <span> vs </span>
      <button onClick={() => onClubDetails?.(fixture.awayClub.name)} style={S.linkBtn}>{fixture.awayClub.name}</button>
    </div>
    <div style={S.fixtureMeta}>
      {played ? `${fixture.homeGoals}-${fixture.awayGoals}` : `${fixture.homeClub.city} · à venir`}
    </div>
  </div>
);

export default function Calendar({ state, databaseView = null, onClubDetails }) {
  const currentDate = getCalendarSnapshot(state.week);
  const nextDate = getCalendarSnapshot(state.week + 1);
  const dbFixtures = databaseView?.fixtures ?? [];
  const nextFixturesFromDb = dbFixtures
    .filter((fixture) => fixture.status === 'scheduled')
    .sort((a, b) => (a.week ?? 0) - (b.week ?? 0))
    .map(toFixtureFromDb);
  const lastFixturesFromDb = dbFixtures
    .filter((fixture) => fixture.status === 'played')
    .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
    .map(toFixtureFromDb);
  const nextFixtures = nextFixturesFromDb.length ? nextFixturesFromDb : state.nextFixtures ?? [];
  const lastFixtures = lastFixturesFromDb.length ? lastFixturesFromDb : state.lastFixtures ?? [];
  const milestones = getSeasonMilestones(state.week);

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>CALENDRIER</div>
        <h1 style={S.eh}>Affiches</h1>
        <div style={S.calendarLegend}>
          <strong>Aujourd'hui:</strong> {currentDate.dateLabel} · {currentDate.weekRangeLabel}
        </div>
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>
          <CalendarDays size={14} />
          <span>PROCHAINE SEMAINE · {nextDate.weekRangeLabel}</span>
        </div>
        {nextFixtures.length ? nextFixtures.slice(0, 20).map((fixture) => (
          <FixtureRow key={fixture.fixtureId} fixture={fixture} onClubDetails={onClubDetails} />
        )) : <div style={S.emptySmall}>Signe des joueurs puis joue une semaine pour générer le calendrier.</div>}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>
          <CalendarDays size={14} />
          <span>GRANDS JALONS À VENIR</span>
        </div>
        {milestones.length ? milestones.map((item) => (
          <div key={item.key} style={{
            background: item.tone === 'danger' ? '#fff7f7' : item.tone === 'warn' ? '#fffbeb' : item.tone === 'good' ? '#f0fdf8' : '#f7f9fb',
            border: `1px solid ${item.tone === 'danger' ? '#fca5a5' : item.tone === 'warn' ? '#fde68a' : item.tone === 'good' ? '#cfeee3' : '#e5eaf0'}`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 3 }}>
              <strong style={{ fontSize: 12, color: '#172026' }}>{item.label}</strong>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: item.tone === 'danger' ? '#b42318' : item.tone === 'warn' ? '#8a6f1f' : item.tone === 'good' ? '#246555' : '#1d4ed8', fontFamily: 'system-ui,sans-serif' }}>
                {item.weeksAway === 0 ? 'Cette semaine' : item.weeksAway === 1 ? 'La semaine prochaine' : `Dans ${item.weeksAway} sem.`}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', lineHeight: 1.45 }}>
              {item.detail}
            </div>
            <div style={{ fontSize: 9, color: '#9aa7b2', fontFamily: 'system-ui,sans-serif', marginTop: 4, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {item.labelWithWeek}
            </div>
          </div>
        )) : <div style={S.emptySmall}>Aucun jalon à venir.</div>}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>
          <CalendarDays size={14} />
          <span>DERNIERS RESULTATS</span>
        </div>
        {lastFixtures.length ? lastFixtures.slice(0, 20).map((fixture) => (
          <FixtureRow key={fixture.fixtureId} fixture={fixture} played onClubDetails={onClubDetails} />
        )) : <div style={S.emptySmall}>Aucun résultat joué.</div>}
      </div>
    </div>
  );
}
