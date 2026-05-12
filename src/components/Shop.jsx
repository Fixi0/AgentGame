import React, { useMemo, useState } from 'react';
import { Coins, Crown, Gem, Lock, PlayCircle, Rocket, ShieldCheck, ShoppingBag, Sparkles, Star, TrendingUp } from 'lucide-react';
import { getAgencyCapacity } from '../systems/agencySystem';
import { GEM_PACKS, NO_ADS_PRODUCT_ID, PREMIUM_PRODUCTS, SHOP_CATEGORIES, SHOP_ITEMS, getShopRuntimeView } from '../systems/shopSystem';
import { formatMoney } from '../utils/format';
import { assetPath } from '../utils/assets';
import { S } from './styles';
import shopHero from '../assets/events/shop-hero.jpg';
import shopFinance from '../assets/events/shop-finance.jpg';
import shopBoost from '../assets/events/shop-boost.jpg';
import shopScouting from '../assets/events/shop-scouting.jpg';
import shopContacts from '../assets/events/shop-contacts.jpg';
import shopTransfer from '../assets/events/shop-transfer.jpg';
import packStarter from '../assets/events/pack-starter.jpg';
import packPlayer from '../assets/events/pack-player.jpg';
import packPro from '../assets/events/pack-pro.jpg';
import packElite from '../assets/events/pack-elite.jpg';
import packLegend from '../assets/events/pack-legend.jpg';
import packNoAds from '../assets/events/pack-noads.jpg';

const PACK_BANNER = {
  gems_starter: packStarter,
  gems_player: packPlayer,
  gems_pro: packPro,
  gems_elite: packElite,
  gems_legend: packLegend,
  remove_ads: packNoAds,
};

const CATEGORY_BANNER = {
  finances: shopFinance,
  boost: shopBoost,
  scouting: shopScouting,
  contacts: shopContacts,
  transfer: shopTransfer,
};

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
    chipBg: 'oklch(28% 0.12 245 / .35)',
    border: '#bfdbfe',
    gradient: 'linear-gradient(135deg,var(--af-cyan),#3b82f6)',
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
    chip: 'var(--af-grass)',
    chipBg: 'oklch(28% 0.10 155 / .35)',
    border: 'var(--af-grass)',
    gradient: 'linear-gradient(135deg,var(--af-grass),#22c55e)',
    label: 'Mercato',
  },
  default: {
    chip: '#334155',
    chipBg: 'var(--af-surface-soft)',
    border: '#cbd5e1',
    gradient: 'linear-gradient(135deg,#1e293b,#334155)',
    label: 'Bonus',
  },
};

const PACK_THEME = {
  gems_starter: { gradient: 'linear-gradient(135deg,#0f172a,#1f2937)', halo: 'rgba(15,23,42,.28)', tag: 'Nouveau' },
  gems_player: { gradient: 'linear-gradient(135deg,var(--af-cyan),#2563eb)', halo: 'rgba(37,99,235,.26)', tag: 'Populaire' },
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
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 14,
        border: '1px solid var(--af-border)',
        boxShadow: '0 18px 36px rgba(15,23,42,.35)',
      }}>
        <img src={shopHero} alt="Boutique" loading="lazy" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,17,31,.20) 0%, rgba(8,17,31,.88) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.78)', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 4 }}>
              SALLE DU CONSEIL
            </div>
            <div style={{ fontSize: 22, fontWeight: 950, color: '#fff', lineHeight: 1.1, textShadow: '0 2px 14px rgba(0,0,0,.5)' }}>
              Fais grandir ton empire
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
            <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(8,17,31,.55)', backdropFilter: 'blur(6px)', padding: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', letterSpacing: '.12em', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>CAPITAL</div>
              <div style={{ marginTop: 3, fontSize: 12, color: '#fff', fontWeight: 900 }}>{formatMoney(money)}</div>
            </div>
            <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(8,17,31,.55)', backdropFilter: 'blur(6px)', padding: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', letterSpacing: '.12em', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>GEMMES</div>
              <div style={{ marginTop: 3, fontSize: 12, color: '#fff', fontWeight: 900 }}>{gems}</div>
            </div>
            <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(8,17,31,.55)', backdropFilter: 'blur(6px)', padding: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', letterSpacing: '.12em', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>RÉPU.</div>
              <div style={{ marginTop: 3, fontSize: 12, color: '#fff', fontWeight: 900 }}>{reputation}/1000</div>
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
          <div style={{ marginTop: 8, borderRadius: 8, background: 'oklch(28% 0.08 158 / .22)', border: '1px solid #b7ebd6', padding: '9px 10px', fontSize: 11, color: '#0f766e', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>
            Premier achat du jour: bonus immédiat +12 gemmes.
          </div>
        )}
      </div>

      <div style={{
        ...S.objCard,
        border: '1px solid oklch(28% 0.10 200 / .55)',
        background: 'linear-gradient(135deg, oklch(20% 0.06 220 / .92), oklch(18% 0.05 200 / .92))',
      }}>
        <div style={S.secTitle}>
          <Crown size={14} />
          <span>PUBS & RÉCOMPENSES</span>
        </div>
        <div style={{ marginBottom: 10, borderRadius: 8, border: '1px solid rgba(125,211,252,.22)', background: 'rgba(8,17,31,.55)', color: 'rgba(255,255,255,.82)', padding: '9px 10px', fontSize: 10, lineHeight: 1.45, fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>
          Pubs automatiques toutes les {shopRuntime.ads.interstitialCadenceLabel}. Le pack premium les retire définitivement.
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
                border: '1px solid rgba(125,211,252,.25)',
                borderRadius: 10,
                padding: 0,
                marginBottom: 10,
                overflow: 'hidden',
                background: PACK_THEME[NO_ADS_PRODUCT_ID].gradient,
                boxShadow: `0 14px 30px ${PACK_THEME[NO_ADS_PRODUCT_ID].halo}`,
                cursor: owned ? 'default' : pending ? 'wait' : 'pointer',
                opacity: pending ? 0.76 : 1,
                textAlign: 'left',
                position: 'relative',
              }}
            >
              <div style={{ position: 'relative', height: 78 }}>
                <img src={packNoAds} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.10) 0%, rgba(8,17,31,.75) 100%)' }} />
                <div style={{ position: 'absolute', top: 8, left: 10, display: 'inline-flex', padding: '3px 8px', borderRadius: 8, background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: 9, letterSpacing: '.14em', fontWeight: 900, fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase' }}>
                  {owned ? 'Activé' : 'Premium'}
                </div>
                <ShieldCheck size={22} color="#7dd3fc" style={{ position: 'absolute', top: 8, right: 10, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.6))' }} />
              </div>
              <div style={{ padding: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 950, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,.45)' }}>{product.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.86)', fontFamily: 'system-ui,sans-serif', marginTop: 3, lineHeight: 1.4 }}>
                    {product.desc}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,.45)' }}>
                    {owned ? 'OK' : (iapProducts[product.id]?.displayPrice ?? product.price)}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: '.14em', color: 'rgba(255,255,255,.85)', fontFamily: 'system-ui,sans-serif' }}>
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
                border: '1px solid var(--af-border)',
                borderRadius: 8,
                padding: '10px 11px',
                background: offer.available ? 'oklch(18% 0.035 258 / .92)' : 'oklch(16% 0.03 258 / .65)',
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
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'oklch(28% 0.10 220 / .35)', border: '1px solid oklch(35% 0.10 220 / .55)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <PlayCircle size={18} color="#7dd3fc" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--af-text)' }}>{offer.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', lineHeight: 1.35 }}>
                    {offer.desc}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 950, color: '#00a676' }}>{offer.rewardLabel}</div>
                <div style={{ marginTop: 2, fontSize: 9, color: 'var(--af-muted)', letterSpacing: '.08em', fontWeight: 850, fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase' }}>
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
            <div key={offer.id} style={{ border: '1px solid #d7efe5', background: 'oklch(28% 0.08 158 / .22)', borderRadius: 8, padding: '9px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={CATEGORY_ASSET[offer.category] ?? assetPath('tycoon-assets/v_shop.png')}
                  alt={offer.label}
                  style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--af-text)' }}>{offer.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>
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
          {GEM_PACKS.map((pack) => {
            const banner = PACK_BANNER[pack.id];
            return (
            <button key={pack.id} type="button" onClick={() => onBuyGemPack?.(pack.id)} disabled={iapPendingProductId === pack.id} style={{
              background: PACK_THEME[pack.id]?.gradient ?? 'linear-gradient(135deg,#1f2937,#334155)',
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: 10,
              padding: 0,
              overflow: 'hidden',
              boxShadow: `0 14px 30px ${PACK_THEME[pack.id]?.halo ?? 'rgba(51,65,85,.24)'}`,
              cursor: iapPendingProductId === pack.id ? 'wait' : 'pointer',
              opacity: iapPendingProductId && iapPendingProductId !== pack.id ? 0.72 : 1,
              textAlign: 'left',
              position: 'relative',
            }}>
              {banner && (
                <div style={{ position: 'relative', height: 88 }}>
                  <img src={banner} alt={pack.label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,.10) 0%, ${PACK_THEME[pack.id]?.halo ?? 'rgba(0,0,0,.6)'} 100%)` }} />
                  <div style={{ position: 'absolute', top: 8, left: 10, display: 'inline-flex', padding: '3px 8px', borderRadius: 8, background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: 9, letterSpacing: '.14em', fontWeight: 900, fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase' }}>
                    {PACK_THEME[pack.id]?.tag ?? 'Pack'}
                  </div>
                  <img
                    src={GEM_PACK_ASSET[pack.id] ?? assetPath('tycoon-assets/icon_gem_blue.png')}
                    alt=""
                    style={{ position: 'absolute', top: 8, right: 10, width: 26, height: 26, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.6))' }}
                  />
                </div>
              )}
              <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 950, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,.45)' }}>{pack.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.92)', fontFamily: 'system-ui,sans-serif', marginTop: 3 }}>{pack.gems} gemmes · {pack.bonus || 'Sans bonus'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,.45)' }}>{iapProducts[pack.id]?.displayPrice ?? pack.price}</div>
                  <div style={{ fontSize: 9, letterSpacing: '.14em', color: 'rgba(255,255,255,.85)', fontFamily: 'system-ui,sans-serif' }}>
                    {iapPendingProductId === pack.id ? 'achat...' : 'achat in-app'}
                  </div>
                </div>
              </div>
            </button>
            );
          })}
        </div>
      </div>

      <div style={S.filterChips}>
        {SHOP_CATEGORIES.map((item) => (
          <button
            key={item.id}
            onClick={() => setCategory(item.id)}
            style={{
              ...S.chipBtn,
              background: category === item.id ? 'var(--af-grass)' : 'var(--af-surface)',
              color: category === item.id ? '#08111f' : 'var(--af-text)',
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
          const banner = CATEGORY_BANNER[item.category];
          return (
            <div
              key={item.id}
              style={{
                background: 'oklch(18% 0.035 258 / .92)',
                border: item.highlight ? `1px solid ${theme.border}` : '1px solid var(--af-border)',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: item.highlight ? '0 14px 32px rgba(15,23,42,.18)' : '0 10px 24px rgba(15,23,32,.10)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {banner && (
                <div style={{ position: 'relative', height: 90 }}>
                  <img src={banner} alt={item.label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,17,31,.10) 0%, rgba(8,17,31,.78) 100%)' }} />
                  <div style={{ position: 'absolute', left: 10, bottom: 8, display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 8, padding: '3px 8px', background: 'rgba(0,0,0,.55)', fontSize: 9, letterSpacing: '.12em', fontWeight: 900, color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
                    {theme.label}
                  </div>
                </div>
              )}
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--af-text)' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', marginTop: 4, lineHeight: 1.45 }}>{item.desc}</div>
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
                  background: isGem ? 'oklch(28% 0.10 155 / .35)' : 'oklch(28% 0.12 245 / .35)',
                  border: `1px solid ${isGem ? '#b6f0da' : '#bfdbfe'}`,
                  padding: '3px 8px',
                  borderRadius: 8,
                }}>
                  {isGem ? <Gem size={11} /> : <Coins size={11} />}
                  {isGem
                    ? `${effectiveCost} gemmes`
                    : formatMoney(effectiveCost)}
                  {discountPercent > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', marginLeft: 4, textDecoration: 'line-through' }}>
                      {item.cost}
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                borderRadius: 8,
                border: '1px solid var(--af-border)',
                padding: '8px 10px',
                background: 'oklch(16% 0.035 258 / .78)',
                fontSize: 11,
                color: 'var(--af-muted)',
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
            </div>
          );
        })}
      </div>

      <div style={{ ...S.objCard, marginBottom: 0, background: 'linear-gradient(135deg, oklch(20% 0.04 200 / .92), oklch(18% 0.04 158 / .92))', border: '1px solid oklch(28% 0.08 200 / .55)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={15} color="#5eead4" />
          <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--af-text)' }}>Progression équilibrée</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--af-muted)', lineHeight: 1.5, fontFamily: 'system-ui,sans-serif' }}>
          Tu peux monter ton agence sans payer. Les achats servent à accélérer les cycles clés: cashflow, réseau et mercato.
        </div>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ borderRadius: 8, border: '1px solid var(--af-border)', background: 'oklch(18% 0.035 258 / .92)', padding: '8px 10px', fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Rocket size={12} color="#2563eb" />
            Plus de rythme
          </div>
          <div style={{ borderRadius: 8, border: '1px solid var(--af-border)', background: 'oklch(18% 0.035 258 / .92)', padding: '8px 10px', fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={12} color="#ca8a04" />
            Plus d'impact
          </div>
        </div>
      </div>
    </div>
  );
}
