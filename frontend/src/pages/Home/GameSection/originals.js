/* The BC Originals row — and it is THE WHOLE SELECTION, not the page of ten the live site
 * renders. That is this build's one deliberate departure on this row and it was asked for; the
 * rest of the file is the feed.
 *
 * ALL 73 ROWS ARE A LIVE ANSWER, not the capture this file used to hold.
 * `POST /api/edge/game/home/recommend/selection/` with `{selectionName: "originals", page: 1,
 * pageSize: 100}` answers unauthenticated on hash.game — a recommendation feed is a catalogue,
 * which is the side of the split `game/support` has demonstrated repeatedly — and reports
 * `total: 73` in one page. The mirror's own capture is the BATCH call
 * (`.../batch/selections/`), which returns page 1 of each selection and is where the ten games
 * that used to be here came from; the batch's `total` for this selection was 60 then and the
 * selection has grown since.
 *
 * WHAT CHANGES ON SCREEN, beyond the length: the row now opens on CRASH. The old note here
 * recorded that Crash heads the selection in the API response but was not in the live page's
 * row, and dropped it for that reason — a correct call for a ten-tile slice of a personalised
 * feed, and the wrong one for a row that is meant to be every original. Fast Crash likewise
 * sits where the feed puts it rather than being lifted to tenth. Order is the response's own
 * throughout.
 *
 * `onlineUsers` is live data and drifts every second; these are the values in that answer, as
 * `data/richList.js` records for the same reason.
 *
 * The View All tile is unaffected — `go` appends it to any linked section with more than eight
 * games, so it still closes the row, and `/gamelist/brand` behind it holds the casino tab's own
 * 63-game set (`pages/Casino/originalGames.js`). THE TWO LISTS DO NOT MATCH and neither is
 * wrong: that one is transcribed off the live BC Originals TAB, this is the `originals`
 * recommendation selection, and the live site does not promise they agree.
 *
 * Sixty-nine of the seventy-three covers were already in `src/assets/games`; the four that were
 * not (Chop Chop, Star Wins, Bear Smash: 15000X Boost, Bear Blast) were pulled from the
 * `iconThreeFour` URLs in this same response. Note they were fetched through the live DOM's own
 * query — `?_v=4,dpr=1.25,width=200`, which returns the 250x333 variant at ~44KB — rather than
 * bare, which serves the 960x1280 master at ten times the size. The note that used to sit here
 * saying the CDN ignores its width parameter is true of the path it was written about and not
 * of this one.
 */

/* iconThreeFour, the 3:4 portrait art, keyed by the game's own url slug so a missing file is
   obvious rather than silently blank. The glob itself lives in utils/gameArt.js because
   `import.meta.glob` resolves relative to the file it is written in, so it can only live in one
   module — the Explore panel was the second consumer. */
import { assetFor } from '../../../utils/gameArt';

const iconFor = assetFor;

const games = [
  { slug: 'crash', fullName: 'Crash', onlineUsers: 2079 },
  { slug: 'limbo', fullName: 'Limbo', onlineUsers: 250 },
  { slug: 'keno', fullName: 'Keno', onlineUsers: 122 },
  { slug: 'hilo', fullName: 'Hilo', onlineUsers: 94 },
  { slug: 'tower-legend', fullName: 'Tower Legend', onlineUsers: 88 },
  { slug: 'classic-dice', fullName: 'Classic Dice', onlineUsers: 150 },
  { slug: 'coinflip', fullName: 'CoinFlip', onlineUsers: 62 },
  { slug: 'plinko', fullName: 'Plinko', onlineUsers: 84 },
  { slug: 'mines', fullName: 'Mines', onlineUsers: 146 },
  { slug: 'dice', fullName: 'Dice', onlineUsers: 85 },
  { slug: 'twist', fullName: 'Twist', onlineUsers: 76 },
  { slug: 'wheel', fullName: 'Wheel', onlineUsers: 22 },
  { slug: 'cave', fullName: 'Cave Of Plunder', onlineUsers: 20 },
  { slug: 'roulette', fullName: 'Roulette', onlineUsers: 69 },
  { slug: 'hash-dice', fullName: 'Hash Dice', onlineUsers: 30 },
  { slug: 'fast-crash', fullName: 'Fast Crash', onlineUsers: 40 },
  { slug: 'ring-of-fortune', fullName: 'Ring of Fortune', onlineUsers: 26 },
  { slug: 'knockoin-by-croco-gaming', fullName: 'Knockoin', onlineUsers: 36 },
  { slug: 'bc-poker', fullName: 'BCPoker', onlineUsers: 20 },
  { slug: 'chop-chop-by-croco-gaming', fullName: 'Chop Chop', onlineUsers: 60 },
  { slug: 'video-poker', fullName: 'Video Poker', onlineUsers: 71 },
  { slug: 'blackjack', fullName: 'Blackjack', onlineUsers: 47 },
  { slug: 'symbiote-by-croco-gaming', fullName: 'Symbiote', onlineUsers: 62 },
  { slug: 'deadliest-sea-by-croco-gaming', fullName: 'Deadliest Sea', onlineUsers: 88 },
  { slug: 'wukong-by-croco-gaming', fullName: 'WUKONG', onlineUsers: 45 },
  { slug: 'golden-year-by-croco-gaming', fullName: 'Golden Year', onlineUsers: 96 },
  { slug: 'stellar-rush', fullName: 'Stellar Rush', onlineUsers: 22 },
  { slug: 'oriental-beauties', fullName: 'Beauties', onlineUsers: 27 },
  { slug: 'sea-of-olympus-1000-by-croco-gaming', fullName: 'Sea of Olympus 1000', onlineUsers: 67 },
  { slug: 'bingo', fullName: 'Bingo', onlineUsers: 10 },
  { slug: 'ganesha-golden-wheel-by-croco-gaming', fullName: 'Ganesha Golden Wheel', onlineUsers: 99 },
  { slug: 'bubble-shooter', fullName: 'Bubble Shooter', onlineUsers: 83 },
  { slug: 'ander-meegan-by-croco-gaming', fullName: 'Ander & Meegan', onlineUsers: 94 },
  { slug: 'jade', fullName: 'Jade', onlineUsers: 84 },
  { slug: 'nezha-by-croco-gaming', fullName: 'NeZha', onlineUsers: 57 },
  { slug: 'rhino-robbery-by-croco-gaming', fullName: 'Rhino Robbery', onlineUsers: 42 },
  { slug: 'baccarat', fullName: 'Baccarat', onlineUsers: 24 },
  { slug: 'goal-rush-by-croco-gaming', fullName: 'Goal Rush', onlineUsers: 83 },
  { slug: 'pinball-striker-20000x-by-croco-gaming', fullName: 'Pinball Striker 20000x', onlineUsers: 31 },
  { slug: 'candy-fiesta-1000-by-croco-gaming', fullName: 'Candy Fiesta 1000', onlineUsers: 100 },
  { slug: 'roulette-multiplayer', fullName: 'Roulette Multiplayer', onlineUsers: 54 },
  { slug: 'sword', fullName: 'Savior Sword', onlineUsers: 13 },
  { slug: 'baccarat-multiplayer', fullName: 'Baccarat Multiplayer', onlineUsers: 94 },
  { slug: 'star-wins-by-croco-gaming', fullName: 'Star Wins', onlineUsers: 17 },
  { slug: 'reel-big-catch-by-croco-gaming', fullName: 'Reel Big Catch', onlineUsers: 53 },
  { slug: 'fastparity', fullName: 'Fast Parity', onlineUsers: 24 },
  { slug: 'cursed-clown-by-croco-gaming', fullName: 'Cursed Clown', onlineUsers: 47 },
  { slug: 'sugar-fiesta-1000-by-croco-gaming', fullName: 'Sugar Fiesta 1000', onlineUsers: 19 },
  { slug: 'color', fullName: 'Perya Color Game', onlineUsers: 15 },
  { slug: 'torture-block-by-croco-gaming', fullName: 'TORTURE BLOCK', onlineUsers: 46 },
  { slug: 'double', fullName: 'Double', onlineUsers: 13 },
  { slug: 'john-wild-by-croco-gaming', fullName: 'John Wild', onlineUsers: 49 },
  { slug: 'keno-multiplayer', fullName: 'Keno Multiplayer', onlineUsers: 46 },
  { slug: 'ghost-boo-nanza-by-croco-gaming', fullName: 'Ghost Boo-nanza', onlineUsers: 10 },
  { slug: 'samurai-clash-by-croco-gaming', fullName: 'Samurai Clash', onlineUsers: 89 },
  { slug: 'sicbo-multiplayer', fullName: 'Sicbo', onlineUsers: 74 },
  { slug: 'dragon-quest-by-croco-gaming', fullName: 'Dragon Quest', onlineUsers: 20 },
  { slug: 'wizard-s-academy-by-croco-gaming', fullName: 'Wizard\'s Academy', onlineUsers: 61 },
  { slug: 'clash-cash-by-croco-gaming', fullName: 'Clash & Cash', onlineUsers: 58 },
  { slug: 'patti', fullName: 'Patti', onlineUsers: 65 },
  { slug: 'cursed-doll-by-croco-gaming', fullName: 'Cursed Doll', onlineUsers: 51 },
  { slug: 'left-4-cash-by-croco-gaming', fullName: 'Left 4 Cash', onlineUsers: 74 },
  { slug: 'bullet-spin', fullName: 'Bullet Spin', onlineUsers: 100 },
  { slug: 'magical-mine-by-croco-gaming', fullName: 'Magical Mine', onlineUsers: 33 },
  { slug: 'cyberpunk-xxii-by-croco-gaming', fullName: 'Cyberpunk XXII', onlineUsers: 26 },
  { slug: 'run-away-zombies-by-croco-gaming', fullName: 'Run Away! Zombies', onlineUsers: 49 },
  { slug: 'lucky-ranch-by-croco-gaming', fullName: 'Lucky Ranch', onlineUsers: 24 },
  { slug: 'jack-s-crypt-by-croco-gaming', fullName: 'Jack\'s Crypt', onlineUsers: 10 },
  { slug: 'piece-of-cash-by-croco-gaming', fullName: 'Piece Of Cash', onlineUsers: 55 },
  { slug: 'bear-smash-15000x-boost-by-croco-gaming', fullName: 'Bear Smash: 15000X Boost', onlineUsers: 64 },
  { slug: 'fish-prawn-crab', fullName: 'Fish Prawn Crab', onlineUsers: 64 },
  { slug: 'bear-blast-by-croco-gaming', fullName: 'Bear Blast', onlineUsers: 73 },
  { slug: 'crash-trenball', fullName: 'Crash Trenball', onlineUsers: 62 },
];

/* Attaches the artwork to a plain list of games. Exported because every other row in
   sections.js needs the same step and the glob has to stay in one module. */
export const withIcons = (list) => list.map((g) => ({ ...g, icon: iconFor(g.slug) }));

export const originals = withIcons(games);

export const originalsLink = '/gamelist/brand';

export default originals;
