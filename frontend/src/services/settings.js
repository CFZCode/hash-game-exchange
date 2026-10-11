import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { getSessionId } from './tokens';
import { isFiatCode } from '../utils/currency';
import { tokensFor } from '../data/currencyTokens';
import {
  CONNECTIONS,
  LINKED_ACCOUNTS,
  COMMUNITY_LINKS,
  SESSIONS,
  PRIVACY,
  KYC_STATUS,
  ANTI_PHISHING_CODE,
  PAYMENT_CARDS,
  PAYMENT_HISTORY,
  WHITELIST,
  WHITELIST_ENABLED,
} from '../pages/Settings/settings';

/* `/settings/*` — the six panes' reads, one function each.
 *
 * TWO OF THEM ARE LIVE AND THE REST ARE SHUT, which is a much smaller share than the pane count
 * suggests and is worth stating up front:
 *
 *   sessions      LIVE, on the platform's `GET /user/auth/sessions`
 *   preferences   LIVE, one field of five — see the note there
 *   2FA           already live WITHOUT a read here: the Security tile branches on
 *                 `session.google2StepAuth`, which `services/auth.js` fills from the profile's
 *                 `twoFactorEnabled`. A second call to `/user/2fa/status` would ask the same
 *                 column the same question.
 *   KYC           LIVE NOW, on `GET /user/kyc/status`, and the objection that held it back is
 *                 answered rather than overruled. That note said the platform has ONE status and
 *                 this pane draws a two-level ladder, so wiring it would mean synthesising two
 *                 levels from one. **It would not: the platform's KYC *is* the basic level.** Its
 *                 submission is a name, a date of birth, an address and one identity document —
 *                 `kyc.validators.js`, and there is no `level` field anywhere in the module — which
 *                 is bc.game's Basic Verification exactly. Advanced (proof of address, source of
 *                 funds) has no equivalent there and stays at `none`, which is true rather than a
 *                 placeholder. So one record maps onto the one level it corresponds to and nothing
 *                 is invented. The other half of that note was also right, and is why this took
 *                 building rather than a one-line read: the pane branched on nothing but
 *                 `levelResults.length`, so a live status changed no pixel until its arms existed.
 *                 See `pages/Settings/Verification.jsx`.
 *   connections · linked accounts · community links · privacy · payment · whitelist
 *                 all shut, all rendering the site's own empty state, which is the correct
 *                 rendering rather than a compromise. The probes are in pages/Settings/settings.js.
 *
 * Nothing here formats or sorts: the KYC pane's
 * `levelResults.sort((a,b) => a.level - b.level)` is the ORIGINAL'S own line and sits in the
 * component with it, and the Account Connections list's `bcke || bcng` filter (which drops the
 * Cwallet row on two white labels) is likewise the component's, since it reads a build flag this
 * deploy does not set.
 */

export const getConnections = () =>
  request(ENDPOINTS.settings.connections, { fixture: CONNECTIONS });

export const getLinkedAccounts = () =>
  request(ENDPOINTS.settings.linkedAccounts, { fixture: LINKED_ACCOUNTS });

export const getCommunityLinks = () =>
  request(ENDPOINTS.settings.communityLinks, { fixture: COMMUNITY_LINKS });

/* ── Sessions ─────────────────────────────────────────────────────────────────────────────
 *
 * bc.game's own is a POST with no body — `post("/account/online/status/my/")` — which is what the
 * 403 came back to. The platform has a real one at `GET /user/auth/sessions`, so this is the one
 * read in the six panes that goes live, and the table stops showing a single invented row.
 *
 * The two payloads share nothing but the idea, so `toSession` maps them. Two fields have no
 * source on the platform side and are handled rather than guessed at:
 *
 *   `area`    it has no geo lookup. Left empty; the table renders the column blank rather than
 *             printing a country the server never said.
 *   `device`  it stores a `device_label` a client may send and otherwise the raw user agent.
 *             bc.game prints a tidied "Windows 10 (Chrome 15)", and `deviceLabel` parses the agent
 *             into that shape. This seam used to hand the raw string through on the reasoning that
 *             parsing is a guess dressed as data — and a raw agent is ~120 characters inside a
 *             `whitespace-nowrap` span the chunk puts on the device name, which pushed the desktop
 *             table to 1697px and the phone's session cards to 857px, scrolling the whole document
 *             sideways on both. The parse only names the OS family and the browser's major version,
 *             which every agent string states outright; anything it cannot place falls through to
 *             whatever it did recognise, and then to "Unknown device".
 *
 * `myself` comes from the ACCESS TOKEN's own `sid` rather than from the list — see
 * `getSessionId`. It decides "In Use" against a Remove button, so getting it wrong offers to
 * revoke the session you are reading the page on.
 *
 * The table pages it client-side in tens (`chunk(list, 10)`); that slicing is the component's
 * rather than this seam's, since it is a layout decision.
 */

/* Ordered: Edge, Opera and Samsung's browser all carry a `Chrome/` token as well, and every
   Chrome carries `Safari/`, so the more specific token has to be tried first. `Version/` is what
   real Safari puts its version behind. */
const BROWSER_TOKENS = [
  ['Edg/', 'Edge'],
  ['OPR/', 'Opera'],
  ['SamsungBrowser/', 'Samsung Internet'],
  ['Firefox/', 'Firefox'],
  ['FxiOS/', 'Firefox'],
  ['CriOS/', 'Chrome'],
  ['Chrome/', 'Chrome'],
  ['Version/', 'Safari'],
];

function browserOf(agent) {
  for (const [token, name] of BROWSER_TOKENS) {
    const at = agent.indexOf(token);
    if (at === -1) continue;
    const major = agent.slice(at + token.length).match(/^\d+/);
    return major ? `${name} ${major[0]}` : name;
  }
  return '';
}

/* Every Windows 10 and 11 agent says `Windows NT 10.0`, so "Windows 10" is what a UA can state. */
const WINDOWS = { '10.0': 'Windows 10', '6.3': 'Windows 8.1', '6.2': 'Windows 8', '6.1': 'Windows 7' };

function osOf(agent) {
  if (/iPhone/.test(agent)) return 'iPhone';
  if (/iPad/.test(agent)) return 'iPad';
  if (/Android/.test(agent)) return 'Android';
  const windows = agent.match(/Windows NT (\d+\.\d+)/);
  if (windows) return WINDOWS[windows[1]] ?? 'Windows';
  if (/Mac OS X/.test(agent)) return 'macOS';
  if (/CrOS/.test(agent)) return 'Chrome OS';
  if (/Linux/.test(agent)) return 'Linux';
  return '';
}

export function deviceLabel(row) {
  if (row.device_label) return row.device_label;
  const agent = row.user_agent || '';
  const os = osOf(agent);
  const browser = browserOf(agent);
  if (os && browser) return `${os} (${browser})`;
  return os || browser || 'Unknown device';
}

export function toSession(row, currentId) {
  return {
    deviceId: row.id,
    device: deviceLabel(row),
    area: '',
    ip: row.ip_address ?? '',
    lastTime: row.last_used_at ? new Date(row.last_used_at).getTime() : 0,
    myself: currentId != null && row.id === currentId,
  };
}

export const getSessions = () => {
  /* NO `method` — the platform's is a GET where bc.game's is a POST, and the old `method: 'POST'`
     here was invisible only because fixture mode ignores it. Sending it live is a 404. */
  const answer = request(PLATFORM.user.auth.sessions, { live: true, fixture: SESSIONS });

  /* Fixture mode hands back `SESSIONS`, which is already in this shell's shape and must not be
     run through the adapter. `Array.isArray` is not the test — both are arrays — so the branch is
     on whether a Promise came back, which is what `USE_FIXTURES` decides. */
  if (!answer || typeof answer.then !== 'function') return answer;

  const currentId = getSessionId();
  return answer.then((rows) => (rows ?? []).map((row) => toSession(row, currentId)));
};

/* ── Preferences ──────────────────────────────────────────────────────────────────────────
 *
 * FIVE FIELDS COME BACK AND ONE OF THEM IS WIRED, which is a smaller answer than the pane's size
 * suggests and is worth writing down so nobody re-derives it:
 *
 *   emailNotifications  →  "Receive marketing promotions by Email". WIRED. It was inert — the
 *                          switch was bound to `session.acceptPromotion` with an empty handler,
 *                          because bc.game's own endpoint is shut — and it now reads and writes.
 *   language            →  the Change Language row is DISPLAY-ONLY. This build ships one locale
 *                          and `context/settings.js` does not store the field, so there is
 *                          nothing for a value to move.
 *   theme               →  deliberately left local. Three controls already write this build's own
 *                          theme store (the sidebar, `/user/enter`, this pane), and adding a
 *                          server copy means a reload can disagree with what was just clicked.
 *   pushNotifications   →  no control. The pane's second marketing switch is SMS, which is a
 *   hideBalance            different channel, and the wallet's "Hide Small" filters small
 *                          balances rather than hiding the balance. Mapping either onto these
 *                          would be inventing a meaning the server does not have.
 *
 * The original sends BOTH marketing switches in one throttled body (`pe(fn, 1000)` around
 * `resetAcceptPromotion`), which is why its handlers each read the other's current value. That
 * arrangement is not reproduced, because there is only one field to send.
 */
export const getPreferences = () =>
  request(PLATFORM.user.preferences, { live: true, fixture: null });

export const updatePreferences = (patch) =>
  request(PLATFORM.user.preferences, {
    live: true,
    method: 'PATCH',
    json: patch,
    fixture: null,
  });

export const getPrivacy = (uid) =>
  request(ENDPOINTS.settings.privacy(uid), { fixture: PRIVACY });

/* ── KYC ───────────────────────────────────────────────────────────────────────────────────
 *
 * `GET /user/kyc/status` answers `{status, submitted}` plus a rejection reason once there is one.
 * Five statuses onto bc.game's per-level vocabulary, and only the FIRST level takes them — see
 * the note at the head of this file for why one record is Basic rather than both.
 *
 * `Unverified` is the one that needs a decision, and it goes to `init` with the rest of the
 * not-yet arm rather than to a rejection: their `KYC_STATUSES` spells it as a state a record can
 * be *created* in, not one a review produces, so a card reading "Verification Failed" for it would
 * be inventing a refusal nobody issued.
 *
 * `rejected_retry` rather than `rejected_final`, because the platform's own `review` route can set
 * `Rejected` again after a resubmission — there is no terminal-rejection state there, and the
 * final arm brings an Appeal card with a flow behind it that does not exist. `moderationComment`
 * carries their `rejectionReason`, which is what that arm prints.
 */
const KYC_LEVEL_STATUS = {
  Verified: 'approved',
  Pending: 'pending',
  Rejected: 'rejected_retry',
  NotSubmitted: 'init',
  Unverified: 'init',
};

const toKycStatus = (answer) => {
  const kycStatus = KYC_LEVEL_STATUS[answer?.status] ?? 'init';
  const [basic, advanced] = KYC_STATUS.levelResults;
  return {
    ...KYC_STATUS,
    basicKycStatus: kycStatus,
    /* Advanced verification has no platform equivalent at all, so it keeps the fixture's `none`
       and its card stays on the not-yet arm. That is the true answer rather than a placeholder:
       there is nothing on that side to be pending or approved. */
    levelResults: [
      { ...basic, kycStatus, moderationComment: answer?.rejectionReason ?? '' },
      advanced,
    ],
  };
};

export function getKycStatus() {
  if (USE_FIXTURES) return request(ENDPOINTS.settings.kycStatus, { fixture: KYC_STATUS });
  return Promise.resolve(request(PLATFORM.user.kyc.status, { live: true })).then(toKycStatus);
}

export const getAntiPhishingCode = () =>
  request(ENDPOINTS.settings.antiPhishingCode, { fixture: ANTI_PHISHING_CODE });

/* THE CARD GRID IS TWO FEEDS CONCATENATED, and that is the chunk's own arrangement rather than a
   convenience here: `Promise.all([cardList, accountList])` with every row of the second stamped
   `cardType: "ACCOUNT"`, then filtered by the selected tab. Both are empty, so the concatenation
   is invisible today and is written out anyway — it is what decides the order the day either
   answers. */
export const getPaymentCards = () => {
  const cards = request(ENDPOINTS.settings.cardList, { fixture: PAYMENT_CARDS, method: 'POST' });
  const accounts = request(ENDPOINTS.settings.accountList, {
    fixture: PAYMENT_CARDS,
    method: 'POST',
  });

  const join = (a, b) => [...(a || []), ...(b || []).map((row) => ({ ...row, cardType: 'ACCOUNT' }))];

  return cards && typeof cards.then === 'function'
    ? Promise.all([cards, accounts]).then(([a, b]) => join(a, b))
    : join(cards, accounts);
};

export const getPaymentHistory = () =>
  request(ENDPOINTS.settings.applyHistory, { fixture: PAYMENT_HISTORY, method: 'POST' });

/* ── Whitelist Management, wired 2026-09-04 (gap 16) ─────────────────────────────────────────
 *
 * `POST /payment/withdraw/address/list/` and `/check/` both answer 403 on the original, so this
 * pane has rendered "Whitelist Disabled" over an empty table since it was built. The platform has
 * a real store behind it now — `user_withdrawal_whitelist`, migration 039.
 *
 * ONE READ SERVES BOTH FUNCTIONS. `GET /user/withdrawals/whitelist` answers
 * `{whitelistOnly, addresses}` in one response, because the pane renders them together and they
 * are only meaningful together — a list with the switch off is a bookmark list, and the same list
 * with it on is a security control. The original asked twice; this asks once and splits the
 * answer, which is the shape the two call sites already expect.
 *
 * ── THE ROW SHAPES DIFFER AND ONE COLUMN HAS NO EQUIVALENT ────────────────────────────────
 *
 * The table reads `{id, addressName, currencyName, withdrawAddress, addressType, label, chain,
 * createTime}`. The platform stores `{id, label, currency, network, address, memo, createdAt}`.
 * Most map straight across; `addressType` does not exist there at all — bc.game distinguishes a
 * "Universal" address from a "Standard" one and this platform has one kind.
 *
 * EVERY ROW IS REPORTED AS STANDARD, and that is a correction. This mapped a row with a network
 * to Universal, under a note claiming it was what "makes the table's type column show the chain
 * rather than an empty cell" — which was not true of the code it sat on: the Network cell prints
 * `label` on the Standard arm and `chain` on the Universal one, and BOTH were assigned
 * `row.network`, so the cell rendered the same either way and the branch decided nothing.
 *
 * What the branch does decide is a WORD, in the Address Type filter and on the phone row's Type
 * line, and Standard is the true one. Universal on bc.game means an address with NO currency,
 * usable for every coin that shares its chain. This platform cannot store one: `currency` is NOT
 * NULL on `user_withdrawal_whitelist` and the unique key is `(user_id, currency, address)`. So
 * the Add form does not offer the universal arm either — see components/modals/WhitelistAddress,
 * where that omission is argued.
 *
 * `label` IS RESOLVED THROUGH THE TOKEN TABLE rather than echoed from `network`. bc.game's own
 * Network cell prints a token's display label — "Ethereum (ERC20)", not "ETHEREUM" — and
 * `data/currencyTokens.js` is that table, captured for all 89 coins. Falls back to the raw chain
 * for a network the table does not carry, which is what an unrecognised value should render.
 */
const toWhitelistRow = (row) => ({
  id: String(row.id),
  addressName: row.label,
  /* Bare code to this build's wallet key, the same translation the rollover row and
     `betHistory` both need — without it the coin-art lookup misses and the cell renders a
     broken image. Every address here is crypto today, where the two spellings agree, so this
     is guarding the fiat case rather than fixing a visible one. */
  currencyName: row.currency
    ? (isFiatCode(row.currency) ? `${row.currency}FIAT` : row.currency)
    : '',
  withdrawAddress: row.address,
  /* 1 = Universal, 0 = Standard. Always Standard here — see the note above. */
  addressType: 0,
  /* The raw chain, which is what the Network FILTER groups on; `label` is what the cell prints. */
  chain: row.network ?? '',
  label: row.network
    ? (tokensFor(row.currency).find((token) => token.chain === row.network)?.label ?? row.network)
    : '',
  createTime: row.createdAt ? Date.parse(row.createdAt) : null,
  /* Not rendered by the table; carried because the row is what an edit dialog would receive. */
  memo: row.memo,
});

/* `reloads` is not read — it is part of the reader's identity so a write can re-run this, the
   idiom `getRewards` and `getAffiliateDashboard` already use. `useResource` reads once per
   distinct reader and has no refetch, and this pane has four writes behind it. */
// eslint-disable-next-line no-unused-vars
export const getWhitelist = ({ reloads } = {}) => {
  if (!USE_FIXTURES) {
    return Promise.resolve(
      request(PLATFORM.user.whitelist.list, { live: true, fixture: { addresses: [] } }),
    ).then((answer) => (answer?.addresses ?? []).map(toWhitelistRow));
  }

  return request(ENDPOINTS.settings.whitelist, { fixture: WHITELIST, method: 'POST', body: '{}' });
};

/* Same reader-identity trick as `getWhitelist`: the switch is written and must be read back,
   and REMOVING THE LAST ADDRESS TURNS ENFORCEMENT OFF SERVER-SIDE, so a delete has to re-run
   this one too — which is why the pane keeps a single counter for both reads rather than one
   each. See `setWhitelistEnabled` below. */
// eslint-disable-next-line no-unused-vars
export const getWhitelistEnabled = ({ reloads } = {}) => {
  if (!USE_FIXTURES) {
    return Promise.resolve(
      request(PLATFORM.user.whitelist.list, { live: true, fixture: { whitelistOnly: false } }),
    ).then((answer) => Boolean(answer?.whitelistOnly));
  }

  return request(ENDPOINTS.settings.whitelistCheck, {
    fixture: WHITELIST_ENABLED,
    method: 'POST',
    body: '{}',
  });
};

/* ── The four writes, wired 2026-09-04 ───────────────────────────────────────────────────────
 *
 * All four are called now — `pages/Settings/Whitelist.jsx` for the switch and the delete confirm,
 * `components/modals/WhitelistAddress` for the two dialog routes. They sat here unused for one
 * pass, which is the same footing the vault transfers were on before their screen existed.
 *
 * `setWhitelistEnabled(true)` is REFUSED against an empty list (`WHITELIST_EMPTY_WHITELIST`), and
 * removing the last address turns it off by itself. Both halves guard the one state that would
 * lock a player out of their own money: enforcement on, nothing to withdraw to. The pane surfaces
 * the refusal as the server words it rather than hiding the switch, because "add an address
 * first" is exactly what a visitor needs to be told at that moment.
 */
export const addWhitelistAddress = ({ label, currency, network, address, memo }) =>
  request(PLATFORM.user.whitelist.add, {
    live: true,
    method: 'POST',
    json: { label, currency, address, ...(network ? { network } : {}), ...(memo ? { memo } : {}) },
  });

/* Only the LABEL. Editing an address in place is indistinguishable from adding an attacker's, so
   the platform refuses it — changing a destination is delete-then-add. */
export const renameWhitelistAddress = (id, { label }) =>
  request(PLATFORM.user.whitelist.rename(id), { live: true, method: 'PATCH', json: { label } });

export const removeWhitelistAddress = (id) =>
  request(PLATFORM.user.whitelist.remove(id), { live: true, method: 'DELETE' });

export const setWhitelistEnabled = (enabled) =>
  request(PLATFORM.user.whitelist.enforcement, {
    live: true,
    method: 'PUT',
    json: { enabled: Boolean(enabled) },
  });
