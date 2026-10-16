#!/usr/bin/env node
/**
 * Point the site admin and the owner panel on this Mac at the live backend, or back at the local one.
 * The owner panel's login stays local (OWNER_USERNAME / OWNER_PASSWORD in its .env.local).
 * Rewrites only the URL keys in admin/.env.local and owner-panel/.env.local; every other key
 * (secrets, session settings) is left as it is. The first run keeps a copy of each file in
 * <file>.bak-local.
 *
 *   node scripts/env-target.mjs live      admin + owner panel → https://api.parker567.com
 *   node scripts/env-target.mjs local     back to the local gateway (http://127.0.0.1:4700)
 *   node scripts/env-target.mjs status    print what each file points at
 *
 * Restart the two apps afterwards (Next reads .env.local at start):
 *   node scripts/dev.mjs restart site-admin owner-panel
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { URLS } from './stack.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const LIVE = {
  api: process.env.LIVE_API ?? 'https://api.parker567.com',
  admin: process.env.LIVE_ADMIN ?? 'https://admin.parker567.com',
  // The frontend is not live yet (parker567.com answers 503); ./live.sh runs it here on :5190.
  frontend: process.env.LIVE_FRONTEND ?? URLS.frontend
}

const TARGETS = {
  live: {
    'admin/.env.local': { API_URL: LIVE.api, NEXT_PUBLIC_ENV_LABEL: 'live' },
    'owner-panel/.env.local': {
      SITE_GATEWAY_URL: LIVE.api,
      SITE_ADMIN_URL: LIVE.admin,
      SITE_FRONTEND_URL: LIVE.frontend,
      NEXT_PUBLIC_ENV_LABEL: 'live'
    }
  },
  local: {
    'admin/.env.local': { API_URL: URLS.gateway, NEXT_PUBLIC_ENV_LABEL: 'localhost' },
    'owner-panel/.env.local': {
      SITE_GATEWAY_URL: URLS.gateway,
      SITE_ADMIN_URL: URLS.siteAdmin,
      SITE_FRONTEND_URL: URLS.frontend,
      NEXT_PUBLIC_ENV_LABEL: 'localhost'
    }
  }
}

const KEYS = [...new Set(Object.values(TARGETS.live).flatMap(Object.keys))]

function setKeys(text, values) {
  const lines = text.split('\n')
  for (const [key, value] of Object.entries(values)) {
    const i = lines.findIndex(l => l.startsWith(`${key}=`))
    if (i >= 0) lines[i] = `${key}=${value}`
    else lines.splice(lines.at(-1) === '' ? lines.length - 1 : lines.length, 0, `${key}=${value}`)
  }
  return lines.join('\n')
}

function status() {
  for (const rel of Object.keys(TARGETS.live)) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8')
    console.log(rel)
    for (const line of text.split('\n')) if (KEYS.some(k => line.startsWith(`${k}=`))) console.log(`  ${line}`)
  }
}

const mode = process.argv[2] ?? 'status'

if (mode === 'status') {
  status()
} else if (TARGETS[mode]) {
  for (const [rel, values] of Object.entries(TARGETS[mode])) {
    const file = path.join(ROOT, rel)
    if (!fs.existsSync(file)) {
      console.error(`missing ${rel} — run: node scripts/make-env.mjs`)
      process.exit(1)
    }
    const backup = `${file}.bak-local`
    if (!fs.existsSync(backup)) fs.copyFileSync(file, backup)
    fs.writeFileSync(file, setKeys(fs.readFileSync(file, 'utf8'), values))
  }
  console.log(`admin + owner panel → ${mode}`)
  status()
  console.log('\nRestart them: node scripts/dev.mjs restart site-admin owner-panel')
} else {
  console.error('usage: node scripts/env-target.mjs live|local|status')
  process.exit(2)
}
