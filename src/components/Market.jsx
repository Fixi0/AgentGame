import { Filter, Search, UserRound, Star, Flame, Sparkles, TrendingUp, Wallet, Shield, Globe } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { MARKET_REFRESH_COST } from '../game/economy';
import { getPlayerProfileSummary } from '../systems/playerProfileSystem';
import { createPlayerCatalog } from '../data/squadDatabase';
import { normalizeAgencyReputation } from '../systems/reputationSystem';
import { formatMoney } from '../utils/format';
import { getPlayerStarsText } from '../utils/playerStars';
import { getPlayerPortrait } from '../utils/playerPortraits';
import PlayerDossier from './PlayerDossier';
import { S } from './styles';

const fullName = (player = {}) => `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();

const POS_THEME = {
  ATT: { color: '#ef4444', bg: 'oklch(40% 0.18 25 / .35)', label: 'ATT' },
  MIL: { color: '#22d3ee', bg: 'oklch(40% 0.13 200 / .35)', label: 'MIL' },
  DEF: { color: '#a78bfa', bg: 'oklch(40% 0.15 290 / .35)', label: 'DEF' },
  GK:  { color: '#facc15', bg: 'oklch(40% 0.14 80 / .35)',  label: 'GK' },
};

// Surface des badges contextuels — donne envie d'ouvrir / signer
const computeBadges = (player) => {
  const b = [];
  const age = player.age ?? 25;
  const rating = player.rating ?? 0;
  const value = player.value ?? 0;
  const cost = player.signingCost ?? 0;
  if (player.fromSearch) b.push({ icon: Globe, label: player.reachable === false ? 'HORS PORTÉE' : 'DÉCOUVERT', color: player.reachable === false ? '#f97316' : '#a78bfa' });
  if (age <= 21 && rating >= 70) b.push({ icon: Sparkles, label: 'PÉPITE', color: '#22d3ee' });
  if (cost > 0 && value >= cost * 1.6) b.push({ icon: TrendingUp, label: 'BONNE AFFAIRE', color: '#10b981' });
  if (player.freeAgent) b.push({ icon: Shield, label: 'AGENT LIBRE', color: '#facc15' });
  if (rating >= 82) b.push({ icon: Flame, label: 'TOP', color: '#ef4444' });
  return b.slice(0, 2);
};

function MarketCard({ player, money, onSign, onDetails }) {
  const cost = player.signingCost ?? 0;
  const canSign = money >= cost;
  const profile = player.playerProfile ?? getPlayerProfileSummary(player);
  const pos = POS_THEME[player.position] ?? { color: '#94a3b8', bg: 'oklch(40% 0.02 250 / .35)', label: player.position ?? '—' };
  const badges = computeBadges(player);
  const budgetPct = money > 0 ? Math.min(100, Math.round((cost / money) * 100)) : 100;
  const barColor = budgetPct < 40 ? '#10b981' : budgetPct < 80 ? '#facc15' : '#ef4444';

  return (
    <article
      className="af-panel"
      style={{
        padding: 0,
        display: 'grid',
        gap: 0,
        overflow: 'hidden',
        position: 'relative',
        borderTop: `3px solid ${pos.color}`,
        background: `linear-gradient(180deg, ${pos.bg} 0%, var(--af-surface) 60%)`,
      }}
    >
      {/* Header — portrait + identité + étoiles */}
      <button
        type="button"
        onClick={onDetails}
        style={{
          border: 0, padding: '14px 14px 10px', background: 'transparent',
          display: 'grid', gridTemplateColumns: '72px 1fr', gap: 12,
          textAlign: 'left', cursor: 'pointer', alignItems: 'start', width: '100%',
        }}
      >
        <div style={{
          width: 72, height: 72, borderRadius: 10, position: 'relative',
          overflow: 'hidden', background: 'oklch(18% 0.02 250)',
          boxShadow: `inset 0 0 0 2px ${pos.color}66`,
        }}>
          <img
            src={getPlayerPortrait(player)}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: `linear-gradient(180deg, transparent, ${pos.color}ee)`,
            color: '#0b0f14', fontSize: 9, fontWeight: 950,
            padding: '8px 4px 3px', textAlign: 'center', letterSpacing: '.12em',
          }}>{pos.label}</div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--af-text)', fontSize: 17, fontWeight: 950, letterSpacing: '-.03em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fullName(player)}
          </div>
          <div style={{ color: 'var(--af-muted)', fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player.club || 'Libre'} · {player.age ?? '—'} ans · {player.countryLabel}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <Star size={13} fill={pos.color} stroke="none" />
            <span style={{ color: pos.color, fontSize: 13, fontWeight: 900, letterSpacing: '.06em' }}>
              {getPlayerStarsText(player.rating)}
            </span>
          </div>
        </div>
      </button>

      {/* Badges contextuels */}
      {badges.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 14px 8px', flexWrap: 'wrap' }}>
          {badges.map(({ icon: Icon, label, color }) => (
            <span key={label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 9, fontWeight: 900, letterSpacing: '.1em',
              color, background: `${color}1a`, border: `1px solid ${color}55`,
              padding: '3px 7px', borderRadius: 4,
            }}>
              <Icon size={10} /> {label}
            </span>
          ))}
        </div>
      )}

      {/* Profil joueur */}
      <div style={{ padding: '0 14px 10px', color: 'var(--af-dim)', fontSize: 11, lineHeight: 1.4 }}>
        {profile.label}
      </div>

      {/* Prix + budget bar */}
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--af-muted)', fontSize: 10, fontWeight: 900, letterSpacing: '.12em' }}>
            <Wallet size={11} /> SIGNATURE
          </span>
          <strong style={{ color: 'var(--af-text)', fontSize: 17, fontWeight: 950 }}>{formatMoney(cost)}</strong>
        </div>
        <div style={{ height: 4, background: 'oklch(20% 0.02 250 / .6)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${budgetPct}%`, height: '100%', background: barColor, transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--af-dim)' }}>
          <span>{budgetPct}% de ton budget</span>
          <span>Valeur {formatMoney(player.value ?? 0)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '1px solid var(--af-border)' }}>
        <button type="button" onClick={onDetails} style={{
          padding: '13px 10px', fontSize: 11, fontWeight: 900, letterSpacing: '.08em',
          background: 'transparent', border: 0, borderRight: '1px solid var(--af-border)',
          color: 'var(--af-text)', cursor: 'pointer',
        }}>
          DOSSIER
        </button>
        <button
          type="button"
          onClick={onSign}
          disabled={!canSign}
          style={{
            padding: '13px 10px', fontSize: 11, fontWeight: 900, letterSpacing: '.08em',
            background: canSign ? `linear-gradient(135deg, ${pos.color}, ${pos.color}dd)` : 'transparent',
            color: canSign ? '#0b0f14' : 'var(--af-dim)',
            border: 0, cursor: canSign ? 'pointer' : 'not-allowed',
          }}
        >
          {canSign ? '⚡ RECRUTER' : 'BUDGET COURT'}
        </button>
      </div>
    </article>
  );
}

const QUICK_FILTERS = [
  { key: 'all',     label: 'Tous',      icon: null },
  { key: 'hot',     label: 'Top',       icon: Flame,     test: (p) => (p.rating ?? 0) >= 80 },
  { key: 'pepite',  label: 'Pépites',   icon: Sparkles,  test: (p) => (p.age ?? 99) <= 21 && (p.rating ?? 0) >= 68 },
  { key: 'cheap',   label: 'Petit prix',icon: Wallet,    test: (p) => (p.signingCost ?? 0) <= 6000 },
  { key: 'free',    label: 'Libres',    icon: Shield,    test: (p) => p.freeAgent },
];

export default function Market({ state, market, freeAgents = [], money, onSign, onRefresh, onDetails }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [filters, setFilters] = useState({ position: 'all', country: 'all', profile: 'all', maxCost: 'all', sort: 'rating', quick: 'all' });
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const allPlayers = useMemo(() => [...freeAgents, ...market].filter(Boolean).slice(0, 80), [freeAgents, market]);
  const countries = useMemo(() => [...new Map(allPlayers.map((player) => [player.countryCode, player])).values()], [allPlayers]);
  const profileOptions = useMemo(() => {
    const profiles = allPlayers.map((player) => player.playerProfile ?? getPlayerProfileSummary(player));
    return [...new Map(profiles.map((profile) => [profile.id, profile])).values()];
  }, [allPlayers]);

  const quickFilter = QUICK_FILTERS.find((f) => f.key === filters.quick);
  const search = query.trim().toLowerCase();

  // Recherche globale style FIFA/FM : dès qu'on tape, on étend au catalogue complet
  const season = state?.season ?? 1;
  const repNorm = normalizeAgencyReputation(state?.reputation ?? 0);
  const ratingCeiling = 130 + Math.floor(repNorm * 0.6) + ((state?.office?.scoutLevel ?? 0) * 6);
  const knownIds = useMemo(() => new Set(allPlayers.map((p) => p.id)), [allPlayers]);
  const discovered = useMemo(() => {
    if (search.length < 2) return [];
    const catalog = createPlayerCatalog(season);
    return catalog
      .filter((p) => !knownIds.has(p.id))
      .filter((p) => `${p.firstName} ${p.lastName} ${p.club} ${p.position} ${p.countryLabel ?? ''}`.toLowerCase().includes(search))
      .slice(0, 40)
      .map((p) => {
        const reachable = (p.rating ?? 0) <= ratingCeiling;
        const repPenalty = Math.max(0, (p.rating ?? 0) - ratingCeiling) * 60;
        return {
          ...p,
          fromSearch: true,
          reachable,
          signingCost: Math.max(2000, Math.floor((p.signingCost ?? p.value ?? 5000) * (reachable ? 1 : 1.4)) + repPenalty),
        };
      });
  }, [search, season, knownIds, ratingCeiling]);

  const pool = [...allPlayers, ...discovered];

  const filteredMarket = pool
    .filter((player) => {
      const profile = player.playerProfile ?? getPlayerProfileSummary(player);
      if (search && !`${fullName(player)} ${player.club} ${player.position}`.toLowerCase().includes(search)) return false;
      if (filters.position !== 'all' && player.position !== filters.position) return false;
      if (filters.country !== 'all' && player.countryCode !== filters.country) return false;
      if (filters.profile !== 'all' && profile.id !== filters.profile) return false;
      if (filters.maxCost !== 'all' && player.signingCost > Number(filters.maxCost)) return false;
      if (quickFilter?.test && !quickFilter.test(player)) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === 'price') return (a.signingCost ?? 0) - (b.signingCost ?? 0);
      if (filters.sort === 'age') return (a.age ?? 99) - (b.age ?? 99);
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

  const visibleMarket = search.length >= 2 ? filteredMarket.slice(0, 30) : filteredMarket.slice(0, 12);
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
            {filteredMarket.length} joueur{filteredMarket.length > 1 ? 's' : ''} · budget {formatMoney(money)}
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
            placeholder="Recherche mondiale : nom, club, pays, poste…"
            style={{ ...S.textInput, width: '100%', paddingLeft: 34 }}
          />
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
            <select value={filters.position} onChange={(e) => updateFilter('position', e.target.value)} style={S.textInput}>
              <option value="all">Tous postes</option>
              {['ATT', 'MIL', 'DEF', 'GK'].map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
            <select value={filters.country} onChange={(e) => updateFilter('country', e.target.value)} style={S.textInput}>
              <option value="all">Tous pays</option>
              {countries.map((player) => <option key={player.countryCode} value={player.countryCode}>{player.countryLabel}</option>)}
            </select>
            <select value={filters.profile} onChange={(e) => updateFilter('profile', e.target.value)} style={S.textInput}>
              <option value="all">Tous profils</option>
              {profileOptions.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
            </select>
            <select value={filters.maxCost} onChange={(e) => updateFilter('maxCost', e.target.value)} style={S.textInput}>
              <option value="all">Budget libre</option>
              <option value="5000">5 k max</option>
              <option value="15000">15 k max</option>
              <option value="50000">50 k max</option>
            </select>
            <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)} style={S.textInput}>
              <option value="rating">Trier · Note</option>
              <option value="price">Trier · Prix</option>
              <option value="age">Trier · Âge</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {visibleMarket.map((player) => (
          <MarketCard key={player.id} player={player} money={money} onSign={() => onSign(player)} onDetails={() => setSelectedPlayer(player)} />
        ))}
      </div>

      {filteredMarket.length > visibleMarket.length && (
        <div className="af-panel" style={{ padding: 14, marginTop: 12, color: 'var(--af-muted)', fontSize: 12, lineHeight: 1.45 }}>
          {visibleMarket.length} profils affichés sur {filteredMarket.length}. {search.length >= 2 ? 'Recherche mondiale active — les joueurs hors portée coûteront plus cher selon ta réputation.' : 'Tape un nom pour fouiller le catalogue mondial.'}
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
