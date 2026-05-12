import React from 'react';
import { getTrophyMeta } from '../utils/trophyImages';

/**
 * TrophyMoment — hero card affichant un trophée pour les events distinctifs.
 * Anime confettis CSS, image en background, texte minimal en surimpression.
 */
export default function TrophyMoment({ event, playerName }) {
  const meta = getTrophyMeta({ eventId: event?.id, label: event?.label });
  if (!meta) return null;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 14,
      aspectRatio: '16 / 11',
      background: '#0a0f14',
      boxShadow: `0 18px 50px rgba(0,0,0,.55), 0 0 0 1px ${meta.accent}40, inset 0 0 60px ${meta.accent}22`,
      animation: 'trophyPop .7s cubic-bezier(.22,1.4,.36,1) both',
    }}>
      <img
        src={meta.image}
        alt=""
        loading="lazy"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          animation: 'trophyZoom 8s ease-out infinite alternate',
        }}
      />
      {/* Halo coloré */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 38%, ${meta.accent}30, transparent 55%), linear-gradient(180deg, transparent 45%, rgba(0,0,0,.85) 100%)`,
        pointerEvents: 'none',
      }} />
      {/* Confettis CSS (simples points lumineux qui défilent) */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(${meta.accent} 1.5px, transparent 2px) 0 0/30px 30px`,
        opacity: .35,
        animation: 'confettiFall 6s linear infinite',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }} />
      {/* Texte */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '14px 18px 16px',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          display: 'inline-flex', alignSelf: 'flex-start',
          fontSize: 9, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase',
          background: `${meta.accent}28`, color: meta.accent,
          padding: '3px 8px', borderRadius: 4, marginBottom: 6,
          border: `1px solid ${meta.accent}55`,
        }}>
          🏆 {meta.kind}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 950, lineHeight: 1.1,
          textShadow: '0 2px 16px rgba(0,0,0,.85)',
        }}>
          {event.label}
        </div>
        {playerName && (
          <div style={{
            fontSize: 13, fontWeight: 700, marginTop: 4, opacity: .92,
            textShadow: '0 1px 6px rgba(0,0,0,.8)',
          }}>
            {playerName}
          </div>
        )}
      </div>

      <style>{`
        @keyframes trophyPop {
          0% { opacity: 0; transform: scale(.92) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes trophyZoom {
          0% { transform: scale(1.02); }
          100% { transform: scale(1.12); }
        }
        @keyframes confettiFall {
          0% { background-position: 0 -30px; }
          100% { background-position: 0 100%; }
        }
      `}</style>
    </div>
  );
}
