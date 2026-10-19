/**
 * Who this site says it is: its name, page metadata and logo.
 *
 * Started as admins/frontend-kit/siteBranding.js (pushed by agents/push-frontend-kit.mjs); this
 * copy adds the runtime source below — carry it back to the kit before the next push.
 *
 * TWO SOURCES, RUNTIME FIRST.
 *
 * 1. Runtime (live mode only): the owner panel's branding, read from
 *    `GET /api/v1/admin/branding/public` (docs/OWNER-PANEL.md §8) — site name, title, title
 *    template, description, keywords, Open Graph, theme colour, and the URLs of the uploaded
 *    logo, square mark and OG image (`/api/v1/admin/branding/asset/<sha256>.<ext>`, immutable).
 *    The last answer is kept in localStorage (`hge.branding`) so the next load draws the right
 *    logo before the read answers, as the theme does (`hge.theme`).
 * 2. Build time (the fallback, and the only source in fixture mode): NEXT_PUBLIC_SITE_TITLE,
 *    NEXT_PUBLIC_SITE_DESCRIPTION and NEXT_PUBLIC_SITE_LOGO (a NAME of a file under
 *    public/brand/), as the frontend-kit push writes them.
 *
 * Nothing set reads as null everywhere, so an unbranded site — and the fixture build, which is
 * the pixel reference — keeps the title in app/layout and the logo its own code imports.
 *
 *   applySiteBranding()                 // document.title, meta, OG, theme colour, favicon, loader
 *   loadSiteBranding()                  // live mode: read the backend, apply, notify
 *   useSiteLogo({ own: 'hash-games' })  // in a component: the logo URL, or null → draw your own
 *   useSiteMark()                       // the square mark URL, or null
 *
 * `own` is this front end's own site key. Asked by NAME for its own logo it gets null: its
 * imported images have light, dark and small variants that one file under public/brand/ does not.
 */
import { useSyncExternalStore } from 'react';
import { fetchSharedJson } from './client';
import { onLiveState } from './liveStore';
import { API_BASE, BRANDING_PATH, BRANDING_STORAGE_KEY, LIVE, cleanBranding } from './siteBrandingCore.js';

/**
 * The static images under public/brand/. The NAME IS THE SITE KEY, exactly as
 * the owner panel registers it — `hash-games` finds hash-games.png and nothing
 * else does. No aliases, no partial matches: one name, one file.
 */
const LOGOS = {
  shuffle: 'shuffle.svg',
  'hash-games': 'hash-games.png',
  'stake-site': 'stake-site.svg',
  addaplay: 'addaplay.webp',
  roobet: 'roobet.svg',
  parker567: 'parker567.png',
};

/* The square marks that go with a logo above (favicon, loader), by the same name. */
const MARKS = {
  parker567: 'parker567-mark.webp',
};

/* This front end is Parker567's. In live mode an unbranded backend (the owner has not uploaded a
   logo yet) must still show Parker567, never the BC.GAME art the code imports, so the live build
   falls back to these files when NEXT_PUBLIC_SITE_LOGO is not set. Fixture mode (the pixel
   reference) keeps the imported art. */
const LIVE_DEFAULT_BRAND = LIVE ? 'parker567' : null;

/* Next inlines `process.env.NEXT_PUBLIC_*` only where it is written out literally, so the keys
   are spelled out here rather than read by name. */
const ENV = {
  NEXT_PUBLIC_SITE_TITLE: process.env.NEXT_PUBLIC_SITE_TITLE,
  NEXT_PUBLIC_SITE_DESCRIPTION: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
  NEXT_PUBLIC_SITE_LOGO: process.env.NEXT_PUBLIC_SITE_LOGO,
};

export { BRANDING_BOOT_SCRIPT, BRANDING_PATH, BRANDING_STORAGE_KEY, cleanBranding } from './siteBrandingCore.js';

const env = (key) => {
  const value = ENV[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const absolute = (path) => (path ? `${API_BASE}${path}` : null);

function readCache() {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    return raw ? cleanBranding(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(value) {
  try {
    if (value) localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(BRANDING_STORAGE_KEY);
  } catch {
    /* private mode: the next load draws the UI's own logo until the read answers */
  }
}

let runtime = LIVE && typeof window !== 'undefined' ? readCache() : null;
const listeners = new Set();

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const snapshot = () => runtime;
const serverSnapshot = () => null;

/** The runtime branding (live mode), or null. */
export const runtimeBranding = () => runtime;

const exact = (name) => (LOGOS[String(name ?? '').trim().toLowerCase()] ? String(name).trim().toLowerCase() : null);

/**
 * The image for a name, or null. `own` is this front end's own site key: asked
 * for its own logo it gets null, so its imported images stay in use.
 */
export function logoFor(name, { own } = {}) {
  const key = exact(name);
  if (!key || key === exact(own)) return null;
  const base = String(process.env.NEXT_PUBLIC_BASE_PATH ?? '/').replace(/\/*$/, '/');
  return `${base}brand/${LOGOS[key]}`;
}

/** The site's name (the logo's alt text), or null. */
export const siteName = () => runtime?.siteName ?? null;
/**
 * The name to PRINT in copy ("Parker567"): the owner's `siteName`, cased as the title spells it
 * (the panel stores the key lower-case, `parker567`, while the title reads "Parker567 — …").
 * Falls back to the build-time title's first word, then to "Parker567". Never
 * the original's "BC.GAME".
 */
export function brandName() {
  const name = runtime?.siteName ?? null;
  const title = runtime?.title ?? env('NEXT_PUBLIC_SITE_TITLE') ?? '';
  if (name) {
    const at = title.toLowerCase().indexOf(name.toLowerCase());
    if (at >= 0) return title.slice(at, at + name.length);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  const first = title.split(/\s+[—–|·-]\s+/)[0]?.trim();
  return first || 'Parker567';
}
/**
 * The placeholders the help/responsible documents ship with (`q()` in createHtmlFile), filled
 * with THIS site's identity instead of bc.game's. The mail address follows the original's own
 * non-bc.game branch, `support@<host>`.
 */
export function brandTokens() {
  const name = brandName();
  const host = typeof window !== 'undefined' ? window.location.host : '';
  return {
    __BC_HOST__: name,
    __SMALL_BC_HOST__: host || name.toLowerCase(),
    __BC_SITENAME__: name,
    __SMALL_BC_MAIL_ADDRESS__: `support@${(host || name.toLowerCase()).replace(/:\d+$/, '')}`,
  };
}

/** "BC Originals" / "BC Exclusive" / "BC.GAME: Originals" as this site prints them: the bare
 *  word, "Originals" / "Exclusive", with no brand prefix (the user's call — not "Parker567
 *  Originals"). For labels that double as keys (tag hrefs, tag searches) — rename at DISPLAY only. */
export const brandLabel = (label) =>
  typeof label === 'string'
    ? label.replace(/\bBC(?:\.GAME)?:?\s+(Originals|Exclusive)\b/g, (_, word) => word)
    : label;

export const siteTitle = () => runtime?.title ?? runtime?.siteName ?? env('NEXT_PUBLIC_SITE_TITLE');
export const siteDescription = () => runtime?.description ?? env('NEXT_PUBLIC_SITE_DESCRIPTION');

/** The owner's uploaded logo, else the one chosen by exact name, else null: the site's own. */
export const siteLogo = (options) =>
  absolute(runtime?.logoUrl) ?? logoFor(env('NEXT_PUBLIC_SITE_LOGO') ?? LIVE_DEFAULT_BRAND, options);

/** The static mark for a brand name, or null. */
export function markFor(name) {
  const file = MARKS[String(name ?? '').trim().toLowerCase()];
  if (!file) return null;
  const base = String(process.env.NEXT_PUBLIC_BASE_PATH ?? '/').replace(/\/*$/, '/');
  return `${base}brand/${file}`;
}

/** The owner's square mark (favicon, signed-in mobile header, loader), else the build's, or null. */
export const siteMark = () =>
  absolute(runtime?.markUrl) ?? markFor(env('NEXT_PUBLIC_SITE_LOGO') ?? LIVE_DEFAULT_BRAND);

/** Hooks: the same values, re-rendering when the runtime branding arrives or changes. */
export function useSiteBranding() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
export function useSiteLogo(options) {
  useSiteBranding();
  return siteLogo(options);
}
export function useBrandName() {
  useSiteBranding();
  return brandName();
}
export function useSiteMark() {
  useSiteBranding();
  return siteMark();
}

function setMeta(attr, key, content) {
  let meta = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) return;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function setFavicon(url) {
  if (!url) return;
  const type = url.endsWith('.svg') ? 'image/svg+xml' : url.endsWith('.webp') ? 'image/webp' : 'image/png';
  if (!document.head.querySelector('link[rel~="icon"]')) {
    const link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  for (const link of document.head.querySelectorAll('link[rel~="icon"]')) {
    if (link.getAttribute('href') === url) continue;
    link.setAttribute('href', url);
    link.setAttribute('type', type);
  }
}

/* The pre-boot loader (#start-up, app/boot-style.ts) draws the square mark in live mode. */
/** Puts the current branding on the document. Leaves the layout's own values where nothing is set. */
export function applySiteBranding() {
  if (typeof document === 'undefined') return;
  const title = siteTitle();
  const description = siteDescription();

  if (title) document.title = title;
  if (description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }
  /* The mark has a build-time fallback, so it goes on even before (or without) the backend's. */
  setFavicon(siteMark());
  if (!runtime) return;

  setMeta('name', 'keywords', runtime.keywords.length ? runtime.keywords.join(', ') : null);
  setMeta('property', 'og:site_name', runtime.siteName);
  setMeta('property', 'og:title', runtime.ogTitle ?? title);
  setMeta('property', 'og:description', runtime.ogDescription ?? description);
  setMeta('property', 'og:image', absolute(runtime.ogImageUrl));
  setMeta('name', 'theme-color', runtime.themeColor);
}

let loading = null;

function adoptBranding(data) {
  const next = cleanBranding(data);
  if (JSON.stringify(next) === JSON.stringify(runtime)) return;
  runtime = next;
  writeCache(next);
  applySiteBranding();
  for (const fn of listeners) fn();
}

/* An owner's branding change reaches an open tab with the socket's next state. */
if (LIVE && typeof window !== 'undefined') {
  onLiveState((state) => {
    if (state?.branding) adoptBranding(state.branding);
  });
}

/** Live mode: read the backend's branding, keep it, apply it, re-render the logos. Never throws. */
export function loadSiteBranding() {
  if (!LIVE || typeof window === 'undefined') return Promise.resolve(null);
  if (loading) return loading;
  // Through the client seam, which answers it from the realtime socket's state when it can.
  loading = fetchSharedJson(BRANDING_PATH, { base: API_BASE })
    .then((body) => {
      if (!body || body.success === false) return runtime; // unreachable: keep the cached copy
      adoptBranding(body.data);
      return runtime;
    })
    .catch(() => runtime)
    .finally(() => {
      loading = null;
    });
  return loading;
}
