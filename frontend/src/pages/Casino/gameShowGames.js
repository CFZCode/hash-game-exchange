/* The Game Shows tab's games — transcribed from the live page's rendered grid.
 *
 * One of the five sets added together, alongside hotGames.js, slotGames.js, originalGames.js
 * and pokerGames.js, and for the same reason: the casino page's chunk and feed are both
 * missing from the mirror (see catalogue.js). It replaces a derived stand-in over the
 * 118-game capture.
 *
 * Thirty-six games, no pager — complete, like Live Casino.
 *
 * Thirty-four of the thirty-six are Evolution Gaming's; the other two are Ezugi's. This tab
 * is effectively one studio's catalogue, which is why every row here also appears under
 * Live Casino, Roulette or Blackjack on the live site. The overlap is the site's, not a
 * transcription slip.
 *
 * What checks the transcription: every slug that also appears in one of the other four sets
 * carries the same artwork hash there, and all 36 hashes resolved with no 404s.
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

const CATEGORY = 'Game Shows';
const SECTION = 'game_shows';
const TAG = 'Game shows';

/* [slug, name, players, badge?] */
const ROWS = [
  ['bc-game-xxxtreme-lightning-roulette-by-evolution-gaming', 'BC.GAME XXXtreme Lightning Roulette', 19, 'Exclusive'],
  ['bc-game-ice-fishing-by-evolution-gaming', 'BC.GAME ICE Fishing', 30, 'Exclusive'],
  ['monopoly-roll-em-by-evolution-gaming', "MONOPOLY Roll 'em", 69],
  ['crazy-time-by-evolution-gaming', 'Crazy Time', 36],
  ['funky-time-by-evolution-gaming', 'Funky Time', 20],
  ['crazy-balls-by-evolution-gaming', 'Crazy Balls', 62],
  ['lightning-storm-by-evolution-gaming', 'Lightning Storm', 28],
  ['lightning-roulette-by-evolution-gaming', 'Lightning Roulette', 33],
  ['xxxtreme-lightning-roulette-by-evolution-gaming', 'XXXtreme Lightning Roulette', 54],
  ['lightning-baccarat-by-evolution-gaming', 'Lightning Baccarat', 100],
  ['red-door-roulette-by-evolution-gaming', 'Red Door Roulette', 85],
  ['monopoly-live-by-evolution-gaming', 'MONOPOLY Live', 51],
  ['monopoly-big-baller-by-evolution-gaming', 'Monopoly Big Baller', 92],
  ['dead-or-alive-saloon-by-evolution-gaming', 'Dead or Alive:Saloon', 55],
  ['monopoly-roulette-by-evolution-gaming', 'Monopoly Roulette', 94],
  ['crazy-coin-flip-by-evolution-gaming', 'Crazy Coin Flip', 28],
  ['lightning-dice-by-evolution-gaming', 'Lightning Dice', 33],
  ['mega-ball-by-evolution-gaming', 'Mega Ball', 33],
  ['super-color-game-by-evolution-gaming', 'Super Color Game', 10],
  ['fireball-roulette-by-evolution-gaming', 'FireBall Roulette', 28],
  ['football-studio-by-evolution-gaming', 'Football Studio', 40],
  ['gold-vault-roulette-by-evolution-gaming', 'Gold Vault Roulette', 29],
  ['war-by-evolution-gaming', 'War', 78],
  ['red-door-roulette-in-spanish-by-evolution-gaming', 'Red Door Roulette in Spanish', 76],
  ['f-tbol-studio-by-evolution-gaming', 'Fútbol Studio', 64],
  ['t-rk-e-crazy-time-by-evolution-gaming', 'Türkçe Crazy Time', 10],
  ['red-baron-by-evolution-gaming', 'Red Baron', 86],
  ['extra-chilli-epic-spins-by-evolution-gaming', 'Extra Chilli Epic Spins™', 87],
  ['mega-bola-by-evolution-gaming', 'Mega Bola', 91],
  ['lightning-blackjack-by-evolution-gaming', 'Lightning Blackjack', 78],
  ['football-studio-dice-by-evolution-gaming', 'Football Studio Dice', 19],
  ['balloon-race-by-evolution-gaming', 'Balloon Race', 50],
  ['imperial-quest-by-evolution-gaming', 'Imperial Quest', 81],
  ['ultimate-roulette-by-ezugi', 'Ultimate Roulette', 82],
  ['evo-powerball-by-evolution-gaming', 'EVO POWERBALL', 45],
  ['ez-bingo-90-by-ezugi', 'EZ Bingo 90', 45],
];

export const GAME_SHOW_GAMES = ROWS.map(([slug, name, players, badge]) => {
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
