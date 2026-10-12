'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { findRepoRoot } = require('@ibitplay/common');

const { SLOTS, ASSET_FILE_RE, CONTENT_TYPES, imageProblem } = require('./branding.rules');
const { transportRefusal } = require('../entitlements/entitlements.poller');

/**
 * The branding images, kept in `backend/data/branding/<sha256>.<ext>` (a folder, never a table:
 * the owner's data stays out of the site database, docs/OWNER-PANEL.md §8).
 *
 * The signed entitlement document names each image by the SHA-256 of its bytes. On a new
 * version (and at boot) every named image that is not here yet is fetched from the owner panel
 * (`GET <OWNER_PANEL_URL>/api/branding/asset/<file>`, `x-owner-key`, same https-unless-this-host
 * rule as the poll) and kept only when its bytes hash to its name and pass the image checks.
 * So the key alone can never plant an image: the document's signature vouches for the hash.
 * Files are immutable (same name = same bytes), which is what lets the gateway serve them with
 * a one-year immutable cache. Old files are kept; they are small and a rollback needs them.
 */
const PUBLIC_PREFIX = '/api/v1/admin/branding/asset/';
const FETCH_TIMEOUT_MS = 8_000;

function createBrandingStore({ config, logger, dir, fetchImpl = globalThis.fetch }) {
  const base = config.OWNER_PANEL_URL ? String(config.OWNER_PANEL_URL).replace(/\/$/, '') : null;
  const secret = config.OWNER_SHARED_SECRET || null;
  let running = null;
  let lastKick = 0;

  const fileOf = (name) => path.join(dir, name);
  const has = (name) => ASSET_FILE_RE.test(name) && fs.existsSync(fileOf(name));

  async function fetchOne(asset, slot) {
    if (!base || !secret) throw new Error('OWNER_PANEL_URL / OWNER_SHARED_SECRET are not set');
    const refusal = transportRefusal(`${base}/`);
    if (refusal) throw new Error(refusal);
    const res = await fetchImpl(`${base}/api/branding/asset/${asset.file}`, {
      headers: { 'x-owner-key': secret, accept: 'image/*' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`owner panel answered ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (hash !== asset.file.split('.')[0]) throw new Error('bytes do not match the signed hash');
    const problem = imageProblem(buffer, asset.file, slot);
    if (problem) throw new Error(problem);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${fileOf(asset.file)}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, buffer, { mode: 0o644 });
    fs.renameSync(tmp, fileOf(asset.file));
  }

  /** Fetch every image the branding names that is not here yet. Never throws; one run at a time. */
  function sync(branding) {
    if (running) return running;
    running = (async () => {
      const result = { fetched: [], failed: [] };
      for (const slot of SLOTS) {
        const asset = branding?.[slot];
        if (!asset || has(asset.file)) continue;
        try {
          await fetchOne(asset, slot);
          result.fetched.push(asset.file);
          logger?.info({ slot, file: asset.file }, 'Branding image fetched from the owner panel');
        } catch (error) {
          result.failed.push(asset.file);
          logger?.warn({ slot, file: asset.file, err: error.message }, 'Branding image not fetched — the UI keeps its own until it is');
        }
      }
      return result;
    })().finally(() => {
      running = null;
    });
    return running;
  }

  /** A read found an image missing: try again, at most every 10 s, without waiting. */
  function kick(branding) {
    if (Date.now() - lastKick < 10_000) return;
    lastKick = Date.now();
    sync(branding).catch(() => undefined);
  }

  /** The bytes of a stored image, or null. */
  function read(name) {
    if (!ASSET_FILE_RE.test(name)) return null;
    try {
      const data = fs.readFileSync(fileOf(name));
      return { data, contentType: CONTENT_TYPES[name.split('.')[1]], version: name.split('.')[0] };
    } catch {
      return null;
    }
  }

  /**
   * What players read. Every string already passed the rules; an image is listed only once it
   * is here (so a URL never 404s), else null and the UI keeps its own picture.
   */
  function view(branding, version) {
    const url = (asset) => (asset && has(asset.file) ? `${PUBLIC_PREFIX}${asset.file}` : null);
    if (!branding) {
      return {
        version,
        branded: false,
        siteName: null,
        title: null,
        titleTemplate: null,
        description: null,
        keywords: [],
        ogTitle: null,
        ogDescription: null,
        themeColor: null,
        logoUrl: null,
        markUrl: null,
        ogImageUrl: null,
      };
    }
    if (SLOTS.some((s) => branding[s] && !has(branding[s].file))) kick(branding);
    const orNull = (v) => v || null;
    return {
      version,
      branded: Boolean(branding.siteName),
      siteName: orNull(branding.siteName),
      title: orNull(branding.title),
      titleTemplate: orNull(branding.titleTemplate),
      description: orNull(branding.description),
      keywords: [...branding.keywords],
      ogTitle: orNull(branding.ogTitle),
      ogDescription: orNull(branding.ogDescription),
      themeColor: orNull(branding.themeColor),
      logoUrl: url(branding.logo),
      markUrl: url(branding.mark),
      ogImageUrl: url(branding.ogImage),
    };
  }

  return { sync, read, view, dir };
}

let shared = null;

/** The process's one store (routes and the poller's onChange share it). */
function brandingStore({ config, logger }) {
  if (!shared) {
    shared = createBrandingStore({
      config,
      logger,
      dir: path.join(findRepoRoot(path.resolve(__dirname, '..', '..', '..')), 'data', 'branding'),
    });
  }
  return shared;
}

module.exports = { createBrandingStore, brandingStore, PUBLIC_PREFIX };
