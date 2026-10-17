import React from "react";
import { useSelectedCurrency } from "../../hooks/useSelectedCurrency";
import { isFiatCode } from "../../utils/currency";
import Select from "../../components/shared/Select";
import PopCenter from "../../components/shared/PopCenter";
import { useSession } from "../../context/session";
import { stageMatch } from "./depositOffer";
import { CloseIcon } from "./icons";
import * as globMaps from "./DetailDialog.globs.js";

/* The detail dialog behind the progress card's info icon and the promotion card's View Detail.
 *
 * ONE dialog, two triggers — the original's own arrangement: `popupViewDetail` sits in the same
 * export registry as `DepositOffer` in Enter-MsmOuq5R.js, and it is a `le.push()` popup rather
 * than a route, which is why it is local state on the page rather than a path.
 *
 * TRANSCRIBED FROM RENDERED MARKUP. This file was first built from screenshots, because the
 * page chunk is missing from the mirror and no DOM had been captured; it has since been
 * rewritten against the real thing, so the class lists below are the site's. Worth keeping the
 * correction in mind, because the screenshot pass got a lot right and a specific class of thing
 * consistently wrong:
 *
 *   RIGHT   the 1000px content width, `w-80` calculator, `sm:min-w-[36.75rem]` stage grid, the
 *           28px column gap, 48px artwork, `border-fourth/5` hairline, `layer3` stage cards,
 *           the brand green on the figures, and that the header is sticky inside a card-height
 *           scroller.
 *   WRONG   almost every font size, and always in the same direction — too large by one step.
 *           Reading a size off a glyph's height needs a ratio that depends on which letters the
 *           string contains, and even calibrated against a screenshot where the classes ARE
 *           known it over-read: the stage label measured 13.7 and is `text-xs`, "Min deposit"
 *           measured 10.9 and is `text-[0.625rem]`, both section headings measured 17-19 and
 *           are `text-base`, "Locked Rewards" measured 16.0 and is `text-sm`. Line-height pitch
 *           was the one exact method and it was right every time. Do not trust cap-height
 *           arithmetic to pick between two adjacent steps; it cannot.
 *
 * The dialog is a `.pop-center` — the imperative popup shell, the same one the region-block and
 * language panels ride on — plus its own `bonus-terms-conditions` class, whose rules live in the
 * missing chunk and are reconstructed in DepositOffer.css. That shell is what makes the
 * measurements hang together: `.pop-center` is a flex column at `max-height: 80%`, `.pop-content`
 * is the scroller so its bar spans the whole card, and the header sticks to the top INSIDE it.
 *
 * Two pieces of the DOM are deliberately not literal:
 *
 * - The header's close is a bare `<svg class="... cursor-pointer">` with a click handler on the
 *   original. It is a real `<button>` here, positioned identically, so it is reachable from a
 *   keyboard.
 * - The coin icon is the local `assets/coins/BCD.png`; the original points at
 *   `imgxcut.com/coin/BCD.black.png`. Nothing in this build loads a remote image.
 *
 * And one is literal but should not be copied elsewhere: the currency trigger carries a
 * `[_.button]:` class, which is a Tailwind arbitrary-variant that never got its value. It
 * generates nothing. It is kept because it is what the site ships.
 */

/* The artwork, resolved by glob so the fixture's `image` field doubles as the basename. */
const art = globMaps.art;

const artFor = (name) =>
  art[`../../assets/deposit-offer/${name}.png`] ||
  art[`../../assets/deposit-offer/${name}.avif`] ||
  art[`../../assets/deposit-offer/${name}.jpg`];

const coins = globMaps.coins;
const coinIcon = (currency) => coins[`../../assets/coins/${currency}.png`];

/* The white_alpha5 hairline the page and this dialog both draw with an inline `outline` rather
   than a border, so it stays out of the box model. The original writes
   `var(--white_alpha5, rgba(255,255,255,0.05))`; that custom property does not exist in this
   build, so the fallback is written directly — see the note in index.jsx. */
const HAIRLINE = {
  outline: "1px rgba(255, 255, 255, 0.05) solid",
  outlineOffset: "-1px",
  backdropFilter: "blur(8.80px)",
};

const PANEL_EDGE = {
  outline: "1px rgba(255, 255, 255, 0.10) solid",
  outlineOffset: "-1px",
};

/* One stage: "DEPOSIT 1 / 180% + 40% RakeBack / Min deposit 5 BCD". Both percentages are a
   SINGLE span on the original — `180% + 40%` as one string — with "RakeBack" bottom-aligned
   beside it via `items-end`, not baseline-aligned. */
/* The minimum deposit in the viewer's selected currency (selected-currency skill), converted from
   the offer's own currency; printed as the offer wrote it when that currency has no price. */
function useMinDeposit(value, currency) {
  const cur = useSelectedCurrency({ site: true });
  const c = String(currency ?? '').toUpperCase();
  const src = isFiatCode(c) ? `${c}FIAT` : c;
  return cur.canConvert(src) ? cur.show(value, src, { precision: 2 }) : `${value} ${currency}`;
}

const StageCard = ({ stage, currency }) => {
  const minDeposit = useMinDeposit(stage.minDeposit, currency);
  return (
  <div
    className="relative flex w-full flex-col gap-2 rounded-md bg-layer3 p-3"
    style={HAIRLINE}
  >
    <span className="text-xs font-semibold text-primary">{stage.label}</span>
    <span className="flex flex-row items-end gap-1 text-brand">
      <span className="text-2xl font-extrabold">
        {stage.bonus}% + {stage.rakeback}%
      </span>
      <span className="text-sm font-semibold">RakeBack</span>
    </span>
    <span className="text-[0.625rem] text-secondary">
      Min deposit {minDeposit}
    </span>
  </div>
  );
};

/* A numbered step. The connector is `flex-1` under the marker with a `gap-3` between them, and
   the row's own `pb-4` is what stops the rail short of the next marker. The last row drops the
   connector and its text column takes `pb-0`. */
const HowToStep = ({ index, step, last }) => (
  <div className="flex gap-3 pb-4 pt-2">
    <div className="flex flex-col items-center gap-3">
      <div className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-white_alpha10 text-xs font-normal text-brand">
        {index + 1}
      </div>
      {!last && <div className="w-px flex-1 bg-white_alpha10" />}
    </div>
    {/* `w-0 min-w-full` is the original's, on every wrapping paragraph in this dialog. It is a
        flex-shrink guard: a long unbroken string would otherwise widen the flex item past its
        column. Kept rather than replaced with `min-w-0`, which is the same trick spelt the way
        this project would spell it. */}
    <div className={`flex w-full flex-col gap-1 ${last ? "pb-0" : ""}`}>
      <p className="text-sm font-semibold text-primary">{step.title}</p>
      <p className="w-0 min-w-full text-sm text-secondary">{step.body}</p>
    </div>
  </div>
);

/* The calculator, rendered TWICE by the original — once inside the left column for `sm:hidden`
   and once as the right column for `max-sm:hidden`. Reproduced as two mounts of one component,
   with the state held by the dialog above so a resize across `sm` does not lose what was typed.
   Only one is ever visible, so there is no duplicate-control problem. */
function Calculator({
  bonus,
  stage,
  setStage,
  amount,
  setAmount,
  currency,
  setCurrency,
  currencies,
}) {
  const match = stageMatch(stage);

  /* INFERRED, and the one number here that is. The capture only ever shows the empty state —
     "Locked Rewards: -" against a 0 amount — so the multiplication is read off the label above
     it: a 220% Bonus Match on a deposit pays 2.2x that deposit as locked rakeback. Everything
     else in this panel is transcribed. */
  const deposit = Number(amount);
  const reward =
    amount !== "" && Number.isFinite(deposit) && deposit > 0
      ? (deposit * match) / 100
      : null;

  return (
    <div
      className="flex w-80 flex-col gap-4 rounded-xl bg-layer3 p-4 max-sm:w-full"
      style={PANEL_EDGE}
    >
      <h3 className="text-base font-bold text-primary">Bonus Calculator</h3>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-secondary">Select Deposit Stage</span>
        {/* No text-size class on the original's trigger, so it inherits body's .875rem. The
            shared Select renders exactly this markup — `.button.select` with a 24px
            `input_button` chevron square — so only the size variant is passed. */}
        <Select
          value={stage}
          options={bonus.stages}
          onChange={setStage}
          title="Select Deposit Stage"
        >
          {(option) => option.label}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-secondary">Deposit Amount</span>
        {/* `!h-12` and `!pr-2` are the original's own overrides of `.input`, which is 2.5rem
            with a .1875rem end padding at lg. They survive as `!` here for the same reason they
            exist there — `.input` is layered, but these fight the `.pc` media-query variant. */}
        <div className="input !h-12 bg-layer1 !pr-2">
          <input
            type="number"
            min="0"
            placeholder="0"
            aria-label="Deposit Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Select
            value={currency}
            options={currencies}
            onChange={setCurrency}
            title="Currency"
            className="[_.button]: h-8 gap-1 !bg-input_button pl-2 pr-0"
            labelRender={(value) => (
              <>
                <img
                  className="size-4 flex-none"
                  alt="coin icon"
                  src={coinIcon(value)}
                />
                <div className="ellipsis text-sm font-extrabold text-primary">
                  {value}
                </div>
                <div className="center ms-auto size-6 rounded-md bg-input_button">
                  <ChevronIcon />
                </div>
              </>
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary">Bonus Match:</span>
        <span className="text-sm text-primary">{match}%</span>
      </div>

      {/* A zero-height rule drawn as an outline at half a pixel of offset — the original's own
          way of putting a hairline between the two summary rows. */}
      <div
        className="w-full"
        style={{
          outline: "1px rgba(255, 255, 255, 0.10) solid",
          outlineOffset: "-0.50px",
        }}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-primary">Locked Rewards:</span>
        <span className="text-sm font-bold text-primary">
          {reward === null ? "-" : `${formatReward(reward)} ${currency}`}
        </span>
      </div>

      {/* Inert — there is no wallet to open and no deposit flow behind it. */}
      <button type="button" className="button button-brand button-m w-full">
        Deposit Now
      </button>
    </div>
  );
}

export default function DetailDialog({ bonus, onClose }) {
  const { session, balances } = useSession();

  /* The body lock is `PopCenter`'s now — it calls `useDialogScrollLock(open)` itself, so calling
     it here as well would take the same lock twice. */
  const [stage, setStage] = React.useState(
    () => bonus.stages[bonus.currentStage - 1] ?? bonus.stages[0],
  );
  const [amount, setAmount] = React.useState("");

  /* The currency list is the WALLET's, not one invented for this control: the captured
     `/user/amount/` response carries BCD and MATIC, and BCD — the one the capture shows
     selected — is the account's own `bonusCurrencyName`. */
  const currencies = React.useMemo(
    () => balances.map((b) => b.currencyName),
    [balances],
  );
  /* Opens on the SELECTED wallet (selected-currency skill) when it is one of the player's coins,
     then the account's bonus currency as before. */
  const selected = useSelectedCurrency().code;
  const [currency, setCurrency] = React.useState(() =>
    (currencies.includes(selected) ? selected : null) ||
    session.bonusCurrencyName ||
    balances[0]?.currencyName ||
    "BCD",
  );

  const calculator = (
    <Calculator
      bonus={bonus}
      stage={stage}
      setStage={setStage}
      amount={amount}
      setAmount={setAmount}
      currency={currency}
      setCurrency={setCurrency}
      currencies={currencies}
    />
  );

  const image = artFor(bonus.image);

  return (
    /* THE SHELL IS `components/shared/PopCenter` NOW, where this file used to write its own
       `.pop-overlayer` + `.pop-center` by hand. Two things came with the move and both are the
       point of it.

       IT IS A BOTTOM SHEET ON A PHONE — `type="sheet"`. `cl` picks with
       `n = () => mobile ? t.type : "center"`, so a dialog naming any type other than "center"
       slides up from the bottom below the device line and is unchanged as a centred card above
       it. That arm was built long ago and unreachable: PopCenter inverts the original's default
       so the three dialogs written before any mobile work kept their card, and this file is the
       first of the three to opt back in — see the note at that prop. The slide, the 0.35s
       power3.out clock shared with the scrim, and drag-to-dismiss all come with it.

       The hand-written shell also closed on POINTERDOWN, where the original's overlayer listens
       for `click`. That is not stylistic: the scrim covers the control that opened the dialog, so
       unmounting between mousedown and mouseup delivers the click to whatever is underneath.
       PopCenter has it right and this now inherits it.

       `!bg-layer3 dark:!bg-layer2` rather than the bare pair this used to carry, because
       PopCenter writes its own `bg-layer2` on the same element: two utilities for one property
       resolve by stylesheet order, which is not something a call site should be betting on. The
       `!` settles it in both themes.

       `.pop-title` stays hidden — `.bonus-terms-conditions > .pop-title { display: none }` is
       unscoped, so the sheet's drag HANDLE is hidden with it. That matches the reference, where
       the sheet opens straight onto the artwork with no handle above it, and the gesture is bound
       to the whole panel rather than to the handle, so nothing is lost but the affordance. The
       width and padding rules beside it are already scoped to `.pop-center.bonus-terms-conditions`
       and so correctly do not reach the sheet, which is full-width by its own rule. */
    <PopCenter
      open
      onClose={onClose}
      label={bonus.title}
      type="sheet"
      className="bonus-terms-conditions !bg-layer3 dark:!bg-layer2"
    >
      <div
        className="sticky top-0 z-10 flex flex-col border-[#0A515D]/5 bg-layer1 px-6 pb-3 pt-3 max-sm:pt-5 sm:border-b-[1px] dark:border-[#E4EAF00D]"
        style={{ willChange: "transform" }}
      >
        <div className="relative flex flex-row items-center gap-4">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-1 top-1 flex cursor-pointer border-none bg-transparent p-0"
          >
            <CloseIcon className="icon size-5 text-[#B3BEC1]" />
          </button>
          <img className="size-12" alt="bonus" src={image} />
          <span className="flex flex-col gap-1">
            <span className="text-lg font-extrabold text-primary max-sm:text-2xl max-sm:font-extrabold">
              {bonus.title}
            </span>
          </span>
        </div>
      </div>

      <div className="relative overflow-x-hidden bg-layer1 max-sm:w-full sm:max-h-[70%]">
        {/* `gap-3` between the columns, not the 28px a screenshot measures — the
                  calculator's wrapper adds `sm:p-4` of its own, and 12 + 16 is where that 28
                  comes from. Same for the width: the stage grid's `sm:min-w-[36.75rem]` (588)
                  plus 12 plus the panel's 320 + 32 plus `px-6` twice is exactly 1000, and the
                  4px scrollbar makes up the 1004 the capture measures. */}
        <div className="mt-6 flex items-start gap-3 px-6 max-sm:mt-1 max-sm:flex-col sm:flex-row">
          <div className="flex flex-col gap-3 max-sm:w-full sm:w-fit">
            <div className="-mb-2 text-base font-extrabold text-primary">
              Overview
            </div>
            <div className="w-0 min-w-full text-sm font-semibold text-secondary">
              {bonus.overview}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[36.75rem]">
              {bonus.stages.map((s) => (
                <StageCard
                  key={s.label}
                  stage={s}
                  currency={bonus.minDepositCurrency}
                />
              ))}
            </div>

            {/* Below sm the calculator moves INTO the left column, between the stage grid
                      and How to Participate. The original ships both copies and toggles them
                      with `sm:hidden` / `max-sm:hidden` rather than reordering one. */}
            <div className="rounded-lg max-sm:w-full sm:hidden sm:p-4">
              {calculator}
            </div>

            <div className="flex flex-col gap-1 py-3">
              <h3 className="px-1 text-base font-extrabold leading-relaxed text-primary">
                How to Participate
              </h3>
              <div className="flex flex-col">
                {bonus.howTo.map((step, index) => (
                  <HowToStep
                    key={step.title}
                    index={index}
                    step={step}
                    last={index === bonus.howTo.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg max-sm:hidden max-sm:w-full sm:p-4">
            {calculator}
          </div>
        </div>
      </div>
    </PopCenter>
  );
}

/* `Te.Arrow`, the site's one chevron — drawn pointing left and rotated at every call site. */
const ChevronIcon = () => (
  <svg
    viewBox="0 0 32 32"
    className="icon size-4 -rotate-90 fill-secondary transition-all"
  >
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

/* Trailing zeros are noise on a bonus figure, so 220 prints as "220" and 2.5 as "2.5", but a
   long fraction is capped rather than printed in full. */
const formatReward = (value) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });
