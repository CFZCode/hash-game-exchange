/* The Burst Games tab, transcribed from the live page's own rendered grid.
 *
 * COMPLETE: 39 games, no pager on the live page.
 *
 * This is the house-games tab — Crash, Plinko, Mines, Limbo, Hi-Lo, Wheel and the rest — and
 * it is the one place where the same title appears repeatedly from different studios: Plinko
 * ships from Platipus and Hacksaw, Mines from Hacksaw and InOut, Crash from BC.GAME and
 * InOut, Limbo from Hacksaw and InOut. Same name, different slug, different provider.
 *
 * Crash's 2183 concurrent players is the largest figure anywhere in this build, and it is
 * read off the page as-is: the runner-up on this tab is 100.
 *
 * One slug is malformed at the source: `-oinflip-by-inout`, whose name renders as "Сoinflip"
 * with a Cyrillic С. The site lost the leading C when it slugified the Cyrillic character.
 * Kept verbatim — its artwork file is named to match, so "fixing" it would break the lookup. */

const CATEGORY = 'Burst';
const SECTION = 'burst_games';
const TAG = 'Burst Games';

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
  ['crash', 'Crash', 2183],
  ['plinko-by-platipus', 'Plinko', 100],
  ['mines-by-hacksaw', 'Mines', 11],
  ['diver-by-inout', 'Diver', 11],
  ['wheel-by-hacksaw', 'Wheel', 59],
  ['limbo-by-hacksaw', 'Limbo', 72],
  ['aviafly-by-inout', 'AviaFly', 82],
  ['mines-by-inout', 'Mines', 60],
  ['plinko-by-hacksaw', 'Plinko', 62],
  ['crash-by-inout', 'Crash', 32],
  ['chicken-road-race-by-inout', 'Chicken Road Race', 61],
  ['cryptos-by-inout', 'Cryptos', 11],
  ['10000-x-rush-by-platipus', '10000 x Rush', 22],
  ['football-tap-by-onlyplay', 'Football tap', 61],
  ['lines-by-hacksaw', 'Lines', 69],
  ['air-boss-by-platipus', 'Air Boss', 99],
  ['hi-lo-by-hacksaw', 'Hi-Lo', 70],
  ['chicky-run-by-pg-soft', 'Chicky Run', 35],
  ['twist-x-mas-by-inout', 'Twist X-mas', 47],
  ['coins-by-hacksaw', 'Coins', 16],
  ['sugardaddy-by-inout', 'SugarDaddy', 49],
  ['speed-crash-by-hacksaw', 'Speed Crash', 60],
  ['5000-x-rush-by-platipus', '5000 x Rush', 52],
  ['-oinflip-by-inout', 'Сoinflip', 82],
  ['2500-x-rush-by-platipus', '2500 x Rush', 13],
  ['limbo-by-inout', 'Limbo', 13],
  ['double-online-by-inout', 'Double Online', 16],
  ['lucky-coin-by-onlyplay', 'Lucky Coin', 74],
  ['tap-the-pot-by-platipus', 'Tap The Pot', 37],
  ['gold-of-baboon-by-onlyplay', 'Gold of Baboon', 24],
  ['cricket-road-by-inout', 'Cricket Road', 51],
  ['twenty-one-by-hacksaw', 'TWENTY-ONE', 69],
  ['ballonix-by-inout', 'BalloniX', 100],
  ['boxes-by-hacksaw', 'Boxes', 26],
  ['1000-x-rush-by-platipus', '1000 x Rush', 45],
  ['blocks-by-hacksaw', 'Blocks', 62],
  ['golden-clover-by-onlyplay', 'Golden Clover', 94],
  ['bubbles-by-inout', 'Bubbles', 70],
  ['colors-by-hacksaw', 'COLORS', 69],
];

export const CRASH_GAMES = ROWS.map(([slug, name, players, badge]) => {
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
