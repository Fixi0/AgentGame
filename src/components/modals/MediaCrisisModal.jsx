import React, { useState } from 'react';
import { X, Flame, AlertTriangle, CheckCircle, Mic, EyeOff, Zap } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

const CRISIS_LABELS = {
  scandal:     { label: 'SCANDALE',     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  controversy: { label: 'CONTROVERSE',  color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
  leak:        { label: 'FUITE',        color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
};

function SeverityFlames({ severity }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, marginLeft: 6 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Flame
          key={i}
          size={14}
          color={i < severity ? '#dc2626' : '#e5eaf0'}
          fill={i < severity ? '#dc2626' : 'none'}
        />
      ))}
    </span>
  );
}

function EffectTag({ label, value, positive }) {
  if (value === 0 || value == null) return null;
  const color = positive ? '#00a676' : '#dc2626';
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 800,
      fontFamily: 'system-ui,sans-serif',
      color,
      background: `${color}12`,
      border: `1px solid ${color}30`,
      borderRadius: 5,
      padding: '2px 6px',
    }}>
      {positive && value > 0 ? '+' : ''}{value} {label}
    </span>
  );
}

function ChoiceCard({ choice, money, selected, onSelect }) {
  const { label, desc, cost, effects, riskLevel, icon: Icon, accentColor } = choice;
  const canAfford = !cost || money >= cost;
  const isSelected = selected?.id === choice.id;

  return (
    <button
      onClick={() => canAfford && onSelect(choice)}
      disabled={!canAfford}
      style={{
        ...S.choiceBtn,
        opacity: canAfford ? 1 : 0.45,
        cursor: canAfford ? 'pointer' : 'not-allowed',
        borderLeft: `4px solid ${accentColor}`,
        background: isSelected ? `${accentColor}08` : '#ffffff',
        outline: isSelected ? `2px solid ${accentColor}` : 'none',
        outlineOffset: -1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px',
        marginBottom: 2,
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: `${accentColor}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
      }}>
        <Icon size={15} color={accentColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.chLabel}>{label}</div>
        <div style={{ ...S.chDesc, marginBottom: 8 }}>{desc}</div>

        {/* Cost */}
        {cost > 0 && (
          <div style={{ fontSize: 11, color: canAfford ? '#b45309' : '#dc2626', fontFamily: 'system-ui,sans-serif', fontWeight: 700, marginBottom: 6 }}>
            Coût : {formatMoney(cost)}{!canAfford ? ' — fonds insuffisants' : ''}
          </div>
        )}
        {!cost && (
          <div style={{ fontSize: 10, color: '#00a676', fontFamily: 'system-ui,sans-serif', fontWeight: 700, marginBottom: 6 }}>
            Gratuit
          </div>
        )}

        {/* Effect tags */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <EffectTag label="Rép" value={effects.rep} positive={(effects.rep ?? 0) > 0} />
          <EffectTag label="Moral" value={effects.moral} positive={(effects.moral ?? 0) > 0} />
          {effects.trust != null && (
            <EffectTag label="Confiance" value={effects.trust} positive={(effects.trust ?? 0) > 0} />
          )}
        </div>

        {/* Risk badge */}
        <div style={{ marginTop: 7 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: '.1em',
            fontFamily: 'system-ui,sans-serif',
            color: riskLevel === 'high' ? '#dc2626' : riskLevel === 'medium' ? '#b45309' : '#00a676',
            background: riskLevel === 'high' ? '#fef2f2' : riskLevel === 'medium' ? '#fffbeb' : '#f0fdf8',
            border: `1px solid ${riskLevel === 'high' ? '#fca5a5' : riskLevel === 'medium' ? '#fcd34d' : '#b6f0da'}`,
            borderRadius: 5,
            padding: '2px 6px',
          }}>
            {riskLevel === 'high' ? '⚡ RISQUÉ' : riskLevel === 'medium' ? '~ MODÉRÉ' : '✓ SÛR'}
          </span>
        </div>
      </div>
    </button>
  );
}

function OutcomeScreen({ player, crisis, choice, onResolve, onClose }) {
  const effects = choice.effects;
  const cost = choice.cost ?? 0;
  const crisisStyle = CRISIS_LABELS[crisis.type] ?? CRISIS_LABELS.controversy;

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 460, width: '100%', margin: '0 auto' }}>
        <div style={{ ...S.mHead, borderTop: `3px solid ${crisisStyle.color}` }}>
          <CheckCircle size={16} color="#00a676" />
          <span style={{ color: '#00a676' }}>RÉSULTAT DE LA GESTION</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          {/* Verdict */}
          <div style={{
            background: '#f0fdf8',
            border: '1px solid #b6f0da',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>✓</span>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.22em', color: '#00a676', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 3 }}>
                DÉCISION PRISE
              </div>
              <div style={{ fontSize: 14, color: '#172026', fontWeight: 800 }}>{choice.label}</div>
              <div style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginTop: 2 }}>{choice.desc}</div>
            </div>
          </div>

          {/* Effects breakdown */}
          <div style={{ marginBottom: 16 }}>
            <div style={S.secTitle}>
              EFFETS SUR {player?.firstName?.toUpperCase()} {player?.lastName?.toUpperCase()}
            </div>
            <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: '2px 12px' }}>
              {effects.rep != null && effects.rep !== 0 && (
                <div style={{ ...S.sumRow }}>
                  <span style={S.sumK}>⭐ Réputation</span>
                  <span style={{ fontWeight: 800, color: effects.rep > 0 ? '#00a676' : '#dc2626' }}>
                    {effects.rep > 0 ? '+' : ''}{effects.rep}
                  </span>
                </div>
              )}
              {effects.moral != null && effects.moral !== 0 && (
                <div style={{ ...S.sumRow }}>
                  <span style={S.sumK}>💪 Moral</span>
                  <span style={{ fontWeight: 800, color: effects.moral > 0 ? '#00a676' : '#dc2626' }}>
                    {effects.moral > 0 ? '+' : ''}{effects.moral}
                  </span>
                </div>
              )}
              {effects.trust != null && effects.trust !== 0 && (
                <div style={{ ...S.sumRow, borderBottom: 'none' }}>
                  <span style={S.sumK}>🤝 Confiance</span>
                  <span style={{ fontWeight: 800, color: effects.trust > 0 ? '#00a676' : '#dc2626' }}>
                    {effects.trust > 0 ? '+' : ''}{effects.trust}
                  </span>
                </div>
              )}
              {cost > 0 && (
                <div style={{ ...S.sumRow, borderBottom: 'none' }}>
                  <span style={S.sumK}>💸 Coût engagé</span>
                  <span style={{ fontWeight: 800, color: '#dc2626' }}>−{formatMoney(cost)}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onResolve({ choice, effects, cost })}
            style={{ ...S.primaryBtn, marginBottom: 0 }}
          >
            CONFIRMER →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MediaCrisisModal({ player, crisis, money, onResolve, onClose }) {
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const sev = crisis?.severity ?? 1;
  const crisisStyle = CRISIS_LABELS[crisis?.type] ?? CRISIS_LABELS.controversy;

  const choices = [
    {
      id: 'press',
      label: 'Conférence de presse + excuses',
      desc: 'Organiser une déclaration publique pour reconnaître et calmer la situation.',
      cost: sev * 2000,
      effects: { rep: sev, moral: -3, trust: 2 },
      riskLevel: 'low',
      icon: Mic,
      accentColor: '#00a676',
    },
    {
      id: 'silence',
      label: 'Silence médiatique',
      desc: 'Laisser passer la tempête. Ne rien dire et attendre que ça se tasse.',
      cost: 0,
      effects: { rep: -sev, moral: 2 },
      riskLevel: 'medium',
      icon: EyeOff,
      accentColor: '#b45309',
    },
    {
      id: 'counter',
      label: 'Contre-attaque médiatique',
      desc: 'Riposter agressivement et reprendre le contrôle du récit. Risque élevé, récompense élevée.',
      cost: sev * 3000,
      effects: { rep: sev * 2 - 2, moral: 4, trust: -3 },
      riskLevel: 'high',
      icon: Zap,
      accentColor: '#dc2626',
    },
  ];

  if (confirmed && selected) {
    return (
      <OutcomeScreen
        player={player}
        crisis={crisis}
        choice={selected}
        onResolve={onResolve}
        onClose={onClose}
      />
    );
  }

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 460, width: '100%', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ ...S.mHead, borderTop: `3px solid ${crisisStyle.color}` }}>
          <AlertTriangle size={16} color={crisisStyle.color} />
          <span style={{ color: crisisStyle.color }}>CRISE MÉDIATIQUE</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>

        <div style={S.mBody}>
          {/* Crisis type + severity */}
          <div style={{
            background: crisisStyle.bg,
            border: `1px solid ${crisisStyle.border}`,
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '.2em', color: crisisStyle.color, fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 2 }}>
                {crisisStyle.label}
                <SeverityFlames severity={sev} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 850, color: '#172026' }}>{crisis?.title ?? 'Incident médiatique'}</div>
            </div>
          </div>

          {/* Player + description */}
          <div style={S.mPlayer}>
            {player?.firstName} {player?.lastName}{player?.club ? ` · ${player.club}` : ''}
          </div>
          <p style={S.mText}>{crisis?.description ?? 'Une situation sensible nécessite ta gestion immédiate.'}</p>

          {/* Choices */}
          <div style={{ ...S.secTitle, marginBottom: 10 }}>CHOISIR UNE RÉPONSE</div>
          <div style={S.choiceList}>
            {choices.map(choice => (
              <ChoiceCard
                key={choice.id}
                choice={choice}
                money={money}
                selected={selected}
                onSelect={setSelected}
              />
            ))}
          </div>

          {/* Confirm button */}
          <button
            onClick={() => selected && setConfirmed(true)}
            disabled={!selected}
            style={{
              ...S.primaryBtn,
              marginTop: 14,
              marginBottom: 0,
              opacity: selected ? 1 : 0.4,
              cursor: selected ? 'pointer' : 'not-allowed',
            }}
          >
            {selected ? `CONFIRMER : ${selected.label.toUpperCase()}` : 'CHOISIR UNE RÉPONSE'}
          </button>
        </div>
      </div>
    </div>
  );
}
