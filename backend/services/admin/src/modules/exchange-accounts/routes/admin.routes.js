'use strict';

const { Router } = require('express');
const { validate, response, asyncHandler, createActivityRecorder } = require('@ibitplay/common');
const { PERMISSIONS, canIssueFunds, effectiveStaffLevel, hasPermission } = require('@ibitplay/auth');

const v = require('../exchangeAccounts.validators');
const { CreateAccountService } = require('../createAccount');
const { MultiLoginService } = require('../multiLogin');
const { userCreationCsv } = require('../userCreationCsv');

/** StaffService wala actor (staff/controllers ka actorFrom jaisa). */
const staffActorFrom = (req) => {
  const level = effectiveStaffLevel(req.staff);
  return {
    id: req.staff.id,
    level: Number.isFinite(level) ? level : null,
    executiveId: req.staff.executiveId ?? null,
    permissions: req.staff.permissions,
    canIssueFunds: canIssueFunds(req.staff),
    canAdjustWallets: hasPermission(req.staff.permissions, PERMISSIONS.WALLET_ADJUST),
    canCredit: hasPermission(req.staff.permissions, PERMISSIONS.WALLET_CREDIT),
    canDebit: hasPermission(req.staff.permissions, PERMISSIONS.WALLET_DEBIT),
  };
};

/**
 * Sports Exchange — Account wale screens (zip msadmin):
 *
 *   GET    /check-username                 Create Account: naam khali hai?
 *   POST   /create                         Create Account
 *   GET    /multi-login                    Multi Login: executives ki list
 *   POST   /multi-login                    naya executive
 *   PUT    /multi-login/:executiveId       privileges
 *   PATCH  /multi-login/:executiveId/active  On / Off
 *   POST   /multi-login/:executiveId/password
 *   DELETE /multi-login/:executiveId
 *   GET    /user-creation.csv?from&to      Assign Agent: User Creation CSV
 */
module.exports = function adminRoutes(deps) {
  const { auth, clients, logger, config } = deps;
  const accounts = new CreateAccountService(deps);
  const multiLogin = new MultiLoginService(deps);
  const router = Router();

  const withActivity = createActivityRecorder({ client: clients.admin, logger, serviceName: config.SERVICE_NAME });
  const audit = (action, describe) => withActivity({ action, describe });

  const canCreate = auth.requireAnyPermission(PERMISSIONS.USERS_WRITE, PERMISSIONS.STAFF_WRITE);
  const canGrantExecutive = auth.requireAnyPermission(PERMISSIONS.ROLES_MANAGE, PERMISSIONS.STAFF_WRITE);
  const ok = (fn) => asyncHandler(async (req, res) => response.ok(res, await fn(req, res)));

  // ── Create Account ──────────────────────────────────────────────────
  router.get('/check-username', canCreate, validate(v.checkUsername), ok((req) => accounts.checkUsername(req.query.username)));

  router.post(
    '/create',
    canCreate,
    validate(v.createAccount),
    audit('exchange.account.create', (req) => ({
      targetType: req.body.userType === 'USER' ? 'USER' : 'STAFF',
      details: { username: req.body.username, userType: req.body.userType, creditAmount: req.body.creditAmount ?? '0' },
    })),
    asyncHandler(async (req, res) =>
      response.created(res, await accounts.create({ ...req.body, staffActor: staffActorFrom(req), playerActor: req.staff }))
    )
  );

  // ── Multi Login ─────────────────────────────────────────────────────
  router.get('/multi-login', auth.requirePermission(PERMISSIONS.STAFF_READ), ok((req) => multiLogin.list({ actor: req.staff })));

  router.post(
    '/multi-login',
    canGrantExecutive,
    validate(v.createExecutive),
    audit('executive.create', (req) => ({ targetType: 'EXECUTIVE', details: { username: req.body.username, privileges: req.body.permissions } })),
    ok((req) => multiLogin.create({ ...req.body, actor: req.staff }))
  );

  router.put(
    '/multi-login/:executiveId',
    canGrantExecutive,
    validate(v.updateExecutive),
    audit('executive.update', (req) => ({ targetType: 'EXECUTIVE', targetId: req.params.executiveId, details: { privileges: req.body.permissions } })),
    ok((req) => multiLogin.updatePrivileges({ actor: req.staff, executiveId: req.params.executiveId, permissions: req.body.permissions }))
  );

  router.patch(
    '/multi-login/:executiveId/active',
    canGrantExecutive,
    validate(v.executiveActive),
    audit('executive.status', (req) => ({ targetType: 'EXECUTIVE', targetId: req.params.executiveId, details: { active: req.body.active ?? 'toggle' } })),
    ok((req) => multiLogin.setActive({ actor: req.staff, executiveId: req.params.executiveId, active: req.body.active }))
  );

  router.post(
    '/multi-login/:executiveId/password',
    canGrantExecutive,
    validate(v.executivePassword),
    audit('executive.password.reset', (req) => ({ targetType: 'EXECUTIVE', targetId: req.params.executiveId })),
    ok((req) => multiLogin.changePassword({ actor: req.staff, executiveId: req.params.executiveId, password: req.body.password }))
  );

  router.delete(
    '/multi-login/:executiveId',
    canGrantExecutive,
    validate(v.executiveParam),
    audit('executive.delete', (req) => ({ targetType: 'EXECUTIVE', targetId: req.params.executiveId })),
    ok((req) => multiLogin.remove({ actor: req.staff, executiveId: req.params.executiveId }))
  );

  // ── Assign Agent: User Creation CSV ─────────────────────────────────
  router.get(
    '/user-creation.csv',
    auth.requirePermission(PERMISSIONS.USERS_READ),
    validate(v.userCreationCsv),
    asyncHandler(async (req, res) => {
      const { filename, csv } = await userCreationCsv(deps, { actor: staffActorFrom(req), from: req.query.from, to: req.query.to });
      res.setHeader('content-type', 'text/csv; charset=utf-8');
      res.setHeader('content-disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    })
  );

  // System Tracker ab sirf owner panel me — module `owner-system-tracker` (x-owner-key).

  return router;
};
