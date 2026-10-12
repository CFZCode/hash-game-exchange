'use client'

import { useMemo, useState } from 'react'

import { InfoIcon, LockIcon, SendIcon, SettingsIcon } from 'lucide-react'

import ErrorState from '@/components/shared/ErrorState'
import FormDialog from '@/components/shared/FormDialog'
import { TextField } from '@/components/shared/FormField'
import PageHeader from '@/components/shared/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UI_LABEL, uiSupport } from '@/configs/siteUi'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  OWNER_MANAGED_MESSAGE,
  type Catalogue,
  type CatalogueFeature,
  type SiteFeature,
  type SiteFeatures,
  describeTemplate
} from './featureTypes'

/** How often the features read is refreshed so what the platform changes shows up live. */
const FEATURES_POLL_MS = 15_000

/** The variant's label as staff see it (read-only: the platform picks the variant). */
const variantLabel = (spec: CatalogueFeature, cur: SiteFeature) =>
  spec.variants.find(v => v.key === cur.variant)?.label ?? cur.variantLabel ?? cur.variant

/**
 * Keys for the variant the platform chose (e.g. push notification App ID / API key). Staff may
 * still key these in; the variant and the on/off switch are the platform's alone, so neither is
 * sent — the backend keeps both as they are.
 */
const IntegrationSettings = ({ feature, current }: { feature: CatalogueFeature; current: SiteFeature }) => {
  const spec = feature.variants.find(v => v.key === current.variant)
  const [config, setConfig] = useState<Record<string, string>>(current.config ?? {})
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [testUser, setTestUser] = useState('')

  const save = useApiMutation({
    fn: () =>
      api.put(`admin/features/${feature.key}`, {
        config: Object.fromEntries((spec?.configFields ?? []).map(f => [f.key, config[f.key] ?? ''])),
        ...(Object.keys(secrets).length ? { secrets } : {})
      }),
    invalidate: [['api', 'admin/features']],
    success: `${feature.label} settings saved`,
    onSuccess: () => setSecrets({})
  })

  const test = useApiMutation({
    fn: () =>
      api.post<{ accepted: number; failures: string[] }>(
        `admin/features/${feature.key}/test`,
        testUser ? { userId: Number(testUser) } : {}
      ),
    success: r =>
      r.accepted
        ? 'Accepted by the provider'
        : `Sent — nobody subscribed${r.failures.length ? ` (${r.failures.join('; ')})` : ''}`
  })

  if (!spec || (!spec.configFields.length && !spec.secretFields.length)) return null

  return (
    <FormDialog
      trigger={
        <Button size='sm' variant='outline'>
          <SettingsIcon /> Configure
        </Button>
      }
      title={`${feature.label} — ${spec.label}`}
      description='Keys for the variant the platform set. Keys are sealed and never shown again; leave one blank to keep it.'
      submitLabel='Save'
      onSubmit={() => save.mutateAsync()}
    >
      {spec.configFields.map(f => (
        <TextField
          key={f.key}
          id={`c-${f.key}`}
          label={f.label}
          required={f.required}
          placeholder={f.placeholder}
          value={config[f.key] ?? ''}
          onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
        />
      ))}
      {spec.secretFields.map(f => (
        <TextField
          key={f.key}
          id={`s-${f.key}`}
          label={f.label}
          type='password'
          autoComplete='off'
          required={f.required && !current.secretsSet?.[f.key]}
          placeholder={current.secretsSet?.[f.key] ? '•••••••• stored' : 'not set'}
          value={secrets[f.key] ?? ''}
          onChange={e => setSecrets(s => ({ ...s, [f.key]: e.target.value }))}
        />
      ))}
      {spec.secretFields.length > 0 && (
        <div className='flex gap-2'>
          <input
            className='border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm'
            placeholder='User id for a test (blank = segment)'
            value={testUser}
            onChange={e => setTestUser(e.target.value.replace(/\D/g, ''))}
          />
          <Button type='button' variant='outline' onClick={() => test.mutate()} disabled={test.isPending}>
            <SendIcon /> Test
          </Button>
        </div>
      )}
    </FormDialog>
  )
}

const Features = () => {
  const { can, featureEntitled } = useSession()
  const canWrite = can('config:write')
  const catalogue = useApi<Catalogue>('admin/features/catalogue')

  // The platform owner sets every variant, switch and the template; a short poll (plus the
  // session's entitlements watch, which refetches on a new owner version) keeps this read-only view current.
  const current = useApi<SiteFeatures>('admin/features', undefined, {
    refetchInterval: FEATURES_POLL_MS,
    refetchOnWindowFocus: true
  })

  const template = useMemo(
    () => describeTemplate(current.data?.template, catalogue.data?.templates),
    [current.data?.template, catalogue.data?.templates]
  )

  const rows = useMemo(() => {
    if (!catalogue.data || !current.data) return []
    const byKey = new Map(current.data.features.map(f => [f.feature, f]))

    // This site's UI (configs/siteUi.ts): features it has no screen for are listed together, last.
    const absent = (key: string) => uiSupport(key)?.status === 'absent'

    return [...CATEGORY_ORDER, 'not_in_ui'].map(cat => ({
      cat,
      items: catalogue
        .data!.features.filter(f => (cat === 'not_in_ui' ? absent(f.key) : f.category === cat && !absent(f.key)))
        .flatMap(spec => {
          const cur = byKey.get(spec.key)

          if (!cur) return []

          // Locked when either the row itself or the owner's entitlements say so.
          return [{ spec, cur, entitled: cur.entitled !== false && featureEntitled(spec.key) }]
        })
    })).filter(g => g.items.length)
  }, [catalogue.data, current.data, featureEntitled])

  const error = catalogue.error || current.error

  return (
    <div>
      <PageHeader
        title='Features'
        description='This site’s business model, how it takes and pays money, and which variant of each feature it offers. Business settings are enforced by the backend on the next request.'
      />

      <Alert className='mb-4'>
        <InfoIcon />
        <AlertDescription>{OWNER_MANAGED_MESSAGE}</AlertDescription>
      </Alert>

      {error && <ErrorState error={error} />}
      {!rows.length && !error && <Skeleton className='h-96' />}

      {catalogue.data && current.data && (
        <Card className='mb-4 shadow-none'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              Template{' '}
              {template ? <Badge>{template.label}</Badge> : <Badge variant='outline'>none</Badge>}
            </CardTitle>
            {template?.description && <CardDescription>{template.description}</CardDescription>}
            <CardDescription className='flex items-center gap-1.5'>
              <LockIcon className='size-3' /> Set by the platform. Contact support to change it.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className='grid gap-4'>
        {rows.map(({ cat, items }) => (
          <Card key={cat} className='gap-0 py-0 shadow-none'>
            <CardHeader className='border-b py-3'>
              <CardTitle className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                {cat === 'not_in_ui' ? 'Not in this UI' : (CATEGORY_LABELS[cat] ?? cat)}
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-muted-foreground pl-4 text-xs font-medium tracking-wide uppercase'>
                    Feature
                  </TableHead>
                  <TableHead className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                    Variant
                  </TableHead>
                  <TableHead className='text-muted-foreground pr-4 text-xs font-medium tracking-wide uppercase'>
                    On
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(({ spec, cur, entitled }) => {
                  const policy = spec.kind === 'policy'
                  const ui = policy ? null : uiSupport(spec.key)
                  const on = policy ? cur.variant !== 'none' : cur.enabled && cur.variant !== 'none'

                  const configurable =
                    spec.category === 'integration' && canWrite && entitled && cur.enabled && cur.variant !== 'none'

                  return (
                    <TableRow key={spec.key} className={entitled ? undefined : 'opacity-60'}>
                      <TableCell className='pl-4'>
                        <span className='flex items-center gap-2 font-medium'>
                          {spec.label}
                          {!entitled && (
                            <Badge variant='outline' className='gap-1 font-normal'>
                              <LockIcon className='size-3' /> Not in your plan
                            </Badge>
                          )}
                        </span>
                        <span className='text-muted-foreground block max-w-md truncate text-xs'>
                          {ui?.status === 'absent'
                            ? ui.why
                            : ui
                              ? `${UI_LABEL}: ${ui.surfaces}.`
                              : spec.variants.find(v => v.key === cur.variant)?.description}
                        </span>
                        {cur.region && cur.variant !== 'none' && (
                          <span className='text-muted-foreground block text-xs' data-region>
                            {cur.region.listType === 'allowlist' ? 'Allowed only: ' : 'Restricted: '}
                            {cur.region.countries.length ? cur.region.countries.join(', ') : 'no countries'}
                          </span>
                        )}
                        {cur.withdrawalCap && (
                          <span className='text-muted-foreground block text-xs' data-withdrawal-cap>
                            Deposit cap:{' '}
                            {cur.withdrawalCap.enabled
                              ? `${cur.withdrawalCap.depositMultiplier}× deposits${cur.withdrawalCap.wagerBonus ? ` + wagering up to ${cur.withdrawalCap.wagerMultiplier}×` : ''}, per currency`
                              : 'off'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className='flex items-center gap-2'>
                          <Badge variant={policy ? 'secondary' : 'outline'}>
                            {ui?.status === 'absent'
                              ? 'Not in this UI'
                              : ui?.status === 'fixed'
                                ? `${UI_LABEL} · always on`
                                : ui
                                  ? UI_LABEL
                                  : variantLabel(spec, cur)}
                          </Badge>
                          {configurable && <IntegrationSettings feature={spec} current={cur} />}
                        </span>
                      </TableCell>
                      <TableCell className='pr-4'>
                        {policy ? (
                          <span className='text-muted-foreground text-xs'>always on</span>
                        ) : (
                          <Badge variant={on ? 'default' : 'outline'}>{on ? 'On' : 'Off'}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Features
