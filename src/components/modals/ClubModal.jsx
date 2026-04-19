import { X } from 'lucide-react';
import React from 'react';
import { CLUBS, getCountry } from '../../data/clubs';
import { getClubProfile } from '../../systems/clubSystem';
import { getRelevantDecisionHistory } from '../../systems/dossierSystem';
import { getClubDossierHistorySummary, getClubRecentDossierEvents } from '../../systems/coherenceSystem';
import { S } from '../styles';

export default function ClubModal({ clubName, relations, clubMemory, decisionHistory = [], onClose }) {
  const club = CLUBS.find((item) => item.name === clubName);
  if (!club) return null;
  const country = getCountry(club.countryCode);
  const relation = relations?.[club.name] ?? 50;
  const profile = getClubProfile(club, relation);
  const memory = clubMemory?.[club.name] ?? { trust: 50, blocks: 0, lies: 0, promisesBroken: 0, lastWeek: 0 };
  const clubDecisions = getRelevantDecisionHistory(decisionHistory, { clubName: club.name }).slice(0, 6);
  const clubHistory = getClubRecentDossierEvents({ clubs: clubMemory ?? {} }, club.name, 3);
  const clubHistorySummary = getClubDossierHistorySummary({ clubs: clubMemory ?? {} }, club.name);
  const trustedClubs = CLUBS
    .map((item) => ({
      club: item,
      memory: clubMemory?.[item.name] ?? { trust: 50, blocks: 0, lies: 0, promisesBroken: 0, lastWeek: 0 },
      relation: relations?.[item.name] ?? 50,
    }))
    .filter((entry) => entry.memory.trust >= 60 || entry.relation >= 60)
    .sort((a, b) => b.memory.trust - a.memory.trust)
    .slice(0, 5);

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span>FICHE CLUB</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <div style={S.profileHero}>
            <div style={{ ...S.agencyAvatar, background: '#172026', width: 72, height: 72 }}>{club.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <h2 style={S.mTitle}>{club.name}</h2>
              <div style={S.mPlayer}>{country.flag} {country.label} · {club.city}</div>
            </div>
          </div>
          <div style={S.kpiGrid}>
            <Metric label="Budget" value={`${profile.budget}/100`} />
            <Metric label="Prestige" value={`${profile.prestige}/100`} />
            <Metric label="Relation" value={`${relation}/100`} />
            <Metric label="Pression" value={profile.mediaPressure} />
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>MEMOIRE CLUB</div>
            <div style={S.sumRow}><span style={S.sumK}>Lecture</span><strong>{memory.promisesBroken >= 3 || memory.blocks >= 4 ? 'Méfiance forte' : memory.promisesBroken > 0 || memory.blocks > 0 || memory.trust < 45 ? 'Mémoire tendue' : memory.trust > 60 ? 'Mémoire positive' : 'Mémoire neutre'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Confiance</span><strong>{memory.trust}/100</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Blocages</span><strong>{memory.blocks}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Promesses cassées</span><strong>{memory.promisesBroken}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Historique</span><strong>{clubHistorySummary}</strong></div>
            {clubHistory.length ? clubHistory.map((entry) => (
              <div key={entry.id} style={S.promiseRow}>
                <span>{entry.label}</span>
                <strong style={{ color: entry.impact > 0 ? '#00a676' : entry.impact < 0 ? '#b42318' : '#64727d' }}>
                  {entry.impact > 0 ? 'Calmé' : entry.impact < 0 ? 'Tendu' : 'Neutre'}
                </strong>
              </div>
            )) : <div style={S.emptySmall}>Aucun dossier récent sur ce club.</div>}
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>CLUBS QUI TE FONT CONFIANCE</div>
            {trustedClubs.length ? trustedClubs.map(({ club: trustedClub, memory: trustedMemory, relation: trustedRelation }) => (
              <div key={trustedClub.name} style={S.decisionRow}>
                <span>
                  {trustedClub.name}
                  <div style={S.fixtureMeta}>
                    {trustedClub.city} · {trustedMemory.trust}/100 · relation {trustedRelation}/100
                  </div>
                </span>
                <strong>{trustedMemory.trust >= 70 ? 'Solide' : 'Sûr'}</strong>
              </div>
            )) : <div style={S.emptySmall}>Aucun club n'a encore une vraie confiance.</div>}
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>IDENTITE SPORTIVE</div>
            <div style={S.sumRow}><span style={S.sumK}>Style</span><strong>{profile.style}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Tempérament</span><strong>{profile.temperament}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Niveau</span><strong>Tier {club.tier}</strong></div>
            <div style={S.emptySmall}>Rivalités : {profile.rivalries.join(', ')}</div>
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>FIL DE DECISION</div>
            {clubDecisions.length ? clubDecisions.map((decision) => (
              <div key={decision.id} style={S.promiseRow}>
                <span>{decision.label}</span>
                <strong>S{decision.week}</strong>
              </div>
            )) : <div style={S.emptySmall}>Aucune décision liée à ce club.</div>}
          </div>
          <button onClick={onClose} style={S.primaryBtn}>FERMER</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={S.kpiCard}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={S.kpiValue}>{value}</div>
    </div>
  );
}
