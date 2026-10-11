import React from 'react';
import supportImg from '../../assets/responsible/support.png';

/* Gambling Limits — the third rail row, and the first thing on this page that is a COMPONENT
 * rather than a document.
 *
 * THE MARKUP IS THE RENDERED DOM'S, and it corrected several guesses. The pane is NOT a
 * `help-center-box`/`help-doc` like the FAQ's tab — it is a plain `p-4 text-secondary` box whose
 * paragraphs carry explicit margins (`mt-0`, then `mt-4`, then `mt-3` each) and whose title is a
 * `<p class="font-extrabold text-primary">`, not an `<h2>`. None of the shared document styling
 * applies here, so the spacing is stated per element.
 *
 * Both cards live in ONE wrapper — `flex flex-col items-start gap-4 xl:flex-row` — inside the
 * page container, rather than the Need Help card being a third item on the page's own row.
 * `items-start` is what keeps it from stretching to the pane's height and `xl:flex-none` what
 * stops it shrinking once the two sit side by side. `support.png` is the deploy's own
 * `support-D6lyQIWU.png`.
 *
 * THE DIALOG IS NOT IN THAT CHUNK. The button does `navigate("/exclusion/setlimit")` — a
 * separate route whose component lives elsewhere in the `static` remote — so unlike everything
 * above it, the dialog below is built from the capture rather than recovered. The field labels,
 * both option lists and the info line are read off the screenshot. Treat them as the inferred
 * part of this page and correct them against `/exclusion/setlimit` if that chunk turns up.
 *
 * It also does nothing on submit: no limits endpoint is wired, and inventing one would be worse
 * than a dialog that only closes. Add Limit is disabled until an amount is entered, which is at
 * least honest about that.
 */

const NEED_HELP = {
  title: 'Need Help?',
  lines: ['Have questions or concerns regarding your account?', 'Our experts are here to help!'],
  cta: 'Chat with us',
};

const COPY = {
  title: 'Gambling Limits',
  paragraphs: [
    'Take control of your play by setting loss or wagering limits. You can cap the maximum amount you lose or wager over a daily, weekly, monthly, or quarterly period.',
    /* The trailing space is the original's. */
    'Removing a limit — takes effect at 00:00 (UTC+0) following a cooling-off period of at least 24 hours. ',
    'Active limits reset automatically at 00:00 (UTC+0) at the end of each period.',
  ],
  cta: 'Set Gambling Limit',
};

/* From the capture: the dialog opens on Wager Limit over 24 Hours. The period list is the four
   the pane's own copy names — daily, weekly, monthly, quarterly. */
const LIMIT_TYPES = ['Wager Limit', 'Loss Limit'];
const LIMIT_PERIODS = ['24 Hours', '7 Days', '30 Days', '90 Days'];

function Field({ label, children }) {
  return (
    <div>
      <div className="mb-2 font-semibold text-primary">
        {label} <span className="text-brand">*</span>
      </div>
      {children}
    </div>
  );
}

function SetLimitDialog({ onClose }) {
  const [type, setType] = React.useState(LIMIT_TYPES[0]);
  const [period, setPeriod] = React.useState(LIMIT_PERIODS[0]);
  const [amount, setAmount] = React.useState('');

  return (
    /* `.pop-overlayer`'s own scrim, the value DepositOffer sampled: rgba(16,18,18,.8). */
    <div
      /* `z-[1100]`, matching `.pop-overlayer`. `z-50` put this UNDER the header, which is
         `z-[99]` — the scrim dimmed the page but the header stayed lit above it. */
      className="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto p-4"
      style={{ backgroundColor: 'rgba(16, 18, 18, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="mt-10 w-full max-w-[600px] overflow-hidden rounded-xl bg-layer3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex h-14 items-center justify-center bg-layer4 px-4">
          <span className="font-extrabold text-primary">Set Gambling Limit</span>
          <button
            type="button"
            className="absolute right-4 flex size-6 items-center justify-center rounded-md bg-layer5"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 32 32" className="icon size-4 fill-secondary">
              <path d="M17.4142 16L23.0711 21.6569L21.6569 23.0711L16 17.4142L10.3431 23.0711L8.92893 21.6569L14.5858 16L8.92893 10.3431L10.3431 8.92893L16 14.5858L21.6569 8.92893L23.0711 10.3431L17.4142 16Z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <Field label="Limit Type">
            <select
              className="input w-full bg-layer4 pr-3 font-extrabold text-primary"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {LIMIT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>

          <Field label="Limit Amount">
            <div className="input flex items-center bg-layer4 pr-3">
              <input
                className="h-full min-w-0 flex-1 bg-transparent font-extrabold text-primary outline-none"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="ml-2 flex flex-none items-center gap-1 font-extrabold text-primary">
                <span className="center size-5 rounded-full bg-brand text-xs text-primary_brand">
                  $
                </span>
                USD
              </span>
            </div>
          </Field>

          <Field label="Limit Period">
            <select
              className="input w-full bg-layer4 pr-3 font-extrabold text-primary"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {LIMIT_PERIODS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>

          <div className="flex items-start gap-3 rounded-lg bg-layer4 p-3 text-secondary">
            <svg viewBox="0 0 32 32" className="icon size-5 flex-none fill-secondary">
              <path d="M16 4C22.6274 4 28 9.3726 28 16C28 22.6274 22.6274 28 16 28C9.3726 28 4 22.6274 4 16C4 9.3726 9.3726 4 16 4ZM16 6C10.4772 6 6 10.4772 6 16C6 21.5228 10.4772 26 16 26C21.5228 26 26 21.5228 26 16C26 10.4772 21.5228 6 16 6ZM17 14V23H15V14H17ZM16 9C16.8284 9 17.5 9.67157 17.5 10.5C17.5 11.3284 16.8284 12 16 12C15.1716 12 14.5 11.3284 14.5 10.5C14.5 9.67157 15.1716 9 16 9Z" />
            </svg>
            <p>Removing it requires a cooling-off period of at least 24 hours.</p>
          </div>

          <button
            type="button"
            className="button button-brand button-l w-full"
            disabled={!amount}
          >
            Add Limit
          </button>
          <button
            type="button"
            className="button button-l w-full bg-layer5 font-extrabold text-primary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GamblingLimits() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className="flex flex-col items-start gap-4 xl:flex-row">
        <div className="rounded-xl bg-layer4">
          {/* `font-semibold` is OURS. The class list here is just `p-4 text-secondary`, which
              computes to 400, but the live page is a step heavier — the same discrepancy the
              FAQ's document has, and from the same place: the weight comes out of the
              `.help-center-box` stylesheet that could not be recovered from the `static` remote.
              Matched to the capture rather than to the class list. */}
          <div className="p-4 font-semibold text-secondary">
            {/* A `<p>`, not a heading, and the gap beneath it belongs to the FIRST PARAGRAPH's
                `mt-4` rather than to the title — which is why adding a bottom margin here would
                double it. */}
            <p className="mt-0 font-extrabold text-primary">{COPY.title}</p>
            {COPY.paragraphs.map((line, i) => (
              <p key={line} className={`mb-0 ${i === 0 ? 'mt-4' : 'mt-3'}`}>
                {line}
              </p>
            ))}
            <button
              type="button"
              className="button button-brand button-m mt-3 w-full"
              onClick={() => setOpen(true)}
            >
              {COPY.cta}
            </button>
          </div>
        </div>

        <NeedHelp />
      </div>
      {open && <SetLimitDialog onClose={() => setOpen(false)} />}
    </>
  );
}

/* Shared with Self-exclusion, which shows the same card beside its own pane.
   `mt-6 size-20` on the robot, and the card has NO top padding — the space above the image is
   the image's own margin. That is why `pt-4` was wrong twice over here: padding the card does
   not have, wrapped round an image sized 128 instead of 80. */
export function NeedHelp() {
  return (
    <div className="center flex w-full flex-col rounded-lg bg-layer4 px-4 pb-6 font-semibold xl:w-[230px] xl:flex-none">
      <img className="mt-6 size-20" src={supportImg} alt="users" />
      <div className="mt-4 text-base text-primary">{NEED_HELP.title}</div>
      {NEED_HELP.lines.map((line, i) => (
        <div key={line} className={`text-center text-secondary ${i === 0 ? 'mt-4' : ''}`}>
          {line}
        </div>
      ))}
      <button type="button" className="button button-brand button-m mt-4 w-full">
        {NEED_HELP.cta}
      </button>
    </div>
  );
}
