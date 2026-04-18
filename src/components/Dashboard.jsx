import { Activity, Briefcase, CheckCircle, ChevronRight, Circle, Clock, Target, UserPlus, Zap } from 'lucide-react';
import React from 'react';
import { getAgencyCapacity } from '../systems/agencySystem';
import { getMarketOfferQueue, getPendingMessageCounts, messageNeedsResponse } from '../systems/dossierSystem';
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

function SeasonArc({ currentWeek, totalWeeks }) {
  const pct = Math.min(100, Math.round(((currentWeek - 1) / (totalWeeks - 1)) * 100));
  const segments = [
    { label: 'Pré-saison', start: 1, end: 4, color: '#d97706' },
    { label: 'Saison', start: 5, end: 20, color: '#2563eb' },
    { label: 'Mercato Hiver', start: 21, end: 23, color: '#e83a3a' },
    { label: 'Saison', start: 24, end: 34, color: '#2563eb' },
    { label: 'Fin', start: 35, end: 38, color: '#16a34a' },
  ];
  const svgW = 280;
  const svgH = 36;
  const barY = 18;
  const barH = 6;
  const r = 7;

  return (
    <div style={S.seasonArc}>
      <div style={{ ...S.secTitle, marginBottom: 8 }}>
        <Clock size={13} />
        <span>ARC DE SAISON · S{currentWeek}/{totalWeeks}</span>
      </div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" style={{ display: 'block' }}>
        {/* Background bar */}
        <rect x={r} y={barY - barH / 2} width={svgW - r * 2} height={barH} rx={barH / 2} fill="#e7edf1" />
        {/* Colored segments */}
        {segments.map((seg) => {
          const x1 = r + ((seg.start - 1) / (totalWeeks - 1)) * (svgW - r * 2);
          const x2 = r + ((seg.end - 1) / (totalWeeks - 1)) * (svgW - r * 2);
          return <rect key={seg.label + seg.start} x={x1} y={barY - barH / 2} width={Math.max(0, x2 - x1)} height={barH} fill={seg.color} opacity={0.7} />;
        })}
        {/* Current week dot */}
        <circle cx={r + (pct / 100) * (svgW - r * 2)} cy={barY} r={r} fill="#172026" />
        <text x={r + (pct / 100) * (svgW - r * 2)} y={barY + 1} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={7} fontWeight="900" fontFamily="system-ui,sans-serif">{currentWeek}</text>
        {/* Labels */}
        <text x={r} y={svgH - 2} textAnchor="start" fill="#9aa7b2" fontSize={7} fontFamily="system-ui,sans-serif">Pré-saison</text>
        <text x={svgW / 2} y={svgH - 2} textAnchor="middle" fill="#9aa7b2" fontSize={7} fontFamily="system-ui,sans-serif">Mi-saison</text>
        <text x={svgW - r} y={svgH - 2} textAnchor="end" fill="#9aa7b2" fontSize={7} fontFamily="system-ui,sans-serif">Fin</text>
      </svg>
    </div>
  );
}

function ActivityFeed({ news, history }) {
  const newsItems = (news ?? []).slice(0, 6).map((post) => ({
    icon: '📰',
    text: `${post.accountName ?? post.account?.name ?? 'News'} · ${post.text?.slice(0, 60)}${(post.text?.length ?? 0) > 60 ? '…' : ''}`,
    week: post.week,
  }));
  const histItems = (history ?? []).slice(-3).reverse().map((h) => ({
    icon: h.net >= 0 ? '💰' : '📉',
    text: `Bilan S${h.week} · ${h.net >= 0 ? '+' : ''}${h.net?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`,
    week: h.week,
  }));
  const items = [...newsItems, ...histItems].sort((a, b) => (b.week ?? 0) - (a.week ?? 0)).slice(0, 8);
  if (!items.length) return null;
  return (
    <div style={S.actFeed}>
      <div style={{ ...S.secTitle, marginBottom: 6 }}>
        <Activity size={13} />
        <span>FIL D'ACTU</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ ...S.actFeedItem, borderBottom: i < items.length - 1 ? '1px solid #f0f4f7' : 'none' }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>
          {item.week != null && <span style={{ fontSize: 10, color: '#9aa7b2', flexShrink: 0, fontFamily: 'system-ui,sans-serif' }}>S{item.week}</span>}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ state, phase, onPlay, onNav, onAcceptOffer, onRejectOffer, onClubDetails, onOpenContracts }) {
  const portfolioValue = state.roster.reduce((sum, player) => sum + player.value, 0);
  const weeklyIncome = state.roster.reduce((sum, player) => sum + Math.floor(player.weeklySalary * player.commission), 0);
  const injuredCount = state.roster.filter((player) => player.injured > 0).length;
  const averageMoral = state.roster.length ? Math.round(state.roster.reduce((sum, player) => sum + player.moral, 0) / state.roster.length) : 0;
  const averageTrust = state.roster.length ? Math.round(state.roster.reduce((sum, player) => sum + (player.trust ?? 50), 0) / state.roster.length) : 0;
  const activePromises = (state.promises ?? []).filter((promise) => !promise.resolved && !promise.failed);
  const suggestions = getStrategicSuggestions(state);
  const segments = state.segmentReputation ?? {};
  const pendingCounts = getPendingMessageCounts(state);
  const urgentMessages = (state.messages ?? []).filter(messageNeedsResponse).slice(0, 3);
  const expiringContracts = state.roster.filter((player) => player.contractWeeksLeft <= 12).slice(0, 3);
  const lowTrustPlayers = state.roster.filter((player) => (player.trust ?? 50) < 45 || player.moral < 45).slice(0, 3);
  const marketQueue = getMarketOfferQueue(state).slice(0, 4);
  const competitorThreats = (state.competitorThreats ?? []).slice(0, 2);
  const spotlightNews = (state.news ?? []).slice(0, 3);
  const todayTimeline = [
    {
      label: 'Date',
      value: phase.phase,
      sub: `${phase.month ?? ''} · S${phase.seasonWeek}/38`,
    },
    { label: 'Messages', value: `${pendingCounts.total}`, sub: pendingCounts.total ? 'File active' : 'Rien à lire' },
    { label: 'Offres', value: `${marketQueue.length}`, sub: marketQueue.length ? 'Dossiers à suivre' : 'Aucune offre' },
    { label: 'Promesses', value: `${activePromises.length}`, sub: activePromises.length ? 'Points sensibles' : 'Aucune' },
    { label: 'Réponse attendue', value: `${pendingCounts.awaitingResponse ?? pendingCounts.urgent}`, sub: (pendingCounts.awaitingResponse ?? pendingCounts.urgent) ? 'Dossier chaud' : 'Calme' },
  ];
  const todayActions = [
    urgentMessages.length ? { label: 'Répondre', sub: `${urgentMessages.length} message`, action: () => onNav('messages') } : null,
    marketQueue.length ? { label: 'Gérer offres', sub: `${marketQueue.length} dossier mercato`, action: () => onNav('dossiers') } : null,
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
      <SeasonArc currentWeek={phase.seasonWeek ?? 1} totalWeeks={38} />
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
        <SummaryRow label="Gemmes" value={`${state.gems ?? 0}`} color={(state.gems ?? 0) > 0 ? '#00a676' : '#64727d'} />
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
      <ActivityFeed news={state.news} history={state.history} />
      <button onClick={onPlay} style={S.primaryBtn}>
        <Zap size={18} />
        <span>JOUER LA SEMAINE</span>
        <ChevronRight size={18} />
      </button>
      {(marketQueue.length > 0 || urgentMessages.length > 0 || expiringContracts.length > 0 || lowTrustPlayers.length > 0 || competitorThreats.length > 0) && (
        <div style={S.decisionCard}>
          <div style={S.secTitle}>CENTRE DE DECISION</div>
          {marketQueue.map((offer) => (
            <div key={offer.id} style={{
              ...S.offerRow,
              background: offer.queueStatus?.key === 'bloquee' ? '#fff7f7' : offer.queueStatus?.key === 'conclue' ? '#f0fdf8' : offer.queueStatus?.key === 'en_cours' ? '#f8fbff' : '#f7f9fb',
              borderColor: offer.queueStatus?.key === 'bloquee' ? '#fca5a5' : offer.queueStatus?.key === 'conclue' ? '#cfeee3' : offer.queueStatus?.key === 'en_cours' ? '#cfe1ff' : '#e5eaf0',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => onClubDetails?.(offer.club)} style={S.linkBtn}>{offer.club}</button>
                  <span style={{
                    ...S.preAccordBadge,
                    background: offer.queueStatus?.key === 'bloquee' ? '#fee2e2' : offer.queueStatus?.key === 'conclue' ? '#dcfce7' : offer.queueStatus?.key === 'en_cours' ? '#dbeafe' : '#fff4d6',
                    color: offer.queueStatus?.tone === 'danger' ? '#b42318' : offer.queueStatus?.tone === 'good' ? '#246555' : offer.queueStatus?.tone === 'warn' ? '#1d4ed8' : '#8a6f1f',
                  }}>
                    {offer.queueStatus?.label ?? 'Nouvelle'}
                  </span>
                </div>
                <div style={S.offerMeta}>
                  {offer.playerName} · {formatMoney(offer.price)} · {offer.preWindow ? `arrivée S${offer.effectiveWeek}` : `expire S${offer.expiresWeek}`}
                </div>
                <div style={S.qSub}>{offer.queueStatus?.detail ?? (offer.queueStatus?.key === 'bloquee' ? 'Bloqué par le dossier en cours' : 'Dossier actif')}</div>
              </div>
              <div style={S.offerActions}>
                {offer.queueStatus?.key !== 'conclue' ? (
                  <button onClick={() => onAcceptOffer(offer.id)} style={S.miniPrimary}>Négocier</button>
                ) : (
                  <button onClick={() => onClubDetails?.(offer.club)} style={S.miniGhost}>Voir</button>
                )}
                {offer.queueStatus?.key !== 'conclue' && <button onClick={() => onRejectOffer(offer.id)} style={S.miniGhost}>Refuser</button>}
              </div>
            </div>
          ))}
          {urgentMessages.map((message) => (
            <button key={message.id} onClick={() => onNav('messages')} style={{ ...S.decisionRow, background: '#fff7f7', borderColor: '#fecaca' }}>
              <span>Réponse attendue · {message.playerName}</span>
              <strong>Ouvrir</strong>
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
