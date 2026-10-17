'use client'

import { useState } from 'react'

import { Loader2Icon } from 'lucide-react'

import { toast } from 'sonner'

import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { check, cleanErrors, firstError } from '@/lib/validate'

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
 * default` hands it back. Cashier limits are the owner's, per currency
 * (owner panel → Cashier), and only shown here.
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
    title: 'Casino',
    hint: 'What a user may stake on an in-house game, and how often the provably-fair seed rotates.',
    keys: ['casino_house_edge', 'casino_min_bet', 'casino_max_bet', 'casino_seed_rotate_after']
  },
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
      description='The numbers this site runs on. Cashier limits are set by the owner and shown here read-only.'
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

    const pairs: [string, string][] = [['casino_min_bet', 'casino_max_bet']]

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

type CashierRow = { code: string; name: string | null; depositMin: string | null; depositMax: string | null; withdrawMin: string | null; withdrawMax: string | null }

/** The owner's per-currency cashier limits — read-only here; set in the owner panel (Features & plan → Cashier). */
const CashierLimitsCard = () => {
  const q = useApi<{ currencies: CashierRow[] }>('admin/site-config/cashier-limits')
  const rows = q.data?.currencies ?? []
  const cell = (v: string | null) => (v === null ? <span className='text-muted-foreground'>No limit</span> : <span className='tabular-nums'>{Number(v).toLocaleString('en-IN')}</span>)

  return (
    <Card className='shadow-none'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          Cashier <Badge variant='outline' className='font-normal'>Set in the owner panel</Badge>
        </CardTitle>
        <CardDescription>Deposit and withdrawal limits for each currency, in that currency.</CardDescription>
      </CardHeader>
      <CardContent>
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
                  <th className='px-3 py-2 text-right font-medium'>Min deposit</th>
                  <th className='px-3 py-2 text-right font-medium'>Max deposit</th>
                  <th className='px-3 py-2 text-right font-medium'>Min withdrawal</th>
                  <th className='px-3 py-2 text-right font-medium'>Max withdrawal</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {rows.map(r => (
                  <tr key={r.code}>
                    <td className='py-2.5 pr-4'>
                      <span className='font-mono font-semibold'>{r.code}</span>
                      {r.name && <span className='text-muted-foreground ml-2 text-xs'>{r.name}</span>}
                    </td>
                    <td className='px-3 py-2.5 text-right'>{cell(r.depositMin)}</td>
                    <td className='px-3 py-2.5 text-right'>{cell(r.depositMax)}</td>
                    <td className='px-3 py-2.5 text-right'>{cell(r.withdrawMin)}</td>
                    <td className='px-3 py-2.5 text-right'>{cell(r.withdrawMax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default OperatorSettings
