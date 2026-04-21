import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PERSONALITY_LABELS } from '../../data/players';
import { ALL_ATTRIBUTES } from '../../systems/attributesSystem';
import { getCareerGoalProgress } from '../../systems/playerDevelopmentSystem';
import { getClubMemorySummary } from '../../systems/clubSystem';
import { getDossierHistorySummary, getRecentDossierEvents } from '../../systems/coherenceSystem';
import { getPlayerDossierStatus, getRelevantDecisionHistory as getDecisionHistoryByPlayer, messageNeedsResponse } from '../../systems/dossierSystem';
import { NATIONAL_TEAMS } from '../../systems/worldCupSystem';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';
import PlayerAttributesPanel from '../PlayerAttributesPanel';

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
  const playerPromises = (promises ?? []).filter((promise) => promise.playerId === player.id && !promise.resolved && !promise.failed);
  const playerMessages = (messages ?? []).filter((message) => message.playerId === player.id);
  const seasonStats = player.seasonStats ?? {};
  const careerProgress = getCareerGoalProgress(player);
  const clubRelation = clubRelations?.[player.club] ?? 50;
  const memorySummary = getClubMemorySummary(clubMemory, player.club);
  const clubMemoryScore = clubMemory?.[player.club]?.trust ?? 50;
  const clubSeason = clubSeasonHistory?.[player.club] ?? null;
  const clubTension = Math.max(0, 100 - clubRelation + Math.max(0, 55 - (player.trust ?? 50)) + Math.max(0, 55 - clubMemoryScore));
  const tensionColor = clubTension > 68 ? '#b42318' : clubTension > 40 ? '#8a6f1f' : '#00a676';
  const dossierStatus = getPlayerDossierStatus(player, { week: currentWeek, messages, messageQueue, promises, clubOffers, pendingTransfers, negotiationCooldowns });
  const relevantDecisions = getDecisionHistoryByPlayer(decisionHistory, { playerId: player.id }).slice(0, 8);
  const recentActions = relevantDecisions.slice(0, 5);
  const recruitmentMemory = player.recruitmentMemory ?? [];
  const promiseMemory = (promises ?? []).filter((promise) => promise.playerId === player.id).slice(0, 6);
  const dossierRecent = getRecentDossierEvents(dossierMemory ?? {}, player.id, 3);
  const dossierSummary = getDossierHistorySummary(dossierMemory ?? {}, player.id);
  const worldCupSelection = worldCupState?.selectedPlayers?.find((entry) => entry.playerId === player.id) ?? null;
  const worldCupCountry = worldCupSelection ? NATIONAL_TEAMS.find((team) => team.code === worldCupSelection.countryCode) : null;
  const dbPlayerRow = databaseView?.players?.find((row) => row.id === player.id) ?? null;
  const clubSeasonContext = player.clubSeasonContext ?? dbPlayerRow?.club_season_context ?? null;
  const playerInjuries = (databaseView?.injuries ?? [])
    .filter((row) => row.player_id === player.id)
    .sort((a, b) => (b.started_week ?? 0) - (a.started_week ?? 0))
    .slice(0, 4);
  const clubCompetitionHistory = (databaseView?.competitionHistory ?? [])
    .filter((row) => row.club_name === player.club)
    .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
    .slice(0, 5);
  const playerTransfers = (databaseView?.transfers ?? [])
    .filter((row) => row.player_id === player.id)
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
            <div style={{ ...S.playerAvatar, width: 72, height: 72 }}>{player.firstName?.[0]}{player.lastName?.[0]}</div>
            <div>
              <h2 style={S.mTitle}>{player.firstName} {player.lastName}</h2>
              <div style={S.mPlayer}>{player.position} · {player.countryFlag} {player.countryLabel} · {PERSONALITY_LABELS[player.personality]}</div>
              <div style={S.profileSub}>{player.roleLabel ?? player.position} · rôle club {player.clubRole ?? 'non défini'}</div>
              <div style={{ ...S.statusPill, marginTop: 8, display: 'inline-flex' }}>
                {dossierStatus.label}
                {dossierStatus.detail ? ` · ${dossierStatus.detail}` : ''}
              </div>
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
                  fontSize: 12,
                  padding: '8px 14px',
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
              {player.attributes && (
                <div style={{ ...S.objCard, marginTop: 12 }}>
                  <div style={S.secTitle}>ATTRIBUTS (17-STAT)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                    {Object.entries(player.attributes).map(([key, attr]) => {
                      const def = ALL_ATTRIBUTES[key];
                      if (!def || (def.category === 'goalkeeper' && player.position !== 'GK')) return null;
                      if (!attr) return null;
                      const pct = (attr.current / 20) * 100;
                      return (
                        <div key={key} style={{ background: '#f7f9fb', borderRadius: 6, padding: '8px', textAlign: 'center', border: '1px solid #e2e8ef' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#64727d', marginBottom: 4, textTransform: 'uppercase' }}>{def.short}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#00a676', marginBottom: 4 }}>{attr.current.toFixed(0)}</div>
                          <div style={{ height: 8, background: '#d5dce0', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #00a676 0%, #00d488 100%)', width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          <div style={S.objCard}>
            <div style={S.secTitle}>RÉSUMÉ RAPIDE</div>
            <div style={S.sumRow}><span style={S.sumK}>Statut</span><strong>{dossierStatus.label}{dossierStatus.detail ? ` · ${dossierStatus.detail}` : ''}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Contrat</span><strong>{(player.contractWeeksLeft ?? 0) > 0 ? `${player.contractWeeksLeft} sem. restantes` : 'Expiré'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Saison</span><strong>{seasonStats.appearances ?? 0} matchs · {seasonStats.goals ?? 0} buts · {seasonStats.assists ?? 0} passes</strong></div>
            {player.birthDateLabel && <div style={S.sumRow}><span style={S.sumK}>Naissance</span><strong>{player.birthDateLabel} · {player.birthPlace ?? player.clubCity ?? '-'}</strong></div>}
            <div style={S.sumRow}><span style={S.sumK}>Coupe du monde</span><strong>{worldCupSelection ? `${worldCupCountry?.flag ?? worldCupSelection.countryFlag ?? player.countryFlag ?? ''} ${worldCupCountry?.name ?? player.countryLabel ?? 'Sélection'} · ${worldCupSelection.selectionNote ?? 'sélectionné'}` : 'Hors tournoi'}</strong></div>
          </div>
          <div style={S.kpiGrid}>
            <DetailMetric label="Note" value={player.rating} />
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
            <div style={S.sumRow}><span style={S.sumK}>Club relation</span><strong>{clubRelation}/100</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Mémoire club</span><strong>{memorySummary}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Tension</span><strong style={{ color: tensionColor }}>{clubTension >= 65 ? 'forte' : clubTension >= 35 ? 'modérée' : 'calme'}</strong></div>
            <div style={S.progBar}><div style={{ ...S.progFill, width: `${Math.min(100, clubTension)}%`, background: tensionColor }} /></div>
          </div>
          {player.attributes && <PlayerAttributesPanel player={player} />}
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
              <div style={S.emptySmall}>{player.scoutReport.note}</div>
            </div>
          )}
          <div style={S.objCard}>
            <div style={S.secTitle}>CONTRAT CLUB</div>
            {/* Contract status banner */}
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
            <div style={S.sumRow}><span style={S.sumK}>Ville</span><strong>{player.clubCity || '-'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Rôle</span><strong style={{ color: player.clubRole === 'Star' ? '#d97706' : '#172026' }}>{player.clubRole ?? 'Non défini'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Salaire</span><strong>{formatMoney(player.weeklySalary)}/sem</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Commission agence</span><strong>{Math.round(player.commission * 100)}%</strong></div>
            {(player.signingBonus ?? 0) > 0 && (
              <div style={S.sumRow}><span style={S.sumK}>Prime à la signature</span><strong style={{ color: '#00a676' }}>{formatMoney(player.signingBonus)}</strong></div>
            )}
            <div style={S.sumRow}><span style={S.sumK}>Clause libératoire</span><strong>{formatMoney(player.releaseClause ?? 0)}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>% revente</span><strong>{player.sellOnPercent ?? 0}%</strong></div>
            {(player.clubBonuses?.total ?? 0) > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, letterSpacing: '.14em', color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>PRIMES DE PERFORMANCE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { k: 'Total', v: player.clubBonuses.total },
                    { k: 'Buts', v: player.clubBonuses.goals ?? 0 },
                    { k: 'Matchs', v: player.clubBonuses.appearances ?? 0 },
                    { k: 'Europe', v: player.clubBonuses.europe ?? 0 },
                  ].map(({ k, v }) => v > 0 && (
                    <div key={k} style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', letterSpacing: '.12em' }}>{k.toUpperCase()}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#172026', fontFamily: 'system-ui,sans-serif' }}>{formatMoney(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {player.contractClauses && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, letterSpacing: '.14em', color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>CLAUSES</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 6, padding: '6px 8px' }}>
                    <div style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', letterSpacing: '.12em' }}>BALLON D'OR</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#172026', fontFamily: 'system-ui,sans-serif' }}>{formatMoney(player.contractClauses.ballonDorBonus ?? 0)}</div>
                  </div>
                  <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 6, padding: '6px 8px' }}>
                    <div style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', letterSpacing: '.12em' }}>NO-CUT</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#172026', fontFamily: 'system-ui,sans-serif' }}>{player.contractClauses.noCutClause ? 'Oui' : 'Non'}</div>
                  </div>
                  <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 6, padding: '6px 8px', gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', letterSpacing: '.12em' }}>RÔLE PROTÉGÉ</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#172026', fontFamily: 'system-ui,sans-serif' }}>{player.contractClauses.coachRoleProtection ? 'Oui' : 'Non'}</div>
                  </div>
                  {player.contractClauses.rolePromise && (
                    <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 6, padding: '6px 8px', gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif', letterSpacing: '.12em' }}>RÔLE PROMIS</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#172026', fontFamily: 'system-ui,sans-serif' }}>{player.contractClauses.rolePromise}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={S.objCard}>
            <div style={S.secTitle}>CONTRAT AGENT-JOUEUR</div>
            <div style={S.sumRow}><span style={S.sumK}>Durée mandat</span><strong>{player.agentContract?.weeksLeft ?? 104} sem.</strong></div>
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
            <div style={S.secTitle}>MATCHS DU CLUB EN BASE</div>
            {clubCompetitionHistory.length ? clubCompetitionHistory.map((match) => (
              <div key={match.id} style={S.promiseRow}>
                <span>S{match.week} · {match.competition_label ?? match.competition} · {match.club_name} {match.score ?? '-'} {match.opponent_name}</span>
                <strong>{match.result}</strong>
              </div>
            )) : <div style={S.emptySmall}>Aucun match de club persisté pour l'instant.</div>}
          </div>
            </>
          )}

          {tab === 'attributes' && (
            <>
              {player.attributes && <PlayerAttributesPanel player={player} />}
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

          {tab === 'statistics' && (
            <>
              <div style={S.objCard}>
                <div style={S.secTitle}>SAISON</div>
                <div style={S.statLineGrid}>
                  <div><strong>{seasonStats.appearances ?? 0}</strong><span>Matchs</span></div>
                  <div><strong>{seasonStats.goals ?? 0}</strong><span>Buts</span></div>
                  <div><strong>{seasonStats.assists ?? 0}</strong><span>Passes</span></div>
                  <div><strong>{seasonStats.averageRating ?? '-'}</strong><span>Note moy.</span></div>
                </div>
              </div>
              <div style={S.objCard}>
                <div style={S.secTitle}>DERNIERS MATCHS</div>
                {(player.matchHistory ?? []).length ? player.matchHistory.slice(0, 5).map((match) => (
                  <div key={`${match.week}-${match.opponent}`} style={S.promiseRow}>
                    <span>S{match.week} · {match.club} {match.score} {match.opponent}</span>
                    <strong>{match.matchRating ? `${match.matchRating}/10` : 'ABS'}</strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucun match simulé.</div>}
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
                <div style={S.sumRow}><span style={S.sumK}>Tension</span><strong style={{ color: tensionColor }}>{clubTension >= 65 ? 'forte' : clubTension >= 35 ? 'modérée' : 'calme'}</strong></div>
              </div>
              <div style={S.objCard}>
                <div style={S.secTitle}>PROFIL HUMAIN</div>
                <div style={S.sumRow}><span style={S.sumK}>Club rêvé</span><strong>{player.dreamClub ?? '-'}</strong></div>
                <div style={S.sumRow}><span style={S.sumK}>Entourage</span><strong>{player.entourage ?? '-'}</strong></div>
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

          {tab === 'dossier' && (
            <>
              <div style={S.objCard}>
                <div style={S.secTitle}>MEMOIRE DOSSIER</div>
                <div style={S.sumRow}><span style={S.sumK}>Lecture</span><strong>{dossierSummary}</strong></div>
                {dossierRecent.length ? dossierRecent.map((entry) => (
                  <div key={entry.id} style={S.promiseRow}>
                    <span>{entry.label}</span>
                    <strong style={{ color: entry.impact > 0 ? '#00a676' : entry.impact < 0 ? '#b42318' : '#64727d' }}>
                      {entry.impact > 0 ? 'Calmé' : entry.impact < 0 ? 'Tendu' : 'Neutre'}
                    </strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucun signal récent.</div>}
              </div>
              <div style={S.objCard}>
                <div style={S.secTitle}>PROMESSES</div>
                {playerPromises.length ? playerPromises.map((promise) => (
                  <div key={promise.id} style={S.promiseRow}>
                    <span>{promise.label}</span>
                    <strong>{promise.failed ? 'Cassée' : promise.resolved ? 'Tenue' : 'En cours'}</strong>
                  </div>
                )) : <div style={S.emptySmall}>Aucune promesse active.</div>}
              </div>
            </>
          )}

          {/* Centralized Action Buttons */}
          <div style={{ marginTop: 16, padding: '12px', background: '#f7f9fb', borderRadius: 8, border: '1px solid #e2e8ef', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
            <button onClick={() => onNego('extend')} style={{ ...S.actBtn, padding: '10px 14px', fontSize: 12 }}>PROLONGER</button>
            <button onClick={() => onNego('transfer')} style={{ ...S.actBtn, padding: '10px 14px', fontSize: 12 }}>TRANSFERT</button>
            <button onClick={() => onCallPlayer?.(player)} style={{ ...S.msgBtn, padding: '10px 14px', fontSize: 12 }}>APPELER</button>
            <button onClick={() => onMeeting?.(player.id, 'career')} style={{ ...S.msgBtn, padding: '10px 14px', fontSize: 12 }}>RÉUNION</button>
            <button onClick={() => onMarketAction?.(player.id, player.club === 'Libre' ? 'free_trial' : 'propose')} style={{ ...S.msgBtn, padding: '10px 14px', fontSize: 12 }}>{player.club === 'Libre' ? 'ESSAI' : 'PROPOSER'}</button>
            <button onClick={onClose} style={{ ...S.relBtn, padding: '10px 14px', fontSize: 12 }}>FERMER</button>
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
