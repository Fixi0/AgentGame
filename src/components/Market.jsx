import { Filter, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { MARKET_REFRESH_COST } from '../game/economy';
import { formatMoney } from '../utils/format';
import PlayerCard from './PlayerCard';
import { S } from './styles';

export default function Market({ state, market, freeAgents = [], money, onSign, onRefresh, onDetails }) {
  const [filters, setFilters] = useState({ position: 'all', country: 'all', maxCost: 'all', minPotential: 0, sort: 'rating' });
  const [favoriteIds, setFavoriteIds] = useState([]);
  const allPlayers = useMemo(() => [...freeAgents, ...market], [freeAgents, market]);
  const countries = useMemo(() => [...new Map(allPlayers.map((player) => [player.countryCode, player])).values()], [allPlayers]);
  const filteredMarket = allPlayers
    .filter((player) => {
      if (filters.position !== 'all' && player.position !== filters.position) return false;
      if (filters.country !== 'all' && player.countryCode !== filters.country) return false;
      if (filters.maxCost !== 'all' && player.signingCost > Number(filters.maxCost)) return false;
      if (player.potential < Number(filters.minPotential)) return false;
      return true;
    })
    .sort((a, b) => {
      if (favoriteIds.includes(a.id) && !favoriteIds.includes(b.id)) return -1;
      if (!favoriteIds.includes(a.id) && favoriteIds.includes(b.id)) return 1;
      if (filters.sort === 'price') return a.signingCost - b.signingCost;
      if (filters.sort === 'potential') return b.potential - a.potential;
      if (filters.sort === 'age') return a.age - b.age;
      return b.rating - a.rating;
    });

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleFavorite = (playerId) => {
    setFavoriteIds((current) => (current.includes(playerId) ? current.filter((id) => id !== playerId) : [playerId, ...current]));
  };

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>MARCHE DES TRANSFERTS</div>
        <h1 style={S.eh}>Recruter</h1>
      </div>
      <button onClick={onRefresh} style={S.secBtn}>
        <Search size={14} /> Rafraîchir · {formatMoney(MARKET_REFRESH_COST)}
      </button>
      <div style={S.filterPanel}>
        <div style={S.secTitle}><Filter size={14} /> FILTRES</div>
        <div style={S.formGrid}>
          <label style={S.fieldLabel}>Poste
            <select value={filters.position} onChange={(event) => updateFilter('position', event.target.value)} style={S.textInput}>
              <option value="all">Tous</option>
              {['ATT', 'MIL', 'DEF', 'GK'].map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
          </label>
          <label style={S.fieldLabel}>Pays
            <select value={filters.country} onChange={(event) => updateFilter('country', event.target.value)} style={S.textInput}>
              <option value="all">Tous</option>
              {countries.map((player) => <option key={player.countryCode} value={player.countryCode}>{player.countryFlag} {player.countryLabel}</option>)}
            </select>
          </label>
          <label style={S.fieldLabel}>Budget signature
            <select value={filters.maxCost} onChange={(event) => updateFilter('maxCost', event.target.value)} style={S.textInput}>
              <option value="all">Tous</option>
              <option value="5000">≤ €5k</option>
              <option value="15000">≤ €15k</option>
              <option value="50000">≤ €50k</option>
            </select>
          </label>
          <label style={S.fieldLabel}>Potentiel min.
            <input type="number" min="0" max="99" value={filters.minPotential} onChange={(event) => updateFilter('minPotential', event.target.value)} style={S.textInput} />
          </label>
          <label style={S.fieldLabel}>Tri
            <select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)} style={S.textInput}>
              <option value="rating">Note</option>
              <option value="potential">Potentiel</option>
              <option value="price">Prix</option>
              <option value="age">Âge</option>
            </select>
          </label>
        </div>
      </div>
      <div style={S.cardList}>{filteredMarket.map((player) => (
        <div key={player.id} style={{ position: 'relative' }}>
          <button onClick={() => toggleFavorite(player.id)} style={S.favoriteBtn}>{favoriteIds.includes(player.id) ? '★' : '☆'}</button>
          {player.freeAgent && <div style={S.freeTag}>JOUEUR LIBRE</div>}
          <PlayerCard state={state} player={player} mode="sign" money={money} onSign={() => onSign(player)} onDetails={() => onDetails(player)} />
          {player.scoutReport && (
            <div style={S.scoutCard}>
              <div style={S.secTitle}>RAPPORT SCOUT</div>
              <div style={S.fixtureMeta}>
                Potentiel estimé {player.scoutReport.potentialMin}-{player.scoutReport.potentialMax} · confiance {player.scoutReport.confidence}%
              </div>
            </div>
          )}
        </div>
      ))}</div>
      {!filteredMarket.length && <div style={S.empty}>Aucun joueur ne correspond aux filtres.</div>}
    </div>
  );
}
