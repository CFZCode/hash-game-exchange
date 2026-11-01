#!/usr/bin/env node
/**
 * Copy the parent's game catalogues into a live whitelabel copy (catalogue.mjs) — for a copy set
 * up before setup did this itself, or after the parent's catalogue changed.
 *
 *   node scripts/whitelabel/sync-catalogue.mjs <slug>
 *
 * Reads the parent's backend/.env and the copy's /var/www/main/<slug>/backend/.env for the two
 * databases. Adds what the copy is missing; never changes or removes a row it already has.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyCatalogue } from './catalogue.mjs';
import { WHITELABEL_ROOT, assertSlug, parseEnv } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pg = createRequire(path.join(ROOT, 'backend', 'package.json'))('pg');

const slug = process.argv[2];
assertSlug(slug);
const envOf = (file) => parseEnv(fs.readFileSync(file, 'utf8'));
const parentEnv = envOf(path.join(ROOT, 'backend', '.env'));
const copyEnv = envOf(path.join(WHITELABEL_ROOT, slug, 'backend', '.env'));
if (String(copyEnv.WHITELABEL_MODE).toLowerCase() !== 'true') throw new Error(`${slug} is not a whitelabel copy`);

const connect = async (env) => {
  const client = new pg.Client({ host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 5432), database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD });
  await client.connect();
  return { query: async (sql, params) => (await client.query(sql, params)).rows, end: () => client.end() };
};

const parent = await connect(parentEnv);
const copy = await connect(copyEnv);
try {
  await copyCatalogue(parent, copy, console.log);
} finally {
  await parent.end();
  await copy.end();
}
