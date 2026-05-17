import React, { useMemo } from 'react';
import { CalendarDays, ChevronRight, Mail, Newspaper, Users, WandSparkles } from 'lucide-react';
import { getPendingMessageCounts, messageNeedsResponse } from '../systems/dossierSystem';
import { getCalendarSnapshot, getWeekDailySnapshots } from '../systems/seasonSystem';
import { formatMoneyCompact } from '../utils/format';
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
      className={highlighted ? 'premium-card-elev' : 'premium-card'}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 16,
        padding: 14,
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: '42px 1fr 16px',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div className="premium-icon-tile tone-cyan" style={highlighted ? { boxShadow: '0 0 20px oklch(70% 0.24 295 / .4)' } : undefined}>
        <Icon size={20} color={highlighted ? 'var(--neon-violet)' : 'var(--neon-cyan)'} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="font-display" style={{ color: 'var(--af-text)', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ color: 'var(--af-muted)', fontSize: 11, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <ChevronRight size={16} color="var(--af-dim)" />
    </button>
  );
}

function SocialPostCard({ post, showNew = false }) {
  return (
    <article className="premium-card" style={{ borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--af-text)', fontWeight: 900, fontSize: 12, letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {post.accountName}
          </div>
          <div style={{ color: 'var(--af-muted)', fontSize: 11 }}>{post.dateLabel}</div>
        </div>
        {showNew ? (
          <div style={{ borderRadius: 999, padding: '3px 10px', background: 'oklch(88% 0.17 102)', color: 'oklch(16% 0.03 258)', fontSize: 11, fontWeight: 900 }}>
            New
          </div>
        ) : null}
      </div>

      <div style={{ aspectRatio: '1.5', backgroundImage: `url(${post.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

      <div style={{ padding: 12 }}>
        <div style={{ color: 'var(--af-text)', lineHeight: 1.45, fontSize: 13 }}>
          {post.text}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 10, color: 'var(--af-muted)', fontSize: 12, fontWeight: 700 }}>
          <span>{post.likes}K</span>
          <span>{post.comments}</span>
          <span style={{ marginLeft: 'auto' }}>Voir commentaires</span>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard({ state, onPlay, onNav }) {
  const pendingCounts = getPendingMessageCounts(state);
  const urgentMessages = (state.messages ?? []).filter(messageNeedsResponse);
  const activePlayerCount = state.roster?.length ?? 0;
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
      icon: WandSparkles,
      title: 'Select Tactical Vision',
      subtitle: 'Définir le plan de semaine',
      highlighted: true,
      onClick: () => onNav('office'),
    },
    {
      icon: Users,
      title: 'Meet Your Clients',
      subtitle: `${activePlayerCount} joueur${activePlayerCount > 1 ? 's' : ''} à suivre`,
      onClick: () => onNav('roster'),
    },
    {
      icon: Mail,
      title: 'New Message',
      subtitle: pendingCounts.total > 0 ? `${pendingCounts.total} réponse${pendingCounts.total > 1 ? 's' : ''} en attente` : 'Assistant Manager',
      onClick: () => onNav('messages'),
    },
    {
      icon: Newspaper,
      title: 'News Feed',
      subtitle: 'Stay up to date with the latest',
      onClick: () => onNav('social'),
    },
  ];

  return (
    <div className="af-page" style={{ paddingTop: 12, display: 'grid', gap: 12, maxWidth: 720 }}>
      <section style={{ padding: '4px 2px 2px' }}>
        <h1 className="font-display" style={{ margin: 0, color: 'var(--af-text)', fontSize: 'clamp(38px, 10vw, 56px)', lineHeight: 1, letterSpacing: '-0.03em' }}>
          {dateHeader.weekday}, {dateHeader.month} {dateHeader.dayNumber}
        </h1>
        <div style={{ marginTop: 7, color: 'var(--af-muted)', fontSize: 16 }}>
          Next Event in <span style={{ color: 'var(--neon-green)', fontWeight: 800 }}>{nextMilestone == null ? 'N/A' : `${nextMilestone} day${nextMilestone > 1 ? 's' : ''}`}</span>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 9 }}>
        {actionItems.map((item) => (
          <ActionRow key={item.title} {...item} />
        ))}
      </section>

      <section style={{ display: 'grid', gap: 10, marginTop: 4 }}>
        {posts.length ? posts.map((post, index) => <SocialPostCard key={post.id} post={post} showNew={index === 0} />) : null}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '2px 0 6px' }}>
          {Array.from({ length: Math.max(4, posts.length || 0) }).map((_, index) => (
            <span
              key={`dot-${index}`}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: index === 0 ? 'var(--neon-violet)' : 'oklch(62% 0.02 265 / .55)',
              }}
            />
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onPlay}
        className="af-btn-primary"
        style={{ width: '100%', padding: '16px 18px', borderRadius: 16, fontSize: 15 }}
      >
        Continuer · {formatMoneyCompact(state.money ?? 0)}
      </button>
    </div>
  );
}
