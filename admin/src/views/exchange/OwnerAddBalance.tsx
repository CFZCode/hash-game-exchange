'use client'

import { useState } from 'react'

import FormDialog from '@/components/shared/FormDialog'
import { TextAreaField, TextField } from '@/components/shared/FormField'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { TxnPasswordLabel } from '@/views/finance/StaffFloat'
import type { OwnerWallet } from './types'

/**
 * "Add Balance" — zip (tenexch bundle) ka OwnerAddBalanceModal: Current Balance, Amount,
 * Remark, Transaction Code. Sirf owner apne wallet me paisa daalta hai.
 * Header ke profile menu se khulta hai (alag page nahi).
 */
const OwnerAddBalance = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [form, setForm] = useState({ amount: '', note: '', transactionPassword: '' })

  // Current Balance — dialog khula ho tabhi mangwao
  const { data } = useApi<OwnerWallet>(open ? 'admin/exchange/owner/wallet' : null)

  const add = useApiMutation({
    fn: () =>
      api.post('admin/exchange/owner/add-balance', {
        amount: form.amount,
        ...(form.note ? { note: form.note } : {}),
        transactionPassword: form.transactionPassword
      }),
    invalidate: [['api', 'admin/exchange/owner/wallet'], ['api', 'admin/exchange/dashboard'], ['api', 'admin/exchange/user-reports/home'], ['api', 'admin/accounts/float']],
    success: 'Balance added to your wallet',
    onSuccess: () => setForm({ amount: '', note: '', transactionPassword: '' })
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={null}
      title='Add Balance'
      description='Adds INR to your own owner wallet. Giving to your staff, agents and their players then comes out of this balance. Giving to a direct user does not.'
      submitLabel='Add Balance'
      onSubmit={() => add.mutateAsync()}
    >
      <TextField id='ob-current' label='Current Balance' readOnly disabled value={data ? Number(data.wallet.balance).toLocaleString() : '…'} />
      <TextField id='ob-amount' label='Amount' required placeholder='Amount' value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
      <TextAreaField id='ob-note' label='Remark (optional)' maxLength={200} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
      <TextField
        id='ob-tp'
        label={<TxnPasswordLabel />}
        type='password'
        required
        value={form.transactionPassword}
        onChange={e => setForm({ ...form, transactionPassword: e.target.value })}
      />
    </FormDialog>
  )
}

export default OwnerAddBalance
