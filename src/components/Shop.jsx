import React, { useMemo, useState } from 'react';
import { Coins, Crown, Gem, Lock, PlayCircle, Rocket, ShieldCheck, ShoppingBag, Sparkles, Star, TrendingUp } from 'lucide-react';
import { getAgencyCapacity } from '../systems/agencySystem';
import { GEM_PACKS, NO_ADS_PRODUCT_ID, PREMIUM_PRODUCTS, SHOP_CATEGORIES, SHOP_ITEMS, getShopRuntimeView } from '../systems/shopSystem';
import { formatMoney } from '../utils/format';
import { assetPath } from '../utils/assets';
import { S } from './styles';

const CATEGORY_THEME = {
  finances: {
    chip: '#0f766e',
    chipBg: '#ecfeff',
    border: '#99f6e4',
    gradient: 'linear-gradient(135deg,#0f766e,#14b8a6)',
    label: 'Trésorerie',
  },
  boost: {
    chip: '#2563eb',
    chipBg: '#eff6ff',
    border: '#bfdbfe',
    gradient: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
    label: 'Accélération',
  },
  scouting: {
    chip: '#7c3aed',
    chipBg: '#f5f3ff',
    border: '#ddd6fe',
    gradient: 'linear-gradient(135deg,#6d28d9,#8b5cf6)',
    label: 'Scouting',
  },
  contacts: {
    chip: '#c2410c',
    chipBg: '#fff7ed',
    border: '#fed7aa',
    gradient: 'linear-gradient(135deg,#c2410c,#f97316)',
    label: 'Réseau',
  },
  transfer: {
    chip: '#166534',
    chipBg: '#f0fdf4',
    border: '#bbf7d0',
    gradient: 'linear-gradient(135deg,#166534,#22c55e)',
    label: 'Mercato',
  },
  default: {
    chip: '#334155',
    chipBg: '#f8fafc',
    border: '#cbd5e1',
    gradient: 'linear-gradient(135deg,#1e293b,#334155)',
    label: 'Bonus',
  },
};

const PACK_THEME = {
  gems_starter: { gradient: 'linear-gradient(135deg,#0f172a,#1f2937)', halo: 'rgba(15,23,42,.28)', tag: 'Nouveau' },
  gems_player: { gradient: 'linear-gradient(135deg,#1d4ed8,#2563eb)', halo: 'rgba(37,99,235,.26)', tag: 'Populaire' },
  gems_pro: { gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', halo: 'rgba(124,58,237,.26)', tag: 'Pro' },
  gems_elite: { gradient: 'linear-gradient(135deg,#c2410c,#f97316)', halo: 'rgba(194,65,12,.26)', tag: 'Élite' },
  gems_legend: { gradient: 'linear-gradient(135deg,#14532d,#22c55e)', halo: 'rgba(20,83,45,.26)', tag: 'Légende' },
  remove_ads: { gradient: 'linear-gradient(135deg,#111827,#0f766e)', halo: 'rgba(15,118,110,.24)', tag: 'Premium' },
};

const CATEGORY_ASSET = {
  all: assetPath('tycoon-assets/v_shop.png'),
  finances: assetPath('tycoon-assets/resource_cash.png'),
  boost: assetPath('tycoon-assets/shop_rep_boost.png'),
  scouting: assetPath('tycoon-assets/shop_scout.png'),
  contacts: assetPath('tycoon-assets/v_messages.png'),
  transfer: assetPath('tycoon-assets/shop_negociation.png'),
};

const GEM_PACK_ASSET = {
  gems_starter: assetPath('tycoon-assets/icon_gem_blue.png'),
  gems_player: assetPath('tycoon-assets/icon_gem_blue.png'),
  gems_pro: assetPath('tycoon-assets/icon_gem_purple.png'),
  gems_elite: assetPath('tycoon-assets/icon_gem_purple.png'),
  gems_legend: assetPath('tycoon-assets/icon_gem_purple.png'),
};

const getEffectLabel = (item) => {
  const fx = item?.effect ?? {};
  if (fx.money) return `+${formatMoney(fx.money)} immédiatement`;
  if (fx.reputation) return `+${fx.reputation} réputation`;
  if (fx.incomeBoostWeeks) return `Commissions boostées ${fx.incomeBoostWeeks} semaines`;
  if (fx.negoBoostWeeks) return `Négociation boostée ${fx.negoBoostWeeks} semaines`;
  if (fx.eliteMarketWeeks) return `Marché élite ${fx.eliteMarketWeeks} semaines`;
  if (fx.contactTrustBoost) return `+${fx.contactTrustBoost} confiance contacts`;
  if (fx.action === 'refresh_market') return 'Nouveau marché instantané';
  if (fx.action === 'reveal_potential') return 'Potentiel réel révélé';
  if (fx.action === 'mercato_express') return '1 transfert hors fenêtre';
  if (fx.action === 'skip_contact_cooldowns') return 'Cooldowns contacts supprimés';
  return 'Avantage immédiat';
};

export default function Shop({ state, phase, onBuy, onBuyGemPack, onWatchRewardedAd, iapPendingProductId = null, iapProducts = {} }) {
  const [category, setCategory] = useState('all');
  const gems = state.gems ?? 0;
  const money = state.money ?? 0;
  const reputation = state.reputation ?? 0;
  const rosterCount = state.roster?.length ?? 0;
  const capacity = getAgencyCapacity(state.agencyLevel);
  const shopRuntime = useMemo(() => getShopRuntimeView(state), [state]);

  const items = useMemo(() => {
    if (category === 'all') return SHOP_ITEMS;
    return SHOP_ITEMS.filter((item) => item.category === category);
  }, [category]);

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>BOUTIQUE</div>
        <h1 style={S.eh}>Tycoon Store</h1>
      </div>

      <div style={{
        borderRadius: 8,
        border: '1px solid #dbe3ea',
        padding: 16,
        marginBottom: 14,
        background: 'linear-gradient(135deg,#0f172a,#1e293b)',
        boxShadow: '0 18px 36px rgba(15,23,42,.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.16em', color: 'rgba(255,255,255,.75)', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>
              SALLE DU CONSEIL
            </div>
            <div style={{ fontSize: 22, fontWeight: 950, color: '#ffffff', lineHeight: 1.1 }}>
              Fais grandir ton empire
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,.75)', fontFamily: 'system-ui,sans-serif', lineHeight: 1.45 }}>
              Des boosts concrets pour accélérer ton agence sans casser ton rythme de jeu.
            </div>
          </div>
          <img
            src={assetPath('tycoon-assets/v_shop.png')}
            alt="Boutique"
            style={{ width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 8px 18px rgba(255,214,10,.26))' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
          <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.06)', padding: 10 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.75)', letterSpacing: '.14em', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>CAPITAL</div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#ffffff', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5 }}>
              <img src={assetPath('tycoon-assets/resource_cash.png')} alt="Capital" style={{ width: 14, height: 14, objectFit: 'contain' }} />
              {formatMoney(money)}
            </div>
          </div>
          <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.06)', padding: 10 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.75)', letterSpacing: '.14em', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>GEMMES</div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#ffffff', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5 }}>
              <img src={assetPath('tycoon-assets/resource_coin.png')} alt="Gemmes" style={{ width: 14, height: 14, objectFit: 'contain' }} />
              {gems}
            </div>
          </div>
          <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.06)', padding: 10 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.75)', letterSpacing: '.14em', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>RÉPUTATION</div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#ffffff', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5 }}>
              <img src={assetPath('tycoon-assets/reputation_shield.png')} alt="Réputation" style={{ width: 14, height: 14, objectFit: 'contain' }} />
              {reputation}/1000
            </div>
          </div>
        </div>
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>
          <TrendingUp size={14} />
          <span>PILOTAGE RAPIDE</span>
        </div>
        {phase && <div style={S.sumRow}><span style={S.sumK}>Date</span><strong>S{phase.season} · S{phase.seasonWeek}/38</strong></div>}
        <div style={S.sumRow}><span style={S.sumK}>Effectif géré</span><strong>{rosterCount}/{capacity}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Cycle fidélité</span><strong>{shopRuntime.loyalty.progress}/{shopRuntime.loyalty.target}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Récompense cycle</span><strong>{shopRuntime.loyalty.reward.gems} gemmes + {formatMoney(shopRuntime.loyalty.reward.money)}</strong></div>
        {shopRuntime.firstPurchaseBonusPending && (
          <div style={{ marginTop: 8, borderRadius: 8, background: '#f0fdf8', border: '1px solid #b7ebd6', padding: '9px 10px', fontSize: 11, color: '#0f766e', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>
            Premier achat du jour: bonus immédiat +12 gemmes.
          </div>
        )}
      </div>

      <div style={{
        ...S.objCard,
        border: '1px solid #bae6fd',
        background: 'linear-gradient(135deg,#f0f9ff,#f0fdf8)',
      }}>
        <div style={S.secTitle}>
          <Crown size={14} />
          <span>PUBS & RÉCOMPENSES</span>
        </div>

        {PREMIUM_PRODUCTS.map((product) => {
          const owned = Boolean(shopRuntime.ads.removed);
          const pending = iapPendingProductId === product.id;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => !owned && onBuyGemPack?.(product.id)}
              disabled={owned || pending}
              style={{
                width: '100%',
                border: '1px solid rgba(15,118,110,.25)',
                borderRadius: 8,
                padding: 13,
                marginBottom: 10,
                background: PACK_THEME[NO_ADS_PRODUCT_ID].gradient,
                boxShadow: `0 14px 30px ${PACK_THEME[NO_ADS_PRODUCT_ID].halo}`,
                cursor: owned ? 'default' : pending ? 'wait' : 'pointer',
                opacity: pending ? 0.76 : 1,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div>
                  <div style={{ display: 'inline-flex', padding: '3px 7px', borderRadius: 8, background: 'rgba(255,255,255,.18)', color: '#ffffff', fontSize: 9, letterSpacing: '.12em', fontWeight: 900, fontFamily: 'system-ui,sans-serif', marginBottom: 8 }}>
                    {owned ? 'Activé' : 'Premium'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 950, color: '#ffffff' }}>{product.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.82)', fontFamily: 'system-ui,sans-serif', marginTop: 3, lineHeight: 1.4 }}>
                    {product.desc}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <ShieldCheck size={22} color="#ffffff" style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff' }}>
                    {owned ? 'OK' : (iapProducts[product.id]?.displayPrice ?? product.price)}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: '.14em', color: 'rgba(255,255,255,.8)', fontFamily: 'system-ui,sans-serif' }}>
                    {pending ? 'achat...' : owned ? 'sans pubs' : 'achat in-app'}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        <div style={{ display: 'grid', gap: 8 }}>
          {shopRuntime.ads.rewardOffers.map((offer) => (
            <button
              key={offer.id}
              type="button"
              onClick={() => offer.available && onWatchRewardedAd?.(offer.id)}
              disabled={!offer.available}
              style={{
                border: '1px solid #d7efe5',
                borderRadius: 8,
                padding: '10px 11px',
                background: offer.available ? '#ffffff' : '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                cursor: offer.available ? 'pointer' : 'not-allowed',
                opacity: offer.available ? 1 : 0.58,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ecfeff', border: '1px solid #bae6fd', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <PlayCircle size={18} color="#0284c7" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#172026' }}>{offer.label}</div>
                  <div style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', lineHeight: 1.35 }}>
                    {offer.desc}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 950, color: '#00a676' }}>{offer.rewardLabel}</div>
                <div style={{ marginTop: 2, fontSize: 9, color: '#64727d', letterSpacing: '.08em', fontWeight: 850, fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase' }}>
                  {offer.remaining}/{offer.maxPerDay} aujourd’hui
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>
          <Sparkles size={14} />
          <span>OFFRES DU JOUR</span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {shopRuntime.featuredOffers.map((offer) => (
            <div key={offer.id} style={{ border: '1px solid #d7efe5', background: '#f0fdf8', borderRadius: 8, padding: '9px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={CATEGORY_ASSET[offer.category] ?? assetPath('tycoon-assets/v_shop.png')}
                  alt={offer.label}
                  style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#172026' }}>{offer.label}</div>
                  <div style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>
                    <span style={{ textDecoration: 'line-through', marginRight: 6 }}>{offer.baseCost}</span>
                    <strong style={{ color: '#00a676' }}>{offer.price} gemmes</strong>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.1em', color: '#00a676', fontFamily: 'system-ui,sans-serif' }}>
                -{offer.discountPercent}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>
          <Gem size={14} />
          <span>COFFRES GEMMES</span>
        </div>
        <div style={S.cardList}>
          {GEM_PACKS.map((pack) => (
            <button key={pack.id} type="button" onClick={() => onBuyGemPack?.(pack.id)} disabled={iapPendingProductId === pack.id} style={{
              background: PACK_THEME[pack.id]?.gradient ?? 'linear-gradient(135deg,#1f2937,#334155)',
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: 8,
              padding: 14,
              boxShadow: `0 14px 30px ${PACK_THEME[pack.id]?.halo ?? 'rgba(51,65,85,.24)'}`,
              cursor: iapPendingProductId === pack.id ? 'wait' : 'pointer',
              opacity: iapPendingProductId && iapPendingProductId !== pack.id ? 0.72 : 1,
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ display: 'inline-flex', padding: '3px 7px', borderRadius: 8, background: 'rgba(255,255,255,.18)', color: '#ffffff', fontSize: 9, letterSpacing: '.12em', fontWeight: 900, fontFamily: 'system-ui,sans-serif', marginBottom: 8 }}>
                    {PACK_THEME[pack.id]?.tag ?? 'Pack'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#ffffff' }}>{pack.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.86)', fontFamily: 'system-ui,sans-serif', marginTop: 3 }}>{pack.gems} gemmes · {pack.bonus || 'Sans bonus'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <img
                    src={GEM_PACK_ASSET[pack.id] ?? assetPath('tycoon-assets/icon_gem_blue.png')}
                    alt={pack.label}
                    style={{ width: 20, height: 20, objectFit: 'contain', marginLeft: 'auto', marginBottom: 4 }}
                  />
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff' }}>{iapProducts[pack.id]?.displayPrice ?? pack.price}</div>
                  <div style={{ fontSize: 9, letterSpacing: '.14em', color: 'rgba(255,255,255,.8)', fontFamily: 'system-ui,sans-serif' }}>
                    {iapPendingProductId === pack.id ? 'achat...' : 'achat in-app'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={S.filterChips}>
        {SHOP_CATEGORIES.map((item) => (
          <button
            key={item.id}
            onClick={() => setCategory(item.id)}
            style={{
              ...S.chipBtn,
              background: category === item.id ? '#172026' : '#ffffff',
              color: category === item.id ? '#ffffff' : '#172026',
            }}
          >
            {CATEGORY_ASSET[item.id] && (
              <img src={CATEGORY_ASSET[item.id]} alt={item.label} style={{ width: 14, height: 14, objectFit: 'contain', marginRight: 5, verticalAlign: 'middle' }} />
            )}
            {item.label}
          </button>
        ))}
      </div>

      <div style={S.cardList}>
        {items.map((item) => {
          const isGem = item.currency === 'gems';
          const effectiveCost = shopRuntime.priceByItemId[item.id] ?? item.cost;
          const discountPercent = shopRuntime.discountByItemId[item.id] ?? 0;
          const canBuy = isGem ? gems >= effectiveCost : (state.money ?? 0) >= effectiveCost;
          const theme = CATEGORY_THEME[item.category] ?? CATEGORY_THEME.default;
          return (
            <div
              key={item.id}
              style={{
                background: '#ffffff',
                border: item.highlight ? `1px solid ${theme.border}` : '1px solid #e5eaf0',
                borderRadius: 8,
                padding: 14,
                boxShadow: item.highlight ? '0 14px 32px rgba(15,23,42,.12)' : '0 10px 24px rgba(15,23,32,.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '4px 8px', background: theme.chipBg, border: `1px solid ${theme.border}`, fontSize: 9, letterSpacing: '.12em', fontWeight: 900, color: theme.chip, fontFamily: 'system-ui,sans-serif', marginBottom: 7 }}>
                    {CATEGORY_ASSET[item.category] && (
                      <img src={CATEGORY_ASSET[item.category]} alt={item.category} style={{ width: 13, height: 13, objectFit: 'contain' }} />
                    )}
                    {theme.label}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <img
                      src={CATEGORY_ASSET[item.category] ?? assetPath('tycoon-assets/v_shop.png')}
                      alt={item.label}
                      style={{ width: 22, height: 22, objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#172026' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginTop: 4, lineHeight: 1.45 }}>{item.desc}</div>
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  alignSelf: 'flex-start',
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '.12em',
                  fontFamily: 'system-ui,sans-serif',
                  color: isGem ? '#00a676' : '#2563eb',
                  background: isGem ? '#f0fdf8' : '#eff6ff',
                  border: `1px solid ${isGem ? '#b6f0da' : '#bfdbfe'}`,
                  padding: '3px 8px',
                  borderRadius: 8,
                }}>
                  {isGem ? <Gem size={11} /> : <Coins size={11} />}
                  {isGem
                    ? `${effectiveCost} gemmes`
                    : formatMoney(effectiveCost)}
                  {discountPercent > 0 && (
                    <span style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginLeft: 4, textDecoration: 'line-through' }}>
                      {item.cost}
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                borderRadius: 8,
                border: '1px solid #e5eaf0',
                padding: '8px 10px',
                background: '#f8fafc',
                fontSize: 11,
                color: '#334155',
                fontFamily: 'system-ui,sans-serif',
                fontWeight: 700,
              }}>
                Impact: {getEffectLabel(item)}
              </div>

              <button
                onClick={() => onBuy(item.id)}
                disabled={!canBuy}
                style={{
                  ...S.primaryBtn,
                  background: theme.gradient,
                  marginBottom: 0,
                  padding: '11px 12px',
                  fontSize: 11,
                  opacity: canBuy ? 1 : 0.45,
                  cursor: canBuy ? 'pointer' : 'not-allowed',
                }}
              >
                {canBuy ? <ShoppingBag size={14} /> : <Lock size={14} />}
                <span>{canBuy ? (discountPercent > 0 ? `ACHETER -${discountPercent}%` : 'ACHETER') : 'SOLDE INSUFFISANT'}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ ...S.objCard, marginBottom: 0, background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={15} color="#0f766e" />
          <div style={{ fontSize: 12, fontWeight: 900, color: '#172026' }}>Progression équilibrée</div>
        </div>
        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, fontFamily: 'system-ui,sans-serif' }}>
          Tu peux monter ton agence sans payer. Les achats servent à accélérer les cycles clés: cashflow, réseau et mercato.
        </div>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ borderRadius: 8, border: '1px solid #dbe3ea', background: '#ffffff', padding: '8px 10px', fontSize: 10, color: '#334155', fontFamily: 'system-ui,sans-serif', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Rocket size={12} color="#2563eb" />
            Plus de rythme
          </div>
          <div style={{ borderRadius: 8, border: '1px solid #dbe3ea', background: '#ffffff', padding: '8px 10px', fontSize: 10, color: '#334155', fontFamily: 'system-ui,sans-serif', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={12} color="#ca8a04" />
            Plus d'impact
          </div>
        </div>
      </div>
    </div>
  );
}
