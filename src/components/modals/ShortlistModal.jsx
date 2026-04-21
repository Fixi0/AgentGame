import React, { useMemo, useState } from 'react';
import { CheckCircle, Target, X } from 'lucide-react';
import { CLUBS, getCountry } from '../../data/clubs';
import { getPlayerLevelText } from '../../utils/playerStars';
import { S } from '../styles';

const getEligibleBuyerTiers = (player) => {
  if (player.rating >= 168) return [1, 2];
  if (player.rating >= 154) return [2, 3];
  if (player.rating >= 136) return [3, 4];
  return [4];
};

const hashString = (value = '') => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (items, seed) => {
  const array = [...items];
  const random = createSeededRandom(seed);
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
};

const scoreClub = (club, player, state) => {
  let score = 0;
  if ((player.preferredCountries ?? []).includes(club.countryCode)) score += 8;
  if ((player.preferredCities ?? []).includes(club.city)) score += 7;
  const relation = state?.clubRelations?.[club.name] ?? 50;
  score += Math.max(0, relation - 45) / 8;
  score += Math.max(0, 6 - club.tier) * 2;
  if (player.personality === 'ambitieux' && club.tier <= 2) score += 6;
  if (player.personality === 'loyal' && club.countryCode === player.countryCode) score += 5;
  if (player.personality === 'mercenaire') score += club.tier <= 2 ? 4 : 1;
  if (player.personality === 'professionnel') score += 2;
  return score;
};

export default function ShortlistModal({ player, state, currentWeek = 1, onConfirm, onClose }) {
  const [selected, setSelected] = useState([]);

  const suggestions = useMemo(() => {
    const tiers = getEligibleBuyerTiers(player);
    const pool = CLUBS
      .filter((club) => club.name !== player.club)
      .filter((club) => tiers.includes(club.tier))
      .map((club) => ({ club, score: scoreClub(club, player, state) }))
      .sort((a, b) => b.score - a.score || a.club.tier - b.club.tier || a.club.name.localeCompare(b.club.name));
    const top = pool.slice(0, 12).map((item) => item.club);
    return shuffle(top, hashString(`${currentWeek}:${player.id}:${player.club}`)).slice(0, 8);
  }, [player, state, currentWeek]);

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
          <div style={S.mPlayer}>{player.clubCountry} {player.club} · {getPlayerLevelText(player.rating)}</div>
          <p style={S.mText}>Choisis 1 ou 2 clubs à cibler. La shortlist change selon le moment, le projet et les contacts du dossier.</p>

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
            PROPOSER AUX CLUBS
          </button>
          <button onClick={onClose} style={S.secBtn}>ANNULER</button>
        </div>
      </div>
    </div>
  );
}
