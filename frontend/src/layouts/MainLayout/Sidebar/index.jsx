import { LIVE_SUPPORT_AVAILABLE } from '../../../services/availability';
import { brandLabel } from '../../../services/siteBranding';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LanguageCurrencyModal from '../../../components/modals/LanguageCurrencyModal';
import Refer from '../../../components/modals/Refer';
import { FLYOUTS } from './originals';
import { useSession } from '../../../context/session';
import { useGates } from '../../../context/gates';
import { useSettings } from '../../../context/settings';
import './Sidebar.css';
import SportsMenu from './SportsMenu';
import GiftCardDialog from '../../../components/modals/GiftCard';
import { IconGift } from '../Header/AfterLogin/icons';
import pwaImg from '../../../assets/pwa.png';
import pwaLightImg from '../../../assets/pwa_w.png';
import { languageName } from '../../../components/modals/LanguageCurrencyModal/languages';
import { getAlias } from '../../../utils/currency';
import { coinIcon } from '../../../utils/coinArt';

/* The Application card — see its call site for why it is off. */
const SHOW_APP_CARD = false;

// BC Arrow SVG (used for dropdowns and chevrons)
const ArrowSvg = ({ className }) => (
  <svg viewBox="0 0 32 32" className={`icon size-4 fill-secondary transition ease-out ${className || ''}`}>
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

// BC Originals SVG icon
const BCOriginalsSvg = () => (
  <svg viewBox="0 0 32 32" className="icon pt-0.5 size-7 menu-game-icon-svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M22.3989 7.848C20.3229 6.648 18.8739 6.009 17.4609 5.943H17.1279C15.9939 6 14.8389 6.414 13.3539 7.2C13.2819 4.008 12.1869 3 8.78787 3H7.60587C6.81687 3 6.77487 3.126 7.04787 3.774C7.24696 4.28438 7.33096 4.83242 7.29387 5.379V16.839C7.32687 21.6 7.96887 22.668 12.3399 25.113C14.5869 26.37 15.8949 27 17.2929 27C18.6909 27 19.9929 26.37 22.2489 25.113C26.7399 22.602 27.2949 21.537 27.2949 16.437C27.2949 11.337 26.7159 10.347 22.3989 7.848ZM14.1339 16.614L17.0079 19.461C17.0762 19.5273 17.1677 19.5645 17.2629 19.5645C17.3581 19.5645 17.4496 19.5273 17.5179 19.461L19.8309 17.169C19.9498 17.0513 20.1105 16.9855 20.2779 16.986H23.8419C23.8644 16.9859 23.8866 16.9905 23.9072 16.9996C23.9278 17.0087 23.9462 17.022 23.9612 17.0387C23.9762 17.0555 23.9875 17.0752 23.9944 17.0966C24.0012 17.118 24.0034 17.1407 24.0009 17.163C23.7964 18.8586 22.9522 20.4122 21.6409 21.5064C20.3296 22.6006 18.6499 23.1529 16.9451 23.0504C15.2403 22.948 13.6389 22.1986 12.468 20.9552C11.2971 19.7119 10.6451 18.0684 10.6451 16.3605C10.6451 14.6526 11.2971 13.0091 12.468 11.7658C13.6389 10.5224 15.2403 9.773 16.9451 9.67057C18.6499 9.56813 20.3296 10.1204 21.6409 11.2146C22.9522 12.3088 23.7964 13.8624 24.0009 15.558C24.003 15.5805 24.0003 15.6032 23.9931 15.6246C23.9859 15.646 23.9743 15.6657 23.9591 15.6824C23.9438 15.699 23.9252 15.7123 23.9045 15.7214C23.8838 15.7305 23.8615 15.7351 23.8389 15.735H20.2779C20.1105 15.7355 19.9498 15.6697 19.8309 15.552L17.5179 13.26C17.4496 13.1937 17.3581 13.1565 17.2629 13.1565C17.1677 13.1565 17.0762 13.1937 17.0079 13.26L14.1339 16.107C14.1004 16.1402 14.0738 16.1797 14.0557 16.2232C14.0376 16.2667 14.0282 16.3134 14.0282 16.3605C14.0282 16.4076 14.0376 16.4543 14.0557 16.4978C14.0738 16.5413 14.1004 16.5808 14.1339 16.614Z" />
  </svg>
);

// External link SVG
const ExternalSvg = () => (
  // fill-, not text-: these paths have no fill of their own, and `text-secondary`
  // only sets `color`, so the SVG fell back to its default black.
  <svg viewBox="0 0 32 32" className="icon ml-1 size-4 flex-none fill-secondary">
    <path d="M21.3284 18.5643H18.9958V14.6514L11.9914 21.6313L10.344 19.9795L17.3552 12.9973H13.2815V10.667H21.3284V18.5643Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M21.5472 5.30762C24.3449 5.30817 26.6141 7.57668 26.6141 10.3746V21.6268C26.6136 24.4243 24.3446 26.6932 21.5472 26.6938H10.4556C7.6577 26.6938 5.38917 24.4246 5.38867 21.6268V10.3746C5.38867 7.57634 7.65739 5.30762 10.4556 5.30762H21.5472ZM10.4556 7.70717L10.1833 7.72056C8.8381 7.85662 7.78823 8.99349 7.78823 10.3746V21.6268L7.80162 21.8991C7.92937 23.1542 8.928 24.1516 10.1833 24.2786L10.4556 24.292H21.5472L21.8195 24.2786C23.074 24.1509 24.0713 23.1537 24.1989 21.8991L24.2123 21.6268V10.3746C24.2123 8.9941 23.1638 7.85743 21.8195 7.72056L21.5472 7.70717H10.4556Z" />
  </svg>
);

// Globe SVG for language
const GlobeSvg = () => (
  <svg viewBox="0 0 32 32" className="icon size-6 fill-secondary">
    <path d="M16 4C9.3726 4 4 9.3726 4 16C4 22.6274 9.3726 28 16 28C22.6274 28 28 22.6274 28 16C28 9.3726 22.6274 4 16 4ZM25.1671 12.0007C25.7022 13.2252 26.0008 14.578 26.0008 16.001C26.0008 17.424 25.7022 18.7768 25.1671 20.0013H20.6577C20.8782 18.7607 20.9984 17.412 20.9984 16.001C20.9984 14.59 20.8781 13.2413 20.6577 12.0007H25.1671ZM13.0018 16.001C13.0018 14.5641 13.112 13.2052 13.3125 12.0007H18.6857C18.8862 13.2052 18.9984 14.564 18.9984 16.001C18.9984 17.4381 18.8862 18.7969 18.6857 20.0014H13.3146C13.1142 18.7969 13.0018 17.4381 13.0018 16.001ZM24.0007 10.0004H20.1927C19.7277 8.4392 19.0904 7.15453 18.3388 6.27668C20.6017 6.82169 22.6039 8.1385 24.0007 10.0004ZM16 7.00222C16.8878 7.00222 17.6875 8.16266 18.2367 10.0025H13.7634C14.3125 8.16073 15.1122 7.00222 16 7.00222ZM13.6611 6.27879C12.9095 7.15458 12.2722 8.44329 11.8092 10.0025H8.0012C9.3974 8.14096 11.3989 6.82423 13.6611 6.27879ZM6.83291 12.0007H11.3423C11.1218 13.2413 11.0015 14.59 11.0015 16.001C11.0015 17.412 11.1219 18.7607 11.3423 20.0013H6.83286C6.28161 18.7398 5.99776 17.3777 5.99915 16.001C5.99915 14.578 6.29784 13.2252 6.83291 12.0007ZM7.9994 22.0015H11.8074C12.2724 23.5627 12.9097 24.8474 13.6612 25.7253C11.3983 25.1802 9.3962 23.8634 7.9994 22.0015ZM16 24.9997C15.1122 24.9997 14.3125 23.8393 13.7633 21.9994H18.2366C17.6835 23.8412 16.8879 24.9997 16 24.9997ZM18.3388 25.7233C19.0904 24.8475 19.7277 23.5588 20.1908 21.9995H23.9988C22.6025 23.8611 20.601 25.1779 18.3388 25.7233Z" />
  </svg>
);

/* Turbo Mode's bolt — `Ue` in index-DuwOs_Mv.js, rendered `class="size-4 fill-primary"`. */
const BoltSvg = () => (
  <svg viewBox="0 0 32 32" className="icon size-4 fill-primary">
    <path d="M17.9138 4.81964L7.69383 14.6658C7.01401 15.3205 7.07254 16.3307 7.82512 16.9227L7.95974 17.0188C8.09939 17.1092 8.25241 17.1819 8.41547 17.2346L12.8264 18.6645L10.9132 25.742C10.6807 26.6008 11.2928 27.4612 12.2787 27.6636C12.9234 27.7957 13.5999 27.6151 14.0489 27.1911L24.2947 17.5122C24.9813 16.8633 24.9344 15.8524 24.1894 15.2545L24.0665 15.1642C23.9385 15.0789 23.7989 15.0078 23.65 14.9535L19.4641 13.4399L21.0788 6.19518C21.2719 5.32889 20.6214 4.49019 19.6263 4.32211C18.995 4.21591 18.3461 4.40406 17.9154 4.81964H17.9138Z" />
  </svg>
);

// Headphones SVG for Live Support
const HeadphonesSvg = () => (
  <svg viewBox="0 0 32 32" className="icon size-6 fill-secondary">
    <path d="M12.0434 17.0183C12.9801 17.0183 13.7395 17.7778 13.7395 18.7145V25.3283C13.7395 26.265 12.9801 27.0244 12.0434 27.0244H10.2648C8.85937 27.0244 7.721 25.8852 7.721 24.4806V19.5629C7.721 18.1575 8.86019 17.0191 10.2648 17.0191L12.0434 17.0183ZM21.8077 17.0183C23.2132 17.0183 24.3515 18.1575 24.3515 19.5621V24.4798C24.3515 25.8852 23.2123 27.0236 21.8077 27.0236H20.0291C19.0925 27.0236 18.333 26.2641 18.333 25.3275V18.7136C18.333 17.777 19.0925 17.0175 20.0291 17.0175L21.8077 17.0183ZM15.9999 4.97559C22.6881 4.97559 28.1292 10.2983 28.2926 16.9261L28.2966 17.2331V22.2398C28.2966 22.9307 27.7348 23.4909 27.0415 23.4909C26.3915 23.4909 25.8574 22.9985 25.7929 22.368L25.7863 22.2398V17.2331C25.7863 11.845 21.4043 7.47772 15.9991 7.47772C10.6853 7.47772 6.36132 11.6988 6.21596 16.9603L6.21188 17.2331V22.2553C6.21188 22.9462 5.65004 23.5064 4.95673 23.5064C4.30669 23.5064 3.77262 23.014 3.70893 22.3835L3.70239 22.2553V17.2331C3.70239 10.4641 9.20807 4.9764 15.9991 4.9764L15.9999 4.97559Z" />
  </svg>
);

// One row inside an expanded submenu. Covers the three icon sources the original
// draws from: the BC logo SVG, the menuicon sheet, and the gameicon sheet.
//
// EVERY ROW NOW CARRIES ITS REAL PATH, read out of `index-DuwOs_Mv.js` — the sidebar's own
// menu definition, which is in the mirror. They used to be inert `href="#"` anchors on the
// argument that most of these pages are not built and the catch-all would silently show Home;
// the trade has been made the other way round on request, and it is worth knowing what it buys
// and what it costs.
//
// It buys more than it looks like. `/casino/:tab` IS built, and eight of the twelve Casino rows
// are tabs of it — BC Originals, Hot Games, Slots, Live Casino, Game Shows, New Releases, Table
// Games and Providers all land on the real page with the right tab lit. Sports lands on the
// real sportsbook. Promotions' four rows were already real.
//
// It costs the honest 404. BC Exclusive and Bingo have no
// page here, so they keep their URL and render Home under it. Those
// are the rows to give a real page next; the paths are already correct, so building the page is
// the whole job. Quest Hub and Bonus were both on that list and are now built — `/quests` and
// `/bonus`, see pages/Quests and pages/Bonus — and so are this group's own two login-only rows,
// `/favorite` and `/recent`, see pages/GameCollection.
//
// Refer & Earn is the one row deliberately left inert: its `link` is the string "refer", a
// marker the original's row renderer special-cases, not a path.
//
// ACTIVE STATE. The label turns brand green, the row gets the raised background, and the icon
// swaps to the green sprite sheet — all three, as the original does. The sheet was missing for
// a long time and is not any more; see the note over the sprite block in Sidebar.css.
const SubNavLink = ({ item, flyoutOpen, onFlyout, onCloseMobile, onAction }) => {
  const { pathname } = useLocation();
  const active = Boolean(item.href) && pathname === item.href;

  const className = `nav-link-item relative flex h-10 w-full cursor-pointer items-center rounded-lg px-3 lg:pl-0 lg:pr-2 overflow-hidden mt-1 ${
    active ? 'nav-link-active' : ''
  } ${flyoutOpen ? 'nav-flyout-open' : ''}`;

  /* EVERY row reports on enter, not just the ones that own a panel — a row without a flyout
     reports `null` and so closes whatever was open. Leaving a row deliberately reports nothing:
     the pointer has to cross a 16px gap to reach the panel, and the panel's own `-ml-4 pl-4`
     bridge is what covers it. Closing on leave here would kill the panel mid-crossing. What
     closes it is the panel's own mouseleave, or arriving at another row. */
  const hoverProps = onFlyout ? { onMouseEnter: () => onFlyout(item.flyout ?? null) } : undefined;

  const body = (
    <>
      <div className="nav-scale-box center flex flex-none lg:size-10">
        {item.icon === 'bc-originals-svg' ? (
          <BCOriginalsSvg />
        ) : (
          <div
            className={`menu_icon_img ${active ? 'menu_icon_img_active' : 'menu_icon_img_normal'} ${item.menuIcon}`}
          ></div>
        )}
      </div>
      <span className="sidebar-collapse-hide ml-2 whitespace-nowrap text-base font-semibold lg:ml-0 lg:text-sm">
        {item.label}
      </span>
      {/* The chevron is the HOVER FLYOUT's affordance, so a row that owns a panel drops it
          below `lg`: the drawer is touch-only, there is no hover there, and the panel is
          never reachable — the row is just a link to its casino tab. Rows with the chevron
          and no panel (the two Sports Provider ones) keep it at every width, as before. */}
      {item.hasSubArrow && (
        <div className={`ml-auto mr-0.5 size-4 ${item.flyout ? 'hidden lg:block' : ''}`}>
          <ArrowSvg className="rotate-180" />
        </div>
      )}
    </>
  );

  return item.href ? (
    <Link
      to={item.href}
      className={className}
      aria-current={active ? 'page' : undefined}
      onClick={onCloseMobile}
      {...hoverProps}
    >
      {body}
    </Link>
  ) : (
    <a
      href="#"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        /* A row with an `action` is the original's `link: "refer"` marker — it opens something
           rather than going somewhere. The drawer closes either way, as it does for a real
           navigation, so the dialog is not left sitting behind an open sidebar on a phone. */
        if (item.action && onAction) onAction(item.action);
        if (onCloseMobile) onCloseMobile();
      }}
      {...hoverProps}
    >
      {body}
    </a>
  );
};

/* The panel behind a submenu row's chevron — `BC Originals` is the only one this build has a
 * list for. Its markup is the rendered DOM's, and two things in it are worth keeping straight:
 *
 *   -ml-4 / pl-4   a 16px transparent bridge on the LEFT, so the pointer can leave the row and
 *                  arrive here without passing over the page. `w-[256px]` is border-box, so the
 *                  visible panel is 240px and the bridge eats the other 16.
 *   inactive       a dead class on every row, the same kind of thing as `bg-from-special` on
 *                  the VIP perk cards. Kept.
 *
 * The original also writes `link=""` on each anchor — a Solid directive marker, not markup, and
 * the one thing here that is dropped rather than transcribed.
 *
 * `nav-link-item-game` is what the sprite's hover and active rules key on, so it is not
 * decorative either: without it the icons never change sheet. */
const Flyout = ({ games, onClose }) => (
  <div
    /* `hidden lg:block` is this build's, and it pairs with the chevron being dropped below
       `lg`: a tap on a touch device fires `mouseenter` before `click`, so the row would set
       `flyout` on its way to /casino/brand and leave this fixed panel painted over the page
       after the drawer closed. The rule works because `.sidebar-flyout` sets no `display` —
       see the cascade note in CLAUDE.md. */
    className="sidebar-flyout -ml-4 hidden w-[256px] cursor-pointer bg-layer3 pl-4 lg:block"
    style={{ transition: 'all 0.2s' }}
    onMouseLeave={onClose}
  >
    <div
      className="hidden-scroll-bar h-full w-full overflow-y-auto px-2 py-3"
      style={{
        background: 'var(--Sidebar-Unit_bg)',
        boxShadow: 'rgba(0, 0, 0, 0.05) 4px 0px 8px 0px',
      }}
    >
      {games.map((game) => (
        <Link
          key={game.href}
          to={game.href}
          className="nav-link-item nav-link-item-game mt-1 flex h-10 w-full items-center overflow-hidden rounded-lg inactive"
        >
          <div className="nav-scale-box">
            <div className="center relative size-10 flex-none">
              <div className={`game_icon_img ${game.icon}`} style={{ transform: 'scale(0.75)' }} />
            </div>
          </div>
          <span className="ml-1 whitespace-nowrap font-semibold">{game.label}</span>
        </Link>
      ))}
    </div>
  </div>
);

/* Which submenu owns which route. Kept beside the nav data rather than derived from it
   because the arrays live inside the component, and this has to be readable before they are.
   One entry per built page; add to it as pages land. */
const SUBMENU_ROUTES = [
  ['casino', '/casino'],
  ['sports', '/sports'],
  ['promotions', '/promotions/promotion'],
  /* A group may claim more than one route — `find` takes the first match and nothing here
     cares which entry won. Deposit Bonus is a row inside the Promotions group but its path is
     a top-level sibling on the original (`/deposit-offer`, not `/promotions/…`), so a prefix
     on the entry above would never reach it. */
  ['promotions', '/deposit-offer'],
  /* Favorites and Recent are Casino rows whose paths are top-level siblings rather than
     `/casino/…`, so the prefix on the first entry never reaches them — the same reason Deposit
     Bonus needs its own line above. Both are `needLogin`, so the rows they light only exist once
     you are signed in; the entry is harmless either way. */
  ['casino', '/favorite'],
  ['casino', '/recent'],
];

/* `guard: { needLogin: !0 }` in the original's menu definition, which is
   `index-DuwOs_Mv.js` — a module that IS in the mirror and is the authority for every row in
   this sidebar. It used to be gated on a hardcoded `false` because there was no session; it is
   now `session.login`, so Favorites and Recent appear under Casino and Refer & Earn under
   Promotions once you sign in (Lottery's My bets and Favorites went with that group).

   The bottom group's two login-only rows are NOT expressed this way on the original — Bonus is
   `h.login && {…}`, spliced out of the array entirely, and Quest Hub is
   `guard: { hostHidden: !h.login || !1 }`, i.e. hidden by the OTHER guard. Both are reproduced
   with the same `needLogin` flag here, because the distinction is invisible: neither has any
   other reason to be hidden. */
const visibleItems = (items = [], login) => items.filter((i) => !i.needLogin || login);

export default function Sidebar({ sidebarExpanded, mobileOpen, onCloseMobile }) {
  /* The rows the original guards with `needLogin`. Read straight off the session rather than
     threaded down from MainLayout — the sidebar is the only consumer. */
  const { session } = useSession();
  const [openMenus, setOpenMenus] = useState({});
  /* And the rows the site or the account has switched off (services/gates.js) — a section the
     owner took out of the plan, or promotions for an agent's player. External links are gated
     only by an explicit `gate` (Blog); Refer and Earn has no href and follows the affiliate section. All on with fixtures. */
  const gates = useGates();
  const shown = (items) =>
    visibleItems(items, session.login).filter((i) =>
      i.action === 'refer' ? gates.on('affiliate')
        : i.gate ? gates.on(i.gate)
        : !i.href || i.external || gates.routeOn(i.href),
    );

  /* THE SECOND THEME CONTROL IN THE APP, and it reads the same store as the first. It was
     `useState(true)` — a purely visual toggle that moved its own pill and told nothing — which is
     why throwing it did nothing at all once the palette landed. The account page's `/user/enter`
     control is the other one; both write `theme` through `setTheme` and both render off `darken`,
     so they can never disagree and neither owns the state.

     `setTheme('dark' | 'light')` rather than a toggle, matching `I2`: each cell SETS a theme, so
     clicking the one you are already on is a no-op. */
  const { darken, setTheme } = useSettings();
  const darkMode = darken;
  const setDarkMode = (next) => setTheme(next ? 'dark' : 'light');
  /* `N.lite` on the original, a persisted app setting that thins out animations. Nothing here
     reads it — see the note over the Turbo Mode card for why the switch is inert. */
  const [turboMode, setTurboMode] = useState(false);

  /* Which submenu row's hover panel is open, by `flyout` key. Held here rather than on the row
     because the panel is a SIBLING of the aside — see the note over `.sidebar-flyout` in
     Sidebar.css for why it cannot be a child of it. */
  const [flyout, setFlyout] = useState(null);

  /* The language and currency rows open the same dialog the HEADER's globe button opens, just
     on a different tab — which is the original's behaviour and the reason the modal already
     takes `initialTab`. State is local rather than lifted into MainLayout because nothing else
     needs it; if a third entry point appears, that is the moment to move it up. */
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [langModalTab, setLangModalTab] = useState('language');

  const openLangModal = (tab) => {
    setLangModalTab(tab);
    setLangModalOpen(true);
  };
  const { pathname } = useLocation();

  /* The group that owns the page you are on. Landing on /promotions/promotion with the
     Promotions group collapsed would hide the very row that is meant to be highlighted, so a
     group opens itself when one of its children matches the route.

     Derived during render rather than pushed into state by an effect — there is nothing to
     synchronise, the route already IS the state. `openMenus` therefore holds only what the
     user has explicitly toggled, and `id in openMenus` is the test for "they have an opinion";
     until they do, the route decides. That is what keeps the group collapsible while you are
     still standing on its page. */
  const routeGroup =
    SUBMENU_ROUTES.find(
      ([, href]) => pathname === href || pathname.startsWith(`${href}/`)
    )?.[0] ?? null;
  const isOpen = (id) => (id in openMenus ? openMenus[id] : id === routeGroup);

  const toggleMenu = (id) => setOpenMenus(prev => ({
    ...prev,
    [id]: !(id in prev ? prev[id] : id === routeGroup),
  }));

  // The green/raised state is tracked separately from expansion on purpose: clicking
  // the row body colours it, clicking the arrow only expands. Driving the colour off
  // openMenus would tint the row on an arrow click too.
  const [activeMenu, setActiveMenu] = useState(null);

  /* The Refer and Earn dialog. Local state rather than a route, because it is not one on the
     original either — `Enter` pushes it onto the popup stack in response to the row's event. */
  const [referOpen, setReferOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);

  // Row body expands only — it never collapses. Clicking an already-open row is a
  // no-op for expansion. Collapsing is the arrow's job.
  const navigate = useNavigate();

  const isExpanded = sidebarExpanded || mobileOpen;

  /* Row body expands AND navigates when the group has a page of its own; the arrow still only
     expands. Navigation is done with `useNavigate` rather than by wrapping the row in a
     <Link>, because the row already contains the arrow <button> and an anchor around a button
     is invalid markup — and the arrow's stopPropagation would have to fight the anchor's
     default instead of just the row's handler. */
  const handleRowClick = (id, href) => {
    setOpenMenus(prev => (prev[id] ? prev : { ...prev, [id]: true }));
    setActiveMenu(id);
    if (href) {
      navigate(href);
      if (onCloseMobile) onCloseMobile();
    }
  };

  const handleArrowClick = (e, id) => {
    e.stopPropagation(); // don't let the row's handler recolour it
    toggleMenu(id);
  };

  /* `open-refer`, the one event a sidebar row emits instead of navigating. `Enter` listens for
     it and imperatively pushes `Refer-DVueC7AK.js` onto the popup stack; this build has no such
     stack (see the note in PopCenter) so the dialog is local state here, mounted beside the
     <aside> the way the BC Originals flyout is.

     THE LOGGED-OUT BRANCH IS THE DIALOG'S ON THE ORIGINAL AND THE CALLER'S HERE. `Z` checks
     `account.login` in its own mount effect and, if false, pops itself and navigates to
     /login/signin — a dialog that closes itself on the frame it opens. Expressing that in React
     means calling a parent's setter from an effect, which is the cascading render
     `react-hooks/set-state-in-effect` rejects; the observable behaviour is identical if the
     decision is made before the dialog mounts, so it is made here. The row carries
     `needLogin: true` anyway, so it does not render for a visitor who could take this branch —
     it is written because the original's guard is real, not because this path is reachable. */
  const handleAction = (action) => {
    if (action !== 'refer') return;
    if (!session.login) {
      navigate('/login/signin');
      return;
    }
    setReferOpen(true);
  };

  /* The Gift Card card (in the BC Token card's slot): signed out, the sign-in dialog, as the
     Refer and Earn row does; signed in, the redeem dialog as local state. */
  const openGiftCard = () => {
    if (onCloseMobile) onCloseMobile();
    if (!session.login) {
      navigate('/login/signin');
      return;
    }
    setGiftOpen(true);
  };

  // Main nav items with submenu data from original HTML
  const mainNavItems = [
    {
      id: 'casino', label: 'Casino', colorIcon: 'casino', hasArrow: true, href: '/casino',
      subItems: [
        // needLogin entries are hidden until there is an auth state to gate them on.
        { label: 'Favorites', menuIcon: 'favorites1', href: '/favorite', needLogin: true },
        { label: 'Recent', menuIcon: 'recent', href: '/recent', needLogin: true },
        /* `flyout` names a list in originals.js. `hasSubArrow` only draws the chevron — the
           two Sports Provider rows carry it too and have no list here, so they render the
           chevron and open nothing, which is what they already did. */
        { label: brandLabel('BC Originals'), icon: 'bc-originals-svg', href: '/casino/brand', hasSubArrow: true, flyout: 'originals' },
        { label: brandLabel('BC Exclusive'), menuIcon: 'bc_exlusive', href: '/section/exclusive' },
        { label: 'Hot Games', menuIcon: 'hotgame', href: '/casino/hot' },
        { label: 'Slots', menuIcon: 'slots', href: '/casino/slots' },
        { label: 'Live Casino', menuIcon: 'liveevents', href: '/casino/live' },
        { label: 'Game Shows', menuIcon: 'game_shows', href: '/casino/game-shows' },
        { label: 'New Releases', menuIcon: 'newreleases', href: '/casino/new' },
        // Pachinko, Pachislot and Crash Games exist in the bundle's menu definition
        // but do not render on the live site — they are gated off by brand/region
        // config. Do not "restore the missing items" from the bundle alone.
        { label: 'Bingo', menuIcon: 'bingo_home', href: '/bingo' },
        { label: 'Table Games', menuIcon: 'tablegame', href: '/casino/table-game' },
        { label: 'Providers', menuIcon: 'favorites', href: '/casino/provider' },
      ]
    },
    {
      id: 'sports', label: 'Sports', colorIcon: 'sports', hasArrow: true, href: '/sports',
      /* The exchange's sports tree, not a fixed list — see SportsMenu.jsx. The original's
         "Provider Betby" / "Provider BTi" rows are gone: this platform has neither. */
      tree: 'sports',
      subItems: [],
    },
    /* DELIBERATE DEPARTURE FROM THE ORIGINAL, on the user's request: bc.game's menu has a
       Predictions row here (`/predictions`) and a Crypto Futures group (`/trading/contract`,
       High Low / Up Down / High Low Spread / Tap Trading) after a Lottery group (`/lottery`: My
       bets, All lotteries, Favorites, BC Lottery, Popular). This platform offers none of the
       three, so all are gone rather than left pointing at the catch-all. The pixel check expects
       the sidebar to be three rows shorter than the reference — see
       .claude/skills/hash-ui-fidelity, "Deliberate departures". */
    {
      id: 'promotions', label: 'Promotions', colorIcon: 'promotion', hasArrow: true, href: '/promotions/promotion',
      subItems: [
        { label: 'Deposit Bonus', menuIcon: 'deposit_offer', href: '/deposit-offer' },
        { label: 'Daily Contest', menuIcon: 'dailycontest', href: '/promotions/daily-contest' },
        { label: 'Weekly Raffle', menuIcon: 'weekly_raffle', href: '/promotions/weekly-raffle' },
        /* The one row in the whole menu whose `link` is NOT a path: `link: "refer"` with
           `label: () => ""`. It is a marker the row renderer special-cases, not a route — `le`
           in `NavItem--aJiS2FS.js` tests `buttonName !== "sidebar_promotion_refer"` and takes a
           branch that supplies its own label, `t("Refer and Earn")`, and emits `open-refer`
           instead of navigating. That is why the row has no href here either; `action` is this
           build's name for the same marker. Its `hostHidden: m.mobile` also hides it on a
           phone, which is not reproduced — this sidebar's drawer is the same tree. */
        { label: 'Refer and Earn', menuIcon: 'referearn', needLogin: true, action: 'refer' },
        { label: 'View All', menuIcon: 'view_all', href: '/promotions/promotion' },
      ]
    },
  ];

  // Bottom group items (use menu_icon_img - grey sprite)
  const bottomItems = [
    /* `/vip-detail`, not `/vip`. Both are the original's and both land on the same page —
       `/vip` carries `guards: [() => "/vip-detail"]`, a guard returning a path, which is how
       that router spells a redirect — but pointing the row at the destination is what lets the
       plain `pathname === href` test below light it up without following the redirect first. */
    { id: 'vip',          label: 'VIP Club',              menuIcon: 'vip_club',       isVip: true, href: '/vip-detail' },
    /* SIGNED-IN ONLY, and both come straight out of `Kt` in index-DuwOs_Mv.js, in this order,
       directly under VIP Club:

         h.login && { label: e("Bonus"),     link: "/bonus",  icon: "bonus" }
         { label: e("Quest Hub"), link: "/quests", icon: "quest",
           guard: { hostHidden: !h.login || !1 }, tag: "unread" }

       Neither page is built, so both fall through to the catch-all. `tag: "unread"` puts an
       unread dot on Quest Hub; there is no notification feed here to count, so it is not drawn.
       The `bonus` and `quest` sprite cells are in the sheet and always were — this file just
       did not carry their two coordinates until the whole 113 went in. */
    { id: 'bonus',        label: 'Bonus',                 menuIcon: 'bonus',          href: '/bonus',  needLogin: true },
    { id: 'quests',       label: 'Quest Hub',             menuIcon: 'quest',          href: '/quests', needLogin: true },
    /* `/referral-exhibition`, not `/referral`, for the same reason VIP points at `/vip-detail`
       above: the row should carry the path that actually renders, so `pathname === href` lights
       it up without chasing a redirect. `/referral` is the signed-in dashboard and is not
       built — see the routes in App.jsx. */
    { id: 'referral',     label: 'Referral',              menuIcon: 'affiliate',      href: '/referral-exhibition' },
    /* THE EXTERNAL ROWS CARRY THEIR REAL URL. They were `external: true` with no
       href, which rendered `<a href="#" target="_blank">` — a row that opened a blank tab on
       the current page, which is worse than an inert one.

       The hosts are `Kt`'s own template literals, and the two it interpolates are NOT the same
       host, which is the thing to get right rather than tidy:

         Forum                   `https://forum.${m.host}/`             -> forum.hash.game
         Blog                    `https://blog.${m.license.host}/`      -> blog.bc.game
         Sport Betting Insights  `https://betting.${m.license.host}/${t ?? ""}`

       `m.host` is the deploy's own origin and `m.license.host` the licensed brand's, which is
       exactly the bc.game / hash.game split documented at the top of CLAUDE.md — so Forum goes
       to hash.game and the other two to bc.game. The rendered mobile DOM confirms all three.

       `t` on the last one is `["bn","uk","ru","pt","hi"].find(i => lang === i)` — a locale
       suffix for five languages only, `undefined` for en-US, which the `?? ""` turns into the
       bare host. This build is en-US, so the empty arm is the only reachable one.

       Forum (between Referral and Provably Fair on the original) is removed on the user's
       request — this platform has no forum. Sport Betting Insights (last, after Blog) is removed
       on the user's request too, as is the Sponsorships group that sat below this block. A deliberate departure; see the note over the
       Predictions gap above. */
    { id: 'fair',         label: 'Provably Fair',         menuIcon: 'fair',           href: '/help/provably-fair' },
    { id: 'responsible',  label: 'Responsible Gambling',  menuIcon: 'account',        href: '/responsible/faq' },
    /* Blog (blog.bc.game) removed: BC.GAME's blog, no Parker567 equivalent. */
  ];

  return (
    <>
    <aside
      className={`sidebar-container ${mobileOpen ? 'mobile-open' : 'hidden lg:flex'} ${isExpanded ? 'expanded' : 'collapsed'}`}
      /* Leaving the sidebar entirely closes the panel. The panel has its own mouseleave too;
         this is the case where the pointer goes UP or LEFT out of the aside without ever
         entering the bridge. */
      onMouseLeave={() => setFlyout(null)}
    >
      <div className="sidebar-scrollable">
        {/* THE FILL IS A BRANCH ON THE ORIGINAL, NOT A CONSTANT. `Ln` in index-DuwOs_Mv.js
            writes this element as

              m.mobile ? "bg-transparent" : "overflow-hidden bg-layer3 p-4"

            i.e. the rail paints layer3 and pads itself, and the drawer paints nothing at all —
            because on a phone the menu renders inside `#page-content` and simply sits on the
            page background. This build's drawer is a fixed overlay instead, so it keeps the
            `p-4` as its own gutter (the page's `px-4` is what supplies it there) but drops the
            fill, which is what the container's own page-coloured background is for. That is
            three `background-color: … !important` overrides in Sidebar.css it replaces. */}
        <div className="overflow-hidden p-4 max-lg:bg-transparent lg:bg-layer3">
          <nav>
            <div className="overflow-hidden w-full lg:w-[208px]">

              {/* ============================================================ */}
              {/* 1. APPLICATION BANNER  (expanded only)                        */}
              {/* ============================================================ */}
              {/* HIDDEN: its artwork (`pwa.png` / `pwa_w.png`) is a phone mock of BC.GAME's own
                  site, and `/events/app-download-recall` is not built, so it was another brand's
                  marketing linking to the catch-all. Parker567 ships no app; turn this back on
                  with our own artwork and page if one is ever made. */}
              {isExpanded && SHOW_APP_CARD && (
              <div className="sidebar-banner-block mb-2">
                {/* `/events/app-download-recall`, the third arm of `Tt`'s host switch — the
                    other two are the Mexico and Kenya builds, and this one is the `when: !0`
                    fallback every other deploy takes. Not built, so it lands on the catch-all;
                    the `inactive` class the original writes beside it is a dead class here as
                    it is there. */}
                <Link to="/events/app-download-recall" className="block transition-none" onClick={onCloseMobile}>
                  <div className="sidebar-app-banner flex cursor-pointer justify-between overflow-hidden rounded-lg">
                    <div className="flex flex-col justify-center p-4 lg:p-2.5 lg:pr-0">
                      <h3 className="text-base font-extrabold text-primary lg:text-sm">Application</h3>
                      {/* NO LEADING CLASS, WHICH IS THE ORIGINAL'S OWN OMISSION AND IS LOAD-BEARING
                          AT BOTH ENDS. `R` in index-DuwOs_Mv.js writes exactly
                          `mt-1 text-wrap text-sm font-semibold text-secondary sm:text-xs`.

                          On desktop the omission is what lands the card on 76px: text-xs's 16px
                          line box makes two subtitle lines 32, and 10 + 20 + 4 + 32 + 10 = 76.

                          In the drawer it is what lands it on 79.25px — 1rem + 1.5 + .25 + 1.25 +
                          1 = 5rem, times the 15.85px root `remScale` gives a 426px viewport. A
                          `max-lg:leading-[1.15rem]` stood here for a while and cost exactly the
                          0.1rem it removed, rendering 77.67 where the original renders 79.25. */}
                      <p className="mt-1 text-wrap text-sm font-semibold text-secondary lg:text-xs">Unlock Exclusive App Rewards</p>
                    </div>
                    <div className="sidebar-app-img-wrap flex-none">
                      {/* THE ARTWORK IS A `[dark, light]` PAIR, and the chunk gives both halves
                          outright — `index-DuwOs_Mv.js` (which IS in the mirror) declares

                            const wt = "/assets/pwa-CUqa7I_R.png",
                                  $t = "/assets/pwa-BZ3pIIs5.png",
                                  yt = () => se(wt, $t);

                          where `se` is `V8` out of index-BsFv7ByC.js, i.e.
                          `(t, e) => Ce.darken ? t : e`. So the first is the dark file and the
                          second the light one; `pwa_w.png` is that second file, 954x1944 like its
                          twin. Note this build's `pwa.png` and the original's `pwa-CUqa7I_R.png`
                          carry the same content hash, which is what confirms the one already here
                          is the DARK half rather than a resave of something else.

                          Picked in JS rather than as a `dark:hidden` pair of `<img>`s, so a
                          visitor downloads one 230KB image and not both. Same arrangement the
                          header logo uses. */}
                      <img alt="PWA app" src={darken ? pwaImg : pwaLightImg} />
                    </div>
                  </div>
                </Link>
              </div>
              )}

              {/* ============================================================ */}
              {/* 2. GIFT CARD  (expanded only)                                 */}
              {/* ============================================================ */}
              {/* THE BC TOKEN CARD'S SLOT, REPURPOSED ON THE USER'S REQUEST. The original's `/bc`
                  ticker (a token page this platform does not have, with a hard-coded price and
                  holder count) is replaced by a Gift Card entry that keeps the card exactly:
                  same `.bc-token-*` classes, padding, logo circle, title type and arrow button.
                  The logo is the header's own gift glyph (`$r`, Enter-MsmOuq5R.js) and the price
                  line becomes a one-line subtitle in the price row's place. Hidden when the
                  owner's `gift_cards` feature or the site's `giftcards` flag is off, on a B2B
                  site, and for an agent's player (services/gates.js `giftcards`). */}
              {isExpanded && gates.on('giftcards') && (
              <div className="bc-token-entry">
                <button
                  type="button"
                  className="sidebar-bc-token-link relative z-10 block w-full rounded-lg text-left"
                  onClick={openGiftCard}
                >
                  <div className="bc-token-inner flex items-center rounded-lg px-3 py-3 pb-2 pl-[1.2em] lg:mb-2 lg:px-2 lg:py-2 lg:pl-[0.8em]">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center lg:mb-2">
                        <div className="center rounded-full mr-1.5 size-[1.625em] shrink-0 lg:mr-1 lg:size-4">
                          <IconGift className="size-full fill-current text-brand" />
                        </div>
                        <span className="mr-1 text-lg font-semibold leading-[1.375em] text-primary lg:text-sm lg:leading-[18px]">Gift Card</span>
                      </div>
                      <div className="mb-2 flex items-center lg:mb-0">
                        <span className="text-sm font-semibold leading-9 text-secondary lg:text-xs lg:leading-6">Redeem your gift card</span>
                      </div>
                    </div>
                    <div className="arrow-button center flex size-6 rounded lg:size-5">
                      <ArrowSvg className="rotate-180" />
                    </div>
                  </div>
                </button>
              </div>
              )}

              {/* ============================================================ */}
              {/* 3. MAIN NAV ITEMS (color_icon_img sprite)                     */}
              {/* ============================================================ */}
              {mainNavItems.filter((item) => gates.routeOn(item.href)).map(item => (
                <div key={item.id} className="Sidebar-Unit_bg mt-1 overflow-hidden rounded-lg">
                  {/* Header row */}
                  <div
                    className={`toggle-link-item flex h-10 w-full cursor-pointer items-center px-3 lg:px-0 ${isOpen(item.id) ? 'toggle-link-item-open' : ''} ${activeMenu === item.id || item.id === routeGroup ? 'toggle-link-item-active' : ''}`}
                    onClick={() => handleRowClick(item.id, item.href)}
                  >
                    <div className="nav-scale-box center flex-none lg:size-10">
                      <div className={`color_icon_img scale-[80%] ${item.colorIcon}`}></div>
                    </div>
                    <span className="sidebar-collapse-hide ml-2 flex-1 overflow-hidden whitespace-nowrap text-base font-semibold lg:ml-0 lg:text-sm">
                      {item.label}
                    </span>
                    {item.hasArrow && (
                      <button
                        className="sidebar-collapse-hide arrow-button center ms-auto flex size-6 rounded p-0 lg:me-2 lg:size-5"
                        type="button"
                        onClick={(e) => handleArrowClick(e, item.id)}
                      >
                        <ArrowSvg className={isOpen(item.id) ? 'rotate-90' : '-rotate-90'} />
                      </button>
                    )}
                  </div>

                  {/* Expanded submenu — never shown while the sidebar is collapsed */}
                  {isExpanded && isOpen(item.id) && item.tree === 'sports' && (
                    <div className="overflow-hidden">
                      <div className="h-0 w-full border-t border-third"></div>
                      <div className="px-1.5 pb-1">
                        <SportsMenu Arrow={ArrowSvg} onCloseMobile={onCloseMobile} />
                      </div>
                    </div>
                  )}
                  {isExpanded && isOpen(item.id) && item.subItems && item.subItems.length > 0 && (
                    <div className="overflow-hidden">
                      <div className="h-0 w-full border-t border-third"></div>
                      <div className="px-1.5 pb-1">
                        {shown(item.subItems).map((sub, idx) => (
                          <SubNavLink
                            key={idx}
                            item={sub}
                            flyoutOpen={Boolean(sub.flyout) && sub.flyout === flyout}
                            onFlyout={setFlyout}
                            onCloseMobile={onCloseMobile}
                            onAction={handleAction}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* ============================================================ */}
              {/* 4. BOTTOM GROUP (VIP, Referral, Provably Fair, etc.)        */}
              {/* ============================================================ */}
              {/* An item with an `href` is a built page and renders a router <Link> with the
                  active state, the same rule the submenu rows follow; the rest keep the inert
                  `href="#"` and the `inactive` marker they had, because sending an unbuilt page
                  to the catch-all would silently show Home. VIP Club is the only one so far. */}
              <div className="Sidebar-Unit_bg relative my-3 w-full rounded-lg px-0 pb-2 pt-1 lg:my-2 lg:p-0">
                {shown(bottomItems).map(item => {
                  const active = Boolean(item.href) && pathname === item.href;
                  const className = `nav-link-item relative flex h-10 w-full cursor-pointer items-center rounded-lg px-3 lg:pl-0 lg:pr-2 overflow-hidden mt-1 ${
                    active ? 'nav-link-active' : 'inactive'
                  }`;
                  const body = (
                    <>
                      <div className="nav-scale-box center flex flex-none lg:size-10">
                        {/* `menu_icon_img_active` REPLACES `menu_icon_img_normal` on the active
                            row — the original's own arrangement, a class on the icon rather
                            than a descendant selector off the row. It swaps to the green sheet,
                            which is local now. */}
                        <div
                          className={`menu_icon_img ${active ? 'menu_icon_img_active' : 'menu_icon_img_normal'} ${item.menuIcon}`}
                        ></div>
                      </div>
                      <span className="sidebar-collapse-hide ml-2 whitespace-nowrap text-base font-semibold lg:ml-0 lg:text-sm">
                        {item.isVip ? (
                          <><span className="text-brand">VIP</span><span className="mx-1">Club</span></>
                        ) : item.label}
                      </span>
                      {item.external && isExpanded && <ExternalSvg />}
                    </>
                  );

                  /* AN EXTERNAL ROW MUST NOT BE A ROUTER <Link>, and that is why this is a
                     three-way branch rather than the two-way one it used to be. `<Link to>`
                     treats its value as a path within the app, so an absolute URL handed to it
                     is pushed onto the history stack as a relative path and the browser never
                     leaves the SPA. The three external rows carry a real href now, so they take
                     a plain anchor.

                     No `onCloseMobile` on that arm: the tab opens elsewhere and this one stays
                     where it was, so closing the drawer under the user would be wrong. That
                     asymmetry was already here and is kept deliberately. */
                  if (item.external) {
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                      >
                        {body}
                      </a>
                    );
                  }

                  return item.href ? (
                    <Link
                      key={item.id}
                      to={item.href}
                      className={className}
                      aria-current={active ? 'page' : undefined}
                      onClick={onCloseMobile}
                    >
                      {body}
                    </Link>
                  ) : (
                    <a
                      key={item.id}
                      href="#"
                      className={className}
                      onClick={(e) => {
                        e.preventDefault();
                        if (onCloseMobile) onCloseMobile();
                      }}
                    >
                      {body}
                    </a>
                  );
                })}
              </div>

              {/* ============================================================ */}
              {/* 6. LIVE SUPPORT                                               */}
              {/* ============================================================ */}
              {LIVE_SUPPORT_AVAILABLE && (
              <div className="Sidebar-Unit_bg nav-link-same rounded-lg">
                <div className="nav-link-item mt-3 flex h-10 w-full cursor-pointer items-center overflow-hidden rounded-lg px-3 lg:mt-1 lg:p-0">
                  <div className="nav-scale-box center size-[32px] flex-none lg:size-10">
                    <HeadphonesSvg />
                  </div>
                  <span className="sidebar-collapse-hide ml-2 whitespace-nowrap text-base font-semibold text-primary lg:ml-0 lg:text-sm">Live Support</span>
                </div>
              </div>
              )}

              {/* ============================================================ */}
              {/* 7. LANGUAGE & CURRENCY ROW                                   */}
              {/* ============================================================ */}
              {/* SIDE BY SIDE IN THE DRAWER, STACKED IN THE RAIL — `flex-col` is a `sm:` arm on
                  the original and so belongs to the compact form, not to any width. Left at `sm:`
                  it stacked two full-width rows in the 640..1023 drawer, where the row has 343px
                  to play with and the original puts them next to each other. */}
              <div className="mt-3 flex items-center justify-between gap-3 lg:mt-2 lg:flex-col lg:gap-0">
                <div className="Sidebar-Unit_bg nav-link-same flex-1 overflow-hidden rounded-lg lg:w-full">
                  <div
                    className="nav-link-item flex h-11 flex-1 cursor-pointer items-center px-3 lg:h-10 lg:p-0"
                    onClick={() => openLangModal('language')}
                  >
                    <div className="nav-scale-box center size-[32px] flex-none lg:size-10">
                      <GlobeSvg />
                    </div>
                    <span className="sidebar-collapse-hide ms-2 whitespace-nowrap text-base font-semibold text-primary lg:ms-0 lg:text-sm">{languageName(session.setting.lang)}</span>
                    <div className="sidebar-collapse-hide arrow-button ms-auto flex size-6 items-center justify-center rounded p-0 lg:me-2 lg:size-5">
                      <ArrowSvg className="rotate-180" />
                    </div>
                  </div>
                </div>
                <div className="Sidebar-Unit_bg nav-link-same flex-1 overflow-hidden rounded-lg lg:mt-1 lg:w-full">
                  <div
                    className="nav-link-item flex h-11 flex-1 items-center px-3 lg:h-10 lg:p-0 cursor-pointer"
                    onClick={() => openLangModal('currency')}
                  >
                    <div className="nav-scale-box center size-[32px] flex-none lg:size-10">
                      {/* THE ROWS PRINT THE SAME `setting` FIELDS THE PICKER WRITES, as Settings ›
                          Preferences does. They were the literals "English" / "USD", so a pick
                          landed in the store and the sidebar never moved. "None" (conversion
                          off) draws the picker's own None disc. */}
                      {session.setting.enableLocaleCurrency ? (
                        <img alt="coin" className="h-6 lg:h-5" src={coinIcon(session.setting.localeCurrencyName)} />
                      ) : (
                        <span className="flex size-6 items-center justify-center rounded-full bg-[#6b7280] text-[0.625rem] font-black leading-none text-white lg:size-5">★</span>
                      )}
                    </div>
                    <span className="sidebar-collapse-hide ms-2 whitespace-nowrap text-base font-semibold text-primary lg:ms-0 lg:text-sm">
                      {session.setting.enableLocaleCurrency
                        ? getAlias(session.setting.localeCurrencyName).replace(/FIAT$/, '')
                        : 'None'}
                    </span>
                    <div className="sidebar-collapse-hide arrow-button ms-auto flex size-6 items-center justify-center rounded p-0 lg:me-2 lg:size-5">
                      <ArrowSvg className="rotate-180" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* 8. DARK / LIGHT TOGGLE                                        */}
              {/* ============================================================ */}
              <div className="w-full overflow-hidden">
                <div className="mt-2 h-10 w-full cursor-pointer rounded-lg p-0.5 font-semibold Sidebar-Unit_bg">
                  <div className="relative flex h-9 w-full">
                    <div
                      className="absolute top-0 h-full w-1/2 rounded-lg bg-layer6 transition-all ease-out"
                      style={{ insetInlineStart: darkMode ? '0px' : '50%' }}
                    />
                    {/* div, not button — the original uses a div here, and a <button>
                        wraps its children in a UA anonymous box that resists the flex
                        centring, leaving the label sitting off-centre. */}
                    <div
                      className="center relative h-9 w-1/2"
                      onClick={() => setDarkMode(true)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDarkMode(true)}
                      role="button"
                      tabIndex={0}
                    >
                      <svg viewBox="0 0 32 32" className={`icon size-4 ${darkMode ? 'fill-primary' : 'fill-tertiary'}`}>
                        <path d="M24.4301 19.6621C18.7339 18.9421 14.2649 14.488 13.5284 8.86041L13.5217 8.79669C13.4696 8.37131 13.4398 7.87807 13.4398 7.37821C13.4398 6.64165 13.5044 5.92 13.6285 5.21903L13.6177 5.29352C13.626 5.24138 13.631 5.18179 13.631 5.12138C13.631 4.50234 13.1286 4 12.5096 4C12.378 4 12.2514 4.02234 12.1347 4.06455L12.1421 4.06207C7.48201 5.91338 4.2478 10.3832 4.2478 15.6086C4.2478 22.4519 9.79594 28 16.6393 28C21.3921 28 25.5201 25.3236 27.599 21.3959L27.6313 21.3288C27.7074 21.1823 27.7521 21.0094 27.7521 20.8257C27.7521 20.2149 27.2564 19.7192 26.6456 19.7192C26.6241 19.7192 26.6017 19.72 26.5802 19.7208H26.5835C26.3593 19.7357 26.0977 19.744 25.8346 19.744C25.3397 19.744 24.8514 19.7142 24.3722 19.6563L24.4301 19.6621Z" />
                      </svg>
                      {/* 14px, measured on the live site. The saved bundle applies only
                          `ml-1` here with no size class, but the rendered size is 14px —
                          another case of the template disagreeing with the real page. */}
                      <span className={`theme-toggle-label sidebar-collapse-hide ml-1 text-sm ${darkMode ? 'text-primary' : 'text-tertiary'}`}>Dark</span>
                    </div>
                    <div
                      className="center relative h-9 w-1/2"
                      onClick={() => setDarkMode(false)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDarkMode(false)}
                      role="button"
                      tabIndex={0}
                    >
                      <svg viewBox="0 0 32 32" className={`icon size-4 ${!darkMode ? 'fill-primary' : 'fill-tertiary'}`}>
                        {/* All 8 subpaths: 7 rays plus the disc. Note the two lower rays
                            come BEFORE the disc in the source order — an earlier copy
                            started at the disc (M15.9999) and silently lost them. */}
                        <path d="M10.9053 24.3657C10.9583 24.3699 11.0104 24.3841 11.0584 24.4083L13.1591 25.458C13.3675 25.5624 13.4547 25.8202 13.3529 26.0338C13.3293 26.0831 13.2967 26.1273 13.2576 26.164L10.9265 28.3303C10.7547 28.4897 10.4893 28.4764 10.3329 28.3003C10.2556 28.2127 10.2165 28.0967 10.2255 27.9799L10.4559 24.7638C10.473 24.5268 10.6741 24.3482 10.9053 24.3657ZM21.5024 24.6069C21.526 24.6561 21.5399 24.7095 21.5439 24.7638L21.7744 27.9799C21.7915 28.2169 21.6172 28.4238 21.386 28.4405C21.2712 28.4488 21.158 28.4088 21.0733 28.3303L18.7422 26.164C18.5704 26.0046 18.5574 25.7318 18.7129 25.5557C18.7487 25.5148 18.7919 25.4822 18.8399 25.458L20.9406 24.4083C21.149 24.304 21.4006 24.3924 21.5024 24.6069ZM15.9999 8.83009C20.1769 8.83009 23.5624 12.3007 23.5624 16.5816C23.5624 20.8625 20.176 24.3323 15.9991 24.3323C11.8222 24.3323 8.43581 20.8617 8.43581 16.5816C8.43581 12.3015 11.8222 8.83009 15.9991 8.83009H15.9999ZM25.5328 17.1825C25.5849 17.195 25.6346 17.2175 25.6777 17.2484L28.2612 19.0884C28.4518 19.2244 28.499 19.4923 28.3663 19.6876C28.3003 19.7844 28.1994 19.8495 28.0854 19.867L24.9759 20.3602C24.7463 20.3969 24.5321 20.2358 24.4963 20.0005C24.4882 19.9463 24.4898 19.8912 24.502 19.8378L25.028 17.5037C25.0801 17.2717 25.3056 17.1274 25.532 17.1808L25.5328 17.1825ZM6.90671 17.356C6.93683 17.4011 6.95882 17.4512 6.97103 17.5046L7.49702 19.8386C7.54913 20.0706 7.40827 20.3018 7.18191 20.3552C7.1298 20.3677 7.07607 20.3694 7.02314 20.361L3.91364 19.8678C3.68403 19.8311 3.52688 19.6116 3.56271 19.3763C3.58062 19.2595 3.64331 19.156 3.73776 19.0884L6.32128 17.2484C6.51181 17.1124 6.7748 17.1608 6.90671 17.356ZM26.0376 8.61312C26.0718 8.72578 26.0588 8.84761 26.0034 8.95025L24.4686 11.765C24.3554 11.9728 24.0998 12.047 23.897 11.931C23.8506 11.9043 23.8091 11.8685 23.7757 11.8259L22.3052 9.96415C22.1595 9.77973 22.1872 9.50852 22.3671 9.35832C22.4086 9.3241 22.4567 9.29823 22.5072 9.28154L25.5124 8.32773C25.7339 8.25763 25.9692 8.38447 26.0384 8.61145L26.0376 8.61312ZM6.4882 8.3294L9.49348 9.28321C9.71495 9.35331 9.83953 9.59448 9.77032 9.82229C9.75485 9.87486 9.72879 9.92326 9.69541 9.96582L8.22493 11.8276C8.07918 12.012 7.81456 12.0412 7.63381 11.891C7.59228 11.8568 7.55727 11.8142 7.53121 11.7666L5.99641 8.95192C5.88323 8.74414 5.9557 8.48211 6.15844 8.36611C6.25859 8.30853 6.37746 8.29602 6.48738 8.33107L6.4882 8.3294ZM16.1562 3.58868C16.2629 3.63208 16.3476 3.71886 16.3899 3.82818L17.5583 6.82231C17.6446 7.04345 17.5396 7.2938 17.3247 7.38225C17.275 7.40228 17.2221 7.41313 17.1683 7.41313H14.8315C14.5995 7.41313 14.4114 7.22036 14.4114 6.98254C14.4114 6.92746 14.422 6.87322 14.4415 6.82231L15.6099 3.82818C15.6962 3.60704 15.9405 3.50023 16.1562 3.58868Z" />
                      </svg>
                      <span className={`theme-toggle-label sidebar-collapse-hide ml-1 text-sm ${!darkMode ? 'text-primary' : 'text-tertiary'}`}>Light</span>
                    </div>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* 9. TURBO MODE  (drawer only)                             */}
                {/* ======================================================== */}
                {/* THIS ROW IS GENUINELY MOBILE-ONLY, and that is the chunk's own gate rather
                    than a guess made to keep the desktop rail unchanged. `tn` in
                    index-DuwOs_Mv.js is

                      <Show when={m.mobile || N.lite}>          <- the card itself
                        ...
                        <Show when={m.mobile}>                  <- the description under it
                          Reduces effects. Enables Turbo Mode for games.

                    so the desktop rail draws it only once lite mode is ALREADY on — an escape
                    hatch for turning it back off, not part of the rail's normal content — and
                    never draws the description. There is no lite setting in this build, so the
                    card renders in the drawer and nowhere else, which is what `m.mobile` means
                    on a phone anyway.

                    It sits INSIDE the theme toggle's `w-full overflow-hidden` wrapper because
                    that is where the template puts it: `B` holds `[Je, tn]` under one
                    `<Show when={!fold}>`, so folding the rail takes both away together.

                    The switch is inert — `N.lite` drives GSAP and the games' own effects, and
                    neither exists here. It carries local state so the control still answers to
                    a tap rather than looking broken. */}
                <div className="Sidebar-Unit_bg mt-2 w-full rounded-lg p-3 lg:hidden">
                  <div className="flex w-full items-center">
                    <BoltSvg />
                    <span className="ml-1 font-extrabold text-primary">Turbo Mode</span>
                    {/* `size: "small"` is `.switch-xs`, the same primitive Do Not Disturb and
                        Hide Small use. A <div> with role=switch, not a <button>: it is the
                        original's own markup and the rules in index.css key off aria-checked. */}
                    <div
                      className="switch switch-xs ml-auto"
                      role="switch"
                      aria-checked={turboMode}
                      aria-label="Turbo Mode"
                      tabIndex={0}
                      onClick={() => setTurboMode(v => !v)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setTurboMode(v => !v)}
                    >
                      <div />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-tertiary">
                    <p>Reduces effects. Enables Turbo Mode for games.</p>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* 10. JOIN OUR GLOBAL COMMUNITY  (drawer only, signed out)     */}
              {/* ============================================================ */}
              {/* `Bt` in index-DuwOs_Mv.js, appended to the end of the <nav> — the template
                  wraps it in a `<Show when={!0}>` that does nothing, and the real gate is
                  inside:

                    <Show when={m.mobile && !h.login}>
                      <div class="Sidebar-Unit_bg mt-2 rounded-lg px-3 py-2">
                        <p class="m-0 text-center text-base text-primary">…</p>
                        <ul class="mt-2 flex items-center justify-between"> …

                  so it is drawer-only AND signed-out-only, and both halves are reproduced.
                  Being outside the theme toggle's wrapper is the template's own arrangement:
                  it is a child of <nav>, not of `B`, so unlike Turbo Mode it does not
                  disappear with the fold — which never comes up here, since it cannot render
                  at a width where the rail exists.

                  THE EIGHTH LINK IS NOT THE EIGHTH SOCIAL. The list is

                    g.bcmx ? Q() : [...Q().slice(0, -1), { link: origin + "/telegram",
                                                           icon: De, label: "Global" }]

                  i.e. everywhere but the Mexico build the last of the eight is DROPPED and
                  hash.game's own globe mark takes its place — which is why the row still shows
                  eight marks and the last one is a paper plane in a globe rather than the set's
                  own final entry. `De` is IconGlobal, the same mark the footer prints under
                  "Join Our Local Community". */}
              {/* The signed-out community card (BC.GAME's socials + hash.game/telegram) is removed:
                  Parker567 has no social channels to list. */}

            </div>
          </nav>
        </div>
      </div>

      <LanguageCurrencyModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        initialTab={langModalTab}
        /* `merged`, for the same reason the header passes it: `index-DuwOs_Mv.js` — this
           sidebar's own menu module — emits `open-lanfiat` from both rows, 0 from Language and 1
           from Currency. The combined panel, opened on the row you clicked. */
        merged
      />
    </aside>

    {/* Sibling of the aside, not a child — `.sidebar-container` clips. The CSS sibling
        selector that shifts it to 72px when the sidebar folds depends on this order. */}
    {flyout && FLYOUTS[flyout] && (
      <Flyout games={FLYOUTS[flyout]} onClose={() => setFlyout(null)} />
    )}

    {/* Outside the <aside> for tidiness rather than necessity — PopCenter portals to <body>, so
        `.pop-overlayer`'s z-index resolves against the root stacking context wherever this is
        declared. It is the flyout that genuinely has to sit here, because it does not portal. */}
    <Refer open={referOpen} onClose={() => setReferOpen(false)} />
    {giftOpen && <GiftCardDialog onClose={() => setGiftOpen(false)} />}
    </>
  );
}
