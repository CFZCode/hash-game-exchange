/* The owner's template as a colour theme on this UI (src/theme/palettes.css).
 *
 * `GET /admin/features/public` (read by services/gates.js) carries `{feature: 'theme', variant}`.
 * The key goes on <html data-theme>; `hash_game` (the default, bc.game's own colours) and any key
 * palettes.css does not know change nothing. The last key is kept in localStorage so the next load
 * paints it before the read answers (THEME_BOOT_SCRIPT, inlined in app/layout's <head>).
 * With fixtures on nothing is read or applied: the fixture build is the pixel reference. */

export const THEME_STORAGE_KEY = 'hge.theme';
export const DEFAULT_THEME = 'hash_game';
const KEY_RE = /^[a-z0-9_]{1,40}$/;

/** The theme key in a features/public list, or null when the list names none. */
export function themeOf(features) {
  if (!Array.isArray(features)) return null;
  const row = features.find((f) => f && f.feature === 'theme');
  return row && typeof row.variant === 'string' && KEY_RE.test(row.variant) ? row.variant : null;
}

export function applyTheme(key) {
  if (typeof document === 'undefined') return;
  const theme = key && KEY_RE.test(key) ? key : DEFAULT_THEME;
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode: the next load just paints the default first */
  }
}

/** Runs in <head> before first paint: the last known theme, nothing else. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t&&/^[a-z0-9_]{1,40}$/.test(t)&&t!=='${DEFAULT_THEME}')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
