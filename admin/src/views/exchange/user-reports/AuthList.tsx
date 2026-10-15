'use client'

import { useState } from 'react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import { usePagedApi } from '@/hooks/use-api'
import { ExportButtons, REPORTS_API, emptyText, filterRows } from './shared'

type Row = { id: string; username: string; authentication: string }

const EXPORT_COLS = ['Username', 'Authentication']

const columns: Column<Row>[] = [
  { key: 'username', header: 'Username', cell: r => r.username },
  { key: 'authentication', header: 'Authentication', cell: r => r.authentication }
]

/**
 * User Authentication — zip `reports/AuthList.jsx`.
 * Page khulte hi list aati hai (Load button nahi): direct children aur unka 2FA.
 */
const AuthList = () => {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')

  const { data, isLoading, isFetching, error } = usePagedApi<Row>(`${REPORTS_API}/auth-list`, { page, limit })
  const filtered = filterRows(data?.rows ?? [], search)

  return (
    <div>
      <PageHeader
        title='User Authentication'
        actions={<ExportButtons fileName='authlist' title='User Authentication' head={EXPORT_COLS} rows={filtered.map(r => [r.username, r.authentication])} />}
      />
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={r => r.id}
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

export default AuthList
