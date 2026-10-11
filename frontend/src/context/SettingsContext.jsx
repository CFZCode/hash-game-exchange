import React from 'react';
import {
  SettingsContext,
  applyTheme,
  isDarken,
  readPrivacy,
  readTheme,
  writePrivacy,
  writeTheme,
} from './settings';

/* The provider for the app's `setting` store — see settings.js for the store itself, where every
 * value came from and why `darken` is derived rather than stored.
 *
 * Deliberately thin. The class on `<body>` is what the CSS reads, and that is already correct
 * before React runs (main.jsx calls `applyTheme(readTheme())` ahead of `render()`), so this
 * exists to let the toggle CHANGE the theme and to let anything that needs to branch in JS —
 * which sprite a coloured icon picks, which of a pair of images a banner loads — read the
 * current one without touching the DOM.
 */
export function SettingsProvider({ children }) {
  /* Initialiser form: `readTheme()` hits localStorage and must not run on every render. It has
     already run once in main.jsx, and both calls returning the same value is the point — the
     class is applied before the first paint and this state simply agrees with it. */
  const [theme, setTheme] = React.useState(readTheme);

  /* The privacy trio, same initialiser form and the same reason. It lives beside the theme
     because it shares the record — see the note in settings.js for why these three are local at
     all, which is a divergence rather than a design. */
  const [privacy, setPrivacyState] = React.useState(readPrivacy);

  const value = React.useMemo(
    () => ({
      theme,
      /* The boolean everything actually branches on, named as the original names it. */
      darken: isDarken(theme),
      /* Persisting and applying happen HERE rather than in an effect, and that is not a
         shortcut. An effect would leave one committed frame in which React's state says light
         and `<body>` still says dark — every `dark:` utility and every token would resolve to
         the old theme for that frame, which on a full-page palette swap is visible. Both writes
         are idempotent and neither reads React state, so doing them in the handler is safe;
         `setTheme` still drives the re-render for anything reading this context. */
      privacy,

      /* Takes a PATCH rather than the whole object, so a row writes only its own key — the store
         merges, and a caller that had to send all three could drop one by forgetting it. */
      setPrivacy: (patch) => {
        writePrivacy(patch);
        setPrivacyState((current) => ({ ...current, ...patch }));
      },

      setTheme: (next) => {
        writeTheme(next);
        applyTheme(next);
        setTheme(next);
      },
    }),
    [theme, privacy],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
