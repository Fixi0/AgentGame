import { Sparkles, Target, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getRecruitmentPreview, RECRUITMENT_PITCHES } from '../../systems/recruitmentSystem';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

const gaugeColor = (score, threshold) => {
  if (score >= threshold + 12) return '#00a676';
  if (score >= threshold) return '#2f80ed';
  if (score >= threshold - 8) return '#b45309';
  return '#b42318';
};

export default function RecruitmentModal({ state, player, onConfirm, onClose }) {
  const [pitchId, setPitchId] = useState('sportif');
  const preview = useMemo(() => getRecruitmentPreview(state, player, pitchId), [state, player, pitchId]);
  const selectedPitch = preview?.pitch ?? RECRUITMENT_PITCHES[0];
  const statusColor = gaugeColor(preview?.fit ?? 0, preview?.threshold ?? 60);

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ ...S.mHead, borderTop: '3px solid #00a676' }}>
          <Target size={16} color="#00a676" />
          <span>RECRUTEMENT · DOSSIER</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <h2 style={S.mTitle}>{player.firstName} {player.lastName}</h2>
          <div style={S.mPlayer}>{player.position} · {player.countryFlag} {player.countryLabel} · {player.rating}/100</div>
          <p style={S.mText}>Avant de signer, on construit un vrai dossier de recrutement. On regarde ses objectifs, ses freins et le pitch le plus crédible pour le convaincre.</p>

          <div style={S.objCard}>
            <div style={S.secTitle}>OBJECTIFS DU JOUEUR</div>
            <div style={S.tagRow}>
              {(player.recruitmentPriorities ?? []).length ? player.recruitmentPriorities.map((item) => (
                <span key={item} style={S.softTag}>{item}</span>
              )) : <span style={S.emptySmall}>Aucune priorité forte connue.</span>}
            </div>
            <div style={S.secTitle}>POINTS DE VIGILANCE</div>
            <div style={S.tagRow}>
              {(player.recruitmentDealBreakers ?? []).length ? player.recruitmentDealBreakers.map((item) => (
                <span key={item} style={S.warnTag}>{item}</span>
              )) : <span style={S.emptySmall}>Aucun blocage majeur repéré.</span>}
            </div>
          </div>

          <div style={S.objCard}>
            <div style={S.secTitle}>ANGLE DE RECRUTEMENT</div>
            <div style={S.cardList}>
              {RECRUITMENT_PITCHES.map((pitch) => {
                const selected = pitch.id === pitchId;
                const sample = getRecruitmentPreview(state, player, pitch.id);
                return (
                  <button
                    key={pitch.id}
                    onClick={() => setPitchId(pitch.id)}
                    style={{
                      ...S.quickCard,
                      textAlign: 'left',
                      border: selected ? '1px solid #00a676' : '1px solid #e5eaf0',
                      background: selected ? '#f0fdf8' : '#ffffff',
                      boxShadow: selected ? '0 14px 32px rgba(0,166,118,.14)' : '0 10px 24px rgba(15,23,32,.06)',
                    }}
                  >
                    <div style={S.qLabel}>{pitch.label}</div>
                    <div style={S.qSub}>{pitch.desc}</div>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>{pitch.short}</span>
                      <span style={{ fontSize: 10, letterSpacing: '.12em', fontWeight: 900, color: gaugeColor(sample.fit, sample.threshold), fontFamily: 'system-ui,sans-serif' }}>
                        FIT {sample.fit}/100
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={S.objCard}>
            <div style={S.secTitle}>CHANCES DE CONVAINCRE</div>
            <div style={{ background: '#f7f9fb', border: `1px solid ${statusColor}26`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, letterSpacing: '.18em', color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 850 }}>SCORE</span>
                <strong style={{ color: statusColor }}>{preview.fit}/100</strong>
              </div>
              <div style={S.progBar}>
                <div style={{ ...S.progFill, width: `${preview.fit}%`, background: statusColor }} />
              </div>
              <div style={S.fixtureMeta}>
                Seuil requis: {preview.threshold}/100 · probabilité estimée: {preview.chance}%
              </div>
            </div>
            <div style={S.emptySmall}>
              {selectedPitch.short}. Coût estimé: {formatMoney(player.signingCost)}.
            </div>
          </div>

          <div style={S.objCard}>
            <div style={S.secTitle}>MEMOIRE D'APPROCHE</div>
            <div style={S.emptySmall}>
              {preview.reasons.length ? preview.reasons.join(' · ') : 'Aucun point de lecture supplémentaire.'}
            </div>
            <div style={S.sumRow}><span style={S.sumK}>Réseau</span><strong>{preview.network?.contact?.name ?? 'Aucun contact utile'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Bonus réseau</span><strong>{preview.network?.bonus ?? 0}</strong></div>
            {preview.memoryPenalty > 0 && <div style={{ fontSize: 11, color: '#b42318', fontFamily: 'system-ui,sans-serif', marginTop: 8 }}>Ancien refus du joueur: -{preview.memoryPenalty}</div>}
          </div>

          <button onClick={() => onConfirm(pitchId)} style={S.primaryBtn}>
            <Sparkles size={16} />
            RECRUTER VIA {selectedPitch.label.toUpperCase()}
          </button>
          <button onClick={onClose} style={S.secBtn}>ANNULER</button>
        </div>
      </div>
    </div>
  );
}
