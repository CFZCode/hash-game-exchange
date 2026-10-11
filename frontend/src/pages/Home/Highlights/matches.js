/* The three Highlights matches.
 *
 * Unlike every other section on this page, there is NO captured response for this one —
 * the mirror saved `platform-sports/.../provider/support/` but not the sportsbook's
 * top-events feed, and the component that renders it (`index-BtKBYw3-.js`) was lazy-loaded
 * and never written to disk either. The markup below is reconstructed from
 * `Com-8gtZ7Cmm.js`, which is in the mirror, and the data is transcribed from the live
 * page: three real fixtures, two upcoming and one in play.
 *
 * Badges follow the original's own fallback chain (`Qe` -> `ee` -> `Je`): a competitor
 * image if betby has one, otherwise the country flag, otherwise the sport icon. The four
 * football clubs fall to their flags here because their crests live at
 * `d1bvoel1nv172p.cloudfront.net/competitors/images/normal/medium/<id>.png` and that id is
 * an internal betby key that is not in the mirror or derivable from anything that is. Drop
 * a crest into src/assets/sports and set `image` on the competitor to switch one over.
 */
const flags = import.meta.glob('../../../assets/sports/flag-*.svg', {
  eager: true,
  import: 'default',
});

/* ISO-3, not ISO-2 — the flag host 404s on `us.svg` and serves `USA.svg`. */
export const flagFor = (code) => flags[`../../../assets/sports/flag-${code}.svg`];

export const matches = [
  {
    id: 'ucl-sparta-lyon',
    live: false,
    sport: 'soccer',
    category: 'International',
    tournament: 'UEFA Champions League, Qualification',
    home: { name: 'Sparta Prague', countryCode: 'CZE' },
    away: { name: 'Olympique Lyon', countryCode: 'FRA' },
    time: '11:30 PM',
    date: '08/04/2026',
    marketName: '1x2',
    outcomes: [
      { name: '1', value: '3.25' },
      { name: 'Draw', value: '3.50' },
      { name: '2', value: '2.02' },
    ],
    moreMarkets: 12,
  },
  {
    id: 'atp-fritz-jodar',
    live: false,
    sport: 'tennis',
    category: 'ATP',
    tournament: 'ATP Washington, USA',
    home: { name: 'Fritz, Taylor', countryCode: 'USA' },
    away: { name: 'Jodar, Rafael', countryCode: 'ESP' },
    time: '10:30 PM',
    date: '08/03/2026',
    marketName: 'Winner',
    outcomes: [
      { name: '1', value: '1.54' },
      { name: '2', value: '2.36' },
    ],
    moreMarkets: 19,
  },
  {
    id: 'ucl-psg-bayern',
    live: true,
    sport: 'soccer',
    category: 'International',
    tournament: 'Champions League',
    home: { name: 'Paris SG', countryCode: 'FRA' },
    away: { name: 'Bayern', countryCode: 'DEU' },
    /* A live card swaps the kickoff time and date for the score and the period. */
    homeScore: 0,
    awayScore: 0,
    status: '1st half',
    marketName: '1x2',
    outcomes: [
      { name: '1', value: '2.30' },
      { name: 'Draw', value: '2.55' },
      { name: '2', value: '3.60' },
    ],
    moreMarkets: 19,
  },
];

export default matches;
