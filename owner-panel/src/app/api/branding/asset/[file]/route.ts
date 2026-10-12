import type { NextRequest } from 'next/server'

import { serverConfig } from '@/configs/site'
import { safeEqual } from '@/lib/auth/token'
import { readAsset } from '@/lib/entitlements/brandingAssets'
import { imageResponse } from '@/lib/entitlements/brandingResponse'

export const dynamic = 'force-dynamic'

/**
 * The backend's fetch of a branding image the signed document names (contract §8).
 * `x-owner-key` like the document pull, never the session. The backend checks the bytes
 * against the hash in the file name, so this answer needs no signature of its own.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  const key = req.headers.get('x-owner-key') ?? ''

  if (!serverConfig.sharedSecret || !safeEqual(key, serverConfig.sharedSecret)) {
    return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Bad or missing x-owner-key' } }, { status: 401 })
  }

  const asset = await readAsset((await ctx.params).file)

  if (!asset) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'No such image' } }, { status: 404 })

  return imageResponse(asset)
}
