import React, { useRef } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { S } from '../styles';

export default function ConfirmModal({
  title,
  body,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const isDanger = tone === 'danger';
  const accent = isDanger ? '#b42318' : '#00a676';
  const accentBg = isDanger ? '#fef2f2' : '#f0fdf8';
  const confirmTriggeredRef = useRef(false);
  const triggerConfirm = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (confirmTriggeredRef.current) return;
    confirmTriggeredRef.current = true;
    onConfirm?.();
  };
  const triggerCancel = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    onCancel?.();
  };

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          {isDanger ? <AlertTriangle size={16} color={accent} /> : <CheckCircle2 size={16} color={accent} />}
          <span>{title}</span>
          <button type="button" onClick={onCancel} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <div style={{ background: accentBg, border: `1px solid ${accent}30`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#172026', fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 }}>
              {body}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 'auto', paddingTop: 4 }}>
            <button
              type="button"
              onPointerUp={triggerConfirm}
              onClick={triggerConfirm}
              style={{
                ...S.choiceBtn,
                background: accent,
                color: '#ffffff',
                borderColor: accent,
                boxShadow: isDanger ? '0 12px 26px rgba(180,35,24,.22)' : '0 12px 26px rgba(0,166,118,.18)',
              }}
            >
              <div>
                <div style={S.chLabel}>{confirmLabel}</div>
                <div style={S.chDesc}>Action irréversible</div>
              </div>
            </button>
            <button type="button" onPointerUp={triggerCancel} onClick={triggerCancel} style={{ ...S.choiceBtn, borderColor: '#d6dde3' }}>
              <div>
                <div style={S.chLabel}>{cancelLabel}</div>
                <div style={S.chDesc}>Retour sans rien changer</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
