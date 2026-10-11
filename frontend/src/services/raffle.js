import { request } from './client';
import ENDPOINTS from './endpoints';
import { EARN_METHODS, FAQ, JACKPOT, PRIZE_LADDER, RULES } from '../pages/WeeklyRaffle/raffle';
import { DRAW_TOTALS, ROUND, TICKER, WINNERS } from '../pages/WeeklyRaffle/winners';

/* The weekly raffle — `/promotions/weekly-raffle`.
 *
 * Both endpoint paths are INVENTED, not read. Unlike the deposit bonus, whose service chunk
 * survived in the mirror and named its calls, nothing here did: the page chunk is missing
 * and no raffle request was ever captured. They are grouped in endpoints.js under the
 * heading that says so, and will need correcting against the real backend.
 *
 * THE SCHEDULE IS COMPUTED, NOT PINNED, the same way the deposit bonus's month reset is.
 * The page states its own rule — "Weekly raffle draws every Monday at 12:00:00 UTC" — and
 * the capture agrees with it to the second: the header's game id was 20260817120000 and the
 * results picker's default 20260810120000, which are exactly the Monday after and the
 * Monday before the day the page was captured, and the printed countdown (6d:2h:37m:19s)
 * is the gap to the first of those. So the ids and the countdown are derived from the rule
 * and keep running instead of freezing on the capture date.
 */

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** The draw instant for the Monday 12:00:00 UTC at or before `at`. */
function drawAtOrBefore(at) {
  const d = new Date(at);
  /* getUTCDay: 0 Sun .. 6 Sat, so Monday is 1. */
  const back = (d.getUTCDay() + 6) % 7;
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back, 12, 0, 0, 0);
  return monday <= at ? monday : monday - WEEK;
}

/** `20260817120000` — the id the page prints, which is the draw instant in UTC. */
export function drawId(instant) {
  const d = new Date(instant);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

/** The inverse — a draw id back to the instant it names, for the "Draw time" line. */
export function drawInstant(id) {
  return Date.UTC(+id.slice(0, 4), +id.slice(4, 6) - 1, +id.slice(6, 8), +id.slice(8, 10), +id.slice(10, 12), +id.slice(12, 14));
}

export const getRaffle = (now = Date.now()) => {
  const previous = drawAtOrBefore(now);
  const next = previous + WEEK;
  /* The picker lists finished draws, newest first. `pages` is how many pages of winners the
     captured draw had; the count of past draws offered is this project's own choice. */
  const history = Array.from({ length: 8 }, (_, i) => drawId(previous - i * WEEK));

  return request(ENDPOINTS.raffle.current, {
    fixture: {
      currentId: drawId(next),
      drawsAt: next,
      jackpot: JACKPOT,
      ticketsSent: ROUND.ticketsSent,
      ticker: TICKER,
      earnMethods: EARN_METHODS,
      rules: RULES,
      prizeLadder: PRIZE_LADDER,
      faq: FAQ,
      history,
    },
  });
};

/* Winners for one draw, one page.
 *
 * ONLY PAGE 1 OF THE CAPTURED DRAW EXISTS. The live pager reads "01 of 08" and the other
 * seven pages were never opened, so they resolve to an empty list and the table renders the
 * site's empty state. That is deliberate: `pages` stays at the captured 8 because it is the
 * draw's own figure, and padding it out with invented winners would be worse than an honest
 * gap. Any draw other than the captured one is empty for the same reason. */
export const getRaffleWinners = ({ drawId: id, page = 1 } = {}) =>
  request(ENDPOINTS.raffle.winners, {
    fixture: {
      drawId: id,
      page,
      pages: DRAW_TOTALS.pages,
      pageSize: DRAW_TOTALS.pageSize,
      participated: DRAW_TOTALS.participated,
      winners: page === 1 ? WINNERS : [],
    },
  });

/* MY TICKETS — the signed-in half of the page, and every value below is the STORE'S OWN DECLARED
 * INITIAL STATE rather than an invention. `Je` in `index-BLT5gN04.js` is the whole literal:
 *
 *   _e = { goals: 0, dayUse: !1 }                                        // progress
 *   Ae = { totalTicket: 0, totalWinningTicket: 0, totalWinningAmount: 0 } // statistics
 *   oe = { page: 1, pageSize: 20, total: 0, totalPage: 0, list: [] }      // either ticket list
 *   Je = { …, progress: _e, statistics: Ae, runningTickets: oe, pastwinTickets: oe,
 *          periodTicketCount: 0, round: 0, winningRound: 0, roundLoading: !1 }
 *
 * which is the fourth time checking for one of these has supplied a login-gated fixture — after
 * `/bonus`, the referral dashboard and My Profile. `POST /raffleDeal/myTickets/` is authenticated
 * and answers nothing here, and the defaults ARE the empty page: three zero statistics over an
 * empty list, which is what the phone capture of a fresh account shows.
 *
 * `round` and `winningRound` stay 0 deliberately. The Past and My Winnings panes each draw a draw
 * picker only when their round is set (`<Show when={e()===1 && r.round>0}>`), so with nothing
 * fetched they render the bare empty state — again what the capture shows. */
const EMPTY_TICKET_LIST = { page: 1, pageSize: 20, total: 0, totalPage: 0, list: [] };

export const getRaffleTickets = () =>
  request(ENDPOINTS.raffle.myTickets, {
    fixture: {
      progress: { goals: 0, dayUse: false },
      statistics: { totalTicket: 0, totalWinningTicket: 0, totalWinningAmount: 0 },
      runningTickets: EMPTY_TICKET_LIST,
      pastwinTickets: EMPTY_TICKET_LIST,
      periodTicketCount: 0,
      round: 0,
      winningRound: 0,
    },
  });

/* `He` — the wager figure the Active pane prints, ported whole because the arithmetic is not
 * what it looks like:
 *
 *   function He(e) {
 *     const n = e.goals, r = new Decimal(e.dayUse ? 1000 : 100),
 *           a = r.sub(n).todp(0).div(r), c = r;
 *     return { wager: r.mul(a).todp(0), total: c }
 *   }
 *
 * `a` is the REMAINING FRACTION of the target, so `wager` is what is still to be wagered rather
 * than the target itself — they coincide at `goals: 0`, which is the only state this build has.
 * `dayUse` switches the target from the daily $100 to the $1,000 that earns an extra ticket, and
 * `todp(0)` truncates to whole units at both steps. */
export function wagerProgress(progress = { goals: 0, dayUse: false }) {
  const target = progress.dayUse ? 1000 : 100;
  const remaining = Math.trunc(target - (progress.goals || 0));
  return { wager: Math.trunc(target * (remaining / target)), total: target };
}

export default getRaffle;
