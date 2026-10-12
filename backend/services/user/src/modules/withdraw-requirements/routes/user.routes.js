'use strict';

const { Router } = require('express');
const { response, asyncHandler, noQuery } = require('@ibitplay/common');
const { denyAgentPlayer } = require('@ibitplay/auth');

const { createWithdrawRequirements } = require('../withdrawRequirements');

/**
 * `GET /api/v1/user/withdrawals/requirements` — what this site requires before a withdrawal,
 * and what the caller is still missing. Shape: `withdrawRequirements.evaluate`.
 *
 * Agent-tree players have no withdrawal rail: 403 WITHDRAW_NOT_FOR_AGENT_USERS, as every rail.
 * No query (strict: `?x=` is a 422), no cache.
 */
module.exports = function userRoutes(deps) {
  const requirements = createWithdrawRequirements(deps);
  const router = Router();

  router.get(
    '/',
    denyAgentPlayer('withdraw'),
    noQuery(),
    asyncHandler(async (req, res) => {
      res.set('cache-control', 'no-store');
      return response.ok(res, await requirements.evaluate(req.user.id));
    })
  );

  return router;
};
