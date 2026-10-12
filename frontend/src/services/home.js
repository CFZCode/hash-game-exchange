import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { toBetRow } from './betHistory';
import { getOriginals, slugFor } from './originals';
import { publicGates } from './gates';
import { getCasinoSet, toCatalogGame } from './catalog';
import { assetExact } from '../utils/gameArt';
import { HIDDEN_NAME } from '../context/account';
import { originals, originalsLink } from '../pages/Home/GameSection/originals';
import {
  hotGames,
  hotGamesLink,
  exclusive,
  exclusiveLink,
  slots,
  slotsLink,
  liveCasino,
  liveCasinoLink,
  bingo,
  bingoLink,
} from '../pages/Home/GameSection/sections';
import { bets } from '../pages/Home/LatestBets/bets';
import { bigWinsByTab, vipTier, displayName } from '../pages/Home/RecentBigWins/data';
import { draws } from '../pages/Home/LotteryDraws/draws';
import { matches } from '../pages/Home/Highlights/matches';

/* The home page's data.
 *
 * WHAT BELONGS HERE AND WHAT DOES NOT. A service returns a PAYLOAD — the thing a backend would
 * send. It does not format, sort or look anything up. That is why `formatAmount`, `vipTier`,
 * `gameIcon`, `themeFor` and `flagFor` stay in their own modules and are still imported
 * directly by the components that use them: they are view logic that happens to live beside a
 * fixture, and moving them here would mean the API swap deletes code that has nothing to do
 * with the API.
 *
 * The fixtures are still imported from where they were, rather than being moved under
 * `services/`. They carry long provenance comments tying each one to the captured response it
 * came from, and those comments are worth more sitting next to the component they describe
 * than filed under a folder named for the transport. When the API lands the imports below are
 * what get deleted; nothing else moves.
 */

/* Grouped the way `edge/game/home/recommend/batch/selections/` returns them — one object of
   selections, each with its rows and its "view all" link — rather than as ten loose exports.
   That is both the real endpoint's shape and the reason Home no longer needs ten imports. */
const HOME_SECTIONS = {
  originals: { games: originals, link: originalsLink },
  hotGames: { games: hotGames, link: hotGamesLink },
  exclusive: { games: exclusive, link: exclusiveLink },
  slots: { games: slots, link: slotsLink },
  liveCasino: { games: liveCasino, link: liveCasinoLink },
  bingo: { games: bingo, link: bingoLink },
};

export const getHomeSections = () => {
  if (USE_FIXTURES) return request(ENDPOINTS.homeSelectionBatch, { fixture: HOME_SECTIONS });
  return readLiveSections();
};

/* LIVE: each row from the SmartBet catalogue (`services/catalog.js`), in the row shape
   GameSection reads — `{slug, fullName, icon, onlineUsers}` — under the same links. BC Originals
   is the in-house list; Hot Games, Slots and Live Casino are the operator's curated collections
   (`hot`, `popular-slots`, `live-casino`); All Bingo Games is a name search. BC Exclusive has no
   platform source and is empty. No row carries a player count, so `onlineUsers` is left out
   and the tile omits it. A row that fails reads as empty rather than blanking the page. */
const HOME_ROW = 10;
const COLLECTION = (name) => `/api/v1/casino/games/collections/${name}`;

const toHomeRow = (game) => ({ slug: game.slug, fullName: game.name, icon: game.image, onlineUsers: undefined });

const liveList = (read) => Promise.resolve(read()).catch(() => []);

function readLiveSections() {
  const collection = (name) =>
    liveList(() =>
      Promise.resolve(request(COLLECTION(name), { live: true, params: { limit: HOME_ROW }, fixture: [] })).then(
        (rows) => (rows ?? []).map(toCatalogGame).map(toHomeRow),
      ),
    );

  return Promise.all([
    liveList(() =>
      Promise.resolve(getOriginals()).then((games) =>
        (games ?? []).map((game) => ({ slug: game.slug, fullName: game.name, icon: assetExact(game.slug), onlineUsers: undefined })),
      ),
    ),
    collection('hot'),
    collection('popular-slots'),
    collection('live-casino'),
    liveList(() => Promise.resolve(getCasinoSet('bingo', { limit: HOME_ROW })).then((games) => (games ?? []).map(toHomeRow))),
  ]).then(([originalsRow, hot, slotsRow, live, bingoRow]) => ({
    originals: { games: originalsRow, link: originalsLink },
    hotGames: { games: hot, link: hotGamesLink },
    exclusive: { games: [], link: exclusiveLink },
    slots: { games: slotsRow, link: slotsLink },
    liveCasino: { games: live, link: liveCasinoLink },
    bingo: { games: bingoRow, link: bingoLink },
  }));
}

/* The component keeps 30 rows and shows 10 at a time (`[...r].reverse().slice(0, D)`, D = 30),
   so 30 is what is asked for. The platform's own cap on this route is 100. */
const LIVE_BETS = 30;

/* ── LATEST BETS IS LIVE, AND IT IS THE ONE PLAYER FEED ON THIS PLATFORM THAT NEEDS NO TOKEN ──
 *
 * `GET /casino/bet-history/live` is `public` in their route table — a site-wide ticker of the last
 * rounds anyone played, which is exactly what this row is on bc.game. There it is a websocket that
 * unshifts each new bet onto the front; here it is one read, so the list is whatever the last
 * `limit` rounds were at the time the page loaded.
 *
 * FOUR FIELDS MAP STRAIGHT ACROSS AND TWO ARE DECIDED HERE:
 *
 *   `userName`  the feed does not carry one, deliberately — it is public, and who played is not.
 *               bc.game has its own word for a player who cannot be named, `****`, which is what
 *               `HIDDEN_NAME` is and what the component already renders in `text-secondary`. So an
 *               anonymous feed lands on the site's own hidden-player rendering rather than on a
 *               blank cell or an invented name.
 *
 *   `payout`    the same multiplier arithmetic the bet-history pane's adapter documents at length,
 *               and the same convention: a total loss is 0, a 50-stake bet returning 80 is 160.
 *               `services/betHistory.js` owns the derivation; this passes its own rows through it
 *               and then renames three fields, rather than keeping a second copy of the rule.
 *
 * `fullName` is the printed game name and `gameUnique` the slug the icon map is keyed by — the
 * platform sends one string for both (`classic_dice`), so the slug is used raw and the name is
 * title-cased. A slug the icon map does not know falls back to the blackjack icon, which is the
 * site's own behaviour for the many third-party games it does not have an icon for.
 */
const toLatestBet = (row) => {
  const mapped = toBetRow(row);
  return {
    betId: mapped.distributeId,
    gameUnique: String(row.game ?? row.game_uid ?? ''),
    fullName: mapped.type,
    userName: HIDDEN_NAME,
    currencyName: mapped.currencyName,
    throwAmount: String(row.amount ?? '0'),
    profitAmount: String(row.profit ?? '0'),
    payout: mapped.payout / 100,
  };
};

export function getLatestBets() {
  if (USE_FIXTURES) return request(ENDPOINTS.lastBets, { fixture: bets });
  return Promise.resolve(
    /* `LIVE_BETS` is the component's own capacity: it keeps 30 and shows 10 at a time. */
    request(PLATFORM.casino.betHistoryLive, { live: true, params: { limit: LIVE_BETS }, fixture: [] }),
  ).then((rows) => (rows ?? []).map(toLatestBet));
}

/* THE HIGH ROLLER TAB'S OWN FEED, wired 2026-09-04 — and it is a SECOND feed, which is the whole
 * point. `ThrowAndHighRolles-C7GElDRJ.js` keys the panel on the tab:
 *
 *   const fe = {
 *     highRoller: { url: "/game/support/home/v2/high-rollers/", event: "home-high-roller", … },
 *     lastBet:    { url: "/game/support/home/last-bet/",        event: "home-game-throw",  … }
 *   }
 *   const r = await get(fe[type].url) ?? []
 *   return (type === "highRoller" ? r.slice(-D) : [...r].reverse().slice(0, D)).map(K)
 *
 * Two URLs, two socket events, and two different slices of the answer. This build pointed BOTH
 * tabs at `getLatestBets`, so Latest Bet and High Roller showed the identical list — which is
 * what it looked like, because it was.
 *
 * `GET /casino/bet-history/top-wins` is the counterpart here and needed nothing built: public,
 * already declared in `endpoints.js`, and it answers the SAME ROW SHAPE as the live ticker
 * (`reference, game, amount, profit, currency, at`), so it maps through the same adapter. Its
 * server-side rule is `profit > 0` ordered by `profit DESC` — biggest wins first, which is what a
 * high-roller board is.
 *
 * IT WAS LEFT UNWIRED ONCE AND THE REASON DOES NOT APPLY HERE. `docs/backend-gaps.md` records
 * `top-wins` as deliberately unwired because "Recent Big Wins draws a player NAME and a VIP TIER
 * on every card and the public route carries neither". True of THAT component; this table has no
 * VIP column and already renders every player as `HIDDEN_NAME`, the site's own word for a player
 * it will not name. So the one objection to using it is about a different screen.
 *
 * `slice(-D)` IS NOT REPRODUCED, and cannot be: the original takes the LAST 30 of an ascending
 * list because its feed hands back oldest-first. Ours is ordered `profit DESC` by the server, so
 * the first rows are already the biggest. Taking the tail here would return the SMALLEST wins.
 */
export function getHighRollers() {
  /* No second fixture. The captured `bets` list is the last-bet feed's, and pointing the fixture
     arm at it would put the two tabs back on one source — the exact defect this fixes, just
     invisible until someone flipped the flag. An empty list is the honest fixture: this pane's
     own empty state is a panel with no rows, which `BetFeed` now renders correctly. */
  if (USE_FIXTURES) return request(ENDPOINTS.lastBets, { fixture: [] });
  return Promise.resolve(
    request(PLATFORM.casino.topWins, { live: true, params: { limit: LIVE_BETS }, fixture: [] }),
  ).then((rows) => (rows ?? []).map(toLatestBet));
}

/* ONE READ PER TAB, because that is what the live site does: `?gameTypeId=<tab>` is a separate
 * request and each answers its own twenty rows. The component used to take the All list and
 * filter it, which is only equivalent if All contains twenty of every type — it does not, so BC
 * Originals showed three rows and Slots six.
 *
 * `tab` is the `gameTypeId` itself (0 All, 1 BC Originals, 2 Slots, 3 Live Casino), so it goes
 * straight into the path the day this stops being a capture. Falls back to All for a tab with no
 * captured list rather than answering nothing. */
export const getRecentBigWins = ({ tab = 0 } = {}) => {
  if (USE_FIXTURES) return request(ENDPOINTS.recentBigWins, { fixture: bigWinsByTab[tab] ?? bigWinsByTab[0] });
  /* LIVE: `GET /casino/bet-history/top-wins` (public, `profit > 0`, biggest first). It records
     in-house rounds only, so All and BC Originals read it and Slots / Live Casino are empty
     (no aggregator wins feed exists). It names nobody and carries no VIP level, so every card
     is the site's hidden name with no tier, and the amount is the real profit in its own coin
     rather than the capture's USD figure. */
  if (tab !== 0 && tab !== 1) return Promise.resolve([]);
  /* Every row of this feed is an in-house round, so with BC Originals switched off it has
     nothing to show (and nothing to link to). */
  return publicGates().then((gates) =>
    gates.on('originals')
      ? Promise.resolve(
          request(PLATFORM.casino.topWins, { live: true, params: { limit: 20 }, fixture: [] }),
        ).then((rows) => (rows ?? []).map(toBigWin))
      : [],
  );
};

const toBigWin = (row) => {
  const slug = slugFor(String(row.game ?? ''));
  const profit = Number(row.profit ?? 0);
  return {
    gameUnique: slug,
    icon: assetExact(slug),
    tier: vipTier(-1),
    name: displayName(HIDDEN_NAME),
    amount: `${profit.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${row.currency ?? ''}`.trim(),
  };
};

/* LIVE: no lottery and no BetBy feed exist on the SmartBet backend, so both rows render empty
   rather than the captured draws and matches. */
export const getLotteryDraws = () =>
  USE_FIXTURES ? request(ENDPOINTS.lotteryUpcoming, { fixture: draws }) : [];

/* Highlights is BetBy's, not bc.game's — its real source is the top-events feed on BetBy's own
   host, which needs a brand id, a country, a currency and a language. None of those are known
   at rest here, so the path is built with the one captured brand flag and placeholders; see
   the note in `pages/Home/Highlights/matches.js` for why this feed was never captured. */
export const getHighlights = ({
  brand = '2103509236163162112',
  country = 'US',
  currency = 'USD',
  lang = 'en',
} = {}) =>
  USE_FIXTURES ? request(ENDPOINTS.betby.topEvents(brand, country, currency, lang), { fixture: matches }) : [];
