'use strict';

/**
 * Withdrawal control — Admin → Users → Financial → Withdrawal ka "Global Withdrawals" switch
 * (reference admin `admin-structure.zip` → withdrawalControlRoutes.js `/global`).
 *
 *   GET /api/v1/admin/withdrawal-control          switch ki halat
 *   PUT /api/v1/admin/withdrawal-control/global   ON / OFF (sirf owner, transaction password)
 *
 * Table: `withdrawal_control` (migration 108). Rok-thaam: `@ibitplay/common` withdrawBlock —
 * OFF ho to har player ka har withdrawal raasta WITHDRAW_DISABLED deta hai.
 */
module.exports = {
  name: 'withdrawal-control',
  service: 'admin',
  basePath: '/withdrawal-control',
  models: ['admin', 'core', 'extended'],
  routers: {
    admin: require('./routes/admin.routes'),
  },
};
