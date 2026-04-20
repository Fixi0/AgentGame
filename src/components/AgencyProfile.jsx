import React from 'react';
import { Award, Briefcase, TrendingUp, Users } from 'lucide-react';
import { getAgencyCapacity, getAgencyProgressSnapshot } from '../systems/agencySystem';
import { MEDIA_RELATION_TEMPLATES, RIVAL_AGENT_PROFILES } from '../systems/agencyReputationSystem';
import { getStaffWeeklyCost, STAFF_ROLES } from '../systems/staffSystem';
import { COUNTRIES } from '../data/clubs';
import { formatMoney } from '../utils/format';
import { S } from './styles';

export default function AgencyProfile({ state }) {
  const profile = state.agencyProfile;
  const portfolioValue = state.roster.reduce((sum, player) => sum + player.value, 0);
  const activePromises = (state.promises ?? []).filter((promise) => !promise.resolved && !promise.failed);
  const staffCost = getStaffWeeklyCost(state.staff);
  const progression = getAgencyProgressSnapshot(state);

  return (
    <div style={S.vp}>
      <div style={S.profileHero}>
        <div style={{ ...S.agencyAvatar, width: 72, height: 72, background: profile.color }}>{profile.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <div style={S.el}>PROFIL AGENCE</div>
          <h1 style={S.eh}>{profile.name}</h1>
          <div style={S.profileSub}>{profile.city} · {profile.ownerName} · {profile.style}</div>
        </div>
      </div>
      <div style={S.kpiGrid}>
        <ProfileMetric icon={<Briefcase size={18} />} label="Capital" value={formatMoney(state.money)} />
        <ProfileMetric icon={<Users size={18} />} label="Capacité" value={`${state.roster.length}/${getAgencyCapacity(state.agencyLevel)}`} />
        <ProfileMetric icon={<TrendingUp size={18} />} label="Portefeuille" value={formatMoney(portfolioValue)} />
        <ProfileMetric icon={<Award size={18} />} label="Staff / sem." value={formatMoney(staffCost)} />
        <ProfileMetric icon={<Award size={18} />} label="Crédibilité" value={`${state.credibility ?? 50}/100`} />
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>PROGRESSION AGENCE</div>
        <div style={S.sumRow}><span style={S.sumK}>Palier</span><strong>{progression.stage}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Lecture</span><strong>{progression.stageHint}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Récompense</span><strong>{progression.stageReward}</strong></div>
        <div style={S.sumRow}><span style={S.sumK}>Score</span><strong>{progression.score}/100</strong></div>
        <div style={S.progBar}><div style={{ ...S.progFill, width: `${progression.progress}%` }} /></div>
        <div style={S.objReward}>{progression.nextStage ? `Vers ${progression.nextStage}` : 'Sommet atteint'}</div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          <div style={S.promiseRow}><span>Réputation</span><strong>{progression.metrics.reputation}/1000</strong></div>
          <div style={S.promiseRow}><span>Crédibilité</span><strong>{progression.metrics.credibility}/100</strong></div>
          <div style={S.promiseRow}><span>Confiance moyenne</span><strong>{progression.metrics.avgTrust}/100</strong></div>
          <div style={S.promiseRow}><span>Agence</span><strong>{progression.metrics.agencyLevel}/10</strong></div>
          <div style={S.promiseRow}><span>Portefeuille</span><strong>{formatMoney(portfolioValue)}</strong></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: '.14em', color: '#64727d', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>PALIERS</div>
          {progression.rewards.map((stage) => (
            <div key={stage.label} style={{ ...S.promiseRow, opacity: stage.reached ? 1 : 0.5 }}>
              <span>{stage.label}</span>
              <strong>{stage.reward}</strong>
            </div>
          ))}
        </div>
      </div>
      <div style={S.segmentGrid}>
        {Object.entries(state.segmentReputation ?? {}).map(([key, value]) => (
          <div key={key} style={S.segmentCard}>
            <div style={S.segmentHead}><span>{key}</span><strong>{value}/100</strong></div>
            <div style={S.progBar}><div style={{ ...S.progFill, width: `${value}%` }} /></div>
          </div>
        ))}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>REPUTATION PAR PAYS</div>
        {COUNTRIES.map((country) => (
          <div key={country.code} style={S.promiseRow}>
            <span>{country.flag} {country.label}</span>
            <strong>{state.countryReputation?.[country.code] ?? 0}/100</strong>
          </div>
        ))}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>RELATIONS MEDIAS</div>
        {MEDIA_RELATION_TEMPLATES.map((media) => (
          <div key={media.id} style={S.promiseRow}>
            <span>{media.name}</span>
            <strong>{state.mediaRelations?.[media.id] ?? media.stance}/100</strong>
          </div>
        ))}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>RIVAUX AGENTS</div>
        {(state.rivalAgents ?? RIVAL_AGENT_PROFILES).map((agent) => (
          <div key={agent.id} style={S.promiseRow}>
            <span>{agent.name} · {agent.style}</span>
            <strong>{agent.heat ?? 0}/100</strong>
          </div>
        ))}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>HISTORIQUE DECISIONS</div>
        {(state.decisionHistory ?? []).slice(0, 8).map((decision) => (
          <div key={decision.id} style={S.promiseRow}>
            <span>{decision.label}</span>
            <strong>S{decision.week}</strong>
          </div>
        ))}
        {!(state.decisionHistory ?? []).length && <div style={S.emptySmall}>Aucune décision majeure enregistrée.</div>}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>STAFF</div>
        {Object.entries(STAFF_ROLES).map(([key, role]) => (
          <div key={key} style={S.sumRow}>
            <span style={S.sumK}>{role.label}</span>
            <strong>Niv. {state.staff?.[key] ?? 0}</strong>
          </div>
        ))}
      </div>
      <div style={S.objCard}>
        <div style={S.secTitle}>PROMESSES</div>
        {activePromises.length ? activePromises.map((promise) => (
          <div key={promise.id} style={S.promiseRow}>
            <span>{promise.playerName} · {promise.label}</span>
            <strong>S{promise.dueWeek}</strong>
          </div>
        )) : <div style={S.emptySmall}>Aucune promesse active.</div>}
      </div>
    </div>
  );
}

function ProfileMetric({ icon, label, value }) {
  return (
    <div style={S.kpiCard}>
      <div style={S.kpiLabel}>{icon} {label}</div>
      <div style={S.kpiValue}>{value}</div>
    </div>
  );
}
