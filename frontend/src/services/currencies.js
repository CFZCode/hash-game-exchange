import { request, USE_FIXTURES } from './client';
import { PLATFORM } from './endpoints';
import { tokensFor as capturedTokensFor } from '../data/currencyTokens';

/* The coins the platform owner switched on — `GET /admin/currencies/public`, unauthenticated.
 *
 * `[{code, name, symbol, decimals, kind, image, networks: [{key, name}], sort}]`, ALREADY
 * FILTERED server-side: a coin is listed only when the owner's plan allows it, the site admin has
 * it on and it is not retired, and each coin carries only its enabled networks. So this is an
 * allow-list, where `/admin/site-config/public` (see `siteConfig.js`) is a set of switches — and
 * the two are read together, because a coin the owner created in the panel has a row here and no
 * flag there.
 *
 * THE SAME FAIL-OPEN RULE AS THE FLAGS: a list that has not landed, a refused read and fixture
 * mode are all `null`, and `null` lists everything. A broken read must never empty a wallet.
 *
 * Held in a module store rather than handed to components, for the reason `exchangeRate.js`
 * gives: the deposit and withdraw forms read the network table synchronously during render. It
 * is filled by `loadAccount` (in the same `Promise.all` as the wallet), so every signed-in
 * screen — and the wallet screens are all signed-in — reads a settled store.
 */
let listed = null;
let pending = null;
const tokenCache = new Map();

const remember = (list) => {
  listed = Array.isArray(list) ? list : null;
  tokenCache.clear();
  return listed;
};

/**
 * Read the list. Answers `null` rather than throwing. A read already in flight is shared;
 * `fresh` starts a new one (the account load does, so a reload sees the owner's latest switches).
 */
export function loadEnabledCurrencies({ fresh = false } = {}) {
  if (USE_FIXTURES) return Promise.resolve(null);
  if (!pending || fresh) {
    pending = Promise.resolve(request(PLATFORM.site.currencies, { live: true, fixture: null }))
      .then(remember, () => remember(null));
  }
  return pending;
}

/** The last list read, or `null` (= everything on). */
export const enabledCurrencies = () => listed;

/** Seed or clear the store directly — for tests. */
export const setEnabledCurrencies = (list) => remember(list);

/**
 * Is `code` (a BARE code — `INR`, not `INRFIAT`) on the owner's list? `true` when there is no
 * list, the same rule `isCurrencyEnabled` keeps for a missing flag.
 */
export function isCurrencyListed(list, code) {
  if (!Array.isArray(list)) return true;
  const want = String(code ?? '').toUpperCase().replace(/FIAT$/, '');
  if (!want) return true;
  return list.some((coin) => String(coin?.code ?? '').toUpperCase() === want);
}

/** Keep the codes (bare or `…FIAT`) the owner's list carries. */
export const filterListedCodes = (codes, list = listed) =>
  (codes ?? []).filter((code) => isCurrencyListed(list, code));

/* ── NETWORKS ─────────────────────────────────────────────────────────────────────────────
 *
 * The deposit and withdraw forms draw their Network select from `data/currencyTokens.js`, the
 * captured bc.game table, whose chains are named `TRON`/`ETHEREUM`/`BSC`. The platform names a
 * network by its rail — `TRC20`/`ERC20`/`BEP20`, or the coin's own chain (`BTC`, `LTC`, `DOGE`) —
 * so a key is mapped onto the table's chain before the two are compared. A key with no entry is
 * compared as written.
 */
const CHAIN_OF_KEY = {
  TRC20: 'TRON',
  ERC20: 'ETHEREUM',
  BEP20: 'BSC',
  BTC: 'BITCOIN',
  LTC: 'LITECOIN',
  DOGE: 'DOGE',
  SOL: 'SOLANA',
  BCH: 'BITCOINCASH',
  XRP: 'RIPPLE',
  ADA: 'ADA',
  POLYGON: 'POLYGON',
  MATIC: 'POLYGON',
  TON: 'TON',
};

export const chainOfNetworkKey = (key) => {
  const upper = String(key ?? '').toUpperCase();
  return CHAIN_OF_KEY[upper] ?? upper;
};

/**
 * The captured tokens for a coin, cut to the networks the owner has on.
 *
 * Left whole when there is nothing to cut by: no list (fixture mode, a failed read), a coin the
 * list does not name, a coin listed with NO networks (the platform's built-in coins with no
 * deposit rail answer `[]`, which is "none configured", not "all off" — and the form cannot
 * render an empty Network select), and a coin none of whose networks the captured table carries
 * (an owner-created network has no row there to show).
 */
export function enabledTokens(currencyName, list = listed) {
  const rows = capturedTokensFor(currencyName);
  if (!Array.isArray(list) || rows.length === 0) return rows;
  const code = String(currencyName ?? '').toUpperCase();
  const coin = list.find((row) => String(row?.code ?? '').toUpperCase() === code);
  const networks = Array.isArray(coin?.networks) ? coin.networks : [];
  if (networks.length === 0) return rows;
  const chains = new Set(networks.map((network) => chainOfNetworkKey(network?.key)));
  const kept = rows.filter((row) => chains.has(String(row.chain).toUpperCase()));
  return kept.length ? kept : rows;
}

/**
 * `data/currencyTokens.js`' `tokensFor`, with the owner's networks applied. Same signature, and
 * the same array back for the same coin until the list changes — the withdraw form keys effects
 * on what it returns.
 */
export function tokensFor(currencyName) {
  if (!Array.isArray(listed)) return capturedTokensFor(currencyName);
  if (!tokenCache.has(currencyName)) tokenCache.set(currencyName, enabledTokens(currencyName, listed));
  return tokenCache.get(currencyName);
}

/* ── THE DEPOSIT QUICK-PICK ───────────────────────────────────────────────────────────────
 *
 * The chips are bc.game's ten defaults (`DEFAULT_CURRENCIES` in `pages/Deposit/deposit.js`,
 * passed in so this module does not import a page). Against the platform only the ones
 * the (already filtered) wallet carries are offered — a chip for SOL or TON, which it does not
 * have, or for a coin the owner switched off, would open a form for a coin the site does not
 * take. Fixture mode keeps the ten, which is the capture.
 */
export function depositQuickPicks(defaults, balances) {
  if (USE_FIXTURES) return defaults;
  const wallet = new Set((balances ?? []).map((row) => row.currencyName));
  return defaults.filter((name) => wallet.has(name));
}

/** Is `name` a coin this wallet holds a row for? Always `true` in fixture mode. */
export const inWallet = (balances, name) =>
  USE_FIXTURES || (balances ?? []).some((row) => row.currencyName === name);

export default loadEnabledCurrencies;
