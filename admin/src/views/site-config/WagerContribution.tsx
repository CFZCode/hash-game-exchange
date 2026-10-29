'use client'

import { useMemo, useState } from 'react'

import { ChevronDownIcon, Loader2Icon, SearchIcon, Trash2Icon } from 'lucide-react'

import ErrorState from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import type { GisGame, GisVendor } from '@/views/casino/types'

/**
 * "Wager Contribution for Bonus Balance Details" (migration 135): how much of a bet counts toward
 * unlocking a locked bonus. One rule names a game, a provider OR a game type; the most specific
 * wins, and sports also need odds of 1.5 or more. Laid out as simply as it goes (user,
 * 2026-10-29): one % for every bet, a % per game type, and exceptions — a provider or a single
 * game — found from one search box and kept folded away.
 */
type Rule = { category: string | null; provider: string | null; gameRef: string | null; percent: string; gameName?: string | null; gameProvider?: string | null }
type Exception = { kind: 'provider' | 'game'; key: string; percent: string; label: string }
type Original = { code: string; name: string }

const PATH = 'admin/site-config/wager-contribution'

const TYPES = [
  { key: 'slots', label: 'Slots' },
  { key: 'originals', label: 'Originals' },
  { key: 'live', label: 'Live casino' },
  { key: 'sports', label: 'Sports' }
] as const

const valid = (p: string) => /^\d+(\.\d+)?$/.test(p.trim()) && Number(p) <= 100
const same = (a: Exception, b: Exception) => a.kind === b.kind && a.key.toLowerCase() === b.key.toLowerCase()

const Pct = ({ value, onChange, disabled, label, placeholder }: { value: string; onChange: (v: string) => void; disabled?: boolean; label: string; placeholder?: string }) => (
  <div className='flex items-center gap-1'>
    <Input
      aria-label={label}
      aria-invalid={value !== '' && !valid(value)}
      className='w-20'
      inputMode='decimal'
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    />
    <span className='text-muted-foreground text-sm'>%</span>
  </div>
)

/** One search for providers and games; each result is added as an exception at `percent`. */
const AddException = ({ percent, disabled, onAdd }: { percent: string; disabled: boolean; onAdd: (rows: Exception[]) => void }) => {
  const vendors = useApi<GisVendor[]>('admin/casino/games/vendors')
  const originals = useApi<{ games: Original[] }>('admin/original-games/games')
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Exception[] | null>(null)
  const [busy, setBusy] = useState(false)

  const search = async () => {
    const term = q.trim().toLowerCase()

    if (!term) return
    setBusy(true)

    try {
      const providers = (vendors.data ?? []).filter(v => v.vendor.toLowerCase().includes(term)).map<Exception>(v => ({ kind: 'provider', key: v.vendor, percent, label: `${v.vendor} — all games` }))
      const own = (originals.data?.games ?? []).filter(g => g.name.toLowerCase().includes(term) || g.code.includes(term)).map<Exception>(g => ({ kind: 'game', key: g.code, percent, label: `${g.name} · Originals` }))
      const lobby = await api.get<GisGame[]>('admin/casino/games/catalogue/search', { q: term, limit: 100 })

      setFound([...providers, ...own, ...lobby.map<Exception>(g => ({ kind: 'game', key: g.uuid, percent, label: `${g.name}${g.provider ? ` · ${g.provider}` : ''}` }))])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='grid gap-2'>
      <form
        className='flex flex-wrap items-center gap-2'
        onSubmit={e => {
          e.preventDefault()
          void search()
        }}
      >
        <Input className='w-72' placeholder='Search a provider or a game' value={q} onChange={e => setQ(e.target.value)} />
        <Button type='submit' variant='outline' disabled={busy || !q.trim()}>
          {busy ? <Loader2Icon className='animate-spin' /> : <SearchIcon />}
          Search
        </Button>
      </form>
      {found && (
        <div className='grid gap-2'>
          <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
            <span className='text-muted-foreground'>{found.length ? `${found.length} found` : 'Nothing found.'}</span>
            {found.length > 1 && (
              <Button type='button' size='sm' variant='outline' disabled={disabled} onClick={() => onAdd(found.map(r => ({ ...r, percent })))}>
                Add all at {percent}%
              </Button>
            )}
          </div>
          <div className='max-h-64 divide-y overflow-y-auto rounded-md border'>
            {found.map(r => (
              <div key={`${r.kind}:${r.key}`} className='flex items-center gap-3 px-3 py-2 text-sm'>
                <span className='flex-1 truncate'>{r.label}</span>
                <Button type='button' size='sm' variant='ghost' disabled={disabled} onClick={() => onAdd([{ ...r, percent }])}>
                  Add at {percent}%
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const Editor = ({ initial }: { initial: Rule[] }) => {
  const { can } = useSession()
  const writable = can('config:write')

  const start = useMemo(
    () => ({
      types: Object.fromEntries(TYPES.map(t => [t.key, initial.find(r => r.category === t.key)?.percent ?? '100'])) as Record<string, string>,
      exceptions: initial
        .filter(r => r.provider || r.gameRef)
        .map<Exception>(r =>
          r.provider
            ? { kind: 'provider', key: r.provider, percent: r.percent, label: `${r.provider} — all games` }
            : { kind: 'game', key: r.gameRef as string, percent: r.percent, label: r.gameName ? `${r.gameName}${r.gameProvider ? ` · ${r.gameProvider}` : ''}` : (r.gameRef as string) }
        )
    }),
    [initial]
  )

  const [types, setTypes] = useState(start.types)
  const [exceptions, setExceptions] = useState<Exception[]>(start.exceptions)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [newPct, setNewPct] = useState('100')
  const dirty = JSON.stringify({ types, exceptions }) !== JSON.stringify(start)

  const values = Object.values(types)
  const everyBet = values.every(v => v === values[0]) ? values[0] : ''
  const allValid = values.every(valid) && exceptions.every(r => valid(r.percent))
  const shown = exceptions.filter(r => !filter || r.label.toLowerCase().includes(filter.toLowerCase()))

  const save = useApiMutation({
    fn: () =>
      api.put(PATH, {
        rules: [
          ...TYPES.map(t => ({ category: t.key, provider: null, gameRef: null, percent: types[t.key].trim() })),
          ...exceptions.map(r => ({ category: null, provider: r.kind === 'provider' ? r.key : null, gameRef: r.kind === 'game' ? r.key : null, percent: r.percent.trim() }))
        ]
      }),
    invalidate: [['api', PATH]],
    success: 'Game ratio saved'
  })

  return (
    <div className='grid gap-5'>
      <section className='grid gap-2 rounded-lg border p-4'>
        <div className='flex flex-wrap items-center gap-3 text-base'>
          <span>Every bet counts</span>
          <Pct label='Every bet counts' placeholder='mixed' value={everyBet} disabled={!writable} onChange={v => setTypes(Object.fromEntries(TYPES.map(t => [t.key, v])))} />
          <span>toward unlocking a bonus.</span>
        </div>
        <p className='text-muted-foreground text-sm'>
          {valid(everyBet) ? `A ₹100 bet counts ₹${Number(everyBet)}. Lower = the bonus takes longer to become cash.` : 'Game types differ — set them below.'}
        </p>
        <div className='mt-1 flex flex-wrap gap-x-5 gap-y-2'>
          {TYPES.map(t => (
            <label key={t.key} className='flex items-center gap-2 text-sm'>
              <span className='text-muted-foreground'>{t.label}</span>
              <Pct label={`${t.label} %`} value={types[t.key]} disabled={!writable} onChange={v => setTypes(s => ({ ...s, [t.key]: v }))} />
            </label>
          ))}
        </div>
      </section>

      <section className='rounded-lg border'>
        <button type='button' className='flex w-full items-center justify-between px-4 py-3 text-left' onClick={() => setOpen(o => !o)} aria-expanded={open}>
          <span>
            <span className='font-medium'>Exceptions</span>
            <span className='text-muted-foreground ml-2 text-sm'>
              {exceptions.length ? `${exceptions.length} provider / game with its own %` : 'none — a provider or game with its own %'}
            </span>
          </span>
          <ChevronDownIcon className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className='grid gap-4 border-t p-4'>
            <div className='grid gap-2'>
              <div className='flex flex-wrap items-center gap-2 text-sm'>
                <span>Add an exception at</span>
                <Pct label='Exception %' value={newPct} onChange={setNewPct} disabled={!writable} />
              </div>
              <AddException percent={newPct} disabled={!writable || !valid(newPct)} onAdd={rows => setExceptions(rs => [...rows, ...rs.filter(r => !rows.some(a => same(a, r)))])} />
            </div>
            {exceptions.length > 0 && (
              <div className='grid gap-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  {exceptions.length > 8 && <Input className='w-60' placeholder='Filter' value={filter} onChange={e => setFilter(e.target.value)} />}
                  {valid(everyBet) && (
                    <Button type='button' size='sm' variant='outline' disabled={!writable} onClick={() => setExceptions(rs => rs.map(r => ({ ...r, percent: everyBet })))}>
                      Set all exceptions to {everyBet}%
                    </Button>
                  )}
                </div>
                <div className='max-h-80 divide-y overflow-y-auto rounded-md border'>
                  {shown.map(r => (
                    <div key={`${r.kind}:${r.key}`} className='flex items-center gap-3 px-3 py-2'>
                      <span className='flex-1 truncate text-sm'>{r.label}</span>
                      <Pct label={`${r.label} %`} value={r.percent} disabled={!writable} onChange={v => setExceptions(rs => rs.map(x => (same(x, r) ? { ...x, percent: v } : x)))} />
                      <Button type='button' variant='ghost' size='icon' aria-label={`Remove ${r.label}`} disabled={!writable} onClick={() => setExceptions(rs => rs.filter(x => !same(x, r)))}>
                        <Trash2Icon />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className='text-muted-foreground text-xs'>A game&apos;s own % beats its provider&apos;s, which beats its game type. A sports bet under odds 1.5 never counts.</p>
          </div>
        )}
      </section>

      <div className='bg-background sticky bottom-0 flex items-center gap-3 border-t py-3'>
        <Button type='button' disabled={!writable || !dirty || !allValid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Loader2Icon className='animate-spin' />}
          Save
        </Button>
        <span className='text-muted-foreground text-sm'>
          {!allValid ? 'Every % must be a number from 0 to 100.' : dirty ? 'Unsaved changes.' : 'Saved. Bets use it within a minute.'}
        </span>
      </div>
    </div>
  )
}

const WagerContribution = () => {
  const q = useApi<{ rules: Rule[]; stored: boolean }>(PATH)

  return (
    <Card className='max-w-3xl shadow-none'>
      <CardHeader>
        <CardTitle className='text-base'>Game ratio</CardTitle>
        <CardDescription>How much of a bet counts toward unlocking a player&apos;s locked bonus. VIP, rakeback and commission always count the full bet.</CardDescription>
      </CardHeader>
      <CardContent>
        {q.error && <ErrorState error={q.error} />}
        {q.data && <Editor key={JSON.stringify(q.data.rules)} initial={q.data.rules} />}
      </CardContent>
    </Card>
  )
}

export default WagerContribution
