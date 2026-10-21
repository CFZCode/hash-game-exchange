'use strict';

const { Router } = require('express');
const { response, asyncHandler, validate, z, cashierLimits } = require('@ibitplay/common');

const read = {
  query: z.object({ currency: z.string().trim().min(2).max(16) }).strict(),
};

/** `{ currency, depositMin, depositMax, withdrawMin, withdrawMax }` — see ../index.js. */
module.exports = function userRoutes(deps) {
  const router = Router();
  const sequelize = deps.models?.Users?.sequelize ?? deps.db?.sequelize;

  router.get(
    '/',
    validate(read),
    asyncHandler(async (req, res) => {
      res.set('cache-control', 'no-store');
      const all = await cashierLimits.readCashierLimits(sequelize);
      const currency = cashierLimits.codeOf(req.query.currency);
      return response.ok(res, { currency, ...cashierLimits.limitsFor(all, currency) });
    })
  );

  return router;
};
