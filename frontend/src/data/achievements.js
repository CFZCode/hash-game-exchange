/* GENERATED from a live response. Regenerate rather than hand-edit; the recipe is at the bottom.
 *
 * `GET https://hash.game/api/game/support/achievement/all/` — and it ANSWERS UNAUTHENTICATED,
 * which is the `game/support` family paying off for the sixth time (after `system/conf/usdPrice`,
 * `system/conf/index/minimal`, `system/conf/currencyTokens`, `swap/config/` and
 * `user/game/summary/`). It is a rate-card rather than anything about an account: the medal
 * catalogue, how many players hold each one, and the per-medal progress bands.
 *
 * TWENTY-THREE MEDALS, and that is the count on the page rather than a coincidence: the titles map
 * (`os` in `Tool-CuKFgBKm.js`) has 21 entries, but type 17 — "TOP 1" — splits per coin into BTC,
 * DOGE, EOS and ETH, and type 9 is filtered out of every list the site renders. 21 - 1 + 4 = 23.
 *
 * THE FEED'S ORDER IS ARBITRARY and the page does not use it: the medals dialog sorts by `type`
 * ascending, and `ss` then moves ONE entry (see medals.js). Rows are kept in the response's own
 * order anyway, so a diff against a re-fetch is readable.
 *
 * THREE FIELDS ARE PER-ACCOUNT AND THEREFORE ZERO HERE. `medalCount` is 0, every `status` is "0"
 * (locked) and every `createTime` is 0, because a logged-out request has no account to report on.
 * `progress.current` is per-account too — the non-zero ones below (44521 wagered of 10,000,000;
 * 73 of 200) are the values the live service hands a visitor with no session, which is what the
 * capture's fresh account renders as well.
 *
 * `count` DRIFTS DAILY. The page says so itself — "Medal progression stats updated every 24
 * hours" — which is why these are within a few hundred of the capture's numbers rather than equal
 * to them (12765 against 12778 for Talkative, 94388403 against 94681236 for The Old-Timer). Not a
 * transcription error in either direction.
 */
export const ACHIEVEMENTS = [
  { type: 17, subType: 'ETH', status: '0', count: 2, createTime: 0, progress: null },
  { type: 15, subType: '0', status: '0', count: 94388403, createTime: 0, progress: null },
  { type: 14, subType: '0', status: '0', count: 14986, createTime: 0, progress: null },
  { type: 13, subType: '0', status: '0', count: 2697, createTime: 0, progress: { total: 10000000, current: 44521 } },
  { type: 12, subType: '0', status: '0', count: 25355, createTime: 0, progress: null },
  { type: 17, subType: 'BTC', status: '0', count: 9, createTime: 0, progress: null },
  { type: 1, subType: '0', status: '0', count: 12765, createTime: 0, progress: { total: 200, current: 1 } },
  { type: 11, subType: '0', status: '0', count: 2974, createTime: 0, progress: { total: 100, current: 0 } },
  { type: 2, subType: '0', status: '0', count: 6, createTime: 0, progress: null },
  { type: 10, subType: '0', status: '0', count: 1887, createTime: 0, progress: null },
  { type: 21, subType: '0', status: '0', count: 943, createTime: 0, progress: null },
  { type: 3, subType: '0', status: '0', count: 1, createTime: 0, progress: null },
  { type: 17, subType: 'DOGE', status: '0', count: 3, createTime: 0, progress: null },
  { type: 20, subType: '0', status: '0', count: 963, createTime: 0, progress: null },
  { type: 4, subType: '0', status: '0', count: 10, createTime: 0, progress: null },
  { type: 5, subType: '0', status: '0', count: 28, createTime: 0, progress: { total: 33, current: 0 } },
  { type: 17, subType: 'EOS', status: '0', count: 11, createTime: 0, progress: null },
  { type: 6, subType: '0', status: '0', count: 15400, createTime: 0, progress: { total: 99, current: 15 } },
  { type: 7, subType: '0', status: '0', count: 14054, createTime: 0, progress: { total: 200, current: 73 } },
  { type: 8, subType: '0', status: '0', count: 8771, createTime: 0, progress: null },
  { type: 19, subType: '0', status: '0', count: 898, createTime: 0, progress: null },
  { type: 18, subType: '0', status: '0', count: 105, createTime: 0, progress: { total: 3, current: 0 } },
  { type: 16, subType: '0', status: '0', count: 5763, createTime: 0, progress: { total: 99, current: 0 } },
];

/* `medalCount` — how many of the 23 this account holds. The live answer for a visitor is 0, and
   the capture's account is 0 too. It drives the Rewards card's progress bar and the "0/20
   Completed" readout, so it is kept as its own export rather than being inlined as a zero. */
export const MEDAL_COUNT = 0;

/* THE ONE RECONSTRUCTED FIELD ON THIS PAGE, and the response says so by being empty.
 *
 * `bonusStatus` comes back `[]` for a visitor, yet the capture shows FOUR reward chests beside the
 * flag. The four are not invented: the chunk's own `switch (row.type)` decorates each one, and that
 * switch IS the table —
 *
 *   default -> text "5",   iron   / ironOpen,   num 5
 *   case 2  -> text "10",  copper / copperOpen, num 10
 *   case 3  -> text "15",  silver / silverOpen, num 15
 *   case 4  -> text "max", gold   / goldOpen,   num 20
 *
 * so type 1 is the default arm and the four rows are exactly types 1..4. What cannot be recovered
 * is `status`, the per-account claimed flag; "0" is unclaimed, which is the only value a 0-medal
 * account can carry. Note the reconstruction is invisible either way: a chest only shows its own
 * artwork once `medalCount >= num`, and at 0 all four render the generic `achieve_box` — which is
 * the four identical grey chests in the capture. */
export const BONUS_STATUS = [
  { type: 1, status: '0' },
  { type: 2, status: '0' },
  { type: 3, status: '0' },
  { type: 4, status: '0' },
];

/* RECIPE
 *
 *   $wc = New-Object System.Net.WebClient
 *   $wc.Encoding = [System.Text.Encoding]::UTF8
 *   $wc.DownloadString("https://hash.game/api/game/support/achievement/all/")
 *
 * `data.achievements` is ACHIEVEMENTS, `data.medalCount` is MEDAL_COUNT, and `data.bonusStatus` is
 * empty for a visitor — see the note above BONUS_STATUS before replacing it. Use WebClient with
 * UTF8 rather than Invoke-WebRequest, which decodes JSON as Latin-1.
 */
