'use client'

import { useMemo, useState } from 'react'

import { Loader2Icon, SearchIcon } from 'lucide-react'

import ErrorState from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import type { GisGame, GisVendor } from '@/views/casino/types'

/**
 * "Wager Contribution for Bonus Balance Details" (migration 135): how much of a bet unlocks a
 * locked bonus. One rule names a game, a provider OR a category; the most specific wins. Sports
 * also need odds of 1.5 or more. Games are picked from the catalogue — searched across every
 * provider or within one, Originals from their own list — and a provider or category rule applies
 * the ratio to all of its games (user, 2026-10-29).
 */
type Rule = { category: string | null; provider: string | null; gameRef: string | null; percent: string; gameName?: string | null; gameProvider?: string | null }
type Row = { kind: 'category' | 'provider' | 'game'; name: string; percent: string; label?: string }
type Original = { code: string; name: string }
type Found = { ref: string; name: string; provider: string }

const PATH = 'admin/site-config/wager-contribution'
const CATEGORIES = ['originals', 'slots', 'live', 'sports'] as const
const ALL = '__all__'
const ORIGINALS = '__originals__'

const toRow = (r: Rule): Row =>
  r.gameRef
    ? { kind: 'game', name: r.gameRef, percent: r.percent, label: r.gameName ? `${r.gameName}${r.gameProvider ? ` · ${r.gameProvider}` : ''}` : undefined }
    : r.provider
      ? { kind: 'provider', name: r.provider, percent: r.percent }
      : { kind: 'category', name: r.category ?? '', percent: r.percent }

const toRule = (r: Row): Rule => ({
  category: r.kind === 'category' ? r.name.trim() : null,
  provider: r.kind === 'provider' ? r.name.trim() : null,
  gameRef: r.kind === 'game' ? r.name.trim() : null,
  percent: r.percent.trim()
})

const sameRule = (a: Row, b: Row) => a.kind === b.kind && a.name.trim().toLowerCase() === b.name.trim().toLowerCase()

const SELECT = 'bg-background h-9 rounded-md border px-2 text-sm'

/** Find games and add them (one, or every result) at a chosen ratio. */
const GamePicker = ({ disabled, onAdd }: { disabled: boolean; onAdd: (rows: Row[]) => void }) => {
  const vendors = useApi<GisVendor[]>('admin/casino/games/vendors')
  const originals = useApi<{ games: Original[] }>('admin/original-games/games')
  const [source, setSource] = useState(ALL)
  const [q, setQ] = useState('')
  const [percent, setPercent] = useState('100')
  const [found, setFound] = useState<Found[] | null>(null)
  const [busy, setBusy] = useState(false)

  const search = async () => {
    if (source === ORIGINALS) {
      const term = q.trim().toLowerCase()

      setFound((originals.data?.games ?? []).filter(g => !term || g.name.toLowerCase().includes(term) || g.code.includes(term)).map(g => ({ ref: g.code, name: g.name, provider: 'Originals' })))

      return
    }

    if (!q.trim()) return
    setBusy(true)

    try {
      const games =
        source === ALL
          ? await api.get<GisGame[]>('admin/casino/games/catalogue/search', { q: q.trim(), limit: 100 })
          : await api.get<GisGame[]>('admin/casino/games/vendor-search', { q: q.trim(), limit: 100, vendor: source })

      setFound(games.map(g => ({ ref: g.uuid, name: g.name, provider: g.provider ?? '' })))
    } finally {
      setBusy(false)
    }
  }

  const row = (g: Found): Row => ({ kind: 'game', name: g.ref, percent, label: `${g.name}${g.provider ? ` · ${g.provider}` : ''}` })

  return (
    <div className='grid gap-3 rounded-lg border p-3'>
      <div className='text-sm font-medium'>Set a ratio for individual games</div>
      <form
        className='flex flex-wrap items-center gap-2'
        onSubmit={e => {
          e.preventDefault()
          void search()
        }}
      >
        <select aria-label='Search in' className={SELECT} value={source} onChange={e => setSource(e.target.value)}>
          <option value={ALL}>All providers</option>
          <option value={ORIGINALS}>Originals</option>
          {(vendors.data ?? []).map(v => (
            <option key={v.vendor} value={v.vendor}>
              {v.vendor}
            </option>
          ))}
        </select>
        <Input className='w-56' placeholder={source === ORIGINALS ? 'Filter Originals' : 'Search game name'} value={q} onChange={e => setQ(e.target.value)} />
        <Button type='submit' variant='outline' disabled={busy}>
          {busy ? <Loader2Icon className='animate-spin' /> : <SearchIcon />}
          Search
        </Button>
        <span className='text-muted-foreground ml-2 text-sm'>Ratio</span>
        <Input aria-label='Ratio for added games' className='w-20' inputMode='decimal' value={percent} onChange={e => setPercent(e.target.value)} />
        <span className='text-muted-foreground text-sm'>%</span>
      </form>
      {found && (
        <div className='grid gap-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>{found.length ? `${found.length} game(s)${found.length === 100 ? ' — the first 100; narrow the search for more' : ''}` : 'No game found.'}</span>
            {found.length > 1 && (
              <Button type='button' size='sm' variant='outline' disabled={disabled} onClick={() => onAdd(found.map(row))}>
                Add all {found.length} at {percent}%
              </Button>
            )}
          </div>
          <div className='max-h-64 overflow-y-auto'>
            <Table>
              <TableBody>
                {found.map(g => (
                  <TableRow key={g.ref}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell className='text-muted-foreground'>{g.provider}</TableCell>
                    <TableCell className='w-0'>
                      <Button type='button' size='sm' variant='ghost' disabled={disabled} onClick={() => onAdd([row(g)])}>
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

/** A ratio for every game of a provider or a category. */
const AllOfPicker = ({ disabled, onAdd }: { disabled: boolean; onAdd: (rows: Row[]) => void }) => {
  const vendors = useApi<GisVendor[]>('admin/casino/games/vendors')
  const [target, setTarget] = useState('category:slots')
  const [percent, setPercent] = useState('100')
  const [kind, name] = target.split(/:(.*)/) as [Row['kind'], string]

  return (
    <div className='flex flex-wrap items-center gap-2 rounded-lg border p-3'>
      <span className='text-sm font-medium'>Apply to all games of</span>
      <select aria-label='Apply to all games of' className={SELECT} value={target} onChange={e => setTarget(e.target.value)}>
        <optgroup label='Category'>
          {CATEGORIES.map(c => (
            <option key={c} value={`category:${c}`}>
              {c}
            </option>
          ))}
        </optgroup>
        <optgroup label='Provider'>
          {(vendors.data ?? []).map(v => (
            <option key={v.vendor} value={`provider:${v.vendor}`}>
              {v.vendor}
            </option>
          ))}
        </optgroup>
      </select>
      <Input aria-label='Ratio for all games' className='w-20' inputMode='decimal' value={percent} onChange={e => setPercent(e.target.value)} />
      <span className='text-muted-foreground text-sm'>%</span>
      <Button type='button' variant='outline' disabled={disabled} onClick={() => onAdd([{ kind, name, percent }])}>
        Apply
      </Button>
    </div>
  )
}

const Editor = ({ initial }: { initial: Rule[] }) => {
  const { can } = useSession()
  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow))
  const [filter, setFilter] = useState('')
  const writable = can('config:write')

  const save = useApiMutation({
    fn: () => api.put(PATH, { rules: rows.filter(r => r.name.trim() && r.percent.trim()).map(toRule) }),
    invalidate: [['api', PATH]],
    success: 'Wager contribution saved'
  })

  // An added rule replaces the same game / provider / category instead of duplicating it.
  const add = (added: Row[]) => setRows(rs => [...added, ...rs.filter(r => !added.some(a => sameRule(a, r)))])
  const set = (i: number, patch: Partial<Row>) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const shown = useMemo(() => {
    const f = filter.toLowerCase()

    return rows.map((r, i) => ({ r, i })).filter(({ r }) => !f || r.name.toLowerCase().includes(f) || r.label?.toLowerCase().includes(f))
  }, [rows, filter])

  return (
    <div className='grid gap-4'>
      <GamePicker disabled={!writable} onAdd={add} />
      <AllOfPicker disabled={!writable} onAdd={add} />
      <Input className='max-w-xs' placeholder='Filter rules' value={filter} onChange={e => setFilter(e.target.value)} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applies to</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Contribution %</TableHead>
            <TableHead className='w-0' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map(({ r, i }) => (
            <TableRow key={`${r.kind}:${r.name}:${i}`}>
              <TableCell className='capitalize'>{r.kind}</TableCell>
              <TableCell>
                {r.kind === 'game' ? (
                  <div className='grid'>
                    <span>{r.label ?? r.name}</span>
                    {r.label && <span className='text-muted-foreground text-xs'>{r.name}</span>}
                  </div>
                ) : r.kind === 'category' ? (
                  <select aria-label='Category' className={SELECT} value={r.name} onChange={e => set(i, { name: e.target.value })} disabled={!writable}>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input aria-label='Provider' value={r.name} onChange={e => set(i, { name: e.target.value })} disabled={!writable} />
                )}
              </TableCell>
              <TableCell>
                <Input aria-label='Contribution %' inputMode='decimal' value={r.percent} onChange={e => set(i, { percent: e.target.value })} disabled={!writable} />
              </TableCell>
              <TableCell>
                <Button type='button' variant='ghost' size='sm' disabled={!writable} onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className='text-muted-foreground text-xs'>
        A game rule beats its provider&apos;s, which beats its category&apos;s; a game with no rule counts 100%. A sports bet under odds 1.5 never counts.
        Changes reach bets within a minute of saving.
      </p>
      <div>
        <Button type='button' disabled={!writable || save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Loader2Icon className='animate-spin' />}
          Save
        </Button>
      </div>
    </div>
  )
}

const WagerContribution = () => {
  const q = useApi<{ rules: Rule[]; stored: boolean }>(PATH)

  return (
    <Card className='max-w-4xl shadow-none'>
      <CardHeader>
        <CardTitle className='text-base'>Wager contribution (game ratio)</CardTitle>
        <CardDescription>
          Players see: “Wager amount = Bet Amount × Contribution Rate”. How much of a bet counts toward unlocking a locked bonus — on every bonus
          while “Game ratio applies to every bonus” is on (Limits and policy → Bonus). VIP, commission and rakeback always count the full bet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.error && <ErrorState error={q.error} />}
        {q.data && <Editor key={JSON.stringify(q.data.rules)} initial={q.data.rules} />}
      </CardContent>
    </Card>
  )
}

export default WagerContribution
