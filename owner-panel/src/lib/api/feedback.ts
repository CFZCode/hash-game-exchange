'use client'

import { toast } from 'sonner'

import { errorMessage } from './client'

/** What `PUT /api/owner/entitlements` answers: the new document, what moved, and whether the site was nudged. */
export type SaveResult = { doc: { version: number }; changes: unknown[]; live?: { live: boolean; version?: number; reason?: string } }

/**
 * The one toast after a save of the entitlements document (Features & plan, Coins, Branding):
 * the new version, then whether the site backend took the nudge (live now) or will pick it up on
 * its next poll — with the reason the nudge failed.
 */
export function toastSaved(r: SaveResult, what = 'Saved') {
  if (!r.changes.length) {
    toast.info('Nothing to save', { description: 'The stored version already matches; no new version was written.' })

    return
  }

  const n = r.changes.length
  const title = `${what} — version v${r.doc.version} (${n} change${n === 1 ? '' : 's'})`

  if (r.live?.live) toast.success(title, { description: 'The site backend pulled it: live on the site now.' })
  else
    toast.success(title, {
      description: `The site was not nudged${r.live?.reason ? ` (${r.live.reason})` : ''}; it picks this version up on its next poll.`
    })
}

/** An error toast with the server's message in plain words (lib/api/client.ts errorMessage). */
export function toastError(error: unknown, title?: string) {
  const message = errorMessage(error)

  if (title) toast.error(title, { description: message })
  else toast.error(message)
}
