import React from 'react';
import GameSection from '../GameSection';
import { useSession } from '../../../context/session';
import { useResource } from '../../../hooks/useResource';
import { getRecentAndFavorites } from '../../../services/collection';
import { createPersistedStore } from '../../../context/persist';

/* The signed-in home page's Continue Playing / Favorites block.
 *
 * `wu` -> `vu` -> `bu` in `bc.game/bc.game/assets/Enter-MsmOuq5R.js`, with the gate in `yn` and
 * the read in `_u` (ported into `services/collection.js` as `getRecentAndFavorites`).
 *
 * -- IT IS ONE SECTION WITH TABS, NOT TWO SECTIONS -------------------------------------------
 *
 * The obvious reading of "a Favorites section appears on the home page" is a second `GameSection`
 * beside BC Originals. That is not what the original does, and building it that way would have
 * been wrong in a way no screenshot of a one-tab account would ever reveal:
 *
 *   function bu(e) { const [n, t] = S(0), o = N(() => e.tabs[n()]);
 *     return r(hu, { section_id: "page_recent_favorite_recommend",
 *       title: <div class="flex items-center">{e.tabs.map((s, l) => <Au ... />)}</div>,
 *       link: o().path, data: ... o().list }) }
 *
 * ONE header, whose title is a row of tab buttons, over ONE strip that swaps. An account with
 * both a play history and a favourite gets a single block it can flip between -- and the All
 * button follows the active tab, to `/recent` or to `/favorite`. Two stacked sections would put
 * two headers and two strips on the page and double its height for that account.
 *
 * -- WHY THE SECTION APPEARS THE MOMENT YOU STAR SOMETHING ------------------------------------
 *
 * `yn` is the whole mechanism, and it is a three-state gate rather than a truthiness check:
 *
 *   function yn(e, n, t, o) {                    // (read, wasShown, setShown, tag)
 *     return () => { const i = e();
 *       if (i !== void 0) { const s = i.length > 0; return t(s),
 *         s ? i.map(l => ({ ...l, autoTag: o })) : void 0 }   // EMPTY becomes undefined
 *       return n() ? [] : void 0 } }                          // pending: [] if shown before
 *
 * and `vu` then filters on `data !== void 0`. So:
 *
 *   list has rows   -> the tab renders
 *   list is EMPTY   -> `undefined` -> `.filter` drops the tab entirely
 *   list is PENDING -> `[]` if this visitor has seen the tab before, else `undefined`
 *
 * The middle line is the answer to "when a game is marked favourite a new section is added":
 * NOTHING WATCHES THE STAR. The block is rendered from the read on every home visit, and an
 * empty favourites list is indistinguishable from no favourites feature at all. Star one game
 * and the next read returns a row, so the tab exists. Un-star your last one and it is gone
 * again. There is no separate "has favourites" flag anywhere, and adding one would be this
 * build's invention.
 *
 * The third line is worth keeping too, and it is the reason for the persisted flags below
 * rather than a plain `useState`. `[]` is GameSection's own loading state -- eight skeleton
 * tiles -- so a returning visitor who had favourites last time gets a placeholder strip of the
 * right height while the read is in flight, and the page does not jump when it lands. A visitor
 * who has never had one gets nothing at all, rather than a skeleton that resolves to absent.
 * That is the same distinction `docs/data-layer.md` draws about a declared `initialValue`: the
 * remembered shape is not a spinner, it is what the original renders while it waits.
 *
 * -- PADDING IS `de`'s, NOT `hu`'s, AND THAT IS DELIBERATE ------------------------------------
 *
 * The original wraps this block in `qd` = `<div class="px-4 sm:px-0">` because `hu` is a second,
 * thinner section component -- a bare `<div class="mb-4">` around `ot` + `go` -- whose header
 * does not carry that inset itself. This build has one section component, `GameSection` (the
 * port of `de`), which already puts `px-4 sm:px-0` on its own header and leaves the strip
 * full-bleed to `--grid-padding`. Wrapping it again would double the inset below `sm` and pull
 * the strip off the scroll edge every other home row sits on. So the wrapper is dropped and the
 * component that owns the measurement keeps owning it.
 */

/* `re(S(!1), { name: "continue_playing_show" })` and `{ name: "favorite_show" }` -- the original
   persists one boolean per tab, under those exact keys, through the same helper the account and
   theme stores use. Kept as two stores rather than one object because that is two localStorage
   entries on the live site, and a single record here would be a third shape to reason about in
   devtools for no gain. */
const SHOWN = {
  history: createPersistedStore('continue_playing_show', { shown: false }),
  favorite: createPersistedStore('favorite_show', { shown: false }),
};

const wasShown = (key) => SHOWN[key].read()?.shown === true;
const setShown = (key, value) => {
  if (wasShown(key) !== value) SHOWN[key].write({ shown: value });
};

/* `yn`, as a plain function of the read rather than a signal factory -- the persisted write is a
   side effect the original performs inside the accessor, and it is done here at the same point
   for the same reason: the flag has to record what THIS read found, not what the previous render
   believed. It is idempotent and guarded above, so running it during render is safe. */
function gate(list, key) {
  if (list !== undefined) {
    const has = list.length > 0;
    setShown(key, has);
    /* `i.map(l => z(R({}, l), { autoTag: o }))` — the stamp, and it is not bookkeeping: it is
       what puts the corner badge on the card. `GameTile` renders the star for `favorite` and
       the clock for `history` off this field alone, so a row that reaches the strip without it
       draws a bare cover. Dropping it was the first version's bug: the gate was ported and the
       map beside it was not. */
    return has ? list.map((row) => ({ ...row, autoTag: key })) : undefined;
  }
  return wasShown(key) ? [] : undefined;
}

/* `Au` -- the tab button. `flex-1` is why two tabs split the header's width evenly and a single
   tab fills it; the active arm is a brand underline and an extrabold label, the same pair the
   wallet's and casino's tab strips use. The class list is the original's verbatim, `center`
   included -- it arrives as a utility here rather than as a `display` rule in a stylesheet, so
   it is not the cascade hazard CLAUDE.md warns about. */
function Tab({ title, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`center h-auto flex-1 whitespace-nowrap rounded-none border-b-2 px-2 py-1 text-sm ${
        active
          ? 'border-b-brand font-extrabold text-primary'
          : 'border-b-transparent font-semibold text-secondary'
      }`}
    >
      {title}
    </button>
  );
}

export default function RecentFavorites() {
  const { session } = useSession();
  const login = Boolean(session?.login);

  /* `wu` guards on `b.login` OUTSIDE the read, so a logged-out visitor never asks. Reproduced by
     passing a reader that resolves to the empty pair -- `useResource` needs a stable function
     and a hook cannot be skipped, so the gate goes in the reader rather than around the hook. */
  const read = React.useCallback(
    () => (login ? getRecentAndFavorites() : Promise.resolve([undefined, undefined])),
    [login],
  );
  const { data } = useResource(read);

  const [active, setActive] = React.useState(0);

  /* `_()` -- the tuple in `_u`'s own order, gated, then dropped where the gate says absent.
     Derived during render rather than held in state: a `useState` seeded from a read freezes at
     the empty first paint, which is the trap named in CLAUDE.md's data-layer rules. */
  const tabs = [
    { key: 'history', title: 'Continue Playing', path: '/recent', list: gate(data?.[0], 'history') },
    { key: 'favorite', title: 'Favorites', path: '/favorite', list: gate(data?.[1], 'favorite') },
  ].filter((tab) => tab.list !== undefined);

  if (!login || tabs.length === 0) return null;

  /* THE ACTIVE INDEX IS CLAMPED rather than stored against the tab's identity. `bu` keeps a bare
     `S(0)` and has the same hazard: un-starring your last favourite while that tab is open
     removes it from the array, and an index of 1 would then read `undefined`. The original is a
     signal graph that re-runs and lands on a tab that exists; this is that outcome stated
     directly, and it leaves the common case -- one tab, index 0 -- identical. */
  const current = tabs[Math.min(active, tabs.length - 1)];

  return (
    <GameSection
      title={
        <div className="flex items-center">
          {tabs.map((tab, i) => (
            <Tab
              key={tab.key}
              title={tab.title}
              active={tab === current}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      }
      games={current.list}
      href={current.path}
    />
  );
}
