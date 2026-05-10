import { Filter, Search, UserRound } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { MARKET_REFRESH_COST } from '../game/economy';
import { getPlayerProfileSummary } from '../systems/playerProfileSystem';
import { formatMoney } from '../utils/format';
import { getPlayerStarsText } from '../utils/playerStars';
import PlayerDossier from './PlayerDossier';
import { S } from './styles';

const fullName = (player = {}) => `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();
const initials = (player = {}) => `${player.firstName?.[0] ?? ''}${player.lastName?.[0] ?? ''}`.toUpperCase() || 'AF';

function MarketCard({ player, money, onSign, onDetails }) {
  const canSign = money >= (player.signingCost ?? 0);
  const profile = player.playerProfile ?? getPlayerProfileSummary(player);

  return (
    <article className="af-panel" style={{ padding: 14, display: 'grid', gap: 12 }}>
      <button
        type="button"
        onClick={onDetails}
        style={{
          border: 0,
          padding: 0,
          background: 'transparent',
          display: 'grid',
          gridTemplateColumns: '58px 1fr',
          gap: 12,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <div className="af-player-portrait" style={{ width: 58, height: 58, borderRadius: 8 }}>
          <span className="af-monogram" style={{ fontSize: 18 }}>{initials(player)}</span>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
            <div>
              <div style={{ color: 'var(--af-text)', fontSize: 18, fontWeight: 950, letterSpacing: '-.04em' }}>{fullName(player)}</div>
              <div style={{ color: 'var(--af-muted)', fontSize: 12, marginTop: 4 }}>{player.club || 'Libre'} · {player.position} · {player.countryLabel}</div>
            </div>
            <div style={{ color: 'var(--af-gold)', fontSize: 11, fontWeight: 950, whiteSpace: 'nowrap' }}>{getPlayerStarsText(player.rating)}</div>
          </div>
          <div style={{ color: 'var(--af-dim)', fontSize: 11, marginTop: 8, lineHeight: 1.4 }}>{profile.label} · potentiel masqué par le scout</div>
        </div>
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="af-glass" style={{ borderRadius: 8, padding: 10 }}>
          <div style={{ color: 'var(--af-dim)', fontSize: 9, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase' }}>Signature</div>
          <strong style={{ color: 'var(--af-text)', fontSize: 15 }}>{formatMoney(player.signingCost ?? 0)}</strong>
        </div>
        <div className="af-glass" style={{ borderRadius: 8, padding: 10 }}>
          <div style={{ color: 'var(--af-dim)', fontSize: 9, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase' }}>Valeur</div>
          <strong style={{ color: 'var(--af-text)', fontSize: 15 }}>{formatMoney(player.value ?? 0)}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" onClick={onDetails} className="af-btn-secondary" style={{ padding: '11px 10px', fontSize: 10 }}>
          Dossier
        </button>
        <button
          type="button"
          onClick={onSign}
          disabled={!canSign}
          className="af-btn-primary"
          style={{ padding: '11px 10px', fontSize: 10, opacity: canSign ? 1 : .42, cursor: canSign ? 'pointer' : 'not-allowed' }}
        >
          {canSign ? 'Recruter' : 'Budget court'}
        </button>
      </div>
    </article>
  );
}

export default function Market({ state, market, freeAgents = [], money, onSign, onRefresh, onDetails }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [filters, setFilters] = useState({ position: 'all', country: 'all', profile: 'all', maxCost: 'all', sort: 'rating' });
  const [query, setQuery] = useState('');
  const allPlayers = useMemo(() => [...freeAgents, ...market].filter(Boolean).slice(0, 80), [freeAgents, market]);
  const countries = useMemo(() => [...new Map(allPlayers.map((player) => [player.countryCode, player])).values()], [allPlayers]);
  const profileOptions = useMemo(() => {
    const profiles = allPlayers.map((player) => player.playerProfile ?? getPlayerProfileSummary(player));
    return [...new Map(profiles.map((profile) => [profile.id, profile])).values()];
  }, [allPlayers]);

  const filteredMarket = allPlayers
    .filter((player) => {
      const profile = player.playerProfile ?? getPlayerProfileSummary(player);
      const search = query.trim().toLowerCase();
      if (search && !`${fullName(player)} ${player.club} ${player.position}`.toLowerCase().includes(search)) return false;
      if (filters.position !== 'all' && player.position !== filters.position) return false;
      if (filters.country !== 'all' && player.countryCode !== filters.country) return false;
      if (filters.profile !== 'all' && profile.id !== filters.profile) return false;
      if (filters.maxCost !== 'all' && player.signingCost > Number(filters.maxCost)) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === 'price') return (a.signingCost ?? 0) - (b.signingCost ?? 0);
      if (filters.sort === 'age') return (a.age ?? 99) - (b.age ?? 99);
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

  const visibleMarket = filteredMarket.slice(0, 12);
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const isFirstRecruit = !state?.roster?.length;

  if (selectedPlayer) {
    return (
      <div className="af-page">
        <PlayerDossier player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />
      </div>
    );
  }

  return (
    <div className="af-page">
      <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
        <div>
          <div className="af-kicker">Marché des talents</div>
          <h1 className="af-title">Recruter</h1>
          <p style={{ color: 'var(--af-muted)', margin: '12px 0 0', lineHeight: 1.5 }}>
            Des profils lisibles, adaptés à ton réseau et à ton budget actuel.
          </p>
        </div>

        {isFirstRecruit && (
          <div className="af-panel" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--af-grass)', marginBottom: 6, letterSpacing: '.12em', textTransform: 'uppercase' }}>Premier recrutement</div>
            <div style={{ fontSize: 12, color: 'var(--af-muted)', lineHeight: 1.5 }}>
              Choisis un joueur, ouvre son dossier si besoin, puis lance le recrutement. Commence par des profils accessibles.
            </div>
          </div>
        )}

        <button onClick={onRefresh} className="af-btn-secondary" style={{ padding: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Search size={14} /> Rafraîchir · {formatMoney(MARKET_REFRESH_COST)}
        </button>
      </div>

      <div className="af-panel" style={{ padding: 12, marginBottom: 16, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--af-muted)', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          <Filter size={14} /> Filtres
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nom, club ou poste"
          style={{ ...S.textInput, width: '100%' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 9 }}>
          <select value={filters.position} onChange={(event) => updateFilter('position', event.target.value)} style={S.textInput}>
            <option value="all">Tous postes</option>
            {['ATT', 'MIL', 'DEF', 'GK'].map((position) => <option key={position} value={position}>{position}</option>)}
          </select>
          <select value={filters.country} onChange={(event) => updateFilter('country', event.target.value)} style={S.textInput}>
            <option value="all">Tous pays</option>
            {countries.map((player) => <option key={player.countryCode} value={player.countryCode}>{player.countryLabel}</option>)}
          </select>
          <select value={filters.profile} onChange={(event) => updateFilter('profile', event.target.value)} style={S.textInput}>
            <option value="all">Tous profils</option>
            {profileOptions.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
          </select>
          <select value={filters.maxCost} onChange={(event) => updateFilter('maxCost', event.target.value)} style={S.textInput}>
            <option value="all">Budget libre</option>
            <option value="5000">5 k max</option>
            <option value="15000">15 k max</option>
            <option value="50000">50 k max</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
        {visibleMarket.map((player) => (
          <MarketCard key={player.id} player={player} money={money} onSign={() => onSign(player)} onDetails={() => setSelectedPlayer(player)} />
        ))}
      </div>

      {filteredMarket.length > visibleMarket.length && (
        <div className="af-panel" style={{ padding: 14, marginTop: 12, color: 'var(--af-muted)', fontSize: 12, lineHeight: 1.45 }}>
          {visibleMarket.length} profils affichés sur {filteredMarket.length}. Affine les filtres pour cibler mieux.
        </div>
      )}

      {!filteredMarket.length && (
        <div className="af-panel" style={{ padding: 26, color: 'var(--af-muted)', textAlign: 'center' }}>
          <UserRound size={24} />
          <div style={{ marginTop: 8 }}>Aucun joueur ne correspond aux filtres.</div>
        </div>
      )}
    </div>
  );
}
