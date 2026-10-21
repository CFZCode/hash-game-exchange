import trophyImg from '../../../assets/contest/trophy.png';
import crownImg from '../../../assets/contest/crown.png';
import laurelImg from '../../../assets/contest/laurel.png';
import goldImg from '../../../assets/contest/gold.png';
import silverImg from '../../../assets/contest/silver.png';
import copperImg from '../../../assets/contest/copper.png';
import winnerTicket from '../../../assets/contest/winner-ticket.png';
import championAvatar from '../../../assets/contest/champion-avatar.png';
import { HIDDEN_NAME } from '../../../context/account';
import { useSession } from '../../../context/session';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { useSelectedCurrency } from '../../../hooks/useSelectedCurrency';
import { isFiatCode } from '../../../utils/currency';
import { useResource } from '../../../hooks/useResource';
import React from 'react';
import { claimRacePrize, getContestRank, getRacePrizes, remaining } from '../../../services/contest';
import { toast, toastError } from '../Toast/toast';
import EmptyPlaceholder from '../EmptyPlaceholder';
import { avatarSrc } from '../../../services/avatars';
import DialogShell from '../DialogShell';
import './Contest.css';

/* The wager-contest widget — three summary cards over a standings table.
 *
 * Source: Contest-Uqb1GQAo.js. That chunk was NOT in the saved mirror (it is lazy-loaded and
 * the crawl never triggered it), but Enter-MsmOuq5R.js names it in its `__vite__mapDeps` table,
 * so it could be pulled from the deploy by exact filename along with its five images
 * (gold/silver/copper/trophy/crown). The winner ribbon was base64 inside it.
 *
 * IT IS ONE WIDGET IN TWO PLACES, which is why it lives here rather than beside either of them:
 * the home page's Wager Contest tab and the `/promotions/daily-contest` page render the same
 * thing at the same size. That was verified rather than assumed — measured off the page
 * screenshot at dpr 1.25, the cards come out 2:1:1 on a 12px gap filling the 1216px container,
 * 152px tall (which is `py-7` around a 24px title, `mb-3`, and an `h-15` time box, to the
 * pixel), the plain rows are 40px (`py-3` around `text-xs`) and the podium rows 48.5px, which
 * is the same padding around a `w-5` medal at its own 1.223 aspect. Nothing about the page
 * version is bigger; it only sits in a wider container.
 *
 * The layout is container-relative throughout — `flex-2` beside two `flex-1`, `basis-full`
 * below lg — so neither call site passes a size.
 */

/* `ne` — 1st/2nd/3rd/4th…, and `ve` clamps anything past 50 to "50th+". */
function ordinal(n) {
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n] ?? 'th';
  return `${n}${suffix}`;
}

/* `printCurrency`. The site prints an amount against its currency's own rules: a fiat display
 * currency gets a leading `$` and a fixed 2dp, a crypto gets its ticker after the figure and
 * trailing zeros trimmed. Both captures exercise one branch each and both are reproduced here
 * — the home widget was captured with a USD display currency ("$25,281,075.76") and the daily
 * contest page with BCD ("91,735,608 BCD", "2,253,306.2 BCD").
 *
 * The prize POOL is the exception and takes 2dp either way: the page's headline figure reads
 * "50,000.00 BCD", not "50,000 BCD". */
const grouped = (value, min, max) =>
  Number(value).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });

/* Local, not exported. A file that exports a component may export nothing else or Fast Refresh
   cannot tell what to re-render — the same rule that split `context/session.js` out of
   SessionContext.jsx. Nothing outside needs these; if something ever does, they move to their
   own module rather than being exported from here. */
const money = (value, currency) =>
  currency === 'USD' ? `$${grouped(value, 2, 2)}` : `${grouped(value, 0, 2)} ${currency}`;

const poolMoney = (value, currency) =>
  currency === 'USD' ? `$${grouped(value, 2, 2)}` : `${grouped(value, 2, 2)} ${currency}`;

/* The contest's own currency as a wallet key: a fiat code gets the FIAT suffix. */
const walletKey = (code) => {
  const c = String(code ?? '').toUpperCase();
  return isFiatCode(c) ? `${c}FIAT` : c;
};

/* Every figure in the viewer's SELECTED currency (selected-currency skill), converted from the
   contest's currency; the contest's own formatting above when that currency has no price.
   `pool` keeps the headline's two decimals. */
function useContestMoney(currency) {
  const cur = useSelectedCurrency();
  const src = walletKey(currency);
  return (value, pool = false) =>
    cur.canConvert(src)
      ? cur.show(value, src, { precision: 2, ...(pool ? { minDecimals: 2 } : {}) })
      : pool
        ? poolMoney(value, currency)
        : money(value, currency);
}

/* `le` — the bonus rate arrives as a fraction and is printed to at most 4 decimals. */
const pct = (rate) => `${Math.round(rate * 1e6) / 1e4}%`;

const MEDALS = { 1: goldImg, 2: silverImg, 3: copperImg };

/* `ft` — a medal image for the podium, the plain ordinal for everyone else. */
const Rank = ({ num }) =>
  MEDALS[num] ? (
    <img className="w-5" alt={num === 1 ? 'gold' : 'medal'} src={MEDALS[num]} />
  ) : (
    <div>{ordinal(num)}</div>
  );

/* `L` — one unit of the countdown. h-15 / w-12 with the value over its label. */
const TimeUnit = ({ value, name }) => (
  <div className="center h-15 w-12 flex-col rounded-xl bg-layer2 py-1 font-mono">
    <div className="text-xl font-extrabold text-primary">{String(value).padStart(2, '0')}</div>
    <div className="text-xxs font-semibold">{name}</div>
  </div>
);

const Colon = () => <b className="mx-1 text-2xl font-extrabold text-tertiary">:</b>;

/* `ht` — the status flag. The notch is an inline SVG behind the label rather than a border
   trick, so the point stays sharp at any label length. The spinner only renders when the
   contest is live. */
const StatusFlag = ({ active, children }) => (
  <div className="relative flex h-7 w-20 items-center pl-1 text-xs leading-7 text-primary_brand">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="absolute left-0 top-0 w-20 fill-brand"
      viewBox="0 0 77 28"
    >
      <path d="M0.5 2C0.5 0.895431 1.39543 0 2.5 0H74.2689C75.958 0 76.8865 1.96429 75.8144 3.26948L68.0428 12.7305C67.4367 13.4683 67.4367 14.5317 68.0428 15.2695L75.8144 24.7305C76.8865 26.0357 75.958 28 74.2689 28H2.5C1.39543 28 0.5 27.1046 0.5 26V2Z" />
    </svg>
    {active && (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-4 animate-spin fill-current"
        viewBox="0 0 17 16"
        style={{ animationDuration: '5s' }}
      >
        <path d="M8.49999 10.88C9.05949 10.88 9.51849 11.311 9.56299 11.8595L9.56649 11.947V13.9335C9.56649 14.5225 9.08899 15.0005 8.49949 15.0005C7.93999 15.0005 7.48099 14.5695 7.43649 14.021L7.43299 13.9335V11.947C7.43299 11.358 7.91049 10.88 8.49949 10.88H8.49999ZM6.46349 10.0365C6.85899 10.432 6.87899 11.0615 6.52299 11.4805L6.46349 11.545L5.05899 12.9495C4.64249 13.366 3.96699 13.366 3.55049 12.9495C3.15499 12.554 3.13499 11.9245 3.49099 11.5055L3.55049 11.441L4.95499 10.0365C5.37149 9.62001 6.04699 9.62001 6.46349 10.0365ZM11.981 9.97701L12.0455 10.0365L13.45 11.441C13.8665 11.8575 13.8665 12.533 13.45 12.9495C13.0545 13.345 12.425 13.365 12.006 13.009L11.9415 12.9495L10.537 11.545C10.1205 11.1285 10.1205 10.453 10.537 10.0365C10.9325 9.64101 11.562 9.62101 11.981 9.97701ZM14.433 6.93301C15.022 6.93301 15.5 7.41051 15.5 7.99951C15.5 8.58851 15.022 9.06651 14.433 9.06651H12.4465C11.8575 9.06651 11.3795 8.58901 11.3795 8.00001C11.3795 7.41101 11.857 6.93301 12.446 6.93301H14.4325H14.433ZM4.55349 6.93351C5.14249 6.93351 5.62049 7.41101 5.62049 8.00001C5.62049 8.58901 5.14299 9.06701 4.55399 9.06701H2.56749C1.97849 9.06701 1.50049 8.58951 1.50049 8.00051C1.50049 7.41151 1.97799 6.93351 2.56699 6.93351H4.55349ZM3.55049 3.05001C3.94599 2.65451 4.57549 2.63451 4.99449 2.99051L5.05899 3.05001L6.46349 4.45451C6.87999 4.87101 6.87999 5.54651 6.46349 5.96301C6.06799 6.35851 5.43849 6.37851 5.01949 6.02251L4.95499 5.96301L3.55049 4.55851C3.13399 4.14201 3.13399 3.46651 3.55049 3.05001ZM12.006 2.99101C12.4015 2.59551 13.031 2.57551 13.45 2.93151L13.5145 2.99101C13.91 3.38651 13.93 4.01601 13.574 4.43501L13.5145 4.49951L12.11 5.90401C11.7145 6.29951 11.085 6.31951 10.666 5.96351L10.6015 5.90401C10.206 5.50851 10.186 4.87901 10.542 4.46001L10.6015 4.39551L12.006 2.99101ZM8.49999 1.00001C9.05949 1.00001 9.51849 1.43101 9.56299 1.97951L9.56649 2.06701V4.05301C9.56649 4.64201 9.08899 5.12001 8.49999 5.12001C7.94049 5.12001 7.48149 4.68901 7.43699 4.14051L7.43349 4.05301V2.06701C7.43349 1.47801 7.91099 1.00001 8.49999 1.00001Z" />
      </svg>
    )}
    <div className="ellipsis relative z-10 ml-1 font-extrabold">{children}</div>
  </div>
);


/* MY POSITION — `Jt` in `Contest-Uqb1GQAo.js`, off `hash.game/assets/`, so every class list and
 * string below is the chunk's own.
 *
 * IT IS LOGIN-GATED AT THE WIDGET, not inside itself: `Gt` composes prize pool, time remaining,
 * last champion, then `<Show when={k.login}><Jt/></Show>`, then the table. And `Gt` is the
 * WIDGET rather than the page — the home tab renders it too — so signing in adds this row in
 * both places off one condition, which is the original's arrangement and not a shortcut.
 *
 * BOTH ARMS, and the device decides which. `Jt` branches on `q.mobile` and returns two entirely
 * different templates, so this is a JS split rather than a pair of `lg:` variants: the phone is
 * a name block with the "to reach" line under it over two divided cells, the desktop is four
 * cells in one row with that line as the fourth. `useIsDesktop()` is the `lg` line this project
 * reads `q.mobile` as everywhere.
 *
 * THE EXTRA WRAPPER AROUND "MY POSITION" ON DESKTOP IS THE CHUNK'S. Cells three and four are
 * `center flex-1 flex-col border-l …` directly, while cell two is a bare `flex-1 border-l …`
 * holding a `center flex-1 flex-col`. Kept rather than tidied: the inner `flex-1` is inert
 * inside a block parent and the cell renders as its neighbours do, since a two-line block is
 * the tallest thing in the row either way.
 *
 * `divide-x` / `divide-y` on the phone arm name no divide-colour, and they do not need one on
 * the original: the child which actually receives each border writes `border-third` on itself,
 * against a preflight that would otherwise give it `currentColor` (`*,:before,:after {
 * border-color: currentColor }` in index-DxOqNczA.css, which is what Tailwind v4 does too).
 * That only holds while the border lands on the child v3 puts it on — see the note over `kt`
 * below for why both rules are written out here rather than left to the utility.
 *
 * NOTHING HERE IS INVENTED. All three figures fall out of the account not being in the contest,
 * which is what `getContestRank` returns and what the reference capture shows ("50th+",
 * "$0.00"):
 *
 *   `ve(rank)`  = `rank == 0 || rank > 50 ? "50th+" : ordinal(rank)`, so rank 0 prints 50th+.
 *   `t()`       = the Top N to reach. Unplaced aims at the LAST paying place, the leader at
 *                 itself, everyone else at the rung above them, and anyone past the ladder's
 *                 end at its last rung. It counts `userBonusRate` — the PRIZE LADDER — and not
 *                 the players on the board; the reference reads "Top 10" against ten rungs.
 *   `l()`       = `activeList[t() - 1].wager - wager`, the gap to that place.
 *
 * THE OUT-OF-RANGE GUARD IS THE CHUNK'S AND IT FIRES HERE: `activeList.length > t() - 1`, so a
 * ladder longer than the board yields no target and the figure stays at zero. The home fixture
 * is exactly that — nine captured rows against the live ten-rung ladder — so the home tab reads
 * "To reach Top 10" with "$0.00" beside it. That is a shortfall in that capture, not a
 * rendering choice; the daily-contest fixture has all ten rows and prints the real gap.
 *
 * The two mid-ladder arms of `t()` are written out even though this fixture cannot reach them,
 * because they are the whole of what the card says once an account IS ranked. */
function MyPosition({ contest, standings, show }) {
  const { session } = useSession();
  const isDesktop = useIsDesktop();

  /* `rank` and `wager` are the one part of this widget behind a login. `/activity/contest/
     <type>/rank/` answers 6002 where the other three contest calls answer, so the fixture is
     the store's own declared default — see services/contest.js. Read through the seam rather
     than off `contest`, because on the original it is a separate call that lands late: the
     store opens at zero/zero and `A(b)` overwrites the pair only once `api_rank` resolves. */
  const { data } = useResource(getContestRank);
  const rank = data?.rank ?? 0;
  const wager = data?.wager ?? 0;

  const rungs = contest.userBonusRate.length;
  let top = rungs;
  if (rank === 1) top = 1;
  else if (rank > 1 && rank <= rungs) top = rank - 1;

  const ahead = standings.length > top - 1 ? standings[top - 1] : null;
  const toReach = ahead ? ahead.wager - wager : 0;

  /* `<Show when={e.rank != 1}>` — the leader has nobody to reach. The sentence is one i18n
     value with two element slots, `Wager<1>__wager_number__</1>To reach<3>__top__</3>`, which
     is why the chunk hands <Trans> `["Wager", pe(), "To reach", me()]`: slots 0 and 2 are plain
     text inside the string and only the odd indexes are elements. The spaces between the four
     parts are the two spans' own `mx-1` — there are none in the string.

     THE PILL'S `/40` IS DROPPED, and it is the `w-30` trap rather than a colour choice. The
     chunk writes the pin `bg-[#F6519666]/40` — an eight-digit hex that ALREADY encodes 40%
     alpha, inside a `/40` opacity utility — and on Tailwind v3 the modifier wins outright:
     sampling the reference capture's pill gives rgb(128,65,94) over layer4's #323738, which
     solves to α = 0.398 / 0.385 / 0.404 across the three channels, i.e. a flat 0.4 of #F65196.
     Tailwind v4 compiles the pair through `color-mix` instead and COMPOUNDS them — checked in
     the built CSS, which emits `oklab(67.9006% .208212 -.00510269/.16)` — so writing the class
     as the chunk has it renders the pin at 0.16 and it all but disappears against layer4. The
     bare hex is the same 0.4 by construction. The chunk's own line is quoted above so the swap
     is one edit if v4 ever stops compounding; Tailwind scans comments, so that quote emits its
     own 60 unused bytes, exactly as the `w-30` note in the signed-in header does. */
  const reachLine = rank !== 1 && (
    <div className="text-xs">
      Wager
      <span className="mx-1 text-primary">{show(toReach)}</span>
      To reach
      <span className="mx-1 rounded-xl bg-[#F6519666] px-1.5 font-semibold text-alw_white">
        Top {top}
      </span>
    </div>
  );

  const position = rank === 0 || rank > 50 ? '50th+' : ordinal(rank);

  /* `kt` — the phone template.
   *
   * BOTH RULES ARE WRITTEN OUT RATHER THAN LEFT TO `divide-*`, because that utility CHANGED
   * SIDES between Tailwind v3 and v4 — the same flip Footer.css documents, and here it broke
   * the card twice over:
   *
   *   v3 (the original):  & > * + *             { border-top / border-left }
   *   v4 (ours):          & > :not(:last-child) { border-bottom / border-inline-end }
   *
   * WRONG PLACE. The chunk's `mt-4 … pt-4` puts 16px above the rule and 16px below it, because
   * on v3 the border belongs to the second child and a margin sits outside a border box. On v4
   * the rule lands on the FIRST child's bottom edge instead, so it drew hard against the "to
   * reach" line with all 32px underneath it. Same story across the two cells: v4 put the
   * vertical rule on the My Position cell's trailing edge, before the `ml-4`, rather than on the
   * Wager cell's leading edge between the two 16px insets that centre it.
   *
   * WRONG COLOUR, and this is why the fix is not simply `divide-third`. Neither call site names
   * a divide-colour — the original does not need one, because the child that receives each
   * border writes `border-third` on ITSELF. Under v4 the border moves to a child that does not,
   * so both rules fell back to the preflight's `currentColor` and painted in the row's own text
   * colour: a pale, obviously-too-bright hairline where the site draws `#e4eaf019`.
   *
   * The footer restates v3 in CSS so its markup can keep the original's classes; that needs a
   * class to hang the rule on and this card has none, so the two borders are written at the call
   * site instead. Same rendering, and `border-third` is already on both elements that take one. */
  if (!isDesktop) {
    return (
      <div className="rounded-xl bg-layer4 p-4">
        <div className="flex">
          <img className="mr-2 h-10 w-10 rounded-full" alt="user avatar" src={avatarSrc(session?.avatar)} />
          <div>
            <div className="text-base font-extrabold text-primary">{session.name}</div>
            {reachLine}
          </div>
        </div>
        <div className="mt-4 flex border-t border-third pt-4">
          <div className="center flex-1 flex-col">
            <div>My Position</div>
            <div className="text-base font-extrabold text-brand">{position}</div>
          </div>
          <div className="center ml-4 flex-1 flex-col border-l border-third pl-4">
            <div>Wager</div>
            <div className="text-base font-extrabold text-brand">{show(wager)}</div>
          </div>
        </div>
      </div>
    );
  }

  /* `Ht` — the desktop template. Four equal cells, the name on the left with no border and a
     divider before each of the other three. */
  return (
    <div className="flex rounded-xl bg-layer4 p-4">
      <div className="center flex-1">
        <img className="mr-2 h-10 w-10 rounded-full" alt="user avatar" src={avatarSrc(session?.avatar)} />
        <div className="font-extrabold text-primary">{session.name}</div>
      </div>
      <div className="flex-1 border-l border-solid border-third">
        <div className="center flex-1 flex-col">
          <div>My Position</div>
          <div className="mt-1 text-base font-extrabold text-brand">{position}</div>
        </div>
      </div>
      <div className="center flex-1 flex-col border-l border-solid border-third">
        <div>Wager</div>
        <div className="mt-1 text-base font-extrabold text-brand">{show(wager)}</div>
      </div>
      <div className="center flex-1 flex-col border-l border-solid border-third">{reachLine}</div>
    </div>
  );
}

/* The live board sends the instant the window closes (`endsAt`), so the clock ticks down to it;
   a payload without one (the fixtures) keeps its static h/m/s. */
function useTimeLeft(contest) {
  const { endsAt } = contest;
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!endsAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt ? remaining(endsAt, now) : contest;
}

export default function Contest({ contest, standings = [] }) {
  const show = useContestMoney(contest.currency);
  const left = useTimeLeft(contest);
  const { session } = useSession();
  const [historyOpen, setHistoryOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-3 text-secondary">
      <div className="flex flex-wrap gap-3">
        {/* Prize pool. flex-2 next to two flex-1 siblings is what makes it the wide one,
            and basis-full drops it onto its own line below lg. */}
        <div className="center flex flex-2 basis-full overflow-hidden rounded-xl bg-gradient-to-r from-brand/20 from-0% to-layer4 to-60% py-4 lg:basis-0">
          <img className="relative left-12 w-28 shrink-0 sm:left-32" alt="trophy" src={trophyImg} />
          <div className="center ml-6 flex flex-1 flex-col">
            {/* The laurels are one asset used twice, the right one mirrored by -scale-x-100
                — confirmed by the two <img> srcs being byte-identical. This is laurel.png,
                NOT crown.png: the gold crown belongs to the champion avatar below, and had
                been standing in here where the original draws green branches. */}
            <div className="flex text-base font-extrabold text-brand">
              <img className="w-6" alt="" src={laurelImg} />
              <span>{contest.title}</span>
              <img className="w-6 -scale-x-100" alt="" src={laurelImg} />
            </div>
            <div className="my-1 font-semibold">Contest prize pool</div>
            <div className="overflow-hidden text-nowrap rounded-xl bg-layer2 px-3 py-2 text-center font-mono text-2xl font-extrabold text-brand">
              {show(contest.prizePool, true)}
            </div>
          </div>
        </div>

        <div className="flex-1 rounded-xl bg-layer4 py-6 sm:py-7">
          <div className="mb-3 text-center text-base font-extrabold text-brand">Time Remaining</div>
          {/* Static for the fixture capture (a remaining h/m/s, no end instant); the live board
              sends `endsAt` and `useTimeLeft` ticks down to it. */}
          <div className="center flex">
            <TimeUnit value={left.hours} name="Hour" />
            <Colon />
            <TimeUnit value={left.minutes} name="Minute" />
            <Colon />
            <TimeUnit value={left.seconds} name="Second" />
          </div>
        </div>

        <div className="relative flex-1 rounded-xl bg-layer4 py-6 sm:py-7">
          {/* The corner ribbon: an image with the word rotated -42deg over it. */}
          <div className="absolute left-0 top-0 w-18 font-extrabold text-primary_brand">
            <img className="absolute -left-0.5 -top-0.5 w-16" alt="winner ticket" src={winnerTicket} />
            <div className="w-full translate-x-[-22%] translate-y-1/2 rotate-[-42deg] text-center">
              Winner
            </div>
          </div>

          {/* `.icon` carries fill: currentColor, so this inherits the wrapper's
              text-secondary — #B3BEC1, which is what the live icon measures. The stand-in
              path that stood here was a different glyph and hard-coded fill-tertiary. */}
          <svg
            viewBox="0 0 32 32"
            className="icon absolute right-2.5 top-2.5 h-4.5 w-4.5 cursor-pointer"
          >
            <path d="M16.0001 4C22.6276 4 28.0003 9.37263 28.0003 16.0001C28.0003 22.6276 22.6276 28.0003 16.0001 28.0003C9.37263 28.0003 4 22.6276 4 16.0001C4 9.37263 9.37263 4 16.0001 4ZM16.0001 6.57146C10.7929 6.57146 6.57146 10.7929 6.57146 16.0001C6.57146 21.2073 10.7929 25.4288 16.0001 25.4288C21.2073 25.4288 25.4288 21.2073 25.4288 16.0001C25.4288 10.7929 21.2073 6.57146 16.0001 6.57146ZM15.9607 21.0711C16.6704 21.0711 17.2464 21.6471 17.2464 22.3568C17.2464 23.0665 16.6704 23.6425 15.9607 23.6425C15.251 23.6425 14.675 23.0665 14.675 22.3568C14.675 21.6471 15.251 21.0711 15.9607 21.0711ZM16.187 8.99463C17.5242 8.99463 18.6145 9.34435 19.4373 10.0849C20.2602 10.8049 20.6716 11.7924 20.6716 13.0472C20.6716 14.0758 20.4042 14.9193 19.9105 15.5776C19.7253 15.7833 19.1287 16.3387 18.1413 17.2027C17.771 17.5113 17.5036 17.861 17.3184 18.2313C17.1419 18.5836 17.0416 18.9513 17.0159 19.3602L17.0099 19.5685V19.8565H14.6441V19.5685C14.6441 18.7867 14.7676 18.1079 15.0556 17.5524C15.3084 17.0279 16.0379 16.2281 17.2447 15.1353L17.4624 14.9398L17.7093 14.6518C18.0796 14.1993 18.2647 13.7055 18.2647 13.1912C18.2647 12.5124 18.059 11.9775 17.6887 11.5867C17.2979 11.1958 16.7424 11.0107 16.043 11.0107C15.1378 11.0107 14.5001 11.2781 14.1093 11.8541C13.7913 12.2844 13.6267 12.8844 13.5993 13.6387L13.595 13.8701H11.2498C11.2498 12.3478 11.6818 11.1547 12.587 10.2906C13.4715 9.42663 14.6647 8.99463 16.187 8.99463Z" />
          </svg>

          <div className="center mb-4 text-base font-extrabold text-brand">Last Champion</div>
          <div className="center ml-5 flex">
            <div className="relative mr-2 mt-3">
              <img className="absolute -top-3 left-1 w-8" alt="crown" src={crownImg} />
              <img className="h-10 w-10 rounded-full" alt="user avatar" src={championAvatar} />
            </div>
            {/* No settled race yet: the site's own empty line, not "Profit(0%) 0 USDT". */}
            {!contest.champion.player ? (
              <div className="text-xs font-semibold text-quarterary">Stay tuned-something's coming!</div>
            ) : (
            <div className="text-xs font-semibold">
              <div className="text-primary">{contest.champion.player}</div>
              <div className="profit-name">
                Profit<span className="ml-1 text-primary">({pct(contest.champion.rate)})</span>
              </div>
              <div className="profit">
                <span className="text-brand">{show(contest.champion.totalBonus)}</span>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* `<Show when={k.login}><Jt/></Show>` in `Gt`, in its own place in the widget's order
          — between Last Champion and the table, as a direct child of the root, so the root's
          own `gap-3` is the 12px above and below it. Nothing else moves when it appears. */}
      {session.login && (
        <MyPosition contest={contest} standings={standings} show={show} />
      )}
      {session.login && <RacePrizes />}

      {/* overflow-hidden is what makes the rounded-xl read at the BOTTOM. The zebra stripe
          is `even:` and the header row is child 1, so rank 1 lands on child 2 and every odd
          rank is striped — including the last row. Without clipping, that row's
          bg-layer5-table paints a square rectangle over both bottom corners and the radius
          only survives at the top, where the header row leaves bg-layer4 showing. */}
      <div className="overflow-hidden rounded-xl bg-layer4 pt-3">
        <div className="flex items-center justify-between border-b border-third pb-3">
          <StatusFlag active={contest.active}>{contest.active ? 'Active' : 'Ended'}</StatusFlag>
          <div className="ml-4 font-extrabold text-primary sm:ml-6">
            {contest.start} ~ {contest.end}
          </div>
          {/* No px-* here on purpose. `.button` already declares padding: 0 0.5rem, and that
              default is what puts this at the measured 83.76 x 32:

                "History"  6757 units - 63 kerning, at 14px extrabold = 45.760px
                padding 16 + gap-1.5 6 + size-4 16 + 45.760            = 83.760px

              An added px-3 made it 24 + 6 + 16 + 45.760 = 91.76. */}
          <button
            type="button"
            className="button center mr-3 h-8 gap-1.5 rounded-md bg-button_bright font-extrabold text-primary"
            onClick={() => setHistoryOpen(true)}
          >
            <span>History</span>
            <svg viewBox="0 0 32 32" className="size-4 rotate-180 fill-secondary">
              <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
            </svg>
          </button>
        </div>

        {/* `.table` is table-layout: fixed with per-column alignment, so no width classes
            are needed on the cells — only the rank column is sized, by the `w-14 sm:w-16`
            on its own td. */}
        <table className="table text-xs [&_td]:px-2 [&_td]:py-3">
          <tbody>
            <tr className="list-head item">
              <td className="w-14 !text-center font-semibold sm:w-16">#</td>
              <td className="font-semibold">Player</td>
              <td className="font-semibold">Wager</td>
              <td className="!text-center font-semibold">Prize</td>
            </tr>
            <StandingRows standings={standings} show={show} />
          </tbody>
        </table>
      </div>

      {historyOpen && (
        /* `bt` in the chunk: a `w-[30rem]` dialog titled with the previous window's dates over
           the same rows, `isHistory` striping odd rows instead of even. */
        <DialogShell title={contest.prev?.start ? `${contest.prev.start} ~ ${contest.prev.end}` : 'History'} onClose={() => setHistoryOpen(false)} size="lg:!w-[30rem]">
          {!contest.prev?.standings?.length ? <EmptyPlaceholder /> : (
          <table className="table text-xs [&_td]:px-2 [&_td]:py-3">
            <tbody>
              <tr className="list-head item">
                <td className="w-14 !text-center font-semibold">#</td>
                <td className="font-semibold">Player</td>
                <td className="font-semibold">Wager</td>
                <td className="!text-center font-semibold">Prize</td>
              </tr>
              <StandingRows standings={contest.prev?.standings ?? []} show={show} history />
            </tbody>
          </table>
          )}
        </DialogShell>
      )}
    </div>
  );
}

/* The player's own race prizes: a settled race writes each winner a claimable row and pays
   nothing until it is claimed (`POST /user/race/rewards/:id/claim`). Drawn only when there is
   at least one, so a player who never placed sees no extra card. */
function RacePrizes() {
  const { refreshBalances } = useSession();
  const [reloads, setReloads] = React.useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reloads is the re-read trigger
  const read = React.useCallback(() => getRacePrizes(), [reloads]);
  const { data } = useResource(read);
  const [pending, setPending] = React.useState(null);
  const rows = Array.isArray(data) ? data : [];
  const show = useContestMoney(rows[0]?.currency ?? 'USDT');
  if (!rows.length) return null;

  const claim = async (row) => {
    if (pending) return;
    setPending(row.id);
    try {
      const paid = await claimRacePrize(row.id);
      toast.success(`Claimed ${show(Number(paid?.amount ?? row.amount))}`);
      refreshBalances?.();
    } catch (failure) {
      toastError(failure, 'That prize could not be claimed.');
    } finally {
      setPending(null);
      setReloads((n) => n + 1);
    }
  };

  return (
    <div className="rounded-xl bg-layer4 p-4">
      <div className="mb-2 text-base font-extrabold text-primary">My Prizes</div>
      {rows.map((row, i) => (
        <div key={row.id} className={`flex items-center gap-3 py-2${i ? ' border-t border-third' : ''}`}>
          <div className="flex-1 text-xs">
            <div className="font-semibold text-primary">Rank {row.rank}</div>
            <div>{row.raceStartsAt ? new Date(row.raceStartsAt).toLocaleDateString('en-US') : ''}</div>
          </div>
          <div className="whitespace-nowrap font-extrabold text-brand">{show(Number(row.amount))}</div>
          {row.claimed ? (
            <div className="w-20 text-center text-xs font-semibold text-tertiary">Claimed</div>
          ) : (
            <button
              type="button"
              disabled={pending != null}
              onClick={() => claim(row)}
              className="button button-brand h-8 w-20 rounded-md !font-extrabold"
            >
              Claim
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function StandingRows({ standings, show, history = false }) {
  return standings.map((row) => {
    /* The API's sentinel for a private player is the same `****` the bet feed and
       Recent Big Wins use, so it comes from context/account.js rather than being a
       literal here. A hidden row is NOT just a different string — it is a step
       dimmer, `quarterary` against the others' white; sampling the capture puts it
       at #A1ABAF where a named player is pure #FFFFFF. */
    const hidden = row.player === HIDDEN_NAME;
    return (
      <tr key={row.rank} className={`font-semibold ${history ? 'odd:bg-black_alpha5 odd:dark:bg-white_alpha5' : 'even:bg-layer5-table'}`}>
        <td className={`center flex w-14 ${history ? '' : 'sm:w-16'}`}>
          <Rank num={row.rank} />
        </td>
        <td className={`ellipsis ${hidden ? 'text-quarterary' : 'text-primary'}`}>
          {hidden ? 'Hidden' : row.player}
        </td>
        <td className="whitespace-nowrap text-brand">{show(row.wager)}</td>
        <td className="!text-center">
          <span className="whitespace-nowrap text-brand">
            {show(row.bonus)}
          </span>
          <span className="ml-1">({pct(row.rate)})</span>
        </td>
      </tr>
    );
  });
}
