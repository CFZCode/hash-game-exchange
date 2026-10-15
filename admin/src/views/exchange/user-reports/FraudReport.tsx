'use client'

import { useState } from 'react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import { usePagedApi } from '@/hooks/use-api'
import { ExportButtons, REPORTS_API, emptyText, filterRows } from './shared'

type Row = {
  sno?: number
  username: string
  eventName: string
  marketDate: string
  marketName: string
  amount: string | number
  fraudDate: string
  remark: string
}

const EXPORT_COLS = ['S.No.', 'User Name', 'Event Name', 'Market Date', 'Market Name', 'Amount', 'Fraud Date', 'Remark']

const columns: Column<Row>[] = [
  { key: 'sno', header: 'S.No.', cell: (r, i) => r.sno ?? i + 1 },
  { key: 'username', header: 'User Name', cell: r => r.username },
  { key: 'eventName', header: 'Event Name', cell: r => r.eventName },
  { key: 'marketDate', header: 'Market Date', cell: r => r.marketDate },
  { key: 'marketName', header: 'Market Name', cell: r => r.marketName },
  { key: 'amount', header: 'Amount', align: 'right', cell: r => r.amount },
  { key: 'fraudDate', header: 'Fraud Date', cell: r => r.fraudDate },
  { key: 'remark', header: 'Remark', cell: r => r.remark },
  { key: 'action', header: 'Action', cell: () => null }
]

/**
 * Fraud Report — zip `reports/FraudReport.jsx`. Page khulte hi load hota hai.
 * Zip me iska backend tha hi nahi; hamara endpoint bhi abhi khaali list deta hai.
 */
const FraudReport = () => {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')

  const { data, isLoading, isFetching, error } = usePagedApi<Row>(`${REPORTS_API}/fraud`, { page, limit })
  const filtered = filterRows(data?.rows ?? [], search)

  const exportRows = filtered.map((r, i) => [r.sno ?? i + 1, r.username, r.eventName, r.marketDate, r.marketName, r.amount, r.fraudDate, r.remark])

  return (
    <div>
      <PageHeader title='Fraud Report' actions={<ExportButtons fileName='fraudreport' title='Fraud Report' head={EXPORT_COLS} rows={exportRows} />} />
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(_, i) => i}
        loading={isLoading}
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

export default FraudReport
