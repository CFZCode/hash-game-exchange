import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../../../components/shared/SectionHeader';
import { toTableRow, isAdvertised } from './bets';
import Loading from '../../../components/shared/Loading';
import { getLatestBets, getHighRollers } from '../../../services/home';
import { useResource } from '../../../hooks/useResource';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
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

/* Ten rows on screen by default — `capacity: Ee` where Ee = 10; the page-size picker raises it. */
const DEFAULT_CAPACITY = 10;

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

/* The grid template, bc.game's current capture verbatim (signed-in desktop):
 *
 *   grid-cols-[30%_minmax(0,1fr)_minmax(0,1fr)_6rem_7.5rem]   Game · Player · Bet Amount · Multiplier · Profit
 *
 * The capture is a desktop one. Below lg this build keeps the four-column arm the original's
 * `!m.mobile` gate draws (Bet Amount dropped), so a phone row still fits; that template is the
 * older chunk's own value. Both are literal strings so Tailwind's scanner sees them. */
const COLS_DESKTOP = 'grid-cols-[30%_minmax(0,1fr)_minmax(0,1fr)_6rem_7.5rem]';
const COLS_MOBILE = 'grid-cols-[26%_minmax(0,1fr)_5.25rem_6rem]';

/* The page-size picker's choices; 10 is the default the capture shows. */
const PAGE_SIZES = [10, 20];

/* The picker's chevron — the capture's own path, a left chevron turned `-rotate-90`. */
const Chevron = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M20.5603 6.46955C20.0604 5.96968 19.2499 5.96968 18.7501 6.46955L9.99838 15.2212C9.49851 15.7211 9.49851 16.5316 9.99838 17.0314L18.7501 25.7831C19.2499 26.283 20.0604 26.283 20.5603 25.7831L21.8146 24.5287C22.3145 24.0289 22.3145 23.2184 21.8146 22.7185L15.675 16.5789C15.425 16.3289 15.425 15.9237 15.675 15.6738L21.8146 9.53412C22.3145 9.03425 22.3145 8.2238 21.8146 7.72393L20.5603 6.46955Z" />
  </svg>
);

/* `absolute end-0 top-0 hidden sm:block` — the page-size picker right of the tabs. The trigger
   is the capture's markup; the option list under it is this build's (the capture holds only the
   closed state). */
function PageSize({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="absolute end-0 top-0 z-10 hidden sm:block">
      <div
        className="flex h-10 cursor-pointer items-center justify-between rounded-md bg-layer4 px-1 text-quarterary"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-8 px-2 text-base font-extrabold text-primary">{value}</div>
        <button
          className="button button-m size-8 bg-layer5 px-2 font-extrabold text-primary hover:bg-layer5"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Chevron className="icon -rotate-90 font-extrabold text-primary" />
        </button>
      </div>
      {open && (
        <div role="listbox" className="absolute end-0 mt-1 w-full rounded-md bg-layer4 p-1">
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              role="option"
              aria-selected={size === value ? 'true' : undefined}
              className="select-item flex h-8 items-center text-base font-extrabold text-primary hover:bg-layer5"
              onClick={() => {
                onChange(size);
                setOpen(false);
              }}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* The column header row — new in bc.game's current markup (the older chunk printed a label
   inside each cell instead). */
function HeadRow({ desktop }) {
  return (
    <div
      className={`grid h-12 items-center rounded-lg bg-layer2 px-4 py-3 text-xs font-semibold text-tertiary ${
        desktop ? COLS_DESKTOP : COLS_MOBILE
      }`}
    >
      <div>Game</div>
      <div>Player</div>
      {desktop && <div>Bet Amount</div>}
      <div>Multiplier</div>
      <div className="text-right">Profit</div>
    </div>
  );
}

/* One row, the capture's markup cell for cell. `seq` is the row's own `index: h++` from the feed,
   NOT its position in the array — positions shift by one every time the oldest row is dropped,
   so striping on position would invert the whole list on every push. Striping on the sequence
   number makes the bands travel down with the content. The capture's first (bottom) row is
   `bg-layer2`, the next `bg-layer3_alt`. */
function BetRow({ row, seq, desktop }) {
  return (
    <div
      style={{ height: `${ROW_HEIGHT}px` }}
      className={`grid items-center px-4 ${desktop ? COLS_DESKTOP : COLS_MOBILE} ${
        (seq & 1) === 0 ? 'bg-layer2' : 'bg-layer3_alt'
      }`}
    >
      <div className="min-w-0">
        {/* `ellipsi` and `inactive` are the capture's own classes (the first a dead typo). */}
        {row.href ? (
          <Link to={row.href} className="ellipsi flex items-center font-semibold text-primary hover:underline inactive">
            <img className="mr-1 inline-block w-5" alt="game icon" src={row.gameIcon} />
            <span className="ellipsis">{row.game}</span>
          </Link>
        ) : (
          <span className="ellipsi flex items-center font-semibold text-primary">
            <img className="mr-1 inline-block w-5" alt="game icon" src={row.gameIcon} />
            <span className="ellipsis">{row.game}</span>
          </span>
        )}
      </div>

      {row.player ? (
        <div className="ellipsis truncate text-sm font-semibold text-primary" title={row.player}>
          {row.playerHref ? (
            <Link to={row.playerHref} className="hover:underline inactive">
              {row.player}
            </Link>
          ) : (
            <span>{row.player}</span>
          )}
        </div>
      ) : (
        <div className="ellipsis truncate text-sm font-semibold text-primary" title="Hidden">
          <span className="text-secondary">Hidden</span>
        </div>
      )}

      {desktop && (
        /* The capture's `center justify-start`, spelled out: this build's unlayered `.center`
            sets justify-content: center and would beat the `justify-start` utility (the cascade
            hazard in CLAUDE.md), centring the amount in its column. */
        <div className="flex items-center justify-start truncate text-sm font-semibold text-secondary">
          <span className="overflow-hidden text-nowrap">{row.bet}</span>
          <img className="ml-1 h-5 flex-none" src={row.coinIcon} alt={row.coin} />
        </div>
      )}

      <div className="truncate text-sm font-semibold text-secondary">{row.multiplier}</div>

      <div
        className={`flex items-center justify-end truncate text-sm font-semibold ${
          row.won ? 'text-brand' : 'text-secondary'
        }`}
      >
        <span className="text-nowrap">{row.profit}</span>
        <img className="ml-1 h-5 flex-none" src={row.coinIcon} alt={row.coin} />
      </div>
    </div>
  );
}

function BetFeed({ source, capacity = DEFAULT_CAPACITY }) {
  const VISIBLE = capacity;
  const inner = React.useRef(null);
  const nextSeq = React.useRef(VISIBLE);

  /* Resolved once here rather than per row — ten rows asking the same media query ten times
     would give the same answer ten times. */
  const desktop = useIsDesktop();

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
  }, [paused, source, VISIBLE]);

  const height = `${Math.min(rows.length, VISIBLE) * ROW_HEIGHT}px`;

  return (
    /* `te` — the panel, bc.game's current markup: a `layer4_alt` box holding the column header
       and, under it, the clipped rolling list. */
    <div className="relative overflow-hidden rounded-lg bg-layer4_alt p-2 text-secondary">
      <div>
        <HeadRow desktop={desktop} />
        <div className="mt-1 overflow-hidden rounded-lg" style={{ overflowAnchor: 'none', height }}>
          {/* `$T` outer. The height is `min(count, capacity) * rowHeight`, which is what clips
              the extra row while the slide runs — without it the new row would simply appear
              below and nothing would move. */}
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="rounded-lg"
            style={{
              position: 'relative',
              overflow: 'hidden',
              overflowAnchor: 'auto',
              transformOrigin: 'center top',
              height,
            }}
          >
            <div
              ref={inner}
              style={{ display: 'flex', flexDirection: 'column-reverse', willChange: 'transform' }}
            >
              {rows.map((row) => (
                <BetRow key={row.seq} row={row.bet} seq={row.seq} desktop={desktop} />
              ))}
            </div>
          </div>
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

  const [pageSize, setPageSize] = React.useState(DEFAULT_CAPACITY);

  /* Every source — live rows, the static showcase, the fixture capture — goes through the same
     filter (only offered games are advertised) and the same row mapper, so the table prints
     one shape whatever answered. */
  const rawFeed = tab === 1 ? rollers : bets;
  const feed = React.useMemo(() => (rawFeed ?? []).filter(isAdvertised).map(toTableRow), [rawFeed]);
  const feedLoading = tab === 1 ? rollersLoading : betsLoading;

  return (
    <>
      {/* showController: false and no href, so neither the All button nor the arrows show.
          `!mb-0 !h-10` is the original's own override on this one header. */}
      <SectionHeader className="!h-10 px-4 sm:px-0">Latest round &amp; Race</SectionHeader>

      {/* bc.game's current markup (signed-in desktop capture, 2026-10-16): a `relative mt-6`
          block holding the page-size picker (absolute, top right, sm and up), the tab strip
          (left, `mr-auto max-w-100`) and the `tabs-content` panel.

          `px-4 sm:px-0` is ours: the original inherits this gutter from its page wrapper, and
          below sm ours has none — each home section supplies its own. It sits on this wrapper
          rather than on `tabs-content`, whose layer4 fill would otherwise paint into it. */}
      <div className="relative mt-6 px-4 sm:px-0">
        {tab !== 2 && <PageSize value={pageSize} onChange={setPageSize} />}

        <div role="tablist" className="scroll-x tabs-title hide-scroll mr-auto max-w-100">
          <div className="tabs-btn-group">
            {tabs.map((title, i) => (
              <button
                key={title}
                type="button"
                role="tab"
                className="tabs-btn btn-like"
                aria-selected={tab === i ? 'true' : undefined}
                onClick={() => setTab(i)}
              >
                <span className="font-semibold">{title}</span>
              </button>
            ))}
          </div>
          {/* Drawn unconditionally as on the original; `.tabs-indicator` only shows in the
              `data-type="indicator"` variant, which this strip is not. */}
          <div className="tabs-indicator test-indicator-tab" />
        </div>

        {/* The third tab drops the panel fill — the contest brings its own cards.

            `my-3` IS THE ORIGINAL'S OWN. This block is the home page's LAST CHILD and the page
            root carries no padding and no border, so its bottom margin collapses through the
            root and only the larger of the two is the gap above the tabbar (Home.css). */}
        <div
          className={`tabs-content my-3 min-h-96 rounded-xl font-semibold ${
            tab === 2 ? 'bg-transparent' : ''
          }`}
        >
          {/* One spinner for the panel, keyed to whichever feed the open tab reads. `min-h-96` is
              the original's own, so the box is already tall and nothing below moves when rows land. */}
          {(tab === 2 ? contestLoading : feedLoading) ? (
            <div className="center h-96">
              <Loading />
            </div>
          ) : tab === 2 ? (
            contest && <Contest contest={contest.contest} standings={contest.standings} />
          ) : (
            /* KEYED ON THE TAB AND THE PAGE SIZE, so either change REMOUNTS the feed. Without it
               React keeps the same instance and its `rows` state while only the props change, so
               the panel would go on showing the old tab's bets (or the old row count) until the
               ticker had pushed a screenful of new ones. `ze` is instantiated per type on the
               original. */
            <BetFeed key={`${tab}-${pageSize}`} source={feed} capacity={pageSize} />
          )}
        </div>
      </div>
    </>
  );
}
