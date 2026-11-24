import { LIVE_SUPPORT_AVAILABLE } from '../../../services/availability';

/* The footer's five link columns, from the live footer's own DOM.
 *
 * `footer-jnUVITid.js` is named in `Enter-MsmOuq5R.js`'s __vite__mapDeps table but was never
 * saved into the mirror, so these were transcribed from the rendered markup instead of the
 * chunk. hrefs are the real ones — several are not the routes you would guess (`/vip` not
 * `/vip-club`, `/responsible/faq` for Responsible Gambling, `/help/gameble-aware` with the
 * original's own typo).
 *
 * `external: true` adds the arrow-in-a-box and opens in a new tab. `button: true` marks the
 * four entries the original renders as <button> rather than <a> — they open dialogs or
 * widgets rather than navigating, so they carry no href at all.
 */

export const COLUMNS = [
  /* Parker567's footer columns (user's screenshot), in the Jack55 panel. The Casino links open
     the casino page's own tabs, so each one lands on the same API-fed section the body shows
     (services/catalog.js): Recommended is the Hot Games collection. A link whose section is
     switched off is dropped by the route gate in index.jsx, and a column left empty goes too. */
  {
    title: 'Casino',
    links: [
      { label: 'Casino Home', href: '/casino' },
      { label: 'Slots', href: '/casino/slots' },
      { label: 'Live Casino', href: '/casino/live' },
      { label: 'New Releases', href: '/casino/new' },
      { label: 'Recommended', href: '/casino/hot' },
      { label: 'Table Game', href: '/casino/table-game' },
      { label: 'BlackJack', href: '/casino/blackjack' },
      { label: 'Roulette', href: '/casino/roulette' },
      { label: 'Baccarat', href: '/casino/baccarat' },
    ],
  },
  {
    title: 'Sports',
    links: [
      { label: 'Sports Home', href: '/sports' },
      { label: 'Live', href: '/sports/live' },
      { label: 'Rules', href: '/help/terms-sports' },
    ],
  },
  {
    title: 'Promo',
    links: [
      { label: 'VIP Club', href: '/vip' },
      { label: 'Referral', href: '/referral' },
      { label: 'Promotions', href: '/promotions/promotion' },
      { label: 'Refer a friend', href: '/referral' },
    ],
  },
  {
    title: 'Support/Legal',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Gamble Aware', href: '/help/gameble-aware' },
      { label: 'Fairness', href: '/help/provably-fair' },
      { label: 'FAQ', href: '/help/faq' },
      { label: 'Privacy Policy', href: '/help/privacy' },
      { label: 'Terms Of Service', href: '/help/terms-service' },
      { label: 'Law Enforcement', href: '/help/law-enforcement' },
      { label: 'Responsible Gambling', href: '/responsible/faq' },
      { label: 'AML', href: '/help/aml' },
      ...(LIVE_SUPPORT_AVAILABLE ? [{ label: 'Live Support', button: true }] : []),
    ],
  },
  /* Only with the owner's `blog` feature on (route gate), as in Parker567. */
  {
    title: 'About Us',
    links: [{ label: 'News', href: '/blog' }],
  },
];

/* The two prose blocks that open the footer, on the home page only — see `BLURB_SHOWN_ON` in
   index.jsx. Kept as data so the markup stays readable: they are the longest strings on the
   page by a wide margin. */
export const SEO = {
  title: 'Crypto Online Casino',
  paragraphs: [
    'Explore 1000+ slots, live dealer tables, crash and original games, plus full sports betting with pre-match and in-play odds. Instant deposits, low fees, fast withdrawals.',
    'Our provably fair systems and audited RNG protect every bet. One wallet across casino and sports keeps things simple, and our mobile-ready site lets you play anywhere. New players can claim welcome bonuses and ongoing cashback. Need help? 24/7 support has you covered. Simple, secure, and built for real-money crypto gaming',
  ],
};

/* The original's feedback band listed BC.GAME's own mailboxes (feedback@ / security@bcgame.com);
   Parker567 publishes none, so the band is not drawn (see index.jsx). */

/* The legal band. `brand` is the site's printed name (services/siteBranding `brandName()`), so
   no operator's name is baked in here. BC.GAME's operator/licence paragraphs (Twocent
   Technology Limited, Anjouan licence ALSI-202410011-FI1) are NOT Parker567's and are gone. */
export const legal = (brand) => ({
  brand: [
    'The ultimate crypto gaming destination. We bring bold entertainment, cutting-edge experiences, and a thriving community together for non-stop thrills. Play, win, and stay untamed.',
    `Your use of and access to ${brand} signifies that you fully understand and agree to be legally bound by the contents of our Terms of Service and Responsible Gaming Policy.`,
  ],
  licence: [
    'Crypto trading is not gambling by definition, therefore it is not covered by our gaming license.',
    'Gambling can be addictive. Please play responsibly — 18+ only.',
  ],
  copyright: `Copyright ©${new Date().getFullYear()} ${brand}. ALL RIGHTS RESERVED.`,
});

/* The Jack55 footer's social row (X, Discord, Telegram, Instagram). The site has no channel URLs
   yet, so each `href` is empty and the icon renders as a non-navigating button; put the real
   link in its `href` and it becomes an outbound link. */
export const SOCIALS = [
  { key: 'x', label: 'X', href: '' },
  { key: 'discord', label: 'Discord', href: '' },
  { key: 'telegram', label: 'Telegram', href: '' },
  { key: 'instagram', label: 'Instagram', href: '' },
];
