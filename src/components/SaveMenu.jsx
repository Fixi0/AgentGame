import { RotateCcw, Save, Sparkles } from 'lucide-react';
import React from 'react';
import { S } from './styles';

export default function SaveMenu({ hasSave, onContinue, onNewGame, onReset }) {
  return (
    <div style={S.onboardingWrap}>
      <div style={S.onboardingCard}>
        <div style={S.el}>AGENT FOOT</div>
        <h1 style={S.eh}>Carrière</h1>
        <p style={S.onboardingText}>Reprends ton agence ou démarre un nouveau projet.</p>
        <button onClick={onContinue} disabled={!hasSave} style={{ ...S.primaryBtn, opacity: hasSave ? 1 : 0.45 }}>
          <Save size={16} />
          CONTINUER
        </button>
        <button onClick={onNewGame} style={S.secBtn}>
          <Sparkles size={14} />
          NOUVELLE PARTIE
        </button>
        {hasSave && (
          <button onClick={onReset} style={{ ...S.secBtn, color: '#b42318' }}>
            <RotateCcw size={14} />
            RESET SAUVEGARDE
          </button>
        )}
      </div>
    </div>
  );
}
