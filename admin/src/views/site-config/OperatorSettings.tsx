'use client'

import { useState } from 'react'

import { Loader2Icon } from 'lucide-react'

import { toast } from 'sonner'

import ErrorState from '@/components/shared/ErrorState'
import FormDialog from '@/components/shared/FormDialog'
import { TextField } from '@/components/shared/FormField'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { check, cleanErrors, firstError } from '@/lib/validate'
import { TxnPasswordLabel } from '@/views/finance/StaffFloat'

/**
 * Limits, policy and schedule — the values that used to be environment
 * variables.
 *
 * ── WHY THEY ARE HERE ───────────────────────────────────────────────────
 *
 * The minimum bet, the maximum payout, the timezone a race week resets in:
 * these are the operator's decisions, and while they lived in `.env` changing
 * one meant a deploy by whoever held shell access. They are stored per site
 * now, set here, and every write is permissioned and audited.
 *
 * WHAT IS NOT SET HERE stays in `.env` on purpose: credentials, ports, service
 * URLs, CORS, worker intervals. Those say where the software runs, which is a
 * deployment's business, not an operator's.
 *
 * A row with nothing stored runs on the default; saving sets it, and `Reset to
 * default` hands it back. Cashier limits are per currency and the Super Admin's
 * alone (`CashierLimitsCard`).
 */

type Setting = {
  key: string
  label: string
  kind: 'number' | 'decimal' | 'boolean' | 'timezone'
  env: string
  envValue: string | null
  stored: string | number | boolean | null
  value: string | number | boolean | null
  source: 'operator' | 'environment'
  min?: number
  max?: number
}

const GROUPS: { title: string; hint: string; keys: string[] }[] = [
  {
    title: 'Races',
    hint: 'When the weekly race leaderboard resets.',
    keys: ['race_timezone']
  },
  {
    title: 'User accounts',
    hint: 'How a sign-in locks, how many sessions a user keeps, and whether an email must be verified before money moves.',
    keys: ['login_max_attempts', 'login_lock_minutes', 'max_active_sessions', 'require_email_verification']
  }
]

const OperatorSettings = () => {
  const { can } = useSession()
  const canWrite = can('config:write')
  const q = useApi<Setting[]>('admin/site-config/settings')
  const [draft, setDraft] = useState<Record<string, string | boolean | null>>({})

  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useApiMutation({
    fn: () => api.put<Setting[]>('admin/site-config/settings', draft),
    invalidate: [['api', 'admin/site-config/settings']],
    success: 'Saved — the services pick it up on their next read',
    onSuccess: () => {
      setDraft({})
      setErrors({})
    }
  })

  const header = (
    <PageHeader
      title='Limits and policy'
      description='The numbers this site runs on.'
    />
  )

  // The heading stays on an error, like every other screen, so the page still says what it is.
  if (q.error)
    return (
      <div>
        {header}
        <ErrorState error={q.error} />
      </div>
    )

  const rows = q.data ?? []
  const byKey = Object.fromEntries(rows.map(r => [r.key, r]))
  const dirty = Object.keys(draft)

  /** The value a key will have after the save (the draft, else what is in force). */
  const effective = (key: string) => (key in draft ? draft[key] : byKey[key]?.value)

  /** Each changed value against its kind and the bounds the platform reports, then min ≤ max pairs. */
  const validateDraft = () => {
    const found: Record<string, string | undefined> = {}

    for (const key of dirty) {
      const s = byKey[key]
      const v = draft[key]

      if (!s || v === null || s.kind === 'boolean') continue

      if (s.kind === 'timezone') {
        try {
          new Intl.DateTimeFormat('en', { timeZone: String(v).trim() })
          if (!String(v).trim()) found[key] = `${s.label} is required`
        } catch {
          found[key] = `${s.label} must be an IANA timezone, e.g. Asia/Kolkata`
        }

        continue
      }

      found[key] = check.number(String(v), s.label, { min: s.min ?? 0, max: s.max, integer: s.kind === 'number' })
    }

    const pairs: [string, string][] = []

    for (const [lo, hi] of pairs) {
      if (!(lo in draft) && !(hi in draft)) continue
      const a = Number(effective(lo))
      const b = Number(effective(hi))

      if (byKey[lo] && byKey[hi] && effective(lo) !== null && effective(hi) !== null && Number.isFinite(a) && Number.isFinite(b) && a > b) {
        const key = hi in draft ? hi : lo

        found[key] = found[key] ?? `${byKey[lo].label} cannot be more than ${byKey[hi].label}`
      }
    }

    return cleanErrors(found)
  }

  const submit = () => {
    const found = validateDraft()

    setErrors(found)

    if (Object.keys(found).length) {
      toast.error(firstError(found))

      return
    }

    save.mutate()
  }

  const field = (s: Setting) => {
    const pending = s.key in draft
    const current = pending ? draft[s.key] : s.value

    if (s.kind === 'boolean') {
      return (
        <Switch
          checked={current === true || current === 'true'}
          disabled={!canWrite}
          onCheckedChange={v => setDraft(d => ({ ...d, [s.key]: v }))}
        />
      )
    }

    return (
      <span className='grid gap-1'>
        <Input
          className='h-8 w-44 font-mono text-xs'
          value={current === null || current === undefined ? '' : String(current)}
          placeholder={s.envValue ?? 'not set'}
          disabled={!canWrite}
          inputMode={s.kind === 'timezone' ? undefined : 'decimal'}
          aria-invalid={errors[s.key] ? true : undefined}
          onChange={e => {
            const value = e.target.value

            setDraft(d => ({ ...d, [s.key]: value }))
            setErrors(prev => {
              const next = { ...prev }

              delete next[s.key]

              return next
            })
          }}
        />
        {errors[s.key] && <span className='text-destructive w-44 text-xs'>{errors[s.key]}</span>}
        {!errors[s.key] && (s.min !== undefined || s.max !== undefined) && (
          <span className='text-muted-foreground text-[11px]'>
            {s.min ?? 0} – {s.max ?? '∞'}
          </span>
        )}
      </span>
    )
  }

  return (
    <div>
      {header}

      {dirty.length > 0 && (
        <div className='mb-4 flex items-center gap-2'>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2Icon className='animate-spin' />}
            Save {dirty.length} change{dirty.length > 1 ? 's' : ''}
          </Button>
          <Button
            variant='outline'
            disabled={save.isPending}
            onClick={() => {
              setDraft({})
              setErrors({})
            }}
          >
            Discard
          </Button>
        </div>
      )}

      <div className='grid gap-4'>
        {GROUPS.map(group => (
          <Card key={group.title} className='shadow-none'>
            <CardHeader>
              <CardTitle className='text-base'>{group.title}</CardTitle>
              <CardDescription>{group.hint}</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3'>
              {group.keys.map(key => {
                const s = byKey[key]

                if (!s) return null

                return (
                  <div key={key} className='flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0'>
                    <div className='min-w-56'>
                      <span className='block text-sm font-medium'>{s.label}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      {field(s)}
                      {s.source === 'operator' && canWrite && (
                        <Button size='sm' variant='ghost' onClick={() => setDraft(d => ({ ...d, [s.key]: null }))} title='Back to the default value'>
                          Reset to default
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
        <CashierLimitsCard />
      </div>
    </div>
  )
}

type CashierField = 'depositMin' | 'depositMax' | 'withdrawMin' | 'withdrawMax'
type CashierRow = { code: string; name: string | null } & Record<CashierField, string | null>

const CASHIER_COLUMNS: { field: CashierField; label: string }[] = [
  { field: 'depositMin', label: 'Min deposit' },
  { field: 'depositMax', label: 'Max deposit' },
  { field: 'withdrawMin', label: 'Min withdrawal' },
  { field: 'withdrawMax', label: 'Max withdrawal' }
]

const AMOUNT = /^\d{1,15}(\.\d{1,8})?$/

/** The first problem with the edited limits, or null (the server checks the same). */
const cashierProblem = (rows: CashierRow[]) => {
  for (const r of rows) {
    for (const c of CASHIER_COLUMNS) {
      const v = r[c.field]

      if (v !== null && (!AMOUNT.test(v) || Number(v) <= 0)) return `${r.code} ${c.label}: enter an amount above 0, or leave it empty`
    }

    if (r.depositMin && r.depositMax && Number(r.depositMin) > Number(r.depositMax)) return `${r.code}: min deposit is above max deposit`
    if (r.withdrawMin && r.withdrawMax && Number(r.withdrawMin) > Number(r.withdrawMax)) return `${r.code}: min withdrawal is above max withdrawal`
  }

  return null
}

/**
 * Deposit / withdrawal limits per currency. The Super Admin edits them (transaction password);
 * every other staff account sees them read-only. Every deposit and withdrawal rail checks them.
 */
const CashierLimitsCard = () => {
  const { actor, can } = useSession()
  const isSuperAdmin = actor?.level === 1 && can('config:write')
  const q = useApi<{ currencies: CashierRow[] }>('admin/site-config/cashier-limits')
  const [draft, setDraft] = useState<Record<string, Partial<Record<CashierField, string | null>>>>({})
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')

  const saved = q.data?.currencies ?? []
  const rows: CashierRow[] = saved.map(r => ({ ...r, ...draft[r.code] }))
  const dirty = Object.keys(draft).length > 0
  const problem = dirty ? cashierProblem(rows) : null

  const save = useApiMutation({
    fn: () =>
      api.put('admin/site-config/cashier-limits', {
        limits: Object.fromEntries(rows.map(r => [r.code, Object.fromEntries(CASHIER_COLUMNS.map(c => [c.field, r[c.field]]))])),
        transactionPassword: password
      }),
    invalidate: [['api', 'admin/site-config/cashier-limits']],
    success: 'Cashier limits saved — they apply to the next deposit or withdrawal',
    onSuccess: () => {
      setDraft({})
      setConfirming(false)
      setPassword('')
    }
  })

  const set = (code: string, field: CashierField, raw: string) => {
    const value = raw.trim() === '' ? null : raw.trim()

    setDraft(d => ({ ...d, [code]: { ...d[code], [field]: value } }))
  }

  const show = (v: string | null) => (v === null ? <span className='text-muted-foreground'>No limit</span> : <span className='tabular-nums'>{Number(v).toLocaleString('en-IN')}</span>)

  return (
    <Card className='shadow-none'>
      <CardHeader>
        <CardTitle className='text-base'>Cashier</CardTitle>
        <CardDescription>
          Deposit and withdrawal limits for each currency, in that currency. Leave a box empty for no limit.{' '}
          {isSuperAdmin ? 'Saving asks for your transaction password.' : 'Only the Super Admin can change them.'}
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-3'>
        {q.error ? (
          <ErrorState error={q.error} />
        ) : q.isLoading ? (
          <Loader2Icon className='text-muted-foreground animate-spin' />
        ) : rows.length === 0 ? (
          <p className='text-muted-foreground text-sm'>No currencies are switched on.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-muted-foreground border-b text-left text-xs'>
                  <th className='py-2 pr-4 font-medium'>Currency</th>
                  {CASHIER_COLUMNS.map(c => (
                    <th key={c.field} className='px-3 py-2 text-right font-medium'>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y'>
                {rows.map(r => (
                  <tr key={r.code}>
                    <td className='py-2.5 pr-4'>
                      <span className='font-mono font-semibold'>{r.code}</span>
                      {r.name && <span className='text-muted-foreground ml-2 text-xs'>{r.name}</span>}
                    </td>
                    {CASHIER_COLUMNS.map(c => (
                      <td key={c.field} className='px-3 py-2 text-right'>
                        {isSuperAdmin ? (
                          <Input
                            inputMode='decimal'
                            aria-label={`${r.code} ${c.label}`}
                            placeholder='No limit'
                            className='ml-auto h-8 w-32 text-right font-mono text-xs'
                            value={r[c.field] ?? ''}
                            onChange={e => set(r.code, c.field, e.target.value.replace(/[^0-9.]/g, ''))}
                          />
                        ) : (
                          show(r[c.field])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isSuperAdmin && dirty && (
          <div className='flex flex-wrap items-center gap-2'>
            <Button disabled={!!problem || save.isPending} onClick={() => setConfirming(true)}>
              Save cashier limits
            </Button>
            <Button variant='outline' disabled={save.isPending} onClick={() => setDraft({})}>
              Discard
            </Button>
            {problem && <span className='text-destructive text-sm'>{problem}</span>}
          </div>
        )}
      </CardContent>
      <FormDialog
        open={confirming}
        onOpenChange={o => {
          setConfirming(o)
          if (!o) setPassword('')
        }}
        trigger={null}
        title='Save cashier limits?'
        description='They apply to the next deposit and withdrawal in each currency.'
        submitLabel='Save'
        onSubmit={() => save.mutateAsync()}
      >
        <TextField id='cl-tp' label={<TxnPasswordLabel />} type='password' required value={password} onChange={e => setPassword(e.target.value)} />
      </FormDialog>
    </Card>
  )
}

export default OperatorSettings
