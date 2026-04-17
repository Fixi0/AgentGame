import { PhoneCall } from 'lucide-react';
import React from 'react';
import { S } from './styles';

export default function Phone({ state, onNav, onNegotiateOffer, onContactClubStaff }) {
  const staffCalls = (state.roster ?? [])
    .filter((player) => player.club !== 'Libre')
    .filter((player) => (player.trust ?? 50) < 55 || player.moral < 55 || (player.activeActions ?? []).some((action) => ['coach_talk', 'salary_case', 'market_watch'].includes(action.type)))
    .slice(0, 4)
    .flatMap((player) => ([
      {
        id: `coach_${player.id}`,
        from: `Coach · ${player.club}`,
        title: `Suivi temps de jeu: ${player.firstName}`,
        body: `Appel au coach pour clarifier le rôle de ${player.firstName} ${player.lastName}.`,
        action: 'Appeler coach',
        onClick: () => onContactClubStaff?.(player.id, 'coach'),
      },
      {
        id: `ds_${player.id}`,
        from: `DS · ${player.club}`,
        title: `Projet club: ${player.firstName}`,
        body: `Appel au DS pour discuter du projet et d'une potentielle sortie mercato.`,
        action: 'Appeler DS',
        onClick: () => onContactClubStaff?.(player.id, 'ds'),
      },
    ]));

  const calls = [
    ...(state.clubOffers ?? []).filter((offer) => offer.status === 'open').map((offer) => ({
      id: offer.id,
      from: offer.club,
      title: `Offre pour ${offer.playerName}`,
      body: offer.preWindow
        ? `${offer.club} propose un pré-accord (${offer.price.toLocaleString('fr-FR')} €). Arrivée prévue semaine ${offer.effectiveWeek}.`
        : `${offer.club} veut avancer vite. Prix proposé : ${offer.price.toLocaleString('fr-FR')} €.`,
      action: 'Négocier',
      onClick: () => onNegotiateOffer(offer.id),
    })),
    ...(state.messages ?? []).filter((message) => !message.resolved).slice(0, 5).map((message) => ({
      id: message.id,
      from: message.playerName,
      title: message.subject,
      body: message.body,
      action: 'Répondre',
      onClick: () => onNav('messages'),
    })),
    ...(state.competitorThreats ?? []).slice(0, 3).map((threat) => ({
      id: threat.id,
      from: threat.agentName,
      title: `Approche concurrente`,
      body: `${threat.agentName} essaie de récupérer ${threat.playerName}.`,
      action: 'Voir',
      onClick: () => onNav('messages'),
    })),
    ...staffCalls,
  ];

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>TELEPHONE</div>
        <h1 style={S.eh}>Appels</h1>
      </div>
      <div style={S.cardList}>
        {calls.map((call) => (
          <div key={call.id} style={S.msgCard}>
            <div style={S.msgSubject}><PhoneCall size={14} /> {call.title}</div>
            <div style={S.msgFrom}>{call.from}</div>
            <div style={S.msgBody}>{call.body}</div>
            <button onClick={call.onClick} style={S.secBtn}>{call.action}</button>
          </div>
        ))}
      </div>
      {!calls.length && <div style={S.empty}>Aucun appel urgent. Ton téléphone est calme.</div>}
    </div>
  );
}
