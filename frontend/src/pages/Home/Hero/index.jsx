import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../context/session';
import { useCanSignUp, useGates } from '../../../context/gates';
import Banner from './Banner';
import { getSignupHeroArt } from '../../../services/banner';
import { useResource } from '../../../hooks/useResource';
import { useSiteLogo } from '../../../services/siteBranding';

const DEFAULT_HERO_ART = '/brand/parker567-hero.jpg';
/* A whitelabel copy never shows Parker567's poster: without its own (parent's Whitelabel panel ›
   Poster, or its admin › Banners `home` / `home_mobile`) the panel draws its logo on its brand
   colours instead. */
const WHITELABEL = process.env.NEXT_PUBLIC_WHITELABEL_MODE === 'true';
/* Figma "Frame 146" (372×215 @2x): the phone banner, two players on the right. */
const DEFAULT_HERO_ART_MOBILE = '/brand/parker567-hero-mobile.jpg';
import googleIcon from '../../../assets/google.png';
import GoogleSignUpConfirm from '../../../components/shared/GoogleSignUpConfirm';
import { useGoogleLogin } from '../../../services/googleAuth';
import telegramIcon from '../../../assets/telegram.png';
import './Hero.css';

const SOCIAL_SIGN_IN = false;

const HeroCopy = () => {
  /* Same wiring as the header's own Sign Up: `b` in BC-D5accpIK.js takes `const t = useNavigate()`
     and hangs `onClick: () => t("/login/regist")` on this button. The dialog is route-driven — App
     matches /login/* and renders Auth over the page — so navigating IS opening the form. */
  const navigate = useNavigate();
  /* A B2B site has no sign-up (context/gates.js): the headline stays, the Sign Up button and the
     "Or Register With" row are not rendered. */
  const canSignUp = useCanSignUp();
  // Agent mode keeps the poster art signed out, with none of its sign-up copy (user, 2026-10-25).
  const { agentPlayer } = useGates();
  // "Or Register With Google" is a sign-up: the reference's confirmation first.
  const [googleConfirm, setGoogleConfirm] = useState(false);
  // The owner's `google_signin` switch and the server's keys (GET /user/auth/google/status).
  const googleOn = useGoogleLogin();
  if (agentPlayer) return null;

  return (
    <div className="center relative z-[1] flex h-full w-1/2 min-w-[11.25rem] flex-col whitespace-nowrap">
      <div className="flex items-center gap-1">
        <h1 className="max-w-44 text-wrap p-0 text-center text-lg font-extrabold leading-5 text-primary sm:max-w-none sm:text-2xl sm:leading-7">
          JOIN THE UNTAMED
        </h1>
      </div>
      {canSignUp && (
        <>
      <button
        className="button button-brand mt-3 h-8 w-[8.5rem] sm:mt-4 sm:h-10 sm:w-[248px] lg:rounded-lg"
        type="button"
        onClick={() => navigate('/login/regist')}
      >
        Sign Up
      </button>

      {/* "Or Register With" — Google only, shown while the owner's switch is on and the server has
          its keys (user's request, 2026-11-01). Telegram stays hidden (SOCIAL_SIGN_IN). */}
      {(googleOn || SOCIAL_SIGN_IN) && (
      <>
      <p className="mt-3 p-0 font-semibold leading-[150%] text-secondary">Or Register With</p>

      <div className="mt-1.5 h-8">
        <div dir="ltr" className="contents">
          <div className="flex items-center gap-2">
            {googleOn && (
            <button
              className="button h-8 w-[5.5rem] flex-none gap-1 rounded-lg border border-third bg-black_alpha5 p-0 text-xs backdrop-blur-sm sm:h-10 sm:w-[120px] sm:text-base"
              type="button"
              onClick={() => setGoogleConfirm(true)}
            >
              <img alt="google" className="size-[0.875rem] sm:size-5" src={googleIcon} />
              <span className="font-extrabold text-primary">Google</span>
            </button>
            )}
            {SOCIAL_SIGN_IN && (
            <button
              className="button relative h-8 w-[5.5rem] flex-none gap-1 overflow-hidden rounded-lg border border-third bg-black_alpha5 p-0 text-xs backdrop-blur-sm sm:h-10 sm:w-[120px] sm:text-base"
              type="button"
            >
              <div className="center pointer-events-none absolute left-0 top-0 flex size-full select-none items-center gap-1">
                <img alt="telegram" className="size-[0.875rem] sm:size-5" src={telegramIcon} />
                <span className="font-extrabold text-primary">Telegram</span>
              </div>
            </button>
            )}
          </div>
        </div>
      </div>
      </>
      )}
        </>
      )}
      <GoogleSignUpConfirm open={googleConfirm} onClose={() => setGoogleConfirm(false)} />
    </div>
  );
};

/* A whitelabel's poster when it has none uploaded: its brand colour fading over the panel, its
   logo on the side the copy leaves free. */
function BrandPoster({ logo, className, logoClassName }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,color-mix(in_srgb,var(--color-brand)_45%,transparent))]" />
      {logo && <img alt="" className={`absolute top-1/2 w-auto -translate-y-1/2 object-contain ${logoClassName}`} src={logo} />}
    </div>
  );
}

/* `z`, the default export of BC-D5accpIK.js — the signed-OUT panel, and the only thing this
   file used to contain. */
function SignedOutHero() {
  /* THE ORIGINAL'S ARTWORK IS GONE: `banner.png` / `banner_mobile.png` are bc.game's esports team
     in "BC GAME ESPORTS / JB.COM" shirts and `banner_logo*.png` is the 3D BC mark — another
     brand's marketing. The panel keeps its own fill and copy; the art is Parker567's own banner
     (public/brand/parker567-hero.jpg) unless the admin uploads one. */
  /* The operator's own hero art (site admin › Banners, placements `home` /
     `home_mobile`), placed exactly as the original's banner.png / banner_mobile.png were.
     With none uploaded the bundled Parker567 banner shows. */
  const { data: art } = useResource(getSignupHeroArt);
  const logo = useSiteLogo();
  /* Parker567's own banner (Figma "Frame 145", 1276×270 @2x) when the admin has uploaded none. */
  const desktopArt = art?.desktop ?? (WHITELABEL ? null : DEFAULT_HERO_ART);
  /* An admin desktop banner without a mobile one falls back to it (getSignupHeroArt); with no
     admin art at all the phone gets its own Parker567 banner. */
  const mobileArt = art?.mobile ?? (WHITELABEL ? null : DEFAULT_HERO_ART_MOBILE);
  return (
    <div dir="ltr" className="w-full px-4 sm:px-0">
      <div className="hero-panel relative h-[14.375rem] w-full overflow-hidden rounded-lg pl-2.5 sm:h-[260px]">
        {/* Phone: the copy column is the original's (w-1/2, min-w-[11.25rem]). The original's
            banner_mobile.png is a cut-out at right-0 top-0 h-full; this art is a full JPG whose two
            players stand wider, so it sits bottom-right at 92% height (8% past the right edge) with
            its left and top edges faded into the panel, keeping the players clear of the copy.
            Desktop: the finished banner covers the panel, anchored left (the crowned P). */}
        {mobileArt ? (
          <img alt="banner" className="absolute -right-[8%] bottom-0 h-[92%] w-auto max-w-none [mask-image:linear-gradient(to_right,transparent,#000_28%),linear-gradient(to_bottom,transparent,#000_14%)] [mask-composite:intersect] lg:hidden" src={mobileArt} />
        ) : (
          <BrandPoster logo={logo} className="lg:hidden" logoClassName="right-[6%] h-[38%] max-w-[42%]" />
        )}
        {desktopArt ? (
          <img alt="banner" className="absolute inset-0 hidden h-full w-full object-cover object-left lg:block" src={desktopArt} />
        ) : (
          <BrandPoster logo={logo} className="hidden lg:block" logoClassName="left-[5%] h-[42%] max-w-[30%]" />
        )}

        <div className="relative hidden h-full w-[50%] items-center justify-center lg:ml-[12%] lg:flex">
          <HeroCopy />
        </div>
        <div className="contents lg:hidden">
          <HeroCopy />
        </div>
      </div>
    </div>
  );
}

/* `wd` in Enter-MsmOuq5R.js — the hero is one of two entirely different things depending on
 * whether anyone is signed in:
 *
 *   <Show when={account.login} fallback={<Suspense …><BC/></Suspense>}>
 *     <Suspense fallback={[skeleton, <Dots index={0} dots={3} onChange={()=>{}}/>]}>
 *       <Banner el={el()} type={props.type ?? "top"} />
 *
 * The wrapper's `-mx-4 sm:mx-0` is the original's own and cancels the page column's inset below
 * `sm`, so the carousel bleeds to the screen edges while each slide's `px-3` holds the cards
 * off them. The signed-out panel carries the matching `px-4 sm:px-0` internally, which is why
 * that arm looks unchanged.
 *
 * Both Suspense fallbacks are dropped rather than transcribed. `client.js` answers
 * synchronously while fixtures are on, so neither ever renders; the skeleton pair is recorded
 * above and its `h-[12.625rem]` is already noted in card.js as the arithmetic check on the
 * card's own height.
 *
 * `type` is threaded through because the component takes it — `bannerType` goes into the
 * request — but the server ignores it, so nothing passes anything but the default today.
 */
export default function Hero({ type = 'top' }) {
  const { session } = useSession();

  return (
    <div className="relative sm:mx-0 sm:pt-0">
      {session.login ? <Banner type={type} /> : <SignedOutHero />}
    </div>
  );
}
