import React from 'react';
import { BUSINESS_EMAIL } from './referral';
import { fill, SCROLL_SPEED, walletCode } from './format';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';
import * as globMaps from './blocks.globs.js';

/* The three bands the referral pages SHARE — `Questions-dsRHzmFN.js`, whose `L`, `P` and `Q`
 * exports are Live Rewards, the affiliate-programme band and the FAQ.
 *
 * They were `pages/Referral/index.jsx`'s own until the signed-in dashboard became a second call
 * site, and the move is the chunk's own arrangement rather than a convenience: both
 * `index-ve9CyRhD.js` (the exhibition page) and `index-CgFyS3aK.js` (the dashboard) import the
 * same three from it. Kept in `pages/Referral/` rather than lifted to `components/shared`,
 * because both call sites are this page family — the rule is a second PAGE, not a second render.
 */

const art = globMaps.art;
const artFor = (name) => art[`../../assets/referral/${name}.png`];

const coins = globMaps.coins;
const coinIcon = (currency) => coins[`../../assets/coins/${currency}.png`];

/* The site's single chevron, rotated per state. `rotate-180` closed / `rotate-[270deg]` open,
   straight out of the shared Collapsible's trigger in index-BsFv7ByC.js — the same pair the VIP
   page's FAQ and the promotions pager draw. */
const ChevronIcon = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

/* A `<T>` default rendered out — the segment forms are described in referral.js. `brand` is the
   green span inside a heading, `plain` a bare `<span>`, `action` the green clickable one. */
export const Segments = ({ parts, amount, onAction }) =>
  parts.map((part, i) => {
    if (part.br) return <br key={i} />;
    const text = fill(part.text, amount);
    if (part.brand)
      return (
        <span key={i} className="text-brand">
          {text}
        </span>
      );
    if (part.action)
      return (
        <span
          key={i}
          className="ml-1 cursor-pointer text-brand"
          onClick={() => onAction?.(part.action)}
        >
          {text}
        </span>
      );
    if (part.plain) return <span key={i}>{text}</span>;
    return <React.Fragment key={i}>{text}</React.Fragment>;
  });

/* One FAQ row. This is the shared **Collapsible** (`pl` in index-BsFv7ByC.js), NOT the Accordion
   the VIP page's FAQ uses — each row owns its own open state, so several can be open at once.
   Root is a bare `<div>`; the trigger and the chevron box are the primitive's own markup.
 *
 * `defaultOpen: index === 0` IS PASSED AND IS DEAD. The chunk's wrapper builds
 * `<Collapsible><Trigger/><Content/></Collapsible>` without spreading its props onto the
 * Collapsible, so the flag never reaches the primitive. That is why every row in the capture is
 * closed including the first — the same class of finding as `bg-from-special` on the VIP page,
 * and reproducing it means starting closed, not open. */
const FaqRow = ({ item, amount, onAction }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-3" onClick={() => setOpen((v) => !v)}>
        <span className="cursor-pointer font-extrabold">{item.question}</span>
        <div className="flex-none size-6 flex items-center justify-center bg-button_bright rounded-md">
          <ChevronIcon
            className={`transition-all size-4 duration-300 fill-secondary ${open ? 'rotate-[270deg]' : 'rotate-180'}`}
          />
        </div>
      </div>
      {open && (
        <div className="mt-1 font-semibold text-secondary">
          {typeof item.answer === 'string' ? (
            fill(item.answer, amount)
          ) : (
            <Segments parts={item.answer} amount={amount} onAction={onAction} />
          )}
        </div>
      )}
    </div>
  );
};

/* `Q` — the FAQ card. */
export function Faq({ faq, amount, onAction }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-layer4 p-6">
      <p className="text-xl font-extrabold">{faq.title}</p>
      <div className="flex flex-col gap-4">
        {faq.items.map((item) => (
          <FaqRow key={item.question} item={item} amount={amount} onAction={onAction} />
        ))}
      </div>
    </div>
  );
}

/* `L` — the Live Rewards ticker.
 *
 * IT SCROLLS ONLY WHEN THERE IS SOMETHING TO SCROLL, AND THAT GATE IS OURS — the original runs
 * `animation: scroll 30s linear infinite` unconditionally.
 *
 * The animation walks the grid up by its OWN height (`translateY(0 → -100%)`), so it empties the
 * window at the end of every cycle no matter what; the live feed only gets away with that because
 * it returns enough rows to keep something in view for most of the 30s. With the four rows that
 * were recoverable from the capture the grid is ~40px inside a 48px window, so the strip spends
 * most of the loop blank. Gating on overflow keeps it readable now and restores the original's
 * behaviour by itself once the real feed lands — more rows, taller grid, it scrolls again with
 * nothing here to change.
 *
 * Measured onto the NODE in a layout effect rather than into state: writing a measurement to
 * state during layout is the cascading render `react-hooks/set-state-in-effect` rejects, the same
 * reason the promotions tab indicator sets its custom properties this way.
 *
 * `offsetHeight`, not `getBoundingClientRect().height` — the latter includes the transform the
 * animation is applying, which would feed its own result back into the test.
 *
 * THE DURATION IS DERIVED, and this is the second half of the same departure. `30s` is not a
 * speed: the keyframes travel `-100%` of the GRID, so the distance changes with the row count and
 * the pixels-per-second fall out of it. The live feed is long, so 30s over a tall grid reads as a
 * brisk crawl; our five rows are ~184px, about 6px/s and visibly slower than the original.
 * Dividing the height by a fixed rate holds the speed constant instead, so it stays right at
 * every column count AND stays right when the real feed replaces the filler with fifty rows —
 * where a literal 30s would suddenly be several times too fast.
 *
 * SCROLL_SPEED is the one number to turn if it still reads wrong; the 30s in Referral.css stays
 * as the original's value and is what renders if this effect never runs. */
export function LiveRewards({ live }) {
  const cur = useSelectedCurrency();
  const scrollerRef = React.useRef(null);
  const gridRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const grid = gridRef.current;
    if (!scroller || !grid) return undefined;

    const sync = () => {
      const height = grid.offsetHeight;
      const overflowing = height > scroller.clientHeight;
      grid.classList.toggle('live-overflowing', overflowing);

      /* Written only when it actually changes — reassigning `animationDuration` restarts the
         animation, and ResizeObserver fires on every reflow. */
      const duration = overflowing ? `${(height / SCROLL_SPEED).toFixed(2)}s` : '';
      if (grid.style.animationDuration !== duration) grid.style.animationDuration = duration;
    };

    sync();

    /* Both boxes: the window changes with the viewport, and the grid's own height changes when
       the column count reflows or a webfont swaps in under the rows. */
    const observer = new ResizeObserver(sync);
    observer.observe(scroller);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [live]);

  // The ticker's total is in USD; each row in its own coin. Both shown in the selected currency.
  const total = cur.show(Number(live.commissionUsd) + Number(live.rewardUsd), 'USDFIAT');

  return (
    /* `md:flex-row`, not `sm:` — this is the one block on the page that stacks until 768. */
    <div className="flex flex-col gap-3 rounded-xl bg-layer4 p-6 md:flex-row md:items-center md:gap-10">
      <div className="flex flex-none flex-col gap-3 sm:w-96">
        <div className="flex items-center">
          <b className="live-dot" />
          <p className="font-extrabold">{live.title}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border-[1px] border-solid border-input bg-layer3 p-3">
          <p>{live.totalLabel}</p>
          <div className="text-xl font-extrabold text-brand">{total}</div>
        </div>
      </div>
      {/* A 48px window over a two-row grid that walks itself up by its own height on a 30s loop —
          but only once it is tall enough to have something hidden. See the layout effect above
          and `.live-overflowing` in Referral.css. */}
      <div ref={scrollerRef} className="mx-3 h-12 w-full overflow-hidden">
        <div
          ref={gridRef}
          className="live-container grid grid-rows-2 gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))' }}
        >
          {live.list.map((row, i) => (
            <div key={`${row.userName}-${i}`} className="mx-3 flex items-center justify-start gap-3">
              <p>{row.userName}</p>
              <div className="center flex-shrink-0 gap-1">
                <p className="text-nowrap font-extrabold text-brand">
                  +{cur.show(row.amount, walletCode(row.currencyName), { hasAlias: false })}
                </p>
                <img className="h-4 w-4" alt="" src={coinIcon(cur.code)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* `P` — the affiliate-programme band. `size` is the caller's `' button-m'` / `''`, which is the
   device-flag split both pages make; see the note at the exhibition page's `useMediaQuery`. */
export function ProgramBand({ program, isDesktop, size = '' }) {
  return (
    <div
      className="relative justify-end rounded-xl bg-layer4 bg-no-repeat font-semibold sm:flex"
      style={{ backgroundImage: `url(${artFor(isDesktop ? 'program_bg' : 'program_bg_m')})` }}
    >
      <div className="flex flex-col items-center justify-end p-6 sm:w-3/5">
        {/* `gap-3` with `sm:flex` is what opens the wide space in the heading — the lead and the
            green half are two anonymous flex items, so the gap is 12px of layout, not a run of
            spaces in the string. */}
        <p className="gap-3 text-center text-2xl font-extrabold sm:mb-3 sm:flex">
          {program.lead} <span className="text-brand">{program.accent}</span>
        </p>
        <img
          alt="program"
          className="left-20 w-full sm:absolute sm:bottom-0 sm:h-full sm:w-auto"
          src={artFor('program')}
        />
        {program.paragraphs.map((line) => (
          <div key={line} className="text-secondary">
            {line}
          </div>
        ))}
        {/* The non-Korean arm of the chunk's `Show`. The Korean one adds a Telegram button above
            this and capitalises "For"; `Y.lang` is fixed to en here, so only this arm can render
            and the other was not built. */}
        {BUSINESS_EMAIL && <div className="w-full">
          <div className="text-secondary">
            <span>{program.contact}</span>
          </div>
          <div className="mt-2 flex w-full items-center justify-between rounded-xl border border-input bg-layer3 px-3 py-2">
            {/* `l` is dead here — it is `.wager-item .item-inner .bot .l { opacity: .6 }`, scoped
                to a component nowhere near this page, so the email renders at full opacity. */}
            <p className="l">{BUSINESS_EMAIL}</p>
            <a className="contacts-link-item" target="_self" href={`mailto:${BUSINESS_EMAIL}`}>
              <button type="button" className={`button button-second${size} not-full h-10 p-2`}>
                {program.send}
              </button>
            </a>
          </div>
        </div>}
      </div>
    </div>
  );
}
