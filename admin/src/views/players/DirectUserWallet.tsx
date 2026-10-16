'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import { HistoryIcon, MinusIcon, PlusIcon, RefreshCwIcon, WalletIcon } from 'lucide-react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import Money from '@/components/shared/Money'
import PageHeader from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApi, useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { useCurrencyCodes } from '@/views/finance/useCurrencyCodes'
import { TxnPasswordLabel } from '@/views/finance/StaffFloat'
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

/**
 * Row ke neeche khulne wala "Manage Funds" — zip jaisa: Transaction Password, Debit Funds,
 * Credit Funds. Credit = Super Admin ke Direct User wallet se INR value katti hai,
 * Debit = user se liya, INR value wallet me wapas.
 */
const ManageFunds = ({ row, currency, rate, onDone }: { row: DirectUserRow; currency: string; rate?: string; onDone: () => void }) => {
  const [credit, setCredit] = useState('')
  const [debit, setDebit] = useState('')
  const [password, setPassword] = useState('')

  const run = useApiMutation<{ operation: 'credit' | 'debit'; amount: string }, { inrValue: string }>({
    fn: ({ operation, amount }) =>
      api.post(`${BASE}/adjust`, { userId: row.id, currency, amount, operation, transactionPassword: password }),
    invalidate: [['paged', `${BASE}/users`], ['api', 'admin/exchange/owner/wallet'], ['paged', 'admin/exchange/owner/direct-ledger'], ['paged', `${BASE}/users/${row.id}/history`]],
    success: (r, { operation, amount }) =>
      `${operation === 'credit' ? 'Credited' : 'Debited'} ${amount} ${currency} · ₹${Number(r?.inrValue ?? 0).toLocaleString()} ${operation === 'credit' ? 'from' : 'back to'} your wallet`,
    onSuccess: (_r, { operation }) => {
      if (operation === 'credit') setCredit('')
      else setDebit('')
      setPassword('')
      onDone()
    }
  })

  const ready = (amount: string) => Number(amount) > 0 && password.length > 0 && !run.isPending

  return (
    <div className='grid gap-4 p-2 md:grid-cols-3'>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`dw-tp-${row.id}`} className='text-warning'>
          <TxnPasswordLabel />
        </Label>
        <Input id={`dw-tp-${row.id}`} type='password' autoComplete='off' value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`dw-debit-${row.id}`} className='text-danger'>
          Debit Funds ({currency})
        </Label>
        <div className='flex gap-2'>
          <Input id={`dw-debit-${row.id}`} inputMode='decimal' placeholder='Amount' value={debit} onChange={e => setDebit(cleanAmount(e.target.value))} />
          <Button variant='destructive' disabled={!ready(debit)} onClick={() => run.mutate({ operation: 'debit', amount: debit })}>
            <MinusIcon /> Debit
          </Button>
        </div>
        {debit && <span className='text-muted-foreground text-xs'>≈ ₹{inrOf(debit, rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} back to your wallet</span>}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`dw-credit-${row.id}`} className='text-success'>
          Credit Funds ({currency})
        </Label>
        <div className='flex gap-2'>
          <Input id={`dw-credit-${row.id}`} inputMode='decimal' placeholder='Amount' value={credit} onChange={e => setCredit(cleanAmount(e.target.value))} />
          <Button disabled={!ready(credit)} onClick={() => run.mutate({ operation: 'credit', amount: credit })}>
            <PlusIcon /> Credit
          </Button>
        </div>
        {credit && <span className='text-muted-foreground text-xs'>≈ ₹{inrOf(credit, rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} from your wallet</span>}
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
    { key: 'when', header: 'When', cell: r => <DateTime value={r.createdAt} /> },
    { key: 'coin', header: 'Currency', cell: r => <span className='font-medium uppercase'>{r.coin}</span> },
    {
      key: 'op',
      header: 'Type',
      cell: r => <Badge variant={r.operation === 'credit' ? 'default' : 'destructive'}>{r.operation}</Badge>
    },
    { key: 'amount', header: 'Amount', align: 'right', cell: r => <Money value={r.amount} digits={4} /> },
    { key: 'prev', header: 'Before', align: 'right', cell: r => <Money value={r.previousBalance} digits={4} /> },
    { key: 'new', header: 'After', align: 'right', cell: r => <Money value={r.newBalance} digits={4} /> },
    { key: 'note', header: 'Note', cell: r => <span className='text-muted-foreground text-xs'>{r.description ?? '—'}</span> }
  ]

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Transaction History</DialogTitle>
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
              <SelectTrigger className='w-40' aria-label='Filter by currency'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All currencies</SelectItem>
                {codes.map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          emptyMessage='No transactions for this user.'
          dense
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Direct User Wallet — admin-structure.zip ka "Wallet" (WalletUpdate) page.
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

  const columns: Column<DirectUserRow>[] = [
    {
      key: 'user',
      header: 'User',
      cell: r => (
        <Link href={`/users/${r.id}`} className='font-medium hover:underline'>
          {r.name}
        </Link>
      )
    },
    { key: 'uid', header: 'UID', cell: r => <span className='text-muted-foreground font-mono text-xs'>{r.id}</span> },
    {
      key: 'currency',
      header: 'Currency',
      cell: r => (
        <Select value={coinFor(r.id)} onValueChange={v => v && setCurrencyOf(p => ({ ...p, [r.id]: v }))}>
          <SelectTrigger className='h-8 w-28' aria-label='Currency'>
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
      align: 'right',
      cell: r => <Money value={r.balances[coinFor(r.id)] ?? '0'} digits={4} className='font-semibold' />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: r => (
        <div className='flex justify-end gap-2'>
          <Button variant='outline' size='sm' onClick={() => setHistoryUser(r)}>
            <HistoryIcon /> History
          </Button>
          <Button variant={open === r.id ? 'default' : 'outline'} size='sm' onClick={() => setOpen(o => (o === r.id ? null : r.id))}>
            <WalletIcon /> Manage Funds
          </Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title='Direct User Wallet'
        description={`Only direct users (no parent) · credit or debit in any currency from your Direct User wallet${
          wallet.data ? ` · your wallet ₹${Number(wallet.data.directBalance ?? 0).toLocaleString()}` : ''
        }`}
        actions={
          <Button variant='outline' onClick={() => list.refetch()} disabled={list.isFetching}>
            <RefreshCwIcon /> Refresh
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={list.data?.rows}
        rowKey={r => r.id}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error}
        pagination={list.data?.pagination}
        onPageChange={page => set({ page })}
        onLimitChange={limit => set({ limit })}
        search={String(state.search ?? '')}
        onSearchChange={search => set({ search })}
        searchPlaceholder='Search by name or UID…'
        emptyMessage='No direct users found.'
        renderExpanded={r =>
          open === r.id ? <ManageFunds row={r} currency={coinFor(r.id)} rate={rateOf.get(coinFor(r.id))} onDone={() => list.refetch()} /> : null
        }
      />
      <HistoryDialog user={historyUser} codes={codes} onClose={() => setHistoryUser(null)} />
    </div>
  )
}

export default DirectUserWallet
