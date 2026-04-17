import { MessageCircle } from 'lucide-react';
import React from 'react';
import { getMessageResponseOptions, getResponseCopy } from '../systems/messageSystem';
import { S } from './styles';

const responseLabels = {
  professionnel: 'Professionnel',
  empathique: 'Empathique',
  ferme: 'Ferme',
};

export default function Messages({ messages, onRespond }) {
  const getDisplayedResponse = (message) => {
    if (message.responseText && !message.responseText.startsWith('Réponse envoyée')) return message.responseText;
    if (message.responseType) return getResponseCopy(message, message.responseType);
    return `Réponse ${responseLabels[message.responseType] ?? ''} envoyée`;
  };

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>BOITE DE RECEPTION</div>
        <h1 style={S.eh}>Messages</h1>
      </div>
      <div style={S.cardList}>
        {messages.map((message) => (
          <div key={message.id} style={S.msgCard}>
            <div style={S.msgSubject}>
              <MessageCircle size={14} /> {message.subject}
            </div>
            <div style={S.msgFrom}>{message.playerName} · semaine {message.week}</div>
            <div style={S.msgBody}>{message.body}</div>
            {message.resolved ? (
              <div style={S.resolved}>
                {getDisplayedResponse(message)}
              </div>
            ) : (
              <>
                {['transfer_request', 'raise_request', 'complaint'].includes(message.type) && (
                  <div style={S.msgHint}>Une réponse professionnelle ou empathique crée une promesse à tenir.</div>
                )}
              <div style={S.msgActions}>
                {Object.entries(getMessageResponseOptions(message)).map(([type, label]) => (
                  <button key={type} onClick={() => onRespond(message.id, type)} style={S.msgBtn}>
                    {label || responseLabels[type]}
                  </button>
                ))}
              </div>
              </>
            )}
          </div>
        ))}
      </div>
      {!messages.length && <div style={S.empty}>Aucun message. Les joueurs écriront après les décisions importantes.</div>}
    </div>
  );
}
