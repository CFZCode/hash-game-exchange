/* `Nn` and `Sn` in index-B3pypdyg.js — the withdraw form's notices, and the whole table is
 * RECOVERED rather than read off the capture. Worth knowing, because the notice the screenshot
 * shows is not a general one:
 *
 *   Nn = [
 *     { match: e => ["XLM","XRP"].includes(e.token.currencyGroupName),
 *       bottom_notice: () => t("We do not support inactive addresses") },
 *     { match: e => ["SOLANA"].includes(e.token.chain),
 *       middle_notice: () => t("Please note that SOL addresses are case sensitive.") },
 *     { match: e => ["BCD"].includes(e.token.currencyGroupName),
 *       bottom_notice: () => <Trans i18nKey="wallet.trans.desc47">…Cwallet…</Trans> },
 *   ]
 *
 * and `Sn` falls back to
 *
 *   "For security purposes, large or suspicious withdrawal may take 1-6 hours for audit process.
 *    We appreciate your patience!"
 *
 * SO THE CWALLET LINE IS BCD-SPECIFIC. The capture shows it because this account's wallet is BCD
 * — the account's own `bonusCurrencyName`. Pick any other coin in the Currency select and the
 * notice changes to the security-audit default, or to the inactive-address line on XLM/XRP. A
 * screenshot rebuild would almost certainly have hard-coded the Cwallet sentence as the page's
 * one notice; it is the page's notice for exactly one coin out of 89.
 *
 * The match is FIRST-WINS over the array (`Nn.find`), and a row may set either or both of the two
 * slots. `middle_notice` renders warning-tinted directly under the address field; `bottom_notice`
 * renders info-tinted under the card, through the `#withdraw-crypto-notice` portal.
 *
 * `alert_notice` is a third slot in the shape, used by no row here, that pushes a modal on token
 * change. Not ported — there is nothing to port.
 *
 * `currencyGroupName` is the coin id and equals the key `data/currencyTokens.js` files a row
 * under, so the currency name is what is matched on. The SOLANA row matches on `chain`, which is
 * a different axis: it fires for USDC-on-Solana as well as for SOL itself.
 *
 * This is a .jsx rather than a .js because one of the four values contains a link.
 */

/* `Ft` — the site's anchor component. `mx-1 underline`, and that margin is why the sentence is
   three children rather than one string with spaces around the link.
 *
 * A CONSTANT ELEMENT, NOT A COMPONENT, and deliberately so: a module that exports a plain
 * function (`withdrawNotices`) alongside a component is what `react-refresh/only-export-
 * components` rejects — the same rule that put `useSession` outside `SessionContext.jsx` and
 * `groupWallet` in the Balance pane's `utils.js`. An element value has no such problem. */
const CWALLET_NOTICE = (
  <>
    Withdrawals can only be made to either the
    <a
      className="mx-1 underline"
      href="https://my.cwallet.com/wallet/token/send"
      target="_blank"
      rel="noreferrer"
    >
      Cwallet
    </a>
    or a decentralized wallet to prevent potential asset loss.
  </>
);

const DEFAULT_BOTTOM =
  'For security purposes, large or suspicious withdrawal may take 1-6 hours for audit process. ' +
  'We appreciate your patience!';

const RULES = [
  {
    match: (currencyName) => ['XLM', 'XRP'].includes(currencyName),
    bottom: () => 'We do not support inactive addresses',
  },
  {
    match: (currencyName, token) => token?.chain === 'SOLANA',
    middle: () => 'Please note that SOL addresses are case sensitive.',
  },
  {
    match: (currencyName) => currencyName === 'BCD',
    bottom: () => CWALLET_NOTICE,
  },
];

export function withdrawNotices(currencyName, token) {
  const rule = RULES.find((entry) => entry.match(currencyName, token));
  return {
    middle: rule?.middle?.() ?? null,
    bottom: rule?.bottom?.() ?? DEFAULT_BOTTOM,
  };
}
