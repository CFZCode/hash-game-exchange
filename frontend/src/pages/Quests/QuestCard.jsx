import React from 'react';
import { TargetIcon, FxIcon, CheckIcon, ExpiredIcon } from './icons';
import { formatQuestTime } from './quests';
import { printCurrency } from '../../utils/currency';
import { useSession } from '../../context/session';
import { useSettings } from '../../context/settings';
import Loading from '../../components/shared/Loading';

/* The quest page's primitives, out of `index-TGm-4VyO.js` off `hash.game/assets/`, so every
 * class list below is the deploy's own.
 *
 * `SectionGroup` used to live here — it is `_` in `section-group-l1HCczCi.js`, a shared
 * bonus-family primitive — and moved to `components/shared/SectionGroup` the day the bonus page
 * became its second call site.
 */

/* `U` in fx-B6Xikin5.js — the ƒ(x) chip that opens a quest's "How You Earn" popup.
 *
 * Its `<Show when={!0}>` is dead: the fallback is a bare IconInform and can never render. Kept
 * as a comment rather than as code, since reproducing an unreachable branch is worse than
 * recording it.
 *
 * `bg-white_alpha5` is written and then beaten — every call site on this page passes
 * `!bg-transparent`, which is why the chip reads as an outline. Both are the original's.
 *
 * The glyph is the one icon here that colours from `text-*` rather than `fill-*`: its file
 * declares `fill=currentColor` on the root. `w-6 text-secondary` is the component's own, and the
 * call site's `[&_svg]:text-quarterary` outranks it at 0,2,0 against 0,1,0 — so it renders
 * quarterary, not secondary. */
export function FormulaButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`button button-xs cursor-pointer rounded-lg border border-fourth/5 bg-white_alpha5 !px-1 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <FxIcon className="w-6 text-secondary" />
    </button>
  );
}

/* `xt`, timestamp-countdown-CMR9bnv5.js, in the one configuration this page uses: `units: 2`.
 *
 * That is not "days and hours" — it is the two highest units that are still running. The
 * component finds the FIRST non-zero of d/h/m/s and takes it plus the next one down, so a quest
 * with 40 minutes left prints `40m 12s`, not `00d 00h`. When everything is zero the index search
 * fails and it falls back to the LAST two, which is `m s`. Each part is zero-padded to two and
 * carries its own letter, in an `inline-flex items-center gap-1`.
 *
 * No `expireTime` is present in the fixture, so nothing renders this today. It is built because
 * the field is part of the footer's shape and leaving it out would make the next quest silently
 * lose its clock. */
const UNITS = ['d', 'h', 'm', 's'];

export function Countdown({ timestamp, className = '' }) {
  /* Seeded lazily and ticked from an interval, which is the shape /deposit-offer and
     /promotions/weekly-raffle both use — reading the clock during render is what
     `react-hooks/purity` rejects. */
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, timestamp - now);
  const total = Math.floor(remaining / 1000);
  const value = {
    d: Math.floor(total / 86400),
    h: Math.floor(total / 3600) % 24,
    m: Math.floor(total / 60) % 60,
    s: total % 60,
  };

  const first = UNITS.findIndex((u) => value[u] > 0);
  const start = first === -1 ? UNITS.length - 2 : first;

  return (
    <span className={`${className} inline-flex items-center gap-1`}>
      {UNITS.slice(start, start + 2).map((u) => (
        <span key={u}>{`${String(value[u]).padStart(2, '0')}${u}`}</span>
      ))}
    </span>
  );
}

/* `Ze` in the chunk — the line under a quest's description, three variants keyed off `variant`.
 *
 * The `active` variant is the interesting one and the only one the capture exercises. It draws
 * TWO independent things and either can be absent:
 *
 *   - "One-step task", when `unLockRate` is a KEY ON THE OBJECT and falsy. The original writes
 *     `"unLockRate" in e`, so a quest that omits the field entirely gets no line while one that
 *     passes `null` gets one — which is exactly what the Cwallet quest does. `in` is reproduced
 *     with `hasOwn` rather than a truthiness test, because the two disagree here.
 *   - "Ends in <countdown>", when `expireTime` is present and above zero.
 *
 * `countdownClass` lets a caller tint the clock as a deadline approaches (`Ue`/`qr` in the chunk
 * map the remaining time onto text-error / text-warning / text-brand at 24h and 72h). Nothing
 * passes it here; the default is `text-tertiary`. */
export function QuestFooter(props) {
  const { variant } = props;

  if (variant === 'expired') {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-secondary">
          <ExpiredIcon className="icon size-3" />
          <span className="truncate">Expired {formatQuestTime(props.expiredAt)}</span>
          {props.unLockRate ? <>· {Number(props.unLockRate) * 100}%</> : null}
        </div>
      </div>
    );
  }

  if (variant === 'completed') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
        <CheckIcon className="icon size-3 fill-brand" />
        <span>Completed {formatQuestTime(props.completedTime)}</span>
      </div>
    );
  }

  const hasUnlockRate = Object.hasOwn(props, 'unLockRate');
  const countdownClass = props.countdownClass ?? 'text-tertiary';

  return (
    <div className="flex flex-row items-center justify-between">
      {hasUnlockRate && !props.unLockRate && (
        <div className="flex items-center gap-1 text-xs font-semibold text-quarterary">
          <TargetIcon className="icon size-3" />
          One-step task
        </div>
      )}
      {props.expireTime > 0 && (
        <span className={`text-xs font-semibold ${countdownClass}`}>
          Ends in <Countdown timestamp={props.expireTime} className={`text-xs font-semibold ${countdownClass}`} />
        </span>
      )}
    </div>
  );
}

/* `$e` in the chunk — a quest's right-hand button.
 *
 * `variant` defaults from the LABEL, not from state: anything but "Claim" is `default`, which is
 * the outlined grey button. A "Claim" gets no extra classes at all and so renders as the plain
 * `button-input` fill. "Claimed" disables itself through the same path as `disabled`.
 *
 * `ae.darken ? "bg-blend-darken" : "bg-input_darken"` IS A JS BRANCH, NOT A `dark:` PAIR, which
 * is why it takes the theme flag rather than a variant. The dark arm is a no-op —
 * `background-blend-mode` needs a background-image to blend against and there is none — but the
 * light arm is not: `--input_darken` is #FFFFFF there, so it paints the button white over
 * `.button-input`'s own #E7EBED. Both are written now; before the light palette existed only the
 * dark half could ever be reached. */
export function QuestAction({ action, variant, loading, disabled, onClick, className = '' }) {
  const kind = variant ?? (action === 'Claim' ? 'claim' : 'default');
  const inert = Boolean(disabled || loading || action === 'Claimed');
  const { darken } = useSettings();

  return (
    <button
      type="button"
      disabled={inert}
      className={[
        'button button-input button-s min-w-20 !text-sm font-semibold',
        darken ? 'bg-blend-darken' : 'bg-input_darken',
        kind === 'default' && 'border border-third !bg-transparent text-tertiary',
        kind === 'warn' && 'border border-error/40 !bg-transparent text-error/80',
        inert && '!cursor-default opacity-60',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(e) => {
        e.stopPropagation();
        if (!inert) onClick?.();
      }}
    >
      {loading ? <Loading /> : action}
    </button>
  );
}

/* `_e` — bonus-currency-amount-CgQhatqc.js, the figure in a quest's reward column.
 *
 * SIMPLIFIED, and worth knowing how. The original splits the formatted amount into
 * prefix/amount/suffix and truncates only the middle, so a long number loses its digits rather
 * than its currency ticker, and it watches the node with a ResizeObserver to decide whether to
 * show a tooltip at all. This build formats through `utils/currency.js`'s own `printCurrency`
 * (which is that same function ported whole, `enableLocaleCurrency` target and all) and
 * truncates the whole string. Nothing renders it today — no quest in the fixture carries a
 * reward — so the difference is recorded rather than visible.
 *
 * The account's `setting` has to be threaded in because `printCurrency` reads
 * `enableLocaleCurrency` off it, and this port takes the store as an argument where the original
 * reaches for the global — the same signature change every other call site here makes. */
export function QuestReward({ amount, currency }) {
  const { session } = useSession();

  return (
    <span className="inline-flex min-w-0 items-center overflow-hidden">
      <span className="truncate">
        {printCurrency(amount, currency, { precision: 7, settings: session.setting })}
      </span>
    </span>
  );
}

/* `xe` in the chunk — the quest card itself, and the same component in all three tabs.
 *
 * Two structural details that are easy to lose:
 *
 * - The empty `flex-1` div between the two columns is the original's own spacer. The left column
 *   is `basis-3/5` and `shrink`, the right is `shrink-0`, and this is what pushes them apart
 *   rather than a `justify-between` on the row.
 * - The right column's alignment is decided by whether there is a reward: `justify-between` when
 *   the figure and the button share it, `justify-center` when the button is alone. That is why
 *   the Connect button sits vertically centred on the capture's only card.
 *
 * `description` is wrapped in a `truncate text-xs …` div HERE, and two call sites pass a div
 * with that same class list as the value — so a completed or expired row nests one inside the
 * other. Reproduced, because it renders identically and "fixing" it invents a difference. */
export function QuestCard({
  title,
  description,
  formula,
  onFormula,
  progressBar,
  footer,
  rewardAmount,
  rewardPrefix,
  rewardClass,
  action,
  compact,
  className = '',
}) {
  return (
    <div
      className={`flex h-full bg-card p-3 ${compact ? 'items-center gap-3' : 'flex-col gap-2'} ${className}`}
    >
      <div className={`flex h-full w-full gap-3 ${compact ? 'items-center' : 'items-stretch'}`}>
        <div className="quest-card-left flex min-w-0 shrink basis-3/5 flex-col justify-between gap-1 sm:gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="quest-title truncate text-base font-extrabold text-primary">
              {title}
            </span>
            {formula && (
              <FormulaButton
                onClick={onFormula}
                className="!bg-transparent [&_svg]:text-quarterary"
              />
            )}
          </div>
          {description && (
            <div className="truncate text-xs font-semibold text-quarterary">{description}</div>
          )}
          {progressBar}
          {footer}
        </div>

        <div className="flex-1" />

        <div
          className={`quest-card-right flex shrink-0 flex-col items-end gap-1.5 ${
            rewardAmount ? 'justify-between' : 'justify-center'
          }`}
        >
          {rewardAmount && (
            <div className={`pr-1 text-base font-extrabold ${rewardClass ?? 'text-primary'}`}>
              <div>{rewardPrefix}</div>
              <div>{rewardAmount}</div>
            </div>
          )}
          {action}
        </div>
      </div>
    </div>
  );
}
