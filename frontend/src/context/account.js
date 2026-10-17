/* The account store — shape, defaults and the one captured session.
 *
 * Source for the SHAPE is `NC` in index-BsFv7ByC.js, the literal the original seeds its
 * persisted `account` store with. Source for the VALUES is
 * `bc.game/bc.game/api/account/get/index.html`, a real captured response, and
 * `api/user/amount/index.html` for the wallet. Both were recorded from the same anonymous
 * visit as the rest of the mirror, so the two agree with each other.
 *
 * There is no backend here, so nothing fetches: the visitor state below IS the response the
 * mirror recorded, and `signIn()` swaps in a second fixture. That is the same arrangement the
 * bet feed and the lottery draws already use — captured data standing in for a live endpoint.
 */

/* The hidden-player sentinel, `Os.hiddenName` in index-BsFv7ByC.js, with its own
 * `getName(e) { return e === We.hiddenName ? t("Hidden") : e }`. It is one string in one place
 * on the original and was previously written out as a literal `'****'` at its only call site. */
export const HIDDEN_NAME = '****';

export const displayName = (name) => (name === HIDDEN_NAME ? 'Hidden' : name);

/* `NC`, verbatim. Kept whole rather than trimmed to what is read today: it is the contract the
   original's own components branch on, so it is also the list of what the logged-in shell can
   expect to find when it gets built. `chatRoomPermission` is its `MC`. */
export const ACCOUNT_DEFAULTS = {
  name: '',
  avatar: '',
  userAvatarFrameList: [],
  userId: 0,
  uniqueUid: 0,
  uid: 0,
  createTime: 0,
  kyc: 1,
  gameable: true,
  login: false,
  email: '',
  loginSource: '',
  open: 0,
  bonusCurrencyName: '',
  avatarUpdateTime: 0,
  vipLevel: 0,
  currXP: 0,
  levelEndXP: 0,
  levelStartXP: 0,
  safePwd: false,
  google2StepAuth: false,
  hasPhone: false,
  chatRoomPermission: { blockable: false, deleteable: false, vipable: false, blockLevel: 0 },
  emailVerified: false,
  channel: '',
  currentInvitationCode: '',
  areaCode: '',
  showable: true,
  areaAlert: false,
  acceptPromotion: true,
  acceptSmsPromotion: true,
  passwordExist: false,
  invitationUrl: '',
  serverTimestemp: 0,
  ip: '',
  rayId: '',
  passkeyHasSet: false,
  appChannelId: 0,
  redirectDomain: '',
  socketDomain: '',
  setting: {
    currencyFullName: false,
    /* The pair that decides whether an amount prints in its own currency or converts. See
       `printCurrency` in index-BsFv7ByC.js: `target = enableLocaleCurrency ?
       setting.localeCurrencyName : currencyName`. OFF by default (user's request, 2026-10-17:
       the sidebar / header currency must read USDT, the owner panel's `default_currency`, not
       USD). With it off they print `useSiteCurrency()` and amounts stay in the wallet's own coin;
       a player can still turn on a fiat view from the picker. */
    localeCurrencyName: 'USDFIAT',
    enableLocaleCurrency: false,
    currencyName: 'USDT', // the owner's default coin (owner panel default_currency) until the player picks one
    currencyBonusType: '',
    hideSmallCurrency: false,
    lastFiatCurrency: '',
    lastCryptoCurrency: '',
    lastNftCurrency: '',
    soundEffectEnable: true,
    maxbetAlert: true,
    allowRechargeSuccessEmail: 1,
    allowWithdrawSuccessEmail: 1,
    lang: 'en',
    noDisturb: false,
  },
  redDot: { systemNotice: 0, gameComment: 0 },
  vipUser: false,
  cwalletId: null,
  userCountry: null,
};

/* api/account/get/index.html, `data`, merged onto the defaults.
 *
 * The response sends `null` where the store keeps `""` (name, email, avatar, invitationUrl);
 * normalised here, since every consumer treats those as strings.
 *
 * `showable && areaAlert` is the region-block gate — Enter-MsmOuq5R.js reads exactly that pair
 * before it fires `block_page_view`, and the inverse (`!login && showable && !areaAlert`) is
 * what gates one-tap sign-in. Both are true in this capture, which is why the mirror was taken
 * with the block dialog up. */
export const VISITOR = {
  ...ACCOUNT_DEFAULTS,
  visitor: true,
  login: false,
  userId: 0,
  uniqueUid: 0,
  uid: 0,
  gameable: true,
  showable: true,
  areaAlert: true,
  areaCode: 'US',
  ip: '149.40.62.50',
  rayId: 'ad130edf7b0a79b8-1785494263838',
  bonusCurrencyName: 'BCD',
  balanceDataCenter: '',
  socketDomain: 'socketv4.bc.game',
  advancedKycStatus: false,
};

/* api/user/amount/index.html, `data`, verbatim. Two currencies, both zero and both
   `display: false` — which is what a logged-out wallet returns. */
export const VISITOR_BALANCES = [
  {
    lastLogId: '0',
    currencyName: 'BCD',
    aliasCurrencyName: 'BCD',
    amount: '0',
    generalAmount: '0',
    bonusAmount: '0',
    groupAmount: { sports: '0', free_amount: '0' },
    abnormal: true,
    sort: 0,
    display: false,
    displayStatus: 0,
    supportTx: true,
    useable: false,
    areaAble: true,
  },
  {
    lastLogId: '0',
    currencyName: 'MATIC',
    aliasCurrencyName: 'MATIC',
    amount: '0',
    generalAmount: '0',
    bonusAmount: '0',
    groupAmount: { sports: '0', free_amount: '0' },
    abnormal: true,
    sort: 0,
    display: false,
    displayStatus: 0,
    supportTx: true,
    useable: false,
    areaAble: true,
  },
];

/* INVENTED — the mirror was captured logged out, so there is no recorded signed-in response to
 * copy. Only the SHAPE above is ground truth; every value here is made up, and it is made up
 * to be useful rather than realistic:
 *
 *  - vipLevel 3 with currXP between levelStartXP and levelEndXP gives the header's VIP ring a
 *    non-trivial 20% to draw.
 *  - areaAlert false, so signing in does not sit behind the block dialog.
 *  - passwordExist true, so the settings pages render an account that has been set up rather than
 *    one that has not.
 *  - EMAILVERIFIED FALSE WITH AN EMAIL SET, which is the state the reference captures show and is
 *    what the whole `/settings` family reads. It was true for a while, on a note claiming the
 *    account menu wanted its settled state — nothing in the menu has ever read the field, and the
 *    two surfaces that do were both showing the wrong half: Account Info printed a Verified badge
 *    beside a Change button, and the Security tile drew the settled tick over "To update your email
 *    address…". One field, and flipping it lands all three of its consequences at once — the field
 *    keeps its address and offers Verify, the tile goes amber with "Verify your email address is
 *    valid and accessible by you." over a brand Verify Email, and the strength badge falls to Weak,
 *    which is what the capture reads (`isWeak` is `!email && !phone && !twofa`, and it ignores the
 *    password entirely — see pages/Settings/strength.js).
 *
 * Replace it wholesale the day a real logged-in capture exists.
 */
export const SIGNED_IN = {
  ...VISITOR,
  visitor: false,
  login: true,
  name: 'bcgamer',
  userId: 1000001,
  uniqueUid: 1000001,
  uid: 1000001,
  email: 'player@example.com',
  emailVerified: false,
  passwordExist: true,
  createTime: 1735689600000,
  /* The XP band is level 3's OWN, out of the captured VIP ladder in `src/data/vipConfig.js` —
     7000..15000 — with `currXP` a fifth of the way through it, which keeps the 20% the header
     ring was invented for. It used to read 1000/1200/2000, which was invented before that ladder
     was in the project and matched no row in it: the bonus page's level card looks its NEXT tier
     up by `minXp === levelEndXP`, so 2000 found nothing and the card printed the original's own
     "--" fallback instead of "Bronze IV". Keep any future edit on a real band. */
  vipLevel: 3,
  currXP: 8600,
  levelStartXP: 7000,
  levelEndXP: 15000,
  /* The capture's own code, not a made-up one. It was `BCGAMER` while nothing rendered it; the
     Refer and Earn dialog's rendered field and the Referral Codes tab's table both show
     `98q7ntrof8` beside `…/i-98q7ntrof8-n/`, and three surfaces derive from this one string, so
     it is worth having right. */
  currentInvitationCode: '98q7ntrof8',
  areaAlert: false,
  redDot: { systemNotice: 2, gameComment: 0 },
  /* `currencyName` is the SELECTED wallet, and the header pill reads it twice — once for the
   * coin image and once as the amount's source currency. The defaults say BTC, but BCD is the
   * one balance this fixture gives a non-zero amount, it is the account's own
   * `bonusCurrencyName`, and the signed-in header capture shows the BCD coin, so the three
   * agree.
   *
   * `enableLocaleCurrency` IS ON, which is the capture's own state and was the last thing here
   * to become reproducible. The capture pairs that BCD coin with "$0.00", and that pairing only
   * happens with this switch on and `localeCurrencyName` at USDFIAT: the coin comes off the
   * wallet's own currency while the figure is CONVERTED for display. It sat false for a while
   * because converting needs an FX rate this build had no feed for. `data/usdPrice.js` is that
   * feed now — a live answer from the path the bundle itself names — so the switch is on and the
   * pill prints a dollar figure over its BCD coin, as the live header does.
   *
   * It decides the SHAPE of a currency-dropdown row too, not just the pill's text: with it on,
   * each row is the converted figure over the raw one in `.text-second`, which is two lines
   * rather than one and is why the rows in the capture are taller than a single-line row. */
  setting: { ...VISITOR.setting, currencyName: 'BCD', enableLocaleCurrency: true },
};

/* The signed-in wallet.
 *
 * `/user/amount/` returns a row for EVERY currency the account can hold, with a `display` flag
 * deciding which of them the header's currency dropdown lists. So there are two lists here and
 * they are captured from two different places:
 *
 *   CRYPTO_ROWS  89 rows read off the rendered currency dropdown, in the order it prints them.
 *   FIAT_ROWS    the first NINE read off the Manage Assets sheet's Fiat tab, which is the only
 *                place a `display: false` row is visible at all, plus INR — which the dropdown
 *                proves the wallet holds — and the other 49 the live currency catalogue lists.
 *
 * WHY THE ORDER IS WRITTEN OUT RATHER THAN SORTED. Both consumers start from
 * `sortBy(walletStore, "sort")`, so each row's `sort` is the RESPONSE's own and is NOT
 * `currencyV2`'s catalogue sort — the catalogue's is 1 for almost every row and orders nothing.
 * Reordering these arrays is what reorders both panels, so `sort` is simply the index.
 *
 * That also marks where the evidence stops. The nine fiat rows at the head are the sheet's own
 * order; everything after them is the CATALOGUE's array order, which is real data standing in
 * for a key that was never captured. The crypto tail is a second, larger version of the same
 * gap and is deliberately NOT filled: the catalogue carries 251 chain currencies and only these
 * 89 were seen, so the Crypto tab is a captured list rather than a complete one. Adding the
 * rest would mean 162 rows in an order known to be wrong, and 162 more coin images.
 *
 * A row is written as its `currencyName` alone, or as `[currencyName, aliasCurrencyName]` where
 * the two differ. Every fiat differs (INRFIAT prints INR), and four crypto do — KLAY prints
 * KAIA, TON prints GRAM, UST prints USTC, TOMO prints VIC. The alias is what the row LABELS
 * itself with and what the coin image is named after, so losing it would be wrong twice over.
 * LUNA is a fifth case pointing the other way: it prints LUNA here and the live catalogue now
 * says LUNC, so the captured alias is kept and the drift is recorded in `data/currencies.js`.
 *
 * WHAT IS INVENTED is every amount, and there is exactly one non-zero: BCD at 128.4032. The
 * capture shows all 90 displayed rows at zero (it pairs the BCD coin with "$0.00"), and a wallet
 * of nothing but zeroes gives the header pill nothing to print — so BCD, the account's own
 * `bonusCurrencyName` and the currency `SIGNED_IN.setting` selects, carries a balance.
 *
 * The remaining fields are `VISITOR_BALANCES`' shape, which is the real captured one. */
const FIAT_ROWS = [
  ['ZARFIAT', 'ZAR'], ['ARSFIAT', 'ARS'], ['CLPFIAT', 'CLP'], ['IDRFIAT', 'IDR'],
  ['COPFIAT', 'COP'], ['UAHFIAT', 'UAH'], ['KESFIAT', 'KES'], ['GNFFIAT', 'GNF'],
  ['XAFFIAT', 'XAF'], ['TRYFIAT', 'TRY'], ['TWDFIAT', 'TWD'], ['NPRFIAT', 'NPR'],
  ['KRWFIAT', 'KRW'], ['KGSFIAT', 'KGS'], ['VESFIAT', 'VES'], ['RWFFIAT', 'RWF'],
  ['VNDFIAT', 'VND'], ['EGPFIAT', 'EGP'], ['AZNFIAT', 'AZN'], ['JPYFIAT', 'JPY'],
  ['MYRFIAT', 'MYR'], ['BOBFIAT', 'BOB'], ['PENFIAT', 'PEN'], ['KHRFIAT', 'KHR'],
  ['AEDFIAT', 'AED'], ['TNDFIAT', 'TND'], ['JMDFIAT', 'JMD'], ['NGNFIAT', 'NGN'],
  ['MDLFIAT', 'MDL'], ['NOKFIAT', 'NOK'], ['TJSFIAT', 'TJS'], ['PHPFIAT', 'PHP'],
  ['INRFIAT', 'INR'], ['ZMWFIAT', 'ZMW'], ['CZKFIAT', 'CZK'], ['PKRFIAT', 'PKR'],
  ['PLNFIAT', 'PLN'], ['XOFFIAT', 'XOF'], ['CHFFIAT', 'CHF'], ['UZSFIAT', 'UZS'],
  ['SEKFIAT', 'SEK'], ['EURFIAT', 'EUR'], ['MXNFIAT', 'MXN'], ['USDFIAT', 'USD'],
  ['MMKFIAT', 'MMK'], ['GBPFIAT', 'GBP'], ['LKRFIAT', 'LKR'], ['TZSFIAT', 'TZS'],
  ['RUBFIAT', 'RUB'], ['GHSFIAT', 'GHS'], ['AUDFIAT', 'AUD'], ['BRLFIAT', 'BRL'],
  ['BDTFIAT', 'BDT'], ['THBFIAT', 'THB'], ['KZTFIAT', 'KZT'], ['NZDFIAT', 'NZD'],
  ['DKKFIAT', 'DKK'], ['CADFIAT', 'CAD'], ['UGXFIAT', 'UGX'],
];

const CRYPTO_ROWS = [
  'BCD', 'BTC', 'BC', 'SATS', 'ETH', 'DOGE', 'XRP', 'BNB', 'USDT', 'LTC',
  'BCH', 'TRX', 'XLM', 'EOS', 'DOT', 'LINK', 'DAI', 'USDC', 'XMR', 'BSV', 'UNI', 'KSM',
  'SUSHI', 'WBTC', 'AAVE', 'YFI', 'CRO', 'ATOM', 'MANA', 'DASH', 'BAT', 'APT', 'ENJ', 'CRV',
  'WLD', 'HNT', 'BTCB', 'ARB', 'GMX', 'ALGO', 'ICP', 'BLUR', 'HBAR', 'PEPE', 'NANO', 'KAVA',
  'THETA', 'NEXO', 'TFUEL', 'LUNA', 'RUNE', 'OP', 'FIL', 'DGB', 'XTZ', 'WBNB', 'ROSE', 'WAXP',
  'CAKE', 'TWT', ['KLAY', 'KAIA'], ['TON', 'GRAM'], 'BANANO', 'VTHO', 'YGG', 'GODS', 'MATIC',
  'IOTX', 'SHIB', 'NEAR', 'ADA', 'RVN', 'WAVES', 'SAND', 'TUSD', 'AXS', 'ZIL', 'AVAX', 'SOL',
  'ETC', ['UST', 'USTC'], 'CELO', ['TOMO', 'VIC'], 'VET', 'DCR', 'EGLD', 'QTUM', 'APE',
  'PEOPLE',
];

/* THE TWO LISTS ARE CONCATENATED AND NOTHING DEPENDS ON WHERE THE JOIN FALLS. The real wallet
 * interleaves them under one `sort`, and only their RELATIVE order within a type was captured —
 * but both consumers group by currency type before they read the sort (the dropdown into
 * Cash / Cryptocurrency, the Manage Assets sheet into Fiat / Crypto tabs), so no comparison ever
 * crosses the join. Concatenating is therefore exact rather than approximate.
 *
 * `display` is what both the dropdown and the wallet page filter on: the 89 crypto plus the two
 * fiats below are the shown rows, and the other 57 fiats are what the Manage Assets sheet lists
 * with their switch off. They are also what finally gives the "Other Supported Coin(Click to add
 * and use Coins)" group — which appears during a search and lists hidden rows — something to list.
 *
 * THE SHOWN FIATS COME FROM THREE DIFFERENT CAPTURES OF THE SAME WALLET, AND THE LIST IS THE
 * UNION OF THEM RATHER THAN A PICK BETWEEN THEM. That is a change of approach and worth reading
 * before editing the array below:
 *
 *   the currency dropdown   the crypto list and the 58 fiats came off this one, where the single
 *                           shown fiat was INR.
 *   the wallet page         BOB and TJS, out of its own rendered DOM, from a later session.
 *   the Vault Pro page      USD, which is the currency its transfer panel opens on and the coin
 *                           its header pill shows — so that session had USDFIAT displayed too.
 *
 * This file used to reconcile the first two by letting the NEWER win, which switched INR off. The
 * third capture is what makes that untenable: no single session's Cash group contains all of BOB,
 * TJS and USD, so "which capture wins" can only ever reproduce one page's screenshot and
 * contradict another's. `display` is a per-row server flag a visitor toggles in Manage Assets, not
 * a property of the account, so a row being on in ANY capture is evidence that it can be on — and
 * the union is the only choice that renders every captured page correctly. INR comes back with it,
 * on its own original evidence.
 *
 * The knock-on is that the Cash group is four rows where each individual capture shows one or two.
 * That is the cost of the union and it is the right cost: a list that is a superset of every
 * observation beats one that is exact for a single page and wrong for the other two.
 *
 * `displayStatus: 1` is the flag Hide Small / "Hide 0 balance" treats as "keep this row whatever
 * it is worth". It is the only mechanism that survives that filter at a zero balance — everything
 * else has to clear $0.10 — and the original stamps it on any coin picked out of a search, which
 * pins a coin you went looking for so it does not vanish when the search clears.
 *
 * NO ROW CARRIES IT, and that is deliberate rather than an oversight. INRFIAT carried it once,
 * because the dropdown capture showed INR surviving Hide Small at zero, which is real evidence and
 * still is now that INR is displayed again. It is left off anyway: there is no equivalent evidence
 * for BOB, TJS or USD, and stamping one Cash row and not the other three would make the group
 * behave inconsistently under a filter for a reason no capture explains. Restoring it is a
 * one-field change if the worked example is ever wanted back in the Cash group.
 * The visible effect: turn "Hide 0 balance" on and the whole Cash group disappears, because BCD is
 * the only row in this wallet that clears ten cents. That is correct for this data, and the
 * feature's own worked example simply lives in the crypto group instead. */
/* The Cash group. ORDER IS NOT SET HERE — `sort` is the row's index in the concatenated
   FIAT_ROWS + CRYPTO_ROWS array and that is what every consumer orders on, so the rendered order
   is FIAT_ROWS' own: BOB (21), TJS (30), INR (32), USD (43). Reordering this array changes
   nothing; reordering FIAT_ROWS is what would. */
const SHOWN_FIATS = ['BOBFIAT', 'TJSFIAT', 'INRFIAT', 'USDFIAT'];

export const SIGNED_IN_BALANCES = [...FIAT_ROWS, ...CRYPTO_ROWS].map((entry, index) => {
  const [currencyName, aliasCurrencyName] = Array.isArray(entry) ? entry : [entry, entry];
  const amount = currencyName === 'BCD' ? '128.4032' : '0';
  return {
    lastLogId: '0',
    currencyName,
    aliasCurrencyName,
    amount,
    generalAmount: amount,
    bonusAmount: '0',
    /* Both zero on every row, which is what keeps the panel's Bonus Balance tab hidden: `Jt`
       only unhides the tab strip when some coin carries a sports or free-play amount. */
    groupAmount: { sports: '0', free_amount: '0' },
    abnormal: false,
    sort: index,
    display: !currencyName.endsWith('FIAT') || SHOWN_FIATS.includes(currencyName),
    displayStatus: 0,
    supportTx: true,
    useable: true,
    areaAble: true,
  };
});
