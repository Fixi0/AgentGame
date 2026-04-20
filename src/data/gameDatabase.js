import { CLUBS, COUNTRIES, getCitiesForCountry } from './clubs';
import { PERSONALITIES, PERSONALITY_LABELS, PERSONALITY_PROFILES } from './players';
import { INTERACTIVE_EVENTS, PASSIVE_EVENTS } from './events';
import { createPlayerCatalog } from './squadDatabase';
import { STAFF_ROLES, createDefaultStaff } from '../systems/staffSystem';
import { createDefaultClubMemory, createDefaultClubRelations, getClubProfile } from '../systems/clubSystem';
import { getAgencyCapacity } from '../systems/agencySystem';

const slugId = (value) => String(value ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

const makeGameStamp = (season = 1, week = 1) => `S${season}W${week}`;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getSeasonNumberFromWeek = (week = 1) => Math.floor(((week ?? 1) - 1) / 38) + 1;

const getSeasonWeekFromWeek = (week = 1) => (((week ?? 1) - 1) % 38) + 1;

const getSeasonId = (season = 1) => `season_${season}`;

const clubIdFromName = (name) => (name && name !== 'Libre' ? `club_${slugId(name)}` : null);

const playerName = (player = {}) => {
  const record = player ?? {};
  return [record.firstName, record.lastName].filter(Boolean).join(' ').trim();
};

const roundNumber = (value, decimals = 1) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const indexBy = (rows = [], key = 'id') => rows.reduce((index, row) => {
  if (row?.[key] != null) index[row[key]] = row;
  return index;
}, {});

const compoundIndex = (rows = [], keys = []) => rows.reduce((index, row) => {
  const id = keys.map((key) => row?.[key] ?? '').join(':');
  if (id !== '') index[id] = row;
  return index;
}, {});

const groupIndex = (rows = [], key = 'id') => rows.reduce((index, row) => {
  const value = row?.[key];
  if (value == null) return index;
  index[value] = [...(index[value] ?? []), row];
  return index;
}, {});

const REGION_BY_COUNTRY = {
  FR: 'Europe',
  ES: 'Europe',
  GB: 'Europe',
  DE: 'Europe',
  IT: 'Europe',
  NL: 'Europe',
  PT: 'Europe',
  BR: 'Amérique du Sud',
  AR: 'Amérique du Sud',
};

const LEAGUE_LABELS = {
  FR: 'Ligue 1',
  ES: 'La Liga',
  GB: 'Premier League',
  DE: 'Bundesliga',
  IT: 'Serie A',
  NL: 'Eredivisie',
  PT: 'Primeira Liga',
  BR: 'Brasileirão',
  AR: 'Liga Profesional',
};

const LEAGUE_PRESTIGE = {
  FR: 82, ES: 88, GB: 90, DE: 84, IT: 83, NL: 75, PT: 74, BR: 76, AR: 72,
};

const LEAGUE_MEDIA = {
  FR: 78, ES: 88, GB: 92, DE: 85, IT: 81, NL: 68, PT: 66, BR: 71, AR: 64,
};

const COUNTRY_TALENT = {
  FR: 74, ES: 76, GB: 75, DE: 73, IT: 72, NL: 71, PT: 72, BR: 82, AR: 80,
};

const COUNTRY_PROSPECT_FREQ = {
  FR: 0.78, ES: 0.74, GB: 0.72, DE: 0.7, IT: 0.68, NL: 0.62, PT: 0.61, BR: 0.82, AR: 0.8,
};

const defaultAgency = {
  id: 'agency-agent-fc',
  name: 'Agent FC',
  country: 'France',
  country_code: 'FR',
  countryCode: 'FR',
  city: 'Paris',
  director_name: 'Directeur sportif',
  ownerName: 'Directeur sportif',
  emblem: '⚡',
  color: '#d4a574',
  positioning: 'équilibré',
  style: 'équilibre',
  difficulty: 'realiste',
  start_profile: 'ancien_joueur',
  startProfile: 'ancien_joueur',
  onboarded: false,
  money: 25000,
  reputation: 20,
  credibility: 52,
  agency_level: 1,
  capacity_max: getAgencyCapacity(1),
  current_season: 1,
  current_week: 1,
  created_at: makeGameStamp(1, 1),
  updated_at: makeGameStamp(1, 1),
};

export const createDefaultAgencyRecord = (patch = {}) => ({
  ...defaultAgency,
  ...patch,
  capacity_max: patch.capacity_max ?? getAgencyCapacity(patch.agency_level ?? defaultAgency.agency_level),
  countryCode: patch.countryCode ?? patch.country_code ?? defaultAgency.countryCode,
  ownerName: patch.ownerName ?? patch.director_name ?? defaultAgency.ownerName,
  style: patch.style ?? patch.positioning ?? defaultAgency.style,
  startProfile: patch.startProfile ?? patch.start_profile ?? defaultAgency.startProfile,
  updated_at: patch.updated_at ?? makeGameStamp(patch.current_season ?? defaultAgency.current_season, patch.current_week ?? defaultAgency.current_week),
});

export const createCountryRows = () =>
  COUNTRIES.map((country) => ({
    id: `country_${country.code.toLowerCase()}`,
    name: country.label,
    code: country.code,
    flag: country.flag,
    region: REGION_BY_COUNTRY[country.code] ?? 'Monde',
    market_reputation: country.minReputation * 10 + country.marketWeight * 2,
    talent_level: COUNTRY_TALENT[country.code] ?? 70,
    prospect_frequency: COUNTRY_PROSPECT_FREQ[country.code] ?? 0.5,
  }));

export const createCityRows = () => {
  const rows = [];
  COUNTRIES.forEach((country) => {
    getCitiesForCountry(country.code).forEach((city) => {
      rows.push({
        id: `city_${slugId(`${country.code}_${city}`)}`,
        name: city,
        country_id: `country_${country.code.toLowerCase()}`,
        attractiveness: Math.max(40, country.minReputation * 2 + (city.length % 11) * 3),
        football_importance: Math.max(35, country.marketWeight * 4),
      });
    });
  });
  return rows;
};

export const createLeagueRows = () =>
  COUNTRIES.map((country) => ({
    id: `league_${country.code.toLowerCase()}_1`,
    name: LEAGUE_LABELS[country.code] ?? `${country.label} League`,
    country_id: `country_${country.code.toLowerCase()}`,
    level: 1,
    prestige: LEAGUE_PRESTIGE[country.code] ?? 70,
    average_budget: Math.max(12, Math.round((LEAGUE_PRESTIGE[country.code] ?? 70) / 2)),
    media_exposure: LEAGUE_MEDIA[country.code] ?? 60,
  }));

export const createClubRows = () =>
  CLUBS.map((club) => {
    const country = COUNTRIES.find((item) => item.code === club.countryCode);
    const leagueId = `league_${club.countryCode.toLowerCase()}_1`;
    const profile = getClubProfile(club, 50);
    return {
      id: `club_${slugId(club.name)}`,
      name: club.name,
      country_id: country ? `country_${club.countryCode.toLowerCase()}` : null,
      city_id: `city_${slugId(`${club.countryCode}_${club.city}`)}`,
      league_id: leagueId,
      prestige: profile.prestige,
      budget: profile.budget,
      reputation: Math.max(30, profile.prestige),
      attractiveness: Math.max(35, profile.prestige - 10),
      policy: profile.style,
      focus: club.tier <= 2 ? 'stars' : club.tier === 3 ? 'equilibre' : 'jeunes',
      recruitment_style: profile.style,
      media_level: profile.mediaPressure,
      logo: country?.flag ?? '🏟️',
    };
  });

export const createPersonalityRows = () =>
  PERSONALITIES.map((code) => {
    const profile = PERSONALITY_PROFILES[code] ?? {};
    return {
      id: `personality_${code}`,
      code,
      label: PERSONALITY_LABELS[code] ?? code,
      description: profile.label ?? profile.note ?? '',
      negotiation_tendency: profile.negotiationBias ?? 0,
      scandal_tendency: profile.eventBias?.scandal ?? 1,
      loyalty_tendency: profile.loyalty ?? 50,
      ambition_tendency: profile.ambition ?? 50,
      instability_tendency: profile.stability ?? 50,
    };
  });

export const createEventTemplateRows = () => {
  const templates = [...INTERACTIVE_EVENTS, ...PASSIVE_EVENTS].filter((event, index, array) => array.findIndex((item) => item.id === event.id) === index);
  return templates.map((event) => ({
    id: `event_template_${event.id}`,
    code: event.id,
    type: event.type ?? event.types?.[0] ?? 'media',
    title: event.title ?? event.label ?? event.id,
    description: event.description ?? '',
    public: event.public ?? true,
    rarity: event.rarity ?? 'common',
    trigger_conditions: {
      types: event.types ?? [event.type ?? 'media'],
      personalities: event.personalities ?? [],
      min_age: event.ageMin ?? null,
      max_age: event.ageMax ?? null,
      min_reputation: event.repReq ?? null,
    },
    targeted_personality: event.personalities?.[0] ?? null,
    impacts_possible: (event.choices ?? []).map((choice) => choice.effects ?? {}),
    tags: [event.type ?? 'media', event.rarity ?? 'common'],
  }));
};

const buildPlayerRow = (player, agencyId, source, season, week) => {
  const clubId = clubIdFromName(player.club);
  const countryId = player.countryCode ? `country_${player.countryCode.toLowerCase()}` : null;
  const personalityId = player.personality ? `personality_${player.personality}` : null;
  const marketStatus = source === 'market' ? 'market' : source === 'freeAgent' ? 'free_agent' : 'roster';
  const careerStatus = player.freeAgent || player.club === 'Libre' ? 'free' : player.injured > 0 ? 'injured' : 'active';
  const fullName = playerName(player);
  return {
    id: player.id,
    agency_id: agencyId,
    source,
    first_name: player.firstName ?? '',
    last_name: player.lastName ?? '',
    full_name: fullName,
    nationality: player.countryLabel ?? '',
    country_code: player.countryCode ?? null,
    country_flag: player.countryFlag ?? null,
    country_id: countryId,
    origin_city: player.birthPlace ?? player.clubCity ?? null,
    age: player.age ?? null,
    birth_date: player.birthDate ?? null,
    main_position: player.position ?? null,
    role_id: player.roleId ?? null,
    secondary_position: player.secondaryPosition ?? null,
    personality_id: personalityId,
    club_current_id: clubId,
    club_name: player.club ?? null,
    club_country_code: player.clubCountryCode ?? null,
    club_city: player.clubCity ?? null,
    club_tier: player.clubTier ?? null,
    club_role: player.clubRole ?? null,
    european_competition: player.europeanCompetition ?? null,
    note_current: player.rating ?? null,
    potential: player.potential ?? null,
    market_value: player.value ?? null,
    salary_weekly: player.weeklySalary ?? null,
    moral: player.moral ?? null,
    trust_in_agent: player.trust ?? null,
    loyalty: player.loyalty ?? null,
    satisfaction: player.satisfaction ?? player.moral ?? null,
    form: player.form ?? null,
    popularity: player.brandValue ?? null,
    discipline: player.discipline ?? null,
    injury_current: player.injured ?? 0,
    injury_duration: player.injured ?? 0,
    market_status: marketStatus,
    career_status: careerStatus,
    tag: player.signaturePlayer ? 'star' : player.freeAgent ? 'free' : player.hiddenPotential ? 'prospect' : null,
    hidden_projection: player.hiddenPotential ? player.potential ?? null : null,
    sensitive_history: (player.timeline ?? []).slice(0, 5),
    match_history: safeArray(player.matchHistory),
    season_stats: player.seasonStats ?? {},
    career_goal: player.careerGoal ?? null,
    scout_report: player.scoutReport ?? null,
    agent_contract: player.agentContract ?? null,
    contract_weeks_left: player.contractWeeksLeft ?? null,
    contract_start_week: player.contractStartWeek ?? null,
    signing_bonus: player.signingBonus ?? player.contractClauses?.signingBonus ?? 0,
    bonus: player.bonus ?? player.contractClauses?.bonus ?? 0,
    release_clause: player.releaseClause ?? player.contractClauses?.releaseClause ?? null,
    sell_on_percentage: player.sellOnPercentage ?? player.contractClauses?.sellOnPercentage ?? null,
    promised_role: player.contractClauses?.rolePromise ?? player.clubRole ?? null,
    no_cut_clause: Boolean(player.noCutClause ?? player.contractClauses?.noCutClause),
    role_protection: Boolean(player.roleProtection ?? player.contractClauses?.coachRoleProtection),
    timeline: safeArray(player.timeline),
    date_created: player.createdAt ?? makeGameStamp(season, week),
    date_updated: makeGameStamp(season, week),
  };
};

const buildPlayerTables = (state = {}, season = 1, week = 1, agencyId = defaultAgency.id) => {
  const used = new Map();
  const sources = [
    ['roster', safeArray(state.roster)],
    ['market', safeArray(state.market)],
    ['freeAgent', safeArray(state.freeAgents)],
  ];
  const rows = [];
  sources.forEach(([source, list]) => {
    list.forEach((player) => {
      if (!player?.id || used.has(player.id)) return;
      used.set(player.id, true);
      rows.push(buildPlayerRow(player, agencyId, source, season, week));
    });
  });
  return rows;
};

const buildRelationships = (players = [], agencyId = defaultAgency.id) => players.map((player) => ({
  id: `rel_${player.id}`,
  agency_id: agencyId,
  player_id: player.id,
  trust: player.trust_in_agent ?? 50,
  satisfaction: player.satisfaction ?? 50,
  loyalty: player.loyalty ?? 50,
  relation_status: player.career_status === 'free'
    ? 'free'
    : player.trust_in_agent >= 70
      ? 'strong'
      : player.trust_in_agent <= 35
        ? 'fragile'
        : 'stable',
  signed_at: player.source === 'roster' ? player.date_created : null,
  departed_at: player.market_status === 'free_agent' ? player.date_updated : null,
  commission: 0.1,
  promises: [],
  last_interaction: player.date_updated,
}));

const buildCareerRows = (players = [], season = 1) => players.map((player) => {
  const history = safeArray(player.match_history);
  const stats = player.season_stats ?? {};
  const played = history.filter((match) => (match?.minutes ?? 0) > 0);
  const ratings = safeArray(stats.ratings).length
    ? safeArray(stats.ratings)
    : played.map((match) => match.matchRating).filter(Number.isFinite);
  return {
    id: `career_${player.id}_${season}`,
    player_id: player.id,
    season_id: getSeasonId(season),
    club_id: player.club_current_id,
    club_name: player.club_name ?? null,
    matches: stats.appearances ?? played.length,
    goals: stats.goals ?? history.reduce((sum, match) => sum + (match.goals ?? 0), 0),
    passes: stats.assists ?? history.reduce((sum, match) => sum + (match.assists ?? 0), 0),
    clean_sheets: player.main_position === 'GK' ? (stats.cleanSheets ?? 0) : null,
    note_average: stats.averageRating ?? (ratings.length ? roundNumber(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : null),
    playing_time: history.reduce((sum, match) => sum + (match.minutes ?? 0), 0),
    trophies: player.trophies ?? 0,
    injuries: stats.injuries ?? player.injury_current ?? 0,
    cards: stats.cards ?? 0,
    value_start: player.value_start ?? player.market_value ?? null,
    value_end: player.market_value ?? null,
  };
});

const buildContractRows = (players = [], season = 1) => players
  .filter((player) => player.market_status === 'roster')
  .map((player) => ({
    id: `contract_${player.id}`,
    player_id: player.id,
    club_id: player.club_current_id,
    start_date: player.contract_start_week ?? makeGameStamp(season, 1),
    end_date: player.contract_weeks_left ? `S${season}+${player.contract_weeks_left}` : null,
    salary_weekly: player.salary_weekly ?? 0,
    signing_bonus: player.signing_bonus ?? 0,
    bonus: player.bonus ?? 0,
    release_clause: player.release_clause ?? null,
    sell_on_percentage: player.sell_on_percentage ?? null,
    promised_role: player.promised_role ?? player.club_role ?? null,
    no_cut_clause: Boolean(player.no_cut_clause),
    role_protection: Boolean(player.role_protection),
    status: player.freeAgent ? 'free' : 'active',
  }));

const buildNegotiationRows = (state = {}, players = [], season = 1, week = 1) => safeArray(state.clubOffers).map((offer) => ({
  id: `nego_${offer.id}`,
  agency_id: defaultAgency.id,
  player_id: offer.playerId,
  player_name: offer.playerName ?? players.find((player) => player.id === offer.playerId)?.full_name ?? null,
  club_id: clubIdFromName(offer.club),
  club_name: offer.club ?? null,
  type: offer.offerType ?? offer.type ?? 'transfer',
  status: offer.status ?? 'open',
  interest_current: offer.interest ?? offer.interestLevel ?? 0,
  offer_current: offer.amount ?? offer.fee ?? offer.signingCost ?? 0,
  salary_proposed: offer.salary ?? offer.weeklySalary ?? null,
  bonus_proposed: offer.bonus ?? offer.signingBonus ?? null,
  clause_proposed: offer.clause ?? offer.releaseClause ?? null,
  role_proposed: offer.role ?? offer.promisedRole ?? null,
  promise_proposed: offer.promise ?? offer.promiseLabel ?? null,
  turns: offer.turns ?? 0,
  fit_score: offer.fitScore ?? null,
  result: offer.result ?? null,
  date_start: makeGameStamp(season, week),
  date_end: offer.closedAt ?? null,
}));

const buildNegotiationTurnRows = (state = {}, season = 1, week = 1) => safeArray(state.decisionHistory)
  .filter((entry) => String(entry.type ?? '').includes('transfer') || String(entry.type ?? '').includes('nego'))
  .map((entry, idx) => ({
    id: `nego_turn_${entry.id ?? idx}`,
    negotiation_id: entry.playerId ? `nego_${entry.playerId}` : null,
    turn_number: idx + 1,
    action: entry.label ?? entry.type ?? 'action',
    effect_interest: entry.effectInterest ?? 0,
    effect_offer: entry.effectOffer ?? 0,
    effect_salary: entry.effectSalary ?? 0,
    effect_reputation: entry.effectReputation ?? 0,
    log_text: entry.detail ?? '',
    date: makeGameStamp(season, week),
  }));

const normalizeMessageForTable = (message = {}, season = 1, week = 1, source = 'inbox', index = 0) => ({
  id: message.id ?? `msg_${source}_${message.threadKey ?? message.playerId ?? index}`,
  agency_id: defaultAgency.id,
  source,
  sender_type: message.senderRole ?? 'system',
  sender_id: message.senderId ?? message.playerId ?? null,
  receiver_type: message.receiverRole ?? 'agency',
  receiver_id: message.receiverId ?? null,
  category: message.type ?? 'general',
  urgency: message.priority ?? 'normal',
  subject: message.subject ?? '',
  content: message.body ?? '',
  player_id: message.playerId ?? null,
  event_instance_id: message.eventInstanceId ?? null,
  requires_response: Boolean(message.requiresResponse || (message.responseOptions ?? []).length),
  status: source === 'queue' ? 'queued' : message.resolved ? 'resolved' : message.read ? 'read' : 'new',
  read: Boolean(message.read),
  archived: Boolean(message.archived),
  date_created: message.week ? makeGameStamp(getSeasonNumberFromWeek(message.week), getSeasonWeekFromWeek(message.week)) : makeGameStamp(season, week),
  date_read: message.read ? makeGameStamp(season, week) : null,
});

const getSourceMessages = (state = {}) => [
  ...safeArray(state.messages).map((message, index) => ({
    ...message,
    id: message.id ?? `msg_inbox_${message.threadKey ?? message.playerId ?? index}`,
    source: 'inbox',
  })),
  ...safeArray(state.messageQueue).map((message, index) => ({
    ...message,
    id: message.id ?? `msg_queue_${message.threadKey ?? message.playerId ?? index}`,
    source: 'queue',
  })),
];

const buildMessageRows = (state = {}, season = 1, week = 1) => [
  ...safeArray(state.messages).map((message, index) => normalizeMessageForTable(message, season, week, 'inbox', index)),
  ...safeArray(state.messageQueue).map((message, index) => normalizeMessageForTable(message, season, week, 'queue', index)),
];

const buildMessageChoiceRows = (state = {}) => getSourceMessages(state).flatMap((message) => safeArray(message.responseOptions).map((choice, index) => ({
  id: `${message.id}_choice_${index}`,
  message_id: message.id,
  label: choice.label ?? choice.text ?? `Choix ${index + 1}`,
  tone: choice.tone ?? 'neutral',
  impact_moral: choice.effects?.moral ?? 0,
  impact_trust: choice.effects?.trust ?? 0,
  impact_reputation: choice.effects?.rep ?? 0,
  impact_money: choice.effects?.money ?? 0,
  impact_popularity: choice.effects?.popularity ?? 0,
  next_step: choice.flag ?? choice.nextStep ?? null,
})));

const buildMessageResponseRows = (state = {}) => getSourceMessages(state)
  .filter((message) => message.responseChosen || message.resolved)
  .map((message) => ({
    id: `response_${message.id}`,
    message_id: message.id,
    choice_id: message.responseChosen?.id ?? null,
    response: message.responseText ?? '',
    date: message.responseAt ?? message.dateRead ?? null,
    effects_applied: message.responseEffects ?? {},
  }));

const buildNewsRows = (state = {}, season = 1, week = 1) => safeArray(state.news).map((post, index) => ({
  id: post.id ?? `news_${post.week ?? week}_${index}`,
  agency_id: defaultAgency.id,
  type: post.type ?? 'media',
  source: post.account?.name ?? post.source ?? 'unknown',
  title: post.title ?? post.text?.slice(0, 64) ?? '',
  content: post.text ?? '',
  player_id: post.player?.id ?? post.playerId ?? null,
  club_id: post.clubId ?? null,
  event_instance_id: post.eventInstanceId ?? null,
  impact_reputation: post.reputationImpact ?? 0,
  impact_popularity: post.popularityImpact ?? 0,
  viral_score: post.viralScore ?? 0,
  public: post.public ?? true,
  created_at: post.createdAt ?? makeGameStamp(season, week),
}));

const buildRivalAgentRows = (state = {}, agencyId = defaultAgency.id) => safeArray(state.rivalAgents).map((agent) => ({
  id: agent.id ?? `rival_${slugId(agent.name)}`,
  agency_id: agencyId,
  name: agent.name,
  country_id: agent.countryCode ? `country_${agent.countryCode.toLowerCase()}` : null,
  reputation: agent.reputation ?? 50,
  aggression: agent.risk ? Math.round(agent.risk * 100) : 50,
  specialty: agent.style ?? 'equilibre',
  network_level: agent.heat ?? 50,
  media_level: agent.media ?? 50,
  danger_level: agent.heat ?? 50,
}));

const buildRivalRelationsRows = (state = {}, agencyId = defaultAgency.id) => safeArray(state.competitorThreats).map((threat, index) => ({
  id: threat.id ?? `rival_rel_${index}`,
  rival_agent_id: threat.rivalAgentId ?? null,
  player_id: threat.playerId ?? null,
  interest_level: threat.heat ?? 0,
  active_attempt: Boolean(threat.active),
  last_approach: threat.lastMoveWeek ?? null,
  agency_id: agencyId,
}));

const buildScoutingRows = (state = {}, season = 1, week = 1, agencyId = defaultAgency.id) => safeArray(state.market).flatMap((player) => player.scoutReport ? [{
  id: `scout_${player.id}`,
  agency_id: agencyId,
  player_id: player.id,
  scout_level_used: player.scoutReport.level ?? 0,
  potential_estimated: player.scoutReport.potential ?? player.potential ?? null,
  risk_estimated: player.scoutReport.risk ?? null,
  personality_estimated: player.scoutReport.personality ?? player.personality ?? null,
  note_report: player.scoutReport.note ?? '',
  scouting_cost: player.scoutReport.cost ?? 0,
  created_at: makeGameStamp(season, week),
}] : []);

const buildPromiseRows = (state = {}, agencyId = defaultAgency.id) => safeArray(state.promises).map((promise) => ({
  id: promise.id ?? `promise_${slugId(`${promise.playerId ?? ''}_${promise.type ?? ''}`)}`,
  agency_id: agencyId,
  player_id: promise.playerId ?? null,
  type: promise.type ?? 'generic',
  description: promise.description ?? promise.label ?? '',
  created_at: promise.createdAt ?? null,
  deadline: promise.dueWeek ?? promise.deadline ?? null,
  kept: promise.resolved ? true : promise.failed ? false : null,
  impact_if_broken: promise.impactIfBroken ?? null,
}));

const findStatePlayer = (state = {}, playerId = null) =>
  [...safeArray(state.roster), ...safeArray(state.market), ...safeArray(state.freeAgents)]
    .find((player) => player?.id === playerId) ?? null;

const buildClubOfferRows = (state = {}, season = 1, week = 1, agencyId = defaultAgency.id) =>
  safeArray(state.clubOffers).map((offer, index) => {
    const player = findStatePlayer(state, offer.playerId);
    const fee = offer.fee ?? offer.amount ?? offer.signingCost ?? 0;
    return {
      id: offer.id ?? `offer_${offer.playerId ?? 'player'}_${slugId(offer.club ?? 'club')}_${index}`,
      agency_id: agencyId,
      player_id: offer.playerId ?? null,
      player_name: offer.playerName ?? (playerName(player) || null),
      club_id: clubIdFromName(offer.club),
      club_name: offer.club ?? null,
      status: offer.status ?? 'open',
      type: offer.type ?? offer.offerType ?? 'transfer',
      fee,
      amount: fee,
      salary_weekly: offer.salary ?? offer.weeklySalary ?? null,
      signing_bonus: offer.signingBonus ?? offer.bonus ?? null,
      promised_role: offer.role ?? offer.promisedRole ?? null,
      source: offer.source ?? 'system',
      window: offer.window ?? null,
      context: offer.context ?? null,
      created_week: offer.week ?? week,
      expires_week: offer.expiresWeek ?? null,
      season_id: getSeasonId(season),
      raw: offer,
    };
  });

const normalizeFixtureClub = (club = {}) => ({
  name: club?.name ?? club?.club ?? null,
  id: clubIdFromName(club?.name ?? club?.club),
  country_code: club?.countryCode ?? null,
  city: club?.city ?? null,
  tier: club?.tier ?? null,
});

const buildFixtureRows = (state = {}, season = 1, week = 1) => {
  const mapFixture = (fixture = {}, source, index) => {
    const fixtureWeek = fixture.week ?? (source === 'nextFixtures' ? week + 1 : week);
    const home = normalizeFixtureClub(fixture.homeClub ?? { name: fixture.homeClubName ?? fixture.home });
    const away = normalizeFixtureClub(fixture.awayClub ?? { name: fixture.awayClubName ?? fixture.away });
    const hasScore = source === 'lastFixtures' && Number.isFinite(fixture.homeGoals) && Number.isFinite(fixture.awayGoals);
    return {
      id: fixture.fixtureId ?? `fixture_${source}_${fixtureWeek}_${slugId(home.name)}_${slugId(away.name)}_${index}`,
      fixture_id: fixture.fixtureId ?? null,
      season_id: getSeasonId(getSeasonNumberFromWeek(fixtureWeek)),
      week: fixtureWeek,
      season_week: getSeasonWeekFromWeek(fixtureWeek),
      source,
      status: source === 'lastFixtures' ? 'played' : 'scheduled',
      competition: fixture.isFriendly ? 'friendly' : fixture.competition ?? 'league',
      country_code: fixture.countryCode ?? home.country_code ?? away.country_code ?? null,
      club_id: home.id,
      home_club_id: home.id,
      home_club_name: home.name,
      away_club_id: away.id,
      away_club_name: away.name,
      home_goals: hasScore ? fixture.homeGoals : null,
      away_goals: hasScore ? fixture.awayGoals : null,
      score: hasScore ? `${fixture.homeGoals}-${fixture.awayGoals}` : null,
      is_friendly: Boolean(fixture.isFriendly),
      raw: fixture,
    };
  };

  return [
    ...safeArray(state.lastFixtures).map((fixture, index) => mapFixture(fixture, 'lastFixtures', index)),
    ...safeArray(state.nextFixtures).map((fixture, index) => mapFixture(fixture, 'nextFixtures', index)),
  ];
};

const inferCompetitionLabel = (match = {}) => {
  if (match.competitionLabel) return match.competitionLabel;
  if (match.competition === 'CL') return 'Ligue des Champions';
  if (match.competition === 'EL') return 'Europa League';
  if (match.competition === 'ECL') return 'Conference League';
  if (match.competition === 'world_cup') return 'Coupe du Monde';
  return match.isFriendly ? 'Match amical' : 'Championnat';
};

const buildMatchResultRows = (state = {}, season = 1, week = 1) => {
  const rosterRows = safeArray(state.roster).flatMap((player) => safeArray(player.matchHistory).map((match, index) => {
    const matchWeek = match.week ?? week;
    return {
      id: `match_${player.id}_${match.fixtureId ?? match.id ?? slugId(match.competition ?? 'league')}_${matchWeek}_${index}`,
      player_id: player.id,
      player_name: match.playerName ?? playerName(player),
      week: matchWeek,
      season_id: getSeasonId(getSeasonNumberFromWeek(matchWeek)),
      season_week: getSeasonWeekFromWeek(matchWeek),
      competition: match.competition ?? (match.isFriendly ? 'friendly' : 'league'),
      competition_label: inferCompetitionLabel(match),
      phase: match.phase ?? null,
      stage: match.stage ?? null,
      club_id: clubIdFromName(match.club ?? player.club),
      club_name: match.club ?? player.club ?? null,
      opponent: match.opponentName ?? match.opponent ?? null,
      opponent_country: match.opponentCountry ?? null,
      home_away: match.homeAway ?? null,
      score: match.score ?? null,
      goals_for: match.goalsFor ?? null,
      goals_against: match.goalsAgainst ?? null,
      result: match.result ?? null,
      minutes: match.minutes ?? 0,
      goals: match.goals ?? 0,
      assists: match.assists ?? 0,
      saves: match.saves ?? 0,
      tackles: match.tackles ?? 0,
      key_passes: match.keyPasses ?? 0,
      xg: match.xg ?? null,
      pass_accuracy: match.passAccuracy ?? null,
      match_rating: match.matchRating ?? null,
      selection_status: match.selectionStatus ?? null,
      absence_reason: match.absenceReason ?? null,
      report: match.matchReport ?? null,
      incidents: safeArray(match.incidents),
      raw: match,
    };
  }));

  const worldCupRows = safeArray(state.worldCupState?.results).map((match, index) => {
    const matchWeek = match.week ?? week;
    return {
      id: match.id ?? `match_wc_${match.playerId ?? 'player'}_${matchWeek}_${index}`,
      player_id: match.playerId ?? null,
      player_name: match.playerName ?? null,
      week: matchWeek,
      season_id: getSeasonId(season),
      season_week: getSeasonWeekFromWeek(matchWeek),
      competition: 'world_cup',
      competition_label: 'Coupe du Monde',
      phase: match.phase ?? state.worldCupState?.phase ?? null,
      stage: match.phase ?? null,
      club_id: null,
      club_name: match.countryName ?? null,
      opponent: match.opponent ?? null,
      opponent_country: match.opponentFlag ?? null,
      home_away: 'International',
      score: match.score ?? null,
      goals_for: match.score ? Number(String(match.score).split('-')[0]) : null,
      goals_against: match.score ? Number(String(match.score).split('-')[1]) : null,
      result: match.result ?? null,
      minutes: match.minutes ?? 0,
      goals: match.goals ?? 0,
      assists: match.assists ?? 0,
      saves: match.saves ?? 0,
      tackles: match.tackles ?? 0,
      key_passes: match.keyPasses ?? 0,
      xg: null,
      pass_accuracy: null,
      match_rating: match.matchRating ?? null,
      selection_status: match.starter ? 'titulaire' : 'remplaçant',
      absence_reason: null,
      report: match.matchReport ?? null,
      incidents: [],
      raw: match,
    };
  });

  return [...rosterRows, ...worldCupRows];
};

const buildLeagueTableRows = (state = {}, season = 1) =>
  Object.entries(state.leagueTables ?? {}).flatMap(([countryCode, table]) =>
    Object.values(table ?? {})
      .sort((a, b) =>
        (b.points ?? 0) - (a.points ?? 0)
        || ((b.goalsFor ?? 0) - (b.goalsAgainst ?? 0)) - ((a.goalsFor ?? 0) - (a.goalsAgainst ?? 0))
        || (b.goalsFor ?? 0) - (a.goalsFor ?? 0)
        || String(a.club ?? '').localeCompare(String(b.club ?? '')),
      )
      .map((row, index) => ({
        id: `league_row_${season}_${countryCode}_${slugId(row.club)}`,
        season_id: getSeasonId(season),
        country_code: countryCode,
        club_id: clubIdFromName(row.club),
        club_name: row.club ?? null,
        position: index + 1,
        played: row.played ?? 0,
        wins: row.win ?? 0,
        draws: row.draw ?? 0,
        losses: row.loss ?? 0,
        goals_for: row.goalsFor ?? 0,
        goals_against: row.goalsAgainst ?? 0,
        goal_difference: (row.goalsFor ?? 0) - (row.goalsAgainst ?? 0),
        points: row.points ?? 0,
        form: safeArray(row.form),
      })));

const buildClubSeasonHistoryRows = (state = {}, season = 1) =>
  Object.entries(state.clubSeasonHistory ?? {}).map(([clubName, history]) => ({
    id: `club_season_${season}_${slugId(clubName)}`,
    club_id: clubIdFromName(clubName),
    club_name: clubName,
    season_id: getSeasonId(history?.season ?? season),
    country_code: history?.countryCode ?? null,
    european_competition: history?.competition ?? null,
    league_history: safeArray(history?.league),
    europe_history: safeArray(history?.europe),
    summary: safeArray(history?.summary),
  }));

const buildClubMemoryRows = (state = {}) =>
  Object.entries(state.clubMemory ?? {}).map(([clubName, memory]) => ({
    id: `club_memory_${slugId(clubName)}`,
    club_id: clubIdFromName(clubName),
    club_name: clubName,
    trust: memory?.trust ?? 50,
    blocks: memory?.blocks ?? 0,
    lies: memory?.lies ?? 0,
    promises_broken: memory?.promisesBroken ?? 0,
    last_week: memory?.lastWeek ?? 0,
    raw: memory ?? {},
  }));

const buildClubRelationRows = (state = {}) =>
  Object.entries(state.clubRelations ?? {}).map(([clubName, score]) => ({
    id: `club_relation_${slugId(clubName)}`,
    club_id: clubIdFromName(clubName),
    club_name: clubName,
    relation_score: score ?? 0,
  }));

const buildDossierMemoryRows = (state = {}) => {
  const memory = state.dossierMemory ?? {};
  const buckets = [
    ['player', memory.players ?? {}],
    ['club', memory.clubs ?? {}],
    ['media', memory.media ?? {}],
  ];

  return buckets.flatMap(([scope, entries]) =>
    Object.entries(entries ?? {}).flatMap(([key, entry]) => {
      const recent = safeArray(entry?.recent);
      const base = {
        scope,
        player_id: scope === 'player' ? key : null,
        club_id: scope === 'club' ? clubIdFromName(key) : null,
        club_name: scope === 'club' ? key : null,
        media_id: scope === 'media' ? key : null,
        heat: entry?.heat ?? 50,
        last_week: entry?.lastWeek ?? 0,
        raw_entry: entry ?? {},
      };
      if (!recent.length) {
        return [{
          id: `dossier_${scope}_${slugId(key)}_summary`,
          ...base,
          week: entry?.lastWeek ?? 0,
          type: 'summary',
          label: '',
          impact: 0,
        }];
      }
      return recent.map((event, index) => ({
        id: event.id ?? `dossier_${scope}_${slugId(key)}_${event.week ?? entry?.lastWeek ?? 0}_${index}`,
        ...base,
        week: event.week ?? entry?.lastWeek ?? 0,
        type: event.type ?? 'note',
        label: event.label ?? '',
        impact: event.impact ?? 0,
        raw: event,
      }));
    }));
};

const buildDecisionHistoryRows = (state = {}, season = 1, week = 1) =>
  safeArray(state.decisionHistory).map((decision, index) => ({
    id: decision.id ?? `decision_${decision.week ?? week}_${index}`,
    season_id: getSeasonId(getSeasonNumberFromWeek(decision.week ?? week)),
    week: decision.week ?? week,
    type: decision.type ?? 'decision',
    label: decision.label ?? '',
    detail: decision.detail ?? '',
    player_id: decision.playerId ?? null,
    player_name: decision.playerName ?? null,
    club_id: clubIdFromName(decision.clubName ?? decision.club),
    club_name: decision.clubName ?? decision.club ?? null,
    effect_money: decision.money ?? decision.effectMoney ?? 0,
    effect_reputation: decision.rep ?? decision.reputation ?? decision.effectReputation ?? 0,
    raw: decision,
  }));

const buildContactRows = (state = {}) =>
  safeArray(state.contacts).map((contact) => ({
    id: contact.id ?? `contact_${slugId(contact.name)}`,
    type: contact.type ?? null,
    name: contact.name ?? '',
    club_id: clubIdFromName(contact.club),
    club_name: contact.club ?? null,
    country_code: contact.country ?? null,
    trust: contact.trust ?? 0,
    cooldown_week: contact.cooldownWeek ?? 0,
    specialty: contact.specialty ?? null,
    stance: contact.stance ?? null,
    bio: contact.bio ?? '',
    raw: contact,
  }));

const buildAgencyGoalRows = (state = {}, agencyId = defaultAgency.id) =>
  safeArray(state.agencyGoals).map((goal) => {
    const currentValue = goal.metric === 'FR'
      ? state.leagueReputation?.FR ?? 0
      : goal.metric === 'EU'
        ? roundNumber(['FR', 'ES', 'GB', 'DE', 'IT'].reduce((sum, code) => sum + (state.leagueReputation?.[code] ?? 0), 0) / 5, 0)
        : state.reputation ?? 0;
    return {
      id: goal.id ?? `agency_goal_${goal.metric ?? slugId(goal.label)}`,
      agency_id: agencyId,
      metric: goal.metric ?? 'GLOBAL',
      label: goal.label ?? '',
      target_value: goal.target ?? 0,
      current_value: currentValue,
      reward_money: goal.reward ?? goal.rewardMoney ?? 0,
      completed: currentValue >= (goal.target ?? Infinity),
    };
  });

const buildWorldStateRows = (state = {}, season = 1, week = 1) => state.worldState ? [{
  id: `world_state_${season}`,
  season_id: getSeasonId(season),
  week,
  economy: state.worldState.economie ?? null,
  trend: state.worldState.tendance ?? null,
  scandal_media: Boolean(state.worldState.scandal_media),
  world_cup_year: Boolean(state.worldState.coupe_du_monde),
  european_phase: Boolean(state.worldState.phase_europeenne),
  hot_leagues: safeArray(state.worldState.leagues_en_feu),
  raw: state.worldState,
}] : [];

const buildWorldCupRows = (state = {}, season = 1, week = 1) => state.worldCupState ? [{
  id: `world_cup_${state.worldCupState.year ?? season}`,
  season_id: getSeasonId(state.worldCupState.season ?? season),
  week,
  year: state.worldCupState.year ?? null,
  phase: state.worldCupState.phase ?? null,
  week_offset: state.worldCupState.weekOffset ?? 0,
  selected_count: safeArray(state.worldCupState.selectedPlayers).length,
  selected_players: safeArray(state.worldCupState.selectedPlayers),
  draw_groups: state.worldCupState.drawGroups ?? {},
  country_pressure: state.worldCupState.countryPressure ?? {},
  results: safeArray(state.worldCupState.results),
  champion: state.worldCupState.champion ?? null,
  heritage_cards: safeArray(state.worldCupState.heritageCards),
  next_featured_match: state.worldCupState.nextFeaturedMatch ?? null,
}] : [];

const buildEuropeanCompetitionRows = (state = {}, season = 1) =>
  Object.entries(state.europeanCupData ?? {}).map(([key, data]) => ({
    id: `europe_${slugId(key)}`,
    season_id: getSeasonId(data?.season ?? season),
    competition: data?.competition ?? key.split(':')[0] ?? null,
    competition_key: key,
    opponent_history: data?.opponentHistory ?? {},
    ko_path: data?.koPath ?? {},
    bracket_clubs: data?.bracketClubs ?? null,
    raw: data ?? {},
  }));

const buildNarrativeRows = (state = {}) =>
  safeArray(state.activeNarratives).map((arc) => ({
    id: arc.id ?? `arc_${slugId(`${arc.type ?? 'arc'}_${arc.playerId ?? arc.club ?? ''}`)}`,
    type: arc.type ?? null,
    player_id: arc.playerId ?? null,
    player_name: arc.playerName ?? null,
    club_id: clubIdFromName(arc.club),
    club_name: arc.club ?? null,
    origin: arc.origin ?? null,
    started_week: arc.startedWeek ?? null,
    weeks_left: arc.weeksLeft ?? 0,
    intensity: arc.intensity ?? 1,
  }));

const buildSeasonAwardRows = (state = {}) =>
  Object.entries(state.seasonAwards ?? {}).map(([seasonKey, awards]) => ({
    id: `season_awards_${seasonKey}`,
    season_id: getSeasonId(Number(seasonKey) || seasonKey),
    awards,
  }));

const buildSeasonRows = (state = {}, week = 1) => [{
  id: getSeasonId(getSeasonNumberFromWeek(week)),
  number: getSeasonNumberFromWeek(week),
  start_date: makeGameStamp(getSeasonNumberFromWeek(week), 1),
  end_date: makeGameStamp(getSeasonNumberFromWeek(week), 38),
  phase: state.worldCupState && state.worldCupState.phase !== 'done' ? 'Coupe du Monde' : 'Saison régulière',
  active: true,
}];

const createCatalogPlayerRows = () =>
  createPlayerCatalog(1).map((player) => ({
    ...player,
    catalogSeason: player.catalogSeason ?? 1,
    catalogBaseAge: player.catalogBaseAge ?? player.age ?? 24,
    catalogBaseRating: player.catalogBaseRating ?? player.rating ?? 60,
    catalogBasePotential: player.catalogBasePotential ?? player.potential ?? player.rating ?? 60,
    databaseSource: player.databaseSource ?? 'seed',
  }));

export const createGameCatalog = () => {
  const catalogPlayers = createCatalogPlayerRows();
  return {
    countries: createCountryRows(),
    cities: createCityRows(),
    leagues: createLeagueRows(),
    clubs: createClubRows(),
    catalog_players: catalogPlayers,
    players: catalogPlayers,
    personalities: createPersonalityRows(),
    event_templates: createEventTemplateRows(),
    staff_roles: Object.entries(STAFF_ROLES).map(([key, role]) => ({
      id: key,
      label: role.label,
      description: role.desc,
      cost: role.cost,
      weekly_cost: role.weeklyCost,
      max_level: role.maxLevel,
    })),
    agency_defaults: [createDefaultAgencyRecord()],
  };
};

export const createGameDatabaseSnapshot = (state = {}) => {
  const week = state.week ?? 1;
  const season = getSeasonNumberFromWeek(week);
  const agency = createDefaultAgencyRecord({
    id: state.agencyProfile?.id ?? defaultAgency.id,
    name: state.agencyProfile?.name ?? defaultAgency.name,
    country: state.agencyProfile?.country ?? state.agencyProfile?.countryLabel ?? defaultAgency.country,
    country_code: state.agencyProfile?.countryCode ?? defaultAgency.country_code,
    city: state.agencyProfile?.city ?? defaultAgency.city,
    director_name: state.agencyProfile?.ownerName ?? defaultAgency.director_name,
    emblem: state.agencyProfile?.emblem ?? defaultAgency.emblem,
    color: state.agencyProfile?.color ?? defaultAgency.color,
    positioning: state.agencyProfile?.style ?? defaultAgency.positioning,
    difficulty: state.difficulty ?? defaultAgency.difficulty,
    start_profile: state.startProfile ?? defaultAgency.start_profile,
    money: state.money ?? defaultAgency.money,
    reputation: state.reputation ?? defaultAgency.reputation,
    credibility: state.credibility ?? defaultAgency.credibility,
    agency_level: state.agencyLevel ?? defaultAgency.agency_level,
    capacity_max: getAgencyCapacity(state.agencyLevel ?? defaultAgency.agency_level),
    current_season: season,
    current_week: week,
    updated_at: makeGameStamp(season, week),
  });

  const players = buildPlayerTables(state, season, week, agency.id);
  const messages = buildMessageRows(state, season, week);
  const relationships = buildRelationships(players, agency.id);
  const contracts = buildContractRows(players, season);
  const newsPosts = buildNewsRows(state, season, week);
  const eventInstances = safeArray(state.pendingChainedEvents).map((event, index) => ({
    id: event.id ?? `event_${index}`,
    template_id: event.templateId ?? event.code ?? null,
    agency_id: agency.id,
    player_id: event.playerId ?? null,
    club_id: event.clubId ?? null,
    season_id: getSeasonId(season),
    status: event.status ?? 'open',
    triggered_at_week: event.week ?? week,
    resolved: Boolean(event.resolved),
    choice_made: event.choice ?? null,
    impact_money: event.impactMoney ?? 0,
    impact_reputation: event.impactReputation ?? 0,
    impact_moral: event.impactMoral ?? 0,
    impact_trust: event.impactTrust ?? 0,
    impact_popularity: event.impactPopularity ?? 0,
    impact_injury: event.impactInjury ?? 0,
    resolved_at: event.resolvedAt ?? null,
  }));
  const negotiations = buildNegotiationRows(state, players, season, week);
  const clubOffers = buildClubOfferRows(state, season, week, agency.id);
  const fixtures = buildFixtureRows(state, season, week);
  const matchResults = buildMatchResultRows(state, season, week);

  return {
    agency: [agency],
    agency_upgrades: [{
      agency_id: agency.id,
      scouting_level: state.office?.scoutLevel ?? 0,
      lawyer_level: state.office?.lawyerLevel ?? 0,
      communication_level: state.office?.mediaLevel ?? 0,
      network_level: state.staff?.scoutAfrica ?? 0,
      analyst_level: state.staff?.dataAnalyst ?? 0,
      medical_level: state.staff?.playerCare ?? 0,
      sponsor_level: state.staff?.communityManager ?? 0,
    }],
    staff: Object.entries(createDefaultStaff()).map(([role, level]) => ({
      id: `staff_${role}`,
      agency_id: agency.id,
      role,
      name: STAFF_ROLES[role]?.label ?? role,
      level: state.staff?.[role] ?? level,
      specialty: STAFF_ROLES[role]?.desc ?? '',
      salary_cost: STAFF_ROLES[role]?.weeklyCost ?? 0,
      active: (state.staff?.[role] ?? level) > 0,
    })),
    countries: createCountryRows(),
    cities: createCityRows(),
    leagues: createLeagueRows(),
    clubs: createClubRows(),
    personalities: createPersonalityRows(),
    players,
    player_agent_relationships: relationships,
    careers: buildCareerRows(players, season),
    contracts,
    transfers: safeArray(state.pendingTransfers).map((transfer, index) => ({
      id: transfer.id ?? `transfer_${transfer.playerId ?? 'player'}_${transfer.effectiveWeek ?? week}_${index}`,
      player_id: transfer.playerId ?? null,
      from_club_id: transfer.offer?.fromClubId ?? null,
      to_club_id: transfer.offer?.club ? `club_${slugId(transfer.offer.club)}` : null,
      transfer_type: transfer.offer?.type ?? 'transfer',
      fee: transfer.offer?.amount ?? 0,
      agent_commission: transfer.agreement?.commission ?? 0,
      transfer_date: transfer.effectiveWeek ?? week,
      season_id: getSeasonId(season),
      result: 'pending',
      context: transfer.offer?.context ?? '',
    })),
    loans: safeArray(state.loans).map((loan, index) => ({
      id: loan.id ?? `loan_${index}`,
      player_id: loan.playerId ?? null,
      from_club_id: loan.fromClubId ?? null,
      to_club_id: loan.toClubId ?? null,
      start_date: loan.startDate ?? null,
      end_date: loan.endDate ?? null,
      buy_option: Boolean(loan.buyOption),
      buy_obligation: Boolean(loan.buyObligation),
      salary_covered: loan.salaryCovered ?? null,
      agent_commission: loan.agentCommission ?? 0,
      status: loan.status ?? 'active',
    })),
    negotiations,
    negotiation_turns: buildNegotiationTurnRows(state, season, week),
    seasons: buildSeasonRows(state, week),
    objectives: safeArray(state.seasonObjectives).map((objective, index) => ({
      id: objective.id ?? `objective_${index}`,
      agency_id: agency.id,
      season_id: getSeasonId(season),
      type_objectif: objective.type ?? objective.metric ?? 'generic',
      label: objective.label ?? '',
      target_value: objective.target ?? objective.targetValue ?? 0,
      current_value: objective.current ?? objective.currentValue ?? 0,
      reward_money: objective.rewardMoney ?? objective.reward ?? 0,
      reward_reputation: objective.rewardReputation ?? 0,
      completed: Boolean(objective.completed),
      completed_at: objective.completedAt ?? null,
    })),
    event_templates: createEventTemplateRows(),
    event_instances: eventInstances,
    messages,
    message_choices: buildMessageChoiceRows(state),
    chosen_message_responses: buildMessageResponseRows(state),
    news_posts: newsPosts,
    sponsors: safeArray(state.sponsors).map((sponsor, index) => ({
      id: sponsor.id ?? `sponsor_${index}`,
      agency_id: agency.id,
      player_id: sponsor.playerId ?? null,
      sponsor_type: sponsor.type ?? 'club',
      brand: sponsor.brand ?? '',
      amount: sponsor.amount ?? 0,
      reputation_impact: sponsor.reputationImpact ?? 0,
      start_date: sponsor.startDate ?? null,
      end_date: sponsor.endDate ?? null,
      status: sponsor.status ?? 'active',
    })),
    rival_agents: buildRivalAgentRows(state, agency.id),
    rival_agent_relations: buildRivalRelationsRows(state, agency.id),
    scouting_reports: buildScoutingRows(state, season, week, agency.id),
    promises: buildPromiseRows(state, agency.id),
    club_offers: clubOffers,
    fixtures,
    match_results: matchResults,
    league_table_rows: buildLeagueTableRows(state, season),
    club_season_history: buildClubSeasonHistoryRows(state, season),
    club_memory: buildClubMemoryRows(state),
    club_relations: buildClubRelationRows(state),
    dossier_memory: buildDossierMemoryRows(state),
    decision_history: buildDecisionHistoryRows(state, season, week),
    contacts: buildContactRows(state),
    agency_goals: buildAgencyGoalRows(state, agency.id),
    world_states: buildWorldStateRows(state, season, week),
    world_cups: buildWorldCupRows(state, season, week),
    european_competitions: buildEuropeanCompetitionRows(state, season),
    narrative_arcs: buildNarrativeRows(state),
    season_awards: buildSeasonAwardRows(state),
    saves: [{
      id: `save_${agency.id}`,
      agency_id: agency.id,
      slot_save: 1,
      current_season_id: getSeasonId(season),
      current_week: week,
      updated_at: makeGameStamp(season, week),
    }],
    indexes: {
      players: {
        club_id: compoundIndex(players.filter((player) => player.club_current_id), ['club_current_id']),
        status: groupIndex(players, 'career_status'),
      },
      player_agent_relationships: {
        agency_id: indexBy(relationships, 'agency_id'),
      },
      contracts: {
        end_date: indexBy(contracts, 'end_date'),
      },
      messages: {
        agency_id_status: compoundIndex(messages, ['agency_id', 'status']),
      },
      news_posts: {
        agency_id_created_at: compoundIndex(newsPosts, ['agency_id', 'created_at']),
      },
      event_instances: {
        agency_id_status: compoundIndex(eventInstances, ['agency_id', 'status']),
      },
      negotiations: {
        agency_id_status: compoundIndex(negotiations, ['agency_id', 'status']),
      },
      club_offers: {
        status: groupIndex(clubOffers, 'status'),
      },
      fixtures: {
        week: groupIndex(fixtures, 'week'),
      },
      match_results: {
        player_id: groupIndex(matchResults, 'player_id'),
      },
    },
  };
};
