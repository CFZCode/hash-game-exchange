'use client'

import { useState } from 'react'

import { FileSpreadsheetIcon, FileTextIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApi } from '@/hooks/use-api'
import { errorMessage } from '@/lib/api/client'
import { exportExcel, exportPdf } from '../exportList'

/**
 * User reports (zip `pages/reports/*` — User History, User Authentication, Fraud Report,
 * User Register Detail) ki common cheezein. Backend: admin-service `exchange-user-reports`.
 */

export const REPORTS_API = 'admin/exchange/user-reports'

/** Zip jaisa table search — sirf is page ki rows me, har value me dhoondo. */
export function filterRows<T extends object>(rows: T[], search: string): T[] {
  const q = search.trim().toLowerCase()

  if (!q) return rows

  return rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)))
}

/** Zip ka empty text — search ho to "matching", warna "to show". */
export const emptyText = (search: string) => (search ? 'There are no records matching your request' : 'There are no records to show')

/** Excel + PDF buttons — zip jaisa, rows na hon to disabled. */
export function ExportButtons({ fileName, title, head, rows }: { fileName: string; title: string; head: string[]; rows: (string | number)[][] }) {
  const empty = rows.length === 0

  return (
    <>
      <Button
        type='button'
        size='icon'
        className='bg-success hover:bg-success/90 text-white'
        disabled={empty}
        onClick={() => exportExcel(fileName, head, rows)}
        aria-label='Excel'
      >
        <FileSpreadsheetIcon />
      </Button>
      <Button type='button' size='icon' variant='destructive' disabled={empty} onClick={() => exportPdf(fileName, title, head, rows)} aria-label='PDF'>
        <FileTextIcon />
      </Button>
    </>
  )
}

type SearchResult = { username: string; user_type: 'STAFF' | 'USER' }

/**
 * Zip ka `ClientMultiselect` — downline me naam dhoondo.
 * 3 letter se kam pe "No elements found…", 3+ pe search; click se naam chun lo.
 */
export function ClientSearch({ value, onChange, placeholder = 'Select option' }: { value: string; onChange: (username: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const typed = value.trim()

  const { data, error } = useApi<{ results: SearchResult[] }>(
    open && typed.length >= 3 ? 'admin/exchange-lookup/search-by-username' : null,
    { username: typed, limit: 25 }
  )

  const results = data?.results ?? []

  return (
    <div className='relative w-full'>
      <Input
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
        }}
      />
      {open && typed.length > 0 && (
        <ul className='bg-popover text-popover-foreground absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border text-sm shadow-md'>
          {typed.length >= 3 && error ? (
            <li className='text-destructive px-3 py-2'>Search failed: {errorMessage(error)}</li>
          ) : typed.length < 3 || results.length === 0 ? (
            <li className='text-muted-foreground px-3 py-2'>No elements found. Consider changing the search query.</li>
          ) : (
            results.map(r => (
              <li key={`${r.user_type}-${r.username}`}>
                <button
                  type='button'
                  className='hover:bg-accent w-full px-3 py-2 text-left'
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    onChange(r.username)
                    setOpen(false)
                  }}
                >
                  {r.username}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
