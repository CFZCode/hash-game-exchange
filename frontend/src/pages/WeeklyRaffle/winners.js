/* The weekly raffle's captured payloads — the winner list for draw 20260810120000 and the
 * header's ticket ticker. Both transcribed from the live page's rendered markup, so the
 * player names and the avatar ids are the site's own.
 *
 * `avatarId` is the id the markup puts in the CDN path
 * (`//img2.distributedresourcestorage.com/avatar/<id>/s`). It resolves to a local file
 * through `avatars.js` — see the note there for why that indirection exists.
 *
 * Page 1 of 8 — twenty rows, the page's own page size. Only that page was captured, so
 * `services/raffle.js` serves these for page 1 and an empty list for 2..8.
 *
 * PRIZES ARE A LADDER, not per-winner values: 1st 5,000, 2nd 3,500, 3rd 2,000, 4th 1,500,
 * 5th 1,000, 6th-10th 500, 11th-20th 100, all USD. Stored per row anyway because that is
 * how the response would carry them, and because the ladder is only inferable from a full
 * page — the rule is printed nowhere on the page.
 */
export const WINNERS = [
  { rank: 1, player: 'Jai sawariya ji', avatarId: 6911253, ticket: '14001994', prize: 5000 },
  { rank: 2, player: 'Suba€€€', avatarId: 5726897, ticket: '97002463', prize: 3500 },
  { rank: 3, player: 'mohsinejaz1', avatarId: 105800155, ticket: '34000118', prize: 2000 },
  { rank: 4, player: 'BestEagle7', avatarId: 105975904, ticket: '52001882', prize: 1500 },
  { rank: 5, player: 'Shan143', avatarId: 3719246, ticket: '74002680', prize: 1000 },
  { rank: 6, player: 'loverguy', avatarId: 59963810, ticket: '74000992', prize: 500 },
  { rank: 7, player: 'dollarmanny08', avatarId: 105522617, ticket: '62000850', prize: 500 },
  { rank: 8, player: 'Vqerdfpntucc', avatarId: 72609973, ticket: '58003814', prize: 500 },
  { rank: 9, player: 'Ajay kabadilal', avatarId: 31394873, ticket: '38003974', prize: 500 },
  { rank: 10, player: '2pdocpx', avatarId: 936017414200159, ticket: '64001427', prize: 500 },
  { rank: 11, player: 'Gotrice', avatarId: 6943417, ticket: '90000452', prize: 100 },
  { rank: 12, player: 'Intermittent', avatarId: 17174407, ticket: '72003281', prize: 100 },
  { rank: 13, player: 'Vinztrades', avatarId: 50503575, ticket: '23001964', prize: 100 },
  { rank: 14, player: 'Euoifetnxtac', avatarId: 60941193, ticket: '53001085', prize: 100 },
  { rank: 15, player: 'Nasus1Kstacks', avatarId: 935656450159844, ticket: '19000881', prize: 100 },
  { rank: 16, player: 'jejere', avatarId: 99928686, ticket: '84002873', prize: 100 },
  { rank: 17, player: 'aldistonk', avatarId: 6776555, ticket: '79004186', prize: 100 },
  { rank: 18, player: 'Prize Melisa', avatarId: 1318745, ticket: '15003603', prize: 100 },
  { rank: 19, player: 'MISTIK Vx', avatarId: 22789557, ticket: '94000086', prize: 100 },
  { rank: 20, player: 'user2000202604', avatarId: 106135213, ticket: '72003682', prize: 100 },
];

/* The header's ticker — the site runs these as a vertical carousel in a 16px window
   (`.carousels-enter-wrap .carousels { height: 16px }`), one entry at a time. All thirty
   slides are in the captured markup, repeats included: Sethsawariya1000 appears twice in a
   row and Ira339 three times, which is the feed reporting three separate tickets rather
   than a rendering bug. Every entry in the capture is for one ticket. */
export const TICKER = [
  { player: 'Sethsawariya1000', avatarId: 105248001, tickets: 1 },
  { player: 'Sethsawariya1000', avatarId: 105248001, tickets: 1 },
  { player: 'Jfpnqfqxvvcc', avatarId: 78574614, tickets: 1 },
  { player: 'Djjj', avatarId: 26588303, tickets: 1 },
  { player: 'Knzenbltroac', avatarId: 29570407, tickets: 1 },
  { player: 'snz8', avatarId: 27502995, tickets: 1 },
  { player: 'KAL', avatarId: 17135625, tickets: 1 },
  { player: 'Ira339', avatarId: 3338507, tickets: 1 },
  { player: 'Ira339', avatarId: 3338507, tickets: 1 },
  { player: 'Ira339', avatarId: 3338507, tickets: 1 },
  { player: 'Igoitpnjoyb', avatarId: 22565662, tickets: 1 },
  { player: 'Lului123', avatarId: 102053799, tickets: 1 },
  { player: '5 lakh', avatarId: 26992119, tickets: 1 },
  { player: 'Miaov', avatarId: 40744851, tickets: 1 },
  { player: 'oxr62ggmx98l', avatarId: 936162048466415, tickets: 1 },
  { player: 'WidrldepScam', avatarId: 79849889, tickets: 1 },
  { player: 'MarlonBruns_ccj', avatarId: 933738280217764, tickets: 1 },
  { player: 'nkhgbdrfwlo4', avatarId: 936606272198718, tickets: 1 },
  { player: 'QuickSteel884167', avatarId: 103273025, tickets: 1 },
  { player: 'Camzmxtvnyb', avatarId: 20165609, tickets: 1 },
  { player: 'p7y8h4ss2kys', avatarId: 935969228581539, tickets: 1 },
  { player: 'FionaYDebonair', avatarId: 27858975, tickets: 1 },
  { player: 'SonuKumar_nmf', avatarId: 935557633347736, tickets: 1 },
  { player: 'Skbros', avatarId: 95765421, tickets: 1 },
  { player: 'Mrjsubyshpac', avatarId: 32182756, tickets: 1 },
  { player: 'Sanakhan143', avatarId: 95113725, tickets: 1 },
  { player: 'NasirAbbas_xbt', avatarId: 936516943400422, tickets: 1 },
  { player: 'India369', avatarId: 933119208986931, tickets: 1 },
  { player: '4xc4lzklttgt', avatarId: 935634039107358, tickets: 1 },
  { player: 'Sgttt', avatarId: 105998732, tickets: 1 },
];

/* Both counters are the captured draw's own. `participated` is the figure beside the ticket
   icon on the results bar; `pages` is what the pager reads. */
export const DRAW_TOTALS = {
  participated: 376448,
  pages: 8,
  pageSize: 20,
};

/* The live round's ticket counter, printed under the hero's button. */
export const ROUND = { ticketsSent: 52086 };

export default WINNERS;
