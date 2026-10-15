'use client'

import { useState } from 'react'

import { format, subDays } from 'date-fns'
import { EyeIcon } from 'lucide-react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi, usePagedApi } from '@/hooks/use-api'
import { ClientSearch, ExportButtons, REPORTS_API, emptyText, filterRows } from './shared'

type HistoryRow = { id: string; username: string; loginAt?: string; changedAt?: string; ip: string }
type Row = { id: string; username: string; date: string; ip: string }
type IpDetail = { ip: string; city: string; country: string; mobile: boolean }

/** Zip ka formatDateTime — "dd/mm/yyyy hh:mm:ss" (browser ka local time). */
const fmtDateTime = (value?: string) => (value ? format(new Date(value), 'dd/MM/yyyy HH:mm:ss') : '')

/** Default range zip jaisa: ek hafta pehle → aaj. */
const defaultRange = () => ({ from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })

const EXPORT_COLS = ['Username', 'Date', 'IP']

/** "Ip Detail" modal — Key / Value table (IP, City, Country, Mobile). */
function IpDetailDialog({ ip, onClose }: { ip: string | null; onClose: () => void }) {
  const { data } = useApi<IpDetail>(ip ? `${REPORTS_API}/ip-detail` : null, { ip: ip ?? '' })

  const rows: [string, string][] = [
    ['IP:', data?.ip ?? ip ?? '-'],
    ['City:', data?.city ?? '-'],
    ['Country:', data?.country ?? '-'],
    ['Mobile:', data?.mobile ? 'True' : 'False']
  ]

  return (
    <Dialog open={ip !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle className='uppercase'>Ip Detail</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([k, v]) => (
              <TableRow key={k}>
                <TableCell className='font-semibold'>{k}</TableCell>
                <TableCell>{v}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Ek tab — Login History ya Change Password History.
 * Data sirf Load dabane pe aata hai. Naam khaali ho to apna hi account (zip jaisa).
 */
function HistoryPane({ mode }: { mode: 'login' | 'password' }) {
  const [clientName, setClientName] = useState('')
  const [range, setRange] = useState(defaultRange)
  const [loaded, setLoaded] = useState<{ username: string; fromDate: string; toDate: string } | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [ipFor, setIpFor] = useState<string | null>(null)

  const path = mode === 'password' ? `${REPORTS_API}/password-history` : `${REPORTS_API}/login-history`

  const { data, isLoading, isFetching, error } = usePagedApi<HistoryRow>(loaded ? path : null, {
    fromDate: loaded?.fromDate || undefined,
    toDate: loaded?.toDate || undefined,
    username: loaded?.username || undefined,
    page,
    limit
  })

  const rows: Row[] = loaded
    ? (data?.rows ?? []).map(r => ({ id: r.id, username: r.username, date: fmtDateTime(r.loginAt ?? r.changedAt), ip: r.ip }))
    : []

  const filtered = filterRows(rows, search)

  const handleLoad = () => {
    setPage(1)
    setLoaded({ username: clientName.trim(), fromDate: range.from, toDate: range.to })
  }

  const handleReset = () => {
    setClientName('')
    setRange(defaultRange())
    setSearch('')
    setPage(1)
    setLoaded(null)
  }

  const columns: Column<Row>[] = [
    { key: 'username', header: 'Username', cell: r => r.username },
    { key: 'date', header: 'Date', cell: r => r.date },
    { key: 'ip', header: 'IP', cell: r => r.ip },
    {
      key: 'detail',
      header: 'Detail',
      align: 'center',
      cell: r => (
        <Button type='button' size='icon-sm' variant='ghost' onClick={() => setIpFor(r.ip)} aria-label='Ip detail'>
          <EyeIcon />
        </Button>
      )
    }
  ]

  return (
    <div className='flex flex-col gap-4'>
      <IpDetailDialog ip={ipFor} onClose={() => setIpFor(null)} />

      <form
        className='grid gap-3 md:grid-cols-[1fr_1fr_2fr]'
        onSubmit={e => {
          e.preventDefault()
          handleLoad()
        }}
      >
        <ClientSearch value={clientName} onChange={setClientName} />
        <DateRangePicker from={range.from} to={range.to} max={format(new Date(), 'yyyy-MM-dd')} onChange={setRange} className='sm:w-full' />
        <div className='flex flex-wrap gap-2'>
          <Button type='submit'>Load</Button>
          <Button type='button' variant='outline' onClick={handleReset}>
            Reset
          </Button>
          <ExportButtons fileName='userhistory' title='User History' head={EXPORT_COLS} rows={filtered.map(r => [r.username, r.date, r.ip])} />
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={r => r.id}
        loading={Boolean(loaded) && isLoading}
        fetching={isFetching}
        error={error}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search...'
        emptyMessage={emptyText(search)}
        pagination={data?.pagination}
        onPageChange={setPage}
        onLimitChange={l => {
          setLimit(l)
          setPage(1)
        }}
      />
    </div>
  )
}

/** User History — zip `reports/UserHistory.jsx`: do tabs, Login History aur Change Password History. */
const UserHistory = () => (
  <div>
    <PageHeader title='User History' />
    <Card className='shadow-none'>
      <CardContent>
        <Tabs defaultValue='login'>
          <TabsList>
            <TabsTrigger value='login'>Login History</TabsTrigger>
            <TabsTrigger value='cpw'>Change Password History</TabsTrigger>
          </TabsList>
          {/* keepMounted: zip me dono panes DOM me rehte hain, tab badalne pe filter nahi jaata */}
          <TabsContent value='login' keepMounted className='pt-3'>
            <HistoryPane mode='login' />
          </TabsContent>
          <TabsContent value='cpw' keepMounted className='pt-3'>
            <HistoryPane mode='password' />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
)

export default UserHistory
