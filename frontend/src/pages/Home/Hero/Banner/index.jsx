import React from 'react';
import { Link } from 'react-router-dom';
import { useResource } from '../../../../hooks/useResource';
import { useIsDesktop } from '../../../../hooks/useMediaQuery';
import { getHomeBanners, getFallbackBanners } from '../../../../services/banner';
import { USE_FIXTURES } from '../../../../services/client';
import DepositSlide from './DepositSlide';
import { artFor, ARROW_PATH, SLIDE_PAD, CARD, CARD_BODY, CARD_TAG, CARD_BUTTON } from './card';
import Skeleton from '../../../../components/shared/Skeleton';
import { useGates } from '../../../../context/gates';
import './Banner.css';

/* The hero carousel the home page shows to a signed-in visitor.
 *
 * SOURCE. `$e`, the default export of `index-t-7F5FAB.js`, which is not in the saved mirror and
 * came off hash.game — as did `createBanner-4SczZOe8.js` (the feed), the fallback PNGs, and,
 * unusually for this project, THE RESPONSE ITSELF: hash.game answers `/api/edge/…` as well as
 * serving `/assets/…`. The class lists and the two inline styles below were then checked against
 * the live page's rendered DOM, which is what settled how keen-slider positions a slide.
 *
 * The switch that puts this here rather than the "JOIN THE UNTAMED" panel is `wd` in
 * Enter-MsmOuq5R.js — `<Show when={account.login} fallback={<BC/>}>` — and it lives in
 * ../index.jsx, so this component never reads the session.
 *
 * WHAT KEEN-SLIDER DID AND HOW IT IS REPRODUCED. The original mounts `<Carousel>` (`ME` in
 * index-BsFv7ByC.js), a thin wrapper over keen-slider, with
 *
 *   { dragSpeed: .2, loop: count > 3, slides: { spacing: mobile ? 0 : 8, perView } }
 *
 * and `selector: ":scope > *"`, so the slides ARE the cards' own outer divs — there is no track
 * element and no wrapper per slide. What it writes onto each one is exactly three declarations,
 * read off the live DOM at a 1440px window:
 *
 *   min-width: 384px; max-width: 384px; transform: translate3d(<x>px, 0, 0)
 *
 * 384 is `(1168 - 8 * 2) / 3` — the container less one spacing per gap, over `perView` — and
 * the transforms at rest were 0, 8, 16, 24, then -2320 and -2312. Those last two are the whole
 * mechanism: flex has already laid slide i out at `i * 384`, the transform's job is to add the
 * `i * 8` of accumulated spacing, and a slide too far ahead to be useful is RELOCATED behind the
 * strip instead of being duplicated. -2320 puts slide 4 two slots before slide 0; -2312 puts
 * slide 5 one slot before it. That is why there is no lead/trail copy of anything here and why
 * the DOM holds exactly as many nodes as there are slides.
 *
 * POINTER DRAGGING IS REPRODUCED (`useDrag` below), and one detail of it is worth knowing before
 * touching it: the capture is taken LAZILY, once a drag commits, and not on pointerdown. Capturing
 * early re-targets the `click` that follows to the capturing element — Chrome derives click from
 * the pointer stream — so every button and link inside a slide went dead while the card still
 * looked clickable. `dragSpeed: .2` is the original's own damping and is not ported; everything the
 * carousel can do is also reachable from the dots and the arrows.
 */

/* `Te.Arrow` — see card.js. `.icon` is the site's own class and carries `fill: currentColor`;
   the live DOM has it on every one of these, which is why no `fill-current` is written. */
const ArrowIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={`icon ${className}`}>
    <path d={ARROW_PATH} />
  </svg>
);

/* `me` — one slide of the feed.
 *
 * `style` is keen-slider's, threaded in from the carousel: the card's own outer div is the slide,
 * so the sizing lands here rather than on a wrapper.
 *
 * The tracking wrapper this sits in on the original (`main_site_banner_show` /
 * `main_site_banner_click`, with `section_id: "home_banner"` and the row's `bannerId`) is
 * dropped: this build has no analytics sink, and `user/tracking/event/` is already in
 * endpoints.js for when it does.
 *
 * `inactive` on the anchor is a dead class — it generates nothing in any of the deploy's
 * stylesheets, the same finding as on the VIP hero's link. Kept, like every other one here. The
 * rendered DOM also carries a bare `link=""` attribute; that is the Solid Link component's own
 * marker rather than anything the page styles or reads, so it is not reproduced.
 *
 * The `<button>` inside the `<a>` is the original's, verbatim from the live DOM, and it is
 * invalid HTML — interactive content inside an anchor. It is kept because it renders and behaves
 * identically (the button has no handler; the click bubbles to the link) and because a DOM
 * comparison against the live page is the main way this file gets checked. Contrast the sidebar
 * rows, where the nested button has its OWN handler and the nesting had to go.
 */

/* WHERE A CARD GOES WHEN ITS OWN PAGE IS NOT BUILT, and this mapping is THIS BUILD'S rather than
 * the feed's — asked for, and one function to delete when the pages behind it exist.
 *
 * Every feed row's `linkUrl` is `/promotion-event/<slug>`, the individual promotion's page. That
 * route is not built here (nor are `/promotion/:id` and `/promotions/exclusive-promo`, its two
 * siblings), so the card was landing on the catch-all, which renders Home — a button that looks
 * inert because the page it reaches is the one you were already on.
 *
 * THE FIXTURE KEEPS THE FEED'S OWN URL and this maps it at the call site, which is the important
 * half: `banners.js` is captured data and three of its five rows are a live response, so rewriting
 * `linkUrl` there would turn evidence into a convenience. The nearest built page for a promotion
 * card is the promotions list itself, which is where all five now go — the same page the footer and
 * the sidebar's Promotions row reach.
 *
 * A ROUTE ALIAS WAS THE OTHER OPTION AND IS DELIBERATELY NOT TAKEN. `/promotion-event/:slug` could
 * render `<Promotions/>` from `App.jsx`, and pasting the URL would then work too — but the router's
 * table is transcribed from `Enter-MsmOuq5R.js` and that path is a real, distinct page there, not an
 * alias for the list. `/vip` -> `/vip-detail` and `/affiliate` -> `/referral` are in the table
 * because the ORIGINAL declares them as redirects; this one would be ours, wearing the original's
 * clothes.
 *
 * The three fallback slides in `banners.js` are untouched and unreachable (the feed returns five, so
 * `<Show when={feed.length < 3}>` never fires): `/vip` resolves already, `/casino/brand` lands on the
 * casino page, and `/events/app-download-recall` would want the same treatment as these five. */
const PROMOTION_EVENT = '/promotion-event/';
const PROMOTIONS_LIST = '/promotions/promotion';

const builtRoute = (linkUrl) =>
  linkUrl.startsWith(PROMOTION_EVENT) ? PROMOTIONS_LIST : linkUrl;

function BannerCard({ banner, style }) {
  /* A platform slide may be image-only (no copy, no CTA): it then draws only what it has, and
     with no `linkUrl` the card is not a link at all. */
  const external = banner.linkUrl.startsWith('http');
  const to = builtRoute(banner.linkUrl);

  const body = (
    /* `imageUrl` wins over the glob when the platform has art for this placement — see
       services/banner.js for why that is the only field a platform banner can supply. */
    <div
      className={CARD_BODY}
      style={{ backgroundImage: `url(${banner.imageUrl ?? artFor(banner.image)})` }}
    >
      {banner.tagName && <span className={CARD_TAG}>{banner.tagName}</span>}
      <div className="-mt-1 line-clamp-3 pb-2 pr-44 pt-1 text-xl font-extrabold uppercase leading-6">
        {banner.title}
      </div>
      {/* whitespace-pre-line is not decorative — the feed's descriptions carry a literal
          newline ("Bet €10 · Get 20 \nFree Spins") and this is what honours it. */}
      <div className="line-clamp-2 whitespace-pre-line pr-40 text-sm uppercase text-secondary">
        {banner.description}
      </div>
      {banner.buttonContent && (
        <div className="mt-auto pr-40">
          <button type="button" className={CARD_BUTTON}>
            <span className="truncate">{banner.buttonContent}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={SLIDE_PAD} style={style}>
      {!banner.linkUrl ? (
        <div className={`${CARD} inactive`}>{body}</div>
      ) : external ? (
        <a href={banner.linkUrl} target="_blank" rel="noreferrer" className={`${CARD} inactive`}>
          {body}
        </a>
      ) : (
        <Link to={to} className={`${CARD} inactive`}>
          {body}
        </Link>
      )}
    </div>
  );
}

/* `pd` in Enter-MsmOuq5R.js — the dots, and the auto-advance that lives inside them.
 *
 * The progress bar is a gsap tween from 0 to 1 with `ease: "none"`, and on complete it calls
 * `onChange(i => (i + 1) % dots)`. So the carousel's timer IS the dot's timer: there is no
 * separate interval anywhere, which is why pausing the strip pauses the fill with it.
 *
 * The fill is written straight onto the node rather than held in state, for the reason the
 * promotions tab indicator is: this runs every frame, and a `setState` per frame would re-render
 * the whole carousel sixty times a second to move one pill. The live DOM shows the same values
 * this produces — `transform: translateX(-91.4467%)` on a span that started at -100%.
 */
const DOT_DURATION = 15000;

function Dots({ index, dots, pause, onChange }) {
  const fillRef = React.useRef(null);
  const elapsed = React.useRef(0);

  /* The tick target has to be a ref, not a dependency: `onChange` changes identity whenever the
     slide count does, and restarting the frame loop for that would also restart the 15s. */
  const advance = React.useRef(onChange);
  React.useEffect(() => {
    advance.current = onChange;
  }, [onChange]);

  /* gsap's `restart()`, from `M(u => (e.index !== u && !e.pause && l.restart(), e.index))`.
     Resetting here rather than inside the frame loop is what lets a pause RESUME — the loop
     below only ever adds to `elapsed`. */
  React.useEffect(() => {
    elapsed.current = 0;
    if (fillRef.current) fillRef.current.style.transform = 'translateX(-100%)';
  }, [index]);

  React.useEffect(() => {
    if (pause || dots < 2) return undefined;

    let raf;
    let last = null;

    const step = (now) => {
      if (last !== null) elapsed.current += now - last;
      last = now;

      const progress = Math.min(1, elapsed.current / DOT_DURATION);
      const node = fillRef.current;
      if (node) {
        node.style.transform = `translateX(${(progress - 1) * 100}%)`;
        /* `o() !== 1 ? "" : "opacity-0"` — the pill blanks on the frame it completes, so a
           filled bar is never shown sitting still. */
        node.style.opacity = progress === 1 ? '0' : '';
      }

      if (progress < 1) raf = requestAnimationFrame(step);
      else advance.current((i) => (i + 1) % dots);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pause, dots]);

  return (
    <div className="flex h-6 w-full justify-center overflow-hidden py-2">
      <ul className="flex gap-x-1.5">
        {Array.from({ length: dots }, (_, i) => {
          /* `Dr` is createSelector, so `n(i)` is `i === index` and not a memo of the index —
             which is what keeps a slide change from re-rendering every dot. */
          const active = i === index;
          return (
            <li
              key={i}
              style={{ transitionTimingFunction: 'ease' }}
              className={`${active ? 'w-5' : 'w-1.5'} h-1.5 cursor-pointer overflow-hidden rounded-full bg-layer4 transition-all duration-500`}
              onClick={() => onChange(i)}
            >
              {/* `bg-brand dark:bg-[#B3BEC1]`, both arms. The dark one is grey, NOT the brand
                  green a screenshot suggests — #B3BEC1 is `secondary` to the digit and a sample of
                  the capture's active pill confirms it exactly. So the timer fill is green in the
                  light theme and grey in the dark one, which is the right way round and the
                  opposite of the usual assumption. */}
              {active && (
                <span
                  ref={fillRef}
                  style={{ transformOrigin: 'center left', transform: 'translateX(-100%)' }}
                  className="block h-full w-full rounded-full bg-brand will-change-transform dark:bg-[#B3BEC1]"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* `Y(() => e.el)` — the original measures the wrapper `wd` hands it and derives `perView` from
 * that width. This measures its own wrapper instead, which is the same box: on the original the
 * ref sits on the div that contains the carousel and nothing between them changes width.
 *
 * THE FIRST MEASUREMENT HAPPENS IN A REF CALLBACK, NOT IN AN EFFECT, and that is what stops the
 * hero sliding across the page on a reload. A ResizeObserver does not report until after the
 * first paint, so the strip painted once at `width = 0` — which drives `perView` to 1 through
 * the `(width || 340)` default and sizes every slide at `100%` — and then jumped to three
 * across on the next frame. With `transition: transform 0.3s` on the slides that jump is not
 * even instant: it ANIMATES, which is the sideways scroll you see.
 *
 * A ref callback runs during the commit phase, so the setState it schedules is flushed before
 * the browser paints and the first painted frame already has the real width. Doing the same
 * thing in `useEffect` would be a frame late, and in `useLayoutEffect` it would be a synchronous
 * setState in an effect body, which `react-hooks/set-state-in-effect` rejects — rightly, since
 * this is exactly the cascading render it is about. The observer stays for later resizes.
 */
function useElementWidth() {
  const ref = React.useRef(null);
  const [width, setWidth] = React.useState(0);

  const setNode = React.useCallback((node) => {
    ref.current = node;
    if (node) setWidth(node.getBoundingClientRect().width);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [width, setNode, ref];
}


/* `$r`/`xn` in index-BsFv7ByC.js. The carousel's `pause` is `!inView || hovered`, and the first
   half is an in-view gate the site wraps the whole strip in — a carousel scrolled past should
   not be burning frames. */
function useInView(ref) {
  const [inView, setInView] = React.useState(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

/* Pointer drag — the original had `dragSpeed: .2` on keen-slider, which lets you swipe between
 * cards on both touch and mouse. This reproduces that with pointer events (unified touch+mouse).
 * `touch-action: pan-y` on `.carousels` hands vertical drags back to the browser, so only
 * horizontal swipes are captured.
 *
 * The cards follow the pointer in real time during the drag (via `dragOffset`), and on release
 * the carousel snaps to the nearest slide with its normal 300ms CSS transition. */
function useDrag(move, setDragOffset, slideWidth) {
  const dragging = React.useRef(false);
  const startX = React.useRef(0);
  const startY = React.useRef(0);
  const moved = React.useRef(false);
  const locked = React.useRef(false);       /* true once we've committed to horizontal drag */
  const rafId = React.useRef(0);
  const lastDx = React.useRef(0);

  const threshold = Math.min(50, (slideWidth || 300) / 4);

  const onPointerDown = React.useCallback((e) => {
    if (e.button !== 0) return;
    dragging.current = true;
    moved.current = false;
    locked.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    lastDx.current = 0;
    /* NO `setPointerCapture` HERE, AND THAT IS THE WHOLE OF WHY THE CARDS' BUTTONS DID NOTHING.
       Capturing on pointerdown re-targets the `click` that follows to the CAPTURING element —
       Chrome derives click from the pointer stream, so the event fires on this container rather
       than on the `<Link>` or the `<button>` inside the slide, and neither ever hears it. The
       card stayed visibly clickable and nothing happened.

       It is taken lazily instead, in `onPointerMove` the moment a drag actually commits (see
       `locked` below). A plain click never captures, so it lands on the link as it should; a drag
       captures within 5px of movement, which is what keeps the strip following the pointer
       outside its own box and what stops a release elsewhere from stranding the drag. */
  }, []);

  /* Ends the gesture where there is nothing to snap to — no direction to commit, just put the
     strip back. Separate from `onPointerUp` because the two cases that need it carry no usable
     coordinates: see `onPointerCancel` and the lost-button guard below. */
  const cancelDrag = React.useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = 0; }
    setDragOffset(0);
  }, [setDragOffset]);

  const onPointerMove = React.useCallback((e) => {
    if (!dragging.current) return;
    /* THE PRESS ENDED SOMEWHERE WE NEVER HEARD ABOUT. A pointerup that is swallowed — by a
       native drag the browser started, by a release outside the window, by devtools taking the
       pointer — leaves `dragging` true, and since a mouse goes on emitting pointermove with no
       button held, every later movement kept dragging the cards around. That is the "the card
       follows the mouse after releasing" bug, and it was desktop-only precisely because a touch
       pointer stops existing on release and cannot deliver a buttonless move. */
    if (e.pointerType === 'mouse' && e.buttons === 0) { cancelDrag(); return; }
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    /* First significant movement decides the axis. If vertical wins, bail entirely. */
    if (!locked.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      if (Math.abs(dy) > Math.abs(dx)) {
        dragging.current = false;
        setDragOffset(0);
        return;
      }
      locked.current = true;
      /* The capture the pointerdown handler deliberately does not take. Safe to call repeatedly,
         and released implicitly on pointerup. */
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    if (locked.current) {
      moved.current = true;
      lastDx.current = dx;
      /* Throttle to one React render per frame */
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = 0;
          setDragOffset(lastDx.current);
        });
      }
    }
  }, [setDragOffset, cancelDrag]);

  const onPointerUp = React.useCallback((e) => {
    if (!dragging.current) { dragging.current = false; return; }
    dragging.current = false;
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = 0; }
    const dx = e.clientX - startX.current;
    /* Reset visual offset — the snap transition will take over */
    setDragOffset(0);
    if (Math.abs(dx) >= threshold) {
      move(dx < 0 ? 1 : -1);
    }
  }, [move, setDragOffset, threshold]);

  /* Prevent child links/buttons from navigating when the user was dragging, not clicking. */
  const onClickCapture = React.useCallback((e) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClickCapture,
    /* Fired instead of pointerup whenever the browser takes the pointer for itself. */
    onPointerCancel: cancelDrag,
    /* AND THIS IS WHAT STOPS IT BEING TAKEN. Every slide is an <a> or a <Link>, so a mouse press
       on one and a move starts the browser's own drag-and-drop — ghost image, no pointerup, the
       pointer handed to the drag source. `useDragScroll` carries the identical arm for the same
       reason; a horizontal gesture over anchors needs it. */
    onDragStart: (e) => e.preventDefault(),
  };
}

/* Links into a promotion of any kind. `gateOf` (services/gates.js) knows `/promotions` and
   `/vip` but not the per-event `/promotion-event/<slug>` or `/events/<slug>` pages the captured
   feed points at, so those are read here as the `promotions` gate rather than as ungated. */
const PROMO_LINK = /^\/(promotion-event|promotions|events|deposit-offer|bonus|vip|referral|free-plays|quests)(\/|$|\?)/;

/* Whether a banner may be shown to this player: an agent-tree account (promotions capability
   off) or a site with the section switched off gets no promotion bait. */
const bannerAllowed = (gates, banner) => {
  /* Not answered yet: the strip is showing its skeleton anyway (see `feedLoading`), and keeping
     the slides counted keeps the early `!count` return from collapsing the box meanwhile. */
  if (!gates.ready) return true;
  const link = String(banner?.linkUrl ?? '');
  if (PROMO_LINK.test(link) && !gates.on('promotions')) return false;
  return gates.routeOn(link);
};

export default function Banner({ type = 'top' }) {
  const gates = useGates();
  const [width, setWrapNode, wrapRef] = useElementWidth();
  const inView = useInView(wrapRef);
  const isDesktop = useIsDesktop();

  const { data: feed, loading: feedFetching } = useResource(getHomeBanners);
  /* Until the gates have answered, a signed-in player's capabilities read as closed — so the
     strip holds its skeleton rather than painting slides it may then have to take away. Fixture
     mode's gates are always ready, so nothing changes there. */
  const feedLoading = feedFetching || !gates.ready;

  /* `from` is the position the strip is coming FROM, and it is state rather than a ref because
     it is read during render: it is the only way to know which slides are wrapping this move and
     therefore must not animate. Kept beside `pos` so the two can never disagree. */
  const [{ pos, from, moving }, setTrack] = React.useState({ pos: 0, from: 0, moving: false });
  const [hovered, setHovered] = React.useState(false);

  /* Live pixel offset while dragging — applied to every slide's transform so the cards
     follow the pointer in real time. Zero when not dragging. */
  const [dragOffset, setDragOffset] = React.useState(0);
  const isDragging = dragOffset !== 0;

  /* THE SLIDES ANIMATE ONLY WHILE A MOVE IS IN FLIGHT, and that is the second half of the
   * reload jump — the half that survives a correct first measurement.
   *
   * Every slide's transform is computed from the measured width, so ANYTHING that changes the
   * width rewrites all of them, and the CSS transition then eases the strip sideways for 300ms.
   * The usual trigger is not a window resize at all: it is the page's own SCROLLBAR appearing
   * once the images below the fold have loaded, which narrows the content column by ~15px a
   * beat after the hero has painted. keen-slider never had this problem because it rewrites
   * transforms per frame and declares no transition to fire.
   *
   * So the flag is set beside the new position, and cleared 300ms later — the transition's own
   * duration — with the transform unchanged, so clearing it animates nothing. `pos` is in the
   * dependency list so a second click restarts the timer rather than cutting the first move
   * short. Cleared from a timeout callback rather than an effect body, which is what keeps
   * `react-hooks/set-state-in-effect` satisfied.
   */
  React.useEffect(() => {
    if (!moving) return undefined;
    const id = setTimeout(() => setTrack((track) => ({ ...track, moving: false })), 300);
    return () => clearTimeout(id);
  }, [moving, pos]);

  /* `Math.max(1, Math.min(Math.floor((i.width || 340) / 340), 3))`, verbatim. 340 is a card at
     its narrowest useful size; the `|| 340` default is what the first render uses before the
     ResizeObserver has fired, and it resolves to one card across. On mobile, use a smaller
     base width to ensure slides fit properly. */
  const baseWidth = isDesktop ? 340 : 280;
  const perView = Math.max(1, Math.min(Math.floor((width || baseWidth) / baseWidth), 3));

  /* `spacing: B.mobile ? 0 : 8`. Zero on a phone is not an oversight — below `sm` the slide's own
     `px-3` separates the cards, and `sm:!px-0` hands that job to the spacing. */
  const spacing = isDesktop ? 8 : 0;

  /* `<Show when={e.type === "top"}>` — the deposit slide leads, and only on the top carousel.
     The padding step is `!bcng && !bcke && p().length < 3`: top up the strip with the chunk's
     three hardcoded slides when the feed is thin. Both deployment flags are false here, so only
     the count decides, and the feed has five rows, so it does not fire. */
  const slides = React.useMemo(() => {
    /* `feed === undefined` IS NOT "a thin feed" AND MUST NOT TAKE THE PADDING ARM. The chunk's
       `p().length < 3` test runs against a resolved response; run against a pending one it tops
       the strip up with all three hardcoded fallbacks, so the hero would paint three banners the
       account does not have and then swap them for five real ones a beat later — five slides
       becoming six, `loop` flipping, the dots renumbering. Empty until it lands; the skeleton
       below is what fills the box in the meantime. */
    const rows = feed ?? [];
    /* Live mode never pads: the three fallbacks are bc.game's own slides (its app cashback, its
       Originals art), so a thin platform feed stays thin — or empty, and the strip goes. */
    const padded = (USE_FIXTURES && feed && rows.length < 3 ? [...rows, ...getFallbackBanners()] : rows).filter((banner) =>
      bannerAllowed(gates, banner),
    );
    /* The deposit slide is a deposit-bonus offer: promotions and bonus both have to be on. */
    const depositSlide = type === 'top' && (!gates.ready || (gates.on('promotions') && gates.on('bonus') && gates.on('deposit')));

    return [
      ...(depositSlide ? [{ key: 'deposit', render: (style) => <DepositSlide style={style} /> }] : []),
      ...padded.map((banner) => ({
        key: String(banner.bannerId),
        render: (style) => <BannerCard banner={banner} style={style} />,
      })),
    ];
  }, [type, feed, gates]);

  const count = slides.length;
  const loop = count > 3;

  /* THE SLOT RULE, and the one piece of keen-slider that had to be inferred rather than read.
     A slide's slot is its distance ahead of the current position, and a slide more than half a
     revolution ahead is pulled round to sit BEHIND the strip instead — which is what the live
     DOM's -2320 and -2312 are. Only one configuration was observed (six slides, three per view,
     at rest), and `> count / 2` and `> count - perView` both produce it; the halfway rule is
     chosen because it is the same rule `moveToIdx` uses to pick a direction, so the animation
     and the relocation can never disagree about which way is shorter. */
  const slotAt = React.useCallback(
    (i, at) => {
      if (!loop) return i - at;
      const ahead = ((i - at) % count + count) % count;
      return ahead > count / 2 ? ahead - count : ahead;
    },
    [loop, count],
  );

  /* Both the dots and the 15-second tick hand this an INDEX, and `pos` is always a valid one, so
     there is no delta arithmetic to do: the slot rule above turns "go to index 0" from the last
     slide into one step forward on its own, because index 0 is half a revolution nearer forwards
     than backwards. That is the same thing keen-slider's `moveToIdx` does under `loop`, and it is
     why the original can pass one `onChange` for a click and for a tick. */
  const goTo = React.useCallback(
    (next) => {
      setTrack(({ pos: p }) => {
        const target = typeof next === 'function' ? next(p) : next;
        return { from: p, pos: ((target % count) + count) % count, moving: true };
      });
    },
    [count],
  );

  const move = React.useCallback(
    (delta) => {
      setTrack(({ pos: p }) => ({
        from: p,
        pos: loop ? ((p + delta) % count + count) % count : Math.min(Math.max(p + delta, 0), count - 1),
        moving: true,
      }));
    },
    [loop, count],
  );

  /* `(container - spacing * (perView - 1)) / perView` — 384 at the 1168 container the live DOM
     was read at, 400 at the 1216 this build's desktop column is. On mobile, use percentage-based
     sizing to ensure slides fill the viewport properly. On desktop, use pixel-based sizing. */
  const slideWidth = width ? (width - spacing * (perView - 1)) / perView : 0;
  const size = isDesktop && slideWidth ? `${slideWidth}px` : `${100 / perView}%`;

  const drag = useDrag(move, setDragOffset, slideWidth || width || 300);

  /* AFTER every hook, not before `useDrag`: the gates can take the strip from some slides to
     none (an agent-tree player's promotions close once their capabilities land), and an early
     return above a hook would then render fewer hooks than the frame before. */
  if (!count) return null;

  return (
    <>
      <div ref={setWrapNode} className="carousel-wrap relative">
        {/* `<Show when={v() > 3 && !B.mobile}>`. Both halves matter: three-or-fewer slides all fit
            at once, and on a phone the strip is swiped rather than clicked. They are hidden by
            opacity rather than by absence — see Banner.css. */}
        {loop && isDesktop && (
          <>
            <button
              type="button"
              aria-label="Previous"
              className="carousel-cahnge-btn button center absolute -left-4 top-0 flex h-full w-4 p-0 2xl:-left-6 2xl:w-6"
              onClick={() => move(-1)}
            >
              <ArrowIcon className="size-4 fill-primary" />
            </button>
            <button
              type="button"
              aria-label="Next"
              /* `to-0` is a dead class — not in any of the deploy's stylesheets, and not a
                 Tailwind utility either. Kept, like every other dead class here. */
              className="carousel-cahnge-btn to-0 button center absolute -right-4 flex h-full w-4 p-0 2xl:-right-6 2xl:w-6"
              onClick={() => move(1)}
            >
              <ArrowIcon className="size-4 rotate-180 fill-primary" />
            </button>
          </>
        )}

        {/* THE HOVER LISTENERS GO HERE, NOT ON `.carousel-wrap`, and the difference is visible:
            `Q(() => r.container, { mouseenter, mouseleave })` binds them to keen-slider's own
            container, which is this element. The arrows are absolutely positioned at `-left-4` /
            `-right-4`, so they stick OUT of this box — hovering one satisfies
            `.carousel-wrap:hover` (which is how they become visible at all) without ever entering
            the strip. So the 15-second timer keeps running while you reach for an arrow and only
            pauses once the pointer is over a card. On the wrapper instead, the timer froze the
            moment the arrows appeared. */}
        <div
          className="carousels"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerCancel}
          onDragStart={drag.onDragStart}
          onClickCapture={drag.onClickCapture}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* THE SITE RESERVES `h-[12.625rem]` FOR THIS, and it is not a value chosen here: the
              note on `CARD_BODY` in ./card.js works the card's own height out to 202px from its
              `h-44` plus `p-3` twice plus `pt-0.5`, and 12.625rem is 202px — the original's own
              loading skeleton for this carousel. So the placeholders are the card's box exactly
              and the page below the hero does not move when the feed lands.

              They are rendered INSIDE `.carousels`, not in place of it, so `setWrapNode` above is
              already attached and the ResizeObserver has measured by the time the real slides
              mount. Swapping the whole wrapper out would put the first painted frame back at
              `width = 0` — which drives `perView` to 1 — and the strip would ease from one card
              across to three, the exact reload jump the note above this component describes. */}
          {feedLoading
            ? Array.from({ length: perView }, (unused, i) => (
                <div
                  key={`skeleton-${i}`}
                  className={SLIDE_PAD}
                  style={{ minWidth: size, maxWidth: size }}
                >
                  <Skeleton className="block h-[12.625rem] w-full rounded-xl" radius={0}>
                    <div className="size-full" />
                  </Skeleton>
                </div>
              ))
            : slides.map((slide, i) => {
                const slot = slotAt(i, pos);

                /* A slide that moved more than one slot has wrapped from one end of the strip to the
                   other, and its path crosses the visible window — so it must teleport rather than
                   animate. keen-slider gets this for free by writing transforms per frame; here it is
                   one inline override on the slides that are actually wrapping, which is never more
                   than `perView` of them and never one that is on screen at either end. */
                const jumped = Math.abs(slot - slotAt(i, from)) > 1;

                /* Base translation for the slot position, plus the live drag offset */
                const tx = slot * (slideWidth + spacing) - i * slideWidth + dragOffset;

                return (
                  <React.Fragment key={slide.key}>
                    {slide.render({
                      minWidth: size,
                      maxWidth: size,
                      transform: `translate3d(${tx}px, 0, 0)`,
                      /* During a drag, disable transitions so slides follow the pointer instantly.
                         Otherwise use the normal 300ms ease for snap animations. */
                      transition: isDragging || jumped || !moving ? 'none' : undefined,
                    })}
                  </React.Fragment>
                );
              })}
        </div>
      </div>

      {/* No dots while the feed is out: their count IS the slide count, so drawing them early
          would mean redrawing a different number of them when it lands — and the fill is a 15s
          tween that would already be part-run against the wrong index. */}
      {/* One slide needs no pager — and the deposit slide alone draws nothing when the account
          has no deposit bonus, which left a lone dot floating over an empty hero. */}
      {!feedLoading && count > 1 && (
        <Dots index={pos} dots={count} pause={!inView || hovered || isDragging} onChange={goTo} />
      )}
    </>
  );
}

