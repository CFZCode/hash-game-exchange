/* The deposit dialog's fixtures.
 *
 * READ THIS BEFORE TRUSTING ANY NUMBER IN IT. Every other fixture in this project is a captured
 * response, a recovered i18n string or a live answer from `hash.game`. This one is mostly
 * INVENTED, and it has to be: everything the deposit dialog displays is per-account and sits
 * behind authentication — the address a coin is deposited to, which chains it supports, its
 * minimum, the fiat channels available in a country and their limits. None of it can be fetched
 * as a logged-out visitor, and none of it was in the mirror.
 *
 * What IS real is marked as such below. The split matters: the recovered parts are worth
 * preserving through a rewrite, the invented parts are worth deleting the moment a real
 * response exists.
 *
 * ONE OF THEM HAS BEEN DELETED ON EXACTLY THOSE TERMS. The chain-and-minimum table is now
 * `data/currencyTokens.js`, a live `system/conf` answer for all 89 crypto currencies; see
 * `networksFor` below. What is still invented is the ADDRESS (deliberately not a plausible one)
 * and the FIAT CHANNELS — and the platform cannot supply either. Its deposit address is a socket
 * event, `GET_ADDRESS`, not an HTTP route; its fiat channels come from
 * `GET /api/v1/user/payments/methods/:provider`, which answers `PAYORDER_PROVIDER_DISABLED` for
 * every one of the five gateways it registers (`waypay`, `apay`, `cricpay`, `upi`, `ccpayment`),
 * because this delivery ships every one of their API keys empty. Probed on `upi` and `apay`.
 * That refusal is well-named and deliberate rather than a crash: the platform is saying no
 * provider is configured, which is a state to respect rather than to invent around.
 */

import { rechargeBonusConfigNow } from '../../services/bonus';
import { getCurrency } from '../../data/currencies';
import { tokensFor } from '../../data/currencyTokens';
import { convertCurrency } from '../../utils/currency';
import { USE_FIXTURES, request } from '../../services/client';

/* ── RECOVERED ─────────────────────────────────────────────────────────────────────────────
 *
 * `eg` in index-C1xohM7W.js, verbatim — the quick-pick row's default currencies, in order:
 *
 *   eg = ["ETH","BTC","USDT","USDC","DOGE","SOL","BNB","XRP","TON","ADA"]
 *
 * `J0` slices it `0..4` on a desktop and `0..6` on a phone for the chips, then `4..7` for the
 * three coins stacked inside the "More" button. So a desktop shows ETH BTC USDT USDC and then
 * DOGE, SOL, BNB overlapped — which is exactly what the capture shows, and is how that row was
 * confirmed rather than read off the pixels.
 *
 * On the live site this is only the INITIAL value: `/payment/deposit/recently/currencies/`
 * replaces it with the coins you have actually deposited before. No response captured, so the
 * default is what renders — which is also what a first-time depositor sees. */
export const DEFAULT_CURRENCIES = ['ETH', 'BTC', 'USDT', 'USDC', 'DOGE', 'SOL', 'BNB', 'XRP', 'TON', 'ADA'];

/* The coin the deposit dialog opens on before anything else: the SITE'S DEFAULT COIN (the owner's
   `default_currency`, USDT unless set — `session.defaultCurrency`, a wallet row name such as `USDT`
   or `INRFIAT`) — unless the player picked a coin themselves (`setting.currencyPicked`, set by the
   header dropdown and every other picker), in which case their pick wins as before. `null` when
   there is nothing to override. */
export const depositDefault = (session) =>
  session?.setting?.currencyPicked ? null : session?.defaultCurrency || null;

/* ── RECOVERED ──
 *
 * The notice under the address, an i18n string with its two placeholders intact:
 *
 *   "Send only __aliasName__ to this deposit address. Transfers below __minDeposit__
 *    __aliasName__ will not be credited."
 *
 * Its sibling in the bundle carries a confirmations clause ("Coins will be deposited after 2
 * network confirmations") and is the one some chains use instead; the capture shows this one. */
export const depositNotice = (alias, minDeposit) =>
  `Send only ${alias} to this deposit address. Transfers below ${minDeposit} ${alias} will not be credited.`;

/* The fallback for a currency the captured token table does not carry, so picking one out of the
   dropdown does not land on an empty Network select. It reaches further than it used to: against
   the platform the wallet is 28 of ITS columns, four of which (`SC`, `NC`, `BJB`, `MVR`) are not
   bc.game currencies at all and so have no token row. The `1` is the one invented figure left on
   this page besides the address.

   It also catches ONE coin that does have rows: RVN, the only one of the 89 whose every chain is
   `canDeposit: false`. The original would answer an empty Network select there and this build
   cannot — `CryptoTab` reads `networksFor(name)[0].chain` when the currency changes — so RVN gets
   a fallback network it should not have. Unreachable in practice: the wallet is what lists the
   coins, and the platform has no RVN column. Fix it in the component, not here, if a wallet ever
   holds one. */
export const defaultNetwork = (currencyName) => [
  { chain: currencyName, label: currencyName, minDeposit: '1' },
];

/* ── THE INVENTED TABLE IS GONE; THIS IS THE CAPTURED ONE ──────────────────────────────────────
 *
 * `NETWORKS` was ten hand-written coins that said of themselves "do not quote these figures
 * anywhere", written before `data/currencyTokens.js` existed. That file is the live
 * `system/conf/currencyTokens` answer for all 89 crypto currencies and has carried
 * `depositLimitAmount` and `canDeposit` since the withdraw pass specifically so this swap would
 * be a data change and not another fetch. It is that swap.
 *
 * AND IT CHECKS OUT ON THE ONE ROW THAT HAD EVIDENCE. VTHO was the only entry in the old table
 * with a capture behind it — the screenshot happened to be sitting on that coin, giving a minimum
 * of 360. The captured row reads `depositLimitAmount: "360"`, to the digit, which settles that
 * this is the field the notice prints. It also corrects the other two: the chain is `VET` and the
 * label is a bare "VTHO", where the invention had guessed `VTHO` / "VeThor (VTHO)".
 *
 * `canDeposit` is the row's own flag and is filtered on rather than assumed — a chain can be
 * withdraw-only, and offering it as a deposit network would print an address that credits
 * nothing.
 *
 * THE PLATFORM CANNOT SUPPLY THIS. Its equivalent is `GET /api/v1/user/crypto/chains`, which is
 * not a data route but a signed passthrough to CCPayment — and this delivery ships
 * `CCPAYMENT_APP_ID` and `CCPAYMENT_APP_SECRET` empty, so it 500s before it reaches the wire
 * (probed, along with `/user/crypto/coins`, which fails identically). There is no locally held
 * chain table behind it to read instead. So the captured response is not a stand-in for a live
 * one here — it is the best evidence that exists, and strictly better than what it replaced.
 */
export const networksFor = (currencyName) => {
  const rows = tokensFor(currencyName)
    .filter((token) => token.canDeposit)
    .map((token) => ({
      chain: token.chain,
      label: token.label,
      minDeposit: token.depositLimitAmount,
    }));
  return rows.length ? rows : defaultNetwork(currencyName);
};

/* ── DELIBERATELY NOT A REAL ADDRESS ───────────────────────────────────────────────────────
 *
 * The live dialog prints a deposit address generated for your account on the selected chain.
 * This build has no such thing, and a mock that shows a VALID-LOOKING address is worse than one
 * that shows nothing: an address is the one piece of UI on this page where a plausible
 * fabrication can cost somebody real money. So the placeholder is deliberately not a
 * well-formed address of any chain, and says what it is.
 *
 * Keyed on currency and chain only so that switching either one visibly changes the string and
 * the QR, which is the behaviour being reproduced. Replace the whole function with the real
 * `useAddress` call the day there is a backend. */
export const placeholderAddress = (currencyName, chain) =>
  `not-a-real-address-${String(currencyName).toLowerCase()}-${String(chain).toLowerCase()}`;

/* ── LIVE MODE NEVER PRINTS AN ADDRESS IT DID NOT RECEIVE ──────────────────────────────────
 *
 * The placeholder above is a fixture-mode device only. With fixtures off, the tab asks the
 * platform's crypto provider for its chain list first — `GET /api/v1/user/crypto/chains`, which
 * answers `503 CRYPTO_NOT_CONFIGURED` while CCPayment has no credentials — and any failure there
 * means there is no address to show. And even when the chain list does answer, the platform has
 * no HTTP route that issues a per-account deposit address (bc.game's is the `GET_ADDRESS` socket
 * event), so there is still nothing real to print. Either way this resolves to `null`, and the
 * tab shows its "not available" notice instead of an address and QR.
 *
 * Fixture mode answers `undefined` synchronously and the tab keeps its placeholder as before. */
export const CRYPTO_CHAINS_PATH = '/api/v1/user/crypto/chains';

export const readCryptoDepositAddress = () =>
  USE_FIXTURES
    ? undefined
    : Promise.resolve(request(CRYPTO_CHAINS_PATH, { live: true })).then(
        () => null,
        () => null,
      );

/* ══ THE FIAT TAB ══════════════════════════════════════════════════════════════════════════
 *
 * `/payment/deposit/fiat/<currency>/methods/` — the real path, out of `api-B_IcOSNp.js`. It is
 * AUTHENTICATED and `hash.game` answers it 6002, which was checked rather than assumed, so
 * unlike almost everything else in this project the channel list could not be recovered and the
 * rows below are written to the shape the chunk consumes.
 *
 * WHAT THE RENDERED DOM SETTLES, and it settles more than a screenshot could. The fiat tab's
 * live markup was pasted in, which gives: the six names in order, all six logo URLs, that the
 * SIXTH row is under maintenance and the other five are not, that the tiles show neither a
 * range nor an ETA (so `avgMinutesSpent` is absent on all six), that no channel offers a
 * how-to guide, and that the submit reads "Deposit Via UPI" with a link mark — which pins
 * `mode` into the payment-window family. It also confirmed the whole amount block: the label
 * "(100 - 50,000 INR)", "Extra +₹1,800.00", and three chips at ₹1,000 / ₹5,000 / ₹50,000 each
 * tagged "+180%" — every one of which this file's recovered arithmetic already produced.
 *
 * WHAT IS STILL WRITTEN RATHER THAN READ: the channel ids, `method`, `wayName`,
 * `supportedMethod` and `sort`. None of them is rendered; they exist because the recovered
 * functions key on them. `ICashOne_INR` is the exception and is the live site's own, quoted in
 * `uD` — it is the channel that gets a fourth note under the form. `isSmartRoute` is inferred
 * from the layout the DOM shows; see MethodList in FiatTab.jsx.
 *
 * THE LOGOS ARE LOCAL. `nightIcon` doubles as the basename under `assets/deposit/channels/` —
 * see utils/channelArt.js for why there are four files for six rows. `lightIcon` is
 * deliberately not fetched: `b` in utils-BRLjIBPE.js picks between the two on the theme and
 * this build is dark-only, so the light arm is unreachable.
 *
 * `mode` is the checkout style and is read from the chunk: `[0,10,6,8]` opens a payment window,
 * `[5,15]` an iframe. Both branches are behind an endpoint that does not exist here, so the
 * submit is inert; the mode still decides whether the button reads "Deposit" or "Deposit Via
 * __name__" with a link mark, which is why it is set. */
export const FIAT_CHANNELS = {
  INRFIAT: [
    {
      channel: 'UPI_INR',
      method: 'upi',
      wayName: 'UPI',
      supportedMethod: 'upi',
      name: 'UPI',
      sort: 1,
      minDepositAmount: 100,
      maxDepositAmount: 50000,
      maintainedStatus: 0,
      isSmartRoute: true,
      mode: 0,
      nightIcon: 'upi',
    },
    {
      channel: 'PhonePe_INR',
      method: 'phonepe',
      wayName: 'PhonePE',
      supportedMethod: 'upi',
      name: 'PhonePE',
      sort: 2,
      minDepositAmount: 100,
      maxDepositAmount: 50000,
      maintainedStatus: 0,
      isSmartRoute: true,
      mode: 0,
      nightIcon: 'phonepe',
    },
    {
      channel: 'Paytm_INR',
      method: 'paytm',
      wayName: 'Paytm',
      supportedMethod: 'upi',
      name: 'Paytm',
      sort: 3,
      minDepositAmount: 100,
      maxDepositAmount: 50000,
      maintainedStatus: 0,
      isSmartRoute: true,
      mode: 0,
      nightIcon: 'paytm',
    },
    {
      channel: 'UPI_UTR_INR',
      method: 'upi_utr',
      wayName: 'UPI_utr',
      supportedMethod: 'upi',
      name: 'UPI_utr',
      sort: 4,
      minDepositAmount: 100,
      maxDepositAmount: 50000,
      maintainedStatus: 0,
      isSmartRoute: true,
      mode: 0,
      nightIcon: 'upi',
    },
    {
      /* The one channel id in this table that is the live site's own — `uD` tests
         `depositMethod.channel === "ICashOne_INR"` to append its support-email note, which is
         reproduced in `depositNotes` below. */
      channel: 'ICashOne_INR',
      method: 'icashone',
      wayName: 'iCash.one',
      supportedMethod: 'wallet',
      name: 'iCash.one',
      sort: 5,
      minDepositAmount: 100,
      maxDepositAmount: 50000,
      maintainedStatus: 0,
      isSmartRoute: true,
      mode: 0,
      nightIcon: 'icashone',
    },
    {
      /* UNDER MAINTENANCE in the rendered DOM — the sixth tile is the only one carrying the
         `bg-black_alpha20` mask and the slashed-eye mark. `disable` is the enum's 1; anything
         other than `normal` or `success` masks the tile, which is `m` in utils-BRLjIBPE.js. */
      channel: 'UPI_ALT_INR',
      method: 'upi_alt',
      wayName: 'upi',
      supportedMethod: 'upi',
      name: 'upi',
      sort: 6,
      minDepositAmount: 100,
      maxDepositAmount: 50000,
      maintainedStatus: 1,
      isSmartRoute: true,
      mode: 0,
      nightIcon: 'upi',
    },
  ],
};

/* `[...list].sort((a, b) => a.sort - b.sort)` — `ID`'s own ordering, which is also what decides
   which channel is selected on arrival (`r[0]`). */
export const channelsFor = (currencyName) =>
  [...((USE_FIXTURES && FIAT_CHANNELS[currencyName]) || [])].sort((a, b) => a.sort - b.sort);
/* LIVE: NO CHANNELS. `FIAT_CHANNELS` is bc.game's payment-provider grid (UPI, PhonePe, …) and the
   SmartBet backend has none of them: every PSP answers `503 PAYORDER_PROVIDER_DISABLED`. Its one
   fiat rail is a MANUAL bank transfer (`GET /user/bank-details/:coin` + `POST /user/deposits/fiat`)
   whose body requires `transactionId` (the bank reference) and takes a screenshot — fields this
   form does not have. So the live tab renders the original's own out-of-channels state rather
   than six channels whose submit could never reach anything. */

/* ── RECOVERED: utils-BRLjIBPE.js, whole ───────────────────────────────────────────────────
 *
 * A 1.5 KB module off `hash.game/assets/`, and every export in it is used by the fiat tab. */

/* `d`, exported as `g` — the per-currency rounding the amount ladder is built with. KRW floors
   to the nearest 10,000 and CAD is left alone because it is the one fiat here with cents. */
export const floorFor = (currencyName) => (value) =>
  currencyName === 'KRWFIAT'
    ? String(Math.floor(Number(value) / 1e4) * 1e4)
    : String(currencyName === 'CADFIAT' ? value : Math.floor(Number(value)));

/* `a`, exported as `t` — a grouped integer with no decimals at all, which is what the
   "Deposit Amount (100 - 50,000 INR)" label's upper bound goes through. */
export const groupInt = (value, lang = 'en-US') =>
  Number(value).toLocaleString(lang, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/* `f`, exported as `b` — the tile's range line. Returns "" rather than a partial string when
   either bound is missing, which is what keeps a channel without limits from printing "0 ~ 0". */
export const rangeText = (channel) =>
  'minDepositAmount' in channel &&
  Number(channel.minDepositAmount) > 0 &&
  Number(channel.maxDepositAmount) > 0
    ? `${groupInt(channel.minDepositAmount)} ~ ${groupInt(channel.maxDepositAmount)}`
    : '';

/* `u`, exported as `K`. Note `success` also counts as available — a channel is masked only when
   its status is neither `normal` nor `success`, which is `m`/`c` below. */
export const MAINTAINED = { normal: 0, disable: 1, success: 2 };
export const isMaintained = (channel) =>
  channel ? ![MAINTAINED.normal, MAINTAINED.success].includes(channel.maintainedStatus) : false;

/* `g`, exported as `i` — the VIP gate on a channel. Both bounds are optional and both are
   inclusive-exclusive in the direction they are written. */
export const belowVipRequirement = (channel, vipLevel) =>
  (channel.vipLevelRequirementStart != null && vipLevel < channel.vipLevelRequirementStart) ||
  (channel.vipLevelRequirementEnd != null && vipLevel > channel.vipLevelRequirementEnd);

/* ── RECOVERED: the deposit bonus on the fiat tab ──────────────────────────────────────────
 *
 * `xg` and its three helpers in index-C1xohM7W.js, over the `currentUseConfigs[0]` payload in
 * services/bonus.js. Between them they decide the "Extra +…" figure beside the amount box, the
 * orange corner tag on a quick-amount chip, and the floor the whole chip ladder is built from.
 *
 * These are three separate numbers that all fall out of one config, which is why the chips end
 * up at 1,000 / 5,000 / 50,000 rather than at the channel's own 100: the ladder starts at the
 * BONUS minimum, not the channel minimum. That the recovered arithmetic reproduces the
 * capture's three chips exactly, from a payload fetched independently, is the strongest check
 * available on any of this. */

/* `Df` — round a converted minimum up to something a person would type. Two and three digits go
   to the next 10, four to the next 100, five and up to the next 1,000. */
function roundUpMin(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const r = Math.ceil(n);
  const digits = String(r).length;
  if (digits === 2 || digits === 3) return Math.ceil(r / 10) * 10;
  if (digits === 4) return Math.ceil(r / 100) * 100;
  if (digits >= 5) return Math.ceil(r / 1e3) * 1e3;
  return r;
}

/* `_l` — the config's minimum expressed in the currency being deposited. THREE ROUTES, and the
   first is the only one that is not arithmetic: a currency listed in `minDepositCurrencies`
   takes its figure verbatim and is NOT rounded, which is why INR's 1,000 is exact. */
function configMinDeposit(config, currencyName) {
  if (getCurrency(currencyName)?.currencyType !== 'FIAT')
    return convertCurrency(config.minDeposit, config.currency, currencyName);

  const v2 = config.fiatRechargeV2;
  if (v2?.minDepositCurrencies?.[currencyName] != null)
    return Number(v2.minDepositCurrencies[currencyName]);
  if (v2?.usdBasedCurrencies?.[currencyName] != null)
    return roundUpMin(
      convertCurrency(v2.usdBasedCurrencies[currencyName], config.currency, currencyName),
    );
  return roundUpMin(convertCurrency(config.minDeposit, config.currency, currencyName));
}

/* `Ni` — bonus plus extra when the extra is present, bonus alone when it is null. See the note
   in services/bonus.js for why this fixture's extra is null and the /deposit-offer one's is not. */
const ratioOf = (config) =>
  config?.extraBonusRatio != null
    ? Number(config.bonusRatio ?? 0) + Number(config.extraBonusRatio)
    : Number(config?.bonusRatio ?? 0);

/* `bg` — whether the bonus applies to a currency at all. Blacklist first and it wins outright;
   then any one of the remaining rules passing is enough. */
function supportsCurrency(payload, currencyName) {
  const rules = payload?.supportCurrencyRule ?? [];
  const type = getCurrency(currencyName)?.currencyType;

  for (const rule of rules.filter((c) => c.type === 'blacklist'))
    if (rule.list.includes(currencyName)) return false;

  return rules
    .filter((c) => c.type !== 'blacklist')
    .some((c) => {
      if (c.type === 'all') return true;
      if (c.type === 'whitelist') return c.list.includes(currencyName);
      if (c.type === 'byType') return c.list.includes(type);
      return false;
    });
}

/* `xg`. The `vg` arm — a bonus with more than one selectable config, which is the newbie
   families — is not reachable from this fixture and is not ported; MONTHLY has one config.
   A null `maxBonus` or `maxDeposit` becomes MAX_SAFE_INTEGER exactly as the original does, so
   the caps below are live code with nothing to cap. */
export function depositBonusConfig(currencyName) {
  /* The STORE, not the read — see the note at its declaration. Null until the config lands,
     which is the original's own state too and is what makes the chip row render empty for a
     beat rather than with the wrong floor. */
  const payload = rechargeBonusConfigNow();
  if (!payload || !supportsCurrency(payload, currencyName)) return null;

  const config = payload.currentUseConfigs?.[0];
  if (!config) return null;

  return {
    minDeposit: configMinDeposit(config, currencyName),
    maxDeposit: config.maxDeposit
      ? convertCurrency(config.maxDeposit, config.currency, currencyName)
      : Number.MAX_SAFE_INTEGER,
    ratio: ratioOf(config),
    maxBonusAmount: convertCurrency(
      config.maxBonus ?? Number.MAX_SAFE_INTEGER,
      config.currency,
      currencyName,
    ),
  };
}

/* `nC` — the "Extra +₹1,800.00" beside the amount box. Below the bonus minimum it is zero, not
   a smaller bonus. */
export function extraBonusAmount(amount, currencyName) {
  const config = depositBonusConfig(currencyName);
  if (!config) return 0;

  const value = Number(amount) || 0;
  if (value < config.minDeposit) return 0;
  return Math.min(value * config.ratio, config.maxBonusAmount);
}

/* The chip's corner tag: the config, but only for amounts it actually applies to. `a()` in `dC`
   returns the whole config rather than a boolean, which is what lets the tag print the ratio. */
export function chipBonusConfig(amount, currencyName) {
  const config = depositBonusConfig(currencyName);
  if (!config) return null;

  const value = Number(amount);
  return value >= config.minDeposit && value <= config.maxDeposit ? config : null;
}

/* ── RECOVERED: the quick-amount ladder ────────────────────────────────────────────────────
 *
 * `wC`, `fC` and `lC`. The white-label `bcmx` branch inside `lC` is dropped — `zi.bcmx` is a
 * build flag for a different deploy and is false here. */

/* `yC` — the amount the box opens on, when it clears the channel's own minimum. */
const SEED_MIN = { BRLFIAT: 50, INRFIAT: 500, PHPFIAT: 200 };
export const seedAmount = (currencyName, min, max) => {
  const n = SEED_MIN[currencyName];
  return n !== undefined && n >= min && n < max ? n : min;
};

/* `hC` — one channel in one currency gets an extra rung inserted at its own price point. */
const SPECIAL_AMOUNT = { BRLFIAT: { Pagsmile: 299 } };
const specialAmount = (currencyName, min, max, method) => {
  const table = SPECIAL_AMOUNT[currencyName];
  if (!table || !method) return 0;
  const value = table[method];
  return value && min <= value && max > value ? value : 0;
};

/* `lC` — the ladder itself, and it is generated rather than listed. Start from the maximum,
 * walk down by powers of ten, and keep every rung that clears the floor by more than 10; then
 * put the floor itself at the bottom. The floor is the channel minimum raised to the BONUS
 * minimum, which is the whole reason INR's ladder starts at 1,000 and not 100.
 *
 * Worked through for the capture: max 50,000, channel min 100, bonus min 1,000.
 *   floor  = ceil(min(max(100, 1000), 50000))       = 1000
 *   rungs  = 5000 (> 1010), then 500 / 50 / 5 all rejected
 *   result = [1000, 5000, 50000]
 * which is the capture's three chips, in its order. */
function amountLadder(max, min, special, bonusMin, currencyName) {
  const floor = floorFor(currencyName);
  const low = Math.ceil(Math.min(Math.max(min, bonusMin), max));
  const out = [max];

  for (let i = 1; i < String(max).length; i += 1) {
    const rung = Number(floor(max / 10 ** i));
    if (rung > Number(floor(low)) + 10) out.unshift(rung);
  }
  out.unshift(Number(floor(low)));

  if (special) {
    const at = out.findIndex((value) => value >= special);
    out.splice(at, 0, special);
  }
  return [...new Set(out)];
}

/* `amountList` on a channel short-circuits the whole ladder — some channels ship their own
   fixed denominations and the amount box goes read-only. None here does. */
export function quickAmounts(channel, currencyName) {
  if (channel.amountList) return channel.amountList.map(Number);

  const min = Number(channel.minDepositAmount);
  const max = Number(channel.maxDepositAmount);
  return amountLadder(
    max,
    min,
    specialAmount(currencyName, min, max, channel.method),
    depositBonusConfig(currencyName)?.minDeposit ?? 0,
    currencyName,
  );
}

/* The value the amount box opens on. `bC` seeds it from `wC` and `dC` then raises it to the
   first rung if it fell short — which for INR is 500 raised to 1,000. Folded into one call here
   because splitting it across a render and an effect is the cascading setState the lint rule
   rejects, and the two always settle in the same place. */
export function initialAmount(channel, currencyName) {
  const seed = seedAmount(
    currencyName,
    Number(channel.minDepositAmount),
    Number(channel.maxDepositAmount),
  );
  const ladder = quickAmounts(channel, currencyName);
  return ladder.length > 0 && seed < ladder[0] ? ladder[0] : seed;
}

/* `uD` — the notes under the submit button, verbatim, including the fourth line iCash.one adds.
   The `PiastrixWallet`, `Stbl_RUB_*` and `TopPayTHB` arms are the same shape against channels
   this fixture has no rows for; the monthly-limit line needs a `monthlyLimitInfo` payload. */
export function depositNotes(channel) {
  const notes = [
    '1. Your transfer amount has to MATCH the submission amount.',
    '2. Each Order ID can ONLY be used once to avoid duplicates.',
    '3. Please follow the deposit guideline to make deposit, otherwise your deposit will be missing.',
  ];
  if (channel?.channel === 'ICashOne_INR')
    notes.push('4. Need help?Use the Help Center in the app or email support@icash.one.');
  return notes;
}
