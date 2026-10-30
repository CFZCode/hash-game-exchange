/* The owner's template as a colour theme on this UI (src/theme/palettes.css).
 *
 * `GET /admin/features/public` (read by services/gates.js) carries `{feature: 'theme', variant}`.
 * The key goes on <html data-theme>; `hash_game` (the default, bc.game's own colours) and any key
 * palettes.css does not know change nothing. The last key is kept in localStorage so the next load
 * paints it before the read answers (THEME_BOOT_SCRIPT, inlined in app/layout's <head>).
 * With fixtures on nothing is read or applied: the fixture build is the pixel reference.
 *
 * A whitelabel copy can carry the parent's CUSTOM palette (GET /admin/whitelabel-link/theme): its
 * 13 `--p-*` tokens go on <html> as inline variables and the key becomes `custom`, which beats the
 * owner's template until the palette is cleared. */

export const THEME_STORAGE_KEY = 'hge.theme';
export const PALETTE_STORAGE_KEY = 'hge.palette';
export const DEFAULT_THEME = 'hash_game';
const CUSTOM_THEME = 'custom';
const KEY_RE = /^[a-z0-9_]{1,40}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const PALETTE_KEYS = ['bg', 's1', 's2', 's3', 'border', 'text', 'muted', 'primary', 'ink', 'accent', 'live', 'hi', 'lo'];

let customActive = false;
let lastTemplate = DEFAULT_THEME;

/** The theme key in a features/public list, or null when the list names none. */
export function themeOf(features) {
  if (!Array.isArray(features)) return null;
  const row = features.find((f) => f && f.feature === 'theme');
  return row && typeof row.variant === 'string' && KEY_RE.test(row.variant) ? row.variant : null;
}

const store = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode: the next load just paints the default first */
  }
};

export function applyTheme(key) {
  if (typeof document === 'undefined') return;
  lastTemplate = key && KEY_RE.test(key) ? key : DEFAULT_THEME;
  const theme = customActive ? CUSTOM_THEME : lastTemplate;
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  store(THEME_STORAGE_KEY, theme);
}

/** A complete, well-formed palette or null (a bad one is ignored, never half-applied). */
const cleanPalette = (palette) =>
  palette && typeof palette === 'object' && PALETTE_KEYS.every((k) => COLOR_RE.test(palette[k])) ? palette : null;

/** The parent's custom palette (whitelabel), or null to fall back to the owner's template. */
export function applyPalette(palette) {
  if (typeof document === 'undefined') return;
  const clean = cleanPalette(palette);
  const root = document.documentElement;
  for (const k of PALETTE_KEYS) {
    if (clean) root.style.setProperty(`--p-${k}`, clean[k]);
    else root.style.removeProperty(`--p-${k}`);
  }
  customActive = Boolean(clean);
  store(PALETTE_STORAGE_KEY, clean ? JSON.stringify(clean) : null);
  applyTheme(lastTemplate);
}

/** Runs in <head> before first paint: the last known theme (and custom palette), nothing else. */
export const THEME_BOOT_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem('${THEME_STORAGE_KEY}'),p=JSON.parse(localStorage.getItem('${PALETTE_STORAGE_KEY}')||'null');if(p&&typeof p==='object')for(var k in p)if(/^[a-z0-9]{1,8}$/.test(k)&&/^#[0-9a-fA-F]{6}$/.test(p[k]))d.style.setProperty('--p-'+k,p[k]);if(t&&/^[a-z0-9_]{1,40}$/.test(t)&&t!=='${DEFAULT_THEME}')d.setAttribute('data-theme',t)}catch(e){}`;
