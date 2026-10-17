'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { featureCatalogue, featureOptions, regionPolicy, withdrawalCap } = require('@ibitplay/common');
const { cleanBranding } = require('../branding/branding.rules');

/**
 * The owner's entitlements, pulled from the owner panel.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * THIS SERVICE IS THE ONLY POLLER — docs/OWNER-PANEL.md §3
 *
 * Every `OWNER_POLL_SECONDS` it asks `GET <OWNER_PANEL_URL>/api/entitlements`
 * with `x-owner-key`, and keeps the answer only when its HMAC verifies. A new
 * `version` is written to `backend/data/owner-entitlements.json` — a FILE,
 * never a table: the owner's data stays out of the site database — and
 * `onChange` applies the document to `site_features` — every feature's
 * on/off and variant (`features`, `variants`) are the owner's alone, and an
 * older document without `variants` applies its `template` when it changed —
 * and pushes the masked public view down the sockets.
 *
 * ── FALLBACK: OWNER → CACHE → DEFAULT ────────────────────────────────────
 *
 * Unreachable or a bad signature keeps the last good copy (memory, then the
 * file). No copy at all means everything is entitled — today's behaviour —
 * with a warning on every poll, so a site is never darkened by the owner
 * panel being down.
 *
 * ── WHAT AN ANSWER MUST PROVE ────────────────────────────────────────────
 *
 * The contract's HMAC is keyed with the same secret the request sends as
 * `x-owner-key`, so anyone who can read one poll can forge the next answer.
 * Four checks close that:
 *
 *   1. TRANSPORT. `OWNER_PANEL_URL` must be https:// unless it is this host
 *      (127.0.0.1 / localhost / ::1). An http:// URL elsewhere is never
 *      called, so the key never crosses a network in clear.
 *   2. A KEY THAT IS NEVER SENT. With `OWNER_VERIFY_KEY` (the owner panel's
 *      Ed25519 public key) set, only `signatureEd25519` is believed. The
 *      backend host holds no key that can mint a document; the HMAC is then
 *      ignored. Unset, the HMAC is checked as the contract says.
 *   3. FRESHNESS. The owner panel puts `issuedAt` inside the signed data; an
 *      answer older (or newer) than `OWNER_MAX_AGE_SECONDS` is refused, so a
 *      captured answer cannot be replayed later. Required with the Ed25519 key.
 *   4. ORDER AND SITE. A version lower than the copy we hold is refused (an
 *      old "everything on" answer cannot undo a newer block), and so is a
 *      document for another site (`OWNER_SITE_KEY`, else the site of the copy
 *      we hold).
 *
 * A refused answer is treated like an outage: the last good copy stays.
 * If the owner panel's data is ever reset to a lower version, delete
 * `backend/data/owner-entitlements.json` and restart admin-service.
 * ═════════════════════════════════════════════════════════════════════════
 */

const FETCH_TIMEOUT_MS = 5_000;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/** Hex HMAC-SHA256 of `JSON.stringify(data)` — what the owner panel signs. */
function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex');
}

function verifySignature(data, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(sign(data, secret), 'hex');
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * The owner panel's Ed25519 public key: PEM, or base64 of the SPKI DER (one
 * line, which is what fits in `.env`). Null when unset or unreadable.
 */
function readVerifyKey(value, logger) {
  if (!value) return null;
  try {
    const text = String(value).replace(/\\n/g, '\n').trim();
    const key = text.includes('BEGIN')
      ? crypto.createPublicKey(text)
      : crypto.createPublicKey({ key: Buffer.from(text, 'base64'), format: 'der', type: 'spki' });
    if (key.asymmetricKeyType !== 'ed25519') throw new Error(`expected an ed25519 key, got ${key.asymmetricKeyType}`);
    return key;
  } catch (error) {
    logger?.error({ err: error.message }, 'OWNER_VERIFY_KEY is not a usable Ed25519 public key — no owner answer will be accepted');
    return false;
  }
}

function verifyEd25519(data, signature, key) {
  if (!key || typeof signature !== 'string' || !signature) return false;
  try {
    return crypto.verify(null, Buffer.from(JSON.stringify(data)), key, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

/** http:// is only allowed to this host; anything else must be https://. Returns a reason or null. */
function transportRefusal(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol === 'https:') return null;
    if (protocol === 'http:' && LOOPBACK_HOSTS.has(hostname)) return null;
    return `OWNER_PANEL_URL must be https:// unless the owner panel is on this host (got ${protocol}//${hostname})`;
  } catch {
    return 'OWNER_PANEL_URL is not a valid URL';
  }
}

/** Only booleans survive: anything else in the maps reads as "missing", i.e. entitled. */
function booleans(map) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return {};
  return Object.fromEntries(Object.entries(map).filter(([, v]) => typeof v === 'boolean'));
}

/**
 * The owner's template (docs/OWNER-PANEL.md §2): a catalogue key, an old
 * clone name resolved to its key, or null. Anything else is dropped rather
 * than refusing the whole document — the plan itself still applies.
 */
function templateOf(value) {
  if (typeof value !== 'string' || !value) return null;
  const key = featureCatalogue.resolveTemplateKey(value);
  return Object.hasOwn(featureCatalogue.TEMPLATES, key) ? key : null;
}

/**
 * The owner's choice of variant per feature (docs/OWNER-PANEL.md §2): only
 * string values survive; the features service checks each against the
 * catalogue. Null when the document has no `variants` (an older owner panel),
 * which keeps the template-only behaviour.
 */
function variantsOf(map) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
  return Object.fromEntries(Object.entries(map).filter(([, v]) => typeof v === 'string' && v));
}

/**
 * Custom coin definitions the owner added (phase B: `coins: [{ code, kind,
 * name, … }]`). Carried as plain objects with a valid code; applying them is
 * the currencies service's job. `[]` when absent.
 */
function coinsOf(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => c && typeof c === 'object' && typeof c.code === 'string' && /^[A-Z][A-Z0-9]{1,9}$/.test(c.code))
    .slice(0, 200)
    .map((c) => ({ ...c }));
}

function normalise(data) {
  if (!data || typeof data !== 'object' || !Number.isFinite(Number(data.version))) return null;
  return {
    site: data.site ?? null,
    version: Number(data.version),
    updatedAt: data.updatedAt ?? null,
    features: booleans(data.features),
    flags: booleans(data.flags),
    template: templateOf(data.template),
    variants: variantsOf(data.variants),
    coins: coinsOf(data.coins),
    // Owner-only feature options (featureOptions.js); unknown keys dropped, defaults applied by readers.
    options: featureOptions.cleanOptions(data.options),
    // Region restriction's list type and countries (regionPolicy.js); the mode is the policy's variant.
    region: regionPolicy.cleanRegion(data.region),
    // Withdrawal requirements' deposit cap (withdrawalCap.js); KYC / wagering are the policy's variant.
    withdrawalCap: withdrawalCap.cleanWithdrawalCap(data.withdrawalCap),
    // Site name, metadata and logo file references (modules/branding); null = not branded.
    branding: cleanBranding(data.branding),
  };
}

/**
 * @param {object}   options
 * @param {object}   options.config     OWNER_PANEL_URL, OWNER_SHARED_SECRET, OWNER_POLL_SECONDS
 * @param {string}   options.filePath   where the last good copy is kept
 * @param {Function} [options.onChange] called with the new document on a new version
 * @param {Function} [options.fetchImpl] for tests
 */
function createEntitlementsPoller({ config, logger, filePath, onChange: initialOnChange, fetchImpl = globalThis.fetch }) {
  const url = config.OWNER_PANEL_URL ? `${String(config.OWNER_PANEL_URL).replace(/\/$/, '')}/api/entitlements` : null;
  const secret = config.OWNER_SHARED_SECRET || null;
  const intervalMs = Math.max(1, Number(config.OWNER_POLL_SECONDS) || 15) * 1000;
  const insecure = url ? transportRefusal(url) : null;
  // `false` = configured but unusable: refuse everything rather than fall back to the HMAC.
  const verifyKey = readVerifyKey(config.OWNER_VERIFY_KEY, logger);
  const maxAgeMs = Math.max(30, Number(config.OWNER_MAX_AGE_SECONDS) || 300) * 1000;
  const expectedSite = config.OWNER_SITE_KEY || null;

  /** The last good document and when it was fetched; `source` is how we stand now. */
  let doc = null;
  let fetchedAt = null;
  let source = 'default';
  let timer = null;
  let onChange = initialOnChange;

  function readFile() {
    try {
      const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const data = normalise(saved?.data);
      return data ? { data, fetchedAt: saved.fetchedAt ?? null } : null;
    } catch (error) {
      if (error.code !== 'ENOENT') logger?.warn({ err: error.message }, 'Owner entitlements cache file unreadable — ignoring it');
      return null;
    }
  }

  function writeFile(data, at) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify({ fetchedAt: at, data }, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(tmp, filePath);
  }

  /** Memory first, then the file; null when there is no copy anywhere. */
  function fallback() {
    if (doc) return true;
    const saved = readFile();
    if (!saved) return false;
    doc = saved.data;
    fetchedAt = saved.fetchedAt;
    return true;
  }

  /** The checks of "what an answer must prove", after the fetch. Throws the reason. */
  function assertBelievable(body) {
    const data = body?.data;
    if (verifyKey !== null) {
      if (!verifyEd25519(data, body?.signatureEd25519, verifyKey)) throw new Error('bad Ed25519 signature');
    } else if (!verifySignature(data, body?.signature, secret)) {
      throw new Error('bad signature');
    }

    const issuedAt = Date.parse(data?.issuedAt ?? '');
    if (Number.isFinite(issuedAt)) {
      if (Math.abs(Date.now() - issuedAt) > maxAgeMs) throw new Error('stale answer (issuedAt outside OWNER_MAX_AGE_SECONDS)');
    } else if (verifyKey !== null) {
      throw new Error('answer has no issuedAt');
    }

    const next = normalise(data);
    if (!next) throw new Error('malformed entitlements document');

    fallback(); // the copy we hold, from memory or the file, to compare against
    if (doc && next.version < doc.version) throw new Error(`version went backwards (${next.version} < ${doc.version})`);
    const site = expectedSite ?? doc?.site ?? null;
    if (site && next.site !== site) throw new Error(`document is for site "${next.site}", not "${site}"`);
    return next;
  }

  async function fetchOwner() {
    if (!url || !secret) throw new Error('OWNER_PANEL_URL / OWNER_SHARED_SECRET are not set');
    if (insecure) throw new Error(insecure);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetchImpl(url, { headers: { 'x-owner-key': secret, accept: 'application/json' }, signal: controller.signal });
      if (!res.ok) throw new Error(`owner panel answered ${res.status}`);
      return assertBelievable(await res.json());
    } finally {
      clearTimeout(timeout);
    }
  }

  /** One poll. Never throws. */
  async function pollOnce() {
    // No owner panel configured: this site is not managed — everything is
    // entitled, and no cache file left over from an earlier setup applies.
    if (!url) return current();
    try {
      const data = await fetchOwner();
      const changed = !doc || doc.version !== data.version;
      doc = data;
      fetchedAt = new Date().toISOString();
      source = 'owner';
      if (changed) {
        try {
          writeFile(data, fetchedAt);
        } catch (error) {
          logger?.warn({ err: error.message }, 'Could not write the owner entitlements cache file');
        }
        logger?.info({ version: data.version }, 'Owner entitlements updated');
        if (onChange) await Promise.resolve(onChange(current())).catch((error) => logger?.warn({ err: error.message }, 'Entitlements change push failed'));
      }
    } catch (error) {
      if (fallback()) {
        source = 'cache';
        logger?.warn({ err: error.message, version: doc.version }, 'Owner panel not usable — keeping the last good entitlements');
      } else {
        source = 'default';
        logger?.warn({ err: error.message }, 'Owner panel not usable and no cached entitlements — everything is entitled');
      }
    }
    return current();
  }

  /** `{ features, flags, template, variants, version, fetchedAt, source }` — never a secret. */
  function current() {
    if (!doc) return { features: {}, flags: {}, template: null, variants: null, coins: [], options: {}, region: regionPolicy.cleanRegion(null), withdrawalCap: withdrawalCap.cleanWithdrawalCap(null), branding: null, version: 0, fetchedAt: null, source: 'default' };
    return {
      features: { ...doc.features },
      flags: { ...doc.flags },
      template: doc.template ?? null,
      variants: doc.variants ? { ...doc.variants } : null,
      coins: (doc.coins ?? []).map((c) => ({ ...c })),
      options: JSON.parse(JSON.stringify(doc.options ?? {})),
      region: regionPolicy.cleanRegion(doc.region),
      withdrawalCap: withdrawalCap.cleanWithdrawalCap(doc.withdrawalCap),
      branding: doc.branding ? JSON.parse(JSON.stringify(doc.branding)) : null,
      version: doc.version,
      fetchedAt,
      source,
    };
  }

  return {
    current,
    pollOnce,
    /** Load the file so the first request has an answer, then poll. */
    start({ onChange: handler } = {}) {
      if (handler) onChange = handler;
      if (!url) {
        logger?.info('OWNER_PANEL_URL not set — no owner panel, no poller; everything is entitled');
        return this;
      }
      if (fallback()) source = 'cache';
      pollOnce();
      timer = setInterval(pollOnce, intervalMs);
      timer.unref?.();
      return this;
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

module.exports = { createEntitlementsPoller, verifySignature, sign, transportRefusal };
