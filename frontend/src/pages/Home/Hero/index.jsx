import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../context/session';
import { useSettings } from '../../../context/settings';
import Banner from './Banner';
import bannerImg from '../../../assets/banner.png';
import bannerMobileImg from '../../../assets/banner_mobile.png';
import bannerLogoImg from '../../../assets/banner_logo.png';
import bannerLogoLightImg from '../../../assets/banner_logo_w.png';
import googleIcon from '../../../assets/google.png';
import telegramIcon from '../../../assets/telegram.png';
import './Hero.css';

const HeroCopy = () => {
  /* Same wiring as the header's own Sign Up: `b` in BC-D5accpIK.js takes `const t = useNavigate()`
     and hangs `onClick: () => t("/login/regist")` on this button. The dialog is route-driven — App
     matches /login/* and renders Auth over the page — so navigating IS opening the form. */
  const navigate = useNavigate();

  return (
    <div className="center relative z-[1] flex h-full w-1/2 min-w-[11.25rem] flex-col whitespace-nowrap">
      <div className="flex items-center gap-1">
        <h1 className="max-w-44 text-wrap p-0 text-center text-lg font-extrabold leading-5 text-primary sm:max-w-none sm:text-2xl sm:leading-7">
          JOIN THE UNTAMED
        </h1>
      </div>
      <button
        className="button button-brand mt-3 h-8 w-[8.5rem] sm:mt-4 sm:h-10 sm:w-[248px] lg:rounded-lg"
        type="button"
        onClick={() => navigate('/login/regist')}
      >
        Sign Up
      </button>

      <p className="mt-3 p-0 font-semibold leading-[150%] text-secondary">Or Register With</p>

      <div className="mt-1.5 h-8">
        <div dir="ltr" className="contents">
          <div className="flex items-center gap-2">
            <button
              className="button h-8 w-[5.5rem] flex-none gap-1 rounded-lg border border-third bg-black_alpha5 p-0 text-xs backdrop-blur-sm sm:h-10 sm:w-[120px] sm:text-base"
              type="button"
            >
              <img alt="google" className="size-[0.875rem] sm:size-5" src={googleIcon} />
              <span className="font-extrabold text-primary">Google</span>
            </button>
            <button
              className="button relative h-8 w-[5.5rem] flex-none gap-1 overflow-hidden rounded-lg border border-third bg-black_alpha5 p-0 text-xs backdrop-blur-sm sm:h-10 sm:w-[120px] sm:text-base"
              type="button"
            >
              <div className="center pointer-events-none absolute left-0 top-0 flex size-full select-none items-center gap-1">
                <img alt="telegram" className="size-[0.875rem] sm:size-5" src={telegramIcon} />
                <span className="font-extrabold text-primary">Telegram</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* `z`, the default export of BC-D5accpIK.js — the signed-OUT panel, and the only thing this
   file used to contain. */
function SignedOutHero() {
  /* `T = () => d(Y, B)` in BC-D5accpIK.js, where `d` is the `darken ? dark : light` picker and
     the pair is `banner_logo-n3ZYWH_Z.png` / `banner_logo-S55bYPhU.png`. Two genuinely different
     files, unlike the `banner` beside it — that one's tuple names the SAME file on both sides
     (`k === M`, `C === S`), which is why only this one is imported twice. */
  const { darken } = useSettings();
  return (
    <div dir="ltr" className="w-full px-4 sm:px-0">
      <div className="hero-panel relative h-[14.375rem] w-full overflow-hidden rounded-lg pl-2.5 sm:h-[260px]">
        <img
          alt="banner"
          className="absolute right-0 top-0 h-full w-auto max-w-none lg:hidden"
          src={bannerMobileImg}
        />
        <img
          alt="banner"
          className="absolute right-0 top-0 hidden h-full w-auto lg:block"
          src={bannerImg}
        />
        <img
          alt="banner-logo"
          className="absolute -left-16 top-0 hidden h-[120%] lg:block"
          src={darken ? bannerLogoImg : bannerLogoLightImg}
        />

        <div className="relative hidden h-full w-[50%] items-center justify-center lg:flex">
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
