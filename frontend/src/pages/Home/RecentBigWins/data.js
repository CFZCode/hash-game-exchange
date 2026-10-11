/* The Recent Big Wins feed — GENERATED, four captures, one per tab. Regenerate rather than
 * hand-edit; the recipe is at the foot of this file.
 *
 * The live site fetches `/game/support/home/v3/recent-big-wins/?gameTypeId=<tab>&areaCode=<x>`
 * and takes `.slice(0, 20)`. **It is a separate request per tab**, and the saved mirror had
 * captured only one of them — the All tab. So the tabs here filtered that single snapshot by
 * `gameTypeId`, which left BC Originals on 3 rows, Slots on 6 and Live Casino on 12 against the
 * twenty the real page shows on each. All four are captured now.
 *
 * gameTypeId: 1 = BC Originals, 2 = Slots, 3 = Live Casino; 0 is All. These are the same numbers
 * the tab buttons send, which is why the tab index doubles as the key.
 */

import { displayName } from '../../../context/account';

/* `iconThreeFour` — the 3:4 portrait art, 400x533, which is where the card's `pt-[133%]` comes
   from. Keyed by gameUnique.

   RESOLVED THROUGH `utils/gameArt`'s `assetExact` RATHER THAN A SECOND GLOB. This file used to
   carry its own `import.meta.glob` over `*.avif` only, which meant a cover stored as `.png` was
   invisible to it while `GameTile` found it perfectly well — and 24 of the covers added with the
   per-tab capture below are genuine PNG bytes. `assetExact` already globs `{avif,png,jpg}` and
   already returns `undefined` for a miss, which is exactly this module's semantics. `assetExact`
   and NOT `assetFor`: the fuzzy one always returns something, which would put another game's
   cover on a win that is not theirs. */
import { assetExact } from '../../../utils/gameArt';

/* VIP level -> tier index, from index-BsFv7ByC.js (`j1`). Index into the array by the raw
   level; the value is the VipLevelStatus enum, which maps to a tier name below. Levels past
   the end of the table clamp to 8. Do not shorten this — the boundaries are uneven
   (Bronze spans 4 levels, Platinum 2, Diamond 3+). */
const LEVEL_TIER_INDEX = [
  0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8,
];

const TIER_BY_INDEX = [
  'none',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'platinum',
  'diamond',
  'diamond',
  'diamond',
];

export function vipTier(level) {
  if (level < 0) return 'none';
  const i = level >= LEVEL_TIER_INDEX.length ? 8 : LEVEL_TIER_INDEX[level];
  return TIER_BY_INDEX[i];
}

/* The masked nickname the API returns for players who hide their name. `Z.userName` in the
   original swaps exactly this sentinel for the translated "Hidden" — and it is one sentinel
   and one helper on the original (`Os.hiddenName` / `Os.getName`), shared by this feed and the
   bet table alike, so both now come from context/account.js. Re-exported as well as used, so
   nothing that already pulls `displayName` from this module has to change. */
export { displayName };

/* "$1,032.23K" — thousands, TRUNCATED to two decimals, not rounded. 195238.68 renders as
   $195.23K on the live site, and 210257.04 as $210.25K; both round up at 2dp, so this is
   floor. The K suffix is unconditional here: every value in the feed is 150K-1.1M and the
   original keeps 1032239 as "1,032.23K" rather than switching to M. */
export function formatWinAmount(amount) {
  const thousands = Math.floor((amount / 1000) * 100) / 100;
  return `$${thousands.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}K`;
}

/* ── FOUR CAPTURES, ONE PER TAB ──────────────────────────────────────────────────────────────
 *
 * Each tab is its OWN REQUEST on the live site — `?gameTypeId=<tab>` — and the mirror had
 * captured only the All one. The tabs therefore filtered a single 20-row snapshot, which left
 * BC Originals showing 3 rows, Slots 6 and Live Casino 12 against the twenty the real page
 * shows on every tab. Reported from the running site as "only two games displayed" under BC
 * Originals, and the note that used to sit here predicted it exactly: "the real site issues a
 * separate request per tab, so its per-tab lists are longer than the subsets below".
 *
 * All four were fetched from `hash.game/api/game/support/home/v3/recent-big-wins/`, which is a
 * `game/support` path and therefore answers UNAUTHENTICATED — rung 4 of the recovery ladder,
 * working exactly as CLAUDE.md describes. `.slice(0, 20)` is the live page's own cut.
 *
 * REGENERATE rather than hand-edit; the recipe is at the foot of this file.
 */
const FEEDS = {
  /* All */
  0: [
  {
    gameUnique: "fire-in-the-hole-3-by-nolimitcity",
    distributeId: "1875398374533796450",
    gameTypeId: 2,
    nickName: "khasss",
    winAmount: 952252.4364928,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "crash",
    distributeId: "1875325538992207911",
    gameTypeId: 1,
    nickName: "4b1zs59n8uh5",
    winAmount: 879081.9763613031,
    currencyName: "BTC",
    userVipLevel: 21,
  },
  {
    gameUnique: "catfish-hunters-by-nolimitcity",
    distributeId: "1875336707248650157",
    gameTypeId: 2,
    nickName: "SH4NERonKic",
    winAmount: 800032.8,
    currencyName: "USDT",
    userVipLevel: 20,
  },
  {
    gameUnique: "immersive-roulette-by-evolution-gaming",
    distributeId: "1875084316374892084",
    gameTypeId: 3,
    nickName: "u1w6jpw35yvf",
    winAmount: 720151.92,
    currencyName: "USDT",
    userVipLevel: 12,
  },
  {
    gameUnique: "blackjack-vip-32-by-evolution-gaming",
    distributeId: "1875398005674111801",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 656003.24529352,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "blackjack-vip-31-by-evolution-gaming",
    distributeId: "1875323414732763450",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 613252.79576794,
    currencyName: "USDT",
    userVipLevel: 17,
  },
  {
    gameUnique: "salon-priv-blackjack-a-by-evolution-gaming",
    distributeId: "1875078525525858435",
    gameTypeId: 3,
    nickName: "u1w6jpw35yvf",
    winAmount: 600126.6,
    currencyName: "USDT",
    userVipLevel: 10,
  },
  {
    gameUnique: "auto-roulette-by-evolution-gaming",
    distributeId: "1875077438781683547",
    gameTypeId: 3,
    nickName: "u1w6jpw35yvf",
    winAmount: 540103.14,
    currencyName: "USDT",
    userVipLevel: 9,
  },
  {
    gameUnique: "limbo",
    distributeId: "1875131816614981705",
    gameTypeId: 1,
    nickName: "4b1zs59n8uh5",
    winAmount: 496198.4890268955,
    currencyName: "BTC",
    userVipLevel: 21,
  },
  {
    gameUnique: "blackjack-vip-2-by-evolution-gaming",
    distributeId: "1875396013388107555",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 493722.65803945,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "salon-priv-blackjack-f-by-evolution-gaming",
    distributeId: "1875083396438204393",
    gameTypeId: 3,
    nickName: "Tjycwfdtyvcc",
    winAmount: 487101.40496232,
    currencyName: "USDT",
    userVipLevel: 10,
  },
  {
    gameUnique: "blackjack-vip-44-by-evolution-gaming-5290",
    distributeId: "1875397230279429505",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 481818.89705343,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "priv-lounge-blackjack-4-by-pragmatic-play",
    distributeId: "1874846500668736705",
    gameTypeId: 3,
    nickName: "ir0w8t79qg2b",
    winAmount: 480000,
    currencyName: "USDT",
    userVipLevel: 14,
  },
  {
    gameUnique: "blackjack-vip-7-by-evolution-gaming",
    distributeId: "1875321682560714371",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 454261.33019848,
    currencyName: "USDT",
    userVipLevel: 17,
  },
  {
    gameUnique: "salon-priv-roulette-by-evolution-gaming",
    distributeId: "1874848137952000278",
    gameTypeId: 3,
    nickName: "u1w6jpw35yvf",
    winAmount: 450000,
    currencyName: "USDT",
    userVipLevel: 9,
  },
  {
    gameUnique: "the-dog-house-by-pragmatic-play",
    distributeId: "1875082910790227123",
    gameTypeId: 2,
    nickName: "Tjycwfdtyvcc",
    winAmount: 445995.88677871,
    currencyName: "USDT",
    userVipLevel: 10,
  },
  {
    gameUnique: "salon-priv-blackjack-i-by-evolution-gaming",
    distributeId: "1874798709994066805",
    gameTypeId: 3,
    nickName: "4b1zs59n8uh5",
    winAmount: 400044.79995416,
    currencyName: "BTC",
    userVipLevel: 21,
  },
  {
    gameUnique: "nine-to-five-by-nolimitcity",
    distributeId: "1875336878477965438",
    gameTypeId: 2,
    nickName: "SH4NERonKic",
    winAmount: 368681.10604,
    currencyName: "USDT",
    userVipLevel: 20,
  },
  {
    gameUnique: "wheel",
    distributeId: "1875395455776356572",
    gameTypeId: 1,
    nickName: "Jojo3333",
    winAmount: 358109.358817,
    currencyName: "USDT",
    userVipLevel: 21,
  },
  {
    gameUnique: "salon-priv-blackjack-n-by-evolution-gaming",
    distributeId: "1875252332869884445",
    gameTypeId: 3,
    nickName: "MarkHladnik",
    winAmount: 325116.675,
    currencyName: "BCD",
    userVipLevel: 16,
  },
],

  /* BC Originals */
  1: [
  {
    gameUnique: "crash",
    distributeId: "1875325538992207911",
    gameTypeId: 1,
    nickName: "4b1zs59n8uh5",
    winAmount: 879081.9763613031,
    currencyName: "BTC",
    userVipLevel: 21,
  },
  {
    gameUnique: "limbo",
    distributeId: "1875131816614981705",
    gameTypeId: 1,
    nickName: "4b1zs59n8uh5",
    winAmount: 496198.4890268955,
    currencyName: "BTC",
    userVipLevel: 21,
  },
  {
    gameUnique: "wheel",
    distributeId: "1875395455776356572",
    gameTypeId: 1,
    nickName: "Jojo3333",
    winAmount: 358109.358817,
    currencyName: "USDT",
    userVipLevel: 21,
  },
  {
    gameUnique: "mines",
    distributeId: "1875131768202236581",
    gameTypeId: 1,
    nickName: "4b1zs59n8uh5",
    winAmount: 162066.50580399483,
    currencyName: "BTC",
    userVipLevel: 21,
  },
  {
    gameUnique: "keno",
    distributeId: "1875332528461479814",
    gameTypeId: 1,
    nickName: "SH4NERonKic",
    winAmount: 161353.6,
    currencyName: "USDT",
    userVipLevel: 20,
  },
  {
    gameUnique: "fast-crash",
    distributeId: "1875301898082221610",
    gameTypeId: 1,
    nickName: "Upfnfhaypxcc",
    winAmount: 93200,
    currencyName: "BCD",
    userVipLevel: 19,
  },
  {
    gameUnique: "ring-of-fortune",
    distributeId: "1875297270638747575",
    gameTypeId: 1,
    nickName: "Qsiwxgijzwcc",
    winAmount: 29696,
    currencyName: "USDT",
    userVipLevel: 14,
  },
  {
    gameUnique: "tower-legend",
    distributeId: "1875393796396454885",
    gameTypeId: 1,
    nickName: "Upfnfhaypxcc",
    winAmount: 29445.55876523997,
    currencyName: "BTC",
    userVipLevel: 19,
  },
  {
    gameUnique: "twist",
    distributeId: "1874982793177371596",
    gameTypeId: 1,
    nickName: "Qsiwxgijzwcc",
    winAmount: 20000,
    currencyName: "USDT",
    userVipLevel: 14,
  },
  {
    gameUnique: "cave",
    distributeId: "1874836203324212085",
    gameTypeId: 1,
    nickName: "M2THAKLIVE",
    winAmount: 16000,
    currencyName: "USDT",
    userVipLevel: 17,
  },
  {
    gameUnique: "hash-dice",
    distributeId: "1874969348658863073",
    gameTypeId: 1,
    nickName: "Ltymleubkwb",
    winAmount: 15795,
    currencyName: "USDT",
    userVipLevel: 19,
  },
  {
    gameUnique: "plinko",
    distributeId: "1875399444257474211",
    gameTypeId: 1,
    nickName: "khasss",
    winAmount: 15564.8,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "hilo",
    distributeId: "1874933906258435814",
    gameTypeId: 1,
    nickName: "Iwterjyvjyb",
    winAmount: 10894.86681498,
    currencyName: "USDT",
    userVipLevel: 11,
  },
  {
    gameUnique: "blackjack",
    distributeId: "1875224679486711431",
    gameTypeId: 1,
    nickName: "4yvwoh6ywj0c",
    winAmount: 10000,
    currencyName: "USDT",
    userVipLevel: 12,
  },
  {
    gameUnique: "coinflip",
    distributeId: "1875264390948614551",
    gameTypeId: 1,
    nickName: "OrcTwink",
    winAmount: 6428.52933861376,
    currencyName: "AVAX",
    userVipLevel: 14,
  },
  {
    gameUnique: "dice",
    distributeId: "1875285015761159153",
    gameTypeId: 1,
    nickName: "Yvbqkfrxivcc",
    winAmount: 3849.91232,
    currencyName: "USDT",
    userVipLevel: 9,
  },
  {
    gameUnique: "jade",
    distributeId: "1874850195574785627",
    gameTypeId: 1,
    nickName: "****",
    winAmount: 3733.5622428,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "baccarat",
    distributeId: "1875206050415547973",
    gameTypeId: 1,
    nickName: "Yytqvbvhipac",
    winAmount: 3630.4627494,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "color",
    distributeId: "1875003701697878244",
    gameTypeId: 1,
    nickName: "****",
    winAmount: 3542.9178474861687,
    currencyName: "BC",
    userVipLevel: 9,
  },
  {
    gameUnique: "bingo",
    distributeId: "1875057012647038990",
    gameTypeId: 1,
    nickName: "letyy64",
    winAmount: 3465.982819962,
    currencyName: "SOL",
    userVipLevel: 9,
  },
],

  /* Slots */
  2: [
  {
    gameUnique: "fire-in-the-hole-3-by-nolimitcity",
    distributeId: "1875398374533796450",
    gameTypeId: 2,
    nickName: "khasss",
    winAmount: 952252.4364928,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "catfish-hunters-by-nolimitcity",
    distributeId: "1875336707248650157",
    gameTypeId: 2,
    nickName: "SH4NERonKic",
    winAmount: 800032.8,
    currencyName: "USDT",
    userVipLevel: 20,
  },
  {
    gameUnique: "the-dog-house-by-pragmatic-play",
    distributeId: "1875082910790227123",
    gameTypeId: 2,
    nickName: "Tjycwfdtyvcc",
    winAmount: 445995.88677871,
    currencyName: "USDT",
    userVipLevel: 10,
  },
  {
    gameUnique: "nine-to-five-by-nolimitcity",
    distributeId: "1875336878477965438",
    gameTypeId: 2,
    nickName: "SH4NERonKic",
    winAmount: 368681.10604,
    currencyName: "USDT",
    userVipLevel: 20,
  },
  {
    gameUnique: "sweet-bonanza-2500-by-pragmatic-play",
    distributeId: "1875333926286686643",
    gameTypeId: 2,
    nickName: "SH4NERonKic",
    winAmount: 273007.917,
    currencyName: "USDT",
    userVipLevel: 20,
  },
  {
    gameUnique: "age-of-seth-by-bullshark",
    distributeId: "1874791917483365769",
    gameTypeId: 2,
    nickName: "Billioner_man",
    winAmount: 238941.69018,
    currencyName: "USDT",
    userVipLevel: 23,
  },
  {
    gameUnique: "tanked-3-first-blood-2-by-nolimitcity",
    distributeId: "1875333307510453888",
    gameTypeId: 2,
    nickName: "SH4NERonKic",
    winAmount: 204685.917696,
    currencyName: "USDT",
    userVipLevel: 20,
  },
  {
    gameUnique: "beastbound-love-by-nownow-gaming",
    distributeId: "1874860279068521310",
    gameTypeId: 2,
    nickName: "Kontrolleur",
    winAmount: 176231.09794503,
    currencyName: "USDT",
    userVipLevel: 22,
  },
  {
    gameUnique: "duck-hunters-by-nolimitcity",
    distributeId: "1874840721622469723",
    gameTypeId: 2,
    nickName: "Billioner_man",
    winAmount: 171212.8,
    currencyName: "USDT",
    userVipLevel: 23,
  },
  {
    gameUnique: "sweet-bonanza-super-scatter-by-pragmatic-play",
    distributeId: "1874873563553364853",
    gameTypeId: 2,
    nickName: "Kontrolleur",
    winAmount: 160214.53549116,
    currencyName: "USDT",
    userVipLevel: 22,
  },
  {
    gameUnique: "duck-hunters-happy-hour-by-nolimitcity",
    distributeId: "1874791181859061112",
    gameTypeId: 2,
    nickName: "Billioner_man",
    winAmount: 139405.782048,
    currencyName: "USDT",
    userVipLevel: 23,
  },
  {
    gameUnique: "sweet-bonanza-1000-by-pragmatic-play",
    distributeId: "1874798309061596022",
    gameTypeId: 2,
    nickName: "4b1zs59n8uh5",
    winAmount: 131117.17364194,
    currencyName: "BTC",
    userVipLevel: 21,
  },
  {
    gameUnique: "wild-skullz-by-pragmatic-play",
    distributeId: "1875332329685025018",
    gameTypeId: 2,
    nickName: "SH4NERonKic",
    winAmount: 129132.39552,
    currencyName: "USDT",
    userVipLevel: 20,
  },
  {
    gameUnique: "das-xboot-2wei-by-nolimitcity",
    distributeId: "1874794498463012021",
    gameTypeId: 2,
    nickName: "Billioner_man",
    winAmount: 120011.319778,
    currencyName: "USDT",
    userVipLevel: 23,
  },
  {
    gameUnique: "hammerstorm-by-pragmatic-play",
    distributeId: "1875180542025953745",
    gameTypeId: 2,
    nickName: "daBaby90",
    winAmount: 116719.3365,
    currencyName: "USDT",
    userVipLevel: 20,
  },
  {
    gameUnique: "gates-of-olympus-by-pragmatic-play",
    distributeId: "1874795611046183677",
    gameTypeId: 2,
    nickName: "Kontrolleur",
    winAmount: 115411.80896083,
    currencyName: "USDT",
    userVipLevel: 22,
  },
  {
    gameUnique: "sweet-bonanza-xmas-by-pragmatic-play",
    distributeId: "1875035450025867934",
    gameTypeId: 2,
    nickName: "Avxktdqcgtac",
    winAmount: 113672.61467999,
    currencyName: "TON",
    userVipLevel: 16,
  },
  {
    gameUnique: "gates-of-olympus-super-scatter-by-pragmatic-play",
    distributeId: "1875139642299156189",
    gameTypeId: 2,
    nickName: "Mtrwnfwnkvcc",
    winAmount: 112563.5714748,
    currencyName: "USDT",
    userVipLevel: 21,
  },
  {
    gameUnique: "anubis-wrath-by-pg-soft",
    distributeId: "1875354502139125277",
    gameTypeId: 2,
    nickName: "****",
    winAmount: 98980,
    currencyName: "USDT",
    userVipLevel: 19,
  },
  {
    gameUnique: "dead-dead-or-deader-by-nolimitcity",
    distributeId: "1874839657956409609",
    gameTypeId: 2,
    nickName: "Cyrrwehortcc",
    winAmount: 98885.15419486,
    currencyName: "BTC",
    userVipLevel: 13,
  },
],

  /* Live Casino */
  3: [
  {
    gameUnique: "immersive-roulette-by-evolution-gaming",
    distributeId: "1875084316374892084",
    gameTypeId: 3,
    nickName: "u1w6jpw35yvf",
    winAmount: 720151.92,
    currencyName: "USDT",
    userVipLevel: 12,
  },
  {
    gameUnique: "blackjack-vip-32-by-evolution-gaming",
    distributeId: "1875398005674111801",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 656003.24529352,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "blackjack-vip-31-by-evolution-gaming",
    distributeId: "1875323414732763450",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 613252.79576794,
    currencyName: "USDT",
    userVipLevel: 17,
  },
  {
    gameUnique: "salon-priv-blackjack-a-by-evolution-gaming",
    distributeId: "1875078525525858435",
    gameTypeId: 3,
    nickName: "u1w6jpw35yvf",
    winAmount: 600126.6,
    currencyName: "USDT",
    userVipLevel: 10,
  },
  {
    gameUnique: "auto-roulette-by-evolution-gaming",
    distributeId: "1875077438781683547",
    gameTypeId: 3,
    nickName: "u1w6jpw35yvf",
    winAmount: 540103.14,
    currencyName: "USDT",
    userVipLevel: 9,
  },
  {
    gameUnique: "blackjack-vip-2-by-evolution-gaming",
    distributeId: "1875396013388107555",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 493722.65803945,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "salon-priv-blackjack-f-by-evolution-gaming",
    distributeId: "1875083396438204393",
    gameTypeId: 3,
    nickName: "Tjycwfdtyvcc",
    winAmount: 487101.40496232,
    currencyName: "USDT",
    userVipLevel: 10,
  },
  {
    gameUnique: "blackjack-vip-44-by-evolution-gaming-5290",
    distributeId: "1875397230279429505",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 481818.89705343,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "priv-lounge-blackjack-4-by-pragmatic-play",
    distributeId: "1874846500668736705",
    gameTypeId: 3,
    nickName: "ir0w8t79qg2b",
    winAmount: 480000,
    currencyName: "USDT",
    userVipLevel: 14,
  },
  {
    gameUnique: "blackjack-vip-7-by-evolution-gaming",
    distributeId: "1875321682560714371",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 454261.33019848,
    currencyName: "USDT",
    userVipLevel: 17,
  },
  {
    gameUnique: "salon-priv-roulette-by-evolution-gaming",
    distributeId: "1874848137952000278",
    gameTypeId: 3,
    nickName: "u1w6jpw35yvf",
    winAmount: 450000,
    currencyName: "USDT",
    userVipLevel: 9,
  },
  {
    gameUnique: "salon-priv-blackjack-i-by-evolution-gaming",
    distributeId: "1874798709994066805",
    gameTypeId: 3,
    nickName: "4b1zs59n8uh5",
    winAmount: 400044.79995416,
    currencyName: "BTC",
    userVipLevel: 21,
  },
  {
    gameUnique: "salon-priv-blackjack-n-by-evolution-gaming",
    distributeId: "1875252332869884445",
    gameTypeId: 3,
    nickName: "MarkHladnik",
    winAmount: 325116.675,
    currencyName: "BCD",
    userVipLevel: 16,
  },
  {
    gameUnique: "salon-priv-blackjack-d-by-evolution-gaming",
    distributeId: "1875257004994230211",
    gameTypeId: 3,
    nickName: "MarkHladnik",
    winAmount: 300077.1,
    currencyName: "USDT",
    userVipLevel: 16,
  },
  {
    gameUnique: "blackjack-vip-8-by-evolution-gaming",
    distributeId: "1875324779762714245",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 289023.77133878,
    currencyName: "USDT",
    userVipLevel: 17,
  },
  {
    gameUnique: "blackjack-vip-1-by-evolution-gaming",
    distributeId: "1875395589564168776",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 265109.03884254,
    currencyName: "USDT",
    userVipLevel: 18,
  },
  {
    gameUnique: "korean-platinum-private-blackjack-2-by-evolution-gaming",
    distributeId: "1874973611370906895",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 231161.50891368,
    currencyName: "USDT",
    userVipLevel: 17,
  },
  {
    gameUnique: "blackjack-vip-40-by-evolution-gaming-5286",
    distributeId: "1875327691912021500",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 227130.66509924,
    currencyName: "USDT",
    userVipLevel: 17,
  },
  {
    gameUnique: "blackjack-vip-49-by-evolution-gaming-5295",
    distributeId: "1875328151607745222",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 227130.66509924,
    currencyName: "USDT",
    userVipLevel: 17,
  },
  {
    gameUnique: "japanese-platinum-private-blackjack-1-by-evolution-gaming",
    distributeId: "1874986766470909051",
    gameTypeId: 3,
    nickName: "khasss",
    winAmount: 225521.59365802,
    currencyName: "USDT",
    userVipLevel: 17,
  },
],
};

/* One shape for a row, applied to whichever tab's list is asked for. `recentBigWins` keeps its
 * name and its default export: every consumer already imports it and the All tab is what it
 * holds, so nothing that reads this module has to change to keep working.
 */
const decorate = (win) => ({
  ...win,
  icon: assetExact(win.gameUnique),
  tier: vipTier(win.userVipLevel),
  name: displayName(win.nickName),
  amount: formatWinAmount(win.winAmount),
});

/* Tab -> its own twenty rows. `0` is All. */
export const bigWinsByTab = Object.fromEntries(
  Object.entries(FEEDS).map(([tab, rows]) => [tab, rows.map(decorate)]),
);

export const recentBigWins = bigWinsByTab[0];

export default recentBigWins;

/* ── REGENERATING ────────────────────────────────────────────────────────────────────────────
 *
 *   for id in 0 1 2 3; do
 *     curl "https://hash.game/api/game/support/home/v3/recent-big-wins/?gameTypeId=$id"
 *   done
 *
 * PowerShell's Invoke-WebRequest decodes JSON as Latin-1 — use System.Net.WebClient with UTF8,
 * and strip the BOM before JSON.parse. Take `.data`, slice to 20, and keep the seven fields
 * above; the response carries fifteen more that nothing here reads.
 *
 * A row whose `gameUnique` has no file in `src/assets/games` renders no artwork. The response's
 * own `iconThreeFour` is the CDN URL to fetch it from; 24 were added this way alongside this
 * capture, all of them genuine PNG bytes despite the `.png` path the CDN serves AVIF under
 * elsewhere — check the magic before choosing the extension.
 */
