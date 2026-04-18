import { Activity, Briefcase, CheckCircle, ChevronRight, Circle, Clock, Target, UserPlus, Zap } from 'lucide-react';
import React from 'react';
import { getAgencyCapacity } from '../systems/agencySystem';
import { getMarketReachLabel } from '../systems/reputationSystem';
import { getStrategicSuggestions } from '../systems/suggestionSystem';
import { getAgencyGoalProgress } from '../systems/agencyGoalsSystem';
import { MEDIA_RELATION_TEMPLATES } from '../systems/agencyReputationSystem';
import { COUNTRIES } from '../data/clubs';
import { formatMoney } from '../utils/format';
import { S } from './styles';

function ObjectivesWidget({ objectives, onNav }) {
  if (!objectives?.length) return null;
  const active = objectives.filter((o) => !o.completed && !o.failed);
  const done = objectives.filter((o) => o.completed).length;

  return (
    <div style={S.objWidget}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={S.objWidgetTitle}>🎯 OBJECTIFS DE SAISON</div>
        <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>{done}/{objectives.length} complétés</span>
      </div>
      {active.map((obj) => {
        const pct = Math.min(100, Math.round((obj.current / obj.target) * 100));
        const color = pct >= 80 ? '#00a676' : pct >= 40 ? '#b45309' : '#64727d';
        return (
          <div key={obj.id} style={{ ...S.objItem, borderBottom: '1px solid #f0f4f7', paddingBottom: 8, marginBottom: 6 }}>
            <Circle size={10} color={color} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...S.objItemLabel, marginBottom: 3 }}>{obj.label}</div>
              <div style={{ ...S.progBar, height: 3, margin: 0 }}>
                <div style={{ ...S.progFill, width: `${pct}%`, background: color, height: 3 }} />
              </div>
            </div>
            <span style={{ ...S.objItemPct, color }}>{obj.current}/{obj.target}</span>
          </div>
        );
      })}
      {done > 0 && objectives.filter((o) => o.completed).map((obj) => (
        <div key={obj.id} style={{ ...S.objItem, opacity: 0.5, borderBottom: 'none', paddingBottom: 0 }}>
          <CheckCircle size={10} color="#00a676" />
          <div style={{ ...S.objItemLabel, textDecoration: 'line-through', color: '#64727d', fontSize: 11 }}>{obj.label}</div>
          <span style={{ fontSize: 10, color: '#00a676', fontFamily: 'system-ui,sans-serif' }}>✓</span>
        </div>
      ))}
    </div>
  );
}

const SummaryRow = ({ label, value, color }) => (
  <div style={S.sumRow}>
    <span style={S.sumK}>{label}</span>
    <span style={{ ...S.sumV, color: color || '#172026' }}>{value}</span>
  </div>
);

export default function Dashboard({ state, phase, onPlay, onNav, onAcceptOffer, onRejectOffer, onClubDetails, onOpenContracts }) {
  const portfolioValue = state.roster.reduce((sum, player) => sum + player.value, 0);
  const weeklyIncome = state.roster.reduce((sum, player) => sum + Math.floor(player.weeklySalary * player.commission), 0);
  const injuredCount = state.roster.filter((player) => player.injured > 0).length;
  const averageMoral = state.roster.length ? Math.round(state.roster.reduce((sum, player) => sum + player.moral, 0) / state.roster.length) : 0;
  const averageTrust = state.roster.length ? Math.round(state.roster.reduce((sum, player) => sum + (player.trust ?? 50), 0) / state.roster.length) : 0;
  const activePromises = (state.promises ?? []).filter((promise) => !promise.resolved && !promise.failed);
  const suggestions = getStrategicSuggestions(state);
  const segments = state.segmentReputation ?? {};
  const urgentMessages = state.messages.filter((message) => !message.resolved).slice(0, 3);
  const expiringContracts = state.roster.filter((player) => player.contractWeeksLeft <= 12).slice(0, 3);
  const lowTrustPlayers = state.roster.filter((player) => (player.trust ?? 50) < 45 || player.moral < 45).slice(0, 3);
  const openOffers = (state.clubOffers ?? []).filter((offer) => offer.status === 'open' && offer.expiresWeek >= state.week).slice(0, 3);
  const competitorThreats = (state.competitorThreats ?? []).slice(0, 2);
  const spotlightNews = (state.news ?? []).slice(0, 3);
  const todayTimeline = [
    {
      label: 'Date',
      value: phase.phase,
      sub: `${phase.month ?? ''} · S${phase.seasonWeek}/38`,
    },
    urgentMessages.length
      ? { label: 'Urgence', value: `${urgentMessages.length}`, sub: 'Messages à traiter' }
      : { label: 'Urgence', value: '0', sub: "Rien d'urgent" },
    openOffers.length
      ? { label: 'Offres', value: `${openOffers.length}`, sub: 'Dossiers à suivre' }
      : { label: 'Offres', value: '0', sub: 'Aucune offre' },
  ];
  const todayActions = [
    urgentMessages.length ? { label: 'Répondre', sub: `${urgentMessages.length} message`, action: () => onNav('messages') } : null,
    openOffers.length ? { label: 'Gérer offres', sub: `${openOffers.length} dossier mercato`, action: () => onNav('dashboard') } : null,
    { label: 'Jouer semaine', sub: phase.phase, action: onPlay },
  ].filter(Boolean).slice(0, 3);

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>TABLEAU DE BORD</div>
        <h1 style={S.eh}>Aujourd'hui</h1>
      </div>
      <div style={S.quickActs}>
        {todayActions.map((action) => (
          <button key={action.label} onClick={action.action} style={S.quickCard}>
            <Zap size={20} color="#00a676" />
            <div style={S.qLabel}>{action.label}</div>
            <div style={S.qSub}>{action.sub}</div>
          </button>
        ))}
      </div>
      <ObjectivesWidget objectives={state.seasonObjectives} onNav={onNav} />
      <div style={S.todayCard}>
        <div style={S.todayTitle}>AUJOURD'HUI</div>
        {todayTimeline.map((item, index) => (
          <div key={item.label} style={index === todayTimeline.length - 1 ? S.todayRowLast : S.todayRow}>
            <span>{item.label}</span>
            <div style={{ textAlign: 'right' }}>
              <strong>{item.value}</strong>
              <div style={S.qSub}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={S.kpiGrid}>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Portefeuille</div>
          <div style={S.kpiValue}>{formatMoney(portfolioValue)}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Cashflow semaine</div>
          <div style={{ ...S.kpiValue, color: weeklyIncome >= 0 ? '#00a676' : '#b42318' }}>{formatMoney(weeklyIncome)}</div>
        </div>
      </div>
      <div style={S.segmentGrid}>
        {Object.entries({ sportif: 'Sportif', business: 'Business', media: 'Média', ethique: 'Éthique' }).map(([key, label]) => (
          <div key={key} style={S.segmentCard}>
            <div style={S.segmentHead}>
              <span>{label}</span>
              <strong>{segments[key] ?? state.reputation}</strong>
            </div>
            <div style={S.progBar}>
              <div style={{ ...S.progFill, width: `${segments[key] ?? state.reputation}%`, background: key === 'media' ? '#2f80ed' : key === 'business' ? '#172026' : key === 'ethique' ? '#00a676' : '#3f5663' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={S.sumCard}>
        <SummaryRow label="Blessés" value={injuredCount} />
        <SummaryRow label="Moral moyen" value={`${averageMoral}/100`} color={averageMoral >= 60 ? '#00a676' : averageMoral >= 40 ? '#8a6f1f' : '#b42318'} />
        <SummaryRow label="Confiance moyenne" value={`${averageTrust}/100`} color={averageTrust >= 60 ? '#00a676' : averageTrust >= 40 ? '#8a6f1f' : '#b42318'} />
        <SummaryRow label="Crédibilité" value={`${state.credibility ?? 50}/100`} color={(state.credibility ?? 50) >= 60 ? '#00a676' : (state.credibility ?? 50) >= 40 ? '#8a6f1f' : '#b42318'} />
        <SummaryRow label="Portée marché" value={getMarketReachLabel(state.reputation)} />
        <SummaryRow label="Capacité agence" value={`${state.roster.length}/${getAgencyCapacity(state.agencyLevel)}`} />
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>REPUTATION TERRITOIRES</div>
        {COUNTRIES.slice(0, 5).map((country) => (
          <div key={country.code} style={S.promiseRow}>
            <span>{country.flag} {country.label}</span>
            <strong>{state.countryReputation?.[country.code] ?? state.leagueReputation?.[country.code] ?? 0}/100</strong>
          </div>
        ))}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>MEDIAS & PROFILS</div>
        {MEDIA_RELATION_TEMPLATES.slice(0, 3).map((media) => (
          <div key={media.id} style={S.promiseRow}>
            <span>{media.name}</span>
            <strong>{state.mediaRelations?.[media.id] ?? media.stance}/100</strong>
          </div>
        ))}
        {Object.entries(state.playerSegmentReputation ?? {}).map(([key, value]) => (
          <div key={key} style={S.promiseRow}>
            <span>Joueurs {key}</span>
            <strong>{value}/100</strong>
          </div>
        ))}
      </div>
      <button onClick={onPlay} style={S.primaryBtn}>
        <Zap size={18} />
        <span>JOUER LA SEMAINE</span>
        <ChevronRight size={18} />
      </button>
      {(openOffers.length > 0 || urgentMessages.length > 0 || expiringContracts.length > 0 || lowTrustPlayers.length > 0 || competitorThreats.length > 0) && (
        <div style={S.decisionCard}>
          <div style={S.secTitle}>CENTRE DE DECISION</div>
          {openOffers.map((offer) => (
            <div key={offer.id} style={S.offerRow}>
              <div>
                <button onClick={() => onClubDetails?.(offer.club)} style={S.linkBtn}>{offer.club}</button>
                <div style={S.offerMeta}>
                  {offer.playerName} · {formatMoney(offer.price)} · {offer.preWindow ? `arrivée S${offer.effectiveWeek}` : `expire S${offer.expiresWeek}`}
                </div>
                {offer.preWindow && <div style={{ ...S.preAccordBadge, marginTop: 6 }}>PRÉ-ACCORD</div>}
              </div>
              <div style={S.offerActions}>
                <button onClick={() => onAcceptOffer(offer.id)} style={S.miniPrimary}>Négocier</button>
                <button onClick={() => onRejectOffer(offer.id)} style={S.miniGhost}>Refuser</button>
              </div>
            </div>
          ))}
          {urgentMessages.map((message) => (
            <button key={message.id} onClick={() => onNav('messages')} style={S.decisionRow}>
              <span>Message · {message.playerName}</span>
              <strong>Répondre</strong>
            </button>
          ))}
          {competitorThreats.map((threat) => (
            <button key={threat.id} onClick={() => onNav('messages')} style={S.decisionRow}>
              <span>Agent concurrent · {threat.playerName}</span>
              <strong>{threat.agentName}</strong>
            </button>
          ))}
          {expiringContracts.map((player) => (
            <button key={player.id} onClick={() => onNav('roster')} style={S.decisionRow}>
              <span>Contrat court · {player.firstName} {player.lastName}</span>
              <strong>{player.contractWeeksLeft}s</strong>
            </button>
          ))}
          {lowTrustPlayers.map((player) => (
            <button key={player.id} onClick={() => onNav('roster')} style={S.decisionRow}>
              <span>Relation fragile · {player.firstName} {player.lastName}</span>
              <strong>{player.trust ?? 50}</strong>
            </button>
          ))}
        </div>
      )}
      {!!spotlightNews.length && (
        <div style={S.objCard}>
          <div style={S.secTitle}>NEWS RAPIDES</div>
          {spotlightNews.map((post) => (
            <button key={post.id} style={S.decisionRow} onClick={() => onNav('news')}>
              <span>{post.accountName} · {post.text}</span>
              <strong>S{post.week}</strong>
            </button>
          ))}
        </div>
      )}
      <div style={S.objCard}>
        <div style={S.secTitle}>
          <Target size={14} />
          <span>OBJECTIFS SAISON {phase.season}</span>
        </div>
        {state.objectives.map((objective) => {
          let progress = 0;
          if (objective.type === 'money') progress = state.stats.totalEarned;
          else if (objective.type === 'rep') progress = state.reputation;
          else progress = state.stats.transfersDone;
          const percent = Math.min(100, Math.round((progress / objective.target) * 100));

          return (
            <div key={objective.id} style={S.objRow}>
              <div style={S.objLabel}>{objective.label}</div>
              <div style={S.progBar}>
                <div style={{ ...S.progFill, width: `${percent}%` }} />
              </div>
              <div style={S.objReward}>+{formatMoney(objective.reward)}</div>
            </div>
          );
        })}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>
          <Target size={14} />
          <span>OBJECTIFS LONG TERME</span>
        </div>
        {(state.agencyGoals ?? []).map((goal) => {
          const progress = getAgencyGoalProgress(goal, state);
          const percent = Math.min(100, Math.round((progress / goal.target) * 100));
          return (
            <div key={goal.id} style={S.objRow}>
              <div style={S.objLabel}>{goal.label}</div>
              <div style={S.progBar}><div style={{ ...S.progFill, width: `${percent}%` }} /></div>
              <div style={S.objReward}>{progress}/{goal.target}</div>
            </div>
          );
        })}
      </div>
      <div style={S.quickActs}>
        <button onClick={() => onNav('market')} style={S.quickCard}>
          <UserPlus size={20} color="#00a676" />
          <div style={S.qLabel}>Recruter</div>
          <div style={S.qSub}>Marché transferts</div>
        </button>
        <button onClick={() => onNav('office')} style={S.quickCard}>
          <Briefcase size={20} color="#172026" />
          <div style={S.qLabel}>Agence</div>
          <div style={S.qSub}>Scouts · avocat · média</div>
        </button>
      </div>
      {activePromises.length > 0 && (
        <div style={S.promiseCard}>
          <div style={S.secTitle}>
            <Target size={14} />
            <span>PROMESSES ACTIVES</span>
          </div>
          {activePromises.slice(0, 4).map((promise) => (
            <div key={promise.id} style={S.promiseRow}>
              <span>{promise.playerName} · {promise.label}</span>
              <strong>S{promise.dueWeek}</strong>
            </div>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div style={S.suggestionCard}>
          <div style={S.secTitle}>
            <Activity size={14} />
            <span>CONSEILS STRATEGIQUES</span>
          </div>
          {suggestions.map((suggestion) => (
            <div key={suggestion} style={S.suggestionRow}>{suggestion}</div>
          ))}
        </div>
      )}
      {state.history.length > 0 && (
        <div style={S.histCard}>
          <div style={S.secTitle}>
            <Activity size={14} />
            <span>BILANS</span>
          </div>
          {state.history.slice(-5).reverse().map((historyItem) => (
            <div key={`${historyItem.week}-${historyItem.net}`} style={S.histRow}>
              <span style={S.histWeek}>S{historyItem.week}</span>
              <span style={{ ...S.histNet, color: historyItem.net >= 0 ? '#00a676' : '#b42318' }}>
                {historyItem.net >= 0 ? '+' : ''}
                {formatMoney(historyItem.net)}
              </span>
              <span style={S.histRep}>Rép. {historyItem.rep}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
