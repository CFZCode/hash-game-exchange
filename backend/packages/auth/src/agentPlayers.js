'use strict';

const { ForbiddenError } = require('@ibitplay/common');
const { isAgentTree } = require('./permissions');

/**
 * Players who belong to the agent tree.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * THE RULE
 *
 * A player whose owner (`users.parent_staff_id`) is a SUPER_MASTER, MASTER or
 * AGENT (staff levels 4–6, or an EXECUTIVE staff row under one — see
 * `effectiveStaffLevel`) is an agent's customer. Their money comes from the
 * agent (staff transfers / refill), not from the site, so on the player site
 * they get the same restrictions the agent tree got in the admin:
 *
 *   promotions  no bonus, redeem codes, gift cards, spin wheel, VIP / rank /
 *               club rewards, affiliate earnings, races or rakeback
 *   vault       no Vault Pro
 *   deposit     no deposit rail at all (fiat, crypto address, PSP, payment
 *               orders, P2P buy)
 *   swap        no wallet swap (quote, balances-for-swap, execute — HTTP and
 *               the SUBMIT_NEW_SWAP socket). Their swap HISTORY stays
 *               readable so records from before the rule remain visible.
 *   withdraw    no withdrawal rail at all (fiat, crypto via the
 *               SUBMIT_NEW_WITHDRAWL socket, payment-order payouts, P2P sell
 *               orders, withdrawal-whitelist writes). Their agent pays them
 *               out. Withdrawal HISTORY stays readable.
 *   tips        no sending peer-to-peer tips (POST /user/tip/send). They can
 *               still receive one, and their tip HISTORY stays readable.
 *
 * With all four money capabilities gone the player site shows no wallet
 * actions at all — only the read-only balance and the transaction history.
 *
 * Direct signups (no owner) and players owned by house staff (levels 1–3) are
 * unaffected.
 *
 * `AGENT_PLAYER_RESTRICTIONS` below is the ONE place that says which
 * capabilities an agent-tree player loses. Adding one later is one entry here
 * plus a `denyAgentPlayer('<name>')` on the routes — the
 * `capabilities` the player site reads (`/user/auth/me`) follows automatically.
 * ═════════════════════════════════════════════════════════════════════════
 */

/** capability -> the refusal an agent-tree player gets for it. */
const AGENT_PLAYER_RESTRICTIONS = Object.freeze({
  promotions: Object.freeze({
    code: 'PROMOTIONS_NOT_FOR_AGENT_USERS',
    message: 'Promotions are not available for your account',
  }),
  vault: Object.freeze({
    code: 'VAULT_NOT_FOR_AGENT_USERS',
    message: 'The vault is not available for your account',
  }),
  deposit: Object.freeze({
    code: 'DEPOSIT_NOT_FOR_AGENT_USERS',
    message: 'Deposits are not available for your account. Contact your agent to add funds.',
  }),
  swap: Object.freeze({
    code: 'SWAP_NOT_FOR_AGENT_USERS',
    message: 'Swap is not available for your account',
  }),
  withdraw: Object.freeze({
    code: 'WITHDRAW_NOT_FOR_AGENT_USERS',
    message: 'Withdrawals are not available for your account. Contact your agent to cash out.',
  }),
  tips: Object.freeze({
    code: 'TIPS_NOT_FOR_AGENT_USERS',
    message: 'Sending tips is not available for your account',
  }),
});

/** The capability names the player site is told about, in a stable order. */
const PLAYER_CAPABILITIES = Object.freeze(Object.keys(AGENT_PLAYER_RESTRICTIONS));

/** `{ promotions, vault, deposit, swap, withdraw, tips }` — true = the player has it. */
function capabilitiesFor(agentTree) {
  const out = {};
  for (const name of PLAYER_CAPABILITIES) out[name] = !agentTree;
  return out;
}

/** Is a staff record (as `resolveStaff` returns it) an agent-tree owner? */
const isAgentTreeOwner = (staff) => Boolean(staff) && isAgentTree(staff);

/** The 403 for a capability. */
function agentPlayerError(capability) {
  const restriction = AGENT_PLAYER_RESTRICTIONS[capability];
  if (!restriction) throw new Error(`Unknown player capability "${capability}"`);
  const error = new ForbiddenError(restriction.message);
  error.code = restriction.code;
  return error;
}

/** A tiny TTL map, bounded so a flood of ids cannot grow it forever. */
function ttlCache(ttlMs, max = 10_000) {
  const map = new Map();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (hit.expires <= Date.now()) {
        map.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value) {
      if (map.size >= max) map.clear();
      map.set(key, { value, expires: Date.now() + ttlMs });
    },
    delete: (key) => map.delete(key),
    clear: () => map.clear(),
  };
}

/**
 * The resolver: "is this player in the agent tree?".
 *
 * Two cached reads, neither per request in steady state:
 *   player -> owner staff id     (`loadOwnerStaffId`, the service's own `users` row)
 *   staff  -> level/parentLevel  (`loadStaff`, admin-service owns `staff`)
 *
 * A player with no owner answers without any read past the first. A staff id
 * the admin does not know (404) counts as no owner. Any other failure throws,
 * so a guarded route fails closed rather than paying a promotion it could not
 * check.
 */
function createAgentPlayerResolver({
  loadOwnerStaffId,
  loadStaff,
  playerTtlMs = 30_000,
  staffTtlMs = 60_000,
} = {}) {
  if (typeof loadOwnerStaffId !== 'function') throw new Error('createAgentPlayerResolver requires loadOwnerStaffId');
  if (typeof loadStaff !== 'function') throw new Error('createAgentPlayerResolver requires loadStaff');

  const owners = ttlCache(playerTtlMs);
  const staffTree = ttlCache(staffTtlMs);

  async function ownerOf(userId) {
    const key = String(userId);
    const cached = owners.get(key);
    if (cached !== undefined) return cached;
    const owner = await loadOwnerStaffId(userId);
    const value = owner === null || owner === undefined || owner === '' ? null : Number(owner);
    owners.set(key, value);
    return value;
  }

  async function staffIsAgentTree(staffId) {
    const key = String(staffId);
    const cached = staffTree.get(key);
    if (cached !== undefined) return cached;
    let staff;
    try {
      staff = await loadStaff(staffId);
    } catch (error) {
      if (error?.status === 404) staff = null;
      else throw error;
    }
    const value = isAgentTreeOwner(staff);
    staffTree.set(key, value);
    return value;
  }

  return {
    async isAgentPlayer(userId) {
      if (userId === null || userId === undefined) return false;
      const owner = await ownerOf(userId);
      if (!owner) return false;
      return staffIsAgentTree(owner);
    },
    async capabilities(userId) {
      return capabilitiesFor(await this.isAgentPlayer(userId));
    },
    /** Forget one player's owner (re-parented) — or everything. */
    invalidate(userId) {
      if (userId === undefined) {
        owners.clear();
        staffTree.clear();
      } else owners.delete(String(userId));
    },
  };
}

/**
 * The process-wide resolver, configured once by the service container — the
 * same shape as `configureEntitlements`, so route files, socket handlers and
 * payout code all ask the one cache without threading it through every deps.
 */
let active = null;

function configureAgentPlayers(options) {
  active = options && typeof options.isAgentPlayer === 'function' ? options : createAgentPlayerResolver(options);
  return active;
}

function resetAgentPlayers() {
  active = null;
}

/**
 * Is this player in the agent tree?
 *
 * Unconfigured (a unit test, a script that never built a container) answers
 * false: every service container configures it, and the money paths it guards
 * are only reachable through one.
 */
async function isAgentPlayer(userId) {
  if (!active) return false;
  return active.isAgentPlayer(userId);
}

async function playerCapabilities(userId) {
  return capabilitiesFor(await isAgentPlayer(userId));
}

/** Throw the 403 when an agent-tree player asks for a capability they lack. */
async function assertPlayerCapability(userId, capability) {
  if (!AGENT_PLAYER_RESTRICTIONS[capability]) throw new Error(`Unknown player capability "${capability}"`);
  if (await isAgentPlayer(userId)) throw agentPlayerError(capability);
}

/**
 * Route guard for the PLAYER audience: `router.use(denyAgentPlayer('promotions'))`.
 *
 * Runs after the loader's `authenticate()` + `requireActive()`. Like
 * `denyAgentTree` on the staff side it is not an authorization mark — it
 * narrows what an already-authenticated player may do.
 */
function denyAgentPlayer(capability) {
  if (!AGENT_PLAYER_RESTRICTIONS[capability]) throw new Error(`Unknown player capability "${capability}"`);
  return async function denyAgentPlayerMiddleware(req, _res, next) {
    try {
      if (!req.user) return next();
      await assertPlayerCapability(req.user.id, capability);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  AGENT_PLAYER_RESTRICTIONS,
  PLAYER_CAPABILITIES,
  capabilitiesFor,
  isAgentTreeOwner,
  agentPlayerError,
  createAgentPlayerResolver,
  configureAgentPlayers,
  resetAgentPlayers,
  isAgentPlayer,
  playerCapabilities,
  assertPlayerCapability,
  denyAgentPlayer,
};
