import React from 'react';
import { X, Star, AlertCircle, CheckCircle } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { S } from '../styles';

function WindowBadge({ window: win }) {
  const map = {
    summer:  { label: 'ÉTÉ',     bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    winter:  { label: 'HIVER',    bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
    free:    { label: 'LIBRE',    bg: '#f0fdf8', color: '#00a676', border: '#b6f0da' },
    unknown: { label: win?.toUpperCase() ?? '—', bg: '#f7f9fb', color: '#64727d', border: '#e5eaf0' },
  };
  const style = map[win] ?? map.unknown;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: 6,
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      fontSize: 9,
      fontWeight: 900,
      letterSpacing: '.1em',
      fontFamily: 'system-ui,sans-serif',
    }}>
      {style.label}
    </span>
  );
}

function OfferCard({ offer, isBest, onAccept, onReject }) {
  const borderColor = isBest ? '#f59e0b' : '#e5eaf0';
  const shadow = isBest
    ? '0 0 0 2px #f59e0b, 0 18px 38px rgba(245,158,11,.18)'
    : '0 14px 34px rgba(15,23,32,.08)';

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      padding: 16,
      flex: '1 1 220px',
      minWidth: 0,
      boxShadow: shadow,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {/* Best offer crown */}
      {isBest && (
        <div style={{
          position: 'absolute',
          top: -11,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#f59e0b',
          color: '#ffffff',
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: '.12em',
          fontFamily: 'system-ui,sans-serif',
          padding: '3px 10px',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
        }}>
          <Star size={9} fill="#ffffff" /> MEILLEURE OFFRE
        </div>
      )}

      {/* Club + badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, marginTop: isBest ? 4 : 0 }}>
        <div>
          <div style={{ fontSize: 18, marginBottom: 2 }}>{offer.clubCountry ?? '🌍'}</div>
          <div style={{ fontSize: 14, fontWeight: 850, color: '#172026', lineHeight: 1.2 }}>{offer.club}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {offer.preWindow && (
            <span style={{
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '.1em',
              fontFamily: 'system-ui,sans-serif',
              padding: '3px 7px',
            }}>
              PRÉ-ACCORD
            </span>
          )}
          {offer.isSurprise && (
            <span style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '.1em',
              fontFamily: 'system-ui,sans-serif',
              padding: '3px 7px',
            }}>
              URGENT 🚨
            </span>
          )}
        </div>
      </div>

      {/* Player name */}
      <div style={{ fontSize: 11, color: '#00a676', fontFamily: 'system-ui,sans-serif', fontWeight: 800, letterSpacing: '.06em', marginBottom: 10 }}>
        {offer.playerName ?? '—'}
      </div>

      {/* Stats */}
      <div style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 8, padding: '2px 12px', marginBottom: 12 }}>
        <div style={{ ...S.sumRow, borderBottom: '1px solid #eef2f5' }}>
          <span style={S.sumK}>Prix de transfert</span>
          <span style={{ fontWeight: 800, color: '#172026', fontSize: 14 }}>{formatMoney(offer.price ?? 0)}</span>
        </div>
        <div style={{ ...S.sumRow, borderBottom: '1px solid #eef2f5' }}>
          <span style={S.sumK}>Salaire</span>
          <span style={{ fontWeight: 700, color: '#172026', fontSize: 13 }}>×{(offer.salMult ?? 1).toFixed(1)}</span>
        </div>
        <div style={{ ...S.sumRow, borderBottom: '1px solid #eef2f5' }}>
          <span style={S.sumK}>Fenêtre</span>
          <WindowBadge window={offer.window} />
        </div>
        <div style={{ ...S.sumRow, borderBottom: 'none' }}>
          <span style={S.sumK}>Expire sem.</span>
          <span style={{ fontWeight: 700, color: (offer.expiresWeek ?? 999) < 5 ? '#dc2626' : '#172026', fontSize: 13 }}>
            {offer.expiresWeek ?? '—'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 7, marginTop: 'auto' }}>
        <button
          onClick={() => onAccept(offer)}
          style={{
            flex: 1,
            background: 'linear-gradient(135deg,#00a676,#20c997)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 8px',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '.1em',
            fontFamily: 'system-ui,sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            boxShadow: '0 10px 24px rgba(0,166,118,.28)',
          }}
        >
          <CheckCircle size={12} /> ACCEPTER
        </button>
        <button
          onClick={() => onReject(offer)}
          style={{
            flex: 1,
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: '10px 8px',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '.1em',
            fontFamily: 'system-ui,sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}
        >
          <X size={12} /> REFUSER
        </button>
      </div>
    </div>
  );
}

export default function OfferCompareModal({ offers = [], players = [], onAccept, onReject, onClose }) {
  const bestPrice = Math.max(...offers.map(o => o.price ?? 0));

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 460, width: '100%', margin: '0 auto' }}>
        {/* Header */}
        <div style={S.mHead}>
          <AlertCircle size={16} color="#00a676" />
          <span>COMPARER LES OFFRES</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>

        <div style={S.mBody}>
          {offers.length === 0 ? (
            <div style={S.empty}>Aucune offre à comparer.</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginBottom: 16, lineHeight: 1.5 }}>
                {offers.length} offre{offers.length > 1 ? 's' : ''} reçue{offers.length > 1 ? 's' : ''}. Compare les conditions avant de décider.
              </div>

              {/* Cards — horizontal scroll on mobile, flex-wrap otherwise */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 16,
              }}>
                {offers.map(offer => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    isBest={offers.length > 1 && (offer.price ?? 0) === bestPrice}
                    onAccept={onAccept}
                    onReject={onReject}
                  />
                ))}
              </div>

              <button onClick={onClose} style={{ ...S.secBtn, marginBottom: 0 }}>
                DÉCIDER PLUS TARD
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
