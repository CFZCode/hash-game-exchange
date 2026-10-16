import { ApiError, API_BASE, requestPage, request } from './client';

/* The site's own blog — `/blog` and `/blog/:slug`, served by admin-service's `blogs` module.
 *
 * A DELIBERATE DEPARTURE (the user's request): bc.game's Blog row and footer News link go to an
 * external site (blog.bc.game). Here they are internal pages over the posts the site admin writes
 * (admin `content/Blogs`), switched by the OWNER's `blog` feature (gates.js `blog`).
 *
 *   GET /api/v1/admin/blogs?page&limit&category      paged; `meta.pagination`; never the body
 *   GET /api/v1/admin/blogs/slug/:slug               one post, `description` is the body (HTML)
 *   GET /api/v1/admin/blogs/:id/image                the cover's bytes (`imageUrl` on each row)
 *
 * Every read is `403 NOT_ENTITLED {kind: feature, key: blog}` while the owner's plan has the blog
 * off. The gate normally keeps the page from being reached at all, but it fails OPEN on a failed
 * features read, so the refusal is read here as "no posts" and the page draws its empty state.
 * Unpublished posts never come back (the backend filters them for anyone without config:read).
 *
 * Paths are local rather than in `endpoints.js` for the reason gates.js gives: only this file
 * reads them. */
const BLOGS = '/api/v1/admin/blogs';
const bySlug = (slug) => `${BLOGS}/slug/${encodeURIComponent(slug)}`;

export const BLOG_PAGE_SIZE = 12;

/** The category tabs are derived from the posts themselves; this many is plenty to find them. */
const CATEGORY_SCAN = 100;

const isEmptyAnswer = (error) =>
  error instanceof ApiError && (error.code === 'NOT_ENTITLED' || error.code === 'BLOGS_NOT_FOUND' || error.status === 404);

/** Absolute, so a cover served by the gateway resolves from this origin too. */
const absolute = (url) => (typeof url === 'string' && url.startsWith('/') ? `${API_BASE}${url}` : url ?? null);

const toPost = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title ?? '',
  summary: row.subheading ?? '',
  author: row.author ?? '',
  category: row.category ?? '',
  /* What the post says it was written on, then when it went live. */
  date: row.date ?? row.publishedAt ?? row.createdAt ?? null,
  image: absolute(row.imageUrl),
  content: row.description ?? '',
});

/* ── Fixture: three posts so the fixture build has a page to draw. Neutral copy, no brand. ── */
const FIXTURE_ROWS = [
  {
    id: 3,
    slug: 'how-provably-fair-games-work',
    title: 'How provably fair games work',
    subheading: 'Every round can be checked with the server seed, the client seed and the nonce.',
    author: 'Team',
    category: 'Guides',
    date: '2026-10-01T00:00:00.000Z',
    imageUrl: null,
    description:
      '<p>Every result is derived from a server seed, your client seed and a nonce. The server seed is hashed and shown to you before you play, so it cannot be changed afterwards.</p><h2>Checking a round</h2><ol><li>Reveal the server seed.</li><li>Hash it and compare it with the hash you were shown.</li><li>Recompute the result.</li></ol>',
  },
  {
    id: 2,
    slug: 'responsible-play-tools',
    title: 'Responsible play tools',
    subheading: 'Deposit limits, cool-off periods and self-exclusion, all from your settings.',
    author: 'Team',
    category: 'News',
    date: '2026-09-20T00:00:00.000Z',
    imageUrl: null,
    description: '<p>You can set limits on what you deposit and how long you play, or take a break entirely.</p>',
  },
  {
    id: 1,
    slug: 'welcome-to-the-blog',
    title: 'Welcome to the blog',
    subheading: 'News, guides and updates from the team.',
    author: 'Team',
    category: 'News',
    date: '2026-09-01T00:00:00.000Z',
    imageUrl: null,
    description: '<p>This is where we post news, guides and updates.</p>',
  },
];

const fixturePage = ({ page, category }) => {
  const rows = category ? FIXTURE_ROWS.filter((r) => r.category === category) : FIXTURE_ROWS;
  const start = (page - 1) * BLOG_PAGE_SIZE;
  return {
    rows: rows.slice(start, start + BLOG_PAGE_SIZE).map((row) => ({ ...row, description: undefined })),
    pagination: { page, limit: BLOG_PAGE_SIZE, total: rows.length, totalPages: Math.max(Math.ceil(rows.length / BLOG_PAGE_SIZE), 1) },
  };
};

const EMPTY_PAGE = { rows: [], pagination: null };

const readPage = (params, fixture) =>
  Promise.resolve(requestPage(BLOGS, { live: true, params, fixture })).catch((error) => {
    if (isEmptyAnswer(error)) return EMPTY_PAGE;
    throw error;
  });

/**
 * One page of posts plus the category tabs.
 * @returns {Promise<{posts: Array, categories: string[], total: number, pages: number}>}
 */
export async function getBlogFeed({ page = 1, category = '' } = {}) {
  const [list, scan] = await Promise.all([
    readPage({ page, limit: BLOG_PAGE_SIZE, category: category || undefined }, fixturePage({ page, category })),
    readPage({ page: 1, limit: CATEGORY_SCAN }, fixturePage({ page: 1, category: '' })),
  ]);

  const categories = [...new Set(scan.rows.map((r) => r.category).filter(Boolean))];
  const total = Number(list.pagination?.total ?? list.rows.length) || 0;
  const pages = Math.max(Number(list.pagination?.totalPages) || Math.ceil(total / BLOG_PAGE_SIZE) || 1, 1);

  return { posts: list.rows.map(toPost), categories, total, pages };
}

/** One published post by its slug, or `null` when there is none (or the blog is off). */
export function getBlogPost(slug) {
  const fixture = FIXTURE_ROWS.find((r) => r.slug === slug) ?? null;
  return Promise.resolve(request(bySlug(slug), { live: true, fixture }))
    .then((row) => (row ? toPost(row) : null))
    .catch((error) => {
      if (isEmptyAnswer(error)) return null;
      throw error;
    });
}

/* ── The body is staff-written HTML. It is sanitised before it is drawn ───────────────────── */

const ALLOWED_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td',
  'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
]);
/* Dropped with everything inside them; any other unknown tag is unwrapped (its text kept). */
const DROP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base', 'svg', 'math', 'template', 'noscript', 'frame', 'frameset']);
const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width', 'height']);
const SAFE_URL = /^(?:https?:|mailto:|tel:|\/|#|\.{0,2}\/)/i;

const safeUrl = (value, isImage) => {
  // Control characters and whitespace are ignored by browsers inside a scheme (`java\tscript:`).
  const v = [...String(value ?? '')].filter((ch) => ch.charCodeAt(0) > 32 && ch.charCodeAt(0) !== 127).join('');
  if (!v) return null;
  if (isImage && /^data:image\/(?:png|jpe?g|gif|webp);/i.test(v)) return value;
  return SAFE_URL.test(v) || !/^[a-z][a-z0-9+.-]*:/i.test(v) ? value : null;
};

function clean(node) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 8) {
      child.remove();
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) {
      child.remove();
      continue;
    }
    clean(child);
    if (!ALLOWED_TAGS.has(tag)) {
      child.replaceWith(...child.childNodes);
      continue;
    }
    for (const attr of [...child.attributes]) {
      const name = attr.name.toLowerCase();
      if (!ALLOWED_ATTRS.has(name)) {
        child.removeAttribute(attr.name);
      } else if (name === 'href' || name === 'src') {
        const ok = safeUrl(attr.value, name === 'src');
        if (ok === null) child.removeAttribute(attr.name);
      }
    }
    if (tag === 'a' && child.getAttribute('href')) {
      child.setAttribute('rel', 'noopener noreferrer nofollow');
      if (/^https?:/i.test(child.getAttribute('href'))) child.setAttribute('target', '_blank');
    }
    if (tag === 'img') child.setAttribute('loading', 'lazy');
  }
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Sanitised HTML for a post body. Plain text (no tags) becomes paragraphs. */
export function sanitizeBlogHtml(input) {
  const raw = String(input ?? '');
  if (!raw.trim()) return '';
  const html = /<[a-z][\s\S]*>/i.test(raw)
    ? raw
    : raw
        .split(/\n{2,}/)
        .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('');
  if (typeof DOMParser === 'undefined') return escapeHtml(raw);
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  clean(doc.body);
  return doc.body.innerHTML;
}
