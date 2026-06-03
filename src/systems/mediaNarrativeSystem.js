const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[0-9]/g, '#')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s#]/gu, '')
    .trim();

const makeFingerprint = (post = {}) =>
  [
    post.type ?? 'media',
    post.playerId ?? 'agency',
    post.accountName ?? '',
    normalizeText(post.text ?? ''),
  ].join('|');

const hashString = (value = '') => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0);
};

const POSITIVE_OPENERS = [
  'Analyse du jour:',
  'Point presse:',
  'Tendance positive:',
];
const NEGATIVE_OPENERS = [
  'Sous tension:',
  'Controverse:',
  'Décryptage crise:',
];
const NEUTRAL_OPENERS = [
  'Suivi mercato:',
  'Fil rédaction:',
  'Contexte:',
];

const getToneOpener = (post = {}, week = 1, stance = 50) => {
  const impact = Number(post.reputationImpact ?? 0);
  const tone = impact >= 2 ? 'positive' : impact <= -2 ? 'negative' : 'neutral';
  const pool = tone === 'positive'
    ? POSITIVE_OPENERS
    : tone === 'negative'
      ? NEGATIVE_OPENERS
      : NEUTRAL_OPENERS;
  const idx = hashString(`${post.id ?? ''}:${week}:${stance}`) % pool.length;
  return pool[idx];
};

const injectRivalryContext = (text = '', rivalries = []) => {
  if (!rivalries.length) return text;
  const hot = rivalries[0];
  if (!hot?.clubs?.length || String(text).toLowerCase().includes('rival')) return text;
  return `${text} Le contexte de rivalité ${hot.clubs[0]}-${hot.clubs[1]} garde la pression haute.`;
};

export const buildNarrativeMediaFeed = ({
  posts = [],
  week = 1,
  mediaRelations = {},
  worldMemory = {},
  historicalCanon = {},
  cap = 60,
} = {}) => {
  const storedFingerprints = new Set(historicalCanon?.mediaMemory?.recentFingerprints ?? []);
  const nextFingerprints = [];
  const dedupLocal = new Set();
  const rivalries = Object.values(worldMemory?.rivalries ?? {})
    .filter((item) => (item?.heat ?? 0) >= 70)
    .sort((a, b) => (b?.heat ?? 0) - (a?.heat ?? 0))
    .slice(0, 2);

  const relationValues = Object.values(mediaRelations ?? {});
  const mediaStance = relationValues.length
    ? Math.round(relationValues.reduce((sum, value) => sum + Number(value ?? 50), 0) / relationValues.length)
    : 50;

  const finalPosts = [];
  (posts ?? []).forEach((post, idx) => {
    if (!post || !post.text) return;
    const fingerprint = makeFingerprint(post);
    if (storedFingerprints.has(fingerprint) || dedupLocal.has(fingerprint)) return;
    dedupLocal.add(fingerprint);
    nextFingerprints.push(fingerprint);
    const opener = getToneOpener(post, week + idx, mediaStance);
    const withOpener = String(post.text).startsWith(opener)
      ? String(post.text)
      : `${opener} ${post.text}`;
    const contextualText = idx % 7 === 0
      ? injectRivalryContext(withOpener, rivalries)
      : withOpener;
    finalPosts.push({
      ...post,
      text: contextualText,
    });
  });

  const existingArcs = { ...(historicalCanon?.mediaMemory?.arcByKey ?? {}) };
  finalPosts.slice(0, 12).forEach((post) => {
    const arcKey = `${post.type ?? 'media'}:${post.playerId ?? 'agency'}`;
    const current = existingArcs[arcKey] ?? { beats: 0, lastWeek: 0 };
    existingArcs[arcKey] = {
      beats: Math.min(50, Number(current.beats ?? 0) + 1),
      lastWeek: week,
    };
  });

  return {
    posts: finalPosts.slice(0, cap),
    mediaMemoryPatch: {
      recentFingerprints: [...nextFingerprints, ...(historicalCanon?.mediaMemory?.recentFingerprints ?? [])].slice(0, 240),
      arcByKey: existingArcs,
    },
  };
};
