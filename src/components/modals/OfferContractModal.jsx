import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, RefreshCcw, X } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

const ROLE_OPTIONS = ['Rotation', 'Titulaire', 'Star', 'Projet jeune'];
const DURATION_OPTIONS = [1, 2, 3, 4, 5];
const SIGNING_BONUS_MAX_MULTIPLIER = 30;
const RELEASE_CLAUSE_MIN_MULTIPLIER = 0.8;
const RELEASE_CLAUSE_MAX_MULTIPLIER = 4.5;
const BONUS_PACKAGE_MAX_MULTIPLIER = 24;
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, Number(value)));

const sanitizeMoney = (value, min, max) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));

const roleRank = (role) => Math.max(0, ROLE_OPTIONS.indexOf(role));

const getBaseTerms = (offer, player) => ({
  price: offer.price,
  salMult: offer.salMult ?? 1.2,
  role: player.clubRole ?? (player.rating >= 82 ? 'Titulaire' : 'Rotation'),
  contractYears: clampNumber(player.age <= 22 ? 4 : player.age >= 31 ? 2 : 3, 1, 5),
  signingBonus: sanitizeMoney((player.weeklySalary ?? 10000) * 8, 3000, Math.max(3000, Math.floor((player.weeklySalary ?? 10000) * SIGNING_BONUS_MAX_MULTIPLIER))),
  releaseClause: sanitizeMoney(
    (player.value ?? 1000000) * 1.7,
    Math.max(50000, Math.floor((player.value ?? 1000000) * RELEASE_CLAUSE_MIN_MULTIPLIER)),
    Math.max(50000, Math.floor((player.value ?? 1000000) * RELEASE_CLAUSE_MAX_MULTIPLIER)),
  ),
  sellOnPercent: player.age <= 23 ? 10 : 5,
  bonusPackage: sanitizeMoney((player.weeklySalary ?? 10000) * 10, 5000, Math.max(5000, Math.floor((player.weeklySalary ?? 10000) * BONUS_PACKAGE_MAX_MULTIPLIER))),
});

const assessClubReaction = (terms, baseTerms, round, player) => {
  const roleGap = roleRank(terms.role) - roleRank(baseTerms.role);
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

  const patience = 0.26 + (round - 1) * 0.08;
  const accepted = pressure <= patience;
  const roleShifted = roleGap !== 0;
  const durationShifted = yearsGap !== 0;

  let label = 'Le club écoute sans valider.';
  if (accepted) {
    if (roleShifted && durationShifted) {
      label = 'Le club accepte le principe du rôle et de la durée. Les détails sont prêts à être signés.';
    } else if (roleShifted) {
      label = 'Le club accepte le principe, mais veut verrouiller le rôle.';
    } else if (durationShifted) {
      label = 'Le club accepte la durée demandée.';
    } else {
      label = 'Le club valide les termes. Tu peux signer.';
    }
  } else if (roleShifted) {
    label = `Le club refuse pour l'instant ${terms.role} et veut revenir à ${baseTerms.role}.`;
  } else if (yearsGap > 0) {
    label = `Le club préfère ${baseTerms.contractYears} ans au lieu de ${terms.contractYears}.`;
  } else if (salaryGap > 0.1) {
    label = 'Le club trouve le salaire trop élevé et demande un effort.';
  } else {
    label = 'Le club veut un autre tour de discussion.';
  }

  return { accepted, label, roleShifted, durationShifted };
};

const buildOutcome = (terms, player, offer) => {
  const maxPrice = Math.max(1000, Math.floor(Math.max(player?.value ?? 0, offer?.price ?? 0) * 4));
  const maxSigningBonus = Math.max(3000, Math.floor((player?.weeklySalary ?? 10000) * SIGNING_BONUS_MAX_MULTIPLIER));
  const maxReleaseClause = Math.max(50000, Math.floor((player?.value ?? 1000000) * RELEASE_CLAUSE_MAX_MULTIPLIER));
  const minReleaseClause = Math.max(50000, Math.floor((player?.value ?? 1000000) * RELEASE_CLAUSE_MIN_MULTIPLIER));
  const maxBonusPackage = Math.max(5000, Math.floor((player?.weeklySalary ?? 10000) * BONUS_PACKAGE_MAX_MULTIPLIER));
  const bonusTotal = sanitizeMoney(terms.bonusPackage, 5000, maxBonusPackage);

  return {
    success: true,
    price: sanitizeMoney(terms.price, 1000, maxPrice),
    salMult: Number(clampNumber(terms.salMult, 0.9, 3).toFixed(2)),
    role: terms.role,
    contractWeeks: clampNumber(Math.round(terms.contractYears) * 52, 52, 260),
    signingBonus: sanitizeMoney(terms.signingBonus, 3000, maxSigningBonus),
    releaseClause: sanitizeMoney(terms.releaseClause, minReleaseClause, maxReleaseClause),
    sellOnPercent: clampNumber(Math.floor(terms.sellOnPercent), 0, 20),
    clubBonuses: {
      total: bonusTotal,
      goals: Math.floor(bonusTotal * 0.35),
      appearances: Math.floor(bonusTotal * 0.35),
      europe: Math.floor(bonusTotal * 0.3),
    },
    contractClauses: {
      rolePromise: terms.role,
      rolePromiseStrength: terms.role === 'Star' ? 'forte' : terms.role === 'Titulaire' ? 'normale' : 'limitée',
      coachRoleProtection: true,
    },
  };
};

function SelectPills({ label, values, value, onChange, suffix = '' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={S.fieldLabel}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {values.map((item) => {
          const active = String(item) === String(value);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              style={{
                border: `1px solid ${active ? '#00a676' : '#d6dde3'}`,
                background: active ? '#f0fdf8' : '#ffffff',
                color: active ? '#00a676' : '#172026',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 850,
                cursor: 'pointer',
                fontFamily: 'system-ui,sans-serif',
              }}
            >
              {item}{suffix}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OfferContractModal({ offer, player, readiness, mode = 'offer', onClose, onSign, onReject }) {
  const baseTerms = useMemo(() => getBaseTerms(offer, player), [offer, player]);
  const [terms, setTerms] = useState(() => getBaseTerms(offer, player));
  const [status, setStatus] = useState({
    tone: readiness?.tone ?? 'good',
    label: readiness?.reason ?? 'Offre prête.',
  });
  const [round, setRound] = useState(1);
  const [stage, setStage] = useState(readiness?.ok ? 'approved' : 'draft');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const clubAssessment = useMemo(
    () => assessClubReaction(terms, baseTerms, round, player),
    [terms, baseTerms, round, player],
  );

  const warningTone = status.tone === 'danger';
  const statusColor = warningTone ? '#b42318' : status.tone === 'warn' ? '#b45309' : '#00a676';
  const statusBg = warningTone ? '#fef2f2' : status.tone === 'warn' ? '#fffbeb' : '#f0fdf8';

  const updateField = (key, value) => {
    const nextValue = (() => {
      if (key === 'price') return sanitizeMoney(value, 1000, Math.max(1000, Math.floor((offer.price ?? 1000000) * 4)));
      if (key === 'contractYears') return clampNumber(Number(value), 1, 5);
      if (key === 'salMult') return clampNumber(Number(value), 0.9, 3);
      if (key === 'signingBonus') return sanitizeMoney(value, 3000, Math.max(3000, Math.floor((player.weeklySalary ?? 10000) * SIGNING_BONUS_MAX_MULTIPLIER)));
      if (key === 'releaseClause') return sanitizeMoney(value, 50000, Math.max(50000, Math.floor((player.value ?? 1000000) * RELEASE_CLAUSE_MAX_MULTIPLIER)));
      if (key === 'sellOnPercent') return clampNumber(Math.floor(Number(value)), 0, 25);
      if (key === 'bonusPackage') return sanitizeMoney(value, 5000, Math.max(5000, Math.floor((player.weeklySalary ?? 10000) * BONUS_PACKAGE_MAX_MULTIPLIER)));
      return value;
    })();
    setTerms((prev) => ({ ...prev, [key]: nextValue }));
    setStage('draft');
    setStatus({
      tone: 'warn',
      label: 'Nouvelle version préparée. Il faut renvoyer au club pour obtenir sa réponse.',
    });
  };

  const handleCounter = () => {
    if (clubAssessment.accepted) {
      setStatus({ tone: 'good', label: clubAssessment.label });
      setStage('approved');
      setRound((value) => Math.min(3, value + 1));
      return;
    }

    const tonedDown = { ...terms };
    if (clubAssessment.roleShifted) {
      tonedDown.role = baseTerms.role === 'Star' ? 'Titulaire' : baseTerms.role;
    }
    if (clubAssessment.durationShifted && terms.contractYears > baseTerms.contractYears) {
      tonedDown.contractYears = Math.max(baseTerms.contractYears, terms.contractYears - 1);
    }
    if (terms.salMult > baseTerms.salMult) {
      tonedDown.salMult = clampNumber(terms.salMult - 0.04, 0.9, 2.8);
    }
    if (terms.signingBonus > baseTerms.signingBonus) {
      tonedDown.signingBonus = Math.floor(Math.max(baseTerms.signingBonus, terms.signingBonus * 0.92));
    }
    if (terms.releaseClause < baseTerms.releaseClause) {
      tonedDown.releaseClause = Math.floor(Math.max(baseTerms.releaseClause, terms.releaseClause * 1.08));
    }
    if (terms.sellOnPercent < baseTerms.sellOnPercent) {
      tonedDown.sellOnPercent = baseTerms.sellOnPercent;
    }
    tonedDown.price = Math.floor(terms.price * 0.97);

    setTerms(tonedDown);
    setStage('draft');
    setStatus({
      tone: round >= 3 ? 'danger' : 'warn',
      label: round >= 3 ? `${clubAssessment.label} Dernière chance avant retrait.` : clubAssessment.label,
    });
    setRound((value) => Math.min(3, value + 1));
  };

  const handleSign = () => {
    if (stage !== 'approved' || !clubAssessment.accepted) {
      setStatus({
        tone: clubAssessment.roleShifted || clubAssessment.durationShifted ? 'warn' : 'danger',
        label: 'Le club n\'a pas encore validé cette version du contrat.',
      });
      return;
    }
    onSign(buildOutcome(terms, player, offer));
  };

  const signLabel = stage === 'approved' && clubAssessment.accepted
    ? mode === 'extend'
      ? `Prolonger ${terms.contractYears} ans`
      : `Signer ${terms.contractYears} ans`
    : 'Attendre la réponse du club';

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <ArrowUpRight size={16} color="#00a676" />
          <span>{mode === 'extend' ? 'PROLONGATION' : 'CONTRAT CLUB'} · TOUR {round}/3</span>
          <button type="button" onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <h2 style={S.mTitle}>{offer.club ?? player.club ?? 'Club'}</h2>
          <div style={S.mPlayer}>
            {player.firstName} {player.lastName} · {mode === 'extend' ? 'prolongation' : offer.preWindow ? 'pré-accord' : 'offre active'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: '1. Tu choisis', detail: 'Rôle, durée, clauses' },
              { label: '2. Le club répond', detail: 'Oui / non / ajuste' },
              { label: '3. Tu signes', detail: 'Seulement après accord' },
            ].map((item, index) => {
              const active = index === 0 || (index === 1 && stage !== 'draft') || (index === 2 && stage === 'approved');
              return (
                <div key={item.label} style={{
                  background: active ? '#f3fbf8' : '#f7f9fb',
                  border: `1px solid ${active ? '#cfeee3' : '#e5eaf0'}`,
                  borderRadius: 8,
                  padding: 10,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: '.12em', color: active ? '#00a676' : '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 3 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#3f5663', fontFamily: 'system-ui,sans-serif', lineHeight: 1.35 }}>
                    {item.detail}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={S.objCard}>
            <div style={S.secTitle}>{mode === 'extend' ? 'BASE PROLONGATION' : 'BASE CLUB'}</div>
            {offer.price != null && (
              <div style={S.sumRow}><span style={S.sumK}>Montant</span><strong>{formatMoney(offer.price)}</strong></div>
            )}
            <div style={S.sumRow}><span style={S.sumK}>Salaire</span><strong>x{(offer.salMult ?? 1.2).toFixed(2)}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Fenêtre</span><strong>{offer.preWindow ? `S${offer.effectiveWeek}` : `S${offer.expiresWeek}`}</strong></div>
          </div>

          <div style={S.negoStat}>
            <div style={S.nsLabel}>TES CONDITIONS</div>
            <div style={S.formGrid}>
              <label style={S.fieldLabel}>
                Montant
                <input type="number" min="1000" max={Math.max(1000, Math.floor((offer.price ?? 1000000) * 4))} step="10000" value={terms.price} onChange={(event) => updateField('price', Math.max(1000, Number(event.target.value)))} style={S.textInput} />
              </label>
              <label style={S.fieldLabel}>
                Salaire
                <input type="number" min="0.9" max="3" step="0.01" value={terms.salMult} onChange={(event) => updateField('salMult', clampNumber(Number(event.target.value), 0.9, 3))} style={S.textInput} />
              </label>
            </div>
            <SelectPills label="Rôle" values={ROLE_OPTIONS} value={terms.role} onChange={(role) => updateField('role', role)} />
            <SelectPills label="Durée" values={DURATION_OPTIONS} value={terms.contractYears} onChange={(years) => updateField('contractYears', years)} suffix=" ans" />
            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              style={{
                ...S.miniGhost,
                width: '100%',
                margin: '6px 0 12px',
                padding: '10px 12px',
                fontSize: 11,
                textAlign: 'center',
              }}
            >
              {showAdvanced ? 'Masquer les options avancées' : 'Afficher les options avancées'}
            </button>
            {showAdvanced && (
              <div style={S.formGrid}>
                <label style={S.fieldLabel}>
                  Prime
                  <input type="number" min="3000" max={Math.max(3000, Math.floor((player.weeklySalary ?? 10000) * SIGNING_BONUS_MAX_MULTIPLIER))} step="1000" value={terms.signingBonus} onChange={(event) => updateField('signingBonus', Math.max(0, Number(event.target.value)))} style={S.textInput} />
                </label>
                <label style={S.fieldLabel}>
                  Clause
                  <input type="number" min="50000" max={Math.max(50000, Math.floor((player.value ?? 1000000) * RELEASE_CLAUSE_MAX_MULTIPLIER))} step="10000" value={terms.releaseClause} onChange={(event) => updateField('releaseClause', Math.max(0, Number(event.target.value)))} style={S.textInput} />
                </label>
                <label style={S.fieldLabel}>
                  Revente %
                  <input type="number" min="0" max="25" value={terms.sellOnPercent} onChange={(event) => updateField('sellOnPercent', clampNumber(Number(event.target.value), 0, 25))} style={S.textInput} />
                </label>
                <label style={S.fieldLabel}>
                  Bonus
                  <input type="number" min="5000" max={Math.max(5000, Math.floor((player.weeklySalary ?? 10000) * BONUS_PACKAGE_MAX_MULTIPLIER))} step="1000" value={terms.bonusPackage} onChange={(event) => updateField('bonusPackage', Math.max(0, Number(event.target.value)))} style={S.textInput} />
                </label>
              </div>
            )}
          </div>

          <div style={{ background: statusBg, border: `1px solid ${statusColor}30`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: '.16em', color: statusColor, fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 4 }}>
              RETOUR CLUB
            </div>
            <div style={{ fontSize: 13, color: '#172026', fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 }}>
              {status.label}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', lineHeight: 1.45 }}>
              {stage === 'approved'
                ? 'Le club a validé cette version du contrat. Tu peux signer.'
                : 'Tu modifies, tu envoies, puis tu attends la réponse du club avant de signer.'}
            </div>
          </div>

          <div style={S.choiceList}>
            <button
              type="button"
              onClick={handleSign}
              style={{
                ...S.choiceBtn,
                borderColor: clubAssessment.accepted ? '#00a676' : '#d6dde3',
                opacity: clubAssessment.accepted ? 1 : 0.7,
              }}
              disabled={stage !== 'approved' || !clubAssessment.accepted}
            >
              <div>
                <div style={{ ...S.chLabel, color: clubAssessment.accepted ? '#00a676' : '#64727d' }}>
                  <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                  {signLabel}
                </div>
                <div style={S.chDesc}>{terms.contractYears} ans · {terms.role} · {formatMoney(terms.price)}</div>
              </div>
            </button>
            <button type="button" onClick={handleCounter} style={S.choiceBtn}>
              <div>
                <div style={S.chLabel}><RefreshCcw size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />Envoyer au club</div>
                <div style={S.chDesc}>Le club réagit vraiment au rôle, à la durée et au salaire</div>
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
