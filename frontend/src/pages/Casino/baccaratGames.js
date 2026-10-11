/* The Baccarat tab, transcribed from the live page's own rendered grid.
 *
 * COMPLETE. The pager reads "of 03" on every render and all three pages are here: 40 + 40 +
 * 20 = 100, and the third page's Next button comes back `disabled`, which is the site telling
 * us there is nothing after it. So unlike Hot Games and Slots — where the live pager kept
 * moving under us — this is the whole tab.
 *
 * Two things about this list are the site's own and not transcription slips:
 *
 * - Evolution supplies 81 of the 100. The tab is very largely one studio's table catalogue
 *   rendered out language by language (Korean, Japanese, Hindi, Thai) and letter by letter
 *   (Speed Baccarat A/B/E/U/V/W/Z/1/3, Salon Privé A–L). Names repeat by design.
 * - Four games share the bare name "Baccarat" — BC.GAME's own, Evolution's, FunTa's and Sexy
 *   Gaming's. They are four different tables and four different slugs; only the provider
 *   tells them apart, which is why the mapper derives it rather than dropping it.
 *
 * The eighteen Ezugi rows are the only ones in the whole build whose artwork is a JPEG: they
 * are addressed by UUID instead of the usual 10-hex hash, and imgxcut.com answers those with
 * image/jpeg. See the note at the top of utils/gameArt.js. */

const CATEGORY = 'Baccarat';
const SECTION = 'baccarat';
const TAG = 'Baccarat';

const PROVIDERS = {
  'evolution-gaming': 'Evolution Gaming',
  ezugi: 'Ezugi',
  'funta-gaming': 'FunTa Gaming',
  'sexy-gaming': 'Sexy Gaming',
  'pg-soft': 'PG Soft',
  netent: 'NetEnt',
  'croco-gaming': 'Croco Gaming',
  'red-tiger': 'Red Tiger',
  'bf-games': 'BF Games',
  pegasus: 'Pegasus',
  inout: 'InOut',
  advantplay: 'AdvantPlay',
  'popok-gaming': 'PopOK Gaming',
  avatarux: 'AvatarUX',
  'fa-chai': 'FA CHAI',
  'amigo-gaming': 'Amigo Gaming',
  habanero: 'Habanero',
  popiplay: 'Popiplay',
  spadegaming: 'Spadegaming',
  'big-time-gaming': 'Big Time Gaming',
  onlyplay: 'Onlyplay',
  /* The nine below are not in data/providers.js — the capture's provider list is short, and
     the Providers filter can only offer what that file names. Flagged rather than invented. */
  hacksaw: 'Hacksaw',
  'penguin-king': 'Penguin King',
  booming: 'Booming',
  'ruby-play': 'RubyPlay',
  fazi: 'Fazi',
  platipus: 'Platipus',
  'tom-horn-gaming': 'Tom Horn Gaming',
  thunderkick: 'Thunderkick',
};

/* [slug, name, players, badge?] — in the live page's own order. */
const ROWS = [
  ['always-9-baccarat-by-evolution-gaming', 'Always 9 Baccarat', 71],
  ['baccarat', 'Baccarat', 11],
  ['always-8-baccarat-by-evolution-gaming', 'Always 8 Baccarat', 33],
  ['baccarat-multiplayer', 'Baccarat Multiplayer', 86],
  ['korean-speed-baccarat-b-by-evolution-gaming', 'Korean Speed Baccarat B', 62],
  ['bc-game-baccarat-by-evolution-gaming', 'BC.GAME Baccarat', 93, 'Exclusive'],
  ['speed-baccarat-b-by-evolution-gaming', 'Speed Baccarat B', 55],
  ['korean-speed-baccarat-h-by-evolution-gaming', 'Korean Speed Baccarat H', 25],
  ['speed-baccarat-1-by-evolution-gaming', 'Speed Baccarat 1', 18],
  ['speed-baccarat-a-by-evolution-gaming', 'Speed Baccarat A', 55],
  ['bc-game-japanese-speed-baccarat-by-evolution-gaming', 'BC.GAME Japanese Speed Baccarat', 48, 'Exclusive'],
  ['super-speed-baccarat-by-evolution-gaming', 'Super Speed Baccarat', 58],
  ['bc-game-korean-speed-baccarat-by-evolution-gaming', 'BC.GAME Korean Speed Baccarat', 69, 'Exclusive'],
  ['korean-speed-baccarat-a-by-evolution-gaming', 'Korean Speed Baccarat A', 52],
  ['speed-baccarat-e-by-evolution-gaming', 'Speed Baccarat E', 69],
  ['golden-wealth-baccarat-by-evolution-gaming', 'Golden Wealth Baccarat', 57],
  ['lightning-baccarat-by-evolution-gaming', 'Lightning Baccarat', 100],
  ['salon-priv-baccarat-a-by-evolution-gaming', 'Salon Privé Baccarat A', 17],
  ['control-squeeze-baccarat-by-evolution-gaming', 'Control Squeeze Baccarat', 74],
  ['no-commission-baccarat-by-evolution-gaming', 'No Commission Baccarat', 17],
  ['baccarat-a-by-evolution-gaming', 'Baccarat A', 83],
  ['korean-speed-baccarat-c-by-evolution-gaming', 'Korean Speed Baccarat C', 42],
  ['baccarat-b-by-evolution-gaming', 'Baccarat B', 73],
  ['speed-baccarat-v-by-evolution-gaming', 'Speed Baccarat V', 60],
  ['korean-speed-baccarat-e-by-evolution-gaming', 'Korean Speed Baccarat E', 45],
  ['salon-priv-baccarat-e-by-evolution-gaming', 'Salon Privé Baccarat E', 86],
  ['japanese-speed-baccarat-c-by-evolution-gaming', 'Japanese Speed Baccarat C', 100],
  ['salon-priv-baccarat-c-by-evolution-gaming', 'Salon Privé Baccarat C', 17],
  ['emperor-speed-baccarat-a-by-evolution-gaming', 'Emperor Speed Baccarat A', 78],
  ['salon-priv-baccarat-d-by-evolution-gaming', 'Salon Privé Baccarat D', 100],
  ['prosperity-tree-baccarat-by-evolution-gaming', 'Prosperity Tree Baccarat', 89],
  ['salon-priv-baccarat-k-by-evolution-gaming', 'Salon Privé Baccarat K', 61],
  ['korean-speed-baccarat-g-by-evolution-gaming', 'Korean Speed Baccarat G', 35],
  ['speed-baccarat-3-by-evolution-gaming', 'Speed Baccarat 3', 28],
  ['speed-baccarat-u-by-evolution-gaming', 'Speed Baccarat U', 49],
  ['emperor-speed-baccarat-d-by-evolution-gaming', 'Emperor Speed Baccarat D', 39],
  ['korean-speed-baccarat-d-by-evolution-gaming', 'Korean Speed Baccarat D', 55],
  ['salon-priv-baccarat-h-by-evolution-gaming', 'Salon Privé Baccarat H', 76],
  ['speed-baccarat-z-by-evolution-gaming', 'Speed Baccarat Z', 30],
  ['salon-priv-baccarat-g-by-evolution-gaming', 'Salon Privé Baccarat G', 65],
  ['korean-prosperity-tree-baccarat-by-evolution-gaming', 'Korean Prosperity Tree Baccarat', 75],
  ['lotus-speed-baccarat-a-by-evolution-gaming', 'Lotus Speed Baccarat A', 39],
  ['salon-priv-baccarat-b-by-evolution-gaming', 'Salon Privé Baccarat B', 20],
  ['salon-priv-baccarat-l-by-evolution-gaming', 'Salon Privé Baccarat L', 43],
  ['japanese-speed-baccarat-b-by-evolution-gaming', 'Japanese Speed Baccarat B', 93],
  ['emperor-speed-baccarat-c-by-evolution-gaming', 'Emperor Speed Baccarat C', 32],
  ['bc-game-korean-super-speed-baccarat-by-evolution-gaming', 'BC.GAME Korean Super Speed Baccarat', 75, 'Exclusive'],
  ['japanese-speed-baccarat-d-by-evolution-gaming', 'Japanese Speed Baccarat D', 22],
  ['hindi-speed-baccarat-b-by-evolution-gaming', 'Hindi Speed Baccarat B', 77],
  ['xxxtreme-lightning-baccarat-by-evolution-gaming', 'XXXtreme Lightning Baccarat', 50],
  ['salon-priv-baccarat-j-by-evolution-gaming', 'Salon Privé Baccarat J', 53],
  ['thai-speed-baccarat-a-by-evolution-gaming', 'Thai Speed Baccarat A', 58],
  ['emperor-speed-baccarat-b-by-evolution-gaming', 'Emperor Speed Baccarat B', 43],
  ['salon-priv-baccarat-f-by-evolution-gaming', 'Salon Privé Baccarat F', 72],
  ['japanese-speed-baccarat-a-by-evolution-gaming', 'Japanese Speed Baccarat A', 33],
  ['japanese-speed-baccarat-e-by-evolution-gaming', 'Japanese Speed Baccarat E', 11],
  ['emperor-golden-wealth-baccarat-by-evolution-gaming', 'Emperor Golden Wealth Baccarat', 33],
  ['japanese-salon-prive-baccarat-by-evolution-gaming', 'Japanese Salon Prive Baccarat', 83],
  ['korean-salon-prive-baccarat-by-evolution-gaming', 'Korean Salon Prive Baccarat', 41],
  ['korean-golden-wealth-baccarat-by-evolution-gaming', 'Korean Golden Wealth Baccarat', 50],
  ['salon-priv-baccarat-i-by-evolution-gaming', 'Salon Privé Baccarat I', 63],
  ['hindi-speed-baccarat-a-by-evolution-gaming', 'Hindi Speed Baccarat A', 56],
  ['peek-baccarat-by-evolution-gaming', 'Peek Baccarat', 100],
  ['japanese-prosperity-tree-baccarat-by-evolution-gaming', 'Japanese Prosperity Tree Baccarat', 77],
  ['first-person-golden-wealth-baccarat-by-evolution-gaming', 'First Person Golden Wealth Baccarat', 79],
  ['golden-baccarat-by-ezugi', 'Golden Baccarat', 75],
  ['elite-vip-speed-baccarat-2-by-evolution-gaming', 'Elite VIP Speed Baccarat 2', 43],
  ['first-person-baccarat-by-evolution-gaming', 'First Person Baccarat', 61],
  ['japanese-lightning-baccarat-by-evolution-gaming', 'Japanese Lightning Baccarat', 77],
  ['first-person-lightning-baccarat-by-evolution-gaming', 'First Person Lightning Baccarat', 76],
  ['elite-vip-speed-baccarat-1-by-evolution-gaming', 'Elite VIP Speed Baccarat 1', 43],
  ['japanese-golden-wealth-baccarat-by-evolution-gaming', 'Japanese Golden Wealth Baccarat', 77],
  ['marina-casino-baccarat-3-by-ezugi', 'Marina Casino Baccarat 3', 76],
  ['golden-baccarat-knockout-by-ezugi', 'Golden Baccarat Knockout', 70],
  ['marina-casino-baccarat-4-by-ezugi', 'Marina Casino Baccarat 4', 66],
  ['fortune-baccarat-by-ezugi', 'Fortune Baccarat', 52],
  ['speed-fortune-baccarat-by-ezugi', 'Speed fortune baccarat', 33],
  ['marina-casino-baccarat-1-by-ezugi', 'Marina Casino Baccarat 1', 75],
  ['marina-casino-baccarat-2-by-ezugi', 'Marina Casino Baccarat 2', 86],
  ['first-person-xxxtreme-lightning-baccarat-by-evolution-gaming', 'First Person XXXtreme Lightning Baccarat', 60],
  ['ez-baccarat-by-ezugi', 'EZ Baccarat', 63],
  ['golden-baccarat-super-six-by-ezugi', 'Golden Baccarat Super Six', 91],
  ['baccarat-deluxe-by-pg-soft', 'Baccarat Deluxe', 95],
  ['first-person-prosperity-tree-baccarat-by-evolution-gaming', 'First Person Prosperity Tree Baccarat', 70],
  ['netent-baccarat-by-netent', 'NetEnt Baccarat', 38],
  ['baccarat-by-funta-gaming', 'Baccarat', 24],
  ['baccarat-by-sexy-gaming', 'Baccarat', 70],
  ['no-commission-speed-baccarat-b-by-evolution-gaming', 'No Commission Speed Baccarat B', 57],
  ['baccarat-pro-2-by-ezugi', 'Baccarat Pro 2', 29],
  ['baccarat-lobby-by-ezugi', 'Baccarat Lobby', 96],
  ['baccarat-pro-1-by-ezugi', 'Baccarat Pro 1', 29],
  ['no-commision-baccarat-by-ezugi', 'No Commision Baccarat', 91],
  ['speed-baccarat-w-by-evolution-gaming', 'Speed Baccarat W', 47],
  ['salsa-baccarat-1-by-ezugi', 'Salsa Baccarat 1', 29],
  ['no-commission-vip-speed-cricket-baccarat-by-ezugi', 'No Commission VIP Speed Cricket Baccarat', 91],
  ['vip-fortune-baccarat-by-ezugi', 'VIP fortune baccarat', 34],
  ['salsa-baccarat-2-by-ezugi', 'Salsa Baccarat 2', 98],
  ['fiesta-baccarat-by-ezugi', 'Fiesta Baccarat', 85],
  ['speed-baccarat-cricket-by-ezugi', 'Speed Baccarat- Cricket', 29],
  ['baccarat-by-evolution-gaming', 'Baccarat', 10],
];

export const BACCARAT_GAMES = ROWS.map(([slug, name, players, badge]) => {
  const parts = slug.split('-by-');
  const suffix = parts.length > 1 ? parts[parts.length - 1].replace(/-\d+$/, '') : '';
  return {
    slug,
    name,
    players,
    badge,
    /* No '-by-' at all means one of BC.GAME's own tables. */
    provider: PROVIDERS[suffix] || 'BC.GAME',
    category: CATEGORY,
    sections: [SECTION],
    tags: [TAG],
  };
});
