#!/usr/bin/env node
/**
 * The whitelabel setup script: runs the parent site's queued `whitelabel_jobs` (Whitelabel panel →
 * New / Delete), one at a time, on THIS machine — create (steps.mjs createWhitelabel) or delete
 * (removeWhitelabel). Progress and the log go to the job row, which the panel shows.
 *
 *   node scripts/whitelabel/worker.mjs          keep running (pm2: parker-whitelabel-worker)
 *   node scripts/whitelabel/worker.mjs --once   run the next queued job, if any, then exit
 *
 * Runs as root (it writes Apache sites, runs certbot, pm2, sudo -u postgres). It reads the
 * parent's backend/.env for its own database and secret box, and NEVER passes that environment
 * to what it runs: every command gets PATH / HOME / LANG only, so a copy's migrations and builds
 * read the copy's own files and can never reach the parent's database.
 */
import { spawn, execFileSync } from 'node:child_process';
import dns from 'node:dns';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WHITELABEL_ROOT, newSecrets, parseEnv } from './lib.mjs';
import { createWhitelabel, removeWhitelabel } from './steps.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const requireBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const pg = requireBackend('pg');
const { createSecretBox } = requireBackend('@ibitplay/auth');

const POLL_MS = 5_000;
const COMMAND_TIMEOUT_MS = 30 * 60_000;
const LOG_LIMIT = 200_000;
// `pm2 jlist` alone is ~1.5 MB on this machine (every app with its env) and grows with each copy.
const MAX_OUTPUT = 64 * 1024 * 1024;
const once = process.argv.includes('--once');

const readEnv = (file) => (fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {});
const parentEnv = readEnv(path.join(ROOT, 'backend', '.env'));
if (String(parentEnv.WHITELABEL_MODE).toLowerCase() === 'true') {
  console.error('This is a whitelabel copy: it does not create whitelabels of its own.');
  process.exit(1);
}

const childEnv = () => ({ PATH: process.env.PATH, HOME: process.env.HOME || '/root', LANG: 'C.UTF-8' });

function serverIp() {
  if (parentEnv.WHITELABEL_SERVER_IP) return parentEnv.WHITELABEL_SERVER_IP;
  const ip = execFileSync('hostname', ['-I'], { encoding: 'utf8' }).split(/\s+/).find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a));
  if (!ip) throw new Error('cannot tell this server’s IPv4 address — set WHITELABEL_SERVER_IP in backend/.env');
  return ip;
}

const tail = (text, n = 3_000) => (text.length > n ? `…${text.slice(-n)}` : text);

/** A program with arguments (no shell), its output collected; a failure carries the output's tail. */
function run(cmd, args, { cwd = ROOT, input, allowFail = false, timeoutMs = COMMAND_TIMEOUT_MS } = {}, log = () => {}) {
  log(`$ ${cmd} ${args.join(' ')}${cwd !== ROOT ? `   (in ${cwd})` : ''}`);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: childEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let tooBig = false;
    // Never cut output silently: a cut JSON list fails far from its cause.
    const keep = (s, chunk) => {
      if (s.length + chunk.length > MAX_OUTPUT) {
        tooBig = true;
        return s;
      }
      return s + chunk;
    };
    child.stdout.on('data', (c) => (stdout = keep(stdout, c)));
    child.stderr.on('data', (c) => (stderr = keep(stderr, c)));
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (tooBig) return reject(new Error(`${cmd} printed more than ${MAX_OUTPUT / 1024 / 1024} MB`));
      if (code !== 0 && !allowFail) return reject(new Error(`${cmd} failed (exit ${code})\n${tail(`${stderr}\n${stdout}`.trim())}`));
      return resolve({ code, stdout, stderr });
    });
    child.stdin.end(input ?? '');
  });
}

/** a | b | … (> file): each program on its own, the output piped, every exit code checked. */
function pipe(commands, { toFile, mode = 0o600 } = {}, log = () => {}) {
  log(`$ ${commands.map(([c, a]) => `${c} ${a.join(' ')}`).join(' | ')}${toFile ? ` > ${toFile}` : ''}`);
  const children = commands.map(([cmd, args, opts = {}]) => spawn(cmd, args, { cwd: opts.cwd ?? ROOT, env: childEnv(), stdio: ['pipe', 'pipe', 'pipe'] }));
  for (let i = 0; i < children.length - 1; i += 1) children[i].stdout.pipe(children[i + 1].stdin);
  children[0].stdin.end();
  const out = toFile ? fs.createWriteStream(toFile, { mode }) : null;
  if (out) children.at(-1).stdout.pipe(out);
  else children.at(-1).stdout.resume();
  return Promise.all(
    children.map(
      (child, i) =>
        new Promise((resolve, reject) => {
          let stderr = '';
          child.stderr.on('data', (c) => (stderr += c));
          child.on('error', reject);
          child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${commands[i][0]} failed (exit ${code})\n${tail(stderr)}`))));
        })
    ).concat(out ? [new Promise((resolve, reject) => out.on('finish', resolve).on('error', reject))] : [])
  );
}

const files = {
  exists: async (p) => fs.promises.access(p).then(() => true, () => false),
  read: (p) => fs.promises.readFile(p, 'utf8'),
  write: async (p, text, mode) => {
    await fs.promises.mkdir(path.dirname(p), { recursive: true });
    await fs.promises.writeFile(p, text, mode ? { mode } : undefined);
    if (mode) await fs.promises.chmod(p, mode);
  },
  mkdir: (p) => fs.promises.mkdir(p, { recursive: true }),
  rm: (p) => fs.promises.rm(p, { recursive: true, force: true }),
};

/** Every site's env file one level down (where this machine's sites keep REDIS_DB / REDIS_URL). */
async function envFiles() {
  const out = [];
  for (const entry of await fs.promises.readdir(WHITELABEL_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const rel of ['.env', 'backend/.env', 'server/.env', 'backend copy/.env']) {
      const p = path.join(WHITELABEL_ROOT, entry.name, rel);
      if (fs.existsSync(p)) out.push(p);
    }
  }
  return out;
}

async function httpOk(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(5_000) })).ok;
  } catch {
    return false;
  }
}

async function main() {
  const db = new pg.Client({
    host: parentEnv.DB_HOST || '127.0.0.1',
    port: Number(parentEnv.DB_PORT || 5432),
    database: parentEnv.DB_NAME,
    user: parentEnv.DB_USER,
    password: parentEnv.DB_PASSWORD,
  });
  await db.connect();
  const query = async (sql, params = []) => (await db.query(sql, params)).rows;
  const box = createSecretBox({ config: parentEnv, logger: null });

  // A job left `running` by a worker that died mid-way: failed, so the panel can run it again.
  const stale = await query(
    `UPDATE whitelabel_jobs SET status = 'failed', step = 'the setup script restarted mid-way', finished_at = NOW()
      WHERE status = 'running' RETURNING whitelabel_id`
  );
  for (const { whitelabel_id: id } of stale) await query(`UPDATE whitelabels SET status = 'failed', updated_at = NOW() WHERE id = $1`, [id]);

  for (;;) {
    const [job] = await query(
      `UPDATE whitelabel_jobs SET status = 'running', started_at = NOW(), step = 'Starting'
        WHERE id = (SELECT id FROM whitelabel_jobs WHERE status = 'queued' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING *`
    );
    if (job) await runJob(job, { query, box });
    else if (once) break;
    if (once && job) break;
    if (!job) await new Promise((r) => setTimeout(r, POLL_MS));
  }
  await db.end();
}

async function runJob(job, { query, box }) {
  const append = (line) =>
    query(`UPDATE whitelabel_jobs SET log = RIGHT(log || $2, ${LOG_LIMIT}) WHERE id = $1`, [job.id, `[${new Date().toISOString().slice(11, 19)}] ${line}\n`]).catch(() => {});
  const log = (line) => {
    console.log(`[job ${job.id}] ${line}`);
    return append(line);
  };
  const [wl] = await query(`SELECT * FROM whitelabels WHERE id = $1`, [job.whitelabel_id]);

  try {
    if (!wl) throw new Error(`whitelabel ${job.whitelabel_id} not found`);
    const ctx = makeCtx(job, wl, { query, box, log });
    if (job.kind === 'create') {
      await query(`UPDATE whitelabels SET status = 'creating', updated_at = NOW() WHERE id = $1`, [wl.id]);
      await createWhitelabel(ctx, wl);
    } else {
      await removeWhitelabel(ctx, wl, { archive: true });
      await query(`UPDATE whitelabels SET status = 'deleted', admin_port = NULL, company_password_hash = NULL, updated_at = NOW() WHERE id = $1`, [wl.id]);
    }
    await query(`UPDATE whitelabel_jobs SET status = 'done', step = 'Done', finished_at = NOW() WHERE id = $1`, [job.id]);
    await log('Done');
  } catch (error) {
    await log(`FAILED: ${error.message}`);
    await query(`UPDATE whitelabel_jobs SET status = 'failed', finished_at = NOW() WHERE id = $1`, [job.id]);
    if (wl) await query(`UPDATE whitelabels SET status = 'failed', updated_at = NOW() WHERE id = $1`, [wl.id]);
  }
}

function makeCtx(job, wl, { query, box, log }) {
  return {
    run: (cmd, args, opts) => run(cmd, args, opts, log),
    pipe: (commands, opts) => pipe(commands, opts, log),
    fs: files,
    resolve4: (domain) => dns.promises.resolve4(domain),
    serverIp: serverIp(),
    httpOk,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    envFiles,
    parent: { query },
    copyDb: async (conn) => {
      const client = new pg.Client(conn);
      await client.connect();
      return { query: async (sql, params) => (await client.query(sql, params)).rows, end: () => client.end() };
    },
    parentRoot: ROOT,
    parentEnv,
    parentFrontendEnv: readEnv(path.join(ROOT, 'frontend', '.env.local')),
    linkKey: box.open(wl.link_key),
    secrets: newSecrets(),
    log,
    step: (name) => {
      log(`── ${name}`);
      query(`UPDATE whitelabel_jobs SET step = $2 WHERE id = $1`, [job.id, name]).catch(() => {});
    },
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
