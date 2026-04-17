import { X } from 'lucide-react';
import React from 'react';
import { CLUBS, getCountry } from '../../data/clubs';
import { getClubProfile } from '../../systems/clubSystem';
import { S } from '../styles';

export default function ClubModal({ clubName, relations, onClose }) {
  const club = CLUBS.find((item) => item.name === clubName);
  if (!club) return null;
  const country = getCountry(club.countryCode);
  const relation = relations?.[club.name] ?? 50;
  const profile = getClubProfile(club, relation);

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
            <div style={S.secTitle}>IDENTITE SPORTIVE</div>
            <div style={S.sumRow}><span style={S.sumK}>Style</span><strong>{profile.style}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Niveau</span><strong>Tier {club.tier}</strong></div>
            <div style={S.emptySmall}>Rivalités : {profile.rivalries.join(', ')}</div>
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
