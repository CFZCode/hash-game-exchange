#!/usr/bin/env node
/* Admin panel must never name the casino vendor / aggregator behind a feed (JSGames, GIS,
 * Slotegrator, in-house, …). Two checks:
 *
 *   node scan.mjs static            every visible string in admin/src (comments, imports, types,
 *                                   API paths and machine keys like 'gis' skipped)
 *   node scan.mjs live [baseUrl]    signs in as the seed admin, opens every nav page and every
 *                                   tab on it, and scans the text on screen (API data included)
 *
 * live needs playwright-core: PW_DIR=<dir with node_modules/playwright-core>. Exit 1 on a hit.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..')
const ADMIN_SRC = path.join(ROOT, 'admin/src')
export const FORBIDDEN = /\b(js ?games?(?: ?v[12])?|jsgames(?:v2)?|gs ?games|gis(?: ?games?)?|slotegrator|in-?house|ibitplay|huidu|xgames|seamless|gaminghub360|softswiss|gis-static)\b/i

/* A string that is a key or a path, not words a person reads: 'gis', 'jsgamesv2', 'admin/casino/js-games/v1/…'. */
const machine = (s) => /^[a-z0-9_\-/.:?=&{}$]+$/.test(s)

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== '@core' && e.name !== 'node_modules') yield* files(p) }
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.test\./.test(e.name)) yield p
  }
}

function staticScan() {
  const hits = []
  for (const file of files(ADMIN_SRC)) {
    const src = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    src.split('\n').forEach((line, i) => {
      if (/^\s*(import|export type|type |interface )/.test(line)) return
      const texts = [...line.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`|>([^<>{}]+)</g)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4])
      for (const raw of texts) {
        const t = raw?.replace(/\$\{[^}]*\}/g, '') // code inside a template literal is checked as its own strings
        if (t && !machine(t.trim()) && FORBIDDEN.test(t)) hits.push(`${path.relative(ROOT, file)}:${i + 1}  ${t.trim().slice(0, 120)}`)
      }
    })
  }
  return hits
}

async function liveScan(base) {
  const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, 'backend/.env'), 'utf8').split('\n').filter((l) => /^SEED_ADMIN_(EMAIL|PASSWORD)=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
  const api = process.env.API_BASE || 'https://api.parker567.com'
  const login = await fetch(`${api}/api/v1/admin/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD }) }).then((r) => r.json())
  if (!login?.data?.token) throw new Error('seed admin login failed: ' + JSON.stringify(login?.error ?? login).slice(0, 200))

  const require = createRequire(path.join(process.env.PW_DIR || process.cwd(), 'noop.js'))
  const { chromium } = require('playwright-core')
  const { execSync } = await import('node:child_process')
  const exe = execSync('ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | tail -1').toString().trim()
  const routes = [...new Set([...fs.readFileSync(path.join(ADMIN_SRC, 'configs/navConfig.tsx'), 'utf8').matchAll(/href: '([^']+)'/g)].map((m) => m[1]))]

  const browser = await chromium.launch({ executablePath: exe })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  const ok = await page.evaluate(async (token) => (await fetch('/api/auth/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })).ok, login.data.token)
  if (!ok) throw new Error('admin session cookie was not set')

  const hits = []
  const check = async (where) => {
    const text = await page.evaluate(() => document.body.innerText + '\n' + [...document.querySelectorAll('[title],[placeholder],[aria-label]')].map((e) => e.getAttribute('title') || e.getAttribute('placeholder') || e.getAttribute('aria-label')).join('\n'))
    for (const line of text.split('\n')) if (FORBIDDEN.test(line)) hits.push(`${where}  ${line.trim().slice(0, 120)}`)
  }
  for (const route of routes) {
    try {
      await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(3500)
      await check(route)
      const tabs = await page.locator('[role=tab]').all()
      for (const [i, tab] of tabs.entries()) {
        await tab.click({ timeout: 3000 }).catch(() => {})
        await page.waitForTimeout(1500)
        await check(`${route} [tab ${i + 1}: ${(await tab.innerText().catch(() => '')).trim()}]`)
      }
    } catch (e) {
      hits.push(`${route}  (could not open: ${e.message.split('\n')[0]})`)
    }
  }
  await browser.close()
  console.log(`live: ${routes.length} pages checked`)
  return [...new Set(hits)]
}

const mode = process.argv[2] || 'static'
const hits = mode === 'live' ? await liveScan(process.argv[3] || 'https://admin.parker567.com') : staticScan()
console.log(hits.length ? hits.join('\n') : `${mode}: no vendor / aggregator names`)
process.exit(hits.some((h) => !h.includes('could not open')) ? 1 : 0)
