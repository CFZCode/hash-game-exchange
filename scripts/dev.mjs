#!/usr/bin/env node
/**
 * Run this client's whole stack locally: 7 backend processes, the site admin, the owner panel
 * and the frontend. Standalone: nothing here reads or starts anything in cfz/admins.
 *
 *   node scripts/dev.mjs start [name…]    start everything (or only the named processes), print URLs
 *   node scripts/dev.mjs stop  [name…]    stop what this script started (by pid file, whole process group)
 *   node scripts/dev.mjs restart [name…]
 *   node scripts/dev.mjs status           what is up, per port
 *   node scripts/dev.mjs logs <name>      tail -f one log
 *
 * Names: gateway user admin casino sports sports-worker user-worker site-admin owner-panel frontend
 * Logs:  logs/<name>.log      pids: .run/<name>.pid      (both gitignored)
 *
 * A port that is already taken by something this script did not start is reported and skipped,
 * never killed: other stacks on this machine (e.g. :4600, :4200) are not ours to stop.
 * First time: `npm ci` in backend/, admin/, owner-panel/ (and frontend/), then `node scripts/make-env.mjs`.
 */
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PORTS, URLS } from './stack.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOGS = path.join(ROOT, 'logs')
const RUN = path.join(ROOT, '.run')
const BE = path.join(ROOT, 'backend')

/**
 * A package's CLI run through node itself, not node_modules/.bin: on Windows .bin holds shell
 * shims (next, next.cmd) that spawn() cannot exec, while the JS entry runs the same everywhere.
 */
const CLI_ENTRY = { next: 'next/dist/bin/next', vite: 'vite/bin/vite.js' }
const nodeCli = (dir, name, args) => [process.execPath, [path.join(dir, 'node_modules', CLI_ENTRY[name]), ...args]]

/** How to start the frontend, decided at start time: it is being moved from Vite to Next.js. */
function frontendCommand() {
  const dir = path.join(ROOT, 'frontend')
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const dev = pkg.scripts?.dev ?? ''

  if (/\bnext\b/.test(dev)) return nodeCli(dir, 'next', ['dev', '-p', String(PORTS.frontend)])
  return nodeCli(dir, 'vite', ['--port', String(PORTS.frontend), '--strictPort'])
}

const PROCS = [
  { name: 'user', port: PORTS.user, cwd: path.join(BE, 'services/user'), cmd: () => [process.execPath, ['src/index.js']] },
  { name: 'admin', port: PORTS.admin, cwd: path.join(BE, 'services/admin'), cmd: () => [process.execPath, ['src/index.js']] },
  { name: 'casino', port: PORTS.casino, cwd: path.join(BE, 'services/casino'), cmd: () => [process.execPath, ['src/index.js']] },
  { name: 'sports', port: PORTS.sports, cwd: path.join(BE, 'services/sports'), cmd: () => [process.execPath, ['src/index.js']] },
  { name: 'sports-worker', port: PORTS.sportsWorker, cwd: path.join(BE, 'services/sports'), cmd: () => [process.execPath, ['src/worker.js']] },
  { name: 'user-worker', port: PORTS.userWorker, cwd: path.join(BE, 'services/user'), cmd: () => [process.execPath, ['src/worker.js']] },
  // Last of the backend: it probes the others on /health.
  { name: 'gateway', port: PORTS.gateway, cwd: path.join(BE, 'gateway'), cmd: () => [process.execPath, ['src/index.js']], after: 2000 },
  { name: 'site-admin', port: PORTS.siteAdmin, cwd: path.join(ROOT, 'admin'), cmd: () => nodeCli(path.join(ROOT, 'admin'), 'next', ['dev', '-p', String(PORTS.siteAdmin)]) },
  { name: 'owner-panel', port: PORTS.ownerPanel, cwd: path.join(ROOT, 'owner-panel'), cmd: () => nodeCli(path.join(ROOT, 'owner-panel'), 'next', ['dev', '-H', '127.0.0.1', '-p', String(PORTS.ownerPanel)]) },
  {
    name: 'frontend',
    port: PORTS.frontend,
    cwd: path.join(ROOT, 'frontend'),
    cmd: frontendCommand,
    optional: true,
    // Defaults for a bare checkout only: Next.js ranks process env above .env.local, so with a
    // .env.local present nothing is passed and its API base (e.g. the live API) is the one used.
    env: fs.existsSync(path.join(ROOT, 'frontend/.env.local')) ? {} : {
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? URLS.gateway,
      VITE_API_BASE: process.env.VITE_API_BASE ?? URLS.gateway,
      GATEWAY_URL: process.env.GATEWAY_URL ?? URLS.gateway
    }
  }
]

const pidFile = name => path.join(RUN, `${name}.pid`)
const readPid = name => {
  try {
    return Number(fs.readFileSync(pidFile(name), 'utf8').trim()) || null
  } catch {
    return null
  }
}
const alive = pid => {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
const portBusy = port =>
  new Promise(resolve => {
    const s = net.connect({ port, host: '127.0.0.1' })
    s.once('connect', () => (s.destroy(), resolve(true)))
    s.once('error', () => resolve(false))
  })
const sleep = ms => new Promise(r => setTimeout(r, ms))

function select(names) {
  if (!names.length) return PROCS
  const unknown = names.filter(n => !PROCS.some(p => p.name === n))
  if (unknown.length) {
    console.error(`unknown: ${unknown.join(', ')}. Names: ${PROCS.map(p => p.name).join(' ')}`)
    process.exit(2)
  }
  return PROCS.filter(p => names.includes(p.name))
}

async function start(names) {
  fs.mkdirSync(LOGS, { recursive: true })
  fs.mkdirSync(RUN, { recursive: true })
  for (const f of ['backend/.env', 'admin/.env.local', 'owner-panel/.env.local']) {
    if (!fs.existsSync(path.join(ROOT, f))) {
      console.error(`missing ${f} — run: node scripts/make-env.mjs`)
      process.exit(1)
    }
  }

  for (const p of select(names)) {
    if (alive(readPid(p.name))) {
      console.log(`  ${p.name.padEnd(13)} already running (pid ${readPid(p.name)})`)
      continue
    }
    if (await portBusy(p.port)) {
      console.log(`  ${p.name.padEnd(13)} SKIPPED: port ${p.port} is taken by another process (not started by this script)`)
      continue
    }
    const [cmd, args] = p.cmd()
    const entry = cmd === process.execPath ? path.resolve(p.cwd, args[0]) : cmd
    if (!fs.existsSync(entry)) {
      const msg = `  ${p.name.padEnd(13)} SKIPPED: ${path.relative(ROOT, entry)} not found (npm ci in ${path.relative(ROOT, p.cwd)})`
      if (p.optional) {
        console.log(msg)
        continue
      }
      console.error(msg)
      process.exit(1)
    }
    if (p.after) await sleep(p.after)
    const env = { ...process.env, LOG_PRETTY: 'false', ...(p.env ?? {}) }
    const pid = process.platform === 'win32' ? startHiddenWindows(p, cmd, args, env) : startDetached(p, cmd, args, env)
    fs.writeFileSync(pidFile(p.name), String(pid))
    console.log(`  ${p.name.padEnd(13)} started (pid ${pid}, :${p.port}) → logs/${p.name}.log`)
  }

  await waitHealthy()
  printUrls()
}

/** Own process group, so stop takes next's children down too. */
function startDetached(p, cmd, args, env) {
  const out = fs.openSync(path.join(LOGS, `${p.name}.log`), 'a')
  const child = spawn(cmd, args, { cwd: p.cwd, env, stdio: ['ignore', out, out], detached: true })
  child.unref()
  return child.pid
}

/**
 * Windows: neither spawn mode works. A non-detached child sits in node's kill-on-close job and
 * dies when this script exits; a detached one has no console, so every process it starts
 * (next's workers) opens a visible window. Start-Process -WindowStyle Hidden gives the server
 * its own hidden console, which its children share, outside this script's job.
 * stdout and stderr go to separate files (Start-Process cannot merge them).
 */
function startHiddenWindows(p, cmd, args, env) {
  const q = s => `'${String(s).replace(/'/g, "''")}'`
  const quoteArg = a => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)
  const script = [
    `$p = Start-Process -FilePath ${q(cmd)}`,
    `-ArgumentList ${q(args.map(quoteArg).join(' '))}`,
    `-WorkingDirectory ${q(p.cwd)} -WindowStyle Hidden -PassThru`,
    `-RedirectStandardOutput ${q(path.join(LOGS, `${p.name}.log`))}`,
    `-RedirectStandardError ${q(path.join(LOGS, `${p.name}.err.log`))};`,
    `Set-Content -Path ${q(pidFile(p.name))} -Value $p.Id -NoNewline`
  ].join(' ')
  // No stdout pipe: the server would inherit it and execFileSync would wait for it forever.
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env, stdio: 'ignore', windowsHide: true })
  return readPid(p.name)
}

async function waitHealthy() {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${URLS.gateway}/health`)
      if (r.ok) {
        console.log(`\n  gateway /health: ${r.status} ok`)
        return
      }
    } catch {}
    await sleep(1000)
  }
  console.log('\n  gateway /health did not answer ok within 60 s — check logs/*.log')
}

async function stop(names) {
  for (const p of select(names).reverse()) {
    const pid = readPid(p.name)
    if (!alive(pid)) {
      fs.rmSync(pidFile(p.name), { force: true })
      continue
    }
    if (process.platform === 'win32') {
      // No process groups on Windows: kill the whole tree, or next's workers keep the port.
      try {
        execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
      } catch {}
    } else try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      try {
        process.kill(pid, 'SIGTERM')
      } catch {}
    }
    for (let i = 0; i < 50 && alive(pid); i++) await sleep(100)
    if (alive(pid)) {
      try {
        process.kill(-pid, 'SIGKILL')
      } catch {}
    }
    fs.rmSync(pidFile(p.name), { force: true })
    console.log(`  ${p.name.padEnd(13)} stopped`)
  }
}

async function status() {
  for (const p of PROCS) {
    const pid = readPid(p.name)
    const ours = alive(pid)
    const busy = await portBusy(p.port)
    console.log(`  ${p.name.padEnd(13)} :${p.port}  ${busy ? 'UP  ' : 'down'}  ${ours ? `pid ${pid}` : busy ? '(not started by this script)' : ''}`)
  }
  try {
    const r = await fetch(`${URLS.gateway}/health`)
    console.log(`\n  gateway /health: ${r.status}`)
  } catch {
    console.log('\n  gateway /health: unreachable')
  }
}

function printUrls() {
  console.log(`
  Gateway       ${URLS.gateway}   (/health, /api/v1/*)
  Site admin    ${URLS.siteAdmin}
  Owner panel   ${URLS.ownerPanel}
  Frontend      ${URLS.frontend}

  Stop: ./run.sh stop     Status: ./run.sh status     Logs: ./run.sh logs <name>`)
}

const [command = 'start', ...rest] = process.argv.slice(2)
if (command === 'start') await start(rest)
else if (command === 'stop') await stop(rest)
else if (command === 'restart') {
  await stop(rest)
  await start(rest)
} else if (command === 'status') await status()
else if (command === 'logs') {
  if (!rest[0]) (console.error('usage: logs <name>'), process.exit(2))
  execFileSync('tail', ['-n', '100', '-f', path.join(LOGS, `${rest[0]}.log`)], { stdio: 'inherit' })
} else {
  console.error('usage: node scripts/dev.mjs start|stop|restart|status|logs [name…]')
  process.exit(2)
}
