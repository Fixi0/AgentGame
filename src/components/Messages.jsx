import { MessageCircle } from 'lucide-react';
import React, { useState } from 'react';
import { getMessageResponseOptions, getResponseCopy } from '../systems/messageSystem';
import { S } from './styles';

const responseLabels = {
  professionnel: 'Professionnel',
  empathique: 'Empathique',
  ferme: 'Ferme',
};

export default function Messages({ messages, onRespond }) {
  const [filter, setFilter] = useState('all');
  const threads = messages.reduce((acc, message) => {
    const key = message.playerId ?? message.playerName ?? message.id;
    if (!acc[key]) {
      acc[key] = {
        key,
        playerName: message.playerName ?? 'Contact',
        items: [],
      };
    }
    acc[key].items.push(message);
    return acc;
  }, {});
  const orderedThreads = Object.values(threads)
    .map((thread) => ({
      ...thread,
      latestWeek: Math.max(...thread.items.map((item) => item.week ?? 0)),
      unresolvedCount: thread.items.filter((item) => !item.resolved).length,
      hasStaff: thread.items.some((item) => item.type === 'staff_reply' || ['coach_talk', 'ds_talk'].includes(item.context)),
      hasUnread: thread.items.some((item) => !item.resolved),
      items: [...thread.items].sort((a, b) => (a.week ?? 0) - (b.week ?? 0)),
    }))
    .filter((thread) => {
      if (filter === 'all') return true;
      if (filter === 'urgent') return thread.items.some((item) => !item.resolved && ['transfer_request', 'raise_request', 'complaint', 'injury_worry', 'role_frustration', 'media_pressure', 'promise_broken_warning'].includes(item.type));
      if (filter === 'unread') return thread.hasUnread;
      if (filter === 'staff') return thread.hasStaff;
      if (filter === 'players') return !thread.hasStaff;
      return true;
    })
    .sort((a, b) => b.latestWeek - a.latestWeek);

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
      <div style={S.filterChips}>
        {[
          ['all', 'Tout'],
          ['urgent', 'Urgent'],
          ['unread', 'Non lus'],
          ['staff', 'Staff'],
          ['players', 'Joueurs'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              ...S.chipBtn,
              background: filter === key ? '#172026' : '#ffffff',
              color: filter === key ? '#ffffff' : '#172026',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={S.cardList}>
        {orderedThreads.map((thread) => (
          <div key={thread.key} style={S.msgCard}>
            <div style={S.msgSubject}>
              <MessageCircle size={14} /> {thread.playerName}
            </div>
            <div style={S.msgFrom}>{thread.unresolvedCount ? `${thread.unresolvedCount} en attente` : 'fil à jour'} · semaine {thread.latestWeek}</div>
            <div style={S.thread}>
              {thread.items.map((message) => (
                <div key={message.id} style={S.threadBlock}>
                  <div style={S.incomingBubble}>
                    <div style={S.threadMeta}>{message.subject} · S{message.week}</div>
                    <div>{message.body}</div>
                  </div>
                  {message.resolved && (
                    <div style={S.outgoingBubble}>
                      {getDisplayedResponse(message)}
                    </div>
                  )}
                  {!message.resolved && (
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
            <div style={S.emptySmall}>
              Conversation complète conservée pour garder le contexte des décisions.
            </div>
          </div>
        ))}
      </div>
      {!orderedThreads.length && <div style={S.empty}>Aucun message dans ce filtre. Les joueurs écriront après les décisions importantes.</div>}
    </div>
  );
}
