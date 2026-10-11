/* Latest round & Race — the Latest Bet feed.
 *
 * Data: bc.game/bc.game/api/game/support/home/last-bet/index.html, a real captured
 * response of 50 bets. The component reverses it and keeps 30 (`[...r].reverse().slice(0, D)`
 * with D = 30), then shows 10 at a time; these are those 30 in that order.
 *
 * On the live site the list is a websocket feed — each new bet is unshifted onto the front
 * and the last one drops off, which is what the row capacity of 10 is for. There is no
 * socket here, so the list is static.
 *
 * The High Roller and Wager Contest tabs hit endpoints the mirror did not capture
 * (`/game/support/home/v2/high-rollers/`), so they render this same feed for now.
 */

/* `j(gameUnique, providerName)` — a 60-case switch over the camelCased slug, falling back
   to the blackjack icon for anything it does not know, which is most third-party games.
   45 of the icons were base64 in the bundle and are decoded into src/assets/gameicons;
   13 more live at /assets/*.png and are not in the mirror, so those slugs also fall back. */
import iconMap from '../../../assets/gameicons/_map.json';

const icons = import.meta.glob('../../../assets/gameicons/*.png', {
  eager: true,
  import: 'default',
});
const coins = import.meta.glob('../../../assets/coins/*.png', { eager: true, import: 'default' });

export const coinIcon = (currency) => coins[`../../../assets/coins/${currency}.png`];

/* The switch strips "99"/"96" from the slug first — those are internal game revisions
   (Limbo98 vs limbo), not different games. */
const slugKey = (gameUnique) =>
  gameUnique.toLowerCase().replace(/[^a-z0-9]/g, '').replace('99', '').replace('96', '');

export function gameIcon(gameUnique) {
  const file = iconMap[slugKey(gameUnique)] ?? iconMap.blackjack;
  return icons[`../../../assets/gameicons/${file}`];
}

/* The API sends payout as an integer percent-of-stake; the column shows it as a multiplier
   to 2dp. A payout under 100 (multiplier < 1) is a loss and stays muted; at or above, the
   profit turns brand green and gains a leading "+". */
export const multiplier = (payout) => Number(payout) / 100;

/* `printCurrency(..., { hasAlias: false, precision: 5 })` — fixed precision with the
   trailing zeros trimmed, so 0.080000000 shows as 0.08 and 30 as 30. */
export function formatAmount(value, precision = 5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toFixed(precision).replace(/0+$/, '').replace(/\.$/, '');
}

export const bets = [
  {
    betId: "1872226243680557845",
    gameUnique: "twist",
    fullName: "Twist",
    userName: "Lvanidujdsac",
    currencyName: "INRFIAT",
    throwAmount: "50.000000000",
    profitAmount: "30",
    payout: 160,
  },
  {
    betId: "1872226149856079867",
    gameUnique: "hilo",
    fullName: "Hilo",
    userName: "hirosaki0216",
    currencyName: "SOL",
    throwAmount: "0.173938000",
    profitAmount: "-0.173938",
    payout: 0,
  },
  {
    betId: "1872226292472896628",
    gameUnique: "limbo",
    fullName: "Limbo",
    userName: "7kh1ahegunqt",
    currencyName: "USDT",
    throwAmount: "0.200000000",
    profitAmount: "0.002",
    payout: 101,
  },
  {
    betId: "1872226383253359066",
    gameUnique: "starlight-christmas-by-pragmatic-play",
    fullName: "Starlight Christmas",
    userName: "alexx12",
    currencyName: "IDRFIAT",
    throwAmount: "3997.11635552",
    profitAmount: "-3997.11635552",
    payout: 0,
  },
  {
    betId: "1872226211996790197",
    gameUnique: "tower-legend",
    fullName: "Tower Legend",
    userName: "409151lala",
    currencyName: "INRFIAT",
    throwAmount: "38.000000000",
    profitAmount: "-38",
    payout: 0,
  },
  {
    betId: "1872226285527128056",
    gameUnique: "mines",
    fullName: "Mines",
    userName: "GashThrasher69",
    currencyName: "USDC",
    throwAmount: "0.099900000",
    profitAmount: "-0.0999",
    payout: 0,
  },
  {
    betId: "1872226361678914619",
    gameUnique: "guardian-of-athens-by-quickspin",
    fullName: "Guardian of Athens",
    userName: "PleaseMaxWin",
    currencyName: "BCD",
    throwAmount: "10.00847",
    profitAmount: "-10.00847",
    payout: 0,
  },
  {
    betId: "1872226381849315583",
    gameUnique: "ultimate-striker-by-pg-soft",
    fullName: "Ultimate Striker",
    userName: "Domi1993",
    currencyName: "SOL",
    throwAmount: "0.02726429",
    profitAmount: "-0.02726429",
    payout: 0,
  },
  {
    betId: "1872226276562845865",
    gameUnique: "hash-dice",
    fullName: "Hash Dice",
    userName: "****",
    currencyName: "BCD",
    throwAmount: "0.400000000",
    profitAmount: "-0.4",
    payout: 0,
  },
  {
    betId: "1872226239446409487",
    gameUnique: "limbo",
    fullName: "Limbo",
    userName: "Emi12em",
    currencyName: "BC",
    throwAmount: "4.340000000",
    profitAmount: "-4.34",
    payout: 0,
  },
  {
    betId: "1872226244739615316",
    gameUnique: "twist",
    fullName: "Twist",
    userName: "Bewokbotax",
    currencyName: "IDRFIAT",
    throwAmount: "1800.410000000",
    profitAmount: "2700.615",
    payout: 250,
  },
  {
    betId: "1872226237332483997",
    gameUnique: "limbo",
    fullName: "Limbo",
    userName: "Sahil l2",
    currencyName: "INRFIAT",
    throwAmount: "9.520000000",
    profitAmount: "0.0952",
    payout: 101,
  },
  {
    betId: "1872226105859917607",
    gameUnique: "bubble-shooter",
    fullName: "Bubble Shooter",
    userName: "h4y8sqpypi15",
    currencyName: "KESFIAT",
    throwAmount: "25.810000000",
    profitAmount: "7.743",
    payout: 130,
  },
  {
    betId: "1872226183290966351",
    gameUnique: "limbo",
    fullName: "Limbo",
    userName: "silesiagadawa",
    currencyName: "BCD",
    throwAmount: "0.098791000",
    profitAmount: "-0.098791",
    payout: 0,
  },
  {
    betId: "1872226234168918689",
    gameUnique: "keno",
    fullName: "Keno",
    userName: "****",
    currencyName: "AVAX",
    throwAmount: "0.200000000",
    profitAmount: "-0.2",
    payout: 0,
  },
  {
    betId: "1872226353778939718",
    gameUnique: "speed-roulette-1-by-pragmatic-play",
    fullName: "Speed Roulette 1",
    userName: "2fk6jb5yqo20",
    currencyName: "BCD",
    throwAmount: "0.1000834",
    profitAmount: "-0.1000834",
    payout: 0,
  },
  {
    betId: "1872226374399181967",
    gameUnique: "money-coming-expanded-bets-by-tada",
    fullName: "Money Coming Expanded Bets",
    userName: "uo334k603pwq",
    currencyName: "USDT",
    throwAmount: "0.07360667",
    profitAmount: "-0.07360667",
    payout: 0,
  },
  {
    betId: "1872226151395378918",
    gameUnique: "color",
    fullName: "Perya Color Game",
    userName: "jpenqfmqm08xo0",
    currencyName: "KESFIAT",
    throwAmount: "25.820000000",
    profitAmount: "0",
    payout: 100,
  },
  {
    betId: "1872226247124084164",
    gameUnique: "fast-crash",
    fullName: "Fast Crash",
    userName: "Aeiryddwttac",
    currencyName: "BC",
    throwAmount: "4.390000000",
    profitAmount: "-4.39",
    payout: 0,
  },
  {
    betId: "1872226240503374258",
    gameUnique: "keno",
    fullName: "Keno",
    userName: "dxjbftmqmfj6vk",
    currencyName: "INRFIAT",
    throwAmount: "20.000000000",
    profitAmount: "49.292",
    payout: 346,
  },
  {
    betId: "1872226354978512983",
    gameUnique: "winning-clover-5-by-fazi",
    fullName: "Winning Clover 5",
    userName: "N0thing444",
    currencyName: "USDT",
    throwAmount: "5.00412",
    profitAmount: "-5.00412",
    payout: 0,
  },
  {
    betId: "1872226388101979866",
    gameUnique: "deadliest-sea-by-croco-gaming",
    fullName: "Deadliest Sea",
    userName: "Qijidhrvnxcc",
    currencyName: "IDRFIAT",
    throwAmount: "999.98131802",
    profitAmount: "4499.91629107",
    payout: 550,
  },
  {
    betId: "1872226338190811880",
    gameUnique: "dice-drop-by-tada",
    fullName: "Dice & Drop",
    userName: "4mdek56wlm8q",
    currencyName: "BCD",
    throwAmount: "0.6005094",
    profitAmount: "2.1017829",
    payout: 450,
  },
  {
    betId: "1872226359524090606",
    gameUnique: "pixel-hot-40-by-fazi",
    fullName: "Pixel Hot 40",
    userName: "zvrvhvga950l",
    currencyName: "TON",
    throwAmount: "0.86260202",
    profitAmount: "1.29390304",
    payout: 250,
  },
  {
    betId: "1872226373344314345",
    gameUnique: "golden-genie-by-fa-chai",
    fullName: "GOLDEN GENIE",
    userName: "Jigar Baldaniya",
    currencyName: "INRFIAT",
    throwAmount: "39.99999978",
    profitAmount: "-39.99999978",
    payout: 0,
  },
  {
    betId: "1872226188167889517",
    gameUnique: "mines",
    fullName: "Mines",
    userName: "user57180529",
    currencyName: "BCD",
    throwAmount: "2.000000000",
    profitAmount: "-2",
    payout: 0,
  },
  {
    betId: "1872226316966578642",
    gameUnique: "dead-dead-or-deader-by-nolimitcity",
    fullName: "Dead, Dead, or Deader",
    userName: "Qwxdabcczoyb",
    currencyName: "BCD",
    throwAmount: "1.5012705",
    profitAmount: "-1.5012705",
    payout: 0,
  },
  {
    betId: "1872226377601538113",
    gameUnique: "anubis-wrath-by-pg-soft",
    fullName: "Anubis Wrath",
    userName: "Kamalai",
    currencyName: "IDRFIAT",
    throwAmount: "3602.66789305",
    profitAmount: "-3602.66789305",
    payout: 0,
  },
  {
    betId: "1872226113233509742",
    gameUnique: "keno",
    fullName: "Keno",
    userName: "jmshotr21",
    currencyName: "BCD",
    throwAmount: "0.200000000",
    profitAmount: "-0.2",
    payout: 0,
  },
  {
    betId: "1872226380797593702",
    gameUnique: "treasure-raiders-by-fa-chai",
    fullName: "TREASURE RAIDERS",
    userName: "Wzmdddpnqrac",
    currencyName: "INRFIAT",
    throwAmount: "4.99999983",
    profitAmount: "-4.99999983",
    payout: 0,
  },
];

export default bets;
