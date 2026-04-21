import React, { useEffect, useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { PERSONALITY_LABELS } from '../../data/players';
import { ALL_ATTRIBUTES } from '../../systems/attributesSystem';
import { getCareerGoalProgress } from '../../systems/playerDevelopmentSystem';
import { getClubMemorySummary } from '../../systems/clubSystem';
import { getDossierHistorySummary, getRecentDossierEvents } from '../../systems/coherenceSystem';
import { getPlayerDossierStatus, getRelevantDecisionHistory as getDecisionHistoryByPlayer, messageNeedsResponse } from '../../systems/dossierSystem';
import { NATIONAL_TEAMS } from '../../systems/worldCupSystem';
import { getPlayerProfileSummary } from '../../systems/playerProfileSystem';
import { formatMoney } from '../../utils/format';
import { getPlayerLevelLabel, getPlayerStarsText } from '../../utils/playerStars';
import { S } from '../styles';
import PlayerAttributesPanel from '../PlayerAttributesPanel';
import { assignIntelligentClubRole } from '../../data/localDatabase';

const tabLabels = {
  overview: 'Vue rapide',
  attributes: 'Attributs',
  contract: 'Contrat',
  dossier: 'Dossier',
};

const weekToLabel = (week) => {
  const MONTHS = ['Août', 'Sep.', 'Oct.', 'Nov.', 'Déc.', 'Jan.', 'Fév.', 'Mar.', 'Avr.', 'Mai', 'Jun.', 'Jul.'];
  const season = Math.floor((week - 1) / 38) + 1;
  const seasonWeek = ((week - 1) % 38) + 1;
  const monthIdx = Math.min(11, Math.floor((seasonWeek - 1) / 3));
  return `${MONTHS[monthIdx]} S${season}`;
};

const formatForm = (form = []) => form.length ? form.map((item) => String(item).slice(0, 1).toUpperCase()).join(' ') : 'Pas assez de matchs';

export default function PlayerDetailModal({ player, messages, messageQueue = [], promises, clubRelations, clubMemory, clubSeasonHistory = {}, dossierMemory, decisionHistory = [], pendingTransfers = [], clubOffers = [], negotiationCooldowns = {}, currentWeek, worldCupState = null, databaseView = null, onClose, onNego, onMeeting, onMarketAction, onCallPlayer, onContactClubStaff }) {
  const [tab, setTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 780 : false));

  // Ensure player has clubRole assigned
  const playerWithRole = useMemo(() => {
    if (!player) return player;
    if (player.clubRole) return player;
    const clubRole = assignIntelligentClubRole(player);
    return { ...player, clubRole };
  }, [player]);
  const playerPromises = (promises ?? []).filter((promise) => promise.playerId === playerWithRole.id && !promise.resolved && !promise.failed);
  const playerMessages = (messages ?? []).filter((message) => message.playerId === playerWithRole.id);
  const seasonStats = playerWithRole.seasonStats ?? {};
  const careerProgress = getCareerGoalProgress(playerWithRole);
  const clubRelation = clubRelations?.[playerWithRole.club] ?? 50;
  const memorySummary = getClubMemorySummary(clubMemory, playerWithRole.club);
  const clubMemoryScore = clubMemory?.[playerWithRole.club]?.trust ?? 50;
  const clubSeason = clubSeasonHistory?.[playerWithRole.club] ?? null;
  const clubTension = Math.max(0, 100 - clubRelation + Math.max(0, 55 - (playerWithRole.trust ?? 50)) + Math.max(0, 55 - clubMemoryScore));
  const tensionColor = clubTension > 68 ? '#b42318' : clubTension > 40 ? '#8a6f1f' : '#00a676';
  const dossierStatus = getPlayerDossierStatus(playerWithRole, { week: currentWeek, messages, messageQueue, promises, clubOffers, pendingTransfers, negotiationCooldowns });
  const relevantDecisions = getDecisionHistoryByPlayer(decisionHistory, { playerId: playerWithRole.id }).slice(0, 8);
  const recentActions = relevantDecisions.slice(0, 5);
  const recruitmentMemory = playerWithRole.recruitmentMemory ?? [];
  const promiseMemory = (promises ?? []).filter((promise) => promise.playerId === playerWithRole.id).slice(0, 6);
  const dossierRecent = getRecentDossierEvents(dossierMemory ?? {}, playerWithRole.id, 3);
  const dossierSummary = getDossierHistorySummary(dossierMemory ?? {}, playerWithRole.id);
  const worldCupSelection = worldCupState?.selectedPlayers?.find((entry) => entry.playerId === playerWithRole.id) ?? null;
  const worldCupCountry = worldCupSelection ? NATIONAL_TEAMS.find((team) => team.code === worldCupSelection.countryCode) : null;
  const dbPlayerRow = databaseView?.players?.find((row) => row.id === playerWithRole.id) ?? null;
  const playerProfile = playerWithRole.playerProfile ?? dbPlayerRow?.player_profile ?? getPlayerProfileSummary(playerWithRole);
  const clubSeasonContext = playerWithRole.clubSeasonContext ?? dbPlayerRow?.club_season_context ?? null;
  const playerInjuries = (databaseView?.injuries ?? [])
    .filter((row) => row.player_id === playerWithRole.id)
    .sort((a, b) => (b.started_week ?? 0) - (a.started_week ?? 0))
    .slice(0, 4);
  const clubCompetitionHistory = (databaseView?.competitionHistory ?? [])
    .filter((row) => row.club_name === playerWithRole.club)
    .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
    .slice(0, 5);
  const playerTransfers = (databaseView?.transfers ?? [])
    .filter((row) => row.player_id === playerWithRole.id)
    .sort((a, b) => (b.transfer_date ?? 0) - (a.transfer_date ?? 0))
    .slice(0, 4);
  const isPlayerRecruited = playerWithRole.agencySignedWeek != null;
  const actionGridStyle = {
    ...S.msgActions,
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
  };
  const actionBtnStyle = {
    ...S.msgBtn,
    padding: isMobile ? '12px 14px' : S.msgBtn.padding,
    fontSize: isMobile ? 11 : S.msgBtn.fontSize,
  };

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 780);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span>FICHE JOUEUR</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <div style={S.profileHero}>
            <div style={{ ...S.playerAvatar, width: 60, height: 60 }}>{playerWithRole.firstName?.[0]}{playerWithRole.lastName?.[0]}</div>
            <div>
              <h2 style={{ ...S.mTitle, marginBottom: 2, fontSize: 16 }}>{playerWithRole.firstName} {playerWithRole.lastName}</h2>
              <div style={{ ...S.mPlayer, fontSize: 12, marginBottom: 4 }}>{playerWithRole.position} · {playerWithRole.countryFlag} · {playerWithRole.roleLabel ?? playerWithRole.position}</div>
              <div style={{ fontSize: 11, color: '#64727d' }}>rôle club <strong style={{ color: playerWithRole.clubRole === 'Star' ? '#d97706' : '#172026' }}>{playerWithRole.clubRole ?? 'non défini'}</strong></div>
            </div>
          </div>
          <div style={{ ...S.tabRow, gap: 4, marginTop: 8 }}>
            {Object.entries(tabLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  ...S.tabBtn,
                  background: tab === key ? '#172026' : '#f7f9fb',
                  color: tab === key ? '#ffffff' : '#172026',
                  fontSize: 11,
                  padding: '6px 12px',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <>
              <div style={S.kpiGrid}>
                <DetailMetric label="Niveau" value={getPlayerStarsText(playerWithRole.rating)} />
                <DetailMetric label="Âge" value={`${player.age}a`} />
                <DetailMetric label="Position" value={player.position} />
                <DetailMetric label="Profil" value={getPlayerLevelLabel(playerWithRole.rating)} />
              </div>

              <div style={S.objCard}>
                <div style={S.secTitle}>CLUB & RÔLE</div>
                <div style={S.sumRow}><span style={S.sumK}>Club</span><strong>{player.club}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Rôle</span><strong style={{ color: player.clubRole === 'Star' ? '#d97706' : '#172026' }}>{player.clubRole ?? 'Non défini'}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Contrat</span><strong>{(player.contractWeeksLeft ?? 0) > 0 ? `${player.contractWeeksLeft} sem.` : 'Expiré'}</strong></div>
              </div>

              <div style={S.objCard}>
                <div style={S.secTitle}>ÉTAT ACTUEL</div>
                <Meter label="Moral" value={player.moral} />
                <Meter label="Confiance" value={player.trust ?? 50} />
                <Meter label="Forme" value={player.form} />
              </div>

              <div style={S.objCard}>
                <div style={S.secTitle}>VALEUR & MARCHÉ</div>
                <div style={S.sumRow}><span style={S.sumK}>Valeur</span><strong>{formatMoney(player.value)}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Salaire/sem</span><strong>{formatMoney(player.weeklySalary)}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Marque</span><strong>{player.brandValue ?? 0}/100</strong></div>
              </div>
            </>
          )}


          {tab === 'attributes' && (
            <>
              {playerWithRole.attributes && <PlayerAttributesPanel player={playerWithRole} />}
            </>
          )}

          {tab === 'dossier' && (
            <>
              <div style={S.objCard}>
                <div style={S.secTitle}>PROMESSES ACTIVES</div>
                {playerPromises.length ? playerPromises.map((promise) => (
                  <div key={promise.id} style={S.promiseRow}>
                    <span>{promise.label}</span>
                    <strong>{promise.failed ? 'Cassée' : promise.resolved ? 'Tenue' : 'En cours'}</strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucune promesse active.</div>}
              </div>

              <div style={S.objCard}>
                <div style={S.secTitle}>PERFORMANCE SAISON</div>
                <div style={S.statLineGrid}>
                  <div><strong>{seasonStats.appearances ?? 0}</strong><span>Matchs</span></div>
                  <div><strong>{seasonStats.goals ?? 0}</strong><span>Buts</span></div>
                  <div><strong>{seasonStats.assists ?? 0}</strong><span>Passes</span></div>
                  <div><strong>{seasonStats.averageRating ?? '-'}</strong><span>Note moy.</span></div>
                </div>
              </div>

              <div style={S.objCard}>
                <div style={S.secTitle}>HISTORIQUE ACTIONS</div>
                {recentActions.length ? recentActions.map((decision) => (
                  <div key={decision.id} style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 850, color: '#172026' }}>{decision.label}</div>
                        <div style={S.fixtureMeta}>{decision.type ?? 'action'} · S{decision.week}</div>
                      </div>
                      <strong style={{ fontSize: 11, color: '#00a676', whiteSpace: 'nowrap' }}>
                        {decision.impact ? `${decision.impact > 0 ? '+' : ''}${decision.impact}` : '—'}
                      </strong>
                    </div>
                  </div>
                )) : <div style={S.emptySmall}>Aucune action récente.</div>}
              </div>

              <div style={S.objCard}>
                <div style={S.secTitle}>MESSAGES</div>
                {playerMessages.length ? playerMessages.slice(-4).map((message) => (
                  <div key={message.id} style={S.promiseRow}>
                    <span style={{ fontSize: 11 }}>{message.senderName ?? message.playerName}</span>
                    <strong style={{ fontSize: 10 }}>S{message.week}</strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucun échange.</div>}
              </div>
            </>
          )}

          {tab === 'contract' && (
            <>
              <div style={S.objCard}>
                <div style={S.secTitle}>CONTRAT CLUB</div>
                {(() => {
                  const weeksLeft = player.contractWeeksLeft ?? 0;
                  const endWeek = (currentWeek ?? 0) + weeksLeft;
                  const urgent = weeksLeft <= 8;
                  const warning = weeksLeft > 8 && weeksLeft <= 26;
                  const bannerColor = urgent ? '#dc2626' : warning ? '#b45309' : '#00a676';
                  const bannerBg = urgent ? '#fef2f2' : warning ? '#fffbeb' : '#f0fdf8';
                  return (
                    <div style={{ background: bannerBg, border: `1px solid ${bannerColor}30`, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>Expire</span>
                        <strong style={{ fontSize: 13, color: bannerColor }}>
                          {weeksLeft > 0 ? `${weeksLeft} sem. · ${weekToLabel(endWeek)}` : 'EXPIRÉ'}
                        </strong>
                      </div>
                      {player.contractStartWeek && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>Signé</span>
                          <span style={{ fontSize: 12, color: '#64727d' }}>{weekToLabel(player.contractStartWeek)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div style={S.sumRow}><span style={S.sumK}>Club</span><strong>{player.club}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Rôle</span><strong style={{ color: player.clubRole === 'Star' ? '#d97706' : '#172026' }}>{player.clubRole ?? 'Non défini'}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Salaire</span><strong>{formatMoney(player.weeklySalary)}/sem</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Commission agence</span><strong>{Math.round(player.commission * 100)}%</strong></div>
                {(player.signingBonus ?? 0) > 0 && (
                  <div style={S.sumRow}><span style={S.sumK}>Prime à la signature</span><strong style={{ color: '#00a676' }}>{formatMoney(player.signingBonus)}</strong></div>
                )}
                <div style={S.sumRow}><span style={S.sumK}>Clause libératoire</span><strong>{formatMoney(player.releaseClause ?? 0)}</strong></div>
              </div>
              <div style={S.objCard}>
                <div style={S.secTitle}>CONTRAT AGENT-JOUEUR</div>
                <div style={S.sumRow}><span style={S.sumK}>Durée mandat</span><strong>{player.agentContract?.weeksLeft ?? 104} sem.</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Commission</span><strong>{Math.round((player.agentContract?.commission ?? player.commission) * 100)}%</strong></div>
              </div>
            </>
          )}


          {/* Action Buttons - Only show if player is recruited */}
          <div style={{ marginTop: 16, padding: '12px', background: '#f7f9fb', borderRadius: 8, border: '1px solid #e2e8ef', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 6 }}>
            {isPlayerRecruited ? (
              <>
                <button onClick={() => onNego('extend')} style={{ ...S.actBtn, padding: '8px 12px', fontSize: 11 }}>PROLONGER</button>
                <button onClick={() => onNego('transfer')} style={{ ...S.actBtn, padding: '8px 12px', fontSize: 11 }}>TRANSFERT</button>
                <button onClick={() => onCallPlayer?.(playerWithRole)} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11 }}>APPELER</button>
                <button onClick={() => onContactClubStaff?.(playerWithRole.id, 'coach')} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11 }}>COACH</button>
                <button onClick={() => onContactClubStaff?.(playerWithRole.id, 'ds')} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11 }}>DS</button>
                <button onClick={() => onMeeting?.(playerWithRole.id, 'career')} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11 }}>RÉUNION</button>
              </>
            ) : (
              <>
                <button onClick={() => onMarketAction?.(playerWithRole.id, playerWithRole.club === 'Libre' ? 'free_trial' : 'propose')} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11, gridColumn: '1 / -1' }}>
                  {playerWithRole.club === 'Libre' ? 'PROPOSER ESSAI' : 'PROPOSER'}
                </button>
              </>
            )}
            <button onClick={onClose} style={{ ...S.relBtn, padding: '8px 12px', fontSize: 11 }}>FERMER</button>
          </div>
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

