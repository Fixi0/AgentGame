import { Briefcase, FileText, Search, Shield } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { COUNTRIES, getCitiesForCountry } from '../data/clubs';
import { DIFFICULTIES, STARTING_PROFILES } from '../systems/agencyReputationSystem';
import { getAgencyCapacity, getAgencyProgressSnapshot, getAgencyUpgradeCost } from '../systems/agencySystem';
import { OFFICE_UPGRADE_COSTS, OFFICE_UPGRADE_EFFECTS } from '../game/economy';
import { STAFF_ROLES, getStaffLevelEffect } from '../systems/staffSystem';
import { formatMoney } from '../utils/format';
import { S } from './styles';
import agencyOffice from '../assets/events/agency-office.jpg';
import agencyExpansion from '../assets/events/agency-expansion.jpg';
import moduleScouts from '../assets/events/module-scouts.jpg';
import moduleLawyer from '../assets/events/module-lawyer.jpg';
import moduleComms from '../assets/events/module-comms.jpg';
import scoutingMission from '../assets/events/scouting-mission.jpg';
import staffScout from '../assets/events/staff-scout.jpg';
import staffLawyer from '../assets/events/staff-lawyer.jpg';
import staffMedia from '../assets/events/staff-media.jpg';
import staffData from '../assets/events/staff-data.jpg';
import staffMedic from '../assets/events/staff-medic.jpg';

const STAFF_IMAGES = {
  scoutAfrica: staffScout,
  dataAnalyst: staffData,
  communityManager: staffMedia,
  playerCare: staffMedic,
};

const MODULE_IMAGES = {
  scoutLevel: moduleScouts,
  lawyerLevel: moduleLawyer,
  mediaLevel: moduleComms,
};

const VisualHeader = ({ src, label, title, subtitle, height = 110 }) => (
  <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 10, border: '1px solid var(--af-border)' }}>
    <img src={src} alt={title} loading="lazy" style={{ width: '100%', height, objectFit: 'cover', display: 'block' }} />
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,17,31,.10) 0%, rgba(8,17,31,.78) 100%)' }} />
    <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
      {label && <div style={{ fontSize: 9, letterSpacing: '.2em', fontFamily: 'system-ui,sans-serif', fontWeight: 900, color: 'rgba(255,255,255,.78)', marginBottom: 3 }}>{label}</div>}
      <div style={{ fontSize: 16, fontWeight: 950, color: '#fff', letterSpacing: '-.01em', textShadow: '0 2px 12px rgba(0,0,0,.45)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.82)', fontFamily: 'system-ui,sans-serif', marginTop: 2 }}>{subtitle}</div>}
    </div>
  </div>
);

const agencyStyles = [
  { value: 'equilibre', label: 'Équilibrée' },
  { value: 'business', label: 'Business agressif' },
  { value: 'formation', label: 'Développement jeunes' },
  { value: 'prestige', label: 'Image premium' },
];

export default function Office({ state, onUpgrade, onUpgradeAgency, onUpgradeStaff, onUpdateAgencyProfile, onStartScoutingMission }) {
  const [profile, setProfile] = useState(state.agencyProfile);
  const [flash, setFlash] = useState(null); // { key, ts }
  const availableCities = useMemo(() => getCitiesForCountry(profile.countryCode), [profile.countryCode]);
  const progression = getAgencyProgressSnapshot(state);
  const getModuleEffect = (key, level) => OFFICE_UPGRADE_EFFECTS[key]?.[level] ?? 'Niveau maximum';
  const moduleCosts = OFFICE_UPGRADE_COSTS;
  useEffect(() => {
    setProfile(state.agencyProfile);
  }, [state.agencyProfile]);

  const triggerFlash = (key) => {
    setFlash({ key, ts: Date.now() });
    setTimeout(() => setFlash(null), 1000);
  };
  const handleUpgrade = (key) => { triggerFlash(key); onUpgrade?.(key); };
  const handleUpgradeAgency = () => { triggerFlash('agency'); onUpgradeAgency?.(); };
  const handleUpgradeStaff = (key) => { triggerFlash('staff-' + key); onUpgradeStaff?.(key); };

  const FlashBurst = () => (
    <div className="af-upgrade-flash">
      <div className="af-flash-burst" />
      {[...Array(10)].map((_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <div
            key={i}
            className="af-flash-piece"
            style={{
              '--cx': `${Math.cos(angle) * 60}px`,
              '--cy': `${Math.sin(angle) * 60}px`,
              background: i % 2 ? 'var(--af-gold)' : 'var(--af-grass)',
              animationDelay: `${i * 0.02}s`,
            }}
          />
        );
      })}
    </div>
  );

  const items = [
    { key: 'scoutLevel', icon: <Search size={22} color="#00a676" />, label: 'Scouts', desc: 'Meilleurs joueurs et nouveaux pays', level: state.office.scoutLevel, costs: moduleCosts.scoutLevel },
    { key: 'lawyerLevel', icon: <FileText size={22} color="#2f80ed" />, label: 'Avocat', desc: 'Meilleures négociations', level: state.office.lawyerLevel, costs: moduleCosts.lawyerLevel },
    { key: 'mediaLevel', icon: <Shield size={22} color="#3f5663" />, label: 'Communication', desc: 'Réduit les scandales', level: state.office.mediaLevel, costs: moduleCosts.mediaLevel },
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

      <VisualHeader
        src={agencyOffice}
        label="QG · CONSEIL D'ADMINISTRATION"
        title={profile.name}
        subtitle={`${profile.city} · ${COUNTRIES.find((country) => country.code === profile.countryCode)?.label}`}
        height={150}
      />

      <div style={S.cardList}>
        <div style={S.offCard}>
          <div style={S.offHead}>
            <div style={{ ...S.agencyAvatar, background: profile.color }}>{profile.name.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
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
            <div style={{ flex: 1, minWidth: 0 }}>
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
          <div style={{ fontSize: 10, color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', marginTop: 8, lineHeight: 1.45 }}>
            {progression.nextStage ? `Prochain palier: ${progression.nextStage}` : 'Tu as atteint le palier le plus haut.'}
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            <div style={S.promiseRow}><span>Réputation</span><strong>{progression.metrics.reputation}/1000</strong></div>
            <div style={S.promiseRow}><span>Structure</span><strong>{progression.metrics.officeLevel}/30</strong></div>
            <div style={S.promiseRow}><span>Staff</span><strong>{progression.metrics.staffLevel}/40</strong></div>
            <div style={S.promiseRow}><span>Agence</span><strong>{progression.metrics.agencyLevel}/10</strong></div>
            <div style={S.promiseRow}><span>Complétion agence</span><strong>{progression.metrics.agencyCompletion}/100</strong></div>
            <div style={S.promiseRow}><span>Portefeuille</span><strong>{formatMoney(progression.metrics.portfolioValue)}</strong></div>
            <div style={S.promiseRow}><span>Confiance clubs</span><strong>{progression.metrics.relationScore}/100</strong></div>
            <div style={S.promiseRow}><span>Occupation</span><strong>{progression.metrics.utilization}%</strong></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: '.14em', color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>NIVEAUX D'AGENCE</div>
            {progression.levelRewards.map((level) => (
              <div key={level.level} style={{ ...S.promiseRow, opacity: level.reached ? 1 : 0.5 }}>
                <span>Niveau {level.level}</span>
                <strong>{level.reward}</strong>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: '.14em', color: 'var(--af-muted)', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 6 }}>PALIERS</div>
            {progression.rewards.map((stage) => (
              <div key={stage.label} style={{ ...S.promiseRow, opacity: stage.reached ? 1 : 0.5 }}>
                <span>{stage.label}</span>
                <strong>{stage.reward}</strong>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...S.offCard, position: 'relative' }}>
          <VisualHeader
            src={agencyExpansion}
            label="EXPANSION"
            title="Taille d'agence"
            subtitle={`Niveau ${state.agencyLevel}/10 · capacité ${getAgencyCapacity(state.agencyLevel)} joueurs`}
            height={100}
          />
          {agencyUpgradeCost ? (
            <button onClick={handleUpgradeAgency} style={S.upBtn} className="af-upgrade-btn">
              AGRANDIR · {formatMoney(agencyUpgradeCost)}
            </button>
          ) : (
            <div style={S.maxLvl}>NIVEAU MAX</div>
          )}
          {flash?.key === 'agency' && <FlashBurst />}
        </div>

        {items.map((item) => (
          <div key={item.key} style={{ ...S.offCard, position: 'relative' }}>
            <VisualHeader
              src={MODULE_IMAGES[item.key]}
              label={`MODULE · NIV. ${item.level}/${item.costs.length}`}
              title={item.label}
              subtitle={item.desc}
              height={100}
            />
            <div style={{ ...S.offDesc, marginBottom: 8 }}>
              Effet niveau {Math.min(item.level + 1, item.costs.length)}: {getModuleEffect(item.key, item.level)}
            </div>
            <div style={{ ...S.offLvl, marginBottom: 8 }}>
              {Array.from({ length: item.costs.length }).map((_, index) => (
                <div
                  key={index}
                  className={flash?.key === item.key && index === item.level - 1 ? 'af-level-dot-pop' : ''}
                  style={{ ...S.lvlDot, background: index < item.level ? '#00a676' : '#d6dde3' }}
                />
              ))}
            </div>
            {item.level < item.costs.length ? (
              <button onClick={() => handleUpgrade(item.key)} style={S.upBtn} className="af-upgrade-btn">
                AMELIORER · {formatMoney(item.costs[item.level])}
              </button>
            ) : (
              <div style={S.maxLvl}>NIVEAU MAX</div>
            )}
            {flash?.key === item.key && <FlashBurst />}
          </div>
        ))}


        <div style={S.offCard}>
          <div style={S.offHead}>
            <Briefcase size={22} color="#00a676" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.offLabel}>Staff agence</div>
              <div style={S.offDesc}>Recrute des spécialistes pour influencer la simulation</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 6 }}>
            {Object.entries(STAFF_ROLES).map(([key, role]) => {
              const level = state.staff?.[key] ?? 0;
              const cost = Math.floor(role.cost * (level + 1) * 1.25);
              const img = STAFF_IMAGES[key];
              return (
                <div key={key} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--af-border)', background: 'oklch(16% 0.035 258 / .78)' }}>
                  {flash?.key === 'staff-' + key && <FlashBurst />}
                  {img && (
                    <div style={{ position: 'relative', height: 96 }}>
                      <img src={img} alt={role.label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,17,31,.05) 0%, rgba(8,17,31,.82) 100%)' }} />
                      <div style={{ position: 'absolute', left: 10, right: 10, bottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 9, letterSpacing: '.18em', color: 'rgba(255,255,255,.75)', fontFamily: 'system-ui,sans-serif', fontWeight: 900 }}>STAFF</div>
                          <div style={{ fontSize: 14, fontWeight: 950, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>{role.label}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', background: 'rgba(0,0,0,.55)', padding: '4px 8px', borderRadius: 8, letterSpacing: '.06em' }}>
                          NIV. {level}/{role.maxLevel}
                        </span>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ ...S.offDesc, marginBottom: 4 }}>{role.desc}</div>
                    <div style={{ ...S.offDesc, marginBottom: 10 }}>
                      Effet niv. {Math.min(level + 1, role.maxLevel)}: {getStaffLevelEffect(key, Math.min(level + 1, role.maxLevel))}
                    </div>
                    {level < role.maxLevel ? (
                      <button onClick={() => handleUpgradeStaff(key)} style={S.staffBtn} className="af-upgrade-btn">
                        RECRUTER · {formatMoney(cost)}
                      </button>
                    ) : (
                      <div style={S.maxLvl}>MAX</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={S.offCard}>
          <VisualHeader
            src={scoutingMission}
            label="MISSIONS INTERNATIONALES"
            title="Centre scouting"
            subtitle={state.staff?.scoutAfrica > 0 ? 'Lance des missions pour faire émerger des pépites' : 'Recrute un scout international pour débloquer les missions'}
            height={100}
          />
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
