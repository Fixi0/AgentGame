import { Trophy } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CLUBS, COUNTRIES } from '../data/clubs';
import { getClubProfile } from '../systems/clubSystem';
import { getLeagueReputationLabel } from '../systems/leagueReputationSystem';
import { getSortedTable } from '../systems/leagueSystem';
import { S } from './styles';

export default function Standings({ state, onClubDetails }) {
  const availableCountries = useMemo(() => COUNTRIES.filter((country) => CLUBS.some((club) => club.countryCode === country.code)), []);
  const [countryCode, setCountryCode] = useState(availableCountries[0]?.code ?? 'FR');
  const [selectedClubName, setSelectedClubName] = useState(null);
  const selectedCountry = availableCountries.find((country) => country.code === countryCode) ?? availableCountries[0];
  const table = selectedCountry ? getSortedTable(state.leagueTables, selectedCountry.code) : [];
  const selectedClub = CLUBS.find((club) => club.name === selectedClubName) ?? CLUBS.find((club) => club.name === table[0]?.club);
  const clubProfile = selectedClub ? getClubProfile(selectedClub, state.clubRelations?.[selectedClub.name] ?? 50) : null;
  const leagueRep = state.leagueReputation?.[selectedCountry?.code] ?? 0;

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>CHAMPIONNATS</div>
        <h1 style={S.eh}>Classements</h1>
      </div>
      <div style={S.filterPanel}>
        <label style={S.fieldLabel}>Pays
          <select value={selectedCountry?.code ?? ''} onChange={(event) => setCountryCode(event.target.value)} style={S.textInput}>
            {availableCountries.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.label}</option>)}
          </select>
        </label>
        <div style={S.fixtureMeta}>Réputation locale : {leagueRep}/100 · {getLeagueReputationLabel(leagueRep)}</div>
      </div>
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
    </div>
  );
}
