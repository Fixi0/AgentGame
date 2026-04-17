import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PERSONALITY_LABELS } from '../../data/players';
import { getCareerGoalProgress } from '../../systems/playerDevelopmentSystem';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

const tabLabels = {
  profile: 'Profil',
  conversation: 'Conversation',
  dossier: 'Dossier',
};

export default function PlayerDetailModal({ player, messages, promises, onClose, onNego, onMeeting, onMarketAction, onCallPlayer, onContactClubStaff }) {
  const [tab, setTab] = useState('profile');
  const playerPromises = (promises ?? []).filter((promise) => promise.playerId === player.id && !promise.resolved && !promise.failed);
  const playerMessages = (messages ?? []).filter((message) => message.playerId === player.id);
  const seasonStats = player.seasonStats ?? {};
  const careerProgress = getCareerGoalProgress(player);

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span>FICHE JOUEUR</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <div style={S.profileHero}>
            <div style={{ ...S.playerAvatar, width: 72, height: 72 }}>{player.firstName?.[0]}{player.lastName?.[0]}</div>
            <div>
              <h2 style={S.mTitle}>{player.firstName} {player.lastName}</h2>
              <div style={S.mPlayer}>{player.position} · {player.countryFlag} {player.countryLabel} · {PERSONALITY_LABELS[player.personality]}</div>
              <div style={S.profileSub}>{player.roleLabel ?? player.position} · rôle club {player.clubRole ?? 'non défini'}</div>
            </div>
          </div>
          <div style={S.tabRow}>
            {Object.entries(tabLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  ...S.tabBtn,
                  background: tab === key ? '#172026' : '#f7f9fb',
                  color: tab === key ? '#ffffff' : '#172026',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'profile' && (
            <>
          <div style={S.kpiGrid}>
            <DetailMetric label="Note" value={player.rating} />
            <DetailMetric label="Potentiel" value={player.potential} />
            <DetailMetric label="Valeur" value={formatMoney(player.value)} />
            <DetailMetric label="Salaire" value={`${formatMoney(player.weeklySalary)}/s`} />
            <DetailMetric label="Marque" value={`${player.brandValue ?? 0}/100`} />
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>RELATION</div>
            <Meter label="Moral" value={player.moral} />
            <Meter label="Confiance" value={player.trust ?? 50} />
            <Meter label="Forme" value={player.form} />
            <Meter label="Fatigue" value={player.fatigue ?? 20} inverted />
            <Meter label="Pression" value={player.pressure ?? 50} inverted />
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>PROFIL HUMAIN</div>
            <div style={S.sumRow}><span style={S.sumK}>Ambition cachée</span><strong>{player.hiddenAmbition ?? 50}/100</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Loyauté réelle</span><strong>{player.loyalty ?? 50}/100</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Peur du banc</span><strong>{player.benchFear ?? 50}/100</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Tolérance pression</span><strong>{player.pressureTolerance ?? 50}/100</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Entourage</span><strong>{player.entourage ?? '-'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Club rêvé</span><strong>{player.dreamClub ?? '-'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Villes préférées</span><strong>{(player.preferredCities ?? []).join(', ') || '-'}</strong></div>
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>SAISON</div>
            <div style={S.statLineGrid}>
              <div><strong>{seasonStats.appearances ?? 0}</strong><span>Matchs</span></div>
              <div><strong>{seasonStats.goals ?? 0}</strong><span>Buts</span></div>
              <div><strong>{seasonStats.assists ?? 0}</strong><span>Passes</span></div>
              <div><strong>{seasonStats.averageRating ?? '-'}</strong><span>Note moy.</span></div>
            </div>
            <div style={S.statLineGrid}>
              <div><strong>{seasonStats.saves ?? 0}</strong><span>Arrêts</span></div>
              <div><strong>{seasonStats.tackles ?? 0}</strong><span>Tacles</span></div>
              <div><strong>{seasonStats.keyPasses ?? 0}</strong><span>Passes clés</span></div>
              <div><strong>{seasonStats.xg ?? 0}</strong><span>xG</span></div>
            </div>
            <div style={S.sumRow}><span style={S.sumK}>Blessures saison</span><strong>{seasonStats.injuries ?? 0}</strong></div>
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>DOSSIER JOUEUR</div>
            <div style={S.sumRow}><span style={S.sumK}>Humeur</span><strong>{player.moral >= 65 ? 'positive' : player.moral >= 45 ? 'prudente' : 'fragile'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Entourage</span><strong>{player.entourageRelation ?? player.entourage ?? '-'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Objectif caché</span><strong>{(player.trust ?? 50) >= 65 ? player.dreamClub ?? 'à découvrir' : 'à découvrir avec la confiance'}</strong></div>
            {(player.activeActions ?? []).slice(0, 3).map((action, index) => (
              <div key={`${action.type}-${index}`} style={S.promiseRow}>
                <span>{action.label}</span>
                <strong>actif</strong>
              </div>
            ))}
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>OBJECTIF CARRIERE</div>
            <div style={S.objLabel}>{player.careerGoal?.label ?? 'Aucun objectif'}</div>
            <div style={S.progBar}><div style={{ ...S.progFill, width: `${careerProgress.percent}%` }} /></div>
            <div style={S.objReward}>{careerProgress.value}/{careerProgress.target}</div>
          </div>
          {player.scoutReport && (
            <div style={S.objCard}>
              <div style={S.secTitle}>RAPPORT SCOUT</div>
              <div style={S.sumRow}><span style={S.sumK}>Potentiel estimé</span><strong>{player.scoutReport.potentialMin}-{player.scoutReport.potentialMax}</strong></div>
              <div style={S.sumRow}><span style={S.sumK}>Confiance scout</span><strong>{player.scoutReport.confidence}%</strong></div>
              <div style={S.emptySmall}>{player.scoutReport.note}</div>
            </div>
          )}
          <div style={S.objCard}>
            <div style={S.secTitle}>CARRIERE</div>
            <div style={S.sumRow}><span style={S.sumK}>Club</span><strong>{player.club}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Ville</span><strong>{player.clubCity || '-'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Contrat</span><strong>{player.contractWeeksLeft}s</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Commission</span><strong>{Math.round(player.commission * 100)}%</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Rôle promis</span><strong>{player.clubRole ?? '-'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Clause libératoire</span><strong>{formatMoney(player.releaseClause ?? 0)}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>% revente</span><strong>{player.sellOnPercent ?? 0}%</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Bonus contrat</span><strong>{formatMoney(player.clubBonuses?.total ?? 0)}</strong></div>
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>CONTRAT AGENT-JOUEUR</div>
            <div style={S.sumRow}><span style={S.sumK}>Durée mandat</span><strong>{player.agentContract?.weeksLeft ?? 104}s</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Commission</span><strong>{Math.round((player.agentContract?.commission ?? player.commission) * 100)}%</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Clause sortie</span><strong>{formatMoney(player.agentContract?.releaseClause ?? 0)}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Bonus loyauté</span><strong>{formatMoney(player.agentContract?.loyaltyBonus ?? 0)}</strong></div>
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>TIMELINE</div>
            {(player.timeline ?? []).length ? player.timeline.slice(0, 6).map((item, index) => (
              <div key={`${item.week}-${item.label}-${index}`} style={S.promiseRow}>
                <span>{item.label}</span>
                <strong>S{item.week}</strong>
              </div>
            )) : <div style={S.emptySmall}>Aucun moment clé enregistré.</div>}
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>PROMESSES</div>
            {playerPromises.length ? playerPromises.map((promise) => (
              <div key={promise.id} style={S.promiseRow}><span>{promise.label}</span><strong>S{promise.dueWeek}</strong></div>
            )) : <div style={S.emptySmall}>Aucune promesse active.</div>}
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>DERNIERS MATCHS</div>
            {(player.matchHistory ?? []).length ? player.matchHistory.slice(0, 5).map((match) => (
              <div key={`${match.week}-${match.opponent}`} style={S.promiseRow}>
                <span>S{match.week} · {match.club} {match.score} {match.opponent}</span>
                <strong>{match.matchRating ? `${match.matchRating}/10` : 'ABS'}</strong>
                {match.matchReport && <span style={{ gridColumn: '1 / -1', color: '#64727d' }}>{match.matchReport}</span>}
              </div>
            )) : <div style={S.emptySmall}>Aucun match simulé.</div>}
          </div>
          <div style={S.rActions}>
            <button onClick={() => onNego('extend')} style={S.actBtn}>PROLONGER</button>
            <button onClick={() => onNego('transfer')} style={S.actBtn}>TRANSFERT</button>
            <button onClick={onClose} style={S.relBtn}>FERMER</button>
          </div>
          <div style={{ ...S.objCard, marginTop: 12 }}>
            <div style={S.secTitle}>REUNION JOUEUR</div>
            <div style={S.msgActions}>
              <button onClick={() => onMeeting?.(player.id, 'career')} style={S.msgBtn}>Plan carrière</button>
              <button onClick={() => onMeeting?.(player.id, 'support')} style={S.msgBtn}>Soutien</button>
              <button onClick={() => onMeeting?.(player.id, 'discipline')} style={S.msgBtn}>Recadrer</button>
              <button onClick={() => onCallPlayer?.(player)} style={S.msgBtn}>Appeler</button>
            </div>
          </div>
          <div style={{ ...S.objCard, marginTop: 12 }}>
            <div style={S.secTitle}>ACTIONS MERCATO</div>
            <div style={S.msgActions}>
              <button onClick={() => onMarketAction?.(player.id, player.club === 'Libre' ? 'free_trial' : 'propose')} style={S.msgBtn}>{player.club === 'Libre' ? 'Essai club' : 'Proposer'}</button>
              <button onClick={() => onMarketAction?.(player.id, 'transfer_list')} style={S.msgBtn}>Mettre marché</button>
              <button onClick={() => onMarketAction?.(player.id, 'loan')} style={S.msgBtn}>Chercher prêt</button>
            </div>
          </div>
            </>
          )}
          {tab === 'conversation' && (
            <div style={S.objCard}>
              <div style={S.secTitle}>CONVERSATION</div>
              {playerMessages.length ? playerMessages.slice(-8).map((message) => (
                <div key={message.id} style={S.threadBlock}>
                  <div style={S.incomingBubble}>
                    <div style={S.threadMeta}>{message.senderName ?? message.playerName} · S{message.week} · {message.subject}</div>
                    <div>{message.body}</div>
                  </div>
                  {message.resolved ? (
                    <div style={S.outgoingBubble}>{message.responseText ?? 'Réponse envoyée'}</div>
                  ) : (
                    <div style={S.msgActions}>
                      <button onClick={() => onCallPlayer?.(player)} style={S.msgBtn}>Appeler</button>
                      <button onClick={() => onMeeting?.(player.id, 'career')} style={S.msgBtn}>Plan</button>
                      <button onClick={() => onMeeting?.(player.id, 'support')} style={S.msgBtn}>Soutenir</button>
                    </div>
                  )}
                </div>
              )) : <div style={S.emptySmall}>Aucun échange encore.</div>}
            </div>
          )}
          {tab === 'dossier' && (
            <div style={S.objCard}>
              <div style={S.secTitle}>DOSSIER PRATIQUE</div>
              <div style={S.msgActions}>
                <button onClick={() => onContactClubStaff?.(player.id, 'coach')} style={S.msgBtn}>Appeler coach</button>
                <button onClick={() => onContactClubStaff?.(player.id, 'ds')} style={S.msgBtn}>Appeler DS</button>
                <button onClick={() => onCallPlayer?.(player)} style={S.msgBtn}>Appeler joueur</button>
              </div>
              <div style={S.emptySmall}>Ici, on garde les contacts utiles pour avancer sans perdre le fil.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailMetric({ label, value }) {
  return (
    <div style={S.kpiCard}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={S.kpiValue}>{value}</div>
    </div>
  );
}

function Meter({ label, value, inverted = false }) {
  const color = inverted
    ? value > 75 ? '#b42318' : value > 55 ? '#8a6f1f' : '#00a676'
    : value >= 60 ? '#00a676' : value >= 40 ? '#8a6f1f' : '#b42318';
  return (
    <div style={S.meterRow}>
      <span>{label}</span>
      <div style={S.progBar}><div style={{ ...S.progFill, width: `${value}%`, background: color }} /></div>
      <strong>{value}</strong>
    </div>
  );
}
