import React from 'react';
import { useSession } from '../../context/session';
import SportRail from './SportRail';
import ExpandedNavbar from './ExpandedNavbar';
import LobbyTabs from './LobbyTabs';
import FeaturedBanner from './FeaturedBanner';
import BetsFeed from './BetsFeed';
import SportFilter from './SportFilter';
import EventGrid from './EventGrid';
import BetSlip from './BetSlip';
import LobbyFooter from './LobbyFooter';
import useResource from '../../hooks/useResource';
import { launchSportsbook } from '../../services/sports';
/* `.sports-dont` — the middot between a fixture's category and its tournament — is a global
   helper lifted verbatim from the original's own stylesheet (index-DxOqNczA.css) and it lives
   in Highlights.css because that is where it was first needed. Imported rather than restated,
   so there is one copy of a rule that came from the mirror. Highlights itself imports
   GameSection.css the same way. */
import '../Home/Highlights/Highlights.css';
import './Sports.css';

/* The sports page — `/sports/*`.
 *
 * Route from Enter-MsmOuq5R.js:
 *
 *   path: "/sports/*"  ->  import("./index-BzFOqw51.js")   info: { guards: [ko] }
 *
 * The wildcard is the original's own, not a convenience: the footer already links
 * `/sports/live` alongside `/sports`, and everything under the path is one mounted widget
 * rather than a set of sibling pages.
 *
 * WHAT THIS PAGE IS ON THE REAL SITE. Almost nothing of it is bc.game's. bc.game does not
 * build a sportsbook — it mounts BetBy's — and its own contribution to the rendered DOM is two
 * nested divs:
 *
 *   <div id="page-content" class="relative z-10 w-full px-4 sm:px-0">
 *     <div id="betby" class="!my-0 -mx-4 min-h-[70vh] sm:mx-0">
 *       <div>  #shadow-root (open)  ... all of BetBy ...
 *
 * Everything below that shadow boundary is a third-party React app: 53 encapsulated
 * stylesheets, styled-components/JSS class names (`sc-1s3etjf-0`, `jss38`) that carry no
 * meaning, and `window.BTRenderer` / `window.btInitializeApp` as its only globals. So the
 * lobby below is not transcribed from a chunk the way Casino was — it is measured off desktop
 * screenshots of the live widget. Sports.css carries the detail, including the fact that those
 * screenshots are at devicePixelRatio 1.25.
 *
 * `#page-content` is this project's `.main-layout-content`, so only the inner div is this
 * page's to render — but its `px-4 sm:px-0` has to come from somewhere, because
 * `.main-layout-content` deliberately runs at `padding-inline: 0` below sm and lets each
 * section supply its own gutter (MainLayout.css:103). Hence the outer div here. The pair is
 * kept rather than collapsed to one because the two classes do opposite things and cancel:
 * below sm `px-4` then `-mx-4` is a full-bleed widget, from sm up `px-0`/`mx-0` aligns it to
 * the 1216px column. Collapse them and the next person has to rediscover why the widget bleeds
 * on a phone and does not on a desktop.
 *
 * `!my-0` is carried over verbatim and is a no-op here: it overrides a block margin the missing
 * chunk's own stylesheet applied. Kept so the class list still matches the live DOM, which is
 * what a future diff gets taken against.
 *
 * WHAT IS NOT HERE, and deliberately. The bet slip — the green `Betslip` bar with its QUICK BET
 * toggle, bottom-right in the capture — is the one piece of the lobby left out. It is the first
 * component on this page that would need real selection state rather than presentational
 * state, and it was scoped out of this pass rather than stubbed.
 *
 * The two floating buttons beside it in the capture (scroll-to-top, support) are NOT BetBy's —
 * they are bc.game's own, and this build already mounts them from the layout shell as
 * `FloatingActions`. Nothing to add here.
 */
export default function Sports() {
  /* THE SLIP HAS A SIGNED-OUT ARM AND A SIGNED-IN ONE, AND NOTHING WAS TELLING IT WHICH. This
     page never read the session, so `signedIn` defaulted to false and the slip showed BOOK and
     LOGIN to a signed-in visitor for ever. It is the only session-dependent thing on the page —
     everything else here is presentational, because there is no sports feed behind it. */
  const { session } = useSession();
  /* The SmartBet sportsbook, framed when the backend hands back a URL (services/sports.js).
     Until it does — fixtures on, signed out, or the book not configured — the lobby below is
     what renders, exactly as before. */
  const readBook = React.useCallback(() => (session.login ? launchSportsbook() : null), [session.login]);
  const { data: bookUrl } = useResource(readBook);
  /* All three are presentational. Nothing on this page is wired to a feed — there is no sports
     feed in the mirror to wire it to — so these drive the selected treatment and the pager and
     nothing else. They are still worth having: the selected/unselected states are half of what
     the tab rows are for, and a hardcoded `Popular` would leave them unverifiable. */
  const [tab, setTab] = React.useState('popular');
  const [sport, setSport] = React.useState('soccer');
  const [page, setPage] = React.useState(1);
  /* The one piece of state here that drives real structure rather than a selected style: the
     rail's overflow arrow opens BetBy's expanded navbar under it. */
  const [expanded, setExpanded] = React.useState(false);

  /* ── THE BET SLIP'S SELECTIONS, AND WHY THEY LIVE HERE ──────────────────────────────────
   *
   * This is the first state on the page that two components share: the odds buttons in the grid
   * write it and the slip reads it. It is held as an ARRAY rather than a Set because the slip
   * renders it in the order the legs were added — an accumulator is a list, and the widget's own
   * shows the newest at the top of the panel — with a Set derived for the grid, which only ever
   * asks "is this one in?". Deriving the Set during render rather than keeping both in state is
   * the same call `App` makes for its background location: two pieces of state that must agree
   * are one piece of state and a derivation.
   *
   * The page's own note calls the slip "the first component that would need real selection state
   * rather than presentational state". This is that state, and it is the whole of it: nothing is
   * placed, because there is no sports feed behind this page to place it against. */
  const [selections, setSelections] = React.useState([]);
  const selected = React.useMemo(() => new Set(selections.map((pick) => pick.id)), [selections]);

  const toggleOutcome = React.useCallback((pick) => {
    setSelections((current) =>
      current.some((entry) => entry.id === pick.id)
        ? current.filter((entry) => entry.id !== pick.id)
        : [...current, pick],
    );
  }, []);

  const removeSelection = React.useCallback(
    (id) => setSelections((current) => current.filter((entry) => entry.id !== id)),
    [],
  );

  return (
    <div className="px-4 sm:px-0">
      <div className="!my-0 -mx-4 min-h-[70vh] sm:mx-0">
        {bookUrl ? (
          <iframe
            src={bookUrl}
            title="Sports"
            allow="autoplay; fullscreen; clipboard-write; encrypted-media; payment"
            allowFullScreen
            referrerPolicy="origin"
            style={{ width: '100%', minHeight: '70vh', border: 0, display: 'block' }}
          />
        ) : (
        <div className="sports-lobby">
          {/* THE EXPANDED NAVBAR IS A DROPDOWN, SO IT HANGS OFF THE RAIL RATHER THAN SITTING IN
              THE COLUMN. Both live inside one positioned dock: the panel is `top: 100%` of it, so
              it lands directly under the rail whatever the rail's height, which is the same
              anchoring every other dropdown in this build uses. It used to be a plain flow
              sibling, so opening it pushed the tabs, the feed and the whole grid down the page
              instead of covering them — see the note in Sports.css. */}
          <div className="sports-rail-dock">
            <SportRail expanded={expanded} onToggleExpanded={() => setExpanded((v) => !v)} />
            <ExpandedNavbar open={expanded} onClose={() => setExpanded(false)} />
          </div>
          <LobbyTabs active={tab} onChange={setTab} />
          <FeaturedBanner />
          <BetsFeed />
          <SportFilter active={sport} onChange={setSport} />
          <EventGrid
            page={page}
            onPageChange={setPage}
            selected={selected}
            onToggleOutcome={toggleOutcome}
          />
          <LobbyFooter />
        </div>
        )}
      </div>
      {/* Outside `.sports-lobby`, because it is `position: fixed` and the lobby's own
          `> * + *` margin rule would otherwise count it as another block in the column. On the
          widget it is mounted in a fixed container of its own for the same reason. */}
      <BetSlip
        selections={selections}
        onRemove={removeSelection}
        onClear={() => setSelections([])}
        signedIn={session.login}
        /* The DISPLAY fiat, not the wallet coin: the live slip's ₹ is its session's locale
           currency (that account is INR), and this build's equivalent is `localeCurrencyName` —
           USDFIAT for a visitor, which the header's own selector already shows as USD. Handing
           it the wallet coin printed "BTC" in front of a stake. */
        currencyName={session.setting?.localeCurrencyName ?? session.setting?.currencyName}
      />
    </div>
  );
}
