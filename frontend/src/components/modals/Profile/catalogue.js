/* The medal catalogue's view logic — `os`, `ss` and `cs` in the account remote's
 * `Tool-CuKFgBKm.js`. Kept beside the dialogs rather than in `services/`, because none of it is
 * data: it is names, an ordering and an image lookup, which is the same split `sortGames` and
 * `gameIcon` already sit on.
 */

/* `os()` — all 21 titles, verbatim en-US `t("…")` out of the chunk. Two things to notice.
 *
 * TITLE 17 IS NEVER PRINTED AS ITSELF. The tile branches on `type.toString() !== "17"` and, for
 * 17, prints `subType + t("TOP 1")` instead — so the four coin rows render "BTCTOP 1", "ETHTOP 1"
 * and so on, with no space, which is what the capture shows. The bare "TOP 1" here is only ever
 * the suffix.
 *
 * TITLE 9 AND TITLE 18 ARE THE SAME STRING, "Contest Master", and that is the chunk's own. It does
 * not show, because every list on the site drops type 9 (see `visibleMedals`).
 *
 * `__ENV_COCO__` is a placeholder the site substitutes with its own coin brand — "COCO" on
 * bc.game, which is what the capture prints. Substituted here rather than shipped as the token,
 * the same treatment `__ENV_HOST__` gets on the Buy Crypto disclaimer.
 */
export const MEDAL_TITLES = {
  1: 'Talkative',
  2: 'Fearless One',
  3: 'The Loaded King',
  4: 'Highest Contributor',
  5: 'The Top Gun',
  6: 'The Rain Master',
  7: 'COCO Lover',
  8: 'Invincible Lucky Dog',
  9: 'Contest Master',
  10: 'Roll King',
  11: 'The Rain Stormer',
  12: 'Chicken Dinner',
  13: 'Loyal Player',
  14: "Call Me 'Richman'",
  15: 'The Old-Timer',
  16: 'The Boss',
  17: 'TOP 1',
  18: 'Contest Master',
  19: 'Puzzle Seeker',
  20: 'Puzzle Master',
  21: 'Puzzle Unifier',
};

/* The tile's own label rule, out of the `<Show when={type.toString() !== "17"}>` above. */
export const medalTitle = (row) =>
  String(row.type) === '17' ? `${row.subType}${MEDAL_TITLES[17]}` : MEDAL_TITLES[row.type];

/* `ss` — and it is not a sort, it is a sort plus ONE MOVE:
 *
 *   const o = [...s].sort((a, n) => a.type - n.type), t = o.pop();
 *   return (t && o.splice(8, 0, t), o);
 *
 * Sort ascending by type, pop the LAST row, splice it back in at index 8. With this catalogue the
 * last row is type 21, Puzzle Unifier, so it lands ninth — which is exactly where the capture has
 * it, between Invincible Lucky Dog and Roll King. Nothing in the chunk explains why; it reads as a
 * hand-placed feature medal. Reproduced rather than tidied, and note `pop` MUTATES the copy, so
 * the array it returns is one shorter before the splice puts the row back.
 *
 * The four type-17 rows tie on `type`, so their relative order is `Array#sort`'s stability, i.e.
 * the FEED's order — ETH, BTC, DOGE, EOS after the catalogue's own arrangement. The capture agrees.
 */
export function orderMedals(rows) {
  const sorted = [...rows].sort((a, b) => a.type - b.type);
  const last = sorted.pop();
  if (last) sorted.splice(8, 0, last);
  return sorted;
}

/* Type 9 is dropped by every list that renders these: the profile strip filters
   `a.type !== 9` after ordering, and the other-user medals dialog filters it straight off the
   response. "Contest Master" is title 18's string too, so nothing is lost from the page. */
export const visibleMedals = (rows) => rows.filter((row) => row.type !== 9);

/* `Xc` — 25 keys (21 types plus 17_BTC/DOGE/EOS/ETH), each a `[locked, achieved]` pair. `cs`
 * appends the coin to the key only for ETH/BTC/DOGE/EOS, so a `subType` of "0" resolves to the
 * bare type. Both arms of every pair are the same file in the dark and light themes, so there is
 * no theme branch to reproduce.
 *
 * Both states are local. The achieved half is unreachable while the medal feed reports every
 * `status` as "0" — see data/achievements.js — but it is fetched anyway rather than left as a hole,
 * for the reason the Free Plays row's provider marks are.
 */
const art = import.meta.glob('../../../assets/profile/medal_*.png', {
  eager: true,
  import: 'default',
});

const COIN_SUBTYPES = ['ETH', 'BTC', 'DOGE', 'EOS'];

export function medalIcon(type, subType, locked) {
  const key = COIN_SUBTYPES.includes(subType) ? `${type}_${subType}` : `${type}`;
  return art[`../../../assets/profile/medal_${key}${locked ? '_locked' : ''}.png`] ?? '';
}
