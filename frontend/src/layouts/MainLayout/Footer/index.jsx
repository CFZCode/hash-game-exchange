import { Link, useLocation } from 'react-router-dom';
import { COLUMNS, SEO, SOCIALS, legal } from './links';
import { PARTNERS } from './badges';
import { useGates } from '../../../context/gates';
import { useBrandName } from '../../../services/siteBranding';
import './Footer.css';

/* The site footer, from the live DOM.
 *
 * Mounted from the layout, not the page: `Enter-MsmOuq5R.js` is what pulls
 * `footer-jnUVITid.js`. That chunk is not in the mirror, so the structure below was
 * transcribed from the rendered markup rather than lifted from source — which still makes
 * these the original's own class lists, not a reconstruction.
 *
 * Two things drive the whole layout and are easy to miss:
 *
 *  - The rules are `divide-y divide-third` on the <footer> itself, not <hr> elements. Every
 *    direct child is a band and the dividers fall out of the sibling count, which is why
 *    each band owns its padding rather than sharing a wrapper's.
 *  - Bands cap at `max-w-300` (1200px) and centre via the footer's own `items-center`. All
 *    five carry the same cap and the same `px-4`, so they share a left edge; changing one
 *    alone offsets that band visibly against its neighbours.
 *
 * The one deviation is `.footer-bg`'s negative inline margin, which is ours: the original's
 * footer is not nested inside a gutter and ours is. See Footer.css.
 *
 * Both third-party seals are vendor injections on the original — GameCheck into
 * `#trust-seal-container`, the Anjouan licence seal into a `data-anj-seal-id` div that calls
 * out to anjcdn.org — and this build runs neither script.
 *
 * They are handled DIFFERENTLY on purpose. The licence seal is a static image, because the
 * live page shows one and an empty space there would be a visible hole. GameCheck's container
 * is left empty, because the live page shows nothing there: the script does not fill it. A
 * static badge stood in that slot for a while and was wrong twice over — it invented a seal
 * the original does not display, and being the widest element in its column it set that
 * column's width and pulled every other column leftwards. Do not put an image back.
 */

/* The arrow-in-a-box on off-site links. */
const ExternalIcon = () => (
  <svg viewBox="0 0 32 32" className="icon size-4 fill-secondary">
    <path d="M21.3284 18.5643H18.9958V14.6514L11.9914 21.6313L10.344 19.9795L17.3552 12.9973H13.2815V10.667H21.3284V18.5643Z" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21.5472 5.30762C24.3449 5.30817 26.6141 7.57668 26.6141 10.3746V21.6268C26.6136 24.4243 24.3446 26.6932 21.5472 26.6938H10.4556C7.6577 26.6938 5.38917 24.4246 5.38867 21.6268V10.3746C5.38867 7.57634 7.65739 5.30762 10.4556 5.30762H21.5472ZM10.4556 7.70717L10.1833 7.72056C8.8381 7.85662 7.78823 8.99349 7.78823 10.3746V21.6268L7.80162 21.8991C7.92937 23.1542 8.928 24.1516 10.1833 24.2786L10.4556 24.292H21.5472L21.8195 24.2786C23.074 24.1509 24.0713 23.1537 24.1989 21.8991L24.2123 21.6268V10.3746C24.2123 8.9941 23.1638 7.85743 21.8195 7.72056L21.5472 7.70717H10.4556Z"
    />
  </svg>
);

/* Brand glyphs for the social row, drawn in their own colours on a dark circle (Jack55 reference). */
const SOCIAL_ICONS = {
  x: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.32l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z" />
    </svg>
  ),
  discord: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#5865F2" d="M19.6 5.3A16.4 16.4 0 0 0 15.5 4l-.5 1a15.2 15.2 0 0 0-6 0L8.5 4a16.4 16.4 0 0 0-4.1 1.3C1.8 9.2 1.1 13 1.4 16.7a16.6 16.6 0 0 0 5 2.5l1.1-1.7c-.6-.2-1.2-.5-1.7-.9l.4-.3a11.8 11.8 0 0 0 11.6 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.7a16.5 16.5 0 0 0 5-2.5c.4-4.3-.7-8.1-3-11.4ZM8.7 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#29A9EB" d="M21.4 3.6 2.9 10.7c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.4.8.8.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.3-1.5Zm-3.5 3.6-8.6 7.8-.3 3.4-1.6-4.9 10.1-6.4c.5-.3.8 0 .4.1Z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="footer-ig" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset=".35" stopColor="#FA7E1E" />
          <stop offset=".6" stopColor="#D62976" />
          <stop offset="1" stopColor="#962FBF" />
        </linearGradient>
      </defs>
      <path fill="url(#footer-ig)" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-3.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />
    </svg>
  ),
};

function SocialRow() {
  return (
    <div className="footer-socials" aria-label="Social channels">
      {SOCIALS.map(({ key, label, href }) =>
        href ? (
          <a key={key} className="footer-social" href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
            {SOCIAL_ICONS[key]}
          </a>
        ) : (
          <button key={key} type="button" className="footer-social" aria-label={label} title={label}>
            {SOCIAL_ICONS[key]}
          </button>
        )
      )}
    </div>
  );
}

const LINK_LABEL =
  'text-sm font-semibold text-secondary hover:text-brand hover:underline sm:max-w-60';

function NavLink({ label, href, external, button }) {
  const inner = (
    <span className="inline-flex items-center gap-x-1">
      <span className={LINK_LABEL}>{label}</span>
      {external && <ExternalIcon />}
    </span>
  );

  /* Four entries are <button> on the original — they open a dialog or a widget rather than
     navigating, so they carry no href at all. */
  if (button) {
    return (
      <button type="button" className="p-0 text-secondary !shadow-none">
        {inner}
      </button>
    );
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }

  /* In-app links go through the router: a plain <a> reloaded the whole page. */
  return <Link to={href}>{inner}</Link>;
}

/* `oe` in index-BPci0vXA.js. The original writes each mark as a bare
   `<img width={m.width * remScale + "px"}>` inside its link and nothing else — no wrapper box,
   no height, no alignment flag.

   THIS USED TO BE FAR MORE ELABORATE AND ALL OF IT WAS SCAFFOLDING. While the marks were opaque
   screenshot crops they had no internal transparent padding, so reproducing the live layout took
   an ink `width` inside a declared `box`, a `boxHeight`, an `align: "start"` for SiGMA and a
   HEIGHTS table — every one of them reconstructing padding the real files simply have. They are
   the real files now (see badges.js), so the scaffolding is gone with them.

   The width is REM rather than the original's `px * remScale`. Same result: this project scales
   the root font-size by exactly that factor, so `design px / 16` tracks it with no JS. */
const PartnerLogo = ({ src, alt, width, href, internal }) => (
  <a
    href={href}
    className="flex shrink-0 items-center justify-center"
    {...(internal ? {} : { target: '_blank', rel: 'noreferrer' })}
  >
    <img alt="partner logo" title={alt} src={src} style={{ width: `${width / 16}rem` }} />
  </a>
);

/* THE PROSE/FEEDBACK BAND IS HOME-PAGE ONLY — the "Crypto Online Casino" SEO copy beside "Help
   us improve your experience", which opens the footer.
 *
 * An ALLOWLIST of exact paths, and that is the change from how this used to work. It was a
 * `BLURB_HIDDEN_ON` prefix DENYLIST (`/casino`, `/promotions`, `/deposit-offer`), which meant
 * every page added after it — sports, VIP, and every route yet to be built — inherited the band
 * by default and had to opt out by hand. Inverting it makes the rule say what is actually
 * wanted and stops the list needing an edit every time a page lands.
 *
 * Exact match, not a prefix: the catch-all route renders Home for paths that are not built yet
 * while KEEPING their URL, and those are not the home page — the band should not follow them
 * there. `/casino` is a real, separate page and was already excluded under the old list too. */
const BLURB_SHOWN_ON = ['/'];

export default function Footer() {
  /* A link into a section the site or the account has off is not drawn (services/gates.js). */
  const { routeOn, on } = useGates();
  /* Keyed on the path rather than a prop because the footer is mounted once by MainLayout,
     OUTSIDE <Routes>; there is no page above it to hand it a flag. Everything below this band —
     awards, partners, link columns, licence — is unchanged on every route. */
  const { pathname } = useLocation();
  const showBlurb = BLURB_SHOWN_ON.includes(pathname);
  /* Parker567 branding: the printed name comes from the owner panel's branding payload. */
  const brand = useBrandName();
  const LEGAL = legal(brand);

  return (
    /* `hidden lg:flex` — desktop only, like the Sidebar. The footer does not render below
       1024 at all; the mobile/tablet rules in Footer.css are inert while that holds, and are
       kept so the band is still correct if it is ever switched back on.

       Safe to express as utilities because Footer.css sets no `display` of its own — the
       cascade hazard in CLAUDE.md is an unlayered rule silently beating one of these. */
    <footer className="footer-bg w-full flex flex-col items-center justify-center divide-y divide-third py-6">
      {/* Prose + feedback. basis-[34rem] with flex-grow on both is what sits them side by
          side and stacks them when the row runs out of room. Home page only — see
          `BLURB_SHOWN_ON` above. */}
      {showBlurb && (
        <div className="mx-auto mb-6 flex w-full max-w-300 flex-wrap justify-between gap-x-10 gap-y-10 px-4">
          <div className="flex flex-shrink flex-grow basis-[34rem] flex-col gap-y-3">
            <div className="feedback-html flex flex-grow flex-col gap-y-3 font-semibold">
              <h2>{SEO.title}</h2>
              {SEO.paragraphs.map((text) => (
                <p key={text.slice(0, 24)}>{text}</p>
              ))}
            </div>
          </div>

          {/* The feedback band (BC.GAME's feedback@/security@bcgame.com mailboxes) is not drawn:
              Parker567 publishes no such addresses. */}
        </div>
      )}

      {/* BC.GAME's SiGMA/AIBC award strip is not drawn — those awards are not Parker567's. */}

      {/* Certifiers, then sponsorships. The vertical rule between them is `divide-x` on the
          wrapper — the same mechanism as the horizontal rules, not a border on either group.

          gap-x-10 (2.5rem) is the space between the two GROUPS, so it lands before the rule;
          the 1.5rem after it is the second group's own pl-6. The gap-x-6 on each group is a
          different thing again — the 1.5rem BETWEEN marks inside a group.

          `min-h-15` IS GONE FROM THESE TWO ROWS. It was a floor of ours: the live row measures
          60 CSS tall (band 92.8 = py-4's 32 plus 60) because the original's logo files carry
          transparent padding — its tallest mark inks 52 but occupies 60 — and while these were
          ink-cropped screenshots the row collapsed to 52 without it, shortening the divider and
          costing the band ~9px. The real assets have that padding, so the row reaches 60 on its
          own and a floor would only be a second claim on the same height. */}
      <div className="w-full max-w-300 py-4 sm:px-4">
        <div className="footer-partners flex w-full flex-wrap gap-x-10 divide-x divide-third">
          <div className="flex flex-shrink-0 flex-grow items-center justify-around gap-x-6">
            {PARTNERS.certifiers.filter((item) => item.name !== 'sigma').map((item) => (
              <PartnerLogo key={item.name} {...item} />
            ))}
          </div>
          {/* BC.GAME's sponsorships (clubs, artists) are not drawn — not Parker567's. */}
        </div>
      </div>

      {/* Link columns. `justify-between` on a wrap container, not a grid — which is exactly
          why the live columns sit at uneven x offsets.

          THE GUTTERS ARE THE BAND'S LEFTOVER WIDTH, NOT `gap-x-4`, and they are already at
          their maximum. justify-between spends all the free space: 848px of column ink in this
          1168px content box leaves 320px, which is 64px across each of the five gutters —
          measured off a capture, 63.5 predicted. `gap-x-4` is therefore inert here; raising it
          changes nothing until it passes 63.5, and one pixel beyond that the row overflows and
          the community column wraps to a second line.

          So there is no gap to add at this width. Widening them needs one of: a wider band
          (every one of the five caps, together, or they misalign), less horizontal padding,
          or narrower columns — and the columns have no slack, each being sized by its longest
          link, with the widest pinned by the 216px GameCheck badge. Do not "fix" this by
          bumping gap-x; that only buys an early wrap.

          `footer-links` is ours, like `footer-partners`: a hook for the mobile rules in
          Footer.css, which turn this band into two even columns below sm. At sm and up it
          carries nothing. */}
      <div className="footer-links flex w-full max-w-300 flex-wrap justify-between gap-x-4 gap-y-4 px-4 py-6">
        {/* A column whose every link is gated off is not drawn (About Us is only News → /blog). */}
        {COLUMNS.map((column) => ({ ...column, links: column.links.filter((link) => (link.gate ? on(link.gate) : link.external || routeOn(link.href))) }))
          .filter((column) => column.links.length)
          .map((column) => (
          <div key={column.title}>
            <h4 className="mb-5 text-base font-extrabold text-primary">{column.title}</h4>
            <ul className="flex flex-col gap-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <NavLink {...link} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Jack55's social row, the band's last cell (right-hand column on desktop). */}
        <SocialRow />
      </div>

      {/* Legal. `text-xs` here is the whole answer to the 12px question — the logo row, both
          prose blocks and the copyright line all inherit it from this one declaration. */}
      <div className="flex w-full max-w-300 flex-col justify-center pt-8 text-xs font-semibold text-secondary">
        {/* `footer-legal-grid` is ours — the hook that drops the two prose cells to full
            width below sm while the logo and the seal stay side by side. */}
        <div
          className="footer-legal-grid grid grid-cols-2 grid-rows-2 gap-x-8 gap-y-3 px-4"
          style={{ gridTemplateRows: '1fr' }}
        >
          <div className="flex min-h-15 items-center gap-4">
            <img className="jack55-footer-logo h-8 w-36 object-contain object-left" alt="Jack55" src="/brand/jack55.svg" />
          </div>
          <div className="jack55-legal-copy flex flex-col gap-y-2">
            {[...LEGAL.brand, ...LEGAL.licence].map((text) => (
              <p key={text.slice(0, 24)}>{text}</p>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-third px-4 pb-2 pt-8 text-center sm:px-0">
          <span>{LEGAL.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
