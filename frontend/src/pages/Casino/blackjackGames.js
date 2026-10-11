/* The Blackjack tab's games — transcribed from the live page's rendered grid.
 *
 * One of the five sets added together, alongside hotGames.js, slotGames.js, originalGames.js
 * and pokerGames.js, and for the same reason: the casino page's chunk and feed are both
 * missing from the mirror (see catalogue.js). It replaces a derived stand-in over the
 * 118-game capture.
 *
 * Seventy-five games over the two pages the live pager itself reports ("of 02"), so
 * unlike Hot Games and Slots this tab IS complete — the pager agrees with itself here.
 * Page 1 holds 40 and page 2 holds 35.
 *
 * What checks the transcription: every slug that also appears in one of the other four sets
 * carries the same artwork hash there, and all 75 hashes resolved with no 404s.
 *
 * Player counts are a snapshot and drift every second. Badges are recorded and drawn nowhere
 * — the live page renders them `hidden` behind `explore-show`.
 */

/* Slug suffix -> the studio's name as data/providers.js spells it. Four of these are that
 * file's own odd capitalisations, not typos: WALI GAMES, Realtime Gaming, Caleta, BetSoft.
 */
const PROVIDERS = {
  'evolution-gaming': 'Evolution Gaming',
  ezugi: 'Ezugi',
  habanero: 'Habanero',
  'wali-games': 'WALI GAMES',
  betsoft: 'BetSoft',
  netent: 'NetEnt',
  'red-tiger': 'Red Tiger',
  'real-time-gaming': 'Realtime Gaming',
  winfinity: 'Winfinity',
  tada: 'TaDa',
  'sexy-gaming': 'Sexy Gaming',
  'fa-chai': 'FA CHAI',
  tvbet: 'TVBET',
  'tom-horn-gaming': 'Tom Horn Gaming', // not in data/providers.js
  sv388: 'SV388',
  spadegaming: 'Spadegaming',
  'pg-soft': 'PG Soft',
  inout: 'InOut',
  galaxsys: 'Galaxsys',
  'caleta-gaming': 'Caleta',
};

const CATEGORY = 'Blackjack';
const SECTION = 'blackjack';
const TAG = 'Blackjack';

/* [slug, name, players, badge?] */
const ROWS = [
  ['bcgame-iron-blackjack-by-evolution-gaming', 'BCGAME Iron Blackjack', 47, 'Exclusive'],
  ['bcgame-bronze-blackjack-by-evolution-gaming', 'BCGAME Bronze Blackjack', 47, 'Exclusive'],
  ['bcgame-silver-blackjack-3-by-evolution-gaming', 'BCGAME Silver Blackjack 3', 60, 'Exclusive'],
  ['bcgame-silver-blackjack-by-evolution-gaming', 'BCGAME Silver Blackjack', 17, 'Exclusive'],
  ['blackjack-classic-32-by-evolution-gaming', 'Blackjack Classic 32', 29],
  ['blackjack-classic-64-by-evolution-gaming', 'Blackjack Classic 64', 71],
  ['bcgame-blackjack-freebet-by-evolution-gaming-16440', 'BCGAME Blackjack Freebet', 34, 'Exclusive'],
  ['blackjack', 'Blackjack', 43],
  ['bcgame-speed-blackjack-by-evolution-gaming', 'BCGAME Speed Blackjack', 100, 'Exclusive'],
  ['platinum-private-blackjack-3-by-evolution-gaming', 'Platinum Private Blackjack 3', 46],
  ['bcgame-speed-blackjack-bronze-by-evolution-gaming', 'BCGAME Speed Blackjack Bronze', 59, 'Exclusive'],
  ['platinum-private-blackjack-2-by-evolution-gaming', 'Platinum Private Blackjack 2', 46],
  ['bcgame-silver-blackjack-2-by-evolution-gaming', 'BCGAME Silver Blackjack 2', 23, 'Exclusive'],
  ['first-person-blackjack-by-evolution-gaming', 'First Person Blackjack', 41],
  ['platinum-private-blackjack-1-by-evolution-gaming', 'Platinum Private Blackjack 1', 46],
  ['bcgame-gold-blackjack-by-evolution-gaming', 'BCGAME Gold Blackjack', 39, 'Exclusive'],
  ['grand-japanese-speed-blackjack-by-evolution-gaming', 'Grand Japanese Speed Blackjack', 59],
  ['bcgame-platinum-blackjack-by-evolution-gaming', 'BCGAME Platinum Blackjack', 69, 'Exclusive'],
  ['bcgame-bet-stacker-blackjack-by-evolution-gaming', 'BCGAME Bet Stacker Blackjack', 21, 'Exclusive'],
  ['infinite-blackjack-by-evolution-gaming', 'Infinite Blackjack', 90],
  ['power-blackjack-by-evolution-gaming', 'Power Blackjack', 12],
  ['blackjack-vip-38-by-evolution-gaming-5284', 'Blackjack VIP 38', 92],
  ['blackjack-vip-44-by-evolution-gaming-5290', 'Blackjack VIP 44', 67],
  ['blackjack-vip-43-by-evolution-gaming-5278', 'Blackjack VIP 43', 31],
  ['blackjack-platinum-vip-by-evolution-gaming', 'Blackjack Platinum VIP', 42],
  ['salon-priv-blackjack-a-by-evolution-gaming', 'Salon Privé Blackjack A', 91],
  ['blackjack-vip-16-by-evolution-gaming', 'Blackjack VIP 16', 77],
  ['bcgame-blackjack-salon-privee-by-evolution-gaming', 'BCGAME Blackjack Salon Privee', 34, 'Exclusive'],
  ['blackjack-vip-50-by-evolution-gaming-5296', 'Blackjack VIP 50', 10],
  ['vip-blackjack-en-espa-ol-9-by-evolution-gaming', 'VIP Blackjack en Español 9', 51],
  ['vip-blackjack-en-espa-ol-4-by-evolution-gaming', 'VIP Blackjack en Español 4', 85],
  ['vip-blackjack-en-espa-ol-6-by-evolution-gaming', 'VIP Blackjack en Español 6', 86],
  ['speed-vip-blackjack-f-by-evolution-gaming', 'Speed VIP Blackjack F', 24],
  ['salon-priv-blackjack-b-by-evolution-gaming', 'Salon Privé Blackjack B', 91],
  ['vip-blackjack-em-portugu-s-by-evolution-gaming', 'VIP Blackjack em Português', 39],
  ['vip-blackjack-en-espa-ol-7-by-evolution-gaming', 'VIP Blackjack en Español 7', 70],
  ['speed-vip-blackjack-i-by-evolution-gaming', 'Speed VIP Blackjack I', 45],
  ['blackjack-classic-59-by-evolution-gaming', 'Blackjack Classic 59', 78],
  ['blackjack-vip-2-by-evolution-gaming', 'Blackjack VIP 2', 95],
  ['speed-vip-blackjack-c-by-evolution-gaming', 'Speed VIP Blackjack C', 15],
  ['vip-blackjack-em-portugu-s-3-by-evolution-gaming', 'VIP Blackjack em Português 3', 26],
  ['speed-vip-blackjack-a-by-evolution-gaming', 'Speed VIP Blackjack A', 100],
  ['blackjack-diamond-vip-by-evolution-gaming', 'Blackjack Diamond VIP', 38],
  ['vip-blackjack-em-portugu-s-4-by-evolution-gaming', 'VIP Blackjack em Português 4', 26],
  ['infinite-bet-stacker-blackjack-by-evolution-gaming', 'Infinite Bet Stacker Blackjack', 30],
  ['european-blackjack-by-betsoft', 'European Blackjack', 10],
  ['american-blackjack-by-betsoft', 'American Blackjack', 10],
  ['black-jack-cl-ssico-em-portugues-5-by-evolution-gaming', 'Black Jack Clássico em Portugues 5', 50],
  ['vip-blackjack-em-portugu-s-2-by-evolution-gaming', 'VIP Blackjack em Português 2', 26],
  ['vip-blackjack-em-portugu-s-5-by-evolution-gaming', 'VIP Blackjack em Português 5', 10],
  ['blackjack-vip-3-by-evolution-gaming', 'Blackjack VIP 3', 97],
  ['blackjack-beto-mobile-by-caleta-gaming', 'Blackjack Beto Mobile', 13],
  ['lightning-blackjack-by-evolution-gaming', 'Lightning Blackjack', 74],
  ['blackjack-classic-63-by-evolution-gaming', 'Blackjack Classic 63', 42],
  ['korean-platinum-private-blackjack-2-by-evolution-gaming', 'Korean Platinum Private Blackjack 2', 38],
  ['blackjack-classic-65-by-evolution-gaming', 'Blackjack Classic 65', 55],
  ['easy-blackjack-by-evolution-gaming', 'Easy Blackjack', 30],
  ['blackjack-by-galaxsys', 'BlackJack', 81],
  ['salon-priv-blackjack-c-by-evolution-gaming', 'Salon Privé Blackjack C', 93],
  ['infinite-fun-fun-21-blackjack-by-evolution-gaming', 'INFINITE FUN FUN 21 BLACKJACK', 100],
  ['blackjack21-by-wali-games', 'Blackjack21', 86],
  ['korean-platinum-private-blackjack-1-by-evolution-gaming', 'Korean Platinum Private Blackjack 1', 28],
  ['super-7-blackjack-by-betsoft', 'Super 7 Blackjack', 10],
  ['japanese-platinum-private-blackjack-1-by-evolution-gaming', 'Japanese Platinum Private Blackjack 1', 49],
  ['first-person-lightning-blackjack-by-evolution-gaming', 'First Person Lightning Blackjack', 63],
  ['salon-priv-blackjack-o-by-evolution-gaming', 'Salon Privé Blackjack O', 70],
  ['blackjack-em-portugu-s-1-by-evolution-gaming', 'Blackjack em Português 1', 95],
  ['pirate-21-by-betsoft', 'Pirate 21', 85],
  ['salon-priv-blackjack-f-by-evolution-gaming', 'Salon Privé Blackjack F', 35],
  ['blackjack-by-tada', 'Blackjack', 87],
  ['blackjack-lucky-ladies-by-tada', 'Blackjack Lucky Ladies', 34],
  ['bcgame-blackjack-d-by-evolution-gaming', 'BCGAME Blackjack D', 21, 'Exclusive'],
  ['blackjack-by-evolution-gaming', 'Blackjack', 54],
  ['bcgame-blackjack-c-by-evolution-gaming', 'BCGAME Blackjack C', 11, 'Exclusive'],
  ['classic-blackjack-by-red-tiger', 'Classic Blackjack', 42],
];

export const BLACKJACK_GAMES = ROWS.map(([slug, name, players, badge]) => {
  const parts = slug.split('-by-');
  /* Split on the LAST '-by-', then drop a trailing numeric disambiguator: seven of these
     slugs read '...-by-evolution-gaming-17929', the site's way of separating two tables
     that would otherwise collide on one name. */
  const suffix = parts.length > 1 ? parts[parts.length - 1].replace(/-d+$/, '') : '';
  return {
    slug,
    name,
    players,
    badge,
    /* No '-by-' at all means one of BC.GAME's own tables (Baccarat, Blackjack, BCPoker,
       Video Poker, and the two Multiplayer tables). */
    provider: PROVIDERS[suffix] || 'BC.GAME',
    category: CATEGORY,
    sections: [SECTION],
    tags: [TAG],
  };
});
