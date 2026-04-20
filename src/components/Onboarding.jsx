import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { COUNTRIES, getCitiesForCountry } from '../data/clubs';
import { DIFFICULTIES, STARTING_PROFILES } from '../systems/agencyReputationSystem';
import { S } from './styles';

const EMBLEMS = ['⚡', '🦁', '🔥', '🌟', '🐺', '🦅', '💎', '🏆', '⚔️', '🎯'];

const STEP_META = [
  { num: 1, title: 'Ton identité', sub: 'Comment tu t\'appelles et où tu travailles.' },
  { num: 2, title: 'Ton style', sub: 'Comment tu vas gérer tes joueurs.' },
  { num: 3, title: 'On démarre !', sub: 'Tout est prêt — lance ton agence.' },
];

function ProgressBar({ step }) {
  return (
    <div style={S.onboardingProgress}>
      {STEP_META.map((meta) => (
        <div
          key={meta.num}
          style={{
            ...S.onboardingProgressDot,
            background: meta.num <= step ? '#00a676' : '#e5eaf0',
            transition: 'background .3s',
          }}
        />
      ))}
    </div>
  );
}

function Step1({ draft, update }) {
  const cities = useMemo(() => getCitiesForCountry(draft.countryCode), [draft.countryCode]);
  return (
    <div>
      <div style={S.onboardingStepTitle}>Crée ton agence</div>
      <div style={S.onboardingStepSub}>Donne un nom à ton agence et choisis ton look. Tu pourras tout modifier plus tard.</div>

      {/* Avatar preview */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{
          ...S.agencyAvatar,
          width: 72,
          height: 72,
          background: draft.color,
          fontSize: 34,
          boxShadow: `0 16px 40px ${draft.color}55`,
        }}>
          {draft.emblem ?? '⚡'}
        </div>
      </div>

      <div style={S.formGrid}>
        <label style={S.fieldLabel}>
          Nom de l'agence
          <input
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
            style={S.textInput}
            maxLength={28}
            placeholder="Mon Agence FC"
          />
        </label>
        <label style={S.fieldLabel}>
          Ton prénom
          <input
            value={draft.ownerName}
            onChange={(e) => update('ownerName', e.target.value)}
            style={S.textInput}
            maxLength={28}
            placeholder="Alex"
          />
        </label>
        <label style={S.fieldLabel}>
          Pays
          <select value={draft.countryCode} onChange={(e) => update('countryCode', e.target.value)} style={S.textInput}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
            ))}
          </select>
        </label>
        <label style={S.fieldLabel}>
          Ville
          <select value={draft.city} onChange={(e) => update('city', e.target.value)} style={S.textInput}>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </label>
        <label style={S.fieldLabel}>
          Couleur de l'agence
          <input type="color" value={draft.color} onChange={(e) => update('color', e.target.value)} style={S.colorInput} />
        </label>
        <div style={S.fieldLabel}>
          Emblème
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {EMBLEMS.map((em) => (
              <button
                key={em}
                onClick={() => update('emblem', em)}
                style={{
                  fontSize: 22,
                  background: (draft.emblem ?? '⚡') === em ? draft.color : '#f0f4f8',
                  border: `2px solid ${(draft.emblem ?? '⚡') === em ? draft.color : '#e5eaf0'}`,
                  borderRadius: 8,
                  width: 40,
                  height: 40,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2({ draft, update }) {
  const agencyStyles = [
    { value: 'equilibre', label: '⚖️ Équilibrée', desc: 'Bon départ, peu de risques. Idéal pour débuter.' },
    { value: 'business', label: '💼 Business agressif', desc: 'Plus forte sur le mercato, tu gagnes plus vite.' },
    { value: 'formation', label: '🌱 Développement jeunes', desc: 'Tes jeunes progressent plus vite.' },
    { value: 'prestige', label: '🎖️ Image premium', desc: 'Plus solide face aux médias et aux gros clubs.' },
  ];

  return (
    <div>
      <div style={S.onboardingStepTitle}>Ton style de jeu</div>
      <div style={S.onboardingStepSub}>Comment tu veux gérer ton agence. Ton profil de départ te donnera un avantage immédiat.</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', fontWeight: 850, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginBottom: 8 }}>POSITIONNEMENT DE L'AGENCE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {agencyStyles.map((style) => (
            <button
              key={style.value}
              onClick={() => update('style', style.value)}
              style={{
                ...S.choiceBtn,
                borderColor: draft.style === style.value ? '#00a676' : '#e5eaf0',
                background: draft.style === style.value ? '#f0fdf8' : '#ffffff',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={S.chLabel}>{style.label}</div>
                <div style={S.chDesc}>{style.desc}</div>
              </div>
              {draft.style === style.value && <span style={{ color: '#00a676', fontSize: 18 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', fontWeight: 850, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginBottom: 8 }}>TON PROFIL DE DÉPART</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(STARTING_PROFILES).map(([key, sp]) => (
            <button
              key={key}
              onClick={() => update('startProfile', key)}
              style={{
                ...S.choiceBtn,
                borderColor: (draft.startProfile ?? 'ancien_joueur') === key ? '#2563eb' : '#e5eaf0',
                background: (draft.startProfile ?? 'ancien_joueur') === key ? '#eff6ff' : '#ffffff',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={S.chLabel}>{sp.label}</div>
                <div style={S.chDesc}>{sp.description}</div>
              </div>
              {(draft.startProfile ?? 'ancien_joueur') === key && <span style={{ color: '#2563eb', fontSize: 18 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <label style={{ ...S.fieldLabel, marginBottom: 0 }}>
        Difficulté
        <select value={draft.difficulty ?? 'realiste'} onChange={(e) => update('difficulty', e.target.value)} style={{ ...S.textInput, marginTop: 6 }}>
          {Object.entries(DIFFICULTIES).map(([key, d]) => (
            <option key={key} value={key}>{d.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Step3({ draft }) {
  const tips = [
    '⚽ Joue une semaine pour simuler les matchs et gagner de la réputation.',
    '💬 Tes joueurs t\'envoient des messages — réponds pour maintenir leur confiance.',
    '🔄 Quand un club s\'intéresse à un joueur, tu peux négocier le transfert.',
    '📈 Plus ta réputation monte, plus tu recrutes des étoiles.',
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          ...S.agencyAvatar,
          width: 72,
          height: 72,
          background: draft.color,
          fontSize: 34,
          boxShadow: `0 16px 40px ${draft.color}55`,
          margin: '0 auto 12px',
        }}>
          {draft.emblem ?? '⚡'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#172026', marginBottom: 4 }}>{draft.name}</div>
        <div style={{ fontSize: 13, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>{draft.city} · Dirigée par {draft.ownerName}</div>
      </div>

      <div style={{ background: '#f0fdf8', border: '1px solid #cfeee3', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', fontWeight: 900, color: '#00a676', fontFamily: 'system-ui,sans-serif', marginBottom: 12 }}>🎓 COMMENT JOUER</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 13, color: '#172026', fontFamily: 'system-ui,sans-serif', lineHeight: 1.4 }}>{tip}</div>
          ))}
        </div>
      </div>

      <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: '10px 14px', marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
          <span style={{ color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>Style</span>
          <strong>{draft.style ?? 'equilibre'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
          <span style={{ color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>Profil</span>
          <strong>{draft.startProfile ?? 'ancien_joueur'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>Difficulté</span>
          <strong>{draft.difficulty ?? 'realiste'}</strong>
        </div>
      </div>
    </div>
  );
}

export default function Onboarding({ profile, onComplete }) {
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState(1);

  const update = (field, value) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'countryCode') next.city = getCitiesForCountry(value)[0] ?? '';
      return next;
    });
  };

  const canAdvance = step === 1
    ? draft.name?.trim().length >= 2 && draft.ownerName?.trim().length >= 1
    : true;

  const advance = () => {
    if (step < 3) setStep(step + 1);
    else onComplete({ ...draft, onboarded: true });
  };

  const meta = STEP_META[step - 1];

  return (
    <div style={S.onboardingWrap}>
      <div style={{ ...S.onboardingCard, paddingTop: 24 }}>
        <div style={S.el}>NOUVELLE CARRIÈRE · ÉTAPE {step}/3</div>
        <ProgressBar step={step} />
        <div style={{
          margin: '10px 0 18px',
          padding: '10px 12px',
          background: '#f3fbf8',
          border: '1px solid #cfeee3',
          borderRadius: 8,
          color: '#246555',
          fontSize: 12,
          lineHeight: 1.45,
          fontFamily: 'system-ui,sans-serif',
          fontWeight: 650,
        }}>
          La barre du bas n'apparaît qu'après la création de l'agence. Ici, tu construis d'abord ta carrière.
        </div>

        {step === 1 && <Step1 draft={draft} update={update} />}
        {step === 2 && <Step2 draft={draft} update={update} />}
        {step === 3 && <Step3 draft={draft} />}

        <button
          onClick={advance}
          disabled={!canAdvance}
          style={{
            ...S.primaryBtn,
            marginTop: 20,
            marginBottom: 0,
            opacity: canAdvance ? 1 : 0.45,
            cursor: canAdvance ? 'pointer' : 'not-allowed',
          }}
        >
          {step === 3 ? '🚀 LANCER MON AGENCE' : `CONTINUER`}
          <ChevronRight size={16} />
        </button>
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            style={{ ...S.secBtn, marginTop: 10, marginBottom: 0 }}
          >
            ← Retour
          </button>
        )}
      </div>
    </div>
  );
}
