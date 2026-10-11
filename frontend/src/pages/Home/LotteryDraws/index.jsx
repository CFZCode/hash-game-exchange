import React from 'react';
import SectionHeader from '../../../components/shared/SectionHeader';
import { Controller } from '../GameSection';
import { themeFor, splitName, countryRow } from './draws';
import Skeleton from '../../../components/shared/Skeleton';
import { getLotteryDraws } from '../../../services/home';
import { useResource } from '../../../hooks/useResource';
import countriesSprite from '../../../assets/lottery/countries.png';
import '../GameSection/GameSection.css';

/* Upcoming Lottery Draw.
 *
 * Source: `_t` (card) and the section body in
 * bc.game/bc.game/assets/UpcomingDrawSection-CtMdH9N2.js, with the country avatar from
 * CountryAvatar-BcLxhT6B.js and the sprite offsets from lottery-B9Hmj8MW.js. The row is the
 * same scroller as the game sections but on the `grid-col-2` preset (2/3/3/4/5/6 columns)
 * with --aspect-ratio .92 rather than the games' .75.
 */

/* The flag is one row of a 100x4500 sprite (45 countries, 100px each), shown inside a round
   window. `w-full max-w-none` makes the sprite as wide as the window and lets the rows scale
   with it, so a whole-row offset is always exactly -100% per row. */
function CountryAvatar({ country }) {
  return (
    <div className="relative aspect-square size-full overflow-hidden rounded-full">
      <img
        className="absolute left-0 w-full max-w-none"
        style={{ top: `${countryRow(country) * -100}%` }}
        src={countriesSprite}
        alt={country}
      />
    </div>
  );
}

const pad = (n) => String(n).padStart(2, '0');

/* One ticker for the whole row rather than one per card — they all count against the same
   clock, and the original likewise drives every card from a single shared timer. */
function useCountdown() {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (secondsOut) => {
    /* Rolls over instead of going negative: the live page refetches when a draw closes and
       the next one takes its place, and this keeps the row ticking without a data layer. */
    const left = ((secondsOut - elapsed) % secondsOut + secondsOut) % secondsOut;
    return {
      hours: pad(Math.floor(left / 3600)),
      minutes: pad(Math.floor((left % 3600) / 60)),
      seconds: pad(left % 60),
    };
  };
}

const money = (n) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function DrawCard({ draw, index, remaining }) {
  const theme = themeFor(index);
  const { text, suffix, isShort } = splitName(draw.name);
  const t = remaining(draw.secondsOut);

  return (
    <div className="group mx-0.5 flex flex-shrink-0 select-none flex-col font-sans">
      {/* @container is what makes the artwork self-scaling: every size inside is in cqw, so
          the panel renders identically at any column count without a single breakpoint. */}
      <div
        className="@container relative flex aspect-[2/1] w-full flex-col rounded-xl bg-layer4 pb-[4.2%] pt-[6.3%] leading-[1.28]"
        style={{
          backgroundImage: `url(${theme.bg})`,
          backgroundPosition: 'center',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute left-1 top-1 aspect-square w-[16.8%]">
          <CountryAvatar country={draw.country} />
        </div>

        <div
          title={draw.name}
          className={`mx-auto text-center text-[7.37cqw] font-extrabold text-[#D5E2E5] ${
            isShort ? 'w-[40%] text-balance' : 'line-clamp-2 w-[56%] text-ellipsis'
          }`}
        >
          {text}
          <span className="text-secondary">{suffix}</span>
        </div>

        <img alt="ball" className="z-1 absolute bottom-0 left-0 h-[90%]" src={theme.ball} />

        <div
          className="mx-auto mt-auto flex h-[40%] w-[70%] items-center justify-center rounded-lg border border-dashed bg-black_alpha10 text-[9.47cqw] font-extrabold"
          style={{ borderColor: theme.border }}
        >
          {money(draw.topPrize)}
        </div>
      </div>

      {/* The perforation between the two halves — a repeating hard-stop gradient, not a
          border, so the dashes stay evenly spaced at any card width. */}
      <div
        className="mx-auto w-[90%]"
        style={{
          height: '5px',
          backgroundImage:
            'linear-gradient(to right, var(--color-layer4) 50%, transparent 0)',
          backgroundSize: '10px 100%',
          backgroundRepeat: 'round',
        }}
      />

      <div className="flex flex-col gap-1 rounded-xl bg-layer4 p-2">
        <button type="button" className="button button-brand h-8 w-full">
          Bet Now
        </button>
        <div className="text-sm font-semibold text-secondary">Next Draw Starts in</div>
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="flex-1 rounded-lg bg-layer5 px-1.5 py-1 text-center">{t.hours}h</span>
          <span>:</span>
          <span className="flex-1 rounded-lg bg-layer5 px-1.5 py-1 text-center">{t.minutes}m</span>
          <span>:</span>
          <span className="flex-1 rounded-lg bg-layer5 px-1.5 py-1 text-center">{t.seconds}s</span>
        </div>
      </div>
    </div>
  );
}

export default function LotteryDraws() {
  const { data: draws } = useResource(getLotteryDraws);
  const scrollerRef = React.useRef(null);
  const remaining = useCountdown();

  return (
    <>
      <SectionHeader
        className="px-4 sm:px-0"
        href="/lottery"
        controller={<Controller scrollerRef={scrollerRef} />}
      >
        Upcoming Lottery Draw
      </SectionHeader>

      <div
        ref={scrollerRef}
        className="grid-col-2 smooth-scroll smooth-list hide-scroll relative grid snap-x snap-mandatory grid-flow-col gap-2 overflow-x-scroll overflow-y-hidden scroll-smooth pt-3"
        style={{ '--grid-gap': '.5rem', '--aspect-ratio': 0.92 }}
      >
        {/* `grid-col-2` sizes each column and `--aspect-ratio: .92` its height, so a placeholder
            only has to fill the cell — exactly the arrangement the game rows' skeleton has, down
            to needing a plain div between the grid child and the `Skeleton`: `.grid-col-2 > div >
            *` is `position: absolute; inset: 0` and `.skeleton` is `position: relative`, both
            unlayered at equal specificity, so the skeleton would win and collapse. */}
        {draws
          ? draws.map((d, i) => (
              <div key={d.id}>
                <DrawCard draw={d} index={i} remaining={remaining} />
              </div>
            ))
          : [0, 1, 2, 3].map((slot) => (
              <div key={`skeleton-${slot}`}>
                <div className="size-full px-0.5">
                  <Skeleton className="size-full rounded-xl" radius={0} />
                </div>
              </div>
            ))}
      </div>
    </>
  );
}
