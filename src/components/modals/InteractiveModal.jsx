import { AlertCircle, CheckCircle, X } from 'lucide-react';
import React, { useState } from 'react';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

const RARITY_COLORS = {
  uncommon: '#2563eb',
  rare: '#7c3aed',
  epic: '#d97706',
  legendary: '#dc2626',
};

const RARITY_LABELS = {
  uncommon: 'PEU COMMUN',
  rare: 'RARE',
  epic: 'ÉPIQUE',
  legendary: 'LÉGENDAIRE',
};

const getVerdict = (effects, cost) => {
  const net =
    (effects.moral ?? 0) * 0.8 +
    (effects.trust ?? 0) * 1.0 +
    (effects.rep ?? 0) * 2.5 +
    ((effects.money ?? 0) - (cost ?? 0)) / 12000;

  if (net >= 12) return { label: 'EXCELLENT', color: '#00a676', bg: '#f0fdf8', border: '#b6f0da', emoji: '🌟' };
  if (net >= 3)  return { label: 'POSITIF',   color: '#00a676', bg: '#f0fdf8', border: '#b6f0da', emoji: '✓' };
  if (net >= -2) return { label: 'MITIGÉ',    color: '#b45309', bg: '#fffbeb', border: '#fcd34d', emoji: '~' };
  return           { label: 'DIFFICILE',  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', emoji: '!' };
};

const getPlayerReaction = (effects, cost, player) => {
  const e = effects ?? {};
  if (e.trust >= 12)   return `"Je sens que tu es vraiment dans mon camp. Merci d'avoir fait ce choix."`;
  if (e.moral >= 15)   return `"Tu m'as redonné confiance. Je vais tout donner sur le terrain."`;
  if (e.rep >= 6)      return `"La presse en parle bien maintenant — ça m'aide aussi. Bonne décision."`;
  if (cost >= 10000)   return `"Je sais ce que ça t'a coûté. Je ne l'oublierai pas."`;
  if ((e.money ?? 0) >= 20000) return `"Ce deal, c'est exactement ce que j'espérais. Bien joué."`;
  if (e.trust < -6 && (e.moral ?? 0) >= 0) return `"C'était dur à entendre... mais je comprends. On avance."`;
  if ((e.moral ?? 0) < -8) return `"Franchement, je m'attendais à autre chose de ta part."`;
  if ((e.trust ?? 0) < -8) return `"Je prends note. Mais il faudra regagner ma confiance."`;
  const net = (e.moral ?? 0) + (e.trust ?? 0) + (e.rep ?? 0);
  if (net >= 6) return `"Bonne décision. Je me sens bien avec ça. Continuons."`;
  if (net <= -4) return `"C'est pas ce que j'espérais. Mais je ferai avec."`;
  return `"OK. Je prends note. On verra comment ça évolue."`;
};

function EffectLine({ emoji, label, value, positive }) {
  if (value === 0 || value == null) return null;
  const color = positive ? '#00a676' : '#dc2626';
  const prefix = positive ? '+' : '';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0f4f7' }}>
      <span style={{ fontSize: 12, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>{emoji} {label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'system-ui,sans-serif' }}>{prefix}{value}</span>
    </div>
  );
}

function OutcomeScreen({ event, player, choice, onConfirm, onClose }) {
  const effects = choice.effects ?? {};
  const verdict = getVerdict(effects, choice.cost);
  const reaction = getPlayerReaction(effects, choice.cost, player);
  const rarityColor = RARITY_COLORS[event.rarity];
  const rarityLabel = RARITY_LABELS[event.rarity];
  const valPct = effects.val ? Math.round((effects.val - 1) * 100) : 0;

  const hasAnyEffect = effects.moral || effects.trust || effects.rep || valPct !== 0 || effects.money || choice.cost;

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ ...S.mHead, borderTop: `3px solid ${verdict.color}` }}>
          <CheckCircle size={16} color={verdict.color} />
          <span style={{ color: verdict.color }}>RÉSULTAT DE TA DÉCISION</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>

          {/* Verdict banner */}
          <div style={{ background: verdict.bg, border: `1px solid ${verdict.border}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>{verdict.emoji}</span>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.22em', color: verdict.color, fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 3 }}>
                {verdict.label}
              </div>
              <div style={{ fontSize: 14, color: '#172026', fontWeight: 800, lineHeight: 1.2 }}>{choice.label}</div>
              <div style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginTop: 2 }}>{choice.desc}</div>
            </div>
          </div>

          {/* Effets numériques */}
          {hasAnyEffect && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 850, marginBottom: 8 }}>
                EFFETS SUR {player.firstName.toUpperCase()} {player.lastName.toUpperCase()}
              </div>
              <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: '2px 12px' }}>
                <EffectLine emoji="💪" label="Moral"         value={effects.moral}  positive={(effects.moral ?? 0) > 0} />
                <EffectLine emoji="🤝" label="Confiance"     value={effects.trust}  positive={(effects.trust ?? 0) > 0} />
                <EffectLine emoji="⭐" label="Réputation"    value={effects.rep}    positive={(effects.rep ?? 0) > 0} />
                {valPct !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0f4f7' }}>
                    <span style={{ fontSize: 12, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>📈 Valeur marché</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: valPct > 0 ? '#00a676' : '#dc2626', fontFamily: 'system-ui,sans-serif' }}>
                      {valPct > 0 ? '+' : ''}{valPct}%
                    </span>
                  </div>
                )}
                {(effects.money ?? 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0f4f7' }}>
                    <span style={{ fontSize: 12, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>💰 Gain</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#00a676', fontFamily: 'system-ui,sans-serif' }}>+{formatMoney(effects.money)}</span>
                  </div>
                )}
                {(choice.cost ?? 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' }}>
                    <span style={{ fontSize: 12, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>💸 Coût engagé</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', fontFamily: 'system-ui,sans-serif' }}>−{formatMoney(choice.cost)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Réaction du joueur */}
          <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: '.14em', color: '#00a676', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>
              {player.firstName} {player.lastName} · {player.club}
            </div>
            <div style={{ fontSize: 13, color: '#172026', fontStyle: 'italic', lineHeight: 1.55 }}>{reaction}</div>
          </div>

          {/* Badge rareté */}
          {rarityLabel && (
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 9, letterSpacing: '.22em', color: rarityColor, fontFamily: 'system-ui,sans-serif', fontWeight: 900, background: `${rarityColor}18`, padding: '4px 10px', borderRadius: 20, border: `1px solid ${rarityColor}30` }}>
                ÉVÉNEMENT {rarityLabel}
              </span>
            </div>
          )}

          <button
            onClick={onConfirm}
            style={{ ...S.primaryBtn, marginBottom: 0, background: `linear-gradient(135deg,${verdict.color === '#00a676' ? '#00a676,#20c997' : verdict.color === '#b45309' ? '#b45309,#d97706' : '#dc2626,#ef4444'})` }}
          >
            CONFIRMER ET CONTINUER →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InteractiveModal({ event, player, money, onChoose, onClose }) {
  const [selected, setSelected] = useState(null);

  const rarityColor = RARITY_COLORS[event.rarity];
  const rarityLabel = RARITY_LABELS[event.rarity];

  const handleSelect = (choice) => {
    const canChoose = !choice.cost || money >= choice.cost;
    if (canChoose) setSelected(choice);
  };

  if (selected) {
    return (
      <OutcomeScreen
        event={event}
        player={player}
        choice={selected}
        onConfirm={() => onChoose(event, player, selected)}
        onClose={onClose}
      />
    );
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <AlertCircle size={16} color="#00a676" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
            <span>DÉCISION</span>
            {rarityLabel && (
              <span style={{
                fontSize: 8, letterSpacing: '.15em', color: rarityColor,
                fontFamily: 'system-ui,sans-serif', fontWeight: 900,
                background: `${rarityColor}18`, padding: '2px 7px',
                borderRadius: 20, border: `1px solid ${rarityColor}30`,
              }}>
                {rarityLabel}
              </span>
            )}
          </div>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <h2 style={S.mTitle}>{event.title}</h2>
          <div style={S.mPlayer}>{player.firstName} {player.lastName} · {player.club}</div>
          <p style={S.mText}>{event.description}</p>
          <div style={S.swipeHint}>
            Clique sur un choix pour voir le résultat détaillé avant de confirmer.
          </div>
          <div style={S.choiceList}>
            {event.choices.map((choice) => {
              const canChoose = !choice.cost || money >= choice.cost;
              const e = choice.effects ?? {};
              const netDir = (e.moral ?? 0) + (e.trust ?? 0) + (e.rep ?? 0);
              const accentColor = netDir >= 3 ? '#00a676' : netDir <= -3 ? '#dc2626' : '#b45309';
              const accentBg   = netDir >= 3 ? '#f0fdf8' : netDir <= -3 ? '#fef2f2' : '#fffbeb';

              return (
                <button
                  key={choice.label}
                  onClick={() => handleSelect(choice)}
                  disabled={!canChoose}
                  style={{
                    ...S.choiceBtn,
                    opacity: canChoose ? 1 : 0.4,
                    cursor: canChoose ? 'pointer' : 'not-allowed',
                    borderLeft: `4px solid ${accentColor}`,
                    background: canChoose ? '#ffffff' : '#f7f9fb',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={S.chLabel}>{choice.label}</div>
                    <div style={S.chDesc}>{choice.desc}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    {choice.cost > 0 && <div style={S.chCost}>−{formatMoney(choice.cost)}</div>}
                    {/* Mini indicateur de direction */}
                    <div style={{ fontSize: 9, fontWeight: 900, color: accentColor, background: accentBg, padding: '2px 5px', borderRadius: 4, fontFamily: 'system-ui,sans-serif', letterSpacing: '.08em' }}>
                      {netDir >= 3 ? '▲ BON' : netDir <= -3 ? '▼ RISQUÉ' : '● NEUTRE'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={onClose} style={{ ...S.secBtn, marginTop: 4 }}>IGNORER POUR CETTE SEMAINE</button>
        </div>
      </div>
    </div>
  );
}
