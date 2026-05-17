import React from 'react';
import { S } from './styles';
import { formatMoney } from '../utils/format';
import { getActiveSponsors, getNextSponsor, SPONSORS } from '../systems/sponsorSystem';

export default function HallOfFame({ state }) {
  const hof = state.hallOfFame ?? [];
  const trophies = state.seasonTrophies ?? [];
  const sponsors = getActiveSponsors(state.reputation ?? 0);
  const nextSponsor = getNextSponsor(state.reputation ?? 0);
  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>HISTOIRE & PRESTIGE</div>
        <h1 style={S.eh}>Hall of Fame</h1>
      </div>

      <section style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: '.18em', color: 'var(--af-muted)', fontWeight: 900, marginBottom: 8 }}>SPONSORS AGENCE</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {sponsors.length === 0 && <div style={{ color: 'var(--af-muted)', fontSize: 12 }}>Aucun sponsor actif. Construis ta réputation.</div>}
          {sponsors.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'oklch(16% 0.035 258 / .9)', border: `1px solid ${s.color}66`, borderRadius: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: s.color, display: 'grid', placeItems: 'center', fontWeight: 950, color: '#000' }}>
                {s.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, color: 'var(--af-text)' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--af-muted)' }}>{s.tagline}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 950, color: s.color }}>{formatMoney(s.weekly)}/sem.</div>
            </div>
          ))}
          {nextSponsor && (
            <div style={{ padding: 10, fontSize: 11, color: 'var(--af-muted)', border: '1px dashed var(--af-border)', borderRadius: 10 }}>
              Prochain : <strong style={{ color: nextSponsor.color }}>{nextSponsor.name}</strong> · réputation requise {nextSponsor.minRep} (actuelle {state.reputation ?? 0})
            </div>
          )}
        </div>
      </section>

      <section style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: '.18em', color: 'var(--af-muted)', fontWeight: 900, marginBottom: 8 }}>TROPHÉES INDIVIDUELS</div>
        {trophies.length === 0 && <div style={{ color: 'var(--af-muted)', fontSize: 12 }}>Les premiers trophées seront décernés en fin de saison.</div>}
        {trophies.map((t) => (
          <div key={t.season} style={{ padding: 12, marginBottom: 10, background: 'oklch(18% 0.04 258 / .9)', border: '1px solid var(--af-border)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--af-muted)', letterSpacing: '.16em', fontWeight: 900 }}>SAISON {t.season}</div>
            {t.ballonDor && <div style={{ marginTop: 6, fontWeight: 900 }}>🏆 Ballon Global : {t.ballonDor.name} ({t.ballonDor.club})</div>}
            {t.goldenBoot && <div>👟 Soulier d'Or : {t.goldenBoot.name} — {t.goldenBoot.goals} buts</div>}
            {t.playmaker && <div>🎯 Meilleur passeur : {t.playmaker.name} — {t.playmaker.assists} passes</div>}
            {t.teamOfSeason?.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', color: 'var(--af-muted)', fontSize: 12 }}>Équipe-type de la saison</summary>
                <ul style={{ paddingLeft: 16, marginTop: 6, fontSize: 12 }}>
                  {t.teamOfSeason.map((entry, i) => (
                    <li key={i}>{entry.position} — {entry.name} ({entry.club})</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </section>

      <section>
        <div style={{ fontSize: 11, letterSpacing: '.18em', color: 'var(--af-muted)', fontWeight: 900, marginBottom: 8 }}>HALL OF FAME · JOUEURS GÉRÉS</div>
        {hof.length === 0 && <div style={{ color: 'var(--af-muted)', fontSize: 12 }}>Aucun joueur retiré pour l'instant. Tes légendes apparaîtront ici.</div>}
        {hof.map((p) => (
          <div key={p.id} style={{ padding: 12, marginBottom: 8, background: 'oklch(16% 0.035 258 / .9)', border: '1px solid var(--af-border)', borderRadius: 10 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>{p.countryFlag} {p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--af-muted)', marginTop: 2 }}>
              Retraite à {p.retiredAtAge} ans · dernier club {p.finalClub} · note finale {p.finalRating}
            </div>
            <div style={{ fontSize: 11, color: 'var(--af-muted)', marginTop: 2 }}>
              {p.totalGoals} buts · {p.totalAssists} passes · {p.ballonDorWins ?? 0} Ballon Global · {p.selectionsCount ?? 0} sélections
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
