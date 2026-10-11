import { assetExact } from '../../utils/gameArt';

/* The Poker tab's games — the real feed, transcribed from the live page's rendered grid.
 *
 * This is the only tab on the casino page whose contents are the site's own rather than
 * derived from the 118-game capture. The mirror has no feed for this page at all (see
 * catalogue.js), and filtering the capture by its `Poker` tag produced six games where the
 * live tab holds thirty-eight. Slug, name, provider and player count are all read off the
 * live DOM, and the artwork is downloaded from the hashes in it — so unlike everything else
 * here, this list cannot be regenerated from the mirror.
 *
 * Player counts are a snapshot. They drift every second on the real site.
 *
 * Providers are taken from each slug's own `-by-<provider>` suffix, which is the feed's own
 * convention, and spelled to match data/providers.js so the Providers filter matches them.
 * The four with no suffix (`bc-poker`, `video-poker`, `patti`) are house games — BC.GAME.
 *
 * TWO GAMES HAVE NO ARTWORK. `joker-poker-by-amusnet` and `jacks-or-better-poker-by-amusnet`
 * point at `imgxcut.com/game/image/common.png`, which is the site's shared placeholder rather
 * than a cover of their own — there is nothing game-specific to download. They resolve to
 * undefined and GameTile draws its name-only tile, which says more than a generic image would.
 */
const POKER = [
  ['bc-poker', 'BCPoker', 'BC.GAME', 30],
  ['video-poker', 'Video Poker', 'BC.GAME', 86],
  ['poker-win-by-fa-chai', 'POKER WIN', 'FA CHAI', 26],
  ['poker-win-2-by-fa-chai', 'POKER WIN 2', 'FA CHAI', 67],
  ['casino-hold-em-1-by-ezugi', "Casino Hold'em 1", 'Ezugi', 30],
  ['caribbean-holdem-by-habanero', 'Caribbean Holdem', 'Habanero', 76],
  ['patti', 'Patti', 'BC.GAME', 50],
  ['poker-ways-by-spadegaming', 'Poker Ways', 'Spadegaming', 34],
  ['one-day-teen-patti-classic-by-ezugi', 'One Day Teen Patti Classic', 'Ezugi', 55],
  ['ultimate-texas-holdem-by-tada', 'Ultimate Texas Holdem', 'TaDa', 36],
  ['bet-on-teen-patti-by-ezugi', 'Bet on Teen Patti', 'Ezugi', 56],
  ['banker-three-card-poker-by-wali-games', 'Banker Three Card Poker', 'WALI GAMES', 49],
  ['joker-poker-by-inout', 'Joker Poker', 'InOut', 37],
  ['three-card-poker-by-habanero', 'Three Card Poker', 'Habanero', 82],
  ['triple-edge-poker-by-betsoft', 'Triple Edge Poker', 'BetSoft', 58],
  ['caribbean-stud-by-habanero', 'Caribbean Stud', 'Habanero', 66],
  ['oasis-poker-by-betsoft', 'Oasis Poker', 'BetSoft', 94],
  ['teen-patti-by-ezugi', 'Teen Patti', 'Ezugi', 45],
  ['caribbean-poker-by-betsoft', 'Caribbean Poker', 'BetSoft', 10],
  ['three-card-poker-deluxe-by-habanero', 'Three Card Poker Deluxe', 'Habanero', 82],
  ['video-poker-by-tada', 'Video Poker', 'TaDa', 27],
  ['three-card-rummy-by-betsoft', 'Three Card Rummy', 'BetSoft', 85],
  ['three-card-poker-by-wali-games', 'Three Card Poker', 'WALI GAMES', 51],
  ['deuces-wild-10-hand-by-habanero', 'Deuces Wild 10 Hand', 'Habanero', 98],
  ['casino-poker-by-wali-games', 'Casino Poker', 'WALI GAMES', 78],
  ['teen-patti-by-real-time-gaming', 'Teen Patti', 'Realtime Gaming', 98],
  ['pick-em-poker-by-real-time-gaming', 'Pick ‘Em Poker', 'Realtime Gaming', 87],
  ['joker-poker-by-amusnet', 'Joker Poker', 'Amusnet', 72],
  ['hundred-player-texas-holdem-by-wali-games', 'Hundred Player Texas Holdem', 'WALI GAMES', 42],
  ['poker-king-by-tada', 'Poker King', 'TaDa', 47],
  ['jacks-or-better-poker-by-amusnet', 'Jacks or Better Poker', 'Amusnet', 72],
  [
    'hundred-player-three-card-poker-by-wali-games',
    'Hundred Player Three Card Poker',
    'WALI GAMES',
    23,
  ],
  ['one-day-teen-patti-by-ezugi', 'One Day Teen Patti', 'Ezugi', 66],
  ['poker-by-evolution-gaming', 'Poker', 'Evolution Gaming', 31],
  ['teen-patti-3-card-by-ezugi', 'Teen Patti 3 Card', 'Ezugi', 40],
  ['poker-by-tvbet', 'Poker', 'TVBET', 62],
  ['poker-lobby-by-ezugi', 'Poker Lobby', 'Ezugi', 86],
  ['netent-casino-hold-em-by-netent', "NetEnt Casino Hold'em", 'NetEnt', 35],
];

/* Catalogue shape (`name`/`players`/`provider`), so the Providers filter and the sort work on
   these exactly as they do on every other tab's games. */
export const POKER_GAMES = POKER.map(([slug, name, provider, players]) => ({
  slug,
  name,
  provider,
  players,
  category: 'Poker',
  sections: [],
  tags: ['Poker'],
}));

/* Row shape (`fullName`/`onlineUsers`/`icon`), for the two variant panels above the grid.
   `assetExact` rather than `assetFor`: a missing cover must read as missing here, not borrow
   an unrelated game's. */
/* The two panels are curated separately from the Browse All grid, so a panel card need not
   have a feed row. `teen-patti` is the one that doesn't: its cover was supplied by hand
   (src/assets/games/teen-patti.png) rather than downloaded from the live grid, and there is no
   matching entry in POKER above — Ezugi's own Teen Patti is `teen-patti-by-ezugi`, a different
   card with different art. Name and player count therefore live here. */
const PANEL_ONLY = {
  'teen-patti': { name: 'Teen Patti', players: 50 },
};

const row = (slug) => {
  const game = POKER_GAMES.find((g) => g.slug === slug) || PANEL_ONLY[slug];
  /* A panel slug in neither table is a typo, and without this the failure is a
     `reading 'slug' of undefined` at module scope that takes the whole page down. */
  if (!game) throw new Error(`pokerGames: no game with slug "${slug}"`);
  return {
    slug,
    fullName: game.name,
    onlineUsers: game.players,
    icon: assetExact(slug),
  };
};

/* What each panel holds, in the live page's order. */
export const HOLDEM_ROW = [
  'casino-hold-em-1-by-ezugi',
  'caribbean-holdem-by-habanero',
  'ultimate-texas-holdem-by-tada',
].map(row);

export const TEEN_PATTI_ROW = [
  'teen-patti',
  'one-day-teen-patti-classic-by-ezugi',
  'bet-on-teen-patti-by-ezugi',
  'teen-patti-by-ezugi',
  'teen-patti-by-real-time-gaming',
  'teen-patti-3-card-by-ezugi',
].map(row);
