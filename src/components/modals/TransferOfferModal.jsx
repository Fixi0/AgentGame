import { ArrowUpRight, Handshake, X } from 'lucide-react';
import React from 'react';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

export default function TransferOfferModal({ offer, player, readiness, onClose, onAccept, onNegotiate, onReject }) {
  const toneColor = readiness?.tone === 'good' ? '#00a676' : readiness?.tone === 'warn' ? '#b45309' : '#b42318';
  const toneBg = readiness?.tone === 'good' ? '#f0fdf8' : readiness?.tone === 'warn' ? '#fffbeb' : '#fef2f2';

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <ArrowUpRight size={16} color="#00a676" />
          <span>OFFRE TRANSFERT</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <h2 style={S.mTitle}>{offer.club}</h2>
          <div style={S.mPlayer}>{player.firstName} {player.lastName} · {offer.preWindow ? 'pré-accord' : 'offre active'}</div>

          <div style={S.objCard}>
            <div style={S.secTitle}>OFFRE</div>
            <div style={S.sumRow}><span style={S.sumK}>Montant</span><strong>{formatMoney(offer.price)}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Salaire</span><strong>x{offer.salMult?.toFixed?.(2) ?? offer.salMult}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Fenêtre</span><strong>{offer.preWindow ? `S${offer.effectiveWeek}` : `S${offer.expiresWeek}`}</strong></div>
          </div>

          <div style={{ background: toneBg, border: `1px solid ${toneColor}30`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: '.16em', color: toneColor, fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 4 }}>
              STATUT
            </div>
            <div style={{ fontSize: 13, color: '#172026', fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 }}>
              {readiness?.reason ?? 'Offre prête.'}
            </div>
          </div>

          <div style={S.choiceList}>
            <button
              type="button"
              onClick={onAccept}
              style={{
                ...S.choiceBtn,
                borderColor: '#00a676',
                opacity: 1,
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ ...S.chLabel, color: '#00a676' }}>Signer maintenant</div>
                <div style={S.chDesc}>{offer.preWindow ? 'Pose le pré-accord' : 'Valide le transfert immédiatement'}</div>
              </div>
            </button>
            <button type="button" onClick={onNegotiate} style={S.choiceBtn}>
              <div>
                <div style={S.chLabel}>Négocier</div>
                <div style={S.chDesc}>Ouvre la négociation détaillée</div>
              </div>
            </button>
            <button type="button" onClick={onReject} style={{ ...S.choiceBtn, borderColor: '#b42318' }}>
              <div>
                <div style={{ ...S.chLabel, color: '#b42318' }}>Refuser</div>
                <div style={S.chDesc}>Mettre fin au dossier</div>
              </div>
            </button>
            <button type="button" onClick={onClose} style={S.secBtn}>FERMER</button>
          </div>
        </div>
      </div>
    </div>
  );
}
