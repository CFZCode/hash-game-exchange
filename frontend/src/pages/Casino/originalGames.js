/* The BC Originals tab's games — the real list, transcribed from the live page's rendered grid.
 *
 * Same standing as pokerGames.js and for the same reason: the casino page's chunk and feed are
 * both missing from the mirror (see catalogue.js), so this cannot be regenerated. Slug, name,
 * player count and the artwork hash are read off the live DOM; the covers were downloaded from
 * those hashes into src/assets/games. All sixty-three resolved, so every tile has real art.
 *
 * It replaces a derived stand-in. `SETS.brand` used to be `byCategory('Original')` over the
 * 118-game capture, which found sixteen — the capture's share of a sixty-three-game tab.
 *
 * Player counts are a snapshot; they drift every second on the real site.
 *
 * PROVIDER is not in this markup — the grid prints no studio. It is taken from each slug's own
 * `-by-croco-gaming` suffix, which is the feed's convention, and everything without a suffix is
 * a house game, BC.GAME. Both spellings match data/providers.js so the Providers filter works.
 *
 * BADGES: three tiles carry a corner label in the live DOM — `Exclusive` on Sea of Olympus
 * 1000, Candy Fiesta 1000 and Sugar Fiesta 1000, `New` on Knockoin. Every one of them is
 * rendered `hidden` (the class is `explore-show`, revealed only inside the Explore panel), so
 * they are recorded here and drawn nowhere, exactly as the live page does it.
 *
 * ORDER IS THE LIVE PAGE'S and is load-bearing: it decides which forty land on page 1.
 */
const CROCO = 'Croco Gaming';
const HOUSE = 'BC.GAME';

/* [slug, name, players, badge?] — provider is derived below. */
const ORIGINALS = [
  ['crash', 'Crash', 2422],
  ['limbo', 'Limbo', 300],
  ['keno', 'Keno', 124],
  ['hilo', 'Hilo', 132],
  ['tower-legend', 'Tower Legend', 100],
  ['classic-dice', 'Classic Dice', 208],
  ['coinflip', 'CoinFlip', 52],
  ['plinko', 'Plinko', 84],
  ['mines', 'Mines', 150],
  ['dice', 'Dice', 42],
  ['pinball-striker-20000x-by-croco-gaming', 'Pinball Striker 20000x', 19],
  ['deadliest-sea-by-croco-gaming', 'Deadliest Sea', 128],
  ['twist', 'Twist', 70],
  ['bc-poker', 'BCPoker', 24],
  ['nezha-by-croco-gaming', 'NeZha', 48],
  ['sea-of-olympus-1000-by-croco-gaming', 'Sea of Olympus 1000', 76, 'Exclusive'],
  ['torture-block-by-croco-gaming', 'TORTURE BLOCK', 58],
  ['sword', 'Savior Sword', 22],
  ['knockoin-by-croco-gaming', 'Knockoin', 110, 'New'],
  ['video-poker', 'Video Poker', 80],
  ['john-wild-by-croco-gaming', 'John Wild', 40],
  ['stellar-rush', 'Stellar Rush', 75],
  ['jade', 'Jade', 93],
  ['roulette-multiplayer', 'Roulette Multiplayer', 66],
  ['bingo', 'Bingo', 17],
  ['wheel', 'Wheel', 20],
  ['roulette', 'Roulette', 20],
  ['cave', 'Cave Of Plunder', 42],
  ['fast-crash', 'Fast Crash', 42],
  ['hash-dice', 'Hash Dice', 34],
  ['ring-of-fortune', 'Ring of Fortune', 26],
  ['blackjack', 'Blackjack', 38],
  ['baccarat', 'Baccarat', 12],
  ['ander-meegan-by-croco-gaming', 'Ander & Meegan', 100],
  ['goal-rush-by-croco-gaming', 'Goal Rush', 92],
  ['wukong-by-croco-gaming', 'WUKONG', 54],
  ['oriental-beauties', 'Beauties', 39],
  ['symbiote-by-croco-gaming', 'Symbiote', 94],
  ['ganesha-golden-wheel-by-croco-gaming', 'Ganesha Golden Wheel', 90],
  ['bubble-shooter', 'Bubble Shooter', 95],
  /* --- page 2 on the live site --- */
  ['fastparity', 'Fast Parity', 34],
  ['color', 'Perya Color Game', 25],
  ['sicbo-multiplayer', 'Sicbo', 64],
  ['double', 'Double', 23],
  ['ghost-boo-nanza-by-croco-gaming', 'Ghost Boo-nanza', 15],
  ['samurai-clash-by-croco-gaming', 'Samurai Clash', 100],
  ['candy-fiesta-1000-by-croco-gaming', 'Candy Fiesta 1000', 90, 'Exclusive'],
  ['wizard-s-academy-by-croco-gaming', "Wizard's Academy", 51],
  ['dragon-quest-by-croco-gaming', 'Dragon Quest', 10],
  ['bullet-spin', 'Bullet Spin', 94],
  ['cursed-doll-by-croco-gaming', 'Cursed Doll', 41],
  ['sugar-fiesta-1000-by-croco-gaming', 'Sugar Fiesta 1000', 10, 'Exclusive'],
  ['left-4-cash-by-croco-gaming', 'Left 4 Cash', 64],
  ['cyberpunk-xxii-by-croco-gaming', 'Cyberpunk XXII', 16],
  ['patti', 'Patti', 55],
  ['magical-mine-by-croco-gaming', 'Magical Mine', 23],
  ['piece-of-cash-by-croco-gaming', 'Piece Of Cash', 45],
  ['clash-cash-by-croco-gaming', 'Clash & Cash', 47],
  ['run-away-zombies-by-croco-gaming', 'Run Away! Zombies', 39],
  ['lucky-ranch-by-croco-gaming', 'Lucky Ranch', 34],
  ['jack-s-crypt-by-croco-gaming', "Jack's Crypt", 17],
  ['fish-prawn-crab', 'Fish Prawn Crab', 75],
  ['crash-trenball', 'Crash Trenball', 51],
];

/* Catalogue shape, so the Providers filter and the sort work on these exactly as on every
   other tab. `category` is 'Originals' because that is what byCategory('Original') matched in
   the capture, and the lobby row still reads through gamesFor('brand'). */
export const ORIGINAL_GAMES = ORIGINALS.map(([slug, name, players, badge]) => ({
  slug,
  name,
  players,
  badge,
  provider: slug.endsWith('-by-croco-gaming') ? CROCO : HOUSE,
  category: 'Originals',
  sections: [],
  tags: ['BC Originals'],
}));

/* Forty per page, which is what the live tab pages at: its own control reads "01 of 02" over
   sixty-three games, and page 1 holds forty of them (data-tid 111-150) against page 2's
   twenty-three. Not a round guess — it is counted off the two captured pages. */
export const ORIGINALS_PAGE_SIZE = 40;
