/* The sports lobby's content model.
 *
 * WHERE THIS COMES FROM, and why it is sourced differently from every other data file here.
 *
 * `/sports` is the one page with neither half of the usual ground truth. Its route chunk
 * (`index-BzFOqw51.js`, reached from `path: "/sports/*"` in Enter-MsmOuq5R.js) was lazily
 * loaded and never saved, and neither were `betby-script-DLxnmYtC.js`,
 * `useSportsRedirect-H9cLM2Hl.js` or `Main-_tXJgJzI.js`. The only captured sports response is
 * `api/platform-sports/v14/home/sport/provider/support/`, which returns one provider:
 *
 *   { sportProviders: [{ name: "betby", betByBrand: { brandFlag: "2103509236163162112" } }] }
 *
 * That is the whole story. bc.game does not render a sportsbook — it mounts BetBy's, into an
 * open shadow root inside a single container div (see index.jsx). So there is no bc.game
 * markup to transcribe and no bc.game feed to replay.
 *
 * Everything below is transcribed from desktop screenshots of the live lobby. The strings are
 * exact. What is NOT here is anything the screenshots could not show: no `retrieveId`s, no
 * competitor crest URLs (BetBy serves those from an internal id — see the note in
 * `pages/Home/Highlights/matches.js`, which hit the same wall), and no sport icon files.
 *
 * The BetBy data layer IS partly in the mirror, in `Com-8gtZ7Cmm.js` — the same chunk Home's
 * Highlights row was built from. Its endpoints, for whenever any of this becomes real:
 *
 *   /api/v1/descriptions/statuses/{lang}
 *   /api/v3/descriptions/markets/{lang}
 *   /api/v2/promo/banners/brand/{brand}/{lang}     <- the featured banner's artwork
 *   /api/v1/promo/widget/{brand}/{lang}
 *   /api/v1/search/query?q={q}&lang={lang}
 *   /api/v1/top/events/{brand}/country/{c}/currency/{cur}/lang/{lang}
 *   /api/v4/{feed}/brand/{brand}/{lang}/{...}      <- snapshot + deltas, see `V()` merge
 */
import { brandLabel } from '../../services/siteBranding';

/* ---------------------------------------------------------------------------------------
   The top rail — the icon-only strip above everything.

   Four fixed controls, a divider, then the sport list, an overflow chevron, and search at the
   far right. `badge` is the little counter some sports carry (a flame with a number on the
   live ones). `icon` names a file in `src/assets/sports/`; see SportIcon.jsx for what happens
   when it is not there, which today is most of them.
   --------------------------------------------------------------------------------------- */
export const RAIL_ACTIONS = [
  { id: 'home', label: 'Home', chrome: 'ic-home', active: true },
  { id: 'live', label: 'Live', chrome: 'ic-live' },
  { id: 'favourites', label: 'Favourites', chrome: 'ic-favourite' },
  { id: 'my-bets', label: 'My Bets', chrome: 'ic-navbar-mybets' },
];

/* Nineteen sports, in the rail's own order, each keyed to BetBy's own icon filename.
 *
 * Transcribed from the rendered navbar markup, not guessed from a screenshot. Two corrections
 * worth recording so nobody re-introduces them: the list ends Table Tennis then eBasketball
 * (`sport-nba2k-b`), and the `badge` is not a counter — what looked like a "6" beside eSoccer
 * and Counter-Strike is BetBy's `ic-badge-hot` flame, whose pin element holds that SVG and no
 * text node at all. Baseball also comes BEFORE Cricket, and there is a Sumo cell where a
 * screenshot reading had put Athletics.
 *
 * `highlights` is the one COMPOSITE cell. BetBy stacks a 28px country flag image under a 20px
 * soccer icon forced to white:
 *
 *   <div style="width:28px;height:28px"><img src=".../flags_by_code/international.svg"></div>
 *   <svg data-cy="sport-soccer" style="color: rgb(255,255,255); width:20px; height:20px">
 *
 * `flag` names a file in `src/assets/sports/`, following the `flag-*` convention Highlights
 * already uses (see `pages/Home/Highlights/matches.js`). The international flag is remote and
 * was never captured, so the cell currently renders the white ball on its own; dropping
 * `flag-international.svg` in restores the multicoloured globe with no other change.
 */
export const RAIL_SPORTS = [
  {
    id: 'highlights',
    label: 'Highlights',
    icon: 'soccer',
    flag: 'international',
    iconSize: 20,
  },
  { id: 'soccer', label: 'Soccer', icon: 'soccer' },
  { id: 'originals', label: 'BC Game Original', icon: 'bc-game-original' },
  { id: 'esoccer', label: 'eSoccer', icon: 'fifa-b', hot: true },
  { id: 'tennis', label: 'Tennis', icon: 'tennis' },
  { id: 'basketball', label: 'Basketball', icon: 'basketball' },
  { id: 'counter-strike', label: 'Counter-Strike', icon: 'counterstrike', hot: true },
  { id: 'dota-2', label: 'Dota 2', icon: 'dota2' },
  { id: 'league-of-legends', label: 'League of Legends', icon: 'leagueoflegends' },
  { id: 'baseball', label: 'Baseball', icon: 'baseball' },
  { id: 'cricket', label: 'Cricket', icon: 'cricket' },
  { id: 'volleyball', label: 'Volleyball', icon: 'volleyball' },
  { id: 'horse-racing', label: 'Horse Racing', icon: 'horseracing' },
  { id: 'ice-hockey', label: 'Ice Hockey', icon: 'icehockey' },
  { id: 'sumo', label: 'Sumo', icon: 'sumo' },
  { id: 'boxing', label: 'Boxing', icon: 'boxing' },
  { id: 'american-football', label: 'American Football', icon: 'americanfootball' },
  { id: 'table-tennis', label: 'Table Tennis', icon: 'tabletennis' },
  { id: 'ebasketball', label: 'eBasketball', icon: 'nba2k-b' },
];

/* ---------------------------------------------------------------------------------------
   The expanded navbar — the panel the rail's overflow arrow opens.

   Three tabs over a grid of every sport the book currently has, each row an icon, a name and
   a live event count. Transcribed from the rendered `expandedNavbar` markup, so the names,
   the order and the counts are all exact; the counts are a snapshot of that moment and are
   not live, which is true of every number in this file.

   `Esports` and `Racing` were never opened, so only the Sports tab has rows. They render
   empty rather than repeating the Sports list — the same choice the event grid's page two
   makes, and for the same reason.

   The first row is the same composite the rail's Highlights cell uses: a country flag under
   a white soccer icon. It is a tournament rather than a sport, which is why its label is a
   competition name.
   --------------------------------------------------------------------------------------- */
export const EXPANDED_TABS = [
  { id: 'sports', label: 'Sports' },
  { id: 'esports', label: 'Esports' },
  { id: 'racing', label: 'Racing' },
];

export const EXPANDED_SPORTS = [
  { id: 'uefa-el-q', label: 'UEFA Europa League, Qualification', icon: 'soccer', flag: 'international', count: 13 },
  { id: 'soccer', label: 'Soccer', icon: 'soccer', count: 771 },
  { id: 'originals', label: brandLabel('BC.GAME: Originals'), icon: 'bc-game-original', count: 4 },
  { id: 'esoccer', label: 'eSoccer', icon: 'fifa-b', count: 73, hot: true },
  { id: 'tennis', label: 'Tennis', icon: 'tennis', count: 294 },
  { id: 'basketball', label: 'Basketball', icon: 'basketball', count: 31 },
  { id: 'baseball', label: 'Baseball', icon: 'baseball', count: 34 },
  { id: 'cricket', label: 'Cricket', icon: 'cricket', count: 59 },
  { id: 'volleyball', label: 'Volleyball', icon: 'volleyball', count: 7 },
  { id: 'ice-hockey', label: 'Ice Hockey', icon: 'icehockey', count: 52 },
  { id: 'sumo', label: 'Sumo', icon: 'sumo', count: 3 },
  { id: 'boxing', label: 'Boxing', icon: 'boxing', count: 57 },
  { id: 'american-football', label: 'American Football', icon: 'americanfootball', count: 199 },
  { id: 'table-tennis', label: 'Table Tennis', icon: 'tabletennis', count: 46 },
  { id: 'ebasketball', label: 'eBasketball', icon: 'nba2k-b', count: 50 },
  { id: 'chess', label: 'Chess', icon: 'chess', count: 6 },
  { id: 'formula-1', label: 'Formula 1', icon: 'formula-1', count: 2 },
  { id: 'ehorse-racing', label: 'eHorse Racing', icon: 'ehorseracing', count: 1 },
  { id: 'esoccer-penalty', label: 'eSoccer: Penalty', icon: 'fifa-penalty-b', count: 12 },
  { id: 'handball', label: 'Handball', icon: 'handball', count: 2 },
  { id: 'kabaddi', label: 'Kabaddi', icon: 'kabbadi', count: 4 },
  { id: 'efighting', label: 'eFighting', icon: 'e-fighting-b', count: 13 },
  { id: 'ebasketball-blitz', label: 'eBasketball: Blitz', icon: 'blitz-basketball', count: 10 },
  { id: 'etennis', label: 'eTennis', icon: 'aotennis-b', count: 15 },
  { id: 'australian-football', label: 'Australian Football', icon: 'aussierules', count: 24 },
  { id: 'padel-tennis', label: 'Padel Tennis', icon: 'padel-tennis', count: 3 },
  { id: 'esoccer-x-battle-fc', label: 'eSoccer: X-Battle FC', icon: 'esoccer-x-battle-fc', count: 8 },
  { id: 'rugby-league', label: 'Rugby League', icon: 'rugbyleague', count: 23 },
  { id: 'rugby-union', label: 'Rugby Union', icon: 'rugby', count: 16 },
  { id: 'mma', label: 'Mixed Martial Arts', icon: 'mma', count: 58 },
  { id: 'darts', label: 'Darts', icon: 'darts', count: 16 },
  { id: 'snooker', label: 'Snooker', icon: 'snooker', count: 13 },
  { id: 'water-polo', label: 'Water Polo', icon: 'waterpolo', count: 5 },
  { id: 'cross-country', label: 'Cross-Country', icon: 'skirace', count: 1 },
  { id: 'ecricket-x-battle', label: 'eCricket: X-Battle Bats', icon: 'x-battle-bats', count: 6 },
  { id: 'ecricket', label: 'eCricket', icon: 'ecricket-b', count: 17 },
  { id: 'golf', label: 'Golf', icon: 'golf', count: 13 },
  { id: 'cycling', label: 'Cycling', icon: 'cycling', count: 1 },
  { id: 'athletics', label: 'Athletics', icon: 'athletics', count: 11 },
  { id: 'alpine-skiing', label: 'Alpine Skiing', icon: 'alpineskiing', count: 2 },
  { id: 'biathlon', label: 'Biathlon', icon: 'biathlon', count: 2 },
  { id: 'nascar', label: 'Nascar', icon: 'nascar', count: 3 },
  { id: 'formula-2', label: 'Formula 2', icon: 'formula-2', count: 1 },
  { id: 'teqball', label: 'Teqball', icon: 'teqball', count: 2 },
  { id: 'footvolley', label: 'Footvolley', icon: 'futevolei', count: 3 },
  { id: 'esoccer-volta', label: 'eSoccer: Volta', icon: 'fifa-volta', count: 16 },
  { id: 'evaquejada', label: 'eVaquejada', icon: 'vaquejada-eletronico', count: 4 },
];

/* ---------------------------------------------------------------------------------------
   The lobby's section tabs. Labels, glyphs and tones are all exact — the glyphs are BetBy's
   own files and the tones are its computed `fill` on each one, read off the live widget rather
   than sampled from a screenshot.

   Two of the six land on tokens this project already has, and are written as the token so they
   track it: Bets Feed is rgb(36,238,137) = --color-brand, and Live and Playtracker are both
   rgb(252,60,60) = --color-error. The other three are BetBy's alone and stay literals rather
   than being smuggled into @theme as if they were part of bc.game's palette.
   --------------------------------------------------------------------------------------- */
export const LOBBY_TABS = [
  { id: 'popular', label: 'Popular', chrome: 'ic-top', tone: '#FF9820' },
  { id: 'live', label: 'Live', chrome: 'ic-live-simple', tone: 'var(--color-error)' },
  { id: 'upcoming', label: 'Upcoming', chrome: 'ic-upcoming', tone: '#21A8F7' },
  { id: 'predictions', label: 'Predictions', chrome: 'ic-predictions', tone: '#814BF6' },
  { id: 'bets-feed', label: 'Bets Feed', chrome: 'ic-top-bets', tone: 'var(--color-brand)' },
  { id: 'playtracker', label: 'Playtracker', chrome: 'ic-playtracker', tone: 'var(--color-error)' },
];

/* ---------------------------------------------------------------------------------------
   The featured banner — a carousel of promoted fixtures. Three slides, the third active.

   Only the active slide's content is recoverable from a screenshot, so the other two are
   present as ids and nothing else: the dot row is real and has to render three, but inventing
   two fixtures to sit behind it would be fabricating data that the capture never showed.
   `FeaturedBanner` renders the active slide and treats the rest as unloaded.

   The artwork is a remote BetBy promo image (`/api/v2/promo/banners/brand/...`), not in the
   mirror and not saved, so the banner falls back to the gradient it sits on. See the note in
   FeaturedBanner.jsx.
   --------------------------------------------------------------------------------------- */
export const FEATURED = {
  slides: ['promo-1', 'promo-2', 'atp-jodar-fils'],
  activeIndex: 2,
  slide: {
    id: 'atp-jodar-fils',
    sport: 'tennis',
    category: 'ATP',
    tournament: 'ATP Montreal, Canada',
    startLabel: 'Tomorrow, 03:30',
    home: { name: 'Jodar, Rafael', countryCode: 'ESP' },
    away: { name: 'Fils, Arthur', countryCode: 'FRA' },
    marketName: 'Winner',
    outcomes: [
      { name: '1', value: '1.76' },
      { name: '2', value: '1.98' },
    ],
  },
};

/* ---------------------------------------------------------------------------------------
   The Bets Feed — other players' open tickets, a horizontally scrolling strip.

   `pick` is the selection as the widget prints it ("<market> - <selection>") and `fixture` the
   line under it. The fourth card is only half on screen in the capture: its two legs are
   readable, its total is not, so `totalOdds` is null and the card renders the label with no
   figure rather than carrying a made-up one.
   --------------------------------------------------------------------------------------- */
export const BETS_FEED = [
  {
    id: 'ticket-lol',
    legs: [
      { pick: 'Second map - winner - Kiwoom DRX', fixture: 'DN SOOPers - Kiwoom DRX' },
      { pick: 'Map handicap - Power Rangers (-1.5)', fixture: 'Power Rangers - MOUZ' },
    ],
    totalOdds: '2.40',
  },
  {
    id: 'ticket-cs',
    legs: [
      { pick: 'Winner - SK Gaming', fixture: 'SK Gaming - Team Vitality' },
      { pick: 'Winner - Rune Eaters', fixture: 'Rune Eaters - Natus Vincere' },
    ],
    totalOdds: '7.88',
  },
  {
    id: 'ticket-cricket',
    legs: [
      { pick: 'Total runs - over 253.5', fixture: 'Trent Rockets - Southern Brave' },
      { pick: 'Winner (incl. super over) - Afghanistan', fixture: 'Ireland - Afghanistan' },
    ],
    totalOdds: '2.18',
  },
  {
    id: 'ticket-sirius',
    legs: [
      { pick: '1x2 - IK Sirius', fixture: 'IK Sirius - IF Brommapojkarna' },
      { pick: 'Winner (incl. super over) - Afghanistan', fixture: 'Ireland - Afghanistan' },
    ],
    totalOdds: null,
  },
];

/* ---------------------------------------------------------------------------------------
   The sport filter above the grid. Soccer is the selected one in the capture, and selection
   is what the bright-green pill means — it is the only brand-filled control on the page.
   --------------------------------------------------------------------------------------- */
/* Icon ids are BetBy's own filenames. All but Rugby League resolve — `sport-rugbyleague.svg`
   was seen being fetched by the widget but its markup was never captured, so that one pill
   renders label-only. */
export const SPORT_FILTERS = [
  { id: 'soccer', label: 'Soccer', icon: 'soccer' },
  { id: 'esoccer', label: 'eSoccer', icon: 'fifa-b' },
  { id: 'tennis', label: 'Tennis', icon: 'tennis' },
  { id: 'basketball', label: 'Basketball', icon: 'basketball' },
  { id: 'counter-strike', label: 'Counter-Strike', icon: 'counterstrike' },
  { id: 'dota-2', label: 'Dota 2', icon: 'dota2' },
  { id: 'league-of-legends', label: 'League of Legends', icon: 'leagueoflegends' },
  { id: 'baseball', label: 'Baseball', icon: 'baseball' },
  { id: 'rugby-league', label: 'Rugby League', icon: 'rugbyleague' },
];

/* ---------------------------------------------------------------------------------------
   The event grid. Twelve cards, which is the whole of page one — the pager underneath reads
   "1 - 12 of 15", so `TOTAL_EVENTS` is 15 and the last three were never on screen.

   Shape deliberately matches `pages/Home/Highlights/matches.js` — sport / category /
   tournament / home / away / marketName / outcomes — because the two render the same kind of
   thing and Highlights' shape is the one derived from a chunk that IS in the mirror. Keeping
   them aligned stops a second vocabulary for "a fixture with odds on it" taking hold.

   Two fields are new, and both are the widget's own difference rather than a shortcut:

   - `startLabel`. Highlights prints an absolute time and date ("11:30 PM" / "08/04/2026"); the
     lobby prints a relative one ("Today, 22:30"). Different presentation, so a different field
     rather than forcing it into the existing two.
   - `feeds`. The little blue glyphs beside the time. Two appear: a shirt (lineups) and a bars
     glyph (statistics). Most cards carry both; FC CFR 1907 Cluj and SL Benfica B carry only
     the second, which is why this is per-event data and not a constant.

   `country` is the grid's own grouping line ("Romania › Superliga"). Highlights calls that
   pair category/tournament and so does this, so the two stay comparable.

   No `countryCode` on competitors: these are clubs, and the flag fallback Highlights leans on
   resolves to the sport icon for all of them. The crests in the capture come from BetBy's
   internal competitor ids, which are not derivable from anything saved.
   --------------------------------------------------------------------------------------- */
export const TOTAL_EVENTS = 15;
export const PAGE_SIZE = 12;

const x12 = (one, draw, two) => [
  { name: '1', value: one },
  { name: 'draw', value: draw },
  { name: '2', value: two },
];

export const EVENTS = [
  {
    id: 'sepsi-fcsb',
    sport: 'soccer',
    category: 'Romania',
    tournament: 'Superliga',
    startLabel: 'Tomorrow, 00:00',
    feeds: ['lineups', 'stats'],
    home: { name: 'ACS Sepsi OSK Sfantu Gheorghe' },
    away: { name: 'Fotbal Club FCSB' },
    marketName: '1x2',
    outcomes: x12('3.8', '3.35', '1.9'),
  },
  {
    id: 'silkeborg-odense',
    sport: 'soccer',
    category: 'Denmark',
    tournament: 'Superliga',
    startLabel: 'Today, 22:30',
    feeds: ['lineups', 'stats'],
    home: { name: 'Silkeborg IF' },
    away: { name: 'Odense Boldklub' },
    marketName: '1x2',
    outcomes: x12('2.56', '3.65', '2.5'),
  },
  {
    id: 'santaclara-nacional',
    sport: 'soccer',
    category: 'Portugal',
    tournament: 'Primeira Liga',
    startLabel: 'Tomorrow, 00:45',
    feeds: ['lineups', 'stats'],
    home: { name: 'Santa Clara Azores' },
    away: { name: 'Nacional da Madeira' },
    marketName: '1x2',
    outcomes: x12('1.8', '3.25', '4.8'),
  },
  {
    id: 'cfr-universitatea',
    sport: 'soccer',
    category: 'Romania',
    tournament: 'Superliga',
    startLabel: 'Tomorrow, 00:00',
    feeds: ['stats'],
    home: { name: 'FC CFR 1907 Cluj' },
    away: { name: 'FC Universitatea Cluj' },
    /* The one card on page one whose headline market is not 1x2 — a two-way Total, which is
       why the outcome row has to size from the data rather than assume three. */
    marketName: 'Total',
    outcomes: [
      { name: 'over 3.5', value: '3.25' },
      { name: 'under 3.5', value: '1.3' },
    ],
  },
  {
    id: 'botosani-corvinul',
    sport: 'soccer',
    category: 'Romania',
    tournament: 'Superliga',
    startLabel: 'Today, 21:00',
    feeds: ['lineups', 'stats'],
    home: { name: 'FC Botosani' },
    away: { name: 'CS Corvinul 1921 Hunedoara' },
    marketName: '1x2',
    outcomes: x12('2.12', '3.35', '3.15'),
  },
  {
    id: 'jongaz-eindhoven',
    sport: 'soccer',
    category: 'Netherlands',
    tournament: 'Eerste Divisie',
    startLabel: 'Today, 23:30',
    feeds: ['lineups', 'stats'],
    home: { name: 'Jong AZ Alkmaar' },
    away: { name: 'FC Eindhoven' },
    marketName: '1x2',
    outcomes: x12('2.08', '3.95', '3.05'),
  },
  {
    id: 'vasteraas-djurgardens',
    sport: 'soccer',
    category: 'Sweden',
    tournament: 'Allsvenskan',
    startLabel: 'Today, 22:30',
    feeds: ['lineups', 'stats'],
    home: { name: 'Vasteraas SK' },
    away: { name: 'Djurgardens IF' },
    marketName: '1x2',
    outcomes: x12('4.2', '3.95', '1.75'),
  },
  {
    id: 'jongpsv-volendam',
    sport: 'soccer',
    category: 'Netherlands',
    tournament: 'Eerste Divisie',
    startLabel: 'Today, 23:30',
    feeds: ['lineups', 'stats'],
    home: { name: 'Jong PSV Eindhoven' },
    away: { name: 'FC Volendam' },
    marketName: '1x2',
    outcomes: x12('3.55', '3.8', '1.93'),
  },
  {
    id: 'benficab-leixoes',
    sport: 'soccer',
    category: 'Portugal',
    tournament: 'Liga Portugal 2',
    startLabel: 'Today, 22:30',
    feeds: ['stats'],
    home: { name: 'SL Benfica B' },
    away: { name: 'Leixoes SC' },
    marketName: '1x2',
    outcomes: x12('2.16', '3.45', '3.0'),
  },
  {
    id: 'zvezda-hapoel',
    sport: 'soccer',
    category: 'International',
    tournament: 'UEFA Champions League, Qualification',
    startLabel: 'Tomorrow, 23:30',
    feeds: ['lineups', 'stats'],
    home: { name: 'FK Crvena Zvezda Belgrade' },
    away: { name: 'Hapoel Be`er Sheva FC' },
    marketName: '1x2',
    outcomes: x12('1.28', '5.2', '8.8'),
  },
  {
    id: 'bodoe-union',
    sport: 'soccer',
    category: 'International',
    tournament: 'UEFA Champions League, Qualification',
    startLabel: 'Tomorrow, 21:30',
    feeds: ['lineups', 'stats'],
    home: { name: 'Bodoe/Glimt' },
    away: { name: 'Union Saint-Gilloise' },
    marketName: '1x2',
    outcomes: x12('1.59', '4.4', '4.3'),
  },
  {
    id: 'slovan-mjallby',
    sport: 'soccer',
    category: 'International',
    tournament: 'UEFA Champions League, Qualification',
    startLabel: 'Tomorrow, 23:45',
    feeds: ['lineups', 'stats'],
    home: { name: 'SK Slovan Bratislava' },
    away: { name: 'Mjallby AIF' },
    marketName: '1x2',
    outcomes: x12('1.79', '3.5', '4.1'),
  },
];

/* The select under the grid. European is the one the capture shows; the rest of the list is
   the standard set every sportsbook offers and is NOT from the capture — the dropdown was
   never opened. Flagged here rather than passed off as measured. */
export const ODDS_FORMATS = ['European', 'American', 'Fractional', 'Hong Kong', 'Malay', 'Indo'];

export const DISCLAIMER =
  'Although every effort is made to ensure data displayed on our site is accurate, this data ' +
  'is for information purposes and should be used as a guide only. In the event of any ' +
  'particular information being incorrect, we assume no liability for it.';

export default EVENTS;
