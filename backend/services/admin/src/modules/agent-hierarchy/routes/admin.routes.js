'use strict';

const { Router } = require('express');
const { response, asyncHandler } = require('@ibitplay/common');
const { PERMISSIONS } = require('@ibitplay/auth');

const { AgentHierarchyService } = require('../agentHierarchy.service');

/** GET /admin/agent-hierarchy — upline + main + downline staff (users ki ginti ke saath). users:read ya staff:read. */
module.exports = function adminRoutes(deps) {
  const { auth } = deps;
  const service = new AgentHierarchyService(deps);
  const router = Router();

  router.get(
    '/',
    auth.requireAnyPermission(PERMISSIONS.USERS_READ, PERMISSIONS.STAFF_READ),
    asyncHandler(async (req, res) => response.ok(res, await service.tree({ actor: { id: req.staff.id, level: req.staff.level } })))
  );

  return router;
};
