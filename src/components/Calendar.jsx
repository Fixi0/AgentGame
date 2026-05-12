import { CalendarDays, Star } from 'lucide-react';
import React from 'react';
import { getCalendarSnapshot, getSeasonMilestones } from '../systems/seasonSystem';
import { ClubCrest } from '../utils/clubCrests';
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

const FixtureRow = ({ fixture, played, onClubDetails, mustWatch }) => (
  <div style={{ ...S.fixtureRow, background: mustWatch ? 'oklch(28% 0.10 155 / .22)' : undefined, borderLeft: mustWatch ? '3px solid var(--af-grass)' : undefined, paddingLeft: mustWatch ? 8 : undefined }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {mustWatch && <Star size={12} style={{ color: '#f59e0b' }} fill="#f59e0b" />}
      <ClubCrest club={fixture.homeClub.name} size={18} />
      <button onClick={() => onClubDetails?.(fixture.homeClub.name)} style={S.linkBtn}>{fixture.homeClub.name}</button>
      <span> vs </span>
      <ClubCrest club={fixture.awayClub.name} size={18} />
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
  const rosterClubs = new Set((state.roster ?? []).map((p) => p.club));
  const isMustWatch = (f) => rosterClubs.has(f.homeClub.name) || rosterClubs.has(f.awayClub.name);
  const sortMustFirst = (a, b) => Number(isMustWatch(b)) - Number(isMustWatch(a));

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
        {nextFixtures.length ? [...nextFixtures].sort(sortMustFirst).slice(0, 20).map((fixture) => (
          <FixtureRow key={fixture.fixtureId} fixture={fixture} onClubDetails={onClubDetails} mustWatch={isMustWatch(fixture)} />
        )) : <div style={S.emptySmall}>Signe des joueurs puis joue une semaine pour générer le calendrier.</div>}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>
          <CalendarDays size={14} />
          <span>GRANDS JALONS À VENIR</span>
        </div>
        {milestones.length ? milestones.map((item) => (
          <div key={item.key} style={{
            background: item.tone === 'danger' ? 'oklch(28% 0.12 25 / .35)' : item.tone === 'warn' ? 'oklch(30% 0.10 80 / .35)' : item.tone === 'good' ? 'oklch(28% 0.10 155 / .35)' : 'var(--af-surface-soft)',
            border: `1px solid ${item.tone === 'danger' ? '#fca5a5' : item.tone === 'warn' ? '#fde68a' : item.tone === 'good' ? 'var(--af-border)' : 'var(--af-border)'}`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 3 }}>
              <strong style={{ fontSize: 12, color: 'var(--af-text)' }}>{item.label}</strong>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: item.tone === 'danger' ? '#b42318' : item.tone === 'warn' ? '#8a6f1f' : item.tone === 'good' ? 'var(--af-grass)' : 'var(--af-cyan)', fontFamily: 'system-ui,sans-serif' }}>
                {item.weeksAway === 0 ? 'Cette semaine' : item.weeksAway === 1 ? 'La semaine prochaine' : `Dans ${item.weeksAway} sem.`}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', lineHeight: 1.45 }}>
              {item.detail}
            </div>
            <div style={{ fontSize: 9, color: 'var(--af-dim)', fontFamily: 'system-ui,sans-serif', marginTop: 4, letterSpacing: '.08em', textTransform: 'uppercase' }}>
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
          <FixtureRow key={fixture.fixtureId} fixture={fixture} played onClubDetails={onClubDetails} mustWatch={isMustWatch(fixture)} />
        )) : <div style={S.emptySmall}>Aucun résultat joué.</div>}
      </div>
    </div>
  );
}
