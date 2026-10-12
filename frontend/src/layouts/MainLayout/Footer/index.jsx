import { useLocation } from 'react-router-dom';
import logoPureImg from '../../../assets/footer/logo-pure.png';
import logoPureLightImg from '../../../assets/footer/logo-pure_w.png';
import anjSealImg from '../../../assets/footer/anj-seal.png';
/* The same eight networks the region-block dialog lists, in the same order and already at
   the `size-6 fill-secondary` the footer wants. Shared rather than duplicated. */
import SOCIALS from '../../../components/modals/RegionBlock/icons';
import { CommunityItem, GlobalIcon } from '../../../components/shared/CommunityItem';
import { COLUMNS, SEO, FEEDBACK, LEGAL } from './links';
import { AWARDS, PARTNERS } from './badges';
import { useSettings } from '../../../context/settings';
import { useGates } from '../../../context/gates';
import { siteLogo } from '../../../services/siteBranding';
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

  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {inner}
    </a>
  );
}

/* `SocialButton` and `GlobalIcon` both moved to `components/shared/CommunityItem` when the
   sidebar's mobile community card became their second call site — see the note there. The
   name follows the original's own chunk (`CommunityItem-DguQXLpB.js`); the alias keeps this
   file's markup reading as it did. */
const SocialButton = CommunityItem;

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
  const { routeOn } = useGates();
  /* Two things in this footer are per-theme FILES rather than per-theme colours: the awards
     strip (`d-*` / `l-*`) and the wordmark (`logo_pure` / `logo_pure_w`). Both pairs are the
     original's own; see badges.js for how the first was recovered. */
  const { darken } = useSettings();
  /* Keyed on the path rather than a prop because the footer is mounted once by MainLayout,
     OUTSIDE <Routes>; there is no page above it to hand it a flag. Everything below this band —
     awards, partners, link columns, licence — is unchanged on every route. */
  const { pathname } = useLocation();
  const showBlurb = BLURB_SHOWN_ON.includes(pathname);

  return (
    /* `hidden lg:flex` — desktop only, like the Sidebar. The footer does not render below
       1024 at all; the mobile/tablet rules in Footer.css are inert while that holds, and are
       kept so the band is still correct if it is ever switched back on.

       Safe to express as utilities because Footer.css sets no `display` of its own — the
       cascade hazard in CLAUDE.md is an unlayered rule silently beating one of these. */
    <footer className="footer-bg hidden w-full flex-col items-center justify-center divide-y divide-third py-6 lg:flex">
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

          {/* `footer-feedback` is ours — see Footer.css. `flex-shrink-0` is the original's and
              is what overflows below sm. */}
          <div className="footer-feedback flex max-w-[500px] flex-shrink-0 flex-grow flex-col gap-y-3 leading-5">
            <h3 className="text-lg font-semibold text-primary">{FEEDBACK.title}</h3>
            <p className="text-sm font-semibold text-secondary">{FEEDBACK.intro}</p>
            {/* The original writes `font-sm` on these two spans, which is not a class — so they
                keep the footer's inherited size instead of dropping to text-sm like the <p>s
                around them. Reproduced by simply not setting a size. */}
            <div className="flex flex-col">
              <span className="font-semibold text-secondary">
                Email us:
                <a className="ml-1 text-brand underline" href={`mailto:${FEEDBACK.email}`}>
                  {FEEDBACK.email}
                </a>
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-secondary">{FEEDBACK.security}</p>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-secondary">
                Security email:
                <a className="ml-1 text-brand underline" href={`mailto:${FEEDBACK.securityEmail}`}>
                  {FEEDBACK.securityEmail}
                </a>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Awards. Two up below sm, eight across above it: basis-1/2 capped by
          sm:max-w-[12.5%], so the cap does the work rather than the basis. */}
      <div className="flex flex-wrap justify-center pb-1 pt-8 sm:max-w-300">
        {AWARDS.map((item) => (
          <div
            key={item.name}
            className="mb-7 max-w-[50%] flex-shrink-0 flex-grow-0 basis-1/2 px-1.5 sm:max-w-[12.5%]"
          >
            <img alt={item.alt} src={darken ? item.dark : item.light} />
          </div>
        ))}
      </div>

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
            {PARTNERS.certifiers.map((item) => (
              <PartnerLogo key={item.name} {...item} />
            ))}
          </div>
          <div className="flex flex-shrink-0 flex-grow items-center justify-around gap-x-6 pl-6">
            {PARTNERS.sponsorships.map((item) => (
              <PartnerLogo key={item.name} {...item} />
            ))}
          </div>
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
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h4 className="mb-5 text-base font-extrabold text-primary">{column.title}</h4>
            <ul className="flex flex-col gap-y-3">
              {column.links.filter((link) => link.external || routeOn(link.href)).map((link) => (
                <li key={link.label}>
                  <NavLink {...link} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <div className="flex flex-col gap-6">
            <div>
              <h4 className="mb-5 text-base font-extrabold text-primary">
                Join Our Global Community
              </h4>
              {/* gap-2 is 8px, but four 1fr columns stretch past the 40px buttons, so the
                  visible gutter reads wider than the gap. */}
              <ul className="grid grid-cols-4 gap-2">
                {SOCIALS.map((social) => (
                  <SocialButton key={social.label} {...social} />
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-5 text-base font-extrabold text-primary">
                Join Our Local Community
              </h4>
              {/* ONE entry, and it really does render — an earlier pass left this heading
                  standing alone on the belief that the local set was region-gated to empty.
                  The rendered DOM has the row, on the same `grid grid-cols-4 gap-2` as the
                  global set above it, so the single button sits in the first of four tracks
                  rather than filling the width. Restoring it puts 40px of button plus the
                  grid's own row back into this column, which is what was pulling the seal —
                  and the column's whole lower half — up against the original. */}
              <ul className="grid grid-cols-4 gap-2">
                <SocialButton
                  label="Global"
                  href="https://hash.game/telegram"
                  icon={<GlobalIcon />}
                />
              </ul>
            </div>
          </div>
          {/* EMPTY, exactly as the original leaves it. `#trust-seal-container` is GameCheck's
              injection point and the vendor script never fills it on the live page — the seal
              simply is not there under the community block. A static badge stood here instead,
              and removing it fixes two things at once:

              it was the widest thing in the column at 218.4px, so it — not the 207.2px heading
              — was SETTING this column's width. justify-between hands the columns whatever the
              band has left, so 11px of surplus width here was 11px stolen from the five
              gutters, holding every column except the first ~2px per gutter to the LEFT of
              where the original puts them. The kept wrapper is height-zero; its mt-5 is the
              original's and applies either way. */}
          <div className="mt-5 flex w-full flex-col items-center justify-center">
            <div id="trust-seal-container" />
          </div>
        </div>
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
            <img className="h-8" alt="logo" src={siteLogo({ own: 'hash-games' }) ?? (darken ? logoPureImg : logoPureLightImg)} />
          </div>
          {/* The Anjouan seal, structured as the vendor's own snippet builds it. It is sized by
              WIDTH — a `max-width: 48px` box (the `data-anj-image-size="48"`) holding an image
              at `width: 100%; height: auto` — and that distinction is the whole reason this
              badge used to sit left of the original's.

              The asset is the real one, pulled from `*.snippet.anjcdn.org/sealassets/...`;
              anjcdn resolves from here even though bc.game's own origin does not, the same
              split that got the promotions artwork and the raffle avatars. It is 128x128 with
              its ink spanning x 12..117, so at a 48px width the badge starts 4.5px in and runs
              39.7 wide. The previous asset was an ink-CROP crossed with height sizing: 38.4
              wide starting flush at x=0, which is a ~5px leftward shift of a 40px badge.
              Sizing by height also cannot be right in general — a square source and a 0.8
              source give different widths for the same height, and the vendor pins width.

              Dropped from the snippet: the `data-anj-*` attributes and instance id (hooks for
              a script this build does not run) and the beacon background-image (a tracking
              pixel). `aria-label` is ours — the vendor ships `alt=""`, which leaves the link
              with no accessible name. */}
          <div className="flex min-h-15">
            <div className="relative block max-w-12 min-w-8 overflow-hidden">
              <a
                href="https://verification.anjouangamingboard.org/validate?domain=hash.game&seal_id=25e3958206f75b3536584ffc3d4b3b5fd92747712fe8da3f0727559031f069ec6272ba88047b9393a6b97beca611ad95&stamp=af31c2aded661ef82cc7fcd852f5a427"
                target="_blank"
                rel="noreferrer"
                aria-label="Anjouan licence — click to verify"
              >
                <img className="h-auto w-full" alt="" src={anjSealImg} />
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-y-4">
            {LEGAL.brand.map((text) => (
              <p key={text.slice(0, 24)}>{text}</p>
            ))}
          </div>
          <div className="flex flex-col gap-y-2">
            {LEGAL.licence.map((text) => (
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
