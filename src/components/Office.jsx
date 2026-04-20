import { Briefcase, FileText, Search, Shield } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { COUNTRIES, getCitiesForCountry } from '../data/clubs';
import { DIFFICULTIES, STARTING_PROFILES } from '../systems/agencyReputationSystem';
import { getAgencyCapacity, getAgencyProgressSnapshot, getAgencyUpgradeCost } from '../systems/agencySystem';
import { STAFF_ROLES } from '../systems/staffSystem';
import { formatMoney } from '../utils/format';
import { S } from './styles';

const agencyStyles = [
  { value: 'equilibre', label: 'Équilibrée' },
  { value: 'business', label: 'Business agressif' },
  { value: 'formation', label: 'Développement jeunes' },
  { value: 'prestige', label: 'Image premium' },
];

export default function Office({ state, onUpgrade, onUpgradeAgency, onUpgradeStaff, onUpdateAgencyProfile, onStartScoutingMission }) {
  const [profile, setProfile] = useState(state.agencyProfile);
  const availableCities = useMemo(() => getCitiesForCountry(profile.countryCode), [profile.countryCode]);
  const progression = getAgencyProgressSnapshot(state);
  useEffect(() => {
    setProfile(state.agencyProfile);
  }, [state.agencyProfile]);
  const items = [
    { key: 'scoutLevel', icon: <Search size={22} color="#00a676" />, label: 'Scouts', desc: 'Meilleurs joueurs et nouveaux pays', level: state.office.scoutLevel, costs: [10000, 25000, 60000] },
    { key: 'lawyerLevel', icon: <FileText size={22} color="#2f80ed" />, label: 'Avocat', desc: 'Meilleures négociations', level: state.office.lawyerLevel, costs: [8000, 20000, 50000] },
    { key: 'mediaLevel', icon: <Shield size={22} color="#3f5663" />, label: 'Communication', desc: 'Réduit les scandales', level: state.office.mediaLevel, costs: [12000, 30000, 70000] },
  ];
  const agencyUpgradeCost = getAgencyUpgradeCost(state.agencyLevel);
  const handleProfileChange = (field, value) => {
    const nextProfile = {
      ...profile,
      [field]: value,
    };

    if (field === 'countryCode') {
      nextProfile.city = getCitiesForCountry(value)[0] ?? '';
    }

    setProfile(nextProfile);
  };
  const saveProfile = () => onUpdateAgencyProfile(profile);

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>BUREAU D'AGENCE</div>
        <h1 style={S.eh}>Agence</h1>
      </div>
      <div style={S.cardList}>
        <div style={S.offCard}>
          <div style={S.offHead}>
            <div style={{ ...S.agencyAvatar, background: profile.color }}>{profile.name.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={S.offLabel}>{profile.name}</div>
              <div style={S.offDesc}>{profile.city} · {COUNTRIES.find((country) => country.code === profile.countryCode)?.label}</div>
            </div>
          </div>
          <div style={S.formGrid}>
            <label style={S.fieldLabel}>
              Nom agence
              <input value={profile.name} onChange={(event) => handleProfileChange('name', event.target.value)} style={S.textInput} maxLength={28} />
            </label>
            <label style={S.fieldLabel}>
              Directeur
              <input value={profile.ownerName} onChange={(event) => handleProfileChange('ownerName', event.target.value)} style={S.textInput} maxLength={28} />
            </label>
            <label style={S.fieldLabel}>
              Pays
              <select value={profile.countryCode} onChange={(event) => handleProfileChange('countryCode', event.target.value)} style={S.textInput}>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>{country.flag} {country.label}</option>
                ))}
              </select>
            </label>
            <label style={S.fieldLabel}>
              Ville
              <select value={profile.city} onChange={(event) => handleProfileChange('city', event.target.value)} style={S.textInput}>
                {availableCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </label>
            <label style={S.fieldLabel}>
              Couleur
              <input type="color" value={profile.color} onChange={(event) => handleProfileChange('color', event.target.value)} style={S.colorInput} />
            </label>
            <label style={S.fieldLabel}>
              Positionnement
              <select value={profile.style} onChange={(event) => handleProfileChange('style', event.target.value)} style={S.textInput}>
                {agencyStyles.map((style) => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </select>
            </label>
            <label style={S.fieldLabel}>
              Difficulté
              <select value={profile.difficulty ?? state.difficulty ?? 'realiste'} onChange={(event) => handleProfileChange('difficulty', event.target.value)} style={S.textInput}>
                {Object.entries(DIFFICULTIES).map(([key, difficulty]) => (
                  <option key={key} value={key}>{difficulty.label}</option>
                ))}
              </select>
            </label>
            <label style={S.fieldLabel}>
              Profil
              <select value={profile.startProfile ?? state.startProfile ?? 'ancien_joueur'} onChange={(event) => handleProfileChange('startProfile', event.target.value)} style={S.textInput}>
                {Object.entries(STARTING_PROFILES).map(([key, startProfile]) => (
                  <option key={key} value={key}>{startProfile.label}</option>
                ))}
              </select>
            </label>
          </div>
          <button onClick={saveProfile} style={S.upBtn}>ENREGISTRER L'IDENTITE</button>
        </div>
        <div style={S.offCard}>
          <div style={S.offHead}>
            <Briefcase size={22} color="#00a676" />
            <div style={{ flex: 1 }}>
              <div style={S.offLabel}>Progression de l'agence</div>
              <div style={S.offDesc}>{progression.stage} · {progression.stageHint}</div>
            </div>
            <div style={S.offLvl}>
              <div style={{ ...S.lvlDot, background: '#00a676' }} />
            </div>
          </div>
          <div style={S.sumRow}><span style={S.sumK}>Score</span><strong>{progression.score}/100</strong></div>
          <div style={S.sumRow}><span style={S.sumK}>Récompense</span><strong>{progression.stageReward}</strong></div>
          <div style={S.progBar}><div style={{ ...S.progFill, width: `${progression.progress}%` }} /></div>
          <div style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginTop: 8, lineHeight: 1.45 }}>
            {progression.nextStage ? `Prochain palier: ${progression.nextStage}` : 'Tu as atteint le palier le plus haut.'}
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            <div style={S.promiseRow}><span>Réputation</span><strong>{progression.metrics.reputation}/1000</strong></div>
            <div style={S.promiseRow}><span>Structure</span><strong>{progression.metrics.officeLevel}/15</strong></div>
            <div style={S.promiseRow}><span>Staff</span><strong>{progression.metrics.staffLevel}/20</strong></div>
            <div style={S.promiseRow}><span>Portefeuille</span><strong>{formatMoney(progression.metrics.portfolioValue)}</strong></div>
            <div style={S.promiseRow}><span>Confiance clubs</span><strong>{progression.metrics.relationScore}/100</strong></div>
            <div style={S.promiseRow}><span>Occupation</span><strong>{progression.metrics.utilization}%</strong></div>
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
        <div style={S.offCard}>
          <div style={S.offHead}>
            <Briefcase size={22} color="#172026" />
            <div style={{ flex: 1 }}>
              <div style={S.offLabel}>Taille d'agence</div>
              <div style={S.offDesc}>Niveau {state.agencyLevel} · capacité {getAgencyCapacity(state.agencyLevel)} joueurs</div>
            </div>
          </div>
          {agencyUpgradeCost ? (
            <button onClick={onUpgradeAgency} style={S.upBtn}>
              AGRANDIR · {formatMoney(agencyUpgradeCost)}
            </button>
          ) : (
            <div style={S.maxLvl}>NIVEAU MAX</div>
          )}
        </div>
        {items.map((item) => (
          <div key={item.key} style={S.offCard}>
            <div style={S.offHead}>
              {item.icon}
              <div style={{ flex: 1 }}>
                <div style={S.offLabel}>{item.label}</div>
                <div style={S.offDesc}>{item.desc}</div>
              </div>
              <div style={S.offLvl}>
                {Array.from({ length: item.costs.length }).map((_, index) => (
                  <div key={index} style={{ ...S.lvlDot, background: index < item.level ? '#00a676' : '#d6dde3' }} />
                ))}
              </div>
            </div>
            {item.level < item.costs.length ? (
              <button onClick={() => onUpgrade(item.key)} style={S.upBtn}>
                AMELIORER · {formatMoney(item.costs[item.level])}
              </button>
            ) : (
              <div style={S.maxLvl}>NIVEAU MAX</div>
            )}
          </div>
        ))}
        <div style={S.offCard}>
          <div style={S.offHead}>
            <Briefcase size={22} color="#00a676" />
            <div style={{ flex: 1 }}>
              <div style={S.offLabel}>Staff agence</div>
              <div style={S.offDesc}>Recrute des spécialistes pour influencer la simulation</div>
            </div>
          </div>
          <div style={S.staffGrid}>
            {Object.entries(STAFF_ROLES).map(([key, role]) => {
              const level = state.staff?.[key] ?? 0;
              const cost = Math.floor(role.cost * (level + 1) * 1.25);

              return (
                <div key={key} style={S.staffItem}>
                  <div style={S.staffTop}>
                    <strong>{role.label}</strong>
                    <span>Niv. {level}/{role.maxLevel}</span>
                  </div>
                  <div style={S.offDesc}>{role.desc}</div>
                  {level < role.maxLevel ? (
                    <button onClick={() => onUpgradeStaff(key)} style={S.staffBtn}>
                      RECRUTER · {formatMoney(cost)}
                    </button>
                  ) : (
                    <div style={S.maxLvl}>MAX</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={S.offCard}>
          <div style={S.offHead}>
            <Search size={22} color="#00a676" />
            <div style={{ flex: 1 }}>
              <div style={S.offLabel}>Centre scouting</div>
              <div style={S.offDesc}>
                {state.staff?.scoutAfrica > 0 ? 'Lance des missions pour faire apparaître des rapports et joueurs repérés.' : 'Recrute un scout international pour débloquer les missions.'}
              </div>
            </div>
          </div>
          {state.staff?.scoutAfrica > 0 && (
            <>
              <div style={S.formGrid}>
                {COUNTRIES.slice(0, 6).map((country) => (
                  <button key={country.code} onClick={() => onStartScoutingMission(country.code)} style={S.msgBtn}>
                    {country.flag} {country.label}
                  </button>
                ))}
              </div>
              {(state.scoutingMissions ?? []).slice(0, 3).map((mission) => (
                <div key={mission.id} style={S.promiseRow}>
                  <span>{COUNTRIES.find((country) => country.code === mission.countryCode)?.label} · {mission.status}</span>
                  <strong>{mission.weeksLeft}s</strong>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
