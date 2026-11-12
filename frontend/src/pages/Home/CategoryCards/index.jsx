import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../context/settings';
import { useGates } from '../../../context/gates';
import casinoImg from '../../../assets/casino.png';
import casinoLightImg from '../../../assets/casino_w.png';
import sportsImg from '../../../assets/sports.png';
import pokerImg from '../../../assets/poker.png';
import racingImg from '../../../assets/racing.png';
import racingLightImg from '../../../assets/racing_w.png';
import bingoImg from '../../../assets/bingo.png';
import cricketImg from '../../../assets/cricket.png';
/* A 32px two-tone mark drawn here to match the colour-icon sprite (green shape, grey twin). */
import cricketIcon from '../../../assets/cricket_icon.svg';

/* The category cards under Recent Big Wins — two feature panels over a row of four.
 *
 * DELIBERATE DEPARTURE: the original's row has five, with UPDOWN (`/trading/up-down`, a Crypto
 * Futures product) fourth. This platform has no Crypto Futures, so the card is removed on the
 * user's request and the other four share the row (`flex-1` each, so no gap is left). See
 * .claude/skills/hash-ui-fidelity, "Deliberate departures".
 *
 * Source: `cu` in bc.game/bc.game/assets/Enter-MsmOuq5R.js (the fallback of `gu`, which is
 * what actually renders: `gu`'s two real children are both behind `when: false` for this
 * region). The two card shells are `wn` (feature) and `He` (category), and the sprite icons
 * come from `ge` with `icontype: "home"`.
 *
 * All the artwork resolves through `_t(dark, light)` — `Ce.darken ? dark : light` — and TWO OF
 * THE SEVEN PAIRS ARE GENUINELY TWO FILES. Enter-MsmOuq5R.js declares them together:
 *
 *   Wc = casino-Dopam28f.png,  Qc = casino-CM4nvTEo.png,  jc = () => _t(Wc, Qc)
 *   Yc = racing-DSbD1WV7.png,  Kc = racing-h6GFQVXg.png,  qc = () => _t(Yc, Kc)
 *   Jc = sports-Bc9RAu5o.png,  Zc = lottery-4fGTpStn.png,  eu = updown, tu = bingo, nu = poker
 *
 * — the last five are single files that do not go through the picker at all, so only CASINO and
 * RACING carry a light twin and only those two are imported twice here. (`sports_in` beside the
 * sports file is an India variant, not a theme half.) No component CSS file: the section is
 * entirely utilities plus the shared `.color_icon_img` sprite positions in index.css.
 */

/* The breakpoint here is the SECTION's own width, not the viewport's — the original attaches
   a resize observer to the container and flips at 1100px. That is why the layout can be in
   its narrow form on a wide screen: an expanded 240px sidebar plus gutters leaves the column
   under 1100 until roughly a 1400px window. Do not "simplify" this to a `lg:` variant. */
const WIDE_AT = 1100;

function useIsWide(ref) {
  const [wide, setWide] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= WIDE_AT));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return wide;
}

/* `icontype: "home"` is the branch of `ge` that does NOT add `scale-[80%]`, so these render
   at the sprite's full 32px unlike the sidebar's. */
const SpriteIcon = ({ name }) => <div className={`color_icon_img ${name}`} />;

/* Both card shells navigate on click rather than being anchors: `wn` and `He` set
   `t.$$click = () => n(e.href)` on a plain <div>, where `n` is the router's navigate. Every
   href below is the original's own, straight out of `cu`. Only /casino leads anywhere real in
   this build — the rest land on the catch-all, as they did before this was wired up. */

/* `wn`. The original also carries `col-span-2 col-start-1`, dropped here: they are grid
   utilities on a flex child and resolve to nothing. `hover:bg-layer4` is kept even though it
   restates the base colour — the original declares it, and it is what makes these cards
   deliberately inert on hover. */
function FeatureCard({ src, href, children, artClass = 'right-0 top-0 h-full' }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(href)}
      className="relative flex h-32 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-layer4 p-1.5 font-extrabold hover:bg-layer4 sm:h-[176px] sm:p-5"
    >
      <img className={`absolute ${artClass}`} alt="image" src={src} />
      <div className="relative z-10 flex h-full flex-auto flex-col">{children}</div>
    </div>
  );
}

/* The blurb only exists in the wide layout; `mt-auto` is what pins it to the bottom of the
   card against the title row above it. */
function FeatureCopy({ isWide, children }) {
  return (
    <div
      className={`mb-1.5 mt-auto max-w-60 text-left font-semibold text-tertiary ${
        isWide ? 'block' : 'hidden'
      }`}
    >
      {children}
    </div>
  );
}

/* `He`. Narrow: the art is centred at 70% height and the label sits along the bottom. Wide:
   the art goes full-height and slides right (`-translate-x-[10%]` off a `left-[50%]` anchor,
   so it bleeds out of the card) and the label moves up next to the icon. */
function CategoryCard({ src, icon, title, href, isWide }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(href)}
      className="relative flex h-24 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-layer4 p-2 font-extrabold sm:h-[120px]"
    >
      <img
        alt="image"
        src={src}
        className={`absolute left-[50%] w-auto ${
          isWide ? 'top-0 h-full -translate-x-[10%]' : 'top-[5%] h-[70%] -translate-x-[50%]'
        }`}
      />
      <div className={`absolute left-2 top-2 items-center ${isWide ? 'flex' : 'hidden'}`}>
        <SpriteIcon name={icon} />
        <h2 className="ml-1 text-lg font-extrabold">{title}</h2>
      </div>
      {/* The original writes `block` and `hidden` together and lets Tailwind's emit order
          settle it. Picking one avoids depending on that. */}
      <div className={`absolute bottom-2 left-0 w-full text-center ${isWide ? 'hidden' : 'block'}`}>
        <span className={`font-extrabold ${title.length > 4 ? 'text-xs' : 'text-sm'}`}>{title}</span>
      </div>
    </div>
  );
}

const CATEGORIES = [
  { key: 'poker', icon: 'bcpoker', title: 'POKER', src: pokerImg, href: '/casino/poker' },
  /* "HORSE RACING", not the original's "RACING": the client's list, point 15. */
  { key: 'racing', icon: 'racing', title: 'HORSE RACING', src: racingImg, href: '/sports?sport=horse-racing' },
  /* LOTTERY (`/lottery`) sat here on the original; removed on the user's request, a deliberate
     departure — see .claude/skills/hash-ui-fidelity. The three remaining cards share the row. */
  /* The Bingo card's art, relabelled SLOTS on the user's request (hash.game has no slots render);
     it opens the casino Slots list, the same route as the sidebar's Slots row. */
  { key: 'slots', icon: 'bingo', title: 'SLOTS', src: bingoImg, href: '/casino/slots' },
];

/* The light half of the only paired card in that list. A lookup rather than a second field on
   the row, so the six that have no twin stay exactly as they were and nothing has to carry an
   `undefined`. Same shape as `providerLogo`'s `logoLight`. */
const CATEGORY_LIGHT = { racing: racingLightImg };

export default function CategoryCards() {
  const containerRef = React.useRef(null);
  const isWide = useIsWide(containerRef);
  const { darken } = useSettings();
  // A card into a section the owner or Super Admin switched off is not drawn.
  const { routeOn } = useGates();
  const categories = CATEGORIES.filter((c) => routeOn(c.href));
  if (!routeOn('/casino') && !routeOn('/sports') && !categories.length) return null;

  /* NO SCROLL REVEAL ON THIS BLOCK, DELIBERATELY — it used to ramp its seven cards row by row,
     15ms apart, the same entrance a game row's tiles get, and it is the one block on the page
     where that trigger cannot be right.
     ---------------------------------------------------------------------------------------
     `useScrollReveal` hides an item until its row crosses the fold, and the fold it tests is
     shrunk by `rootMargin: 0 0 -10% 0` so a row starts moving as it CLEARS the line rather than
     as it touches it. The four category cards sit directly under the hero, which puts them at
     the bottom edge of the viewport on a first paint at most window heights — inside the
     viewport, but under that 10% line. So they stayed at opacity 0 with nothing left to trigger
     them, and the row only appeared once some later scroll moved it. A block that is on screen
     at load and invisible until you scroll is worse than one that simply does not animate.

     The rows below keep theirs: they are genuinely below the fold, which is the case the
     trigger is for. The page's own sweep in Home/index.jsx already excludes `.category-cards`
     by class, so nothing else picks this block up.

     `containerRef` alone now, and the ref-callback fan-out that held it beside the reveal ref
     is gone with it. The resize observer above still measures this container to pick the layout
     at 1100, which is why the ref stays on THIS element rather than moving to a wrapper: a div
     between it and the two rows would change what `flex-3` / `flex-4` are children of. */

  return (
    /* px-4 sm:px-0 for the same reason the hero carries it: below sm the layout column has no
       inset of its own. In the original this section sits inside a `-mx-4 … p-4` wrapper that
       supplies the 16px at every width instead. */
    <div
      ref={containerRef}
      className="category-cards mt-2 flex w-full flex-col items-stretch gap-2 px-4 sm:mt-6 sm:px-0 lg:!gap-3"
    >
      {/* flex-3 / flex-4 are inert: this column has no definite height, so a 0% flex-basis
          resolves to content and both rows are sized by their cards (176 and 120 at sm).
          Kept because the original carries them. */}
      <div className="flex flex-3 gap-2 lg:!gap-3">
        {routeOn('/casino') && <FeatureCard src={darken ? casinoImg : casinoLightImg} href="/casino">
          <div className="flex items-center">
            <SpriteIcon name="casino" />
            <h2 className="ml-0.5 text-sm sm:text-[22px]">CASINO</h2>
          </div>
          <FeatureCopy isWide={isWide}>
            Dive into our in-house games, live casino and slots
          </FeatureCopy>
        </FeatureCard>}

        {/* CRICKET between Casino and Sports, on the client's request (their list, points 7 and 15):
            the exchange lobby reads `?sport=` (pages/Exchange/Lobby), so this lands on the cricket
            board. The art is the client's own render, cut to 600px like the two beside it. */}
        {routeOn('/sports') && <FeatureCard src={cricketImg} href="/sports?sport=cricket">
          <div className="flex items-center">
            <img src={cricketIcon} alt="" className="size-8" />
            <h2 className="ml-0.5 text-sm sm:text-[22px]">CRICKET</h2>
          </div>
          <FeatureCopy isWide={isWide}>
            Match odds, fancy and session markets on every big game
          </FeatureCopy>
        </FeatureCard>}

        {routeOn('/sports') && <FeatureCard src={sportsImg} href="/sports">
          {/* A <span> where Casino uses an <h2>. That asymmetry is the original's; both are
              blockified as flex items, so it changes nothing visually. */}
          <div className="flex items-center">
            <SpriteIcon name="sports" />
            <span className="ml-0.5 text-sm sm:text-[22px]">SPORTS</span>
          </div>
          <FeatureCopy isWide={isWide}>
            Bet on Football, Cricket, NFL, eSports &amp; over 80 sports!
          </FeatureCopy>
        </FeatureCard>}
      </div>

      <div className="flex flex-4 flex-wrap gap-2 lg:!gap-3">
        {categories.map((c) => (
          <CategoryCard
            key={c.key}
            src={darken ? c.src : CATEGORY_LIGHT[c.key] ?? c.src}
            icon={c.icon}
            title={c.title}
            href={c.href}
            isWide={isWide}
          />
        ))}
      </div>
    </div>
  );
}
