'use strict';

const crypto = require('crypto');
const { ValidationError } = require('@ibitplay/common');

const { SLOTS, ASSET_FILE_RE, CONTENT_TYPES, imageProblem } = require('./branding.rules');

/**
 * The branding images, kept in `owner_branding_assets` (migration 142), one row per content hash.
 *
 * The owner panel uploads each image (`PUT /api/v1/admin/owner/branding/asset/<file>`,
 * `x-owner-key`); `put()` keeps it only when its bytes hash to its name and pass the image
 * checks. The signed entitlement document names each image by that hash, and only images the
 * CURRENT document names are loaded into memory (`sync`) and served publicly — so the key alone
 * can upload bytes but never put them on the site: the document's signature vouches for the hash.
 * Rows are immutable (same name = same bytes), which is what lets the gateway serve them with a
 * one-year immutable cache. Old rows are kept; they are small and a rollback needs them.
 */
const PUBLIC_PREFIX = '/api/v1/admin/branding/asset/';

const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function createBrandingStore({ logger, models }) {
  // file → { data, contentType, version }: the images the current document names.
  const cache = new Map();
  let running = null;
  let lastKick = 0;

  const has = (name) => cache.has(name);

  /** An upload from the owner panel. Throws a 422 for bytes that do not match the name or fail the checks. */
  async function put(file, buffer, slot) {
    if (!ASSET_FILE_RE.test(file)) throw new ValidationError('Not a branding image name');
    if (!SLOTS.includes(slot)) throw new ValidationError(`slot must be one of ${SLOTS.join(', ')}`);
    if (sha(buffer) !== file.split('.')[0]) throw new ValidationError('The bytes do not hash to the file name');
    const problem = imageProblem(buffer, file, slot);
    if (problem) throw new ValidationError(problem);
    await models.OwnerBrandingAsset.findOrCreate({
      where: { file },
      defaults: { file, content_type: CONTENT_TYPES[file.split('.')[1]], byte_size: buffer.length, bytes: buffer },
    });
    return { file, bytes: buffer.length };
  }

  /** Any stored image (the owner panel's previews), re-hashed; null when absent. */
  async function stored(name) {
    if (!ASSET_FILE_RE.test(name)) return null;
    const row = await models.OwnerBrandingAsset.findByPk(name, { raw: true });
    if (!row || sha(row.bytes) !== name.split('.')[0]) return null;
    return { data: Buffer.from(row.bytes), contentType: CONTENT_TYPES[name.split('.')[1]], version: name.split('.')[0] };
  }

  /** Load every image the branding names into memory. Never throws; one run at a time. */
  function sync(branding) {
    if (running) return running;
    running = (async () => {
      const result = { fetched: [], failed: [] };
      const named = new Set();
      for (const slot of SLOTS) {
        const asset = branding?.[slot];
        if (!asset) continue;
        named.add(asset.file);
        if (has(asset.file)) continue;
        try {
          const image = await stored(asset.file);
          if (!image) throw new Error('not uploaded');
          const problem = imageProblem(image.data, asset.file, slot);
          if (problem) throw new Error(problem);
          cache.set(asset.file, image);
          result.fetched.push(asset.file);
        } catch (error) {
          result.failed.push(asset.file);
          logger?.warn({ slot, file: asset.file, err: error.message }, 'Branding image not loaded — the UI keeps its own until it is');
        }
      }
      // An image the document no longer names stops being served.
      for (const name of cache.keys()) if (!named.has(name)) cache.delete(name);
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

  /** The bytes of an image the current document names, or null. */
  function read(name) {
    return cache.get(name) ?? null;
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

  return { sync, read, view, put, stored };
}

let shared = null;

/** The process's one store (routes and the entitlements store's onChange share it). */
function brandingStore({ logger, models }) {
  if (!shared) shared = createBrandingStore({ logger, models });
  return shared;
}

module.exports = { createBrandingStore, brandingStore, PUBLIC_PREFIX };
