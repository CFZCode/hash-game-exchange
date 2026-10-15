import { getAlias } from '../../../utils/currency';
import { CHAT_AVAILABLE } from '../../../services/availability';
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../../../assets/logo.png';
import logoLightImg from '../../../assets/logo_w.png';
import LanguageCurrencyModal from '../../../components/modals/LanguageCurrencyModal';
import { useSession } from '../../../context/session';
import { useCanSignUp } from '../../../context/gates';
import { useSettings } from '../../../context/settings';
import { siteName, useSiteLogo } from '../../../services/siteBranding';
import AfterLogin, { MobileAfterLogin } from './AfterLogin';
import './Header.css';

/* The mobile header's background fades IN as the page scrolls, from `ks()` in
 * Enter-MsmOuq5R.js:
 *
 *   const s = N(() => m.remScale * 56 * 2);            // threshold
 *   const l = N(() => Math.min(1, o() / s()));         // o() is scrollTop
 *   u.className = "page-header alpha-layer4 ...";
 *   M(() => u.style.setProperty("--tw-bg-opacity", String(l())));
 *
 * with `.alpha-layer4 { background-color: rgb(var(--layer4) / var(--tw-bg-opacity)) }`. So the
 * bar is transparent over the hero at the top of the page and reaches solid layer4 once you
 * have scrolled `remScale * 112` px. Because remScale is rootFontSize / 16, that threshold is
 * exactly 7 root font-sizes — 7rem — at every width, which is how it is read below.
 *
 * The fade is ROUTE-DEPENDENT, which is the rest of `ks()`:
 *
 *   const n = N(() => ["/", "/casino"].indexOf(e.pathname) !== -1);
 *   Re(() => i(n() ? 0 : s()));                        // seed 0 on those two, the threshold elsewhere
 *   Mt(window, () => n() ? "scroll" : "", u => i(t.scrollTop));
 *
 * Home and Casino are the only pages that start transparent — they are the two that open with
 * artwork under the bar. Everywhere else the scroll position is seeded AT the threshold, which
 * makes `min(1, o/s)` exactly 1, and no listener is bound at all: the bar is simply solid. That
 * is why the listener is conditional rather than always-on; it was always-on here until there
 * was a router to ask.
 *
 * One departure left: the original writes the value straight through a signal on every scroll
 * event, where this coalesces to one write per frame — which its reactive system effectively
 * does for it anyway.
 */
const FADE_ROUTES = ['/', '/casino'];

function useHeaderScrollOpacity() {
  const { pathname } = useLocation();
  const fades = FADE_ROUTES.includes(pathname);

  const [scrollOpacity, setScrollOpacity] = React.useState(0);

  React.useEffect(() => {
    /* No listener at all off the two fading routes — the original binds on `n() ? "scroll" :
       ""`, i.e. binds nothing. */
    if (!fades) return undefined;

    const scroller = document.scrollingElement || document.documentElement;
    let frame = 0;

    const update = () => {
      frame = 0;
      /* remScale.js has already written this inline before the first render, so reading it
         costs nothing — no forced style recalculation on a scroll handler. */
      const rootPx = parseFloat(document.documentElement.style.fontSize) || 16;
      setScrollOpacity(Math.min(1, scroller.scrollTop / (rootPx * 7)));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [fades]);

  /* Derived, not stored: off the fading routes the original seeds scrollTop AT the threshold
     so `min(1, o/s)` is exactly 1. Returning 1 here says the same thing without writing state
     from an effect, and it is solid on the very first frame rather than after one. */
  return fades ? scrollOpacity : 1;
}

export default function Header({
  sidebarExpanded,
  onToggleSidebar,
  onOpenExplore,
  onToggleNotice,
  onToggleChat,
  mobileMenuOpen,
}) {
  const headerBgOpacity = useHeaderScrollOpacity();
  const navigate = useNavigate();
  const { session } = useSession();
  /* Off on a B2B site (context/gates.js): Sign In stays, Sign Up is not rendered. */
  const canSignUp = useCanSignUp();

  /* THE LOGO IS A PNG PAIR, NOT ONE FILE TINTED — `logo.png` is near-white ink (mean luminance 222
     over its opaque pixels) and disappears on the light theme's white header. The original keys
     the swap off the same flag everything else does: its image registry stores every entry as a
     `[dark, light]` tuple behind `new Proxy(Rc, _h(t => Ce.darken ? t[0] : t[1] || t[0]))`, and
     `logo.base` is `[logo-CBzjipjR.png, logo_w-Vb58juxx.png]`. `logo_w.png` is that second file,
     288x64 like its twin and luminance 41 — the same mark drawn in near-black.

     Picked in JS rather than with a `dark:hidden` pair of `<img>`s, which would make every visitor
     download both. Note `logo.small` is the SAME file on both sides of its tuple, so the square
     mark needs no twin and none was fetched. */
  const { darken } = useSettings();
  /* The owner panel's uploaded logo (live mode), or another brand's by name; nothing set answers
     null and the pair above is drawn as before. A brand logo is fitted to the box the pair draws
     in (288x64 at h-8 = 144x32), so only the picture changes. */
  const brandLogo = useSiteLogo({ own: 'hash-games' });
  const logo = brandLogo ?? (darken ? logoImg : logoLightImg);
  const logoAlt = (brandLogo && siteName()) || 'logo';
  /* The owner uploads ONE logo, drawn for the dark theme (white "JUMBO"); on the light theme it
     vanishes against the light header, so it is inverted there (index.css `.brand-logo-on-light`). */
  const logoTone = brandLogo && !darken ? ' brand-logo-on-light' : '';

  const [langModalOpen, setLangModalOpen] = React.useState(false);
  const [langModalTab, setLangModalTab] = React.useState('language');

  const openLangModal = (tab) => {
    setLangModalTab(tab);
    setLangModalOpen(true);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* Desktop Header: Hidden on mobile/tablet (< 1024px), Flex on desktop (>= 1024px) */}
      {/* ========================================================================= */}
      <div className="header hidden lg:flex fixed left-0 top-0 w-full z-[99]">
        <div className="relative flex h-full flex-1 items-center border-b border-solid border-black_alpha10">
          
          {/* Left Section: Menu Toggle + Logo. The original narrows this block to
              72px whenever the sidebar is folded, so the two stay in lockstep. */}
          <div className={`relative z-10 flex h-full flex-none items-center px-4 ${sidebarExpanded ? 'w-60' : 'w-[72px]'}`}>
            
            {/* Hamburger Menu Toggle */}
            <button 
              className="button button-m size-10 flex-none rounded-lg bg-layer5 p-0" 
              type="button" 
              aria-label="Toggle Navigation"
              onClick={onToggleSidebar}
            >
              <span className="center size-8">
                <div className="color_icon_img scale-[80%] menu"></div>
              </span>
            </button>
            
            {/* Logo container. */}
            <div className="center h-full w-40 flex-none text-[0] absolute left-16 top-0">
              <NavLink to="/">
                <img alt={logoAlt} className={(brandLogo ? 'h-8 w-36 object-contain' : 'h-8 w-auto object-contain') + logoTone} src={logo} />
              </NavLink>
            </div>
          </div>

          {/* Right Section: Actions, Search, Chat, Language */}
          <div className="relative mx-auto h-full w-full max-w-[1248px] px-4">
            {/* `overflow-hidden` IS THE SIGNED-OUT ARM'S ONLY, and the difference is load-bearing
                rather than cosmetic. The original does not share this div between the two states
                — it swaps the whole row, and the two templates differ in exactly one class:

                  Header-CTF5n6al.js `de`:
                    "absolute left-0 top-0 flex size-full items-center justify-end overflow-hidden px-3"
                  AfterLogin-Xr01UEkM.js `M1`:
                    "absolute left-0 top-0 flex size-full items-center justify-end px-3"

                This build renders one div for both branches, so it was carrying the signed-out
                clip into the signed-in state — and the account dropdown is an `absolute top-full`
                child of it, i.e. it begins exactly at the bottom edge of a 60px box that clips.
                The whole 624px panel was being clipped away: the avatar's button toggled, the
                markup mounted, and not one pixel of it could paint. Do not re-add it
                unconditionally. The confirm dialog was never affected — `.pop-overlayer` is
                `position: fixed` and this div sets no transform, so it is not clipped by it. */}
            <div
              className={`absolute left-0 top-0 flex size-full items-center justify-end px-3 ${
                session.login ? '' : 'overflow-hidden'
              }`}
            >
              
              {/* Search Button */}
              <button
                className="button button-m size-10 rounded-lg bg-layer5 p-0 flex-none"
                type="button"
                aria-label="Search"
                onClick={onOpenExplore}
              >
                <svg viewBox="0 0 32 32" className="icon size-6 fill-primary">
                  <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M12.4873 6.51953C17.7269 6.51953 21.9746 10.7672 21.9746 16.0068C21.9746 18.274 21.1793 20.3554 19.8525 21.9873L20.7295 22.8643L20.8975 22.6973C21.032 22.5629 21.2498 22.5634 21.3838 22.6982L26.2314 27.5762C26.3649 27.7105 26.3653 27.9276 26.2314 28.0615L24.4834 29.8086C24.3489 29.9431 24.1311 29.9425 23.9971 29.8076L19.1484 24.9297C19.0152 24.7954 19.0156 24.5781 19.1494 24.4443L19.2998 24.293L18.4189 23.4121C16.7945 24.7148 14.7315 25.4941 12.4873 25.4941C7.24789 25.494 3.00008 21.2463 3 16.0068C3 10.7673 7.24785 6.51972 12.4873 6.51953ZM12.4873 9.54199C8.91732 9.54219 6.02344 12.4368 6.02344 16.0068C6.02362 19.5767 8.91743 22.4705 12.4873 22.4707C16.0573 22.4707 18.952 19.5768 18.9521 16.0068C18.9521 12.4367 16.0575 9.54199 12.4873 9.54199Z"
                  />
                  <path 
                    d="M25.3447 3C25.6892 3.83219 25.9962 4.48806 26.2646 4.9668C26.533 5.44534 26.7996 5.81617 27.0635 6.08008C27.323 6.34405 27.6922 6.61046 28.1709 6.87891C28.654 7.14729 29.3046 7.4497 30.123 7.78516V8.06055C29.3135 8.39603 28.6667 8.69742 28.1836 8.96582C27.7051 9.23416 27.3319 9.50078 27.0635 9.76465C26.7995 10.0286 26.5331 10.4002 26.2646 10.8789C25.9962 11.3576 25.6892 12.0135 25.3447 12.8457H25.0703C24.7213 12.0135 24.412 11.3576 24.1436 10.8789C23.8751 10.4002 23.611 10.0286 23.3516 9.76465C23.0831 9.50077 22.7076 9.23417 22.2246 8.96582C21.746 8.69742 21.0993 8.39604 20.2852 8.06055V7.78516C21.1038 7.44964 21.7528 7.14733 22.2314 6.87891C22.7145 6.61052 23.0877 6.34399 23.3516 6.08008C23.611 5.81618 23.8752 5.44531 24.1436 4.9668C24.412 4.48806 24.7213 3.83219 25.0703 3H25.3447Z"
                  />
                </svg>
              </button>

              {/* Signed in, the whole tail of this bar is replaced — wallet, bonuses, chat/bell
                  and the avatar menu. The language/currency block is NOT part of it: the
                  original moves that into Global Settings once you have an account, which is
                  why `s2` in AfterLogin-Xr01UEkM.js has no globe button and the capture ends at
                  the avatar. The search button above stays put, because it is the same
                  component on both branches and sits outside the block that swaps. */}
              {session.login ? (
                <AfterLogin onToggleNotice={onToggleNotice} onToggleChat={onToggleChat} />
              ) : (
                <>
              {/* Sign In / Sign Up */}
              <button
                className="button button-m ml-3 h-10 min-w-24 rounded-lg border-2 border-solid border-third px-4 text-base font-semibold"
                type="button"
                onClick={() => navigate('/login/signin')}
              >
                Sign In
              </button>

              {canSignUp && (
              <button
                className="button button-brand button-m ml-1 h-10 min-w-24 rounded-lg px-4 text-base"
                type="button"
                onClick={() => navigate('/login/regist')}
              >
                Sign Up
              </button>
              )}

              {/* Global Chat Button — and the SIGNED-OUT tree opens the same drawer, which is the
                  original's own wiring rather than an extension: `Se` hands its logged-out arm
                  (`pe`) the very same `setRight` it hands the signed-in one, so the chat is
                  readable without an account. Only posting needs a session, and the composer's
                  send is where that check lives on the original. */}
              {CHAT_AVAILABLE && (
              <div className="relative ml-3 flex h-10 w-10 flex-none rounded-lg bg-layer5">
                <button
                  className="button button-m size-10 p-0"
                  type="button"
                  onClick={onToggleChat}
                  aria-label="Toggle Live Chat"
                >
                  <div className="color_icon_img scale-[80%] chat"></div>
                </button>
              </div>
              )}

              {/* Language & Currency Selector Block */}
              <div className="relative ml-3 flex h-10 w-auto flex-none rounded-lg bg-layer5">
                <button
                  className="button button-m relative size-10 p-0"
                  type="button"
                  aria-label="Select Language"
                  onClick={() => openLangModal('language')}
                >
                  <svg viewBox="0 0 32 32" className="icon size-6 fill-primary">
                    <path d="M16 4C9.3726 4 4 9.3726 4 16C4 22.6274 9.3726 28 16 28C22.6274 28 28 22.6274 28 16C28 9.3726 22.6274 4 16 4ZM25.1671 12.0007C25.7022 13.2252 26.0008 14.578 26.0008 16.001C26.0008 17.424 25.7022 18.7768 25.1671 20.0013H20.6577C20.8782 18.7607 20.9984 17.412 20.9984 16.001C20.9984 14.59 20.8781 13.2413 20.6577 12.0007H25.1671ZM13.0018 16.001C13.0018 14.5641 13.112 13.2052 13.3125 12.0007H18.6857C18.8862 13.2052 18.9984 14.564 18.9984 16.001C18.9984 17.4381 18.8862 18.7969 18.6857 20.0014H13.3146C13.1142 18.7969 13.0018 17.4381 13.0018 16.001ZM24.0007 10.0004H20.1927C19.7277 8.4392 19.0904 7.15453 18.3388 6.27668C20.6017 6.82169 22.6039 8.1385 24.0007 10.0004ZM16 7.00222C16.8878 7.00222 17.6875 8.16266 18.2367 10.0025H13.7634C14.3125 8.16073 15.1122 7.00222 16 7.00222ZM13.6611 6.27879C12.9095 7.15458 12.2722 8.44329 11.8092 10.0025H8.0012C9.3974 8.14096 11.3989 6.82423 13.6611 6.27879ZM6.83291 12.0007H11.3423C11.1218 13.2413 11.0015 14.59 11.0015 16.001C11.0015 17.412 11.1219 18.7607 11.3423 20.0013H6.83286C6.28161 18.7398 5.99776 17.3777 5.99915 16.001C5.99915 14.578 6.29784 13.2252 6.83291 12.0007ZM7.9994 22.0015H11.8074C12.2724 23.5627 12.9097 24.8474 13.6612 25.7253C11.3983 25.1802 9.3962 23.8634 7.9994 22.0015ZM16 24.9997C15.1122 24.9997 14.3125 23.8393 13.7633 21.9994H18.2366C17.6835 23.8412 16.8879 24.9997 16 24.9997ZM18.3388 25.7233C19.0904 24.8475 19.7277 23.5588 20.1908 21.9995H23.9988C22.6025 23.8611 20.601 25.1779 18.3388 25.7233Z" />
                  </svg>
                </button>
                <div className="absolute left-10 top-2 h-6 w-[1px] bg-third"></div>
                <button
                  className="button button-m h-10 px-2 py-0"
                  type="button"
                  onClick={() => openLangModal('currency')}
                >
                  <span className="font-semibold text-primary text-[14px]">
                    {/* The picker's own field, as the sidebar and Preferences print it. */}
                    {session.setting.enableLocaleCurrency
                      ? getAlias(session.setting.localeCurrencyName).replace(/FIAT$/, '')
                      : 'None'}
                  </span>
                </button>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Mobile/Tablet Header: Visible on mobile & tablet (< 1024px), Hidden on desktop (>= 1024px) */}
      <div
        className="page-header alpha-layer4 left-0 top-0 w-full fixed z-[99] flex lg:hidden"
        style={{
          /* With the drawer open the bar goes solid in its own layer4 token (white on the light
             theme, #323738 on dark) — a hard-coded #323738 here left a dark bar over the light
             drawer, where the inverted owner logo turned unreadable. */
          "--tw-bg-opacity": mobileMenuOpen ? 1 : headerBgOpacity,
        }}
      >
        {/* `ks()` wraps this whole bar in `Show when={b.login} fallback={<SignedOut/>}`, so the
            signed-in mobile header is a different tree rather than the same one with the two
            buttons swapped: different logo (the square `logo_small.png`), a wallet pill, and no
            chat button at all. See MobileAfterLogin. */}
        {session.login ? (
          <MobileAfterLogin />
        ) : (
        <div className="flex size-full items-center overflow-hidden px-4">
          <div className="text-[0] flex-none">
            <NavLink to="/">
              <img alt={logoAlt} className={`mobile-logo-img object-contain${logoTone}`} src={logo} />
            </NavLink>
          </div>
          <button
            className="button mobile-header-btn ml-auto break-all rounded-lg border-[2px] border-white_alpha20 px-2 text-base font-extrabold !leading-none flex-none"
            type="button"
            onClick={() => navigate('/login/signin')}
          >
            Sign In
          </button>
          {canSignUp && (
          <button
            className="button button-brand mobile-header-btn mobile-signup-btn ml-1 break-all rounded-lg px-2 text-base !leading-none flex-none"
            type="button"
            onClick={() => navigate('/login/regist')}
          >
            Sign Up
          </button>
          )}
        </div>
        )}
      </div>

      {/* Language & Currency Modal */}
      <LanguageCurrencyModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        initialTab={langModalTab}
        /* `merged` — both of this header's triggers emit `open-lanfiat` on the original
           (`g.emit("open-lanfiat", 0)` on the language button, `1` on the currency row), which is
           the COMBINED panel with a tab strip for its title; the argument is only which tab it
           opens on. See components/modals/LanguageCurrencyModal. */
        merged
      />
    </>
  );
}
