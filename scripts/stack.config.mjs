/**
 * The one place this client's stack decides its site key, database and ports.
 * Read by scripts/make-env.mjs (writes the env files) and scripts/dev.mjs (runs everything).
 */
export const SITE_KEY = 'hash-game-exchange'
export const SITE_NAME = 'Parker567'
export const SITE_TEMPLATE = 'bcgame' // resolves to the catalogue template `emerald_dark`
export const DB_NAME = 'parker567'
export const TEST_DB_NAME = 'parker567_test'

export const PORTS = {
  gateway: 4700,
  user: 4701,
  admin: 4702,
  casino: 4703,
  sports: 4704,
  sportsWorker: 4705,
  userWorker: 4706,
  siteAdmin: 3080,
  ownerPanel: 3085,
  frontend: 5190
}

export const URLS = {
  gateway: `http://127.0.0.1:${PORTS.gateway}`,
  siteAdmin: `http://localhost:${PORTS.siteAdmin}`,
  ownerPanel: `http://127.0.0.1:${PORTS.ownerPanel}`,
  frontend: `http://localhost:${PORTS.frontend}`
}

/** Browser origins the gateway (CORS) and the socket servers must accept. */
export const BROWSER_ORIGINS = [PORTS.frontend, PORTS.siteAdmin, PORTS.ownerPanel].flatMap(p => [
  `http://localhost:${p}`,
  `http://127.0.0.1:${p}`
])
