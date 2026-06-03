import {
  PLAYER_POST_TEMPLATES,
  CLUB_POST_TEMPLATES,
  PRESS_POST_TEMPLATES,
  FAN_POST_TEMPLATES,
  PULSE_TEMPLATES,
  PULSE_NO_PLAYER,
  COMMENT_POOL,
  DM_TONES,
  PULSE_HASHTAGS,
} from './socialDatabase';
import {
  PLAYER_POST_TEMPLATES_EN,
  CLUB_POST_TEMPLATES_EN,
  PRESS_POST_TEMPLATES_EN,
  FAN_POST_TEMPLATES_EN,
  PULSE_TEMPLATES_EN,
  PULSE_NO_PLAYER_EN,
  COMMENT_POOL_EN,
  DM_TONES_EN,
  PULSE_HASHTAGS_EN,
} from './socialDatabase.en';

const SEASONAL_MESSAGE_TEMPLATES = {
  halloween: [
    { type: 'complaint', subject: "🎃 Nuit d'Halloween — ta star sort", body: "C'est la nuit de tous les dangers. Ton joueur a posté des photos d'une fête costumée. La presse cherche l'angle scandale. Rien de grave... pour l'instant." },
    { type: 'thanks', subject: "🎃 Vestiaire déguisé — tout le monde en parle", body: "Les joueurs ont organisé une soirée Halloween dans les vestiaires. Les vidéos circulent, l'ambiance est bonne — mais certains sponsors n'apprécient pas." },
  ],
  christmas: [
    { type: 'thanks', subject: '🎄 Message de Noël — ton joueur te remercie', body: "Il t'a envoyé un message simple : \"Merci pour cette année. C'est rare d'avoir quelqu'un qui croit vraiment en toi. Joyeux Noël.\" Tu le reçois pendant que tu travailles." },
    { type: 'thanks', subject: "🎄 Noël — prime de fin d'année ?", body: "L'ambiance est à la générosité. Certains agents offrent des cadeaux à leurs joueurs. Ton staff t'en parle. C'est un geste qui marque." },
    { type: 'complaint', subject: '🎄 Soirée de club — ton joueur veut rentrer chez lui', body: "Le club organise une soirée obligatoire à Noël. Ton joueur a sa famille à l'étranger et voudrait partir plus tôt. Le coach insiste pour qu'il reste. Situation délicate." },
  ],
  new_year: [
    { type: 'transfer_request', subject: '🎆 Nouvel An — il veut changer quelque chose', body: "\"Je veux que cette année soit différente. Meilleur club, meilleur salaire, plus de temps de jeu. J'attends que tu te battes pour moi. Bonne année.\"" },
    { type: 'thanks', subject: '🎆 Résolution — il revient transformé', body: "\"J'ai pris le temps de réfléchir pendant les fêtes. Je suis revenu à l'entraînement avec une mentalité différente. Merci de m'avoir soutenu.\"" },
  ],
  valentines: [
    { type: 'media_pressure', subject: '💘 Saint-Valentin — les paparazzis suivent sa compagne', body: "Un tabloïd a retrouvé la compagne de ton joueur dans un restaurant romantique. Les photos circulent. Pour l'instant c'est mignon — mais ça fragilise sa vie privée." },
    { type: 'thanks', subject: "💘 Quelqu'un a envoyé des fleurs", body: "Une admiratrice secrète envoie des fleurs à ton joueur au club. Le vestiaire se moque gentiment. L'ambiance est bonne. La presse va adorer si ça sort." },
  ],
  ramadan: [
    { type: 'complaint', subject: '🌙 Ramadan — ton joueur jeûne pendant les matchs', body: "Ton joueur pratique le Ramadan cette année. Il joue quand même, mais sa gestion de l'énergie est différente. Le staff médical du club te contacte." },
    { type: 'thanks', subject: '🌙 Ramadan — élan de solidarité dans le vestiaire', body: "Plusieurs coéquipiers ont choisi de respecter les horaires de rupture du jeûne avec ton joueur. L'ambiance dans le groupe est exceptionnelle cette semaine." },
  ],
  end_of_season: [
    { type: 'transfer_request', subject: '🏅 Fin de saison — il fait le bilan', body: "\"C'est la fin de saison. Je regarde où j'en suis. Ce n'est pas là où je voulais être en juillet dernier. On a besoin de parler de l'avenir.\"" },
    { type: 'thanks', subject: '🏅 Soirée de gala — nomination surprise', body: "Ton joueur a été nommé dans le onze type du championnat par les journalistes. Il ne s'y attendait pas. Il est ému. Il veut te partager ça avec toi." },
  ],
};

const SEASONAL_NEWS_TEMPLATES = {
  halloween: [
    { text: "🎃 Halloween — les clubs européens en font un événement. Ambiance surréaliste dans les vestiaires.", good: true },
    { text: "🎃 Une soirée costumée vire au clash. Les réseaux sociaux s'emballent.", good: false },
  ],
  christmas: [
    { text: "🎄 Noël — les clubs organisent leurs événements caritatifs de fin d'année. Vos joueurs y participent.", good: true },
    { text: '🎄 Trêve de Noël en Ligue 1 — période de récupération pour vos joueurs.', good: true },
    { text: "🎄 L'ambiance vestiaire est au plus haut cette semaine. Cohésion exceptionnelle.", good: true },
  ],
  new_year: [
    { text: '🎆 Nouvel An — partout en Europe, les clubs publient leurs vœux. Le mercato hivernal approche.', good: true },
    { text: "🎆 Résolutions de Nouvel An — certains joueurs reviennent transformés de leurs vacances.", good: true },
  ],
  valentines: [
    { text: '💘 Saint-Valentin — plusieurs joueurs ont été photographiés en couple cette semaine.', good: true },
  ],
  ramadan: [
    { text: '🌙 Ramadan — la discussion sur la gestion des joueurs jeûneurs relance le débat en Europe.', good: true },
    { text: '🌙 Incroyable — ton joueur a marqué juste après la rupture du jeûne. Le vestiaire ovationne.', good: true },
  ],
  end_of_season: [
    { text: "🏅 Dernières journées — l'atmosphère est électrique. Chaque match peut tout changer.", good: true },
    { text: "🏅 Fin de saison imminente — les premières rumeurs de transferts émergent dans la presse.", good: false },
  ],
  preseason: [
    { text: "☀️ Rentrée footballistique — les transferts s'accélèrent. Tous les clubs se renforcent.", good: true },
    { text: "☀️ Préparation estivale — retour à l'entraînement. Les profils les plus sérieux brillent.", good: true },
  ],
};

const SOCIAL_TOKEN_CONTEXT = {
  p: {
    firstName: '{firstName}',
    lastName: '{lastName}',
    club: '{club}',
    seasonStats: { goals: '{goals}' },
    rating: '{rating}',
  },
  club: '{club}',
  partner: '{partner}',
  rival: '{rival}',
  rank: '{rank}',
};

const socialTemplateText = (entry) => {
  if (!entry) return '';
  if (typeof entry === 'function') return entry(SOCIAL_TOKEN_CONTEXT);
  if (typeof entry.text === 'function') return entry.text(SOCIAL_TOKEN_CONTEXT);
  if (typeof entry.text === 'string') return entry.text;
  return '';
};

const createSocialRowsForLang = (lang, {
  playerPosts,
  clubPosts,
  pressPosts,
  fanPosts,
  pulseTemplates,
  pulseNoPlayer,
  commentPool,
  dmTones,
  pulseHashtags,
}) => {
  const rows = [];
  const addRows = (domain, periodKey, list = [], mapEntry) => {
    list.forEach((entry, index) => {
      const normalized = mapEntry(entry, index);
      if (!normalized?.text) return;
      rows.push({
        id: `narrative_${domain}_${periodKey}_${index + 1}`,
        domain,
        period_key: periodKey,
        category: normalized.category ?? null,
        subject: normalized.subject ?? null,
        body: normalized.body ?? null,
        text: normalized.text,
        payload: normalized.payload ?? normalized,
      });
    });
  };

  addRows('social_player_post', lang, playerPosts, (entry) => ({
    category: entry?.tag ?? 'player',
    text: socialTemplateText(entry),
    payload: { tag: entry?.tag ?? 'player', text: socialTemplateText(entry) },
  }));
  addRows('social_club_post', lang, clubPosts, (entry) => ({
    category: entry?.tag ?? 'club',
    text: socialTemplateText(entry),
    payload: { tag: entry?.tag ?? 'club', text: socialTemplateText(entry) },
  }));
  addRows('social_press_post', lang, pressPosts, (entry) => ({
    category: entry?.tag ?? 'press',
    text: socialTemplateText(entry),
    payload: { tag: entry?.tag ?? 'press', text: socialTemplateText(entry) },
  }));
  addRows('social_fan_post', lang, fanPosts, (entry) => ({
    category: entry?.tag ?? 'fan',
    text: socialTemplateText(entry),
    payload: { tag: entry?.tag ?? 'fan', text: socialTemplateText(entry) },
  }));
  addRows('social_pulse', lang, pulseTemplates, (entry) => ({
    category: 'pulse',
    text: socialTemplateText(entry),
    payload: { text: socialTemplateText(entry) },
  }));
  addRows('social_pulse_static', lang, pulseNoPlayer, (entry) => ({
    category: entry?.handle ?? 'pulse_static',
    text: entry?.text ?? '',
    payload: entry,
  }));
  addRows('social_comment', lang, commentPool, (entry) => ({
    category: 'comment',
    text: socialTemplateText(entry),
    payload: { text: socialTemplateText(entry) },
  }));
  addRows('social_dm_tone', lang, dmTones, (entry) => ({
    category: entry?.tone ?? 'dm',
    text: entry?.text ?? '',
    payload: entry,
  }));
  addRows('social_hashtag', lang, pulseHashtags, (entry) => ({
    category: 'hashtag',
    text: String(entry ?? ''),
    payload: { text: String(entry ?? '') },
  }));

  return rows;
};

export const createNarrativeTemplateRows = () => {
  const rows = [];
  Object.entries(SEASONAL_MESSAGE_TEMPLATES).forEach(([periodKey, templates]) => {
    templates.forEach((template, index) => {
      rows.push({
        id: `narrative_seasonal_message_${periodKey}_${index + 1}`,
        domain: 'seasonal_message',
        period_key: periodKey,
        category: template.type,
        subject: template.subject,
        body: template.body,
        text: null,
        payload: template,
      });
    });
  });
  Object.entries(SEASONAL_NEWS_TEMPLATES).forEach(([periodKey, templates]) => {
    templates.forEach((template, index) => {
      rows.push({
        id: `narrative_seasonal_news_${periodKey}_${index + 1}`,
        domain: 'seasonal_news',
        period_key: periodKey,
        category: template.good ? 'good' : 'bad',
        subject: null,
        body: null,
        text: template.text,
        payload: template,
      });
    });
  });
  [
    { id: 'world_summary_calm_1', domain: 'world_summary', period_key: 'calm', text: 'Peu de mouvements majeurs dans le monde du foot. Les clubs observent, les agents préparent leurs dossiers.' },
    { id: 'world_summary_pool_match', domain: 'world_summary', period_key: 'pool', category: 'match', subject: 'Choc européen', text: "{losingClub} s'incline {score} contre {winningClub} dans un match très suivi. Plusieurs cadres sont pointés du doigt par la presse et les émissions du soir ouvrent le débat sur l'état du vestiaire." },
    { id: 'world_summary_pool_injury', domain: 'world_summary', period_key: 'pool', category: 'injury', subject: 'Blessure star', text: 'Une star du continent se blesse. Son club pourrait chercher une solution rapide au mercato.' },
    { id: 'world_summary_pool_rumor', domain: 'world_summary', period_key: 'pool', category: 'rumor', subject: 'Rumeur marché', text: 'Un insider annonce que plusieurs clubs préparent déjà leur prochain numéro 9.' },
    { id: 'world_summary_pool_media', domain: 'world_summary', period_key: 'pool', category: 'media', subject: 'Débat agents', text: 'Les médias débattent du rôle des agents dans les carrières des jeunes talents.' },
    { id: 'world_summary_pool_club', domain: 'world_summary', period_key: 'pool', category: 'club', subject: 'Président sous pression', text: 'Un président promet de recruter après une série de mauvais résultats.' },
    { id: 'world_summary_mercato_1', domain: 'world_summary', period_key: 'mercato', text: 'Le mercato {window} accélère. Les clubs testent plusieurs dossiers avant de formuler des offres.' },
    { id: 'world_summary_media_pressure_1', domain: 'world_summary', period_key: 'media_pressure', text: 'Les journalistes cherchent les histoires sensibles. Les petites phrases peuvent devenir des crises.' },
  ].forEach((row) => rows.push({ ...row, body: row.body ?? null, payload: row }));
  rows.push(
    ...createSocialRowsForLang('fr', {
      playerPosts: PLAYER_POST_TEMPLATES,
      clubPosts: CLUB_POST_TEMPLATES,
      pressPosts: PRESS_POST_TEMPLATES,
      fanPosts: FAN_POST_TEMPLATES,
      pulseTemplates: PULSE_TEMPLATES,
      pulseNoPlayer: PULSE_NO_PLAYER,
      commentPool: COMMENT_POOL,
      dmTones: DM_TONES,
      pulseHashtags: PULSE_HASHTAGS,
    }),
    ...createSocialRowsForLang('en', {
      playerPosts: PLAYER_POST_TEMPLATES_EN,
      clubPosts: CLUB_POST_TEMPLATES_EN,
      pressPosts: PRESS_POST_TEMPLATES_EN,
      fanPosts: FAN_POST_TEMPLATES_EN,
      pulseTemplates: PULSE_TEMPLATES_EN,
      pulseNoPlayer: PULSE_NO_PLAYER_EN,
      commentPool: COMMENT_POOL_EN,
      dmTones: DM_TONES_EN,
      pulseHashtags: PULSE_HASHTAGS_EN,
    }),
  );
  return rows;
};

export const getNarrativeTemplateFallbacks = () => ({
  seasonalMessages: SEASONAL_MESSAGE_TEMPLATES,
  seasonalNews: SEASONAL_NEWS_TEMPLATES,
});
