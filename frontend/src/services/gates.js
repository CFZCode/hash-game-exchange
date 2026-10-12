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
  deposit: { capability: 'deposit', rail: ['deposit_mode', 'automatic'] },
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
  // Rewards with no site switch of their own (free plays): only the player's capability.
  rewards: { capability: 'promotions' },
  // `sports` is the site admin's kill switch.
  sports: { flag: 'sports' },
  notifications: { feature: 'notifications' },
  kyc: { feature: 'kyc' },
};

/** Path prefix → gate, most specific first. History routes (transaction, rollover, bet history,
 *  deposit/withdraw detail) are deliberately absent: they stay readable for everyone. */
export const ROUTES = [
  ['/wallet/deposit', 'deposit'],
  ['/deposit', 'deposit'],
  ['/wallet/withdraw', 'withdraw'],
  ['/wallet/buy', 'buy'],
  ['/wallet/swap', 'swap'],
  ['/wallet/vault', 'vault'],
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
  ['/deposit-offer', 'promotions'],
  ['/sports', 'sports'],
  ['/notification', 'notifications'],
  ['/settings/verify', 'kyc'],
];

/** The section an href belongs to, if any (`/wallet/swap?x=1` → swap). */
export function gateOf(href) {
  const path = String(href ?? '').split(/[?#]/)[0];
  return ROUTES.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? null;
}

/* The owner's policies when the site never chose one — the backend's own `POLICY_DEFAULTS`
   (packages/common/src/sitePolicy.js). */
const POLICY_DEFAULTS = { business_model: 'hybrid', deposit_mode: 'both', withdrawal_mode: 'both' };

/* Which policy variants leave a channel open — backend sitePolicy.js ALLOWS. */
const railOpen = (mode, channel) => mode === 'both' || mode === channel;

/* The backend's wording for a B2B site's refused sign-up (sitePolicy.js REASONS
   'business_model:public_signup'), shown before the visitor types anything. A submitted sign-up
   shows whatever the server itself answered instead. */
export const SIGNUP_CLOSED_MESSAGE = 'Sign-up is by invitation on this site. Ask your agent for an account.';

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
  const blocked = (gate) => {
    const g = GATES[gate];
    if (!g) return null;
    if (g.flag && flagMap?.[g.flag] === false) return 'site';
    if (g.feature && list && !byKey.has(g.feature)) return 'site';
    if (g.rail && !railOpen(policy(g.rail[0]), g.rail[1])) return 'site';
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
    /** Public self-registration: off on a B2B (agent-only) site. */
    canSignUp: () => policy('business_model') !== 'b2b',
  };
}

export const ALL_ON = makeGates();

/** The two public reads. Never throws; a failed read is `null` (= everything on). */
export async function loadPublicGates() {
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
