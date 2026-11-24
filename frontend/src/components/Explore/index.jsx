import React from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import Select from '../shared/Select';
import CasinoExplore from './CasinoExplore';
import SearchHistory from './SearchHistory';
import SearchOverlay from './SearchOverlay';
import { readHistory, remember } from './history';
import { Empty } from './GameGrid';
import { SearchIcon, CloseIcon, ArrowIcon } from './icons';
import { useGates } from '../../context/gates';
import './Explore.css';

/* Explore — what the header's search button opens.
 *
 * Three pieces of the mirror, stitched together the way the original stitches them:
 *
 *   Header-CTF5n6al.js   `ae` is the search button (`onClick: () => t.setExplore(!0)`) and
 *                        `ve` is the overlay: a portal with `className = "explore-pop"`,
 *                        wrapped in a fadeUp2 transition, holding a sticky "Explore" bar and
 *                        the panel below it.
 *   Enter-MsmOuq5R.js    toggles `explore-open` / `explore-close` on <body>, which is what
 *                        gives `.explore-pop` its size (see Explore.css).
 *   index-BChnjnW3.js    `ur`, the panel itself — search box, type dropdown, results.
 *
 * Desktop only, and that is the original's own shape rather than a simplification: below 640
 * Explore is the `/explore` route instead, guarded to mobile (`guards: [() => !m.mobile &&
 * "/"]`) and reached from the tabbar. Nothing here is wired to the tabbar yet.
 *
 * What is NOT built: the Sports and Lottery panels. `he` searches the sportsbook's fixtures
 * and `ze` the lottery draws, and the mirror captured neither feed — three Highlights matches
 * and twenty upcoming draws is not a searchable corpus. Sports stays in the dropdown, because
 * it is on the original, and renders the site's own empty state. LOTTERY IS REMOVED, a
 * deliberate departure on the user's request (this platform has no lottery): the original's
 * third option is gone, and `/explore?type=lottery` falls to Casino like any unknown type.
 */

/* `g()` in `ur`. Sports is present only when `config.betby_brand_id` is set — it defaults to
   "" in the bundle, but the mirror's captured /sport/provider/support/ response carries a
   `betByBrand.brandFlag`, so the live session this was taken from had all three. */
const TYPES = [
  { label: 'Casino', value: 'casino' },
  { label: 'Sports', value: 'sports' },
];

/* The search box, the type dropdown and whatever the type selects — `ur`.
 *
 * EXPORTED, because `ur` IS the whole of the `/explore` route: `Ag` in Enter-MsmOuq5R.js
 * resolves that path to this very chunk and the chunk's default export is `ur` itself, with no
 * page wrapper of any kind. Its root template is
 *
 *   <div class="explore-content w-full sm:pb-4"><div class="relative flex w-full items-center gap-2">
 *
 * i.e. exactly what renders below, so the mobile page is this component dropped into
 * `#page-content` and nothing else. The desktop overlay is the thing that adds a wrapper, not
 * the page. See `src/pages/Explore`.
 *
 * BOTH PROPS ARE THE ROUTE'S QUERY STRING, and they are the original's own — `ur` opens with
 * `const [t] = Te()`, a search-params accessor, and reads exactly two keys off it:
 *
 *   n = t.type || "casino"          which of the three the dropdown starts on
 *   autofocus: t.autofocus === "1"  whether the field takes focus on arrival
 *
 * so `/explore?type=lottery` and `/explore?autofocus=1` are real behaviour rather than
 * additions. The overlay passes neither and gets the same defaults the string would.
 */
export function ExplorePanel({ initialType, autoFocus = false }) {
  /* `g().find(x => x.value === n) || g()[0]` — an unknown or absent `type` falls back to
     Casino rather than rendering nothing, which is what `|| "casino"` above it already
     guarantees for the common case. Lazy initialiser: the query string is read once on
     arrival, and changing the dropdown afterwards must not be undone by a re-render. */
  const [picked, setType] = React.useState(
    () => TYPES.find((option) => option.value === initialType) ?? TYPES[0],
  );
  /* Casino / Sports switched off by the owner or Super Admin: not offered. Derived during render
     because the gates may answer after the first one. */
  const gates = useGates();
  const types = TYPES.filter((option) => gates.on(option.value));
  const type = types.includes(picked) ? picked : (types[0] ?? { value: '' });
  const [query, setQuery] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [history, setHistory] = React.useState(() => readHistory());
  const rowRef = React.useRef(null);
  const inputRef = React.useRef(null);

  /* `pe(() => { s() && m({type: "input", value: ""}) })` — switching Casino/Sports/Lottery
     clears the query, because the three search different things. Done on the change itself
     rather than in an effect watching `type`: the original's is a reactive statement, but in
     React that shape is a cascading render, and the only way `type` ever moves is this. */
  const changeType = (option) => {
    setType(option);
    setQuery('');
  };

  /* `Re(k => Be(() => k, () => l(!1)), w)` — a click-outside on the whole row, not just the
     box, so the Cancel button and the history panel count as inside. */
  React.useEffect(() => {
    if (!focused) return undefined;
    const onPointerDown = (event) => {
      if (!rowRef.current?.contains(event.target)) setFocused(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [focused]);

  /* The live panel debounces a second and POSTs; `se(l)` writes the keyword to history only
     once the request goes out. Here the search itself is synchronous, so the debounce exists
     purely to keep history from filling up with every prefix the user typed through. */
  React.useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return undefined;
    const timer = setTimeout(() => setHistory(remember(value)), 1000);
    return () => clearTimeout(timer);
  }, [query]);

  const pickSuggestion = (value) => {
    setQuery(value);
    inputRef.current?.focus();
  };

  return (
    <div className="explore-content w-full sm:pb-4">
      <div ref={rowRef} className="relative flex w-full items-center gap-2">
        {/* `.input` is layered, so `bg-layer4` and `px-2` here beat its own fill and padding
            — the same arrangement the auth dialog's fields rely on. */}
        {/* NO HEIGHT CLASS, WHICH IS THE CHUNK'S OWN — `Ae` is handed exactly
            `class: "flex-1 bg-layer4 px-2 py-1.5 font-semibold"`, so the box comes from
            `.input` and nothing else. This carried `!h-10`, which pinned it to 40px at every
            width and was invisible while Explore was desktop-only: `.input` is 3rem base with
            a `min-width: 1024px` arm dropping it to 2.5rem, so on the overlay the override and
            the rule agreed. The moment the same panel became the `/explore` PAGE it stopped
            agreeing — the mobile search bar rendered 40px where the original gives it 48.

            It also explains the type dropdown beside it, which is `h-11` (44px) with `-my-1.5`
            cancelling 12px of flow: 44 centres inside 48 with 2px to spare, and overhung a
            40px row by 4px at each end. Both are right once the height comes from `.input`. */}
        <div
          className="input flex-1 bg-layer4 px-2 py-1.5 font-semibold"
          {...(focused ? { 'data-focus': '' } : {})}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Search games"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            /* `autofocus: t.autofocus === "1"` — the chunk's own, and opt-in through the query
               string rather than on by default, which is the distinction the usual a11y
               objection to autofocus turns on. No eslint-disable: `jsx-a11y` is not in this
               project's flat config, so naming one of its rules is itself an error. */
            autoFocus={autoFocus}
          />

          {/* Both of the next two are `order-first`, so they precede the input; between
              themselves they keep DOM order, which puts the type dropdown ahead of the
              glyph. That is the original's arrangement, and the divider you see between
              them is the label's own `border-r`. The wrapper swallows the click so opening
              the dropdown does not also focus the field. */}
          <div className="order-first" onClick={(event) => event.preventDefault()}>
            <Select
              /* `size: "s"`, `class: "-my-1.5 -ml-2 h-11 border-none bg-transparent px-0"` —
                 the chunk's own pair. `h-11` over `.button-s`'s 2rem is why the size family has
                 to stay layered, and the negative block margin cancels exactly the amount the
                 44px trigger overhangs the `.input` row it sits in. This read `-my-1 … h-10`,
                 which nets the same 32px of flow height but leaves the trigger 4px shorter than
                 the row's other controls. */
              size="s"
              className="-my-1.5 -ml-2 h-11 border-none bg-transparent px-0"
              value={type}
              options={types}
              onChange={changeType}
              labelRender={(option) => (
                <div className="flex h-8 items-center border-r border-solid border-third px-2">
                  <span className="mr-1 font-extrabold">{option.label}</span>
                  {/* NO fill utility, deliberately. The chunk renders this as
                      `e(Me, { class: "size-4 -rotate-90" })` — the site's Icon component, which
                      contributes `.icon` and nothing else, and `.icon` is `fill: currentColor`.
                      So the chevron takes the label's own colour and is white beside white text.
                      It was `fill-secondary` here, which greyed it against the label.

                      `.icon` also sets `width/height: 2rem`, which is why it is layered in
                      index.css: `size-4` is a utility and wins. */}
                  <ArrowIcon className="icon size-4 -rotate-90" />
                </div>
              )}
            >
              {(option) => <span className="font-extrabold">{option.label}</span>}
            </Select>
          </div>

          <SearchIcon className="order-first size-6 fill-secondary" />

          {query && (
            <button
              type="button"
              className="button mr-1 flex size-6 items-center justify-center rounded-md bg-layer6 p-0"
              onClick={(event) => {
                event.preventDefault();
                setQuery('');
              }}
            >
              <CloseIcon className="size-4 fill-secondary" />
            </button>
          )}
        </div>

        {/* `ce.mobile ? history.back() : l(!1)` — on desktop Cancel only drops focus; it
            does not clear the query or close the panel. */}
        {focused && (
          <button type="button" className="button text-secondary" onClick={() => setFocused(false)}>
            Cancel
          </button>
        )}

        {type.value === 'casino' && focused && query.trim().length < 2 && (
          <SearchHistory history={history} setHistory={setHistory} onPick={pickSuggestion} />
        )}
      </div>

      {type.value === 'casino' && <CasinoExplore query={query} />}
      {type.value === 'sports' && (
        <Empty className="mt-4">Sports search is not wired up in this build.</Empty>
      )}
    </div>
  );
}

export default function Explore({ open, onClose }) {
  /* Mounted while open OR while the exit tween is still running, so the panel fades out
     instead of vanishing. `.explore-pop` collapses to 0x0 the instant `explore-open` leaves
     <body>, so the body class has to outlive the unmount by exactly that animation.
     `exiting` is adjusted during render by comparing `open` against its previous value held
     in state — React's own "adjusting state when a prop changes" pattern. Not an effect,
     because an effect here is a cascading render; not a ref, because a ref read during
     render is not allowed to drive output. */
  const [exiting, setExiting] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);

  if (wasOpen !== open) {
    setWasOpen(open);
    setExiting(wasOpen && !open);
  }

  const present = open || exiting;
  const { pathname } = useLocation();

  React.useEffect(() => {
    /* `f("explore-open", "explore-close", i)` in Enter-MsmOuq5R.js. Both classes, because
       the original toggles the pair and other rules key off the closed one. */
    const list = document.body.classList;
    list.toggle('explore-open', present);
    list.toggle('explore-close', !present);
    return () => {
      list.remove('explore-open');
      list.add('explore-close');
    };
  }, [present]);

  /* `F(Y([() => n.pathname], () => { s > 0 && t.setExplore(!1); s++ }))` — the panel closes
     on navigation, but not on the first run, so opening it does not immediately shut it. */
  const firstRoute = React.useRef(true);
  React.useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    onClose();
  }, [pathname, onClose]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      /* A Select's own Escape handler also lives on `document`, and stopPropagation between
         two listeners on the same node does not stop the other — so the innermost thing open
         is checked for here instead. One Escape closes one layer. */
      if (document.querySelector('.dropdown-layer')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!present) return null;

  return createPortal(
    <div className="explore-pop">
      <div
        className={`search-backdrop h-full w-full ${open ? 'explore-enter' : 'explore-exit'}`}
        /* The dim + blur is `.search-backdrop` (Explore.css): the theme's own tint, both themes. */
        onAnimationEnd={() => {
          if (!open) setExiting(false);
        }}
      >
        {/* The site's own search (./SearchOverlay.jsx) over the blurred page; a click on the
            blurred part closes it. `ExplorePanel` above is still what `/explore` renders. */}
        <div
          className="hidden-scroll-bar scroll-y h-full w-full"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <SearchOverlay onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
