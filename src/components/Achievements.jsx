import React, { useMemo, useState } from 'react';
import { CheckCircle2, Coins, Filter, Gem, Lock, Sparkles } from 'lucide-react';
import { ACHIEVEMENT_CATEGORY_LABELS, ACHIEVEMENT_CATEGORY_ORDER, TOTAL_ACHIEVEMENTS } from '../systems/objectivesSystem';
import { formatMoney } from '../utils/format';
import { assetPath } from '../utils/assets';
import { S } from './styles';

const CATEGORY_STYLE = {
  recruitment: { border: '#bfdbfe', bg: '#eff6ff', accent: '#1d4ed8' },
  transfers: { border: '#bbf7d0', bg: '#f0fdf4', accent: '#166534' },
  finance: { border: '#a7f3d0', bg: '#ecfdf5', accent: '#047857' },
  reputation: { border: '#ddd6fe', bg: '#f5f3ff', accent: '#6d28d9' },
  longevity: { border: '#fed7aa', bg: '#fff7ed', accent: '#c2410c' },
  premium: { border: '#fde68a', bg: '#fffbeb', accent: '#a16207' },
  prestige: { border: '#fbcfe8', bg: '#fdf2f8', accent: '#be185d' },
  default: { border: '#e5eaf0', bg: '#f8fafc', accent: '#334155' },
};

const CATEGORY_ASSET = {
  recruitment: assetPath('tycoon-assets/v_players.png'),
  transfers: assetPath('tycoon-assets/v_transfer.png'),
  finance: assetPath('tycoon-assets/resource_cash.png'),
  reputation: assetPath('tycoon-assets/reputation_shield.png'),
  longevity: assetPath('tycoon-assets/v_calendar.png'),
  premium: assetPath('tycoon-assets/v_shop.png'),
  prestige: assetPath('tycoon-assets/badge_legende.png'),
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
        borderRadius: 8,
        border: '1px solid #1f2a3d',
        padding: 16,
        marginBottom: 14,
        backgroundImage: `linear-gradient(135deg,rgba(7,15,28,.92),rgba(20,35,57,.84)), url(${assetPath('tycoon-style-reference.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 18px 38px rgba(15,23,42,.24)',
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
                background: category === item ? '#172026' : '#ffffff',
                color: category === item ? '#ffffff' : '#172026',
              }}
            >
              {item !== 'all' && CATEGORY_ASSET[item] && (
                <img src={CATEGORY_ASSET[item]} alt={item} style={{ width: 14, height: 14, objectFit: 'contain', marginRight: 5, verticalAlign: 'middle' }} />
              )}
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
                background: status === item.id ? '#00a676' : '#ffffff',
                color: status === item.id ? '#ffffff' : '#172026',
                borderColor: status === item.id ? '#00a676' : '#d6dde3',
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
          return (
            <div
              key={achievement.id}
              style={{
                borderRadius: 8,
                border: `1px solid ${style.border}`,
                background: achievement.unlocked
                  ? `linear-gradient(135deg,${style.bg},#ffffff)`
                  : '#ffffff',
                padding: 13,
                boxShadow: achievement.unlocked
                  ? '0 14px 28px rgba(15,23,42,.1)'
                  : '0 9px 20px rgba(15,23,32,.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '3px 8px', background: style.bg, border: `1px solid ${style.border}`, color: style.accent, fontSize: 9, letterSpacing: '.1em', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>
                    {CATEGORY_ASSET[achievement.category] && (
                      <img src={CATEGORY_ASSET[achievement.category]} alt={achievement.category} style={{ width: 13, height: 13, objectFit: 'contain' }} />
                    )}
                    {ACHIEVEMENT_CATEGORY_LABELS[achievement.category] ?? 'Succès'}
                  </div>
                  <div style={{ fontSize: 14, color: '#172026', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {CATEGORY_ASSET[achievement.category] && (
                      <img src={CATEGORY_ASSET[achievement.category]} alt={achievement.category} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                    )}
                    <span>{achievement.icon ?? '🏅'} {achievement.label}</span>
                  </div>
                  <div style={{ ...S.fixtureMeta, marginTop: 4 }}>{achievement.desc}</div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 8, padding: '4px 7px', background: achievement.unlocked ? '#f0fdf4' : '#f8fafc', border: achievement.unlocked ? '1px solid #bbf7d0' : '1px solid #dbe3ea', color: achievement.unlocked ? '#166534' : '#64727d', fontSize: 9, letterSpacing: '.08em', fontWeight: 900, fontFamily: 'system-ui,sans-serif', whiteSpace: 'nowrap' }}>
                  {achievement.unlocked ? <CheckCircle2 size={11} /> : <Lock size={11} />}
                  {achievement.unlocked ? 'DÉBLOQUÉ' : `${progress}%`}
                </div>
              </div>

              <div style={{ ...S.progBar, height: 5, marginBottom: 7 }}>
                <div style={{ ...S.progFill, width: `${progress}%`, height: 5, background: achievement.unlocked ? '#16a34a' : style.accent }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>
                  {achievement.current}/{achievement.target}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#334155', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>
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
