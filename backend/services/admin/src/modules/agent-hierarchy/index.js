'use strict';

/**
 * Agent hierarchy — Agent System → Hierarchy tab (admin-structure.zip `PercentageHierarchyPage` jaisa,
 * bina percentage ke).
 *
 *   GET /api/v1/admin/agent-hierarchy   upline + main + downline staff, har node pe users ki ginti
 */
module.exports = {
  name: 'agent-hierarchy',
  service: 'admin',
  basePath: '/agent-hierarchy',
  models: ['admin', 'core', 'extended'],
  routers: {
    admin: require('./routes/admin.routes'),
  },
};
