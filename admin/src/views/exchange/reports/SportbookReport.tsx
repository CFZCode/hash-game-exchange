'use client'

import { useMemo, useState, type FormEvent } from 'react'

import { toast } from 'sonner'

import PageHeader from '@/components/shared/PageHeader'
import { DatePicker } from '@/components/ui/date-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, errorMessage } from '@/lib/api/client'
import { exportExcel, exportPdf } from '../exportList'
import {
  ActionButtons,
  ClientSearch,
  clientBody,
  dayString,
  EntriesBar,
  Pager,
  Pick,
  ReportCard,
  ReportTable,
  usePaged,
  withMinimumDelay,
  type Client,
  type ReportColumn
} from './reportKit'

type ApiRow = { round_id?: string; transaction_type?: string; amount?: string | number; total?: string | number; bet_id?: string; timestamp?: string }
type SportbookRow = { roundId: string; type: string; amount: string; total: string; betId: string; date: string }

/** "15/10/2026" — zip ka formatTimestamp. */
const shortDate = (ts?: string) => {
  if (!ts) return '-'
  const d = new Date(ts)

  if (Number.isNaN(d.getTime())) return ts

  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const toRow = (item: ApiRow): SportbookRow => ({
  roundId: item.round_id || '-',
  type: item.transaction_type || '-',
  amount: item.amount != null ? Number(item.amount).toFixed(2) : '-',
  total: item.total != null ? Number(item.total).toFixed(2) : '-',
  betId: item.bet_id || '-',
  date: shortDate(item.timestamp)
})

// Provider list zip me bhi khaali thi ("Select" hi) — koi sportbook provider jude to yahan aayega.
const VENDORS: [string, string][] = [['', 'Select']]

/**
 * Ek tab — Settled: date + exports + entries/search + 6 column (Total ke saath);
 * Unsettled: patla 5 column wala. Settled me provider zaroori (laal outline).
 */
function ReportPane({ status }: { status: 'settled' | 'unsettled' }) {
  const isSettled = status === 'settled'
  const [client, setClient] = useState<Client | null>(null)
  const [date, setDate] = useState(dayString(new Date()))
  const [vendor, setVendor] = useState('')
  const [vendorInvalid, setVendorInvalid] = useState(false)
  const [limit, setLimit] = useState(25)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<SportbookRow[]>([])
  const [loading, setLoading] = useState(false)

  const handleLoad = async (e: FormEvent) => {
    e.preventDefault()

    // Provider sirf Settled tab par zaroori — Unsettled bina iske load hota hai.
    if (isSettled && !vendor) {
      setVendorInvalid(true)
      toast.error('Choose a provider')

      return
    }

    if (isSettled && !date) {
      toast.error('Choose a date')

      return
    }

    setVendorInvalid(false)
    setLoading(true)

    try {
      const data = await withMinimumDelay(
        api.post<ApiRow[]>('admin/exchange/reports/sportbook-report', { ...clientBody(client), vendor, date: isSettled ? date : '', status })
      )

      setRows(data.map(toRow))
    } catch (err) {
      toast.error(errorMessage(err))
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Reset ke baad select zaroori-aur-khaali dikhta hai (laal), zip jaisa.
  const handleReset = () => {
    setClient(null)
    setVendor('')
    setVendorInvalid(true)
    setSearch('')
    setLoading(true)
    setTimeout(() => {
      setRows([])
      setLoading(false)
    }, 1000)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()

    return rows.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(q)))
  }, [rows, search])

  const { page, setPage, totalPages, pageRows } = usePaged(filtered, limit)

  const exportCols = isSettled ? ['Round Id', 'Type', 'Amount', 'Total', 'Bet Id', 'Date'] : ['Round Id', 'Type', 'Amount', 'Bet Id', 'Date']
  const exportRows = () => filtered.map(r => (isSettled ? [r.roundId, r.type, r.amount, r.total, r.betId, r.date] : [r.roundId, r.type, r.amount, r.betId, r.date]))

  const columns: ReportColumn<SportbookRow>[] = [
    { key: 'round', header: 'Round Id', cell: r => r.roundId },
    { key: 'type', header: 'Type', cell: r => r.type },
    { key: 'amount', header: 'Amount', align: 'right', cell: r => r.amount },
    ...(isSettled ? [{ key: 'total', header: 'Total', align: 'right' as const, cell: (r: SportbookRow) => r.total }] : []),
    { key: 'bet', header: 'Bet Id', cell: r => r.betId },
    { key: 'date', header: 'Date', cell: r => r.date }
  ]

  return (
    <>
      <form onSubmit={handleLoad} className='flex flex-wrap items-center gap-4 border-b p-4'>
        <div className='w-56'>
          <ClientSearch value={client} onChange={setClient} />
        </div>
        {isSettled && <DatePicker value={date} onChange={setDate} max={dayString(new Date())} clearable={false} className='w-48' />}
        <Pick
          value={vendor}
          invalid={vendorInvalid}
          onChange={v => {
            setVendor(v)
            setVendorInvalid(!v)
          }}
          options={VENDORS}
          className='w-48'
        />
        <ActionButtons
          busy={loading}
          onReset={handleReset}
          canExport={filtered.length > 0}
          onExcel={isSettled ? () => exportExcel('sportbookreport', exportCols, exportRows()) : undefined}
          onPdf={isSettled ? () => exportPdf('sportbookreport', 'SportBook Report', exportCols, exportRows()) : undefined}
        />
      </form>

      {isSettled && <EntriesBar limit={limit} onLimit={setLimit} search={search} onSearch={setSearch} />}
      <ReportTable
        columns={columns}
        rows={pageRows}
        rowKey={(_, i) => String(i)}
        emptyMessage={search ? 'There are no records matching your request' : 'There are no records to show'}
      />
      <Pager page={page} totalPages={totalPages} onPage={setPage} />
    </>
  )
}

/**
 * SportBook Report — zip ka `reports/SportbookReport.jsx`: Settled Bets / Unsettled Bets tabs.
 * Zip me iska backend route tha hi nahi aur provider list khaali thi; hamare paas bhi
 * sportbook provider nahi, isliye API hamesha khaali list deta hai.
 */
const SportbookReport = () => (
  <div>
    <PageHeader title='SportBook Report' />

    <ReportCard>
      <Tabs defaultValue='settled' className='gap-0'>
        <div className='border-b px-4 pt-3'>
          <TabsList>
            <TabsTrigger value='settled'>Settled Bets</TabsTrigger>
            <TabsTrigger value='unsettled'>Unsettled Bets</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value='settled' keepMounted>
          <ReportPane status='settled' />
        </TabsContent>
        <TabsContent value='unsettled' keepMounted>
          <ReportPane status='unsettled' />
        </TabsContent>
      </Tabs>
    </ReportCard>
  </div>
)

export default SportbookReport
