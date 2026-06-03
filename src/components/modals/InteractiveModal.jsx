import { AlertCircle, CheckCircle, X } from 'lucide-react';
import React, { useState } from 'react';
import { formatMoney } from '../../utils/format';
import { getEventImage } from '../../utils/eventImages';
import { getChoiceImage } from '../../utils/choiceImages';
import { t } from '../../utils/i18n';
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

  if (net >= 12) return { label: 'EXCELLENT', color: '#00a676', bg: 'oklch(28% 0.10 155 / .35)', border: '#b6f0da', emoji: '🌟' };
  if (net >= 3)  return { label: 'POSITIF',   color: '#00a676', bg: 'oklch(28% 0.10 155 / .35)', border: '#b6f0da', emoji: '✓' };
  if (net >= -2) return { label: 'MITIGÉ',    color: 'oklch(78% 0.16 70)', bg: 'oklch(30% 0.10 80 / .35)', border: '#fcd34d', emoji: '~' };
  return           { label: 'DIFFICILE',  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', emoji: '!' };
};

// Réactions différenciées par personnalité — chaque archétype a sa voix
const PERSONALITY_LINES = {
  loyal: {
    pos: [`"Je n'oublierai jamais ça. Tu fais partie de ma famille maintenant."`, `"Avec toi à mes côtés, je peux tout affronter."`],
    neg: [`"Ça me fait mal venant de toi... mais je reste loyal."`, `"On est ensemble, même quand c'est dur."`],
    neutral: [`"Je te fais confiance, comme toujours."`],
  },
  mercenaire: {
    pos: [`"Voilà ce que j'attendais. Le business avant tout."`, `"Bon deal. Continue comme ça et je reste."`],
    neg: [`"Si c'est tout ce que tu peux faire, je vais regarder ailleurs."`, `"Le marché est grand. Réfléchis bien."`],
    neutral: [`"On verra ce que ça donne au prochain virement."`],
  },
  leader: {
    pos: [`"C'est un signal fort pour le vestiaire. Bien joué."`, `"Je vais porter ça devant le groupe. Compte sur moi."`],
    neg: [`"Le groupe va le sentir. J'espère que tu assumes."`, `"Je vais devoir gérer les retombées en interne."`],
    neutral: [`"OK. Je transmets au reste de l'équipe."`],
  },
  fetard: {
    pos: [`"Trop bien ! Ce soir on fête ça !"`, `"T'es le meilleur agent de la planète, sérieux."`],
    neg: [`"Bof... t'aurais pu faire mieux quand même."`, `"Mouais. J'espère que ça va se rattraper."`],
    neutral: [`"Ouais ouais, t'inquiète."`],
  },
  professionnel: {
    pos: [`"Décision rationnelle. Je l'apprécie. Continuons sur cette base."`, `"Bien analysé. Je vois la stratégie derrière."`],
    neg: [`"Je note. La prochaine fois, j'attends mieux structuré."`, `"Ce n'est pas optimal. Mais je ferai mon travail."`],
    neutral: [`"Compris. On suit le plan."`],
  },
  ambitieux: {
    pos: [`"C'est un pas vers le sommet. J'en veux encore plus."`, `"Maintenant, vise plus haut. Je suis prêt."`],
    neg: [`"Ça me freine. Je veux du concret, vite."`, `"Si on ne grimpe pas, je trouverai quelqu'un qui m'y emmène."`],
    neutral: [`"OK, mais quelle est l'étape suivante ?"`],
  },
  instable: {
    pos: [`"Wow... merci, vraiment. J'en avais besoin."`, `"Je me sens enfin écouté. Ça change tout."`],
    neg: [`"Pourquoi tu fais ça ?! Je comprends pas..."`, `"J'ai besoin de réfléchir. Laisse-moi."`],
    neutral: [`"Je sais pas trop quoi dire... on verra."`],
  },
};

const pickLine = (lines) => lines[Math.floor(Math.random() * lines.length)];

const getPlayerReaction = (effects, cost, player) => {
  const e = effects ?? {};
  const personality = player?.personality ?? 'professionnel';
  const lines = PERSONALITY_LINES[personality] ?? PERSONALITY_LINES.professionnel;
  const net = (e.moral ?? 0) + (e.trust ?? 0) + (e.rep ?? 0);

  // Cas explicites (signal fort) — gardent priorité
  if (cost >= 10000 && net >= 0) return personality === 'mercenaire'
    ? `"L'effort financier, ça je le respecte. On continue."`
    : `"Je sais ce que ça t'a coûté. Je ne l'oublierai pas."`;
  if ((e.money ?? 0) >= 20000) return personality === 'fetard'
    ? `"Cash !! On arrose ça !"`
    : `"Ce deal me convient parfaitement."`;

  if (net >= 8) return pickLine(lines.pos);
  if (net <= -4) return pickLine(lines.neg);
  return pickLine(lines.neutral);
};

function EffectLine({ emoji, label, value, positive }) {
  if (value === 0 || value == null) return null;
  const color = positive ? '#00a676' : '#dc2626';
  const prefix = positive ? '+' : '';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0f4f7' }}>
      <span style={{ fontSize: 12, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>{emoji} {label}</span>
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

          {/* Visuel du choix retenu */}
          <div style={{
            margin: '-4px -4px 12px', borderRadius: 10, overflow: 'hidden',
            aspectRatio: '16 / 9', background: '#0a0f14', position: 'relative',
          }}>
            <img src={getChoiceImage(choice)} alt="" loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.78))' }} />
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
              <div style={{ fontSize: 9, letterSpacing: '.22em', color: verdict.color, fontWeight: 900, marginBottom: 4 }}>
                {verdict.emoji} {t(verdict.label)}
              </div>
              <div style={{ fontSize: 15, color: '#fff', fontWeight: 900, lineHeight: 1.15 }}>{choice.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.78)', marginTop: 2 }}>{t(choice.desc)}</div>
            </div>
          </div>

          {/* Effets numériques */}
          {hasAnyEffect && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '.18em', color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', fontWeight: 850, marginBottom: 8 }}>
                {t('EFFETS SUR')} {player.firstName.toUpperCase()} {player.lastName.toUpperCase()}
              </div>
              <div style={{ background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 8, padding: '2px 12px' }}>
                <EffectLine emoji="💪" label="Moral"         value={effects.moral}  positive={(effects.moral ?? 0) > 0} />
                <EffectLine emoji="🤝" label="Confiance"     value={effects.trust}  positive={(effects.trust ?? 0) > 0} />
                <EffectLine emoji="⭐" label="Réputation"    value={effects.rep}    positive={(effects.rep ?? 0) > 0} />
                <EffectLine emoji="🌡️" label="Pression"      value={effects.pressure} positive={(effects.pressure ?? 0) < 0} />
                {valPct !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0f4f7' }}>
                    <span style={{ fontSize: 12, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>📈 Valeur marché</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: valPct > 0 ? '#00a676' : '#dc2626', fontFamily: 'system-ui,sans-serif' }}>
                      {valPct > 0 ? '+' : ''}{valPct}%
                    </span>
                  </div>
                )}
                {(effects.money ?? 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0f4f7' }}>
                    <span style={{ fontSize: 12, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>💰 Gain</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#00a676', fontFamily: 'system-ui,sans-serif' }}>+{formatMoney(effects.money)}</span>
                  </div>
                )}
                {(choice.cost ?? 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' }}>
                    <span style={{ fontSize: 12, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif' }}>💸 Coût engagé</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', fontFamily: 'system-ui,sans-serif' }}>−{formatMoney(choice.cost)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Réaction du joueur */}
          <div style={{ background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: '.14em', color: '#00a676', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>
              {player.firstName} {player.lastName} · {player.club}
            </div>
            <div style={{ fontSize: 13, color: 'var(--af-text)', fontStyle: 'italic', lineHeight: 1.55 }}>{t(reaction)}</div>
          </div>

          {/* Badge rareté */}
          {rarityLabel && (
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 9, letterSpacing: '.22em', color: rarityColor, fontFamily: 'system-ui,sans-serif', fontWeight: 900, background: `${rarityColor}18`, padding: '4px 10px', borderRadius: 20, border: `1px solid ${rarityColor}30` }}>
                {t('ÉVÉNEMENT')} {t(rarityLabel)}
              </span>
            </div>
          )}

          <button
            onClick={onConfirm}
            style={{ ...S.primaryBtn, marginBottom: 0, background: `linear-gradient(135deg,${verdict.color === '#00a676' ? '#00a676,#20c997' : verdict.color === '#b45309' ? '#b45309,#d97706' : '#dc2626,#ef4444'})` }}
          >
            {t('CONFIRMER ET CONTINUER →')}
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
            <span>{t('DÉCISION')}</span>
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
          <div style={{
            margin: '-4px -4px 12px',
            borderRadius: 10,
            overflow: 'hidden',
            aspectRatio: '16 / 9',
            background: '#0a0f14',
            position: 'relative',
          }}>
            <img
              src={getEventImage({ eventId: event.id, type: event.type ?? event.types?.[0] })}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55))',
            }} />
          </div>
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
              const accentBg   = netDir >= 3 ? 'oklch(28% 0.10 155 / .35)' : netDir <= -3 ? '#fef2f2' : 'oklch(30% 0.10 80 / .35)';

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
                    background: canChoose ? 'var(--af-surface)' : 'var(--af-surface-soft)',
                    gap: 12,
                  }}
                >
                  <div style={{
                    width: 56, height: 56, flexShrink: 0, borderRadius: 8,
                    overflow: 'hidden', position: 'relative',
                    boxShadow: `inset 0 0 0 1px ${accentColor}55`,
                  }}>
                    <img src={getChoiceImage(choice)} alt="" loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${accentColor}22, transparent 60%)` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.chLabel}>{choice.label}</div>
                    <div style={S.chDesc}>{t(choice.desc)}</div>
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
          <button onClick={onClose} style={{ ...S.secBtn, marginTop: 4 }}>{t('IGNORER POUR CETTE SEMAINE')}</button>
        </div>
      </div>
    </div>
  );
}
