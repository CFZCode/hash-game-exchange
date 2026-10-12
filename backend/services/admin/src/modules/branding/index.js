'use strict';

/**
 * branding — the site's name, page metadata and logo files, set by the platform owner in the
 * owner panel (entitlement document `branding`, docs/OWNER-PANEL.md §8). Images are fetched
 * once per content hash into `backend/data/branding/` (branding.store.js), never a table.
 *
 *   GET /api/v1/admin/branding/public        anyone: the block, with image URLs
 *   GET /api/v1/admin/branding/asset/:file   anyone: an image, immutable
 *   GET /api/v1/admin/branding               staff (config:read): read-only, managedBy
 */
module.exports = {
  name: 'branding',
  service: 'admin',
  basePath: '/branding',
  models: [],
  routers: {
    public: require('./routes/public.routes'),
    admin: require('./routes/admin.routes'),
  },
};
