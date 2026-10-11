/* The six settings panes' payloads.
 *
 * EVERY ONE OF THEIR FEEDS IS LOGIN-GATED AND EVERY ONE WAS PROBED. Two different refusals come
 * back, and the split is worth recording because it is the same one the wallet panes documented:
 *
 *   6002  bc.game's own envelope   /account/open/info/list/, /account/link/list/,
 *                                  /agent/affiliate/community-links, /account/kyc/statusV2/,
 *                                  /account/setting/anti-phishing-code/get/
 *   4001  bare gateway 403         /account/online/status/my/, /payment/card/bind/list/,
 *                                  /payment/account/apply/list/, /payment/withdraw/address/list/,
 *                                  /payment/withdraw/address/check/
 *
 * `/account/open/unified-login-info/` is the one that ANSWERS, and it is already in this project
 * as a captured response — a login-domain catalogue rather than anything about an account, which
 * is the same side of the split `game/support` sits on.
 *
 * So none of this is fetchable, and what stands in its place is, in order of preference:
 *
 *   1. the SESSION FIXTURE, for anything the account already knows — the profile card, every
 *      Security card's state, both Preferences toggles pairs. Nothing new is invented for those
 *      and they are not repeated here.
 *   2. a chunk's OWN DECLARED DEFAULT, which is the trick `/bonus`, the referral dashboard, My
 *      Profile and the weekly raffle have each paid out on: `PRIVACY` below is `Privacy-ydLbf0kB.js`'s
 *      own initial store literal and `KYC_STATUS` is `f1` in `index-DUZ1QIOc.js`.
 *   3. the reference capture, for the one list that has neither — see `CONNECTIONS`.
 */

/* `/account/open/info/list/` — the Account Connections rows.
 *
 * THE ONE LIST HERE READ OFF A CAPTURE, and it is the documented last rung rather than a
 * shortcut: the chunk was recovered, the endpoint was probed (6002), and the resource is a bare
 * `Promise.all` with no `initialValue` to fall back on. The six rows and their order are exactly
 * what the desktop capture shows, all disconnected, which is also what a fresh account has.
 *
 * `openName` is the field the row prints (through `capitalize`) AND the key the icon switch reads,
 * so the lower-case spelling is load-bearing rather than cosmetic — `ee`'s switch tests
 * `"line" || "LINE"`, `"telegram" || "Telegram"`, `"twitter" || "Twitter"`, which is the server
 * being inconsistent about case rather than the component being defensive.
 *
 * `gmail` and `openUserName` are what a CONNECTED row prints beside its name; both are absent
 * here because nothing is connected. */
export const CONNECTIONS = [
  { openName: 'cwallet', connected: false },
  { openName: 'google', connected: false },
  { openName: 'telegram', connected: false },
  { openName: 'line', connected: false },
  { openName: 'twitter', connected: false },
  { openName: 'steam', connected: false },
];

/* `/account/link/list/` and `/agent/affiliate/community-links` — the Linked Accounts and
   Exclusive Communities cards. Both are `<Show when={list.length}>` on the original, so an empty
   list is not an empty card but no card at all, which is what the capture shows. */
export const LINKED_ACCOUNTS = [];
export const COMMUNITY_LINKS = [];

/* `POST /account/online/status/my/` — the Sessions table.
 *
 * ONE ROW, TRANSCRIBED FROM THE CAPTURE, and it is the row every account has: `myself: true` is
 * the session you are reading the page in, which is why its Action cell reads "In Use" rather
 * than offering a Remove. `lastTime` is not printed for it — `myself` short-circuits to the
 * literal "Online" before the timestamp formatter runs — so it is left at 0 rather than given an
 * invented instant, the same call the notification drawer's `createTime` documents in reverse.
 *
 * `device` and `area` are the capture's own values. `ip` IS NOT, and deliberately: the capture's
 * is the real address of the machine the reference screenshots were taken on, and this file is in
 * a repository. It is an RFC 3849 documentation address instead (`2001:db8::/32`, the range
 * reserved for exactly this), kept at full length so the column measures what the real one did.
 * The nearest thing in this project to a precedent is the deposit page's `placeholderAddress()`,
 * which likewise declines to look like the real value it stands in for. */
export const SESSIONS = [
  {
    deviceId: 'current',
    device: 'Windows 10 (Chrome 15)',
    area: 'IN',
    ip: '2001:db8:4090:d002:6802:64f1:2c73:b5af',
    lastTime: 0,
    myself: true,
  },
];

/* `GET /account/setting/privacy/<uid>/` — the Privacy Preferences block, and this is
   `Privacy-ydLbf0kB.js`'s OWN initial store literal, minus its `loading` flag. All false, which is
   what the capture shows for three of the four rows. The fourth, Max profit alert, is not in this
   payload at all: it reads `account.setting.maxbetAlert`, a local setting, and the capture shows
   it on because the account fixture's own default is on. */
export const PRIVACY = {
  allowOnlyFriendPrivate: false,
  hideGameData: false,
  hideName: false,
  refuseTip: false,
  refuseFriendRequest: false,
  hideOnlineStatus: false,
};

/* `GET /account/kyc/statusV2/` — Personal Verification.
 *
 * `f1` in `index-DUZ1QIOc.js` verbatim, WITH ONE ADDITION THAT IS FORCED AND ONE FIELD THAT IS
 * INFERRED. The declared default carries `levelResults: []`, and the pane gates its whole body on
 * `levelResults.length > 0` — so the chunk's own default renders the loading spinner rather than
 * the page, which is not what any capture shows. The live response plainly carries the two levels,
 * and they are the two cards the pane draws: `levelResults[0]` is Basic and `[1]` is Advanced,
 * hard-coded by index rather than matched by name.
 *
 * `kycStatus: 'init'` is the fresh-account value and is what puts both cards on their
 * `isPending || isInit` arm — the rule list over a Start New Verification row — which is the
 * capture. `basic-kyc-level` is the SITE'S OWN string, out of `link-main-CtXfDPOw.js` in the
 * mirror, where it is the fallback for `/settings/verify/${kycLevelName || "basic-kyc-level"}`.
 * Its sibling is the one inferred value on this page; nothing prints either, and both feed only
 * the unbuilt `/settings/verify/enter/:levelName` route. */
export const KYC_STATUS = {
  basicKycStatus: 'none',
  advancedKycStatus: 'none',
  attemptCnt: 0,
  appealPending: false,
  manualReviewStatus: null,
  lastUpdateTime: 0,
  linkStatus: 'linked',
  levelResults: [
    { level: 1, levelName: 'basic-kyc-level', kycStatus: 'init', vendor: '' },
    { level: 2, levelName: 'advanced-kyc-level', kycStatus: 'init', vendor: '' },
  ],
  kycDuplicateInfo: {
    duplicateUserId: 0,
    duplicateUserLevel: 0,
    approvedLevel: '',
    emailVerified: false,
    email: '',
    hasPhone: false,
    phoneSuffix: '',
    verifyFlowId: '',
  },
};

/* `GET /account/setting/anti-phishing-code/get/` — and the empty string is the resource's own
   declared `initialValue` in `index-DnPIrd_m.js`, not a stand-in for one. It is what puts the card
   on "Enable Anti-Phishing Code" with the amber attention mark. */
export const ANTI_PHISHING_CODE = '';

/* Payment Methods. Three feeds, all 403: the two bind lists the grid concatenates
   (`/payment/card/bind/list/` and `/payment/account/bind/list/`) and the apply history
   (`/payment/account/apply/list/`). Empty is what the capture renders — "No card yet! Please add
   a card" over the crocodile — so nothing is invented. */
export const PAYMENT_CARDS = [];
export const PAYMENT_HISTORY = [];

/* Whitelist Management. `/payment/withdraw/address/list/` is the table and
   `/payment/withdraw/address/check/` is the switch; both 403, so the list is empty and the toggle
   is off, which is the capture's "Whitelist Disabled" over the empty state. Note the Network
   filter's options are BUILT FROM THE LIST — one entry per distinct `chain`, seeded with the "All
   Network" row — so an empty list correctly leaves exactly that one option, the same arrangement
   the rollover pane's Bonus Type filter has. */
export const WHITELIST = [];
export const WHITELIST_ENABLED = false;
