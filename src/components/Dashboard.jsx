import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Handshake, Mail, BadgeCheck, CircleCheckBig } from 'lucide-react';
import { getMarketOfferQueue, getPendingMessageCounts } from '../systems/dossierSystem';
import { EURO_CUP_LABELS, getEuropeanCompetition, isEuropeanMatchWeek } from '../systems/europeanCupSystem';
import { isEnglish } from '../utils/i18n';
import { buildInstaProPosts } from './Social';

const WEEKDAY_LABELS_EN = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const WEEKDAY_LABELS_FR = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
const MONTH_LABELS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_LABELS_FR = ['JANV.', 'FÉVR.', 'MARS', 'AVR.', 'MAI', 'JUIN', 'JUIL.', 'AOÛT', 'SEPT.', 'OCT.', 'NOV.', 'DÉC.'];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function getSeasonStartMonday(year) {
  const date = new Date(Date.UTC(year, 8, 8));
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? 1 : (8 - weekday) % 7;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date;
}

function getGameDate(week, day) {
  const safeWeek = Math.max(1, Number(week ?? 1));
  const safeDay = clamp(Number(day ?? 1), 1, 7);
  const season = Math.floor((safeWeek - 1) / 38) + 1;
  const seasonWeekOffset = ((safeWeek - 1) % 38) * 7;
  const seasonStart = getSeasonStartMonday(2024 + season);
  const date = new Date(seasonStart);
  date.setUTCDate(seasonStart.getUTCDate() + seasonWeekOffset + (safeDay - 1));
  return date;
}

function buildHeaderDate(state) {
  const english = isEnglish();
  const week = Number(state?.week ?? 1);
  const day = clamp(Number(state?.day ?? 1), 1, 7);
  const date = getGameDate(week, day);

  return {
    weekday: english ? WEEKDAY_LABELS_EN[day - 1] : WEEKDAY_LABELS_FR[day - 1],
    dayNumber: String(date.getUTCDate()).padStart(2, '0'),
    month: (english ? MONTH_LABELS_EN : MONTH_LABELS_FR)[date.getUTCMonth()] ?? (english ? 'JUL' : 'JUIL.'),
    english,
  };
}

function getMatchClubName(match, side) {
  const club = side === 'home' ? match?.homeClub : match?.awayClub;
  return String(club?.name ?? club ?? '').trim();
}

function getSeasonFromWeek(week = 1) {
  return Math.floor((Math.max(1, Number(week ?? 1)) - 1) / 38) + 1;
}

function getSeasonWeekFromWeek(week = 1) {
  return ((Math.max(1, Number(week ?? 1)) - 1) % 38) + 1;
}

function getEuropeanSimDayIndex(week = 1, playerId = '') {
  const seed = `${week}:${playerId}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2 === 0 ? 2 : 3;
}

function hasEuropeanResultForPlayer(state, week, playerId) {
  if (state?.midweekEuropean?.week !== week) return false;
  return (state.midweekEuropean.results ?? []).some((match) => String(match?.playerId ?? '') === String(playerId ?? ''));
}

function buildUpcomingEuropeanMatches(state, spanWeeks = 18) {
  const roster = Array.isArray(state?.roster) ? state.roster : [];
  const currentWeek = Number(state?.week ?? 1);
  const currentDay = clamp(Number(state?.day ?? 1), 1, 7);
  const matches = [];

  for (let offset = 0; offset < spanWeeks; offset += 1) {
    const week = currentWeek + offset;
    const season = getSeasonFromWeek(week);
    const seasonWeek = getSeasonWeekFromWeek(week);
    roster.forEach((player) => {
      const competition = getEuropeanCompetition(player, season);
      if (!competition || !isEuropeanMatchWeek(seasonWeek, competition)) return;
      const day = getEuropeanSimDayIndex(week, player.id);
      if (week === currentWeek && day < currentDay) return;
      if (week === currentWeek && hasEuropeanResultForPlayer(state, week, player.id)) return;
      matches.push({
        id: `euro_next_${week}_${day}_${player.id}_${competition}`,
        week,
        day,
        playerId: player.id,
        competition,
        competitionLabel: EURO_CUP_LABELS[competition]?.name ?? 'Europe',
        homeClub: { name: player.club, countryCode: player.clubCountryCode },
        awayClub: { name: EURO_CUP_LABELS[competition]?.short ?? 'Europe' },
        status: 'scheduled',
        source: 'europe',
      });
    });
  }

  return matches;
}

function findNextAgencyMatch(state) {
  const roster = Array.isArray(state?.roster) ? state.roster : [];
  const agencyClubs = new Set(roster.map((player) => String(player?.club ?? '').trim()).filter(Boolean));
  const playerIds = new Set(roster.map((player) => String(player?.id ?? '').trim()).filter(Boolean));
  const currentWeek = Number(state?.week ?? 1);
  const currentDay = clamp(Number(state?.day ?? 1), 1, 7);
  const calendarMatches = (Array.isArray(state?.matchCalendar) ? state.matchCalendar : [])
    .filter((match) => {
      const week = Number(match?.week ?? 0);
      const day = clamp(Number(match?.day ?? 7), 1, 7);
      if (week < currentWeek || (week === currentWeek && day < currentDay)) return false;
      if (match?.status && match.status !== 'scheduled') return false;
      if (match?.playerId && playerIds.has(String(match.playerId))) return true;
      return agencyClubs.has(getMatchClubName(match, 'home')) || agencyClubs.has(getMatchClubName(match, 'away'));
    });

  return [...calendarMatches, ...buildUpcomingEuropeanMatches(state)]
    .sort((a, b) => (Number(a.week ?? 0) - Number(b.week ?? 0)) || (Number(a.day ?? 7) - Number(b.day ?? 7)))[0] ?? null;
}

function buildNextMatchLabel(state, english) {
  const match = findNextAgencyMatch(state);
  if (!match) {
    return {
      prefix: english ? 'Next match' : 'Prochain match',
      delta: '',
    };
  }

  const day = clamp(Number(match.day ?? 7), 1, 7);
  const daysAway = Math.max(0, ((Number(match.week ?? state?.week ?? 1) - Number(state?.week ?? 1)) * 7) + (day - clamp(Number(state?.day ?? 1), 1, 7)));
  return {
    prefix: english ? 'Next match' : 'Prochain match',
    delta: daysAway === 0
      ? (english ? 'today' : "aujourd'hui")
      : (english ? `in ${daysAway} day${daysAway > 1 ? 's' : ''}` : `dans ${daysAway} jour${daysAway > 1 ? 's' : ''}`),
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
        padding: '11px 14px',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: '34px 1fr 14px',
        alignItems: 'center',
        gap: 12,
        border: highlighted ? undefined : '1px solid oklch(82% 0.05 270 / .12)',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10,
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

function SocialPostCard({ post, showNew = false, onOpen }) {
  const english = isEnglish();
  return (
    <article
      className="dashboard-card dashboard-post-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.();
        }
      }}
      style={{ borderRadius: 18, overflow: 'hidden', padding: 0, cursor: 'pointer' }}
    >
      <div className="dashboard-post-image" style={{ position: 'relative', backgroundImage: `url(${post.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
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
              {english ? 'New' : 'Nouveau'}
            </div>
          ) : null}
        </div>
      </div>
      <div className="dashboard-post-body" style={{ padding: '15px 16px 14px' }}>
        <div className="dashboard-post-copy" style={{ color: '#fff', lineHeight: 1.34, fontSize: 14, fontWeight: 600 }}>
          {post.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, color: 'oklch(78% 0.02 265 / .85)', fontSize: 11.5, fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>♡ {post.likes}K</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>💬 {post.comments}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, color: 'oklch(80% 0.02 265 / .85)' }}>{english ? 'Show Comments' : 'Commentaires'}</span>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard({ state, onPlay, onNav }) {
  const [activePost, setActivePost] = useState(0);
  const carouselRef = useRef(null);
  const pendingCounts = getPendingMessageCounts(state);
  const openOffers = getMarketOfferQueue(state).filter((offer) => offer.status === 'open');
  const dateHeader = buildHeaderDate(state);
  const nextMatchLabel = useMemo(() => buildNextMatchLabel(state, dateHeader.english), [state, dateHeader.english]);

  const posts = useMemo(() => {
    const source = buildInstaProPosts({ state }).slice(0, 4);
    return source.map((entry, index) => {
      const accountName = entry?.account?.name ?? entry?.accountName ?? entry?.authorName ?? 'Novastar FC';
      const dateLabel = entry?.dateLabel ?? entry?.timeLabel ?? '';
      const text = String(entry?.text ?? entry?.label ?? 'Nouveau post du club.').slice(0, 160);
      return {
        id: entry?.id ?? `news-${index}`,
        accountName,
        dateLabel,
        text,
        image: entry.image,
        likes: entry?.likes ? Math.max(1, Math.round(entry.likes / 100)) : (entry?.likesK ?? (3 + ((index * 2 + (state.week % 5)) % 7))),
        comments: entry?.comments ?? (20 + ((index * 11 + state.week) % 60)),
      };
    });
  }, [state]);

  useEffect(() => {
    setActivePost(0);
    if (carouselRef.current) carouselRef.current.scrollLeft = 0;
  }, [state.week, state.day, posts[0]?.id]);

  const actionItems = [
    {
      icon: Mail,
      iconTint: 'oklch(70% 0.20 270)',
      title: dateHeader.english ? 'New Message' : 'Nouveau message',
      subtitle: dateHeader.english ? `${pendingCounts.total} pending` : `${pendingCounts.total} en attente`,
      onClick: () => onNav('messages'),
      visible: pendingCounts.total > 0,
    },
    openOffers.length > 0 ? {
      icon: Handshake,
      iconTint: 'oklch(82% 0.16 83)',
      title: dateHeader.english ? 'Pending offers' : 'Offres en attente',
      subtitle: dateHeader.english ? `${openOffers.length} file${openOffers.length > 1 ? 's' : ''} to handle` : `${openOffers.length} dossier${openOffers.length > 1 ? 's' : ''} à traiter`,
      onClick: () => onNav('dossiers'),
      visible: true,
    } : null,
  ].filter(Boolean).filter((item) => item.visible);

  return (
    <div className="af-page dashboard-shell" style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 468, minHeight: 0, overflow: 'hidden' }}>
      <section style={{ paddingTop: 20 }}>
        <h1 style={{
          margin: 0,
          color: 'var(--af-text)',
          fontSize: 'clamp(30px, 8.2vw, 40px)',
          lineHeight: .90,
          letterSpacing: '-.015em',
          fontWeight: 900,
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}>
          {dateHeader.english
            ? `${dateHeader.weekday}, ${dateHeader.month} ${dateHeader.dayNumber}`
            : `${dateHeader.weekday} ${dateHeader.dayNumber} ${dateHeader.month}`}
        </h1>
        <div style={{ marginTop: 9, color: 'oklch(78% 0.02 265 / .82)', fontSize: 13, fontWeight: 500, minHeight: 18 }}>
          {nextMatchLabel.prefix}
          {nextMatchLabel.delta ? (
            <>
              {' · '}
              <span style={{ color: 'oklch(72% 0.20 295)', fontWeight: 800, textShadow: '0 0 12px oklch(68% 0.22 295 / .35)' }}>
                {nextMatchLabel.delta}
              </span>
            </>
          ) : null}
        </div>
        <div style={{ marginTop: 9, height: 1, background: 'linear-gradient(90deg, transparent, oklch(82% 0.05 270 / .25), transparent)' }} />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {actionItems.length > 0 ? actionItems.map((item) => (
          <ActionRow key={item.title} {...item} />
        )) : (
          <ActionRow
            icon={CircleCheckBig}
            iconTint="oklch(72% 0.20 295)"
            title={dateHeader.english ? 'No tasks left' : 'Plus aucune tâche'}
            subtitle={dateHeader.english ? 'Continue the day' : 'Continuer la journée'}
            onClick={onPlay}
            highlighted
          />
        )}
      </section>

      {posts.length ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto', marginTop: 6 }}>
          <div
            ref={carouselRef}
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
                <SocialPostCard post={post} showNew={index === 0} onOpen={() => onNav('social')} />
              </div>
            ))}
          </div>
          <div className="dashboard-dots" style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '0 0 6px' }}>
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
