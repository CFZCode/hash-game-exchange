import { sportArt, chromeArt } from './sportArt';

/* Lobby icons. Components only — the artwork lookup lives in `sportArt.js`, because a module
 * exporting both a component and a plain function trips `react-refresh/only-export-components`.
 * Same split as `SessionContext.jsx` / `session.js`.
 *
 * Almost everything on this page is now BetBy's real artwork, read out of the live widget's
 * shadow root and saved under `src/assets/sports/` (see sportArt.js). `SportIcon` and
 * `BetbyIcon` below are the two ways in.
 *
 * What is still hand-drawn is down to three glyphs that BetBy does not supply as files at all,
 * marked individually below. They are generic UI marks carrying no brand — drawing them passes
 * nothing off as captured — and each one says where it is used.
 */

/* Inlined rather than an `<img src>`, and that is not a preference — these SVGs ship with no
   fill of their own, so an <img> renders them black. They have to be in the document for a CSS
   `fill` to reach them. Home's Highlights row does the same thing, and so does the original,
   which fetches the file and assigns innerHTML. */
function RawSvg({ svg, className, ...rest }) {
  if (!svg) return null;
  return (
    <span
      className={`inline-flex ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
      {...rest}
    />
  );
}

/* A sport's artwork. Returns null when the file was never captured, which is most of them —
   call sites handle that themselves rather than getting a stand-in they cannot detect. */
export function SportIcon({ sport, className = '', ...rest }) {
  return <RawSvg svg={sportArt(sport)} className={className} {...rest} />;
}

/* One of BetBy's chrome icons, by its own filename: `ic-home`, `ic-top`, `ic-search`, …
   `...rest` matters here: the lobby tabs pass each glyph's colour through as an inline
   custom property, because three of the six are BetBy colours that are deliberately not
   tokens. */
export function BetbyIcon({ name, className = '', ...rest }) {
  return <RawSvg svg={chromeArt(name)} className={className} {...rest} />;
}

/* ------------------------------------------------------------------ the three drawn marks */

const Svg = ({ children, className = '', viewBox = '0 0 24 24', ...rest }) => (
  <svg viewBox={viewBox} className={className} aria-hidden="true" {...rest}>
    {children}
  </svg>
);

/* The country mark on an event card's league line. BetBy uses a per-country flag there, served
   from `flags_by_code/<ISO3>.svg` on its CDN — three were seen loading (IRL, AFG, OMN) and none
   of the twelve fixtures on page one is one of them. A generic globe stands in until the flags
   for those countries are captured; `Highlights/matches.js` already has the ISO-3 convention
   and five flag files, so this is the same gap, not a new one. */
export const GlobeIcon = (p) => (
  <Svg {...p}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.2 0 2.5 2.2 2.9 5.2H9.1C9.5 6.2 10.8 4 12 4zM4.3 11h3.1c.1-2 .5-3.8 1.1-5.2A8 8 0 0 0 4.3 11zm0 2a8 8 0 0 0 4.2 5.2c-.6-1.4-1-3.2-1.1-5.2H4.3zm5.1 0h5.2c-.4 3-1.7 5.2-2.6 5.2S9.8 16 9.4 13zm7.2 0h3.2a8 8 0 0 1-4.3 5.2c.6-1.4 1-3.2 1.1-5.2zm0-2c-.1-2-.5-3.8-1.1-5.2A8 8 0 0 1 19.8 11h-3.2z" />
  </Svg>
);

/* The two feed markers beside an event's kickoff time — lineups and statistics. Small enough at
   16px that their silhouettes are what read, and they are not among the files BetBy serves
   separately; it draws them from its icon font-equivalent inside components that only render at
   desktop width. */
export const ShirtIcon = (p) => (
  <Svg {...p}>
    <path d="M9 3l3 2 3-2 5 2.4-1.6 4-1.9-.8V21H6.5V8.6l-1.9.8L3 5.4 9 3z" />
  </Svg>
);

export const StatsIcon = (p) => (
  <Svg {...p}>
    <path d="M3 16.5h8v2.6H3v-2.6zm0-5.2h13v2.6H3v-2.6zM3 6h18v2.6H3V6z" />
  </Svg>
);

/* The flame behind a rail badge's counter. A counter backdrop, not sport artwork. */
export const FlameIcon = (p) => (
  <Svg {...p}>
    <path d="M12 2c.6 3.2-1.3 4.4-2.6 5.8C8 9.3 7 10.7 7 13a5 5 0 0 0 10 0c0-2.6-1.4-4.2-2.6-5.7C13.2 5.8 12.3 4.4 12 2z" />
  </Svg>
);

/* bc.game's own chevron, not BetBy's — this is the pager and dropdown arrow, and reusing the
   site's keeps those controls consistent with Pagination and Select elsewhere in the build.
   Points LEFT as drawn; every call site rotates it, which is also how those two get RTL right.
   BetBy's own `ic-rounded-arrow` is a filled triangle and is used for the rail overflow. */
export const ChevronIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);
