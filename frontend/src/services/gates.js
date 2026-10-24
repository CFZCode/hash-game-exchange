import { request, USE_FIXTURES } from './client';
import { PLATFORM } from './endpoints';
import { getSiteConfig } from './siteConfig';
import { applyTheme, themeOf } from '../theme/applyTheme';

/* What this site has switched on, and what THIS player's account may use — SmartBet's
 * `siteGates.ts` + `siteFeatures.tsx` (casino-sportsbook/frontend/src/lib), ported to this
 * build's routes. Pure: no React here, the provider is `context/GatesContext.jsx`.
 *
 * THREE SOURCES, each masked on the backend before it gets here:
 *
 *   GET /admin/site-config/public  {bonus: true, vipclub: false, …}   the site admin's flags; absent key = on
 *   GET /admin/features/public     [{feature: "swap", variant}, …]   the OWNER's plan; listed = on
 *   GET /user/auth/me → capabilities {promotions, vault, deposit, swap, withdraw, tips}
 *                                    false for a player in an agent's tree (@ibitplay/auth
 *                                    `agentPlayers.js`, the *_NOT_FOR_AGENT_USERS rules)
 *
 * A gate is ON when every source it names says so. A read that has not answered, or failed,
 * counts as on (fail open): a backend hiccup must never blank the site, and every route still
 * refuses for itself (403 NOT_ENTITLED / *_NOT_FOR_AGENT_USERS / SITE_POLICY_CHANNEL_CLOSED).
 *
 * WITH FIXTURES ON EVERYTHING IS ON — the fixture build is the pixel reference and must render
 * every row it always did. That is `ALL_ON` below, and the provider never reads in that mode.
 */

/** Not in `endpoints.js` on purpose: other areas edit that file; this one is read only here. */
const FEATURES_PUBLIC = '/api/v1/admin/features/public';

/**
 * gate → what switches it. `flag` is a site-config key, `feature` an owner catalogue key
 * (backend `packages/common/src/featureCatalogue.js`), `capability` the player's.
 * Same names as SmartBet's GATES where the section is the same one.
 */
export const GATES = {
  // Every way of adding money: the wallet's Deposit tab, the header Deposit button, /deposit.
  // `rail`: the owner's cashier policy (backend sitePolicy.js). This UI's only live deposit rail
  // is the Crypto tab — an AUTOMATIC deposit (the Fiat tab has no live channel: the platform's
  // manual transfer needs a reference + screenshot the form does not have) — and its only
  // withdrawal is the crypto request, which the backend files as MANUAL (staff-reviewed). So a
  // policy that closes that rail closes the whole entry.
  // A manual-only site (deposit_mode = manual) still opens the entry when the manual transfer
  // form can be used — see `manualDeposit` below.
  deposit: { capability: 'deposit', rail: ['deposit_mode', 'automatic'], orManual: true },
  // P2P / card buy is a deposit rail on the backend (`deposit` capability covers "P2P buy").
  buy: { capability: 'deposit' },
  withdraw: { capability: 'withdraw', rail: ['withdrawal_mode', 'manual'] },
  swap: { feature: 'swap', capability: 'swap' },
  vault: { feature: 'vault', capability: 'vault' },
  bonus: { flag: 'bonus', feature: 'bonus', capability: 'promotions' },
  vip: { flag: 'vipclub', feature: 'vip', capability: 'promotions' },
  affiliate: { flag: 'affiliate', feature: 'affiliate', capability: 'promotions' },
  promotions: { feature: 'promotions', capability: 'promotions' },
  // Daily Contest is the backend's wager races; Weekly Raffle its ticket raffle (flag `lotto`).
  contest: { feature: 'races', capability: 'promotions' },
  raffle: { flag: 'lotto', feature: 'raffles', capability: 'promotions' },
  quests: { feature: 'challenges', capability: 'promotions' },
  // The sidebar's Gift Card card and its redeem dialog: the owner's `gift_cards` feature AND the
  // site's `giftcards` flag, and never for an agent's player (the backend's
  // `denyAgentPlayer('promotions')` on every player gift-card route).
  giftcards: { flag: 'giftcards', feature: 'gift_cards', capability: 'promotions' },
  // Rewards with no site switch of their own (free plays): only the player's capability.
  rewards: { capability: 'promotions' },
  // `sports` is the site admin's kill switch.
  sports: { flag: 'sports' },
  /* Which sports the owner runs (owner panel → Products), one at a time: the sportsbook (a
     third-party book in an iframe) only when its flag is explicitly on, else our exchange. An
     older backend that sends neither reads as the exchange — today's site. */
  sportsexchange: { flag: 'sports', mode: 'exchange' },
  sportsbook: { flag: 'sports', mode: 'sportsbook' },
  // The third-party casino lobby: owner Site flags → Casino AND the Super Admin's Features → Casino.
  casino: { flag: 'casino' },
  // One promotion's page is its section's AND the promotions' (a sports offer goes with sports).
  sportsPromo: { flag: 'sports', feature: 'promotions', capability: 'promotions' },
  casinoPromo: { flag: 'casino', feature: 'promotions', capability: 'promotions' },
  notifications: { feature: 'notifications' },
  // KYC: the owner's feature, and never for an agent's player — the agent vouches for them
  // (addaplay's `useAgentUser` rule: their personal-verification section is hidden).
  kyc: { feature: 'kyc', notAgentPlayer: true },
  // BC Originals = the platform's in-house games (js_games vendor `in-house`). The owner's
  // "Originals (in-house)" flag, masked onto site-config/public by the backend, which also refuses
  // the in-house list and launch (casino gameEntitlement.js).
  originals: { flag: 'originals' },
  // The Blog — `/blog`, `/blog/:slug`, the sidebar row and the footer News link (all internal now):
  // the OWNER's `blog` feature, and never for an agent's player. Not a promotion section, so a B2B
  // site keeps it when the owner switches it on.
  blog: { feature: 'blog', notAgentPlayer: true },
  // Deposit rollover: an agent's player has no deposit or withdrawal, so nothing to roll over.
  rollover: { notAgentPlayer: true },
};

/** Path prefix → gate, most specific first. History routes (transaction, bet history,
 *  deposit/withdraw detail) are deliberately absent: they stay readable for everyone. */
export const ROUTES = [
  ['/wallet/deposit', 'deposit'],
  ['/deposit', 'deposit'],
  ['/wallet/withdraw', 'withdraw'],
  ['/wallet/buy', 'buy'],
  ['/wallet/swap', 'swap'],
  ['/wallet/vault', 'vault'],
  ['/wallet/rollover', 'rollover'],
  ['/bonus', 'bonus'],
  ['/free-plays', 'rewards'],
  ['/quests', 'quests'],
  ['/vip', 'vip'],
  ['/vip-detail', 'vip'],
  ['/referral', 'affiliate'],
  ['/referral-exhibition', 'affiliate'],
  ['/promotions/daily-contest', 'contest'],
  ['/promotions/weekly-raffle', 'raffle'],
  ['/promotions', 'promotions'],
  // One promotion's page (`/promotion/:segment/:slug`) — the same section as the list.
  ['/promotion/sports', 'sportsPromo'],
  ['/promotion/casino', 'casinoPromo'],
  ['/promotion', 'promotions'],
  ['/deposit-offer', 'promotions'],
  ['/blog', 'blog'],
  ['/sports', 'sports'],
  ['/notification', 'notifications'],
  // Payout accounts and the withdrawal address whitelist: withdraw rail only (not an agent's player).
  ['/settings/payment', 'withdraw'],
  ['/settings/whitelist', 'withdraw'],
  ['/settings/verify', 'kyc'],
  ['/settings/verification', 'kyc'],
  // The sidebar's BC Originals entry and the casino page's Originals tag page.
  ['/casino/brand', 'originals'],
  ['/gamelist/brand', 'originals'],
  ['/section/originals', 'originals'],
  ['/tagname/BC%20Originals', 'originals'],
  ['/tagname/BC Originals', 'originals'],
  // The rest of the lobby — after the Originals paths above, which `find` must reach first.
  ['/casino', 'casino'],
  ['/gamelist', 'casino'],
  ['/tagname', 'casino'],
  ['/section', 'casino'],
];

/** The section an href belongs to, if any (`/wallet/swap?x=1` → swap). */
export function gateOf(href) {
  const path = String(href ?? '').split(/[?#]/)[0];
  return ROUTES.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? null;
}

/* The promotion sections. On a B2B site (`business_model: b2b`, agents only) every one of them is
   off for EVERYONE — guests, direct players and agent players alike — and the backend refuses them
   the same way (PROMOTIONS_DISABLED_B2B). hybrid and b2c keep the per-player rule (the
   `promotions` capability). */
const PROMO_GATES = new Set(['bonus', 'vip', 'affiliate', 'promotions', 'sportsPromo', 'casinoPromo', 'contest', 'raffle', 'quests', 'rewards', 'giftcards']);

/* The owner's policies when the site never chose one — the backend's own `POLICY_DEFAULTS`
   (packages/common/src/sitePolicy.js). */
const POLICY_DEFAULTS = { business_model: 'hybrid', deposit_mode: 'both', withdrawal_mode: 'both', theme_mode: 'dark_only' };

/* Which policy variants leave a channel open — backend sitePolicy.js ALLOWS. */
const railOpen = (mode, channel) => mode === 'both' || mode === channel;

/**
 * The gate functions for one set of reads. `flags`/`features`/`capabilities` may each be
 * undefined (not answered, failed, signed out): what it would switch reads as on.
 *
 * @param {{flags?: object|null, features?: Array|null, capabilities?: object|null, ready?: boolean}} reads
 */
export function makeGates({ flags, features, capabilities, ready = true } = {}) {
  const list = Array.isArray(features) ? features : null;
  const byKey = new Map((list ?? []).map((f) => [f.feature, f]));
  const flagMap = flags && typeof flags === 'object' ? flags : null;

  const can = (cap) => capabilities?.[cap] !== false;
  const policy = (key) => byKey.get(key)?.variant ?? POLICY_DEFAULTS[key];
  /* A player in an agent's tree. `/me` has no flag of its own for it, but `vault` and `deposit`
     are switched off for nobody else (backend agentPlayers.js; b2b only takes `promotions`, a
     withdraw lock only `withdraw`), so both off together is that player. */
  const agentPlayer = capabilities?.vault === false && capabilities?.deposit === false;
  /* The manual bank-transfer deposit: the owner's deposit_mode allows 'manual' AND the site admin's
     Manual deposit switch (`/me` capabilities.manualDeposit) is on. */
  const manualOpen = () => railOpen(policy('deposit_mode'), 'manual') && capabilities?.manualDeposit !== false;
  const blocked = (gate) => {
    const g = GATES[gate];
    if (!g) return null;
    if (g.flag && flagMap?.[g.flag] === false) return 'site';
    if (g.mode && (flagMap?.sportsbook === true ? 'sportsbook' : 'exchange') !== g.mode) return 'site';
    if (g.feature && list && !byKey.has(g.feature)) return 'site';
    if (g.rail && !railOpen(policy(g.rail[0]), g.rail[1]) && !(g.orManual && manualOpen())) return 'site';
    if ((PROMO_GATES.has(gate) || g.notB2B) && policy('business_model') === 'b2b') return 'site';
    if (g.notAgentPlayer && agentPlayer) return 'account';
    if (g.capability && !can(g.capability)) return 'account';
    return null;
  };
  const on = (gate) => blocked(gate) === null;

  return {
    ready,
    on,
    blocked,
    can,
    /** False only for a link into a switched-off section. */
    routeOn: (href) => {
      const gate = gateOf(href);
      return !gate || on(gate);
    },
    policy,
    /** The manual (bank transfer + screenshot) deposit form may show: deposit allowed for this player and manual open. */
    manualDeposit: () => on('deposit') && can('deposit') && manualOpen(),
    /** The gateway deposit (CCPayment's address per order) may show: deposit allowed and the owner's deposit_mode takes automatic. */
    autoDeposit: () => on('deposit') && can('deposit') && railOpen(policy('deposit_mode'), 'automatic'),
    /** One site-admin flag (`home_*` sections etc.); absent / not answered = on. */
    flag: (key) => flagMap?.[key] !== false,
    /** The signed-in player belongs to an agent's tree (restricted UI: INR wallet, no KYC, no promotions). */
    agentPlayer,
    /** Public self-registration: off on a B2B (agent-only) site. */
    canSignUp: () => policy('business_model') !== 'b2b',
    /** The light theme and its toggles: only when the owner's `theme_mode` is `switch`. Not answered
     *  or failed = dark only; fixtures (the pixel reference) keep both. */
    themeSwitch: () => (list ? policy('theme_mode') === 'switch' : USE_FIXTURES),
  };
}

export const ALL_ON = makeGates();

/* The agent tree's float currency (backend FLOAT_CURRENCY_ONLY: agent-tree money moves in INR). */
const isAgentCoin = (coin) => coin?.currencyName === 'INRFIAT' || coin?.currencyName === 'INR' || coin?.aliasCurrencyName === 'INR';

/** The wallet rows a player may pick: an agent's player sees only the agent currency (INR), as on
 *  addaplay; everyone else, and a wallet with no INR row, gets the list unchanged. */
export function walletCoins(balances, agentPlayer) {
  if (!agentPlayer) return balances;
  // Never another coin for an agent's player, even when the INR row is missing.
  return balances.filter(isAgentCoin);
}

/* The last public read, shared with the services that must not even ASK for a switched-off
   section (services/originals.js): one read per page load, refreshed whenever the provider
   re-reads. */
let lastPublic = null;
let lastAt = 0;

/** The current public gates for a non-React caller. Fixtures: `ALL_ON`. Never throws. */
export async function publicGates() {
  if (USE_FIXTURES) return ALL_ON;
  return makeGates(await (lastPublic ?? loadPublicGates()));
}

/** The two public reads. Never throws; a failed read is `null` (= everything on). A read started
 *  in the last second is shared rather than repeated (the page's first services and the provider
 *  both ask on mount). */
export function loadPublicGates() {
  if (!lastPublic || Date.now() - lastAt > 1000) {
    lastAt = Date.now();
    lastPublic = readPublicGates();
  }
  return lastPublic;
}

async function readPublicGates() {
  if (USE_FIXTURES) return { flags: null, features: null };
  const [features, flags] = await Promise.all([
    Promise.resolve(request(FEATURES_PUBLIC, { live: true, fixture: null })).catch(() => null),
    getSiteConfig(),
  ]);
  // The owner's template is this UI's colour theme (src/theme/palettes.css). A failed read keeps
  // whatever is on screen.
  if (Array.isArray(features)) applyTheme(themeOf(features));
  return { flags: flags ?? null, features: Array.isArray(features) ? features : null };
}

/** The same `{ flags, features }` out of a realtime sync state (services/realtime.js), with the
 *  owner's theme applied as `readPublicGates` does. Also refreshes the shared read so a page that
 *  calls `loadPublicGates` next gets the pushed answer. */
export function publicGatesFrom(state) {
  const features = Array.isArray(state?.features) ? state.features : null;
  if (features) applyTheme(themeOf(features));
  const next = { flags: state?.flags ?? null, features };
  lastPublic = Promise.resolve(next);
  lastAt = Date.now();
  return next;
}

/**
 * The signed-in player's capabilities off `/user/auth/me`. `null` when the read failed or the
 * backend left the field out (owner lookup failed) — the site then shows everything.
 *
 * A withdraw-blocked player also gets `withdraw: false`, but keeps the Withdraw tab so the
 * wallet can say why — SmartBet's rule, for an account that otherwise has wallet actions.
 */
export async function loadCapabilities() {
  if (USE_FIXTURES) return null;
  const me = await Promise.resolve(request(PLATFORM.user.auth.me, { live: true, fixture: null })).catch(() => null);
  return capabilitiesOf(me);
}

export function capabilitiesOf(me) {
  const caps = me?.capabilities;
  if (!caps || typeof caps !== 'object') return null;
  if (caps.withdraw === false && me.withdraw_locked && caps.deposit !== false) return { ...caps, withdraw: true };
  return caps;
}
