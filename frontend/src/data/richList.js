/* `GET /game/support/rich-list/get/` — THE CHAT DRAWER'S "BIGGEST WINNER TODAY" BOARD, AND IT IS
 * A LIVE RESPONSE RATHER THAN A CAPTURE.
 *
 * The `game/support` rule holding for a seventh family, after `system/conf/usdPrice`,
 * `system/conf/index/minimal`, `system/conf/currencyTokens`, `swap/config/`, `achievement/all/`
 * and `user/game/summary/`: a LEADERBOARD is public, a player's own place in one is not. Probed
 * rather than assumed, and with one wrinkle worth recording — **the chunk calls it with POST and
 * a POST answers 403; a GET answers in full.** So a path that looks shut on the verb the source
 * uses may not be; try the other one before writing the endpoint off.
 *
 * THE THREE ROWS ARE THE REFERENCE SCREENSHOT'S THREE PLAYERS, in its order, which is the
 * strongest confirmation available that this is the feed behind that panel — and `ndtrocal`'s
 * $55,863.34 matches it to the cent. The first two do not: the board is a running daily total, so
 * `mdublya` and `Mollymae` have moved on since the capture. That is drift in a live figure, not a
 * transcription error, and it is the same situation `data/achievements.js` records for its holder
 * counts. **Do not "correct" these back to the screenshot's numbers**; the response is the source.
 *
 * `upAmount` is a USD total already — `printCurrency(new Decimal(upAmount))` with no currency
 * argument, which defaults to USDFIAT, is the whole of what the row prints. `cpAmount` is the
 * per-coin breakdown behind it (note the negative rows: a day's profit nets across coins) and
 * `likedNumber` feeds a like button on the profile popup; neither is rendered by the panel.
 * `level` would drive a tier badge on a row that carried one — the chunk's row template has no
 * badge, so it is carried and unused.
 *
 * The avatars are real: `userId` resolves through `img2.distributedresourcestorage.com/avatar/
 * <id>/s`, the same host the weekly raffle's 47 came off. Two of these three share one default
 * image, which is what the capture shows too. `components/Chat/RichList.jsx` maps the ids to the
 * files on disk, as `pages/WeeklyRaffle/avatars.js` does for that page.
 */
const RICH_LIST = [
  {
    userId: 933731508656757,
    userName: 'mdublya',
    level: 15,
    likedNumber: 0,
    upAmount: '156700.24',
    cpAmount: [
      { currencyName: 'BCD', amount: '158613.35578472' },
      { currencyName: 'ETH', amount: '-0.26953503' },
      { currencyName: 'BC', amount: '-42978.23718423' },
    ],
  },
  {
    userId: 98927269,
    userName: 'Mollymae',
    level: 18,
    likedNumber: 0,
    upAmount: '59912.35',
    cpAmount: [
      { currencyName: 'USDT', amount: '67730.4415486' },
      { currencyName: 'BC', amount: '-118652.03207641' },
      { currencyName: 'BCD', amount: '-3958.02163321' },
    ],
  },
  {
    userId: 106213295,
    userName: 'ndtrocal',
    level: 15,
    likedNumber: 0,
    upAmount: '55863.34',
    cpAmount: [
      { currencyName: 'USDT', amount: '55863.34486267' },
    ],
  },
];

export default RICH_LIST;
