import React, { useMemo, useState } from 'react';
import { CheckCircle, Target, X } from 'lucide-react';
import { CLUBS, getCountry } from '../../data/clubs';
import { S } from '../styles';

const getEligibleBuyerTiers = (player) => {
  if (player.rating >= 84 || player.potential >= 90) return [1, 2];
  if (player.rating >= 77 || player.potential >= 85) return [2, 3];
  if (player.rating >= 68 || player.potential >= 79) return [3, 4];
  return [4];
};

export default function ShortlistModal({ player, onConfirm, onClose }) {
  const [selected, setSelected] = useState([]);

  const suggestions = useMemo(() => {
    const tiers = getEligibleBuyerTiers(player);
    return CLUBS
      .filter((club) => club.name !== player.club)
      .filter((club) => tiers.includes(club.tier))
      .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [player]);

  const toggleClub = (club) => {
    setSelected((current) => {
      if (current.some((item) => item.name === club.name)) return current.filter((item) => item.name !== club.name);
      if (current.length >= 2) return current;
      return [...current, club];
    });
  };

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <Target size={16} color="#00a676" />
          <span>SHORTLIST MERCATO</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>
          <h2 style={S.mTitle}>{player.firstName} {player.lastName}</h2>
          <div style={S.mPlayer}>{player.clubCountry} {player.club} · {player.rating}/100</div>
          <p style={S.mText}>Choisis 1 ou 2 clubs à cibler. Le joueur réagit ensuite selon le niveau du projet.</p>

          <div style={S.swipeHint}>
            Sélection actuelle: {selected.length}/2 {selected.length === 0 ? 'club' : 'clubs'}
          </div>

          <div style={S.cardList}>
            {suggestions.map((club) => {
              const country = getCountry(club.countryCode);
              const active = selected.some((item) => item.name === club.name);
              return (
                <button
                  key={club.name}
                  onClick={() => toggleClub(club)}
                  style={{
                    ...S.quickCard,
                    textAlign: 'left',
                    border: active ? '1px solid #00a676' : '1px solid #e5eaf0',
                    boxShadow: active ? '0 14px 32px rgba(0,166,118,.14)' : '0 10px 24px rgba(15,23,32,.06)',
                    background: active ? '#f0fdf8' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{country.flag}</div>
                      <div style={S.qLabel}>{club.name}</div>
                      <div style={S.qSub}>{club.city} · Tier {club.tier}</div>
                    </div>
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      border: `1px solid ${active ? '#00a676' : '#d6dde3'}`,
                      background: active ? '#00a676' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}>
                      {active && <CheckCircle size={14} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            style={{
              ...S.primaryBtn,
              marginTop: 14,
              opacity: selected.length > 0 ? 1 : 0.45,
              cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            VALIDER LA SHORTLIST
          </button>
          <button onClick={onClose} style={S.secBtn}>ANNULER</button>
        </div>
      </div>
    </div>
  );
}
