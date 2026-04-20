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
  const clubId = player.club && player.club !== 'Libre' ? `club_${slugId(player.club)}` : null;
  const countryId = player.countryCode ? `country_${player.countryCode.toLowerCase()}` : null;
  const personalityId = player.personality ? `personality_${player.personality}` : null;
  const marketStatus = source === 'market' ? 'market' : source === 'freeAgent' ? 'free_agent' : 'roster';
  const careerStatus = player.freeAgent || player.club === 'Libre' ? 'free' : player.injured > 0 ? 'injured' : 'active';
  return {
    id: player.id,
    agency_id: agencyId,
    source,
    first_name: player.firstName ?? '',
    last_name: player.lastName ?? '',
    nationality: player.countryLabel ?? '',
    country_id: countryId,
    origin_city: player.birthPlace ?? player.clubCity ?? null,
    age: player.age ?? null,
    birth_date: player.birthDate ?? null,
    main_position: player.position ?? null,
    secondary_position: player.secondaryPosition ?? null,
    personality_id: personalityId,
    club_current_id: clubId,
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
    date_created: player.createdAt ?? makeGameStamp(season, week),
    date_updated: makeGameStamp(season, week),
  };
};

const buildPlayerTables = (state = {}, season = 1, week = 1, agencyId = defaultAgency.id) => {
  const used = new Map();
  const sources = [
    ['roster', state.roster ?? []],
    ['market', state.market ?? []],
    ['freeAgent', state.freeAgents ?? []],
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

const buildCareerRows = (players = [], season = 1) => players.map((player) => ({
  id: `career_${player.id}_${season}`,
  player_id: player.id,
  season_id: `season_${season}`,
  club_id: player.club_current_id,
  matches: player.match_history?.length ?? 0,
  goals: player.goals ?? 0,
  passes: player.assists ?? 0,
  clean_sheets: player.position === 'GK' ? (player.cleanSheets ?? 0) : null,
  note_average: player.averageRating ?? null,
  playing_time: player.minutes ?? null,
  trophies: player.trophies ?? 0,
  injuries: player.injury_current ?? 0,
  cards: player.cards ?? 0,
  value_start: player.value_start ?? player.market_value ?? null,
  value_end: player.market_value ?? null,
}));

const buildContractRows = (players = [], season = 1) => players
  .filter((player) => player.market_status === 'roster')
  .map((player) => ({
    id: `contract_${player.id}`,
    player_id: player.id,
    club_id: player.club_current_id,
    start_date: player.contractStartWeek ?? makeGameStamp(season, 1),
    end_date: player.contractWeeksLeft ? `S${season}+${player.contractWeeksLeft}` : null,
    salary_weekly: player.salary_weekly ?? 0,
    signing_bonus: player.signingBonus ?? 0,
    bonus: player.bonus ?? 0,
    release_clause: player.releaseClause ?? null,
    sell_on_percentage: player.sellOnPercentage ?? null,
    promised_role: player.clubRole ?? null,
    no_cut_clause: Boolean(player.noCutClause),
    role_protection: Boolean(player.roleProtection),
    status: player.freeAgent ? 'free' : 'active',
  }));

const buildNegotiationRows = (state = {}, players = [], season = 1, week = 1) => (state.clubOffers ?? []).map((offer) => ({
  id: `nego_${offer.id}`,
  agency_id: defaultAgency.id,
  player_id: offer.playerId,
  club_id: `club_${slugId(offer.club)}`,
  type: offer.offerType ?? offer.type ?? 'transfer',
  status: offer.status ?? 'open',
  interest_current: offer.interest ?? 0,
  offer_current: offer.amount ?? offer.signingCost ?? 0,
  salary_proposed: offer.salary ?? null,
  bonus_proposed: offer.bonus ?? null,
  clause_proposed: offer.clause ?? null,
  role_proposed: offer.role ?? null,
  promise_proposed: offer.promise ?? null,
  turns: offer.turns ?? 0,
  fit_score: offer.fitScore ?? null,
  result: offer.result ?? null,
  date_start: makeGameStamp(season, week),
  date_end: offer.closedAt ?? null,
}));

const buildNegotiationTurnRows = (state = {}, season = 1, week = 1) => (state.decisionHistory ?? [])
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

const buildMessageRows = (state = {}, season = 1, week = 1) => (state.messages ?? []).map((message) => ({
  id: message.id ?? `msg_${message.threadKey ?? message.playerId ?? Math.random().toString(36).slice(2)}`,
  agency_id: defaultAgency.id,
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
  status: message.resolved ? 'resolved' : message.read ? 'read' : 'new',
  read: Boolean(message.read),
  archived: Boolean(message.archived),
  date_created: makeGameStamp(season, week),
  date_read: message.read ? makeGameStamp(season, week) : null,
}));

const buildMessageChoiceRows = (state = {}) => (state.messages ?? []).flatMap((message) => (message.responseOptions ?? []).map((choice, index) => ({
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

const buildMessageResponseRows = (state = {}) => (state.messages ?? [])
  .filter((message) => message.responseChosen || message.resolved)
  .map((message) => ({
    id: `response_${message.id}`,
    message_id: message.id,
    choice_id: message.responseChosen?.id ?? null,
    response: message.responseText ?? '',
    date: message.responseAt ?? message.dateRead ?? null,
    effects_applied: message.responseEffects ?? {},
  }));

const buildNewsRows = (state = {}, season = 1, week = 1) => (state.news ?? []).map((post) => ({
  id: post.id ?? `news_${Math.random().toString(36).slice(2)}`,
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

const buildRivalAgentRows = (state = {}, agencyId = defaultAgency.id) => (state.rivalAgents ?? []).map((agent) => ({
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

const buildRivalRelationsRows = (state = {}, agencyId = defaultAgency.id) => (state.competitorThreats ?? []).map((threat, index) => ({
  id: threat.id ?? `rival_rel_${index}`,
  rival_agent_id: threat.rivalAgentId ?? null,
  player_id: threat.playerId ?? null,
  interest_level: threat.heat ?? 0,
  active_attempt: Boolean(threat.active),
  last_approach: threat.lastMoveWeek ?? null,
  agency_id: agencyId,
}));

const buildScoutingRows = (state = {}, season = 1, week = 1, agencyId = defaultAgency.id) => (state.market ?? []).flatMap((player) => player.scoutReport ? [{
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

const buildPromiseRows = (state = {}, agencyId = defaultAgency.id) => (state.promises ?? []).map((promise) => ({
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

const buildSeasonRows = (state = {}, week = 1) => [{
  id: `season_${Math.floor((week - 1) / 38) + 1}`,
  number: Math.floor((week - 1) / 38) + 1,
  start_date: makeGameStamp(Math.floor((week - 1) / 38) + 1, 1),
  end_date: makeGameStamp(Math.floor((week - 1) / 38) + 1, 38),
  phase: state.worldCupState?.active ? 'Coupe du monde' : 'Saison régulière',
  active: true,
}];

export const createGameCatalog = () => ({
  countries: createCountryRows(),
  cities: createCityRows(),
  leagues: createLeagueRows(),
  clubs: createClubRows(),
  players: createPlayerCatalog(1),
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
});

export const createGameDatabaseSnapshot = (state = {}) => {
  const week = state.week ?? 1;
  const season = Math.floor((week - 1) / 38) + 1;
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
    player_agent_relationships: buildRelationships(players, agency.id),
    careers: buildCareerRows(players, season),
    contracts: buildContractRows(players, season),
    transfers: (state.pendingTransfers ?? []).map((transfer) => ({
      id: transfer.id ?? `transfer_${transfer.playerId ?? Math.random().toString(36).slice(2)}`,
      player_id: transfer.playerId ?? null,
      from_club_id: transfer.offer?.fromClubId ?? null,
      to_club_id: transfer.offer?.club ? `club_${slugId(transfer.offer.club)}` : null,
      transfer_type: transfer.offer?.type ?? 'transfer',
      fee: transfer.offer?.amount ?? 0,
      agent_commission: transfer.agreement?.commission ?? 0,
      transfer_date: transfer.effectiveWeek ?? week,
      season_id: `season_${season}`,
      result: 'pending',
      context: transfer.offer?.context ?? '',
    })),
    loans: (state.loans ?? []).map((loan, index) => ({
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
    negotiations: buildNegotiationRows(state, players, season, week),
    negotiation_turns: buildNegotiationTurnRows(state, season, week),
    seasons: buildSeasonRows(state, week),
    objectives: (state.seasonObjectives ?? []).map((objective, index) => ({
      id: objective.id ?? `objective_${index}`,
      agency_id: agency.id,
      season_id: `season_${season}`,
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
    event_instances: (state.pendingChainedEvents ?? []).map((event, index) => ({
      id: event.id ?? `event_${index}`,
      template_id: event.templateId ?? event.code ?? null,
      agency_id: agency.id,
      player_id: event.playerId ?? null,
      club_id: event.clubId ?? null,
      season_id: `season_${season}`,
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
    })),
    messages,
    message_choices: buildMessageChoiceRows(state),
    chosen_message_responses: buildMessageResponseRows(state),
    news_posts: buildNewsRows(state, season, week),
    sponsors: (state.sponsors ?? []).map((sponsor, index) => ({
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
    saves: [{
      id: `save_${agency.id}`,
      agency_id: agency.id,
      slot_save: 1,
      current_season_id: `season_${season}`,
      current_week: week,
      updated_at: makeGameStamp(season, week),
    }],
    indexes: {
      players: {
        club_id: compoundIndex(players.filter((player) => player.club_current_id), ['club_current_id']),
        status: groupIndex(players, 'career_status'),
      },
      player_agent_relationships: {
        agency_id: indexBy(buildRelationships(players, agency.id), 'agency_id'),
      },
      contracts: {
        end_date: indexBy(buildContractRows(players, season), 'end_date'),
      },
      messages: {
        agency_id_status: compoundIndex(messages, ['agency_id', 'status']),
      },
      news_posts: {
        agency_id_created_at: compoundIndex(buildNewsRows(state, season, week), ['agency_id', 'created_at']),
      },
      event_instances: {
        agency_id_status: compoundIndex((state.pendingChainedEvents ?? []).map((event, index) => ({
          id: event.id ?? `event_${index}`,
          agency_id: agency.id,
          status: event.status ?? 'open',
        })), ['agency_id', 'status']),
      },
      negotiations: {
        agency_id_status: compoundIndex(buildNegotiationRows(state, players, season, week), ['agency_id', 'status']),
      },
    },
  };
};
