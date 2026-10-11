/* The Feature Buy-in tab, transcribed from the live page's own rendered grid.
 *
 * COMPLETE, and genuinely tiny: 9 games, no pager. This is the shortest tab on the casino
 * page — buying into a bonus round is a feature only some studios ship, so the cut is narrow
 * by nature rather than by truncation.
 *
 * It introduces a third badge colour. The three Croco titles are Exclusive (green, as on the
 * other tabs); the other six carry "Bonus Buy" on `bg-warning`, which appears nowhere else in
 * the build. As with every badge here it is carried in the data and not drawn — see the note
 * in newGames.js. */

const CATEGORY = 'Slots';
const SECTION = 'feature_buyin';
const TAG = 'Feature buy-in';

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
  ['candy-fiesta-1000-by-croco-gaming', 'Candy Fiesta 1000', 83, 'Exclusive'],
  ['sea-of-olympus-1000-by-croco-gaming', 'Sea of Olympus 1000', 63, 'Exclusive'],
  ['sugar-fiesta-1000-by-croco-gaming', 'Sugar Fiesta 1000', 23, 'Exclusive'],
  ['tikipop-spooky-temples-by-avatarux', 'TikiPop Spooky Temples', 26, 'Bonus Buy'],
  ['poker-ways-by-spadegaming', 'Poker Ways', 36, 'Bonus Buy'],
  ['book-of-doom', 'Book of Doom', 43, 'Belatra Games'],
  ['vampire-s-fate-by-habanero', 'Vampire\'s Fate', 61, 'Bonus Buy'],
  ['space-wars-2-powerpoints-by-netent', 'Space Wars 2 Powerpoints', 68, 'Bonus Buy'],
  ['alien-hunter-by-spadegaming', 'Alien Hunter', 46, 'Bonus Buy'],
  ['stack-em-scratch-by-hacksaw', 'Stack\'em Scratch', 35, 'Bonus Buy'],
  ['buy-bonus-of-maya', 'buyBonus of Maya', 64, 'Belatra Games']
];

export const FEATURE_BUY_GAMES = ROWS.map(([slug, name, players, badge]) => {
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
