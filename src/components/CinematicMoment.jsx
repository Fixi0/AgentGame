import React, { useEffect } from 'react';

/**
 * Cinematic full-screen moment overlay.
 * props: { moment: { kind, title, subtitle, accent, emoji }, onClose }
 */
export default function CinematicMoment({ moment, onClose }) {
  useEffect(() => {
    if (!moment) return;
    const t = setTimeout(() => onClose?.(), 5200);
    return () => clearTimeout(t);
  }, [moment, onClose]);

  if (!moment) return null;
  const accent = moment.accent ?? '#fbbf24';
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `radial-gradient(circle at 50% 40%, ${accent}33 0%, rgba(5,8,14,.96) 60%, #000 100%)`,
        display: 'grid', placeItems: 'center', cursor: 'pointer',
        animation: 'af-cine-fade-in .4s ease-out',
        backdropFilter: 'blur(4px)',
      }}
    >
      <style>{`
        @keyframes af-cine-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes af-cine-pop { 0% { transform: scale(.4) rotate(-6deg); opacity: 0 } 60% { transform: scale(1.12) rotate(2deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
        @keyframes af-cine-shine { 0% { transform: translateX(-120%) skewX(-20deg) } 100% { transform: translateX(220%) skewX(-20deg) } }
        @keyframes af-cine-particle { 0% { transform: translate(0,0) scale(1); opacity: 1 } 100% { transform: translate(var(--tx),var(--ty)) scale(0); opacity: 0 } }
        @keyframes af-cine-rays { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.2, animation: 'af-cine-rays 24s linear infinite' }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 2, height: '120vmax',
            background: `linear-gradient(to bottom, transparent, ${accent}aa, transparent)`,
            transform: `translate(-50%, -50%) rotate(${(i / 16) * 360}deg)`,
          }} />
        ))}
      </div>
      {Array.from({ length: 28 }).map((_, i) => {
        const a = (i / 28) * Math.PI * 2;
        const dist = 200 + Math.random() * 300;
        return (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 8, height: 8, borderRadius: '50%',
            background: i % 2 ? accent : '#fff',
            boxShadow: `0 0 12px ${accent}`,
            '--tx': `${Math.cos(a) * dist}px`,
            '--ty': `${Math.sin(a) * dist}px`,
            animation: `af-cine-particle 2.6s ease-out ${i * 0.04}s infinite`,
          }} />
        );
      })}
      <div style={{
        position: 'relative', textAlign: 'center', padding: '40px 28px',
        animation: 'af-cine-pop .9s cubic-bezier(.2,1.6,.4,1) both',
        maxWidth: 560,
      }}>
        <div style={{
          fontSize: 96, marginBottom: 14, filter: `drop-shadow(0 12px 28px ${accent})`,
        }}>{moment.emoji ?? '🏆'}</div>
        <div style={{
          fontSize: 11, letterSpacing: '.4em', fontWeight: 900,
          color: accent, marginBottom: 10, textTransform: 'uppercase',
        }}>{moment.kind ?? 'Moment légendaire'}</div>
        <h1 style={{
          fontSize: 38, fontWeight: 950, color: '#fff', lineHeight: 1.05,
          letterSpacing: '-.02em', margin: 0,
          textShadow: `0 4px 24px ${accent}66`,
        }}>{moment.title}</h1>
        {moment.subtitle && (
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', marginTop: 14, fontFamily: 'system-ui,sans-serif' }}>
            {moment.subtitle}
          </div>
        )}
        <div style={{
          marginTop: 26,
          fontSize: 10, letterSpacing: '.3em', color: 'rgba(255,255,255,.55)',
        }}>TAP POUR CONTINUER</div>
        <div style={{
          position: 'absolute', inset: -10, pointerEvents: 'none', overflow: 'hidden', borderRadius: 18,
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '40%',
            background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
            animation: 'af-cine-shine 1.8s ease-in-out 0.4s infinite',
          }} />
        </div>
      </div>
    </div>
  );
}
