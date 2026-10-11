'use strict';

/**
 * Entitlements — what the platform owner allows this site, pulled from the
 * owner panel by `entitlements.poller.js` and kept in a file, never a table.
 * See docs/OWNER-PANEL.md.
 */
module.exports = {
  name: 'entitlements',
  service: 'admin',
  basePath: '/entitlements',
  models: [],
  routers: {
    public: require('./routes/public.routes'),
    admin: require('./routes/admin.routes'),
    internal: require('./routes/internal.routes'),
  },
};
