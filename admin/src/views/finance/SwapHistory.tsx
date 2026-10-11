'use client'

import Link from 'next/link'

import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import Money from '@/components/shared/Money'
import PageHeader from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { useListState, usePagedApi } from '@/hooks/use-api'

/** `GET admin/user/swap/history` — raw `swap_history` rows (snake_case, decimals as strings). */
type SwapRow = {
  id: string | number
  uid: string | number
  from_currency: string
  to_currency: string
  from_amount: string
  to_amount: string
  fee_percentage: string
  fee_amount: string
  fee_currency: string
  usd_rate_from: string
  usd_rate_to: string
  created_at: string
}

const LIST = 'admin/user/swap/history'

const columns: Column<SwapRow>[] = [
  { key: 'id', header: 'ID', cell: r => <span className='font-mono text-xs'>{r.id}</span> },
  { key: 'at', header: 'When', cell: r => <DateTime value={r.created_at} /> },
  {
    key: 'player',
    header: 'User',
    cell: r => (
      <Link href={`/users/${r.uid}`} className='font-mono text-sm hover:underline' onClick={e => e.stopPropagation()}>
        #{r.uid}
      </Link>
    )
  },
  { key: 'from', header: 'From', align: 'right', cell: r => <Money value={r.from_amount} currency={r.from_currency} /> },
  { key: 'to', header: 'To', align: 'right', cell: r => <Money value={r.to_amount} currency={r.to_currency} /> },
  {
    key: 'fee',
    header: 'Fee',
    align: 'right',
    cell: r => (
      <span className='whitespace-nowrap'>
        <Money value={r.fee_amount} currency={r.fee_currency} />
        <span className='text-muted-foreground ml-1 text-xs tabular-nums'>({(Number(r.fee_percentage) * 100).toFixed(2)}%)</span>
      </span>
    )
  }
]

const SwapHistory = () => {
  const { state, set, query } = useListState(['userId'])

  // The validator is strict: only `userId`, `limit` and `offset` (from `page`) are accepted.
  const list = usePagedApi<SwapRow>(LIST, { limit: query.limit, page: query.page, userId: query.userId })

  return (
    <div>
      <PageHeader title='Swap history' description='Currency swaps users made in the wallet, newest first, with the fee taken.' />
      <DataTable
        columns={columns}
        rows={list.data?.rows}
        rowKey={r => String(r.id)}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error}
        pagination={list.data?.pagination}
        onPageChange={page => set({ page })}
        onLimitChange={limit => set({ limit })}
        toolbar={
          <Input
            placeholder='User id'
            aria-label='User id'
            inputMode='numeric'
            value={String(state.userId ?? '')}
            onChange={e => set({ userId: e.target.value.replace(/\D/g, '') })}
            className='w-28'
          />
        }
      />
    </div>
  )
}

export default SwapHistory
