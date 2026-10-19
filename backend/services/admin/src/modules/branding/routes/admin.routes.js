'use strict';

const { Router } = require('express');
const { validate, response, asyncHandler } = require('@ibitplay/common');
const { PERMISSIONS } = require('@ibitplay/auth');

const v = require('../branding.validators');
const { brandingStore } = require('../branding.store');

/**
 * `GET /api/v1/admin/branding` (config:read) — the site admin's read-only view: the same block
 * players get, plus `managedBy: 'owner'` (null when no owner panel manages this site). There is
 * no write route: branding is set in the owner panel only.
 */
module.exports = function adminRoutes(deps) {
  const { auth } = deps;
  const store = deps.brandingStore ?? brandingStore(deps);
  const router = Router();

  router.get(
    '/',
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    validate({ query: v.emptyQuery }),
    asyncHandler(async (_req, res) => {
      const current = deps.entitlementsStore?.current() ?? {};
      return response.ok(res, {
        ...store.view(current.branding ?? null, current.version ?? 0),
        managedBy: deps.config.OWNER_SHARED_SECRET ? 'owner' : null,
        source: current.source ?? 'default',
      });
    })
  );

  return router;
};
