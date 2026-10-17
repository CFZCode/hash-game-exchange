'use client'

import { useMemo, useState } from 'react'

import { ChevronDownIcon, ChevronUpIcon, KeyRoundIcon, LockIcon, PencilIcon, RefreshCwIcon, SearchIcon, TrendingUpIcon, UnlockIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation, useInvalidate, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'

type Row = {
  id: string
  name: string | null
  email: string | null
  wager: string
  totalDeposit: string
  multiplier: number
  target: string
  targetPercentage: number
  locked: boolean
}

const API = 'admin/turnover-report'
const INVALIDATE = [['paged', API], ['api', `${API}/multiplier`]]
const PAGE_SIZE = 10

const fmtAmt = (v: string | number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(Number(v || 0))
const validX = (v: string) => Number(v) > 0 && Number(v) <= 100

const COLUMNS = [
  { key: 'id', label: 'User ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'wager', label: 'Wager' },
  { key: 'totalDeposit', label: 'Total Deposit' },
  { key: 'target', label: 'Target' },
  { key: 'targetPercentage', label: '% Achieved' }
] as const

type SortKey = (typeof COLUMNS)[number]['key']

/*
 * admin-structure.zip `TurnoverReport` ke exact colours (MUI sx → Tailwind):
 * surfaces and text come from the theme tokens (background, card, border, muted, accent,
 * foreground, muted-foreground) · blue #2B6EF5 / #5581F7 · green #0ECC68 · red #E01B4F
 */
const card = 'rounded-lg border border-border bg-card'
const input = 'h-10 rounded-md border border-border bg-muted px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground hover:border-[#2B6EF5] focus:border-[#2B6EF5]'
const outlineBtn = 'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-sm text-muted-foreground hover:border-[#2B6EF5] hover:text-[#2B6EF5] disabled:opacity-40'
const greenBtn = 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-[#0ECC68] px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-[#0ab85e] disabled:opacity-50'
const th = 'cursor-pointer select-none whitespace-nowrap border-b border-border bg-muted px-4 py-2.5 text-left text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase hover:bg-accent hover:text-foreground'
const td = 'border-b border-border px-4 py-3 text-[0.82rem] text-foreground/80'

/** Zip ka "Edit Target Multiplier" dialog. */
const EditDialog = ({ row, onClose }: { row: Row; onClose: () => void }) => {
  const [value, setValue] = useState(String(row.multiplier))

  const save = useApiMutation({
    fn: () => api.put(`${API}/${row.id}`, { multiplier: Number(value) }),
    invalidate: INVALIDATE,
    success: `TargetX for #${row.id} set to ${value}x`,
    onSuccess: onClose
  })

  const info = (label: string, value: React.ReactNode) => (
    <p className='text-sm text-muted-foreground'>
      {label}: {value}
    </p>
  )

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className='rounded-xl border border-border bg-card p-0 text-foreground sm:max-w-[420px]'>
        <DialogTitle className='flex items-center gap-2 border-b border-border px-6 pt-5 pb-3 text-foreground'>
          <PencilIcon className='size-[18px] text-[#2B6EF5]' /> Edit Target Multiplier
        </DialogTitle>
        <div className='grid gap-1 px-6 pt-2'>
          {info('User ID', <b className='text-foreground'>#{row.id}</b>)}
          {info('Name', <b className='text-foreground'>{row.name ?? '—'}</b>)}
          {info('Email', <span className='text-foreground'>{row.email ?? '—'}</span>)}
          {info('Current Multiplier', <b className='text-[#2B6EF5]'>{row.multiplier}x</b>)}
          {info('Status', <b className={row.locked ? 'text-[#E01B4F]' : 'text-[#0ECC68]'}>{row.locked ? 'Locked' : 'Unlocked'}</b>)}
          <label className='mt-4 grid gap-1 text-xs text-muted-foreground'>
            Target Multiplier
            <input className={input} inputMode='decimal' value={value} onChange={e => setValue(e.target.value.replace(/[^0-9.]/g, ''))} />
          </label>
        </div>
        <div className='flex gap-2 px-6 pt-2 pb-5'>
          <button type='button' className='flex-1 rounded-md border border-border py-1.5 text-sm text-muted-foreground hover:border-muted-foreground' onClick={onClose}>
            Cancel
          </button>
          <button
            type='button'
            className={`${greenBtn} flex-1`}
            disabled={save.isPending}
            onClick={() => (validX(value) ? save.mutate() : toast.error('Between 0.01 and 100'))}
          >
            Update TargetX
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Main → Turnover Report — admin-structure.zip `TurnoverReport` jaisa (UI + colours exact):
 * direct users ka Wager vs Target (total deposit × TargetX), % Achieved, Progress, Lock.
 * "Update All TargetX" sabka badalta hai — locked users ka nahi. API `admin/turnover-report`.
 */
const TurnoverReport = () => {
  const { can } = useSession()
  const canEdit = can('config:write')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('targetPercentage')
  const [desc, setDesc] = useState(true)
  const [globalX, setGlobalX] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const invalidate = useInvalidate()

  const list = usePagedApi<Row>(API, { limit: PAGE_SIZE, page, search: q.trim() || undefined })
  const settings = useApi<{ defaultMultiplier: number }>(`${API}/multiplier`)
  const totalPages = list.data?.pagination.totalPages ?? 1

  const updateAll = useApiMutation({
    fn: () => api.put(`${API}/multiplier`, { multiplier: Number(globalX || settings.data?.defaultMultiplier || 3) }),
    invalidate: INVALIDATE,
    success: 'TargetX updated for every unlocked user',
    onSuccess: () => setGlobalX('')
  })

  const toggleLock = useApiMutation({
    fn: (r: Row) => api.put(`${API}/${r.id}`, { locked: !r.locked }),
    invalidate: INVALIDATE,
    success: (_res, r) => `#${r.id} ${r.locked ? 'unlocked' : 'locked'}`
  })

  // Zip jaisa sort (column header ya select se).
  const rows = useMemo(() => {
    const value = (r: Row) => (sortKey === 'name' || sortKey === 'email' ? String(r[sortKey] ?? '').toLowerCase() : Number(r[sortKey]))

    return [...(list.data?.rows ?? [])].sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      const cmp = va < vb ? -1 : va > vb ? 1 : 0

      return desc ? -cmp : cmp
    })
  }, [list.data?.rows, sortKey, desc])

  const onSort = (key: SortKey) => {
    if (key === sortKey) setDesc(d => !d)
    else {
      setSortKey(key)
      setDesc(true)
    }
  }

  const sortIcon = desc ? <ChevronDownIcon className='size-4' /> : <ChevronUpIcon className='size-4' />

  return (
    <div className='min-h-full rounded-xl bg-background p-4 sm:p-6'>
      <div className='mx-auto max-w-[1400px]'>
        {/* Header */}
        <div className='mb-6 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <span className='flex rounded-lg bg-[rgba(43,110,245,0.15)] p-2'>
              <TrendingUpIcon className='size-[22px] text-[#2B6EF5]' />
            </span>
            <div>
              <h1 className='text-2xl font-bold text-foreground'>Turnover Report</h1>
              <p className='text-xs text-muted-foreground'>User wager progress &amp; target management</p>
            </div>
          </div>
          <button type='button' className={outlineBtn} disabled={list.isFetching} onClick={() => invalidate(...INVALIDATE)}>
            <RefreshCwIcon className='size-4' /> Refresh
          </button>
        </div>

        {/* Toolbar */}
        <div className={`${card} mb-4 flex flex-col gap-4 p-4 sm:flex-row sm:items-center`}>
          <div className='relative flex-1'>
            <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
            <input
              className={`${input} w-full pl-9`}
              placeholder='Search by name, email or ID…'
              value={q}
              onChange={e => {
                setPage(1)
                setQ(e.target.value)
              }}
            />
          </div>

          {canEdit && (
            <div className='flex items-center gap-2'>
              <input
                className={`${input} w-[90px] text-center`}
                inputMode='decimal'
                aria-label='TargetX for everyone'
                placeholder={String(settings.data?.defaultMultiplier ?? 3)}
                value={globalX}
                onChange={e => setGlobalX(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <button
                type='button'
                className={greenBtn}
                disabled={updateAll.isPending}
                onClick={() => (!globalX || validX(globalX) ? updateAll.mutate() : toast.error('TargetX must be between 0.01 and 100'))}
              >
                <KeyRoundIcon className='size-3.5' /> Update All TargetX
              </button>
            </div>
          )}

          <div className='flex items-center gap-2'>
            <select className={`${input} min-w-[150px]`} aria-label='Sort by' value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
              {COLUMNS.map(c => (
                <option key={c.key} value={c.key} className='bg-card'>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type='button'
              title='Toggle sort direction'
              aria-label='Toggle sort direction'
              className='rounded-md border border-border p-2 text-muted-foreground hover:border-[#2B6EF5] hover:text-[#2B6EF5]'
              onClick={() => setDesc(d => !d)}
            >
              {desc ? <ChevronDownIcon className='size-4' /> : <ChevronUpIcon className='size-4' />}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={`${card} overflow-hidden`}>
          {list.isLoading ? (
            <div className='grid gap-2 p-6'>
              {[...Array(6)].map((_, i) => (
                <div key={i} className='h-[52px] animate-pulse rounded bg-accent' />
              ))}
            </div>
          ) : list.error ? (
            <p className='p-8 text-center text-[#E01B4F]'>{list.error.message || 'Failed to load data'}</p>
          ) : rows.length === 0 ? (
            <div className='flex flex-col items-center p-12'>
              <TrendingUpIcon className='size-10 text-border' />
              <p className='mt-2 text-muted-foreground'>No results found.</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse'>
                <thead>
                  <tr>
                    {COLUMNS.map(c => (
                      <th key={c.key} className={th} onClick={() => onSort(c.key)}>
                        <span className='flex items-center gap-1'>
                          {c.label}
                          {sortKey === c.key && sortIcon}
                        </span>
                      </th>
                    ))}
                    <th className={th}>Progress</th>
                    <th className={th}>Lock</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const done = r.targetPercentage >= 100

                    return (
                      <tr key={r.id} className='transition-colors hover:bg-[rgba(43,110,245,0.04)]'>
                        <td className={`${td} font-semibold text-[#5581F7]`}>#{r.id}</td>
                        <td className={td}>
                          <span className='flex items-center gap-2'>
                            <span className='flex size-7 items-center justify-center rounded-full bg-border text-[0.7rem] font-bold text-white'>
                              {r.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                            <span className='font-medium text-foreground'>{r.name ?? '—'}</span>
                          </span>
                        </td>
                        <td className={`${td} text-muted-foreground`}>{r.email ?? '—'}</td>
                        <td className={td}>{fmtAmt(r.wager)}</td>
                        <td className={td}>{fmtAmt(r.totalDeposit)}</td>
                        <td className={td}>
                          <span className='flex items-center gap-2'>
                            <span>{fmtAmt(r.target)}</span>
                            <button
                              type='button'
                              title='Edit target multiplier'
                              disabled={!canEdit}
                              className='inline-flex items-center gap-1 disabled:cursor-default'
                              onClick={() => setEditing(r)}
                            >
                              {canEdit && <PencilIcon className='size-[13px] text-[#2B6EF5]' />}
                              <span className='rounded-full bg-accent px-1.5 text-[0.65rem] leading-[18px] text-muted-foreground'>{r.multiplier}x</span>
                            </button>
                          </span>
                        </td>
                        <td className={`${td} font-semibold ${done ? 'text-[#0ECC68]' : 'text-foreground/80'}`}>
                          {r.targetPercentage.toFixed(2)}%
                          {r.targetPercentage > 100 && <span className='ml-1 text-[0.7rem] text-[#0ECC68]'>+{(r.targetPercentage - 100).toFixed(1)}%</span>}
                        </td>
                        <td className={`${td} min-w-[200px]`}>
                          <div className='flex flex-col gap-1'>
                            <div className='h-2 overflow-hidden rounded bg-accent'>
                              <div className={`h-full rounded ${done ? 'bg-[#0ECC68]' : 'bg-[#2B6EF5]'}`} style={{ width: `${Math.max(0, Math.min(100, r.targetPercentage))}%` }} />
                            </div>
                            <div className='flex justify-between text-xs text-muted-foreground'>
                              <span>{fmtAmt(r.wager)}</span>
                              <span className={`font-semibold ${done ? 'text-[#0ECC68]' : ''}`}>{r.targetPercentage.toFixed(1)}%</span>
                              <span>{fmtAmt(r.target)}</span>
                            </div>
                          </div>
                        </td>
                        <td className={td}>
                          <button
                            type='button'
                            title={r.locked ? 'Locked — click to unlock' : 'Unlocked — click to lock'}
                            aria-label={r.locked ? 'Unlock' : 'Lock'}
                            disabled={!canEdit || toggleLock.isPending}
                            onClick={() => toggleLock.mutate(r)}
                            className={`rounded-full p-1.5 disabled:opacity-60 ${
                              r.locked ? 'bg-[rgba(224,27,79,0.12)] text-[#E01B4F] hover:bg-[rgba(224,27,79,0.22)]' : 'bg-[rgba(14,204,104,0.12)] text-[#0ECC68] hover:bg-[rgba(14,204,104,0.22)]'
                            }`}
                          >
                            {r.locked ? <LockIcon className='size-[15px]' /> : <UnlockIcon className='size-[15px]' />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!list.isLoading && rows.length > 0 && (
            <div className='flex items-center justify-between border-t border-border px-4 py-3'>
              <span className='text-xs text-muted-foreground'>
                Showing {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + rows.length} of {list.data?.pagination.total ?? rows.length}
              </span>
              <div className='flex items-center gap-2'>
                <button type='button' className={`${outlineBtn} text-xs`} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  Previous
                </button>
                <span className='px-1 text-xs text-muted-foreground'>
                  {page} / {totalPages}
                </span>
                <button type='button' className={`${outlineBtn} text-xs`} disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editing && <EditDialog row={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

export default TurnoverReport
