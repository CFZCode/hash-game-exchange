import { request } from './client';
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

export const getHomeContest = () =>
  request(ENDPOINTS.contestList(), {
    fixture: { contest: HOME_CONTEST, standings: HOME_STANDINGS },
  });

export const getDailyContest = () =>
  request(ENDPOINTS.contestList(), {
    fixture: { contest: DAILY_CONTEST, standings: DAILY_STANDINGS },
  });

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
  request(ENDPOINTS.contestRank(), { fixture: { rank: 0, wager: 0 } });

export default getDailyContest;
