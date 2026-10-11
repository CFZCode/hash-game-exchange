/* The two signed-in Casino lists: `/favorite` and `/recent`.
 *
 * BOTH ARE EMPTY, AND THAT IS THE RESPONSE RATHER THAN A GAP. `POST /game/home/my-favorite/`
 * and `POST /game/home/recent/` both answer bc.game's own `{code: 6002, msg: "User information
 * expired, please log in again."}` on hash.game — probed, not assumed — because a visitor's own
 * favourites and play history are per-account by nature. That is the shut half of the split the
 * `game/support` catalogues sit on the open half of, and it is the fifth feature in this project
 * where being locked out IS the correct rendering: the grid falls through to the site's own
 * "Stay tuned-something's coming!" placeholder, which is exactly what both reference captures
 * show for a fresh account.
 *
 * So nothing here is invented. The arrays are the empty list the pages render, and the SHAPE is
 * the one the rest of this project's game rows carry (`{slug, fullName, onlineUsers}`, artwork
 * resolved from the slug) — the same rows the recommend feeds return, which is checkable rather
 * than chosen: `RecommendList` reads `list[].gameIdentity.gameInfoId` off exactly these rows, so
 * a favourite is a game row and not a wrapper around one.
 *
 * `pageSize` is `mobile ? 39 : 40` on the original — one row short on a phone, where the grid is
 * three across, so the last row is never a ragged pair. Recorded in services/collection.js.
 *
 * The recent list is additionally filtered by the page rather than by the server:
 * `filter(i => i?.isRecItem === false)` drops the rows the feed pads itself with, so a
 * recommendation that arrives inside the history feed is not printed as something you played.
 * `services/collection.js` performs that filter, since it is the payload's own field.
 */

/** `/game/home/my-favorite/` — the games this account has starred. */
export const favorites = [];

/** `/game/home/recent/` — "Continue Playing", the games this account last opened. */
export const recent = [];
