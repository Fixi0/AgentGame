import { Filter, Search, UserRound, Flame, Sparkles, Wallet, Shield } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { MARKET_REFRESH_COST } from '../game/economy';
import { getPlayerProfileSummary } from '../systems/playerProfileSystem';
import { createPlayerCatalog } from '../data/squadDatabase';
import { CLUBS, COUNTRIES } from '../data/clubs';
import { normalizeAgencyReputation } from '../systems/reputationSystem';
import { formatMoney } from '../utils/format';
import PlayerDossier from './PlayerDossier';
import CardPlayer from './CardPlayer';
import { S } from './styles';

const fullName = (player = {}) => `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();

function MarketCard({ player, money, onSign, onDetails }) {
  const cost = player.signingCost ?? 0;
  const canSign = money >= cost;

  return (
    <article
      className="af-glass"
      style={{
        padding: 6,
        position: 'relative',
        borderRadius: 12,
      }}
    >
      <CardPlayer player={player} onOpen={onDetails} size="compact" />
      <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--af-muted)', fontSize: 9, fontWeight: 900, letterSpacing: '.1em' }}>
            <Wallet size={10} /> PRIX
          </span>
          <strong style={{ color: 'var(--af-text)', fontSize: 13, fontWeight: 950 }}>{formatMoney(cost)}</strong>
        </div>
        <button
          type="button"
          onClick={onSign}
          disabled={!canSign}
          style={{
            padding: '8px 10px',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '.08em',
            background: canSign ? 'linear-gradient(135deg, #14b8a6, #2dd4bf)' : 'transparent',
            color: canSign ? '#031311' : 'var(--af-dim)',
            border: '1px solid var(--af-border)',
            borderRadius: 8,
            cursor: canSign ? 'pointer' : 'not-allowed',
          }}
        >
          {canSign ? 'RECRUTER' : 'BUDGET COURT'}
        </button>
      </div>
    </article>
  );
}

const QUICK_FILTERS = [
  { key: 'all',     label: 'Tous',      icon: null },
  { key: 'hot',     label: 'Top',       icon: Flame,     test: (p) => (p.rating ?? 0) >= 80 },
  { key: 'pepite',  label: 'Pépites',   icon: Sparkles,  test: (p) => (p.age ?? 99) <= 21 && (p.rating ?? 0) >= 68 && (p.rating ?? 0) <= 145 },
  { key: 'cheap',   label: 'Petit prix',icon: Wallet,    test: (p) => (p.signingCost ?? 0) <= 6000 },
  { key: 'free',    label: 'Libres',    icon: Shield,    test: (p) => p.freeAgent },
];

export default function Market({ state, market, freeAgents = [], money, onSign, onRefresh, onDetails }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [filters, setFilters] = useState({ position: 'all', country: 'all', league: 'all', club: 'all', profile: 'all', maxCost: 'all', sort: 'rating', quick: 'all' });
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const season = state?.season ?? 1;
  const recommendations = useMemo(
    () => Array.from(new Map([...freeAgents, ...market].filter(Boolean).map((player) => [player.id, player])).values()).slice(0, 12),
    [freeAgents, market],
  );
  const catalogPlayers = useMemo(() => createPlayerCatalog(season), [season]);
  const clubMap = useMemo(() => new Map(CLUBS.map((club) => [club.name, club])), []);
  const leagueMap = useMemo(() => new Map(COUNTRIES.map((country) => [country.code, country])), []);
  const allPlayers = useMemo(() => {
    const merged = [...recommendations, ...catalogPlayers].filter(Boolean).map((player) => {
      const clubMeta = clubMap.get(player.club);
      const leagueCode = player.clubCountryCode ?? clubMeta?.countryCode ?? player.countryCode;
      const league = leagueMap.get(leagueCode);
      return {
        ...player,
        leagueCode,
        leagueLabel: league?.label ?? player.countryLabel ?? 'International',
      };
    });
    return Array.from(new Map(merged.map((player) => [player.id, player])).values());
  }, [recommendations, catalogPlayers, clubMap, leagueMap]);
  const countries = useMemo(() => [...new Map(allPlayers.map((player) => [player.countryCode, player])).values()], [allPlayers]);
  const leagues = useMemo(() => [...new Map(allPlayers.map((player) => [player.leagueCode, { code: player.leagueCode, label: player.leagueLabel }])).values()].filter((league) => league.code), [allPlayers]);
  const clubs = useMemo(() => [...new Map(allPlayers.map((player) => [player.club, player])).values()].sort((a, b) => (a.club ?? '').localeCompare(b.club ?? '')), [allPlayers]);
  const profileOptions = useMemo(() => {
    const profiles = allPlayers.map((player) => player.playerProfile ?? getPlayerProfileSummary(player));
    return [...new Map(profiles.map((profile) => [profile.id, profile])).values()];
  }, [allPlayers]);

  const quickFilter = QUICK_FILTERS.find((f) => f.key === filters.quick);
  const search = query.trim().toLowerCase();

  const repNorm = normalizeAgencyReputation(state?.reputation ?? 0);
  const ratingCeiling = 130 + Math.floor(repNorm * 0.6) + ((state?.office?.scoutLevel ?? 0) * 6);
  const isOpenMarketView = Boolean(
    search
    || filters.club !== 'all'
    || filters.league !== 'all'
    || filters.country !== 'all'
    || filters.position !== 'all'
    || filters.profile !== 'all'
    || filters.maxCost !== 'all'
    || filters.quick !== 'all',
  );
  const sourcePool = isOpenMarketView ? allPlayers : recommendations;
  const filteredMarket = sourcePool
    .filter((player) => {
      const profile = player.playerProfile ?? getPlayerProfileSummary(player);
      const searchable = `${fullName(player)} ${player.club} ${player.clubDisplay ?? ''} ${player.position} ${player.roleShort ?? ''} ${player.roleLabel ?? ''} ${player.countryLabel ?? ''} ${player.leagueLabel ?? ''}`.toLowerCase();
      if (search && !searchable.includes(search)) return false;
      if (filters.position !== 'all' && player.position !== filters.position) return false;
      if (filters.country !== 'all' && player.countryCode !== filters.country) return false;
      if (filters.league !== 'all' && player.leagueCode !== filters.league) return false;
      if (filters.club !== 'all' && player.club !== filters.club) return false;
      if (filters.profile !== 'all' && profile.id !== filters.profile) return false;
      if (filters.maxCost !== 'all' && player.signingCost > Number(filters.maxCost)) return false;
      if (quickFilter?.test && !quickFilter.test(player)) return false;
      return true;
    })
    .map((player) => {
      const inRecommendations = recommendations.some((item) => item.id === player.id);
      if (inRecommendations) return player;
      const reachable = (player.rating ?? 0) <= ratingCeiling;
      const repPenalty = Math.max(0, (player.rating ?? 0) - ratingCeiling) * 60;
      const rating = Number(player.rating ?? 0);
      const valueBasedFloor = Math.floor(Math.max(3500, rating * rating * 1.25));
      return {
        ...player,
        fromSearch: true,
        reachable,
        signingCost: Math.max(valueBasedFloor, Math.floor((player.signingCost ?? player.value ?? 5000) * (reachable ? 1 : 1.4)) + repPenalty),
      };
    })
    .sort((a, b) => {
      if (filters.sort === 'price') return (a.signingCost ?? 0) - (b.signingCost ?? 0);
      if (filters.sort === 'age') return (a.age ?? 99) - (b.age ?? 99);
      if (filters.sort === 'club') return (a.club ?? '').localeCompare(b.club ?? '');
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

  const visibleMarket = isOpenMarketView
    ? filteredMarket.slice(0, 48)
    : filteredMarket.slice(0, 12);
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
      <div style={{ display: 'grid', gap: 14, marginBottom: 14 }}>
        <div>
          <div className="af-kicker">Marché des talents</div>
          <h1 className="af-title">Recruter</h1>
          <p style={{ color: 'var(--af-muted)', margin: '8px 0 0', lineHeight: 1.5, fontSize: 13 }}>
            {filteredMarket.length} joueur{filteredMarket.length > 1 ? 's' : ''} trouvés · {recommendations.length} recommandations · budget {formatMoney(money)}
          </p>
        </div>

        {isFirstRecruit && (
          <div className="af-panel" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--af-grass)', marginBottom: 6, letterSpacing: '.12em', textTransform: 'uppercase' }}>Premier recrutement</div>
            <div style={{ fontSize: 12, color: 'var(--af-muted)', lineHeight: 1.5 }}>
              Choisis un joueur, ouvre son dossier si besoin, puis lance le recrutement.
            </div>
          </div>
        )}
      </div>

      {/* Recherche + chips */}
      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--af-dim)' }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => {
              if (window.visualViewport && window.visualViewport.scale !== 1) {
                window.scrollTo({ top: window.scrollY, behavior: 'instant' });
              }
            }}
            placeholder="Recherche mondiale : nom, club, championnat, pays, poste…"
            style={{ ...S.textInput, width: '100%', paddingLeft: 34, fontSize: 16 }}
          />
        </div>

        <div className="af-panel" style={{ padding: '12px 14px', display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--af-text)', fontSize: 11, fontWeight: 900, letterSpacing: '.08em' }}>
            <Sparkles size={13} /> RECOMMANDATIONS DU MOMENT
          </div>
          <div style={{ color: 'var(--af-muted)', fontSize: 12, lineHeight: 1.45 }}>
            La liste du haut sert de vitrine. Les filtres et la recherche te donnent accès à toute la base.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {QUICK_FILTERS.map(({ key, label, icon: Icon }) => {
            const active = filters.quick === key;
            return (
              <button
                key={key}
                onClick={() => updateFilter('quick', key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '8px 12px', borderRadius: 20, whiteSpace: 'nowrap',
                  fontSize: 11, fontWeight: 900, letterSpacing: '.06em',
                  border: `1px solid ${active ? 'var(--af-grass)' : 'var(--af-border)'}`,
                  background: active ? 'var(--af-grass)' : 'var(--af-surface)',
                  color: active ? '#0b0f14' : 'var(--af-text)',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                {Icon && <Icon size={12} />} {label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowAdvanced((v) => !v)} className="af-btn-secondary" style={{ padding: '9px 12px', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Filter size={12} /> {showAdvanced ? 'Masquer filtres' : 'Filtres avancés'}
          </button>
          <button onClick={onRefresh} className="af-btn-secondary" style={{ padding: '9px 12px', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <Search size={12} /> Rafraîchir · {formatMoney(MARKET_REFRESH_COST)}
          </button>
        </div>

        {showAdvanced && (
          <div className="af-panel" style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 9 }}>
            <select value={filters.position} onChange={(e) => updateFilter('position', e.target.value)} style={{ ...S.textInput, fontSize: 16 }}>
              <option value="all">Tous postes</option>
              {['ATT', 'MIL', 'DEF', 'GK'].map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
            <select value={filters.league} onChange={(e) => { updateFilter('league', e.target.value); updateFilter('club', 'all'); }} style={{ ...S.textInput, fontSize: 16 }}>
              <option value="all">Tous championnats</option>
              {leagues.map((league) => <option key={league.code} value={league.code}>{league.label}</option>)}
            </select>
            <select value={filters.club} onChange={(e) => updateFilter('club', e.target.value)} style={{ ...S.textInput, fontSize: 16 }}>
              <option value="all">Tous clubs</option>
              {clubs
                .filter((player) => filters.league === 'all' || player.leagueCode === filters.league)
                .map((player) => <option key={player.club} value={player.club}>{player.clubDisplay ?? player.club}</option>)}
            </select>
            <select value={filters.country} onChange={(e) => updateFilter('country', e.target.value)} style={{ ...S.textInput, fontSize: 16 }}>
              <option value="all">Tous pays</option>
              {countries.map((player) => <option key={player.countryCode} value={player.countryCode}>{player.countryLabel}</option>)}
            </select>
            <select value={filters.profile} onChange={(e) => updateFilter('profile', e.target.value)} style={{ ...S.textInput, fontSize: 16 }}>
              <option value="all">Tous profils</option>
              {profileOptions.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
            </select>
            <select value={filters.maxCost} onChange={(e) => updateFilter('maxCost', e.target.value)} style={{ ...S.textInput, fontSize: 16 }}>
              <option value="all">Budget libre</option>
              <option value="5000">5 k max</option>
              <option value="15000">15 k max</option>
              <option value="50000">50 k max</option>
            </select>
            <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)} style={{ ...S.textInput, fontSize: 16 }}>
              <option value="rating">Trier · Note</option>
              <option value="price">Trier · Prix</option>
              <option value="age">Trier · Âge</option>
              <option value="club">Trier · Club</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {visibleMarket.map((player) => (
          <MarketCard key={player.id} player={player} money={money} onSign={() => onSign(player)} onDetails={(openedPlayer) => setSelectedPlayer(openedPlayer ?? player)} />
        ))}
      </div>

      {filteredMarket.length > visibleMarket.length && (
        <div className="af-panel" style={{ padding: 14, marginTop: 12, color: 'var(--af-muted)', fontSize: 12, lineHeight: 1.45 }}>
          {visibleMarket.length} profils affichés sur {filteredMarket.length}. {search.length >= 2 || filters.club !== 'all' || filters.league !== 'all' ? 'Vue ouverte du marché — les joueurs hors portée coûteront plus cher selon ta réputation.' : 'Tape un nom ou filtre un club comme Marseille pour voir toute sa base.'}
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
