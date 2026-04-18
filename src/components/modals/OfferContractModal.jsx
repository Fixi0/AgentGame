import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, RefreshCcw, X } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { clamp } from '../../utils/helpers';
import { S } from '../styles';

const ROLES = ['Rotation', 'Titulaire', 'Star', 'Projet jeune'];
const DURATIONS = [1, 2, 3, 4, 5];

const getBaseTerms = (offer, player) => ({
  price: offer.price,
  salMult: offer.salMult ?? 1.2,
  role: player.clubRole ?? (player.rating >= 82 ? 'Titulaire' : 'Rotation'),
  contractYears: player.age <= 22 ? 4 : player.age >= 31 ? 2 : 3,
  signingBonus: Math.max(3000, Math.floor((player.weeklySalary ?? 10000) * 8)),
  releaseClause: Math.max(50000, Math.floor((player.value ?? 1000000) * 1.7)),
  sellOnPercent: player.age <= 23 ? 10 : 5,
  bonusPackage: Math.max(5000, Math.floor((player.weeklySalary ?? 10000) * 10)),
});

const buildOutcome = (terms) => ({
  success: true,
  price: Math.floor(terms.price),
  salMult: Number(terms.salMult.toFixed(2)),
  role: terms.role,
  contractWeeks: terms.contractYears * 52,
  signingBonus: Math.floor(terms.signingBonus),
  releaseClause: Math.floor(terms.releaseClause),
  sellOnPercent: Math.floor(terms.sellOnPercent),
  clubBonuses: {
    total: Math.floor(terms.bonusPackage),
    goals: Math.floor(terms.bonusPackage * 0.35),
    appearances: Math.floor(terms.bonusPackage * 0.35),
    europe: Math.floor(terms.bonusPackage * 0.3),
  },
});

export default function OfferContractModal({ offer, player, readiness, onClose, onSign, onReject }) {
  const [terms, setTerms] = useState(() => getBaseTerms(offer, player));
  const [status, setStatus] = useState({
    tone: readiness?.tone ?? 'good',
    label: readiness?.reason ?? 'Offre prête.',
  });
  const [round, setRound] = useState(1);

  const warningTone = status.tone === 'danger';
  const statusColor = warningTone ? '#b42318' : status.tone === 'warn' ? '#b45309' : '#00a676';
  const statusBg = warningTone ? '#fef2f2' : status.tone === 'warn' ? '#fffbeb' : '#f0fdf8';

  const editField = (key, value) => setTerms((prev) => ({ ...prev, [key]: value }));

  const negotiationPressure = useMemo(() => {
    const priceDelta = (terms.price - offer.price) / Math.max(1, offer.price);
    const salaryDelta = terms.salMult - (offer.salMult ?? 1.2);
    const bonusDelta = (terms.signingBonus - Math.max(3000, Math.floor((player.weeklySalary ?? 10000) * 8))) / Math.max(1, player.value || 1);
    const clauseDelta = terms.releaseClause < (player.value ?? 1000000) * 1.2 ? 0.14 : 0;
    const roleDelta = terms.role === 'Star' ? 0.14 : terms.role === 'Titulaire' ? 0.06 : -0.03;
    return priceDelta * 1.1 + salaryDelta * 0.85 + bonusDelta * 2.4 + clauseDelta + roleDelta;
  }, [terms, offer, player]);

  const handleCounter = () => {
    const patience = clamp(0.74 - round * 0.12 - Math.max(0, negotiationPressure), 0.08, 0.9);
    if (Math.random() <= patience) {
      setStatus({
        tone: 'good',
        label: `Contre-proposition acceptée (${round}/3). Tu peux signer maintenant.`,
      });
      setRound((value) => Math.min(3, value + 1));
      return;
    }

    const tonedDown = {
      ...terms,
      price: Math.floor(terms.price * 0.97),
      salMult: clamp(terms.salMult * 0.98, 0.9, 2.6),
      signingBonus: Math.floor(terms.signingBonus * 0.95),
      releaseClause: Math.floor(Math.max((player.value ?? 1000000) * 1.15, terms.releaseClause)),
    };
    setTerms(tonedDown);
    setStatus({
      tone: round >= 3 ? 'danger' : 'warn',
      label: round >= 3
        ? 'Le club est au bord de la rupture. Dernière chance avant retrait.'
        : 'Le club refuse ces conditions et renvoie une contre-proposition.',
    });
    setRound((value) => Math.min(3, value + 1));
  };

  const handleSign = () => onSign(buildOutcome(terms));

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <ArrowUpRight size={16} color="#00a676" />
          <span>CONTRAT CLUB · TOUR {round}/3</span>
          <button type="button" onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <h2 style={S.mTitle}>{offer.club}</h2>
          <div style={S.mPlayer}>{player.firstName} {player.lastName} · {offer.preWindow ? 'pré-accord' : 'offre active'}</div>

          <div style={S.objCard}>
            <div style={S.secTitle}>BASE CLUB</div>
            <div style={S.sumRow}><span style={S.sumK}>Montant</span><strong>{formatMoney(offer.price)}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Salaire</span><strong>x{(offer.salMult ?? 1.2).toFixed(2)}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Fenêtre</span><strong>{offer.preWindow ? `S${offer.effectiveWeek}` : `S${offer.expiresWeek}`}</strong></div>
          </div>

          <div style={S.negoStat}>
            <div style={S.nsLabel}>TES CONDITIONS</div>
            <div style={S.formGrid}>
              <label style={S.fieldLabel}>
                Montant
                <input type="number" min="1000" step="10000" value={terms.price} onChange={(event) => editField('price', Math.max(1000, Number(event.target.value)))} style={S.textInput} />
              </label>
              <label style={S.fieldLabel}>
                Salaire
                <input type="number" min="0.9" max="2.8" step="0.01" value={terms.salMult} onChange={(event) => editField('salMult', clamp(Number(event.target.value), 0.9, 2.8))} style={S.textInput} />
              </label>
              <label style={S.fieldLabel}>
                Rôle
                <select value={terms.role} onChange={(event) => editField('role', event.target.value)} style={S.textInput}>
                  {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <label style={S.fieldLabel}>
                Durée
                <select value={terms.contractYears} onChange={(event) => editField('contractYears', Number(event.target.value))} style={S.textInput}>
                  {DURATIONS.map((year) => <option key={year} value={year}>{year} ans</option>)}
                </select>
              </label>
              <label style={S.fieldLabel}>
                Prime
                <input type="number" min="0" step="1000" value={terms.signingBonus} onChange={(event) => editField('signingBonus', Math.max(0, Number(event.target.value)))} style={S.textInput} />
              </label>
              <label style={S.fieldLabel}>
                Clause
                <input type="number" min="0" step="10000" value={terms.releaseClause} onChange={(event) => editField('releaseClause', Math.max(0, Number(event.target.value)))} style={S.textInput} />
              </label>
              <label style={S.fieldLabel}>
                Revente %
                <input type="number" min="0" max="25" value={terms.sellOnPercent} onChange={(event) => editField('sellOnPercent', clamp(Number(event.target.value), 0, 25))} style={S.textInput} />
              </label>
              <label style={S.fieldLabel}>
                Bonus
                <input type="number" min="0" step="1000" value={terms.bonusPackage} onChange={(event) => editField('bonusPackage', Math.max(0, Number(event.target.value)))} style={S.textInput} />
              </label>
            </div>
          </div>

          <div style={{ background: statusBg, border: `1px solid ${statusColor}30`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: '.16em', color: statusColor, fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 4 }}>
              RETOUR CLUB
            </div>
            <div style={{ fontSize: 13, color: '#172026', fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 }}>
              {status.label}
            </div>
          </div>

          <div style={S.choiceList}>
            <button type="button" onClick={handleSign} style={{ ...S.choiceBtn, borderColor: '#00a676' }}>
              <div>
                <div style={{ ...S.chLabel, color: '#00a676' }}><CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />Signer le contrat</div>
                <div style={S.chDesc}>{terms.contractYears} ans · {terms.role} · {formatMoney(terms.price)}</div>
              </div>
            </button>
            <button type="button" onClick={handleCounter} style={S.choiceBtn}>
              <div>
                <div style={S.chLabel}><RefreshCcw size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />Envoyer une contre-offre</div>
                <div style={S.chDesc}>Le club peut accepter, renvoyer ou casser le dossier</div>
              </div>
            </button>
            <button type="button" onClick={onReject} style={{ ...S.choiceBtn, borderColor: '#b42318' }}>
              <div>
                <div style={{ ...S.chLabel, color: '#b42318' }}>Refuser l'offre</div>
                <div style={S.chDesc}>Fermer ce dossier maintenant</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
