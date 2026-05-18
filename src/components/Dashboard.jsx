import React, { useMemo, useState } from 'react';
import { ChevronRight, Handshake, Mail, Newspaper } from 'lucide-react';
import { getMarketOfferQueue, getPendingMessageCounts, messageNeedsResponse } from '../systems/dossierSystem';
import { getCalendarSnapshot, getWeekDailySnapshots } from '../systems/seasonSystem';
import { getPostImage } from '../utils/eventImages';

const WEEKDAY_LABELS_FR = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
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
    weekday: WEEKDAY_LABELS_FR[day - 1],
    dayNumber: String(date.getUTCDate()).padStart(2, '0'),
    month: MONTH_LABELS_EN[date.getUTCMonth()] ?? 'JUL',
  };
}

function ActionRow({ icon: Icon, title, subtitle, onClick, highlighted = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={highlighted ? 'dashboard-card dashboard-action-card dashboard-card-active' : 'dashboard-card dashboard-action-card'}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 13,
        padding: '9px 11px',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: '30px 1fr 14px',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div className={highlighted ? 'dashboard-icon dashboard-icon-active' : 'dashboard-icon'}>
        <Icon size={16} color={highlighted ? 'var(--ui-accent)' : 'oklch(82% 0.13 208)'} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="font-display" style={{ color: 'var(--af-text)', fontSize: 13, fontWeight: 780, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ color: 'oklch(80% 0.02 255 / .78)', fontSize: 10, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <ChevronRight size={14} color="oklch(68% 0.02 255 / .82)" />
    </button>
  );
}

function SocialPostCard({ post, showNew = false }) {
  return (
    <article className="dashboard-card dashboard-post-card" style={{ borderRadius: 15, overflow: 'hidden', borderColor: 'oklch(66% 0.05 258 / .28)' }}>
      <div style={{ padding: '7px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--af-text)', fontWeight: 850, fontSize: 11.5, letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {post.accountName}
          </div>
          <div style={{ color: 'oklch(80% 0.02 255 / .78)', fontSize: 10 }}>{post.dateLabel}</div>
        </div>
        {showNew ? (
          <div style={{ borderRadius: 999, padding: '2px 8px', background: 'oklch(84% 0.16 102)', color: 'oklch(14% 0.03 258)', fontSize: 9.5, fontWeight: 850 }}>
            New
          </div>
        ) : null}
      </div>

      <div className="dashboard-post-image" style={{ backgroundImage: `url(${post.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

      <div style={{ padding: '8px 10px 9px' }}>
        <div className="dashboard-post-copy" style={{ color: 'var(--af-text)', lineHeight: 1.28, fontSize: 11.8 }}>
          {post.text}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 7, color: 'oklch(80% 0.02 255 / .86)', fontSize: 10.8, fontWeight: 700 }}>
          <span>{post.likes}K</span>
          <span>{post.comments}</span>
          <span style={{ marginLeft: 'auto' }}>Voir commentaires</span>
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
      icon: Handshake,
      title: 'Offres en attente',
      subtitle: `${openOffers.length} dossier${openOffers.length > 1 ? 's' : ''} à traiter`,
      highlighted: true,
      onClick: () => onNav('dossiers'),
      visible: openOffers.length > 0,
    },
    {
      icon: Mail,
      title: 'New Message',
      subtitle: pendingCounts.total > 0 ? `${pendingCounts.total} réponse${pendingCounts.total > 1 ? 's' : ''} en attente` : 'Assistant Manager',
      onClick: () => onNav('messages'),
      visible: pendingCounts.total > 0,
    },
    {
      icon: Newspaper,
      title: 'News Feed',
      subtitle: 'Stay up to date with the latest',
      onClick: () => onNav('social'),
      visible: (state.news ?? []).length > 0,
    },
  ].filter((item) => item.visible);

  return (
    <div className="af-page dashboard-shell" style={{ padding: '0 30px', display: 'grid', gap: 7, maxWidth: 468, minHeight: 0, overflow: 'hidden' }}>
      <section style={{ padding: '0 1px' }}>
        <h1 className="font-display" style={{ margin: 0, color: 'var(--af-text)', fontSize: '28px', lineHeight: 1, letterSpacing: '0' }}>
          {dateHeader.weekday}, {dateHeader.month} {dateHeader.dayNumber}
        </h1>
        <div style={{ marginTop: 2, color: 'oklch(82% 0.02 255 / .86)', fontSize: 12.5 }}>
          Next Event in <span style={{ color: 'var(--af-cyan)', fontWeight: 800 }}>{nextMilestone == null ? 'N/A' : `${nextMilestone} day${nextMilestone > 1 ? 's' : ''}`}</span>
        </div>
      </section>

      {actionItems.length > 0 ? (
        <section style={{ display: 'grid', gap: 6 }}>
          {actionItems.map((item) => (
            <ActionRow key={item.title} {...item} />
          ))}
        </section>
      ) : null}

      <section style={{ display: 'grid', gap: 5, marginTop: 0, minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0 }}>
          <button
            type="button"
            onClick={onPlay}
            className="dashboard-continue"
          >
            Continuer
          </button>
        </div>
        {posts.length ? (
          <div
            className="dashboard-carousel"
            style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: 8, WebkitOverflowScrolling: 'touch' }}
            onScroll={(event) => {
              const target = event.currentTarget;
              const cardWidth = target.clientWidth + 8;
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
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, padding: '0 0 2px' }}>
          {Array.from({ length: Math.max(1, posts.length || 0) }).map((_, index) => (
            <span
              className={index === activePost ? 'dashboard-dot dashboard-dot-active' : 'dashboard-dot'}
              key={`dot-${index}`}
              style={{}}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
