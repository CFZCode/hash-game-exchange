'use client'

import { BanknoteIcon, BanknoteXIcon, LockIcon } from 'lucide-react'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'

/** The lock columns `GET admin/reports/players/:id` and `GET admin/staff/:id` report. */
export type AccountLocks = { system?: boolean; casino?: boolean; sports?: boolean; withdraw?: boolean }

/** `POST admin/locks` — what it answers. */
type LockResult = { target?: string; id?: string; playersAffected?: number; agentsAffected?: number; agentsInSubtree?: number }

type Target = { kind: 'user'; id: string } | { kind: 'staff'; id: string }

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** The chip shown in a page header while withdrawals are blocked. */
export const WithdrawBlockedBadge = ({ locks }: { locks?: AccountLocks }) =>
  locks?.withdraw ? (
    <Badge variant='destructive'>
      <BanknoteXIcon /> Withdrawals blocked
    </Badge>
  ) : null

/** The chip shown in a page header while casino and/or sports betting is locked. */
export const BetLockedBadge = ({ locks }: { locks?: AccountLocks }) => {
  if (!locks?.casino && !locks?.sports) return null
  const what = locks.casino && locks.sports ? 'Bets locked' : locks.casino ? 'Casino bets locked' : 'Sports bets locked'

  return (
    <Badge variant='destructive'>
      <LockIcon /> {what}
    </Badge>
  )
}

/**
 * Block / unblock withdrawals through the same `POST admin/locks` the other locks use
 * (`users:write`, audited as `account.lock`). On an agent it cascades to the whole subtree;
 * unblocking lifts only what this agent imposed — a block set on a child directly stays.
 */
const WithdrawBlockAction = ({ target, locks, invalidate }: { target: Target; locks?: AccountLocks; invalidate: (string | null)[][] }) => {
  const blocked = Boolean(locks?.withdraw)
  const staff = target.kind === 'staff'

  const apply = useApiMutation<boolean, LockResult>({
    fn: withdraw => api.post<LockResult>('admin/locks', { ...(staff ? { staffId: Number(target.id) } : { userId: Number(target.id) }), withdraw }),
    invalidate,
    success: (r, withdraw) => {
      const verb = withdraw ? 'blocked' : 'unblocked'

      if (!staff) return `Withdrawals ${verb}`

      return `Withdrawals ${verb} · ${plural(Number(r?.agentsAffected ?? 0), 'agent')}, ${plural(Number(r?.playersAffected ?? 0), 'user')} updated`
    }
  })

  // An older backend that does not report the state: no button, rather than a guess.
  if (locks?.withdraw === undefined) return null

  return blocked ? (
    <ConfirmDialog
      trigger={
        <Button variant='outline'>
          <BanknoteIcon /> Unblock withdrawals
        </Button>
      }
      title='Unblock withdrawals?'
      description={
        staff
          ? 'Lifts the block on this agent and on every account beneath it that this agent’s block was holding. A block set directly on a sub-agent or user, or held by another agent above them, stays.'
          : 'This user can request withdrawals again. A block held by their agent’s subtree lock stays until that agent is unblocked.'
      }
      confirmLabel='Unblock withdrawals'
      onConfirm={() => apply.mutateAsync(false)}
    />
  ) : (
    <ConfirmDialog
      trigger={
        <Button variant='outline'>
          <BanknoteXIcon /> Block withdrawals
        </Button>
      }
      title='Block withdrawals?'
      description={
        staff
          ? 'Blocks withdrawals for this agent and for every sub-agent and user in their whole subtree, immediately. Betting and deposits are not affected.'
          : 'This user can no longer request any withdrawal, payout, P2P sell or tip, effective immediately. Betting and deposits are not affected.'
      }
      confirmLabel='Block withdrawals'
      destructive
      onConfirm={() => apply.mutateAsync(true)}
    />
  )
}

export default WithdrawBlockAction
