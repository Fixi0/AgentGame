import { ChevronLeft, MessageCircle, PhoneCall, UserRound } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { getContextualResponseOptions, getResponseCopy } from '../systems/messageSystem';
import { getPendingMessageCounts, getMessageQueueLabel } from '../systems/dossierSystem';
import { S } from './styles';

const responseLabels = {
  professionnel: 'Professionnel',
  empathique: 'Empathique',
  ferme: 'Ferme',
};

const URGENT_TYPES = ['transfer_request', 'raise_request', 'complaint', 'injury_worry', 'role_frustration', 'media_pressure', 'promise_broken_warning', 'staff_dialogue', 'coach_dialogue', 'ds_dialogue'];

export default function Messages({ messages, messageQueue = [], onRespond, onAction, focusThreadKey = null }) {
  const [filter, setFilter] = useState('all');
  const [selectedThreadKey, setSelectedThreadKey] = useState(null);
  const [mobileScreen, setMobileScreen] = useState('list');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 780 : false));
  const [visibleCounts, setVisibleCounts] = useState({});

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 780);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
        const items = [...thread.items].sort((a, b) => (a.sortWeek ?? a.week ?? 0) - (b.sortWeek ?? b.week ?? 0));
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
        if (filter === 'urgent') return thread.items.some((item) => !item.resolved && URGENT_TYPES.includes(item.type));
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
      setMobileScreen('list');
      return;
    }

    if (focusThreadKey && threads.some((thread) => thread.key === focusThreadKey)) {
      setSelectedThreadKey(focusThreadKey);
      setMobileScreen('thread');
      return;
    }

    setSelectedThreadKey((current) => {
      if (current && threads.some((thread) => thread.key === current)) return current;
      return threads[0].key;
    });
  }, [focusThreadKey, threads]);

  const selectedThread = threads.find((thread) => thread.key === selectedThreadKey) ?? null;
  const threadLimit = selectedThread ? (visibleCounts[selectedThread.key] ?? 5) : 5;
  const visibleThreadItems = selectedThread ? selectedThread.items.slice(Math.max(0, selectedThread.items.length - threadLimit)) : [];
  const queueCounts = getPendingMessageCounts({ messages, messageQueue });
  const showList = !isMobile || mobileScreen === 'list';
  const showThread = !isMobile || mobileScreen === 'thread';
  const messageNeedsResponse = (message) => !message.resolved && (
    URGENT_TYPES.includes(message.type)
    || ['coach_dialogue', 'ds_dialogue', 'staff_dialogue'].includes(message.type)
    || message.type === 'secret_offer'
  );
  const threadNeedsResponseCount = (thread) => thread.items.filter(messageNeedsResponse).length;
  const actionGridStyle = {
    ...S.msgActions,
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
  };
  const summaryStripStyle = {
    ...S.summaryStrip,
    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,minmax(0,1fr))',
  };
  const actionBtnStyle = {
    ...S.msgBtn,
    padding: isMobile ? '12px 14px' : S.msgBtn.padding,
    fontSize: isMobile ? 11 : S.msgBtn.fontSize,
  };

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

      <div style={summaryStripStyle}>
        <div style={S.summaryChip}><strong>{queueCounts.urgent}</strong><span>Urgent</span></div>
        <div style={S.summaryChip}><strong>{queueCounts.normal}</strong><span>Normal</span></div>
        <div style={S.summaryChip}><strong>{queueCounts.toProcess}</strong><span>À traiter</span></div>
        <div style={S.summaryChip}><strong>{messageQueue.length}</strong><span>File</span></div>
      </div>

      {messageQueue.length > 0 && (
        <div style={S.objCard}>
          <div style={S.secTitle}>FILE D'ATTENTE</div>
          {messageQueue.slice(0, 3).map((message) => (
            <div key={message.id} style={S.promiseRow}>
              <span>{getMessageQueueLabel(message)} · {message.playerName}</span>
              <strong>{message.subject}</strong>
            </div>
          ))}
        </div>
      )}

      <div style={S.messagesLayout}>
        {showList && (
          <aside style={S.threadListPane}>
            {threads.map((thread) => {
              const active = thread.key === selectedThreadKey;
              return (
                <button
                  key={thread.key}
                  onClick={() => {
                    setSelectedThreadKey(thread.key);
                    setMobileScreen('thread');
                  }}
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
                  {threadNeedsResponseCount(thread) > 0 && (
                    <div style={S.threadAttention}>
                      Réponse attendue
                    </div>
                  )}
                </button>
              );
            })}
            {!threads.length && <div style={S.emptySmall}>Aucun message dans ce filtre.</div>}
          </aside>
        )}

        {showThread && (
          <section style={S.threadPane}>
            {selectedThread ? (
              <>
                <div style={S.chatHeader}>
                  <div>
                    {isMobile && mobileScreen === 'thread' && (
                      <button
                        onClick={() => setMobileScreen('list')}
                        style={S.backBtn}
                      >
                        <ChevronLeft size={16} />
                        Retour
                      </button>
                    )}
                    <div style={S.chatTitle}>{selectedThread.label}</div>
                    <div style={S.chatSub}>{selectedThread.contextLabel || selectedThread.playerName}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={S.chatTag}>{selectedThread.isStaff ? 'Staff' : 'Joueur'}</div>
                    {threadNeedsResponseCount(selectedThread) > 0 && <div style={S.responseBadge}>Réponse attendue</div>}
                  </div>
                </div>

                <div style={S.chatTimeline}>
                  {visibleThreadItems.map((message) => (
                    <div key={message.id} style={S.chatBlock}>
                      {message.type === 'shortlist_reply' ? (
                        <div style={S.chatBubbleLeft}>
                          <div style={S.chatMeta}>{message.senderName ?? message.playerName} · S{message.week}</div>
                          <div style={S.chatSubject}>{message.subject}</div>
                          <div style={S.chatBody}>{message.body}</div>
                        </div>
                      ) : (
                        <>
                          <div style={S.chatBubbleLeft}>
                            <div style={S.chatMeta}>{message.senderName ?? message.playerName} · S{message.week}</div>
                            <div style={S.chatSubject}>{message.subject}</div>
                            <div style={S.chatBody}>{message.body}</div>
                            {messageNeedsResponse(message) && <div style={S.responseBadgeInline}>Réponse attendue</div>}
                          </div>
                          {message.resolved ? (
                            <div style={S.chatBubbleRight}>
                              {getDisplayedResponse(message)}
                            </div>
                          ) : (
                            <>
                              {messageNeedsResponse(message) && (
                                <div style={S.msgHint}>Une réponse concrète peut déclencher une suite dans le jeu.</div>
                              )}
                              {/* Special action CTAs for key message types */}
                              {message.type === 'media_pressure' && onAction && (
                                <button
                                  onClick={() => onAction(message.id, 'media_crisis', message)}
                                  style={{
                                    ...actionBtnStyle,
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1.5px solid #fca5a5',
                                    fontWeight: 900,
                                    marginBottom: 6,
                                    width: '100%',
                                  }}
                                >
                                  🔥 GÉRER LA CRISE →
                                </button>
                              )}
                              {message.type === 'injury_worry' && onAction && (
                                <button
                                  onClick={() => onAction(message.id, 'player_support', message)}
                                  style={{
                                    ...actionBtnStyle,
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    border: '1.5px solid #bfdbfe',
                                    fontWeight: 900,
                                    marginBottom: 6,
                                    width: '100%',
                                  }}
                                >
                                  💙 SOUTENIR LE JOUEUR →
                                </button>
                              )}
                              {message.type === 'retirement' && onAction && (
                                <button
                                  onClick={() => onAction(message.id, 'retirement', message)}
                                  style={{
                                    ...actionBtnStyle,
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
                                    border: '1.5px solid #ddd6fe',
                                    fontWeight: 900,
                                    marginBottom: 6,
                                    width: '100%',
                                  }}
                                >
                                  🎖 DÉCIDER DE L'AVENIR →
                                </button>
                              )}
                              {/* Hide generic buttons for types handled by dedicated modals */}
                              {!['media_pressure', 'retirement'].includes(message.type) && (
                                <div style={actionGridStyle}>
                                  {Object.entries(getContextualResponseOptions(message)).map(([type, label]) => (
                                    <button key={type} onClick={() => onRespond(message.id, type)} style={actionBtnStyle}>
                                      {label || responseLabels[type]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {selectedThread.items.length > visibleThreadItems.length && (
                  <button
                    onClick={() => setVisibleCounts((current) => ({
                      ...current,
                      [selectedThread.key]: (current[selectedThread.key] ?? 5) + 5,
                    }))}
                    style={S.loadOlderBtn}
                  >
                    Charger les anciens messages
                  </button>
                )}

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
        )}
      </div>
    </div>
  );
}
