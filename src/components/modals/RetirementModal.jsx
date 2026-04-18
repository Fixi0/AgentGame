import React from 'react';
import { X, Award, TrendingUp, Users, Star } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

const DECISIONS = [
  {
    id: 'retire_graceful',
    label: 'Retraite sportive',
    subtitle: 'Il raccroche les crampons.',
    desc: 'Fin de mandat en beauté. Tu touches une prime de départ et gagnes en réputation pour avoir bien géré sa fin de carrière.',
    icon: Award,
    accentColor: '#00a676',
    effects: [
      { emoji: '💰', label: 'Prime de départ', value: '+commission', positive: true },
      { emoji: '⭐', label: 'Réputation agent', value: '+4', positive: true },
      { emoji: '📋', label: 'Mandat', value: 'Fin', positive: false },
    ],
  },
  {
    id: 'one_more_year',
    label: 'Une saison de plus',
    subtitle: 'Il pousse jusqu\'à 35+ ans.',
    desc: 'Tu prolonges d\'une saison. Commissions continues, mais le risque de blessure augmente significativement et la valeur marché chute.',
    icon: TrendingUp,
    accentColor: '#b45309',
    effects: [
      { emoji: '💸', label: 'Commissions', value: 'Continue', positive: true },
      { emoji: '🤕', label: 'Risque blessure', value: '++', positive: false },
      { emoji: '📉', label: 'Valeur marché', value: '−30%', positive: false },
    ],
  },
  {
    id: 'coaching',
    label: 'Reconversion entraîneur',
    subtitle: 'Il devient adjoint dans son club.',
    desc: 'Il reste dans le football comme staff technique. Tu conserves un lien commercial durable et gagnes en confiance auprès du club.',
    icon: Users,
    accentColor: '#2563eb',
    effects: [
      { emoji: '🤝', label: 'Confiance', value: '+5', positive: true },
      { emoji: '💰', label: 'Revenu récurrent', value: '+200/sem.', positive: true },
      { emoji: '📋', label: 'Lien commercial', value: 'Maintenu', positive: true },
    ],
  },
  {
    id: 'ambassador',
    label: 'Ambassadeur de marque',
    subtitle: 'Il signe avec un sponsor.',
    desc: 'Il devient visage d\'une marque. Tu touches 10% des deals sponsoring. Revenu passif entre 500€ et 1500€/semaine selon sa notoriété.',
    icon: Star,
    accentColor: '#7c3aed',
    effects: [
      { emoji: '💰', label: 'Revenu passif', value: '+500–1500/sem.', positive: true },
      { emoji: '📣', label: 'Réputation publique', value: '+3', positive: true },
      { emoji: '🤝', label: 'Confiance', value: '+2', positive: true },
    ],
  },
];

function StatBadge({ label, value, color = '#00a676' }) {
  return (
    <div style={{
      flex: 1,
      background: '#f7f9fb',
      border: '1px solid #e5eaf0',
      borderRadius: 8,
      padding: '8px 6px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 17, fontWeight: 900, color, lineHeight: 1, marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: '.1em', color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 800 }}>{label}</div>
    </div>
  );
}

function EffectRow({ emoji, label, value, positive }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f4f7' }}>
      <span style={{ fontSize: 12, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>{emoji} {label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: positive ? '#00a676' : '#dc2626', fontFamily: 'system-ui,sans-serif' }}>{value}</span>
    </div>
  );
}

function DecisionCard({ decision, onDecide }) {
  const { id, label, subtitle, desc, icon: Icon, accentColor, effects } = decision;

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${accentColor}30`,
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0 10px 28px rgba(15,23,32,.07)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `${accentColor}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={17} color={accentColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 850, color: '#172026', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 11, color: accentColor, fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>{subtitle}</div>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: '#3f5663', fontFamily: 'system-ui,sans-serif', lineHeight: 1.55, marginBottom: 12, marginTop: 0 }}>
        {desc}
      </p>

      {/* Effects */}
      <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: '2px 12px', marginBottom: 12 }}>
        {effects.map((ef, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < effects.length - 1 ? '1px solid #f0f4f7' : 'none',
            }}
          >
            <span style={{ fontSize: 12, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>
              {ef.emoji} {ef.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: ef.positive ? '#00a676' : '#dc2626', fontFamily: 'system-ui,sans-serif' }}>
              {ef.value}
            </span>
          </div>
        ))}
      </div>

      {/* Confirm button */}
      <button
        onClick={() => onDecide(id)}
        style={{
          width: '100%',
          background: `linear-gradient(135deg,${accentColor},${accentColor}cc)`,
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          padding: '11px 16px',
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '.12em',
          fontFamily: 'system-ui,sans-serif',
          cursor: 'pointer',
          boxShadow: `0 12px 26px ${accentColor}40`,
        }}
      >
        CHOISIR : {label.toUpperCase()} →
      </button>
    </div>
  );
}

export default function RetirementModal({ player, week, onDecide, onClose }) {
  const age = player?.age ?? 33;
  const stats = player?.seasonStats ?? {};
  const matches = stats.matches ?? stats.apps ?? 0;
  const goals = stats.goals ?? 0;
  const assists = stats.assists ?? 0;
  const rating = player?.rating ?? 70;
  const fullName = `${player?.firstName ?? ''} ${player?.lastName ?? ''}`.trim();

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 460, width: '100%', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ ...S.mHead, borderTop: '3px solid #b45309' }}>
          <Award size={16} color="#b45309" />
          <span style={{ color: '#b45309' }}>FIN DE CARRIÈRE</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>

        <div style={S.mBody}>
          {/* Player hero */}
          <div style={{
            background: 'linear-gradient(135deg,#172026,#2c3a42)',
            borderRadius: 10,
            padding: '18px 16px',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              fontSize: 22,
              fontWeight: 900,
              color: '#ffffff',
              border: '2px solid rgba(255,255,255,.2)',
            }}>
              {(player?.firstName?.[0] ?? '?')}{(player?.lastName?.[0] ?? '')}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', letterSpacing: '-.01em', marginBottom: 2 }}>
              {fullName || 'Joueur'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontFamily: 'system-ui,sans-serif' }}>
              {age} ans · {player?.position ?? '—'} · {player?.club ?? '—'}
            </div>
            {age >= 33 && (
              <div style={{
                display: 'inline-block',
                marginTop: 10,
                background: '#b4530918',
                border: '1px solid #b45309',
                color: '#f97316',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '.1em',
                fontFamily: 'system-ui,sans-serif',
              }}>
                EN FIN DE CARRIÈRE
              </div>
            )}
          </div>

          {/* Career stats */}
          <div style={{ ...S.secTitle, marginBottom: 10 }}>BILAN DE CARRIÈRE</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <StatBadge label="MATCHS" value={matches} color="#172026" />
            <StatBadge label="BUTS" value={goals} color="#00a676" />
            <StatBadge label="PASSES D." value={assists} color="#2563eb" />
            <StatBadge label="NOTE" value={rating} color={rating >= 80 ? '#00a676' : rating >= 70 ? '#b45309' : '#dc2626'} />
          </div>

          {/* Salary info if available */}
          {player?.weeklySalary > 0 && (
            <div style={{ ...S.objCard, marginBottom: 16 }}>
              <div style={S.secTitle}>SITUATION FINANCIÈRE</div>
              <div style={S.sumRow}>
                <span style={S.sumK}>Salaire actuel</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(player.weeklySalary)}/sem.</span>
              </div>
              <div style={{ ...S.sumRow, borderBottom: 'none' }}>
                <span style={S.sumK}>Valeur marché</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(player.value ?? 0)}</span>
              </div>
            </div>
          )}

          {/* Decision cards */}
          <div style={{ ...S.secTitle, marginBottom: 12 }}>CHOISIR L'AVENIR</div>
          {DECISIONS.map(d => (
            <DecisionCard key={d.id} decision={d} onDecide={onDecide} />
          ))}

          <button onClick={onClose} style={{ ...S.secBtn, marginBottom: 0 }}>
            DÉCIDER PLUS TARD
          </button>
        </div>
      </div>
    </div>
  );
}
