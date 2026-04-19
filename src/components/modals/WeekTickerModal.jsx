import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Zap } from 'lucide-react';

/**
 * WeekTickerModal
 * Animated "la semaine se déroule" feed — shows events one by one before
 * the full ResultsModal. Gives the feeling that time is actually passing.
 */

const TICK_INTERVAL = 520; // ms between events (speeds up toward end)

function getEventStyle(event) {
  if (!event) return {};
  if (event.type === 'period') return { accent: '#7c3aed', icon: event.emoji ?? '📅', bg: '#f5f3ff' };
  if (event.isWC) return { accent: '#b45309', icon: '🌍', bg: '#fffbeb' };
  if (event.isEuro) return { accent: '#1a1a6e', icon: '⭐', bg: '#eff6ff' };
  if (event.good === true) return { accent: '#16a34a', icon: '✅', bg: '#f0fdf8' };
  if (event.good === false) return { accent: '#dc2626', icon: '⚠️', bg: '#fff7f7' };
  if (event.type === 'fixture') return { accent: '#2563eb', icon: '⚽', bg: '#eff6ff' };
  return { accent: '#64727d', icon: '📋', bg: '#f7f9fb' };
}

function TickerItem({ item, visible }) {
  const style = getEventStyle(item);
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        background: style.bg,
        border: `1px solid ${style.accent}22`,
        marginBottom: 6,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{style.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.label && (
          <div style={{ fontSize: 11, fontWeight: 800, color: style.accent, letterSpacing: '.05em', fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase', marginBottom: 2 }}>
            {item.label}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#172026', fontFamily: 'system-ui,sans-serif', lineHeight: 1.4 }}>
          {item.text}
        </div>
        {item.sub && (
          <div style={{ fontSize: 10, color: '#64727d', marginTop: 3, fontFamily: 'system-ui,sans-serif' }}>
            {item.sub}
          </div>
        )}
      </div>
      {item.value && (
        <div style={{ fontSize: 12, fontWeight: 900, color: style.accent, fontFamily: 'system-ui,sans-serif', flexShrink: 0 }}>
          {item.value}
        </div>
      )}
    </div>
  );
}

function buildTickerItems(report, activePeriod) {
  const items = [];

  // 1. Period banner (if any)
  if (activePeriod) {
    items.push({
      id: 'period',
      type: 'period',
      emoji: activePeriod.emoji,
      label: activePeriod.label,
      text: `Période ${activePeriod.label} — ambiance particulière dans le vestiaire cette semaine.`,
    });
  }

  // 2. Match fixtures
  const fixtures = report.fixtures ?? [];
  fixtures.slice(0, 4).forEach((f, i) => {
    const result = f.homeGoals > f.awayGoals ? (f.homeTeam === f.club ? 'Victoire' : 'Défaite')
      : f.homeGoals < f.awayGoals ? (f.homeTeam === f.club ? 'Défaite' : 'Victoire')
      : 'Nul';
    items.push({
      id: `fixture_${i}`,
      type: 'fixture',
      text: `${f.homeTeam ?? 'Club'} ${f.homeGoals ?? 0} – ${f.awayGoals ?? 0} ${f.awayTeam ?? 'Adversaire'}`,
      sub: f.competition ?? 'Championnat',
    });
  });

  // 3. Player events (good first, then bad)
  const evts = report.events ?? [];
  const goodEvts = evts.filter((e) => e.good !== false).slice(0, 4);
  const badEvts = evts.filter((e) => e.good === false).slice(0, 2);
  [...goodEvts, ...badEvts].forEach((e, i) => {
    items.push({
      id: `evt_${i}`,
      good: e.good,
      label: e.player ?? '',
      text: e.label ?? '',
      value: e.money > 0 ? `+${Math.round(e.money / 1000)}k€` : e.money < 0 ? `${Math.round(e.money / 1000)}k€` : null,
    });
  });

  // 4. World Cup / Euro results
  const euroResults = report.euroMatchResults ?? [];
  euroResults.slice(0, 3).forEach((r, i) => {
    items.push({
      id: `euro_${i}`,
      isEuro: true,
      label: r.competition ?? 'Coupe Europe',
      text: `${r.playerName ?? 'Ton joueur'} — ${r.score ?? '?-?'} · Note ${r.matchRating ?? '?'}/10`,
      value: r.goals > 0 ? `${r.goals} ⚽` : null,
    });
  });

  if (report.worldCupActive) {
    const wcPhase = report.worldCupPhase ?? '';
    items.push({
      id: 'wc',
      isWC: true,
      label: `🌍 Coupe du Monde — ${wcPhase}`,
      text: `Tes joueurs en sélection sont sur le terrain. Résultats en cours...`,
    });
  }

  // 5. Messages generated
  const msgs = report.newMessagesCount ?? 0;
  if (msgs > 0) {
    items.push({
      id: 'msgs',
      good: true,
      text: `${msgs} nouveau${msgs > 1 ? 'x' : ''} message${msgs > 1 ? 's' : ''} reçu${msgs > 1 ? 's' : ''}`,
    });
  }

  // 6. Finance
  const net = (report.income ?? 0) - (report.costs ?? 0);
  items.push({
    id: 'finance',
    good: net >= 0,
    text: net >= 0
      ? `Bilan financier positif — solde semaine`
      : `Semaine déficitaire — attention aux charges`,
    value: net >= 0 ? `+${Math.round(net / 1000)}k€` : `${Math.round(net / 1000)}k€`,
  });

  return items;
}

export default function WeekTickerModal({ report, activePeriod, onDone }) {
  const items = buildTickerItems(report, activePeriod);
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (revealed >= items.length) {
      setTimeout(() => setDone(true), 400);
      return;
    }
    const delay = revealed < 3 ? TICK_INTERVAL : revealed < 7 ? TICK_INTERVAL * 0.7 : TICK_INTERVAL * 0.5;
    timerRef.current = setTimeout(() => {
      setRevealed((v) => v + 1);
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [revealed, items.length]);

  // Auto-scroll to bottom as items appear
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [revealed]);

  const skipAll = () => {
    clearTimeout(timerRef.current);
    setRevealed(items.length);
    setTimeout(() => setDone(true), 200);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(16,19,20,0.72)', zIndex: 2000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 520, background: '#ffffff',
        borderRadius: '16px 16px 0 0', padding: 20,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -24px 70px rgba(15,23,32,.22)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#00a676', fontFamily: 'system-ui,sans-serif', fontWeight: 850, textTransform: 'uppercase' }}>
              <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
              Semaine {report.week ?? '—'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#172026', marginTop: 2 }}>
              La semaine se déroule
            </div>
          </div>
          {!done && (
            <button
              onClick={skipAll}
              style={{ background: '#f7f9fb', border: '1px solid #e5eaf0', color: '#64727d', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}
            >
              Passer →
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#eef2f5', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: 'linear-gradient(90deg,#00a676,#20c997)',
            width: `${Math.round((revealed / items.length) * 100)}%`,
            transition: 'width 0.3s ease', borderRadius: 2,
          }} />
        </div>

        {/* Feed */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {items.slice(0, revealed).map((item, i) => (
            <TickerItem key={item.id} item={item} visible={true} />
          ))}
          {!done && revealed < items.length && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 10px', alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#00a676',
                  opacity: 0.4 + (i === (Math.floor(Date.now() / 400) % 3) ? 0.6 : 0),
                  transition: 'opacity 0.2s',
                }} />
              ))}
              <span style={{ fontSize: 10, color: '#64727d', fontFamily: 'system-ui,sans-serif', marginLeft: 6 }}>
                En cours...
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        {done && (
          <button
            onClick={onDone}
            style={{
              marginTop: 14, width: '100%', background: 'linear-gradient(135deg,#172026,#2c3a42)',
              color: '#ffffff', border: 'none', padding: 16, borderRadius: 8,
              fontSize: 13, fontWeight: 900, letterSpacing: '.1em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'system-ui,sans-serif', boxShadow: '0 18px 38px rgba(15,23,32,.18)',
            }}
          >
            Voir le bilan complet <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
