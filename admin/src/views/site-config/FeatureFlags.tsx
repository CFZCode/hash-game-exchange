'use client'

import { useMemo, useState } from 'react'

import { Loader2Icon, LockIcon, RotateCcwIcon, SaveIcon } from 'lucide-react'

import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { CRYPTO_COIN_FLAGS, CRYPTO_MASTER_FLAG, FLAG_GROUPS, FLAGS_ELSEWHERE, flagLabel } from './flagGroups'

type Flags = Record<string, boolean>

/** Only the boolean columns are switches; anything else the backend adds (e.g. an `entitled` map) is not. */
const onlyBooleans = (data: Record<string, unknown>): Flags =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === 'boolean')) as Flags

const FeatureFlags = () => {
  const { can, refreshFlags, flagEntitled: inPlan } = useSession()

  // In the owner's plan: the flag itself, and for a crypto coin the crypto master switch as well.
  const flagEntitled = (key: string) => inPlan(key) && !(CRYPTO_COIN_FLAGS.has(key) && !inPlan(CRYPTO_MASTER_FLAG))
  const flags = useApi<Flags>('admin/site-config/global', undefined, { select: data => onlyBooleans(data) })
  const [draft, setDraft] = useState<Flags>({})
  const [filter, setFilter] = useState('')
  const canWrite = can('config:write')

  // A fresh load replaces the draft (adjusting state during render, not in an effect).
  const [loaded, setLoaded] = useState<Flags | undefined>(undefined)

  if (flags.data && flags.data !== loaded) {
    setLoaded(flags.data)
    setDraft(flags.data)
  }

  const dirty = useMemo(() => Object.keys(draft).filter(k => flags.data && draft[k] !== flags.data[k]), [draft, flags.data])

  const save = useApiMutation({
    fn: () => {
      const patch: Flags = {}

      for (const k of dirty) patch[k] = draft[k]

      return api.put<Flags>('admin/site-config/global', patch)
    },
    invalidate: [['api', 'admin/site-config/global']],
    success: () => `${dirty.length} flag${dirty.length === 1 ? '' : 's'} saved`,
    onSuccess: () => refreshFlags()
  })

  const known = new Set(FLAG_GROUPS.flatMap(g => g.keys))
  const other = Object.keys(draft).filter(k => !known.has(k) && !FLAGS_ELSEWHERE.has(k))
  const groups = other.length ? [...FLAG_GROUPS, { title: 'Other', description: 'Columns the platform returns that this screen does not yet know by name.', keys: other }] : FLAG_GROUPS
  const q = filter.trim().toLowerCase()

  return (
    <div>
      <PageHeader
        title='Feature flags'
        description='Every switch decides whether a section of the site renders. Saved to the platform; the site reads them on the next page load.'
        actions={
          <>
            <Input placeholder='Filter flags…' value={filter} onChange={e => setFilter(e.target.value)} className='w-48' />
            <Button variant='outline' disabled={!dirty.length || save.isPending} onClick={() => flags.data && setDraft(flags.data)}>
              <RotateCcwIcon /> Reset
            </Button>
            <Button disabled={!dirty.length || save.isPending || !canWrite} onClick={() => save.mutate()}>
              {save.isPending ? <Loader2Icon className='animate-spin' /> : <SaveIcon />}
              Save {dirty.length ? `(${dirty.length})` : ''}
            </Button>
          </>
        }
      />

      {flags.error && <ErrorState error={flags.error} />}
      {!canWrite && flags.data && (
        <p className='text-muted-foreground mb-4 text-sm'>Your role can read these flags but not change them (needs <code>config:write</code>).</p>
      )}

      <div className='grid gap-6 lg:grid-cols-2'>
        {groups.map(group => {
          // A flag the owner left out of the plan is not listed at all (it cannot be switched on here).
          const keys = group.keys.filter(k => k in draft && flagEntitled(k) && (!q || k.includes(q) || flagLabel(k).toLowerCase().includes(q)))

          if (flags.data && keys.length === 0) return null

          return (
            <Card key={group.title} className='shadow-none'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  {group.title}
                  {flags.data && (
                    <Badge variant='secondary' className='font-normal'>
                      {keys.filter(k => draft[k]).length}/{keys.length} on
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-1 sm:grid-cols-2'>
                {flags.isLoading
                  ? group.keys.slice(0, 6).map(k => <Skeleton key={k} className='h-9' />)
                  : keys.map(key => {
                      const changed = flags.data && draft[key] !== flags.data[key]

                      // Left out of the plan by the owner: locked and shown off, whatever the site saved.
                      const planned = flagEntitled(key)

                      return (
                        <label
                          key={key}
                          className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${!planned ? 'cursor-not-allowed border-transparent opacity-60' : changed ? 'cursor-pointer border-primary/60 bg-primary/5' : 'cursor-pointer border-transparent hover:bg-muted/50'}`}
                        >
                          <span className='min-w-0'>
                            <span className='block truncate'>{flagLabel(key)}</span>
                            <span className='text-muted-foreground block truncate font-mono text-xs'>{key}</span>
                            {!planned && (
                              <Badge variant='outline' className='mt-1 gap-1 font-normal'>
                                <LockIcon className='size-3' /> Not in your plan
                              </Badge>
                            )}
                          </span>
                          <Switch
                            checked={planned && !!draft[key]}
                            disabled={!canWrite || !planned}
                            onCheckedChange={v => setDraft(d => ({ ...d, [key]: v }))}
                          />
                        </label>
                      )
                    })}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default FeatureFlags
