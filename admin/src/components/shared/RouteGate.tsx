'use client'

import { useEffect, type ReactNode } from 'react'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { BanIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { isPromotionRoute, routeRequirement } from '@/configs/navConfig'
import { useSession } from '@/contexts/SessionContext'

const isRoute = (pathname: string, route: string) => pathname === route || pathname.startsWith(`${route}/`)

type Refusal = 'promotions' | 'permission' | 'account'

/** Why the screen is closed, worded for the area the pasted URL points at. */
const noticeReason = (pathname: string, reason: Refusal) => {
  if (reason === 'promotions') {
    if (isRoute(pathname, '/vault')) return 'The Vault is managed by the site operator and is not part of agent accounts.'
    if (isRoute(pathname, '/swap')) return 'Swap is not available for your account.'

    // The coin registry is house configuration, not a promotion (see PROMOTION_ROUTES).
    if (isRoute(pathname, '/coins')) return 'Coins are managed by the site operator.'

    return 'Promotions are managed by the site operator and are not part of agent accounts.'
  }

  if (reason === 'account') return 'This screen is only for marketing logins.'

  return 'Your role does not include this screen. Ask the site operator if you need access.'
}

export const NotAvailableNotice = ({ pathname = '', reason = 'promotions' }: { pathname?: string; reason?: Refusal }) => (
  <div
    role='status'
    className='border-border bg-card mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 rounded-xl border px-6 py-10 text-center'
  >
    <span className='bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full'>
      <BanIcon className='size-5' />
    </span>
    <h1 className='text-foreground text-base font-semibold'>Not available for your account</h1>
    <p className='text-muted-foreground text-sm'>{noticeReason(pathname, reason)}</p>
    <Link href='/dashboard' className='text-sm font-medium underline underline-offset-4'>
      Back to dashboard
    </Link>
  </div>
)

/**
 * The route gate. Every screen the sidebar links to carries the marks it is filtered on
 * (`permission`, `promotions`, `account` in `navConfig.tsx`); a pasted URL is held to the same
 * marks. When the session lacks them the screen is not rendered at all — so none of its API calls
 * fire — and the "not available" notice is shown instead of the shell plus a raw permission error.
 *
 * Promotions routes (bonus, codes, gift cards, wheel, VIP & club, affiliate, races), the vault,
 * swap history and the coin registry are closed to agent-tree logins (levels 4–6 and their executives) with their own
 * wording. The server still refuses on its own; this is so the screen never opens to say so.
 */
const RouteGate = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { actor, loading, can } = useSession()
  const mustChange = actor?.mustChangePassword === true

  // Nothing opens until a password somebody else chose is replaced — the platform refuses it anyway.
  useEffect(() => {
    if (mustChange) router.replace('/change-password')
  }, [mustChange, router])

  if (mustChange) return <Skeleton className='h-40 w-full' />

  const required = routeRequirement(pathname)
  const promotions = isPromotionRoute(pathname) || required?.promotions === true

  if (!promotions && !required) return <>{children}</>
  if (!actor) return loading ? <Skeleton className='h-40 w-full' /> : <NotAvailableNotice pathname={pathname} reason='permission' />

  let refusal: Refusal | null = null

  if (promotions && actor.promotions !== true) refusal = 'promotions'
  else if (required?.account === 'marketing' && actor.marketing !== true) refusal = 'account'
  else if (required && !required.permissions.every(p => can(p))) refusal = 'permission'

  if (refusal) return <NotAvailableNotice pathname={pathname} reason={refusal} />

  return <>{children}</>
}

export default RouteGate
