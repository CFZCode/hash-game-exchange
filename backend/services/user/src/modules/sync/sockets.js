'use strict';

const crypto = require('node:crypto');
const { AUDIENCE, PLATFORM_EVENTS } = require('@ibitplay/socket');

const { AuthService } = require('../auth/auth.service');
const { WalletService } = require('../wallet/wallet.service');
const { PreferencesService } = require('../preferences/preferences.service');

/**
 * `SYNC_STATE` — the client's whole state in one socket read, asked every 2 s.
 *
 *   { me, balances, preferences }        signed in only (the same bodies as
 *                                        /user/auth/me, /user/wallet/balances, /user/preferences)
 *   { flags, features, currencies }      everyone (/admin/site-config/public,
 *                                        /admin/features/public, /admin/currencies/public)
 *
 * The site half is admin-service's and the same for every player, so it is read at most once per
 * SITE_TTL_MS for the whole process, however many sockets poll.
 *
 * ── THE REPLY IS SCRAMBLED, NOT ENCRYPTED ────────────────────────────────
 * `{ status, d }` where `d` = base64(JSON XOR sha256(`${socket.id}:${SALT}`)). The key changes with
 * every connection, so a frame copied out of devtools reads as noise. The client holds the salt
 * to unscramble it, so this keeps casual eyes out; it is not a secret from someone reading the
 * bundle. Nothing in it is more than what the same player can already read over HTTP.
 */
const SALT = 'p567.sync.v1';
const SITE_TTL_MS = 5000;

const keyFor = (socketId) => crypto.createHash('sha256').update(`${socketId}:${SALT}`).digest();

function scramble(value, key) {
  const bytes = Buffer.from(JSON.stringify(value), 'utf8');
  for (let i = 0; i < bytes.length; i += 1) bytes[i] ^= key[i % key.length];
  return bytes.toString('base64');
}

function register({ on, deps }) {
  const { logger, clients } = deps;
  const auth = new AuthService(deps);
  const wallet = new WalletService(deps);
  const preferences = new PreferencesService(deps);

  let site = null;
  let siteAt = 0;
  let siteLoading = null;

  const body = (result) => (result && typeof result === 'object' && 'data' in result ? result.data : result);

  async function readSite() {
    const [config, currencies] = await Promise.all([
      clients.admin.get('/internal/admin/site-config/public').then(body),
      clients.admin.get('/internal/admin/currencies/public').then(body),
    ]);
    return {
      flags: config?.flags ?? {},
      features: Array.isArray(config?.features) ? config.features : [],
      currencies: Array.isArray(currencies) ? currencies : [],
    };
  }

  function siteState() {
    if (site && Date.now() - siteAt < SITE_TTL_MS) return Promise.resolve(site);
    siteLoading ??= readSite()
      .then((next) => {
        site = next;
        siteAt = Date.now();
        return next;
      })
      .catch((error) => {
        logger?.warn({ err: error.message }, 'Sync could not read the site config');
        return site;
      })
      .finally(() => {
        siteLoading = null;
      });
    return siteLoading;
  }

  const settle = (promise) => promise.catch(() => null);

  on(PLATFORM_EVENTS.SYNC_STATE, {
    audience: AUDIENCE.PUBLIC,
    limit: { windowMs: 10_000, max: 20 },
    handle: async (_payload, context) => {
      const userId = context.userId ? String(context.userId) : null;
      const [siteHalf, me, balances, prefs] = await Promise.all([
        siteState(),
        userId ? settle(auth.me(userId)) : null,
        userId ? settle(wallet.getBalances(userId)) : null,
        userId ? settle(preferences.get({ userId })) : null,
      ]);

      const state = {
        at: new Date().toISOString(),
        signedIn: Boolean(userId),
        ...(siteHalf ?? {}),
        ...(userId ? { me, balances, preferences: prefs } : {}),
      };

      return { status: true, d: scramble(state, keyFor(context.socket.id)) };
    },
  });
}

module.exports = { register, scramble, keyFor, SALT };
