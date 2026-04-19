import React, { useMemo, useState } from 'react';
import { COUNTRIES, getCitiesForCountry } from '../data/clubs';
import { DIFFICULTIES, STARTING_PROFILES } from '../systems/agencyReputationSystem';
import { S } from './styles';

const EMBLEMS = ['⚡', '🦁', '🔥', '🌟', '🐺', '🦅', '💎', '🏆', '⚔️', '🎯'];

const agencyStyles = [
  { value: 'equilibre', label: 'Équilibrée', desc: 'Bon départ, peu de risques.' },
  { value: 'business', label: 'Business agressif', desc: 'Plus forte sur le mercato.' },
  { value: 'formation', label: 'Développement jeunes', desc: 'Meilleure progression des talents.' },
  { value: 'prestige', label: 'Image premium', desc: 'Plus solide face aux médias.' },
];

export default function Onboarding({ profile, onComplete }) {
  const [draft, setDraft] = useState(profile);
  const cities = useMemo(() => getCitiesForCountry(draft.countryCode), [draft.countryCode]);

  const update = (field, value) => {
    const nextDraft = { ...draft, [field]: value };
    if (field === 'countryCode') nextDraft.city = getCitiesForCountry(value)[0] ?? '';
    setDraft(nextDraft);
  };

  return (
    <div style={S.onboardingWrap}>
      <div style={S.onboardingCard}>
        <div style={{ ...S.agencyAvatar, width: 58, height: 58, background: draft.color, marginBottom: 8, fontSize: 26 }}>
          {draft.emblem ?? '⚡'}
        </div>
        <div style={S.el}>NOUVELLE CARRIERE</div>
        <h1 style={{ ...S.eh, marginBottom: 8 }}>Crée ton agence</h1>
        <p style={S.onboardingText}>Choisis ton identité. Tu pourras tout modifier plus tard dans l'onglet Agence.</p>
        <div style={S.formGrid}>
          <label style={S.fieldLabel}>
            Nom agence
            <input value={draft.name} onChange={(event) => update('name', event.target.value)} style={S.textInput} maxLength={28} />
          </label>
          <label style={S.fieldLabel}>
            Directeur
            <input value={draft.ownerName} onChange={(event) => update('ownerName', event.target.value)} style={S.textInput} maxLength={28} />
          </label>
          <label style={S.fieldLabel}>
            Pays
            <select value={draft.countryCode} onChange={(event) => update('countryCode', event.target.value)} style={S.textInput}>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>{country.flag} {country.label}</option>
              ))}
            </select>
          </label>
          <label style={S.fieldLabel}>
            Ville
            <select value={draft.city} onChange={(event) => update('city', event.target.value)} style={S.textInput}>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
          <label style={S.fieldLabel}>
            Couleur
            <input type="color" value={draft.color} onChange={(event) => update('color', event.target.value)} style={S.colorInput} />
          </label>
          <div style={S.fieldLabel}>
            Emblème
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {EMBLEMS.map((em) => (
                <button
                  key={em}
                  onClick={() => update('emblem', em)}
                  style={{ fontSize: 22, background: (draft.emblem ?? '⚡') === em ? draft.color : '#f0f4f8', border: `2px solid ${(draft.emblem ?? '⚡') === em ? draft.color : '#e5eaf0'}`, borderRadius: 8, width: 40, height: 40, cursor: 'pointer', transition: 'all .15s' }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <label style={S.fieldLabel}>
            Positionnement
            <select value={draft.style} onChange={(event) => update('style', event.target.value)} style={S.textInput}>
              {agencyStyles.map((style) => (
                <option key={style.value} value={style.value}>{style.label}</option>
              ))}
            </select>
          </label>
          <label style={S.fieldLabel}>
            Difficulté
            <select value={draft.difficulty ?? 'realiste'} onChange={(event) => update('difficulty', event.target.value)} style={S.textInput}>
              {Object.entries(DIFFICULTIES).map(([key, difficulty]) => (
                <option key={key} value={key}>{difficulty.label}</option>
              ))}
            </select>
          </label>
          <label style={S.fieldLabel}>
            Profil départ
            <select value={draft.startProfile ?? 'ancien_joueur'} onChange={(event) => update('startProfile', event.target.value)} style={S.textInput}>
              {Object.entries(STARTING_PROFILES).map(([key, startProfile]) => (
                <option key={key} value={key}>{startProfile.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={S.cardList}>
          {agencyStyles.map((style) => (
            <button
              key={style.value}
              onClick={() => update('style', style.value)}
              style={{ ...S.choiceBtn, borderColor: draft.style === style.value ? '#00a676' : '#e5eaf0' }}
            >
              <div>
                <div style={S.chLabel}>{style.label}</div>
                <div style={S.chDesc}>{style.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ ...S.cardList, marginTop: 10 }}>
          {Object.entries(STARTING_PROFILES).map(([key, startProfile]) => (
            <button
              key={key}
              onClick={() => update('startProfile', key)}
              style={{ ...S.choiceBtn, borderColor: (draft.startProfile ?? 'ancien_joueur') === key ? '#00a676' : '#e5eaf0' }}
            >
              <div>
                <div style={S.chLabel}>{startProfile.label}</div>
                <div style={S.chDesc}>{startProfile.description}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => onComplete({ ...draft, onboarded: true })} style={{ ...S.primaryBtn, marginTop: 16 }}>
          LANCER L'AGENCE
        </button>
      </div>
    </div>
  );
}
