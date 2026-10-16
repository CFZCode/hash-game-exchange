'use client'

import { useState, type ReactNode } from 'react'

import { Loader2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api, errorMessage } from '@/lib/api/client'
import { check } from '@/lib/validate'
import { fmt, SETTLE_INVALIDATE } from './accountMoney'
import type { AccountRow, AccountsResponse, CreditHistoryRow } from './types'

/** Zip ki date: 15/10/2026 */
const fmtDate = (d?: string | null) => {
  if (!d) return ''
  const dt = new Date(d)

  if (Number.isNaN(dt.getTime())) return String(d)
  const p = (n: number) => String(n).padStart(2, '0')

  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`
}

/** Credit History — zip ka CreditHistory (More modal me). */
export const CreditHistory = ({ row }: { row: AccountRow }) => {
  const { data, isLoading, error } = useApi<CreditHistoryRow[]>('admin/exchange/credit-history', {
    accountType: row.accountType,
    accountId: row.accountId,
    limit: 25,
    offset: 0
  })

  const rows = data ?? []

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Super User</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Transfer From</TableHead>
          <TableHead className='text-right'>Amount</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className={error ? 'text-destructive text-center' : 'text-center'}>
              {isLoading ? 'Loading...' : error ? `Could not load credit history: ${errorMessage(error)}` : 'There are no records to show'}
            </TableCell>
          </TableRow>
        ) : (
          rows.map(r => (
            <TableRow key={r.id}>
              <TableCell>{r.superUser || '-'}</TableCell>
              <TableCell>{r.user || '-'}</TableCell>
              <TableCell>{r.transferFrom || '-'}</TableCell>
              <TableCell className='text-right'>{fmt(r.amount)}</TableCell>
              <TableCell>{fmtDate(r.createdAt)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

/**
 * Credit Deposit / Credit Withdraw form — zip ka CreditForm.
 * Parent aur child ka abhi ka aur naya balance, Amount (sirf number), Remark, Transaction Code.
 * Paisa hamare staff transfer route se (user ho ya staff, dono) — wahi credit/all_point aur point ledger likhta hai.
 */
const CreditForm = ({ mode, row, me, onDone }: { mode: 'deposit' | 'withdraw'; row: AccountRow; me: AccountsResponse['me']; onDone: () => void }) => {
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [txnPassword, setTxnPassword] = useState('')
  const [error, setError] = useState('')

  const amt = Number.parseFloat(amount) || 0
  const parentBal = Number(me.balance)
  const userBal = Number(row.credit)
  const parentNew = mode === 'deposit' ? parentBal - amt : parentBal + amt
  const userNew = mode === 'deposit' ? userBal + amt : userBal - amt
  const show2 = (n: number) => String(Math.round(n * 100) / 100)

  const save = useApiMutation({
    fn: () =>
      api.post('admin/staff/transfer', {
        toType: row.accountType,
        toId: Number(row.accountId),
        amount: amt.toFixed(2),
        direction: mode,
        transactionPassword: txnPassword
      }),
    invalidate: SETTLE_INVALIDATE,
    success: () => (mode === 'deposit' ? `Credit ${show2(amt)} given to ${row.username}` : `Credit ${show2(amt)} taken back from ${row.username}`),
    onSuccess: onDone
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const bad = check.number(amount, 'Amount', { positive: true, decimals: 2 })

    if (bad) return setError(bad)
    if (!txnPassword) return setError('Transaction Code is required')
    void save.mutateAsync().catch(() => {})
  }

  // Sirf number aur ek dot (zip: "ssss" nahi jaana chahiye).
  const onlyNumber = (v: string) => {
    const clean = v.replace(/[^0-9.]/g, '')
    const i = clean.indexOf('.')

    return i === -1 ? clean : clean.slice(0, i + 1) + clean.slice(i + 1).replace(/\./g, '')
  }

  const line = (name: ReactNode, now: number, next: number) => (
    <div className='grid grid-cols-3 items-center gap-2'>
      <Label>{name}</Label>
      <Input readOnly value={show2(now)} className='text-right' />
      <Input readOnly value={show2(next)} className='text-right' />
    </div>
  )

  return (
    <form onSubmit={submit} className='grid gap-3'>
      {line(me.username, parentBal, parentNew)}
      {line(row.username, userBal, userNew)}
      <div className='grid grid-cols-3 items-center gap-2'>
        <Label>Amount</Label>
        <Input className='col-span-2 text-right' placeholder='Amount' inputMode='decimal' value={amount} onChange={e => setAmount(onlyNumber(e.target.value))} />
      </div>
      <div className='grid grid-cols-3 items-start gap-2'>
        <Label>Remark</Label>
        <Textarea className='col-span-2' placeholder='Remark' value={remark} onChange={e => setRemark(e.target.value)} />
      </div>
      <div className='grid grid-cols-3 items-center gap-2'>
        <Label>Transaction Code</Label>
        <Input className='col-span-2' type='password' placeholder='Transaction Code' value={txnPassword} onChange={e => setTxnPassword(e.target.value)} />
      </div>
      {error && <div className='text-destructive text-right text-sm'>{error}</div>}
      <div className='text-right'>
        <Button type='submit' disabled={save.isPending}>
          {save.isPending && <Loader2Icon className='animate-spin' />}
          submit
        </Button>
      </div>
    </form>
  )
}

const TITLE = { deposit: 'Credit Deposit', withdraw: 'Credit Withdraw' } as const

/**
 * Account List ke D / W button — Credit Deposit / Credit Withdraw ka popup (zip ka CreditForm).
 * `admin/staff/transfer` se: parent ke balance se child ko deta (D) ya child se wapas leta (W).
 */
const CreditDialog = ({ mode, row, me, trigger }: { mode: 'deposit' | 'withdraw'; row: AccountRow; me: AccountsResponse['me']; trigger: ReactNode }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span role='button' tabIndex={0} onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='uppercase'>{TITLE[mode]}</DialogTitle>
          </DialogHeader>
          {open && <CreditForm mode={mode} row={row} me={me} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CreditDialog
