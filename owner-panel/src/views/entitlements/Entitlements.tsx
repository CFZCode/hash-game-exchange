'use client'

import { useState } from 'react'

import { CheckIcon, InfoIcon, Loader2Icon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'

import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  FEATURE_CATALOGUE,
  FEATURE_CATEGORIES,
  FLAG_GROUPS,
  featureByKey,
  featureLabel,
  flagLabel,
  optionsOf
} from '@/configs/entitlementCatalogue'
import { HIDDEN_OPTIONS, pinToUi, UI_LABEL, uiSupport } from '@/configs/siteUi'
import { TEMPLATE_CATALOGUE, type TemplateEntry } from '@/configs/templateCatalogue'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api, ApiError } from '@/lib/api/client'
import { buildDraft, isOwnerPick, type Draft } from '@/lib/entitlements/draft'
import { COUNTRY_CODES, LIST_TYPES, parseCountries, REGION_FEATURE, regionProblem, type RegionListType, type RegionSetting } from '@/lib/entitlements/region'
import {
  DEFAULT_WITHDRAWAL_CAP,
  isMultiplier,
  MAX_MULTIPLIER,
  switchesOf,
  variantOfSwitches,
  WITHDRAWAL_REQUIREMENTS,
  type WithdrawalCap
} from '@/lib/entitlements/withdrawalCap'
import { diffDocs, type Change, type EditableDoc, type EntitlementsDoc, type ToggleChange } from '@/lib/entitlements/types'
import { cn } from '@/lib/utils'
import ChangeList from './ChangeList'

type Kind = 'feature' | 'flag' | 'policy'

const FIAT_COIN_FLAGS = new Set(FLAG_GROUPS.find(g => g.title === 'Fiat currencies')?.keys ?? [])

type Row = { kind: Kind; key: string; label: string; description?: string; hint?: string; note?: string }
type Group = { id: string; title: string; description: string; rows: Row[]; bulk?: boolean }

const GROUPS: { section: string; description?: string; groups: Group[] }[] = [
  {
    section: 'Policies',
    description: 'How players join, move money and are rewarded. Always on; the option chosen is the policy.',
    groups: [
      {
        id: 'policy',
        title: 'Business, cashier and rewards',
        description: 'The site admin shows these read-only.',
        bulk: false,
        rows: FEATURE_CATALOGUE.filter(f => f.policy).map(f => ({ kind: 'policy' as const, key: f.key, label: f.label, description: f.description, note: f.note }))
      }
    ]
  },
  {
    section: 'Features',
    description: 'Each feature is ON or OFF for the site and runs one variant. The site admin shows them read-only; its staff can only key in integration settings.',
    groups: FEATURE_CATEGORIES.map((cat): Group => ({
      id: `feature:${cat.key}`,
      title: cat.title,
      description: 'Off: hidden from players and refused by the backend.',
      rows: FEATURE_CATALOGUE.filter(f => f.category === cat.key && !f.policy && uiSupport(f.key)?.status !== 'absent').map(f => ({
        kind: 'feature' as const,
        key: f.key,
        label: f.label,
        description: f.description,
        hint: f.flag ? `flag ${f.flag}` : undefined
      }))
    }))
      .filter(g => g.rows.length > 0)
      .concat([
        {
          id: 'feature:absent',
          title: 'Not in this UI',
          description: 'The bc.game UI has no screen for these, so they stay off and the backend refuses them.',
          bulk: false,
          rows: FEATURE_CATALOGUE.filter(f => !f.policy && uiSupport(f.key)?.status === 'absent').map(f => ({
            kind: 'feature' as const,
            key: f.key,
            label: f.label,
            description: (uiSupport(f.key) as { why: string }).why
          }))
        }
      ])
  },
  {
    section: 'Site flags',
    groups: FLAG_GROUPS.map(g => ({
      id: `flag:${g.title}`,
      title: g.title,
      description: g.description,
      rows: g.keys.map(key => ({ kind: 'flag' as const, key, label: flagLabel(key) }))
    }))
  }
]

/** A feature row's place in this client's UI (configs/siteUi.ts). */
const statusOf = (r: Row) => (r.kind === 'feature' ? (uiSupport(r.key)?.status ?? 'toggle') : null)

const labelOf = (c: ToggleChange) => (c.kind === 'feature' ? featureLabel(c.key) : flagLabel(c.key))

/** The variant a feature switched ON runs when its current one is `none`: the template's, else the first real one. */
const firstVariant = (feature: string, template?: string) => {
  const real = featureByKey(feature)?.variants.filter(v => v.key !== 'none') ?? []
  const fromTemplate = TEMPLATE_CATALOGUE.find(t => t.key === template)?.variants[feature]

  return real.find(v => v.key === fromTemplate)?.key ?? real[0]?.key ?? null
}

const VariantSelect = ({ feature, value, onChange, label }: { feature: string; value: string; onChange: (v: string) => void; label: string }) => {
  const variants = featureByKey(feature)?.variants ?? []

  return (
    <Select
      items={variants.map(v => ({ value: v.key, label: v.label }))}
      value={value}
      autoComplete='off'
      onValueChange={(v, details) => v && isOwnerPick(details.reason) && onChange(v)}
    >
      <SelectTrigger size='sm' className='w-full sm:w-60' aria-label={`${label} variant`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {variants.map(v => (
          <SelectItem key={v.key} value={v.key}>
            {v.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Region restriction's list type and countries, under its mode dropdown. Codes are typed as text
 * ("US, GB"); an unknown code is named here and refused by the save (422).
 */
const RegionEditor = ({ value, onChange, changed }: { value: RegionSetting; onChange: (r: RegionSetting) => void; changed: boolean }) => {
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? value.countries.join(', ')
  const parsed = parseCountries(shown)
  const problem = regionProblem({ listType: value.listType, countries: parsed })

  return (
    <div className={cn('mt-2 flex flex-col gap-2 border-l pl-3', changed && 'bg-primary/5 -mx-1 rounded px-1')} data-region-editor>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-xs font-medium'>List type</span>
        <Select
          items={LIST_TYPES.map(l => ({ value: l.key, label: l.label }))}
          value={value.listType}
          autoComplete='off'
          onValueChange={(v, details) => v && isOwnerPick(details.reason) && onChange({ ...value, listType: v as RegionListType })}
        >
          <SelectTrigger size='sm' className='w-40' aria-label='Region list type'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIST_TYPES.map(l => (
              <SelectItem key={l.key} value={l.key}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className='text-muted-foreground text-xs'>{LIST_TYPES.find(l => l.key === value.listType)?.description}</span>
      </div>
      <label className='flex flex-col gap-1'>
        <span className='text-xs font-medium'>Countries (ISO 3166-1 alpha-2, comma separated)</span>
        <Input
          value={shown}
          placeholder='e.g. US, GB'
          aria-label='Region countries'
          aria-invalid={!!problem}
          onChange={e => {
            setText(e.target.value)
            const countries = parseCountries(e.target.value)

            if (countries.every(c => COUNTRY_CODES.includes(c))) onChange({ ...value, countries: [...countries].sort() })
          }}
          onBlur={() => !problem && setText(null)}
        />
      </label>
      {problem ? (
        <p className='text-destructive text-xs' data-warning='region-countries'>
          {problem}
        </p>
      ) : (
        <p className='text-muted-foreground text-xs'>
          {value.countries.length
            ? `${value.listType === 'allowlist' ? 'Only' : 'Restricted:'} ${value.countries.join(', ')}${value.listType === 'allowlist' ? ' allowed.' : '.'}`
            : 'No countries: nobody is restricted.'}{' '}
          Unknown and private addresses are never restricted.
        </p>
      )}
    </div>
  )
}

/** A multiplier typed by the owner: a positive number, at most 2 decimals, at most MAX_MULTIPLIER. */
const MultiplierInput = ({ value, onChange, label, disabled }: { value: number; onChange: (n: number) => void; label: string; disabled?: boolean }) => {
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? String(value)
  const parsed = /^\d+(\.\d{1,2})?$/.test(shown.trim()) ? Number(shown.trim()) : NaN
  const bad = !isMultiplier(parsed)

  return (
    <span className='inline-flex flex-col gap-0.5'>
      <span className='inline-flex items-center gap-1'>
        <Input
          value={shown}
          inputMode='decimal'
          disabled={disabled}
          aria-label={label}
          aria-invalid={bad}
          className='h-7 w-20'
          onChange={e => {
            setText(e.target.value)
            const t = e.target.value.trim()
            const n = /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : NaN

            if (isMultiplier(n)) onChange(n)
          }}
          onBlur={() => !bad && setText(null)}
        />
        <span className='text-muted-foreground text-xs'>×</span>
      </span>
      {bad && !disabled && (
        <span className='text-destructive text-xs' data-warning='withdrawal-cap-multiplier'>
          Above 0, at most {MAX_MULTIPLIER}, 2 decimals
        </span>
      )}
    </span>
  )
}

/** One requirement switch with its label and what it means. */
const RequirementSwitch = ({ label, description, checked, onChecked, name }: { label: string; description: string; checked: boolean; onChecked: (v: boolean) => void; name: string }) => (
  <label className='flex items-start gap-3' data-requirement={name}>
    <Switch size='sm' checked={checked} onCheckedChange={onChecked} aria-label={label} />
    <span className='min-w-0'>
      <span className='block text-xs font-medium'>{label}</span>
      <span className='text-muted-foreground block text-xs'>{description}</span>
    </span>
  </label>
)

/**
 * Withdrawal requirements as switches, any combination: KYC and wagering are the policy's variant
 * (none / kyc / wager / kyc_and_wager), the deposit cap is the document's `withdrawalCap`.
 */
const WithdrawalRequirementsEditor = ({
  variant,
  cap,
  onVariant,
  onCap,
  changedVariant,
  changedCap
}: {
  variant: string
  cap: WithdrawalCap
  onVariant: (v: string) => void
  onCap: (c: WithdrawalCap) => void
  changedVariant: boolean
  changedCap: boolean
}) => {
  const sw = switchesOf(variant)

  return (
    <div className='mt-2 flex flex-col gap-2 border-l pl-3' data-withdrawal-requirements>
      <div className={cn('flex flex-col gap-2', changedVariant && 'bg-primary/5 -mx-1 rounded px-1')}>
        <RequirementSwitch
          name='kyc'
          label='KYC required'
          description="The player's KYC must be Verified."
          checked={sw.kyc}
          onChecked={v => onVariant(variantOfSwitches({ ...sw, kyc: v }))}
        />
        <RequirementSwitch
          name='wager'
          label='Wagering complete required'
          description='The deposit rollover and every active bonus must be wagered (forfeiting a bonus clears its part).'
          checked={sw.wager}
          onChecked={v => onVariant(variantOfSwitches({ ...sw, wager: v }))}
        />
      </div>
      <div className={cn('flex flex-col gap-2', changedCap && 'bg-primary/5 -mx-1 rounded px-1')} data-withdrawal-cap>
        <RequirementSwitch
          name='cap'
          label='Deposit cap'
          description='Per currency, a player can withdraw at most their deposits × the multiplier (+ what wagering unlocks), minus what they have already withdrawn (pending included).'
          checked={cap.enabled}
          onChecked={v => onCap({ ...cap, enabled: v })}
        />
        {cap.enabled && (
          <div className='ml-12 flex flex-col gap-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-xs font-medium'>Deposit multiplier</span>
              <MultiplierInput label='Deposit multiplier' value={cap.depositMultiplier} onChange={n => onCap({ ...cap, depositMultiplier: n })} />
            </div>
            <label className='flex items-center gap-2'>
              <Switch size='sm' checked={cap.wagerBonus} onCheckedChange={v => onCap({ ...cap, wagerBonus: v })} aria-label='Wager bonus' />
              <span className='text-xs font-medium'>Wager bonus</span>
              <span className='text-muted-foreground text-xs'>adds the amount wagered, up to</span>
              <MultiplierInput
                label='Wager bonus multiplier'
                value={cap.wagerMultiplier}
                disabled={!cap.wagerBonus}
                onChange={n => onCap({ ...cap, wagerMultiplier: n })}
              />
              <span className='text-muted-foreground text-xs'>deposits</span>
            </label>
            <p className='text-muted-foreground text-xs'>
              Example: 1,000 deposited, 1,000 wagered → cap {(1000 * cap.depositMultiplier + (cap.wagerBonus ? Math.min(1000, 1000 * cap.wagerMultiplier) : 0)).toLocaleString('en-US')}.
              Refused over it: 403 WITHDRAW_CAP_EXCEEDED.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const TemplateCard = ({ template, selected, saved, onSelect }: { template: TemplateEntry; selected: boolean; saved: boolean; onSelect: () => void }) => (
  <button
    type='button'
    aria-pressed={selected}
    onClick={onSelect}
    className={cn(
      'bg-card flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors',
      selected ? 'border-primary ring-primary/30 ring-2' : 'hover:border-foreground/30'
    )}
  >
    {/* Preview swatch only: accent on background. The site's real tokens live in its theme. */}
    <div className='flex h-14 items-end gap-2 rounded-md border p-2' style={{ backgroundColor: template.swatch.background }} aria-hidden>
      <span className='h-6 w-10 rounded-sm' style={{ backgroundColor: template.swatch.accent }} />
      <span className='h-2 w-16 rounded-full opacity-60' style={{ backgroundColor: template.swatch.accent }} />
    </div>
    <div className='flex items-center justify-between gap-2'>
      <span className='font-semibold'>{template.label}</span>
      {selected ? (
        <Badge className='gap-1'>
          <CheckIcon className='size-3' /> {saved ? 'Active' : 'Selected'}
        </Badge>
      ) : saved ? (
        <Badge variant='outline'>Current</Badge>
      ) : (
        <span className='text-muted-foreground font-mono text-xs'>{template.key}</span>
      )}
    </div>
    <p className='text-xs'>
      <span className='font-medium'>On this UI:</span> {template.colours}
    </p>
  </button>
)

const Entitlements = () => {
  const { data: doc, error, isLoading, refetch } = useApi<EditableDoc>('/api/owner/entitlements')

  // Edits on top of the loaded document; null = nothing touched yet.
  const [edits, setEdits] = useState<Draft | null>(null)
  const [query, setQuery] = useState('')
  const [reviewing, setReviewing] = useState(false)

  // Pinned to this UI the way the save pins it (store.ts), so the screen shows what will be stored.
  const draft: Draft | null = doc ? (d => ({ ...d, ...pinToUi(d.features, d.variants) }))(buildDraft(doc, edits)) : null

  const changes = doc && draft ? diffDocs(doc, draft) : []
  const changed = new Set(changes.map(c => `${c.kind === 'variant' ? 'feature' : c.kind}:${c.key}`))

  const edit = (fn: (next: Draft) => void) =>
    setEdits(prev => {
      const next: Draft = {
        template: prev?.template,
        features: { ...prev?.features },
        flags: { ...prev?.flags },
        variants: { ...prev?.variants },
        options: Object.fromEntries(Object.entries(prev?.options ?? {}).map(([f, v]) => [f, { ...v }])),
        ...(prev?.region ? { region: { ...prev.region, countries: [...prev.region.countries] } } : {}),
        ...(prev?.withdrawalCap ? { withdrawalCap: { ...prev.withdrawalCap } } : {})
      }

      fn(next)

      return next
    })

  /** ON/OFF. A feature switched on while its variant is `none` gets a real one (contract: `none` = off). */
  const set = (rows: Row[], value: boolean) =>
    edit(next => {
      for (const r of rows) {
        if (r.kind === 'policy') continue

        if (r.kind === 'flag') {
          next.flags[r.key] = value
          continue
        }

        const current = next.variants[r.key] ?? doc?.variants[r.key]
        const variant = value && (!current || current === 'none') ? firstVariant(r.key, draft?.template) : current

        // A feature with no real variant (nothing implements it yet) cannot be switched on.
        if (value && !variant) continue
        next.features[r.key] = value
        if (variant && variant !== current) next.variants[r.key] = variant
      }
    })

  /** An owner-only option of a feature (e.g. when the spin wheel grants a spin). */
  const setOption = (feature: string, option: string, value: boolean) =>
    edit(next => {
      next.options[feature] = { ...next.options[feature], [option]: value }
    })

  /** Picking `none` switches the feature off; any other variant switches it on. Policies are always on. */
  const setVariant = (r: Row, variant: string) =>
    edit(next => {
      next.variants[r.key] = variant
      if (r.kind === 'feature') next.features[r.key] = variant !== 'none'
    })

  /** On this client a template is a colour theme only: it never switches a feature or a variant. */
  const pickTemplate = (key: string) =>
    edit(next => {
      next.template = key === doc?.template ? undefined : key
    })

  const save = useApiMutation<void, { doc: EntitlementsDoc; changes: Change[]; live?: { live: boolean; reason?: string } }>({
    fn: () =>
      api.put('/api/owner/entitlements', {
        version: doc!.version,
        template: draft!.template,
        features: draft!.features,
        flags: draft!.flags,
        variants: draft!.variants,
        options: draft!.options,
        region: draft!.region,
        withdrawalCap: draft!.withdrawalCap
      }),
    invalidate: [['api']],
    success: r =>
      !r.changes.length
        ? 'Nothing to save'
        : r.live?.live
          ? `Saved as version ${r.doc.version} — live on the site now`
          : `Saved as version ${r.doc.version} — the backend picks it up on its next poll`,
    onSuccess: () => {
      setEdits(null)
      setReviewing(false)
    }
  })

  const q = query.trim().toLowerCase()

  const match = (r: Row) =>
    !q ||
    r.key.toLowerCase().includes(q) ||
    r.label.toLowerCase().includes(q) ||
    (r.description ?? '').toLowerCase().includes(q) ||
    (r.kind !== 'flag' && (featureByKey(r.key)?.variants ?? []).some(v => v.key.includes(q) || v.label.toLowerCase().includes(q)))

  return (
    <div className={cn(changes.length > 0 && 'pb-20')}>
      <PageHeader
        title='Features & plan'
        description={
          doc
            ? `Version ${doc.version}. The template, the policies and every feature's ON/OFF and variant are set here only; the site admin shows them read-only.`
            : 'Loading…'
        }
        actions={
          <div className='relative'>
            <SearchIcon className='text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2' />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search key or label' className='w-64 pl-8' />
          </div>
        }
      />
      {error ? (
        <ErrorState error={error} />
      ) : isLoading || !draft ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className='h-56' />
          ))}
        </div>
      ) : (
        <div className='flex flex-col gap-8'>
          {doc?.seededFrom && (
            <Alert>
              <InfoIcon />
              <AlertTitle>No variants saved yet</AlertTitle>
              <AlertDescription>
                {doc.seededFrom === 'backend'
                  ? "The variants and ON/OFF below were read from the site's live state."
                  : 'The site did not answer, so the variants below come from the current template.'}{' '}
                The next save records them all in the document.
              </AlertDescription>
            </Alert>
          )}
          <section className='flex flex-col gap-4'>
            <div>
              <h2 className='text-lg font-semibold'>Template</h2>
              <p className='text-muted-foreground text-sm'>
                The site&apos;s colour theme. This site runs the {UI_LABEL}: a template recolours it (layout, fonts and art stay) and never changes
                a feature below. Hash Game (original) keeps bc.game&apos;s own colours.
              </p>
            </div>
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
              {TEMPLATE_CATALOGUE.map(t => (
                <TemplateCard key={t.key} template={t} selected={draft.template === t.key} saved={doc?.template === t.key} onSelect={() => pickTemplate(t.key)} />
              ))}
            </div>
          </section>
          {GROUPS.map(({ section, description, groups }) => {
            const visible = groups.map(g => ({ ...g, shown: g.rows.filter(match) })).filter(g => g.shown.length > 0)

            if (!visible.length) return null

            return (
              <section key={section} className='flex flex-col gap-4'>
                <div>
                  <h2 className='text-lg font-semibold'>{section}</h2>
                  {description && <p className='text-muted-foreground text-sm'>{description}</p>}
                </div>
                <div className='grid items-start gap-4 lg:grid-cols-2'>
                  {visible.map(g => {
                    const value = (r: Row) => r.kind === 'policy' || (r.kind === 'feature' ? draft.features : draft.flags)[r.key] !== false
                    const switchable = (r: Row) => statusOf(r) === null || statusOf(r) === 'toggle'


                    // The reward currency's coin must itself be entitled (its coin flag; a crypto coin also the crypto master).
                    const coinBlocked = (code: string) => {
                      const k = code.toLowerCase()

                      return draft.flags[k] === false || (!FIAT_COIN_FLAGS.has(k) && draft.flags.cryptocoin === false)
                    }

                    const on = g.rows.filter(value).length

                    return (
                      <Card key={g.id} className='gap-4 shadow-none'>
                        <CardHeader>
                          <CardTitle className='flex items-center gap-2'>
                            {g.title}
                            <Badge variant='outline' className='font-normal tabular-nums'>
                              {on}/{g.rows.length}
                            </Badge>
                          </CardTitle>
                          <CardDescription>{g.description}</CardDescription>
                          {g.bulk !== false && (
                            <CardAction className='flex gap-1'>
                              <Button size='xs' variant='outline' onClick={() => set(g.shown.filter(switchable), true)}>
                                {g.shown[0]?.kind === 'flag' ? 'Allow all' : 'All on'}
                              </Button>
                              <Button size='xs' variant='outline' onClick={() => set(g.shown.filter(switchable), false)}>
                                {g.shown[0]?.kind === 'flag' ? 'Block all' : 'All off'}
                              </Button>
                            </CardAction>
                          )}
                        </CardHeader>
                        <CardContent className='flex flex-col divide-y'>
                          {g.shown.map(r => {
                            const variant = r.kind === 'flag' ? null : draft.variants[r.key]
                            const variantInfo = variant ? featureByKey(r.key)?.variants.find(v => v.key === variant) : undefined
                            const canTurnOn = r.kind !== 'feature' || value(r) || !!firstVariant(r.key, draft.template)
                            const status = statusOf(r)
                            const rowKey = `${r.kind === 'policy' ? 'feature' : r.kind}:${r.key}`

                            return (
                              <div
                                key={r.key}
                                data-row={r.key}
                                className={cn(
                                  'flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
                                  (changed.has(rowKey) || changed.has(`variant:${r.key}`) || (r.key === WITHDRAWAL_REQUIREMENTS && changed.has('withdrawal_cap:withdrawalCap'))) && 'bg-primary/5 -mx-2 rounded px-2'
                                )}
                              >
                                <div className='min-w-0'>
                                  <div className='flex flex-wrap items-center gap-2'>
                                    <span className='text-sm font-medium'>{r.label}</span>
                                    <span className='text-muted-foreground font-mono text-xs'>{r.key}</span>
                                    {r.hint && <span className='text-muted-foreground text-xs'>· {r.hint}</span>}
                                  </div>
                                  <p className='text-muted-foreground mt-0.5 text-xs'>
                                    {r.kind === 'flag' || status === 'absent'
                                      ? r.description
                                      : status
                                        ? `${UI_LABEL}: ${(uiSupport(r.key) as { surfaces: string }).surfaces}.`
                                        : (r.note ?? variantInfo?.description ?? r.description)}
                                  </p>
                                  {r.kind === 'feature' && status !== 'absent' && optionsOf(r.key).some(o => !HIDDEN_OPTIONS.has(`${r.key}.${o.key}`)) && (
                                    <div className='mt-2 flex flex-col gap-2 border-l pl-3' data-options={r.key}>
                                      {optionsOf(r.key).filter(o => !HIDDEN_OPTIONS.has(`${r.key}.${o.key}`)).map(o => (
                                        <label
                                          key={o.key}
                                          data-option={`${r.key}.${o.key}`}
                                          className={cn('flex items-start gap-3', changed.has(`option:${r.key}.${o.key}`) && 'bg-primary/5 -mx-1 rounded px-1')}
                                        >
                                          <Switch
                                            size='sm'
                                            checked={draft.options[r.key]?.[o.key] ?? o.default}
                                            onCheckedChange={v => setOption(r.key, o.key, v)}
                                            aria-label={o.label}
                                          />
                                          <span className='min-w-0'>
                                            <span className='block text-xs font-medium'>{o.label}</span>
                                            <span className='text-muted-foreground block text-xs'>{o.description}</span>
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                  {r.key === REGION_FEATURE && (
                                    <RegionEditor
                                      value={draft.region ?? { listType: 'blocklist', countries: [] }}
                                      changed={changed.has('region:region')}
                                      onChange={region => edit(next => void (next.region = region))}
                                    />
                                  )}
                                  {r.key === WITHDRAWAL_REQUIREMENTS && variant && (
                                    <WithdrawalRequirementsEditor
                                      variant={variant}
                                      cap={draft.withdrawalCap ?? DEFAULT_WITHDRAWAL_CAP}
                                      changedVariant={changed.has(rowKey)}
                                      changedCap={changed.has('withdrawal_cap:withdrawalCap')}
                                      onVariant={v => setVariant(r, v)}
                                      onCap={withdrawalCap => edit(next => void (next.withdrawalCap = withdrawalCap))}
                                    />
                                  )}
                                  {r.key === 'default_currency' && variant && coinBlocked(variant) && (
                                    <p className='text-destructive mt-0.5 text-xs' data-warning='default-currency-coin-off'>
                                      {variant} is not entitled under Site flags, so screens cannot open on it. Allow the coin or pick another default coin.
                                    </p>
                                  )}
                                  {r.key === 'reward_currency' && variant && coinBlocked(variant) && (
                                    <p className='text-destructive mt-0.5 text-xs' data-warning='reward-currency-coin-off'>
                                      {variant} is not entitled under Site flags, so players cannot see that balance. Allow the coin or pick another reward currency.
                                    </p>
                                  )}
                                </div>
                                <div className='flex shrink-0 items-center gap-3'>
                                  {r.kind === 'policy' && variant && r.key !== WITHDRAWAL_REQUIREMENTS && (
                                    <VariantSelect feature={r.key} value={variant} label={r.label} onChange={v => setVariant(r, v)} />
                                  )}
                                  {status === 'toggle' && <Badge variant='outline' className='font-normal'>{UI_LABEL}</Badge>}
                                  {status === 'fixed' && <Badge variant='secondary' className='font-normal'>Always on in this UI</Badge>}
                                  {status === 'absent' && <Badge variant='outline' className='text-muted-foreground font-normal'>Not in this UI</Badge>}
                                  {r.kind !== 'policy' && (
                                    <Switch
                                      checked={value(r)}
                                      disabled={!canTurnOn || !switchable(r)}
                                      onCheckedChange={v => set([r], v)}
                                      aria-label={r.kind === 'flag' ? `${r.label} entitled` : `${r.label} on`}
                                    />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {changes.length > 0 && (
        <div className='bg-card fixed inset-x-0 bottom-0 z-40 border-t shadow-lg'>
          <div className='mx-auto flex max-w-360 items-center justify-between gap-4 px-4 py-3 sm:px-6'>
            <p className='text-sm'>
              <span className='font-semibold'>{changes.length}</span> unsaved change{changes.length === 1 ? '' : 's'}
            </p>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => setEdits(null)} disabled={save.isPending}>
                Discard
              </Button>
              <Button onClick={() => setReviewing(true)}>Review and save</Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={reviewing} onOpenChange={setReviewing}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Save features &amp; plan</DialogTitle>
            <DialogDescription>
              Version {doc?.version} → {(doc?.version ?? 0) + 1}. The site picks this up within seconds.
            </DialogDescription>
          </DialogHeader>
          <div className='max-h-[60vh] overflow-y-auto'>
            <ChangeList changes={changes} labelOf={labelOf} />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setReviewing(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() =>
                save.mutate(undefined, {
                  onError: e => {
                    if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') {
                      toast.info('Reloaded the latest version; your edits are kept on top of it.')
                      void refetch()
                    }
                  }
                })
              }
            >
              {save.isPending && <Loader2Icon className='animate-spin' />} Save {changes.length} change{changes.length === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Entitlements
