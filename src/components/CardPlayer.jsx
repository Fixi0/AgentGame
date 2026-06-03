import React from 'react';
import { getPlayerPortrait } from '../utils/playerPortraits';
import { CARD_THEME, withPlayerCardMeta } from '../systems/playerCardSystem';

const COUNTRY_FLAGS = {
  FRA: '🇫🇷', ESP: '🇪🇸', ITA: '🇮🇹', GER: '🇩🇪', ENG: '🏴', BRA: '🇧🇷', ARG: '🇦🇷',
  POR: '🇵🇹', NED: '🇳🇱', BEL: '🇧🇪', USA: '🇺🇸', JPN: '🇯🇵', SEN: '🇸🇳', MAR: '🇲🇦', ALG: '🇩🇿',
};

const lastName = (player = {}) => `${player.lastName ?? ''}`.trim() || `${player.firstName ?? ''}`.trim();

export default function CardPlayer({ player, onOpen, size = 'default' }) {
  const cardPlayer = withPlayerCardMeta(player);
  const theme = CARD_THEME[cardPlayer.cardType] ?? CARD_THEME.silver;
  const portrait = getPlayerPortrait(cardPlayer);
  const flag = cardPlayer.countryFlag || COUNTRY_FLAGS[cardPlayer.countryCode] || '🏳️';
  const isCompact = size === 'compact';
  const isBigTier = ['elite', 'future_star', 'icon', 'toty', 'ballondor'].includes(cardPlayer.cardType);
  const rarityClass = `rarity-${cardPlayer.cardType}`;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(cardPlayer)}
      className={`af-player-tile ${isCompact ? 'is-compact' : ''} ${isBigTier ? 'is-big-tier' : ''} ${rarityClass}`}
      style={{ '--tile-accent': theme.accent, '--tile-glow': theme.glow }}
    >
      <div className="af-player-tile-media">
        <img
          src={portrait}
          alt={lastName(cardPlayer)}
          loading="lazy"
          className="af-player-tile-img"
        />
        <div className="af-player-tile-overlay" />
        <div className="af-player-tile-rating" style={{ fontSize: isCompact ? 18 : 22 }}>
          {Math.round(cardPlayer.rating ?? 0)}
        </div>
        <div className="af-player-tile-position" style={{ fontSize: isCompact ? 12 : 13 }}>
          {cardPlayer.roleShort ?? cardPlayer.position}
        </div>
      </div>

      <div className="af-player-tile-body">
        <div className="af-player-tile-name" style={{ fontSize: isCompact ? 16 : 18 }}>
          {lastName(cardPlayer)}
        </div>
        <div className="af-player-tile-sub" style={{ fontSize: isCompact ? 12 : 13 }}>
          {flag} {cardPlayer.clubDisplay ?? cardPlayer.club ?? ''}
        </div>
      </div>
      <div className="af-player-tile-rarity">{theme.label}</div>
    </button>
  );
}
