import { request } from './client';
import { PLATFORM } from './endpoints';

/* The owner's cashier limits for one currency — what the deposit and withdraw forms check before
 * the player sends anything; the server refuses the same amounts (CASHIER_BELOW_MINIMUM /
 * CASHIER_ABOVE_MAXIMUM). No limits (or the read failing) is no client limit. Bare code, `INR`. */
const NONE = { depositMin: null, depositMax: null, withdrawMin: null, withdrawMax: null };

export const getCashierLimits = (currency) =>
  Promise.resolve(
    request(PLATFORM.user.cashierLimits, { live: true, params: { currency }, fixture: NONE }),
  )
    .then((limits) => limits ?? NONE)
    .catch(() => NONE);

/** The server's own refusal for an amount outside [min, max], or null when it is inside. */
export function cashierRangeError(amount, { min, max, currency }) {
  const value = Number(amount);
  if (min != null && value < Number(min)) return `The minimum is ${min} ${currency}`;
  if (max != null && value > Number(max)) return `The maximum is ${max} ${currency}`;
  return null;
}
