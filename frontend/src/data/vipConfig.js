/* The VIP ladder — GENERATED from the CAPTURED `/api/game/support/vip-v2/config/` response,
 * which is in the mirror under `bc.game/bc.game/api/game/support/vip-v2/config/`. Thirty-four
 * levels across eight tier families. Regenerate rather than hand-edit.
 *
 * The path was already in `endpoints.js` under the captured group and nothing read it until the
 * bonus page's level card needed a tier name and a next-level XP target — both of which come
 * straight off these rows rather than out of the account payload.
 *
 * TEN OF THE THIRTY-FOUR NAMES CARRY A RAW NEWLINE WHERE A SPACE BELONGS ("Bronze\nIII"), and
 * that is the live payload's own rather than a transcription slip. It reads as a bug and is
 * reproduced anyway, for the reason `f-ull`, `texxt-sm` and the missing `dice` sprite are: the
 * site derives a level's TIER FAMILY by splitting the name on its LAST SPACE, so a name with no
 * space at all yields the whole string as the family, nothing matches in the icon or colour maps,
 * and those ten levels fall back to the Beginner glyph in `currentColor`. That is what the live
 * site draws. The newline itself never shows — HTML collapses it to a space — so the icon is the
 * only tell.
 */

export const VIP_LEVELS = [
  { level: 0, levelName: 'Beginner', levelXp: 0, minXp: 0, maxXp: 1000 },
  { level: 1, levelName: 'Bronze I', levelXp: 1000, minXp: 1000, maxXp: 3000 },
  { level: 2, levelName: 'Bronze II', levelXp: 3000, minXp: 3000, maxXp: 7000 },
  { level: 3, levelName: 'Bronze\nIII', levelXp: 7000, minXp: 7000, maxXp: 15000 },
  { level: 4, levelName: 'Bronze IV', levelXp: 15000, minXp: 15000, maxXp: 30000 },
  { level: 5, levelName: 'Silver I', levelXp: 30000, minXp: 30000, maxXp: 60000 },
  { level: 6, levelName: 'Silver II', levelXp: 60000, minXp: 60000, maxXp: 120000 },
  { level: 7, levelName: 'Silver\nIII', levelXp: 120000, minXp: 120000, maxXp: 240000 },
  { level: 8, levelName: 'Silver IV', levelXp: 240000, minXp: 240000, maxXp: 500000 },
  { level: 9, levelName: 'Gold I', levelXp: 500000, minXp: 500000, maxXp: 1000000 },
  { level: 10, levelName: 'Gold II', levelXp: 1000000, minXp: 1000000, maxXp: 2000000 },
  { level: 11, levelName: 'Gold\nIII', levelXp: 2000000, minXp: 2000000, maxXp: 3500000 },
  { level: 12, levelName: 'Gold IV', levelXp: 3500000, minXp: 3500000, maxXp: 6000000 },
  { level: 13, levelName: 'Platinum I', levelXp: 6000000, minXp: 6000000, maxXp: 8500000 },
  { level: 14, levelName: 'Platinum\nII', levelXp: 8500000, minXp: 8500000, maxXp: 11000000 },
  { level: 15, levelName: 'Platinum III', levelXp: 11000000, minXp: 11000000, maxXp: 15000000 },
  { level: 16, levelName: 'Platinum IV', levelXp: 15000000, minXp: 15000000, maxXp: 25000000 },
  { level: 17, levelName: 'Diamond\nI', levelXp: 25000000, minXp: 25000000, maxXp: 40000000 },
  { level: 18, levelName: 'Diamond II', levelXp: 40000000, minXp: 40000000, maxXp: 65000000 },
  { level: 19, levelName: 'Diamond III', levelXp: 65000000, minXp: 65000000, maxXp: 110000000 },
  { level: 20, levelName: 'Diamond\nIV', levelXp: 110000000, minXp: 110000000, maxXp: 200000000 },
  { level: 21, levelName: 'Diamond V', levelXp: 200000000, minXp: 200000000, maxXp: 400000000 },
  { level: 22, levelName: 'Diamond VI', levelXp: 400000000, minXp: 400000000, maxXp: 1000000000 },
  { level: 23, levelName: 'Diamond\nVII', levelXp: 1000000000, minXp: 1000000000, maxXp: 1500000000 },
  { level: 24, levelName: 'Eternal I', levelXp: 1500000000, minXp: 1500000000, maxXp: 2200000000 },
  { level: 25, levelName: 'Eternal II', levelXp: 2200000000, minXp: 2200000000, maxXp: 3200000000 },
  { level: 26, levelName: 'Eternal\nIII', levelXp: 3200000000, minXp: 3200000000, maxXp: 4500000000 },
  { level: 27, levelName: 'Eternal IV', levelXp: 4500000000, minXp: 4500000000, maxXp: 6000000000 },
  { level: 28, levelName: 'Eternal V', levelXp: 6000000000, minXp: 6000000000, maxXp: 7200000000 },
  { level: 29, levelName: 'Eternal\nVI', levelXp: 7200000000, minXp: 7200000000, maxXp: 8300000000 },
  { level: 30, levelName: 'Eternal VII', levelXp: 8300000000, minXp: 8300000000, maxXp: 9000000000 },
  { level: 31, levelName: 'Eternal VIII', levelXp: 9000000000, minXp: 9000000000, maxXp: 9500000000 },
  { level: 32, levelName: 'Eternal\nIX', levelXp: 9500000000, minXp: 9500000000, maxXp: 10000000000 },
  { level: 33, levelName: 'Eternal X', levelXp: 10000000000, minXp: 10000000000, maxXp: 10000000000 },
];

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* `sC` in index-BsFv7ByC.js — a level name split into its tier family and its numeral. See the
   note above for why `lastIndexOf(' ')` returning -1 is not a defensive branch but the path ten
   of these rows actually take. */
export function splitLevelName(name) {
  const at = name.lastIndexOf(' ');
  if (at === -1) return { base: name, suffix: '', fullName: capitalize(name) };
  return {
    base: name.slice(0, at),
    suffix: name.slice(at + 1),
    fullName: `${capitalize(name.slice(0, at))} ${name.slice(at + 1)}`,
  };
}

/* `Hv` — the row for a level, falling back to the TOP row rather than to nothing, so an account
   above the published ladder still renders something. */
export const vipLevelRow = (level) =>
  VIP_LEVELS.find((r) => r.level === level) ?? VIP_LEVELS[VIP_LEVELS.length - 1];

/* `Wv` — the account's tier as the level card reads it. */
export const vipTier = (level) => splitLevelName(vipLevelRow(level).levelName);

/* `Sn`, the DARK arm of the tier palette. Its light twin `qv` is a set of deeper shades and is
   unreachable in a dark-only build. `jv` falls through to `currentColor` for a family that is not
   in this map, which is exactly what the ten newline names get. */
export const TIER_COLOR = {
  Beginner: '#D0BF9F',
  Bronze: '#DDB5AA',
  Silver: '#ABC9DE',
  Gold: '#DEB37E',
  Platinum: '#ABDEB5',
  Diamond: '#ABB2DE',
  Eternal: '#AABBDE',
};

export const tierColor = (base) => TIER_COLOR[base] ?? 'currentColor';

/* `j1` in index-BsFv7ByC.js — LEVEL to TIER NUMBER, and it is a lookup table rather than
   arithmetic on the level:

     [0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,5,5,6,6,7,7,7,8,8,8,8,8,8,8,8,8,8,8,8]
     function Tv(t) { return t < 0 ? 0 : t >= j1.length ? 8 : j1[t] }

   Note it does NOT track the tier FAMILY one-for-one: Platinum is 4 AND 5, Diamond is 6, 7 and 8,
   so a name split (`vipTier`) cannot stand in for it. Six is also the `isSvip` line — `r >= 6` is
   what turns "VIP" into "SVIP" in the original.

   Two things read it. `nC` picks the level's colour from a nine-entry array, and the mobile
   account page picks its card gradient with it (`user-vip-${n}-bg` / `-progress` / `-c1..c3`,
   which is why those classes stop at 8 while the ladder runs to 33). */
const TIER_NUM = [0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8];

export const vipTypeNum = (level) =>
  level < 0 ? 0 : level >= TIER_NUM.length ? 8 : TIER_NUM[level];
