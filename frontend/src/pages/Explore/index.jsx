import { Navigate, useSearchParams } from 'react-router-dom';
import SearchOverlay from '../../components/Explore/SearchOverlay';
import { useIsDesktop } from '../../hooks/useMediaQuery';

/* `/explore` — Explore as a PAGE, which is what it is on a phone.
 *
 * The same feature exists twice on the original and this is the half that was missing. Above
 * the line the header's search button opens a portalled overlay (`components/Explore`, the
 * `.explore-pop` container); below it there is no overlay at all and `/explore` is a real
 * route reached from the tabbar. Both render the identical component: `Ag` in
 * Enter-MsmOuq5R.js resolves this path to `index-BChnjnW3.js`, whose default export is `ur` —
 * the panel — so the page is that panel dropped straight into `#page-content`. There is no
 * heading, no card and no wrapper of its own; the layout's gutter is the whole of its box.
 *
 * THE ROUTE IS GUARDED, and reproducing the guard is not optional decoration — it is the only
 * thing stopping the same feature being reachable two ways at once on one screen. The
 * original's is
 *
 *   { path: "/explore", component: Ag, info: { guards: [() => !m.mobile && "/"] } }
 *
 * — a guard returning a path is a redirect in that router, so a non-mobile visitor who lands
 * here is sent to `/`. `m.mobile` is a DEVICE test and this build reads it as the 1024 line,
 * the convention `useMediaQuery` documents and every other JS caller here follows. 1024 is
 * also where the two entry points hand over: the tabbar that links here is `lg:hidden` and the
 * search button that opens the overlay is `hidden lg:flex`, so the redirect fires exactly when
 * the overlay becomes available and never leaves a width with neither.
 *
 * `replace`, so a desktop visitor bounced to Home does not have `/explore` sitting one Back
 * press away — the original's guard replaces too, since it resolves before the entry is
 * committed. Widening the window while the page is open redirects live, because `useIsDesktop`
 * is a matchMedia subscription rather than a mount-time read.
 */
export default function ExplorePage() {
  const isDesktop = useIsDesktop();
  const [params] = useSearchParams();

  if (isDesktop) return <Navigate to="/" replace />;

  /* THE GUTTER IS THE PAGE'S JOB HERE, WHICH IS THIS BUILD'S ARRANGEMENT RATHER THAN THE
   * ORIGINAL'S — and the panel supplying none is why it rendered flush to all four edges.
   *
   * On the original the box comes entirely from the wrapper this route lands in:
   *
   *   #page-content                  { padding: … px-4 at every width }
   *   #page-content > :first-child   { margin-top: 1rem }
   *   #page-content > :last-child    { margin-bottom: 1rem }
   *
   * so `ur` can be the bare `explore-content w-full sm:pb-4` it is and still sit 16px off
   * every side. This build's `.main-layout-content` does NOT pad that way: `padding-inline` is
   * 0 below 640 because the home page's sections each carry their own `px-4` (and the hero's
   * mobile arm actively cancels one), and `--header-mb` — the only vertical space between the
   * header and the first panel — is `0px` below `lg`. Both are deliberate there and neither can
   * be widened globally without double-padding every section that already compensates.
   *
   * So the page carries it, which is the convention the other page roots here already follow
   * (`px-4 sm:px-0` is what VIP's root writes, and what its banner's `-ml-4
   * w-[calc(100%+32px)]` exists to cancel).
   *
   *   px-4 sm:px-0   16px below 640, then nothing — from 640 up the layout's own
   *                  `--content-gap-x` supplies exactly the same 16px, so keeping it here
   *                  would make it 32.
   *   mt-4           the `> :first-child` rule above. Unconditional rather than `max-lg:`,
   *                  because the guard means this page never renders at a width where
   *                  `--header-mb` is non-zero — there is nothing above `lg` to double up with.
   *
   * The bottom is already there and is NOT added again: `--content-gap-y` is 2rem on
   * `.main-layout-content`'s padding-bottom, which is the original's own 1rem `> :last-child`
   * margin plus 1rem of this build's, over the 4.5rem the tabbar occupies. A `pb-4` here would
   * stack a third rem on top of that. */
  return (
    <div className="px-4 pt-4 sm:px-0">
      {/* `t.type` and `t.autofocus` — `ur`'s own two query keys. `type` seeds the dropdown, so
          `/explore?type=sports` opens on Sports; `autofocus=1` puts the caret in the field on
          arrival, which is how a link that means "search now" differs from one that means "show
          me Explore". Neither is passed by the overlay, which is why both default. */}
      {/* The site's own search (the same component the desktop overlay draws), laid out for a
          phone by its `page` arm. It replaces the original's `ur` panel here at the owner's
          request, so search is one design at every width; `type` now picks the tab it opens on. */}
      <SearchOverlay
        page
        initialTab={['casino', 'sports'].includes(params.get('type')) ? params.get('type') : 'all'}
        autoFocus={params.get('autofocus') === '1'}
      />
    </div>
  );
}
