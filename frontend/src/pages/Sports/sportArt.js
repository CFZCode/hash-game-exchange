/* BetBy's own SVG artwork, resolved by name.
 *
 * Its own module for two reasons, both of which this project has already run into:
 *
 * - `import.meta.glob` resolves relative to the file it is written in, so a glob can only live
 *   in one place — the same reason `utils/gameArt.js` exists rather than the pattern being
 *   repeated at each call site.
 * - The lookup has to be importable by component files without those files re-exporting it.
 *   A module that exports both a component and a plain function trips
 *   `react-refresh/only-export-components`, which is why `useSession` lives in
 *   `context/session` rather than in `SessionContext.jsx`.
 *
 * WHERE THE FILES CAME FROM. All of them are BetBy's, lifted from the live widget. The widget
 * loads them from `betby_config.sports_icon_path` — Com-8gtZ7Cmm.js builds the URL as
 * `${path}/sport-${name}.${hash}.svg` — and inlines them into its shadow root, so the markup
 * is readable straight off the rendered page. Their names here are BetBy's own filenames with
 * the content hash dropped, so a later capture can be matched up against them.
 *
 * TWO GROUPS, and the split matters.
 *
 * `ic-*` is CHROME — the rail's home/live/favourite/my-bets/search/chevron, and the six lobby
 * tab glyphs. All twelve are captured and exact.
 *
 * TWO OF THE FILES WERE EDITED ON THE WAY IN, and only in one respect: `ic-badge-hot` and
 * `sport-bc-game-original` each shipped wrapped in a `<clipPath>` whose path is exactly the
 * viewBox, so it clips nothing. Both were dropped. That is not tidying — these files are
 * inlined into the document, `ic-badge-hot` renders on two rail cells at once, and BetBy names
 * its clip `id="clip0"`. Two copies would put duplicate ids in the page and every reference
 * after the first would resolve to the wrong one. Keep any future capture free of them, and
 * keep prose out of the .svg files: they are inlined verbatim, so a comment there ships to the
 * browser on every page load.
 *
 * `sport-*` is CONTENT — the sixteen sports the rail and the filter row draw. All present.
 *
 * They arrived in two passes, which is worth knowing because the first pass was the wrong
 * approach: the widget only fetches a sport's icon when something on screen needs it, and the
 * one thing needing all of them at once is the desktop rail, which never rendered in the
 * automated capture. Reading the navbar's markup directly settled it in one go.
 *
 * Still absent: `sport-rugbyleague` (the widget was seen fetching it, but it was never on
 * screen to be read) and `flags_by_code/international.svg`, the country flag BetBy stacks under
 * the Highlights cell's soccer icon. No lookalikes are drawn for either — a hand-drawn sport
 * icon is exactly the kind of thing that gets mistaken for the real asset later and never
 * corrected. `sportArt` returns undefined and each call site decides what to show instead, the
 * way ProviderLogo falls back to a provider's name. Dropping a captured file in as
 * `src/assets/sports/sport-<id>.svg` lights it up with no other change.
 */
const art = import.meta.glob('../../assets/sports/{sport,ic}-*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const at = (file) => art[`../../assets/sports/${file}.svg`];

/* Flags are a SEPARATE glob and deliberately NOT `?raw`. The sport and chrome icons have to be
   inlined so CSS `fill` can reach them; a flag is full-colour artwork that carries its own
   fills, so it is an <img src> and only its URL is needed. Same convention and directory as
   `pages/Home/Highlights/matches.js`, which globs `flag-*.svg` the same way. */
const flags = import.meta.glob('../../assets/sports/flag-*.svg', {
  eager: true,
  import: 'default',
});

export const flagArt = (code) =>
  code ? flags[`../../assets/sports/flag-${code}.svg`] : undefined;

export const sportArt = (sport) => (sport ? at(`sport-${sport}`) : undefined);

export const hasSportIcon = (sport) => Boolean(sportArt(sport));

/* BetBy's chrome icons, addressed by their own filename minus the hash (`ic-home`, `ic-top`,
   …). Unlike the sport icons these are all present, so a miss here is a typo rather than a
   gap, and it renders nothing rather than falling back. */
export const chromeArt = (name) => (name ? at(name) : undefined);
