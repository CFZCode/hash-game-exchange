'use client'

import { useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { BanIcon, LockIcon, PencilIcon, WalletIcon } from 'lucide-react'
import { parseAsStringLiteral, useQueryState } from 'nuqs'

import Can from '@/components/shared/Can'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import ErrorState from '@/components/shared/ErrorState'
import FormDialog from '@/components/shared/FormDialog'
import { SwitchField, TextAreaField, TextField } from '@/components/shared/FormField'
import JsonView from '@/components/shared/JsonView'
import Money from '@/components/shared/Money'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { formatNumber } from '@/lib/format'
import { AdjustWalletDialog } from '@/views/finance/shared'
import { PlayerBonusesTab } from '@/views/promotions/BonusBalances'
import GeoAttribution from './GeoAttribution'
import PlayerRiskTab from './PlayerRiskTab'
import PlayerStatsTab from './PlayerStatsTab'
import WithdrawBlockAction, { WithdrawBlockedBadge, type AccountLocks } from './WithdrawBlockAction'
import type { PlayerRow } from './types'

type Report = PlayerRow & { locks?: AccountLocks; wallets: Record<string, string>; createdAt: string; wagerCurrency?: string | null; referredBy?: { id: number | string; name: string | null } | null; email?: string; phone?: string; country?: string }

// `admin/user/wallet/:id/history` returns raw wallet_history rows (`coin`, `operation`,
// `new_balance`, `transaction_time`); older shapes used `currency`/`type`/`created_at`.
type Ledger = Record<string, unknown> & {
  id: number | string; currency?: string; coin?: string; amount?: string; balanceAfter?: string; balance_after?: string; new_balance?: string
  type?: string; kind?: string; operation?: string; description?: string; createdAt?: string; created_at?: string; transaction_time?: string
}
type Prefs = { email_notifications: boolean; push_notifications: boolean; theme: string; language: string; hide_balance: boolean }

const EditPlayer = ({ player }: { player: Report }) => {
  const [form, setForm] = useState({ username: player.name, email: player.email ?? '', phone: player.phone ?? '', country: player.country ?? '', password: '' })

  const update = useApiMutation({
    fn: () => {
      const body: Record<string, string> = {}

      if (form.username !== player.name) body.username = form.username
      if (form.email && form.email !== player.email) body.email = form.email
      if (form.phone && form.phone !== player.phone) body.phone = form.phone
      if (form.country && form.country !== player.country) body.country = form.country
      if (form.password) body.password = form.password

      return api.patch(`admin/players/${player.id}`, body)
    },
    invalidate: [['api', `admin/reports/players/${player.id}`]],
    success: 'User updated'
  })

  return (
    <FormDialog
      trigger={
        <Button variant='outline'>
          <PencilIcon /> Edit
        </Button>
      }
      title='Edit user'
      onSubmit={() => update.mutateAsync()}
    >
      <TextField id='e-user' label='Username' minLength={3} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
      <TextField id='e-email' label='Email' type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <div className='grid grid-cols-2 gap-4'>
        <TextField id='e-phone' label='Phone' value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <TextField id='e-country' label='Country' value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
      </div>
      <TextField id='e-pw' label='New password' type='password' hint='Leave blank to keep' value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
    </FormDialog>
  )
}

const Locks = ({ userId }: { userId: string }) => {
  const [locks, setLocks] = useState({ system: false, casino: false, sports: false })

  const apply = useApiMutation({
    fn: () => api.post('admin/locks', { userId: Number(userId), ...locks }),
    success: 'Locks updated'
  })

  return (
    <FormDialog
      trigger={
        <Button variant='outline'>
          <LockIcon /> Locks
        </Button>
      }
      title='User locks'
      description='Turning a lock on blocks that product for this user immediately. The platform does not report current lock state on this screen; set all three deliberately.'
      submitLabel='Apply locks'
      onSubmit={() => apply.mutateAsync()}
    >
      <SwitchField id='l-system' label='System lock' hint='Blocks sign-in and everything else' checked={locks.system} onChange={system => setLocks({ ...locks, system })} />
      <SwitchField id='l-casino' label='Casino lock' checked={locks.casino} onChange={casino => setLocks({ ...locks, casino })} />
      <SwitchField id='l-sports' label='Sports lock' checked={locks.sports} onChange={sports => setLocks({ ...locks, sports })} />
    </FormDialog>
  )
}

const ledgerCurrency = (r: Ledger) => r.currency ?? r.coin

// wallet_history stores `amount` unsigned and says the direction in `operation`.
const ledgerAmount = (r: Ledger) => {
  const n = Number(r.amount)

  return r.operation && /debit|withdraw/i.test(r.operation) && Number.isFinite(n) && n > 0 ? -n : r.amount
}

const ledgerColumns: Column<Ledger>[] = [
  { key: 'at', header: 'When', cell: r => <DateTime value={r.createdAt ?? r.created_at ?? r.transaction_time} /> },
  { key: 'type', header: 'Type', cell: r => <StatusBadge value={String(r.type ?? r.kind ?? r.operation ?? '')} /> },
  { key: 'amount', header: 'Amount', align: 'right', cell: r => <Money value={ledgerAmount(r)} currency={ledgerCurrency(r)} signed /> },
  { key: 'after', header: 'Balance after', align: 'right', cell: r => <Money value={r.balanceAfter ?? r.balance_after ?? r.new_balance} currency={ledgerCurrency(r)} /> },
  { key: 'desc', header: 'Description', cell: r => <span className='text-muted-foreground text-sm'>{String(r.description ?? '')}</span> }
]

type Place = { countryCode?: string | null; country?: string | null; city?: string | null; isp?: string | null; ip?: string | null }
type Login = {
  id: string | number; ipAddress: string | null; city: string | null; region: string | null; country: string | null; countryCode: string | null
  isp: string | null; asn: string | null; isProxy: boolean | null; isHosting: boolean | null; source: string | null; userAgent: string | null; device?: string | null; createdAt: string
}
type RiskLogins = {
  user: { lastIp: string | null; lastLocation?: Place; signup?: Place }
  activity: { recentLogins: Login[] }
  riskFlags?: { proxyOrHosting?: boolean; multipleCountries?: boolean; multipleIps?: boolean }
}

const flag = (cc?: string | null) => (cc && /^[A-Z]{2}$/i.test(cc) ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1f1a5 + c.charCodeAt(0))) : '')
const place = (p?: Place | null) => [p?.city, p?.country].filter(Boolean).join(', ') || '—'

const loginColumns: Column<Login>[] = [
  { key: 'at', header: 'When', cell: r => <DateTime value={r.createdAt} /> },
  { key: 'src', header: 'Event', cell: r => <Badge variant='outline'>{r.source ?? 'login'}</Badge> },
  { key: 'ip', header: 'IP', cell: r => <span className='font-mono text-sm'>{r.ipAddress ?? '—'}</span> },
  {
    key: 'where',
    header: 'Location',
    cell: r => (
      <span className='text-sm'>
        {flag(r.countryCode)} {[r.city, r.region, r.country].filter(Boolean).join(', ') || <span className='text-muted-foreground'>not resolved</span>}
      </span>
    )
  },
  {
    key: 'isp',
    header: 'Provider',
    cell: r => (
      <span className='text-sm'>
        {r.isp ?? '—'}
        {r.asn && <span className='text-muted-foreground block text-xs'>{r.asn}</span>}
      </span>
    )
  },
  {
    key: 'flags',
    header: 'Network',
    cell: r =>
      r.isProxy || r.isHosting ? (
        <Badge variant='destructive'>{r.isProxy ? 'Proxy / VPN' : 'Hosting'}</Badge>
      ) : r.isProxy === false ? (
        <span className='text-muted-foreground text-sm'>Residential</span>
      ) : (
        <span className='text-muted-foreground text-sm'>—</span>
      )
  },
  {
    key: 'ua',
    header: 'Device',
    cell: r => (
      <span className='max-w-72 text-sm'>
        {r.device ?? '—'}
        <span className='text-muted-foreground line-clamp-1 block text-xs' title={r.userAgent ?? undefined}>
          {r.userAgent ?? ''}
        </span>
      </span>
    )
  }
]

/** Where the user signs in from: latest and signup location, then every recent login with its IP's place and ISP. */
const LoginsTab = ({ userId }: { userId: string }) => {
  const q = useApi<RiskLogins>(`admin/reports/user-risk/${userId}`)
  const u = q.data?.user
  const f = q.data?.riskFlags

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <StatCard label='Last seen from' loading={q.isLoading} value={<span>{flag(u?.lastLocation?.countryCode)} {place(u?.lastLocation)}</span>} hint={[u?.lastIp, u?.lastLocation?.isp].filter(Boolean).join(' · ') || 'no login yet'} />
        <StatCard label='Signed up from' loading={q.isLoading} value={<span>{flag(u?.signup?.countryCode)} {place(u?.signup)}</span>} hint={[u?.signup?.ip, u?.signup?.isp].filter(Boolean).join(' · ') || 'not recorded'} />
        <StatCard
          label='Network flags'
          loading={q.isLoading}
          value={
            <span className='flex flex-wrap gap-1.5'>
              {f?.proxyOrHosting && <Badge variant='destructive'>Proxy / VPN</Badge>}
              {f?.multipleCountries && <Badge variant='destructive'>Several countries</Badge>}
              {f?.multipleIps && <Badge variant='outline'>Several IPs</Badge>}
              {!f?.proxyOrHosting && !f?.multipleCountries && !f?.multipleIps && <span>None</span>}
            </span>
          }
        />
      </div>
      <DataTable columns={loginColumns} rows={q.data?.activity.recentLogins} rowKey={r => String(r.id)} loading={q.isLoading} error={q.error} dense emptyMessage='No logins recorded yet.' />
      <GeoAttribution />
    </div>
  )
}

const WalletTab = ({ userId }: { userId: string }) => {
  const { state, set, query } = useListState()
  const history = usePagedApi<Ledger>(`admin/user/wallet/${userId}/history`, { limit: query.limit, page: query.page })

  return <DataTable columns={ledgerColumns} rows={history.data?.rows} rowKey={r => String(r.id)} loading={history.isLoading} error={history.error} pagination={history.data?.pagination} onPageChange={page => set({ page })} onLimitChange={limit => set({ limit })} dense emptyMessage={`No ledger entries yet (page ${state.page}).`} />
}

const PrefsTab = ({ userId }: { userId: string }) => {
  const q = useApi<Prefs>(`admin/site-config/user/${userId}`)
  const canWrite = useSession().can('config:write')

  const save = useApiMutation({
    fn: (patch: Partial<Prefs>) => api.put(`admin/site-config/user/${userId}`, patch),
    invalidate: [['api', `admin/site-config/user/${userId}`]],
    success: 'Preference saved'
  })

  if (q.error) return <ErrorState error={q.error} />
  const p = q.data

  return (
    <Card className='max-w-xl shadow-none'>
      <CardContent className='grid gap-2 pt-6'>
        <SwitchField id='p-email' label='Email notifications' checked={!!p?.email_notifications} onChange={v => save.mutate({ email_notifications: v })} disabled={!p || !canWrite} />
        <SwitchField id='p-push' label='Push notifications' checked={!!p?.push_notifications} onChange={v => save.mutate({ push_notifications: v })} disabled={!p || !canWrite} />
        <SwitchField id='p-hide' label='Hide balance' checked={!!p?.hide_balance} onChange={v => save.mutate({ hide_balance: v })} disabled={!p || !canWrite} />
        <div className='text-muted-foreground mt-2 text-sm'>Theme: {p?.theme ?? '—'} · Language: {p?.language ?? '—'}</div>
      </CardContent>
    </Card>
  )
}

// Agent-tree logins have no promotions (VIP ladder, ranks), so raw JSON drops those keys for them.
const PROMOTION_KEY = /vip|rank/i

const stripPromotionKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripPromotionKeys)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(Object.entries(value).filter(([key]) => !PROMOTION_KEY.test(key)).map(([key, v]) => [key, stripPromotionKeys(v)]))
}

const RawTab = ({ path }: { path: string }) => {
  const q = useApi<unknown>(path)
  const promotions = useSession().actor?.promotions === true

  if (q.error) return <ErrorState error={q.error} />

  return <JsonView value={q.data === undefined ? 'loading…' : promotions ? q.data : stripPromotionKeys(q.data)} />
}

/** The tabs, in order; `?tab=` picks one, so `/users/<id>?tab=stats` links straight to it. */
const TABS = ['wallet', 'stats', 'logins', 'balances', 'bonuses', 'prefs', 'risk', 'sheet', 'transfers', 'notifications'] as const

type Tab = (typeof TABS)[number]

const PlayerDetail = ({ id }: { id: string }) => {
  const router = useRouter()

  // `replace`, so flicking through tabs does not fill the back button.
  const [tabParam, setTab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('wallet').withOptions({ history: 'replace' }))
  const report = useApi<Report>(`admin/reports/players/${id}`)
  const { actor, can } = useSession()
  const promotions = actor?.promotions === true

  // `admin/site-config/user/:id` is guarded by config:read (writes by config:write): without it the
  // tab would only ever show a 403, so it is not offered at all.
  const canPrefs = can('config:read')
  const tab: Tab = tabParam === 'prefs' && !canPrefs ? 'wallet' : tabParam

  const close = useApiMutation({
    fn: (reason: string) => api.delete(`admin/players/${id}`, { reason }),
    invalidate: [['paged', 'admin/reports/players']],
    success: 'Account closed',
    onSuccess: () => router.push('/users')
  })

  const [reason, setReason] = useState('')
  const p = report.data
  const currencies = Object.keys(p?.wallets ?? {})

  return (
    <div>
      <PageHeader
        title={p?.name ?? `User ${id}`}
        description={
          p ? (
            <span className='flex flex-wrap items-center gap-2'>
              <span className='font-mono'>#{p.id}</span>
              <StatusBadge value={p.status} />
              <WithdrawBlockedBadge locks={p.locks} />
              <Badge variant='outline'>{p.channel}{p.agentId ? ` · agent #${p.agentId}` : ''}</Badge>
              {p.referredBy && (
                <span>
                  referred by{' '}
                  <Link href={`/users/${p.referredBy.id}`} className='font-medium text-primary hover:underline'>{p.referredBy.name ?? `#${p.referredBy.id}`}</Link>
                </span>
              )}
              {promotions && (
                <span>
                  VIP L{p.vip?.level} · {p.vip?.card}
                </span>
              )}
              <span>joined <DateTime value={p.createdAt} relative /></span>
            </span>
          ) : undefined
        }
        actions={
          p && (
            <>
              {/* The same grants the Wallets screen and the API use (`wallet:credit` / `wallet:debit`); there is no `wallet:adjust` on the adjust route. */}
              <Can permission={['wallet:credit', 'wallet:debit']}>
                <AdjustWalletDialog
                  userId={id}
                  userName={p.name}
                  currencies={currencies}
                  trigger={
                    <Button variant='outline'>
                      <WalletIcon /> Adjust balance
                    </Button>
                  }
                />
              </Can>
              <Can permission='users:write'>
                <Locks userId={id} />
                <WithdrawBlockAction target={{ kind: 'user', id }} locks={p.locks} invalidate={[['api', `admin/reports/players/${id}`], ['api', `admin/reports/players/${id}/status-stats`]]} />
                <EditPlayer player={p} />
                <ConfirmDialog
                  trigger={
                    <Button variant='destructive'>
                      <BanIcon /> Close account
                    </Button>
                  }
                  title='Close this account?'
                  description='The user will no longer be able to sign in. Funds stay on the ledger.'
                  confirmLabel='Close account'
                  destructive
                  onConfirm={() => close.mutateAsync(reason)}
                >
                  <TextAreaField id='close-reason' label='Reason' required minLength={3} value={reason} onChange={e => setReason(e.target.value)} />
                </ConfirmDialog>
              </Can>
            </>
          )
        }
      />
      {report.error && <ErrorState error={report.error} />}

      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatCard label='Balance' value={<Money value={p?.balance} currency='INR' />} loading={report.isLoading} hint={currencies.map(c => `${c} ${p?.wallets[c]}`).join(' · ')} />
        <StatCard label='Gateway deposits' value={<Money value={p?.totalDeposited} currency='INR' />} loading={report.isLoading} hint='Lifetime bank + gateway, paid in by the player · excludes credits from upline' />
        <StatCard label='Withdrawn' value={<Money value={p?.totalWithdrawn} currency='INR' />} loading={report.isLoading} />
        <StatCard label='Wagered' value={<Money value={p?.wager} currency={p?.wagerCurrency ?? 'USD'} digits={2} />} loading={report.isLoading} hint={`${formatNumber(p?.gamesPlayed)} bets · ref ${p?.referralCode ?? ''}`} />
      </div>

      <Tabs value={tab} onValueChange={value => void setTab(value as Tab)} className='mt-6'>
        <TabsList className='mb-4 flex-wrap'>
          <TabsTrigger value='wallet'>Ledger</TabsTrigger>
          <TabsTrigger value='stats'>Stats</TabsTrigger>
          <TabsTrigger value='logins'>Logins</TabsTrigger>
          <TabsTrigger value='balances'>Balances</TabsTrigger>
          <TabsTrigger value='bonuses'>Bonuses</TabsTrigger>
          {canPrefs && <TabsTrigger value='prefs'>Preferences</TabsTrigger>}
          <TabsTrigger value='risk'>Risk</TabsTrigger>
          <TabsTrigger value='sheet'>Balance sheet</TabsTrigger>
          <TabsTrigger value='transfers'>Transfers</TabsTrigger>
          <TabsTrigger value='notifications'>Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value='wallet'>
          <WalletTab userId={id} />
        </TabsContent>
        <TabsContent value='stats'>
          <PlayerStatsTab userId={id} />
        </TabsContent>
        <TabsContent value='bonuses'>
          <PlayerBonusesTab userId={id} />
        </TabsContent>
        <TabsContent value='logins'>
          <LoginsTab userId={id} />
        </TabsContent>
        <TabsContent value='balances'>
          <RawTab path={`admin/user/wallet/${id}/balances`} />
        </TabsContent>
        {canPrefs && (
          <TabsContent value='prefs'>
            <PrefsTab userId={id} />
          </TabsContent>
        )}
        <TabsContent value='risk'>
          <PlayerRiskTab userId={id} />
        </TabsContent>
        <TabsContent value='sheet'>
          <RawTab path={`admin/reports/balance-sheet/${id}`} />
        </TabsContent>
        <TabsContent value='transfers'>
          <RawTab path={`admin/locks/transfers/${id}`} />
        </TabsContent>
        <TabsContent value='notifications'>
          <RawTab path={`admin/notifications/history/${id}`} />
        </TabsContent>
      </Tabs>
      <Card className='mt-6 shadow-none'>
        <CardHeader>
          <CardTitle className='text-base'>Raw report</CardTitle>
        </CardHeader>
        <CardContent>
          <JsonView value={promotions ? p : stripPromotionKeys(p)} />
        </CardContent>
      </Card>
    </div>
  )
}

export default PlayerDetail
