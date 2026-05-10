import { Download, Play, PlusCircle, RotateCcw, Save, Upload } from 'lucide-react';
import React, { useRef } from 'react';
import { S } from './styles';
import { assetPath } from '../utils/assets';

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
}) {
  const lockRef = useRef(false);
  const trigger = (handler) => (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!handler || lockRef.current) return;
    lockRef.current = true;
    try {
      handler();
    } finally {
      setTimeout(() => { lockRef.current = false; }, 120);
    }
  };

  const slots = saveSlots.length
    ? saveSlots
    : Array.from({ length: 3 }, (_, idx) => ({ slot: idx + 1, hasSave: false, preview: null, isActive: false }));
  const activeSlot = slots.find((slot) => slot.slot === selectedSlot) ?? slots[0];
  const savePreview = activeSlot?.preview ?? null;
  const hasSave = Boolean(activeSlot?.hasSave);
  const continueLabel = savePreview
    ? `Continuer S${savePreview.season} · S${savePreview.seasonWeek}/38`
    : 'Continuer';
  const newLabel = hasSave ? 'Nouvelle partie (écrase ce slot)' : 'Nouvelle partie';
  const resetLabel = hasSave ? 'Supprimer la sauvegarde du slot' : 'Slot vide';

  return (
    <div style={S.onboardingWrap}>
      <div style={S.onboardingCard}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <img
            src={assetPath('branding/agent-foot-logo.png')}
            alt="Logo Agent FC"
            style={{
              width: 74,
              height: 74,
              borderRadius: 16,
              objectFit: 'cover',
              border: '1px solid #e5eaf0',
              boxShadow: '0 10px 24px rgba(15,23,32,.14)',
            }}
          />
        </div>
        <div style={S.el}>AGENT FOOT</div>
        <h1 style={S.eh}>Carrière</h1>
        <p style={S.onboardingText}>Choisis un slot, puis continue, crée une nouvelle partie, ou importe une sauvegarde.</p>
        <div style={{
          marginBottom: 14,
          padding: '10px 12px',
          background: '#f7f9fb',
          border: '1px solid #e5eaf0',
          borderRadius: 8,
          color: '#3f5663',
          fontSize: 12,
          lineHeight: 1.45,
          fontFamily: 'system-ui,sans-serif',
          fontWeight: 650,
        }}>
          Quitter une partie ne supprime rien. Seul le bouton suppression efface un slot.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {slots.map((slot) => (
            <button
              key={slot.slot}
              type="button"
              onPointerUp={trigger(() => onSelectSlot?.(slot.slot))}
              onClick={trigger(() => onSelectSlot?.(slot.slot))}
              style={{
                borderRadius: 8,
                border: selectedSlot === slot.slot ? '2px solid #00a676' : '1px solid #d6dde3',
                background: selectedSlot === slot.slot ? '#f0fdf8' : '#ffffff',
                color: selectedSlot === slot.slot ? '#246555' : '#3f5663',
                padding: '10px 8px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Slot {slot.slot}
              </div>
              <div style={{ fontSize: 11, marginTop: 3, fontWeight: 700 }}>
                {slot.hasSave ? `S${slot.preview?.season ?? '?'} · S${slot.preview?.seasonWeek ?? '?'}` : 'Vide'}
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          <button type="button" onPointerUp={trigger(onContinue)} onClick={trigger(onContinue)} disabled={!hasSave} style={{ ...S.primaryBtn, opacity: hasSave ? 1 : 0.45 }}>
            <Play size={14} />
            {continueLabel}
          </button>
          <button type="button" onPointerUp={trigger(onNewGame)} onClick={trigger(onNewGame)} style={{ ...S.secBtn, marginBottom: 0 }}>
            <PlusCircle size={14} />
            {newLabel}
          </button>
          <button type="button" onPointerUp={trigger(onReset)} onClick={trigger(onReset)} disabled={!hasSave} style={{ ...S.secBtn, color: '#b42318', marginBottom: 0, background: '#fff6f6', borderColor: '#f3c7c2', opacity: hasSave ? 1 : 0.6 }}>
            <RotateCcw size={14} />
            {resetLabel}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" onPointerUp={trigger(onExport)} onClick={trigger(onExport)} disabled={!hasSave} style={{ ...S.secBtn, marginBottom: 0, opacity: hasSave ? 1 : 0.6 }}>
              <Download size={14} />
              Exporter
            </button>
            <button type="button" onPointerUp={trigger(onImport)} onClick={trigger(onImport)} style={{ ...S.secBtn, marginBottom: 0 }}>
              <Upload size={14} />
              Importer
            </button>
          </div>
          {canReturnToGame && (
            <button type="button" onPointerUp={trigger(onReturnToGame)} onClick={trigger(onReturnToGame)} style={{ ...S.secBtn, marginBottom: 0 }}>
              <Save size={14} />
              Retour au jeu
            </button>
          )}
        </div>
        {savePreview ? (
          <div style={S.objCard}>
            <div style={S.secTitle}>SLOT {selectedSlot} · PARTIE EN COURS</div>
            <div style={S.sumRow}><span style={S.sumK}>Agence</span><strong>{savePreview.agencyName}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Dirigée par</span><strong>{savePreview.ownerName}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Date</span><strong>S{savePreview.season} · S{savePreview.seasonWeek}/38</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Joueurs</span><strong>{savePreview.rosterCount}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Capital</span><strong>{savePreview.money.toLocaleString('fr-FR')} €</strong></div>
            <div style={{ ...S.sumRow, borderBottom: 'none' }}><span style={S.sumK}>Réputation</span><strong>{savePreview.reputation}</strong></div>
          </div>
        ) : (
          <div style={{ ...S.objCard, textAlign: 'center', color: '#64727d', fontSize: 13, fontFamily: 'system-ui,sans-serif' }}>
            Ce slot est vide. Lance une nouvelle partie ou importe une sauvegarde.
          </div>
        )}
      </div>
    </div>
  );
}
