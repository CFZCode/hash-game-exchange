'use client'

import { useState, type ReactNode } from 'react'

import FormDialog from '@/components/shared/FormDialog'
import { TextAreaField, TextField } from '@/components/shared/FormField'
import { useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { check } from '@/lib/validate'
import { TxnPasswordLabel } from '@/views/finance/StaffFloat'
import type { AccountRow, AccountsResponse } from './types'

/** Zip jaisa number: 1,234.5 */
export const fmt = (value: string | number) => Number(value || 0).toLocaleString()

/** List ke saath ye queries bhi refresh hon. */
export const SETTLE_INVALIDATE = [['api', 'admin/exchange/accounts'], ['api', 'admin/exchange/dashboard'], ['api', 'admin/exchange/user-reports/home']]

/** Zip ka settle API: points + = parent deta hai (D), − = parent leta hai (W). */
export const settleApi = (row: AccountRow, points: number, transactionPassword: string, remark?: string) =>
  api.post('admin/exchange/points/settle', {
    accountType: row.accountType,
    accountId: Number(row.accountId),
    points,
    ...(remark ? { remark } : {}),
    ...(transactionPassword ? { transactionPassword } : {})
  })

type Props = {
  mode: 'deposit' | 'withdraw'
  row: AccountRow

  /** Login wala (list ka `me`) — naam aur balance */
  me: AccountsResponse['me']
  trigger: ReactNode
}

/**
 * D / W modal — zip ka settlement modal (`bakend-docs/users-settlement-api.md`):
 *
 *   parent  — abhi ka balance | naya balance
 *   child   — abhi ka balance | naya balance
 *   Profit/Loss — abhi | settlement ke baad
 *   Amount, Remark, Transaction Code
 *
 * Deposit = points positive, Withdraw = points hamesha negative.
 */
const SettleDialog = ({ mode, row, me, trigger }: Props) => {
  const [form, setForm] = useState({ amount: '', remark: '', transactionPassword: '' })

  const amount = Math.abs(Number(form.amount) || 0)
  const points = mode === 'deposit' ? amount : -amount

  // Owner ↔ direct user: owner ka balance nahi badalta.
  const parentAfter = row.isDirectUser ? Number(me.balance) : Number(me.balance) - points
  const childAfter = Number(row.available) + points
  const plAfter = Number(row.settlementPoints) + points

  const settle = useApiMutation({
    fn: () => settleApi(row, points, form.transactionPassword, form.remark),
    invalidate: SETTLE_INVALIDATE,
    success: () => `${mode === 'deposit' ? 'Deposited' : 'Withdrew'} ${fmt(amount)} ${mode === 'deposit' ? 'to' : 'from'} ${row.username}`,
    onSuccess: () => setForm({ amount: '', remark: '', transactionPassword: '' })
  })

  const line = (name: ReactNode, now: number, after: number) => (
    <div className='grid grid-cols-3 gap-2 text-sm'>
      <span className='truncate font-medium'>{name}</span>
      <span className='text-right tabular-nums'>{fmt(now)}</span>
      <span className='text-right tabular-nums'>{fmt(after)}</span>
    </div>
  )

  return (
    <FormDialog
      trigger={trigger}
      title={mode === 'deposit' ? 'DEPOSIT' : 'WITHDRAW'}
      submitLabel='Submit'

      // Server (`exchange.validators.js settle`): points ≠ 0, |points| ≤ 100,000,000; remark ≤ 200.
      validate={() => ({
        'settle-amount': check.number(form.amount, 'Amount', { positive: true, max: 100_000_000, decimals: 2 }),
        'settle-remark': check.length(form.remark, 'Remark', { max: 200 })
      })}
      onSubmit={() => settle.mutateAsync()}
    >
      <div className='grid gap-2 rounded-md border p-3'>
        {line(me.username, Number(me.balance), parentAfter)}
        {line(row.username, Number(row.available), childAfter)}
        {line('Profit/Loss', Number(row.settlementPoints), plAfter)}
      </div>
      <TextField
        id='settle-amount'
        label='Amount'
        type='number'
        required
        placeholder='0'
        value={form.amount}
        onChange={e => setForm({ ...form, amount: e.target.value })}
      />
      <TextAreaField id='settle-remark' label='Remark' maxLength={200} value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} />
      <TextField
        id='settle-tp'
        label={<TxnPasswordLabel />}
        type='password'
        value={form.transactionPassword}
        onChange={e => setForm({ ...form, transactionPassword: e.target.value })}
      />
    </FormDialog>
  )
}

export default SettleDialog
