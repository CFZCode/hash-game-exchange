'use strict';

const crypto = require('crypto');
const { Router } = require('express');
const {
  response,
  asyncHandler,
  UnauthorizedError,
  ServiceUnavailableError,
  noBody,
} = require('@ibitplay/common');

/**
 * `POST /api/v1/admin/entitlements/refresh` — the owner panel's nudge after a
 * save (docs/OWNER-PANEL.md §3). Header `x-owner-key: <OWNER_SHARED_SECRET>`.
 *
 * It does not carry the document: it only makes the poller pull NOW instead
 * of at its next tick, so a new version is believed only after the same
 * signature / freshness / order checks as any poll. A caller holding the key
 * can therefore do no more than make the backend ask the owner panel early.
 *
 * Pulls are serialised and at most one a second: a call arriving while one
 * runs (or inside that second) waits for ONE follow-up pull that all such
 * callers share — never dropped, since two saves a moment apart must both go
 * live — so the route cannot be used to hammer the owner panel.
 *
 * Answer: `{ version, source, changed }` — never a secret.
 */
const MIN_GAP_MS = 1_000;

function keyMatches(given, secret) {
  if (!secret || typeof given !== 'string' || !given) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(String(secret)).digest();
  return crypto.timingSafeEqual(a, b);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = function publicRoutes(deps) {
  const router = Router();
  let running = null;
  let queued = null;
  let lastStart = 0;

  function pull(poller) {
    if (queued) return queued;
    const prior = running ?? Promise.resolve();
    queued = prior
      .catch(() => undefined)
      .then(async () => {
        const wait = lastStart + MIN_GAP_MS - Date.now();
        if (wait > 0) await sleep(wait);
        queued = null;
        lastStart = Date.now();
        const before = poller.current().version;
        running = poller
          .pollOnce()
          .then((now) => ({ version: now.version, source: now.source, changed: now.version !== before }))
          .finally(() => {
            running = null;
          });
        return running;
      });
    return queued;
  }

  router.post(
    '/refresh',
    noBody(),
    asyncHandler(async (req, res) => {
      const poller = deps.entitlementsPoller;
      if (!keyMatches(req.get('x-owner-key'), deps.config?.OWNER_SHARED_SECRET)) throw new UnauthorizedError('Bad owner key');
      if (!poller) throw new ServiceUnavailableError('Entitlements poller not running');
      return response.ok(res, await pull(poller));
    })
  );

  return router;
};
