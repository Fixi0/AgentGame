import React, { useMemo, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, Check, ChevronRight, CircleDot, MapPin, Shield } from 'lucide-react';
import { COUNTRIES, getCitiesForCountry } from '../data/clubs';
import { DIFFICULTIES, STARTING_PROFILES } from '../systems/agencyReputationSystem';
import { assetPath } from '../utils/assets';

const EMBLEMS = [
  { id: 'local', label: 'Local', src: assetPath('tycoon-assets/badge_local.png') },
  { id: 'national', label: 'National', src: assetPath('tycoon-assets/badge_national.png') },
  { id: 'international', label: 'International', src: assetPath('tycoon-assets/badge_international.png') },
  { id: 'elite', label: 'Elite', src: assetPath('tycoon-assets/badge_elite.png') },
  { id: 'legend', label: 'Légende', src: assetPath('tycoon-assets/badge_legende.png') },
  { id: 'shield', label: 'Agence', src: assetPath('tycoon-assets/reputation_shield.png') },
];

const STEPS = [
  'Identité',
  'Positionnement',
  'Validation',
];

function StepHeader({ step }) {
  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {STEPS.map((label, index) => {
          const active = index + 1 <= step;
          return (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ height: 5, borderRadius: 999, background: active ? 'var(--af-grass)' : 'oklch(36% 0.035 252)' }} />
              <div style={{ marginTop: 6, color: active ? 'var(--af-text)' : 'var(--af-dim)', fontSize: 9, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 7 }}>
      <span style={{ color: 'var(--af-muted)', fontSize: 10, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%',
  border: '1px solid var(--af-border)',
  background: 'oklch(17% 0.035 258 / .92)',
  color: 'var(--af-text)',
  borderRadius: 8,
  padding: '13px 12px',
  outline: 'none',
  fontSize: 15,
  fontWeight: 750,
};

function EmblemButton({ emblem, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="af-glass"
      style={{
        borderRadius: 8,
        padding: 12,
        borderColor: active ? 'var(--af-grass)' : 'var(--af-border)',
        boxShadow: active ? '0 0 0 1px var(--af-grass), 0 18px 40px oklch(70% 0.19 155 / .18)' : 'none',
        cursor: 'pointer',
        minHeight: 104,
      }}
    >
      <img src={emblem.src} alt="" style={{ width: 46, height: 46, objectFit: 'contain', display: 'block', margin: '0 auto 10px' }} />
      <div style={{ color: 'var(--af-text)', fontSize: 11, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase' }}>{emblem.label}</div>
    </button>
  );
}

function StepIdentity({ draft, update }) {
  const cities = useMemo(() => getCitiesForCountry(draft.countryCode), [draft.countryCode]);
  const selected = EMBLEMS.find((emblem) => emblem.id === draft.emblem) ?? EMBLEMS[0];

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="af-glass" style={{ borderRadius: 8, padding: 16, display: 'grid', gridTemplateColumns: '82px 1fr', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 82, height: 82, borderRadius: 8, display: 'grid', placeItems: 'center', background: draft.color || 'var(--af-grass)', boxShadow: '0 18px 42px rgba(0,0,0,.3)' }}>
          <img src={selected.src} alt="" style={{ width: 58, height: 58, objectFit: 'contain' }} />
        </div>
        <div>
          <div className="af-kicker">Nouvelle carrière</div>
          <h1 className="af-title" style={{ fontSize: 38 }}>{draft.name || 'Ton agence'}</h1>
          <div style={{ color: 'var(--af-muted)', marginTop: 8, fontSize: 13 }}>{draft.city || 'Ville'} · Directeur sportif {draft.ownerName || ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 }}>
        <Field label="Nom de l'agence">
          <input value={draft.name} onChange={(e) => update('name', e.target.value)} style={inputStyle} maxLength={28} placeholder="Agent FC" />
        </Field>
        <Field label="Ton prénom">
          <input value={draft.ownerName} onChange={(e) => update('ownerName', e.target.value)} style={inputStyle} maxLength={28} placeholder="Alex" />
        </Field>
        <Field label="Pays">
          <select value={draft.countryCode} onChange={(e) => update('countryCode', e.target.value)} style={inputStyle}>
            {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
          </select>
        </Field>
        <Field label="Ville">
          <select value={draft.city} onChange={(e) => update('city', e.target.value)} style={inputStyle}>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Emblème de l'agence">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 10 }}>
          {EMBLEMS.map((emblem) => (
            <EmblemButton
              key={emblem.id}
              emblem={emblem}
              active={(draft.emblem ?? 'local') === emblem.id}
              onClick={() => {
                update('emblem', emblem.id);
                update('emblemSrc', emblem.src);
              }}
            />
          ))}
        </div>
      </Field>

      <Field label="Couleur signature">
        <input type="color" value={draft.color || '#21d07a'} onChange={(e) => update('color', e.target.value)} style={{ ...inputStyle, height: 48, padding: 6 }} />
      </Field>
    </div>
  );
}

function StepStyle({ draft, update }) {
  const agencyStyles = [
    { value: 'equilibre', label: 'Gestion équilibrée', desc: 'Progression saine, relations stables, moins de risques.' },
    { value: 'business', label: 'Business agressif', desc: 'Plus fort sur les deals et les opportunités rapides.' },
    { value: 'formation', label: 'Développement jeunes', desc: 'Meilleure lecture du potentiel et progression long terme.' },
    { value: 'prestige', label: 'Image premium', desc: 'Plus solide face aux médias, sponsors et gros clubs.' },
  ];

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        {agencyStyles.map((style) => {
          const active = draft.style === style.value;
          return (
            <button key={style.value} type="button" onClick={() => update('style', style.value)} className="af-glass" style={{ borderRadius: 8, borderColor: active ? 'var(--af-grass)' : 'var(--af-border)', padding: 15, cursor: 'pointer', display: 'grid', gridTemplateColumns: '28px 1fr 24px', gap: 12, alignItems: 'center', textAlign: 'left' }}>
              <CircleDot size={20} color={active ? 'var(--af-grass)' : 'var(--af-dim)'} />
              <div>
                <div style={{ color: 'var(--af-text)', fontSize: 15, fontWeight: 950 }}>{style.label}</div>
                <div style={{ color: 'var(--af-muted)', fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>{style.desc}</div>
              </div>
              {active && <Check size={20} color="var(--af-grass)" />}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 }}>
        <Field label="Profil de départ">
          <select value={draft.startProfile ?? 'ancien_joueur'} onChange={(e) => update('startProfile', e.target.value)} style={inputStyle}>
            {Object.entries(STARTING_PROFILES).map(([key, profile]) => <option key={key} value={key}>{profile.label}</option>)}
          </select>
        </Field>
        <Field label="Difficulté">
          <select value={draft.difficulty ?? 'realiste'} onChange={(e) => update('difficulty', e.target.value)} style={inputStyle}>
            {Object.entries(DIFFICULTIES).map(([key, difficulty]) => <option key={key} value={key}>{difficulty.label}</option>)}
          </select>
        </Field>
      </div>
    </div>
  );
}

function StepConfirm({ draft }) {
  const selected = EMBLEMS.find((emblem) => emblem.id === draft.emblem) ?? EMBLEMS[0];
  const rows = [
    ['Agence', draft.name],
    ['Directeur', draft.ownerName],
    ['Base', `${draft.city} · ${draft.countryCode}`],
    ['Positionnement', draft.style ?? 'equilibre'],
    ['Profil', draft.startProfile ?? 'ancien_joueur'],
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ textAlign: 'center', padding: '18px 12px' }}>
        <div style={{ width: 96, height: 96, borderRadius: 8, margin: '0 auto 14px', display: 'grid', placeItems: 'center', background: draft.color || 'var(--af-grass)', boxShadow: '0 22px 60px rgba(0,0,0,.38)' }}>
          <img src={selected.src} alt="" style={{ width: 68, height: 68, objectFit: 'contain' }} />
        </div>
        <h2 style={{ margin: 0, color: 'var(--af-text)', fontSize: 36, lineHeight: .95, letterSpacing: '-.04em' }}>{draft.name}</h2>
        <p style={{ margin: '10px auto 0', maxWidth: 420, color: 'var(--af-muted)', lineHeight: 1.55 }}>
          Le bureau est prêt. Tu vas commencer bas, avec peu de réseau, et construire la réputation dossier après dossier.
        </p>
      </div>
      <div className="af-glass" style={{ borderRadius: 8, padding: 14, display: 'grid', gap: 1 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--af-border)' }}>
            <span style={{ color: 'var(--af-muted)', fontSize: 12 }}>{label}</span>
            <strong style={{ color: 'var(--af-text)', fontSize: 13 }}>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Onboarding({ profile, onComplete }) {
  const initialEmblem = profile?.emblemSrc
    ? profile.emblem
    : (EMBLEMS.some((emblem) => emblem.id === profile?.emblem) ? profile.emblem : 'local');
  const [draft, setDraft] = useState({
    ...profile,
    emblem: initialEmblem,
    emblemSrc: profile?.emblemSrc ?? EMBLEMS.find((emblem) => emblem.id === initialEmblem)?.src ?? EMBLEMS[0].src,
    color: profile?.color ?? '#21d07a',
  });
  const [step, setStep] = useState(1);

  const update = (field, value) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'countryCode') next.city = getCitiesForCountry(value)[0] ?? '';
      return next;
    });
  };

  const canAdvance = step === 1 ? draft.name?.trim().length >= 2 && draft.ownerName?.trim().length >= 1 : true;
  const advance = () => {
    if (!canAdvance) return;
    if (step < 3) setStep((value) => value + 1);
    else onComplete({ ...draft, onboarded: true });
  };

  return (
    <div style={{
      minHeight: '100dvh',
      padding: 'calc(22px + var(--agent-safe-top, 0px)) 16px 28px',
      background: 'radial-gradient(circle at 20% 0%, oklch(40% 0.12 245 / .6), transparent 34%), radial-gradient(circle at 86% 10%, oklch(72% 0.18 155 / .18), transparent 32%), var(--af-bg)',
      display: 'grid',
      alignItems: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
        <aside className="af-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 520 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Shield size={24} color="var(--af-grass)" />
              <div>
                <div className="af-kicker">Agent Foot</div>
                <div style={{ color: 'var(--af-text)', fontWeight: 950, fontSize: 18 }}>Créer une carrière</div>
              </div>
            </div>
            <h1 className="af-title">Monte ton bureau.</h1>
            <p style={{ color: 'var(--af-muted)', lineHeight: 1.55, marginTop: 16 }}>
              Une agence, quelques contacts, beaucoup de flair. Chaque choix construit ta réputation.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              [BriefcaseBusiness, 'Contrats', 'Sécurise les carrières'],
              [MapPin, 'Réseau local', 'Commence près de ton marché'],
              [Shield, 'Réputation', 'Grandis sans brûler les étapes'],
            ].map(([Icon, title, desc]) => (
              <div key={title} className="af-glass" style={{ borderRadius: 8, padding: 12, display: 'flex', gap: 10 }}>
                <Icon size={18} color="var(--af-grass)" />
                <div>
                  <div style={{ color: 'var(--af-text)', fontWeight: 900, fontSize: 13 }}>{title}</div>
                  <div style={{ color: 'var(--af-dim)', fontSize: 11, marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="af-panel" style={{ padding: 18, minHeight: 520 }}>
          <div className="af-kicker">Étape {step}/3</div>
          <StepHeader step={step} />
          {step === 1 && <StepIdentity draft={draft} update={update} />}
          {step === 2 && <StepStyle draft={draft} update={update} />}
          {step === 3 && <StepConfirm draft={draft} />}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {step > 1 && (
              <button type="button" onClick={() => setStep((value) => value - 1)} className="af-btn-secondary" style={{ padding: '13px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ArrowLeft size={16} />
                Retour
              </button>
            )}
            <button type="button" disabled={!canAdvance} onClick={advance} className="af-btn-primary" style={{ flex: 1, padding: '14px 16px', opacity: canAdvance ? 1 : .45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {step === 3 ? 'Lancer mon agence' : 'Continuer'}
              <ChevronRight size={17} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
