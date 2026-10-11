/* The Table Games tab's games — transcribed from the live page's rendered grid.
 *
 * One of the five sets added together, alongside hotGames.js, slotGames.js, originalGames.js
 * and pokerGames.js, and for the same reason: the casino page's chunk and feed are both
 * missing from the mirror (see catalogue.js). It replaces a derived stand-in over the
 * 118-game capture.
 *
 * Thirty-seven games, no pager — complete.
 *
 * Six rows carry no '-by-' suffix (Baccarat, Baccarat Multiplayer, BCPoker, Blackjack,
 * Video Poker, Roulette Multiplayer). Those are BC.GAME's own tables, and the mapper's
 * fallback names them accordingly rather than inventing a studio.
 *
 * What checks the transcription: every slug that also appears in one of the other four sets
 * carries the same artwork hash there, and all 37 hashes resolved with no 404s.
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

const CATEGORY = 'Table';
const SECTION = 'table_games';
const TAG = 'Table Game';

/* [slug, name, players, badge?] */
const ROWS = [
  ['baccarat', 'Baccarat', 27],
  ['baccarat-multiplayer', 'Baccarat Multiplayer', 91],
  ['bc-poker', 'BCPoker', 39],
  ['blackjack', 'Blackjack', 44],
  ['poker-win-by-fa-chai', 'POKER WIN', 26],
  ['poker-win-2-by-fa-chai', 'POKER WIN 2', 58],
  ['video-poker', 'Video Poker', 74],
  ['roulette-multiplayer', 'Roulette Multiplayer', 51],
  ['first-person-lightning-roulette-by-evolution-gaming', 'First Person Lightning Roulette', 58],
  ['first-person-xxxtreme-lightning-roulette-by-evolution-gaming', 'First Person XXXtreme Lightning Roulette', 85],
  ['caribbean-holdem-by-habanero', 'Caribbean Holdem', 85],
  ['poker-ways-by-spadegaming', 'Poker Ways', 22, 'Bonus Buy'],
  ['first-person-golden-wealth-baccarat-by-evolution-gaming', 'First Person Golden Wealth Baccarat', 81],
  ['first-person-baccarat-by-evolution-gaming', 'First Person Baccarat', 63],
  ['triple-edge-poker-by-betsoft', 'Triple Edge Poker', 70],
  ['first-person-lightning-baccarat-by-evolution-gaming', 'First Person Lightning Baccarat', 74],
  ['three-card-poker-by-habanero', 'Three Card Poker', 94],
  ['first-person-american-roulette-by-evolution-gaming', 'First Person American Roulette', 59],
  ['caribbean-stud-by-habanero', 'Caribbean Stud', 75],
  ['deuces-wild-100-hand-by-habanero', 'Deuces Wild 100 Hand', 96],
  ['oasis-poker-by-betsoft', 'Oasis Poker', 82],
  ['deuces-wild-50-hand-by-habanero', 'Deuces Wild 50 Hand', 70],
  ['caribbean-poker-by-betsoft', 'Caribbean Poker', 19],
  ['deuces-wild-1-hand-by-habanero', 'Deuces Wild 1 Hand', 91],
  ['dragon-tiger-by-habanero', 'Dragon Tiger', 94],
  ['first-person-top-card-by-evolution-gaming', 'First Person Top Card', 33],
  ['deuces-wild-10-hand-by-habanero', 'Deuces Wild 10 Hand', 86],
  ['three-card-rummy-by-betsoft', 'Three Card Rummy', 94],
  ['teen-patti-by-real-time-gaming', 'Teen Patti', 86],
  ['andar-bahar-by-real-time-gaming', 'Andar Bahar', 86],
  ['baccarat-deluxe-by-pg-soft', 'Baccarat Deluxe', 93],
  ['deuces-wild-5-hand-by-habanero', 'Deuces Wild 5 Hand', 70],
  ['pick-em-poker-by-real-time-gaming', 'Pick ‘Em Poker', 78],
  ['punto-banco-slot-by-red-tiger', 'Punto Banco slot', 16],
  ['sic-bo-by-habanero', 'Sic Bo', 36],
  ['netent-french-roulette-by-netent', 'NetEnt French Roulette', 19],
  ['netent-casino-hold-em-by-netent', "NetEnt Casino Hold'em", 26],
];

export const TABLE_GAMES = ROWS.map(([slug, name, players, badge]) => {
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
