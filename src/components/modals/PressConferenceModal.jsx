import React, { useMemo, useState } from 'react';
import { AlertCircle, X, ChevronRight, Mic, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { S } from '../styles';
import { getEventImage } from '../../utils/eventImages';
import { buildQuestionSet, pickReporters } from '../../data/pressConferenceQuestions';

const SOCIAL_META = {
  positive: { color: '#00a676', bg: 'oklch(28% 0.10 155 / .35)', border: '#b6f0da', label: 'BUZZ POSITIF', Icon: TrendingUp },
  mixed:    { color: 'oklch(78% 0.16 70)', bg: 'oklch(30% 0.10 80 / .35)', border: '#fcd34d', label: 'RÉACTIONS PARTAGÉES', Icon: Activity },
  negative: { color: '#dc2626', bg: 'oklch(28% 0.12 25 / .35)', border: '#fca5a5', label: 'BAD BUZZ', Icon: TrendingDown },
};

const TONE_COLORS = {
  Diplomate: '#2563eb', Humble: '#2563eb', Mesuré: '#2563eb', Calme: '#2563eb', Loyal: '#2563eb', Protecteur: '#2563eb', Respectueux: '#2563eb', Pro: '#2563eb', Sérieux: '#2563eb', Vision: '#2563eb',
  Honnête: '#b45309', Lucide: '#b45309', Stratège: '#b45309', Confiant: '#b45309', Convaincant: '#b45309', Vulnérable: '#b45309', Inquiet: '#b45309', Assumé: '#b45309', Compétiteur: '#b45309', Ambitieux: '#b45309', Humain: '#b45309',
  Provocateur: '#dc2626', Cassant: '#dc2626', Tranchant: '#dc2626', Cash: '#dc2626', Accusateur: '#dc2626', Dur: '#dc2626', Business: '#dc2626',
};

const sumEffects = (list) => list.reduce((acc, e) => {
  Object.entries(e ?? {}).forEach(([k, v]) => {
    if (typeof v !== 'number') return;
    if (k === 'val') acc.val = (acc.val ?? 1) * v;
    else acc[k] = (acc[k] ?? 0) + v;
  });
  return acc;
}, {});

function EffectRow({ label, value, positive }) {
  if (!value) return null;
  const color = positive ? '#00a676' : '#dc2626';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--af-border)' }}>
      <span style={{ fontSize: 12, color: 'var(--af-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color }}>{value > 0 ? '+' : ''}{value}</span>
    </div>
  );
}

export default function PressConferenceModal({ event, player, onChoose, onClose, week = 1 }) {
  const questions = useMemo(() => buildQuestionSet(player, { week }), [player, week]);
  const reporters = useMemo(() => pickReporters((player.id ?? 1) + week, questions.length), [player, week, questions.length]);

  const [step, setStep] = useState(0); // 0..n-1 = question, n = recap
  const [picked, setPicked] = useState([]); // {questionId, answer}
  const [preview, setPreview] = useState(null); // answer cliquée pas encore confirmée

  const total = questions.length;
  const isRecap = step >= total;

  const handlePick = (answer) => setPreview(answer);
  const handleConfirm = () => {
    const next = [...picked, { questionId: questions[step].id, answer: preview }];
    setPicked(next);
    setPreview(null);
    setStep(step + 1);
  };

  const allEffects = useMemo(() => sumEffects(picked.map((p) => p.answer.effects)), [picked]);
  const valPct = allEffects.val ? Math.round((allEffects.val - 1) * 100) : 0;

  const socialBalance = useMemo(() => {
    const score = picked.reduce((acc, p) => acc + (p.answer.social === 'positive' ? 1 : p.answer.social === 'negative' ? -1 : 0), 0);
    if (score >= 2) return SOCIAL_META.positive;
    if (score <= -2) return SOCIAL_META.negative;
    return SOCIAL_META.mixed;
  }, [picked]);

  const finishConference = () => {
    const summary = picked.map((p, i) => `Q${i + 1}: ${p.answer.tone}`).join(' · ');
    const syntheticChoice = {
      label: `Conférence de presse — ${summary}`,
      desc: 'Bilan agrégé des trois prises de parole.',
      cost: 0,
      effects: allEffects,
    };
    onChoose(event, player, syntheticChoice);
  };

  // ====================== RENDU ======================
  if (isRecap) {
    const SocialIcon = socialBalance.Icon;
    return (
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={{ ...S.mHead, borderTop: `3px solid ${socialBalance.color}` }}>
            <Mic size={16} color={socialBalance.color} />
            <span style={{ color: socialBalance.color }}>FIN DE CONFÉRENCE</span>
            <button onClick={onClose} style={S.mClose}><X size={16} /></button>
          </div>
          <div style={S.mBody}>
            <div style={{ background: socialBalance.bg, border: `1px solid ${socialBalance.border}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <SocialIcon size={26} color={socialBalance.color} />
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.22em', color: socialBalance.color, fontWeight: 900, marginBottom: 3 }}>{socialBalance.label}</div>
                <div style={{ fontSize: 13, color: 'var(--af-text)', fontWeight: 700, lineHeight: 1.3 }}>
                  {player.firstName} {player.lastName} a répondu à {total} questions de la presse.
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '.18em', color: 'var(--af-muted)', fontWeight: 850, marginBottom: 8 }}>RÉSUMÉ DES PRISES DE PAROLE</div>
              <div style={{ background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {picked.map((p, i) => {
                  const meta = SOCIAL_META[p.answer.social];
                  return (
                    <div key={i} style={{ borderLeft: `3px solid ${TONE_COLORS[p.answer.tone] ?? '#888'}`, paddingLeft: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--af-muted)', marginBottom: 2 }}>Q{i + 1} · {questions[i].topic}</div>
                      <div style={{ fontSize: 13, color: 'var(--af-text)', fontWeight: 700 }}>{p.answer.label}</div>
                      <div style={{ fontSize: 11, color: meta.color, marginTop: 2, fontStyle: 'italic' }}>↳ {p.answer.reaction}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '.18em', color: 'var(--af-muted)', fontWeight: 850, marginBottom: 8 }}>
                IMPACT CUMULÉ SUR {player.firstName.toUpperCase()}
              </div>
              <div style={{ background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 8, padding: '2px 12px' }}>
                <EffectRow label="💪 Moral" value={allEffects.moral ?? 0} positive={(allEffects.moral ?? 0) > 0} />
                <EffectRow label="🤝 Confiance" value={allEffects.trust ?? 0} positive={(allEffects.trust ?? 0) > 0} />
                <EffectRow label="⭐ Réputation" value={allEffects.rep ?? 0} positive={(allEffects.rep ?? 0) > 0} />
                <EffectRow label="🌡️ Pression" value={allEffects.pressure ?? 0} positive={(allEffects.pressure ?? 0) < 0} />
                {valPct !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ fontSize: 12, color: 'var(--af-muted)' }}>📈 Valeur marché</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: valPct > 0 ? '#00a676' : '#dc2626' }}>{valPct > 0 ? '+' : ''}{valPct}%</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={finishConference}
              style={{ ...S.primaryBtn, marginBottom: 0, background: `linear-gradient(135deg,${socialBalance.color},${socialBalance.color}cc)` }}
            >
              CLORE LA CONFÉRENCE →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Étape question =====
  const q = questions[step];
  const reporter = reporters[step] ?? reporters[0];
  const previewMeta = preview ? SOCIAL_META[preview.social] : null;

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <AlertCircle size={16} color="#00a676" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
            <span>CONFÉRENCE DE PRESSE</span>
            <span style={{ fontSize: 8, letterSpacing: '.15em', color: '#00a676', fontWeight: 900, background: 'oklch(28% 0.10 155 / .25)', padding: '2px 7px', borderRadius: 20, border: '1px solid #00a67640' }}>
              QUESTION {step + 1}/{total}
            </span>
          </div>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>

        <div style={S.mBody}>
          {/* Image salle de presse */}
          <div style={{ margin: '-4px -4px 12px', borderRadius: 10, overflow: 'hidden', aspectRatio: '16 / 9', background: '#0a0f14', position: 'relative' }}>
            <img src={getEventImage({ eventId: 'press_conference_week', type: 'media' })} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.7))' }} />
            <div style={{ position: 'absolute', left: 12, bottom: 10, right: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#fff', opacity: .8 }}>EN DIRECT · {player.club}</div>
              <div style={{ fontSize: 16, color: '#fff', fontWeight: 800 }}>{player.firstName} {player.lastName}</div>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {questions.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < step ? '#00a676' : i === step ? 'oklch(78% 0.16 70)' : 'var(--af-border)' }} />
            ))}
          </div>

          {/* Journaliste */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: 'linear-gradient(135deg,#1f2937,#0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--af-border)' }}>
              <Mic size={16} color="#00a676" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--af-text)', fontWeight: 800 }}>{reporter.name}</div>
              <div style={{ fontSize: 11, color: 'var(--af-muted)' }}>{reporter.outlet} · thème : {q.topic}</div>
            </div>
          </div>

          {/* Question */}
          <p style={{ ...S.mText, fontStyle: 'italic', borderLeft: '3px solid #00a676', paddingLeft: 12, margin: '0 0 14px' }}>
            « {q.question(player)} »
          </p>

          {/* Preview de la réponse choisie (avant confirmation) */}
          {preview && previewMeta && (
            <div style={{ background: previewMeta.bg, border: `1px solid ${previewMeta.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: '.18em', color: previewMeta.color, fontWeight: 900, marginBottom: 4 }}>
                {previewMeta.label} — Aperçu
              </div>
              <div style={{ fontSize: 12, color: 'var(--af-text)', fontStyle: 'italic', marginBottom: 8 }}>↳ {preview.reaction}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(preview.effects).filter(([k, v]) => typeof v === 'number' && k !== 'val' && v !== 0).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 4, background: v > 0 ? 'oklch(28% 0.10 155 / .35)' : 'oklch(28% 0.12 25 / .35)', color: v > 0 ? '#00a676' : '#dc2626', letterSpacing: '.05em' }}>
                    {k.toUpperCase()} {v > 0 ? '+' : ''}{v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Réponses */}
          <div style={S.choiceList}>
            {q.answers.map((ans) => {
              const tone = TONE_COLORS[ans.tone] ?? '#6b7280';
              const isSelected = preview === ans;
              return (
                <button
                  key={ans.label}
                  onClick={() => handlePick(ans)}
                  style={{
                    ...S.choiceBtn,
                    borderLeft: `4px solid ${tone}`,
                    background: isSelected ? 'oklch(22% 0.05 258 / .9)' : 'var(--af-surface)',
                    boxShadow: isSelected ? `0 0 0 1px ${tone}55` : 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, letterSpacing: '.18em', color: tone, fontWeight: 900, marginBottom: 3 }}>{ans.tone.toUpperCase()}</div>
                    <div style={S.chLabel}>{ans.label}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleConfirm}
            disabled={!preview}
            style={{
              ...S.primaryBtn,
              marginTop: 8,
              opacity: preview ? 1 : 0.4,
              cursor: preview ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {step === total - 1 ? 'VOIR LE BILAN' : 'QUESTION SUIVANTE'} <ChevronRight size={16} />
          </button>

          {step === 0 && !preview && (
            <button onClick={onClose} style={{ ...S.secBtn, marginTop: 8 }}>ZAPPER LA CONFÉRENCE</button>
          )}
        </div>
      </div>
    </div>
  );
}
