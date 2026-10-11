import React from 'react';
import PopCenter from '../../components/shared/PopCenter';
import { IconCheck, IconHelp, IconInform } from '../../components/shared/icons';
import seven from '../../assets/deposit/seven.png';
import sevenBg from '../../assets/deposit/seven_bg.png';
import safe from '../../assets/deposit/safe.png';

/* The 7-Day Deposit Guarantee pill above the fiat tab's Currency row, and the explainer behind
 * it — `SevenDayPayBanner-BD56xym6.js`, off `hash.game/assets/`.
 *
 * IT WAS A RECONSTRUCTION AND IS NOT ANY MORE, which is worth recording because the two look
 * nothing alike: the first pass drew an emoji on an orange gradient from a screenshot, and the
 * real component is a background PNG under a bordered strip with its own artwork. All four
 * images below are the deploy's own files under their hashes stripped (`seven-CUGqRimE.png`,
 * `bg-Cty7vcKX.png`, `safe-BFYnNe6r.png`); the star and coin belong to the module's OTHER
 * export and are not used here — see below.
 *
 * THE MODULE HAS TWO BANNERS AND THE FIAT PAGE TAKES THE SMALL ONE. `S` (`H`) is the full-width
 * card with the coin, two stars and a four-state message; `a` (`Y`) is this 24px pill. The fiat
 * page imports `{a as Z1}` and renders `<Z1 currencyName={fiatCurrency} class="ml-auto mt-3"/>`,
 * so only the pill is built. The card's own artwork is fetched and sitting in assets/deposit
 * anyway, because the day the crypto tab's banner slot is filled it is already local.
 *
 * `H`'s four states (default / eligible-delay / eligible-seven-day / compensated) all hang off
 * a compensation payload that has no endpoint here, so they are not ported either.
 */

/* `Y` — the pill. `background-size: 100% 100%` with no repeat is the original's own inline
 * pair, so the PNG stretches to whatever width the text gives it rather than tiling.
 *
 * The `class` prop lands on the BACKGROUND div, not on the outer flex — which is what makes
 * `ml-auto mt-3` push the pill right inside a `flex` parent that is otherwise full width. */
function Pill({ className = '', onClick }) {
  return (
    <div className="flex text-alw_white">
      <div
        role="button"
        tabIndex={0}
        title="7-Day Deposit Guarantee"
        className={`rounded ${className}`}
        style={{ backgroundImage: `url(${sevenBg})`, backgroundSize: '100% 100%' }}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onClick();
        }}
      >
        <div className="relative flex h-6 cursor-pointer items-center justify-between overflow-hidden rounded border border-[#fff4]">
          <img className="w-6 flex-none" alt="seven" src={seven} />
          <div className="mr-2 flex-auto truncate text-xs">7-Day Deposit Guarantee</div>
          <IconHelp className="icon mr-1 size-4 flex-none" />
        </div>
      </div>
    </div>
  );
}

/* `G` — one guarantee row. The tick sits in a `size-5` brand disc and carries its own `mt-0.5`
   INSIDE a wrapper that already has one, which is the original's own doubled nudge. */
function GuaranteeRow({ title, desc }) {
  return (
    <div className="mt-4 flex">
      <div className="center mr-1.5 mt-0.5 flex size-5 flex-none rounded-3xl bg-brand">
        <IconCheck className="icon mt-0.5 size-4 fill-primary_brand" />
      </div>
      <div className="flex-auto">
        <span className="mr-1 font-extrabold">{title}</span>
        <span className="text-secondary">{desc}</span>
      </div>
    </div>
  );
}

/* `w` — the explainer. Both bodies are verbatim i18n out of the chunk, placeholders resolved.
 *
 * `minutes` IS a branch and is reproduced: Nigeria gets 60, everyone else 30. `currencyName` is
 * interpolated into the second string and the chunk passes it the EMPTY STRING — a live bug
 * that renders "If your  deposit hasn't arrived", double space included. Kept, because the
 * alternative is inventing a value the live page does not print.
 *
 * `dialogTitle` is absent at this call site, so the title bar is empty with just the close
 * square in it. See the note in PopCenter about why the bar still renders. */
function GuaranteeDialog({ open, onClose, currencyName }) {
  const minutes = currencyName === 'NGNFIAT' ? 60 : 30;

  return (
    <PopCenter open={open} onClose={onClose} label="Trust & Compensation" className="w-[580px]">
      <div className="center mb-2 flex text-2xl font-extrabold">
        <img className="mr-2 h-12 w-auto" alt="safety" src={safe} />
        Trust &amp; Compensation
      </div>

      <GuaranteeRow
        title="Dual Guarantee:"
        desc={`Still waiting after ${minutes} minutes? We'll Reward you with delay bonus after your deposit is successfully arrived - no questions asked.`}
      />
      <GuaranteeRow
        title="7-Day Full Guarantee:"
        desc="If your  deposit hasn't arrived within 7 days of submission, the system will automatically issue full compensation."
      />

      {/* `Dn type="info"` again — the same `p-2 rounded-xl` box the crypto tab's min-deposit
          notice uses, with the mark carrying its own margin rather than the row using a gap. */}
      <div className="mt-4 flex rounded-xl bg-success/10 p-2 text-secondary">
        <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-success" />
        <div>
          Compensation is only available to users who have completed KYC verification and passed
          KYC-time system checks.
        </div>
      </div>
    </PopCenter>
  );
}

export default function SevenDayBanner({ currencyName, className }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Pill className={className} onClick={() => setOpen(true)} />
      <GuaranteeDialog open={open} onClose={() => setOpen(false)} currencyName={currencyName} />
    </>
  );
}
