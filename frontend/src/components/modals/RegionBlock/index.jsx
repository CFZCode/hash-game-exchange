import React from 'react';
import logoImg from '../../../assets/logo.png';
import logoLightImg from '../../../assets/logo_w.png';
import globeRing from '../../../assets/block/globe-ring.png';
import dottedRing from '../../../assets/block/dotted-ring.png';
import pinBody from '../../../assets/block/pin-body.png';
import pinDot from '../../../assets/block/pin-dot.png';
import SOCIALS, { IpIcon } from './icons';
import { useSession } from '../../../context/session';
import { useSettings } from '../../../context/settings';
import useDialogScrollLock from '../../../hooks/useDialogScrollLock';
import { siteLogo } from '../../../services/siteBranding';
import './RegionBlock.css';

/* The geo-restriction modal shown on first load.
 *
 * Source: assets/Block-T89GAHhl.js — `Ce` is the panel and `_t` (`showBlock`) is the popup
 * wrapper this build reproduces. `Ce` renders two ways: `isPop: false` is a full-screen page
 * at /block, `isPop: true` is this dialog over the site, which is what the live site shows on
 * a blocked first visit.
 *
 * The rayId / IP / areaCode come from the server on the real site. Here they come from the
 * session context, which is seeded with the mirror's own captured `/account/get/` response —
 * the same place the `showable && areaAlert` pair that opens this dialog is read from.
 */

const HelperIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M12.0434 17.0183C12.9801 17.0183 13.7395 17.7778 13.7395 18.7145V25.3283C13.7395 26.265 12.9801 27.0244 12.0434 27.0244H10.2648C8.85937 27.0244 7.721 25.8852 7.721 24.4806V19.5629C7.721 18.1575 8.86019 17.0191 10.2648 17.0191L12.0434 17.0183ZM21.8077 17.0183C23.2132 17.0183 24.3515 18.1575 24.3515 19.5621V24.4798C24.3515 25.8852 23.2123 27.0236 21.8077 27.0236H20.0291C19.0925 27.0236 18.333 26.2641 18.333 25.3275V18.7136C18.333 17.777 19.0925 17.0175 20.0291 17.0175L21.8077 17.0183ZM15.9999 4.97559C22.6881 4.97559 28.1292 10.2983 28.2926 16.9261L28.2966 17.2331V22.2398C28.2966 22.9307 27.7348 23.4909 27.0415 23.4909C26.3915 23.4909 25.8574 22.9985 25.7929 22.368L25.7863 22.2398V17.2331C25.7863 11.845 21.4043 7.47772 15.9991 7.47772C10.6853 7.47772 6.36132 11.6988 6.21596 16.9603L6.21188 17.2331V22.2553C6.21188 22.9462 5.65004 23.5064 4.95673 23.5064C4.30669 23.5064 3.77262 23.014 3.70893 22.3835L3.70239 22.2553V17.2331C3.70239 10.4641 9.20807 4.9764 15.9991 4.9764L15.9999 4.97559Z" />
  </svg>
);

/* The original's Close comes from a shared icon registry whose path data is injected at
   runtime, so it cannot be lifted out of the bundle. Measured off the live button instead:
   the glyph spans 8.4 of its 14px box with arms 1.7px thick, which is 19.2 and 3.89 units
   in this viewBox. The stock thin X that stood here was half that weight. */
const CloseIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M18.75 16L25.6 22.85L22.85 25.6L16 18.75L9.15 25.6L6.4 22.85L13.25 16L6.4 9.15L9.15 6.4L16 13.25L22.85 6.4L25.6 9.15Z" />
  </svg>
);

/* The globe.
 *
 * On the live site this is a Spine skeleton (`SpineAnimation-DK0wix3y.js`) driving the
 * diqiu atlas — running that would mean shipping the Spine runtime. `ct` in
 * Block-T89GAHhl.js mounts it as a 100x100 canvas with the skeleton drawn at `scale: .45`
 * and its origin at the canvas centre, so the box is 100px and every measurement below is
 * a setup-pose value from diqiu-CQmxYk9W.json times .45 (Spine's +y is up, hence the sign
 * flips). The `z3` animation only spins wquan, bobs the pin and sweeps the s_xian bars —
 * nothing is scaled — so the setup pose is the resting composition:
 *
 *   wquan   dotted ring   190x190 centred          -> 85.5px at 7.25px
 *   quan    globe ring    160x160 centred          -> 72px   at 14px
 *   d       backing disc   30x30  at (52.63, 78.58) -> 13.5px at (66.93, 7.89)
 *   zuobiao pin            33x44  at (53.13, 72.23) -> 14.85 x 19.8px at (66.48, 7.60)
 *
 * Slot order runs wquan, quan, d, zuobiao, so the disc sits BEHIND the pin and shows only
 * through the hole in its head. It is #1E2121 (layer1) baked into the atlas.
 *
 * The atlas's fourth piece is a single grey bar (`xian`, 10x150) that the skeleton rotates,
 * squashes and bends into the parallels and meridians; those are drawn as SVG here in the
 * atlas's own #BDC8CA, at the bar's own thickness (10u -> 4.5) and at the h_xian bones'
 * offsets and scaleY. The svg's viewBox is 72 over a 72px box so a user unit is a px:
 *
 *   h_xian2  equator   150u long          -> y 36,    x 2.25 .. 69.75
 *   h_xian1  y +36.73u, scaleY .8797      -> y 19.47, x 6.311 .. 65.689
 *   h_xian3  y -36.26u, scaleY .8752      -> y 52.32, x 6.462 .. 65.538
 *   s_xian   half-circle, radius 75u      -> r 33.75, pole to pole
 *
 * The meridian's sweep flag is 0, not 1: the deform pushes its vertices to NEGATIVE x
 * (the reconstructed shape runs -79.9 .. +5), so at the bone's scale.x of +1 the arc bulges
 * LEFT. Drawing it bulging right mirrors the globe and turns it the wrong way.
 *
 * There is no seventh bar, so nothing draws a permanent polar axis — the vertical line down
 * the middle is whichever meridian happens to be edge-on. RegionBlock.css animates the rest.
 *
 * Every img carries an explicit width AND height: an absolutely positioned replaced element
 * with `width: auto` takes its INTRINSIC width and ignores `right`, so an inset-only box
 * would render these sprites at their source size. The pins' `left` carries zuobiao's
 * constant 1.92u (0.864px) x offset from the animation on top of its setup-pose x.
 */
const Globe = () => (
  <div className="relative size-[100px]">
    <img
      className="region-block-dotted-ring absolute left-[7.25px] top-[7.25px] size-[85.5px]"
      alt=""
      src={dottedRing}
    />
    <div className="absolute left-[14px] top-[14px] size-[72px]">
      <img className="absolute inset-0 size-full" alt="" src={globeRing} />
      <svg viewBox="0 0 72 72" className="absolute inset-0 size-full" aria-hidden="true">
        <g fill="none" stroke="#BDC8CA" strokeWidth="4.5">
          <line x1="6.311" y1="19.47" x2="65.689" y2="19.47" />
          <line x1="2.25" y1="36" x2="69.75" y2="36" />
          <line x1="6.462" y1="52.32" x2="65.538" y2="52.32" />
          {['', ' region-block-meridian-2', ' region-block-meridian-3'].map((phase) => (
            <path
              key={phase}
              className={`region-block-meridian${phase}`}
              vectorEffect="non-scaling-stroke"
              d="M36 2.25A33.75 33.75 0 0 0 36 69.75"
            />
          ))}
        </g>
      </svg>
    </div>
    <img
      className="region-block-pin absolute left-[67.79px] top-[7.89px] size-[13.5px]"
      alt=""
      src={pinDot}
    />
    <img
      className="region-block-pin absolute left-[67.34px] top-[7.6px] h-[19.8px] w-[14.85px]"
      alt=""
      src={pinBody}
    />
  </div>
);

/* `region` is the live answer from `services/region.js` (country, IP, Ray ID); without it the
   values come from the session as before. `dismissible={false}` is the owner's `block` mode. */
export default function RegionBlock({ onClose, region = null, dismissible = true }) {
  const [revealed, setRevealed] = React.useState(false);

  /* Country chip, Ray ID and IP all come from the account the server hands back — the
     original prints `b.areaCode`, `b.rayId` and `b.ip` straight out of the same store this
     context now stands in for, and tracks the block with `{areaAlert, showable, userId,
     areaCode, ip}`. They were three hardcoded strings here.

     Note the values MOVED as a result. The three that were written in were transcribed off a
     live capture taken from the Netherlands; the session fixture is
     `api/account/get/index.html`, which the mirror recorded from a US visit. Both are real
     sessions, but only the API capture is part of the saved site and self-consistent with
     `areaAlert: true` — so the chip now reads US rather than NL, with that response's own Ray
     ID and IP. Pin them back in account.js if the NL capture is the one you want shown. */
  const { session: account } = useSession();
  const session = region ? { ...account, areaCode: region.areaCode, ip: region.ip, rayId: region.rayId } : account;
  /* The card is `bg-layer1`, which is #EEF1F4 in the light theme — near-white ink on it is the
     same disappearing act the header's logo does. Same pair, picked the same way; see the note in
     layouts/MainLayout/Header/index.jsx. */
  const { darken } = useSettings();
  const brandLogo = siteLogo({ own: 'hash-games' });

  /* The page lock behind this dialog. It used to be a private effect here that wrote
     `body.style.overflow = 'hidden'` on mount and held it for the component's whole lifetime;
     that is now the shared registry every dialog registers with, because on the original there
     is only ever ONE of these, driven by the list of open popups. The touch-only guard, the
     160ms settle and the reason an inline style was the wrong mechanism are all in
     hooks/useDialogScrollLock.js.

     Still true and still worth knowing here: `.app-root` carries `scrollbar-gutter: stable
     both-edges` on the original, but body is not a scroll container until something sets
     overflow on it, so that declaration is inert — the live page reserves no gutter on either
     edge. It is not what keeps the original steady under a dialog; not locking on desktop is. */
  useDialogScrollLock(true);

  return (
    <div className="region-block-overlay fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto sm:items-center">
      <div className="relative my-auto w-full sm:w-[428px]">
        {/* `.pop-close` in index-DxOqNczA.css: 1.5rem square, top .75rem, right 1rem,
            radius-lg, and `.dark .pop-close` paints it #373E3F — a literal on the original,
            not one of the layer tokens (layer5 is #3A4142). Its svg is .875rem. */}
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="button absolute right-4 top-3 z-10 size-6 rounded-lg bg-[#373E3F] p-0"
          >
            <CloseIcon className="size-3.5 fill-secondary" />
          </button>
        )}

        {/* `Ce`'s card, isPop branch: `h-auto w-full` instead of the page variant's px-4. */}
        <div className="relative mx-auto flex h-auto w-full max-w-[428px] scale-100 flex-col items-center justify-center rounded-xl bg-layer1 px-10 py-8">
          <div className="mt-4 w-40">
            {/* Another brand's file has its own proportions, so it is fitted to the height the pair
                draws at (288x64 in w-40) rather than left at its intrinsic size. */}
            <img
              alt="logo"
              className={brandLogo ? 'mx-auto h-9 w-auto object-contain' : undefined}
              src={brandLogo ?? (darken ? logoImg : logoLightImg)}
            />
          </div>

          <div>
            <Globe />
          </div>

          <div className="mt-3 flex w-24 items-center justify-center gap-2 rounded-lg bg-layer3_alt px-4 py-1">
            <IpIcon className="size-5" />
            <div className="text-lg font-extrabold text-primary">{session.areaCode}</div>
          </div>

          <h2 className="mt-5 text-center text-base font-extrabold">
            According to our gaming license regulations, we do not accept players from your
            region. If you think this is a mistake, check your VPN connection.
          </h2>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              className="button button-brand flex h-10 w-36 items-center justify-center"
            >
              <HelperIcon className="mr-1 size-6 fill-primary_brand" />
              Live Support
            </button>
          </div>

          <ul className="mt-10 flex w-full items-center justify-around">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>
                  {/* size-10, not size-11: eight 44px buttons exactly fill the 348px
                      content box, which collapses justify-around's gaps to nothing. */}
                  <span className="button size-10 rounded-lg bg-layer3 p-0">{s.icon}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="mb-4 mt-5 flex w-full flex-col items-center justify-center gap-3 font-normal text-tertiary">
            <p>
              <span className="mr-1">Ray ID:</span>
              <span>{session.rayId}</span>
            </p>
            <p>
              <span className="mr-1">IP:</span>
              {revealed ? (
                <span>{session.ip}</span>
              ) : (
                <span
                  className="text-secondary sm:cursor-pointer"
                  onClick={() => setRevealed(true)}
                >
                  Click to reveal
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
