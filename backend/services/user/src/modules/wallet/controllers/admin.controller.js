'use strict';

const { response, asyncHandler } = require('@ibitplay/common');
const { isAgentTree } = require('@ibitplay/auth');

/** Staff wallet operations. */
function createAdminController({ service }) {
  return {
    /**
     * @legacy POST /updatebalance
     * @legacy POST /adminwalletadd
     */
    adjust: asyncHandler(async (req, res) => {
      await service.assertPlayerVisible(req.staff.id, req.body.userId);

      /**
       * Agent-tree staff (levels 4–6 and their executives) never create money:
       * their adjust is a TRANSFER between their own float and the player,
       * made atomically by admin-service, which owns the float. House staff
       * (1–3) keep the operator adjustment — behind their transaction password
       * once they have set one. See `WalletService.agentAdjust`.
       */
      if (isAgentTree(req.staff)) {
        return response.ok(res, await service.agentAdjust(req.body, { staffId: req.staff.id }));
      }

      await service.checkTransactionPassword(req.staff.id, req.body.transactionPassword, { required: false });
      const result = await service.adminAdjust(req.body, {
        staffId: req.staff.id,
        sourceService: 'admin-ui',
      });

      // `previousBalance`/`newBalance` are additive — the legacy admin UI had
      // to re-fetch the wallet after every adjustment to show the result.
      return response.ok(res, result);
    }),

    balances: asyncHandler(async (req, res) => {
      await service.assertPlayerVisible(req.staff.id, req.params.userId);
      const balances = await service.getBalances(req.params.userId);
      return response.ok(res, { userId: req.params.userId, balances });
    }),

    /** @legacy GET /getwallet */
    list: asyncHandler(async (req, res) => {
      const { search, limit, offset } = req.query;
      const result = await service.listBalances({
        staffId: req.staff.id,
        search,
        limit,
        offset,
      });

      return response.paginated(res, result.rows, {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: result.total,
      });
    }),

    /** @legacy GET /wallethistory/:uid */
    history: asyncHandler(async (req, res) => {
      await service.assertPlayerVisible(req.staff.id, req.params.userId);
      const { limit, offset, currency } = req.query;
      const result = await service.listHistory({
        userId: req.params.userId, currency, limit, offset,
      });
      return res.json({ history: result.rows, count: result.count });
    }),

    reconcile: asyncHandler(async (req, res) => {
      await service.assertPlayerVisible(req.staff.id, req.params.userId);
      // A currency: that one report, as before. None: every currency the wallet has.
      const result = req.query.currency
        ? await service.reconcile({ userId: req.params.userId, currency: req.query.currency })
        : await service.reconcileAll({ userId: req.params.userId });
      return response.ok(res, result);
    }),
  };
}

module.exports = { createAdminController };
