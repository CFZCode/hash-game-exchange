/* Every path the app will call, in one place.
 *
 * These are bc.game's OWN paths, not invented ones. Each is either a directory under
 * `bc.game/bc.game/api/` in the mirror — meaning a real response was captured and the matching
 * fixture is that response's payload — or a path read out of the saved JS. The two are marked,
 * because it matters: a CAPTURED path has a known response shape, a READ path has only a known
 * URL and its fixture is this project's reconstruction.
 *
 * Anything that varies per call is a function so the caller cannot forget to interpolate it.
 */

/* --------------------------------------------------------------- captured (shape is known) */
export const ENDPOINTS = {
  // account + wallet
  account: '/api/account/get/',
  userAmount: '/api/user/amount/',
  phoneAreas: '/api/account/phone/get/area/',
  loginInfo: '/api/account/open/unified-login-info/',
  invitationWhitelist: '/api/account/invitation-code/whitelist/',
  deviceRegistered: '/api/account/device/isRegistered',
  trackEvent: '/api/user/tracking/event/',

  // home
  /* BOTH ANSWER UNAUTHENTICATED, and the single-selection one is now a live fixture rather than
     a path with a capture behind it: `POST` it `{selectionName: "originals", page: 1, pageSize:
     100}` on hash.game and it returns the whole selection — 73 games with their artwork URLs and
     live `onlineUsers` — which is where `pages/Home/GameSection/originals.js` comes from. A
     recommendation feed is a catalogue, so it falls on the answering side of the split
     `game/support` has demonstrated repeatedly, and the mirror's own capture is the BATCH call
     beside it (page 1 of every selection at once). Worth knowing before writing a fixture for any
     other row here: the batch's ten are a page, not a list. */
  homeSelection: '/api/edge/game/home/recommend/selection/',
  homeSelectionBatch: '/api/edge/game/home/recommend/batch/selections/',
  homeBanner: (region = 'US') => `/api/edge/home/main/pop/banner/${region}/`,
  /* The signed-in hero carousel. Path and every query parameter come from
     `createBanner-4SczZOe8.js`; the RESPONSE was captured live off hash.game rather than out
     of the saved mirror, which is why it sits in the captured group. `bannerType` is sent but
     ignored by the server — top/bottom/middle/side all answer identically. */
  homeMainBanner: ({
    bannerType = 'top',
    areaCode = 'US',
    uid = 0,
    level = 0,
    env = 'WEB',
    vip = false,
  } = {}) =>
    `/api/edge/home/main/banner/?bannerType=${bannerType}&areaCode=${areaCode}&uid=${uid}` +
    `&level=${level}&env=${env}&vip=${vip}`,
  lastBets: '/api/game/support/home/last-bet/',
  recentBigWins: '/api/game/support/home/v3/recent-big-wins/',

  // config
  usdPrice: '/api/game/support/system/conf/usdPrice',
  vipConfig: '/api/game/support/vip-v2/config/',

  // lottery + sports
  lotteryUpcoming: '/api/platform-lottery/lottery-info/list-upcoming',
  sportProviders: '/api/platform-sports/v14/home/sport/provider/support/',

  /* ------------------------------------------------- read from saved JS (shape NOT captured)
   *
   * The sportsbook is BetBy's, on its own host, and none of these responses were captured —
   * see the Sports notes in CLAUDE.md. Paths come from `Com-8gtZ7Cmm.js`. `brand` is
   * `betByBrand.brandFlag` from `sportProviders` above; the captured value is
   * "2103509236163162112". */
  /* The bonus service, from `index-CoOXrsZl.js` — which IS in the mirror and is barely
   * minified, so these are the real method names against the real paths. None of the
   * RESPONSES were captured, so the shapes are this project's reconstruction.
   *
   * `times` vs `cycle` is the trap: `times-deposit-bonus` is the nth-deposit-of-the-month
   * bonus behind /deposit-offer, `cycle-deposit-bonus` is the weekly deposit reward, a
   * different feature on a different page. The chunk names them
   * `getTimesDepositBonus` / `getWeeklyDepositReward` respectively. Only the first pair is
   * used today; the rest are listed because they were free to read and the next bonus page
   * will want them. */
  bonus: {
    timesDeposit: '/api/activity-extension/times-deposit-bonus/list/',
    timesDepositClaim: '/api/activity-extension/times-deposit-bonus/claim/',
    cycleDeposit: '/api/activity-extension/cycle-deposit-bonus/list/',
    cycleDepositTerms: '/api/activity-extension/cycle-deposit-bonus/term/',
    cycleDepositClaim: '/api/activity-extension/cycle-deposit-bonus/claim/',
    dashboard: '/api/activity/bonus-dashboard/get/',
    dashboardStatistics: '/api/activity/bonus-dashboard/statistics/',
    /* `deposit-offer-service-C1CBxY0W.js`, which is in the mirror and is one line long:
       `createResource(() => ["/activity/recharge-bonus/progress/"], …)`. This one HAS been
       answered — see the note in services/bonus.js — and it is what feeds both /deposit-offer
       and the hero carousel's deposit slide. */
    rechargeProgress: '/api/activity/recharge-bonus/progress/',
    /* Named in the main bundle as `xd(() => xe.login ? ["/activity/recharge-bonus/config/
       current/"] : void 0)` — LOGIN-GATED, and `hash.game` answers it with code 6002 for a
       logged-out visitor. Its `currentUseConfigs` is what the fiat deposit tab's bonus tag and
       its minimum come off; see the note in services/bonus.js for how that payload was
       reconstructed from the one endpoint that DOES answer. */
    rechargeConfig: '/api/activity/recharge-bonus/config/current/',
    /* The Bonus page, `/bonus`. Out of `rewards-service-CxFWsPYn.js`, which IS in the mirror —
       and unusually for a login-gated feed the SHAPE is recovered too, because that module's
       resource declares the logged-out `initialValue` inline and it is the very payload the
       capture renders. See the note at the top of pages/Bonus/bonus.js.

       `v2` is the page's whole read; the other three are its writes and none is called. The
       lossback pair below comes from `row-group-C0GNBT_f.js`, which the same page imports;
       both are GETs and both feed the Lossback card, which is not built. */
    rewards: '/api/activity/bonus/v2/',
    rewardsBatchClaim: '/api/activity/bonus/v2/batch-claim/',
    reloadSpinConfig: (currency) => `/api/activity/bonus/fx/reload-welcome/${currency}/`,
    discardNewUserBonus: '/api/activity/recharge-bonus/new-user/discard/',
    lossback: '/api/activity/bonus/fx/lossback/',
    lossbackBetLimit: '/api/activity/bonus/fx/lossback/bet-limit/',
    /* The redeem bar at the foot of the Rewards panel, out of `redeem-M5TwYr_j.js`. It posts
       `{ redeemCode }` and, on success, pushes a full-screen amber popup. Neither the submit nor
       that popup is built, so nothing calls this. */
    redeemCode: '/api/activity/redeemCode/useCode/',
    /* The Free Plays dialog, `/free-plays`. Not read out of a service module like the rest of
       this group — the resource is declared in `Enter-MsmOuq5R.js` itself (`ws`), which is where
       the free-play dot in the account dropdown reads it from too. A POST carrying
       `{ brandFlags: [config.betby_brand_id, config.bti_config.primary.light] }`, cached 10s,
       and skipped entirely when logged out. Answers 403 with an empty body on hash.game, so the
       shape is the component's own reads; see services/freePlay.js. */
    freePlays: '/api/activity/bonus/freeplays/unused-rewards/',
  },

  /* The Quest Hub, `/quests`. All four are the real paths out of `quest-service-Cob0DDxX.js`,
   * which IS in the saved mirror and is 90 lines long — three `createResource` calls and one
   * bare post, so these are method-for-path with nothing inferred.
   *
   * NONE of the RESPONSES is recoverable. Every one is per-account, and `hash.game` answers all
   * three list paths with 403 rather than the 6002 the deposit paths give — checked rather than
   * assumed. So the shapes in `pages/Quests/quests.js` come from the service's own
   * `initialValue` and from the renderers that read them, not from a captured payload.
   *
   * `brandId: "bcgame"` on the list call and `all: false` on the completed one are the bodies
   * the service posts; the expired call posts `{}`. */
  quest: {
    list: '/api/activity/quest/list/',
    completed: '/api/activity/quest/completed/list/',
    expired: '/api/activity/quest/expired/list/',
    verificationComplete: '/api/activity/quest/verification/push/complete/',
  },

  /* Deposit. All six read out of `api-B_IcOSNp.js`, pulled off `hash.game/assets/` — real
   * method names against real paths, `useAddress` / `useDepositMethods` / `deposit` and
   * friends. NONE of the responses is recoverable: every one of them is per-account and
   * authenticated, and `hash.game` answers 6002 to all of them (verified against
   * `/payment/deposit/fiat/INRFIAT/methods/`). That is why pages/Deposit/deposit.js is the
   * one mostly-invented fixture in this project.
   *
   * `updateUtr` belongs to the UPI_utr channel's second step, which is not built. */
  deposit: {
    cryptoAddress: (currency) => `/api/payment/deposit/crypto/${currency}/address/`,
    fiatMethods: (currency) => `/api/payment/deposit/fiat/${currency}/methods/`,
    fiatKyc: '/api/payment/deposit/fiat/kyc/',
    fiatCreate: '/api/payment/deposit/fiat/create/',
    fiatUpdateUtr: '/api/payment/deposit/fiat/order/updateUTR/',
    recentCurrencies: '/api/payment/deposit/recently/currencies/',
    history: '/api/payment/deposit/history/',
    order: (id) => `/api/payment/deposit/order/${id}/`,
  },

  /* Withdraw. Read out of `api-CKXOLBLH.js` and `index-B3pypdyg.js`, both off `hash.game/assets/`.
   *
   * `currencyTokens` IS THE ODD ONE OUT AND IS WORTH NOTICING: it is a `system/conf` path, so it
   * answers UNAUTHENTICATED, and it is therefore the only entry in this group whose response is
   * real. `src/data/currencyTokens.js` is that response for all 89 crypto currencies — chains,
   * labels, per-chain minimums, fee ranges, memo-tag names. It sits with `usdPrice` and
   * `index/minimal` as a third case of the same trick, and it is what let the withdraw page be
   * built on evidence where the deposit page had to be built on invention.
   *
   * Everything else here is per-account and answers 6002 to a logged-out caller:
   *
   *   feeRange           the fee actually charged. `services/withdraw.js` substitutes the
   *                      token's own `minFee`, which reproduces the capture's "Min: 204 BCD"
   *                      exactly (200 + 4) — see the argument there.
   *   unlockedBalance    the withdrawable part of the balance, derived from the wallet fixture.
   *   feeDeduction       whether VIP 8+'s one-free-withdrawal-a-day is still available; the
   *                      "Fee-free withdrawal" checkbox. Not built.
   *   addressCheck       whether the account is in whitelist-only mode, which swaps the free-text
   *                      address field for a picker. Not built; the free-text arm renders.
   *   addressList        the saved withdrawal addresses behind the address-book button.
   *   create             the submit. This build's form stops at Preview.
   *   right              `/payment/withdraw/right/`, the SATS/lightning entitlement.
   *
   * The `fiat*` family is the fiat arm (`Wa`), and the SATS family the lightning one (`hr`),
   * neither of which is built. `closedUserAvailable` belongs to a closed-user-group variant of
   * the whole page that this deploy can reach but never does. */
  withdraw: {
    currencyTokens: (currency) =>
      `/api/game/support/system/conf/currencyTokens?currencyName=${currency}`,
    feeRange: (currency) => `/api/payment/withdraw/fee/range/${currency}/`,
    unlockedBalance: (currency) => `/api/balance-controller/balance/unlocked/${currency}/`,
    feeDeduction: '/api/payment/withdraw/fee/deduction/',
    addressCheck: '/api/payment/withdraw/address/check/',
    addressList: '/api/payment/withdraw/address/list/',
    create: '/api/payment/withdraw/create/',
    right: '/api/payment/withdraw/right/',
    history: '/api/payment/withdraw/history/',
    order: (id) => `/api/payment/withdraw/order/${id}/`,
    closedUserAvailable: '/api/payment/withdraw/closed/user/available/amount/',
    createSats: '/api/payment/withdraw/create-sats/',
    lnurl: '/api/payment/lnurl/',
    fiatKyc: '/api/payment/withdraw/fiat/kyc/',
    fiatFee: '/api/payment/withdraw/fiat/fee/',
    fiatCreate: '/api/payment/withdraw/fiat/create/',
    fiatMethods: (currency) => `/api/payment/withdraw/fiat/${currency}/methods/`,
    fiatList: '/api/payment/withdraw/fiat/list/',
    cwalletMonthlyLimit: (currency) => `/api/payment/cwallet/monthly-limit/${currency}/`,
    cwalletEstimate: '/api/payment/cwallet/estimate/',
  },

  /* Buy Crypto — `/wallet/buy`. All five are read out of `api-C3PVkuGZ.js`, which is the whole
   * request module for the page and is barely minified, so the method names and the POST bodies
   * below are the chunk's own rather than inferred.
   *
   * THREE OF THE FIVE ANSWER UNAUTHENTICATED on hash.game and are therefore real data in this
   * build; the other two are gated, and the split falls exactly where you would expect it to:
   *
   *   fiats / coins   the catalogues of what the provider supports. Both answer. -> data/buyCrypto.js
   *   prices          403. A quote for THIS account's order, so it is genuinely per-request.
   *   order           creates one. Not called; the button is inert.
   *   history         POST with a page number, used by `useBuyHistory` — which this page does not
   *                   call at all. It belongs to the transaction pane, which is not built.
   *
   * `getConfig` fires the first two in one `Promise.all` and keys its resource on the two paths
   * CONCATENATED with no separator, `"/payment/buy-crypto/fiats//payment/buy-crypto/coins/"`. That
   * is the chunk's own cache key, quoted here because it looks like a path and is not one. */
  buyCrypto: {
    fiats: '/api/payment/buy-crypto/fiats/',
    coins: '/api/payment/buy-crypto/coins/',
    prices: '/api/payment/buy-crypto/prices/',
    order: '/api/payment/buy-crypto/order/',
    history: '/api/payment/buy-crypto/history/',
  },

  /* Swap — `/wallet/swap`. All four out of `api-CW_rj_H1.js`, the page's own request module, which
   * is barely minified.
   *
   * **`config` ANSWERS UNAUTHENTICATED**, and it is the fourth member of the `game/support` family
   * that does — after `system/conf/usdPrice`, `system/conf/index/minimal` and
   * `system/conf/currencyTokens`. It is a rate-card rather than anything about an account: the 43
   * swappable coins, the 1.5% base fee, the $1–$100,000 band, and three tiers of fee override.
   * `src/data/swapConfig.js` is that response.
   *
   * `price` is 403 — checked, not assumed — but it is the one gated response in this project that
   * did not need reconstructing, because the page reads only `fromCurrencyPrice`,
   * `toCurrencyPrice` and `f` off it, and all three are derivable from two live sources. See
   * services/swap.js. `trade` places the swap and `history` is the paged log the transaction pane
   * would use; neither is called. */
  swap: {
    config: '/api/game/support/swap/config/',
    price: '/api/game/support/swap/price/',
    trade: '/api/game/support/swap/trade/',
    history: '/api/game/support/swap/history/',
  },

  /* Vault Pro — `/wallet/vault`. Out of `useVaultTransfer-DALUu4Bx.js`, the page's request module.
   *
   * NOTHING HERE ANSWERS, and that is worth recording because the three panes before it all had a
   * public config to build on. `/vault/amount/list/` returns 6002 to a logged-out caller, and
   * unlike swap there is no `game/support` sibling to fall back to — `/game/support/vault/config/`
   * and `/vault/config/` both 404, checked rather than assumed. A vault row is per-account by
   * nature; the APR is the only part that is not, and it is not published separately. So the
   * page's one invented number is `returnRatio`, read off the capture. See services/vault.js.
   *
   * The balance the transfer form reads is `/balance-controller/balance/unlocked/`, which already
   * sits under `withdraw` above and is shared rather than duplicated here. */
  vault: {
    list: '/api/vault/amount/list/',
    recharge: '/api/vault/amount/recharge/',
    withdraw: '/api/vault/amount/withdraw/',
  },

  /* Transaction — `/wallet/transaction`. The pane is five lists behind one Type filter, and only
   * ONE path is new here: the other four already sit in the groups above, because each list is
   * the history feed of the pane that writes it.
   *
   *   Bill      /user/amount/change/record/   <- new, out of `Bill-D7sK-R1j.js`
   *   Deposit   deposit.history
   *   Withdraw  withdraw.history
   *   Swap      swap.history
   *   Buy       buyCrypto.history
   *
   * ALL FIVE ARE AUTHENTICATED, and the Bill one answers **403** rather than the 6002 the payment
   * paths give — the same split the Quest Hub's feeds show. Checked, not assumed. So every list
   * on the page is empty and the pane renders the site's own empty state, which is exactly what
   * the capture shows; nothing had to be invented to reach it.
   *
   * `changeTypeName` on the Bill body is the Bill Type filter (Game / Affiliate / Vault / Swap),
   * and it is also how the Bonus type is served — `Bonus` has no list of its own and falls
   * through to the Bill table with `changeTypeName: "Bonus"`. The other two are read by the row
   * renderer's game-detail links and are not called. */
  /* Bet History — `/wallet/bet-history`, the last of the nine panes. Both out of
   * `index-D5N4LJZ-.js`'s own request module.
   *
   * TWO PATHS FOR ONE LIST, AND IT IS CURSOR PAGING. Page 1 goes to `first`; every page after it
   * goes to `next` with the same filters plus the `minDistributeId` the previous response returned.
   * So the list is keyed on a cursor rather than an offset, and a bet placed mid-read cannot shift
   * the next page under you.
   *
   * Both answer 403 with `{"msg":"Request 403 error.","code":4001}` — bc.game's own envelope with
   * an application code, which is a DIFFERENT 403 from the transaction pane's Spring error page.
   * Either way the pane is another empty state, and that is the capture. */
  betHistory: {
    first: '/api/game/bet/history/bet-history-first/',
    next: '/api/game/bet/history/bet-history/',
  },

  /* The profile dialogs — `/user/profile/:userId`, `/user/medals/:userId` and `/user/statistics`.
   * All five out of the ACCOUNT federated remote's chunks (`Tool-CuKFgBKm.js`,
   * `index-D0DujHZT.js`, `index-DVoHgAYe.js`), which came off `hash.game/modules/account/assets/`.
   *
   * THREE OF THE FIVE ANSWER UNAUTHENTICATED and the split is the `game/support` rule again, with
   * one instructive exception:
   *
   *   achievementsAll   ANSWERS — the medal catalogue and how many players hold each one, i.e. a
   *                     rate-card. `src/data/achievements.js` is that response.
   *   gameSummary       ANSWERS for ANY userId, because it aggregates public bet history. For this
   *                     build's own fixture id it returns the capture's three zeros exactly.
   *   achievements      ANSWERS `[]` — another player's medals. Nothing links to another profile
   *                     here, so nothing calls it.
   *   userInfo          6001 `illegal_request`, for real ids as well as invented ones — a signature
   *                     requirement rather than a missing session. Its shape is the service
   *                     module's own `initialValue`; see services/profile.js.
   *   gameDetail        403 — the per-currency statistics table, which is per-account. Empty state.
   *
   * `bonus` is the claim behind a reward chest and is not called; the chests are inert. */
  profile: {
    userInfo: (userId) => `/api/game/support/user/info/${userId}/`,
    achievementsAll: '/api/game/support/achievement/all/',
    achievements: (userId) => `/api/game/support/achievement/${userId}/`,
    achievementBonus: (type) => `/api/game/support/achievement/bonus/${type}/`,
    gameSummary: '/api/game/support/user/game/summary/',
    gameDetail: '/api/game/support/user/game/detail/',
    /* `pt` — the avatar popup's Like button, `{ likeItem: userId, sceneType: 1 }`. That popup is
       not built, so nothing posts here. */
    like: '/api/game/support/system-like/like-event/',
  },

  /* Rollover — `/wallet/rollover`, the wagering-requirement ledger. Out of `Details-DZ3wUplM.js`,
   * which carries the page's whole API namespace.
   *
   * ALL FOUR ANSWER 6002, `types` included. That one was worth probing rather than assuming: a
   * list of bonus categories looks exactly like the sort of catalogue the `game/support` family
   * hands out to anybody, and this build has been able to lean on that four times now. It is not
   * one — the types are scoped to the account's own tasks. So the pane is another empty state, and
   * that is what the capture shows.
   *
   * `detail` and `cancel` belong to `/wallet/roll-detail`, a row-detail dialog that is not built. */
  rollover: {
    list: '/api/balance-controller/wager/task/list/',
    types: '/api/balance-controller/wager/task/types/',
    detail: '/api/balance-controller/wager/task/detail/',
    cancel: '/api/balance-controller/wager/task/cancel/',
  },

  transaction: {
    billRecord: '/api/user/amount/change/record/',
    lotteryBetId: '/api/platform-lottery/lottery-detail/to-betid',
    billShare: (gameUrl, amountLogId) =>
      `/api/game/support/share-v3/create/bill/${gameUrl}/${amountLogId}/`,
  },

  /* The notification drawer — every path declared inline in `Enter-MsmOuq5R.js` itself rather
   * than in a service module, which is why they were never recorded here: `Ts`, `Rs`, `Vs`, `$s`,
   * `Ns`, `Ms` and `Fs` all sit beside the store (`Us`) that calls them. Real paths, and the two
   * READ shapes are known from the reducer that consumes them (`Bs`) rather than from a capture.
   *
   * BOTH READS ANSWER 403 ON `hash.game`, probed rather than assumed — and unlike the referral
   * family they answer the SAME way as each other, a bare gateway 403 with no bc.game envelope.
   * So every tab renders the site's empty state, which is exactly the capture. See
   * services/notification.js for why that cost this page nothing.
   *
   * `list` takes `{size: 50, appNo: 1, userId, showUnread}` and `comments` takes
   * `{page, pageSize: 20, showUnread}`; `readOne`/`deleteOne` take `{afficheId, afficheType}`.
   * The three comment paths carry their id in the URL. */
  notification: {
    list: '/api/home/system-notice/list/v2/',
    readAll: '/api/home/system-notice/read-all/',
    readOne: '/api/home/system-notice/read-one/',
    deleteOne: '/api/home/system-notice/delete-notice/',
    comments: '/api/comment/reply/unread/list/',
    commentReadAll: '/api/comment/reply/read/all/',
    commentRead: (id) => `/api/comment/reply/read/${id}/`,
    commentDelete: (id) => `/api/comment/reply/del/${id}/`,
    commentReply: '/api/comment/reply/add/',
    commentLike: (undo) => `/api/comment/like/${undo ? 'undo' : 'do'}/`,
  },

  /* The VIP Club, from the recovered `vip-service-CYiVi9f2.js` and `index-BGw8Rzb9.js` — see
   * services/vip.js for how those were pulled off the second deploy origin once bc.game's own
   * had timed out. Real method names against real paths; no RESPONSE was captured, so the
   * shapes are unknown.
   *
   * Only `support` is called today, and only as the seam for the page's copy — the live page
   * fetches none of this. `rankInfo` and the two `offer` calls drive the signed-in level, XP
   * and deposit-offer widgets, which are not built; they are recorded because they were free
   * to read. `offer`/`offerApprove` take a protocol id. */
  vip: {
    support: '/api/game/support/vip-v2/get/',
    rankInfo: '/api/game/support/vip/rankInfo/',
    offer: (id) => `/api/activity/deposit/special/query/protocol/${id}/`,
    offerApprove: (id) => `/api/activity/deposit/special/protocol/approve/${id}/`,
  },

  /* The referral / affiliate programme, from the recovered `servers-O8_t7p5g.js` — the module
   * `index-ve9CyRhD.js` and `Questions-dsRHzmFN.js` both import, pulled off the second deploy
   * origin with them. Real `http.get` paths, so the URLs are the site's own; no RESPONSE was
   * captured for any of them, so the shapes are not known.
   *
   * `history` is the only one the signed-out page calls, and it is the Live Rewards ticker's
   * feed — the `{commissionUsd, rewardUsd, list}` shape in pages/Referral/referral.js is read
   * off the rendered widget, not off a payload. `dashboard` and `code` drive the signed-in
   * AffiliatePage's Dashboard tab; `commission` and the three POSTs below drive its My Rewards
   * tab (`index-Deo68lWp.js`), which declares the last three inline rather than in the request
   * module — `information/list/` and `invitation/code/list/` feed Commission by Friends, and
   * `referral-rewards/list/` feeds Level Up Rewards.
   *
   * EVERY ONE OF THEM IS SHUT, and in two different ways — worth recording, because "no capture"
   * and "no answer" are different problems. `commission` returns bc.game's own 6002 envelope
   * ("User information expired, please log in again"), while the three POSTs return a bare 403
   * from the gateway. Probed rather than assumed. So the My Rewards tab renders three empty
   * tables, which is exactly what the capture shows. */
  referral: {
    history: '/api/agent/affiliate/history/',
    dashboard: '/api/agent/affiliate/dashboard/',
    code: '/api/agent/invitation/code/custom/',
    commission: '/api/agent/commission/list/',
    rewardConfig: '/api/agent/reward/config/',
    friendList: '/api/agent/information/list/',
    codeList: '/api/agent/invitation/code/list/',
    referralRewards: '/api/agent/information/referral-rewards/list/',
  },

  betby: {
    statuses: (lang) => `/api/v1/descriptions/statuses/${lang}`,
    markets: (lang) => `/api/v3/descriptions/markets/${lang}`,
    promoBanners: (brand, lang) => `/api/v2/promo/banners/brand/${brand}/${lang}`,
    promoWidget: (brand, lang) => `/api/v1/promo/widget/${brand}/${lang}`,
    search: '/api/v1/search/query',
    topEvents: (brand, country, currency, lang) =>
      `/api/v1/top/events/${brand}/country/${country}/currency/${currency}/lang/${lang}`,
    feed: (feed, brand, lang, rest) => `/api/v4/${feed}/brand/${brand}/${lang}/${rest}`,
    /* PLACEHOLDER — the one write on the sports page. BetBy's real placement call was never
       captured (a signed-out session cannot place, and the widget's own network traffic was not
       recorded), so this is shaped like its neighbours and will need correcting against the real
       thing. It exists so the slip's Place Bet goes through `request()` like every other action
       here, and lands on a real endpoint the day one is known, rather than being inert. */
    placeBet: '/api/v1/bets/place',
  },

  /* GLOBAL SETTINGS — `/settings/*`, six panes, read out of the `account` remote's own chunks
     (`index-baue7lPM.js`, `index-DA-0gLy9.js`, `index-BgFc4GKH.js`, `index-DUZ1QIOc.js`,
     `index-0oESBrPp.js`, `index-D7PTq2J_.js`, all off `hash.game/modules/account/assets/`).

     EVERY ONE WAS PROBED AND EVERY ONE IS SHUT, in the two flavours this project has now seen
     several times: `6002` for the `/account/*` family and a bare gateway `403` (`code: 4001`) for
     `/account/online/status/my/` and the whole `/payment/*` half. The one exception is
     `unified-login-info`, which answers and is already in the captured group above — a
     login-domain catalogue rather than anything about an account.

     `privacy` takes the account's own uid; everything else takes no parameter. See
     pages/Settings/settings.js for what stands in for each. */
  settings: {
    connections: '/api/account/open/info/list/',
    linkedAccounts: '/api/account/link/list/',
    communityLinks: '/api/agent/affiliate/community-links',
    sessions: '/api/account/online/status/my/',
    sessionOff: (deviceId) => `/api/account/online/status/my/${deviceId}/off/`,
    kycStatus: '/api/account/kyc/statusV2/',
    antiPhishingCode: '/api/account/setting/anti-phishing-code/get/',
    privacy: (uid) => `/api/account/setting/privacy/${uid}/`,
    privacySet: '/api/account/setting/privacy/set/',
    acceptPromotion: '/api/account/setting/resetAcceptPromotion/',
    closeAccount: '/api/account/close',
    cardList: '/api/payment/card/bind/list/',
    accountList: '/api/payment/account/bind/list/',
    applyHistory: '/api/payment/account/apply/list/',
    whitelist: '/api/payment/withdraw/address/list/',
    whitelistCheck: '/api/payment/withdraw/address/check/',
    whitelistToggle: '/api/payment/withdraw/address/toggle/',
    whitelistDelete: (id) => `/api/payment/withdraw/address/delete/${id}`,
  },

  /* The Casino sidebar's two signed-in rows — `/favorite` and `/recent`. Read out of the pages'
     own chunks (`index-BtmCBJtH.js` and `index-1jGOl_3-.js`, neither in the mirror, both off
     `hash.game/assets/`), where each page is four lines over one POST:

       post("/game/home/my-favorite/", { page: 1, pageSize: mobile ? 39 : 40, areaCode })
       post("/game/home/recent/",      { page: 1, pageSize: mobile ? 39 : 40, areaCode })

     Note the pair does NOT carry the `/edge` prefix its recommend neighbours do — `Oe(e)` in
     Enter-MsmOuq5R.js adds that only for the selection feeds.

     BOTH WERE PROBED AND BOTH ANSWER `{"code":6002,"msg":"User information expired..."}` on
     hash.game, which is the payment family's envelope rather than the transaction pane's bare
     403. A visitor's own favourites are per-account by nature, so this is the expected side of
     the split the `game/support` catalogues sit on the other side of — and it is why the two
     fixtures are empty lists rather than reconstructions. See pages/GameCollection. */
  collection: {
    favorite: '/api/game/home/my-favorite/',
    recent: '/api/game/home/recent/',
  },

  /* ------------------------------------------------------------------- not yet known at all
   *
   * The casino catalogue, the Explore feed and the promotions list have no captured request.
   * `src/data/games.js` was generated from two game feeds whose URLs were not recorded, so
   * these are placeholders shaped like their neighbours above and WILL need correcting against
   * the real backend. They are grouped here rather than scattered so that correcting them is
   * one edit in one file. */
  games: '/api/game/support/home/game-list/',
  providers: '/api/game/support/home/provider-list/',
  /* NO LONGER A PLACEHOLDER — read out of the page's own chunk, `index-CMExrEqM.js`, which was
     recovered off `hash.game/assets/` by resolving `L.Promotion` -> `Aa` -> its import in
     `Enter-MsmOuq5R.js`. The call is a POST carrying
     `{areaCode, env: isAPP ? "APP" : mobile ? "H5" : "WEB", level, vip, lang, archived, page,
     pageSize}` — `env` is what makes the phone's tab strip one entry shorter than the desktop's,
     and `archived` is the whole of what the Archived button does. It answers 403 unauthenticated
     for every combination probed, so the fixtures stay; the PATH is now the real one. */
  promotions: '/api/home/main/event-pageList/',
  /* THE WAGER CONTEST — NO LONGER INVENTED. `dailyContest` used to be a made-up
     `/activity/contest/wager/rank/`, written on the reasoning that a chunk carries markup and
     not requests. That was true of the pass that only wanted markup: `Contest-Uqb1GQAo.js`
     opens with its own request module, `G = {api_info, api_list, api_rank, api_prev}`, and all
     four paths are spelled out there. Re-read a recovered chunk for its API namespace before
     inventing a path.

     THREE OF THE FOUR ANSWER UNAUTHENTICATED on hash.game and the fourth does not, which is
     the split the `game/support` family has demonstrated repeatedly — a contest standing is a
     public leaderboard, a visitor's own position in it is not. Probed, not assumed:

       infos  ->  the ladder: winnerNumber 10, userBonusRate [.5 .25 .12 .06 .03 .015 .009
                  .007 .005 .004], baseBonus, wagerCurrency, start/end instants
       list   ->  the active standings, `player: "****"` sentinel included
       last   ->  the previous round's players, which is where Last Champion comes from
       rank   ->  6002. Per-account, and the reason `services/contest.js` falls back to the
                  store's own declared default rather than inventing a position.

     `<type>` is `daily` | `weekly` | `monthly` (`E` in the chunk); only daily is built. */
  contestInfos: '/api/activity/contest/infos/',
  contestList: (type = 'daily') => `/api/activity/contest/${type}/list/`,
  contestPrev: (type = 'daily') => `/api/activity/contest/${type}/last/`,
  contestRank: (type = 'daily') => `/api/activity/contest/${type}/rank/`,
  /* The weekly raffle, and THESE ARE THE SITE'S OWN PATHS NOW rather than the inventions that
     stood here. `index-BLT5gN04.js` is not in the mirror — which is why they were invented — but
     it is on `hash.game/assets/` under the same hash the route already names, and the store
     inside it wires all four calls:

       Promise.all([ F().get("/raffleDeal/currentInfo/"),
                     F().post("/raffleDeal/lastPeriodId/", {page, pageSize}) ])
       F().post("/raffleDeal/winnersList/", {periodId, page, pageSize})
       F().post("/raffleDeal/myTickets/", {periodId, onlyWinning, page, pageSize})

     `currentInfo` carries `lastList` (the ticker) and `raffleWeekly` (period, totals, drawTime);
     `lastPeriodId` is the draw picker's own list. None of them answers unauthenticated — checked,
     as everywhere else — so the fixtures stay, but the seam is now the real shape. */
  raffle: {
    current: '/api/raffleDeal/currentInfo/',
    periodIds: '/api/raffleDeal/lastPeriodId/',
    winners: '/api/raffleDeal/winnersList/',
    myTickets: '/api/raffleDeal/myTickets/',
  },

  /* The global chat drawer. Every path is READ OUT OF THE SAVED BUNDLE — `Enter-MsmOuq5R.js`
     holds the chat store itself, socket and all, so these are the site's own strings rather
     than inventions. What differs between them is only whether they answer:

       roomList    ANSWERS UNAUTHENTICATED. A room catalogue is not per-account, so it lands on
                   the answering side of the split `game/support` has demonstrated repeatedly.
                   The response is `src/data/chatRooms.js`, captured verbatim.
       pinnedMsg   ANSWERS TOO, and returns a real pinned message for room 100.
       send        authenticated, and there is nothing to post to.
       remove      authenticated. `/chat/remove/<id>/`, the moderator delete.
       block       authenticated. `/chat/block/<id>/`.

     THE MESSAGES THEMSELVES ARE NOT HERE AND NEVER WERE: the feed is a WEBSOCKET, joined per
     room and pushed as protobuf frames (`Ct("chat", handler)` in the store), so there is no
     history endpoint to call and no response that could have been captured. That is why
     components/Chat/messages.js is a screenshot transcription rather than a payload — the one
     fixture in this feature with no better source available. */
  chat: {
    roomList: '/api/chat/room/list/',
    pinnedMsg: (roomId) => `/api/chat/room/${roomId}/pinned-msg/`,
    send: (roomId) => `/api/chat/room/${roomId}/send/`,
    remove: (chatId) => `/api/chat/remove/${chatId}/`,
    block: (userId) => `/api/chat/block/${userId}/`,
    /* The trophy's leaderboard, out of `index-CUBJDfzw.js` itself rather than the store — and it
       does not live under `/chat/` at all, which is why an earlier note here guessed it was the
       daily contest's feed. It is a `game/support` path, and it ANSWERS UNAUTHENTICATED like
       every other catalogue in that family; the response is `src/data/richList.js`.

       ONE WRINKLE, and it is worth carrying forward: the chunk calls it with `post()` and a POST
       answers 403, while a GET returns the board in full. A path that looks shut on the verb the
       source uses may not be shut. */
    richList: '/api/game/support/rich-list/get/',
  },
};


/* ─────────────────────────────────────────────────────────────── the iBitPlay platform ─────
 *
 * A SECOND MAP, deliberately kept apart from the one above rather than merged into it.
 *
 * Everything in `ENDPOINTS` is bc.game's own path — captured under `bc.game/bc.game/api/` or
 * read out of the saved JS — and its value is documentation of the original whether or not
 * anything ever calls it. These are the paths of the backend in `backend copy/`, which is a
 * different product with a different envelope, a different auth scheme and a different route
 * grammar (`/api/v1/<service>/<module>/…`, see its `docs/API-ROUTES.md` §1). Folding the two
 * together would lose the one distinction that matters at a call site: whether a path is
 * evidence of what bc.game does, or a route something here actually fetches.
 *
 * So a live read names `PLATFORM.user.auth.login` and says what it is. Grouped by that
 * backend's own service and module names, because that is how its documentation is indexed and
 * a name that matches is a name somebody can look up.
 */
/* PLACEHOLDER — bc.game's per-game detail read behind `/game/:gameUnique`. Never captured: the
   game page's chunk is not in the mirror and the route was not exercised. Shaped like its
   neighbours; `services/game.js` answers it from `data/games.js`. */
export const GAME_DETAIL = '/api/game/detail/';

export const PLATFORM = {
  /* casino-service. Its bet-history is the only route in this map outside `user`, and it sits
     here rather than in a sibling file because one page reads it. Filters are `page`, `limit`,
     `from`, `to`, `search` and `source` — so unlike the wallet ledger it DOES take a date range,
     which is what lets the pane time filter reach the server. `/live` is public. */
  casino: {
    betHistory: '/api/v1/casino/bet-history',
    betHistoryStats: '/api/v1/casino/bet-history/stats',
    betHistoryLive: '/api/v1/casino/bet-history/live',

    /* ── ADDED 2026-09-04, gaps 7, 13 and 18 ─────────────────────────────────────────────────
       `leaderboard` and `topWins` are PUBLIC and name nobody: the board masks players to
       `Player <last four of id>` and the wins list carries no identity at all, which is what
       `betHistoryLive` beside it already does and what `HIDDEN_NAME` expects.

       The board is ranked by stake COUNT rather than money — that has no currency and is exact
       across a mix of sources, where summing a USDT stake with an INR one is not. It says which
       sources it summed in `scope`, and `total` is the whole field, not the page.

       `betDetail` is the caller's OWN bet; a foreign id and an absent one both answer 404. */
    leaderboard: '/api/v1/casino/bet-history/leaderboard',
    leaderboardMe: '/api/v1/casino/bet-history/leaderboard/me',
    topWins: '/api/v1/casino/bet-history/top-wins',
    betDetail: (betId) => `/api/v1/casino/bet-history/${betId}`,

    /* THREE CATALOGUES AND ONLY ONE IS POPULATED, which is the whole of why `services/originals.js`
       wires BC Originals and nothing else. `inHouseGames` is the house's own — 20 active rows in
       `js_games`, seeded by their `scripts/seed-data.js` — and is public.

       `aggregatorGames` and `aggregatorProviders` read the GIS/Slotegrator sync tables and answer
       `[]` because nothing has synced and nothing can: `GIS_MERCHANT_ID` and `GIS_MERCHANT_KEY` are
       `optionalStr()` in their casino config and absent from `.env`. `stats` is the route this
       plan was once mis-read from — it reports `total_games: 0`, which is true of the aggregator
       and of neither of the other two. The Hub family refuses by name,
       `CATALOGUE_NOT_CONFIGURED`, for want of `CASINO_HUB_KEY`. All four are declared so the next
       person probes rather than re-derives; none is called.

       `launch` is the real launch route and takes a player token. Nothing here opens a game — this
       build has no game view — so a tile's href stays bc.game's own `/game/:slug`. */
    /* ── ADDED 2026-09-04, gap 8's first half ────────────────────────────────────────────────
       A PLAYER'S OWN FREESPIN CAMPAIGNS, and the only player-facing read `gis_freespins` has
       ever had: the three routes that already existed over that table are all STAFF ones — grant,
       fetch-by-campaign-id, cancel — so the Free Plays dialog has shown "Free Spins 0" since it
       was built because nothing could tell it otherwise.

       IT DOES NOT NEED THE GIS PROVIDER, which is the reason it could be built at all while the
       rest of that module refuses for want of `GIS_MERCHANT_KEY`: the campaign rows are written
       locally by `setFreespin` after the provider confirms, so listing what we hold is answerable
       today. `quantity_left` is only as fresh as the last provider callback, which with no
       provider means it never moves — a staleness limit, not a correctness one. */
    myFreespins: '/api/v1/casino/gis/freespins/mine',

    inHouseGames: '/api/v1/casino/js-games/v1/games',
    aggregatorGames: '/api/v1/casino/games',
    aggregatorProviders: '/api/v1/casino/games/providers',
    aggregatorStats: '/api/v1/casino/games/stats',
    launch: '/api/v1/casino/catalogue/launch',
    /* `/recent`'s list, and the one route in this group that needs a token. It reads
       `gis_recently_played`, which ONLY the GIS launch path writes — the twenty in-house games
       record nothing, checked by playing four and re-reading it — so it answers `[]` on this
       deployment however much anybody plays. Wired anyway, with the mapping in
       `services/collection.js`, because the day GIS is provisioned it is correct; the gap is
       recorded in `docs/backend-gaps.md`. `limit` caps at 50, and the page asks for 39 or 40. */
    recentlyPlayed: '/api/v1/casino/games/recently-played',
    /* The twenty in-house games' launch — `POST {gameUid, currencyCode}` → `{gameLaunchUrl,
       sessionToken}`. It RELAYS the URL from an external game-client host (`JSGAMES_V1_BASE_URL`
       and friends), none of which is configured, so today it cannot succeed; `services/game.js`
       says what the page does with that. Distinct from `launch` above, which is the Casino Hub's. */
    inHouseLaunch: '/api/v1/casino/js-games/v1/launch',
    /* The BC Originals on the Original Games Aggregator — `POST {gameCode, currencyCode (INR|USDT),
       language, device}` → `{gameLaunchUrl, sessionId, mode}` (casino-service modules/original-games). */
    originalsLaunch: '/api/v1/casino/original-games/launch',
    /* `GET` → `[{game_code, name, image}]`, the aggregator's catalogue; [] while Originals are off. */
    originalsGames: '/api/v1/casino/original-games/games',

    /* Favourites — `GET`, `PUT :gameRef`, `DELETE :gameRef`, all added to the platform for this
       page (`docs/backend-gaps.md`, Part 4b.7). They sit under `/casino/games/` rather than the
       `/user/favourites` gap 1 proposed, because resolving a favourite means reading the two game
       catalogues and those live in casino-service's domain — the route file says the whole of it.

       A ROW ANSWERS `{game_ref, source, created_at, game}` AND `game` IS OFTEN `null`. The
       reference is stored as the client gave it and resolved against `js_games.game_uid` and
       `gisgamesnew.uuid` on the way out; the aggregator catalogue is unsynced on this delivery, so
       anything but the twenty in-house games comes back unresolved BY DESIGN. `collection.js`
       fills those from `data/games.js`, which is the catalogue this front-end already ships. */
    favourites: '/api/v1/casino/games/favourites',
    favourite: (gameRef) => `/api/v1/casino/games/favourites/${encodeURIComponent(gameRef)}`,
  },

  /* admin-service's PUBLIC reads. `public` there is the AUDIENCE, not a path segment — they
     mount under `/admin/` beside the guarded routes and simply carry no guard, which is right
     for these: a visitor's browser fetches the home hero before there is anyone to
     authenticate. An inactive placement is hidden from an unauthenticated caller, so a banner
     taken down stops being fetchable by anyone who knows its name.

     ── A BANNER ROW IS AN IMAGE AND NOTHING ELSE, WHICH DECIDES HOW FAR THIS CAN GO ──────────

     `banners` answers the ROWS AS `data` WITH THE COUNT IN `meta`, not the `{total, rows}` the
     service's own `list()` returns — the envelope reshapes it on the way out, so `request()`
     hands back a plain ARRAY of `{id, type, contentType, byteSize, active, uploadedBy,
     createdAt, updatedAt, url}`. Read off the wire, because the service source says otherwise.
     Ordered by `type` ASC, and `type` is UNIQUE — one row per placement. The column list is
     from the live table rather than the model file, which is stale and declares three of the
     ten.

     There is no title, no description, no link, no tag and no sort column anywhere in that
     table. So the platform can say WHICH ARTWORK a placement shows and cannot say what the
     card says or where it goes. `services/banner.js` is where that limit is handled and it is
     the reason the captured text stays local.

     `banner(type)` is the single-row read and answers `404 BANNERS_NOT_FOUND` rather than an
     empty body, so it needs catching rather than reading — `banners` is the safer call and the
     one this build makes. `bannerImage(type)` is the bytes, cached 300s; it is NOT a JSON
     route and must not go through `request()`. Two more public reads sit beside these and are
     not wired: `/admin/site-config/public` (a ~60-key feature-flag map, including which
     currencies the operator enabled) and `/admin/blogs` (three seeded posts). */
  site: {
    /* THE FEATURE-FLAG MAP, and the widest single public read on the platform. **ONE FLAT
       OBJECT OF 76 KEYS**, not the `{flags, amounts}` the service's own local variable names
       suggest — `publicSettings()` builds `flags` and `amounts` separately and spreads them
       together, so `request()` hands back `{casino: true, …, registerbonus: "…"}` with the four
       decimal STRINGS (`registerbonus`, `affiliatebonus`, `comissionpercent`, `clubrake`) sitting
       beside the booleans. Read off the wire; an earlier draft of this note had the wrapper, the
       same mistake the banners list note made for the same reason.

       The flags come in four groups: top-level features (`casino`, `lotto`, `vipclub`, `bonus`,
       `affiliate`, `giftcards`, `wheelspin`, `provablyfair`…), game categories and providers
       (`originals`, `livegames`, `slotsgames`, `evolution`, `pragmaticslots`, `pgsoft`, `jili`,
       `netent`…), the eleven `home_*` page sections, and — the group this build reads — ONE PER
       WALLET CURRENCY, lower-cased: `inr`, `aed`, `pkr`, `bdt`, `npr`, `mvr`, `eur`, plus
       `cryptocoin` as a master switch over `btc`, `eth`, `usdt`, `bjb`, `nc`, `sc` and the rest.

       **AN ABSENT FLAG MEANS ON, and that rule is the backend's own** — `publicSettings()`
       defaults a missing row to `true` for every key, on the grounds that an unconfigured
       deployment is not one that switched a section off. `services/auth.js` defaults the same
       way, including when the read itself fails, so a 500 here can never empty a wallet.

       `eur` was added to this map by migration 037: the wallet has 28 currency columns and the
       flag list carried 27, so EUR was the one currency an operator could not switch off. */
    config: '/api/v1/admin/site-config/public',
    /* THE OWNER'S COIN LIST: only the coins switched on (owner plan, site admin, not retired),
       each with its enabled networks `[{key, name}]`. An allow-list, read beside the flags above
       because an owner-created coin has a row here and no flag there. See services/currencies.js. */
    currencies: '/api/v1/admin/currencies/public',
    /* THE AVATAR CATALOGUE the site admin uploads: `[{id, url, minLevel, sort}]`, enabled only,
       `url` a path on this API. `minLevel` is the VIP level that unlocks it. See services/avatars.js. */
    avatars: '/api/v1/admin/avatars/public',
    banners: '/api/v1/admin/banners',
    banner: (type) => `/api/v1/admin/banners/${type}`,
    bannerImage: (type) => `/api/v1/admin/banners/image/${encodeURIComponent(type)}`,
  },

  user: {
    /* API-ROUTES.md → user-service → `auth`. `login` and `refresh` are public; the rest carry
       the bearer token. `refresh` is declared here for completeness and is NOT read from here —
       the transport owns its own re-authentication and holds that path inline, because a retry
       reaching for an import is a retry that cannot run until the import resolves. */
    auth: {
      login: '/api/v1/user/auth/login',
      refresh: '/api/v1/user/auth/refresh',
      logout: '/api/v1/user/auth/logout',
      me: '/api/v1/user/auth/me',
      sessions: '/api/v1/user/auth/sessions',
      changePassword: '/api/v1/user/auth/change-password',

      /* ── ADDED 2026-09-04, gaps 12 and 25 ────────────────────────────────────────────────
         `register`, `forgotPassword` and `resetPassword` are PUBLIC and are the reason a
         visitor can now create an account at all — until they existed, sign-up had no route on
         this platform and the tab was decorative. The three are metered at 5 an hour between
         them, so a form that retries on a network blip will spend that budget.

         `revokeSession` takes the id from `sessions` above. It stops the device REFRESHING;
         an access token already issued lives to its expiry, which is how `logout` behaves too
         and is a property of the platform rather than of this route. */
      register: '/api/v1/user/auth/register',
      forgotPassword: '/api/v1/user/auth/forgot-password',
      resetPassword: '/api/v1/user/auth/reset-password',
      revokeSession: (id) => `/api/v1/user/auth/sessions/${id}`,
    },

    /* ── The notification inbox, gap 10 ──────────────────────────────────────────────────────
       A user-service module that owns no table: it proxies admin-service, which owns the sending
       side and `user_notifications`. `list` is paginated and carries its total in `meta`.

       THERE IS NO DELETE. bc.game's drawer has one per row and this platform has no route behind
       it — `markRead` is the only write a player has. `services/notification.js` keeps the delete
       on its fixture arm rather than pretending. */
    notifications: {
      list: '/api/v1/user/notifications',
      unreadCount: '/api/v1/user/notifications/unread-count',
      readOne: (id) => `/api/v1/user/notifications/${id}/read`,
      readAll: '/api/v1/user/notifications/read-all',
    },

    /* ── The VIP ladder, gap 4 ───────────────────────────────────────────────────────────────
       `levels` is PUBLIC and is 75 bands of `{level, minXp, maxXp, card}` — the top band's
       `maxXp` is `null` because the ladder is open-ended there. `standing` is the caller's own
       and returns the same object `/user/bonus` carries under its `vip` key, without the six
       bonus types beside it. */
    vip: {
      levels: '/api/v1/user/vip/levels',
      standing: '/api/v1/user/vip',
    },

    /* ── The withdrawal address whitelist, gap 16 ────────────────────────────────────────────
       `enforcement` is the master switch and lives on the account, not on a row. Turning it ON
       against an empty list is refused (`WHITELIST_EMPTY_WHITELIST`), and removing the last
       address turns it off — both halves of the one way this feature could lock a player out of
       their own money. Only the LABEL is editable; changing a destination is delete-then-add. */
    whitelist: {
      list: '/api/v1/user/withdrawals/whitelist',
      add: '/api/v1/user/withdrawals/whitelist',
      rename: (id) => `/api/v1/user/withdrawals/whitelist/${id}`,
      remove: (id) => `/api/v1/user/withdrawals/whitelist/${id}`,
      enforcement: '/api/v1/user/withdrawals/whitelist/enforcement',
    },

    /* ── Change the account's e-mail, gap 23 ─────────────────────────────────────────────────
       Two steps and the split is the security property: the code is verified and then SPENT, so
       one verification authorises one change. The code is checked against the NEW address,
       because that is where password reset will deliver afterwards. */
    changeEmail: '/api/v1/user/profile/change-email',

    /* ── The one-time code that authorises the change above, wired 2026-09-04 ────────────────
       PUBLIC — `email/routes/public.routes.js` — and deliberately so for this purpose: the code
       goes to the address the player is moving TO, which by definition has no account on it yet.
       `purpose` is an enum on the wire and `change-email` is the only value this build sends.

       There is NO "verify my current e-mail" counterpart, and that is a platform fact rather
       than a missing route: `users` has no `email_verified` column at all, so nothing could
       record the result. The Security tile's `emailVerified` is one of the session fields
       `services/auth.js` marks as invented. See components/modals/UserAction. */
    emailOtp: '/api/v1/user/email/otp',

    /* ── Another player's profile, gap 17 ────────────────────────────────────────────────────
       PUBLIC, because the thing that opens it is a name in chat or on a leaderboard. Username,
       avatar, computed VIP level, join date and bet/win counts — no email, phone, country or
       balance. `bets`/`wins` are `null` rather than 0 when casino-service could not be read. */
    publicProfile: (userId) => `/api/v1/user/profile/${userId}/public`,

    /* ── Profile medals, gap 9 ───────────────────────────────────────────────────────────────
       `medals` is the caller's own catalogue (every medal, locked or not, with progress and
       holder counts; signed in). `publicMedals` is another player's UNLOCKED medals only, no
       figures; public. Both carry `medalCount`. Keys are the reference's `type` + `subType`, so
       the local artwork resolves unchanged. */
    medals: '/api/v1/user/medals',
    publicMedals: (userId) => `/api/v1/user/profile/${userId}/medals`,

    /* `profile` AND `auth/me` READ THE SAME ROW AND ANSWER DIFFERENTLY, which is worth knowing
       before picking one: `me` returns the raw columns (`two_fa_status`, `referalcode`,
       `created_estimated`) and `profile` returns them mapped (`twoFactorEnabled`,
       `referralCode`, `joinedAt`) plus `gamesPlayed`. Both checked against the running server
       rather than inferred from the source. This build reads `profile`. */
    profile: {
      get: '/api/v1/user/profile',
      /* `POST {avatarId}` — wear a catalogue avatar; answers the updated profile. 403
         `AVATAR_LOCKED` below its `minLevel`, 404 `AVATAR_NOT_FOUND`. */
      avatar: '/api/v1/user/profile/avatar',
      referral: '/api/v1/user/profile/referral',
      verifyReferral: (code) => `/api/v1/user/profile/verify-referral/${code}`,
    },

    /* ONE OBJECT KEYED BY CURRENCY CODE, not a list of rows — 28 keys, one per column on that
       platform's `credits` table, every value a decimal STRING. `services/auth.js` holds the
       adapter onto this build's wallet rows, and the note there says what the 28 do not cover. */
    /* PRICE IN USD PER UNIT — the same semantics as bc.game's own `usdPrice` table, which is what
       lets one accessor serve both. Checked against known values rather than assumed: BTC 65000,
       ETH 3200, INR 0.012, AED 0.27, USDT 1.

       Two things to know before reading anything off it. It answers **25 rows against the
       wallet's 28 currencies** — `services/exchangeRate.js` says what happens to the three with
       no rate. And the rows are **seeded and static**: this platform has no FX poller, so a rate
       changes when an operator edits it and not otherwise. */
    exchangeRate: {
      rates: '/api/v1/user/exchange-rate/rates',
      rate: (currency) => `/api/v1/user/exchange-rate/rates/${currency}`,
      convert: '/api/v1/user/exchange-rate/convert',
    },

    /* Five fields — `{theme, language, emailNotifications, pushNotifications, hideBalance}` —
       against a Preferences pane built for bc.game's much larger `setting` block, and only one of
       them has a control here that both exists and moves. `services/settings.js` records which,
       and why the other four are left alone rather than mapped onto the nearest-looking switch. */
    /* THIN, and thinner than the pane it feeds. `affiliate` answers the code and a link and
       nothing else; `team` adds a member count; `rewards` a total. There is no equivalent of
       bc.game’s ten-figure dashboard, so most of that card keeps the request module’s own
       declared default — see `services/referral.js`.

       `referralLink` IS DELIBERATELY UNUSED. It is `http://localhost:3000/referal/<code>` — the
       PLATFORM’S own front-end origin, baked into its config — so printing it here would hand a
       friend a link into a different application. The code is taken live and the link is built
       from this app’s own origin, which is what bc.game does too (`location.host`). */
    affiliate: {
      summary: '/api/v1/user/affiliate',
      team: '/api/v1/user/affiliate/team',
      rewards: '/api/v1/user/affiliate/rewards',
      unclaimed: '/api/v1/user/affiliate/rewards/unclaimed',
      claim: '/api/v1/user/affiliate/rewards/claim',
      claimAll: '/api/v1/user/affiliate/rewards/claim-all',
    },
    preferences: '/api/v1/user/preferences',

    /* ── The rollover task list, gap 14 ──────────────────────────────────────────────────────
       A LIST OF ONE, and `scope: 'account'` says so. This platform's wagering requirement is
       account-wide (approved deposits x multiplier); nothing attaches one to an individual
       bonus, so bc.game's per-bonus table has no equivalent here. A zero target lists NO task
       rather than a completed one — never having deposited is not the same as having cleared it.
       `docs/backend-gaps.md` Part 4b.16 argues it in full. */
    wagerTasks: '/api/v1/user/wager/tasks',
    /* The account's turnover in USD: `{ target, wagered, remaining, multiplier, met, totalDeposited }`,
       answered even before any deposit (target 0). Drives the Rollover page's summary strip. */
    wagerProgress: '/api/v1/user/wager/progress',

    /* KYC. `status` answers `{status, submitted}` — ONE status for the account
       (`NotSubmitted` | `Unverified` | `Pending` | `Verified` | `Rejected`) and no notion of a
       level, because the submission itself has none: a name, a date of birth, an address and one
       identity document, with no `level` field anywhere in the module. `services/settings.js`
       maps it onto bc.game's Basic Verification and says why that is the whole of it rather than
       half a ladder. `submit` and the document read are declared and not called — the KYC form is
       not built. */
    kyc: {
      status: '/api/v1/user/kyc/status',
      submit: '/api/v1/user/kyc/submit',
      document: (kycId, field) => `/api/v1/user/kyc/documents/${kycId}/${field}`,
    },

    /* 2FA. DECLARED AND DELIBERATELY NOT READ: the Security tile branches on
       `session.google2StepAuth`, which `services/auth.js` already fills from the profile's
       `twoFactorEnabled` — and the two agree, checked on the running server rather than assumed
       (`profile.twoFactorEnabled` false and `status.isEnabled` false, same account, same second).
       A second call would ask the same column the same question. `hasInitiated` is the one field
       the profile does not carry, and no bc.game tile has a half-enrolled state to show it in.
       The four writes are the enable/verify flow, which is not built. */
    twoFactor: {
      status: '/api/v1/user/2fa/status',
      enable: '/api/v1/user/2fa/enable',
      setupVerify: '/api/v1/user/2fa/setup-verify',
      verify: '/api/v1/user/2fa/verify',
      disable: '/api/v1/user/2fa/disable',
    },

    /* `estimate` answers the whole quote in one read — `{fromCurrency, toCurrency, amount,
       feePercentage, feeAmount, amountAfterFee, converted, usdRateFrom, usdRateTo}` — where
       bc.game's `/price/` answers only the two rates and the fee and leaves the arithmetic to the
       page. Three things about it:

         · `feePercentage` is a FRACTION, not a percent: `0.15` on a 1000 INR swap takes 150. The
           backend's own table is `{inr: 0.15, bjt: 0, default: 0.01}`, checked rather than
           inferred from one response.
         · it REFUSES `fromCurrency === toCurrency` with a 422, which bc.game's does not.
         · the currency fields are BARE codes — `INR`, not `INRFIAT`.

       `balances` is deliberately not wired; see the note in `services/swap.js` for why a
       funded-only list is the wrong list for this page. */
    swap: {
      balances: '/api/v1/user/swap/balances',
      estimate: '/api/v1/user/swap/estimate',
      trade: '/api/v1/user/swap',
      history: '/api/v1/user/swap/history',
    },

    /* THE MANUAL FIAT DEPOSIT, which is a different object from anything in `history` below even
       though the same record shows up there. A player states that a bank transfer was sent —
       amount, currency, a required `transactionId` (the bank reference) and optionally the bank,
       account, IFSC, holder name or UPI id — with a proof-of-transfer image, and staff move it
       from `pending` to `approved` or `rejected`. `POST` is MULTIPART, `screenshot` being the file
       field, 5 MB over JPEG/PNG/PDF with the magic-byte check the KYC upload has.

       `list` answers the visitor's own, with `depositId`, `hasScreenshot` and `adminComment` —
       THE LAST OF WHICH EXISTS NOWHERE ELSE. `/user/history/deposits` merges seven tables into one
       shape and carries neither the comment nor the image, so a rejected deposit could be seen and
       not explained until `services/fiatDeposit.js` read this instead.

       `screenshot` is bytes behind auth, so it is fetched as a Blob rather than put in an
       `<img src>` — the same handling the KYC document gets. */
    /* THE TWO WITHDRAWAL RAILS, each with its own list and its own shape — there is no single
       "withdrawal" object on this platform, which is why the detail dialog takes a rail.

       `fiat` presents `{withdrawalId, userId, amount, currency, accountHolderName, bankName,
       upiId, status, requestedAt}` and DELIBERATELY WITHHOLDS `accountNumber` and `ifscCode`
       behind its `forStaff` gate. `crypto` presents `{id, userId, amount, coin, chain, wallet,
       status, txid, date}` with the WALLET MASKED (`0x1234…5678`) and `note`, `decidedBy`,
       `decidedAt` staff-only — so a player cannot read why a crypto withdrawal was rejected,
       where a fiat DEPOSIT's `adminComment` is theirs to read. Recorded rather than worked
       around; `docs/backend-gaps.md` carries it.

       Both are paginated `{count, rows}` shapes flattened by the envelope, as the banners list
       is — read off the wire. */
    withdrawals: {
      fiat: '/api/v1/user/withdrawals/fiat',
      crypto: '/api/v1/user/withdrawals/crypto',
      /* `{policy, ok, missing, kyc, wager, bonusForfeitRequired}` — what still stands between this
         player and a withdrawal; read before the fiat form. */
      requirements: '/api/v1/user/withdrawals/requirements',
    },

    /* The player's saved payout accounts — `{id, method: 'bank'|'upi', accountHolderName,
       bankName, accountNumberMasked, ifscCode, upiId, isDefault}`. The fiat withdraw form's
       "Withdraw With" select; `id` goes back as `bankAccountId`. */
    bankAccounts: '/api/v1/user/bank-accounts',

    fiatDeposits: {
      list: '/api/v1/user/deposits/fiat',
      one: (depositId) => `/api/v1/user/deposits/fiat/${depositId}`,
      screenshot: (depositId) => `/api/v1/user/deposits/fiat/${depositId}/screenshot`,
    },

    /* DEPOSIT AND WITHDRAWAL HISTORY — the Transaction pane's second and third tabs.
       `deposits` and `withdrawals` are the paged lists; `combined` is both in one call and is not
       read, because the pane asks for one type at a time.

       ── SEVEN TABLES BEHIND TWO ROUTES, MERGED IN MEMORY ─────────────────────────────────────

       Their `transactionHistory` module describes it at length and it is worth knowing before
       reading a row: a deposit can arrive on four rails (crypto checkout, manual bank transfer,
       A-Pay, WayPay) and a withdrawal on three, the tables agree on neither column names nor id
       types nor status vocabulary, and the service queries each through its own model and merges
       the pages by date. So `method` says which rail a row came from, and every row arrives in
       ONE shape — `{id, reference, amount, currency, status, details, date, kind, method, type}`.

       **`status` IS A NORMALISED WORD, NOT A CODE**, which is the one thing that does not map
       straight onto this build: bc.game's own helpers switch on an integer. `services/transaction.js`
       carries the adapter and says why it goes that way round.

       Filters are `currency`, `status`, `from`, `to`, `limit`, `offset` — so unlike the wallet
       ledger these two DO take a date range, and the pane's time filter reaches the server. */
    history: {
      combined: '/api/v1/user/history',
      deposits: '/api/v1/user/history/deposits',
      withdrawals: '/api/v1/user/history/withdrawals',
      transfers: '/api/v1/user/history/transfers',
    },

    /* THE RECURRING BONUSES, AND THIS IS THE FIRST PLATFORM READ THAT ANSWERS A BUILT PAGE WITH
       SOMETHING OTHER THAN ZEROS. `summary` carries three of `/bonus`'s six reward types —
       `types.daily`, `.weekly`, `.monthly`, each `{amount, totalPaid, minVipLevel, eligible,
       claimable, award}` — plus the account's VIP position (`level`, `card`, `wager`,
       `nextLevel`, `wagerToNextLevel`, `progressPct`) and its bonus currency.

       `eligible` and `claimable` ARE DIFFERENT QUESTIONS and the pane needs the second: eligible
       is "your VIP level reaches `minVipLevel`" (20/25/30 for the three), claimable is "and there
       is something to take". A row can be eligible with nothing accrued.

       The other four routes are a redeem-code feature bc.game also has and this build does not:
       `codes` and `history` are the visitor's own (both paginated, both empty here), `events` and
       `games` are the campaign catalogue, `record` answers `404 BONUS_NO_BONUS_RECORD` until the
       account has one — an error rather than an empty body, so it needs catching rather than
       reading. Declared for the redeem input, which is not built. */
    bonus: {
      summary: '/api/v1/user/bonus',
      claim: (type) => `/api/v1/user/bonus/claim/${type}`,
      codes: '/api/v1/user/bonus/codes',
      events: '/api/v1/user/bonus/events',
      games: '/api/v1/user/bonus/games',
      history: '/api/v1/user/bonus/history',
      record: '/api/v1/user/bonus/record',
      redeem: '/api/v1/user/bonus/redeem',
    },

    /* Gift cards — user-service `modules/gift-cards`, behind the owner's `gift_cards` feature (and
       its `giftcards` site flag) and refused for an agent's player (`denyAgentPlayer('promotions')`).
       `redeem` takes `{code}` (the card's key, case-sensitive) and ACTIVATES the card for the
       player; `claim` takes `{giftCardId}`, checks the deposit/wager conditions and credits the
       wallet. The sidebar's Gift Card dialog calls both, in that order. */
    giftCards: {
      mine: '/api/v1/user/gift-cards',
      redeem: '/api/v1/user/gift-cards/redeem',
      claim: '/api/v1/user/gift-cards/claim',
    },

    /* The fourth of `/bonus`'s six types, and its own module rather than part of `bonus` — which
       is their arrangement, not a split of ours. `{amount, currency, claimable, minimum, rate}`,
       where `minimum` is the floor a claim has to clear and `rate` is the share of house edge
       returned. Note the currency is its OWN (`USDT` on a demo account) and need not match the
       bonus currency `summary` reports. */
    rakeback: {
      summary: '/api/v1/user/rakeback',
      claim: '/api/v1/user/rakeback/claim',
    },

    /* VAULT PRO, AND IT IS THE SAME NOUN FOR A DIFFERENT PRODUCT. bc.game's vault is instant in
       and out at a published APR; this one is a FIXED-TERM DEPOSIT — you pick a `lockPeriod` off
       `lockOptions`, the principal is unavailable until `endTime`, and `transferOut` names a
       `depositId` rather than an amount. Only the READ side maps, and `services/vault.js` says
       exactly how and what it leaves alone.

       Two things about the terms table, both read out of the source rather than off a response:

         · `rate` IS A PERCENTAGE, NOT A FRACTION. The validator says so in as many words —
           "Annual percentage: 7.5 means 7.5%" — where bc.game's `returnRatio` is `0.05` for 5%.
           A hundred-fold unit slip that would render "APR 750%" and look deliberate.
         · `lockOptions` ANSWERS `[]` on this delivery. Nothing seeds `vault_lock_rates`, so there
           are no terms on offer, which is also why `transferIn` can only ever answer
           `VAULT_LOCK_PERIOD_NOT_FOUND`.

       `interest` is the accrual ledger behind "Last Day's Return" and "Total Return". It answers,
       and it answers empty forever: `VaultInterestHistory` is READ in three places in
       `vault.service.js` and WRITTEN in none — there is no accrual job anywhere in the delivery,
       checked across the whole tree. So it is declared and deliberately not called; see the note
       at `getVaultAmountList`. */
    vault: {
      data: '/api/v1/user/vault',
      lockOptions: '/api/v1/user/vault/lock-options',
      interest: '/api/v1/user/vault/interest',
      transactions: '/api/v1/user/vault/transactions',
      transferIn: '/api/v1/user/vault/transfer-in',
      transferOut: '/api/v1/user/vault/transfer-out',
    },

    wallet: {
      balances: '/api/v1/user/wallet/balances',
      balance: (currency) => `/api/v1/user/wallet/balances/${currency}`,

      /* `history` is DEPOSITS AND WITHDRAWALS ONLY and answers outside the envelope; `ledger` is
         every money movement, which is what the Bill tab actually wants. Checked on an account
         with real activity: a swap writes two `ledger` rows (`TRANSFER_OUT` then `TRANSFER_IN`,
         each carrying a `description` and the balance after it) and nothing at all to `history`.
         Filters are `currency`, `reason`, `limit`, `offset` — note there is NO date range. */
      history: '/api/v1/user/wallet/history',
      ledger: '/api/v1/user/wallet/ledger',
    },
  },
};

export default ENDPOINTS;
