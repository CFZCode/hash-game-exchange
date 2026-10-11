/* The Slots tab's games — the real list, transcribed from the live page's rendered grid.
 *
 * Fourth transcribed set, alongside hotGames.js, originalGames.js and pokerGames.js, and for
 * the same reason: the casino page's chunk and feed are both missing from the mirror (see
 * catalogue.js). It replaces `bySection('slots')`, a derived stand-in over the 118-game
 * capture.
 *
 * THREE PAGES WERE CAPTURED, BUT NOT THREE CONSECUTIVE ONES. Two of them are page 1 and page 2
 * of one render; the third is page 1 of an EARLIER render of the same tab, and the site had
 * reshuffled between the two, so it is a different forty games that overlaps the later page 1
 * heavily. This file is their union: the earlier page in its own order first, then whatever
 * each later page added. 40 + 17 + 40 = 97, and the order is faithful within each capture but
 * is not a single ordering the live site ever served.
 *
 * That the two renders agree is what checks the transcription: every slug appearing in both
 * this file and hotGames.js carries the same artwork hash, and all 97 hashes resolved.
 *
 * The live pager read "of 131" on the earlier capture and "of 86" on the later two — the
 * site's own number, disagreeing with itself between renders exactly as it does on the Hot
 * tab. 97 games is what was captured, not what the tab holds.
 *
 * Player counts are a snapshot and drift every second. PROVIDER is derived from each slug's
 * `-by-<provider>` suffix, as in hotGames.js. Badges are recorded and drawn nowhere.
 */

/* Slug suffix -> the studio's name as data/providers.js spells it. */
const PROVIDERS = {
  hacksaw: 'Hacksaw', // not in data/providers.js
  'pg-soft': 'PG Soft',
  nolimitcity: 'Nolimit City',
  'croco-gaming': 'Croco Gaming',
  'fa-chai': 'FA CHAI',
  'clutch-gaming': 'Clutch Gaming', // not in data/providers.js
  'penguin-king': 'Penguin King', // not in data/providers.js
  fazi: 'Fazi', // not in data/providers.js
  'ruby-play': 'Ruby Play', // not in data/providers.js
  '1spin4win': '1SPIN4WIN',
  tada: 'TaDa',
  backseat: 'Backseat Gaming',
  netent: 'NetEnt',
  spribe: 'Spribe',
  spadegaming: 'Spadegaming',
  'popok-gaming': 'PopOK Gaming',
  popiplay: 'Popiplay',
  bullshark: 'Bullshark Games',
  avatarux: 'AvatarUX',
};

/* [slug, name, players, badge?] */
const SLOTS = [
  ['knockoin-by-croco-gaming', 'Knockoin', 66, 'New'],
  ['san-quentin-xways-dx8-by-nolimitcity', 'San Quentin xWays DX8', 89],
  ['mental-dx8-by-nolimitcity', 'Mental DX8', 89],
  ['book-of-wild-by-1spin4win', 'Book of Wild', 66],
  ['the-luxe-h-v-by-hacksaw', 'The Luxe H.V.', 77],
  ['le-pharaoh-by-hacksaw', 'Le Pharaoh', 78],
  ['wukong-by-croco-gaming', 'WUKONG', 43],
  ['hot-ross-by-hacksaw', 'Hot Ross', 69],
  ['death-becomes-you-by-hacksaw', 'Death Becomes You', 54],
  ['candy-fiesta-1000-by-croco-gaming', 'Candy Fiesta 1000', 100, 'Exclusive'],
  ['duel-at-dawn-by-hacksaw', 'Duel at Dawn', 96],
  ['le-striker-by-hacksaw', 'Le Striker', 53],
  ['frkn-bananas-by-hacksaw', 'FRKN Bananas', 45],
  ['fire-in-the-hole-3-by-nolimitcity', 'Fire in the Hole 3', 42],
  ['dead-or-alive-2-feature-buy-by-netent', 'Dead or Alive 2 Feature Buy', 27],
  ['mayan-stackways-by-hacksaw', 'Mayan Stackways', 16],
  ['ander-meegan-by-croco-gaming', 'Ander & Meegan', 92],
  ['duel-of-wizards-by-clutch-gaming', 'Duel of Wizards', 78, 'New'],
  ['le-fisherman-by-hacksaw', 'Le Fisherman', 48],
  ['dusty-trail-by-clutch-gaming', 'Dusty Trail', 60, 'New'],
  ['nine-to-five-by-nolimitcity', 'Nine To Five', 50],
  ['vegas-fortune-by-avatarux', 'Vegas Fortune', 62],
  ['super-pyramid-of-gold-hold-win-by-penguin-king', 'Super Pyramid of Gold Hold & Win', 22],
  ['gates-of-anubis-by-popiplay', 'Gates Of Anubis', 100],
  ['gangsta-shark-by-clutch-gaming', 'Gangsta Shark', 90],
  ['punk-rocker-3-by-nolimitcity', 'Punk Rocker 3', 82],
  ['gator-hunters-by-nolimitcity', 'Gator Hunters', 94],
  ['deadwood-xnudge-by-nolimitcity', 'Deadwood xNudge', 27],
  ['deadwood-r-i-p-by-nolimitcity', 'Deadwood R.I.P', 75],
  ['lucky-hercules-hold-and-win-by-1spin4win', 'Lucky Hercules Hold And Win', 44, 'New'],
  ['the-cursed-mummy-by-clutch-gaming', 'The Cursed Mummy', 20, 'New'],
  ['tnt-rush-by-clutch-gaming', 'TNT Rush', 80],
  ['the-count-by-hacksaw', 'The Count', 94],
  ['wild-bounty-showdown-by-pg-soft', 'Wild Bounty Showdown', 52],
  ['ganesha-golden-wheel-by-croco-gaming', 'Ganesha Golden Wheel', 100],
  ['dead-man-s-chest-by-clutch-gaming', "Dead Man's Chest", 66, 'New'],
  ['drako-s-den-by-clutch-gaming', "Drako's Den", 35],
  ['munchies-by-nolimitcity', 'Munchies', 41],
  ['cash-strike-by-penguin-king', 'Cash Strike', 33],
  ['halls-of-odin-by-backseat', 'Halls of Odin', 83],
  ['jurassic-kingdom-by-pg-soft', 'Jurassic Kingdom', 61],
  ['flight-mode-by-nolimitcity', 'Flight Mode', 52],
  ['serial-by-nolimitcity', 'Serial', 52],
  ['willy-s-hot-chillies-by-netent', "Willy's Hot Chillies", 17],
  ['arabian-secret-by-ruby-play', 'Arabian Secret', 39],
  ['tanked-by-nolimitcity', 'Tanked', 80],
  ['museum-wonders-by-pg-soft', 'Museum Wonders', 71],
  ['road-rage-by-nolimitcity', 'Road Rage', 39],
  ['benji-killed-in-vegas-by-nolimitcity', 'Benji Killed in Vegas', 40],
  ['5-star-coins-hold-win-by-penguin-king', '5 Star Coins: Hold & Win', 41],
  ['tombstone-no-mercy-by-nolimitcity', 'Tombstone No Mercy', 66],
  ['deadliest-sea-by-croco-gaming', 'Deadliest Sea', 48],
  ['ultimate-slot-of-america-by-hacksaw', 'Ultimate Slot of America', 51],
  ['golden-genie-by-fa-chai', 'GOLDEN GENIE', 61],
  ['lucky-jungle-by-popok-gaming', 'Lucky Jungle', 48],
  ['aviator-mobile-by-spribe', 'Aviator Mobile', 76],
  ['rave-party-fever-by-pg-soft', 'Rave Party Fever', 39],
  ['deep-jungle-by-fazi', 'Deep Jungle', 49],
  ['legacy-of-kong-maxways-by-spadegaming', 'Legacy Of Kong Maxways', 38],
  ['sixsixsix-by-hacksaw', 'SixSixSix', 100],
  ['duck-hunters-by-nolimitcity', 'Duck Hunters', 54],
  ['treasures-of-aztec-by-pg-soft', 'Treasures of Aztec', 34],
  ['wanted-dead-or-a-wild-by-hacksaw', 'Wanted Dead or a Wild', 85],
  ['wild-ape-3258-by-pg-soft', 'Wild Ape #3258', 68],
  ['mahjong-ways-2-by-pg-soft', 'Mahjong Ways 2', 26],
  ['le-bandit-by-hacksaw', 'Le Bandit', 69],
  ['sugar-bang-bang-2-by-fa-chai', 'SUGAR BANG BANG 2', 59],
  ['fortune-rabbit-by-pg-soft', 'Fortune Rabbit', 19],
  ['pinata-wins-by-pg-soft', 'Pinata Wins', 26],
  ['mahjong-ways-by-pg-soft', 'Mahjong Ways', 26],
  ['wild-bandito-by-pg-soft', 'Wild Bandito', 38],
  ['chinese-new-year-moreways-by-fa-chai', 'CHINESE NEW YEAR MOREWAYS', 53],
  ['queen-of-inca-by-fa-chai', 'QUEEN OF INCA', 26],
  ['lucky-neko-by-pg-soft', 'Lucky Neko', 31],
  ['fortune-dragon-by-pg-soft', 'Fortune Dragon', 19],
  ['fist-of-destruction-by-hacksaw', 'Fist of Destruction', 80],
  ['super-elements-by-fa-chai', 'SUPER ELEMENTS', 22],
  ['phoenix-fever-by-fa-chai', 'PHOENIX FEVER', 57],
  ['miami-mayhem-by-hacksaw', 'Miami Mayhem', 46],
  ['fortune-coins-2-by-tada', 'Fortune Coins 2', 67],
  ['anubis-wrath-by-pg-soft', 'Anubis Wrath', 65],
  ['ways-of-the-qilin-by-pg-soft', 'Ways of the Qilin', 37],
  ['geisha-s-revenge-by-pg-soft', "Geisha's Revenge", 100],
  ['seamen-by-nolimitcity', 'Seamen', 64],
  ['chaos-crew-by-hacksaw', 'Chaos Crew', 22],
  ['zeus-by-fa-chai', 'ZEUS', 50],
  ['fire-in-the-hole-2-by-nolimitcity', 'Fire in the Hole 2', 89],
  ['symbiote-by-croco-gaming', 'Symbiote', 94],
  ['age-of-seth-by-bullshark', 'Age of Seth', 100],
  ['nezha-by-croco-gaming', 'NeZha', 48],
  ['le-cowboy-by-hacksaw', 'Le Cowboy', 41],
  ['xmas-drop-by-hacksaw', 'Xmas Drop', 84],
  ['clover-coins-4x4-by-tada', 'Clover Coins 4x4', 85],
  ['mental-2-by-nolimitcity', 'Mental 2', 19],
  ['stormforged-by-hacksaw', 'Stormforged', 74],
  ['rip-city-by-hacksaw', 'Rip City', 10],
  ['cocktail-nights-by-pg-soft', 'Cocktail Nights', 54],
];

export const SLOT_GAMES = SLOTS.map(([slug, name, players, badge]) => {
  const parts = slug.split('-by-');
  const suffix = parts.length > 1 ? parts[parts.length - 1] : '';
  return {
    slug,
    name,
    players,
    badge,
    provider: PROVIDERS[suffix] || 'BC.GAME',
    category: 'Slots',
    sections: ['slots'],
    tags: ['Slots'],
  };
});
