'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import {
  ArrowLeftRightIcon,
  ChevronUpIcon,
  HistoryIcon,
  LockIcon,
  MinusIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon
} from 'lucide-react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApi, useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useCurrencyCodes } from '@/views/finance/useCurrencyCodes'
import type { OwnerWallet } from '@/views/exchange/types'

/** `GET admin/direct-wallet/users` ki ek row. */
type DirectUserRow = { id: string; name: string; status: string | null; balances: Record<string, string> }

/** `GET admin/direct-wallet/currencies` — 1 unit = kitne INR. */
type CurrencyRate = { code: string; inrRate: string }

/** `GET admin/direct-wallet/users/:id/history` ki ek row. */
type HistoryRow = {
  id: string
  coin: string
  operation: 'credit' | 'debit' | string
  amount: string
  previousBalance: string
  newBalance: string
  description: string | null
  createdAt: string
}

const BASE = 'admin/direct-wallet'

/** Amount me sirf number aur ek point (zip jaisa). */
const cleanAmount = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')

/** Is currency me `amount` = kitne INR (preview ke liye; asli hisaab server karta hai). */
const inrOf = (amount: string, rate?: string) => (amount && rate ? Number(amount) * Number(rate) : 0)

/** Zip jaisa 4 decimal. */
const fmt4 = (v?: string | number) => Number(v ?? 0).toFixed(4)

// Zip ke avatar rang — naam se ek fixed rang.
const AVATAR_COLORS = ['#2B6EF5', '#7B5EF5', '#0ECC68', '#FFC23F', '#E01B4F', '#5581F7']

const avatarColor = (name: string) => {
  let h = 0

  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)

  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

/** Zip ke icon buttons: halka rangeen square, hover pe gehra. */
const ICON_BTN = 'size-8 rounded-md'

/**
 * Row ke neeche khulne wala "Manage Funds" — zip jaisa: upar Transaction Password, neeche
 * Debit Funds (laal) aur Credit Funds (hara). Credit = Super Admin ke Direct User wallet se
 * INR value katti hai, Debit = user se liya, INR value wallet me wapas.
 */
const ManageFunds = ({ row, currency, rate, onDone }: { row: DirectUserRow; currency: string; rate?: string; onDone: () => void }) => {
  const [credit, setCredit] = useState('')
  const [debit, setDebit] = useState('')
  const [password, setPassword] = useState('')

  const run = useApiMutation<{ operation: 'credit' | 'debit'; amount: string }, { inrValue: string }>({
    fn: ({ operation, amount }) => api.post(`${BASE}/adjust`, { userId: row.id, currency, amount, operation, transactionPassword: password }),
    invalidate: [['paged', `${BASE}/users`], ['api', 'admin/exchange/owner/wallet'], ['paged', 'admin/exchange/owner/direct-ledger'], ['paged', `${BASE}/users/${row.id}/history`]],
    success: (r, { operation, amount }) =>
      `Successfully ${operation === 'credit' ? 'credited' : 'debited'} ${amount} ${currency} · ₹${Number(r?.inrValue ?? 0).toLocaleString()} ${operation === 'credit' ? 'from' : 'back to'} your wallet`,
    onSuccess: (_r, { operation }) => {
      if (operation === 'credit') setCredit('')
      else setDebit('')
      setPassword('')
      onDone()
    }
  })

  const ready = (amount: string) => Number(amount) > 0 && password.length > 0 && !run.isPending
  const busy = (op: 'credit' | 'debit') => run.isPending && run.variables?.operation === op

  const side = (op: 'credit' | 'debit', value: string, setValue: (v: string) => void) => {
    const isCredit = op === 'credit'

    return (
      <div className={cn('bg-card rounded-xl border p-4', isCredit ? 'border-success/25' : 'border-danger/25')}>
        <div className={cn('mb-3 flex items-center gap-2 text-sm font-bold', isCredit ? 'text-success' : 'text-danger')}>
          {isCredit ? <TrendingUpIcon className='size-4' /> : <TrendingDownIcon className='size-4' />}
          {isCredit ? 'Credit Funds' : 'Debit Funds'}
        </div>
        <div className='flex gap-2'>
          <Input
            inputMode='decimal'
            placeholder={`Amount in ${currency}`}
            value={value}
            onChange={e => setValue(cleanAmount(e.target.value))}
            className={cn('bg-background', isCredit ? 'focus-visible:border-success hover:border-success/60' : 'focus-visible:border-danger hover:border-danger/60')}
          />
          <Button
            disabled={!ready(value)}
            onClick={() => run.mutate({ operation: op, amount: value })}
            className={cn('text-white', isCredit ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90')}
          >
            {busy(op) ? <RefreshCwIcon className='animate-spin' /> : isCredit ? <PlusIcon /> : <MinusIcon />}
            {isCredit ? 'Credit' : 'Debit'}
          </Button>
        </div>
        {value && (
          <p className='text-muted-foreground mt-1.5 text-xs'>
            ≈ ₹{inrOf(value, rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} {isCredit ? 'from' : 'back to'} your wallet
          </p>
        )}
      </div>
    )
  }

  return (
    <div className='py-1'>
      <div className='bg-card mb-4 max-w-md rounded-xl border p-4'>
        <div className='text-warning mb-3 flex items-center gap-2 text-sm font-bold'>
          <LockIcon className='size-4' /> Transaction Password
        </div>
        <Input
          type='password'
          autoComplete='off'
          placeholder='Enter transaction password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          className='bg-background focus-visible:border-warning hover:border-warning/60'
        />
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        {side('debit', debit, setDebit)}
        {side('credit', credit, setCredit)}
      </div>
    </div>
  )
}

/** Ek user ki Transaction History — currency filter ke saath (zip ka history modal). */
const HistoryDialog = ({ user, codes, onClose }: { user: DirectUserRow | null; codes: string[]; onClose: () => void }) => {
  const [coin, setCoin] = useState('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const list = usePagedApi<HistoryRow>(user ? `${BASE}/users/${user.id}/history` : null, {
    page,
    limit,
    currency: coin === 'all' ? undefined : coin
  })

  const columns: Column<HistoryRow>[] = [
    { key: 'when', header: 'Date & Time', cell: r => (
        <span className='text-muted-foreground text-xs'>
          <DateTime value={r.createdAt} />
        </span>
      )
    },
    { key: 'coin', header: 'Coin', cell: r => <span className='text-xs font-bold uppercase'>{r.coin}</span> },
    {
      key: 'op',
      header: 'Operation',
      cell: r => {
        const isCredit = r.operation === 'credit'

        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize',
              isCredit ? 'bg-success-soft text-success border-success/30' : 'bg-danger-soft text-danger border-danger/30'
            )}
          >
            {isCredit ? <TrendingUpIcon className='size-3' /> : <TrendingDownIcon className='size-3' />}
            {r.operation}
          </span>
        )
      }
    },
    { key: 'amount', header: 'Amount', cell: r => <span className='text-warning font-mono text-xs font-bold'>{r.amount}</span> },
    { key: 'prev', header: 'Prev Balance', cell: r => <span className='text-muted-foreground font-mono text-xs'>{r.previousBalance}</span> },
    { key: 'new', header: 'New Balance', cell: r => <span className='font-mono text-xs font-semibold'>{r.newBalance}</span> }
  ]

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <HistoryIcon className='text-primary size-5' /> Transaction History
          </DialogTitle>
          <DialogDescription>
            {user?.name} · UID {user?.id}
          </DialogDescription>
        </DialogHeader>
        <DataTable
          columns={columns}
          rows={list.data?.rows}
          rowKey={r => r.id}
          loading={list.isLoading}
          fetching={list.isFetching}
          error={list.error}
          pagination={list.data?.pagination}
          onPageChange={setPage}
          onLimitChange={l => {
            setLimit(l)
            setPage(1)
          }}
          toolbar={
            <Select
              value={coin}
              onValueChange={v => {
                if (!v) return
                setCoin(v)
                setPage(1)
              }}
            >
              <SelectTrigger className='w-44' aria-label='Filter by currency'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Currencies</SelectItem>
                {codes.map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          emptyMessage={
            <div className='flex flex-col items-center gap-2 py-6'>
              <HistoryIcon className='text-border size-10' />
              No transactions found{coin !== 'all' && ` for ${coin}`}
            </div>
          }
          dense
        />
        <div className='flex justify-end'>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Wallets — admin-structure.zip ka "Wallet" (WalletUpdate) page, wahi look.
 * Sirf direct users (koi parent nahi). Har row me currency chuno, uska balance dikhe;
 * "Manage Funds" se Credit / Debit (transaction password ke saath), "History" se us user ki
 * history. Paisa Super Admin ke Direct User wallet (staff_balances) se — non-INR currency
 * rate ke hisaab se INR me kat-ti hai. Sports agent ke users yahan nahi aate.
 */
const DirectUserWallet = () => {
  const { state, set, query } = useListState()
  const list = usePagedApi<DirectUserRow>(`${BASE}/users`, { limit: query.limit, page: query.page, search: query.search || undefined })
  const rates = useApi<CurrencyRate[]>(`${BASE}/currencies`)
  const wallet = useApi<OwnerWallet>('admin/exchange/owner/wallet')
  const enabled = useCurrencyCodes()

  // Dropdown: owner ki chalu currencies me se jinka rate hai. INR pehle.
  const codes = useMemo(() => {
    const allowed = new Set(enabled.map(c => c.toUpperCase()))

    return (rates.data ?? []).map(r => r.code).filter(c => c === 'INR' || allowed.has(c))
  }, [rates.data, enabled])

  const rateOf = useMemo(() => new Map((rates.data ?? []).map(r => [r.code, r.inrRate])), [rates.data])

  const [currencyOf, setCurrencyOf] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [historyUser, setHistoryUser] = useState<DirectUserRow | null>(null)

  const coinFor = (id: string) => currencyOf[id] ?? 'INR'
  const pg = list.data?.pagination
  const offset = pg ? (pg.page - 1) * pg.limit : 0

  const columns: Column<DirectUserRow>[] = [
    { key: 'n', header: '#', cell: (_r, i) => <span className='text-muted-foreground text-xs'>{offset + i + 1}</span> },
    {
      key: 'user',
      header: 'User',
      cell: r => (
        <Link href={`/users/${r.id}`} className='flex items-center gap-3 hover:underline'>
          <span className='flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white' style={{ background: avatarColor(r.name) }}>
            {r.name.slice(0, 2).toUpperCase()}
          </span>
          <span className='text-sm font-semibold'>{r.name}</span>
        </Link>
      )
    },
    {
      key: 'uid',
      header: 'UID',
      cell: r => <span className='bg-primary/8 text-info inline-block rounded px-2 py-0.5 font-mono text-xs'>{r.id}</span>
    },
    {
      key: 'currency',
      header: 'Currency',
      cell: r => (
        <Select value={coinFor(r.id)} onValueChange={v => v && setCurrencyOf(p => ({ ...p, [r.id]: v }))}>
          <SelectTrigger className='bg-background h-8 w-24 text-xs' aria-label='Currency'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {codes.map(c => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
    {
      key: 'balance',
      header: 'Balance',
      cell: r => (
        <span className='bg-warning-soft text-warning border-warning/25 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs font-bold'>
          <WalletIcon className='size-3' />
          {fmt4(r.balances[coinFor(r.id)])}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: r => {
        const isOpen = open === r.id

        return (
          <div className='flex gap-1.5'>
            <Button size='icon-sm' title='Transaction History' className={cn(ICON_BTN, 'bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-none')} onClick={() => setHistoryUser(r)}>
              <HistoryIcon />
            </Button>
            <Button
              size='icon-sm'
              title='Manage Funds'
              className={cn(ICON_BTN, 'bg-[#7B5EF5]/10 text-[#7B5EF5] hover:bg-[#7B5EF5]/20 hover:shadow-none')}
              onClick={() => setOpen(o => (o === r.id ? null : r.id))}
            >
              {isOpen ? <ChevronUpIcon /> : <ArrowLeftRightIcon />}
            </Button>
          </div>
        )
      }
    }
  ]

  const total = pg?.total ?? list.data?.rows.length ?? 0

  return (
    <div>
      <DataTable
        columns={columns}
        rows={list.data?.rows}
        rowKey={r => r.id}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error}
        pagination={pg}
        onPageChange={page => set({ page })}
        onLimitChange={limit => set({ limit })}
        toolbar={
          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <span className='bg-primary/12 text-primary flex size-9 items-center justify-center rounded-lg'>
                <WalletIcon className='size-5' />
              </span>
              <div>
                <div className='text-base font-bold'>Direct User Wallet</div>
                <div className='text-muted-foreground text-xs'>
                  Only direct user balances (no parent) · {total} users
                  {wallet.data && ` · your wallet ₹${Number(wallet.data.directBalance ?? 0).toLocaleString()}`}
                </div>
              </div>
            </div>
            <div className='flex w-full gap-2 sm:w-auto'>
              <div className='relative w-full sm:w-60'>
                <SearchIcon className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2' />
                <Input
                  value={String(state.search ?? '')}
                  onChange={e => set({ search: e.target.value })}
                  placeholder='Search by name or UID…'
                  className='bg-background pl-8'
                />
              </div>
              <Button variant='outline' size='icon' title='Refresh' onClick={() => list.refetch()} disabled={list.isFetching}>
                <RefreshCwIcon className={cn(list.isFetching && 'animate-spin')} />
              </Button>
            </div>
          </div>
        }
        emptyMessage={
          <div className='flex flex-col items-center gap-2 py-6'>
            <WalletIcon className='text-border size-10' />
            {state.search ? 'No users match your search' : 'No wallet data found'}
          </div>
        }
        renderExpanded={r =>
          open === r.id ? <ManageFunds row={r} currency={coinFor(r.id)} rate={rateOf.get(coinFor(r.id))} onDone={() => list.refetch()} /> : null
        }
      />
      <HistoryDialog user={historyUser} codes={codes} onClose={() => setHistoryUser(null)} />
    </div>
  )
}

export default DirectUserWallet
