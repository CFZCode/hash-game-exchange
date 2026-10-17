'use strict';

const { Router } = require('express');
const { validate, response, asyncHandler, createActivityRecorder, z } = require('@ibitplay/common');
const { PERMISSIONS, canIssueFunds } = require('@ibitplay/auth');

const { WithdrawalControlService } = require('../withdrawalControl.service');

const password = z.string().min(1).max(200);

const v = {
  setGlobal: { body: z.object({ enabled: z.boolean(), transactionPassword: password }).strict() },
  users: {
    query: z
      .object({
        search: z.string().trim().min(1).max(80).optional(),
        status: z.enum(['all', 'locked']).default('all'),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .strict(),
  },
};

/**
 *   GET /admin/withdrawal-control          summary (global, limit, wagering bonus, ginti)   reports:read
 *   GET /admin/withdrawal-control/users    direct users: balance, deposited, wagered, withdrawn / max, lock
 *   PUT /admin/withdrawal-control/global   ON / OFF                                          owner + txn password
 * Limit / wagering bonus: owner panel only (GET me read-only `limit`, `source: 'owner'`).
 * Per-user lock: purana `POST admin/locks` (users:write).
 */
module.exports = function adminRoutes(deps) {
  const { auth, clients, logger, config } = deps;
  const service = new WithdrawalControlService(deps);
  const router = Router();
  const withActivity = createActivityRecorder({ client: clients.admin, logger, serviceName: config.SERVICE_NAME });
  const actorOf = (req) => ({ id: req.staff.id, canIssueFunds: canIssueFunds(req.staff) });
  const canRead = auth.requirePermission(PERMISSIONS.REPORTS_READ);

  router.get('/', canRead, asyncHandler(async (_req, res) => response.ok(res, await service.read())));

  router.get(
    '/users',
    canRead,
    validate(v.users),
    asyncHandler(async (req, res) => {
      const result = await service.users(req.query);
      const page = Math.floor(req.query.offset / req.query.limit) + 1;
      return response.paginated(res, result.rows, { page, limit: req.query.limit, total: result.total });
    })
  );

  router.put(
    '/global',
    auth.requirePermission(PERMISSIONS.WALLET_ADJUST),
    validate(v.setGlobal),
    withActivity({
      action: 'withdrawals.global',
      describe: (req) => ({ targetType: 'SITE', targetId: 'withdrawals', details: { enabled: req.body.enabled } }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(res, await service.setGlobal({ actor: actorOf(req), ...req.body }))
    )
  );

  return router;
};
