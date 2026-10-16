import { isShownOriginal } from '../../../services/originals';

/* The BC Originals flyout's list — what the sidebar's Casino > BC Originals row opens on hover.
 *
 * TRANSCRIBED FROM THE RENDERED DOM, in its order. On the live site this is a feed, not a
 * constant: the row's panel is filled from `/game/home/recommend/selection/` with
 * `selectionName: "originals"`, the same endpoint the Help Center's fairness picker uses. That
 * one returns 37 rows AFTER the Help chunk's two filters (drop `trenball` slugs, drop names
 * with a colon); this panel applies neither and shows 61, so the two lists are not
 * interchangeable and `data/games.js` — which is the *casino catalogue* feed — is a third
 * thing again. Do not merge them.
 *
 * Three fields per row and all three come straight off the markup:
 *
 *   href   the real route, `/game/<slug>`. None of these pages is built, so every one of them
 *          falls through to the catch-all today.
 *   icon   the `game_icon_img` sprite class. It is NOT derivable from the slug — `/game/patti`
 *          takes `teen_patti`, `/game/cave` takes `cave` but is labelled "Cave Of Plunder",
 *          `/game/oriental-beauties` takes `beauties`, `/game/keno-multiplayer` reuses plain
 *          `keno`, and `/game/candy-fiesta-1000-by-croco-gaming` shares `sugar_fiesta_1000`
 *          with its sibling. Three rows share the UPI-style duplication.
 *   label  the printed name, which likewise does not track the slug.
 *
 * `dice` has no sprite rule anywhere — see the note over the sprite block in Sidebar.css. It is
 * left as written rather than pointed at `classicdice` or `ultimatedice`, because the live page
 * draws the fallback cell and inventing a better icon would be inventing.
 */
export const ORIGINALS = [
  { href: '/game/crash', icon: 'crash', label: 'Crash' },
  { href: '/game/limbo', icon: 'limbo', label: 'Limbo' },
  { href: '/game/keno', icon: 'keno', label: 'Keno' },
  { href: '/game/hilo', icon: 'hilo', label: 'Hilo' },
  { href: '/game/tower-legend', icon: 'towerlegend', label: 'Tower Legend' },
  { href: '/game/classic-dice', icon: 'classicdice', label: 'Classic Dice' },
  { href: '/game/coinflip', icon: 'coinflip', label: 'CoinFlip' },
  { href: '/game/plinko', icon: 'plinko', label: 'Plinko' },
  { href: '/game/mines', icon: 'mines', label: 'Mines' },
  { href: '/game/dice', icon: 'dice', label: 'Dice' },
  { href: '/game/twist', icon: 'twist', label: 'Twist' },
  { href: '/game/fast-crash', icon: 'fast_crash', label: 'Fast Crash' },
  { href: '/game/roulette', icon: 'roulette', label: 'Roulette' },
  { href: '/game/cave', icon: 'cave', label: 'Cave Of Plunder' },
  { href: '/game/hash-dice', icon: 'hashdice', label: 'Hash Dice' },
  { href: '/game/wukong-by-croco-gaming', icon: 'wukong', label: 'WUKONG' },
  { href: '/game/ring-of-fortune', icon: 'ringoffortune', label: 'Ring of Fortune' },
  { href: '/game/wheel', icon: 'wheel', label: 'Wheel' },
  { href: '/game/fastparity', icon: 'fastparity', label: 'Fast Parity' },
  { href: '/game/stellar-rush', icon: 'stellar_rush', label: 'Stellar Rush' },
  { href: '/game/deadliest-sea-by-croco-gaming', icon: 'deadliestsea', label: 'Deadliest Sea' },
  { href: '/game/rhino-robbery-by-croco-gaming', icon: 'rhino_robbery', label: 'Rhino Robbery' },
  { href: '/game/blackjack', icon: 'blackjack', label: 'Blackjack' },
  { href: '/game/golden-year-by-croco-gaming', icon: 'golden_year', label: 'Golden Year' },
  { href: '/game/color', icon: 'color_game', label: 'Perya Color Game' },
  { href: '/game/baccarat', icon: 'baccarat', label: 'Baccarat' },
  { href: '/game/baccarat-multiplayer', icon: 'baccaratmultiplayer', label: 'Baccarat Multiplayer' },
  { href: '/game/nezha-by-croco-gaming', icon: 'nezha', label: 'NeZha' },
  { href: '/game/bubble-shooter', icon: 'bubble_shooter', label: 'Bubble Shooter' },
  { href: '/game/wizard-s-academy-by-croco-gaming', icon: 'wizards_academy', label: "Wizard's Academy" },
  { href: '/game/ghost-boo-nanza-by-croco-gaming', icon: 'ghost_boo_nanza', label: 'Ghost Boo-nanza' },
  { href: '/game/double', icon: 'double', label: 'Double' },
  { href: '/game/candy-fiesta-1000-by-croco-gaming', icon: 'sugar_fiesta_1000', label: 'Candy Fiesta 1000' },
  { href: '/game/samurai-clash-by-croco-gaming', icon: 'samurai_clash', label: 'Samurai Clash' },
  { href: '/game/sugar-fiesta-1000-by-croco-gaming', icon: 'sugar_fiesta_1000', label: 'Sugar Fiesta 1000' },
  { href: '/game/roulette-multiplayer', icon: 'roulettemultiplayer', label: 'Roulette Multiplayer' },
  { href: '/game/sea-of-olympus-1000-by-croco-gaming', icon: 'sea_of_olympus_1000', label: 'Sea of Olympus 1000' },
  { href: '/game/sicbo-multiplayer', icon: 'sicbo', label: 'Sicbo' },
  { href: '/game/left-4-cash-by-croco-gaming', icon: 'left_4_cash', label: 'Left 4 Cash' },
  { href: '/game/jade', icon: 'jade', label: 'Jade' },
  { href: '/game/patti', icon: 'teen_patti', label: 'Patti' },
  { href: '/game/symbiote-by-croco-gaming', icon: 'symbiote', label: 'Symbiote' },
  { href: '/game/video-poker', icon: 'videopoker', label: 'Video Poker' },
  { href: '/game/cursed-doll-by-croco-gaming', icon: 'cursed_doll', label: 'Cursed Doll' },
  { href: '/game/john-wild-by-croco-gaming', icon: 'johnwild_default', label: 'John Wild' },
  { href: '/game/oriental-beauties', icon: 'beauties', label: 'Beauties' },
  { href: '/game/cursed-clown-by-croco-gaming', icon: 'cursed_clown', label: 'Cursed Clown' },
  { href: '/game/bullet-spin', icon: 'bullet', label: 'Bullet Spin' },
  { href: '/game/reel-big-catch-by-croco-gaming', icon: 'reel_big_catch', label: 'Reel Big Catch' },
  { href: '/game/clash-cash-by-croco-gaming', icon: 'clash_cash', label: 'Clash & Cash' },
  { href: '/game/run-away-zombies-by-croco-gaming', icon: 'runaway_zombies', label: 'Run Away! Zombies' },
  { href: '/game/lucky-ranch-by-croco-gaming', icon: 'lucky_ranch', label: 'Lucky Ranch' },
  { href: '/game/sword', icon: 'sword', label: 'Savior Sword' },
  { href: '/game/magical-mine-by-croco-gaming', icon: 'magic_mine', label: 'Magical Mine' },
  { href: '/game/cyberpunk-xxii-by-croco-gaming', icon: 'cyberpunk', label: 'Cyberpunk XXII' },
  { href: '/game/dragon-quest-by-croco-gaming', icon: 'dragonquest', label: 'Dragon Quest' },
  { href: '/game/piece-of-cash-by-croco-gaming', icon: 'piece_of_cash', label: 'Piece Of Cash' },
  { href: '/game/keno-multiplayer', icon: 'keno', label: 'Keno Multiplayer' },
  { href: '/game/bingo', icon: 'bc_bingo', label: 'Bingo' },
  { href: '/game/fish-prawn-crab', icon: 'fish_prawn_crab', label: 'Fish Prawn Crab' },
  { href: '/game/jack-s-crypt-by-croco-gaming', icon: 'jacks_crypt', label: "Jack's Crypt" },
];

/* Keyed so a second flyout (Sports' two Provider rows also carry the chevron) can be added
   beside this one without the component learning about either list. */
/* Only the originals this site offers (services/originals.js, SHOWN_ORIGINALS). */
export const FLYOUTS = { originals: ORIGINALS.filter((game) => isShownOriginal(game.href.replace('/game/', ''))) };

export default FLYOUTS;
