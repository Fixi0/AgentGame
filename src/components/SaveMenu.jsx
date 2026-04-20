import { RotateCcw, Save, Sparkles } from 'lucide-react';
import React from 'react';
import { S } from './styles';

export default function SaveMenu({ hasSave, savePreview, onContinue, onNewGame, onReset }) {
  const continueLabel = savePreview
    ? `Reprendre S${savePreview.season} · S${savePreview.seasonWeek}/38`
    : 'CONTINUER';
  return (
    <div style={S.onboardingWrap}>
      <div style={S.onboardingCard}>
        <div style={S.el}>AGENT FOOT</div>
        <h1 style={S.eh}>Carrière</h1>
        <p style={S.onboardingText}>Reprends la partie en cours ou démarre une nouvelle agence.</p>
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
          Si tu démarres une nouvelle agence, tu passeras d'abord par la création. La navbar arrive ensuite dans la carrière.
        </div>
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          <button type="button" onClick={onNewGame} style={S.primaryBtn}>
            <Sparkles size={14} />
            NOUVELLE PARTIE
          </button>
          <button type="button" onClick={onContinue} disabled={!hasSave} style={{ ...S.secBtn, opacity: hasSave ? 1 : 0.45, marginBottom: 0 }}>
            <Save size={14} />
            {continueLabel}
          </button>
          {hasSave && (
            <button type="button" onClick={onReset} style={{ ...S.secBtn, color: '#b42318', marginBottom: 0 }}>
              <RotateCcw size={14} />
              RESET SAUVEGARDE
            </button>
          )}
        </div>
        {savePreview && (
          <div style={S.objCard}>
            <div style={S.secTitle}>PARTIE EN COURS</div>
            <div style={S.sumRow}><span style={S.sumK}>Agence</span><strong>{savePreview.agencyName}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Dirigée par</span><strong>{savePreview.ownerName}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Date</span><strong>S{savePreview.season} · S{savePreview.seasonWeek}/38</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Joueurs</span><strong>{savePreview.rosterCount}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Capital</span><strong>{savePreview.money.toLocaleString('fr-FR')} €</strong></div>
            <div style={{ ...S.sumRow, borderBottom: 'none' }}><span style={S.sumK}>Réputation</span><strong>{savePreview.reputation}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}
