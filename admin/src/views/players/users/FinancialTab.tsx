'use client'

import { useState, type ReactNode } from 'react'

import { BanIcon, CircleCheckIcon, DicesIcon, GaugeIcon, LockIcon, UsersIcon, WalletIcon } from 'lucide-react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import FormDialog from '@/components/shared/FormDialog'
import { TextField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
 *   Withdrawal limit    ON / OFF + multiplier (× deposits) PUT admin/withdrawal-control/limit
 *   Wagering bonus      ON / OFF + "bonus up to"           PUT admin/withdrawal-control/limit
 *   Direct users / Withdrawal locked cards
 *   Per-user withdrawal lock table                         GET admin/withdrawal-control/users + POST admin/locks
 *
 * Har setting change transaction password se confirm hota hai (sirf owner). Limit jab tak admin
 * save na kare, owner panel wali setting chalti hai (`limit.source = 'owner'`).
 */

const API = 'admin/withdrawal-control'
const MULTIPLIER_MIN = 0.1
const MULTIPLIER_MAX = 100

type Summary = {
  enabled: boolean
  updatedAt: string | null
  updatedBy: { id: string; name: string | null } | null
  limit: { enabled: boolean; depositMultiplier: number; wagerBonus: boolean; wagerMultiplier: number; source: 'admin' | 'owner' }
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

/** Ek pending change — confirm dialog (transaction password) ke baad jaata hai. */
type Pending =
  | { kind: 'global'; enabled: boolean }
  | { kind: 'limit'; enabled?: boolean; depositMultiplier?: number }
  | { kind: 'wager'; wagerBonus?: boolean; wagerMultiplier?: number }

const fmtMult = (n: number) => `${Number(n)}×`
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

const multiplierError = (raw: string) => {
  const n = Number(raw)

  if (raw.trim() === '' || !Number.isFinite(n)) return 'Enter a number'
  if (n < MULTIPLIER_MIN || n > MULTIPLIER_MAX) return `Between ${MULTIPLIER_MIN} and ${MULTIPLIER_MAX}`
  if (Math.round(n * 100) !== n * 100) return 'At most 2 decimals'

  return null
}

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

/** Multiplier input + Save (Enter bhi). */
const MultiplierInput = ({ id, label, value, disabled, onSave }: { id: string; label: string; value: number | undefined; disabled?: boolean; onSave: (n: number) => void }) => {
  // Draft: jab tak user ne kuch type nahi kiya, saved value hi dikhti hai.
  const [draft, setDraft] = useState<string | null>(null)
  const raw = draft ?? (value !== undefined ? String(value) : '')
  const setRaw = (v: string) => setDraft(v)

  const submit = () => {
    onSave(Number(raw))
    setDraft(null)
  }

  const error = multiplierError(raw)
  const dirty = value !== undefined && !error && Number(raw) !== Number(value)

  return (
    <div className='flex items-start gap-2'>
      <div>
        <div className='relative'>
          <Input
            id={id}
            aria-label={label}
            type='number'
            min={MULTIPLIER_MIN}
            max={MULTIPLIER_MAX}
            step={0.5}
            className='w-28 pr-7'
            value={raw}
            disabled={disabled}
            onChange={e => setRaw(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && dirty) submit()
            }}
          />
          <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm'>×</span>
        </div>
        <p className={cn('mt-1 h-4 text-xs', error ? 'text-danger' : 'text-muted-foreground')}>{value !== undefined && error ? error : label}</p>
      </div>
      <Button disabled={!dirty || disabled} onClick={submit}>
        Save
      </Button>
    </div>
  )
}

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
      const { kind, ...body } = pending

      return api.put(`${API}/${kind === 'global' ? 'global' : 'limit'}`, { ...body, transactionPassword: password })
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

  // Confirm dialog ka title / text — reference jaisa.
  const confirm = (() => {
    if (!pending) return null
    if (pending.kind === 'global')
      return pending.enabled
        ? { title: 'Turn withdrawals ON?', body: 'Players can request withdrawals again by every method.' }
        : { title: 'Turn withdrawals OFF?', body: 'No player will be able to withdraw by any method until you switch it back on.' }
    if (pending.kind === 'limit')
      return pending.depositMultiplier !== undefined
        ? { title: `Set the withdrawal limit to ${fmtMult(pending.depositMultiplier)}?`, body: 'Every player can then withdraw at most this many times their deposits (plus the wagering bonus).' }
        : pending.enabled
          ? { title: 'Turn the withdrawal limit ON?', body: `Every player can withdraw at most ${fmtMult(m)} their deposits, plus the wagering bonus.` }
          : { title: 'Turn the withdrawal limit OFF?', body: 'Players can withdraw their whole balance again (other rules still apply).' }

    return pending.wagerMultiplier !== undefined
      ? { title: `Set the wagering bonus to ${fmtMult(pending.wagerMultiplier)}?`, body: 'The bonus unlocks rupee for rupee with the amount bet, up to this many times the deposits.' }
      : pending.wagerBonus
        ? { title: 'Turn the wagering bonus ON?', body: 'Betting raises the withdrawal limit rupee for rupee, up to the bonus multiplier.' }
        : { title: 'Turn the wagering bonus OFF?', body: 'The withdrawal limit will be deposits × multiplier only.' }
  })()

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
            <Switch checked={enabled} disabled={!s || !canEdit} onCheckedChange={() => setPending({ kind: 'global', enabled: !enabled })} aria-label='Global withdrawals' />
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

      {/* Deposit-based withdrawal limit */}
      <SettingCard
        icon={<GaugeIcon />}
        tone='warning'
        on={limitOn}
        loading={loading}
        title={<>Withdrawal limit: {limitOn ? `${fmtMult(m)} total deposits` : 'off'}</>}
        control={
          <>
            <OnOff on={limitOn} tone='warning' />
            <Switch checked={limitOn} disabled={!s || !canEdit} onCheckedChange={() => setPending({ kind: 'limit', enabled: !limitOn })} aria-label='Deposit-based withdrawal limit' />
            <MultiplierInput id='wc-mult' label='Multiplier' value={limit?.depositMultiplier} disabled={!s || !canEdit} onSave={n => setPending({ kind: 'limit', depositMultiplier: n })} />
          </>
        }
      >
        Every player can withdraw at most this many times what they have deposited, in each currency, plus the wagering bonus below. Agent transfers count as INR deposits, and pending
        withdrawals count toward the limit.
        {limit?.source === 'owner' && <p className='text-warning mt-1 text-xs'>Using the owner panel setting until you save a change here.</p>}
      </SettingCard>

      {/* Wagering bonus on top of the deposit limit */}
      <SettingCard
        icon={<DicesIcon />}
        tone='info'
        on={limitOn && wagerOn}
        loading={loading}
        title={<>Wagering bonus: {wagerOn ? `up to ${fmtMult(limit?.wagerMultiplier ?? 5)} total deposits` : 'off'}</>}
        control={
          <>
            <OnOff on={wagerOn} tone='info' />
            <Switch checked={wagerOn} disabled={!s || !canEdit} onCheckedChange={() => setPending({ kind: 'wager', wagerBonus: !wagerOn })} aria-label='Wagering bonus' />
            <MultiplierInput id='wc-wager' label='Bonus up to' value={limit?.wagerMultiplier} disabled={!s || !canEdit} onSave={n => setPending({ kind: 'wager', wagerMultiplier: n })} />
          </>
        }
      >
        Added on top of the withdrawal limit. It unlocks rupee for rupee with the amount the player has bet (casino and settled sports bets, refunds excluded) and stops at this many
        times their deposits.
        {s && (
          <p className='mt-1 text-xs'>
            {!limitOn
              ? 'No effect while the withdrawal limit is off.'
              : wagerOn
                ? `Example: ₹1,000 deposited and ₹1,000 wagered → ${inr(1000 * m)} + ${inr(1000)} = ${inr(1000 * m + 1000)}.`
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
      <span className='border-primary/50 bg-primary/15 flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold'>
        <WalletIcon className='size-4' /> Withdrawal
      </span>
    </div>
    <WithdrawalControl />
  </div>
)

export default FinancialTab
