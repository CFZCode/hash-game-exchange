/* The New Releases tab, transcribed from the live page's own rendered grid.
 *
 * This one closes a hole that was documented rather than filled. The mirror never captured
 * the site's `new` selection — bc.game/bc.game/api holds the home page's ten feeds and none
 * of them is this one — so both this tab and the Explore panel's New Releases tab rendered
 * the site's empty state. They no longer have to.
 *
 * COMPLETE: 39 games, and the live page draws no pager at all beneath them.
 *
 * Only the first row carries the red New badge, which is the site's own inconsistency — the
 * other 38 are on a tab called New Releases and are not individually flagged. Nothing renders
 * badges today (GameTile has no slot for one; on the live site they are `explore-show hidden`
 * and only surface inside the Explore panel), so the field is carried, not drawn.
 *
 * CATEGORY is 'Slots' because that is what all but a handful of these are; the tab is a
 * recency cut across the catalogue, not a category, so the tag is what actually places it. */

const CATEGORY = 'Slots';
const SECTION = 'new';
const TAG = 'New Releases';

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
  ['knockoin-by-croco-gaming', 'Knockoin', 70, 'New'],
  ['circle-of-life-by-hacksaw', 'Circle of Life', 56],
  ['3-gods-unleashed-hold-win-by-penguin-king', '3 Gods Unleashed: Hold & Win', 32],
  ['jingle-bells-bonanza-2-by-red-tiger', 'Jingle Bells Bonanza 2', 44],
  ['polar-buffalo-extreme-hold-and-win-25-000-by-booming', 'Polar Buffalo Extreme Hold and Win 25,000', 25],
  ['dead-man-s-gold-hold-win-by-penguin-king', 'Dead Man\'s Gold: Hold & Win', 46],
  ['army-of-ares-by-hacksaw', 'Army of Ares', 72],
  ['j-mania-triple-jam-by-ruby-play', 'J Mania Triple Jam', 56],
  ['wild-hot-40-hold-win-by-fazi', 'Wild Hot 40 Hold & Win', 96],
  ['train-of-gold-x-mas-hold-win-by-onlyplay', 'Train of Gold X-Mas: Hold & Win', 100],
  ['festive-emerald-by-bf-games', 'Festive Emerald', 68],
  ['3-big-barrels-elfin-rich-by-ruby-play', '3 Big Barrels Elfin\' Rich', 68],
  ['tut-s-legacy-by-platipus', 'Tut\'s Legacy', 75],
  ['santa-yetti-by-tom-horn-gaming', 'Santa Yetti', 49],
  ['foxy-heist-by-pegasus', 'Foxy Heist', 77],
  ['taxi-rush-by-fazi', 'Taxi Rush', 37],
  ['twist-x-mas-by-inout', 'Twist X-mas', 46],
  ['fighting-bull-by-advantplay', 'Fighting Bull', 100],
  ['dead-headz-by-hacksaw', 'Dead Headz', 56],
  ['fortune-boy-by-pegasus', 'Fortune Boy', 67],
  ['coin-storm-x-mas-by-onlyplay', 'Coin Storm X-Mas', 64],
  ['crack-more-piggy-banks-by-penguin-king', 'Crack More Piggy Banks', 16],
  ['sphinx-treasure-by-avatarux', 'Sphinx Treasure', 55],
  ['64-presents-hold-and-win-by-booming', '64 Presents Hold and Win', 85],
  ['le-santa-by-hacksaw', 'Le Santa', 39],
  ['poker-win-2-by-fa-chai', 'POKER WIN 2', 20],
  ['1st-cricket-league-by-amigo-gaming', '1st Cricket League', 65],
  ['bubble-shooter', 'Bubble Shooter', 98],
  ['goblingold-by-pegasus', 'GoblinGold', 75],
  ['cat-mouse-by-advantplay', 'Cat & Mouse', 61],
  ['lady-monopz-by-popok-gaming', 'Lady Monopz', 10],
  ['infernal-fury-by-habanero', 'Infernal Fury', 41],
  ['esqueleto-explosivo-feliz-navidead-by-thunderkick', 'Esqueleto Explosivo Feliz Navidead', 29],
  ['goldtoad-by-pegasus', 'GoldToad', 75],
  ['echnaton-gold-by-popiplay', 'Echnaton Gold', 45],
  ['miss-candy-s-sweet-escape-by-hacksaw', 'Miss Candy\'s Sweet Escape', 35],
  ['3-lucky-bao-by-onlyplay', '3 Lucky Bao', 81],
  ['ping-pong-panda-by-spadegaming', 'Ping Pong Panda', 55],
  ['white-rabbit-2-by-big-time-gaming', 'White Rabbit 2', 21],
];

export const NEW_GAMES = ROWS.map(([slug, name, players, badge]) => {
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
