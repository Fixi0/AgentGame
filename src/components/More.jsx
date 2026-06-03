import React from 'react';
import { FileText, Home, Save, ShoppingBag, Trophy, Layers, Award } from 'lucide-react';
import { getAppLanguage, setAppLanguage, t } from '../utils/i18n';

// One tile per feature — no sub-sections, no duplicate buttons.
const TILE_META = {
  standings:    { icon: Trophy,     accent: '#facc15', tint: 'oklch(30% 0.12 90  / .30)' },
  shop:         { icon: ShoppingBag, accent: '#fbbf24', tint: 'oklch(30% 0.14 75  / .30)' },
  achievements: { icon: Award,      accent: '#f59e0b', tint: 'oklch(30% 0.12 75  / .35)' },
  dossiers:     { icon: FileText,   accent: '#fb923c', tint: 'oklch(30% 0.12 50  / .30)' },
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

export default function More({ items, onNav, onSave, onMenu }) {
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
        <div className="af-kicker">SYSTÈME</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" onClick={onSave} className="af-btn-secondary" style={{ padding: '13px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 11 }}>
            <Save size={15} />
            Sauvegarder
          </button>
          <button type="button" onClick={onMenu} className="af-btn-secondary" style={{ padding: '13px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 11 }}>
            <Home size={15} />
            Accueil
          </button>
        </div>
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
