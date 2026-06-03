/**
 * calendarEventsSystem.js
 * Événements saisonniers liés au calendrier réel du football.
 * Chaque période de l'année apporte son ambiance, ses tensions et ses opportunités.
 *
 * Les périodes ne sont plus liées à des numéros de semaine fixes :
 * on s'aligne sur la date réelle calculée par week→date.
 */

import { makeId } from '../utils/helpers';
import { getMediaCrisisCooldownWeeks, hasOpenMediaPressure } from './dossierSystem';
import { normalizeMessageRecord } from './messageSystem';
import { getWeekDate } from './seasonSystem';
import { getNarrativeTemplateFallbacks } from '../data/narrativeTemplates';

// ── Définitions des périodes saisonnières ────────────────────────────────────

export const CALENDAR_PERIODS = {
  preseason: { months: [8, 9], emoji: '☀️', label: 'Pré-saison', mood: 'excitation' },
  halloween: { months: [10], emoji: '🎃', label: 'Halloween', mood: 'festif' },
  christmas: { months: [12], emoji: '🎄', label: 'Noël', mood: 'chaleureux' },
  new_year: { months: [1], emoji: '🎆', label: 'Nouvel An', mood: 'resolution' },
  valentines: { months: [2], emoji: '💘', label: 'Saint-Valentin', mood: 'romantique' },
  ramadan: { months: [3], emoji: '🌙', label: 'Ramadan', mood: 'spirituel' },
  end_of_season: { months: [5], emoji: '🏅', label: 'Fin de saison', mood: 'nostalgie' },
};

export const getActivePeriod = (week) => {
  const date = getWeekDate(week);
  const month = (date?.getUTCMonth?.() ?? 0) + 1;
  for (const [key, period] of Object.entries(CALENDAR_PERIODS)) {
    if (period.months.includes(month)) return { ...period, key };
  }
  return null;
};

// ── Effets passifs de la période ─────────────────────────────────────────────

/**
 * Modificateurs d'ambiance sur le moral/confiance selon la période.
 * Appliqué à tous les joueurs automatiquement.
 */
export const getPeriodMoodEffect = (period) => {
  if (!period) return { moral: 0, trust: 0, label: null };
  switch (period.key) {
    case 'christmas':
      return { moral: +5, trust: +3, label: 'Ambiance de Noël — vestiaire uni' };
    case 'new_year':
      return { moral: +3, trust: +2, label: 'Résolutions de Nouvel An — motivation renouvelée' };
    case 'halloween':
      return { moral: 0, trust: 0, label: null, scandalBoost: 0.15 }; // scandales plus viraux
    case 'valentines':
      return { moral: +4, trust: +2, label: 'Saint-Valentin — joueurs détendus' };
    case 'ramadan':
      return { moral: +3, trust: +1, label: 'Ramadan — ferveur et solidarité dans le groupe' };
    case 'preseason':
      return { moral: +4, trust: +2, label: 'Énergie pré-saison — motivation maximale' };
    case 'end_of_season':
      return { moral: -2, trust: 0, label: 'Fatigue de fin de saison' };
    default:
      return { moral: 0, trust: 0, label: null };
  }
};

// ── Messages narratifs saisonniers ───────────────────────────────────────────

const NARRATIVE_FALLBACKS = getNarrativeTemplateFallbacks();

const getSeasonalMessageTemplates = (state = null, periodKey = '') => {
  const key = `seasonal_message:${periodKey}`;
  const fromDb = state?.narrativeTemplates?.[key];
  if (Array.isArray(fromDb) && fromDb.length) return fromDb;
  return NARRATIVE_FALLBACKS.seasonalMessages[periodKey] ?? [];
};

/**
 * Génère un message saisonnier pour un joueur si la période s\'y prête.
 * @param {Object} player
 * @param {string} periodKey
 * @param {number} week
 * @param {boolean} alreadyHasMessage - évite le spam
 * @returns message | null
 */
export const maybeCreateSeasonalMessage = (player, periodKey, week, alreadyHasMessage, state = null) => {
  if (alreadyHasMessage) return null;
  const narratives = getSeasonalMessageTemplates(state, periodKey);
  if (!narratives?.length) return null;
  if (Math.random() > 0.35) return null; // 35% de chance qu'un seul joueur déclenche

  const narrative = narratives[Math.floor(Math.random() * narratives.length)];
  if (narrative.type === 'media_pressure'
      && (hasOpenMediaPressure(state, player.id) || getMediaCrisisCooldownWeeks(state, player.id) > 0)) {
    return null;
  }
  return normalizeMessageRecord({
    id: makeId('msg'),
    week,
    sortWeek: week + 0.1,
    type: narrative.type,
    context: `calendar:${periodKey}`,
    threadKey: player.id,
    threadLabel: `${player.firstName} ${player.lastName}`,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    senderRole: 'player',
    senderName: `${player.firstName} ${player.lastName}`,
    subject: narrative.subject,
    body: narrative.body,
    read: false,
    resolved: narrative.type === 'thanks',
  });
};

// ── Événements passifs saisonniers (petits effets sur news/ambiance) ──────────

const getSeasonalNewsTemplates = (state = null, periodKey = '') => {
  const key = `seasonal_news:${periodKey}`;
  const fromDb = state?.narrativeTemplates?.[key];
  if (Array.isArray(fromDb) && fromDb.length) return fromDb;
  return NARRATIVE_FALLBACKS.seasonalNews[periodKey] ?? [];
};

/**
 * Génère un post d\'actualité lié à la période saisonnière.
 */
export const getSeasonalNewsItem = (period, week, state = null) => {
  if (!period) return null;
  const items = getSeasonalNewsTemplates(state, period.key);
  if (!items?.length) return null;
  if (Math.random() > 0.6) return null;
  return {
    id: makeId('snews'),
    week,
    type: 'media',
    text: items[Math.floor(Math.random() * items.length)].text,
    accountName: 'Calendrier du foot',
    account: { name: 'Agenda du Foot', kind: 'media', icon: period.emoji, color: '#64727d' },
    reputationImpact: 0,
  };
};
