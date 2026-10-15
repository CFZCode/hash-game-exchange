'use client'

import { useState, type FormEvent } from 'react'

import { toast } from 'sonner'

import PageHeader from '@/components/shared/PageHeader'
import { DateRangePicker } from '@/components/ui/date-picker'
import { api, errorMessage } from '@/lib/api/client'
import {
  ActionButtons,
  ClientSearch,
  clientBody,
  defaultRange,
  EntriesBar,
  FilterField,
  Pick,
  ReportCard,
  ReportTable,
  withMinimumDelay,
  type Client,
  type ReportColumn
} from './reportKit'

type SportsRow = { event_name: string; game_type: string; opening: number; closing: number; profit_loss: number }
type SportbookRow = { sportbook_name: string; opening: number; closing: number; profit_loss: number }
type TotalPL = { sports: SportsRow[]; sportbook: SportbookRow[] }

// Type filter: 0 All, 2 Sports, 5 Sportbook (zip ke Casino / Third Party Casino yahan nahi).
const TYPE_OPTIONS: [string, string][] = [['0', 'All'], ['2', 'Sports Report'], ['5', 'Sportbook']]

/** Footer total aur export — 2 decimal (zip `fmt`). */
const fixed = (v: unknown) => {
  const n = parseFloat(String(v))

  return Number.isNaN(n) ? '0.00' : n.toFixed(2)
}

/** Body cell — raw number, bina padding (reference: 35.28, -1, 572.3). */
const raw = (v: unknown) => {
  const n = parseFloat(String(v))

  return Number.isNaN(n) ? '0' : String(n)
}

const totalOf = (rows: { profit_loss: number }[]) => rows.reduce((sum, r) => sum + (Number(r.profit_loss) || 0), 0)

/**
 * Total Profit Loss — zip ka `reports/TotalProfitLoss.jsx` (`POST /admin/reports/total-profit-loss`).
 *
 * Sports Report: sport + game type ke hisaab se Opening (kul loss), Closing (kul profit), Profit/Loss.
 * Sportbook Report: sportbook provider abhi nahi, isliye khaali (zip me bhi backend khaali bhejta tha).
 */
const TotalProfitLoss = () => {
  const [client, setClient] = useState<Client | null>(null)
  const [range, setRange] = useState(defaultRange())
  const [typeVal, setTypeVal] = useState('0')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<TotalPL>({ sports: [], sportbook: [] })
  const [loading, setLoading] = useState(false)

  const handleLoad = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      setData(
        await withMinimumDelay(
          api.post<TotalPL>('admin/exchange/reports/total-profit-loss', { ...clientBody(client), fromDate: range.from, toDate: range.to, type: typeVal })
        )
      )
    } catch (err) {
      toast.error(errorMessage(err))
      setData({ sports: [], sportbook: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setClient(null)
    setRange(defaultRange())
    setTypeVal('0')
    setSearch('')
    setLoading(true)
    setTimeout(() => {
      setData({ sports: [], sportbook: [] })
      setLoading(false)
    }, 1000)
  }

  const bySearch = <T extends object>(rows: T[]) =>
    search.trim() ? rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))) : rows

  const sportsRows = bySearch(data.sports)
  const sportbookRows = bySearch(data.sportbook)
  const showSports = typeVal === '0' || typeVal === '2'
  const showSportbook = typeVal === '0' || typeVal === '5'
  const hasAnyData = sportsRows.length + sportbookRows.length > 0
  const emptyMessage = search ? 'There are no records matching your request' : 'There are no records to show'

  const sportsSection = ['Sports Report', ['Event Name', 'Game Type', 'Opening', 'Closing', 'Profit/Loss'], sportsRows.map(r => [r.event_name, r.game_type, fixed(r.opening), fixed(r.closing), fixed(r.profit_loss)])] as const
  const sportbookSection = ['Sportbook Report', ['Sportbook Name', 'Opening', 'Closing', 'Profit/Loss'], sportbookRows.map(r => [r.sportbook_name, fixed(r.opening), fixed(r.closing), fixed(r.profit_loss)])] as const
  const sections = [...(showSports ? [sportsSection] : []), ...(showSportbook ? [sportbookSection] : [])]

  // Excel — har section ka title, header aur rows ek hi table me (zip jaisa).
  const handleExcel = () => {
    const html = sections
      .map(
        ([title, cols, rows]) =>
          `<tr><th colspan="${cols.length}">${title}</th></tr><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>` +
          rows.map(r => `<tr>${r.map(v => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')
      )
      .join('')

    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>${html}</table></body></html>`
    const a = document.createElement('a')

    a.href = URL.createObjectURL(new Blob([doc], { type: 'application/vnd.ms-excel' }))
    a.download = 'totalprofitloss.xls'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // PDF — har section apni table, title upar.
  const handlePdf = async () => {
    const { default: JsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new JsPDF('l', 'pt')
    let y = 45

    doc.setFontSize(14)
    doc.setTextColor(51, 51, 51)
    doc.text('Total Profit Loss', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' })

    for (const [title, cols, rows] of sections) {
      doc.setFontSize(11)
      doc.text(title, 40, y + 12)
      autoTable(doc, {
        head: [[...cols]],
        body: rows.map(r => [...r]),
        startY: y + 20,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'left' },
        bodyStyles: { textColor: [85, 85, 85] }
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20
    }

    doc.save('totalprofitloss.pdf')
  }

  const sportsColumns: ReportColumn<SportsRow>[] = [
    { key: 'event', header: 'Event Name', cell: r => r.event_name },
    { key: 'type', header: 'Game Type', cell: r => r.game_type },
    { key: 'opening', header: 'Opening', align: 'right', cell: r => raw(r.opening) },
    { key: 'closing', header: 'Closing', align: 'right', cell: r => raw(r.closing) },
    { key: 'pl', header: 'Profit/Loss', align: 'right', cell: r => raw(r.profit_loss) }
  ]

  const sportbookColumns: ReportColumn<SportbookRow>[] = [
    { key: 'name', header: 'Sportbook Name', cell: r => r.sportbook_name },
    { key: 'opening', header: 'Opening', align: 'right', cell: r => raw(r.opening) },
    { key: 'closing', header: 'Closing', align: 'right', cell: r => raw(r.closing) },
    { key: 'pl', header: 'Profit/Loss', align: 'right', cell: r => raw(r.profit_loss) }
  ]

  return (
    <div>
      <PageHeader title='Total Profit Loss' />

      <ReportCard>
        <form onSubmit={handleLoad} className='space-y-4 border-b p-4'>
          <div className='grid gap-4 md:grid-cols-3 lg:grid-cols-4'>
            <FilterField label='Search By Client Name'>
              <ClientSearch value={client} onChange={setClient} />
            </FilterField>
            <FilterField label='Select Date Range'>
              <DateRangePicker from={range.from} to={range.to} max={defaultRange().to} clearable={false} onChange={r => setRange({ from: r.from, to: r.to })} />
            </FilterField>
            <FilterField label='Type'>
              <Pick value={typeVal} onChange={setTypeVal} options={TYPE_OPTIONS} />
            </FilterField>
          </div>
          <ActionButtons busy={loading} onReset={handleReset} canExport={hasAnyData} onExcel={handleExcel} onPdf={handlePdf} />
        </form>

        <EntriesBar search={search} onSearch={setSearch} />

        {showSports && (
          <div className='pb-2'>
            <h4 className='px-4 pt-2 font-semibold'>Sports Report</h4>
            <ReportTable
              columns={sportsColumns}
              rows={sportsRows}
              rowKey={r => `${r.event_name}-${r.game_type}`}
              emptyMessage={emptyMessage}
              footer={['', '', '', 'Total Profit/Loss', fixed(totalOf(sportsRows))]}
            />
          </div>
        )}
        {showSportbook && (
          <div className='pb-2'>
            <h4 className='px-4 pt-2 font-semibold'>Sportbook Report</h4>
            <ReportTable
              columns={sportbookColumns}
              rows={sportbookRows}
              rowKey={r => r.sportbook_name}
              emptyMessage={emptyMessage}
              footer={['', '', 'Total Profit/Loss', fixed(totalOf(sportbookRows))]}
            />
          </div>
        )}
      </ReportCard>
    </div>
  )
}

export default TotalProfitLoss
