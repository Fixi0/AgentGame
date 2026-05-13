import React, { useState } from 'react';
import { NATIONAL_CUPS } from '../systems/nationalCupSystem';
import { S } from './styles';
import { getClubDisplayName } from '../data/clubs';

export default function NationalCups({ state }) {
  const cups = state.nationalCups ?? {};
  const codes = Object.keys(NATIONAL_CUPS);
  const [active, setActive] = useState(codes[0]);
  const cupMeta = NATIONAL_CUPS[active];
  const bracket = cups[active];

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>COUPES NATIONALES</div>
        <h1 style={S.eh}>{cupMeta?.flag} {cupMeta?.name}</h1>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {codes.map((code) => (
          <button
            key={code}
            onClick={() => setActive(code)}
            style={{
              padding: '8px 12px',
              background: active === code ? NATIONAL_CUPS[code].color : 'oklch(20% 0.04 258 / .8)',
              color: active === code ? '#fff' : 'var(--af-text)',
              border: '1px solid var(--af-border)',
              borderRadius: 8,
              fontWeight: 900,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {NATIONAL_CUPS[code].flag} {NATIONAL_CUPS[code].name}
          </button>
        ))}
      </div>

      {!bracket && <div style={{ color: 'var(--af-muted)' }}>Tournoi pas encore lancé.</div>}
      {bracket?.winner && (
        <div style={{ padding: 14, background: `linear-gradient(135deg, ${cupMeta.color}, ${cupMeta.color}88)`, borderRadius: 12, marginBottom: 12, color: '#fff', fontWeight: 950, fontSize: 18, textAlign: 'center' }}>
          🏆 Vainqueur : {getClubDisplayName(bracket.winner)}
        </div>
      )}

      {(bracket?.rounds ?? []).map((round, idx) => (
        <section key={idx} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', color: 'var(--af-muted)', fontWeight: 900, marginBottom: 6 }}>{round.label.toUpperCase()}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {round.matches.map((m) => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, padding: 10, background: 'oklch(16% 0.035 258 / .9)', border: '1px solid var(--af-border)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: m.played && m.winner === m.home ? 900 : 500, textAlign: 'right' }}>{getClubDisplayName(m.home ?? '?')}</div>
                <div style={{ fontWeight: 900, fontSize: 13, color: cupMeta.color }}>
                  {m.played ? `${m.homeGoals}-${m.awayGoals}` : 'vs'}
                </div>
                <div style={{ fontSize: 12, fontWeight: m.played && m.winner === m.away ? 900 : 500 }}>{getClubDisplayName(m.away ?? '?')}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
