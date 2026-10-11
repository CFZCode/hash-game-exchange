/* The signed-in hero carousel's slides.
 *
 * WHERE THESE CAME FROM, and it is two places rather than one.
 *
 * `createBanner-4SczZOe8.js` names the call —
 *
 *   GET /home/main/banner/?bannerType=top&areaCode=…&uid=…&level=…&env=WEB&vip=…
 *
 * — and unlike every other feed in this project it can be ANSWERED: **hash.game serves
 * bc.game's API as well as its assets**, at `hash.game/api/edge/…`. Three of the five rows
 * below are that response's `data`, field for field, taken 2026-08-14.
 *
 * The other two are from the live page's RENDERED DOM, and they are marked. The feed is
 * per-visitor and per-day: with `uid=0&level=0&vip=false` it answers three rows, and varying
 * uid/level/vip does not widen it, so a logged-out request cannot reproduce a logged-in
 * session's list. Both rows are exact — text, `linkUrl` and the CDN hash all read off the
 * markup — but only the fields the card renders are recoverable that way. `bannerId` is not
 * one of them, so those two carry a slug instead and it is only ever used as a React key.
 *
 * ORDER IS THE RENDERED ORDER, which the server decides with `sortNum` (the captured rows
 * carry -999, -100 and -88). The two DOM rows interleave with them, so `sortNum` is not
 * recorded for anything — reordering this array is what would change the strip, not a field.
 *
 * CASING IS THE FEED'S OWN. "SLOTS", "casino", "Sport", "Exclusive"; "hit 100X, Double the
 * WIN"; "Join now" beside "Join Now". Nothing here is normalised, because nothing needs to be:
 * every one of those strings renders through a `uppercase` utility. Do not tidy them.
 *
 * `image` is the basename of the artwork on bc.game's CDN (`imgxcut.com/banner/<hash>.png`),
 * downloaded into `src/assets/banners/` under that same hash, so the field doubles as the local
 * filename with no lookup table — the arrangement `promotions.js` uses. They were fetched at
 * the card's own `?_v=4,dpr=2,width=196` variant, which is 392x352: exactly the `h-44` content
 * box at 2x.
 *
 * bannerType is SENT BUT IGNORED by the server — `bottom`, `middle` and `side` all return the
 * identical payload — so `type` stays a prop on the component rather than a fixture key.
 */
export const TOP_BANNERS = [
  /* FROM RENDERED DOM, not the feed — see above. */
  {
    bannerId: 'hacksaw-multiplier-challenge-0804',
    tagName: 'SLOTS',
    title: 'hit 100X, Double the WIN',
    description: 'Free SPIN & Cash drop',
    buttonContent: 'Join now',
    linkUrl: '/promotion-event/hacksaw-multiplier-challenge-0804',
    image: '37c857bc64',
  },
  {
    bannerId: 2130,
    tagName: 'Sport',
    title: 'Soccer Party ：Bet & Win',
    description: 'Win Up to $500 Soccer Freebet',
    buttonContent: 'Join Now',
    linkUrl: '/promotion-event/soccer-freebet-drop-0720',
    image: '784f6f778b',
  },
  /* FROM RENDERED DOM, not the feed. */
  {
    bannerId: 'nolimit-city-free-spins-soakedbyseamen-0812',
    tagName: 'casino',
    title: 'Free Spins Giveaway',
    description: 'Bet €20 Daily, \nGet 10 Free Spins',
    buttonContent: 'Join Now',
    linkUrl: '/promotion-event/nolimit-city-free-spins-soakedbyseamen-0812',
    image: 'b981572d85',
  },
  {
    bannerId: 2169,
    tagName: 'Exclusive',
    title: 'Free Spins Giveaway',
    description: 'Bet €10 · Get 20 \nFree Spins',
    buttonContent: 'Play Now',
    linkUrl: '/promotion-event/chopchop-freespin-0813',
    image: 'd46603c574',
  },
  {
    bannerId: 2121,
    tagName: 'Exclusive',
    title: "Knockoin's 7-Day Gift",
    description: 'Win up to 120 \nFree Spins',
    buttonContent: 'Join Now',
    linkUrl: '/promotion-event/knockoin-7days-gift-0807',
    image: '9e9ab7e316',
  },
];

/* `pe` in index-t-7F5FAB.js, verbatim — the three hardcoded slides the component pads with when
 * the feed returns fewer than three. Every string is a `t("…")` in the chunk and the artwork is
 * the deploy's own three PNGs, fetched off hash.game and renamed to their basenames.
 *
 * They are NOT rendered today and that is the original's behaviour, not an omission: the gate is
 * `!bcng && !bcke && banners.length < 3`. They are here so that the day the feed thins out the
 * padding is real rather than reinvented.
 *
 * Two conditions on the chunk's own list are dropped rather than modelled. The App slide's
 * `visible: () => !isAPP` is always true in a browser, and its `linkUrl` branches on the
 * `bcmx`/`bcke` deployments to a store listing — this is bc.game's own web deploy, so it is the
 * recall page. Its description likewise branches on whether the app-login bonus is still
 * claimable; the unclaimed string is the one a fresh visitor sees.
 *
 * The chunk also SHUFFLES this list (`[...a].sort(() => Math.random() - .5)`) before taking as
 * many as it needs. Not reproduced: a random order would make the strip differ between reloads,
 * which is the one thing pixel work cannot check.
 */
export const FALLBACK_BANNERS = [
  {
    bannerId: 'static-original',
    tagName: 'Exclusive',
    title: 'Play Original Games',
    description: 'Win Big with Every Wager',
    buttonContent: 'Play Now',
    linkUrl: '/casino/brand',
    image: 'original',
  },
  {
    bannerId: 'static-app',
    tagName: 'Exclusive',
    title: 'Get the App Now And',
    description: 'Claim Up To $100 Exclusive Cashback',
    buttonContent: 'Download',
    linkUrl: '/events/app-download-recall',
    image: 'app',
  },
  {
    bannerId: 'static-vip',
    tagName: 'VIP Exclusive',
    title: 'Join the VIP Club',
    description: 'Experience Premium VIP Rewards',
    buttonContent: 'Join Now',
    linkUrl: '/vip',
    image: 'vip',
  },
];
