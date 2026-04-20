import React, { useState } from 'react';
import { Activity, AlertCircle, ChevronDown, ChevronRight, ChevronUp, LogOut, Trophy, Users, X } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { EURO_CUP_LABELS } from '../../systems/europeanCupSystem';
import { S } from '../styles';

const safeText = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback;
  return trimmed;
};

const buildMatchSummary = (match) => {
  const rating = Number.isFinite(match?.matchRating) ? match.matchRating : null;
  const goals = match?.goals ?? 0;
  const assists = match?.assists ?? 0;
  const keyPasses = match?.keyPasses ?? 0;
  const saves = match?.saves ?? 0;
  const tackles = match?.tackles ?? 0;
  const minutes = match?.minutes ?? 0;

  if (goals >= 2) {
    return `Doublé et soirée référence · Note ${rating ?? '—'}/10 · ${keyPasses || 0} passes clés`;
  }
  if (goals >= 1 && assists >= 1) {
    return `Buteur et passeur décisif · Note ${rating ?? '—'}/10 · ${minutes} min`;
  }
  if (goals >= 1) {
    return `But important · Note ${rating ?? '—'}/10 · ${minutes} min`;
  }
  if (assists >= 2) {
    return `Chef d’orchestre dans le dernier tiers · ${assists} passes · Note ${rating ?? '—'}/10`;
  }
  if (assists >= 1) {
    return `Passe clé au bon moment · Note ${rating ?? '—'}/10 · ${minutes} min`;
  }
  if (saves >= 3) {
    return `Match propre derrière · ${saves} arrêts · Note ${rating ?? '—'}/10`;
  }
  if (tackles >= 4) {
    return `Présence défensive solide · ${tackles} tacles · Note ${rating ?? '—'}/10`;
  }
  if (rating && rating >= 8.5) {
    return `Très grosse prestation · Note ${rating}/10 · ${keyPasses || 0} passes clés`;
  }
  if (rating && rating <= 6) {
    return `Marge de progression · Note ${rating}/10 · ${minutes} min`;
  }
  return `Note ${rating ?? '—'}/10 · ${minutes} min${keyPasses ? ` · ${keyPasses} passes clés` : ''}`;
};

function getBigHeadline(data) {
  // Find the single most exciting thing that happened
  const topWorldCup = (data.worldCupMatchResults ?? []).filter(Boolean).reduce((best, m) => (
    !best || (m.matchRating ?? 0) > (best.matchRating ?? 0) ? m : best
  ), null);
  if (topWorldCup?.isChampion) {
    return { emoji: '🏆', title: `Champion du monde !`, sub: `${topWorldCup.playerName} · ${topWorldCup.countryName} · match décisif ${topWorldCup.score}` };
  }
  if (topWorldCup?.isEliminated) {
    return { emoji: '💔', title: `Fin de parcours en Coupe du Monde`, sub: `${topWorldCup.playerName} · ${topWorldCup.countryName} · ${topWorldCup.phase}` };
  }
  if (topWorldCup && ((topWorldCup.goals ?? 0) >= 2 || (topWorldCup.matchRating ?? 0) >= 8.5)) {
    return { emoji: '🌍', title: `CdM — ${topWorldCup.playerName} en lumière`, sub: `${topWorldCup.countryName} · ${topWorldCup.score} · Note ${topWorldCup.matchRating ?? '—'}` };
  }
  const topScorer = (data.matchResults ?? []).filter(Boolean).reduce((best, m) => (
    !best || (m.goals ?? 0) > (best.goals ?? 0) ? m : best
  ), null);
  if (topScorer && (topScorer.goals ?? 0) >= 3) {
    return { emoji: '🔥', title: `Triplé de ${topScorer.playerName} !`, sub: `${topScorer.goals} buts · ${topScorer.club} ${topScorer.score} · Note ${topScorer.matchRating ?? '—'}` };
  }
  if (topScorer && (topScorer.goals ?? 0) >= 2) {
    return { emoji: '⚡', title: `Doublé de ${topScorer.playerName}`, sub: `${topScorer.goals} buts · Note ${topScorer.matchRating ?? '—'}` };
  }
  const topEuroScorer = (data.euroMatchResults ?? []).filter(Boolean).reduce((best, m) => (
    !best || (m.goals ?? 0) > (best.goals ?? 0) ? m : best
  ), null);
  if (topEuroScorer && (topEuroScorer.goals ?? 0) >= 1) {
    const cup = EURO_CUP_LABELS[topEuroScorer.competition] ?? {};
    const competitionName = safeText(topEuroScorer.competitionLabel, safeText(cup.name, safeText(topEuroScorer.competition, 'Europe')));
    const opponentName = safeText(topEuroScorer.opponent, 'Adversaire');
    const scoreText = safeText(topEuroScorer.score, '');
    return { emoji: '🏆', title: `But européen — ${safeText(topEuroScorer.playerName, 'Joueur')}`, sub: `${competitionName} · ${opponentName}${scoreText ? ` ${scoreText}` : ''}` };
  }
  if (data.seasonRecap) {
    return { emoji: '🗓️', title: `Saison ${data.seasonRecap.season} terminée`, sub: `${data.seasonRecap.transfers} transferts · ${formatMoney(data.seasonRecap.earned)} gagnés` };
  }
  const goodEvent = (data.events ?? []).find((e) => e.good);
  if (goodEvent) return { emoji: '✨', title: goodEvent.label, sub: goodEvent.player };
  if ((data.net ?? 0) > 10000) return { emoji: '💰', title: 'Très bonne semaine financière', sub: `+${formatMoney(data.net)} de bénéfice net` };
  if ((data.net ?? 0) >= 0) return { emoji: '📊', title: 'Semaine bouclée', sub: `Bénéfice +${formatMoney(data.net)}` };
  return { emoji: '📉', title: 'Semaine difficile', sub: `Déficit ${formatMoney(Math.abs(data.net))}` };
}

function MatchScorecard({ match, highlight = false }) {
  const resultColor = match.result === 'win' ? '#16a34a' : match.result === 'loss' ? '#e83a3a' : '#2563eb';
  const resultBg = highlight
    ? `linear-gradient(135deg, ${match.result === 'win' ? '#f0fdf4' : match.result === 'loss' ? '#fef2f2' : '#eff6ff'} 0%, #ffffff 100%)`
    : match.result === 'win' ? '#f0fdf4' : match.result === 'loss' ? '#fef2f2' : '#eff6ff';
  const resultLabel = match.result === 'win' ? 'V' : match.result === 'loss' ? 'D' : 'N';
  const competitionLabel = safeText(match.competitionLabel, safeText(EURO_CUP_LABELS[match.competition]?.name, null));

  const stats = [];
  if (match.goals > 0) stats.push(`⚽ ${match.goals}`);
  if (match.assists > 0) stats.push(`🅰️ ${match.assists}`);
  if (match.matchRating) stats.push(`★ ${match.matchRating}`);
  if (match.saves > 0) stats.push(`🧤 ${match.saves}`);
  if (match.tackles > 0) stats.push(`⚡ ${match.tackles}`);
  if (match.keyPasses > 0) stats.push(`🎯 ${match.keyPasses}`);
  const summaryParts = [
    match.matchRating ? `Note ${match.matchRating}/10` : null,
    match.minutes ? `${match.minutes} min` : null,
    match.goals ? `${match.goals} but${match.goals > 1 ? 's' : ''}` : null,
    match.assists ? `${match.assists} passe${match.assists > 1 ? 's' : ''}` : null,
    match.keyPasses ? `${match.keyPasses} passes clés` : null,
    match.saves ? `${match.saves} arrêts` : null,
    match.tackles ? `${match.tackles} tacles` : null,
  ].filter(Boolean);
  const matchSummary = safeText(match.matchReport, buildMatchSummary(match) ?? (summaryParts.join(' · ') || null));

  return (
    <div style={{
      ...S.scoreboard,
      borderLeft: `4px solid ${highlight ? '#f5c842' : resultColor}`,
      background: resultBg,
      boxShadow: highlight ? '0 10px 24px rgba(245,200,66,.12)' : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 850, color: '#172026' }}>{safeText(match.playerName, 'Joueur')}</span>
          {match.roleShort && <span style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', background: '#f0f4f7', borderRadius: 4, padding: '1px 5px' }}>{match.roleShort}</span>}
          {competitionLabel && (
            <span style={{ fontSize: 9, color: highlight ? '#9a6700' : '#64727d', fontFamily: 'system-ui,sans-serif', background: highlight ? '#fff8db' : '#f0f4f7', borderRadius: 4, padding: '1px 5px', fontWeight: 900, letterSpacing: '.04em' }}>
              {competitionLabel}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, fontWeight: 900, color: resultColor, background: `${resultColor}22`, borderRadius: 6, padding: '2px 7px' }}>{resultLabel}</span>
      </div>
      <div style={{ ...S.scoreboardScore, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', maxWidth: 90, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeText(match.club, 'Club')}</span>
        <span style={{ fontWeight: 900, fontSize: 18, color: '#172026', minWidth: 60, textAlign: 'center' }}>{match.score}</span>
        <span style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', maxWidth: 90, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeText(match.opponent, 'Adversaire')}</span>
      </div>
      {stats.length > 0 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6, fontSize: 11, color: '#3f5663', fontFamily: 'system-ui,sans-serif', flexWrap: 'wrap' }}>
          {stats.map((s, i) => <span key={i}>{s}</span>)}
        </div>
      )}
      {matchSummary && (
        <div style={{ marginTop: 5, fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', fontStyle: match.matchReport ? 'italic' : 'normal', lineHeight: 1.4, textAlign: 'center' }}>{matchSummary}</div>
      )}
      {match.isFriendly && (
        <div style={{ marginTop: 4, fontSize: 9, color: '#b45309', fontFamily: 'system-ui,sans-serif', textAlign: 'center', background: '#fffbeb', borderRadius: 4, padding: '2px 6px', display: 'inline-block' }}>Amical</div>
      )}
      {!match.minutes && (
        <div style={{ marginTop: 4, fontSize: 10, color: '#9aa7b2', fontFamily: 'system-ui,sans-serif', textAlign: 'center' }}>
          Absent{match.absenceReason ? ` · ${match.absenceReason}` : ''}
        </div>
      )}
    </div>
  );
}

export default function ResultsModal({ data, onClose, onInteractive }) {
  const [step, setStep] = useState('results');
  const [showDetails, setShowDetails] = useState(false);
  const topWorldCupMatch = (data.worldCupMatchResults ?? []).filter(Boolean).reduce((best, match) => (
    !best || (match.matchRating ?? 0) > (best.matchRating ?? 0) ? match : best
  ), null);

  if (step === 'prompt' && data.interactiveEvent) {
    const { event, player } = data.interactiveEvent;

    return (
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={S.mHead}>
            <AlertCircle size={16} color="#00a676" />
            <span>EVENEMENT</span>
          </div>
          <div style={S.mBody}>
            <h2 style={S.mTitle}>{event.title}</h2>
            <div style={S.mPlayer}>{player.firstName} {player.lastName}</div>
            <p style={S.mText}>{event.description}</p>
            <button onClick={() => onInteractive(event, player)} style={S.primaryBtn}>
              DECIDER <ChevronRight size={16} />
            </button>
            <button onClick={onClose} style={S.secBtn}>
              PLUS TARD
            </button>
          </div>
        </div>
      </div>
    );
  }

  const bigHeadline = getBigHeadline(data);
  const totalGoals = (data.matchResults ?? []).reduce((s, m) => s + (m.goals ?? 0), 0);
  const totalAssists = (data.matchResults ?? []).reduce((s, m) => s + (m.assists ?? 0), 0);
  const wins = (data.matchResults ?? []).filter((m) => m.result === 'win').length;
  const hasWorldCup = (data.worldCupMatchResults?.length > 0) || Boolean(data.worldCupActive);
  const hasDetails = (data.events?.length > 0) || (data.matchResults?.length > 0) || (data.euroMatchResults?.length > 0) || (data.worldCupMatchResults?.length > 0) || (data.lockerRoom?.length > 0) || (data.worldSummary?.length > 0) || (data.clubOffers?.length > 0) || (data.leavingPlayers?.length > 0);
  const euroMatches = (data.euroMatchResults ?? []).filter(Boolean);

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <Activity size={16} color="#00a676" />
          <span>BILAN SEMAINE</span>
          <button onClick={onClose} style={S.mClose}>
            <X size={16} />
          </button>
        </div>
        <div style={S.mBody}>
          {/* Big Headline */}
          <div style={S.resultsBigHeadline}>
            <span style={S.resultsBigEmoji}>{bigHeadline.emoji}</span>
            <div style={S.resultsBigTitle}>{bigHeadline.title}</div>
            <div style={S.resultsBigSub}>{bigHeadline.sub}</div>
          </div>

          {/* End of Season / New Season celebration */}
          {data.newSeason && (
            <div style={{ background: 'linear-gradient(135deg,#172026,#2c4a30)', borderRadius: 10, padding: '20px 16px', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#f5c842', letterSpacing: '.04em', marginBottom: 6 }}>
                NOUVELLE SAISON !
              </div>
              {data.bonusMoney > 0 && (
                <div style={{ fontSize: 14, color: '#cfeee3', fontFamily: 'system-ui,sans-serif', marginBottom: 4 }}>
                  Bonus de saison : <strong>+{formatMoney(data.bonusMoney)}</strong>
                </div>
              )}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontFamily: 'system-ui,sans-serif' }}>
                Une nouvelle saison commence. Nouveaux objectifs, nouveaux défis.
              </div>
            </div>
          )}
          {data.phase?.mercato && (
            <div style={S.newSeason}>
              {data.phase.deadlineDay ? '⚡ DEADLINE DAY' : `🔄 MERCATO ${data.phase.window?.toUpperCase()}`} · Les offres de clubs peuvent arriver
            </div>
          )}

          {/* Season recap */}
          {data.seasonRecap && (
            <div style={S.recapCard}>
              <div style={S.secTitle}>
                <Activity size={14} />
                <span>BILAN SAISON {data.seasonRecap.season}</span>
              </div>
              <div style={S.recapGrid}>
                <div style={S.recapItem}><strong>{data.seasonRecap.transfers}</strong><span> transferts</span></div>
                <div style={S.recapItem}><strong>{formatMoney(data.seasonRecap.earned)}</strong><span> gagnés</span></div>
                <div style={S.recapItem}><strong>{data.seasonRecap.reputation}</strong><span> rép./1000</span></div>
                <div style={S.recapItem}><strong>{data.seasonRecap.objectivesCompleted}/3</strong><span> objectifs</span></div>
              </div>
            </div>
          )}

          {data.worldCupMatchResults?.length > 0 && (
            <div style={{ marginBottom: 16, padding: '10px 10px 6px', borderRadius: 10, background: 'linear-gradient(135deg, #06101d 0%, #11315a 42%, #07101c 100%)', border: '1px solid rgba(125,211,252,.42)', boxShadow: '0 18px 38px rgba(15,23,32,.30), inset 0 1px 0 rgba(255,255,255,.08)', color: '#ffffff' }}>
              <div style={S.secTitle}>
                <Trophy size={14} />
                <span style={{ color: '#7dd3fc' }}>COUPE DU MONDE</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.82)', fontFamily: 'system-ui,sans-serif', lineHeight: 1.5, marginBottom: 10 }}>
                Tous les matchs de Coupe du monde de la semaine, au format normal mais mis en avant.
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(data.worldCupMatchResults ?? []).filter(Boolean).map((match) => (
                  <MatchScorecard
                    key={`${match.playerId}-${match.countryName}-${match.opponent}-${match.phase}`}
                    match={{
                      ...match,
                      competitionLabel: match.countryName ? `CdM · ${match.countryName}` : match.competitionLabel,
                      playerName: match.playerName ?? 'Joueur',
                      club: match.countryName ?? 'Sélection',
                    }}
                    highlight
                  />
                ))}
              </div>
            </div>
          )}

          {/* Financial summary — compact */}
          <div style={{ ...S.resHero, marginBottom: 12 }}>
            <div style={S.resLabel}>BÉNÉFICE NET</div>
            <div style={{ ...S.resultsNetBig, color: data.net >= 0 ? '#00a676' : '#b42318' }}>
              {data.net >= 0 ? '+' : ''}{formatMoney(data.net)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, fontSize: 12, color: '#3f5663', fontFamily: 'system-ui,sans-serif', flexWrap: 'wrap' }}>
              <span>💰 +{formatMoney(data.income)}</span>
              <span>📋 -{formatMoney(data.salaries)}</span>
              <span style={{ color: data.repChange >= 0 ? '#00a676' : '#b42318' }}>
                ⭐ {data.repChange >= 0 ? '+' : ''}{data.repChange} rép.
              </span>
              {data.matchResults?.length > 0 && <span>⚽ {totalGoals} buts · 🅰️ {totalAssists} passes</span>}
              {wins > 0 && <span style={{ color: '#00a676' }}>✅ {wins} victoire{wins > 1 ? 's' : ''}</span>}
            </div>
          </div>

          {/* Urgent events — always visible */}
          {(data.events ?? []).filter((e) => !e.good).slice(0, 2).map((event) => (
            <div key={`${event.playerId}-${event.id}`} style={{ ...S.evRow, borderLeft: '3px solid #b42318', marginBottom: 6 }}>
              <div style={S.evPlayer}>⚠️ {event.player}</div>
              <div style={S.evLabel}>{event.label}</div>
            </div>
          ))}
          {data.leavingPlayers?.length > 0 && (
            <div style={{ ...S.leavingCard, marginBottom: 12 }}>
              <div style={S.secTitle}>
                <LogOut size={14} color="#b42318" />
                <span>DEPARTS</span>
              </div>
              {data.leavingPlayers.map((player) => (
                <div key={player.id} style={S.leavingRow}>
                  {player.firstName} {player.lastName} quitte l'agence
                </div>
              ))}
            </div>
          )}
          {data.clubOffers?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {data.phase?.deadlineDay && <div style={S.deadlineTimer}>90:00 · les téléphones chauffent</div>}
              {data.clubOffers.slice(0, 2).map((offer) => (
                <div key={offer.id} style={{ ...S.evRow, borderLeft: '3px solid #2f80ed', marginBottom: 6 }}>
                  <div style={S.evPlayer}>🔄 {offer.club} veut {offer.playerName}</div>
                  <div style={S.evLabel}>{formatMoney(offer.price)} · expire S{offer.expiresWeek}</div>
                </div>
              ))}
            </div>
          )}

          {/* Collapsible details */}
          {hasDetails && (
            <button onClick={() => setShowDetails((v) => !v)} style={S.collapseToggle}>
              <span>{showDetails ? 'Masquer les détails' : 'Voir tous les détails'}</span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          {showDetails && (
            <>
              {(data.events ?? []).filter((e) => e.good).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={S.secTitle}><AlertCircle size={14} /><span>ÉVÉNEMENTS</span></div>
                  {(data.events ?? []).filter((e) => e.good).map((event) => (
                    <div key={`${event.playerId}-${event.id}`} style={{ ...S.evRow, borderLeft: '3px solid #00a676', marginBottom: 4 }}>
                      <div style={S.evPlayer}>{event.player}</div>
                      <div style={S.evLabel}>{event.label}{event.match?.matchRating ? ` · note ${event.match.matchRating}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
              {data.matchResults?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={S.secTitle}><Activity size={14} /><span>RÉSULTATS CLUBS</span></div>
                  {data.matchResults.slice(0, 8).map((match) => (
                    <MatchScorecard key={`${match.playerId}-${match.opponent}`} match={match} />
                  ))}
                </div>
              )}
          {data.euroMatchResults?.length > 0 && (
            <div style={{ marginBottom: 16, padding: '10px 10px 6px', borderRadius: 10, background: 'linear-gradient(135deg, #fff9ef 0%, #fff4dd 28%, #eef9ea 60%, #ffffff 100%)', border: '1px solid #b9d98a', boxShadow: '0 12px 26px rgba(34, 197, 94, .12), inset 0 1px 0 rgba(255,255,255,.9)' }}>
                  <div style={S.secTitle}><Trophy size={14} /><span>EUROPE</span></div>
                  <div style={{ fontSize: 12, color: '#5f7f33', fontFamily: 'system-ui,sans-serif', lineHeight: 1.45, marginBottom: 10 }}>
                    Tous les matchs européens de la semaine, avec une mise en avant plus forte.
                  </div>
                  {euroMatches.slice(0, 8).map((match) => (
                    <MatchScorecard key={`${match.playerId}-${match.competition}-${match.opponent}-${match.phase}`} match={match} highlight />
                  ))}
                </div>
              )}
              {data.lockerRoom?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={S.secTitle}><Users size={14} /><span>VESTIAIRE</span></div>
                  {data.lockerRoom.slice(0, 3).map((group) => (
                    <div key={group.club} style={{ ...S.evRow, borderLeft: `3px solid ${group.tension >= 65 ? '#b42318' : group.chemistry >= 70 ? '#00a676' : '#2f80ed'}`, marginBottom: 4 }}>
                      <div style={S.evPlayer}>{group.club}</div>
                      <div style={S.evLabel}>{group.mood} · Chimie {group.chemistry}/100</div>
                    </div>
                  ))}
                </div>
              )}
              {data.worldSummary?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={S.secTitle}><Activity size={14} /><span>MONDE DU FOOT</span></div>
                  {data.worldSummary.map((item) => (
                    <div key={`${item.week}-${item.title}`} style={{ ...S.evRow, borderLeft: '3px solid #172026', marginBottom: 4 }}>
                      <div style={S.evPlayer}>{item.title}</div>
                      <div style={S.evLabel}>{item.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <button onClick={() => (data.interactiveEvent ? setStep('prompt') : onClose())} style={S.primaryBtn}>
            {data.interactiveEvent ? 'ÉVÉNEMENT SUIVANT' : 'CONTINUER'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
