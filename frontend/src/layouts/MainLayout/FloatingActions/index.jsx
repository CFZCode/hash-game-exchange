import { LIVE_SUPPORT_AVAILABLE } from '../../../services/availability';
import React from 'react';
import './FloatingActions.css';

/* The two floating buttons in the bottom-right corner.
 *
 * Source: assets/BackToTop-DG8tIEvj.js. `Ol()` in Enter-MsmOuq5R.js mounts it alongside the
 * footer inside a `when: !m.mobile` branch, so the pair is DESKTOP ONLY — on a phone the
 * tabbar already occupies that corner. `lg:flex` here rather than a JS check, matching how
 * the rest of this build splits the two layouts.
 *
 * The original also shifts the stack left by 380px while the chat panel is open (a
 * MutationObserver on body.chat-unfold). There is no chat panel yet, so that is left out
 * rather than stubbed.
 */

/* `E` — a bar plus a chevron, i.e. the "skip to start" glyph. It is drawn pointing LEFT and
   the button rotates it 90deg, which is what puts the bar on top with the chevron under it. */
const SkipIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M24.4657 6.16578C24.1533 5.85336 23.6467 5.85336 23.3343 6.16578L14.0657 15.4344C13.7533 15.7468 13.7533 16.2534 14.0657 16.5658L23.3343 25.8344C23.6467 26.1468 24.1533 26.1468 24.4657 25.8344L26.3519 23.9482C26.6643 23.6358 26.6643 23.1292 26.3519 22.8168L20.1009 16.5658C19.7885 16.2534 19.7885 15.7468 20.1009 15.4344L26.3519 9.18338C26.6643 8.87096 26.6643 8.36443 26.3519 8.05201L24.4657 6.16578Z" />
    <path d="M5.5 5.5H9.5V26.5H5.5V5.5Z" />
  </svg>
);

/* `IconHelper` — the live-support headset. */
const HelperIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M12.0434 17.0183C12.9801 17.0183 13.7395 17.7778 13.7395 18.7145V25.3283C13.7395 26.265 12.9801 27.0244 12.0434 27.0244H10.2648C8.85937 27.0244 7.721 25.8852 7.721 24.4806V19.5629C7.721 18.1575 8.86019 17.0191 10.2648 17.0191L12.0434 17.0183ZM21.8077 17.0183C23.2132 17.0183 24.3515 18.1575 24.3515 19.5621V24.4798C24.3515 25.8852 23.2123 27.0236 21.8077 27.0236H20.0291C19.0925 27.0236 18.333 26.2641 18.333 25.3275V18.7136C18.333 17.777 19.0925 17.0175 20.0291 17.0175L21.8077 17.0183ZM15.9999 4.97559C22.6881 4.97559 28.1292 10.2983 28.2926 16.9261L28.2966 17.2331V22.2398C28.2966 22.9307 27.7348 23.4909 27.0415 23.4909C26.3915 23.4909 25.8574 22.9985 25.7929 22.368L25.7863 22.2398V17.2331C25.7863 11.845 21.4043 7.47772 15.9991 7.47772C10.6853 7.47772 6.36132 11.6988 6.21596 16.9603L6.21188 17.2331V22.2553C6.21188 22.9462 5.65004 23.5064 4.95673 23.5064C4.30669 23.5064 3.77262 23.014 3.70893 22.3835L3.70239 22.2553V17.2331C3.70239 10.4641 9.20807 4.9764 15.9991 4.9764L15.9999 4.97559Z" />
  </svg>
);

export default function FloatingActions() {
  const [showTop, setShowTop] = React.useState(false);

  React.useEffect(() => {
    /* `t() > innerHeight` — the button appears only once a full viewport has been
       scrolled past, not on the first pixel of movement. */
    const onScroll = () => setShowTop(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* scrollBy by the whole document height rather than scrollTo(0): both land at the top,
     but this is what the original does and it keeps the smooth easing identical no matter
     how far down the page you are. */
  const toTop = () =>
    window.scrollBy({ top: -1 * document.body.scrollHeight, left: 0, behavior: 'smooth' });

  return (
    <div className="fixed bottom-3 end-2 z-100 hidden flex-col gap-y-3 lg:flex">
      {showTop && (
        <button
          type="button"
          aria-label="Back to top"
          onClick={toTop}
          className="button button-m fade-right bg-layer5"
        >
          <SkipIcon className="size-6 rotate-90 fill-primary" />
        </button>
      )}

      {LIVE_SUPPORT_AVAILABLE && (
        <button type="button" aria-label="Live support" className="button button-m bg-brand">
          <HelperIcon className="size-6 fill-alw_dark" />
        </button>
      )}
    </div>
  );
}
