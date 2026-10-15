import { BASE_PATH, withBase } from '../basePath'
import type { Envelope, Query } from './types'

/** Owner panel HTTP seam: same-origin `/api/owner/...` route handlers. */
export class ApiError extends Error {
  code: string
  status: number
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function buildQuery(query?: Query) {
  if (!query) return ''
  const p = new URLSearchParams()

  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()

  return s ? `?${s}` : ''
}

export async function request<T>(path: string, opts: { method?: string; body?: unknown; query?: Query; signal?: AbortSignal } = {}): Promise<T> {
  const res = await fetch(withBase(path) + buildQuery(opts.query), {
    method: opts.method ?? 'GET',
    headers: opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    cache: 'no-store'
  })

  const json = (await res.json().catch(() => null)) as Envelope<T> | null

  if (!json) throw new ApiError(res.status, 'BAD_RESPONSE', res.statusText)

  if (!json.success) {
    if (res.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith(`${BASE_PATH}/login`)) location.assign(withBase('/login'))
    throw new ApiError(res.status, json.error.code, json.error.message)
  }

  return json.data
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ?? {} }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
