import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, CircleDot, MapPin, Shield, Sparkles, Trophy } from 'lucide-react';
import { COUNTRIES, getCitiesForCountry } from '../data/clubs';
import { DIFFICULTIES, STARTING_PROFILES } from '../systems/agencyReputationSystem';
import { AGENCY_LOGOS, DEFAULT_LOGO, getAgencyLogo } from '../utils/agencyLogos';
import { t } from '../utils/i18n';

const STEPS = [
  { id: 1, label: 'Identité',       desc: 'Nom, base, embleme' },
  { id: 2, label: 'Positionnement', desc: 'Style et difficulté' },
  { id: 3, label: 'Validation',     desc: 'Tu valides ?' },
];

const COLOR_SWATCHES = ['#21d07a', '#2563eb', '#ef4444', '#f59e0b', '#a855f7', '#0ea5e9', '#ec4899', '#14b8a6'];

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <span style={{ color: 'var(--af-muted)', fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase' }}>{t(label)}</span>
      {children}
      {hint && <span style={{ color: 'var(--af-dim)', fontSize: 11 }}>{t(hint)}</span>}
    </label>
  );
}

const inputStyle = {
  width: '100%',
  border: '1px solid var(--af-border)',
  background: 'oklch(15% 0.03 258 / .92)',
  color: 'var(--af-text)',
  borderRadius: 12,
  padding: '14px 14px',
  outline: 'none',
  fontSize: 15,
  fontWeight: 700,
  minWidth: 0,
};

function LogoTile({ logo, active, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 14,
        padding: 8,
        cursor: 'pointer',
        background: active
          ? `radial-gradient(circle at 30% 20%, ${color}55, oklch(13% 0.03 258 / .94))`
          : 'oklch(20% 0.035 252 / .8)',
        border: active ? `2px solid ${color}` : '1px solid var(--af-border)',
        boxShadow: active ? `0 14px 32px ${color}40` : 'none',
        display: 'grid',
        placeItems: 'center',
        transition: 'all .18s ease',
      }}
    >
      <img src={logo.src} alt={logo.label} style={{ width: '78%', height: '78%', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.4))' }} />
      {active && (
        <span style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: color, display: 'grid', placeItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,.35)' }}>
          <Check size={13} color="#0a1320" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function StepIdentity({ draft, update }) {
  const cities = useMemo(() => getCitiesForCountry(draft.countryCode), [draft.countryCode]);
  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
        <Field label="Nom de l'agence">
          <input value={draft.name} onChange={(e) => update('name', e.target.value)} style={inputStyle} maxLength={28} placeholder="Agent FC" />
        </Field>
        <Field label="Ton prénom">
          <input value={draft.ownerName} onChange={(e) => update('ownerName', e.target.value)} style={inputStyle} maxLength={28} placeholder="Alex" />
        </Field>
        <Field label="Pays">
          <select value={draft.countryCode} onChange={(e) => update('countryCode', e.target.value)} style={inputStyle}>
            {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{t(country.label)}</option>)}
          </select>
        </Field>
        <Field label="Ville">
          <select value={draft.city} onChange={(e) => update('city', e.target.value)} style={inputStyle}>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Embleme de l'agence" hint="Choisis le badge qui apparaitra partout dans ta carrière.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {AGENCY_LOGOS.map((logo) => (
            <LogoTile
              key={logo.id}
              logo={logo}
              color={draft.color || '#21d07a'}
              active={(draft.emblem ?? DEFAULT_LOGO.id) === logo.id}
              onClick={() => {
                update('emblem', logo.id);
                update('emblemSrc', logo.src);
              }}
            />
          ))}
        </div>
      </Field>

      <Field label="Couleur signature">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => update('color', swatch)}
              aria-label={swatch}
              style={{
                width: 38, height: 38, borderRadius: 12, cursor: 'pointer',
                background: swatch,
                border: draft.color === swatch ? '3px solid var(--af-text)' : '2px solid oklch(30% 0.035 252)',
                boxShadow: draft.color === swatch ? `0 8px 22px ${swatch}66` : 'none',
              }}
            />
          ))}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 10px', borderRadius: 12, background: 'oklch(22% 0.035 252 / .8)', border: '1px solid var(--af-border)', cursor: 'pointer' }}>
            <input type="color" value={draft.color || '#21d07a'} onChange={(e) => update('color', e.target.value)} style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }} />
            <span style={{ color: 'var(--af-muted)', fontSize: 12, fontWeight: 800 }}>{t('Personnalisée')}</span>
          </label>
        </div>
      </Field>
    </div>
  );
}

function StepStyle({ draft, update }) {
  const styles = [
    { value: 'equilibre', icon: Shield,    label: 'Gestion équilibrée', desc: 'Progression saine, relations stables, moins de risques.' },
    { value: 'business',  icon: Sparkles,  label: 'Business agressif',  desc: 'Plus fort sur les deals et les opportunités rapides.' },
    { value: 'formation', icon: Trophy,    label: 'Développement jeunes', desc: 'Meilleure lecture du potentiel, progression long terme.' },
    { value: 'prestige',  icon: MapPin,    label: 'Image premium',      desc: 'Plus solide face aux médias, sponsors et gros clubs.' },
  ];

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gap: 12 }}>
        {styles.map(({ value, icon: Icon, label, desc }) => {
          const active = draft.style === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => update('style', value)}
              style={{
                borderRadius: 14,
                border: active ? '2px solid var(--af-grass)' : '1px solid var(--af-border)',
                background: active ? 'oklch(70% 0.19 155 / .14)' : 'oklch(20% 0.035 252 / .8)',
                padding: '16px 18px',
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: '40px 1fr 22px',
                gap: 14,
                alignItems: 'center',
                textAlign: 'left',
              }}
            >
              <span style={{ width: 40, height: 40, borderRadius: 12, background: active ? 'var(--af-grass)' : 'oklch(28% 0.035 252)', display: 'grid', placeItems: 'center' }}>
                <Icon size={20} color={active ? '#0a1320' : 'var(--af-text)'} />
              </span>
              <span>
                <div style={{ color: 'var(--af-text)', fontSize: 16, fontWeight: 950 }}>{t(label)}</div>
                <div style={{ color: 'var(--af-muted)', fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>{t(desc)}</div>
              </span>
              {active ? <Check size={20} color="var(--af-grass)" /> : <CircleDot size={18} color="var(--af-dim)" />}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
        <Field label="Profil de départ">
          <select value={draft.startProfile ?? 'ancien_joueur'} onChange={(e) => update('startProfile', e.target.value)} style={inputStyle}>
            {Object.entries(STARTING_PROFILES).map(([key, profile]) => <option key={key} value={key}>{t(profile.label)}</option>)}
          </select>
        </Field>
        <Field label="Difficulté">
          <select value={draft.difficulty ?? 'realiste'} onChange={(e) => update('difficulty', e.target.value)} style={inputStyle}>
            {Object.entries(DIFFICULTIES).map(([key, difficulty]) => <option key={key} value={key}>{t(difficulty.label)}</option>)}
          </select>
        </Field>
      </div>
    </div>
  );
}

function StepConfirm({ draft }) {
  const rows = [
    ['Agence', draft.name || t('Sans nom')],
    ['Directeur', draft.ownerName ? t(draft.ownerName) : '—'],
    ['Base', `${draft.city || '—'} · ${draft.countryCode || ''}`],
    ['Positionnement', t({
      equilibre: 'Gestion équilibrée',
      business: 'Business agressif',
      formation: 'Développement jeunes',
      prestige: 'Image premium',
    }[draft.style] ?? 'Gestion équilibrée')],
    ['Profil', t(STARTING_PROFILES[draft.startProfile ?? 'ancien_joueur']?.label ?? '—')],
    ['Difficulté', t(DIFFICULTIES[draft.difficulty ?? 'realiste']?.label ?? '—')],
  ];
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="af-soft" style={{ padding: 18, display: 'grid', gap: 10 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 8, borderBottom: '1px solid var(--af-border)' }}>
            <span style={{ color: 'var(--af-muted)', fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>{t(k)}</span>
            <strong style={{ color: 'var(--af-text)', fontSize: 14, textAlign: 'right' }}>{v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressRail({ step }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {STEPS.map((s) => {
          const active = s.id <= step;
          return (
            <div key={s.id} style={{ flex: 1, height: 6, borderRadius: 999, background: active ? 'linear-gradient(90deg, var(--af-grass-2), var(--af-grass))' : 'oklch(30% 0.03 252)' }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--af-muted)', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' }}>
        <span style={{ color: 'var(--af-grass)' }}>{t('Étape')} {step}/3 · {t(STEPS[step - 1].label)}</span>
        <span>{t(STEPS[step - 1].desc)}</span>
      </div>
    </div>
  );
}

export default function Onboarding({ profile, onComplete }) {
  const initialEmblem = AGENCY_LOGOS.some((logo) => logo.id === profile?.emblem) ? profile.emblem : DEFAULT_LOGO.id;
  const initialOwnerName = profile?.ownerName === 'Directeur sportif' ? t('Directeur sportif') : profile?.ownerName ?? '';
  const [draft, setDraft] = useState({
    name: profile?.name ?? 'Agent FC',
    ownerName: initialOwnerName,
    countryCode: profile?.countryCode ?? COUNTRIES[0].code,
    city: profile?.city ?? getCitiesForCountry(profile?.countryCode ?? COUNTRIES[0].code)[0],
    color: profile?.color ?? '#21d07a',
    emblem: initialEmblem,
    emblemSrc: profile?.emblemSrc ?? getAgencyLogo(initialEmblem).src,
    style: profile?.style ?? 'equilibre',
    startProfile: profile?.startProfile ?? 'ancien_joueur',
    difficulty: profile?.difficulty ?? 'realiste',
  });
  const [step, setStep] = useState(1);

  const update = (key, value) => setDraft((prev) => {
    const next = { ...prev, [key]: value };
    if (key === 'countryCode') next.city = getCitiesForCountry(value)[0];
    if (key === 'emblem') next.emblemSrc = getAgencyLogo(value).src;
    return next;
  });

  const canAdvance =
    step === 1 ? Boolean(draft.name?.trim() && draft.ownerName?.trim() && draft.city) :
    step === 2 ? Boolean(draft.style && draft.startProfile && draft.difficulty) :
    true;

  const advance = () => {
    if (!canAdvance) return;
    if (step < 3) setStep(step + 1);
    else onComplete({ ...draft, onboarded: true });
  };

  const selectedLogo = getAgencyLogo(draft.emblem);

  return (
    <div style={{
      width: '100%',
      height: '100dvh',
      maxHeight: '100dvh',
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      padding: 'calc(20px + var(--agent-safe-top, 0px)) 16px calc(28px + env(safe-area-inset-bottom, 0px))',
      background: 'var(--af-gradient-hero)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 1080,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: 22,
        minWidth: 0,
      }}>
        {/* Hero / preview */}
        <aside className="af-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 80% 20%, ${draft.color}33, transparent 55%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div className="af-kicker">{t("Carrière d'agent")}</div>
            <h1 className="af-title" style={{ marginTop: 6 }}>{t('Crée ton agence.')}</h1>
            <p className="af-subtitle">{t("Identité forte, choix lisibles. C'est ton bureau, ta marque, tes joueurs.")}</p>
          </div>
          <div style={{ position: 'relative', display: 'grid', placeItems: 'center', padding: '20px 0' }}>
            <div className="af-logo-disc" style={{
              width: 200,
              height: 200,
              background: `linear-gradient(160deg, ${draft.color}, oklch(15% 0.03 258))`,
              boxShadow: `0 30px 80px ${draft.color}40`,
            }}>
              <img src={selectedLogo.src} alt={selectedLogo.label} />
            </div>
          </div>
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ color: 'var(--af-muted)', fontSize: 11, fontWeight: 900, letterSpacing: '.2em', textTransform: 'uppercase' }}>{t('Aperçu')}</div>
            <div style={{ color: 'var(--af-text)', fontSize: 28, fontWeight: 950, marginTop: 8, letterSpacing: '-.03em', overflowWrap: 'anywhere' }}>{draft.name || t('Ton agence')}</div>
            <div style={{ color: 'var(--af-muted)', fontSize: 13, marginTop: 6 }}>{draft.city || t('Ville')} · {t('Dirigée par')} {draft.ownerName ? t(draft.ownerName) : t('toi')}</div>
          </div>
        </aside>

        {/* Form */}
        <main className="af-panel" style={{ padding: 26, minWidth: 0, display: 'grid', gap: 22 }}>
          <ProgressRail step={step} />
          {step === 1 && <StepIdentity draft={draft} update={update} />}
          {step === 2 && <StepStyle draft={draft} update={update} />}
          {step === 3 && <StepConfirm draft={draft} />}

          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            {step > 1 && (
              <button type="button" onClick={() => setStep((value) => value - 1)} className="af-btn-secondary" style={{ padding: '14px 18px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ArrowLeft size={16} />
                {t('Retour')}
              </button>
            )}
            <button type="button" disabled={!canAdvance} onClick={advance} className="af-btn-primary" style={{ flex: 1, padding: '16px 18px', opacity: canAdvance ? 1 : .45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14 }}>
              {step === 3 ? t('Lancer ma carrière') : t('Continuer')}
              <ChevronRight size={18} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
