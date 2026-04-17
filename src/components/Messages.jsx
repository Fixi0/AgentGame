import { MessageCircle, PhoneCall, UserRound } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { getMessageResponseOptions, getResponseCopy } from '../systems/messageSystem';
import { S } from './styles';

const responseLabels = {
  professionnel: 'Professionnel',
  empathique: 'Empathique',
  ferme: 'Ferme',
};

export default function Messages({ messages, onRespond, focusThreadKey = null }) {
  const [filter, setFilter] = useState('all');
  const [selectedThreadKey, setSelectedThreadKey] = useState(null);

  const threads = useMemo(() => {
    const grouped = messages.reduce((acc, message) => {
      const key = message.threadKey ?? message.playerId ?? message.id;
      if (!acc[key]) {
        acc[key] = {
          key,
          label: message.threadLabel ?? message.playerName ?? 'Contact',
          contextLabel: message.threadContextLabel ?? message.playerName ?? '',
          playerName: message.playerName ?? 'Contact',
          playerId: message.playerId,
          items: [],
        };
      }
      acc[key].items.push(message);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((thread) => {
        const items = [...thread.items].sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
        const latest = items[items.length - 1];
        const unresolvedCount = items.filter((item) => !item.resolved).length;
        const isStaff = items.some((item) => item.senderRole === 'staff' || String(item.context ?? '').includes('coach') || String(item.context ?? '').includes('ds'));
        return {
          ...thread,
          items,
          latestWeek: latest?.week ?? 0,
          latestLabel: latest?.subject ?? 'Conversation',
          unresolvedCount,
          hasUnread: unresolvedCount > 0,
          isStaff,
        };
      })
      .filter((thread) => {
        if (filter === 'all') return true;
        if (filter === 'urgent') return thread.items.some((item) => !item.resolved && ['transfer_request', 'raise_request', 'complaint', 'injury_worry', 'role_frustration', 'media_pressure', 'promise_broken_warning', 'staff_dialogue'].includes(item.type));
        if (filter === 'unread') return thread.hasUnread;
        if (filter === 'staff') return thread.isStaff;
        if (filter === 'players') return !thread.isStaff;
        return true;
      })
      .sort((a, b) => b.latestWeek - a.latestWeek);
  }, [filter, messages]);

  useEffect(() => {
    if (!threads.length) {
      setSelectedThreadKey(null);
      return;
    }

    const visibleThread = threads.find((thread) => thread.key === focusThreadKey) ?? threads[0];
    setSelectedThreadKey((current) => {
      if (focusThreadKey && threads.some((thread) => thread.key === focusThreadKey)) return focusThreadKey;
      if (current && threads.some((thread) => thread.key === current)) return current;
      return visibleThread.key;
    });
  }, [focusThreadKey, threads]);

  const selectedThread = threads.find((thread) => thread.key === selectedThreadKey) ?? threads[0] ?? null;

  const getDisplayedResponse = (message) => {
    if (message.responseText && !message.responseText.startsWith('Réponse envoyée')) return message.responseText;
    if (message.responseType) return getResponseCopy(message, message.responseType);
    return `Réponse ${responseLabels[message.responseType] ?? ''} envoyée`;
  };

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>BOÎTE DE RÉCEPTION</div>
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

      <div style={S.messagesLayout}>
        <aside style={S.threadListPane}>
          {threads.map((thread) => {
            const active = thread.key === selectedThreadKey;
            return (
              <button
                key={thread.key}
                onClick={() => setSelectedThreadKey(thread.key)}
                style={{
                  ...S.threadContact,
                  borderColor: active ? '#00a676' : '#e5eaf0',
                  boxShadow: active ? '0 12px 28px rgba(0,166,118,.14)' : '0 10px 24px rgba(15,23,32,.06)',
                }}
              >
                <div style={S.threadContactTop}>
                  <div style={S.threadContactIcon}>
                    {thread.isStaff ? <PhoneCall size={14} /> : <UserRound size={14} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={S.threadContactTitle}>{thread.label}</div>
                    <div style={S.threadContactSub}>{thread.contextLabel || thread.playerName}</div>
                  </div>
                  {thread.unresolvedCount > 0 && <span style={S.threadBadge}>{thread.unresolvedCount}</span>}
                </div>
                <div style={S.threadContactMeta}>{thread.latestLabel}</div>
              </button>
            );
          })}
          {!threads.length && <div style={S.emptySmall}>Aucun message dans ce filtre.</div>}
        </aside>

        <section style={S.threadPane}>
          {selectedThread ? (
            <>
              <div style={S.chatHeader}>
                <div>
                  <div style={S.chatTitle}>{selectedThread.label}</div>
                  <div style={S.chatSub}>{selectedThread.contextLabel || selectedThread.playerName}</div>
                </div>
                <div style={S.chatTag}>{selectedThread.isStaff ? 'Staff' : 'Joueur'}</div>
              </div>
              <div style={S.chatTimeline}>
                {selectedThread.items.map((message) => (
                  <div key={message.id} style={S.chatBlock}>
                    <div style={S.chatBubbleLeft}>
                      <div style={S.chatMeta}>{message.senderName ?? message.playerName} · S{message.week}</div>
                      <div style={S.chatSubject}>{message.subject}</div>
                      <div style={S.chatBody}>{message.body}</div>
                    </div>
                    {message.resolved ? (
                      <div style={S.chatBubbleRight}>
                        {getDisplayedResponse(message)}
                      </div>
                    ) : (
                      <>
                        {['transfer_request', 'raise_request', 'complaint', 'role_frustration', 'staff_dialogue'].includes(message.type) && (
                          <div style={S.msgHint}>Une réponse concrète peut déclencher une suite dans le jeu.</div>
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
                La conversation garde le contexte. Les réponses poussent des effets réels sur la confiance, le club et le mercato.
              </div>
            </>
          ) : (
            <div style={S.chatEmpty}>
              <MessageCircle size={26} />
              <div style={S.chatEmptyTitle}>Aucune conversation</div>
              <div style={S.chatEmptySub}>Les contacts et les échanges apparaissent ici quand un joueur, un coach ou un DS écrit.</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
