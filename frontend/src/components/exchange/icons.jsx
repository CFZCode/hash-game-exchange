/* Icons for the exchange kit.
 *
 * Reused, not redrawn, wherever the site already has the glyph:
 *   - sport art and BetBy chrome (`SportIcon`, `BetbyIcon`) from pages/Sports/icons — the same
 *     inlined SVGs the sports lobby draws, coloured by `fill`;
 *   - the site's chevron and cross (`IconArrow`, `IconClose`) from components/shared/icons.
 *
 * Drawn here, because neither icon set has them: the TV mark, the lock, the minus/plus of the
 * stepper and the pencil. All on the site's 32-unit viewBox with no fill of their own (the
 * call site colours them with a `fill-*` utility, as every icon here does).
 */
export { SportIcon, BetbyIcon } from '../../pages/Sports/icons';
export { IconArrow, IconClose, IconCheck, IconInform } from '../shared/icons';

const Svg = ({ className = '', children, ...rest }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...rest}>
    {children}
  </svg>
);

/* Live stream available. */
export const IconTv = (p) => (
  <Svg {...p}>
    <path d="M10.3 3.3a1 1 0 0 1 1.4 0L16 7.6l4.3-4.3a1 1 0 1 1 1.4 1.4L19 7.5h6a4 4 0 0 1 4 4V23a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V11.5a4 4 0 0 1 4-4h6l-2.7-2.8a1 1 0 0 1 0-1.4zM7 10a1.5 1.5 0 0 0-1.5 1.5V23A1.5 1.5 0 0 0 7 24.5h18a1.5 1.5 0 0 0 1.5-1.5V11.5A1.5 1.5 0 0 0 25 10H7zm6 3.6 7 3.9a.6.6 0 0 1 0 1l-7 3.9a.6.6 0 0 1-.9-.5v-7.8a.6.6 0 0 1 .9-.5z" />
  </Svg>
);

export const IconLock = (p) => (
  <Svg {...p}>
    <path d="M16 3a7 7 0 0 0-7 7v3H8a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V16a3 3 0 0 0-3-3h-1v-3a7 7 0 0 0-7-7zm4 10v-3a4 4 0 0 0-8 0v3h8zm-4 4.5a2 2 0 0 1 1 3.7V23a1 1 0 1 1-2 0v-1.8a2 2 0 0 1 1-3.7z" />
  </Svg>
);

export const IconMinus = (p) => (
  <Svg {...p}>
    <rect x="6" y="14.5" width="20" height="3" rx="1.5" />
  </Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M17.5 7.5a1.5 1.5 0 0 0-3 0v7h-7a1.5 1.5 0 0 0 0 3h7v7a1.5 1.5 0 0 0 3 0v-7h7a1.5 1.5 0 0 0 0-3h-7v-7z" />
  </Svg>
);

export const IconEdit = (p) => (
  <Svg {...p}>
    <path d="M21.6 4.6a3 3 0 0 1 4.2 0l1.6 1.6a3 3 0 0 1 0 4.2L13.8 24a2 2 0 0 1-1 .5l-6 1.3a1.3 1.3 0 0 1-1.6-1.6l1.3-6a2 2 0 0 1 .5-1L21.6 4.6zm2.1 2.1-1.8 1.8 2.6 2.6 1.8-1.8-2.6-2.6zm-1.3 6.5-2.6-2.6-10 10-.6 3.2 3.2-.6 10-10z" />
  </Svg>
);

/* Small letter badges for a lobby row's market availability: BM (bookmaker), F (fancy). Text,
   not artwork — that is how every exchange marks them, and it keeps them readable at 10px. */
export const MarketBadge = ({ children, title }) => (
  <span
    title={title}
    className="inline-flex h-4 min-w-4 flex-none items-center justify-center rounded-sm bg-layer5 px-1 text-[0.625rem] font-extrabold leading-none text-secondary"
  >
    {children}
  </span>
);
