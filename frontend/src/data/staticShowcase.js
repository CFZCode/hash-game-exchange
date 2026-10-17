/* STATIC SHOWCASE DATA — shown ONLY when the live feed is empty or fails.
 *
 * On the user's explicit request ("Recent Big Wins aur Leaderboard me static data daal"), the
 * home page's Recent Big Wins strip and the Latest round & Race tables (Latest Bet / High Roller)
 * fall back to the rows below when their live read answers no rows or errors. The moment the
 * backend returns real rows, those are rendered instead and nothing here is used. The fallback
 * itself lives in `services/home.js` (`getRecentBigWins`, `getLatestBets`, `getHighRollers`).
 *
 * Every game is a REAL game from this site's catalogue: slugs, names and artwork were taken from
 * the lobby's own collections on the gateway (`/api/v1/casino/games/collections/{popular-slots,
 * live-casino,hot}`) and the in-house BC Originals list, so a card opens the actual game page.
 * Players are masked the way hash.game masks them ("Hidden", or a first-two/last-one mask like
 * "Ra***h"). Amounts are invented but realistic, in USDT / BTC / ETH / INR.
 */

import { assetExact } from '../utils/gameArt';
import { HIDDEN_NAME } from '../context/account';

/* ── The game pool ───────────────────────────────────────────────────────────────────────── */

const SS = 'https://cdn.softswiss.net/i/s6';

/* [slug, name, image] — `image` undefined means an in-house original, whose art is local. */
const SLOTS = [
  ['clover-bonanza-by-bgaming', 'Clover Bonanza', `${SS}/bgaming/CloverBonanza.png`],
  ['aztec-magic-bonanza-by-bgaming', 'Aztec Magic Bonanza', `${SS}/bgaming/AztecMagicBonanza.png`],
  ['aztec-magic-megaways-by-bgaming', 'Aztec Magic Megaways', `${SS}/bgaming/AztecMagicMegaways.png`],
  ['bonanza-billion-by-bgaming', 'Bonanza Billion', `${SS}/bgaming/BonanzaBillion.png`],
  ['road-2-riches-by-bgaming', 'Road 2 Riches', `${SS}/bgaming/Road2Riches.png`],
  ['lucky-dama-muerta-by-bgaming', 'Lucky Dama Muerta', `${SS}/bgaming/LuckyDamaMuerta.png`],
  ['candy-monsta-by-bgaming', 'Candy Monsta', `${SS}/bgaming/CandyMonsta.png`],
  ['elvis-frog-in-vegas-by-bgaming', 'Elvis Frog in Vegas', `${SS}/bgaming/ElvisFroginVegas.png`],
  ['book-of-cats-by-bgaming', 'Book of Cats', `${SS}/bgaming/BookOfCats.png`],
  ['duel-at-dawn-by-hacksaw', 'Duel at Dawn', `${SS}/hacksaw/DuelatDawn.png`],
  ['shaolin-master-by-hacksaw', 'Shaolin Master', `${SS}/hacksaw/ShaolinMaster.png`],
  ['elk-hunter-by-netent', 'Elk Hunter', `${SS}/evolution/ElkHunter.png`],
  ['super-striker-by-netent', 'Super Striker', `${SS}/evolution/SuperStriker.png`],
  ['johnny-cash-by-bgaming', 'Johnny Cash', `${SS}/bgaming/JohnnyCash.png`],
  ['fruit-million-by-bgaming', 'Fruit Million', `${SS}/bgaming/FruitMillion.png`],
  ['four-lucky-diamonds-by-bgaming', 'Four Lucky Diamonds', `${SS}/bgaming/FourLuckyDiamonds.png`],
  ['wbc-ring-of-riches-by-bgaming', 'WBC Ring Of Riches', `${SS}/bgaming/WbcRingOfRiches.png`],
  ['dig-dig-digger-by-bgaming', 'Dig Dig Digger', `${SS}/bgaming/DigDigDigger.png`],
  ['aloha-king-elvis-by-bgaming', 'Aloha King Elvis', `${SS}/bgaming/AlohaKingElvis.png`],
  ['deep-sea-by-bgaming', 'Deep Sea', `${SS}/bgaming/DeepSea.png`],
];

const LIVE = [
  ['first-person-lightning-roulette-by-evolution', 'First Person Lightning Roulette', `${SS}/evolution/roulette_rng.png`],
  ['first-person-lightning-baccarat-by-evolution', 'First Person Lightning Baccarat', `${SS}/evolution/FirstPersonXXXtremeLightningBaccarat.png`],
  ['auto-lightning-roulette-by-evolution', 'Auto Lightning Roulette', `${SS}/evolution/speed_roulette.png`],
  ['blackjack-x-1-azure-by-pragmaticlive', 'Blackjack X 1 - Azure', `${SS}/pragmaticexternal/BlackjackX1Azure.png`],
  ['speed-baccarat-7-by-pragmaticlive', 'Speed Baccarat 7', `${SS}/pragmaticexternal/SpeedBaccarat7.png`],
  ['speed-baccarat-11-by-pragmaticlive', 'Speed Baccarat 11', `${SS}/pragmaticexternal/SpeedBaccarat11.png`],
  ['speed-vip-blackjack-a-by-evolution', 'Speed VIP Blackjack A', `${SS}/evolution/speed_blackjack_a.png`],
  ['speed-vip-blackjack-c-by-evolution', 'Speed VIP Blackjack C', `${SS}/evolution/speed_blackjack_c.png`],
  ['speed-vip-blackjack-g-by-evolution', 'Speed VIP Blackjack G', `${SS}/evolution/speed_blackjack_g.png`],
  ['salon-priv-baccarat-f-by-evolution', 'Salon Privé Baccarat F', `${SS}/evolution/SalonPriveBaccaratF.png`],
  ['salon-priv-baccarat-e-by-evolution', 'Salon Privé Baccarat E', `${SS}/evolution/salon_prive_baccarat_e.png`],
  ['blackjack-vip-44-by-evolution', 'Blackjack VIP 44', `${SS}/evolution/BlackjackVIP44.png`],
  ['blackjack-vip-41-by-evolution', 'Blackjack VIP 41', `${SS}/evolution/BlackjackVIP41.png`],
  ['blackjack-vip-37-by-evolution', 'Blackjack VIP 37', `${SS}/evolution/BlackjackVIP37.png`],
  ['blackjack-vip-32-by-evolution', 'Blackjack VIP 32', `${SS}/evolution/BlackjackVIP32.png`],
  ['speed-baccarat-4-by-evolution', 'Speed Baccarat 4', `${SS}/evolution/SpeedBaccarat4.png`],
  ['evo-speed-blackjack-7-by-evolution', 'Evo Speed Blackjack 7', `${SS}/evolution/EvoSpeedBlackjack7.png`],
  ['evo-speed-blackjack-5-by-evolution', 'Evo Speed Blackjack 5', `${SS}/evolution/EvoSpeedBlackjack5.png`],
  ['blackjack-e-by-ezugi', 'Blackjack E', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/Ezugi/Blackjack-E.png'],
  ['blackjack-d-by-ezugi', 'Blackjack D', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/Ezugi/Blackjack-D.png'],
];

/* In-house BC Originals — the slugs `/game/:slug` resolves and whose art ships with the build. */
const ORIGINALS = [
  /* Only Originals this site offers (`SHOWN_ORIGINALS` in services/originals.js). Diamonds is
     offered too but ships no icon or cover art, so a showcase row for it would draw a stand-in. */
  ['limbo', 'Limbo'],
  ['plinko', 'Plinko'],
  ['mines', 'Mines'],
  ['keno', 'Keno'],
];

const byIndex = (list) => (i) => list[i % list.length];
const slot = byIndex(SLOTS);
const live = byIndex(LIVE);
const original = byIndex(ORIGINALS);

/* hash.game-style masked names: "Hidden" for a player who hides, otherwise the first two and
   the last letter around three stars. */
const PLAYERS = [
  HIDDEN_NAME, 'Ra***h', 'Vi***y', HIDDEN_NAME, 'Ar***n', 'Kh***s', 'Sa***m', HIDDEN_NAME,
  'Pr***k', 'Lu***y', 'De***v', 'Mo***a', HIDDEN_NAME, 'Jo***n', 'Ak***i', 'Ne***l',
  'Ha***t', HIDDEN_NAME, 'Ro***t', 'Ka***a', 'Si***r', 'Bi***g', HIDDEN_NAME, 'Ma***x',
];
const player = (i) => PLAYERS[i % PLAYERS.length];

/* Rough USD rates — only used to ORDER the High Roller board across coins. */
const USD_RATE = { USDT: 1, BTC: 65000, ETH: 3000, INRFIAT: 0.012 };

/* ── Recent Big Wins ────────────────────────────────────────────────────────────────────── */

/* VIP level -> tier, the same table `RecentBigWins/data.js` uses for the live feed. */
const TIER_BY_LEVEL = (level) =>
  level >= 22 ? 'diamond' : level >= 13 ? 'platinum' : level >= 9 ? 'gold' : level >= 5 ? 'silver' : level >= 1 ? 'bronze' : 'none';

const COIN_LABEL = { USDT: 'USDT', BTC: 'BTC', ETH: 'ETH', INRFIAT: 'INR' };

/* Compact, like the original's "$952.25K": thousands get a K and millions an M (truncated to
   2dp, so the label fits the 56px card), small crypto
   amounts keep their significant decimals. */
export function formatShowcaseAmount(value, coin) {
  const label = COIN_LABEL[coin] ?? coin;
  if (value >= 1e6) {
    const m = Math.floor((value / 1e6) * 100) / 100;
    return `${m.toFixed(2)}M ${label}`;
  }
  if (value >= 1000) {
    const k = Math.floor((value / 1000) * 100) / 100;
    return `${k.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}K ${label}`;
  }
  const digits = value < 1 ? 4 : 2;
  return `${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${label}`;
}

/* [gameIndex, amount, coin, vipLevel] per card; 20 per tab, biggest first like the live feed. */
const SLOT_WINS = [
  [0, 48210.5, 'USDT', 21], [3, 1.2841, 'BTC', 18], [9, 3125400, 'INRFIAT', 14], [1, 18.62, 'ETH', 23],
  [10, 26450.75, 'USDT', 12], [4, 0.6234, 'BTC', 9], [7, 1845000, 'INRFIAT', 16], [11, 15320.4, 'USDT', 7],
  [5, 9.48, 'ETH', 19], [2, 12870.0, 'USDT', 10], [12, 0.3912, 'BTC', 5], [6, 985600, 'INRFIAT', 13],
  [8, 9645.2, 'USDT', 22], [13, 5.73, 'ETH', 8], [14, 7420.55, 'USDT', 3], [15, 612500, 'INRFIAT', 11],
  [16, 0.1874, 'BTC', 17], [17, 5280.0, 'USDT', 6], [18, 2.96, 'ETH', 2], [19, 4155.3, 'USDT', 15],
];

const LIVE_WINS = [
  [0, 62500.0, 'USDT', 23], [4, 1.5512, 'BTC', 20], [1, 4210000, 'INRFIAT', 15], [11, 24.15, 'ETH', 22],
  [3, 31800.0, 'USDT', 13], [6, 0.7425, 'BTC', 10], [9, 2150000, 'INRFIAT', 18], [2, 19450.0, 'USDT', 9],
  [14, 11.2, 'ETH', 21], [5, 14200.0, 'USDT', 12], [7, 0.4105, 'BTC', 6], [10, 1125000, 'INRFIAT', 14],
  [12, 10850.0, 'USDT', 19], [8, 6.42, 'ETH', 4], [13, 8300.0, 'USDT', 11], [15, 745000, 'INRFIAT', 7],
  [16, 0.2236, 'BTC', 16], [17, 6125.0, 'USDT', 3], [18, 3.38, 'ETH', 8], [19, 4890.0, 'USDT', 1],
];

const ORIGINAL_WINS = [
  [0, 38450.0, 'USDT', 20], [1, 0.9812, 'BTC', 17], [2, 2650000, 'INRFIAT', 13], [3, 14.36, 'ETH', 22],
  [4, 21300.0, 'USDT', 11], [5, 0.5421, 'BTC', 9], [6, 1420000, 'INRFIAT', 15], [7, 12650.0, 'USDT', 6],
  [8, 7.84, 'ETH', 18], [9, 9875.5, 'USDT', 12], [10, 0.3048, 'BTC', 4], [11, 815000, 'INRFIAT', 10],
  [0, 7640.0, 'USDT', 21], [1, 4.12, 'ETH', 7], [2, 6120.25, 'USDT', 2], [3, 532000, 'INRFIAT', 14],
  [4, 0.1525, 'BTC', 16], [5, 4380.0, 'USDT', 5], [6, 2.18, 'ETH', 8], [7, 3640.0, 'USDT', 3],
];

const toWin = (pick, type, offset) => ([index, amount, coin, level], i) => {
  const [slug, name, image] = pick(index);
  const who = player(i * 7 + offset);
  return {
    type,
    gameUnique: slug,
    fullName: name,
    icon: image ?? assetExact(slug),
    tier: TIER_BY_LEVEL(level),
    name: who === HIDDEN_NAME ? 'Hidden' : who,
    amount: formatShowcaseAmount(amount, coin),
    // Raw figure + its coin, for the card to print in the viewer's selected currency.
    value: amount,
    valueCurrency: coin,
  };
};

const slotWins = SLOT_WINS.map(toWin(slot, 'slots', 4));
const liveWins = LIVE_WINS.map(toWin(live, 'live', 9));
const originalWins = ORIGINAL_WINS.map(toWin(original, 'originals', 1));

/* All interleaves the three types, so the strip reads as one mixed feed. */
const interleave = (...lists) =>
  Array.from({ length: Math.max(...lists.map((l) => l.length)) }, (_, i) => lists.map((l) => l[i])).flat().filter(Boolean);

/**
 * The Recent Big Wins rows for a tab — the card shape `RecentBigWins` reads
 * (`{gameUnique, icon, tier, name, amount}`). `tab` is the gameTypeId: 0 All, 1 BC Originals,
 * 2 Slots, 3 Live Casino. With BC Originals switched off, All carries no originals.
 */
export function staticBigWins(tab = 0, { originals = true } = {}) {
  if (tab === 1) return originals ? originalWins : [];
  if (tab === 2) return slotWins;
  if (tab === 3) return liveWins;
  return interleave(originals ? originalWins : [], slotWins, liveWins).slice(0, 20);
}

/* ── Latest round & Race: Latest Bet and High Roller ────────────────────────────────────── */

/* A bet row in the shape `LatestBets` reads, plus `slug` (link target) and `icon` (artwork for a
   third-party game the original's icon map does not know). `payout` is percent-of-stake: 0 is a
   lost bet, 250 a 2.5x win. */
function toBet([pick, index, user, coin, stake, payout], i, prefix) {
  const [slug, name, image] = pick(index);
  const profit = Number((stake * (payout / 100 - 1)).toFixed(8));
  return {
    betId: `${prefix}-${i}`,
    original: !image,
    slug,
    icon: image,
    gameUnique: slug,
    fullName: name,
    userName: player(user),
    currencyName: coin,
    throwAmount: String(stake),
    profitAmount: String(profit),
    payout,
  };
}

const LATEST = [
  [original, 0, 1, 'USDT', 50, 212], [slot, 0, 2, 'INRFIAT', 500, 0], [live, 0, 3, 'USDT', 100, 200],
  [original, 1, 4, 'BTC', 0.0025, 198], [slot, 3, 5, 'USDT', 20, 0], [live, 4, 6, 'ETH', 0.05, 195],
  [original, 2, 7, 'INRFIAT', 1000, 350], [slot, 9, 8, 'USDT', 10, 1240], [live, 3, 9, 'USDT', 250, 0],
  [original, 3, 10, 'USDT', 30, 196], [slot, 1, 11, 'BTC', 0.0012, 0], [live, 1, 12, 'INRFIAT', 2500, 225],
  [original, 4, 13, 'ETH', 0.02, 412], [slot, 7, 14, 'USDT', 15, 85], [live, 6, 15, 'USDT', 500, 250],
  [original, 5, 16, 'USDT', 25, 0], [slot, 10, 17, 'INRFIAT', 800, 560], [live, 9, 18, 'BTC', 0.004, 195],
  [original, 6, 19, 'USDT', 40, 300], [slot, 4, 20, 'ETH', 0.03, 0], [live, 2, 21, 'USDT', 75, 3600],
  [original, 7, 22, 'INRFIAT', 1500, 196], [slot, 12, 23, 'USDT', 5, 2150], [live, 11, 0, 'USDT', 200, 0],
  [original, 8, 1, 'BTC', 0.0018, 120], [slot, 5, 2, 'USDT', 12, 0], [live, 7, 3, 'ETH', 0.1, 150],
  [original, 9, 4, 'USDT', 60, 480], [slot, 6, 5, 'INRFIAT', 300, 0], [live, 14, 6, 'USDT', 150, 200],
];

const HIGH = [
  [live, 0, 7, 'USDT', 5000, 500], [slot, 0, 8, 'BTC', 0.15, 1250], [original, 0, 9, 'USDT', 2000, 1100],
  [live, 4, 10, 'ETH', 4, 300], [slot, 9, 11, 'INRFIAT', 250000, 820], [original, 2, 12, 'BTC', 0.08, 2450],
  [live, 1, 13, 'USDT', 8000, 225], [slot, 3, 14, 'USDT', 1000, 1560], [original, 3, 15, 'ETH', 2.5, 395],
  [live, 3, 16, 'USDT', 10000, 200], [slot, 10, 17, 'BTC', 0.05, 2800], [original, 1, 18, 'INRFIAT', 500000, 400],
  [live, 6, 19, 'USDT', 6000, 250], [slot, 4, 20, 'ETH', 1.2, 1050], [original, 4, 21, 'USDT', 1500, 920],
  [live, 9, 22, 'BTC', 0.12, 195], [slot, 7, 23, 'USDT', 750, 1880], [original, 5, 0, 'USDT', 3000, 312],
  [live, 11, 1, 'INRFIAT', 400000, 250], [slot, 11, 2, 'USDT', 500, 2200], [original, 6, 3, 'ETH', 1.5, 500],
  [live, 2, 4, 'USDT', 2500, 410], [slot, 1, 5, 'INRFIAT', 150000, 900], [original, 7, 6, 'USDT', 2500, 396],
  [live, 12, 8, 'ETH', 2, 230], [slot, 13, 9, 'USDT', 400, 2500], [original, 8, 10, 'BTC', 0.04, 720],
  [live, 13, 11, 'USDT', 4000, 220], [slot, 14, 12, 'USDT', 300, 2900], [original, 9, 13, 'INRFIAT', 200000, 450],
];

const usdProfit = (bet) => Number(bet.profitAmount) * (USD_RATE[bet.currencyName] ?? 1);

/** Latest Bet: 30 recent rounds, newest first, wins and losses mixed. */
export const STATIC_LATEST_BETS = LATEST.map((row, i) => toBet(row, i, 'lb'));

/** High Roller: 30 big wins, biggest (in USD terms) first. */
export const STATIC_HIGH_ROLLERS = HIGH.map((row, i) => toBet(row, i, 'hr')).sort((a, b) => usdProfit(b) - usdProfit(a));

/* ── The game page's High win / Lucky win board ──────────────────────────────────────────── */

/* A small string hash, so a game's showcase is the same on every visit and differs per game. */
const seedOf = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/* [coin, stake] pairs the board draws from; payouts are percent-of-stake like the tables above. */
const GAME_STAKES = [
  ['INRFIAT', 22754.68], ['USDT', 250], ['INRFIAT', 3320.97], ['USDT', 40], ['INRFIAT', 5788.44],
  ['USDT', 1200], ['INRFIAT', 1500], ['USDT', 75], ['INRFIAT', 980], ['USDT', 15],
];
const GAME_PAYOUTS = [14333, 77143, 43148, 2560, 9850, 1240, 18800, 6400, 3150, 52000];

/**
 * Ten winning rounds for one game, in the `LatestBets` bet shape. Shown ONLY when the live
 * `top-wins?game=` board for that game is empty (the same static-showcase rule as the home
 * tables, user's request). Deterministic per slug.
 */
export function staticGameWins(slug) {
  const seed = seedOf(slug);
  return GAME_STAKES.map(([coin, stake], i) => {
    const payout = GAME_PAYOUTS[(i + seed) % GAME_PAYOUTS.length];
    const scaled = Number((stake * (0.6 + ((seed >> i) % 9) / 10)).toFixed(2));
    return {
      betId: `gw-${slug}-${i}`,
      userName: player(seed + i * 5),
      currencyName: coin,
      throwAmount: String(scaled),
      profitAmount: String(Number((scaled * (payout / 100 - 1)).toFixed(2))),
      payout,
    };
  });
}
