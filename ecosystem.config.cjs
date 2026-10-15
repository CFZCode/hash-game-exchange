// pm2 layout for the live parker567 stack (hash-game-exchange).
//   parker567.com -> frontend :5190   api.parker567.com -> gateway :4700   admin.parker567.com -> admin :3080
// Owner panel :3085 stays on 127.0.0.1 (never proxied). Ports come from scripts/stack.config.mjs.
// Backend processes run with cwd = backend so packages/common/src/env.js finds backend/.env.
//   pm2 start ecosystem.config.cjs && pm2 save
const path = require('path');
const root = __dirname;
const backend = path.join(root, 'backend');
const base = {
  exec_mode: 'fork', instances: 1, autorestart: true, restart_delay: 5000,
  max_restarts: 20, watch: false, time: true,
};
const svc = (name, script) => ({ ...base, name: `parker-${name}`, script, cwd: backend });
const next = (name, dir, port, host = '0.0.0.0') => ({
  ...base, name: `parker-${name}`, cwd: path.join(root, dir),
  script: 'node_modules/next/dist/bin/next', args: `start -p ${port} -H ${host}`,
  env: { NODE_ENV: 'production' },
});

module.exports = {
  apps: [
    svc('user-svc', 'services/user/src/index.js'),
    svc('admin-svc', 'services/admin/src/index.js'),
    svc('casino-svc', 'services/casino/src/index.js'),
    svc('sports-svc', 'services/sports/src/index.js'),
    svc('sports-worker', 'services/sports/src/worker.js'),
    svc('user-worker', 'services/user/src/worker.js'),
    svc('gateway', 'gateway/src/index.js'),
    // Frontend not live yet: `cd frontend && npm run build`, then uncomment.
    // next('frontend', 'frontend', 5190, '127.0.0.1'),
    next('admin', 'admin', 3080, '127.0.0.1'),
    next('owner-panel', 'owner-panel', 3085, '127.0.0.1'),
  ],
};
