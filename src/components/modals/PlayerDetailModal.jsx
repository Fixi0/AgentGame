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
import { getPlayerSpecialties, getPrimarySpecialty, SPECIALTY_CATEGORIES, HIDDEN_TRAITS } from '../../systems/playerSpecialtiesSystem';
import { assessPlayerPersonality, getPlayerAbility, PERSONALITY_TRAITS, ABILITY_RANGES, getTraitColor, formatTraitValue } from '../../systems/playerPersonalityTraitsSystem';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';
import PlayerAttributesPanel from '../PlayerAttributesPanel';
import { assignIntelligentClubRole } from '../../data/localDatabase';

const tabLabels = {
  dashboard: 'Tableau de bord',
  attributes: 'Attributs',
  contract: 'Contrat',
  statistics: 'Statistiques',
  dossier: 'Dossier',
  relations: 'Relations',
  conversation: 'Conversation',
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
  const [tab, setTab] = useState('dashboard');
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

          {tab === 'dashboard' && (
            <>
              <div style={S.kpiGrid}>
                <DetailMetric label="Note" value={player.rating} />
                <DetailMetric label="Valeur" value={formatMoney(player.value)} />
                <DetailMetric label="Salaire" value={`${formatMoney(player.weeklySalary)}/s`} />
                <DetailMetric label="Marque" value={`${player.brandValue ?? 0}/100`} />
              </div>
              <div style={S.objCard}>
                <div style={S.secTitle}>LECTURE JOUEUR</div>
                <div style={S.sumRow}><span style={S.sumK}>Profil</span><strong>{playerProfile.label}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Style</span><strong>{playerProfile.style}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Besoin</span><strong>{playerProfile.developmentNeed}</strong></div>
                <div style={S.tagRow}>
                  {playerProfile.tags.map((tag) => <span key={tag} style={S.softTag}>{tag}</span>)}
                </div>
                <div style={S.emptySmall}>{playerProfile.advice}</div>
              </div>
              <SpecialtiesPanel player={playerWithRole} />
              <div style={S.objCard}>
            <div style={S.secTitle}>RÉSUMÉ</div>
            <div style={S.sumRow}><span style={S.sumK}>Statut</span><strong>{dossierStatus.label}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Contrat</span><strong>{(player.contractWeeksLeft ?? 0) > 0 ? `${player.contractWeeksLeft} sem.` : 'Expiré'}</strong></div>
          </div>
            </>
          )}

          {tab === 'relations' && (
            <>
            <div style={S.objCard}>
            <div style={S.secTitle}>RELATION</div>
            <Meter label="Moral" value={player.moral} />
            <Meter label="Confiance" value={player.trust ?? 50} />
            <Meter label="Forme" value={player.form} />
            <Meter label="Fatigue" value={player.fatigue ?? 20} inverted />
            <Meter label="Pression" value={player.pressure ?? 50} inverted />
            <div style={S.sumRow}><span style={S.sumK}>Club relation</span><strong>{clubRelation}/100</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Mémoire club</span><strong>{memorySummary}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Tension</span><strong style={{ color: tensionColor }}>{clubTension >= 65 ? 'forte' : clubTension >= 35 ? 'modérée' : 'calme'}</strong></div>
            <div style={S.progBar}><div style={{ ...S.progFill, width: `${Math.min(100, clubTension)}%`, background: tensionColor }} /></div>
          </div>
            </>
          )}

          {tab === 'attributes' && (
            <>
              <div style={S.objCard}>
                <div style={S.secTitle}>PROFIL ATTRIBUTS</div>
                <div style={S.kpiGrid}>
                  <DetailMetric label="Technique" value={`${playerProfile.technical}/100`} />
                  <DetailMetric label="Mental" value={`${playerProfile.mental}/100`} />
                  <DetailMetric label="Physique" value={`${playerProfile.physical}/100`} />
                  <DetailMetric label="Fiabilité" value={`${playerProfile.reliability}/100`} />
                </div>
                <div style={S.sumRow}><span style={S.sumK}>Forces</span><strong>{playerProfile.strengths.join(', ')}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>A travailler</span><strong>{playerProfile.weaknesses.join(', ')}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Risque blessure</span><strong>{playerProfile.injuryRisk}/100</strong></div>
                <div style={S.emptySmall}>{playerProfile.negotiationHook}</div>
              </div>
              {playerWithRole.attributes && <PlayerAttributesPanel player={playerWithRole} />}
            </>
          )}

          {tab === 'dossier' && (
            <>
              <div style={S.objCard}>
                <div style={S.secTitle}>PROMESSES & DOSSIER</div>
                {playerPromises.length ? playerPromises.map((promise) => (
                  <div key={promise.id} style={S.promiseRow}>
                    <span>{promise.label}</span>
                    <strong>{promise.failed ? 'Cassée' : promise.resolved ? 'Tenue' : 'En cours'}</strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucune promesse active.</div>}
              </div>
            </>
          )}

          {tab === 'statistics' && (
            <>
              <PersonalityTraitsPanel player={playerWithRole} />
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
                <div style={S.secTitle}>DOSSIER RECRUTEMENT</div>
                <div style={S.tagRow}>
                  {(player.recruitmentPriorities ?? []).length
                    ? player.recruitmentPriorities.map((item) => <span key={item} style={S.softTag}>{item}</span>)
                    : <span style={S.emptySmall}>Aucune priorité détectée.</span>}
                </div>
                <div style={S.tagRow}>
                  {(player.recruitmentDealBreakers ?? []).length
                    ? player.recruitmentDealBreakers.map((item) => <span key={item} style={S.warnTag}>{item}</span>)
                    : <span style={S.emptySmall}>Aucun frein majeur.</span>}
                </div>
                <div style={S.sumRow}><span style={S.sumK}>Fit recrutement</span><strong>{player.recruitmentFit ?? '--'}/100</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Angle choisi</span><strong>{player.signReason ?? player.recruitmentPitch ?? 'à déterminer'}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Approches</span><strong>{recruitmentMemory.length}</strong></div>
                {recruitmentMemory.slice(0, 2).map((entry, index) => (
                  <div key={`${entry.week}-${entry.pitchId}-${index}`} style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: '8px 10px', marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <strong style={{ fontSize: 12, color: '#172026' }}>{entry.pitchLabel ?? entry.pitchId}</strong>
                      <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>S{entry.week}</span>
                    </div>
                    <div style={S.fixtureMeta}>
                      {entry.result === 'refused' ? 'Refus' : 'Accord'} · Fit {entry.fit}/100 · Seuil {entry.threshold}/100
                    </div>
                  </div>
                ))}
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
                {clubSeasonContext && (
                  <>
                    <div style={{ marginTop: 10, fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', letterSpacing: '.08em', fontWeight: 900 }}>SAISON DU CLUB</div>
                    <div style={S.sumRow}><span style={S.sumK}>Classement</span><strong>{clubSeasonContext.position ?? '-'}e/{clubSeasonContext.totalClubs ?? '-'}</strong></div>
                    <div style={S.sumRow}><span style={S.sumK}>Points</span><strong>{clubSeasonContext.points ?? 0} pts · diff. {clubSeasonContext.goalDifference >= 0 ? `+${clubSeasonContext.goalDifference}` : clubSeasonContext.goalDifference}</strong></div>
                    <div style={S.sumRow}><span style={S.sumK}>Forme club</span><strong>{formatForm(clubSeasonContext.form)}</strong></div>
                    <div style={S.sumRow}><span style={S.sumK}>Objectif</span><strong>{clubSeasonContext.objective ?? 'Saison stable'}</strong></div>
                    <div style={S.sumRow}><span style={S.sumK}>Leader</span><strong>{clubSeasonContext.leader ?? '-'}</strong></div>
                  </>
                )}
                {clubSeason && (
                  <>
                    <div style={{ marginTop: 8, fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', letterSpacing: '.08em' }}>HISTORIQUE CLUB CETTE SAISON</div>
                    <div style={S.sumRow}><span style={S.sumK}>Coupe</span><strong>{clubSeason.competition ?? 'Aucune'}</strong></div>
                    <div style={S.sumRow}><span style={S.sumK}>Matchs club</span><strong>{(clubSeason.league?.length ?? 0) + (clubSeason.europe?.length ?? 0)}</strong></div>
                    <div style={S.sumRow}><span style={S.sumK}>Dernier résumé</span><strong>{clubSeason.summary?.[0] ?? 'Pas encore de résumé'}</strong></div>
                  </>
                )}
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
                  <div style={S.sumRow}><span style={S.sumK}>Confiance scout</span><strong>{player.scoutReport.confidence}%</strong></div>
                  <div style={S.sumRow}><span style={S.sumK}>Profil lu</span><strong>{player.scoutReport.profile?.label ?? playerProfile.label}</strong></div>
                  <div style={S.sumRow}><span style={S.sumK}>Risque</span><strong>{player.scoutReport.risk ?? 'normal'}</strong></div>
                  <div style={S.emptySmall}>{player.scoutReport.note}</div>
                </div>
              )}
              <div style={S.objCard}>
                <div style={S.secTitle}>HISTORIQUE BDD</div>
                <div style={S.sumRow}><span style={S.sumK}>Blessures</span><strong>{playerInjuries.length}</strong></div>
                {playerInjuries.length ? playerInjuries.map((injury) => (
                  <div key={injury.id} style={S.promiseRow}>
                    <span>S{injury.started_week} · {injury.reason}</span>
                    <strong>{injury.status === 'active' ? `${injury.remaining_weeks} sem.` : 'récupéré'}</strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucune blessure historisée en base.</div>}
                <div style={{ height: 8 }} />
                <div style={S.sumRow}><span style={S.sumK}>Transferts</span><strong>{playerTransfers.length}</strong></div>
                {playerTransfers.length ? playerTransfers.map((transfer) => (
                  <div key={transfer.id} style={S.promiseRow}>
                    <span>{transfer.from_club_name ? `${transfer.from_club_name} → ` : 'Signature · '}{transfer.to_club_name ?? 'club'}</span>
                    <strong>S{transfer.transfer_date}</strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucun transfert historisé pour ce joueur.</div>}
              </div>
              <div style={S.objCard}>
                <div style={S.secTitle}>HISTORIQUE D'ACTIONS</div>
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
                    <div style={{ fontSize: 12, color: '#3f5663', fontFamily: 'system-ui,sans-serif', lineHeight: 1.5, marginTop: 6 }}>
                      Conséquence : {decision.detail ?? 'Effet enregistré dans le dossier.'}
                    </div>
                  </div>
                )) : <div style={S.emptySmall}>Aucune décision récente liée à ce dossier.</div>}
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
                <div style={S.secTitle}>MATCHS DU CLUB EN BASE</div>
                {clubCompetitionHistory.length ? clubCompetitionHistory.map((match) => (
                  <div key={match.id} style={S.promiseRow}>
                    <span>S{match.week} · {match.competition_label ?? match.competition} · {match.club_name} {match.score ?? '-'} {match.opponent_name}</span>
                    <strong>{match.result}</strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucun match de club persisté pour l'instant.</div>}
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
              <div style={S.objCard}>
                <div style={S.secTitle}>PROMESSES</div>
                {promiseMemory.length ? promiseMemory.map((promise) => (
                  <div key={promise.id} style={S.promiseRow}>
                    <span>{promise.label}</span>
                    <strong>
                      {promise.failed ? 'Cassée' : promise.resolved ? 'Tenue' : 'En cours'} · S{promise.dueWeek}
                    </strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucune promesse enregistrée.</div>}
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

          {tab === 'conversation' && (
            <>
              <div style={S.objCard}>
                <div style={S.secTitle}>CONVERSATION</div>
                {playerMessages.length ? playerMessages.slice(-8).map((message) => (
                  <div key={message.id} style={S.threadBlock}>
                    <div style={S.incomingBubble}>
                      <div style={S.threadMeta}>{message.senderName ?? message.playerName} · S{message.week} · {message.subject}</div>
                      <div>{message.body}</div>
                      {messageNeedsResponse(message) && <div style={S.responseBadgeInline}>Réponse attendue</div>}
                    </div>
                    {message.resolved && (
                      <div style={S.outgoingBubble}>{message.responseText ?? 'Réponse envoyée'}</div>
                    )}
                  </div>
                )) : <div style={S.emptySmall}>Aucun échange encore.</div>}
              </div>
            </>
          )}

          {/* Centralized Action Buttons */}
          <div style={{ marginTop: 16, padding: '12px', background: '#f7f9fb', borderRadius: 8, border: '1px solid #e2e8ef', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 6 }}>
            <button onClick={() => onNego('extend')} style={{ ...S.actBtn, padding: '8px 12px', fontSize: 11 }}>PROLONGER</button>
            <button onClick={() => onNego('transfer')} style={{ ...S.actBtn, padding: '8px 12px', fontSize: 11 }}>TRANSFERT</button>
            <button onClick={() => onCallPlayer?.(playerWithRole)} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11 }}>APPELER</button>
            <button onClick={() => onContactClubStaff?.(playerWithRole.id, 'coach')} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11 }}>COACH</button>
            <button onClick={() => onContactClubStaff?.(playerWithRole.id, 'ds')} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11 }}>DS</button>
            <button onClick={() => onMeeting?.(playerWithRole.id, 'career')} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11 }}>RÉUNION</button>
            <button onClick={() => onMarketAction?.(playerWithRole.id, playerWithRole.club === 'Libre' ? 'free_trial' : 'propose')} style={{ ...S.msgBtn, padding: '8px 12px', fontSize: 11 }}>{playerWithRole.club === 'Libre' ? 'ESSAI' : 'PROPOSER'}</button>
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

function SpecialtiesPanel({ player }) {
  const specialties = useMemo(() => getPlayerSpecialties(player), [player]);
  const primarySpecialty = useMemo(() => getPrimarySpecialty(player), [player]);

  if (!specialties.length) {
    return null;
  }

  // Group specialties by category
  const groupedByCategory = {};
  specialties.forEach((specialty) => {
    const category = SPECIALTY_CATEGORIES[specialty.category];
    if (!groupedByCategory[category]) {
      groupedByCategory[category] = [];
    }
    groupedByCategory[category].push(specialty);
  });

  return (
    <div style={S.objCard}>
      <div style={S.secTitle}>SPÉCIALITÉS FM</div>

      {primarySpecialty && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fdf3 100%)',
          border: '2px solid #16a34a',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{primarySpecialty.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#16a34a' }}>
                {primarySpecialty.label}
              </div>
              <div style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>
                Spécialité principale
              </div>
            </div>
          </div>
          {primarySpecialty.description && (
            <div style={{ fontSize: 11, color: '#3f5663', marginTop: 6, lineHeight: 1.4 }}>
              {primarySpecialty.description}
            </div>
          )}
          {Object.keys(primarySpecialty.bonus || {}).length > 0 && (
            <div style={{ fontSize: 10, color: '#16a34a', marginTop: 6, fontWeight: 700 }}>
              Bonus: {Object.entries(primarySpecialty.bonus).map(([key, val]) => `+${val} ${key}`).join(', ')}
            </div>
          )}
        </div>
      )}

      {Object.entries(groupedByCategory).map(([category, specs]) => (
        <div key={category} style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 900,
            color: '#64727d',
            letterSpacing: '.08em',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}>
            {category}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {specs.map((spec) => (
              <div
                key={spec.key}
                style={{
                  background: '#f7f9fb',
                  border: '1px solid #e5eaf0',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: 11,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{spec.icon}</span>
                  <div style={{ fontWeight: 700, color: '#172026', flex: 1 }}>{spec.label}</div>
                </div>
                {spec.description && (
                  <div style={{ fontSize: 10, color: '#64727d', lineHeight: 1.3 }}>
                    {spec.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PersonalityTraitsPanel({ player }) {
  const traits = useMemo(() => assessPlayerPersonality(player), [player]);
  const ability = useMemo(() => getPlayerAbility(player), [player]);

  return (
    <div style={S.objCard}>
      <div style={S.secTitle}>TRAITS DE PERSONNALITÉ</div>

      {/* Ability Section */}
      <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e5eaf0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
          <div style={{ background: '#f7f9fb', borderRadius: 6, padding: '10px 12px', border: '1px solid #e5eaf0' }}>
            <div style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>
              {ABILITY_RANGES.ca.short}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#2563eb', marginTop: 4 }}>
              {ability.ca}
            </div>
            <div style={{ fontSize: 9, color: '#64727d', marginTop: 2 }}>
              Capacité actuelle
            </div>
          </div>
          <div style={{ background: '#f7f9fb', borderRadius: 6, padding: '10px 12px', border: '1px solid #e5eaf0' }}>
            <div style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>
              {ABILITY_RANGES.pa.short}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#7c3aed', marginTop: 4 }}>
              {ability.pa}
            </div>
            <div style={{ fontSize: 9, color: '#64727d', marginTop: 2 }}>
              Potentiel max
            </div>
          </div>
        </div>
      </div>

      {/* Personality Traits Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Object.entries(PERSONALITY_TRAITS).map(([key, traitDef]) => {
          const value = traits[key] ?? 10;
          const color = getTraitColor(value, traitDef.inverted);
          const assessment = formatTraitValue(value);
          const percentage = (value / traitDef.max) * 100;

          return (
            <div
              key={key}
              style={{
                background: '#f7f9fb',
                border: '1px solid #e5eaf0',
                borderRadius: 6,
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{traitDef.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#172026' }}>
                    {traitDef.label}
                  </div>
                  <div style={{ fontSize: 9, color: '#64727d' }}>
                    {Math.round(value)}/{traitDef.max}
                  </div>
                </div>
              </div>
              <div style={{
                background: '#e5eaf0',
                borderRadius: 4,
                height: 6,
                overflow: 'hidden',
                marginBottom: 4,
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    background: color,
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 9, color, fontWeight: 700, textAlign: 'right' }}>
                {assessment}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
