/**
 * calendarEventsSystem.js
 * Événements saisonniers liés au calendrier réel du football.
 * Chaque période de l'année apporte son ambiance, ses tensions et ses opportunités.
 *
 * Mapping semaine de saison → mois (approximatif) :
 *   sw 1-4   = Août (pré-saison)
 *   sw 5-8   = Septembre
 *   sw 9-12  = Octobre (Halloween sw 10)
 *   sw 13-16 = Novembre
 *   sw 17-18 = Décembre (Noël sw 17)
 *   sw 19-20 = Janvier (Nouvel An sw 19, Mercato hiver)
 *   sw 21-22 = Février (Saint-Valentin sw 22)
 *   sw 23-26 = Mars/Avril (Ramadan variable sw 24-27)
 *   sw 27-30 = Avril/Mai
 *   sw 33-36 = Mai/Juin (fin de saison)
 *   sw 37-38 = Juin (Mercato été)
 */

import { makeId } from '../utils/helpers';

// ── Définitions des périodes saisonnières ────────────────────────────────────

export const CALENDAR_PERIODS = {
  preseason: { weeks: [1, 2, 3], emoji: '☀️', label: 'Pré-saison', mood: 'excitation' },
  halloween: { weeks: [10, 11], emoji: '🎃', label: 'Halloween', mood: 'festif' },
  christmas: { weeks: [17, 18], emoji: '🎄', label: 'Noël', mood: 'chaleureux' },
  new_year: { weeks: [19], emoji: '🎆', label: 'Nouvel An', mood: 'resolution' },
  valentines: { weeks: [22], emoji: '💘', label: 'Saint-Valentin', mood: 'romantique' },
  ramadan: { weeks: [24, 25, 26, 27], emoji: '🌙', label: 'Ramadan', mood: 'spirituel' },
  end_of_season: { weeks: [35, 36], emoji: '🏅', label: 'Fin de saison', mood: 'nostalgie' },
};

export const getActivePeriod = (seasonWeek) => {
  for (const [key, period] of Object.entries(CALENDAR_PERIODS)) {
    if (period.weeks.includes(seasonWeek)) return { ...period, key };
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

const SEASONAL_NARRATIVES = {
  halloween: [
    { subject: '🎃 Nuit d\'Halloween — ta star sort', body: "C\'est la nuit de tous les dangers. Ton joueur a posté des photos d\'une fête costumée. La presse cherche l\'angle scandale. Rien de grave... pour l\'instant.", type: 'complaint' },
    { subject: '🎃 Vestiaire déguisé — tout le monde en parle', body: "Les joueurs ont organisé une soirée Halloween dans les vestiaires. Les vidéos circulent, l\'ambiance est bonne — mais certains sponsors n\'apprécient pas.", type: 'thanks' },
  ],
  christmas: [
    { subject: '🎄 Message de Noël — ton joueur te remercie', body: "Il t\'a envoyé un message simple : \"Merci pour cette année. C\'est rare d\'avoir quelqu\'un qui croit vraiment en toi. Joyeux Noël.\" Tu le reçois pendant que tu travailles.", type: 'thanks' },
    { subject: '🎄 Noël — prime de fin d\'année ?', body: "L\'ambiance est à la générosité. Certains agents offrent des cadeaux à leurs joueurs. Ton staff t\'en parle. C\'est un geste qui marque.", type: 'thanks' },
    { subject: '🎄 Soirée de club — ton joueur veut rentrer chez lui', body: "Le club organise une soirée obligatoire à Noël. Ton joueur a sa famille à l\'étranger et voudrait partir plus tôt. Le coach insiste pour qu\'il reste. Situation délicate.", type: 'complaint' },
  ],
  new_year: [
    { subject: '🎆 Nouvel An — il veut changer quelque chose', body: "\"Je veux que cette année soit différente. Meilleur club, meilleur salaire, plus de temps de jeu. J\'attends que tu te battes pour moi. Bonne année.\"", type: 'transfer_request' },
    { subject: '🎆 Résolution — il revient transformé', body: "\"J\'ai pris le temps de réfléchir pendant les fêtes. Je suis revenu à l\'entraînement avec une mentalité différente. Merci de m\'avoir soutenu.\"", type: 'thanks' },
  ],
  valentines: [
    { subject: '💘 Saint-Valentin — les paparazzis suivent sa compagne', body: "Un tabloïd a retrouvé la compagne de ton joueur dans un restaurant romantique. Les photos circulent. Pour l\'instant c\'est mignon — mais ça fragilise sa vie privée.", type: 'media_pressure' },
    { subject: '💘 Quelqu\'un a envoyé des fleurs', body: "Une admiratrice secrète envoie des fleurs à ton joueur au club. Le vestiaire se moque gentiment. L\'ambiance est bonne. La presse va adorer si ça sort.", type: 'thanks' },
  ],
  ramadan: [
    { subject: '🌙 Ramadan — ton joueur jeûne pendant les matchs', body: "Ton joueur pratique le Ramadan cette année. Il joue quand même, mais sa gestion de l\'énergie est différente. Le staff médical du club te contacte.", type: 'complaint' },
    { subject: '🌙 Ramadan — élan de solidarité dans le vestiaire', body: "Plusieurs coéquipiers ont choisi de respecter les horaires de rupture du jeûne avec ton joueur. L\'ambiance dans le groupe est exceptionnelle cette semaine.", type: 'thanks' },
  ],
  end_of_season: [
    { subject: '🏅 Fin de saison — il fait le bilan', body: "\"C\'est la fin de saison. Je regarde où j\'en suis. Ce n\'est pas là où je voulais être en juillet dernier. On a besoin de parler de l\'avenir.\"", type: 'transfer_request' },
    { subject: '🏅 Soirée de gala — nomination surprise', body: "Ton joueur a été nommé dans le onze type du championnat par les journalistes. Il ne s\'y attendait pas. Il est ému. Il veut te partager ça avec toi.", type: 'thanks' },
  ],
};

/**
 * Génère un message saisonnier pour un joueur si la période s\'y prête.
 * @param {Object} player
 * @param {string} periodKey
 * @param {number} week
 * @param {boolean} alreadyHasMessage - évite le spam
 * @returns message | null
 */
export const maybeCreateSeasonalMessage = (player, periodKey, week, alreadyHasMessage) => {
  if (alreadyHasMessage) return null;
  const narratives = SEASONAL_NARRATIVES[periodKey];
  if (!narratives?.length) return null;
  if (Math.random() > 0.35) return null; // 35% de chance qu'un seul joueur déclenche

  const narrative = narratives[Math.floor(Math.random() * narratives.length)];
  return {
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
  };
};

// ── Événements passifs saisonniers (petits effets sur news/ambiance) ──────────

export const SEASONAL_NEWS_EVENTS = {
  halloween: [
    { text: '🎃 Halloween — les clubs européens en font un événement. Ambiance surréaliste dans les vestiaires.', good: true },
    { text: '🎃 Une soirée costumée vire au clash. Les réseaux sociaux s\'emballent.', good: false },
  ],
  christmas: [
    { text: '🎄 Noël — les clubs organisent leurs événements caritatifs de fin d\'année. Vos joueurs y participent.', good: true },
    { text: '🎄 Trêve de Noël en Ligue 1 — période de récupération pour vos joueurs.', good: true },
    { text: '🎄 L\'ambiance vestiaire est au plus haut cette semaine. Cohésion exceptionnelle.', good: true },
  ],
  new_year: [
    { text: '🎆 Nouvel An — partout en Europe, les clubs publient leurs vœux. Le mercato hivernal approche.', good: true },
    { text: '🎆 Résolutions de Nouvel An — certains joueurs reviennent transformés de leurs vacances.', good: true },
  ],
  valentines: [
    { text: '💘 Saint-Valentin — plusieurs joueurs ont été photographiés en couple cette semaine.', good: true },
  ],
  ramadan: [
    { text: '🌙 Ramadan — la discussion sur la gestion des joueurs jeûneurs relance le débat en Europe.', good: true },
    { text: '🌙 Incroyable — ton joueur a marqué juste après la rupture du jeûne. Le vestiaire ovationne.', good: true },
  ],
  end_of_season: [
    { text: '🏅 Dernières journées — l\'atmosphère est électrique. Chaque match peut tout changer.', good: true },
    { text: '🏅 Fin de saison imminente — les premières rumeurs de transferts émergent dans la presse.', good: false },
  ],
  preseason: [
    { text: '☀️ Rentrée footballistique — les transferts s\'accélèrent. Tous les clubs se renforcent.', good: true },
    { text: '☀️ Préparation estivale — retour à l\'entraînement. Les profils les plus sérieux brillent.', good: true },
  ],
};

/**
 * Génère un post d\'actualité lié à la période saisonnière.
 */
export const getSeasonalNewsItem = (period, week) => {
  if (!period) return null;
  const items = SEASONAL_NEWS_EVENTS[period.key];
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
