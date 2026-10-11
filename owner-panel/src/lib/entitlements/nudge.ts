import 'server-only'

import { serverConfig } from '@/configs/site'

/**
 * After a save, ask the site backend to pull the new version NOW
 * (`POST <SITE_GATEWAY_URL>/api/v1/admin/entitlements/refresh`, header `x-owner-key`) instead of
 * waiting for its next poll — docs/OWNER-PANEL.md §3. The backend still fetches and verifies the
 * signed document itself; this only moves the poll forward. Best effort: a failure leaves the
 * regular poll to pick the save up, and never fails the save.
 */
export type Nudge = { live: boolean; version?: number; reason?: string }

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

export async function nudgeBackend(): Promise<Nudge> {
  const base = serverConfig.gatewayUrl.replace(/\/$/, '')

  if (!base || !serverConfig.sharedSecret) return { live: false, reason: 'SITE_GATEWAY_URL / OWNER_SHARED_SECRET not set' }

  try {
    const { protocol, hostname } = new URL(base)

    // Same rule as the backend's poll: the key never crosses a network in clear.
    if (protocol !== 'https:' && !(protocol === 'http:' && LOOPBACK.has(hostname))) {
      return { live: false, reason: 'SITE_GATEWAY_URL must be https:// unless it is this host' }
    }

    const res = await fetch(`${base}/api/v1/admin/entitlements/refresh`, {
      method: 'POST',
      headers: { 'x-owner-key': serverConfig.sharedSecret, accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store'
    })

    const body = (await res.json().catch(() => null)) as { data?: { version?: number } } | null

    if (!res.ok) return { live: false, reason: `backend answered ${res.status}` }

    return { live: true, version: body?.data?.version }
  } catch (error) {
    return { live: false, reason: error instanceof Error ? error.message : 'unreachable' }
  }
}
