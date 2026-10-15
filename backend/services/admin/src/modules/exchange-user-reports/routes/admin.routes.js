'use strict';

const { Router } = require('express');
const { validate, response, asyncHandler } = require('@ibitplay/common');
const { PERMISSIONS } = require('@ibitplay/auth');

const v = require('../userReports.validators');
const { UserReportsService } = require('../userReports.service');

const actorFrom = (req) => ({ id: req.staff.id, level: req.staff.level });

/** limit/offset wali list → platform ka paginated response. */
const sendPage = (res, result, { limit, offset }) =>
  response.paginated(res, result.rows, { page: Math.floor(offset / limit) + 1, limit, total: result.total });

/**
 * Exchange user reports (zip msadmin) — sab GET, sirf padhna.
 *
 *   GET /admin/exchange/user-reports/home              Home dashboard (cards + charts)
 *   GET /admin/exchange/user-reports/login-history     User History → Login History
 *   GET /admin/exchange/user-reports/password-history  User History → Change Password History
 *   GET /admin/exchange/user-reports/ip-detail         User History → Ip Detail modal
 *   GET /admin/exchange/user-reports/auth-list         User Authentication
 *   GET /admin/exchange/user-reports/fraud             Fraud Report
 *   GET /admin/exchange/user-reports/register-detail   User Register Detail
 */
module.exports = function adminRoutes(deps) {
  const { auth } = deps;
  const service = new UserReportsService(deps);
  const router = Router();

  // Home: wallet dekhne ki koi bhi permission (exchange dashboard jaisa).
  const canSeeWallets = auth.requireAnyPermission(
    PERMISSIONS.WALLET_CREDIT, PERMISSIONS.WALLET_DEBIT, PERMISSIONS.WALLET_ADJUST, PERMISSIONS.USERS_READ
  );
  const canReadUsers = auth.requirePermission(PERMISSIONS.USERS_READ);

  router.get(
    '/home',
    canSeeWallets,
    validate(v.home),
    asyncHandler(async (req, res) => response.ok(res, await service.home({ actor: actorFrom(req) })))
  );

  router.get(
    '/login-history',
    canReadUsers,
    validate(v.history),
    asyncHandler(async (req, res) => sendPage(res, await service.loginHistory({ ...req.query, actor: actorFrom(req) }), req.query))
  );

  router.get(
    '/password-history',
    canReadUsers,
    validate(v.history),
    asyncHandler(async (req, res) => sendPage(res, await service.passwordHistory({ ...req.query, actor: actorFrom(req) }), req.query))
  );

  router.get(
    '/ip-detail',
    canReadUsers,
    validate(v.ipDetail),
    asyncHandler(async (req, res) => response.ok(res, await service.ipDetail({ ip: req.query.ip })))
  );

  router.get(
    '/auth-list',
    canReadUsers,
    validate(v.list),
    asyncHandler(async (req, res) => sendPage(res, await service.authList({ ...req.query, actor: actorFrom(req) }), req.query))
  );

  router.get(
    '/fraud',
    canReadUsers,
    validate(v.list),
    asyncHandler(async (req, res) => sendPage(res, await service.fraud(), req.query))
  );

  router.get(
    '/register-detail',
    canReadUsers,
    validate(v.registerDetail),
    asyncHandler(async (req, res) => sendPage(res, await service.registerDetail({ ...req.query, actor: actorFrom(req) }), req.query))
  );

  return router;
};
