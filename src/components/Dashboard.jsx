import React, { useMemo, useState } from 'react';
import { ChevronRight, Handshake, Mail, Newspaper, Users, LayoutGrid, BadgeCheck } from 'lucide-react';
import { getMarketOfferQueue, getPendingMessageCounts, messageNeedsResponse } from '../systems/dossierSystem';
import { getCalendarSnapshot, getWeekDailySnapshots } from '../systems/seasonSystem';
import { getPostImage } from '../utils/eventImages';

const WEEKDAY_LABELS_EN = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const MONTH_LABELS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function buildHeaderDate(state) {
  const week = Number(state?.week ?? 1);
  const day = clamp(Number(state?.day ?? 1), 1, 7);
  const start = getWeekDailySnapshots(week)[0];
  const [dRaw, mRaw, yRaw] = String(start?.dateLabel ?? '').split(/[\s/.-]+/);
  const dayNumber = Number((dRaw || '').replace(/\D/g, '')) || 1;
  const monthIndex = Number(mRaw?.replace(/\D/g, '')) ? Number(mRaw) - 1 : 6;
  const year = Number(yRaw?.replace(/\D/g, '')) || 2025;
  const date = new Date(Date.UTC(year, clamp(monthIndex, 0, 11), dayNumber + (day - 1)));

  return {
    weekday: WEEKDAY_LABELS_EN[day - 1],
    dayNumber: String(date.getUTCDate()).padStart(2, '0'),
    month: MONTH_LABELS_EN[date.getUTCMonth()] ?? 'JUL',
  };
}

function ActionRow({ icon: Icon, iconTint, title, subtitle, onClick, highlighted = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={highlighted ? 'dashboard-card dashboard-card-active' : 'dashboard-card'}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '14px 16px',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: '40px 1fr 16px',
        alignItems: 'center',
        gap: 14,
        border: highlighted ? undefined : '1px solid oklch(82% 0.05 270 / .12)',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        display: 'grid', placeItems: 'center',
        background: 'transparent',
        border: '1px solid oklch(82% 0.05 270 / .18)',
      }}>
        <Icon size={18} strokeWidth={1.8} color={iconTint || 'oklch(78% 0.16 215)'} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--af-text)', fontSize: 15, fontWeight: 700, letterSpacing: '-.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ color: 'oklch(70% 0.02 265 / .8)', fontSize: 11.5, marginTop: 2, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <ChevronRight size={16} color="oklch(72% 0.02 265 / .7)" strokeWidth={2} />
    </button>
  );
}

function SocialPostCard({ post, showNew = false }) {
  return (
    <article className="dashboard-card" style={{ borderRadius: 18, overflow: 'hidden', padding: 0 }}>
      <div style={{ position: 'relative', height: 180, backgroundImage: `url(${post.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, oklch(8% 0.02 258 / .55) 0%, transparent 32%, transparent 55%, oklch(6% 0.015 262 / .92) 100%)' }} />
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: 'linear-gradient(135deg, oklch(54% 0.20 295), oklch(40% 0.18 280))', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 4px 12px oklch(40% 0.20 290 / .5)' }}>
              <BadgeCheck size={16} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 2px 6px rgba(0,0,0,.5)' }}>
                <span>{(post.accountName || '').toUpperCase()}</span>
                <BadgeCheck size={12} color="oklch(78% 0.16 215)" />
              </div>
              <div style={{ color: 'rgba(255,255,255,.72)', fontSize: 11, fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{post.dateLabel}</div>
            </div>
          </div>
          {showNew ? (
            <div style={{ borderRadius: 8, padding: '5px 11px', background: 'oklch(88% 0.18 105)', color: 'oklch(16% 0.04 260)', fontSize: 11, fontWeight: 800, letterSpacing: '.01em', boxShadow: '0 4px 12px oklch(70% 0.18 105 / .4)' }}>
              New
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ color: '#fff', lineHeight: 1.4, fontSize: 13.5, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {post.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 12, color: 'oklch(78% 0.02 265 / .85)', fontSize: 12, fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>♡ {post.likes}K</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>💬 {post.comments}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, color: 'oklch(80% 0.02 265 / .85)' }}>Show Comments</span>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard({ state, onPlay, onNav }) {
  const [activePost, setActivePost] = useState(0);
  const pendingCounts = getPendingMessageCounts(state);
  const urgentMessages = (state.messages ?? []).filter(messageNeedsResponse);
  const openOffers = getMarketOfferQueue(state).filter((offer) => offer.status === 'open');
  const dateHeader = buildHeaderDate(state);

  const nextMilestone = useMemo(() => {
    const today = Number(state?.day ?? 1);
    const scheduled = (state?.matchCalendar ?? [])
      .filter((match) => match?.week === state.week && match?.status === 'scheduled')
      .map((match) => Number(match?.day ?? 7))
      .filter((day) => day >= today)
      .sort((a, b) => a - b)[0];
    if (!scheduled) return null;
    return Math.max(0, scheduled - today);
  }, [state]);

  const posts = useMemo(() => {
    const source = (state.news ?? []).slice(-12).reverse();
    return source.slice(0, 4).map((entry, index) => {
      const accountName = entry?.account?.name ?? entry?.authorName ?? 'Novastar FC';
      const dateLabel = entry?.dateLabel ?? getCalendarSnapshot(entry?.week ?? state.week).dateLabel;
      const text = String(entry?.text ?? entry?.label ?? 'Nouveau post du club.').slice(0, 160);
      const image = getPostImage({
        eventId: entry?.id,
        type: entry?.type,
        kind: entry?.kind ?? 'news',
        good: entry?.good,
        seed: `${entry?.id ?? 'post'}-${index}-${state.week}`,
      });
      return {
        id: entry?.id ?? `news-${index}`,
        accountName,
        dateLabel,
        text,
        image,
        likes: 3 + ((index * 2 + (state.week % 5)) % 7),
        comments: 20 + ((index * 11 + state.week) % 60),
      };
    });
  }, [state]);

  const actionItems = [
    {
      icon: LayoutGrid,
      iconTint: 'oklch(82% 0.16 215)',
      title: 'Select Tactical Vision',
      subtitle: null,
      highlighted: true,
      onClick: onPlay,
      visible: true,
    },
    {
      icon: Users,
      iconTint: 'oklch(76% 0.18 158)',
      title: 'Meet Your Clients',
      subtitle: null,
      onClick: () => onNav('roster'),
      visible: true,
    },
    {
      icon: Mail,
      iconTint: 'oklch(70% 0.20 270)',
      title: 'New Message',
      subtitle: pendingCounts.total > 0 ? `${pendingCounts.total} en attente` : 'From Assistant Manager',
      onClick: () => onNav('messages'),
      visible: true,
    },
    {
      icon: Newspaper,
      iconTint: 'oklch(78% 0.14 200)',
      title: 'News Feed',
      subtitle: 'Stay up to date with the latest',
      onClick: () => onNav('social'),
      visible: (state.news ?? []).length > 0,
    },
    openOffers.length > 0 ? {
      icon: Handshake,
      iconTint: 'oklch(82% 0.16 83)',
      title: 'Offres en attente',
      subtitle: `${openOffers.length} dossier${openOffers.length > 1 ? 's' : ''} à traiter`,
      onClick: () => onNav('dossiers'),
      visible: true,
    } : null,
  ].filter(Boolean).filter((item) => item.visible).slice(0, 4);

  return (
    <div className="af-page dashboard-shell" style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 468, minHeight: 0, overflow: 'hidden' }}>
      <section style={{ paddingTop: 4 }}>
        <h1 style={{
          margin: 0,
          color: 'var(--af-text)',
          fontSize: 'clamp(34px, 9vw, 44px)',
          lineHeight: .95,
          letterSpacing: '-.015em',
          fontWeight: 900,
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}>
          {dateHeader.weekday}, {dateHeader.month} {dateHeader.dayNumber}
        </h1>
        <div style={{ marginTop: 10, color: 'oklch(78% 0.02 265 / .82)', fontSize: 14, fontWeight: 500 }}>
          Next Event in <span style={{ color: 'oklch(78% 0.18 158)', fontWeight: 700 }}>{nextMilestone == null ? 'N/A' : `${nextMilestone} day${nextMilestone > 1 ? 's' : ''}`}</span>
        </div>
        <div style={{ marginTop: 12, height: 1, background: 'linear-gradient(90deg, transparent, oklch(82% 0.05 270 / .25), transparent)' }} />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actionItems.map((item) => (
          <ActionRow key={item.title} {...item} />
        ))}
      </section>

      {posts.length ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, flex: '1 1 auto' }}>
          <div
            className="dashboard-carousel"
            style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: 12, WebkitOverflowScrolling: 'touch' }}
            onScroll={(event) => {
              const target = event.currentTarget;
              const cardWidth = target.clientWidth + 12;
              const index = Math.round(target.scrollLeft / cardWidth);
              setActivePost(clamp(index, 0, posts.length - 1));
            }}
          >
            {posts.map((post, index) => (
              <div key={post.id} style={{ minWidth: '100%', scrollSnapAlign: 'start' }}>
                <SocialPostCard post={post} showNew={index === 0} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '4px 0 0' }}>
            {Array.from({ length: Math.max(1, posts.length || 0) }).map((_, index) => (
              <span
                key={`dot-${index}`}
                style={{
                  width: index === activePost ? 20 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: index === activePost ? 'oklch(72% 0.20 295)' : 'oklch(50% 0.02 265 / .55)',
                  boxShadow: index === activePost ? '0 0 10px oklch(68% 0.22 295 / .6)' : 'none',
                  transition: 'all .25s ease',
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
