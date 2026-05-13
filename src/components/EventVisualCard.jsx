import React from 'react';
import { getEventVisual } from '../utils/eventImages';

export default function EventVisualCard({ event, compact = false, used = null }) {
  const visual = getEventVisual(event, { used });
  if (!visual?.image) return null;

  const isGood = !!event.good;
  const accent = visual.accent || (isGood ? '#00a676' : '#b42318');
  const height = compact ? 88 : 116;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
        border: `1px solid ${accent}40`,
        boxShadow: `0 8px 22px ${accent}25`,
        background: '#0b1620',
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'relative', height, width: '100%' }}>
        <img
          src={visual.image}
          alt=""
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, rgba(7,15,24,.05) 0%, rgba(7,15,24,.55) 55%, rgba(7,15,24,.92) 100%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            padding: '3px 8px',
            borderRadius: 999,
            background: `${accent}cc`,
            color: '#fff',
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui,sans-serif',
            backdropFilter: 'blur(4px)',
          }}
        >
          {isGood ? '✦ Highlight' : '⚠ Alerte'}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 8,
            color: '#fff',
            fontFamily: 'system-ui,sans-serif',
            textShadow: '0 2px 8px rgba(0,0,0,.6)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.01em', lineHeight: 1.15 }}>
            {event.player ?? event.playerName ?? event.title ?? 'Événement'}
          </div>
          <div style={{ fontSize: 11, opacity: 0.92, marginTop: 2, lineHeight: 1.25 }}>
            {event.label ?? event.text ?? event.subject ?? ''}
            {event.match?.matchRating ? ` · note ${event.match.matchRating}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
