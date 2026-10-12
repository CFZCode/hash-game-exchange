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
  {
    title: 'Casino',
    links: [
      { label: 'Casino Home', href: '/casino' },
      { label: 'Slots', href: '/gamelist/slots' },
      { label: 'Live Casino', href: '/gamelist/live' },
      { label: 'New Releases', href: '/section/new' },
      { label: 'Recommended', href: '/section/hot_games?label=Recommended' },
      { label: 'Table Game', href: '/section/table_games' },
      { label: 'BlackJack', href: '/section/blackjack' },
      { label: 'Roulette', href: '/tagname/roulette' },
      { label: 'Baccarat', href: '/tagname/baccarat' },
    ],
  },
  {
    title: 'Sports',
    links: [
      { label: 'Sports Home', href: '/sports' },
      { label: 'Live', href: '/sports/live' },
      { label: 'Rules', href: '/help/terms-sports' },
      { label: 'Sport Betting Insights', href: 'https://betting.bc.game/', external: true },
    ],
  },
  {
    title: 'Promo',
    links: [
      { label: 'VIP Club', href: '/vip' },
      { label: 'Referral', href: '/referral' },
      { label: 'Promotions', href: '/promotions/promotion' },
      { label: 'Lottery', href: '/lottery' },
      /* A button (it opens the share dialog, not a page), but it belongs to the referral
         section — the `href` is read only by the footer's gate filter, so an account or site
         with affiliate off does not get the entry. */
      { label: 'Refer a friend', button: true, href: '/referral' },
    ],
  },
  {
    title: 'Support/Legal',
    links: [
      { label: 'Licenses', href: '/licenses' },
      { label: 'Help Center', href: '/help' },
      { label: 'Gamble Aware', href: '/help/gameble-aware' },
      { label: 'Fairness', href: '/help/provably-fair' },
      { label: 'FAQ', href: '/help/faq' },
      { label: 'Privacy Policy', href: '/help/privacy' },
      { label: 'Terms Of Service', href: '/help/terms-service' },
      { label: 'Law Enforcement', href: '/help/law-enforcement' },
      { label: 'Responsible Gambling', href: '/responsible/faq' },
      { label: 'AML', href: '/help/aml' },
      {
        label: 'Design Resources',
        href: 'https://drive.google.com/drive/folders/1Q48CUgrJOAeDGpBqmdHGNwWGxNEdTZzQ',
        external: true,
      },
      { label: 'Live Support', button: true },
    ],
  },
  {
    title: 'About Us',
    links: [
      { label: 'News', href: 'https://blog.bc.game/', external: true },
      { label: 'Business Contacts', button: true },
      { label: 'Help Desk', href: 'https://help.bc.support/en/', external: true },
      { label: 'Verify Representative', href: '/verify_representative' },
      { label: 'Verify This Site', button: true },
    ],
  },
];

/* The two prose blocks that open the footer, on the home page only — see `BLURB_SHOWN_ON` in
   index.jsx. Kept as data so the markup stays readable: they are the longest strings on the
   page by a wide margin. */
export const SEO = {
  title: 'Crypto Online Casino',
  paragraphs: [
    'Explore 1000+ slots, live dealer tables, crash and original games, plus full sports betting with pre-match and in-play odds. Instant deposits, low fees, fast withdrawals.',
    'Our provably fair systems and audited RNG protect every bet. One wallet across casino and sportsbook keeps things simple, and our mobile-ready site lets you play anywhere. New players can claim welcome bonuses and ongoing cashback. Need help? 24/7 support has you covered. Simple, secure, and built for real-money crypto gaming',
  ],
};

export const FEEDBACK = {
  title: 'Help us improve your experience',
  intro: 'Get rewarded for your valuable feedback!',
  email: 'feedback@bcgame.com',
  security:
    'If you find any vulnerabilities or leaks, please contact us (security-related issues only; non-related issues will be omitted).',
  securityEmail: 'security@bcgame.com',
};

export const LEGAL = {
  brand: [
    'The ultimate crypto gaming destination, trusted by millions worldwide. We bring bold entertainment, cutting-edge experiences, and a thriving community together for non-stop thrills. Play, win, and stay untamed.',
    'Your use of and access to BC.GAME signifies that you fully understand and agree to be legally bound by the contents of our Terms of Service and Responsible Gaming Policy',
    'Crypto trading is not gambling by definition, therefore it is not covered by our gaming license.',
  ],
  licence: [
    'BC.GAME is operated by Twocent Technology Limited, a limited liability company registered in Belize with company registration number 41939, with registered address at Sea Urchin Street #2, San Pedro, Ambergris Caye, Belize. BC.GAME is licensed and regulated by the Government of the Autonomous Island of Anjouan, Union of Comoros and operates under License No. ALSI-202410011-FI1.',
    'BC.GAME is duly licensed and authorised to provide online gaming and betting services within the scope of, and subject to the terms, conditions, restrictions and regulatory requirements applicable to its license.',
  ],
  /* Year and rate are live values on the real site; fixed here, as the contest data is. */
  copyright: 'Copyright ©2026 Twocent Technology Limited ALL RIGHTS RESERVED. 1BTC=$63,638.38',
};
