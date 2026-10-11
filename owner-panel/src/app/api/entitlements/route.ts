import type { NextRequest } from 'next/server'

import { serverConfig } from '@/configs/site'
import { safeEqual } from '@/lib/auth/token'
import { readEntitlements, signDoc, signDocEd25519 } from '@/lib/entitlements/store'

export const dynamic = 'force-dynamic'

/** The backend's pull (contract §3). Authenticated by x-owner-key, never by the session. */
export async function GET(req: NextRequest) {
  const key = req.headers.get('x-owner-key') ?? ''

  if (!serverConfig.sharedSecret || !safeEqual(key, serverConfig.sharedSecret)) {
    return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Bad or missing x-owner-key' } }, { status: 401 })
  }

  // `issuedAt` is inside the signed data, so a captured answer goes stale instead of
  // being replayable later (the backend refuses one older than OWNER_MAX_AGE_SECONDS).
  const data = { ...(await readEntitlements()), issuedAt: new Date().toISOString() }
  const signatureEd25519 = signDocEd25519(data)

  return Response.json(
    { data, signature: signDoc(data), ...(signatureEd25519 ? { signatureEd25519 } : {}) },
    { headers: { 'cache-control': 'no-store' } }
  )
}
