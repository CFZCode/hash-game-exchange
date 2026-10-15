'use client'

import { useState, type FormEvent } from 'react'

import { toast } from 'sonner'

import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CONFIG_API, Note, errorText, useZip, zipApi } from './shared'

/**
 * Virtual Bet Limits — zip `pages/settings/VirtualBetLimits.jsx` (sirf owner).
 *
 * Har VIRTUAL league (cricket ka Dim "(e)", T5 XI, T10 XI, Virtual Cricket League,
 * wrestling ka WWE Virtual) ka min / max stake. Inke round har kuch minute badalte hain,
 * isliye per-event Bet Limits wahan tak nahi pahunchta — yahan poori league ki ek limit.
 * 0 = set nahi, feed ki apni limit chalegi.
 */

type LimitRow = {
  sport_id: number
  sport_name: string
  league_key: string
  label: string
  min_stake: number | string
  max_stake: number | string
}

type Field = 'min_stake' | 'max_stake'

const LIMITS_URL = `${CONFIG_API}/betting-config/virtual-limits`

const rowKey = (r: LimitRow) => `${r.sport_id}:${r.league_key}`

const VirtualBetLimits = () => {
  const limits = useZip<{ data?: LimitRow[] }>(LIMITS_URL)
  const [saving, setSaving] = useState(false)

  // Type kiye hue values "<sport>:<league>" → { min_stake, max_stake }. Save pe hi jaate hain.
  const [edits, setEdits] = useState<Record<string, Partial<Record<Field, string>>>>({})

  // Server ki row + jo type kiya — input me hamesha string.
  const rows = (limits.data?.data || []).map(r => ({
    ...r,
    min_stake: edits[rowKey(r)]?.min_stake ?? String(Number(r.min_stake) || 0),
    max_stake: edits[rowKey(r)]?.max_stake ?? String(Number(r.max_stake) || 0)
  }))

  const setField = (r: LimitRow, field: Field, value: string) => {
    setEdits(prev => ({ ...prev, [rowKey(r)]: { ...prev[rowKey(r)], [field]: value } }))
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()

    for (const r of rows) {
      const min = Number(r.min_stake)
      const max = Number(r.max_stake)

      if (!Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < 0) {
        toast.error(`${r.label}: Min and Max must be 0 or more`)

        return
      }

      if (min > 0 && max > 0 && min > max) {
        toast.error(`${r.label}: Min cannot be more than Max`)

        return
      }
    }

    setSaving(true)

    try {
      const response = await zipApi<{ message?: string }>('PUT', LIMITS_URL, {
        rows: rows.map(r => ({
          sport_id: r.sport_id,
          league_key: r.league_key,
          min_stake: Number(r.min_stake) || 0,
          max_stake: Number(r.max_stake) || 0
        }))
      })

      await limits.refetch()
      setEdits({})
      toast.success(response.message || 'Saved')
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title='Virtual Bet Limits' />

      <Card className='lg:max-w-[66%]'>
        <CardHeader>
          <CardTitle>Min / Max stake per virtual league</CardTitle>
        </CardHeader>
        <CardContent>
          {limits.isLoading ? (
            <Note className='p-0 text-left'>Loading…</Note>
          ) : limits.error ? (
            <Note className='text-danger p-0 text-left'>{errorText(limits.error)}</Note>
          ) : (
            <form onSubmit={handleSave} className='space-y-3'>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sport</TableHead>
                      <TableHead>League</TableHead>
                      <TableHead className='w-[180px]'>Min Stake</TableHead>
                      <TableHead className='w-[180px]'>Max Stake</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(r => (
                      <TableRow key={rowKey(r)}>
                        <TableCell>{r.sport_name}</TableCell>
                        <TableCell>{r.label}</TableCell>
                        <TableCell>
                          <Input type='number' min={0} step={1} value={r.min_stake} onChange={e => setField(r, 'min_stake', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input type='number' min={0} step={1} value={r.max_stake} onChange={e => setField(r, 'max_stake', e.target.value)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className='text-muted-foreground text-xs'>
                0 = not set: the feed&apos;s own limit applies. A value here replaces the feed&apos;s limit for every market of that league
                (bet slip, the Min / Max shown on the rows, and the server check). Players see the change within a minute.
              </p>

              <Button type='submit' disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default VirtualBetLimits
