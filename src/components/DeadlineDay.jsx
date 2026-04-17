import { Timer } from 'lucide-react';
import React from 'react';
import { formatMoney } from '../utils/format';
import { S } from './styles';

export default function DeadlineDay({ state, phase, onNegotiateOffer, onRejectOffer }) {
  const offers = (state.clubOffers ?? []).filter((offer) => offer.status === 'open');

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>DEADLINE DAY</div>
        <h1 style={S.eh}>Derniers appels</h1>
      </div>
      <div style={S.deadlineTimer}><Timer size={18} /> {phase?.deadlineDay ? '90:00' : 'Hors mercato'} · ligne ouverte</div>
      <div style={S.cardList}>
        {offers.map((offer) => (
          <div key={offer.id} style={S.msgCard}>
            <div style={S.msgSubject}>{offer.club} pour {offer.playerName}</div>
            <div style={S.msgBody}>
              Proposition : {formatMoney(offer.price)}
              {offer.preWindow ? ` · pré-accord · arrivée S${offer.effectiveWeek}` : ` · expire S${offer.expiresWeek}`}
              . Décision rapide recommandée.
            </div>
            <div style={S.msgActions}>
              <button onClick={() => onNegotiateOffer(offer.id)} style={S.msgBtn}>Négocier</button>
              <button onClick={() => onRejectOffer(offer.id)} style={S.msgBtn}>Refuser</button>
            </div>
          </div>
        ))}
      </div>
      {!offers.length && <div style={S.empty}>Aucun appel de mercato pour le moment.</div>}
    </div>
  );
}
