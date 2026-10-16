'use client'

import { useState, type FormEvent } from 'react'

import { toast } from 'sonner'

import { Loader2Icon } from 'lucide-react'

import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, errorMessage } from '@/lib/api/client'
import { ACCOUNTS_API } from './api'

/**
 * Assign Agent — zip `pages/AssignAgent.jsx`.
 *
 * "Assign Agent List" — zip me iska koi API nahi tha (list hamesha khali), yahan bhi wahi.
 * "User Creation" — From Date chuno (ek mahine peeche tak, aage nahi), To = From + 7 din
 * (aaj se aage nahi), Download CSV = us window me bane players.
 */

const CSV_RANGE_DAYS = 7
const ENTRIES = ['25', '50', '75', '100', '125', '150']

type AgentRow = { id?: number; userName?: string; assignAgentSettings?: string; mobileNumber?: string; depoMobileNumber?: string; firstBonusStatus?: string }

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const startOfToday = () => {
  const d = new Date()

  d.setHours(0, 0, 0, 0)

  return d
}

/** Same din n mahine pehle, us mahine ke aakhri din tak (31 Mar − 1 = 28/29 Feb). */
const monthsBack = (date: Date, n: number) => {
  const first = new Date(date.getFullYear(), date.getMonth() - n, 1)
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()

  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay))
}

/** To = From + 7 din, aaj se aage nahi. */
const csvToDate = (from: string) => {
  if (!from) return ''
  const d = new Date(`${from}T00:00:00`)

  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + CSV_RANGE_DAYS)
  const today = startOfToday()

  return formatDate(d > today ? today : d)
}

const COLUMNS = ['S.No.', 'User Name', 'Assign Agent Settings', 'Mobile Number', 'Depo Mobile Number', 'First Bonus Status']

const AssignAgent = () => {
  const [entriesPerPage, setEntriesPerPage] = useState('25')
  const [searchValue, setSearchValue] = useState('')
  const [fromDate, setFromDate] = useState(() => formatDate(startOfToday()))
  const [downloading, setDownloading] = useState(false)
  const toDate = csvToDate(fromDate)
  const minFromDate = formatDate(monthsBack(startOfToday(), 1))
  const today = formatDate(startOfToday())

  // Zip jaisa — is list ka backend nahi hai.
  const agents: AgentRow[] = []
  const q = searchValue.toLowerCase()

  const filtered = agents.filter(
    a => !q || [a.userName, a.mobileNumber, a.depoMobileNumber].some(v => (v || '').toLowerCase().includes(q))
  )

  const paged = filtered.slice(0, Number(entriesPerPage))

  const handleDownloadCSV = async (e: FormEvent) => {
    e.preventDefault()

    if (!fromDate || !toDate) {
      toast.error('Choose a From date')

      return
    }

    setDownloading(true)

    try {
      const blob = await api.blob(`${ACCOUNTS_API}/user-creation.csv`, { from: fromDate, to: toDate })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      a.download = `user-creation-${fromDate}-to-${toDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('User creation CSV downloaded')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <PageHeader title='Assign Agent List' />

      <Card>
        <CardContent className='space-y-4 pt-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <label className='flex items-center gap-2 text-sm'>
              Show
              <Select value={entriesPerPage} onValueChange={v => setEntriesPerPage(String(v))}>
                <SelectTrigger size='sm' className='w-20'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRIES.map(n => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              entries
            </label>
            <label className='flex items-center gap-2 text-sm'>
              Search:
              <Input type='search' placeholder='Search...' className='h-8 w-56' value={searchValue} onChange={e => setSearchValue(e.target.value)} />
            </label>
          </div>

          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map(c => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className='text-muted-foreground py-6 text-center'>
                      There are no records to show
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((agent, index) => (
                    <TableRow key={agent.id ?? index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{agent.userName || '-'}</TableCell>
                      <TableCell>{agent.assignAgentSettings || '-'}</TableCell>
                      <TableCell>{agent.mobileNumber || '-'}</TableCell>
                      <TableCell>{agent.depoMobileNumber || '-'}</TableCell>
                      <TableCell>{agent.firstBonusStatus || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <h2 className='text-foreground text-xl font-semibold tracking-tight'>User Creation</h2>

      <Card>
        <CardContent className='pt-6'>
          <form onSubmit={handleDownloadCSV} className='flex flex-wrap items-end gap-4'>
            <div className='space-y-1.5'>
              <Label>From Date:</Label>
              <DatePicker value={fromDate} onChange={setFromDate} min={minFromDate} max={today} clearable={false} />
            </div>
            <div className='space-y-1.5'>
              <Label>To Date:</Label>
              <DatePicker value={toDate} onChange={() => undefined} disabled clearable={false} />
            </div>
            <Button type='submit' disabled={downloading || !toDate}>
              {downloading && <Loader2Icon className='animate-spin' />}
              Download CSV
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AssignAgent
