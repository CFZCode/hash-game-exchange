'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'

import { KeyRoundIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import FormDialog from '@/components/shared/FormDialog'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'
import { api, errorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { ACCOUNTS_API, passwordError } from './api'

/**
 * Multi Login Account — zip `pages/MultiLogin.jsx` + `ExecutivePermissionsModal.jsx`.
 *
 * Executive = login wale ka sub-login, chune hue privileges ke saath. Upar form (Client ID,
 * Full Name, Password, Confirm Password, Privileges, Transaction Code), neeche table:
 * Action (edit / On-Off / password / delete), Username, IsAuth, Full Name, har privilege ka ✓.
 * Casino wale privileges (Casino Result, Live Casino Result, Our Casino) nahi.
 */

/** Zip ka PERMISSIONS registry — key (server se same) + label. */
const PRIVILEGES: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'DashBoard' },
  { key: 'marketAnalysis', label: 'Market Analysis' },
  { key: 'userList', label: 'User List' },
  { key: 'insertUser', label: 'Insert User' },
  { key: 'bank', label: 'Bank' },
  { key: 'accountStatement', label: 'Account Statement' },
  { key: 'partyWinLoss', label: 'Party Win Loss' },
  { key: 'currentBets', label: 'Current Bets' },
  { key: 'userHistory', label: 'User History' },
  { key: 'generalLock', label: 'General Lock' },
  { key: 'events', label: 'Events' },
  { key: 'marketSearchAnalysis', label: 'Market Search Analysis' },
  { key: 'loginUserCreation', label: 'Login User creation' },
  { key: 'withdraw', label: 'Withdraw' },
  { key: 'deposit', label: 'Deposit' },
  { key: 'creditReference', label: 'Credit Reference' },
  { key: 'userInfo', label: 'User Info' },
  { key: 'userPasswordChange', label: 'User Password Change' },
  { key: 'userLock', label: 'User Lock' },
  { key: 'betLock', label: 'Bet Lock' },
  { key: 'turnOver', label: 'TurnOver' },
  { key: 'couponReport', label: 'CouponReport' },
  { key: 'activeUser', label: 'active user' },
  { key: 'fraudReport', label: 'fraud report' },
  { key: 'currencyPermission', label: 'Currency Permission' },
  { key: 'agentAssign', label: 'Agent Assign' },
  { key: 'userRegisterReport', label: 'User Register Report' },
  { key: 'totalProfitLoss', label: 'Total Profitloss' },
  { key: 'userWinLoss', label: 'User Winloss' }
]

type Executive = {
  id: number
  username: string
  full_name: string | null
  active: boolean
  permissions: Record<string, boolean>
}

type Form = { uname: string; fullname: string; password: string; cpass: string; mpass: string }

const EMPTY: Form = { uname: '', fullname: '', password: '', cpass: '', mpass: '' }

/** Zip (vee-validate) ke texts. */
const validateField = (name: keyof Form, value: string, all: Form) => {
  switch (name) {
    case 'uname':
      if (!value) return 'The Client ID field is required'

      return value.length < 4 ? 'The Client ID field must be at least 4 characters' : ''
    case 'fullname':
      if (!value) return 'The Full Name field is required'

      return value.length < 4 ? 'The Full Name field must be at least 4 characters' : ''
    case 'password':
      return passwordError(value)
    case 'cpass':
      if (!value) return 'The Confirm Password field is required'

      return value !== all.password ? 'The Confirm Password confirmation does not match' : ''
    case 'mpass':
      return value ? '' : 'required'
    default:
      return ''
  }
}

const allTicked = (checked: Record<string, boolean>) => PRIVILEGES.every(p => checked[p.key])

/** "All" + har privilege ka checkbox — form aur edit modal dono me. */
const PrivilegeBoxes = ({
  checked,
  onToggle,
  invalid,
  idPrefix
}: {
  checked: Record<string, boolean>
  onToggle: (key: string) => void
  invalid?: boolean
  idPrefix: string
}) => (
  <div className='space-y-3'>
    <label htmlFor={`${idPrefix}-all`} className='flex items-center gap-2 text-sm font-medium'>
      <Checkbox id={`${idPrefix}-all`} checked={allTicked(checked)} onCheckedChange={() => onToggle('all')} />
      All
    </label>
    <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
      {PRIVILEGES.map(p => (
        <label key={p.key} htmlFor={`${idPrefix}-${p.key}`} className='flex items-center gap-2 text-sm'>
          <Checkbox id={`${idPrefix}-${p.key}`} aria-invalid={invalid} checked={Boolean(checked[p.key])} onCheckedChange={() => onToggle(p.key)} />
          {p.label}
        </label>
      ))}
    </div>
  </div>
)

/** Ek checkbox ya "All" palto. */
const toggled = (checked: Record<string, boolean>, key: string) => {
  if (key !== 'all') return { ...checked, [key]: !checked[key] }
  const next: Record<string, boolean> = {}

  if (!allTicked(checked)) PRIVILEGES.forEach(p => (next[p.key] = true))

  return next
}

const fullMap = (checked: Record<string, boolean>) => Object.fromEntries(PRIVILEGES.map(p => [p.key, Boolean(checked[p.key])]))

const MultiLogin = () => {
  const list = useApi<{ executives: Executive[] }>(`${ACCOUNTS_API}/multi-login`)
  const executives = list.data?.executives ?? []

  const [form, setForm] = useState<Form>(EMPTY)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'plist', string>>>({})
  const [loading, setLoading] = useState(false)

  // Edit privileges modal
  const [editing, setEditing] = useState<Executive | null>(null)
  const [editChecked, setEditChecked] = useState<Record<string, boolean>>({})

  // Password modal
  const [pwFor, setPwFor] = useState<Executive | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const refresh = () => void list.refetch()

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof Form
    const next = { ...form, [name]: e.target.value }

    setForm(next)
    setErrors(prev => {
      const updated = { ...prev, [name]: validateField(name, e.target.value, next) }

      if (name === 'password' && next.cpass) updated.cpass = validateField('cpass', next.cpass, next)

      return updated
    })
  }

  const onBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof Form

    setErrors(prev => ({ ...prev, [name]: validateField(name, e.target.value, form) }))
  }

  // Checkbox chhoote hi validate — aakhri hata to "The Privileges field is required".
  const onToggle = (key: string) => {
    const next = toggled(checked, key)

    setChecked(next)
    setErrors(prev => ({ ...prev, plist: PRIVILEGES.some(p => next[p.key]) ? '' : 'The Privileges field is required' }))
  }

  const handleReset = () => {
    setForm(EMPTY)
    setChecked({})
    setErrors({})
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return

    const nextErrors: typeof errors = {}

    for (const f of ['uname', 'fullname', 'password', 'cpass', 'mpass'] as const) {
      const msg = validateField(f, form[f], form)

      if (msg) nextErrors[f] = msg
    }

    if (!PRIVILEGES.some(p => checked[p.key])) nextErrors.plist = 'The Privileges field is required'
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length) {
      toast.error('Please fill required fields')

      return
    }

    setLoading(true)

    try {
      const res = await api.post<{ message?: string }>(`${ACCOUNTS_API}/multi-login`, {
        username: form.uname,
        full_name: form.fullname,
        password: form.password,
        transactionPassword: form.mpass,
        permissions: fullMap(checked)
      })

      toast.success(res?.message || 'User Sucessfully Inserted')
      handleReset()
      refresh()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Har action ke baad list dobara.
  const run = async (fn: () => Promise<{ message?: string }>, fallback: string) => {
    try {
      const res = await fn()

      toast.success(res?.message || fallback)
      refresh()
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
    }
  }

  const toggleActive = (exec: Executive) =>
    run(() => api.patch(`${ACCOUNTS_API}/multi-login/${exec.id}/active`, {}), 'Status updated').catch(() => undefined)

  const openEdit = (exec: Executive) => {
    setEditChecked({ ...exec.permissions })
    setEditing(exec)
  }

  const fieldError = (name: keyof Form) => errors[name] && name !== 'mpass' && <small className='text-destructive text-xs'>{errors[name]}</small>

  const input = (name: keyof Form, label: string, type = 'text') => (
    <div className='space-y-1.5'>
      <Label htmlFor={`ml-${name}`}>{label}</Label>
      <Input
        id={`ml-${name}`}
        name={name}
        type={type}
        aria-invalid={Boolean(errors[name])}
        className={cn(name === 'uname' && errors.uname === '' && 'border-success')}
        value={form[name]}
        onChange={onInput}
        onBlur={onBlur}
      />
      {fieldError(name)}
    </div>
  )

  return (
    <div>
      <PageHeader title='Multi Login Account' />

      <Card>
        <CardContent className='space-y-6 pt-6'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-3'>
              <h5 className='font-semibold'>Personal Information</h5>
              <div className='grid gap-4 md:grid-cols-4'>
                {input('uname', 'Client ID')}
                {input('fullname', 'Full Name')}
                {input('password', 'Password', 'password')}
                {input('cpass', 'Confirm Password', 'password')}
              </div>
            </div>

            <div className='space-y-3'>
              <h5 className='font-semibold'>Privileges</h5>
              <PrivilegeBoxes checked={checked} onToggle={onToggle} invalid={Boolean(errors.plist)} idPrefix='privilege' />
              {errors.plist && <small className='text-destructive text-xs'>{errors.plist}</small>}

              <div className='flex flex-wrap items-center gap-2'>
                <Input
                  name='mpass'
                  type='password'
                  placeholder='Transaction Code'
                  className='w-56'
                  aria-invalid={Boolean(errors.mpass)}
                  value={form.mpass}
                  onChange={onInput}
                  onBlur={onBlur}
                />
                <Button type='submit' disabled={loading}>
                  Submit
                </Button>
                <Button type='button' variant='outline' onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </div>
          </form>

          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='bg-background sticky left-0'>Action</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>IsAuth</TableHead>
                  <TableHead>Full Name</TableHead>
                  {PRIVILEGES.map(p => (
                    <TableHead key={p.key} className='whitespace-nowrap'>
                      {p.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {executives.map(exec => (
                  <TableRow key={exec.id}>
                    <TableCell className='bg-background sticky left-0 whitespace-nowrap'>
                      <div className='flex items-center gap-1'>
                        <Button size='icon-sm' title='Edit privileges' onClick={() => openEdit(exec)}>
                          <PencilIcon />
                        </Button>
                        <Button
                          size='sm'
                          variant={exec.active ? 'default' : 'secondary'}
                          className={cn(exec.active && 'bg-success hover:bg-success/90')}
                          title={exec.active ? 'Disable login' : 'Enable login'}
                          onClick={() => toggleActive(exec)}
                        >
                          {exec.active ? 'On' : 'Off'}
                        </Button>
                        <Button
                          size='icon-sm'
                          variant='outline'
                          title='Change password'
                          onClick={() => {
                            setNewPassword('')
                            setPwFor(exec)
                          }}
                        >
                          <KeyRoundIcon />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button size='icon-sm' variant='destructive' title='Delete'>
                              <Trash2Icon />
                            </Button>
                          }
                          title={`Delete ${exec.username}?`}
                          description='This login will stop working immediately.'
                          confirmLabel='Delete'
                          destructive
                          onConfirm={() => run(() => api.delete(`${ACCOUNTS_API}/multi-login/${exec.id}`), 'Executive deleted')}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{exec.username || '-'}</TableCell>
                    <TableCell>{exec.active ? 'Y' : 'N'}</TableCell>
                    <TableCell>{exec.full_name || '-'}</TableCell>
                    {PRIVILEGES.map(p => (
                      <TableCell key={p.key}>{exec.permissions?.[p.key] ? '✓' : '-'}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {list.error && <p className='text-destructive text-sm'>{errorMessage(list.error)}</p>}
        </CardContent>
      </Card>

      {/* Edit privileges — poora map jaata hai (replace). */}
      <FormDialog
        trigger={<span />}
        title={`Privileges — ${editing?.username ?? ''}`}
        submitLabel='Save'
        wide
        open={Boolean(editing)}
        onOpenChange={open => !open && setEditing(null)}
        onSubmit={() =>
          editing && run(() => api.put(`${ACCOUNTS_API}/multi-login/${editing.id}`, { permissions: fullMap(editChecked) }), 'Privileges updated').then(() => setEditing(null))
        }
      >
        <PrivilegeBoxes checked={editChecked} onToggle={key => setEditChecked(prev => toggled(prev, key))} idPrefix='edit-privilege' />
      </FormDialog>

      {/* Naya password */}
      <FormDialog
        trigger={<span />}
        title={`New password for ${pwFor?.username ?? ''}`}
        submitLabel='OK'
        open={Boolean(pwFor)}
        onOpenChange={open => !open && setPwFor(null)}
        onSubmit={() => {
          if (!newPassword || newPassword.length < 4) {
            toast.error('A password of at least 4 characters is required')

            return Promise.reject(new Error('invalid'))
          }

          return pwFor && run(() => api.post(`${ACCOUNTS_API}/multi-login/${pwFor.id}/password`, { password: newPassword }), 'Password updated').then(() => setPwFor(null))
        }}
      >
        <Input type='password' placeholder='New password' value={newPassword} onChange={e => setNewPassword(e.target.value)} />
      </FormDialog>
    </div>
  )
}

export default MultiLogin
