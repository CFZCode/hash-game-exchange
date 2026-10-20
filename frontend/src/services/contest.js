import { emptyIfAgentBlocked, isAgentBlocked, request, USE_FIXTURES } from './client';
import ENDPOINTS from './endpoints';
import { CONTEST as HOME_CONTEST, STANDINGS as HOME_STANDINGS } from '../pages/Home/LatestBets/contest';
import { CONTEST as DAILY_CONTEST, STANDINGS as DAILY_STANDINGS } from '../pages/DailyContest/contest';

/* The wager contest, in the three reads the widget makes.
 *
 * THE PATHS ARE THE REAL ONES NOW. This file used to open with a note saying the contest chunk
 * had been pulled from the deploy but that "a chunk carries markup, not requests", so the
 * endpoint was invented. That was a pass that only went looking for markup:
 * `Contest-Uqb1GQAo.js` declares its own request module at the top —
 * `G = {api_info, api_list, api_rank, api_prev}` — and every path is written out there. See
 * ENDPOINTS.contest* for the four and for which of them answer.
 *
 * TWO READS, ONE FEED, still. On the live site the home tab and the daily-contest page show the
 * same contest, and these will collapse into one call the moment the fixtures come off. They
 * are separate today because the two captures were taken on different days under different
 * display currencies, and picking one would mean showing invented data in the other place. The
 * split lives here, in the service, precisely so neither component knows about it.
 */

/* ── LIVE: THE PLATFORM'S DAILY RACE ───────────────────────────────────────────────────────────
 *
 * The SmartBet backend's `race` module is the same product — a prize pool paid out down a rank
 * ladder for the most wagered in a window — so on the live path both call sites read it:
 *
 *   GET /user/race                      both races' configs, enabled or not, with the pool and
 *                                       the per-rank payout ladder (`payout.ranks`)
 *   GET /user/race/daily/leaderboard    the running race: window, pool, paid rows and, with a
 *                                       token, `me` — the caller's own rank
 *   GET /user/race/daily/last           the PREVIOUS window's board (hash.game's `<type>/last/`):
 *                                       its rank 1 is the Last Champion card and the whole list
 *                                       is the History dialog — it answers for a switched-off
 *                                       race too, ranked from the same wagers as the live board
 *
 * WHEN NO RACE IS RUNNING the leaderboard answers 404 (`RACE_NOT_RUNNING`, `RACE_NO_ACTIVE_RACE`,
 * `RACE_NOT_CONFIGURED`). That is a normal state, not a failure, so it renders the widget's own
 * idle form — the configured pool, "Ended", 00:00:00 and an empty table — rather than throwing
 * (the page's only other arm is its spinner, which would spin forever). A real 5xx still throws.
 *
 * Mapped onto the fixture's own field names, so the widget does not know which source it has:
 * `wager` is the row's `usdWagered`, `bonus` its `payout` (the reward-currency amount) and
 * `rate` its `percentage` as a fraction. The masked `name` the board sends is printed as is. */
const RACE = {
  configs: '/api/v1/user/race',
  leaderboard: (type) => `/api/v1/user/race/${type}/leaderboard`,
  last: (type) => `/api/v1/user/race/${type}/last`,
};

const IDLE_CODES = ['RACE_NOT_RUNNING', 'RACE_NO_ACTIVE_RACE', 'RACE_NOT_CONFIGURED'];
const idle = (error) => error?.status === 404 || IDLE_CODES.includes(error?.code);

const num = (value) => Number(value) || 0;
const day = (instant) =>
  instant ? new Date(instant).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '';

export function remaining(endsAt, now = Date.now()) {
  const left = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000)) || 0;
  return { hours: Math.floor(left / 3600), minutes: Math.floor((left % 3600) / 60), seconds: left % 60 };
}

const toStandings = (rows) =>
  (rows ?? []).map((row) => ({
    rank: Number(row.rank),
    player: row.name ?? '',
    wager: num(row.usdWagered),
    bonus: num(row.payout),
    rate: num(row.percentage) / 100,
  }));

/** Exported for the verification script: `(config, board|null, last|null) -> {contest, standings}`. */
export function toContest({ title, config, board, last }) {
  const ranks = config?.payout?.ranks ?? [];
  const prev = toStandings(last?.leaderboard);
  /* hash.game's Last Champion is `prevList[0]`: the previous window's #1, whoever is viewing. */
  const champ = prev[0];

  const contest = {
    title,
    currency: board?.payoutCurrency ?? config?.payout?.currency ?? config?.currency ?? '',
    prizePool: num(board?.payoutPrizePool ?? config?.payout?.prizePool ?? config?.prizePool),
    /* No prize ladder (pool 0, or the unofficial board of a switched-off race): still `winnerCount`
       places to race for, so "To reach Top N" names a real place rather than "Top 0". */
    userBonusRate: ranks.length
      ? ranks.map((r) => num(r.percentage) / 100)
      : Array.from({ length: num(board?.winnerCount ?? config?.winnerCount) }, () => 0),
    active: Boolean(board),
    /* The instant the window closes; the widget ticks its countdown off it. */
    endsAt: board?.endsAt ?? null,
    ...(board ? remaining(board.endsAt) : { hours: 0, minutes: 0, seconds: 0 }),
    start: day(board?.startsAt ?? last?.startsAt),
    end: day(board?.endsAt ?? last?.endsAt),
    champion: champ
      ? { player: champ.player, rate: champ.rate, totalBonus: champ.bonus }
      : { player: '', rate: 0, totalBonus: 0 },
    /* The History dialog: the previous window, as hash.game's `bt` draws `prevList`. */
    prev: { start: day(last?.startsAt), end: day(last?.endsAt), standings: prev },
  };

  return { contest, standings: toStandings(board?.leaderboard) };
}

function readBoard(type) {
  return request(RACE.leaderboard(type), { live: true }).catch((error) => {
    if (idle(error) || isAgentBlocked(error)) return null;
    throw error;
  });
}

/* The board always answers now (backend race.service `leaderboard`, owner 2026-10-19): a
   switched-off race still ranks the current day's wagers, with a 0 pool and no prizes. So the
   board is read whenever the race is configured, and `enabled` (rides on the result so a call site
   can hide a race that has no board) is "there is a board". */
function liveContest(title, type = 'daily') {
  return Promise.resolve(request(RACE.configs, { live: true }))
    .catch(emptyIfAgentBlocked([]))
    .then((configs) => {
      const config = (configs ?? []).find((c) => c.type === type);
      return Promise.all([
        config?.configured === false ? null : readBoard(type),
        config?.configured === false ? null : request(RACE.last(type), { live: true }).catch(() => null),
      ]).then(([board, last]) => {
        const out = toContest({ title, config, board, last });
        return { ...out, contest: { ...out.contest, enabled: Boolean(board) } };
      });
    });
}

export const getHomeContest = () =>
  USE_FIXTURES
    ? request(ENDPOINTS.contestList(), {
        fixture: { contest: HOME_CONTEST, standings: HOME_STANDINGS },
      })
    : liveContest(HOME_CONTEST.title);

export const getDailyContest = () =>
  USE_FIXTURES
    ? request(ENDPOINTS.contestList(), {
        fixture: { contest: DAILY_CONTEST, standings: DAILY_STANDINGS },
      })
    : liveContest(DAILY_CONTEST.title);

/* THE VISITOR'S OWN POSITION — and the fixture is the store's own declared default, which is
 * the fourth time checking for one has supplied a login-gated payload (after `/bonus`'s reward
 * list, the referral dashboard and My Profile).
 *
 * `/activity/contest/<type>/rank/` is the one call of the four that does NOT answer on
 * hash.game — 6002, probed — which is exactly right: the standings are a public leaderboard
 * and a visitor's place in them is not. So there is nothing to capture. What there IS is the
 * store's own literal in the chunk, which opens `{… rank: 0, wager: 0}` and only overwrites the
 * pair once `api_rank` returns:
 *
 *   function f(m) { if (yield $e(), g()) { const b = yield G.api_rank(m); A(b) } }
 *
 * — `g()` being the login test. And zero/zero is precisely what the reference capture renders:
 * "50th+" over "$0.00", with the whole row's point being the distance still to travel. So a
 * shut endpoint costs this row nothing and nothing here is invented.
 *
 * `wager` is a bare number rather than the response's string, matching how the two fixtures
 * above already store theirs; `oe` in the chunk parseFloats every one of these on the way in.
 */
export const getContestRank = () =>
  USE_FIXTURES
    ? request(ENDPOINTS.contestRank(), { fixture: { rank: 0, wager: 0 } })
    : /* Live: the same board read, signed — `me` is null when the caller has not wagered into
         this race, which is the store's own zero/zero ("50th+", "$0.00"). */
      readBoard('daily').then((board) => ({
        rank: Number(board?.me?.rank) || 0,
        wager: num(board?.me?.usdWagered),
      }));

export default getDailyContest;
