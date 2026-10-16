'use client'

import { useState } from 'react'

import FormDialog from '@/components/shared/FormDialog'
import { SelectField, TextAreaField, TextField } from '@/components/shared/FormField'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { TxnPasswordLabel } from '@/views/finance/StaffFloat'
import type { OwnerWallet } from './types'

/** Owner ke do balance: Client Management (`credits`) aur Direct Users (`staff_balances`). */
type Target = 'client' | 'direct'

const TARGETS: Record<Target, { label: string; path: string; note: string }> = {
  client: {
    label: 'Client Management balance',
    path: 'admin/exchange/owner/add-balance',
    note: 'Used only for your staff, agents and their players.'
  },
  direct: {
    label: 'Direct Users balance',
    path: 'admin/exchange/owner/add-direct-balance',
    note: 'Used only for direct users (signed up on the site, no parent).'
  }
}

/**
 * "Add Balance" — zip (tenexch bundle) ka OwnerAddBalanceModal: Current Balance, Amount,
 * Remark, Transaction Code. Sirf owner apne wallet me paisa daalta hai.
 * Owner chunta hai kaunse balance me: Client Management ya Direct Users.
 * Header ke profile menu se khulta hai (alag page nahi).
 */
const OwnerAddBalance = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [target, setTarget] = useState<Target>('client')
  const [form, setForm] = useState({ amount: '', note: '', transactionPassword: '' })

  // Current Balance — dialog khula ho tabhi mangwao
  const { data } = useApi<OwnerWallet>(open ? 'admin/exchange/owner/wallet' : null)
  const current = data ? (target === 'client' ? data.wallet.balance : data.directBalance) : null

  const add = useApiMutation({
    fn: () =>
      api.post(TARGETS[target].path, {
        amount: form.amount,
        ...(form.note ? { note: form.note } : {}),
        transactionPassword: form.transactionPassword
      }),
    invalidate: [['api', 'admin/exchange/owner/wallet'], ['api', 'admin/exchange/dashboard'], ['api', 'admin/exchange/user-reports/home'], ['api', 'admin/accounts/float'], ['api', 'admin/exchange/accounts']],
    success: `Balance added to your ${TARGETS[target].label}`,
    onSuccess: () => setForm({ amount: '', note: '', transactionPassword: '' })
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={null}
      title='Add Balance'
      description='You have two balances. Client Management pays your staff, agents and their players. Direct Users pays direct users only.'
      submitLabel='Add Balance'
      onSubmit={() => add.mutateAsync()}
    >
      <SelectField
        id='ob-target'
        label='Add to'
        value={target}
        onChange={v => setTarget(v as Target)}
        options={(Object.keys(TARGETS) as Target[]).map(k => ({ value: k, label: TARGETS[k].label }))}
        hint={TARGETS[target].note}
      />
      <TextField id='ob-current' label='Current Balance' readOnly disabled value={current !== null ? Number(current).toLocaleString() : '…'} />
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
