import 'server-only'

import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { serverConfig } from '@/configs/site'
import { HttpError } from '@/lib/owner/guard'
import { ASSET_FILE_RE, inspectBrandingImage, type BrandingAsset, type BrandingSlot } from './branding'

/**
 * The uploaded branding images: `owner-panel/data/branding/<sha256>.<ext>`, beside the document
 * and like it never committed. An upload only stores the file; it is in use once a save names it.
 * Files are never overwritten (same name = same bytes) and never deleted here, so every audited
 * version's images stay fetchable.
 */
const dir = () => path.join(serverConfig.dataDir, 'branding')

export const CONTENT_TYPE: Record<string, string> = { png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' }

export async function storeUpload(bytes: Uint8Array, slot: BrandingSlot): Promise<BrandingAsset> {
  const image = inspectBrandingImage(bytes, slot)

  if (!image.ok) throw new HttpError(image.code === 'TOO_LARGE' ? 413 : image.code === 'NO_FILE' ? 400 : 422, `BRANDING_${image.code}`, image.reason)

  const hash = createHash('sha256').update(image.data).digest('hex')
  const file = `${hash}.${image.ext}`
  const target = path.join(dir(), file)

  if (!(await stat(target).catch(() => null))) {
    await mkdir(dir(), { recursive: true, mode: 0o700 })
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`

    await writeFile(tmp, image.data, { mode: 0o600 })
    await rename(tmp, target)
  }

  return {
    file,
    type: image.type,
    bytes: image.data.length,
    ...(image.width ? { width: image.width } : {}),
    ...(image.height ? { height: image.height } : {})
  }
}

export async function assetExists(file: string) {
  return ASSET_FILE_RE.test(file) && !!(await stat(path.join(dir(), file)).catch(() => null))
}

/** The bytes of a stored image, re-hashed: a file whose content no longer matches its name is not served. */
export async function readAsset(file: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!ASSET_FILE_RE.test(file)) return null
  const data = await readFile(path.join(dir(), file)).catch(() => null)

  if (!data) return null
  if (createHash('sha256').update(data).digest('hex') !== file.split('.')[0]) return null

  return { data, contentType: CONTENT_TYPE[file.split('.')[1]] }
}
