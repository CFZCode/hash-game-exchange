import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { ACHIEVEMENTS, MEDAL_COUNT, BONUS_STATUS } from '../data/achievements';
import { getOriginals, slugFor } from './originals';
import { assetExact } from '../utils/gameArt';

/* The three profile dialogs' data — `/user/profile/:userId`, `/user/medals/:userId` and
 * `/user/statistics`. Five endpoints between them, all read out of the recovered account-remote
 * chunks (`Tool-CuKFgBKm.js`, `index-D0DujHZT.js`, `index-DVoHgAYe.js`), and the SPLIT BETWEEN
 * WHAT ANSWERS AND WHAT DOES NOT is the reusable part:
 *
 *   /game/support/achievement/all/            ANSWERS      the medal catalogue + player counts
 *   /game/support/user/game/summary/          ANSWERS      wins / bets / wagered for a userId
 *   /game/support/user/info/<id>/             6001         the profile itself
 *   /game/support/user/game/detail/           403          the per-currency statistics table
 *   /game/support/achievement/<userId>/       ANSWERS []   another player's medals
 *
 * That is the `game/support` rule holding for a sixth family: a CATALOGUE answers, a per-account
 * READ does not — even when both live under the same prefix and both take a userId. `summary/` is
 * the interesting exception and it is not really one: it aggregates public bet history, so it
 * answers for any id (105522617 comes back with 25568 bets), and for THIS build's fixture account
 * id it answers `{betNum: 0, winNum: 0, betAmountUsd: "0"}` — the capture's own three zeros,
 * fetched without reference to the screenshot.
 *
 * `user/info/` returning 6001 `illegal_request` rather than 403 is worth recording: it is refused
 * for every id including real ones, so it is a signature requirement rather than a missing session.
 */

/* `es` in `Tool-CuKFgBKm.js` — the resource's `initialValue`, and it is the whole profile fixture.
 * Third time this trick has paid (after `/bonus`'s reward list and the referral dashboard's
 * request-module default): CHECK FOR AN `initialValue` BEFORE WRITING ANY LOGIN-GATED FIXTURE.
 *
 * Two fields are filled from the session's own account fixture rather than left at the default's
 * zero, and neither is invention — they are the same two values the account store already carries,
 * and the dialog prints them side by side with `session.name`, which it reads from that store
 * directly. `userId` 0 would fail the route's own `!userId && navigate(-1)` guard; `createTime` 0
 * would print "Joined on 1/1/1970".
 *
 * Everything else stays as declared, which is what makes the dialog render the capture: `medals 0`,
 * three zero statistics, an empty favourites list behind the crocodile, and no Wager Contest card
 * at all (that one is `<Show when={contest.length > 0}>`).
 */
/* SmartBet's own-account statistics (`GET /user/profile/stats`, token-scoped): bets and wins across
   casino AND sports, and — new on SmartBet — `wagered.usd`, every stake priced in USD at the
   platform's rates (a currency with no rate is listed in `wagered.unrated` and left out of the sum
   rather than added at 1:1). This is the "Total Wagered" figure the old backend could not give. */
const PROFILE_STATS = '/api/v1/user/profile/stats';
const readOwnStats = () =>
  Promise.resolve(request(PROFILE_STATS, { live: true, fixture: null })).catch(() => null);

/* ── MEDALS ON SMARTBET, gap 9 (live mode only) ──────────────────────────────────────────────
 *
 * `GET /user/medals` (own, signed in) answers all 23 medals with the reference's own keys —
 * `type` + `subType` — so each row maps one for one onto the `achievement/all/` row this UI was
 * built on: `unlocked` → `status` "1"/"0", `holders` → `count`, `unlockedAt` → `createTime` (ms),
 * `progress {current, target}` → `progress {current, total}`. `medalCount` is the server's.
 *
 * `GET /user/profile/:userId/medals` (public) answers another player's UNLOCKED medals only, with
 * no progress; the rest of the strip is the catalogue, locked.
 *
 * NO FAKE UNLOCKS AND NO BORROWED FIGURES. When the read fails (signed out, server down) the
 * catalogue renders all locked with zero holders — never bc.game's captured holder counts, which
 * are another site's players. A medal the platform has no rule for comes back locked from the
 * server and stays locked here. The reward chests keep the declared unclaimed `bonusStatus`:
 * medals are cosmetic on this platform and no chest claim exists.
 */
const lockedCatalogue = () =>
  ACHIEVEMENTS.map((row) => ({ ...row, status: '0', count: 0, createTime: 0, progress: null }));

const toAchievement = (medal) => ({
  type: Number(medal.type),
  subType: String(medal.subType ?? '0'),
  status: medal.unlocked ? '1' : '0',
  count: Number(medal.holders ?? 0),
  createTime: medal.unlockedAt ? Date.parse(medal.unlockedAt) : 0,
  progress: medal.progress
    ? { total: Number(medal.progress.target), current: Number(medal.progress.current) }
    : null,
  /* This platform's own unlock condition, for the medal detail dialog ('' when it has no rule here). */
  description: medal.rule?.description ?? '',
});

const medalKey = (row) => `${row.type}_${row.subType}`;

function readLiveMedals(userId, account) {
  const self = !!account?.userId && Number(account.userId) === Number(userId);
  if (self) {
    return Promise.resolve(request(PLATFORM.user.medals, { live: true, fixture: null }))
      .then((data) =>
        Array.isArray(data?.medals)
          ? { medalCount: Number(data.medalCount ?? 0), achievements: data.medals.map(toAchievement) }
          : null,
      )
      .catch(() => null)
      .then((live) => live ?? { medalCount: 0, achievements: lockedCatalogue() });
  }
  return Promise.resolve(request(PLATFORM.user.publicMedals(userId), { live: true, fixture: null }))
    .then((data) => {
      const earned = new Map((data?.medals ?? []).map((m) => [medalKey(toAchievement(m)), toAchievement(m)]));
      return {
        medalCount: earned.size,
        achievements: lockedCatalogue().map((row) => earned.get(medalKey(row)) ?? row),
      };
    })
    .catch(() => ({ medalCount: 0, achievements: lockedCatalogue() }));
}

const PROFILE_DEFAULT = {
  achievementType: 0,
  achievements: [],
  avatar: '',
  allowOnlyFriendPrivate: false,
  betAmountUsd: '0',
  betNum: 0,
  contest: [],
  createTime: 0,
  favorite: [],
  hideGameData: false,
  level: 0,
  levelName: '',
  name: '',
  totalLikeNum: 0,
  headLikeNum: 0,
  shareLikeNum: 0,
  showStar: 0,
  titleDesc: [],
  titles: [],
  userId: 0,
  winAmountUsd: '',
  winNum: 0,
  hasSelfHeadClick: false,
  status: 0,
};

/* ── ANOTHER PLAYER'S PROFILE, wired 2026-09-04 (gap 17) ─────────────────────────────────────
 *
 * `GET /user/profile/:userId/public`. Until it existed, `GET /user/profile` answered the CALLER's
 * own row and took no id, so clicking a name in chat or on a leaderboard had nowhere to go and
 * this dialog rendered the capture for every id.
 *
 * ── MOST OF THIS DIALOG STILL HAS NO BACKEND, AND THE DEFAULTS STAY ───────────────────────
 *
 * The platform answers six fields: username, avatar, computed VIP level, card tier, join date and
 * the bet/win counts. The dialog draws considerably more than that — medals, titles, likes, a
 * contest strip, favourites — and NONE of it exists on this platform (gap 9 for the medals, and
 * nothing at all for the rest). So the live answer is merged OVER `PROFILE_DEFAULT` rather than
 * replacing it: the fields that are real become real, and the rest keep the values that make the
 * dialog render its own empty states instead of collapsing.
 *
 * `betAmountUsd` is deliberately NOT filled from anything. The platform's `playerStats` returns no
 * money and says why — four sources hold four currencies and adding a PKR stake to a USDT one is
 * the mistake that module's own notes describe. A zero here is the honest reading; inventing a
 * total from the counts would not be.
 *
 * `bets`/`wins` come back as `null` rather than 0 when casino-service could not be read, and that
 * distinction is kept: `?? PROFILE_DEFAULT.betNum` leaves the dialog showing its default rather
 * than asserting the player has never bet.
 */
/* One `/user/profile/stats` favourite (`key` = casino-service's `<source>:<id>`) in the card's
   `{gameUnique, betAmountUsd, gameItem}` shape. An Original (`og:` / `inhouse:`) links and draws
   by this build's slug; a catalogue game links by its provider id and keeps the card's fallback art. */
export function toFavourite(game) {
  const [source, id = ''] = String(game.key ?? '').split(/:(.*)/s);
  const house = source === 'og' || source === 'inhouse';
  const slug = house ? slugFor(id) : id;
  return {
    gameUnique: slug,
    betAmountUsd: String(game.wageredUsd ?? '0'),
    gameItem: {
      fullName: game.name,
      iconThreeFour: house ? assetExact(slug) : undefined,
      gameIdentity: { gameUrl: slug },
    },
  };
}

export function getUserProfile(userId, account) {
  if (!USE_FIXTURES) {
    const self = !!account?.userId && Number(account.userId) === Number(userId);
    return Promise.all([
      Promise.resolve(
        request(PLATFORM.user.publicProfile(userId), { live: true, fixture: null }),
      ).catch(() => null),
      self ? readOwnStats() : null,
      readLiveMedals(userId, account),
    ])
      .then(([row, stats, medals]) => ({
        ...PROFILE_DEFAULT,
        /* The strip and the "Medals N" heading: the platform's medals, see `readLiveMedals`. */
        achievements: medals.achievements,
        userId: Number(userId) || account?.userId || 0,
        ...(row
          ? {
              name: row.username ?? '',
              avatar: row.avatar ?? '',
              level: row.level ?? 0,
              /* The card tier is the ladder's own name for the band — `brownz`, `silver`,
                 `gold`, `platinum`, `diamond`. The dialog prints `levelName` beside the number. */
              levelName: row.levelName ?? row.card ?? '',
              createTime: row.joinedAt ? Date.parse(row.joinedAt) : 0,
              betNum: row.bets ?? PROFILE_DEFAULT.betNum,
              winNum: row.wins ?? PROFILE_DEFAULT.winNum,
            }
          : {}),
        /* Only your OWN wagered total is readable — the public profile carries no money. Your own
           bets / wins come from the same read: casino AND sports, where the public row may be casino only. */
        ...(stats?.wagered?.usd != null ? { betAmountUsd: String(stats.wagered.usd) } : {}),
        ...(typeof stats?.bets === 'number' ? { betNum: stats.bets, winNum: stats.wins ?? 0 } : {}),
        ...(stats?.favouriteGames?.length ? { favorite: stats.favouriteGames.map(toFavourite) } : {}),
      }));
  }

  return request(ENDPOINTS.profile.userInfo(userId), {
    fixture: {
      ...PROFILE_DEFAULT,
      userId: Number(userId) || account?.userId || 0,
      createTime: account?.createTime ?? 0,
      /* The medal STRIP on the profile is a different read from the medals dialog's: the profile's
         rows come down inside `user/info/` as `achievements`, where the dialog fetches
         `achievement/all/`. Both are the same 23 rows with the same statuses here, and the strip
         needs them to draw anything at all, so the catalogue stands in — flagged rather than
         silent, because a real session's two lists could differ (the profile's carries only what
         the server chose to show). */
      achievements: ACHIEVEMENTS,
    },
  });
}

/* `Da` — the medals dialog's own read, and the one that answers. `bonusStatus` is empty for a
   visitor and is reconstructed in data/achievements.js; see the note there. */
export function getAllAchievements(userId, account) {
  /* SmartBet: the platform's medals for this id (own: full catalogue with progress; another
     player: their unlocked ones over the locked catalogue). Fixture mode below is unchanged. */
  if (!USE_FIXTURES) {
    return readLiveMedals(userId, account).then((medals) => ({ ...medals, bonusStatus: BONUS_STATUS }));
  }
  return request(ENDPOINTS.profile.achievementsAll, {
    fixture: {
      medalCount: MEDAL_COUNT,
      achievements: ACHIEVEMENTS,
      bonusStatus: BONUS_STATUS,
    },
  });
}

/* `Ba`'s read — another player's medals. Answers `[]` for every id tried, which is what the
   dialog's "Player didn't get any Medal yet." state is for. Not called today: the dialog only
   routes for your own id, since nothing in this build links to another player's profile. */
export function getUserAchievements(userId) {
  return request(ENDPOINTS.profile.achievements(userId), { params: { cache: true }, fixture: [] });
}

/* `U` — the Statistics dialog's summary. A real response for our own account id; `gameUrl` empty
   means Global, and the chunk maps its own "Global" sentinel to "" on the way out. */
const EMPTY_SUMMARY = { betNum: 0, winNum: 0, betAmountUsd: '0' };

/* ── LIVE ON THE PLATFORM, FOR THE GLOBAL ROW ONLY ────────────────────────────────────────────
 *
 * `GET /casino/bet-history/stats` answers `{bets, wins, bySource}` for the signed-in player — two
 * of the three figures this card prints, from a route that needs no id because the token carries
 * one. So Total Bets and Total Wins are real, and verified against four bets placed on the
 * running platform (`bets: 4, wins: 2`).
 *
 * **`betAmountUsd` STAYS AT ZERO, AND THAT IS THE PLATFORM RATHER THAN AN OMISSION HERE.** It has
 * no total-wagered figure for a player anywhere a browser can reach: `stats` counts rounds and
 * does not sum them, and `GET /user/wager/progress` — which does carry a `wagered` — is fed by
 * `Userwager`, which **the in-house games do not write**: it still read `0.00000000` after those
 * same four bets had settled. Summing the visible page of bet history instead would be a total of
 * one page rather than of an account, which is worse than a figure the backend admits it lacks.
 * Recorded in `docs/backend-gaps.md`.
 *
 * A PER-GAME summary has no equivalent at all — `bySource` splits by aggregator, not by game — so
 * anything but Global keeps the zeros. The dialog's dropdown therefore moves the table below it
 * and not these three counts, which is the honest rendering of a backend with one global figure.
 */
export function getGameSummary(userId, gameUrl) {
  const global = !gameUrl || gameUrl === 'Global';
  if (USE_FIXTURES || !global) {
    return request(ENDPOINTS.profile.gameSummary, {
      params: { userId, gameUrl: global ? '' : gameUrl },
      fixture: EMPTY_SUMMARY,
    });
  }
  /* SmartBet: `/user/profile/stats` gives bets, wins and the USD wagered total together (casino
     and sports). Falls back to the casino-only counts if that read fails. */
  return readOwnStats().then((stats) =>
    stats
      ? {
          betNum: Number(stats.bets ?? 0),
          winNum: Number(stats.wins ?? 0),
          betAmountUsd: String(stats.wagered?.usd ?? '0'),
        }
      : Promise.resolve(
          request(PLATFORM.casino.betHistoryStats, { live: true, fixture: EMPTY_SUMMARY }),
        ).then((casino) => ({
          betNum: Number(casino?.bets ?? 0),
          winNum: Number(casino?.wins ?? 0),
          betAmountUsd: '0',
        })),
  );
}

/* `L` — the per-currency table behind it. 403, so the list is empty and the pane renders the site's
   own empty state, which is exactly what the capture shows. */
export function getGameDetail({ userId, gameUrl, page = 1, pageSize = PAGE_SIZE }) {
  return request(ENDPOINTS.profile.gameDetail, {
    method: 'POST',
    body: JSON.stringify({ gameUrl: gameUrl === 'Global' ? '' : gameUrl, userId, page, pageSize }),
    fixture: { list: [], total: 0 },
  });
}

/* `R` — the chunk's own page size. */
export const PAGE_SIZE = 10;

/* `we` — the game dropdown, and it is the SAME selection endpoint the Help Center's fairness
 * picker and the sidebar's Originals flyout use, with `selectionName: "originals"` and
 * `pageSize: 100`. So no path is invented.
 *
 * ITS FILTER IS NOT THE HELP CENTER'S, and the two are transcribed as written rather than shared:
 * this one drops exactly one row, `gameIdentity.gameName === "CrashTrenball"`, where the fairness
 * picker drops any slug containing "trenball" AND any name containing a colon. So this list is the
 * longer of the two.
 *
 * The fixture is `data/games.js` filtered to BC Originals, the same stand-in `services/help.js`
 * uses — no `originals` selection response was ever captured, and games.js is itself generated from
 * two captured feeds, so the rows are real even though this envelope is not. `Global` is prepended
 * by the dialog, not by the feed.
 */
/* THIS SITE'S ORIGINALS, not bc.game's selection (user's request, 2026-10-16): the same list the
   lobby shows — services/originals.js, already cut to the five offered (SHOWN_ORIGINALS). */
export function getStatisticsGames() {
  return Promise.resolve(getOriginals())
    .then((games) => (games ?? []).map((g) => ({ label: g.name, value: g.slug })))
    .catch(() => []);
}
