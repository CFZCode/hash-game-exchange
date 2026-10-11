/* The Hot Games tab's games — the real list, transcribed from the live page's rendered grid.
 *
 * Third and largest of the transcribed sets, alongside originalGames.js and pokerGames.js, and
 * for the same reason: the casino page's chunk and feed are both missing from the mirror (see
 * catalogue.js). Slug, name, player count and the artwork hash are read off the live DOM across
 * THREE consecutive captured pages; the covers were downloaded from those hashes. All 120
 * resolved, so every tile has real art.
 *
 * It replaces a derived stand-in: `SETS.hot` was `bySection('hot_games')` over the 118-game
 * capture, which found ten — one page's worth of the home feed's hot selection, not this tab.
 *
 * WHAT IS MISSING. Three pages were captured, not the whole tab. The live pager reads "of 148"
 * on the first captured page and "of 96" on the next two — the site's own number, and it
 * disagrees with itself between renders, so neither is a reliable total. What IS reliable is
 * that a page holds forty and three pages were captured. The tab therefore shows 120 games over
 * 3 pages here where the live one shows thousands; it is truncated, not wrong.
 *
 * Player counts are a snapshot; they drift every second on the real site.
 *
 * PROVIDER is not in this markup — the grid prints no studio. It is derived from each slug's own
 * `-by-<provider>` suffix, which is the feed's convention, spelled to match data/providers.js
 * so the Providers filter matches. Four studios here — Hacksaw, Clutch Gaming, Penguin King and
 * Fazi — are NOT in that file's forty-six, because that list is the live provider dropdown as
 * captured and they were not in it. Their names are the suffix title-cased, so the games carry a
 * provider the filter cannot offer. Add them to data/providers.js when a capture names them.
 *
 * BADGES are recorded and drawn nowhere, exactly as originalGames.js documents.
 *
 * ORDER IS THE LIVE PAGE'S and decides which forty land on each page.
 */

/* Slug suffix -> the studio's name as data/providers.js spells it. Only the ones this tab uses.
   The four with no entry in that file are marked. */
const PROVIDERS = {
  'evolution-gaming': 'Evolution Gaming',
  hacksaw: 'Hacksaw', // not in data/providers.js
  'pg-soft': 'PG Soft',
  nolimitcity: 'Nolimit City',
  'fa-chai': 'FA CHAI',
  'croco-gaming': 'Croco Gaming',
  'clutch-gaming': 'Clutch Gaming', // not in data/providers.js
  tada: 'TaDa',
  fazi: 'Fazi', // not in data/providers.js
  '1spin4win': '1SPIN4WIN',
  spribe: 'Spribe',
  spadegaming: 'Spadegaming',
  'sexy-gaming': 'Sexy Gaming',
  'popok-gaming': 'PopOK Gaming',
  popiplay: 'Popiplay',
  'penguin-king': 'Penguin King', // not in data/providers.js
  netent: 'NetEnt',
  bullshark: 'Bullshark Games',
  'big-time-gaming': 'Big Time Gaming',
  avatarux: 'AvatarUX',
};

/* [slug, name, players, badge?] */
const HOT = [
  ['fire-in-the-hole-xbomb-dx8-by-nolimitcity', 'Fire In The Hole xBomb DX8', 24],
  ['bcgame-iron-blackjack-by-evolution-gaming', 'BCGAME Iron Blackjack', 45, 'Exclusive'],
  ['book-of-wild-by-1spin4win', 'Book of Wild', 53],
  ['bcgame-bronze-blackjack-by-evolution-gaming', 'BCGAME Bronze Blackjack', 45, 'Exclusive'],
  ['bcgame-silver-blackjack-3-by-evolution-gaming', 'BCGAME Silver Blackjack 3', 58, 'Exclusive'],
  ['the-luxe-h-v-by-hacksaw', 'The Luxe H.V.', 69],
  ['auto-roulette-by-evolution-gaming', 'Auto-Roulette', 89],
  ['bcgame-silver-blackjack-by-evolution-gaming', 'BCGAME Silver Blackjack', 19, 'Exclusive'],
  ['always-9-baccarat-by-evolution-gaming', 'Always 9 Baccarat', 73],
  ['le-pharaoh-by-hacksaw', 'Le Pharaoh', 70],
  ['blackjack-classic-32-by-evolution-gaming', 'Blackjack Classic 32', 27],
  ['wukong-by-croco-gaming', 'WUKONG', 51],
  ['hot-ross-by-hacksaw', 'Hot Ross', 56],
  ['immersive-roulette-by-evolution-gaming', 'Immersive Roulette', 78],
  ['lightning-storm-by-evolution-gaming', 'Lightning Storm', 32],
  ['death-becomes-you-by-hacksaw', 'Death Becomes You', 62],
  ['blackjack-classic-64-by-evolution-gaming', 'Blackjack Classic 64', 69],
  ['knockoin-by-croco-gaming', 'Knockoin', 76, 'New'],
  ['candy-fiesta-1000-by-croco-gaming', 'Candy Fiesta 1000', 94, 'Exclusive'],
  ['duel-at-dawn-by-hacksaw', 'Duel at Dawn', 83],
  ['le-striker-by-hacksaw', 'Le Striker', 40],
  ['frkn-bananas-by-hacksaw', 'FRKN Bananas', 32],
  ['fire-in-the-hole-3-by-nolimitcity', 'Fire in the Hole 3', 34],
  ['dead-or-alive-2-feature-buy-by-netent', 'Dead or Alive 2 Feature Buy', 40],
  ['mayan-stackways-by-hacksaw', 'Mayan Stackways', 29],
  ['ander-meegan-by-croco-gaming', 'Ander & Meegan', 100],
  ['duel-of-wizards-by-clutch-gaming', 'Duel of Wizards', 65, 'New'],
  ['le-fisherman-by-hacksaw', 'Le Fisherman', 40],
  ['dusty-trail-by-clutch-gaming', 'Dusty Trail', 73, 'New'],
  ['nine-to-five-by-nolimitcity', 'Nine To Five', 58],
  ['vegas-fortune-by-avatarux', 'Vegas Fortune', 49],
  ['super-pyramid-of-gold-hold-win-by-penguin-king', 'Super Pyramid of Gold Hold & Win', 14],
  ['gates-of-anubis-by-popiplay', 'Gates Of Anubis', 95],
  ['gangsta-shark-by-clutch-gaming', 'Gangsta Shark', 100],
  ['punk-rocker-3-by-nolimitcity', 'Punk Rocker 3', 90],
  ['gator-hunters-by-nolimitcity', 'Gator Hunters', 100],
  ['deadwood-xnudge-by-nolimitcity', 'Deadwood xNudge', 40],
  ['deadwood-r-i-p-by-nolimitcity', 'Deadwood R.I.P', 88],
  ['lucky-hercules-hold-and-win-by-1spin4win', 'Lucky Hercules Hold And Win', 36, 'New'],
  ['the-cursed-mummy-by-clutch-gaming', 'The Cursed Mummy', 12, 'New'],
  ['tombstone-no-mercy-by-nolimitcity', 'Tombstone No Mercy', 66],
  ['deadliest-sea-by-croco-gaming', 'Deadliest Sea', 52],
  ['speed-baccarat-1-by-evolution-gaming', 'Speed Baccarat 1', 18],
  ['ultimate-slot-of-america-by-hacksaw', 'Ultimate Slot of America', 51],
  ['golden-genie-by-fa-chai', 'GOLDEN GENIE', 22],
  ['lucky-jungle-by-popok-gaming', 'Lucky Jungle', 48],
  ['aviator-mobile-by-spribe', 'Aviator Mobile', 76],
  ['rave-party-fever-by-pg-soft', 'Rave Party Fever', 39],
  ['cruise-royale-by-pg-soft', 'Cruise Royale', 45],
  ['speed-baccarat-a-by-evolution-gaming', 'Speed Baccarat A', 55],
  ['fruits-and-stars-by-fazi', 'Fruits and Stars', 12],
  ['rhino-robbery-by-croco-gaming', 'Rhino Robbery', 29],
  ['deep-jungle-by-fazi', 'Deep Jungle', 48],
  ['legacy-of-kong-maxways-by-spadegaming', 'Legacy Of Kong Maxways', 37],
  ['crazy-time-by-evolution-gaming', 'Crazy Time', 36],
  ['sixsixsix-by-hacksaw', 'SixSixSix', 100],
  ['duck-hunters-by-nolimitcity', 'Duck Hunters', 53],
  ['treasures-of-aztec-by-pg-soft', 'Treasures of Aztec', 22],
  ['bc-game-ice-fishing-by-evolution-gaming', 'BC.GAME ICE Fishing', 24, 'Exclusive'],
  ['wanted-dead-or-a-wild-by-hacksaw', 'Wanted Dead or a Wild', 86],
  ['bc-game-japanese-speed-baccarat-by-evolution-gaming', 'BC.GAME Japanese Speed Baccarat', 48, 'Exclusive'],
  ['wild-ape-3258-by-pg-soft', 'Wild Ape #3258', 67],
  ['mahjong-ways-2-by-pg-soft', 'Mahjong Ways 2', 22],
  ['le-bandit-by-hacksaw', 'Le Bandit', 68],
  ['sugar-bang-bang-2-by-fa-chai', 'SUGAR BANG BANG 2', 20],
  ['baccarat-classic-by-sexy-gaming', 'Baccarat Classic', 36],
  ['super-speed-baccarat-by-evolution-gaming', 'Super Speed Baccarat', 58],
  ['fortune-rabbit-by-pg-soft', 'Fortune Rabbit', 18],
  ['pinata-wins-by-pg-soft', 'Pinata Wins', 24],
  ['bcgame-roulette-by-evolution-gaming', 'BCGAME Roulette', 29, 'Exclusive'],
  ['mahjong-ways-by-pg-soft', 'Mahjong Ways', 22],
  ['wild-bandito-by-pg-soft', 'Wild Bandito', 39],
  ['chinese-new-year-moreways-by-fa-chai', 'CHINESE NEW YEAR MOREWAYS', 24],
  ['lightning-roulette-by-evolution-gaming', 'Lightning Roulette', 39],
  ['queen-of-inca-by-fa-chai', 'QUEEN OF INCA', 32],
  ['bc-game-korean-speed-baccarat-by-evolution-gaming', 'BC.GAME Korean Speed Baccarat', 69, 'Exclusive'],
  ['lucky-neko-by-pg-soft', 'Lucky Neko', 32],
  ['xxxtreme-lightning-roulette-by-evolution-gaming', 'XXXtreme Lightning Roulette', 60],
  ['fortune-dragon-by-pg-soft', 'Fortune Dragon', 20],
  ['poker-win-by-fa-chai', 'POKER WIN', 20],
  ['fist-of-destruction-by-hacksaw', 'Fist of Destruction', 79],
  ['korean-speed-baccarat-a-by-evolution-gaming', 'Korean Speed Baccarat A', 52],
  ['super-elements-by-fa-chai', 'SUPER ELEMENTS', 40],
  ['phoenix-fever-by-fa-chai', 'PHOENIX FEVER', 56],
  ['miami-mayhem-by-hacksaw', 'Miami Mayhem', 47],
  ['fortune-coins-2-by-tada', 'Fortune Coins 2', 68],
  ['anubis-wrath-by-pg-soft', 'Anubis Wrath', 66],
  ['lotus-roulette-by-evolution-gaming', 'Lotus Roulette', 45],
  ['ways-of-the-qilin-by-pg-soft', 'Ways of the Qilin', 38],
  ['geisha-s-revenge-by-pg-soft', "Geisha's Revenge", 99],
  ['seamen-by-nolimitcity', 'Seamen', 65],
  ['chaos-crew-by-hacksaw', 'Chaos Crew', 23],
  ['crazy-balls-by-evolution-gaming', 'Crazy Balls', 47],
  ['speed-baccarat-e-by-evolution-gaming', 'Speed Baccarat E', 69],
  ['zeus-by-fa-chai', 'ZEUS', 49],
  ['golden-wealth-baccarat-by-evolution-gaming', 'Golden Wealth Baccarat', 57],
  ['poker-win-2-by-fa-chai', 'POKER WIN 2', 74],
  ['lightning-baccarat-by-evolution-gaming', 'Lightning Baccarat', 100],
  ['salon-priv-baccarat-a-by-evolution-gaming', 'Salon Privé Baccarat A', 17],
  ['control-squeeze-baccarat-by-evolution-gaming', 'Control Squeeze Baccarat', 74],
  ['fire-in-the-hole-2-by-nolimitcity', 'Fire in the Hole 2', 90],
  ['no-commission-baccarat-by-evolution-gaming', 'No Commission Baccarat', 17],
  ['emperor-roulette-by-evolution-gaming', 'Emperor Roulette', 30],
  ['symbiote-by-croco-gaming', 'Symbiote', 93],
  ['age-of-seth-by-bullshark', 'Age of Seth', 100],
  ['bc-game-xxxtreme-lightning-roulette-by-evolution-gaming', 'BC.GAME XXXtreme Lightning Roulette', 25, 'Exclusive'],
  ['red-door-roulette-by-evolution-gaming', 'Red Door Roulette', 70],
  ['nezha-by-croco-gaming', 'NeZha', 49],
  ['baccarat-a-by-evolution-gaming', 'Baccarat A', 83],
  ['le-cowboy-by-hacksaw', 'Le Cowboy', 42],
  ['xmas-drop-by-hacksaw', 'Xmas Drop', 85],
  ['clover-coins-4x4-by-tada', 'Clover Coins 4x4', 86],
  ['mental-2-by-nolimitcity', 'Mental 2', 18],
  ['korean-speed-baccarat-c-by-evolution-gaming', 'Korean Speed Baccarat C', 42],
  ['stormforged-by-hacksaw', 'Stormforged', 75],
  ['rip-city-by-hacksaw', 'Rip City', 10],
  ['baccarat-b-by-evolution-gaming', 'Baccarat B', 73],
  ['cocktail-nights-by-pg-soft', 'Cocktail Nights', 53],
  ['speed-baccarat-v-by-evolution-gaming', 'Speed Baccarat V', 60],
  ['bonanza-by-big-time-gaming', 'Bonanza', 95],
];

/* Catalogue shape, so the Providers filter and the sort work on these exactly as on every
   other tab. `-by-` is split on the LAST occurrence: `bc-game-ice-fishing-by-evolution-gaming`
   would otherwise break on the game's own name. */
export const HOT_GAMES = HOT.map(([slug, name, players, badge]) => {
  const parts = slug.split('-by-');
  const suffix = parts.length > 1 ? parts[parts.length - 1] : '';
  return {
    slug,
    name,
    players,
    badge,
    provider: PROVIDERS[suffix] || 'BC.GAME',
    category: 'Hot',
    sections: ['hot_games'],
    tags: ['Hot Games'],
  };
});
