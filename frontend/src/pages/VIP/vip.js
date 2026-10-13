/* The VIP Club page's content model — `/vip-detail`.
 *
 * PROVENANCE. Unusually for this project, none of this is a screenshot reading: the page's
 * chunk, `index-DLlkBGhd.js`, was recovered from the live deploy and every string below is a
 * verbatim `t("…")` argument out of it. Its asset module, `index-BGw8Rzb9.js`, named the
 * images. See services/vip.js for how the chunk was obtained — the method generalises and is
 * worth reading before the next missing-chunk page.
 *
 * `__ENV_HOST__` / `__ENV_SITE__` are the original's own placeholders, substituted by its
 * translation layer, and they are NOT the same string — the captures settle it. `__ENV_HOST__`
 * is the full host name, `BC.GAME` ("What makes the BC.GAME VIP Club different from others?");
 * `__ENV_SITE__` is the short name, `BC` ("Only BC Defines True VIP"). Both are expanded below,
 * and the raw form is kept in the comments so a future search for either token finds this file.
 *
 * TRAILING SPACES ARE THE ORIGINAL'S. `"Top Player Bonuses "` and `"No Barriers "` both carry
 * one in the chunk, and the captured DOM carries it through. Do not trim them — they are
 * inside the element, so they change nothing visually, and matching the source exactly is what
 * makes a future diff against a newer chunk readable.
 */
import { brandName } from '../../services/siteBranding';

/* ------------------------------------------------------------------------------- artwork
 *
 * Keyed by the chunk's own asset-map names (`f.loseback`, `f.coinLeft`, …) so a row here reads
 * against the chunk one-to-one. The files are the deploy's own PNGs with the content hash
 * stripped, which is what lets these names double as basenames with no lookup table — the same
 * trick the promotions art uses. `banner_bg_w` and `banner_bg_m_w` are the LIGHT-theme
 * backgrounds; this build is dark-only and they are deliberately not fetched. */
export const ART = [
  'banner_bg',
  'banner_bg_m',
  'banner',
  'banner_m',
  'coin-left',
  'coin-right',
  'loseback',
  'reload',
  'bonus',
  'top',
  'fee',
  'rewards',
  'host',
  'more',
  'activity',
  'loyalty',
  'no',
  'poster',
];

/* --------------------------------------------------------------------------------- hero */
export const HERO = {
  /* `.toUpperCase()` in the chunk, not an uppercase source string — the class list also
     carries `uppercase`, so the transform is applied twice on the live site. Stored in the
     chunk's own sentence case and left to the CSS, which is the half that survives
     translation. */
  eyebrow: 'Exclusive Rewards',
  title: 'Elite VIP Experience',
  blurb: 'Instant withdrawal on all VIP rewards, reserved for our elite members.',
  /* Signed-out only. `/login/regist` is the auth dialog's Sign Up route, which this build
     already answers. */
  cta: { label: 'Join Now', href: '/login/regist' },
};

/* ------------------------------------------------------------------------------ transfer
 *
 * Signed-out only, the same gate as the hero button. `href` is `Vh()` in Enter-MsmOuq5R.js:
 * the CIS-language variant appends `/cis`, and since this build has no language switch the
 * base path is the one used. The original opens it in a new tab off `location.origin`. */
export const TRANSFER = {
  /* "Only __ENV_SITE__ Defines " — `__ENV_SITE__` is the SHORT name, "BC", not the host. The
     trailing space is the original's. */
  lead: `Only ${brandName()} Defines `,
  accent: 'True VIP',
  blurb: 'Have VIP status elsewhere? Transfer it and unlock premium perks instantly.',
  cta: { label: 'Start VIP Transfer Now →', href: '/events/viptransfer-survey' },
};

/* The promo film. Remote on purpose: it is the one asset on this page the original itself
   serves from a CDN rather than from its own /assets, the CDN is reachable from here, and a
   40-second MP4 is not something to vendor into src/. The poster IS local — it is an
   origin-hosted /assets file like the rest. */
export const VIDEO = {
  src: 'https://img2.distributedresourcestorage.com/video/OP177_Kelly_Promo_EN_H_20251218_B.mp4',
  type: 'video/mp4',
  poster: 'poster',
};

/* ---------------------------------------------------------------------------- the perks */
export const REWARDS = {
  lead: 'Experience',
  accent: 'Premium VIP Rewards',
};

export const PERKS = [
  {
    icon: 'loseback',
    title: 'Instant Lossback',
    desc: 'Earn rewards back instantly as you play',
  },
  {
    icon: 'reload',
    title: 'Reload Bonuses',
    desc: 'Receive rewards every day - the more you play, the higher you get.',
  },
  {
    icon: 'bonus',
    title: 'Gameplay Bonuses',
    desc: 'Play across different game types to unlock richer rewards',
  },
  {
    icon: 'top',
    title: 'Top Player Bonuses ',
    desc: 'Play at the top to unlock exclusive rewards.',
  },
  {
    icon: 'fee',
    title: 'Fee-Free D & W',
    desc: 'All deposits and withdrawals are fee-free, fiat and crypto.',
  },
  {
    icon: 'rewards',
    title: 'IRL VIP Events & Rewards',
    desc: 'Exclusive real-world VIP experiences',
  },
  {
    icon: 'host',
    title: 'Dedicated VIP Host',
    desc: 'Personalized support whenever you need it',
  },
];

/* The eighth cell of the perk grid. Not a perk card — it is a two-column teaser that spans
   `sm:col-span-2`, which is what fills the row the seven cards leave short. */
export const MORE = {
  icon: 'more',
  lines: ['More perks are coming...', 'Your VIP journey keeps getting better'],
};

/* --------------------------------------------------------------------------- qualifying */
export const ACCESS = {
  lead: 'Play and Engage for',
  accent: 'VIP Access',
};

export const ENGAGE = [
  {
    icon: 'activity',
    title: 'Activity',
    desc: 'Consistent and responsible gameplay helps you stand out as a valued player.',
  },
  {
    icon: 'loyalty',
    title: 'Loyalty',
    desc: 'Stable and ongoing loyalty increases your chance of unlocking VIP service.',
  },
  {
    icon: 'no',
    title: 'No Barriers ',
    desc: 'No level or specific game requirements - every player has the opportunity to qualify for VIP.',
  },
];

/* ---------------------------------------------------------------------------------- FAQ
 *
 * THREE ROWS, TWO TABS. The rail looks like a three-way switch and is not: "Terms Of Service"
 * is `window.open("/help/terms-service", "_blank")` in the chunk — it opens a page and never
 * selects, so it never takes the `bg-layer5` pill. Only General and Benefits swap the
 * accordion. That is why `kind` is on each row rather than inferred from position.
 *
 * The accordion itself is the shared primitive's SINGLE mode (`ck`'s default is
 * `bh.Single`, and this call site passes no `multiple`), so opening one row closes the last.
 */
export const FAQ_TITLE = 'Frequently Asked Questions';

export const FAQ_TABS = [
  {
    id: 'general',
    kind: 'tab',
    label: 'General',
    items: [
      {
        question: 'How do I become a VIP?',
        answer:
          "Becoming a VIP at " + brandName() + " is by invitation only. Our VIP team is constantly reviewing players' activity, and as soon as you meet the requirements, you will receive an invitation to join.",
      },
      {
        question: 'What is the VIP Transfer?',
        answer:
          'VIP Transfer is a unique feature that allows you to transfer your VIP Status to ' + brandName() + ' and receive all the benefits of the VIP Club instantly once the requirements of the program are fulfilled.',
      },
      {
        question: 'What makes the ' + brandName() + ' VIP Club different from others?',
        answer:
          'We are committed to delivering a premium experience tailored to each member. Our dedicated VIP team provides personalized support, exclusive promotions, and benefits curated to match your preferences. Transparency, integrity, and attention to detail are at the core of our program. As a VIP, you can expect fast responses, exceptional service, and a level of care that goes beyond standard support.',
      },
    ],
  },
  {
    id: 'benefits',
    kind: 'tab',
    label: 'Benefits',
    items: [
      {
        question: 'What is Reload Bonus?',
        answer:
          'A signature ongoing reward available to active VIP players. Maintain consistent gameplay on the platform and simply reach out to your host to claim it.',
      },
      {
        question: 'What is TopPlay Bonus?',
        answer:
          'A once-per-month reward dedicated to our most esteemed players with exceptional engagement and loyalty.',
      },
      {
        question: 'What is GamePlay Bonus?',
        answer:
          "A surprise bonus granted at random intervals. Exclusively for VIP members, it's a way for us to thank you with unexpected rewards based on your activity and participation.",
      },
    ],
  },
  {
    id: 'terms',
    kind: 'link',
    label: 'Terms Of Service',
    href: '/help/terms-service',
  },
];
