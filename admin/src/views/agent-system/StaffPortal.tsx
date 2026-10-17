'use client'

import { useState, type ReactNode } from 'react'

import { Loader2Icon, LockIcon, SaveIcon, UserPlusIcon, WalletIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/contexts/SessionContext'
import { useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { SETTLE_INVALIDATE } from '@/views/exchange/accountMoney'
import { ACCOUNTS_API, passwordError } from '@/views/exchange/accounts/api'

const Section = ({ icon, tone, title, subtitle, children }: { icon: ReactNode; tone: string; title: string; subtitle: string; children: ReactNode }) => (
  <Card className='shadow-none'>
    <CardContent className='grid gap-4 p-6'>
      <div className='flex items-center gap-3'>
        <span className={`rounded-lg p-2.5 ${tone}`}>{icon}</span>
        <div>
          <div className='text-lg font-bold'>{title}</div>
          <div className='text-muted-foreground text-sm'>{subtitle}</div>
        </div>
      </div>
      {children}
    </CardContent>
  </Card>
)

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className='grid gap-1.5'>
    <Label>{label}</Label>
    {children}
  </div>
)

/** Server amount string maangta hai (max 8 decimal). */
const amountOk = (v: string) => /^\d+(\.\d{1,8})?$/.test(v.trim()) && Number(v) > 0

/**
 * Agent System → Staff Portal — zip `StaffPortalTab` ka UI, apne setup ki APIs:
 *   Quick ID Creation   apna `admin/exchange/accounts-admin/create` (userType USER — login wale ke neeche player)
 *   Wallet Refill       owner: `admin/accounts/refill` (note ke saath) · baaki: `admin/staff/transfer` (apne balance se)
 *   Close Sports / Casino / Lock Account   `admin/accounts/status`
 */
const StaffPortal = () => {
  const { can } = useSession()
  const isOwner = can('wallet:adjust')

  // ── Quick ID creation ──
  const [cu, setCu] = useState({ username: '', fullname: '', password: '', credit: '', txn: '' })

  const create = useApiMutation({
    fn: () =>
      api.post<{ message: string; creditSkipped: boolean }>(`${ACCOUNTS_API}/create`, {
        username: cu.username.trim(),
        fullname: cu.fullname.trim() || undefined,
        password: cu.password,
        creditAmount: cu.credit.trim() || undefined,
        userType: 'USER',
        percentage: '1',
        transactionPassword: cu.txn
      }),
    invalidate: SETTLE_INVALIDATE,
    success: r => (r.creditSkipped ? r.message : `User ${cu.username.trim()} created`),
    onSuccess: () => setCu({ username: '', fullname: '', password: '', credit: '', txn: '' })
  })

  const doCreate = () => {
    if (!/^[a-zA-Z0-9]{4,60}$/.test(cu.username.trim())) return toast.error('Username: 4–60 letters / digits')
    const pw = passwordError(cu.password)

    if (pw) return toast.error(pw)
    if (cu.credit.trim() && !amountOk(cu.credit)) return toast.error('Enter a valid credit amount')
    if (!cu.txn) return toast.error('Transaction password is required')
    create.mutate()
  }

  // ── Wallet refill ──
  const [rf, setRf] = useState({ userId: '', amount: '', note: '', txn: '' })

  const refill = useApiMutation({
    fn: () =>
      isOwner
        ? api.post('admin/accounts/refill', { accountId: Number(rf.userId), amount: rf.amount.trim(), note: rf.note.trim() || undefined, transactionPassword: rf.txn })
        : api.post('admin/staff/transfer', { toType: 'user', toId: Number(rf.userId), amount: rf.amount.trim(), direction: 'deposit', transactionPassword: rf.txn }),
    invalidate: SETTLE_INVALIDATE,
    success: `Wallet refilled — ₹${rf.amount} to UID ${rf.userId}`,
    onSuccess: () => setRf({ userId: '', amount: '', note: '', txn: '' })
  })

  const doRefill = () => {
    if (!/^\d+$/.test(rf.userId.trim())) return toast.error('Enter the user UID')
    if (!amountOk(rf.amount)) return toast.error('Enter a valid amount')
    if (!rf.txn) return toast.error('Transaction password is required')
    refill.mutate()
  }

  // ── Lock controls ──
  const [lk, setLk] = useState({ userId: '', sports: false, casino: false, account: false, txn: '' })

  const lock = useApiMutation({
    fn: () =>
      api.post('admin/accounts/status', {
        accountType: 'user',
        accountId: Number(lk.userId),
        sportsLocked: lk.sports,
        casinoLocked: lk.casino,
        systemLocked: lk.account,
        transactionPassword: lk.txn
      }),
    invalidate: SETTLE_INVALIDATE,
    success: `Updated — Sports ${lk.sports ? 'closed' : 'open'}, Casino ${lk.casino ? 'closed' : 'open'}, Account ${lk.account ? 'locked' : 'active'}`,
    onSuccess: () => setLk(s => ({ ...s, txn: '' }))
  })

  const doLock = () => {
    if (!/^\d+$/.test(lk.userId.trim())) return toast.error('Enter the user UID')
    if (!lk.txn) return toast.error('Transaction password is required')
    lock.mutate()
  }

  const spin = (busy: boolean, icon: ReactNode) => (busy ? <Loader2Icon className='animate-spin' /> : icon)

  const switches = [
    ['sports', 'Close Sports'],
    ['casino', 'Close Casino'],
    ['account', 'Lock Account']
  ] as const

  return (
    <div className='mx-auto grid max-w-5xl gap-6'>
      <div>
        <h2 className='text-xl font-bold'>Staff Portal</h2>
        <p className='text-muted-foreground text-sm'>Quickly create player IDs, refill wallets and close sports / casino for a user.</p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Section icon={<UserPlusIcon />} tone='bg-primary/10 text-primary' title='Quick ID Creation' subtitle='Create a new player account under you'>
          <Field label='Username'>
            <Input value={cu.username} onChange={e => setCu({ ...cu, username: e.target.value })} />
          </Field>
          <Field label='Full Name (optional)'>
            <Input value={cu.fullname} onChange={e => setCu({ ...cu, fullname: e.target.value })} />
          </Field>
          <Field label='Password'>
            <Input type='password' autoComplete='new-password' value={cu.password} onChange={e => setCu({ ...cu, password: e.target.value })} />
          </Field>
          <Field label='Initial Credit (INR, optional)'>
            <Input inputMode='decimal' value={cu.credit} onChange={e => setCu({ ...cu, credit: e.target.value })} />
          </Field>
          <Field label='Transaction Password'>
            <Input type='password' autoComplete='off' value={cu.txn} onChange={e => setCu({ ...cu, txn: e.target.value })} />
          </Field>
          <Button disabled={create.isPending} onClick={doCreate}>
            {spin(create.isPending, <UserPlusIcon />)} {create.isPending ? 'Creating…' : 'Create User'}
          </Button>
        </Section>

        <Section icon={<WalletIcon />} tone='bg-success/10 text-success' title='Wallet Refill' subtitle="Top up a user's INR balance">
          <Field label='User UID'>
            <Input inputMode='numeric' value={rf.userId} onChange={e => setRf({ ...rf, userId: e.target.value })} />
          </Field>
          <Field label='Amount (INR)'>
            <Input inputMode='decimal' value={rf.amount} onChange={e => setRf({ ...rf, amount: e.target.value })} />
          </Field>
          {isOwner && (
            <Field label='Reference — who gave the shout'>
              <Textarea rows={2} maxLength={200} placeholder='e.g. requested by Ramesh / WhatsApp' value={rf.note} onChange={e => setRf({ ...rf, note: e.target.value })} />
            </Field>
          )}
          <Field label='Transaction Password'>
            <Input type='password' autoComplete='off' value={rf.txn} onChange={e => setRf({ ...rf, txn: e.target.value })} />
          </Field>
          <Button className='bg-success hover:bg-success/90 text-white' disabled={refill.isPending} onClick={doRefill}>
            {spin(refill.isPending, <SaveIcon />)} {refill.isPending ? 'Refilling…' : 'Refill Wallet'}
          </Button>
        </Section>
      </div>

      <Section icon={<LockIcon />} tone='bg-warning/10 text-warning' title='Close Sports / Casino for a User' subtitle='Block sports or casino for an individual ID in your hierarchy'>
        <Field label='User UID'>
          <Input inputMode='numeric' value={lk.userId} onChange={e => setLk({ ...lk, userId: e.target.value })} />
        </Field>
        <div className='grid gap-3 sm:grid-cols-3'>
          {switches.map(([key, label]) => (
            <label key={key} className='flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm font-semibold'>
              <Switch checked={lk[key]} onCheckedChange={v => setLk({ ...lk, [key]: Boolean(v) })} /> {label}
            </label>
          ))}
        </div>
        <p className='text-muted-foreground text-xs'>Set the switches to the desired state, then Apply. ON = closed / locked.</p>
        <Field label='Transaction Password'>
          <Input type='password' autoComplete='off' value={lk.txn} onChange={e => setLk({ ...lk, txn: e.target.value })} />
        </Field>
        <Button className='bg-warning hover:bg-warning/90 justify-self-start text-black' disabled={lock.isPending} onClick={doLock}>
          {spin(lock.isPending, <LockIcon />)} {lock.isPending ? 'Applying…' : 'Apply'}
        </Button>
      </Section>
    </div>
  )
}

export default StaffPortal
