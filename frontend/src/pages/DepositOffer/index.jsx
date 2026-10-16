import React from "react";
import { getDepositBonuses } from "../../services/bonus";
import { useResource } from "../../hooks/useResource";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { stageMatch } from "./depositOffer";
import DetailDialog from "./DetailDialog";
import {
  BarsIcon,
  BoltIcon,
  ClockIcon,
  GiftIcon,
  InfoIcon,
  LockIcon,
} from "./icons";
import "./DepositOffer.css";
import Skeleton from '../../components/shared/Skeleton';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import * as globMaps from './index.globs.js';

/* The deposit-bonus page — `/deposit-offer`.
 *
 * That path is the original's own: `{ path: "/deposit-offer", component: c(() =>
 * L.DepositOffer()), info: { dialog: m.mobile } }` in Enter-MsmOuq5R.js. It is what the
 * sidebar's "Deposit Bonus" row means — that row already carried the matching sprite,
 * `menuIcon: 'deposit_offer'`, and had nowhere to go.
 *
 * `dialog: m.mobile` is the same flag the promotions page carries: a page on desktop, a
 * full-screen dialog on a phone. Only the page side is built, as there.
 *
 * The markup below is transcribed from the live page's rendered DOM, so the class lists are
 * the site's. Four things in them are worth not "tidying":
 *
 * - The "Available Promotions" heading really does ship `class="undefined mb-4 ..."` on the
 *   original — a template that interpolated a variable that was not set. It is dropped here
 *   rather than reproduced; it styles nothing and a literal `undefined` in a class list reads
 *   as a bug in THIS code.
 * - The stepper's track is inset `left: 8%; right: 8%` against four `w-[16%]` steps laid out
 *   with `justify-between`. 8% is half a step, so the rail starts and ends on the centre of
 *   the first and last dot rather than on their edges. Neither number is arbitrary and they
 *   have to move together.
 * - Two inline values are TRANSLATED, not copied: the outlines resolve
 *   `var(--Border-Color-border-white_alpha5, ...)`, a custom property this build does not
 *   declare, so the rgba fallback is written directly; and the fill's gradient reads
 *   `rgb(var(--brand))` on the original, which is the mirror's colour scheme and resolves to
 *   nothing here (see the cascade note in CLAUDE.md — a bare `rgb(var(--x))` anywhere in src/
 *   is a bug). `var(--color-brand)` is this build's spelling of the same colour.
 * - The clock's `text-[#070F0B] dark:text-[#D5E2E5]` is the original's own literal pair, not a
 *   token. The dark value is `primary_alw` to the digit; it is left as written because the
 *   light half has no token at all and splitting the pair would be worse.
 *
 * The info icon is a plain `<svg class="... cursor-pointer">` with a click handler on the
 * original. It is a real `<button>` here — same pixels, but reachable from a keyboard, which a
 * bare svg is not.
 */

/* The card and dialog artwork, `src/assets/deposit-offer/monthly.png` — a 200x200 RGBA export
   supplied directly, because it could not be fetched: on the live site it is
   `/assets/monthly-BVEfL9VE.png`, bundled into the page chunk that is missing from the mirror,
   and bc.game's own origin times out from this environment (its CDNs do not, which is how the
   promotions art came down — that is a per-host thing, not a general one).

   Resolved by glob rather than a static import, so the fixture's `image` field doubles as the
   basename with no lookup table, exactly as on the promotions page. The miss branch in `artFor`
   stays even though nothing hits it now: a promotion added before its art arrives should render
   an empty slot AT ITS REAL SIZE rather than a broken image, which keeps the card and the
   dialog header at their true heights either way. */
const art = globMaps.art;

const artFor = (name) =>
  art[`../../assets/deposit-offer/${name}.png`] ||
  art[`../../assets/deposit-offer/${name}.avif`] ||
  art[`../../assets/deposit-offer/${name}.jpg`];

/* `<span maxunit="2" expiresinms="...">` on the original, rendering one span per unit with a
   trailing space inside each — `<span>20d </span><span>16h </span>`. Reproduced, spaces
   included, because that is what puts the gap between the two figures.
 *
 * "maxunit" counts from the largest unit that is non-zero, not from days: with four days left
 * it reads "4d 3h", with fifty minutes left "50m 12s". The clock ticks every second even when
 * the smallest unit shown is hours — cheap, and it is what makes the roll-over land on time
 * rather than up to an hour late. */
const UNITS = [
  ["d", 86400000],
  ["h", 3600000],
  ["m", 60000],
  ["s", 1000],
];

function Countdown({ expiresAt, maxUnit = 2, className = "" }) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, expiresAt - now);
  const first = UNITS.findIndex(
    ([, ms], index) => remaining >= ms || index === UNITS.length - 1,
  );

  /* Reduced into a finished array rather than divided down inside the JSX callback: the
     running remainder is a mutation, and a mutation inside a callback that React may run after
     the render has completed is what `react-hooks/immutability` rejects. */
  const shown = UNITS.slice(first, first + maxUnit).reduce(
    ({ rest, parts }, [suffix, ms]) => {
      const value = Math.floor(rest / ms);
      return { rest: rest - value * ms, parts: [...parts, { suffix, value }] };
    },
    { rest: remaining, parts: [] },
  ).parts;

  return (
    <span className={className}>
      {shown.map(({ suffix, value }) => (
        <span key={suffix}>
          {value}
          {suffix}{" "}
        </span>
      ))}
    </span>
  );
}

/* One dot on the four-stage rail. Everything that changes between the current stage and the
   rest is a class swap on the same three boxes — the original renders both states from one
   component too, which is why the inactive dot still carries the outline-less circle rather
   than a different element. `cursor-not-allowed` is on every stage in the capture: nothing is
   claimable while signed out. */
const Stage = ({ stage, index, current }) => {
  const active = index + 1 === current;

  return (
    <div className="relative z-10 flex w-[16%] flex-none flex-col items-center">
      <div className="relative flex cursor-not-allowed flex-col items-center gap-1">
        <div className="flex items-center justify-center">
          <div
            className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-layer3_alt dark:bg-layer3 ${
              active ? "outline outline-2 outline-brand" : ""
            }`}
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-layer3_alt text-sm font-normal dark:bg-layer4">
              {active ? (
                <LockIcon className="icon size-4 fill-brand/60" />
              ) : (
                <span className="text-secondary">{index + 1}</span>
              )}
            </div>
          </div>
        </div>

        {/* The little pointer between the dot and its label. Below sm the inactive ones are
            transparent rather than absent, so the labels stay on one baseline. */}
        <div
          className={`mt-1 size-0 border-x-[5px] border-b-[6px] border-x-transparent ${
            active
              ? "border-b-brand/50"
              : "max-sm:border-b-transparent sm:border-b-layer3"
          }`}
        />

        <div
          className={`flex flex-row items-center justify-center whitespace-nowrap rounded-full px-2.5 text-sm font-semibold max-sm:py-0 max-sm:text-[0.625rem] sm:py-1 ${
            active
              ? "text-primary outline outline-2 outline-brand max-sm:bg-brand/20"
              : "text-secondary sm:bg-layer3"
          }`}
        >
          {stage.label}
        </div>
      </div>
    </div>
  );
};

/* The white_alpha5 hairline the page draws with an inline `outline` rather than a border, so
   it does not take part in the box model. Written out three times on the original; one
   constant here. */
const HAIRLINE = {
  outline: "1px rgba(255, 255, 255, 0.05) solid",
  outlineOffset: "-1px",
};

function ProgressCard({ bonus, resetAt, onOpenDetail }) {
  /* `ot` builds every Button as `Y("button", zx[type], s() && \`button-${s()}\`, t.class)` with
     `s = size || !mobile && "m"` — so a button naming no size gets `button-m` on a DESKTOP and
     NOTHING on a phone. The rendered mobile markup confirms it: the Deposit Now button there is
     `class="button button-brand w-full rounded-xl"` with no size class at all. This was written
     unconditionally and so pinned the button to `.button-m`'s 2.5rem on a phone, where the base
     `.button`'s 3rem is what renders on the original — 8px short. `lg` is this project's line for
     `m.mobile`, as everywhere. */
  const isDesktop = useIsDesktop();
  const stage = bonus.stages[bonus.currentStage - 1] ?? bonus.stages[0];
  const booster = bonus.tags[0];

  return (
    <div
      /* `max-sm:mt-5` IS A DEPARTURE, requested, and it is deliberately on THIS CARD rather than
         on the heading above it. The heading is `components/shared`-style shared markup inside
         this page — one `SectionHeading` renders both Promotion Progress and Available
         PROMOTIONS — so widening its `mb` opens BOTH gaps, which an earlier pass did and had to
         be walked back. The card's own top margin reaches only this one pair.

         It works because the two margins COLLAPSE and the larger wins: the heading's
         `max-sm:mb-2` is 8, this was `max-sm:mt-3` at 12 (so 12 was the rendered gap on the
         original), and 20 is now the whole of it — it went 12 -> 16 -> here. `mt-6` is 24 if it
         wants more; anything at or under `mt-2` does nothing at all, since the heading's own 8
         becomes the larger of the two again and the collapse floors it there.

         Phone-only by construction — the class is already `max-sm:`, and the desktop pair
         (`mb-6` with no `mt`) is the chunk's own and is untouched. */
      className="mb-6 flex flex-col rounded-xl bg-layer3_alt max-sm:mb-4 max-sm:mt-5"
      style={HAIRLINE}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold text-primary max-sm:text-sm">
            {bonus.title}
          </span>
          <span className="flex flex-row items-center gap-1 rounded-lg bg-layer4 px-2 py-1 text-sm font-semibold text-primary max-sm:text-xs">
            <ClockIcon className="icon size-4 text-[#070F0B] dark:text-[#D5E2E5]" />
            Reset in
            <Countdown expiresAt={resetAt} className="text-primary" />
          </span>
        </div>

        <button
          type="button"
          aria-label={`About ${bonus.title}`}
          onClick={onOpenDetail}
          className="flex cursor-pointer border-none bg-transparent p-0"
        >
          <InfoIcon className="icon size-6 fill-secondary" />
        </button>
      </div>

      <div
        className="flex items-start gap-4 rounded-xl bg-layer4 p-5 max-sm:flex-col max-sm:items-center max-sm:p-3"
        style={HAIRLINE}
      >
        <div className="flex w-full flex-1 flex-col gap-4 max-sm:items-center max-sm:gap-4 max-sm:px-5 max-sm:pt-2 sm:px-5 sm:py-5">
          <div className="flex flex-row items-center gap-4 max-sm:flex-col">
            <div className="flex w-fit flex-row items-center rounded-md bg-brand/10 px-2 py-1 text-xs font-normal text-brand">
              <BoltIcon className="icon size-4 text-brand" />
              {booster.label}
            </div>
          </div>

          {/* The headline is `stage.bonus + stage.rakeback` for the CURRENT stage — 180 + 40 on
              the capture, which is where its "220% Deposit Rakeback" comes from. Printed rather
              than stored so it cannot drift from the dialog's calculator. */}
          <p className="flex flex-row justify-between text-xl font-extrabold text-primary max-sm:flex-col max-sm:items-center">
            <span className="text-3xl font-extrabold text-primary max-sm:text-2xl">
              {stageMatch(stage)}% Deposit Rakeback
            </span>
          </p>

          <div className="relative my-6 flex items-start justify-between max-sm:my-3 max-sm:w-full">
            <div
              className="absolute h-[0.9375rem] bg-layer3_alt dark:bg-layer3"
              style={{ top: "0.65625rem", left: "8%", right: "8%" }}
            />
            <div
              className="absolute h-[0.5rem] transition-all duration-300"
              style={{
                top: "0.875rem",
                left: "8%",
                width: `${bonus.progress}%`,
                background:
                  "linear-gradient(90deg, var(--color-brand) 0%, #292D2E 100%)",
              }}
            />
            {bonus.stages.map((s, index) => (
              <Stage
                key={s.label}
                stage={s}
                index={index}
                current={bonus.currentStage}
              />
            ))}
          </div>
        </div>

        <div className="flex w-80 shrink-0 flex-col justify-between gap-4 rounded-xl bg-layer3_alt p-5 max-sm:w-full dark:bg-black_alpha10">
          <ul className="flex flex-col px-5">
            {bonus.steps.map((step, index) => {
              const last = index === bonus.steps.length - 1;
              return (
                <li key={step} className="flex gap-[0.625rem]">
                  <div className="flex flex-col items-center">
                    <span className="deposit-offer-bullet mt-[0.4375rem] size-1.5 shrink-0 rounded-full bg-brand" />
                    {/* The negative bottom margin is the original's: it pulls the dotted rail
                        past the row's own box so the dashes meet the next bullet's 0.4375rem
                        top offset instead of stopping short of it. */}
                    {!last && (
                      <div className="deposit-offer-thread mb-[-0.4375rem] w-0.5 flex-1" />
                    )}
                  </div>
                  <span
                    className={`text-sm text-primary ${last ? "" : "pb-3"}`}
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Inert — there is no deposit flow behind it yet. */}
          <button
            type="button"
            className={`button button-brand w-full rounded-xl${isDesktop ? " button-m" : ""}`}
          >
            Deposit Now
          </button>
        </div>
      </div>
    </div>
  );
}

function PromotionCard({ bonus, resetAt, onOpenDetail }) {
  const image = artFor(bonus.image);

  return (
    <div
      className="relative flex w-full min-w-[17rem] max-w-[25rem] flex-col gap-3 overflow-hidden rounded-lg bg-layer3 p-4 sm:max-w-none"
      style={HAIRLINE}
    >
      <span className="absolute right-0 top-0 flex flex-row items-center justify-center rounded-bl-lg bg-white_alpha5 px-2 py-1">
        <ClockIcon className="icon size-4 text-[#070F0B] dark:text-[#D5E2E5]" />
        <span className="ml-[2px] mr-1 text-[0.625rem] font-semibold text-primary">
          Reset in
        </span>
        <Countdown
          expiresAt={resetAt}
          className="text-[0.625rem] text-primary"
        />
      </span>

      <span className="flex flex-row items-center gap-3">
        <span className="size-12 flex-none">
          {image && (
            <img className="size-full object-contain" alt="" src={image} />
          )}
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-base font-extrabold text-primary">
            {bonus.title}
          </span>
          <span className="flex flex-row flex-wrap gap-1">
            {bonus.tags.map((tag) => (
              <span
                key={tag.label}
                className={`rounded-md px-2 py-1 text-[0.625rem] font-semibold uppercase ${
                  tag.color ? "" : "bg-white_alpha5 text-secondary"
                }`}
                /* Inline on the original too — the booster green is a literal there, not a
                   token, and it is NOT `brand_alt` (#9FE871) despite being one digit away. */
                style={
                  tag.color
                    ? { background: `${tag.color}33`, color: tag.color }
                    : undefined
                }
              >
                {tag.label}
              </span>
            ))}
          </span>
        </span>
      </span>

      <div
        className="flex-1 rounded-md p-3 text-sm font-semibold text-secondary"
        style={{ background: "rgba(255, 255, 255, 0.02)" }}
      >
        {bonus.description}
      </div>

      <div className="flex flex-row items-center gap-3">
        <button
          type="button"
          onClick={onOpenDetail}
          className="flex flex-1 cursor-pointer flex-row items-center justify-center rounded-lg bg-black_alpha5 py-2"
          style={{ outline: "1px var(--color-third) solid" }}
        >
          <span className="flex flex-row items-center justify-center text-base font-extrabold text-primary">
            View Detail
          </span>
        </button>
      </div>
    </div>
  );
}

/* BACK TO THE ORIGINAL'S OWN PAIR, `mb-4 … max-sm:mb-2`, now that the rendered markup is in hand:
   `<span class="pt-8 max-sm:pt-5 mb-4 flex flex-row items-center gap-1 max-sm:mb-2">`. This went
   8 -> 24 -> 16 by eye over three passes and lands back on 8, which is the useful part of the
   detour rather than an embarrassment — see the collapse note below for why 8 does not mean 8.

   THE CHUNK'S 8px NEVER RENDERS UNDER THE FIRST HEADING. The next element there is the progress
   card, whose root carries `max-sm:mt-3`; adjacent siblings in a plain block COLLAPSE and the
   larger wins, so the gap over the monthly card is the card's 12 and this rule's 8 is invisible.
   Under the SECOND heading there is no such floor — the promotions grid brings no top margin — so
   that gap is exactly 8. The two therefore differ on the original by 4px, which is worth knowing
   before anyone "fixes" them to match each other. (The heading is a `<span>` and margins would
   not apply at all, but `flex` makes it a block-level box, so they do.)

   `max-sm:mb-4` or `mb-6` if more air is wanted again; it is one word, and only the phone arm
   should move — the `mb-4` that applies from `sm` up is the original's at every width.

   `${className}` LEADS AND HAS NO DEFAULT, and both halves of that are the markup's. The first
   heading is handed `pt-8 max-sm:pt-5` and the second is handed nothing — and the original's own
   second heading renders `class="undefined mb-4 flex …"`, a literal `undefined` from stringifying
   an absent prop. Dropping the default reproduces it exactly, because a template literal spells
   `undefined` the same way. Kept for the reason `f-ull` and `texxt-sm` are: it is what the live
   page ships, it matches nothing, and inventing a tidier class list here would be a divergence
   that no capture supports. */
const SectionHeading = ({ icon: Icon, children, className }) => (
  <span
    className={`${className} mb-4 flex flex-row items-center gap-1 max-sm:mb-2`}
  >
    <Icon className="icon size-6 text-brand max-sm:size-5" />
    <span className="text-base font-extrabold uppercase text-secondary max-sm:text-sm">
      {children}
    </span>
  </span>
);

export default function DepositOffer() {
  const { data, loading } = useResource(getDepositBonuses);
  const [detail, setDetail] = React.useState(null);

  const bonuses = data?.bonuses ?? [];
  const resetAt = data?.resetAt ?? 0;

  return (
    /* `px-4 sm:px-0` is the page's own mobile gutter, as on its promotions siblings:
       `.main-layout-content` runs `padding-inline: 0` below 640 by design — each page supplies
       its own inset there, because the home hero has to go full-bleed — and this one was
       missing it, so the cards ran edge-to-edge on a phone. The dialog below is unaffected
       either way: `.pop-overlayer` is `position: fixed`, so no ancestor padding reaches it. */
    <div className="px-4 sm:px-0">
      {/* Both sections render the SAME list. The capture holds one deposit bonus and shows it
          twice — once as a progress card, once as an available promotion — and the service
          returns one list because that is what `times-deposit-bonus/list/` is. With more than
          one entry this renders a progress card each and then a grid, which is the reading the
          two headings support ("Progress" singular per bonus, a 3-across grid for the rest);
          it is an inference from a one-row capture and nothing more. */}
      <SectionHeading icon={BarsIcon} className="pt-8 max-sm:pt-5">
        Promotion Progress
      </SectionHeading>

      {/* BOTH SECTIONS RENDER THE SAME LIST, so both wait on the same read — but the two headings
          do not, since they are literals in the markup. That is why the placeholders go under
          each heading rather than replacing the page: the two `SectionHeading` rows are already
          where they will be, and only the cards arrive. */}
      {loading ? (
        <Skeleton className="mt-4 block h-40 w-full rounded-xl" radius={0}>
          <div className="size-full" />
        </Skeleton>
      ) : bonuses.length === 0 ? (
        /* Nothing on offer: the site admin's first-deposit bonus is off or has no tiers
           (Site config › Welcome bonuses). The site's own empty state, once, instead of two bare
           headings. */
        <EmptyPlaceholder />
      ) : (
        bonuses.map((bonus) => (
          <ProgressCard
            key={bonus.id}
            bonus={bonus}
            resetAt={resetAt}
            onOpenDetail={() => setDetail(bonus)}
          />
        ))
      )}

      {(loading || bonuses.length > 0) && <SectionHeading icon={GiftIcon}>Available PROMOTIONS</SectionHeading>}

      {/* `sm:mb-4` IS THIS BUILD'S AND IS NOW DESKTOP-ONLY. The rendered markup carries no bottom
          margin on this grid at all — `class="grid grid-cols-1 justify-items-center gap-4
          sm:max-w-[76rem] …"` — and the margin exists here only because on a desktop this is the
          last thing on the page and the footer's prose band is hidden on this route, so the
          bottom row would butt into the footer's divider. Below `sm` the page is a full-screen
          dialog with no footer inside it, so there was nothing to clear and the margin was pure
          extra space under the last card. Scoped rather than deleted for that reason. */}
      <div className="grid grid-cols-1 justify-items-center gap-4 sm:mb-4 sm:max-w-[76rem] sm:justify-items-stretch md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }, (unused, i) => (
              <Skeleton key={`skeleton-${i}`} className="block h-52 w-full rounded-xl" radius={0}>
                <div className="size-full" />
              </Skeleton>
            ))
          : bonuses.map((bonus) => (
              <PromotionCard
                key={bonus.id}
                bonus={bonus}
                resetAt={resetAt}
                onOpenDetail={() => setDetail(bonus)}
              />
            ))}
      </div>

      {detail && (
        <DetailDialog bonus={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
