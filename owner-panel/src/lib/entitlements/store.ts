import 'server-only'

import { createHmac, createPrivateKey, sign as edSign, type KeyObject } from 'node:crypto'
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { FEATURE_CATALOGUE, FEATURE_KEYS, FEATURE_OPTIONS, FLAG_KEYS, isPolicy, isVariantOf, resolveOptions } from '@/configs/entitlementCatalogue'
import { serverConfig } from '@/configs/site'
import { DEFAULT_TEMPLATE, resolveTemplateKey, templateByKey, TEMPLATE_KEYS } from '@/configs/templateCatalogue'
import { HttpError } from '@/lib/owner/guard'
import { cleanCoin, coinProblem, diffCoins, droppedCoins } from './coins'
import { cleanRegion, regionProblem, type RegionSetting } from './region'
import { diffDocs, type AuditEntry, type Change, type CoinDefinition, type EditableDoc, type EntitlementsDoc, type VariantsSeed } from './types'

/**
 * The entitlements document and its audit trail live only in owner-panel/data/
 * (contract §2). Nothing here touches the site database, admin or frontend.
 */
const docPath = () => path.join(serverConfig.dataDir, 'entitlements.json')
const auditPath = () => path.join(serverConfig.dataDir, 'audit.jsonl')

/** The full catalogue, every key present; a key the file lacks reads as entitled. */
function complete(map: Record<string, unknown> | undefined, keys: string[]) {
  const out: Record<string, boolean> = {}

  for (const key of keys) out[key] = map?.[key] !== false

  // Keep keys the catalogue no longer lists, so an older value is not silently dropped.
  for (const [key, value] of Object.entries(map ?? {})) if (!(key in out)) out[key] = value !== false

  return out
}

/** Only catalogue features, only their own variant keys; anything else is dropped (read) or refused (save). */
function knownVariants(map: unknown) {
  const out: Record<string, string> = {}

  if (!map || typeof map !== 'object' || Array.isArray(map)) return out

  for (const [key, value] of Object.entries(map)) if (typeof value === 'string' && isVariantOf(key, value)) out[key] = value

  return out
}

/**
 * The rule that ties ON to VARIANT (contract §2): a policy is always on (its variant is the
 * policy); any other feature on variant `none` is off.
 */
function normalise(features: Record<string, boolean>, variants: Record<string, string>) {
  const out = { ...features }

  for (const f of FEATURE_CATALOGUE) {
    if (f.policy) out[f.key] = true
    else if (variants[f.key] === 'none') out[f.key] = false
  }

  return out
}

/**
 * Custom coin definitions (phase B). Reading drops anything malformed; saving (strict) refuses
 * it. Built-in coins never appear here — they are switched through `flags`. Rules in ./coins.
 */
export function knownCoins(list: unknown, strict = false): CoinDefinition[] {
  if (list === undefined || list === null) return []

  if (!Array.isArray(list)) {
    if (strict) throw new HttpError(400, 'VALIDATION_ERROR', 'coins must be an array')

    return []
  }

  const out: CoinDefinition[] = []

  for (const [i, raw] of list.entries()) {
    const c = raw as CoinDefinition
    const problem = coinProblem(c) ?? (out.some(o => o.code === c.code) ? 'code is listed twice' : null)

    if (problem) {
      if (strict) throw new HttpError(400, 'VALIDATION_ERROR', `coins[${i}]: ${problem}`)
      continue
    }

    out.push(cleanCoin(c))
  }

  return out
}

async function writeAtomic(file: string, body: string) {
  await mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`

  await writeFile(tmp, body, { mode: 0o600 })
  await rename(tmp, file)
}

export async function readEntitlements(): Promise<EntitlementsDoc> {
  const raw = await readFile(docPath(), 'utf8').catch(error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  })

  if (raw === null) {
    // First run: everything entitled — today's behaviour.
    const doc: EntitlementsDoc = {
      site: serverConfig.siteKey,
      version: 1,
      updatedAt: new Date().toISOString(),
      template: DEFAULT_TEMPLATE,
      features: complete({}, FEATURE_KEYS),
      flags: complete({}, FLAG_KEYS)

      // No `variants`: the backend keeps the site's current ones until the owner's first save.
    }

    await writeAtomic(docPath(), JSON.stringify(doc, null, 2) + '\n')

    return doc
  }

  const stored = JSON.parse(raw) as Partial<EntitlementsDoc>

  return {
    site: stored.site ?? serverConfig.siteKey,
    version: Number(stored.version) || 1,
    updatedAt: stored.updatedAt ?? new Date(0).toISOString(),

    // An old name (e.g. from before the rename) reads as its current key; a file without one
    // runs DEFAULT_TEMPLATE, and the next save writes it — nothing is written here.
    template: typeof stored.template === 'string' && stored.template ? resolveTemplateKey(stored.template) : DEFAULT_TEMPLATE,
    features: complete(stored.features, FEATURE_KEYS),
    flags: complete(stored.flags, FLAG_KEYS),

    // Absent in an older document: the backend then keeps the site's current variants.
    ...(stored.variants ? { variants: knownVariants(stored.variants) } : {}),

    // Absent = no custom coins; only written once present.
    ...(stored.coins !== undefined ? { coins: knownCoins(stored.coins) } : {}),

    // Owner-only feature options; absent = every default (the backend fills them the same way).
    ...(stored.options !== undefined ? { options: resolveOptions(stored.options) } : {}),

    // Region restriction's list type + countries; absent = an empty blocklist (nobody restricted).
    ...(stored.region !== undefined ? { region: cleanRegion(stored.region) } : {})
  }
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

/**
 * The site's live state, from the players' view `GET <SITE_GATEWAY_URL>/api/v1/admin/features/public`:
 * every feature that is on, with its variant, plus the policies. Null when unreachable.
 */
async function liveVariants(): Promise<Map<string, string> | null> {
  const base = serverConfig.gatewayUrl.replace(/\/$/, '')

  if (!base) return null

  try {
    const { protocol, hostname } = new URL(base)

    if (protocol !== 'https:' && !(protocol === 'http:' && LOOPBACK.has(hostname))) return null

    const res = await fetch(`${base}/api/v1/admin/features/public`, { cache: 'no-store', signal: AbortSignal.timeout(3_000) })
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: { feature?: unknown; variant?: unknown }[] } | null

    if (!res.ok || !body?.success || !Array.isArray(body.data)) return null

    const out = new Map<string, string>()

    for (const row of body.data) {
      if (typeof row.feature === 'string' && typeof row.variant === 'string' && isVariantOf(row.feature, row.variant)) out.set(row.feature, row.variant)
    }

    return out
  } catch {
    return null
  }
}

/**
 * The document as the owner screen edits it: always a full `variants` map. An older document
 * (no `variants`, or a key the catalogue added since) is filled from the site's live state when
 * the backend answers — a feature missing there is off — else from the current template. Nothing
 * is written here; the next save writes the full map (contract §2).
 */
export async function readForEdit(): Promise<EditableDoc> {
  const doc = await readEntitlements()
  const stored = doc.variants ?? {}

  const options = resolveOptions(doc.options)
  const region = cleanRegion(doc.region)

  if (FEATURE_KEYS.every(key => key in stored)) return { ...doc, variants: { ...stored }, options, region, seededFrom: null }

  const live = await liveVariants()
  const template = templateByKey(doc.template)
  const seededFrom: VariantsSeed = live ? 'backend' : 'template'
  const variants: Record<string, string> = { ...stored }
  const features = { ...doc.features }

  for (const f of FEATURE_CATALOGUE) {
    if (f.key in stored) continue
    const fromTemplate = template?.variants[f.key]
    const fallback = f.policy ? (f.defaultVariant ?? f.variants[0].key) : 'none'

    if (live) {
      const on = live.get(f.key)

      // The public view lists only what is on (and in the plan).
      variants[f.key] = on ?? (fromTemplate && isVariantOf(f.key, fromTemplate) ? fromTemplate : fallback)
      if (!isPolicy(f.key)) features[f.key] = features[f.key] !== false && on !== undefined && on !== 'none'
    } else {
      variants[f.key] = fromTemplate && isVariantOf(f.key, fromTemplate) ? fromTemplate : fallback
    }
  }

  return { ...doc, features: normalise(features, variants), variants, options, region, seededFrom }
}

// One save at a time inside this process; the version check guards against a stale screen.
let queue: Promise<unknown> = Promise.resolve()

export function saveEntitlements(
  input: {
    version: number
    template?: string
    features: Record<string, boolean>
    flags: Record<string, boolean>
    variants?: Record<string, string>
    coins?: CoinDefinition[]
    options?: Record<string, Record<string, boolean>>
    region?: RegionSetting
  },
  user: string
) {
  const run = async (): Promise<{ doc: EntitlementsDoc; changes: Change[] }> => {
    // Diffed against what the screen showed, so filling an older document's variants is not
    // reported as an owner change (the audit line records `seededFrom` instead).
    const { seededFrom, ...current } = await readForEdit()

    if (input.version !== current.version) {
      throw new HttpError(409, 'VERSION_CONFLICT', `Saved as version ${current.version} since you loaded version ${input.version}. Reload and try again.`)
    }

    const template = input.template === undefined ? current.template : resolveTemplateKey(input.template)

    if (input.template !== undefined && !TEMPLATE_KEYS.includes(template)) throw new HttpError(400, 'VALIDATION_ERROR', `template must be one of ${TEMPLATE_KEYS.join(', ')}`)

    for (const [key, value] of Object.entries(input.variants ?? {})) {
      if (!FEATURE_KEYS.includes(key)) throw new HttpError(400, 'VALIDATION_ERROR', `variants.${key} is not a catalogue feature`)
      if (typeof value !== 'string' || !isVariantOf(key, value)) throw new HttpError(400, 'VALIDATION_ERROR', `variants.${key} is not a variant of ${key}`)
    }

    const variants = { ...current.variants, ...input.variants }

    // Owner-only options: catalogue features and options only, booleans only.
    for (const [feature, values] of Object.entries(input.options ?? {})) {
      const known = FEATURE_OPTIONS[feature]

      if (!known) throw new HttpError(400, 'VALIDATION_ERROR', `options.${feature} has no options`)

      for (const [key, value] of Object.entries(values ?? {})) {
        if (!known.some(o => o.key === key)) throw new HttpError(400, 'VALIDATION_ERROR', `options.${feature}.${key} is not an option`)
        if (typeof value !== 'boolean') throw new HttpError(400, 'VALIDATION_ERROR', `options.${feature}.${key} must be true or false`)
      }
    }

    const options = resolveOptions(
      Object.fromEntries(Object.keys(FEATURE_OPTIONS).map(f => [f, { ...current.options[f], ...input.options?.[f] }]))
    )

    // Region restriction: list type + ISO codes, exact. A bad code is 422 (well-formed, not acceptable).
    if (input.region !== undefined) {
      const problem = regionProblem(input.region)

      if (problem) throw new HttpError(422, 'VALIDATION_ERROR', problem)
    }

    const region = input.region !== undefined ? cleanRegion(input.region) : current.region

    const next = {
      template,
      features: normalise(complete({ ...current.features, ...input.features }, FEATURE_KEYS), variants),
      flags: complete({ ...current.flags, ...input.flags }, FLAG_KEYS),
      variants,
      options,
      region
    }

    const changes = diffDocs(current, next)

    // Custom coins (phase B): kept as they are unless the save names them. Never shrinks — a coin
    // is switched off, not removed (and so its code, which balances are keyed by, never changes).
    const coins = input.coins !== undefined ? knownCoins(input.coins, true) : current.coins

    if (input.coins !== undefined) {
      const dropped = droppedCoins(current.coins ?? [], coins ?? [])

      if (dropped.length) throw new HttpError(400, 'COIN_DELETE_REFUSED', `A coin is never removed (it may hold balances) — switch ${dropped.join(', ')} off instead`)
      changes.push(...diffCoins(current.coins ?? [], coins ?? []))
    }

    if (changes.length === 0) return { doc: current, changes }

    const doc: EntitlementsDoc = {
      site: current.site,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      ...next,
      ...(coins !== undefined ? { coins } : {})
    }

    const entry: AuditEntry = { at: doc.updatedAt, user, version: doc.version, changes, ...(seededFrom ? { seededFrom } : {}) }

    await writeAtomic(docPath(), JSON.stringify(doc, null, 2) + '\n')
    await appendFile(auditPath(), JSON.stringify(entry) + '\n', { mode: 0o600 })

    return { doc, changes }
  }

  const result = queue.then(run, run)

  queue = result.catch(() => undefined)

  return result
}

export async function readAudit(limit = 500): Promise<AuditEntry[]> {
  const raw = await readFile(auditPath(), 'utf8').catch(() => '')
  const rows: AuditEntry[] = []

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue

    try {
      rows.push(JSON.parse(line) as AuditEntry)
    } catch {
      // A torn line (crash mid-append) is skipped, not fatal.
    }
  }

  return rows.reverse().slice(0, limit)
}

/** Contract §3: hex HMAC-SHA256 of JSON.stringify(data) with OWNER_SHARED_SECRET. */
export function signDoc(doc: object) {
  return createHmac('sha256', serverConfig.sharedSecret).update(JSON.stringify(doc)).digest('hex')
}

let signingKey: KeyObject | null | undefined

/**
 * The second signature, with a key that never leaves this host. The HMAC's key is
 * also the x-owner-key the backend sends, so whoever reads one request could forge
 * an answer; this one the backend only verifies (OWNER_VERIFY_KEY, public half).
 * Null when OWNER_SIGNING_KEY is not set.
 */
export function signDocEd25519(doc: object): string | null {
  if (signingKey === undefined) {
    try {
      signingKey = serverConfig.signingKey
        ? createPrivateKey({ key: Buffer.from(serverConfig.signingKey, 'base64'), format: 'der', type: 'pkcs8' })
        : null
    } catch {
      signingKey = null
      console.error('OWNER_SIGNING_KEY is not a base64 PKCS8 Ed25519 key — answering without signatureEd25519')
    }
  }

  return signingKey ? edSign(null, Buffer.from(JSON.stringify(doc)), signingKey).toString('base64') : null
}
