import { PhoneCall } from 'lucide-react';
import React from 'react';
import { S } from './styles';

export default function Phone({ state, onNav, onNegotiateOffer }) {
  const calls = [
    ...(state.clubOffers ?? []).filter((offer) => offer.status === 'open').map((offer) => ({
      id: offer.id,
      from: offer.club,
      title: `Offre pour ${offer.playerName}`,
      body: `${offer.club} veut avancer vite. Prix proposé : ${offer.price.toLocaleString('fr-FR')} €.`,
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
