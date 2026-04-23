import React, { useMemo, useState } from 'react';
import { Coins, Gem, Lock, ShoppingBag, Sparkles, Star } from 'lucide-react';
import { getAgencyCapacity } from '../systems/agencySystem';
import { GEM_PACKS, SHOP_CATEGORIES, SHOP_ITEMS, getShopRuntimeView } from '../systems/shopSystem';
import { formatMoney } from '../utils/format';
import { S } from './styles';

export default function Shop({ state, phase, onBuy }) {
  const [category, setCategory] = useState('all');
  const gems = state.gems ?? 0;
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
        <h1 style={S.eh}>Gemmes & bonus</h1>
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>
          <Sparkles size={14} />
          <span>APERÇU RAPIDE</span>
        </div>
        {phase && <div style={S.sumRow}><span style={S.sumK}>Date</span><strong>S{phase.season} · S{phase.seasonWeek}/38</strong></div>}
        <div style={S.sumRow}><span style={S.sumK}>Joueurs</span><strong>{rosterCount}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Capacité</span><strong>{rosterCount}/${capacity}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Gemmes</span><strong>{gems}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Argent</span><strong>{formatMoney(state.money ?? 0)}</strong></div>
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>
          <Gem size={14} />
          <span>SOLDE ACTUEL</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 950, color: '#00a676', marginBottom: 6 }}>{gems}</div>
        <div style={{ ...S.qSub, lineHeight: 1.5 }}>
          Les gemmes se gagnent en jouant: objectifs de saison, jalons, résultats et petites récompenses de progression.
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
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#172026' }}>{offer.icon} {offer.label}</div>
                <div style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>
                  <span style={{ textDecoration: 'line-through', marginRight: 6 }}>{offer.baseCost}</span>
                  <strong style={{ color: '#00a676' }}>{offer.price} gemmes</strong>
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
          <Star size={14} />
          <span>PROGRAMME FIDÉLITÉ</span>
        </div>
        <div style={S.sumRow}>
          <span style={S.sumK}>Progression achats gemmes</span>
          <strong>{shopRuntime.loyalty.progress}/{shopRuntime.loyalty.target}</strong>
        </div>
        <div style={S.sumRow}>
          <span style={S.sumK}>Prochaine récompense</span>
          <strong>{shopRuntime.loyalty.reward.gems} gemmes + {formatMoney(shopRuntime.loyalty.reward.money)}</strong>
        </div>
        {shopRuntime.firstPurchaseBonusPending && (
          <div style={{ ...S.emptySmall, marginTop: 8 }}>
            Bonus premier achat actif: +12 gemmes immédiates.
          </div>
        )}
      </div>

      <div style={S.objCard}>
        <div style={S.secTitle}>
          <Star size={14} />
          <span>PACKS GEMMES</span>
        </div>
        <div style={S.cardList}>
          {GEM_PACKS.map((pack) => (
            <div key={pack.id} style={{
              background: '#ffffff',
              border: '1px solid #e5eaf0',
              borderRadius: 8,
              padding: 14,
              boxShadow: '0 10px 24px rgba(15,23,32,.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#172026' }}>{pack.label}</div>
                  <div style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginTop: 3 }}>{pack.gems} gemmes · {pack.bonus || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#172026' }}>{pack.price}</div>
                  <div style={{ fontSize: 9, letterSpacing: '.14em', color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>bientôt</div>
                </div>
              </div>
            </div>
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
          return (
            <div
              key={item.id}
              style={{
                background: '#ffffff',
                border: item.highlight ? '1px solid #00a676' : '1px solid #e5eaf0',
                borderRadius: 8,
                padding: 14,
                boxShadow: item.highlight ? '0 14px 32px rgba(0,166,118,.12)' : '0 10px 24px rgba(15,23,32,.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon ?? '✨'}</div>
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
                  color: isGem ? '#00a676' : '#2f80ed',
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

              <button
                onClick={() => onBuy(item.id)}
                disabled={!canBuy}
                style={{
                  ...S.primaryBtn,
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

      <div style={S.emptySmall}>
        Boutique pensée pour le confort: on peut avancer gratuitement, et les gemmes donnent juste un peu plus de marge.
      </div>
    </div>
  );
}
