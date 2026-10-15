'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

import { withBase } from '@/lib/basePath'

import { useQueryClient } from '@tanstack/react-query'

type SessionValue = {
  can: (permission?: string | string[]) => boolean
  flags: Record<string, boolean>
  signOut: () => Promise<void>
}

const Ctx = createContext<SessionValue | null>(null)

/** The owner has every permission; this exists so the shared shell components keep one API. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  const signOut = useCallback(async () => {
    await fetch(withBase('/api/auth/logout'), { method: 'POST' }).catch(() => undefined)
    qc.clear()
    location.assign(withBase('/login'))
  }, [qc])

  const value = useMemo<SessionValue>(() => ({ can: () => true, flags: {}, signOut }), [signOut])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const v = useContext(Ctx)

  if (!v) throw new Error('useSession outside SessionProvider')

  return v
}
