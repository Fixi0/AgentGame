import React from 'react';

const fullName = (player = {}) => `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || 'Joueur';
const initials = (player = {}) => `${player.firstName?.[0] ?? ''}${player.lastName?.[0] ?? ''}`.toUpperCase() || 'AF';

export default function PlayerDossier({ player, onBack }) {
  if (!player) return null;
  return (
    <section className="af-panel" style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button type="button" onClick={onBack} className="af-chip" style={{ padding: '9px 11px' }}>Retour</button>
        <div style={{ color: 'var(--af-gold)', fontSize: 10, fontWeight: 950, letterSpacing: '.18em', textTransform: 'uppercase' }}>Dossier confidentiel</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr', gap: 12, alignItems: 'center' }}>
        <div style={{ height: 92, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'oklch(13% 0.025 258)', fontSize: 26, fontWeight: 950, background: 'linear-gradient(160deg, oklch(88% 0.015 250), oklch(54% 0.018 250))' }}>
          {initials(player)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="af-kicker">{player.position || 'Joueur'} · {player.club || 'Libre'}</div>
          <h1 className="af-title" style={{ marginTop: 8, fontSize: 34 }}>{fullName(player)}</h1>
          <p style={{ color: 'var(--af-muted)', margin: '10px 0 0', lineHeight: 1.45 }}>
            Valeur, rôle et relation agence sont gardés dans le moteur. Ici, l’objectif est de lire vite le dossier avant de décider.
          </p>
        </div>
      </div>
    </section>
  );
}
