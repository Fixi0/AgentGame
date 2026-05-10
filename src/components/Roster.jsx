import React, { useMemo, useState } from 'react';
import { BriefcaseBusiness, Search, Shield, SlidersHorizontal, TrendingUp, UserRound } from 'lucide-react';
import PlayerDossier from './PlayerDossier';
import { getAgencyCapacity } from '../systems/agencySystem';
import { formatMoney } from '../utils/format';
import { getPlayerStarsText } from '../utils/playerStars';

const initials = (player = {}) => `${player.firstName?.[0] ?? ''}${player.lastName?.[0] ?? ''}`.toUpperCase() || 'AF';
const fullName = (player = {}) => `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();

function PlayerTile({ player, onOpen, onNego }) {
  const trust = Math.max(0, Math.min(100, player.trust ?? 50));
  const form = Math.max(0, Math.min(100, player.form ?? 50));
  const status = player.injured > 0 ? 'En soins' : trust < 42 ? 'Fragile' : form > 68 ? 'En forme' : 'Stable';

  return (
    <article className="af-panel" style={{ overflow: 'hidden', display: 'grid', gridTemplateRows: '160px auto' }}>
      <button type="button" onClick={onOpen} className="af-player-portrait" style={{ border: 'none', width: '100%', minHeight: 160, cursor: 'pointer' }}>
        <span className="af-monogram">{initials(player)}</span>
        <span style={{ position: 'absolute', left: 12, top: 12, zIndex: 4, padding: '6px 9px', borderRadius: 8, background: 'oklch(12% 0.025 258 / .78)', color: 'var(--af-grass)', fontSize: 10, fontWeight: 950, letterSpacing: '.1em' }}>{player.position}</span>
        <span style={{ position: 'absolute', right: 12, top: 12, zIndex: 4, padding: '6px 9px', borderRadius: 8, background: 'oklch(12% 0.025 258 / .78)', color: 'var(--af-gold)', fontSize: 10, fontWeight: 950 }}>{getPlayerStarsText(player.rating)}</span>
      </button>

      <div style={{ padding: 14, display: 'grid', gap: 12 }}>
        <div>
          <button type="button" onClick={onOpen} style={{ padding: 0, border: 0, background: 'transparent', color: 'var(--af-text)', fontSize: 20, fontWeight: 950, letterSpacing: '-.04em', textAlign: 'left', cursor: 'pointer' }}>
            {fullName(player)}
          </button>
          <div style={{ color: 'var(--af-muted)', fontSize: 12, marginTop: 4 }}>{player.club || 'Libre'} · {player.clubRole || player.roleLabel || 'Rotation'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ color: 'var(--af-muted)', fontSize: 11 }}>
            Valeur
            <strong style={{ display: 'block', color: 'var(--af-text)', fontSize: 14, marginTop: 3 }}>{formatMoney(player.value ?? 0)}</strong>
          </div>
          <div style={{ color: 'var(--af-muted)', fontSize: 11 }}>
            Statut
            <strong style={{ display: 'block', color: status === 'Fragile' ? 'var(--af-danger)' : 'var(--af-grass)', fontSize: 14, marginTop: 3 }}>{status}</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--af-dim)', fontSize: 10, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
            <span>Confiance</span>
            <span>{trust}</span>
          </div>
          <div className="af-meter"><span style={{ width: `${trust}%` }} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" onClick={onOpen} className="af-btn-secondary" style={{ padding: '10px 8px', fontSize: 10 }}>Dossier</button>
          <button type="button" onClick={() => onNego?.('extend')} className="af-btn-primary" style={{ padding: '10px 8px', fontSize: 10 }}>Contrat</button>
        </div>
      </div>
    </article>
  );
}

export default function Roster({ state, roster, onNego, onDetails }) {
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState('all');
  const [localDossier, setLocalDossier] = useState(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return roster.filter((player) => {
      const text = `${fullName(player)} ${player.club} ${player.position} ${player.clubRole}`.toLowerCase();
      const matchesSearch = !normalized || text.includes(normalized);
      const matchesFocus = focus === 'all'
        || (focus === 'hot' && ((player.form ?? 50) >= 66 || (player.trust ?? 50) < 45))
        || (focus === 'contract' && (player.contractWeeksLeft ?? 99) <= 26)
        || (focus === 'prospect' && (player.potential ?? 0) > (player.rating ?? 0) + 18);
      return matchesSearch && matchesFocus;
    });
  }, [focus, query, roster]);

  const portfolioValue = roster.reduce((sum, player) => sum + (player.value ?? 0), 0);
  const averageTrust = roster.length ? Math.round(roster.reduce((sum, player) => sum + (player.trust ?? 50), 0) / roster.length) : 0;
  const capacity = getAgencyCapacity(state.agencyLevel);
  const openedPlayer = localDossier;

  if (openedPlayer) {
    return (
      <div className="af-page">
        <PlayerDossier
          player={openedPlayer}
          onBack={() => setLocalDossier(null)}
          actions={[
            <button key="meet" type="button" onClick={() => onDetails?.(openedPlayer)} className="af-btn-secondary" style={{ padding: 12 }}>Fiche complète</button>,
            <button key="extend" type="button" onClick={() => onNego(openedPlayer, 'extend')} className="af-btn-primary" style={{ padding: 12 }}>Prolonger</button>,
            <button key="transfer" type="button" onClick={() => onNego(openedPlayer, 'transfer')} className="af-btn-secondary" style={{ padding: 12 }}>Transfert</button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="af-page">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'end', marginBottom: 18 }}>
        <div>
          <div className="af-kicker">Portefeuille</div>
          <h1 className="af-title">Mes joueurs</h1>
          <p style={{ color: 'var(--af-muted)', margin: '12px 0 0', lineHeight: 1.5 }}>Une grille simple pour repérer les dossiers chauds et ouvrir la fiche confidentielle.</p>
        </div>
        <div className="af-glass" style={{ borderRadius: 8, padding: 12, minWidth: 154 }}>
          <div style={{ color: 'var(--af-dim)', fontSize: 10, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' }}>Capacité</div>
          <div style={{ color: 'var(--af-text)', fontSize: 26, fontWeight: 950 }}>{roster.length}/{capacity}</div>
        </div>
      </div>

      <div className="af-stat-grid" style={{ marginBottom: 14 }}>
        <div className="af-stat"><div className="af-stat-label">Joueurs</div><div className="af-stat-value">{roster.length}</div></div>
        <div className="af-stat"><div className="af-stat-label">Valeur totale</div><div className="af-stat-value" style={{ fontSize: 22 }}>{formatMoney(portfolioValue)}</div></div>
        <div className="af-stat"><div className="af-stat-label">Confiance</div><div className="af-stat-value">{averageTrust}</div></div>
        <div className="af-stat"><div className="af-stat-label">Dossiers</div><div className="af-stat-value">{(state.messageQueue ?? []).length}</div></div>
      </div>

      <div className="af-panel" style={{ padding: 12, marginBottom: 16, display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
          <label style={{ position: 'relative' }}>
            <Search size={17} color="var(--af-dim)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un joueur, club, poste" style={{ width: '100%', border: '1px solid var(--af-border)', background: 'oklch(16% 0.035 258 / .92)', color: 'var(--af-text)', borderRadius: 8, padding: '12px 12px 12px 38px', outline: 'none', fontWeight: 800 }} />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--af-muted)', padding: '0 8px' }}>
            <SlidersHorizontal size={16} />
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>Filtre</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            ['all', 'Tous', UserRound],
            ['hot', 'À suivre', TrendingUp],
            ['contract', 'Contrats', BriefcaseBusiness],
            ['prospect', 'Potentiel', Shield],
          ].map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setFocus(key)} className={`af-chip ${focus === key ? 'is-active' : ''}`} style={{ padding: '9px 11px', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10 }}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map((player) => (
            <PlayerTile key={player.id} player={player} onOpen={() => setLocalDossier(player)} onNego={(type) => onNego(player, type)} />
          ))}
        </div>
      ) : (
        <div className="af-panel" style={{ padding: 28, textAlign: 'center', color: 'var(--af-muted)' }}>
          Aucun joueur dans ce filtre. Le portefeuille reste lié aux joueurs de la base déjà présents dans ta partie.
        </div>
      )}
    </div>
  );
}
