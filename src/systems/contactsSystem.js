import { makeId, pick, rand } from '../utils/helpers';
import { normalizeAgencyReputation } from './reputationSystem';

const COOLDOWN_WEEKS = 2;

export function createDefaultContacts() {
  return [
    {
      id: 'ds_france', type: 'ds', name: 'Marc Delacroix', club: 'Sporting FC', country: 'FR',
      trust: 40, cooldownWeek: 0, specialty: 'insider',
      bio: "Directeur sportif d'un club de L1. Te donne des infos sur les joueurs qu'ils suivent.",
    },
    {
      id: 'journaliste_protecteur', type: 'journaliste', name: 'Sophie Laurent', club: null, country: 'FR',
      trust: 30, cooldownWeek: 0, specialty: 'media', stance: 'protecteur',
      bio: 'Journaliste bienveillante. Défend souvent les joueurs et les dossiers bien gérés.',
    },
    {
      id: 'journaliste_neutre', type: 'journaliste', name: 'Nabil Benali', club: null, country: 'FR',
      trust: 28, cooldownWeek: 0, specialty: 'media', stance: 'neutre',
      bio: 'Journaliste mercato équilibré. Réagit surtout à la qualité du dossier.',
    },
    {
      id: 'journaliste_agressif', type: 'journaliste', name: 'Camille Roche', club: null, country: 'FR',
      trust: 22, cooldownWeek: 0, specialty: 'media', stance: 'agressif',
      bio: 'Journaliste d’enquête. S’attaque facilement aux dossiers fragiles.',
    },
    {
      id: 'scout_afrique', type: 'scout', name: 'Moussa Diallo', club: null, country: 'SN',
      trust: 35, cooldownWeek: 0, specialty: 'scout',
      bio: 'Scout indépendant en Afrique. Accès à des talents non repérés.',
    },
    {
      id: 'sponsor', type: 'sponsor', name: 'Nike France', club: null, country: 'FR',
      trust: 25, cooldownWeek: 0, specialty: 'commercial',
      bio: 'Responsable partenariats sportifs. Peut signer des deals sponsors pour tes joueurs.',
    },
    {
      id: 'avocat', type: 'avocat', name: 'Jean-Pierre Moreau', club: null, country: 'FR',
      trust: 45, cooldownWeek: 0, specialty: 'legal',
      bio: 'Avocat spécialisé droit sportif. Améliore tes négociations contractuelles.',
    },
  ];
}

function applyContactResult(state, contact) {
  let result = { message: '', stateDelta: {} };

  switch (contact.type) {
    case 'ds': {
      const hasRoster = state.roster?.length > 0;
      if (hasRoster && Math.random() < 0.55) {
        const player = pick(state.roster);
        result.message = `${contact.name} te signale un intérêt de ${contact.club} pour ${player.firstName} ${player.lastName}.`;
        const offer = { id: makeId('offer'), playerId: player.id, club: contact.club, fee: Math.round(player.value * rand(90, 110) / 100), source: 'contact', week: state.week };
        result.stateDelta = { clubOffers: [...(state.clubOffers ?? []), offer] };
      } else {
        const target = pick(state.roster ?? [{ firstName: 'un joueur', lastName: 'suivi' }]);
        result.message = `${contact.name} surveille ${target.firstName ?? 'un'} ${target.lastName ?? ''} pour une future offre.`;
      }
      break;
    }
    case 'journaliste': {
      const stance = contact.stance ?? 'neutre';
      const boostChance = stance === 'protecteur' ? 0.82 : stance === 'agressif' ? 0.38 : 0.62;
      const boost = Math.random() < boostChance;
      const delta = boost
        ? stance === 'protecteur' ? rand(3, 6) : rand(2, 5)
        : stance === 'agressif' ? -rand(3, 5) : -rand(1, 3);
      result.message = boost
        ? `${contact.name} (${stance}) publie un article favorable. Réputation +${delta}.`
        : `${contact.name} (${stance}) sort un papier dur. Réputation ${delta}.`;
      result.stateDelta = { reputation: (state.reputation ?? 30) + delta };
      if (state.roster?.length > 0) {
        const player = pick(state.roster);
        result.publicRepDelta = { playerId: player.id, delta: boost ? rand(3, 7) : -rand(1, 4) };
      }
      break;
    }
    case 'scout': {
      const hiddenPlayer = {
        id: makeId('p'),
        firstName: pick(['Amadou', 'Kofi', 'Ibrahim', 'Seydou', 'Cheikh']),
        lastName: pick(['Diallo', 'Traoré', 'Cissé', 'Koné', 'Touré']),
        rating: rand(62, 74),
        potential: rand(75, 88),
        age: rand(17, 22),
        value: rand(200000, 900000),
        moral: rand(60, 80),
        trust: 50,
        club: null,
        contractWeeksLeft: 0,
        personality: pick(['ambitious', 'loyal', 'mercenary', 'balanced']),
        form: rand(55, 75),
        source: 'scout_contact',
      };
      result.message = `${contact.name} t'envoie le profil de ${hiddenPlayer.firstName} ${hiddenPlayer.lastName} (${hiddenPlayer.age} ans, note ${hiddenPlayer.rating}).`;
      result.stateDelta = { scoutedPlayers: [...(state.scoutedPlayers ?? []), hiddenPlayer] };
      break;
    }
    case 'sponsor': {
      const bonus = rand(5000, 15000);
      const moralDelta = rand(3, 8);
      result.message = `${contact.name} propose un deal sponsor. +${(bonus / 1000).toFixed(0)}k€ et un joueur regonflé à bloc.`;
      const roster = state.roster ?? [];
      let updatedRoster = roster;
      if (roster.length > 0) {
        const idx = Math.floor(Math.random() * roster.length);
        updatedRoster = roster.map((p, i) => i === idx ? { ...p, moral: Math.min(100, p.moral + moralDelta) } : p);
      }
      result.stateDelta = { money: (state.money ?? 0) + bonus, roster: updatedRoster };
      break;
    }
    case 'avocat': {
      result.message = `${contact.name} prépare tes prochaines négociations. Prochain contrat plus facile à signer.`;
      result.stateDelta = { negotiationBuff: { active: true, appliedWeek: state.week, expiresWeek: state.week + 4, difficultyReduction: 0.15 } };
      break;
    }
    default:
      result.message = `${contact.name} n'a rien de particulier à signaler cette semaine.`;
  }

  return result;
}

export function callContact(state, contactId) {
  const contacts = state.contacts ?? createDefaultContacts();
  const idx = contacts.findIndex((c) => c.id === contactId);
  if (idx === -1) return { state, result: { message: 'Contact introuvable.', error: true } };

  const contact = contacts[idx];
  if (contact.cooldownWeek > (state.week ?? 0)) {
    const wait = contact.cooldownWeek - state.week;
    return { state, result: { message: `${contact.name} n'est pas disponible avant ${wait} semaine(s).`, onCooldown: true } };
  }

  const { message, stateDelta, publicRepDelta } = applyContactResult(state, contact);

  const updatedContact = { ...contact, trust: Math.min(100, contact.trust + 3), cooldownWeek: (state.week ?? 0) + COOLDOWN_WEEKS };
  const updatedContacts = contacts.map((c, i) => (i === idx ? updatedContact : c));

  const newState = { ...state, ...stateDelta, contacts: updatedContacts };
  return { state: newState, result: { message, publicRepDelta } };
}

export function getContactTip(contact, state) {
  const rep = normalizeAgencyReputation(state.reputation ?? 300);
  const week = state.week ?? 1;
  const highTrust = contact.trust >= 50;

  switch (contact.type) {
    case 'ds':
      return highTrust ? `${contact.name} te signale que ${contact.club} cherche un milieu de terrain.` : 'Améliorez votre relation pour débloquer des infos exclusives.';
    case 'journaliste':
      if (contact.stance === 'protecteur') return rep < 40 ? 'Elle peut relancer ton image avec un papier favorable.' : 'Elle protège souvent les dossiers bien gérés.';
      if (contact.stance === 'agressif') return 'Il attaque les dossiers fragiles et amplifie les écarts.';
      return rep < 40 ? 'Un papier équilibré peut stabiliser ta réputation.' : 'Il suit surtout l’évolution du dossier.';
    case 'scout':
      return `Moussa surveille actuellement plusieurs jeunes talents en ${week < 20 ? 'Afrique de l\'Ouest' : 'Afrique Centrale'}.`;
    case 'sponsor':
      return state.roster?.length > 0 ? 'Un de vos joueurs est éligible à un deal commercial.' : 'Constituez un effectif pour attirer les sponsors.';
    case 'avocat':
      return state.negotiationBuff?.active ? 'Votre buff juridique est actif jusqu\'à la semaine ' + state.negotiationBuff.expiresWeek + '.' : 'Consultez-le avant une négociation difficile.';
    default:
      return 'Maintenez le contact pour débloquer des avantages.';
  }
}
