'use client'

import { useState } from 'react'

import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { FormErrorsProvider, SwitchField, TextField, useFormErrors } from '@/components/shared/FormField'
import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { RewardCurrencyNotice, useRewardCurrency } from '@/components/shared/RewardCurrency'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { check } from '@/lib/validate'

type Affiliate = {
  affiliateBonus: string
  commissionPercent: string
  registerBonus: string

  /** The referrer's joining bonus waits for the referee's first deposit (anti sign-up farming). */
  affiliateBonusRequiresDeposit: boolean
}

const BLANK: Affiliate = { affiliateBonus: '', commissionPercent: '', registerBonus: '', affiliateBonusRequiresDeposit: true }

/**
 * The editable form, keyed by the loaded settings: a fresh load remounts it
 * with the new values, so no effect copies server data into state.
 */
const AffiliateForm = ({ initial }: { initial: Affiliate | undefined }) => {
  const { can } = useSession()
  const { code: cur } = useRewardCurrency()
  const [form, setForm] = useState<Affiliate>(() => ({ ...BLANK, ...initial }))

  const f = useFormErrors()

  const patchOf = () => {
    const patch: Partial<Record<keyof Affiliate, string | boolean>> = {}

    for (const k of Object.keys(BLANK) as (keyof Affiliate)[]) if (initial && form[k] !== initial[k]) patch[k] = typeof form[k] === 'string' ? (form[k] as string).trim() : form[k]

    return patch
  }

  const save = useApiMutation({
    fn: () => api.put<Affiliate>('admin/site-config/affiliate', patchOf()),
    invalidate: [['api', 'admin/site-config/affiliate']],
    success: 'Affiliate rates saved'
  })

  return (
    <form
      className='grid gap-4'
      onSubmit={e => {
        e.preventDefault()

        const rate = (v: string, label: string, max?: number) => check.number(v, label, { min: 0, max, decimals: 8 })

        const ok = f.passes({
          registerBonus: rate(form.registerBonus, 'Register bonus'),
          affiliateBonus: rate(form.affiliateBonus, 'Affiliate bonus'),
          commissionPercent: rate(form.commissionPercent, 'Commission %', 100)
        })

        if (!ok) return
        if (!Object.keys(patchOf()).length) return void toast.info('Nothing changed')
        save.mutate(undefined, { onError: f.fromServer })
      }}
    >
      <FormErrorsProvider errors={f.errors} onClear={f.clear}>
      <TextField id='registerBonus' inputMode='decimal' label={`Register bonus (${cur})`} hint='Credited to a new account on sign-up, only while switched on in Welcome bonuses' value={form.registerBonus} onChange={e => setForm({ ...form, registerBonus: e.target.value })} />
      <TextField
        id='affiliateBonus'
        label={`Affiliate bonus (${cur})`}
        hint={form.affiliateBonusRequiresDeposit ? 'Paid to the referrer once the referred user’s first deposit is credited' : 'Paid to the referrer per referred sign-up'}
        value={form.affiliateBonus}
        onChange={e => setForm({ ...form, affiliateBonus: e.target.value })}
      />
      <SwitchField
        id='affiliateBonusRequiresDeposit'
        label='Affiliate bonus only after the first deposit'
        hint='Stops fake sign-ups farming the bonus. Off: booked at sign-up.'
        checked={form.affiliateBonusRequiresDeposit}
        onChange={checked => setForm({ ...form, affiliateBonusRequiresDeposit: checked })}
        disabled={!can('config:write')}
      />
      <TextField id='commissionPercent' inputMode='decimal' label='Commission %' hint='Share of referred users’ activity, 0–100' value={form.commissionPercent} onChange={e => setForm({ ...form, commissionPercent: e.target.value })} />
      </FormErrorsProvider>
      <Button type='submit' disabled={save.isPending || !can('config:write')} className='justify-self-start'>
        {save.isPending && <Loader2Icon className='animate-spin' />}
        Save
      </Button>
    </form>
  )
}

const AffiliateSettings = () => {
  const q = useApi<Affiliate>('admin/site-config/affiliate')

  return (
    <div>
      <PageHeader title='Affiliate rates' description='What the site promises a new user and a referrer. Public by intent — the sign-up page shows these.' />
      {q.error && <ErrorState error={q.error} />}
      <RewardCurrencyNotice className='mb-4 max-w-xl' />
      <Card className='max-w-xl shadow-none'>
        <CardHeader>
          <CardTitle className='text-base'>Rates</CardTitle>
          <CardDescription>Exact decimal strings. Commission is a percentage, capped at 100.</CardDescription>
        </CardHeader>
        <CardContent>
          <AffiliateForm key={q.data ? JSON.stringify(q.data) : 'loading'} initial={q.data} />
        </CardContent>
      </Card>
    </div>
  )
}

export default AffiliateSettings
