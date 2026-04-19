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

const ROLE_ORDER = ['Rotation', 'Titulaire', 'Star', 'Projet jeune'];

const roleIndex = (role) => Math.max(0, ROLE_ORDER.indexOf(role));

const getClubAssessment = (terms, baseTerms, round, player) => {
  const roleGap = roleIndex(terms.role) - roleIndex(baseTerms.role);
  const yearsGap = terms.contractYears - baseTerms.contractYears;
  const salaryGap = terms.salMult - baseTerms.salMult;
  const bonusGap = (terms.signingBonus - baseTerms.signingBonus) / Math.max(1, player.weeklySalary ?? 1);
  const clauseGap = Math.max(0, (baseTerms.releaseClause * 0.95) - terms.releaseClause) / Math.max(1, player.value ?? 1);
  const sellOnGap = Math.max(0, terms.sellOnPercent - baseTerms.sellOnPercent) / 10;

  const pressure =
    Math.max(0, roleGap) * 0.28
    + Math.max(0, yearsGap) * 0.10
    + Math.max(0, salaryGap) * 0.45
    + Math.max(0, bonusGap) * 0.16
    + clauseGap * 0.25
    + sellOnGap * 0.12
    - Math.max(0, -yearsGap) * 0.05
    - Math.max(0, -salaryGap) * 0.10;

  const patience = 0.24 + (round - 1) * 0.08;
  const accepted = pressure <= patience;
  const roleShifted = roleGap !== 0;
  const durationShifted = yearsGap !== 0;

  let label = 'Le club écoute sans se prononcer.';
  if (accepted) {
    if (roleShifted && durationShifted) {
      label = 'Le club accepte de discuter le rôle et la durée, mais veut cadrer les derniers détails.';
    } else if (roleShifted) {
      label = 'Le club accepte le principe, mais veut un vrai accord sur le rôle.';
    } else if (durationShifted) {
      label = 'Le club accepte la durée demandée, sous réserve des dernières clauses.';
    } else {
      label = 'Le club valide les termes. Tu peux signer.';
    }
  } else if (roleIndex(terms.role) >= roleIndex('Star')) {
    label = 'Le club refuse de promettre un statut Star à ce stade.';
  } else if (roleShifted) {
    label = `Le club veut ramener le rôle à ${baseTerms.role} ou Titulaire.`;
  } else if (yearsGap > 0) {
    label = `Le club préfère ${baseTerms.contractYears} ans, pas ${terms.contractYears}.`;
  } else if (salaryGap > 0.1) {
    label = 'Le club trouve le salaire trop haut et veut une contrepartie.';
  } else {
    label = 'Le club demande un tour de négociation supplémentaire.';
  }

  return { accepted, label, roleShifted, durationShifted };
};

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
  contractClauses: {
    rolePromise: terms.role,
    rolePromiseStrength: terms.role === 'Star' ? 'forte' : terms.role === 'Titulaire' ? 'normale' : 'limitée',
    coachRoleProtection: true,
  },
});

export default function OfferContractModal({ offer, player, readiness, onClose, onSign, onReject }) {
  const baseTerms = useMemo(() => getBaseTerms(offer, player), [offer, player]);
  const [terms, setTerms] = useState(() => getBaseTerms(offer, player));
  const [status, setStatus] = useState({
    tone: readiness?.tone ?? 'good',
    label: readiness?.reason ?? 'Offre prête.',
  });
  const [round, setRound] = useState(1);
  const clubAssessment = useMemo(() => getClubAssessment(terms, baseTerms, round, player), [terms, baseTerms, round, player]);

  const warningTone = status.tone === 'danger';
  const statusColor = warningTone ? '#b42318' : status.tone === 'warn' ? '#b45309' : '#00a676';
  const statusBg = warningTone ? '#fef2f2' : status.tone === 'warn' ? '#fffbeb' : '#f0fdf8';

  const editField = (key, value) => setTerms((prev) => ({ ...prev, [key]: value }));

  const handleCounter = () => {
    if (clubAssessment.accepted) {
      setStatus({
        tone: 'good',
        label: clubAssessment.label,
      });
      setRound((value) => Math.min(3, value + 1));
      return;
    }

    const tonedDown = {
      ...terms,
    };
    if (clubAssessment.roleShifted) {
      tonedDown.role = baseTerms.role === 'Star' ? 'Titulaire' : baseTerms.role;
    }
    if (clubAssessment.durationShifted && terms.contractYears > baseTerms.contractYears) {
      tonedDown.contractYears = Math.max(baseTerms.contractYears, terms.contractYears - 1);
    }
    if (terms.salMult > baseTerms.salMult) {
      tonedDown.salMult = clamp(terms.salMult - 0.04, 0.9, 2.8);
    }
    if (terms.signingBonus > baseTerms.signingBonus) {
      tonedDown.signingBonus = Math.floor(Math.max(baseTerms.signingBonus, terms.signingBonus * 0.92));
    }
    if (terms.releaseClause < baseTerms.releaseClause) {
      tonedDown.releaseClause = Math.floor(Math.max(baseTerms.releaseClause, terms.releaseClause * 1.08));
    }
    if (terms.sellOnPercent < baseTerms.sellOnPercent) {
      tonedDown.sellOnPercent = clamp(baseTerms.sellOnPercent, 0, 25);
    }
    tonedDown.price = Math.floor(terms.price * 0.97);
    setTerms(tonedDown);
    setStatus({
      tone: round >= 3 ? 'danger' : 'warn',
      label: round >= 3
        ? `${clubAssessment.label} Dernière chance avant retrait.`
        : clubAssessment.label,
    });
    setRound((value) => Math.min(3, value + 1));
  };

  const handleSign = () => {
    if (!clubAssessment.accepted) {
      setStatus({
        tone: clubAssessment.roleShifted || clubAssessment.durationShifted ? 'warn' : 'danger',
        label: clubAssessment.label,
      });
      setRound((value) => Math.min(3, value + 1));
      return;
    }
    onSign(buildOutcome(terms));
  };

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
            <div style={{ marginTop: 8, fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', lineHeight: 1.45 }}>
              {clubAssessment.accepted
                ? 'Le bouton signer devient logique uniquement quand le club a validé les points sensibles.'
                : 'Tu dois laisser le club répondre avant de conclure si tu modifies le rôle ou la durée.'}
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
                <div style={S.chDesc}>Le club répond vraiment au rôle, à la durée et au salaire</div>
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
