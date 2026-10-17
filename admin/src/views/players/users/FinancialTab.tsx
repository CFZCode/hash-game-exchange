'use client'

import { useState, type ReactNode } from 'react'

import { BanIcon, CircleCheckIcon, DicesIcon, GaugeIcon, LockIcon, UsersIcon, WalletIcon } from 'lucide-react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import FormDialog from '@/components/shared/FormDialog'
import { TextField } from '@/components/shared/FormField'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { TxnPasswordLabel } from '@/views/finance/StaffFloat'
import { Chip, StatCard, TONES, inr, type Tone } from './shared'

/**
 * Users → Financial → Withdrawal — reference admin (admin-structure.zip →
 * components/users/FinancialTab.tsx `WithdrawalControl`) jaisa:
 *
 *   Global Withdrawals  ON / OFF                           PUT admin/withdrawal-control/global
 *   Withdrawal limit    read-only — owner panel → Features & plan → Withdrawals
 *   Wagering bonus      read-only — same
 *   Direct users / Withdrawal locked cards
 *   Per-user withdrawal lock table                         GET admin/withdrawal-control/users + POST admin/locks
 *
 * Global switch transaction password se confirm hota hai (sirf owner / Super Admin).
 */

const API = 'admin/withdrawal-control'

type Summary = {
  enabled: boolean
  updatedAt: string | null
  updatedBy: { id: string; name: string | null } | null
  limit: { enabled: boolean; depositMultiplier: number; wagerBonus: boolean; wagerMultiplier: number; source: 'owner' }
  directUsers: number
  lockedDirectUsers: number
}

type LockUser = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  country: string | null
  created: string | null
  inrBalance: string
  withdrawLocked: boolean
  systemLocked: boolean
  deposited: string
  withdrawn: string
  wagered: string
  wagerBonus: string
  maxWithdrawable: string | null
}

/** Global switch ka pending change — confirm dialog (transaction password) ke baad jaata hai. */
type Pending = { enabled: boolean }

const fmtMult = (n: number) => `${Number(n)}×`
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

/** Ek setting card: icon box + title + text, right me ON/OFF chip + switch (+ multiplier input). */
const SettingCard = ({
  icon,
  tone,
  on,
  title,
  children,
  loading,
  danger,
  control
}: {
  icon: ReactNode
  tone: Tone
  on: boolean
  title: ReactNode
  children: ReactNode
  loading?: boolean
  danger?: boolean
  control: ReactNode
}) => (
  <Card className={cn('flex flex-row flex-wrap items-center justify-between gap-4 p-5', danger && 'border-danger/60')}>
    <div className='flex min-w-0 flex-[1_1_320px] items-center gap-4'>
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5', on ? TONES[tone] : 'bg-muted text-muted-foreground')}>{icon}</span>
      <div className='min-w-0'>
        {loading ? <Skeleton className='h-5 w-56' /> : <p className='font-bold'>{title}</p>}
        <div className='text-muted-foreground mt-1 text-sm'>{children}</div>
      </div>
    </div>
    <div className='flex flex-wrap items-center gap-3'>{loading ? <Skeleton className='h-8 w-40' /> : control}</div>
  </Card>
)

const OnOff = ({ on, tone }: { on: boolean; tone: Tone }) => (
  <Chip tone={tone} className={cn('min-w-12 text-center tracking-widest', !on && 'bg-muted text-muted-foreground')}>
    {on ? 'ON' : 'OFF'}
  </Chip>
)

/** Owner panel se aane wali setting ka badge — admin yahan badal nahi sakta. */
const OwnerBadge = () => (
  <span className='text-muted-foreground bg-muted inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap'>Set in the owner panel</span>
)

const WithdrawalControl = () => {
  const { can } = useSession()
  const canEdit = can('wallet:adjust')
  const summary = useApi<Summary>(API, undefined, { retry: false })
  const s = summary.data
  const loading = summary.isLoading

  const [pending, setPending] = useState<Pending | null>(null)
  const [password, setPassword] = useState('')

  const close = () => {
    setPending(null)
    setPassword('')
  }

  const save = useApiMutation({
    fn: () => {
      if (!pending) return Promise.resolve(null)

      return api.put(`${API}/global`, { enabled: pending.enabled, transactionPassword: password })
    },
    invalidate: [['api', API], ['paged', `${API}/users`]],
    success: 'Saved',
    onSuccess: close
  })

  const enabled = s?.enabled ?? true
  const limit = s?.limit
  const limitOn = Boolean(limit?.enabled)
  const wagerOn = Boolean(limit?.wagerBonus)
  const m = limit?.depositMultiplier ?? 3
  const w = limit?.wagerMultiplier ?? 5

  // Confirm dialog ka title / text — reference jaisa.
  const confirm = !pending
    ? null
    : pending.enabled
      ? { title: 'Turn withdrawals ON?', body: 'Players can request withdrawals again by every method.' }
      : { title: 'Turn withdrawals OFF?', body: 'No player will be able to withdraw by any method until you switch it back on.' }

  return (
    <div className='flex flex-col gap-4'>
      {/* Global switch */}
      <SettingCard
        icon={enabled ? <CircleCheckIcon /> : <BanIcon />}
        tone={enabled ? 'success' : 'danger'}
        on
        danger={Boolean(s) && !enabled}
        loading={loading}
        title='Global Withdrawals'
        control={
          <>
            <Chip tone={enabled ? 'success' : 'danger'} className='min-w-12 text-center tracking-widest'>
              {enabled ? 'ON' : 'OFF'}
            </Chip>
            <Switch checked={enabled} disabled={!s || !canEdit} onCheckedChange={() => setPending({ enabled: !enabled })} aria-label='Global withdrawals' />
          </>
        }
      >
        Applies to every player and every method: bank / UPI, payment gateway, crypto, P2P sell and tips.
        <p className='mt-1 text-xs'>
          Last config change: {fmtDate(s?.updatedAt)}
          {s?.updatedBy?.name ? ` by ${s.updatedBy.name}` : ''}
        </p>
      </SettingCard>

      {s && !enabled && (
        <p className='bg-danger/10 text-danger border-danger/30 rounded-md border px-3 py-2 text-sm'>
          Withdrawals are OFF. No player can withdraw by any method until this is switched back on.
        </p>
      )}

      {/* Deposit-based withdrawal limit — owner panel ki setting, yahan read-only */}
      <SettingCard
        icon={<GaugeIcon />}
        tone='warning'
        on={limitOn}
        loading={loading}
        title={<>Withdrawal limit: {limitOn ? `${fmtMult(m)} total deposits` : 'off'}</>}
        control={
          <>
            <OnOff on={limitOn} tone='warning' />
            <OwnerBadge />
          </>
        }
      >
        Every player can withdraw at most this many times what they have deposited, in each currency, plus the wagering bonus below. Agent transfers count as INR deposits, and pending
        withdrawals count toward the limit.
      </SettingCard>

      {/* Wagering bonus on top of the deposit limit — owner panel ki setting, yahan read-only */}
      <SettingCard
        icon={<DicesIcon />}
        tone='info'
        on={limitOn && wagerOn}
        loading={loading}
        title={<>Wagering bonus: {wagerOn ? `up to ${fmtMult(w)} total deposits` : 'off'}</>}
        control={
          <>
            <OnOff on={limitOn && wagerOn} tone='info' />
            <OwnerBadge />
          </>
        }
      >
        Extra room on top of the withdrawal limit, earned by playing: every rupee the player bets (casino and settled sports bets, refunds excluded) adds a rupee to their limit, until it
        reaches this many times their deposits.
        {s && (
          <p className='mt-1 text-xs'>
            {!limitOn
              ? 'No effect while the withdrawal limit is off.'
              : wagerOn
                ? `Example: ₹1,000 deposited and ₹1,000 wagered → ${inr(1000 * m)} + ${inr(Math.min(1000, 1000 * w))} = ${inr(1000 * m + Math.min(1000, 1000 * w))}.`
                : `Example: ₹1,000 deposited → max ${inr(1000 * m)}, however much is wagered.`}
          </p>
        )}
      </SettingCard>

      <div className='grid gap-4 sm:grid-cols-2'>
        <StatCard label='Direct users' value={(s?.directUsers ?? 0).toLocaleString('en-IN')} icon={<UsersIcon />} tone='primary' loading={loading} />
        <StatCard label='Withdrawal locked' value={(s?.lockedDirectUsers ?? 0).toLocaleString('en-IN')} icon={<LockIcon />} tone='danger' loading={loading} />
      </div>

      <LockTable />

      <FormDialog
        open={pending !== null}
        onOpenChange={o => !o && close()}
        trigger={null}
        title={confirm?.title ?? ''}
        description={confirm?.body}
        submitLabel='Confirm'
        onSubmit={() => save.mutateAsync()}
      >
        <TextField id='wc-tp' label={<TxnPasswordLabel />} type='password' required value={password} onChange={e => setPassword(e.target.value)} />
      </FormDialog>
    </div>
  )
}

/** Per-user withdrawal lock — direct users, reference jaisi columns. Lock switch = `POST admin/locks`. */
const LockTable = () => {
  const { can } = useSession()
  const { state, set, query } = useListState(['status'])
  const status = query.status === 'locked' ? 'locked' : 'all'

  const list = usePagedApi<LockUser>(`${API}/users`, {
    limit: query.limit,
    page: query.page,
    search: query.search || undefined,
    status
  })

  const toggle = useApiMutation<{ id: string; locked: boolean }>({
    fn: ({ id, locked }) => api.post('admin/locks', { userId: Number(id), withdraw: locked }),
    invalidate: [['paged', `${API}/users`], ['api', API]],
    success: (_r, v) => `Withdrawals ${v.locked ? 'locked' : 'unlocked'}`
  })

  const columns: Column<LockUser>[] = [
    {
      key: 'user',
      header: 'User',
      cell: r => (
        <div className='min-w-0'>
          <p className='truncate font-semibold'>{r.name || '—'}</p>
          <p className='text-muted-foreground truncate text-xs'>
            {r.email || '—'}
            {r.country ? ` · ${r.country}` : ''} · <span className='font-mono'>{r.id}</span>
          </p>
        </div>
      )
    },
    { key: 'phone', header: 'Phone', cell: r => <span className='text-muted-foreground text-sm whitespace-nowrap'>{r.phone || '—'}</span> },
    { key: 'bal', header: 'INR balance', align: 'right', cell: r => <span className='font-semibold tabular-nums'>{inr(r.inrBalance)}</span> },
    { key: 'dep', header: 'Deposited', align: 'right', cell: r => <span className='text-success tabular-nums'>{inr(r.deposited)}</span> },
    {
      key: 'wager',
      header: 'Wagered',
      align: 'right',
      cell: r => (
        <span className='tabular-nums'>
          {inr(r.wagered)}
          {Number(r.wagerBonus) > 0 && <span className='text-info block text-xs'>+{inr(r.wagerBonus)} bonus</span>}
        </span>
      )
    },
    {
      key: 'wd',
      header: 'Withdrawn / max',
      align: 'right',
      cell: r => (
        <span className='tabular-nums whitespace-nowrap'>
          <span className='text-danger'>{inr(r.withdrawn)}</span>
          <span className='text-muted-foreground'> / {r.maxWithdrawable === null ? 'no limit' : inr(r.maxWithdrawable)}</span>
        </span>
      )
    },
    { key: 'joined', header: 'Joined', cell: r => <span className='text-muted-foreground text-xs whitespace-nowrap'>{fmtDate(r.created)}</span> },
    { key: 'wds', header: 'Withdrawals', cell: r => (r.withdrawLocked || r.systemLocked ? <Chip tone='danger'>Locked</Chip> : <Chip tone='success'>Allowed</Chip>) },
    {
      key: 'lock',
      header: 'Lock',
      align: 'center',
      cell: r => (
        <Switch
          checked={r.withdrawLocked}
          disabled={!can('users:write') || toggle.isPending}
          onCheckedChange={locked => toggle.mutate({ id: r.id, locked })}
          aria-label={`Withdrawal lock for ${r.name ?? r.id}`}
        />
      )
    }
  ]

  return (
    <Card className='gap-0 p-4'>
      <h2 className='mb-2 font-bold'>Per-user withdrawal lock</h2>
      <DataTable
        columns={columns}
        rows={list.data?.rows}
        rowKey={r => r.id}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error}
        pagination={list.data?.pagination}
        onPageChange={p => set({ page: p })}
        onLimitChange={limit => set({ limit })}
        search={String(state.search ?? '')}
        onSearchChange={search => set({ search })}
        searchPlaceholder='Search name, email, phone or ID'
        toolbar={
          <div className='flex rounded-md border p-0.5'>
            {(['all', 'locked'] as const).map(v => (
              <button
                key={v}
                type='button'
                onClick={() => set({ status: v === 'all' ? '' : v, page: 1 })}
                className={cn('rounded px-3 py-1 text-sm font-semibold capitalize', status === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />
    </Card>
  )
}

/** Financial tab — section chip "Withdrawal" (reference me abhi ek hi section). */
const FinancialTab = () => (
  <div className='flex flex-col gap-4'>
    <div className='flex'>
      <span className='bg-card flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold'>
        <WalletIcon className='size-4' /> Withdrawal
      </span>
    </div>
    <WithdrawalControl />
  </div>
)

export default FinancialTab
