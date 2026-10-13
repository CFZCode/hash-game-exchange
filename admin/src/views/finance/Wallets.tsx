'use client'

import { useMemo } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Can from '@/components/shared/Can'
import DataTable, { type Column } from '@/components/shared/DataTable'
import Money from '@/components/shared/Money'
import PageHeader from '@/components/shared/PageHeader'
import { Switch } from '@/components/ui/switch'
import { useListState, usePagedApi } from '@/hooks/use-api'
import { CurrencySelect, useCurrencyChoices, useCurrencyParam } from './currencyFilter'
import { AdjustWalletDialog, stop } from './shared'
import type { WalletBalanceRow } from './types'

const LIST = 'admin/user/wallet/balances'

/** Every non-zero balance except the one shown as its own column. */
const others = (b: Record<string, string>, shown: string) =>
  Object.entries(b)
    .filter(([c, v]) => c !== shown && Number(v) !== 0)
    .map(([c, v]) => `${c} ${v}`)

const held = (b: Record<string, string>) => Object.entries(b).filter(([, v]) => Number(v) !== 0).map(([c]) => c)

const columnsFor = (currency: string): Column<WalletBalanceRow>[] => [
  {
    key: 'name',
    header: 'User',
    cell: r => (
      <div className='flex flex-col'>
        <Link href={`/users/${r.uid}`} className='font-medium hover:underline'>
          {r.name}
        </Link>
        <span className='text-muted-foreground font-mono text-xs'>{r.uid}</span>
      </div>
    )
  },
  { key: 'balance', header: currency, align: 'right', cell: r => <Money value={r.balances[currency] ?? '0'} currency={currency} /> },
  {
    key: 'other',
    header: 'Other holdings',
    cell: r => {
      const o = others(r.balances, currency)

      return o.length ? <span className='font-mono text-xs'>{o.join(' · ')}</span> : <span className='text-muted-foreground text-xs'>—</span>
    }
  },
  {
    key: 'actions',
    header: '',
    align: 'right',
    cell: r => (
      <div onClick={stop}>
        <Can permission={['wallet:credit', 'wallet:debit']}>
          <AdjustWalletDialog userId={r.uid} userName={r.name} currencies={Array.from(new Set([currency, ...held(r.balances)]))} />
        </Can>
      </div>
    )
  }
]

const Wallets = () => {
  const { state, set, query } = useListState(['holders'])

  // One currency at a time — the site's default coin until somebody picks another (in the URL).
  // By default only players who hold it; `?holders=all` lists everybody with that column.
  const cur = useCurrencyParam()
  const choices = useCurrencyChoices()
  const holdersOnly = state.holders !== 'all'

  const list = usePagedApi<WalletBalanceRow>(LIST, {
    limit: query.limit,
    page: query.page,
    search: query.search,
    heldCurrency: holdersOnly ? cur.currency : undefined
  })

  const router = useRouter()
  const columns = useMemo(() => columnsFor(cur.currency), [cur.currency])

  return (
    <div>
      <PageHeader title='Wallets' description='Every user the platform lets you see, with their balance in the selected currency. Open a row for the ledger; adjust writes an audited entry.' />
      <DataTable
        columns={columns}
        rows={list.data?.rows}
        rowKey={r => r.uid}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error}
        pagination={list.data?.pagination}
        onPageChange={page => set({ page })}
        onLimitChange={limit => set({ limit })}
        search={String(state.search ?? '')}
        onSearchChange={search => set({ search })}
        searchPlaceholder='Username or id…'
        onRowClick={r => router.push(`/users/${r.uid}`)}
        emptyMessage={holdersOnly ? `Nobody you can see holds ${cur.currency}.` : 'No users.'}
        toolbar={
          <>
            <CurrencySelect filter={cur} currencies={choices.all} />
            <label className='flex items-center gap-2 text-sm'>
              <Switch checked={holdersOnly} onCheckedChange={v => set({ holders: v ? '' : 'all' })} aria-label={`Only players holding ${cur.currency}`} />
              Only {cur.currency} holders
            </label>
          </>
        }
      />
    </div>
  )
}

export default Wallets
