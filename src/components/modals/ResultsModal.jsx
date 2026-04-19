import React, { useState } from 'react';
import { Activity, AlertCircle, ChevronRight, LogOut, Trophy, Users, X } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

function generateHeadlines(data) {
  const headlines = [];
  if (data.matchResults?.length > 0) {
    const topScorer = data.matchResults.reduce((best, m) => (!best || (m.goals ?? 0) > (best.goals ?? 0)) ? m : best, null);
    if (topScorer && (topScorer.goals ?? 0) >= 2) {
      headlines.push(`⚡ ${topScorer.playerName} impressionne — ${topScorer.goals} buts cette semaine`);
    }
  }
  if (data.events?.some((e) => e.label?.toLowerCase().includes('transfer') || e.label?.toLowerCase().includes('rejoint'))) {
    const transfer = data.events.find((e) => e.label?.toLowerCase().includes('transfer') || e.label?.toLowerCase().includes('rejoint'));
    if (transfer) headlines.push(`📰 Coup de marché — ${transfer.player}`);
  }
  if ((data.net ?? 0) > 5000) {
    headlines.push(`💰 Semaine dorée pour l'agence`);
  }
  return headlines.slice(0, 2);
}

function MatchScorecard({ match }) {
  const resultColor = match.result === 'win' ? '#16a34a' : match.result === 'loss' ? '#e83a3a' : '#2563eb';
  const resultBg = match.result === 'win' ? '#f0fdf4' : match.result === 'loss' ? '#fef2f2' : '#eff6ff';
  const resultLabel = match.result === 'win' ? 'V' : match.result === 'loss' ? 'D' : 'N';

  const stats = [];
  if (match.goals > 0) stats.push(`⚽ ${match.goals}`);
  if (match.assists > 0) stats.push(`🅰️ ${match.assists}`);
  if (match.matchRating) stats.push(`★ ${match.matchRating}`);
  if (match.saves > 0) stats.push(`🧤 ${match.saves}`);
  if (match.tackles > 0) stats.push(`⚡ ${match.tackles}`);
  if (match.keyPasses > 0) stats.push(`🎯 ${match.keyPasses}`);

  return (
    <div style={{ ...S.scoreboard, borderLeft: `4px solid ${resultColor}`, background: resultBg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 850, color: '#172026' }}>{match.playerName}</span>
          {match.roleShort && <span style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', background: '#f0f4f7', borderRadius: 4, padding: '1px 5px' }}>{match.roleShort}</span>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 900, color: resultColor, background: `${resultColor}22`, borderRadius: 6, padding: '2px 7px' }}>{resultLabel}</span>
      </div>
      <div style={{ ...S.scoreboardScore, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', maxWidth: 90, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.club}</span>
        <span style={{ fontWeight: 900, fontSize: 18, color: '#172026', minWidth: 60, textAlign: 'center' }}>{match.score}</span>
        <span style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif', maxWidth: 90, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.opponent}</span>
      </div>
      {stats.length > 0 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6, fontSize: 11, color: '#3f5663', fontFamily: 'system-ui,sans-serif', flexWrap: 'wrap' }}>
          {stats.map((s, i) => <span key={i}>{s}</span>)}
        </div>
      )}
      {match.matchReport && (
        <div style={{ marginTop: 5, fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', fontStyle: 'italic' }}>{match.matchReport}</div>
      )}
      {!match.minutes && (
        <div style={{ marginTop: 4, fontSize: 10, color: '#9aa7b2', fontFamily: 'system-ui,sans-serif', textAlign: 'center' }}>Absent</div>
      )}
    </div>
  );
}

export default function ResultsModal({ data, onClose, onInteractive }) {
  const [step, setStep] = useState('results');

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

  const headlines = generateHeadlines(data);

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
          {headlines.length > 0 && (
            <div style={S.newsHeadline}>
              {headlines.map((h, i) => <div key={i} style={{ marginBottom: i < headlines.length - 1 ? 4 : 0 }}>{h}</div>)}
            </div>
          )}
          {data.newSeason && <div style={S.newSeason}>NOUVELLE SAISON {data.bonusMoney > 0 && `· Bonus ${formatMoney(data.bonusMoney)}`}</div>}
          {data.phase?.mercato && (
            <div style={S.newSeason}>
              {data.phase.deadlineDay ? 'DEADLINE DAY' : `MERCATO ${data.phase.window?.toUpperCase()}`} · Les offres de clubs peuvent arriver
            </div>
          )}
          {data.seasonRecap && (
            <div style={S.recapCard}>
              <div style={S.secTitle}>
                <Activity size={14} />
                <span>BILAN SAISON {data.seasonRecap.season}</span>
              </div>
              <div style={S.recapGrid}>
                <div style={S.recapItem}><strong>{data.seasonRecap.transfers}</strong><span> transferts</span></div>
                <div style={S.recapItem}><strong>{formatMoney(data.seasonRecap.earned)}</strong><span> gagnés</span></div>
                <div style={S.recapItem}><strong>{data.seasonRecap.reputation}</strong><span> réputation /1000</span></div>
                <div style={S.recapItem}><strong>{data.seasonRecap.objectivesCompleted}/3</strong><span> objectifs</span></div>
              </div>
            </div>
          )}
          <div style={S.resHero}>
            <div style={S.resLabel}>BENEFICE NET</div>
            <div style={{ ...S.resNet, color: data.net >= 0 ? '#00a676' : '#b42318' }}>
              {data.net >= 0 ? '+' : ''}
              {formatMoney(data.net)}
            </div>
            <div style={S.resBreak}>
              <div>
                Revenus : <strong style={{ color: '#00a676' }}>+{formatMoney(data.income)}</strong>
              </div>
              <div>
                Charges joueurs : <strong style={{ color: '#b42318' }}>-{formatMoney(data.salaries - (data.staffCost ?? 0))}</strong>
              </div>
              {data.staffCost > 0 && (
                <div>
                  Staff : <strong style={{ color: '#00a676' }}>-{formatMoney(data.staffCost)}</strong>
                </div>
              )}
              <div>
                Rép : <strong style={{ color: data.repChange >= 0 ? '#00a676' : '#b42318' }}>{data.repChange >= 0 ? '+' : ''}{data.repChange}</strong>
              </div>
            </div>
          </div>
          {data.events.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={S.secTitle}>
                <AlertCircle size={14} />
                <span>EVENEMENTS</span>
              </div>
              {data.events.map((event) => (
                <div key={`${event.playerId}-${event.id}`} style={{ ...S.evRow, borderLeft: `3px solid ${event.good ? '#00a676' : '#b42318'}` }}>
                  <div style={S.evPlayer}>{event.player}</div>
                  <div style={S.evLabel}>
                    {event.label}
                    {event.match?.matchRating ? ` · ${event.match.club} ${event.match.score} ${event.match.opponent} · note ${event.match.matchRating}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.worldSummary?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={S.secTitle}>
                <Activity size={14} />
                <span>MONDE DU FOOT</span>
              </div>
              {data.worldSummary.map((item) => (
                <div key={`${item.week}-${item.title}`} style={{ ...S.evRow, borderLeft: '3px solid #172026' }}>
                  <div style={S.evPlayer}>{item.title}</div>
                  <div style={S.evLabel}>{item.text}</div>
                </div>
              ))}
            </div>
          )}
          {data.lockerRoom?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={S.secTitle}>
                <Users size={14} />
                <span>VESTIAIRE</span>
              </div>
              {data.lockerRoom.slice(0, 3).map((group) => (
                <div key={group.club} style={{ ...S.evRow, borderLeft: `3px solid ${group.tension >= 65 ? '#b42318' : group.chemistry >= 70 ? '#00a676' : '#2f80ed'}` }}>
                  <div style={S.evPlayer}>{group.club}</div>
                  <div style={S.evLabel}>
                    {group.mood} · Chimie {group.chemistry}/100 · Leader {group.leaders[0] ? `${group.leaders[0].firstName} ${group.leaders[0].lastName}` : 'aucun'}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.clubOffers?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={S.secTitle}>
                <AlertCircle size={14} />
                <span>{data.phase?.deadlineDay ? 'APPELS DEADLINE DAY' : 'OFFRES CLUBS'}</span>
              </div>
              {data.phase?.deadlineDay && <div style={S.deadlineTimer}>90:00 · les téléphones chauffent</div>}
              {data.clubOffers.map((offer) => (
                <div key={offer.id} style={{ ...S.evRow, borderLeft: '3px solid #2f80ed' }}>
                  <div style={S.evPlayer}>{offer.club} veut {offer.playerName}</div>
                  <div style={S.evLabel}>{formatMoney(offer.price)} · expire semaine {offer.expiresWeek}</div>
                </div>
              ))}
            </div>
          )}
          {data.matchResults?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={S.secTitle}>
                <Activity size={14} />
                <span>RESULTATS CLUBS</span>
              </div>
              {data.matchResults.slice(0, 8).map((match) => (
                <MatchScorecard key={`${match.playerId}-${match.opponent}`} match={match} />
              ))}
            </div>
          )}
          {data.euroMatchResults?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={S.secTitle}>
                <Trophy size={14} />
                <span>EUROPE</span>
              </div>
              {data.euroMatchResults.slice(0, 5).map((match) => (
                <div key={`${match.playerId}-${match.competition}-${match.opponent}`} style={{ ...S.evRow, borderLeft: `3px solid ${match.result === 'win' ? '#00a676' : match.result === 'loss' ? '#b42318' : '#2f80ed'}` }}>
                  <div style={S.evPlayer}>
                    {match.playerName} · {match.competitionLabel}
                  </div>
                  <div style={S.evLabel}>
                    {match.opponent} · {match.score} · note {match.matchRating}
                    {match.goals ? ` · ${match.goals} but${match.goals > 1 ? 's' : ''}` : ''}
                    {match.assists ? ` · ${match.assists} passe${match.assists > 1 ? 's' : ''}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.leavingPlayers.length > 0 && (
            <div style={S.leavingCard}>
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
          <button onClick={() => (data.interactiveEvent ? setStep('prompt') : onClose())} style={S.primaryBtn}>
            {data.interactiveEvent ? 'EVENEMENT SUIVANT' : 'CONTINUER'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
