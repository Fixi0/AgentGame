import React from 'react';
import { Heart, Shield, Star, Users } from 'lucide-react';
import { getCardStarsText, withPlayerCardMeta } from '../systems/playerCardSystem';
import { formatMoney } from '../utils/format';
import { getPlayerPortrait } from '../utils/playerPortraits';
import { getBondsForPlayer, getBondLabel } from '../systems/playerBondsSystem';
import CardPlayer from './CardPlayer';

const fullName = (player = {}) => `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || 'Joueur';

const COUNTRY_FLAGS = {
  FRA: '🇫🇷', ESP: '🇪🇸', ITA: '🇮🇹', GER: '🇩🇪', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', BRA: '🇧🇷', ARG: '🇦🇷',
  POR: '🇵🇹', NED: '🇳🇱', BEL: '🇧🇪', USA: '🇺🇸', JPN: '🇯🇵', SEN: '🇸🇳', MAR: '🇲🇦', ALG: '🇩🇿',
  NOR: '🇳🇴', NGA: '🇳🇬', CRO: '🇭🇷', COL: '🇨🇴', KOR: '🇰🇷',
};

function Stat({ label, value, accent }) {
  return (
    <div style={{ background: 'oklch(16% 0.035 258 / .78)', border: '1px solid var(--af-border)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ color: 'var(--af-dim)', fontSize: 9, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: accent || 'var(--af-text)', fontSize: 18, fontWeight: 950, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Bar({ label, value, color = 'var(--af-grass)' }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--af-muted)', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        <span>{label}</span><span>{Math.round(v)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

export default function PlayerDossier({ player, onBack, actions = [], bonds = {}, roster = [] }) {
  if (!player) return null;
  const playerCardMeta = withPlayerCardMeta(player);
  const flag = playerCardMeta.countryFlag || COUNTRY_FLAGS[playerCardMeta.countryCode] || '🏳️';
  const playerBonds = getBondsForPlayer(bonds, player.id, roster).slice(0, 4);
  const currentRating = Number(player.rating) || 0;
  const potentialRating = Math.max(currentRating, Number(player.potential) || currentRating);
  const signedRating = Number(player.agencySignedRating);
  const hasSignedReference = Number.isFinite(signedRating) && signedRating > 0;
  const ratingDelta = hasSignedReference ? currentRating - signedRating : 0;
  const progressToPotential = potentialRating > 0 ? Math.round((currentRating / potentialRating) * 100) : 0;
  const progressionLabel = hasSignedReference
    ? ratingDelta > 0
      ? `+${ratingDelta}`
      : `${ratingDelta}`
    : 'N/A';

  return (
    <section className="af-panel" style={{ padding: 0, display: 'grid', gap: 0, overflow: 'hidden' }}>
      <div style={{ position: 'relative', minHeight: 280, background: 'linear-gradient(180deg, oklch(12% 0.035 258 / .9) 0%, oklch(8% 0.025 258 / .98) 100%)' }}>
        <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={onBack} className="af-chip" style={{ padding: '8px 12px', background: 'oklch(10% 0.025 258 / .85)' }}>← Retour</button>
          <div style={{ position: 'static', fontSize: 20, padding: '6px 12px', borderRadius: 10, background: 'oklch(10% 0.025 258 / .85)', color: 'var(--af-gold)', fontWeight: 900, letterSpacing: '.05em' }}>
            {getCardStarsText(player.rating)}
          </div>
        </div>
        <div style={{ padding: '58px 18px 14px', display: 'grid', gridTemplateColumns: 'minmax(0, 180px) 1fr', gap: 14, alignItems: 'end' }}>
          <CardPlayer player={playerCardMeta} onOpen={() => {}} />
          <div>
          <div style={{ color: 'var(--af-cyan)', fontSize: 10, fontWeight: 950, letterSpacing: '.2em', textTransform: 'uppercase' }}>{player.position || 'Joueur'} · {flag} {player.countryLabel || player.countryCode || '—'}</div>
          <h1 className="af-title" style={{ marginTop: 6, fontSize: 32, lineHeight: 1 }}>{fullName(player)}</h1>
          <div style={{ color: 'var(--af-muted)', marginTop: 6, fontSize: 13, fontWeight: 700 }}>{player.club || 'Libre'} {player.clubRole ? `· ${player.clubRole}` : ''}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16, display: 'grid', gap: 14 }}>
        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <Stat label="Valeur" value={formatMoney(player.value ?? 0)} accent="var(--af-gold)" />
          <Stat label="Salaire / sem" value={formatMoney(player.weeklySalary ?? 0)} />
          <Stat label="Contrat" value={`${player.contractWeeksLeft ?? 0} sem.`} />
          <Stat label="Niveau" value={getCardStarsText(player.rating)} accent="var(--af-cyan)" />
        </div>

        <div className="af-panel" style={{ padding: 14 }}>
          <div className="af-kicker" style={{ marginBottom: 10 }}>Progression</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
            <Stat label="Niveau actuel" value={getCardStarsText(currentRating)} accent="var(--af-cyan)" />
            <Stat label="Potentiel max" value={getCardStarsText(potentialRating)} accent="var(--af-gold)" />
            <Stat label="Depuis signature" value={progressionLabel} accent={ratingDelta >= 0 ? 'var(--af-grass)' : '#ef4444'} />
            <Stat label="Cap atteint" value={`${Math.max(0, Math.min(100, progressToPotential))}%`} />
          </div>
          <Bar label="Progression vers potentiel" value={progressToPotential} color="var(--af-cyan)" />
        </div>

        {/* Bars */}
        <div className="af-panel" style={{ padding: 14 }}>
          <div className="af-kicker" style={{ marginBottom: 10 }}>État actuel</div>
          <Bar label="Forme" value={player.form} color="var(--af-grass)" />
          <Bar label="Confiance agent" value={player.trust} color="var(--af-cyan)" />
          <Bar label="Moral" value={player.moral} color="var(--af-gold)" />
          <Bar label="Loyauté" value={player.loyalty} color="oklch(70% 0.18 295)" />
        </div>

        {/* Meta */}
        <div className="af-panel" style={{ padding: 14, display: 'grid', gap: 8 }}>
          <div className="af-kicker">Profil</div>
          {player.injured > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--af-danger)', fontSize: 12, fontWeight: 800 }}>
              <span><Heart size={12} style={{ verticalAlign: 'middle' }} /> Blessé</span><span>{player.injured} sem.</span>
            </div>
          )}
{player.careerGoal && (
            <div style={{ color: 'var(--af-muted)', fontSize: 12 }}><Star size={12} style={{ verticalAlign: 'middle', color: 'var(--af-gold)' }} /> Objectif : <span style={{ color: 'var(--af-text)', fontWeight: 800 }}>{typeof player.careerGoal === 'string' ? player.careerGoal : player.careerGoal.label}</span></div>
          )}
          {player.dreamClub && (
            <div style={{ color: 'var(--af-muted)', fontSize: 12 }}><Shield size={12} style={{ verticalAlign: 'middle', color: 'var(--af-cyan)' }} /> Club rêvé : <span style={{ color: 'var(--af-text)', fontWeight: 800 }}>{player.dreamClub}</span></div>
          )}
          {player.scoutReport && (
            <div style={{ color: 'var(--af-muted)', fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{player.scoutReport}</div>
          )}
          {!player.careerGoal && !player.dreamClub && !player.scoutReport && (
            <div style={{ color: 'var(--af-dim)', fontSize: 11 }}>Pas encore de notes scout sur ce joueur.</div>
          )}
        </div>

        {/* Affinités */}
        {playerBonds.length > 0 && (
          <div className="af-panel" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <div className="af-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={12} color="var(--af-cyan)" /> Affinités vestiaire
            </div>
            {playerBonds.map((bond) => {
              const label = getBondLabel(bond.value);
              const partnerPortrait = getPlayerPortrait(bond.partner);
              return (
                <div key={bond.key} style={{ display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 999, overflow: 'hidden', border: `2px solid ${label.tone}`, backgroundImage: `url(${partnerPortrait})`, backgroundSize: 'cover', backgroundPosition: 'center top' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--af-text)', fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bond.partner.firstName} {bond.partner.lastName}
                    </div>
                    <div style={{ color: label.tone, fontSize: 10, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>{label.label}</div>
                    {bond.story && <div style={{ color: 'var(--af-muted)', fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{bond.story}</div>}
                  </div>
                  <div style={{ color: label.tone, fontSize: 16, fontWeight: 950 }}>{bond.value > 0 ? '+' : ''}{Math.round(bond.value)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
