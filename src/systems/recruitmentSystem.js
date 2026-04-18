import { createMessage } from './messageSystem';
import { applyReputationChange } from './reputationSystem';
import { addDecisionHistory, applyCredibilityChange, applyPlayerSegmentReputation, getPlayerSegment } from './agencyReputationSystem';
import { applyLeagueReputation } from './leagueReputationSystem';
import { signPlayer } from '../game/gameLogic';
import { clamp } from '../utils/helpers';

export const RECRUITMENT_PITCHES = [
  {
    id: 'sportif',
    label: 'Projet sportif',
    short: 'Minutes, progression, rôle',
    desc: 'On met le temps de jeu, la trajectoire et le statut dans le club au centre.',
  },
  {
    id: 'stability',
    label: 'Stabilité familiale',
    short: 'Ville, rythme, sérénité',
    desc: 'On insiste sur la ville, la vie hors terrain et un projet lisible sur plusieurs saisons.',
  },
  {
    id: 'ambition',
    label: 'Ambition & visibilité',
    short: 'Europe, exposition, valeur',
    desc: 'On vend le niveau, les grandes affiches et la montée en valeur de marque.',
  },
  {
    id: 'financial',
    label: 'Sécurité financière',
    short: 'Salaire, bonus, protection',
    desc: 'On pousse la partie salaire, bonus de signature et stabilité contractuelle.',
  },
];

const getThreshold = (player, state) => {
  const base = player.rating >= 80 ? 74 : player.rating >= 70 ? 66 : 58;
  const difficultyPenalty = state.difficulty === 'hardcore' ? 7 : state.difficulty === 'facile' ? -6 : 0;
  return base + difficultyPenalty;
};

const getPitchBonus = (player, pitchId) => {
  const priorities = player.recruitmentPriorities ?? [];
  const goals = player.careerGoal?.id ?? '';

  const pitchBonuses = {
    sportif: 0,
    stability: 0,
    ambition: 0,
    financial: 0,
  };

  if (priorities.includes('Temps de jeu') || goals === 'starter') pitchBonuses.sportif += 14;
  if (priorities.includes('Stabilité familiale')) pitchBonuses.stability += 14;
  if (priorities.includes('Ambition sportive') || goals === 'europe' || goals === 'national') pitchBonuses.ambition += 14;
  if (priorities.includes('Salaire') || goals === 'salary') pitchBonuses.financial += 14;
  if (priorities.includes('Visibilité')) pitchBonuses.ambition += 6;
  if (priorities.includes('Projet durable')) pitchBonuses.stability += 6;

  const personalityBoosts = {
    sportif: ['professionnel', 'leader'].includes(player.personality) ? 8 : 0,
    stability: ['loyal', 'professionnel'].includes(player.personality) ? 8 : 0,
    ambition: ['ambitieux', 'professionnel'].includes(player.personality) ? 8 : 0,
    financial: ['mercenaire', 'fetard'].includes(player.personality) ? 8 : 0,
  };

  const pitchFit = {
    sportif: pitchBonuses.sportif + personalityBoosts.sportif - (player.benchFear > 70 ? -6 : 0),
    stability: pitchBonuses.stability + personalityBoosts.stability + (player.familyInfluence > 60 ? 6 : 0),
    ambition: pitchBonuses.ambition + personalityBoosts.ambition + (player.hiddenAmbition > 70 ? 6 : 0),
    financial: pitchBonuses.financial + personalityBoosts.financial + (player.personality === 'mercenaire' ? 10 : 0),
  };

  return pitchFit[pitchId] ?? 0;
};

const getAgencyBonus = (state, player) => {
  const profile = state.agencyProfile ?? {};
  const cityMatch = (player.preferredCities ?? []).includes(profile.city) ? 10 : 0;
  const countryMatch = (player.preferredCountries ?? []).includes(profile.countryCode) ? 10 : 0;
  const repBonus = Math.floor((state.reputation ?? 0) / 8);
  const credBonus = Math.floor((state.credibility ?? 50) / 12);
  const marketReachBonus = profile.countryCode === player.countryCode ? 4 : 0;
  return cityMatch + countryMatch + repBonus + credBonus + marketReachBonus;
};

export const getRecruitmentPreview = (state, player, pitchId) => {
  if (!player) return null;
  const pitch = RECRUITMENT_PITCHES.find((item) => item.id === pitchId) ?? RECRUITMENT_PITCHES[0];
  const threshold = getThreshold(player, state);
  const pitchBonus = getPitchBonus(player, pitch.id);
  const agencyBonus = getAgencyBonus(state, player);
  const dealBreakerPenalty = (player.recruitmentDealBreakers ?? []).length * 3;
  const fit = clamp(Math.round(32 + pitchBonus + agencyBonus - dealBreakerPenalty), 0, 100);
  const chance = clamp(Math.round(50 + (fit - threshold) * 1.5), 10, 95);

  return {
    pitch,
    threshold,
    fit,
    chance,
    reasons: [
      ...(player.recruitmentPriorities ?? []).slice(0, 3).map((item) => `Priorité: ${item}`),
      ...(player.recruitmentDealBreakers ?? []).slice(0, 3).map((item) => `Point sensible: ${item}`),
    ],
  };
};

export const recruitPlayer = (state, playerId, pitchId = 'sportif') => {
  const player = state.market.find((item) => item.id === playerId) ?? state.freeAgents.find((item) => item.id === playerId);
  if (!player) return { state, error: 'Joueur introuvable' };

  const preview = getRecruitmentPreview(state, player, pitchId);
  if (!preview) return { state, error: 'Impossible d\'évaluer ce dossier' };
  const threshold = preview.threshold;
  const fit = preview.fit;
  const successChance = clamp(0.28 + (fit - threshold) / 120, 0.15, 0.92);
  const accepted = fit >= threshold && Math.random() < successChance;

  if (!accepted) {
    return {
      state: {
        ...state,
        credibility: applyCredibilityChange(state.credibility, -1),
        decisionHistory: addDecisionHistory(state.decisionHistory, {
          week: state.week,
          type: 'recrutement',
          label: 'Recrutement refusé',
          detail: `${player.firstName} ${player.lastName} n'a pas été convaincu par l'approche ${preview.pitch.label}.`,
          playerId,
          playerName: `${player.firstName} ${player.lastName}`,
        }),
        messages: [
          createMessage({ player, type: 'complaint', week: state.week, context: 'recruitment_refused' }),
          ...state.messages,
        ].slice(0, 40),
      },
      error: `${player.firstName} ${player.lastName} veut un dossier plus cohérent`,
    };
  }

  const costMultiplier = clamp(1.08 - (fit - threshold) / 220, 0.82, 1.1);
  const signedPlayer = {
    ...player,
    signingCost: Math.floor(player.signingCost * costMultiplier),
    recruitmentPitch: preview.pitch.id,
    recruitmentFit: fit,
    recruitmentChance: preview.chance,
    recruitmentPriorities: player.recruitmentPriorities ?? [],
    recruitmentDealBreakers: player.recruitmentDealBreakers ?? [],
    careerStatus: 'recruté',
    signReason: preview.pitch.label,
  };
  const result = signPlayer(state, signedPlayer);
  if (result.error) return result;

  const nextRoster = result.state.roster.map((item) =>
    item.id === player.id
      ? {
          ...item,
          recruitmentPitch: preview.pitch.id,
          recruitmentFit: fit,
          recruitmentChance: preview.chance,
          careerStatus: 'recruté',
          activeActions: [{ type: 'recruitment', label: preview.pitch.label }, ...(item.activeActions ?? [])].slice(0, 5),
          timeline: [{ week: state.week, type: 'recrutement', label: `Recruté via ${preview.pitch.label}` }, ...(item.timeline ?? [])].slice(0, 18),
        }
      : item,
  );

  return {
    state: {
      ...result.state,
      roster: nextRoster,
      credibility: applyCredibilityChange(result.state.credibility, fit >= 80 ? 2 : 1),
      reputation: applyReputationChange(result.state.reputation, fit >= 80 ? 1 : 0),
      playerSegmentReputation: applyPlayerSegmentReputation(
        result.state.playerSegmentReputation,
        getPlayerSegment(player),
        fit >= 80 ? 2 : 1,
      ),
      countryReputation: applyLeagueReputation(result.state.countryReputation, player.countryCode, fit >= 75 ? 2 : 1),
      decisionHistory: addDecisionHistory(result.state.decisionHistory, {
        week: state.week,
        type: 'recrutement',
        label: 'Recrutement réussi',
        detail: `${player.firstName} ${player.lastName} rejoint l'agence via ${preview.pitch.label}. Fit ${fit}/100.`,
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
      }),
    },
    preview,
  };
};

