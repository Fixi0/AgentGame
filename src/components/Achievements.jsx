import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Coins, Crown, Filter, Gem, Hourglass, Lock, ShieldCheck, ShoppingBag, Sparkles, TrendingUp, UserPlus } from 'lucide-react';
import { ACHIEVEMENT_CATEGORY_LABELS, ACHIEVEMENT_CATEGORY_ORDER, TOTAL_ACHIEVEMENTS } from '../systems/objectivesSystem';
import { formatMoney } from '../utils/format';
import { assetPath } from '../utils/assets';
import { S } from './styles';
import achievementsHero from '../assets/events/achievements-hero.jpg';
import achRecruitment from '../assets/events/ach-recruitment.jpg';
import achTransfers from '../assets/events/ach-transfers.jpg';
import achFinance from '../assets/events/ach-finance.jpg';
import achReputation from '../assets/events/ach-reputation.jpg';
import achLongevity from '../assets/events/ach-longevity.jpg';
import achPremium from '../assets/events/ach-premium.jpg';
import achPrestige from '../assets/events/ach-prestige.jpg';

const CATEGORY_STYLE = {
  recruitment: { border: 'oklch(35% 0.12 245 / .55)', bg: 'oklch(28% 0.12 245 / .35)', accent: '#60a5fa' },
  transfers:   { border: 'oklch(35% 0.10 158 / .55)', bg: 'oklch(28% 0.10 158 / .35)', accent: '#34d399' },
  finance:     { border: 'oklch(35% 0.10 158 / .55)', bg: 'oklch(26% 0.10 158 / .35)', accent: '#10b981' },
  reputation:  { border: 'oklch(35% 0.14 290 / .55)', bg: 'oklch(28% 0.14 290 / .30)', accent: '#a78bfa' },
  longevity:   { border: 'oklch(35% 0.12 50  / .55)', bg: 'oklch(28% 0.12 50  / .30)', accent: '#fb923c' },
  premium:     { border: 'oklch(35% 0.12 80  / .55)', bg: 'oklch(28% 0.12 80  / .30)', accent: '#facc15' },
  prestige:    { border: 'oklch(35% 0.14 350 / .55)', bg: 'oklch(28% 0.14 350 / .30)', accent: '#f472b6' },
  default:     { border: 'var(--af-border)', bg: 'var(--af-surface-soft)', accent: '#94a3b8' },
};

const CATEGORY_BANNER = {
  recruitment: achRecruitment,
  transfers: achTransfers,
  finance: achFinance,
  reputation: achReputation,
  longevity: achLongevity,
  premium: achPremium,
  prestige: achPrestige,
};

const CATEGORY_ICON = {
  recruitment: UserPlus,
  transfers: TrendingUp,
  finance: Coins,
  reputation: ShieldCheck,
  longevity: Hourglass,
  premium: ShoppingBag,
  prestige: Crown,
};

const REP_TIER_ASSETS = [
  assetPath('tycoon-assets/badge_local.png'),
  assetPath('tycoon-assets/badge_national.png'),
  assetPath('tycoon-assets/badge_international.png'),
  assetPath('tycoon-assets/badge_elite.png'),
  assetPath('tycoon-assets/badge_legende.png'),
];

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'locked', label: 'À débloquer' },
  { id: 'unlocked', label: 'Débloqués' },
];

const pct = (current, target) => Math.max(0, Math.min(100, Math.round(((current ?? 0) / Math.max(1, target ?? 1)) * 100)));

export default function Achievements({ state }) {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const achievements = useMemo(() => {
    const rows = Array.isArray(state?.achievements) ? state.achievements : [];
    return [...rows].sort((a, b) => {
      const categoryRankA = ACHIEVEMENT_CATEGORY_ORDER.indexOf(a.category);
      const categoryRankB = ACHIEVEMENT_CATEGORY_ORDER.indexOf(b.category);
      if (categoryRankA !== categoryRankB) return (categoryRankA === -1 ? 99 : categoryRankA) - (categoryRankB === -1 ? 99 : categoryRankB);
      if (Boolean(a.unlocked) !== Boolean(b.unlocked)) return a.unlocked ? 1 : -1;
      return (a.target ?? 0) - (b.target ?? 0);
    });
  }, [state?.achievements]);

  const categoryOptions = useMemo(() => {
    const existing = new Set(achievements.map((item) => item.category).filter(Boolean));
    return ['all', ...ACHIEVEMENT_CATEGORY_ORDER.filter((key) => existing.has(key))];
  }, [achievements]);

  const filtered = useMemo(() => achievements.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (status === 'locked' && item.unlocked) return false;
    if (status === 'unlocked' && !item.unlocked) return false;
    return true;
  }), [achievements, category, status]);

  const unlocked = achievements.filter((item) => item.unlocked).length;
  const completion = achievements.length ? Math.round((unlocked / achievements.length) * 100) : 0;
  const totalGems = achievements.filter((item) => item.unlocked).reduce((sum, item) => sum + (item.reward?.gems ?? 0), 0);
  const totalMoney = achievements.filter((item) => item.unlocked).reduce((sum, item) => sum + (item.reward?.money ?? 0), 0);

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>SUCCÈS</div>
        <h1 style={S.eh}>Hall des exploits</h1>
      </div>

      <div style={{
        borderRadius: 10,
        border: '1px solid var(--af-border)',
        padding: 16,
        marginBottom: 14,
        backgroundImage: `linear-gradient(135deg,rgba(7,15,28,.78),rgba(20,35,57,.62)), url(${achievementsHero})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 18px 38px rgba(0,0,0,.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.16em', color: 'rgba(255,255,255,.8)', fontFamily: 'system-ui,sans-serif', fontWeight: 900 }}>
              COLLECTION TYCOON
            </div>
            <div style={{ marginTop: 4, fontSize: 20, color: '#ffffff', fontWeight: 950, lineHeight: 1.1 }}>
              {unlocked}/{achievements.length || TOTAL_ACHIEVEMENTS} débloqués
            </div>
          </div>
          <img src={assetPath('tycoon-assets/badge_legende.png')} alt="Badge légende" style={{ width: 56, height: 56, objectFit: 'contain' }} />
        </div>

        <div style={{ ...S.progBar, height: 7, background: 'rgba(255,255,255,.2)', marginBottom: 8 }}>
          <div style={{ ...S.progFill, width: `${completion}%`, background: 'linear-gradient(90deg,#22c55e,#facc15)', height: 7 }} />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.83)', fontFamily: 'system-ui,sans-serif', marginBottom: 10 }}>
          Progression globale: {completion}%
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
          <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.74)', letterSpacing: '.1em', fontFamily: 'system-ui,sans-serif', fontWeight: 800, marginBottom: 2 }}>RÉPUTATION</div>
            <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src={assetPath('tycoon-assets/reputation_shield.png')} alt="Réputation" style={{ width: 16, height: 16, objectFit: 'contain' }} />
              {(state?.reputation ?? 0)}/1000
            </div>
          </div>
          <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.74)', letterSpacing: '.1em', fontFamily: 'system-ui,sans-serif', fontWeight: 800, marginBottom: 2 }}>GAINS SUCCÈS</div>
            <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Coins size={12} />
              {formatMoney(totalMoney)}
            </div>
          </div>
          <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.74)', letterSpacing: '.1em', fontFamily: 'system-ui,sans-serif', fontWeight: 800, marginBottom: 2 }}>GEMMES GAGNÉES</div>
            <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gem size={12} />
              {totalGems}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          {REP_TIER_ASSETS.map((asset, index) => (
            <img
              key={asset}
              src={asset}
              alt={`Palier ${index + 1}`}
              style={{ width: 24, height: 24, objectFit: 'contain', opacity: (state?.reputation ?? 0) >= (index + 1) * 200 ? 1 : 0.45 }}
            />
          ))}
        </div>
      </div>

      <div style={S.objCard}>
        <div style={{ ...S.secTitle, marginBottom: 10 }}>
          <Filter size={13} />
          <span>CATÉGORIES</span>
        </div>
      <div style={{ ...S.filterChips, marginBottom: 8 }}>
          {categoryOptions.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              style={{
                ...S.chipBtn,
                background: category === item ? 'var(--af-grass)' : 'var(--af-surface)',
                color: category === item ? '#08111f' : 'var(--af-text)',
              }}
            >
              {item !== 'all' && CATEGORY_ICON[item] && (() => {
                const Ic = CATEGORY_ICON[item];
                return <Ic size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />;
              })()}
              {item === 'all' ? 'Toutes' : ACHIEVEMENT_CATEGORY_LABELS[item] ?? item}
            </button>
          ))}
        </div>
        <div style={{ ...S.filterChips, marginBottom: 0 }}>
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setStatus(item.id)}
              style={{
                ...S.chipBtn,
                background: status === item.id ? '#00a676' : 'var(--af-surface)',
                color: status === item.id ? '#08111f' : 'var(--af-text)',
                borderColor: status === item.id ? '#00a676' : 'var(--af-border)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...S.emptySmall, marginBottom: 10 }}>
        {filtered.length} succès affiché{filtered.length > 1 ? 's' : ''}.
      </div>

      <div style={S.cardList}>
        {filtered.map((achievement) => {
          const style = CATEGORY_STYLE[achievement.category] ?? CATEGORY_STYLE.default;
          const progress = pct(achievement.current, achievement.target);
          const banner = CATEGORY_BANNER[achievement.category];
          return (
            <div
              key={achievement.id}
              style={{
                borderRadius: 10,
                border: `1px solid ${style.border}`,
                background: achievement.unlocked
                  ? `linear-gradient(135deg,${style.bg},oklch(18% 0.035 258 / .92))`
                  : 'oklch(18% 0.035 258 / .92)',
                overflow: 'hidden',
                boxShadow: achievement.unlocked
                  ? `0 14px 30px ${style.accent}33`
                  : '0 9px 20px rgba(0,0,0,.35)',
              }}
            >
              {banner && (
                <div style={{ position: 'relative', height: 64 }}>
                  <img src={banner} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: achievement.unlocked ? 0.9 : 0.5, filter: achievement.unlocked ? 'none' : 'grayscale(0.5)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(8,17,31,.10) 0%, oklch(18% 0.035 258 / .92) 100%)` }} />
                  {!achievement.unlocked && (
                    <div style={{ position: 'absolute', top: 8, right: 10, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 8, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 9, fontWeight: 900, letterSpacing: '.1em' }}>
                      <Lock size={10} /> {progress}%
                    </div>
                  )}
                  {achievement.unlocked && (
                    <div style={{ position: 'absolute', top: 8, right: 10, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 8, background: style.accent, color: '#08111f', fontSize: 9, fontWeight: 900, letterSpacing: '.1em' }}>
                      <CheckCircle2 size={10} /> DÉBLOQUÉ
                    </div>
                  )}
                </div>
              )}
              <div style={{ padding: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ minWidth: 0 }}>
                  {(() => {
                    const Ic = CATEGORY_ICON[achievement.category] ?? Award;
                    return (
                      <>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 8, padding: '3px 8px', background: style.bg, border: `1px solid ${style.border}`, color: style.accent, fontSize: 9, letterSpacing: '.1em', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>
                          <Ic size={11} />
                          {ACHIEVEMENT_CATEGORY_LABELS[achievement.category] ?? 'Succès'}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--af-text)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 6, background: style.bg, border: `1px solid ${style.border}`, color: style.accent }}>
                            <Ic size={13} />
                          </span>
                          <span>{achievement.label}</span>
                        </div>
                      </>
                    );
                  })()}
                  <div style={{ ...S.fixtureMeta, marginTop: 4 }}>{achievement.desc}</div>
                </div>
              </div>

              <div style={{ ...S.progBar, height: 5, marginBottom: 7 }}>
                <div style={{ ...S.progFill, width: `${progress}%`, height: 5, background: achievement.unlocked ? '#16a34a' : style.accent }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>
                  {achievement.current}/{achievement.target}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Coins size={11} color="#0f766e" />
                    {formatMoney(achievement.reward?.money ?? 0)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Gem size={11} color="#2563eb" />
                    {achievement.reward?.gems ?? 0}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={11} color="#9333ea" />
                    +{achievement.reward?.rep ?? 0}
                  </span>
                </div>
                </div>
              </div>
              </div>
          );
        })}
      </div>

      {!filtered.length && (
        <div style={S.emptySmall}>
          Aucun succès dans ce filtre.
        </div>
      )}

      <div style={{ ...S.emptySmall, marginTop: 12 }}>
        {TOTAL_ACHIEVEMENTS} succès totaux disponibles dans la carrière.
      </div>
    </div>
  );
}
