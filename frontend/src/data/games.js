/* The casino catalogue the Explore search runs against.
 *
 * Extracted from the two captured game feeds in the mirror:
 *   bc.game/bc.game/api/edge/game/home/recommend/batch/selections/index.html  (10 selections)
 *   bc.game/bc.game/api/edge/game/home/recommend/selection/index.html         (originals, 60)
 * deduplicated by gameUrl, in first-seen order. 118 games, and ALL 118 now have their 3:4
 * cover in src/assets/games under the slug. The feed carries the URL — `iconThreeFour`, e.g.
 * `https://imgxcut.com/game/image/0c1756a8f9.png` for crash, which is the exact file the live
 * DOM requests as `…png?_v=4,dpr=1.25,width=200`. The last thirteen (the Tada/Wali fishing
 * titles, three Croco slots and keno-multiplayer) were pulled from those URLs at `dpr=2`; the
 * field itself is not kept here because the local filename is the slug and needs no lookup.
 *
 * The live site has no such file - its Explore panel POSTs /game/home/recommend/search/ and
 * pages through ~1000 slots alone. This is the whole catalogue the mirror captured, and the
 * field names track the feed's own (providerName -> provider, categoryName -> category) so a
 * real response could be swapped in without touching the consumers.
 *
 * `sections` is which captured selection a game arrived in. It stands in for the feed's
 * `retrieveId`, which the search response populates ("hot", "new_game") but which every
 * selection response leaves empty - so the Hot tab filters on membership instead.
 *
 * `players` is onlineUsers at capture time; it drifts every second on the real site.
 *
 * GENERATED from the mirror. Do not hand-edit - regenerate if the capture is refreshed.
 */
export const GAMES = [
  { slug: "crash", name: "Crash", provider: "BC Originals", category: "Original Casino", players: 2886, sections: ["originals"], tags: ["Burst Games", "Crash games", "BC Originals"] },
  { slug: "limbo", name: "Limbo", provider: "BC Originals", category: "Original Casino", players: 290, sections: ["originals"], tags: ["Crash games", "BC Originals", "Provably fair"] },
  { slug: "keno", name: "Keno", provider: "BC Originals", category: "Original Casino", players: 120, sections: ["originals"], tags: [] },
  { slug: "hilo", name: "Hilo", provider: "BC Originals", category: "Original Casino", players: 138, sections: ["originals"], tags: ["BC Originals", "Provably fair"] },
  { slug: "tower-legend", name: "Tower Legend", provider: "BC Originals", category: "Original Casino", players: 120, sections: ["originals"], tags: [] },
  { slug: "classic-dice", name: "Classic Dice", provider: "BC Originals", category: "Original Casino", players: 168, sections: ["originals"], tags: ["Dice", "BC Originals", "Provably fair"] },
  { slug: "coinflip", name: "CoinFlip", provider: "BC Originals", category: "Original Casino", players: 60, sections: ["originals"], tags: ["BC Originals", "Provably fair"] },
  { slug: "plinko", name: "Plinko", provider: "BC Originals", category: "Original Casino", players: 110, sections: ["originals"], tags: ["BC Originals", "Provably fair"] },
  { slug: "mines", name: "Mines", provider: "BC Originals", category: "Original Casino", players: 104, sections: ["originals"], tags: ["BC Originals", "Mining", "Provably fair"] },
  { slug: "dice", name: "Dice", provider: "BC Originals", category: "Original Casino", players: 34, sections: ["originals"], tags: ["Dice", "BC Originals"] },
  { slug: "bc-game-speed-baccarat-by-evolution-gaming", name: "BC.GAME Speed Baccarat", provider: "Evolution Gaming", category: "Live Casino", players: 45, sections: ["exclusive"], tags: ["BC Exclusive", "Baccarat"] },
  { slug: "bcgame-roulette-by-evolution-gaming", name: "BCGAME Roulette", provider: "Evolution Gaming", category: "Live Casino", players: 35, sections: ["exclusive"], tags: ["BC Exclusive", "Roulette"] },
  { slug: "bc-game-ice-fishing-by-evolution-gaming", name: "BC.GAME ICE Fishing", provider: "Evolution Gaming", category: "Live Casino", players: 22, sections: ["exclusive"], tags: ["BC Exclusive", "Game shows"] },
  { slug: "bc-game-baccarat-by-evolution-gaming", name: "BC.GAME Baccarat", provider: "Evolution Gaming", category: "Live Casino", players: 87, sections: ["exclusive"], tags: ["BC Exclusive", "Baccarat"] },
  { slug: "bc-game-japanese-speed-baccarat-by-evolution-gaming", name: "BC.GAME Japanese Speed Baccarat", provider: "Evolution Gaming", category: "Live Casino", players: 54, sections: ["exclusive"], tags: ["BC Exclusive", "Baccarat"] },
  { slug: "bc-game-korean-speed-baccarat-by-evolution-gaming", name: "BC.GAME Korean Speed Baccarat", provider: "Evolution Gaming", category: "Live Casino", players: 54, sections: ["exclusive"], tags: ["BC Exclusive", "Baccarat"] },
  { slug: "bc-game-xxxtreme-lightning-roulette-by-evolution-gaming", name: "BC.GAME XXXtreme Lightning Roulette", provider: "Evolution Gaming", category: "Live Casino", players: 19, sections: ["exclusive"], tags: ["BC Exclusive", "Roulette", "Game shows"] },
  { slug: "bc-game-korean-super-speed-baccarat-by-evolution-gaming", name: "BC.GAME Korean Super Speed Baccarat", provider: "Evolution Gaming", category: "Live Casino", players: 78, sections: ["exclusive"], tags: ["BC Exclusive", "Baccarat"] },
  { slug: "queen-of-inca-by-fa-chai", name: "QUEEN OF INCA", provider: "FA CHAI", category: "Slots", players: 34, sections: ["slots"], tags: ["Slots"] },
  { slug: "sugar-bang-bang-2-by-fa-chai", name: "SUGAR BANG BANG 2", provider: "FA CHAI", category: "Slots", players: 34, sections: ["slots"], tags: ["Slots"] },
  { slug: "treasure-quest-by-tada", name: "Treasure Quest", provider: "TaDa", category: "Slots", players: 81, sections: ["slots"], tags: ["Slots"] },
  { slug: "lucky-fortunes-by-fa-chai", name: "LUCKY FORTUNES", provider: "FA CHAI", category: "Slots", players: 31, sections: ["slots"], tags: ["Slots"] },
  { slug: "fiery-sevens-exclusive-by-spadegaming", name: "Fiery Sevens Exclusive", provider: "Spadegaming", category: "Slots", players: 20, sections: ["slots"], tags: ["Slots"] },
  { slug: "crown-coins-by-endorphina", name: "Crown Coins", provider: "Endorphina", category: "Slots", players: 72, sections: ["slots"], tags: ["Slots"] },
  { slug: "fortune-money-boom-by-fa-chai", name: "FORTUNE MONEY BOOM", provider: "FA CHAI", category: "Slots", players: 33, sections: ["slots"], tags: ["Slots"] },
  { slug: "crazy777-2-by-tada", name: "Crazy777 2", provider: "TaDa", category: "Slots", players: 60, sections: ["slots"], tags: ["Slots"] },
  { slug: "gold-panther-maxways-by-spadegaming", name: "Gold Panther Maxways", provider: "Spadegaming", category: "Slots", players: 90, sections: ["slots"], tags: ["Slots"] },
  { slug: "lucky-tiger-by-tada", name: "Lucky Tiger", provider: "TaDa", category: "Slots", players: 87, sections: ["slots"], tags: ["Slots"] },
  { slug: "baccarat-by-evolution-gaming", name: "Baccarat", provider: "Evolution Gaming", category: "Live Casino", players: 10, sections: ["live_casino"], tags: ["Baccarat"] },
  { slug: "roulette-by-evolution-gaming", name: "Roulette", provider: "Evolution Gaming", category: "Live Casino", players: 55, sections: ["live_casino"], tags: ["Roulette"] },
  { slug: "blackjack-by-evolution-gaming", name: "Blackjack", provider: "Evolution Gaming", category: "Live Casino", players: 58, sections: ["live_casino"], tags: ["Blackjack"] },
  { slug: "evolution-game-shows-by-evolution-gaming", name: "Evolution Game Shows", provider: "Evolution Gaming", category: "Live Casino", players: 25, sections: ["live_casino"], tags: [] },
  { slug: "dragon-tiger-by-evolution-gaming-17929", name: "DRAGON TIGER", provider: "Evolution Gaming", category: "Live Casino", players: 21, sections: ["live_casino"], tags: [] },
  { slug: "poker-by-evolution-gaming", name: "Poker", provider: "Evolution Gaming", category: "Live Casino", players: 39, sections: ["live_casino"], tags: ["Poker", "Table games"] },
  { slug: "tvbet-lobby-by-tvbet", name: "TVBET LOBBY", provider: "TVBET", category: "Live Casino", players: 10, sections: ["live_casino"], tags: [] },
  { slug: "winfinity-lobby-by-winfinity", name: "Winfinity Lobby", provider: "Winfinity", category: "Live Casino", players: 11, sections: ["live_casino"], tags: [] },
  { slug: "fan-tan-by-evolution-gaming-17928", name: "FAN TAN", provider: "Evolution Gaming", category: "Live Casino", players: 28, sections: ["live_casino"], tags: [] },
  { slug: "sicbo-by-evolution-gaming", name: "SICBO", provider: "Evolution Gaming", category: "Live Casino", players: 29, sections: ["live_casino"], tags: ["Sic Bo"] },
  { slug: "bingo", name: "Bingo", provider: "BC Originals", category: "Original Casino", players: 24, sections: ["bingo_all", "originals"], tags: ["Bingo", "BC Originals"] },
  { slug: "super-bingo-by-tada", name: "Super Bingo", provider: "TaDa", category: "Slots", players: 10, sections: ["bingo_all"], tags: ["Bingo", "Burst Games", "Crash games", "Buy extra ball feature"] },
  { slug: "immortal-romance-video-bingo-by-neko-games", name: "Immortal Romance Video Bingo", provider: "Neko Games", category: "Slots", players: 75, sections: ["bingo_all"], tags: ["Bingo", "Bingo jackpot", "Buy extra ball feature"] },
  { slug: "irich-bingo-by-tada", name: "iRich Bingo", provider: "TaDa", category: "Slots", players: 20, sections: ["bingo_all"], tags: ["Bingo", "Burst Games", "Crash games", "Buy extra ball feature"] },
  { slug: "bingo-carnaval-by-tada", name: "Bingo Carnaval", provider: "TaDa", category: "Slots", players: 100, sections: ["bingo_all"], tags: ["Bingo", "Burst Games", "Crash games", "Buy extra ball feature"] },
  { slug: "jackpot-bingo-by-tada", name: "Jackpot Bingo", provider: "TaDa", category: "Slots", players: 85, sections: ["bingo_all"], tags: ["Bingo", "Burst Games", "Bingo jackpot", "Crash games", "Buy extra ball feature"] },
  { slug: "magic-lamp-bingo-by-tada", name: "Magic Lamp Bingo", provider: "TaDa", category: "Slots", players: 41, sections: ["bingo_all"], tags: ["Bingo", "Buy extra ball feature"] },
  { slug: "fortune-bingo-by-tada", name: "Fortune Bingo", provider: "TaDa", category: "Slots", players: 85, sections: ["bingo_all"], tags: ["Bingo", "Burst Games", "Crash games", "Buy extra ball feature"] },
  { slug: "go-goal-bingo-by-tada", name: "Go Goal Bingo", provider: "TaDa", category: "Slots", players: 66, sections: ["bingo_all"], tags: ["Bingo", "Burst Games", "Crash games", "Buy extra ball feature"] },
  { slug: "halloween-bingo-by-belatra", name: "Halloween Bingo", provider: "Belatra", category: "Slots", players: 47, sections: ["bingo_all"], tags: ["Bingo", "Buy extra ball feature", "Halloween"] },
  { slug: "crazy-time-by-evolution-gaming", name: "Crazy Time", provider: "Evolution Gaming", category: "Live Casino", players: 50, sections: ["hot_games"], tags: ["Game shows"] },
  { slug: "diamond-style-by-onlyplay", name: "Diamond Style", provider: "OnlyPlay", category: "Slots", players: 18, sections: ["hot_games"], tags: ["Slots"] },
  { slug: "speed-baccarat-a-by-evolution-gaming", name: "Speed Baccarat A", provider: "Evolution Gaming", category: "Live Casino", players: 49, sections: ["hot_games"], tags: ["Baccarat"] },
  { slug: "jumbo-joker-by-betsoft", name: "Jumbo Joker", provider: "BetSoft", category: "Slots", players: 89, sections: ["hot_games"], tags: ["Slots"] },
  { slug: "symbiote-by-croco-gaming", name: "Symbiote", provider: "Croco Gaming", category: "Slots", players: 87, sections: ["hot_games", "originals"], tags: ["Slots"] },
  { slug: "fortune-chests-by-endorphina", name: "Fortune Chests", provider: "Endorphina", category: "Slots", players: 98, sections: ["hot_games"], tags: ["Slots"] },
  { slug: "rhino-robbery-by-croco-gaming", name: "Rhino Robbery", provider: "Croco Gaming", category: "Slots", players: 44, sections: ["hot_games", "originals"], tags: ["Slots"] },
  { slug: "wukong-by-croco-gaming", name: "WUKONG", provider: "Croco Gaming", category: "Slots", players: 22, sections: ["hot_games", "originals"], tags: ["Slots"] },
  { slug: "dragon-ball-destiny-by-funta-gaming", name: "Dragon Ball Destiny", provider: "FunTa Gaming", category: "Slots", players: 91, sections: ["hot_games"], tags: [] },
  { slug: "super-elements-by-fa-chai", name: "SUPER ELEMENTS", provider: "FA CHAI", category: "Slots", players: 20, sections: ["hot_games"], tags: ["Slots"] },
  { slug: "video-poker", name: "Video Poker", provider: "BC Originals", category: "Original Casino", players: 73, sections: ["table_games", "originals"], tags: ["Poker", "BC Originals", "Table games"] },
  { slug: "bc-poker", name: "BCPoker", provider: "BC Originals", category: "Original Casino", players: 30, sections: ["table_games", "originals"], tags: ["MTT", "Customized", "Poker", "BC Originals", "Table games"] },
  { slug: "blackjack", name: "Blackjack", provider: "BC Originals", category: "Original Casino", players: 26, sections: ["table_games", "originals"], tags: ["Blackjack", "BC Originals", "Table games"] },
  { slug: "poker-win-2-by-fa-chai", name: "POKER WIN 2", provider: "FA CHAI", category: "Slots", players: 59, sections: ["table_games"], tags: ["Poker", "Table games"] },
  { slug: "roulette-multiplayer", name: "Roulette Multiplayer", provider: "BC Originals", category: "Original Casino", players: 52, sections: ["table_games", "originals"], tags: ["BC Originals", "Roulette", "Table games"] },
  { slug: "baccarat", name: "Baccarat", provider: "BC Originals", category: "Original Casino", players: 26, sections: ["table_games", "originals"], tags: ["BC Originals", "Baccarat", "Table games"] },
  { slug: "poker-win-by-fa-chai", name: "POKER WIN", provider: "FA CHAI", category: "Slots", players: 24, sections: ["table_games"], tags: ["Poker", "Table games"] },
  { slug: "baccarat-multiplayer", name: "Baccarat Multiplayer", provider: "BC Originals", category: "Original Casino", players: 92, sections: ["table_games", "originals"], tags: ["BC Originals", "Baccarat", "Table games"] },
  { slug: "first-person-xxxtreme-lightning-roulette-by-evolution-gaming", name: "First Person XXXtreme Lightning Roulette\u00a0", provider: "Evolution Gaming", category: "Slots", players: 86, sections: ["table_games"], tags: ["Roulette", "Table games"] },
  { slug: "first-person-lightning-roulette-by-evolution-gaming", name: "First Person Lightning Roulette", provider: "Evolution Gaming", category: "Slots", players: 57, sections: ["table_games"], tags: ["Roulette", "Table games"] },
  { slug: "dinosaur-tycoon-by-tada", name: "Dinosaur Tycoon", provider: "TaDa", category: "Slots", players: 18, sections: ["fishing"], tags: ["Fishing"] },
  { slug: "dragon-fortune-by-tada", name: "Dragon Fortune", provider: "TaDa", category: "Slots", players: 28, sections: ["fishing"], tags: ["Fishing"] },
  { slug: "dinosaur-tycoon-ii-by-tada", name: "Dinosaur Tycoon II", provider: "TaDa", category: "Slots", players: 36, sections: ["fishing"], tags: ["Fishing"] },
  { slug: "mega-fishing-by-tada", name: "Mega Fishing", provider: "TaDa", category: "Slots", players: 45, sections: ["fishing"], tags: ["Fishing"] },
  { slug: "jackpot-fishing-by-tada", name: "Jackpot Fishing", provider: "TaDa", category: "Slots", players: 10, sections: ["fishing"], tags: ["Fishing"] },
  { slug: "alien-hunter-by-spadegaming", name: "Alien Hunter", provider: "Spadegaming", category: "Slots", players: 40, sections: ["fishing"], tags: ["Fishing", "Feature buy-in"] },
  { slug: "all-star-fishing-by-tada", name: "All-star Fishing", provider: "TaDa", category: "Slots", players: 35, sections: ["fishing"], tags: ["Fishing"] },
  { slug: "ocean-king-jackpot-by-tada", name: "Ocean King Jackpot", provider: "TaDa", category: "Slots", players: 26, sections: ["fishing"], tags: ["Fishing"] },
  { slug: "fishing-game-by-wali-games", name: "Fishing Game", provider: "WALI GAMES", category: "Slots", players: 14, sections: ["fishing"], tags: ["Fishing"] },
  { slug: "fortune-zombie-lightning-by-tada", name: "Fortune Zombie Lightning", provider: "TaDa", category: "Slots", players: 91, sections: ["fishing"], tags: ["Fishing"] },
  { slug: "cave", name: "Cave Of Plunder", provider: "BC Originals", category: "Original Casino", players: 24, sections: ["originals"], tags: ["BC Originals", "Treasures", "Jackpots"] },
  { slug: "twist", name: "Twist", provider: "BC Originals", category: "Original Casino", players: 92, sections: ["originals"], tags: ["BC Originals", "Provably fair"] },
  { slug: "bubble-shooter", name: "Bubble Shooter", provider: "BC Originals", category: "Original Casino", players: 100, sections: ["originals"], tags: ["BC Originals", "Provably fair"] },
  { slug: "jade", name: "Jade", provider: "BC Originals", category: "Original Casino", players: 86, sections: ["originals"], tags: [] },
  { slug: "sword", name: "Savior Sword", provider: "BC Originals", category: "Original Casino", players: 15, sections: ["originals"], tags: ["Respins", "Diamonds", "Bonus symbols", "BC Originals", "Bonus wheel"] },
  { slug: "fast-crash", name: "Fast Crash", provider: "BC Originals", category: "Original Casino", players: 88, sections: ["originals"], tags: [] },
  { slug: "wheel", name: "Wheel", provider: "BC Originals", category: "Original Casino", players: 28, sections: ["originals"], tags: ["BC Originals", "Provably fair", "Bonus wheel"] },
  { slug: "roulette", name: "Roulette", provider: "BC Originals", category: "Original Casino", players: 24, sections: ["originals"], tags: [] },
  { slug: "stellar-rush", name: "Stellar Rush", provider: "BC Originals", category: "Original Casino", players: 82, sections: ["originals"], tags: ["BC Originals", "Space", "Crash games"] },
  { slug: "oriental-beauties", name: "Beauties", provider: "BC Originals", category: "Original Casino", players: 25, sections: ["originals"], tags: ["Scatter symbols", "Asian theme", "Beauties", "Bonus symbols", "BC Originals", "Expanding Symbols"] },
  { slug: "ring-of-fortune", name: "Ring of Fortune", provider: "BC Originals", category: "Original Casino", players: 38, sections: ["originals"], tags: ["BC Originals", "Provably fair"] },
  { slug: "piece-of-cash-by-croco-gaming", name: "Piece Of Cash", provider: "Croco Gaming", category: "Slots", players: 53, sections: ["originals"], tags: ["Slots"] },
  { slug: "hash-dice", name: "Hash Dice", provider: "BC Originals", category: "Original Casino", players: 46, sections: ["originals"], tags: ["Dice", "BC Originals", "Provably fair"] },
  { slug: "reel-big-catch-by-croco-gaming", name: "Reel Big Catch", provider: "Croco Gaming", category: "Slots", players: 55, sections: ["originals"], tags: ["Slots"] },
  { slug: "deadliest-sea-by-croco-gaming", name: "Deadliest Sea", provider: "Croco Gaming", category: "Slots", players: 69, sections: ["originals"], tags: ["Slots"] },
  { slug: "cursed-clown-by-croco-gaming", name: "Cursed Clown", provider: "Croco Gaming", category: "Slots", players: 45, sections: ["originals"], tags: ["Slots"] },
  { slug: "magical-mine-by-croco-gaming", name: "Magical Mine", provider: "Croco Gaming", category: "Slots", players: 31, sections: ["originals"], tags: ["Slots"] },
  { slug: "jack-s-crypt-by-croco-gaming", name: "Jack's Crypt", provider: "Croco Gaming", category: "Slots", players: 10, sections: ["originals"], tags: ["Slots"] },
  { slug: "cursed-doll-by-croco-gaming", name: "Cursed Doll", provider: "Croco Gaming", category: "Slots", players: 49, sections: ["originals"], tags: ["Slots"] },
  { slug: "sicbo-multiplayer", name: "Sicbo", provider: "BC Originals", category: "Original Casino", players: 72, sections: ["originals"], tags: ["BC Originals", "Dice", "Sic Bo"] },
  { slug: "patti", name: "Patti", provider: "BC Originals", category: "Original Casino", players: 63, sections: ["originals"], tags: ["Teen Patti", "Poker", "BC Originals"] },
  { slug: "color", name: "Perya Color Game", provider: "BC Originals", category: "Original Casino", players: 17, sections: ["originals"], tags: ["Dice", "BC Originals"] },
  { slug: "nezha-by-croco-gaming", name: "NeZha", provider: "Croco Gaming", category: "Slots", players: 55, sections: ["originals"], tags: ["Slots"] },
  { slug: "golden-year-by-croco-gaming", name: "Golden Year", provider: "Croco Gaming", category: "Slots", players: 94, sections: ["originals"], tags: ["Slots"] },
  { slug: "fastparity", name: "Fast Parity", provider: "BC Originals", category: "Original Casino", players: 26, sections: ["originals"], tags: ["Crash games", "BC Originals"] },
  { slug: "double", name: "Double", provider: "BC Originals", category: "Original Casino", players: 15, sections: ["originals"], tags: ["BC Originals", "Provably fair"] },
  { slug: "john-wild-by-croco-gaming", name: "John Wild", provider: "Croco Gaming", category: "Slots", players: 47, sections: ["originals"], tags: ["Slots"] },
  { slug: "keno-multiplayer", name: "Keno Multiplayer", provider: "BC Originals", category: "Original Casino", players: 48, sections: ["originals"], tags: ["Keno", "BC Originals", "Provably fair"] },
  { slug: "samurai-clash-by-croco-gaming", name: "Samurai Clash", provider: "Croco Gaming", category: "Slots", players: 87, sections: ["originals"], tags: ["Slots"] },
  { slug: "ghost-boo-nanza-by-croco-gaming", name: "Ghost Boo-nanza", provider: "Croco Gaming", category: "Slots", players: 10, sections: ["originals"], tags: ["Slots"] },
  { slug: "wizard-s-academy-by-croco-gaming", name: "Wizard's Academy", provider: "Croco Gaming", category: "Slots", players: 59, sections: ["originals"], tags: ["Slots"] },
  { slug: "left-4-cash-by-croco-gaming", name: "Left 4 Cash", provider: "Croco Gaming", category: "Slots", players: 72, sections: ["originals"], tags: ["Slots"] },
  { slug: "cyberpunk-xxii-by-croco-gaming", name: "Cyberpunk XXII", provider: "Croco Gaming", category: "Slots", players: 24, sections: ["originals"], tags: ["Slots"] },
  { slug: "bullet-spin", name: "Bullet Spin", provider: "BC Originals", category: "Original Casino", players: 86, sections: ["originals"], tags: [] },
  { slug: "lucky-ranch-by-croco-gaming", name: "Lucky Ranch", provider: "Croco Gaming", category: "Slots", players: 26, sections: ["originals"], tags: ["Slots"] },
  { slug: "run-away-zombies-by-croco-gaming", name: "Run Away! Zombies", provider: "Croco Gaming", category: "Slots", players: 47, sections: ["originals"], tags: ["Slots"] },
  { slug: "clash-cash-by-croco-gaming", name: "Clash & Cash", provider: "Croco Gaming", category: "Slots", players: 60, sections: ["originals"], tags: ["Slots"] },
  { slug: "dragon-quest-by-croco-gaming", name: "Dragon Quest", provider: "Croco Gaming", category: "Slots", players: 18, sections: ["originals"], tags: ["Slots"] },
  { slug: "fish-prawn-crab", name: "Fish Prawn Crab", provider: "BC Originals", category: "Original Casino", players: 62, sections: ["originals"], tags: ["Dice", "BC Originals"] },
  { slug: "crash-trenball", name: "Crash Trenball", provider: "BC Originals", category: "Original Casino", players: 64, sections: ["originals"], tags: [] },
];

export default GAMES;
