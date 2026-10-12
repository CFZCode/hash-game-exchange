import React from 'react';
import Pagination from '../../components/shared/Pagination';
import Select from '../../components/shared/Select';
import Loading from '../../components/shared/Loading';
import { Empty } from '../../components/Explore/GameGrid';
import {
  getRaffle,
  getRaffleWinners,
  getRaffleTickets,
  drawInstant,
  wagerProgress,
} from '../../services/raffle';
import { useSession } from '../../context/session';
import { useResource } from '../../hooks/useResource';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { AVATAR_FILE } from './avatars';
import heroArt from '../../assets/raffle/hero.png';
import heroArtMobile from '../../assets/raffle/hero_m.png';
import boltArt from '../../assets/raffle/bolt.png';
import badgeArt from '../../assets/raffle/ticket-badge.png';
import ticketCountArt from '../../assets/raffle/ticket-count.png';
import statTickets from '../../assets/raffle/stat-tickets.png';
import statHat from '../../assets/raffle/stat-hat.png';
import statCoin from '../../assets/raffle/stat-coin.png';
import * as globMaps from './index.globs.js';
import './WeeklyRaffle.css';

/* The weekly raffle — `/promotions/weekly-raffle`.
 *
 * The original's own path (`Enter-MsmOuq5R.js`, `WeeklyPage` out of `index-BLT5gN04.js`) and
 * what the sidebar's "Weekly Raffle" row under Promotions means. Its route there carries
 * `guards: [() => !1]`, so the page is switched OFF on the live site; it is routed here
 * because the sidebar row points at it.
 *
 * TRANSCRIBED FROM RENDERED MARKUP, so the class lists below are the site's. That matters
 * here more than usual, because the chunk (`index-BLT5gN04.js`) is missing and an earlier
 * pass built this page from screenshots alone — the markup corrected a dozen things the
 * pixels could not settle. Worth keeping in view:
 *
 * - The hero card is `bg-black_alpha20` + `backdrop-blur-sm` over the artwork, not an opaque
 *   fill. Solving the samples had given `alw_dark` at 60%, which lands in the same place
 *   visually and is the wrong mechanism.
 * - "SUPER LUCKY DRAW" is `absolute -top-4`, overhanging the card. That is why its ink
 *   measured as if the card had almost no top padding.
 * - The table is `flex justify-between` with per-column widths, not a grid.
 * - `texxt-sm` on the table wrapper is the ORIGINAL'S OWN TYPO and is load-bearing by
 *   accident: the class does not exist, so the rows inherit the body's 14px instead of being
 *   set to it. Kept, because "fixing" it would be inventing a change the live page does not
 *   have. `bas` on the heading is the same kind of dead class.
 *
 * Two things are still not the site's, both because they could not be recovered: the artwork
 * (`/assets/bg-*.png`, `/assets/ticket*.png` are origin-hosted and bc.game's origin times out
 * from here, so these are reconstructed from the captures) and the prose, which comes from
 * the translation bundle — see raffle.js.
 *
 * THE HERO'S BACKGROUND IS RECONSTRUCTED UNDER THE CARD, and how matters, because the card
 * is only 20% black: roughly four fifths of whatever sits behind it is visible, so the
 * reconstruction is on show rather than hidden. Filling that rectangle by interpolating each
 * row between its neighbours — which is what an opaque card would have let us get away with —
 * reads as a smear the moment the real card goes over it. What is there now is a fit: the
 * capture's own pixels inside the card are divided by 0.8 to undo the black, everything that
 * is card UI rather than artwork is dropped, and the ~80% that survives is averaged on a 12px
 * grid and resampled. The true background there is the tail of a radial glow — smooth and
 * low amplitude — so a coarse fit reproduces it and carries none of the UI's edges through.
 */

const money = (value) =>
  `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* `import.meta.glob` resolves relative to the file it is written in, so the globs live here
   rather than beside the data that names them. */
const art = globMaps.art;
const avatars = globMaps.avatars;

const artFor = (name) => art[`../../assets/raffle/${name}.png`];
const avatarFor = (id) => avatars[`../../assets/raffle/avatars/${AVATAR_FILE[id] ?? id}.png`];

/* `Te.Arrow` — the site's single chevron, drawn pointing left and rotated at the call site. */
const ChevronIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

/* d:h:m:s. The markup splits the value into separate text nodes ("6d:1h:48<!---->m:6<!---->s"),
   which is just its templating; the rendered string is what matters. */
function Countdown({ drawsAt }) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, drawsAt - now);
  const parts = [
    ['d', 86400000],
    ['h', 3600000],
    ['m', 60000],
    ['s', 1000],
  ].reduce(
    ({ rest, out }, [suffix, ms]) => {
      const value = Math.floor(rest / ms);
      return { rest: rest - value * ms, out: [...out, `${value}${suffix}`] };
    },
    { rest: remaining, out: [] },
  ).out;

  return <>{parts.join(':')}</>;
}

/* The header's ticket feed. The original runs it on keen-slider inside
   `.carousels-enter-wrap .carousels`, which the stylesheet pins to `height: 16px` — a
   one-line window scrolling vertically through all thirty entries.

   REPRODUCED, NOT PORTED: keen-slider is not a dependency here, so this is the same 16px
   window over a translated stack. The original's slide transforms step by 10px against 16px
   slides, which is its own easing mid-flight rather than a resting geometry; a whole-slide
   step is the resting state it settles on. */
/* `nt` — THE MOBILE TICKER IS A MARQUEE, NOT THE DESKTOP SLIDER, and it is its own little
 * component in the chunk. It measures the track, halves it, and drives a CSS animation:
 *
 *   function nt(e) {
 *     let n; const [r,o] = signal(0), [a,c] = signal(0)
 *     function s() { if (n) o(n.scrollWidth / 2) }
 *     createEffect(() => { const l = e.speed ?? 40; c(r() ? r()/l : 0) })
 *     onMount(() => { requestAnimationFrame(s); addEventListener("resize", s); … })
 *     <div class="relative w-full overflow-hidden">
 *       <div ref={n} class="flex whitespace-nowrap" data-duration={a()}
 *            style={{width: r()+"px", animation: `marquee ${a()}s linear infinite`}}>
 *         {children}{children}
 *       </div>
 *     </div>
 *   }
 *
 * CHILDREN TWICE is the seamless-loop trick and it is also why the width is scrollWidth/2: the
 * box is sized to ONE copy and the second is clipped, waiting to slide in. No feedback loop —
 * the rows are `flex-shrink-0` inside `whitespace-nowrap`, so narrowing the box cannot change
 * what `scrollWidth` measures.
 *
 * AND IT DOES NOT ACTUALLY MOVE ON THE LIVE SITE. The keyframes are
 * `@keyframes marquee { 0% { transform: translate(0) } to { transform: translate(var(--marquee-end)) } }`
 * and `--marquee-end: -100%` is declared on `.marquee` — a class this element does not carry, so
 * the property is undefined here, the `to` keyframe is invalid at computed-value time and gets
 * dropped, and the animation resolves to a single 0% frame. The strip is static, which is what
 * the reference capture shows: two rows side by side, filling the visible copy. Reproduced as
 * found; declaring `--marquee-end` on the wrapper in WeeklyRaffle.css is the one line that would
 * set it going. The chunk's `console.log("Marquee content width:", …)` is not reproduced. */
function Marquee({ speed = 40, children }) {
  const trackRef = React.useRef(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const measure = () => {
      const el = trackRef.current;
      if (el) setWidth(el.scrollWidth / 2);
    };
    const frame = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const duration = width ? width / speed : 0;

  return (
    <div className="relative w-full overflow-hidden">
      <div
        ref={trackRef}
        className="flex whitespace-nowrap"
        data-duration={duration}
        style={{
          width: `${width}px`,
          animation: duration ? `marquee ${duration}s linear infinite` : undefined,
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

/* One row of the ticker. The two arms use DIFFERENT class lists — `at` on the desktop slider is
   `basis-1/2` (two rows share the 16px window's height budget) and `ot` on the marquee is
   `mx-4`, spacing the rows along a line instead. */
function TickerRow({ entry, mobile }) {
  return (
    <div
      className={
        mobile
          ? 'mx-4 flex flex-shrink-0 items-center text-xs'
          : 'flex flex-shrink-0 flex-grow-0 basis-1/2 items-center text-xs'
      }
    >
      <img className="mr-2 w-4 rounded-full" alt="user avatar" src={avatarFor(entry.avatarId)} />
      <span className="font-extrabold text-primary">{entry.player}</span>
      <p className="ml-1 font-semibold text-secondary">
        got<span className="mx-1 font-extrabold text-brand">{entry.tickets}</span>ticket
      </p>
    </div>
  );
}

function Ticker({ entries, mobile }) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (mobile || entries.length < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % entries.length), 2500);
    return () => clearInterval(id);
  }, [entries.length, mobile]);

  /* `<Show when={P.mobile} fallback={<keen-slider vertical …>}><Marquee speed={100}>…` — the two
     arms are different components, not one strip re-styled, which is why this branches in JS. */
  if (mobile) {
    return (
      <Marquee speed={100}>
        {entries.map((entry, i) => (
          <TickerRow key={`${entry.player}-${i}`} entry={entry} mobile />
        ))}
      </Marquee>
    );
  }

  return (
    <div className="carousels-enter-wrap flex flex-auto">
      <div className="carousels">
        <div
          className="raffle-ticker-track"
          style={{ transform: `translate3d(0, ${-index * 16}px, 0)` }}
        >
          {/* The desktop arm keeps its own row markup rather than sharing `TickerRow`: this
              build's stand-in for keen-slider's vertical mode steps the track by a hard 16px, so
              each row has to be pinned to that height, where the chunk lets the library size its
              slides and writes `basis-1/2` instead. */}
          {entries.map((entry, i) => (
            <div
              key={`${entry.player}-${i}`}
              className="flex flex-shrink-0 flex-grow-0 items-center text-xs"
              style={{ minHeight: '16px', maxHeight: '16px' }}
            >
              <img className="mr-2 w-4 rounded-full" alt="user avatar" src={avatarFor(entry.avatarId)} />
              <span className="font-extrabold text-primary">{entry.player}</span>
              <p className="ml-1 font-semibold text-secondary">
                got<span className="mx-1 font-extrabold text-brand">{entry.tickets}</span>ticket
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* `ht` — the Game ID row, and on a phone it belongs to the HERO rather than to the header. The
   chunk inserts it as the hero root's first child under `<Show when={P.mobile}>`, which is why it
   sits above the artwork band and below the ticker in the capture. `max-sm:mb-2.5` is its own. */
function GameIdRow({ data, mobile }) {
  return (
    <div
      className={`flex ${mobile ? 'justify-between text-sm max-sm:mb-2.5' : 'flex-shrink-0 justify-between text-sm'}`}
    >
      <p className="text-secondary">
        Game ID:<span className="font-extrabold text-primary">{data.currentId}</span>
      </p>
      <a
        href="#raffle-rule"
        className={`cursor-pointer text-brand ${mobile ? '' : 'sm:ml-6 sm:mr-2.5'}`}
      >
        How To Play?
      </a>
    </div>
  );
}

function Hero({ data, mobile }) {
  return (
    <div className="py-2.5">
      <div className="">
        {mobile && <GameIdRow data={data} mobile />}
        {/* `flex items-center justify-center` spelled out where the capture has the `center`
            helper. With `center` the card stays centred at every width, because `.center`'s
            own `justify-content` beats `sm:justify-start` — see the note in
            WeeklyRaffle.css. */}
        {/* THE BAND HAS TWO ARTWORKS AND THE PICKER IS A DEVICE TEST, which is the whole of why
            the phone one looked wrong: `mt = () => H(G(gt,ft), G(dt,ut))` where `H(t,e)` is
            `ee.mobile ? t : e` and `G(t,e)` is `Ce.darken ? t : e`. So it is [mobile, desktop]
            over [dark, light] — and both themes name the same file in each pair, so the theme
            half is inert and only the device half decides. `bg-D_XtxMnW.png` is 796x667, drawn
            for a tall box; `bg-BlfpsWpD.png` is 2400x520, aspect 4.6, which is `sm:aspect-[4.6]`
            exactly. This build had only the wide one, so a phone was showing a `bg-cover` crop of
            a band three and a half times too wide — the artwork's middle, blown up and cut off.

            AND THE DESKTOP FILE IS THE DEPLOY'S OWN NOW, replacing the reconstruction this page
            was built with. `hero.png` was rebuilt from the capture by un-matting the 20% black
            under the card and fitting the region behind it on a 12px grid (the long note at the
            top of this file describes it); that was necessary when the chunk was thought lost and
            is not any more. 2400x520 against the reconstruction's 1520x330, and nothing behind
            the card is guesswork. */}
        <div
          className="relative flex items-center justify-center rounded-lg10 bg-cover bg-bottom bg-no-repeat px-4 max-sm:h-80 sm:aspect-[4.6] sm:justify-start"
          style={{ backgroundImage: `url(${mobile ? heroArtMobile : heroArt})` }}
        >
          <div className="relative z-20 rounded-2xl border border-solid border-third bg-black_alpha20 px-7 text-center backdrop-blur-sm max-sm:-top-6 max-sm:w-full sm:px-11 lg:ml-20 lg:max-w-96">
            <img alt="card" className="absolute left-[8%] top-4 z-0 w-4" src={boltArt} />

            <div className="ellipsis absolute -top-4 left-1/2 -translate-x-1/2 text-2xl font-extrabold text-primary">
              <h2>SUPER LUCKY DRAW</h2>
            </div>

            {/* The gold is a CONIC gradient clipped to the text, not the linear ramp a
                vertical sample suggests — see the rule in WeeklyRaffle.css. `text-[#FFE236]`
                on the wrapper is the original's fallback for when the clip does not apply. */}
            <div className="border-b border-solid border-[#fff]/10 text-4xl font-extrabold text-[#FFE236]">
              <p className="raffle-amount mt-2.5">{money(data.jackpot)}</p>
            </div>

            <div className="mt-2 text-xs text-secondary">
              <p className="text-alw_white">Next Draw Starts in</p>
              <div className="border-b border-[#fff]/10 py-2 text-2xl font-extrabold text-alw_white">
                <Countdown drawsAt={data.drawsAt} />
              </div>
            </div>

            <button
              className="button button-brand button-m mx-auto my-2 h-12 px-6 py-0 text-xl leading-normal text-primary_brand"
              type="button"
            >
              Earn ticket
            </button>

            <p className="mb-3 text-xs font-semibold text-alw_white">
              [{data.ticketsSent}] tickets have been sent this round!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* The two cards differ in the original in ways that are not worth normalising: the first
   wraps its reward in a <span> and the second in a <p>, and the first's artwork carries
   `w-auto` where the second's does not. Both are `h-full`, so the illustration is sized by
   the 112px card rather than by a box of its own. */

function EarnCard({ method }) {
  return (
    /* `rounded-lg10 px-7` and the text column's `ml-5` are the chunk's own; this build had
       `rounded-lg px-6.25` and no margin, all three fitted by eye off the desktop capture before
       the chunk was recoverable. The template, for the record:

         <div class="mb-2 flex h-28 items-center justify-between rounded-lg10 bg-layer4 px-7
                     lg:!mb-0 lg:w-1/2">
           <div class=h-full><img class="h-full w-auto" alt=ticket></div>
           <div class="ml-5 flex-1 text-sm font-semibold text-secondary">

       Together they narrow the text column by ~21px, which is what makes the first card's line
       wrap after "Log in & Wager" the way the reference does. */
    <div className="flex h-28 items-center justify-between rounded-lg10 bg-layer4 px-7 lg:w-1/2">
      <div className="h-full">
        <img className="h-full w-auto" alt="ticket" src={artFor(method.art)} />
      </div>
      <div className="ml-5 flex-1 text-sm font-semibold text-secondary">
        {/* `mx-1.5` is the chunk's own and replaces this build's per-card `AMOUNT_GAP` pair
            (`ml-2.5 mr-1.5` on the first card, `ml-1.5 mr-1.5` on the second), fitted by eye when
            the chunk was thought lost. `<span class="mx-1.5 text-brand">` is what both cards carry.

            NO `whitespace-nowrap`: this line is MEANT to wrap. It was pinned to one line for a
            revision on a reading of "should be in single line"; the reference has it breaking
            after "Log in & Wager" with the amount and "Daily:" on the second line, which is what
            the column's real width produces once `px-7`, `ml-5` and the right artwork are in.

            WHERE it breaks is decided in raffle.js, not here: `before` carries the chunk's own
            trailing space and that is the line's only break opportunity, since nothing else
            between "Log" and the colon is whitespace. See the note over EARN_METHODS. */}
        <p>
          {method.before}
          <span className="mx-1.5 text-brand">{method.amount}</span>
          {method.after}
        </p>
        <p className="font-extrabold text-primary">{method.reward}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- My Tickets */
/* `Cn` — the statistics card, and the fussy part is not the three figures. The block is drawn as
 * a TORN TICKET STUB: a dashed rule across the card with two `bg-layer4` discs sitting on it at
 * the card's edges, which read as punched notches because they are the surrounding card's colour
 * over the green fill. All four of those elements flip axis at `lg` — the rule goes vertical at
 * 60% of the width and the discs move to its top and bottom — which is why each carries an `lg:!`
 * override rather than a pair of variants.
 *
 * The three icons are the deploy's own: `hat-Bt7-smkc.png` and `coin-DSJ7XEqV.png` off
 * `hash.game/assets/`, plus the tickets mark, which is a base64 PNG inlined in the chunk and was
 * decoded rather than fetched — the arrangement the referral socials and the Free Plays provider
 * marks already have. */
function StatsCard({ stats }) {
  return (
    /* No panel of its own: the stub card and the sub-tab strip below it sit in ONE
       `rounded-lg10 bg-layer4 p-3` panel, opened at the call site. It carried that panel here for
       a while, which split the pane into two boxes with a 16px gutter between them. */
    <div>
      <div>
        <div className="relative h-40 rounded-lg10 border-solid border-brand/20 bg-brand/10 px-5 py-4 sm:flex sm:h-24 sm:border sm:border-brand/10 lg:items-center">
          <div className="lg:flex-w-4/6 flex flex-col justify-center lg:w-4/6">
            <div className="flex h-8 items-center text-sm leading-none">
              <div className="mr-3">
                <img alt="tickets" className="h-auto w-7" src={statTickets} />
              </div>
              <p className="mr-3 font-semibold text-secondary">Total tickets:</p>
              <p className="font-extrabold text-primary">{stats.totalTicket}</p>
            </div>
            <div className="flex h-8 items-center">
              <div className="mr-3">
                <img alt="hat" className="h-auto w-5" src={statHat} />
              </div>
              <p className="mr-3 font-semibold text-secondary">Total winning tickets:</p>
              <p className="font-extrabold text-primary">{stats.totalWinningTicket}</p>
            </div>
          </div>

          <div className="relative -top-4 flex h-full w-full flex-col justify-center lg:!top-0 lg:!h-auto lg:w-auto">
            <div className="flex items-center">
              <div className="mr-3">
                <img alt="coin" className="h-auto w-5" src={statCoin} />
              </div>
              <p className="mr-3 font-semibold text-secondary">Total Prize won:</p>
              {/* `money()` rather than the page's own `printCurrency` import: the chunk writes
                  `L.printCurrency(new Decimal(totalWinningAmount || 0))` with NO source currency,
                  which is `printCurrency`'s USD default — the same fixed-dollar figure every other
                  amount on this page is printed with, and what the capture shows. */}
              <p className="text-2xl font-extrabold text-brand">
                {money(stats.totalWinningAmount)}
              </p>
            </div>
          </div>

          {/* `border border-b border-dashed` is the chunk's own — the shorthand already sets all
              four sides and the `border-b` after it adds nothing. Kept as written. */}
          <div className="absolute left-0 top-[60%] w-full border border-b border-dashed border-white_alpha10 lg:!left-[60%] lg:!top-0 lg:h-full lg:!w-[1px]" />
          <div className="absolute -left-1 top-[53%] z-20 flex h-6 w-full justify-between lg:!left-[60%] lg:-top-1 lg:h-full lg:w-6">
            <div className="absolute -left-2 h-6 w-6 rounded-full bg-layer4 lg:!-left-3 lg:-top-2" />
            <div className="absolute h-6 w-6 rounded-full bg-layer4 lg:-bottom-4 lg:-left-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* `ue` — one ticket list, shared by all three sub-tabs. It is empty in this build, so what
   renders is the site's own placeholder; the header row, the rows and the pager are written out
   because they are the component, and because they are what a real feed would need. The prize
   cell has three states off the chunk's own enum (`{COMMON: 0, LOSE: 1, WIN: 2}`): a running
   ticket says "Waiting for next draw", a past winner prints its amount in brand green, and a
   past loser is a bare `--`. */
function TicketList({ tickets, isRunning }) {
  const rows = tickets?.list ?? [];

  /* `ae` in the chunk — the site's own empty placeholder, which this page already imports as
     `Empty` (a re-export of components/shared/EmptyPlaceholder). */
  if (rows.length === 0) return <Empty />;

  return (
    <div>
      <div className="flex justify-between border-b border-solid border-third py-2 text-sm text-secondary">
        <p>My Ticket</p>
        <p>Prize</p>
      </div>
      {rows.map((ticket) => (
        <div
          key={ticket.number}
          className="flex items-center justify-between border-b border-solid border-third py-3"
        >
          <div className="flex-1">
            <div className="relative w-36 max-w-36">
              <img className="h-[2.4194rem] w-36" alt="ticket" src={badgeArt} />
              <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-lg font-extrabold text-primary">
                {ticket.number}
              </span>
            </div>
          </div>
          <div>
            {isRunning ? (
              <span className="font-semibold text-secondary">Waiting for next draw</span>
            ) : ticket.winning > 0 ? (
              <span className="font-semibold text-brand">+ {money(ticket.winning)}</span>
            ) : (
              <span>--</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* `un` — the three sub-tabs. The strip is `type="indicator"`, i.e. an underline under the active
   label rather than the filled pill the outer strip carries, and the panes below it are the same
   `TicketList` three times over. The draw pickers the Past and My Winnings arms can show are
   gated on `round > 0` / `winningRound > 0`, which nothing here sets — see services/raffle.js. */
const SUB_TABS = ['Active', 'Past', 'My Winnings'];

function MyTickets({ tickets }) {
  const [tab, setTab] = React.useState(0);
  const stripRef = React.useRef(null);
  const { wager } = wagerProgress(tickets.progress);

  /* Measured onto the node, as the promotions page's indicator is: an `indicator` strip's tabs
     are each their own label's width, so the two custom properties cannot be derived from an
     index. */
  React.useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const button = strip.querySelectorAll('.tabs-btn')[tab];
    if (!button) return;
    strip.style.setProperty('--tabs-width', `${button.clientWidth}px`);
    strip.style.setProperty('--tabs-indicator-position', `${button.offsetLeft}px`);
  }, [tab]);

  return (
    /* The chunk's own bare wrapper. The panel around it belongs to the pane (see the call site),
       so the strip sits on the same layer4 the stats card above it does rather than opening a
       second box under it. */
    <div className="relative mt-4">
      <div
        role="tablist"
        ref={stripRef}
        data-type="indicator"
        className="scroll-x tabs-title hide-scroll mytickets-tab-wrap"
      >
        <div className="tabs-btn-group">
          {SUB_TABS.map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={tab === index || undefined}
              className="tabs-btn btn-like"
              onClick={() => setTab(index)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="tabs-indicator test-indicator-tab" />
      </div>

      <div>
        {tab === 0 && (
          <>
            {/* `gn` has two arms and only the first can render here: with no running tickets it
                is this invitation, with some it becomes "…one more additional raffle ticket" over
                an `n/100` counter. */}
            <div className="py-2 font-semibold text-secondary">
              Wager<span className="mx-1 font-extrabold text-primary">{money(wager)}</span>to get
              your daily raffle ticket.
            </div>
            <TicketList tickets={tickets.runningTickets} isRunning />
          </>
        )}
        {tab === 1 && <TicketList tickets={tickets.pastwinTickets} />}
        {tab === 2 && <TicketList tickets={tickets.pastwinTickets} />}
      </div>
    </div>
  );
}

function WinnerRow({ winner, mobile }) {
  return (
    <div className="flex items-center justify-between border-b border-solid border-third py-3.5 text-primary">
      <div className="w-12">No. {winner.rank}</div>

      {/* `flex items-center` rather than the capture's `center`, so `justify-start` wins. */}
      <div className="ellipsis flex w-20 cursor-pointer items-center justify-start lg:w-40">
        {/* `<Show when={!P.mobile}>` around the avatar alone — the name stays either way, so a
            phone row is the name against the left edge of its column. */}
        {!mobile && (
          <img
            className="mr-2 rounded-full sm:h-10 sm:w-10"
            alt="user avatar"
            src={avatarFor(winner.avatarId)}
          />
        )}
        <span className="ellipsis inline-block">{winner.player}</span>
      </div>

      <div className="center w-28 lg:w-72">
        <div className="relative w-36 max-w-36">
          {/* 144 x 38.71 — the original's measurement, w-36 plus an explicit 2.4194rem.
              The badge PNG was cropped to its ink to make that possible: as reconstructed it
              was 187x54 with a 3px transparent margin all round, so `w-36` alone drew the
              artwork at 138.6 x 34.4 inside a 144 x 41.58 box — about a tenth small, and no
              height could fix it while the margin was in the file. Trimmed it is 180x48
              (aspect 3.75 against the target's 3.72), so w-36 alone would now give 38.40 and
              the pinned height is a 0.8% stretch to land exactly on the measurement. */}
          <img className="h-[2.4194rem] w-36" alt="ticket" src={badgeArt} />
          <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-lg font-extrabold text-primary">
            {winner.ticket}
          </span>
        </div>
      </div>

      <div className="w-28 text-right lg:w-72">
        <span className="text-right font-extrabold text-brand">+ {money(winner.prize)}</span>
      </div>
    </div>
  );
}

/* "Winning Prize Details" — the one rule panel that is a table rather than sentences.
 *
 * MEASURED off the opened panel at dpr 1.25, so every figure here is a capture measurement
 * divided by 1.25 and the samples are exact rather than eyeballed:
 *
 * - The table sits on its own `layer3` card (sampled #292D2E) inside the panel's `layer4`
 *   (#323738), starting flush with the accordion body's own px-3 — the card's left edge lands
 *   at panel + p-4 + px-3 to the pixel, which is what fixed the 1.25 scale in the first place.
 * - TWO EQUAL COLUMNS, not a table's own sizing: the Prize column's ink begins at 50.1% of the
 *   card's content box (569.6 of 1136 CSS px).
 * - 48px row pitch, dead uniform down all thirteen rows, over a 20px header line.
 * - PADDING IS 10px ALL ROUND (p-2.5), solved rather than stepped-to. Each edge was recovered
 *   by subtracting the glyph's own side bearing / half-leading from the measured ink position,
 *   using the shipped face's metrics: left comes out 9.98 from "Result" and 10.30 from "No. 2",
 *   top 10.10, bottom 10.76 — against the p-3 this was first written with, which put every
 *   edge 2px out. The residual ~1px is the header line box, whose exact height depends on
 *   which ascent the browser takes; it is not another padding step.
 * - The panel's own `px-3` around this card IS right, and the capture proves it: the card's
 *   left edge lands at rules-card + p-4 + px-3 to the pixel.
 * - Sizes are solved from ink widths against the shipped woff2 metrics rather than read off
 *   glyph heights (the method /deposit-offer's notes recommend): the header and every ordinary
 *   row land at 13.8-14.7px, i.e. text-sm, while No. 1's label solves to 15.8-16.4 (text-base)
 *   and its prize to 17.7-18.2 (text-lg). Only that first row is enlarged.
 * - Colours sampled, not guessed: header #B3BEC1 (secondary) on both cells, ordinary labels
 *   pure white, every prize #24EE89 (brand) — and No. 1's LABEL is brand too, which is the
 *   only thing marking the top place.
 */
function PrizeTable({ ladder }) {
  return (
    <div className="rounded-lg bg-layer3 p-2.5">
      <div className="flex items-center text-sm font-bold text-secondary">
        <div className="w-1/2">Result</div>
        <div className="w-1/2">Prize</div>
      </div>

      {/* font-bold on the top row, font-semibold on the rest. Note what `font-bold` actually
          resolves to here: 700 is not one of the three faces this build ships (400/600/800),
          and CSS font matching walks UP from a desired weight above 500 — so it renders in the
          real 800 face rather than as a synthesised bold. It is the same ink as
          `font-extrabold`; the class name is the one asked for. */}
      {ladder.map((tier, index) => (
        <div
          key={tier.place}
          className={`flex h-12 items-center ${index === 0 ? 'font-bold' : 'font-semibold'}`}
        >
          <div className={`w-1/2 ${index === 0 ? 'text-base text-brand' : 'text-sm text-primary'}`}>
            {tier.place}
          </div>
          <div className={`w-1/2 text-brand ${index === 0 ? 'text-lg' : 'text-sm'}`}>
            {money(tier.prize)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* The accordion is `space-y-4` over rows that are `py-3` around a `text-base` label — 48 per
   row on a 16 gap, which is where the measured 64px pitch comes from. Nothing was captured
   with a panel open, so the body's own typography is this project's; the sentences in it are
   the translation bundle's. */
function Accordion({ id, items, children }) {
  const [open, setOpen] = React.useState(null);

  return (
    <div className="w-full space-y-4">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id} className="overflow-hidden rounded-xl">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              aria-controls={`${id}-${item.id}`}
              className="flex w-full cursor-pointer items-center justify-between rounded-md rounded-b-none bg-layer4 px-3 py-3 text-sm font-extrabold"
              onClick={() => setOpen(isOpen ? null : item.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setOpen(isOpen ? null : item.id);
                  event.preventDefault();
                }
              }}
            >
              <span className="text-base font-semibold">{item.title}</span>
              <div className="flex size-6 flex-none items-center justify-center rounded-md bg-button_bright">
                {/* 270deg, not -90deg. Both point the chevron the same way — it is drawn
                    pointing left, so 180 is right and 270 is down — but the transition
                    interpolates between the NUMBERS, and 180 -> -90 is a 270deg sweep the long
                    way round. 180 -> 270 is the quarter turn the open/close reads as. */}
                <ChevronIcon
                  className={`icon size-4 fill-secondary transition-all duration-300 ${
                    isOpen ? 'rotate-[270deg]' : 'rotate-180'
                  }`}
                />
              </div>
            </div>
            {/* `text-sm font-semibold text-secondary` on the wrapper and BARE `<p>`s inside it
                — the captured markup for an open panel, which settles what used to be this
                project's own guess at the body typography. Both accordions on the page render
                through here, so Raffle Rules and the FAQ share it. text-sm is already
                0.875rem/1.25rem here and `secondary` is already #B3BEC1 = rgb(179,190,193), so
                the weight was the only thing missing. The paragraphs carry no classes at all:
                the `mt-2 first:mt-0` that stood here was invented, and with preflight zeroing
                <p> margins on both sites the lines run contiguously — that is the original's
                look, not a missing gap. `px-3 pb-3 pt-1` is ours and stays; the captured div
                sits inside a padded parent that the snippet does not show. */}
            {isOpen && (
              <div
                id={`${id}-${item.id}`}
                className="px-3 pb-3 pt-1 text-sm font-semibold text-secondary"
              >
                {children ? children(item) : null}
                {item.body?.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* `useResource` wants a stable function; a signed-out visitor has no tickets feed to read, and
   the original simply never calls it (`onMount(() => { K.login && ne(…) })`). */
const NO_TICKETS = () => null;

export default function WeeklyRaffle() {
  const { data } = useResource(getRaffle);
  /* `P.mobile` in the chunk, read as the 1024 line like every other appearance of that flag. */
  const isDesktop = useIsDesktop();

  const [drawId, setDrawId] = React.useState(null);
  const [page, setPage] = React.useState(1);
  /* The outer strip's index. 0 is My Tickets when signed in and Results otherwise — see the note
     at the strip; a signed-out visitor never reaches 1. */
  const [tab, setTab] = React.useState(0);
  const { session } = useSession();
  const login = session.login;
  const { data: tickets, loading: ticketsLoading } = useResource(login ? getRaffleTickets : NO_TICKETS);

  /* The picker defaults to the newest FINISHED draw, which is the head of the history the
     service derives — the capture's own 20260810120000 on the day it was taken. Held as null
     until chosen so the default follows the clock instead of freezing on first render. */
  const selected = drawId ?? data?.history?.[0];

  const readWinners = React.useCallback(
    () => (selected ? getRaffleWinners({ drawId: selected, page }) : null),
    [selected, page],
  );
  const { data: results, loading: winnersLoading } = useResource(readWinners);

  /* `if (!data) return null` was the whole of this before the seam went asynchronous — correct
     then, since a synchronous fixture could never take the branch, and a blank page now. The
     page is one read: the hero's countdown, the jackpot, the ticker, the rule accordions and the
     draw picker are all fields of it, so there is nothing to render around a spinner and the
     centred one stands for the page. `h-[60vh]` rather than a measured height because no capture
     of this page mid-load exists to measure — see the note on inferred loaders in CLAUDE.md. */
  if (!data) {
    return (
      <div className="center h-[60vh] px-4 sm:px-0">
        <Loading />
      </div>
    );
  }

  const pickDraw = (id) => {
    setDrawId(id);
    setPage(1);
  };

  const at = data.history.indexOf(selected);
  /* 'en-US' explicitly, not the machine's locale: the capture reads
     "Draw time:8/10/2026, 5:30:00 PM" and a bare toLocaleString() renders that as
     "10/8/2026, 5:30:00 pm" wherever the host is not US-English. The TIME ZONE is
     deliberately left local — the draw is one instant worldwide and the live page shows it
     in the visitor's own zone, which is why the capture's 12:00 UTC reads as 5:30 PM. */
  const drawnAt = selected ? new Date(drawInstant(selected)).toLocaleString('en-US') : '';
  const winners = results?.winners ?? [];

  return (
    /* Wrapped rather than left as a fragment so the page has somewhere to hang its mobile
       gutter: `.main-layout-content` runs `padding-inline: 0` below 640 by design and each
       page supplies its own inset there, which this one was missing. `px-4 sm:px-0` is the
       original's own pairing for it. The wrapper is otherwise inert — it adds no layout of its
       own, so the blocks below still stack exactly as they did. */
    <div className="px-4 sm:px-0">
      {/* `basis-56` on the heading is the row's whole layout: the title is a fixed 224px
          flex basis and everything after it follows, which is why "Game ID" starts at exactly
          224 in every capture. `bas` is a dead class in the original; kept as found. */}
      <div className="py-2.5 pr-2.5 max-sm:bg-layer1">
        <div className="flex items-center justify-start">
          {/* BOTH OF THESE ARE DESKTOP-ONLY, and it is one `<Show when={!P.mobile}>` around the
              pair in `ct`. The heading goes because the sheet's own title bar prints it (the
              chunk's root is `<PageLayout title={t("Weekly Raffle")}>`), and the Game ID row goes
              because it MOVES — the hero renders its own copy under the opposite test. So a phone
              header is the ticker and nothing else, which is what the capture shows. */}
          {isDesktop && (
            <>
              <div className="bas flex-shrink-0 flex-grow-0 basis-56 text-lg font-extrabold text-primary">
                Weekly Raffle
              </div>

              <GameIdRow data={data} />
            </>
          )}

          <Ticker entries={data.ticker} mobile={!isDesktop} />
        </div>
      </div>

      <Hero data={data} mobile={!isDesktop} />

      <div className="mt-3.5">
        <div className="mb-3 text-base font-extrabold text-primary">
          <p>How to Earn Ticket</p>
        </div>
        <div className="mb-2 space-y-2 lg:flex lg:items-center lg:space-x-4 lg:space-y-0">
          {data.earnMethods.map((method) => (
            <EarnCard key={method.id} method={method} />
          ))}
        </div>
      </div>

      <div className="">
        {/* The site's own tab strip with a single tab. `--tabs-width: 256px` and
            `sm:w-64` are the capture's, so the strip IS the tab at this width. */}
        {/* `En` — TWO TABS, AND THE FIRST ONE IS LOGIN-GATED:
         *
         *   <Tabs value={e()} onChange={n} class="sm:w-64">
         *     <Show when={K.login}>
         *       <TabItem onClick={() => n(0)}
         *                title={`${d("My Tickets")}${periodTicketCount > 0 ? ` (${count})` : ""}`}/>
         *     </Show>
         *     <TabItem onClick={() => n(1)} title={d("Results")}/>
         *   </Tabs>
         *   <Show when={e() === 0}><Show when={K.login} fallback={<Results/>}><MyTickets/></Show></Show>
         *   <Show when={login && e() === 1}><Results/></Show>
         *
         * so index 0 is My Tickets for a signed-in visitor and Results for everyone else, which is
         * how one strip serves both states without renumbering. The count in the label only
         * appears once tickets exist; this build's payload is the store's own empty default, so it
         * never does. The strip was a single hardcoded Results tab here, which was right for the
         * signed-out capture the page was built from and wrong the moment anyone signed in. */}
        <div className="page-tabs">
          <div
            role="tablist"
            className="scroll-x tabs-title hide-scroll sm:w-64"
            style={{
              '--tabs-width': login ? '128px' : '256px',
              '--tabs-indicator-position': login ? `${tab * 128}px` : '0px',
            }}
          >
            <div className="tabs-btn-group">
              {login && (
                <button
                  role="tab"
                  aria-selected={tab === 0 || undefined}
                  className="tabs-btn btn-like"
                  type="button"
                  onClick={() => setTab(0)}
                >
                  My Tickets
                  {tickets?.periodTicketCount > 0 ? ` (${tickets.periodTicketCount})` : ''}
                </button>
              )}
              <button
                role="tab"
                aria-selected={!login || tab === 1 || undefined}
                className="tabs-btn btn-like"
                type="button"
                onClick={() => setTab(1)}
              >
                Results
              </button>
            </div>
            <div className="tabs-indicator test-indicator-tab" />
          </div>
          <div className="tabs-content" />
        </div>

        {/* `myTickets` is its own read and lands after the page's, so the pane below the strip
            would otherwise be absent for a beat while the tab that opens it is already lit. The
            card's own box (`rounded-lg10 bg-layer4 p-3`) is kept so only its contents are
            missing. */}
        {login && tab === 0 && ticketsLoading && (
          <div className="tab-item-page-wrap center h-96 rounded-lg10 bg-layer4 p-3">
            <Loading />
          </div>
        )}

        {login && tab === 0 && tickets && (
          <div className="tab-item-page-wrap rounded-lg10 bg-layer4 p-3">
            <StatsCard stats={tickets.statistics} />
            <MyTickets tickets={tickets} />
          </div>
        )}

        {/* `<Show when={login && e()===1}>` on the original, and `<Show when={e()===0}>` with a
            login fallback above it — the two together mean the Results pane is what index 0 shows
            to a signed-out visitor and index 1 to a signed-in one. */}
        {(!login || tab === 1) && (
        <div className="tab-item-page-wrap">
          <div className="rounded-lg10 bg-layer4 p-3 lg:!px-6">
            {/* Same substitution as the hero — with the capture's `center` here the three
                blocks bunch into the middle instead of spreading, because `.center` beats
                `justify-between`. */}
            <div className="flex items-center justify-between border-b border-solid border-white_alpha10 pb-2">
              <div className="flex justify-around lg:items-center lg:justify-start">
                {/* `<` steps BACK in time and `>` forward, so with the newest finished draw
                    selected by default it is `>` that starts disabled. The capture cannot
                    settle this — it shows both arrows at one shade and only ever one draw —
                    so this is the ordinary reading of a date stepper. */}
                <button
                  type="button"
                  aria-label="Older draw"
                  className="center mr-0.5 size-9 justify-center rounded-md bg-layer3"
                  disabled={at >= data.history.length - 1}
                  onClick={() => pickDraw(data.history[at + 1])}
                >
                  <ChevronIcon className="icon size-4" />
                </button>

                <div className="max-sm:flex-1">
                  <Select
                    value={selected}
                    options={data.history}
                    onChange={pickDraw}
                    className="h-10 w-[10.238rem] gap-2 rounded-lg bg-input_bright bg-layer3 font-extrabold [&>div]:shrink-0"
                    title="Draw"
                  />
                </div>

                <button
                  type="button"
                  aria-label="Newer draw"
                  className="center ml-0.5 size-9 justify-center rounded-md bg-layer3"
                  disabled={at <= 0}
                  onClick={() => pickDraw(data.history[at - 1])}
                >
                  <ChevronIcon className="icon size-4 rotate-180" />
                </button>
              </div>

              {/* No size class in the capture — this inherits the body's 14px. font-semibold
                  is OURS: it was the only unweighted string in the bar, so it read a step
                  lighter than the ticket total beside it. */}
              <p className="font-normal text-secondary">Draw time:{drawnAt}</p>

              <div className="text-sm font-semibold text-secondary">
                <div className="flex items-center justify-start">
                  {/* `shrink-0` is this build's: the capture's bare `w-8` is a flex item and
                      will squeeze below 32px when the row is tight. */}
                  <img className="w-8 shrink-0" alt="ticket" src={ticketCountArt} />
                  <p>Total participated tickets for this round</p>
                  {/* Ungrouped — the capture prints a bare "376448". */}
                  <p className="ml-1.5 font-extrabold text-primary">{results?.participated ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="mb-2.5 mt-0 text-center text-xl font-semibold text-primary lg:!mt-1.5">
              <span>Winner List</span>
            </div>

            {/* `texxt-sm` is the original's typo and is kept — see the file header. */}
            <div className="result-table-wrap texxt-sm text-secondary">
              <div className="flex justify-between border-b border-solid border-third pb-2.5">
                <div className="w-12">No.</div>
                <div className="w-28 text-left lg:w-40">Winner Name</div>
                <div className="w-28 text-center lg:w-72">Ticket Numbers</div>
                <div className="w-28 text-right lg:w-72">Prize</div>
              </div>

              {/* The winner list is its own read, re-run on every draw and every page — so it
                  has a pending arm the page-level one above cannot cover. A row is 40px; five of
                  them is roughly a page, which is what keeps the pager from walking up the screen
                  between pages. */}
              {winnersLoading ? (
                <div className="center h-50">
                  <Loading />
                </div>
              ) : winners.length ? (
                winners.map((winner) => (
                  <WinnerRow key={winner.rank} winner={winner} mobile={!isDesktop} />
                ))
              ) : (
                /* Pages 2..8 of the captured draw, and every other draw in the picker — see
                   the note in services/raffle.js. The pager keeps the draw's own "of 08". */
                <Empty />
              )}

              {/* `mt-3` is the capture's; the shared pager carries its own `mt-4` for the
                  call sites that centre it, so this pulls the extra 4px back. */}
              <div className="-mt-1">
                <Pagination
                  page={page}
                  pages={results?.pages ?? 1}
                  onChange={setPage}
                  align="start"
                  loading={winnersLoading}
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      <div className="" id="raffle-rule">
        {/* `text-white`, not `text-primary`, on both headings on this page — invisible in the
            light theme, and kept. This page's chunk is one of the missing ones so the class came
            off rendered markup, where dark-theme `text-primary` and `text-white` are the same
            pixel; what settles it is Vault Pro, whose chunk WAS recovered and writes exactly this
            on exactly this kind of section heading (see the note there). Same call, same reason. */}
        <p className="my-3 text-left text-lg font-extrabold text-white">Raffle Rules</p>
        <div className="w-full rounded-xl bg-layer4 p-4">
          <div className="mx-auto w-full max-w-full">
            <Accordion id="rules" items={data.rules}>
              {(item) =>
                item.prizes ? <PrizeTable ladder={data.prizeLadder} /> : null
              }
            </Accordion>
          </div>
        </div>
      </div>

      {/* mb-6 is OURS, not the capture's — the same allowance the promotions grid carries for
          the same reason: this is the last block on the page, and without it the FAQ card butts
          straight into the footer. */}
      <div className="mb-6.5">
        <p className="my-3 text-left text-lg font-extrabold text-white">
          Frequently Asked Questions
        </p>
        <div className="mx-auto w-full max-w-full rounded-xl bg-layer4 px-4 pb-5 pt-4">
          <div className="w-full">
            <Accordion id="faq" items={data.faq} />
          </div>
        </div>
      </div>
    </div>
  );
}
