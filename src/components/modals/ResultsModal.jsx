import React, { useState } from 'react';
import { Activity, AlertCircle, ChevronRight, LogOut, X } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

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
                <div style={S.recapItem}><strong>{data.seasonRecap.reputation}</strong><span> réputation</span></div>
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
                <div key={`${match.playerId}-${match.opponent}`} style={{ ...S.evRow, borderLeft: `3px solid ${match.result === 'win' ? '#00a676' : match.result === 'loss' ? '#b42318' : '#2f80ed'}` }}>
                  <div style={S.evPlayer}>{match.playerName} · {match.club} {match.score} {match.opponent}</div>
                  <div style={S.evLabel}>
                    {match.minutes ? `${match.minutes}' · Note ${match.matchRating}` : 'Absent'}
                    {match.goals ? ` · ${match.goals} but${match.goals > 1 ? 's' : ''}` : ''}
                    {match.assists ? ` · ${match.assists} passe déc.` : ''}
                    {match.saves ? ` · ${match.saves} arrêt${match.saves > 1 ? 's' : ''}` : ''}
                    {match.tackles ? ` · ${match.tackles} tacles` : ''}
                    {match.keyPasses ? ` · ${match.keyPasses} passes clés` : ''}
                    {match.xg ? ` · ${match.xg} xG` : ''}
                    {match.matchReport && <div style={{ marginTop: 4 }}>{match.matchReport}</div>}
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
