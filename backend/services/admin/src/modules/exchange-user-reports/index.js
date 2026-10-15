'use strict';

/**
 * Exchange user reports — zip (msadmin) ke Home dashboard aur user reports:
 *   Home (dashboard cards + charts), User History (login / password), Ip Detail,
 *   User Authentication, Fraud Report, User Register Detail.
 *
 * Sab sirf padhte hain. Balance `credits` table se, hierarchy `staff` / `users` se.
 */
module.exports = {
  name: 'exchange-user-reports',
  service: 'admin',
  basePath: '/exchange/user-reports',
  models: ['admin', 'core', 'extended'],
  routers: {
    admin: require('./routes/admin.routes'),
  },
};
