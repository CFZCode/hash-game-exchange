'use client'

import { useState } from 'react'

import { Loader2Icon } from 'lucide-react'

import { FormErrorsProvider, SwitchField, TextField, useFormErrors } from '@/components/shared/FormField'
import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { DEFAULT_REWARD_CURRENCY, RewardCurrencyNotice, useRewardCurrency } from '@/components/shared/RewardCurrency'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { check } from '@/lib/validate'

type RegisterBonus = { enabled: boolean; amount: string; currency: string }
type Tier = { minDeposit: string; percent: string; maxBonus: string }
type FirstDepositBonus = { enabled: boolean; tiers: Tier[]; wagerMultiplier: number | null; expiryDays?: number }
type Welcome = { registerBonus: RegisterBonus; firstDepositBonus: FirstDepositBonus; configured: boolean }

const PATH = 'admin/site-config/welcome-bonuses'

const EMPTY: Welcome = {
  registerBonus: { enabled: false, amount: '', currency: DEFAULT_REWARD_CURRENCY },
  firstDepositBonus: { enabled: false, tiers: [], wagerMultiplier: null, expiryDays: 30 },
  configured: false
}

/** "10.00000000" → "10" for editing; the backend stores exact decimals either way. */
const trim = (v: string) => (v.includes('.') ? v.replace(/\.?0+$/, '') : v)

const sortTiers = (tiers: Tier[]) => [...tiers].sort((a, b) => Number(a.minDeposit) - Number(b.minDeposit))

/** `embedded`: inside the Bonus page's Welcome bonuses tab — no page header (the page has the currency notice). */
const WelcomeBonuses = ({ embedded = false }: { embedded?: boolean }) => {
  const q = useApi<Welcome>(PATH)

  return (
    <div>
      {!embedded && <PageHeader
        title='Welcome bonuses'
        description='Decide whether a new player gets a sign-up bonus and a bonus on their first deposit. Every amount here is in the site’s reward currency, and both bonuses are paid in it. Agent-tree players never get either.'
      />}
      {q.error && <ErrorState error={q.error} />}
      {!embedded && <RewardCurrencyNotice className='mb-4 max-w-3xl' />}
      {/* Keyed on the saved values, so a save or refetch resets the form to what is stored. */}
      <WelcomeForm key={q.data ? JSON.stringify(q.data) : 'loading'} saved={q.data} />
    </div>
  )
}

const WelcomeForm = ({ saved }: { saved?: Welcome }) => {
  const { can } = useSession()
  const { code: cur } = useRewardCurrency()
  const base = saved ?? EMPTY
  const writable = can('config:write')

  const [regOn, setRegOn] = useState(base.registerBonus.enabled)
  const [regAmount, setRegAmount] = useState(trim(base.registerBonus.amount))
  const [fdOn, setFdOn] = useState(base.firstDepositBonus.enabled)

  const [tiers, setTiers] = useState<Tier[]>(
    base.firstDepositBonus.tiers.map(t => ({
      minDeposit: trim(t.minDeposit),
      percent: trim(t.percent),
      maxBonus: trim(t.maxBonus)
    }))
  )

  const [wager, setWager] = useState(
    base.firstDepositBonus.wagerMultiplier == null ? '' : String(base.firstDepositBonus.wagerMultiplier)
  )

  const [expiry, setExpiry] = useState(String(base.firstDepositBonus.expiryDays ?? 30))

  const setTier = (i: number, patch: Partial<Tier>) =>
    setTiers(ts => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  const f = useFormErrors()

  /** Every check the platform's `updateWelcomeBonusSettings` makes, keyed per field (tiers per row). */
  const validateForm = () => {
    const rate = (v: string, label: string, optional = true) => check.number(v, label, { min: 0, decimals: 8, optional })

    const errors: Record<string, string | undefined> = {
      registerAmount: rate(regAmount, 'Registration amount'),
      fdWager: check.number(wager, 'Wagering multiplier', { min: 0, max: 100, optional: true }),
      fdExpiry: check.number(expiry, 'Days to wager it', { min: 0, max: 3650, integer: true, optional: true })
    }

    const filled = tiers.filter(t => t.minDeposit.trim() || t.percent.trim() || t.maxBonus.trim())
    const seen = new Set<number>()

    tiers.forEach((t, i) => {
      if (!(t.minDeposit.trim() || t.percent.trim() || t.maxBonus.trim())) return
      const row = `Tier ${i + 1}`

      errors[`tier-${i}-minDeposit`] = rate(t.minDeposit, `${row}: deposit from`)
      errors[`tier-${i}-percent`] =
        check.number(t.percent, `${row}: bonus %`, { decimals: 8 }) || (Number(t.percent) <= 0 || Number(t.percent) > 1000 ? `${row}: bonus % must be above 0 and at most 1000` : undefined)
      errors[`tier-${i}-maxBonus`] = rate(t.maxBonus, `${row}: max bonus`)

      const min = Number(t.minDeposit.trim() || '0')

      if (seen.has(min)) errors[`tier-${i}-minDeposit`] = errors[`tier-${i}-minDeposit`] ?? `${row}: two tiers cannot have the same deposit amount`
      seen.add(min)
    })

    if (fdOn && filled.length === 0) errors.tiers = 'Add at least one tier, or switch the first deposit bonus off'

    return errors
  }

  const save = useApiMutation({
    fn: () =>
      api.put<Welcome>(PATH, {
        registerBonus: { enabled: regOn, amount: regAmount.trim() || '0' },
        firstDepositBonus: {
          enabled: fdOn,
          tiers: sortTiers(tiers.filter(t => t.minDeposit.trim() || t.percent.trim() || t.maxBonus.trim())).map(t => ({
            minDeposit: t.minDeposit.trim() || '0',
            percent: t.percent.trim(),
            maxBonus: t.maxBonus.trim() || '0'
          })),
          wagerMultiplier: wager.trim() === '' ? null : Number(wager),
          expiryDays: Math.max(0, Math.floor(Number(expiry) || 0))
        }
      }),
    invalidate: [
      ['api', PATH],
      ['api', 'admin/site-config/affiliate']
    ],
    success: 'Welcome bonuses saved'
  })

  // The best tier, as a player would read it ("up to 180%").
  const best = tiers.reduce((m, t) => Math.max(m, Number(t.percent) || 0), 0)

  return (
    <form
      className='grid max-w-3xl gap-6'
      onSubmit={e => {
        e.preventDefault()
        if (!f.passes(validateForm())) return
        setTiers(sortTiers(tiers))
        save.mutate(undefined, { onError: f.fromServer })
      }}
    >
      <FormErrorsProvider errors={f.errors} onClear={f.clear}>
      <Card className='shadow-none'>
        <CardHeader>
          <CardTitle className='text-base'>Registration bonus</CardTitle>
          <CardDescription>
            Credited once when a player signs up on the site. Players you create in the admin do not get it.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid max-w-xl gap-4'>
          <SwitchField
            id='registerEnabled'
            label='Give a registration bonus'
            hint='Off: nobody gets it, even with an amount stored.'
            checked={regOn}
            onChange={setRegOn}
            disabled={!writable}
          />
          <TextField
            id='registerAmount'
            label={`Amount (${cur})`}
            hint={`Paid in ${cur}. Same value as “Register bonus” on Affiliate rates.`}
            inputMode='decimal'
            value={regAmount}
            onChange={e => setRegAmount(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className='shadow-none'>
        <CardHeader>
          <CardTitle className='text-base'>First deposit bonus{fdOn && best > 0 ? ` — up to ${best}%` : ''}</CardTitle>
          <CardDescription>
            Paid once, on the player’s first approved or credited deposit (bank, crypto or payment gateway). The deposit
            is converted to {cur} with Exchange rates; the highest tier it reaches applies. Bonus = deposit × % ÷ 100,
            capped at the tier’s max, paid in {cur}. Later deposits never qualify, even if the first was below every
            tier.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <div className='max-w-xl'>
            <SwitchField
              id='fdEnabled'
              label='Give a first deposit bonus'
              hint='Needs at least one tier.'
              checked={fdOn}
              onChange={setFdOn}
              disabled={!writable}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deposit from ({cur})</TableHead>
                <TableHead>Bonus %</TableHead>
                <TableHead>Max bonus ({cur})</TableHead>
                <TableHead className='w-0' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className='text-muted-foreground'>
                    No tiers yet.
                  </TableCell>
                </TableRow>
              )}
              {tiers.map((t, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Input
                      aria-label={`Deposit from (${cur})`}
                      inputMode='decimal'
                      aria-invalid={f.errors[`tier-${i}-minDeposit`] ? true : undefined}
                      value={t.minDeposit}
                      onChange={e => {
                        f.clear(`tier-${i}-minDeposit`)
                        setTier(i, { minDeposit: e.target.value })
                      }}
                    />
                    {f.errors[`tier-${i}-minDeposit`] && <p className='text-destructive mt-1 text-xs'>{f.errors[`tier-${i}-minDeposit`]}</p>}
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label='Bonus %'
                      inputMode='decimal'
                      aria-invalid={f.errors[`tier-${i}-percent`] ? true : undefined}
                      value={t.percent}
                      onChange={e => {
                        f.clear(`tier-${i}-percent`)
                        setTier(i, { percent: e.target.value })
                      }}
                    />
                    {f.errors[`tier-${i}-percent`] && <p className='text-destructive mt-1 text-xs'>{f.errors[`tier-${i}-percent`]}</p>}
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Max bonus (${cur})`}
                      inputMode='decimal'
                      aria-invalid={f.errors[`tier-${i}-maxBonus`] ? true : undefined}
                      value={t.maxBonus}
                      onChange={e => {
                        f.clear(`tier-${i}-maxBonus`)
                        setTier(i, { maxBonus: e.target.value })
                      }}
                    />
                    {f.errors[`tier-${i}-maxBonus`] && <p className='text-destructive mt-1 text-xs'>{f.errors[`tier-${i}-maxBonus`]}</p>}
                  </TableCell>
                  <TableCell>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => setTiers(ts => ts.filter((_, j) => j !== i))}
                      disabled={!writable}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {f.errors.tiers && <p className='text-destructive text-sm'>{f.errors.tiers}</p>}
          <p className='text-muted-foreground text-xs'>
            Bonus % up to 1000. Max bonus 0 = no cap. Rows are sorted by deposit when saved; two rows cannot share a
            deposit amount.
          </p>
          <Button
            type='button'
            variant='outline'
            className='justify-self-start'
            disabled={!writable || tiers.length >= 20}
            onClick={() => setTiers(ts => [...ts, { minDeposit: '', percent: '', maxBonus: '' }])}
          >
            Add tier
          </Button>

          <div className='grid max-w-xl gap-4 sm:grid-cols-2'>
            <TextField
              id='fdWager'
              label='Wagering multiplier'
              hint='e.g. 5 = the player must wager 5× the bonus. Until then the bonus sits in a locked bonus balance and cannot be withdrawn; then it moves to cash. Empty or 0 = paid straight to cash.'
              inputMode='decimal'
              value={wager}
              onChange={e => setWager(e.target.value)}
            />
            <TextField
              id='fdExpiry'
              label='Days to wager it'
              hint='An unwagered bonus is forfeited after this many days. 0 = never expires.'
              inputMode='numeric'
              value={expiry}
              onChange={e => setExpiry(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </CardContent>
      </Card>

      </FormErrorsProvider>
      <Button type='submit' disabled={save.isPending || !writable || !saved} className='justify-self-start'>
        {save.isPending && <Loader2Icon className='animate-spin' />}
        Save
      </Button>
    </form>
  )
}

export default WelcomeBonuses
