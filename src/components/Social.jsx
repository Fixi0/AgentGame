import React, { useMemo, useState } from 'react';
import { Heart, MessageCircle, Send, BadgeCheck, Sparkles, Flame, Megaphone, Hash, Repeat2 } from 'lucide-react';
import Messages from './Messages';
import { getPlayerPortrait } from '../utils/playerPortraits';
import { getPostImage } from '../utils/eventImages';
import { formatMoney } from '../utils/format';

const fullName = (p = {}) => `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Joueur';
const handleOf = (p) => '@' + (`${p.firstName ?? ''}${p.lastName ?? ''}`.toLowerCase().replace(/[^a-z0-9]/g, '')) + (p.id ? String(p.id).slice(-2) : '');
const clubHandle = (name) => '@' + String(name || 'club').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) + '_off';
const weekAgo = (w, now) => {
  const d = Math.max(0, (now ?? 0) - (w ?? 0));
  if (d === 0) return "à l'instant";
  if (d === 1) return 'il y a 1 sem.';
  return `il y a ${d} sem.`;
};

const POST_COST = 25000;

const seedHash = (s) => { let h = 2166136261 >>> 0; const str = String(s); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
const pick = (arr, seed) => arr[seedHash(seed) % arr.length];
const num = (seed, max) => seedHash(seed) % max;

// ============= TEMPLATES (centralisés dans src/data/socialDatabase.js) =============
import {
  PLAYER_POST_TEMPLATES as PLAYER_POST_TEMPLATES_FR,
  CLUB_POST_TEMPLATES as CLUB_POST_TEMPLATES_FR,
  PRESS_AUTHORS,
  PRESS_POST_TEMPLATES as PRESS_POST_TEMPLATES_FR,
  FAN_AUTHORS,
  FAN_POST_TEMPLATES as FAN_POST_TEMPLATES_FR,
  PULSE_AUTHORS,
  PULSE_TEMPLATES as PULSE_TEMPLATES_FR,
  PULSE_NO_PLAYER as PULSE_NO_PLAYER_FR,
  COMMENT_POOL as COMMENT_POOL_FR,
  DM_TONES as DM_TONES_FR,
  PULSE_HASHTAGS as PULSE_HASHTAGS_FR,
} from '../data/socialDatabase';
import {
  PLAYER_POST_TEMPLATES_EN,
  CLUB_POST_TEMPLATES_EN,
  PRESS_POST_TEMPLATES_EN,
  FAN_POST_TEMPLATES_EN,
  PULSE_TEMPLATES_EN,
  PULSE_NO_PLAYER_EN,
  COMMENT_POOL_EN,
  DM_TONES_EN,
  PULSE_HASHTAGS_EN,
} from '../data/socialDatabase.en';
import { isEnglish } from '../utils/i18n';

const EN = isEnglish();
const PLAYER_POST_TEMPLATES = EN ? PLAYER_POST_TEMPLATES_EN : PLAYER_POST_TEMPLATES_FR;
const CLUB_POST_TEMPLATES = EN ? CLUB_POST_TEMPLATES_EN : CLUB_POST_TEMPLATES_FR;
const PRESS_POST_TEMPLATES = EN ? PRESS_POST_TEMPLATES_EN : PRESS_POST_TEMPLATES_FR;
const FAN_POST_TEMPLATES = EN ? FAN_POST_TEMPLATES_EN : FAN_POST_TEMPLATES_FR;
const PULSE_TEMPLATES = EN ? PULSE_TEMPLATES_EN : PULSE_TEMPLATES_FR;
const PULSE_NO_PLAYER = EN ? PULSE_NO_PLAYER_EN : PULSE_NO_PLAYER_FR;
const COMMENT_POOL = EN ? COMMENT_POOL_EN : COMMENT_POOL_FR;
const DM_TONES = EN ? DM_TONES_EN : DM_TONES_FR;
const PULSE_HASHTAGS = EN ? PULSE_HASHTAGS_EN : PULSE_HASHTAGS_FR;
import { generateBondSocialPosts } from '../systems/playerBondsSystem';
import { getClubSquad } from '../data/squadDatabase';
import { generateLivingFeedPosts } from '../systems/livingFeedSystem';

// Renvoie un coéquipier déterministe (autre joueur du même club) pour les posts duo/rivalité.
const pickTeammate = (player, seed) => {
  if (!player?.club) return null;
  try {
    const squad = getClubSquad({ name: player.club, tier: player.clubTier ?? 2, countryCode: player.clubCountryCode ?? 'FR', city: player.clubCity ?? '' }, 1) ?? [];
    const others = squad.filter((m) => m && m.id !== player.id);
    if (!others.length) return null;
    return others[seedHash(seed + ':mate') % others.length];
  } catch { return null; }
};
const ctxFor = (player, seed) => {
  const mate = pickTeammate(player, seed);
  const mateName = mate ? `${mate.firstName} ${mate.lastName}`.trim() : null;
  return { p: player, partner: mateName, rival: mateName };
};

// ============= UI =============
function Avatar({ player, label, size = 38, color = 'oklch(20% 0.04 258)' }) {
  const src = player ? getPlayerPortrait(player) : null;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: color, border: '1.5px solid var(--af-border)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: size * 0.36, fontWeight: 900 }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (label || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

// ============= INSTAPRO FEED =============
function InstaFeed({ posts, liked, onLike, onComment, onPublish, brandValue, money }) {
  const [draft, setDraft] = useState('');
  const canAfford = money >= POST_COST;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Story bar */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
        {posts.filter((p) => p.kind === 'player').slice(0, 8).map((p) => (
          <div key={'st-' + p.id} style={{ display: 'grid', justifyItems: 'center', gap: 4, minWidth: 64 }}>
            <div style={{ padding: 2, borderRadius: '50%', background: 'conic-gradient(from 0deg, #f59e0b, #ef4444, #ec4899, #8b5cf6, #f59e0b)' }}>
              <Avatar player={p.player} size={56} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--af-muted)', maxWidth: 64, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.player.firstName}</div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="af-panel" style={{ padding: 12, display: 'grid', gap: 8 }}>
        <div className="af-kicker" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><Megaphone size={11} style={{ verticalAlign: 'middle' }} /> Post sponsorisé agence</span>
          <span style={{ color: 'var(--af-gold)' }}>Marque {brandValue}</span>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Publie au nom de ton agence (+3 marque, -${formatMoney(POST_COST)})…`}
          rows={2}
          style={{ width: '100%', resize: 'none', background: 'oklch(12% 0.03 258)', border: '1px solid var(--af-border)', borderRadius: 8, color: 'var(--af-text)', padding: 10, fontSize: 12, fontFamily: 'inherit' }}
        />
        <button
          type="button"
          disabled={!draft.trim() || !canAfford}
          onClick={() => { onPublish(draft.trim()); setDraft(''); }}
          className="af-btn-primary"
          style={{ padding: 10, opacity: (draft.trim() && canAfford) ? 1 : 0.5 }}
        >
          {canAfford ? `Publier (-${formatMoney(POST_COST)})` : `Fonds insuffisants (${formatMoney(POST_COST)})`}
        </button>
      </div>

      {posts.map((post) => <FeedCard key={post.id} post={post} liked={liked} onLike={onLike} onComment={onComment} />)}
    </div>
  );
}

function PostList({ list }) {
  if (!list) return null;
  const renderItem = (item, key) => (
    <div
      key={key}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8,
        background: item.isMine ? 'oklch(28% 0.13 145 / .25)' : 'oklch(14% 0.03 258)',
        border: item.isMine ? '1px solid oklch(55% 0.15 145)' : '1px solid var(--af-border)',
      }}
    >
      {item.rank != null && (
        <div style={{ minWidth: 22, textAlign: 'center', fontWeight: 900, fontSize: 12, color: item.rank <= 3 ? 'var(--af-gold)' : 'var(--af-muted)' }}>
          {item.rank}
        </div>
      )}
      {item.position && (
        <div style={{ minWidth: 28, fontSize: 9, fontWeight: 900, color: 'var(--af-cyan)', letterSpacing: '.05em' }}>
          {item.position}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--af-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name} {item.isMine && <span style={{ color: 'var(--af-grass)', fontSize: 9, marginLeft: 4 }}>★ MOI</span>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--af-muted)' }}>{item.club}</div>
      </div>
      {item.goals != null && (
        <div style={{ display: 'flex', gap: 6, fontSize: 11, fontWeight: 800 }}>
          <span style={{ color: '#f59e0b' }}>{item.goals}⚽</span>
          <span style={{ color: '#2f80ed' }}>{item.assists}🅰</span>
        </div>
      )}
    </div>
  );
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 8, padding: 10, background: 'oklch(10% 0.02 258)', borderRadius: 10, border: '1px solid var(--af-border)' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.06em', color: 'var(--af-cyan)', textTransform: 'uppercase' }}>{list.title}</div>
      {list.ranked && (
        <div style={{ display: 'grid', gap: 4 }}>
          {list.ranked.map((it, i) => renderItem(it, i))}
        </div>
      )}
      {list.groups && list.groups.map((g) => (
        <div key={g.label} style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--af-muted)', fontWeight: 800, letterSpacing: '.05em' }}>{g.label.toUpperCase()} ({g.items.length})</div>
          {g.items.map((it, i) => renderItem(it, `${g.label}-${i}`))}
        </div>
      ))}
    </div>
  );
}

function FeedCard({ post, liked, onLike, onComment }) {
  const isPlayer = post.kind === 'player';
  const isClub = post.kind === 'club';
  return (
    <article className="af-panel af-anim-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
      <header style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        {isPlayer
          ? <Avatar player={post.player} />
          : <Avatar label={post.authorName} color={isClub ? 'oklch(35% 0.15 25)' : 'oklch(35% 0.13 258)'} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 900, fontSize: 13, color: 'var(--af-text)' }}>
            {post.authorName}
            {(isClub || (isPlayer && post.player.rating >= 82)) && <BadgeCheck size={13} color="var(--af-cyan)" />}
          </div>
          <div style={{ fontSize: 10, color: 'var(--af-muted)' }}>{post.handle} · {post.timeLabel}</div>
        </div>
      </header>
      {post.image && (
        <div style={{ aspectRatio: '1', backgroundImage: `url(${post.image})`, backgroundSize: 'cover', backgroundPosition: 'center top', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,.7))' }} />
          {post.tag && <div style={{ position: 'absolute', left: 12, bottom: 10, color: '#fff', fontWeight: 900, fontSize: 14, textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>#{post.tag}</div>}
        </div>
      )}
      <div style={{ padding: 10, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <button type="button" onClick={() => onLike(post)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4, color: liked.has(post.id) ? '#ef4444' : 'var(--af-text)', cursor: 'pointer', padding: 0 }}>
            <Heart size={20} fill={liked.has(post.id) ? '#ef4444' : 'transparent'} />
            <span style={{ fontSize: 12, fontWeight: 800 }}>{post.likes + (liked.has(post.id) ? 1 : 0)}</span>
          </button>
          <button type="button" onClick={() => onComment(post)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--af-text)', cursor: 'pointer', padding: 0 }}>
            <MessageCircle size={20} />
            <span style={{ fontSize: 12, fontWeight: 800 }}>{post.comments}</span>
          </button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--af-text)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
          <strong>{post.handle}</strong> {post.text}
        </div>
        {post.list && <PostList list={post.list} />}
        {post.commentsList?.length > 0 && (
          <div style={{ display: 'grid', gap: 4, paddingTop: 4, borderTop: '1px solid var(--af-border)' }}>
            {post.commentsList.slice(0, 2).map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--af-muted)' }}>
                <strong style={{ color: 'var(--af-text)' }}>{c.handle}</strong> {c.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// ============= WHATSCALL =============
function WhatsCallList({ threads, onOpen }) {
  return (
    <div className="af-panel" style={{ padding: 0, overflow: 'hidden' }}>
      {threads.map((th, i) => (
        <button
          key={th.id}
          type="button"
          onClick={() => onOpen(th)}
          style={{
            width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 12,
            borderTop: i === 0 ? 'none' : '1px solid var(--af-border)', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', color: 'var(--af-text)',
          }}
        >
          <Avatar player={th.player} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontWeight: 900, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{th.title}</span>
              <span style={{ fontSize: 10, color: 'var(--af-muted)' }}>{th.timeLabel}</span>
            </div>
            <div style={{ fontSize: 12, color: th.unread ? 'var(--af-text)' : 'var(--af-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
              {th.preview}
            </div>
          </div>
          {th.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--af-grass)' }} />}
        </button>
      ))}
      {!threads.length && <div style={{ padding: 20, textAlign: 'center', color: 'var(--af-muted)', fontSize: 12 }}>Aucun message. Tes joueurs sont sereins.</div>}
    </div>
  );
}

function WhatsCallChat({ thread, onReply, onBack, onJumpToMessages }) {
  const linked = thread.source === 'inbox';
  return (
    <div className="af-panel af-anim-fade-up" style={{ padding: 0, display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 460, overflow: 'hidden' }}>
      <header style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--af-border)', background: 'oklch(14% 0.03 258)' }}>
        <button type="button" onClick={onBack} className="af-chip" style={{ padding: '6px 10px' }}>←</button>
        <Avatar player={thread.player} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>{thread.title}</div>
          <div style={{ fontSize: 10, color: 'var(--af-muted)' }}>{thread.player?.club ?? ''} · {linked ? 'lié à Messages' : 'en ligne'}</div>
        </div>
      </header>
      <div style={{ padding: 12, display: 'grid', gap: 8, alignContent: 'start', background: 'oklch(8% 0.02 258)' }}>
        {thread.subject && <div style={{ alignSelf: 'flex-start', fontSize: 10, color: 'var(--af-cyan)', fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>{thread.subject}</div>}
        <div style={{ alignSelf: 'flex-start', maxWidth: '82%', background: 'oklch(20% 0.03 258)', color: 'var(--af-text)', padding: '8px 12px', borderRadius: 12, borderTopLeftRadius: 2, fontSize: 13, whiteSpace: 'pre-wrap' }}>
          {thread.preview}
          <div style={{ fontSize: 9, color: 'var(--af-muted)', marginTop: 4 }}>{thread.timeLabel}</div>
        </div>
        {thread.replyText && (
          <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: 'oklch(45% 0.18 145)', color: '#fff', padding: '8px 12px', borderRadius: 12, borderTopRightRadius: 2, fontSize: 13 }}>
            {thread.replyText}
          </div>
        )}
      </div>
      <div style={{ padding: 10, borderTop: '1px solid var(--af-border)', display: 'grid', gap: 6 }}>
        {linked ? (
          <button type="button" onClick={() => onJumpToMessages(thread)} className="af-btn-primary" style={{ padding: 10 }}>📩 Répondre dans Messages</button>
        ) : !thread.replied ? (
          <>
            <button type="button" onClick={() => onReply(thread, 'support')} className="af-btn-primary" style={{ padding: 10, textAlign: 'left' }}>💚 Soutenir « Je suis avec toi, on va régler ça »</button>
            <button type="button" onClick={() => onReply(thread, 'firm')} className="af-btn-secondary" style={{ padding: 10, textAlign: 'left' }}>🧊 Recadrer « Reste pro, on en parle en réunion »</button>
            <button type="button" onClick={() => onReply(thread, 'plan')} className="af-btn-secondary" style={{ padding: 10, textAlign: 'left' }}>🎯 Plan carrière « J'ai un plan, fais-moi confiance »</button>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--af-muted)', fontSize: 11 }}>Réponse envoyée. Le joueur t'écrira de nouveau plus tard.</div>
        )}
      </div>
    </div>
  );
}

// ============= CHIRP =============
function ChirpPulse({ pulses, liked, onLike }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {pulses.map((p) => (
        <article key={p.id} className="af-panel af-anim-fade-up" style={{ padding: 12, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10 }}>
          {p.player ? <Avatar player={p.player} size={40} /> : <Avatar label={p.authorName} size={40} color="oklch(35% 0.13 258)" />}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13 }}>{p.authorName}</strong>
              <BadgeCheck size={12} color="var(--af-cyan)" />
              <span style={{ fontSize: 11, color: 'var(--af-muted)' }}>{p.handle} · {p.timeLabel}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--af-text)', marginTop: 4, lineHeight: 1.4 }}>{p.text}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, color: 'var(--af-muted)', alignItems: 'center' }}>
              <button type="button" onClick={() => onLike(p)} style={{ background: 'none', border: 'none', color: liked.has(p.id) ? 'var(--af-grass)' : 'var(--af-muted)', display: 'flex', alignItems: 'center', gap: 4, padding: 0, cursor: 'pointer' }}>
                <Heart size={14} fill={liked.has(p.id) ? 'currentColor' : 'transparent'} />
                <span style={{ fontSize: 11 }}>{p.likes + (liked.has(p.id) ? 1 : 0)}</span>
              </button>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Repeat2 size={13} /><span style={{ fontSize: 11 }}>{p.reposts}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MessageCircle size={13} /><span style={{ fontSize: 11 }}>{p.replies?.length ?? 0}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Hash size={12} /><span style={{ fontSize: 11 }}>{p.hashtag}</span></span>
            </div>
            {p.replies?.length > 0 && (
              <div style={{ display: 'grid', gap: 6, marginTop: 8, paddingLeft: 10, borderLeft: '2px solid var(--af-border)' }}>
                {p.replies.map((r, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--af-muted)' }}>
                    <strong style={{ color: 'var(--af-text)' }}>{r.handle}</strong> {r.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

// ============= MAIN =============
export default function Social({ state, onSocialAction, onToast, onJumpToMessages, initialTab = 'feed', messages = [], messageQueue = [], onRespond, onAction, focusThreadKey = null }) {
  const [tab, setTab] = useState(initialTab);
  const [liked, setLiked] = useState(() => new Set());
  const [openThread, setOpenThread] = useState(null);
  const [repliedThreads, setRepliedThreads] = useState(() => new Set());

  const week = state?.week ?? 1;
  const roster = state?.roster ?? [];
  const messagesInbox = state?.messages ?? [];
  const brandValue = state?.brandValue ?? state?.reputation ?? 50;
  const money = state?.money ?? 0;

  const featured = useMemo(() => [...roster].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 14), [roster]);

  // ---- FEED (player + club + press + fan posts) — beaucoup plus dense ----
  const posts = useMemo(() => {
    const result = [];
    const used = new Set(); // garantit zéro doublon de visuel dans tout le feed
    const officialNews = [...(state?.news ?? [])]
      .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
      .slice(0, 12)
      .map((post, idx) => {
        const seed = `official-news-${post.id ?? idx}-${week}`;
        const alertMedia = String(post.text ?? '').toLowerCase().includes('alerte médias')
          || String(post.text ?? '').toLowerCase().includes('presse')
          || String(post.text ?? '').toLowerCase().includes('médias')
          || String(post.text ?? '').toLowerCase().includes('media');
        return {
          id: `official-news-${post.id ?? idx}`,
          kind: 'press',
          player: null,
          authorName: post.accountName ?? 'Canal Football Desk',
          handle: `@${String(post.accountName ?? 'football').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          tag: alertMedia ? 'ALERTE MÉDIAS' : 'NEWS OFFICIELLE',
          text: post.text ?? '',
          image: getPostImage({ kind: 'press', tag: alertMedia ? 'press' : 'matchday', seed }),
          likes: post.likes ?? (250 + num(seed + 'l', 2500)),
          comments: post.comments ?? (12 + num(seed + 'c', 160)),
          timeLabel: weekAgo(week - (post.week ?? week), week),
          commentsList: [
            { handle: pick(PRESS_AUTHORS, seed + 'a').handle, text: alertMedia ? 'La communication du clan va être décisive.' : 'Breaking confirmé.' },
            { handle: pick(FAN_AUTHORS, seed + 'b').handle, text: alertMedia ? 'On veut la version du joueur.' : 'Ça va impacter le prochain match.' },
          ],
        };
      });
    result.push(...officialNews);
    featured.forEach((player, idx) => {
      // 2 posts joueurs par joueur (variations différentes)
      for (let v = 0; v < 2; v++) {
        const sP = `post-${player.id}-${week}-${v}`;
        const tplP = pick(PLAYER_POST_TEMPLATES, sP);
        result.push({
          id: sP, kind: 'player', player, authorName: fullName(player), handle: handleOf(player),
          tag: tplP.tag, text: tplP.text(ctxFor(player, sP)),
          image: getPostImage({ kind: 'player', tag: tplP.tag, seed: sP }),
          likes: 200 + num(sP + 'l', 12000), comments: 4 + num(sP + 'c', 200),
          timeLabel: weekAgo(week - ((idx + v) % 4), week),
          commentsList: [
            { handle: pick(FAN_AUTHORS, sP + 'a').handle, text: pick(COMMENT_POOL, sP + 'b')({ p: player }) },
            { handle: pick(FAN_AUTHORS, sP + 'c').handle, text: pick(COMMENT_POOL, sP + 'd')({ p: player }) },
            { handle: pick(FAN_AUTHORS, sP + 'e').handle, text: pick(COMMENT_POOL, sP + 'f')({ p: player }) },
          ],
        });
      }
      // club post à chaque joueur (au lieu d'1 sur 2)
      if (player.club) {
        const sC = `club-${player.club}-${week}-${idx}`;
        const tplC = pick(CLUB_POST_TEMPLATES, sC);
        result.push({
          id: sC, kind: 'club', player: null, authorName: player.club, handle: clubHandle(player.club),
          tag: tplC.tag, text: tplC.text({ club: player.club, ...ctxFor(player, sC) }),
          image: getPostImage({ kind: 'club', tag: tplC.tag, seed: sC }),
          likes: 800 + num(sC + 'l', 8000), comments: 12 + num(sC + 'c', 300),
          timeLabel: weekAgo(week - (idx % 3), week),
          commentsList: [
            { handle: pick(FAN_AUTHORS, sC + 'a').handle, text: pick(COMMENT_POOL, sC + 'b')({ p: player }) },
            { handle: pick(FAN_AUTHORS, sC + 'c').handle, text: pick(COMMENT_POOL, sC + 'd')({ p: player }) },
          ],
        });
      }
      // press post 2 sur 3 (au lieu d'1 sur 3)
      if (idx % 3 !== 2) {
        const sR = `press-${player.id}-${week}`;
        const author = pick(PRESS_AUTHORS, sR);
        const tplR = pick(PRESS_POST_TEMPLATES, sR);
        result.push({
          id: sR, kind: 'press', player, authorName: author.name, handle: author.handle,
          tag: tplR.tag, text: tplR.text(ctxFor(player, sR)),
          image: getPostImage({ kind: 'press', tag: tplR.tag, seed: sR }),
          likes: 150 + num(sR + 'l', 3000), comments: 8 + num(sR + 'c', 100),
          timeLabel: weekAgo(week - (idx % 4), week),
          commentsList: [
            { handle: pick(FAN_AUTHORS, sR + 'a').handle, text: pick(COMMENT_POOL, sR + 'b')({ p: player }) },
            { handle: pick(FAN_AUTHORS, sR + 'c').handle, text: pick(COMMENT_POOL, sR + 'd')({ p: player }) },
          ],
        });
      }
      // fan post 1 sur 2 (au lieu d'1 sur 4)
      if (idx % 2 === 1) {
        const sF = `fan-${player.id}-${week}`;
        const author = pick(FAN_AUTHORS, sF);
        const tplF = pick(FAN_POST_TEMPLATES, sF);
        result.push({
          id: sF, kind: 'fan', player, authorName: author.name, handle: author.handle,
          tag: tplF.tag, text: tplF.text(ctxFor(player, sF)),
          image: getPostImage({ kind: 'fan', tag: tplF.tag, seed: sF }),
          likes: 30 + num(sF + 'l', 800), comments: 2 + num(sF + 'c', 40),
          timeLabel: weekAgo(week - (idx % 5), week),
          commentsList: [{ handle: pick(FAN_AUTHORS, sF + 'x').handle, text: pick(COMMENT_POOL, sF + 'y')({ p: player }) }],
        });
      }
    });
    // ---- BOND-DRIVEN POSTS (duos & rivalités) ----
    try {
      const bondPosts = generateBondSocialPosts(state?.playerBonds ?? {}, roster, { week, max: 4 });
      bondPosts.forEach((bp, k) => {
        const author = bp.kind === 'press' ? PRESS_AUTHORS[k % PRESS_AUTHORS.length] : FAN_AUTHORS[k % FAN_AUTHORS.length];
        const sB = `bond-${bp.players[0].id}-${bp.players[1].id}-${week}-${k}`;
        const tag = bp.tone === 'duo' ? 'fan' : 'press';
        result.push({
          id: sB, kind: bp.kind, player: bp.players[0],
          authorName: author.name, handle: author.handle,
          tag, text: bp.text,
          image: getPostImage({ kind: bp.kind, tag, seed: sB }),
          likes: 400 + num(sB + 'l', 8000), comments: 12 + num(sB + 'c', 200),
          timeLabel: weekAgo(week - (k % 3), week),
          commentsList: [
            { handle: pick(FAN_AUTHORS, sB + 'a').handle, text: bp.tone === 'duo' ? 'Le duo en or 🥹' : 'Ça sent le clash sah 👀' },
            { handle: pick(FAN_AUTHORS, sB + 'b').handle, text: bp.tone === 'duo' ? 'Inarrêtables ces deux-là.' : 'Le coach doit gérer ça vite.' },
          ],
        });
      });
    } catch { /* bonds optional */ }
    // ---- LIVING POSTS (sélections nationales, classements, UEFA, clubs) ----
    try {
      const season = Math.floor((week - 1) / 38) + 1;
      const agentPlayerIds = new Set(roster.map((p) => p?.id).filter(Boolean));
      const agentClubs = new Set(roster.map((p) => p?.club).filter(Boolean));
      const livingPosts = generateLivingFeedPosts({ state, week, season, agentPlayerIds, agentClubs });
      result.push(...livingPosts);
    } catch (e) { /* living feed optional */ }
    // shuffle by deterministic seed for varied feed
    return result.sort((a, b) => seedHash(a.id + 'sort') - seedHash(b.id + 'sort'));
  }, [featured, week, roster, state]);

  // ---- WHATSCALL THREADS (inbox messages first, then generated stress threads) ----
  const threads = useMemo(() => {
    const out = [];
    const seenPlayers = new Set();
    // inbox
    [...messagesInbox].slice(0, 20).forEach((msg) => {
      if (!msg) return;
      const player = roster.find((p) => p.id === msg.playerId) ?? { id: msg.playerId, firstName: msg.playerName?.split(' ')[0] ?? '?', lastName: msg.playerName?.split(' ').slice(1).join(' ') ?? '', club: msg.club ?? '', rating: 75 };
      const id = `inbox-${msg.id ?? msg.playerId + '-' + msg.week}`;
      seenPlayers.add(msg.playerId);
      out.push({
        id, source: 'inbox', player, title: msg.playerName ?? fullName(player),
        subject: msg.subject ?? msg.type ?? null,
        preview: msg.body ?? msg.subject ?? 'Nouveau message',
        timeLabel: weekAgo(week - (msg.week ?? week), week),
        unread: !msg.read, replied: false, replyText: null,
      });
    });
    // generated stress threads (only for players not already in inbox)
    const candidates = [...roster]
      .filter((p) => !seenPlayers.has(p.id) && ((p.moral ?? 100) < 75 || (p.trust ?? 100) < 65))
      .sort((a, b) => ((a.moral ?? 100) + (a.trust ?? 100)) - ((b.moral ?? 100) + (b.trust ?? 100)))
      .slice(0, 4);
    candidates.forEach((player, i) => {
      const seed = `dm-${player.id}-${week}`;
      const tpl = pick(DM_TONES, seed);
      out.push({
        id: seed, source: 'generated', player, title: fullName(player),
        subject: null, preview: tpl.text,
        timeLabel: weekAgo(week - (i % 3), week),
        unread: !repliedThreads.has(seed), replied: repliedThreads.has(seed), replyText: null,
      });
    });
    return out;
  }, [messagesInbox, roster, week, repliedThreads]);

  // ---- CHIRP PULSES — beaucoup plus dense ----
  const pulses = useMemo(() => {
    const result = [];
    // 2 pulses par joueur featured (12 joueurs => 24 pulses joueurs)
    featured.forEach((player, i) => {
      for (let v = 0; v < 2; v++) {
        const seed = `pulse-${player.id}-${week}-${v}`;
        const tplIdx = seedHash(seed) % PULSE_TEMPLATES.length;
        const author = pick(PULSE_AUTHORS, seed + 'a');
        const replies = [
          { handle: pick(FAN_AUTHORS, seed + 'r1').handle, text: pick(COMMENT_POOL, seed + 'r1t')({ p: player }) },
          { handle: pick(FAN_AUTHORS, seed + 'r2').handle, text: pick(COMMENT_POOL, seed + 'r2t')({ p: player }) },
          { handle: pick(FAN_AUTHORS, seed + 'r3').handle, text: pick(COMMENT_POOL, seed + 'r3t')({ p: player }) },
        ];
        result.push({
          id: seed, player, author, authorName: author.name, handle: author.handle,
          text: PULSE_TEMPLATES[tplIdx]({ p: player }),
          likes: 80 + num(seed + 'l', 4000), reposts: 12 + num(seed + 'rp', 800),
          hashtag: pick(PULSE_HASHTAGS, seed),
          timeLabel: weekAgo(week - ((i + v) % 6), week),
          replies,
          verified: author.verified,
        });
      }
    });
    // generic non-player posts
    PULSE_NO_PLAYER.forEach((entry, i) => {
      const seed = `pulse-gen-${i}-${week}`;
      result.push({
        id: seed, player: null, author: null, authorName: entry.name, handle: entry.handle,
        text: entry.text, likes: 50 + num(seed + 'l', 2000), reposts: 5 + num(seed + 'rp', 200),
        hashtag: pick(PULSE_HASHTAGS, seed),
        timeLabel: weekAgo(week - i, week),
        replies: [{ handle: pick(FAN_AUTHORS, seed + 'r').handle, text: pick(COMMENT_POOL, seed + 'rt')({ p: featured[0] ?? { firstName: 'Joueur', lastName: 'X' } }) }],
      });
    });
    return result.sort((a, b) => seedHash(a.id + 'srt') - seedHash(b.id + 'srt'));
  }, [featured, week]);

  // ---- HANDLERS ----
  const handleLikePost = (post) => {
    if (liked.has(post.id)) return;
    setLiked((s) => new Set(s).add(post.id));
    if (post.player) {
      onSocialAction?.({ type: 'like_post', playerId: post.player.id });
      onToast?.(`+1 confiance pour ${post.player.firstName}`, 'success');
    } else {
      onSocialAction?.({ type: 'like_post' });
    }
  };
  const handleComment = (post) => {
    onToast?.('Commentaire envoyé.', 'info');
    if (post.player) onSocialAction?.({ type: 'comment_post', playerId: post.player.id });
  };
  const handlePublish = (text) => {
    if ((state?.money ?? 0) < POST_COST) { onToast?.('Fonds insuffisants', 'error'); return; }
    onSocialAction?.({ type: 'publish_sponsored', text, cost: POST_COST });
    onToast?.(`Post publié. +3 marque, -${formatMoney(POST_COST)}`, 'success');
  };
  const handleReply = (thread, tone) => {
    setRepliedThreads((s) => new Set(s).add(thread.id));
    onSocialAction?.({ type: 'reply_dm', playerId: thread.player.id, tone });
    onToast?.('Réponse envoyée', 'success');
    setOpenThread((cur) => cur ? { ...cur, replied: true, replyText: tone === 'support' ? 'Je suis avec toi, on va régler ça' : tone === 'firm' ? 'Reste pro, on en parle en réunion' : "J'ai un plan, fais-moi confiance" } : cur);
  };
  const handleJumpToMessages = (thread) => {
    onJumpToMessages?.(thread.player?.id);
  };
  const handleLikePulse = (p) => {
    if (liked.has(p.id)) return;
    setLiked((s) => new Set(s).add(p.id));
    if (p.player) onSocialAction?.({ type: 'like_pulse', playerId: p.player.id });
  };

  const TABS = [
    { key: 'feed', label: 'InstaPro', icon: Sparkles, color: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)' },
    { key: 'chats', label: 'WhatsCall', icon: MessageCircle, color: 'linear-gradient(135deg, #10b981, #059669)' },
    { key: 'pulse', label: 'Chirp', icon: Flame, color: 'linear-gradient(135deg, #0ea5e9, #1d4ed8)' },
  ];

  return (
    <div className="af-page" style={{ display: 'grid', gap: 14 }}>
      <div>
        <div className="af-kicker">HUB SOCIAL</div>
        <h1 className="af-title">Réseaux</h1>
        <div style={{ color: 'var(--af-muted)', fontSize: 12, marginTop: 6 }}>
          Marque <strong style={{ color: 'var(--af-gold)' }}>{brandValue}</strong> · Trésorerie <strong style={{ color: 'var(--af-grass)' }}>{formatMoney(money)}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setOpenThread(null); }}
            style={{
              padding: '10px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: tab === t.key ? t.color : 'oklch(16% 0.035 258 / .92)',
              color: '#fff', fontWeight: 900, fontSize: 12, letterSpacing: '.04em',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              opacity: tab === t.key ? 1 : 0.7,
            }}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'feed' && <InstaFeed posts={posts} liked={liked} onLike={handleLikePost} onComment={handleComment} onPublish={handlePublish} brandValue={brandValue} money={money} />}
      {tab === 'chats' && (
        <div className="af-panel" style={{ padding: 0, overflow: 'hidden', background: 'oklch(10% 0.02 258)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--af-border)', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={16} />
            <strong style={{ fontSize: 13, letterSpacing: '.04em' }}>WhatsCall</strong>
            <span style={{ fontSize: 10, opacity: .85, marginLeft: 'auto' }}>Conversations liées au terrain</span>
          </div>
          <Messages messages={messages} messageQueue={messageQueue} onRespond={onRespond} onAction={onAction} focusThreadKey={focusThreadKey} />
        </div>
      )}
      {tab === 'pulse' && <ChirpPulse pulses={pulses} liked={liked} onLike={handleLikePulse} />}
    </div>
  );
}
