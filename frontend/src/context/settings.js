import React from 'react';
import { createPersistedStore } from './persist';

/* The app's own settings — as opposed to the ACCOUNT's, which live in session.js.
 *
 * Two stores, two localStorage keys, and the original keeps them apart the same way: `account`
 * holds who you are, `setting` holds how the app is set up for you. `nl` in index-BsFv7ByC.js
 * declares the second one whole:
 *
 *   const [e, n] = nl({
 *     lang: "en", darken: !0, theme: "dark",
 *     firstVisit: !0, preVisitTime: 0, lite: gd()
 *   }, { name: "setting" });
 *   ...
 *   he(() => { n("darken", e.theme !== "light") })
 *
 * THE STORED FIELD IS `theme` AND `darken` IS DERIVED FROM IT — that last line is the whole
 * relationship, and it matters because everything in the app reads `darken` (`Ce.darken`,
 * `j.darken`, `W.darken` — the same store under three minified names) while only the toggle ever
 * writes `theme`. Reproduced exactly: one string is persisted, one boolean is computed, and
 * there is no way for the two to disagree.
 *
 * The other four fields are NOT stored here. `lang` has one language, `lite` has no low-end
 * device path, and `firstVisit` / `preVisitTime` have nothing reading them — persisting fields
 * that nothing consumes would put four values in a visitor's browser that this build could not
 * honour. Note the version gate means adding one later discards every saved record, which is
 * `createPersistedStore`'s documented behaviour and the right trade: a theme preference is cheap
 * to lose and a stale record is not.
 */
/* THE PRIVACY TRIO IS SERVER STATE ON THE ORIGINAL AND LOCAL STATE HERE, and that divergence is
 * the whole reason it is in THIS store rather than the account one.
 * ---------------------------------------------------------------------------------------
 * `Privacy-ydLbf0kB.js` reads them from `GET /account/setting/privacy/<uid>/` and writes them back
 * with `POST /account/setting/privacy/set/`, so on bc.game they follow the account between
 * browsers. Both paths answer 403, and the platform in `backend copy/` has no equivalent —
 * `/user/preferences` carries `{theme, language, emailNotifications, pushNotifications,
 * hideBalance}` and none of them means any of these.
 *
 * So the choice was: leave the switches inert (which is what they were, and which reads exactly
 * like a broken control), or keep them here. They are kept, and the cost is stated rather than
 * hidden — a preference set on one browser does not follow the visitor to another, because there
 * is nothing to record it. Move them to the account the day a route accepts them.
 *
 * Not in `ACCOUNT_DEFAULTS.setting`, deliberately: that object is bc.game's own store literal and
 * its shape is a documented transcription, so inventing three keys inside it would break the one
 * claim it makes about itself. This store is this build's own and has no such claim.
 *
 * `maxbetAlert` stays where it is — the fourth row of that card is `A("setting","maxbetAlert",e)`
 * on the original too, a local account setting with no request and no toast.
 */
const PRIVACY_DEFAULTS = {
  hideGameData: false,
  hideName: false,
  refuseTip: false,
};

const store = createPersistedStore('setting', { theme: 'dark', ...PRIVACY_DEFAULTS });

/* `theme !== "light"`, not `theme === "dark"`, which is the original's own test and is not the
   same thing: an unrecognised value — a hand-edited record, a field from a future version —
   reads as DARK rather than as light. Dark is this build's default in every other respect, so
   the more forgiving direction is also the correct one. */
export function isDarken(theme) {
  return theme !== 'light';
}

/* Read at module scope so `main.jsx` can settle the class before the first paint. Going through
   an effect instead would paint one frame of the default theme and then flip, which on a light
   preference is a full-screen white-to-dark-to-white flash — the same reasoning that puts
   `watchRemScale()` and the session's `restore()` ahead of `render()`. */
export function readTheme() {
  return store.read()?.theme ?? 'dark';
}

export function writeTheme(theme) {
  /* The record holds the privacy trio too, and `write` REPLACES rather than merges — so writing
     the theme alone would drop all three. Read-modify-write, which is what `nl`'s per-key setter
     does implicitly by keeping the whole store in memory. */
  store.write({ ...readPrivacy(), theme });
}

export function readPrivacy() {
  const stored = store.read();
  return {
    hideGameData: stored?.hideGameData ?? false,
    hideName: stored?.hideName ?? false,
    refuseTip: stored?.refuseTip ?? false,
  };
}

export function writePrivacy(next) {
  store.write({ ...readPrivacy(), ...next, theme: readTheme() });
}

/* `QS()` in index-BsFv7ByC.js, ported:
 *
 *   Zi().classList.toggle("dark", Ce.darken);
 *   const t = document.querySelector('meta[name="theme-color"]');
 *   t && t.setAttribute("content", Ce.darken ? "#232626" : "#f4f4f4")
 *
 * where `Zi()` is `document.querySelector(".app-root") || document.body` — which in this build
 * is `<body>`, since that is where the `app-root dark` pair is declared in index.html.
 *
 * THE `body.dark` CLASS DOES THREE JOBS AND ONLY ONE OF THEM IS THE PALETTE. It also drives the
 * `@custom-variant dark` in index.css (so every `dark:` utility keys off it) and the pre-boot
 * loader's own rules in index.html, which swap `init-dark.png` for `init-light.png` and paint
 * the body before any stylesheet has arrived. All three follow from this one line.
 *
 * The two theme-colour literals are `--site_bg`'s values in each theme and are the original's
 * own; they are also written into index.html's pre-boot block, which cannot refer to a token. */
export function applyTheme(theme) {
  const darken = isDarken(theme);
  const root = document.querySelector('.app-root') || document.body;

  root.classList.toggle('dark', darken);

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', darken ? '#232626' : '#f4f4f4');
}

export const SettingsContext = React.createContext(null);

/* Split from SettingsContext.jsx for `react-refresh/only-export-components`, the same reason
   `useSession` is not in SessionContext.jsx. */
export function useSettings() {
  const value = React.useContext(SettingsContext);

  if (!value) throw new Error('useSettings must be used inside a <SettingsProvider>');

  return value;
}
