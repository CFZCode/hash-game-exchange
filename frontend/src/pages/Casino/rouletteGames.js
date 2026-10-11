/* The Roulette tab's games — transcribed from the live page's rendered grid.
 *
 * One of the five sets added together, alongside hotGames.js, slotGames.js, originalGames.js
 * and pokerGames.js, and for the same reason: the casino page's chunk and feed are both
 * missing from the mirror (see catalogue.js). It replaces a derived stand-in over the
 * 118-game capture.
 *
 * Sixty-eight games over the two pages the pager reports ("of 02") — complete, as
 * Blackjack is. Page 1 holds 40 and page 2 holds 28.
 *
 * TWENTY-ONE of these share one artwork hash (00f1b83ddc, a generic roulette wheel). That is
 * the live site's own doing: Ezugi's regional tables mostly ship without individual covers.
 * They are downloaded once and written to each slug's filename, because utils/gameArt.js
 * globs by slug and has no way to alias one file to many.
 *
 * What checks the transcription: every slug that also appears in one of the other four sets
 * carries the same artwork hash there, and all 68 hashes resolved with no 404s.
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

const CATEGORY = 'Roulette';
const SECTION = 'roulette';
const TAG = 'Roulette';

/* [slug, name, players, badge?] */
const ROWS = [
  ['bc-game-xxxtreme-lightning-roulette-by-evolution-gaming', 'BC.GAME XXXtreme Lightning Roulette', 23, 'Exclusive'],
  ['auto-roulette-by-evolution-gaming', 'Auto-Roulette', 89],
  ['immersive-roulette-by-evolution-gaming', 'Immersive Roulette', 78],
  ['bcgame-roulette-by-evolution-gaming', 'BCGAME Roulette', 31, 'Exclusive'],
  ['lightning-roulette-by-evolution-gaming', 'Lightning Roulette', 37],
  ['xxxtreme-lightning-roulette-by-evolution-gaming', 'XXXtreme Lightning Roulette', 58],
  ['lotus-roulette-by-evolution-gaming', 'Lotus Roulette', 47],
  ['emperor-roulette-by-evolution-gaming', 'Emperor Roulette', 32],
  ['red-door-roulette-by-evolution-gaming', 'Red Door Roulette', 68],
  ['speed-roulette-by-evolution-gaming', 'Speed Roulette', 100],
  ['first-person-roulette-by-evolution-gaming', 'First Person Roulette', 10],
  ['speed-auto-roulette-by-evolution-gaming', 'Speed Auto Roulette', 53],
  ['auto-roulette-vip-by-evolution-gaming', 'Auto-Roulette VIP', 92],
  ['vip-roulette-by-evolution-gaming', 'VIP Roulette', 44],
  ['venezia-roulette-by-evolution-gaming', 'Venezia Roulette', 77],
  ['roulette-multiplayer', 'Roulette Multiplayer', 69],
  ['roleta-da-sorte-by-ezugi', 'Roleta da sorte', 10],
  ['football-studio-roulette-by-evolution-gaming', 'Football Studio Roulette', 42],
  ['japanese-roulette-by-evolution-gaming', 'Japanese Roulette', 32],
  ['first-person-lightning-roulette-by-evolution-gaming', 'First Person Lightning Roulette', 61],
  ['salon-priv-roulette-by-evolution-gaming', 'Salon Privé Roulette', 90],
  ['deutsches-roulette-by-evolution-gaming', 'Deutsches Roulette', 79],
  ['first-person-xxxtreme-lightning-roulette-by-evolution-gaming', 'First Person XXXtreme Lightning Roulette', 82],
  ['fireball-roulette-by-evolution-gaming', 'FireBall Roulette', 11],
  ['bucharest-roulette-by-evolution-gaming', 'Bucharest Roulette', 58],
  ['gold-vault-roulette-by-evolution-gaming', 'Gold Vault Roulette', 25],
  ['norsk-roulette-by-evolution-gaming', 'Norsk Roulette', 79],
  ['bc-auto-roulette-by-ezugi', 'BC Auto Roulette', 93, 'Exclusive'],
  ['svensk-roulette-by-evolution-gaming', 'Svensk Roulette', 60],
  ['portomaso-casino-roulette-by-ezugi', 'Portomaso Casino Roulette', 24],
  ['roulette-by-inout', 'Roulette', 58],
  ['roulette-by-sexy-gaming', 'Roulette', 65],
  ['skyline-roulette-by-ezugi', 'Skyline Roulette', 41],
  ['french-roulette-la-partage-by-tom-horn-gaming', 'French Roulette La Partage', 89],
  ['first-person-american-roulette-by-evolution-gaming', 'First Person American Roulette', 62],
  ['oracle-casino-roulette-360-by-ezugi', 'Oracle Casino Roulette 360', 100],
  ['halloween-auto-roulette-by-ezugi', 'Halloween Auto Roulette', 43],
  ['diwali-auto-roulette-by-ezugi', 'Diwali Auto Roulette', 43],
  ['oracle-casino-roulette-by-ezugi', 'Oracle Casino Roulette', 99],
  ['ez-dealer-roulette-japanese-by-ezugi', 'EZ Dealer Roulette Japanese', 19],
  ['auto-roulette-by-ezugi', 'Auto Roulette', 25],
  ['ultimate-roulette-by-ezugi', 'Ultimate Roulette', 87],
  ['ez-dealer-roulette-hindi-by-ezugi', 'EZ Dealer Roulette Hindi', 47],
  ['diamond-roulette-by-ezugi', 'Diamond Roulette', 49],
  ['marina-casino-roulette-by-ezugi', 'Marina Casino Roulette', 67],
  ['european-roulette-by-red-tiger', 'European Roulette', 67],
  ['namaste-roulette-by-ezugi', 'Namaste Roulette', 49],
  ['ultimate-auto-roulette-by-ezugi', 'Ultimate Auto Roulette', 21],
  ['ez-dealer-roulette-diwali-by-ezugi', 'EZ Dealer Roulette Diwali', 16],
  ['speed-auto-roulette-by-ezugi', 'Speed Auto Roulette', 78],
  ['marina-casino-roulette2-by-ezugi', 'Marina Casino Roulette2', 57],
  ['ez-dealer-roulette-mandarin-by-ezugi', 'EZ Dealer Roulette Mandarin', 41],
  ['football-auto-roulette-by-ezugi', 'Football Auto Roulette', 80],
  ['ez-roulette-english-by-ezugi', 'EZ Roulette English', 10],
  ['ez-dealer-roulette-english-by-ezugi', 'EZ Dealer Roulette English', 14],
  ['prestige-auto-roulette-by-ezugi', 'Prestige Auto Roulette', 88],
  ['cricket-auto-roulette-by-ezugi', 'Cricket Auto Roulette', 58],
  ['oracle-blaze-roulette-by-ezugi', 'Oracle Blaze Roulette', 56],
  ['fiesta-roulette-by-ezugi', 'Fiesta Roulette', 89],
  ['netent-french-roulette-by-netent', 'NetEnt French Roulette', 36],
  ['portomaso-real-casino-roulette-by-ezugi', 'Portomaso Real Casino Roulette', 73],
  ['roulette-lobby-by-ezugi', 'Roulette Lobby', 18],
  ['netent-european-roulette-by-netent', 'NetEnt European Roulette', 46],
  ['roulette-by-evolution-gaming', 'Roulette', 60],
  ['netent-american-roulette-by-netent', 'NetEnt American Roulette', 36],
  ['claw-roulette-by-ezugi', 'Claw Roulette', 41],
  ['vip-roulette-by-ezugi', 'VIP Roulette', 21],
  ['netent-roulette-advanced-by-netent', 'NetEnt Roulette Advanced', 62],
];

export const ROULETTE_GAMES = ROWS.map(([slug, name, players, badge]) => {
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
