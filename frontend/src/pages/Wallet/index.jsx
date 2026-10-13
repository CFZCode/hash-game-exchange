import { NavLink, Outlet } from 'react-router-dom';
import useMediaQuery from '../../hooks/useMediaQuery';
import MenuPageLayout, { Sticky } from '../../components/shared/MenuPageLayout';
import { WALLET_MENU } from './menu';
import { useGates } from '../../context/gates';
import './Wallet.css';

/* `/wallet` — `WalletLayout`, `index-nvcIJcIg.js`, recovered from `hash.game/assets/`. Neither it
 * nor the Balance page's chunk (`index-gRxyMfB6.js`) is in the mirror, so both came off the second
 * origin; see the mirror note near the top of CLAUDE.md.
 *
 * The chunk itself is thin — it is the rail table (see menu.js) wrapped in `fO`, the main bundle's
 * MenuPageLayout, which IS in the mirror. That shell is transcribed below rather than pulled into
 * `components/shared`, because this is its first call site in this project; the original uses it
 * for several pages, so lift it out when a second one lands.
 *
 * TWO DIFFERENT TESTS DECIDE THE LAYOUT, and conflating them gets it wrong:
 *
 *  - `Show when={!ee.mobile}` in the WALLET chunk, a DEVICE test. On a phone the rail is not
 *    rendered at all and the pane stands alone.
 *  - `Show when={ee.clientWidth < 1100}` inside `fO`, a plain WIDTH test — the only 1100 in this
 *    project. Above it the rail is a 240px column beside the pane; below it the same rows become
 *    a horizontally scrolling strip above the pane.
 *
 * A desktop window narrowed to 900px is therefore not-mobile AND under 1100: it gets the strip.
 * Only the width test can be expressed here, and it is the one that changes the layout, so it is
 * what this file branches on. The device arm is documented and not built, exactly as elsewhere.
 *
 * `page-main`, `page-container` and `page-menu` ARE DEAD CLASSES — none of the six stylesheets in
 * the mirror declares any of them, and they are not in the current deploy's either. Kept verbatim
 * for the reason `header-nav-item` and `not-full` are kept. Note `w-96 min-h-96` on the pane is
 * live and is what stops a one-line empty pane collapsing.
 *
 * `h-18` is NOT the `w-30` trap: `.h-18 { height: 4.5rem }` really is in index-DxOqNczA.css, and
 * Tailwind v4 generates the same 4.5rem, so it renders identically here.
 */

/* `Qa`, the shell's sticky wrapper, and `fO`, the menu page it belongs to, BOTH MOVED to
   `components/shared/MenuPageLayout` when `/settings` became their second call site — the rule
   every other shared component here moved under. Only the WIDE arm is shared: the narrow arm
   below is this route's own (a horizontal pill strip under 1100), where the settings pages'
   narrow arm is a dialog holding a different chunk export entirely. `Sticky` is re-imported
   because this arm still uses it. */

/* `O` in the wallet chunk — one rail row's contents. The `gap-1` between them belongs to the
   anchor, not here. */
function RailLabel({ icon: Icon, title }) {
  return (
    <>
      {/* `icon` IS LOAD-BEARING HERE and its absence is why these rendered solid black. The
          chunk writes `C(t.icon, {class: "size-5 flex-none"})` with no fill of any kind, and
          gets away with it because the icon wrapper (`d` in Wrap-DblNcHvH.js) prepends `icon`
          to whatever class it is handed — and `.icon` is `fill: currentColor`. So the colour
          comes from the TEXT colour of the row: `text-secondary` on the rail, `text-primary`
          on the active one, and the fill follows both for free. Written out at the call site,
          because this project's icon components are the bare `<svg>` without that wrapper.
          Same trap the icons module warns about: no fill set anywhere means black. */}
      <Icon className="icon size-5 flex-none" />
      <span className="truncate">{title}</span>
    </>
  );
}

/* `rh` is the router's own `<A>`, so `activeClass` / `inactiveClass` / `end` / `replace` are its
 * props rather than this page's. `end` matters: without it `/wallet/balance` would keep `/wallet`
 * lit too if that were ever a row. `replace` keeps the rail out of the back stack, so Back from
 * the wallet returns to the page you came from rather than walking the rail.
 *
 * `btn-like` is the inactive arm and is live — `user-select: none; touch-action: manipulation` in
 * index-DxOqNczA.css. `active-tab-group` is already in this project's index.css from the Help
 * Center rail, over the same `--Chip-Group-Tab` value.
 */
function RailLink({ row, className, activeClassName }) {
  return (
    <NavLink
      to={row.href}
      end
      replace
      className={({ isActive }) =>
        `${className} ${isActive ? activeClassName : 'btn-like'}`
      }
    >
      <RailLabel icon={row.icon} title={row.title} />
    </NavLink>
  );
}

export default function WalletLayout() {
  /* `ee.clientWidth < 1100`. Written as the query's complement so the desktop arm is the
     positive case, matching the chunk's `fallback`. */
  const wide = useMediaQuery('(min-width: 1100px)');

  /* `t("wallet").toUpperCase()` — the chunk uppercases at the call site rather than shipping an
     uppercase string or a `uppercase` utility, so the heading is a real uppercase "WALLET" in the
     DOM. Reproduced the same way. */
  const title = 'wallet'.toUpperCase();

  /* The rail filtered by what this site and account have on (services/gates.js) — the same
     `.filter` the original runs over its deploy profile. An agent's player keeps Balance and the
     three history rows. Everything is on with fixtures. */
  const { routeOn } = useGates();
  const rows = WALLET_MENU.filter((row) => routeOn(row.href));

  if (!wide) {
    return (
      /* `-mt-6` on the outer box and `pt-6` back on the heading: the shell pulls itself up under
         the header and the sticky strip re-adds the space, so the strip's background covers the
         gap when it pins. Same trick the Help Center heading documents. */
      /* `px-4 sm:px-0` — below sm `.main-layout-content` zeroes its gutter and every section
         supplies its own (MainLayout.css); without it the wallet ran edge to edge at 390. */
      <div className="-mt-6 px-4 sm:px-0">
        <Sticky className="z-40 bg-layer2">
          {/* `Show when={title && !mobile}` — the heading is dropped on a phone, where the
              dialog chrome carries it instead. That arm is the device test this file cannot
              make, so the heading always renders. */}
          <div className="flex h-14 w-full items-center pt-6 text-lg font-extrabold">{title}</div>
          <div className="h-18 overflow-hidden bg-layer2 py-4">
            {/* `pan="x"` is the original's touch-scroll wrapper; `hide-scroll` is already in
                index.css. `light-layer2-tabs` is a light-theme-only rule and is inert here. */}
            <div className="page-menu light-layer2-tabs hide-scroll flex size-full flex-none flex-nowrap whitespace-nowrap rounded-xl bg-layer4 p-1">
              {rows.map((row) => (
                <RailLink
                  key={row.key}
                  row={row}
                  className="inline-flex h-full items-center gap-1 rounded-lg px-4"
                  activeClassName="active-tab-group"
                />
              ))}
            </div>
          </div>
        </Sticky>
        {/* `mb-4` IS THIS BUILD'S — the original butts the last pane straight against the
            footer. It pairs with `.footer-bg`'s own 1rem, which is also this build's, so the
            visible gap is 32px rather than 16. It goes on the LAYOUT rather than on a pane
            because every one of the nine needs it and none carries a trailing margin of its own
            to double up with. It was 24px for one revision and read too loose. */}
        <div className="mb-4">
          <Outlet />
        </div>
      </div>
    );
  }

  /* THE WIDE ARM IS `components/shared/MenuPageLayout` NOW, markup unchanged — the root's `-mt-3`,
     the sticky heading at 60 and the sticky rail at 120 all moved there with it, along with the
     long notes explaining which of those are this build's rather than the original's. This call
     site keeps only what is the WALLET's: its title, its rows, and the pane. */
  return (
    <MenuPageLayout
      title={title}
      menu={rows.map((row) => ({
        key: row.key,
        href: row.href,
        title: <RailLabel icon={row.icon} title={row.title} />,
      }))}
    >
      <Outlet />
    </MenuPageLayout>
  );
}
