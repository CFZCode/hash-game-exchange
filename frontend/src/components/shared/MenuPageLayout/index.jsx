import { NavLink } from 'react-router-dom';
import Loading from '../Loading';

/* `fO` in `index-BsFv7ByC.js` — the site's generic MENU PAGE: a heading over a left rail of links
 * and a pane beside it. Two routes in this build mount it, `/wallet` and `/settings`, and it was
 * the wallet's own file until the settings pages became its second call site — the rule `Select`,
 * `GameTile`, `PopCenter`, `useDragScroll` and `LocalAmountItem` all moved under.
 *
 * The measurements check out against the settings capture with nothing tuned, which is the first
 * independent confirmation this shell has had: at dpr 1.25 the rail box is 300 image px (240 CSS —
 * `w-60`), the gap to the pane is 20 (16 — `gap-x-4`) and rail-left to pane-right is 1518 (1214.4,
 * i.e. `.main-layout-container`'s own 1216 to within a rounding). The wallet was built from its
 * own chunk and arrived at the same three numbers.
 *
 * ONLY THE WIDE ARM IS SHARED, and that is not laziness: the two routes' narrow arms are
 * genuinely different components on the original. The wallet turns its rail into a horizontal pill
 * strip under 1100 (a plain WIDTH test, the only one in this project); `/settings` is a dialog
 * below `lg` whose rail becomes a full-page LIST — a different chunk export, `DialogPageSetting`.
 * Each call site keeps its own.
 *
 * `page-main`, `page-menu` and `page-container` are dead classes in all three stylesheet sets —
 * the mirror's six, the current deploy's, and the account remote's own — and are kept for the
 * reason `header-nav-item` and `f-ull` are. It matters for more than tidiness here: `fO` wraps
 * both the heading and the rail in a `sticky` with NO `top`, and since no rule anywhere supplies
 * one, the original pins neither. The offsets below are this build's, asked for; see the notes.
 */

/* `Qa`, the shell's sticky wrapper. Its own effect writes a `--offsetTop` custom property 500ms
   after the children change; nothing in any stylesheet reads that variable, so only the `sticky`
   is reproduced. */
export const Sticky = ({ className = '', children }) => (
  <div className={`sticky ${className}`}>{children}</div>
);

/* THE PANE'S LOADING STATE, AND IT IS `fO`'S OWN rather than a convention picked for this build.
 * The shell wraps its outlet in an ErrorBoundary over a `Suspense` whose fallback is one div:
 *
 *   C(mr, { get fallback() { var o = iO();
 *             return I(o, C(sa, {})),
 *                    fe(() => ve(o, Y("h-96 center rounded-xl bg-layer4", t.loadingClass))), o } })
 *
 * — `iO` is `$("<div>")`, `sa` is the spinner, and `loadingClass` is the per-route override the
 * prop below reproduces. So every `/wallet/*` and `/settings/*` pane has the SAME pending state on
 * the live site: a 24rem box with the pane's own layer4 fill and radius, and the spinner centred
 * in it. That is one of the few loaders in this project that is read rather than inferred.
 *
 * It replaces the WHOLE pane, which is why a pane that already draws its own `PageCard` must use
 * this instead of putting a spinner inside that card — the fill and the radius are this box's job
 * here. A loader for one region INSIDE a settled pane is a different thing and stays local; see
 * the withdraw form's token boundary and the shared Table's first-page arm. */
export const PaneLoading = ({ className = '' }) => (
  <div className={`h-96 center rounded-xl bg-layer4 ${className}`}>
    <Loading />
  </div>
);

export default function MenuPageLayout({ title, menu, children }) {
  return (
    <div className="page-main -mt-3 flex flex-wrap gap-x-4">
      {/* `w-full` inside `flex-wrap` is what puts the heading on its own row above the two
          columns — there is no explicit break.

          `-mt-3` on the root cancels `--header-mb`, the 12px `.main-layout-content` folds into its
          padding-top on every route, and this heading's own `pt-3` puts it straight back. Net zero
          spacing, and it is what lets the heading PIN at 60 — the fixed header's own height — so
          its top edge meets the header's bottom edge exactly rather than sitting 12px under it.

          IT CARRIES NO BACKGROUND, and that is a fix rather than an omission. A sticky heading
          normally needs an opaque fill so content cannot scroll through its text, and this had
          `bg-layer2` for exactly that reason — but the element is `w-full` (it has to be; that is
          what forces the line break), so the fill was an opaque band across 60..120 for the whole
          width and the pane's rows scrolled underneath it and vanished. Nothing needs covering
          here: the rail's natural top is already 120, so it is pinned from the first pixel and
          never enters that band, and in the pane the covering is each card's own sticky header's
          job. The heading's text sits left of where the pane's column even starts. */}
      <Sticky className="top-15 z-10 w-full pb-4 pt-3 text-lg font-extrabold leading-8">
        {title}
      </Sticky>

      {/* `top-30` is 120px, which is the heading's bottom edge when pinned: 60 + 12 `pt-3` + 32
          (`text-lg` at `leading-8`) + 16 `pb-4`. So the rail pins DIRECTLY BELOW the heading and
          neither moves again while the pane scrolls; a smaller offset pins it over the heading
          after a few pixels and it appears to swallow it.

          Both scroll away at the end on their own, because sticky holds only within its containing
          block and both are children of this flex row — `h-fit` and `self-start` are what stop the
          rail stretching to the pane's height, which would leave nothing to scroll against. `z-20`
          over the heading's `z-10` decides which passes in front on the way out. */}
      <Sticky className="page-menu top-30 z-20 h-fit w-60 flex-none self-start rounded-xl bg-layer4 p-2 text-secondary">
        {menu.map((row) => (
          /* `rh` is the router's own `<A>`, so `end` and `replace` are its props rather than
             ours: `end` keeps a parent path from lighting up while a child is open, and `replace`
             means moving down the rail swaps the pane instead of stacking history entries.
             `btn-like` on the inactive rows is `fO`'s own — press feedback without a button. */
          <NavLink
            key={row.key}
            to={row.href}
            end
            replace
            className={({ isActive }) =>
              `flex h-10 items-center gap-1 rounded-lg px-4 ${
                isActive ? 'font-extrabold text-primary active-tab-group' : 'btn-like'
              }`
            }
          >
            {row.title}
          </NavLink>
        ))}
      </Sticky>

      {/* `mb-4` IS THIS BUILD'S — the original butts the last pane straight against the footer. It
          pairs with `.footer-bg`'s own 1rem, likewise this build's, so the visible gap is 32px. It
          sits on the layout because every pane needs it and none carries a trailing margin of its
          own to double up with. */}
      <div className="page-container mb-4 min-h-96 w-96 flex-1 rounded-xl">{children}</div>
    </div>
  );
}
