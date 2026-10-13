import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../../../components/shared/SectionHeader';
import { gameIcon, coinIcon, multiplier, formatAmount } from './bets';
import Loading from '../../../components/shared/Loading';
import { getLatestBets, getHighRollers } from '../../../services/home';
import { useResource } from '../../../hooks/useResource';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { HIDDEN_NAME } from '../../../context/account';
/* The Wager Contest tab renders the same widget as the /promotions/daily-contest page, so it
   moved to components/shared — see the note at the top of that file for the measurements that
   settled they really are identical. Only the payload stayed local, in ./contest.js. */
import Contest from '../../../components/shared/Contest';
import { getHomeContest } from '../../../services/contest';
import { useGates } from '../../../context/gates';
import './LatestBets.css';

/* Latest round & Race.
 *
 * Source: `Gc` in Enter-MsmOuq5R.js (header + tabs) and `ze` / `me` in
 * ThrowAndHighRolles-C7GElDRJ.js (the table and one row), with the tab chrome from
 * `.tabs-title` / `.tabs-btn` in index-DxOqNczA.css.
 */

const TABS = ['Latest Bet', 'High Roller', 'Wager Contest'];
const NO_CONTEST = () => null;

/* Ten rows on screen at a time — `capacity: Ee` where Ee = 10. */
const VISIBLE = 10;

/* The rolling feed, from `qT` in index-BsFv7ByC.js — the component `ze` mounts as `N` with
 * `initial`, `next` and `capacity`. Its container template `$T` is the shape that makes the
 * whole thing work:
 *
 *   <div style="position:relative;overflow:hidden;overflow-anchor:auto;transform-origin:top">
 *     <div style="display:flex;flex-direction:column-reverse;will-change:transform">
 *
 * COLUMN-REVERSE is the trick. Rows are APPENDED to the array (`y(O => [...O, D])`) but
 * render bottom-to-top, so the newest lands at the TOP and everything below it shifts down
 * by one row. One push is then:
 *
 *   1. append -> the inner block grows 48px and the oldest row is clipped out the bottom
 *   2. animate the block translateY(-48px) -> translateY(0), which starts it exactly where
 *      it sat before the append and slides the new row in from the top
 *   3. drop array[0], the oldest — already outside the clip, so nothing moves
 *
 * `fill: "none"` so the transform is gone by the time step 3 lands.
 */
const ROW_HEIGHT = 48;
const SLIDE_MS = 500; /* BT */
const SLIDE_EASING = 'cubic-bezier(0, 0, 0.58, 1)'; /* FT */

/* `zT` — the gap between consumed items, which shortens as the socket buffer backs up:
   750ms floor, 2250ms when idle, decaying at 0.15 per queued item. There is no socket
   here, so the captured bets are recycled as a permanent backlog; at 30 of them this
   settles on the floor, which is what a busy live feed does. */
const throttleMs = (bufferSize, idle = 2250, floor = 750, decay = 0.15) =>
  bufferSize === 0 ? false : Math.round(floor + (idle - floor) * Math.exp(-decay * bufferSize));

/* 5 columns from lg, 4 below — Bet Amount is the one that drops, gated on `!m.mobile` in
   the original. Both templates are its verbatim values.

   Written out as one literal string rather than composed from constants: Tailwind scans
   source text, so a class assembled at runtime (`lg:${COLS}`) is never seen and never
   emitted. That silently cost the desktop 5-column layout the first time round. */
const ROW_COLS =
  'grid-cols-[26%_minmax(0,1fr)_5.25rem_6rem] lg:grid-cols-[30%_minmax(0,1fr)_minmax(0,1fr)_6rem_7.5rem]';

/* Each cell carries its own column label above the value — the table has no header row,
   which is what lets it reflow to 4 columns without one going missing. */
const Label = ({ children }) => (
  <div className="truncate text-xs text-tertiary">{children}</div>
);

/* `seq` is the row's own `index: h++` from the feed, NOT its position in the array. That
   distinction is the whole zebra pattern: positions shift by one every time the oldest row
   is dropped, so striping on position would invert the whole list on every push. Striping on
   the row's own sequence number makes the bands travel down with the content. */
const GameLink = ({ slug, ...props }) =>
  slug ? <Link to={`/game/${slug}`} {...props} /> : <a href="#" {...props} />;

function BetRow({ bet, seq, precision }) {
  const mult = multiplier(bet.payout);
  const won = mult >= 1;

  return (
    <div style={{ height: '48px' }}>
      <div
        className={`lf-row grid h-12 items-center rounded-xl px-3 ${ROW_COLS} ${
          (seq & 1) === 0 ? 'zebra' : ''
        }`}
      >
        <div className="min-w-0">
          {/* A row that knows its game page (the static showcase rows carry `slug`) links to it;
              `icon` is the catalogue art for a third-party game the icon map does not know. */}
          <GameLink
            slug={bet.slug}
            className="flex items-center font-semibold text-primary hover:underline"
          >
            <img
              className="mr-1 inline-block size-5 rounded-sm object-cover"
              alt="game icon"
              src={bet.icon || gameIcon(bet.gameUnique)}
            />
            <span className="ellipsis">{bet.fullName || bet.gameUnique}</span>
          </GameLink>
        </div>

        <div className="ellipsis font-semibold text-primary">
          <Label>Player</Label>
          {/* The API's sentinel for a hidden player is the same `****` Recent Big Wins
              uses; a hidden name is plain text, a visible one links to the profile. The
              sentinel is `Os.hiddenName` on the original — one string in one place — so it
              lives in context/account.js here rather than as a literal at the call site. */}
          <div className="truncate text-sm">
            {bet.userName === HIDDEN_NAME ? (
              <span className="text-secondary">Hidden</span>
            ) : (
              <a href="#" className="hover:underline">
                {bet.userName}
              </a>
            )}
          </div>
        </div>

        <div className="hidden font-semibold text-secondary lg:block">
          <Label>Bet Amount</Label>
          <div className="flex items-center justify-start truncate text-sm">
            <span className="overflow-hidden text-nowrap">{formatAmount(bet.throwAmount)}</span>
            <img
              className="ml-1 h-5 flex-none"
              src={coinIcon(bet.currencyName)}
              alt={bet.currencyName}
            />
          </div>
        </div>

        <div className="font-semibold text-secondary">
          <Label>Multiplier</Label>
          {/* SUFFIX, not prefix — `1.01x`. The original's template is
                Ue = i('<div class="truncate text-sm">x')
             and the number goes in with `s(r, () => e().toFixed(2), t)` where the marker `t`
             is that template's first child, i.e. the "x" itself. Inserting BEFORE the marker
             puts the number in front of the x. This read as `x1.01` here until the chunk was
             checked, at every width, not just on mobile. */}
          <div className="truncate text-sm">{mult.toFixed(2)}x</div>
        </div>

        <div className="text-right font-semibold text-secondary">
          <Label>Profit</Label>
          <div
            className={`flex items-center justify-end truncate text-sm ${
              won ? 'text-brand' : 'text-secondary'
            }`}
          >
            {/* `precision: m.mobile ? 4 : 5` — the profit column is the one cell the original
                shortens off-desktop, and it is the reason its mobile numbers fit where ours
                ran past the column and had the minus sign clipped off the left (this cell is
                `justify-end` inside `truncate`, so overflow is cut from the START). Bet Amount
                keeps 5 either way — it only renders at lg. */}
            <span className="text-nowrap">
              {won ? '+' : ''}
              {formatAmount(bet.profitAmount, precision)}
            </span>
            <img
              className="ml-1 h-5 flex-none"
              src={coinIcon(bet.currencyName)}
              alt={bet.currencyName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BetFeed({ source }) {
  const inner = React.useRef(null);
  const nextSeq = React.useRef(VISIBLE);

  /* Resolved once here rather than per row — ten rows asking the same media query ten times
     would give the same answer ten times. */
  const precision = useIsDesktop() ? 5 : 4;

  /* `initial` is `[...r].reverse().slice(0, D)` for Latest Bet — the API hands back
   * newest-first and the array wants oldest-first, because column-reverse flips it again.
   *
   * THE PANEL OPENS FULL, and it used to open at whatever the feed happened to hold.
   *
   * On the original that distinction does not exist: its source is a websocket on a busy site,
   * so the first read is always longer than the ten rows the panel shows. Here it is one HTTP
   * read of `bet-history/live`, and on this delivery that answers FOUR rows — so the panel
   * opened four tall and grew a row at a time for twelve seconds before it looked like the
   * reference. Reported as "only 6 rows displaying", which is exactly what it looks like six
   * seconds in.
   *
   * Padding by cycling is what the ticker below already does (`source[seq % source.length]`),
   * so this adds no behaviour that was not already there — it just applies it at mount instead
   * of making the visitor watch it happen. With a feed of ten or more this is byte-identical to
   * the old line, since `i % newest.length` is `i` for every i below VISIBLE.
   *
   * IT ALSO FIXES THE ZEBRA. `nextSeq` starts at VISIBLE on the assumption that the initial
   * list is VISIBLE long; with four initial rows numbered 0..3 the first pushed row was seq 10,
   * leaving a six-wide gap in the sequence the stripe pattern is keyed on.
   *
   * WHAT THIS DOES NOT FIX is that four bets cannot fill ten rows without repeating: the same
   * round appears more than once, with the same id. That is the feed being thin rather than the
   * component being wrong, and the honest cure is more bets — or a socket, which is what the
   * original has. Recorded here rather than papered over. */
  const [rows, setRows] = React.useState(() => {
    if (source.length === 0) return [];
    const newest = source.slice(0, VISIBLE);
    return Array.from({ length: VISIBLE }, (_, i) => newest[i % newest.length])
      .reverse()
      .map((bet, i) => ({ bet, seq: i }));
  });

  /* `v = L(() => n() && r() && !s())` — the feed only runs while the tab is visible and the
     pointer is off the list. The original hangs mouseenter/mouseleave on the $T outer. */
  const [hovered, setHovered] = React.useState(false);
  const [visible, setVisible] = React.useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );

  React.useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const paused = hovered || !visible;

  React.useEffect(() => {
    /* AN EMPTY SOURCE STOPS THE TICKER DEAD, and without this line it crashed the page.
     *
     * `source[seq % source.length]` is `source[NaN]` when the list is empty, which is
     * `undefined`, which reaches `BetRow` and throws on `bet.payout`. The clock made it worse:
     * `throttleMs(0)` returns `false` by its own first branch, and `setTimeout(fn, false)`
     * coerces to 0 — so an empty feed pushed an undefined row on every tick of a hot loop
     * rather than once.
     *
     * The feed is empty whenever nobody has played recently, which is most of the time on a
     * quiet deployment and was ALWAYS true before the in-house bets started being recorded.
     * The ticker was written against the fixture, which has thirty rows and never runs dry —
     * the same class of blind spot as a guard whose branch is unreachable.
     *
     * Returning early is the whole fix: `rows` is already `[]`, so the panel renders as an
     * empty box, which is what a bet ticker with no bets should look like. The original has no
     * equivalent hazard because its source is a socket that simply never pushes. */
    if (paused || source.length === 0) return undefined;

    let cancelled = false;
    let timer = 0;

    const push = async () => {
      /* Read the sequence number BEFORE handing it to the updater, and only then advance it.
         This used to read `nextSeq.current` from inside the updater closure and increment on
         the next line — but React does not run an updater when you call setState, it runs it
         during the re-render, which is after this whole synchronous block. So the row was
         stamped with the value the ref held AFTER the increment, and the very first pushed row
         came out as 11 against initial rows numbered 0..9. 9 and 11 are both odd, both get the
         `zebra` class, and two banded rows appear side by side — the pattern then travels down
         the list with them until it scrolls off the bottom. Everything after that push is
         consecutive again, which is why it shows up once and then looks correct.

         The original has no equivalent hazard: its `index: h++` is evaluated where it is
         written, inside `onConsume`. */
      const seq = nextSeq.current;
      nextSeq.current += 1;
      setRows((prev) => [...prev, { bet: source[seq % source.length], seq }]);

      /* `yield Promise.resolve()` in the original; a frame here, so the appended row is
         laid out before the slide runs against it. */
      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });
      if (cancelled) return;

      const el = inner.current;
      if (el && typeof el.animate === 'function') {
        await el
          .animate([{ transform: `translateY(-${ROW_HEIGHT}px)` }, { transform: 'translateY(0)' }], {
            duration: SLIDE_MS,
            easing: SLIDE_EASING,
            fill: 'none',
          })
          .finished.catch(() => {});
      }
      if (cancelled) return;

      setRows((prev) => (prev.length > VISIBLE ? prev.slice(1) : prev));
      timer = setTimeout(push, throttleMs(source.length));
    };

    timer = setTimeout(push, throttleMs(source.length));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paused, source]);

  return (
    /* `te` — the panel. The <style> it carries inline lives in LatestBets.css here. */
    <div className="relative overflow-hidden rounded-lg bg-layer4 p-2 text-secondary">
      {/* `$T` outer. The height is `min(count, capacity) * rowHeight`, which is what clips
          the eleventh row while the slide runs — without it the new row would simply appear
          below and nothing would move. */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          overflow: 'hidden',
          overflowAnchor: 'auto',
          transformOrigin: 'top',
          height: `${Math.min(rows.length, VISIBLE) * ROW_HEIGHT}px`,
        }}
      >
        <div
          ref={inner}
          style={{ display: 'flex', flexDirection: 'column-reverse', willChange: 'transform' }}
        >
          {rows.map((row) => (
            <BetRow key={row.seq} bet={row.bet} seq={row.seq} precision={precision} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LatestBets() {
  /* THREE TABS, THREE FEEDS — and until 2026-09-04 there were two. `fe` in
     `ThrowAndHighRolles-C7GElDRJ.js` keys the panel's URL on the tab, so Latest Bet and High
     Roller are different lists on the original; here they were both `getLatestBets`, which is
     why they showed identical data. `getHighRollers` reads `bet-history/top-wins`, the public
     biggest-wins board — see services/home.js for why that route's one documented objection is
     about a different component. */
  const { data: bets, loading: betsLoading } = useResource(getLatestBets);
  const { data: rollers, loading: rollersLoading } = useResource(getHighRollers);
  /* The Wager Contest tab is a promotion: an account or site with the contest off gets neither
     the tab nor its read (an agent-tree player's `/user/race/*` is refused). */
  const contestOn = useGates().on('contest');
  const { data: contest, loading: contestLoading } = useResource(contestOn ? getHomeContest : NO_CONTEST);
  const [chosen, setTab] = React.useState(0);
  /* A race the platform has switched off (`enabled: false` on its config) is hidden rather than
     drawn as an idle "Ended" board; fixtures carry no flag and keep the tab. */
  const raceOff = contest?.contest?.enabled === false;
  const tabs = contestOn && !raceOff ? TABS : TABS.slice(0, 2);
  const tab = chosen < tabs.length ? chosen : 0;

  const feed = tab === 1 ? rollers : bets;
  const feedLoading = tab === 1 ? rollersLoading : betsLoading;

  return (
    <>
      {/* showController: false and no href, so neither the All button nor the arrows show.
          `!mb-0 !h-10` is the original's own override on this one header. */}
      <SectionHeader className="!h-10 px-4 sm:px-0">Latest round &amp; Race</SectionHeader>

      {/* sm:!-mt-10 lifts the tab strip onto the header's line at desktop; below sm it
          stays underneath. max-w-100 is 25rem.

          The gutter has to be on a WRAPPER, not on the capped element — that is the whole
          reason the strip sat pushed to the right below sm. `ml-auto max-w-100` is the
          original's own class list, and on the original it never binds on a phone: its page
          wrapper carries the px-4, so the tab div's containing block is already viewport - 32
          (343 at 375) against a cap of 25rem (348.8 at that root), and the element just fills
          it. Ours has no page gutter below sm — each section supplies its own — so putting the
          px-4 HERE left the containing block at the full 375, the cap bound at 348, and
          `ml-auto` shunted the 348 to the right edge; the padding then indented the strip
          again inside that. Same two classes, opposite result, purely from where the 32px of
          gutter lives. */}
      <div className="px-4 sm:px-0">
        <div className="ml-auto mt-2 max-w-100 sm:!-mt-10">
          <div className="tabs-title hide-scroll" role="tablist">
            {tabs.map((title, i) => (
              <button
                key={title}
                type="button"
                role="tab"
                className="tabs-btn"
                aria-selected={tab === i ? 'true' : undefined}
                onClick={() => setTab(i)}
              >
                <span className="font-semibold">{title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The third tab drops the layer4 panel — its own class list is
          `bg-transparent`, since the contest brings its own cards.

          `px-4 sm:px-0` is ours, for the same reason as the tab strip above: the original
          inherits this gutter from its page wrapper, and below sm ours does not have one, so
          the panel was bleeding to both window edges while the heading above it sat inset.

          `my-3` IS THE ORIGINAL'S OWN AND IS BACK TO IT. This panel is the home page's LAST CHILD
          and the page root carries no padding and no border, so its bottom margin COLLAPSES
          THROUGH the root and only the LARGER of the two is ever the gap above the tabbar. That
          clearance is measured off the reference at 2.75rem and lives in Home.css, which is over
          three times this, so a mobile arm here would be dead weight — it had one for a couple of
          passes while the page value was under 0.75rem, and that is the only condition under
          which anything needs writing here. Check that note before adding one back. */}
      <div
        className={`my-3 min-h-96 rounded-xl px-4 font-semibold sm:px-0 ${
          tab === 2 ? 'bg-transparent' : ''
        }`}
      >
        {/* One spinner for the panel, keyed to whichever feed the open tab reads. `min-h-96` on
            the wrapper is the original's own, so the box is already the height the rows will
            fill and nothing below the section moves when they land — which is the whole reason
            the loader goes inside it rather than replacing it. */}
        {(tab === 2 ? contestLoading : feedLoading) ? (
          <div className="center h-96">
            <Loading />
          </div>
        ) : tab === 2 ? (
          contest && <Contest contest={contest.contest} standings={contest.standings} />
        ) : (
          /* KEYED ON THE TAB, so switching between Latest Bet and High Roller REMOUNTS the feed.
             Without it React keeps the same component instance and its `rows` state — the ten
             rows already on screen — while only the `source` prop changes, so the panel would go
             on showing the old tab's bets until the ticker had pushed ten more of the new ones.
             The original has no equivalent hazard: `ze` is instantiated per type. */
          <BetFeed key={tab} source={feed ?? []} />
        )}
      </div>
    </>
  );
}
