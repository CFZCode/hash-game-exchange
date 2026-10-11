import React from 'react';

/* A media query as React state, for the handful of places where the original branches in JS
 * rather than in CSS and the two branches produce different TEXT — which no `lg:` utility can
 * express, because both strings would have to be in the DOM.
 *
 * The original's own flag is `m.mobile` (index-BsFv7ByC.js), and it is a DEVICE test, not a
 * breakpoint:
 *
 *   if (window.screen.width < 700) return true;
 *   const [w, h] = [clientWidth, clientHeight];
 *   return (w <= 1000 && h <= 1000 && (w <= 700 || h <= 700)) || (w < screen.width / 2 && w < 700);
 *
 * A desktop window narrowed to 500px is therefore NOT mobile to the original, while a phone
 * held sideways is. This project already models that flag as the `lg` breakpoint everywhere it
 * shows up in markup (the bets table's fifth column, the tabbar, the sidebar), so JS callers
 * use the same 1024 line rather than introducing a second, different answer to "is this
 * mobile" that would disagree with the CSS on the same screen.
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    /* Re-read on mount as well: the query can already have flipped between the initial state
       and the effect running. */
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/* `lg`, i.e. Tailwind's 1024px — the line this project uses for the original's `m.mobile`. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
