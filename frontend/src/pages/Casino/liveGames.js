/* The Live Casino tab's games — transcribed from the live page's rendered grid.
 *
 * One of the five sets added together, alongside hotGames.js, slotGames.js, originalGames.js
 * and pokerGames.js, and for the same reason: the casino page's chunk and feed are both
 * missing from the mirror (see catalogue.js). It replaces a derived stand-in over the
 * 118-game capture.
 *
 * Twenty-four games and no pager at all — the live page renders an empty
 * `.f-ull.center` where the other tabs put one, so this tab is complete, not truncated.
 * It is the only one of the five that fits on a single page.
 *
 * These are lobbies and tables rather than titles: six of them ('Ezugi Lobby', 'Baccarat
 * Lobby', 'Sexy Gaming Lobby', 'Winfinity Lobby', 'TVBET LOBBY', 'Roulette Lobby') are
 * doorways into a provider's own client, which is why the list is so much shorter than
 * Blackjack's or Roulette's.
 *
 * What checks the transcription: every slug that also appears in one of the other four sets
 * carries the same artwork hash there, and all 24 hashes resolved with no 404s.
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

const CATEGORY = 'Live';
const SECTION = 'live_casino';
const TAG = 'Live Casino';

/* [slug, name, players, badge?] */
const ROWS = [
  ['baccarat-by-evolution-gaming', 'Baccarat', 10],
  ['roulette-by-evolution-gaming', 'Roulette', 54],
  ['blackjack-by-evolution-gaming', 'Blackjack', 59],
  ['evolution-game-shows-by-evolution-gaming', 'Evolution Game Shows', 26],
  ['poker-by-evolution-gaming', 'Poker', 38],
  ['ezugi-lobby-by-ezugi', 'Ezugi Lobby', 73],
  ['dragon-tiger-by-evolution-gaming-17929', 'DRAGON TIGER', 20],
  ['bc-game-baccarat-by-winfinity', 'BC.GAME Baccarat', 60, 'Exclusive'],
  ['tvbet-lobby-by-tvbet', 'TVBET LOBBY', 10],
  ['dragon-phoenix-by-wali-games', 'Dragon Phoenix', 48],
  ['roulette-table-by-wali-games', 'Roulette Table', 100],
  ['dragon-tiger-by-wali-games', 'Dragon Tiger', 38],
  ['live-baccarat-by-wali-games', 'Live Baccarat', 28],
  ['cockfighting-by-sv388', 'COCKFIGHTING', 79],
  ['sic-bo-by-wali-games', 'Sic Bo', 79],
  ['niu-niu-by-wali-games', 'Niu Niu', 12],
  ['red-white-by-wali-games', 'Red White', 93],
  ['sexy-gaming-lobby-by-sexy-gaming', 'Sexy Gaming Lobby', 34],
  ['baccarat-lobby-by-ezugi', 'Baccarat Lobby', 79],
  ['roulette-lobby-by-ezugi', 'Roulette Lobby', 12],
  ['winfinity-lobby-by-winfinity', 'Winfinity Lobby', 12],
  ['fan-tan-by-evolution-gaming-17928', 'FAN TAN', 29],
  ['sicbo-by-evolution-gaming', 'SICBO', 28],
  ['hindi-by-evolution-gaming', 'HINDI', 19],
];

export const LIVE_GAMES = ROWS.map(([slug, name, players, badge]) => {
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
