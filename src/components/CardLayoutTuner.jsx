import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'af_card_layout_v1';

const DEFAULTS = {
  topY: 12,
  topX: 14,
  portraitTop: 14,
  portraitBottom: 30,
  portraitSide: 13,
  portraitWidth: 86,
  bottomY: 40,
};

const FIELDS = [
  { key: 'topY', label: 'Top infos Y', min: 0, max: 60, step: 1 },
  { key: 'topX', label: 'Top infos X', min: 0, max: 40, step: 1 },
  { key: 'portraitTop', label: 'Portrait top', min: 0, max: 40, step: 1 },
  { key: 'portraitBottom', label: 'Portrait bottom', min: 12, max: 50, step: 1 },
  { key: 'portraitSide', label: 'Portrait sides', min: 6, max: 24, step: 1 },
  { key: 'portraitWidth', label: 'Portrait width', min: 65, max: 100, step: 1 },
  { key: 'bottomY', label: 'Bas infos Y', min: 8, max: 40, step: 1 },
];

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
};

const applyVars = (values) => {
  const root = document.documentElement;
  root.style.setProperty('--af-card-top-y', `${values.topY}px`);
  root.style.setProperty('--af-card-top-x', `${values.topX}px`);
  root.style.setProperty('--af-card-portrait-top', `${values.portraitTop}%`);
  root.style.setProperty('--af-card-portrait-bottom', `${values.portraitBottom}%`);
  root.style.setProperty('--af-card-portrait-side', `${values.portraitSide}%`);
  root.style.setProperty('--af-card-portrait-width', `${values.portraitWidth}%`);
  root.style.setProperty('--af-card-bottom-y', `${values.bottomY}px`);
};

export default function CardLayoutTuner() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => readStored());

  useEffect(() => {
    applyVars(values);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }, [values]);

  const reset = () => setValues(DEFAULTS);
  const entries = useMemo(() => FIELDS, []);

  return (
    <div style={{ position: 'fixed', right: 12, top: 94, zIndex: 1200 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          border: '1px solid rgba(255,255,255,.26)',
          background: 'rgba(12,18,30,.9)',
          color: '#fff',
          borderRadius: 8,
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: '.04em',
          padding: '8px 10px',
          cursor: 'pointer',
        }}
      >
        Carte Tune
      </button>

      {open && (
        <div style={{
          marginTop: 8,
          width: 220,
          borderRadius: 10,
          background: 'rgba(8,12,20,.94)',
          border: '1px solid rgba(255,255,255,.16)',
          padding: 10,
          display: 'grid',
          gap: 8,
          color: '#fff',
        }}
        >
          {entries.map((field) => (
            <label key={field.key} style={{ display: 'grid', gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: .9 }}>{field.label}: {values[field.key]}</div>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={values[field.key]}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setValues((current) => ({ ...current, [field.key]: next }));
                }}
              />
            </label>
          ))}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 4,
              border: '1px solid rgba(255,255,255,.24)',
              background: 'transparent',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 11,
              padding: '7px 8px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
