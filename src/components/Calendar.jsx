import { CalendarDays } from 'lucide-react';
import React from 'react';
import { getCalendarSnapshot } from '../systems/seasonSystem';
import { S } from './styles';

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

export default function Calendar({ state, onClubDetails }) {
  const currentDate = getCalendarSnapshot(state.week);
  const nextDate = getCalendarSnapshot(state.week + 1);
  const nextFixtures = state.nextFixtures ?? [];
  const lastFixtures = state.lastFixtures ?? [];

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
          <span>DERNIERS RESULTATS</span>
        </div>
        {lastFixtures.length ? lastFixtures.slice(0, 20).map((fixture) => (
          <FixtureRow key={fixture.fixtureId} fixture={fixture} played onClubDetails={onClubDetails} />
        )) : <div style={S.emptySmall}>Aucun résultat joué.</div>}
      </div>
    </div>
  );
}
