import { BadgeCheck } from 'lucide-react';
import React from 'react';
import { S } from './styles';

export default function SwipeDesk({ state, onNav, onNegotiateOffer }) {
  const cards = [
    ...(state.clubOffers ?? []).filter((offer) => offer.status === 'open').map((offer) => ({
      id: offer.id,
      title: `${offer.club} appelle`,
      body: `${offer.playerName} · offre à traiter avant S${offer.expiresWeek}`,
      actions: [
        { label: 'Négocier', onClick: () => onNegotiateOffer(offer.id) },
        { label: 'Ignorer', onClick: () => onNav('dashboard') },
      ],
    })),
    ...(state.messages ?? []).filter((message) => !message.resolved).slice(0, 6).map((message) => ({
      id: message.id,
      title: message.subject,
      body: `${message.playerName} · ${message.body}`,
      actions: [{ label: 'Répondre', onClick: () => onNav('messages') }],
    })),
  ];

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>CARDS</div>
        <h1 style={S.eh}>Dossiers</h1>
      </div>
      <div style={S.cardList}>
        {cards.map((card) => (
          <div key={card.id} style={S.msgCard}>
            <div style={S.msgSubject}><BadgeCheck size={14} /> {card.title}</div>
            <div style={S.msgBody}>{card.body}</div>
            <div style={S.msgActions}>
              {card.actions.map((action) => <button key={action.label} onClick={action.onClick} style={S.msgBtn}>{action.label}</button>)}
            </div>
          </div>
        ))}
      </div>
      {!cards.length && <div style={S.empty}>Aucun dossier à swiper.</div>}
    </div>
  );
}
