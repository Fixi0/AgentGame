import { MapPinned } from 'lucide-react';
import React from 'react';
import { COUNTRIES } from '../data/clubs';
import { S } from './styles';

export default function Scouting({ state, onStartMission }) {
  const scoutLevel = state.staff?.scoutAfrica ?? 0;

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>SCOUTING</div>
        <h1 style={S.eh}>Réseau</h1>
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}><MapPinned size={14} /> MISSIONS</div>
        {scoutLevel <= 0 ? (
          <div style={S.emptySmall}>Recrute un scout international dans Agence pour débloquer les missions et les rapports.</div>
        ) : (
          <div style={S.formGrid}>
            {COUNTRIES.map((country) => (
              <button key={country.code} onClick={() => onStartMission(country.code)} style={S.msgBtn}>
                {country.flag} {country.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>RAPPORTS</div>
        {(state.scoutingMissions ?? []).length ? state.scoutingMissions.map((mission) => (
          <div key={mission.id} style={S.promiseRow}>
            <span>{COUNTRIES.find((country) => country.code === mission.countryCode)?.label} · {mission.playerName ?? mission.status}</span>
            <strong>{mission.status === 'active' ? `${mission.weeksLeft}s` : 'OK'}</strong>
          </div>
        )) : <div style={S.emptySmall}>Aucune mission lancée.</div>}
      </div>
    </div>
  );
}
