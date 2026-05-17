import React from 'react';
import { Activity, Briefcase, FileText, ShoppingBag, Telescope, Trophy, Timer, Layers, Sparkles, Building2, Award } from 'lucide-react';
import { getAppLanguage, setAppLanguage, t } from '../utils/i18n';

// One tile per feature — no sub-sections, no duplicate buttons.
const TILE_META = {
  office:       { icon: Building2,  accent: '#10b981', tint: 'oklch(28% 0.10 158 / .35)' },
  standings:    { icon: Trophy,     accent: '#facc15', tint: 'oklch(30% 0.12 90  / .30)' },
  shop:         { icon: ShoppingBag, accent: '#fbbf24', tint: 'oklch(30% 0.14 75  / .30)' },
  achievements: { icon: Award,      accent: '#f59e0b', tint: 'oklch(30% 0.12 75  / .35)' },
  social:       { icon: Sparkles,   accent: '#e879f9', tint: 'oklch(30% 0.14 320 / .30)' },
  engineHistory:{ icon: Activity,   accent: '#38bdf8', tint: 'oklch(28% 0.10 230 / .35)' },
  scouting:     { icon: Telescope,  accent: '#22d3ee', tint: 'oklch(28% 0.10 200 / .35)' },
  contracts:    { icon: Briefcase,  accent: '#94a3b8', tint: 'oklch(22% 0.03 258 / .55)' },
  dossiers:     { icon: FileText,   accent: '#fb923c', tint: 'oklch(30% 0.12 50  / .30)' },
  deadline:     { icon: Timer,      accent: '#f87171', tint: 'oklch(30% 0.14 25  / .30)' },
};

function Tile({ item, onNav }) {
  const meta = TILE_META[item.key] ?? { icon: Layers, accent: 'var(--af-grass)', tint: 'oklch(22% 0.03 258 / .55)' };
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onNav(item.key)}
      className="af-hover-lift af-anim-fade-up"
      style={{
        textAlign: 'left',
        padding: 14,
        background: 'oklch(16% 0.035 258 / .92)',
        border: '1px solid var(--af-border)',
        borderRadius: 12,
        color: 'var(--af-text)',
        display: 'grid',
        gap: 8,
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: meta.tint,
        border: `1px solid ${meta.accent}55`,
        display: 'grid', placeItems: 'center',
        boxShadow: `0 6px 16px ${meta.accent}22`,
      }}>
        <Icon size={20} color={meta.accent} strokeWidth={2.2} />
      </div>
      <div style={{ fontWeight: 950, fontSize: 14, lineHeight: 1.15 }}>{t(item.label)}</div>
      <div style={{ color: 'var(--af-muted)', fontSize: 11, lineHeight: 1.35 }}>{t(item.desc)}</div>
    </button>
  );
}

export default function More({ items, onNav }) {
  const language = getAppLanguage();
  return (
    <div className="af-page" style={{ display: 'grid', gap: 18 }}>
      <div>
        <div className="af-kicker">MENU</div>
        <h1 className="af-title">{t('Plus')}</h1>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {items.map((item) => <Tile key={item.key} item={item} onNav={onNav} />)}
      </section>

      <section className="af-panel" style={{ padding: 14, display: 'grid', gap: 10 }}>
        <div className="af-kicker">{language === 'en' ? 'LANGUAGE' : 'LANGUE'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" onClick={() => setAppLanguage('fr')} className={`af-chip ${language === 'fr' ? 'is-active' : ''}`} style={{ padding: '10px 12px' }}>Français</button>
          <button type="button" onClick={() => setAppLanguage('en')} className={`af-chip ${language === 'en' ? 'is-active' : ''}`} style={{ padding: '10px 12px' }}>English</button>
        </div>
      </section>
    </div>
  );
}
