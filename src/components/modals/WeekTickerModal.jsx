import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Zap } from 'lucide-react';

/**
 * WeekTickerModal
 * Jour par jour, pour que le passage de semaine soit lisible sur mobile.
 * On garde un vrai rythme visuel, puis on enchaîne sur le bilan complet.
 */

const TICK_INTERVAL = 560;

const TONE_STYLES = {
  info: { accent: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  good: { accent: '#00a676', bg: '#f0fdf8', border: '#cfeee3' },
  warn: { accent: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  danger: { accent: '#b42318', bg: '#fff7f7', border: '#fecaca' },
  calm: { accent: '#64727d', bg: '#f7f9fb', border: '#e5eaf0' },
};

function buildLegacyItems(report, activePeriod) {
  const items = [];

  if (activePeriod) {
    items.push({
      id: 'period',
      tone: 'info',
      day: activePeriod.label,
      icon: activePeriod.emoji ?? '📅',
      title: 'Période en cours',
      text: `Ambiance particulière dans le vestiaire cette semaine.`,
      chips: [activePeriod.label],
    });
  }

  const fixtures = report.fixtures ?? [];
  fixtures.slice(0, 4).forEach((fixture, index) => {
    items.push({
      id: `fixture_${index}`,
      tone: 'calm',
      day: `Match ${index + 1}`,
      icon: '⚽',
      title: `${fixture.homeTeam ?? 'Club'} ${fixture.homeGoals ?? 0} - ${fixture.awayGoals ?? 0} ${fixture.awayTeam ?? 'Adversaire'}`,
      text: fixture.competition ?? 'Championnat',
      chips: [fixture.homeTeam ?? 'Domicile', fixture.awayTeam ?? 'Extérieur'],
    });
  });

  const events = report.events ?? [];
  events.slice(0, 5).forEach((event, index) => {
    items.push({
      id: `event_${index}`,
      tone: event.good === false ? 'danger' : 'good',
      day: `Evenement ${index + 1}`,
      icon: event.good === false ? '⚠️' : '✅',
      title: event.player ?? 'Joueur',
      text: event.label ?? '',
      chips: [event.good === false ? 'Negatif' : 'Positif'],
    });
  });

  if (report.worldCupActive) {
    items.push({
      id: 'wc',
      tone: 'warn',
      day: 'Monde',
      icon: '🌍',
      title: `Coupe du Monde — ${report.worldCupPhase ?? ''}`,
      text: 'Les joueurs en selection sont sur le terrain.',
      chips: ['Selection nationale'],
    });
  }

  const messages = report.newMessagesCount ?? 0;
  items.push({
    id: 'messages',
    tone: messages > 0 ? 'good' : 'calm',
    day: 'Messages',
    icon: '💬',
    title: messages > 0 ? `${messages} message${messages > 1 ? 's' : ''} prioritaire${messages > 1 ? 's' : ''}` : 'Aucun nouveau message',
    text: messages > 0 ? 'La file reste compacte pour garder le rythme.' : 'Semaine calme du cote des messages.',
    chips: [`File ${report.messageQueueCount ?? 0}`],
  });

  items.push({
    id: 'finance',
    tone: (report.net ?? 0) >= 0 ? 'good' : 'danger',
    day: 'Bilan',
    icon: '📈',
    title: (report.net ?? 0) >= 0 ? 'Semaine positive' : 'Semaine deficit',
    text: (report.net ?? 0) >= 0 ? 'Le bilan financier reste propre.' : 'Attention aux charges et aux dossiers qui trainent.',
    chips: [`Net ${report.net ?? 0}`],
  });

  return items;
}

function buildTimeline(report, activePeriod) {
  if (Array.isArray(report?.weekTimeline) && report.weekTimeline.length > 0) {
    return report.weekTimeline;
  }
  return buildLegacyItems(report, activePeriod);
}

function WeekDayCard({ item, visible }) {
  const style = TONE_STYLES[item.tone] ?? TONE_STYLES.calm;
  const isMajor = Boolean(item.major);
  const isWorldCupMatch = item.kind === 'worldCupMatch';
  const cardStyle = isWorldCupMatch
    ? {
        background: 'linear-gradient(135deg,#0f172a,#1d4f7a)',
        border: '1px solid rgba(125,211,252,.32)',
        boxShadow: '0 18px 40px rgba(15,23,32,.24)',
        color: '#ffffff',
      }
    : isMajor
      ? {
          background: 'linear-gradient(135deg,#172026,#2c3a42)',
          border: '1px solid #172026',
          boxShadow: '0 16px 34px rgba(15,23,32,.18)',
          color: '#ffffff',
        }
      : {
          background: style.bg,
          border: `1px solid ${style.border}`,
        };

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: isMajor ? 14 : 12,
        borderRadius: 8,
        ...cardStyle,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        marginBottom: 10,
        alignItems: 'flex-start',
      }}
    >
      <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: isWorldCupMatch ? 'rgba(255,255,255,.14)' : '#ffffff',
            border: `1px solid ${isWorldCupMatch ? 'rgba(125,211,252,.35)' : style.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: isMajor ? '#ffffff' : style.accent,
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          {item.icon ?? '•'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: isMajor ? '#7dd3fc' : style.accent, letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'system-ui,sans-serif' }}>
            {item.day ?? 'Jour'}
          </div>
          {isMajor && (
            <span style={{
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: isWorldCupMatch ? '#bae6fd' : '#f5c842',
              fontFamily: 'system-ui,sans-serif',
            }}>
              {isWorldCupMatch ? 'Coupe du monde' : 'Événement majeur'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 900, color: isMajor ? '#ffffff' : '#172026', marginBottom: 3, lineHeight: 1.25 }}>
          {item.title ?? ''}
        </div>
        {isWorldCupMatch && item.match && (
          <div style={{
            marginTop: 8,
            marginBottom: 8,
            minHeight: 120,
            borderRadius: 10,
            overflow: 'hidden',
            background: 'linear-gradient(135deg,#0f172a 0%,#1d4f7a 52%,#203a43 100%)',
            border: '1px solid rgba(125,211,252,.20)',
            boxShadow: '0 14px 28px rgba(15,23,32,.20)',
          }}>
            <div style={{
              height: '100%',
              minHeight: 120,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: 'radial-gradient(circle at 18% 20%, rgba(255,255,255,.16), transparent 28%), radial-gradient(circle at 82% 25%, rgba(245,200,66,.18), transparent 24%)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7dd3fc', fontFamily: 'system-ui,sans-serif', fontWeight: 900, marginBottom: 5 }}>
                    Photo du match
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 950, color: '#ffffff', lineHeight: 1.18 }}>
                    {item.match.countryFlag ?? '🌍'} {item.match.countryName ?? item.match.playerName}
                  </div>
                </div>
                <div style={{
                  minWidth: 64,
                  padding: '7px 9px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,.12)',
                  border: '1px solid rgba(255,255,255,.16)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 9, color: '#a0c4d8', fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Score</div>
                  <div style={{ fontSize: 16, fontWeight: 950, color: '#ffffff' }}>{item.match.score}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', color: 'rgba(255,255,255,.82)', fontSize: 11, fontFamily: 'system-ui,sans-serif' }}>
                <span>{item.match.phase}</span>
                <span>Note {item.match.matchRating}</span>
                <span>{item.match.minutes} min</span>
              </div>
            </div>
          </div>
        )}
        <div style={{ fontSize: 12, color: isMajor ? 'rgba(255,255,255,.82)' : '#3f5663', fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 }}>
          {item.text ?? ''}
        </div>
        {item.match && (
          <div style={{
            marginTop: 10,
            padding: '8px 10px',
            borderRadius: 8,
            background: isMajor ? 'rgba(255,255,255,.10)' : '#ffffff',
            border: `1px solid ${isMajor ? 'rgba(255,255,255,.16)' : style.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <strong style={{ fontSize: 12, color: isMajor ? '#ffffff' : '#172026', fontFamily: 'system-ui,sans-serif' }}>
                {item.match.countryFlag ?? '🌍'} {item.match.countryName ?? item.match.playerName}
              </strong>
              <span style={{ fontSize: 10, color: isMajor ? 'rgba(255,255,255,.75)' : '#64727d', fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 900 }}>
                {item.match.phase ?? item.day}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11, color: isMajor ? 'rgba(255,255,255,.76)' : '#64727d', fontFamily: 'system-ui,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.match.opponent}
              </span>
              <div style={{
                fontSize: 16,
                fontWeight: 950,
                color: isMajor ? '#ffffff' : '#172026',
                padding: '0 6px',
              }}>
                {item.match.score}
              </div>
              <span style={{ fontSize: 11, color: isMajor ? 'rgba(255,255,255,.76)' : '#64727d', fontFamily: 'system-ui,sans-serif', textAlign: 'right' }}>
                note {item.match.matchRating}
              </span>
            </div>
          </div>
        )}
        {Array.isArray(item.chips) && item.chips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {item.chips.map((chip) => (
              <span
                key={chip}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderRadius: 8,
                  background: isMajor ? 'rgba(255,255,255,.12)' : '#ffffff',
                  border: `1px solid ${isMajor ? 'rgba(255,255,255,.18)' : style.border}`,
                  color: isMajor ? '#ffffff' : '#64727d',
                  fontSize: 10,
                  fontWeight: 850,
                  letterSpacing: '.04em',
                  fontFamily: 'system-ui,sans-serif',
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeekTickerModal({ report, activePeriod, onDone }) {
  const timeline = useMemo(() => buildTimeline(report, activePeriod), [report, activePeriod]);
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    setRevealed(0);
    setDone(false);
    clearTimeout(timerRef.current);
  }, [timeline.length, report?.week]);

  useEffect(() => {
    if (revealed >= timeline.length) {
      const doneTimer = setTimeout(() => setDone(true), 350);
      return () => clearTimeout(doneTimer);
    }

    const delay = revealed < 2 ? TICK_INTERVAL : revealed < 5 ? TICK_INTERVAL * 0.75 : TICK_INTERVAL * 0.55;
    timerRef.current = setTimeout(() => {
      setRevealed((value) => Math.min(timeline.length, value + 1));
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [revealed, timeline.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [revealed]);

  const skipAll = () => {
    clearTimeout(timerRef.current);
    setRevealed(timeline.length);
    setDone(true);
  };

  const progress = timeline.length > 0 ? Math.round((revealed / timeline.length) * 100) : 0;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(16,19,20,0.72)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 520,
        background: '#ffffff',
        borderRadius: '16px 16px 0 0',
        padding: 20,
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -24px 70px rgba(15,23,32,.22)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#00a676', fontFamily: 'system-ui,sans-serif', fontWeight: 850, textTransform: 'uppercase' }}>
              <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
              Semaine {report?.week ?? '—'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#172026', marginTop: 2 }}>
              Fil jour par jour
            </div>
          </div>
          {!done && (
            <button
              onClick={skipAll}
              style={{
                background: '#f7f9fb',
                border: '1px solid #e5eaf0',
                color: '#64727d',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'system-ui,sans-serif',
              }}
            >
              Passer →
            </button>
          )}
        </div>

        <div style={{ height: 4, background: '#eef2f5', borderRadius: 999, marginBottom: 14, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg,#00a676,#20c997)',
              borderRadius: 999,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {timeline.slice(0, revealed).map((item) => (
            <WeekDayCard key={item.id ?? `${item.day}-${item.title}`} item={item} visible />
          ))}
          {!done && revealed < timeline.length && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 10px', alignItems: 'center' }}>
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#00a676',
                    opacity: 0.35 + (index === (Math.floor(Date.now() / 400) % 3) ? 0.5 : 0),
                    transition: 'opacity 0.2s',
                  }}
                />
              ))}
              <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginLeft: 6 }}>
                La semaine avance...
              </span>
            </div>
          )}
        </div>

        {done && (
          <button
            onClick={onDone}
            style={{
              marginTop: 14,
              width: '100%',
              background: 'linear-gradient(135deg,#172026,#2c3a42)',
              color: '#ffffff',
              border: 'none',
              padding: 16,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: '.1em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'system-ui,sans-serif',
              boxShadow: '0 18px 38px rgba(15,23,32,.18)',
            }}
          >
            Voir le bilan complet <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
