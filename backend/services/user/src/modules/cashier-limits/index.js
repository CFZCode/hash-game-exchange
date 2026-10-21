'use strict';

/**
 * Cashier limits for the player's forms — `GET /api/v1/user/cashier-limits?currency=INR`: the
 * owner's deposit / withdraw min and max for that currency (packages/common/src/cashierLimits.js),
 * the same figures every deposit and withdrawal rail enforces, so a form can refuse an amount
 * before the player uploads proof. Each field a decimal string, or null = no limit.
 */
module.exports = {
  name: 'cashier-limits',
  service: 'user',
  basePath: '/cashier-limits',
  models: ['core'],
  routers: {
    user: require('./routes/user.routes'),
  },
};
