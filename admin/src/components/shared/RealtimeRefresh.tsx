'use client'

// React Imports
import { useEffect } from 'react'

// Third-party Imports
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'

// Config Imports
import { siteConfig } from '@/configs/site'
import { REALTIME_EVENTS, REALTIME_PREFIXES, isStale } from '@/lib/realtime-keys'

/**
 * Live refresh of the config screens: when the owner or another operator saves flags, branding,
 * features, coins or the plan, every open admin tab refetches what that save changed.
 *
 * It listens on the player site's socket (user-service `/socket.io`), ANONYMOUSLY: those pushes are
 * broadcast to every socket, so the httpOnly staff token never has to reach the browser. The
 * socket dials the gateway itself, not `/api/gw` (a Next route cannot carry the socket), so the
 * gateway's SOCKET_ALLOWED_ORIGINS must list this admin's origin.
 *
 * Renders nothing; mounted once in the signed-in layout.
 */
const SOCKET_BASE = (process.env.NEXT_PUBLIC_SOCKET_BASE || siteConfig.apiBaseUrl).replace(/\/+$/, '')
const WS = process.env.NEXT_PUBLIC_SOCKET_TRANSPORT === 'websocket'

// One save fires up to three pushes (flags, features, coins): refetch once.
const DEBOUNCE_MS = 300

const RealtimeRefresh = () => {
  const qc = useQueryClient()

  useEffect(() => {
    // Same transport settings as the player site (frontend/src/services/realtime.js).
    const socket = io(SOCKET_BASE, {
      path: '/socket.io',
      transports: WS ? ['polling', 'websocket'] : ['polling'],
      upgrade: WS,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    const pending = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | undefined

    const flush = () => {
      const prefixes = [...pending]

      pending.clear()
      void qc.invalidateQueries({ predicate: q => isStale(q.queryKey, prefixes) })
    }

    for (const event of REALTIME_EVENTS) {
      socket.on(event, () => {
        REALTIME_PREFIXES[event].forEach(p => pending.add(p))
        clearTimeout(timer)
        timer = setTimeout(flush, DEBOUNCE_MS)
      })
    }

    return () => {
      clearTimeout(timer)
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [qc])

  return null
}

export default RealtimeRefresh
