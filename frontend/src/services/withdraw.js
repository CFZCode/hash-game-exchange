import { request, USE_FIXTURES, ApiError } from './client';
import ENDPOINTS from './endpoints';
import { CURRENCY_TOKENS, tokensFor, defaultToken, lowestWithdrawLimit } from '../data/currencyTokens';

/* `/wallet/withdraw` — the crypto withdraw form.
 *
 * FOUR THINGS THE FORM NEEDS, AND ONLY ONE OF THEM IS AUTHENTICATED-ONLY. That split is the whole
 * story of this file, and it came out better than expected:
 *
 *   the token list   REAL. `data/currencyTokens.js`, a live answer from a `system/conf` path.
 *   the fee          REAL, by substitution — `minFee` off the same rows; argued below.
 *   the balance      the wallet fixture, read the way the original reads it.
 *   the address      not applicable; the form takes one rather than showing one.
 *
 * So unlike `/deposit`, whose fixture had to be mostly invented, nothing here is a plausible
 * number written to make a layout run.
 *
 * THE PATHS. `api-CKXOLBLH.js` off `hash.game/assets/` — real method names against real paths,
 * `Withdraw.getFee` / `.withdraw` / `.getFeeDeduct` and friends. Every one of them is
 * authenticated. They are in endpoints.js and none is called; the two `request()` seams below are
 * where they go in.
 *
 * ── AGAINST THE PLATFORM: THIS PANE IS ALREADY AS LIVE AS IT CAN GET ──────────────────────────
 *
 * Surveyed rather than assumed, and the four rows above are what made it quick — three of them
 * need nothing from a server this build talks to:
 *
 *   the balance      ALREADY LIVE. It is read off the wallet, and the wallet has been the
 *                    platform's since the account step.
 *   the token list   THEIR EQUIVALENT IS `GET /api/v1/user/crypto/chains`, AND IT IS NOT A DATA
 *                    ROUTE. It is a signed passthrough to CCPayment, a third-party crypto
 *                    processor — and this delivery ships `CCPAYMENT_APP_ID` and
 *                    `CCPAYMENT_APP_SECRET` empty, so it 500s before it reaches the wire. Probed,
 *                    not read off the config. `/user/crypto/coins` is the same call and fails the
 *                    same way. There is no chain, minimum or fee table held locally to fall back
 *                    on, so `data/currencyTokens.js` stays — and it is a real captured response
 *                    rather than a stand-in, which is the happier half of this.
 *   the fee          derived from those rows, so it moves with them.
 *
 * And the submit stays where it is. There is no player-facing HTTP route that files a crypto
 * withdrawal at all — `/user/withdrawals/crypto` is the HISTORY (GET), and the only writes are
 * the staff `:withdrawalId/decision` pair. The player's submit is a SOCKET event,
 * `SUBMIT_NEW_WITHDRAWL`, as is the deposit address. Standing up a second transport for one
 * button that is not built is not the trade; `/user/withdrawals/fiat` is a real POST, but the
 * fiat arm of this form is not built either.
 */

/* ── THE TOKEN LIST ────────────────────────────────────────────────────────────────────────────
 *
 * `Dr` in Banner-TuTj1pp2.js:
 *
 *   getCurrency(name).currencyType === "FIAT"
 *     ? []
 *     : get(`/game/support/system/conf/currencyTokens?currencyName=${name}`)
 *
 * A `system/conf` path, which is the family that answers unauthenticated on hash.game — so this
 * is a captured response for all 89 crypto currencies rather than a reconstruction. The `[]` for
 * a fiat currency is the original's own short-circuit, not a missing fetch, and it is what sends
 * a fiat wallet to the fiat withdraw arm.
 *
 * `expires: 6e5` on the original's cache; irrelevant against a module constant.
 */
export function getWithdrawTokens(currencyName) {
  return request(ENDPOINTS.withdraw.currencyTokens(currencyName), {
    fixture: tokensFor(currencyName),
  });
}

export { defaultToken, lowestWithdrawLimit };

/* ── THE FEE, AND WHY `minFee` IS THE RIGHT STAND-IN ───────────────────────────────────────────
 *
 * `Withdraw.getFee`:
 *
 *   const u = await post(`/payment/withdraw/fee/range/${token.currencyGroupName}/`,
 *                        { chain: token.chain, currencyName: token.currencyGroupName });
 *   return { fee: Number(u.normalFee), isSvip: u.vipFee === "0" };
 *
 * That path is authenticated and cannot be answered here. What settles it is arithmetic against
 * the capture rather than a guess:
 *
 *   the form prints   Min: 204 BCD
 *   `vn` computes     minWithdrawLimitAmount + fee
 *   the feed says     BCD/ETHEREUM withdrawLimitAmount 200, minFee 4
 *                     200 + 4 = 204  ✓
 *
 * Two numbers from a public config, fetched with no knowledge of the screenshot, landing on the
 * screenshot's own figure. So `normalFee` is `minFee` at rest. It is a RANGE endpoint and the
 * live figure presumably floats up toward `maxFee` when a chain is congested, which is exactly
 * the kind of thing a fixture cannot track — but the floor is the right stand-in and it is the
 * value the capture was taken at.
 *
 * `isSvip` is `vipFee === "0"`, i.e. this account withdraws free. It is false here: the capture's
 * Min includes the fee, so the account was being charged. VIP 8+ also gets one free withdrawal a
 * day through `getFeeDeduct` (`/payment/withdraw/fee/deduction/`), which is the "Fee-free
 * withdrawal" checkbox — also authenticated, also not built. See the note at its call site.
 */
export function getWithdrawFee(token) {
  return request(ENDPOINTS.withdraw.feeRange(token?.currencyGroupName ?? token?.chain), {
    fixture: { fee: Number(token?.minFee ?? 0), isSvip: false },
  });
}

/* ── THE AVAILABLE BALANCE ─────────────────────────────────────────────────────────────────────
 *
 * `ct` — `get('/balance-controller/balance/unlocked/<currency>/')`, answering
 * `{ currencyName, lockedBalance, unlockedBalance }`. UNLOCKED is the withdrawable part: a bonus
 * balance is locked until its rollover clears, which is why the page prints this rather than the
 * wallet row's `amount`.
 *
 * The fixture derives it from the wallet, which is the honest reading of the same data: this
 * account's BCD row is `amount` 128.4032 / `generalAmount` 128.4032 / `bonusAmount` 0, so nothing
 * is bonus-locked and the whole balance is withdrawable. `generalAmount` is used rather than
 * `amount` for exactly that reason — the day a fixture row carries a bonus, this stays correct.
 *
 * NOTE THE CAPTURE DISAGREES WITH THE FIXTURE HERE, AND THAT IS FINE. The withdraw screenshot
 * shows "Available: 0" over a "$0.00" header pill; this build's wallet has $128.40 in BCD. Two
 * captures of the same account at different times, the same situation context/account.js
 * documents for INR vs BOB/TJS. The rendering is identical either way, because the amount is
 * below the 204 minimum in both: `it` flags `balance < min` and paints the Min figure `text-error`,
 * which is what the capture shows.
 */
export function getUnlockedBalance(currencyName, balances = []) {
  const row = balances.find((coin) => coin.currencyName === currencyName);
  return request(ENDPOINTS.withdraw.unlockedBalance(currencyName), {
    fixture: {
      currencyName,
      lockedBalance: String(Number(row?.amount ?? 0) - Number(row?.generalAmount ?? 0)),
      unlockedBalance: String(row?.generalAmount ?? '0'),
    },
  });
}

/* Which currencies the Currency select lists. `xa` takes `orderBy(wallet, "sort")` and filters
   with `Me` (`d` in utils-CG1cE_om.js) when ANY row passes it — the site's own "hide the ones you
   cannot use" pass. A currency with no withdrawable token is still listed and renders the
   not-supported state inside the form, which is the original's arrangement rather than a filter. */
export const isWithdrawable = (currencyName) =>
  tokensFor(currencyName).some((token) => token.canWithdraw);

/* `Fn`'s two gates, in the order it applies them: every token unavailable is a whole-currency
   "not supported" state; the SELECTED token unavailable is "Under Maintenance". */
export const allTokensUnavailable = (currencyName) => {
  const rows = tokensFor(currencyName);
  return rows.length > 0 && rows.every((token) => !token.canWithdraw);
};

export { CURRENCY_TOKENS };

/* ══ THE SUBMIT ═══════════════════════════════════════════════════════════════════════════════
 *
 * `oe.withdraw(u)` in WithdrawConfirm-CIsgiYKs.js — `POST /payment/withdraw/create/` on bc.game,
 * with `{currencyName, withdrawAddress, withdrawAddressMemo, amount, fee, useFeeDeduct,
 * verifyFlowId, chain}`. It answers `{orderId}`, and the dialog then pushes the order's result
 * card.
 *
 * THE PLATFORM HAS NO HTTP ROUTE FOR THIS, checked 2026-10-12 against
 * `services/user/src/modules/crypto-withdraw` and docs/API-ROUTES.md: the user router carries
 * only `GET /` and `GET /summary`; the player's submit is the `SUBMIT_NEW_WITHDRAWL` socket
 * event, and this build has no socket client. So:
 *
 *   fixtures on   the submit settles to a processing order, so the confirm dialog and its
 *                 result card are reachable and can be compared;
 *   fixtures off  `CRYPTO_WITHDRAW_AVAILABLE` is false and the pane never shows the form at
 *                 all (the "not available" notice — see WithdrawPanels). The submit still
 *                 refuses rather than pretend, in case anything ever calls it.
 *
 * The original's `new-verify` step (WITHDRAW_ONE_STEP / TWO_STEPS, 2FA or e-mail) is NOT
 * reproduced: nothing on the platform's HTTP side asks for a verify flow id. */
export const CRYPTO_WITHDRAW_AVAILABLE = USE_FIXTURES;

let fixtureOrder = 1000;

export function submitCryptoWithdraw({ currencyName, address, memo, amount, fee, chain }) {
  if (!CRYPTO_WITHDRAW_AVAILABLE) {
    return Promise.reject(
      new ApiError('Crypto withdrawals are not currently available.', {
        code: 'CRYPTO_WITHDRAW_UNAVAILABLE',
      }),
    );
  }
  fixtureOrder += 1;
  return Promise.resolve(
    request(ENDPOINTS.withdraw.create, {
      fixture: {
        orderId: String(fixtureOrder),
        commonData: {
          status: 0,
          amount: String(amount),
          currencyName,
          withdrawAddress: address,
          withdrawAddressMemo: memo || '',
          chain,
          fee: String(fee),
          txId: null,
        },
      },
    }),
  );
}

/* THE ERROR SLOT PRINTS THE PLATFORM'S OWN SENTENCE. API-ROUTES.md §5 says the message is for a
   human, so it is shown as sent; the code only decides what else the dialog offers. Both rails'
   codes are listed so the day a rail is wired its refusals already read correctly:
   KYC_REQUIRED, BELOW_MINIMUM, INSUFFICIENT_BALANCE, WITHDRAW_COOLDOWN (per rail),
   WITHDRAW_BLOCKED, SITE_POLICY_CHANNEL_CLOSED and BONUS_FORFEIT_REQUIRED. The original has
   no forfeit-confirm step (no such string in the i18n bundle), so none is drawn. */

export const withdrawErrorMessage = (error) =>
  error?.message || 'Something went wrong. Please try again later.';
