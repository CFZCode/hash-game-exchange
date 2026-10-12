import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { convertCurrency } from '../utils/currency';

/* `/wallet/vault` — Vault Pro. Paths out of `useVaultTransfer-DALUu4Bx.js`, the page's own
 * request module, which is barely minified:
 *
 *   list      GET  /vault/amount/list/          the per-currency vault rows
 *   balance   GET  /balance-controller/balance/unlocked/{currencyName}/   (shared with withdraw)
 *   recharge  POST /vault/amount/recharge/      transfer in
 *   withdraw  POST /vault/amount/withdraw/      transfer out
 *
 * ── THIS IS THE FIRST WALLET PANE WHOSE DATA IS GENUINELY UNRECOVERABLE ───────────────────────
 *
 * The last three pages each had a public config to build on — `currencyTokens` for withdraw,
 * `buy-crypto/fiats|coins` for Buy Crypto, `swap/config/` for Swap. This one has none. Checked
 * rather than assumed: `/vault/amount/list/` answers 6002 (login-gated) on hash.game, and there
 * is no `game/support` sibling — `/game/support/vault/config/` and `/vault/config/` both 404. A
 * vault row is per-account by nature; the APR is the only part that is not, and the server does
 * not publish it separately.
 *
 * SO THE ONE INVENTED NUMBER ON THIS PAGE IS `returnRatio`, AND IT IS READ OFF THE CAPTURE. The
 * screenshot shows "APR 5%" against USD, and `aprPercentage` is `returnRatio * 100`, so 0.05 is
 * evidence for exactly one currency. Applying it to all of them is the assumption. The live feed
 * almost certainly varies the rate by coin — a stablecoin and a thin-book altcoin will not pay
 * the same — but a table of invented per-coin APRs would be worse than one documented constant.
 * One line to delete.
 */
export const VAULT_APR = 0.05;

/* The row shape is read off the chunk's own field accesses rather than from a payload:
 *
 *   currencyName        the key everything joins on
 *   amount              vault balance; the summary card sums it, the asset table filters `> 0`
 *   yesterdayReturn     "Last Day Return"
 *   accumulatedReturn   "Total Return"
 *   returnRatio         the APR, as a fraction
 *   bonusAmount         printed as "(… In Bonus)" beside a coin in the transfer dropdown
 *
 * `amountList` IS NOT THE LIST OF COINS YOU HOLD IN THE VAULT — it is a row per supported
 * currency, and the "No Asset yet" state comes from filtering it to `amount > 0` rather than from
 * it being empty. That distinction is load-bearing: with a truly empty array the transfer panel
 * could not find a `returnRatio` and would print "APR 0%", where the capture prints 5% over an
 * empty vault. So the fixture below is a zero row for every coin the wallet displays, which is
 * exactly the state the capture was taken in.
 */
/* ── LIVE: ONE PRODUCT'S ROWS RENDERED IN ANOTHER PRODUCT'S PANE ───────────────────────────────
 *
 * The platform's Vault Pro is a FIXED-TERM deposit — pick a `lockPeriod`, the principal is
 * unavailable until `endTime`, and you take it back out by `depositId`. bc.game's is instant in
 * and out at a published APR. Same noun, different product, and the UI is bc.game's, so only the
 * READ side maps. Where it maps it maps exactly; where it does not, nothing is invented.
 *
 *   amount           `GET /user/vault` -> `totals[coin]`, an object keyed by the wallet's own
 *                    bare currency code. That is the sum of every OPEN deposit in that coin,
 *                    which is precisely what this pane's `amount` means — the summary card sums
 *                    it and the asset table filters `> 0`. Joined on `aliasCurrencyName`,
 *                    because their key is `INR` where this build's row is `INRFIAT`.
 *
 *   returnRatio      `GET /user/vault/lock-options` -> the SHORTEST term's rate, divided by 100.
 *                    Two decisions in one line and both are worth stating. The /100 is not a
 *                    guess: their validator says "Annual percentage: 7.5 means 7.5%" while
 *                    bc.game's `returnRatio` is `0.05` for 5%. And the shortest term is chosen
 *                    over the highest rate because this pane's APR answers "what does money put
 *                    in now earn", and on a term product the nearest thing to now is the shortest
 *                    lock — the highest rate is an upsell you cannot have without committing
 *                    longest. `listLockOptions` already orders `days ASC`, so `[0]` is the
 *                    server's own ordering rather than a sort of ours.
 *
 *                    IT IS 0 ON THIS DELIVERY, and that is the correct rendering rather than a
 *                    gap: nothing seeds `vault_lock_rates`, so there are no terms on offer and
 *                    "APR 0%" is what is genuinely available. The capture's 5% was one account's
 *                    reading of a different operator's table.
 *
 *   yesterdayReturn  `GET /user/vault/interest`, summed per coin (all rows / last 24 hours).
 *   accumulated…     The old backend had no accrual job and this read answered `[]` for good;
 *                    SmartBet writes one row per deposit per day, so it is read now. See
 *                    `vaultReturns`.
 *
 *   bonusAmount      no bonus/general split on their wallet at all; `toWalletRows` records it.
 *
 * Not wired, and the reason is the product rather than the plumbing. `transferIn` needs a
 * `lockPeriod` this pane has no control for and there are no terms to name; `transferOut` needs a
 * `depositId` where this pane sends an amount, and refuses outright while the term is running.
 * Both buttons already stop at the original's own disabled gate, which is a better place to stop
 * than at a write that can only fail.
 */
/** `GET /user/vault/interest` rows `{coin, interest, createdAt}` -> `{[coin]: {total, lastDay}}`. */
export function vaultReturns(rows, now = Date.now()) {
  const out = {};
  for (const r of Array.isArray(rows) ? rows : []) {
    const coin = String(r?.coin ?? '');
    const value = Number(r?.interest) || 0;
    if (!coin) continue;
    const acc = (out[coin] ??= { total: 0, lastDay: 0 });
    acc.total += value;
    if (now - Date.parse(r.createdAt) <= 864e5) acc.lastDay += value;
  }
  for (const k of Object.keys(out))
    out[k] = { total: out[k].total.toFixed(8), lastDay: out[k].lastDay.toFixed(8) };
  return out;
}

export function getVaultAmountList(balances = []) {
  const shown = balances.filter((coin) => coin.display);
  const row = (coin, amount, returnRatio, returns = {}) => ({
    currencyName: coin.currencyName,
    amount,
    yesterdayReturn: returns.lastDay ?? '0',
    accumulatedReturn: returns.total ?? '0',
    returnRatio,
    bonusAmount: '0',
  });

  if (USE_FIXTURES) {
    return request(ENDPOINTS.vault.list, {
      fixture: shown.map((coin) => row(coin, '0', String(VAULT_APR))),
    });
  }

  return Promise.all([
    request(PLATFORM.user.vault.data, { live: true }),
    request(PLATFORM.user.vault.lockOptions, { live: true }),
    /* SmartBet DOES accrue now (a daily job writes `VaultInterestHistory`, one row per deposit per
       calendar day), so the two return columns are real: Total Return is every accrual row in the
       coin, Last Day Return the ones written in the last 24 hours. 200 is the validator's max. */
    Promise.resolve(
      request(PLATFORM.user.vault.interest, { live: true, params: { limit: 200 }, fixture: [] }),
    ).catch(() => []),
  ]).then(([vault, options, interest]) => {
    const totals = vault?.totals ?? {};
    const shortest = (Array.isArray(options) ? options : [])[0];
    const returnRatio = String((Number(shortest?.rate) || 0) / 100);
    const returns = vaultReturns(interest);
    return shown.map((coin) =>
      row(coin, String(totals[coin.aliasCurrencyName] ?? '0'), returnRatio, returns[coin.aliasCurrencyName])
    );
  });
}

/* `wt` — the same `/balance-controller/balance/unlocked/` call the withdraw page makes, and the
   same derivation: `generalAmount` is the withdrawable part, so a bonus balance is locked out of
   a vault transfer as it is out of a withdrawal. Not imported from services/withdraw.js because
   that module's version is documented against the withdraw form's arithmetic and this one answers
   the four-field shape `Mt` destructures (`lockedBonusBalance`/`lockedGeneralBalance` are read by
   nothing here but are the response's own). */
export function getVaultUnlockedBalance(currencyName, balances = []) {
  const row = balances.find((coin) => coin.currencyName === currencyName);
  const amount = Number(row?.amount ?? 0);
  const general = Number(row?.generalAmount ?? 0);
  return request(ENDPOINTS.withdraw.unlockedBalance(currencyName), {
    fixture: {
      lockedBalance: String(amount - general),
      unlockedBalance: String(general),
      lockedBonusBalance: String(row?.bonusAmount ?? 0),
      lockedGeneralBalance: '0',
    },
  });
}

/* `Mt`'s minimum, and it is a DOLLAR floor expressed in the coin — `$t("USD", currency, 1)` is
 * one dollar's worth, and the minimum is that only when the balance can actually cover it:
 *
 *   const oneDollar = convertCurrency(1, "USD", currency)
 *   const min = balance.gte(oneDollar) ? oneDollar : 0
 *
 * The zero arm is not a rounding convenience — it is what lets the Transfer button's own
 * `amount === 0` test be the whole of the gate on an empty wallet, instead of the form telling
 * you the minimum is a number you could never reach. */
export function vaultMinimum(currencyName, balance) {
  const oneDollar = convertCurrency(1, 'USD', currencyName);
  return Number(balance) >= oneDollar ? oneDollar : 0;
}

/* `st` — `amount * returnRatio / 365`, the "Daily real-time return" figure. Simple interest on
   what is in the box right now, not on the vault balance; type a number and it moves. */
export const dailyReturn = (amount, returnRatio) =>
  (Number(amount) || 0) * (Number(returnRatio) || 0) / 365;

/* ── THE TWO WRITES, AND THE TWO PRODUCTS THEY BELONG TO ───────────────────────────────────────
 *
 * These used to be bc.game-shaped and uncalled: `{currencyName, amount}` against
 * `/vault/amount/recharge/` and `/withdraw/`. That is bc.game's vault — INSTANT in and out at a
 * published APR, so an amount is the whole of what either call needs.
 *
 * The platform's is a FIXED-TERM DEPOSIT and neither body matches:
 *
 *   transfer-in   `{coin, amount, lockPeriod}` — you pick a TERM off `lockOptions`, and the
 *                 principal is unavailable until its `endTime`.
 *   transfer-out  `{depositId, coin}` — you close a NAMED DEPOSIT, not an amount. There is no
 *                 partial withdrawal; a deposit comes out whole.
 *
 * So the fixture arm keeps bc.game's shape for the captured page and the live arm sends the
 * platform's. `pages/Wallet/VaultPro` carries what that costs the panel: an amount field alone
 * cannot express either call, so the live arm needs a term to transfer in and a deposit to
 * transfer out.
 *
 * `lockOptions` ANSWERS `[]` ON THIS DELIVERY — nothing seeds `vault_lock_rates` — so transfer-in
 * can only answer `VAULT_LOCK_PERIOD_NOT_FOUND` until an operator seeds terms (Part 4). That is a
 * seeding gap rather than a code one, and the panel renders its term picker only when there are
 * terms to pick, so nothing empty is drawn in the meantime.
 */
export function vaultTransferIn(currencyName, amount, lockPeriod) {
  if (!USE_FIXTURES) {
    return request(PLATFORM.user.vault.transferIn, {
      live: true,
      method: 'POST',
      json: { coin: bareCode(currencyName), amount: String(amount), lockPeriod },
      fixture: null,
    });
  }
  return request(ENDPOINTS.vault.recharge, {
    method: 'POST',
    body: JSON.stringify({ currencyName, amount: String(amount) }),
    fixture: null,
  });
}

export function vaultTransferOut(currencyName, amount, depositId) {
  if (!USE_FIXTURES) {
    return request(PLATFORM.user.vault.transferOut, {
      live: true,
      method: 'POST',
      json: { coin: bareCode(currencyName), depositId },
      fixture: null,
    });
  }
  return request(ENDPOINTS.vault.withdraw, {
    method: 'POST',
    body: JSON.stringify({ currencyName, amount: String(amount) }),
    fixture: null,
  });
}

/**
 * The terms on offer — `{value, label, days, rate}` each, ordered by `days`, and `rate` is a
 * PERCENTAGE (7.5 means 7.5%) where bc.game's `returnRatio` is a fraction. `value` is what
 * `transfer-in` wants as its `lockPeriod`.
 *
 * ANSWERS `[]` ON THIS DELIVERY because nothing seeds `vault_lock_rates`, which is why the panel
 * draws its term picker only when this has rows: an empty select is worse than no select, and the
 * button below it would refuse with `VAULT_LOCK_PERIOD_NOT_FOUND` whatever was chosen.
 */
export const getVaultLockOptions = () =>
  Promise.resolve(request(PLATFORM.user.vault.lockOptions, { live: true, fixture: [] }))
    .then((rows) => (Array.isArray(rows) ? rows : []))
    .catch(() => []);

/** The account's open deposits, which is what `transfer-out` names one of. */
export const getVaultDeposits = () =>
  Promise.resolve(request(PLATFORM.user.vault.data, { live: true, fixture: null }))
    .then((vault) => (Array.isArray(vault?.deposits) ? vault.deposits : []))
    .catch(() => []);

/* `INRFIAT` -> `INR`. The platform takes bare codes; this build's wallet keys fiats with the
   suffix, and `services/auth.js` owns that translation in the other direction. */
function bareCode(currencyName) {
  return String(currencyName ?? '').replace(/FIAT$/, '');
}
