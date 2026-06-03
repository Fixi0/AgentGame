import { Download, Play, PlusCircle, RotateCcw, Save, Upload } from 'lucide-react';
import React, { useRef } from 'react';
import { assetPath } from '../utils/assets';
import { getAgencyLogo } from '../utils/agencyLogos';
import { getAppLanguage, setAppLanguage, t } from '../utils/i18n';
import tunnelHero from '../assets/hero/broadcast-tunnel.jpg';

export default function SaveMenu({
  saveSlots = [],
  selectedSlot = 1,
  canReturnToGame = false,
  onSelectSlot,
  onContinue,
  onNewGame,
  onReset,
  onExport,
  onImport,
  onReturnToGame,
  loading = false,
}) {
  const lockRef = useRef(false);
  const trigger = (handler) => (event) => {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!handler || lockRef.current || loading) return;
    lockRef.current = true;
    try { handler(); } finally { setTimeout(() => { lockRef.current = false; }, 120); }
  };

  const slots = saveSlots.length
    ? saveSlots
    : Array.from({ length: 3 }, (_, idx) => ({ slot: idx + 1, hasSave: false, preview: null, isActive: false }));
  const activeSlot = slots.find((s) => s.slot === selectedSlot) ?? slots[0];
  const savePreview = activeSlot?.preview ?? null;
  const hasSave = Boolean(activeSlot?.hasSave);
  const continueLabel = savePreview
    ? `${t('Reprendre')} · S${savePreview.season} W${savePreview.seasonWeek}/38`
    : t('Continuer');
  const newLabel = hasSave ? t('Nouvelle partie (écrase)') : t('Nouvelle partie');
  const resetLabel = hasSave ? t('Supprimer la sauvegarde') : t('Slot vide');
  const language = getAppLanguage();
  const hasAnySave = slots.some((slot) => slot.hasSave);
  const heroRow = hasAnySave ? 'minmax(142px, 22vh)' : 'minmax(250px, 38vh)';

  return (
    <div style={{ width: '100%', height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      <div style={{ maxWidth: 520, height: '100%', margin: '0 auto', padding: '10px 14px 12px', display: 'grid', gap: 9, gridTemplateRows: `${heroRow} auto minmax(0, 1fr) auto auto` }}>

        {/* HERO BROADCAST */}
        <section
          className="af-hero-broadcast af-anim-fade-in"
          style={{ minHeight: 0, height: '100%', backgroundImage: `url(${tunnelHero})`, padding: hasAnySave ? '12px 16px 14px' : '18px 18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: 28 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: hasAnySave ? 5 : 8 }} className="af-anim-fade-up">
            <span className="af-cyan-line" />
            <img
              src={assetPath('branding/agent-foot-logo.png')}
              alt=""
              style={{ width: 24, height: 24, borderRadius: 7, objectFit: 'cover' }}
            />
            <span style={{ color: 'var(--af-cyan)', fontSize: 10, fontWeight: 900, letterSpacing: '.28em', textTransform: 'uppercase' }}>
              {t('Carrière · Saison 1')}
            </span>
          </div>
          <h1 className="af-titan af-anim-fade-up af-anim-d1" style={{ color: '#fff', fontSize: hasAnySave ? 'clamp(42px, 13vw, 64px)' : 'clamp(58px, 17vw, 88px)', lineHeight: .82 }}>
            Agent<br />FC
          </h1>
          <p className="af-anim-fade-up af-anim-d2" style={{ color: 'rgba(255,255,255,.78)', maxWidth: 480, fontSize: hasAnySave ? 10.5 : 12, lineHeight: 1.25, margin: hasAnySave ? '4px 0 0' : '8px 0 0' }}>
            {t('Construis ton écurie. Négocie. Écris la légende.')}
          </p>
        </section>
        {/* SLOTS XL */}
        <section className="af-anim-fade-up af-anim-d3" style={{ display: 'grid', gap: 7, minHeight: 0 }}>
          <div className="af-kicker" style={{ color: 'var(--af-cyan)', fontSize: 10 }}>{t('Slots de sauvegarde')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 7, minHeight: 0, overflowY: 'auto', padding: '3px 2px 5px', overscrollBehavior: 'contain' }}>
            {slots.map((slot) => {
              const p = slot.preview;
              const isSelected = selectedSlot === slot.slot;
              const logo = p?.emblem ? getAgencyLogo(p.emblem) : null;
              const accent = p?.signatureColor || 'var(--af-grass)';
              return (
                <button
                  key={slot.slot}
                  type="button"
                  onPointerUp={trigger(() => onSelectSlot?.(slot.slot))}
                  onClick={trigger(() => onSelectSlot?.(slot.slot))}
                  className="af-panel"
                  style={{
	                    textAlign: 'left', cursor: 'pointer', padding: 10,
                    border: isSelected ? `2px solid ${accent}` : '1px solid var(--af-border)',
                    boxShadow: isSelected ? `0 0 0 2px color-mix(in oklch, ${accent} 18%, transparent), var(--af-shadow-card)` : 'var(--af-shadow-card)',
                    transition: 'transform .15s ease, box-shadow .2s ease',
                    transform: 'none',
                  }}
                >
	                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      className="af-logo-disc"
                      style={{
	                        width: 42, height: 42, flexShrink: 0,
                        background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 30%, transparent), oklch(18% 0.04 252))`,
                        border: '1px solid var(--af-border)',
                      }}
                    >
                      {logo
                        ? <img src={logo.src} alt="" />
	                        : <span style={{ position: 'relative', zIndex: 2, fontSize: 18, fontWeight: 950, color: 'var(--af-dim)' }}>{slot.slot}</span>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
	                      <div style={{ color: 'var(--af-dim)', fontSize: 8.5, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase' }}>
	                        {t('Slot')} {slot.slot}
	                      </div>
	                      <div style={{ color: 'var(--af-text)', fontSize: 16, fontWeight: 950, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
	                        {p?.agencyName || t('Slot vide')}
	                      </div>
	                      <div style={{ color: 'var(--af-muted)', fontSize: 10.5, marginTop: 1 }}>
	                        {p ? `S${p.season} · W${p.seasonWeek}/38` : t('Lance une nouvelle partie')}
	                      </div>
                    </div>
                  </div>
	                  {p && isSelected && (
	                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8, paddingTop: 7, borderTop: '1px solid var(--af-border)' }}>
	                      <div>
	                        <div style={{ color: 'var(--af-dim)', fontSize: 7.5, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>{t('Joueurs')}</div>
	                        <div style={{ color: 'var(--af-text)', fontSize: 13, fontWeight: 900, marginTop: 1 }}>{p.rosterCount}</div>
	                      </div>
	                      <div>
	                        <div style={{ color: 'var(--af-dim)', fontSize: 7.5, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>{t('Capital')}</div>
	                        <div style={{ color: 'var(--af-text)', fontSize: 13, fontWeight: 900, marginTop: 1 }}>{(p.money / 1000).toFixed(0)}k €</div>
	                      </div>
	                      <div>
	                        <div style={{ color: 'var(--af-dim)', fontSize: 7.5, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>{t('Rép.')}</div>
	                        <div style={{ color: 'var(--af-text)', fontSize: 13, fontWeight: 900, marginTop: 1 }}>{p.reputation}</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ACTIONS */}
        <section style={{ display: 'grid', gap: 8 }}>
          <button
            type="button"
            onPointerUp={trigger(onContinue)}
            onClick={trigger(onContinue)}
            disabled={!hasSave || loading}
            className="af-btn-primary"
            style={{ padding: '12px 16px', fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: hasSave ? 1 : .4, cursor: hasSave && !loading ? 'pointer' : 'not-allowed' }}
          >
            <Play size={18} fill="currentColor" style={{ animation: loading ? 'pulse 1s infinite' : 'none' }} />
            {loading ? t('Chargement de la partie...') : continueLabel}
          </button>
          <button
            type="button"
            onPointerUp={trigger(onNewGame)}
            onClick={trigger(onNewGame)}
            className="af-btn-secondary"
            style={{ padding: '11px 16px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
          >
            <PlusCircle size={16} />
            {newLabel}
          </button>
	          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
            <button
              type="button"
              onPointerUp={trigger(onExport)}
              onClick={trigger(onExport)}
              disabled={!hasSave}
              className="af-btn-secondary"
	              style={{ padding: '10px 8px', fontSize: 9.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: hasSave ? 1 : .5 }}
            >
              <Download size={14} />
              {t('Exporter')}
            </button>
            <button
              type="button"
              onPointerUp={trigger(onImport)}
              onClick={trigger(onImport)}
              className="af-btn-secondary"
	              style={{ padding: '10px 8px', fontSize: 9.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Upload size={14} />
              {t('Importer')}
            </button>
            <button
              type="button"
              onPointerUp={trigger(onReset)}
              onClick={trigger(onReset)}
              disabled={!hasSave}
              style={{
	                padding: '10px 8px', fontSize: 9.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase',
                borderRadius: 'var(--af-radius-sm)', cursor: hasSave ? 'pointer' : 'not-allowed',
                border: '1px solid oklch(60% 0.18 25 / .5)', background: 'oklch(28% 0.08 25 / .35)', color: 'oklch(82% 0.16 25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: hasSave ? 1 : .5,
              }}
            >
              <RotateCcw size={14} />
              {resetLabel}
            </button>
          </div>
          {canReturnToGame && (
            <button
              type="button"
              onPointerUp={trigger(onReturnToGame)}
              onClick={trigger(onReturnToGame)}
              className="af-btn-secondary"
              style={{ padding: '13px 18px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Save size={14} />
              {t('Retour au jeu')}
            </button>
          )}
        </section>

	        <section className="af-panel" style={{ padding: hasAnySave ? 7 : 8, display: 'grid', gap: 7 }}>
          <div className="af-kicker" style={{ color: 'var(--af-cyan)' }}>{t('LANGUE')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
	            <button type="button" onClick={() => setAppLanguage('fr')} className={`af-chip ${language === 'fr' ? 'is-active' : ''}`} style={{ padding: '7px 9px', fontSize: 10 }}>{t('Français')}</button>
	            <button type="button" onClick={() => setAppLanguage('en')} className={`af-chip ${language === 'en' ? 'is-active' : ''}`} style={{ padding: '7px 9px', fontSize: 10 }}>English</button>
          </div>
        </section>

	        <p style={{ color: 'var(--af-dim)', fontSize: 9, textAlign: 'center', margin: 0, lineHeight: 1.2 }}>
          {t('Quitter une partie ne supprime rien — seul le bouton suppression efface un slot.')}
        </p>
      </div>
    </div>
  );
}
