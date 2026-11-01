'use client'

import { Input } from '@/components/ui/input'

import { GATEWAY_LABELS } from './PlanPicker'
import { GATEWAYS, type Plan, type Product, type Terms } from './types'

const PERCENT = /^\d{1,3}(\.\d{1,2})?$/

const PRODUCT_LABELS: Record<Product, string> = { casino: 'Casino', sports: 'Sports', originals: 'Original games' }

export const ZERO_TERMS: Terms = {
  fees: Object.fromEntries(GATEWAYS.map(g => [g, { deposit: '0', withdraw: '0' }])) as Terms['fees'],
  revenueShare: { casino: '0', sports: '0', originals: '0' }
}

const percentOk = (v: string) => PERCENT.test(v) && Number(v) <= 100

export const termsError = (terms: Terms) =>
  [...Object.values(terms.fees).flatMap(f => [f.deposit, f.withdraw]), ...Object.values(terms.revenueShare)].every(percentOk)
    ? ''
    : 'Every rate is a percentage from 0 to 100 with at most 2 decimals'

type Props = { value: Terms; onChange: (terms: Terms) => void; plan: Plan }

/**
 * Gateway charges (per gateway the plan gives it) and the GGR revenue share (per product it runs).
 * The worked example uses the first gateway's deposit rate, so the Super Admin sees what it means.
 */
const TermsEditor = ({ value, onChange, plan }: Props) => {
  const gateways = GATEWAYS.filter(g => plan.payments.gateways[g])
  const products = (Object.keys(PRODUCT_LABELS) as Product[]).filter(p => plan.products[p])

  const rate = (current: string, set: (v: string) => void, label: string) => (
    <label className='grid gap-1'>
      <span className='text-muted-foreground text-xs'>{label}</span>
      <div className='flex items-center gap-1'>
        <Input inputMode='decimal' value={current} aria-invalid={!percentOk(current)} onChange={e => set(e.target.value.trim())} className='w-24' />
        <span className='text-sm'>%</span>
      </div>
    </label>
  )

  const example = gateways[0] ? value.fees[gateways[0]] : null

  return (
    <div className='grid gap-6'>
      <div className='grid gap-3'>
        <span className='text-sm font-medium'>Gateway charges</span>
        {gateways.length === 0 ? (
          <span className='text-muted-foreground text-sm'>No gateway is chosen in the plan: manual payments only, no charges.</span>
        ) : (
          <>
            {gateways.map(g => (
              <div key={g} className='flex flex-wrap items-end gap-4'>
                <span className='w-44 text-sm'>{GATEWAY_LABELS[g]}</span>
                {rate(value.fees[g].deposit, v => onChange({ ...value, fees: { ...value.fees, [g]: { ...value.fees[g], deposit: v } } }), 'Deposit')}
                {rate(value.fees[g].withdraw, v => onChange({ ...value, fees: { ...value.fees, [g]: { ...value.fees[g], withdraw: v } } }), 'Withdrawal')}
              </div>
            ))}
            {example && percentOk(example.deposit) && percentOk(example.withdraw) && (
              <span className='text-muted-foreground text-xs'>
                Example: a player deposits 10,000 by {GATEWAY_LABELS[gateways[0]]} → the company balance goes up by{' '}
                {(10000 * (1 - Number(example.deposit) / 100)).toLocaleString('en-IN')}. A 10,000 withdrawal takes{' '}
                {(10000 * (1 + Number(example.withdraw) / 100)).toLocaleString('en-IN')}. Manual payments are never charged.
              </span>
            )}
          </>
        )}
      </div>
      <div className='grid gap-3'>
        <span className='text-sm font-medium'>GGR revenue share (reported, not collected)</span>
        <div className='flex flex-wrap gap-6'>
          {products.map(p => (
            <div key={p}>{rate(value.revenueShare[p], v => onChange({ ...value, revenueShare: { ...value.revenueShare, [p]: v } }), PRODUCT_LABELS[p])}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TermsEditor
